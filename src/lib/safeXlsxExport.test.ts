import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildXlsxWorkbook } from './safeXlsxExport';

test('Excel export creates a readable two-sheet OOXML archive with numeric values and column widths', async () => {
  const file = await buildXlsxWorkbook([
    { name: 'Wochenplan_KW46', rows: [['Tag', 'Stunde'], ['Montag', 1]], columnWidths: [18, 8] },
    { name: 'Hinweise', rows: [['Hilfe'], ['Beispiel']] },
  ]);
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const workbook = await zip.file('xl/workbook.xml')!.async('string');
  const data = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  assert.match(workbook, /name="Wochenplan_KW46"/);
  assert.match(workbook, /name="Hinweise"/);
  assert.match(data, /<col min="1" max="1" width="18"/);
  assert.match(data, /<c r="B2"><v>1<\/v><\/c>/);
  assert.match(data, /<c r="A2" t="inlineStr">/);
  assert.ok(zip.file('xl/worksheets/sheet2.xml'));
  assert.ok(zip.file('[Content_Types].xml'));
  assert.ok(zip.file('xl/_rels/workbook.xml.rels'));
});

test('Excel export preserves umlauts, whitespace and harmless text without creating executable formulas', async () => {
  const file = await buildXlsxWorkbook([{ name: 'Plan', rows: [
    ['=HYPERLINK("https://example.org","bad")', '+SUM(1,2)', '@cmd', '  Müsli & Übung <B>  ', '📚'],
  ] }]);
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  assert.match(xml, /t="inlineStr"/);
  assert.match(xml, /\+SUM\(1,2\)/);
  assert.match(xml, /Müsli &amp; Übung &lt;B&gt;/);
  assert.match(xml, /📚/);
  assert.doesNotMatch(xml, /<f(?:\s|>)/);
});

test('Excel export refuses duplicate or invalid worksheet names', async () => {
  await assert.rejects(buildXlsxWorkbook([{ name: 'A', rows: [] }, { name: 'a', rows: [] }]));
  await assert.rejects(buildXlsxWorkbook([{ name: 'A/B', rows: [] }]));
});
