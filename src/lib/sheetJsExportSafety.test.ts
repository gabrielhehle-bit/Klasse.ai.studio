import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { parseWochenplanExcel, parseJahresplanExcel } from './planerExcelService';

test('official patched SheetJS version is used for read-free template exports', async () => {
  assert.equal(XLSX.version, '0.20.3');

  // Exactly the APIs that KLASSIO's weekly/yearly templates rely upon.
  const workbook = XLSX.utils.book_new();
  const weekly = XLSX.utils.aoa_to_sheet([
    ['Wochentag', 'Stunde', 'Thema / Inhalt'],
    ['Montag', 1, 'Igel lesen'],
  ]);
  weekly['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 38 }];
  const guide = XLSX.utils.aoa_to_sheet([
    ['KLASSIO WOCHENPLANER - AUSFÜLLHILFE'],
    ['Spalte', 'Beschreibung'],
  ]);
  XLSX.utils.book_append_sheet(workbook, weekly, 'Wochenplan_KW46');
  XLSX.utils.book_append_sheet(workbook, guide, 'Hinweise');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as Uint8Array;
  const zip = await JSZip.loadAsync(bytes);
  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  const sheet1Xml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
  const sheet2Xml = await zip.file('xl/worksheets/sheet2.xml')?.async('string');

  assert.ok(workbookXml?.includes('Wochenplan_KW46'));
  assert.ok(workbookXml?.includes('Hinweise'));
  assert.ok(sheet1Xml?.includes('Wochentag'));
  assert.ok(sheet1Xml?.includes('Igel lesen'));
  assert.ok(sheet2Xml?.includes('AUSFÜLLHILFE'));
  assert.ok(bytes.length > 1000, 'Expected actual nonempty XLSX ZIP bytes');
});

test('untrusted weekly and yearly workbook imports remain disabled despite patched library', async () => {
  const fakeFile = { name: 'synthetic-untrusted.xlsx', size: 10_000_000 } as File;
  const weekly = await parseWochenplanExcel(fakeFile);
  const yearly = await parseJahresplanExcel(fakeFile, [{ id: 'D', label: 'Deutsch' }]);
  for (const result of [weekly, yearly]) {
    assert.equal(result.success, false);
    assert.match(result.error || '', /Sicherheitsgründen deaktiviert/);
    assert.equal(result.rows.length, 0);
    assert.equal(result.validRows, 0);
  }
});
