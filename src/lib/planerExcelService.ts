import * as XLSX from 'xlsx';
import { AppState } from '../types';
import { STUNDEN_INFO, TAGE_NAMEN, DEFAULT_YEARLY_SUBJECTS, MAX_LESSON_SLOTS } from '../constants';
import { getStartYear, getSchulstartKW, kwToMonday, kwYear, getKW, isHoliday, sortYearlySubjects } from './utils';
import { yearPlanCellEntries } from './yearlyPlanData';
import { configuredLessonTime } from './weeklyPlanData';

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

  // Pre-fill empty planning rows for Montag to Freitag (hours 1 to 10)
  // If user has stammplan, pre-populate subjects!
  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  days.forEach(day => {
    for (let stunde = 1; stunde <= MAX_LESSON_SLOTS; stunde++) {
      const timeStr = configuredLessonTime(app.stundenZeiten, STUNDEN_INFO, stunde);
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

export async function parseWochenplanExcel(_file: File): Promise<WochenplanImportResult> {
  // SECURITY: xlsx@0.18.5 has known vulnerabilities when parsing crafted workbooks.
  // Export remains available; importing stays fail-closed until the parser is replaced.
  return {
    success: false,
    error: 'Der Excel-Import ist vorübergehend aus Sicherheitsgründen deaktiviert. Die Excel-Vorlage kann weiterhin exportiert werden.',
    rows: [],
    totalRows: 0,
    validRows: 0,
    detectedDays: []
  };
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
        swIndex,
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
    }

    swIndex++;
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
  _file: File,
  _availableSubjects: { id: string; label: string }[]
): Promise<JahresplanImportResult> {
  // SECURITY: do not feed externally supplied workbook bytes into the vulnerable
  // SheetJS parser. Template generation is write-only and remains available.
  return {
    success: false,
    error: 'Der Excel-Import ist vorübergehend aus Sicherheitsgründen deaktiviert. Die Jahresplan-Vorlage kann weiterhin exportiert werden.',
    rows: [],
    totalRows: 0,
    validRows: 0,
    detectedWeeks: []
  };
}

