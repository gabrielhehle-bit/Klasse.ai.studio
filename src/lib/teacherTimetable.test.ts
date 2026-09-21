import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAppState, switchClassState } from './appState';
import { erstelleLehrerstundenplan } from './teacherTimetable';

function ausgangslage() {
  return normalizeAppState({
    schuljahr: '2026/27', schulart: 'mittelschule', activeClassId: 'ms-1',
    klassenbezeichnung: '1a', stufe: 5, klassenvorstand: false,
    stammplan: { Montag: { 1: 'Deutsch', 3: 'Deutsch' } },
    tageplan: { Montag: { stunden: [1, 3] } },
    schueler: [{ id: 'kind-a', name: 'A' }],
    classes: [
      {
        id: 'ms-1', name: '1a', stufe: 5, schulart: 'mittelschule', schuljahr: '2026/27',
        klassenvorstand: false, schueler: [{ id: 'kind-a', name: 'A' }],
        stammplan: { Montag: { 1: 'Deutsch', 3: 'Deutsch' } },
        tageplan: { Montag: { stunden: [1, 3] } },
      },
      {
        id: 'ahs-2', name: '2b', stufe: 6, schulart: 'ahs_unterstufe', schuljahr: '2026/27',
        klassenvorstand: true, schueler: [{ id: 'kind-b', name: 'B' }],
        stammplan: { Montag: { 1: 'Englisch', 2: 'Englisch' }, Dienstag: { 5: 'Englisch' } },
        tageplan: { Montag: { stunden: [1, 2] }, Dienstag: { stunden: [5] } },
      },
      {
        id: 'previous-year', name: '3c', stufe: 7, schulart: 'mittelschule', schuljahr: '2025/26',
        klassenvorstand: false, stammplan: { Montag: { 4: 'Geschichte' } },
      },
      { id: 'vs', name: '4a', stufe: 4, schulart: 'volksschule', schuljahr: '2026/27', stammplan: { Montag: { 4: 'Sachunterricht' } } },
    ],
  });
}

test('Lehrerstundenplan combines own timetable across MS and AHS but excludes VS and other school years', () => {
  const plan = erstelleLehrerstundenplan(ausgangslage());
  assert.equal(plan.klassenAnzahl, 2);
  assert.equal(plan.schuljahr, '2026/27');
  assert.equal(plan.zeilen.length, 5);
  assert.deepEqual(plan.zeilen.filter(e => e.klasseId === 'ms-1').map(e => e.stunde), [1, 3]);
  assert.deepEqual(plan.zeilen.filter(e => e.klasseId === 'ahs-2').map(e => e.fach), ['Englisch', 'Englisch', 'Englisch']);
  assert.ok(plan.zeilen.every(e => e.klasseId !== 'previous-year' && e.klasseId !== 'vs'));
  assert.equal(plan.konflikte.length, 1);
  assert.equal(plan.konflikte[0].tag, 'Montag');
  assert.equal(plan.konflikte[0].stunde, 1);
  assert.deepEqual(plan.konflikte[0].eintraege.map(e => e.klasseId), ['ms-1', 'ahs-2']);
});

test('class switch keeps timetable and children in their respective classes', () => {
  const state = ausgangslage();
  const before = erstelleLehrerstundenplan(state);
  const ahs = switchClassState(state, 'ahs-2');
  assert.equal(ahs.schueler[0]?.id, 'kind-b');
  assert.equal(ahs.klassenvorstand, true);
  assert.deepEqual(erstelleLehrerstundenplan(ahs).zeilen, before.zeilen);
  const ms = switchClassState(ahs, 'ms-1');
  assert.equal(ms.schueler[0]?.id, 'kind-a');
  assert.equal(ms.klassenvorstand, false);
});

test('unassigned lessons and blank default schedules do not invent teacher timetable entries', () => {
  const state = ausgangslage();
  state.classes = (state.classes || []).map(c => c.id === 'ahs-2'
    ? { ...c, stammplan: { Montag: { 1: '', 2: 'Englisch', 3: 'Geschichte' } }, tageplan: { Montag: { stunden: [1, 2] } } }
    : c);
  const zeilen = erstelleLehrerstundenplan(state).zeilen.filter(e => e.klasseId === 'ahs-2');
  assert.deepEqual(zeilen.map(e => e.fach), ['Englisch']);
});

test('student picker is available for empty classes and dossiers; setup offers consecutive classes', () => {
  const students = readFileSync('src/components/StudentList.tsx', 'utf8');
  const picker = readFileSync('src/components/Sek1ClassPicker.tsx', 'utf8');
  const setup = readFileSync('src/components/SetupWizardCore.tsx', 'utf8');
  const app = readFileSync('src/App.tsx', 'utf8');
  const sidebar = readFileSync('src/components/Sidebar.tsx', 'utf8');
  assert.equal((students.match(/<Sek1ClassPicker \/>/g) || []).length, 2);
  assert.match(picker, /onChange=\{e => \{/);
  assert.match(picker, /switchClass\(next\)/);
  assert.match(picker, /setPage\('setup_new'\)/);
  assert.match(setup, /createAnotherClass/);
  assert.match(setup, /setPage\('setup_new'\)/);
  assert.match(app, /new_setup_\$\{app\.classes\?\.length \|\| 0\}/);
  assert.match(app, /case 'stundenplan': return istSekundarstufe\(app\.schulart\) \? <TeacherTimetable/);
  assert.match(sidebar, /Mein Stundenplan/);
});
