import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { KELGespraech } from '../types';
import {
  setKelQuickTeacherComment, addKelQuickGoal, editKelQuickGoal,
  removeKelQuickGoal, getLocalKelDate, hasUnsavedKelChanges,
} from './kelQuickEdit';

const saved = (): KELGespraech => ({
  id:'kel-2026',schuelerId:'child-a',datum:'2026-11-14',schuljahr:'2026/27',
  teilnehmer:['Kind','Mutter'],selbsteinschaetzungKind:{lesen:{wert:3,kommentar:'Macht Spaß'}},
  einschaetzungLehrperson:{lesen:{wert:2,kommentar:'Gutes Lesetempo'}},
  elternEindruck:'Rückmeldung der Eltern',
  zieleKind:[{id:'g1',ziel:'Selbstständig starten',woranErkennbar:'Beginnt allein',bisWann:'Dezember'}],
  vereinbarungen:'Täglich fünf Minuten üben',
  naechsterTermin:'Jänner',unterschriftKind:true,unterschriftEltern:false,
  unterschriftLehrperson:false,notiz:'Interner Vermerk',
});

test('quick teacher feedback only updates the chosen comment and preserves existing ratings',()=>{
  const original=saved(); const before=structuredClone(original);
  const next=setKelQuickTeacherComment(original,'lesen','Behutsam lesen');
  assert.equal(next.einschaetzungLehrperson?.lesen?.kommentar,'Behutsam lesen');
  assert.equal(next.einschaetzungLehrperson?.lesen?.wert,2);
  assert.equal(next.selbsteinschaetzungKind?.lesen?.kommentar,'Macht Spaß');
  assert.equal(next.notiz,'Interner Vermerk');
  assert.equal(next.elternEindruck,'Rückmeldung der Eltern');
  assert.deepEqual(original,before,'saved meeting is never modified while typing');
  const another=setKelQuickTeacherComment(next,'rechnen','Rechnet konzentriert');
  assert.equal(another.einschaetzungLehrperson?.lesen?.wert,2);
  assert.equal(another.einschaetzungLehrperson?.lesen?.kommentar,'Behutsam lesen');
  assert.equal(another.einschaetzungLehrperson?.rechnen?.kommentar,'Rechnet konzentriert');
  assert.equal(setKelQuickTeacherComment(another,'','ignored'),another);
});

test('quick goals preserve existing goals and update only their selected field',()=>{
  const original=saved();const before=structuredClone(original);
  const added=addKelQuickGoal(original,'g2');
  assert.equal(added.zieleKind?.length,2);
  assert.equal(added.zieleKind?.[0].ziel,'Selbstständig starten');
  assert.equal(addKelQuickGoal(added,'g2'),added,'duplicate ID is ignored');
  const named=editKelQuickGoal(added,'g2','ziel','Freies Lesen');
  const detailed=editKelQuickGoal(named,'g2','bisWann','Frühjahr');
  assert.equal(detailed.zieleKind?.[1].ziel,'Freies Lesen');
  assert.equal(detailed.zieleKind?.[1].bisWann,'Frühjahr');
  assert.equal(detailed.zieleKind?.[0].woranErkennbar,'Beginnt allein');
  const removed=removeKelQuickGoal(detailed,'g2');
  assert.deepEqual(removed.zieleKind,original.zieleKind);
  assert.deepEqual(original,before);
});

test('editor snapshot detects unsaved changes, including changes in the new quick fields',()=>{
  const original=saved();const snapshot=JSON.stringify(original);
  assert.equal(hasUnsavedKelChanges(snapshot,original),false);
  assert.equal(hasUnsavedKelChanges(snapshot,setKelQuickTeacherComment(original,'lesen','Neu')),true);
  assert.equal(hasUnsavedKelChanges(snapshot,{...original,vereinbarungen:'Neue Vereinbarung'}),true);
  assert.equal(hasUnsavedKelChanges(snapshot,{...original,elternEindruck:'Neu'}),true);
  assert.equal(hasUnsavedKelChanges(snapshot,null),false);
});

test('new KEL meeting date uses local calendar day, including DST weekends',()=>{
  assert.equal(getLocalKelDate(new Date(2026,9,25,12,30)),'2026-10-25');
  assert.equal(getLocalKelDate(new Date(2027,2,28,12,30)),'2027-03-28');
  assert.equal(getLocalKelDate(new Date(2026,11,31,12)),'2026-12-31');
});

const main=readFileSync('src/components/KELGespraeche.tsx','utf8');
const quick=readFileSync('src/components/KELQuickEntry.tsx','utf8');

test('the quick entry is the default tab, and detailed existing tabs are retained',()=>{
  assert.match(main,/activeTab, setActiveTab\] = useState<EditorSection \| 'pruefen'>\('schnell'\)/);
  assert.match(main,/setActiveTab\('schnell'\)/);
  assert.match(main,/label: 'Schnellerfassung'/);
  assert.match(main,/label: 'Vorbereitung'/);
  assert.match(main,/label: 'Selbsteinschätzung'/);
  assert.match(main,/label: 'Lehrperson'/);
  assert.match(main,/label: 'Ziele & Abschluss'/);
  assert.match(main,/<KELQuickEntry\s+meeting=\{editingMeeting\}/);
  assert.match(main,/onClick=\{handleSave\}/);
  assert.match(main,/Änderungen speichern/);
});

test('editor cannot accidentally discard changed contents by overlay or X close',()=>{
  const calls=main.match(/onClick=\{handleCloseEditor\}/g)||[];
  assert.equal(calls.length,2);
  assert.match(main,/hasUnsavedKelChanges\(originalMeetingDraftRef\.current, editingMeeting\)/);
  assert.match(main,/!window\.confirm\('Ungespeicherte Änderungen wirklich verwerfen\?'\)/);
  assert.match(main,/originalMeetingDraftRef\.current = JSON\.stringify\(newMeeting\)/);
  assert.match(main,/originalMeetingDraftRef\.current = JSON\.stringify\(meeting\)/);
  assert.match(main,/data-kel-unsaved-state/);
});

test('quick editor writes only to the existing draft, never the app or print-approved notes',()=>{
  for(const attribute of ['data-kel-quick-entry','data-kel-quick-teacher-comment',
    'data-kel-quick-goals','data-kel-quick-parent-impression','data-kel-quick-agreements'])
    assert.ok(quick.includes(attribute));
  assert.match(quick,/setKelQuickTeacherComment\(previous, selectedArea\.id, event\.target\.value\)/);
  assert.match(quick,/editKelQuickGoal\(previous, goal\.id/);
  assert.match(quick,/addKelQuickGoal\(previous, crypto\.randomUUID\(\)\)/);
  assert.match(quick,/setMeeting\(previous => previous/);
  assert.doesNotMatch(quick,/setApp\(|localStorage|persist/);
  assert.match(quick,/wird nicht automatisch ins Elternblatt übernommen/);
  assert.match(quick,/Gespeichert wird erst mit/);
});
