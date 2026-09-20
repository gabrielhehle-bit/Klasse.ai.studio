import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withClassbookNotes } from './classbookNotes';
import { initialAppState, syncActiveClass, switchClassState } from './appState';
import type { AppState } from '../types';

test('manual classbook additions are independent of generated weekly content', () => {
  const projected = { Deutsch: ['Montag · Thema: Lesen'], 'Besondere Vorkommnisse': [] as string[] };
  const original = JSON.stringify(projected);
  const merged = withClassbookNotes(projected, { Deutsch: 'Eigenes Lesespiel', 'Besondere Vorkommnisse': 'Ausflug' });
  assert.deepEqual(merged.Deutsch, ['Montag · Thema: Lesen', 'Eigener Eintrag: Eigenes Lesespiel']);
  assert.deepEqual(merged['Besondere Vorkommnisse'], ['Eigener Eintrag: Ausflug']);
  assert.equal(JSON.stringify(projected), original);
  assert.deepEqual(withClassbookNotes(projected, { Deutsch: '   ' }).Deutsch, projected.Deutsch);
});

test('classbook notes persist per class and never leak when switching classes', () => {
  const a = {
    ...initialAppState,
    activeClassId: 'class-one',
    classes: [
      { ...initialAppState, id: 'class-one', klassenbuchErgaenzungen: {} },
      { ...initialAppState, id: 'class-two', klassenbuchErgaenzungen: {} },
    ],
    klassenbuchErgaenzungen: { 38: { Deutsch: 'Nur Klasse A' } },
  } as unknown as AppState;
  const synced = syncActiveClass(a);
  assert.equal(synced.classes?.find(c => c.id === 'class-one')?.klassenbuchErgaenzungen?.[38]?.Deutsch, 'Nur Klasse A');
  assert.equal(synced.classes?.find(c => c.id === 'class-two')?.klassenbuchErgaenzungen?.[38]?.Deutsch, undefined);
  const other = switchClassState(synced, 'class-two');
  assert.equal(other.klassenbuchErgaenzungen?.[38]?.Deutsch, undefined);
  const back = switchClassState(other, 'class-one');
  assert.equal(back.klassenbuchErgaenzungen?.[38]?.Deutsch, 'Nur Klasse A');
});

test('weekly classbook and print center both include independent additions', () => {
  const weekly = readFileSync('src/components/WeeklyPlan.tsx', 'utf8');
  const print = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  assert.match(weekly, /withClassbookNotes\(projectWeeklyPlanToClassbook/);
  assert.match(print, /withClassbookNotes\(projectWeeklyPlanToClassbook/);
  assert.match(weekly, /Eigene Ergänzung speichern/);
  assert.match(print, /app\?\.klassenbuchErgaenzungen\?\.\[targetKW\]/);
});
