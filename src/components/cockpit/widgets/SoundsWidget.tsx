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
  /** Studio shows volume in the header gear instead of duplicating footer controls. */
  showVolumeControls?: boolean;
}

export const SoundsWidget: React.FC<SoundsWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  isFullscreen = false,
  showVolumeControls = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('SoundsWidget', containerRef);

  const [activePlayingId, setActivePlayingId] = useState<ClassroomSoundId | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  const volume: number = widget.settings?.volume ?? DEFAULT_SOUNDS_SETTINGS.volume;
  const compactGrid = size.width < 410 || size.height < 300;
  const showDescriptions = size.width >= 550 && size.height >= 360;

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

    if (!classroomSoundEngine.play(soundId, volume)) {
      setActivePlayingId(null);
      return;
    }
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
      className={`w-full h-full min-h-0 flex flex-col select-none ${compactGrid ? 'p-1.5 gap-1.5' : 'p-3 gap-2'} overflow-hidden transition-colors ${
        currentIsLight ? 'text-slate-800' : 'text-slate-100'
      }`}
    >
      {/* 1. Header */}
      <div className="flex min-h-11 items-center justify-between gap-2 shrink-0">
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
            className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 transition-all cursor-pointer min-h-11 min-w-11 ${
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

      {/* Both small and large frames expose ALL six sounds. The cards stretch
          across the whole content area; no compact-mode slice can hide tones. */}
      <div className="min-h-0 w-full flex-1">
        <div className={`grid h-full min-h-0 w-full grid-cols-3 grid-rows-2 ${compactGrid ? 'gap-1' : 'gap-2'}`}
          aria-label="Sechs Unterrichtssignale">
          {CLASSROOM_SOUNDS.map((sound) => {
            const isPlaying = activePlayingId === sound.id;
            return (
              <button key={sound.id} type="button" onClick={() => handlePlaySound(sound.id)}
                aria-label={sound.label}
                className={`flex min-h-11 min-w-0 flex-col items-center justify-center rounded-xl border text-center transition-all cursor-pointer active:scale-95
                  ${compactGrid ? 'p-1' : 'p-2.5'}
                  ${isPlaying
                    ? 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-sm ring-2 ring-amber-500/30'
                    : currentIsLight
                      ? 'bg-white border-slate-200/90 hover:bg-amber-50/50 hover:border-amber-300 text-slate-700'
                      : 'bg-zinc-850/90 border-zinc-750 hover:bg-zinc-800 text-zinc-200'}`}>
                <span aria-hidden="true" className={`${compactGrid ? 'text-xl' : 'text-3xl'} leading-none ${isPlaying ? 'animate-bounce' : ''}`}>
                  {sound.icon}
                </span>
                <span className={`w-full break-words font-black leading-tight ${compactGrid ? 'mt-0.5 text-[11px]' : 'mt-1 text-sm'}`}>
                  {sound.label}
                </span>
                {showDescriptions && <span className="mt-0.5 w-full text-xs opacity-65">
                  {sound.description}
                </span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Footer: Lautstärke-Einstellung */}
      {showVolumeControls && <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-2 shrink-0">
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
      </div>}
    </div>
  );
};
