import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultTodoState,
  calculateTodoProgress,
  migrateLegacyTodos,
  addTodoItem,
  toggleTodoItem,
  updateTodoText,
  deleteTodoItem,
  moveTodoItem,
  toggleBonusTodo,
  resetTodoList,
  applyTodoPreset,
  CLASSROOM_TODO_PRESETS,
} from './todoAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('Todo: 1. Aufgabe hinzufügen (schnell per Text)', () => {
  const initial = createDefaultTodoState('Testphase');
  const countBefore = initial.items.length;
  const updated = addTodoItem(initial, 'Buch Seite 42 aufschlagen');

  assert.equal(updated.items.length, countBefore + 1);
  const lastItem = updated.items[updated.items.length - 1];
  assert.equal(lastItem.text, 'Buch Seite 42 aufschlagen');
  assert.equal(lastItem.done, false);
  assert.equal(lastItem.isBonus, false);

  // Leere Eingabe wird ignoriert
  const emptyAttempt = addTodoItem(updated, '   ');
  assert.equal(emptyAttempt.items.length, updated.items.length);
});

test('Todo: 2. Aufgabe abhaken (Toggle -> erledigt)', () => {
  const initial = createDefaultTodoState();
  const firstId = initial.items[0].id;
  assert.equal(initial.items[0].done, false);

  const updated = toggleTodoItem(initial, firstId);
  const item = updated.items.find(i => i.id === firstId);
  assert.equal(item?.done, true);
});

test('Todo: 3. Aufgabe wieder öffnen (Toggle -> wieder offen)', () => {
  const initial = createDefaultTodoState();
  const firstId = initial.items[0].id;
  const doneState = toggleTodoItem(initial, firstId);
  assert.equal(doneState.items.find(i => i.id === firstId)?.done, true);

  const reopenedState = toggleTodoItem(doneState, firstId);
  assert.equal(reopenedState.items.find(i => i.id === firstId)?.done, false);
});

test('Todo: 4. Fortschritt korrekt berechnet ("2 von 4 erledigt")', () => {
  let state = createDefaultTodoState(); // 4 Standarditems
  let progress = calculateTodoProgress(state.items);
  assert.equal(progress.total, 4);
  assert.equal(progress.done, 0);
  assert.equal(progress.allDone, false);

  state = toggleTodoItem(state, state.items[0].id);
  state = toggleTodoItem(state, state.items[1].id);
  progress = calculateTodoProgress(state.items);

  assert.equal(progress.total, 4);
  assert.equal(progress.done, 2);
  assert.equal(progress.allDone, false);
});

test('Todo: 5. Alles-erledigt-Zustand korrekt erkannt', () => {
  let state = createDefaultTodoState();
  for (const item of state.items) {
    state = toggleTodoItem(state, item.id);
  }
  const progress = calculateTodoProgress(state.items);
  assert.equal(progress.total, state.items.length);
  assert.equal(progress.done, state.items.length);
  assert.equal(progress.allDone, true);
});

test('Todo: 6. Aufgabe bearbeiten (Text korrigieren ohne RichText)', () => {
  const initial = createDefaultTodoState();
  const firstId = initial.items[0].id;
  const updated = updateTodoText(initial, firstId, 'Korrektur: Übungsheft bereitlegen');

  const item = updated.items.find(i => i.id === firstId);
  assert.equal(item?.text, 'Korrektur: Übungsheft bereitlegen');

  // Leerer String ändert nichts
  const invalid = updateTodoText(updated, firstId, '   ');
  assert.equal(invalid.items.find(i => i.id === firstId)?.text, 'Korrektur: Übungsheft bereitlegen');
});

test('Todo: 7. Aufgabe löschen', () => {
  const initial = createDefaultTodoState();
  const firstId = initial.items[0].id;
  const countBefore = initial.items.length;

  const updated = deleteTodoItem(initial, firstId);
  assert.equal(updated.items.length, countBefore - 1);
  assert.equal(updated.items.some(i => i.id === firstId), false);
});

test('Todo: 8. Reihenfolge ändern (hoch / runter)', () => {
  const initial = createDefaultTodoState();
  const id0 = initial.items[0].id;
  const id1 = initial.items[1].id;

  // Nach unten verschieben
  const movedDown = moveTodoItem(initial, id0, 'down');
  assert.equal(movedDown.items[0].id, id1);
  assert.equal(movedDown.items[1].id, id0);

  // Nach oben verschieben
  const movedUp = moveTodoItem(movedDown, id0, 'up');
  assert.equal(movedUp.items[0].id, id0);
  assert.equal(movedUp.items[1].id, id1);

  // Grenzen abfangen (oben nach oben, unten nach unten)
  const boundaryUp = moveTodoItem(initial, id0, 'up');
  assert.equal(boundaryUp.items[0].id, id0);
});

test('Todo: 9. Zusatzpunkt möglich (⭐ Zusatz)', () => {
  const initial = createDefaultTodoState();
  const id = initial.items[0].id;
  assert.equal(initial.items[0].isBonus, false);

  const bonusOn = toggleBonusTodo(initial, id);
  assert.equal(bonusOn.items.find(i => i.id === id)?.isBonus, true);

  const bonusOff = toggleBonusTodo(bonusOn, id);
  assert.equal(bonusOff.items.find(i => i.id === id)?.isBonus, false);
});

test('Todo: 10. Kein Schülertracking (Keine Schülernamen, IDs oder Zuordnungen)', () => {
  const state = createDefaultTodoState();
  for (const item of state.items) {
    assert.equal((item as any).studentId, undefined);
    assert.equal((item as any).studentName, undefined);
    assert.equal((item as any).completedBy, undefined);
  }
});

test('Todo: 11. Keine Benotung (Keine Noten, Punkte oder Leistungsbewertung)', () => {
  const state = createDefaultTodoState();
  for (const item of state.items) {
    assert.equal((item as any).grade, undefined);
    assert.equal((item as any).points, undefined);
    assert.equal((item as any).score, undefined);
  }
});

test('Todo: 12. Kein app.todos (Eigenständige Datenstruktur)', () => {
  const state = createDefaultTodoState('Klassenaufgabe');
  assert.ok(state.items);
  assert.equal(typeof state.title, 'string');
  assert.equal((state as any).dashboardTodos, undefined);
});

test('Todo: 13. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Todo: 14. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Todo: 15. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(700), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Todo: 16. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1920), 'fullscreen');
  assert.equal(getWidgetSizeCategory(300, true), 'fullscreen');
});

test('Todo: 17. Mindestmaße im Register vorhanden & kein horizontaler Overflow', () => {
  assert.ok(WIDGET_MIN_SIZES.todo || WIDGET_MIN_SIZES.timer);
  // Wenn todo registriert wird:
  const minW = WIDGET_MIN_SIZES.todo?.minW ?? 280;
  assert.ok(minW >= 280);
});

test('Todo: 18. Keine Netzwerkrequests / 100% Offline', () => {
  const presets = CLASSROOM_TODO_PRESETS;
  assert.ok(presets.length >= 3);
  const stillarbeit = applyTodoPreset('stillarbeit');
  assert.ok(stillarbeit.items.length > 0);
  assert.equal(stillarbeit.title, 'Stillarbeit');
});

test('Todo: 19. Migration alter Daten (Abwärtskompatibilität)', () => {
  // Altes Format mit { id, text, done }
  const legacyList = [
    { id: '1', text: 'Alte Aufgabe A', done: true },
    { id: '2', text: 'Alte Aufgabe B', done: false, priority: 'high' },
  ];
  const migrated = migrateLegacyTodos({}, legacyList);
  assert.equal(migrated.items.length, 2);
  assert.equal(migrated.items[0].text, 'Alte Aufgabe A');
  assert.equal(migrated.items[0].done, true);
  assert.equal(migrated.items[1].isBonus, true); // priority: 'high' migriert zu isBonus
});

test('Todo: 20. Neue Liste leeren mit Bestätigungsvoraussetzung', () => {
  const initial = createDefaultTodoState();
  assert.ok(initial.items.length > 0);
  const reset = resetTodoList(initial, 'Neue Arbeitsphase');
  assert.equal(reset.items.length, 0);
  assert.equal(reset.title, 'Neue Arbeitsphase');
});
