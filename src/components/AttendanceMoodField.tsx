import React from 'react';
import { useApp } from '../context/AppContext';
import { getStudentMood, teacherSetStudentMood } from '../lib/kidAttendanceAlgorithm';
import { KID_MOOD_SCALE } from '../lib/moodTypes';

export default function AttendanceMoodField({ studentId, name, date }: { studentId: string; name: string; date: string }) {
  const { app, setApp } = useApp();
  const classId = app.activeClassId;
  const value = getStudentMood(studentId, app, date);
  return <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-500">
    Befinden
    <select aria-label={`Befinden für ${name}`} title="Freiwillige Angabe – derselbe Tageswert wie in Ich bin da"
      value={value ?? ''} className="min-h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
      onChange={event => {
        const mood = event.target.value === '' ? null : Number(event.target.value);
        setApp(previous => previous.activeClassId === classId && previous.schueler.some(student => student.id === studentId)
          ? teacherSetStudentMood(previous, studentId, mood, date) : previous);
      }}>
      <option value="">Keine Angabe</option>
      {KID_MOOD_SCALE.map(mood => <option key={mood.value} value={mood.value}>{mood.emoji} {mood.label}</option>)}
    </select>
  </label>;
}
