import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const report = readFileSync('src/components/Jahresbericht.tsx', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const types = readFileSync('src/types.ts', 'utf8');

test('Jahresbericht: Entwürfe und Freigabestatus liegen im klassenlokalen App-State', () => {
  assert.match(types, /jahresberichte\?: AppState\['jahresberichte'\]/);
  assert.match(types, /reviewStatus\?: 'freigegeben' \| 'nacharbeiten' \| 'offen'/);
  assert.match(appState, /jahresberichte: state\.jahresberichte \? JSON\.parse\(JSON\.stringify\(state\.jahresberichte\)\) : \{\}/);
  assert.match(appState, /parsed\.jahresberichte = activeClass\.jahresberichte \|\| \{\}/);
  assert.match(context, /jahresberichte: nextClass\.jahresberichte/);
  assert.doesNotMatch(report, /localStorage\.setItem\('jb_review_status_v1'/);
});

test('Jahresbericht: Leistungsdaten werden semesterbezogen aus der echten Notenmappe gelesen', () => {
  assert.match(report, /getAnnualGradeLines/);
  assert.match(report, /subjectRecords\?\.\[fach\]\?\.\[semester\]/);
  assert.match(report, /berechne\(app, studentId, fach, semester\)/);
  assert.match(report, /getAssessmentMode\(app, fach\)/);
  assert.doesNotMatch(report, /const finalGrade = data\.endnote/);
});

test('Jahresbericht: KI-Datenbasis enthält keine automatisch übertragenen Diagnosefelder oder Klarnamen', () => {
  assert.match(report, /Diagnosefelder werden nicht automatisch an die KI übertragen/);
  assert.doesNotMatch(report, /fpDiagnosen/);
  assert.doesNotMatch(report, /Vorname: \$\{s\.vorname\}/);
  assert.doesNotMatch(report, /Nachname: \$\{s\.nachname\}/);
  assert.match(report, /Erfinde keine Leistungen, Diagnosen, Eigenschaften, Ereignisse oder Förderbedarfe/);
});

test('Jahresbericht: künstliche Kompetenz-Prozentwerte wurden durch transparente Datenbasis ersetzt', () => {
  assert.match(report, /🔎 Datenbasis/);
  assert.match(report, /nicht in künstliche Kompetenz-Prozentwerte umgerechnet/);
  assert.doesNotMatch(report, /100 - \(dNote - 1\) \* 15/);
  assert.doesNotMatch(report, /\(val\.wert \|\| 3\) \* 23/);
  assert.doesNotMatch(report, /Kompetenz-Scorecard/);
});

test('Jahresbericht: Druck ist lokal, escaped und behauptet keine Amtlichkeit', () => {
  assert.match(report, /const escapeHtml/);
  assert.match(report, /escapeHtml\(b\.inhalt\)/);
  assert.match(report, /iframe\.srcdoc = html/);
  assert.doesNotMatch(report, /document\.write\(html\)/);
  assert.doesNotMatch(report, /fonts\.googleapis\.com/);
  assert.doesNotMatch(report, /Offizieller Übergabe- & Kompetenzbericht/);
  assert.match(report, /Entwurf – vor Weitergabe fachlich und sprachlich prüfen/);
});

test('Jahresbericht: Sammeldruck enthält nur freigegebene Berichte', () => {
  assert.match(report, /berichte\[id\]\?\.reviewStatus === 'freigegeben'/);
  assert.match(report, /Freigegebene drucken/);
});
