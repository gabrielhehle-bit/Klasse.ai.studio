import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { nextClassGoalCount, validateClassGoalInput } from '../../../lib/classGoalWidgetModel';
import {
  Sparkles,
  RotateCcw,
  Settings2,
  Check,
  X,
  Trophy,
  Sliders,
  Maximize2,
  Minimize2,
  Info,
  ChevronRight,
  Flame,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  ClassRewardState,
  RewardVisualizationStyle,
  DEFAULT_REWARD_STATE,
  incrementReward,
  correctDecrementReward,
  setRewardGoal,
  setRewardTitle,
  setRewardSymbol,
  setRewardStyle,
  resetRewardCount,
  calculateProgressPercent,
  isGoalReached,
} from '../../../lib/classRewardAlgorithm';

export interface ClassRewardWidgetProps {
  app: any;
  setApp: React.Dispatch<React.SetStateAction<any>>;
  widget?: any;
  onUpdate?: (updates: any) => void;
  currentIsLight?: boolean;
  activeFokusThemeVars?: any;
  isFullscreen?: boolean;
}

const AVAILABLE_SYMBOLS = [
  { char: '💎', label: 'Edelstein / Murmel' },
  { char: '⭐', label: 'Stern' },
  { char: '🪙', label: 'Münze (Sparschwein)' },
  { char: '🍬', label: 'Bonbon' },
  { char: '🍪', label: 'Keks' },
  { char: '🎈', label: 'Ballon' },
  { char: '🍎', label: 'Apfel' },
  { char: '🐾', label: 'Pfote' },
];

const AVAILABLE_STYLES: Array<{ id: RewardVisualizationStyle; label: string; icon: string }> = [
  { id: 'jar', label: 'Belohnungsglas', icon: '🫙' },
  { id: 'thermometer', label: 'Ziel-Thermometer', icon: '🌡️' },
  { id: 'barometer', label: 'Fortschritts-Ring', icon: '🎯' },
];

export const ClassRewardWidget: React.FC<ClassRewardWidgetProps> = ({
  app,
  setApp,
  widget,
  onUpdate,
  currentIsLight = false,
  activeFokusThemeVars,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('ClassRewardWidget', containerRef);

  // Kanonische Daten aus AppContext
  const count = Number.isFinite(app?.klassenglas_count)
    ? Math.max(0, Math.floor(app.klassenglas_count)) : DEFAULT_REWARD_STATE.count;
  const goal = Number.isInteger(app?.klassenglas_ziel) && app.klassenglas_ziel > 0 ? app.klassenglas_ziel : DEFAULT_REWARD_STATE.goal;
  const rewardTitle = app?.klassenglas_belohnung || DEFAULT_REWARD_STATE.rewardTitle;
  const symbol = app?.settings?.klassenglasIcon || widget?.settings?.symbol || DEFAULT_REWARD_STATE.symbol;
  const style: RewardVisualizationStyle =
    widget?.settings?.style || app?.settings?.klassenglasStyle || (widget?.type === 'thermometer' ? 'thermometer' : widget?.type === 'classtarget' ? 'barometer' : 'jar');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [animatingGem, setAnimatingGem] = useState(false);

  // Form State für Settings
  const [editGoal, setEditGoal] = useState<number>(goal);
  const [editTitle, setEditTitle] = useState<string>(rewardTitle);
  const [editSymbol, setEditSymbol] = useState<string>(symbol);
  const [editStyle, setEditStyle] = useState<RewardVisualizationStyle>(style);

  // Wenn Settings geöffnet werden, Werte initialisieren
  useEffect(() => {
    if (isSettingsOpen) {
      setEditGoal(goal);
      setEditTitle(rewardTitle);
      setEditSymbol(symbol);
      setEditStyle(style);
      setSettingsError('');
    }
  }, [isSettingsOpen]);

  const progressPercent = useMemo(() => calculateProgressPercent(count, goal), [count, goal]);
  const goalAchieved = useMemo(() => isGoalReached(count, goal), [count, goal]);

  // Sanfter synthetischer Ton ohne externe Audiodaten (100% offline)
  const playSubtleSound = useCallback((type: 'beep' | 'fanfare') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'beep') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.12); // E5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        // Kurzer Akkord bei Zielerreichung
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          g.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.4);
          o.start(ctx.currentTime + idx * 0.08);
          o.stop(ctx.currentTime + idx * 0.08 + 0.45);
        });
      }
    } catch {
      // Audio optional, falls stummgeschaltet
    }
  }, []);

  // +1 Belohnung hinzufügen
  const handleAdd = () => {
    const currentState: ClassRewardState = { count, goal, rewardTitle, symbol, style };
    const { nextState, justReachedGoal } = incrementReward(currentState, 1);

    setApp((prev: any) => ({
      ...prev,
      // Read the latest account/class state, not a captured count before rapid taps.
      klassenglas_count: nextClassGoalCount(prev.klassenglas_count, 1),
    }));

    setAnimatingGem(true);
    setTimeout(() => setAnimatingGem(false), 400);

    if (justReachedGoal) {
      playSubtleSound('fanfare');
      try {
        confetti({
          particleCount: isFullscreen ? 80 : 40,
          spread: 60,
          origin: { y: 0.65 },
          disableForReducedMotion: true,
        });
      } catch {}
    } else {
      playSubtleSound('beep');
    }
  };

  // Korrektur (-1) – Fehlerbehebung ohne Strafe
  const handleCorrection = () => {
    const currentState: ClassRewardState = { count, goal, rewardTitle, symbol, style };
    const { nextState, corrected } = correctDecrementReward(currentState);

    if (corrected) {
      setApp((prev: any) => ({
        ...prev,
        klassenglas_count: nextClassGoalCount(prev.klassenglas_count, -1),
      }));
    }
  };

  // Einstellungen speichern
  const handleSaveSettings = () => {
    const checked = validateClassGoalInput(editGoal);
    if (checked.goal === null) { setSettingsError(checked.error); return; }
    const safeGoal = checked.goal;
    const safeTitle = editTitle.trim().slice(0, 100) || DEFAULT_REWARD_STATE.rewardTitle;

    setApp((prev: any) => ({
      ...prev,
      klassenglas_ziel: safeGoal,
      klassenglas_belohnung: safeTitle,
      settings: {
        ...(prev?.settings || {}),
        klassenglasIcon: editSymbol,
        klassenglasStyle: editStyle,
      },
    }));

    if (onUpdate) {
      onUpdate({
        settings: {
          ...(widget?.settings || {}),
          style: editStyle,
          symbol: editSymbol,
        },
      });
    }

    setIsSettingsOpen(false);
  };

  // Reset ausführen (nach Bestätigung)
  const handleConfirmReset = () => {
    setApp((prev: any) => ({
      ...prev,
      klassenglas_count: 0,
    }));
    setIsConfirmingReset(false);
  };

  // Bestimme sichtbare Anzahl an Steinen/Symbolen im Glas (begrenzt für Performance)
  const maxVisibleGems = 60;
  const gemDisplayCount = Math.min(count, maxVisibleGems);
  const remainingUntilGoal = Math.max(0, goal - count);

  return (
    <div
      ref={containerRef}
      id="class-reward-widget-root"
      className={`relative w-full h-full flex flex-col justify-between select-none overflow-hidden rounded-2xl transition-colors ${
        currentIsLight
          ? 'bg-white/90 text-slate-800 border border-slate-200/80 shadow-sm'
          : 'bg-zinc-900/90 text-slate-100 border border-white/10 shadow-lg'
      }`}
      style={activeFokusThemeVars || {}}
    >
      {/* HEADER / TITELZEILE */}
      <div className="shrink-0 flex items-center justify-between px-3 pt-2.5 pb-1 gap-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0" role="img" aria-label="Symbol">
            {symbol}
          </span>
          <div className="min-w-0">
            <h3 className="text-xs font-black tracking-wide uppercase truncate leading-tight">
              {style === 'thermometer'
                ? 'Ziel-Thermometer'
                : style === 'barometer'
                ? 'Klassen-Barometer'
                : 'Klassenglas'}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate leading-none">
              {rewardTitle}
            </p>
          </div>
        </div>

        {/* RECHTE BUTTONS (Settings, Reset) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            id="reward-open-settings-btn"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Ziel & Symbol anpassen"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </div>

      {/* HAUPTINHALT / VISUALISIERUNG */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-2 relative overflow-hidden">
        {/* ZIEL ERREICHT BANNER */}
        {goalAchieved && (
          <div className="absolute top-1 inset-x-2 z-20 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 text-white font-black text-[11px] shadow-md animate-bounce">
            <Trophy size={14} className="shrink-0" />
            <span className="truncate">Klassenziel erreicht! 🎉</span>
          </div>
        )}

        {/* 1. VISUALISIERUNGS-STIL: GLAS (JAR) */}
        {style === 'jar' && (
          <div className="flex-1 w-full flex flex-col items-center justify-center relative min-h-0 py-1">
            {/* Das Glas-Gefäß */}
            <div
              className={`relative w-28 sm:w-32 md:w-36 max-h-[160px] h-full flex flex-col justify-end items-center rounded-b-3xl rounded-t-lg border-2 border-dashed transition-all overflow-hidden ${
                animatingGem ? 'scale-105' : 'scale-100'
              } ${
                goalAchieved
                  ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                  : currentIsLight
                  ? 'border-slate-300 bg-slate-100/50 shadow-inner'
                  : 'border-white/20 bg-white/5 shadow-inner'
              }`}
            >
              {/* Glas-Deckel / Rand oben */}
              <div className="absolute top-0 inset-x-2 h-2 rounded-full bg-white/30 border border-white/40" />

              {/* Füllstand-Hintergrund */}
              <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-indigo-500/20 to-purple-500/10 transition-all duration-500"
                style={{ height: `${progressPercent}%` }}
              />

              {/* Murmeln / Symbole im Glas */}
              <div className="w-full flex flex-wrap-reverse justify-center items-end gap-1 p-2 overflow-hidden z-10">
                {count === 0 ? (
                  <span className="text-[10px] text-slate-400 font-medium py-4">Noch leer</span>
                ) : (
                  Array.from({ length: gemDisplayCount }).map((_, idx) => (
                    <span
                      key={idx}
                      className="text-base select-none transform hover:scale-125 transition-transform"
                      role="img"
                      aria-label="Symbol"
                    >
                      {symbol}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Zähler & Prozentanzeige unter dem Glas */}
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black tracking-tight">{count}</span>
              <span className="text-xs text-slate-400 font-bold">/ {goal}</span>
              <span className="text-[10px] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                {progressPercent}%
              </span>
            </div>
          </div>
        )}

        {/* 2. VISUALISIERUNGS-STIL: THERMOMETER */}
        {style === 'thermometer' && (
          <div className="flex-1 w-full flex items-center justify-center gap-4 py-1">
            {/* Vertikales Thermometer */}
            <div className="relative w-8 h-full max-h-[160px] flex flex-col justify-end items-center rounded-full border-2 border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-white/5 overflow-hidden shadow-inner">
              <div
                className="w-full bg-gradient-to-t from-rose-500 via-amber-500 to-emerald-500 transition-all duration-500 rounded-b-full"
                style={{ height: `${progressPercent}%` }}
              />
            </div>

            {/* Skala und Text */}
            <div className="flex flex-col justify-between h-full max-h-[160px] py-1 text-left">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                  Ziel: {goal}
                </span>
                <span className="text-2xl font-black leading-none">{count}</span>
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {goalAchieved ? 'Vollständig!' : `Noch ${remainingUntilGoal} zum Ziel`}
              </div>
              <div>
                <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  {progressPercent}% erreicht
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 3. VISUALISIERUNGS-STIL: BAROMETER (RING) */}
        {style === 'barometer' && (
          <div className="flex-1 w-full flex flex-col items-center justify-center relative py-1">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-200 dark:stroke-white/10"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-indigo-500 transition-all duration-500"
                  strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercent / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl" role="img" aria-label="Symbol">
                  {symbol}
                </span>
                <span className="text-sm font-black mt-0.5">{count} / {goal}</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1">
              {progressPercent}% geschafft
            </span>
          </div>
        )}
      </div>

      {/* FOOTER / AKTIONEN (MINDESTENS 44px TOUCH-TARGET) */}
      <div className="shrink-0 p-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.02]">
        {/* Korrektur-Button (-1) */}
        <button
          type="button"
          id="reward-correction-btn"
          onClick={handleCorrection}
          disabled={count <= 0}
          className="h-11 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
          title="Korrektur: Eine Fehleingabe zurücknehmen (keine Strafe)"
        >
          <span>−1 Korrektur</span>
        </button>

        {/* Großer +1 Primär-Button (mind. 44px Höhe) */}
        <button
          type="button"
          id="reward-add-btn"
          onClick={handleAdd}
          className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-98 text-white font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          title={`+1 ${symbol} hinzufügen`}
        >
          <Sparkles size={16} className="shrink-0" />
          <span>+1 {symbol}</span>
        </button>

        {/* Reset / Leeren Dialog Trigger */}
        <button
          type="button"
          id="reward-reset-btn"
          onClick={() => setIsConfirmingReset(true)}
          className="w-11 h-11 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors shrink-0"
          title="Klassenziel leeren / neu starten"
        >
          <RotateCcw size={15} />
        </button>
      </div>

      {/* MODAL / SETTINGS DRAWER */}
      {isSettingsOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Klassenziel anpassen"
          className="fixed inset-0 z-[99999] mx-auto flex w-full max-w-xl flex-col justify-between overflow-y-auto bg-white p-4 text-slate-900 shadow-2xl dark:bg-zinc-900 dark:text-white sm:inset-y-4 sm:rounded-2xl sm:p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-2">
              <h4 className="text-xs font-black uppercase tracking-wider">Klassenziel anpassen</h4>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Ziel-Titel */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Belohnung / Ziel-Name
              </label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                placeholder="z.B. Gemeinsame Spielzeit"
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-transparent focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Zielwert */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Ziel-Anzahl (1 – 1000)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[10, 20, 30, 50, 100].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setEditGoal(quick)}
                    className={`px-2 py-1 rounded text-xs font-bold border ${
                      editGoal === quick
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {quick}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={editGoal}
                  onChange={(e) => { setEditGoal(Number(e.target.value)); setSettingsError(''); }}
                  aria-label="Zielanzahl"
                  className="w-16 px-2 py-1 text-xs rounded border border-slate-200 dark:border-white/10 bg-transparent text-center font-bold"
                />
              </div>
              {settingsError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-bold text-rose-700">{settingsError}</p>}
            </div>

            {/* Symbol-Auswahl */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Sammelsymbol
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_SYMBOLS.map((s) => (
                  <button
                    key={s.char}
                    type="button"
                    onClick={() => setEditSymbol(s.char)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${
                      editSymbol === s.char
                        ? 'bg-emerald-500/20 border-emerald-500 scale-110'
                        : 'border-slate-200 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                    title={s.label}
                  >
                    {s.char}
                  </button>
                ))}
              </div>
            </div>

            {/* Darstellungsstil */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                Darstellungsform
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {AVAILABLE_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setEditStyle(st.id)}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border flex flex-col items-center gap-0.5 ${
                      editStyle === st.id
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-sm">{st.icon}</span>
                    <span className="truncate">{st.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-black/5 dark:border-white/10 flex gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(false)}
              className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="flex-1 py-2 rounded-xl text-xs font-black bg-emerald-500 text-white shadow-sm"
            >
              Speichern
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* RESET BESTÄTIGUNGS-MODAL */}
      {isConfirmingReset && createPortal(
        <div role="alertdialog" aria-modal="true" aria-label="Klassenziel zurücksetzen"
          className="fixed inset-0 z-[99999] mx-auto flex w-full max-w-md flex-col items-center justify-center bg-white p-6 text-center text-slate-900 shadow-2xl dark:bg-zinc-900 dark:text-white sm:inset-y-4 sm:rounded-2xl">
          <RotateCcw size={28} className="text-rose-500 mb-2 animate-spin-once" />
          <h4 className="text-sm font-black mb-1">Klassenziel neu starten?</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[220px]">
            Der Zähler wird auf 0 zurückgesetzt. Das Ziel ({goal} {symbol}) bleibt erhalten.
          </p>
          <div className="flex gap-2 w-full max-w-[200px]">
            <button
              type="button"
              onClick={() => setIsConfirmingReset(false)}
              className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300"
            >
              Nein
            </button>
            <button
              type="button"
              onClick={handleConfirmReset}
              className="flex-1 py-2 rounded-xl text-xs font-black bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
            >
              Ja, leeren
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
