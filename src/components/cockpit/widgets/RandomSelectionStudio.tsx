import React, { useMemo, useRef, useState } from 'react';
import { AppState, CockpitWidgetConfig } from '../../../types';
import { getRandomSelectionSettings, normalizeRandomSelectionMode, updateRandomSelectionSettings,
  RandomSelectionMode } from '../../../lib/randomSelectionSettings';
import { RandomNameWidget } from './RandomNameWidget';
import { WheelWidget } from './WheelWidget';
import { FairCallWidget } from './FairCallWidget';

interface Props {
  widget: CockpitWidgetConfig;
  app: AppState;
  currentIsLight: boolean;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}
const modes: { id: RandomSelectionMode; label: string }[] = [
  { id: 'names', label: 'Namen ziehen' },
  { id: 'wheel', label: 'Glücksrad' },
  { id: 'fair', label: 'Faire Runde' },
];

export const RandomSelectionStudio: React.FC<Props> = ({ widget, app, currentIsLight, onUpdate,
  showSettings, onCloseSettings }) => {
  const settings = widget.settings || {};
  const mode = normalizeRandomSelectionMode(settings.randomSelectionMode);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [visited, setVisited] = useState<RandomSelectionMode[]>([mode]);
  const [busyByMode, setBusyByMode] = useState({ names: false, wheel: false, fair: false });
  const busy = Object.values(busyByMode).some(Boolean);
  const busyHandlers = useMemo(() => Object.fromEntries(modes.map(tool => [tool.id, (value: boolean) =>
    setBusyByMode(previous => previous[tool.id] === value ? previous : { ...previous, [tool.id]: value })
  ])) as Record<RandomSelectionMode, (value: boolean) => void>, []);
  const persist = (next: Record<string, any>) => {
    settingsRef.current = next;
    onUpdate?.({ settings: next });
  };
  const updateTool = (tool: RandomSelectionMode, updates: Partial<CockpitWidgetConfig>) => {
    if (updates.settings) persist(updateRandomSelectionSettings(settingsRef.current, tool, updates.settings));
  };
  const toolWidget = (tool: RandomSelectionMode): CockpitWidgetConfig => ({ ...widget,
    type: tool === 'names' ? 'randomname' : tool === 'fair' ? 'faircall' : 'wheel',
    settings: getRandomSelectionSettings(settings, tool),
  });
  const switchMode = (next: RandomSelectionMode) => {
    if (busy) return;
    onCloseSettings?.();
    setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
    persist({ ...settingsRef.current, randomSelectionMode: next });
  };
  const common = { app, currentIsLight };
  return (
    <div className="relative flex h-full min-h-0 w-full flex-col" data-random-selection-studio aria-busy={busy}>
      <div className="grid shrink-0 grid-cols-3 gap-1 p-1" role="group" aria-label="Zufallsauswahl auswählen">
        {modes.map(tool => <button key={tool.id} type="button" data-random-selection-mode={tool.id}
          aria-pressed={mode === tool.id} disabled={busy} title={busy ? 'Ziehung läuft' : tool.label}
          onClick={() => switchMode(tool.id)}
          className={`min-h-11 rounded-xl px-1 text-xs font-bold disabled:cursor-wait focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
            mode === tool.id ? 'bg-accent text-accent-text' : currentIsLight
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {tool.label}
        </button>)}
      </div>
      {/* Session results and temporary participant choices survive tool switches, not closing the widget. */}
      {(mode === 'names' || visited.includes('names')) && <div hidden={mode !== 'names'} className="min-h-0 flex-1" data-random-selection-panel="names">
        <RandomNameWidget {...common} widget={toolWidget('names')} onBusyChange={busyHandlers.names} />
      </div>}
      {(mode === 'wheel' || visited.includes('wheel')) && <div hidden={mode !== 'wheel'} className="min-h-0 flex-1" data-random-selection-panel="wheel">
        <WheelWidget {...common} widget={toolWidget('wheel')} onUpdate={updates => updateTool('wheel', updates)}
          onBusyChange={busyHandlers.wheel} showSettings={mode === 'wheel' && showSettings}
          onCloseSettings={onCloseSettings} />
      </div>}
      {(mode === 'fair' || visited.includes('fair')) && <div hidden={mode !== 'fair'} className="min-h-0 flex-1" data-random-selection-panel="fair">
        <FairCallWidget {...common} widget={toolWidget('fair')} onUpdate={updates => updateTool('fair', updates)}
          onBusyChange={busyHandlers.fair} />
      </div>}
      {mode === 'fair' && showSettings && <section role="dialog" aria-label="Faire-Runde-Einstellungen"
        className={`absolute inset-2 z-50 flex flex-col gap-4 overflow-y-auto rounded-2xl border p-4 shadow-xl ${currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-white'}`}>
        <h3 className="font-bold">Faire Runde</h3>
        <p className="text-sm">Anwesende Kinder werden einmal pro Runde aufgerufen. Einzelne Kinder kannst du in der Runden-Übersicht pausieren.</p>
        <button type="button" aria-pressed={getRandomSelectionSettings(settings, 'fair').soundEnabled !== false}
          className="min-h-11 rounded-xl border px-3 font-bold" onClick={() => updateTool('fair', {
            settings: { soundEnabled: getRandomSelectionSettings(settingsRef.current, 'fair').soundEnabled === false },
          })}>Signalton {getRandomSelectionSettings(settings, 'fair').soundEnabled !== false ? 'an' : 'aus'}</button>
        <button type="button" className="min-h-11 rounded-xl bg-accent px-3 font-bold text-accent-text"
          aria-label="Faire-Runde-Einstellungen schließen" onClick={onCloseSettings}>Fertig</button>
      </section>}
    </div>
  );
};
