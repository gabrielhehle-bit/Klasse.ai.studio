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
  assert.match(server, /encryptCanvaTokens/);
});

test('KEL export remains a real PPTX with native editable charts and a PDF handout', () => {
  assert.match(kel, /from 'pptxgenjs'/);
  assert.match(kel, /pptx\.addSlide\(\)/);
  assert.ok((kel.match(/slide\.addChart\(/g) || []).length >= 5, 'native PPTX charts must remain present');
  assert.match(kel, /ChartType\.bar/);
  assert.match(kel, /ChartType\.radar/);
  assert.match(kel, /ChartType\.pie/);
  assert.match(kel, /Klassio-KEL-\$\{safeStudentName \|\| 'Praesentation'\}\.pptx/);
  assert.match(kel, /exportSchuelerPDF\(student\.id, app\)/);
});

test('PWA precaches locally bundled PDF.js .mjs workers and keeps API network-only', () => {
  assert.match(vite, /globPatterns:\s*\['\*\*\/\*\.\{js,mjs,css,html,ico,png,svg,woff2\}'\]/);
  assert.match(vite, /urlPattern:\s*\/\\\/api\\\/\.\*\//);
  assert.match(vite, /handler:\s*'NetworkOnly'/);
});
