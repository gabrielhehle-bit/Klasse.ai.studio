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
  assert.match(yearly, /generateJahresplanTemplate/);
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

test('Jahresplanung: Schulwochen-Anzeigen berücksichtigen das Bundesland', () => {
  assert.match(
    yearly,
    /getSW\(kwToMonday\(editingCell\.kw,[\s\S]{0,180}app\?\.bundesland \|\| 'VBG'\)/,
  );
  assert.match(
    yearly,
    /getSW\(kwToMonday\(s\.kw,[\s\S]{0,180}app\?\.bundesland \|\| 'VBG'\)/,
  );
  assert.match(
    excel,
    /getSchulstartKW\(app\.schuljahr, bundesland\)/,
  );
});

test('Jahresplanung: Excel verlangt Fach und Thema statt stille Fehlzuordnung', () => {
  assert.match(excel, /if \(!fachKey \|\| !themaKey\)/);
  assert.match(excel, /resolveJahresplanSubjectId/);
  assert.doesNotMatch(excel, /return availableSubjects\[0\]\?\.id/);
});
