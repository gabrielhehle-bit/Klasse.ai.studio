import test from 'node:test';
import assert from 'node:assert/strict';
import { getDossierOverviewStats, getDossierPeriodDays, getDossierParticipationTimeline } from './dossierOverviewStats';
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

test('recent labels and counts exclude a status or mood outside the six-week range',()=>{
 const app={schuljahr:'2026/27',statusLog:[{schuelerId:'a',datum:'2026-08-01',iconId:'2'}],schuelerStimmung:{a:{'2026-08-01':3}}};
 const recent=getDossierOverviewStats(app,'a','recent',now);
 assert.equal(recent.latestBehavior,undefined);assert.equal(recent.latestMood,undefined);
 const year=getDossierOverviewStats(app,'a','year',now);
 assert.equal(year.latestBehavior?.datum,'2026-08-01');assert.equal(year.latestMood?.[0],'2026-08-01');
});

test('school-year calendar includes every day from the configured start, not only 84 days',()=>{
 const stats=getDossierOverviewStats({schuljahr:'2026/27'},'a','year',new Date(2027,4,31,12));
 const days=getDossierPeriodDays(stats.start,stats.today);
 assert.equal(days[0],'2026-08-01');assert.equal(days.at(-1),'2027-05-31');
 assert.equal(days.length,304);assert.equal(new Set(days).size,days.length);
 assert.ok(days.includes('2026-10-25'));assert.ok(days.includes('2027-03-28'));
});

test('participation uses inclusive period boundaries, signed entries and configured August start',()=>{
 const stats=getDossierOverviewStats({schuljahr:'2026/27'},'a','year',now);
 const entries=[
  {timestamp:'2026-07-31T23:59:00',points:20},
  {timestamp:'2026-08-01T00:00:00',points:2},
  {timestamp:'2026-09-01T10:00:00',points:-1},
  {timestamp:'2026-10-01T23:59:00',points:3},
  {timestamp:'2026-10-02T00:00:00',points:50},
  {timestamp:'invalid',points:40},
 ];
 const result=getDossierParticipationTimeline(entries,stats,'year');
 assert.equal(result.count,3);assert.equal(result.total,4);
 assert.deepEqual(result.timeline.map(bucket=>bucket.points),[2,-1,3]);
 const recent=getDossierParticipationTimeline(entries,getDossierOverviewStats({schuljahr:'2026/27'},'a','recent',now),'recent');
 assert.equal(recent.count,2);assert.equal(recent.total,2);assert.equal(recent.timeline.length,6);
 assert.equal(recent.timeline.reduce((sum,bucket)=>sum+bucket.points,0),recent.total);
});
