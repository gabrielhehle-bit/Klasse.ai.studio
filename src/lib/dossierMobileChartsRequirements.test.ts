import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradeChart=readFileSync('src/components/dossier/DossierAssessmentChart.tsx','utf8');
const overview=readFileSync('src/components/dossier/DossierUebersicht.tsx','utf8');
const evidence=readFileSync('src/components/dossier/DossierLeistungen.tsx','utf8');
const e2e=readFileSync('scripts/gradebook-dossier-mobile-browser-e2e.mjs','utf8');

test('dated grade chart scrolls when enough real dated comparable evidence exists',()=>{
 assert.match(gradeChart,/rows\.length >= 5/);
 assert.match(gradeChart,/data-dossier-assessment-scroll/);
 assert.match(gradeChart,/min-w-0 overflow-x-auto overscroll-x-contain/);
 assert.match(gradeChart,/data-dossier-assessment-chart-plot/);
 assert.match(gradeChart,/Math\.min\(1400, rows\.length \* 72 \+ 60\)/);
 assert.match(gradeChart,/style=\{\{minWidth: scrollWidth/);
 assert.match(gradeChart,/aria-label="Datierter Notenverlauf/);
 assert.match(gradeChart,/Noch keine datierten Bewertungen/);
});

test('school-year mood, behavior and participation charts scroll without changing source series',()=>{
 assert.match(overview,/participationPlotMinWidth/);
 assert.match(overview,/wellbeingPlotMinWidth/);
 assert.match(overview,/data-dossier-trend-scroll="participation"/);
 assert.match(overview,/data-dossier-trend-scroll="wellbeing"/);
 assert.match(overview,/period === 'year' && wellbeingTimeline\.length > 6/);
 assert.match(overview,/period === 'year' && participationTimeline\.length > 6/);
 assert.match(overview,/dataKey="mood"/);
 assert.match(overview,/dataKey="behavior"/);
 assert.match(overview,/connectNulls=\{false\}/);
});

test('real Chrome acceptance test creates dated, per-pupil observations and measures visible SVGs',()=>{
 assert.match(evidence,/data-dossier-assessment-editor/);
 assert.match(evidence,/data-dossier-assessment-date/);
 assert.match(evidence,/data-dossier-assessment-grade/);
 assert.match(e2e,/data-dossier-assessment-save/);
 assert.match(e2e,/data-dossier-assessment-scroll/);
 assert.match(e2e,/recharts-line-dots circle/);
 assert.match(e2e,/width:360/);
 assert.match(e2e,/eight dated/i);
});
