export const STANDARD_COLOR_MAP: Record<string, string> = {
  slate: '#64748b',
  stone: '#78716c',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
};

export interface ColorPresetOption {
  id: string;
  label: string;
  hex: string;
  bg: string;
}

export const COLOR_PRESET_OPTIONS: ColorPresetOption[] = [
  { id: 'blue', label: 'Blau', hex: '#3b82f6', bg: 'bg-blue-500' },
  { id: 'sky', label: 'Himmelblau', hex: '#0ea5e9', bg: 'bg-sky-500' },
  { id: 'teal', label: 'Türkis', hex: '#14b8a6', bg: 'bg-teal-500' },
  { id: 'emerald', label: 'Smaragdgrün', hex: '#10b981', bg: 'bg-emerald-500' },
  { id: 'green', label: 'Grün', hex: '#22c55e', bg: 'bg-green-500' },
  { id: 'lime', label: 'Hellgrün', hex: '#84cc16', bg: 'bg-lime-500' },
  { id: 'yellow', label: 'Gelb', hex: '#eab308', bg: 'bg-yellow-400' },
  { id: 'amber', label: 'Goldschatz', hex: '#f59e0b', bg: 'bg-amber-500' },
  { id: 'orange', label: 'Orange', hex: '#f97316', bg: 'bg-orange-500' },
  { id: 'red', label: 'Rot', hex: '#ef4444', bg: 'bg-red-500' },
  { id: 'rose', label: 'Rosa', hex: '#f43f5e', bg: 'bg-rose-500' },
  { id: 'pink', label: 'Pink', hex: '#ec4899', bg: 'bg-pink-500' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#d946ef', bg: 'bg-fuchsia-500' },
  { id: 'purple', label: 'Lila', hex: '#a855f7', bg: 'bg-purple-500' },
  { id: 'violet', label: 'Violett', hex: '#8b5cf6', bg: 'bg-violet-500' },
  { id: 'indigo', label: 'Indigo', hex: '#6366f1', bg: 'bg-indigo-500' },
  { id: 'cyan', label: 'Cyan', hex: '#06b6d4', bg: 'bg-cyan-500' },
  { id: 'slate', label: 'Schiefergrau', hex: '#64748b', bg: 'bg-slate-500' },
  { id: 'stone', label: 'Steingrau', hex: '#78716c', bg: 'bg-stone-500' },
];

/**
 * Checks if a string is a valid HEX color code (#RGB or #RRGGBB)
 */
export function isHexColor(color?: string): boolean {
  if (!color || typeof color !== 'string') return false;
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim());
}

/**
 * Expands 3-character hex (#rgb) to 6-character hex (#rrggbb)
 */
export function normalizeHex(hex: string): string {
  const clean = hex.trim();
  if (clean.length === 4 && clean.startsWith('#')) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
}

/**
 * Returns the default fallback color name for standard Austrian school subjects
 */
export function getDefaultFachColorKey(fachName?: string): string {
  if (!fachName) return 'slate';
  const ln = fachName.toLowerCase();
  if (ln.includes('werken') || ln.includes('technik') || ln.includes('design')) return 'orange';
  if (ln.includes('bewegung') || ln.includes('sport') || ln.includes('turnen')) return 'teal';
  if (ln.includes('fremdsprache') || ln.includes('englisch')) return 'sky';
  if (ln.includes('deutsch')) return 'blue';
  if (ln.includes('mathematik') || ln.includes('mathe')) return 'red';
  if (ln.includes('sachunterricht') || ln.includes('sachkunde')) return 'emerald';
  if (ln.includes('bildnerische') || ln.includes('kunst') || ln.includes('gestaltung')) return 'purple';
  if (ln.includes('musik')) return 'pink';
  if (ln.includes('religion')) return 'indigo';
  return 'slate';
}

/**
 * Resolves color key or custom hex for a subject from fachConfig
 */
export function getFachColorKey(fachName?: string, fachConfig?: Record<string, any>): string {
  if (!fachName) return 'slate';
  const configColor = fachConfig?.[fachName]?.color;
  if (configColor && configColor !== 'slate') {
    return configColor;
  }
  return getDefaultFachColorKey(fachName);
}

/**
 * Resolves a guaranteed 6-digit hex color code (#rrggbb) for any subject name, color key or hex
 */
export function getFachHexColor(fachNameOrColor?: string, fachConfig?: Record<string, any>): string {
  if (!fachNameOrColor) return '#64748b';
  const raw = fachNameOrColor.trim();

  // If already a valid hex
  if (isHexColor(raw)) {
    return normalizeHex(raw);
  }

  // If passed a subject name and fachConfig exists
  if (fachConfig && fachConfig[raw]?.color) {
    const custom = fachConfig[raw].color;
    if (isHexColor(custom)) return normalizeHex(custom);
    if (STANDARD_COLOR_MAP[custom]) return STANDARD_COLOR_MAP[custom];
  }

  // If it's a known palette color key (e.g. 'blue')
  if (STANDARD_COLOR_MAP[raw]) {
    return STANDARD_COLOR_MAP[raw];
  }

  // Fallback by subject heuristics
  const fallbackKey = getDefaultFachColorKey(raw);
  return STANDARD_COLOR_MAP[fallbackKey] || '#64748b';
}

/**
 * Converts a hex color into RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHex(isHexColor(hex) ? hex : getFachHexColor(hex));
  const num = parseInt(norm.replace('#', ''), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Converts a hex color into rgba string with custom alpha
 */
export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Computes standard WCAG relative luminance (0 to 1)
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const a = [r, g, b].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

/**
 * Checks if color is perceptually light (requiring dark text)
 */
export function isLightColor(hex: string): boolean {
  return getLuminance(hex) > 0.45;
}

/**
 * Returns high-contrast text color for a solid background of the given hex color
 */
export function getContrastingTextColor(hex: string): string {
  return isLightColor(hex) ? '#0f172a' : '#ffffff';
}

/**
 * Returns rich styling properties for cards, badges, and timetable slots
 */
export interface FachThemeStyles {
  hex: string;
  bgLight: string;
  bgMedium: string;
  bgSolid: string;
  borderColor: string;
  textColor: string;
  darkTextColor: string;
  isLight: boolean;
  bg: string;
  text: string;
  border: string;
  inlineCardStyle: React.CSSProperties;
  inlineBadgeStyle: React.CSSProperties;
  inlineTimelineBarStyle: React.CSSProperties;
}

export function getFachThemeStyles(fachNameOrColor?: string, fachConfig?: Record<string, any>): FachThemeStyles {
  const hex = getFachHexColor(fachNameOrColor, fachConfig);
  const isLight = isLightColor(hex);
  const { r, g, b } = hexToRgb(hex);

  // Darker text for light backgrounds (higher saturation/contrast)
  const darkTextColor = `rgb(${Math.max(0, Math.round(r * 0.45))}, ${Math.max(0, Math.round(g * 0.45))}, ${Math.max(0, Math.round(b * 0.45))})`;
  const textColor = isLight ? '#0f172a' : '#ffffff';

  const bgLight = `rgba(${r}, ${g}, ${b}, 0.10)`;
  const bgMedium = `rgba(${r}, ${g}, ${b}, 0.22)`;
  const borderColor = `rgba(${r}, ${g}, ${b}, 0.35)`;

  return {
    hex,
    bgLight,
    bgMedium,
    bgSolid: hex,
    borderColor,
    textColor,
    darkTextColor,
    isLight,
    bg: 'bg-slate-50 border-slate-200/50',
    text: 'text-slate-800',
    border: 'border-slate-200',
    inlineCardStyle: {
      backgroundColor: bgLight,
      borderColor: borderColor,
      color: darkTextColor,
    },
    inlineBadgeStyle: {
      backgroundColor: hex,
      color: textColor,
      borderColor: hex,
    },
    inlineTimelineBarStyle: {
      backgroundColor: hex,
    }
  };
}
