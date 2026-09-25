import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const textEditor = readFileSync('src/components/cockpit/BoardTextEditor.tsx', 'utf8');
const ink = readFileSync('src/components/cockpit/BoardInk.tsx', 'utf8');

function between(source: string, start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0, 'start marker missing: ' + start);
  assert.ok(to > from, 'end marker missing: ' + end);
  return source.slice(from, to);
}

test('Tafelseiten und Schreiben-Launcher bleiben 44px groß', () => {
  const header = between(
    cockpit,
    'role="tablist" aria-label="Tafelseiten"',
    '{/* Top Toolbar Action Buttons',
  );
  assert.match(header, /flex h-11 min-w-11 shrink-0 items-center justify-center rounded-lg/);
  assert.match(header, /aria-label="Neue Tafelseite hinzufügen"[\s\S]*flex h-11 min-w-11/);
  assert.match(header, /aria-controls="klassio-board-tools"[\s\S]*flex h-11 min-w-11/);
  assert.doesNotMatch(header, /\b(?:h-8|min-w-8|h-9)\b/);
});

test('Schreiben-und-Papier-Dialog nutzt touch-sichere Werkzeuge und Papiersteuerung', () => {
  const tools = between(
    cockpit,
    'id="klassio-board-tools"',
    "{boardTool === 'text' &&",
  );
  assert.match(tools, /aria-label="Schreiben und Papier schließen"[\s\S]*h-11 w-11/);
  assert.match(tools, /className="flex min-h-16 flex-col items-center justify-center/);
  assert.match(tools, /aria-label="Papierart der Unterrichtsfläche"[\s\S]*min-h-11 w-full/);
  assert.match(tools, /className="mt-2 flex min-h-11 items-center/);
  assert.match(tools, /aria-label="Papierabstand einstellen"[\s\S]*className="h-11 w-24/);
});

test('Externe Text- und Stiftleisten schrumpfen keine Aktionen unter 44px', () => {
  const contexts = between(
    cockpit,
    "{boardTool === 'text' &&",
    '{/* Quick-access widgets now live',
  );
  assert.match(contexts, /aria-label="Textgröße"[\s\S]*min-h-11/);
  assert.match(contexts, /aria-label="Textfarbe auswählen"[\s\S]*h-11 w-11/);
  assert.match(contexts, /aria-label="Stiftfarbe"[\s\S]*h-11 w-11 rounded-full/);
  assert.match(contexts, /aria-label="Eigene Stiftfarbe"[\s\S]*h-11 w-11/);
  assert.match(contexts, /aria-label="Strichstärke"[\s\S]*min-h-11/);
  assert.doesNotMatch(contexts, /\b(?:min-h-9|min-h-10|h-8|h-9|w-8)\b/);
});

test('BoardTextEditor verwendet durchgehend 44px Formatierungsaktionen', () => {
  assert.match(textEditor, /const buttonClass =\s*"min-h-11 px-3/);
  assert.match(textEditor, /clearArmed \? "min-h-11 px-3/);
  assert.match(textEditor, /className="min-h-11 px-4 rounded-lg bg-indigo-600/);
  assert.doesNotMatch(textEditor, /\bmin-h-10\b/);
});

test('BoardInk Eingaben und Werkzeugleiste bleiben touch-sicher', () => {
  assert.match(ink, /const button = 'min-h-11 px-3/);
  assert.match(ink, /className="w-11 h-11"/);
  assert.match(ink, /className="min-h-11 min-w-0 flex-1 p-3/);
  assert.match(ink, /flex min-h-11 items-center gap-2 text-sm/);
  assert.doesNotMatch(ink, /\b(?:min-h-9|min-h-10|h-8|h-9)\b/);
});
