import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const hook = readFileSync('src/hooks/useVerifiedSchoolIdentity.ts', 'utf8');

test('Lehrerzimmer steht direkt unter Tools und nur mit verifizierter Schulidentität zur Verfügung', () => {
  assert.match(sidebar, /\{ id: 'tools', label: 'Tools'/);
  assert.match(sidebar, /\{ id: 'lehrerzimmer', label: 'Lehrerzimmer'.*section: 'Tools'/);
  assert.match(sidebar, /item\.id !== 'lehrerzimmer' \|\| hasVerifiedSchoolIdentity/);
  assert.match(sidebar, /const toolsIndex = withoutRoom\.findIndex\(item => item\.id === 'tools'\)/);
  assert.match(sidebar, /withoutRoom\.slice\(0, toolsIndex \+ 1\),\s*room/s);
});

test('Schulidentität wird serverseitig bestätigt und bei Kontoänderung neu geprüft', () => {
  assert.match(hook, /fetch\('\/api\/access\/status'/);
  assert.match(hook, /data\?\.authenticated && data\?\.identity\?\.schoolDomain && data\?\.identity\?\.schoolCode/);
  assert.match(hook, /ACCOUNT_SESSION_CHANGED_EVENT/);
  assert.match(hook, /setVerified\(false\)/);
});
