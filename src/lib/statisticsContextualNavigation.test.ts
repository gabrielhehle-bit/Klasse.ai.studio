import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const grades = read('src/components/Gradebook.tsx');
const analysis = read('src/components/LeistungsAuswertungen.tsx');
const dashboard = read('src/components/Dashboard.tsx');
const classOverview = read('src/components/KlassenUeberblick.tsx');
const dossier = read('src/components/StudentDossier.tsx');
const antolin = read('src/components/AntolinBereich.tsx');
const app = read('src/App.tsx');
const legacyStats = read('src/components/Statistics.tsx');
const settings = read('src/components/Settings.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const hub = read('src/components/LeistungenHub.tsx');

test('class overview is a compact, neutral and optional part of the dashboard', () => {
  assert.match(dashboard, /<KlassenUeberblick \/>/);
  assert.match(classOverview, /<details className=/);
  assert.match(classOverview, /Ohne Einträge wird keine Auffälligkeit abgeleitet/);
  assert.doesNotMatch(classOverview, /28\s*\*\s*24|blindSpotStudents|Leistungsindex\s*<\s*40/);
});
test('gradebook contains its own grade analysis and keeps original specialized functions reachable', () => {
  assert.match(grades, /<LeistungsAuswertungen initialSubject=\{activeFach\} initialSemester=\{sem\}/);
  assert.match(grades, /> Auswertungen/);
  assert.match(analysis, /getClassPerformanceStats/);
  assert.match(analysis, /getSubjectPerformanceAverages/);
  assert.match(analysis, /summary.totalCount === 0/);
  assert.match(analysis, /Fächer mit unterschiedlichen Skalen werden getrennt/);
  assert.match(analysis, /setPage\('statistik'\)/);
});
test('Antolin has a single class and student view in the existing encrypted class state', () => {
  assert.match(dossier, /id: 'antolin', label: 'Lesen & Antolin'/);
  assert.match(dossier, /<AntolinBereich studentId=\{student.id\} \/>/);
  assert.match(app, /case 'antolin': return <AntolinBereich \/>/);
  assert.match(antolin, /app.antolinRecords/);
  assert.match(antolin, /r.classId === app.activeClassId/);
  assert.match(antolin, /<AntolinImportModal open=\{showImport\}/);
  assert.match(antolin, /Mehrere Berichte desselben Kindes werden nicht zusammengezählt/);
});
test('old profile duplicate is out of public nav and teacher profile remains in settings', () => {
  assert.doesNotMatch(sidebar, /id: 'statistik', label: 'Statistik & Profile'/);
  assert.doesNotMatch(hub, /id: 'statistik'/);
  assert.match(app, /case 'statistik': return <Statistics initialTab="tools" \/>/);
  assert.match(settings, /<LehrerProfilView \/>/);
  assert.match(analysis, /Bisherige Spezialwerkzeuge öffnen/);
});
