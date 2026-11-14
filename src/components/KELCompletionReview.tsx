import React from 'react';
import { CheckCircle2, Info, Pencil, AlertCircle } from 'lucide-react';
import type { KELGespraech } from '../types';
import { getKelCompletionReview } from '../lib/kelCompletionReview';

type EditorTab = 'schnell' | 'vorbereitung' | 'kind' | 'lehrperson' | 'ziele';
type Props = {
  meeting: Partial<KELGespraech>;
  studentName: string;
  onEdit: (tab: EditorTab) => void;
};

/** Pure draft preview: final persistence occurs only at the editor's save button. */
export default function KELCompletionReview({ meeting, studentName, onEdit }: Props) {
  const review = getKelCompletionReview(meeting);

  return (
    <section data-kel-completion-review className="no-print mx-auto max-w-4xl space-y-4 pb-4">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={22} />
          <div>
            <h3 className="text-lg font-extrabold text-teal-950">Abschluss vor dem Speichern prüfen</h3>
            <p className="mt-1 text-sm leading-relaxed text-teal-900">
              Das ist der aktuelle Entwurf. Prüfe die Rückmeldungen, Ziele und gemeinsamen nächsten Schritte.
              Erst „Änderungen speichern“ legt das Protokoll ab.
            </p>
          </div>
        </div>
      </div>

      <div data-kel-review-header className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
        <div>
          <p className="text-xs font-semibold text-slate-500">Kind</p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">{studentName || 'Noch kein Kind gewählt'}</p>
          <p className="mt-2 text-xs text-slate-600">Schuljahr: {review.schoolYear || 'Nicht angegeben'}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500">Gesprächsdatum</p>
          <p className="mt-1 text-sm font-extrabold text-slate-900">
            {/^\d{4}-\d{2}-\d{2}$/.test(review.date) ? review.date.split('-').reverse().join('.') : (review.date || 'Nicht angegeben')}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Teilnehmende: {review.participants.length ? review.participants.join(', ') : 'Nicht angegeben'}
          </p>
          <button type="button" onClick={() => onEdit('vorbereitung')}
            className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-bold text-teal-800 hover:underline">
            <Pencil size={13} /> Angaben bearbeiten
          </button>
        </div>
      </div>

      {review.requiredMissing.length > 0 && (
        <div data-kel-review-required className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-rose-900">
            <AlertCircle size={16} /> Vor dem Speichern erforderlich
          </p>
          <p className="mt-2 text-xs text-rose-800">{review.requiredMissing.join(' · ')}</p>
          <button type="button" onClick={() => onEdit('schnell')}
            className="mt-2 text-xs font-bold text-rose-900 underline">Kind auswählen</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div data-kel-review-goals className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">Ziele des Kindes</h4>
            <button type="button" onClick={() => onEdit('schnell')}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              <Pencil size={13} /> Bearbeiten
            </button>
          </div>
          {review.goals.length ? (
            <ol className="mt-3 space-y-3">
              {review.goals.map((goal, index) => (
                <li key={goal.id + index} className="rounded-xl bg-slate-50 p-3">
                  <p className="whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-800">
                    {index + 1}. {goal.text}
                  </p>
                  <p className="mt-1 break-words text-xs leading-relaxed text-slate-600">
                    Woran erkennbar: {goal.recognizable || 'Noch offen'}
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-600">
                    Bis wann: {goal.due || 'Noch offen'}
                  </p>
                </li>
              ))}
            </ol>
          ) : <p className="mt-3 text-sm text-slate-500">Noch keine ausformulierten Ziele.</p>}
        </div>

        <div data-kel-review-agreements className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">Vereinbarungen und nächste Schritte</h4>
            <button type="button" onClick={() => onEdit('schnell')}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              <Pencil size={13} /> Bearbeiten
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {review.agreements || 'Noch keine Vereinbarungen festgehalten.'}
          </p>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-600">Nächster Gesprächstermin</p>
            <p className="mt-1 break-words text-sm text-slate-800">
              {review.nextAppointment || 'Noch offen'}
            </p>
            <button type="button" onClick={() => onEdit('ziele')}
              className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              <Pencil size={13} /> Termin ergänzen
            </button>
          </div>
        </div>

        <div data-kel-review-feedback className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">Persönliche Rückmeldungen der Lehrperson</h4>
            <button type="button" onClick={() => onEdit('lehrperson')}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              <Pencil size={13} /> Bearbeiten
            </button>
          </div>
          {review.teacherComments.length ? (
            <div className="mt-3 space-y-3">
              {review.teacherComments.map(item => (
                <div key={item.id}>
                  <p className="text-xs font-bold text-slate-700">{item.label}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">Noch keine persönlichen Kommentare eingetragen.</p>}
        </div>

        <div data-kel-review-parent-impression className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-extrabold text-slate-900">Eindruck der Eltern</h4>
            <button type="button" onClick={() => onEdit('schnell')}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-bold text-teal-800 hover:underline">
              <Pencil size={13} /> Bearbeiten
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
            {review.parentImpression || 'Noch kein Elterneindruck dokumentiert.'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Interne Gesprächsnotiz – nicht automatisch Teil des Elternblatts.
          </p>
        </div>
      </div>

      {review.suggestions.length > 0 ? (
        <div data-kel-review-suggestions className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <Info size={16} /> Vor dem Abschluss noch prüfen
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-amber-900">
            {review.suggestions.map(item => <li key={item}>{item}</li>)}
          </ul>
          <p className="mt-2 text-xs leading-relaxed text-amber-900">
            Diese Hinweise sind keine Pflichtangaben. Das Protokoll kann auch als Zwischenstand gespeichert werden.
          </p>
        </div>
      ) : <p data-kel-review-complete className="text-xs text-teal-800">
        Alle wichtigen Gesprächsfelder sind ausgefüllt. Bitte die Inhalte vor dem Speichern nochmals lesen.
      </p>}
      <p className="text-xs leading-relaxed text-slate-500">
        Nur zur internen Abschlusskontrolle. Das separate Elternblatt übernimmt keine privaten Gesprächsnotizen automatisch.
        Die gespeicherten Bewertungen und übrigen Einträge bleiben unverändert.
      </p>
    </section>
  );
}
