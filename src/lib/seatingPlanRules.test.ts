import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areSeatingNeighbors,
  classifySeatPositions,
  findSeatingRuleViolations,
  sanitizeSeatingRules,
} from './seatingPlanRules';

test('neighbor detection matches the seating-plan rectangular adjacency model', () => {
  assert.equal(areSeatingNeighbors({ x: 0, y: 0 }, { x: 120, y: 20 }), true);
  assert.equal(areSeatingNeighbors({ x: 0, y: 0 }, { x: 20, y: 120 }), true);
  assert.equal(areSeatingNeighbors({ x: 0, y: 0 }, { x: 170, y: 20 }), false);
  assert.equal(areSeatingNeighbors({ x: 0, y: 0 }, { x: 120, y: 80 }), false);
});

test('front/middle/back zones follow the actual blackboard position', () => {
  const positions = [
    { x: 100, y: 100 },
    { x: 100, y: 300 },
    { x: 100, y: 500 },
  ];

  assert.deepEqual(
    classifySeatPositions(positions, [{ type: 'blackboard', x: 80, y: 0, w: 40, h: 10 }]).map(entry => entry.zone),
    ['vorne', 'mitte', 'hinten']
  );

  const fromBottom = classifySeatPositions(
    positions,
    [{ type: 'blackboard', x: 80, y: 600, w: 40, h: 10 }]
  );
  const zonesByY = Object.fromEntries(fromBottom.map(entry => [entry.position.y, entry.zone]));
  assert.equal(zonesByY[500], 'vorne');
  assert.equal(zonesByY[300], 'mitte');
  assert.equal(zonesByY[100], 'hinten');
});

test('sanitization removes foreign students and captures a fixed-seat coordinate', () => {
  const rules: any[] = [
    { id: 'pair', typ: 'nebeneinander', schuelerIds: ['a', 'b'] },
    { id: 'foreign', typ: 'nicht_nebeneinander', schuelerIds: ['a', 'x'] },
    { id: 'fixed', typ: 'fester_platz', schuelerIds: ['a'] },
  ];
  const clean: any[] = sanitizeSeatingRules(rules, [{ id: 'a' }, { id: 'b' }] as any, { a: { x: 20, y: 30 } });

  assert.deepEqual(clean.map(rule => rule.id), ['pair', 'fixed']);
  assert.deepEqual(clean[1].position, { x: 20, y: 30 });
});

test('rule checking covers separate, together, zone and fixed-seat rules', () => {
  const students: any[] = [
    { id: 'a', vorname: 'Anna', nachname: 'A' },
    { id: 'b', vorname: 'Ben', nachname: 'B' },
    { id: 'c', vorname: 'Cem', nachname: 'C' },
  ];
  const assignments = {
    a: { x: 100, y: 100 },
    b: { x: 220, y: 110 },
    c: { x: 100, y: 500 },
  };
  const objects = [{ type: 'blackboard', x: 80, y: 0, w: 200, h: 10 }];
  const rules: any[] = [
    { id: 'separate', typ: 'nicht_nebeneinander', schuelerIds: ['a', 'b'] },
    { id: 'together', typ: 'nebeneinander', schuelerIds: ['a', 'c'] },
    { id: 'zone', typ: 'feste_zone', schuelerIds: ['c'], zone: 'vorne' },
    { id: 'fixed', typ: 'fester_platz', schuelerIds: ['a'], position: { x: 400, y: 400 } },
  ];

  const violations = findSeatingRuleViolations(assignments, rules, students, objects);
  assert.deepEqual(violations.map(entry => entry.ruleId), ['separate', 'together', 'zone', 'fixed']);
});

test('legacy fixed-seat rule can use the pre-shuffle reference plan', () => {
  const students: any[] = [{ id: 'a', vorname: 'Anna', nachname: 'A' }];
  const rules: any[] = [{ id: 'fixed', typ: 'fester_platz', schuelerIds: ['a'] }];

  assert.equal(
    findSeatingRuleViolations(
      { a: { x: 20, y: 20 } },
      rules,
      students,
      [],
      { a: { x: 20, y: 20 } }
    ).length,
    0
  );
  assert.equal(
    findSeatingRuleViolations(
      { a: { x: 40, y: 20 } },
      rules,
      students,
      [],
      { a: { x: 20, y: 20 } }
    ).length,
    1
  );
});


test('rule checking reports two students occupying the exact same seat', () => {
  const students: any[] = [
    { id: 'a', vorname: 'Anna', nachname: 'A' },
    { id: 'b', vorname: 'Ben', nachname: 'B' },
  ];

  const violations = findSeatingRuleViolations(
    { a: { x: 100, y: 100 }, b: { x: 100, y: 100 } },
    [],
    students
  );

  assert.equal(violations.length, 1);
  assert.match(violations[0].message, /denselben Platz/);
});
