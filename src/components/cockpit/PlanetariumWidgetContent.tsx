import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLANETARIUM_KIND_LABELS,
  SOLAR_SYSTEM_BODIES,
  SOLAR_SYSTEM_SOURCE_NOTE,
  formatOrbitLength,
  formatPlanetYears,
  getPlanetBodies,
  getPlanetariumQuiz,
  normalizePlanetariumWidgetSettings,
  planetYearsForEarthAge,
  type PlanetariumQuizLength,
  type PlanetariumWidgetSettings,
} from '../../lib/planetariumWidgetModel';

interface PlanetariumWidgetContentProps {
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

type PlanetariumMode = 'discover' | 'age' | 'quiz';

export const PlanetariumWidgetContent: React.FC<PlanetariumWidgetContentProps> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizePlanetariumWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const planets = useMemo(() => getPlanetBodies(), []);
  const quizQuestions = useMemo(
    () => getPlanetariumQuiz(settings.quizLength),
    [settings.quizLength],
  );
  const lifecycle = readWidgetLifecycleState(widget, "planetarium", { mode: 'discover' as PlanetariumMode, selectedId: 'earth', earthAge: 9, quizIndex: 0, quizScore: 0, selectedAnswer: null as string | null });
  const [mode, setMode] = useState<PlanetariumMode>(() => lifecycle.mode);
  const [selectedId, setSelectedId] = useState(() => lifecycle.selectedId);
  const [earthAge, setEarthAge] = useState(() => lifecycle.earthAge);
  const [quizIndex, setQuizIndex] = useState(() => lifecycle.quizIndex);
  const [quizScore, setQuizScore] = useState(() => lifecycle.quizScore);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(() => lifecycle.selectedAnswer);
  usePersistedWidgetLifecycleState(widget, onUpdate, "planetarium", { mode, selectedId, earthAge, quizIndex, quizScore, selectedAnswer });
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const selectedBody =
    SOLAR_SYSTEM_BODIES.find(body => body.id === selectedId) ?? SOLAR_SYSTEM_BODIES[3];
  const currentQuestion = quizQuestions[quizIndex] ?? quizQuestions[0];
  const quizFinished =
    Boolean(currentQuestion) &&
    selectedAnswer !== null &&
    quizIndex === quizQuestions.length - 1;

  const previousQuizLength = useRef(settings.quizLength);
  useEffect(() => {
    if (previousQuizLength.current === settings.quizLength) return;
    previousQuizLength.current = settings.quizLength;
    setQuizIndex(0);
    setQuizScore(0);
    setSelectedAnswer(null);
  }, [settings.quizLength]);

  const persistSettings = (patch: Partial<PlanetariumWidgetSettings>) => {
    onUpdateRef.current?.({ settings: patch });
  };

  const selectMode = (nextMode: PlanetariumMode) => {
    setMode(nextMode);
  };

  const answerQuestion = (answer: string) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(answer);
    if (answer === currentQuestion.correct) {
      setQuizScore(score => score + 1);
    }
  };

  const nextQuestion = () => {
    if (quizFinished) {
      setQuizIndex(0);
      setQuizScore(0);
      setSelectedAnswer(null);
      return;
    }
    setQuizIndex(index => Math.min(index + 1, quizQuestions.length - 1));
    setSelectedAnswer(null);
  };

  const surfaceClass = currentIsLight
    ? 'border-slate-200 bg-white text-slate-900'
    : 'border-white/10 bg-white/5 text-slate-100';
  const subtleClass = currentIsLight
    ? 'border-slate-200 bg-slate-50 text-slate-600'
    : 'border-white/10 bg-white/5 text-slate-300';

  const modeButtonClass = (active: boolean) => [
    'min-h-11 rounded-xl border px-2 text-xs font-black transition-colors',
    active
      ? 'border-accent bg-accent text-accent-text'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10',
  ].join(' ');

  const settingButtonClass = (active: boolean) => [
    'min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors',
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10',
  ].join(' ');

  return (
    <div
      role="region"
      aria-label="Planetensystem"
      className={[
        'relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none',
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100',
      ].join(' ')}
    >
      {showSettings && (
        <div
          className={[
            'absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4',
            currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100',
          ].join(' ')}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">
                Planetensystem-Einstellungen
              </p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Passe die Zusatzinfos und die Länge des Lernquiz an.
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

          <section className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">
              Informationen
            </p>
            <button
              type="button"
              aria-pressed={settings.showMoonCounts}
              onClick={() => persistSettings({ showMoonCounts: !settings.showMoonCounts })}
              className={settingButtonClass(settings.showMoonCounts)}
            >
              Mondzahlen {settings.showMoonCounts ? 'anzeigen' : 'ausblenden'}
            </button>
          </section>

          <section className="mt-4">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">
              Quiz
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([5, 8] as PlanetariumQuizLength[]).map(length => (
                <button
                  key={length}
                  type="button"
                  aria-pressed={settings.quizLength === length}
                  onClick={() => persistSettings({ quizLength: length })}
                  className={settingButtonClass(settings.quizLength === length)}
                >
                  {length} Fragen
                </button>
              ))}
            </div>
          </section>

          <div className={['mt-4 rounded-2xl border p-3 text-xs leading-relaxed', subtleClass].join(' ')}>
            Unser Sonnensystem hat einen Stern, acht Planeten und fünf offiziell anerkannte Zwergplaneten.
            Pluto ist seit 2006 als Zwergplanet klassifiziert. {SOLAR_SYSTEM_SOURCE_NOTE}
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-3 gap-2">
        <button
          type="button"
          aria-pressed={mode === 'discover'}
          onClick={() => selectMode('discover')}
          className={modeButtonClass(mode === 'discover')}
        >
          Entdecken
        </button>
        <button
          type="button"
          aria-pressed={mode === 'age'}
          onClick={() => selectMode('age')}
          className={modeButtonClass(mode === 'age')}
        >
          Umläufe
        </button>
        <button
          type="button"
          aria-pressed={mode === 'quiz'}
          onClick={() => selectMode('quiz')}
          className={modeButtonClass(mode === 'quiz')}
        >
          Quiz
        </button>
      </div>

      {mode === 'discover' && (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="shrink-0 pb-1">
            <div className="grid grid-cols-5 gap-1.5">
              {SOLAR_SYSTEM_BODIES.map(body => (
                <button
                  key={body.id}
                  type="button"
                  onClick={() => setSelectedId(body.id)}
                  aria-pressed={selectedBody.id === body.id}
                  className={[
                    'min-h-11 min-w-11 rounded-xl border px-2 text-[11px] font-black transition-colors',
                    selectedBody.id === body.id
                      ? 'border-accent bg-accent-soft text-accent'
                      : surfaceClass,
                  ].join(' ')}
                >
                  {body.orderFromSun === 0 ? '☀ ' : body.orderFromSun + '. '}
                  {body.name}
                </button>
              ))}
            </div>
          </div>

          <div className={['mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-3xl border p-3', surfaceClass].join(' ')}>
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center">
                <div
                  className="h-20 w-20 rounded-full border border-white/20 shadow-xl"
                  style={{ background: selectedBody.appearance }}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black">{selectedBody.name}</h3>
                  <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-black text-accent">
                    {PLANETARIUM_KIND_LABELS[selectedBody.kind]}
                  </span>
                </div>
                <p className="mt-1 text-sm font-bold leading-snug">{selectedBody.shortFact}</p>
                <p className="mt-2 text-xs font-semibold leading-relaxed opacity-70">
                  {selectedBody.detail}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <FactCard
                label="Position"
                value={selectedBody.kind === 'star' ? 'Zentrum' : selectedBody.orderFromSun + '. Planet'}
                currentIsLight={currentIsLight}
              />
              <FactCard
                label="Umlaufzeit"
                value={selectedBody.kind === 'star' ? 'Planeten kreisen um sie' : formatOrbitLength(selectedBody)}
                currentIsLight={currentIsLight}
              />
              {settings.showMoonCounts && selectedBody.kind !== 'star' && (
                <FactCard
                  label="Bekannte Monde"
                  value={String(selectedBody.moonCount ?? 0)}
                  currentIsLight={currentIsLight}
                />
              )}
              <FactCard
                label="Größe"
                value={
                  selectedBody.kind === 'star'
                    ? '≈ 109 Erddurchmesser'
                    : selectedBody.sizeEarths.toFixed(selectedBody.sizeEarths >= 10 ? 1 : 2).replace('.', ',') + ' × Erde'
                }
                currentIsLight={currentIsLight}
              />
            </div>

            <div className={['mt-3 rounded-2xl border px-3 py-2 text-[11px] font-semibold leading-relaxed', subtleClass].join(' ')}>
              Die Sonne ist kein Planet. Von ihr nach außen folgen Merkur, Venus, Erde, Mars, Jupiter,
              Saturn, Uranus und Neptun. Pluto gehört zu den Zwergplaneten.
              {settings.showMoonCounts ? ' ' + SOLAR_SYSTEM_SOURCE_NOTE : ''}
            </div>
          </div>
        </div>
      )}

      {mode === 'age' && (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className={['flex shrink-0 flex-wrap items-center justify-center gap-2 rounded-2xl border p-2.5', subtleClass].join(' ')}>
            <label htmlFor={'planet-age-' + widget?.id} className="text-xs font-black">
              Alter auf der Erde
            </label>
            <input
              id={'planet-age-' + widget?.id}
              type="number"
              inputMode="numeric"
              min={1}
              max={120}
              value={earthAge}
              onChange={event => {
                const value = Number.parseInt(event.target.value, 10);
                setEarthAge(Number.isFinite(value) ? Math.min(120, Math.max(1, value)) : 1);
              }}
              className={[
                'min-h-11 w-20 rounded-xl border px-2 text-center text-base font-black outline-none focus:border-accent',
                currentIsLight ? 'border-slate-300 bg-white' : 'border-white/15 bg-zinc-950',
              ].join(' ')}
            />
            <span className="text-xs font-bold opacity-70">Jahre</span>
          </div>

          <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
            {planets.map(body => {
              const planetYears = planetYearsForEarthAge(earthAge, body) ?? 0;
              return (
                <div key={body.id} className={['rounded-2xl border p-2 text-center', surfaceClass].join(' ')}>
                  <div
                    className="mx-auto h-10 w-10 rounded-full border border-white/20 shadow"
                    style={{ background: body.appearance }}
                    aria-hidden="true"
                  />
                  <p className="mt-1 text-xs font-black">{body.name}</p>
                  <p className="mt-1 text-base font-black text-accent">{formatPlanetYears(planetYears)}</p>
                  <p className="text-[10px] font-bold opacity-60">Planetenjahre</p>
                </div>
              );
            })}
          </div>

          <p className={['mt-2 shrink-0 rounded-2xl border px-3 py-2 text-[11px] font-semibold leading-relaxed', subtleClass].join(' ')}>
            Das ist kein anderes biologisches Alter. Es zeigt nur, wie viele Umläufe der jeweilige Planet
            in derselben Zeit um die Sonne schafft.
          </p>
        </div>
      )}

      {mode === 'quiz' && currentQuestion && (
        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center justify-between text-[11px] font-black opacity-65">
            <span>Frage {quizIndex + 1} von {quizQuestions.length}</span>
            <span>{quizScore} richtig</span>
          </div>

          <div className={['mt-2 rounded-2xl border p-3 text-center text-base font-black leading-snug', surfaceClass].join(' ')}>
            {currentQuestion.question}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            {currentQuestion.options.map(option => {
              const answered = selectedAnswer !== null;
              const isCorrect = option === currentQuestion.correct;
              const isChosen = option === selectedAnswer;
              const answerClass = !answered
                ? surfaceClass + ' hover:border-accent hover:bg-accent-soft'
                : isCorrect
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : isChosen
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                    : surfaceClass + ' opacity-55';
              return (
                <button
                  key={option}
                  type="button"
                  disabled={answered}
                  onClick={() => answerQuestion(option)}
                  className={['min-h-12 rounded-2xl border px-3 py-2 text-sm font-black transition-colors disabled:cursor-default', answerClass].join(' ')}
                >
                  {option}
                </button>
              );
            })}
          </div>

          <div className="mt-2 min-h-0 flex-1">
            {selectedAnswer && (
              <div className={['rounded-2xl border p-3 text-xs font-semibold leading-relaxed', subtleClass].join(' ')}>
                <p className="font-black">
                  {selectedAnswer === currentQuestion.correct ? 'Richtig.' : 'Richtig ist: ' + currentQuestion.correct + '.'}
                </p>
                <p className="mt-1">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>

          {selectedAnswer && (
            <button
              type="button"
              onClick={nextQuestion}
              className="mt-2 min-h-11 shrink-0 rounded-xl bg-accent px-4 text-sm font-black text-accent-text"
            >
              {quizFinished ? 'Quiz neu starten' : 'Nächste Frage'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const FactCard: React.FC<{
  label: string;
  value: string;
  currentIsLight: boolean;
}> = ({ label, value, currentIsLight }) => (
  <div
    className={[
      'rounded-2xl border px-3 py-2',
      currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5',
    ].join(' ')}
  >
    <p className="text-[10px] font-black uppercase tracking-wider opacity-50">{label}</p>
    <p className="mt-0.5 text-xs font-black">{value}</p>
  </div>
);

export default PlanetariumWidgetContent;
