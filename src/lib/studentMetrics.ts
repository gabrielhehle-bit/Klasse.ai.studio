import { berechne } from './GradeUtils';

export type StudentAttendanceSummary = {
  excused: number;
  unexcused: number;
  total: number;
  recordedDays: number;
  hasData: boolean;
  weekdayCounts: Record<string, number>;
};

export function getStudentAttendanceSummary(app: any, studentId: string): StudentAttendanceSummary {
  const data = app.anwesenheit?.[studentId] || {};
  let excused = 0;
  let unexcused = 0;
  const weekdayCounts: Record<string, number> = {
    Montag: 0,
    Dienstag: 0,
    Mittwoch: 0,
    Donnerstag: 0,
    Freitag: 0
  };

  Object.entries(data).forEach(([dateString, rawDayData]) => {
    const dayData = rawDayData && typeof rawDayData === 'object' ? rawDayData : {};
    let isAbsent = false;
    Object.values(dayData).forEach(status => {
      if (status === 'e') {
        excused += 1;
        isAbsent = true;
      } else if (status === 'u') {
        unexcused += 1;
        isAbsent = true;
      }
    });

    if (isAbsent) {
      const date = new Date(dateString);
      const dayName = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'][date.getDay()];
      if (weekdayCounts[dayName] !== undefined) weekdayCounts[dayName] += 1;
    }
  });

  return {
    excused,
    unexcused,
    total: excused + unexcused,
    recordedDays: Object.keys(data).length,
    hasData: Object.keys(data).length > 0,
    weekdayCounts
  };
}

export function getStudentGradeSummary(
  app: any,
  studentId: string,
  subjects: string[],
  semester = '1'
) {
  const subjectGrades = subjects
    .map(subject => ({
      subject,
      value: berechne(app, studentId, subject, semester)
    }))
    .filter((item): item is { subject: string; value: number } => item.value !== null);

  const average = subjectGrades.length > 0
    ? subjectGrades.reduce((sum, item) => sum + item.value, 0) / subjectGrades.length
    : null;

  return {
    average,
    subjectGrades,
    gradedSubjects: subjectGrades.length,
    hasData: subjectGrades.length > 0
  };
}

export function getStudentFinanceSummary(app: any, studentId: string) {
  const items = (app.klassenkasse?.sammlungen || [])
    .map((collection: any) => {
      const amount = Number(collection.betraege?.[studentId] ?? collection.betrag ?? 0);
      const status = collection.status?.[studentId] || 'offen';
      return {
        id: collection.id,
        title: collection.titel || 'Sammlung',
        amount: Number.isFinite(amount) ? amount : 0,
        status
      };
    })
    .filter((item: any) => item.amount > 0);

  const paid = items
    .filter((item: any) => item.status === 'bezahlt')
    .reduce((sum: number, item: any) => sum + item.amount, 0);
  const open = items
    .filter((item: any) => item.status !== 'bezahlt')
    .reduce((sum: number, item: any) => sum + item.amount, 0);

  return {
    items,
    paid,
    open,
    due: paid + open,
    hasData: items.length > 0,
    isBalanced: items.length > 0 && open === 0
  };
}

export function getStudentBehaviorSummary(app: any, studentId: string) {
  const stages = app.behavior_stages || [
    { id: '1', label: 'Herausragend', icon: '🌟', color: '#f59e0b', severity: 0 },
    { id: '2', label: 'Sehr positiv', icon: '😊', color: '#10b981', severity: 1 },
    { id: '3', label: 'Neutral', icon: '😐', color: '#64748b', severity: 2 },
    { id: '4', label: 'Ermahnung', icon: '⚠️', color: '#f97316', severity: 3 },
    { id: '5', label: 'Kritisch', icon: '❌', color: '#ef4444', severity: 4 }
  ];
  const logs = (app.statusLog || []).filter((log: any) => log.schuelerId === studentId);
  const explicitStatusId = app.behavior_status?.[studentId];
  const statusId = explicitStatusId || app.behavior_default_stage_id || '3';
  const stage = stages.find((item: any) => item.id === statusId) || stages[2];

  return {
    stages,
    logs,
    stage,
    hasData: logs.length > 0 || Boolean(explicitStatusId),
    hasExplicitStatus: Boolean(explicitStatusId)
  };
}

export function getStudentNotes(app: any, studentId: string) {
  const sources = [
    ...(app.notizen || []),
    ...(app.notes || []),
    ...(app.journal || [])
  ].filter((item: any) => item.schuelerId === studentId);

  return sources
    .filter((item: any, index: number, all: any[]) => {
      if (item.id) return all.findIndex(candidate => candidate.id === item.id) === index;
      return all.findIndex(candidate =>
        candidate.inhalt === item.inhalt &&
        (candidate.datum || candidate.timestamp) === (item.datum || item.timestamp)
      ) === index;
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.datum || a.timestamp || 0).getTime();
      const dateB = new Date(b.datum || b.timestamp || 0).getTime();
      return dateB - dateA;
    });
}
