import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const plan = readFileSync('src/components/SeatingPlan.tsx','utf8');
const printCenter = readFileSync('src/components/PrintCenter.tsx','utf8');
const context = readFileSync('src/context/AppContext.tsx','utf8');
const appState = readFileSync('src/lib/appState.ts','utf8');

test('Sitzplan: Speichern, Laden, Vorschau, Duplizieren, Standard und Löschen nur in Planen', () => {
  assert.match(plan, /editMode \&\& !presentationMode \&\& \(/);
  for (const item of ['saveCurrentArrangement','loadSavedArrangement','duplicateSavedArrangement',
                      'setDefaultSavedArrangement','removeSavedArrangement','SeatingMiniPreview']) {
    assert.ok(plan.includes(item), `Sitzordnungsfunktion fehlt: ${item}`);
  }
  assert.match(plan, /window\.confirm\('Die gespeicherte Sitzordnung ersetzt den aktuellen Raum/);
  assert.match(plan, /resolveSeatingLayout\(selectedSavedLayout, app\.schueler\.map/);
  assert.match(plan, /pushState\(\);\n    setApp\(previous => \(\{/);
  assert.match(plan, /sitzplanRegeln: previous\.sitzplanRegeln \?\? prev\.sitzplanRegeln/);
});

test('Sitzplanvarianten werden in aktiver Klasse und verschlüsseltem App-State statt ungeschütztem Browser-Speicher geführt', () => {
  assert.match(appState, /sitzplanLayouts: state\.sitzplanLayouts/);
  assert.match(appState, /sitzplanLayouts: targetClass\.sitzplanLayouts/);
  assert.match(context, /sitzplanLayouts: nextClass\.sitzplanLayouts/);
  assert.doesNotMatch(plan, /localStorage\.setItem\('seating_plan_layouts/);
});

test('Sitzplan drucken bleibt ausschließlich im Druckzentrum', () => {
  assert.match(printCenter, /case 'sitzplan':/);
  assert.match(printCenter, /renderSeatingPlanView\(\)/);
  assert.doesNotMatch(plan, /handlePrint/);
  assert.doesNotMatch(plan, /activePrintTemplate: 'sitzplan'/);
});
