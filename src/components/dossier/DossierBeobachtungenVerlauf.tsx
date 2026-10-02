import React, { useState, useMemo } from 'react';
import { Student, AppNote } from '../../types';
import { useApp } from '../../context/AppContext';
import { FileText, Activity, Users, Plus, Trash2, Search, CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import { formatGermanDate } from '../../lib/diagnosticCoreUtils';
import { logObservation } from '../../lib/utils';
import { toLocalDateKey } from '../../lib/localDate';
import { getStudentNotes } from '../../lib/studentMetrics';
import DossierKELReflexion from './DossierKELReflexion';
import DossierObservationCharts from './DossierObservationCharts';

interface DossierBeobachtungenVerlaufProps {
  student: Student;
  initialSubSection?: 'beobachtungen' | 'verhalten' | 'anwesenheit' | 'kel';
  initialQuickNoteCategory?: AppNote['kategorie'];
  onQuickEntryConsumed?: () => void;
}

type SubSection = 'beobachtungen' | 'verhalten' | 'anwesenheit' | 'kel';
const noteDateKey=(note:any)=>{
  if (typeof note?.datum==='string' && /^\d{4}-\d{2}-\d{2}/.test(note.datum)) return note.datum.slice(0,10);
  if (note?.timestamp) {
    const date=new Date(Number(note.timestamp));
    if (!Number.isNaN(date.getTime())) return toLocalDateKey(date);
  }
  return toLocalDateKey();
};

export const DossierBeobachtungenVerlauf: React.FC<DossierBeobachtungenVerlaufProps> = ({
  student,
  initialSubSection = 'verhalten',
  initialQuickNoteCategory,
  onQuickEntryConsumed
}) => {
  const { app, setApp } = useApp();
  const [activeSubSection, setActiveSubSection] = useState<SubSection>(initialQuickNoteCategory ? 'beobachtungen' : initialSubSection);

  // ----------------------------------------------------
  // 1. Pädagogische Beobachtungen (Notes / Journal)
  // ----------------------------------------------------
  const studentNotes = useMemo(() => getStudentNotes(app, student.id), [app.notes, app.journal, app.notizen, student.id]);

  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('alle');
  const [noteSearch, setNoteSearch] = useState<string>('');
  const [isAddingNote, setIsAddingNote] = useState(Boolean(initialQuickNoteCategory));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<AppNote['kategorie']>(initialQuickNoteCategory || 'Notiz');
  React.useEffect(() => { if (initialQuickNoteCategory) onQuickEntryConsumed?.(); }, []);
  const [newNoteSubject, setNewNoteSubject] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(() => toLocalDateKey());
  const [newNoteType, setNewNoteType] = useState<'neutral' | 'positiv' | 'beobachten'>('neutral');

  const filteredNotes = useMemo(() => {
    return studentNotes.filter((n: any) => {
      const matchesCategory = noteCategoryFilter === 'alle' || n.kategorie === noteCategoryFilter;
      const matchesSearch = !noteSearch.trim() || 
        (n.inhalt && n.inhalt.toLowerCase().includes(noteSearch.toLowerCase())) ||
        (n.fach && n.fach.toLowerCase().includes(noteSearch.toLowerCase())) ||
        (n.teilbereich && n.teilbereich.toLowerCase().includes(noteSearch.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [studentNotes, noteCategoryFilter, noteSearch]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    if (editingNoteId) {
      setApp(prev => {
        const patch = (n:any) => n.id === editingNoteId ? {
          ...n,
          inhalt: newNoteText.trim(),
          kategorie: newNoteCategory,
          datum: newNoteDate,
          ...(typeof n.timestamp === 'number' ? { timestamp: new Date(newNoteDate+'T12:00:00').getTime() } : {}),
          fach: newNoteSubject.trim(),
          art: newNoteType
        } : n;
        return {
          ...prev,
          notes: (prev.notes || []).map(patch),
          journal: (prev.journal || []).map(patch),
          notizen: (prev.notizen || []).map(patch)
        };
      });
    } else logObservation(
      setApp,
      student.id,
      newNoteText.trim(),
      newNoteCategory,
      'Schülerdossier',
      newNoteDate,
      { fach: newNoteSubject.trim(), art: newNoteType },
    );

    setEditingNoteId(null);
    setNewNoteText('');
    setNewNoteSubject('');
    setIsAddingNote(false);
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Möchten Sie diese Beobachtung wirklich entfernen?')) {
      setApp(prev => ({
        ...prev,
        notes: (prev.notes || []).filter((n: any) => n.id !== noteId),
        journal: (prev.journal || []).filter((n: any) => n.id !== noteId),
        notizen: (prev.notizen || []).filter((n: any) => n.id !== noteId)
      }));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-100/90 border border-slate-200/90 rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubSection('verhalten')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              (activeSubSection === 'verhalten' || activeSubSection === 'anwesenheit')
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Activity size={14} className={(activeSubSection === 'verhalten' || activeSubSection === 'anwesenheit') ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Verläufe & Tagesdaten</span>
          </button>

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

        {(activeSubSection !== 'kel') && (
          <button
            type="button"
            onClick={() => { setActiveSubSection('beobachtungen'); setEditingNoteId(null); setNewNoteText(''); setNewNoteSubject(''); setNewNoteCategory('Notiz'); setNewNoteType('neutral'); setNewNoteDate(toLocalDateKey()); setIsAddingNote(true); }}
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
                  {editingNoteId ? 'Beobachtung bearbeiten' : 'Neue pädagogische Beobachtung erfassen'}
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
                <option value="Notiz">Beobachtung / Notiz</option>
                <option value="Verhalten">Verhalten</option>
                <option value="Erfolg">Erfolg / Ressource</option>
                <option value="Eltern">Elterngespräch / Kontakt</option>
                <option value="Journal">Journal / Reflexion</option>
                <option value="allgemein">Allgemein</option>
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
                          {note.fach}{note.teilbereich ? ` · ${note.teilbereich}` : ''}
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
                      <button type="button" aria-label="Beobachtung bearbeiten" onClick={() => { setEditingNoteId(note.id); setNewNoteText(note.inhalt || note.text || note.titel || ''); setNewNoteCategory((note.kategorie || 'Notiz') as AppNote['kategorie']); setNewNoteDate(noteDateKey(note)); setNewNoteSubject(note.fach || ''); setNewNoteType(note.art || 'neutral'); setIsAddingNote(true); }} className="min-h-10 min-w-10 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil size={14} /></button>
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

      {(activeSubSection === 'verhalten' || activeSubSection === 'anwesenheit') && <DossierObservationCharts student={student} initialDetail={activeSubSection} />}

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
