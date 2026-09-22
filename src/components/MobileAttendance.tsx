import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTodayName } from '../lib/utils';
import { getAttendanceDayStats, getLocalAttendanceDateKey, markAttendancePresent } from '../lib/attendanceData';

type DayStatus = 'a' | 'e' | 'u';

const choices: { value: DayStatus; label: string }[] = [
  { value: 'a', label: 'Da' },
  { value: 'e', label: 'Entschuldigt' },
  { value: 'u', label: 'Unentschuldigt' },
];

/** Deliberate whole-day attendance shortcuts using the SAME attendance store as desktop. */
export default function MobileAttendance() {
  const { app, setApp } = useApp();
  const [pending, setPending] = useState<{ id: string; status: DayStatus } | null>(null);
  const dayName = getTodayName(new Date());
  const dateKey = getLocalAttendanceDateKey();
  // Cancel unfinished whole-day edits when another device changes class or day.
  useEffect(() => setPending(null), [app.activeClassId, dateKey]);
  const activeHours = (dayName ? app.tageplan?.[dayName]?.stunden : []) || [];
  const students = useMemo(
    () => [...(app.schueler || [])].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de-AT')),
    [app.schueler],
  );
  const stats = getAttendanceDayStats(
    students, app.anwesenheit, app.anwesenheitDetail,
    dateKey, activeHours,
  );

  const statusFor = (studentId: string): string => {
    const day = app.anwesenheit?.[studentId]?.[dateKey] || {};
    const statuses = activeHours.map(hour => day[hour]);
    if (!statuses.length || statuses.some(status => !status)) return 'Offen';
    if (statuses.every(status => status === 'a')) return 'Da';
    if (statuses.every(status => status === 'e')) return 'Entschuldigt';
    if (statuses.every(status => status === 'u')) return 'Unentschuldigt';
    return 'Teilweise abwesend';
  };

  const saveDay = (studentId: string, status: DayStatus) => {
    if (activeHours.length === 0) return;
    setApp(prev => {
      const perStudent = prev.anwesenheit?.[studentId] || {};
      const detailMap = prev.anwesenheitDetail || {};
      const studentDetail = detailMap[studentId] || {};
      const originalDay = perStudent[dateKey] || {};
      const originalDetail = studentDetail[dateKey] || {};
      const updated = status === 'a'
        ? markAttendancePresent(originalDay, originalDetail, activeHours)
        : {
            day: {
              ...originalDay,
              ...Object.fromEntries(activeHours.map(hour => [hour, status])),
            },
            detail: {
              ...originalDetail,
              fehlstunden: activeHours.length,
            },
          };
      if (status === 'e' && updated.detail.notiz === 'Unentschuldigt') {
        delete updated.detail.notiz;
      }
      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [studentId]: { ...perStudent, [dateKey]: updated.day },
        },
        anwesenheitDetail: {
          ...detailMap,
          [studentId]: { ...studentDetail, [dateKey]: updated.detail },
        },
      };
    });
    setPending(null);
  };

  return (
    <div className="space-y-4 pb-5" data-testid="klassio-mobile-attendance">
      <section className="rounded-3xl border border-violet-100 bg-white p-4 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-semibold text-violet-700">
          <ClipboardCheck size={18} />
          {new Date().toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h2 className="mt-2 text-xl font-extrabold text-slate-800">Wer ist heute da?</h2>
        <p className="mt-1 text-sm text-slate-600">
          {stats.present} anwesend · {stats.absent} abwesend · {stats.untracked} offen
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Hier erfasst du den ganzen Tag. Einzelne Fehlstunden und Gründe bearbeitest du in der ausführlichen PC-Ansicht.
        </p>
      </section>
      {activeHours.length === 0 && (
        <p role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Für heute sind keine Unterrichtsstunden eingerichtet. Die Anwesenheit kann hier erst nach einem eingerichteten Stundenplan erfasst werden.
        </p>
      )}
      <section aria-label="Anwesenheit der Kinder" className="space-y-2">
        {students.map(student => {
          const current = statusFor(student.id);
          const editing = pending?.id === student.id;
          return (
            <article key={student.id} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 break-words text-base font-extrabold text-slate-800">{student.vorname} {student.nachname}</p>
                <span className="shrink-0 rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">{current}</span>
              </div>
              {!editing ? (
                <button type="button" disabled={!activeHours.length}
                  onClick={() => setPending({ id: student.id, status: 'a' })}
                  className="mt-3 min-h-11 w-full rounded-xl bg-violet-50 px-4 text-sm font-bold text-violet-700 disabled:opacity-40">
                  Ganzen Tag eintragen / ändern
                </button>
              ) : (
                <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-700">Status für alle heutigen Stunden:</p>
                  <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Anwesenheitsstatus wählen">
                    {choices.map(choice => (
                      <button key={choice.value} type="button"
                        aria-pressed={pending.status === choice.value}
                        onClick={() => setPending({ id: student.id, status: choice.value })}
                        className={`min-h-12 rounded-lg px-1 text-[11px] font-extrabold ${pending.status === choice.value
                          ? 'bg-violet-700 text-white'
                          : 'border border-violet-100 bg-white text-slate-700'}`}>
                        {choice.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setPending(null)}
                      className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-600">Abbrechen</button>
                    <button type="button" onClick={() => saveDay(student.id, pending.status)}
                      className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-xl bg-violet-700 text-sm font-bold text-white">
                      <CheckCircle2 size={17} /> Speichern
                    </button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
        {!students.length && <p className="rounded-2xl bg-white p-4 text-sm text-slate-500">In dieser Klasse sind noch keine Kinder eingetragen.</p>}
      </section>
    </div>
  );
}
