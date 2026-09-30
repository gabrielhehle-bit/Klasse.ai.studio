import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  Wind,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard, SMARTBOARD_PRIMARY_ACTION_CLASS, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  BreathingSettings,
  BreathingPhase,
  DEFAULT_BREATHING_SETTINGS,
  sanitizeBreathingSettings,
  calculateBreathingPhase,
  playBreathingChime,
  formatTimerSeconds,
} from '../../../lib/calmFocusEngine';
import {
  classifyMediaPlaybackError,
  getMediaPlaybackStatusMessage,
  isMediaPlaybackRetryable,
  MediaPlaybackStatus,
} from '../../../lib/mediaPlaybackState';

export interface BreathingWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const BreathingWidget: React.FC<BreathingWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('breathing', containerRef);

  // Settings sanitizen und laden
  const settings: BreathingSettings = useMemo(() => {
    return sanitizeBreathingSettings(widget.settings);
  }, [widget.settings]);

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedTotalSeconds, setElapsedTotalSeconds] = useState<number>(0);
  const [completedCycles, setCompletedCycles] = useState<number>(0);
  const [audioStatus, setAudioStatus] = useState<MediaPlaybackStatus>(
    settings.soundEnabled ? 'ready' : 'muted',
  );
  const audioResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setAudioStatus(settings.soundEnabled ? 'ready' : 'muted');
  }, [settings.soundEnabled]);

  useEffect(() => {
    return () => {
      if (audioResetTimeoutRef.current) {
        window.clearTimeout(audioResetTimeoutRef.current);
      }
    };
  }, []);

  // Settings aktualisieren & persistieren
  const updateSettings = useCallback((newSettings: BreathingSettings) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          ...newSettings,
        },
      });
    }
  }, [onUpdate, widget.settings]);

  // Dauer-Presets in Sekunden
  const durationOptions: { label: string; value: 30 | 60 | 120 | 'endless' }[] = [
    { label: '30s', value: 30 },
    { label: '1 Min', value: 60 },
    { label: '2 Min', value: 120 },
    { label: 'Endlos', value: 'endless' },
  ];

  // Rhythmus-Optionen
  const rhythmOptions: { label: string; value: '4-4' | '4-2-4' | '4-4-4' }[] = [
    { label: '4-4 (Sanft)', value: '4-4' },
    { label: '4-2-4 (Ruhe)', value: '4-2-4' },
    { label: '4-4-4 (Fokus)', value: '4-4-4' },
  ];

  // Berechne aktuelle Phase
  const currentPhaseState = useMemo(() => {
    return calculateBreathingPhase(elapsedTotalSeconds, settings.rhythm);
  }, [elapsedTotalSeconds, settings.rhythm]);

  const playBreathingSound = useCallback((phase: BreathingPhase): boolean => {
    if (!settings.soundEnabled) {
      setAudioStatus('muted');
      return false;
    }

    setAudioStatus('loading');

    try {
      const audioSupported =
        typeof window !== 'undefined' &&
        Boolean(window.AudioContext || (window as any).webkitAudioContext);

      if (!audioSupported) {
        setAudioStatus('unavailable');
        return false;
      }

      const didPlay = playBreathingChime(phase);
      if (!didPlay) {
        setAudioStatus('unavailable');
        return false;
      }

      setAudioStatus('playing');
      if (audioResetTimeoutRef.current) {
        window.clearTimeout(audioResetTimeoutRef.current);
      }
      audioResetTimeoutRef.current = window.setTimeout(() => {
        setAudioStatus('ready');
      }, 1800);
      return true;
    } catch (error) {
      const online = typeof navigator === 'undefined' ? null : navigator.onLine;
      setAudioStatus(classifyMediaPlaybackError(error, online));
      return false;
    }
  }, [settings.soundEnabled]);

  const prevPhaseRef = useRef<BreathingPhase>(currentPhaseState.phase);

  // Ton bei Phasenwechsel abspielen (falls aktiviert)
  useEffect(() => {
    if (isRunning && settings.soundEnabled && prevPhaseRef.current !== currentPhaseState.phase) {
      playBreathingSound(currentPhaseState.phase);
    }
    prevPhaseRef.current = currentPhaseState.phase;
  }, [currentPhaseState.phase, isRunning, playBreathingSound, settings.soundEnabled]);

  // Timer-Schleife (1x pro Sekunde)
  useEffect(() => {
    let intervalId: any = null;
    if (isRunning) {
      intervalId = setInterval(() => {
        setElapsedTotalSeconds((prev) => {
          const next = prev + 1;
          // Zähle Zyklen mit
          let cycleLen = 12;
          if (settings.rhythm === '4-4') cycleLen = 8;
          else if (settings.rhythm === '4-2-4') cycleLen = 10;
          if (next % cycleLen === 0) {
            setCompletedCycles((c) => c + 1);
          }

          // Prüfe, ob Dauer-Preset abgelaufen ist
          if (settings.durationPreset !== 'endless' && next >= settings.durationPreset) {
            setIsRunning(false);
          }

          return next;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRunning, settings.durationPreset, settings.rhythm]);

  const handleToggleRun = () => {
    if (!isRunning) {
      // Wenn bereits abgelaufen, neu starten
      if (settings.durationPreset !== 'endless' && elapsedTotalSeconds >= settings.durationPreset) {
        setElapsedTotalSeconds(0);
      }
      setIsRunning(true);
      if (settings.soundEnabled) {
        playBreathingSound('inhale');
      } else {
        setAudioStatus('muted');
      }
    } else {
      setIsRunning(false);
      setAudioStatus(settings.soundEnabled ? 'paused' : 'muted');
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedTotalSeconds(0);
    setCompletedCycles(0);
    setAudioStatus(settings.soundEnabled ? 'ready' : 'muted');
  };

  const handleSelectPreset = (preset: 30 | 60 | 120 | 'endless') => {
    updateSettings({
      ...settings,
      durationPreset: preset,
    });
  };

  const handleSelectRhythm = (rhythm: '4-4' | '4-2-4' | '4-4-4') => {
    updateSettings({
      ...settings,
      rhythm,
    });
  };

  const handleToggleSound = () => {
    const nextSoundEnabled = !settings.soundEnabled;
    updateSettings({
      ...settings,
      soundEnabled: nextSoundEnabled,
    });

    if (audioResetTimeoutRef.current) {
      window.clearTimeout(audioResetTimeoutRef.current);
      audioResetTimeoutRef.current = null;
    }

    if (!nextSoundEnabled) {
      setAudioStatus('muted');
      return;
    }

    const audioSupported =
      typeof window !== 'undefined' &&
      Boolean(window.AudioContext || (window as any).webkitAudioContext);
    setAudioStatus(audioSupported ? 'ready' : 'unavailable');
  };

  const handleRetryAudio = () => {
    if (isRunning && settings.soundEnabled) {
      playBreathingSound(currentPhaseState.phase);
      return;
    }

    const audioSupported =
      typeof window !== 'undefined' &&
      Boolean(window.AudioContext || (window as any).webkitAudioContext);
    setAudioStatus(settings.soundEnabled && audioSupported ? 'ready' : 'unavailable');
  };

  // Verbleibende Gesamtzeit
  const remainingTotalSeconds = useMemo(() => {
    if (settings.durationPreset === 'endless') return null;
    return Math.max(0, settings.durationPreset - elapsedTotalSeconds);
  }, [settings.durationPreset, elapsedTotalSeconds]);

  // Farb- und Stilkonfiguration je Phase
  const phaseTheme = useMemo(() => {
    switch (currentPhaseState.phase) {
      case 'inhale':
        return {
          color: 'from-teal-400 to-emerald-500',
          textColor: 'text-teal-600 dark:text-teal-400',
          glow: 'rgba(20, 184, 166, 0.25)',
          icon: '🍃',
        };
      case 'hold':
        return {
          color: 'from-amber-400 to-orange-500',
          textColor: 'text-amber-600 dark:text-amber-400',
          glow: 'rgba(245, 158, 11, 0.25)',
          icon: '✨',
        };
      case 'exhale':
        return {
          color: 'from-sky-400 to-indigo-500',
          textColor: 'text-sky-600 dark:text-sky-400',
          glow: 'rgba(14, 165, 233, 0.25)',
          icon: '💨',
        };
      case 'rest':
      default:
        return {
          color: 'from-slate-400 to-slate-500',
          textColor: 'text-slate-600 dark:text-slate-400',
          glow: 'rgba(148, 163, 184, 0.2)',
          icon: '🧘',
        };
    }
  }, [currentPhaseState.phase]);

  // Dynamische Kreisgröße je nach View-Größe
  const circleBaseSize = useMemo(() => {
    if (size.category === 'fullscreen') return 260;
    if (size.category === 'large') return 180;
    if (size.category === 'compact') return 120;
    return 140; // standard
  }, [size.category]);

  return (
    <div
      ref={containerRef}
      id={`breathing-widget-${widget.id}`}
      className={`w-full h-full flex flex-col justify-between select-none overflow-hidden ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      } ${
        size.category === 'compact'
          ? 'p-2.5 text-xs'
          : size.category === 'large'
          ? 'p-4 text-sm'
          : size.category === 'fullscreen'
          ? 'p-6 text-base max-w-4xl mx-auto'
          : 'p-3 text-xs'
      }`}
    >
      {/* 1. Header: Titel, Ton-Schalter & Zyklenzähler */}
      <div className="flex items-center justify-between shrink-0 mb-1 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-500 flex items-center justify-center shrink-0 text-base">
            🍃
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm truncate">Atempause</h2>
            <p className="text-[11px] opacity-70 truncate">
              Ruhige Atemübung für die Klasse
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {completedCycles > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {completedCycles} {completedCycles === 1 ? 'Zyklus' : 'Zyklen'}
            </span>
          )}

          {/* Stummschalt-Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={settings.soundEnabled ? "Ton ausschalten" : "Ton einschalten"}
            title={settings.soundEnabled ? "Ton aktiv" : "Stumm"}
            style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
            className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
              settings.soundEnabled
                ? 'bg-teal-500/15 text-teal-600 border-teal-300 dark:border-teal-700'
                : currentIsLight
                ? 'bg-slate-100 text-slate-400 border-slate-200'
                : 'bg-zinc-800 text-zinc-500 border-zinc-700'
            }`}
          >
            {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-between gap-2 text-[10px] opacity-80"
      >
        <span>{getMediaPlaybackStatusMessage(audioStatus, 'Ton')}</span>
        {isMediaPlaybackRetryable(audioStatus) && (
          <button
            type="button"
            onClick={handleRetryAudio}
            style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
            className="rounded-lg px-2 text-[10px] font-bold underline underline-offset-2 cursor-pointer"
          >
            Erneut aktivieren
          </button>
        )}
      </div>

      {/* 2. Hauptbereich: Zentraler Atemkreis mit animierter Ausdehnung */}
      <div className="flex-grow flex flex-col items-center justify-center min-h-0 relative my-auto py-2">
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: `${circleBaseSize}px`, height: `${circleBaseSize}px` }}
        >
          {/* Sanfter äußerer Aura-Glow */}
          <div
            className="absolute rounded-full transition-transform duration-1000 ease-out"
            style={{
              width: `${circleBaseSize * 0.75}px`,
              height: `${circleBaseSize * 0.75}px`,
              transform: `scale(${isRunning ? currentPhaseState.scale * 1.25 : 1})`,
              boxShadow: isRunning ? `0 0 40px ${phaseTheme.glow}` : 'none',
              opacity: isRunning ? 0.6 : 0.2,
            }}
          />

          {/* Hauptkreis mit Farbverlauf */}
          <div
            className={`absolute rounded-full transition-transform duration-1000 ease-out bg-gradient-to-tr ${phaseTheme.color} shadow-lg opacity-85 border border-white/20`}
            style={{
              width: `${circleBaseSize * 0.65}px`,
              height: `${circleBaseSize * 0.65}px`,
              transform: `scale(${isRunning ? currentPhaseState.scale : 1})`,
            }}
          />

          {/* Zentrale Textanzeige (bleibt stabil im Kreis) */}
          <div
            className={`relative z-10 rounded-full flex flex-col items-center justify-center text-center p-2 border backdrop-blur-md shadow-md ${
              currentIsLight
                ? 'bg-white/90 border-slate-200/60 text-slate-800'
                : 'bg-zinc-950/80 border-white/10 text-white'
            }`}
            style={{
              width: `${circleBaseSize * 0.52}px`,
              height: `${circleBaseSize * 0.52}px`,
            }}
          >
            {isRunning ? (
              <>
                <span className={`font-black uppercase tracking-wider leading-none text-xs sm:text-sm ${phaseTheme.textColor}`}>
                  {currentPhaseState.phaseLabel}
                </span>
                <span className="font-mono font-black text-xl sm:text-2xl mt-1 tabular-nums leading-none">
                  {currentPhaseState.phaseSecondsLeft}s
                </span>
                <span className="text-sm mt-0.5">{phaseTheme.icon}</span>
              </>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-xl">🍃</span>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                  Bereit
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Kurze, kindgerechte Begleitanweisung */}
        <p className="mt-2 text-center text-xs font-semibold opacity-80 min-h-4 px-2 max-w-xs truncate">
          {isRunning ? currentPhaseState.phaseInstruction : 'Klicke auf Start für eine gemeinsame Atempause'}
        </p>

        {/* Verbleibende Gesamtzeit falls Timer aktiv */}
        {remainingTotalSeconds !== null && isRunning && (
          <div className="mt-1 flex items-center gap-1 font-mono text-[11px] opacity-70">
            <Clock size={11} />
            <span>Noch {formatTimerSeconds(remainingTotalSeconds)}</span>
          </div>
        )}
      </div>

      {/* 3. Steuerleiste: Start/Pause, Dauerwahl & Rhythmus */}
      <div className="shrink-0 flex flex-col gap-2 mt-1">
        {/* Haupt-Buttons: Start/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id={`breathing-toggle-btn-${widget.id}`}
            onClick={handleToggleRun}
            style={{ minHeight: `${TOUCH_TARGET_MIN}px` }}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm text-sm ${
              isRunning
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : SMARTBOARD_PRIMARY_ACTION_CLASS
            }`}
          >
            {isRunning ? (
              <>
                <Pause size={16} className="fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play size={16} className="fill-current" />
                <span>{elapsedTotalSeconds > 0 ? 'Fortsetzen' : 'Atempause starten'}</span>
              </>
            )}
          </button>

          {(isRunning || elapsedTotalSeconds > 0) && (
            <button
              type="button"
              onClick={handleReset}
              title="Zurücksetzen"
              aria-label="Atempause zurücksetzen"
              style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                currentIsLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                  : 'bg-zinc-800 border-zinc-700 text-slate-300 hover:bg-zinc-700'
              }`}
            >
              <RotateCcw size={15} />
            </button>
          )}
        </div>

        {/* Dauer-Presets & Rhythmus (in STANDARD/LARGE/FULLSCREEN oder aufklappbar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] pt-1 border-t border-slate-100 dark:border-white/5">
          {/* Dauer */}
          <div className="flex items-center gap-2">
            <span className="opacity-60 text-[10px] font-semibold">Dauer:</span>
            {durationOptions.map((opt) => {
              const isSelected = settings.durationPreset === opt.value;
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => handleSelectPreset(opt.value)}
                  style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    isSelected
                      ? 'bg-accent text-accent-text font-bold'
                      : currentIsLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Rhythmus (nur bei Standard / Large / Fullscreen) */}
          {size.category !== 'compact' && (
            <div className="flex items-center gap-1">
              <span className="opacity-60 text-[10px] font-semibold">Muster:</span>
              {rhythmOptions.map((r) => {
                const isSelected = settings.rhythm === r.value;
                return (
                  <button
                    key={r.value}
                     type="button"
                     aria-pressed={isSelected}
                    onClick={() => handleSelectRhythm(r.value)}
                     style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-accent text-accent-text font-bold'
                        : currentIsLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
