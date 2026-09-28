const PRIVACY_OPTIMIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PARENT_PHOTO_EDGE = 2560;

export interface PreparedParentPhoto {
  body: Blob;
  name: string;
  mimeType: string;
  optimized: boolean;
}

export function canPrivacyOptimizePhotoType(mimeType: string): boolean {
  return PRIVACY_OPTIMIZABLE_TYPES.has((mimeType || '').toLowerCase());
}

export function optimizedPhotoName(name: string, mimeType: string): string {
  const base = name.replace(/\.[^.]+$/, '').trim() || 'Foto';
  const extension =
    mimeType === 'image/png' ? 'png' :
    mimeType === 'image/webp' ? 'webp' :
    'jpg';
  return `${base}-optimiert.${extension}`;
}

export async function prepareParentPhoto(
  file: File,
  optimize: boolean,
): Promise<PreparedParentPhoto> {
  if (!optimize) {
    return { body: file, name: file.name, mimeType: file.type, optimized: false };
  }

  if (!canPrivacyOptimizePhotoType(file.type)) {
    throw new Error(
      `${file.name}: Für ${file.type || 'dieses Format'} kann KLASSIO Kamerametadaten im Browser nicht zuverlässig entfernen. Deaktiviere „Datenschutz-Optimierung“, wenn du bewusst die Originaldatei hochladen möchtest.`,
    );
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const largestEdge = Math.max(bitmap.width, bitmap.height);
    const scale = largestEdge > MAX_PARENT_PHOTO_EDGE
      ? MAX_PARENT_PHOTO_EDGE / largestEdge
      : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Bildoptimierung ist in diesem Browser nicht verfügbar.');
    context.drawImage(bitmap, 0, 0, width, height);

    const mimeType = file.type === 'image/png'
      ? 'image/png'
      : file.type === 'image/webp'
        ? 'image/webp'
        : 'image/jpeg';

    const body = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Bild konnte nicht neu kodiert werden.')),
        mimeType,
        mimeType === 'image/png' ? undefined : 0.9,
      );
    });

    return {
      body,
      name: optimizedPhotoName(file.name, mimeType),
      mimeType,
      optimized: true,
    };
  } finally {
    bitmap.close();
  }
}
