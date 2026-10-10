import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FLAG_QUIZ_CONTINENT_LABELS,
  FLAG_QUIZ_DIFFICULTY_LABELS,
  createFlagQuizQuestion,
  filterFlagQuizCountries,
  getFlagIconUrl,
  normalizeFlagQuizSettings,
  type FlagQuizContinentFilter,
  type FlagQuizDifficultyFilter,
  type FlagQuizQuestion,
  type FlagQuizSettings,
} from '../../lib/flagQuizModel';

interface FlagQuizWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const CONTINENT_OPTIONS: readonly FlagQuizContinentFilter[] = [
  'all',
  'europe',
  'africa',
  'asia',
  'northAmerica',
  'southAmerica',
  'oceania',
];

const DIFFICULTY_OPTIONS: readonly FlagQuizDifficultyFilter[] = [
  'all',
  'easy',
  'medium',
  'hard',
];

export const FlagQuizWidgetContent: React.FC<FlagQuizWidgetContentProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeFlagQuizSettings(widget?.settings),
    [widget?.settings],
  );
  const lifecycle = readWidgetLifecycleState(widget, "flagquiz", { question: createFlagQuizQuestion(settings), answeredCode: null as string | null, correctAnswers: 0, answeredQuestions: 0 });
  const [question, setQuestion] = useState<FlagQuizQuestion | null>(() => lifecycle.question);
  const [answeredCode, setAnsweredCode] = useState<string | null>(() => lifecycle.answeredCode);
  const [flagLoadFailed, setFlagLoadFailed] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(() => lifecycle.correctAnswers);
  const [answeredQuestions, setAnsweredQuestions] = useState(() => lifecycle.answeredQuestions);
  usePersistedWidgetLifecycleState(widget, onUpdate, "flagquiz", { question, answeredCode, correctAnswers, answeredQuestions });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const poolSize = filterFlagQuizCountries(settings).length;

  const persistSettings = useCallback((patch: Partial<FlagQuizSettings>) => {
    if (!onUpdateRef.current) return;
    onUpdateRef.current({ settings: patch });
  }, []);

  const loadQuestion = useCallback((previousCode?: string) => {
    setQuestion(createFlagQuizQuestion(settings, Math.random, previousCode));
    setAnsweredCode(null);
    setFlagLoadFailed(false);
  }, [settings]);

  const previousFilters = useRef(`${settings.continent}:${settings.difficulty}`);
  useEffect(() => {
    const key = `${settings.continent}:${settings.difficulty}`;
    if (previousFilters.current === key) return;
    previousFilters.current = key;
    setQuestion(createFlagQuizQuestion(settings));
    setAnsweredCode(null);
    setFlagLoadFailed(false);
    setCorrectAnswers(0);
    setAnsweredQuestions(0);
  }, [settings.continent, settings.difficulty]);

  const chooseAnswer = (code: string) => {
    if (!question || answeredCode) return;
    setAnsweredCode(code);
    setAnsweredQuestions(value => value + 1);
    if (code === question.country.code) {
      setCorrectAnswers(value => value + 1);
    }
  };

  const optionClass = (code: string) => {
    if (!answeredCode) {
      return currentIsLight
        ? 'border-slate-200 bg-white text-slate-800 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10';
    }

    if (code === question?.country.code) {
      return 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    }
    if (code === answeredCode) {
      return 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300';
    }
    return currentIsLight
      ? 'border-slate-200 bg-slate-50 text-slate-500'
      : 'border-white/10 bg-white/5 text-slate-400';
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const feedback = !question
    ? 'Für diese Auswahl sind keine Länder vorhanden.'
    : !answeredCode
      ? 'Wähle das passende Land.'
      : answeredCode === question.country.code
        ? `Richtig – das ist ${question.country.name}.`
        : `Nicht ganz – richtig ist ${question.country.name}.`;

  return (
    <div
      role="region"
      aria-label="Flaggenquiz"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-3 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Flaggenquiz-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Wähle Kontinent und Schwierigkeitsstufe. „Alle“ mischt die jeweilige Auswahl.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
          <section className="mt-2 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Kontinent</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTINENT_OPTIONS.map(option => {
                const count = filterFlagQuizCountries({
                  ...settings,
                  continent: option,
                }).length;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={settings.continent === option}
                    onClick={() => persistSettings({ continent: option })}
                    className={settingButtonClass(settings.continent === option)}
                  >
                    <span className="block">{FLAG_QUIZ_CONTINENT_LABELS[option]}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold opacity-60">{count} Länder</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-2 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Schwierigkeit</p>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTY_OPTIONS.map(option => {
                const count = filterFlagQuizCountries({
                  ...settings,
                  difficulty: option,
                }).length;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={settings.difficulty === option}
                    onClick={() => persistSettings({ difficulty: option })}
                    className={settingButtonClass(settings.difficulty === option)}
                  >
                    <span className="block">{FLAG_QUIZ_DIFFICULTY_LABELS[option]}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold opacity-60">{count} Länder</span>
                  </button>
                );
              })}
            </div>
          </section>

          </div>
          <div className={`mt-2 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Die 195 Länder sind geografisch nach einer festen UN-M49-Zuordnung einsortiert. Die Stufen „Einfach“, „Mittel“ und „Schwer“ sind eine didaktische KLASSIO-Einstufung.
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">
          {FLAG_QUIZ_CONTINENT_LABELS[settings.continent]}
        </span>
        <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">
          {FLAG_QUIZ_DIFFICULTY_LABELS[settings.difficulty]}
        </span>
        <span className="ml-auto text-xs font-bold opacity-55">{poolSize} Länder</span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(180px,0.95fr)_minmax(220px,1.05fr)] items-center gap-4 py-3">
        <div className="flex min-h-0 flex-col items-center justify-center">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider opacity-50">
            Welches Land hat diese Flagge?
          </p>
          <div className={`flex aspect-[4/3] w-full max-w-72 items-center justify-center overflow-hidden rounded-3xl border shadow-sm ${
            currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-zinc-800'
          }`}>
            {question && !flagLoadFailed ? (
              <img
                key={question.country.code}
                src={getFlagIconUrl(question.country.code)}
                alt="Zu erratende Landesflagge"
                className="h-full w-full object-contain"
                referrerPolicy="no-referrer"
                onError={() => setFlagLoadFailed(true)}
              />
            ) : (
              <div
                role="status"
                aria-live="polite"
                className="flex flex-col items-center gap-3 px-5 text-center"
              >
                <div>
                  <p className="text-sm font-black">Flagge konnte nicht geladen werden.</p>
                  <p className="mt-1 text-xs opacity-60">Die Antwortmöglichkeiten bleiben nutzbar. Du kannst das Bild erneut laden oder direkt weitergehen.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFlagLoadFailed(false)}
                  className="min-h-11 rounded-xl border border-accent px-3 text-xs font-black text-accent hover:bg-accent-soft"
                >
                  Flagge erneut laden
                </button>
              </div>
            )}
          </div>

          <p
            role="status"
            aria-live="polite"
            className={`mt-3 min-h-10 text-center text-sm font-bold leading-relaxed ${
              answeredCode
                ? answeredCode === question?.country.code
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                : 'opacity-60'
            }`}
          >
            {feedback}
          </p>
        </div>

        <div className="flex min-h-0 flex-col justify-center">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Länder auswählen">
            {question?.choices.map(choice => (
              <button
                key={choice.code}
                type="button"
                disabled={Boolean(answeredCode)}
                onClick={() => chooseAnswer(choice.code)}
                className={`min-h-14 rounded-2xl border px-3 py-3 text-sm font-black transition-colors disabled:cursor-default ${optionClass(choice.code)}`}
              >
                {choice.name}
              </button>
            ))}
          </div>

          <div className={`mt-3 flex min-h-11 items-center justify-between gap-3 rounded-2xl border px-3 py-2 ${
            currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
          }`}>
            <div className="text-xs font-bold opacity-65">
              {answeredQuestions === 0 ? 'Noch keine Antwort' : `${correctAnswers} von ${answeredQuestions} richtig`}
            </div>
            <button
              type="button"
              onClick={() => loadQuestion(question?.country.code)}
              className="min-h-11 rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              {answeredCode || flagLoadFailed ? 'Nächste Flagge' : 'Andere Flagge'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlagQuizWidgetContent;
