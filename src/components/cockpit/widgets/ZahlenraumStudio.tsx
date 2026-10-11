import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Grid3X3, 
  MoveRight, 
  Plus, 
  Minus, 
  RotateCcw, 
  Sliders, 
  Eye, 
  EyeOff, 
  Trash2, 
  CornerDownRight,
  Sparkles,
  Layers,
  Split
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { numberLineValueAtClick } from '../../../lib/mathWidgetInteraction';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  ZahlenraumMode,
  ZahlenraumRange,
  QuantityStyle,
  ZahlenraumMarker,
  ZahlenraumJump,
  ZahlenraumSettings,
  DEFAULT_ZAHLENRAUM_SETTINGS,
  PRESET_RANGES,
  getStructuredGridDots,
  validateLineRange,
  calculateLineTicks,
  getLinePercentage,
  generateJumpArc,
  validateJumps,
  validateMarkers,
  migrateLegacyMathWidget
} from '../../../lib/zahlenraumAlgorithm';

export interface ZahlenraumStudioProps {
  widget?: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

// Keep signed integer drafts (including an unfinished minus) separate from saved numbers.
const SignedIntegerInput: React.FC<Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: number; onValueChange: (value: number) => void;
}> = ({ value, onValueChange, ...props }) => {
  const [draft, setDraft] = useState(String(value));
  const editing = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(String(value)); }, [value]);
  return <input {...props} type="text" inputMode="text" value={draft}
    onFocus={() => { editing.current = true; }}
    onBlur={() => { editing.current = false; setDraft(String(value)); }}
    onChange={event => {
      const next = event.currentTarget.value;
      setDraft(next);
      if (/^-?\d+$/.test(next) && Number.isSafeInteger(Number(next))) onValueChange(Number(next));
    }} />;
};

export const ZahlenraumStudio: React.FC<ZahlenraumStudioProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef);
  useWidgetOverflowGuard('ZahlenraumStudio', containerRef);

  // Initialisierung mit Altdaten-Migration
  const initialSettings: ZahlenraumSettings = useMemo(() => {
    const raw = widget?.settings;
    if (widget?.type === 'anschauung' || widget?.type === 'numberline') {
      return migrateLegacyMathWidget(widget.type, raw);
    }
    if (raw && (raw.mode === 'quantity' || raw.mode === 'numberline')) {
      return migrateLegacyMathWidget('zahlenraum', raw);
    }
    return { ...DEFAULT_ZAHLENRAUM_SETTINGS };
  }, [widget?.type, widget?.settings]);

  const [mode, setMode] = useState<ZahlenraumMode>(initialSettings.mode);
  const [range, setRange] = useState<ZahlenraumRange>(initialSettings.range);
  const [customMin, setCustomMin] = useState<number>(initialSettings.customMin ?? 0);
  const [customMax, setCustomMax] = useState<number>(initialSettings.customMax ?? 100);

  // Modus A – Mengen-State
  const [quantityValue, setQuantityValue] = useState<number>(initialSettings.quantityValue);
  const [quantityStyle, setQuantityStyle] = useState<QuantityStyle>(initialSettings.quantityStyle ?? 'classic');
  const [splitActive, setSplitActive] = useState<boolean>(initialSettings.splitValue !== undefined);
  const [splitValue, setSplitValue] = useState<number>(initialSettings.splitValue ?? Math.max(1, Math.floor(initialSettings.quantityValue / 2)));

  // Modus B – Zahlenstrahl-State
  const [markers, setMarkers] = useState<ZahlenraumMarker[]>(initialSettings.markers);
  const [jumps, setJumps] = useState<ZahlenraumJump[]>(initialSettings.jumps);
  const [newJumpStep, setNewJumpStep] = useState<number>(initialSettings.pendingJumpStep ?? 10);
  const [showCustomRangeInputs, setShowCustomRangeInputs] = useState<boolean>(initialSettings.range === 'custom');
  const settingsRef = useRef(initialSettings);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const applySettings = useCallback((next: ZahlenraumSettings) => {
    settingsRef.current = next;
    setMode(next.mode); setRange(next.range); setQuantityValue(next.quantityValue);
    setQuantityStyle(next.quantityStyle ?? 'classic');
    setSplitActive(next.splitValue !== undefined); setSplitValue(next.splitValue ?? 0);
    setCustomMin(next.customMin ?? 0); setCustomMax(next.customMax ?? 100);
    setMarkers(next.markers); setJumps(next.jumps); setShowCustomRangeInputs(next.range === 'custom');
    setNewJumpStep(next.pendingJumpStep ?? 10);
  }, []);
  useEffect(() => {
    if (JSON.stringify(initialSettings) !== JSON.stringify(settingsRef.current)) applySettings(initialSettings);
  }, [initialSettings, applySettings]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!showSettings || !dialog) return;
    const trigger = containerRef.current?.closest('[data-widget-type]')?.querySelector<HTMLButtonElement>('.cockpit-widget-settings-trigger');
    dialog.showModal();
    return () => { if (dialog.open) dialog.close(); trigger?.focus(); };
  }, [showSettings]);

  // Bereichsgrenzen für Zahlenstrahl ermitteln
  const { min: currentMin, max: currentMax } = useMemo(() => {
    if (range === 'custom') {
      return validateLineRange(customMin, customMax);
    }
    const preset = PRESET_RANGES[range] || PRESET_RANGES[100];
    return { min: preset.min, max: preset.max };
  }, [range, customMin, customMax]);

  // Persistenz
  const persist = useCallback((updates: Partial<ZahlenraumSettings>) => {
    const nextSettings = migrateLegacyMathWidget('zahlenraum', { ...settingsRef.current, ...updates });
    applySettings(nextSettings);
    onUpdate?.({
      settings: {
        ...(widget?.settings || {}),
        ...nextSettings,
      },
    });
  }, [onUpdate, widget?.settings, applySettings]);

  // Modus wechseln
  const handleSelectMode = (newMode: ZahlenraumMode) => {
    setMode(newMode);
    // Wenn in Mengenmodus gewechselt wird, aber Range 1000 oder custom aktiv war -> auf 100 begrenzen
    if (newMode === 'quantity' && (range === 1000 || range === 'custom')) {
      setRange(100);
      const safeVal = Math.min(100, Math.max(0, quantityValue));
      setQuantityValue(safeVal);
      persist({ mode: newMode, range: 100, quantityValue: safeVal });
      return;
    }
    persist({ mode: newMode });
  };

  // Zahlenraum wählen
  const handleSelectRange = (r: ZahlenraumRange) => {
    setRange(r);
    if (r === 'custom') {
      setShowCustomRangeInputs(true);
      const validated = validateLineRange(customMin, customMax);
      setCustomMin(validated.min);
      setCustomMax(validated.max);
      persist({ range: 'custom', customMin: validated.min, customMax: validated.max });
    } else {
      setShowCustomRangeInputs(false);
      const preset = PRESET_RANGES[r];
      if (mode === 'quantity') {
        const safeVal = Math.min(preset.max, Math.max(preset.min, quantityValue));
        setQuantityValue(safeVal);
        persist({ range: r, quantityValue: safeVal });
      } else {
        // Marker und Sprünge anpassen
        const safeMarkers = validateMarkers(markers, preset.min, preset.max);
        const safeJumps = validateJumps(jumps, preset.min, preset.max);
        const nextMarkers = safeMarkers.length > 0 ? safeMarkers : [{ id: 'm1', value: Math.min(preset.max, preset.min + Math.floor((preset.max - preset.min) / 2)) }];
        setMarkers(nextMarkers);
        setJumps(safeJumps);
        persist({ range: r, markers: nextMarkers, jumps: safeJumps });
      }
    }
  };

  // Mengenwert verändern
  const updateQuantityValue = (newVal: number) => {
    const maxVal = typeof range === 'number' ? range : 100;
    const clamped = Math.max(0, Math.min(maxVal, Math.floor(isNaN(newVal) ? 0 : newVal)));
    setQuantityValue(clamped);
    if (splitValue > clamped) {
      const nextSplit = Math.max(0, Math.floor(clamped / 2));
      setSplitValue(nextSplit);
      persist({ quantityValue: clamped, splitValue: splitActive ? nextSplit : undefined });
    } else {
      persist({ quantityValue: clamped });
    }
  };

  // Zerlegung umschalten
  const toggleSplit = () => {
    const nextState = !splitActive;
    setSplitActive(nextState);
    const nextSplit = nextState ? Math.max(0, Math.floor(quantityValue / 2)) : undefined;
    if (nextSplit !== undefined) setSplitValue(nextSplit);
    persist({ splitValue: nextSplit });
  };

  // Marker hinzufügen oder anpassen
  const handleAddOrUpdateMarker = (val: number) => {
    const safeVal = Math.max(currentMin, Math.min(currentMax, Math.round(val)));
    // Prüfen, ob bereits vorhanden
    const existingIndex = markers.findIndex(m => m.value === safeVal);
    if (existingIndex >= 0) {
      return;
    }
    if (markers.length >= 6) {
      // Maximal 6 Marker (1 Hauptmarker + 5 Vergleichsmarker)
      return;
    }
    const nextMarkers: ZahlenraumMarker[] = [
      ...markers,
      { id: `m_${Date.now()}`, value: safeVal, labelHidden: false }
    ];
    setMarkers(nextMarkers);
    persist({ markers: nextMarkers });
  };

  const handleUpdateMarkerValue = (id: string, newVal: number) => {
    const safeVal = Math.max(currentMin, Math.min(currentMax, Math.round(newVal)));
    const nextMarkers = markers.map(m => m.id === id ? { ...m, value: safeVal } : m);
    setMarkers(nextMarkers);
    persist({ markers: nextMarkers });
  };

  const handleToggleMarkerVisibility = (id: string) => {
    const nextMarkers = markers.map(m => m.id === id ? { ...m, labelHidden: !m.labelHidden } : m);
    setMarkers(nextMarkers);
    persist({ markers: nextMarkers });
  };

  const handleRemoveMarker = (id: string) => {
    if (markers.length <= 1) return; // Mindestens ein Marker bleibt
    const nextMarkers = markers.filter(m => m.id !== id);
    setMarkers(nextMarkers);
    persist({ markers: nextMarkers });
  };

  // Sprung hinzufügen
  const handleAddJump = (step: number) => {
    if (jumps.length >= 10) return; // Max 10 Sprünge
    // Startwert: Ziel des letzten Sprungs, sonst Hauptmarker
    const lastJump = jumps[jumps.length - 1];
    const from = lastJump ? lastJump.to : (markers[0]?.value ?? currentMin);
    const to = from + step;

    if (to < currentMin || to > currentMax) return; // Darf den sichtbaren Bereich nicht verlassen

    const nextJump: ZahlenraumJump = {
      id: `j_${Date.now()}`,
      from,
      step,
      to,
    };
    const nextJumps = [...jumps, nextJump];
    setJumps(nextJumps);
    persist({ jumps: nextJumps });
  };

  const handleClearJumps = () => {
    setJumps([]);
    persist({ jumps: [] });
  };

  // Klick auf Zahlenstrahl SVG
  const handleLineClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = e.currentTarget.createSVGPoint();
    point.x = e.clientX; point.y = e.clientY;
    const clickX = point.matrixTransform(matrix.inverse()).x;
    const computedVal = numberLineValueAtClick(clickX, 1000, currentMin, currentMax);
    if (computedVal === null) return;
    handleAddOrUpdateMarker(computedVal);
  };

  // Berechnungen für Mengenfeld
  const quantityRange = (range === 10 || range === 20 || range === 100) ? range : 20;
  const gridDots = useMemo(() => {
    return getStructuredGridDots(
      quantityRange,
      quantityValue,
      quantityStyle,
      splitActive ? splitValue : undefined
    );
  }, [quantityRange, quantityValue, quantityStyle, splitActive, splitValue]);

  // Berechnungen für Zahlenstrahl
  const lineTicksData = useMemo(() => {
    return calculateLineTicks(currentMin, currentMax);
  }, [currentMin, currentMax]);

  const isCompact = size.isCompact;
  const isFullscreen = size.category === 'fullscreen' || size.isXL;

  return (
    <div 
      ref={containerRef}
      id="zahlenraum-studio-container"
      data-practice-root={widget?.type ?? 'zahlenraum'}
      data-zahlenraum-mode={mode} data-zahlenraum-range={range}
      className={`h-full min-h-0 w-full flex flex-col select-none overflow-hidden font-sans ${
        currentIsLight ? 'bg-slate-50 text-slate-800' : 'bg-slate-900 text-slate-100'
      }`}
    >
      {/* The widget title's gear controls this configuration toolbar. */}
      {showSettings && createPortal(<dialog ref={dialogRef} aria-label="Zahlenraum einstellen"
        onCancel={(event) => { event.preventDefault(); onCloseSettings?.(); }}
        onKeyDown={event => {
          event.stopPropagation();
          if (event.key === 'Escape') { event.preventDefault(); onCloseSettings?.(); }
        }}
        className="fixed inset-0 m-auto w-[min(700px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] rounded-2xl border border-slate-300 bg-white p-3 text-slate-800 dark:bg-slate-950 dark:text-slate-100 backdrop:bg-black/40">
      <div
        id="zahlenraum-toolbar"
        role="group" aria-label="Zahlenraum einstellen"
        className={`shrink-0 flex items-center justify-between border-b px-3 py-2 gap-2 flex-wrap ${
          currentIsLight ? 'border-slate-200 bg-white' : 'border-slate-800 bg-slate-950'
        }`}
      >
        <div className="w-full flex items-center justify-between gap-2">
          <span className="text-sm font-bold">Zahlenraum einstellen</span>
          <button type="button" onClick={onCloseSettings} aria-label="Zahlenraum-Einstellungen schließen"
            className="min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-xs font-semibold">Fertig</button>
        </div>
        {/* Modus-Umschalter */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            id="zahlenraum-mode-quantity-btn"
            aria-pressed={mode === 'quantity'}
            type="button"
            onClick={() => handleSelectMode('quantity')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all min-h-11 ${
              mode === 'quantity'
                ? 'bg-accent text-accent-text shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Mengen</span>
          </button>
          <button
            id="zahlenraum-mode-numberline-btn"
            aria-pressed={mode === 'numberline'}
            type="button"
            onClick={() => handleSelectMode('numberline')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all min-h-11 ${
              mode === 'numberline'
                ? 'bg-accent text-accent-text shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <MoveRight className="w-4 h-4" />
            <span>Zahlenstrahl</span>
          </button>
        </div>

        {/* Zahlenraum-Auswahl */}
        <div className="flex items-center gap-1 flex-wrap">
          {mode === 'quantity' ? (
            // Mengenmodus: ausschließlich ZR 10, ZR 20, ZR 100
            [10, 20, 100].map((r) => (
              <button
                key={r}
                id={`zahlenraum-range-${r}-btn`}
                aria-pressed={range === r}
                type="button"
                onClick={() => handleSelectRange(r as ZahlenraumRange)}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all min-h-11 min-w-[44px] ${
                  range === r
                    ? 'bg-accent text-accent-text font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                ZR {r}
              </button>
            ))
          ) : (
            // Zahlenstrahl: 0–10, 0–20, 0–100, 0–1000, Custom
            <>
              {[10, 20, 100, 1000].map((r) => (
                <button
                  key={r}
                  id={`zahlenraum-range-${r}-btn`}
                  aria-pressed={range === r}
                  type="button"
                  onClick={() => handleSelectRange(r as ZahlenraumRange)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-all min-h-11 ${
                    range === r
                      ? 'bg-accent text-accent-text font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  0–{r}
                </button>
              ))}
              <button
                id="zahlenraum-range-custom-btn"
                aria-pressed={range === 'custom'}
                type="button"
                onClick={() => handleSelectRange('custom')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-all min-h-11 flex items-center gap-1 ${
                  range === 'custom'
                    ? 'bg-accent text-accent-text font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Eigen</span>
              </button>
            </>
          )}
        </div>
      </div></dialog>, document.body)}

      {/* Hauptbereich */}
      <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
        {mode === 'quantity' ? (
          /* =========================================================================
             MODUS A: MENGEN & ZAHLENBILDER
             ========================================================================= */
          <div className="flex-1 min-h-0 flex flex-col items-center justify-between gap-2">
            {/* Steuerung für Mengenwert & Zerlegung */}
            <div
              id="zahlenraum-quantity-controls"
              className={`w-full max-w-xl flex items-center justify-between gap-2 p-2 rounded-xl border flex-wrap ${
                currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              {/* Stepper für Hauptzahl */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Zahl:</span>
                <button
                  id="zahlenraum-quantity-dec-btn"
                  type="button"
                  onClick={() => updateQuantityValue(quantityValue - 1)}
                  disabled={quantityValue <= 0}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                  aria-label="Zahl verringern"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <span 
                  id="zahlenraum-quantity-value-display"
                  className="text-2xl font-black min-w-[48px] text-center font-mono text-accent"
                >
                  {quantityValue}
                </span>
                <input type="number" min={0} max={quantityRange} value={quantityValue}
                  aria-label="Menge eingeben" onChange={e => updateQuantityValue(Number(e.target.value))}
                  className="min-h-11 w-20 rounded-lg border border-slate-300 bg-transparent px-2 text-center font-mono" />

                <button
                  id="zahlenraum-quantity-inc-btn"
                  type="button"
                  onClick={() => updateQuantityValue(quantityValue + 1)}
                  disabled={quantityValue >= quantityRange}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all"
                  aria-label="Zahl erhöhen"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Zerlegungs-Button & Stil-Umschalter */}
              <div className="flex items-center gap-2">
                {range === 10 && (
                  <button
                    id="zahlenraum-toggle-style-btn"
                    aria-pressed={quantityStyle === 'jaeger'}
                    type="button"
                    onClick={() => {
                      const next = quantityStyle === 'classic' ? 'jaeger' : 'classic';
                      setQuantityStyle(next);
                      persist({ quantityStyle: next });
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 min-h-[44px] transition-all ${
                      quantityStyle === 'jaeger'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-200'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>🌱 Jäger (Gras)</span>
                  </button>
                )}

                <button
                  id="zahlenraum-toggle-split-btn"
                  aria-pressed={splitActive}
                  type="button"
                  onClick={toggleSplit}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 min-h-[44px] transition-all ${
                    splitActive
                      ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-200'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Split className="w-4 h-4" />
                  <span>Zerlegung</span>
                </button>
              </div>
            </div>

            {/* Zerlegungs-Slider falls aktiv */}
            {splitActive && (
              <div
                id="zahlenraum-split-panel"
                className={`w-full max-w-xl flex items-center justify-between p-2.5 rounded-xl border gap-3 ${
                  currentIsLight ? 'bg-amber-50/70 border-amber-200' : 'bg-amber-950/30 border-amber-800/60'
                }`}
              >
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                  {quantityValue} = <span className="text-accent font-extrabold">{splitValue}</span> + <span className="text-amber-600 dark:text-amber-400 font-extrabold">{quantityValue - splitValue}</span>
                </span>
                <input
                  id="zahlenraum-split-slider"
                  aria-label="Ersten Teil der Zerlegung einstellen"
                  type="range"
                  min="0"
                  max={quantityValue}
                  value={splitValue}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setSplitValue(val);
                    persist({ splitValue: val });
                  }}
                  className="h-11 w-48 accent-amber-600"
                />
              </div>
            )}

            {/* Die visuelle Punktmatrix */}
            <div
              id="zahlenraum-matrix-wrapper"
              className={`flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-3xl p-2 rounded-2xl border transition-all ${
                currentIsLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-800'
              }`}
            >
              {/* Optionales Gras-Band bei Jäger-Stil */}
              <div
                id="zahlenraum-grid"
                role="group" aria-label={`${quantityValue} Punkte im ${quantityRange}er-Feld`}
                className={`grid ${quantityRange === 100 ? 'gap-1' : 'gap-2'} items-center justify-center p-1`}
                style={{
                  gridTemplateColumns: `repeat(${gridDots.cols}, minmax(0, 1fr))`,
                }}
              >
                {gridDots.dots.map((dot) => {
                  // Farbe bestimmen
                  let dotBg = 'bg-transparent border-2 border-dashed border-slate-300 dark:border-slate-700';
                  if (dot.isFilled) {
                    if (dot.colorType === 'secondary') {
                      dotBg = 'bg-amber-500 text-white shadow-md border border-amber-600';
                    } else {
                      dotBg = 'bg-accent text-accent-text shadow-md border border-accent';
                    }
                  }

                  // 5er-Zäsur Abstände (Kraft der Fünf)
                  const colMargin = dot.isFiveBreakCol ? 'mr-3' : '';
                  const rowMargin = dot.isFiveBreakRow ? 'mb-3' : '';

                  const dotSizeClass = 
                    quantityRange === 10 ? 'w-12 h-12 text-base' :
                    quantityRange === 20 ? 'w-11 h-11 text-sm' :
                    'w-4 h-4 text-[10px]';
                  const Dot = quantityRange === 100 ? 'span' : 'button';

                  return (
                    <Dot
                      key={dot.index}
                      id={`dot-${dot.index}`}
                      {...(quantityRange === 100 ? { 'aria-hidden': true as const } : {
                        type: 'button' as const, 'aria-label': `Menge ${dot.index} wählen`, onClick: () => updateQuantityValue(dot.index),
                      })}
                      data-grid-filled={dot.isFilled} data-grid-color={dot.colorType}
                      className={`rounded-full flex items-center justify-center font-bold font-mono select-none ${dotSizeClass} ${colMargin} ${rowMargin} ${dotBg}`}
                      title={`Punkt ${dot.index}`}
                    >
                      {dot.isFilled && quantityRange <= 20 && dot.index}
                    </Dot>
                  );
                })}
              </div>

              {/* Jäger-Erklärung im Gras-Modus */}
              {range === 10 && quantityStyle === 'jaeger' && (
                <div className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                  <span>🌱 „Das Gras ist unten!“ Ungerade Zahlen im Gras, gerade oben.</span>
                </div>
              )}
            </div>

            {/* Kurzwahltasten für typische Mengen */}
            <div className="flex items-center gap-1 flex-wrap justify-center">
              {(quantityRange === 10 ? [0, 2, 5, 7, 10] : quantityRange === 20 ? [0, 5, 10, 15, 17, 20] : [0, 10, 25, 47, 50, 75, 100]).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateQuantityValue(v)}
                  aria-label={`Menge ${v} einstellen`}
                  className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all min-h-11 min-w-11"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* =========================================================================
             MODUS B: ZAHLENSTRAHL
             ========================================================================= */
          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2">
            {/* Custom Range Eingabefelder bei eigenem Bereich */}
            {showCustomRangeInputs && (
              <div
                id="zahlenraum-custom-range-bar"
                className={`flex items-center gap-2 p-2 rounded-xl border text-xs flex-wrap ${
                  currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
                }`}
              >
                <span className="font-semibold text-slate-500">Bereich:</span>
                <label className="flex items-center gap-1">
                  <span>Min:</span>
                  <SignedIntegerInput
                    id="zahlenraum-custom-min-input"
                    value={customMin}
                    onValueChange={setCustomMin}
                    aria-label="Zahlenstrahl von"
                    className="min-h-11 w-24 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-center"
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>Max:</span>
                  <SignedIntegerInput
                    id="zahlenraum-custom-max-input"
                    value={customMax}
                    onValueChange={setCustomMax}
                    aria-label="Zahlenstrahl bis"
                    className="min-h-11 w-24 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-center"
                  />
                </label>
                <button type="button" className="min-h-11 rounded-lg border px-3 font-semibold"
                  onClick={() => persist({customMin, customMax})}>Bereich anwenden</button>
                <span className="text-slate-400">(z. B. 200–300 oder -50–50)</span>
              </div>
            )}

            {/* Zahlenstrahl SVG Visualisierung */}
            <div
              id="zahlenraum-numberline-canvas"
              className={`flex-1 min-h-[120px] flex items-center justify-center p-3 rounded-2xl border relative select-none ${
                currentIsLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-800'
              }`}
            >
              <svg
                viewBox="0 0 1000 200"
                className="w-full h-full overflow-visible cursor-crosshair"
                onClick={handleLineClick}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="6"
                    markerHeight="6"
                    refX="5"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" />
                  </marker>
                </defs>

                {/* Rechensprünge (Halbbögen mit Beschriftung) */}
                {jumps.map((jump, index) => {
                  const fromPct = getLinePercentage(jump.from, currentMin, currentMax);
                  const toPct = getLinePercentage(jump.to, currentMin, currentMax);
                  const fromX = 40 + (fromPct / 100) * 920;
                  const toX = 40 + (toPct / 100) * 920;
                  const arc = generateJumpArc(fromX, toX, 75, 45);

                  const stepSign = jump.step >= 0 ? `+${jump.step}` : `${jump.step}`;

                  return (
                    <g key={jump.id} id={`jump-arc-${jump.id}`}>
                      <path
                        d={arc.pathD}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeDasharray="4 2"
                        markerEnd="url(#arrowhead)"
                      />
                      {/* Badge für Schrittweite */}
                      <rect
                        x={arc.midX - Math.max(26, stepSign.length * 7 + 10)}
                        y={112 + (index % 3) * 28}
                        width={Math.max(52, stepSign.length * 14 + 20)}
                        height="26"
                        rx="4"
                        fill="#f59e0b"
                      />
                      <text
                        x={arc.midX}
                        y={132 + (index % 3) * 28}
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="bold"
                        fill="#ffffff"
                        fontFamily="monospace"
                      >
                        {stepSign}
                      </text>
                    </g>
                  );
                })}

                {/* Hauptlinie des Zahlenstrahls */}
                <line
                  x1="40"
                  y1="75"
                  x2="960"
                  y2="75"
                  stroke={currentIsLight ? '#334155' : '#cbd5e1'}
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Pfeilspitzen an den Enden */}
                <polygon
                  points="965 75, 955 70, 955 80"
                  fill={currentIsLight ? '#334155' : '#cbd5e1'}
                />

                {/* Teilstriche */}
                {lineTicksData.ticks.map((tick) => {
                  const x = 40 + (tick.pct / 100) * 920;
                  const tickH = tick.type === 'major' ? 14 : tick.type === 'medium' ? 9 : 5;
                  const strokeW = tick.type === 'major' ? 2 : tick.type === 'medium' ? 1.5 : 1;

                  return (
                    <g key={tick.value} id={`tick-${tick.value}`}>
                      <line
                        x1={x}
                        y1={75 - tickH / 2}
                        x2={x}
                        y2={75 + tickH / 2}
                        stroke={currentIsLight ? '#475569' : '#94a3b8'}
                        strokeWidth={strokeW}
                      />
                      {/* Zahlenlabel nur auf Major-Ticks, um Überlappungen zu verhindern */}
                      {tick.showLabel && (
                        <text
                          x={x}
                          y={98}
                          textAnchor="middle"
                          fontSize="22"
                          fontWeight={tick.type === 'major' ? '600' : 'normal'}
                          fill={currentIsLight ? '#475569' : '#94a3b8'}
                          fontFamily="monospace"
                        >
                          {tick.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Marker (Pins mit Label) */}
                {markers.map((marker, index) => {
                  const pct = getLinePercentage(marker.value, currentMin, currentMax);
                  const x = 40 + (pct / 100) * 920;
                  const isMain = index === 0;

                  return (
                    <g key={marker.id} id={`marker-pin-${marker.id}`}>
                      {/* Vertikale Leitlinie */}
                      <line
                        x1={x}
                        y1="40"
                        x2={x}
                        y2="75"
                        stroke={isMain ? 'var(--accent)' : '#0ea5e9'}
                        strokeWidth="2"
                        strokeDasharray="2 2"
                      />
                      {/* Pin-Kopf */}
                      <circle
                        cx={x}
                        cy="40"
                        r={isMain ? 9 : 7}
                        fill={isMain ? 'var(--accent)' : '#0ea5e9'}
                        stroke="#ffffff"
                        strokeWidth="2"
                      />
                      {/* Label-Box oberhalb des Pins */}
                      <rect
                        x={x - Math.max(26, String(marker.value).length * 7 + 10)}
                        y="0"
                        width={Math.max(52, String(marker.value).length * 14 + 20)}
                        height="28"
                        rx="4"
                        fill={isMain ? 'var(--accent)' : '#0ea5e9'}
                      />
                      <text
                        x={x}
                        y="21"
                        textAnchor="middle"
                        fontSize="22"
                        fontWeight="bold"
                        fill="#ffffff"
                        fontFamily="monospace"
                      >
                        {marker.labelHidden ? '?' : marker.value}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Steuerung für Marker & Sprünge */}
            <div
              id="zahlenraum-line-controls"
              className={`w-full flex flex-col gap-2 p-2.5 rounded-xl border text-xs ${
                currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}
            >
              {/* Marker-Leiste */}
              <div className="flex items-start justify-between gap-2">
                <div className="grid flex-1 grid-cols-3 gap-2">
                  {markers.map((m, idx) => (
                    <div
                      key={m.id}
                      data-number-marker={m.value}
                      className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <span className="font-bold font-mono text-accent">
                        {idx === 0 ? '★ ' : ''}{m.labelHidden ? '?' : m.value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleMarkerVisibility(m.id)}
                        className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-accent-soft hover:text-accent"
                        title={m.labelHidden ? 'Zahl aufdecken' : 'Zahl verdecken'}
                        aria-label={`Marker ${idx + 1} ${m.labelHidden ? 'aufdecken' : 'verdecken'}`}
                      >
                        {m.labelHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      {markers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMarker(m.id)}
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 dark:hover:bg-rose-950/30"
                          title="Marker entfernen"
                          aria-label={`Marker ${idx + 1} entfernen`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {markers.length < 6 && (
                    <button
                      id="zahlenraum-add-marker-btn"
                      type="button"
                      onClick={() => {
                        const mid = Math.round((currentMin + currentMax) / 2);
                        handleAddOrUpdateMarker(mid);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:text-accent hover:border-accent transition-all min-h-11"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Marker</span>
                    </button>
                  )}
                </div>

                {/* Direkte Zahleingabe für Hauptmarker */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Wert:</span>
                  <SignedIntegerInput
                    id="zahlenraum-main-marker-input"
                    aria-label="Hauptmarker eingeben"
                    value={markers[0]?.value ?? currentMin}
                    onValueChange={val => { if (markers[0]) handleUpdateMarkerValue(markers[0].id, val); }}
                    className="min-h-11 w-24 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-center font-bold"
                  />
                </div>
              </div>

              {/* Sprünge-Leiste */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[1, 5, 10, 50, 100].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleAddJump(step)}
                      disabled={jumps.length >= 10 || (jumps.at(-1)?.to ?? markers[0]?.value ?? currentMin) + step > currentMax}
                      className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 font-mono font-semibold hover:bg-amber-100 min-h-11 min-w-11 disabled:opacity-40"
                    >
                      +{step}
                    </button>
                  ))}
                  {[1, 5, 10].map((step) => (
                    <button
                      key={`neg-${step}`}
                      type="button"
                      onClick={() => handleAddJump(-step)}
                      disabled={jumps.length >= 10 || (jumps.at(-1)?.to ?? markers[0]?.value ?? currentMin) - step < currentMin}
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono font-semibold hover:bg-slate-200 min-h-11 min-w-11 disabled:opacity-40"
                    >
                      -{step}
                    </button>
                  ))}
                  <SignedIntegerInput aria-label="Eigene Sprungweite" value={newJumpStep}
                    onValueChange={val => persist({pendingJumpStep: val})}
                    className="min-h-11 w-16 rounded-lg border bg-transparent px-2 text-center font-mono" />
                  <button type="button" aria-label="Eigenen Rechensprung hinzufügen" className="min-h-11 min-w-11 rounded-lg border disabled:opacity-40"
                    disabled={!Number.isInteger(newJumpStep) || newJumpStep === 0 || jumps.length >= 10 ||
                      (jumps.at(-1)?.to ?? markers[0]?.value ?? currentMin) + newJumpStep < currentMin ||
                      (jumps.at(-1)?.to ?? markers[0]?.value ?? currentMin) + newJumpStep > currentMax}
                    onClick={() => handleAddJump(newJumpStep)}><Plus className="mx-auto h-4 w-4" /></button>
                </div>

                {jumps.length > 0 && (
                  <button
                    id="zahlenraum-clear-jumps-btn"
                    type="button"
                    onClick={handleClearJumps}
                    aria-label="Alle Rechensprünge löschen"
                    className="flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-rose-600 transition-all min-h-11 min-w-11"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Leeren ({jumps.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZahlenraumStudio;
