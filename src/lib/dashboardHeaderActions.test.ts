import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('global header has direct accessible feedback and support actions', () => {
  const source = readFileSync('src/components/Topbar.tsx', 'utf8');
  const headerActions = source.split('{/* Menü „Mehr“ */}')[0];
  assert.match(headerActions, /aria-label="Fehler oder Verbesserung melden"/);
  assert.match(headerActions, /Fehler \/ Verbesserung melden/);
  assert.match(headerActions, /docs\.google\.com\/spreadsheets/);
  assert.match(headerActions, /rel="noopener noreferrer"/);
  assert.match(headerActions, /aria-label="Klassio freiwillig über PayPal unterstützen"/);
  assert.match(headerActions, /setShowSupportModal\(true\)/);
  assert.match(source, /<SupportModal open=\{showSupportModal\}/);
});

test('dashboard header has no redundant customize button, but dashboard customization remains available', () => {
  const appSource = readFileSync('src/App.tsx', 'utf8');
  const overviewSource = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.doesNotMatch(appSource, /open-dashboard-customize/);
  assert.doesNotMatch(appSource, /Dashboard-Layout anpassen/);
  assert.match(overviewSource, /onOpenCustomize=\{\(\) => setShowCustomizePanel\(true\)\}/);
});
