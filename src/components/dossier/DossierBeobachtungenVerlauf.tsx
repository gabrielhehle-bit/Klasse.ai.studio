import React, { useState, useMemo } from 'react';
import { Student, AppNote } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Activity,
  Calendar,
  Users,
  Plus,
  Trash2,
  Filter,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Smile,
  Zap,
  Info
} from 'lucide-react';
import { formatGermanDate } from '../../lib/diagnosticCoreUtils';
import DossierKELReflexion from './DossierKELReflexion';

interface DossierBeobachtungenVerlaufProps {
  student: Student;
  initialSubSection?: 'beobachtungen' | 'verhalten' | 'anwesenheit' | 'kel';
}

type SubSection = 'beobachtungen' | 'verhalten' | 'anwesenheit' | 'kel';

export const DossierBeobachtungenVerlauf: React.FC<DossierBeobachtungenVerlaufProps> = ({
  student,
  initialSubSection = 'beobachtungen'
}) => {
  const { app, setApp } = useApp();
  const [activeSubSection, setActiveSubSection] = useState<SubSection>(initialSubSection);

  // ----------------------------------------------------
  // 1. Pädagogische Beobachtungen (Notes / Journal)
  // ----------------------------------------------------
  const studentNotes = useMemo(() => {
    return (app.notes || [])
      .filter((n: any) => n.schuelerId === student.id)
      .sort((a: any, b: any) => (b.datum || '').localeCompare(a.datum || ''));
  }, [app.notes, student.id]);

  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('alle');
  const [noteSearch, setNoteSearch] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<AppNote['kategorie']>('Notiz');
  const [newNoteSubject, setNewNoteSubject] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNoteType, setNewNoteType] = useState<'neutral' | 'positiv' | 'beobachten'>('neutral');

  const filteredNotes = useMemo(() => {
    return studentNotes.filter((n: any) => {
      const matchesCategory = noteCategoryFilter === 'alle' || n.kategorie === noteCategoryFilter;
      const matchesSearch = !noteSearch.trim() || 
        (n.inhalt && n.inhalt.toLowerCase().includes(noteSearch.toLowerCase())) ||
        (n.fach && n.fach.toLowerCase().includes(noteSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [studentNotes, noteCategoryFilter, noteSearch]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const freshNote: AppNote = {
      id: `note-${Date.now()}`,
      schuelerId: student.id,
      datum: newNoteDate,
      kategorie: newNoteCategory,
      inhalt: newNoteSubject.trim() ? `[${newNoteSubject.trim()}] ${newNoteText.trim()}` : newNoteText.trim()
    };

    setApp(prev => ({
      ...prev,
      notes: [freshNote, ...(prev.notes || [])]
    }));

    setNewNoteText('');
    setNewNoteSubject('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Möchten Sie diese Beobachtung wirklich entfernen?')) {
      setApp(prev => ({
        ...prev,
        notes: (prev.notes || []).filter((n: any) => n.id !== noteId)
      }));
    }
  };

  // ----------------------------------------------------
  // 2. Verhalten & Pädagogische Begleitung
  // ----------------------------------------------------
  const stages = app.behavior_stages || [];
  const studentLogs = useMemo(() => {
    return (app.statusLog || [])
      .filter((l: any) => l.schuelerId === student.id)
      .sort((a: any, b: any) => (b.datum || '').localeCompare(a.datum || ''));
  }, [app.statusLog, student.id]);

  const behaviorSummary = useMemo(() => {
    let positiveCount = 0;
    let guidanceCount = 0;

    studentLogs.forEach((l: any) => {
      const stage = stages.find((s: any) => s.id === l.iconId);
      if (stage) {
        const isPos = stage.color?.includes('green') || stage.color?.includes('emerald') || stage.label?.includes('Super') || stage.label?.includes('Gut');
        const isNeg = stage.color?.includes('amber') || stage.color?.includes('red') || stage.label?.includes('Ermahnung');
        if (isPos) {
          positiveCount++;
        } else if (isNeg) {
          guidanceCount++;
        } else {
          positiveCount++;
        }
      } else {
        positiveCount++;
      }
    });

    return { positiveCount, guidanceCount, total: studentLogs.length };
  }, [studentLogs, stages]);

  // ----------------------------------------------------
  // 3. Anwesenheit (Kompakt)
  // ----------------------------------------------------
  const [showAttendanceDetail, setShowAttendanceDetail] = useState(false);

  const attendanceSummary = useMemo(() => {
    const data = app?.anwesenheit?.[student.id] || {};
    let totalPresent = 0;
    let totalExcused = 0;
    let totalUnexcused = 0;
    let totalRecorded = 0;

    const dayEntries: { date: string; status: string; note?: string }[] = [];

    Object.entries(data).forEach(([date, dayData]: [string, any]) => {
      let dayStatus = 'da';
      if (typeof dayData === 'string') {
        dayStatus = dayData;
      } else if (typeof dayData === 'object' && dayData !== null) {
        // Hour by hour, resolve dominant status
        const statuses = Object.values(dayData);
        if (statuses.includes('u')) dayStatus = 'u';
        else if (statuses.includes('e') || statuses.includes('k')) dayStatus = 'e';
        else if (statuses.includes('da')) dayStatus = 'da';
      }

      totalRecorded++;
      if (dayStatus === 'da' || dayStatus === 'v') {
        totalPresent++;
      } else if (dayStatus === 'e' || dayStatus === 'k') {
        totalExcused++;
      } else if (dayStatus === 'u') {
        totalUnexcused++;
      }

      const detail = app?.anwesenheitDetail?.[student.id]?.[date];
      dayEntries.push({
        date,
        status: dayStatus,
        note: detail?.notiz || (dayStatus === 'e' ? 'Entschuldigt' : dayStatus === 'u' ? 'Unentschuldigt' : 'Anwesend')
      });
    });

    const rate = totalRecorded > 0 ? Math.round((totalPresent / totalRecorded) * 100) : 100;

    return {
      rate,
      totalPresent,
      totalExcused,
      totalUnexcused,
      totalRecorded,
      dayEntries: dayEntries.sort((a, b) => b.date.localeCompare(a.date))
    };
  }, [app.anwesenheit, app.anwesenheitDetail, student.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100/90 border border-slate-200/90 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubSection('beobachtungen')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubSection === 'beobachtungen'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText size={14} className={activeSubSection === 'beobachtungen' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Pädagogische Notizen</span>
            {studentNotes.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                {studentNotes.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('verhalten')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubSection === 'verhalten'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Activity size={14} className={activeSubSection === 'verhalten' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Verhalten & Entwicklung</span>
            {studentLogs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold">
                {studentLogs.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('anwesenheit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubSection === 'anwesenheit'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Calendar size={14} className={activeSubSection === 'anwesenheit' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Anwesenheit ({attendanceSummary.rate}%)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubSection('kel')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeSubSection === 'kel'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users size={14} className={activeSubSection === 'kel' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>KEL & Selbstreflexion</span>
          </button>
        </div>

        {activeSubSection === 'beobachtungen' && (
          <button
            type="button"
            onClick={() => setIsAddingNote(true)}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <Plus size={13} />
            <span>Beobachtung notieren</span>
          </button>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* SECTION 1: Pädagogische Beobachtungen */}
      {/* ---------------------------------------------------- */}
      {activeSubSection === 'beobachtungen' && (
        <div className="space-y-4">
          {/* Add Note Inline Form */}
          {isAddingNote && (
            <div className="p-4 sm:p-5 bg-white border-2 border-indigo-200 rounded-2xl shadow-md space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Neue pädagogische Beobachtung erfassen
                </h4>
                <button
                  type="button"
                  onClick={() => setIsAddingNote(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <form onSubmit={handleAddNote} className="space-y-3">
                <div>
                  <textarea
                    required
                    rows={3}
                    value={newNoteText}
                    onChange={e => setNewNoteText(e.target.value)}
                    placeholder="Konkrete, wertfreie Unterrichtsbeobachtung eingeben (z. B. Zeigte hohe Ausdauer beim Lösen von Sachaufgaben; benötigt Struktur bei offenen Phasen)..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Kategorie</label>
                    <select
                      value={newNoteCategory}
                      onChange={e => setNewNoteCategory(e.target.value as AppNote['kategorie'])}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="Notiz">Beobachtung / Notiz</option>
                      <option value="Verhalten">Verhalten</option>
                      <option value="Erfolg">Erfolg / Ressource</option>
                      <option value="Eltern">Elterngespräch / Kontakt</option>
                      <option value="Journal">Journal / Reflexion</option>
                      <option value="allgemein">Allgemein</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Fach / Kontext</label>
                    <input
                      type="text"
                      value={newNoteSubject}
                      onChange={e => setNewNoteSubject(e.target.value)}
                      placeholder="z. B. Mathematik, Deutsch, Pause..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Datum</label>
                    <input
                      type="date"
                      value={newNoteDate}
                      onChange={e => setNewNoteDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">Päd. Einordnung</label>
                    <select
                      value={newNoteType}
                      onChange={e => setNewNoteType(e.target.value as any)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      <option value="neutral">Neutral / Beobachtung</option>
                      <option value="positiv">Stärke / Positiv</option>
                      <option value="beobachten">Weiter beobachten</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer"
                  >
                    Beobachtung speichern
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-3xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                value={noteSearch}
                onChange={e => setNoteSearch(e.target.value)}
                placeholder="In Beobachtungen suchen..."
                className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500">Kategorie:</span>
              <select
                value={noteCategoryFilter}
                onChange={e => setNoteCategoryFilter(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-700"
              >
                <option value="alle">Alle Kategorien</option>
                <option value="Lernbeobachtung">Lernbeobachtung</option>
                <option value="Arbeitsverhalten">Arbeitsverhalten</option>
                <option value="Sozialverhalten">Sozialverhalten</option>
                <option value="Gesprächsnotiz">Gesprächsnotiz</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
          </div>

          {/* Notes Timeline List */}
          <div className="space-y-3">
            {filteredNotes.length > 0 ? (
              filteredNotes.map((note: any) => (
                <div
                  key={note.id}
                  className={`p-4 bg-white rounded-2xl border shadow-3xs space-y-2 text-left transition-all ${
                    note.art === 'positiv'
                      ? 'border-emerald-200/80 bg-emerald-50/20'
                      : note.art === 'beobachten'
                      ? 'border-amber-200/80 bg-amber-50/20'
                      : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-slate-900">
                        {formatGermanDate(note.datum)}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {note.kategorie || 'Notiz'}
                      </span>
                      {note.fach && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200/60">
                          {note.fach}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {note.art === 'positiv' && (
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Stärke / Ressource</span>
                        </span>
                      )}
                      {note.art === 'beobachten' && (
                        <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                          <AlertCircle size={12} />
                          <span>Weiter beobachten</span>
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Eintrag löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {note.inhalt}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
                <FileText size={24} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">
                  Keine Beobachtungen für {student.vorname} gefunden
                </p>
                <p className="text-[11px] text-slate-400">
                  Halten Sie spontane Unterrichts- und Verhaltensbeobachtungen direkt fest.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION 2: Verhalten & Pädagogische Begleitung */}
      {/* ---------------------------------------------------- */}
      {activeSubSection === 'verhalten' && (
        <div className="space-y-4">
          {/* Constructive overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erfasste Momente</span>
              <div className="text-xl font-black text-slate-900">{behaviorSummary.total}</div>
              <p className="text-[11px] text-slate-500">Dokumentierte Verhaltensbeobachtungen</p>
            </div>

            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Positive Bestärkungen</span>
              <div className="text-xl font-black text-emerald-800">{behaviorSummary.positiveCount}</div>
              <p className="text-[11px] text-emerald-700">Erfolge, Engagement & Hilfsbereitschaft</p>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Pädagogische Impulse</span>
              <div className="text-xl font-black text-amber-800">{behaviorSummary.guidanceCount}</div>
              <p className="text-[11px] text-amber-700">Begleitete Entwicklungssituationen</p>
            </div>
          </div>

          {/* Behavior Log Chronological List */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Verhaltensverlauf & Feedback
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">
                Chronologisch geordnet
              </span>
            </div>

            {studentLogs.length > 0 ? (
              <div className="space-y-2">
                {studentLogs.map((log: any, idx: number) => {
                  const stage = stages.find((s: any) => s.id === log.iconId);
                  const isPositive = (stage?.color?.includes('green') || stage?.color?.includes('emerald') || stage?.label?.includes('Super') || stage?.label?.includes('Gut')) ?? true;

                  return (
                    <div
                      key={log.id || idx}
                      className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl flex items-center justify-between gap-3 text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                          isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {stage?.icon || (isPositive ? '🌟' : '⚠️')}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900">
                            {stage?.label || 'Verhaltensrückmeldung'}
                          </div>
                          {log.bemerkung && (
                            <p className="text-[11px] text-slate-600 truncate mt-0.5">
                              {log.bemerkung}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-slate-500">
                          {formatGermanDate(log.datum)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-xs font-bold text-slate-500">
                  Bisher keine spezifischen Verhaltensprotokolle für {student.vorname}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION 3: Anwesenheit (Kompakt) */}
      {/* ---------------------------------------------------- */}
      {activeSubSection === 'anwesenheit' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Anwesenheitsquote</span>
              <div className="text-2xl font-black text-indigo-700">{attendanceSummary.rate}%</div>
              <p className="text-[11px] text-slate-500">{attendanceSummary.totalPresent} Tage anwesend</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Erfasste Tage</span>
              <div className="text-2xl font-black text-slate-900">{attendanceSummary.totalRecorded}</div>
              <p className="text-[11px] text-slate-500">Gesamte Schultage</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Entschuldigt</span>
              <div className="text-2xl font-black text-emerald-800">{attendanceSummary.totalExcused}</div>
              <p className="text-[11px] text-slate-500">Krankheit / Meldung</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Unentschuldigt</span>
              <div className="text-2xl font-black text-rose-800">{attendanceSummary.totalUnexcused}</div>
              <p className="text-[11px] text-slate-500">Offene Klärungen</p>
            </div>
          </div>

          {/* Collapsible detail records */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
            <button
              type="button"
              onClick={() => setShowAttendanceDetail(!showAttendanceDetail)}
              className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Detailliertes Anwesenheitsprotokoll
                </h4>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
                <span>{showAttendanceDetail ? 'Einklappen' : 'Tagesübersicht einblenden'}</span>
                {showAttendanceDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showAttendanceDetail && (
              <div className="pt-3 border-t border-slate-100 space-y-2 max-h-80 overflow-y-auto pr-1">
                {attendanceSummary.dayEntries.length > 0 ? (
                  attendanceSummary.dayEntries.map((entry, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{formatGermanDate(entry.date)}</span>
                        <span className="text-slate-500 text-[11px]">{entry.note}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        entry.status === 'da' || entry.status === 'v'
                          ? 'bg-emerald-50 text-emerald-700'
                          : entry.status === 'e' || entry.status === 'k'
                          ? 'bg-sky-50 text-sky-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {entry.status === 'da' ? 'Anwesend' : entry.status === 'e' || entry.status === 'k' ? 'Entschuldigt' : entry.status === 'v' ? 'Verspätet' : 'Unentschuldigt'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Keine Tagesprotokolle vorhanden.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* SECTION 4: KEL & Selbstreflexion */}
      {/* ---------------------------------------------------- */}
      {activeSubSection === 'kel' && (
        <div className="space-y-4">
          <DossierKELReflexion student={student} />
        </div>
      )}
    </div>
  );
};
