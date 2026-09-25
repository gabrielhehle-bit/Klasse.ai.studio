import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Sparkles, RotateCcw, Volume2, VolumeX, Settings2, 
  X, Plus, Trash2, Users, HelpCircle,
  Hash, Layers, AlertCircle
} from 'lucide-react';
import { CockpitWidgetConfig, AppState } from '../../../types';
import { useApp } from '../../../context/AppContext';
import {
  getDisplayStudentName,
  getPresentStudents,
} from '../studentSelectionUtils';
import { availableWheelIndices, wheelTargetRotation } from '../../../lib/wheelWidgetModel';

export interface WheelWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  app?: AppState;
  currentIsLight: boolean;
}

export type WheelMode = 'custom' | 'students' | 'numbers';

export interface WheelPreset {
  id: string;
  name: string;
  icon: string;
  items: string[];
}

export const WHEEL_PRESETS: WheelPreset[] = [
  {
    id: 'sozialform',
    name: 'Sozialformen',
    icon: '👥',
    items: ['Einzelarbeit', 'Partnerarbeit', 'Gruppenarbeit', 'Im Plenum'],
  },
  {
    id: 'rechenart',
    name: 'Rechenarten',
    icon: '➕',
    items: ['Addition (+)', 'Subtraktion (−)', 'Multiplikation (×)', 'Division (÷)'],
  },
  {
    id: 'bewegung',
    name: 'Bewegungspause',
    icon: '🏃',
    items: [
      '5 Hampelmänner',
      '10 Kniebeugen',
      'Einmal strecken',
      'Tief durchatmen',
      'Schultern kreisen',
      'Auf Zehenspitzen',
    ],
  },
  {
    id: 'dienste',
    name: 'Klassendienste',
    icon: '🧹',
    items: ['Tafel wischen', 'Hefte austeilen', 'Lüftungsdienst', 'Datumsdienst', 'Blumen gießen'],
  },
  {
    id: 'stationen',
    name: 'Lernstationen',
    icon: '📍',
    items: ['Station 1: Lesen', 'Station 2: Schreiben', 'Station 3: Rechnen', 'Station 4: Forschen'],
  },
  {
    id: 'wuerfel',
    name: 'Würfel 1–6',
    icon: '🎲',
    items: ['1', '2', '3', '4', '5', '6'],
  },
];

// Harmonische, pädagogisch ruhige Farbpalette mit hohem Kontrast
export const WHEEL_PALETTE = [
  '#4f46e5', // Indigo
  '#059669', // Emerald
  '#d97706', // Amber
  '#dc2626', // Red
  '#0284c7', // Sky
  '#7c3aed', // Purple
  '#db2777', // Pink
  '#0d9488', // Teal
  '#ea580c', // Orange
  '#2563eb', // Blue
  '#16a34a', // Green
  '#9333ea', // Violet
];

/**
 * Dezentes Klick-Geräusch während der Drehung (Web Audio API)
 */
function playTickSound(audioCtx: AudioContext | null, pitch = 600) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.025);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.03);
  } catch {
    // Geräuschlos ignorieren
  }
}

/**
 * Warmer 2-Klang Akkord bei Erreichen des Ergebnisses
 */
function playWinSound(audioCtx: AudioContext | null) {
  if (!audioCtx) return;
  try {
    const now = audioCtx.currentTime;
    const chords = [523.25, 659.25]; // C5, E5

    chords.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.06, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.3);
    });
  } catch {
    // Geräuschlos ignorieren
  }
}

export const WheelWidget: React.FC<WheelWidgetProps> = ({
  widget,
  onUpdate,
  app: propApp,
  currentIsLight,
}) => {
  const context = useApp();
  const app = propApp || context?.app;

  // Persistierte Widget-Settings
  const settings = useMemo(() => widget?.settings || {}, [widget?.settings]);

  const mode: WheelMode = settings.mode || 'custom';
  const customItems: string[] = Array.isArray(settings.customItems)
    ? settings.customItems.filter((item: unknown): item is string => typeof item === 'string' && Boolean(item.trim()))
    : ['Einzelarbeit', 'Partnerarbeit', 'Gruppenarbeit', 'Im Plenum'];

  const numberRange: number = settings.numberRange || 6;
  const withoutReplacement: boolean = settings.withoutReplacement === true;
  const soundEnabled: boolean = settings.soundEnabled !== false;

  // Helper zum Aktualisieren der Einstellungen
  const updateSettings = useCallback(
    (newSettings: Record<string, any>) => {
      // Pass only changed keys; the cockpit merges them against the latest
      // widget state so quick consecutive clicks do not restore stale options.
      onUpdate({ settings: newSettings });
    },
    [onUpdate, settings]
  );

  // Schülerliste (falls Schüler-Modus aktiv)
  const allStudents = app?.schueler ?? [];
  const presentStudents = getPresentStudents(allStudents, app);

  // Historie für "Ohne Zurücklegen" (flüchtig im Speicher)
  const [drawnHistory, setDrawnHistory] = useState<number[]>([]);

  // Aktive Items berechnen
  const baseItems = useMemo(() => {
    if (mode === 'students') {
      return presentStudents.map((s) => getDisplayStudentName(s, allStudents));
    }
    if (mode === 'numbers') {
      return Array.from({ length: Math.min(24, Math.max(2, numberRange)) }, (_, i) => `${i + 1}`);
    }
    return customItems;
  }, [mode, presentStudents, allStudents, numberRange, customItems]);

  // Keep all original segments visible: changing slice count after the
  // draw previously moved the result away from the fixed pointer.
  const noRepeat = withoutReplacement && mode !== 'students';
  const availableIndices = availableWheelIndices(baseItems.length, drawnHistory, noRepeat);
  const activePool = availableIndices.map(index => baseItems[index]);

  // Dreh-Status & Physik
  const [isSpinning, setIsSpinning] = useState(false);
  const spinningRef = useRef(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  // Neuer Eintrag im Editor
  const [newItemText, setNewItemText] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Timeout- und Audio-Referenzen für sauberen Unmount
  const timeoutsRef = useRef<number[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!soundEnabled) return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, [soundEnabled]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
      spinningRef.current = false;
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        try {
          audioCtxRef.current.close();
        } catch {
          // Ignorieren
        }
      }
    };
  }, []);

  // Responsive Rad-Größe
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelAreaRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 320, height: 320 });
  const [wheelAreaSize, setWheelAreaSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const wheelArea = wheelAreaRef.current;
    if (!container || !wheelArea) return;
    const measure = () => {
      const outer = container.getBoundingClientRect();
      const inner = wheelArea.getBoundingClientRect();
      if (outer.width > 0 && outer.height > 0) {
        setContainerSize(previous =>
          previous.width === Math.round(outer.width) && previous.height === Math.round(outer.height)
            ? previous : { width: Math.round(outer.width), height: Math.round(outer.height) });
      }
      if (inner.width > 0 && inner.height > 0) {
        setWheelAreaSize(previous =>
          previous.width === Math.round(inner.width) && previous.height === Math.round(inner.height)
            ? previous : { width: Math.round(inner.width), height: Math.round(inner.height) });
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    observer.observe(wheelArea);
    return () => observer.disconnect();
  }, []);

  // Mindestanzahl Segmente für ein Rad: 2
  const hasEnoughItems = baseItems.length >= 2 && availableIndices.length > 0;

  /**
   * Deterministische und unvoreingenommene Zufallsauswahl:
   * 1. Gewinner vorab zufällig bestimmen
   * 2. Ziel-Drehwinkel exakt berechnen (Zeiger oben bei 12 Uhr / 0°)
   * 3. Rad dorthin mit schöner Ease-Out-Kurve drehen
   */
  const handleSpin = useCallback(() => {
    if (spinningRef.current || !hasEnoughItems) return;
    spinningRef.current = true;

    // Laufende Timeouts säubern
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];

    setIsSpinning(true);
    setWinner(null);

    const N = baseItems.length;

    // Index-based selection treats duplicate labels as separate segments.
    const winnerIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const chosenWinner = baseItems[winnerIndex];

    const nextRotation = wheelTargetRotation(rotationAngle, winnerIndex, N, Math.random() - 0.5);
    setRotationAngle(nextRotation);

    const audioCtx = getAudioContext();
    const duration = 2600; // 2.6 Sekunden

    // Ticks einplanen
    const tickCount = Math.min(28, Math.floor(N * 4));
    for (let i = 0; i < tickCount; i++) {
      const progress = (i + 1) / tickCount;
      // Ease-out Verzögerungskurve für die Ticks
      const easedTime = (1 - Math.pow(1 - progress, 2.4)) * duration;
      const tId = window.setTimeout(() => {
        if (soundEnabled && audioCtx) {
          playTickSound(audioCtx, 480 + progress * 220);
        }
      }, easedTime);
      timeoutsRef.current.push(tId);
    }

    // Abschluss nach Ablauf der Drehdauer
    const finishId = window.setTimeout(() => {
      spinningRef.current = false;
      setIsSpinning(false);
      setWinner(chosenWinner);

      if (soundEnabled && audioCtx) {
        playWinSound(audioCtx);
      }

      // Bei "Ohne Zurücklegen" in die Historie aufnehmen (nur custom & numbers)
      if (noRepeat) {
        setDrawnHistory((prev) => [...prev, winnerIndex]);
      }
    }, duration);

    timeoutsRef.current.push(finishId);
  }, [hasEnoughItems, baseItems, availableIndices, rotationAngle, getAudioContext, soundEnabled, noRepeat]);

  // Native spin button and the focused wheel handle keyboard input locally;
  // a global listener must not steal Enter or Space from the whiteboard.

  // Hinzufügen einer Option
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    if (customItems.length >= 24) return;
    const updated = [...customItems, trimmed];
    updateSettings({ customItems: updated });
    setDrawnHistory([]);
    setWinner(null);
    setNewItemText('');
  };

  // Löschen einer Option
  const handleRemoveCustomItem = (index: number) => {
    const updated = customItems.filter((_, idx) => idx !== index);
    updateSettings({ customItems: updated });
    setDrawnHistory([]);
    setWinner(null);
  };

  // Preset anwenden
  const handleApplyPreset = (preset: WheelPreset) => {
    updateSettings({
      mode: 'custom',
      customItems: [...preset.items],
    });
    setDrawnHistory([]);
    setWinner(null);
  };

  // SVG Dimensionen
  const wheelRadius = 88;
  const center = 100;
  const numSlices = baseItems.length;

  // Responsive Layoutgrößen
  const isSmall = containerSize.width < 360 || containerSize.height < 360;
  const isLarge = containerSize.width > 560 || containerSize.height > 520;
  const isXL = containerSize.width > 820 && containerSize.height > 620;
  const maxLabelChars = isXL ? 24 : isLarge ? 19 : isSmall ? 10 : 15;
  // Keep the wheel as large as its actual viewport allows. Do not force a
  // minimum diameter larger than the widget (that clipped small screens).
  // Measure the true flex area *after* header, winner line and spin button.
  // Fixed height reserves clipped the wheel on short widgets and wasted large ones.
  const wheelPxSize = Math.max(0, Math.min(
    wheelAreaSize.width || containerSize.width - 16,
    wheelAreaSize.height || containerSize.height - 108,
  ) - 4);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col justify-between w-full h-full ${isSmall ? 'p-1' : 'p-1.5 sm:p-2'} rounded-2xl overflow-hidden select-none border transition-colors duration-200 ${
        currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-950 border-white/10'
      }`}
    >
      {/* ========================================================================= */}
      {/* TOP BAR: Modus-Status, Einstellungen & Sound-Toggle                       */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-1 pb-0.5 border-b border-slate-200 dark:border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm">🎡</span>
          <div className="min-w-0">
            <span className={`${isXL ? 'text-lg' : isLarge ? 'text-base' : 'text-xs sm:text-sm'} font-black uppercase tracking-wider block text-slate-800 dark:text-white leading-tight truncate`}>
              {mode === 'custom' ? 'Glücksrad' : mode === 'numbers' ? 'Zahlenrad' : 'Schülerrad'}
            </span>
            {!isSmall && (
              <span className="text-[10px] font-bold text-slate-400 block truncate">
                {mode === 'custom'
                  ? 'Freie Auswahloptionen'
                  : mode === 'numbers'
                    ? `Zahlen 1 bis ${numberRange}`
                    : 'Spielerische Schülerauswahl'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Status bei "Ohne Zurücklegen" */}
          {withoutReplacement && mode !== 'students' && (
            <button
              type="button"
              onClick={() => { if (!isSpinning) { setDrawnHistory([]); setWinner(null); } }}
              disabled={isSpinning}
              className="min-h-11 px-2 rounded-lg bg-amber-500/10 text-[10px] sm:text-xs font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1"
              title="Alle gezogenen Optionen wieder ins Rad legen"
            >
              <RotateCcw size={11} />
              <span>
                {activePool.length}/{baseItems.length}
              </span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
            className={`min-h-11 min-w-11 p-1 rounded-lg border text-xs transition-all cursor-pointer flex items-center justify-center ${
              soundEnabled
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                : 'bg-black/5 dark:bg-white/5 border-transparent text-slate-400'
            }`}
            title={soundEnabled ? 'Ton stummschalten' : 'Ton einschalten'}
            aria-label="Ton umschalten"
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>

          {/* Konfigurations-Modal öffnen */}
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            disabled={isSpinning}
            className={`min-h-11 min-w-11 px-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95 ${
              currentIsLight
                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                : 'bg-zinc-900 hover:bg-zinc-800 border-white/10 text-slate-200'
            }`}
            title="Optionen, Presets und Modi anpassen"
            aria-label="Glücksrad anpassen"
          >
            <Settings2 size={13} />
            {!isSmall && <span>Optionen</span>}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN RAD VIEWPORT: Responsives SVG mit Zeiger und Animation               */}
      {/* ========================================================================= */}
      <div ref={wheelAreaRef} className="flex-grow flex flex-col items-center justify-center my-0.5 min-h-0 relative overflow-hidden" aria-label="Glücksradfläche">
        {baseItems.length >= 2 ? (
          <div
            onClick={handleSpin}
            role="button"
            tabIndex={hasEnoughItems ? 0 : -1}
            aria-label={activePool.length === 0 ? 'Runde beendet – bitte zurücksetzen' : 'Glücksrad drehen'}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                handleSpin();
              }
            }}
            style={{ width: `${wheelPxSize}px`, height: `${wheelPxSize}px` }}
            className={`relative rounded-full shadow-xl flex items-center justify-center shrink-0 cursor-pointer transition-transform duration-200 ${
              isSpinning ? 'pointer-events-none scale-[0.99]' : 'hover:scale-[1.01]'
            }`}
            title="Klicken zum Drehen"
          >
            {/* Oberer Zeiger (12 Uhr Position) */}
            <div className="absolute -top-1.5 z-30 flex flex-col items-center pointer-events-none drop-shadow-md">
              <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[17px] border-t-rose-600 animate-pulse" />
            </div>

            {/* Rotierende SVG Scheibe */}
            <svg
              viewBox="0 0 200 200"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: isSpinning ? 'transform 2.6s cubic-bezier(0.12, 0.8, 0.25, 1)' : 'none',
              }}
              className="w-full h-full rounded-full overflow-hidden"
            >
              {/* Segmente */}
              {baseItems.map((item, idx) => {
                const sliceAngle = 360 / numSlices;
                const startAngle = idx * sliceAngle;
                const endAngle = (idx + 1) * sliceAngle;

                // Koordinaten für Start und Ende auf dem Kreis (0° = 12 Uhr)
                const startRad = ((startAngle - 90) * Math.PI) / 180;
                const endRad = ((endAngle - 90) * Math.PI) / 180;

                const x1 = center + wheelRadius * Math.cos(startRad);
                const y1 = center + wheelRadius * Math.sin(startRad);
                const x2 = center + wheelRadius * Math.cos(endRad);
                const y2 = center + wheelRadius * Math.sin(endRad);

                const largeArcFlag = sliceAngle > 180 ? 1 : 0;
                const pathData = `M ${center} ${center} L ${x1} ${y1} A ${wheelRadius} ${wheelRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

                const midAngle = (idx + 0.5) * sliceAngle;
                const color = WHEEL_PALETTE[idx % WHEEL_PALETTE.length];

                // Dynamische Schriftgröße
                const fontSize = Math.max(5.5, Math.min(isXL ? 12.5 : isLarge ? 11.5 : 10.5, (isLarge ? 64 : 55) / Math.sqrt(numSlices)));

                return (
                  <g key={idx}>
                    <title>{item}</title>
                    <path
                      d={pathData}
                      fill={color}
                      opacity={noRepeat && drawnHistory.includes(idx) ? 0.28 : 1}
                      stroke="rgba(255, 255, 255, 0.25)"
                      strokeWidth="1"
                    />
                    {/* Segmenttext */}
                    <g transform={`rotate(${midAngle} ${center} ${center})`}>
                      <text
                        x={center}
                        y={center - wheelRadius * 0.55}
                        fill="#ffffff"
                        fontSize={fontSize}
                        fontWeight="900"
                        textAnchor="middle"
                        dominantBaseline="central"
                        transform={`rotate(-90 ${center} ${center - wheelRadius * 0.55})`}
                        style={{
                          textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                        }}
                      >
                        {item.length > maxLabelChars ? `${item.slice(0, maxLabelChars - 1)}…` : item}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Äußerer weißer Ring & Nabe */}
              <circle
                cx={center}
                cy={center}
                r={wheelRadius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.4)"
                strokeWidth="2"
              />
              <circle
                cx={center}
                cy={center}
                r={wheelRadius * 0.16}
                fill={currentIsLight ? '#1e293b' : '#09090b'}
                stroke="#ffffff"
                strokeWidth="2.5"
                filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))"
              />
            </svg>

            {/* Zentrales Icon */}
            <div className="absolute inset-0 m-auto w-6 h-6 rounded-full flex items-center justify-center pointer-events-none text-xs">
              🎯
            </div>
          </div>
        ) : (
          /* Fehlermeldung bei weniger als 2 Optionen */
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm">
            <AlertCircle size={32} className="text-amber-500 mb-2" />
            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Mindestens 2 Optionen erforderlich
            </h4>
            <p className="text-xs font-bold text-slate-400 mt-1 mb-3">
              {mode === 'students' && allStudents.length === 0
                ? 'In dieser Klasse sind noch keine Kinder eingetragen.'
                : mode === 'students'
                  ? 'Aktuell sind weniger als zwei Kinder anwesend.'
                  : 'Das Glücksrad benötigt mindestens zwei Einträge. Bitte Optionen hinzufügen.'}
            </p>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="min-h-11 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Optionen hinzufügen
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* RESULT ANNOUNCEMENT: Groß und lesbar nach der Drehung                     */}
      {/* ========================================================================= */}
      <div className={`${isSmall ? 'h-6' : 'h-7 sm:h-8'} flex items-center justify-center shrink-0 px-1`}>
        {winner && !isSpinning ? (
          <div
            onClick={handleSpin}
            className="w-full max-w-md py-0.5 px-2 rounded-lg bg-indigo-100/90 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-500/40 text-indigo-950 dark:text-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98"
            title="Klicken für nochmal drehen"
          >
            <span className="text-sm sm:text-base">🎉</span>
            <span className={`min-w-0 break-words text-center font-black tracking-tight [overflow-wrap:anywhere] ${isXL ? 'text-2xl' : isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}>
              {winner}
            </span>
          </div>
        ) : (
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {isSpinning ? 'Rad dreht sich … 🎡' : activePool.length === 0 && noRepeat
              ? 'Alle Optionen gezogen – oben die Runde zurücksetzen'
              : 'Rad anklicken oder auf „Glücksrad drehen“ drücken 🎡'}
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM ACTION BUTTON: Mindestens 48px Touch-Höhe                          */}
      {/* ========================================================================= */}
      <div className="shrink-0 pt-0.5 border-t border-slate-200 dark:border-white/10">
        <button
          type="button"
          onClick={handleSpin}
          disabled={isSpinning || !hasEnoughItems}
          className={`w-full ${isXL ? 'min-h-14 text-lg' : isLarge ? 'min-h-12 text-base' : 'min-h-11 text-xs sm:text-sm'} rounded-lg font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-98 cursor-pointer ${
            isSpinning || !hasEnoughItems
              ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
          }`}
          aria-label={winner ? 'Noch einmal drehen' : 'Glücksrad drehen'}
        >
          <Sparkles size={14} />
          <span>
            {isSpinning
              ? 'Dreht …'
              : activePool.length === 0 && noRepeat
                ? 'Runde beendet – oben zurücksetzen'
                : winner
                  ? 'Noch einmal drehen'
                  : 'Glücksrad drehen'}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CONFIGURATION MODAL: Modi, Presets & Eigene Optionen                      */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-2 sm:p-4">
          <div
            className={`w-full max-h-[90%] flex flex-col rounded-3xl shadow-2xl border p-4 sm:p-5 overflow-hidden ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-900 border-white/10'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-indigo-600" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Glücksrad anpassen
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 cursor-pointer"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto no-scrollbar space-y-4 my-3 pr-0.5">
              {/* 1. Hauptmodus wählen */}
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                  Auswahl-Modus:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ mode: 'custom' });
                      setDrawnHistory([]);
                      setWinner(null);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'custom'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : currentIsLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    <Layers size={16} />
                    <span>Eigene Optionen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ mode: 'numbers' });
                      setDrawnHistory([]);
                      setWinner(null);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'numbers'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : currentIsLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    <Hash size={16} />
                    <span>Zahlen</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({ mode: 'students' });
                      setDrawnHistory([]);
                      setWinner(null);
                    }}
                    className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                      mode === 'students'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : currentIsLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
                    }`}
                  >
                    <Users size={16} />
                    <span>Schüler</span>
                  </button>
                </div>
              </div>

              {/* Modus: Eigene Optionen */}
              {mode === 'custom' && (
                <div className="space-y-3">
                  {/* Schnelle Presets */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Unterrichts-Presets:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {WHEEL_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <span>{preset.icon}</span>
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Option hinzufügen */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">
                      Eintrag hinzufügen (max. 24):
                    </span>
                    <form onSubmit={handleAddCustomItem} className="flex gap-1.5">
                      <input
                        type="text"
                        value={newItemText}
                        onChange={(e) => setNewItemText(e.target.value)}
                        placeholder="z. B. Bewegungsübung, Thema..."
                        maxLength={30}
                        className={`flex-grow min-h-11 px-3 rounded-xl border text-xs font-bold outline-none ${
                          currentIsLight
                            ? 'bg-white border-slate-200 text-slate-900 focus:border-indigo-500'
                            : 'bg-zinc-800 border-white/10 text-white focus:border-indigo-400'
                        }`}
                      />
                      <button
                        type="submit"
                        disabled={!newItemText.trim() || customItems.length >= 24}
                        className={`min-h-11 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                          !newItemText.trim() || customItems.length >= 24
                            ? 'bg-slate-200 dark:bg-zinc-800 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Plus size={14} />
                        <span>Plus</span>
                      </button>
                    </form>
                  </div>

                  {/* Liste der Optionen mit Lösch-Funktion */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Aktuelle Optionen ({customItems.length}):
                      </span>
                      {customItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => { updateSettings({ customItems: [] }); setDrawnHistory([]); setWinner(null); }}
                          className="text-[10px] font-black text-rose-500 hover:underline cursor-pointer"
                        >
                          Alle leeren
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {customItems.map((item, idx) => (
                        <div
                          key={idx}
                          className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
                            currentIsLight
                              ? 'bg-slate-50 border-slate-200 text-slate-800'
                              : 'bg-zinc-800 border-white/10 text-slate-200'
                          }`}
                        >
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomItem(idx)}
                            className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                            title="Löschen"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ohne Zurücklegen Toggle */}
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/5 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 dark:text-white">
                          Ohne Zurücklegen
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Gezogene Optionen werden temporär aus dem Rad genommen.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={withoutReplacement}
                        onChange={(e) => {
                          updateSettings({ withoutReplacement: e.target.checked });
                          setDrawnHistory([]);
                          setWinner(null);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Modus: Zahlen */}
              {mode === 'numbers' && (
                <div className="space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Zahlenbereich wählen:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[6, 10, 20].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => {
                          updateSettings({ numberRange: count });
                          setDrawnHistory([]);
                          setWinner(null);
                        }}
                        className={`p-3 rounded-2xl border text-xs font-black flex flex-col items-center gap-1 cursor-pointer transition-all ${
                          numberRange === count
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : currentIsLight
                              ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                              : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
                        }`}
                      >
                        <span className="text-lg">1–{count}</span>
                        <span className="text-[10px] opacity-80">{count} Felder</span>
                      </button>
                    ))}
                  </div>

                  {/* Ohne Zurücklegen Toggle */}
                  <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                    <label className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-white/5 cursor-pointer">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-800 dark:text-white">
                          Ohne Zurücklegen
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          Bereits gezogene Zahlen werden temporär entfernt.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={withoutReplacement}
                        onChange={(e) => {
                          updateSettings({ withoutReplacement: e.target.checked });
                          setDrawnHistory([]);
                          setWinner(null);
                        }}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Modus: Schüler */}
              {mode === 'students' && (
                <div className="space-y-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <HelpCircle size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">
                      Hinweis zur Schülerauswahl
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                    Das Glücksrad ist eine spielerische Präsentationsform. Für den schnellen 1-Klick-Aufruf nutze bitte das Widget <strong>Zufallsname</strong>. Für gerechte Runden ohne Wiederholungen nutze das Widget <strong>Fair-Call</strong>.
                  </p>
                  <p className="text-[11px] font-bold text-slate-400">
                    Aktuell anwesend: <strong>{presentStudents.length} Kinder</strong> (Abwesende automatisch herausgefiltert).
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/10 shrink-0 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="min-h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Fertig
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WheelWidget;
