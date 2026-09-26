import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const noiseMeter = readFileSync('src/components/cockpit/widgets/NoiseMeterWidget.tsx', 'utf8');
const noiseScale = readFileSync('src/components/cockpit/widgets/NoiseScaleWidget.tsx', 'utf8');
const classReward = readFileSync('src/components/cockpit/widgets/ClassRewardWidget.tsx', 'utf8');

test('Batch 4: Lautstaerke- und Klassenziel-Titel kommen aus dem gemeinsamen Katalog', () => {
  assert.equal(getCockpitWidgetDisplayLabel('noisemeter'), '🔊 Lautstärkemesser');
  assert.equal(getCockpitWidgetDisplayLabel('noisescales'), '🤫 Lautstärke-Skala');
  assert.equal(getCockpitWidgetDisplayLabel('klassenglas'), '💎 Klassenziel');

  // The shared frame already owns the visible widget title.
  assert.doesNotMatch(noiseMeter, /Lärmpegel-Messer/);
  assert.doesNotMatch(noiseScale, /Lautstärkevorgabe/);
  assert.doesNotMatch(classReward, />\s*(Klassenglas|Ziel-Thermometer|Klassen-Barometer)\s*<\/h3>/);
});

test('Batch 4: gemeinsame Einstellungen sind fuer Messer und alle Klassenziel-Varianten erreichbar', () => {
  assert.equal(cockpitWidgetSupportsSettings('noisemeter'), true);
  assert.equal(cockpitWidgetSupportsSettings('klassenglas'), true);
  assert.equal(cockpitWidgetSupportsSettings('piggybank'), true);
  assert.equal(cockpitWidgetSupportsSettings('thermometer'), true);
  assert.equal(cockpitWidgetSupportsSettings('classtarget'), true);

  assert.match(classReward, /showSettings: externalShowSettings/);
  assert.match(classReward, /const isSettingsOpen = hasExternalSettingsControl \? externalShowSettings : localSettingsOpen/);
  assert.match(classReward, /!hasExternalSettingsControl && \(/);
  assert.match(classReward, /onCloseSettings\?\.\(\)/);

  for (const type of ['piggybank', 'thermometer', 'classtarget', 'klassenglas']) {
    const expression = new RegExp(
      `case ["']${type}["']:[\\s\\S]{0,2600}<ClassRewardWidget[\\s\\S]{0,2200}showSettings=\\{widgetSettingsOpenId === widget\\.id\\}[\\s\\S]{0,500}onCloseSettings=\\{\\(\\) => setWidgetSettingsOpenId\\(null\\)\\}`,
    );
    assert.match(surface, expression);
  }

  assert.match(
    surface,
    /<NoiseMeterWidgetContent[\s\S]{0,900}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,300}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
});

test('Batch 4: neutrale Hauptaktionen folgen der Profil-Akzentfarbe', () => {
  assert.doesNotMatch(noiseMeter, /indigo-/);
  assert.match(noiseMeter, /bg-accent text-accent-text border-accent/);
  assert.match(noiseMeter, /bg-accent hover:bg-accent-hover text-accent-text/);

  assert.match(classReward, /focus:ring-accent/);
  assert.match(classReward, /bg-accent text-accent-text border-accent/);
  assert.match(
    classReward,
    /id="reward-add-btn"[\s\S]{0,360}bg-accent hover:bg-accent-hover[\s\S]{0,120}text-accent-text/,
  );
  assert.doesNotMatch(
    classReward,
    /id="reward-add-btn"[\s\S]{0,360}from-emerald-500/,
  );
});

test('Batch 4: semantische Hinweise und Datenschutz-Kontext bleiben sichtbar', () => {
  assert.match(noiseMeter, /Offline & Anonym/);
  assert.match(noiseMeter, /ShieldCheck/);

  // Success, goal progress and destructive correction keep their own meaning.
  assert.match(classReward, /goalAchieved[\s\S]{0,260}from-amber-500 to-emerald-500/);
  assert.match(classReward, /from-rose-500 via-amber-500 to-emerald-500/);
  assert.match(classReward, /hover:text-rose-500 hover:bg-rose-500\/10/);

  // Touch targets remain suitable for classroom interaction.
  assert.match(noiseMeter, /min-h-11/);
  assert.match(classReward, /h-11/);
});
