import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAssessmentMode } from '../lib/GradeUtils';
import { getSimpleAnnualGoalRatings, getSimpleSubjectAreas, getSimpleSubjectGrades } from '../lib/simplePortfolio';
import { formatLocalDateKey } from '../lib/utils';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';

type Segment = { label: string; count: number; color: string };

function CircleDiagram({
  title, center, caption, segments, total,
}: {
  title: string; center: string; caption: string; segments: Segment[]; total: number;
}) {
  const radius = 43;
  const perimeter = 2 * Math.PI * radius;
  let distance = 0;
  return (
    <div className="flex min-w-0 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <h3 className="text-base font-black text-slate-900">{title}</h3>
      <svg viewBox="0 0 120 120" className="my-3 h-40 w-40 max-w-full" role="img"
        aria-label={title + ': ' + caption + '. ' + segments.map(part => part.label + ' ' + part.count).join(', ')}>
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
        {total > 0 && segments.filter(item => item.count > 0).map(item => {
          const length = item.count / total * perimeter;
          const offset = distance;
          distance += length;
          return <circle key={item.label} cx="60" cy="60" r={radius} fill="none" stroke={item.color}
            strokeWidth="14" strokeDasharray={length + ' ' + perimeter} strokeDashoffset={-offset}
            transform="rotate(-90 60 60)" />;
        })}
        <text x="60" y="58" textAnchor="middle" fontSize="22" fontWeight="800" fill="#0f172a">{center}</text>
        <text x="60" y="74" textAnchor="middle" fontSize="8.5" fill="#475569">{title}</text>
      </svg>
      <p className="text-xs font-semibold text-slate-600">{caption}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
        {segments.map(item => <span key={item.label} className="inline-flex items-center gap-1">
          <i className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}: {item.count}
        </span>)}
      </div>
    </div>
  );
}

const GOAL_STEPS = [
  { value: null, label: 'Noch nicht eingeschätzt', icon: '', color: '#cbd5e1' },
  { value: 3, label: 'In Entwicklung', icon: '🌱', color: '#f59e0b' },
  { value: 2, label: 'Im Wesentlichen', icon: '🌿', color: '#84cc16' },
  { value: 1, label: 'Erreicht', icon: '🌸', color: '#059669' },
] as const;

export default function SimplePortfolioView() {
  const { app, setApp } = useApp();
  const classId = app.activeClassId;
  const students = useMemo(() => [...(app.schueler || [])].sort((a, b) =>
    a.nachname.localeCompare(b.nachname, 'de-AT') || a.vorname.localeCompare(b.vorname, 'de-AT')), [app.schueler]);
  const [studentId, setStudentId] = useState(() =>
    students.find(s => s.id === app.selectedStudentForPortfolio)?.id || students[0]?.id || '');
  const student = students.find(s => s.id === studentId);
  const level = Math.max(1, Math.min(4, Number(app.stufe) || 1));
  const catalog = LERNZIELE_BY_STUFE[level] || LERNZIELE_BY_STUFE[1];
  const subjects = useMemo(() => Array.from(new Set([
    ...(app.faecher || []), ...Object.keys(catalog),
    ...Object.keys(app.noten?.[studentId] || {}),
    ...(student?.manuelleLernziele || []).filter(goal => goal.stufe === level).map(goal => goal.fach),
  ])).filter(Boolean), [app.faecher, app.noten, catalog, studentId, student?.manuelleLernziele, level]);
  const [subject, setSubject] = useState(() => subjects.includes('Deutsch') ? 'Deutsch' : subjects[0] || '');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (app.selectedStudentForPortfolio && students.some(s => s.id === app.selectedStudentForPortfolio)) {
      setStudentId(app.selectedStudentForPortfolio);
      setApp(prev => ({ ...prev, selectedStudentForPortfolio: undefined }));
    }
  }, [app.selectedStudentForPortfolio, students, setApp]);
  useEffect(() => {
    if (studentId && students.some(s => s.id === studentId)) return;
    setStudentId(students[0]?.id || '');
  }, [studentId, students]);
  useEffect(() => {
    if (!subjects.includes(subject)) setSubject(subjects.includes('Deutsch') ? 'Deutsch' : subjects[0] || '');
  }, [subjects, subject]);
  useEffect(() => { setNewNote(''); }, [studentId, subject, classId]);

  const areas = useMemo(() => getSimpleSubjectAreas(subject, level, student), [subject, level, student]);
  const goals = areas.flatMap(area => area.goals);
  const ratings = getSimpleAnnualGoalRatings(app, studentId);
  const documented = goals.filter(goal => ratings[goal.id] !== undefined && ratings[goal.id] !== null).length;
  const gradeMode = getAssessmentMode(app, subject);
  const grades = getSimpleSubjectGrades(app, studentId, subject);
  const goalSegments: Segment[] = GOAL_STEPS.map(step => ({
    label: step.label, color: step.color,
    count: step.value === null ? goals.length - documented : goals.filter(goal => ratings[goal.id] === step.value).length,
  }));
  // Keep historical nonstandard model values visible in the ring rather than hiding documented assessments.
  const otherCount = documented - goalSegments.slice(1).reduce((sum, part) => sum + part.count, 0);
  if (otherCount > 0) goalSegments.push({ label: 'Frühere Einschätzung', count: otherCount, color: '#64748b' });
  const gradeSegments: Segment[] = [
    '#059669', '#65a30d', '#eab308', '#f97316', '#e11d48',
  ].map((color, index) => ({ label: 'Note ' + (index + 1), color,
    count: grades.filter(grade => grade.group === index + 1).length }));
  const notes = [...(app.notes || []), ...(app.journal || [])]
    .filter((note, index, all) => all.findIndex(item => item.id === note.id) === index)
    .filter(note => note.schuelerId === studentId && note.fach === subject)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
  const previousGradeNote = app.noten?.[studentId]?.[subject]?.['1']?.freitext ||
    app.noten?.[studentId]?.[subject]?.['2']?.freitext;

  const setRating = (goalId: string, value: number | null) => {
    const ownerStudent = studentId, ownerClass = classId;
    setApp(prev => {
      if (prev.activeClassId !== ownerClass || !prev.schueler.some(s => s.id === ownerStudent)) return prev;
      const old = prev.studentLernzielSemesterBewertungen?.[ownerStudent] || {};
      const annual = { ...(old['1'] || {}), [goalId]: value };
      return {
        ...prev,
        studentLernzielBewertungen: {
          ...(prev.studentLernzielBewertungen || {}),
          [ownerStudent]: { ...(prev.studentLernzielBewertungen?.[ownerStudent] || {}), [goalId]: value },
        },
        studentLernzielSemesterBewertungen: {
          ...(prev.studentLernzielSemesterBewertungen || {}),
          [ownerStudent]: { ...old, '1': annual },
        },
      };
    });
  };

  const addNote = (event: React.FormEvent) => {
    event.preventDefault();
    const body = newNote.trim();
    if (!body || !studentId || !subject) return;
    const ownerClass = classId, ownerStudent = studentId, ownerSubject = subject;
    setApp(prev => {
      if (prev.activeClassId !== ownerClass || !prev.schueler.some(s => s.id === ownerStudent)) return prev;
      return {
        ...prev,
        notes: [...(prev.notes || []), {
          id: crypto.randomUUID(),
          datum: formatLocalDateKey(new Date()),
          kategorie: 'Notiz',
          inhalt: body,
          fach: ownerSubject,
          schuelerId: ownerStudent,
        }],
      };
    });
    setNewNote('');
  };

  if (!students.length) return <main className="mx-auto max-w-4xl p-5">
    <h1 className="text-2xl font-black">Lernziele & Portfolio</h1>
    <p className="mt-4 rounded-2xl border bg-white p-5">Bitte zuerst ein Kind in dieser Klasse anlegen.</p>
  </main>;

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 text-slate-900 sm:px-6 sm:py-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="text-2xl font-black">Lernziele & Portfolio</h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">Kind
            <select aria-label="Kind auswählen" value={studentId} onChange={event => setStudentId(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
              {students.map(item => <option key={item.id} value={item.id}>{item.vorname} {item.nachname}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold">Fach
            <select aria-label="Fach auswählen" value={subject} onChange={event => setSubject(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
              {subjects.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>
      </header>

      <section aria-label={'Noten und Notizen in ' + subject}
        className="rounded-3xl border border-slate-200 bg-slate-50 p-3 sm:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <CircleDiagram title="Noten" center={String(grades.length)} caption={grades.length + ' dokumentiert'}
            segments={gradeSegments} total={grades.length} />
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-base font-black">Noten · {subject}</h2>
            {gradeMode !== 'grades'
              ? <p className="mt-2 text-sm text-slate-600">Für dieses Fach werden in der Notenmappe {gradeMode === 'percent' ? 'Prozentwerte' : 'Punkte'} erfasst. Diese Werte werden nicht als Schulnoten dargestellt.</p>
              : grades.length ? <div className="mt-3 flex flex-wrap gap-2">
                {grades.map((grade, index) => <span key={grade.label + index}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                  {grade.label}: {grade.value}
                </span>)}
              </div> : <p className="mt-2 text-sm text-slate-500">Noch keine Noten eingetragen.</p>}
            <h2 className="mt-5 text-base font-black">Notizen</h2>
            {previousGradeNote && <p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap">
              {previousGradeNote}
            </p>}
            <div className="mt-2 space-y-2">
              {notes.map(note => <p key={note.id} className="rounded-xl border border-slate-200 p-3 text-sm whitespace-pre-wrap">
                <span className="mb-1 block text-xs font-semibold text-slate-500">{note.datum}{note.teilbereich ? ' · ' + note.teilbereich : ''}</span>
                {note.inhalt}
              </p>)}
              {!previousGradeNote && !notes.length && <p className="text-sm text-slate-500">Noch keine Notizen.</p>}
            </div>
            <form onSubmit={addNote} className="mt-3 flex flex-col gap-2">
              <label htmlFor="simple-portfolio-note" className="text-sm font-bold">Neue Notiz</label>
              <textarea id="simple-portfolio-note" value={newNote} maxLength={2000}
                onChange={event => setNewNote(event.target.value)} rows={2}
                placeholder={'Notiz zu ' + subject + ' …'}
                className="w-full resize-y rounded-xl border border-slate-300 bg-white p-3 text-sm" />
              <button type="submit" disabled={!newNote.trim()} className="min-h-11 self-start rounded-xl bg-indigo-700 px-5 py-2 text-sm font-black text-white disabled:opacity-40">Notiz speichern</button>
            </form>
          </div>
        </div>
      </section>

      <section aria-label={'Lernziele ' + subject} className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-xl font-black">Lernziele · {subject}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{documented} von {goals.length} dokumentiert</p>
          <div className="mt-2 flex justify-center">
            <CircleDiagram title="Lernziele" center={documented + '/' + goals.length}
              caption="Dokumentierte Lernziele" total={goals.length} segments={goalSegments} />
          </div>
        </div>
        {areas.map(area => <section key={area.name} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-base font-black">{area.name} <span className="text-sm font-medium text-slate-500">({area.goals.length} Lernziele)</span></h3>
          {!area.goals.length && <p className="text-sm text-slate-500">Noch keine Lernziele in diesem Bereich.</p>}
          <div className="space-y-3">
            {area.goals.map(goal => <div key={goal.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="font-bold leading-relaxed">{goal.text}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4" role="group" aria-label={'Lernziel einschätzen: ' + goal.text}>
                {GOAL_STEPS.map(step => {
                  const current = ratings[goal.id] ?? null;
                  const active = current === step.value;
                  return <button key={step.label} type="button" onClick={() => setRating(goal.id, step.value)}
                    aria-pressed={active} className={`min-h-12 rounded-xl border px-2 py-2 text-xs font-bold transition sm:text-sm ${active ? 'border-indigo-600 bg-indigo-100 text-indigo-950 ring-1 ring-indigo-600' : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
                    {step.icon && <span aria-hidden="true">{step.icon} </span>}{step.label}
                  </button>;
                })}
              </div>
            </div>)}
          </div>
        </section>)}
      </section>
    </main>
  );
}
