import test from 'node:test';
import assert from 'node:assert/strict';
import { getFerien } from './ferienOesterreich';

function range(id: string, bundesland: Parameters<typeof getFerien>[0] = 'VBG') {
  const item = getFerien(bundesland, '2026/27').find((entry) => entry.id === id);
  assert.ok(item, `Ferieneintrag ${id} fehlt`);
  return item!;
}

test('Vorarlberg 2026/27 matches official autumn, semester, Pentecost and summer dates', () => {
  const autumn = range('herbst_2026');
  assert.deepEqual(
    [autumn.startMonth, autumn.startDay, autumn.endMonth, autumn.endDay],
    [9, 27, 9, 31],
  );

  const semester = range('semester_2027');
  assert.deepEqual(
    [semester.startMonth, semester.startDay, semester.endMonth, semester.endDay],
    [1, 15, 1, 20],
  );

  const pentecost = range('pfingsten_2027');
  assert.deepEqual(
    [pentecost.startMonth, pentecost.startDay, pentecost.endMonth, pentecost.endDay],
    [4, 15, 4, 17],
  );

  const summer = range('sommer_2027');
  assert.deepEqual(
    [summer.startMonth, summer.startDay],
    [6, 10],
  );
});

test('2026/27 semester holiday groups follow the official Austrian calendar', () => {
  const vienna = range('semester_2027', 'W');
  const burgenland = range('semester_2027', 'BGL');
  const salzburg = range('semester_2027', 'SBG');

  assert.equal(vienna.startDay, 1);
  assert.equal(burgenland.startDay, 8);
  assert.equal(salzburg.startDay, 15);
});
