import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const server = readFileSync('server.ts', 'utf8');
const prompt = readFileSync('src/components/ReleaseUpdateNotice.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const verify = readFileSync('.github/workflows/production-deploy.yml', 'utf8');
const prereq = readFileSync('.github/workflows/predeployment.yml', 'utf8');

test('release endpoint reads the actually active deployment marker, without returning a stale build version', () => {
  assert.match(server, /app\.get\("\/api\/release"/);
  assert.match(server, /readFileSync\(marker, 'utf8'\)/);
  assert.match(server, /res\.setHeader\('Cache-Control', 'no-store, max-age=0'\)/);
  assert.match(server, /res\.status\(503\)/);
  assert.match(prereq, /VITE_KLASSIO_BUILD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(prereq, /printf '%s\\n' "\$GITHUB_SHA" > KLASSIO_DEPLOYMENT_COMMIT\.txt/);
});

test('live deploy verifies exact release instead of only status ok', () => {
  assert.match(verify, /https:\/\/klassio\.at\/api\/release/);
  assert.match(verify, /jq -e --arg commit "\$RELEASE_SHA" '\.commit == \$commit'/);
});

test('PWA prompt compares client and server and never resets encrypted local data', () => {
  assert.match(prompt, /VITE_KLASSIO_BUILD_SHA/);
  assert.match(prompt, /fetch\('\/api\/release', \{ cache: 'no-store'/);
  assert.match(prompt, /serverCommit === localCommit/);
  assert.match(prompt, /Neue Version laden/);
  assert.match(prompt, /navigator\.serviceWorker\?\.getRegistrations\(\)/);
  assert.doesNotMatch(prompt, /(?:localStorage|indexedDB|localforage)\.(?:clear|delete)/i);
  assert.match(app, /<ReleaseUpdateNotice \/>/);
});
