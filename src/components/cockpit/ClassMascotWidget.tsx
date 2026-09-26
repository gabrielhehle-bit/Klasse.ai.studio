import React from 'react';
import type { AppState } from '../../types';
import { isClassMascotAction, MASCOT_RITUAL_EVENT, MASCOT_SURPRISE_EVENT, normalizeClassMascot, type ClassMascotAction } from '../../lib/classMascot';
import {
  calculateRawVolume,
  cleanupMediaStream,
  computeSmoothedVolume,
  getSensitivityMultiplier,
  type NoisePermissionState,
} from '../../lib/noisemeterAlgorithm';
import ClassMascotArtwork from './ClassMascotArtwork';

interface Props {
  app: AppState;
  setApp?: React.Dispatch<React.SetStateAction<AppState>>;
  currentIsLight?: boolean;
}

/**
 * Deliberately only the transparent character: no name, action panel, settings
 * gear, or widget background. Optional live noise feedback is a tiny local
 * status pill beneath the figure and never stores or transmits audio.
 */
export default function ClassMascotWidget({ app }: Props) {
  const state = normalizeClassMascot(app.classMascot);
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
  const ritualTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const raw = calculateRawVolume(dataArray, getSensitivityMultiplier(state.liveNoiseSensitivity));
    const smoothed = computeSmoothedVolume(noiseLevelRef.current, raw, 0.3);
    noiseLevelRef.current = smoothed;

    const threshold = state.liveNoiseThreshold;
    setCoveringEars(previous => {
      if (state.quietMode) return false;
      // Hysteresis prevents rapid hand flicker around the selected threshold.
      return previous ? smoothed >= Math.max(0, threshold - 8) : smoothed >= threshold;
    });

    const now = performance.now();
    if (now - lastNoiseRenderRef.current >= 80) {
      lastNoiseRenderRef.current = now;
      setLiveVolume(smoothed);
    }
    noiseAnimationFrameRef.current = requestAnimationFrame(runLiveNoiseLoop);
  }, [state.liveNoiseSensitivity, state.liveNoiseThreshold, state.quietMode]);

  const startLiveNoise = React.useCallback(async () => {
    if (!state.liveNoiseEnabled || noiseRunningRef.current) return;
    const generation = ++noiseRequestGenerationRef.current;
    setNoisePermission('requesting');

    if (!navigator?.mediaDevices?.getUserMedia) {
      setNoisePermission('unavailable');
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
      if (noiseRequestGenerationRef.current !== generation || !state.liveNoiseEnabled) {
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
  }, [app.activeClassId, state.liveNoiseEnabled, state.liveNoiseSensitivity, startLiveNoise, stopLiveNoise]);

  const triggerRitual = React.useCallback((event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (!isClassMascotAction(action)) return;
    if (state.quietMode) return;
    // Only the latest chosen ritual may finish; never queue background surprises.
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setSurpriseActive(false);
    setReactionActive(false);
    setRitualTick(tick => tick + 1);
    setRitualAction(action);
    ritualTimer.current = setTimeout(() => {
      setRitualAction(null);
      ritualTimer.current = null;
    }, action === 'calm' ? 5400 : 1750);
  }, [state.quietMode]);

  const triggerSurprise = React.useCallback(() => {
    if (state.quietMode) return;
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    setRitualAction(null);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    setSurpriseTick(tick => tick + 1);
    setSurpriseActive(true);
    surpriseTimer.current = setTimeout(() => {
      setSurpriseActive(false);
      surpriseTimer.current = null;
    }, 1900);
  }, [state.quietMode]);

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
    if (ritualTimer.current !== null) clearTimeout(ritualTimer.current);
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setRitualAction(null);
    setSurpriseActive(false);
    setReactionActive(false);
    setCoveringEars(false);
  }, [app.activeClassId, state.quietMode]);

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
    <section aria-label="Klassenmaskottchen" className="class-mascot-v1 class-mascot-freestanding pointer-events-none relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-transparent p-0">
      <button
        type="button"
        aria-label={state.name + (state.quietMode
          ? ' – Klassenmaskottchen in Tafelruhe; verschieben mit Ziehen oder Pfeiltasten'
          : coveringEars
            ? ' – Klassenmaskottchen: Live-Pegel über der eingestellten Grenze; hält sich die Ohren zu'
            : ' – Klassenmaskottchen verschieben: ziehen oder Pfeiltasten nutzen (Umschalt für Feinschritt); antippen für eine Reaktion')}
        onClick={reactToTap}
        onDoubleClick={triggerSurprise}
        className="class-mascot-character pointer-events-none mx-auto flex max-w-full shrink-0 touch-none cursor-grab items-end justify-center bg-transparent p-0 active:cursor-grabbing focus-visible:rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500"
        style={{ width: `min(100%, ${state.displaySize}px)` }}
      >
        <span className="pointer-events-none block w-full">
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
            coveringEars={coveringEars && !state.quietMode}
          />
        </span>
      </button>

      {state.liveNoiseEnabled && (
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
