import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function weekdaysSource() {
  const source = readFileSync('src/components/cockpit/CockpitWidgetContents.tsx', 'utf8');
  const start = source.indexOf('export const WeekdaysWidgetContent');
  const end = source.indexOf('// ==========================================', start + 40);
  assert.ok(start >= 0 && end > start, 'WeekdaysWidgetContent must exist');
  return source.slice(start, end);
}

test('Wochentage-Trainer nutzt Wochentage und Monate mit echtem Datum', () => {
  const source = weekdaysSource();
  const model = readFileSync('src/lib/weekdaysWidgetModel.ts', 'utf8');

  assert.match(source, /Wochentage/);
  assert.match(source, /Monate/);
  assert.match(source, /getCalendarIndexForDate/);
  assert.match(source, /Zurück zu heute/);
  assert.match(model, /WEEKDAY_NAMES/);
  assert.match(model, /MONTH_NAMES/);
});

test('Wochentage-Trainer besitzt ruhigen Erkunden- und Üben-Modus', () => {
  const source = weekdaysSource();

  assert.match(source, /Erkunden/);
  assert.match(source, /Üben/);
  assert.match(source, /Prüfen/);
  assert.match(source, /Nächste Aufgabe/);
  assert.doesNotMatch(source, /Punkte|Streak|Serie!/);
  assert.doesNotMatch(source, /animate-(?:pulse|bounce)/);
});

test('Wochentage-Trainer ist touchfreundlich und nutzt die Akzentfarbe', () => {
  const source = weekdaysSource();

  assert.match(source, /min-h-11/);
  assert.match(source, /bg-accent/);
  assert.match(source, /text-accent/);
  assert.doesNotMatch(source, /indigo-/);
  assert.doesNotMatch(source, /text-\[(?:5|5\.5|6|6\.5|7|7\.5|8|8\.5|9|9\.5)px\]/);
});

test('Wochentage-Trainer hat gemeinsame Zahnrad-Einstellungen und atomare Persistenz', () => {
  const catalog = readFileSync('src/lib/cockpitWidgetCatalog.ts', 'utf8');
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const source = weekdaysSource();

  assert.match(catalog, /COCKPIT_WIDGET_SETTINGS_IDS[\s\S]*"weekdays",/);
  assert.match(cockpit, /w\.type === "weekdays" && updates\.settings/);
  assert.match(cockpit, /case "weekdays":[\s\S]*showSettings=\{widgetSettingsOpenId === widget\.id\}/);
  assert.match(source, /Wochentage-Trainer-Einstellungen/);
  assert.match(source, /Aktuelles Datum/);
});

test('Wochentage-Trainer startet board-first größer', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const widget = readFileSync('src/components/cockpit/CockpitWidget.tsx', 'utf8');

  assert.match(cockpit, /id: "widget-weekdays",[\s\S]{0,180}w: 46,[\s\S]{0,80}h: 56/);
  assert.match(widget, /weekdays: \{ w: 46, h: 56 \}/);
});

test('Wochentage-Trainer-Hilfe erklärt Morgenkreis, Monate und Üben', () => {
  const help = readFileSync('src/lib/helpContent.ts', 'utf8');

  assert.match(help, /weekdays: \['Öffne im Lehrercockpit/);
  assert.match(help, /Wochentage/);
  assert.match(help, /Monate/);
  assert.match(help, /„Üben“/);
});
