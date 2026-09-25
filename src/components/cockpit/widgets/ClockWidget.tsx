import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Settings2, Clock, Calendar, Check, X, Sparkles } from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  formatDigitalTime,
  getAnalogAngles,
  formatClockDate,
  getSpokenTime,
  DEFAULT_CLOCK_SETTINGS,
  ClockSettings,
  ClockMode,
} from '../../../lib/clockAlgorithm';

export interface ClockWidgetProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight?: boolean;
}

export const ClockWidget: React.FC<ClockWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('ClockWidget', containerRef);

  // Settings from widget config or defaults
  const settings: ClockSettings = useMemo(() => {
    const s = widget?.settings || {};
    return {
      mode: (s.mode as ClockMode) || DEFAULT_CLOCK_SETTINGS.mode,
      showSeconds: typeof s.showSeconds === 'boolean' ? s.showSeconds : DEFAULT_CLOCK_SETTINGS.showSeconds,
      showDate: typeof s.showDate === 'boolean' ? s.showDate : DEFAULT_CLOCK_SETTINGS.showDate,
      showLearningText: typeof s.showLearningText === 'boolean' ? s.showLearningText : DEFAULT_CLOCK_SETTINGS.showLearningText,
    };
  }, [widget?.settings]);

  // Local settings drawer toggle
  const [showSettings, setShowSettings] = useState(false);

  // Drift-free time reference
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    // Interval depending on whether seconds are active
    const intervalMs = settings.showSeconds ? 1000 : 20000;
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);

    // Immediate update on focus / wake from sleep
    const onFocus = () => setNow(new Date());
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [settings.showSeconds]);

  // Persist settings updates safely
  const updateSettings = useCallback(
    (updates: Partial<ClockSettings>) => {
      if (onUpdate && widget) {
        onUpdate({
          settings: {
            ...widget.settings,
            ...updates,
          },
        });
      }
    },
    [onUpdate, widget]
  );

  const isCompact = size.category === 'compact';
  const isLarge = size.category === 'large';
  const isFullscreen = size.category === 'fullscreen';
  const isLowHeight = size.height < 210;

  // In COMPACT mode, force digital mode to avoid unreadable squished analog clock
  const effectiveMode: ClockMode = isCompact ? 'digital' : settings.mode;

  // Formatted digital time
  const digital = useMemo(
    () => formatDigitalTime(now, settings.showSeconds),
    [now, settings.showSeconds]
  );

  // Analog angles
  const angles = useMemo(
    () => getAnalogAngles(now, settings.showSeconds),
    [now, settings.showSeconds]
  );

  // Formatted date string
  const dateStr = useMemo(
    () => formatClockDate(now, isCompact),
    [now, isCompact]
  );

  // Spoken / learning text
  const spokenStr = useMemo(() => getSpokenTime(now), [now]);

  // Theme colors
  const textColor = currentIsLight ? 'text-slate-900' : 'text-slate-100';
  const subTextColor = currentIsLight ? 'text-slate-600' : 'text-zinc-400';
  const clockBg = currentIsLight ? 'bg-white' : 'bg-zinc-900';
  const borderColor = currentIsLight ? 'border-slate-200' : 'border-zinc-800';

  const effectiveDigitalWidth = effectiveMode === 'both' ? size.width * 0.46 : size.width;
  const digitalFontPixels = Math.max(44, Math.min(
    isFullscreen ? 176 : 132,
    effectiveDigitalWidth * 0.22,
    size.height * (effectiveMode === 'both' ? 0.26 : 0.34),
  ));
  const analogFacePixels = Math.max(110, Math.min(
    size.width * (effectiveMode === 'both' ? 0.42 : 0.72),
    size.height * (effectiveMode === 'both' ? 0.70 : 0.82),
    isFullscreen ? 560 : 420,
  ));
  const roomyClock = isFullscreen || (size.width >= 760 && size.height >= 500);

  // Digital font sizing keeps fallback classes for older browsers; the measured
  // inline size below makes the time actually fill the widget rectangle.
  const getDigitalFontSizeClass = () => {
    if (isFullscreen) return 'text-7xl sm:text-8xl md:text-9xl font-black';
    if (isLarge) {
      if (effectiveMode === 'both') return 'text-4xl sm:text-5xl font-black';
      return 'text-5xl sm:text-6xl md:text-7xl font-black';
    }
    if (isCompact || isLowHeight) {
      return 'text-5xl sm:text-6xl font-black';
    }
    return 'text-5xl sm:text-6xl font-black';
  };

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`Uhrzeit ${digital.timeString}, ${dateStr}`}
      className={`w-full h-full flex flex-col justify-between overflow-hidden select-none ${isCompact || isLowHeight ? 'p-1.5' : 'p-3.5 sm:p-5'} relative transition-colors ${textColor} ${
        currentIsLight ? 'bg-slate-50/70' : 'bg-zinc-950/70'
      }`}
    >
      {/* Top action header: Settings Button (min 44px touch target) */}
      <div className={`absolute z-20 ${isCompact ? 'top-1 right-1' : 'top-2 right-2'}`}>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all cursor-pointer focus:outline-hidden ${
            showSettings
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
              : currentIsLight
              ? 'bg-white/80 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-white'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
          title="Uhr-Einstellungen"
          aria-label="Uhr-Einstellungen öffnen"
        >
          <Settings2 size={18} className="stroke-[2.25]" />
        </button>
      </div>

      {/* Main Display Area */}
      <div className="flex-1 flex items-center justify-center min-h-0 w-full">
        {/* MODUS 1: DIGITAL */}
        {effectiveMode === 'digital' && (
          <div className="flex flex-col items-center justify-center text-center w-full px-2">
            <div
              className={`tracking-tight font-mono tabular-nums leading-none ${getDigitalFontSizeClass()}`}
              style={{ fontSize: digitalFontPixels }}
            >
              <span>{digital.hours}</span>
              <span className="opacity-60 px-0.5">:</span>
              <span>{digital.minutes}</span>
              {settings.showSeconds && (
                <span className="text-[0.45em] ml-2 opacity-65 font-bold">
                  .{digital.seconds}
                </span>
              )}
            </div>

            {/* Date beneath digital time */}
            {settings.showDate && !isLowHeight && (
              <div
                className={`mt-2 font-medium tracking-wide ${
                  roomyClock ? 'text-xl sm:text-2xl mt-4' : 'text-xs sm:text-sm'
                } ${subTextColor}`}
              >
                {dateStr}
              </div>
            )}

            {/* Educational / Spoken time badge */}
            {settings.showLearningText && !isLowHeight && (
              <div
                className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  currentIsLight
                    ? 'bg-indigo-50 border-indigo-200/70 text-indigo-700'
                    : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                }`}
              >
                <Sparkles size={12} className="stroke-[2.25]" />
                <span>{spokenStr}</span>
              </div>
            )}
          </div>
        )}

        {/* MODUS 2: ANALOG */}
        {effectiveMode === 'analog' && (
          <div className="flex flex-col items-center justify-center w-full h-full max-h-full py-1">
            <div className="relative flex shrink-0 items-center justify-center"
              style={{ width: analogFacePixels, height: analogFacePixels, maxWidth: '100%', maxHeight: '85%', aspectRatio: '1' }}>
              <AnalogClockFace
                angles={angles}
                showSeconds={settings.showSeconds}
                currentIsLight={currentIsLight}
              />
            </div>

            {/* Sub-label for Analog Clock: digital readout or date */}
            {!isLowHeight && (
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono font-bold text-sm tracking-tight px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10">
                  {digital.timeString}
                </span>
                {settings.showDate && (
                  <span className={`text-xs font-medium ${subTextColor}`}>
                    {dateStr}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODUS 3: BOTH (Digital + Analog) */}
        {effectiveMode === 'both' && (
          <div
            className={`w-full h-full flex ${
              isLarge || isFullscreen
                ? 'flex-row items-center justify-around gap-6'
                : 'flex-col items-center justify-center gap-2'
            }`}
          >
            {/* Analog Clock half */}
            <div className="relative flex shrink-0 items-center justify-center"
              style={{ width: analogFacePixels, height: analogFacePixels, maxWidth: '45%', maxHeight: '75%', aspectRatio: '1' }}>
              <AnalogClockFace
                angles={angles}
                showSeconds={settings.showSeconds}
                currentIsLight={currentIsLight}
              />
            </div>

            {/* Digital Clock half */}
            <div className="flex flex-col items-center text-center">
              <div
                className={`tracking-tight font-mono tabular-nums leading-none ${getDigitalFontSizeClass()}`}
                style={{ fontSize: digitalFontPixels }}
              >
                <span>{digital.hours}</span>
                <span className="opacity-60 px-0.5">:</span>
                <span>{digital.minutes}</span>
                {settings.showSeconds && (
                  <span className="text-[0.45em] ml-1.5 opacity-65 font-bold">
                    .{digital.seconds}
                  </span>
                )}
              </div>

              {settings.showDate && (
                <div
                  className={`mt-1.5 font-medium tracking-wide ${
                    roomyClock ? 'text-xl mt-3' : 'text-xs sm:text-sm'
                  } ${subTextColor}`}
                >
                  {dateStr}
                </div>
              )}

              {settings.showLearningText && (
                <div
                  className={`mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    currentIsLight
                      ? 'bg-indigo-50 border-indigo-200/70 text-indigo-700'
                      : 'bg-indigo-950/40 border-indigo-800/60 text-indigo-300'
                  }`}
                >
                  <Sparkles size={11} className="stroke-[2.25]" />
                  <span>{spokenStr}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Overlay / Flyout Drawer */}
      {showSettings && (
        <div
          className={`absolute inset-x-2 bottom-2 top-14 rounded-2xl border p-4 shadow-xl z-30 flex flex-col justify-between backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            currentIsLight
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-zinc-900/95 border-zinc-700 text-zinc-100'
          }`}
        >
          <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock size={16} />
              Uhr-Einstellungen
            </h3>
            <button
              type="button"
              onClick={() => setShowSettings(false)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
              aria-label="Einstellungen schließen"
            >
              <X size={18} />
            </button>
          </div>

          {/* Options Grid */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {/* Mode selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-400 mb-1.5 block">
                Anzeige-Modus
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['digital', 'analog', 'both'] as ClockMode[]).map((m) => {
                  const isActive = settings.mode === m;
                  const label =
                    m === 'digital'
                      ? 'Digital'
                      : m === 'analog'
                      ? 'Analog'
                      : 'Beides';
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ mode: m })}
                      className={`h-11 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : currentIsLight
                          ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          : 'bg-zinc-800 hover:bg-zinc-750 border-zinc-700 text-zinc-300'
                      }`}
                    >
                      {isActive && <Check size={13} className="stroke-[3]" />}
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle Switches */}
            <div className="space-y-2">
              {/* Sekunden Toggle */}
              <button
                type="button"
                onClick={() =>
                  updateSettings({ showSeconds: !settings.showSeconds })
                }
                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showSeconds
                    ? 'border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : borderColor
                }`}
              >
                <div className="text-left">
                  <div className="text-xs font-bold">Sekunden anzeigen</div>
                  <div className="text-[0.6875rem] text-slate-400 dark:text-zinc-500">
                    Standardmäßig aus für ruhigen Unterricht
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    settings.showSeconds ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showSeconds ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              {/* Datum Toggle */}
              <button
                type="button"
                onClick={() => updateSettings({ showDate: !settings.showDate })}
                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showDate
                    ? 'border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : borderColor
                }`}
              >
                <div className="text-left">
                  <div className="text-xs font-bold">Datum & Wochentag</div>
                  <div className="text-[0.6875rem] text-slate-400 dark:text-zinc-500">
                    z.B. Freitag, 5. September
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    settings.showDate ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showDate ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>

              {/* Lern-Text (Spoken time) Toggle */}
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    showLearningText: !settings.showLearningText,
                  })
                }
                className={`w-full min-h-[44px] px-3 py-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                  settings.showLearningText
                    ? 'border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/30'
                    : borderColor
                }`}
              >
                <div className="text-left">
                  <div className="text-xs font-bold">Zeitlern-Hilfe (Wort-Zeit)</div>
                  <div className="text-[0.6875rem] text-slate-400 dark:text-zinc-500">
                    Zeigt z.B. „Halb Zehn“ für die Volksschule
                  </div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                    settings.showLearningText ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      settings.showLearningText ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(false)}
            className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
          >
            Fertig
          </button>
        </div>
      )}
    </div>
  );
};

interface AnalogClockFaceProps {
  angles: { hourDeg: number; minuteDeg: number; secondDeg: number };
  showSeconds: boolean;
  currentIsLight: boolean;
}

/**
 * Kindgerechtes Schweizer Ziffernblatt mit gut lesbaren Ziffern 1-12
 */
const AnalogClockFace: React.FC<AnalogClockFaceProps> = ({
  angles,
  showSeconds,
  currentIsLight,
}) => {
  const clockBg = currentIsLight ? '#ffffff' : '#18181b';
  const rimStroke = currentIsLight ? '#e2e8f0' : '#27272a';
  const majorTick = currentIsLight ? '#0f172a' : '#f8fafc';
  const minorTick = currentIsLight ? '#94a3b8' : '#52525b';
  const hourHand = currentIsLight ? '#0f172a' : '#f8fafc';
  const minHand = currentIsLight ? '#475569' : '#cbd5e1';

  // Numbers 1 to 12
  const numbers = [
    { num: 12, rad: 0 },
    { num: 1, rad: Math.PI / 6 },
    { num: 2, rad: (2 * Math.PI) / 6 },
    { num: 3, rad: (3 * Math.PI) / 6 },
    { num: 4, rad: (4 * Math.PI) / 6 },
    { num: 5, rad: (5 * Math.PI) / 6 },
    { num: 6, rad: (6 * Math.PI) / 6 },
    { num: 7, rad: (7 * Math.PI) / 6 },
    { num: 8, rad: (8 * Math.PI) / 6 },
    { num: 9, rad: (9 * Math.PI) / 6 },
    { num: 10, rad: (10 * Math.PI) / 6 },
    { num: 11, rad: (11 * Math.PI) / 6 },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full h-full drop-shadow-sm overflow-visible"
      aria-hidden="true"
    >
      {/* Outer Dial Circle */}
      <circle
        cx="50"
        cy="50"
        r="47"
        fill={clockBg}
        stroke={rimStroke}
        strokeWidth="2.5"
      />

      {/* 60 Minute / Second Ticks */}
      {Array.from({ length: 60 }).map((_, i) => {
        const rad = (i * 6 * Math.PI) / 180;
        const isMajor = i % 5 === 0;
        const innerR = isMajor ? 41 : 44;
        const outerR = 46;
        return (
          <line
            key={i}
            x1={50 + innerR * Math.sin(rad)}
            y1={50 - innerR * Math.cos(rad)}
            x2={50 + outerR * Math.sin(rad)}
            y2={50 - outerR * Math.cos(rad)}
            stroke={isMajor ? majorTick : minorTick}
            strokeWidth={isMajor ? '1.5' : '0.75'}
            strokeLinecap="round"
          />
        );
      })}

      {/* 12 Educational Numbers around dial */}
      {numbers.map(({ num, rad }) => {
        const r = 34; // distance from center
        const x = 50 + r * Math.sin(rad);
        const y = 50 - r * Math.cos(rad) + 2.5; // slight optical baseline alignment
        const isHighlight = num % 3 === 0;

        return (
          <text
            key={num}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-black select-none pointer-events-none"
            style={{
              fontSize: isHighlight ? '8px' : '6.5px',
              fill: isHighlight ? majorTick : minorTick,
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            }}
          >
            {num}
          </text>
        );
      })}

      {/* Hour Hand (kurz & kräftig) */}
      <line
        x1="50"
        y1="50"
        x2={50 + 22 * Math.sin((angles.hourDeg * Math.PI) / 180)}
        y2={50 - 22 * Math.cos((angles.hourDeg * Math.PI) / 180)}
        stroke={hourHand}
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Minute Hand (lang & schlank) */}
      <line
        x1="50"
        y1="50"
        x2={50 + 33 * Math.sin((angles.minuteDeg * Math.PI) / 180)}
        y2={50 - 33 * Math.cos((angles.minuteDeg * Math.PI) / 180)}
        stroke={minHand}
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Second Hand (nur wenn Sekunden aktiv, dezent rot) */}
      {showSeconds && (
        <>
          <line
            x1="50"
            y1="50"
            x2={50 + 38 * Math.sin((angles.secondDeg * Math.PI) / 180)}
            y2={50 - 38 * Math.cos((angles.secondDeg * Math.PI) / 180)}
            stroke="#ef4444"
            strokeWidth="1.1"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="2.5" fill="#ef4444" />
        </>
      )}

      {/* Center Pin Hub */}
      <circle
        cx="50"
        cy="50"
        r="2"
        fill={showSeconds ? '#ef4444' : majorTick}
        stroke={clockBg}
        strokeWidth="0.8"
      />
    </svg>
  );
};

export default ClockWidget;
