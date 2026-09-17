import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const setup = fs.readFileSync('src/components/SetupWizard.tsx', 'utf8');
const setupCore = fs.readFileSync('src/components/SetupWizardCore.tsx', 'utf8');
const settings = fs.readFileSync('src/components/Settings.tsx', 'utf8');

test('Setup bietet den bestehenden E-Mail-Einmalcode-Login optional an', () => {
  assert.match(setup, /EmailAccountLogin/);
  assert.match(setup, /<EmailAccountLogin\s*\/>/);
  assert.match(setup, /Mit E-Mail anmelden/);
  assert.match(setup, /E-Mail-Anmeldung ist optional/);
  assert.match(setup, /Weiter zur Einrichtung/);
});

test('Setup übernimmt den bestehenden Wizard vollständig und überspringt den Konto-Hinweis beim Anlegen einer weiteren Klasse', () => {
  assert.match(setup, /SetupWizardCore/);
  assert.match(setup, /Boolean\(props\.isNewClass\)/);
  assert.match(setup, /<SetupWizardCore \{\.\.\.props\} \/>/);
  assert.match(setupCore, /const STEPS = \[/);
  assert.match(setupCore, /title: 'Profil & Schule'/);
  assert.match(setupCore, /title: 'Zusammenfassung'/);
});

test('Einstellungen behalten E-Mail-Anmeldung unter Konto & Schulmail', () => {
  assert.match(settings, /case 'account'/);
  assert.match(settings, /<AccountSettings/);
  assert.match(settings, /settings-account-login/);
  assert.match(settings, /<EmailAccountLogin\s*\/>/);
});
