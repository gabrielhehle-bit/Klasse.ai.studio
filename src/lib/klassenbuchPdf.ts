import pdfMakeLib from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

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

    content.push({
      stack: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'KLASSENBUCH', style: 'eyebrow' },
                { text: options.className || 'Klasse', style: 'title' },
                {
                  text: [
                    week.sw ? `Schulwoche ${week.sw} · ` : '',
                    `KW ${week.kw}`,
                    week.dateRange ? ` · ${week.dateRange}` : '',
                  ],
                  style: 'meta',
                },
              ],
            },
            {
              width: 'auto',
              stack: [
                { text: options.schoolYear ? `Schuljahr ${options.schoolYear}` : '', style: 'metaRight' },
                { text: options.teacherName || '', style: 'metaRight' },
              ],
            },
          ],
          margin: [0, 0, 0, 12],
        },
        {
          table: {
            headerRows: 1,
            widths: [150, '*'],
            body: [
              [
                { text: 'Bereich', style: 'th' },
                { text: 'Dokumentierter Unterricht / Inhalt', style: 'th' },
              ],
              ...categories.map(([category, entries]) => [
                { text: category, style: 'category' },
                { text: textOrDash(entries), style: entries.length > 0 ? 'cell' : 'emptyCell' },
              ]),
            ],
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.45),
            vLineWidth: () => 0.6,
            hLineColor: (i: number) => (i <= 1 ? '#0f172a' : '#cbd5e1'),
            vLineColor: () => '#cbd5e1',
            paddingLeft: () => 7,
            paddingRight: () => 7,
            paddingTop: () => 5,
            paddingBottom: () => 5,
          },
        },
        ...(options.includeAbsentees === false ? [] : [{
          stack: [
            { text: 'Abwesenheiten / Fehlstunden', style: 'sectionTitle' },
            {
              text: week.absentees && week.absentees.length > 0
                ? week.absentees.map(entry => `${entry.name}: ${entry.info}`).join('\n')
                : 'Keine Fehlstunden in dieser Woche erfasst.',
              style: week.absentees && week.absentees.length > 0 ? 'body' : 'muted',
            },
          ],
          margin: [0, 12, 0, 0],
        }]),
        ...(week.notes?.trim() ? [{
          stack: [
            { text: 'Berichtsergänzungen', style: 'sectionTitle' },
            { text: week.notes.trim(), style: 'body' },
          ],
          margin: [0, 10, 0, 0],
        }] : []),
        ...(signatures.length > 0 ? [{
          columns: signatures.map(label => ({
            width: '*',
            stack: [
              { text: '\n\n____________________________', alignment: 'center', fontSize: 8 },
              { text: label, alignment: 'center', fontSize: 7, color: '#64748b', bold: true },
            ],
          })),
          columnGap: 12,
          margin: [0, 10, 0, 0],
        }] : []),
      ],
      pageBreak: index < weeks.length - 1 ? 'after' : undefined,
    });
  });

  return {
    pageSize: 'A4',
    pageMargins: [34, 32, 34, 34],
    info: {
      title: `KLASSIO Klassenbuch ${options.className || ''}`.trim(),
      subject: 'Klassenbuch / Lehrbericht',
      creator: 'KLASSIO',
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: 'KLASSIO · Klassenbuch', fontSize: 7, color: '#94a3b8' },
        { text: `Seite ${currentPage} von ${pageCount}`, alignment: 'right', fontSize: 7, color: '#94a3b8' },
      ],
      margin: [34, 0, 34, 12],
    }),
    content,
    styles: {
      eyebrow: { fontSize: 7, bold: true, color: '#475569', characterSpacing: 1.2 },
      title: { fontSize: 17, bold: true, color: '#0f172a', margin: [0, 2, 0, 2] },
      meta: { fontSize: 8.5, color: '#475569' },
      metaRight: { fontSize: 8, color: '#64748b', alignment: 'right', margin: [0, 0, 0, 2] },
      th: { fontSize: 8, bold: true, color: '#ffffff', fillColor: '#0f172a' },
      category: { fontSize: 8, bold: true, color: '#1e293b', fillColor: '#f8fafc' },
      cell: { fontSize: 8, color: '#0f172a', lineHeight: 1.25 },
      emptyCell: { fontSize: 8, color: '#cbd5e1', italics: true },
      sectionTitle: { fontSize: 8, bold: true, color: '#334155', margin: [0, 0, 0, 4] },
      body: { fontSize: 8, color: '#1e293b', lineHeight: 1.25 },
      muted: { fontSize: 8, color: '#94a3b8', italics: true },
    },
    defaultStyle: {
      font: 'Roboto',
      fontSize: 8,
      lineHeight: 1.2,
    },
  };
}

export function downloadKlassenbuchPdf(filename: string, options: KlassenbuchPdfOptions): void {
  const definition = buildKlassenbuchPdfDefinition(options);
  const safeFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdfMake.createPdf(definition).download(safeFilename);
}
