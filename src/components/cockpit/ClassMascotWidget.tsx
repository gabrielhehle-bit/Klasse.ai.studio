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
 * A transparent figure with silent actions and an optional reaction to local noise.
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

  // Live level is intentionally session-local. The microphone stream, analyser
  // buffers and current level never enter app state, backups or account sync.
  const [noisePermission, setNoisePermission] = React.useState<NoisePermissionState>('idle');
  const [coveringEars, setCoveringEars] = React.useState(false);
  const noiseStreamRef = React.useRef<MediaStream | null>(null);
  const noiseAudioContextRef = React.useRef<AudioContext | null>(null);
  const noiseAnalyserRef = React.useRef<AnalyserNode | null>(null);
  const noiseAnimationFrameRef = React.useRef<number | null>(null);
  const noiseLevelRef = React.useRef(0);
  const noiseRunningRef = React.useRef(false);
  const noiseRequestGenerationRef = React.useRef(0);

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

  const stopRitual = React.useCallback(() => setRitualAction(null), []);

  const triggerRitual = React.useCallback((event: Event) => {
    const action = (event as CustomEvent<unknown>).detail;
    if (action === null) {
      stopRitual();
      return;
    }
    if (!isClassMascotAction(action)) return;
    if (state.quietMode) return;
    if (surpriseTimer.current !== null) clearTimeout(surpriseTimer.current);
    if (reactionTimer.current !== null) clearTimeout(reactionTimer.current);
    setSurpriseActive(false);
    setReactionActive(false);
    setRitualTick(tick => tick + 1);
    setRitualAction(action);
  }, [state.quietMode, stopRitual]);

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

  const mimiReading = !state.quietMode && ritualAction === 'read' && state.kind === 'cat';

  return (
    <section data-practice-root="pet" data-mascot-reaction={reactionActive}
      data-mascot-live-noise={state.liveNoiseEnabled ? noisePermission : undefined}
      aria-label="Klassenmaskottchen"
      className="class-mascot-v1 class-mascot-freestanding pointer-events-none relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-transparent p-0">
      <button
        type="button"
        aria-label={state.name + (state.quietMode
          ? ' – Klassenmaskottchen in Tafelruhe'
          : ' – Klassenmaskottchen') + '. Ziehen oder Pfeiltasten zum Verschieben. Doppelklick, Doppeltipp oder Eingabetaste für Aktionen.'}
        aria-haspopup="menu"
        onClick={reactToTap}
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
            readingPhase={mimiReading ? 'reading' : undefined}
            coveringEars={coveringEars && !state.quietMode}
          />
        </span>
      </button>

    </section>
  );
}
