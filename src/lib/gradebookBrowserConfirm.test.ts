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
  assert.match(browserScript, /client.approveExpectedGradebookMaxPoints = false;\s*\}\s*if \(client.approvedGradebookMaxPointsCount === 0\)/);
  assert.doesNotMatch(browserScript, /window.confirm\s*=/);
});
