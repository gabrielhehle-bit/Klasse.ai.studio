import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  cockpitWidgetSupportsSettings,
  getCockpitWidgetDisplayLabel,
} from './cockpitWidgetCatalog';

const surface = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const legacyContents = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
const wheel = readFileSync('src/components/cockpit/widgets/WheelWidget.tsx', 'utf8');
const scoreboard = readFileSync('src/components/cockpit/widgets/ScoreboardWidget.tsx', 'utf8');
const stars = readFileSync('src/components/cockpit/widgets/StarsReviewWidget.tsx', 'utf8');

test('Batch 7: interaktive Widgets behalten kanonische Titel', () => {
  assert.equal(getCockpitWidgetDisplayLabel('wheel'), '🎡 Glücksrad');
  assert.equal(getCockpitWidgetDisplayLabel('scoreboard'), '🏆 Gruppen-Punkte');
  assert.equal(getCockpitWidgetDisplayLabel('starsreview'), '⭐ Sterne der Woche');

  assert.doesNotMatch(scoreboard, />\s*Team-Scoreboard\s*</);
  assert.doesNotMatch(stars, /Unsere gesammelten Sterne/);
});

test('Batch 7: gemeinsames Zahnrad steuert Glücksrad, Gruppen-Punkte und Sterne', () => {
  for (const id of ['wheel', 'scoreboard', 'starsreview']) {
    assert.equal(cockpitWidgetSupportsSettings(id), true);
  }

  assert.match(wheel, /showSettings: externalShowSettings/);
  assert.match(wheel, /const showConfigModal = externalShowSettings === true \|\| localShowConfigModal/);
  assert.match(wheel, /!hasExternalSettingsControl/);
  assert.match(legacyContents, /WheelWidgetContent: React\.FC<WheelWidgetProps>/);
  assert.match(legacyContents, /<WheelWidget \{\.\.\.props\} \/>/);

  assert.match(scoreboard, /showSettings: externalShowSettings/);
  assert.match(scoreboard, /const showSettingsMenu = externalShowSettings === true \|\| localShowSettingsMenu/);
  assert.match(scoreboard, /!hasExternalSettingsControl/);

  assert.match(stars, /showSettings: externalShowSettings/);
  assert.match(stars, /const showSettings = externalShowSettings === true \|\| localShowSettings/);
  assert.match(stars, /!hasExternalSettingsControl/);

  assert.match(
    surface,
    /<StarsReviewWidget[\s\S]{0,900}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<ScoreboardWidgetContent[\s\S]{0,1200}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
  assert.match(
    surface,
    /<WheelWidgetContent[\s\S]{0,1000}showSettings=\{widgetSettingsOpenId === widget\.id\}[\s\S]{0,250}onCloseSettings=\{\(\) => setWidgetSettingsOpenId\(null\)\}/,
  );
});

test('Batch 7: neutrale Bedienaktionen folgen der Profil-Akzentfarbe', () => {
  assert.doesNotMatch(wheel, /indigo-/);
  assert.match(wheel, /bg-accent hover:bg-accent-hover text-accent-text/);
  assert.match(wheel, /bg-accent-soft border-accent text-accent/);

  assert.doesNotMatch(scoreboard, /indigo-/);
  assert.match(scoreboard, /bg-accent text-accent-text border-accent/);
  assert.match(scoreboard, /bg-accent hover:bg-accent-hover text-accent-text/);

  assert.doesNotMatch(stars, /indigo-/);
  assert.match(stars, /ring-2 ring-accent/);
  assert.match(stars, /border-accent bg-accent text-accent-text/);
  assert.doesNotMatch(stars, /border-2 border-amber-400/);
});

test('Batch 7: Sterne-Rangliste bleibt explizit geschützt', () => {
  assert.match(stars, /Public presentation is opt-in each time the widget opens/);
  assert.match(stars, /setPresenting\(false\)/);
  assert.match(stars, /Namen und Punktzahlen sind erst nach deiner Freigabe auf der Tafel sichtbar/);
  assert.match(stars, /Ergebnisse jetzt zeigen/);
  assert.match(stars, /🔒 Verbergen/);
});


test('Batch 7: Gruppenstruktur ist im Kinderbetrieb gegen versehentliche Änderungen geschützt', () => {
  assert.match(scoreboard, /onClick=\{\(\) => showSettingsMenu && handleStartEdit\(team\)\}/);
  assert.match(scoreboard, /\{showSettingsMenu && teams\.length > MIN_TEAMS && \(/);
  assert.match(scoreboard, /hover:bg-rose-500\/10 hover:text-rose-500/);

  // Point scoring remains directly available on the board.
  assert.match(scoreboard, /onClick=\{\(\) => handleAddPoint\(team\.id\)\}/);
  assert.match(scoreboard, /onClick=\{\(\) => handleCorrectPoint\(team\.id\)\}/);
});

test('Batch 7: semantische Spiel- und Ergebnisfarben bleiben erhalten', () => {
  // Wheel segments intentionally keep a diverse fixed palette.
  assert.match(wheel, /WHEEL_PALETTE/);
  assert.match(wheel, /'#d97706'/);

  // Winner / star semantics remain gold; destructive reset/delete remain rose.
  assert.match(scoreboard, /text-amber-600/);
  assert.match(scoreboard, /bg-rose-50/);
  assert.match(stars, /text-amber-700/);
  assert.match(stars, /text-amber-800/);
  assert.match(stars, /bg-rose-100/);
});

test('Batch 7: zentrale Lehrer- und Kinderaktionen bleiben touchfreundlich', () => {
  assert.match(wheel, /min-h-11 min-w-11/);
  assert.match(scoreboard, /min-h-11 min-w-11/);
  assert.match(stars, /min-h-11/);
});
