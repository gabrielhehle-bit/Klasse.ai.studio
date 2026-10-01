import test from 'node:test';
import assert from 'node:assert/strict';
import { getDossierAssessmentChart } from './dossierAssessmentChart';
const item=(id:string,date:string,rawGrade:number|string)=>({id,date,rawGrade,label:id,categoryLabel:'Test'});
test('grades are ordered by valid dates; undated, invalid dates and absence markers stay out of the chart',()=>{
 const s=getDossierAssessmentChart([item('late','2026-10-01',3),item('early','2026-09-01','2,5'),item('absent','2026-09-02','f'),item('undated','',1),item('impossible','2026-02-30',1)],'grades');
 assert.deepEqual(s.rows.map(x=>[x.id,x.value]),[['early',2.5],['late',3]]);assert.equal(s.excludedCount,3);
});
test('grade tendencies and ranges keep their numeric interpretation',()=>{
 assert.deepEqual(getDossierAssessmentChart([item('plus','2026-09-01','2+'),item('minus','2026-09-02','3-'),item('range','2026-09-03','2-3')],'grades').rows.map(x=>x.value),[1.75,3.25,2.5]);
});
test('points compare normalized percentages and preserve a real zero',()=>{
 const s=getDossierAssessmentChart([{...item('zero','2026-09-01',''),percent:0},{...item('half','2026-09-02',''),percent:50},{...item('missing','2026-09-03','')}],'points');
 assert.deepEqual(s.rows.map(x=>x.value),[0,50]);assert.equal(s.excludedCount,1);
});
