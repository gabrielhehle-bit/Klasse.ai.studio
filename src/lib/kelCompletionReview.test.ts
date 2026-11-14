import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { KELGespraech } from '../types';
import { getKelCompletionReview } from './kelCompletionReview';

const meeting = (): KELGespraech => ({
  id:'kel-test',schuelerId:'child-a',datum:'2026-11-14',schuljahr:'2026/27',
  teilnehmer:['Kind','Mutter','Lehrperson'],
  selbsteinschaetzungKind:{lesen:{wert:2,kommentar:'Lesen gefällt mir.'}},
  einschaetzungLehrperson:{
    lesen:{wert:3,kommentar:'  Liest motiviert.  '},
    rechnen:{wert:4,kommentar:'  '}
  },
  elternEindruck:'  Zu Hause wird gemeinsam gelesen.  ',
  zieleKind:[
    {id:'g1',ziel:'  Selbstständig beginnen ',woranErkennbar:' Startet ohne Hilfe ',bisWann:' Dezember '},
    {id:'g2',ziel:' Regelmäßig lesen ',woranErkennbar:'  ',bisWann:'  '},
  ],
  vereinbarungen:'  Jeden Tag fünf Minuten lesen.\nFreitags Rückmeldung geben.  ',
  naechsterTermin:' Jänner 2027 ',
  unterschriftKind:true,unterschriftEltern:false,unterschriftLehrperson:false,
  notiz:'INTERNE VERTRAULICHE NOTIZ',
});

test('completion review includes real goals, teacher feedback, agreements and next appointment without changing the stored draft',()=>{
  const saved=meeting();
  const before=structuredClone(saved);
  const reviewed=getKelCompletionReview(saved);
  assert.equal(reviewed.studentId,'child-a');
  assert.equal(reviewed.date,'2026-11-14');
  assert.equal(reviewed.schoolYear,'2026/27');
  assert.deepEqual(reviewed.participants,['Kind','Mutter','Lehrperson']);
  assert.deepEqual(reviewed.goals,[
    {id:'g1',text:'Selbstständig beginnen',recognizable:'Startet ohne Hilfe',due:'Dezember'},
    {id:'g2',text:'Regelmäßig lesen',recognizable:'',due:''},
  ]);
  assert.deepEqual(reviewed.teacherComments,[{id:'lesen',label:'Lesefreude & Technik',text:'Liest motiviert.'}]);
  assert.deepEqual(reviewed.childComments,[{id:'lesen',label:'Lesefreude & Technik',text:'Lesen gefällt mir.'}]);
  assert.equal(reviewed.agreements,'Jeden Tag fünf Minuten lesen.\nFreitags Rückmeldung geben.');
  assert.equal(reviewed.parentImpression,'Zu Hause wird gemeinsam gelesen.');
  assert.equal(reviewed.nextAppointment,'Jänner 2027');
  assert.ok(reviewed.suggestions.some(hint=>hint.includes('Erkennungszeichen')));
  assert.equal(reviewed.requiredMissing.length,0);
  assert.deepEqual(saved,before,'the review must never change stored ratings or agreement texts');
  assert.ok(!JSON.stringify(reviewed).includes('INTERNE VERTRAULICHE NOTIZ'),'private internal notes are not echoed in the review projection');
});

test('blank or partially entered KEL records retain empty states; suggestions are not invented agreements',()=>{
  const draft:Partial<KELGespraech>={
    id:'new',schuelerId:'',datum:'',schuljahr:'2026/27',
    zieleKind:[{id:'empty',ziel:'  ',woranErkennbar:'  ',bisWann:'  '}],
    einschaetzungLehrperson:{},
    vereinbarungen:'', naechsterTermin:'',
  };
  const before=structuredClone(draft);
  const result=getKelCompletionReview(draft);
  assert.deepEqual(result.goals,[]);
  assert.deepEqual(result.teacherComments,[]);
  assert.equal(result.agreements,'');
  assert.equal(result.nextAppointment,'');
  assert.deepEqual(result.requiredMissing,['Kind auswählen']);
  assert.ok(result.suggestions.includes('Gesprächsdatum fehlt'));
  assert.ok(result.suggestions.includes('Noch kein Ziel formuliert'));
  assert.ok(result.suggestions.includes('Noch keine Vereinbarung dokumentiert'));
  assert.ok(result.suggestions.includes('Leere Zielzeilen im Entwurf'));
  assert.deepEqual(draft,before);
});

test('review keeps every documented goal and comment instead of silently truncating them',()=>{
  const original=meeting();
  original.zieleKind=[
    ...original.zieleKind,
    ...Array.from({length:7},(_,i)=>({id:'extra'+i,ziel:'Ziel '+i,woranErkennbar:'Nachweis '+i,bisWann:'Später'})),
  ];
  for(let i=0;i<7;i++) original.einschaetzungLehrperson['custom'+i]={wert:2,kommentar:'Rückmeldung '+i};
  const review=getKelCompletionReview(original);
  assert.equal(review.goals.length,9);
  assert.equal(review.teacherComments.length,8);
  assert.ok(review.teacherComments.some(row=>row.label==='Weiterer Bereich'),'legacy/custom areas remain present');
  assert.ok(review.goals.some(row=>row.text==='Ziel 6'));
});

const editor=readFileSync('src/components/KELGespraeche.tsx','utf8');
const component=readFileSync('src/components/KELCompletionReview.tsx','utf8');

test('save is available only after explicit current-draft completion review',()=>{
  assert.match(editor,/import KELCompletionReview from '\.\/KELCompletionReview'/);
  assert.match(editor,/activeTab !== 'pruefen'\) return/);
  assert.match(editor,/data-kel-open-completion-review/);
  assert.match(editor,/onClick=\{openCompletionReview\}/);
  assert.match(editor,/activeTab === 'pruefen' && editingMeeting/);
  assert.match(editor,/<KELCompletionReview[\s\S]*?meeting=\{editingMeeting\}/);
  assert.match(editor,/data-kel-review-confirm-save/);
  assert.match(editor,/onClick=\{handleSave\}/);
  assert.match(editor,/disabled=\{!editingMeeting\?\.schuelerId/);
  assert.match(editor,/reviewReturnTab/);
  assert.match(editor,/setActiveTab\(reviewReturnTab\)/);
  assert.match(editor,/setActiveTab\(tab\)/);
});

test('review is draft-only, not printed or automatically copied to parent report',()=>{
  for(const id of ['data-kel-completion-review','data-kel-review-goals','data-kel-review-agreements',
    'data-kel-review-feedback','data-kel-review-parent-impression','data-kel-review-suggestions'])
    assert.match(component,new RegExp(id));
  assert.match(component,/className="mx-auto max-w-4xl space-y-4/);
  assert.match(component,/Erst „Änderungen speichern“ legt das Protokoll ab/);
  assert.match(component,/Das separate Elternblatt übernimmt keine privaten Gesprächsnotizen automatisch/);
  assert.doesNotMatch(component,/setApp\(|localStorage|window\.print/);
  assert.match(component,/onEdit\('schnell'\)/);
  assert.match(component,/onEdit\('ziele'\)/);
});

test('all incomplete areas are suggestions rather than silently introduced mandatory fields',()=>{
  assert.match(component,/Diese Hinweise sind keine Pflichtangaben/);
  assert.match(component,/als Zwischenstand gespeichert werden/);
  assert.match(component,/review\.requiredMissing/);
  assert.match(component,/review\.suggestions/);
  assert.match(editor,/app\.schueler\.some\(student => student\.id === editingMeeting\.schuelerId\)/);
});
