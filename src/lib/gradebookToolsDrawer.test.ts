import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const gradebook = readFileSync('src/components/Gradebook.tsx', 'utf8');

test('tool menu uses a viewport-level drawer instead of a clipped scroll dropdown', () => {
  assert.match(gradebook, /import \{ createPortal \} from 'react-dom'/);
  assert.match(gradebook, /typeof document !== 'undefined' && createPortal\(/);
  assert.match(gradebook, /id="gradebook-tools-menu"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/);
  assert.match(gradebook, /fixed inset-0 z-\[9998\] bg-slate-950\/35/);
  assert.match(gradebook, /fixed inset-y-0 right-0 z-\[9999\]/);
  assert.doesNotMatch(gradebook, /max-h-\[65vh\]/);
  assert.match(gradebook, /Werkzeugmenü schließen/);
});

test('tools drawer traps focus, closes on Escape and restores page scrolling', () => {
  assert.match(gradebook, /moreMenuCloseRef\.current\?\.focus\(\)/);
  assert.match(gradebook, /if \(event\.key === 'Escape'\)/);
  assert.match(gradebook, /moreMenuTriggerRef\.current\?\.focus\(\)/);
  assert.match(gradebook, /event\.key === 'Tab'/);
  assert.match(gradebook, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(gradebook, /aria-haspopup="dialog"/);
});

test('manual participation is recognized as a recorded assessment and existing grades remain untouched', () => {
  assert.match(gradebook, /const hasParticipation = data\.miDirekt !== undefined && data\.miDirekt !== null && String\(data\.miDirekt\)\.trim\(\) !== ''/);
  assert.match(gradebook, /return hasParticipation \|\| \["sa", "lzk", "wp", "aufgaben"\]/);
  assert.match(gradebook, /Kinder mit offenen Bewertungen/);
  assert.match(gradebook, /berechne\(app, s\.id, activeFach, sem\)/);
  const menu = gradebook.split('id="gradebook-tools-menu"')[1].split('</motion.aside>')[0];
  assert.doesNotMatch(menu, /noten:\s*\{/);
});
