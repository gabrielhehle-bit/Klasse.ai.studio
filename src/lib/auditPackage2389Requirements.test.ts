import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

test('audit #2 uses local calendar keys for dashboard day and attendance lookups', () => {
  const source = readSource('src/components/Dashboard.tsx');
  assert.match(source, /const todayStr = formatLocalDateKey\(new Date\(\)\);/);
  assert.match(source, /const todayStrFull = formatLocalDateKey\(heute\);/);
  assert.match(source, /const dateStr = formatLocalDateKey\(d\);/);
  assert.doesNotMatch(source, /const todayStrFull = heute\.toISOString\(\)\.split/);
});

test('audit #3 keeps the missing AI-key notice contextual and session-dismissible', () => {
  const source = readSource('src/App.tsx');
  assert.ok(source.includes("hasAiKey === false && showAiWarning && currentPage.startsWith('ki-')"));
  assert.ok(source.includes("sessionStorage.setItem('klassio_ai_warning_dismissed', '1')"));
  assert.ok(source.includes("sessionStorage.getItem('klassio_ai_warning_dismissed') !== '1'"));
});

test('audit #8 keeps actionable gradebook empty states', () => {
  const source = readSource('src/components/Gradebook.tsx');
  assert.ok(source.includes('title=\"Keine Schüler:innen\"'));
  assert.ok(source.includes('actionLabel=\"Zur Schülerliste\"'));
  assert.ok(source.includes('title=\"Keine Noten-Spalten aktiv\"'));
  assert.ok(source.includes('actionLabel=\"Neues Bewertungselement\"'));
});

test('audit #9 keeps unavailable gradebook actions disabled with an explanation', () => {
  const source = readSource('src/components/Gradebook.tsx');
  assert.ok(source.includes('disabled={missingCount === 0}'));
  assert.ok(source.includes('Alle vorgesehenen Bewertungen sind vollständig'));
});
