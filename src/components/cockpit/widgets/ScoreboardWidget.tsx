import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Trophy,
  Plus,
  Minus,
  RotateCcw,
  Check,
  X,
  Volume2,
  VolumeX,
  Settings2,
  UserPlus,
  Trash2,
  Edit2,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  ScoreboardSettings,
  ScoreboardTeam,
  MIN_TEAMS,
  MAX_TEAMS,
  DEFAULT_SCOREBOARD_SETTINGS,
  TEAM_COLOR_PRESETS,
  COLOR_KEYS_SEQUENCE,
  sanitizeScoreboardSettings,
  incrementScore,
  correctScore,
  addTeam,
  updateTeam,
  removeTeam,
  startNewRound,
  finishRound,
  resetAllTeams,
  getWinners,
} from '../../../lib/scoreboardAlgorithm';

export interface ScoreboardWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

// Lokaler synthetischer Audio-Ton (reine Web Audio API, 100% offline, keine Dateien)
function playSubtleClick(type: 'point' | 'correct' | 'winner' = 'point') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'point') {
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'correct') {
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'winner') {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.1);
      osc.frequency.setValueAtTime(783.99, now + 0.2);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch {
    // Stille Behandlung falls AudioContext im Browser blockiert ist
  }
}

export const ScoreboardWidget: React.FC<ScoreboardWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('ScoreboardWidget', containerRef);

  // Settings aus widget.settings initialisieren
  const initialSettings = useMemo<ScoreboardSettings>(() => {
    return sanitizeScoreboardSettings(widget?.settings);
  }, [widget?.settings]);

  const [settings, setSettings] = useState<ScoreboardSettings>(initialSettings);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [isConfirmingFullReset, setIsConfirmingFullReset] = useState<boolean>(false);
  const [isConfirmingNewRound, setIsConfirmingNewRound] = useState<boolean>(false);

  // Synchronisation bei externen Widget-Updates
  useEffect(() => {
    setSettings(sanitizeScoreboardSettings(widget?.settings));
  }, [widget?.settings]);

  const persistSettings = useCallback(
    (newSettings: ScoreboardSettings) => {
      setSettings(newSettings);
      if (onUpdate) {
        onUpdate({
          settings: {
            ...widget?.settings,
            teams: newSettings.teams,
            roundFinished: newSettings.roundFinished,
            stepSize: newSettings.stepSize,
            soundEnabled: newSettings.soundEnabled,
          },
        });
      }
    },
    [onUpdate, widget?.settings]
  );

  const { winners, isTie, maxScore } = useMemo(() => {
    return getWinners(settings);
  }, [settings]);

  // Aktionen
  const handleAddPoint = (teamId: string) => {
    const step = settings.stepSize || 1;
    const next = incrementScore(settings, teamId, step);
    persistSettings(next);
    if (settings.soundEnabled) playSubtleClick('point');
  };

  const handleCorrectPoint = (teamId: string) => {
    const next = correctScore(settings, teamId, 1);
    persistSettings(next);
    if (settings.soundEnabled) playSubtleClick('correct');
  };

  const handleStartNewRound = () => {
    const next = startNewRound(settings);
    persistSettings(next);
    setIsConfirmingNewRound(false);
  };

  const handleFinishRound = () => {
    const next = finishRound(settings);
    persistSettings(next);
    if (settings.soundEnabled) playSubtleClick('winner');
  };

  const handleFullReset = () => {
    const next = resetAllTeams();
    persistSettings(next);
    setIsConfirmingFullReset(false);
    setShowSettingsMenu(false);
  };

  const handleAddTeam = () => {
    const next = addTeam(settings);
    persistSettings(next);
  };

  const handleRemoveTeam = (teamId: string) => {
    const next = removeTeam(settings, teamId);
    persistSettings(next);
  };

  const handleStartEdit = (team: ScoreboardTeam) => {
    setEditingTeamId(team.id);
    setEditName(team.name);
  };

  const handleSaveEdit = (teamId: string) => {
    if (!editingTeamId) return;
    const next = updateTeam(settings, teamId, { name: editName });
    persistSettings(next);
    setEditingTeamId(null);
  };

  const handleToggleSound = () => {
    const next: ScoreboardSettings = {
      ...settings,
      soundEnabled: !settings.soundEnabled,
    };
    persistSettings(next);
  };

  const handleSetStepSize = (step: 1 | 2 | 5) => {
    const next: ScoreboardSettings = {
      ...settings,
      stepSize: step,
    };
    persistSettings(next);
  };

  const teams = settings.teams;
  const winnerIds = useMemo(() => new Set(winners.map((w) => w.id)), [winners]);

  // Bestimme Spaltenanzahl adaptiv nach Widget-Kategorie & Team-Anzahl
  const gridClass = useMemo(() => {
    if (size.isCompact) {
      return 'flex flex-col gap-2';
    }
    if (size.category === 'standard') {
      return teams.length === 2 ? 'grid grid-cols-2 gap-2.5' : 'grid grid-cols-2 gap-2';
    }
    if (size.category === 'large') {
      if (teams.length <= 2) return 'grid grid-cols-2 gap-4';
      if (teams.length <= 4) return 'grid grid-cols-2 lg:grid-cols-4 gap-3';
      return 'grid grid-cols-3 gap-3';
    }
    // Fullscreen
    if (teams.length === 2) return 'grid grid-cols-2 gap-8 h-full items-stretch';
    if (teams.length === 3) return 'grid grid-cols-3 gap-6 h-full items-stretch';
    if (teams.length === 4) return 'grid grid-cols-2 md:grid-cols-4 gap-6 h-full items-stretch';
    return 'grid grid-cols-2 md:grid-cols-3 gap-5 h-full items-stretch';
  }, [size.category, size.isCompact, teams.length]);

  return (
    <div
      ref={containerRef}
      id={`scoreboard-${widget.id}`}
      className={`relative w-full h-full flex flex-col justify-between select-none overflow-hidden ${
        size.isCompact ? 'p-2' : size.category === 'standard' ? 'p-3' : isFullscreen ? 'p-6 sm:p-8' : 'p-4'
      }`}
    >
      {/* KOPFZEILE */}
      <header className="flex items-center justify-between shrink-0 mb-2 gap-2 border-b border-black/5 dark:border-white/5 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Trophy size={16} />
          </div>
          <div className="min-w-0">
            <h3
              className={`font-black uppercase tracking-wider truncate leading-tight ${
                size.isCompact ? 'text-[11px]' : 'text-xs'
              } ${currentIsLight ? 'text-slate-800' : 'text-slate-100'}`}
            >
              Team-Scoreboard
            </h3>
            {settings.roundFinished && (
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Award size={11} />
                {isTie ? 'Gleichstand!' : `Sieger: ${winners[0]?.name || ''}`}
              </span>
            )}
          </div>
        </div>

        {/* Kopfzeilen-Aktionen */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Runde beenden Button */}
          {!settings.roundFinished && maxScore > 0 && (
            <button
              onClick={handleFinishRound}
              title="Runde beenden & Sieger hervorheben"
              aria-label="Runde beenden"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm ${
                currentIsLight
                  ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/60'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
              }`}
              style={{ minHeight: TOUCH_TARGET_MIN }}
            >
              <Trophy size={14} className="text-amber-500" />
              {!size.isCompact && <span>Runde beenden</span>}
            </button>
          )}

          {/* Neue Runde Button */}
          {isConfirmingNewRound ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl px-2 py-1">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Punkte 0?</span>
              <button
                onClick={handleStartNewRound}
                aria-label="Neue Runde bestätigen"
                className="p-1 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              >
                <Check size={13} />
              </button>
              <button
                onClick={() => setIsConfirmingNewRound(false)}
                aria-label="Abbrechen"
                className="p-1 rounded-lg bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                if (maxScore > 0) {
                  setIsConfirmingNewRound(true);
                } else {
                  handleStartNewRound();
                }
              }}
              title="Neue Runde starten (setzt Punkte auf 0)"
              aria-label="Neue Runde starten"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer border ${
                settings.roundFinished
                  ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700 shadow-sm'
                  : currentIsLight
                  ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-slate-200 border-zinc-700'
              }`}
              style={{ minHeight: TOUCH_TARGET_MIN }}
            >
              <RotateCcw size={13} />
              {!size.isCompact && <span>Neue Runde</span>}
            </button>
          )}

          {/* Menü / Einstellungen Toggle */}
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            title="Einstellungen"
            aria-label="Scoreboard Einstellungen"
            className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
              showSettingsMenu
                ? 'bg-indigo-500 text-white border-indigo-600'
                : currentIsLight
                ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300 border-zinc-700'
            }`}
          >
            <Settings2 size={15} />
          </button>
        </div>
      </header>

      {/* EINSTELLUNGS-DRAWER / MODAL */}
      <AnimatePresence>
        {showSettingsMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`absolute top-12 left-2 right-2 z-30 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md ${
              currentIsLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-zinc-900/95 border-zinc-700 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/5">
              <span className="text-xs font-black uppercase tracking-wider">Scoreboard Optionen</span>
              <button
                onClick={() => setShowSettingsMenu(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400"
              >
                <X size={15} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Teams verwalten */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">
                  Teams ({teams.length}/{MAX_TEAMS}):
                </span>
                <button
                  onClick={handleAddTeam}
                  disabled={teams.length >= MAX_TEAMS}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <UserPlus size={13} />
                  <span>Team hinzufügen</span>
                </button>
              </div>

              {/* Schrittweite */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Schrittweite:</span>
                <div className="flex items-center gap-1">
                  {([1, 2, 5] as const).map((step) => (
                    <button
                      key={step}
                      onClick={() => handleSetStepSize(step)}
                      className={`px-2.5 py-1 rounded-lg font-black text-xs transition-all ${
                        settings.stepSize === step
                          ? 'bg-indigo-500 text-white'
                          : 'bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      +{step}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ton an/aus */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Signalton:</span>
                <button
                  onClick={handleToggleSound}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold transition-all ${
                    settings.soundEnabled
                      ? 'bg-emerald-500 text-white'
                      : 'bg-black/5 dark:bg-white/5 text-slate-500'
                  }`}
                >
                  {settings.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  <span>{settings.soundEnabled ? 'Aktiv' : 'Stumm'}</span>
                </button>
              </div>

              {/* Teams komplett zurücksetzen */}
              <div className="pt-2 border-t border-black/5 dark:border-white/5">
                {isConfirmingFullReset ? (
                  <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 space-y-2">
                    <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
                      Wirklich alle Teams und Punkte auf Anfang zurücksetzen?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleFullReset}
                        className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-lg text-xs"
                      >
                        Ja, zurücksetzen
                      </button>
                      <button
                        onClick={() => setIsConfirmingFullReset(false)}
                        className="flex-1 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs"
                      >
                        Abbrechen
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsConfirmingFullReset(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 transition-all font-bold"
                  >
                    <RotateCcw size={13} />
                    <span>Teams auf Standard zurücksetzen</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TEAM-RASTER */}
      <div className="flex-grow overflow-y-auto min-h-0 py-1">
        <div className={gridClass}>
          {teams.map((team, idx) => {
            const colorCfg = TEAM_COLOR_PRESETS[team.colorKey] || TEAM_COLOR_PRESETS.red;
            const isWinner = settings.roundFinished && winnerIds.has(team.id) && maxScore > 0;
            const isEditing = editingTeamId === team.id;

            if (size.isCompact) {
              // COMPACT-ANSICHT (280–379 px)
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-2 rounded-2xl border transition-all ${
                    isWinner
                      ? 'bg-amber-100/90 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400 shadow-md'
                      : currentIsLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-zinc-800/40 border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                    <span className="text-base shrink-0">{team.icon || colorCfg.icon}</span>
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={() => handleSaveEdit(team.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(team.id)}
                            autoFocus
                            className="w-full text-xs font-bold px-1.5 py-0.5 rounded border border-indigo-400 outline-none bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100"
                          />
                          <button
                            onClick={() => handleSaveEdit(team.id)}
                            className="p-1 text-emerald-500"
                          >
                            <Check size={13} />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEdit(team)}
                          title="Klicken zum Umbenennen"
                          className="flex items-center gap-1 cursor-pointer group"
                        >
                          <span className="text-xs font-black truncate">{team.name}</span>
                          <Edit2
                            size={10}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity shrink-0"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Punktestand & Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCorrectPoint(team.id)}
                      disabled={team.score <= 0}
                      aria-label={`${team.name} Punkt korrigieren`}
                      title="Fehlklick korrigieren (-1)"
                      className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-200/80 dark:bg-zinc-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-black text-xs"
                      style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
                    >
                      <Minus size={13} />
                    </button>

                    <div className="w-12 text-center">
                      <motion.span
                        key={team.score}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className={`text-2xl font-black tracking-tight ${
                          isWinner ? 'text-amber-600 dark:text-amber-400' : ''
                        }`}
                      >
                        {team.score}
                      </motion.span>
                    </div>

                    <button
                      onClick={() => handleAddPoint(team.id)}
                      aria-label={`${team.name} Punkt hinzufügen`}
                      title={`Punkt hinzufügen (+${settings.stepSize || 1})`}
                      className={`h-11 px-3.5 flex items-center justify-center rounded-xl font-black text-sm text-white shadow-sm transition-transform active:scale-95 cursor-pointer ${colorCfg.badgeBg}`}
                      style={{ minHeight: TOUCH_TARGET_MIN }}
                    >
                      <Plus size={16} />
                      <span className="ml-0.5">+{settings.stepSize || 1}</span>
                    </button>
                  </div>
                </div>
              );
            }

            // STANDARD, LARGE & FULLSCREEN ANSICHT
            return (
              <div
                key={team.id}
                className={`flex flex-col justify-between rounded-2xl border transition-all relative ${
                  isWinner
                    ? 'bg-amber-100/90 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-400 shadow-lg'
                    : currentIsLight
                    ? `${colorCfg.bgLight} ${colorCfg.border}`
                    : `${colorCfg.bgDark} ${colorCfg.border}`
                } ${
                  isFullscreen
                    ? 'p-5 md:p-8'
                    : size.category === 'large'
                    ? 'p-3.5'
                    : 'p-2.5'
                }`}
              >
                {/* Sieger-Krone / Banner */}
                {isWinner && (
                  <div className="absolute -top-3 right-3 bg-amber-500 text-amber-950 text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10">
                    <Trophy size={12} />
                    <span>{isTie ? 'Gleichstand' : 'Führung'}</span>
                  </div>
                )}

                {/* Team-Header: Name & Farbe */}
                <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={isFullscreen ? 'text-3xl' : size.category === 'large' ? 'text-2xl' : 'text-xl'}>
                      {team.icon || colorCfg.icon}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full min-w-0">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={() => handleSaveEdit(team.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(team.id)}
                          autoFocus
                          className="w-full text-xs font-bold px-1.5 py-0.5 rounded border border-indigo-400 outline-none bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100"
                        />
                        <button
                          onClick={() => handleSaveEdit(team.id)}
                          className="p-1 text-emerald-500"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => handleStartEdit(team)}
                        title="Klicken zum Umbenennen"
                        className="flex items-center gap-1 cursor-pointer group min-w-0"
                      >
                        <span
                          className={`font-black uppercase tracking-wider truncate ${
                            isFullscreen
                              ? 'text-2xl md:text-3xl'
                              : size.category === 'large'
                              ? 'text-sm md:text-base'
                              : 'text-xs'
                          } ${currentIsLight ? 'text-slate-800' : 'text-slate-100'}`}
                        >
                          {team.name}
                        </span>
                        <Edit2
                          size={11}
                          className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity shrink-0 ml-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Team löschen (wenn > 2 Teams) */}
                  {teams.length > MIN_TEAMS && (
                    <button
                      onClick={() => handleRemoveTeam(team.id)}
                      title="Team entfernen"
                      aria-label={`${team.name} entfernen`}
                      className="opacity-40 hover:opacity-100 text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Punktanzeige */}
                <div className="flex-1 flex flex-col items-center justify-center my-auto py-2">
                  <motion.span
                    key={team.score}
                    initial={{ scale: 0.85, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`font-black tracking-tight tabular-nums select-none ${
                      isFullscreen
                        ? 'text-8xl md:text-9xl'
                        : size.category === 'large'
                        ? 'text-5xl md:text-6xl'
                        : 'text-4xl'
                    } ${
                      isWinner
                        ? 'text-amber-600 dark:text-amber-400'
                        : currentIsLight
                        ? 'text-slate-900'
                        : 'text-white'
                    }`}
                  >
                    {team.score}
                  </motion.span>
                </div>

                {/* Steuerungsleiste: Korrektur (-1) & Plus (+1) */}
                <div className="flex items-center gap-2 mt-1 shrink-0">
                  <button
                    onClick={() => handleCorrectPoint(team.id)}
                    disabled={team.score <= 0}
                    aria-label={`${team.name} Punkt korrigieren`}
                    title="Korrektur (-1)"
                    className={`flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer ${
                      isFullscreen
                        ? 'h-14 px-4 text-base'
                        : 'h-11 px-3 text-xs'
                    } ${
                      currentIsLight
                        ? 'bg-white/90 hover:bg-white text-slate-600 border border-slate-200 shadow-sm'
                        : 'bg-zinc-800/80 hover:bg-zinc-800 text-slate-300 border border-zinc-700 shadow-sm'
                    }`}
                    style={{ minHeight: TOUCH_TARGET_MIN, minWidth: TOUCH_TARGET_MIN }}
                  >
                    <Minus size={isFullscreen ? 18 : 14} />
                    {isFullscreen && <span className="ml-1 text-sm font-normal">Korrektur</span>}
                  </button>

                  <button
                    onClick={() => handleAddPoint(team.id)}
                    aria-label={`${team.name} Punkt hinzufügen`}
                    title={`Punkt hinzufügen (+${settings.stepSize || 1})`}
                    className={`flex-1 flex items-center justify-center rounded-xl font-black text-white transition-transform active:scale-95 shadow-md cursor-pointer ${colorCfg.badgeBg} ${
                      isFullscreen ? 'h-14 text-2xl' : 'h-11 text-base'
                    }`}
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                  >
                    <Plus size={isFullscreen ? 24 : 18} />
                    <span className="ml-1">+{settings.stepSize || 1}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FUSSZEILE (optional Team hinzufügen bei Platz) */}
      {!size.isCompact && teams.length < MAX_TEAMS && (
        <footer className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-400 font-semibold">
            Maximal 6 Teams • Neutral für Quiz & Gruppenspiele
          </span>
          <button
            onClick={handleAddTeam}
            aria-label="Team hinzufügen"
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
          >
            <UserPlus size={13} />
            <span>Team hinzufügen</span>
          </button>
        </footer>
      )}
    </div>
  );
};
