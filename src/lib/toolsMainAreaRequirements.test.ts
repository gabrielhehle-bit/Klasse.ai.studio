import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');
const hub = readFileSync('src/components/ToolsHub.tsx', 'utf8');
const textTool = readFileSync('src/components/TextAnalysisTool.tsx', 'utf8');
const analysis = readFileSync('src/lib/textAnalysis.ts', 'utf8');
const hierarchy = readFileSync('src/lib/navigationHierarchy.ts', 'utf8');

test('Tools: eigener Hauptbereich und Textanalyse sind direkt navigierbar', () => {
  assert.match(sidebar, /id: 'tools', label: 'Tools'.*section: 'Start'/);
  assert.match(sidebar, /id: 'textanalyse', label: 'Textanalyse'.*section: 'Tools'/);
  assert.match(app, /case 'tools': return <ToolsHub \/>/);
  assert.match(app, /case 'textanalyse': return <TextAnalysisTool \/>/);
  assert.match(hierarchy, /textanalyse: \{ id: 'tools', label: 'Tools' \}/);
});

test('Tools-Hub: nur eigenständige Werkzeuge; KI-Funktionen bleiben über KI-Helfer erreichbar', () => {
  for (const id of ['textanalyse', 'stationenbetrieb', 'drucken']) {
    assert.match(hub, new RegExp(`id: '${id}'`));
  }
  for (const id of ['arbeitsblatt', 'differenzierung', 'ki-helfer', 'elternbrief']) {
    assert.doesNotMatch(hub, new RegExp(`id: '${id}'`));
    assert.match(sidebar, new RegExp(`id: '${id}'`));
  }
  assert.match(hub, /Bestehende Funktionen bleiben weiterhin auch in ihren Fachbereichen erreichbar/);
  assert.doesNotMatch(hub, /id: 'stimmnotizen'/);
});

test('Textanalyse: läuft lokal ohne KI- oder Serveraufruf', () => {
  assert.match(textTool, /Text bleibt im Browser/);
  assert.match(textTool, /analyzeGermanText\(text\)/);
  assert.doesNotMatch(textTool, /askAI|fetch\(|axios|\/api\//);
  assert.doesNotMatch(analysis, /askAI|fetch\(|axios|\/api\//);
});

test('Textanalyse: dokumentiert Amstad-Flesch und Wiener Sachtextformel transparent', () => {
  assert.match(analysis, /180 - averageSentenceLength - \(58\.5 \* averageSyllablesPerWord\)/);
  assert.match(analysis, /0\.1935 \* multiSyllablePercent/);
  assert.match(analysis, /0\.1672 \* averageSentenceLength/);
  assert.match(analysis, /0\.1297 \* longWordPercent/);
  assert.match(analysis, /0\.0327 \* monosyllablePercent/);
  assert.match(textTool, /Die Schulstufenskala beginnt bei etwa Stufe 4/);
  assert.match(textTool, /Keine automatische Eignungsentscheidung/);
});
