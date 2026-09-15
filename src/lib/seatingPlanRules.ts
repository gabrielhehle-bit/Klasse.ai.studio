import type { SitzplanRegel, Student } from '../types';

export type SeatPosition = { x: number; y: number };
export type SeatZone = 'vorne' | 'mitte' | 'hinten';

type SeatingObject = {
  type?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type SeatingRuleViolation = {
  ruleId: string;
  studentIds: string[];
  message: string;
};

export function areSeatingNeighbors(a?: SeatPosition, b?: SeatPosition): boolean {
  if (!a || !b) return false;
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return (dx < 160 && dy < 60) || (dx < 60 && dy < 160);
}

export function sameSeat(a?: SeatPosition, b?: SeatPosition, tolerance = 1): boolean {
  if (!a || !b) return false;
  return Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;
}

function getBoardReference(objects: SeatingObject[], positions: SeatPosition[]): SeatPosition {
  const board = objects.find(object => object?.type === 'blackboard');
  if (board) {
    return {
      x: Number(board.x || 0) + Number(board.w || 0) / 2,
      y: Number(board.y || 0) + Number(board.h || 0) / 2,
    };
  }

  if (positions.length > 0) {
    const avgX = positions.reduce((sum, position) => sum + position.x, 0) / positions.length;
    const minY = Math.min(...positions.map(position => position.y));
    return { x: avgX, y: minY - 120 };
  }

  return { x: 500, y: 0 };
}

export function classifySeatPositions(
  positions: SeatPosition[],
  objects: SeatingObject[] = []
): Array<{ position: SeatPosition; zone: SeatZone }> {
  if (positions.length === 0) return [];

  const board = getBoardReference(objects, positions);
  const ranked = positions
    .map((position, originalIndex) => ({
      position,
      originalIndex,
      distance: Math.hypot(position.x - board.x, position.y - board.y),
    }))
    .sort((a, b) => a.distance - b.distance || a.originalIndex - b.originalIndex);

  const third = Math.ceil(ranked.length / 3);

  return ranked.map((item, index) => ({
    position: item.position,
    zone: index < third ? 'vorne' : index >= ranked.length - third ? 'hinten' : 'mitte',
  }));
}

export function getSeatZone(
  position: SeatPosition | undefined,
  allPositions: SeatPosition[],
  objects: SeatingObject[] = []
): SeatZone | null {
  if (!position) return null;
  const match = classifySeatPositions(allPositions, objects).find(entry => sameSeat(entry.position, position));
  return match?.zone || null;
}

export function sanitizeSeatingRules(
  rules: SitzplanRegel[] | undefined,
  students: Array<Pick<Student, 'id'>>,
  seatPlan: Record<string, SeatPosition> = {}
): SitzplanRegel[] {
  const validStudentIds = new Set(students.map(student => student.id));
  const result: SitzplanRegel[] = [];

  for (const rawRule of rules || []) {
    if (!rawRule || !rawRule.id || !Array.isArray(rawRule.schuelerIds)) continue;
    const uniqueIds = Array.from(new Set(rawRule.schuelerIds.filter(id => validStudentIds.has(id))));
    const needsPair = rawRule.typ === 'nicht_nebeneinander' || rawRule.typ === 'nebeneinander';

    if ((needsPair && uniqueIds.length !== 2) || (!needsPair && uniqueIds.length !== 1)) continue;

    const rule: SitzplanRegel = {
      ...rawRule,
      schuelerIds: uniqueIds,
    };

    if (rule.typ === 'feste_zone' && !rule.zone) {
      rule.zone = 'vorne';
    }

    if (rule.typ === 'fester_platz' && !rule.position) {
      const currentPosition = seatPlan[uniqueIds[0]];
      if (currentPosition) rule.position = { ...currentPosition };
    }

    result.push(rule);
  }

  return result;
}

export function findSeatingRuleViolations(
  assignments: Record<string, SeatPosition>,
  rules: SitzplanRegel[] | undefined,
  students: Array<Pick<Student, 'id' | 'vorname' | 'nachname'>>,
  objects: SeatingObject[] = [],
  fixedReferencePlan: Record<string, SeatPosition> = {}
): SeatingRuleViolation[] {
  const violations: SeatingRuleViolation[] = [];
  const allPositions = Object.values(assignments).filter(Boolean);
  const studentMap = new Map(students.map(student => [student.id, student]));
  const nameOf = (id: string) => {
    const student = studentMap.get(id);
    return student ? `${student.vorname || ''} ${student.nachname || ''}`.trim() || id : id;
  };

  const assignedEntries = Object.entries(assignments).filter(([, position]) => Boolean(position));
  for (let i = 0; i < assignedEntries.length; i++) {
    for (let j = i + 1; j < assignedEntries.length; j++) {
      const [firstId, firstPosition] = assignedEntries[i];
      const [secondId, secondPosition] = assignedEntries[j];
      if (sameSeat(firstPosition, secondPosition)) {
        violations.push({
          ruleId: `collision:${firstId}:${secondId}`,
          studentIds: [firstId, secondId],
          message: `${nameOf(firstId)} & ${nameOf(secondId)} belegen denselben Platz`,
        });
      }
    }
  }

  for (const rule of rules || []) {
    const ids = rule.schuelerIds || [];

    if (rule.typ === 'nicht_nebeneinander' || rule.typ === 'nebeneinander') {
      const [firstId, secondId] = ids;
      const first = assignments[firstId];
      const second = assignments[secondId];

      if (!first || !second) {
        violations.push({
          ruleId: rule.id,
          studentIds: ids,
          message: `${nameOf(firstId)} & ${nameOf(secondId)} sind nicht vollständig platziert`,
        });
        continue;
      }

      const neighbors = areSeatingNeighbors(first, second);
      if (rule.typ === 'nicht_nebeneinander' && neighbors) {
        violations.push({
          ruleId: rule.id,
          studentIds: ids,
          message: `${nameOf(firstId)} & ${nameOf(secondId)} sitzen zu nah`,
        });
      } else if (rule.typ === 'nebeneinander' && !neighbors) {
        violations.push({
          ruleId: rule.id,
          studentIds: ids,
          message: `${nameOf(firstId)} & ${nameOf(secondId)} sitzen nicht nebeneinander`,
        });
      }
      continue;
    }

    const studentId = ids[0];
    const position = assignments[studentId];

    if (!position) {
      violations.push({
        ruleId: rule.id,
        studentIds: ids,
        message: `${nameOf(studentId)} ist nicht platziert`,
      });
      continue;
    }

    if (rule.typ === 'feste_zone') {
      const actualZone = getSeatZone(position, allPositions, objects);
      const expectedZone = rule.zone || 'vorne';
      if (actualZone !== expectedZone) {
        violations.push({
          ruleId: rule.id,
          studentIds: ids,
          message: `${nameOf(studentId)} sitzt ${actualZone || 'außerhalb'}, soll aber ${expectedZone} sitzen`,
        });
      }
      continue;
    }

    if (rule.typ === 'fester_platz') {
      const expected = rule.position || fixedReferencePlan[studentId];
      if (expected && !sameSeat(position, expected)) {
        violations.push({
          ruleId: rule.id,
          studentIds: ids,
          message: `${nameOf(studentId)} sitzt nicht am festgelegten Platz`,
        });
      }
    }
  }

  return violations;
}
