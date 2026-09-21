import React, { useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, ClipboardList, MessageSquare, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getStudentAttendanceSummary, getStudentBehaviorSummary, getStudentGradeSummary, getStudentNotes } from '../lib/studentMetrics';
import { faecherFuerKlasse } from '../lib/sek1Subjects';
import { formatLocalDateKey, logObservation } from '../lib/utils';

export default function Sek1StudentDossier({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const { app, setApp, setPage } = useApp();
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<'Notiz' | 'Verhalten'>('Notiz');
  const [semester, setSemester] = useState<'1' | '2'>('1');
  const student = app.schueler.find(s => s.id === studentId);
  if (!student) return <div className="rounded-xl border border-[var(--border)] p-5"><p>Dieses Kind ist in der aktuellen Klasse nicht vorhanden.</p><button onClick={onBack} className="mt-3 underline">Zur Klassenliste</button></div>;
  const attendance = getStudentAttendanceSummary(app, studentId);
  const behavior = getStudentBehaviorSummary(app, studentId);
  const grades = getStudentGradeSummary(app, studentId, faecherFuerKlasse(app), semester);
  const notes = getStudentNotes(app, studentId);
  const gradebookNotes = faecherFuerKlasse(app).flatMap(fach =>
    (['1', '2'] as const).flatMap(sem => {
      const data = app.noten?.[studentId]?.[fach]?.[sem];
      return data?.freitext?.trim() ? [{ id: `${fach}-${sem}`, fach, sem, text: data.freitext.trim() }] : [];
    })
  );
  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    if (!note.trim()) return;
    logObservation(setApp, studentId, note.trim(), category, 'Schülerdossier Unterstufe');
    setNote('');
  };
  return (
    <article className="mx-auto w-full max-w-5xl space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface2)]"><ArrowLeft size={16}/> Zur Klassenliste</button>
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text2)]">{app.klassenbezeichnung} · Schülerdossier</p>
        <h2 className="mt-1 text-2xl font-black text-[var(--text)]">{student.vorname} {student.nachname}</h2>
        <p className="mt-1 text-sm text-[var(--text2)]">Notizen, Verhalten, Bewertungen und Anwesenheit · aktuelle Klasse</p>
      </header>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h3 className="flex items-center gap-2 font-extrabold text-[var(--text)]"><MessageSquare size={18}/> Notizen & Verhalten</h3>
        <form onSubmit={addNote} className="mt-3 space-y-3">
          <label className="block text-sm font-semibold text-[var(--text)]">Eintrag
            <select value={category} onChange={e => setCategory(e.target.value as 'Notiz' | 'Verhalten')} className="ml-3 rounded-lg border border-[var(--border)] bg-[var(--surface2)] px-2 py-1"><option value="Notiz">Notiz</option><option value="Verhalten">Verhalten</option></select>
          </label>
          <textarea value={note} onChange={e => setNote(e.target.value)} aria-label="Neue Notiz oder Verhalten" placeholder="Beobachtung oder kurze Notiz eintragen …" rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] p-3 text-[var(--text)]"/>
          <button type="submit" disabled={!note.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={16}/> Eintrag speichern</button>
        </form>
        {student.notiz?.trim() && <p className="mt-4 rounded-xl bg-[var(--surface2)] p-3 text-sm text-[var(--text)]"><strong>Stammdaten-Hinweis:</strong> {student.notiz}</p>}
        {app.behavior_notes?.[studentId] && <p className="mt-3 rounded-xl bg-[var(--surface2)] p-3 text-sm text-[var(--text)]"><strong>Verhaltensnotiz:</strong> {app.behavior_notes[studentId]}</p>}
        {behavior.hasData && <div className="mt-3 rounded-xl bg-[var(--surface2)] p-3 text-sm text-[var(--text)]">Aktueller Verhaltensstatus: <strong>{behavior.stage?.label || '–'}</strong>
          {behavior.logs.length > 0 && <ul className="mt-2 space-y-1">{behavior.logs.slice(0, 8).map((entry: any) => <li key={entry.id || `${entry.datum}-${entry.timestamp}`} className="text-[var(--text2)]">{entry.datum || formatLocalDateKey(new Date(entry.timestamp))}: {behavior.stages.find((s: any) => s.id === entry.iconId)?.label || entry.iconId}{entry.comment ? ` · ${entry.comment}` : ''}</li>)}</ul>}
        </div>}
        {gradebookNotes.length > 0 && <div className="mt-4"><p className="text-sm font-extrabold text-[var(--text)]">Notizen aus der Notenmappe</p><ul className="mt-2 space-y-2">{gradebookNotes.map(item => <li key={item.id} className="rounded-xl bg-[var(--surface2)] p-3 text-sm text-[var(--text)]"><strong>{item.fach} · {item.sem}. Semester:</strong> {item.text}</li>)}</ul></div>}
        {notes.length > 0 ? <ul className="mt-4 space-y-2" aria-label="Notizenchronik">{notes.map((entry: any, i: number) => <li key={entry.id || i} className="rounded-xl border border-[var(--border)] p-3 text-sm text-[var(--text)]"><span className="text-xs text-[var(--text2)]">{entry.kategorie || 'Notiz'} · {entry.datum || (entry.timestamp ? new Date(entry.timestamp).toLocaleDateString('de-AT') : '')}</span><p className="mt-1 whitespace-pre-wrap">{entry.inhalt || entry.text || entry.titel || ''}</p></li>)}</ul> : <p className="mt-3 text-sm text-[var(--text2)]">Noch keine Notizen vorhanden.</p>}
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-extrabold text-[var(--text)]"><BookOpen size={18}/> Notenmappe</h3><button type="button" onClick={() => setPage('noten')} className="text-sm font-semibold text-[var(--accent)] hover:underline">Notenmappe öffnen</button></div>
        <div className="mt-3 flex gap-2"><button type="button" aria-pressed={semester === '1'} onClick={() => setSemester('1')} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">1. Semester</button><button type="button" aria-pressed={semester === '2'} onClick={() => setSemester('2')} className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm">2. Semester</button></div>
        {grades.subjectGrades.length ? <ul className="mt-3 space-y-2">{grades.subjectGrades.map(g => <li key={g.subject} className="flex items-center justify-between rounded-lg bg-[var(--surface2)] p-3 text-sm text-[var(--text)]"><span>{g.subject}</span><strong>Rechnerischer Wert: {g.value.toFixed(2)}</strong></li>)}</ul> : <p className="mt-3 text-sm text-[var(--text2)]">Für dieses Semester liegen noch keine berechenbaren Bewertungen vor.</p>}
        <p className="mt-2 text-xs text-[var(--text2)]">Rechnerische Übersicht, keine automatische amtliche Zeugnisnote oder Mittelschul-Leistungsniveau-Zuordnung.</p>
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><h3 className="flex items-center gap-2 font-extrabold text-[var(--text)]"><CalendarDays size={18}/> Anwesenheit</h3><p className="mt-3 text-sm text-[var(--text)]">{attendance.hasData ? `${attendance.total} Fehlstunden · ${attendance.excused} entschuldigt · ${attendance.unexcused} unentschuldigt` : 'Noch keine Anwesenheitsdaten vorhanden.'}</p><button type="button" onClick={() => setPage('anwesenheit')} className="mt-2 text-sm font-semibold text-[var(--accent)] hover:underline">Anwesenheit öffnen</button></section>
    </article>
  );
}
