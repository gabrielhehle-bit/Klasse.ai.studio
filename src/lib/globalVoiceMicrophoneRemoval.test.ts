import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('App-Shell zeigt weder globale Haustier-Blase noch schwebendes Sprachsteuerungs-Mikrofon', () => {
  const shell = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(shell, /import\s+\{\s*VoiceCommander\s*\}/);
  assert.doesNotMatch(shell, /<VoiceCommander\s*\/>/);
  assert.doesNotMatch(shell, /<UnifiedFAB\s*\/>/);
});

test('Sprachnotiz bleibt gezielt per eigenem Dialog erreichbar', () => {
  const shell = readFileSync('src/App.tsx', 'utf8');
  assert.match(shell, /<VoiceNote\s*\/>/);
  const modal = readFileSync('src/components/VoiceNote.tsx', 'utf8');
  assert.match(modal, /app\.stimmNotizModal/);
});
