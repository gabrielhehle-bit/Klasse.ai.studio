import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const studentHub = readFileSync('src/components/StudentDossierHub.tsx', 'utf8');
const classHub = readFileSync('src/components/KlasseHub.tsx', 'utf8');
const dossier = readFileSync('src/components/ClassDossier.tsx', 'utf8');

test('Klassendossier ist in der Klassenübersicht und nicht im Schülerdossier', () => {
  assert.match(classHub, /id: 'klassendossier'/);
  assert.match(classHub, /title: 'Schülerdossier'[\s\S]*?title: 'Klassendossier'/);
  assert.match(classHub, /<ClassDossier onSelectStudent=/);
  assert.match(classHub, /Zur Klassenübersicht/);
  assert.doesNotMatch(studentHub, /ClassDossier/);
  assert.doesNotMatch(studentHub, /Klassendossier/);
});

test('Klassendossier bietet Zeitraumfilter inklusive eigenem Zeitraum', () => {
  for (const key of ['today', 'week', '30d', 'month', 'semester', 'year', 'custom']) {
    assert.match(dossier, new RegExp(`key: '${key}'`));
  }
  assert.match(dossier, /data-custom-period/);
  assert.match(dossier, /previousRange/);
  assert.match(dossier, /Was fällt auf\?/);
});

test('Klassendossier zeigt echte Klassenbereiche und Diagramme', () => {
  for (const chart of ['attendance', 'mood', 'participation', 'performance', 'gender', 'religion']) {
    assert.match(dossier, new RegExp(`data-class-chart="${chart}"`));
  }
  assert.match(dossier, /schuelerStimmung/);
  assert.match(dossier, /anwesenheit/);
  assert.match(dossier, /mitarbeitLogs/);
  assert.match(dossier, /notenMeta/);
  assert.match(dossier, /student\.religion/);
  assert.match(dossier, /student\.geschlecht/);
});

test('Klassendossier schützt vertrauliche Notiztexte und verlinkt ins Schülerdossier', () => {
  assert.match(dossier, /Keine vertraulichen Notiztexte/);
  assert.match(dossier, /onSelectStudent\(row\.id\)/);
  assert.doesNotMatch(dossier, /statusLog.*map\(/s);
});
