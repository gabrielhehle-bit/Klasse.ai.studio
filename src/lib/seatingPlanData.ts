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


export function orderStudentsByComplementaryLevels<T extends { niveau?: number }>(students: T[]): T[] {
  const buckets = new Map<number, T[]>();
  for (let level = 1; level <= 5; level++) buckets.set(level, []);

  const unclassified: T[] = [];
  for (const student of students) {
    const level = Number(student.niveau);
    if (Number.isInteger(level) && level >= 1 && level <= 5) {
      buckets.get(level)!.push(student);
    } else {
      unclassified.push(student);
    }
  }

  // Pair outer levels first (1↔5, 2↔4) and keep 3 as the neutral middle.
  // The UI intentionally shows only numerical levels, never value labels like
  // "schwach" or "stark".
  const order = [1, 5, 2, 4, 3];
  const result: T[] = [];
  const maxBucket = Math.max(0, ...order.map(level => buckets.get(level)!.length));

  for (let index = 0; index < maxBucket; index++) {
    for (const level of order) {
      const student = buckets.get(level)![index];
      if (student) result.push(student);
    }
  }

  return [...result, ...unclassified];
}
