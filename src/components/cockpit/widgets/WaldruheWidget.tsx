import { useCallback, useEffect, useRef, useState } from 'react';
import type { CockpitWidgetConfig } from '../../../types';
import { calculateRawVolume, cleanupMediaStream, computeSmoothedVolume } from '../../../lib/noisemeterAlgorithm';

const animals = [
  { name: 'Igel', icon: '🦔', x: 18, y: 72 },
  { name: 'Eichhörnchen', icon: '🐿️', x: 52, y: 64 },
  { name: 'Reh', icon: '🦌', x: 34, y: 39 },
  { name: 'Fuchs', icon: '🦊', x: 79, y: 72 },
  { name: 'Eule', icon: '🦉', x: 81, y: 32 },
];
const thresholds = [12, 18, 26, 35, 48];
const durations = [5, 15, 30, 60];
const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700';

type Mode = 'idle' | 'requesting' | 'live' | 'demo';
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
  const settings = { tolerance, seconds, hideAnimals };
  const options = useRef(settings);
  options.current = settings;

  const [mode, setMode] = useState<Mode>('idle');
  const [count, setCount] = useState(0);
  const [waiting, setWaiting] = useState(false);
  const [demoLoud, setDemoLoud] = useState(false);
  const [error, setError] = useState('');
  const demoSignal = useRef(false);
  const progress = useRef({ count: 0, quietMs: 0, loudMs: 0, loud: false });
  const session = useRef<{ stream?: MediaStream; audio?: AudioContext; timer?: number }>({});

  const reset = useCallback(() => {
    progress.current = { count: 0, quietMs: 0, loudMs: 0, loud: false };
    setCount(0);
    setWaiting(false);
  }, []);

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

  function run(nextMode: 'demo' | 'live', isLoud: (wasLoud: boolean) => boolean | null) {
    setMode(nextMode);
    let previous = performance.now();
    session.current.timer = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(250, now - previous);
      previous = now;
      const round = progress.current;
      const loud = isLoud(round.loud);
      if (loud === null || document.hidden) return;
      if (round.loud !== loud) {
        round.loud = loud;
        setWaiting(loud);
      }
      if (loud) {
        round.loudMs += elapsed;
        if (options.current.hideAnimals && round.loudMs >= 1800) {
          round.loudMs = 0;
          round.quietMs = 0;
          round.count = Math.max(0, round.count - 1);
          setCount(round.count);
        }
        return;
      }
      round.loudMs = 0;
      if (round.count === animals.length) return;
      round.quietMs += elapsed;
      const required = nextMode === 'demo' ? 3000 : options.current.seconds * 1000;
      if (round.quietMs >= required) {
        round.quietMs = 0;
        round.count += 1;
        setCount(round.count);
      }
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
      run('live', (wasLoud) => {
        if (audio.state !== 'running' || stream.getAudioTracks().every(track => track.muted)) return null;
        analyser.getByteFrequencyData(samples);
        volume = computeSmoothedVolume(volume, calculateRawVolume(samples, 1), 0.4);
        return volume > thresholds[options.current.tolerance - 1] * (wasLoud ? 0.8 : 1);
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
    run('demo', () => demoSignal.current);
  }

  function updateSettings(changes: Partial<typeof settings>) {
    onUpdate({ settings: { ...widget.settings, waldruhe: { ...settings, ...changes } } });
  }

  const message = mode === 'idle' ? 'Wer wohnt im Wald?'
    : mode === 'requesting' ? 'Mikrofon wird angefragt …'
    : waiting ? 'Der Wald wartet …'
    : count === animals.length ? 'Alle Tiere sind da!'
    : count === 0 ? 'Der Wald lauscht …' : 'Schau, wer da ist!';

  return (
    <div data-practice-root="waldruhe" className="flex h-full min-h-0 w-full flex-col gap-2 overflow-auto p-2 text-slate-900 dark:text-slate-100">
      <div className="relative isolate min-h-32 flex-1 overflow-hidden rounded-xl bg-emerald-950 bg-cover bg-center [container-type:inline-size]"
        style={{ backgroundImage: 'linear-gradient(#06281999, transparent 55%, #06281966), url(/cockpit/waldruhe.webp)' }}>
        <p className="absolute left-3 top-2 text-lg font-bold text-white drop-shadow-md min-[700px]:text-xl" role="status">{message}</p>
        {animals.slice(0, count).map(animal => (
          <figure key={animal.name} className="absolute m-0 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: animal.x + '%', top: animal.y + '%' }}>
            <span aria-hidden="true" className="block text-[clamp(1.65rem,8cqw,4.75rem)] leading-none drop-shadow-md">{animal.icon}</span>
            <figcaption className="rounded-full bg-emerald-950 px-1.5 text-[clamp(.65rem,2.4cqw,1rem)] font-semibold text-white">{animal.name}</figcaption>
          </figure>
        ))}
        <p className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-white" aria-live="polite">
          {count} von {animals.length} Tieren
        </p>
      </div>

      {showSettings && (
        <div className="grid shrink-0 grid-cols-2 gap-x-2 gap-y-1 rounded-lg border border-slate-300 bg-slate-50 p-2 text-sm text-slate-900">
          <label>Lautstärkegrenze ({tolerance}/5)
            <input className="block min-h-9 w-full accent-emerald-700" type="range" min={1} max={5} value={tolerance}
              onChange={event => updateSettings({ tolerance: Number(event.target.value) })} />
          </label>
          <label>Leisezeit pro Tier
            <select className={'block w-full ' + button} value={seconds} onChange={event => updateSettings({ seconds: Number(event.target.value) })}>
              {durations.map(duration => <option key={duration} value={duration}>{duration} Sekunden</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-1.5">
            <input type="checkbox" checked={hideAnimals} onChange={event => updateSettings({ hideAnimals: event.target.checked })} />
            Tiere verstecken sich bei Lärm
          </label>
          <button type="button" className={button} onClick={onCloseSettings}>Fertig</button>
          <p className="col-span-2">Höhere Stufen lassen mehr Geräusche zu. Der Ton wird nur auf diesem Gerät ausgewertet.</p>
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
        {(mode === 'live' || mode === 'demo') && <button type="button" className={button} onClick={reset}>Neu beginnen</button>}
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
