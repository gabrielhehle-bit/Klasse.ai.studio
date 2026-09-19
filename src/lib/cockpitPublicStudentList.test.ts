import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicStudentListWidget } from '../components/cockpit/PublicStudentListWidget';
import type { AppState, Student } from '../types';

const source = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');
const teaching = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');

test('öffentliche Schülerliste zeigt keine privaten Dossier-/Verhaltensangaben', () => {
  assert.match(teaching, /PublicStudentListWidget as StudentListWidgetContent/);
  assert.match(source, /getDisplayStudentName\(student, students\)/);
  for (const hiddenField of ['behavior_status', 'behavior_comments', 'studentNotes', 'diagnostik', 'geburtstag', 'schuelerStimmung', 'getBehaviorSymbol']) {
    assert.doesNotMatch(source, new RegExp('(?:app\\.|student\\.|prev\\.|\\{)\\s*' + hiddenField));
  }
  assert.doesNotMatch(source, /student\.nachname/);
  assert.doesNotMatch(source, /aria-label=.{0,80}(?:Minuspunkt|negatives Verhalten|Notiz vorhanden)/);
});

test('öffentliche Schülerliste korrigiert nur ein in dieser Ansicht bewusst vergebenes Plus', () => {
  assert.match(source, /lastAwardedId === student\.id/);
  assert.match(source, /if \(getTodayPoints\(student\.id\) > 0\) removeParticipation\(student\.id\)/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(source, /app\.activeClassId/);
});

test('Öffentliche Plusliste zeigt 14 echte Kindernamen eindeutig und keine vertraulichen Daten', () => {
  const pupils = Array.from({ length: 14 }, (_, index) => ({
    id: `student-${index}`,
    vorname: index <= 1 ? 'Lena' : `Kind${index}`,
    nachname: index === 0 ? 'Mayer' : index === 1 ? 'Neumann' : 'Beispiel',
    badges: [{ id: `badge-${index}`, icon: 'PRIVAT', name: 'Vertraulich' }],
    geburtstag: '2018-09-19',
  })) as unknown as Student[];
  const app = {
    activeClassId: 'class-a',
    schueler: pupils,
    behavior_status: { 'student-0': 'PRIVAT_STATUS' },
    studentNotes: { 'student-0': 'PRIVAT_NOTIZ' },
  } as unknown as AppState;
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app,
    getTodayPoints: () => 2,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  assert.match(html, /Lena M\./);
  assert.match(html, /Lena N\./);
  assert.match(html, /Kind13/);
  assert.equal((html.match(/Pluspunkt für/g) || []).length, 14);
  for (const secret of ['PRIVAT', 'PRIVAT_STATUS', 'PRIVAT_NOTIZ', '2018-09-19', 'Vertraulich']) {
    assert.doesNotMatch(html, new RegExp(secret));
  }
});

test('Öffentliche Plusliste zeigt für eine tatsächlich leere Klasse keine erfundenen Kinder', () => {
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: { activeClassId: 'class-a', schueler: [] } as unknown as AppState,
    getTodayPoints: () => 0,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  assert.match(html, /keine Kinder angelegt/);
  assert.doesNotMatch(html, /Max|Anna|Lukas|Emma/);
});