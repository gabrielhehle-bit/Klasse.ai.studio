import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Flaggenquiz ist im Cockpit vollständig verdrahtet', () => {
  const types = readFileSync('src/types.ts', 'utf8');
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(types, /'flagquiz'/);
  assert.match(catalog, /type: "flagquiz"/);
  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"flagquiz",/);
  assert.match(cockpit, /id: "widget-flagquiz",[\s\S]{0,180}w: 48,[\s\S]{0,80}h: 56/);
  assert.match(cockpit, /case "flagquiz":[\s\S]*FlagQuizWidgetContent/);
  assert.match(cockpit, /w\.type === "flagquiz" && updates\.settings/);
  assert.match(widget, /flagquiz: \{ w: 48, h: 56 \}/);
});

test('Flaggenquiz ist Smartboard-tauglich und ohne KI-Abhängigkeit', () => {
  const source = readFileSync('src/components/cockpit/FlagQuizWidgetContent.tsx', 'utf8');

  assert.match(source, /min-h-11/);
  assert.match(source, /min-h-14/);
  assert.match(source, /bg-accent/);
  assert.match(source, /text-accent/);
  assert.doesNotMatch(source, /askAI|generateWidgetTasks|Gemini|OpenAI/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce)/);
});

test('Flaggenquiz bietet Kontinent, Einfach, Mittel, Schwer und Alle', () => {
  const source = readFileSync('src/components/cockpit/FlagQuizWidgetContent.tsx', 'utf8');

  assert.match(source, /Alle Kontinente/);
  assert.match(source, /FLAG_QUIZ_DIFFICULTY_LABELS/);
  assert.match(source, /Einfach/);
  assert.match(source, /Mittel/);
  assert.match(source, /Schwer/);
});

test('Flaggenquiz-Hilfe erklärt Datenbasis und Filter', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /flagquiz: \['Öffne im Lehrercockpit/);
  assert.match(help, /Kontinent/);
  assert.match(help, /Einfach/);
  assert.match(help, /UN-M49/);
});
