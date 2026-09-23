import React from 'react';
import { ChevronLeft, ChevronRight, Plus, ArrowRight, Link2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TAGE_NAMEN, LESSON_SLOT_NUMBERS, STUNDEN_INFO } from '../constants';
import type { PersonalLesson, PersonalLessonKind, PersonalTimetableException } from '../types';
import { getKW } from '../lib/utils';
import {
  applyTeacherChangeToClass, importedTeacherLessons, linkedClassChange,
  personalDateKey, personalLessonId, personalLessonTimes, personalLessonsForDate,
  personalWeekDayDate, personalWeekStart, type VisiblePersonalLesson,
} from '../lib/personalTimetable';

const TYPES: { value: PersonalLessonKind; label: string }[] = [
  { value: 'unterricht', label: 'Unterricht' },
  { value: 'aufsicht', label: 'Pausenaufsicht' },
  { value: 'foerderung', label: 'Förderunterricht' },
  { value: 'besprechung', label: 'Besprechung' },
  { value: 'dienst', label: 'Fixer Dienst' },
  { value: 'sonstiges', label: 'Sonstiger Termin' },
];
const friendlyKind = (kind?: PersonalLessonKind) =>
  TYPES.find(option => option.value === kind)?.label || 'Unterricht';
const timeLabel = (lesson: PersonalLesson) => {
  const [start, ende] = personalLessonTimes(lesson.stunde);
  return [lesson.start || start, lesson.ende || ende].filter(Boolean).join('–');
};
const makeDraft = (lesson: PersonalLesson): PersonalLesson => ({ ...lesson });

type Editing = {
  tag: string;
  datum: string;
  baseId?: string;
  /** The unchanged repeating entry, even if a dated exception is shown. */
  original?: PersonalLesson;
  originalExceptionId?: string;
  onlyDate: boolean;
};

/** Account-owned teaching calendar: recurring entries plus non-destructive dated exceptions.
 * Lesson content always belongs to the original class's weekly planning page. */
export default function PersonalTimetable() {
  const { app, setApp, setPage, switchClass } = useApp();
  const year = app.schuljahr;
  const lessons = app.lehrerProfil?.stundenplanByYear?.[year] || [];
  const exceptions = app.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || [];
  const [weekStart, setWeekStart] = React.useState(() => personalWeekStart(new Date()));
  const [view, setView] = React.useState<'raster' | 'zeiten'>('raster');
  const [importClassId, setImportClassId] = React.useState(app.activeClassId || '');
  const [editing, setEditing] = React.useState<Editing | null>(null);
  const [draft, setDraft] = React.useState<PersonalLesson>({
    tag: 'Montag', stunde: 1, fach: '', klasse: '', raum: '', kind: 'unterricht',
  });
  const [error, setError] = React.useState('');
  const rooms = app.classes || [];
  const dates = TAGE_NAMEN.map((tag, index) => ({
    tag, datum: personalWeekDayDate(weekStart, index),
  }));
  const isCurrentWeek = personalDateKey(weekStart) === personalDateKey(personalWeekStart(new Date()));

  const storePlan = (
    updater: (old: PersonalLesson[], oldExceptions: PersonalTimetableException[]) =>
      { lessons: PersonalLesson[]; exceptions: PersonalTimetableException[] },
  ) => {
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanByYear?.[year] || [];
      const oldExceptions = prev.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || [];
      const updated = updater(old, oldExceptions);
      return {
        ...prev,
        lehrerProfil: {
          ...(prev.lehrerProfil || {}),
          stundenplanByYear: { ...(prev.lehrerProfil?.stundenplanByYear || {}), [year]: updated.lessons },
          stundenplanAusnahmenByYear: {
            ...(prev.lehrerProfil?.stundenplanAusnahmenByYear || {}), [year]: updated.exceptions,
          },
        },
      };
    });
  };
  const changeWeek = (delta: number) => setWeekStart(current =>
    personalWeekStart(new Date(current.getFullYear(), current.getMonth(), current.getDate() + delta * 7)));

  const startEditing = (tag: string, datum: string, stunde = 1,
    visible?: VisiblePersonalLesson, onlyDate = false) => {
    const regularIndex = visible ? lessons.findIndex((lesson, index) =>
      personalLessonId(lesson, index) === visible.baseId) : -1;
    const regular = regularIndex >= 0 ? lessons[regularIndex] : undefined;
    const lesson = visible?.lesson || regular || {
      tag, stunde, fach: '', klasse: '', raum: '', kind: 'unterricht' as PersonalLessonKind,
    };
    const [start, ende] = personalLessonTimes(stunde);
    setDraft({ ...makeDraft(lesson), start: lesson.start || start, ende: lesson.ende || ende });
    setEditing({ tag, datum, baseId: visible?.baseId, original: regular,
      originalExceptionId: visible?.exception === 'add' ? visible.baseId : undefined,
      onlyDate: onlyDate || !!visible?.exception });
    setError('');
  };

  const save = () => {
    if (!editing) return;
    const fach = draft.fach.trim().slice(0, 130);
    if (!fach) { setError('Bitte zuerst Fach oder Tätigkeit eingeben.'); return; }
    if (!TAGE_NAMEN.includes(draft.tag) || !Number.isInteger(draft.stunde) ||
        draft.stunde < 0 || draft.stunde > 10) {
      setError('Bitte einen gültigen Tag und eine gültige Stunde wählen.'); return;
    }
    if (draft.start && draft.ende && draft.start >= draft.ende) {
      setError('Die Endzeit muss nach der Startzeit liegen.'); return;
    }
    const previous = editing.original;
    const originalIndex = previous ? lessons.findIndex((lesson, index) =>
      personalLessonId(lesson, index) === editing.baseId) : -1;
    if (editing.baseId && !editing.originalExceptionId && previous && originalIndex < 0) {
      setError('Dieser Eintrag wurde zwischenzeitlich geändert. Bitte erneut öffnen.'); return;
    }
    const next: PersonalLesson = {
      ...draft, id: draft.id || previous?.id || (previous && originalIndex >= 0
        ? personalLessonId(previous, originalIndex) : crypto.randomUUID()),
      fach, klasse: draft.klasse.trim().slice(0, 90), raum: draft.raum.trim().slice(0, 60),
      start: draft.start || '', ende: draft.ende || '',
      quelle: previous?.quelle && draft.klasse.trim() === previous.klasse &&
        (draft.kind || 'unterricht') === 'unterricht' ? previous.quelle : undefined,
    };
    const regularMode = !editing.onlyDate;
    if (regularMode && lessons.some((item, index) =>
      personalLessonId(item, index) !== editing.baseId &&
      item.tag === next.tag && item.stunde === next.stunde && item.stunde > 0 &&
      (item.start || '') === (next.start || ''))) {
      setError('Zu dieser Stunde gibt es bereits einen persönlichen Eintrag. Bitte eine andere Stunde wählen.'); return;
    }

    let changeClass = false;
    if (regularMode && previous?.quelle && next.quelle &&
        (previous.fach !== next.fach || previous.tag !== next.tag || previous.stunde !== next.stunde)) {
      // B: "OK" edits the class too; "Abbrechen" makes the personal change only.
      changeClass = window.confirm(
        'Auch den Klassenstundenplan von ' + previous.klasse + ' ändern?\n' +
        'OK = persönlichen und Klassenstundenplan ändern.\n' +
        'Abbrechen = nur deinen persönlichen Stundenplan ändern.\n' +
        'Die Unterrichtsinhalte der Wochenplanung bleiben in jedem Fall unverändert.',
      );
      if (changeClass) {
        const checked = applyTeacherChangeToClass(app, previous, next);
        if (checked.status !== 'ok') {
          setError(checked.status === 'occupied' ? 'Im Klassenstundenplan ist das Ziel bereits belegt. Es wurde nichts überschrieben.'
            : checked.status === 'changed' ? 'Der Klassenstundenplan hat sich zwischenzeitlich geändert. Bitte zuerst die Verknüpfung prüfen.'
            : checked.status === 'viewer' ? 'Für diesen Klassenstundenplan hast du nur Leserechte.'
            : 'Die verknüpfte Klasse ist nicht verfügbar. Bitte nur persönlich ändern.');
          return;
        }
      }
    }

    if (editing.onlyDate) {
      const nextDate = editing.datum;
      const sourceId = editing.originalExceptionId || editing.baseId;
      setApp(prev => {
        const oldExceptions = prev.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || [];
        const rest = oldExceptions.filter(item =>
          !(editing.originalExceptionId ? item.id === editing.originalExceptionId :
            item.datum === nextDate && item.lessonId === sourceId && item.type !== 'add'));
        const extra: PersonalTimetableException = editing.original
          ? { id: crypto.randomUUID(), datum: nextDate, lessonId: sourceId, type: 'change', lesson: next }
          : { id: editing.originalExceptionId || crypto.randomUUID(), datum: nextDate, type: 'add', lesson: next };
        return { ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
          stundenplanAusnahmenByYear: {
            ...(prev.lehrerProfil?.stundenplanAusnahmenByYear || {}), [year]: [...rest, extra],
          },
        } };
      });
      setEditing(null); return;
    }

    setApp(prev => {
      let nextApp = prev;
      if (changeClass && previous) {
        const updated = applyTeacherChangeToClass(prev, previous, next);
        if (updated.status !== 'ok') return prev;
        nextApp = updated.state;
      }
      const old = nextApp.lehrerProfil?.stundenplanByYear?.[year] || [];
      const baseId = editing.baseId;
      const newEntry = changeClass && next.quelle
        ? { ...next, quelle: { ...next.quelle, tag: next.tag, stunde: next.stunde, fach: next.fach } }
        : next;
      const updated = baseId ? old.map((item, index) =>
        personalLessonId(item, index) === baseId ? newEntry : item) : [...old, newEntry];
      return { ...nextApp, lehrerProfil: { ...(nextApp.lehrerProfil || {}),
        stundenplanByYear: { ...(nextApp.lehrerProfil?.stundenplanByYear || {}), [year]: updated },
      } };
    });
    setEditing(null);
  };

  const removeRegular = () => {
    if (!editing?.original || !editing.baseId ||
        !window.confirm('Diesen persönlichen Eintrag wirklich aus allen regulären Wochen entfernen? Der Klassenstundenplan bleibt unverändert.')) return;
    const baseId = editing.baseId;
    storePlan((old, oldExceptions) => ({
      lessons: old.filter((item, index) => personalLessonId(item, index) !== baseId),
      exceptions: oldExceptions.filter(item => item.lessonId !== baseId),
    }));
    setEditing(null);
  };
  const cancelForDate = (visible: VisiblePersonalLesson, datum: string) => {
    if (!window.confirm('Soll diese Stunde nur am ' + datum + ' ausfallen? Der regelmäßige Plan bleibt unverändert.')) return;
    if (visible.exception === 'add') {
      setApp(prev => ({ ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
        stundenplanAusnahmenByYear: {
          ...(prev.lehrerProfil?.stundenplanAusnahmenByYear || {}),
          [year]: (prev.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || []).filter(item => item.id !== visible.baseId),
        },
      } }));
      return;
    }
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || [];
      const without = old.filter(item => !(item.datum === datum && item.lessonId === visible.baseId));
      return { ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
        stundenplanAusnahmenByYear: { ...(prev.lehrerProfil?.stundenplanAusnahmenByYear || {}),
          [year]: [...without, { id: crypto.randomUUID(), datum, type: 'cancel', lessonId: visible.baseId }] },
      } };
    });
  };
  const restoreDate = (baseId: string, datum: string) => {
    setApp(prev => ({ ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
      stundenplanAusnahmenByYear: {
        ...(prev.lehrerProfil?.stundenplanAusnahmenByYear || {}),
        [year]: (prev.lehrerProfil?.stundenplanAusnahmenByYear?.[year] || []).filter(item =>
          !(item.datum === datum && item.lessonId === baseId)),
      },
    } }));
  };
  const importWeek = () => {
    if (!importClassId) return;
    const preview = importedTeacherLessons(app, importClassId, lessons);
    if (!preview.available) { setError('Diese Klasse ist nicht verfügbar oder nur lesbar.'); return; }
    if (!preview.added.length) { setError('Keine freien Unterrichtsstunden zur Übernahme gefunden.'); return; }
    if (!window.confirm(preview.added.length + ' Unterrichtsstunden in deinen persönlichen Wochenplan übernehmen? ' +
      preview.skipped + ' bereits belegte Stunden bleiben unverändert.')) return;
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanByYear?.[year] || [];
      const imported = importedTeacherLessons(prev, importClassId, old);
      if (!imported.available || !imported.added.length) return prev;
      return { ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
        stundenplanByYear: { ...(prev.lehrerProfil?.stundenplanByYear || {}),
          [year]: [...old, ...imported.added] },
      } };
    });
    setError('');
  };
  const acceptClassUpdate = (original: PersonalLesson, baseId: string) => {
    const diff = linkedClassChange(app, original);
    if (!diff.changed || diff.missing) return;
    if (!diff.currentFach) {
      if (!window.confirm('Die Stunde wurde im Klassenstundenplan entfernt. Persönlichen Eintrag behalten und die Verknüpfung lösen?')) return;
    }
    setApp(prev => {
      const old = prev.lehrerProfil?.stundenplanByYear?.[year] || [];
      return { ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}),
        stundenplanByYear: { ...(prev.lehrerProfil?.stundenplanByYear || {}),
          [year]: old.map((item, index) =>
            personalLessonId(item, index) === baseId
              ? diff.currentFach ? { ...item, fach: diff.currentFach, quelle: { ...item.quelle!, fach: diff.currentFach } }
                : { ...item, quelle: undefined }
              : item),
        },
      } };
    });
  };
  const openClassPlanning = (lesson: PersonalLesson) => {
    const room = rooms.find(item => item.id === lesson.quelle?.classId);
    if (!room) return;
    if (app.activeClassId !== room.id) switchClass(room.id);
    // Weekly lesson content remains in the class; never duplicate it in this timetable.
    setPage('wochenplanung');
  };
  const classPlanningPreview = (lesson: PersonalLesson, datum: string) => {
    const room = rooms.find(item => item.id === lesson.quelle?.classId);
    if (!room || !lesson.quelle) return '';
    const kw = getKW(new Date(datum + 'T12:00:00'));
    const slot = room.wochenplanung?.[kw]?.[lesson.quelle.tag]?.[lesson.quelle.stunde];
    return typeof slot?.thema === 'string' ? slot.thema : '';
  };
  const lessonCard = (visible: VisiblePersonalLesson, datum: string) => {
    const lesson = visible.lesson;
    const baseline = lessons.find((entry, index) => personalLessonId(entry, index) === visible.baseId);
    const diff = baseline?.quelle ? linkedClassChange(app, baseline) : null;
    return <div key={visible.baseId + '-' + datum}
      className={`min-w-0 space-y-1 rounded-xl border p-2 text-left text-xs ${visible.cancelled
        ? 'border-slate-200 bg-slate-100 text-slate-500 opacity-75'
        : visible.exception ? 'border-amber-300 bg-amber-50 text-slate-800'
        : 'border-indigo-100 bg-indigo-50 text-slate-800'}`}>
      <button type="button" onClick={() => startEditing(lesson.tag, datum, lesson.stunde, visible)}
        className="block min-h-11 w-full text-left" aria-label={lesson.fach + ' bearbeiten'}>
        <strong className="block break-words text-sm">{lesson.fach || 'Eintrag'}</strong>
        <span className="block">{friendlyKind(lesson.kind)}{lesson.klasse ? ' · ' + lesson.klasse : ''}</span>
        {(view === 'zeiten' || lesson.stunde === 0) && <span className="block">{timeLabel(lesson)}</span>}
        {lesson.raum && <span className="block">{lesson.raum}</span>}
        {visible.exception && <span className="mt-1 block font-bold text-amber-800">
          {visible.cancelled ? 'Nur heute entfällt' : 'Nur an diesem Tag'}
        </span>}
      </button>
      {diff?.changed && <div className="rounded-lg border border-amber-300 bg-white p-2">
        <p className="font-bold text-amber-900">Klassenstundenplan hat sich geändert.</p>
        <p className="mt-1">Jetzt: {diff.missing ? 'Klasse nicht verfügbar' : (diff.currentFach || 'Stunde entfernt')}</p>
        {!diff.missing && <button type="button" onClick={() => acceptClassUpdate(baseline!, visible.baseId)}
          className="mt-2 min-h-9 rounded-lg border border-amber-400 px-2 font-bold">Änderung übernehmen</button>}
      </div>}
      {lesson.quelle && <div className="border-t border-current/10 pt-1">
        {classPlanningPreview(lesson, datum) && <p className="mb-1 line-clamp-2">Diese Woche: {classPlanningPreview(lesson, datum)}</p>}
        <button type="button" onClick={() => openClassPlanning(lesson)}
          className="inline-flex min-h-9 items-center gap-1 font-bold text-indigo-700">
          <Link2 size={13} /> Wochenplanung der Klasse öffnen <ArrowRight size={12} />
        </button>
      </div>}
      {visible.exception && visible.exception !== 'add' && <button type="button"
        onClick={() => restoreDate(visible.baseId, datum)}
        className="min-h-9 text-xs font-bold text-slate-600">Einmalige Änderung zurücknehmen</button>}
      {!visible.cancelled && <button type="button" onClick={() => cancelForDate(visible, datum)}
        className="min-h-9 text-xs font-bold text-rose-700">
        {visible.exception === 'add' ? 'Diesen Termin entfernen' : 'Nur diesen Tag entfallen lassen'}
      </button>}
    </div>;
  };
  return <section className="min-w-0 space-y-4" aria-label="Persönlicher Stundenplan">
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Mein Stundenplan · {year}</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">Alle deine Klassen, Unterrichtsstunden und Dienste an einem Ort.
          Unterrichtsinhalte bearbeitest du weiterhin ausschließlich in der Wochenplanung der jeweiligen Klasse.</p>
      </div>
      <button type="button" onClick={() => startEditing('Montag', dates[0].datum, 0, undefined, true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-text,var(--btn-text,#ffffff))]">
        <Plus size={16} /> Einmaligen Termin eintragen
      </button>
    </div>
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <label className="min-w-0 flex-1 text-sm font-bold">Unterricht aus einer Klasse übernehmen
        <select value={rooms.some(room => room.id === importClassId) ? importClassId : ''}
          onChange={event => setImportClassId(event.target.value)}
          aria-label="Klasse für Stundenplan-Übernahme"
          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
          <option value="">Klasse auswählen</option>
          {rooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
        </select>
      </label>
      <button type="button" disabled={!importClassId} onClick={importWeek}
        className="min-h-11 rounded-xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-bold text-indigo-800 disabled:opacity-40">
        Ganze freie Woche übernehmen
      </button>
      <p className="w-full text-xs text-slate-500">Nur freie Stunden werden übernommen; bereits eingetragene Stunden und deine Wochenplanung bleiben unangetastet.
        Einzelne Stunden kannst du anschließend bearbeiten oder entfernen.</p>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Vorige Woche" onClick={() => changeWeek(-1)}
          className="min-h-11 rounded-xl border border-slate-200 px-3"><ChevronLeft size={18} /></button>
        <button type="button" onClick={() => setWeekStart(personalWeekStart(new Date()))}
          className="min-h-11 rounded-xl bg-slate-100 px-3 text-sm font-bold">
          {isCurrentWeek ? 'Diese Woche' : 'Zur aktuellen Woche'}
        </button>
        <button type="button" aria-label="Nächste Woche" onClick={() => changeWeek(1)}
          className="min-h-11 rounded-xl border border-slate-200 px-3"><ChevronRight size={18} /></button>
        <span className="text-xs font-bold text-slate-600">
          {dates[0].datum.split('-').reverse().join('.')} – {dates[4].datum.split('-').reverse().join('.')}
        </span>
      </div>
      <div role="group" aria-label="Stundenplan-Ansicht" className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {([{ key: 'raster', label: 'Stundenraster' }, { key: 'zeiten', label: 'Uhrzeiten' }] as const)
          .map(option => <button key={option.key} type="button" aria-pressed={view === option.key}
            onClick={() => setView(option.key)}
            className={`min-h-10 rounded-lg px-3 text-sm font-bold ${view === option.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'}`}>
            {option.label}
          </button>)}
      </div>
    </div>
    {view === 'raster' ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[850px] table-fixed border-collapse text-left text-xs">
        <thead><tr><th scope="col" className="w-20 p-3">Std.</th>
          {dates.map(day => <th key={day.datum} scope="col" className="p-3">
            {day.tag}<span className="mt-1 block font-normal">{day.datum.split('-').slice(1).reverse().join('.')}</span>
          </th>)}
        </tr></thead>
        <tbody>{LESSON_SLOT_NUMBERS.map(stunde => <tr key={stunde} className="border-t border-slate-200">
          <th scope="row" className="p-2 align-top">{stunde}.<span className="mt-1 block whitespace-nowrap text-[0.625rem] font-normal text-slate-500">{STUNDEN_INFO[stunde] || ''}</span></th>
          {dates.map(day => {
            const current = personalLessonsForDate(lessons, exceptions, day.datum, day.tag)
              .filter(item => item.lesson.stunde === stunde);
            return <td key={day.datum} className="border-l border-slate-200 p-1 align-top">
              <div className="space-y-1">{current.map(item => lessonCard(item, day.datum))}</div>
              <button type="button" onClick={() => startEditing(day.tag, day.datum, stunde)}
                aria-label={day.tag + ', ' + stunde + '. Stunde eintragen'}
                className="mt-1 min-h-9 w-full rounded-lg border border-dashed border-slate-200 text-left text-[0.6875rem] font-bold text-slate-500 hover:border-indigo-400 hover:bg-indigo-50">
                ＋ Eintragen
              </button>
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div> : <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
      {dates.map(day => {
        const today = personalLessonsForDate(lessons, exceptions, day.datum, day.tag);
        return <section key={day.datum} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3">
          <h3 className="font-black">{day.tag} · {day.datum.split('-').slice(1).reverse().join('.')}</h3>
          <div className="mt-3 space-y-2">{today.map(item => lessonCard(item, day.datum))}</div>
          <button type="button" onClick={() => startEditing(day.tag, day.datum, 0)}
            className="mt-3 min-h-10 w-full rounded-xl border border-dashed border-slate-300 text-xs font-bold">
            + Termin hinzufügen
          </button>
        </section>;
      })}
    </div>}
    {view === 'raster' && dates.some(day => personalLessonsForDate(lessons, exceptions, day.datum, day.tag)
      .some(item => item.lesson.stunde === 0)) && <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-black">Weitere Termine ohne Unterrichtsstunde</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {dates.map(day => <div key={day.datum} className="min-w-0 space-y-2">
          <p className="text-xs font-bold">{day.tag}</p>
          {personalLessonsForDate(lessons, exceptions, day.datum, day.tag)
            .filter(item => item.lesson.stunde === 0).map(item => lessonCard(item, day.datum))}
        </div>)}
      </div>
    </section>}
    {editing && <section aria-label="Persönlichen Stundenplaneintrag bearbeiten"
      className="rounded-3xl border-2 border-indigo-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900">
            {editing.original ? 'Stundenplaneintrag bearbeiten' : 'Neuer Stundenplaneintrag'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {editing.onlyDate ? 'Nur ' + editing.datum + ' – regelmäßiger Plan bleibt erhalten.' :
              'Wiederkehrender Eintrag für das ganze Schuljahr.'}
          </p>
        </div>
        <button type="button" onClick={() => setEditing(null)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold">Schließen</button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm font-bold">Fach / Tätigkeit
          <input aria-label="Persönliches Fach oder Tätigkeit" type="text" maxLength={130}
            value={draft.fach} onChange={event => setDraft(prev => ({ ...prev, fach: event.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
        </label>
        <label className="text-sm font-bold">Art
          <select aria-label="Persönliche Terminart" value={draft.kind || 'unterricht'}
            onChange={event => setDraft(prev => ({ ...prev, kind: event.target.value as PersonalLessonKind }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2">
            {TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Klasse (optional)
          <input type="text" maxLength={90} aria-label="Persönliche Klasse" value={draft.klasse}
            onChange={event => setDraft(prev => ({ ...prev, klasse: event.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
        </label>
        <label className="text-sm font-bold">Raum / Ort
          <input type="text" maxLength={60} value={draft.raum}
            onChange={event => setDraft(prev => ({ ...prev, raum: event.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3" />
        </label>
        {editing.onlyDate ? (editing.original
          ? <p className="text-sm font-bold">Tag · {editing.datum}</p>
          : <label className="text-sm font-bold">Tag dieser Woche
              <select aria-label="Datum des einmaligen Termins" value={editing.datum}
                onChange={event => {
                  const day = dates.find(item => item.datum === event.target.value);
                  if (day) {
                    setEditing(prev => prev ? { ...prev, datum: day.datum, tag: day.tag } : prev);
                    setDraft(prev => ({ ...prev, tag: day.tag }));
                  }
                }}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2">
                {dates.map(day => <option key={day.datum} value={day.datum}>{day.tag} · {day.datum}</option>)}
              </select>
            </label>) :
          <label className="text-sm font-bold">Wochentag
            <select value={draft.tag} aria-label="Persönlicher Wochentag"
              onChange={event => setDraft(prev => ({ ...prev, tag: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2">
              {TAGE_NAMEN.map(tag => <option key={tag}>{tag}</option>)}
            </select>
          </label>}
        <label className="text-sm font-bold">Stunde (0 = freier Termin)
          <select aria-label="Persönliche Stunde" value={draft.stunde}
            onChange={event => {
              const stunde = Number(event.target.value);
              const [start, ende] = personalLessonTimes(stunde);
              setDraft(prev => ({ ...prev, stunde, start: start || prev.start, ende: ende || prev.ende }));
            }}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2">
            <option value={0}>Keine feste Stunde</option>
            {LESSON_SLOT_NUMBERS.map(stunde => <option key={stunde} value={stunde}>{stunde}. Stunde</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Beginn
          <input type="time" aria-label="Persönlicher Terminbeginn" value={draft.start || ''}
            onChange={event => setDraft(prev => ({ ...prev, start: event.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2" />
        </label>
        <label className="text-sm font-bold">Ende
          <input type="time" aria-label="Persönliches Terminende" value={draft.ende || ''}
            onChange={event => setDraft(prev => ({ ...prev, ende: event.target.value }))}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-2" />
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {editing.original && <div role="group" aria-label="Gültigkeit der Änderung"
          className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!editing.onlyDate}
            onClick={() => setEditing(prev => prev && ({ ...prev, onlyDate: false }))}
            className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${!editing.onlyDate ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
            Jede Woche
          </button>
          <button type="button" aria-pressed={editing.onlyDate}
            onClick={() => setEditing(prev => prev && ({ ...prev, onlyDate: true }))}
            className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${editing.onlyDate ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200'}`}>
            Nur dieser Tag
          </button>
        </div>}
        <button type="button" onClick={save}
          className="min-h-11 rounded-xl bg-[var(--accent)] px-5 text-sm font-bold text-[var(--accent-text,var(--btn-text,#ffffff))]">Speichern</button>
        {editing.original && !editing.onlyDate && <button type="button" onClick={removeRegular}
          className="min-h-11 rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-700">Regelmäßigen Eintrag entfernen</button>}
      </div>
      <p className="mt-3 text-xs text-slate-500">Eine Änderung des verknüpften Klassenstundenplans wird stets separat bestätigt.
        Inhalte der Wochenplanung werden niemals durch deinen persönlichen Stundenplan überschrieben.</p>
    </section>}
  </section>;
}
