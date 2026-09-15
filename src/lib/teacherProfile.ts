export interface ParsedTeacherName {
  anrede: string;
  vorname: string;
  nachname: string;
}

export function parseLegacyTeacherName(value: string): ParsedTeacherName {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  let anrede = '';
  if (parts[0] === 'Herr' || parts[0] === 'Frau') anrede = parts.shift() || '';
  if (parts.length === 0) return { anrede, vorname: '', nachname: '' };
  if (parts.length === 1) return { anrede, vorname: '', nachname: parts[0] };
  const nachname = parts.pop() || '';
  return { anrede, vorname: parts.join(' '), nachname };
}

export function resolveTeacherDisplayName(
  anrede: string,
  vorname: string,
  nachname: string,
  legacyName = '',
): string {
  return [anrede, vorname, nachname].map(part => part.trim()).filter(Boolean).join(' ') || legacyName.trim();
}
