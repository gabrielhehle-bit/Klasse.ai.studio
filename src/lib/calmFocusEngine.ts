/**
 * calmFocusEngine.ts
 * Reines Logik- und Audio-Synthese-Modul für Fokusgeräusche (Calmrain) und Atempause (Breathing).
 * 100% offline, reine Web Audio API Synthese, keine externen CDN/Dateien, keine KI, keine Schülerdaten.
 */

export type CalmTrackId = 'rain' | 'wind' | 'fire' | 'birds' | 'stream';

export interface CalmTrackConfig {
  id: CalmTrackId;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
}

export const CALM_TRACKS: CalmTrackConfig[] = [
  { id: 'rain', label: 'Regen', sublabel: 'Sanftes Prasseln & Tropfen', icon: '🌧️', color: 'blue' },
  { id: 'wind', label: 'Wind', sublabel: 'Sanfte Waldbrise & Blätterrauschen', icon: '🍃', color: 'teal' },
  { id: 'fire', label: 'Kaminfeuer', sublabel: 'Gemütliches Knistern', icon: '🔥', color: 'amber' },
  { id: 'birds', label: 'Waldvögel', sublabel: 'Amsel & Meisen (dezent)', icon: '🐦', color: 'emerald' },
  { id: 'stream', label: 'Waldbach', sublabel: 'Ruhiges Plätschern', icon: '🌊', color: 'cyan' },
];

export interface CalmSoundSettings {
  masterVolume: number; // 0–100
  volumes: Record<CalmTrackId, number>; // 0–100 je Spur
  activeTracks: Record<CalmTrackId, boolean>;
  timerMinutes: number | 'endless'; // 5, 15, 30, 45, 60 oder 'endless'
}

export const DEFAULT_CALM_SETTINGS: CalmSoundSettings = {
  masterVolume: 70,
  volumes: {
    rain: 50,
    wind: 30,
    fire: 25,
    birds: 30,
    stream: 35,
  },
  activeTracks: {
    rain: true,
    wind: false,
    fire: false,
    birds: false,
    stream: false,
  },
  timerMinutes: 'endless',
};

export interface BreathingSettings {
  durationPreset: 30 | 60 | 120 | 'endless'; // Sekunden
  rhythm: '4-4' | '4-2-4' | '4-4-4'; // Rhythmus in Sekunden
  soundEnabled: boolean;
}

export const DEFAULT_BREATHING_SETTINGS: BreathingSettings = {
  durationPreset: 60,
  rhythm: '4-4-4',
  soundEnabled: false,
};

export type BreathingPhase = 'inhale' | 'hold' | 'exhale' | 'rest';

export interface BreathingPhaseState {
  phase: BreathingPhase;
  phaseLabel: string;
  phaseInstruction: string;
  phaseSecondsLeft: number;
  phaseTotalSeconds: number;
  progress: number; // 0.0 bis 1.0 innerhalb der Phase
  scale: number; // 1.0 (klein) bis 1.7 (groß)
}

/**
 * Validiert und bereinigt CalmSoundSettings
 */
export function sanitizeCalmSettings(raw?: any): CalmSoundSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_CALM_SETTINGS };
  }

  const masterVol = typeof raw.masterVolume === 'number'
    ? Math.max(0, Math.min(100, Math.round(raw.masterVolume)))
    : DEFAULT_CALM_SETTINGS.masterVolume;

  const validTimer = [5, 15, 30, 45, 60, 'endless'].includes(raw.timerMinutes)
    ? raw.timerMinutes
    : DEFAULT_CALM_SETTINGS.timerMinutes;

  const volumes: Record<CalmTrackId, number> = {
    rain: typeof raw.volumes?.rain === 'number' ? Math.max(0, Math.min(100, raw.volumes.rain)) : 50,
    wind: typeof raw.volumes?.wind === 'number' ? Math.max(0, Math.min(100, raw.volumes.wind)) : 30,
    fire: typeof raw.volumes?.fire === 'number' ? Math.max(0, Math.min(100, raw.volumes.fire)) : 25,
    birds: typeof raw.volumes?.birds === 'number' ? Math.max(0, Math.min(100, raw.volumes.birds)) : 30,
    stream: typeof raw.volumes?.stream === 'number' ? Math.max(0, Math.min(100, raw.volumes.stream)) : 35,
  };

  const activeTracks: Record<CalmTrackId, boolean> = {
    rain: raw.activeTracks?.rain !== undefined ? !!raw.activeTracks.rain : true,
    wind: !!raw.activeTracks?.wind,
    fire: !!raw.activeTracks?.fire,
    birds: !!raw.activeTracks?.birds,
    stream: !!raw.activeTracks?.stream,
  };

  return {
    masterVolume: masterVol,
    volumes,
    activeTracks,
    timerMinutes: validTimer,
  };
}

/**
 * Validiert und bereinigt BreathingSettings
 */
export function sanitizeBreathingSettings(raw?: any): BreathingSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_BREATHING_SETTINGS };
  }

  const durationPreset = [30, 60, 120, 'endless'].includes(raw.durationPreset)
    ? raw.durationPreset
    : DEFAULT_BREATHING_SETTINGS.durationPreset;

  const rhythm = ['4-4', '4-2-4', '4-4-4'].includes(raw.rhythm)
    ? raw.rhythm
    : DEFAULT_BREATHING_SETTINGS.rhythm;

  const soundEnabled = typeof raw.soundEnabled === 'boolean'
    ? raw.soundEnabled
    : DEFAULT_BREATHING_SETTINGS.soundEnabled;

  return {
    durationPreset,
    rhythm,
    soundEnabled,
  };
}

/**
 * Berechnet die tatsächliche Audio-Gain Amplitude (0.0001 bis 0.25)
 */
export function calculateEffectiveGain(masterVol: number, trackVol: number, isActive: boolean, baseFactor: number = 0.15): number {
  if (!isActive || masterVol <= 0 || trackVol <= 0) {
    return 0.00001;
  }
  const factor = (masterVol / 100) * (trackVol / 100);
  return Math.max(0.00001, factor * baseFactor);
}

/**
 * Berechnet Countdown-Format (z.B. "14:59")
 */
export function formatTimerSeconds(seconds: number | null): string {
  if (seconds === null || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Berechnet den aktuellen Status der Atemphasen anhand des Zyklus-Fortschritts
 */
export function calculateBreathingPhase(
  elapsedSecondsInCycle: number,
  rhythm: '4-4' | '4-2-4' | '4-4-4'
): BreathingPhaseState {
  let inhaleDur = 4;
  let holdDur = 4;
  let exhaleDur = 4;
  let restDur = 0;

  if (rhythm === '4-4') {
    inhaleDur = 4;
    holdDur = 0;
    exhaleDur = 4;
    restDur = 0;
  } else if (rhythm === '4-2-4') {
    inhaleDur = 4;
    holdDur = 2;
    exhaleDur = 4;
    restDur = 0;
  } else {
    // 4-4-4 Box style
    inhaleDur = 4;
    holdDur = 4;
    exhaleDur = 4;
    restDur = 0;
  }

  const cycleTotal = inhaleDur + holdDur + exhaleDur + restDur;
  const currentSec = Math.max(0, elapsedSecondsInCycle % cycleTotal);

  if (currentSec < inhaleDur) {
    const elapsed = currentSec;
    const left = inhaleDur - elapsed;
    const progress = (elapsed + 1) / inhaleDur;
    // Scale grows from 1.0 to 1.7
    const scale = 1.0 + (elapsed / inhaleDur) * 0.7;
    return {
      phase: 'inhale',
      phaseLabel: 'Einatmen',
      phaseInstruction: 'Ruhig und tief durch die Nase einatmen',
      phaseSecondsLeft: Math.ceil(left),
      phaseTotalSeconds: inhaleDur,
      progress: Math.min(1, Math.max(0, progress)),
      scale,
    };
  }

  let marker = inhaleDur;
  if (holdDur > 0 && currentSec < marker + holdDur) {
    const elapsed = currentSec - marker;
    const left = holdDur - elapsed;
    const progress = (elapsed + 1) / holdDur;
    return {
      phase: 'hold',
      phaseLabel: 'Anhalten',
      phaseInstruction: 'Den Atem sanft und entspannt halten',
      phaseSecondsLeft: Math.ceil(left),
      phaseTotalSeconds: holdDur,
      progress: Math.min(1, Math.max(0, progress)),
      scale: 1.7,
    };
  }
  marker += holdDur;

  if (currentSec < marker + exhaleDur) {
    const elapsed = currentSec - marker;
    const left = exhaleDur - elapsed;
    const progress = (elapsed + 1) / exhaleDur;
    // Scale shrinks from 1.7 down to 1.0
    const scale = 1.7 - (elapsed / exhaleDur) * 0.7;
    return {
      phase: 'exhale',
      phaseLabel: 'Ausatmen',
      phaseInstruction: 'Langsam und vollständig durch den Mund ausatmen',
      phaseSecondsLeft: Math.ceil(left),
      phaseTotalSeconds: exhaleDur,
      progress: Math.min(1, Math.max(0, progress)),
      scale,
    };
  }
  marker += exhaleDur;

  // Rest if any
  const elapsed = currentSec - marker;
  const left = Math.max(1, restDur - elapsed);
  return {
    phase: 'rest',
    phaseLabel: 'Ruhepause',
    phaseInstruction: 'Kurz nachspüren',
    phaseSecondsLeft: Math.ceil(left),
    phaseTotalSeconds: restDur || 1,
    progress: 1,
    scale: 1.0,
  };
}

/**
 * Web Audio Synthesizer Engine
 * Kapselt alle AudioNodes, Timer und Browser-Audio-Routinen sauber und leck-sicher.
 */
export class CalmAudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private timeouts: any[] = [];

  // Gains je Spur
  private masterGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private birdsGain: GainNode | null = null;
  private streamGain: GainNode | null = null;

  // Oscillators & Sources
  private windSource: AudioBufferSourceNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private streamSource: AudioBufferSourceNode | null = null;
  private fireHum: OscillatorNode | null = null;

  /**
   * Prüft ob AudioContext im Environment verfügbar ist
   */
  public isAudioSupported(): boolean {
    return typeof window !== 'undefined' && !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  public get running(): boolean {
    return this.isRunning;
  }

  /**
   * Startet die kontinuierliche Fokus-Klangkulisse
   */
  public start(settings: CalmSoundSettings): void {
    if (this.isRunning) {
      this.stop();
    }

    if (!this.isAudioSupported()) {
      this.isRunning = true;
      return;
    }

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      this.ctx = ctx;
      this.isRunning = true;
      this.timeouts = [];

      const now = ctx.currentTime;

      // Master Gain
      const master = ctx.createGain();
      master.gain.setValueAtTime(Math.max(0.0001, settings.masterVolume / 100), now);
      master.connect(ctx.destination);
      this.masterGain = master;

      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = sampleRate * 2;

      // 1. REGEN (Brown/Pink Noise + Filter + Droplet Transients)
      const rainBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const rainData = rainBuffer.getChannelData(0);
      let lastRainOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        rainData[i] = (lastRainOut + 0.02 * white) / 1.02;
        lastRainOut = rainData[i];
        rainData[i] *= 3.5;
      }
      const rainSource = ctx.createBufferSource();
      rainSource.buffer = rainBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(360, now);

      const rainGain = ctx.createGain();
      const rainVol = calculateEffectiveGain(100, settings.volumes.rain, settings.activeTracks.rain, 0.2);
      rainGain.gain.setValueAtTime(rainVol, now);

      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(master);
      rainSource.start(now);

      this.rainSource = rainSource;
      this.rainGain = rainGain;

      // Regierungs-Tropfen Taps
      const playRainDrops = () => {
        if (!this.isRunning || !this.ctx) return;
        try {
          if (settings.activeTracks.rain && settings.volumes.rain > 5) {
            const dropOsc = ctx.createOscillator();
            const dropGain = ctx.createGain();
            dropOsc.type = 'sine';
            const baseFreq = 1200 + Math.random() * 2400;
            const t = ctx.currentTime;
            dropOsc.frequency.setValueAtTime(baseFreq, t);
            dropOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, t + 0.006);

            const dropVol = (settings.volumes.rain / 100) * (0.01 + Math.random() * 0.03);
            dropGain.gain.setValueAtTime(dropVol, t);
            dropGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

            dropOsc.connect(dropGain);
            dropGain.connect(master);
            dropOsc.start(t);
            dropOsc.stop(t + 0.02);
          }
        } catch {}

        const nextTime = 30 + Math.random() * 120;
        const tId = setTimeout(playRainDrops, nextTime);
        this.timeouts.push(tId);
      };
      playRainDrops();

      // 2. WIND (Bandpass Filtered Noise + LFO Sweep)
      const windBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const windData = windBuffer.getChannelData(0);
      let lastWindOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        windData[i] = (lastWindOut + 0.05 * white) / 1.05;
        lastWindOut = windData[i];
        windData[i] *= 3.0;
      }
      const windSource = ctx.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(420, now);
      windFilter.Q.setValueAtTime(1.1, now);

      const windLfo = ctx.createOscillator();
      windLfo.frequency.setValueAtTime(0.07, now);
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.setValueAtTime(260, now);
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start(now);

      const windGain = ctx.createGain();
      const windVol = calculateEffectiveGain(100, settings.volumes.wind, settings.activeTracks.wind, 0.16);
      windGain.gain.setValueAtTime(windVol, now);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(master);
      windSource.start(now);

      this.windSource = windSource;
      this.windLfo = windLfo;
      this.windGain = windGain;

      // 3. KAMINFEUER (Subtles Hum + Holzknacken)
      const fireHum = ctx.createOscillator();
      fireHum.type = 'triangle';
      fireHum.frequency.setValueAtTime(62, now);
      const fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.setValueAtTime(85, now);

      const fireGain = ctx.createGain();
      const fireVol = calculateEffectiveGain(100, settings.volumes.fire, settings.activeTracks.fire, 0.12);
      fireGain.gain.setValueAtTime(fireVol, now);

      fireHum.connect(fireFilter);
      fireFilter.connect(fireGain);
      fireGain.connect(master);
      fireHum.start(now);

      this.fireHum = fireHum;
      this.fireGain = fireGain;

      const playWoodCrackles = () => {
        if (!this.isRunning || !this.ctx) return;
        try {
          if (settings.activeTracks.fire && settings.volumes.fire > 5) {
            const t = ctx.currentTime;
            const popOsc = ctx.createOscillator();
            const popGain = ctx.createGain();
            popOsc.type = 'sine';
            popOsc.frequency.setValueAtTime(2000 + Math.random() * 3200, t);
            const popVol = (settings.volumes.fire / 100) * (0.03 + Math.random() * 0.08);
            popGain.gain.setValueAtTime(popVol, t);
            popGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
            popOsc.connect(popGain);
            popGain.connect(master);
            popOsc.start(t);
            popOsc.stop(t + 0.03);
          }
        } catch {}

        const nextTime = 60 + Math.random() * 750;
        const tId = setTimeout(playWoodCrackles, nextTime);
        this.timeouts.push(tId);
      };
      playWoodCrackles();

      // 4. WALDVÖGEL (Periodische sanfte Amsel/Meise/Spatz Melodien)
      const birdsGain = ctx.createGain();
      const birdsVol = calculateEffectiveGain(100, settings.volumes.birds, settings.activeTracks.birds, 0.14);
      birdsGain.gain.setValueAtTime(birdsVol, now);
      birdsGain.connect(master);
      this.birdsGain = birdsGain;

      const playBirdChirps = () => {
        if (!this.isRunning || !this.ctx) return;
        try {
          if (settings.activeTracks.birds && settings.volumes.birds > 5) {
            const t = ctx.currentTime;
            const curVol = (settings.volumes.birds / 100) * 0.05;
            const variant = Math.floor(Math.random() * 2);

            if (variant === 0) {
              // Meisen Zweiklang
              const base = 2100 + Math.random() * 300;
              const osc1 = ctx.createOscillator();
              const gain1 = ctx.createGain();
              osc1.frequency.setValueAtTime(base, t);
              osc1.frequency.exponentialRampToValueAtTime(base - 100, t + 0.09);
              gain1.gain.setValueAtTime(curVol, t);
              gain1.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
              osc1.connect(gain1).connect(birdsGain);
              osc1.start(t);
              osc1.stop(t + 0.11);

              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              osc2.frequency.setValueAtTime(base - 400, t + 0.12);
              osc2.frequency.exponentialRampToValueAtTime(base - 600, t + 0.22);
              gain2.gain.setValueAtTime(curVol * 0.8, t + 0.12);
              gain2.gain.exponentialRampToValueAtTime(0.0001, t + 0.23);
              osc2.connect(gain2).connect(birdsGain);
              osc2.start(t + 0.12);
              osc2.stop(t + 0.24);
            } else {
              // Spatz kurzes Zwitschern
              const chirps = 2 + Math.floor(Math.random() * 2);
              const base = 1900 + Math.random() * 300;
              for (let i = 0; i < chirps; i++) {
                const st = t + i * 0.14;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.frequency.setValueAtTime(base, st);
                osc.frequency.exponentialRampToValueAtTime(base + 800, st + 0.07);
                gain.gain.setValueAtTime(curVol, st);
                gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.08);
                osc.connect(gain).connect(birdsGain);
                osc.start(st);
                osc.stop(st + 0.09);
              }
            }
          }
        } catch {}

        const nextTime = 3000 + Math.random() * 5000;
        const tId = setTimeout(playBirdChirps, nextTime);
        this.timeouts.push(tId);
      };
      playBirdChirps();

      // 5. WALDBACH (Sanfter Wasserlauf mit zartem Brown-Filter & Resonanz)
      const streamBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const streamData = streamBuffer.getChannelData(0);
      let lastStreamOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        streamData[i] = (lastStreamOut + 0.03 * white) / 1.03;
        lastStreamOut = streamData[i];
        streamData[i] *= 3.0;
      }
      const streamSource = ctx.createBufferSource();
      streamSource.buffer = streamBuffer;
      streamSource.loop = true;

      const streamFilter = ctx.createBiquadFilter();
      streamFilter.type = 'lowpass';
      streamFilter.frequency.setValueAtTime(550, now);

      const streamGain = ctx.createGain();
      const streamVol = calculateEffectiveGain(100, settings.volumes.stream, settings.activeTracks.stream, 0.18);
      streamGain.gain.setValueAtTime(streamVol, now);

      streamSource.connect(streamFilter);
      streamFilter.connect(streamGain);
      streamGain.connect(master);
      streamSource.start(now);

      this.streamSource = streamSource;
      this.streamGain = streamGain;

    } catch (e) {
      console.warn('CalmAudioEngine start failure:', e);
    }
  }

  /**
   * Passt die Lautstärken in Echtzeit an ohne Störgeräusche
   */
  public updateVolumes(settings: CalmSoundSettings): void {
    if (!this.isRunning || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;

      if (this.masterGain) {
        this.masterGain.gain.setValueAtTime(Math.max(0.0001, settings.masterVolume / 100), now);
      }
      if (this.rainGain) {
        const vol = calculateEffectiveGain(100, settings.volumes.rain, settings.activeTracks.rain, 0.2);
        this.rainGain.gain.setValueAtTime(vol, now);
      }
      if (this.windGain) {
        const vol = calculateEffectiveGain(100, settings.volumes.wind, settings.activeTracks.wind, 0.16);
        this.windGain.gain.setValueAtTime(vol, now);
      }
      if (this.fireGain) {
        const vol = calculateEffectiveGain(100, settings.volumes.fire, settings.activeTracks.fire, 0.12);
        this.fireGain.gain.setValueAtTime(vol, now);
      }
      if (this.birdsGain) {
        const vol = calculateEffectiveGain(100, settings.volumes.birds, settings.activeTracks.birds, 0.14);
        this.birdsGain.gain.setValueAtTime(vol, now);
      }
      if (this.streamGain) {
        const vol = calculateEffectiveGain(100, settings.volumes.stream, settings.activeTracks.stream, 0.18);
        this.streamGain.gain.setValueAtTime(vol, now);
      }
    } catch {}
  }

  /**
   * Stoppt die Geräusche mit sanftem Fade-Out und gibt alle Ressourcen frei
   */
  public stop(): void {
    this.isRunning = false;

    // Alle Timeouts aufräumen
    if (this.timeouts.length > 0) {
      this.timeouts.forEach(clearTimeout);
      this.timeouts = [];
    }

    // Oscillators stoppen
    try {
      if (this.windLfo) {
        this.windLfo.stop();
        this.windLfo.disconnect();
      }
      if (this.windSource) {
        this.windSource.stop();
        this.windSource.disconnect();
      }
      if (this.rainSource) {
        this.rainSource.stop();
        this.rainSource.disconnect();
      }
      if (this.streamSource) {
        this.streamSource.stop();
        this.streamSource.disconnect();
      }
      if (this.fireHum) {
        this.fireHum.stop();
        this.fireHum.disconnect();
      }
    } catch {}

    this.windLfo = null;
    this.windSource = null;
    this.rainSource = null;
    this.streamSource = null;
    this.fireHum = null;

    // AudioContext sicher schließen
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        this.ctx.close().catch(() => {});
      } catch {}
    }
    this.ctx = null;
    this.masterGain = null;
    this.rainGain = null;
    this.windGain = null;
    this.fireGain = null;
    this.birdsGain = null;
    this.streamGain = null;
  }
}

/**
 * Spielt einen optionalen sanften Chime bei Phasenwechsel der Atemübung ab
 */
export function playBreathingChime(phase: BreathingPhase): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';

    if (phase === 'inhale') {
      // Aufsteigender warmer Ton
      osc.frequency.setValueAtTime(329.63, now); // E4
      osc.frequency.exponentialRampToValueAtTime(440.0, now + 0.8); // A4
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    } else if (phase === 'hold') {
      // Ruhiger Chime
      osc.frequency.setValueAtTime(523.25, now); // C5
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
    } else if (phase === 'exhale') {
      // Sinkender sanfter Ausatem-Ton
      osc.frequency.setValueAtTime(392.0, now); // G4
      osc.frequency.exponentialRampToValueAtTime(261.63, now + 1.0); // C4
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
    } else {
      return;
    }

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 2.0);

    // Context nach Abklingen schließen
    setTimeout(() => {
      try {
        if (ctx.state !== 'closed') ctx.close().catch(() => {});
      } catch {}
    }, 2200);
  } catch {}
}
