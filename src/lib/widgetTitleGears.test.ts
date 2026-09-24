import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const header = read('src/components/cockpit/CockpitWidget.tsx');
const board = read('src/components/Unterrichtsmodus.tsx');
const zahlenraum = read('src/components/cockpit/widgets/ZahlenraumStudio.tsx');
const kopfrechnen = read('src/components/cockpit/widgets/KopfrechenStudio.tsx');
const fractions = read('src/components/cockpit/widgets/FractionVisualizer.tsx');
const timer = read('src/components/cockpit/widgets/TimerWidget.tsx');
const noise = read('src/components/cockpit/widgets/NoiseMeterWidget.tsx');

test('The real widget configuration gear is a keyboard-accessible button immediately beside the title', () => {
  const title = header.indexOf('cockpit-widget-title');
  const gear = header.indexOf('Widget-specific configuration lives behind the gear');
  const menu = header.indexOf('Compact widget menu: editing stays inside the widget');
  assert.ok(title >= 0 && title < gear && gear < menu);
  assert.match(header, /aria-expanded=\\{settingsOpen\\}/);
  assert.match(header, /onSettingsToggle\\(\\)/);
  assert.ok(!header.slice(menu).includes('<span>Einstellungen</span>'), 'Do not hide configuration in overflow menu');
});

test('Maths 17–19: the gear opens settings rather than resizing the widget or doing nothing', () => {
  for (const type of ['zahlenraum', 'numberline', 'kopfrechnen', 'fractionvisualizer']) {
    assert.ok(board.includes('"' + type + '"'), 'Missing header gear for ' + type);
  }
  for (const name of ['ZahlenraumStudioContent', 'KopfrechenStudioContent', 'FractionVisualizerContent']) {
    const index = board.indexOf('<' + name + '\\n');
    assert.ok(index >= 0, 'Missing maths widget ' + name);
    assert.match(board.slice(index, index + 680), /showSettings=\\{widgetSettingsOpenId === widget\\.id\\}/);
    assert.match(board.slice(index, index + 800), /onCloseSettings=\\{\\(\\) => setWidgetSettingsOpenId\\(null\\)\\}/);
  }
  assert.match(zahlenraum, /\\{showSettings && <div[\\s\\S]*?id="zahlenraum-toolbar"/);
  assert.match(kopfrechnen, /const showSettingsDrawer = showSettings;/);
  assert.match(fractions, /\\{showSettings && <div role="group" aria-label="Bruchdarstellung einstellen"/);
});

test('Existing timer and noise meter gear opens a real settings panel', () => {
  for (const name of ['TimerWidgetContent', 'NoiseMeterWidgetContent']) {
    const index = board.indexOf('<' + name + '\\n');
    assert.ok(index >= 0);
    assert.match(board.slice(index, index + 750), /showSettings=\\{widgetSettingsOpenId === widget\\.id\\}/);
  }
  assert.match(timer, /const showSettings = externalShowSettings \\?\\? localShowSettings/);
  assert.match(noise, /\\{showSettings && \\(\\s*<div role="region" aria-label="Lärmmesser-Einstellungen"/);
});
