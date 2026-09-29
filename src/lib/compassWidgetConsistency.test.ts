import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function compassSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const CompassWidgetContent');
  const end = source.indexOf('// ==========================================', start + 40);
  assert.ok(start >= 0 && end > start, 'CompassWidgetContent must exist');
  return source.slice(start, end);
}

test('Geographie-Kompass nutzt gemeinsame Zahnrad-Einstellungen und atomare Persistenz', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = compassSource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"compass",/);
  assert.match(cockpit, /case "compass":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(cockpit, /w\.type === "compass" && updates\.settings/);
  assert.match(source, /Geographie-Kompass-Einstellungen/);
  assert.match(source, /4 Haupthimmelsrichtungen/);
  assert.match(source, /8 Richtungen/);
  assert.match(source, /Gradangaben/);
});

test('Geographie-Kompass ist touchfreundlich, ruhig und akzentfarben-konsistent', () => {
  const source = compassSource();

  assert.match(source, /min-h-11/);
  assert.match(source, /bg-accent/);
  assert.match(source, /text-accent/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce)/);
  assert.doesNotMatch(source, /text-\[(?:6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
  assert.doesNotMatch(source, /quizScore|quizStreak|Punkte:|Serie!/);
});

test('Geographie-Kompass entfernt Wegwerf-Audio und sachlich problematische Alttexte', () => {
  const source = compassSource();
  const model = readFileSync('src/lib/compassWidgetModel.ts', 'utf8');

  assert.doesNotMatch(source, /AudioContext|createOscillator|speechSynthesis/);
  assert.doesNotMatch(model, /Äquator|Eisbären|Winterurlaub|herrlich heiß|im Norden ist sie nie/i);
  assert.match(model, /je nach Jahreszeit/);
  assert.match(model, /nach Norden ausgerichteten Karte/);
});

test('Übungsmodus wechselt die Aufgabe nicht bei jeder Richtungswahl', () => {
  const source = compassSource();

  assert.doesNotMatch(source, /\[settings\.directionSet, directions, angle, resetPractice\]/);
  assert.match(source, /const selectDirection = \(nextAngle: number\) => \{[\s\S]*setAngle\(nextAngle\)/);
  assert.match(source, /const nextPractice = \(\) => \{[\s\S]*createCompassPracticeRound/);
  assert.match(source, /Noch nicht\. Du hast/);
  assert.match(source, /Nächste Aufgabe/);
});

test('Geographie-Kompass startet kompakter und kann bei Bedarf vergrößert werden', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-compass",[\s\S]{0,180}w: 34,[\s\S]{0,80}h: 40/);
  assert.match(widget, /compass: \{ w: 34, h: 40 \}/);
});

test('Geographie-Kompass-Hilfe erklärt Erkunden, Üben und die jahreszeitliche Sonnenabweichung', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /compass: \['Öffne im Lehrercockpit/);
  assert.match(help, /Wähle „Erkunden“/);
  assert.match(help, /Wähle „Erkunden“[\s\S]*„Üben“/);
  assert.match(help, /je nach Jahreszeit nicht exakt im Osten beziehungsweise Westen/);
});
