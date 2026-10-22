import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDienstOverviewColumns } from './diensteWidgetModel';
import { getGroupPageLayout } from './groupsWidgetPages';
import { generateStudentGroups } from './groupsAlgorithm';

const duties = readFileSync('src/components/cockpit/widgets/DiensteWidget.tsx', 'utf8');
const groups = readFileSync('src/components/cockpit/widgets/GroupsWidget.tsx', 'utf8');

test('Dienste: nine tasks fit Smartboards but cannot crush genuinely narrow columns', () => {
  for (const [width, count, expected] of [
    [0, 9, 1], [320, 9, 1], [390, 9, 1], [549, 9, 1],
    [550, 9, 2], [639, 9, 2], [640, 8, 2], [640, 9, 3],
    [820, 8, 2], [820, 9, 3], [899, 9, 3],
    [900, 8, 3], [1280, 4, 3],
  ] as const) {
    assert.equal(getDienstOverviewColumns(width, count), expected,
      'widget width ' + width + ' with ' + count + ' duties');
  }
  assert.equal(getDienstOverviewColumns(Number.NaN, 9), 1);
  assert.equal(getDienstOverviewColumns(Infinity, 9), 1);
  assert.match(duties, /columnCount: getDienstOverviewColumns\(size\.width, dienste\.length\)/);
  assert.doesNotMatch(duties, /size\.width >= 900 \|\| dienste\.length > 8 \? 3 : 2/);
  assert.match(duties, /dienste\.map\(dienst =>/);
  assert.match(duties, /data-dienst-overview=\{dienst\.id\}/);
});

test('Gruppen: each child swap button announces its selection and intended action', () => {
  assert.match(groups, /data-group-student=\{studentId\}/);
  assert.match(groups, /aria-pressed=\{isSelected\}/);
  assert.match(groups, /aria-label=\{\`\$\{displayName\}: \$\{isSelected \? 'Zum Tauschen ausgewählt' : selectedStudentForAction \? 'Mit ausgewähltem Kind tauschen' : 'Zum Gruppentausch auswählen'\}\`\}/);
  assert.match(groups, /onClick=\{\(\) => handleStudentClick\(studentId\)\}/);
  assert.match(groups, /title=\{group\.name\}/);
  assert.match(groups, /data-group-id=\{group\.id\}/);

  const generated = generateStudentGroups(
    Array.from({ length: 25 }, (_, index) => 'pupil-' + index),
    { mode: 'size', value: 4 },
  ).groups;
  const layout = getGroupPageLayout(1280, 690, generated, 0);
  assert.equal(layout.pageCount, 1);
  assert.deepEqual(layout.cards.flatMap(group => group.memberIds).sort(),
    generated.flatMap(group => group.studentIds).sort());
});
