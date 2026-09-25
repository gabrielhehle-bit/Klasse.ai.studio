import React from 'react';
import type { CockpitWidgetConfig } from '../../../types';
import {
  PianoWidgetContent,
  RhythmWidgetContent,
  TonetrainerWidgetContent,
  SoundmachineWidgetContent,
} from '../CockpitWidgetContents';
import { SoundsWidget } from './SoundsWidget';
import { classroomSoundEngine } from '../../../lib/soundsAlgorithm';

export type MusicStudioMode = 'signals' | 'piano' | 'rhythm' | 'tonetrainer' | 'ambient';

export const MUSIC_STUDIO_MODES: ReadonlyArray<{ id: MusicStudioMode; label: string; description: string }> = [
  { id: 'signals', label: '🔔 Signale', description: 'Klare Unterrichtssignale' },
  { id: 'piano', label: '🎹 Klavier', description: 'Töne und Tonleiter spielen' },
  { id: 'rhythm', label: '🥁 Rhythmus', description: 'Takt und Klatschmuster' },
  { id: 'tonetrainer', label: '🎼 Ton-Trainer', description: 'Melodien und Hören üben' },
  { id: 'ambient', label: '🌧️ Naturklänge', description: 'Ruhige Klänge für die Arbeitsphase' },
];

export function normalizeMusicStudioMode(input: unknown): MusicStudioMode {
  return MUSIC_STUDIO_MODES.find(mode => mode.id === input)?.id || 'signals';
}

interface MusicSoundsStudioProps {
  widget: CockpitWidgetConfig;
  currentIsLight: boolean;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

/**
 * New single entry point for the five existing music activities. Historic widgets
 * stay in the layout renderer with their original type and settings; no migration
 * of saved music/rhythm lessons is performed here.
 */
export const MusicSoundsStudio: React.FC<MusicSoundsStudioProps> = ({
  widget, currentIsLight, onUpdate, isFullscreen = false,
  showSettings = false, onCloseSettings,
}) => {
  const mode = normalizeMusicStudioMode(widget.settings?.musicStudioMode);
  const volume = Math.min(1, Math.max(0, Number(widget.settings?.volume ?? 0.7) || 0));
  const changeMode = (nextMode: MusicStudioMode) => {
    if (mode === nextMode) return;
    classroomSoundEngine.stopAll();
    onUpdate?.({ settings: { musicStudioMode: nextMode } });
  };
  const changeVolume = (value: number) => onUpdate?.({ settings: { volume: value } });

  return (
    <div className={`flex h-full min-h-0 w-full flex-col gap-2 p-2 ${currentIsLight ? 'text-slate-900' : 'text-slate-100'}`}>
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={`music-studio-mode-${widget.id}`} className="shrink-0 text-xs font-bold">Musik:</label>
        <select
          id={`music-studio-mode-${widget.id}`}
          aria-label="Musik & Klänge: Bereich auswählen"
          className={`min-h-10 min-w-0 flex-1 rounded-xl border px-2 text-sm font-bold ${currentIsLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/20 bg-zinc-800 text-white'}`}
          value={mode}
          onChange={event => changeMode(normalizeMusicStudioMode(event.target.value))}
        >
          {MUSIC_STUDIO_MODES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>

      {showSettings && (
        <section role="region" aria-label="Musik-Widget-Einstellungen"
          className={`shrink-0 rounded-xl border p-3 space-y-3 ${currentIsLight ? 'border-indigo-200 bg-indigo-50 text-slate-900' : 'border-indigo-400/40 bg-zinc-800 text-white'}`}>
          <div className="flex items-center justify-between gap-2">
            <strong className="text-sm">Musik & Klänge einstellen</strong>
            <button type="button" onClick={onCloseSettings} className="min-h-11 rounded-lg border border-current/20 px-3 text-xs font-bold">Fertig</button>
          </div>
          <label className="block text-xs font-semibold" htmlFor={`music-studio-start-${widget.id}`}>Bereich beim Öffnen</label>
          <select id={`music-studio-start-${widget.id}`} value={mode}
            onChange={event => changeMode(normalizeMusicStudioMode(event.target.value))}
            className={`min-h-10 w-full rounded-lg border px-2 text-sm ${currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-white'}`}>
            {MUSIC_STUDIO_MODES.map(item => <option key={item.id} value={item.id}>{item.label} · {item.description}</option>)}
          </select>
          <label htmlFor={`music-studio-volume-${widget.id}`} className="block text-xs font-semibold">
            Lautstärke der Unterrichtssignale: {Math.round(volume * 100)} %
          </label>
          <input id={`music-studio-volume-${widget.id}`} type="range" min="0" max="100" step="5"
            value={Math.round(volume * 100)} onChange={event => changeVolume(Number(event.target.value) / 100)}
            className="w-full accent-indigo-600" />
          <p className="text-xs opacity-80">Für Naturklänge gibt es eigene Lautstärkeregler im Klangmixer. Töne starten nur nach einem Klick.</p>
        </section>
      )}

      <div className="min-h-0 flex-1" key={mode}>
        {mode === 'signals' && <SoundsWidget widget={widget} currentIsLight={currentIsLight}
          isFullscreen={isFullscreen} onUpdate={onUpdate} showVolumeControls={false} />}
        {mode === 'piano' && <PianoWidgetContent widget={widget} currentIsLight={currentIsLight} />}
        {mode === 'rhythm' && <RhythmWidgetContent widget={widget} currentIsLight={currentIsLight} />}
        {mode === 'tonetrainer' && <TonetrainerWidgetContent widget={widget} currentIsLight={currentIsLight} />}
        {mode === 'ambient' && <SoundmachineWidgetContent widget={widget} currentIsLight={currentIsLight}
          isFullscreen={isFullscreen} onUpdate={onUpdate} />}
      </div>
    </div>
  );
};

export default MusicSoundsStudio;
