import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRAFFIC_LIGHT_MODES,
  DEFAULT_TRAFFIC_LIGHT_SETTINGS,
  getTrafficLightMode,
  migrateLegacyAmpelStatus,
  validateNeutrality,
} from './trafficlightAlgorithm';
import {
  WIDGET_MIN_SIZES,
  getWidgetSizeCategory,
} from '../components/cockpit/widgetLayout';

test('Trafficlight: 1. Zuhören darstellbar', () => {
  const zuhören = getTrafficLightMode('zuhören');
  assert.equal(zuhören.id, 'zuhören');
  assert.equal(zuhören.label, 'Stopp & Zuhören');
  assert.equal(zuhören.icon, '✋');
  assert.equal(zuhören.colorName, 'rose');
  assert.ok(zuhören.description.includes('Augen nach vorne'));
});

test('Trafficlight: 2. Leise arbeiten darstellbar', () => {
  const leise = getTrafficLightMode('leise');
  assert.equal(leise.id, 'leise');
  assert.equal(leise.label, 'Leise arbeiten');
  assert.equal(leise.icon, '🤫');
  assert.equal(leise.colorName, 'amber');
  assert.ok(leise.description.includes('Einzelarbeit'));
});

test('Trafficlight: 3. Austausch darstellbar', () => {
  const austausch = getTrafficLightMode('austausch');
  assert.equal(austausch.id, 'austausch');
  assert.equal(austausch.label, 'Partner- & Gruppenarbeit');
  assert.equal(austausch.icon, '👥');
  assert.equal(austausch.colorName, 'emerald');
});

test('Trafficlight: 4. Statuswechsel & Migration funktioniert', () => {
  // Legacy-Migration
  assert.equal(migrateLegacyAmpelStatus('rot'), 'zuhören');
  assert.equal(migrateLegacyAmpelStatus('gelb'), 'leise');
  assert.equal(migrateLegacyAmpelStatus('gruen'), 'austausch');
  assert.equal(migrateLegacyAmpelStatus('pause'), 'pause');

  // Direkter Modus
  assert.equal(migrateLegacyAmpelStatus('leise'), 'leise');
});

test('Trafficlight: 5. Farbe nicht allein (Text + Icon + Farbe + Erklärung)', () => {
  TRAFFIC_LIGHT_MODES.forEach((m) => {
    assert.ok(m.label.length > 0, 'Jeder Modus muss Text haben');
    assert.ok(m.icon.length > 0, 'Jeder Modus muss Icon haben');
    assert.ok(m.colorName.length > 0, 'Jeder Modus muss Farbzuweisung haben');
    assert.ok(m.description.length > 0, 'Jeder Modus muss Erklärungstext haben');
  });
});

test('Trafficlight: 6. Kein Verhaltenstracking / Neutrale Arbeitsmodi', () => {
  assert.ok(validateNeutrality('zuhören'));
  assert.ok(validateNeutrality('leise'));
  assert.ok(validateNeutrality('austausch'));
  assert.ok(validateNeutrality('pause'));

  // Es gibt keine schlechte Bewertung:
  const redMode = getTrafficLightMode('zuhören');
  assert.equal(redMode.label, 'Stopp & Zuhören');
  assert.ok(!redMode.label.includes('schlecht'));
  assert.ok(!redMode.description.includes('laut'));
});

test('Trafficlight: 7. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Trafficlight: 8. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Trafficlight: 9. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(650), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Trafficlight: 10. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(400, true), 'fullscreen');
});

test('Trafficlight: 11. Kein horizontaler Overflow & Mindestmaße im Register', () => {
  assert.ok(WIDGET_MIN_SIZES.trafficlight);
  assert.ok(WIDGET_MIN_SIZES.trafficlight.minW <= 280);
});
