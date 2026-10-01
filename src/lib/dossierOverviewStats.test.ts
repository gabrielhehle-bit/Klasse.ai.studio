import test from 'node:test';
import assert from 'node:assert/strict';
import { getDossierOverviewStats } from './dossierOverviewStats';
const now=new Date(2026,9,1,12);
test('overview keeps empty weeks as mood gaps and excludes other children, future and old records',()=>{
 const app={schuljahr:'2026/27',statusLog:[{schuelerId:'a',datum:'2026-09-01',iconId:'2',timestamp:1},{schuelerId:'b',datum:'2026-09-01',iconId:'5',timestamp:2},{schuelerId:'a',datum:'2026-09-01',iconId:'3',timestamp:3}],schuelerStimmung:{a:{'2026-09-01':1,'2026-09-02':3,'2026-10-02':5,'2025-09-01':5}}};
 const s=getDossierOverviewStats(app,'a','recent',now);
 assert.equal(s.weeks.length,6);assert.equal(s.logs.length,1);assert.equal(s.weeks.find(w=>w.behaviorCount)?.stages['3'],1);assert.equal(s.moodCount,2);assert.equal(s.weeks.find(w=>w.moodCount)?.mood,2);assert.ok(s.weeks.some(w=>w.mood===null));
});
test('absence hours use the original daily detail precedence and selected school year',()=>{
 const app={schuljahr:'2026/27',anwesenheit:{a:{'2026-09-01':{1:'e',2:'u'},'2026-09-02':{1:'a'},'2025-09-01':{1:'u'}}},anwesenheitDetail:{a:{'2026-09-01':{fehlstunden:6},'2026-09-03':{fehlstunden:3,notiz:'Unentschuldigt'}}}};
 const s=getDossierOverviewStats(app,'a','year',now);assert.equal(s.excused,1);assert.equal(s.unexcused,4);assert.equal(s.attendanceCount,3);assert.equal(s.weeks[0].mood,null);
});

test('latest mood does not carry a previous school year forward',()=>{
 const s=getDossierOverviewStats({schuljahr:'2026/27',schuelerStimmung:{a:{'2025-09-01':1,'2026-10-02':2}}},'a','year',now);
 assert.equal(s.latestMood,undefined);assert.equal(s.moodCount,0);
});
