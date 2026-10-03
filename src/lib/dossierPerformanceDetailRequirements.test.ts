import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dossier = readFileSync('src/components/dossier/DossierLeistungen.tsx', 'utf8');

test('Leistungsdetail: Fachnavigation und vier Kernwerte stehen in einem kompakten ersten Block', () => {
  assert.match(dossier, /data-dossier-performance-header/);
  assert.match(dossier, /data-dossier-performance-glance/);
  assert.match(dossier, /Bewertungsstand/);
  assert.match(dossier, />Nachweise</);
  assert.match(dossier, />Mitarbeit</);
  assert.match(dossier, />Hausübungen</);
  assert.match(dossier, /aria-label="Fach auswählen"/);
  assert.match(dossier, /Leistungsnachweis eintragen/);
  assert.ok(dossier.indexOf('data-dossier-performance-glance') < dossier.indexOf('<DossierAssessmentChart'));
});

test('Leistungsdetail: ausführliche Mitarbeit und Hausübungen sind vertiefend statt dauerhaft groß', () => {
  assert.match(dossier, /data-dossier-performance-everyday/);
  assert.match(dossier, /Mitarbeit & Hausübungen im Detail/);
  assert.match(dossier, /Mitarbeit in \$\{s\.fach\}/);
  assert.match(dossier, /Hausübungen in \$\{s\.fach\}/);
  assert.match(dossier, /Letzte Änderungen/);
  assert.match(dossier, /Nur dokumentiert/);
  assert.match(dossier, /In Bewertung aktiv/);
});

test('Leistungsdetail: Punktebasis wird im Gesamtstand nicht als rohe Punktesumme missverstanden', () => {
  assert.match(dossier, /% · Punktebasis/);
  assert.doesNotMatch(dossier, /% \(Punkte\)/);
  assert.match(dossier, /getShowPointsPercent/);
  assert.match(dossier, /item\.score/);
  assert.match(dossier, /item\.maxScore/);
});
