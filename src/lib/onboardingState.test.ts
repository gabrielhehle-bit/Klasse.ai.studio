import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ONBOARDING_COMPLETED_KEY,
  clearOnboardingCompleted,
  isOnboardingCompleted,
  markOnboardingCompleted,
} from './onboardingState';

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.has(key) ? values.get(key)! : null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

test('Onboarding-Abschluss bleibt dauerhaft gespeichert, bis er bewusst gelöscht wird', () => {
  const storage = createMemoryStorage();

  assert.equal(isOnboardingCompleted(storage), false);
  markOnboardingCompleted(storage);
  assert.equal(storage.getItem(ONBOARDING_COMPLETED_KEY), '1');
  assert.equal(isOnboardingCompleted(storage), true);

  clearOnboardingCompleted(storage);
  assert.equal(isOnboardingCompleted(storage), false);
});

test('Überspringen und Fertig markieren die Einführung dauerhaft als erledigt', () => {
  const intro = fs.readFileSync('src/components/InitialModeModal.tsx', 'utf8');
  const tour = fs.readFileSync('src/components/WelcomeTour.tsx', 'utf8');

  assert.match(intro, /markOnboardingCompleted\(\)/);
  assert.match(intro, /onboardingCompleted \|\| !app\.firstLogin/);
  assert.match(tour, /markOnboardingCompleted\(\)/);
  assert.match(tour, /!app\.tourAbgeschlossen/);
});

test('Bereits abgeschlossene Alt-Installationen werden in den dauerhaften Marker migriert', () => {
  const intro = fs.readFileSync('src/components/InitialModeModal.tsx', 'utf8');

  assert.match(intro, /!onboardingCompleted && app\.tourAbgeschlossen && !app\.firstLogin/);
  assert.match(intro, /markOnboardingCompleted\(\);\s*return;/);
});

test('Tour kann nur über den vorhandenen bewussten Neustart wieder erscheinen', () => {
  const tour = fs.readFileSync('src/components/WelcomeTour.tsx', 'utf8');
  const generalSettings = fs.readFileSync('src/components/settings/GeneralSettings.tsx', 'utf8');

  assert.match(generalSettings, /Tour erneut starten/);
  assert.match(generalSettings, /tourAbgeschlossen:\s*false/);
  assert.match(generalSettings, /currentPage:\s*'cockpit'/);
  assert.match(tour, /const explicitRestart = onboardingCompleted/);
  assert.match(tour, /app\.currentPage === 'cockpit'/);
});
