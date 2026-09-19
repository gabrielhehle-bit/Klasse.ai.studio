import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
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

  useEffect(() => {
    if (!selectedId || typeof window === 'undefined') return;
    void confetti({ particleCount: 100, spread: 82, startVelocity: 33, origin: { y: 0.58 }, zIndex: 3500 });
  }, [selectedId]);
  const orderedStudents = useMemo(
    () => [...students].sort((a, b) => Number(isBirthdayToday(b)) - Number(isBirthdayToday(a))),
    [students, isBirthdayToday],
  );

  const closeButton = 'min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';

  return (
    <div role="dialog" aria-modal="true" aria-label="Geburtstag feiern"
      className="fixed inset-0 z-[3000] flex items-center justify-center overflow-auto bg-slate-950/80 p-3 backdrop-blur-sm sm:p-6"
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
        <section className="relative flex min-h-[85vh] w-full max-w-6xl flex-col items-center justify-center gap-6 overflow-hidden rounded-[2.5rem] border-4 border-white/80 bg-gradient-to-br from-rose-100 via-amber-50 to-violet-200 p-5 text-center text-slate-900 shadow-2xl sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -left-10 top-12 text-7xl opacity-80 sm:text-9xl">🎈</div>
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 bottom-12 text-7xl opacity-80 sm:text-9xl">🎈</div>
          <div className="relative z-10 flex w-full justify-end">
            <button type="button" className={closeButton} onClick={onClose}>Feier beenden ✕</button>
          </div>
          <div aria-hidden="true" className="relative z-10 text-6xl drop-shadow-lg sm:text-8xl">🎉 🎂 🎉</div>
          <h2 aria-live="polite" className="relative z-10 max-w-4xl text-4xl font-black leading-tight tracking-tight text-rose-700 drop-shadow-sm sm:text-7xl">Alles Gute zum Geburtstag!</h2>
          <p className="relative z-10 max-w-full break-words rounded-3xl border border-white/70 bg-white/75 px-6 py-4 text-4xl font-extrabold text-violet-800 shadow-lg sm:text-6xl">{getDisplayStudentName(selected, students)}</p>
          <label className="relative z-10 w-full max-w-2xl text-left text-sm font-semibold text-slate-700">
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