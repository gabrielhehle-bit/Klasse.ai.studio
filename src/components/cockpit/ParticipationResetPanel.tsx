import React, { useState } from 'react';
import type { AppState } from '../../types';
import { correctParticipationStars, getParticipationResetCount, resetParticipationStars, type ParticipationResetRequest } from '../../lib/participationAward';
import { getDisplayStudentName } from './studentSelectionUtils';

export default function ParticipationResetPanel({ app, setApp, onReset }: {
  app: AppState; setApp: React.Dispatch<React.SetStateAction<AppState>>; onReset: () => void;
}) {
  const [kind, setKind] = useState<'subject' | 'social'>('subject');
  const [student, setStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [confirmed, setConfirmed] = useState<ParticipationResetRequest | null>(null);
  const request: ParticipationResetRequest = { classId: app.activeClassId!, sid: student === 'all' ? undefined : student, kind, scope: kind === 'social' ? 'all' : 'today' };
  const count = student ? getParticipationResetCount(app, request) : 0;
  const correction = { ...request, sid: student, subject: kind === 'subject' ? subject : undefined };
  const correctionCount = student && student !== 'all' && (kind === 'social' || subject) ? getParticipationResetCount(app, correction) : 0;
  const name = student === 'all' ? 'die ganze Klasse' : getDisplayStudentName(app.schueler.find(pupil => pupil.id === student) || { id: '', vorname: 'Kind' }, app.schueler);
  return <section aria-label="Sterne zurücksetzen" className="mt-4 space-y-2 border-t border-slate-200 pt-3">
    <h3 className="text-sm font-bold">Sterne korrigieren</h3>
    <p className="text-xs text-slate-600">Einzelne Fehlklicks korrigieren oder den Zähler zurücksetzen. Fachpunkte werden auch in der Notenmappe korrigiert.</p>
    <label className="block text-xs font-semibold">Welche Sterne?
      <select aria-label="Art der Sterne zurücksetzen" value={kind} onChange={event => { setKind(event.target.value as 'subject' | 'social'); setConfirmed(null); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
        <option value="subject">Fach-Mitarbeit · heute</option><option value="social">Sozialsterne · insgesamt</option>
      </select>
    </label>
    {student && student !== 'all' && <div className="space-y-2 rounded-lg bg-slate-50 p-2">
      {kind === 'subject' && <label className="block text-xs font-semibold">Welches Fach?
        <select aria-label="Fach für Punktekorrektur" value={subject} onChange={event => { setSubject(event.target.value); setConfirmed(null); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
          <option value="">Fach auswählen</option>
          {[...new Set([...(app.faecher || []), ...(app.mitarbeitLogs || []).filter(log => log.sid === student && log.kind !== 'social').map(log => log.fach).filter((fach): fach is string => !!fach)])].map(fach => <option key={fach} value={fach}>{fach}</option>)}
        </select>
      </label>}
      <p role="status" className="text-xs">{kind === 'social' ? 'Sozialsterne insgesamt' : `${subject || 'Fach'} · heute`}: <strong>{correctionCount}</strong></p>
      <div className="flex gap-2">{[1, 2, 3].map(amount => <button key={amount} type="button" aria-label={`${amount} ${kind === 'social' ? 'Sozialsterne' : subject || 'Fachpunkte'} korrigieren`} disabled={correctionCount < amount} onClick={() => { setApp(previous => correctParticipationStars(previous, { ...correction, amount })); setConfirmed(null); onReset(); }} className="min-h-11 flex-1 rounded-lg border border-rose-200 bg-white text-sm font-bold text-rose-700 disabled:opacity-40">−{amount}</button>)}</div>
    </div>}
    <label className="block text-xs font-semibold">Für wen?
      <select aria-label="Kind für Sterne zurücksetzen" value={student} onChange={event => { setStudent(event.target.value); setConfirmed(null); }} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
        <option value="">Kind auswählen</option>
        {app.schueler.map(pupil => <option key={pupil.id} value={pupil.id}>{getDisplayStudentName(pupil, app.schueler)}</option>)}
        <option value="all">Ganze Klasse</option>
      </select>
    </label>
    {confirmed ? <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-2" role="group" aria-label="Zurücksetzen bestätigen">
      <p className="text-xs text-rose-900">{count} {kind === 'social' ? 'Sozialsterne insgesamt' : 'Fachpunkte von heute'} für {name} zurücksetzen?</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => setConfirmed(null)} className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold">Abbrechen</button>
        <button type="button" disabled={count === 0} onClick={() => { setApp(previous => resetParticipationStars(previous, confirmed)); setConfirmed(null); onReset(); }} className="min-h-11 flex-1 rounded-lg bg-rose-600 text-xs font-semibold text-white disabled:opacity-40">Jetzt zurücksetzen</button>
      </div>
    </div> : <button type="button" disabled={!student || count === 0} onClick={() => setConfirmed(request)} className="min-h-11 w-full rounded-lg border border-rose-200 bg-white px-2 text-xs font-semibold text-rose-700 disabled:opacity-40">{count} Sterne zurücksetzen</button>}
  </section>;
}
