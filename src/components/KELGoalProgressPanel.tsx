import React, { useState } from 'react';
import { CalendarDays, ClipboardList, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { KELGespraech, KELGoalProgressEntry, KELGoalProgressStatus } from '../types';
import {
  appendKelGoalProgress, getKelGoalLatestProgress, getKelGoalProgress,
  KEL_PROGRESS_LABELS, validKelProgressDate,
} from '../lib/kelGoalProgress';
import { getLocalKelDate } from '../lib/kelQuickEdit';
import { normalizeKelMeetings } from '../lib/kelData';

/**
 * The follow-up is explicitly teacher-entered and remains in the original
 * saved KEL goal, independent from gradebook scores and other child records.
 */
export default function KELGoalProgressPanel({ meeting }: { meeting: KELGespraech }) {
  const { app, setApp } = useApp();
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [date, setDate] = useState(() => getLocalKelDate(new Date()));
  const [status, setStatus] = useState<KELGoalProgressStatus>('in_arbeit');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const stored = normalizeKelMeetings(app.kelGespraeche).find(
    item => item.id === meeting.id && item.schuelerId === meeting.schuelerId,
  );
  const activePupil = app.schueler.some(child => child.id === meeting.schuelerId);
  const goals = (stored?.zieleKind || meeting.zieleKind || [])
    .filter(goal => typeof goal?.ziel === 'string' && !!goal.ziel.trim());
  const now = getLocalKelDate(new Date());
  const canSubmit = !!stored && activePupil && !!editingGoalId && !!note.trim() &&
    validKelProgressDate(date) && date >= stored.datum && date <= now;

  const addEntry = () => {
    if (!stored || !canSubmit || !editingGoalId) {
      setError('Bitte Datum, Ziel und Beobachtung prüfen.');
      return;
    }
    const entry: KELGoalProgressEntry = {
      id: crypto.randomUUID(), datum: date, status, notiz: note.trim(),
    };
    // Reject stale or different-child records before clearing the local draft.
    if (appendKelGoalProgress(app.kelGespraeche, stored.id, stored.schuelerId,
      editingGoalId, entry, now) === app.kelGespraeche) {
      setError('Das Ziel konnte nicht zugeordnet werden. Bitte das Protokoll erneut öffnen.');
      return;
    }
    setApp(previous => {
      const updated = appendKelGoalProgress(previous.kelGespraeche, stored.id,
        stored.schuelerId, editingGoalId, entry, now);
      return updated === previous.kelGespraeche ? previous : { ...previous, kelGespraeche: updated };
    });
    setEditingGoalId(null);
    setNote('');
    setStatus('in_arbeit');
    setError('');
  };

  return (
    <section data-kel-goal-progress-panel className="no-print overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-7">
        <div>
          <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <ClipboardList size={19} className="text-teal-700" /> Zielverlauf nach dem Gespräch
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Festgehaltene Ziele und datierte Fortschritte aus diesem Protokoll.
            Ein Status wird ausschließlich durch eine manuelle Beobachtung gesetzt.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">Interne Dokumentation, nicht automatisch im Elternblatt</p>
      </div>
      {goals.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">In diesem Gespräch wurden keine ausformulierten Ziele gespeichert.</p>
      ) : (
        <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
          {goals.map((goal, index) => {
            const latest = getKelGoalLatestProgress(goal);
            const history = getKelGoalProgress(goal);
            const isEditing = editingGoalId === goal.id;
            return (
              <article data-kel-goal-progress-row key={goal.id} className="min-w-0 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Ziel {index + 1}</p>
                  <span data-kel-goal-progress-status className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {latest ? KEL_PROGRESS_LABELS[latest.status] : 'Noch nicht dokumentiert'}
                  </span>
                </div>
                <h3 className="mt-2 whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-slate-900">{goal.ziel}</h3>
                {(goal.woranErkennbar || goal.bisWann) && (
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
                    {goal.woranErkennbar ? `Woran erkennbar: ${goal.woranErkennbar}` : ''}
                    {goal.woranErkennbar && goal.bisWann ? ' · ' : ''}
                    {goal.bisWann ? `Bis: ${goal.bisWann}` : ''}
                  </p>
                )}

                {history.length ? (
                  <ol data-kel-goal-progress-history className="mt-3 max-h-56 space-y-3 overflow-y-auto border-t border-slate-100 pt-3">
                    {history.map(entry => (
                      <li key={entry.id} className="border-l-2 border-teal-200 pl-3">
                        <p className="flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                          <span>{entry.datum.split('-').reverse().join('.')}</span>
                          <span>{KEL_PROGRESS_LABELS[entry.status]}</span>
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{entry.notiz}</p>
                      </li>
                    ))}
                  </ol>
                ) : <p className="mt-3 text-xs text-slate-500">Noch keine Fortschritte festgehalten.</p>}

                {activePupil && stored && (
                  <div className="mt-3">
                    {!isEditing ? (
                      <button type="button" data-kel-goal-progress-add
                        onClick={() => {
                          setEditingGoalId(goal.id);
                          setNote('');
                          setStatus('in_arbeit');
                          setDate(getLocalKelDate(new Date()));
                          setError('');
                        }}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100">
                        <Plus size={14} /> Fortschritt dokumentieren
                      </button>
                    ) : (
                      <div data-kel-goal-progress-editor className="space-y-3 rounded-xl bg-slate-50 p-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-xs font-semibold text-slate-700">
                            Beobachtungsdatum
                            <input type="date" value={date} min={stored.datum} max={now}
                              onChange={e => setDate(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900" />
                          </label>
                          <label className="text-xs font-semibold text-slate-700">
                            Dokumentierter Stand
                            <select value={status} onChange={e => setStatus(e.target.value as KELGoalProgressStatus)}
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900">
                              {Object.entries(KEL_PROGRESS_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label className="block text-xs font-semibold text-slate-700">
                          Was wurde konkret beobachtet?
                          <textarea value={note} onChange={e => setNote(e.target.value)} rows={3}
                            placeholder="Konkrete Beobachtung – keine automatische Bewertung"
                            className="mt-1 w-full resize-y rounded-lg border border-slate-200 bg-white p-3 text-sm font-normal leading-relaxed text-slate-900" />
                        </label>
                        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
                        <div className="flex flex-wrap gap-2">
                          <button type="button" data-kel-goal-progress-save disabled={!canSubmit}
                            onClick={addEntry}
                            className="min-h-10 rounded-lg bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40">
                            Eintrag speichern
                          </button>
                          <button type="button" onClick={() => { setEditingGoalId(null); setNote(''); setError(''); }}
                            className="min-h-10 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!activePupil && (
        <p className="px-5 pb-4 text-xs text-slate-600">
          Das Kind gehört nicht zur aktiven Klasse. Die dokumentierten Fortschritte bleiben lesbar, können hier aber nicht ergänzt werden.
        </p>
      )}
      <p className="flex items-center gap-1.5 px-5 pb-4 text-[11px] leading-relaxed text-slate-500">
        <CalendarDays size={13} className="shrink-0" />
        Ein fehlender Eintrag ist kein Hinweis auf Stillstand oder Nichterreichen des Ziels.
      </p>
    </section>
  );
}
