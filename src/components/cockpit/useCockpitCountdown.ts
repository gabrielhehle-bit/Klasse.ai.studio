import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adjustClassTimerMinute } from '../../lib/classTimerInput';
import {
  expireCockpitCountdown, getCockpitCountdownSeconds, parseCockpitCountdown,
  type CockpitAlarm, type CockpitCountdownRun,
} from '../../lib/cockpitCountdown';
import { playCockpitCountdownAlarm } from '../../lib/cockpitCountdownAudio';

function readCountdown(key: string): CockpitCountdownRun | null {
  try {
    return parseCockpitCountdown(window.sessionStorage.getItem(key), Date.now());
  } catch {
    return null;
  }
}

export function useCockpitCountdown(classId: string) {
  const key = `klassio-cockpit-countdown:${classId}`;
  const saved = useMemo(() => readCountdown(key), [key]);
  const [runs, setRuns] = useState<Record<string, CockpitCountdownRun | null>>({});
  const run = Object.hasOwn(runs, key) ? runs[key] : saved;
  const live = useRef({ key, run });
  live.current = { key, run };
  const audio = useRef<AudioContext | null>(null);

  const commit = useCallback((next: CockpitCountdownRun | null) => {
    if (live.current.key !== key) return;
    live.current.run = next;
    try {
      if (next) window.sessionStorage.setItem(key, JSON.stringify(next));
      else window.sessionStorage.removeItem(key);
    } catch {
      // A private browser may block storage. The open teaching session still works.
    }
    setRuns(previous => ({ ...previous, [key]: next }));
  }, [key]);

  const openAudio = useCallback(() => {
    try {
      const Audio = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!audio.current && Audio) audio.current = new Audio();
      if (audio.current?.state === 'suspended') void audio.current.resume().catch(() => {});
      return audio.current;
    } catch {
      return null;
    }
  }, []);
  const preview = useCallback((alarm: CockpitAlarm) => {
    if (alarm.muted) return;
    try {
      const context = openAudio();
      if (context) playCockpitCountdownAlarm(context, alarm.sound);
    } catch {
      // The countdown and its visual end state also work without audio.
    }
  }, [openAudio]);

  useEffect(() => () => {
    const context = audio.current;
    audio.current = null;
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }, []);

  const expire = useCallback((running: CockpitCountdownRun) => {
    // A timeout and visibilitychange can arrive together. Claim the end first.
    if (live.current.key !== key || live.current.run !== running) return;
    commit(expireCockpitCountdown(running));
    preview(running.alarm);
  }, [commit, key, preview]);

  useEffect(() => {
    if (run?.status !== 'running' || run.endsAt === null) return;
    const deadline = run.endsAt;
    let timeout: number;
    const checkEnd = () => {
      window.clearTimeout(timeout);
      const delay = deadline - Date.now();
      if (delay <= 0) expire(run);
      else timeout = window.setTimeout(checkEnd, delay);
    };
    checkEnd();
    document.addEventListener('visibilitychange', checkEnd);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener('visibilitychange', checkEnd);
    };
  }, [expire, run]);

  function start(seconds: number, alarm: CockpitAlarm) {
    if (!alarm.muted) openAudio();
    commit({ status: 'running', duration: seconds, remaining: seconds, endsAt: Date.now() + seconds * 1000, alarm });
  }

  function pause() {
    const current = live.current.run;
    if (current?.status !== 'running') return;
    const remaining = getCockpitCountdownSeconds(current, Date.now());
    if (remaining === 0) expire(current);
    else commit({ ...current, status: 'paused', remaining, endsAt: null });
  }

  function resume() {
    const current = live.current.run;
    if (current?.status !== 'paused') return;
    if (!current.alarm.muted) openAudio();
    commit({ ...current, status: 'running', endsAt: Date.now() + current.remaining * 1000 });
  }

  function adjust(delta: 1 | -1) {
    const current = live.current.run;
    if (!current || current.status === 'expired') return;
    const now = Date.now();
    const remaining = getCockpitCountdownSeconds(current, now);
    if (current.status === 'running' && (remaining === 0 || (delta === -1 && remaining <= 60))) {
      expire(current);
      return;
    }
    const next = adjustClassTimerMinute(remaining, delta);
    commit({ ...current, remaining: next, endsAt: current.endsAt === null ? null : now + next * 1000 });
  }

  function setAlarm(alarm: CockpitAlarm) {
    const current = live.current.run;
    if (!current || current.status === 'expired') return;
    if (!alarm.muted) openAudio();
    commit({ ...current, alarm });
  }

  return { run, start, pause, resume, adjust, setAlarm, preview, reset: () => commit(null) };
}

export type CockpitCountdown = ReturnType<typeof useCockpitCountdown>;

export function useCockpitCountdownSeconds(run: CockpitCountdownRun | null): number | null {
  const endsAt = run?.endsAt;
  const [, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    if (endsAt == null) return;
    const refresh = () => setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
    refresh();
    const timer = window.setInterval(refresh, 250);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [endsAt]);
  return run ? getCockpitCountdownSeconds(run, Date.now()) : null;
}
