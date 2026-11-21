import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Mic, RotateCcw } from 'lucide-react';
import type { CockpitWidgetConfig } from '../../../types';
import { calculateRawVolume, cleanupMediaStream, computeSmoothedVolume } from '../../../lib/noisemeterAlgorithm';

type Animal = {
  name: string;
  artwork: string;
  row: 1 | 2;
  column: number;
  movement?: 'swim' | 'hover';
};

const forestAnimals: readonly Animal[] = [
  { name: 'Igel', artwork: 'igel', row: 2, column: 1 },
  { name: 'Eichhörnchen', artwork: 'eichhoernchen', row: 2, column: 5 },
  { name: 'Reh', artwork: 'reh', row: 1, column: 2 },
  { name: 'Fuchs', artwork: 'fuchs', row: 2, column: 9 },
  { name: 'Eule', artwork: 'eule', row: 1, column: 8 },
];
const scenes = {
  forest: {
    label: 'Waldlichtung',
    background: '/cockpit/waldruhe.webp',
    idle: 'Wer wohnt im Wald?',
    waiting: 'Der Wald wartet …',
    quiet: 'Der Wald lauscht …',
    animals: forestAnimals,
  },
  aquarium: {
    label: 'Aquarium',
    background: '/cockpit/waldruhe-aquarium.webp',
    idle: 'Wer lebt im Aquarium?',
    waiting: 'Das Aquarium wartet …',
    quiet: 'Ganz ruhig im Aquarium …',
    animals: [
      { name: 'Neonfisch', artwork: 'neonfisch', row: 1, column: 2, movement: 'swim' },
      { name: 'Guppy', artwork: 'guppy', row: 1, column: 8, movement: 'swim' },
      { name: 'Garnele', artwork: 'garnele', row: 2, column: 9, movement: 'hover' },
      { name: 'Rennschnecke', artwork: 'rennschnecke', row: 2, column: 1 },
      { name: 'Panzerwels', artwork: 'panzerwels', row: 2, column: 5, movement: 'hover' },
    ] satisfies readonly Animal[],
  },
  meadow: {
    label: 'Vorarlberger Bergwiese',
    background: '/cockpit/waldruhe-bergwiese.webp',
    idle: 'Wer lebt auf der Bergwiese?',
    waiting: 'Die Bergwiese wartet …',
    quiet: 'Die Bergwiese lauscht …',
    animals: [
      { name: 'Gämse', artwork: 'gaemse', row: 2, column: 5 },
      { name: 'Steinbock', artwork: 'steinbock', row: 1, column: 2 },
      { name: 'Alpendohle', artwork: 'alpendohle', row: 1, column: 8, movement: 'hover' },
      { name: 'Schmetterling', artwork: 'schmetterling', row: 2, column: 1 },
      { name: 'Murmeltier', artwork: 'murmeltier', row: 2, column: 9 },
    ] satisfies readonly Animal[],
  },
} as const;
type Scene = keyof typeof scenes;
const sceneNames = Object.keys(scenes) as Scene[];
const resolveScene = (value: unknown): Scene => sceneNames.find(name => name === value) ?? 'forest';
const emptySceneState = <T,>(create: () => T) =>
  Object.fromEntries(sceneNames.map(name => [name, create()])) as Record<Scene, T>;
const emptyRound = () => ({ count: 0, quietMs: 0, loudMs: 0, aboveMs: 0, aboveLimit: false });
const emptyProgress = () => emptySceneState(emptyRound);
const emptyDisplay = () => emptySceneState(() => ({ count: 0, quietTenths: 0 }));
const thresholds = [12, 18, 26, 35, 48];
const workModes = [
  { label: 'Stillarbeit', tolerance: 1 },
  { label: 'Flüsterarbeit', tolerance: 3 },
  { label: 'Partnerarbeit', tolerance: 5 },
] as const;
const durations = [5, 15, 30, 60, 120, 180, 300];
const noiseGraceOptions = [0, 1000, 2000];
const control = 'min-h-11 rounded-lg border px-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';
const button = `${control} border-slate-300 bg-white font-semibold text-slate-800 hover:bg-slate-100`;
const primaryButton = `${control} waldruhe-primary border-transparent bg-emerald-700 font-bold hover:bg-emerald-800`;

type ActiveMode = 'live' | 'demo';
type Mode = 'idle' | 'requesting' | ActiveMode | 'paused-live' | 'paused-demo' | 'requesting-check' | 'checking';
type Signal = 'quiet' | 'loud' | 'unavailable';
interface Props {
  widget: CockpitWidgetConfig;
  isMinimized: boolean;
  showSettings: boolean;
  onCloseSettings: () => void;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
}

export function WaldruheWidget({ widget, isMinimized, showSettings, onCloseSettings, onUpdate }: Props) {
  const saved = widget.settings?.waldruhe;
  const tolerance = Number.isInteger(saved?.tolerance) && saved.tolerance >= 1 && saved.tolerance <= 5 ? saved.tolerance as number : 3;
  const seconds = durations.includes(saved?.seconds) ? saved.seconds as number : 15;
  const hideAnimals = saved?.hideAnimals === true;
  const scene = resolveScene(saved?.scene);
  const showCountdown = saved?.showCountdown !== false;
  const noiseGraceMs = noiseGraceOptions.includes(saved?.noiseGraceMs) ? saved.noiseGraceMs as number : 1000;
  const settings = { tolerance, seconds, hideAnimals, scene, showCountdown, noiseGraceMs };
  const options = useRef(settings);
  options.current = settings;

  const [mode, setMode] = useState<Mode>('idle');
  const checkingMicrophone = mode === 'requesting-check' || mode === 'checking';
  const [display, setDisplay] = useState(emptyDisplay);
  const [signal, setSignal] = useState<Signal>('quiet');
  const [signalLevel, setSignalLevel] = useState<number | null>(null);
  const [demoLoud, setDemoLoud] = useState(false);
  const [error, setError] = useState('');
  const demoSignal = useRef(false);
  const progress = useRef(emptyProgress());
  const session = useRef<{ stream?: MediaStream; audio?: AudioContext; timer?: number; startRound?: () => void }>({});

  const reset = useCallback(() => {
    progress.current = emptyProgress();
    setDisplay(emptyDisplay());
    setSignal('quiet');
    setSignalLevel(null);
  }, []);

  const resetScene = () => {
    progress.current[scene] = emptyRound();
    setDisplay(previous => ({ ...previous, [scene]: { count: 0, quietTenths: 0 } }));
    setSignal('quiet');
  };

  const release = useCallback(() => {
    const current = session.current;
    session.current = {};
    window.clearInterval(current.timer);
    if (current.stream) cleanupMediaStream(current.stream);
    if (current.audio && current.audio.state !== 'closed') void current.audio.close().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    release();
    reset();
    setError('');
    setMode('idle');
  }, [release, reset]);

  const pause = useCallback(() => {
    release();
    for (const round of Object.values(progress.current)) {
      round.loudMs = 0;
      round.aboveMs = 0;
      round.aboveLimit = false;
    }
    setSignal('quiet');
    setSignalLevel(null);
    setMode(previous => previous === 'checking' || previous === 'requesting-check' ? 'idle'
      : previous === 'demo' ? 'paused-demo'
      : previous === 'live' || previous === 'requesting' ? 'paused-live' : previous);
  }, [release]);

  useLayoutEffect(() => {
    window.addEventListener('pagehide', pause);
    return () => {
      window.removeEventListener('pagehide', pause);
      release();
    };
  }, [pause, release]);
  useLayoutEffect(() => {
    if (isMinimized) pause();
  }, [isMinimized, pause]);
  useLayoutEffect(() => {
    if (!showSettings && checkingMicrophone) stop();
  }, [showSettings, checkingMicrophone, stop]);

  function run(nextMode: ActiveMode | 'checking', readLevel: () => number | null) {
    window.clearInterval(session.current.timer);
    setMode(nextMode);
    let previous = performance.now();
    session.current.timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(250, now - previous);
      previous = now;
      if (document.hidden) return;
      const level = readLevel();
      if (nextMode !== 'demo') setSignalLevel(level);
      if (nextMode === 'checking') return;

      const currentScene = options.current.scene;
      const round = progress.current[currentScene];
      const updateDisplay = () => {
        const { count, quietMs } = round;
        const quietTenths = Math.floor(quietMs / 100);
        setDisplay(previous => previous[currentScene].count === count && previous[currentScene].quietTenths === quietTenths
          ? previous : { ...previous, [currentScene]: { count, quietTenths } });
      };
      if (level === null) {
        setSignal('unavailable');
        round.aboveMs = 0;
        round.aboveLimit = false;
        round.loudMs = 0;
        return;
      }

      const threshold = thresholds[options.current.tolerance - 1];
      const aboveLimit = level > threshold * (round.aboveLimit ? 0.8 : 1);
      round.aboveLimit = aboveLimit;
      round.aboveMs = aboveLimit ? round.aboveMs + elapsed : 0;
      const paused = aboveLimit && round.aboveMs >= options.current.noiseGraceMs;
      setSignal(paused ? 'loud' : 'quiet');

      // A brief sound banks no quiet time and leaves already earned progress intact.
      round.loudMs = paused ? round.loudMs + elapsed : 0;
      if (aboveLimit) {
        if (options.current.hideAnimals && round.loudMs >= 1800) {
          round.loudMs = 0;
          round.quietMs = 0;
          round.count = Math.max(0, round.count - 1);
          updateDisplay();
        }
        return;
      }
      if (round.count === scenes[currentScene].animals.length) return;
      round.quietMs += elapsed;
      const required = nextMode === 'demo' ? 3000 : options.current.seconds * 1000;
      if (round.quietMs >= required) {
        round.quietMs = 0;
        round.count += 1;
      }
      updateDisplay();
    }, 100);
  }

  async function startMicrophone(action: 'start' | 'resume' | 'check' = 'start') {
    if (isMinimized) return;
    const resume = action === 'resume';
    if (resume) {
      release();
      setError('');
    } else stop();
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setError(resume ? 'Das Mikrofon ist hier nicht verfügbar. Deine Ruhezeit bleibt erhalten.'
        : 'Das Mikrofon ist hier nicht verfügbar. Du kannst die Waldruhe ohne Mikrofon testen.');
      return;
    }
    const current = session.current;
    setMode(action === 'check' ? 'requesting-check' : 'requesting');
    try {
      const audio = new AudioContext();
      current.audio = audio;
      const ready = audio.resume().then(() => true, () => false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (session.current !== current) {
        cleanupMediaStream(stream);
        return;
      }
      current.stream = stream;
      const resumed = await ready;
      if (session.current !== current) return;
      if (!resumed) throw new Error('AudioContext could not resume');

      const analyser = audio.createAnalyser();
      analyser.fftSize = 256;
      // The sample loop already smooths the level. A second decay inside the
      // analyser would make a short noise count as sustained even after it ended.
      analyser.smoothingTimeConstant = 0;
      audio.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.frequencyBinCount);
      let volume = 0;
      for (const track of stream.getAudioTracks()) {
        track.addEventListener('ended', () => {
          if (session.current !== current) return;
          pause();
          setError(current.startRound
            ? 'Die Mikrofonverbindung wurde getrennt. Du kannst den Check erneut starten.'
            : 'Die Mikrofonverbindung wurde getrennt. Tippe auf „Fortsetzen“, um sie neu zu starten.');
        }, { once: true });
      }
      const readLevel = () => {
        if (audio.state !== 'running' || stream.getAudioTracks().every(track => track.muted)) return null;
        analyser.getByteFrequencyData(samples);
        volume = computeSmoothedVolume(volume, calculateRawVolume(samples, 1), 0.4);
        return volume;
      };
      if (action === 'check') {
        current.startRound = () => {
          delete current.startRound;
          run('live', readLevel);
        };
      }
      run(action === 'check' ? 'checking' : 'live', readLevel);
    } catch (cause) {
      if (session.current !== current) return;
      const denied = cause instanceof Error && cause.name === 'NotAllowedError';
      if (resume) {
        pause();
        setError(denied ? 'Erlaube das Mikrofon im Browser und tippe erneut auf „Fortsetzen“.'
          : 'Das Mikrofon konnte nicht gestartet werden. Deine Ruhezeit bleibt erhalten.');
      } else {
        stop();
        setError(denied ? 'Erlaube das Mikrofon im Browser oder starte den Testmodus.'
          : 'Das Mikrofon konnte nicht gestartet werden. Du kannst den Testmodus verwenden.');
      }
    }
  }

  function setTestVolume(loud: boolean) {
    demoSignal.current = loud;
    setDemoLoud(loud);
  }

  function startDemo(resume = false) {
    if (isMinimized) return;
    if (resume) setError('');
    else {
      stop();
      setTestVolume(false);
    }
    run('demo', () => demoSignal.current ? 100 : 0);
  }

  function updateSettings(changes: Partial<typeof settings>) {
    onUpdate({ settings: { ...widget.settings, waldruhe: { ...settings, ...changes } } });
  }

  const threshold = thresholds[tolerance - 1];
  const overThreshold = signalLevel !== null && signalLevel > threshold;
  const setting = scenes[scene];
  const animals: readonly Animal[] = setting.animals;
  const { count, quietTenths } = display[scene];
  const running = mode === 'live' || mode === 'demo';
  const paused = mode === 'paused-live' || mode === 'paused-demo';
  const allAnimals = count === animals.length;
  const requiredTenths = mode === 'demo' || mode === 'paused-demo' ? 30 : seconds * 10;
  const reachedTenths = Math.min(quietTenths, requiredTenths);
  const remainingSeconds = Math.ceil((requiredTenths - reachedTenths) / 10);
  const message = mode === 'idle' || checkingMicrophone ? setting.idle
    : mode === 'requesting' ? 'Mikrofon wird angefragt …'
    : paused ? 'Waldruhe pausiert'
    : allAnimals ? 'Alle Tiere sind da!'
    : signal === 'unavailable' ? 'Mikrofonsignal fehlt'
    : signal === 'loud' ? setting.waiting
    : count === 0 ? setting.quiet : 'Schau, wer da ist!';
  const workMode = workModes.find(workMode => workMode.tolerance === tolerance)?.label ?? `Lautstärkestufe ${tolerance}`;
  const microphoneStatus = mode === 'requesting' || mode === 'requesting-check' ? 'Mikrofon wird verbunden'
    : mode === 'checking' ? 'Mikrofoncheck'
    : mode !== 'live' ? 'Mikrofon aus'
    : signalLevel === null ? 'Kein Mikrofonsignal' : 'Mikrofon aktiv';

  return (
    <div data-practice-root="waldruhe" data-waldruhe-scene={scene} data-waldruhe-mode={mode}
      className="flex h-full min-h-0 w-full flex-col gap-1.5 overflow-hidden p-2 text-slate-900 dark:text-slate-100">
      <div className="relative min-h-0 flex-1">
        <div className="relative isolate flex h-full min-h-0 flex-col gap-1 overflow-hidden rounded-xl bg-emerald-950 bg-cover bg-center p-1.5 [container-type:size]"
          data-waldruhe-landscape data-waldruhe-still={signal !== 'quiet' || !running}
          aria-hidden={showSettings || undefined}
          style={{ backgroundImage: `linear-gradient(#071e24b3, transparent 32%, transparent 68%, #071e2480), url(${setting.background})` }}>
          <div className="flex items-start justify-between gap-1">
            <p data-waldruhe-scene-label className="rounded-lg px-2 py-0.5 text-[clamp(.75rem,3.4cqw,1.125rem)] font-bold leading-snug" role="status">{message}</p>
            <p data-waldruhe-scene-label className="shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-[clamp(.6875rem,2.8cqw,.9375rem)] font-semibold leading-snug" aria-live="polite">
              {count} von {animals.length} Tieren
            </p>
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-12 grid-rows-2 gap-y-1">
            {animals.slice(0, count).map(animal => (
              <figure key={animal.name} data-waldruhe-animal={animal.artwork}
                className="m-0 flex min-h-0 min-w-0 flex-col items-center justify-end gap-0.5 text-center"
                style={{ gridColumn: `${animal.column} / span 4`, gridRow: animal.row }}>
                <div className="waldruhe-animal-art relative flex min-h-0 w-full flex-1 justify-center">
                  <img alt="" draggable={false} src={`/cockpit/waldruhe-tiere/${animal.artwork}.webp`}
                    data-waldruhe-movement={animal.movement}
                    className="relative block h-full w-full max-w-[15rem] object-contain object-bottom" />
                </div>
                <figcaption data-waldruhe-scene-label className="max-w-full shrink-0 rounded-full px-1.5 text-[clamp(.625rem,2.8cqw,1rem)] font-semibold leading-snug">{animal.name}</figcaption>
              </figure>
            ))}
          </div>
          <div className="flex min-h-6 items-center">
            {(running || paused) && !allAnimals && showCountdown && (
              <div data-waldruhe-scene-label className="flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-[clamp(.6875rem,2.7cqw,.9375rem)] font-semibold">
                <span>{signal === 'unavailable' ? 'Kein Mikrofonsignal' : signal === 'loud' ? 'Ruhezeit pausiert' : 'Nächstes Tier'}</span>
                <div role="progressbar" aria-label="Ruhezeit bis zum nächsten Tier" aria-valuemin={0}
                  aria-valuemax={requiredTenths} aria-valuenow={reachedTenths}
                  className="h-1.5 min-w-4 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div aria-hidden="true" className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-100 ${running && signal === 'quiet' ? 'bg-emerald-300' : 'bg-amber-300'}`}
                    style={{ width: `${100 * reachedTenths / requiredTenths}%` }} />
                </div>
                <span className="shrink-0 tabular-nums">{remainingSeconds} s</span>
              </div>
            )}
          </div>
        </div>

        {showSettings && (
          <div className="absolute inset-0 z-10 overflow-y-auto overscroll-contain rounded-xl border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900" aria-label="Waldruhe-Einstellungen" role="region">
            <div className="grid grid-cols-2 gap-x-2 gap-y-1">
              <fieldset className="col-span-2 min-w-0 rounded-lg border border-slate-200 bg-white p-2">
                <legend className="px-1 font-semibold">Lautstärke für die Arbeitsform</legend>
                <div className="flex flex-wrap gap-1.5">
                  {workModes.map(workMode => (
                    <button key={workMode.tolerance} type="button"
                      className={button + ' flex-1 aria-pressed:border-emerald-700 aria-pressed:bg-emerald-100'}
                      aria-pressed={tolerance === workMode.tolerance}
                      onClick={() => updateSettings({ tolerance: workMode.tolerance })}>
                      {workMode.label}
                    </button>
                  ))}
                </div>
                {mode === 'idle' && (
                  <button type="button" className={`${button} mt-2 inline-flex items-center gap-1.5`}
                    onClick={() => void startMicrophone('check')}>
                    <Mic size={16} aria-hidden="true" />
                    Mikrofon prüfen
                  </button>
                )}
                {(checkingMicrophone || (mode === 'live' && signalLevel !== null)) && (
                  <div className="mt-2 space-y-1 rounded-md bg-slate-50 p-2">
                    <div className="flex flex-wrap justify-between gap-1 text-xs font-semibold">
                      <span>Mikrofonpegel</span>
                      <span role={checkingMicrophone ? 'status' : undefined}>
                        {mode === 'requesting-check' ? 'Mikrofon wird angefragt …'
                          : signalLevel === null ? 'Kein Mikrofonsignal'
                          : overThreshold ? 'Über der Grenze' : 'Grenze eingehalten'}
                      </span>
                    </div>
                    {signalLevel !== null && (
                      <div role="meter" aria-label="Relativer Mikrofonpegel" aria-valuemin={0}
                        aria-valuemax={100} aria-valuenow={signalLevel}
                        aria-valuetext={`${signalLevel} von 100, Grenze ${threshold}`}
                        className="relative h-2.5 rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${overThreshold ? 'bg-amber-600' : 'bg-emerald-600'}`}
                          style={{ width: `${signalLevel}%` }} />
                        <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-[var(--text)]"
                          style={{ left: `${threshold}%` }} />
                      </div>
                    )}
                  </div>
                )}
                <label className="mt-2 block font-semibold">
                  Lautstärkegrenze <span className="tabular-nums text-slate-600">{tolerance} von 5</span>
                  <input aria-label="Lautstärkegrenze" className="block min-h-11 w-full accent-emerald-700"
                    type="range" min={1} max={thresholds.length} value={tolerance}
                    onChange={event => updateSettings({ tolerance: Number(event.target.value) })} />
                </label>
                <p className="text-xs text-slate-600">Eine höhere Stufe lässt mehr Geräusche zu.</p>
              </fieldset>
              <label className="col-span-2 font-semibold">Schauplatz
                <select aria-label="Schauplatz" className={'block w-full ' + button} value={scene}
                  onChange={event => updateSettings({ scene: resolveScene(event.target.value) })}>
                  {sceneNames.map(name => <option key={name} value={name}>{scenes[name].label}</option>)}
                </select>
              </label>
              <label className="font-semibold">Kurze Geräusche
                <select aria-label="Puffer für kurze Geräusche" className={'block w-full ' + button} value={noiseGraceMs}
                  onChange={event => updateSettings({ noiseGraceMs: Number(event.target.value) })}>
                  <option value={0}>Sofort reagieren</option>
                  <option value={1000}>1 Sekunde Puffer</option>
                  <option value={2000}>2 Sekunden Puffer</option>
                </select>
              </label>
              <label>Leisezeit pro Tier
                <select aria-label="Leisezeit pro Tier" className={'block w-full ' + button} value={seconds} onChange={event => updateSettings({ seconds: Number(event.target.value) })}>
                  {durations.map(duration => <option key={duration} value={duration}>{duration < 60 ? duration + ' Sekunden' : duration / 60 + (duration === 60 ? ' Minute' : ' Minuten')}</option>)}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-1.5">
                <input type="checkbox" aria-label="Tiere verstecken sich bei Lärm" checked={hideAnimals} onChange={event => updateSettings({ hideAnimals: event.target.checked })} />
                Tiere verstecken sich bei Lärm
              </label>
              <label className="flex min-h-11 items-center gap-1.5">
                <input type="checkbox" checked={showCountdown} onChange={event => updateSettings({ showCountdown: event.target.checked })} />
                Ruhezeit anzeigen
              </label>
              <button type="button" className={button} onClick={onCloseSettings}>Fertig</button>
              <p className="col-span-2">Der Ton wird nur auf diesem Gerät ausgewertet.</p>
            </div>
          </div>
        )}
      </div>

      {error && <p role="alert" className="max-h-12 shrink-0 overflow-y-auto text-sm text-amber-800 dark:text-amber-200">{error}</p>}
      <p className="min-w-0 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">
        {setting.label} · {workMode} · {microphoneStatus}
      </p>
      <div data-waldruhe-controls className="flex shrink-0 flex-wrap items-center gap-1 pr-9">
        {checkingMicrophone ? (
          <>
            {mode === 'checking' && (
              <button type="button" className={primaryButton + ' disabled:opacity-60'} disabled={signalLevel === null}
                onClick={() => {
                  session.current.startRound?.();
                  onCloseSettings();
                }}>
                Runde starten
              </button>
            )}
            <button type="button" className={button} onClick={stop}>
              {mode === 'checking' ? 'Check beenden' : 'Abbrechen'}
            </button>
          </>
        ) : paused ? (
          <>
            <button type="button"
              className={primaryButton}
              onClick={() => mode === 'paused-live' ? void startMicrophone('resume') : startDemo(true)}>
              Fortsetzen
            </button>
            <button type="button" className={button} onClick={stop}>Runde beenden</button>
          </>
        ) : (
          <>
            <button type="button" className={mode === 'demo' ? `${button} grid min-w-11 place-items-center` : primaryButton}
              title={mode === 'demo' ? 'Mikrofon starten' : undefined}
              onClick={mode === 'live' ? stop : mode === 'requesting' ? pause : () => void startMicrophone()}>
              {mode === 'demo' ? <><Mic size={16} aria-hidden="true" /><span className="sr-only">Mikrofon starten</span></>
                : mode === 'live' ? 'Mikrofon stoppen' : mode === 'requesting' ? 'Abbrechen' : 'Mikrofon starten'}
            </button>
            <button type="button" className={mode === 'demo' ? primaryButton : button} onClick={mode === 'demo' ? stop : () => startDemo()}>
              {mode === 'demo' ? 'Test beenden' : 'Ohne Mikrofon testen'}
            </button>
          </>
        )}
        {(running || paused) && (
          <button type="button" className={`${button} grid min-w-11 place-items-center`}
            title="Neu beginnen" onClick={resetScene}>
            <RotateCcw size={16} aria-hidden="true" />
            <span className="sr-only">Neu beginnen</span>
          </button>
        )}
        {mode === 'demo' && (
          <div role="group" aria-label="Lautstärke im Test simulieren" className="flex gap-1">
            <button type="button" className={button + ' aria-pressed:border-emerald-700 aria-pressed:bg-emerald-100'} aria-pressed={!demoLoud} onClick={() => setTestVolume(false)}>Leise</button>
            <button type="button" className={button + ' aria-pressed:border-emerald-700 aria-pressed:bg-emerald-100'} aria-pressed={demoLoud} onClick={() => setTestVolume(true)}>Laut</button>
          </div>
        )}
      </div>
    </div>
  );
}
