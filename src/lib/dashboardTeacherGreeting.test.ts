import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTeacherFirstName } from './utils';

test('dashboard greeting uses a valid first name in a restored class state', () => {
  assert.equal(getTeacherFirstName({ vorname: 'Gabriel', lehrerName: 'Gabriel Hehle' }), 'Gabriel');
  assert.equal(getTeacherFirstName({ lehrerName: 'Frau Martina Bitschnau' }), 'Martina');
  assert.equal(getTeacherFirstName({ lehrerProfil: { name: 'Dr. Gabriel Hehle' } }), 'Gabriel');
});

test('a missing name never becomes a greeting, and fallback fields are respected', () => {
  assert.equal(getTeacherFirstName({ vorname: 'Name fehlt', lehrerName: 'Gabriel Hehle' }), 'Gabriel');
  assert.equal(getTeacherFirstName({ vorname: ' Name fehlt ', lehrerProfil: { name: 'Frau Martina Bitschnau' } }), 'Martina');
  for (const invalid of ['', ' ', 'Name fehlt', 'Name nicht angegeben', 'Unbekannt', 'undefined', 'null', 'Herr']) {
    assert.equal(getTeacherFirstName({ vorname: invalid }), '', JSON.stringify(invalid));
  }
  assert.equal(getTeacherFirstName('Frau Anna Beispiel'), 'Anna');
});

test('dashboard AI prompt and header do not leak placeholder or restore invalid AI greeting', () => {
  const source = readFileSync('src/components/Dashboard.tsx', 'utf8');
  assert.match(source, /getTeacherFirstName\(app\) \|\| 'Lehrkraft'/);
  assert.doesNotMatch(source, /\`\$\{app\?\.anrede \|\| ""\} \$\{app\?\.nachname \|\| ""\}\`/);
  assert.match(source, /getSafeInsightGreeting\(aiInsight\.greeting\)/);
  assert.match(source, /name\\s\+fehlt/);
});
