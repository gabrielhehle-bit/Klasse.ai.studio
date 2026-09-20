import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const teaching = readFileSync('src/components/Unterrichtsmodus.tsx', 'utf8');
const birthday = readFileSync('src/components/cockpit/BirthdayCelebration.tsx', 'utf8');

test('Geburtstagsmodus ist eine bewusst gestartete Feieransicht und kein 21. Widget', () => {
  assert.match(teaching, /const \[isBirthdayCelebrationOpen, setIsBirthdayCelebrationOpen\] = useState\(false\)/);
  // The deliberate birthday action is tucked under Optionen, not top-level.
  assert.match(teaching, /onClick=\{\(\) => \{ setIsBirthdayCelebrationOpen\(true\); setIsMoreOptionsMenuOpen\(false\); \}\}/);
  const toolbar = teaching.slice(teaching.indexOf('🎨 Design & Farben'), teaching.indexOf('Weitere Funktionen', teaching.indexOf('🎨 Design & Farben')));
  assert.doesNotMatch(toolbar, /🎂 Geburtstag/);
  assert.match(teaching, /🎂 Geburtstag feiern/);
  assert.match(teaching, /isBirthdayCelebrationOpen && \(/);
  assert.match(birthday, /onClose\(\)/);
  assert.match(birthday, /setSelectedId\(student\.id\)/);
  assert.match(birthday, /isBirthdayToday: \(student: Student\) => boolean/);
  assert.doesNotMatch(birthday, /student\.geburtstag|student\.geburtsjahr|student\.alter/);
  assert.doesNotMatch(birthday, /DEFAULT_MOCK_STUDENTS/);
});
