import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAssessmentMode } from '../lib/GradeUtils';
import { getSimpleAnnualGoalRatings, getSimpleSubjectAreas, getSimpleSubjectGrades } from '../lib/simplePortfolio';
import { formatLocalDateKey } from '../lib/utils';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';
import PortfolioFlower, { type FlowerPetal } from './PortfolioFlower';


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
  const radarColors = ['#0d9488', '#4f46e5', '#d97706', '#be185d',
    '#0284c7', '#7c3aed', '#b45309', '#047857'];
  const gradeGroups = ['Schularbeit', 'Lernzielkontrolle', 'Wochenplan', 'Sonstige Leistung'];
  const gradeCounts = gradeGroups.map(group => grades.filter(grade => grade.label.startsWith(group + ' ')).length);
  const gradeScale = Math.max(6, ...gradeCounts);
  const goalAxisChoices = [
    ...areas.map(area => ({ id: 'area:' + area.name, label: area.name, goals: area.goals })),
    ...goals.map(goal => ({ id: 'goal:' + goal.id, label: goal.text, goals: [goal] })),
  ];
  const goalAxisKey = 'goals:' + level + ':' + subject;
  const gradeAxisKey = 'grades:' + subject;
  const configuredAxes = app.settings.portfolioRadarAxes || {};
  const selectAxes = (key: string, options: { id: string }[], defaults: string[]) => {
    const selected = configuredAxes[key];
    if (!Array.isArray(selected)) return defaults;
    const unique = Array.from(new Set(selected)).filter(id => options.some(option => option.id === id)).slice(0, 8);
    return unique.length >= 3 ? unique : defaults;
  };
  const goalAxisIds = selectAxes(goalAxisKey, goalAxisChoices, areas.map(area => 'area:' + area.name));
  const gradeAxisChoices = gradeGroups.map(group => ({ id: group, label: group }));
  const gradeAxisIds = selectAxes(gradeAxisKey, gradeAxisChoices, gradeGroups);
  const updateAxes = (key: string, ids: string[]) => {
    if (ids.length < 3 || ids.length > 8 || new Set(ids).size !== ids.length) return;
    const ownerClass = classId;
    setApp(prev => prev.activeClassId !== ownerClass ? prev : ({
      ...prev,
      settings: {
        ...prev.settings,
        portfolioRadarAxes: { ...(prev.settings.portfolioRadarAxes || {}), [key]: ids },
      },
    }));
  };
  const changeAxisCount = (key: string, selected: string[], options: { id: string }[], count: number) => {
    if (!Number.isInteger(count) || count < 3 || count > Math.min(8, options.length)) return;
    const next = selected.slice(0, count);
    for (const option of options) {
      if (next.length >= count) break;
      if (!next.includes(option.id)) next.push(option.id);
    }
    updateAxes(key, next);
  };
  const axisSettings = (key: string, selected: string[], options: { id: string; label: string }[]) =>
    <details className="group min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm sm:px-5">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>Diagramm einstellen · {selected.length} Werte</span>
        <span aria-hidden="true" className="text-slate-400 transition-transform group-open:rotate-180">⌄</span>
      </summary>
      <label className="mt-3 block text-sm font-semibold">Anzahl der Achsen
        <select aria-label={'Anzahl Achsen ' + (key.startsWith('goals:') ? 'Lernziele' : 'Noten')}
          className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2"
          value={selected.length}
          onChange={event => changeAxisCount(key, selected, options, Number(event.target.value))}>
          {Array.from({ length: Math.min(8, options.length) - 2 }, (_, index) => index + 3)
            .map(count => <option key={count} value={count}>{count} Werte</option>)}
        </select>
      </label>
      <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {selected.map((id, index) => <label key={index} className="block min-w-0 text-xs font-semibold">
          Achse {index + 1}
          <select aria-label={'Radar ' + (key.startsWith('goals:') ? 'Lernziele' : 'Noten') + ' Achse ' + (index + 1)}
            className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm"
            value={id}
            onChange={event => updateAxes(key, selected.map((current, i) => i === index ? event.target.value : current))}>
            {options.map(option => <option key={option.id} value={option.id}
              disabled={selected.includes(option.id) && option.id !== id}>{option.label}</option>)}
          </select>
        </label>)}
      </div>
      <p className="mt-2 text-xs text-slate-500">Nur vorhandene Fachbereiche, Lernziele bzw. Leistungsarten.
        Die Auswahl wird in den verschlüsselten Klasseneinstellungen gespeichert; Einträge werden nicht gelöscht.</p>
    </details>;
  // Goal axes use the existing four-step assessments (0, ⅓, ⅔, 1).
  // Missing evaluations have zero weight; the existing goal records do not change.
  const goalPetals: FlowerPetal[] = goalAxisIds.map((id, index) => {
    const axis = goalAxisChoices.find(choice => choice.id === id)!;
    const axisGoals = axis.goals;
    return {
      label: axis.label, color: radarColors[index % radarColors.length],
      count: axisGoals.filter(goal => ratings[goal.id] !== null && ratings[goal.id] !== undefined).length,
      total: axisGoals.length,
      progress: axisGoals.length ? axisGoals.reduce((sum, goal) => {
        const rating = ratings[goal.id];
        return sum + (rating === 1 ? 1 : rating === 2 ? 2 / 3 : rating === 3 ? 1 / 3 : 0);
      }, 0) / axisGoals.length : 0,
    };
  });
  // Grade axes represent entry counts, not school marks or averaged performance.
  const gradePetals: FlowerPetal[] = gradeAxisIds.map((id, index) => ({
    label: id, count: gradeCounts[gradeGroups.indexOf(id)], total: gradeScale,
    color: radarColors[index % radarColors.length],
  }));
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

      <section aria-label={'Noten und Notizen in ' + subject} className="min-w-0 space-y-4">
        <PortfolioFlower title="Noten" center={String(grades.length)}
          caption={grades.length + ' Noteneinträge dokumentiert'}
          petals={gradePetals} showDenominator={false}
          note="Die Achsen zeigen ausschließlich die Anzahl der Einträge je Leistungsart – nicht die Notenhöhe oder Leistung." />
        <div className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-black">Noten · {subject}</h2>
            {gradeMode !== 'grades'
              ? <p className="mt-2 text-sm text-slate-600">Für dieses Fach werden in der Notenmappe {gradeMode === 'percent' ? 'Prozentwerte' : 'Punkte'} erfasst. Diese Werte werden nicht als Schulnoten dargestellt.</p>
              : grades.length ? <div className="mt-3 flex flex-wrap gap-2">
                {grades.map((grade, index) => <span key={grade.label + index}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                  {grade.label}: {grade.value}
                </span>)}
              </div> : <p className="mt-2 text-sm text-slate-500">Noch keine Noten eingetragen.</p>}
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h2 className="text-base font-black">Notizen · {subject}</h2>
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
        {axisSettings(gradeAxisKey, gradeAxisIds, gradeAxisChoices)}
      </section>

      <section aria-label={'Lernziele ' + subject} className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <h2 className="text-xl font-black">Lernziele · {subject}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{documented} von {goals.length} dokumentiert</p>
        </div>
        <PortfolioFlower title="Lernziele" center={documented + '/' + goals.length}
          caption={goalAxisIds.length + ' Achsen · individuell auswählbar'}
          petals={goalPetals}
          note="Jede Achse wächst mit der dokumentierten Einschätzung der ausgewählten Ziele: in Entwicklung = ⅓, im Wesentlichen = ⅔, erreicht = vollständig. Noch nicht eingeschätzte Ziele zählen als 0. Das Diagramm ist keine Schulnote." />
        {axisSettings(goalAxisKey, goalAxisIds, goalAxisChoices)}
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
