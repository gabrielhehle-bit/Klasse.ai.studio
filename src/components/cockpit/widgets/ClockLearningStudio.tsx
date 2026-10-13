import React, { useRef } from 'react';
import { CockpitWidgetConfig } from '../../../types';
import { ClockpuzzleWidgetContent, WordclockWidgetContent } from '../CockpitWidgetContents';
import { ClocksyncWidgetContent } from '../LearningPracticeWidgets';
import { ClockLearningTool, mergeClockLearningSettings, normalizeClockLearningTool } from '../../../lib/clockLearningSettings';

const tools: { id: ClockLearningTool; label: string; description: string }[] = [
  { id: 'trainer', label: 'Ablesen & Einstellen', description: 'Volle, halbe und Viertelstunden mit Rückmeldung üben.' },
  { id: 'spoken', label: 'Zeitaufträge', description: 'Gesprochene Uhrzeiten auf dem Zifferblatt einstellen, auch in Fünf-Minuten-Schritten.' },
  { id: 'words', label: 'Wort-Uhr', description: 'Uhrzeiten als Ziffern und in Worten zeigen; Echtzeit oder eine eigene Übungszeit.' },
];

export const ClockLearningStudio: React.FC<{
  widget: CockpitWidgetConfig; currentIsLight: boolean;
  onUpdate?: (updates: Partial<CockpitWidgetConfig>) => void;
  showSettings?: boolean; onCloseSettings?: () => void;
}> = ({ widget, currentIsLight, onUpdate, showSettings = false, onCloseSettings }) => {
  const settings = widget.settings || {};
  const tool = normalizeClockLearningTool(settings.clockLearningTool);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const update = (updates: Partial<CockpitWidgetConfig>) => {
    if (!updates.settings) return;
    const next = mergeClockLearningSettings(settingsRef.current, updates.settings);
    settingsRef.current = next;
    onUpdate?.({ settings: next });
  };
  const choose = (next: ClockLearningTool) => {
    onCloseSettings?.();
    update({ settings: { clockLearningTool: next } });
  };
  const childWidget = { ...widget, settings };
  const common = { widget: childWidget, currentIsLight, onUpdate: update };
  return <div data-clock-learning-studio data-clock-learning-tool={tool}
    className={`relative flex h-full min-h-0 w-full flex-col pb-12 ${currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'}`}>
    <nav aria-label="Uhrübung auswählen" className="grid shrink-0 grid-cols-3 gap-1 p-1">
      {tools.map(item => <button key={item.id} type="button" data-clock-learning-mode={item.id}
        title={item.description} aria-pressed={tool === item.id} onClick={() => choose(item.id)}
        className={`min-h-11 rounded-xl px-1 text-xs font-bold ${tool === item.id ? 'bg-accent text-accent-text' : currentIsLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-100'}`}>
        {item.label}
      </button>)}
    </nav>
    {showSettings && tool !== 'words' && <section role="dialog" aria-label="Uhrlernen einstellen"
      className={`absolute inset-0 z-30 flex flex-col gap-3 overflow-auto p-3 ${currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'}`}>
      <div className="flex items-center justify-between gap-2"><h3 className="font-bold">Uhrübung wählen</h3>
        <button type="button" onClick={onCloseSettings} className="min-h-11 rounded-xl border px-3">Fertig</button></div>
      {tools.map(item => <button key={item.id} type="button" onClick={() => choose(item.id)}
        className="min-h-11 rounded-xl border p-3 text-left"><strong>{item.label}</strong><p className="mt-1 text-sm">{item.description}</p></button>)}
      <p className="text-sm">Die Schwierigkeitsstufen stehen direkt in „Ablesen & Einstellen“. Eigene Uhrzeiten stellst du über das Zahnrad der Wort-Uhr ein.</p>
    </section>}
    <div className="min-h-0 flex-1" data-clock-learning-panel={tool}>
      {tool === 'trainer' && <ClockpuzzleWidgetContent {...common} />}
      {tool === 'spoken' && <ClocksyncWidgetContent {...common} />}
      {tool === 'words' && <WordclockWidgetContent {...common} showSettings={showSettings} onCloseSettings={onCloseSettings} />}
    </div>
  </div>;
};
