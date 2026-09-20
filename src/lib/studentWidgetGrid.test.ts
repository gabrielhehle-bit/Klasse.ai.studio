import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getStudentGridLayout } from './studentWidgetGrid';

test('25 children fit as a readable five-or-more-column grid on a full Smartboard', () => {
  const layout = getStudentGridLayout(1280, 690, 25, { reservedHeight: 146, minCardWidth: 175, minCardHeight: 52, gap: 6 });
  assert.equal(layout.fits, true);
  assert.equal(layout.columns * layout.rows >= 25, true);
  assert.equal(layout.cardHeight >= 52, true);
  const points = getStudentGridLayout(1280, 690, 25, { reservedHeight: 92, minCardWidth: 170, minCardHeight: 58, gap: 6 });
  assert.equal(points.fits, true);
  assert.equal(points.columns * points.rows >= 25, true);
});

test('25 children cannot fit safely in a small widget: request larger view rather than clip/scroll', () => {
  const cramped = getStudentGridLayout(300, 230, 25, { reservedHeight: 146, minCardWidth: 175, minCardHeight: 52, gap: 6 });
  assert.equal(cramped.fits, false);
  assert.equal(getStudentGridLayout(NaN, -1, 25).fits, false);
  assert.equal(getStudentGridLayout(600, 450, 0).fits, true);
});

test('both public student widgets have an explicit enlargement action and a fitted non-scroll grid', () => {
  const checkIn = readFileSync('src/components/cockpit/widgets/KidAttendanceWidget.tsx', 'utf8');
  const points = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');
  assert.match(checkIn, /getStudentGridLayout\(size\.width, size\.height, students\.length/);
  assert.match(checkIn, /onUpdate\?\.\(\{ x: 2, y: 2, w: 96, h: 90 \}\)/);
  assert.match(checkIn, /studentGrid\.fits \? \(/);
  assert.match(checkIn, /Alle \{students\.length\} Kinder groß anzeigen/);
  assert.match(points, /gridMode && !grid\.fits/);
  assert.match(points, /gridTemplateColumns/);
  assert.match(points, /Alle \{students\.length\} Kinder groß anzeigen/);
  assert.match(points, /gridMode \? 'grid min-h-0 flex-1 content-start gap-1\.5 overflow-hidden'/);
});
