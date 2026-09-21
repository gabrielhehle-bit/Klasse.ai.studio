import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeAppState, switchClassState} from './appState';

const read = (path: string) => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const students = read('src/components/Sek1Students.tsx');
const dossier = read('src/components/Sek1StudentDossier.tsx');
const dossierHub = read('src/components/Sek1DossierHub.tsx');
const weekly = read('src/components/Sek1WeeklyPlan.tsx');
const print = read('src/components/Sek1PrintCenter.tsx');
const legacyStudents = read('src/components/StudentList.tsx');
const legacyWeekly = read('src/components/WeeklyPlan.tsx');
const legacyPrint = read('src/components/PrintCenter.tsx');

test('VS routes and original components are preserved while MS/AHS get separate slim modules', () => {
  for (const [route, oldComponent, secondaryComponent] of [
    ['schueler','StudentList','Sek1Students'], ['dossier','StudentDossierHub','Sek1DossierHub'],
    ['wochenplanung','WeeklyPlan','Sek1WeeklyPlan'], ['drucken','PrintCenter','Sek1PrintCenter'],
  ]) {
    assert.match(app, new RegExp(`case '${route}': return istSekundarstufe\\(app\\.schulart\\)`));
    assert.match(app, new RegExp(`<${oldComponent}\\b`));
    assert.match(app, new RegExp(`<${secondaryComponent}\\b`));
  }
  assert.match(legacyStudents, /Förderung in bestimmten Bereichen \(Förderbedarf\)/);
  assert.match(legacyStudents, /Wunschpartner hinzufügen/);
  assert.match(legacyWeekly, /Wochenplan für Kinder erstellen/);
  assert.match(legacyPrint, /KEL-Gespräch/);
});

test('Secondary basic student form does not expose primary pedagogy or seating-partner controls', () => {
  assert.match(students, /Sek1ClassPicker/);
  assert.match(students, /mergeImportedStudents/);
  assert.match(students, /updateStudent\(student\)/);
  assert.match(students, /\.\.\.existing, vorname, nachname/);
  for (const unwanted of ['Förderbedarf', 'Sitzplatz-Beziehungen', 'Wunschpartner', 'Abstand halten', 'Stärken & Ressourcen', 'Ressourcenorientierte Steuerung']) {
    assert.ok(!students.includes(unwanted), `Unterstufenformular enthält unerwartete VS-Option: ${unwanted}`);
  }
});

test('Secondary dossier uses existing class-local data sources and no diagnostics or funding UI', () => {
  for (const method of ['getStudentNotes', 'getStudentBehaviorSummary', 'getStudentGradeSummary', 'getStudentAttendanceSummary']) assert.ok(dossier.includes(method));
  assert.match(dossier, /freitext/);
  assert.match(dossier, /logObservation\(setApp, studentId/);
  assert.match(dossierHub, /Sek1ClassPicker/);
  for (const unwanted of ['DossierDiagnostik','DossierFoerderprofil','KELPresentation','Sitzplatz-Beziehungen']) assert.ok(!dossier.includes(unwanted));
});

test('Secondary weekly planning only permits class-selected subjects and never exposes child-plan UI', () => {
  assert.match(weekly, /faecherFuerKlasse\(app\)/);
  assert.match(weekly, /if \(!subjects\.includes\(fach\)\) return \[\]/);
  assert.match(weekly, /if \(!editing \|\| !subjects\.includes\(editing\.fach\)\) return/);
  assert.match(weekly, /\.\.\.existing, fach, thema:/);
  assert.ok(!weekly.includes('FAECHER_ALLE'));
  for (const unwanted of ['Hauptfach wählen','Wochenplan für Kinder erstellen','Im Wochenplan der Kinder anzeigen','Kinderplanung','imKinderWochenplan:']) assert.ok(!weekly.includes(unwanted));
});

test('Sek-I print center has a deliberately restricted, class-local set of templates', () => {
  const ids = [...print.matchAll(/\{id:'([^']+)', label:/g)].map(m=>m[1]);
  assert.deepEqual(ids, ['liste','anwesenheit','noten','wochenplanung','lehrerstundenplan','klassenbuch','dossier','sitzplan']);
  assert.match(print, /getStudentAttendanceSummary/);
  assert.match(print, /getStudentGradeSummary/);
  assert.match(print, /erstelleLehrerstundenplan/);
  assert.match(print, /app\.klassenbuchErgaenzungen/);
  for (const unwanted of ['schueler_wochenplan','kel_presentation','eltern_diagnostik','kassenuebersicht','smart_tools','materialabholung']) assert.ok(!print.includes(unwanted));
});

test('Existing class-local notes, grades and attendance survive class changes for Sek I', () => {
  const state = normalizeAppState({
    activeClassId:'ms-1', schulart:'mittelschule', klassenbezeichnung:'1a', stufe:5,
    schueler:[{id:'sid1',vorname:'A',nachname:'A',name:'A A'}],
    classes:[
      {id:'ms-1',name:'1a',stufe:5,schulart:'mittelschule',klassenvorstand:false,schueler:[{id:'sid1',vorname:'A',nachname:'A',name:'A A'}],noten:{sid1:{Deutsch:{'1':{sa:[],lzk:[2],wp:[],aufgaben:[],hue:0,hueAnm:[]}}}},anwesenheit:{sid1:{'2026-09-21':{'1':'e'}}},notes:[{id:'note-1',schuelerId:'sid1',inhalt:'Beobachtung A',datum:'2026-09-21'}]},
      {id:'ahs-2',name:'2b',stufe:6,schulart:'ahs_unterstufe',klassenvorstand:true,schueler:[{id:'sid2',vorname:'B',nachname:'B',name:'B B'}],noten:{},anwesenheit:{},notes:[]},
    ],
  });
  const other = switchClassState(state,'ahs-2');
  assert.equal(other.schueler[0].id,'sid2');
  assert.equal(other.noten?.sid1,undefined);
  assert.equal(other.anwesenheit?.sid1,undefined);
  const restored = switchClassState(other,'ms-1');
  assert.equal(restored.schueler[0].id,'sid1');
  assert.equal(restored.noten.sid1.Deutsch['1'].lzk[0],2);
  assert.equal(restored.anwesenheit.sid1['2026-09-21']['1'],'e');
});
