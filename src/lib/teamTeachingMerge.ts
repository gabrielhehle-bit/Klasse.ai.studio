import type { ClassRoom } from '../types';
import { classRoomWithoutTeamMetadata } from './teamTeachingCrypto';

export interface TeamMergeResult {
  room: ClassRoom | null;
  conflicts: string[];
}

type JsonValue = any;
const plain = (value: unknown): value is Record<string, JsonValue> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Collect additions in order without accepting edits, deletions or moves of old entries. */
function additionsByGap(base: JsonValue[], version: JsonValue[]): JsonValue[][] | null {
  const gaps: JsonValue[][] = Array.from({ length: base.length + 1 }, () => []);
  const seen = new Set<string>();
  let index = 0;
  for (const item of version) {
    if (typeof item?.id !== 'string' || !item.id || seen.has(item.id)) return null;
    seen.add(item.id);
    if (index < base.length && equal(item, base[index])) index++;
    else gaps[index].push(item);
  }
  return index === base.length ? gaps : null;
}

/** Independently added notes and homework can coexist. Other concurrent list
 * changes require review, especially when they affect ordering or prior records. */
function mergeIndependentAdditions(base: JsonValue[], local: JsonValue[], remote: JsonValue[]): JsonValue[] | null {
  const localGaps = additionsByGap(base, local);
  const remoteGaps = additionsByGap(base, remote);
  if (!localGaps || !remoteGaps) return null;
  const remoteIds = new Set(remote.map(item => item.id));
  if (localGaps.flat().some(item => remoteIds.has(item.id))) return null;
  return remoteGaps.flatMap((gap, index) => index < base.length
    ? [...gap, ...localGaps[index], base[index]] : [...gap, ...localGaps[index]]);
}

/** Three-way merge of decrypted revisions. Conflicting edits require a decision. */
export function mergeTeamClassRevisions(base: ClassRoom, local: ClassRoom, remote: ClassRoom,
  decisions: Record<string, 'local' | 'team'> = {}): TeamMergeResult {
  if (base.id !== local.id || local.id !== remote.id) {
    return { room: null, conflicts: ['Die Klassen-IDs stimmen nicht überein.'] };
  }
  const conflicts: string[] = [];
  const merge = (b: JsonValue, l: JsonValue, r: JsonValue, path: string[]): JsonValue => {
    if (equal(l, r)) return l;
    if (equal(l, b)) return r;
    if (equal(r, b)) return l;
    // A new week/day may exist independently on both devices.
    const baseObject = b === undefined ? {} : b;
    if (plain(baseObject) && plain(l) && plain(r)) {
      const entries: [string, JsonValue][] = [];
      for (const key of new Set([...Object.keys(baseObject), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(
          Object.hasOwn(baseObject, key) ? baseObject[key] : undefined,
          Object.hasOwn(l, key) ? l[key] : undefined,
          Object.hasOwn(r, key) ? r[key] : undefined,
          [...path, key],
        );
        if (value !== undefined) entries.push([key, value]);
      }
      return Object.fromEntries(entries);
    }
    const baseList = b === undefined ? [] : b;
    if (path.length === 1 && (path[0] === 'notes' || path[0] === 'hausuebungen')
      && Array.isArray(baseList) && Array.isArray(l) && Array.isArray(r)) {
      const additions = mergeIndependentAdditions(baseList, l, r);
      if (additions) return additions;
    }
    const location = path.join(' › ') || 'Klassendaten';
    if (decisions[location] === 'local') return l;
    if (decisions[location] === 'team') return r;
    conflicts.push(location);
    return r; // Never publish this partial result if ANY conflict exists.
  };
  const combined = merge(classRoomWithoutTeamMetadata(base), classRoomWithoutTeamMetadata(local),
    classRoomWithoutTeamMetadata(remote), []);
  return { room: conflicts.length ? null : combined as ClassRoom, conflicts };
}
