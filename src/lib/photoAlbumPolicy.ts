import type { FotoFreigabeStatus, Student } from '../types';

export type PhotoAlbumBlockReason = 'homepage_only' | 'not_allowed' | 'missing';

export interface PhotoAlbumBlockedStudent {
  id: string;
  name: string;
  status?: FotoFreigabeStatus;
  reason: PhotoAlbumBlockReason;
}

export interface PhotoAlbumSharingPolicy {
  canShare: boolean;
  allowedCount: number;
  blocked: PhotoAlbumBlockedStudent[];
  needsSelection: boolean;
}

function displayName(student: Student): string {
  return [student.vorname, student.nachname].filter(Boolean).join(' ').trim() || student.name || 'Kind';
}

export function evaluatePhotoAlbumSharing(
  students: Student[],
  noIdentifiableStudents = false,
): PhotoAlbumSharingPolicy {
  if (noIdentifiableStudents) {
    return {
      canShare: true,
      allowedCount: 0,
      blocked: [],
      needsSelection: false,
    };
  }

  if (students.length === 0) {
    return {
      canShare: false,
      allowedCount: 0,
      blocked: [],
      needsSelection: true,
    };
  }

  const blocked: PhotoAlbumBlockedStudent[] = [];
  let allowedCount = 0;

  for (const student of students) {
    if (student.fotoFreigabe === 'erlaubt') {
      allowedCount += 1;
      continue;
    }

    const reason: PhotoAlbumBlockReason =
      student.fotoFreigabe === 'nur_homepage'
        ? 'homepage_only'
        : student.fotoFreigabe === 'nicht_erlaubt'
          ? 'not_allowed'
          : 'missing';

    blocked.push({
      id: student.id,
      name: displayName(student),
      status: student.fotoFreigabe,
      reason,
    });
  }

  return {
    canShare: blocked.length === 0,
    allowedCount,
    blocked,
    needsSelection: false,
  };
}

export function photoPermissionLabel(status?: FotoFreigabeStatus): string {
  if (status === 'erlaubt') return 'Freigabe vorhanden';
  if (status === 'nur_homepage') return 'Nur Schulhomepage';
  if (status === 'nicht_erlaubt') return 'Nicht erlaubt';
  return 'Keine Angabe';
}


export function isPhotoAlbumShareExpired(expiresAt?: string, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const timestamp = Date.parse(expiresAt);
  // A malformed stored expiry must never be treated as a healthy active link.
  if (!Number.isFinite(timestamp)) return true;
  return timestamp <= now;
}
