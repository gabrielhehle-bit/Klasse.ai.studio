import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const assistant = readFileSync('src/components/AIAssistant.tsx', 'utf8');
const prompts = readFileSync('src/kiSystemPrompts.ts', 'utf8');
const assessment = readFileSync('src/components/VerbalAssessment.tsx', 'utf8');
const service = readFileSync('src/services/aiService.ts', 'utf8');
const app = readFileSync('src/App.tsx', 'utf8');

test('KI-Helfer zeigt nur die sinnvollen aktiven KI-Modi', () => {
  for (const label of [
    'Pädagogik', 'Fachwissen', 'Reflexion', 'Lernziele', 'Elternkommunikation',
    'Differenzierung', 'Leistungsfeedback', 'Text prüfen', 'Foto-Feedback',
  ]) {
    assert.ok(assistant.includes("label: '" + label + "'"), `KI-Modus fehlt: ${label}`);
  }
  const tabsBlock = assistant.slice(assistant.indexOf('const tabs:'), assistant.indexOf('const activeTabData'));
  assert.doesNotMatch(tabsBlock, /label: 'Schulrecht'/);
  assert.doesNotMatch(tabsBlock, /id: 'ki-arbeitsblatt'/);
  assert.doesNotMatch(tabsBlock, /id: 'ki-wochenplan'/);
  assert.doesNotMatch(tabsBlock, /id: 'ki-stundenplan-check'/);
  assert.doesNotMatch(tabsBlock, /id: 'ki-stationenbetrieb'/);
});

test('Arbeitsblatt, Wochenplanung und Lernwerkstatt sind echte KLASSIO-Module statt KI-Doppelungen', () => {
  assert.match(assistant, /Direkt in KLASSIO/);
  assert.match(assistant, /id: 'arbeitsblatt', label: 'Arbeitsblätter'/);
  assert.match(assistant, /id: 'wochenplanung', label: 'Wochenplanung'/);
  assert.match(assistant, /id: 'stationenbetrieb', label: 'Lernwerkstätten'/);
  assert.match(assistant, /setPage\(item\.id\)/);
  assert.match(app, /case 'ki-arbeitsblatt': return <WorksheetGenerator/);
  assert.match(app, /case 'ki-wochenplan':/);
  assert.match(app, /case 'ki-stundenplan-check':/);
  assert.match(app, /return <WeeklyPlan/);
  assert.match(app, /case 'ki-stationenbetrieb':/);
  assert.match(app, /return <StationenbetriebManager/);
});

test('Leistungsfeedback sendet keinen Schülernamen und bildet keinen fachübergreifenden Durchschnitt', () => {
  assert.match(assessment, /KIND-ALIAS: Kind A/);
  assert.match(assessment, /FACHBEZOGENE LEISTUNGSDATEN/);
  assert.match(assessment, /Keine Note vorschlagen/);
  assert.match(assessment, /An Gemini wird nur „Kind A“/);
  assert.doesNotMatch(assessment, /Durchschnittsnote/);
  assert.doesNotMatch(assessment, /gradeValues/);
});

test('Foto-Feedback bleibt ohne Klassenkontext und hat Datenschutz- plus Quota-Sperre', () => {
  assert.match(assistant, /modusId !== 'ki-foto-korrektur'/);
  assert.match(assistant, /keine automatische Note/);
  assert.match(assistant, /aiUsage\?\.blocked \|\| aiUsage\?\.remaining === 0/);
  assert.match(assistant, /fkPrivacyConfirmed/);
});

test('Systemprompts verhindern erfundene Daten, automatische Noten und individuelle Aussagen aus Aggregaten', () => {
  assert.match(prompts, /Fordere keine Klarnamen von Schüler:innen an/);
  assert.match(prompts, /Erfinde keine Beobachtungen, Leistungen, Diagnosen oder Quellen/);
  assert.match(prompts, /Schlage KEINE Note und KEIN Gesamturteil vor/);
  assert.match(prompts, /Triff keine Aussagen über einzelne Kinder/);
  assert.match(prompts, /Dieser Legacy-Modus ist nicht quellenverifiziert/);
});

test('KI-Fehler werden geworfen statt als scheinbare KI-Antwort angezeigt', () => {
  const askBlock = service.slice(service.indexOf('export async function askAI'), service.indexOf('export async function generateHangmanWord'));
  assert.match(askBlock, /return await callServerAI/);
  assert.doesNotMatch(askBlock, /return error\.message/);
});
