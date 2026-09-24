import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const server = readFileSync('server.ts','utf8');
const app = readFileSync('src/App.tsx','utf8');
const banner = readFileSync('src/components/ReleaseUpdateNotice.tsx','utf8');
const build = readFileSync('.github/workflows/predeployment.yml','utf8');
const deploy = readFileSync('.github/workflows/production-deploy.yml','utf8');

test('release visibility: server responds with the active deployment marker and no-store', () => {
  assert.match(server, /app\.get\("\/api\/release"/);
  assert.match(server, /KLASSIO_DEPLOYMENT_COMMIT\.txt/);
  assert.match(server, /res\.setHeader\('Cache-Control', 'no-store, max-age=0'\)/);
  assert.match(server, /res\.status\(503\)/);
  assert.match(build, /VITE_KLASSIO_BUILD_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(deploy, /https:\/\/klassio\.at\/api\/release/);
  assert.match(deploy, /\.commit == \$commit/);
});

test('release visibility: outdated PWA sessions get an optional, data-preserving refresh', () => {
  assert.match(app, /<ReleaseUpdateNotice \/>/);
  assert.match(banner, /cache: 'no-store'/);
  assert.match(banner, /serverCommit === localCommit/);
  assert.match(banner, /Neue Version laden/);
  assert.match(banner, /serviceWorker\?\.getRegistrations\(\)/);
  assert.match(banner, /window\.location\.assign/);
  for(const unsafe of ['localStorage.clear(', 'indexedDB.deleteDatabase(', 'caches.delete(', 'window.location.reload()']) {
    assert.ok(!banner.includes(unsafe), unsafe + ' must not run automatically');
  }
});
