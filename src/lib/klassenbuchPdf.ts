import pdfMakeLib from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { splitKlassenbuchCategoryKey } from './klassenbuchSubjects';

const pdfMake = pdfMakeLib as any;
pdfMake.vfs = (pdfFonts as any)?.pdfMake?.vfs || (pdfFonts as any)?.vfs;

export type KlassenbuchPdfWeek = {
  kw: number;
  sw?: number;
  dateRange: string;
  categories: Record<string, string[]>;
  absentees?: Array<{ name: string; info: string }>;
  notes?: string;
};

export type KlassenbuchPdfOptions = {
  className?: string;
  schoolYear?: string;
  teacherName?: string;
  weeks: KlassenbuchPdfWeek[];
  includeAbsentees?: boolean;
  includeOccurrences?: boolean;
  signatures?: string[];
};

const textOrDash = (entries: string[] | undefined) => {
  const cleaned = (entries || []).map(value => String(value || '').trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(' · ') : '—';
};

export function buildKlassenbuchPdfDefinition(options: KlassenbuchPdfOptions): TDocumentDefinitions {
  const signatures = options.signatures || [];
  const weeks = options.weeks.length > 0 ? options.weeks : [{
    kw: 0,
    dateRange: '',
    categories: {},
  }];

  const content: any[] = [];

  weeks.forEach((week, index) => {
    const categories = Object.entries(week.categories).filter(([name]) =>
      options.includeOccurrences !== false || name !== 'Besondere Vorkommnisse'
    );

    const totalCharacters = categories.reduce(
      (sum, [category, entries]) =>
        sum + category.length + entries.reduce((entrySum, value) => entrySum + String(value || '').length, 0),
      0,
    ) + String(week.notes || '').length
      + (week.absentees || []).reduce((sum, entry) => sum + entry.name.length + entry.info.length, 0);

    // A normal school week remains on one A4 page, but overflowing text
    // takes precedence over the one-page preference.
    // A4 is mandatory. A very long week cannot always fit on one page:
    // keep normal weeks together, but allow oversized weeks to flow onto a
    // further A4 page instead of clipping text or failing on an unbreakable table.
    const longestEntry = Math.max(0, ...categories.flatMap(([, entries]) =>
      entries.map(value => String(value || '').length)));
    const fitsOnePage = totalCharacters <= 3800 && longestEntry <= 950 && categories.length <= 28;
    const dense = categories.length >= 15 || totalCharacters > 1800;
    const veryDense = categories.length >= 19 || totalCharacters > 3000;
    const rowFontSize = veryDense ? 5.7 : dense ? 6.4 : 7.1;
    const subareaFontSize = veryDense ? 5.1 : dense ? 5.8 : 6.4;
    const rowPadding = veryDense ? 1.6 : dense ? 2.3 : 3.1;
    const bodyLineHeight = veryDense ? 1.05 : dense ? 1.08 : 1.14;
    const sectionMargin = veryDense ? 5 : dense ? 7 : 9;

    const rows = categories.map(([category, entries]) => {
      const parsed = splitKlassenbuchCategoryKey(category);
      const categoryCell = parsed.subarea
        ? {
            stack: [
              { text: parsed.subject, bold: true, fontSize: rowFontSize, color: '#0f172a' },
              { text: parsed.subarea, fontSize: subareaFontSize, color: '#64748b', margin: [0, 1, 0, 0] },
            ],
            fillColor: '#f8fafc',
          }
        : {
            text: parsed.subject,
            bold: true,
            fontSize: rowFontSize,
            color: '#0f172a',
            fillColor: '#f8fafc',
          };

      return [
        categoryCell,
        {
          text: textOrDash(entries),
          fontSize: rowFontSize,
          color: entries.length > 0 ? '#0f172a' : '#cbd5e1',
          italics: entries.length === 0,
          lineHeight: bodyLineHeight,
        },
      ];
    });

    const weekBlock: any = {
      unbreakable: fitsOnePage,
      stack: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'KLASSENBUCH', fontSize: 6.5, bold: true, color: '#475569', characterSpacing: 1.1 },
                { text: options.className || 'Klasse', fontSize: 15, bold: true, color: '#0f172a', margin: [0, 1, 0, 1] },
                {
                  text: [
                    week.sw ? `Schulwoche ${week.sw} · ` : '',
                    `KW ${week.kw}`,
                    week.dateRange ? ` · ${week.dateRange}` : '',
                  ],
                  fontSize: 7.4,
                  color: '#475569',
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: options.schoolYear ? `Schuljahr ${options.schoolYear}` : '', fontSize: 7, color: '#64748b', alignment: 'right' },
                { text: options.teacherName || '', fontSize: 7, color: '#64748b', alignment: 'right', margin: [0, 1, 0, 0] },
              ],
            },
          ],
          margin: [0, 0, 0, 7],
        },
        {
          table: {
            headerRows: 1,
            dontBreakRows: fitsOnePage,
            keepWithHeaderRows: 1,
            widths: [118, '*'],
            body: [
              [
                { text: 'Fach / Unterbereich', fontSize: 6.8, bold: true, color: '#ffffff', fillColor: '#0f172a' },
                { text: 'Dokumentierter Unterricht / Inhalt', fontSize: 6.8, bold: true, color: '#ffffff', fillColor: '#0f172a' },
              ],
              ...rows,
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 0.9 : 0.35),
            vLineWidth: () => 0.45,
            hLineColor: (i: number) => (i <= 1 ? '#0f172a' : '#d8dee8'),
            vLineColor: () => '#cbd5e1',
            paddingLeft: () => 5,
            paddingRight: () => 5,
            paddingTop: () => rowPadding,
            paddingBottom: () => rowPadding,
          },
        },
        ...(options.includeAbsentees === false ? [] : [{
          stack: [
            { text: 'Abwesenheiten / Fehlstunden', fontSize: 6.7, bold: true, color: '#334155', margin: [0, 0, 0, 2] },
            {
              text: week.absentees && week.absentees.length > 0
                ? week.absentees.map(entry => `${entry.name}: ${entry.info}`).join(' · ')
                : 'Keine Fehlstunden in dieser Woche erfasst.',
              fontSize: veryDense ? 5.6 : 6.4,
              color: week.absentees && week.absentees.length > 0 ? '#1e293b' : '#94a3b8',
              italics: !(week.absentees && week.absentees.length > 0),
              lineHeight: 1.08,
            },
          ],
          margin: [0, sectionMargin, 0, 0],
        }]),
        ...(week.notes?.trim() ? [{
          stack: [
            { text: 'Berichtsergänzungen', fontSize: 6.7, bold: true, color: '#334155', margin: [0, 0, 0, 2] },
            { text: week.notes.trim(), fontSize: veryDense ? 5.6 : 6.4, color: '#1e293b', lineHeight: 1.08 },
          ],
          margin: [0, sectionMargin, 0, 0],
        }] : []),
        ...(signatures.length > 0 ? [{
          columns: signatures.map(label => ({
            width: '*',
            stack: [
              { text: '\n____________________________', alignment: 'center', fontSize: 6.5 },
              { text: label, alignment: 'center', fontSize: 6, color: '#64748b', bold: true },
            ],
          })),
          columnGap: 10,
          margin: [0, sectionMargin, 0, 0],
        }] : []),
      ],
      pageBreak: index < weeks.length - 1 ? 'after' : undefined,
    };

    content.push(weekBlock);
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'portrait',
    // 24 pt ≈ 8,5 mm. Damit bleibt der Klassenbuch-Wochenbericht innerhalb der
    // druckbaren A4-Fläche und hat zugleich ausreichend Sicherheitsrand.
    pageMargins: [24, 22, 24, 28],
    info: {
      title: `KLASSIO Klassenbuch ${options.className || ''}`.trim(),
      subject: 'Klassenbuch / Lehrbericht',
      creator: 'KLASSIO',
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'KLASSIO · Klassenbuch', fontSize: 6.2, color: '#94a3b8' },
        { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'right', fontSize: 6.2, color: '#94a3b8' },
      ],
      margin: [24, 0, 24, 9],
    }),
    content,
    defaultStyle: {
      font: 'Roboto',
      fontSize: 7,
      lineHeight: 1.1,
    },
  };
}

export function downloadKlassenbuchPdf(filename: string, options: KlassenbuchPdfOptions): void {
  const definition = buildKlassenbuchPdfDefinition(options);
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdfMake.createPdf(definition).download(safeFilename);
}
