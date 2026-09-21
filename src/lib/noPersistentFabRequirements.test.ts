import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('KLASSIO does not mount the Totoro quick-action popup or persistent bottom-right launcher', () => {
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.doesNotMatch(app, /import UnifiedFAB from/);
  assert.doesNotMatch(app, /<UnifiedFAB\s*\/?>/);
  // Preserve the underlying notes feature, without its global floating launcher.
  assert.match(app, /<DenkzettelWidget\s*\/>/);
  const launcher = readFileSync('src/components/UnifiedFAB.tsx', 'utf8');
  assert.match(launcher, /Schnell-Operationszentrale/);
  assert.match(launcher, /unified-fab-denkzettel-only/);
  assert.match(launcher, /unified-fab-classpet/);
});
