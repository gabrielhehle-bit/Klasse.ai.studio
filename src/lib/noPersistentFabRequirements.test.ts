import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('KLASSIO mounts neither Totoro quick-action popup nor permanent bottom-right note or mascot launcher', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /import UnifiedFAB from/);
  assert.doesNotMatch(app, /<UnifiedFAB\\s*\\/?\\s*>/);
  // The underlying notes can still be opened from intentional in-app navigation.
  assert.match(app, /<DenkzettelWidget \\/>/);
  const launcher = readFileSync('src/components/UnifiedFAB.tsx', 'utf8');
  assert.match(launcher, /Schnell-Operationszentrale/);
  assert.match(launcher, /unified-fab-denkzettel-only/);
  assert.match(launcher, /unified-fab-classpet/);
});
