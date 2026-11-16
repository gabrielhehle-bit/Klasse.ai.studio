import JSZip from 'jszip';

export type XlsxCell = string | number | boolean | null | undefined;
export interface XlsxSheet {
  name: string;
  rows: XlsxCell[][];
  columnWidths?: number[];
}

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PKG_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_NS = 'http://schemas.openxmlformats.org/package/2006/content-types';
const XML_DECL = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value: string): string {
  // XML 1.0 disallows control characters and unpaired UTF-16 surrogates.
  const safe = Array.from(value, character => {
    const cp = character.codePointAt(0)!;
    return (cp < 32 && cp !== 9 && cp !== 10 && cp !== 13) ||
      (cp >= 0xD800 && cp <= 0xDFFF) || cp === 0xFFFE || cp === 0xFFFF
      ? '' : character;
  }).join('');
  return safe.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[char]!));
}

function columnName(index: number): string {
  let result = '';
  while (index > 0) {
    index--;
    result = String.fromCharCode(65 + index % 26) + result;
    index = Math.floor(index / 26);
  }
  return result;
}

function worksheetXml(sheet: XlsxSheet): string {
  if (sheet.rows.length > 1_048_576 || sheet.rows.some(row => row.length > 16_384)) {
    throw new Error('Die Excel-Vorlage überschreitet die zulässige Tabellenblattgröße.');
  }
  const columns = sheet.columnWidths?.length
    ? `<cols>${sheet.columnWidths.map((width, i) => {
      const safeWidth = Math.max(1, Math.min(255, Number.isFinite(width) ? width : 12));
      return `<col min="${i + 1}" max="${i + 1}" width="${safeWidth}" customWidth="1"/>`;
    }).join('')}</cols>` : '';
  const rows = sheet.rows.map((row, index) => {
    const rowNumber = index + 1;
    const cells = row.map((value, col) => {
      if (value === null || value === undefined || value === '') return '';
      const ref = `${columnName(col + 1)}${rowNumber}`;
      if (typeof value === 'number' && Number.isFinite(value)) {
        return `<c r="${ref}"><v>${value}</v></c>`;
      }
      // Always write strings as inline text, never formulas (even if they start with =, + or @).
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
    }).join('');
    return `<row r="${rowNumber}">${cells}</row>`;
  }).join('');
  return `${XML_DECL}<worksheet xmlns="${NS}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${columns}<sheetData>${rows}</sheetData></worksheet>`;
}

// Creates a standard Excel .xlsx ZIP using existing JSZip; never parses uploaded files.
export async function buildXlsxWorkbook(sheets: XlsxSheet[]): Promise<Blob> {
  if (!sheets.length) throw new Error('Mindestens ein Tabellenblatt ist erforderlich.');
  const names = new Set<string>();
  for (const sheet of sheets) {
    if (!sheet.name || sheet.name.length > 31 || /[\\/*?:\[\]]/.test(sheet.name) || names.has(sheet.name.toLowerCase())) {
      throw new Error('Ungültiger oder mehrfach verwendeter Excel-Tabellenblattname.');
    }
    names.add(sheet.name.toLowerCase());
  }
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `${XML_DECL}<Types xmlns="${CONTENT_NS}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  zip.file('_rels/.rels', `${XML_DECL}<Relationships xmlns="${PKG_NS}"><Relationship Id="rId1" Type="${REL_NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file('xl/workbook.xml', `${XML_DECL}<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets>${sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  zip.file('xl/_rels/workbook.xml.rels', `${XML_DECL}<Relationships xmlns="${PKG_NS}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${REL_NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${REL_NS}/styles" Target="styles.xml"/></Relationships>`);
  zip.file('xl/styles.xml', `${XML_DECL}<styleSheet xmlns="${NS}"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`);
  sheets.forEach((sheet, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, worksheetXml(sheet)));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}

// Download only: import stays disabled until a vetted parser is available.
export async function downloadXlsxWorkbook(sheets: XlsxSheet[], filename: string): Promise<void> {
  const blob = await buildXlsxWorkbook(sheets);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  try {
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    // Allow the browser to resolve the download before revoking the blob URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
