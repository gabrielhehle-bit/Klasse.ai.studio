import type { CockpitAlarmSound } from './cockpitCountdown';

export function playCockpitCountdownAlarm(ctx: AudioContext, soundType: CockpitAlarmSound) {
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
}
