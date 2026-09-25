import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Plus, Minus,
  Clock, Check, Settings2, RefreshCw, MoreHorizontal, X
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { MAX_CLASS_TIMER_SECONDS, normalizeClassTimerSeconds, classTimerOwnsShortcut } from '../../../lib/classTimerInput';

export interface TimerWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  showSettings?: boolean;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
}

type TimerStatus = 'ready' | 'running' | 'paused' | 'expired';
type VisualMode = 'ring' | 'progress' | 'minimal';
type AlarmSound = 'bell' | 'bowl' | 'beep';

const PRESET_LIST = [
  { label: '1 Min', shortLabel: '1m', seconds: 60 },
  { label: '2 Min', shortLabel: '2m', seconds: 120 },
  { label: '5 Min', shortLabel: '5m', seconds: 300 },
  { label: '10 Min', shortLabel: '10m', seconds: 600 },
  { label: '15 Min', shortLabel: '15m', seconds: 900 },
  { label: '20 Min', shortLabel: '20m', seconds: 1200 },
];

export const TimerWidget: React.FC<TimerWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  showSettings: externalShowSettings,
  onOpenSettings,
  onCloseSettings,
}) => {
  const { setApp } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('TimerWidget', containerRef);

  // Settings from widget.settings
  const savedSettings = widget.settings || {};
  const defaultDuration = typeof savedSettings.preferredDuration === 'number' && Number.isInteger(savedSettings.preferredDuration) && savedSettings.preferredDuration >= 1 && savedSettings.preferredDuration <= MAX_CLASS_TIMER_SECONDS ? savedSettings.preferredDuration : 300;
  const initialVisualMode: VisualMode = savedSettings.visualMode || 'ring';
  const initialAlarmSound: AlarmSound = savedSettings.alarmSound || 'bell';
  const initialIsMuted: boolean = savedSettings.isMuted ?? false;

  // Local state
  const [initialSeconds, setInitialSeconds] = useState<number>(defaultDuration);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(defaultDuration);
  const [status, setStatus] = useState<TimerStatus>('ready');
  const [endTimestamp, setEndTimestamp] = useState<number | null>(null);

  const [visualMode, setVisualMode] = useState<VisualMode>(initialVisualMode);
  const [alarmSound, setAlarmSound] = useState<AlarmSound>(initialAlarmSound);
  const [isMuted, setIsMuted] = useState<boolean>(initialIsMuted);

  // Overlays / Popovers
  const [isCustomTimeOpen, setIsCustomTimeOpen] = useState(false);
  const [customMinInput, setCustomMinInput] = useState('5');
  const [customSecInput, setCustomSecInput] = useState('0');
  const [customTimeError, setCustomTimeError] = useState('');
  const [localShowSettings, setLocalShowSettings] = useState(false);
  const showSettings = externalShowSettings ?? localShowSettings;
  const setShowSettings = (open: boolean) => {
    if (externalShowSettings === undefined) setLocalShowSettings(open);
    else if (open) onOpenSettings?.();
    else onCloseSettings?.();
  };
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Audio Context
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hasAlarmTriggeredRef = useRef(false);

  const persistSettings = useCallback((updates: Record<string, any>) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          ...updates,
        },
      });
    }
  }, [onUpdate, widget.settings]);

  // Audio Engine: Pure Web Audio API (100% offline, leak-free)
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const playAlarmSound = useCallback((soundType: AlarmSound) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (soundType === 'bowl') {
        const freqs = [261.63, 523.25, 784.88];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq + (idx * 0.75), now);
          const volume = idx === 0 ? 0.35 : 0.15 / idx;
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(volume, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 3.5);
        });
      } else if (soundType === 'beep') {
        [0, 0.18].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(idx === 0 ? 880 : 1046.5, now + delay);
          gain.gain.setValueAtTime(0.001, now + delay);
          gain.gain.linearRampToValueAtTime(0.22, now + delay + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.35);
        });
      } else {
        const partials = [1, 1.25, 1.5, 2, 2.5, 3];
        const baseFreq = 392;
        partials.forEach((p, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(baseFreq * p + (idx === 0 ? 0 : (idx % 2 === 0 ? 1.5 : -1.5)), now);
          const vol = 0.28 / (idx + 1);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(vol, now + 0.02);
          const decay = 2.8 / (p * 0.7);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + decay);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + decay);
        });
      }
    } catch {
      // Graceful fallback
    }
  }, [getAudioContext, isMuted]);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close().catch(() => {});
        } catch {}
        audioCtxRef.current = null;
      }
    };
  }, []);

  const syncToBoardSettings = useCallback((running: boolean, end: number | null, total: number) => {
    setApp((prev) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: running,
        timerEnd: end ?? undefined,
        timerTotal: total,
      },
    }));
  }, [setApp]);

  // High-precision Tick Engine
  useEffect(() => {
    if (status !== 'running' || !endTimestamp) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((endTimestamp - now) / 1000));
      setRemainingSeconds(diff);

      if (diff === 0) {
        setStatus('expired');
        setEndTimestamp(null);
        syncToBoardSettings(false, null, initialSeconds);

        if (!hasAlarmTriggeredRef.current) {
          hasAlarmTriggeredRef.current = true;
          playAlarmSound(alarmSound);
        }
      }
    }, 250);

    return () => clearInterval(interval);
  }, [status, endTimestamp, initialSeconds, alarmSound, playAlarmSound, syncToBoardSettings]);

  // Page Visibility API - zero drift
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && status === 'running' && endTimestamp) {
        const now = Date.now();
        const diff = Math.max(0, Math.ceil((endTimestamp - now) / 1000));
        setRemainingSeconds(diff);

        if (diff === 0) {
          setStatus('expired');
          setEndTimestamp(null);
          syncToBoardSettings(false, null, initialSeconds);
          if (!hasAlarmTriggeredRef.current) {
            hasAlarmTriggeredRef.current = true;
            playAlarmSound(alarmSound);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [status, endTimestamp, initialSeconds, alarmSound, playAlarmSound, syncToBoardSettings]);

  // Keyboard Shortcuts (Space, R)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // A classroom board can contain multiple timers, notes and stopwatches.
      // Never hijack global typing or control other widgets.
      if (!classTimerOwnsShortcut(containerRef.current, target)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'ready') handleStart();
        else if (status === 'running') handlePause();
        else if (status === 'paused') handleResume();
        else if (status === 'expired') handleRestartSameTime();
      } else if (e.key === 'r' || e.key === 'R') {
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleStart = () => {
    const totalToRun = remainingSeconds > 0 ? remainingSeconds : initialSeconds;
    const target = Date.now() + totalToRun * 1000;
    setRemainingSeconds(totalToRun);
    setEndTimestamp(target);
    setStatus('running');
    hasAlarmTriggeredRef.current = false;
    syncToBoardSettings(true, target, totalToRun);
  };

  const handlePause = () => {
    if (status === 'running' && endTimestamp) {
      const now = Date.now();
      const currentRemaining = Math.max(0, Math.ceil((endTimestamp - now) / 1000));
      setRemainingSeconds(currentRemaining);
      setEndTimestamp(null);
      setStatus('paused');
      syncToBoardSettings(false, null, initialSeconds);
    }
  };

  const handleResume = () => {
    if (remainingSeconds > 0) {
      const target = Date.now() + remainingSeconds * 1000;
      setEndTimestamp(target);
      setStatus('running');
      syncToBoardSettings(true, target, initialSeconds);
    } else {
      handleStart();
    }
  };

  const handleReset = () => {
    setStatus('ready');
    setEndTimestamp(null);
    setRemainingSeconds(initialSeconds);
    hasAlarmTriggeredRef.current = false;
    syncToBoardSettings(false, null, initialSeconds);
  };

  const handleRestartSameTime = () => {
    const target = Date.now() + initialSeconds * 1000;
    setRemainingSeconds(initialSeconds);
    setEndTimestamp(target);
    setStatus('running');
    hasAlarmTriggeredRef.current = false;
    syncToBoardSettings(true, target, initialSeconds);
  };

  const handleSelectPreset = (secs: number) => {
    setInitialSeconds(secs);
    setRemainingSeconds(secs);
    setEndTimestamp(null);
    setStatus('ready');
    hasAlarmTriggeredRef.current = false;
    persistSettings({ preferredDuration: secs });
    syncToBoardSettings(false, null, secs);
    setShowMoreMenu(false);
  };

  const handleAddMinute = () => {
    if (status === 'running' && endTimestamp) {
      const newEnd = endTimestamp + 60 * 1000;
      setEndTimestamp(newEnd);
      const newRemaining = Math.ceil((newEnd - Date.now()) / 1000);
      setRemainingSeconds(newRemaining);
      syncToBoardSettings(true, newEnd, initialSeconds);
    } else {
      const newSecs = remainingSeconds + 60;
      setRemainingSeconds(newSecs);
      if (status === 'ready') setInitialSeconds(newSecs);
    }
  };

  const handleSubtractMinute = () => {
    if (status === 'running' && endTimestamp) {
      const newEnd = Math.max(Date.now(), endTimestamp - 60 * 1000);
      setEndTimestamp(newEnd);
      const newRemaining = Math.max(0, Math.ceil((newEnd - Date.now()) / 1000));
      setRemainingSeconds(newRemaining);
      if (newRemaining === 0) {
        setStatus('expired');
        setEndTimestamp(null);
        syncToBoardSettings(false, null, initialSeconds);
        if (!hasAlarmTriggeredRef.current) {
          hasAlarmTriggeredRef.current = true;
          playAlarmSound(alarmSound);
        }
      } else {
        syncToBoardSettings(true, newEnd, initialSeconds);
      }
    } else {
      const newSecs = Math.max(0, remainingSeconds - 60);
      setRemainingSeconds(newSecs);
      if (status === 'ready') setInitialSeconds(newSecs);
    }
  };

  const handleApplyCustomTime = () => {
    let total: number;
    try {
      total = normalizeClassTimerSeconds(customMinInput, customSecInput);
    } catch (error) {
      setCustomTimeError(error instanceof Error ? error.message : 'Bitte eine gültige Zeit eingeben.');
      return;
    }
    setCustomTimeError('');
    setInitialSeconds(total);
    setRemainingSeconds(total);
    setEndTimestamp(null);
    setStatus('ready');
    hasAlarmTriggeredRef.current = false;
    setIsCustomTimeOpen(false);
    setShowMoreMenu(false);
    persistSettings({ preferredDuration: total });
    syncToBoardSettings(false, null, total);
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    persistSettings({ isMuted: nextMuted });
  };

  const handleSelectSound = (snd: AlarmSound) => {
    setAlarmSound(snd);
    persistSettings({ alarmSound: snd });
    playAlarmSound(snd);
  };

  const handleSelectVisualMode = (mode: VisualMode) => {
    setVisualMode(mode);
    persistSettings({ visualMode: mode });
  };

  // Progress Calculations
  const progressRatio = initialSeconds > 0 ? Math.min(1, Math.max(0, remainingSeconds / initialSeconds)) : 0;
  const isLastMinute = status === 'running' && remainingSeconds <= 60 && remainingSeconds > 0;
  const isLastTenSeconds = status === 'running' && remainingSeconds <= 10 && remainingSeconds > 0;

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // SVG Circle calculations
  const circleRadius = 42;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - progressRatio);
  // The original 144px ring left a large empty center when the widget grew.
  // Reserve real controls first; scale only the graphic/numerals, never buttons.
  const ringPixels = Math.max(92, Math.min(size.width * 0.68, size.height - 214, 440));
  const clockTextPixels = Math.max(36, Math.min(88, ringPixels * 0.26));
  const veryCompactTimer = size.width < 285 || size.height < 245;

  const getDigitColorClass = () => {
    if (status === 'expired') return 'text-rose-500 animate-pulse';
    if (isLastTenSeconds || isLastMinute) return 'text-amber-500';
    return currentIsLight ? 'text-slate-800' : 'text-white';
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      aria-label="Countdown-Timer: Leertaste startet oder pausiert bei fokussiertem Widget, R setzt zurück"
      className={`relative flex flex-col justify-between w-full h-full select-none overflow-hidden transition-colors duration-300 ${
        size.isCompact ? (veryCompactTimer ? 'p-1.5' : 'p-2') : size.isStandard ? 'p-3.5' : 'p-5'
      } ${
        status === 'expired'
          ? currentIsLight ? 'bg-amber-50/90 border border-amber-200' : 'bg-amber-950/20 border border-amber-500/20'
          : isLastMinute
            ? currentIsLight ? 'bg-amber-50/40' : 'bg-amber-950/10'
            : currentIsLight ? 'bg-white' : 'bg-zinc-900/95'
      }`}
    >
      {/* ========================================================================= */}
      {/* 1. COMPACT LAYOUT (< 380px)                                               */}
      {/* Fokus: Große Zeitanzeige + Primäre Aktionen + "•••" Popover für Presets/Ton */}
      {/* ========================================================================= */}
      {size.isCompact && (
        <div className={`flex flex-col justify-between h-full w-full ${veryCompactTimer ? 'gap-1' : 'gap-2'}`}>
          {/* Status Badge */}
          <div className="flex items-center justify-between shrink-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
              status === 'expired'
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : status === 'running'
                  ? isLastMinute ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : status === 'paused'
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : currentIsLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-zinc-800 text-slate-400 border border-white/10'
            }`}>
              {status === 'expired' ? 'Zeit vorbei' : status === 'running' ? (isLastMinute ? '1 Min!' : 'Läuft') : status === 'paused' ? 'Pause' : 'Bereit'}
            </span>

            {/* Ton Toggle Quick */}
            <button
              onClick={handleToggleMute}
              className={`p-1.5 rounded-lg border text-xs cursor-pointer active:scale-95 transition-all ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  : currentIsLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-zinc-800 border-white/10 text-slate-300'
              }`}
              title={isMuted ? 'Stummgeschaltet' : 'Signalton aktiv'}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>

          {/* Central Time */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <span
              onClick={() => {
                if (status !== 'running') {
                  setCustomMinInput(Math.floor(remainingSeconds / 60).toString());
                  setCustomSecInput((remainingSeconds % 60).toString());
                  setIsCustomTimeOpen(true);
                }
              }}
              className={`font-mono font-black tracking-[-0.04em] tabular-nums transition-colors pointer-events-auto cursor-pointer leading-none select-none ${veryCompactTimer ? 'text-5xl' : 'text-5xl sm:text-6xl'} ${getDigitColorClass()}`}
              title={status !== 'running' ? 'Tippen für eigene Zeit' : undefined}
            >
              {formatTime(remainingSeconds)}
            </span>

            {/* Slim progress bar in compact mode */}
            <div className={`${veryCompactTimer ? 'w-28 mt-1' : 'w-36 mt-2'} h-1.5 rounded-full overflow-hidden border ${
              currentIsLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800 border-white/5'
            }`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  status === 'expired' ? 'bg-rose-500' : isLastMinute ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${progressRatio * 100}%` }}
              />
            </div>
          </div>

          {/* Primary Action Button (Start / Pause / Weiter / Nochmals) */}
          <div className="shrink-0 w-full">
            {status === 'ready' && (
              <button
                onClick={handleStart}
                className={`w-full ${veryCompactTimer ? 'min-h-[40px]' : 'min-h-[44px]'} px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Play size={17} fill="currentColor" />
                <span>Start</span>
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={handlePause}
                className={`w-full ${veryCompactTimer ? 'min-h-[40px]' : 'min-h-[44px]'} px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Pause size={17} fill="currentColor" />
                <span>Pause</span>
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={handleResume}
                className={`w-full ${veryCompactTimer ? 'min-h-[40px]' : 'min-h-[44px]'} px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Play size={17} fill="currentColor" />
                <span>Weiter</span>
              </button>
            )}

            {status === 'expired' && (
              <button
                onClick={handleRestartSameTime}
                className={`w-full ${veryCompactTimer ? 'min-h-[40px]' : 'min-h-[44px]'} px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <RefreshCw size={16} />
                <span>Nochmals</span>
              </button>
            )}
          </div>

          {/* Secondary Controls: [-1m] [+1m] [Reset] [••• Mehr] */}
          <div className={`flex items-center justify-between shrink-0 border-t border-slate-200/60 dark:border-white/10 ${veryCompactTimer ? 'gap-1 pt-0.5' : 'gap-1.5 pt-1'}`}>
            <button
              onClick={handleSubtractMinute}
              disabled={remainingSeconds <= 0}
              className={`flex-1 min-h-[36px] rounded-xl border text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute abziehen"
            >
              <Minus size={12} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            <button
              onClick={handleAddMinute}
              className={`flex-1 min-h-[36px] rounded-xl border text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute hinzufügen"
            >
              <Plus size={12} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            <button
              onClick={handleReset}
              className={`min-h-[36px] min-w-[38px] px-2 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="Zurücksetzen"
            >
              <RotateCcw size={14} />
            </button>

            {/* "•••" Popover trigger */}
            <button
              onClick={() => setShowMoreMenu(prev => !prev)}
              className={`min-h-[36px] min-w-[38px] px-2 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 ${
                showMoreMenu
                  ? 'bg-indigo-600 text-white border-indigo-700'
                  : currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="Presets, Ton, eigene Zeit"
              aria-label="Weitere Optionen"
            >
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STANDARD LAYOUT (380px – 549px)                                        */}
      {/* Struktur: 05:00 -> [-1m] [START] [+1m] -> [1][2][5][10][15][20] -> Ton/Zeit */}
      {/* ========================================================================= */}
      {size.isStandard && (
        <div className="flex flex-col justify-between h-full w-full gap-2">
          {/* Top Bar: Subtiler Status + Ton/Optionen */}
          <div className="flex items-center justify-between shrink-0">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              status === 'expired'
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : status === 'running'
                  ? isLastMinute ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : status === 'paused'
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : currentIsLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-zinc-800 text-slate-400 border border-white/10'
            }`}>
              {status === 'expired' ? 'Zeit vorbei' : status === 'running' ? (isLastMinute ? 'Letzte Minute' : 'Timer läuft') : status === 'paused' ? 'Pausiert' : 'Bereit'}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleMute}
                className={`min-h-[32px] px-2 rounded-lg border text-xs flex items-center gap-1 cursor-pointer active:scale-95 transition-all ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : currentIsLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 border-white/10 text-slate-300 hover:bg-zinc-700'
                }`}
                title="Ton umschalten"
              >
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                <span className="text-[10px] font-bold">{isMuted ? 'Stumm' : alarmSound === 'bell' ? 'Gong' : alarmSound === 'bowl' ? 'Schale' : 'Beep'}</span>
              </button>

              {externalShowSettings === undefined && (<button
                onClick={() => setShowSettings(!showSettings)}
                className={`min-h-[32px] min-w-[32px] p-1.5 rounded-lg border flex items-center justify-center cursor-pointer active:scale-95 transition-all ${
                  showSettings ? 'bg-indigo-600 text-white border-indigo-700' : currentIsLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-zinc-800 border-white/10 text-slate-400 hover:bg-zinc-700'
                }`}
                title="Einstellungen"
              >
                <Settings2 size={14} />
              </button>)}
            </div>
          </div>

          {/* Central Time & Optional Ring (Ring never overlaps controls) */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0 my-1">
            {visualMode === 'ring' && !size.isShort ? (
              <div className="relative flex min-h-0 items-center justify-center shrink-0"
                style={{ width: ringPixels, height: ringPixels, maxWidth: '100%', maxHeight: '100%', aspectRatio: '1' }}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    fill="none"
                    className={currentIsLight ? 'stroke-slate-100' : 'stroke-zinc-800'}
                    strokeWidth="5"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    fill="none"
                    className={`transition-all duration-300 ${
                      status === 'expired' ? 'stroke-rose-500' : isLastMinute ? 'stroke-amber-500' : 'stroke-indigo-500'
                    }`}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    onClick={() => {
                      if (status !== 'running') {
                        setCustomMinInput(Math.floor(remainingSeconds / 60).toString());
                        setCustomSecInput((remainingSeconds % 60).toString());
                        setIsCustomTimeOpen(true);
                      }
                    }}
                    className={`font-mono font-black tracking-tight tabular-nums cursor-pointer leading-none select-none ${getDigitColorClass()}`}
                    style={{ fontSize: clockTextPixels }}
                    title={status !== 'running' ? 'Klicken für eigene Zeit' : undefined}
                  >
                    {formatTime(remainingSeconds)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span
                  onClick={() => {
                    if (status !== 'running') {
                      setCustomMinInput(Math.floor(remainingSeconds / 60).toString());
                      setCustomSecInput((remainingSeconds % 60).toString());
                      setIsCustomTimeOpen(true);
                    }
                  }}
                  className={`font-mono font-black tracking-tight tabular-nums cursor-pointer leading-none select-none ${getDigitColorClass()}`}
                  style={{ fontSize: Math.max(40, Math.min(108, size.width * 0.16, size.height * 0.22)) }}
                >
                  {formatTime(remainingSeconds)}
                </span>
                <div className={`w-44 h-1.5 rounded-full overflow-hidden border ${
                  currentIsLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800 border-white/5'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      status === 'expired' ? 'bg-rose-500' : isLastMinute ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Primary Action Row: [-1 Min] [START] [+1 Min] [Reset] */}
          <div className="flex items-center gap-2 justify-center shrink-0 w-full">
            <button
              onClick={handleSubtractMinute}
              disabled={remainingSeconds <= 0}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute abziehen"
            >
              <Minus size={13} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            {status === 'ready' && (
              <button
                onClick={handleStart}
                className="flex-1 min-h-[44px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Play size={18} fill="currentColor" />
                <span>Start</span>
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={handlePause}
                className="flex-1 min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Pause size={18} fill="currentColor" />
                <span>Pause</span>
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={handleResume}
                className="flex-1 min-h-[44px] px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <Play size={18} fill="currentColor" />
                <span>Weiter</span>
              </button>
            )}

            {status === 'expired' && (
              <button
                onClick={handleRestartSameTime}
                className="flex-1 min-h-[44px] px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-all active:scale-98`}
              >
                <RefreshCw size={16} />
                <span>Nochmals</span>
              </button>
            )}

            <button
              onClick={handleAddMinute}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-0.5 cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute hinzufügen"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            <button
              onClick={handleReset}
              className={`min-w-[44px] min-h-[44px] px-3 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="Zurücksetzen"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Presets Row: [1] [2] [5] [10] [15] [20] */}
          {status !== 'running' && (
            <div className="flex items-center gap-1 justify-center shrink-0 w-full pt-1">
              {PRESET_LIST.map((p) => {
                const isSelected = initialSeconds === p.seconds;
                return (
                  <button
                    key={p.seconds}
                    onClick={() => handleSelectPreset(p.seconds)}
                    className={`flex-1 min-h-[36px] py-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    {p.shortLabel}
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer Row: Eigene Zeit Trigger */}
          <div className="flex items-center justify-center gap-3 shrink-0 pt-1 text-[11px] text-slate-400">
            {status !== 'running' && (
              <button
                onClick={() => {
                  setCustomMinInput(Math.floor(initialSeconds / 60).toString());
                  setCustomSecInput((initialSeconds % 60).toString());
                  setIsCustomTimeOpen(true);
                }}
                className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 font-bold cursor-pointer"
              >
                <Clock size={12} />
                <span>Eigene Zeit einstellen</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LARGE LAYOUT (550px – 799px) & 4. FULLSCREEN (>= 800px)                 */}
      {/* Großzügiger Ring + Zeit, vollständige Presets, Smartboard-Touchflächen     */}
      {/* ========================================================================= */}
      {(size.isLarge || size.isXL) && (
        <div className="flex flex-col justify-between h-full w-full gap-4">
          {/* Top Bar: Volle Steuerung */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                status === 'expired'
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : status === 'running'
                    ? isLastMinute ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                    : status === 'paused'
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : currentIsLight ? 'bg-slate-100 text-slate-500 border border-slate-200' : 'bg-zinc-800 text-slate-400 border border-white/10'
              }`}>
                {status === 'expired' ? 'Zeit abgelaufen' : status === 'running' ? (isLastMinute ? 'Letzte Minute!' : 'Timer läuft') : status === 'paused' ? 'Pausiert' : 'Bereit'}
              </span>

              <button
                onClick={handleToggleMute}
                className={`min-h-[36px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all ${
                  isMuted
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                    : currentIsLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-zinc-800 border-white/10 text-slate-300 hover:bg-zinc-700'
                }`}
                title="Ton ein/aus"
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span>{isMuted ? 'Stumm' : alarmSound === 'bell' ? 'Gong' : alarmSound === 'bowl' ? 'Klangschale' : 'Beep'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {status !== 'running' && (
                <button
                  onClick={() => {
                    setCustomMinInput(Math.floor(initialSeconds / 60).toString());
                    setCustomSecInput((initialSeconds % 60).toString());
                    setIsCustomTimeOpen(true);
                  }}
                  className={`min-h-[36px] px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                    currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                  }`}
                >
                  <Clock size={14} />
                  <span>Eigene Zeit</span>
                </button>
              )}

              {externalShowSettings === undefined && (<button
                onClick={() => setShowSettings(!showSettings)}
                className={`min-h-[36px] min-w-[38px] p-2 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 ${
                  showSettings ? 'bg-indigo-600 text-white border-indigo-700' : currentIsLight ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' : 'bg-zinc-800 border-white/10 text-slate-400 hover:bg-zinc-700'
                }`}
                title="Optionen"
              >
                <Settings2 size={16} />
              </button>)}
            </div>
          </div>

          {/* Central Area: Big Smartboard Ring */}
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            {visualMode === 'ring' ? (
              <div className={`relative flex items-center justify-center ${
                size.isXL ? 'w-64 h-64 max-h-[50vh]' : 'w-48 h-48 max-h-[42vh]'
              } shrink-0`}>
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    fill="none"
                    className={currentIsLight ? 'stroke-slate-100' : 'stroke-zinc-800'}
                    strokeWidth="6"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r={circleRadius}
                    fill="none"
                    className={`transition-all duration-300 ${
                      status === 'expired' ? 'stroke-rose-500' : isLastMinute ? 'stroke-amber-500' : 'stroke-indigo-500'
                    }`}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    onClick={() => {
                      if (status !== 'running') {
                        setCustomMinInput(Math.floor(remainingSeconds / 60).toString());
                        setCustomSecInput((remainingSeconds % 60).toString());
                        setIsCustomTimeOpen(true);
                      }
                    }}
                    className={`font-mono font-black tracking-tight tabular-nums cursor-pointer leading-none ${
                      size.isXL ? 'text-6xl sm:text-7xl' : 'text-5xl sm:text-6xl'
                    } select-none ${getDigitColorClass()}`}
                  >
                    {formatTime(remainingSeconds)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span
                  onClick={() => {
                    if (status !== 'running') {
                      setCustomMinInput(Math.floor(remainingSeconds / 60).toString());
                      setCustomSecInput((remainingSeconds % 60).toString());
                      setIsCustomTimeOpen(true);
                    }
                  }}
                  className={`font-mono font-black tracking-tight tabular-nums cursor-pointer leading-none ${
                    size.isXL ? 'text-7xl sm:text-8xl' : 'text-6xl'
                  } select-none ${getDigitColorClass()}`}
                >
                  {formatTime(remainingSeconds)}
                </span>
                <div className={`w-80 max-w-full h-3 rounded-full overflow-hidden border ${
                  currentIsLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-800 border-white/5'
                }`}>
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      status === 'expired' ? 'bg-rose-500' : isLastMinute ? 'bg-amber-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${progressRatio * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Full Presets Row */}
          {status !== 'running' && (
            <div className="flex items-center gap-2 justify-center shrink-0 w-full max-w-xl mx-auto">
              {PRESET_LIST.map((p) => {
                const isSelected = initialSeconds === p.seconds;
                return (
                  <button
                    key={p.seconds}
                    onClick={() => handleSelectPreset(p.seconds)}
                    className={`flex-1 min-h-[42px] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                        : currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Primary Action Row: Smartboard Touch-Friendly */}
          <div className="flex items-center gap-3 justify-center shrink-0 w-full max-w-lg mx-auto pt-2 border-t border-slate-200/60 dark:border-white/10">
            <button
              onClick={handleSubtractMinute}
              disabled={remainingSeconds <= 0}
              className={`min-w-[50px] min-h-[50px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute abziehen"
            >
              <Minus size={15} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            {status === 'ready' && (
              <button
                onClick={handleStart}
                className="flex-1 min-h-[50px] px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-98`}
              >
                <Play size={22} fill="currentColor" />
                <span>Start</span>
              </button>
            )}

            {status === 'running' && (
              <button
                onClick={handlePause}
                className="flex-1 min-h-[50px] px-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-98`}
              >
                <Pause size={22} fill="currentColor" />
                <span>Pause</span>
              </button>
            )}

            {status === 'paused' && (
              <button
                onClick={handleResume}
                className="flex-1 min-h-[50px] px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-98`}
              >
                <Play size={22} fill="currentColor" />
                <span>Weiter</span>
              </button>
            )}

            {status === 'expired' && (
              <button
                onClick={handleRestartSameTime}
                className="flex-1 min-h-[50px] px-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-base uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all active:scale-98`}
              >
                <RefreshCw size={20} />
                <span>Nochmals</span>
              </button>
            )}

            <button
              onClick={handleAddMinute}
              className={`min-w-[50px] min-h-[50px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="1 Minute hinzufügen"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>1m</span>
            </button>

            <button
              onClick={handleReset}
              className={`min-w-[50px] min-h-[50px] px-3.5 rounded-xl border flex items-center justify-center cursor-pointer active:scale-95 ${
                currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
              }`}
              title="Zurücksetzen"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OVERLAY 1: "•••" COMPACT QUICK MENU                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-2 z-40 p-3 rounded-2xl border shadow-2xl flex flex-col justify-between overflow-y-auto ${
              currentIsLight ? 'bg-white/98 border-slate-200 text-slate-800' : 'bg-zinc-900/98 border-white/15 text-white'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-500">Schnellauswahl & Optionen</span>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Presets in Modal */}
            <div className="my-2">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
                Voreinstellungen
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_LIST.map((p) => (
                  <button
                    key={p.seconds}
                    onClick={() => handleSelectPreset(p.seconds)}
                    className={`min-h-[36px] px-2 py-1 text-xs font-bold rounded-xl border cursor-pointer ${
                      initialSeconds === p.seconds
                        ? 'bg-indigo-600 text-white border-indigo-700'
                        : currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions: Eigene Zeit & Einstellungen */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/60 dark:border-white/10">
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setCustomMinInput(Math.floor(initialSeconds / 60).toString());
                  setCustomSecInput((initialSeconds % 60).toString());
                  setIsCustomTimeOpen(true);
                }}
                className={`w-full min-h-[36px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${
                  currentIsLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700' : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
                }`}
              >
                <Clock size={14} />
                <span>Eigene Zeit eingeben</span>
              </button>

              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  setShowSettings(true);
                }}
                className="w-full min-h-[36px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Settings2 size={14} />
                <span>Signalton & Darstellung</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* OVERLAY 2: EIGENE ZEIT EINGEBEN                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCustomTimeOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-2 z-50 p-4 rounded-2xl border shadow-2xl flex flex-col justify-between overflow-y-auto ${
              currentIsLight ? 'bg-white/98 border-slate-200 text-slate-800' : 'bg-zinc-900/98 border-white/15 text-white'
            }`}
          >
            <div>
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10 mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                  Eigene Zeit einstellen
                </span>
                <button
                  onClick={() => setIsCustomTimeOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {customTimeError && <p role="alert" className="rounded-lg bg-rose-100 p-2 text-xs font-bold text-rose-800">{customTimeError}</p>}
              <div className="flex items-center justify-center gap-3 my-4">
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">Minuten</label>
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={customMinInput}
                    onChange={(e) => { setCustomMinInput(e.target.value); setCustomTimeError(''); }}
                    className={`w-20 text-center text-3xl font-black rounded-xl p-2 border outline-none focus:border-indigo-500 ${
                      currentIsLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-800 border-white/10 text-white'
                    }`}
                  />
                </div>
                <span className="text-3xl font-black mt-4">:</span>
                <div className="flex flex-col items-center">
                  <label className="text-[10px] font-bold text-slate-400 mb-1">Sekunden</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={customSecInput}
                    onChange={(e) => { setCustomSecInput(e.target.value); setCustomTimeError(''); }}
                    className={`w-20 text-center text-3xl font-black rounded-xl p-2 border outline-none focus:border-indigo-500 ${
                      currentIsLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-zinc-800 border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setIsCustomTimeOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleApplyCustomTime}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Check size={14} />
                Übernehmen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* OVERLAY 3: SETTINGS (Signalton, Darstellung)                              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`absolute inset-2 z-50 p-4 rounded-2xl border shadow-2xl flex flex-col justify-between overflow-y-auto ${
              currentIsLight ? 'bg-white/98 border-slate-200 text-slate-800' : 'bg-zinc-900/98 border-white/15 text-white'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500">
                  Timer-Optionen
                </span>
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Schließen
                </button>
              </div>

              {/* Sound Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Ablauf-Signalton
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bell', name: 'Gong' },
                    { id: 'bowl', name: 'Schale' },
                    { id: 'beep', name: 'Beep' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSound(s.id as AlarmSound)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        alarmSound === s.id
                          ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                            : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                      }`}
                    >
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Mode Selection */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                  Anzeige-Modus
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'ring', name: 'Kreis-Ring' },
                    { id: 'progress', name: 'Balken' },
                    { id: 'minimal', name: 'Nur Zeit' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectVisualMode(m.id as VisualMode)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        visualMode === m.id
                          ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm'
                          : currentIsLight
                            ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                            : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                      }`}
                    >
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full py-2.5 mt-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all shadow-sm"
            >
              Fertig
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
