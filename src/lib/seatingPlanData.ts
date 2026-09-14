export function getLocalDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isStudentAbsentOnDate(app: any, studentId: string, dateKey: string): boolean {
  const record = app?.anwesenheit?.[studentId]?.[dateKey] || {};
  const statuses = Object.values(record);
  if (statuses.some(status => status === 'u' || status === 'e')) return true;

  const details = app?.anwesenheitDetail?.[studentId]?.[dateKey];
  return Number(details?.fehlstunden || 0) > 0;
}

export function getSeatingPlanAbsentStudents(
  app: any,
  studentIds: string[],
  date = new Date()
): Record<string, boolean> {
  const dateKey = getLocalDateKey(date);
  return Object.fromEntries(
    studentIds.map(id => [id, isStudentAbsentOnDate(app, id, dateKey)])
  );
}
