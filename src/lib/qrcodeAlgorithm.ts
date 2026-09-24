/**
 * qrcodeAlgorithm.ts
 * 
 * Reines Logik-, Normalisierungs- und Validierungsmodell für das QR-Code-Widget (F17 & F17.1).
 * - 100 % deterministisch & offline-fähig
 * - Strikter XSS- und Scheme-Schutz (Blockade von javascript:, data:, vbscript:, file:)
 * - Typerkennung für Web-Links und neutrale Unterrichts-Freitexte
 * - Kein Secret-Manager: Keine vertraulichen Zugangsdaten am Smartboard anzeigen
 * - Keine Speicherung von Credentials, keine WLAN-Spezialvorlagen mit Passwörtern
 * - Reaktive, verzugsfreie Größenberechnung für F-UI Responsive-Klassen
 * - Keine Schülerdaten, kein Tracking, keine unnötige Historie
 */

import { WidgetSizeCategory } from '../components/cockpit/widgetLayout';

export type QRCodeContentType = 'url' | 'text';

export interface QRCodeContentInfo {
  type: QRCodeContentType;
  rawValue: string;
  encodedValue: string;
  isSafeUrl: boolean;
  safeHref?: string;
  displayLabel: string;
}

export interface QRPreset {
  id: string;
  label: string;
  value: string;
  type: QRCodeContentType;
  icon: string;
}

export const DEFAULT_QR_VALUE = 'https://anton.app';
export const DEFAULT_QR_LABEL = 'Lernportal Anton';

/**
 * Neutrale Schnell-Vorlagen für den österreichischen Schulalltag.
 * Ausschließlich etablierte Web-Links, keine Credentials oder WLAN-Passwörter.
 */
export const QR_PRESETS: QRPreset[] = [
  {
    id: 'preset-anton',
    label: 'Anton Lernportal',
    value: 'https://anton.app',
    type: 'url',
    icon: '🌐',
  },
  {
    id: 'preset-schule-at',
    label: 'Schule.at',
    value: 'https://www.schule.at',
    type: 'url',
    icon: '📚',
  },
  {
    id: 'preset-kahoot',
    label: 'Kahoot Quiz',
    value: 'https://kahoot.it',
    type: 'url',
    icon: '🎮',
  },
];

/**
 * Prüft auf gefährliche oder bösartige Schemes (XSS-Schutz).
 * Erlaubt für Links ausschließlich http://, https:// oder relative Pfade.
 */
export function isDangerousScheme(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim().toLowerCase();
  
  const dangerousPrefixes = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'blob:',
  ];

  return dangerousPrefixes.some((prefix) => trimmed.startsWith(prefix));
}

/**
 * Erkennt den Typ des eingegebenen Inhalts (URL oder Freitext)
 */
export function detectContentType(input: string): QRCodeContentType {
  if (!input || typeof input !== 'string') return 'text';
  const trimmed = input.trim();

  // URL-Erkennung
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('www.') ||
    /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)
  ) {
    return 'url';
  }

  return 'text';
}

/**
 * Prüft, ob ein gegebener String als sichere, klickbare Web-URL behandelt werden darf.
 */
export function isSafeWebUrl(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();

  if (isDangerousScheme(trimmed)) return false;

  // Wenn es wie HTML aussieht, ablehnen
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return false;

  // Whitespace in URL unzulässig
  if (/\s/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  // www... oder domain.tld
  if (lower.startsWith('www.') || /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/.test(trimmed)) {
    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Normalisiert eine Web-URL (fügt https:// hinzu, falls www... oder domain.tld ohne Protokoll eingegeben wurde)
 */
export function normalizeWebUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

/**
 * Analysiert und parst den QR-Inhalt für UI und Generator
 */
export function parseQRCodeInput(input: string, customLabel?: string): QRCodeContentInfo {
  const rawValue = (input ?? '').trim();

  if (!rawValue) {
    return {
      type: 'text',
      rawValue: '',
      encodedValue: '',
      isSafeUrl: false,
      displayLabel: customLabel || 'Leer',
    };
  }

  const detectedType = detectContentType(rawValue);

  if (detectedType === 'url') {
    const isSafe = isSafeWebUrl(rawValue);
    const normalized = isSafe ? normalizeWebUrl(rawValue) : rawValue;
    return {
      type: 'url',
      rawValue,
      encodedValue: normalized,
      isSafeUrl: isSafe,
      safeHref: isSafe ? normalized : undefined,
      displayLabel: customLabel || (isSafe ? normalized.replace(/^https?:\/\//, '') : rawValue),
    };
  }

  return {
    type: 'text',
    rawValue,
    encodedValue: rawValue,
    isSafeUrl: false,
    displayLabel: customLabel || (rawValue.length > 30 ? `${rawValue.substring(0, 30)}...` : rawValue),
  };
}

/**
 * Berechnet die optimale quadratische QR-Code-Pixelgröße basierend auf Container-Maßen
 * Garantiert: Vollständig sichtbar, quadratisch, kein Overflow.
 */
export function calculateOptimalQRSize(
  containerWidth: number,
  containerHeight: number,
  category: WidgetSizeCategory,
  isShort: boolean = false
): number {
  if (category === 'fullscreen') {
    // Vollbild auf Smartboard/Beamer: Maximal groß, aber Platz für Rand und Schließen-Button lassen
    const maxAvailable = Math.min(containerWidth - 64, containerHeight - 160);
    return Math.max(220, Math.min(maxAvailable, 480));
  }

  // Für Kachel-Layouts:
  // Wir berücksichtigen verfügbare Höhe und Breite abzüglich Header, Input und Action-Buttons
  const paddingH = 32;
  // Höhenabzüge je nach Elementen: Header (~44px) + Input (~44px) + Buttons (~44px) + Margins (~32px) = ~164px
  const paddingV = isShort ? 100 : 160;

  const availW = Math.max(100, containerWidth - paddingH);
  const availH = Math.max(100, containerHeight - paddingV);
  const squareSize = Math.min(availW, availH);

  if (category === 'compact') {
    return Math.max(90, Math.min(squareSize, 140));
  }

  if (category === 'standard') {
    return Math.max(120, Math.min(squareSize, 190));
  }

  if (category === 'large') {
    return Math.max(140, Math.min(squareSize, 260));
  }

  return Math.max(110, Math.min(squareSize, 200));
}

/**
 * Löst die kanonischen QR-Code Settings aus dem widget-Objekt auf.
 * Unterstützt abwärtskompatibel widget.settings.content, widget.settings.link und widget.settings.label.
 */
export function getCanonicalQRSettings(widgetSettings?: any): {
  content: string;
  label: string;
} {
  // An intentionally cleared QR must stay empty after a reload or remote sync.
  // Only missing settings receive the original example/preset.
  const rawContent = typeof widgetSettings?.content === 'string' ? widgetSettings.content
    : typeof widgetSettings?.link === 'string' ? widgetSettings.link : DEFAULT_QR_VALUE;
  const content = rawContent.trim();
  const label = (typeof widgetSettings?.label === 'string'
    ? widgetSettings.label : DEFAULT_QR_LABEL).trim();

  return { content, label };
}

/**
 * Sichere Link-Attribute für den Testen-Button
 */
export const SECURE_QR_LINK_ATTRIBUTES = {
  target: '_blank' as const,
  rel: 'noopener noreferrer' as const,
};
