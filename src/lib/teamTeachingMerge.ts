import type { ClassRoom } from '../types';
import { classRoomWithoutTeamMetadata } from './teamTeachingCrypto';

export interface TeamMergeResult {
  room: ClassRoom | null;
  conflicts: string[];
}

type JsonValue = any;
const plain = (value: unknown): value is Record<string, JsonValue> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

/** Three-way merge of explicitly reviewed, decrypted class revisions. Arrays are atomic:
 * two concurrent edits to the same list (pupils, notes, homework, grades) must be resolved
 * by a person, never by last-writer-wins. Disjoint weekly slots can merge recursively. */
export function mergeTeamClassRevisions(base: ClassRoom, local: ClassRoom, remote: ClassRoom): TeamMergeResult {
  if (base.id !== local.id || local.id !== remote.id) {
    return { room: null, conflicts: ['Die Klassen-IDs stimmen nicht überein.'] };
  }
  const conflicts: string[] = [];
  const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  const merge = (b: JsonValue, l: JsonValue, r: JsonValue, path: string[]): JsonValue => {
    if (equal(l, r)) return l;
    if (equal(l, b)) return r;
    if (equal(r, b)) return l;
    if (plain(b) && plain(l) && plain(r)) {
      const result: Record<string, JsonValue> = {};
      for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)])) {
        const value = merge(b[key], l[key], r[key], [...path, key]);
        if (value !== undefined) result[key] = value;
      }
      return result;
    }
    conflicts.push(path.join(' › ') || 'Klassendaten');
    return r; // Never publish this partial result if ANY conflict exists.
  };
  const combined = merge(classRoomWithoutTeamMetadata(base), classRoomWithoutTeamMetadata(local),
    classRoomWithoutTeamMetadata(remote), []);
  return { room: conflicts.length ? null : combined as ClassRoom, conflicts };
}
