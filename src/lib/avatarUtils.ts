export async function compressAvatarImageFile(
  file: File,
  maxWidth = 280,
  maxHeight = 360,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ratio = Math.min(1, maxWidth / img.width, maxHeight / img.height);
          const targetW = Math.max(1, Math.round(img.width * ratio));
          const targetH = Math.max(1, Math.round(img.height * ratio));
          canvas.width = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, targetW, targetH);
          ctx.drawImage(img, 0, 0, targetW, targetH);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Không thể đọc tệp ảnh đại diện.'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Lỗi đọc tệp ảnh từ thiết bị.'));
    reader.readAsDataURL(file);
  });
}

const AVATAR_PALETTES = [
  ['#0284c7', '#0369a1'],
  ['#0d9488', '#0f766e'],
  ['#4f46e5', '#4338ca'],
  ['#7c3aed', '#6d28d9'],
  ['#059669', '#047857'],
  ['#2563eb', '#1d4ed8'],
];

export function getDefaultAvatarForEmployee(employeeId: string, fullName: string): string {
  const cleanName = (fullName || employeeId || 'NV').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[words.length - 1][0] || ''}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase();

  const seedStr = `${employeeId}:${cleanName}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  const [c1, c2] = AVATAR_PALETTES[hash % AVATAR_PALETTES.length];
  const safeInitials = initials.replace(/[<>&"']/g, '');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="120" height="120" rx="16" fill="url(#g)"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="700">${safeInitials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

