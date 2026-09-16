import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Printer, AlertCircle, Users, Clock, CheckCircle2,
  BookOpen, Coffee, ShieldAlert, Download
} from 'lucide-react';
import { formatLocalDateKey, getKW } from '../lib/utils';

const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

export default function SubstitutionPlan() {
  const { app } = useApp();
  const [date, setDate] = useState(() => formatLocalDateKey(new Date()));
  const [topic, setTopic] = useState('');
  const [remarks, setRemarks] = useState('');
  const [importantInfo, setImportantInfo] = useState('');

  const selectedDate = useMemo(() => {
    const parsed = new Date(`${date}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }, [date]);

  const selectedDayName = DAY_NAMES[selectedDate.getDay()];
  const selectedKW = getKW(selectedDate);

  const plannedLessons = useMemo(() => {
    const dayPlan = app.wochenplanung?.[selectedKW]?.[selectedDayName];
    if (!dayPlan) return [];

    return Object.values(dayPlan)
      .filter(Boolean)
      .map((lesson: any, index) => ({
        index: index + 1,
        fach: String(lesson?.fach || '').trim(),
        thema: String(lesson?.thema || lesson?.inhalt || '').trim(),
        material: String(lesson?.material || '').trim(),
        housework: String(lesson?.housework || lesson?.hausuebung || '').trim(),
      }))
      .filter(lesson => lesson.fach || lesson.thema || lesson.material || lesson.housework);
  }, [app.wochenplanung, selectedKW, selectedDayName]);

  const handleLoadFromWeeklyPlan = () => {
    if (plannedLessons.length === 0) return;

    const subjects = Array.from(new Set(plannedLessons.map(l => l.fach).filter(Boolean)));
    setTopic(subjects.join(' / '));

    const lines = plannedLessons.map((lesson, idx) => {
      const label = lesson.fach || `${idx + 1}. Stunde`;
      const parts = [
        lesson.thema,
        lesson.material ? `Material: ${lesson.material}` : '',
        lesson.housework ? `HÜ: ${lesson.housework}` : '',
      ].filter(Boolean);
      return `${idx + 1}. ${label}: ${parts.join(' · ') || 'laut Wochenplan'}`;
    });
    setRemarks(lines.join('\n'));
  };

  const handlePrint = () => {
    window.print();
  };

  const displayDate = selectedDate.toLocaleDateString('de-AT');

  return (
    <div className="py-4 space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end no-print">
        <div className="space-y-1">
          <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Vertretungsplan</h2>
          <p className="text-slate-500 font-medium tracking-tight">
            Bereite die wichtigsten Informationen für eine Vertretungslehrkraft übersichtlich vor.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="btn btn-primary h-14 px-8 rounded-2xl flex items-center gap-3 shadow-xl shadow-slate-900/10"
        >
          <Printer size={20} />
          Plan drucken
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start no-print">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl shadow-slate-900/5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Tag / Datum</label>
                <input
                  type="date"
                  className="input-field h-14"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
                <p className="text-[0.6875rem] font-bold text-slate-400 px-1">{selectedDayName} · KW {selectedKW}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Unterricht / Schwerpunkt</label>
                <input
                  type="text"
                  className="input-field h-14"
                  placeholder="z. B. Deutsch / Projektarbeit"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[0.75rem] leading-tight font-black text-slate-700">
                  {plannedLessons.length > 0
                    ? `${plannedLessons.length} geplante Einheiten für ${selectedDayName} gefunden`
                    : `Keine geplanten Einheiten für ${selectedDayName} gefunden`}
                </p>
                <p className="text-[0.6875rem] text-slate-500 mt-1">Übernimmt nur Fach, Thema, Material und Hausübung aus der Wochenplanung.</p>
              </div>
              <button
                type="button"
                disabled={plannedLessons.length === 0}
                onClick={handleLoadFromWeeklyPlan}
                className="btn bg-white text-slate-700 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Download size={16} />
                Aus Wochenplan übernehmen
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Lerninhalte & Ablauf</label>
              <textarea
                className="input-field h-48 py-4 resize-none"
                placeholder="Was sollen die Kinder erarbeiten? Wo finden sie die Materialien?"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Wichtige Hinweise</label>
              <textarea
                className="input-field h-32 py-4 resize-none text-rose-600 font-bold"
                placeholder="Nur tatsächlich relevante Hinweise eintragen, z. B. Abholung, medizinische Besonderheiten oder organisatorische Absprachen."
                value={importantInfo}
                onChange={e => setImportantInfo(e.target.value)}
              />
              <p className="text-[0.6875rem] text-slate-400 px-1">Es werden bewusst keine Beispiel- oder Gesundheitsdaten vorausgefüllt.</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-amber-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-600/20">
            <h3 className="text-[1.25rem] leading-normal font-black mb-4 flex items-center gap-3">
              <ShieldAlert size={24} />
              Checkliste
            </h3>
            <ul className="space-y-4 text-[0.8125rem] font-medium opacity-90">
              <li className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>Sitzplan bei Bedarf bereitstellen.</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>Materialien und Arbeitsaufträge bereitlegen.</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>Aufsichten und organisatorische Besonderheiten ergänzen.</span></li>
              <li className="flex items-start gap-3"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>Nur notwendige personenbezogene Hinweise weitergeben.</span></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="hidden print:block bg-white text-slate-950 font-sans p-0">
        <div className="border-b-4 border-slate-950 pb-8 mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter">Vertretungsplan</h1>
            <p className="text-[1.25rem] leading-normal font-bold mt-2">
              {app.klassenbezeichnung ? `Klasse ${app.klassenbezeichnung}` : `${app.stufe}. Klasse`}
              {app.schulName ? ` — ${app.schulName}` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Datum:</p>
            <p className="text-[1.5rem] leading-normal font-black">{displayDate}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-10 mb-12">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <Users size={18} />
              <span className="text-[0.625rem] font-black uppercase tracking-widest">Schüleranzahl</span>
            </div>
            <p className="text-[1.875rem] leading-tight font-black">{app.schueler.length}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-3 text-slate-400">
              <Clock size={18} />
              <span className="text-[0.625rem] font-black uppercase tracking-widest">Planung</span>
            </div>
            <p className="text-[1.25rem] leading-normal font-black">{plannedLessons.length > 0 ? `${plannedLessons.length} Einheiten` : 'Manuell'}</p>
          </div>
          <div className="bg-rose-50 p-6 rounded-3xl border border-rose-200">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <AlertCircle size={18} />
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-rose-600">Hinweise</span>
            </div>
            <p className="text-[1.125rem] leading-normal font-bold text-rose-700">{importantInfo.trim() ? 'Siehe unten' : 'Keine'}</p>
          </div>
        </div>

        <div className="space-y-12">
          <section className="space-y-4">
            <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-wider flex items-center gap-4">
              <div className="w-2 h-6 bg-slate-950" />
              Unterrichtsinhalt: {topic || 'nicht angegeben'}
            </h3>
            <div className="p-8 bg-white border-2 border-slate-100 rounded-[3rem] text-[1.25rem] leading-normal leading-relaxed whitespace-pre-wrap">
              {remarks || 'Keine zusätzlichen Anweisungen eingetragen.'}
            </div>
          </section>

          {importantInfo.trim() && (
            <section className="space-y-4">
              <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-wider flex items-center gap-4 text-rose-600">
                <div className="w-2 h-6 bg-rose-600" />
                Wichtige Besonderheiten
              </h3>
              <div className="p-8 bg-rose-50 border-2 border-rose-200 rounded-[3rem] text-[1.25rem] leading-normal font-bold text-rose-900 leading-relaxed whitespace-pre-wrap">
                {importantInfo}
              </div>
            </section>
          )}

          <div className="grid grid-cols-2 gap-10">
            <section className="space-y-4">
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
                <Coffee size={16} /> Organisation
              </h3>
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                <p className="font-bold">Aufsichten, Räume und weitere Absprachen bitte oben ergänzen.</p>
              </div>
            </section>
            <section className="space-y-4">
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest flex items-center gap-3 text-slate-400">
                <BookOpen size={16} /> Materialien
              </h3>
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
                <p className="font-bold">
                  {plannedLessons.map(l => l.material).filter(Boolean).join(' · ') || 'Keine Materialien aus der Wochenplanung übernommen.'}
                </p>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-20 pt-10 border-t border-slate-100 text-center">
          <p className="text-slate-300 font-bold uppercase tracking-[0.3em] text-[0.625rem]">Erstellt mit Klassio</p>
        </div>
      </div>
    </div>
  );
}
