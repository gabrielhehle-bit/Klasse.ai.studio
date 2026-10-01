import React, { useId } from 'react';
import type { AppState } from '../../types';
import type { ParticipationSettings } from '../../lib/participationAward';

export default function ParticipationSettingsPanel({ app, setApp }: { app: AppState; setApp: React.Dispatch<React.SetStateAction<AppState>> }) {
  const groupId = useId();
  const settings = { subjectMode: 'current', feedback: 'animation', ...app.participationSettings } as ParticipationSettings;
  const update = (change: Partial<ParticipationSettings>) => setApp(previous => ({ ...previous, participationSettings: { subjectMode: 'current', feedback: 'animation', ...previous.participationSettings, ...change } }));
  return <div className="space-y-5 text-slate-900">
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-bold">Welchem Fach gehört der Punkt?</legend>
      {([
        ['current', 'Automatisch laut Stundenplan', '+1 wird sofort in der Notenmappe als Mitarbeit im aktuellen Fach gespeichert.'],
        ['choose', 'Fach bei jedem +1 auswählen', '+1 öffnet die Fächer in der Seitenleiste. Erst dein Klick auf ein Fach vergibt den Punkt.'],
      ] as const).map(([value, title, description]) => <label key={value}
        className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 ${settings.subjectMode === value ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
        <input type="radio" name={`${groupId}-participation-subject`} value={value} checked={settings.subjectMode === value}
          onChange={() => update({ subjectMode: value })} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600" />
        <span><span className="block text-sm font-bold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">{description}</span></span>
      </label>)}
    </fieldset>
    <label className="block text-sm font-bold">Rückmeldung nach dem Punkt
      <select aria-label="Reaktion auf +1" value={settings.feedback}
        onChange={event => update({ feedback: event.target.value as ParticipationSettings['feedback'] })}
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm font-normal">
        <option value="none">Keine</option><option value="animation">Pluspunkt-Animation</option>
        <option value="mascot">Maskottchen freut sich</option><option value="both">Animation und Maskottchen</option>
      </select>
    </label>
    {(settings.feedback === 'mascot' || settings.feedback === 'both') && <p className="text-xs leading-relaxed text-slate-600">Das Maskottchen muss eingeblendet sein. Im Ruhemodus bleibt es ruhig.</p>}
    <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Sozial +1 sammelt eigene Sterne. Badges vergibst du selbst über den Namen des Kindes.</p>
    <p className="text-xs text-slate-600">Gilt für diese Klasse. Änderungen werden automatisch gespeichert.</p>
  </div>;
}
