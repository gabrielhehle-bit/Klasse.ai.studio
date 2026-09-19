import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync('src/App.tsx', 'utf8');
const state = readFileSync('src/lib/appState.ts', 'utf8');
const context = readFileSync('src/context/AppContext.tsx', 'utf8');
const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const overview = readFileSync('src/components/GradeOverview.tsx', 'utf8');
const hub = readFileSync('src/components/LeistungenHub.tsx', 'utf8');
const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
const globalActions = readFileSync('src/components/GlobalActions.tsx', 'utf8');

test('new or reopened app starts on Heute exactly once; existing cockpit may be opened deliberately', () => {
  assert.match(state, /currentPage: 'dashboard',\s*previousPage: 'dashboard'/);
  assert.match(app, /const \[initialLandingPending, setInitialLandingPending\] = useState\(true\)/);
  assert.match(app, /\(initialLandingPending \|\| landOnDashboardAfterLogin\)/);
  assert.match(app, /setInitialLandingPending\(false\)/);
  assert.match(app, /case 'cockpit': return null/);
  assert.match(app, /currentPage === 'cockpit' &&/);
  assert.doesNotMatch(state, /forceCockpit/);
  assert.match(state, /needsSafeLanding \? 'dashboard' : currentLoc/);
  assert.match(context, /needsSafeLanding \? 'dashboard' : currentLoc/);
  assert.match(context, /currentPage: 'dashboard', previousPage: 'dashboard'/);
});

test('overview is selected inside gradebook and previous bookmarked route still works', () => {
  assert.match(gradebook, /useState\(\(\) => initialSection === 'overview'\)/);
  assert.match(gradebook, /<GradeOverview embedded/);
  assert.match(gradebook, /> Notenübersicht/);
  assert.match(app, /case 'notenTabelle': return <Gradebook initialSection="overview" \/>/);
  assert.doesNotMatch(hub, /id:\s*['"]notenTabelle['"]/);
  assert.doesNotMatch(sidebar, /id:\s*['"]notenTabelle['"]/);
});

test('overview signals an empty active class and export uses the same manual/calculated grade values', () => {
  assert.match(overview, /students\.length === 0/);
  assert.match(overview, /room\.id !== app\.activeClassId/);
  assert.match(overview, /switchClass\(room\.id\)/);
  assert.match(overview, /aktuell ausgewählten Klasse sind keine Kinder vorhanden/);
  assert.match(overview, /getOverviewNote\(app, student\.id, fach, selectedSemester\)/);
  assert.match(overview, /getOverviewNote\(app, s\.id, f, selectedSemester\)/);
  assert.match(overview, /CSV für Excel/);
  assert.match(overview, /selectedSemester === 'combined' \? 'Gesamt'/);
});

test('AltGr, inputs, repeated keys and modal overlays cannot accidentally open fullscreen cockpit', () => {
  assert.match(globalActions, /!e\.altKey \|\| e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey \|\| e\.repeat/);
  assert.match(globalActions, /target\.closest\('input, textarea, select, \[contenteditable="true"\], \[role="textbox"\]'\)/);
  assert.match(globalActions, /document\.querySelector\('\[role="dialog"\]\[aria-modal="true"\]'\)/);
  assert.match(globalActions, /else if \(key === 'c'\)/);
});
