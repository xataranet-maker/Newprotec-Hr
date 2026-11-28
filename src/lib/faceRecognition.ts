import * as faceapi from '@vladmandic/face-api';
import { FacePoseAngle, FacePoseSample, StaffRecord } from '../types';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  detector: 'native' | 'heuristic' | 'guide';
}

export interface HeadPoseInfo {
  angle: FacePoseAngle;
  yaw: number; // degrees (-50..+50, negative = screen left, positive = screen right)
  pitch: number; // degrees (-40..+40, negative = looking up, positive = looking down)
  roll: number;
  labelVi: string;
  isWellFramed: boolean;
  meshPoints: { x: number; y: number }[];
}

export interface FaceExtractionResult {
  hasFace: boolean;
  box: FaceBoundingBox;
  descriptor: number[];
  legacyDescriptor?: number[];
  photoDataUrl: string;
  qualityScore: number;
  pose?: HeadPoseInfo;
  frameW?: number;
  frameH?: number;
  engine: 'neural-3d' | 'fallback';
  reason?: string;
}

export interface FaceMatchResult {
  staff: StaffRecord;
  similarity: number;
  confidencePercent: number;
  matchedAngle?: FacePoseAngle;
  box: FaceBoundingBox;
  capturedPhotoUrl: string;
}

export const FACE_POSE_ORDER: FacePoseAngle[] = ['FRONT', 'LEFT', 'RIGHT', 'UP', 'DOWN'];

export const FACE_POSE_META: Record<
  FacePoseAngle,
  { label: string; shortLabel: string; instruction: string; arrow: string }
> = {
  FRONT: {
    label: 'Nhìn thẳng',
    shortLabel: 'Thẳng',
    instruction: 'Giữ đầu thẳng và nhìn trực tiếp vào camera',
    arrow: '●',
  },
  LEFT: {
    label: 'Quay Trái',
    shortLabel: 'Trái',
    instruction: 'Từ từ xoay nhẹ khuôn mặt sang TRÁI',
    arrow: '←',
  },
  RIGHT: {
    label: 'Quay Phải',
    shortLabel: 'Phải',
    instruction: 'Từ từ xoay nhẹ khuôn mặt sang PHẢI',
    arrow: '→',
  },
  UP: {
    label: 'Ngẩng Lên',
    shortLabel: 'Lên',
    instruction: 'Ngẩng nhẹ mặt lên phía TRÊN',
    arrow: '↑',
  },
  DOWN: {
    label: 'Cúi Xuống',
    shortLabel: 'Xuống',
    instruction: 'Cúi nhẹ cằm xuống phía DƯỚI',
    arrow: '↓',
  },
};

const MODEL_URI = '/models';
let modelLoadPromise: Promise<boolean> | null = null;
let modelsReady = false;

export const isFaceModelsLoaded = (): boolean => modelsReady;

export async function ensureFaceModelsLoaded(): Promise<boolean> {
  if (modelsReady) return true;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = (async () => {
    try {
      const tfRef = (faceapi as unknown as { tf?: { setBackend?: (b: string) => Promise<boolean>; ready?: () => Promise<void> } }).tf;
      if (tfRef?.setBackend && tfRef?.ready) {
        try {
          await tfRef.setBackend('webgl');
          await tfRef.ready();
        } catch {
          try {
            await tfRef.setBackend('cpu');
            await tfRef.ready();
          } catch {
            // default backend continues
          }
        }
      }

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URI),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
      ]);
      modelsReady = true;
      return true;
    } catch (err) {
      console.warn('3D Face AI model load fallback:', err);
      modelsReady = false;
      modelLoadPromise = null;
      return false;
    }
  })();

  return modelLoadPromise;
}

export const getStaffPoseTemplates = (staff?: StaffRecord | null): FacePoseSample[] => {
  if (!staff) return [];
  if (Array.isArray(staff.facePoseTemplates) && staff.facePoseTemplates.length > 0) {
    return staff.facePoseTemplates.filter(
      (t) => t && Array.isArray(t.descriptor) && t.descriptor.length >= 32
    );
  }
  if (Array.isArray(staff.faceDescriptor) && staff.faceDescriptor.length >= 32) {
    return [
      {
        angle: 'FRONT',
        descriptor: staff.faceDescriptor,
        qualityScore: 90,
      },
    ];
  }
  return [];
};

export const getStaffFacePoseCount = (staff?: StaffRecord | null): number =>
  getStaffPoseTemplates(staff).length;

export const isStaffFaceEnrolled = (staff?: StaffRecord | null): boolean =>
  getStaffPoseTemplates(staff).length > 0;

export const isStaffFaceEnabled = (staff?: StaffRecord | null): boolean => {
  if (!staff) return false;
  return staff.faceAccessEnabled !== false && isStaffFaceEnrolled(staff);
};

function getSourceDimensions(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return {
      width: source.videoWidth || source.clientWidth || 0,
      height: source.videoHeight || source.clientHeight || 0,
    };
  }
  if (source instanceof HTMLImageElement) {
    return {
      width: source.naturalWidth || source.width || 0,
      height: source.naturalHeight || source.height || 0,
    };
  }
  return { width: source.width || 0, height: source.height || 0 };
}

function isLikelySkinRgb(r: number, g: number, b: number): boolean {
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const ycbcrMatch = y > 45 && cb >= 74 && cb <= 132 && cr >= 131 && cr <= 176;
  const rgbMatch =
    r > 70 &&
    g > 35 &&
    b > 20 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 12 &&
    Math.abs(r - g) > 10 &&
    r > g &&
    r > b;
  return ycbcrMatch || rgbMatch;
}

function detectSkinFaceFallback(
  canvas: HTMLCanvasElement
): { box: FaceBoundingBox; skinRatio: number; variance: number } {
  const w = 96;
  const h = 96;
  const probe = document.createElement('canvas');
  probe.width = w;
  probe.height = h;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      box: {
        x: canvas.width * 0.28,
        y: canvas.height * 0.16,
        width: canvas.width * 0.44,
        height: canvas.height * 0.58,
        confidence: 0,
        detector: 'guide',
      },
      skinRatio: 0,
      variance: 0,
    };
  }

  ctx.drawImage(canvas, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let sumL = 0;
  let sumL2 = 0;
  let centerCount = 0;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let skinPixels = 0;
  let weightedX = 0;
  let weightedY = 0;

  const xStart = Math.floor(w * 0.12);
  const xEnd = Math.floor(w * 0.88);
  const yStart = Math.floor(h * 0.06);
  const yEnd = Math.floor(h * 0.85);

  for (let y = yStart; y < yEnd; y += 1) {
    for (let x = xStart; x < xEnd; x += 1) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      if (x >= w * 0.25 && x <= w * 0.75 && y >= h * 0.15 && y <= h * 0.75) {
        sumL += lum;
        sumL2 += lum * lum;
        centerCount += 1;
      }

      if (isLikelySkinRgb(r, g, b)) {
        skinPixels += 1;
        weightedX += x;
        weightedY += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  const meanL = centerCount > 0 ? sumL / centerCount : 0;
  const variance = centerCount > 0 ? Math.max(0, sumL2 / centerCount - meanL * meanL) : 0;
  const totalScanned = (xEnd - xStart) * (yEnd - yStart);
  const skinRatio = totalScanned > 0 ? skinPixels / totalScanned : 0;

  if (skinPixels >= 85 && maxX > minX + 10 && maxY > minY + 12) {
    const cx = weightedX / skinPixels;
    const cy = weightedY / skinPixels;
    const rawW = maxX - minX;
    const rawH = maxY - minY;
    const clampedW = Math.min(Math.max(rawW * 0.85, w * 0.24), w * 0.62);
    const clampedH = Math.min(Math.max(rawH * 0.9, clampedW * 1.15), h * 0.72);

    const scaleX = canvas.width / w;
    const scaleY = canvas.height / h;

    const bx = Math.max(0, (cx - clampedW / 2) * scaleX);
    const by = Math.max(0, (cy - clampedH * 0.52) * scaleY);
    const bw = Math.min(canvas.width - bx, clampedW * scaleX);
    const bh = Math.min(canvas.height - by, clampedH * scaleY);

    return {
      box: {
        x: bx,
        y: by,
        width: bw,
        height: bh,
        confidence: Math.min(0.92, 0.45 + skinRatio * 1.35),
        detector: 'heuristic',
      },
      skinRatio,
      variance,
    };
  }

  const bw = Math.min(canvas.width * 0.52, canvas.height * 0.48);
  const bh = Math.min(canvas.height * 0.62, bw * 1.24);
  return {
    box: {
      x: (canvas.width - bw) / 2,
      y: Math.max(0, (canvas.height - bh) * 0.42),
      width: bw,
      height: bh,
      confidence: variance > 240 ? 0.42 : 0.1,
      detector: 'guide',
    },
    skinRatio,
    variance,
  };
}

function buildThumbnailFromBox(sourceCanvas: HTMLCanvasElement, box: FaceBoundingBox): string {
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 144;
  thumbCanvas.height = 144;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    const padX = box.width * 0.2;
    const padY = box.height * 0.22;
    const sx = Math.max(0, box.x - padX);
    const sy = Math.max(0, box.y - padY);
    const sw = Math.min(sourceCanvas.width - sx, box.width + padX * 2);
    const sh = Math.min(sourceCanvas.height - sy, box.height + padY * 2);
    thumbCtx.fillStyle = '#0f172a';
    thumbCtx.fillRect(0, 0, 144, 144);
    thumbCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, 144, 144);
  }
  return thumbCanvas.toDataURL('image/jpeg', 0.76);
}

function computeLegacyDescriptorFromRoi(
  sourceCanvas: HTMLCanvasElement,
  box: FaceBoundingBox
): { descriptor: number[]; qualityScore: number } {
  const innerX = Math.max(0, box.x + box.width * 0.08);
  const innerY = Math.max(0, box.y + box.height * 0.06);
  const innerW = Math.max(16, box.width * 0.84);
  const innerH = Math.max(16, box.height * 0.88);

  const patchSize = 24;
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = patchSize;
  patchCanvas.height = patchSize;
  const patchCtx = patchCanvas.getContext('2d', { willReadFrequently: true });
  if (!patchCtx) {
    return { descriptor: [], qualityScore: 0 };
  }

  patchCtx.drawImage(sourceCanvas, innerX, innerY, innerW, innerH, 0, 0, patchSize, patchSize);
  const pixels = patchCtx.getImageData(0, 0, patchSize, patchSize).data;

  const gray = new Float32Array(patchSize * patchSize);
  let mean = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    const lum = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
    gray[i] = lum;
    mean += lum;
  }
  mean /= gray.length;

  let sqSum = 0;
  for (let i = 0; i < gray.length; i += 1) {
    const diff = gray[i] - mean;
    sqSum += diff * diff;
  }
  const std = Math.sqrt(sqSum / gray.length) || 1;

  for (let i = 0; i < gray.length; i += 1) {
    gray[i] = (gray[i] - mean) / std;
  }

  const rawFeatures: number[] = [];
  const blockSize8 = 3;
  for (let by = 0; by < 8; by += 1) {
    for (let bx = 0; bx < 8; bx += 1) {
      let acc = 0;
      for (let dy = 0; dy < blockSize8; dy += 1) {
        for (let dx = 0; dx < blockSize8; dx += 1) {
          acc += gray[(by * blockSize8 + dy) * patchSize + (bx * blockSize8 + dx)];
        }
      }
      rawFeatures.push(acc / (blockSize8 * blockSize8));
    }
  }

  const blockSize4 = 6;
  for (let by = 0; by < 4; by += 1) {
    for (let bx = 0; bx < 4; bx += 1) {
      let gxSum = 0;
      let gySum = 0;
      let count = 0;
      for (let dy = 0; dy < blockSize4; dy += 1) {
        const y = by * blockSize4 + dy;
        for (let dx = 0; dx < blockSize4; dx += 1) {
          const x = bx * blockSize4 + dx;
          const xPrev = Math.max(0, x - 1);
          const xNext = Math.min(patchSize - 1, x + 1);
          const yPrev = Math.max(0, y - 1);
          const yNext = Math.min(patchSize - 1, y + 1);
          const gx = gray[y * patchSize + xNext] - gray[y * patchSize + xPrev];
          const gy = gray[yNext * patchSize + x] - gray[yPrev * patchSize + x];
          gxSum += Math.abs(gx);
          gySum += Math.abs(gy);
          count += 1;
        }
      }
      rawFeatures.push((gxSum / count) * 1.15);
      rawFeatures.push((gySum / count) * 1.15);
    }
  }

  let normSq = 0;
  for (let i = 0; i < rawFeatures.length; i += 1) {
    normSq += rawFeatures[i] * rawFeatures[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  const descriptor = rawFeatures.map((v) => Math.round((v / norm) * 10000) / 10000);
  const qualityScore = Math.min(95, Math.round(Math.min(std, 60) * 1.15 + box.confidence * 22));

  return { descriptor, qualityScore };
}

function avgPts(pts: { x: number; y: number }[]): { x: number; y: number } {
  if (pts.length === 0) return { x: 0, y: 0 };
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

const CONSTELLATION_INDICES = [
  1, 4, 8, 12, 15, // jaw contour
  19, 24, // brow arches
  27, 29, 30, 33, // nose bridge & tip
  36, 39, 42, 45, // eye corners
  48, 51, 54, 57, // mouth ring
];

function estimateHeadPoseFromLandmarks(
  positions: { x: number; y: number }[],
  box: FaceBoundingBox,
  frameW: number,
  frameH: number,
  mirrored: boolean
): HeadPoseInfo {
  const leftEye = avgPts(positions.slice(36, 42));
  const rightEye = avgPts(positions.slice(42, 48));
  const eyeMid = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };

  const dxEye = rightEye.x - leftEye.x;
  const dyEye = rightEye.y - leftEye.y;
  const eyeLen = Math.hypot(dxEye, dyEye) || 1;
  const ux = dxEye / eyeLen;
  const uy = dyEye / eyeLen;
  const vx = -uy;
  const vy = ux;
  const roll = Math.round((Math.atan2(dyEye, dxEye) * 180) / Math.PI);

  const jawLeft = avgPts([positions[1], positions[2]]);
  const jawRight = avgPts([positions[14], positions[15]]);
  const noseTip = positions[30] || positions[29];
  const chin = positions[8];

  const dLeft = (noseTip.x - jawLeft.x) * ux + (noseTip.y - jawLeft.y) * uy;
  const dRight = (jawRight.x - noseTip.x) * ux + (jawRight.y - noseTip.y) * uy;
  const rawYawRatio = (dLeft - dRight) / Math.max(8, dLeft + dRight);
  const clampedRawYaw = Math.max(-0.85, Math.min(0.85, rawYawRatio));
  const screenYawRatio = mirrored ? -clampedRawYaw : clampedRawYaw;
  const yaw = Math.round(screenYawRatio * 68);

  const eyeToChin = Math.max(12, (chin.x - eyeMid.x) * vx + (chin.y - eyeMid.y) * vy);
  const eyeToNose = (noseTip.x - eyeMid.x) * vx + (noseTip.y - eyeMid.y) * vy;
  const noseVerticalRatio = eyeToNose / eyeToChin;
  // Neutral frontal face sits around ~0.385-0.415 of eye-to-chin vertical span
  const pitch = Math.round((noseVerticalRatio - 0.395) * 185);

  let angle: FacePoseAngle = 'FRONT';
  if (yaw <= -11) {
    angle = 'LEFT';
  } else if (yaw >= 11) {
    angle = 'RIGHT';
  } else if (pitch <= -10) {
    angle = 'UP';
  } else if (pitch >= 10) {
    angle = 'DOWN';
  }

  const cx = (box.x + box.width / 2) / Math.max(1, frameW);
  const cy = (box.y + box.height / 2) / Math.max(1, frameH);
  const sizeRatio = Math.min(box.width / Math.max(1, frameW), box.height / Math.max(1, frameH));
  const isWellFramed = cx >= 0.16 && cx <= 0.84 && cy >= 0.14 && cy <= 0.86 && sizeRatio >= 0.16;

  const meshPoints = CONSTELLATION_INDICES.map((idx) => {
    const pt = positions[idx];
    if (!pt) return null;
    const nx = pt.x / Math.max(1, frameW);
    const ny = pt.y / Math.max(1, frameH);
    return {
      x: mirrored ? 1 - nx : nx,
      y: ny,
    };
  }).filter((p): p is { x: number; y: number } => Boolean(p));

  return {
    angle,
    yaw,
    pitch,
    roll,
    labelVi: FACE_POSE_META[angle].label,
    isWellFramed,
    meshPoints,
  };
}

export async function extractFaceFromMediaSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: {
    requireDetectedFace?: boolean;
    mirrored?: boolean;
    highAccuracy?: boolean;
    computeLegacyFallback?: boolean;
  }
): Promise<FaceExtractionResult> {
  const { width, height } = getSourceDimensions(source);
  if (width < 24 || height < 24) {
    return {
      hasFace: false,
      box: { x: 0, y: 0, width: 0, height: 0, confidence: 0, detector: 'guide' },
      descriptor: [],
      photoDataUrl: '',
      qualityScore: 0,
      engine: 'fallback',
      reason: 'Khung hình camera hoặc ảnh chưa sẵn sàng.',
    };
  }

  const maxDim = options?.highAccuracy ? 544 : 448;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const cw = Math.max(64, Math.round(width * scale));
  const ch = Math.max(64, Math.round(height * scale));

  const workCanvas = document.createElement('canvas');
  workCanvas.width = cw;
  workCanvas.height = ch;
  const ctx = workCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      hasFace: false,
      box: { x: 0, y: 0, width: cw, height: ch, confidence: 0, detector: 'guide' },
      descriptor: [],
      photoDataUrl: '',
      qualityScore: 0,
      engine: 'fallback',
      reason: 'Không thể khởi tạo bộ xử lý ảnh.',
    };
  }

  ctx.drawImage(source, 0, 0, cw, ch);
  const aiReady = await ensureFaceModelsLoaded();

  if (aiReady) {
    try {
      let det = await faceapi
        .detectSingleFace(
          workCanvas,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: options?.highAccuracy ? 320 : 224,
            scoreThreshold: options?.highAccuracy ? 0.34 : 0.42,
          })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (!det && options?.highAccuracy) {
        det = await faceapi
          .detectSingleFace(
            workCanvas,
            new faceapi.TinyFaceDetectorOptions({
              inputSize: 416,
              scoreThreshold: 0.22,
            })
          )
          .withFaceLandmarks(true)
          .withFaceDescriptor();
      }

      if (det) {
        const rawBox = det.detection.box;
        const bx = Math.max(0, rawBox.x);
        const by = Math.max(0, rawBox.y);
        const box: FaceBoundingBox = {
          x: bx,
          y: by,
          width: Math.min(cw - bx, Math.max(24, rawBox.width)),
          height: Math.min(ch - by, Math.max(24, rawBox.height)),
          confidence: Math.min(0.99, Math.max(0.5, det.detection.score)),
          detector: 'native',
        };

        const descriptor = Array.from(det.descriptor).map((v) => Math.round(v * 10000) / 10000);
        const photoDataUrl = buildThumbnailFromBox(workCanvas, box);
        const pose = estimateHeadPoseFromLandmarks(
          det.landmarks.positions.map((p) => ({ x: p.x, y: p.y })),
          box,
          cw,
          ch,
          Boolean(options?.mirrored)
        );
        const sizeFactor = Math.min(1, (box.width / cw) * 2.4);
        const qualityScore = Math.min(
          99,
          Math.max(
            55,
            Math.round(det.detection.score * 74 + sizeFactor * 16 + (pose.isWellFramed ? 9 : 0))
          )
        );

        let legacyDescriptor: number[] | undefined;
        if (options?.computeLegacyFallback) {
          legacyDescriptor = computeLegacyDescriptorFromRoi(workCanvas, box).descriptor;
        }

        return {
          hasFace: true,
          box,
          descriptor,
          legacyDescriptor,
          photoDataUrl,
          qualityScore,
          pose,
          frameW: cw,
          frameH: ch,
          engine: 'neural-3d',
        };
      }

      if (options?.requireDetectedFace) {
        return {
          hasFace: false,
          box: {
            x: cw * 0.25,
            y: ch * 0.16,
            width: cw * 0.5,
            height: ch * 0.62,
            confidence: 0,
            detector: 'guide',
          },
          descriptor: [],
          photoDataUrl: '',
          qualityScore: 0,
          frameW: cw,
          frameH: ch,
          engine: 'neural-3d',
          reason: 'Chưa phát hiện rõ khuôn mặt. Hãy đưa khuôn mặt vào chính giữa vùng sáng.',
        };
      }
    } catch (err) {
      console.warn('Face neural extraction skipped, using fallback:', err);
    }
  }

  // Fallback detector for environments where models are unavailable or photo lacks clear detection
  const { box, skinRatio, variance } = detectSkinFaceFallback(workCanvas);
  const hasLikelyFace = box.detector === 'heuristic' ? skinRatio > 0.04 : variance > 240;

  if (options?.requireDetectedFace && !hasLikelyFace) {
    return {
      hasFace: false,
      box,
      descriptor: [],
      photoDataUrl: '',
      qualityScore: 0,
      frameW: cw,
      frameH: ch,
      engine: 'fallback',
      reason:
        variance < 140
          ? 'Camera quá tối hoặc chưa phát hiện khuôn mặt trong khung hình.'
          : 'Đưa khuôn mặt vào chính giữa khung nhận diện.',
    };
  }

  const photoDataUrl = buildThumbnailFromBox(workCanvas, box);
  const { descriptor, qualityScore } = computeLegacyDescriptorFromRoi(workCanvas, box);

  return {
    hasFace: true,
    box,
    descriptor,
    legacyDescriptor: descriptor,
    photoDataUrl,
    qualityScore,
    frameW: cw,
    frameH: ch,
    engine: 'fallback',
    reason: hasLikelyFace ? undefined : 'Chưa phát hiện rõ khuôn mặt, sử dụng vùng trung tâm.',
  };
}

export async function extractFaceFromImageUrl(imageUrl: string): Promise<FaceExtractionResult> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const res = await extractFaceFromMediaSource(img, {
          requireDetectedFace: false,
          highAccuracy: true,
        });
        resolve(res);
      } catch {
        resolve({
          hasFace: false,
          box: { x: 0, y: 0, width: 0, height: 0, confidence: 0, detector: 'guide' },
          descriptor: [],
          photoDataUrl: '',
          qualityScore: 0,
          engine: 'fallback',
          reason: 'Không thể phân tích khuôn mặt từ ảnh đã chọn.',
        });
      }
    };
    img.onerror = () => {
      resolve({
        hasFace: false,
        box: { x: 0, y: 0, width: 0, height: 0, confidence: 0, detector: 'guide' },
        descriptor: [],
        photoDataUrl: '',
        qualityScore: 0,
        engine: 'fallback',
        reason: 'Không thể tải ảnh để cài đặt khuôn mặt.',
      });
    };
    img.src = imageUrl;
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 16) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i += 1) {
    const va = a[i];
    const vb = b[i];
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return 0;
  return dot / denom;
}

export function euclideanDistance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len < 16) return 999;
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export interface MatchFaceOptions {
  legacyDescriptor?: number[];
  maxEuclideanDistance?: number;
  minSimilarity?: number;
}

export function matchFaceDescriptorAgainstStaff(
  liveDescriptor: number[],
  box: FaceBoundingBox,
  capturedPhotoUrl: string,
  allStaff: StaffRecord[],
  minSimilarityOrOptions: number | MatchFaceOptions = 0.52
): FaceMatchResult | null {
  const opts: MatchFaceOptions =
    typeof minSimilarityOrOptions === 'number'
      ? { minSimilarity: minSimilarityOrOptions }
      : minSimilarityOrOptions;

  const enrolledStaff = allStaff.filter((s) => isStaffFaceEnabled(s));
  if (enrolledStaff.length === 0) return null;

  // 1) Primary 128D Neural Multi-Angle Matching (3D pose templates)
  if (Array.isArray(liveDescriptor) && liveDescriptor.length === 128) {
    const maxDist = opts.maxEuclideanDistance ?? 0.52;
    let bestStaff: StaffRecord | null = null;
    let bestAngle: FacePoseAngle = 'FRONT';
    let bestDist = 999;
    let secondBestDist = 999;
    let neuralStaffCount = 0;

    enrolledStaff.forEach((staff) => {
      const templates = getStaffPoseTemplates(staff).filter((t) => t.descriptor.length === 128);
      if (templates.length === 0) return;
      neuralStaffCount += 1;

      let staffBestDist = 999;
      let staffBestAngle: FacePoseAngle = 'FRONT';
      templates.forEach((tpl) => {
        const dist = euclideanDistance(liveDescriptor, tpl.descriptor);
        if (dist < staffBestDist) {
          staffBestDist = dist;
          staffBestAngle = tpl.angle;
        }
      });

      if (staffBestDist < bestDist) {
        secondBestDist = bestDist;
        bestDist = staffBestDist;
        bestStaff = staff;
        bestAngle = staffBestAngle;
      } else if (staffBestDist < secondBestDist) {
        secondBestDist = staffBestDist;
      }
    });

    if (bestStaff && bestDist <= maxDist) {
      // Ensure unambiguous match when multiple neural staff profiles exist
      if (neuralStaffCount >= 2 && bestDist > 0.43 && secondBestDist - bestDist < 0.025) {
        return null;
      }
      const similarity = Math.max(0, Math.min(1, 1 - bestDist * 0.72));
      const confidencePercent = Math.min(
        99,
        Math.max(72, Math.round((1 - Math.max(0, bestDist - 0.18) / 0.48) * 100))
      );
      return {
        staff: bestStaff,
        similarity,
        confidencePercent,
        matchedAngle: bestAngle,
        box,
        capturedPhotoUrl,
      };
    }
  }

  // 2) Legacy 96D Fallback Matching (preserves older single-photo enrollments)
  const fallbackLive =
    liveDescriptor.length === 96
      ? liveDescriptor
      : opts.legacyDescriptor && opts.legacyDescriptor.length === 96
      ? opts.legacyDescriptor
      : null;

  if (!fallbackLive) return null;

  const minSim = Math.max(opts.minSimilarity ?? 0.68, 0.68);
  let bestLegacyStaff: StaffRecord | null = null;
  let bestScore = -1;

  enrolledStaff.forEach((staff) => {
    const templates = getStaffPoseTemplates(staff).filter((t) => t.descriptor.length === 96);
    templates.forEach((tpl) => {
      const score = cosineSimilarity(fallbackLive, tpl.descriptor);
      if (score > bestScore) {
        bestScore = score;
        bestLegacyStaff = staff;
      }
    });
  });

  if (!bestLegacyStaff || bestScore < minSim) {
    return null;
  }

  const confidencePercent = Math.min(96, Math.max(68, Math.round(bestScore * 100)));
  return {
    staff: bestLegacyStaff,
    similarity: bestScore,
    confidencePercent,
    matchedAngle: 'FRONT',
    box,
    capturedPhotoUrl,
  };
}
