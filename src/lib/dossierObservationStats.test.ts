import test from 'node:test';
import assert from 'node:assert/strict';
import { getDossierObservationStats } from './dossierObservationStats';
const now=new Date(2026,9,1,12);
test('six calendar weeks include gaps; invalid, future, other child and other school year data are excluded',()=>{
 const app={schuljahr:'2026/27',schuelerStimmung:{a:{'2026-09-01':1,'2026-09-02':3,'2026-02-30':2,'2026-10-02':2,'2025-09-01':2,'2026-09-03':'NaN'},b:{'2026-09-01':5}}};
 const s=getDossierObservationStats(app,'a','recent',now);assert.equal(s.weeks.length,6);assert.equal(s.moods.length,2);assert.equal(s.weeks.find(w=>w.moodCount)?.mood,2);assert.ok(s.weeks.some(w=>w.mood===null));
});
test('behavior retains actual configured stages and unknown stages; repeated daily feedback is collapsed',()=>{
 const s=getDossierObservationStats({behavior_stages:[{id:'custom',label:'Ruhiger Tag'}],statusLog:[{schuelerId:'a',datum:'2026-09-01',iconId:'custom',timestamp:1},{schuelerId:'a',datum:'2026-09-01',iconId:'other',timestamp:2},{schuelerId:'b',datum:'2026-09-02',iconId:'custom'}]},'a','recent',now);
 assert.equal(s.behavior.length,1);assert.equal(s.weeks.find(w=>w.behaviorCount)?.unknownBehavior,1);
});
test('attendance distinguishes partial days, real present codes, legacy absence and note-only records',()=>{
 const s=getDossierObservationStats({anwesenheit:{a:{'2026-09-01':{1:'a',2:'u'},'2026-09-02':{1:'a'},'2026-09-03':'k'}},anwesenheitDetail:{a:{'2026-09-04':{notiz:'Notiz'},'2026-09-05':{fehlstunden:2,notiz:'Unentschuldigt'}}}},'a','year',now);
 assert.deepEqual(s.attendance.map(a=>a.kind),['unexcused','unknown','excused','present','mixed']);assert.equal(s.weeks.reduce((n,w)=>n+w.present,0),1);
});
test('year ends with selected school year and empty records produce no fictitious attendance',()=>{
 const s=getDossierObservationStats({schuljahr:'2025/26',anwesenheit:{a:{'2026-09-01':{1:'a'},'2026-07-01':{1:'a'}}}},'a','year',now);assert.equal(s.end,'2026-07-31');assert.equal(s.attendance.length,1);
 const empty=getDossierObservationStats({},'a','recent',now);assert.equal(empty.attendance.length,0);assert.equal(empty.moods.length,0);
});
