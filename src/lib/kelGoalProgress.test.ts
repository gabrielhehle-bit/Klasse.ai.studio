import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { KELGespraech } from '../types';
import {
  appendKelGoalProgress, getKelGoalProgress, getKelGoalLatestProgress,
  getPriorKelGoals, validKelProgressDate, KEL_PROGRESS_LABELS,
} from './kelGoalProgress';

const old = (): KELGespraech => ({
  id: 'oct', schuelerId: 'student-a', datum: '2026-10-29', schuljahr: '2026/27',
  teilnehmer: ['Kind'], selbsteinschaetzungKind: {}, einschaetzungLehrperson: {},
  elternEindruck: '', vereinbarungen: 'Lesen üben', naechsterTermin: '',
  unterschriftKind: false, unterschriftEltern: false,
  unterschriftLehrperson: false, notiz: 'INTERNER VERTRAULICHER TEXT',
  zieleKind: [
    { id: 'read', ziel: 'Lesefluss', woranErkennbar: 'Täglich vorlesen', bisWann: 'Dezember' },
    { id: 'write', ziel: 'Sorgfältiges Schreiben', woranErkennbar: 'Heft', bisWann: 'Jänner' },
  ],
});
const other = (): KELGespraech => ({
  ...old(),id:'other',schuelerId:'student-b',zieleKind:[{id:'read',ziel:'NICHT VON STUDENT A',woranErkennbar:'',bisWann:''}],
});

test('append one manually dated observation without modifying any saved record, score or other goal', () => {
  const records = [old(),other()];
  const snapshot=structuredClone(records);
  const input={id:'observation-1',datum:'2026-11-02',status:'fortschritt' as const,notiz:'  Drei Sätze flüssig gelesen. '};
  const updated=appendKelGoalProgress(records,'oct','student-a','read',input,'2026-11-14');
  assert.notStrictEqual(updated,records);
  assert.deepEqual(records,snapshot,'original state immutable');
  assert.equal(updated[0].zieleKind[0].ziel,'Lesefluss','original goal remains');
  assert.deepEqual(updated[0].zieleKind[1],records[0].zieleKind[1],'other goals untouched');
  assert.strictEqual(updated[1],records[1],'other pupil untouched');
  assert.deepEqual(getKelGoalProgress(updated[0].zieleKind[0]),[
    {...input,notiz:'Drei Sätze flüssig gelesen.'},
  ]);
  assert.equal(updated[0].notiz,'INTERNER VERTRAULICHER TEXT');
  const second=appendKelGoalProgress(updated,'oct','student-a','read',
    {id:'observation-2',datum:'2026-11-12',status:'erreicht',notiz:'Liest den Text selbständig.'},'2026-11-14');
  assert.equal(getKelGoalProgress(second[0].zieleKind[0]).length,2);
  assert.equal(getKelGoalLatestProgress(second[0].zieleKind[0])?.status,'erreicht');
  assert.equal(getKelGoalProgress(records[0].zieleKind[0]).length,0,'past object remains unchanged');
  assert.strictEqual(appendKelGoalProgress(second,'oct','student-a','read',
    {id:'observation-2',datum:'2026-11-13',status:'erreicht',notiz:'Duplicate'},'2026-11-14'),second);
});

test('wrong pupil, missing meeting, missing goal or blank notes must never write',()=>{
  const original=[old(),other()];
  const entry={id:'entry',datum:'2026-11-10',status:'in_arbeit' as const,notiz:'Echte Beobachtung'};
  const cases=[
    ['other','student-a','read',entry],
    ['oct','student-b','read',entry],
    ['missing','student-a','read',entry],
    ['oct','student-a','missing',entry],
    ['oct','student-a','read',{...entry,notiz:'  '}],
    ['oct','student-a','read',{...entry,status:'unbekannt' as any}],
    ['oct','student-a','read',{...entry,datum:'2026-10-28'}],
    ['oct','student-a','read',{...entry,datum:'2026-11-15'}],
    ['oct','student-a','read',{...entry,datum:'2026-02-30'}],
  ] as const;
  for(const [meetingId,studentId,goalId,candidate] of cases){
    assert.strictEqual(appendKelGoalProgress(original,meetingId,studentId,goalId,candidate,'2026-11-14'),original);
  }
  assert.deepEqual(original,[old(),other()]);
});

test('valid calendar dates cover 29 February and reject impossible dates',()=>{
  assert.equal(validKelProgressDate('2024-02-29'),true);
  assert.equal(validKelProgressDate('2026-02-29'),false);
  assert.equal(validKelProgressDate('2026-11-14'),true);
  assert.equal(validKelProgressDate('2026-13-14'),false);
  assert.equal(validKelProgressDate('2026-11-14T12:00:00Z'),false);
  assert.equal(validKelProgressDate(''),false);
});

test('latest result follows observation date, not a fabricated rating or sorted by UUID',()=>{
  const goal=old().zieleKind[0];
  goal.fortschritt=[
    {id:'z',datum:'2026-11-14',status:'in_arbeit',notiz:'Mehr Übung nötig'},
    {id:'a',datum:'2026-11-01',status:'fortschritt',notiz:'Erste Verbesserung'},
  ];
  assert.deepEqual(getKelGoalProgress(goal).map(e=>e.datum),['2026-11-01','2026-11-14']);
  assert.equal(getKelGoalLatestProgress(goal)?.status,'in_arbeit');
  assert.equal(KEL_PROGRESS_LABELS.erreicht,'Ziel erreicht');
  assert.equal(getKelGoalLatestProgress(old().zieleKind[0]),null,'without entries there is no invented status');
});

test('next conversation shows the last earlier meeting with goals from the same child across years',()=>{
  const first=old();
  const second={...old(),id:'nov',datum:'2026-11-07',zieleKind:[
    {id:'g1',ziel:'Selbständig arbeiten',woranErkennbar:'',bisWann:'',
      fortschritt:[{id:'p',datum:'2026-11-13',status:'fortschritt' as const,notiz:'Beginnt allein'}]},
  ]};
  const later={...old(),id:'future',datum:'2026-12-15'};
  const previousDifferentYear={...old(),id:'past-year',datum:'2026-05-06',schuljahr:'2025/26'};
  const records=[first,other(),second,later,previousDifferentYear];
  const snapshot=structuredClone(records);
  const draft={id:'new-draft',schuelerId:'student-a',datum:'2026-11-14',schuljahr:'2026/27'};
  const summary=getPriorKelGoals(records,draft);
  assert.equal(summary?.meetingId,'nov');
  assert.deepEqual(summary?.goals.map(g=>g.goal.ziel),['Selbständig arbeiten']);
  assert.equal(summary?.goals[0].latest?.notiz,'Beginnt allein');
  assert.equal(getPriorKelGoals(records,{...draft,datum:'2026-10-15'})?.meetingId,'past-year');
  assert.equal(getPriorKelGoals(records,{...draft,schuelerId:'nope'}),null);
  assert.equal(getPriorKelGoals(records,{...draft,datum:'invalid'}),null);
  assert.deepEqual(records,snapshot,'prior summary cannot modify saved child records');
});

test('previous meeting without progress stays explicitly undocumented',()=>{
  const summary=getPriorKelGoals([old()],{id:'new',schuelerId:'student-a',datum:'2026-11-14'});
  assert.equal(summary?.goals.length,2);
  assert.equal(summary?.goals[0].latest,null);
  assert.deepEqual(summary?.goals[0].progress,[]);
});

const panel=readFileSync('src/components/KELGoalProgressPanel.tsx','utf8');
const quick=readFileSync('src/components/KELQuickEntry.tsx','utf8');
const view=readFileSync('src/components/KELGespraeche.tsx','utf8');
const parent=readFileSync('src/lib/kelParentMeetingDraft.ts','utf8');

test('progress is tied to the saved meeting and a specific goal, with explicit observation entry',()=>{
  assert.match(view,/import KELGoalProgressPanel from '\.\/KELGoalProgressPanel'/);
  assert.match(view,/<KELGoalProgressPanel/);
  assert.match(panel,/data-kel-goal-progress-panel/);
  assert.match(panel,/getKelGoalLatestProgress\(goal\)/);
  assert.match(panel,/data-kel-goal-progress-history/);
  assert.match(panel,/data-kel-goal-progress-editor/);
  assert.match(panel,/data-kel-goal-progress-save/);
  assert.match(panel,/disabled=\{!canSubmit\}/);
  assert.match(panel,/appendKelGoalProgress\(previous\.kelGespraeche, stored\.id/);
  assert.match(panel, /\{ \.\.\.previous, kelGespraeche: updated \}/);
});

test('next KEL meeting reads only earlier same-child goals, without importing their private observations into parent print',()=>{
  assert.match(quick,/getPriorKelGoals\(app\.kelGespraeche, meeting\)/);
  assert.match(quick,/data-kel-prior-goals/);
  assert.match(quick,/data-kel-prior-goal-status/);
  assert.match(quick,/Noch nicht dokumentiert/);
  assert.match(quick,/nicht automatisch\s+als neue Ziele oder Bewertungen übernommen/);
  assert.match(parent,/goalsText: goals\.join\('\\n'\)/);
  assert.doesNotMatch(parent,/fortschritt|\.notiz|progress/);
  assert.match(panel,/Interne Dokumentation, nicht automatisch im Elternblatt/);
});

test('KEL parent print is explicitly opt-in for each progress observation, with no saved selection', () => {
  assert.match(view, /const \[selectedProgressIds, setSelectedProgressIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(view, /data-kel-print-progress-selection/);
  assert.match(view, /type === 'protocol' && progressChoices\.length > 0/);
  assert.match(view, /selectedProgressIds\.includes\(item\.key\)/);
  assert.match(view, /printableProgress\.length > 0/);
  assert.match(view, /data-kel-print-selected-progress/);
  assert.match(view, /className="print:hidden/);
  assert.match(view, /data-kel-print-action/);
  assert.match(view, /onClick=\{\(\) => window\.print\(\)\}/);
  assert.doesNotMatch(view, /setApp\([^)]*selectedProgressIds/);
});

test('the KEL child self-assessment excludes progress and print choices are not persisted', () => {
  assert.match(view, /const printableProgress = type === 'protocol'/);
  assert.match(view, /getKelGoalProgress\(goal\)/);
  assert.match(view, /selectedProgressIds\.includes\(key\)/);
  assert.match(view, /meeting=\{meetings\.find\(item => item\.id === viewingMeeting\.id/);
});
