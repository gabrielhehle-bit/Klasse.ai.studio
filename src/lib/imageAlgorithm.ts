/**
 * imageAlgorithm.ts
 * 
 * Reines Logik-, Validierungs- und Berechnungsmodell für das Bildanzeige-Widget (F18).
 * - 100 % deterministisch, offline-fähig & datenschutzkonform
 * - Kein Photoshop/Editor: Fokus auf schnelles, unverzerrtes Anzeigen (object-fit: contain)
 * - Keine Netzwerkübertragung, keine KI-Analyse, keine Gesichtserkennung, kein OCR
 * - Strikte Validierung von Dateitypen (PNG, JPG/JPEG, WebP, GIF) und Dateigrößen
 * - Verhindert Leaking von Dateipfaden (C:\... oder /home/...)
 * - Reaktives Zoom- & Rotationsmodell (0°, 90°, 180°, 270°)
 * - Sichere Object-URL Verwaltung ohne Speicherlecks
 * - Reaktive Größenberechnung für F-UI Responsive-Klassen (COMPACT, STANDARD, LARGE, FULLSCREEN)
 */

import { WidgetSizeCategory } from '../components/cockpit/widgetLayout';

export interface ImageWidgetSettings {
  imageUrl: string | null;
  altText: string;
  rotation: number;
  scale: number;
  panX: number;
  panY: number;
  fit: 'contain' | 'cover';
  materialId?: string;
  fileName?: string;
  fileSizeBytes?: number;
  lastUpdated?: string;
}

export const DEFAULT_IMAGE_SETTINGS: ImageWidgetSettings = {
  imageUrl: null,
  altText: '',
  rotation: 0,
  scale: 1,
  panX: 0,
  panY: 0,
  fit: 'contain',
};

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const;

/** Maximale Rohdateigröße für Upload: 25 MB */
export const MAX_RAW_FILE_SIZE_BYTES = 25 * 1024 * 1024;

/** Maximale Kantenlänge beim clientseitigen Downscaling (Smartboard-optimiert) */
export const MAX_IMAGE_DIMENSION = 2048;

/** Min- und Max-Zoomfaktoren */
export const MIN_ZOOM_SCALE = 0.5;
export const MAX_ZOOM_SCALE = 3.5;
export const ZOOM_STEP = 0.25;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName?: string;
}

/**
 * Filtert gefährliche Pfade (z. B. C:\Users\Lehrer\... oder /var/data/...)
 * und behält nur den reinen Dateinamen (z. B. arbeitsblatt.png)
 */
export function sanitizeFileName(rawName?: string): string {
  if (!rawName || typeof rawName !== 'string') return '';
  // Ersetze Backslashes durch normale Slashes
  const normalized = rawName.replace(/\\/g, '/');
  const baseName = normalized.split('/').pop() || '';
  // Entferne potenziell schädliche Steuerzeichen
  return baseName.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

/**
 * Säubert den Alt-Text / Bildbeschreibung für Accessibility
 */
export function sanitizeImageAltText(rawText?: string): string {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>?/gm, '') // Keine restlichen HTML-Tags
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, 150);
}

/**
 * Validiert eine ausgewählte Bilddatei
 */
export function validateImageFile(file: {
  name?: string;
  type?: string;
  size?: number;
}): FileValidationResult {
  if (!file) {
    return { valid: false, error: 'Keine Datei ausgewählt.' };
  }

  // 1. Dateigröße
  if (typeof file.size === 'number' && file.size > MAX_RAW_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Die Datei ist mit ${sizeMb} MB zu groß (maximal 25 MB erlaubt).`,
    };
  }

  // 2. MIME-Typ und Dateiendung
  const sanitizedName = sanitizeFileName(file.name);
  const ext = sanitizedName.split('.').pop()?.toLowerCase() || '';
  const mime = (file.type || '').toLowerCase();

  const isMimeAllowed = ALLOWED_IMAGE_MIME_TYPES.some((t) => mime.startsWith(t));
  const isExtAllowed = ALLOWED_IMAGE_EXTENSIONS.some((e) => e === ext);

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: 'Nicht unterstütztes Format. Bitte PNG, JPG, WebP oder GIF verwenden.',
      sanitizedName,
    };
  }

  return {
    valid: true,
    sanitizedName,
  };
}

/**
 * Prüft, ob eine Bild-URL sicher ist (Schutz vor javascript:, vbscript:, data:text/html etc.)
 */
export function isSafeImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Gefährliche Schemes blockieren
  const dangerousPatterns = [
    /^javascript:/i,
    /^vbscript:/i,
    /^file:/i,
    /^data:text\//i,
    /^data:application\//i,
  ];

  if (dangerousPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  // Erlaubte Formate:
  // - data:image/...
  // - blob:...
  // - https://... oder http://...
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;
  if (/^https?:\/\//i.test(trimmed)) return true;

  return false;
}

/**
 * Normalisiert Rotationswinkel auf 0, 90, 180 oder 270 Grad
 */
export function normalizeRotation(deg: number): number {
  if (typeof deg !== 'number' || isNaN(deg)) return 0;
  const mod = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  return mod;
}

/**
 * Berechnet den nächsten Rotationsschritt im Uhrzeigersinn (+90°)
 */
export function rotateClockwise(currentDeg: number): number {
  return normalizeRotation(currentDeg + 90);
}

/**
 * Begrenzt den Zoom-Faktor sauber
 */
export function clampZoom(scale: number): number {
  if (typeof scale !== 'number' || isNaN(scale)) return 1;
  const clamped = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));
  return Math.round(clamped * 100) / 100;
}

/**
 * Zoom In / Out Stufen
 */
export function zoomIn(currentScale: number): number {
  return clampZoom(currentScale + ZOOM_STEP);
}

export function zoomOut(currentScale: number): number {
  return clampZoom(currentScale - ZOOM_STEP);
}

/**
 * Berechnet verkleinerte Maße proportional (Maximalmaß-Begrenzung)
 */
export function calculateDownscaledDimensions(
  origW: number,
  origH: number,
  maxDimension = MAX_IMAGE_DIMENSION
): { width: number; height: number; wasResized: boolean } {
  if (origW <= 0 || origH <= 0) {
    return { width: 0, height: 0, wasResized: false };
  }

  if (origW <= maxDimension && origH <= maxDimension) {
    return { width: origW, height: origH, wasResized: false };
  }

  const ratio = Math.min(maxDimension / origW, maxDimension / origH);
  return {
    width: Math.round(origW * ratio),
    height: Math.round(origH * ratio),
    wasResized: true,
  };
}

/**
 * Ermittelt die kanonischen Widget-Settings aus bestehendem AppState
 */
export function getCanonicalImageSettings(settings?: any): ImageWidgetSettings {
  if (!settings || typeof settings !== 'object') {
    return { ...DEFAULT_IMAGE_SETTINGS };
  }

  let imageUrl: string | null = null;
  if (typeof settings.imageUrl === 'string' && isSafeImageUrl(settings.imageUrl)) {
    imageUrl = settings.imageUrl;
  } else if (typeof settings.url === 'string' && isSafeImageUrl(settings.url)) {
    imageUrl = settings.url;
  }

  const rotation = normalizeRotation(settings.rotation ?? 0);
  const scale = clampZoom(settings.scale ?? 1);
  const panX = typeof settings.panX === 'number' && !isNaN(settings.panX) ? settings.panX : 0;
  const panY = typeof settings.panY === 'number' && !isNaN(settings.panY) ? settings.panY : 0;
  const fit = settings.fit === 'cover' ? 'cover' : 'contain';
  const altText = sanitizeImageAltText(settings.altText || settings.title || '');
  const fileName = sanitizeFileName(settings.fileName);
  const materialId = typeof settings.materialId === 'string' ? settings.materialId : undefined;

  return {
    imageUrl,
    altText,
    rotation,
    scale,
    panX,
    panY,
    fit,
    fileName: fileName || undefined,
    materialId,
    fileSizeBytes: typeof settings.fileSizeBytes === 'number' ? settings.fileSizeBytes : undefined,
    lastUpdated: settings.lastUpdated,
  };
}

/**
 * Begrenzt das Verschieben (Pan), wenn das Bild vergrößert ist.
 * Wenn scale <= 1, wird panX und panY immer auf 0 fixiert.
 */
export function clampPan(
  panX: number,
  panY: number,
  scale: number,
  containerWidth: number,
  containerHeight: number
): { panX: number; panY: number } {
  if (scale <= 1) {
    return { panX: 0, panY: 0 };
  }

  // Erlaube Pan proportional zum Zoom-Überhang
  const maxPanX = Math.max(0, (containerWidth * (scale - 1)) / 2);
  const maxPanY = Math.max(0, (containerHeight * (scale - 1)) / 2);

  const clampedX = Math.min(maxPanX, Math.max(-maxPanX, panX));
  const clampedY = Math.min(maxPanY, Math.max(-maxPanY, panY));

  return {
    panX: Math.round(clampedX),
    panY: Math.round(clampedY),
  };
}

/**
 * Sichere Object-URL-Verwaltung zur Vermeidung von Speicherlecks
 */
export class SafeObjectUrlManager {
  private activeUrls: Set<string> = new Set();

  public create(blob: Blob): string {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return '';
    }
    const url = URL.createObjectURL(blob);
    this.activeUrls.add(url);
    return url;
  }

  public revoke(url?: string | null): void {
    if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
      return;
    }
    if (this.activeUrls.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignoriere Browserfehler beim Revoken
      }
      this.activeUrls.delete(url);
    }
  }

  public revokeAll(): void {
    if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') {
      this.activeUrls.clear();
      return;
    }
    this.activeUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Safe cleanup
      }
    });
    this.activeUrls.clear();
  }

  public get count(): number {
    return this.activeUrls.size;
  }
}
