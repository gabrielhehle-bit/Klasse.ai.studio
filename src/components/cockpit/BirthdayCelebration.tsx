import React, { useMemo, useState } from 'react';
import type { Student } from '../../types';
import { getDisplayStudentName } from './studentSelectionUtils';

interface Props {
  students: Student[];
  onClose: () => void;
  isBirthdayToday: (student: Student) => boolean;
}

/**
 * Bewusst und ausschließlich lokal aktivierter Feiermodus für den
 * duplizierten Klassenbildschirm. Kein automatischer Start, kein Zugriff auf
 * Schülerdossier, Geburtsjahr oder vollständiges Geburtsdatum.
 */
export function BirthdayCelebration({ students, onClose, isBirthdayToday }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('Wir wünschen dir einen wunderschönen Tag!');
  const selected = students.find(student => student.id === selectedId) ?? null;
  const orderedStudents = useMemo(
    () => [...students].sort((a, b) => Number(isBirthdayToday(b)) - Number(isBirthdayToday(a))),
    [students, isBirthdayToday],
  );

  const closeButton = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';

  return (
    <div role="dialog" aria-modal="true" aria-label="Geburtstag feiern"
      className="fixed inset-0 z-[3000] flex items-center justify-center overflow-auto bg-slate-900/70 p-4"
      onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
      {!selected ? (
        <section className="flex max-h-[calc(100vh-2rem)] w-full max-w-lg flex-col gap-3 overflow-auto rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Geburtstag feiern 🎂</h2>
            <button type="button" className={closeButton} onClick={onClose}>Schließen</button>
          </div>
          <p className="text-sm text-slate-600">Wähle bewusst ein Kind aus. Die Feieransicht startet erst nach deiner Auswahl.</p>
          {orderedStudents.length === 0 ? (
            <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm">In dieser Klasse sind noch keine Kinder angelegt.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {orderedStudents.map(student => (
                <button type="button" key={student.id} onClick={() => setSelectedId(student.id)}
                  className="min-h-12 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-base font-semibold text-slate-900 hover:bg-amber-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                  {getDisplayStudentName(student, students)}
                  {isBirthdayToday(student) && <span className="ml-2 text-xs text-amber-700">🎉 Heute</span>}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="flex min-h-[70vh] w-full max-w-5xl flex-col items-center justify-center gap-5 rounded-3xl border-4 border-amber-200 bg-amber-50 p-6 text-center text-slate-900 shadow-xl">
          <div className="flex w-full justify-end">
            <button type="button" className={closeButton} onClick={onClose}>Feier beenden ✕</button>
          </div>
          <div aria-hidden="true" className="text-5xl sm:text-7xl">🎉 🎂 🎉</div>
          <h2 className="text-4xl font-black leading-tight sm:text-7xl">Alles Gute zum Geburtstag!</h2>
          <p className="break-words text-4xl font-extrabold text-amber-800 sm:text-6xl">{getDisplayStudentName(selected, students)}</p>
          <label className="w-full max-w-2xl text-left text-sm font-semibold text-slate-700">
            Persönlicher Gruß
            <textarea rows={2} value={message} onChange={event => setMessage(event.target.value.slice(0, 180))}
              maxLength={180} className="mt-1 w-full resize-none rounded-xl border border-amber-200 bg-white p-3 text-center text-lg font-medium text-slate-900 sm:text-2xl" />
          </label>
          <button type="button" className={closeButton} onClick={() => setSelectedId(null)}>Anderes Kind auswählen</button>
        </section>
      )}
    </div>
  );
}
