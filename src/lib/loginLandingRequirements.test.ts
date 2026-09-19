import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');

test('Login: erfolgreiche Anmeldung landet immer auf dem Dashboard', () => {
  assert.match(app, /sessionStorage\.setItem\('klassio_after_login', 'dashboard'\)/);



  assert.match(app, /landOnDashboardAfterLogin \? 'dashboard'/);
  assert.match(app, /sessionStorage\.removeItem\('klassio_after_login'\)/);
  assert.match(app, /setPage\('dashboard'\);/);
});

test('Login: Setup-Wizard startet nicht mehr automatisch bei leerem App-Zustand', () => {
  assert.match(app, /const \[showSetup, setShowSetup\] = useState\(false\);/);
  assert.doesNotMatch(app, /useState\(!setupAbgeschlossen\)/);
  assert.doesNotMatch(app, /const setupAbgeschlossen = Boolean/);
});

test('Setup bleibt bewusst über Setup-Seiten erreichbar', () => {
  assert.match(app, /currentPage === 'setup'/);
  assert.match(app, /currentPage === 'setup_new'/);
  assert.match(app, /openSetup=\{\(\) => setShowSetup\(true\)\}/);
});
