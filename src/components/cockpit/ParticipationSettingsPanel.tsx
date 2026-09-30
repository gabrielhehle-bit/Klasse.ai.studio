import React from 'react';
import type { AppState } from '../../types';
import type { ParticipationSettings } from '../../lib/participationAward';
export default function ParticipationSettingsPanel({ app, setApp }: { app: AppState; setApp: React.Dispatch<React.SetStateAction<AppState>> }) {
  const settings = app.participationSettings || { subjectMode: 'current', feedback: 'animation' };
  const update = (change: Partial<ParticipationSettings>) => setApp(previous => ({ ...previous, participationSettings: { subjectMode: 'current', feedback: 'animation', ...previous.participationSettings, ...change } }));
  return <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
    <legend className="px-1 text-sm font-bold">+1 Mitarbeit · für diese Klasse</legend>
    <label className="block text-sm font-semibold">Fachzuordnung<select aria-label="Fachzuordnung für Mitarbeit" value={settings.subjectMode} onChange={event => update({ subjectMode: event.target.value as ParticipationSettings['subjectMode'] })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"><option value="current">Aktuelles Unterrichtsfach verwenden</option><option value="choose">Bei jedem +1 ein Fach auswählen</option></select></label>
    <label className="block text-sm font-semibold">Reaktion auf +1<select aria-label="Reaktion auf +1" value={settings.feedback} onChange={event => update({ feedback: event.target.value as ParticipationSettings['feedback'] })} className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3"><option value="none">Keine Animation</option><option value="animation">Pluspunkt-Animation</option><option value="mascot">Klassenmaskottchen freut sich</option><option value="both">Maskottchen und Pluspunkt-Animation</option></select></label>
    <p className="text-xs text-slate-600">Das Maskottchen muss auf der Unterrichtsfläche sichtbar sein. Sein Ruhemodus bleibt wirksam.</p>
  </fieldset>;
}
