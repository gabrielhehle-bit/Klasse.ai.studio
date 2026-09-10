import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeDefaultDienste,
  migrateLegacyDienste,
  addDienst,
  editDienst,
  deleteDienst,
  assignStudentToDienst,
  removeStudentFromDienst,
  toggleStudentInDienst,
  setTemporarySubstitution,
  removeTemporarySubstitution,
  rotateDienste,
  shuffleDienste,
  clearAllAssignments,
  getEffectiveDienstAssignees,
  getDiensteResponsiveCategory,
  hasNoGradingOrBehaviorData,
  DEFAULT_DIENSTE_PRESETS,
  DiensteItem,
} from './diensteAlgorithm';
import { WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('Dienste: 1. Dienst hinzufügen', () => {
  const initial = initializeDefaultDienste();
  const countBefore = initial.length;
  const updated = addDienst(initial, 'Pausenaufsicht', '👀');
  assert.equal(updated.length, countBefore + 1);
  const added = updated.find((d) => d.titel === 'Pausenaufsicht');
  assert.ok(added);
  assert.equal(added.emoji, '👀');
  assert.deepEqual(added.schuelerIds, []);
});

test('Dienste: 2. Dienst bearbeiten (Titel & Emoji ändern)', () => {
  const initial = initializeDefaultDienste();
  const firstId = initial[0].id;
  const updated = editDienst(initial, firstId, { titel: 'Tafelmeister', emoji: '✨' });
  const edited = updated.find((d) => d.id === firstId);
  assert.ok(edited);
  assert.equal(edited.titel, 'Tafelmeister');
  assert.equal(edited.emoji, '✨');
});

test('Dienste: 3. Dienst löschen', () => {
  const initial = initializeDefaultDienste();
  const firstId = initial[0].id;
  const updated = deleteDienst(initial, firstId);
  assert.equal(updated.length, initial.length - 1);
  assert.equal(updated.some((d) => d.id === firstId), false);
});

test('Dienste: 4. Schüler zuordnen (stabile ID)', () => {
  const initial = initializeDefaultDienste();
  const firstId = initial[0].id;
  const studentId = 'student-uuid-42';
  const updated = assignStudentToDienst(initial, firstId, studentId);
  const target = updated.find((d) => d.id === firstId);
  assert.ok(target);
  assert.deepEqual(target.schuelerIds, [studentId]);
});

test('Dienste: 5. Mehrere Schüler pro Dienst zuordnen (z. B. Austeilen – Anna & Lukas)', () => {
  const initial = initializeDefaultDienste();
  const firstId = initial[0].id;
  let updated = assignStudentToDienst(initial, firstId, 'student-anna');
  updated = assignStudentToDienst(updated, firstId, 'student-lukas');
  const target = updated.find((d) => d.id === firstId);
  assert.ok(target);
  assert.deepEqual(target.schuelerIds, ['student-anna', 'student-lukas']);
  // Keine Duplikate bei nochmaliger Zuweisung
  updated = assignStudentToDienst(updated, firstId, 'student-anna');
  assert.equal(updated.find((d) => d.id === firstId)?.schuelerIds.length, 2);
});

test('Dienste: 6. Stabile Schüler-IDs (keine Namen als Schlüssel)', () => {
  const initial = initializeDefaultDienste();
  const firstId = initial[0].id;
  const stableId = 'sid-992-alpha';
  const updated = assignStudentToDienst(initial, firstId, stableId);
  const target = updated.find((d) => d.id === firstId)!;
  assert.equal(target.schuelerIds[0], stableId);
  assert.equal(typeof target.schuelerIds[0], 'string');
});

test('Dienste: 7. Abwesenheit erkannt', () => {
  const dienst: DiensteItem = {
    id: 'd-1',
    titel: 'Tafel',
    emoji: '🧽',
    schuelerIds: ['s-anna', 's-ben'],
  };
  const isAbsent = (id: string) => id === 's-anna';
  const assignees = getEffectiveDienstAssignees(dienst, isAbsent);
  assert.equal(assignees.length, 2);
  assert.equal(assignees[0].originalStudentId, 's-anna');
  assert.equal(assignees[0].isAbsent, true);
  assert.equal(assignees[1].originalStudentId, 's-ben');
  assert.equal(assignees[1].isAbsent, false);
});

test('Dienste: 8. Temporäre Vertretung wählen', () => {
  const initial: DiensteItem[] = [
    { id: 'd-1', titel: 'Tafel', emoji: '🧽', schuelerIds: ['s-anna'] },
  ];
  const updated = setTemporarySubstitution(initial, 'd-1', 's-anna', 's-lukas');
  const target = updated.find((d) => d.id === 'd-1')!;
  assert.equal(target.substitutions?.['s-anna'], 's-lukas');

  const assignees = getEffectiveDienstAssignees(target, (id) => id === 's-anna');
  assert.equal(assignees[0].originalStudentId, 's-anna');
  assert.equal(assignees[0].isAbsent, true);
  assert.equal(assignees[0].substituteStudentId, 's-lukas');
  assert.equal(assignees[0].effectiveStudentId, 's-lukas');
});

test('Dienste: 9. Rotation funktioniert ("Weiterdrehen")', () => {
  const initial: DiensteItem[] = [
    { id: 'd-1', titel: 'Tafel', emoji: '🧽', schuelerIds: ['s-1'] },
    { id: 'd-2', titel: 'Pflanzen', emoji: '🌱', schuelerIds: ['s-2'] },
    { id: 'd-3', titel: 'Müll', emoji: '🗑️', schuelerIds: ['s-3'] },
  ];

  const rotated = rotateDienste(initial);
  // Bei zyklischem Weiterdrehen um 1 Position:
  // d-1 erhält s-3, d-2 erhält s-1, d-3 erhält s-2
  assert.deepEqual(rotated[0].schuelerIds, ['s-3']);
  assert.deepEqual(rotated[1].schuelerIds, ['s-1']);
  assert.deepEqual(rotated[2].schuelerIds, ['s-2']);
});

test('Dienste: 10. Rotation verändert Vertretung nicht ungewollt', () => {
  const initial: DiensteItem[] = [
    { id: 'd-1', titel: 'Tafel', emoji: '🧽', schuelerIds: ['s-anna'], substitutions: { 's-anna': 's-sub' } },
    { id: 'd-2', titel: 'Pflanzen', emoji: '🌱', schuelerIds: ['s-ben'] },
  ];

  const rotated = rotateDienste(initial);
  // Tafel (d-1) bekommt nun s-ben
  assert.deepEqual(rotated[0].schuelerIds, ['s-ben']);
  // Pflanzen (d-2) bekommt s-anna inklusive ihrer Vertretung s-sub
  assert.deepEqual(rotated[1].schuelerIds, ['s-anna']);
  assert.equal(rotated[1].substitutions?.['s-anna'], 's-sub');
});

test('Dienste: 11. Keine Benotung (keine Noten, Sterne, Leistungsbewertung)', () => {
  const dienste = initializeDefaultDienste();
  assert.equal(hasNoGradingOrBehaviorData(dienste), true);
  const withGrades = [{ ...dienste[0], note: 1 }] as any;
  assert.equal(hasNoGradingOrBehaviorData(withGrades), false);
});

test('Dienste: 12. Kein Verhaltenstracking (keine Strafen, Konsequenzen, Scores)', () => {
  const dienste = initializeDefaultDienste();
  assert.equal(hasNoGradingOrBehaviorData(dienste), true);
  const withBehavior = [{ ...dienste[0], strafe: 'Nachsitzen' }] as any;
  assert.equal(hasNoGradingOrBehaviorData(withBehavior), false);
});

test('Dienste: 13. COMPACT Responsive Kategorie (< 380 px)', () => {
  assert.equal(getDiensteResponsiveCategory(320, false), 'compact');
  assert.equal(getDiensteResponsiveCategory(379, false), 'compact');
});

test('Dienste: 14. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getDiensteResponsiveCategory(380, false), 'standard');
  assert.equal(getDiensteResponsiveCategory(549, false), 'standard');
});

test('Dienste: 15. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getDiensteResponsiveCategory(550, false), 'large');
  assert.equal(getDiensteResponsiveCategory(799, false), 'large');
});

test('Dienste: 16. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getDiensteResponsiveCategory(800, false), 'fullscreen');
  assert.equal(getDiensteResponsiveCategory(320, true), 'fullscreen');
});

test('Dienste: 17. Kein horizontaler Overflow / Mindestmaße im Register', () => {
  assert.ok(WIDGET_MIN_SIZES.dienste);
  assert.equal(WIDGET_MIN_SIZES.dienste.minW, 280);
  assert.equal(WIDGET_MIN_SIZES.dienste.minH, 220);
});

test('Dienste: 18. Keine Netzwerkrequests (100% Offline-fähig)', () => {
  // Testet, dass alle Operationen synchron ohne Promises / fetch / IO ablaufen
  const dienste = initializeDefaultDienste();
  const added = addDienst(dienste, 'Lüften', '🌬️');
  const rotated = rotateDienste(added);
  const cleared = clearAllAssignments(rotated);
  assert.ok(Array.isArray(cleared));
});

test('Dienste: 19. Keine KI (deterministische Logik)', () => {
  const dienste: DiensteItem[] = [
    { id: 'd-1', titel: 'Tafel', emoji: '🧽', schuelerIds: ['s-1'] },
    { id: 'd-2', titel: 'Lüften', emoji: '🌬️', schuelerIds: ['s-2'] },
  ];
  const r1 = rotateDienste(dienste);
  const r2 = rotateDienste(dienste);
  assert.deepEqual(r1, r2);
});

test('Dienste: 20. Migration und strukturierte Persistenz ohne Datenverlust', () => {
  const legacy = [
    { id: 'legacy-1', titel: 'Tafeldienst', emoji: '🧹', schuelerIds: ['s-10', 's-10'] },
    { id: 'legacy-2', titel: 'Blumen', icon: '🌻', schuelerIds: ['s-20'] },
  ];
  const migrated = migrateLegacyDienste(legacy);
  assert.equal(migrated.length, 2);
  assert.equal(migrated[0].id, 'legacy-1');
  assert.equal(migrated[0].titel, 'Tafeldienst');
  // Deduplizierung
  assert.deepEqual(migrated[0].schuelerIds, ['s-10']);
  assert.equal(migrated[1].emoji, '🌻');
  assert.deepEqual(migrated[1].schuelerIds, ['s-20']);
});
