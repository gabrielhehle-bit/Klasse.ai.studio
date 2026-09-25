import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  PieChart,
  Square,
  GitCompare,
  Plus,
  Minus,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  FractionMode,
  CompareRepresentation,
  FractionValue,
  FractionVisualizerSettings,
  DEFAULT_FRACTION_SETTINGS,
  MIN_DENOMINATOR,
  MAX_DENOMINATOR,
  MIN_NUMERATOR,
  validateFraction,
  validateSettings,
  simplifyFraction,
  areFractionsEquivalent,
  getCircleSlicePath,
  getComparisonExplanation,
  migrateLegacyFractionWidget,
} from '../../../lib/fractionAlgorithm';

export interface FractionVisualizerProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

const COMMON_PRESETS: FractionValue[] = [
  { numerator: 1, denominator: 2 },
  { numerator: 1, denominator: 3 },
  { numerator: 2, denominator: 3 },
  { numerator: 1, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 1, denominator: 6 },
  { numerator: 5, denominator: 6 },
  { numerator: 1, denominator: 8 },
  { numerator: 3, denominator: 8 },
  { numerator: 5, denominator: 8 },
  { numerator: 7, denominator: 8 },
  { numerator: 1, denominator: 12 },
];

export const FractionVisualizer: React.FC<FractionVisualizerProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('FractionVisualizer', containerRef);

  // Initialisiere mit Migration alter Widgets
  const initialSettings = useMemo<FractionVisualizerSettings>(() => {
    const raw = widget?.settings;
    if (widget?.type === 'fractions' || widget?.type === 'fractioncake' || widget?.type === 'fractiongrid') {
      return migrateLegacyFractionWidget(widget.type, raw);
    }
    if (raw && (raw.mode === 'circle' || raw.mode === 'strip' || raw.mode === 'compare')) {
      return validateSettings(raw);
    }
    return { ...DEFAULT_FRACTION_SETTINGS };
  }, [widget?.type, widget?.settings]);

  const [settings, setSettings] = useState<FractionVisualizerSettings>(initialSettings);
  const settingsRef = useRef(settings);

  const updateSettings = useCallback(
    (newSettings: Partial<FractionVisualizerSettings>) => {
      const updated = validateSettings({ ...settingsRef.current, ...newSettings });
      settingsRef.current = updated;
      setSettings(updated);
      // Keep legacy fields; never update the cockpit from inside a state updater.
      onUpdate?.({ settings: { ...(widget?.settings || {}), ...updated } });
    },
    [onUpdate, widget?.settings]
  );

  const setMode = (mode: FractionMode) => {
    updateSettings({ mode });
  };

  const updatePrimary = (diff: Partial<FractionValue>) => {
    const next = validateFraction({ ...settings.primary, ...diff });
    updateSettings({ primary: next });
  };

  const updateSecondary = (diff: Partial<FractionValue>) => {
    const sec = settings.secondary ?? DEFAULT_FRACTION_SETTINGS.secondary!;
    const next = validateFraction({ ...sec, ...diff });
    updateSettings({ secondary: next });
  };

  const toggleRevealComparison = () => {
    updateSettings({ revealComparison: !settings.revealComparison });
  };

  const resetToDefault = () => {
    updateSettings({
      primary: { numerator: 1, denominator: 2 },
      secondary: { numerator: 2, denominator: 4 },
      revealComparison: false,
    });
  };

  // Hilfswerte
  const primarySimp = useMemo(() => simplifyFraction(settings.primary), [settings.primary]);
  const sec = settings.secondary ?? { numerator: 2, denominator: 4 };
  const secondarySimp = useMemo(() => simplifyFraction(sec), [sec]);

  const isCompact = size.isCompact;
  const isLarge = size.isLarge;
  const isFullscreen = size.isXL || size.category === 'fullscreen';

  // Render Bruchzahl mit Bruchstrich
  const renderFractionNumber = (f: FractionValue, simplified?: FractionValue, largeText: boolean = false) => {
    const showSimplification =
      simplified &&
      (simplified.numerator !== f.numerator || simplified.denominator !== f.denominator);

    return (
      <div className="flex items-center gap-2 select-none">
        <div className="inline-flex flex-col items-center justify-center font-bold tracking-tight">
          <span
            className={`${
              largeText ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
            } leading-none ${currentIsLight ? 'text-slate-900' : 'text-slate-100'}`}
          >
            {f.numerator}
          </span>
          <span
            className={`w-full my-0.5 border-b-2 ${
              currentIsLight ? 'border-slate-800' : 'border-slate-200'
            }`}
          />
          <span
            className={`${
              largeText ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'
            } leading-none ${currentIsLight ? 'text-slate-900' : 'text-slate-100'}`}
          >
            {f.denominator}
          </span>
        </div>

        {showSimplification && (
          <div className="flex items-center gap-1.5 opacity-80 pl-1 border-l border-slate-300 dark:border-slate-700">
            <span className="text-sm font-medium text-slate-500">=</span>
            <div className="inline-flex flex-col items-center justify-center text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-400">
              <span>{simplified.numerator}</span>
              <span className="w-full my-0.5 border-b border-sky-600 dark:border-sky-400" />
              <span>{simplified.denominator}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Bruch-Eingabe (Zähler & Nenner Stepper)
  const renderFractionControls = (
    f: FractionValue,
    onNumChange: (val: number) => void,
    onDenChange: (val: number) => void,
    labelPrefix?: string
  ) => {
    return (
      <div className="flex flex-col gap-2 p-2 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
        {labelPrefix && (
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
            {labelPrefix}
          </div>
        )}

        {/* Zähler Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-14">Zähler:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onNumChange(f.numerator - 1)}
              disabled={f.numerator <= MIN_NUMERATOR}
              aria-label="Zähler verringern"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-base text-slate-900 dark:text-slate-100">
              {f.numerator}
            </span>
            <button
              type="button"
              onClick={() => onNumChange(f.numerator + 1)}
              disabled={f.numerator >= f.denominator}
              aria-label="Zähler erhöhen"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nenner Stepper */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-14">Nenner:</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDenChange(f.denominator - 1)}
              disabled={f.denominator <= MIN_DENOMINATOR}
              aria-label="Nenner verringern"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors active:scale-95"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-base text-slate-900 dark:text-slate-100">
              {f.denominator}
            </span>
            <button
              type="button"
              onClick={() => onDenChange(f.denominator + 1)}
              disabled={f.denominator >= MAX_DENOMINATOR}
              aria-label="Nenner erhöhen"
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-30 disabled:pointer-events-none transition-colors active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // SVG Kreisdarstellung
  const renderCircleVisual = (
    f: FractionValue,
    interactive: boolean = true,
    onSliceClick?: (index: number) => void,
    sizePx: number = 180
  ) => {
    const total = f.denominator;
    const filledCount = f.numerator;
    const radius = 78;
    const cx = 100;
    const cy = 100;

    return (
      <div className="flex flex-col items-center justify-center select-none" style={{ width: sizePx, height: sizePx }}>
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-sm transition-transform"
          aria-label={`Bruchkreis ${f.numerator} von ${f.denominator}`}
        >
          {/* Hintergrundkreis */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            className="fill-slate-100 dark:fill-slate-800/90 stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
          />

          {/* Einzelsegmente */}
          {Array.from({ length: total }, (_, i) => {
            const isFilled = i < filledCount;
            const pathData = getCircleSlicePath(i, total, cx, cy, radius);

            return (
              <path
                key={i}
                d={pathData}
                role={interactive && onSliceClick ? 'button' : undefined}
                tabIndex={interactive && onSliceClick ? 0 : -1}
                aria-label={interactive && onSliceClick ? `Kreisteil ${i + 1} von ${total} auswählen` : undefined}
                aria-pressed={interactive && onSliceClick ? isFilled : undefined}
                onClick={() => {
                  if (interactive && onSliceClick) onSliceClick(i);
                }}
                onKeyDown={(event) => {
                  if (interactive && onSliceClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    event.stopPropagation();
                    onSliceClick(i);
                  }
                }}
                className={`transition-colors duration-150 ${
                  isFilled
                    ? 'fill-sky-500 hover:fill-sky-400 dark:fill-sky-500 dark:hover:fill-sky-400'
                    : 'fill-slate-100 dark:fill-slate-800 hover:fill-slate-200 dark:hover:fill-slate-700'
                } stroke-white dark:stroke-slate-900 ${
                  interactive ? 'cursor-pointer focus:outline-none focus:stroke-indigo-600 dark:focus:stroke-indigo-300' : 'cursor-default'
                }`}
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Äußerer Kreisring für klare Kontur */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            className="stroke-slate-400 dark:stroke-slate-500"
            strokeWidth="2"
            pointerEvents="none"
          />
        </svg>
      </div>
    );
  };

  // Streifendarstellung (Rechteck / Bruchstreifen)
  const renderStripVisual = (
    f: FractionValue,
    interactive: boolean = true,
    onSegmentClick?: (index: number) => void
  ) => {
    const total = f.denominator;
    const filledCount = f.numerator;

    return (
      <div className="w-full flex flex-col gap-1.5 select-none">
        <div
          className="w-full h-14 rounded-xl overflow-hidden border-2 border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800 flex shadow-sm"
          role="group"
          aria-label={`Bruchstreifen ${f.numerator} von ${f.denominator}`}
        >
          {Array.from({ length: total }, (_, i) => {
            const isFilled = i < filledCount;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (interactive && onSegmentClick) {
                    onSegmentClick(i);
                  }
                }}
                disabled={!interactive}
                aria-label={`Abschnitt ${i + 1} von ${total}`}
                className={`h-full flex-1 border-r last:border-r-0 border-white dark:border-slate-900 flex items-center justify-center font-medium text-xs transition-colors duration-150 ${
                  isFilled
                    ? 'bg-sky-500 text-white hover:bg-sky-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                } ${interactive ? 'cursor-pointer' : 'cursor-default'}`}
              >
                1/{total}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 px-0.5">
          <span>0</span>
          <span>
            {f.numerator} / {f.denominator} Teile
          </span>
          <span>1 Ganzes</span>
        </div>
      </div>
    );
  };

  // Presets Leiste
  const renderPresets = (onSelect: (p: FractionValue) => void) => {
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">
          Häufige Brüche:
        </span>
        {COMMON_PRESETS.map((p, idx) => {
          const isSelected =
            settings.primary.numerator === p.numerator &&
            settings.primary.denominator === p.denominator;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelect(p)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                isSelected
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:bg-sky-50 dark:hover:bg-slate-700'
              }`}
            >
              {p.numerator}/{p.denominator}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col p-3 sm:p-4 gap-3 select-none overflow-y-auto ${
        currentIsLight ? 'bg-white text-slate-800' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* 1. Header & Modus-Auswahl */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xl">◐</span>
          <div>
            <h3 className="font-bold text-base leading-tight">Bruch-Visualisierer</h3>
            {!isCompact && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">
                Darstellen, Verstehen &amp; Vergleichen
              </p>
            )}
          </div>
        </div>

        {/* Modus-Umschalter */}
        {showSettings && <div role="group" aria-label="Bruchdarstellung einstellen" className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMode('circle')}
            className={`min-h-11 px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              settings.mode === 'circle'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Kreis</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('strip')}
            className={`min-h-11 px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              settings.mode === 'strip'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>Streifen</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('compare')}
            className={`min-h-11 px-3 py-1.5 flex items-center gap-1.5 text-xs font-semibold rounded-lg transition-all ${
              settings.mode === 'compare'
                ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Vergleich</span>
          </button>
        </div>}
        {showSettings && <button type="button" onClick={onCloseSettings}
          aria-label="Bruch-Einstellungen schließen"
          className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-xs font-semibold">Fertig</button>}

      </div>

      {/* 2. Hauptbereich je nach Modus */}

      {/* MODUS A: KREIS */}
      {settings.mode === 'circle' && (
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-4 min-h-[220px]">
            {/* Große Kreisdarstellung */}
            <div className="flex flex-col items-center gap-2">
              {renderCircleVisual(
                settings.primary,
                true,
                (idx) => updatePrimary({ numerator: idx + 1 }),
                isFullscreen ? 280 : isLarge ? 220 : 180
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Tippe auf Segmente zum Einfärben
              </div>
            </div>

            {/* Bruchzahl & Stepper */}
            <div className="flex flex-col items-center gap-4 w-full md:w-auto">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col items-center">
                {renderFractionNumber(settings.primary, primarySimp, true)}
              </div>

              {renderFractionControls(
                settings.primary,
                (val) => updatePrimary({ numerator: val }),
                (val) => updatePrimary({ denominator: val })
              )}
            </div>
          </div>

          {!isCompact && renderPresets((p) => updatePrimary(p))}
        </div>
      )}

      {/* MODUS B: STREIFEN */}
      {settings.mode === 'strip' && (
        <div className="flex-1 flex flex-col gap-4 justify-between">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Gleichmäßig geteilter Bruchstreifen:
              </div>
              {renderFractionNumber(settings.primary, primarySimp, false)}
            </div>

            {/* Streifen */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              {renderStripVisual(settings.primary, true, (idx) =>
                updatePrimary({ numerator: idx + 1 })
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="w-full md:w-auto">
              {renderFractionControls(
                settings.primary,
                (val) => updatePrimary({ numerator: val }),
                (val) => updatePrimary({ denominator: val })
              )}
            </div>
            {!isCompact && <div className="flex-1">{renderPresets((p) => updatePrimary(p))}</div>}
          </div>
        </div>
      )}

      {/* MODUS C: VERGLEICH */}
      {settings.mode === 'compare' && (
        <div className="flex-1 flex flex-col gap-4">
          {/* Umschalter Kreis vs Streifen im Vergleich */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Darstellung im Vergleich:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => updateSettings({ compareRepresentation: 'circle' })}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  settings.compareRepresentation !== 'strip'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Kreise
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ compareRepresentation: 'strip' })}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  settings.compareRepresentation === 'strip'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-sky-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Streifen
              </button>
            </div>
          </div>

          {/* Vergleichs-Flächen (Bruch A vs Bruch B) mit identischer Größe */}
          <div
            className={`flex-1 grid ${
              isCompact ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'
            } items-stretch`}
          >
            {/* BRUCH A */}
            <div className="flex flex-col items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 tracking-wider">
                  BRUCH A
                </span>
                {renderFractionNumber(settings.primary, primarySimp, false)}
              </div>

              {settings.compareRepresentation === 'strip' ? (
                renderStripVisual(settings.primary, true, (idx) =>
                  updatePrimary({ numerator: idx + 1 })
                )
              ) : (
                <div className="py-1">
                  {renderCircleVisual(
                    settings.primary,
                    true,
                    (idx) => updatePrimary({ numerator: idx + 1 }),
                    isCompact ? 130 : 150
                  )}
                </div>
              )}

              {renderFractionControls(
                settings.primary,
                (val) => updatePrimary({ numerator: val }),
                (val) => updatePrimary({ denominator: val }),
                'Bruch A einstellen'
              )}
            </div>

            {/* BRUCH B */}
            <div className="flex flex-col items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                  BRUCH B
                </span>
                {renderFractionNumber(sec, secondarySimp, false)}
              </div>

              {settings.compareRepresentation === 'strip' ? (
                renderStripVisual(sec, true, (idx) =>
                  updateSecondary({ numerator: idx + 1 })
                )
              ) : (
                <div className="py-1">
                  {renderCircleVisual(
                    sec,
                    true,
                    (idx) => updateSecondary({ numerator: idx + 1 }),
                    isCompact ? 130 : 150
                  )}
                </div>
              )}

              {renderFractionControls(
                sec,
                (val) => updateSecondary({ numerator: val }),
                (val) => updateSecondary({ denominator: val }),
                'Bruch B einstellen'
              )}
            </div>
          </div>

          {/* Vergleichs-Auswertung (Symbol & didaktische Erläuterung) */}
          {(() => {
            const comparison = getComparisonExplanation(settings.primary, sec);
            return (
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 shrink-0">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Ergebnis:
                    </span>
                    {settings.revealComparison ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-50 tracking-wider">
                          {settings.primary.numerator}/{settings.primary.denominator}{' '}
                          <span className="text-sky-600 dark:text-sky-400 px-1 font-extrabold">
                            {comparison.symbol}
                          </span>{' '}
                          {sec.numerator}/{sec.denominator}
                        </span>
                        {comparison.isEquivalent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            <Check className="w-3 h-3" /> Gleichwertig
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                        Vergleich verborgen
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={toggleRevealComparison}
                    className="min-h-[44px] px-3.5 py-1.5 flex items-center gap-2 text-xs font-semibold rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white transition-all shadow-xs"
                    aria-label={settings.revealComparison ? 'Vergleich verbergen' : 'Vergleich aufdecken'}
                  >
                    {settings.revealComparison ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Verbergen</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Vergleich aufdecken</span>
                      </>
                    )}
                  </button>
                </div>

                {settings.revealComparison && (
                  <div className="w-full text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 mt-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      Didaktischer Rechenweg:{' '}
                    </span>
                    {comparison.text}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default FractionVisualizer;
