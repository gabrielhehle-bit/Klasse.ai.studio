
export const TAGE_NAMEN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

export const VM_ZEITEN = ['08:00–08:50', '08:50–09:45', '10:00–10:50', '10:50–11:45', '11:45–12:30'];

export const STUNDEN_INFO: Record<number, string> = {
  1: '08:00–08:50',
  2: '08:50–09:45',
  3: '10:00–10:50',
  4: '10:50–11:45',
  5: '11:45–12:30',
  6: '13:30–14:20',
  7: '14:20–15:10',
  8: '15:10–16:00',
};

export const FAECHER_H = ['Deutsch', 'Mathematik', 'Sachunterricht', 'Englisch', 'Türkisch'];
export const FAECHER_N = ['Kunst', 'Werken', 'Musik', 'Turnen'];
export const FAECHER_ALLE = [
  'Deutsch', 'Mathematik', 'Sachunterricht', 'Religion', 'Englisch', 'Türkisch',
  'Musikerziehung', 'Bildnerische Erziehung', 'Werken (TEC)', 'Werken (TEX)', 'Bewegung und Sport'
];
export const FAECHER_VS = FAECHER_ALLE;

export const DEUTSCH_UNTERFAECHER = ['Deutsch (Sprache)', 'Deutsch (Lesen)', 'Deutsch (Rechtschreibung)', 'Deutsch (Verfassen von Texten)'];

export const DEUTSCH_BEREICHE = ['Deutsch Lesen', 'Sprachbetrachtung', 'Rechtschreibung', 'Texte verfassen'];

export const NOTE_LABELS: Record<number, string> = {
  1: 'Sehr gut',
  2: 'Gut',
  3: 'Befriedigend',
  4: 'Genügend',
  5: 'Nicht genügend',
};

export const DEFAULT_TAGEPLAN = {
  Montag: { vm: 5, nm: false, stunden: [1, 2, 3, 4, 5] },
  Dienstag: { vm: 5, nm: false, stunden: [1, 2, 3, 4, 5] },
  Mittwoch: { vm: 5, nm: false, stunden: [1, 2, 3, 4, 5] },
  Donnerstag: { vm: 5, nm: false, stunden: [1, 2, 3, 4, 5] },
  Freitag: { vm: 4, nm: false, stunden: [1, 2, 3, 4] },
};

export const SONDER_FAECHER = [
  'Theateraufführung', 'Schulausflug', 'Projekttag', 'Spieletag', 'Sporttag',
  'Schwimmtag', 'Museumbesuch', 'Bibliothek', 'Singestunde', 'Basteln/Werken',
  'Adventfeier', 'Schlussfest', 'Elternabend', 'Konferenz', 'Fortbildung', 'Supplierstunde'
];

export const DEFAULT_YEARLY_SUBJECTS = [
  { id: 'deutsch', label: 'Deutsch', color: 'bg-blue-200 border-blue-400 text-blue-900 font-black' },
  { id: 'mathematik', label: 'Mathematik', color: 'bg-red-200 border-red-400 text-red-900 font-black' },
  { id: 'sachunterricht', label: 'SU', color: 'bg-emerald-200 border-emerald-400 text-emerald-950 font-black' },
  { id: 'checks', label: 'Checks/SA', color: 'bg-rose-200 border-rose-400 text-rose-900 font-black' },
  { id: 'sonstiges', label: 'Sonstiges', color: 'bg-stone-200 border-stone-400 text-stone-950 font-black' },
];

export const DEFAULT_FACH_COLORS: Record<string, { color: string; scaleColor?: 'blue' | 'red' | 'emerald' }> = {
  'Deutsch': { color: 'blue', scaleColor: 'blue' },
  'Deutsch (Sprache)': { color: 'blue', scaleColor: 'blue' },
  'Deutsch (Lesen)': { color: 'blue', scaleColor: 'blue' },
  'Deutsch (Rechtschreibung)': { color: 'blue', scaleColor: 'blue' },
  'Deutsch (Verfassen von Texten)': { color: 'blue', scaleColor: 'blue' },
  'Mathematik': { color: 'red', scaleColor: 'red' },
  'Sachunterricht': { color: 'emerald', scaleColor: 'emerald' },
  'Religionsunterricht': { color: 'indigo', scaleColor: 'blue' },
  'Religion': { color: 'indigo', scaleColor: 'blue' },
  'Englisch': { color: 'sky', scaleColor: 'blue' },
  'Türkisch': { color: 'red', scaleColor: 'red' },
  'Musikerziehung': { color: 'purple', scaleColor: 'blue' },
  'Bildnerische Erziehung': { color: 'blue', scaleColor: 'blue' },
  'Werken (TEC)': { color: 'orange', scaleColor: 'blue' },
  'Werken (TEX)': { color: 'pink', scaleColor: 'blue' },
  'Bewegung und Sport': { color: 'teal', scaleColor: 'emerald' },
  'Technik und Design': { color: 'violet', scaleColor: 'blue' },
  'Kunst und Gestaltung': { color: 'purple', scaleColor: 'emerald' },
};

export const COLOR_OPTIONS = [
  { id: 'blue', label: 'Blau', bg: 'bg-blue-500' },
  { id: 'red', label: 'Rot', bg: 'bg-red-500' },
  { id: 'emerald', label: 'Grün', bg: 'bg-emerald-500' },
  { id: 'amber', label: 'Goldschatz', bg: 'bg-amber-500' },
  { id: 'purple', label: 'Lila', bg: 'bg-purple-500' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-500' },
  { id: 'teal', label: 'Türkis', bg: 'bg-teal-500' },
  { id: 'orange', label: 'Orange', bg: 'bg-orange-500' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'sky', label: 'Himmelblau', bg: 'bg-sky-500' },
  { id: 'slate', label: 'Schiefergrau', bg: 'bg-slate-500' },
  { id: 'stone', label: 'Steingrau', bg: 'bg-stone-500' },
  { id: 'yellow', label: 'Zitronengelb', bg: 'bg-yellow-400' },
  { id: 'lime', label: 'Limetten-Grün', bg: 'bg-lime-500' },
  { id: 'green', label: 'Hellgrün', bg: 'bg-green-500' },
  { id: 'cyan', label: 'Cyan/Türkisblau', bg: 'bg-cyan-500' },
  { id: 'violet', label: 'Violett', bg: 'bg-violet-500' },
  { id: 'fuchsia', label: 'Fuchsia', bg: 'bg-fuchsia-500' },
  { id: 'pink', label: 'Pink', bg: 'bg-pink-500' },
];

export const EMOJIS = ['👨‍🎓', '👩‍🎓', '🧑‍🎓', '🦁', '🦉', '🦊', '🐻', '🐼', '🐯', '🐧', '🦆', '🐸', '🐢', '🐈', '🐕', '🦋', '🐝', '🦖', '🐉', '✨', '🌟', '🚀', '🎨', '🧩', '⚽', '🎹', '🎸', '🍦', '🍩', '🍕'];

export const STUNDENTAFEL: Record<number, Record<string, string | number>> = {
  1: {
    'Religion': 2,
    'Sachunterricht': 3,
    'Deutsch': 7,
    'Mathematik': 4,
    'Musikerziehung': 1,
    'Bildnerische Erziehung': 1,
    'Technisches/Textiles Werken': 1,
    'Bewegung und Sport': 3,
    'Lebende Fremdsprache': 'integrativ',
    'Verkehrserziehung': 'integrativ',
    'Gesamt': '20-23'
  },
  2: {
    'Religion': 2,
    'Sachunterricht': 3,
    'Deutsch': 7,
    'Mathematik': 4,
    'Musikerziehung': 1,
    'Bildnerische Erziehung': 1,
    'Technisches/Textiles Werken': 1,
    'Bewegung und Sport': 3,
    'Lebende Fremdsprache': 'integrativ',
    'Verkehrserziehung': 'integrativ',
    'Gesamt': '20-23'
  },
  3: {
    'Religion': 2,
    'Sachunterricht': 3,
    'Deutsch': 7,
    'Mathematik': 4,
    'Musikerziehung': 1,
    'Bildnerische Erziehung': 1,
    'Technisches/Textiles Werken': 2,
    'Bewegung und Sport': 2,
    'Lebende Fremdsprache': 1,
    'Verkehrserziehung': 'integrativ',
    'Gesamt': '22-25'
  },
  4: {
    'Religion': 2,
    'Sachunterricht': 3,
    'Deutsch': 7,
    'Mathematik': 4,
    'Musikerziehung': 1,
    'Bildnerische Erziehung': 1,
    'Technisches/Textiles Werken': 2,
    'Bewegung und Sport': 2,
    'Lebende Fremdsprache': 1,
    'Verkehrserziehung': 'integrativ',
    'Gesamt': '22-25'
  }
};

export const AESTHETIC_THEMES = [
  { id: 'classic_light', label: 'Classic Light', color: 'bg-neutral-50 border border-neutral-200 shadow-sm' },
  { id: 'soft_sage', label: 'Soft Sage', color: 'bg-stone-100 border border-emerald-100 shadow-sm' },
  { id: 'ocean_breeze', label: 'Ocean Breeze', color: 'bg-slate-50 border border-blue-100 shadow-sm' },
  { id: 'warm_sand', label: 'Warm Sand', color: 'bg-orange-50/20 border border-orange-100 shadow-sm' },
  { id: 'lavender_field', label: 'Lavender Field', color: 'bg-violet-50/60 border border-violet-150 shadow-sm' },
  { id: 'peach_blossom', label: 'Peach Blossom', color: 'bg-amber-50/30 border border-amber-200 shadow-sm' },
  { id: 'cozy_mint', label: 'Cozy Mint', color: 'bg-emerald-50/40 border border-emerald-200 shadow-sm' },
  { id: 'sakura_dream', label: 'Sakura Dream', color: 'bg-rose-50/55 border border-rose-200 shadow-sm' },
] as const;

export const DEFAULT_GEWICHTUNG: Record<string, any> = {
  'Deutsch': { sa: 50, lzk: 20, wp: 10, obj: 0, mi: 20 },
  'Mathematik': { sa: 50, lzk: 20, wp: 10, obj: 0, mi: 20 },
  'Sachunterricht': { sa: 0, lzk: 60, wp: 0, obj: 0, mi: 40 },
  'Englisch': { sa: 0, lzk: 40, wp: 20, obj: 0, mi: 40 },
  'Türkisch': { sa: 0, lzk: 40, wp: 20, obj: 0, mi: 40 },
  'Musikerziehung': { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100 },
  'Bildnerische Erziehung': { sa: 0, lzk: 0, wp: 0, obj: 60, mi: 40 },
  'Werken (TEC)': { sa: 0, lzk: 0, wp: 0, obj: 60, mi: 40 },
  'Werken (TEX)': { sa: 0, lzk: 0, wp: 0, obj: 60, mi: 40 },
  'Bewegung und Sport': { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100 },
  'Religion': { sa: 0, lzk: 0, wp: 0, obj: 0, mi: 100 }
};

export const FONTS = [
  { id: 'standard', label: 'Standard', description: 'Modern Sans-Serif' },
  { id: 'geometric', label: 'Geometric', description: 'Modern & Geometrisch' },
  { id: 'friendly', label: 'Friendly', description: 'Weich & Rund' },
  { id: 'handwritten', label: 'Handschrift', description: 'Wie an der Tafel' },
  { id: 'schulschrift', label: 'Schulschrift', description: 'Für Anfänger' },
  { id: 'druckschrift', label: 'Druckschrift', description: 'Klare Druckbuchstaben' },
  { id: 'elegant', label: 'Elegant', description: 'Edel & Prunkvoll' },
  { id: 'comfort', label: 'Modern/Comfort', description: 'Schnittige Kurven' },
  { id: 'serif', label: 'Serif', description: 'Klassische Buchschrift' },
  { id: 'dyslexic', label: 'Dyslexic', description: 'Fokus auf Lesbarkeit' },
  { id: 'playful', label: 'Playful', description: 'Rund & Verspielt' },
  { id: 'mono', label: 'Mono', description: 'Klar & Technisch' },
] as const;
