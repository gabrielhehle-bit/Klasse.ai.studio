import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('Login verwendet das semantische Klassio-Designsystem statt hartcodierter Indigo-Oberfläche', () => {
  const source = read('src/components/AccessGate.tsx');

  assert.match(source, /from '\.\/ui'/);
  assert.match(source, /<Input/);
  assert.match(source, /<Button/);
  assert.match(source, /var\(--surface-app/);
  assert.match(source, /var\(--accent\)/);

  assert.doesNotMatch(source, /bg-slate-950/);
  assert.doesNotMatch(source, /bg-indigo-600/);
  assert.doesNotMatch(source, /focus:ring-indigo-500/);
});

test('Themes tauschen nicht mehr still die globale UI-Schrift aus', () => {
  const css = read('src/index.css');
  const appFontDeclarations = [...css.matchAll(/--app-font:\s*([^;]+);/g)].map(match => match[1].trim());

  assert.ok(appFontDeclarations.length >= 10, 'Theme-Schriftdeklarationen wurden nicht gefunden.');
  assert.ok(
    appFontDeclarations.every(value => value.startsWith('"DM Sans"')),
    'Jedes Theme muss dieselbe Klassio-UI-Grundschrift verwenden.'
  );
});

test('Große semantische Controls behalten einen einheitlichen Radius', () => {
  const button = read('src/components/ui/Button.tsx');
  const input = read('src/components/ui/Input.tsx');
  const select = read('src/components/ui/Select.tsx');
  const iconButton = read('src/components/ui/IconButton.tsx');

  assert.match(button, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(input, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(select, /lg: 'min-h-\[52px\][^']*rounded-xl/);
  assert.match(iconButton, /lg: 'w-13 h-13[^']*rounded-xl/);
});


test('Topbar bündelt seltene Aktionen unter Mehr und enthält keinen wirkungslosen Einfachmodus', () => {
  const source = read('src/components/Topbar.tsx');

  assert.doesNotMatch(source, /header_simple_mode/);
  assert.doesNotMatch(source, /setSimpleHeaderMode/);
  assert.equal((source.match(/paypal\.me\/gabrielhehle/g) || []).length, 1);
  assert.equal((source.match(/docs\.google\.com\/spreadsheets/g) || []).length, 1);
  assert.match(source, /setPage\('settings'\)/);
});

test('Sidebar verwendet eine ruhige aktive Navigation ohne Sonderbehandlung für Unterricht', () => {
  const source = read('src/components/Sidebar.tsx');

  assert.match(source, /Klassio/);
  assert.match(source, /app\.schulName \|\| app\.schulOrt/);
  assert.match(source, /bg-\[var\(--accent-soft\)\].*border-\[var\(--accent\)\]\/20/s);
  assert.doesNotMatch(source, /item\.id === 'unterricht'/);
  assert.doesNotMatch(source, />Aktiv<\/div>/);
});


test('Haupt-Hubs verwenden dieselbe ruhige Karten- und Seitenhierarchie', () => {
  for (const file of [
    'src/components/KlasseHub.tsx',
    'src/components/PlanungHub.tsx',
    'src/components/LeistungenHub.tsx',
    'src/components/UnterrichtHub.tsx',
  ]) {
    const source = read(file);
    assert.match(source, /max-w-\[1180px\]/, file + ' muss die gemeinsame Seitenbreite verwenden.');
    assert.match(source, /border-\[var\(--border-subtle,var\(--border\)\)\]/, file + ' muss semantische Border-Tokens verwenden.');
    assert.doesNotMatch(source, /hover:-translate-y-0\.5/, file + ' soll Karten nicht mehr springen lassen.');
    assert.doesNotMatch(source, /rounded-\[1\.75rem\]|rounded-\[2rem\]/, file + ' soll keine alten übergroßen Bubble-Radien mehr verwenden.');
  }
});
