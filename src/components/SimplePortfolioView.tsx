import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAssessmentMode } from '../lib/GradeUtils';
import { getSimpleAnnualGoalRatings, getSimpleSubjectAreas, getSimpleSubjectGrades } from '../lib/simplePortfolio';
import { getLernzielModell, getLernzielRadarProgress, parseLernzielModell, pruefeModellWechsel, verwendeteLernzielStufen, type LernzielBewertungsmodell } from '../lib/lernzielBewertungsmodell';
import { formatLocalDateKey } from '../lib/utils';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';
import PortfolioFlower, { type FlowerPetal } from './PortfolioFlower';


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
  const [newRadarGoal, setNewRadarGoal] = useState('');
  const [newRadarArea, setNewRadarArea] = useState('');
  const [levelDraft, setLevelDraft] = useState<LernzielBewertungsmodell | null>(null);
  const [levelError, setLevelError] = useState('');
  const levelModel = getLernzielModell(app.lernzielBewertungsmodell);
  const goalSteps = [
    { value: null as number | null, label: levelModel.emptyLabel, icon: '', color: '#cbd5e1' },
    ...levelModel.levels.map(stage => ({ value: stage.value as number | null, label: stage.label, icon: stage.symbol, color: stage.color })),
  ];

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
  useEffect(() => { setNewNote(''); setNewRadarGoal(''); setNewRadarArea(''); }, [studentId, subject, classId]);
  useEffect(() => { setLevelDraft(null); setLevelError(''); }, [classId]);

  const areas = useMemo(() => getSimpleSubjectAreas(subject, level, student), [subject, level, student]);
  const goals = areas.flatMap(area => area.goals);
  const ratings = getSimpleAnnualGoalRatings(app, studentId);
  const documented = goals.filter(goal => ratings[goal.id] !== undefined && ratings[goal.id] !== null).length;
  const ownRadarGoals = (student?.manuelleLernziele || []).filter(goal => goal.stufe === level && goal.fach === subject);
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
  const addRadarGoal = (event: React.FormEvent) => {
    event.preventDefault();
    const label = newRadarGoal.trim();
    const areaName = areas.some(area => area.name === newRadarArea) ? newRadarArea : areas[0]?.name;
    if (!label || label.length > 180 || !areaName || !studentId || !subject) return;
    const ownerClass = classId, ownerStudent = studentId, ownerSubject = subject, ownerLevel = level;
    const key = goalAxisKey, currentAxes = [...goalAxisIds];
    const id = 'radar-' + crypto.randomUUID();
    const timestamp = new Date().toISOString();
    setApp(prev => {
      if (prev.activeClassId !== ownerClass || !prev.schueler.some(item => item.id === ownerStudent)) return prev;
      const existing = prev.schueler.find(item => item.id === ownerStudent)!;
      const ownGoals = existing.manuelleLernziele || [];
      if (ownGoals.filter(goal => goal.stufe === ownerLevel && goal.fach === ownerSubject).length >= 40) return prev;
      const nextGoal = { id, fach: ownerSubject, kompetenzbereich: areaName,
        text: label, stufe: ownerLevel, createdAt: timestamp, updatedAt: timestamp };
      const nextAxes = currentAxes.length < 8
        ? [...currentAxes, 'goal:' + id] : currentAxes;
      return {
        ...prev,
        schueler: prev.schueler.map(item => item.id === ownerStudent ? {
          ...item,
          manuelleLernziele: [...ownGoals, nextGoal],
        } : item),
        settings: { ...prev.settings, portfolioRadarAxes: {
          ...(prev.settings.portfolioRadarAxes || {}), [key]: nextAxes,
        } },
      };
    });
    setNewRadarGoal('');
  };
  const renameRadarGoal = (goalId: string, text: string) => {
    const label = text.trim();
    if (!label || label.length > 180) return;
    const ownerClass = classId, ownerStudent = studentId;
    setApp(prev => prev.activeClassId !== ownerClass ? prev : ({
      ...prev,
      schueler: prev.schueler.map(item => item.id !== ownerStudent ? item : ({
        ...item,
        manuelleLernziele: (item.manuelleLernziele || []).map(goal =>
          goal.id === goalId && goal.stufe === level && goal.fach === subject
            ? { ...goal, text: label, updatedAt: new Date().toISOString() } : goal),
      })),
    }));
  };
  const editLevel = (value: number, patch: Partial<LernzielBewertungsmodell['levels'][number]>) => {
    setLevelDraft(prev => {
      const model = prev || getLernzielModell(app.lernzielBewertungsmodell);
      return { ...model, levels: model.levels.map(stage => stage.value === value ? { ...stage, ...patch } : stage) };
    });
    setLevelError('');
  };
  const addLevel = () => {
    setLevelDraft(prev => {
      const model = prev || getLernzielModell(app.lernzielBewertungsmodell);
      if (model.levels.length >= 10) return model;
      const nextId = Math.max(...model.levels.map(stage => stage.value), 3) + 1;
      const position = Math.max(0, model.levels.length - 1);
      const lower = model.levels[position - 1];
      const upper = model.levels[position];
      const from = lower ? getLernzielRadarProgress(model, lower.value) * 100 : 0;
      const to = upper ? getLernzielRadarProgress(model, upper.value) * 100 : 100;
      const newStage = { value: nextId, label: 'Neue Stufe', kurz: 'Neu', color: '#2563eb',
        symbol: '⭐', radarPercent: Math.round(((from + to) / 2) * 10) / 10 };
      return { ...model, levels: [...model.levels.slice(0, position), newStage, ...model.levels.slice(position)] };
    });
    setLevelError('');
  };
  const removeLevel = (value: number) => {
    setLevelDraft(prev => {
      const model = prev || getLernzielModell(app.lernzielBewertungsmodell);
      if (model.levels.length <= 2) return model;
      return { ...model, levels: model.levels.filter(stage => stage.value !== value) };
    });
    setLevelError('');
  };
  const saveLevelModel = () => {
    if (!levelDraft || app.activeClassId !== classId) return;
    try {
      const next = parseLernzielModell(levelDraft);
      const previous = getLernzielModell(app.lernzielBewertungsmodell);
      const used = verwendeteLernzielStufen(
        app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen,
      );
      pruefeModellWechsel(previous, next, used);
      setApp(prev => prev.activeClassId !== classId ? prev : ({ ...prev, lernzielBewertungsmodell: next }));
      setLevelDraft(null);
      setLevelError('');
    } catch (error) {
      setLevelError(error instanceof Error ? error.message : 'Bewertungsstufen konnten nicht gespeichert werden.');
    }
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
      <p className="mt-2 text-xs text-slate-500">Wähle die Werte für die Achsen aus. Die Konfiguration bleibt
        verschlüsselt in dieser Klasse gespeichert. Bestehende Bewertungen werden nicht gelöscht.</p>
      {key.startsWith('goals:') && <div className="mt-5 space-y-5 border-t border-slate-200 pt-4">
        <section aria-label="Bewertungsstufen bearbeiten">
          <h4 className="text-base font-black text-slate-900">Bewertungsstufen selbst festlegen</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Passe die Stufen an, die bei jedem Lernziel als Auswahl erscheinen. Du kannst 2 bis 10
            Bewertungsstufen verwenden und zu jeder Stufe ihren Diagrammwert von 0–100 % festlegen.
            Die Einstellung gilt für die gesamte ausgewählte Klasse; die Einschätzung bleibt pro Kind
            und Lernziel individuell. Bereits gespeicherte Einschätzungen werden nicht umgeschrieben.
          </p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="block text-xs font-bold text-slate-700">Unbewertet-Text
              <input type="text" maxLength={50}
                aria-label="Bezeichnung nicht eingeschätzt"
                value={(levelDraft || levelModel).emptyLabel}
                onChange={event => {
                  const label = event.target.value;
                  setLevelDraft(prev => ({ ...(prev || levelModel), emptyLabel: label }));
                  setLevelError('');
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <p className="mt-1 text-xs text-slate-500">Nicht eingeschätzt bedeutet immer 0 % im Diagramm.</p>
          </div>
          <div className="mt-3 space-y-2">
            {(levelDraft || levelModel).levels.map((stage, index) => {
              const current = levelDraft || levelModel;
              const used = verwendeteLernzielStufen(
                app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen,
              ).has(stage.value);
              return <div key={stage.value} data-goal-level={stage.value}
                className="grid min-w-0 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(0,1fr)_5rem_5rem_auto] sm:items-end">
                <label className="min-w-0 text-xs font-bold text-slate-700">Stufe {index + 1} · Bezeichnung
                  <input type="text" required maxLength={55}
                    aria-label={'Bewertungsstufe ' + stage.value + ' benennen'}
                    value={stage.label}
                    onChange={event => editLevel(stage.value, { label: event.target.value,
                      kurz: event.target.value.trim().slice(0, 25) || stage.kurz })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-700">Symbol
                  <input type="text" maxLength={8} aria-label={'Symbol Stufe ' + stage.value}
                    value={stage.symbol} onChange={event => editLevel(stage.value, { symbol: event.target.value })}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-center text-sm" />
                </label>
                <label className="min-w-0 text-xs font-bold text-slate-700">Wert %
                  <input type="number" min={0} max={100} step="0.1"
                    aria-label={'Diagrammwert Stufe ' + stage.value}
                    value={stage.radarPercent ?? Math.round(getLernzielRadarProgress(current, stage.value) * 1000) / 10}
                    onChange={event => {
                      const value = Number(event.target.value);
                      if (event.target.value !== '' && Number.isFinite(value) && value >= 0 && value <= 100)
                        editLevel(stage.value, { radarPercent: value });
                    }}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm" />
                </label>
                <button type="button" disabled={used || current.levels.length <= 2}
                  title={used ? 'Diese Stufe wird bereits verwendet und kann nicht entfernt werden.' : 'Stufe entfernen'}
                  onClick={() => removeLevel(stage.value)}
                  className="min-h-11 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:cursor-not-allowed disabled:opacity-40">
                  Entfernen
                </button>
                {used && <span className="text-xs text-slate-500 sm:col-span-4">
                  Bereits verwendet · Bezeichnung und Diagrammwert bleiben bearbeitbar.
                </span>}
              </div>;
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" disabled={(levelDraft || levelModel).levels.length >= 10}
              onClick={addLevel}
              className="min-h-11 rounded-xl border border-indigo-300 px-4 py-2 text-sm font-bold text-indigo-700 disabled:opacity-40">
              + Bewertungsstufe hinzufügen
            </button>
            <button type="button" disabled={!levelDraft} onClick={saveLevelModel}
              className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              Bewertungsstufen speichern
            </button>
            {levelDraft && <button type="button" onClick={() => {
              setLevelDraft(null); setLevelError('');
            }} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-600">
              Änderungen verwerfen
            </button>}
          </div>
          {levelError && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-700">
            {levelError}
          </p>}
          <p className="mt-2 text-xs text-slate-500">
            Speichern aktualisiert die Lernziel-Buttons und die Radien des Spinnennetzdiagramms.
            Die Stufen-IDs bleiben stabil; bereits verwendete Stufen sind vor dem Löschen geschützt.
          </p>
        </section>
        <section aria-label="Eigene Lernziele bearbeiten" className="border-t border-slate-200 pt-4">
          <h4 className="text-base font-black text-slate-900">Eigene Lernziele festlegen</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Erstelle und bearbeite Lernziele für das ausgewählte Kind und Fach. Wähle danach für jedes
            Lernziel eine der oben festgelegten Bewertungsstufen. Die Achse wächst entsprechend dem
            Diagrammwert dieser Stufe.
          </p>
          <form onSubmit={addRadarGoal} className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(9rem,0.5fr)_auto] sm:items-end">
            <label className="min-w-0 text-xs font-bold text-slate-700">Neues Lernziel
              <input aria-label="Eigenes Radar-Lernziel" type="text" maxLength={180} required
                value={newRadarGoal} onChange={event => setNewRadarGoal(event.target.value)}
                placeholder="z. B. Silben sicher lesen"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
            </label>
            <label className="min-w-0 text-xs font-bold text-slate-700">Lernbereich
              <select aria-label="Lernbereich für neues Radar-Lernziel"
                value={areas.some(area => area.name === newRadarArea) ? newRadarArea : areas[0]?.name || ''}
                onChange={event => setNewRadarArea(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-2 text-sm">
                {areas.map(area => <option key={area.name} value={area.name}>{area.name}</option>)}
              </select>
            </label>
            <button type="submit" disabled={!newRadarGoal.trim() || ownRadarGoals.length >= 40}
              className="min-h-11 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
              Lernziel hinzufügen
            </button>
          </form>
          {ownRadarGoals.length > 0 && <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
            {ownRadarGoals.map(goal => {
              const selectedAxis = goalAxisIds.includes('goal:' + goal.id);
              return <div key={goal.id} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3"
                data-custom-radar-goal={goal.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">{goal.kompetenzbereich}</span>
                  <span className="text-xs font-bold text-teal-700">
                    {selectedAxis ? 'Eigene Diagrammachse' : 'Im Lernbereich enthalten'}
                  </span>
                </div>
                <label className="mt-2 block text-xs font-bold text-slate-700">Lernziel bearbeiten
                  <input key={goal.id} type="text" maxLength={180} defaultValue={goal.text}
                    aria-label={'Eigenes Lernziel bearbeiten ' + goal.id}
                    onBlur={event => {
                      if (!event.currentTarget.value.trim()) event.currentTarget.value = goal.text;
                      else if (event.currentTarget.value.trim() !== goal.text)
                        renameRadarGoal(goal.id, event.currentTarget.value);
                    }}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" />
                </label>
                <label className="mt-3 block text-xs font-bold text-slate-700">Einschätzung für dieses Kind
                  <select aria-label={'Einschätzung eigenes Lernziel ' + goal.id}
                    value={ratings[goal.id] ?? ''}
                    onChange={event => setRating(goal.id, event.target.value === '' ? null : Number(event.target.value))}
                    className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">
                    <option value="">{levelModel.emptyLabel} · 0 %</option>
                    {levelModel.levels.map(stage => <option key={stage.value} value={stage.value}>
                      {stage.symbol} {stage.label} · {Math.round(getLernzielRadarProgress(levelModel, stage.value) * 100)} %
                    </option>)}
                  </select>
                </label>
              </div>;
            })}
          </div>}
        </section>
      </div>}
    </details>;
  // Every chart radius follows the saved class-local assessment scale.
  // IDs and historical goal ratings are never rewritten when labels or radii change.
  const goalPetals: FlowerPetal[] = goalAxisIds.map((id, index) => {
    const axis = goalAxisChoices.find(choice => choice.id === id)!;
    const axisGoals = axis.goals;
    return {
      label: axis.label, color: radarColors[index % radarColors.length],
      count: axisGoals.filter(goal => ratings[goal.id] !== null && ratings[goal.id] !== undefined).length,
      total: axisGoals.length,
      progress: axisGoals.length ? axisGoals.reduce((sum, goal) =>
        sum + getLernzielRadarProgress(levelModel, ratings[goal.id]), 0) / axisGoals.length : 0,
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
          note="Jede Achse wächst mit den dokumentierten Lernzielbewertungen. Die Stufen und ihre Diagrammwerte sind individuell einstellbar; noch nicht eingeschätzte Ziele zählen als 0. Das Diagramm ist keine Schulnote." />
        {axisSettings(goalAxisKey, goalAxisIds, goalAxisChoices)}
        {areas.map(area => <section key={area.name} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="mb-4 text-base font-black">{area.name} <span className="text-sm font-medium text-slate-500">({area.goals.length} Lernziele)</span></h3>
          {!area.goals.length && <p className="text-sm text-slate-500">Noch keine Lernziele in diesem Bereich.</p>}
          <div className="space-y-3">
            {area.goals.map(goal => <div key={goal.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <p className="font-bold leading-relaxed">{goal.text}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5" role="group" aria-label={'Lernziel einschätzen: ' + goal.text}>
                {goalSteps.map(step => {
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
