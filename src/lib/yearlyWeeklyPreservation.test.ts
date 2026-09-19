import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeYearlySuggestionIntoEmptyWeeklySlot } from './planningSync';
import { yearlyPlanCsv } from './yearlyPlanExport';

test('Jahresthema landet in freier Wochenstunde ohne den Jahresplan zu verändern', () => {
 const topic={thema:'Zahlenraum 10',buch:'AH S. 4',subCategories:['Mathematik (Operationen)'],type:'standard'};
 const before=JSON.stringify(topic);
 const res=mergeYearlySuggestionIntoEmptyWeeklySlot(undefined,topic,'Mathematik');
 assert.equal(res.status,'added');
 assert.equal(res.lesson.thema,'Zahlenraum 10');
 assert.equal(res.lesson.buch,'AH S. 4');
 assert.equal(res.lesson.fach,'Mathematik');
 assert.deepEqual(res.lesson.schwerpunkte,['Mathematik (Operationen)']);
 assert.equal(JSON.stringify(topic),before);
});
test('Belegte Wochenstunden behalten auch importierte Zusatzfelder, Hausübung und Teilstunden', () => {
 const old={fach:'Deutsch',thema:'Vorhanden',housework:'S. 5',material:'Buch',halves:{enabled:true},lernziel:'Lesen'};
 const original=JSON.stringify(old);
 const res=mergeYearlySuggestionIntoEmptyWeeklySlot(old,{thema:'Jahresthema'},'Deutsch');
 assert.equal(res.status,'occupied');
 assert.equal(JSON.stringify(res.lesson),original);
 assert.equal(JSON.stringify(old),original);
});
test('Unterschiedliche Fachzuordnung und leerer Jahresplaneintrag überschreiben nicht', () => {
 const saved={fach:'Mathematik'};
 assert.equal(mergeYearlySuggestionIntoEmptyWeeklySlot(saved,{thema:'Lesen'},'Deutsch').status,'occupied');
 assert.equal(mergeYearlySuggestionIntoEmptyWeeklySlot(undefined,{thema:'  '},'Deutsch').status,'missing-topic');
});
test('CSV für Druckzentrum enthält vorhandene Jahreseinträge, auch in Ferienwochen, und führt keine Formeln aus', () => {
 const weeks=[{sw:1,kw:38,monday:new Date(2026,8,14)},{sw:2,kw:39,monday:new Date(2026,8,21)}];
 const plan={38:{deutsch:{thema:'=A1',items:[{thema:'Lesen',buch:'S. 1'}]}},39:{deutsch:{thema:'Mehrwöchiges Thema'}}};
 const before=JSON.stringify(plan);
 const csv=yearlyPlanCsv(plan,weeks,[{id:'deutsch',label:'Deutsch'}],w=>w.kw===39?'Ferien':undefined);
 assert.match(csv, /'\\=A1/);
 assert.match(csv, /Lesen/);
 assert.match(csv, /Mehrwöchiges Thema/);
 assert.equal(JSON.stringify(plan),before);
});
