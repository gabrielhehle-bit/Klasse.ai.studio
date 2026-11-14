import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { STANDARD_KEL_BEREICHE, type KELGespraech, type Student } from '../types';
import { addKelQuickGoal, editKelQuickGoal, removeKelQuickGoal, setKelQuickTeacherComment } from '../lib/kelQuickEdit';

type Props = {
  meeting: Partial<KELGespraech>;
  students: Student[];
  setMeeting: React.Dispatch<React.SetStateAction<Partial<KELGespraech> | null>>;
};

/**
 * A single focused entry view for the live conversation. Every control writes
 * only to the parent editor draft; saving remains the existing explicit action.
 */
export default function KELQuickEntry({ meeting, students, setMeeting }: Props) {
  const [selectedAreaId, setSelectedAreaId] = useState('lesen');
  const sortedStudents = [...students].sort((a, b) =>
    a.nachname.localeCompare(b.nachname, 'de-AT') || a.vorname.localeCompare(b.vorname, 'de-AT'));
  const selectedArea = STANDARD_KEL_BEREICHE.find(area => area.id === selectedAreaId) || STANDARD_KEL_BEREICHE[0];
  const teacherComments = STANDARD_KEL_BEREICHE.filter(area =>
    meeting.einschaetzungLehrperson?.[area.id]?.kommentar?.trim());
  const selectedComment = meeting.einschaetzungLehrperson?.[selectedArea.id]?.kommentar || '';

  return (
    <div data-kel-quick-entry className="mx-auto max-w-4xl space-y-5 pb-3">
      <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 sm:p-5">
        <h3 className="text-base font-extrabold text-teal-950">Gespräch schnell erfassen</h3>
        <p className="mt-1 text-xs leading-relaxed text-teal-900">
          Rückmeldung, Ziele und Vereinbarungen direkt mitschreiben. Alle Felder gehören zum bestehenden
          KEL-Protokoll. Gespeichert wird erst mit „Änderungen speichern“ nach der Abschlusskontrolle.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label htmlFor="kel-quick-student" className="text-xs font-semibold text-slate-700">
          Kind
          <select id="kel-quick-student" value={meeting.schuelerId || ''}
            onChange={event => setMeeting(previous => previous
              ? { ...previous, schuelerId: event.target.value } : previous)}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900">
            <option value="">Kind auswählen …</option>
            {sortedStudents.map(student => (
              <option key={student.id} value={student.id}>{student.nachname} {student.vorname}</option>
            ))}
          </select>
        </label>
        <label htmlFor="kel-quick-date" className="text-xs font-semibold text-slate-700">
          Gesprächsdatum
          <input id="kel-quick-date" type="date" value={meeting.datum || ''}
            onChange={event => setMeeting(previous => previous
              ? { ...previous, datum: event.target.value } : previous)}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900" />
        </label>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h4 className="text-sm font-extrabold text-slate-900">Persönliche Rückmeldung</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Wähle einen Lern- oder Entwicklungsbereich. Bereits eingegebene Bewertungen
            und die Kommentare der anderen Bereiche bleiben erhalten.
          </p>
        </div>
        <label htmlFor="kel-quick-feedback-area" className="block text-xs font-semibold text-slate-700">
          Bereich
          <select id="kel-quick-feedback-area" value={selectedArea.id}
            onChange={event => setSelectedAreaId(event.target.value)}
            className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900">
            {STANDARD_KEL_BEREICHE.map(area => (
              <option key={area.id} value={area.id}>{area.label}</option>
            ))}
          </select>
        </label>
        <label htmlFor="kel-quick-feedback-text" className="mt-3 block text-xs font-semibold text-slate-700">
          Rückmeldung zu {selectedArea.label}
          <textarea id="kel-quick-feedback-text" data-kel-quick-teacher-comment
            value={selectedComment} rows={3}
            onChange={event => setMeeting(previous => previous
              ? setKelQuickTeacherComment(previous, selectedArea.id, event.target.value) : previous)}
            placeholder="Was gelingt schon? Was braucht noch Begleitung?"
            className="mt-1 block min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-800" />
        </label>
        {teacherComments.length > 0 && (
          <div data-kel-quick-existing-comments className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-[11px] font-semibold text-slate-500">Bereits notierte Rückmeldungen</p>
            <div className="flex flex-wrap gap-1.5">
              {teacherComments.map(area => (
                <button key={area.id} type="button" onClick={() => setSelectedAreaId(area.id)}
                  aria-pressed={selectedArea.id === area.id}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedArea.id === area.id
                    ? 'border-teal-600 bg-teal-50 text-teal-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {area.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Ziele des Kindes</h4>
            <p className="mt-1 text-xs text-slate-500">Ziel, Erkennungszeichen und Zeitpunkt können ergänzt werden.</p>
          </div>
          <button type="button" data-kel-quick-add-goal
            onClick={() => setMeeting(previous => previous
              ? addKelQuickGoal(previous, crypto.randomUUID()) : previous)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-teal-700 px-3 text-xs font-bold text-white hover:bg-teal-800">
            <Plus size={15} /> Ziel hinzufügen
          </button>
        </div>
        {!meeting.zieleKind?.length && (
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Noch keine Ziele erfasst.</p>
        )}
        <div data-kel-quick-goals className="space-y-3">
          {(meeting.zieleKind || []).map((goal, index) => (
            <div key={goal.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Ziel {index + 1}</span>
                <button type="button" aria-label={`Ziel ${index + 1} entfernen`}
                  onClick={() => setMeeting(previous => previous
                    ? removeKelQuickGoal(previous, goal.id) : previous)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-rose-700 hover:bg-rose-50">
                  <Trash2 size={14} /> Entfernen
                </button>
              </div>
              <label className="block text-xs font-semibold text-slate-700">
                Was möchte ich können?
                <input type="text" value={goal.ziel}
                  onChange={event => setMeeting(previous => previous
                    ? editKelQuickGoal(previous, goal.id, 'ziel', event.target.value) : previous)}
                  placeholder="Konkretes Ziel"
                  className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-900" />
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-700">
                  Woran merken wir es?
                  <input type="text" value={goal.woranErkennbar}
                    onChange={event => setMeeting(previous => previous
                      ? editKelQuickGoal(previous, goal.id, 'woranErkennbar', event.target.value) : previous)}
                    placeholder="Woran erkennbar"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-900" />
                </label>
                <label className="text-xs font-semibold text-slate-700">
                  Bis wann?
                  <input type="text" value={goal.bisWann}
                    onChange={event => setMeeting(previous => previous
                      ? editKelQuickGoal(previous, goal.id, 'bisWann', event.target.value) : previous)}
                    placeholder="Vereinbarter Zeitpunkt"
                    className="mt-1 block w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-normal text-slate-900" />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label htmlFor="kel-quick-parent-impression"
          className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-extrabold text-slate-900 sm:p-5">
          Eindruck der Eltern
          <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
            Gesprächsnotiz – wird nicht automatisch ins Elternblatt übernommen.
          </span>
          <textarea id="kel-quick-parent-impression" data-kel-quick-parent-impression
            value={meeting.elternEindruck || ''} rows={4}
            onChange={event => setMeeting(previous => previous
              ? { ...previous, elternEindruck: event.target.value } : previous)}
            placeholder="Wie erleben die Eltern die Entwicklung?"
            className="mt-3 block min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal leading-relaxed text-slate-800" />
        </label>
        <label htmlFor="kel-quick-agreements"
          className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-extrabold text-slate-900 sm:p-5">
          Gemeinsame Vereinbarungen
          <span className="mt-1 block text-xs font-normal leading-relaxed text-slate-500">
            Nur durch bewusste Auswahl später ins Elternblatt übernehmen.
          </span>
          <textarea id="kel-quick-agreements" data-kel-quick-agreements
            value={meeting.vereinbarungen || ''} rows={4}
            onChange={event => setMeeting(previous => previous
              ? { ...previous, vereinbarungen: event.target.value } : previous)}
            placeholder="Wer übernimmt welche Schritte?"
            className="mt-3 block min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-normal leading-relaxed text-slate-800" />
        </label>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        Weitere Selbsteinschätzungen und Bewertungen kannst du in den ausführlichen Reitern bearbeiten.
        Dort bleiben alle bisherigen Funktionen und Einträge erhalten.
      </p>
    </div>
  );
}
