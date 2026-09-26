import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Play, Pause, RotateCcw, Flag, Check, X, MoreHorizontal } from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  StopwatchSettings,
  StopwatchStatus,
  StopwatchLap,
  DEFAULT_STOPWATCH_SETTINGS,
  calculateElapsedTime,
  formatStopwatchTime,
  startStopwatch,
  pauseStopwatch,
  resumeStopwatch,
  resetStopwatch,
  recordLap,
  calculateLapStats,
} from '../../../lib/stopwatchAlgorithm';

export interface StopwatchWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const StopwatchWidget: React.FC<StopwatchWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('StopwatchWidget', containerRef);

  // Settings aus widget.settings initialisieren
  const initialSettings = useMemo<StopwatchSettings>(() => {
    const s = widget?.settings || {};
    return {
      status: (s.status as StopwatchStatus) || DEFAULT_STOPWATCH_SETTINGS.status,
      startTimestamp: typeof s.startTimestamp === 'number' ? s.startTimestamp : null,
      accumulatedElapsed: typeof s.accumulatedElapsed === 'number' ? s.accumulatedElapsed : 0,
      laps: Array.isArray(s.laps) ? s.laps : [],
      showDecimals: typeof s.showDecimals === 'boolean' ? s.showDecimals : false,
    };
  }, [widget?.settings]);

  const [state, setState] = useState<StopwatchSettings>(initialSettings);
  const stateRef = useRef<StopwatchSettings>(initialSettings);
  stateRef.current = state;

  // Lokaler Zeitwert für Rendering (Millisekunden)
  const [elapsedMs, setElapsedMs] = useState<number>(() =>
    calculateElapsedTime(initialSettings, Date.now())
  );

  // Bestätigungsstatus für Reset (Schutz vor versehentlichem Löschen)
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Kompakt-Toggle für Rundenliste bei schmalen Höhen / COMPACT
  const [showCompactLaps, setShowCompactLaps] = useState(false);
  const hasExternalSettingsControl = typeof onCloseSettings === 'function';

  // Persistenz-Funktion (NUR bei Benutzeraktionen: Start, Pause, Runde, Reset, Unmount)
  const persistState = useCallback(
    (newState: StopwatchSettings) => {
      if (!onUpdate) return;
      onUpdate({
        settings: {
          ...widget?.settings,
          status: newState.status,
          startTimestamp: newState.startTimestamp,
          accumulatedElapsed: newState.accumulatedElapsed,
          laps: newState.laps,
          showDecimals: newState.showDecimals,
        },
      });
    },
    [onUpdate, widget?.settings]
  );

  // Drift-freier Zeit-Loop mit reduzierter Update-Frequenz (ca. 8–10 FPS, absolut berechnet)
  useEffect(() => {
    if (state.status !== 'running') {
      setElapsedMs(state.accumulatedElapsed);
      return;
    }

    const intervalMs = state.showDecimals ? 100 : 125;
    const interval = setInterval(() => {
      setElapsedMs(calculateElapsedTime(stateRef.current, Date.now()));
    }, intervalMs);

    // Bei Tab-Wechsel / Standby sofort synchronisieren
    const handleSync = () => {
      setElapsedMs(calculateElapsedTime(stateRef.current, Date.now()));
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('blur', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('blur', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [state.status, state.showDecimals]);

  // Synchronisation bei externen Updates (z. B. Vollbild-Öffnen/Schließen nutzt dieselben Settings)
  useEffect(() => {
    setState((prev) => {
      const s = widget?.settings || {};
      const newStatus = (s.status as StopwatchStatus) || DEFAULT_STOPWATCH_SETTINGS.status;
      const newStartTimestamp = typeof s.startTimestamp === 'number' ? s.startTimestamp : null;
      const newAccumulated = typeof s.accumulatedElapsed === 'number' ? s.accumulatedElapsed : 0;
      const newLaps = Array.isArray(s.laps) ? s.laps : [];
      const newDecimals = typeof s.showDecimals === 'boolean' ? s.showDecimals : false;

      // Wenn keine Änderung, State beibehalten
      if (
        prev.status === newStatus &&
        prev.startTimestamp === newStartTimestamp &&
        prev.accumulatedElapsed === newAccumulated &&
        prev.laps.length === newLaps.length &&
        prev.showDecimals === newDecimals
      ) {
        return prev;
      }

      const nextState: StopwatchSettings = {
        status: newStatus,
        startTimestamp: newStartTimestamp,
        accumulatedElapsed: newAccumulated,
        laps: newLaps,
        showDecimals: newDecimals,
      };
      setElapsedMs(calculateElapsedTime(nextState, Date.now()));
      return nextState;
    });
  }, [widget?.settings]);

  // Auto-Persist beim Unmounten (falls im laufenden Betrieb geschlossen wird)
  useEffect(() => {
    return () => {
      if (stateRef.current.status === 'running') {
        persistState(stateRef.current);
      }
    };
  }, [persistState]);

  // AKTION: Start
  const handleStart = useCallback(() => {
    setConfirmingReset(false);
    const now = Date.now();
    const next = startStopwatch(stateRef.current, now);
    setState(next);
    setElapsedMs(calculateElapsedTime(next, now));
    persistState(next);
  }, [persistState]);

  // AKTION: Pause
  const handlePause = useCallback(() => {
    setConfirmingReset(false);
    const now = Date.now();
    const next = pauseStopwatch(stateRef.current, now);
    setState(next);
    setElapsedMs(next.accumulatedElapsed);
    persistState(next);
  }, [persistState]);

  // AKTION: Fortsetzen
  const handleResume = useCallback(() => {
    setConfirmingReset(false);
    const now = Date.now();
    const next = resumeStopwatch(stateRef.current, now);
    setState(next);
    setElapsedMs(calculateElapsedTime(next, now));
    persistState(next);
  }, [persistState]);

  // AKTION: Runde
  const handleLap = useCallback(() => {
    if (stateRef.current.status !== 'running') return;
    const now = Date.now();
    const next = recordLap(stateRef.current, now);
    setState(next);
    persistState(next);
  }, [persistState]);

  // AKTION: Reset
  const handleResetRequest = useCallback(() => {
    const current = stateRef.current;
    const totalElapsed = calculateElapsedTime(current, Date.now());

    // Wenn ohnehin 0 und keine Runden: direkt zurücksetzen ohne Nachfrage
    if (totalElapsed === 0 && current.laps.length === 0) {
      const next = resetStopwatch(true, current.showDecimals);
      setState(next);
      setElapsedMs(0);
      setConfirmingReset(false);
      persistState(next);
      return;
    }

    // Wenn Zeit oder Runden vorhanden sind: Sicherheitsabfrage aktivieren
    setConfirmingReset(true);
  }, [persistState]);

  const handleConfirmReset = useCallback(() => {
    const next = resetStopwatch(true, stateRef.current.showDecimals);
    setState(next);
    setElapsedMs(0);
    setConfirmingReset(false);
    setShowCompactLaps(false);
    persistState(next);
  }, [persistState]);

  const handleCancelReset = useCallback(() => {
    setConfirmingReset(false);
  }, []);

  // AKTION: Zehntelsekunden umschalten
  const toggleDecimals = useCallback(() => {
    const next: StopwatchSettings = {
      ...stateRef.current,
      showDecimals: !stateRef.current.showDecimals,
    };
    setState(next);
    persistState(next);
  }, [persistState]);

  // KEYBOARD CONTROLS (Space: Start/Pause/Resume, L: Lap, R: Reset)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Eingabefelder ignorieren
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('role') === 'textbox')
      ) {
        return;
      }

      // Prüfen ob Widget oder Kind fokussiert ist oder Cursor im Container weilt
      if (!containerRef.current) return;
      const isFocusedInside =
        containerRef.current.contains(document.activeElement) ||
        containerRef.current.matches(':hover');

      if (!isFocusedInside && !isFullscreen) return;

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (stateRef.current.status === 'running') {
          handlePause();
        } else if (stateRef.current.status === 'paused') {
          handleResume();
        } else {
          handleStart();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        if (stateRef.current.status === 'running') {
          e.preventDefault();
          handleLap();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (stateRef.current.status !== 'running') {
          e.preventDefault();
          if (confirmingReset) {
            handleConfirmReset();
          } else {
            handleResetRequest();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isFullscreen,
    confirmingReset,
    handlePause,
    handleResume,
    handleStart,
    handleLap,
    handleResetRequest,
    handleConfirmReset,
  ]);

  // Formatierte Zeit
  const formatted = useMemo(
    () =>
      formatStopwatchTime(elapsedMs, {
        showDecimals: state.showDecimals,
      }),
    [elapsedMs, state.showDecimals]
  );

  // Runden-Statistiken (erst ab 2 Runden aktiv)
  const lapStats = useMemo(() => calculateLapStats(state.laps), [state.laps]);

  // Runden in umgekehrter Reihenfolge (neueste Runde oben)
  const reversedLaps = useMemo(() => [...state.laps].reverse(), [state.laps]);

  // Responsiver Aufbau nach F-UI Standard
  const isCompact = size.isCompact;
  const isLarge = size.isLarge;
  const isFullscreenMode = size.category === 'fullscreen' || isFullscreen;
  const isShort = size.isShort;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Stoppuhr"
      className={`relative flex flex-col w-full h-full min-h-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors ${isCompact ? 'p-1.5' : 'p-3'} ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className="absolute inset-2 z-30 flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-white/10 dark:bg-zinc-900 dark:text-slate-100">
          <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-white/10">
            <div>
              <h3 className="text-sm font-black">Stoppuhr einstellen</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Anzeige und Bedienhinweise</p>
            </div>
            <button
              type="button"
              onClick={() => onCloseSettings?.()}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Stoppuhr-Einstellungen schließen"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            <button
              type="button"
              onClick={toggleDecimals}
              aria-pressed={state.showDecimals}
              className={state.showDecimals
                ? "flex min-h-11 w-full items-center justify-between rounded-xl border border-accent bg-accent-soft px-3 text-sm font-bold text-accent"
                : "flex min-h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-zinc-800 dark:text-slate-200 dark:hover:bg-zinc-700"}
            >
              <span>Zehntelsekunden anzeigen</span>
              <span className="font-mono">{state.showDecimals ? '0.1 s ✓' : 'Aus'}</span>
            </button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <p className="mb-2 font-black text-slate-800 dark:text-slate-100">Tastaturkürzel</p>
              <p><strong>Leertaste</strong> · Start / Pause / Weiter</p>
              <p><strong>L</strong> · Runde speichern</p>
              <p><strong>R</strong> · Zurücksetzen, wenn die Uhr nicht läuft</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCloseSettings?.()}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-black text-accent-text hover:bg-accent-hover"
          >
            Fertig
          </button>
        </div>
      )}
      {/* -------------------------------------------------------- */}
      {/* OBERER BEREICH: Zeitanzeige (Groß, zentriert, ruhig) */}
      {/* -------------------------------------------------------- */}
      <div className={`shrink-0 flex flex-col items-center justify-center ${isCompact ? 'pt-0 pb-1' : 'pt-1 pb-2'}`}>
        {/* Hauptzeitanzeige (MM:SS oder HH:MM:SS) */}
        <div
          className={`font-mono font-black tabular-nums tracking-tight transition-all text-center leading-none ${
            isFullscreenMode
              ? 'text-7xl sm:text-8xl md:text-9xl py-4'
              : isLarge
                ? 'text-6xl py-2'
                : isCompact
                  ? 'text-5xl py-0.5'
                  : 'text-5xl py-1.5'
          } ${
            state.status === 'running'
              ? currentIsLight
                ? 'text-accent'
                : 'text-accent'
              : state.status === 'paused'
                ? currentIsLight
                  ? 'text-amber-600'
                  : 'text-amber-400'
                : currentIsLight
                  ? 'text-slate-800'
                  : 'text-slate-100'
          }`}
        >
          {formatted.hasHours && (
            <span>{formatted.hours}:</span>
          )}
          <span>{formatted.minutes}</span>
          <span>:</span>
          <span>{formatted.seconds}</span>
          {state.showDecimals && formatted.decimals && (
            <span
              className={`text-0.6em opacity-75 ml-1 ${
                currentIsLight ? 'text-accent' : 'text-accent'
              }`}
            >
              .{formatted.decimals}
            </span>
          )}
        </div>

        {/* Status-Badge & Zehntel-Umschalter */}
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              state.status === 'running'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : state.status === 'paused'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-500/15 text-slate-500 dark:text-slate-400'
            }`}
          >
            {state.status === 'running'
              ? 'Läuft'
              : state.status === 'paused'
                ? 'Pausiert'
                : 'Bereit'}
          </span>

          {/* Fallback außerhalb des gemeinsamen Cockpit-Rahmens */}
          {!hasExternalSettingsControl && (
            <button
              type="button"
              onClick={toggleDecimals}
              title={state.showDecimals ? 'Zehntel ausblenden' : 'Zehntelsekunden einblenden'}
              className={state.showDecimals
                ? "min-h-11 rounded-xl border border-accent bg-accent-soft px-3 text-xs font-bold text-accent"
                : "min-h-11 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-500 hover:bg-slate-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-slate-400 dark:hover:bg-zinc-700"}
            >
              {state.showDecimals ? '0.1 s an' : '0.1 s aus'}
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* HAUPT-STEUERUNG: Buttons (Dominant, min. 44px Touch) */}
      {/* -------------------------------------------------------- */}
      <div className={`shrink-0 flex items-center justify-center w-full ${isCompact ? 'gap-1 py-1' : 'gap-2 py-2'}`}>
        {/* FALL 1: Bestätigungsmodus für Reset */}
        {confirmingReset ? (
          <div className="flex items-center gap-2 w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={handleConfirmReset}
              className="flex-1 flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Check size={16} />
              <span>Auf 00:00 zurücksetzen</span>
            </button>
            <button
              type="button"
              onClick={handleCancelReset}
              className={`flex items-center justify-center h-11 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                currentIsLight
                  ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  : 'bg-zinc-800 border-zinc-700 text-slate-300 hover:bg-zinc-700'
              }`}
            >
              <X size={16} />
              <span>Abbrechen</span>
            </button>
          </div>
        ) : (
          /* FALL 2: Reguläre Steuerungs-Buttons */
          <div className="flex items-center justify-center gap-2 w-full max-w-md">
            {/* START / PAUSE / WEITER (Dominante Primäraktion) */}
            {state.status === 'ready' && (
              <button
                type="button"
                onClick={handleStart}
                className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-sm font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Play size={18} fill="currentColor" />
                <span>Start</span>
              </button>
            )}

            {state.status === 'running' && (
              <>
                {/* RUNDEN-BUTTON: Nur aktiv, wenn Stoppuhr läuft */}
                <button
                  type="button"
                  onClick={handleLap}
                  className={`flex-1 flex items-center justify-center gap-2 h-11 px-3 rounded-xl border text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                    currentIsLight
                      ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800'
                      : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-slate-100'
                  }`}
                >
                  <Flag size={15} />
                  <span>Runde</span>
                </button>

                {/* PAUSE-BUTTON (Dominant während des Laufs) */}
                <button
                  type="button"
                  onClick={handlePause}
                  className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-sm font-bold shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Pause size={18} fill="currentColor" />
                  <span>Pause</span>
                </button>
              </>
            )}

            {state.status === 'paused' && (
              <>
                {/* ZURÜCKSETZEN-BUTTON */}
                <button
                  type="button"
                  onClick={handleResetRequest}
                  className={`flex-1 flex items-center justify-center gap-1.5 h-11 px-3 rounded-xl border text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                    currentIsLight
                      ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 border-slate-200 text-slate-700'
                      : 'bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800 border-zinc-700 text-slate-300'
                  }`}
                >
                  <RotateCcw size={15} />
                  <span>Reset</span>
                </button>

                {/* FORTSETZEN-BUTTON (Dominant bei Pause) */}
                <button
                  type="button"
                  onClick={handleResume}
                  className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-sm font-bold shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Weiter</span>
                </button>
              </>
            )}

            {/* RESET-BUTTON wenn im Zustand 'ready', aber noch Runden oder abgelaufene Zeit vorliegen */}
            {state.status === 'ready' && (state.accumulatedElapsed > 0 || state.laps.length > 0) && (
              <button
                type="button"
                onClick={handleResetRequest}
                title="Zurücksetzen"
                className={`flex items-center justify-center h-11 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentIsLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-slate-400'
                }`}
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* -------------------------------------------------------- */}
      {/* RUNDEN-STATISTIK (Schnellste / Langsamste / Schnitt) */}
      {/* Nur in LARGE oder FULLSCREEN sichtbar und erst ab 2 Runden */}
      {/* -------------------------------------------------------- */}
      {(isLarge || isFullscreenMode) && state.laps.length >= 2 && !isShort && (
        <div
          className={`shrink-0 flex items-center justify-around gap-2 px-3 py-1.5 my-1 rounded-xl text-[10px] font-bold border ${
            currentIsLight
              ? 'bg-slate-50 border-slate-200/80 text-slate-600'
              : 'bg-zinc-800/60 border-zinc-700 text-slate-300'
          }`}
        >
          {lapStats.fastestLap && (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="opacity-80 font-normal">⚡ Schnellste:</span>
              <span className="font-mono font-black">
                R{lapStats.fastestLap.lapNumber} (
                {formatStopwatchTime(lapStats.fastestLap.lapTimeMs, { showDecimals: state.showDecimals }).timeString})
              </span>
            </div>
          )}

          {lapStats.slowestLap && (
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="opacity-80 font-normal">🐢 Langsamste:</span>
              <span className="font-mono font-black">
                R{lapStats.slowestLap.lapNumber} (
                {formatStopwatchTime(lapStats.slowestLap.lapTimeMs, { showDecimals: state.showDecimals }).timeString})
              </span>
            </div>
          )}

          {lapStats.averageMs > 0 && (
            <div className="flex items-center gap-1 opacity-70">
              <span className="font-normal">⌀ Schnitt:</span>
              <span className="font-mono font-bold">
                {formatStopwatchTime(lapStats.averageMs, { showDecimals: state.showDecimals }).timeString}
              </span>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* RUNDENLISTE: Scrollbar, sauber formatiert */}
      {/* -------------------------------------------------------- */}
      {state.laps.length > 0 && (
        <div className="flex-1 flex flex-col min-h-0 mt-1">
          {/* Header Rundenliste (in COMPACT mit Ein-/Ausklapp-Möglichkeit) */}
          <div className="flex items-center justify-between pb-1 px-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>
              Runden ({state.laps.length}
              {state.laps.length >= 50 ? ' / Max' : ''})
            </span>
            {isCompact && (
              <button
                type="button"
                onClick={() => setShowCompactLaps(!showCompactLaps)}
                className="min-h-11 rounded-lg px-2 text-accent hover:bg-accent-soft cursor-pointer lowercase"
              >
                {showCompactLaps ? 'einklappen' : 'anzeigen'}
              </button>
            )}
          </div>

          {/* Rundenliste Container */}
          {(!isCompact || showCompactLaps) && (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-1 pr-0.5 elegant-scrollbar">
              {reversedLaps.map((lap) => {
                const isFastest = lapStats.fastestLap?.id === lap.id;
                const isSlowest = lapStats.slowestLap?.id === lap.id;

                return (
                  <div
                    key={lap.id}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                      isFastest
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                        : isSlowest
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                          : currentIsLight
                            ? 'bg-slate-50 border-slate-200/60 text-slate-700'
                            : 'bg-zinc-800/40 border-zinc-700/60 text-slate-300'
                    }`}
                  >
                    {/* Linke Seite: Rundennummer + Indikatoren */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-[11px] tracking-tight">
                        Runde {lap.lapNumber}
                      </span>
                      {isFastest && (
                        <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                          ⚡ Schnell
                        </span>
                      )}
                      {isSlowest && (
                        <span className="text-[9px] px-1 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold uppercase">
                          🐢 Langsam
                        </span>
                      )}
                    </div>

                    {/* Rechte Seite: Einzelzeit (dominant) + Gesamtzeit (dezent) */}
                    <div className="flex flex-col items-end">
                      <span className="font-bold font-mono">
                        {formatStopwatchTime(lap.lapTimeMs, { showDecimals: state.showDecimals }).timeString}
                      </span>
                      <span className="text-[9px] opacity-50 font-normal font-mono">
                        Gesamt: {formatStopwatchTime(lap.overallTimeMs, { showDecimals: state.showDecimals }).timeString}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Im COMPACT Modus wenn eingeklappt: Vorschau auf die letzte Runde */}
          {isCompact && !showCompactLaps && reversedLaps.length > 0 && (
            <div
              className={`shrink-0 flex items-center justify-between px-2 py-1 rounded-md text-[11px] font-mono border ${
                currentIsLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                  : 'bg-zinc-800 border-zinc-700 text-slate-300'
              }`}
            >
              <span className="font-semibold">Letzte Runde {reversedLaps[0].lapNumber}:</span>
              <span className="font-bold">
                {formatStopwatchTime(reversedLaps[0].lapTimeMs, { showDecimals: state.showDecimals }).timeString}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Wenn keine Runden und nicht im Reset-Modus: Dezente Tasten-Tipps in LARGE / FULLSCREEN */}
      {state.laps.length === 0 && (isLarge || isFullscreenMode) && !isShort && (
        <div className="flex-1 flex items-center justify-center text-[11px] text-slate-400 opacity-60">
          <span>Leertaste = Start/Pause &bull; L = Runde &bull; R = Reset</span>
        </div>
      )}
    </div>
  );
};
