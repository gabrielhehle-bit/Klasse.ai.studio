/**
 * Derive visible actions from the same child task key used for pupil feedback.
 * The lesson is never modified and feedback remains attached to the original
 * school-year/week/day/hour even after unpublished tasks are hidden.
 */
export function getMobileWeeklyLessonPermissions(input: {
  lesson: unknown;
  taskId: string;
  students: readonly { wochenplanFortschritt?: Record<string, unknown> }[];
}): {
  canPublish: boolean;
  isPublished: boolean;
  hasChildFeedback: boolean;
  canPark: boolean;
} {
  const lesson = input.lesson && typeof input.lesson === 'object' && !Array.isArray(input.lesson)
    ? input.lesson as Record<string, unknown> : {};
  const canPublish = typeof lesson.fach === 'string' && lesson.fach.trim().length > 0 &&
    typeof lesson.thema === 'string' && lesson.thema.trim().length > 0;
  const isPublished = lesson.imKinderWochenplan === true;
  const hasChildFeedback = Boolean(input.taskId) && (input.students || []).some(student =>
    Boolean(student?.wochenplanFortschritt) &&
      Object.prototype.hasOwnProperty.call(student.wochenplanFortschritt, input.taskId));
  return {
    canPublish,
    isPublished,
    hasChildFeedback,
    canPark: !isPublished && !hasChildFeedback,
  };
}
