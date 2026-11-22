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
