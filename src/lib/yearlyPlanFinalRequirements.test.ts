import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..');
const yearly = readFileSync(join(src, 'components', 'YearlyPlan.tsx'), 'utf8');
const excel = readFileSync(join(src, 'lib', 'planerExcelService.ts'), 'utf8');

test('Jahresplanung: Vollbild und Excel-Roundtrip bleiben vorhanden', () => {
  assert.match(yearly, /setIsFullscreen/);
  assert.match(yearly, /Vollbild/);
  assert.match(yearly, /JahresplanExcelModal/);
  const printCenter = readFileSync(join(src, 'components', 'PrintCenter.tsx'), 'utf8');
  assert.match(printCenter, /generateJahresplanTemplate/);
  assert.match(printCenter, /downloadYearlyPlanCsv/);
  assert.match(yearly, /activePrintTemplate: 'jahresplanung'/);
  assert.doesNotMatch(yearly, /window\.print\(\)|generateJahresplanTemplate\(/);
});

test('Jahresplanung: Import nutzt verlustfreie Mehrfachthemen-Logik', () => {
  assert.match(yearly, /applyYearPlanImportRows/);
  assert.match(yearly, /yearPlanCellEntries/);
  assert.match(yearly, /yearPlanCellDisplayText/);
  assert.doesNotMatch(
    yearly,
    /newJahresplanung\[kw\]\[subjId\]\s*=\s*\{[\s\S]{0,500}thema:\s*row\.thema/,
  );
});

test('Jahresplanung: Schulwochen-Anzeigen berücksichtigen Bundesland und echtes Wochenjahr', () => {
  assert.match(yearly, /weeks\.find\(w => w\.kw === editingCell\.kw\)/);
  assert.match(yearly, /getSW\(week\.monday, app\?\.schuljahr, app\?\.bundesland \|\| 'VBG'\)/);
  assert.match(yearly, /weeks\.find\(w => w\.kw === s\.kw\)/);
  assert.match(yearly, /getSW\(suggestionWeek\.monday, app\?\.schuljahr, app\?\.bundesland \|\| 'VBG'\)/);
  assert.match(excel, /getSchulstartKW\(app\.schuljahr, bundesland\)/);
});

test('Jahresplanung: Excel-Import bleibt bis zum gepatchten Parser gesperrt', () => {
  assert.match(excel, /export async function parseJahresplanExcel/);
  assert.match(excel, /Der Excel-Import ist vorübergehend aus Sicherheitsgründen deaktiviert/);
  assert.doesNotMatch(excel, /XLSX\.read\(/, 'ungeprüfte Excel-Dateien dürfen nicht eingelesen werden');
  assert.match(excel, /resolveJahresplanSubjectId/);
  assert.doesNotMatch(excel, /return availableSubjects\[0\]\?\.id/);
});


test('Jahresplanung: Verschieben nutzt echte Unterrichtswochen statt KW plus eins', () => {
  assert.match(yearly, /shiftYearPlanSubjectForward/);
  assert.match(yearly, /orderedTeachingKws/);
  assert.doesNotMatch(yearly, /let nextKw = currentKw \+ 1/);
});


test('Jahresplanung: leere Zellen bleiben echte leere Zellen', () => {
  assert.match(
    yearly,
    /const isDraggable = !!data && !!\(/,
  );
  assert.doesNotMatch(
    yearly,
    /const isDraggable = !!\(data\?\.items\?\.length > 0 \|\| data\?\.thema \|\| data\?\.buch \|\| data\?\.type !== 'standard'\)/,
  );
});
