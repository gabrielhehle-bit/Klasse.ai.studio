import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initialAppState, normalizeAppState } from './appState';
import { hasCompletedInitialSetup, shouldShowInitialDashboardTour } from './firstRunFlow';
import { SETTINGS_HELP, PAGE_HELP, WIDGET_HELP } from './helpContent';
import { AVAILABLE_MODULES } from './settingsModuleCatalog';

const read = (path: string) => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const core = read('src/components/SetupWizardCore.tsx');
const tour = read('src/components/WelcomeTour.tsx');
const general = read('src/components/settings/GeneralSettings.tsx');
const settings = read('src/components/Settings.tsx');
const header = read('src/components/settings/SettingsHeader.tsx');
const home = read('src/components/settings/SettingsDashboard.tsx');
const help = read('src/components/settings/HelpCenter.tsx');

test('First visit: no saved class gets setup before dashboard or tour', () => {
  assert.equal(hasCompletedInitialSetup(initialAppState), false);
  assert.equal(hasCompletedInitialSetup({ classes: [], klassenbezeichnung: ' ', schueler: [] }), false);
  assert.equal(hasCompletedInitialSetup({ classes: [{ name: '1a' }], klassenbezeichnung: '', schueler: [] }), true);
  assert.equal(hasCompletedInitialSetup({ classes: [], klassenbezeichnung: '4b', schueler: [] }), true);
  assert.match(app, /const needsFirstSetup = !hasCompletedInitialSetup\(app\)/);
  assert.match(app, /if \(needsFirstSetup \|\| showSetup \|\| currentPage === 'setup'/);
  assert.match(app, /isNewClass=\{!needsFirstSetup && currentPage === 'setup_new'\}/);
  assert.doesNotMatch(app, /<InitialModeModal\s*\/>/);
  assert.doesNotMatch(app, /<DashboardTour\s*\/>/);
});

test('After completing the first setup, exactly the dashboard tour is eligible', () => {
  assert.equal(shouldShowInitialDashboardTour(true, false, false, false, 'dashboard'), true);
  for (const [setup, firstLogin, completed, stored, page] of [
    [false, false, false, false, 'dashboard'],
    [true, true, false, false, 'dashboard'],
    [true, false, true, false, 'dashboard'],
    [true, false, false, true, 'dashboard'],
    [true, false, false, false, 'setup'],
    [true, false, false, false, 'cockpit'],
  ] as const) {
    assert.equal(shouldShowInitialDashboardTour(setup, firstLogin, completed, stored, page), false);
  }
  assert.match(core, /classes: \[mainClass\], activeClassId: classId, firstLogin: false, tourAbgeschlossen: false/);
  assert.match(core, /if \(isFirstSetup\) \{[\s\S]*?clearOnboardingCompleted\(\)/);
  assert.match(tour, /shouldShowInitialDashboardTour\(/);
  assert.match(tour, /markOnboardingCompleted\(\)/);
  assert.match(general, /Tour erneut starten/);
  assert.match(general, /currentPage: 'dashboard'/);
});

test('Normalization respects deliberately pending or manually restarted welcome tour with children', () => {
  const normalized = normalizeAppState({
    ...initialAppState,
    klassenbezeichnung: '1a',
    activeClassId: '1a',
    classes: [{ id: '1a', name: '1a', schueler: [{ id: 'kid-1', vorname: 'Test' }] }],
    schueler: [{ id: 'kid-1', vorname: 'Test' }],
    firstLogin: false,
    tourAbgeschlossen: false,
  });
  assert.equal(normalized.tourAbgeschlossen, false);
  const completed = normalizeAppState({ ...normalized, tourAbgeschlossen: true });
  assert.equal(completed.tourAbgeschlossen, true);
});

test('Hilfe lists every configurable app page, every selectable cockpit widget and all settings pages', () => {
  for (const module of AVAILABLE_MODULES) {
    const entry = PAGE_HELP.find(topic => topic.id === module.id);
    assert.ok(entry, 'missing help for ' + module.id);
    assert.ok(entry!.canDo.length > 20, module.id);
    assert.ok(entry!.steps.length >= 2, module.id);
  }
  assert.ok(WIDGET_HELP.length >= 108, 'Current cockpit widget picker should be fully covered');
  assert.equal(new Set(WIDGET_HELP.map(topic => topic.id)).size, WIDGET_HELP.length);
  assert.ok(WIDGET_HELP.every(topic => topic.steps.length >= 3 && topic.purpose.trim()), 'Every widget must have an actual guide');
  for (const category of ['overview', 'account', 'general', 'display', 'modules', 'sync', 'backup', 'support', 'advanced', 'hilfe']) {
    assert.ok(SETTINGS_HELP.some(topic => topic.id === category), 'missing settings guide: ' + category);
  }
  assert.match(header, /id: 'help', label: 'Hilfe'/);
  assert.match(home, /id: 'help' as SettingsCategory/);
  assert.match(settings, /activeCategory === 'help' && <HelpCenter/);
  assert.match(help, /type="search"/);
  assert.match(help, /topic\.steps\.map/);
  assert.match(help, /WIDGET_HELP/);
});
