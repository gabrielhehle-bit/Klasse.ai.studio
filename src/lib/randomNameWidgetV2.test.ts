import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  eligibleRandomStudents, getRandomNameWidgetPreferences,
  pickRandomStudent, remainingRandomRoundStudents, undoLastRandomPick,
} from './randomNameWidgetModel';

const picker = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const widget = readFileSync('src/components/cockpit/widgets/RandomNameWidget.tsx', 'utf8');

const roster = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: 'synthetic-' + index, vorname: 'Kind ' + index }));

test('Widget 4: independent selection remains the default for existing layouts', () => {
  assert.deepEqual(getRandomNameWidgetPreferences(undefined), {
    selectionMode: 'independent', studentScope: 'present', soundEnabled: true, animationEnabled: true, startSize: 'large',
  });
  assert.deepEqual(getRandomNameWidgetPreferences({
    selectionMode: 'round', studentScope: 'all', soundEnabled: false, animationEnabled: false, startSize: 'compact',
  }), {
    selectionMode: 'round', studentScope: 'all', soundEnabled: false, animationEnabled: false, startSize: 'compact',
  });
  assert.deepEqual(getRandomNameWidgetPreferences({
    selectionMode: 'invalid', startSize: 'huge',
  }), {
    selectionMode: 'independent', studentScope: 'present', soundEnabled: true, animationEnabled: true, startSize: 'large',
  });
});

test('Widget 4: fair rounds select all 17/25/30 eligible pupils once and then stop', () => {
  for (const count of [1, 17, 25, 30]) {
    const participants = roster(count);
    const drawn: string[] = [];
    while (true) {
      const remaining = remainingRandomRoundStudents(participants, drawn);
      if (remaining.length === 0) break;
      const selected = pickRandomStudent(remaining, null, () => 0);
      assert.ok(selected);
      assert.ok(!drawn.includes(selected.id));
      drawn.push(selected.id);
    }
    assert.equal(drawn.length, count);
    assert.equal(new Set(drawn).size, count);
    assert.deepEqual(remainingRandomRoundStudents(participants, drawn), []);
    assert.equal(pickRandomStudent(remainingRandomRoundStudents(participants, drawn), null), null);
  }
});

test('Widget 4: attendance and lesson exclusions remove pupils from the fair round without overwriting them', () => {
  const pupils = roster(17);
  const absent = pupils[0].id;
  const paused = pupils[1].id;
  const present = pupils.filter(student => student.id !== absent);
  const eligible = eligibleRandomStudents(present, [paused]);
  assert.equal(eligible.length, 15);
  assert.equal(remainingRandomRoundStudents(eligible, [pupils[2].id]).length, 14);
  assert.equal(pupils.length, 17, 'original class roster is unchanged');
  assert.ok(remainingRandomRoundStudents(eligible, []).every(student => student.id !== absent && student.id !== paused));
});

test('Widget 4: undo restores last fair round participant and previous public selection', () => {
  const before = ['synthetic-1', 'synthetic-2', 'synthetic-3'];
  const undo = undoLastRandomPick(before);
  assert.deepEqual(undo, { drawnIds: ['synthetic-1', 'synthetic-2'], previousSelectedId: 'synthetic-2' });
  assert.equal(remainingRandomRoundStudents(roster(4), undo.drawnIds).some(student => student.id === 'synthetic-3'), true);
  assert.deepEqual(undoLastRandomPick([]), { drawnIds: [], previousSelectedId: null });
  assert.deepEqual(before, ['synthetic-1', 'synthetic-2', 'synthetic-3'], 'undo does not mutate original history');
});

test('Widget 4: central library settings gear stays separate from transient session history', () => {
  assert.match(picker, /aria-label="Widget-Voreinstellungen öffnen"/);
  assert.match(picker, /<option value="randomname">🎯 Zufälliges Kind<\/option>/);
  assert.match(picker, /group\.label} hinzufügen/);
  assert.match(picker, /cockpitRandomNameDefaultsByClass/);
  assert.match(picker, /Auf vorhandenes Widget anwenden/);
  assert.match(picker, /saveRandomPreset\("selectionMode", mode\)/);
  assert.match(picker, /saveRandomPreset\("soundEnabled", event\.target\.checked\)/);
  assert.match(picker, /type === "randomname" && !useOld/);
  assert.match(widget, /remainingRandomRoundStudents\(eligibleStudents, drawnIds\)/);
  assert.match(widget, /setDrawnIds\(\[\]\)/);
  assert.match(widget, /Neue Runde/);
  assert.match(widget, /Letzte Ziehung zurücknehmen/);
  assert.match(widget, /live\.scopeKey !== initialPool\.scopeKey/);
  assert.doesNotMatch(widget, /onUpdate\?\.\(\{[\s\S]*drawnIds/);
});

test('Widget 4: pupils with equal first name and initial remain individually identifiable without revealing internal IDs', () => {
  assert.match(widget, /function getUnambiguousPickerName/);
  assert.match(widget, /getUnambiguousPickerName\(student, allStudents\)/);
  assert.match(widget, /sameFull\.findIndex\(child => child\.id === student\.id\)/);
  assert.doesNotMatch(widget, /\{student\.id\}<\/span>/);
});

test('Widget 4: central attendance scope is predictable and invalid scope falls back to present-only', () => {
  assert.equal(getRandomNameWidgetPreferences(undefined).studentScope, 'present');
  assert.equal(getRandomNameWidgetPreferences({ studentScope: 'all' }).studentScope, 'all');
  assert.equal(getRandomNameWidgetPreferences({ studentScope: 'invalid' }).studentScope, 'present');
  assert.match(picker, /saveRandomPreset\("studentScope", scope\)/);
  assert.match(picker, /Wer soll gezogen werden\?/);
  assert.match(widget, /const selectableStudents: typeof presentStudents = studentScope === 'all' \? allStudents : presentStudents/);
  assert.match(widget, /randomSelectionPage\(selectableStudents, selectorPage, pageSize\)/);
  assert.match(widget, /live\.studentScope !== initialPool\.studentScope/);
});
