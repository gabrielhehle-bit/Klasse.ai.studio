import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getAttendanceReasonMenuPlacement } from './attendanceReasonMenuPlacement';

const anchor = (top: number, bottom: number, right = 1140) => ({ top, bottom, right });

test('absence reason menu stays below an early row when enough space remains', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(100, 132), 1280, 800);
  assert.equal(position.top, 136);
  assert.equal(position.bottom, undefined);
  assert.equal(position.direction, 'below');
  assert.equal(position.maxHeight, 320);
  assert.ok(position.left >= 8);
  assert.ok(position.left + 240 <= 1280 - 8);
});

test('absence reason menu flips above the last pupil instead of being clipped', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(684, 718), 1280, 768);
  assert.equal(position.direction, 'above');
  assert.equal(position.top, undefined);
  assert.equal(position.bottom, 768 - 684 + 4);
  assert.equal(position.maxHeight, 320);
  assert.equal(position.left, 900);
  // A naturally shorter 270px menu must hug the button instead of floating
  // 50px too high because a 320px maximum was mistaken for its actual height.
  const actualMenuHeight = 270;
  const menuBottom = 768 - position.bottom!;
  const menuTop = menuBottom - actualMenuHeight;
  assert.equal(menuBottom, 680);
  assert.equal(menuTop, 410);
});

test('absence reason menu is scrollable and viewport-bound on a small screen', () => {
  const position = getAttendanceReasonMenuPlacement(anchor(225, 255, 300), 320, 400);
  assert.ok(position.left >= 8);
  assert.ok(position.left + 240 <= 312);
  assert.ok(position.maxHeight > 0);
  if (position.direction === 'above') {
    assert.ok(position.bottom! >= 8);
    assert.ok(position.bottom! + position.maxHeight <= 400 - 8);
  } else {
    assert.ok(position.top! >= 8);
    assert.ok(position.top! + position.maxHeight <= 400 - 8);
  }
});

test('absence reason options escape overflow-hidden list without changing absence handlers', () => {
  const component = readFileSync('src/components/Attendance.tsx', 'utf8');
  assert.match(component, /print:hidden overflow-hidden/);
  assert.match(component, /createPortal\(\s*<motion\.div[\s\S]*?id="attendance-reason-options"/);
  assert.match(component, /className="fixed z-\[1000\] w-60/);
  assert.match(component, /overflow-y-auto overscroll-contain/);
  assert.match(component, /getAttendanceReasonMenuPlacement\(/);
  assert.match(component, /bottom: reasonMenuPlacement\?\.bottom/);
  assert.match(component, /top: reasonMenuPlacement\?\.top/);
  assert.match(component, /window\.addEventListener\("scroll", reposition, true\)/);
  assert.match(component, /window\.addEventListener\("resize", reposition\)/);
  assert.match(component, /reasonMenuRef\.current\?\.contains\(target\)/);
  assert.match(component, /event\.key === "Escape"/);
  for (const reason of ['Krank', 'Arztbesuch', 'Familiäre Gründe', 'Unentschuldigt']) {
    assert.match(component, new RegExp('handleSelectQuickReason\\(s\\.id, "' + reason + '"'));
  }
  assert.match(component, /setActiveNoteSid\(s\.id\)/);
});
