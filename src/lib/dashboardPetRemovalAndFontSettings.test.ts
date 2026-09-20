import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Dashboard: kein dauerhaftes Haustier, keine Begleiter-Karten oder Aktivierungsoption mehr', () => {
  const src = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.doesNotMatch(src, /import ClassPetWidget|MemoizedClassPetWidget|showClassPet\s*\?|showClassPet:\s*false/);
  assert.doesNotMatch(src, /setDashboardSettings\(\(prev: any\) => \(\{ \.\.\.prev, showClassPet/);
  assert.match(src, /<MemoizedDashboardKlassenglasWidget \/>/);
});

test('Lehrercockpit: Schriftauswahl gehört in Farben und Design und speichert nur nach Auswahl', () => {
  const picker = readFileSync('src/components/UnterrichtsmodusThemePicker.tsx', 'utf8');
  assert.match(picker, /Schriftart im Lehrercockpit/);
  assert.match(picker, /id="cockpit-font-choice"/);
  assert.match(picker, /onChange=\{\(event\) => \{/);
  assert.match(picker, /boardSettings: \{ \.\.\.prev\.boardSettings, activeFont: chosenFont \}/);
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(cockpit, /setIsThemePickerOpen\(true\)/);
  assert.match(cockpit, /app\.boardSettings\?\.activeFont \|\|/);
});
