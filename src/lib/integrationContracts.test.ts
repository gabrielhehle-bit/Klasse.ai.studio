import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const canva = readFileSync('src/components/CanvaIntegration.tsx', 'utf8');
const kel = readFileSync('src/components/KELPresentation.tsx', 'utf8');
const vite = readFileSync('vite.config.ts', 'utf8');
const server = readFileSync('server.ts', 'utf8');

test('Canva keeps OAuth popup source validation and all agreed export formats', () => {
  assert.match(canva, /isTrustedOAuthPopupMessage\(event\.origin, event\.source, window\.location\.origin, oauthPopupRef\.current\)/);
  assert.match(canva, /\['pdf', 'png', 'jpg', 'pptx'\]/);
  assert.match(canva, /\/api\/canva\/exports/);
  assert.match(server, /code_challenge_method:\s*'S256'/);
  assert.match(server, /httpOnly:\s*true/);
  assert.match(server, /createCanvaTokenStore\(KLASSIO_DATA_DIR/);
  assert.match(server, /canvaTokenStore\.put\(callbackAccount\.userId, sessionId, tokenData\)/);
  assert.match(server, /callbackAccount\.userId !== flow\.ownerId/);
});

test('KEL PPTX contains only selected assessments and an optional editable chart for comparable scores', () => {
  assert.match(kel, /from 'pptxgenjs'/);
  assert.match(kel, /pptx\.addSlide\(\)/);
  assert.match(kel, /slide\.addChart\(pptx\.ChartType\.bar/);
  assert.match(kel, /sameScale && \(mode === 'grades' \|\| mode === 'percent'\)/);
  assert.match(kel, /chosenAssessments\.map\(item => item\.titel\)/);
  assert.doesNotMatch(kel, /ChartType\.radar|ChartType\.pie/);
  assert.match(kel, /Klassio-KEL-\$\{safeName \|\| 'Praesentation'\}\.pptx/);
  assert.match(kel, /exportSchuelerPDF\(student\.id, app\)/);
});

test('PWA precaches locally bundled PDF.js .mjs workers and keeps API network-only', () => {
  assert.match(vite, /globPatterns:\s*\['\*\*\/\*\.\{js,mjs,css,html,ico,png,svg,woff2\}'\]/);
  assert.match(vite, /urlPattern:\s*\/\\\/api\\\/\.\*\//);
  assert.match(vite, /handler:\s*'NetworkOnly'/);
});
