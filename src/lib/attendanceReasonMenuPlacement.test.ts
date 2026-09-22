import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAttendanceReasonMenuPlacement } from './attendanceReasonMenuPlacement';

const anchor = (top: number, bottom: number, right = 1140) => ({ top, bottom, right });

test('absence reason menu stays below an early row when enough space remains', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(100, 132), 1280, 800);
  assert.equal(position.top, 136);
  assert.equal(position.maxHeight, 320);
  assert.ok(position.left >= 8);
  assert.ok(position.left + 240 <= 1280 - 8);
});

test('absence reason menu flips above the last pupil instead of being clipped', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(684, 718), 1280, 768);
  assert.ok(position.top >= 8);
  assert.equal(position.maxHeight, 320);
  assert.ok(position.top + position.maxHeight <= 684);
  assert.equal(position.left, 900);
});

test('absence reason menu is scrollable and viewport-bound on a small screen', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(225, 255, 300), 320, 400);
  assert.ok(position.left >= 8);
  assert.ok(position.left + 240 <= 312);
  assert.ok(position.top >= 8);
  assert.ok(position.maxHeight > 0);
  assert.ok(position.top + position.maxHeight <= 392);
});

test('absence reason options escape overflow-hidden list without changing absence handlers', () => {
  const component = readFileSync('src/components/Attendance.tsx', 'utf8');
  assert.match(component, /print:hidden overflow-hidden/);
  assert.match(component, /createPortal\(\s*<motion\.div[\s\S]*?id="attendance-reason-options"/);
  assert.match(component, /className="fixed z-\[1000\] w-60/);
  assert.match(component, /overflow-y-auto overscroll-contain/);
  assert.match(component, /getAttendanceReasonMenuPlacement\(/);
  assert.match(component, /window\.addEventListener\("scroll", reposition, true\)/);
  assert.match(component, /window\.addEventListener\("resize", reposition\)/);
  assert.match(component, /reasonMenuRef\.current\?\.contains\(target\)/);
  assert.match(component, /event\.key === "Escape"/);
  for (const reason of ['Krank', 'Arztbesuch', 'Familiäre Gründe', 'Unentschuldigt']) {
    assert.match(component, new RegExp('handleSelectQuickReason\\(s\\.id, "' + reason + '"'));
  }
  assert.match(component, /setActiveNoteSid\(s\.id\)/);
});
