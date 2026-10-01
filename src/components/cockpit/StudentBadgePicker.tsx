import React, { useState } from 'react';
import { UNIFIED_DEFAULT_BADGES } from '../../types';
import type { AppState } from '../../types';
import { awardStudentBadge } from '../../lib/studentBadges';

export default function StudentBadgePicker({ app, setApp, studentId, onClose }: {
  app: AppState; setApp: React.Dispatch<React.SetStateAction<AppState>>; studentId: string; onClose: () => void;
}) {
  const [category, setCategory] = useState('Alle');
  const student = app.schueler.find(pupil => pupil.id === studentId);
  if (!student || !app.activeClassId) return null;
  const badges = [...UNIFIED_DEFAULT_BADGES, ...(app.custom_badges || []).map(badge => ({ ...badge, fach: undefined }))];
  const choices = badges.filter(badge => category === 'Alle' || badge.fach === category);
  return <section role="dialog" aria-label={`Badges für ${student.vorname} vergeben`}
    className="absolute inset-0 z-[130] flex flex-col rounded-2xl bg-white text-slate-900">
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 p-3">
      <h2 className="text-base font-bold">Badges · {student.vorname}</h2>
      <button autoFocus type="button" aria-label="Badge-Auswahl schließen" onClick={onClose} className="h-11 w-11 shrink-0 rounded-lg border border-slate-200">✕</button>
    </div>
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <p className="text-xs leading-relaxed text-slate-600">Wähle ein Badge für besondere Mitarbeit oder eine Stärke. Die Vergabe verändert keine Fachpunkte.</p>
      {Boolean(student.badges?.length) && <div aria-label="Bereits vergebene Badges" className="flex flex-wrap gap-1">{student.badges?.map(badge => <span key={badge.id} title={badge.fach} className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">{badge.icon} {badge.name}</span>)}</div>}
      <div role="group" aria-label="Badge-Fach" className="flex flex-wrap gap-1">{['Alle', 'Sport', 'Mathematik', 'Deutsch', 'Sachunterricht', 'Musik'].map(fach => <button key={fach} type="button" aria-pressed={category === fach} onClick={() => setCategory(fach)} className={`min-h-9 rounded-lg border px-2 text-xs font-semibold ${category === fach ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white'}`}>{fach}</button>)}</div>
      <div className="grid grid-cols-2 gap-2">{choices.map(badge => {
        const earned = student.badges?.some(item => item.name === badge.name && item.icon === badge.icon);
        return <button key={badge.name} type="button" disabled={earned} aria-label={`${badge.name} an ${student.vorname} vergeben`}
          onClick={() => setApp(previous => awardStudentBadge(previous, { classId: app.activeClassId!, sid: student.id, name: badge.name, icon: badge.icon, fach: badge.fach }))}
          className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-2 text-center hover:border-emerald-500 hover:bg-emerald-50 disabled:border-amber-200 disabled:bg-amber-50">
          <span aria-hidden="true" className="text-2xl">{badge.icon}</span><span className="text-xs font-bold">{badge.name}</span>
          {earned && <span className="text-[10px] font-semibold text-amber-800">✓ Vergeben</span>}
        </button>;
      })}</div>
      <p className="text-xs text-slate-500">Badges bleiben im Kinderprofil gespeichert. Eigene Abzeichen kannst du dort ebenfalls anlegen.</p>
    </div>
    <button type="button" onClick={onClose} className="m-3 min-h-11 shrink-0 rounded-xl bg-emerald-600 text-sm font-bold text-white">Fertig</button>
  </section>;
}
