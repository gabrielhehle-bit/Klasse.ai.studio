import { validClassroomQuiz, type ClassroomQuizQuestion } from './classroomQuizRiddle';

export type QuizDifficulty = 'Leicht' | 'Mittel' | 'Schwer';
export const DEFAULT_CLASSROOM_QUIZ: ClassroomQuizQuestion = {
  t: 'Tiere', q: 'Welches Tier ist das größte landlebende Säugetier?',
  o: ['Elefant', 'Giraffe', 'Nashorn', 'Nilpferd'], a: 0,
};
export function normalizeQuizSession(raw: unknown, legacy?: unknown, legacyDifficulty?: unknown) {
  const v = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const item = validClassroomQuiz(v.item) || validClassroomQuiz(legacy) || DEFAULT_CLASSROOM_QUIZ;
  // A saved answer only belongs to the exact validated question in this snapshot.
  const selected = validClassroomQuiz(v.item) && Number.isInteger(v.selected) &&
    (v.selected as number) >= 0 && (v.selected as number) <= 3 ? v.selected as number : null;
  const level = v.difficulty ?? legacyDifficulty;
  const questionLevel = v.questionDifficulty ?? legacyDifficulty;
  return { item, selected, difficulty: (['Leicht','Mittel','Schwer'].includes(String(level)) ? level : 'Mittel') as QuizDifficulty,
    questionDifficulty: (['Leicht','Mittel','Schwer'].includes(String(questionLevel)) ? questionLevel : 'Mittel') as QuizDifficulty,
    category: typeof v.category === 'string' ? v.category.slice(0,80) : 'Zufall',
    customTopic: typeof v.customTopic === 'string' ? v.customTopic.slice(0,80) : '',
    configuring: v.configuring === true,
    notice: typeof v.notice === 'string' ? v.notice.slice(0,220) : '',
  };
}
export function quizAnswerFeedback(item: ClassroomQuizQuestion, selected: number | null) {
  if (selected === null) return '';
  return selected === item.a ? 'Richtig gelöst!' : `Die richtige Antwort ist: ${item.o[item.a]}.`;
}
