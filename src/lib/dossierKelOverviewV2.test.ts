import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const overview = readFileSync('src/components/dossier/DossierUebersicht.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');
const domain = readFileSync('src/lib/assessmentDomainPerformance.ts', 'utf8');
const kel = readFileSync('src/components/KELPresentation.tsx', 'utf8');

test('Dossier 2.0: KEL-Vorbereitung verwendet den bestehenden Präsentationsmodus', () => {
  assert.match(overview, /KEL-Gespräch vorbereiten/);
  assert.match(overview, /onPrepareKel\?: \(\)=>void/);
  assert.match(dossier, /onPrepareKel=\{\(\) => setPresentationModeActive\(true\)\}/);
  assert.match(dossier, /<KELPresentation/);
  assert.match(kel, /useState<'slides' \| 'prepare'>\('prepare'\)/);
  assert.match(kel, /exportSchuelerPDF\(student.id, app\)/);
});

test('Dossier 2.0: keine erfundenen Leistungen und kompakte Fächer mit vollständig erreichbarer Aufklappansicht', () => {
  assert.match(overview, /const prioritySubjectCards=subjectCards\.filter/);
  assert.match(overview, /cardData\.assessmentCount>0/);
  assert.match(overview, /cardData\.participation\.hasData/);
  assert.match(overview, /const visibleSubjectCards=showAllSubjects\?subjectCards/);
  assert.match(overview, /setShowAllSubjects\(true\)/);
  assert.match(overview, /setShowAllSubjects\(false\)/);
  assert.match(overview, /Noch keine Bewertung oder Mitarbeit erfasst/);
  assert.match(overview, /openSubject\(cardData\.fach\)/);
});

test('Dossier 2.0: Wochenkalender zeigt Datum, Zustand und einen interaktiv auswählbaren Tag', () => {
  assert.match(overview, /\['Mo','Di','Mi','Do','Fr','Sa','So'\]/);
  assert.match(overview, /grid-cols-7/);
  assert.match(overview, /data-attendance-day data-date=\{day\.key\}/);
  assert.match(overview, /setSelectedAttendanceDay\(day\.key\)/);
  assert.match(overview, /aria-pressed=\{selectedAttendanceDay===day\.key\}/);
  assert.match(overview, /selectedDay\?\.status|selectedDay\.status/);
  assert.match(overview, /Tag auswählen, um den erfassten Status zu sehen/);
});

test('Dossier 2.0: Teilbereichs-Kreise beruhen auf echten Nachweisen ohne Klassenvergleich', () => {
  assert.match(overview, /getStudentAssessmentDomainPerformance\(app,student\.id,fach,semester\)/);
  assert.match(overview, /assessedCoreDomains\.length>0/);
  assert.match(overview, /<AssessmentDomainDonuts/);
  assert.match(domain, /getNormalizedAssessmentPercent\(raw, mode, maxPoints\)/);
  assert.match(domain, /lzkParticipation\?\.\[index\] === false/);
  assert.doesNotMatch(overview, /setApp\(/);
});
