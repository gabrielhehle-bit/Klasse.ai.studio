import { isAssessmentValueMissing } from './GradeUtils';

export type AssessmentColumnCoverage = {
  entered: number;
  expected: number;
  exempt: number;
  missing: number;
};

/** Read-only progress for one grading column in the selected class/subject.
 * Non-participating children do not count as outstanding. Stored zero points
 * are real assessments. Existing records and grades are never rewritten.
 */
export function summarizeAssessmentColumnCoverage(
  records: readonly { value: unknown; exempt?: boolean }[],
): AssessmentColumnCoverage {
  let entered = 0;
  let expected = 0;
  let exempt = 0;
  for (const record of records) {
    if (record.exempt === true) {
      exempt++;
      continue;
    }
    expected++;
    if (!isAssessmentValueMissing(record.value)) entered++;
  }
  return { entered, expected, exempt, missing: expected - entered };
}
