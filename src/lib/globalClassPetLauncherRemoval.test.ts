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

test('Klassenmaskottchen bleibt als bewusst geöffnetes Cockpit-Widget, aber nicht als Overlay', () => {
  const pet = readFileSync('src/components/ClassPetWidget.tsx', 'utf8');
  assert.match(pet, /export default ClassPetWidget/);
  const cockpit = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
  assert.match(cockpit, /case "pet":\s*return <ClassMascotWidget/);
  assert.match(cockpit, /\{false && actualShowPet &&/);
});
