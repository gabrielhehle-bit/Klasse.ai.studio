/** Shrink photographs to safe inline raster data before entering the encrypted app state.
 * No external upload and no image metadata is retained. */
export async function prepareProfileImage(file: File, kind: 'avatar' | 'cover'): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 6 * 1024 * 1024 || file.size === 0) {
    throw new Error('Bitte ein JPG-, PNG- oder WebP-Bild mit höchstens 6 MB auswählen.');
  }
  if (typeof createImageBitmap !== 'function') throw new Error('Dieser Browser kann das Bild nicht sicher verarbeiten.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error('Das Bild konnte nicht gelesen werden.'); }
  try {
    const aspect = kind === 'avatar' ? 1 : 3;
    let width = kind === 'avatar' ? 480 : 1050;
    const maxLength = kind === 'avatar' ? 170000 : 210000;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Bildverarbeitung ist hier nicht verfügbar.');
    const imageAspect = bitmap.width / bitmap.height;
    const cropWidth = imageAspect > aspect ? bitmap.height * aspect : bitmap.width;
    const cropHeight = imageAspect > aspect ? bitmap.height : bitmap.width / aspect;
    const x = (bitmap.width - cropWidth) / 2, y = (bitmap.height - cropHeight) / 2;
    for (let attempt = 0; attempt < 5; attempt++) {
      canvas.width = width;
      canvas.height = Math.round(width / aspect);
      ctx.drawImage(bitmap, x, y, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', Math.max(0.45, 0.82 - 0.08 * attempt));
      if (url.startsWith('data:image/webp;base64,') && url.length <= maxLength) return url;
      width = Math.round(width * 0.78);
    }
    throw new Error('Das Bild ist zu groß. Bitte wähle ein anderes Bild.');
  } finally { bitmap.close(); }
}
