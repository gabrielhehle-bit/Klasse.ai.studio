import React, { useState, useEffect, useRef } from 'react';
import {
  CLASSROOM_SOUNDS,
  ClassroomSoundId,
  classroomSoundEngine,
  DEFAULT_SOUNDS_SETTINGS,
} from '../../../lib/soundsAlgorithm';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import { Bell, Square, Volume2 } from 'lucide-react';

interface SoundsWidgetProps {
  widget: any;
  onUpdate?: (updates: any) => void;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const SoundsWidget: React.FC<SoundsWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('SoundsWidget', containerRef);

  const [activePlayingId, setActivePlayingId] = useState<ClassroomSoundId | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  const volume: number = widget.settings?.volume ?? DEFAULT_SOUNDS_SETTINGS.volume;

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      classroomSoundEngine.stopAll();
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
      }
    };
  }, []);

  const handlePlaySound = (soundId: ClassroomSoundId) => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    classroomSoundEngine.play(soundId, volume);
    setActivePlayingId(soundId);

    const sound = CLASSROOM_SOUNDS.find((s) => s.id === soundId);
    const durationMs = (sound?.durationSec ?? 2.0) * 1000;

    playTimeoutRef.current = window.setTimeout(() => {
      setActivePlayingId(null);
    }, durationMs);
  };

  const handleStopAll = () => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    classroomSoundEngine.stopAll();
    setActivePlayingId(null);
  };

  const handleVolumeChange = (newVol: number) => {
    if (onUpdate) {
      onUpdate({
        settings: {
          ...widget.settings,
          volume: newVol,
        },
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex flex-col justify-between select-none p-3 overflow-hidden transition-colors ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Bell size={size.isCompact ? 14 : 16} className="text-amber-500" />
          <span className="text-[11px] font-black uppercase tracking-wider truncate">
            Unterrichtssignale
          </span>
        </div>

        {/* Stopp-Button & Status */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleStopAll}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer min-h-[32px] ${
              activePlayingId
                ? 'bg-rose-500 text-white shadow-sm animate-pulse'
                : currentIsLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
            }`}
            title="Alle Sounds sofort stoppen"
          >
            <Square size={10} className={activePlayingId ? 'fill-current' : ''} />
            <span>Stopp</span>
          </button>
        </div>
      </div>

      {/* 2. Main Sound Buttons Grid */}
      <div className="flex-1 flex flex-col justify-center my-2 min-h-0 w-full">
        {/* COMPACT VIEW (280–379 px): 4 Haupt-Signale */}
        {size.isCompact ? (
          <div className="grid grid-cols-2 gap-2 h-full py-1">
            {CLASSROOM_SOUNDS.slice(0, 4).map((s) => {
              const isPlaying = activePlayingId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePlaySound(s.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer active:scale-95 min-h-[44px] ${
                    isPlaying
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm scale-102'
                      : currentIsLight
                        ? 'bg-white border-slate-200/90 hover:bg-amber-50/50 hover:border-amber-300 text-slate-700'
                        : 'bg-zinc-850/90 border-zinc-750 hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span className={`text-2xl mb-0.5 ${isPlaying ? 'animate-bounce' : ''}`}>
                    {s.icon}
                  </span>
                  <span className="text-[10px] font-black leading-tight truncate w-full">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          /* STANDARD, LARGE & FULLSCREEN (>= 380 px): Alle 6 Schulsounds */
          <div
            className={`grid gap-2 h-full items-center ${
              size.category === 'fullscreen' || isFullscreen
                ? 'grid-cols-3 p-4 max-w-4xl mx-auto w-full'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {CLASSROOM_SOUNDS.map((s) => {
              const isPlaying = activePlayingId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePlaySound(s.id)}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all cursor-pointer active:scale-95 min-h-[52px] ${
                    isPlaying
                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 shadow-md scale-102 ring-2 ring-amber-500/30'
                      : currentIsLight
                        ? 'bg-white border-slate-200/90 hover:bg-amber-50/40 hover:border-amber-300 text-slate-700 shadow-xs'
                        : 'bg-zinc-850/90 border-zinc-750 hover:bg-zinc-800 text-zinc-200'
                  }`}
                >
                  <span
                    className={`text-2xl sm:text-3xl mb-1 ${
                      isPlaying ? 'animate-bounce scale-110' : 'group-hover:scale-105'
                    }`}
                  >
                    {s.icon}
                  </span>
                  <span className="text-[10.5px] font-black leading-tight">{s.label}</span>
                  {!size.isCompact && (
                    <span className="text-[8.5px] opacity-65 truncate w-full mt-0.5 font-medium">
                      {s.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Footer: Lautstärke-Einstellung */}
      <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
          <Volume2 size={12} />
          <span>Lautstärke:</span>
        </div>

        <div className="flex items-center gap-1">
          {[0.3, 0.7, 1.0].map((volVal) => (
            <button
              key={volVal}
              type="button"
              onClick={() => handleVolumeChange(volVal)}
              className={`px-2 py-0.5 text-[8.5px] font-bold rounded-md transition-all cursor-pointer ${
                Math.abs(volume - volVal) < 0.1
                  ? 'bg-amber-500 text-white shadow-xs'
                  : currentIsLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }`}
            >
              {volVal === 0.3 ? 'Leise' : volVal === 0.7 ? 'Mittel' : 'Laut'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
