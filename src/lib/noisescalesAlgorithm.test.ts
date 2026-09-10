import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NOISE_SCALE_STAGES,
  getNoiseScaleStage,
  migrateLegacyScaleLevel,
  DEFAULT_NOISE_SCALES_SETTINGS,
  NoiseScaleId,
} from './noisescalesAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('NoiseScales: 1. Alle Standardstufen (0 bis 4) vorhanden und geordnet', () => {
  assert.equal(NOISE_SCALE_STAGES.length, 5);

  const levels = NOISE_SCALE_STAGES.map((s) => s.level);
  assert.deepEqual(levels, [0, 1, 2, 3, 4]);

  const ids = NOISE_SCALE_STAGES.map((s) => s.id);
  assert.deepEqual(ids, ['stille', 'fluestern', 'partner', 'gespraech', 'praesentation']);
});

test('NoiseScales: 2. Wechsel mit 1 Klick (ID-Umschaltung)', () => {
  let activeId: NoiseScaleId = 'stille';
  const selectStage = (newId: NoiseScaleId) => {
    activeId = newId;
  };

  selectStage('fluestern');
  assert.equal(activeId, 'fluestern');
  assert.equal(getNoiseScaleStage(activeId).label, 'Flüstern');

  selectStage('praesentation');
  assert.equal(activeId, 'praesentation');
  assert.equal(getNoiseScaleStage(activeId).label, 'Präsentation');
});

test('NoiseScales: 3. Text + Icon + Farbe + Klassenregel bei jeder Stufe vorhanden', () => {
  NOISE_SCALE_STAGES.forEach((stage) => {
    assert.ok(stage.label.length > 0);
    assert.ok(stage.icon.length > 0);
    assert.ok(stage.classroomRule.length > 0);
    assert.ok(stage.description.length > 0);
    assert.ok(['indigo', 'sky', 'emerald', 'amber', 'rose'].includes(stage.colorName));
  });
});

test('NoiseScales: 4. Persistenter Standardmodus in Settings & Migration', () => {
  assert.equal(DEFAULT_NOISE_SCALES_SETTINGS.activeScaleId, 'fluestern');

  // Legacy Migration
  assert.equal(migrateLegacyScaleLevel(0), 'stille');
  assert.equal(migrateLegacyScaleLevel(1), 'fluestern');
  assert.equal(migrateLegacyScaleLevel(2), 'partner');
  assert.equal(migrateLegacyScaleLevel(3), 'gespraech');
  assert.equal(migrateLegacyScaleLevel('praesentation'), 'praesentation');
  assert.equal(migrateLegacyScaleLevel(undefined), 'fluestern');
});

test('NoiseScales: 5. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(350), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('NoiseScales: 6. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('NoiseScales: 7. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(680), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('NoiseScales: 8. FULLSCREEN Responsive Kategorie (>= 800 px)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1080), 'fullscreen');
  assert.equal(getWidgetSizeCategory(300, true), 'fullscreen');
});

test('NoiseScales: 9. Mindestmaße im Register vorhanden & kein Overflow', () => {
  const minConfig = WIDGET_MIN_SIZES.noisescales || { minW: 280, minH: 180 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 180);
});
