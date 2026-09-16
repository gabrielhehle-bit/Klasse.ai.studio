import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const statistics = readFileSync('src/components/Statistics.tsx', 'utf8');
const teacherProfile = readFileSync('src/components/LehrerProfilView.tsx', 'utf8');
const planningStats = readFileSync('src/components/PlanungsStatistik.tsx', 'utf8');
const appState = readFileSync('src/lib/appState.ts', 'utf8');

test('statistics: no demo students or fabricated cohort values remain', () => {
  for (const forbidden of [
    'mock-1',
    'Emma Becker',
    'Max Müller',
    'Julia Schmidt',
    'Felix Wagner',
    'Klasse 4A',
    'Klasse 4B',
    'Klasse 4C',
    'Forschungstagebuch: Waldökologie',
    'Portfolio-Mappe: Geometrisches Zeichnen',
  ]) {
    assert.equal(statistics.includes(forbidden), false, forbidden);
  }
});

test('statistics: class and student performance use scale-aware shared metrics', () => {
  assert.match(statistics, /getClassPerformanceStats\(app, students, subjects, '1'\)/);
  assert.match(statistics, /getStudentPerformanceSummary\(app,/);
  assert.match(statistics, /getSubjectPerformanceAverages\(app,/);
  assert.match(statistics, /stats\.averageLabel/);
  assert.match(statistics, /stats\.attentionCount/);
  assert.doesNotMatch(statistics, /stats\.risks/);
});

test('statistics: profile observations use class-local journal and unified note reads', () => {
  assert.match(statistics, /notes: \[newNote, \.\.\.\(prev\.notes \|\| \[\]\)\]/);
  assert.match(statistics, /journal: \[newNote, \.\.\.\(prev\.journal \|\| \[\]\)\]/);
  assert.match(statistics, /getStudentNotes\(app,/);
  assert.doesNotMatch(statistics, /app\.notizen/);
});

test('statistics: profile UI resets on active class changes', () => {
  assert.match(statistics, /setSelectedStudentId\(null\)/);
  assert.match(statistics, /setAntolinSelectedStudentId\(null\)/);
  assert.match(statistics, /setPortfolioEntries\(\(app\.portfolioEntries \|\| \{\}\) as any\)/);
  assert.match(statistics, /\}, \[app\.activeClassId\]\);/);
});

test('statistics: legacy browser data is migrated and operational reads use encrypted app state', () => {
  assert.match(statistics, /oberauData\?\.\[student\.id\]\?\.remarks/);
  assert.match(statistics, /oberauData\?\.\[student\.id\]\?\.evaluationData/);
  assert.doesNotMatch(statistics, /oberauData\?\.\[student\.id\]\?\.remarks \|\| localStorage/);
  assert.doesNotMatch(statistics, /const evalRaw = localStorage\.getItem\(`oberau_eval_/);
});

test('statistics: diagnostic-looking helper is explicitly non-diagnostic', () => {
  assert.match(statistics, /Pädagogische Beobachtungs-Checkliste/);
  assert.match(statistics, /keine automatische Risikoeinstufung/);
  assert.doesNotMatch(statistics, /Dyskalkulie & Legasthenie Screening-Assistant/);
  assert.doesNotMatch(statistics, /Deutlich erhöhtes Risiko/);
});

test('statistics: printable support plan is honest and does not use document.write', () => {
  assert.match(statistics, /Pädagogischer Förderplan – Druckentwurf/);
  assert.match(statistics, /Keine behördliche oder amtlich anerkannte Vorlage/);
  assert.doesNotMatch(statistics, /document\.write/);
  assert.doesNotMatch(statistics, /behördlich anerkannten Förderplan/);
});

test('statistics: cohort comparison only uses stored classes', () => {
  assert.match(statistics, /comparisonClasses/);
  assert.match(statistics, /getSubjectPerformanceAverages\(referenceApp/);
  assert.match(statistics, /tatsächlich vorhandenen weiteren Klassen/);
});

test('statistics profile records participate in class projection and switching', () => {
  for (const field of ['elterngespraeche', 'portfolioEntries', 'kiPortfolioSummaries', 'oberauData']) {
    assert.match(appState, new RegExp(`${field}: state\\.${field}`));
    assert.match(appState, new RegExp(`parsed\\.${field} = activeClass\\.${field}`));
    assert.match(appState, new RegExp(`${field}: targetClass\\.${field}`));
  }

  assert.match(appState, /kelGespraeche: state\.kelGespraeche/);
  assert.match(appState, /parsed\.kelGespraeche = normalizeKelMeetings\([\s\S]*activeClass\.kelGespraeche/);
  assert.match(appState, /kelGespraeche: normalizeKelMeetings\([\s\S]*targetClass\.kelGespraeche/);
});

test('teacher profile contains only real editable profile, planning and self-care surfaces', () => {
  assert.match(teacherProfile, /Planungsstatistik/);
  assert.match(teacherProfile, /Self-Care/);
  assert.match(teacherProfile, /lehrerProfil:/);
  assert.doesNotMatch(teacherProfile, /Bundesministerium/);
  assert.doesNotMatch(teacherProfile, /Urkunde/);
  assert.doesNotMatch(teacherProfile, /treesSaved/);
  assert.doesNotMatch(teacherProfile, /estimatedHomework/);
});

test('planning statistics use the shared real aggregation helper', () => {
  assert.match(planningStats, /getPlanningStatistics\(app\)/);
  assert.doesNotMatch(planningStats, /item\?\.thema/);
});
