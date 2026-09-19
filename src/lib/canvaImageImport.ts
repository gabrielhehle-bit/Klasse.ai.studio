import type { CockpitWidgetConfig, MaterialItem } from '../types';
import { calculateMaterialStorageSize, MATERIAL_LIBRARY_MAX_MB } from './materialLibraryUtils';

/** A Canva export is fetched through our authenticated server. Never persist its expiring URL. */
export async function importCanvaImage(designId: string): Promise<string> {
  const start = await fetch('/api/canva/exports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_id: designId, format: 'png' }),
  });
  const created = await start.json().catch(() => ({}));
  if (!start.ok) throw new Error(created.error || 'Canva konnte das Bild nicht exportieren.');
  const jobId = created?.job?.id || created?.id;
  if (typeof jobId !== 'string') throw new Error('Canva hat keine Export-ID zurückgegeben.');

  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await fetch('/api/canva/exports/' + encodeURIComponent(jobId));
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Canva-Export fehlgeschlagen.');
    const job = result?.job || result;
    if (job.status === 'failed') throw new Error(job.error?.message || 'Canva-Export fehlgeschlagen.');
    if (job.status !== 'success') continue;

    // Only the first page is imported; multi-page designs can still be downloaded as PDF.
    const imageResponse = await fetch('/api/canva/exports/' + encodeURIComponent(jobId) + '/image');
    if (!imageResponse.ok) {
      const failure = await imageResponse.json().catch(() => ({}));
      throw new Error(failure.error || 'Canva-Bild konnte nicht importiert werden.');
    }
    const blob = await imageResponse.blob();
    if (blob.type !== 'image/png') throw new Error('Canva hat kein PNG-Bild geliefert.');
    return compressCanvaImage(blob);
  }
  throw new Error('Der Bildexport dauert länger als erwartet. Bitte später erneut versuchen.');
}

/** Keep the encrypted local backup/sync manageable even for large Canva posters. */
async function compressCanvaImage(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Dein Browser kann das Canva-Bild nicht verarbeiten.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    let result = canvas.toDataURL('image/webp', 0.78);
    if (!result.startsWith('data:image/webp')) {
      result = canvas.toDataURL('image/jpeg', 0.75);
    }
    if (result.length > 2 * 1024 * 1024) {
      throw new Error('Das Bild ist für die KLASSIO-Speicherung zu groß. Bitte eine kleinere Canva-Vorlage wählen.');
    }
    return result;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createCanvaMaterial(title: string, image: string): MaterialItem {
  const safeTitle = title.trim().slice(0, 120) || 'Canva-Bild';
  const extension = image.startsWith('data:image/webp') ? 'webp' : 'jpg';
  return {
    id: 'canva-' + crypto.randomUUID(),
    titel: safeTitle,
    beschreibung: 'Aus Canva importiert (erste Designseite).',
    typ: 'datei',
    dateiName: safeTitle + '.' + extension,
    dateiTyp: extension === 'webp' ? 'image/webp' : 'image/jpeg',
    dateiInhalt: image,
    faecher: [],
    schulstufen: [],
    tags: ['Canva'],
    erstelltAm: new Date().toISOString(),
    favorit: false,
    kiGeneriert: false,
    quelleModul: 'canva',
  };
}

export function canSaveCanvaMaterial(existing: MaterialItem[], material: MaterialItem): boolean {
  return calculateMaterialStorageSize([...existing, material]) <= MATERIAL_LIBRARY_MAX_MB;
}

export function addCanvaImageWidget(layout: CockpitWidgetConfig[] | undefined, image: string, title: string, materialId?: string): CockpitWidgetConfig[] {
  const widgets = Array.isArray(layout) ? layout : [];
  const openImages = widgets.filter(widget => widget.type === 'image' && widget.visible);
  const shift = openImages.length % 8;
  return [...widgets, {
    id: 'canva-image-' + crypto.randomUUID(),
    type: 'image',
    x: 24 + shift * 4,
    y: 18 + shift * 4,
    w: 36,
    h: 42,
    visible: true,
    hasBeenOpened: true,
    settings: {
      imageUrl: image,
      materialId,
      altText: title.trim().slice(0, 120),
      fileName: title.trim().slice(0, 120),
      rotation: 0,
      scale: 1,
      panX: 0,
      panY: 0,
      fit: 'contain',
    },
  }];
}
