import type { ClassRoom } from '../types';
import { classRoomWithoutTeamMetadata } from './teamTeachingCrypto';

export interface TeamClassChange {
  path: string;
  before: string;
  after: string;
}

const SECTION_NAMES: Record<string, string> = {
  wochenplanung: 'Wochenplanung', hausuebungen: 'Hausübungen', klassenbuchErgaenzungen: 'Klassenbuch',
  schueler: 'Schülerliste', stammplan: 'Stundenplan', notes: 'Notizen', journal: 'Notizen',
  anwesenheit: 'Anwesenheit', noten: 'Notenmappe', lernzielTracker: 'Lernziele',
  sitzplan_schueler: 'Sitzplan', sitzplan_objekte: 'Sitzplan', tageplan: 'Tagesplanung',
  name: 'Klassenname', faecher: 'Fächer',
};

function displayPath(parts: string[]): string {
  return parts.map((part, index) => {
    if (index === 0) return SECTION_NAMES[part] || part;
    if (parts[0] === 'wochenplanung' && index === 1) return 'KW ' + part;
    if (parts[0] === 'wochenplanung' && index === 3 && /^[0-9]+$/.test(part)) return 'Stunde ' + (Number(part) + 1);
    return part;
  }).join(' › ');
}

function displayValue(value: unknown): string {
  if (value === undefined) return 'Nicht vorhanden';
  if (value === null) return 'Leer';
  if (Array.isArray(value)) return value.length + ' Einträge';
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return keys.length + ' Felder';
  }
  const text = String(value);
  return text.length > 170 ? text.slice(0, 167) + '…' : text;
}

/** Compute on an authorized device only; never send pupil names or change values to the server. */
export function describeTeamClassChanges(before: ClassRoom, after: ClassRoom, limit = 100): TeamClassChange[] {
  const changes: TeamClassChange[] = [];
  const left = classRoomWithoutTeamMetadata(before) as unknown as Record<string, unknown>;
  const right = classRoomWithoutTeamMetadata(after) as unknown as Record<string, unknown>;
  const visit = (a: unknown, b: unknown, parts: string[], depth: number): void => {
    if (changes.length >= limit || Object.is(a, b)) return;
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (same) return;
    // Lists with stable IDs (students, homework, observations, notes) can be previewed
    // item by item even though safe automatic merges still treat a modified list atomically.
    if (depth < 7 && Array.isArray(a) && Array.isArray(b)
      && a.length <= 500 && b.length <= 500
      && [...a, ...b].every(item => item && typeof item === 'object'
        && (typeof item.id === 'string' || typeof item.id === 'number'))
      && new Set(a.map(item => String(item.id))).size === a.length
      && new Set(b.map(item => String(item.id))).size === b.length) {
      const prior = new Map(a.map(item => [String(item.id), item]));
      const next = new Map(b.map(item => [String(item.id), item]));
      for (const key of new Set([...prior.keys(), ...next.keys()])) {
        if (changes.length >= limit) break;
        visit(prior.get(key), next.get(key), [...parts, key], depth + 1);
      }
      return;
    }
    if (depth < 7 && a && b && typeof a === 'object' && typeof b === 'object'
      && !Array.isArray(a) && !Array.isArray(b)) {
      const old = a as Record<string, unknown>;
      const next = b as Record<string, unknown>;
      for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
        if (changes.length >= limit) break;
        visit(old[key], next[key], [...parts, key], depth + 1);
      }
      return;
    }
    changes.push({ path: displayPath(parts), before: displayValue(a), after: displayValue(b) });
  };
  visit(left, right, [], 0);
  return changes;
}
