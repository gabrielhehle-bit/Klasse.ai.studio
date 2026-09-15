import { yearPlanCellEntries } from './yearlyPlanData';

function hasText(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getPlanningStatistics(app: any) {
  const subjectHours: Record<string, number> = {};
  let weeklyLessonHours = 0;

  Object.values(app.stammplan || {}).forEach((dayMap: any) => {
    Object.values(dayMap || {}).forEach((subject: any) => {
      if (!hasText(subject) || String(subject).trim().toLowerCase() === 'frei') return;
      const key = String(subject).trim();
      weeklyLessonHours += 1;
      subjectHours[key] = (subjectHours[key] || 0) + 1;
    });
  });

  let weeklyTopics = 0;
  let plannedWeeklyWeeks = 0;
  Object.values(app.wochenplanung || {}).forEach((weekPlan: any) => {
    let weekTopics = 0;
    Object.values(weekPlan || {}).forEach((dayPlan: any) => {
      Object.values(dayPlan || {}).forEach((lesson: any) => {
        if (!lesson || typeof lesson !== 'object') return;
        if (hasText(lesson.thema) || hasText(lesson.inhalt)) weekTopics += 1;
      });
    });
    if (weekTopics > 0) plannedWeeklyWeeks += 1;
    weeklyTopics += weekTopics;
  });

  let yearlyTopics = 0;
  let plannedYearlyWeeks = 0;
  Object.values(app.jahresplanung || {}).forEach((weekPlan: any) => {
    let weekTopics = 0;
    Object.values(weekPlan || {}).forEach((cell: any) => {
      weekTopics += yearPlanCellEntries(cell).filter(entry =>
        hasText(entry.thema) || hasText(entry.buch)
      ).length;
    });
    if (weekTopics > 0) plannedYearlyWeeks += 1;
    yearlyTopics += weekTopics;
  });

  return {
    weeklyLessonHours,
    subjectHours,
    plannedWeeklyWeeks,
    weeklyTopics,
    plannedYearlyWeeks,
    yearlyTopics,
  };
}
