import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TRAFFIC_QUIZ_CATEGORY_LABELS,
  createTrafficExam,
  createTrafficPracticeQuestion,
  filterTrafficQuizQuestions,
  hasPassedTrafficPracticeExam,
  normalizeTrafficQuizSettings,
  type TrafficQuizCategory,
  type TrafficQuizQuestion,
  type TrafficQuizSettings,
} from '../../lib/trafficQuizModel';

interface TrafficQuizWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const CATEGORY_OPTIONS: readonly TrafficQuizCategory[] = [
  'all',
  'signs',
  'priority',
  'cycling',
  'safety',
];

const BikeGlyph: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <circle cx="28" cy="68" r="16" fill="none" stroke="currentColor" strokeWidth="6" />
    <circle cx="72" cy="68" r="16" fill="none" stroke="currentColor" strokeWidth="6" />
    <path
      d="M28 68 45 47 58 68H28Zm17-21 8-15h15M58 68 68 45M53 32h-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrafficVisual: React.FC<{
  visual: TrafficQuizQuestion['visual'];
  currentIsLight: boolean;
}> = ({ visual, currentIsLight }) => {
  const frame = `flex h-full w-full items-center justify-center rounded-3xl border ${
    currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-zinc-800'
  }`;

  if (visual === 'halt') {
    return (
      <div className={frame}>
        <svg viewBox="0 0 100 100" className="h-40 w-40 max-h-[80%] max-w-[80%]" aria-label="Verkehrszeichen HALT">
          <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="#dc2626" stroke="#ffffff" strokeWidth="5" />
          <text x="50" y="58" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900">STOP</text>
        </svg>
      </div>
    );
  }

  if (visual === 'give-way') {
    return (
      <div className={frame}>
        <svg viewBox="0 0 100 100" className="h-40 w-40 max-h-[80%] max-w-[80%]" aria-label="Verkehrszeichen Vorrang geben">
          <polygon points="50,91 8,15 92,15" fill="#ffffff" stroke="#dc2626" strokeWidth="9" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (visual === 'priority-road') {
    return (
      <div className={frame}>
        <svg viewBox="0 0 100 100" className="h-36 w-36 max-h-[72%] max-w-[72%]" aria-label="Verkehrszeichen Vorrangstraße">
          <polygon points="50,4 96,50 50,96 4,50" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
          <polygon points="50,13 87,50 50,87 13,50" fill="#facc15" stroke="#111827" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  if (visual === 'no-entry') {
    return (
      <div className={frame}>
        <svg viewBox="0 0 100 100" className="h-40 w-40 max-h-[80%] max-w-[80%]" aria-label="Verkehrszeichen Einfahrt verboten">
          <circle cx="50" cy="50" r="44" fill="#dc2626" />
          <rect x="14" y="39" width="72" height="22" rx="3" fill="#ffffff" />
        </svg>
      </div>
    );
  }

  if (visual === 'bike-ban' || visual === 'cycle-path-required' || visual === 'cycle-path-optional') {
    const required = visual === 'cycle-path-required';
    const optional = visual === 'cycle-path-optional';
    return (
      <div className={frame}>
        <div
          className={`flex h-40 w-40 max-h-[80%] max-w-[80%] items-center justify-center ${
            optional
              ? 'rounded-2xl bg-blue-600 text-white'
              : required
                ? 'rounded-full bg-blue-600 text-white'
                : 'rounded-full border-[10px] border-red-600 bg-white text-slate-900'
          }`}
          aria-label={
            optional
              ? 'Radweg ohne Benützungspflicht'
              : required
                ? 'Radweg mit Benützungspflicht'
                : 'Fahrverbot für Fahrräder'
          }
        >
          <BikeGlyph className="h-[72%] w-[72%]" />
        </div>
      </div>
    );
  }

  if (visual === 'one-way') {
    return (
      <div className={frame}>
        <svg viewBox="0 0 140 90" className="w-[84%] max-w-72" aria-label="Verkehrszeichen Einbahnstraße">
          <rect x="4" y="4" width="132" height="82" rx="9" fill="#2563eb" />
          <path d="M22 45H104M89 25l24 20-24 20" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (visual === 'crosswalk') {
    return (
      <div className={frame}>
        <div className="relative flex h-[78%] w-[82%] items-center justify-center overflow-hidden rounded-2xl bg-slate-700">
          <div className="absolute inset-x-5 top-1/2 flex -translate-y-1/2 justify-between gap-2">
            {[0,1,2,3,4,5].map(index => <span key={index} className="h-16 flex-1 bg-white" />)}
          </div>
          <span className="relative z-10 rounded-full bg-accent px-3 py-2 text-3xl" aria-hidden="true">🚶</span>
        </div>
      </div>
    );
  }

  if (visual === 'cycle-crossing') {
    return (
      <div className={frame}>
        <div className="relative flex h-[78%] w-[82%] items-center justify-center overflow-hidden rounded-2xl bg-slate-700 text-white">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 border-y-4 border-dashed border-white/90 py-8" />
          <BikeGlyph className="relative z-10 h-24 w-24" />
        </div>
      </div>
    );
  }

  if (visual === 'right-priority') {
    return (
      <div className={frame}>
        <div className="relative h-[78%] w-[78%] rounded-3xl bg-emerald-100 dark:bg-emerald-950/30">
          <div className="absolute left-1/2 top-0 h-full w-16 -translate-x-1/2 bg-slate-500" />
          <div className="absolute left-0 top-1/2 h-16 w-full -translate-y-1/2 bg-slate-500" />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-4xl">🚗</span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-4xl">🚲</span>
        </div>
      </div>
    );
  }

  if (visual === 'roundabout') {
    return (
      <div className={frame}>
        <div className="flex h-[78%] w-[78%] flex-col items-center justify-center rounded-full border-[18px] border-slate-500">
          <span className="text-5xl">↻</span>
          <span className="mt-1 text-center text-xs font-black">Schilder prüfen</span>
        </div>
      </div>
    );
  }

  if (visual === 'hand-signal') {
    return (
      <div className={frame}>
        <div className="flex flex-col items-center gap-3">
          <span className="text-7xl" aria-hidden="true">🚴</span>
          <div className="flex items-center gap-2 text-accent">
            <span className="h-2 w-16 rounded-full bg-current" />
            <span className="text-4xl">←</span>
          </div>
          <span className="text-sm font-black">deutlich anzeigen</span>
        </div>
      </div>
    );
  }

  if (visual === 'helmet') {
    return <div className={frame}><span className="text-8xl" aria-label="Fahrradhelm">⛑️</span></div>;
  }

  if (visual === 'phone') {
    return (
      <div className={frame}>
        <div className="relative">
          <span className="text-8xl" aria-label="Handy">📱</span>
          <span className="absolute -right-5 -top-5 text-6xl text-rose-600" aria-hidden="true">⊘</span>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className="relative flex h-[80%] w-[84%] items-end justify-between rounded-3xl bg-slate-200 p-5 dark:bg-zinc-700">
        <span className="text-7xl" aria-hidden="true">🚚</span>
        <span className="text-5xl" aria-hidden="true">🚲</span>
        <div className="absolute bottom-4 right-8 h-28 w-32 -skew-x-12 rounded-3xl bg-rose-500/25" />
        <span className="absolute right-5 top-4 rounded-xl bg-rose-600 px-2 py-1 text-xs font-black text-white">TOTER WINKEL</span>
      </div>
    </div>
  );
};

export const TrafficQuizWidgetContent: React.FC<TrafficQuizWidgetContentProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeTrafficQuizSettings(widget?.settings),
    [widget?.settings],
  );
  const lifecycle = readWidgetLifecycleState(widget, "trafficquiz", {
    mode: 'practice' as 'practice' | 'exam',
    practiceQuestion: createTrafficPracticeQuestion(settings.category),
    examQuestions: [] as TrafficQuizQuestion[],
    examIndex: 0,
    examCorrect: 0,
    examFinished: false,
    selectedOption: null as number | null,
    practiceCorrect: 0,
    practiceAnswered: 0
  });
  const [mode, setMode] = useState<'practice' | 'exam'>(lifecycle.mode);
  const [practiceQuestion, setPracticeQuestion] = useState<TrafficQuizQuestion>(lifecycle.practiceQuestion);
  const [examQuestions, setExamQuestions] = useState<TrafficQuizQuestion[]>(lifecycle.examQuestions);
  const [examIndex, setExamIndex] = useState(lifecycle.examIndex);
  const [examCorrect, setExamCorrect] = useState(lifecycle.examCorrect);
  const [examFinished, setExamFinished] = useState(lifecycle.examFinished);
  const [selectedOption, setSelectedOption] = useState<number | null>(lifecycle.selectedOption);
  const [practiceCorrect, setPracticeCorrect] = useState(lifecycle.practiceCorrect);
  const [practiceAnswered, setPracticeAnswered] = useState(lifecycle.practiceAnswered);
  const [isSpeaking, setIsSpeaking] = useState(false);
  usePersistedWidgetLifecycleState(widget, onUpdate, "trafficquiz", { mode, practiceQuestion, examQuestions, examIndex, examCorrect, examFinished, selectedOption, practiceCorrect, practiceAnswered });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const pool = filterTrafficQuizQuestions(settings.category);
  const activeQuestion = mode === 'exam'
    ? examQuestions[examIndex]
    : practiceQuestion;
  const isCorrect = selectedOption !== null && activeQuestion
    ? selectedOption === activeQuestion.answerIndex
    : false;

  const persistSettings = useCallback((patch: Partial<TrafficQuizSettings>) => {
    onUpdateRef.current?.({ settings: patch });
  }, []);

  const stopSpeech = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const previousCategory = useRef(settings.category);
  useEffect(() => {
    if (previousCategory.current === settings.category) return;
    previousCategory.current = settings.category;
    stopSpeech();
    setMode('practice');
    setPracticeQuestion(createTrafficPracticeQuestion(settings.category));
    setSelectedOption(null);
    setPracticeCorrect(0);
    setPracticeAnswered(0);
    setExamQuestions([]);
    setExamIndex(0);
    setExamCorrect(0);
    setExamFinished(false);
  }, [settings.category, stopSpeech]);

  const answer = (index: number) => {
    if (!activeQuestion || selectedOption !== null || examFinished) return;
    setSelectedOption(index);
    const correct = index === activeQuestion.answerIndex;
    if (mode === 'practice') {
      setPracticeAnswered(value => value + 1);
      if (correct) setPracticeCorrect(value => value + 1);
    } else if (correct) {
      setExamCorrect(value => value + 1);
    }
  };

  const nextPractice = () => {
    stopSpeech();
    setPracticeQuestion(previous =>
      createTrafficPracticeQuestion(settings.category, Math.random, previous.id),
    );
    setSelectedOption(null);
  };

  const startExam = () => {
    stopSpeech();
    setMode('exam');
    setExamQuestions(createTrafficExam(settings));
    setExamIndex(0);
    setExamCorrect(0);
    setExamFinished(false);
    setSelectedOption(null);
  };

  const nextExam = () => {
    stopSpeech();
    if (examIndex >= examQuestions.length - 1) {
      setExamFinished(true);
      return;
    }
    setExamIndex(value => value + 1);
    setSelectedOption(null);
  };

  const returnToPractice = () => {
    stopSpeech();
    setMode('practice');
    setPracticeQuestion(createTrafficPracticeQuestion(settings.category));
    setSelectedOption(null);
    setExamFinished(false);
  };

  const readQuestion = () => {
    if (!settings.readAloud || !activeQuestion || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      stopSpeech();
      return;
    }
    const text = [
      activeQuestion.question,
      ...activeQuestion.options.map((option, index) => `Antwort ${index + 1}: ${option}.`),
    ].join(' ');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-AT';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const examTotal = examQuestions.length;
  const passed = hasPassedTrafficPracticeExam(examCorrect, examTotal);

  return (
    <div
      role="region"
      aria-label="Fahrrad-Führerschein Übungstrainer Österreich"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Fahrradtrainer-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Österreichische Verkehrszeichen und Radfahrregeln · geprüft nach StVO.
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

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Themenbereich</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORY_OPTIONS.map(category => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={settings.category === category}
                  onClick={() => persistSettings({ category })}
                  className={settingButtonClass(settings.category === category)}
                >
                  <span className="block">{TRAFFIC_QUIZ_CATEGORY_LABELS[category]}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold opacity-60">
                    {filterTrafficQuizQuestions(category).length} Fragen
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Übungsprüfung</p>
            <div className="grid grid-cols-2 gap-2">
              {[5, 10].map(length => (
                <button
                  key={length}
                  type="button"
                  aria-pressed={settings.examLength === length}
                  onClick={() => persistSettings({ examLength: length as 5 | 10 })}
                  className={settingButtonClass(settings.examLength === length)}
                >
                  {length} Fragen
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4 shrink-0">
            <button
              type="button"
              aria-pressed={settings.readAloud}
              onClick={() => persistSettings({ readAloud: !settings.readAloud })}
              className={`min-h-11 w-full rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                settings.readAloud
                  ? 'border-accent bg-accent-soft text-accent'
                  : currentIsLight
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-white/10 bg-white/5 text-slate-200'
              }`}
            >
              Vorlesen {settings.readAloud ? 'aktiv' : 'aus'}
            </button>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Rechtsstand der Fragen: September 2026. Die „Übungsprüfung“ ist nur ein Lerncheck in KLASSIO und kein amtlicher Nachweis über die freiwillige Radfahrprüfung.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2" role="group" aria-label="Trainingsmodus">
        <button
          type="button"
          aria-pressed={mode === 'practice'}
          onClick={returnToPractice}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            mode === 'practice'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Üben
        </button>
        <button
          type="button"
          aria-pressed={mode === 'exam'}
          onClick={startExam}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            mode === 'exam'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Übungsprüfung
        </button>
      </div>

      {mode === 'exam' && examFinished ? (
        <div className="flex min-h-0 flex-1 items-center justify-center p-3">
          <div className={`w-full max-w-xl rounded-3xl border p-6 text-center ${
            passed
              ? 'border-emerald-500 bg-emerald-500/10'
              : 'border-amber-500 bg-amber-500/10'
          }`}>
            <div className="text-5xl">{passed ? '✅' : '📚'}</div>
            <h3 className="mt-3 text-xl font-black">
              {passed ? 'Übungsprüfung bestanden' : 'Noch einmal üben'}
            </h3>
            <p className="mt-2 text-base font-bold">
              {examCorrect} von {examTotal} Antworten richtig
            </p>
            <p className="mt-2 text-xs leading-relaxed opacity-65">
              Das ist ein KLASSIO-Lerncheck und kein amtlicher Nachweis über die freiwillige Radfahrprüfung.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={returnToPractice}
                className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
                  currentIsLight
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-white/10 bg-white/5 text-slate-200'
                }`}
              >
                Weiter üben
              </button>
              <button
                type="button"
                onClick={startExam}
                className="min-h-11 rounded-xl bg-accent px-3 text-xs font-black text-accent-text hover:bg-accent-hover"
              >
                Noch einmal
              </button>
            </div>
          </div>
        </div>
      ) : activeQuestion ? (
        <>
          <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-accent-soft px-3 py-1.5 text-xs font-black text-accent">
              {TRAFFIC_QUIZ_CATEGORY_LABELS[settings.category]}
            </span>
            {mode === 'exam' ? (
              <span className="ml-auto text-xs font-black opacity-60">
                Frage {examIndex + 1} von {examQuestions.length}
              </span>
            ) : (
              <span className="ml-auto text-xs font-bold opacity-60">
                {practiceAnswered === 0 ? 'Noch keine Antwort' : `${practiceCorrect} von ${practiceAnswered} richtig`}
              </span>
            )}
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[minmax(190px,0.9fr)_minmax(260px,1.1fr)] items-center gap-4 py-3">
            <div className="h-full min-h-48">
              <TrafficVisual visual={activeQuestion.visual} currentIsLight={currentIsLight} />
            </div>

            <div className="flex min-h-0 flex-col justify-center">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-accent">{activeQuestion.title}</p>
                  <h3 className="mt-1 text-base font-black leading-snug">{activeQuestion.question}</h3>
                </div>
                {settings.readAloud && (
                  <button
                    type="button"
                    onClick={readQuestion}
                    className={`min-h-11 min-w-11 shrink-0 rounded-xl border text-lg ${
                      isSpeaking
                        ? 'border-accent bg-accent text-accent-text'
                        : currentIsLight
                          ? 'border-slate-200 bg-white'
                          : 'border-white/10 bg-white/5'
                    }`}
                    aria-label={isSpeaking ? 'Vorlesen stoppen' : 'Frage vorlesen'}
                  >
                    {isSpeaking ? '■' : '🔊'}
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-2" role="group" aria-label="Antworten">
                {activeQuestion.options.map((option, index) => {
                  const answered = selectedOption !== null;
                  const correctOption = index === activeQuestion.answerIndex;
                  const selected = index === selectedOption;
                  const stateClass = !answered
                    ? currentIsLight
                      ? 'border-slate-200 bg-white text-slate-800 hover:border-accent hover:bg-accent-soft'
                      : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10'
                    : correctOption
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : selected
                        ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        : currentIsLight
                          ? 'border-slate-200 bg-slate-50 text-slate-500'
                          : 'border-white/10 bg-white/5 text-slate-400';
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={answered}
                      onClick={() => answer(index)}
                      className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition-colors disabled:cursor-default ${stateClass}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className={`mt-3 rounded-2xl border p-3 ${
                  isCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10'
                }`}>
                  <p
                    role="status"
                    aria-live="polite"
                    className={`text-sm font-black ${
                      isCorrect
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {isCorrect ? 'Richtig.' : 'Nicht ganz.'}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-relaxed">{activeQuestion.explanation}</p>
                  <p className="mt-1 text-[10px] font-bold opacity-50">Quelle: {activeQuestion.source}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-3">
            <p className="text-[10px] font-semibold leading-relaxed opacity-55">
              Österreich · Rechtsstand September 2026 · Lernhilfe, keine amtliche Prüfung
            </p>
            {selectedOption !== null && (
              <button
                type="button"
                onClick={mode === 'practice' ? nextPractice : nextExam}
                className="min-h-11 rounded-xl bg-accent px-5 text-xs font-black text-accent-text hover:bg-accent-hover"
              >
                {mode === 'practice'
                  ? 'Nächste Frage'
                  : examIndex >= examQuestions.length - 1
                    ? 'Ergebnis'
                    : 'Weiter'}
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm font-bold opacity-60">
          Keine Fragen für diese Auswahl verfügbar.
        </div>
      )}
    </div>
  );
};

export default TrafficQuizWidgetContent;
