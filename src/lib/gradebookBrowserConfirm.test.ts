import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const browserScript = readFileSync('scripts/classroom-routine-browser-e2e.mjs', 'utf8');
const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');

test('gradebook still asks teachers before changing existing point denominators', () => {
  assert.match(gradebook, /savedPoints.length > 0 && !window.confirm\(/);
  assert.match(gradebook, /Maximalpunkten ändern sich die Prozentwerte/);
});

test('synthetic browser test explicitly handles ONLY the expected native gradebook confirmation', () => {
  assert.match(browserScript, /client.approveExpectedGradebookMaxPoints = false/);
  assert.match(browserScript, /event.type === 'confirm' && event.message.startsWith\('Für diese Bewertung sind bereits '\)/);
  assert.match(browserScript, /const approve = client.approveExpectedGradebookMaxPoints === true/);
  assert.match(browserScript, /Page.handleJavaScriptDialog', \{ accept: approve \}/);
  assert.match(browserScript, /client.approveExpectedGradebookMaxPoints = true/);
  assert.match(browserScript, /client.approveExpectedGradebookMaxPoints = false;\s*\}\s*\}\s*if \(client.approvedGradebookMaxPointsCount === 0\)/);
  assert.doesNotMatch(browserScript, /window.confirm\s*=/);
});

test('long browser test uses the current assessment area field label', () => {
  const modal = readFileSync('src/components/gradebook/AssessmentItemModal.tsx', 'utf8');
  assert.match(modal, /Teilbereich in \{subject\} \(optional\)/);
  assert.match(browserScript, /setInputByLabel\(client,'Teilbereich in Mathematik','Längen'\)/);
  assert.doesNotMatch(browserScript, /setInputByLabel\(client,'Unterbereich in Mathematik'/);
});

test('existing assessments are never silently converted between points and percent', () => {
  const weight = readFileSync('src/components/WeightSettings.tsx', 'utf8');
  assert.match(weight, /if \(hasSubjectAssessmentEntries\(app, fach\)\)/);
  assert.match(weight, /Die Bewertungsart bleibt unverändert/);
  assert.match(browserScript, /client.approveExpectedProtectedModeAlert = true/);
  assert.match(browserScript, /event.message.includes\('Die Bewertungsart bleibt unverändert'\)/);
  assert.match(browserScript, /client.protectedModeAlertCount !== previousRejectedModes \+ 1/);
  assert.match(browserScript, /protected assessment mode remains points and the saved zero survives/);
  assert.doesNotMatch(browserScript, /manual percent shows percentage instead of a grade/);
});
