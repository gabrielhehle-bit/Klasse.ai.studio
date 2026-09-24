import { getAccentTextColor } from './utils';

/** A personal accent changes controls only, never the selected design's surfaces. */
export function resolveAppVisualStyle(
  theme: string | undefined,
  profileAccent: string | undefined,
  customBackground: string | undefined,
): string {
  // Older profile saves accidentally set theme='custom_theme' solely to
  // change the accent. With no actual custom background there is no custom
  // design to preserve; return those accounts to the regular light design.
  if (theme === 'custom_theme' && isValidAccent(profileAccent) && !customBackground) {
    return 'classic_light';
  }
  return theme || 'classic_light';
}

export function isValidAccent(color: unknown): color is string {
  return typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color);
}

export function getProfileAccentTokens(
  color: string | undefined,
  darkDesign: boolean,
): Record<string, string> {
  if (!isValidAccent(color)) return {};
  const contrastText = getAccentTextColor(color);
  return {
    '--accent': color,
    '--btn-text': contrastText,
    '--accent-text': contrastText,
    '--accent-soft': `color-mix(in srgb, ${color} 15%, transparent)`,
    '--accent-hover': `color-mix(in srgb, ${color} 86%, ${darkDesign ? 'white' : 'black'})`,
    '--accent-active': `color-mix(in srgb, ${color} 72%, ${darkDesign ? 'white' : 'black'})`,
    '--focus-ring': color,
  };
}
