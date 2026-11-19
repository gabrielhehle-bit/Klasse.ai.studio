import React from 'react';
import { Check, ChevronRight, Pause, Play, X } from 'lucide-react';
import type { AppState } from '../../types';
import { isClassMascotAction, MASCOT_CLASSROOM_CUES, MASCOT_READING_MINUTES, MASCOT_RITUAL_EVENT, MASCOT_SURPRISE_EVENT, normalizeClassMascot, type ClassMascotAction } from '../../lib/classMascot';
import {
  calculateRawVolume,
  cleanupMediaStream,
  computeSmoothedVolume,
  getSensitivityMultiplier,
  type NoisePermissionState,
} from '../../lib/noisemeterAlgorithm';
import ClassMascotArtwork from './ClassMascotArtwork';

interface CueClock {
  remainingMs: number;
  endsAt: number | null;
}

const cueButtonClass = 'pointer-events-auto grid h-11 min-w-11 place-items-center rounded-lg px-1 text-sm font-bold text-emerald-900 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700';

interface Props {
  app: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
}

/**
 * A transparent figure with temporary classroom cues and an optional local
 * noise indicator. The microphone never stores or transmits audio.
 */
export default function ClassMascotWidget({ app }: Props) {
  const state = normalizeClassMascot(app.classMascot);
  const liveSettingsRef = React.useRef(state);
  liveSettingsRef.current = state;
  // A deliberate tap triggers a short, local reaction. Never persist tap counters
  // or timers to the class vault / account sync; only teacher-chosen settings sync.
  const [reactionTick, setReactionTick] = React.useState(0);
  const [reactionActive, setReactionActive] = React.useState(false);
  const reactionTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [surpriseTick, setSurpriseTick] = React.useState(0);
  const [surpriseActive, setSurpriseActive] = React.useState(false);
  const surpriseTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ritualAction, setRitualAction] = React.useState<ClassMascotAction | null>(null);
  const [ritualTick, setRitualTick] = React.useState(0);
  const [cueIndex, setCueIndex] = React.useState(0);
  const ritualTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cueClock, setCueClock] = React.useState<CueClock | null>(null);
  const [clockNow, setClockNow] = React.useState(0);

  // Live level is intentionally session-local. The microphone stream, analyser
  // buffers and current level never enter app state, backups or account sync.
  const [noisePermission, setNoisePermission] = React.useState<NoisePermissionState>('idle');
  const [liveVolume, setLiveVolume] = React.useState(0);
  const [coveringEars, setCoveringEars] = React.useState(false);
  const noiseStreamRef = React.useRef<MediaStream | null>(null);
  const noiseAudioContextRef = React.useRef<AudioContext | null>(null);
  const noiseAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const noiseAnimationFrameRef = React.useRef<number | null>(null);
  const noiseLevelRef = React.useRef(0);
  const noiseRunningRef = React.useRef(false);
  const noiseRequestGenerationRef = React.useRef(0);
  const lastNoiseRenderRef = React.useRef(0);

  const stopLiveNoise = React.useCallback(() => {
    noiseRequestGenerationRef.current += 1;
    noiseRunningRef.current = false;
    if (noiseAnimationFrameRef.current !== null) {
      cancelAnimationFrame(noiseAnimationFrameRef.current);
      noiseAnimationFrameRef.current = null;
    }
    if (noiseStreamRef.current) {
      cleanupMediaStream(noiseStreamRef.current);
      noiseStreamRef.current = null;
    }
    if (noiseAudioContextRef.current) {
      try {
        noiseAudioContextRef.current.close().catch(() => {});
      } catch {}
      noiseAudioContextRef.current = null;
    }
    noiseAnalyserRef.current = null;
    noiseLevelRef.current = 0;
    setLiveVolume(0);
    setCoveringEars(false);
    setNoisePermission('idle');
  }, []);

  const runLiveNoiseLoop = React.useCallback(() => {
    const analyser = noiseAnalyserRef.current;
    if (!noiseRunningRef.current || !analyser) return;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    const raw = calculateRawVolume(dataArray, getSensitivityMultiplier(liveSettingsRef.current.liveNoiseSensitivity));
    const smoothed = computeSmoothedVolume(noiseLevelRef.current, raw, 0.3);
    noiseLevelRef.current = smoothed;

    const threshold = liveSettingsRef.current.liveNoiseThreshold;
    setCoveringEars(previous => {
      if (liveSettingsRef.current.quietMode) return false;
      // Hysteresis prevents rapid hand flicker around the selected threshold.
      return previous ? smoothed >= Math.max(0, threshold - 8) : smoothed >= threshold;
    });

    const now = performance.now();
    if (now - lastNoiseRenderRef.current >= 80) {
      lastNoiseRenderRef.current = now;
      setLiveVolume(smoothed);
    }
    noiseAnimationFrameRef.current = requestAnimationFrame(runLiveNoiseLoop);
  }, []);

  const startLiveNoise = React.useCallback(async () => {
    if (!state.liveNoiseEnabled || noiseRunningRef.current) return;
    const generation = ++noiseRequestGenerationRef.current;
    setNoisePermission('requesting');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setNoisePermission('unavailable');
      return;
    }
    let pendingStream: MediaStream | null = null;
    let pendingContext: AudioContext | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      pendingStream = stream;
      if (noiseRequestGenerationRef.current !== generation || !liveSettingsRef.current.liveNoiseEnabled) {
        cleanupMediaStream(stream);
        return;
      }

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) {
        cleanupMediaStream(stream);
        setNoisePermission('unavailable');
        return;
      }
      const context = new AudioCtxClass();
      pendingContext = context;
      if (context.state === 'suspended') await context.resume();
      if (noiseRequestGenerationRef.current !== generation) {
        cleanupMediaStream(stream);
        await context.close().catch(() => {});
        return;
      }

      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;
      context.createMediaStreamSource(stream).connect(analyser);
      noiseStreamRef.current = stream;
      noiseAudioContextRef.current = context;
      noiseAnalyserRef.current = analyser;
      noiseRunningRef.current = true;
      setNoisePermission('active');
      runLiveNoiseLoop();
    } catch (error: any) {
      if (pendingStream) cleanupMediaStream(pendingStream);
      if (pendingContext) { try { await pendingContext.close(); } catch {} }
      if (noiseRequestGenerationRef.current !== generation) return;
      setNoisePermission(error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError'
        ? 'denied'
        : 'unavailable');
    }
  }, [runLiveNoiseLoop, state.liveNoiseEnabled]);

  React.useEffect(() => {
    if (!state.liveNoiseEnabled) {
      stopLiveNoise();
      return;
    }
    void startLiveNoise();
    return stopLiveNoise;
  }, [app.activeClassId, state.liveNoiseEnabled, startLiveNoise, stopLiveNoise]);

  const stopRitual = React.useCallback(() => {
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    ritualTimer.current = null;
    setRitualAction(null);
    setCueIndex(0);
    setCueClock(null);
  }, []);

  const showCue = React.useCallback((action: ClassMascotAction, index: number, durationOverride?: number) => {
    const cue = MASCOT_CLASSROOM_CUES[action]?.[index];
    if (!cue) {
      stopRitual();
      return;
    }
    const duration = durationOverride ?? cue.durationMs;
    const now = Date.now();
    setCueIndex(index);
    setClockNow(now);
    setCueClock(duration === undefined ? null : { remainingMs: duration, endsAt: now + duration });
  }, [stopRitual]);

  React.useEffect(() => {
    if (!ritualAction || cueClock?.endsAt == null) return;
    const timer = setTimeout(
      () => showCue(ritualAction, cueIndex + 1),
      Math.max(0, cueClock.endsAt - Date.now()),
    );
    const ticker = ritualAction === 'read' ? setInterval(() => setClockNow(Date.now()), 200) : undefined;
    return () => {
      clearTimeout(timer);
      if (ticker !== undefined) clearInterval(ticker);
    };
  }, [cueClock, cueIndex, ritualAction, showCue]);

  const triggerRitual = React.useCallback((event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (!isClassMascotAction(action)) return;
    if (state.quietMode) return;
    // Only the latest chosen ritual may finish; never queue background surprises.
    stopRitual();
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setSurpriseActive(false);
    setReactionActive(false);
    setRitualTick(tick => tick + 1);
    setRitualAction(action);

    if (MASCOT_CLASSROOM_CUES[action]) showCue(action, 0);
    else ritualTimer.current = setTimeout(stopRitual, action === 'calm' ? 5400 : 1750);
  }, [showCue, state.quietMode, stopRitual]);

  const triggerSurprise = React.useCallback(() => {
    if (state.quietMode) return;
    stopRitual();
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    setSurpriseTick(tick => tick + 1);
    setSurpriseActive(true);
    surpriseTimer.current = setTimeout(() => {
      setSurpriseActive(false);
      surpriseTimer.current = null;
    }, 1900);
  }, [state.quietMode, stopRitual]);

  React.useEffect(() => {
    window.addEventListener(MASCOT_SURPRISE_EVENT, triggerSurprise);
    window.addEventListener(MASCOT_RITUAL_EVENT, triggerRitual);
    return () => {
      window.removeEventListener(MASCOT_SURPRISE_EVENT, triggerSurprise);
      window.removeEventListener(MASCOT_RITUAL_EVENT, triggerRitual);
      if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
      if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
      if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    };
  }, [triggerSurprise, triggerRitual]);

  // A shared cockpit component can remain mounted while switching classes:
  // reset temporary gesture state instead of showing the previous class's ritual.
  React.useEffect(() => {
    stopRitual();
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setSurpriseActive(false);
    setReactionActive(false);
    setCoveringEars(false);
  }, [app.activeClassId, state.quietMode, stopRitual]);

  const reactToTap = () => {
    if (state.quietMode) return;
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setReactionTick(tick => tick + 1);
    setReactionActive(true);
    reactionTimer.current = setTimeout(() => {
      setReactionActive(false);
      reactionTimer.current = null;
    }, 750);
  };

  const cues = !state.quietMode && ritualAction ? MASCOT_CLASSROOM_CUES[ritualAction] : undefined;
  const cue = cues?.[cueIndex];
  const isReading = ritualAction === 'read';
  const chooseReadingTime = isReading && cueIndex === 0;
  const mimiReading = cue && isReading && state.kind === 'cat'
    ? chooseReadingTime ? 'ready' : cueClock ? 'reading' : 'finished'
    : undefined;
  const isLastCue = cueIndex === (cues?.length ?? 0) - 1;
  const isPaused = cueClock?.endsAt === null;
  const readingSeconds = cueClock
    ? Math.ceil(Math.max(0, cueClock.endsAt === null ? cueClock.remainingMs : cueClock.endsAt - clockNow) / 1000)
    : 0;
  const readingTime = `${Math.floor(readingSeconds / 60)}:${String(readingSeconds % 60).padStart(2, '0')}`;
  const toggleCuePause = () => {
    const now = Date.now();
    setClockNow(now);
    setCueClock(clock => {
      if (!clock) return null;
      if (clock.endsAt === null) return { ...clock, endsAt: now + clock.remainingMs };
      return { endsAt: null, remainingMs: Math.max(0, clock.endsAt - now) };
    });
  };

  const readingTimerDisplay = isReading && cueClock && (
    <div role="timer" aria-label="Verbleibende Lesezeit"
      className="self-center text-center text-2xl font-black tabular-nums text-emerald-900">
      {readingTime}
    </div>
  );

  const liveLabel = noisePermission === 'active'
    ? `LIVE ${Math.round(liveVolume)}`
    : noisePermission === 'requesting'
      ? 'LIVE …'
      : noisePermission === 'denied'
        ? 'Mikrofon blockiert'
        : noisePermission === 'unavailable'
          ? 'Kein Mikrofon'
          : 'LIVE';

  return (
    <section data-practice-root="pet" data-mascot-reaction={reactionActive} aria-label="Klassenmaskottchen" className={`class-mascot-v1 class-mascot-freestanding pointer-events-none relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-transparent p-0 ${mimiReading ? 'class-mascot-reading-stage flex-col' : ''}`}>
      <button
        type="button"
        aria-label={state.name + (state.quietMode
          ? ' – Klassenmaskottchen in Tafelruhe; verschieben mit Ziehen oder Pfeiltasten'
          : coveringEars
            ? ' – Klassenmaskottchen: Live-Pegel über der eingestellten Grenze; hält sich die Ohren zu'
            : ' – Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen (Umschalt für Feinschritt); antippen für eine Reaktion')}
        onClick={reactToTap}
        onDoubleClick={triggerSurprise}
        className={`class-mascot-character pointer-events-none mx-auto flex max-w-full shrink-0 touch-none cursor-grab items-end justify-center bg-transparent p-0 active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 ${mimiReading ? 'min-h-0 flex-1' : ''}`}
        style={{ width: `min(100%, ${state.displaySize}px)` }}
      >
        <span className={`pointer-events-none block w-full ${mimiReading ? 'h-full min-h-0' : ''}`}>
          <ClassMascotArtwork
            kind={state.kind}
            mood={state.mood}
            name={state.name}
            animationEnabled={state.animationEnabled && !state.quietMode}
            reactionActive={reactionActive && !state.quietMode}
            reactionTick={reactionTick}
            accessory={state.accessory}
            season={state.season}
            surpriseActive={surpriseActive && !state.quietMode}
            surpriseTick={surpriseTick}
            ritualAction={state.quietMode ? null : ritualAction}
            ritualTick={ritualTick}
            readingPhase={mimiReading}
            coveringEars={coveringEars && !state.quietMode}
          />
        </span>
      </button>

      {cue && (
        <div data-mascot-cue={ritualAction}
          className={`rounded-xl border border-emerald-900/20 bg-white px-1 py-1 text-slate-900 shadow-md ${mimiReading ? 'mx-1 mb-1 w-[calc(100%-0.5rem)] shrink-0' : 'absolute inset-x-1 bottom-1'}`}>
          <div role="status" className={`px-1 text-center font-bold leading-tight ${mimiReading && cueClock ? 'text-sm' : 'text-[clamp(.82rem,7cqw,1.125rem)]'}`}>
            {!isReading && cues && cues.length > 1 && <span className="block text-xs font-semibold text-emerald-800">{cueIndex + 1} von {cues.length}</span>}
            {cue.text}
            {isPaused && <span className="block text-xs text-slate-600">Pausiert</span>}
          </div>
          {!mimiReading && readingTimerDisplay}
          {chooseReadingTime && (
            <div role="group" aria-label="Dauer der Lesezeit" className="flex justify-evenly">
              {MASCOT_READING_MINUTES.map(minutes => (
                <button key={minutes} type="button" className={cueButtonClass}
                  aria-label={minutes + ' Minuten lesen'} onClick={() => showCue('read', 1, minutes * 60_000)}>
                  {minutes} min
                </button>
              ))}
            </div>
          )}
          <div role="group" aria-label="Ritualsteuerung" className={mimiReading && cueClock ? 'flex items-center justify-between' : 'flex justify-center'}>
            {cueClock && (
              <button type="button" aria-label={isPaused ? 'Ritual fortsetzen' : 'Ritual pausieren'}
                title={isPaused ? 'Fortsetzen' : 'Pausieren'} onClick={toggleCuePause} className={cueButtonClass}>
                {isPaused ? <Play size={19} aria-hidden="true" /> : <Pause size={19} aria-hidden="true" />}
              </button>
            )}
            {mimiReading && readingTimerDisplay}
            {!chooseReadingTime && !(isReading && cueClock) && ritualAction && (!cueClock || !isLastCue) && (
              <button type="button" aria-label={isLastCue ? 'Ritual abschließen' : 'Nächster Schritt'}
                title={isLastCue ? 'Abschließen' : 'Weiter'} onClick={() => showCue(ritualAction, cueIndex + 1)} className={cueButtonClass}>
                {isLastCue ? <Check size={22} aria-hidden="true" /> : <ChevronRight size={22} aria-hidden="true" />}
              </button>
            )}
            <button type="button" aria-label="Ritual beenden" title="Beenden" onClick={stopRitual}
              className={cueButtonClass}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {state.liveNoiseEnabled && !cue && (
        <div
          data-mascot-live-noise={noisePermission}
          aria-label={noisePermission === 'active'
            ? `Maskottchen-Live-Pegel ${Math.round(liveVolume)} von 100`
            : liveLabel}
          className={`class-mascot-live-noise absolute bottom-0 left-1/2 flex min-w-[7rem] -translate-x-1/2 items-center gap-2 rounded-full border bg-white/95 px-2.5 py-1 text-[10px] font-black shadow-sm backdrop-blur ${
            coveringEars ? 'border-rose-300 text-rose-700' : 'border-slate-200 text-slate-700'
          }`}
        >
          <span aria-hidden="true">{coveringEars ? '🙉' : '🎤'}</span>
          <span className="whitespace-nowrap">{liveLabel}</span>
          {noisePermission === 'active' && (
            <span className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <span
                className={`block h-full rounded-full ${coveringEars ? 'bg-rose-500' : 'bg-teal-500'}`}
                style={{ width: `${Math.max(3, Math.min(100, liveVolume))}%` }}
              />
            </span>
          )}
        </div>
      )}
    </section>
  );
}
