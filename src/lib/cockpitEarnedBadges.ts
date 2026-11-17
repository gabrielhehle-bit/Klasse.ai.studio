import type { Student } from '../types';

/**
 * Only badges explicitly marked as visible on the classroom screen are shown.
 * No achievements are invented from plus-points or behavioral stages.
 */
export function getCockpitEarnedBadges(
  student: Pick<Student, 'badges'>,
  enabled: boolean,
  limit = 2,
) {
  const earned = enabled
    ? (student.badges ?? []).filter(badge =>
        badge.visibleInCockpit === true
        && badge.id !== 'social-stars-10'
        && Boolean(badge.icon.trim())
        && Boolean(badge.name.trim()))
    : [];
  const count = Math.max(0, Math.floor(limit));
  return {
    visible: earned.slice(0, count),
    more: Math.max(0, earned.length - count),
    remainingNames: earned.slice(count).map(badge => badge.name),
  };
}
