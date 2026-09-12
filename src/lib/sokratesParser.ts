import { Student } from '../types';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export interface ParsedSokratesStudent {
  id?: string;
  lfdNr?: number;
  vorname: string;
  nachname: string;
  geschlecht: string; // 'm' | 'w' | 'd'
  geburtstag: string; // YYYY-MM-DD
  besuchsjahr: string; // e.g. "1", "2", "3", "4", "V"
  sv_nummer: string;
  religion: string;
  staatsbuergerschaft: string;
  anschrift: string;
  plz: string;
  ort: string;
  telefon_mutter: string;
  telefon_vater: string;
  email_eltern: string;
  erstsprache: string;
  notiz: string;
}

export interface ParsedSokratesResult {
  students: ParsedSokratesStudent[];
  klasse?: string;
  schuljahr?: string;
  lehrerName?: string;
  schulName?: string;
  schulkennzahl?: string;
  schulOrt?: string;
  schulPlz?: string;
  schuelerAnzahl?: number;
  warnings: string[];
  sourceMethod: 'ai' | 'pdf_local' | 'text_local';
}

// Normalize Austrian Date (DD.MM.YYYY or DD.MM.YY) to YYYY-MM-DD
export function normalizeDate(str: string): string {
  if (!str) return '';
  const clean = str.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;

  const dotMatch = clean.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dotMatch) {
    const day = dotMatch[1].padStart(2, '0');
    const month = dotMatch[2].padStart(2, '0');
    let year = dotMatch[3];
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = yNum > 50 ? '19' + year : '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  return clean;
}

// Convert YYYY-MM-DD to Austrian display format DD.MM.YYYY
export function formatDateDE(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    return `${d}.${m}.${y}`;
  }
  return clean;
}

// Normalize Austrian Religion abbreviation
export function normalizeReligion(rel: string): string {
  if (!rel) return '';
  const r = rel.trim();
  const lower = r.toLowerCase().replace(/[^a-zäöü]/g, '');
  if (lower === 'rk' || lower === 'roemischkatholisch' || lower === 'roemkath' || lower.includes('kath')) return 'r.k.';
  if (lower === 'ev' || lower === 'evang' || lower === 'evangelisch' || lower === 'evanga' || lower === 'evangab') return 'evang.';
  if (lower === 'isl' || lower === 'islam' || lower === 'islamisch' || lower.includes('igg') || lower === 'alevi') return 'islam.';
  if (lower === 'ob' || lower === 'ohnebekenntnis' || lower === 'ohne') return 'o.B.';
  if (lower === 'orth' || lower === 'orthodox' || lower === 'serborth' || lower === 'rumorth') return 'orthodox';
  if (lower === 'buddh' || lower === 'buddhistisch') return 'buddh.';
  if (lower === 'jued' || lower === 'israelitisch' || lower === 'juedisch') return 'israelit.';
  return r;
}

// Normalize Country
export function normalizeCountry(cntry: string): string {
  if (!cntry) return 'Österreich';
  const c = cntry.trim().toUpperCase();
  if (c === 'AUT' || c === 'A' || c === 'ÖSTERREICH' || c === 'OESTERREICH') return 'Österreich';
  if (c === 'DEU' || c === 'D' || c === 'DEUTSCHLAND') return 'Deutschland';
  if (c === 'TUR' || c === 'TR' || c === 'TÜRKEI' || c === 'TUERKEI') return 'Türkei';
  if (c === 'SYR' || c === 'SYRIEN') return 'Syrien';
  if (c === 'AFG' || c === 'AFGHANISTAN') return 'Afghanistan';
  if (c === 'UKR' || c === 'UKRAINE') return 'Ukraine';
  if (c === 'ROU' || c === 'RO' || c === 'RUMÄNIEN' || c === 'RUMAENIEN') return 'Rumänien';
  if (c === 'SRB' || c === 'SERBIEN') return 'Serbien';
  if (c === 'BIH' || c === 'BOSNIEN' || c === 'BOSNIEN UND HERZEGOWINA') return 'Bosnien';
  if (c === 'HRV' || c === 'KROATIEN') return 'Kroatien';
  if (c === 'HUN' || c === 'UNGARN') return 'Ungarn';
  if (c === 'ITA' || c === 'ITALIEN') return 'Italien';
  if (c === 'CHE' || c === 'SCHWEIZ') return 'Schweiz';
  if (c === 'LIE' || c === 'LIECHTENSTEIN') return 'Liechtenstein';
  if (c === 'KOS' || c === 'KOSOVO') return 'Kosovo';
  if (c === 'GBR' || c === 'UK' || c === 'GROSSBRITANNIEN' || c === 'GROßBRITANNIEN') return 'Großbritannien';
  if (c === 'SOM' || c === 'SOMALIA') return 'Somalia';
  if (c === 'CZE' || c === 'TSCHECHIEN' || c === 'TSCHECHISCHE REPUBLIK') return 'Tschechien';
  if (c === 'RUS' || c === 'RUSSLAND') return 'Russland';
  if (c === 'MKD' || c === 'NORDMAZEDONIEN' || c === 'MAZEDONIEN') return 'Nordmazedonien';
  if (c === 'POL' || c === 'POLEN') return 'Polen';
  if (c === 'SVK' || c === 'SLOWAKEI') return 'Slowakei';
  if (c === 'SVN' || c === 'SLOWENIEN') return 'Slowenien';
  return cntry.trim();
}

// Clean phone numbers
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.trim().replace(/^tel(?:\.|efon)?[:\s]*/i, '');
  clean = clean.replace(/^(?:mutter|mama|vater|papa|obsorge|obs|eltern)[:\s]*/i, '');
  clean = clean.replace(/[,\.;]+$/, '').trim();

  // Strip trailing 10-digit Austrian SV-Nummer (4 digits check-code + 6 digits birthdate DDMMYY)
  clean = clean.replace(/\s+[0-9]{4}\s*[0-9]{6}\b.*$/, '').trim();
  clean = clean.replace(/\s+[0-9]{10}\b.*$/, '').trim();

  // Clean and format Austrian country code +43
  clean = clean.replace(/^\+43\s*0?([1-9])/, '+43 $1');
  clean = clean.replace(/^0043\s*0?([1-9])/, '+43 $1');
  clean = clean.replace(/^0([67][0-9]{2})/, '+43 $1');
  if (/^\+43[0-9]{3}/.test(clean)) {
    clean = clean.replace(/^\+43([0-9]{3})/, '+43 $1 ');
  }
  return clean.replace(/\s+/g, ' ').trim();
}

// Common first name dictionary for smart gender detection in Austria
const KNOWN_BOY_NAMES = new Set([
  'adam', 'ayaz', 'mats', 'malik', 'gabriel', 'lars', 'luke', 'atai', 'enias', 'abubakar',
  'lukas', 'maximilian', 'tobias', 'felix', 'jakob', 'leo', 'paul', 'david', 'elias', 'jonas',
  'alexander', 'florian', 'moritz', 'sebastian', 'matteo', 'noah', 'leon', 'luca', 'ben', 'niklas',
  'muhammed', 'ali', 'yusuf', 'emir', 'hamza', 'ibrahim', 'omer', 'ömer', 'ahmed', 'ahmet',
  'milan', 'stefan', 'marko', 'luka', 'filip', 'samuel', 'valentin', 'moritz', 'tim', 'julian',
  'nathan', 'moris', 'mateo', 'leonhard', 'raphael', 'simon', 'fabian', 'theo', 'anton'
]);

const KNOWN_GIRL_NAMES = new Set([
  'merjem', 'lorena', 'clara', 'mahdia', 'aria', 'elona', 'malou',
  'sophie', 'elena', 'sarah', 'mia', 'anna', 'emma', 'emilia', 'marie', 'laura', 'lena',
  'hannah', 'valentina', 'leonie', 'lara', 'julia', 'luisa', 'lea', 'amalia', 'charlotte',
  'fatima', 'zeynep', 'elif', 'ayse', 'ayşe', 'meryem', 'amina', 'medina', 'azra',
  'ana', 'marija', 'milica', 'jelena', 'nora', 'pia', 'zoe', 'ella', 'lina', 'alisa', 'melina',
  'miriam', 'maja', 'theresa', 'ida', 'helena', 'rosalie', 'flora', 'mara', 'paula'
]);

/**
 * Strips phone numbers, dates, SVNR, religions, countries, and addresses from a student name string
 * to guarantee that phone numbers or labels (Vater:, Mutter:) never contaminate the student's name.
 */
export function cleanStudentNameString(raw: string): string {
  if (!raw) return '';
  let s = raw;
  // Strip row index at start if present
  s = s.replace(/^\s*[0-9]{1,2}[\.\)\s\t]+/, ' ');
  // Strip phone prefix and numbers (Mutter: +43..., Vater: 0660..., etc.)
  s = s.replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Vater|Papa|Obsorge|Obs|Eltern)|(?:Mutter|Vater)\s*Tel)[:\s]*[+0-9\s/()\-]+/gi, ' ');
  s = s.replace(/(?:\+43|0043|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g, ' ');
  // Strip Religion
  s = s.replace(/(?<!\p{L})(?:röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\([^\)]+\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)(?!\p{L})/gui, ' ');
  s = s.replace(/\([^\)]+\)/g, ' ');
  // Strip Country
  s = s.replace(/(?<!\p{L})(?:AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|KOS|GBR|SOM|CZE|RUS|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland)(?!\p{L})/gui, ' ');
  // Strip birthdate and SVNR
  s = s.replace(/\b(?:0[1-9]|[12][0-9]|3[01])\.(?:0[1-9]|1[0-2])\.(?:19|20)[0-9]{2}\b/g, ' ');
  s = s.replace(/\b[0-9]{10}\b/g, ' ');
  // Strip addresses
  s = s.replace(/\b[A-ZÄÖÜ][a-zäöüß0-9\.\-]+?(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|rain|ried|dorf|anger|siedlung|hof)\s+[0-9]+[a-zA-Z]?(?:\s*(?:Top|Tür|Stiege|Stg\.?)\s*[0-9]+[a-zA-Z]*)?\b/gi, ' ');
  s = s.replace(/\b[1-9][0-9]{3}\s+[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-\/]+/g, ' ');
  // Strip standalone BJ digits (1-4)
  s = s.replace(/\b[1-4]\b/g, ' ');
  return s.trim().replace(/\s+/g, ' ');
}

/**
 * Splits a clean Sokrates name into Nachname and Vorname.
 * Follows Austrian Sokrates format (Nachname Vorname), supporting:
 * - Single surname + single given name: "Arnautović Merjem" -> Nachname: "Arnautović", Vorname: "Merjem"
 * - Surname + given name + initial: "Büchle Mats E." -> Nachname: "Büchle", Vorname: "Mats E."
 * - Double surname + given name: "Lodi Slattery Clara" -> Nachname: "Lodi Slattery", Vorname: "Clara"
 * - Comma separated: "Arnautović, Merjem" -> Nachname: "Arnautović", Vorname: "Merjem"
 */
export function splitSokratesName(cleanNameStr: string): { nachname: string; vorname: string } {
  if (!cleanNameStr) return { nachname: '', vorname: '' };
  if (cleanNameStr.includes(',')) {
    const parts = cleanNameStr.split(',').map(s => s.trim());
    return {
      nachname: parts[0].replace(/^[,\.\:\;\-]+|[,\.\:\;\-]+$/g, '').trim(),
      vorname: parts.slice(1).join(' ').replace(/^[,\.\:\;\-]+|[,\.\:\;\-]+$/g, '').trim()
    };
  }
  const rawTokens = cleanNameStr.split(/\s+/).map(t => t.trim()).filter(Boolean);
  const tokens = rawTokens.map(t => {
    // If it's a single letter initial like 'E' or 'E.', normalize to 'E.'
    if (/^[A-Z]\.?$/i.test(t)) {
      return t.endsWith('.') ? t : t + '.';
    }
    return t.replace(/^[,\.\:\;\-]+|[,\.\:\;\-]+$/g, '');
  }).filter(Boolean);

  if (tokens.length === 0) return { nachname: '', vorname: '' };
  if (tokens.length === 1) return { nachname: tokens[0], vorname: '' };
  if (tokens.length === 2) return { nachname: tokens[0], vorname: tokens[1] };

  const lastLower = tokens[tokens.length - 1].replace(/\.$/, '').toLowerCase();
  const firstLower = tokens[0].toLowerCase();
  const secondLower = tokens[1].replace(/\.$/, '').toLowerCase();

  // Double surname with single given name: 'Lodi Slattery Clara'
  if ((KNOWN_GIRL_NAMES.has(lastLower) || KNOWN_BOY_NAMES.has(lastLower)) && !KNOWN_GIRL_NAMES.has(secondLower) && !KNOWN_BOY_NAMES.has(secondLower)) {
    return {
      nachname: tokens.slice(0, -1).join(' '),
      vorname: tokens[tokens.length - 1]
    };
  }

  // Standard Sokrates order: First token is Nachname, subsequent tokens are Vorname (e.g. 'Büchle Mats E.', 'Gassner Gabriel A.')
  return {
    nachname: tokens[0],
    vorname: tokens.slice(1).join(' ')
  };
}

/**
 * Extracts phone numbers from text safely
 */
export function extractPhoneNumbersFromText(fullBlockText: string): { telMutter: string; telVater: string } {
  let telMutter = '';
  let telVater = '';

  const mMatch = fullBlockText.match(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Obs(?:orge)?\s*1)|Mutter\s*Tel)[:\s]*([+0-9][0-9\s/()\-]*)/i);
  if (mMatch) {
    const rawVal = mMatch[1].split(/(?:Vater|Papa|Obs|Tel|Mail|[a-zA-ZäöüÄÖÜ]|\n)/)[0];
    const cleaned = cleanPhoneNumber(rawVal);
    const parts = cleaned.split(' ');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length === 4 && /^[1-9][0-9]{3}$/.test(lastPart)) {
      telMutter = parts.slice(0, -1).join(' ');
    } else if (cleaned.length >= 7) {
      telMutter = cleaned;
    }
  }

  const vMatch = fullBlockText.match(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Vater|Papa|Obs(?:orge)?\s*2)|Vater\s*Tel)[:\s]*([+0-9][0-9\s/()\-]*)/i);
  if (vMatch) {
    const rawVal = vMatch[1].split(/(?:Mutter|Mama|Obs|Tel|Mail|[a-zA-ZäöüÄÖÜ]|\n)/)[0];
    const cleaned = cleanPhoneNumber(rawVal);
    const parts = cleaned.split(' ');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart.length === 4 && /^[1-9][0-9]{3}$/.test(lastPart)) {
      telVater = parts.slice(0, -1).join(' ');
    } else if (cleaned.length >= 7) {
      telVater = cleaned;
    }
  }

  // Fallback: If unlabelled phone numbers exist
  if (!telMutter && !telVater) {
    const allPhones = fullBlockText.match(/(?:\+43|0043|06[56789][0-9]|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g);
    if (allPhones && allPhones.length > 0) {
      telMutter = cleanPhoneNumber(allPhones[0]);
      if (allPhones.length > 1) {
        telVater = cleanPhoneNumber(allPhones[1]);
      }
    }
  }

  return { telMutter, telVater };
}

export interface ExtractedContactAndAddress {
  anschrift: string;
  plz: string;
  ort: string;
  telefon_mutter: string;
  telefon_vater: string;
}

/**
 * Universal extractor for Address, PLZ, Ort, Tel Mutter, and Tel Vater.
 * Works seamlessly on multi-line text or PDF text coordinates.
 */
export function extractContactAndAddress(
  rawInput: string | string[] | Array<{ text: string; x?: number; y?: number }>,
  options?: { defaultOrt?: string; defaultPlz?: string }
): ExtractedContactAndAddress {
  let lines: string[] = [];

  if (Array.isArray(rawInput)) {
    if (rawInput.length > 0 && typeof rawInput[0] === 'object' && 'text' in rawInput[0]) {
      // PDF items with coordinates
      const items = [...(rawInput as Array<{ text: string; x?: number; y?: number }>)];
      items.sort((a, b) => (b.y ?? 0) - (a.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
      
      const lineMap = new Map<number, string[]>();
      items.forEach(it => {
        const yKey = Math.round((it.y ?? 0) / 4) * 4;
        if (!lineMap.has(yKey)) lineMap.set(yKey, []);
        lineMap.get(yKey)!.push(it.text);
      });
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);
      lines = sortedYs.map(y => lineMap.get(y)!.join(' '));
    } else {
      lines = rawInput as string[];
    }
  } else {
    lines = rawInput.split('\n');
  }

  // 1. Filter out known table header words from lines
  lines = lines
    .map(l => l.replace(/\b(?:Adressdaten|Adresse|Wohnadresse|Wohnort|Telefon|Tel\.?|Telefonnummer|Erziehungsberechtigte|Notfallkontakt|Kontaktdaten)\b[:\s]*/gi, ' ').trim())
    .filter(l => l.length > 0);

  const fullText = lines.join(' ');

  // 2. Extract Phones
  const { telMutter: telefon_mutter, telVater: telefon_vater } = extractPhoneNumbersFromText(fullText);

  // 3. Remove matched phones and labels from text
  let textWithoutPhones = fullText;
  if (telefon_mutter) {
    const digitsOnlyM = telefon_mutter.replace(/\D/g, '');
    if (digitsOnlyM.length >= 6) {
      textWithoutPhones = textWithoutPhones.replace(new RegExp(digitsOnlyM.slice(-7), 'g'), '');
    }
  }
  if (telefon_vater) {
    const digitsOnlyV = telefon_vater.replace(/\D/g, '');
    if (digitsOnlyV.length >= 6) {
      textWithoutPhones = textWithoutPhones.replace(new RegExp(digitsOnlyV.slice(-7), 'g'), '');
    }
  }
  textWithoutPhones = textWithoutPhones
    .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Obs(?:orge)?\s*1)|Mutter\s*Tel)[:\s]*/gi, ' ')
    .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Vater|Papa|Obs(?:orge)?\s*2)|Vater\s*Tel)[:\s]*/gi, ' ')
    .replace(/(?:\+43|0043|06[56789][0-9]|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // 4. PLZ
  let plz = '';
  const plzMatch = textWithoutPhones.match(/\b([1-9][0-9]{3})\b/);
  if (plzMatch) {
    const cand = plzMatch[1];
    const num = parseInt(cand, 10);
    // Exclude standard year range 1980-2035 unless it is a Vorarlberg PLZ like 6800 or 6900
    if (num < 1980 || num > 2035 || cand.startsWith('6') || cand.startsWith('1')) {
      plz = cand;
    }
  }
  if (!plz && options?.defaultPlz) {
    plz = options.defaultPlz;
  }

  // 5. Ort
  let ort = '';
  if (plz) {
    const ortMatch = textWithoutPhones.match(new RegExp(`\\b${plz}\\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\\s\\-\\/]+?)(?=\\s+(?:Top|Tür|Mutter|Vater|Tel|\\+|06|$|,|;))`));
    if (ortMatch) {
      const candOrt = ortMatch[1].trim().replace(/[\,\;]+$/, '');
      if (!/(?:straße|strasse|str\.|weg|gasse|platz|allee|siedlung|hof|dorf|anger|rain|ried)/i.test(candOrt) &&
          !/^(?:Mutter|Vater|Mama|Papa|Tel|Mut)$/i.test(candOrt)) {
        ort = candOrt;
      }
    }
  }

  if (!ort) {
    if (options?.defaultOrt) {
      ort = options.defaultOrt;
    } else if (plz === '6800') {
      ort = 'Feldkirch';
    } else if (plz === '6900') {
      ort = 'Bregenz';
    } else if (plz === '6850') {
      ort = 'Dornbirn';
    } else if (plz === '6890') {
      ort = 'Lustenau';
    } else if (plz === '6840') {
      ort = 'Götzis';
    } else if (plz === '6830') {
      ort = 'Rankweil';
    } else if (plz === '6700') {
      ort = 'Bludenz';
    }
  }

  // 6. Anschrift (Wohnadresse)
  let anschrift = '';
  // Clean text from noise like religion, countries, dates, SVNR before matching street
  const cleanAddrText = textWithoutPhones
    .replace(/\b(?:röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\(IGGÖ\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)\b/gi, ' ')
    .replace(/\b(?:AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|KOS|GBR|SOM|CZE|RUS|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland|sterreich)\b/gi, ' ')
    .replace(/\b(?:0[1-9]|[12][0-9]|3[01])\.(?:0[1-9]|1[0-2])\.(?:19[89][0-9]|20[0-2][0-9])\b/g, ' ')
    .replace(/\b[0-9]{4}\s*[0-9]{6}\b/g, ' ')
    .replace(/\b[0-9]{10}\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const streetRegex = /\b(?:(?:Am|Im|In der|Auf der|Beim|Zum)\s+)?([A-ZÄÖÜ][a-zäöüß0-9\.\-]+?(?:straße|strasse|str\.|weg|gasse|platz|allee|ring|rain|ried|dorf|anger|siedlung|hof|feld|steig|promenade|berg|graben|tal)\s+[0-9]+[a-zA-Z]?(?:\s*(?:Top|Tür|Stiege|Stg\.?)\s*[0-9]+[a-zA-Z]*)?)\b/i;
  const streetMatch = cleanAddrText.match(streetRegex);
  if (streetMatch) {
    anschrift = streetMatch[0].trim();
  } else {
    // Check candidate lines
    for (const l of lines) {
      const cl = l
        .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Mutter|Mama|Obs(?:orge)?\s*1)|Mutter\s*Tel)[:\s]*[+0-9\s/()\-]+/gi, '')
        .replace(/(?:(?:Tel(?:\.|efon)?\.?\s*)?(?:Vater|Papa|Obs(?:orge)?\s*2)|Vater\s*Tel)[:\s]*[+0-9\s/()\-]+/gi, '')
        .replace(/(?:\+43|0043|06[56789][0-9]|0[1-9][0-9]{1,3})[\s/()\-0-9]{5,18}/g, '')
        .replace(new RegExp(`\\b${plz}\\b.*`, 'i'), '')
        .replace(new RegExp(`\\b${ort}\\b.*`, 'i'), '')
        .trim();
      if (cl.length >= 3 && /[0-9]/.test(cl)) {
        anschrift = cl;
        break;
      }
    }
  }

  // Sanitize anschrift
  if (/^Adressdaten$/i.test(anschrift)) anschrift = '';
  if (/^(?:Mutter|Vater|Tel|\+43|06)/i.test(anschrift)) anschrift = '';

  return { anschrift, plz, ort, telefon_mutter, telefon_vater };
}

/**
 * Ensures student contact fields are properly mapped:
 * - anschrift: Street + house number
 * - plz: Postal code (e.g. 6800)
 * - ort: Town / City (e.g. Feldkirch)
 * - telefon_mutter: Mother phone number
 * - telefon_vater: Father phone number
 */
export function sanitizeStudentContact<T extends {
  anschrift?: string;
  plz?: string;
  ort?: string;
  telefon_mutter?: string;
  telefon_vater?: string;
}>(student: T, defaultOrt?: string): T {
  let anschrift = (student.anschrift || '').trim();
  let plz = (student.plz || '').trim();
  let ort = (student.ort || '').trim();
  let telefon_mutter = (student.telefon_mutter || '').trim();
  let telefon_vater = (student.telefon_vater || '').trim();

  // 1. Remove header leaks
  anschrift = anschrift.replace(/^Adressdaten\s*/i, '').trim();
  if (/^Adressdaten$/i.test(anschrift)) anschrift = '';

  // 2. If anschrift contains Mutter/Vater phone number:
  if (/^(?:Mutter|Mama|Tel\.?\s*Mutter|\+43|06[0-9])/i.test(anschrift)) {
    if (!telefon_mutter) {
      telefon_mutter = cleanPhoneNumber(anschrift);
    }
    anschrift = '';
  }

  // 3. If ort contains a street address (e.g. "Torkelgasse 18 Top 3")
  if (/(?:straße|strasse|str\.|weg|gasse|platz|allee|siedlung|hof|dorf|anger|rain|ried)\b/i.test(ort) && /[0-9]/.test(ort)) {
    if (!anschrift) {
      anschrift = ort;
      ort = defaultOrt || (plz === '6800' ? 'Feldkirch' : (plz === '6900' ? 'Bregenz' : ''));
    }
  }

  // 4. If ort is broken like "Mut" or "Tel"
  if (/^(?:Mut|Tel|Mutter|Vater)$/i.test(ort)) {
    ort = defaultOrt || (plz === '6800' ? 'Feldkirch' : (plz === '6900' ? 'Bregenz' : ''));
  }

  // 5. If PLZ is 6800 and Ort is empty
  if (plz === '6800' && !ort) {
    ort = 'Feldkirch';
  } else if (plz === '6900' && !ort) {
    ort = 'Bregenz';
  }

  return {
    ...student,
    anschrift,
    plz,
    ort,
    telefon_mutter,
    telefon_vater
  };
}

let cachedPdfjsLib: typeof import('pdfjs-dist') | null = null;
async function getPdfjsLib() {
  if (!cachedPdfjsLib) {
    cachedPdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      cachedPdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
  }
  return cachedPdfjsLib;
}

/**
 * Geometric 2D Table Parser for Austrian Sokrates PDF Class Lists.
 * Uses exact horizontal row bounding bands and column intervals.
 * Guarantees that:
 * 1. Line 1 items belong strictly to child 1, Line 2 items to child 2.
 * 2. Phone numbers in the right column never bleed into the student's name in the left column.
 * 3. Religion and Staat are accurately extracted.
 * 4. Language (Erstsprache) is not defined in Sokrates lists and therefore left empty.
 */
export async function parseSokratesPDF(arrayBuffer: ArrayBuffer): Promise<ParsedSokratesResult> {
  try {
    const pdfjsLib = await getPdfjsLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });
    const pdfDoc = await loadingTask.promise;

    const allStudents: ParsedSokratesStudent[] = [];
    let detectedKlasse = '';
    let detectedSchuljahr = '';
    let detectedLehrerName = '';
    let detectedSchulName = '';
    let detectedSchulkennzahl = '';
    let detectedSchulOrt = '';
    let detectedSchulPlz = '';
    const warnings: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = (textContent.items as Array<{ str: string; transform: number[]; width?: number; height?: number }>)
        .filter(it => it.str && it.str.trim())
        .map(it => ({
          text: it.str.trim(),
          x: it.transform[4],
          y: it.transform[5],
          width: it.width || 0,
          height: it.height || 0
        }));

      if (items.length === 0) continue;

      // 1. Scan metadata from top of page
      items.forEach(it => {
        const text = it.text;
        // Klasse (e.g. "Klasse 2b" or "Klasse: 2b")
        const klMatch = text.match(/\bKlasse[:\s]+([0-9]+[a-zA-Z]?|[a-zA-Z0-9_\-]+)\b/i) || text.match(/\b([1-4][a-zA-Z])\b/);
        if (klMatch && !detectedKlasse) detectedKlasse = klMatch[1].trim();

        // Schuljahr (e.g. "Schuljahr: 2026/27")
        const sjMatch = text.match(/\bSchuljahr[:\s]+([0-9]{4}\s*[\/\-]\s*[0-9]{2,4})/i) || text.match(/\b(20[2-3][0-9]\s*[\/\-]\s*(?:20)?[2-3][0-9])\b/);
        if (sjMatch && !detectedSchuljahr) detectedSchuljahr = sjMatch[1].replace(/\s+/g, '').replace('-', '/');

        // Teacher
        const kvMatch = text.match(/\b(?:Klassenlehrer(?:in)?|Klassenlehrkraft|Klassenlehrperson|Klassenleitung|Klassenvorstand|KV|Lehrperson|Lehrer(?:in)?)[:\s]+([^,;\n]+)/i);
        if (kvMatch && !detectedLehrerName) {
          detectedLehrerName = kvMatch[1].replace(/\s+Schuljahr.*$/i, '').trim();
        }

        // School Name
        if (/^(?:Volksschule|VS|Mittelschule|MS|AHS|Gymnasium|Sonderschule|ASO)\b/i.test(text) && !detectedSchulName) {
          detectedSchulName = text;
        }

        // SKZ
        const skzMatch = text.match(/\b(?:SKZ|Schulkennzahl)[:\s]+([0-9]{6})\b/i);
        if (skzMatch && !detectedSchulkennzahl) detectedSchulkennzahl = skzMatch[1];

        // School Address / PLZ / City
        const addrMatch = text.match(/\b([1-9][0-9]{3})\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-]+?)(?:,|$)/);
        if (addrMatch && !detectedSchulPlz) {
          detectedSchulPlz = addrMatch[1].trim();
          detectedSchulOrt = addrMatch[2].trim();
        }
      });

      // 2. Find table header items
      const headerItems = items.filter(it =>
        /^(?:Nr\.?|Name|BJ|Geb\.?Datum|Geburtstag|SVNR|Religion|Staat|Adressdaten|Adresse|Telefon|Tel\.?)$/i.test(it.text.trim())
      );

      let tableHeaderY = 0;
      let minHeaderY = 0;
      if (headerItems.length >= 2) {
        tableHeaderY = Math.max(...headerItems.map(h => h.y));
        minHeaderY = Math.min(...headerItems.map(h => h.y));
      }

      // Determine column X bounds based on header positions or defaults
      let colNrMax = 65;
      let colNameMax = 195;
      let colBJMax = 225;
      let colGebMax = 295;
      let colRelMax = 375;
      let colAddrMax = 525;

      const nameHeader = headerItems.find(h => /^Name$/i.test(h.text.trim()));
      const bjHeader = headerItems.find(h => /^BJ$/i.test(h.text.trim()));
      const gebHeader = headerItems.find(h => /^Geb/i.test(h.text.trim()));
      const relHeader = headerItems.find(h => /^Religion$/i.test(h.text.trim()));
      const addrHeader = headerItems.find(h => /^Adress/i.test(h.text.trim()));
      const telHeader = headerItems.find(h => /^Telefon|^Tel/i.test(h.text.trim()));

      if (nameHeader) colNrMax = nameHeader.x - 4;
      if (bjHeader) colNameMax = bjHeader.x - 4;
      if (gebHeader) colBJMax = gebHeader.x - 4;
      if (relHeader) colGebMax = relHeader.x - 4;
      if (addrHeader) colRelMax = addrHeader.x - 4;
      if (telHeader) colAddrMax = telHeader.x - 4;

      // 3. Find sequential row numbers in column 1 (x <= colNrMax, below table header)
      const rowNumberItems = items
        .filter(it => it.x <= colNrMax + 8 && (tableHeaderY === 0 || it.y < tableHeaderY - 6) && it.y > 45)
        .filter(it => /^[1-9][0-9]?$/.test(it.text.trim()))
        .map(it => ({ nr: parseInt(it.text.trim(), 10), y: it.y, x: it.x }));

      rowNumberItems.sort((a, b) => a.nr - b.nr);

      // Keep unique by nr
      const uniqueRows: Array<{ nr: number; y: number }> = [];
      const seenNrs = new Set<number>();
      rowNumberItems.forEach(r => {
        if (!seenNrs.has(r.nr)) {
          seenNrs.add(r.nr);
          uniqueRows.push(r);
        }
      });

      const isSequential = uniqueRows.length >= 2 && uniqueRows[0].nr === 1;

      if (isSequential) {
        // Calculate non-overlapping contiguous row bands (Y intervals)
        const rowBands: Array<{ nr: number; topY: number; bottomY: number }> = [];

        for (let i = 0; i < uniqueRows.length; i++) {
          const curr = uniqueRows[i];
          let topY: number;
          let bottomY: number;

          if (i === 0) {
            topY = minHeaderY > 0 ? Math.min(minHeaderY - 2, curr.y + 18) : (tableHeaderY > 0 ? tableHeaderY - 2 : curr.y + 20);
          } else {
            topY = (uniqueRows[i - 1].y + curr.y) / 2;
          }

          if (i === uniqueRows.length - 1) {
            const prevDiff = i > 0 ? (uniqueRows[i - 1].y - curr.y) : 25;
            bottomY = Math.max(35, curr.y - prevDiff / 2);
          } else {
            bottomY = (curr.y + uniqueRows[i + 1].y) / 2;
          }

          rowBands.push({ nr: curr.nr, topY, bottomY });
        }

        const isHeaderWord = (text: string) => /^(?:Nr\.?|Name|Familienname|Vorname|BJ|Besuchsjahr|Geb\.?Datum|Geburtstag|SVNR|Religion|Bekenntnis|Staat|StB|Adressdaten|Adresse|Wohnadresse|Wohnort|Anschrift|PLZ|Ort|Telefon|Tel\.?|Handy|Telefonnummer|Erziehungsberechtigte|Notfallkontakt|Kontaktdaten)$/i.test(text.trim());

        // Assign every text item in this band strictly to this child
        rowBands.forEach(band => {
          const rowItems = items.filter(it => it.y >= band.bottomY && it.y < band.topY && it.x > colNrMax - 10 && !isHeaderWord(it.text));

          // Partition items into column buckets
          const nameItems = rowItems.filter(it => it.x >= colNrMax && it.x < colNameMax);
          const bjItems = rowItems.filter(it => it.x >= colNameMax && it.x < colBJMax);
          const gebItems = rowItems.filter(it => it.x >= colBJMax && it.x < colGebMax);
          const relItems = rowItems.filter(it => it.x >= colGebMax && it.x < colRelMax);

          // 1. Name: Sort top-to-bottom, left-to-right
          nameItems.sort((a, b) => b.y - a.y || a.x - b.x);
          let rawName = nameItems.map(i => i.text).join(' ');
          rawName = cleanStudentNameString(rawName);
          const { nachname, vorname } = splitSokratesName(rawName);

          // 2. Besuchsjahr (BJ)
          bjItems.sort((a, b) => b.y - a.y || a.x - b.x);
          const bjStr = bjItems.map(i => i.text).join(' ');
          const bjMatch = bjStr.match(/\b([1-4]|V)\b/);
          const besuchsjahr = bjMatch ? bjMatch[1] : (detectedKlasse && /^[1-4]/.test(detectedKlasse) ? detectedKlasse.charAt(0) : '1');

          // 3. Geb.Datum & SVNR
          gebItems.sort((a, b) => b.y - a.y || a.x - b.x);
          const gebStr = gebItems.map(i => i.text).join(' ');
          const birthMatch = gebStr.match(/\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19[89][0-9]|20[0-2][0-9])\b/);
          const geburtstag = birthMatch ? normalizeDate(birthMatch[0]) : '';
          const svMatch = gebStr.match(/\b([0-9]{10})\b/) || gebStr.match(/\b([0-9]{4})\b/);
          const sv_nummer = svMatch ? svMatch[1] : '';

          // 4. Religion & Staat
          relItems.sort((a, b) => b.y - a.y || a.x - b.x);
          const relStr = relItems.map(i => i.text).join(' ');
          const relMatch = relStr.match(/(?<!\p{L})(röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\(IGGÖ\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)(?!\p{L})/ui);
          const religion = relMatch ? normalizeReligion(relMatch[1]) : '';
          const stMatch = relStr.match(/(?<!\p{L})(AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|KOS|GBR|SOM|CZE|RUS|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland)(?!\p{L})/ui);
          const staatsbuergerschaft = stMatch ? normalizeCountry(stMatch[1]) : 'Österreich';
          const erstsprache = '';

          // 5. Adressdaten & Telefon (Universal extractor across all contact items in row)
          const contactAndAddrItems = rowItems.filter(it => it.x >= colRelMax);
          const contactInfo = extractContactAndAddress(contactAndAddrItems, {
            defaultOrt: detectedSchulOrt,
            defaultPlz: detectedSchulPlz || '6800'
          });

          const anschrift = contactInfo.anschrift;
          const plz = contactInfo.plz;
          const ort = contactInfo.ort;
          const telMutter = contactInfo.telefon_mutter;
          const telVater = contactInfo.telefon_vater;

          // 7. Geschlecht
          const firstWord = vorname.split(/\s+/)[0].replace(/[^a-zA-ZäöüÄÖÜ]/g, '').toLowerCase();
          let geschlecht = 'w';
          if (KNOWN_BOY_NAMES.has(firstWord)) {
            geschlecht = 'm';
          } else if (KNOWN_GIRL_NAMES.has(firstWord)) {
            geschlecht = 'w';
          }

          if (vorname || nachname) {
            allStudents.push({
              id: crypto.randomUUID(),
              lfdNr: band.nr,
              vorname,
              nachname,
              geschlecht,
              geburtstag,
              besuchsjahr,
              sv_nummer,
              religion,
              staatsbuergerschaft,
              anschrift,
              plz,
              ort,
              telefon_mutter: telMutter,
              telefon_vater: telVater,
              email_eltern: '',
              erstsprache,
              notiz: ''
            });
          }
        });
      }
    }

    if (allStudents.length > 0) {
      return {
        students: allStudents,
        klasse: detectedKlasse,
        schuljahr: detectedSchuljahr,
        lehrerName: detectedLehrerName,
        schulName: detectedSchulName,
        schulkennzahl: detectedSchulkennzahl,
        schulOrt: detectedSchulOrt,
        schulPlz: detectedSchulPlz,
        schuelerAnzahl: allStudents.length,
        warnings,
        sourceMethod: 'pdf_local'
      };
    }

    // Fallback: Use line-based text parser
    const { rawText } = await extractTextFromPDF(arrayBuffer);
    const textResult = parseSokratesText(rawText);
    textResult.sourceMethod = 'pdf_local';
    return textResult;
  } catch (err: any) {
    if (import.meta.env?.DEV) {
      console.error('Technischer Fehler beim lokalen PDF-Extrahieren:', err?.message || err);
    }
    throw new Error('Die PDF-Datei konnte nicht gelesen werden. Bitte versuche es erneut oder verwende alternativ den CSV-/Excel-Import.');
  }
}

/**
 * Parses PDF text items by grouping lines based on Y-coordinates
 */
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ rawText: string; lines: string[] }> {
  try {
    const pdfjsLib = await getPdfjsLib();

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true
    });

    const pdfDoc = await loadingTask.promise;
    const allLines: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group items by Y coordinate (within tolerance 3px)
      const items = textContent.items as Array<{ str: string; transform: number[] }>;
      const lineMap = new Map<number, Array<{ x: number; text: string }>>();

      items.forEach(item => {
        if (!item.str || !item.str.trim()) return;
        const x = item.transform[4];
        const y = Math.round(item.transform[5] / 3) * 3; // quantize Y coordinate
        if (!lineMap.has(y)) {
          lineMap.set(y, []);
        }
        lineMap.get(y)!.push({ x, text: item.str });
      });

      // Sort Y descending (top to bottom)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      sortedYs.forEach(y => {
        const lineItems = lineMap.get(y)!;
        // Sort X ascending (left to right)
        lineItems.sort((a, b) => a.x - b.x);
        const lineStr = lineItems.map(i => i.text.trim()).filter(Boolean).join(' ');
        if (lineStr.trim()) {
          allLines.push(lineStr.trim());
        }
      });
    }

    return {
      rawText: allLines.join('\n'),
      lines: allLines
    };
  } catch (err: any) {
    if (import.meta.env?.DEV) {
      console.error('Technischer Fehler beim lokalen PDF-Extrahieren:', err?.message || err);
    }
    throw new Error('Die PDF-Datei konnte nicht gelesen werden. Bitte versuche es erneut oder verwende alternativ den CSV-/Excel-Import.');
  }
}

/**
 * Intelligent Sokrates Rule-Based Parser (for client-side or fallback parsing)
 */
export function parseSokratesText(rawText: string): ParsedSokratesResult {
  const warnings: string[] = [];
  const students: ParsedSokratesStudent[] = [];

  const cleanText = rawText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { students: [], warnings: ['Der Inhalt ist leer.'], sourceMethod: 'text_local' };
  }

  const lines = cleanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let klasse = '';
  let schuljahr = '';
  let lehrerName = '';
  let schulName = '';
  let schulkennzahl = '';
  let schulOrt = '';
  let schulPlz = '';

  // 1. Scan header metadata
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];

    // Klasse (e.g. "Klasse 2b", "Klasse: 2b", or standalone "2b")
    const klMatch = line.match(/\bKlasse[:\s]+([0-9]+[a-zA-Z]?|[a-zA-Z0-9_\-]+)\b/i) ||
                    line.match(/\b([1-4][a-zA-Z])\b/);
    if (klMatch && !klasse) klasse = klMatch[1].trim();

    // Schuljahr (e.g. "Schuljahr: 2026/27")
    const sjMatch = line.match(/\bSchuljahr[:\s]+([0-9]{4}\s*[\/\-]\s*[0-9]{2,4})/i) ||
                    line.match(/\b(20[2-3][0-9]\s*[\/\-]\s*(?:20)?[2-3][0-9])\b/);
    if (sjMatch && !schuljahr) schuljahr = sjMatch[1].replace(/\s+/g, '').replace('-', '/');

    // SKZ
    const skzMatch = line.match(/\b(?:SKZ|Schulkennzahl)[:\s]+([0-9]{6})\b/i);
    if (skzMatch && !schulkennzahl) schulkennzahl = skzMatch[1];

    // Schulname (e.g. "Volksschule Gisingen-Oberau", or "Schule: VS ...")
    if (/^(?:Volksschule|VS|Mittelschule|MS|AHS|Gymnasium|Sonderschule|ASO)\b/i.test(line) && !schulName) {
      schulName = line.trim();
    } else {
      const schuleMatch = line.match(/\b(?:Schule|Schulname)[:\s]+([^,;\n]+)/i);
      if (schuleMatch && !schulName) schulName = schuleMatch[1].trim();
    }

    // Lehrer / KV (e.g. "Klassenlehrerin: Martina Bitschnau, BEd Schuljahr: 2026/27")
    const kvMatch = line.match(/\b(?:Klassenlehrer(?:in)?|Klassenlehrkraft|Klassenlehrperson|Klassenleitung|Klassenvorstand|KV|Lehrperson|Lehrer(?:in)?)[:\s]+([^,;\n]+)/i);
    if (kvMatch && !lehrerName) {
      let lName = kvMatch[1].trim();
      // Remove trailing Schuljahr if on same line
      lName = lName.replace(/\s+Schuljahr.*$/i, '').trim();
      lehrerName = lName;
    }

    // School Address / PLZ / City from header
    const schoolAddrMatch = line.match(/\b([1-9][0-9]{3})\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-]+?)(?:,|$)/);
    if (schoolAddrMatch && !schulPlz) {
      schulPlz = schoolAddrMatch[1].trim();
      schulOrt = schoolAddrMatch[2].trim();
    }
  }

  // 2. Multi-line record splitting for Austrian Sokrates Lists
  const studentBlocks: string[][] = [];
  let currentBlock: string[] = [];

  // Detect if lines start with sequence number followed by an uppercase letter (Unicode supported, e.g. "1 Arnautović", "12 Čotkarajev")
  const startsWithIndex = (line: string) => /^\s*([0-9]{1,2})[\.\)\s\t]+[\p{Lu}]/u.test(line);

  lines.forEach(line => {
    // Filter out obvious header/footer lines and summary lines
    if (/^(?:Klassenliste|Schülerverzeichnis|Schule:|Schuljahr:|Seite\s+[0-9]|Druckdatum|Lfd\.?\s*Nr|Volksschule|Mittelschule|\+43|Nr\.\s+Name)/i.test(line)) {
      return;
    }
    // Filter out summary count lines like "17 SchülerInnen, 10m/7w"
    if (/^[0-9]{1,2}\s+(?:Schüler|Schueler|Kinder|SchülerInnen|Schüler\/innen)/i.test(line)) {
      return;
    }

    if (startsWithIndex(line)) {
      if (currentBlock.length > 0) {
        studentBlocks.push(currentBlock);
      }
      currentBlock = [line];
    } else {
      if (currentBlock.length > 0) {
        currentBlock.push(line);
      }
    }
  });
  if (currentBlock.length > 0) {
    studentBlocks.push(currentBlock);
  }

  // Fallback: If no indexed blocks were detected, check CSV / tabular lines
  if (studentBlocks.length === 0) {
    lines.forEach(line => {
      if (/^(?:Klassenliste|Schülerverzeichnis|Schule|Schuljahr|Lfd|Familienname|Nachname)/i.test(line)) return;
      if (line.includes(';') || line.includes('\t') || line.includes(',')) {
        studentBlocks.push([line]);
      }
    });
  }

  // 3. Parse each student block
  studentBlocks.forEach((block, blockIdx) => {
    const fullBlockText = block.join(' ');
    
    // Extract Index
    let lfdNr = blockIdx + 1;
    const idxMatch = block[0].match(/^\s*([0-9]{1,2})[\.\)\s\t]+/);
    if (idxMatch) {
      lfdNr = parseInt(idxMatch[1], 10);
    }

    let vorname = '';
    let nachname = '';
    let geburtstag = '';
    let besuchsjahr = '1';
    let sv_nummer = '';
    let religion = '';
    let staatsbuergerschaft = 'Österreich';
    let anschrift = '';
    let plz = '';
    let ort = '';
    let telefon_mutter = '';
    let telefon_vater = '';
    let email_eltern = '';
    let erstsprache = '';
    let geschlecht = 'w';
    let notiz = '';

    // Birthdate (DD.MM.YYYY)
    const birthMatch = fullBlockText.match(/\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19[89][0-9]|20[0-2][0-9])\b/);
    if (birthMatch) {
      geburtstag = normalizeDate(birthMatch[0]);
    }

    // Besuchsjahr (BJ) -> In Sokrates lists, BJ (1-4 or V) often appears right before the birthdate
    const bjMatch = fullBlockText.match(/\b([1-4]|V)\s+(?:0[1-9]|[12][0-9]|3[01])\.(?:0[1-9]|1[0-2])\.(?:19|20)[0-9]{2}\b/) ||
                    fullBlockText.match(/\b(?:BJ|Besuchsjahr)[:\s\.]*([0-9IV]+)\b/i) ||
                    fullBlockText.match(/\bBJ\s*([1-9])\b/i);
    if (bjMatch) {
      besuchsjahr = bjMatch[1].trim();
    } else {
      // If klasse is e.g. "2a" or "2b", default besuchsjahr to class level if not found
      if (klasse && /^[1-4]/.test(klasse)) {
        besuchsjahr = klasse.charAt(0);
      }
    }

    // SVNR (Austrian 10 digits or 4 digits like "4042 111217" or 10-digit number)
    const svMatch = fullBlockText.match(/\b(?:SVNR|SV-Nr\.?|SV)[:\s]*([0-9]{4}(?:\s*[0-9]{6})?)\b/i) ||
                    fullBlockText.match(/\b([0-9]{4})\s+(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|1[0-2])(?:[0-9]{2})\b/) ||
                    fullBlockText.match(/\b([0-9]{4}(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|1[0-2])[0-9]{2})\b/) ||
                    fullBlockText.match(/\b([0-9]{10})\b/);
    if (svMatch) {
      sv_nummer = svMatch[1].replace(/\s+/g, '');
    }

    // Religion
    const relMatch = fullBlockText.match(/(?<!\p{L})(röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\(IGGÖ\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)(?!\p{L})/ui) ||
                     fullBlockText.match(/\b(?:Rel|Bekenntnis)[:\s]+([^,;\s]+)/i);
    if (relMatch) {
      religion = normalizeReligion(relMatch[1]);
    }

    // Staatsbürgerschaft
    const stMatch = fullBlockText.match(/\b(?:StB|Staat|Staatsbuergerschaft|Staatsbürgerschaft)[:\s]*([A-ZÄÖÜa-zäöü]+)\b/i) ||
                    fullBlockText.match(/(?<!\p{L})(AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|KOS|GBR|SOM|CZE|RUS|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland)(?!\p{L})/ui);
    if (stMatch) {
      staatsbuergerschaft = normalizeCountry(stMatch[1]);
    }

    // Extract Address, PLZ, Ort, Tel Mutter, Tel Vater with universal extractor
    const contactInfo = extractContactAndAddress(block, {
      defaultOrt: schulOrt,
      defaultPlz: schulPlz || '6800'
    });
    anschrift = contactInfo.anschrift;
    plz = contactInfo.plz;
    ort = contactInfo.ort;
    telefon_mutter = contactInfo.telefon_mutter;
    telefon_vater = contactInfo.telefon_vater;

    // Email
    const emailMatch = fullBlockText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      email_eltern = emailMatch[0].trim();
    }

    // Names Extraction from line 1:
    // Strip leading index, then clean out phone numbers, dates, SVNR, religion, addresses
    const firstLineWithoutIndex = block[0].replace(/^\s*[0-9]{1,2}[\.\)\s\t]+/, '').trim();
    const cleanedNameStr = cleanStudentNameString(firstLineWithoutIndex);
    const { nachname: parsedNachname, vorname: parsedVorname } = splitSokratesName(cleanedNameStr);
    nachname = parsedNachname;
    vorname = parsedVorname;

    // Geschlecht detection based on Vorname or explicit label
    const firstWordVorname = vorname.split(/\s+/)[0].toLowerCase();
    if (KNOWN_BOY_NAMES.has(firstWordVorname)) {
      geschlecht = 'm';
    } else if (KNOWN_GIRL_NAMES.has(firstWordVorname)) {
      geschlecht = 'w';
    } else if (/\b(?:m|m\u00e4nnlich|knabe|bube)\b/i.test(fullBlockText)) {
      geschlecht = 'm';
    } else if (/\b(?:w|weiblich|m\u00e4dchen)\b/i.test(fullBlockText)) {
      geschlecht = 'w';
    } else {
      geschlecht = 'w'; // default
    }

    if (vorname || nachname) {
      students.push({
        id: crypto.randomUUID(),
        lfdNr,
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        geschlecht,
        geburtstag,
        besuchsjahr: besuchsjahr || '1',
        sv_nummer,
        religion,
        staatsbuergerschaft,
        anschrift,
        plz,
        ort,
        telefon_mutter,
        telefon_vater,
        email_eltern,
        erstsprache,
        notiz
      });
    }
  });

  return {
    students,
    klasse,
    schuljahr,
    lehrerName,
    schulName,
    schulkennzahl,
    schulOrt,
    schulPlz,
    schuelerAnzahl: students.length,
    warnings,
    sourceMethod: 'text_local'
  };
}

/**
 * Client-Side Sokrates PDF Parsing (Zero-Knowledge)
 * Highly sensitive official student data (SVNR, addresses, religion, contacts)
 * is parsed 100% locally in the browser and NEVER sent to external servers or AI endpoints.
 */
export async function parseSokratesPDFWithAI(file: File): Promise<ParsedSokratesResult> {
  const arrayBuffer = await file.arrayBuffer();
  return await parseSokratesPDF(arrayBuffer);
}

/**
 * Universal Master Importer: Automatically extracts text locally in the browser
 * for both PDF and CSV formats without transmitting sensitive records.
 */
export async function parseSokratesFile(file: File): Promise<ParsedSokratesResult> {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPDF) {
    // 100% Client-side local 2D table extraction: Zero-Knowledge privacy protection
    const arrayBuffer = await file.arrayBuffer();
    return await parseSokratesPDF(arrayBuffer);
  }

  // CSV / Text file parsing
  const textContent = await file.text();
  return parseSokratesText(textContent);
}

/**
 * Convert ParsedSokratesStudent list to LehrerAPP full Student model
 */
export function convertToAppStudents(parsedList: ParsedSokratesStudent[]): Student[] {
  return parsedList.map(rawStudent => {
    const s = sanitizeStudentContact(rawStudent);
    const fullName = `${s.vorname.trim()} ${s.nachname.trim()}`.trim();
    return {
      id: s.id || crypto.randomUUID(),
      vorname: s.vorname.trim(),
      nachname: s.nachname.trim(),
      name: fullName,
      niveau: 1,
      notiz: s.notiz || '',
      geburtstag: s.geburtstag || '',
      geburtsdatum: s.geburtstag || '',
      staatsbuergerschaft: s.staatsbuergerschaft || 'Österreich',
      religion: s.religion || '',
      besuchsjahr: s.besuchsjahr || '1', // Sokrates BJ -> LehrerAPP Besuchsjahr
      espf: false,
      spf: false,
      erstsprache: s.erstsprache || '',
      geschlecht: s.geschlecht || 'w',
      gruppen: [],
      anschrift: s.anschrift || '',
      plz: s.plz || '',
      ort: s.ort || '',
      telefon_mutter: s.telefon_mutter || '',
      telefon_vater: s.telefon_vater || '',
      email_eltern: s.email_eltern || '',
      sv_nummer: s.sv_nummer || '',
      stammdatenAktualisiertAm: new Date().toISOString()
    };
  });
}
