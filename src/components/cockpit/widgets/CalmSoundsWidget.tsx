import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Square,
  Volume2,
  VolumeX,
  Clock,
  Settings2,
  Check,
  Sparkles,
} from 'lucide-react';
import { CockpitWidgetConfig } from '../../../types';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  CalmSoundSettings,
  CalmTrackId,
  CALM_TRACKS,
  DEFAULT_CALM_SETTINGS,
  sanitizeCalmSettings,
  formatTimerSeconds,
  CalmAudioEngine,
} from '../../../lib/calmFocusEngine';

export interface CalmSoundsWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const CalmSoundsWidget: React.FC<CalmSoundsWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('calmrain', containerRef);

  // Settings aus widget.settings laden und absichern
  const settings: CalmSoundSettings = useMemo(() => {
    return sanitizeCalmSettings(widget.settings);
  }, [widget.settings]);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [showMixerDetails, setShowMixerDetails] = useState<boolean>(false);

  // Singleton Audio Engine Ref für diese Widget-Instanz
  const engineRef = useRef<CalmAudioEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new CalmAudioEngine();
  }

  // Helfer zum Aktualisieren und Persistieren der Settings
  const updateSettings = useCallback((newSettings: CalmSoundSettings) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          ...newSettings,
        },
      });
    }
    // Echtzeit-Lautstärkeanpassung im Audio-Engine
    if (engineRef.current && engineRef.current.running) {
      engineRef.current.updateVolumes(newSettings);
    }
  }, [onUpdate, widget.settings]);

  // Audio stoppen & bereinigen
  const handleStop = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
    }
    setIsPlaying(false);
    setSecondsRemaining(null);
  }, []);

  // Audio starten
  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start(settings);
    }
    setIsPlaying(true);

    if (settings.timerMinutes !== 'endless') {
      const totalSecs = (settings.timerMinutes as number) * 60;
      setSecondsRemaining(totalSecs);
    } else {
      setSecondsRemaining(null);
    }
  }, [settings]);

  // Unmount Cleanup: Garantierte Freigabe aller Audio-Ressourcen
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  // Timer Countdown-Logik
  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying && secondsRemaining !== null) {
      intervalId = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleStop();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, secondsRemaining, handleStop]);

  // Toggle Track Aktiv / Inaktiv
  const handleToggleTrack = (trackId: CalmTrackId) => {
    const updatedActive = {
      ...settings.activeTracks,
      [trackId]: !settings.activeTracks[trackId],
    };
    updateSettings({
      ...settings,
      activeTracks: updatedActive,
    });
  };

  // Lautstärke einer einzelnen Spur anpassen
  const handleTrackVolumeChange = (trackId: CalmTrackId, vol: number) => {
    const updatedVolumes = {
      ...settings.volumes,
      [trackId]: vol,
    };
    const updatedActive = {
      ...settings.activeTracks,
      // Wenn Lautstärke hochgezogen wird, Spur automatisch aktivieren
      [trackId]: vol > 0 ? true : settings.activeTracks[trackId],
    };
    updateSettings({
      ...settings,
      volumes: updatedVolumes,
      activeTracks: updatedActive,
    });
  };

  // Master Lautstärke
  const handleMasterVolumeChange = (vol: number) => {
    updateSettings({
      ...settings,
      masterVolume: vol,
    });
  };

  // Timer-Preset ändern
  const handleSelectTimer = (val: number | 'endless') => {
    updateSettings({
      ...settings,
      timerMinutes: val,
    });
    if (isPlaying) {
      if (val === 'endless') {
        setSecondsRemaining(null);
      } else {
        setSecondsRemaining(val * 60);
      }
    }
  };

  // Alle Sounds stummschalten / wiederherstellen
  const isAllMuted = settings.masterVolume === 0;
  const toggleMasterMute = () => {
    if (isAllMuted) {
      handleMasterVolumeChange(70);
    } else {
      handleMasterVolumeChange(0);
    }
  };

  const timerOptions: { label: string; value: number | 'endless' }[] = [
    { label: 'Endlos', value: 'endless' },
    { label: '5m', value: 5 },
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '60m', value: 60 },
  ];

  // Aktive Spuren filtern
  const activeTrackCount = Object.values(settings.activeTracks).filter(Boolean).length;

  return (
    <div
      ref={containerRef}
      id={`calmrain-widget-${widget.id}`}
      className={`w-full h-full flex flex-col justify-between select-none overflow-hidden ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      } ${
        size.category === 'compact'
          ? 'p-2.5 text-xs'
          : size.category === 'large'
          ? 'p-4 text-sm'
          : size.category === 'fullscreen'
          ? 'p-6 text-base max-w-5xl mx-auto'
          : 'p-3 text-xs'
      }`}
    >
      {/* 1. Headerzeile: Titel, Status & Timer-Badge */}
      <div className="flex items-center justify-between shrink-0 mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center shrink-0 text-base">
            🌧️
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-sm truncate">Fokus & Naturklänge</h2>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktiv
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-70 truncate">
              Ruhige Geräuschkulisse für Stillarbeit
            </p>
          </div>
        </div>

        {/* Timer Restzeit / Preset Badge */}
        {secondsRemaining !== null && isPlaying && (
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-bold shrink-0">
            <Clock size={13} />
            <span>{formatTimerSeconds(secondsRemaining)}</span>
          </div>
        )}
      </div>

      {/* 2. Hauptbereich: Je nach Kategorie COMPACT vs STANDARD/LARGE/FULLSCREEN */}
      <div className="flex-grow flex flex-col justify-center min-h-0 overflow-y-auto overflow-x-hidden gap-2.5 py-1">
        
        {/* COMPACT LAYOUT (280–379 px) */}
        {size.category === 'compact' ? (
          <div className="flex flex-col gap-2.5 my-auto">
            {/* Großer Start / Stopp Button */}
            <button
              id={`calmrain-toggle-btn-${widget.id}`}
              onClick={isPlaying ? handleStop : handleStart}
              style={{ minHeight: `${TOUCH_TARGET_MIN}px` }}
              className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm ${
                isPlaying
                  ? 'bg-rose-500 hover:bg-rose-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square size={16} className="fill-current" />
                  <span>Stoppen</span>
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current" />
                  <span>Klänge starten</span>
                </>
              )}
            </button>

            {/* Master Lautstärke Slider */}
            <div className={`p-2 rounded-xl border ${currentIsLight ? 'bg-slate-50 border-slate-200/80' : 'bg-zinc-900/60 border-white/5'}`}>
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Volume2 size={13} />
                  Gesamtlautstärke
                </span>
                <span className="font-mono">{settings.masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.masterVolume}
                onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
                aria-label="Gesamtlautstärke"
                className="w-full accent-blue-600 cursor-pointer h-2 rounded-lg bg-slate-200 dark:bg-zinc-700"
              />
            </div>

            {/* Schnellauswahl der Klangspuren als Chips */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold opacity-70 uppercase tracking-wider mb-1.5">
                <span>Klangquellen ({activeTrackCount})</span>
                <button
                  onClick={() => setShowMixerDetails(!showMixerDetails)}
                  className="text-blue-500 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <Settings2 size={11} />
                  {showMixerDetails ? 'Kompakt' : 'Regler'}
                </button>
              </div>

              {!showMixerDetails ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {CALM_TRACKS.map((track) => {
                    const isActive = !!settings.activeTracks[track.id];
                    return (
                      <button
                        key={track.id}
                        id={`calmrain-track-btn-${track.id}`}
                        onClick={() => handleToggleTrack(track.id)}
                        style={{ minHeight: '38px' }}
                        className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer border ${
                          isActive
                            ? currentIsLight
                              ? 'bg-blue-50 border-blue-300 text-blue-900'
                              : 'bg-blue-950/50 border-blue-700 text-blue-100'
                            : currentIsLight
                            ? 'bg-white border-slate-200 text-slate-500 opacity-60 hover:opacity-100'
                            : 'bg-zinc-800 border-zinc-700 text-slate-400 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{track.icon}</span>
                          <span className="truncate">{track.label}</span>
                        </span>
                        {isActive && <Check size={13} className="text-blue-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {CALM_TRACKS.map((track) => {
                    const isActive = !!settings.activeTracks[track.id];
                    return (
                      <div
                        key={track.id}
                        className={`p-1.5 rounded-lg border text-[11px] ${
                          currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-800 border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <label className="flex items-center gap-1.5 font-semibold cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isActive}
                              onChange={() => handleToggleTrack(track.id)}
                              className="rounded accent-blue-600"
                            />
                            <span>{track.icon} {track.label}</span>
                          </label>
                          <span className="font-mono text-[10px]">{settings.volumes[track.id]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          disabled={!isActive}
                          value={settings.volumes[track.id]}
                          onChange={(e) => handleTrackVolumeChange(track.id, Number(e.target.value))}
                          aria-label={`Lautstärke für ${track.label}`}
                          className={`w-full h-1.5 rounded-lg accent-blue-600 cursor-pointer ${
                            !isActive ? 'opacity-30 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* STANDARD / LARGE / FULLSCREEN LAYOUT */
          <div className="flex flex-col gap-3 my-auto">
            {/* Hauptsteuerleiste: Start/Stopp & Gesamtlautstärke */}
            <div className={`p-3 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
              currentIsLight ? 'bg-slate-50 border-slate-200/90' : 'bg-zinc-900/70 border-white/5'
            }`}>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  id={`calmrain-toggle-btn-${widget.id}`}
                  onClick={isPlaying ? handleStop : handleStart}
                  style={{ minHeight: `${TOUCH_TARGET_MIN}px` }}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm text-sm ${
                    isPlaying
                      ? 'bg-rose-500 hover:bg-rose-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Square size={16} className="fill-current" />
                      <span>Stoppen</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} className="fill-current" />
                      <span>Klänge starten</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleMasterMute}
                  title={isAllMuted ? "Ton an" : "Stummschalten"}
                  aria-label="Lautstärke stummschalten"
                  style={{ minWidth: `${TOUCH_TARGET_MIN}px`, minHeight: `${TOUCH_TARGET_MIN}px` }}
                  className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    isAllMuted
                      ? 'bg-rose-500/10 text-rose-500 border-rose-300 dark:border-rose-800'
                      : currentIsLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'bg-zinc-800 border-zinc-700 text-slate-300 hover:bg-zinc-700'
                  }`}
                >
                  {isAllMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>

              {/* Master Volume Slider */}
              <div className="w-full sm:w-56 flex items-center gap-2">
                <span className="text-xs font-semibold whitespace-nowrap opacity-80">Master:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.masterVolume}
                  onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
                  aria-label="Master-Lautstärke"
                  className="w-full accent-blue-600 cursor-pointer h-2 rounded-lg bg-slate-200 dark:bg-zinc-700"
                />
                <span className="font-mono text-xs w-8 text-right">{settings.masterVolume}%</span>
              </div>
            </div>

            {/* Kachel-Raster für die 5 Naturklänge */}
            <div className={`grid gap-2 ${
              size.category === 'fullscreen'
                ? 'grid-cols-5'
                : size.category === 'large'
                ? 'grid-cols-3 sm:grid-cols-3'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}>
              {CALM_TRACKS.map((track) => {
                const isActive = !!settings.activeTracks[track.id];
                const volume = settings.volumes[track.id];

                return (
                  <div
                    key={track.id}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                      isActive
                        ? currentIsLight
                          ? 'bg-white border-blue-200 shadow-sm'
                          : 'bg-zinc-900 border-blue-900/50 shadow-sm'
                        : currentIsLight
                        ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                        : 'bg-zinc-900/40 border-white/5 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleToggleTrack(track.id)}
                        className="flex items-center gap-2 font-bold text-xs cursor-pointer text-left truncate"
                        title={isActive ? "Spur deaktivieren" : "Spur aktivieren"}
                      >
                        <span className="text-lg">{track.icon}</span>
                        <div className="truncate">
                          <span className="block truncate">{track.label}</span>
                          <span className="block text-[10px] opacity-60 truncate font-normal">
                            {track.sublabel}
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => handleToggleTrack(track.id)}
                        aria-label={`${track.label} ${isActive ? 'deaktivieren' : 'aktivieren'}`}
                        style={{ minWidth: '32px', minHeight: '32px' }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
                          isActive
                            ? 'bg-blue-600 text-white border-blue-700'
                            : currentIsLight
                            ? 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                        }`}
                      >
                        <Check size={14} className={isActive ? 'opacity-100' : 'opacity-0'} />
                      </button>
                    </div>

                    {/* Spur Lautstärkeregler */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-mono opacity-70">
                        <span>Lautstärke</span>
                        <span>{volume}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        disabled={!isActive}
                        value={volume}
                        onChange={(e) => handleTrackVolumeChange(track.id, Number(e.target.value))}
                        aria-label={`Lautstärke ${track.label}`}
                        className={`w-full h-1.5 rounded-lg accent-blue-600 cursor-pointer ${
                          !isActive ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 3. Footer: Schlummer-Timer Schnellwahl */}
      <div className={`mt-2 pt-2 border-t shrink-0 flex items-center justify-between gap-2 text-xs ${
        currentIsLight ? 'border-slate-200' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-1.5 opacity-70 text-[11px] font-semibold shrink-0">
          <Clock size={12} />
          <span>Timer:</span>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {timerOptions.map((opt) => {
            const isSelected = settings.timerMinutes === opt.value;
            return (
              <button
                key={String(opt.value)}
                onClick={() => handleSelectTimer(opt.value)}
                style={{ minHeight: '28px' }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white font-bold'
                    : currentIsLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
