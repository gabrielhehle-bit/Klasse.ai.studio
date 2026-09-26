import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ClassMascotArtwork from '../components/cockpit/ClassMascotArtwork';
import {
  DEFAULT_CLASS_MASCOT,
  normalizeClassMascot,
} from './classMascot';
import { accountSyncState } from './accountSyncService';
import { initialAppState, syncActiveClass } from './appState';

const settings = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
const widget = readFileSync('src/components/cockpit/ClassMascotWidget.tsx', 'utf8');
const quickbar = readFileSync('src/lib/cockpitQuickbar.ts', 'utf8');

test('Maskottchen-Livepegel ist standardmäßig aus und sicher normalisiert', () => {
  const defaults = normalizeClassMascot();
  assert.equal(defaults.liveNoiseEnabled, false);
  assert.equal(defaults.liveNoiseThreshold, 65);
  assert.equal(defaults.liveNoiseSensitivity, 'normal');

  assert.equal(normalizeClassMascot({ liveNoiseEnabled: true }).liveNoiseEnabled, true);
  assert.equal(normalizeClassMascot({ liveNoiseThreshold: 5 }).liveNoiseThreshold, 35);
  assert.equal(normalizeClassMascot({ liveNoiseThreshold: 120 }).liveNoiseThreshold, 90);
  assert.equal(normalizeClassMascot({ liveNoiseSensitivity: 'high' }).liveNoiseSensitivity, 'high');
  assert.equal(normalizeClassMascot({ liveNoiseSensitivity: 'invalid' as any }).liveNoiseSensitivity, 'normal');
});

test('Maskottchen-Einstellungen bieten Livepegel, Schwelle, Empfindlichkeit und klare Datenschutzinfo', () => {
  assert.match(settings, /Live-Pegel & Ohren-Reaktion/);
  assert.match(settings, /liveNoiseEnabled/);
  assert.match(settings, /liveNoiseThreshold/);
  assert.match(settings, /liveNoiseSensitivity/);
  assert.match(settings, /Reaktion ab/);
  assert.match(settings, /kein dB-Messwert/);
  assert.match(settings, /kein Ton aufgenommen, gespeichert oder übertragen/);
});

test('Livepegel bleibt lokal und löst die Ohren-Pose erst oberhalb der gewählten Schwelle aus', () => {
  assert.match(widget, /navigator\?\.mediaDevices\?\.getUserMedia/);
  assert.match(widget, /calculateRawVolume/);
  assert.match(widget, /computeSmoothedVolume/);
  assert.match(widget, /getSensitivityMultiplier/);
  assert.match(widget, /threshold - 8/);
  assert.match(widget, /coveringEars=\{coveringEars && !state\.quietMode\}/);
  assert.match(widget, /data-mascot-live-noise=\{noisePermission\}/);
  assert.doesNotMatch(widget, /localStorage|sessionStorage|fetch\(|MediaRecorder|audio\.src|Blob\(/);
});

test('Alle vier Maskottchen können sichtbar die Ohren zuhalten', () => {
  for (const kind of ['otter', 'dog', 'cat', 'elf'] as const) {
    const markup = renderToStaticMarkup(React.createElement(ClassMascotArtwork, {
      kind,
      mood: 'happy',
      name: 'Test',
      coveringEars: true,
    }));
    assert.match(markup, /data-mascot-noise-reaction="covering-ears"/);
  }
});

test('Livepegel-Einstellungen reisen verschlüsselt mit der Klasse, der aktuelle Messwert aber nicht', () => {
  const mascot = {
    ...DEFAULT_CLASS_MASCOT,
    liveNoiseEnabled: true,
    liveNoiseThreshold: 75,
    liveNoiseSensitivity: 'high' as const,
  };
  const app = syncActiveClass({
    ...initialAppState,
    activeClassId: 'A',
    klassenbezeichnung: 'A',
    classes: [{ id: 'A', name: 'A', stufe: 1, schueler: [] } as any],
    classMascot: mascot,
  });
  const synced = accountSyncState(app);
  assert.equal(synced.classes[0].classMascot?.liveNoiseEnabled, true);
  assert.equal(synced.classes[0].classMascot?.liveNoiseThreshold, 75);
  assert.equal(synced.classes[0].classMascot?.liveNoiseSensitivity, 'high');
  assert.equal('liveVolume' in (synced.classes[0].classMascot || {}), false);
});

test('Maskottchen ist ausdrücklich als Widget-Leisten-Ziel vorhanden', () => {
  assert.match(quickbar, /pet: \{ icon: '🐾', label: 'Maskottchen' \}/);
});
