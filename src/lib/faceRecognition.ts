import { StaffRecord } from '../types';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  detector: 'native' | 'heuristic' | 'guide';
}

export interface FaceExtractionResult {
  hasFace: boolean;
  box: FaceBoundingBox;
  descriptor: number[];
  photoDataUrl: string;
  qualityScore: number;
  reason?: string;
}

export interface FaceMatchResult {
  staff: StaffRecord;
  similarity: number;
  confidencePercent: number;
  box: FaceBoundingBox;
  capturedPhotoUrl: string;
}

export const isStaffFaceEnrolled = (staff?: StaffRecord | null): boolean => {
  if (!staff) return false;
  return Array.isArray(staff.faceDescriptor) && staff.faceDescriptor.length >= 32;
};

export const isStaffFaceEnabled = (staff?: StaffRecord | null): boolean => {
  if (!staff) return false;
  return staff.faceAccessEnabled !== false && isStaffFaceEnrolled(staff);
};

interface NativeFaceDetectorFace {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface NativeFaceDetectorCtor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): {
    detect: (image: CanvasImageSource) => Promise<NativeFaceDetectorFace[]>;
  };
}

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
  // Works reliably under indoor lighting using YCbCr skin chrominance bounds + RGB rule
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

  // Measure central variance to reject blank walls / covered lenses
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

  // Focus scan within reasonable frame interior to avoid edges/furniture
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

  if (skinPixels >= 75 && maxX > minX + 10 && maxY > minY + 12) {
    // Refine box around weighted centroid so stray background pixels don't stretch box
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
        confidence: Math.min(0.95, 0.45 + skinRatio * 1.4),
        detector: 'heuristic',
      },
      skinRatio,
      variance,
    };
  }

  // Fallback centered portrait box
  const bw = Math.min(canvas.width * 0.52, canvas.height * 0.48);
  const bh = Math.min(canvas.height * 0.62, bw * 1.24);
  return {
    box: {
      x: (canvas.width - bw) / 2,
      y: Math.max(0, (canvas.height - bh) * 0.42),
      width: bw,
      height: bh,
      confidence: variance > 240 ? 0.45 : 0.1,
      detector: 'guide',
    },
    skinRatio,
    variance,
  };
}

export async function detectFaceBox(
  canvas: HTMLCanvasElement
): Promise<{ box: FaceBoundingBox; hasLikelyFace: boolean; variance: number }> {
  const { box: heuristicBox, skinRatio, variance } = detectSkinFaceFallback(canvas);

  try {
    const FaceDetectorCtor = (window as unknown as { FaceDetector?: NativeFaceDetectorCtor })
      .FaceDetector;
    if (FaceDetectorCtor) {
      const detector = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 });
      const detected = await detector.detect(canvas);
      if (Array.isArray(detected) && detected.length > 0) {
        const sorted = [...detected].sort(
          (a, b) =>
            b.boundingBox.width * b.boundingBox.height -
            a.boundingBox.width * a.boundingBox.height
        );
        const primary = sorted[0].boundingBox;
        if (primary.width > 24 && primary.height > 24) {
          return {
            box: {
              x: Math.max(0, primary.x),
              y: Math.max(0, primary.y),
              width: Math.min(canvas.width - Math.max(0, primary.x), primary.width),
              height: Math.min(canvas.height - Math.max(0, primary.y), primary.height),
              confidence: 0.96,
              detector: 'native',
            },
            hasLikelyFace: true,
            variance: Math.max(variance, 300),
          };
        }
      }
    }
  } catch {
    // Native FaceDetector not enabled or unsupported on current browser — fall back silently
  }

  const hasLikelyFace =
    variance >= 140 && (skinRatio >= 0.03 || heuristicBox.detector === 'heuristic');

  return {
    box: heuristicBox,
    hasLikelyFace,
    variance,
  };
}

function computeDescriptorFromRoi(
  sourceCanvas: HTMLCanvasElement,
  box: FaceBoundingBox
): { descriptor: number[]; photoDataUrl: string; qualityScore: number } {
  // Tighter interior crop focuses on eyes, nose, mouth contour while trimming variable hair/background
  const innerX = Math.max(0, box.x + box.width * 0.08);
  const innerY = Math.max(0, box.y + box.height * 0.06);
  const innerW = Math.max(16, box.width * 0.84);
  const innerH = Math.max(16, box.height * 0.88);

  // 1) Compact thumbnail for badge & storage (< 7KB)
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 144;
  thumbCanvas.height = 144;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    // Expand crop slightly for aesthetic portrait thumbnail
    const padX = box.width * 0.18;
    const padY = box.height * 0.2;
    const sx = Math.max(0, box.x - padX);
    const sy = Math.max(0, box.y - padY);
    const sw = Math.min(sourceCanvas.width - sx, box.width + padX * 2);
    const sh = Math.min(sourceCanvas.height - sy, box.height + padY * 2);
    thumbCtx.fillStyle = '#0f172a';
    thumbCtx.fillRect(0, 0, 144, 144);
    thumbCtx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, 144, 144);
  }
  const photoDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.72);

  // 2) Normalized 24x24 grayscale patch for illumination-invariant descriptor
  const patchSize = 24;
  const patchCanvas = document.createElement('canvas');
  patchCanvas.width = patchSize;
  patchCanvas.height = patchSize;
  const patchCtx = patchCanvas.getContext('2d', { willReadFrequently: true });
  if (!patchCtx) {
    return { descriptor: [], photoDataUrl, qualityScore: 0 };
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

  // Part A: 8x8 pooled normalized luminance (64 features)
  const blockSize8 = 3; // 24 / 8 = 3
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

  // Part B: 4x4 block directional gradient energy (32 features: abs(dx), abs(dy) per block)
  const blockSize4 = 6; // 24 / 4 = 6
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

  // Unit L2 normalization + compact 4-decimal rounding
  let normSq = 0;
  for (let i = 0; i < rawFeatures.length; i += 1) {
    normSq += rawFeatures[i] * rawFeatures[i];
  }
  const norm = Math.sqrt(normSq) || 1;
  const descriptor = rawFeatures.map((v) => Math.round((v / norm) * 10000) / 10000);
  const qualityScore = Math.min(100, Math.round(Math.min(std, 65) * 1.2 + box.confidence * 22));

  return { descriptor, photoDataUrl, qualityScore };
}

export async function extractFaceFromMediaSource(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  options?: { requireDetectedFace?: boolean }
): Promise<FaceExtractionResult> {
  const { width, height } = getSourceDimensions(source);
  if (width < 24 || height < 24) {
    return {
      hasFace: false,
      box: { x: 0, y: 0, width: 0, height: 0, confidence: 0, detector: 'guide' },
      descriptor: [],
      photoDataUrl: '',
      qualityScore: 0,
      reason: 'Khung hình camera hoặc ảnh chưa sẵn sàng.',
    };
  }

  const maxDim = 480;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const cw = Math.max(48, Math.round(width * scale));
  const ch = Math.max(48, Math.round(height * scale));

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
      reason: 'Không thể khởi tạo bộ xử lý ảnh.',
    };
  }

  ctx.drawImage(source, 0, 0, cw, ch);
  const { box, hasLikelyFace, variance } = await detectFaceBox(workCanvas);

  if (options?.requireDetectedFace && !hasLikelyFace) {
    return {
      hasFace: false,
      box,
      descriptor: [],
      photoDataUrl: '',
      qualityScore: 0,
      reason:
        variance < 140
          ? 'Camera quá tối hoặc chưa phát hiện khuôn mặt trong khung hình.'
          : 'Đưa khuôn mặt vào chính giữa khung nhận diện.',
    };
  }

  const { descriptor, photoDataUrl, qualityScore } = computeDescriptorFromRoi(workCanvas, box);

  return {
    hasFace: hasLikelyFace,
    box,
    descriptor,
    photoDataUrl,
    qualityScore,
    reason: hasLikelyFace ? undefined : 'Chưa phát hiện rõ khuôn mặt, sử dụng vùng trung tâm.',
  };
}

export async function extractFaceFromImageUrl(imageUrl: string): Promise<FaceExtractionResult> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const res = await extractFaceFromMediaSource(img, { requireDetectedFace: false });
        resolve(res);
      } catch {
        resolve({
          hasFace: false,
          box: { x: 0, y: 0, width: 0, height: 0, confidence: 0, detector: 'guide' },
          descriptor: [],
          photoDataUrl: '',
          qualityScore: 0,
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

export function matchFaceDescriptorAgainstStaff(
  liveDescriptor: number[],
  box: FaceBoundingBox,
  capturedPhotoUrl: string,
  allStaff: StaffRecord[],
  minSimilarity = 0.8
): FaceMatchResult | null {
  if (!Array.isArray(liveDescriptor) || liveDescriptor.length < 32) return null;

  const enrolledStaff = allStaff.filter((s) => isStaffFaceEnabled(s));
  if (enrolledStaff.length === 0) return null;

  let bestStaff: StaffRecord | null = null;
  let bestScore = -1;
  let secondBestScore = -1;

  enrolledStaff.forEach((staff) => {
    const score = cosineSimilarity(liveDescriptor, staff.faceDescriptor || []);
    if (score > bestScore) {
      secondBestScore = bestScore;
      bestScore = score;
      bestStaff = staff;
    } else if (score > secondBestScore) {
      secondBestScore = score;
    }
  });

  if (!bestStaff || bestScore < minSimilarity) {
    return null;
  }

  // When multiple staff have face profiles, enforce a slight discrimination margin unless confidence is very high
  if (enrolledStaff.length > 1 && bestScore < 0.9 && bestScore - secondBestScore < 0.015) {
    return null;
  }

  const confidencePercent = Math.min(99, Math.max(60, Math.round(bestScore * 100)));
  return {
    staff: bestStaff,
    similarity: bestScore,
    confidencePercent,
    box,
    capturedPhotoUrl,
  };
}
