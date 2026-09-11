import React, { useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, Eye, EyeOff, Play, Users } from 'lucide-react';
import type { DashboardTodayOverviewProps } from './DashboardTodayOverview';

export default function DashboardSimpleOverview(p: DashboardTodayOverviewProps) {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const button = 'min-h-11 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600';
  const tasks = showAllTasks ? p.actionItems : p.actionItems.slice(0, 3);
  return <section aria-label="Mein Schultag" className="space-y-5 text-slate-900">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-medium text-slate-600">{p.klasseLabel || 'Deine Klasse'}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">Mein Schultag</h1>
          <p className="mt-2 text-sm text-slate-600">Unterricht vorbereiten, Anwesenheit prüfen und Wichtiges im Blick behalten.</p>
        </div>
        <button className={button + ' flex items-center gap-2'} aria-pressed={p.privacyMode} onClick={() => p.onPrivacyModeChange(!p.privacyMode)}>
          {p.privacyMode ? <EyeOff size={18} /> : <Eye size={18} />}{p.privacyMode ? 'Private Angaben verborgen' : 'Private Angaben verbergen'}
        </button>
      </div>
      <button onClick={() => p.onNavigate('cockpit')} className="mt-6 min-h-14 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-base font-semibold flex items-center justify-center gap-3 w-full sm:w-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        <Play size={20} />Unterricht starten<ArrowRight size={18} />
      </button>
    </header>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarDays size={20} className="text-indigo-600" />Dein Unterricht</h2>
        <p className="text-sm text-slate-600">{p.dateLabel}</p>
        {p.todayLessonsList.length ? <ol className="space-y-2">{p.todayLessonsList.map((lesson, index) => <li key={`${lesson.id ?? index}-${index}`} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
          <p className="text-xs text-slate-600">{lesson.zeit || `${lesson.hourNum ?? index + 1}. Stunde`}</p>
          <p className="mt-1 text-sm font-semibold">{lesson.fach || 'Unterricht'}</p>
          {lesson.thema && <p className="mt-1 text-sm text-slate-600 break-words">{p.privacyMode ? 'Thema verborgen' : lesson.thema}</p>}
        </li>)}</ol> : <p className="text-sm text-slate-600 py-3">Für diesen Tag ist noch kein Unterricht eingetragen.</p>}
        <button className={button + ' w-full'} onClick={() => p.onNavigate('wochenplanung')}>Wochenplan öffnen</button>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users size={20} className="text-sky-600" />Anwesenheit heute</h2>
        <p className="text-3xl font-semibold">{p.totalStudents}<span className="ml-2 text-base font-normal text-slate-600">Kinder</span></p>
        <p className="text-sm text-slate-700">{p.totalStudents === 0 ? 'Lege zuerst deine Klassenliste an.' : p.attendanceRecorded ? `${p.absentCount} als abwesend eingetragen` : 'Erfassung noch offen – bitte Anwesenheit prüfen.'}</p>
        <button className={button + ' w-full'} onClick={() => p.onNavigate(p.totalStudents ? 'anwesenheit' : 'schueler')}>{p.totalStudents ? 'Anwesenheit prüfen' : 'Kinder hinzufügen'}</button>
        <p className="text-xs leading-relaxed text-slate-500">Die Übersicht ersetzt keine Anwesenheitskontrolle.</p>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><ClipboardList size={20} className="text-amber-600" />Wichtig & offen</h2>
        <p className="text-sm text-slate-600">{p.openTasksCount} offene Aufgaben · {p.openCollectionsCount} offene Sammlungen</p>
        {tasks.length ? <ul className="space-y-2">{tasks.map(item => <li key={item.id}><button className="w-full min-h-12 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 text-left text-sm leading-relaxed focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600" onClick={() => p.onNavigate(item.linkPage || 'orga')}>
          {item.urgent && <span className="block text-xs font-semibold text-amber-800 mb-1">Heute beachten</span>}{p.privacyMode ? 'Privater Eintrag – zum Öffnen auswählen' : item.text}
        </button></li>)}</ul> : <p className="text-sm text-slate-600 py-3">Keine zusätzlichen Hinweise für heute.</p>}
        {p.actionItems.length > 3 && <button className={button + ' w-full'} aria-expanded={showAllTasks} onClick={() => setShowAllTasks(value => !value)}>{showAllTasks ? 'Weniger Hinweise' : `Alle ${p.actionItems.length} Hinweise`}</button>}
        <button className={button + ' w-full'} onClick={() => p.onNavigate('orga')}>Organisation öffnen</button>
      </section>
    </div>
    <footer className="flex flex-wrap gap-3 items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <button className={button} onClick={p.onOpenBackup}>Verschlüsseltes Backup herunterladen</button>
      <button className={button} onClick={p.onSimpleModeToggle}>Weitere Übersichten & Widgets</button>
    </footer>
  </section>;
}
