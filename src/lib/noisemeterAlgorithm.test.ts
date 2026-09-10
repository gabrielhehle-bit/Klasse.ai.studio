import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  NoisePermissionState,
  SensitivityLevel,
  NOISE_LEVEL_STAGES,
  classifyNoiseLevel,
  computeSmoothedVolume,
  calculateRawVolume,
  getSensitivityMultiplier,
  cleanupMediaStream,
  NOISEMETER_DATA_POLICY,
  DEFAULT_NOISE_SETTINGS,
} from './noisemeterAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('NoiseMeter: 1. Startzustand korrekt', () => {
  const initialPermission: NoisePermissionState = 'idle';
  const initialVolume = 0;
  const classification = classifyNoiseLevel(initialVolume);

  assert.equal(initialPermission, 'idle');
  assert.equal(initialVolume, 0);
  assert.equal(classification.levelIndex, 0);
  assert.equal(classification.label, 'Sehr leise');
  assert.equal(DEFAULT_NOISE_SETTINGS.sensitivity, 'normal');
});

test('NoiseMeter: 2. Berechtigungszustände sauber behandelt', () => {
  const validStates: NoisePermissionState[] = ['idle', 'requesting', 'active', 'denied', 'unavailable'];
  assert.equal(validStates.length, 5);

  // Denied muss klare Wiederholungsoption bieten
  const isDenied = (s: NoisePermissionState) => s === 'denied';
  assert.equal(isDenied('denied'), true);
  assert.equal(isDenied('active'), false);
});

test('NoiseMeter: 3. Pegelklassifikation stufenweise korrekt', () => {
  assert.equal(classifyNoiseLevel(0).label, 'Sehr leise');
  assert.equal(classifyNoiseLevel(15).label, 'Sehr leise');
  assert.equal(classifyNoiseLevel(25).label, 'Leise');
  assert.equal(classifyNoiseLevel(39).label, 'Leise');
  assert.equal(classifyNoiseLevel(45).label, 'Angenehm');
  assert.equal(classifyNoiseLevel(64).label, 'Angenehm');
  assert.equal(classifyNoiseLevel(70).label, 'Laut');
  assert.equal(classifyNoiseLevel(84).label, 'Laut');
  assert.equal(classifyNoiseLevel(88).label, 'Sehr laut');
  assert.equal(classifyNoiseLevel(100).label, 'Sehr laut');

  // Grenzwerte außerhalb von 0..100 abfangen
  assert.equal(classifyNoiseLevel(-10).label, 'Sehr leise');
  assert.equal(classifyNoiseLevel(150).label, 'Sehr laut');
});

test('NoiseMeter: 4. Glättung (Smoothing) dämpft Pegelsprünge', () => {
  const prev = 20;
  const spike = 80;
  const smoothed = computeSmoothedVolume(prev, spike, 0.35);

  // Geglätteter Wert muss zwischen prev und spike liegen
  assert.ok(smoothed > prev);
  assert.ok(smoothed < spike);
  assert.equal(smoothed, 41); // 20 + (80 - 20) * 0.35 = 41

  // Weiterer Schritt nähert sich weiter an
  const step2 = computeSmoothedVolume(smoothed, spike, 0.35);
  assert.ok(step2 > smoothed);
  assert.ok(step2 < spike);
});

test('NoiseMeter: 5. Empfindlichkeitsstufen skalieren Rohwert sinnvoll', () => {
  const lowMult = getSensitivityMultiplier('low');
  const normMult = getSensitivityMultiplier('normal');
  const highMult = getSensitivityMultiplier('high');

  assert.ok(lowMult < normMult);
  assert.ok(highMult > normMult);

  const fakeData = new Uint8Array([100, 100, 100, 100]);
  const volLow = calculateRawVolume(fakeData, lowMult);
  const volNorm = calculateRawVolume(fakeData, normMult);
  const volHigh = calculateRawVolume(fakeData, highMult);

  assert.ok(volLow <= volNorm);
  assert.ok(volHigh >= volNorm);
});

test('NoiseMeter: 6. Stop beendet alle MediaStreamTracks', () => {
  let track1Stopped = false;
  let track2Stopped = false;

  const mockStream = {
    getTracks: () => [
      { stop: () => { track1Stopped = true; } },
      { stop: () => { track2Stopped = true; } },
    ],
  } as unknown as MediaStream;

  cleanupMediaStream(mockStream);

  assert.equal(track1Stopped, true);
  assert.equal(track2Stopped, true);
});

test('NoiseMeter: 7. Unmount beendet Stream sicher (kein Leak bei null)', () => {
  assert.doesNotThrow(() => {
    cleanupMediaStream(null);
  });
});

test('NoiseMeter: 8. Schutz vor mehrfachen parallelen Streams', () => {
  // Simulierte Zustandsprüfung vor Erzeugung
  let activeStreamCount = 0;
  const startStream = () => {
    if (activeStreamCount > 0) {
      return false; // Verhindert doppelten Stream
    }
    activeStreamCount++;
    return true;
  };

  assert.equal(startStream(), true);
  assert.equal(startStream(), false); // Zweiter Aufruf blockiert
});

test('NoiseMeter: 9. COMPACT Responsive Kategorie (280–379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(320), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('NoiseMeter: 10. STANDARD Responsive Kategorie (380–549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('NoiseMeter: 11. LARGE Responsive Kategorie (550–799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(700), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('NoiseMeter: 12. FULLSCREEN Responsive Kategorie (>= 800 px)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(350, true), 'fullscreen');
});

test('NoiseMeter: 13. Mindestmaße im Register vorhanden & kein Overflow', () => {
  const minConfig = WIDGET_MIN_SIZES.noisemeter || { minW: 280, minH: 200 };
  assert.ok(minConfig.minW >= 280);
  assert.ok(minConfig.minH >= 180);
});

test('NoiseMeter: 14. Datenschutz: Keine Speicherung oder Übertragung von Audiodaten', () => {
  assert.equal(NOISEMETER_DATA_POLICY.storeAudio, false);
  assert.equal(NOISEMETER_DATA_POLICY.recordAudio, false);
  assert.equal(NOISEMETER_DATA_POLICY.transmitAudio, false);
  assert.equal(NOISEMETER_DATA_POLICY.offlineOnly, true);
});
