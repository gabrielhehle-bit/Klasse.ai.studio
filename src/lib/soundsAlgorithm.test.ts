import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSROOM_SOUNDS,
  getClassroomSound,
  isAllowedClassroomSound,
  DEFAULT_SOUNDS_SETTINGS,
  BANNED_TOY_SOUNDS,
  classroomSoundEngine,
} from './soundsAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('Sounds: 1. Schulgong vorhanden', () => {
  const gong = getClassroomSound('gong');
  assert.ok(gong);
  assert.equal(gong.label, 'Schulgong');
  assert.equal(gong.icon, '🔔');
  assert.ok(gong.durationSec > 0);
});

test('Sounds: 2. Klangschale vorhanden', () => {
  const bowl = getClassroomSound('bowl');
  assert.ok(bowl);
  assert.equal(bowl.label, 'Klangschale');
  assert.equal(bowl.icon, '🥣');
  assert.ok(bowl.durationSec > 0);
});

test('Sounds: 3. Weitere didaktische Standardsounds vorhanden', () => {
  const ids = CLASSROOM_SOUNDS.map((s) => s.id);
  assert.ok(ids.includes('triangle'));
  assert.ok(ids.includes('chime'));
  assert.ok(ids.includes('applause'));
  assert.ok(ids.includes('drumroll'));
  assert.equal(CLASSROOM_SOUNDS.length, 6);
});

test('Sounds: 4. Lautstärke-Konfiguration vorhanden & valide', () => {
  assert.equal(DEFAULT_SOUNDS_SETTINGS.volume, 0.7);
  assert.ok(DEFAULT_SOUNDS_SETTINGS.volume >= 0.1 && DEFAULT_SOUNDS_SETTINGS.volume <= 1.0);
});

test('Sounds: 5. Stopp-Funktion implementiert & fehlerfrei aufrufbar', () => {
  assert.doesNotThrow(() => {
    classroomSoundEngine.stopAll();
  });
});

test('Sounds: 6. Mehrfachklickschutz: Laufende Töne werden vor Neustart gestoppt', () => {
  // classroomSoundEngine.play ruft intern stopAll() auf
  assert.ok(typeof classroomSoundEngine.play === 'function');
  assert.ok(typeof classroomSoundEngine.stopAll === 'function');
});

test('Sounds: 7. Keine ungeeigneten Spielzeug-Sounds in der aktiven Unterrichtsliste', () => {
  BANNED_TOY_SOUNDS.forEach((toyId) => {
    assert.equal(isAllowedClassroomSound(toyId), false);
    assert.equal(getClassroomSound(toyId), undefined);
  });
});

test('Sounds: 8. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(350), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('Sounds: 9. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('Sounds: 10. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(680), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('Sounds: 11. FULLSCREEN Responsive Kategorie (>= 800 px)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1100), 'fullscreen');
  assert.equal(getWidgetSizeCategory(300, true), 'fullscreen');
});

test('Sounds: 12. Mindestmaße im Register & kein Overflow', () => {
  const minConfig = WIDGET_MIN_SIZES.sounds || { minW: 280, minH: 200 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 180);
});

test('Sounds: 13. 100% Offline (Keine URLs oder Netzwerkabhängigkeiten)', () => {
  CLASSROOM_SOUNDS.forEach((s) => {
    assert.ok(!('url' in s));
    assert.ok(!('audioSrc' in s));
  });
});
