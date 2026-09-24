/**
 * soundsAlgorithm.ts
 * F-UI Standard-konforme Logik für das Signalton-Widget (widget-sounds) in F13.
 *
 * Fachliche Rolle:
 * „Welches kurze Signal gebe ich der Klasse?“
 * Kurze, beruhigende oder fokussierende Unterrichtssignale für Übergänge und Aufmerksamkeit,
 * ohne dass die Lehrkraft rufen oder die Stimme erheben muss.
 *
 * Sound-Auswahl (Didaktisch fundierte Unterrichtsstandards):
 * 1. 🥣 Klangschale (Tiefe beruhigende Resonanz für Achtsamkeit / Stillarbeitsbeginn)
 * 2. 🔔 Schulgong (Zweiton-Gong für Phasenwechsel & Aufmerksamkeit)
 * 3. 📐 Triangel (Heller, klarer Ton zur schnellen Fokussierung)
 * 4. ⏱️ Signal-Chime (Freundlicher 3-Klang Akkord)
 * 5. 👏 Applaus (Wertschätzender Beifall für Schülerbeiträge)
 * 6. 🥁 Trommelwirbel (Spannung für Auslosungen oder Präsentationen)
 *
 * Entfernte Spielzeug-Sounds:
 * - Laser, Error-Buzzer, Fanfare, Ta-Da, Alien-Sounds (unruhig & ungeeignet für Klassenfokus).
 *
 * Audio-Architektur:
 * - 100% offline, rein synthetische WebAudio API (keine externen MP3s oder CDNs).
 * - Mehrfachklickschutz: Laufende Töne werden vor neuem Signal sauber gestoppt.
 * - Manueller Stopp-Button: Bricht resonierende Klänge sofort ab.
 * - Lazy AudioContext: Wird erst bei Benutzerinteraktion erzeugt.
 */

export type ClassroomSoundId = 'bowl' | 'gong' | 'triangle' | 'chime' | 'applause' | 'drumroll';

export interface ClassroomSound {
  id: ClassroomSoundId;
  label: string;
  icon: string;
  description: string;
  durationSec: number;
}

export const CLASSROOM_SOUNDS: ClassroomSound[] = [
  {
    id: 'bowl',
    label: 'Klangschale',
    icon: '🥣',
    description: 'Tiefe, langanhaltende Schwingung für Ruhe',
    durationSec: 3.5,
  },
  {
    id: 'gong',
    label: 'Schulgong',
    icon: '🔔',
    description: 'Warmer 2-Ton Gong für Phasenwechsel',
    durationSec: 2.2,
  },
  {
    id: 'triangle',
    label: 'Triangel',
    icon: '📐',
    description: 'Heller, klarer Fokusklang für sofortige Stille',
    durationSec: 1.8,
  },
  {
    id: 'chime',
    label: 'Signal-Chime',
    icon: '⏱️',
    description: 'Freundlicher Dreiklang für Übergänge',
    durationSec: 1.5,
  },
  {
    id: 'applause',
    label: 'Applaus',
    icon: '👏',
    description: 'Wertschätzung & Lob für Schülerbeiträge',
    durationSec: 2.4,
  },
  {
    id: 'drumroll',
    label: 'Trommelwirbel',
    icon: '🥁',
    description: 'Spannungsaufbau für Präsentationen',
    durationSec: 2.0,
  },
];

export interface SoundsWidgetSettings {
  volume: number; // 0.1 .. 1.0 (Standard 0.7)
}

export const DEFAULT_SOUNDS_SETTINGS: SoundsWidgetSettings = {
  volume: 0.7,
};

/**
 * Holt die Sound-Konfiguration anhand der ID
 */
export function getClassroomSound(id: string): ClassroomSound | undefined {
  return CLASSROOM_SOUNDS.find((s) => s.id === id);
}

/**
 * Prüft ob ein Sound zu den didaktisch freigegebenen Klassensounds gehört
 */
export function isAllowedClassroomSound(id: string): boolean {
  return CLASSROOM_SOUNDS.some((s) => s.id === id);
}

/**
 * Liste ungeeigneter / entfernter Spielzeug-Sounds zur Dokumentation
 */
export const BANNED_TOY_SOUNDS = ['laser', 'error', 'fanfare', 'tada', 'nature', 'alien'] as const;

/**
 * Singleton / Shared Controller für WebAudio Synthese im Browser
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private activeNodes: Array<{ stop?: () => void; disconnect: () => void }> = [];
  private lastPlayTimestamp = 0;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx) {
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Stoppt sofort alle aktiven Klänge & Oszillatoren
   */
  public stopAll(): void {
    this.activeNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
      } catch {}
      try {
        node.disconnect();
      } catch {}
    });
    this.activeNodes = [];
  }

  /**
   * Spielt einen didaktischen Schulsound ab (mit Mehrfachklickschutz)
   */
  public play(soundId: ClassroomSoundId, volumeFactor = 0.7): boolean {
    const ctx = this.getContext();
    if (!ctx) return false;

    // Mehrfachklickschutz: Laufende Klänge vorher stoppen
    this.stopAll();

    const now = ctx.currentTime;
    this.lastPlayTimestamp = Date.now();
    const clampedVol = Math.max(0, Math.min(1.0, Number.isFinite(volumeFactor) ? volumeFactor : 0.7));

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(clampedVol, now);
    masterGain.connect(ctx.destination);
    this.activeNodes.push(masterGain);

    switch (soundId) {
      case 'bowl': {
        // Klangschale: Grundton 432 Hz + weiche Quint-/Oktave-Resonanz
        const freqs = [432, 648, 864];
        freqs.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          const partVol = 0.4 / (idx + 1);
          gain.gain.setValueAtTime(partVol, now);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now);
          osc.stop(now + 3.5);

          this.activeNodes.push(osc, gain);
        });
        break;
      }

      case 'gong': {
        // Schulgong: Klassischer Zweiton-Gong (G4 392Hz -> C5 523Hz)
        const tones = [
          { f: 392, t: 0, decay: 1.8 },
          { f: 523, t: 0.35, decay: 2.2 },
        ];
        tones.forEach(({ f, t, decay }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + t);

          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.45, now + t);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + t + decay);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(now + t);
          osc.stop(now + t + decay);

          this.activeNodes.push(osc, gain);
        });
        break;
      }

      case 'triangle': {
        // Triangel: Heller, klarer Obertonglanz (2200 Hz mit leichtem Chime)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);
        osc.frequency.exponentialRampToValueAtTime(2150, now + 0.1);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.8);

        this.activeNodes.push(osc, gain);
        break;
      }

      case 'chime': {
        // Signal-Chime: Aufsteigender Dreiklang C5 (523) -> E5 (659) -> G5 (784)
        const chord = [523.25, 659.25, 783.99];
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const startTime = now + idx * 0.15;

          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, now);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 1.2);

          this.activeNodes.push(osc, gain);
        });
        break;
      }

      case 'applause': {
        // Applaus: Rosa/Bandpass-Rauschen mit lebendiger Hüllkurve
        const bufferSize = ctx.sampleRate * 2.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.7;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        noise.start(now);
        noise.stop(now + 2.4);

        this.activeNodes.push(noise, filter, gain);
        break;
      }

      case 'drumroll': {
        // Trommelwirbel: Schnelle rhythmische Rausch-Impulse gefiltert
        const pulses = 24;
        const duration = 2.0;
        const interval = duration / pulses;

        for (let i = 0; i < pulses; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const pTime = now + i * interval;
          const pVol = (0.1 + (i / pulses) * 0.35); // Crescendo

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(140 - (i % 2) * 20, pTime);

          gain.gain.setValueAtTime(pVol, pTime);
          gain.gain.exponentialRampToValueAtTime(0.001, pTime + interval * 0.9);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(pTime);
          osc.stop(pTime + interval * 0.9);

          this.activeNodes.push(osc, gain);
        }
        break;
      }
    }

    return true;
  }
}

export const classroomSoundEngine = new SoundEngine();
