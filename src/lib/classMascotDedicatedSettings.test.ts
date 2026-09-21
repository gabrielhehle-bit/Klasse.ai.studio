import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Mascot settings are separate from cockpit design', () => {
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  const design = readFileSync('src/components/UnterrichtsmodusThemePicker.tsx', 'utf8');
  const panel = readFileSync('src/components/ClassMascotSettingsPanel.tsx', 'utf8');
  assert.match(cockpit, /setIsMascotSettingsOpen/);
  assert.match(cockpit, /ClassMascotSettingsPanel/);
  assert.match(panel, /MASCOT_OPTIONS/);
  assert.doesNotMatch(design, /MASCOT_OPTIONS/);
});
