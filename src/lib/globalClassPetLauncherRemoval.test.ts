import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Globale Haustier-Blase und ihre Schnell-Operationszentrale werden auf keiner App-Seite gemountet', () => {
  const shell = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(shell, /import UnifiedFAB from/);
  assert.doesNotMatch(shell, /<UnifiedFAB\s*\/>/);
  // Removing the launcher must not remove the ordinary teacher note component.
  assert.match(shell, /<DenkzettelWidget\s*\/>/);
});

test('Die eigenständige Klassenhaustier-Funktion und Cockpit-Einstellungen werden nicht gelöscht', () => {
  const pet = readFileSync('src/components/ClassPetWidget.tsx', 'utf8');
  assert.match(pet, /export default ClassPetWidget/);
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(cockpit, /\{actualShowPet &&/);
});
