import React, { useEffect, useMemo, useState } from 'react';
import type { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import { LERNZIELE_BY_STUFE } from '../LernzielTracker';
import { getLernzielModell, lernzielHaeufigkeiten } from '../../lib/lernzielBewertungsmodell';
import LernzielVisualisierung from '../LernzielVisualisierung';

/** Informal school-specific learning-goal explanation, not the independent
 * six-point Oberau certificate matrix or an automatic grade decision. */
export default function DossierLernzielErlaeuterung({
  student, semester, onSemesterChange,
}: {
  student: Student;
  semester: '1' | '2';
  onSemesterChange: (semester: '1' | '2') => void;
}) {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const model = getLernzielModell(app.lernzielBewertungsmodell);
  const oldRecord = student.lernzielErlaeuterungen?.[semester];
  const [comment, setComment] = useState(oldRecord?.text || '');
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    setComment(student.lernzielErlaeuterungen?.[semester]?.text || '');
    setDirty(false);
  }, [app.activeClassId, student.id, semester]);

  const goals = useMemo(() => {
    const stufe = Math.min(4, Math.max(1, Number(app.stufe) || 1));
    return Object.values(LERNZIELE_BY_STUFE[stufe] || LERNZIELE_BY_STUFE[1])
      .flat().map(goal => goal.id);
  }, [app.stufe]);
  const ratings = app.studentLernzielSemesterBewertungen?.[student.id]?.[semester]
    || (semester === '1' ? app.studentLernzielBewertungen?.[student.id] : undefined);
  const summary = lernzielHaeufigkeiten(goals, ratings, model);
  const save = () => {
    const text = comment.trim();
    setApp(previous => ({
      ...previous,
      schueler: previous.schueler.map(entry => entry.id !== student.id ? entry : ({
        ...entry,
        lernzielErlaeuterungen: {
          ...(entry.lernzielErlaeuterungen || {}),
          [semester]: {
            text,
            updatedAt: new Date().toISOString(),
            modellName: model.name,
          },
        },
      })),
    }));
    setDirty(false);
    showToast('Pädagogische Erläuterung bei diesem Kind und Semester gespeichert.', 'success');
  };
  return <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
    <header>
      <h3 className="text-lg font-black text-slate-900">Erläuterung · Lernziele</h3>
      <p className="mt-1 text-xs text-slate-600">
        Schulinterne Lernziel-Rückmeldung nach dem für diese Klasse eingestellten Modell „{model.name}“.
        Kein amtliches Zeugnis. Die bestehende Oberau-Erläuterungsmatrix bleibt unter „Gespräche & Beurteilungen“ separat erhalten.
      </p>
    </header>
    <div className="flex flex-wrap gap-2 print:hidden">
      {(['1', '2'] as const).map(id => <button key={id} type="button"
        onClick={() => {
          if (dirty && !window.confirm('Ungespeicherte Änderungen verwerfen und Semester wechseln?')) return;
          onSemesterChange(id);
        }} aria-pressed={semester === id}
        className={'rounded-xl border px-3 py-2 text-xs font-bold ' +
          (semester === id ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-200 text-slate-700')}>
        {id}. Semester
      </button>)}
    </div>
    <LernzielVisualisierung goalIds={goals} ratings={ratings} model={model} mode={model.views.parents} title="Dokumentierte Lernziel-Einschätzungen" />
    <label className="block text-sm font-bold text-slate-800">Pädagogische Erläuterung der Lehrperson
      <textarea className="input-field mt-2 min-h-40 w-full resize-y p-4 font-normal"
        value={comment} onChange={event => { setComment(event.target.value); setDirty(true); }}
        placeholder="Stärken, konkrete Beobachtungen, nächste Lernschritte – frei formulieren. Keine automatische Notenentscheidung." />
    </label>
    <p className="text-xs text-slate-600">Nur tatsächlich dokumentierte Einschätzungen werden angezeigt; „{model.emptyLabel}“ ist keine negative Beurteilung. Erläuterungstext und Lernzielstatus werden nicht ungefragt an eine KI übertragen.</p>
    <div className="flex flex-wrap gap-2 print:hidden">
      <button type="button" onClick={save} disabled={!dirty} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
        {dirty ? 'Erläuterung speichern' : 'Erläuterung gespeichert'}
      </button>
      <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Ansicht drucken</button>
    </div>
    {oldRecord?.updatedAt && <p className="text-xs text-slate-500">Zuletzt gespeichert: {new Date(oldRecord.updatedAt).toLocaleDateString('de-AT')}</p>}
    {summary.other > 0 && <p className="text-xs font-semibold text-rose-700">Alte Stufen ohne Zuordnung: {summary.other}. Bitte vor der Erläuterung prüfen.</p>}
  </section>;
}
