import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const setup = fs.readFileSync('src/components/SetupWizard.tsx', 'utf8');
const setupCore = fs.readFileSync('src/components/SetupWizardCore.tsx', 'utf8');
const settings = fs.readFileSync('src/components/Settings.tsx', 'utf8');
const accountSettings = fs.readFileSync('src/components/settings/AccountSettings.tsx', 'utf8');

test('Erstes Setup beginnt nach dem Login direkt mit dem Einrichtungsassistenten', () => {
  assert.match(setup, /return <SetupWizardCore \{\.\.\.props\} \/>/);
  assert.doesNotMatch(setup, /<EmailAccountLogin\s*\/>/);
  assert.match(setup, /AccessGate already handled the site's login/);
});

test('E-Mail-Konto kann später unter Einstellungen verbunden werden', () => {
  assert.match(setup, /Einstellungen -> Konto & Schulmail/);
  assert.match(accountSettings, /<EmailAccountLogin/);
});

test('Setup übernimmt den bestehenden Wizard vollständig', () => {
  assert.match(setup, /SetupWizardCore/);
  assert.match(setup, /<SetupWizardCore \{\.\.\.props\} \/>/);
  assert.match(setupCore, /const expertSteps = isEditing/);
  assert.match(setupCore, /title: 'Profil & Schule'/);
  assert.match(setupCore, /title: 'Übersicht'/);
});

test('Einstellungen behalten E-Mail-Anmeldung unter Konto & Schulmail', () => {
  assert.match(settings, /activeCategory === 'account'/);
  assert.match(settings, /<AccountSettings\s*\/>/);
  assert.match(accountSettings, /Konto & Schulmail/);
  assert.match(accountSettings, /<EmailAccountLogin/);
  assert.match(accountSettings, /<SchoolIdentitySettings/);
});
