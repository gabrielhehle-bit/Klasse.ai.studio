import { Clock, Flag, Pause, Play, X } from 'lucide-react';
import { useCockpitCountdownSeconds, type CockpitCountdown } from './useCockpitCountdown';

export function CockpitCountdownDock({ countdown, onOpen }: { countdown: CockpitCountdown; onOpen: () => void }) {
  const { run } = countdown;
  const seconds = useCockpitCountdownSeconds(run);
  if (!run || seconds === null) return null;
  const paused = run.status === 'paused';
  const expired = run.status === 'expired';
  const remaining = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className={`flex shrink-0 items-center rounded-lg border ${expired
      ? 'border-amber-500 bg-amber-50 text-amber-950'
      : 'border-slate-200 bg-slate-50 text-slate-900'}`}
      data-cockpit-countdown-status={run.status}>
      <button type="button" onClick={onOpen} aria-label="Unterrichtstimer anzeigen"
        className={`flex min-h-11 items-center gap-1.5 rounded-lg px-2 font-bold tabular-nums ${expired
          ? 'text-base hover:bg-amber-100' : 'text-sm hover:bg-slate-100'}`}>
        {expired ? <Flag aria-hidden="true" size={18} /> : <Clock aria-hidden="true" size={16} />}
        <span role={expired ? 'status' : 'timer'}>{expired ? 'Zeit vorbei' : remaining}</span>
      </button>
      {expired ? (
        <button type="button" aria-label="Timer-Endsignal schließen" title="Timer-Endsignal schließen"
          onClick={countdown.reset}
          className="grid min-h-11 min-w-11 place-items-center rounded-lg hover:bg-amber-100">
          <X aria-hidden="true" size={16} />
        </button>
      ) : (
        <button type="button" aria-label={paused ? 'Unterrichtstimer fortsetzen' : 'Unterrichtstimer pausieren'}
          onClick={paused ? countdown.resume : countdown.pause}
          className={`grid min-h-11 min-w-11 place-items-center rounded-lg border-l border-slate-200 hover:bg-slate-100 ${paused ? 'bg-amber-100' : ''}`}>
          {paused ? <Play aria-hidden="true" size={16} /> : <Pause aria-hidden="true" size={16} />}
        </button>
      )}
    </div>
  );
}
