import * as XLSX from 'xlsx';
import { AppState } from '../types';
import { STUNDEN_INFO, TAGE_NAMEN, DEFAULT_YEARLY_SUBJECTS } from '../constants';
import { getStartYear, getSchulstartKW, kwToMonday, kwYear, getKW, isHoliday, sortYearlySubjects } from './utils';
import { yearPlanCellEntries } from './yearlyPlanData';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface WochenplanImportRow {
  tag: string;           // 'Montag' | 'Dienstag' | 'Mittwoch' | 'Donnerstag' | 'Freitag'
  stunde: number;        // 1-based number from Excel (e.g. 1, 2, 3...)
  idx: number;           // 0-based index for app.wochenplanung
  uhrzeit?: string;
  fach: string;
  thema: string;
  lernziel?: string;
  material?: string;
  housework?: string;
  reflexion?: string;
  isExample?: boolean;
}

export interface WochenplanImportResult {
  success: boolean;
  error?: string;
  rows: WochenplanImportRow[];
  totalRows: number;
  validRows: number;
  detectedDays: string[];
}

export interface JahresplanImportRow {
  kw: number;            // 1-53
  sw?: number;
  datum?: string;
  fach: string;          // User-friendly subject name or subject ID
  subjectId?: string;    // Resolved ID for app.jahresplanung
  thema: string;
  buch?: string;
  type?: 'standard' | 'sa' | 'test' | 'lzk' | 'event';
  completed?: boolean;
  isExample?: boolean;
}

export interface JahresplanImportResult {
  success: boolean;
  error?: string;
  rows: JahresplanImportRow[];
  totalRows: number;
  validRows: number;
  detectedWeeks: number[];
}

export function resolveJahresplanSubjectId(
  subjectName: string,
  availableSubjects: { id: string; label: string }[],
): string | undefined {
  const lower = subjectName.toLocaleLowerCase('de-AT').trim();
  if (!lower) return undefined;

  const direct = availableSubjects.find(
    s => s.id.toLocaleLowerCase('de-AT') === lower || s.label.toLocaleLowerCase('de-AT') === lower,
  );
  if (direct) return direct.id;

  const partial = availableSubjects.find(s => {
    const label = s.label.toLocaleLowerCase('de-AT');
    return lower.includes(label) || label.includes(lower);
  });
  if (partial) return partial.id;

  const aliases: Array<[RegExp, string[]]> = [
    [/deutsch|sprache|lesen/, ['deutsch_sprache', 'deutsch', 'lesen']],
    [/mathe/, ['mathe_et', 'mathematik']],
    [/sach/, ['sachunterricht']],
    [/englisch/, ['englisch']],
    [/sport|bewegung/, ['bewegung_sport', 'sport']],
    [/musik/, ['musik']],
    [/kunst|zeichen|bildner/, ['bildnerische_erziehung', 'kunst']],
    [/werk/, ['technisches_werken', 'werken']],
    [/religion/, ['religion']],
  ];

  for (const [pattern, ids] of aliases) {
    if (!pattern.test(lower)) continue;
    const match = availableSubjects.find(s => ids.includes(s.id));
    if (match) return match.id;
  }

  return availableSubjects.find(s => s.id === 'sonstiges')?.id;
}

// ==========================================
// 1. WOCHENPLANER: TEMPLATE GENERATOR
// ==========================================

export function generateWochenplanTemplate(app: AppState, activeKW: number) {
  const wb = XLSX.utils.book_new();

  // Column definitions for the template
  const headers = [
    'Wochentag',
    'Stunde',
    'Uhrzeit',
    'Fach',
    'Thema / Inhalt',
    'Lernziel / Methode',
    'Material',
    'Hausuebung',
    'Notiz / Reflexion'
  ];

  const rows: (string | number)[][] = [headers];

  // 1-2 marked example rows so the teacher immediately sees how to fill it out
  rows.push([
    'Montag (BEISPIEL)',
    1,
    '08:00 - 08:50',
    'Deutsch',
    'Leseverständnis: Der kleine Igel im Herbst',
    'Partnerlesen & gezieltes Fragenstellen',
    'Lesebuch S. 24, Textstreifen',
    'Buch S. 25 Nr. 1-3 lesen',
    'Differenzierung: Zusatzleseblatt für schnelle Leser'
  ]);
  rows.push([
    'Montag (BEISPIEL)',
    2,
    '08:55 - 09:45',
    'Mathematik',
    'Schriftliche Addition mit Zehnerübergang',
    'Rechenschritte im Heft festhalten',
    'Arbeitsblatt 12, Wendeplättchen',
    'Rechenheft S. 18 Nr. 4',
    'Fördergruppe: Hunderterfeld bereitstellen'
  ]);

  // Pre-fill empty planning rows for Montag to Freitag (hours 1 to 6)
  // If user has stammplan, pre-populate subjects!
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  days.forEach(day => {
    for (let stunde = 1; stunde <= 6; stunde++) {
      const timeStr = STUNDEN_INFO[stunde] || '';
      const stammFach = app.stammplan?.[day]?.[stunde] || '';
      rows.push([
        day,
        stunde,
        timeStr,
        stammFach,
        '', // Thema
        '', // Lernziel
        '', // Material
        '', // Hausübung
        ''  // Notiz
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set nice column widths for Excel
  ws['!cols'] = [
    { wch: 18 }, // Wochentag
    { wch: 8 },  // Stunde
    { wch: 16 }, // Uhrzeit
    { wch: 16 }, // Fach
    { wch: 38 }, // Thema / Inhalt
    { wch: 28 }, // Lernziel / Methode
    { wch: 24 }, // Material
    { wch: 22 }, // Hausuebung
    { wch: 28 }  // Notiz / Reflexion
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Wochenplan_KW${activeKW}`);

  // Add a second sheet with helpful instructions
  const infoRows = [
    ['KLASSIO WOCHENPLANER - AUSFÜLLHILFE'],
    [''],
    ['Spalte', 'Beschreibung', 'Beispielwerte'],
    ['Wochentag', 'Wochentag (Montag, Dienstag, Mittwoch, Donnerstag, Freitag)', 'Montag, Di, Mi, Do, Fr'],
    ['Stunde', 'Unterrichtsstunde als Zahl (1 bis 10)', '1, 2, 3...'],
    ['Uhrzeit', 'Optionale Zeitspanne der Stunde', '08:00 - 08:50'],
    ['Fach', 'Fachname (Deutsch, Mathematik, Sachunterricht, Englisch, Sport...)', 'Deutsch, Mathematik...'],
    ['Thema / Inhalt', 'Was wird in der Stunde gelernt oder geübt?', 'Zahlenraum 1000, Wortarten...'],
    ['Lernziel / Methode', 'Pädagogisches Ziel, Sozialform oder Methode', 'Gruppenarbeit, Partnerlesen...'],
    ['Material', 'Benötigte Arbeitsblätter, Bücher, digitale Medien', 'Buch S. 12, Arbeitsblatt...'],
    ['Hausuebung', 'Aufgegebene Hausübung (HÜ)', 'Rechenheft S. 15 Nr. 2'],
    ['Notiz / Reflexion', 'Differenzierung, Notizen für die Lehrperson', 'Differenzierung für Gruppe A'],
    [''],
    ['Hinweis:', 'Zeilen mit "(BEISPIEL)" werden beim Import automatisch ignoriert. Leere Zeilen werden übersprungen.']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 45 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Hinweise');

  // Trigger file download
  const filename = `Wochenplan_Vorlage_KW${activeKW}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ==========================================
// 2. WOCHENPLANER: EXCEL IMPORT PARSER
// ==========================================

export async function parseWochenplanExcel(file: File): Promise<WochenplanImportResult> {
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        success: false,
        error: 'Die Excel-Datei enthält keine Tabellenblätter.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedDays: []
      };
    }

    // Use the first sheet or one containing 'wochen'
    const targetSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('wochen')) || wb.SheetNames[0];
    const ws = wb.Sheets[targetSheetName];

    if (!ws) {
      return {
        success: false,
        error: 'Das Tabellenblatt konnte nicht gelesen werden.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedDays: []
      };
    }

    // Convert sheet to JSON array of objects
    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        error: 'Die Tabelle enthält keine Datenzeilen.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedDays: []
      };
    }

    // Inspect headers
    const sampleRow = rawData[0];
    const rawKeys = Object.keys(sampleRow);

    // Normalize keys to find relevant columns
    const findColKey = (patterns: string[]): string | undefined => {
      return rawKeys.find(k => {
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return patterns.some(p => clean.includes(p));
      });
    };

    const dayKey = findColKey(['wochentag', 'tag', 'day', 'datum']);
    const stundeKey = findColKey(['stunde', 'einheit', 'hour', 'uhr']);
    const fachKey = findColKey(['fach', 'gegenstand', 'subject']);
    const themaKey = findColKey(['thema', 'inhalt', 'topic', 'lehrstoff', 'stoff']);
    const uhrzeitKey = findColKey(['uhrzeit', 'zeit', 'time']);
    const lernzielKey = findColKey(['lernziel', 'methode', 'kompetenz', 'ziel']);
    const materialKey = findColKey(['material', 'unterlagen', 'heft', 'buch']);
    const hueKey = findColKey(['hausuebung', 'hausubung', 'hue', 'hu', 'hausaufgabe']);
    const notizKey = findColKey(['notiz', 'reflexion', 'bemerkung', 'anmerkung', 'differenzierung']);

    // Check essential headers
    if (!fachKey && !themaKey) {
      return {
        success: false,
        error: "Erforderliche Spalten fehlen. Die Tabelle muss mindestens 'Fach' oder 'Thema / Inhalt' enthalten. Bitte verwende die Klassio-Vorlage.",
        rows: [],
        totalRows: rawData.length,
        validRows: 0,
        detectedDays: []
      };
    }

    const detectedDaysSet = new Set<string>();
    const parsedRows: WochenplanImportRow[] = [];

    // Helper to normalize day string
    const normalizeDay = (val: any): string | null => {
      if (!val) return null;
      const str = String(val).toLowerCase().trim();
      if (str.includes('montag') || str === 'mo' || str.startsWith('mo.')) return 'Montag';
      if (str.includes('dienstag') || str === 'di' || str.startsWith('di.')) return 'Dienstag';
      if (str.includes('mittwoch') || str === 'mi' || str.startsWith('mi.')) return 'Mittwoch';
      if (str.includes('donnerstag') || str === 'do' || str.startsWith('do.')) return 'Donnerstag';
      if (str.includes('freitag') || str === 'fr' || str.startsWith('fr.')) return 'Freitag';
      return null;
    };

    let currentDayFallback = 'Montag';

    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];

      const rawDayVal = dayKey ? item[dayKey] : '';
      const isExample = String(rawDayVal || '').toLowerCase().includes('beispiel') ||
                        String(item[fachKey || ''] || '').toLowerCase().includes('beispiel');

      const normalizedDay = normalizeDay(rawDayVal);
      if (normalizedDay) {
        currentDayFallback = normalizedDay;
      }
      const finalDay = normalizedDay || currentDayFallback;

      // Determine Stunde (1..10)
      let stundeNum = 1;
      if (stundeKey && item[stundeKey] !== undefined && item[stundeKey] !== '') {
        const parsed = parseInt(String(item[stundeKey]).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
          stundeNum = parsed;
        }
      }

      const fachVal = fachKey ? String(item[fachKey] || '').trim() : '';
      const themaVal = themaKey ? String(item[themaKey] || '').trim() : '';
      const uhrzeitVal = uhrzeitKey ? String(item[uhrzeitKey] || '').trim() : '';
      const lernzielVal = lernzielKey ? String(item[lernzielKey] || '').trim() : '';
      const materialVal = materialKey ? String(item[materialKey] || '').trim() : '';
      const hueVal = hueKey ? String(item[hueKey] || '').trim() : '';
      const notizVal = notizKey ? String(item[notizKey] || '').trim() : '';

      // Skip completely empty rows
      if (!fachVal && !themaVal && !materialVal && !hueVal) {
        continue;
      }

      detectedDaysSet.add(finalDay);

      parsedRows.push({
        tag: finalDay,
        stunde: stundeNum,
        idx: Math.max(0, stundeNum - 1),
        uhrzeit: uhrzeitVal || STUNDEN_INFO[stundeNum] || '',
        fach: fachVal,
        thema: themaVal,
        lernziel: lernzielVal,
        material: materialVal,
        housework: hueVal,
        reflexion: notizVal,
        isExample: isExample
      });
    }

    if (parsedRows.length === 0) {
      return {
        success: false,
        error: 'Es wurden keine gültigen Unterrichtsstunden in der Datei gefunden. Bitte prüfe, ob die Zeilen ausgefüllt sind.',
        rows: [],
        totalRows: rawData.length,
        validRows: 0,
        detectedDays: []
      };
    }

    return {
      success: true,
      rows: parsedRows,
      totalRows: rawData.length,
      validRows: parsedRows.filter(r => !r.isExample).length,
      detectedDays: Array.from(detectedDaysSet)
    };
  } catch (err: any) {
    console.error('Excel parse error:', err);
    return {
      success: false,
      error: `Die Excel-Datei konnte nicht gelesen werden: ${err?.message || 'Ungültiges Dateiformat'}. Bitte stelle sicher, dass es sich um eine gültige .xlsx oder .xls Datei handelt.`,
      rows: [],
      totalRows: 0,
      validRows: 0,
      detectedDays: []
    };
  }
}

// ==========================================
// 3. JAHRESPLANER: TEMPLATE GENERATOR
// ==========================================

export function buildJahresplanTemplateRows(app: AppState): (string | number)[][] {
  const headers = [
    'Kalenderwoche',
    'Schulwoche',
    'Datum_Von',
    'Fach',
    'Thema / Reihe',
    'Inhalte_Lernziele',
    'Buch_Material',
    'Typ',
    'Erledigt'
  ];

  const rows: (string | number)[][] = [headers];

  rows.push([
    38,
    2,
    '16.09.2024',
    'Deutsch (BEISPIEL)',
    'Wortarten vertiefen: Nomen & Verben',
    'Begleiter erkennen, Großschreibung sichern',
    'Sprachbuch S. 14-16',
    'Standard',
    'Nein'
  ]);
  rows.push([
    38,
    2,
    '16.09.2024',
    'Mathematik (BEISPIEL)',
    'Zahlenraum 1000 wiederholen',
    'Hunderter, Zehner, Einer zerlegen & bündeln',
    'Mathebuch S. 10-12',
    'Standard',
    'Nein'
  ]);
  rows.push([
    45,
    9,
    '04.11.2024',
    'Deutsch (BEISPIEL)',
    '1. Schularbeit: Personenbeschreibung',
    'Vollständiger Entwurf mit Begleitkriterien',
    'Schularbeitsheft',
    'Schularbeit',
    'Nein'
  ]);

  const startYearVal = getStartYear(app.schuljahr);
  const bundesland = app.bundesland || 'VBG';
  const startKW = getSchulstartKW(app.schuljahr, bundesland);
  const endYear = startYearVal + 1;
  const startMonday = kwToMonday(startKW, startYearVal);
  const activeSubjects = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);

  const typeLabel = (type: string | undefined) =>
    type === 'sa'
      ? 'Schularbeit'
      : type === 'lzk' || type === 'test'
        ? 'Lernzielkontrolle'
        : type === 'event'
          ? 'Event'
          : 'Standard';

  let currentMonday = new Date(startMonday);
  let swIndex = 1;

  while (
    currentMonday.getFullYear() < endYear ||
    (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)
  ) {
    const kw = getKW(currentMonday);
    const dateStr = currentMonday.toLocaleDateString('de-AT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const holiday = isHoliday(
      currentMonday,
      app.calendarSettings?.disabledHolidays,
      bundesland,
    );
    const holidayLower = (holiday || '').toLocaleLowerCase('de-AT');
    const isMajorHoliday = Boolean(
      holiday &&
      (
        holidayLower.includes('ferien') ||
        holidayLower.includes('schluss') ||
        holidayLower.includes('beginn')
      )
    );

    if (isMajorHoliday) {
      rows.push([
        kw,
        '-',
        dateStr,
        'Ferien / Schulfrei',
        holiday || '',
        '',
        '',
        'Event',
        ''
      ]);
    } else {
      activeSubjects.forEach((subj) => {
        const existing = app.jahresplanung?.[kw]?.[subj.id];
        const entries = yearPlanCellEntries(existing);
        const doneStr = existing?.completed ? 'Ja' : 'Nein';

        if (entries.length === 0) {
          rows.push([
            kw,
            swIndex,
            dateStr,
            subj.label,
            '',
            '',
            '',
            'Standard',
            doneStr
          ]);
          return;
        }

        entries.forEach((entry) => {
          rows.push([
            kw,
            swIndex,
            dateStr,
            subj.label,
            entry.thema || '',
            '',
            entry.buch || '',
            typeLabel(entry.type),
            doneStr
          ]);
        });
      });
      swIndex++;
    }

    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  return rows;
}

export function generateJahresplanTemplate(app: AppState) {
  const wb = XLSX.utils.book_new();
  const rows = buildJahresplanTemplateRows(app);
  const activeSubjects = sortYearlySubjects(app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 15 },
    { wch: 12 },
    { wch: 14 },
    { wch: 22 },
    { wch: 36 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 10 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Jahresplanung');

  const infoRows = [
    ['KLASSIO JAHRESPLANER - AUSFÜLLHILFE'],
    [''],
    ['Spalte', 'Beschreibung', 'Erlaubte Werte / Hinweise'],
    ['Kalenderwoche', 'Kalenderwoche als Zahl (1 bis 53)', '38, 39, 40...'],
    ['Schulwoche', 'Optionale Schulwochen-Zählung', '1, 2, 3...'],
    ['Datum_Von', 'Montagsdatum der Schulwoche', '16.09.2024'],
    ['Fach', 'Fachname laut Jahresplan', activeSubjects.map(s => s.label).join(', ')],
    ['Thema / Reihe', 'Hauptthema oder Stoffeinheit für diese Woche', 'Zahlenraum 1000, Wortarten...'],
    ['Inhalte_Lernziele', 'Ergänzende Teilthemen oder Kompetenzen', 'Zehnerübergang, Partnerarbeit'],
    ['Buch_Material', 'Lehrwerkseite oder Materialnotiz', 'Buch S. 14, Arbeitsheft'],
    ['Typ', 'Art des Eintrags', 'Standard, Schularbeit, Lernzielkontrolle, Event'],
    ['Erledigt', 'Bearbeitungsstatus', 'Ja / Nein'],
    [''],
    ['Hinweis:', 'Mehrere Zeilen mit derselben KW und demselben Fach werden als mehrere Themen derselben Jahresplan-Zelle importiert. Zeilen mit "(BEISPIEL)" werden ignoriert.']
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols'] = [{ wch: 22 }, { wch: 55 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Hinweise');

  const filename = `Jahresplanung_${app.schuljahr || 'Aktuell'}_Vorlage.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ==========================================
// 4. JAHRESPLANER: EXCEL IMPORT PARSER
// ==========================================

export async function parseJahresplanExcel(
  file: File,
  availableSubjects: { id: string; label: string }[]
): Promise<JahresplanImportResult> {
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        success: false,
        error: 'Die Excel-Datei enthält keine Tabellenblätter.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedWeeks: []
      };
    }

    const targetSheetName = wb.SheetNames.find(n => n.toLowerCase().includes('jahr')) || wb.SheetNames[0];
    const ws = wb.Sheets[targetSheetName];

    if (!ws) {
      return {
        success: false,
        error: 'Das Tabellenblatt konnte nicht gelesen werden.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedWeeks: []
      };
    }

    const rawData: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rawData || rawData.length === 0) {
      return {
        success: false,
        error: 'Die Tabelle enthält keine Datenzeilen.',
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedWeeks: []
      };
    }

    const rawKeys = Object.keys(rawData[0]);

    const findColKey = (patterns: string[]): string | undefined => {
      return rawKeys.find(k => {
        const clean = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        return patterns.some(p => clean.includes(p));
      });
    };

    const kwKey = findColKey(['kalenderwoche', 'kw', 'woche', 'week']);
    const swKey = findColKey(['schulwoche', 'sw']);
    const datumKey = findColKey(['datum', 'date', 'von']);
    const fachKey = findColKey(['fach', 'gegenstand', 'subject']);
    const themaKey = findColKey(['thema', 'reihe', 'topic', 'stoff', 'inhalt']);
    const inhalteKey = findColKey(['inhalte', 'lernziel', 'kompetenz']);
    const buchKey = findColKey(['buch', 'material', 'seite']);
    const typeKey = findColKey(['typ', 'type', 'kategorie', 'art']);
    const doneKey = findColKey(['erledigt', 'done', 'abgeschlossen', 'status']);

    if (!kwKey) {
      return {
        success: false,
        error: "Spalte 'Kalenderwoche' (oder 'KW') fehlt. Bitte verwende die Klassio-Vorlage.",
        rows: [],
        totalRows: rawData.length,
        validRows: 0,
        detectedWeeks: []
      };
    }

    if (!fachKey || !themaKey) {
      return {
        success: false,
        error: "Erforderliche Spalten fehlen. Die Tabelle muss die Spalten 'Fach' und 'Thema' enthalten. Bitte verwende die Klassio-Vorlage.",
        rows: [],
        totalRows: rawData.length,
        validRows: 0,
        detectedWeeks: []
      };
    }

    const detectedWeeksSet = new Set<number>();
    const parsedRows: JahresplanImportRow[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const item = rawData[i];

      const rawKwStr = String(item[kwKey] || '').replace(/[^0-9]/g, '');
      const kwNum = parseInt(rawKwStr, 10);

      if (isNaN(kwNum) || kwNum < 1 || kwNum > 53) {
        continue;
      }

      const rawFach = fachKey ? String(item[fachKey] || '').trim() : '';
      const rawThema = themaKey ? String(item[themaKey] || '').trim() : '';
      const rawInhalte = inhalteKey ? String(item[inhalteKey] || '').trim() : '';
      const rawBuch = buchKey ? String(item[buchKey] || '').trim() : '';
      const rawType = typeKey ? String(item[typeKey] || '').toLowerCase().trim() : '';
      const rawDone = doneKey ? String(item[doneKey] || '').toLowerCase().trim() : '';

      // Skip empty rows
      if (!rawThema && !rawInhalte) {
        continue;
      }

      // Check if row is an example row
      const isExample = rawFach.toLowerCase().includes('beispiel') || rawThema.toLowerCase().includes('beispiel');

      // Normalize Type
      let parsedType: 'standard' | 'sa' | 'test' | 'lzk' | 'event' = 'standard';
      if (rawType.includes('schularbeit') || rawType === 'sa') {
        parsedType = 'sa';
      } else if (rawType.includes('lernzielkontrolle') || rawType === 'lzk') {
        parsedType = 'lzk';
      } else if (rawType.includes('test')) {
        parsedType = 'test';
      } else if (rawType.includes('event') || rawType.includes('ausflug') || rawType.includes('fest')) {
        parsedType = 'event';
      }

      // Normalize Erledigt
      const isCompleted = ['ja', 'yes', 'true', 'x', '1', 'erledigt'].includes(rawDone);

      // Combine Thema and Inhalte if both exist and different
      const finalThema = rawThema || rawInhalte;
      const combinedBuch = [rawBuch, rawInhalte && rawInhalte !== finalThema ? `Ziele: ${rawInhalte}` : ''].filter(Boolean).join(' | ');

      const resolvedSubjId = resolveJahresplanSubjectId(rawFach, availableSubjects);
      if (!resolvedSubjId) {
        continue;
      }

      detectedWeeksSet.add(kwNum);

      parsedRows.push({
        kw: kwNum,
        sw: swKey ? parseInt(String(item[swKey] || ''), 10) || undefined : undefined,
        datum: datumKey ? String(item[datumKey] || '').trim() : undefined,
        fach: rawFach,
        subjectId: resolvedSubjId,
        thema: finalThema,
        buch: combinedBuch,
        type: parsedType,
        completed: isCompleted,
        isExample: isExample
      });
    }

    if (parsedRows.length === 0) {
      return {
        success: false,
        error: 'Es wurden keine gültigen Jahresthemen in der Excel-Tabelle gefunden.',
        rows: [],
        totalRows: rawData.length,
        validRows: 0,
        detectedWeeks: []
      };
    }

    return {
      success: true,
      rows: parsedRows,
      totalRows: rawData.length,
      validRows: parsedRows.filter(r => !r.isExample).length,
      detectedWeeks: Array.from(detectedWeeksSet).sort((a, b) => a - b)
    };
  } catch (err: any) {
    console.error('Jahresplan Excel parse error:', err);
    return {
      success: false,
      error: `Die Excel-Datei konnte nicht gelesen werden: ${err?.message || 'Ungültiges Dateiformat'}.`,
      rows: [],
      totalRows: 0,
      validRows: 0,
      detectedWeeks: []
    };
  }
}
