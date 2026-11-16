import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { filterClassHubItems } from './classHubSearch';

const items = [
  { id: 'sitzplan', title: 'Sitzplan & Gruppen', description: 'Sitzplätze organisieren.', keywords: 'Platztausch Tische' },
  { id: 'orga', title: 'Organisation & Listen', description: 'Klassenkasse, Ausflüge, Checklisten und eigene Listen.', keywords: 'Geld Sammlungen Passwort Zugangsdaten' },
  { id: 'kel', title: 'KEL-Gespräche', description: 'Gespräche vorbereiten.', keywords: 'Eltern Elternsprechtag Entwicklungsgespräch' },
  { id: 'team', title: 'Teamteaching', description: 'Gemeinsam arbeiten.', keywords: 'Sync Kollegium Laptop' },
];

test('Class Hub searches titles, descriptions and everyday synonyms without touching items', () => {
  const before = structuredClone(items);
  assert.deepEqual(filterClassHubItems(items, 'Platztausch').map(item => item.id), ['sitzplan']);
  assert.deepEqual(filterClassHubItems(items, 'Sitzplan').map(item => item.id), ['sitzplan']);
  assert.deepEqual(filterClassHubItems(items, 'Checkliste').map(item => item.id), ['orga']);
  assert.deepEqual(filterClassHubItems(items, 'Geld').map(item => item.id), ['orga']);
  assert.deepEqual(filterClassHubItems(items, 'Elternsprechtag').map(item => item.id), ['kel']);
  assert.deepEqual(filterClassHubItems(items, 'Laptop').map(item => item.id), ['team']);
  assert.deepEqual(items, before);
});

test('Class Hub supports multi-word search, upper-case, umlauts and ß', () => {
  assert.deepEqual(filterClassHubItems(items, '  KLASSEnKasse  ').map(item => item.id), ['orga']);
  assert.deepEqual(filterClassHubItems(items, 'ausflug listen').map(item => item.id), ['orga']);
  assert.deepEqual(filterClassHubItems([{ title: 'Grüße', description: '' }], 'grusse').length, 1);
  assert.deepEqual(filterClassHubItems([{ title: 'Ausflüge', description: '' }], 'ausfluge').length, 1);
});

test('Class Hub keeps original visible list for an empty query and returns a real empty state', () => {
  assert.deepEqual(filterClassHubItems(items, ''), items);
  assert.deepEqual(filterClassHubItems(items, '   '), items);
  assert.deepEqual(filterClassHubItems(items, 'nichtspassendes'), []);
});

test('Class Hub filters only visible options and never bypasses class-teacher permissions', () => {
  const hub = readFileSync('src/components/KlasseHub.tsx', 'utf8');
  assert.match(hub, /organizationItems\.filter\(item => !item\.klassenvorstandOnly \|\| app\.klassenvorstand\)/);
  assert.match(hub, /filterClassHubItems\(\s*organizationItems\.filter/);
  assert.match(hub, /data-class-function-search/);
  assert.match(hub, /data-class-search-empty/);
  assert.match(hub, /setFunctionQuery\(''\)/);
  assert.match(hub, /title: 'Organisation & Listen'/);
  assert.match(hub, /Checklisten und eigene Listen/);
  assert.match(hub, /onOpen=\{openItem\}/);
});
