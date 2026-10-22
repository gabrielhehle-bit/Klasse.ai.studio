import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPositiveBehaviorRate } from './gradebookBehaviorRate';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');
const dossier = readFileSync('src/components/StudentDossier.tsx', 'utf8');

test('Notenmappe: without a behavior report no invented 100% success quote', () => {
  assert.equal(getPositiveBehaviorRate(0, 0), null);
  assert.equal(getPositiveBehaviorRate(0, 3), 0);
  assert.equal(getPositiveBehaviorRate(3, 3), 100);
  assert.equal(getPositiveBehaviorRate(2, 3), 67);
  assert.equal(getPositiveBehaviorRate(2, 4), 50);
  assert.equal(getPositiveBehaviorRate(0, Number.NaN), null);
  assert.equal(getPositiveBehaviorRate(0, Number.POSITIVE_INFINITY), null);
  assert.match(gradebook, /getPositiveBehaviorRate\(positiveLogsCount, totalCount\)/);
  assert.match(gradebook, /positivePct === null \? '—' : \`\$\{positivePct\}%\`/);
  assert.match(gradebook, /positivePct !== null && <div/);
  assert.match(gradebook, /if \(badges.length === 0 && totalCount > 0\)/);
  assert.match(gradebook, /Keine Auszeichnung/);
  assert.doesNotMatch(gradebook, /totalCount > 0 \? Math\.round\(\(positiveLogsCount \/ totalCount\) \* 100\) : 100/);
});

test('Schülerdossier: accessible phone student navigation and menu', () => {
  assert.match(dossier, /data-student-dossier-nav/);
  assert.match(dossier, /aria-label="Kind im Schülerdossier auswählen"/);
  assert.match(dossier, /aria-label="Dossieraktionen öffnen"/);
  assert.match(dossier, /<summary aria-label="Dossieraktionen öffnen" title="Dossieraktionen öffnen"/);
  assert.match(dossier, /flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border transition/);
  assert.match(dossier, /min-h-11 w-full appearance-none rounded-xl border/);
  assert.match(dossier, /role="tab" aria-selected=\{isTabActive\} onClick=\{\(\) => setActiveTab\(item\.id as DossierTab\)\}/);
  assert.match(dossier, /exportSchuelerPDF\(student\.id, app\)/);
  assert.match(dossier, /activePrintTemplate: 'schuelerprofil'/);
});

test('Notenmappe keeps student note and trend actions visible to touch and keyboard', () => {
  const actionsStart = gradebook.indexOf('onClick={() => setSelectedTrendStudentId(s.id)}');
  const actionsEnd = gradebook.indexOf('<td className=', actionsStart);
  assert.ok(actionsStart > 0 && actionsEnd > actionsStart);
  const studentActions = gradebook.slice(actionsStart, actionsEnd);
  assert.match(studentActions, /aria-label=\{`Notenverlauf für \$\{s\.vorname\} \$\{s\.nachname\} anzeigen`\}/);
  assert.match(studentActions, /aria-label=\{`\$\{nd\.freitext \? 'Notiz bearbeiten' : 'Notiz hinzufügen'\} für \$\{s\.vorname\} \$\{s\.nachname\}`\}/);
  assert.equal((studentActions.match(/min-h-11 min-w-11/g) || []).length, 2);
  assert.equal((studentActions.match(/focus-visible:outline-offset-2/g) || []).length, 2);
  assert.doesNotMatch(studentActions, /opacity-0|group-hover:opacity-100/);
  assert.match(studentActions, /prompt\('Notiz für ' \+ s\.vorname, nd\.freitext \|\| ''\)/);
});
