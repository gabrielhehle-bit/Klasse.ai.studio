import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { AppState } from '../types';
import { normalizeKelMeeting } from './kelData';
import { buildKelConversationOverview } from './kelConversationOverview';
import { getStudentAssessmentDomainPerformance } from './assessmentDomainPerformance';
import { summarizeKelMood, summarizeKelBehavior } from './kelParentReportMetrics';
import { getDossierOverviewStats } from './dossierOverviewStats';
import { selectKelParentLearningAreas } from './kelParentAreaSelection';

const now = new Date(2026, 10, 14, 12);
const fixture = (): AppState => ({
  schuljahr: '2026/27',
  schueler: [{ id:'child-a' }, { id:'child-b' }],
  schuelerStimmung: {
    'child-a': { '2026-09-08': 2, '2026-11-10': 1, '2025-11-10': 5 },
    'child-b': { '2026-11-10': 5 },
  },
  statusLog: [
    { id:'a1',schuelerId:'child-a',datum:'2026-09-08',iconId:'2',timestamp:10 },
    { id:'a1-new',schuelerId:'child-a',datum:'2026-09-08',iconId:'3',timestamp:20 },
    { id:'b1',schuelerId:'child-b',datum:'2026-11-10',iconId:'5',timestamp:30 },
  ],
  notenMeta: {
    Deutsch: { assessmentMode:'grades', colAreas:{lzk:{0:'Lesen',1:'Rechtschreibung'}} },
  },
  noten: {
    'child-a': { Deutsch: { '1': { lzk:[2,1] }, '2': { lzk:[] } } },
    'child-b': { Deutsch: { '1': { lzk:[5,5] } } },
  },
} as unknown as AppState);

const meeting = () => normalizeKelMeeting({
  id:'kel-1',schuelerId:'child-a',datum:'2026-10-29',schuljahr:'2026/27',
  einschaetzungLehrperson: {
    lesen:{wert:2,kommentar:'  Liest mit Freude.  '},
    konzentration:{wert:1,kommentar:'  '},
  },
  elternEindruck:'Interne Elternrückmeldung',notiz:'Vertrauliche Gesprächsnotiz',
  vereinbarungen:'  Wir lesen jeden Abend.  ',
  zieleKind:[{id:'goal-1',ziel:'  Genau lesen  ',woranErkennbar:'  Vorlesen  ',bisWann:' Dezember '}],
});

test('KEL conversation cards derive the same child-scoped data as the parent print report', () => {
  const app = fixture();
  const snapshot = structuredClone(app);
  const result = buildKelConversationOverview(app, meeting(), now);
  const stats = getDossierOverviewStats(app,'child-a','year',now);
  assert.equal(result.showLiveEvidence,true);
  assert.deepEqual(result.mood,summarizeKelMood(app.schuelerStimmung?.['child-a'],stats.start,stats.today));
  assert.deepEqual(result.behavior,summarizeKelBehavior(stats.logs,stats.stages));
  assert.deepEqual(result.subjects.find(s=>s.subject==='Deutsch')?.areas,
    selectKelParentLearningAreas(getStudentAssessmentDomainPerformance(app,'child-a','Deutsch','both')));
  assert.equal(result.mood?.total,2);
  assert.equal(result.behavior?.total,1,'legacy duplicate daily observations are collapsed');
  assert.equal(result.subjects[0].areas.length,2);
  assert.deepEqual(app,snapshot,'building an overview never saves or changes marks or records');
});

test('saved teacher comments, actual goals and agreements are displayed without fabrication or raw private notes', () => {
  const result=buildKelConversationOverview(fixture(),meeting(),now);
  assert.deepEqual(result.teacherComments,[
    {id:'lesen',label:'Lesefreude & Technik',text:'Liest mit Freude.'},
  ]);
  assert.deepEqual(result.goals,[
    {id:'goal-1',text:'Genau lesen',recognizable:'Vorlesen',due:'Dezember'},
  ]);
  assert.equal(result.agreements,'Wir lesen jeden Abend.');
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('Interne Elternrückmeldung'));
  assert.ok(!serialized.includes('Vertrauliche Gesprächsnotiz'));
});

test('historical and other-child protocols cannot be enriched using current-year records', () => {
  const app=fixture();
  const historical=normalizeKelMeeting({...meeting(),schuljahr:'2025/26'});
  const older=buildKelConversationOverview(app,historical,now);
  assert.equal(older.showLiveEvidence,false);
  assert.equal(older.mood,null);
  assert.equal(older.behavior,null);
  assert.deepEqual(older.subjects,[]);
  assert.equal(older.goals.length,1,'saved protocol goals are still visible');
  const missing=normalizeKelMeeting({...meeting(),schuelerId:'not-in-class'});
  const detached=buildKelConversationOverview(app,missing,now);
  assert.equal(detached.showLiveEvidence,false);
  assert.deepEqual(detached.subjects,[]);
  assert.equal(detached.mood,null);
});

test('no evidence never becomes a guessed score or adjective', () => {
  const app={...fixture(), schuelerStimmung:{}, statusLog:[],noten:{}} as AppState;
  const result=buildKelConversationOverview(app,meeting(),now);
  assert.equal(result.mood?.total,0);
  assert.equal(result.mood?.average,null);
  assert.equal(result.behavior?.total,0);
  assert.deepEqual(result.subjects,[]);
});

const main = readFileSync('src/components/KELGespraeche.tsx','utf8');
const card = readFileSync('src/components/KELConversationOverview.tsx','utf8');

test('conversation view shows one shared-data overview before detailed comparison, without altering print workflow',()=>{
  assert.match(main,/import KELConversationOverview from '\.\/KELConversationOverview'/);
  assert.match(main,/<KELConversationOverview key=\{viewingMeeting\.id\} meeting=\{viewingMeeting\} \/>/);
  assert.match(main,/<ComparisonView meeting=\{viewingMeeting\} \/>/);
  assert.match(main,/activePrintTemplate: 'kel_elternblatt'/);
  assert.match(main,/activePrintTemplate: 'kel'/);
  assert.match(card,/data-kel-conversation-overview/);
  assert.match(card,/data-kel-conversation-child=\{meeting\.schuelerId\}/);
  assert.match(card,/data-kel-conversation-mood-chart/);
  assert.match(card,/data-kel-conversation-behavior-chart/);
  assert.match(card,/data-kel-conversation-learning/);
  assert.match(card,/data-kel-conversation-feedback/);
  assert.match(card,/data-kel-conversation-goals/);
  assert.match(card,/data-kel-conversation-agreements/);
  assert.match(card,/data-kel-historical-evidence/);
  assert.match(card,/no-print/);
  assert.match(card,/Aktuelle Schuldokumentation, kein archivierter Stand/);
  assert.doesNotMatch(card,/setApp\(/);
});
