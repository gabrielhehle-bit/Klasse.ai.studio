import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const canva = readFileSync('src/components/CanvaIntegration.tsx', 'utf8');
const server = readFileSync('server.ts', 'utf8');

test('Canva OAuth popup opens synchronously inside user click and verifies connection afterwards', () => {
  const connect = canva.slice(canva.indexOf('const connect = async () =>'), canva.indexOf('const disconnect = async () =>'));
  const popupAt = connect.indexOf("window.open('', 'klassio-canva-oauth'");
  const awaitAt = connect.indexOf("await apiJson('/api/canva/auth-url')");
  assert.ok(popupAt >= 0 && awaitAt > popupAt, 'Popup muss vor erstem await geöffnet werden');
  assert.match(connect, /target\.hostname !== 'www\.canva\.com'/);
  assert.match(connect, /popup\.location\.replace\(target\.toString\(\)\)/);
  assert.match(connect, /popup\.close\(\)/);
  assert.match(canva, /const verified = await refreshStatus\(\)/);
  assert.match(canva, /if \(!verified\.connected\)/);
});

test('Canva design thumbnails are permitted in the image CSP only', () => {
  const line = server.split('\n').find(row => row.includes('"img-src'));
  assert.ok(line?.includes('https://*.canva.com'));
  const connectSrc = server.split('\n').find(row => row.includes('"connect-src'));
  assert.ok(connectSrc && !connectSrc.includes('canva.com'), 'Client does not call Canva APIs directly');
});

test('Canva editor/export popup is opened before async API work; JPEG uses mandatory quality', () => {
  const create = canva.slice(canva.indexOf('const createDesign = async'), canva.indexOf('const exportDesign = async'));
  const exportFn = canva.slice(canva.indexOf('const exportDesign = async'), canva.indexOf('const useDesignInKlassio = async'));
  assert.ok(create.indexOf("window.open('', '_blank'") < create.indexOf("await apiJson('/api/canva/designs'"));
  assert.ok(exportFn.indexOf("window.open('', '_blank'") < exportFn.indexOf("await apiJson('/api/canva/exports'"));
  assert.match(create, /editor\.location\.replace\(target\.toString\(\)\)/);
  assert.match(exportFn, /target\.hostname !== 'export-download\.canva\.com'/);
  assert.match(exportFn, /download\.location\.replace\(target\.toString\(\)\)/);
  assert.match(server, /format === 'jpg' \? \{ quality: 85 \}/);
});

test('PWA must not serve the application shell for the Canva OAuth callback navigation', () => {
  const vite = readFileSync('vite.config.ts', 'utf8');
  assert.match(vite, /navigateFallback:\s*['"]\/index\.html['"]/);
  assert.match(vite, /navigateFallbackDenylist:\s*\[\/\^\\\/api\\\/\//);
  assert.match(server, /app\.get\('\/api\/canva\/callback'/);
  assert.match(server, /CANVA_AUTH_SUCCESS/);
});
