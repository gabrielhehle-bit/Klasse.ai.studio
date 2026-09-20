import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLUS_POINTS_GRID_OPTIONS, getPlusPointsPageLayout } from './plusPointsWidgetLayout';
import { getStudentGridLayout } from './studentWidgetGrid';

const widget = readFileSync('src/components/cockpit/PublicStudentListWidget.tsx', 'utf8');

test('25 students fit in one non-scrolling public plus-points grid on a 1280×690 board', () => {
  const full = getStudentGridLayout(1280, 690, 25, PLUS_POINTS_GRID_OPTIONS);
  assert.equal(full.fits, true);
  assert.ok(full.columns * full.rows >= 25);
  assert.ok(full.cardHeight >= 88);
  assert.match(widget, /gridMode \? 'grid min-h-0 flex-1 content-start gap-1\.5 overflow-hidden'/);
  assert.match(widget, /style=\{gridMode \? \{ minHeight: 88/);
});

test('small movable widget reaches all 25 children through pages without a scroll area', () => {
  const first = getPlusPointsPageLayout(340, 360, 25, 0);
  assert.equal(first.fitsAtLeastOne, true);
  assert.equal(first.columns, 1);
  assert.ok(first.pageCount > 1);
  const last = getPlusPointsPageLayout(340, 360, 25, 999);
  assert.equal(last.page, last.pageCount - 1);
  assert.ok(last.start < 25);
  assert.ok(last.start + last.pageSize >= 25);
  assert.equal(getPlusPointsPageLayout(190, 170, 25, 0).fitsAtLeastOne, false);
  assert.match(widget, /students\.slice\(pageLayout\.start, pageLayout\.start \+ pageLayout\.pageSize\)/);
  assert.match(widget, /aria-label="Pluspunkte-Schülerseiten"/);
  assert.match(widget, /aria-label="Vorherige Pluspunkte-Seite"/);
  assert.match(widget, /aria-label="Nächste Pluspunkte-Seite"/);
  assert.match(widget, /!pageLayout\.fitsAtLeastOne/);
});

test('plus points, undo, class isolation, public-only data and sidebar remain available', () => {
  assert.match(widget, /getTodayPoints\(student\.id\)/);
  assert.match(widget, /addParticipation\(student\.id, event\)/);
  assert.match(widget, /removeParticipation\(lastAwardedId\)/);
  assert.match(widget, /setLastAwardedId\(null\)/);
  assert.match(widget, /\[app\.activeClassId\]/);
  assert.match(widget, /getDisplayStudentName\(student, students\)/);
  assert.match(widget, /!gridMode && \(/);
  assert.match(widget, /overflow-y-auto/); // sidebar: not a movable CockpitWidget
  assert.doesNotMatch(widget, /\.diagnose|\.beobachtung|\.fehlzeit|\.stimmung/);
});
