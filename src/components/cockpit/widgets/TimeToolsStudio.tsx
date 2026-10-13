import React, { useRef, useState } from 'react';
import { CockpitWidgetConfig } from '../../../types';
import { getTimeToolSettings, normalizeTimeToolMode, updateTimeToolSettings, TimeToolMode } from '../../../lib/timeToolsSettings';
import { TimerWidget, TimerWidgetProps } from './TimerWidget';
import { StopwatchWidget } from './StopwatchWidget';
import { ClockWidget } from './ClockWidget';

const modes: { id: TimeToolMode; label: string }[] = [
  { id: 'timer', label: 'Timer' },
  { id: 'stopwatch', label: 'Stoppuhr' },
  { id: 'clock', label: 'Uhrzeit' },
];

export const TimeToolsStudio: React.FC<TimerWidgetProps> = ({ widget, onUpdate, currentIsLight,
  showSettings, onOpenSettings, onCloseSettings }) => {
  const settings = widget.settings || {};
  const mode = normalizeTimeToolMode(settings.timeToolMode);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const [visited, setVisited] = useState<TimeToolMode[]>([mode]);
  const persist = (next: Record<string, any>) => {
    settingsRef.current = next;
    onUpdate?.({ settings: next });
  };
  const updateTool = (tool: TimeToolMode, updates: Partial<CockpitWidgetConfig>) => {
    if (updates.settings) persist(updateTimeToolSettings(settingsRef.current, tool, updates.settings));
  };
  const toolWidget = (tool: TimeToolMode): CockpitWidgetConfig => ({
    ...widget, type: tool, settings: getTimeToolSettings(settings, tool),
  });
  const switchMode = (next: TimeToolMode) => {
    onCloseSettings?.();
    setVisited(previous => previous.includes(next) ? previous : [...previous, next]);
    persist({ ...settingsRef.current, timeToolMode: next });
  };
  const common = { currentIsLight, onOpenSettings, onCloseSettings };
  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-time-tools-studio>
      <div className="grid shrink-0 grid-cols-3 gap-1 p-1" role="group" aria-label="Zeitwerkzeug auswählen">
        {modes.map(tool => (
          <button key={tool.id} type="button" data-time-tool-mode={tool.id}
            aria-pressed={mode === tool.id} onClick={() => switchMode(tool.id)}
            className={`min-h-11 rounded-xl px-1 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              mode === tool.id ? 'bg-accent text-accent-text' : currentIsLight
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {tool.label}
          </button>
        ))}
      </div>
      {/* Keep visited tools mounted: switching must not reset a live countdown or its alarm. */}
      {(mode === 'timer' || visited.includes('timer')) && (
        <div hidden={mode !== 'timer'} className="min-h-0 flex-1" data-time-tool-panel="timer">
          <TimerWidget {...common} widget={toolWidget('timer')} onUpdate={updates => updateTool('timer', updates)}
            showSettings={mode === 'timer' && showSettings} />
        </div>
      )}
      {(mode === 'stopwatch' || visited.includes('stopwatch')) && (
        <div hidden={mode !== 'stopwatch'} className="min-h-0 flex-1" data-time-tool-panel="stopwatch">
          <StopwatchWidget {...common} widget={toolWidget('stopwatch')} onUpdate={updates => updateTool('stopwatch', updates)}
            showSettings={mode === 'stopwatch' && showSettings} />
        </div>
      )}
      {(mode === 'clock' || visited.includes('clock')) && (
        <div hidden={mode !== 'clock'} className="min-h-0 flex-1" data-time-tool-panel="clock">
          <ClockWidget {...common} widget={toolWidget('clock')} onUpdate={updates => updateTool('clock', updates)}
            showSettings={mode === 'clock' && showSettings} />
        </div>
      )}
    </div>
  );
};
