import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/KlasseHub.tsx', import.meta.url), 'utf8');

test('KlasseHub uses the local calendar day for attendance status', () => {
  assert.match(source, /toLocalDateKey\(\)/);
  assert.doesNotMatch(source, /toISOString\(\)\.slice\(0,\s*10\)/);
});
