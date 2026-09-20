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
  for (const hiddenField of ['behavior_notes', 'behavior_comments', 'studentNotes', 'diagnostik', 'geburtstag', 'schuelerStimmung', 'getBehaviorSymbol']) {
    assert.doesNotMatch(source, new RegExp('(?:app\\.|student\\.|prev\\.|\\{)\\s*' + hiddenField));
  }
  assert.match(source, /const showBehavior = app\.boardSettings\?\.showStudentBehaviorInPluspoints === true/);
  assert.match(source, /const stageId = showBehavior/);
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

test('Kompakte Cockpit-Seitenleiste zeigt alle 17 echten Kinder in einem zweispaltigen Raster', () => {
  const pupils = Array.from({ length: 17 }, (_, index) => ({
    id: `student-${index}`, vorname: `Kind${index + 1}`, nachname: 'Beispiel',
  })) as unknown as Student[];
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: { activeClassId: 'class-a', schueler: pupils } as unknown as AppState,
    sidebarCompact: true,
    getTodayPoints: () => 1,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  assert.match(teaching, /sidebarCompact=\{sidebarMode === "mini"\}/);
  assert.match(html, /grid-cols-2/);
  assert.match(html, /Unsere Pluspunkte · 17/);
  for (let i = 1; i <= 17; i++) assert.match(html, new RegExp(`Kind${i}(?!\\d)`));
  assert.equal((html.match(/Pluspunkt für/g) || []).length, 17);
  assert.doesNotMatch(html, /overflow-hidden.*role="list"/);
});

test('kindgerechte Pluspunkte-Karten behalten die vollständige 17-Kinder-Ansicht und zeigen nur öffentliche Daten', () => {
  const students = Array.from({ length: 17 }, (_, index) => ({
    id: `id-${index}`, vorname: `Kind${index + 1}`, nachname: 'Beispiel',
    emoji: index === 0 ? '🦊' : undefined,
  })) as unknown as Student[];
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: { activeClassId: 'class-test', schueler: students,
      behavior_status: { 'id-0': 'PRIVATE_STOP' },
      behavior_notes: { 'id-0': 'PRIVATE_COMMENT' },
    } as unknown as AppState,
    getTodayPoints: () => 2,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  assert.match(html, /🦊/);
  assert.match(html, /🧑‍🎓/);
  assert.doesNotMatch(html, /🌈/);
  assert.match(html, /border-sky-200 bg-sky-50/);
  assert.match(html, /⭐ 2/);
  assert.equal((html.match(/Pluspunkt für/g) || []).length, 17);
  assert.doesNotMatch(html, /PRIVATE_STOP|PRIVATE_COMMENT/);
});

test('Verhalten wird erst nach bewusster Lehrperson-Einstellung auf der öffentlichen Schülerliste sichtbar', () => {
  const pupils = Array.from({ length: 17 }, (_, index) => ({
    id: `pupil-${index}`, vorname: `Kind${index + 1}`, nachname: 'Beispiel',
  })) as unknown as Student[];
  const base = {
    activeClassId: 'test-class',
    schueler: pupils,
    behavior_default_stage_id: '3',
    behavior_stages: [
      { id: '1', label: 'Super', icon: '🌟', color: 'bg-emerald-500' },
      { id: '3', label: 'OK', icon: '😐', color: 'bg-slate-400' },
      { id: '5', label: 'Stopp', icon: '🚫', color: 'bg-rose-500' },
    ],
    behavior_status: { 'pupil-0': '5' },
    behavior_notes: { 'pupil-0': 'NICHT_OEFFENTLICHE_NOTIZ' },
    schuelerNotizen: { 'pupil-0': 'VERTRAULICH' },
  };
  const render = (enabled?: boolean) => renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: { ...base, boardSettings: enabled === undefined ? {} : { showStudentBehaviorInPluspoints: enabled } } as unknown as AppState,
    getTodayPoints: () => 2,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  const off = render();
  assert.doesNotMatch(off, /Verhaltensstatus:|Stopp|🚫/);
  const switchedOff = render(false);
  assert.doesNotMatch(switchedOff, /Verhaltensstatus:|Stopp|🚫/);
  const on = render(true);
  assert.match(on, /Verhaltensstatus: Stopp/);
  assert.match(on, /Verhaltensstatus: OK/);
  assert.match(on, /🚫/);
  assert.equal((on.match(/Pluspunkt für/g) || []).length, 17);
  for (const value of ['NICHT_OEFFENTLICHE_NOTIZ', 'VERTRAULICH']) assert.doesNotMatch(on, new RegExp(value));
  assert.match(teaching, /Verhalten anzeigen/);
  assert.match(teaching, /onBehaviorStageChange=\{setStudentBehavior\}/);
  assert.match(teaching, /showStudentBehaviorInPluspoints: event\.target\.checked/);
});

test('Die sehr schmale Schülerliste zeigt optional nur das Verhalten-Emoji, nicht zusätzliche lange Etiketten', () => {
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: { activeClassId: 'test-class', schueler: [{ id: 's1', vorname: 'Mila', nachname: 'Muster' }],
      boardSettings: { showStudentBehaviorInPluspoints: true },
      behavior_status: { s1: '5' },
      behavior_stages: [{ id: '5', label: 'Stopp', icon: '🚫', color: 'bg-rose-500' }],
    } as unknown as AppState,
    sidebarCompact: true,
    getTodayPoints: () => 0,
    addParticipation: () => {},
    removeParticipation: () => {},
  }));
  assert.match(html, /Verhaltensstatus: Stopp/);
  assert.match(html, /🚫/);
  assert.doesNotMatch(html, />Stopp<\/span>/);
});

test('Mit einem Klick kann die Lehrperson die sichtbare Verhaltensstufe ändern', () => {
  const actions: Array<[string, string]> = [];
  const html = renderToStaticMarkup(React.createElement(PublicStudentListWidget, {
    app: {
      activeClassId: 'class-a',
      schueler: [{ id: 's1', vorname: 'Lena', nachname: 'Muster' }],
      boardSettings: { showStudentBehaviorInPluspoints: true },
      behavior_status: { s1: '3' },
      behavior_stages: [
        { id: '1', label: 'Super', icon: '🌟', color: 'bg-green-500' },
        { id: '2', label: 'Gut', icon: '❤️', color: 'bg-sky-500' },
        { id: '3', label: 'OK', icon: '😐', color: 'bg-slate-500' },
        { id: '4', label: 'Achtung', icon: '⚠️', color: 'bg-amber-500' },
        { id: '5', label: 'Stopp', icon: '🚫', color: 'bg-red-500' },
      ],
    } as unknown as AppState,
    getTodayPoints: () => 1,
    addParticipation: () => {},
    removeParticipation: () => {},
    onBehaviorStageChange: (id, stage) => actions.push([id, stage]),
  }));
  assert.match(html, /Verhalten von Lena eine Stufe verbessern/);
  assert.match(html, /Verhalten von Lena eine Stufe weiterstellen/);
  assert.match(html, /Verhaltensstatus: OK/);
  assert.doesNotMatch(html, /🌈/);
  assert.equal(actions.length, 0, 'Rendering must never mutate behavior');
  assert.match(teaching, /recordClassroomBehaviorStage\(prev, sid, stageId\)/);
});
