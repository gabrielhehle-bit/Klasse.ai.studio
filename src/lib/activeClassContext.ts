import type { AppState, Student } from '../types';

export interface ActiveClassPermissions {
  canRead: boolean;
  canEdit: boolean;
}

export interface ActiveClassContext {
  classId: string | null;
  className: string | null;
  students: Student[];
  studentCount: number;
  isDemoData: boolean;
  loading: boolean;
  error: string | null;
  permissions: ActiveClassPermissions;
}

const noActiveClassMessage = 'Keine aktive Klasse ausgewählt.';

export function getActiveClassContext(
  app: AppState | null | undefined,
): ActiveClassContext {
  const classId = app?.activeClassId?.trim() || null;

  if (!app) {
    return {
      classId: null,
      className: null,
      students: [],
      studentCount: 0,
      isDemoData: false,
      loading: false,
      error: 'Klassenkontext ist nicht verfügbar.',
      permissions: { canRead: false, canEdit: false },
    };
  }

  if (!classId) {
    return {
      classId: null,
      className: null,
      students: [],
      studentCount: 0,
      isDemoData: false,
      loading: false,
      error: noActiveClassMessage,
      permissions: { canRead: false, canEdit: false },
    };
  }

  const activeClass = Array.isArray(app.classes)
    ? app.classes.find(classroom => classroom?.id === classId)
    : undefined;
  const students = Array.isArray(app.schueler)
    ? app.schueler
    : Array.isArray(activeClass?.schueler)
      ? activeClass.schueler
      : [];
  const isDemoData = Boolean(app.demoModusAktiv)
    || students.some(student => String(student?.id ?? '').startsWith('demo-'));

  return {
    classId,
    className: activeClass?.name || app.klassenbezeichnung || null,
    students,
    studentCount: students.length,
    isDemoData,
    loading: false,
    error: null,
    permissions: {
      canRead: true,
      canEdit: !isDemoData,
    },
  };
}
