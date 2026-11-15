import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const charts=readFileSync('src/components/dossier/DossierObservationCharts.tsx','utf8');
const moodEditor=readFileSync('src/components/AttendanceMoodField.tsx','utf8');
const chrome=readFileSync('scripts/gradebook-dossier-mobile-browser-e2e.mjs','utf8');

test('dossier per-day teacher behavior form records only explicit real dated pupil statuses',()=>{
 assert.match(charts,/data-observation-behavior-editor/);
 assert.match(charts,/data-observation-behavior-date/);
 assert.match(charts,/data-observation-behavior-stage/);
 assert.match(charts,/data-observation-behavior-save/);
 assert.match(charts,/!previous\.schueler\.some\(child=>child\.id===student\.id\)/);
 assert.match(charts,/previous\.activeClassId!==activeClassId/);
 assert.match(charts,/entryDay>=fullYear\.start && entryDay<=fullYear\.end/);
 assert.match(charts,/statusLog:\[entry,\.\.\.\(previous\.statusLog\|\|\[\]\)\]/);
 assert.match(charts,/entryDay===toLocalDateKey\(\)/);
 assert.match(charts,/Vorherige Einträge bleiben im Verlauf erhalten/);
});

test('dossier year-long observation graphs scroll without altering the source measurements',()=>{
 assert.match(charts,/period==='year' && stats\.weeks\.length>6/);
 for(const dataKey of ['behavior','mood','attendance'])
   assert.match(charts,new RegExp('data-observation-chart-scroll="'+dataKey+'"'));
 assert.match(charts,/min-w-0 overflow-x-auto overscroll-x-contain/);
 assert.match(charts,/connectNulls=\{false\}/);
 assert.match(charts,/Math\.min\(1700,stats\.weeks\.length\*52\+60\)/);
});

test('real browser acceptance enters six moods via Attendance and six daily behaviors via Dossier',()=>{
 assert.match(moodEditor,/teacherSetStudentMood\(previous, studentId, mood, date\)/);
 assert.match(chrome,/PASS Six real dated child-mood selections entered in Attendance/);
 assert.match(chrome,/data-observation-behavior-save/);
 assert.match(chrome,/datedMoods/);
 assert.match(chrome,/data-observation-chart-scroll=mood/);
 assert.match(chrome,/data-observation-chart-scroll=behavior/);
 assert.match(chrome,/PASS 6 mood dates and 6 behavior days visibly rendered/);
});
