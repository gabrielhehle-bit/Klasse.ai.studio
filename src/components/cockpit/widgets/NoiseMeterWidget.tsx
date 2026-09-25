import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  NoisePermissionState,
  SensitivityLevel,
  classifyNoiseLevel,
  calculateRawVolume,
  computeSmoothedVolume,
  getSensitivityMultiplier,
  cleanupMediaStream,
  DEFAULT_NOISE_SETTINGS,
} from '../../../lib/noisemeterAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { Mic, MicOff, RefreshCw, Volume2, Sliders, ShieldCheck } from 'lucide-react';

interface NoiseMeterWidgetProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const NoiseMeterWidget: React.FC<NoiseMeterWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('NoiseMeterWidget', containerRef);

  const [permissionState, setPermissionState] = useState<NoisePermissionState>('idle');
  const [volume, setVolume] = useState(0);

  const sensitivity: SensitivityLevel = widget.settings?.sensitivity || DEFAULT_NOISE_SETTINGS.sensitivity;

  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastVolRef = useRef(0);
  const isActiveRef = useRef(false);
  const startInFlightRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const lastRenderTimeRef = useRef(0);

  // Sauberes Beenden von Stream & AudioContext
  const stopMeasurement = useCallback(() => {
    requestGenerationRef.current += 1; // Cancel a pending microphone permission dialog.
    startInFlightRef.current = false;
    isActiveRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      cleanupMediaStream(streamRef.current);
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setVolume(0);
    lastVolRef.current = 0;
    setPermissionState('idle');
  }, []);

  // Cleanup bei Unmount sicherstellen
  useEffect(() => {
    return () => {
      stopMeasurement();
    };
  }, [stopMeasurement]);

  // Audio-Loop mit gedrosseltem React-Update (~15 FPS) zur Performance-Schonung
  const runAudioLoop = useCallback(() => {
    if (!isActiveRef.current || !analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    const mult = getSensitivityMultiplier(sensitivity);
    const raw = calculateRawVolume(dataArray, mult);
    const smoothed = computeSmoothedVolume(lastVolRef.current, raw, 0.35);
    lastVolRef.current = smoothed;

    const now = performance.now();
    // UI-Aktualisierung drosseln auf ca. 15–20 fps (alle ~60ms)
    if (now - lastRenderTimeRef.current >= 60) {
      lastRenderTimeRef.current = now;
      setVolume(smoothed);
    }

    animFrameRef.current = requestAnimationFrame(runAudioLoop);
  }, [sensitivity]);

  // Start der Mikrofonmessung
  const startMeasurement = async () => {
    if (isActiveRef.current || startInFlightRef.current) return;
    startInFlightRef.current = true;
    const requestGeneration = ++requestGenerationRef.current;
    setPermissionState('requesting');

    if (!navigator?.mediaDevices?.getUserMedia) {
      startInFlightRef.current = false;
      setPermissionState('unavailable');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // If the user switched tabs while the browser permission prompt was
      // visible, release the stream instead of activating the hidden meter.
      if (requestGenerationRef.current !== requestGeneration) {
        cleanupMediaStream(stream);
        return;
      }
      streamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        cleanupMediaStream(stream);
        streamRef.current = null;
        setPermissionState('unavailable');
        return;
      }

      const ctx = new AudioCtxClass();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      if (requestGenerationRef.current !== requestGeneration) {
        cleanupMediaStream(stream);
        streamRef.current = null;
        await ctx.close().catch(() => {});
        audioContextRef.current = null;
        return;
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      isActiveRef.current = true;
      setPermissionState('active');
      runAudioLoop();
    } catch (err: any) {
      if (requestGenerationRef.current !== requestGeneration) return;
      if (streamRef.current) { cleanupMediaStream(streamRef.current); streamRef.current = null; }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      setPermissionState(err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError'
        ? 'denied' : 'unavailable');
    } finally {
      if (requestGenerationRef.current === requestGeneration) startInFlightRef.current = false;
    }
  };

  const setSensitivity = (lvl: SensitivityLevel) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          sensitivity: lvl,
        },
      });
    }
  };

  const classification = classifyNoiseLevel(volume);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-between select-none ${size.isCompact ? 'p-1.5' : 'p-3'} overflow-hidden transition-colors ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {showSettings && (
        <div role="region" aria-label="Lärmmesser-Einstellungen" className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 p-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold">Empfindlichkeit:</span>
          {(['low', 'normal', 'high'] as SensitivityLevel[]).map(level => (
            <button key={level} type="button" onClick={() => setSensitivity(level)}
              aria-pressed={sensitivity === level}
              className={`min-h-9 px-2 rounded-lg border ${sensitivity === level ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-300 dark:border-slate-600'}`}>
              {level === 'low' ? 'Niedrig' : level === 'normal' ? 'Normal' : 'Hoch'}
            </button>
          ))}
          <button type="button" onClick={onCloseSettings} className="min-h-9 px-2 rounded-lg border border-slate-300 dark:border-slate-600 ml-auto">Fertig</button>
        </div>
      )}
      {/* 1. Header / Status Bar */}
      <div className={`flex items-center justify-between shrink-0 ${size.isCompact ? 'gap-1' : 'gap-2'}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <Volume2
            size={size.isCompact ? 14 : 16}
            className={permissionState === 'active' ? 'text-indigo-500 animate-pulse' : 'text-slate-400'}
          />
          <span className="text-[11px] font-black uppercase tracking-wider truncate">
            Lärmpegel-Messer
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center gap-1 text-[9px] font-medium text-slate-400 dark:text-zinc-400"
            title="Keine Speicherung oder Übertragung von Audiodaten"
          >
            <ShieldCheck size={12} className="text-emerald-500" />
            {!size.isCompact && <span>Offline & Anonym</span>}
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className={`flex-1 flex flex-col items-center justify-center min-h-0 w-full ${size.isCompact ? 'my-0.5' : 'my-2'}`}>
        {/* State A: Idle (Noch nicht gestartet) */}
        {permissionState === 'idle' && (
          <div className={`flex flex-col items-center justify-center text-center max-w-sm ${size.isCompact ? 'p-1.5' : 'p-3'}`}>
            <div
              className={`${size.isCompact ? 'w-11 h-11 mb-1.5' : 'w-14 h-14 mb-3'} rounded-2xl flex items-center justify-center shadow-inner ${
                currentIsLight ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-500/10 text-indigo-400'
              }`}
            >
              <Mic size={28} />
            </div>
            <h3 className="text-sm font-black mb-1">Lautstärkemesser starten</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-4 leading-relaxed max-w-[260px]">
              Misst die Lautstärke im Klassenzimmer ohne Tonaufnahme oder Verhaltensbewertung.
            </p>
            <button
              type="button"
              onClick={startMeasurement}
              className="px-5 py-2.5 rounded-xl font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-all cursor-pointer min-h-[44px] flex items-center gap-2"
            >
              <Mic size={16} />
              <span>Messung starten</span>
            </button>
          </div>
        )}

        {/* State B: Requesting */}
        {permissionState === 'requesting' && (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <RefreshCw size={28} className="text-indigo-500 animate-spin mb-3" />
            <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">
              Mikrofon wird angefragt...
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Bitte den Zugriff im Browser bestätigen.
            </p>
          </div>
        )}

        {/* State C: Denied */}
        {permissionState === 'denied' && (
          <div className="flex flex-col items-center justify-center text-center p-3 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-2">
              <MicOff size={24} />
            </div>
            <h4 className="text-xs font-black text-rose-600 dark:text-rose-400 mb-1">
              Mikrofonzugriff wurde nicht erlaubt
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mb-3 leading-relaxed">
              Erlaube den Mikrofonzugriff im Browser, um den Pegel im Raum anzuzeigen.
            </p>
            <button
              type="button"
              onClick={startMeasurement}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <RefreshCw size={14} />
              <span>Erneut versuchen</span>
            </button>
          </div>
        )}

        {/* State D: Unavailable */}
        {permissionState === 'unavailable' && (
          <div className="flex flex-col items-center justify-center text-center p-3 max-w-sm">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
              <MicOff size={24} />
            </div>
            <h4 className="text-xs font-black text-amber-600 dark:text-amber-400 mb-1">
              Kein Mikrofon verfügbar
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 mb-3 leading-relaxed">
              Es wurde kein Mikrofon an diesem Gerät gefunden.
            </p>
            <button
              type="button"
              onClick={startMeasurement}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
            >
              <RefreshCw size={14} />
              <span>Erneut prüfen</span>
            </button>
          </div>
        )}

        {/* State E: Active Measurement */}
        {permissionState === 'active' && (
          <div className="w-full flex-1 flex flex-col items-center justify-center gap-3">
            {/* Classification Badge */}
            <div
              className={`px-4 py-1.5 rounded-full border flex items-center gap-2 transition-all ${
                classification.badgeBg
              } ${size.category === 'fullscreen' ? 'scale-125 my-4' : ''}`}
            >
              <span className="text-lg">{classification.icon}</span>
              <span className="text-xs sm:text-sm font-black tracking-wide">
                {classification.label}
              </span>
            </div>

            {/* Smartboard-freundliche Beschreibung */}
            {!size.isCompact && (
              <p className="text-[10.5px] text-slate-500 dark:text-zinc-400 text-center max-w-xs font-medium">
                {classification.description}
              </p>
            )}

            {/* Visual Gauge Bar */}
            <div className="w-full max-w-md px-2 flex flex-col gap-1.5">
              <div
                className={`w-full h-5 sm:h-6 rounded-full p-1 border overflow-hidden shadow-inner relative ${
                  currentIsLight ? 'bg-slate-100 border-slate-200' : 'bg-zinc-850 border-zinc-700'
                }`}
              >
                {/* Bar */}
                <div
                  className={`h-full rounded-full transition-all duration-100 ease-out ${classification.barColor}`}
                  style={{ width: `${Math.max(4, Math.min(100, volume))}%` }}
                />

                {/* Subtile Skalenstriche */}
                <div className="absolute inset-0 flex justify-between px-3 items-center pointer-events-none opacity-20">
                  <span className="w-0.5 h-2 bg-current" />
                  <span className="w-0.5 h-2 bg-current" />
                  <span className="w-0.5 h-2 bg-current" />
                  <span className="w-0.5 h-2 bg-current" />
                </div>
              </div>

              {/* Subtile relative Skala */}
              <div className="flex justify-between text-[8px] font-bold uppercase tracking-widest text-slate-400 px-1">
                <span>Leise</span>
                <span>Angenehm</span>
                <span>Laut</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-white/5 shrink-0">
        {permissionState === 'active' ? (
          <>
            <span className="text-[9px] text-slate-400 font-medium">Aktiv</span>

            {/* Stop button */}
            <button
              type="button"
              onClick={stopMeasurement}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all active:scale-95 cursor-pointer min-h-[36px] flex items-center gap-1.5"
            >
              <MicOff size={14} />
              <span>Stoppen</span>
            </button>
          </>
        ) : (
          <div className="w-full flex items-center justify-center">
            <span className="text-[9px] text-slate-400 text-center font-medium">
              Keine Verhaltensbewertung • Nur objektive akustische Orientierung
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
