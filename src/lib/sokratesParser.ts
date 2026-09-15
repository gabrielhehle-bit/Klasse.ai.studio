import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Student } from '../types';
import { normalizeStudentGender } from './studentListData';
import { cleanSokratesPhoneNumber, cleanStudentNameString, splitSokratesName, extractContactAndAddress } from './sokratesParsingHelpers';

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
  if (lower === 'rk' || lower === 'roemischkatholisch' || lower === 'roemkath') return 'r.k.';
  if (lower === 'ev' || lower === 'evang' || lower === 'evangelisch' || lower === 'evanga' || lower === 'evangab') return 'evang.';
  if (lower === 'isl' || lower === 'islam' || lower === 'islamisch' || lower === 'alevi') return 'islam.';
  if (lower === 'ob' || lower === 'ohnebekenntnis' || lower === 'ohne') return 'o.B.';
  if (lower === 'orth' || lower === 'orthodox' || lower === 'serborth' || lower === 'rumorth') return 'orthodox';
  if (lower === 'buddh' || lower === 'buddhistisch') return 'buddh.';
  if (lower === 'jued' || lower === 'israelitisch' || lower === 'juedisch') return 'israelit.';
  return r;
}

// Normalize Country
export function normalizeCountry(cntry: string): string {
  if (!cntry) return '';
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
  return cleanSokratesPhoneNumber(phone);
}

/**
 * Parses PDF text items by grouping lines based on Y-coordinates
 */
export async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<{ rawText: string; lines: string[] }> {
  try {
    // Bundle the worker locally so PDF import works offline and does not depend on a third-party CDN.
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    }

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
  } catch (err) {
    console.error('Fehler beim lokalen PDF-Extrahieren:', err);
    throw err;
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

    // Klasse
    const klMatch = line.match(/\bKlasse[:\s]+([0-9]+[a-zA-Z]?|[a-zA-Z0-9_\-]+)\b/i) ||
                    line.match(/\b([1-4][a-zA-Z])\b/);
    if (klMatch && !klasse) klasse = klMatch[1].trim();

    // Schuljahr
    const sjMatch = line.match(/\bSchuljahr[:\s]+([0-9]{4}\s*[\/\-]\s*[0-9]{2,4})/i) ||
                    line.match(/\b(20[2-3][0-9]\s*[\/\-]\s*(?:20)?[2-3][0-9])\b/);
    if (sjMatch && !schuljahr) schuljahr = sjMatch[1].replace(/\s+/g, '').replace('-', '/');

    // SKZ
    const skzMatch = line.match(/\b(?:SKZ|Schulkennzahl)[:\s]+([0-9]{6})\b/i);
    if (skzMatch && !schulkennzahl) schulkennzahl = skzMatch[1];

    // Schulname
    const schuleMatch = line.match(/\b(?:Schule|Schulname|Volksschule|VS|MS|AHS)[:\s]+([^,;\n]+)/i);
    if (schuleMatch && !schulName) schulName = schuleMatch[1].trim();

    // Lehrer / KV
    const kvMatch = line.match(/\b(?:Klassenlehr(?:er|in|person)|Klassenleitung|Klassenvorstand|KV)[:\s]+([^,;\n]+)/i);
    if (kvMatch && !lehrerName) lehrerName = kvMatch[1].trim();
  }

  // 2. Multi-line record splitting for Austrian Sokrates Lists
  // Students in Sokrates are typically numbered 1., 2., 3. or 1, 2, 3 or lines starting with a sequence number
  const studentBlocks: string[][] = [];
  let currentBlock: string[] = [];

  // Detect if lines start with sequence number: "1.", "1 ", "01.", etc.
  const startsWithIndex = (line: string) => /^\s*([0-9]{1,2})[\.\)\s\t]+[\p{Lu}]/u.test(line);

  lines.forEach(line => {
    // Filter out obvious header/footer lines
    if (/^(?:Klassenliste|Schülerverzeichnis|Schule:|Schuljahr:|Seite\s+[0-9]|Druckdatum|Lfd\.?\s*Nr)/i.test(line)) {
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
    let besuchsjahr = '';
    let sv_nummer = '';
    let religion = '';
    let staatsbuergerschaft = '';
    let anschrift = '';
    let plz = '';
    let ort = '';
    let telefon_mutter = '';
    let telefon_vater = '';
    let email_eltern = '';
    let erstsprache = '';
    let geschlecht = '';
    let notiz = '';

    // Birthdate (DD.MM.YYYY)
    const birthMatch = fullBlockText.match(/\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19[89][0-9]|20[0-2][0-9])\b/);
    if (birthMatch) {
      geburtstag = normalizeDate(birthMatch[0]);
    }

    // Besuchsjahr (BJ) -> MUST NOT be confused with birth year!
    // Regex looking for BJ 1, BJ: 2, BJ. 3, or standalone digit near SVNR/Rel
    const bjMatch = fullBlockText.match(/\b(?:BJ|Besuchsjahr)[:\s\.]*([0-9IV]+)\b/i) ||
                    fullBlockText.match(/\bBJ\s*([1-9])\b/i);
    if (bjMatch) {
      besuchsjahr = bjMatch[1].trim();
    } else {
      // If klasse is e.g. "2a" or "3b", default besuchsjahr to class level if not found
      if (klasse && /^[1-4]/.test(klasse)) {
        besuchsjahr = klasse.charAt(0);
      }
    }

    // SVNR (Austrian 4 digits or 10 digits like "1234 140518")
    const svMatch = fullBlockText.match(/\b(?:SVNR|SV-Nr\.?|SV)[:\s]*([0-9]{4}(?:\s*[0-9]{6})?)\b/i) ||
                    fullBlockText.match(/\b([0-9]{4})\s+(?:0[1-9]|[12][0-9]|3[01])(?:0[1-9]|1[0-2])(?:[0-9]{2})\b/);
    if (svMatch) {
      sv_nummer = svMatch[1].replace(/\s+/g, '');
    }

    // Religion
    const relMatch = fullBlockText.match(/\b(r\.?k\.?|evang?\.?|isl(?:am)?\.?|o\.?B\.?|orthodox|alevi|buddh|israelit)\b/i) ||
                     fullBlockText.match(/\b(?:Rel|Bekenntnis)[:\s]+([^,;\s]+)/i);
    if (relMatch) {
      religion = normalizeReligion(relMatch[1]);
    }

    // Staatsbürgerschaft
    const stMatch = fullBlockText.match(/\b(?:StB|Staat|Staatsbuergerschaft|Staatsbürgerschaft)[:\s]*([A-ZÄÖÜa-zäöü]+)\b/i) ||
                    fullBlockText.match(/\b(AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|Österreich|Deutschland|Türkei)\b/i);
    if (stMatch) {
      staatsbuergerschaft = normalizeCountry(stMatch[1]);
    }

    // Address/contact values are extracted only when present in the source record.
    const contactInfo = extractContactAndAddress(block);
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

    // Sokrates exports surname first. Strip adjacent metadata before splitting the name.
    const cleanedName = cleanStudentNameString(block[0]);
    const parsedName = splitSokratesName(cleanedName);
    nachname = parsedName.nachname;
    vorname = parsedName.vorname;

    // Geschlecht detection based on Vorname or explicit label
    if (/\b(?:w|weiblich|w\.|m\u00e4dchen)\b/i.test(fullBlockText)) {
      geschlecht = 'w';
    } else if (/\b(?:m|m\u00e4nnlich|m\.|knabe|bube)\b/i.test(fullBlockText)) {
      geschlecht = 'm';
    } else {
      geschlecht = ''; // unknown: do not infer gender without source data
    }

    if (vorname || nachname) {
      students.push({
        id: crypto.randomUUID(),
        lfdNr,
        vorname: vorname.trim(),
        nachname: nachname.trim(),
        geschlecht,
        geburtstag,
        besuchsjahr,
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
 * Geometric Sokrates PDF parser.
 * Uses table coordinates to keep contact/address columns from bleeding into names.
 * Values are only set when they are present in the source; no student attributes are guessed.
 */
export async function parseSokratesPDF(arrayBuffer: ArrayBuffer): Promise<ParsedSokratesResult> {
  try {
    if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    }

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;

    const students: ParsedSokratesStudent[] = [];
    let klasse = '';
    let schuljahr = '';
    let lehrerName = '';
    let schulName = '';
    let schulkennzahl = '';
    let schulOrt = '';
    let schulPlz = '';
    const warnings: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = (textContent.items as Array<{ str: string; transform: number[]; width?: number; height?: number }>)
        .filter(item => item.str && item.str.trim())
        .map(item => ({
          text: item.str.trim(),
          x: item.transform[4],
          y: item.transform[5],
          width: item.width || 0,
          height: item.height || 0,
        }));

      if (items.length === 0) continue;

      for (const item of items) {
        const text = item.text;
        const klMatch = text.match(/\bKlasse[:\s]+([0-9]+[a-zA-Z]?|[a-zA-Z0-9_\-]+)\b/i);
        if (klMatch && !klasse) klasse = klMatch[1].trim();

        const sjMatch = text.match(/\bSchuljahr[:\s]+([0-9]{4}\s*[\/\-]\s*[0-9]{2,4})/i);
        if (sjMatch && !schuljahr) schuljahr = sjMatch[1].replace(/\s+/g, '').replace('-', '/');

        const kvMatch = text.match(/\b(?:Klassenlehrer(?:in)?|Klassenlehrkraft|Klassenlehrperson|Klassenleitung|Klassenvorstand|KV|Lehrperson|Lehrer(?:in)?)[:\s]+([^,;\n]+)/i);
        if (kvMatch && !lehrerName) lehrerName = kvMatch[1].replace(/\s+Schuljahr.*$/i, '').trim();

        if (/^(?:Volksschule|VS|Mittelschule|MS|AHS|Gymnasium|Sonderschule|ASO)\b/i.test(text) && !schulName) {
          schulName = text;
        }

        const skzMatch = text.match(/\b(?:SKZ|Schulkennzahl)[:\s]+([0-9]{6})\b/i);
        if (skzMatch && !schulkennzahl) schulkennzahl = skzMatch[1];

        const schoolPlace = text.match(/\b([1-9][0-9]{3})\s+([A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\s\-]+?)(?:,|$)/);
        if (schoolPlace && !schulPlz) {
          schulPlz = schoolPlace[1].trim();
          schulOrt = schoolPlace[2].trim();
        }
      }

      const headerItems = items.filter(item =>
        /^(?:Nr\.?|Name|Familienname|Vorname|BJ|Besuchsjahr|Geb\.?Datum|Geburtstag|SVNR|Religion|Bekenntnis|Staat|StB|Adressdaten|Adresse|Telefon|Tel\.?)$/i.test(item.text)
      );

      const tableHeaderY = headerItems.length >= 2 ? Math.max(...headerItems.map(item => item.y)) : 0;
      const minHeaderY = headerItems.length >= 2 ? Math.min(...headerItems.map(item => item.y)) : 0;

      let colNrMax = 65;
      let colNameMax = 195;
      let colBJMax = 225;
      let colGebMax = 295;
      let colRelMax = 375;

      const nameHeader = headerItems.find(item => /^(?:Name|Familienname)$/i.test(item.text));
      const bjHeader = headerItems.find(item => /^(?:BJ|Besuchsjahr)$/i.test(item.text));
      const gebHeader = headerItems.find(item => /^(?:Geb\.?Datum|Geburtstag|SVNR)$/i.test(item.text));
      const relHeader = headerItems.find(item => /^(?:Religion|Bekenntnis)$/i.test(item.text));
      const addrHeader = headerItems.find(item => /^(?:Adressdaten|Adresse)$/i.test(item.text));

      if (nameHeader) colNrMax = nameHeader.x - 4;
      if (bjHeader) colNameMax = bjHeader.x - 4;
      if (gebHeader) colBJMax = gebHeader.x - 4;
      if (relHeader) colGebMax = relHeader.x - 4;
      if (addrHeader) colRelMax = addrHeader.x - 4;

      const rowNumbers = items
        .filter(item => item.x <= colNrMax + 8 && (tableHeaderY === 0 || item.y < tableHeaderY - 6) && item.y > 35)
        .filter(item => /^[1-9][0-9]?$/.test(item.text))
        .map(item => ({ nr: Number(item.text), y: item.y }))
        .sort((a, b) => b.y - a.y);

      const uniqueRows: Array<{ nr: number; y: number }> = [];
      const seenPositions = new Set<string>();
      for (const row of rowNumbers) {
        const key = `${row.nr}:${Math.round(row.y)}`;
        if (!seenPositions.has(key)) {
          seenPositions.add(key);
          uniqueRows.push(row);
        }
      }

      if (uniqueRows.length < 2) continue;

      const rowBands = uniqueRows.map((row, index) => {
        const previous = uniqueRows[index - 1];
        const next = uniqueRows[index + 1];
        const topY = index === 0
          ? (minHeaderY > 0 ? Math.min(minHeaderY - 2, row.y + 18) : row.y + 20)
          : (previous.y + row.y) / 2;
        const bottomY = index === uniqueRows.length - 1
          ? Math.max(25, row.y - (previous ? (previous.y - row.y) / 2 : 12))
          : (row.y + next.y) / 2;
        return { ...row, topY, bottomY };
      });

      const isHeaderWord = (text: string) =>
        /^(?:Nr\.?|Name|Familienname|Vorname|BJ|Besuchsjahr|Geb\.?Datum|Geburtstag|SVNR|Religion|Bekenntnis|Staat|StB|Adressdaten|Adresse|Wohnadresse|Wohnort|Anschrift|PLZ|Ort|Telefon|Tel\.?|Handy|Telefonnummer|Erziehungsberechtigte|Notfallkontakt|Kontaktdaten)$/i.test(text.trim());

      for (const band of rowBands) {
        const rowItems = items.filter(item =>
          item.y >= band.bottomY &&
          item.y < band.topY &&
          item.x > colNrMax - 10 &&
          !isHeaderWord(item.text)
        );
        if (rowItems.length === 0) continue;

        const nameItems = rowItems.filter(item => item.x >= colNrMax && item.x < colNameMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        const bjItems = rowItems.filter(item => item.x >= colNameMax && item.x < colBJMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        const gebItems = rowItems.filter(item => item.x >= colBJMax && item.x < colGebMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        const relItems = rowItems.filter(item => item.x >= colGebMax && item.x < colRelMax)
          .sort((a, b) => b.y - a.y || a.x - b.x);
        const contactItems = rowItems.filter(item => item.x >= colRelMax);

        const parsedName = splitSokratesName(cleanStudentNameString(nameItems.map(item => item.text).join(' ')));
        if (!parsedName.nachname && !parsedName.vorname) continue;

        const bjText = bjItems.map(item => item.text).join(' ');
        const bjMatch = bjText.match(/\b([1-4]|V)\b/i);
        const besuchsjahr = bjMatch
          ? bjMatch[1].toUpperCase()
          : (klasse && /^[1-4]/.test(klasse) ? klasse.charAt(0) : '');

        const gebText = gebItems.map(item => item.text).join(' ');
        const birthMatch = gebText.match(/\b(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.(19[89][0-9]|20[0-2][0-9])\b/);
        const geburtstag = birthMatch ? normalizeDate(birthMatch[0]) : '';
        const svMatch = gebText.match(/\b([0-9]{10})\b/) || gebText.match(/\b([0-9]{4})\s*([0-9]{6})\b/);
        const sv_nummer = svMatch ? svMatch.slice(1).filter(Boolean).join('') : '';

        const relText = relItems.map(item => item.text).join(' ');
        const relMatch = relText.match(/(?<!\p{L})(röm\.?-?kath\.?|r\.?k\.?|evang?\.?|isl(?:am)?\.?(?:\s*\(IGGÖ\))?|o\.?B\.?|orthodox|alevi|buddh|israelit)(?!\p{L})/ui);
        const religion = relMatch ? normalizeReligion(relMatch[1]) : '';
        const stateMatch = relText.match(/(?<!\p{L})(AUT|DEU|TUR|SYR|AFG|UKR|ROU|SRB|BIH|HRV|HUN|ITA|CHE|LIE|KOS|GBR|SOM|CZE|RUS|MKD|POL|SVK|SVN|Österreich|Deutschland|Türkei|Syrien|Kosovo|Großbritannien|Somalia|Tschechien|Russland|Nordmazedonien|Polen|Slowakei|Slowenien|Liechtenstein)(?!\p{L})/ui);
        const staatsbuergerschaft = stateMatch ? normalizeCountry(stateMatch[1]) : '';

        const contact = extractContactAndAddress(contactItems);
        const rowText = rowItems.map(item => item.text).join(' ');
        const email = rowText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || '';
        let geschlecht = '';
        if (/\b(?:weiblich|mädchen)\b/i.test(rowText)) geschlecht = 'w';
        else if (/\b(?:männlich|knabe|bube)\b/i.test(rowText)) geschlecht = 'm';
        else if (/\b(?:divers|inter|offen)\b/i.test(rowText)) geschlecht = 'd';

        students.push({
          id: crypto.randomUUID(),
          lfdNr: band.nr,
          vorname: parsedName.vorname,
          nachname: parsedName.nachname,
          geschlecht,
          geburtstag,
          besuchsjahr,
          sv_nummer,
          religion,
          staatsbuergerschaft,
          anschrift: contact.anschrift,
          plz: contact.plz,
          ort: contact.ort,
          telefon_mutter: contact.telefon_mutter,
          telefon_vater: contact.telefon_vater,
          email_eltern: email,
          erstsprache: '',
          notiz: '',
        });
      }
    }

    if (students.length > 0) {
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
        sourceMethod: 'pdf_local',
      };
    }

    const { rawText } = await extractTextFromPDF(arrayBuffer);
    const fallback = parseSokratesText(rawText);
    fallback.sourceMethod = 'pdf_local';
    return fallback;
  } catch (err) {
    if (import.meta.env?.DEV) console.error('Technischer Fehler beim lokalen Sokrates-PDF-Import:', err);
    throw new Error('Die PDF-Datei konnte nicht gelesen werden. Bitte versuche es erneut oder verwende alternativ den CSV-/Excel-Import.');
  }
}

/**
 * Client-Side Sokrates PDF Parsing (Zero-Knowledge)
 * Highly sensitive official student data (SVNR, addresses, religion, contacts)
 * is parsed 100% locally in the browser and NEVER sent to external servers or AI endpoints.
 */
export async function parseSokratesPDFWithAI(file: File): Promise<ParsedSokratesResult> {
  return parseSokratesPDF(await file.arrayBuffer());
}

/**
 * Universal Master Importer: Automatically extracts text locally in the browser
 * for both PDF and CSV formats without transmitting sensitive records.
 */
export async function parseSokratesFile(file: File): Promise<ParsedSokratesResult> {
  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if (isPDF) {
    return parseSokratesPDF(await file.arrayBuffer());
  }

  // 3. CSV / Text file parsing
  const textContent = await file.text();
  return parseSokratesText(textContent);
}

/**
 * Convert ParsedSokratesStudent list to LehrerAPP full Student model
 */
export function convertToAppStudents(parsedList: ParsedSokratesStudent[]): Student[] {
  return parsedList.map(s => {
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
      staatsbuergerschaft: s.staatsbuergerschaft || '',
      religion: s.religion || '',
      besuchsjahr: s.besuchsjahr || '', // fehlende Besuchsjahre nicht erfinden
      espf: false,
      spf: false,
      erstsprache: s.erstsprache || '',
      geschlecht: normalizeStudentGender(s.geschlecht),
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
