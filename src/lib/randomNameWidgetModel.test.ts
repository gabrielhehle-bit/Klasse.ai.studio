import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleRandomStudents, pickRandomStudent, randomSelectionPage } from './randomNameWidgetModel';

const pupils = (count: number) => Array.from({ length: count }, (_, i) => ({
  id: 'synthetic-' + i,
  vorname: i % 2 === 0 ? 'Alexandria-Maria' : 'Robin',
  nachname: 'Very-long-synthetic-family-name-' + i,
}));

test('random picker never adds fake children in empty classrooms and does not re-include excluded pupils', () => {
  assert.deepEqual(eligibleRandomStudents([], []), []);
  assert.equal(pickRandomStudent([], null), null);
  const present = pupils(17);
  assert.deepEqual(eligibleRandomStudents(present, present.map(student => student.id)), []);
  assert.equal(pickRandomStudent(eligibleRandomStudents(present, present.map(s => s.id)), null), null);
  assert.deepEqual(eligibleRandomStudents(present, [present[0].id]).map(s => s.id), present.slice(1).map(s => s.id));
});

test('17/25/30 synthetic children remain reachable via explicit pages, without truncating entries', () => {
  for (const count of [17, 25, 30]) {
    const students = pupils(count);
    for (const pageSize of [2, 4, 6, 8]) {
      const pages = Array.from({ length: Math.ceil(count / pageSize) }, (_, page) =>
        randomSelectionPage(students, page, pageSize));
      assert.deepEqual(pages.flatMap(page => page.items), students);
      assert.ok(pages.every(page => page.items.length <= pageSize));
      assert.equal(randomSelectionPage(students, 999, pageSize).page, pages.length - 1);
    }
  }
});

test('one pupil remains selectable, immediate repeats avoided whenever a second pupil is available', () => {
  const [first, second, third] = pupils(3);
  assert.equal(pickRandomStudent([first], first.id, () => 0)?.id, first.id);
  assert.equal(pickRandomStudent([first, second, third], first.id, () => 0)?.id, second.id);
  assert.equal(pickRandomStudent([first, second, third], first.id, () => 0.99)?.id, third.id);
  assert.equal(pickRandomStudent([first, second, third], first.id, () => Number.NaN)?.id, second.id);
});

test('empty page list yields one accessible empty page; all 30 long names remain intact', () => {
  assert.deepEqual(randomSelectionPage([], -1, 0), { items: [], page: 0, pageCount: 1 });
  const long = pupils(30);
  assert.ok(randomSelectionPage(long, 3, 8).items.every(student => student.nachname.includes('Very-long-synthetic-family-name-')));
});
