import { useCallback, useEffect, useRef, useState } from 'react';
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
const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';

type Mode = 'idle' | 'requesting' | 'live' | 'demo';
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
  const [display, setDisplay] = useState(emptyDisplay);
  const [signal, setSignal] = useState<Signal>('quiet');
  const [signalLevel, setSignalLevel] = useState<number | null>(null);
  const [demoLoud, setDemoLoud] = useState(false);
  const [error, setError] = useState('');
  const demoSignal = useRef(false);
  const progress = useRef(emptyProgress());
  const session = useRef<{ stream?: MediaStream; audio?: AudioContext; timer?: number }>({});

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
    setMode('idle');
  }, [release, reset]);

  useEffect(() => {
    window.addEventListener('pagehide', stop);
    return () => {
      window.removeEventListener('pagehide', stop);
      release();
    };
  }, [release, stop]);
  useEffect(() => {
    if (isMinimized) stop();
  }, [isMinimized, stop]);

  function run(nextMode: 'demo' | 'live', readLevel: () => number | null) {
    setMode(nextMode);
    let previous = performance.now();
    session.current.timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(250, now - previous);
      previous = now;
      if (document.hidden) return;
      const currentScene = options.current.scene;
      const round = progress.current[currentScene];
      const updateDisplay = () => {
        const { count, quietMs } = round;
        const quietTenths = Math.floor(quietMs / 100);
        setDisplay(previous => previous[currentScene].count === count && previous[currentScene].quietTenths === quietTenths
          ? previous : { ...previous, [currentScene]: { count, quietTenths } });
      };
      const level = readLevel();
      if (nextMode === 'live') setSignalLevel(level === null ? null : Math.round(level));
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

  async function startMicrophone() {
    stop();
    setError('');
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
      setError('Das Mikrofon ist hier nicht verfügbar. Du kannst die Waldruhe ohne Mikrofon testen.');
      return;
    }
    const current = session.current;
    setMode('requesting');
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
          stop();
          setError('Die Mikrofonverbindung wurde getrennt. Du kannst sie neu starten.');
        }, { once: true });
      }
      run('live', () => {
        if (audio.state !== 'running' || stream.getAudioTracks().every(track => track.muted)) return null;
        analyser.getByteFrequencyData(samples);
        volume = computeSmoothedVolume(volume, calculateRawVolume(samples, 1), 0.4);
        return volume;
      });
    } catch (cause) {
      if (session.current !== current) return;
      stop();
      setError(cause instanceof Error && cause.name === 'NotAllowedError'
        ? 'Erlaube das Mikrofon im Browser oder starte den Testmodus.'
        : 'Das Mikrofon konnte nicht gestartet werden. Du kannst den Testmodus verwenden.');
    }
  }

  function setTestVolume(loud: boolean) {
    demoSignal.current = loud;
    setDemoLoud(loud);
  }

  function startDemo() {
    stop();
    setError('');
    setTestVolume(false);
    run('demo', () => demoSignal.current ? 100 : 0);
  }

  function updateSettings(changes: Partial<typeof settings>) {
    onUpdate({ settings: { ...widget.settings, waldruhe: { ...settings, ...changes } } });
  }

  const threshold = thresholds[tolerance - 1];
  const setting = scenes[scene];
  const animals: readonly Animal[] = setting.animals;
  const { count, quietTenths } = display[scene];
  const running = mode === 'live' || mode === 'demo';
  const allAnimals = count === animals.length;
  const requiredTenths = mode === 'demo' ? 30 : seconds * 10;
  const reachedTenths = Math.min(quietTenths, requiredTenths);
  const remainingSeconds = Math.ceil((requiredTenths - reachedTenths) / 10);
  const message = mode === 'idle' ? setting.idle
    : mode === 'requesting' ? 'Mikrofon wird angefragt …'
    : allAnimals ? 'Alle Tiere sind da!'
    : signal === 'unavailable' ? 'Mikrofonsignal fehlt'
    : signal === 'loud' ? setting.waiting
    : count === 0 ? setting.quiet : 'Schau, wer da ist!';

  return (
    <div data-practice-root="waldruhe" data-waldruhe-scene={scene} className="flex h-full min-h-0 w-full flex-col gap-2 overflow-auto p-2 text-slate-900 dark:text-slate-100">
      <div className="relative isolate flex min-h-44 flex-1 flex-col gap-1 overflow-hidden rounded-xl bg-emerald-950 bg-cover bg-center p-1.5 [container-type:size] [overflow-anchor:none]"
        data-waldruhe-landscape data-waldruhe-still={signal !== 'quiet' || !running}
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
          {running && !allAnimals && showCountdown && (
            <div data-waldruhe-scene-label className="flex w-full items-center gap-2 rounded-lg px-2 py-0.5 text-[clamp(.6875rem,2.7cqw,.9375rem)] font-semibold">
              <span>{signal === 'unavailable' ? 'Kein Mikrofonsignal' : signal === 'loud' ? 'Ruhezeit pausiert' : 'Nächstes Tier'}</span>
              <div role="progressbar" aria-label="Ruhezeit bis zum nächsten Tier" aria-valuemin={0}
                aria-valuemax={requiredTenths} aria-valuenow={reachedTenths}
                className="h-1.5 min-w-4 flex-1 overflow-hidden rounded-full bg-white/30">
                <div aria-hidden="true" className={`h-full rounded-full motion-safe:transition-[width] motion-safe:duration-100 ${signal === 'quiet' ? 'bg-emerald-300' : 'bg-amber-300'}`}
                  style={{ width: `${100 * reachedTenths / requiredTenths}%` }} />
              </div>
              <span className="shrink-0 tabular-nums">{remainingSeconds} s</span>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-1 rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900">
          <label className="col-span-2 font-semibold">Schauplatz
            <select aria-label="Schauplatz" className={'block w-full ' + button} value={scene}
              onChange={event => updateSettings({ scene: resolveScene(event.target.value) })}>
              {sceneNames.map(name => <option key={name} value={name}>{scenes[name].label}</option>)}
            </select>
          </label>
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
            <label className="mt-2 block font-semibold">
              Lautstärkegrenze <span className="tabular-nums text-slate-600">{tolerance} von 5</span>
              <input aria-label="Lautstärkegrenze" className="block min-h-11 w-full accent-emerald-700"
                type="range" min={1} max={thresholds.length} value={tolerance}
                onChange={event => updateSettings({ tolerance: Number(event.target.value) })} />
            </label>
            {mode === 'live' && signalLevel !== null && (
              <div className="my-2 space-y-1 rounded-md bg-slate-50 p-2">
                <div className="flex flex-wrap justify-between gap-1 text-xs font-semibold">
                  <span>Mikrofonpegel</span>
                  <span>{signalLevel > threshold ? 'Über der Grenze' : 'Unter der Grenze'}</span>
                </div>
                <div role="meter" aria-label="Relativer Mikrofonpegel" aria-valuemin={0}
                  aria-valuemax={100} aria-valuenow={signalLevel}
                  aria-valuetext={`${signalLevel} von 100, Grenze ${threshold}`}
                  className="relative h-2.5 rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${signalLevel > threshold ? 'bg-amber-600' : 'bg-emerald-600'}`}
                    style={{ width: `${signalLevel}%` }} />
                  <span aria-hidden="true" className="absolute inset-y-0 w-0.5 bg-slate-950"
                    style={{ left: `${threshold}%` }} />
                </div>
              </div>
            )}
            <p className="text-xs text-slate-600">Eine höhere Stufe lässt mehr Geräusche zu.</p>
          </fieldset>
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
      )}

      {error && <p role="alert" className="shrink-0 text-sm text-amber-800 dark:text-amber-200">{error}</p>}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        <button type="button" className={button}
          onClick={mode === 'live' || mode === 'requesting' ? stop : startMicrophone}>
          {mode === 'live' ? 'Mikrofon stoppen' : mode === 'requesting' ? 'Abbrechen' : 'Mikrofon starten'}
        </button>
        <button type="button" className={button} onClick={mode === 'demo' ? stop : startDemo}>
          {mode === 'demo' ? 'Test beenden' : 'Ohne Mikrofon testen'}
        </button>
        {running && <button type="button" className={button} onClick={resetScene}>Neu beginnen</button>}
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
