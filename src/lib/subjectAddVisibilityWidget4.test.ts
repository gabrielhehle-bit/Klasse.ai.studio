import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const setup = readFileSync('src/components/SetupWizardCore.tsx', 'utf8');

test('Fach hinzufügen is an obvious, labelled gradebook action next to the subject picker', () => {
  const header = gradebook.slice(gradebook.indexOf('id="gradebook-active-subject"'), gradebook.indexOf('id="gradebook-semester"'));
  assert.match(header, /Fach hinzufügen/);
  assert.match(header, /min-h-11/);
  assert.match(header, /bg-emerald-600/);
  assert.match(header, /setupInitialStepMode: 'Fächer', currentPage: 'setup'/);
});

test('First-run and later class setup: adding a subject has a visible title and full-width touch-friendly action', () => {
  assert.match(setup, /aria-label="Fach hinzufügen"/);
  assert.match(setup, /htmlFor="klassio-add-subject"/);
  assert.match(setup, /id="klassio-add-subject"/);
  assert.match(setup, /min-h-12 shrink-0/);
  assert.match(setup, /＋ Fach hinzufügen/);
  assert.match(setup, /Alle Notenmappen ein/);
});
