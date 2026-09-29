import test from 'node:test';
import assert from 'node:assert/strict';
import type { AppState } from '../types';
import { getActiveClassContext } from './activeClassContext';

const appState = (overrides: Partial<AppState>): AppState => ({
  activeClassId: '',
  classes: [],
  schueler: [],
  demoModusAktiv: false,
  ...overrides,
} as AppState);

test('active class context keeps an empty active roster empty', () => {
  const context = getActiveClassContext(appState({
    activeClassId: 'class-empty',
    klassenbezeichnung: '3b',
    classes: [{ id: 'class-empty', name: '3b', schueler: [] }] as AppState['classes'],
    schueler: [],
  }));

  assert.equal(context.classId, 'class-empty');
  assert.equal(context.className, '3b');
  assert.equal(context.studentCount, 0);
  assert.deepEqual(context.students, []);
  assert.equal(context.isDemoData, false);
  assert.equal(context.permissions.canRead, true);
  assert.equal(context.permissions.canEdit, true);
});

test('missing active class never reuses a root roster as a hidden fallback', () => {
  const context = getActiveClassContext(appState({
    activeClassId: '',
    schueler: [{ id: 'legacy-1', vorname: 'Mia', nachname: 'Test' }] as AppState['schueler'],
  }));

  assert.equal(context.classId, null);
  assert.equal(context.studentCount, 0);
  assert.equal(context.error, 'Keine aktive Klasse ausgewählt.');
});

test('demo data is explicit and read-only in the resolved context', () => {
  const context = getActiveClassContext(appState({
    activeClassId: 'demo-class',
    demoModusAktiv: true,
    schueler: [{ id: 'demo-1', vorname: 'Mia', nachname: 'Demo' }] as AppState['schueler'],
  }));

  assert.equal(context.studentCount, 1);
  assert.equal(context.isDemoData, true);
  assert.equal(context.permissions.canEdit, false);
});
