
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, Plus, Search, Trash2, Calendar, FileText, 
  ChevronRight, Sparkles, User, Users, Target, Heart, Zap, 
  Smile, Frown, Meh, Star, CheckCircle2, ChevronDown, 
  Printer, Save, Download, AlertCircle, Info, TrendingUp,
  Brain, HandHelping, BookOpen, GraduationCap, RotateCcw,
  BarChart3, Notebook, History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ParentMeeting } from '../types';
import { DebouncedTextarea } from './DebouncedInput';
import { generateMeetingGuide } from '../services/aiService';
import { berechne } from '../lib/GradeUtils';
import { FAECHER_ALLE } from '../constants';

const RATING_LABELS = ['Noch nicht', 'Teilweise', 'Meistens', 'Immer'];

const RATING_MODES = {
  zahlen: { label: 'Noten (1-5)', values: [1, 2, 3, 4, 5], labels: ['Sehr gut', 'Gut', 'Befriedigend', 'Genügend', 'Nicht genügend'] },
  skala3: { label: '3-stufige Erläuterung', values: [1, 2, 3], labels: ['Mindestanforderung', 'Lernziel im Wesentlichen erreicht', 'Lernziel über das Wesentliche erreicht'] },
  skala4: { label: 'Skala (1-4)', values: [1, 2, 3, 4], labels: ['Noch nicht', 'Teilweise', 'Meistens', 'Immer'] },
  skala6: { label: 'OBERAU-Skala', values: [1, 2, 3, 4, 5, 6], labels: ['Mindestanforderung (1)', 'Mindestanforderung (2)', 'Lernziel im Wesentlichen erreicht (3)', 'Lernziel im Wesentlichen erreicht (4)', 'Lernziel über das Wesentliche erreicht (5)', 'Lernziel über das Wesentliche erreicht (6)'] }
};

const KEL_STRUCTURE = [
  { 
    id: 'de', label: 'Deutsch', color: 'bg-blue-50 text-blue-700',
    subsections: [
      { id: 'hoeren', label: 'Hören und Sprechen', items: ['Gespräche führen und Texte vortragen', 'In Standardsprache sprechen', 'Bewusstes Zuhören'] },
      { id: 'lesen', label: 'Lesen', items: ['Fließend und betont lesen', 'Leseverständnis', 'Informationen verarbeiten'] },
      { id: 'rechtschreiben', label: 'Rechtschreiben & Sprachbetrachtung', items: ['Wörter und Texte richtig schreiben', 'Lernwörter richtig schreiben', 'Wortfamilie und Wortstamm', 'Wortarten', 'Zeitformen'] },
      { id: 'verfassen', label: 'Verfassen von Texten', items: ['Texte planen und verfassen', 'Texte überarbeiten'] }
    ]
  },
  { 
    id: 'ma', label: 'Mathematik', color: 'bg-rose-50 text-rose-700',
    subsections: [
      { id: 'zahlen', label: 'Zahlen und Daten', items: ['Orientierung im Zahlenraum 1000', 'Stellenwert', 'Daten erheben und aufzeichnen'] },
      { id: 'rechnen', label: 'Rechenoperationen', items: ['Schriftliche Addition', 'Schriftliche Subtraktion', 'Schriftliche Multiplikation', 'Schriftliche Division', 'Sachaufgaben'] },
      { id: 'groessen', label: 'Größen', items: ['Gelernte Größen und Umwandlungen'] },
      { id: 'raum', label: 'Ebene und Raum', items: ['Figuren und Körper', 'Umfangberechnung'] }
    ]
  },
  { 
    id: 'su', label: 'Fächerkompetenz', color: 'bg-emerald-50 text-emerald-700',
    subsections: [
      { id: 'su_items', label: 'Sachunterricht', items: ['Interesse an den Themenbereichen', 'Lerninhalte wiedergeben'] },
      { id: 'mus', label: 'Musikerziehung', items: ['Interesse an Musik und Bewegung'] },
      { id: 'tu', label: 'Technik und Design', items: ['Planung und Gestaltung'] },
      { id: 'ku', label: 'Kunst und Gestaltung', items: ['Kreative, sorgfältige Gestaltung'] },
      { id: 'bs', label: 'Bewegung und Sport', items: ['Freude an Bewegung und Fairness'] },
      { id: 'rel', label: 'Religion', items: ['Interesse und aktive Beteiligung'] }
    ]
  },
  { 
    id: 'allg', label: 'Allgemeines', color: 'bg-slate-50 text-slate-700',
    subsections: [
      { id: 'allg_items', label: 'Lern- & Arbeitsverhalten', items: ['Mitarbeit', 'Konzentration und Ausdauer', 'Arbeitstempo', 'Ordnung', 'Selbstständigkeit', 'Hausübungen'] }
    ]
  }
];

export default function MeetingLogs() {
  const { app, setApp } = useApp();
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('detailed');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [aiTalkingPoints, setAiTalkingPoints] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleGenerateAILeitfaden = async () => {
    if (!student || !selectedMeeting) return;
    setAiLoading(true);
    
    // Gather performance data for the AI
    let performanceStr = "";
    
    // 1. Grades
    let gradeEntries: string[] = [];
    FAECHER_ALLE.forEach(f => {
      const g1 = berechne(app, student.id, f, '1');
      if (g1) gradeEntries.push(`${f}: ${g1}`);
    });
    performanceStr += `Noten: ${gradeEntries.join(', ') || 'Keine Noten eingetragen'}. `;
    
    // 2. Participation (Mitarbeit)
    let miStr = "";
    FAECHER_ALLE.forEach(f => {
      const mi = app.mitarbeit?.[student.id]?.[f]?.['1'] || 0;
      if (mi > 0) miStr += `${f}: ${mi} Pkt, `;
    });
    performanceStr += `Mitarbeit: ${miStr || 'Keine Daten'}. `;
    
    // 3. Behavior Notes
    if (app.karten?.[student.id]?.archiv) {
      const notes = app.karten[student.id].archiv.slice(-5).map((n: any) => n.grund || n.text || '').join('; ');
      performanceStr += `Verhaltensnotizen (letzte 5): ${notes}. `;
    } else if (app.behavior_notes?.[student.id]) {
        performanceStr += `Verhaltensnotiz: ${app.behavior_notes[student.id]}. `;
    }

    try {
      const guide = await generateMeetingGuide(student.vorname, performanceStr);
      if (guide) {
        setAiTalkingPoints(guide);
      } else {
        setAiTalkingPoints("KI konnte keinen Leitfaden generieren. Bitte prüfe deine Internetverbindung.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiToNotes = () => {
    if (!selectedMeeting || !aiTalkingPoints) return;
    const newNotizen = selectedMeeting.notizen 
      ? `${selectedMeeting.notizen}\n\n--- KI-LEITFADEN ---\n${aiTalkingPoints}`
      : aiTalkingPoints;
    
    setApp(prev => ({
      ...prev,
      elterngespraeche: prev.elterngespraeche.map(m => 
        m.id === selectedMeeting.id ? { ...m, notizen: newNotizen } : m
      )
    }));
    setAiTalkingPoints(null);
  };

  const students = [...app.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname));
  const filteredStudents = students.filter(s => 
    `${s.vorname} ${s.nachname}`.toLowerCase().includes(search.toLowerCase())
  );

  const student = students.find(s => s.id === selectedStudentId);
  const studentObservations = (app.journal || []).filter(o => o.schuelerId === student?.id);
  const meetings = (app.elterngespraeche || [])
    .filter(m => m.schuelerId === selectedStudentId)
    .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  useEffect(() => {
    if (student && selectedMeeting) {
      (window as any).__printTitle = `Gesprächsprotokoll • ${student.vorname} ${student.nachname}`;
    } else if (student) {
      (window as any).__printTitle = `Gespräche & Notizen • ${student.vorname} ${student.nachname}`;
    } else {
      (window as any).__printTitle = null;
    }
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).__printTitle = null;
      }
    };
  }, [student, selectedMeeting]);

  const createMeeting = () => {
    if (!selectedStudentId) return;
    
    const newMeeting: ParentMeeting = {
      id: Date.now().toString(),
      schuelerId: selectedStudentId,
      datum: new Date().toISOString().slice(0, 10),
      thema: 'Erläuterung / Vorlage',
      notizen: '',
      vereinbarungen: '',
      bewertungsModus: 'skala4',
      bewertung: {},
      custom_bewertung: [],
      teilnehmer: 'Kind, Eltern, Lehrperson',
      naechste_schritte: ''
    };

    setApp(prev => ({
      ...prev,
      elterngespraeche: [...(prev.elterngespraeche || []), newMeeting]
    }));
    setSelectedMeetingId(newMeeting.id);
    setViewMode('compact');
  };

  const updateMeeting = (updates: Partial<ParentMeeting>) => {
    if (!selectedMeetingId) return;
    setApp(prev => ({
      ...prev,
      elterngespraeche: (prev.elterngespraeche || []).map(m => 
        m.id === selectedMeetingId ? { ...m, ...updates } : m
      )
    }));
  };

  const deleteMeeting = (id: string) => {
    setApp(prev => ({
      ...prev,
      elterngespraeche: (prev.elterngespraeche || []).filter(m => m.id !== id)
    }));
    if (selectedMeetingId === id) setSelectedMeetingId(null);
    setConfirmDeleteId(null);
  };

  const addCustomField = () => {
    if (!newCustomLabel.trim()) return;
    const newItem = { id: Date.now().toString(), label: newCustomLabel.trim(), value: null };
    updateMeeting({ custom_bewertung: [...(selectedMeeting?.custom_bewertung || []), newItem] });
    setNewCustomLabel('');
  };

  const updateCustomFieldValue = (id: string, value: number | null) => {
    const newList = (selectedMeeting?.custom_bewertung || []).map(item => 
      item.id === id ? { ...item, value } : item
    );
    updateMeeting({ custom_bewertung: newList });
  };

  const removeCustomField = (id: string) => {
    const newList = (selectedMeeting?.custom_bewertung || []).filter(item => item.id !== id);
    updateMeeting({ custom_bewertung: newList });
  };

  const renderRating = (label: string, field: string, value: number | null = null, modeKey: keyof typeof RATING_MODES = 'skala4', isCustom: boolean = false, customId?: string) => {
    const mode = RATING_MODES[modeKey] || RATING_MODES.skala4;
    
    const currentLabel = value !== null ? mode.labels[mode.values.indexOf(value)] : 'Nicht bewertet';
    
    return (
      <div className="flex flex-col gap-3 p-4 bg-white border border-slate-100 rounded-2xl hover:border-amber-200 hover:shadow-sm transition-all group relative">
        <div className="flex justify-between items-start pr-8">
           <div className="flex flex-col gap-0.5 min-w-0">
             <span className="text-[0.6875rem] font-black text-slate-500 uppercase tracking-widest leading-none group-hover:text-amber-900 transition-colors text-wrap leading-tight break-words">{label}</span>
             {value !== null && (
               <span className="text-[0.625rem] font-bold text-amber-600 text-wrap leading-tight break-words opacity-0 group-hover:opacity-100 transition-opacity">
                 {currentLabel}
               </span>
             )}
           </div>
           {isCustom && customId && (
             <button 
               onClick={(e) => { e.stopPropagation(); removeCustomField(customId); }}
               className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all no-print"
             >
               <Trash2 size={12} />
             </button>
           )}
        </div>

        <div className="flex flex-col gap-1.5">
          {/* Labels above buttons */}
          <div className="flex justify-between px-1">
            {mode.values.map((v, i) => {
              const isSelected = value === v;
              // Clean up label for small display (remove numbers in parens)
              const displayLabel = mode.labels[i].includes('(') ? mode.labels[i].split(' (')[0] : mode.labels[i];
              const isMilestone = i === 0 || i === mode.values.length - 1 || i === Math.floor(mode.values.length / 2);
              const showLabel = isSelected || (modeKey === 'skala6' && (i === 0 || i === 1));

              return (
                <div 
                  key={`label-${v}`} 
                  className={`text-[0.4375rem] font-black uppercase tracking-tighter w-7 text-center leading-[0.8] mb-1 h-4 flex items-end justify-center transition-all duration-300 ${showLabel ? 'text-amber-600 opacity-100' : isMilestone ? 'text-slate-400 opacity-60' : 'opacity-0'}`}
                >
                  {displayLabel}
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 justify-between">
            {mode.values.map((v) => {
              const isSelected = value === v;
              const isLesser = value !== null && v <= value;
              
              return (
                <button
                  key={v}
                  onClick={() => {
                    if (isCustom && customId) {
                      updateCustomFieldValue(customId, v);
                    } else {
                      const newBewertung = { ...(selectedMeeting?.bewertung || {}), [field]: v };
                      updateMeeting({ bewertung: newBewertung });
                    }
                  }}
                  className={`flex-1 h-8 rounded-lg font-black text-[0.6875rem] transition-all relative  flex items-center justify-center border-2 ${
                    isSelected 
                      ? 'bg-amber-500 border-amber-600 text-white shadow-md scale-105 z-10' 
                      : isLesser
                        ? 'bg-amber-100 border-amber-200 text-amber-700'
                        : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-white hover:border-amber-200 hover:text-amber-600'
                  }`}
                >
                  {v}
                  {isSelected && (
                    <motion.div 
                      layoutId={`active-glow-${field}`}
                      className="absolute inset-0 bg-white/20 animate-pulse"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {value !== null && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (isCustom && customId) {
                updateCustomFieldValue(customId, null);
              } else {
                const newBewertung = { ...(selectedMeeting?.bewertung || {}) };
                delete newBewertung[field];
                updateMeeting({ bewertung: newBewertung });
              }
            }}
            className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-white border border-slate-100 shadow-sm flex items-center justify-center text-rose-300 hover:text-rose-500 hover:border-rose-200 opacity-0 group-hover:opacity-100 transition-all z-10 no-print"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    );
  };

  const renderGoalTracker = (label: string, field: string) => {
    const currentProgress = selectedMeeting?.bildungsziele?.[field] || 0;
    
    return (
      <div className="flex flex-col gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group print:bg-white print:border-slate-200 print:p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target size={14} className={currentProgress === 100 ? 'text-emerald-500' : 'text-slate-300 print:hidden'} />
            <span className="text-[0.6875rem] font-black text-slate-500 uppercase tracking-widest print:text-[0.625rem] print:text-slate-900">{label}</span>
          </div>
          <span className="text-[0.75rem] font-black text-emerald-600 print:text-slate-900 print:text-[0.625rem]">{currentProgress}%</span>
        </div>
        <div 
          className="relative h-6 bg-white rounded-xl border border-slate-200  cursor-pointer shadow-inner print:h-3 print:rounded-full print:shadow-none print:border-slate-400"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(100, Math.round((x / rect.width) * 20) * 5)); // Snap to 5%
            const newZiele = { ...(selectedMeeting?.bildungsziele || {}), [field]: percentage };
            updateMeeting({ bildungsziele: newZiele });
          }}
        >
          <motion.div 
            initial={false}
            animate={{ width: `${currentProgress}%` }}
            className={`h-full ${currentProgress === 100 ? 'bg-emerald-500' : 'bg-emerald-400'} shadow-sm print:bg-slate-900 print:shadow-none`}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-20 print:hidden">
             {[0, 20, 40, 60, 80, 100].map(v => (
               <div key={v} className="h-1 w-px bg-slate-400" />
             ))}
          </div>
        </div>
      </div>
    );
  };

  const calculateProgress = (sectionItems: string[], sectionId: string) => {
    if (!selectedMeeting?.bewertung || !selectedMeeting?.bewertungsModus) return 0;
    const ratings = sectionItems.map(item => {
      const key = `${sectionId}_${item.slice(0, 5)}`;
      return selectedMeeting.bewertung?.[key] || null;
    }).filter(v => v !== null) as number[];
    
    if (ratings.length === 0) return 0;
    const mode = (RATING_MODES as any)[selectedMeeting.bewertungsModus] || RATING_MODES.skala4;
    const maxVal = Math.max(...mode.values);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    return (avg / maxVal) * 100;
  };

  const calculateCompactProgress = (fields: string[]) => {
    if (!selectedMeeting?.bewertung || !selectedMeeting?.bewertungsModus) return 0;
    const ratings = fields.map(f => selectedMeeting.bewertung?.[f] || null).filter(v => v !== null) as number[];
    if (ratings.length === 0) return 0;
    const mode = (RATING_MODES as any)[selectedMeeting.bewertungsModus] || RATING_MODES.skala4;
    const maxVal = Math.max(...mode.values);
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length / maxVal) * 100;
  };

  const calculateTotalDetailedProgress = () => {
    if (!selectedMeeting?.bewertungsModus) return 0;
    const allItems: { category: string; item: string; value: number | null }[] = [];
    
    KEL_STRUCTURE.forEach(cat => {
      cat.subsections.forEach(sub => {
        sub.items.forEach(item => {
          const key = `${sub.id}_${item.slice(0, 5)}`;
          allItems.push({ category: cat.id, item, value: selectedMeeting.bewertung?.[key] ?? null });
        });
      });
    });

    // Add custom ones
    (selectedMeeting.custom_bewertung || []).forEach(c => {
      allItems.push({ category: 'custom', item: c.label, value: c.value });
    });

    const ratedItems = allItems.filter(i => i.value !== null);
    if (ratedItems.length === 0) return 0;

    const mode = (RATING_MODES as any)[selectedMeeting.bewertungsModus] || RATING_MODES.skala4;
    const maxVal = Math.max(...mode.values);
    
    const sum = ratedItems.reduce((acc, curr) => acc + (curr.value || 0), 0);
    return (sum / (ratedItems.length * maxVal)) * 100;
  };

  return (
    <div className="flex-1  relative w-full flex flex-col">
      <AnimatePresence mode="wait">
        {/* STAGE 1: Student Overview Grid */}
        {!selectedStudentId && (
          <motion.div 
            key="students-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 h-full flex flex-col gap-6 pt-4"
          >
            <div className="flex items-center justify-end">
              <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 bg-white text-[0.875rem] leading-snug outline-none focus:ring-4 focus:ring-amber-500/5 transition-all font-medium"
                  placeholder="Schüler suchen..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredStudents.map(s => {
                  const studentMeetings = (app.elterngespraeche || []).filter(m => m.schuelerId === s.id);
                  const hasMeetings = studentMeetings.length > 0;
                  return (
                    <button 
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className="group p-6 bg-white border border-slate-200 rounded-[32px] hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/5 transition-all text-left flex flex-col justify-between h-44"
                    >
                      <div className="min-w-0">
                        <div className="text-[1.125rem] font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors text-wrap leading-tight break-words">{s.nachname} {s.vorname}</div>
                        <div className="text-[0.625rem] uppercase font-bold tracking-widest text-slate-400 mt-2">{app.stufe}. Klasse {app.klassenbezeichnung}</div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Einträge</span>
                          <span className={`text-[1rem] font-black ${hasMeetings ? 'text-amber-600' : 'text-slate-300'}`}>{studentMeetings.length}</span>
                        </div>
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                          <ChevronRight size={20} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {filteredStudents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                   <Users size={64} strokeWidth={1} />
                   <p className="font-bold uppercase tracking-widest text-[0.875rem] leading-snug text-slate-400">Keine Schüler gefunden</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STAGE 2: Student History / Dossier */}
        {selectedStudentId && !selectedMeetingId && (
          <motion.div 
            key="student-dossier"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 h-full flex flex-col gap-6"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm gap-4">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => setSelectedStudentId(null)}
                  className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all"
                  title="Zurück zur Liste"
                >
                  <Users size={20} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight text-wrap leading-tight break-words">{student?.nachname} {student?.vorname}</h2>
                  <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Erläuterungen & Vorlagen für Elterngespräche</p>
                </div>
              </div>
              <button 
                onClick={createMeeting}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase text-[0.75rem] tracking-widest shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} /> Neues Gespräch
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {meetings.map((m) => (
                  <div 
                    key={m.id}
                    className="group relative bg-white border border-slate-100 rounded-[32px]  hover:shadow-xl transition-all h-64 flex flex-col"
                  >
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest border border-amber-100">
                             {new Date(m.datum).toLocaleDateString('de-AT')}
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => setConfirmDeleteId(m.id)}
                              className="p-2 text-rose-300 hover:text-rose-600 transition-colors no-print"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <h4 className="text-[1.25rem] leading-normal font-black text-slate-800 line-clamp-2 leading-tight py-1">{m.thema}</h4>
                        <div className="flex items-center gap-2 mt-3 text-[0.6875rem] font-medium text-slate-400 text-wrap leading-tight break-words">
                            <Users size={12} /> {m.teilnehmer}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="h-px bg-slate-50" />
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Fortschritt</div>
                              <div className="w-24 h-1.5 bg-slate-50 rounded-full  border border-slate-100">
                                <div 
                                  className="h-full bg-amber-500 rounded-full" 
                                  style={{ width: `${Object.keys(m.bewertung || {}).length > 0 ? 100 : 0}%` }}
                                />
                              </div>
                           </div>
                           <button 
                             onClick={() => setSelectedMeetingId(m.id)}
                             className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-amber-600 transition-all font-bold text-[0.6875rem] px-4 uppercase tracking-tight"
                           >
                              Öffnen
                           </button>
                        </div>
                      </div>
                    </div>

                    {confirmDeleteId === m.id && (
                      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 z-20">
                         <AlertCircle size={32} className="text-rose-500 mb-4" />
                         <p className="text-white font-black text-center mb-6 uppercase tracking-widest text-[0.75rem]">Wirklich löschen?</p>
                         <div className="flex gap-4 w-full">
                            <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-bold uppercase text-[0.625rem] tracking-widest hover:bg-white/20 transition-all">Abbrechen</button>
                            <button onClick={() => deleteMeeting(m.id)} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black uppercase text-[0.625rem] tracking-widest shadow-lg shadow-rose-600/20 hover:scale-105 transition-all">Ja, Löschen</button>
                         </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {meetings.length === 0 && (
                  <div className="col-span-full py-20 bg-white/50 border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center text-slate-300 gap-6">
                     <FileText size={48} strokeWidth={1} />
                     <div className="text-center">
                        <p className="font-black uppercase tracking-[0.2em] text-[0.875rem] leading-snug text-slate-400">Keine Protokolle vorhanden</p>
                        <button 
                          onClick={createMeeting}
                          className="mt-6 px-8 py-3 bg-amber-600 text-white rounded-2xl font-black uppercase text-[0.75rem] tracking-widest shadow-lg shadow-amber-600/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          Erstes Gespräch erstellen
                        </button>
                     </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STAGE 3: Full-Screen Meeting Editor */}
        {selectedMeetingId && selectedMeeting && (
          <motion.div 
            key="meeting-editor"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex-1 h-full flex flex-col bg-white border border-slate-200 rounded-[40px]  shadow-2xl relative"
          >
            {/* Toolbar */}
            <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap items-center justify-between bg-white shrink-0 no-print z-10 sticky top-0 shadow-sm shadow-slate-100/50 gap-4">
               <div className="flex items-center gap-6">
                 <button 
                   onClick={() => setSelectedMeetingId(null)}
                   className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all font-black uppercase text-[0.6875rem] tracking-widest shrink-0"
                 >
                   <ChevronRight size={16} className="rotate-180" /> Zurück
                 </button>
                 <div className="hidden sm:block h-8 w-px bg-slate-100" />
                 <div className="flex flex-col">
                    <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 leading-tight text-wrap leading-tight break-words max-w-[200px]">{student?.nachname} {student?.vorname}</h3>
                    <div className="flex items-center gap-2 text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">
                       <Calendar size={12} /> {selectedMeeting.datum ? new Date(selectedMeeting.datum).toLocaleDateString('de-AT') : '-'}
                    </div>
                 </div>
               </div>

               <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Lehrer-Ansicht:</div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-100">
                       <button 
                         onClick={() => setViewMode('compact')}
                         className={`px-3 py-1.5 rounded-lg text-[0.625rem] font-black transition-all ${viewMode === 'compact' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >Kompakt</button>
                       <button 
                         onClick={() => setViewMode('detailed')}
                         className={`px-3 py-1.5 rounded-lg text-[0.625rem] font-black transition-all ${viewMode === 'detailed' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                       >Standard (Erläuterung)</button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    
                    <button 
                      onClick={handleGenerateAILeitfaden}
                      disabled={aiLoading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 font-black uppercase text-[0.6875rem] tracking-widest"
                    >
                      {aiLoading ? <RotateCcw size={16} className="animate-spin" /> : <Sparkles size={16} className="text-amber-400" />}
                      KI Leitfaden
                    </button>
                    <button 
                      onClick={() => setConfirmDeleteId(selectedMeeting.id)}
                      className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all border border-rose-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/20 print-container">
              {/* Content Wrapper */}
              <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto w-full print:p-0 print:m-0 print:max-w-none">
                
                {/* Observation Journal Summary - NEW CONTEXTUAL SECTION */}
                {student && studentObservations.length > 0 && (
                  <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 border border-slate-700 shadow-2xl relative  group no-print">
                    <div className="absolute top-0 right-0 p-8 transform translate-x-1/4 -translate-y-1/4 opacity-10">
                      <History size={160} />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-8 relative z-10">
                      <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                        <History size={24} />
                      </div>
                      <div>
                        <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-amber-500 mb-1">Beobachtungs-Journal</h4>
                        <p className="text-white/40 text-[0.6875rem] font-bold uppercase tracking-widest leading-none">Historische Notizen & Sammeljournal</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                      {studentObservations.slice(0, 3).map(obs => (
                        <div key={obs.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/[0.08] transition-all">
                           <div className="flex items-center justify-between mb-3 text-[0.625rem] font-black uppercase tracking-widest text-white/30">
                              <span>{new Date(obs.datum).toLocaleDateString('de-AT')}</span>
                              <span className="bg-white/10 px-2 py-0.5 rounded-lg">{obs.kategorie}</span>
                           </div>
                           <p className="text-[0.875rem] text-white/70 leading-relaxed font-medium line-clamp-3">
                             {obs.inhalt}
                           </p>
                        </div>
                      ))}
                      {studentObservations.length > 3 && (
                        <div className="flex items-center justify-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl p-6 group/more cursor-help">
                           <p className="text-[0.6875rem] font-black uppercase tracking-widest text-white/30 group-hover/more:text-amber-500 transition-colors">
                             +{studentObservations.length - 3} weitere Einträge
                           </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* PDF PRINT HEADER (ALWAYS HIDDEN ONSCREEN) */}
                <div className="hidden print:block space-y-8 border-b-2 border-slate-900 pb-10 mb-12">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Erläuterungen & Vorlagen</h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[0.75rem] mt-2">Schuljahr {app.schuljahr} — {app.stufe}. Klasse {app.klassenbezeichnung}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[0.6875rem] font-black uppercase text-slate-400 tracking-widest">Datum</p>
                    <p className="text-[1.25rem] leading-normal font-bold">{selectedMeeting.datum ? new Date(selectedMeeting.datum).toLocaleDateString('de-AT') : '-'}</p>
                  </div>
                </div>

                   <div className="grid grid-cols-3 gap-12 p-8 bg-slate-50 rounded-[40px] border border-slate-200">
                      <div>
                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2 tracking-widest">Schüler/in</p>
                         <p className="text-[1.5rem] leading-normal font-black text-slate-900">{student?.vorname} {student?.nachname}</p>
                      </div>
                      <div>
                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2 tracking-widest">Geburtsdatum</p>
                         <p className="font-bold text-slate-700 text-[1.125rem] leading-normal">{student?.geburtstag || '-'}</p>
                      </div>
                      <div>
                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2 tracking-widest">Religionsbekenntnis</p>
                         <p className="font-bold text-slate-700 text-[1.125rem] leading-normal">{student?.religion || '-'}</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="pb-4 border-b border-slate-100">
                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2 tracking-widest">Thema</p>
                         <p className="text-[1.25rem] leading-normal font-black text-slate-900">{selectedMeeting.thema}</p>
                      </div>
                      <div>
                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2 tracking-widest">Teilnehmer</p>
                         <p className="text-slate-700 text-[1.125rem] leading-normal">{selectedMeeting.teilnehmer}</p>
                      </div>
                   </div>
                </div>

                {/* Performance Summary Dossier (Screen Only) */}
                <section className="no-print bg-slate-900 rounded-[40px] p-8 border border-slate-800 shadow-2xl space-y-6">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white">
                         <GraduationCap size={20} />
                       </div>
                       <div>
                         <h4 className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-indigo-400">Aktueller Leistungsstand</h4>
                         <p className="text-white font-bold">Zusammenfassung für das Gespräch</p>
                       </div>
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 size={14} className="text-white/40" />
                          <span className="text-[0.6875rem] font-black uppercase tracking-widest text-white/60">Notenschnitt</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           {FAECHER_ALLE.map(f => {
                             const grade = berechne(app, student.id, f, '1');
                             if (!grade) return null;
                             return (
                               <div key={f} className="flex justify-between items-center text-[0.6875rem]">
                                 <span className="text-white/40 text-wrap leading-tight break-words mr-2">{f}</span>
                                 <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded">{grade}</span>
                               </div>
                             );
                           })}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap size={14} className="text-white/40" />
                          <span className="text-[0.6875rem] font-black uppercase tracking-widest text-white/60">Mitarbeit</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                           {FAECHER_ALLE.map(f => {
                             const mi = app.mitarbeit?.[student.id]?.[f]?.['1'] || 0;
                             if (mi === 0) return null;
                             return (
                               <div key={f} className="flex justify-between items-center text-[0.6875rem]">
                                 <span className="text-white/40 text-wrap leading-tight break-words mr-2">{f}</span>
                                 <span className="text-amber-400 font-black">{mi}</span>
                               </div>
                             );
                           })}
                        </div>
                      </div>

                      <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen size={14} className="text-white/40" />
                          <span className="text-[0.6875rem] font-black uppercase tracking-widest text-white/60">Letzte Notizen</span>
                        </div>
                        <div className="space-y-2">
                           {/* Use card archive for behavior history if available */}
                           {app.karten?.[student.id]?.archiv?.slice(-3).reverse().map((n: any, i: number) => (
                             <div key={i} className="text-[0.625rem] text-white/80 border-l-2 border-white/10 pl-2 py-0.5 italic">
                               "{n.grund || n.text || 'Vorfall ohne Text'}"
                             </div>
                           )) || (
                             app.behavior_notes?.[student.id] ? (
                               <div className="text-[0.625rem] text-white/80 border-l-2 border-white/10 pl-2 py-0.5 italic">
                                 "{app.behavior_notes[student.id]}"
                               </div>
                             ) : (
                               <p className="text-[0.625rem] text-white/20 italic">Keine Notizen vorhanden</p>
                             )
                           )}
                        </div>
                      </div>
                   </div>
                </section>

                <section className="bg-white p-6 md:p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8 no-print">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                     <div className="space-y-4">
                        <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest px-1">Gesprächsthema</label>
                        <input 
                          className="w-full text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black text-slate-800 bg-transparent border-b-2 border-slate-100 pb-2 focus:border-amber-500 transition-all outline-none placeholder:text-slate-100"
                          value={selectedMeeting.thema}
                          onChange={e => updateMeeting({ thema: e.target.value })}
                        />
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest px-1">Datum</label>
                          <input 
                            type="date"
                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 outline-none focus:border-amber-500 transition-all"
                            value={selectedMeeting.datum}
                            onChange={e => updateMeeting({ datum: e.target.value })}
                          />
                        </div>
                        <div className="space-y-4">
                          <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest px-1">Bewertung</label>
                          <select 
                            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-bold text-slate-800 outline-none focus:border-amber-500 transition-all appearance-none"
                            value={selectedMeeting.bewertungsModus}
                            onChange={e => updateMeeting({ bewertungsModus: e.target.value as any })}
                          >
                             {Object.entries(RATING_MODES).map(([key, mode]) => (
                               <option key={key} value={key}>{mode.label}</option>
                             ))}
                          </select>
                        </div>
                     </div>
                     <div className="col-span-full space-y-4">
                        <label className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest px-1">Anwesende Teilnehmer</label>
                        <input 
                          className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 font-medium text-slate-600 outline-none focus:border-amber-500 transition-all"
                          placeholder="Kind, Eltern, Lehrpersonen..."
                          value={selectedMeeting.teilnehmer || ''}
                          onChange={e => updateMeeting({ teilnehmer: e.target.value })}
                        />
                     </div>
                   </div>
                </section>
                
                <AnimatePresence>
                  {aiTalkingPoints && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-slate-900 rounded-[40px] p-8 border border-slate-700 shadow-2xl relative  group no-print"
                    >
                       <button 
                         onClick={() => setAiTalkingPoints(null)}
                         className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"
                       >
                         <Trash2 size={20} />
                       </button>
                       <div className="flex items-center gap-4 mb-6">
                          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                            <Zap size={20} />
                          </div>
                          <h4 className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-amber-500">KI Gesprächsleitfaden</h4>
                       </div>
                       <div className="text-white text-[1.125rem] leading-normal font-medium leading-relaxed whitespace-pre-wrap opacity-90">
                          {aiTalkingPoints}
                       </div>
                       <button 
                         onClick={handleApplyAiToNotes}
                         className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 text-white text-[0.6875rem] font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-3"
                       >
                         <Save size={18} /> In Gesprächsnotizen übernehmen
                       </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-2">
                   <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200">
                        <Star size={24} />
                     </div>
                     <h3 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">Einschätzung</h3>
                   </div>
                   <div className="hidden sm:block flex-1 h-px bg-slate-200" />
                   <div className="flex items-center gap-4 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200">
                      <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Fortschritt</span>
                      <div className="w-40 h-2 bg-white rounded-full  border border-slate-200">
                         <div 
                           className="h-full bg-amber-600 rounded-full" 
                           style={{ width: `${calculateCompactProgress(['selbstkompetenz', 'sozialkompetenz', 'lernverhalten', 'ordnung', 'deutsch', 'mathematik', 'sachunterricht', 'englisch'])}%` }}
                         />
                      </div>
                      <span className="text-[0.875rem] font-black text-amber-700 w-10">{Math.round(calculateCompactProgress(['selbstkompetenz', 'sozialkompetenz', 'lernverhalten', 'ordnung', 'deutsch', 'mathematik', 'sachunterricht', 'englisch']))}%</span>
                   </div>
                </div>

                {viewMode === 'compact' ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                           <h4 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-slate-400">Sozial & Lernverhalten</h4>
                           <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-lg text-[0.625rem] font-black">{Math.round(calculateCompactProgress(['selbstkompetenz', 'sozialkompetenz', 'lernverhalten', 'ordnung']))}%</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {renderRating('Selbstständigkeit', 'selbstkompetenz', (selectedMeeting.bewertung as any)?.selbstkompetenz, selectedMeeting.bewertungsModus)}
                           {renderRating('Soziale Kompetenz', 'sozialkompetenz', (selectedMeeting.bewertung as any)?.sozialkompetenz, selectedMeeting.bewertungsModus)}
                           {renderRating('Lernbereitschaft', 'lernverhalten', (selectedMeeting.bewertung as any)?.lernverhalten, selectedMeeting.bewertungsModus)}
                           {renderRating('Ordnung am Platz', 'ordnung', (selectedMeeting.bewertung as any)?.ordnung, selectedMeeting.bewertungsModus)}
                        </div>
                        <div className="pt-4 border-t border-slate-50">
                           {renderGoalTracker('Bildungsziele: Verhalten', 'goals_behavior')}
                        </div>
                     </div>
                     <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                        <div className="flex items-center justify-between border-b-2 border-slate-50 pb-4">
                           <h4 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-slate-400">Kompetenzbereiche</h4>
                           <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-[0.625rem] font-black">{Math.round(calculateCompactProgress(['deutsch', 'mathematik', 'sachunterricht', 'englisch']))}%</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           {renderRating('Deutsch', 'deutsch', (selectedMeeting.bewertung as any)?.deutsch, selectedMeeting.bewertungsModus)}
                           {renderRating('Mathematik', 'mathematik', (selectedMeeting.bewertung as any)?.mathematik, selectedMeeting.bewertungsModus)}
                           {renderRating('Sachunterricht', 'sachunterricht', (selectedMeeting.bewertung as any)?.sachunterricht, selectedMeeting.bewertungsModus)}
                           {renderRating('Englisch', 'englisch', (selectedMeeting.bewertung as any)?.englisch, selectedMeeting.bewertungsModus)}
                        </div>
                        <div className="pt-4 border-t border-slate-50">
                           {renderGoalTracker('Bildungsziele: Kompetenzen', 'goals_competence')}
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-16">
                    {KEL_STRUCTURE.map(cat => (
                      <div key={cat.id} className="space-y-8">
                        <div className="flex items-center gap-6">
                           <span className={`px-6 py-2.5 rounded-2xl text-[0.8125rem] font-black uppercase tracking-[0.2em] shadow-md border ${cat.color} border-current/10`}>
                             {cat.label}
                           </span>
                           <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                          {cat.subsections.map(sub => (
                            <div key={sub.id} className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col">
                              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                 <h5 className="text-[0.6875rem] font-black text-slate-600 uppercase tracking-widest flex items-center gap-3">
                                   <div className={`w-1.5 h-4 rounded-full ${cat.color.split(' ')[1].replace('700', '400')}`} />
                                   {sub.label}
                                 </h5>
                              </div>
                              <div className="space-y-4 flex-1">
                                {sub.items.map(item => (
                                  renderRating(item, `${sub.id}_${item.slice(0, 5)}`, (selectedMeeting.bewertung as any)?.[`${sub.id}_${item.slice(0, 5)}`], selectedMeeting.bewertungsModus)
                                ))}
                              </div>
                              <div className="mt-6 pt-6 border-t border-slate-50">
                                {renderGoalTracker('Zielerreichung', `goal_${sub.id}`)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* CUSTOM TEACHER SECTION */}
                    <div className="space-y-8">
                      <div className="flex items-center gap-6">
                         <span className={`px-6 py-2.5 rounded-2xl text-[0.8125rem] font-black uppercase tracking-[0.2em] shadow-md border bg-slate-900 text-white border-slate-900`}>
                           Eigene Beobachtungsschwerpunkte
                         </span>
                         <div className="flex-1 h-px bg-slate-200" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        <div className="bg-slate-50 p-8 rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner flex flex-col gap-6 no-print">
                           <div>
                             <h5 className="text-[0.6875rem] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Neues Feld hinzufügen</h5>
                             <div className="flex gap-2">
                               <input 
                                 className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold placeholder:text-slate-200 focus:border-amber-500 outline-none transition-all"
                                 placeholder="z.B. Lesemotivation..."
                                 value={newCustomLabel}
                                 onChange={e => setNewCustomLabel(e.target.value)}
                                 onKeyDown={e => e.key === 'Enter' && addCustomField()}
                               />
                               <button 
                                 onClick={addCustomField}
                                 className="p-3 bg-slate-900 text-white rounded-xl hover:bg-amber-600 transition-all shadow-lg shadow-slate-900/10"
                               >
                                 <Plus size={20} />
                               </button>
                             </div>
                           </div>
                        </div>

                        {(selectedMeeting?.custom_bewertung || []).map(item => (
                          <div key={item.id} className="bg-white p-8 rounded-[40px] border border-amber-100 shadow-sm flex flex-col">
                             {renderRating(item.label, '', item.value, selectedMeeting.bewertungsModus, true, item.id)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10">
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 px-1">
                        <Heart size={20} className="text-rose-500" />
                        <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 uppercase tracking-widest">Stärken & Erfolge</h4>
                      </div>
                      <DebouncedTextarea 
                        className="w-full h-56 p-8 rounded-[40px] border border-slate-200 bg-white shadow-sm resize-none outline-none focus:border-amber-500 transition-all text-[1.125rem] leading-normal leading-relaxed placeholder:text-slate-100"
                        placeholder="Was macht das Kind besonders gut?..."
                        value={selectedMeeting.notizen}
                        onChange={val => updateMeeting({ notizen: val })}
                      />
                   </div>
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 px-1">
                        <Target size={20} className="text-emerald-600" />
                        <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 uppercase tracking-widest">Ziele & Vereinbarungen</h4>
                      </div>
                      <DebouncedTextarea 
                        className="w-full h-56 p-8 rounded-[40px] border-2 border-emerald-100 bg-emerald-50/20 shadow-sm resize-none outline-none focus:border-emerald-500 focus:bg-white transition-all text-[1.125rem] leading-normal leading-relaxed placeholder:text-emerald-100"
                        placeholder="Vereinbarungen bis zum nächsten Gespräch..."
                        value={selectedMeeting.vereinbarungen}
                        onChange={val => updateMeeting({ vereinbarungen: val })}
                      />
                   </div>
                </div>

                <div className="hidden print:block space-y-4 pt-10 border-t border-slate-100">
                    <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-4 tracking-widest">Handschriftliche Notizen / Vereinbarungen</p>
                    <div className="h-40 border-b border-dashed border-slate-300 w-full mb-4"></div>
                    <div className="h-40 border-b border-dashed border-slate-300 w-full mb-4"></div>
                    <div className="h-40 border-b border-dashed border-slate-300 w-full"></div>
                    
                    <div className="grid grid-cols-2 gap-20 mt-20 pt-10">
                        <div className="border-t border-slate-300 pt-2 text-center text-[0.625rem] font-bold text-slate-400">
                            Unterschrift Erziehungsberechtigte
                        </div>
                        <div className="border-t border-slate-300 pt-2 text-center text-[0.625rem] font-bold text-slate-400">
                            Unterschrift Lehrperson
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-[40px] p-8 md:p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 mt-12 no-print">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center">
                         <CheckCircle2 size={32} className="text-amber-400" />
                      </div>
                      <div>
                         <p className="text-[1.25rem] leading-normal font-black tracking-tight leading-tight">Protokoll ist vollständig</p>
                         <p className="text-[0.6875rem] text-white/50 uppercase tracking-[0.2em] mt-1">Automatisch gesichert</p>
                      </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Confirm Delete Overlay for the selected meeting */}
            {confirmDeleteId === selectedMeeting.id && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 z-50">
                 <div className="bg-white p-10 md:p-12 rounded-[48px] max-w-lg w-full flex flex-col items-center text-center gap-6 shadow-2xl">
                   <div className="w-24 h-24 bg-rose-50 rounded-[40px] flex items-center justify-center text-rose-500 mb-2">
                     <AlertCircle size={48} />
                   </div>
                   <div className="space-y-2">
                     <h3 className="text-[1.5rem] leading-normal font-black text-slate-800 tracking-tight">Eintrag löschen?</h3>
                     <p className="text-slate-400 font-medium leading-relaxed">Diese Aktion kann nicht rückgängig gemacht werden.</p>
                   </div>
                   <div className="flex gap-4 w-full mt-4">
                      <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-[0.75rem] tracking-widest hover:bg-slate-200 transition-all">Abbrechen</button>
                      <button onClick={() => deleteMeeting(selectedMeeting.id)} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[0.75rem] tracking-widest shadow-xl shadow-rose-600/20 hover:scale-105 transition-all">Löschen</button>
                   </div>
                 </div>
              </div>
            )}
          </motion.div>
        )}
        {/* FALLBACK: Missing Meeting */}
        {selectedMeetingId && !selectedMeeting && (
          <motion.div 
            key="missing-meeting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 h-full flex flex-col items-center justify-center text-slate-300 gap-6"
          >
            <AlertCircle size={48} className="text-amber-500" />
            <div className="text-center">
              <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Eintrag nicht gefunden</h3>
              <p className="text-[0.875rem] leading-snug font-medium text-slate-500 mt-1">Das Protokoll konnte nicht geladen werden.</p>
              <button 
                onClick={() => setSelectedMeetingId(null)}
                className="mt-6 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold uppercase text-[0.6875rem] tracking-widest"
              >
                Zurück zur Übersicht
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

