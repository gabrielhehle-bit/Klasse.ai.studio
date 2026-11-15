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


test('many documented dated assessments keep all measured grades in order without invented values', () => {
 const entries=[
  item('nov10','2026-11-10',2),item('sep02','2026-09-02',4),
  item('oct01','2026-10-01',3),item('sep20','2026-09-20',3),
  item('nov03','2026-11-03',2),item('oct15','2026-10-15',1),
  item('nov12','2026-11-12',2),item('oct28','2026-10-28',1),
  item('missing','',5),item('other','2026-11-14','f')
 ];
 const source=structuredClone(entries);
 const result=getDossierAssessmentChart(entries,'grades');
 assert.equal(result.rows.length,8);
 assert.equal(result.excludedCount,2);
 assert.deepEqual(result.rows.map(row=>row.id),
  ['sep02','sep20','oct01','oct15','oct28','nov03','nov10','nov12']);
 assert.deepEqual(result.rows.map(row=>row.value),[4,3,3,1,1,2,2,2]);
 assert.deepEqual(entries,source);
});
