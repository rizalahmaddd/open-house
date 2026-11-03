// Client-side WebP Image Compression before uploading to Cloudflare R2

export async function compressImageToWebP(
  file: File,
  maxWidth = 1200,
  quality = 0.82
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, '');
          const compressedFile = new File([blob], `${baseName}.webp`, {
            type: 'image/webp',
          });
          resolve(compressedFile);
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

export async function uploadFileToR2(
  file: File,
  folder: 'ktp' | 'qris' | 'room' | 'proof' | 'receipt' | 'ticket',
  token: string | null
): Promise<{ key: string; url: string }> {
  const compressed = await compressImageToWebP(file);
  const formData = new FormData();
  formData.append('file', compressed);
  formData.append('folder', folder);

  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch('/api/storage/upload', {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.error || 'Gagal mengunggah gambar. Silakan coba lagi.');
  }
  return { key: data.key, url: data.url };
}
