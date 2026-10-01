import React from 'react';

export default function ParticipationSubjectPicker({ studentName, subjects, currentSubject, onSelect, onCancel }: {
  studentName: string;
  subjects: string[];
  currentSubject: string;
  onSelect: (subject: string) => void;
  onCancel: () => void;
}) {
  const choices = Array.from(new Set(subjects));
  return <section role="dialog" aria-label="Fach für Mitarbeit auswählen"
    className="max-h-full w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-xl"
    onClick={event => event.stopPropagation()}>
    <h2 className="text-base font-bold">+1 Mitarbeit · {studentName}</h2>
    <p className="mb-3 mt-1 text-xs text-slate-600">Fach antippen, um den Punkt zu vergeben.</p>
    <div className="grid grid-cols-2 gap-2">{choices.map((subject, index) => <button key={subject} type="button"
      autoFocus={choices.includes(currentSubject) ? subject === currentSubject : index === 0}
      className={`min-h-11 break-words rounded-lg border px-2 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${subject === currentSubject ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 hover:bg-emerald-50'}`}
      onClick={() => onSelect(subject)}>{subject}</button>)}</div>
    {!choices.length && <p className="text-sm">Bitte zuerst Fächer für die Klasse anlegen.</p>}
    <button autoFocus={!choices.length} type="button" className="mt-3 min-h-11 w-full rounded-lg border border-slate-300 text-sm font-semibold"
      onClick={onCancel}>Abbrechen</button>
  </section>;
}
