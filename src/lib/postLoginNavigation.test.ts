import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('Login landet einmal auf Heute und gibt Navigation danach wieder frei', () => {
  assert.match(
    appSource,
    /const \[landOnDashboardAfterLogin, setLandOnDashboardAfterLogin\] = useState/,
  );
  assert.match(
    appSource,
    /if \(!landOnDashboardAfterLogin\) return;[\s\S]*setPage\('dashboard'\);[\s\S]*setLandOnDashboardAfterLogin\(false\);/,
  );
  assert.doesNotMatch(
    appSource,
    /const \[landOnDashboardAfterLogin\] = useState/,
    'Der Post-Login-Dashboard-Flag darf nicht als unveränderlicher State die Navigation dauerhaft blockieren.',
  );
});
