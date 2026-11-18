import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterPrintTemplates } from './printTemplateSearch';

const templates = [
  { id: 'kel_elternblatt', label: 'KEL-Elternblatt', desc: 'Lernen und Befinden', keywords: 'Elterngespräch Unterschrift', taskCat: 'schueler' },
  { id: 'checkliste', label: 'Notenübersicht', desc: 'Punkteraster', keywords: 'Ausflug Wandertag', taskCat: 'leistung' },
  { id: 'wochenplan', label: 'Wochenplan', desc: 'Unterricht und Aufgaben', keywords: 'Wochenübersicht', taskCat: 'planung' },
  { id: 'schuelerliste', label: 'Klassenliste', desc: 'Schüler Stammdaten', keywords: 'Namen', taskCat: 'klasse' },
];

test('print search finds teacher terms across labels, descriptions and keywords without mutation', () => {
  const before = structuredClone(templates);
  assert.deepEqual(filterPrintTemplates(templates, 'Elterngespräch').map(t => t.id), ['kel_elternblatt']);
  assert.deepEqual(filterPrintTemplates(templates, 'Unterschrift').map(t => t.id), ['kel_elternblatt']);
  assert.deepEqual(filterPrintTemplates(templates, 'Ausflug').map(t => t.id), ['checkliste']);
  assert.deepEqual(filterPrintTemplates(templates, 'Wochenplan').map(t => t.id), ['wochenplan']);
  assert.deepEqual(templates, before);
});

test('print search ignores case, whitespace, accent differences and handles multiple words', () => {
  assert.deepEqual(filterPrintTemplates(templates, '   ELTERNgespräch   unterschrift   ').map(t => t.id), ['kel_elternblatt']);
  assert.deepEqual(filterPrintTemplates(templates, 'schuler').map(t => t.id), ['schuelerliste']);
  assert.deepEqual(filterPrintTemplates([{label:'Grüße',desc:'',keywords:'',taskCat:'klasse'}], 'grusse').length, 1);
  assert.deepEqual(filterPrintTemplates(templates, 'WANDERTAG').map(t => t.id), ['checkliste']);
});

test('search uses category refinements only when explicitly requested, preserves order and returns empty results honestly', () => {
  assert.deepEqual(filterPrintTemplates(templates, '').map(t => t.id), templates.map(t => t.id));
  assert.deepEqual(filterPrintTemplates(templates, '   ').map(t => t.id), templates.map(t => t.id));
  assert.deepEqual(filterPrintTemplates(templates, '', 'klasse').map(t => t.id), ['schuelerliste']);
  assert.deepEqual(filterPrintTemplates(templates, 'Elterngespräch', 'leistung'), []);
  assert.deepEqual(filterPrintTemplates(templates, 'nichtvorhanden'), []);
});

test('print centre resets stale task category when a search starts and hides unfiltered quick cards', () => {
  const code = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  assert.match(code, /filterPrintTemplates\(ALL_TEMPLATES, templateSearch, activeTaskCategory\)/);
  assert.match(code, /data-testid="print-template-search"/);
  assert.match(code, /if \(next\.trim\(\)\) setActiveTaskCategory\('all'\)/);
  assert.match(code, /!templateSearch\.trim\(\) && <div className="space-y-2\.5 no-print" data-testid="print-quick-access"/);
  assert.match(code, /data-testid="print-template-results"/);
  assert.match(code, /filteredTemplates\.length === 1 \? 'Vorlage' : 'Vorlagen'/);
  assert.match(code, /data-testid="print-template-empty"/);
  assert.match(code, /aria-label="Vorlagensuche löschen"/);
  assert.match(code, /elterngespräch elternsprechtag unterschrift elternunterschrift pdf/);
});

test('every template selection and current document controls lead to real settings or preview', () => {
  const code = readFileSync('src/components/PrintCenter.tsx', 'utf8');
  assert.match(code, /id="print-center-configuration"/);
  assert.match(code, /id="print-center-preview"/);
  assert.match(code, /data-testid="print-selected-template"/);
  assert.match(code, /Angaben einstellen/);
  assert.match(code, /A4-Vorschau ansehen/);
  assert.match(code, /data-print-preview-frame role="region" aria-label="Druckvorschau"/);
  assert.match(code, /Angaben bearbeiten/);
  const jumps = code.match(/document\.getElementById\('print-center-configuration'\)\?\.scrollIntoView/g) || [];
  assert.ok(jumps.length >= 3, 'quick access, catalogue selection and step bar should all link to settings');
  assert.match(code, /document\.getElementById\('print-center-preview'\)\?\.scrollIntoView/);
  assert.match(code, /data-testid="print-center-primary-print"/);
  assert.match(code, /activeTemplate === 'kel_elternblatt' && !selectedParentStudent/);
});
