import {
  DEUTSCH_UNTERFAECHER,
  FAECHER_ALLE,
  MATHEMATIK_UNTERFAECHER,
} from '../constants';

export const KLASSENBUCH_CATEGORY_SEPARATOR = ' › ';

export type KlassenbuchCategoryDefinition = {
  key: string;
  subject: string;
  subarea?: string;
};

const normalize = (value: unknown) =>
  String(value || '')
    .trim()
    .toLocaleLowerCase('de-AT')
    .replace(/\s+/g, ' ');

const withoutWrapper = (value: string, prefix: string) =>
  value.startsWith(prefix) && value.endsWith(')')
    ? value.slice(prefix.length, -1).trim()
    : value;

const deutschSubareas = DEUTSCH_UNTERFAECHER.map((value) =>
  withoutWrapper(value, 'Deutsch ('),
);

const mathSubareas = MATHEMATIK_UNTERFAECHER.map((value) =>
  withoutWrapper(value, 'Mathematik ('),
);

const deutschAliases: Record<string, string> = {
  'deutsch (sprache)': 'Sprachbetrachtung',
  'sprache': 'Sprachbetrachtung',
  'sprachbetrachtung': 'Sprachbetrachtung',
  'sprechen & hören': 'Sprechen & Hören',
  'sprechen und hören': 'Sprechen & Hören',
  'lesen': 'Lesen',
  'rechtschreibung': 'Rechtschreibung',
  'rechtschreiben': 'Rechtschreibung',
  'verfassen von texten': 'Verfassen von Texten',
  'texte verfassen': 'Verfassen von Texten',
  'd-fö': 'Förderung',
  'd-fö/dfö': 'Förderung',
  'dfö': 'Förderung',
  'deutsch (förderung)': 'Förderung',
};

const mathAliases: Record<string, string> = {
  'ebene & raum': 'Ebene & Raum',
  'ebene und raum': 'Ebene & Raum',
  'zahlen & daten': 'Zahlen & Daten',
  'zahlen und daten': 'Zahlen & Daten',
  'größen': 'Größen',
  'groessen': 'Größen',
  'operationen': 'Operationen',
};

const otherAliases: Record<string, string> = {
  su: 'Sachunterricht',
  sachunterricht: 'Sachunterricht',
  r: 'Religion',
  rel: 'Religion',
  religion: 'Religion',
  religionsunterricht: 'Religion',
  e: 'Englisch',
  eng: 'Englisch',
  englisch: 'Englisch',
  türkisch: 'Türkisch',
  tuerkisch: 'Türkisch',
  me: 'Musikerziehung',
  mu: 'Musikerziehung',
  musik: 'Musikerziehung',
  musikerziehung: 'Musikerziehung',
  be: 'Bildnerische Erziehung',
  zeichnen: 'Bildnerische Erziehung',
  kunst: 'Bildnerische Erziehung',
  'bildnerische erziehung': 'Bildnerische Erziehung',
  'werken (tec)': 'Werken (TEC)',
  tew: 'Werken (TEC)',
  'technisches werken': 'Werken (TEC)',
  'werken (tex)': 'Werken (TEX)',
  txw: 'Werken (TEX)',
  'textiles werken': 'Werken (TEX)',
  bsp: 'Bewegung und Sport',
  'b&s': 'Bewegung und Sport',
  sport: 'Bewegung und Sport',
  turnen: 'Bewegung und Sport',
  'bewegung und sport': 'Bewegung und Sport',
};

export const klassenbuchCategoryKey = (subject: string, subarea?: string) =>
  subarea
    ? `${subject}${KLASSENBUCH_CATEGORY_SEPARATOR}${subarea}`
    : subject;

export function splitKlassenbuchCategoryKey(key: string): KlassenbuchCategoryDefinition {
  const [subject, ...rest] = String(key || '').split(KLASSENBUCH_CATEGORY_SEPARATOR);
  const subarea = rest.join(KLASSENBUCH_CATEGORY_SEPARATOR).trim();
  return {
    key,
    subject: subject.trim(),
    ...(subarea ? { subarea } : {}),
  };
}

const findDeutschSubarea = (value: unknown): string | null => {
  const raw = String(value || '').trim();
  const normalized = normalize(raw);
  if (!normalized) return null;

  const direct = deutschSubareas.find((subarea) => normalize(subarea) === normalized);
  if (direct) return direct;

  if (normalized.startsWith('deutsch (') && normalized.endsWith(')')) {
    const inner = normalized.slice('deutsch ('.length, -1).trim();
    const exact = deutschSubareas.find((subarea) => normalize(subarea) === inner);
    if (exact) return exact;
    if (deutschAliases[inner]) return deutschAliases[inner];
  }

  return deutschAliases[normalized] || null;
};

const findMathSubarea = (value: unknown): string | null => {
  const raw = String(value || '').trim();
  const normalized = normalize(raw);
  if (!normalized) return null;

  const direct = mathSubareas.find((subarea) => normalize(subarea) === normalized);
  if (direct) return direct;

  if (normalized.startsWith('mathematik (') && normalized.endsWith(')')) {
    const inner = normalized.slice('mathematik ('.length, -1).trim();
    const exact = mathSubareas.find((subarea) => normalize(subarea) === inner);
    if (exact) return exact;
    if (mathAliases[inner]) return mathAliases[inner];
  }

  return mathAliases[normalized] || null;
};

const isDeutsch = (value: unknown) => {
  const normalized = normalize(value);
  return (
    normalized === 'd' ||
    normalized === 'de' ||
    normalized === 'deutsch' ||
    normalized.startsWith('deutsch (') ||
    normalized === 'd-fö' ||
    normalized === 'd-fö/dfö' ||
    normalized === 'dfö'
  );
};

const isMathematik = (value: unknown) => {
  const normalized = normalize(value);
  return (
    normalized === 'm' ||
    normalized === 'ma' ||
    normalized === 'mathe' ||
    normalized === 'mathematik' ||
    normalized.startsWith('mathematik (') ||
    normalized === 'rechnen'
  );
};

export function canonicalKlassenbuchSubject(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (isDeutsch(raw)) return 'Deutsch';
  if (isMathematik(raw)) return 'Mathematik';

  const normalized = normalize(raw);
  return otherAliases[normalized] || raw;
}

export function getKlassenbuchBaseCategories(activeSubjects?: string[]): KlassenbuchCategoryDefinition[] {
  const configured = (activeSubjects && activeSubjects.length > 0 ? activeSubjects : FAECHER_ALLE)
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const result: KlassenbuchCategoryDefinition[] = [];
  const seen = new Set<string>();

  const add = (subject: string, subarea?: string) => {
    const key = klassenbuchCategoryKey(subject, subarea);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ key, subject, ...(subarea ? { subarea } : {}) });
  };

  const configuredHasDeutschParent = configured.some((value) => normalize(value) === 'deutsch');
  const configuredHasMathParent = configured.some((value) => normalize(value) === 'mathematik');

  if (configuredHasDeutschParent) {
    deutschSubareas.forEach((subarea) => add('Deutsch', subarea));
  } else {
    configured.forEach((value) => {
      const subarea = findDeutschSubarea(value);
      if (subarea) add('Deutsch', subarea);
    });
  }

  if (configuredHasMathParent) {
    mathSubareas.forEach((subarea) => add('Mathematik', subarea));
  } else {
    configured.forEach((value) => {
      const subarea = findMathSubarea(value);
      if (subarea) add('Mathematik', subarea);
    });
  }

  configured.forEach((value) => {
    if (isDeutsch(value) || isMathematik(value)) return;
    add(canonicalKlassenbuchSubject(value));
  });

  return result;
}

export function classifyKlassenbuchEntry(
  subjectValue: unknown,
  focusValues: unknown[] = [],
): KlassenbuchCategoryDefinition[] {
  const subjectRaw = String(subjectValue || '').trim();
  const focuses = (Array.isArray(focusValues) ? focusValues : [])
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  if (isDeutsch(subjectRaw) || focuses.some(isDeutsch)) {
    const matched = new Set<string>();
    const ownSubarea = findDeutschSubarea(subjectRaw);
    if (ownSubarea) matched.add(ownSubarea);
    focuses.forEach((value) => {
      const subarea = findDeutschSubarea(value);
      if (subarea) matched.add(subarea);
    });
    if (matched.size === 0) matched.add('Ohne Unterbereich');
    return Array.from(matched).map((subarea) => ({
      key: klassenbuchCategoryKey('Deutsch', subarea),
      subject: 'Deutsch',
      subarea,
    }));
  }

  if (isMathematik(subjectRaw) || focuses.some(isMathematik)) {
    const matched = new Set<string>();
    const ownSubarea = findMathSubarea(subjectRaw);
    if (ownSubarea) matched.add(ownSubarea);
    focuses.forEach((value) => {
      const subarea = findMathSubarea(value);
      if (subarea) matched.add(subarea);
    });
    if (matched.size === 0) matched.add('Ohne Unterbereich');
    return Array.from(matched).map((subarea) => ({
      key: klassenbuchCategoryKey('Mathematik', subarea),
      subject: 'Mathematik',
      subarea,
    }));
  }

  const subject = canonicalKlassenbuchSubject(subjectRaw);
  if (!subject) return [];
  return [{ key: subject, subject }];
}

export function orderKlassenbuchCategoryKeys(
  keys: string[],
  activeSubjects?: string[],
): string[] {
  const base = getKlassenbuchBaseCategories(activeSubjects);
  const baseOrder = new Map(base.map((item, index) => [item.key, index]));
  const subjectOrder = new Map(
    (activeSubjects && activeSubjects.length > 0 ? activeSubjects : FAECHER_ALLE)
      .map(canonicalKlassenbuchSubject)
      .map((subject, index) => [subject, index]),
  );

  return [...keys].sort((a, b) => {
    const exactA = baseOrder.get(a);
    const exactB = baseOrder.get(b);
    if (exactA !== undefined || exactB !== undefined) {
      if (exactA === undefined) return 1;
      if (exactB === undefined) return -1;
      return exactA - exactB;
    }

    const parsedA = splitKlassenbuchCategoryKey(a);
    const parsedB = splitKlassenbuchCategoryKey(b);
    const subjectA = subjectOrder.get(parsedA.subject) ?? 10_000;
    const subjectB = subjectOrder.get(parsedB.subject) ?? 10_000;
    if (subjectA !== subjectB) return subjectA - subjectB;
    return a.localeCompare(b, 'de-AT');
  });
}

export const KLASSENBUCH_DEUTSCH_SUBAREAS = deutschSubareas;
export const KLASSENBUCH_MATHEMATIK_SUBAREAS = mathSubareas;
