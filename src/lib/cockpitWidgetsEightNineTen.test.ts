import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readClassDienste, dienstPageWindow } from './diensteWidgetModel';
import {
  localDienstDate, setTemporarySubstitution, getEffectiveDienstAssignees,
  rotateDienste, initializeDefaultDienste,
} from './diensteAlgorithm';
import { validateClassGoalInput, nextClassGoalCount } from './classGoalWidgetModel';
import { getTrafficLightMode, migrateLegacyAmpelStatus } from './trafficlightAlgorithm';
import { getNoiseScaleStage } from './noisescalesAlgorithm';

const dutyUI = readFileSync('src/components/cockpit/widgets/DiensteWidget.tsx', 'utf8');
const trafficUI = readFileSync('src/components/cockpit/widgets/TrafficLightWidget.tsx', 'utf8');
const soundUI = readFileSync('src/components/cockpit/widgets/NoiseMeterWidget.tsx', 'utf8');
const goalUI = readFileSync('src/components/cockpit/widgets/ClassRewardWidget.tsx', 'utf8');

test('8 Klassendienste: explicitly emptied assignments remain empty; no demo children', () => {
  assert.deepEqual(readClassDienste([], [{ id: 'other-class', titel: 'Alt', emoji: '⭐', schuelerIds: ['foreign'] }]), []);
  assert.deepEqual(readClassDienste(undefined, []), []);
  assert.equal(readClassDienste(undefined, undefined).length, initializeDefaultDienste().length);
  const real = [{ id: 'ours', titel: 'Tafel', emoji: '🧽', schuelerIds: ['child-1'] }];
  assert.deepEqual(readClassDienste(real, []), real);
  assert.doesNotMatch(dutyUI, /DEFAULT_MOCK_STUDENTS/);
  assert.match(dutyUI, /Array\.isArray\(app\?\.schueler\) \? app\.schueler : \[\]/);
  assert.match(dutyUI, /app\?\.activeClassId, app\?\.dienste/);
});

test('8 Klassendienste: paging reaches every duty without silently hiding items on small board', () => {
  for (const [width, height] of [[300, 250], [400, 380], [650, 500], [900, 690]]) {
    const seen: number[] = [];
    const count = dienstPageWindow(13, width, height, 0).pageCount;
    for (let page = 0; page < count; page++) {
      const win = dienstPageWindow(13, width, height, page);
      for (let i = win.start; i < win.end; i++) seen.push(i);
    }
    assert.deepEqual(seen, Array.from({ length: 13 }, (_, i) => i));
    assert.equal(dienstPageWindow(13, width, height, 999).page, count - 1);
  }
  assert.match(dutyUI, /aria-label="Weitere Klassendienste"/);
});

test('8 Klassendienste: a dated substitute expires tomorrow; dates rotate with duty assignments', () => {
  assert.equal(localDienstDate(new Date(2026, 8, 24, 0, 20)), '2026-09-24');
  const today = '2026-09-24', nextDay = '2026-09-25';
  const start = [{ id: 'a', titel: 'Tafel', emoji: '🧽', schuelerIds: ['x'] },
    { id: 'b', titel: 'Lüften', emoji: '🍃', schuelerIds: ['z'] }];
  const substitute = setTemporarySubstitution(start, 'a', 'x', 'y', today);
  assert.equal(getEffectiveDienstAssignees(substitute[0], () => true, today)[0].substituteStudentId, 'y');
  assert.equal(getEffectiveDienstAssignees(substitute[0], () => true, nextDay)[0].substituteStudentId, undefined);
  const moved = rotateDienste(substitute);
  assert.equal(moved[1].substitutionsDate, today);
  assert.equal(getEffectiveDienstAssignees(moved[1], () => true, today)[0].substituteStudentId, 'y');
  const newDate = setTemporarySubstitution(substitute, 'a', 'x', 'someone-else', nextDay);
  assert.deepEqual(newDate[0].substitutions, { x: 'someone-else' });
});

test('9 Lautstärke & Arbeitsampel: three modes share the existing widget without overriding legacy states', () => {
  assert.match(trafficUI, /\['ampel', 'Arbeitsampel'\]/);
  assert.match(trafficUI, /\['vorgabe', 'Lautstärke'\]/);
  assert.match(trafficUI, /\['pegel', 'Live-Pegel'\]/);
  assert.match(trafficUI, /<NoiseScaleWidget/);
  assert.match(trafficUI, /<NoiseMeterWidget/);
  assert.match(trafficUI, /noiseScaleId: updates\.settings\?\.activeScaleId/);
  assert.match(trafficUI, /noiseSensitivity: updates\.settings\?\.sensitivity/);
  assert.match(trafficUI, /app\?\.ampel_status/);
  assert.match(trafficUI, /aria-pressed=\{isCurrent\}/);
  assert.equal(migrateLegacyAmpelStatus('gruen'), 'austausch');
  assert.equal(getTrafficLightMode('zuhören').label, 'Stopp & Zuhören');
  assert.equal(getNoiseScaleStage('praesentation').level, 4);
  assert.match(soundUI, /requestGenerationRef\.current !== requestGeneration/);
  assert.match(soundUI, /cleanupMediaStream\(stream\)/);
  assert.doesNotMatch(trafficUI, /getUserMedia/);
});

test('10 Klassenziel: invalid targets are rejected without overwriting a saved goal', () => {
  for (const invalid of [0, -1, 1001, 12.5, NaN, Infinity, '20', null]) {
    const result = validateClassGoalInput(invalid);
    assert.equal(result.goal, null);
    assert.ok(result.error);
  }
  assert.deepEqual(validateClassGoalInput(30), { goal: 30, error: '' });
  assert.equal(nextClassGoalCount(0, -1), 0);
  assert.equal(nextClassGoalCount(19, 1), 20);
  let count = 0;
  for (let i = 0; i < 50; i++) count = nextClassGoalCount(count, 1);
  assert.equal(count, 50, 'rapid repeated clicks must each increment once');
  assert.match(goalUI, /nextClassGoalCount\(prev\.klassenglas_count, 1\)/);
  assert.match(goalUI, /nextClassGoalCount\(prev\.klassenglas_count, -1\)/);
  assert.match(goalUI, /validateClassGoalInput\(editGoal\)/);
  assert.match(goalUI, /role="dialog" aria-modal="true" aria-label="Klassenziel anpassen"/);
  assert.match(goalUI, /role="alertdialog" aria-modal="true" aria-label="Klassenziel zurücksetzen"/);
  assert.match(goalUI, /klassenglas_ziel: safeGoal/);
  assert.match(goalUI, /klassenglas_count: 0/);
  assert.doesNotMatch(goalUI, /schuelerId|schuelerName/);
});
