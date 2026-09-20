import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMaterialPickupSheet, latestAbsenceRange, pupilAbsentDates } from './materialPickupSheet';

const sample = {
  schuljahr: '2026/27',
  anwesenheit: {
    kindA: {
      '2026-09-17': { 1: 'e', 2: 'e' },
      '2026-09-18': { 1: 'e', 2: 'a' },
      '2026-09-21': { 1: 'e', 2: 'e' },
      '2026-09-22': { 1: 'a', 2: 'a' },
    },
    kindB: { '2026-09-17': { 1: 'a', 2: 'a' } },
  },
  wochenplanung: {
    38: {
      Donnerstag: {
        0: { fach: 'Deutsch', thema: 'Lesen', material: 'Lesebuch S. 4–6', housework: 'Arbeitsheft S. 7', erledigt: true },
        1: { fach: 'Mathematik', thema: 'Zahlen', material: 'Mathebuch S. 12', housework: 'S. 13', erledigt: false },
      },
      Freitag: {
        0: { fach: 'Deutsch', thema: 'Diktat', material: 'Heft S. 8', erledigt: true },
        1: { fach: 'Mathematik', thema: 'Im Unterricht besucht', material: 'Buch S. 90', erledigt: true },
      },
    },
    39: { Montag: { 0: { fach: 'Sachunterricht', thema: 'Herbst', material: 'Blatt 1', housework: 'Blatt 2', erledigt: true } } },
  },
  schuelerWochenplaene: {
    plan: {
      kw: 38, schuljahr: '2026/27', datumVon: '2026-09-14', datumBis: '2026-09-18',
      aufgaben: [
        { fach: 'Deutsch', tag: 'Donnerstag', titel: 'Lesen', detail: 'Duplikat', selected: true },
        { fach: 'Deutsch', tag: 'Donnerstag', titel: 'Zusatz-Lesebuch', detail: 'S. 22', originalHousework: 'S. 23', selected: true },
        { fach: 'Mathematik', tag: 'Dienstag', titel: 'Nicht versäumt', detail: 'Geheime Notiz', selected: true },
      ],
    },
  },
} as const;

test('Materialabholung: ausschließlich erfasste Fehltage und Unterrichtsstunden des gewählten Kindes', () => {
  const original = JSON.stringify(sample);
  const result = buildMaterialPickupSheet(sample as any, 'kindA', '2026-09-17', '2026-09-22');
  assert.deepEqual(result.fehltage, ['2026-09-17', '2026-09-18', '2026-09-21']);
  assert.equal(result.tage[0].eintraege[0].material, 'Lesebuch S. 4–6');
  assert.equal(result.tage[0].eintraege[0].hausuebung, 'Arbeitsheft S. 7');
  assert.equal(result.tage[1].eintraege.some(entry => entry.thema === 'Im Unterricht besucht'), false, 'partial-day attendance must filter attended hours');
  assert.equal(result.tage[0].eintraege.some(entry => entry.thema === 'Zusatz-Lesebuch'), true);
  assert.equal(result.tage[0].eintraege.some(entry => entry.material === 'Duplikat'), false);
  assert.equal(JSON.stringify(result).includes('Geheime Notiz'), false);
  assert.equal(JSON.stringify(sample), original, 'projection must not edit class data');
  assert.deepEqual(buildMaterialPickupSheet(sample as any, 'kindB', '2026-09-17', '2026-09-22').fehltage, []);
  assert.deepEqual(buildMaterialPickupSheet(sample as any, 'missing', '2026-09-17', '2026-09-22').tage, []);
});

test('Kein Krankheitsschluss aus Entschuldigung; Feiertage und Anwesenheit werden nicht als Fehlzeit ausgegeben', () => {
  assert.deepEqual(pupilAbsentDates(sample.anwesenheit as any, 'kindA', '2026-09-22', '2026-09-22'), []);
  assert.deepEqual(pupilAbsentDates(sample.anwesenheit as any, 'kindA', '2026-09-25', '2026-09-20'), []);
  assert.deepEqual(latestAbsenceRange(sample.anwesenheit as any, 'kindA', '2026-09-22'), { from: '2026-09-17', to: '2026-09-21' });
  const result = buildMaterialPickupSheet(sample as any, 'kindA', '2026-09-17', '2026-09-22', { onlyDone: true });
  assert.equal(result.tage[0].eintraege.some(entry => entry.thema === 'Zahlen'), false);
  assert.equal(result.tage[0].eintraege.some(entry => entry.thema === 'Zusatz-Lesebuch'), false);
});

test('Ein Blatt, keine stille Kürzung: längerer Zeitraum wird vor Druck explizit erkannt', () => {
  const result = buildMaterialPickupSheet(sample as any, 'kindA', '2026-09-17', '2026-09-21', { maxLessons: 1 });
  assert.equal(result.gekuerzt, true);
  assert.equal(result.tage.flatMap(day => day.eintraege).length, 1);
});

test('Druckzentrum enthält Auswahl, A4-Vorschau, Drucksperre und keine automatische Schriftänderung', () => {
  const content = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  assert.match(content, /id: 'materialabholung'/);
  assert.match(content, /latestAbsenceRange\(app\?\.anwesenheit/);
  assert.match(content, /buildMaterialPickupSheet\(app/);
  assert.match(content, /activeTemplate === 'materialabholung' && !pickupCanPrint/);
  assert.match(content, /case 'materialabholung':/);
  assert.match(content, /Nur ausdrücklich als erledigt markierte Unterrichtsstunden/);
  assert.doesNotMatch(content, /setPrintFontSize\('base'\);\s*return;\s*}\s*if \(bypassOrientationAutoSet\)/);
  const dashboard = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /id: \`materialabholung_\$\{s\.id\}_/);
  assert.match(dashboard, /onClick=\{\(\) => setPage\("drucken"\)\}/);
});
