import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Play, RotateCcw, Undo2, Users, Pause, UserCheck, 
  Sparkles, RefreshCw, X, Volume2, VolumeX, ListFilter,
  CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import { CockpitWidgetConfig, Student, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  getDisplayStudentName,
  isStudentAbsentToday,
  shuffleArray,
  DEFAULT_MOCK_STUDENTS as DEFAULT_MOCK_SCHUELER,
  CockpitStudent as FairCallStudent,
} from '../studentSelectionUtils';

export { getDisplayStudentName, isStudentAbsentToday };
export type { FairCallStudent };

export interface FairCallWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  currentIsLight: boolean;
}

/**
 * Erzeugt einen dezenten, warmen Ausrufton via Web Audio API (keine externen MP3-Dateien nötig)
 */
function playDezentDingSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Zweiklang / Glockenton: 587.33 Hz (D5) -> 880 Hz (A5)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // Audio im Browser blockiert oder nicht verfügbar - geräuschlos ignorieren
  }
}

export const FairCallWidget: React.FC<FairCallWidgetProps> = ({
  widget,
  onUpdate,
  app: propApp,
  currentIsLight,
}) => {
  const context = useApp();
  const app = propApp || context?.app;

  // Schülerliste der aktuellen Klasse (oder Fallback für Demomodus)
  const allStudents = useMemo(() => {
    return app?.schueler && app.schueler.length > 0 ? app.schueler : DEFAULT_MOCK_SCHUELER;
  }, [app?.schueler]);

  // Nur anwesende Schüler
  const presentStudents = useMemo(() => {
    return allStudents.filter((s) => !isStudentAbsentToday(s.id, app));
  }, [allStudents, app]);

  const presentStudentIds = useMemo(() => {
    return presentStudents.map((s) => s.id);
  }, [presentStudents]);

  // Persistierte Einstellungen in widget.settings
  const settings = widget.settings || {};

  // Stabile IDs:
  // - remainingIds: Kinder, die in dieser Runde noch drankommen
  // - calledIds: Kinder, die in dieser Runde schon dran waren (Reihenfolge)
  // - currentId: Das aktuell gezogene Kind
  // - pausedIds: Kinder, die für DIESE Runde manuell pausiert wurden
  const remainingIds: string[] = useMemo(() => {
    return Array.isArray(settings.remainingIds) ? settings.remainingIds : [];
  }, [settings.remainingIds]);

  const calledIds: string[] = useMemo(() => {
    return Array.isArray(settings.calledIds) ? settings.calledIds : [];
  }, [settings.calledIds]);

  const currentId: string | null = settings.currentId || null;
  const pausedIds: string[] = useMemo(() => {
    return Array.isArray(settings.pausedIds) ? settings.pausedIds : [];
  }, [settings.pausedIds]);

  // Audio-Option
  const soundEnabled = settings.soundEnabled !== false;

  // Lokale Zustände für Animation & Overlays
  const [animating, setAnimating] = useState(false);
  const [animDisplayName, setAnimDisplayName] = useState<string>('');
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [rosterTab, setRosterTab] = useState<'remaining' | 'called' | 'paused'>('remaining');

  // Container-Größe für responsives Layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 350, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setContainerSize({ width, height });
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Automatische Initialisierung beim allerersten Start, falls noch keine Runde existiert
  useEffect(() => {
    if (!settings.hasInitialized && remainingIds.length === 0 && calledIds.length === 0) {
      const initialShuffled = shuffleArray(presentStudentIds);
      onUpdate({
        settings: {
          ...settings,
          hasInitialized: true,
          remainingIds: initialShuffled,
          calledIds: [],
          currentId: null,
          pausedIds: [],
        },
      });
    }
  }, [settings.hasInitialized, remainingIds.length, calledIds.length, presentStudentIds, onUpdate]);

  // Effektive noch offene Kinder (anwesend, noch im Pool, nicht pausiert)
  const eligibleRemainingIds = useMemo(() => {
    return remainingIds.filter((id) => presentStudentIds.includes(id) && !pausedIds.includes(id));
  }, [remainingIds, presentStudentIds, pausedIds]);

  // Gesamtanzahl der teilnehmenden Kinder in dieser Runde (ohne dauerhaft Abwesende)
  const totalInRoundCount = useMemo(() => {
    const activeParticipants = new Set([
      ...remainingIds.filter((id) => presentStudentIds.includes(id)),
      ...calledIds.filter((id) => presentStudentIds.includes(id)),
      ...(currentId && presentStudentIds.includes(currentId) ? [currentId] : []),
    ]);
    return Math.max(activeParticipants.size, presentStudents.length);
  }, [remainingIds, calledIds, currentId, presentStudentIds, presentStudents.length]);

  const calledCount = calledIds.length;
  const isRoundComplete = eligibleRemainingIds.length === 0 && (calledCount > 0 || currentId !== null);

  // Aktuell ausgewähltes Schülerobjekt
  const currentStudent = useMemo(() => {
    if (!currentId) return null;
    return allStudents.find((s) => s.id === currentId) || null;
  }, [currentId, allStudents]);

  // Letzte 3–5 aufgerufene Schüler für den Verlauf
  const recentCalledStudents = useMemo(() => {
    // Letzte aufgerufene Kinder (ohne das aktuell im Fokus stehende)
    return calledIds
      .filter((id) => id !== currentId)
      .slice(-4)
      .reverse()
      .map((id) => allStudents.find((s) => s.id === id))
      .filter(Boolean) as FairCallStudent[];
  }, [calledIds, currentId, allStudents]);

  /**
   * Neue Runde starten:
   * Erfasst alle aktuell anwesenden Kinder neu, mischt sie frisch und hebt temporäre Pausen auf.
   */
  const handleStartNewRound = useCallback(() => {
    const freshlyShuffled = shuffleArray(presentStudentIds);
    onUpdate({
      settings: {
        ...settings,
        remainingIds: freshlyShuffled,
        calledIds: [],
        currentId: null,
        pausedIds: [], // Pausen gelten nur für die Runde
      },
    });
  }, [presentStudentIds, settings, onUpdate]);

  /**
   * Nächstes Kind aufrufen:
   * Kurze Animation (ca. 600ms), dann Name anzeigen und Status aktualisieren.
   */
  const handlePickNext = useCallback(() => {
    if (animating || eligibleRemainingIds.length === 0) return;

    // Nächstes Kind aus dem gemischten Pool ziehen
    const nextId = eligibleRemainingIds[0];
    const targetStudent = allStudents.find((s) => s.id === nextId);
    if (!targetStudent) return;

    setAnimating(true);

    // Schnelle Animation: Wechsel von Namen aus dem Pool
    const poolStudents = eligibleRemainingIds
      .map((id) => allStudents.find((s) => s.id === id))
      .filter(Boolean) as FairCallStudent[];

    let tick = 0;
    const maxTicks = 8;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * poolStudents.length);
      const randomS = poolStudents[randomIdx] || targetStudent;
      setAnimDisplayName(getDisplayStudentName(randomS, allStudents));
      tick++;

      if (tick >= maxTicks) {
        clearInterval(interval);
        setAnimating(false);
        setAnimDisplayName('');

        // Sound abspielen
        if (soundEnabled) {
          playDezentDingSound();
        }

        // State aktualisieren: Kind von remainingIds -> calledIds
        const nextRemaining = remainingIds.filter((id) => id !== nextId);
        const nextCalled = [...calledIds.filter((id) => id !== nextId), nextId];

        onUpdate({
          settings: {
            ...settings,
            remainingIds: nextRemaining,
            calledIds: nextCalled,
            currentId: nextId,
          },
        });
      }
    }, 75);
  }, [animating, eligibleRemainingIds, allStudents, soundEnabled, remainingIds, calledIds, settings, onUpdate]);

  /**
   * Letzte Auswahl zurücknehmen (Undo):
   * Bringt das aktuelle Kind wieder zurück in den offenen Pool.
   */
  const handleUndo = useCallback(() => {
    if (!currentId || animating) return;

    // Aktuelles Kind zurück in remainingIds
    const nextRemaining = [currentId, ...remainingIds.filter((id) => id !== currentId)];
    const nextCalled = calledIds.filter((id) => id !== currentId);
    // Letztes vorheriges Kind als currentId setzen (oder null)
    const previousId = nextCalled.length > 0 ? nextCalled[nextCalled.length - 1] : null;

    onUpdate({
      settings: {
        ...settings,
        remainingIds: nextRemaining,
        calledIds: nextCalled,
        currentId: previousId,
      },
    });
  }, [currentId, animating, remainingIds, calledIds, settings, onUpdate]);

  /**
   * "Noch einmal":
   * Hebt das aktuelle Kind nochmals hervor, ohne die Fairness-Runde zu verändern.
   */
  const handleCallAgain = useCallback(() => {
    if (!currentStudent || animating) return;
    if (soundEnabled) {
      playDezentDingSound();
    }
  }, [currentStudent, animating, soundEnabled]);

  /**
   * Temporär pausieren für diese Runde
   */
  const handleTogglePause = useCallback((studentId: string) => {
    const isPaused = pausedIds.includes(studentId);
    const nextPaused = isPaused
      ? pausedIds.filter((id) => id !== studentId)
      : [...pausedIds, studentId];

    onUpdate({
      settings: {
        ...settings,
        pausedIds: nextPaused,
      },
    });
  }, [pausedIds, settings, onUpdate]);

  // Sound umschalten
  const toggleSound = () => {
    onUpdate({
      settings: {
        ...settings,
        soundEnabled: !soundEnabled,
      },
    });
  };

  // Tastaturbedienung (Space/Enter -> Nächstes Kind, Backspace/Z -> Zurück)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Nicht auslösen, wenn ein Textinput aktiv ist
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (!isRoundComplete) {
          e.preventDefault();
          handlePickNext();
        }
      } else if (e.key === 'Backspace' || e.key === 'z' || e.key === 'Z') {
        if (currentId) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePickNext, handleUndo, isRoundComplete, currentId]);

  // Responsive Klassifizierung
  const isSmallWidget = containerSize.width < 320 || containerSize.height < 280;
  const isLargeOrFullscreen = containerSize.width > 600 || containerSize.height > 500;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between w-full h-full p-3 sm:p-5 rounded-2xl overflow-hidden select-none transition-colors duration-200 border ${
        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-white/10'
      }`}
    >
      {/* ========================================================================= */}
      {/* TOP BAR: Header, Sound & Teacher Roster Button                            */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 shrink-0 pb-2.5 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base sm:text-lg">🙋‍♀️</span>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider block text-slate-800 dark:text-white leading-tight truncate">
              Fair-Call
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block truncate">
              Gerechter Schüleraufruf
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`min-h-[36px] min-w-[36px] p-2 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-center ${
              soundEnabled
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-400'
            }`}
            title={soundEnabled ? 'Ton ausschalten' : 'Ton einschalten'}
            aria-label="Ton umschalten"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {/* Roster / Pausieren Button */}
          <button
            type="button"
            onClick={() => setShowRosterModal(true)}
            className={`min-h-[36px] px-2.5 sm:px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              currentIsLight
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-xs'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300 shadow-xs'
            }`}
            title="Übersicht der Runde & temporär pausieren"
            aria-label="Runden-Übersicht"
          >
            <ListFilter size={14} />
            <span className="hidden sm:inline">Übersicht</span>
            <span className="text-[10px] bg-indigo-600 text-white font-black px-1.5 py-0.2 rounded-full">
              {eligibleRemainingIds.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN DISPLAY: Big Student Name & Card Arena                               */}
      {/* ========================================================================= */}
      <div className="flex-grow flex flex-col justify-center items-center my-2 sm:my-3 min-h-0 w-full overflow-hidden">
        {isRoundComplete ? (
          /* Runde vollständig abgeschlossen */
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 text-center max-w-md w-full animate-fade-in">
            <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Alle waren einmal dran!
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-slate-400 mt-1 max-w-[280px]">
              Jedes anwesende Kind dieser Runde wurde aufgerufen.
            </p>
            <button
              type="button"
              onClick={handleStartNewRound}
              className="mt-4 min-h-[48px] px-5 sm:px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw size={16} />
              <span>Neue Runde starten</span>
            </button>
          </div>
        ) : (
          /* Normaler Runden-Status & Name-Display */
          <div className="flex flex-col items-center justify-center w-full h-full max-w-2xl px-2">
            {/* Student Name Card */}
            <div
              className={`w-full flex flex-col items-center justify-center text-center p-4 sm:p-7 rounded-3xl border-2 transition-all duration-300 shadow-sm ${
                animating
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-700/50 scale-[1.02]'
                  : currentStudent
                    ? currentIsLight
                      ? 'bg-white border-indigo-200 text-slate-900'
                      : 'bg-zinc-900 border-indigo-500/30 text-white'
                    : currentIsLight
                      ? 'bg-white/60 border-slate-200/80 text-slate-400'
                      : 'bg-zinc-900/40 border-white/5 text-slate-500'
              }`}
            >
              {animating ? (
                /* Auswahlanimation */
                <div className="py-2 sm:py-4">
                  <span className="text-3xl sm:text-5xl animate-bounce block mb-1">
                    🙋
                  </span>
                  <span className="text-xl sm:text-4xl md:text-5xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
                    {animDisplayName || 'Mischen...'}
                  </span>
                </div>
              ) : currentStudent ? (
                /* Aufgerufenes Kind */
                <div className="py-1 sm:py-3 w-full">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                    Jetzt dran:
                  </span>
                  <h2
                    className={`font-black tracking-tight leading-tight px-2 break-words ${
                      isLargeOrFullscreen
                        ? 'text-5xl sm:text-6xl md:text-7xl'
                        : isSmallWidget
                          ? 'text-2xl sm:text-3xl'
                          : 'text-3xl sm:text-4xl'
                    }`}
                  >
                    {getDisplayStudentName(currentStudent, allStudents)}
                  </h2>

                  {/* Runde-Zähler */}
                  <div className="mt-2.5 flex items-center justify-center gap-1.5">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/5">
                      {calledCount} von {totalInRoundCount} Kindern aufgerufen
                    </span>
                  </div>
                </div>
              ) : (
                /* Noch kein Kind aufgerufen */
                <div className="py-3 sm:py-5">
                  <span className="text-3xl sm:text-4xl block mb-2 opacity-60">🎯</span>
                  <p className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Wer ist als Nächstes dran?
                  </p>
                  <p className="text-xs font-bold text-slate-400 mt-1">
                    Klicke unten auf „Nächstes Kind“ oder drücke Leertaste.
                  </p>
                </div>
              )}
            </div>

            {/* Letzte Aufrufe (Verlauf) */}
            {recentCalledStudents.length > 0 && !isSmallWidget && (
              <div className="flex items-center gap-1.5 mt-3 max-w-full overflow-x-auto no-scrollbar py-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1 shrink-0">
                  Vorher:
                </span>
                {recentCalledStudents.map((s) => (
                  <span
                    key={s.id}
                    className="text-[11px] font-bold px-2 py-0.5 rounded-lg border bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 shrink-0"
                  >
                    {getDisplayStudentName(s, allStudents)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM BAR: Big "Nächstes Kind" Action Button & Teacher Controls           */}
      {/* ========================================================================= */}
      <div className="shrink-0 pt-2.5 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300 rounded-full"
            style={{
              width: `${totalInRoundCount > 0 ? (calledCount / totalInRoundCount) * 100 : 0}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          {/* Zurücknehmen (Undo) */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={!currentId || animating}
            className={`min-h-[46px] px-3 sm:px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 ${
              currentIsLight
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300'
            }`}
            title="Letzte Auswahl rückgängig machen"
            aria-label="Letzte Auswahl zurück"
          >
            <Undo2 size={15} />
            <span className="hidden sm:inline">Zurück</span>
          </button>

          {/* Big "Nächstes Kind" Main Button */}
          <button
            type="button"
            onClick={handlePickNext}
            disabled={animating || isRoundComplete}
            className={`flex-1 min-h-[48px] sm:min-h-[52px] rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-98 ${
              isRoundComplete
                ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-600/20'
            }`}
            aria-label="Nächstes Kind aufrufen"
          >
            <Play size={18} className="fill-current" />
            <span>{animating ? 'Wählt aus...' : 'Nächstes Kind'}</span>
          </button>

          {/* Neue Runde Button (auch vorzeitig möglich) */}
          <button
            type="button"
            onClick={handleStartNewRound}
            className={`min-h-[46px] px-3 sm:px-4 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
              currentIsLight
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-300'
            }`}
            title="Neue faire Runde starten"
            aria-label="Neue Runde"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Neu</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROSTER MODAL / OVERLAY: Noch offen / Bereits dran / Pausieren            */}
      {/* ========================================================================= */}
      {showRosterModal && (
        <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-2 sm:p-4 animate-fade-in">
          <div className={`w-full max-h-[85%] flex flex-col rounded-3xl shadow-2xl border p-4 sm:p-5 overflow-hidden ${
            currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10'
          }`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-600" />
                <span className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Runden-Übersicht
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab Bar */}
            <div className="flex gap-1 p-1 my-3 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setRosterTab('remaining')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  rosterTab === 'remaining'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Noch offen ({eligibleRemainingIds.length})
              </button>
              <button
                type="button"
                onClick={() => setRosterTab('called')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  rosterTab === 'called'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Bereits dran ({calledCount})
              </button>
              <button
                type="button"
                onClick={() => setRosterTab('paused')}
                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  rosterTab === 'paused'
                    ? 'bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                Pausiert ({pausedIds.length})
              </button>
            </div>

            {/* List Content */}
            <div className="flex-grow overflow-y-auto no-scrollbar space-y-1.5 pr-1 min-h-[160px]">
              {rosterTab === 'remaining' && (
                eligibleRemainingIds.length > 0 ? (
                  eligibleRemainingIds.map((id) => {
                    const student = allStudents.find((s) => s.id === id);
                    if (!student) return null;
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                          currentIsLight ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-zinc-800/60 border-white/5 text-slate-200'
                        }`}
                      >
                        <span>{getDisplayStudentName(student, allStudents)}</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePause(id)}
                          className="px-2 py-1 text-[11px] font-bold rounded-lg border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                          title="Für diese Runde pausieren (z.B. WC, Förderkurs)"
                        >
                          Pausieren
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-bold text-center text-slate-400 py-6">
                    Keine Kinder mehr in dieser Runde offen.
                  </p>
                )
              )}

              {rosterTab === 'called' && (
                calledIds.length > 0 ? (
                  calledIds.map((id, idx) => {
                    const student = allStudents.find((s) => s.id === id);
                    if (!student) return null;
                    const isCurrent = id === currentId;
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                          isCurrent
                            ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200'
                            : currentIsLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-zinc-800/60 border-white/5 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 w-4 font-mono">{idx + 1}.</span>
                          <span>{getDisplayStudentName(student, allStudents)}</span>
                        </div>
                        {isCurrent && (
                          <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                            Aktuell
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-bold text-center text-slate-400 py-6">
                    Noch kein Kind in dieser Runde aufgerufen.
                  </p>
                )
              )}

              {rosterTab === 'paused' && (
                pausedIds.length > 0 ? (
                  pausedIds.map((id) => {
                    const student = allStudents.find((s) => s.id === id);
                    if (!student) return null;
                    return (
                      <div
                        key={id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                          currentIsLight ? 'bg-amber-50/60 border-amber-200 text-amber-900' : 'bg-amber-950/20 border-amber-900/40 text-amber-200'
                        }`}
                      >
                        <span>{getDisplayStudentName(student, allStudents)}</span>
                        <button
                          type="button"
                          onClick={() => handleTogglePause(id)}
                          className="px-2.5 py-1 text-[11px] font-black rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                        >
                          Wieder mitmachen
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs font-bold text-center text-slate-400 py-6">
                    Aktuell sind keine Kinder für diese Runde pausiert.
                  </p>
                )
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setShowRosterModal(false)}
                className="min-h-[40px] px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
