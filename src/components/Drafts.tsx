
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { BookOpen, Plus, Search, Trash2, Calendar, FileText, ChevronRight, Share2, ClipboardList, Sparkles, Wand2, Printer, CalendarPlus, X, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LessonPlannerAI from './LessonPlannerAI';
import { DetailedLessonPlan } from '../services/aiService';
import { TAGE_NAMEN } from '../constants';
import { getSW, kwToMonday, getStartYear } from '../lib/utils';

export default function Drafts() {
  const { app, setApp } = useApp();
  const [search, setSearch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [showWeeklyPlanInsert, setShowWeeklyPlanInsert] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const drafts = [...(app.stundenentwuerfe || [])].sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  const filteredDrafts = drafts.filter(d => {
    const matchesSearch = d.thema.toLowerCase().includes(search.toLowerCase()) || d.fach.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = !selectedSubject || d.fach === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const selectedDraft = drafts.find(d => d.id === selectedDraftId);

  const copyToClipboard = () => {
    if (!selectedDraft) return;
    const text = `
STUNDENENTWURF: ${selectedDraft.thema}
Fach: ${selectedDraft.fach}
Datum: ${selectedDraft.datum}

LERNZIELE:
${selectedDraft.lernziele}

EINSTIEG:
${selectedDraft.einleitung}

HAUPTTEIL:
${selectedDraft.hauptteil}

SCHLUSS:
${selectedDraft.schluss}

MATERIALIEN:
${selectedDraft.material}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const addDraft = () => {
    const newDraft = {
      id: Date.now().toString(),
      datum: new Date().toISOString().slice(0, 10),
      fach: 'Deutsch',
      thema: 'Neue Unterrichtsstunde',
      einleitung: '',
      hauptteil: '',
      schluss: '',
      material: '',
      lernziele: ''
    };

    setApp(prev => ({
      ...prev,
      stundenentwuerfe: [...(prev.stundenentwuerfe || []), newDraft]
    }));
    setSelectedDraftId(newDraft.id);
  };

  const updateDraft = (field: string, value: string) => {
    if (!selectedDraftId) return;
    setApp(prev => ({
      ...prev,
      stundenentwuerfe: prev.stundenentwuerfe.map(d => d.id === selectedDraftId ? { ...d, [field]: value } : d)
    }));
  };

  const applyAIPlan = (plan: DetailedLessonPlan) => {
    if (!selectedDraftId) return;
    
    // Format the Lernziele
    const formattedLernziele = `Kognitiv: ${plan.lernziele.kognitiv}\n\nAffektiv: ${plan.lernziele.affektiv}\n\nInstrumental: ${plan.lernziele.instrumental}`;
    
    // Format individual steps
    const formatStep = (step: any) => `[${step.zeit}] ${step.aktion}\n(Sozialform: ${step.sozialform} | Medien: ${step.medien})`;

    // Filter steps by phase keywords
    const einstiegSteps = plan.verlaufsplan.filter(s => 
      s.phase.toLowerCase().includes('einstieg') || 
      s.phase.toLowerCase().includes('einleitung') ||
      s.phase.toLowerCase().includes('start')
    );
    const schlussSteps = plan.verlaufsplan.filter(s => 
      s.phase.toLowerCase().includes('sicherung') || 
      s.phase.toLowerCase().includes('schluss') || 
      s.phase.toLowerCase().includes('reflexion') ||
      s.phase.toLowerCase().includes('ende')
    );
    const hauptSteps = plan.verlaufsplan.filter(s => 
      !einstiegSteps.includes(s) && !schlussSteps.includes(s)
    );

    const formattedEinleitung = einstiegSteps.map(formatStep).join('\n\n');
    const formattedSchluss = schlussSteps.map(formatStep).join('\n\n');
    const formattedHauptteil = hauptSteps.map(formatStep).join('\n\n---\n\n');

    // Differenzierung notes
    const diffNode = `\n\nDIFFERENZIERUNG:\nStarke: ${plan.differenzierung.starke}\nSchwache: ${plan.differenzierung.schwache}`;

    setApp(prev => ({
      ...prev,
      stundenentwuerfe: prev.stundenentwuerfe.map(d => d.id === selectedDraftId ? { 
        ...d, 
        lernziele: formattedLernziele,
        einleitung: formattedEinleitung,
        hauptteil: formattedHauptteil + diffNode,
        schluss: formattedSchluss,
        material: plan.materialien
      } : d)
    }));
    setShowAI(false);
  };

  const deleteDraft = (id: string) => {
    setApp(prev => ({
      ...prev,
      stundenentwuerfe: (prev.stundenentwuerfe || []).filter(d => d.id !== id)
    }));
    
    if (selectedDraftId === id) {
      setSelectedDraftId(null);
    }
    setDraftToDelete(null);
  };

  const insertIntoWeeklyPlan = (tag: string, idx: number) => {
    if (!selectedDraft) return;
    
    const activeKW = app.currentKW || 15;

    setApp(prev => ({
      ...prev,
      wochenplanung: {
        ...prev.wochenplanung,
        [activeKW]: {
          ...(prev.wochenplanung[activeKW] || {}),
          [tag]: {
            ...(prev.wochenplanung[activeKW]?.[tag] || {}),
            [idx]: { 
              fach: selectedDraft.fach, 
              thema: selectedDraft.thema,
              type: 'standard',
              material: selectedDraft.material,
              method: `Lernziele:\n${selectedDraft.lernziele}\n\nEinstieg:\n${selectedDraft.einleitung}\n\nHauptteil:\n${selectedDraft.hauptteil}\n\nSchluss:\n${selectedDraft.schluss}`,
              social: 'single',
              reflexion: ''
            }
          }
        }
      }
    }));
    setShowWeeklyPlanInsert(false);
    // Suggest the user to navigate to weekly plan
    if(confirm('Erfolgreich eingefügt! Möchtest du zum Wochenplan wechseln?')) {
        setApp(p => ({ ...p, activeTab: 'weekly' }));
    }
  };

  return (
    <>
    <div className="flex flex-1 gap-6  print:block print:h-auto print-only-parent">
      {/* Sidebar List */}
      <div className="w-80 flex flex-col gap-4 print:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input 
            className="input-field pl-12"
            placeholder="Suchen nach Fach/Thema..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {/* Subject Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-6 px-1">
             <button 
               onClick={() => setSelectedSubject(null)}
               className={`pill ${!selectedSubject ? 'active' : ''}`}
             >
               Alle
             </button>
             {app.faecher?.map(f => (
               <button 
                 key={f}
                 onClick={() => setSelectedSubject(f)}
                 className={`pill ${selectedSubject === f ? 'active' : ''}`}
               >
                 {f}
               </button>
             ))}
          </div>

          {filteredDrafts.map(d => {
            const active = selectedDraftId === d.id;
            return (
              <div 
                key={d.id}
                onClick={() => setSelectedDraftId(d.id)}
                className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer group ${active ? 'bg-emerald-50/50 border-emerald-600 shadow-sm' : 'bg-white border-border/50 hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600">{d.fach}</div>
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setDraftToDelete(d.id);
                     }}
                     className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                     title="Löschen"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
                <div className="text-[0.875rem] font-bold text-slate-900 leading-tight mb-2">{d.thema}</div>
                <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">{d.datum.split('-').reverse().join('.')}</div>
              </div>
            );
          })}
        </div>

        <button 
          onClick={addDraft}
          className="btn w-full !rounded-[1.5rem]"
        >
          <Plus size={18} /> Neuer Entwurf
        </button>
        
        <button 
          onClick={() => {
            addDraft();
            setShowAI(true);
          }}
          className="btn btn-accent w-full !rounded-[1.5rem]"
        >
          <Sparkles size={18} /> KI-Planer
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-white border border-border rounded-[32px]  flex flex-col shadow-sm print:border-none print:shadow-none print:rounded-none print:overflow-visible print-only-parent">
        <AnimatePresence mode="wait">
          {!selectedDraft ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4"
            >
               <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center">
                  <BookOpen size={32} />
               </div>
               <p className="text-[0.8125rem] font-bold uppercase tracking-widest">Wähle einen Entwurf aus</p>
            </motion.div>
          ) : (
            <motion.div 
              key="draft"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col  print:overflow-visible print-only-parent"
            >
              <div className="p-8 border-b border-border bg-slate-50/50 flex justify-between items-end print:hidden">
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-3">
                      <select 
                          className="bg-emerald-600 text-white text-[0.625rem] px-3 py-1 rounded-full font-black uppercase tracking-widest border-none cursor-pointer shadow-lg shadow-emerald-600/20"
                          value={selectedDraft.fach}
                          onChange={e => updateDraft('fach', e.target.value)}
                      >
                          {app.faecher?.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <ChevronRight size={14} className="text-slate-300" />
                      <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-[0.2em]">Stundenentwurf</span>
                   </div>
                   <input 
                      className="text-4xl font-black bg-transparent border-none outline-none w-full text-slate-900 placeholder:text-slate-200 tracking-tight"
                      value={selectedDraft.thema}
                      onChange={e => updateDraft('thema', e.target.value)}
                      placeholder="Thema der Stunde..."
                   />
                   <div className="flex items-center gap-4 mt-8 print:hidden">
                       <div className="flex items-center gap-3 text-slate-400">
                           <Calendar size={16} />
                           <input 
                               type="date"
                               className="text-[0.75rem] font-black uppercase tracking-widest bg-transparent border-none outline-none text-slate-600"
                               value={selectedDraft.datum}
                               onChange={e => updateDraft('datum', e.target.value)}
                           />
                       </div>
                       <button 
                         onClick={() => setIsEditMode(!isEditMode)}
                         className={`pill ${isEditMode ? 'active' : ''}`}
                       >
                         {isEditMode ? 'Ansicht verlassen' : 'Bearbeiten Mode'}
                       </button>
                    </div>
                  </div>

                  <div className="flex gap-3 print:hidden">
                    <button 
                      onClick={copyToClipboard}
                      className="p-4 bg-white border border-slate-200 rounded-[1.25rem] hover:bg-slate-50 transition-all text-slate-600 shadow-sm relative group"
                    >
                      {copySuccess ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[0.625rem] font-black uppercase px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        Kopieren
                      </div>
                    </button>
                    <button 
                      onClick={() => setShowAI(true)}
                      className="btn btn-accent !rounded-[1.25rem] px-8 h-auto py-4"
                    >
                      <Sparkles size={16} /> KI Verbessern
                    </button>
                  </div>
              </div>

              {isEditMode ? (
                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 custom-scrollbar print:hidden">
                   <div className="space-y-10">
                      <section className="space-y-3">
                          <h4 className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">
                              <ClipboardList size={14} /> Lernziele
                          </h4>
                          <textarea 
                              className="input-field min-h-[120px] resize-none"
                              placeholder="Was sollen die Kinder am Ende können?..."
                              value={selectedDraft.lernziele}
                              onChange={e => updateDraft('lernziele', e.target.value)}
                          />
                      </section>

                      <section className="space-y-3">
                          <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 px-1">Einleitung (Phase 1)</h4>
                          <textarea 
                              className="input-field min-h-[120px] resize-none bg-emerald-50/10"
                              placeholder="Motivation, Vorwissen, Einstieg..."
                              value={selectedDraft.einleitung}
                              onChange={e => updateDraft('einleitung', e.target.value)}
                          />
                      </section>

                      <section className="space-y-3">
                        <h4 className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 px-1">
                          <Plus size={14} /> Medien / Material
                        </h4>
                        <textarea 
                            className="input-field min-h-[100px] resize-none border-dashed"
                            placeholder="Was wird benötigt?..."
                            value={selectedDraft.material}
                            onChange={e => updateDraft('material', e.target.value)}
                        />
                      </section>
                   </div>

                   <div className="space-y-10">
                      <section className="space-y-3">
                          <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 px-1">Hauptteil (Erarbeitung)</h4>
                          <textarea 
                              className="input-field min-h-[240px] resize-none bg-emerald-50/10"
                              placeholder="Aktivitäten, Methoden, Aufgaben..."
                              value={selectedDraft.hauptteil}
                              onChange={e => updateDraft('hauptteil', e.target.value)}
                          />
                      </section>
                      
                      <section className="space-y-3">
                          <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 px-1">Schluss (Sicherung)</h4>
                          <textarea 
                              className="input-field min-h-[120px] resize-none bg-emerald-50/10"
                              placeholder="Reflexion, Feedback, Ausblick..."
                              value={selectedDraft.schluss}
                              onChange={e => updateDraft('schluss', e.target.value)}
                          />
                      </section>
                   </div>
                </div>
              ) : (
                /* Paper View / Overview */
                <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-slate-50/30 print:hidden">
                   <div className="max-w-4xl mx-auto space-y-16">
                      <div className="flex gap-12">
                        <section className="flex-1 space-y-6">
                           <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                             <div className="w-2 h-6 bg-slate-900 rounded-full" /> Lernziele
                           </h2>
                           <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm text-[0.9375rem] leading-relaxed text-slate-700 whitespace-pre-wrap">
                             {selectedDraft.lernziele || 'Keine Lernziele angegeben.'}
                           </div>
                        </section>
                        <section className="w-72 space-y-6">
                           <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                             <div className="w-2 h-6 bg-emerald-500 rounded-full" /> Materialien
                           </h2>
                           <div className="p-8 bg-emerald-50/50 rounded-3xl border border-emerald-100 text-[0.8125rem] leading-relaxed text-slate-700 italic whitespace-pre-wrap">
                             {selectedDraft.material || 'Standard-Unterrichtsmittel'}
                           </div>
                        </section>
                      </div>

                      <section className="space-y-10">
                        <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                          <div className="w-2 h-6 bg-slate-900 rounded-full" /> Verlaufsplan
                        </h2>
                        
                        <div className="space-y-8">
                           <div className="grid grid-cols-[140px_1fr] gap-8 group">
                              <div className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-emerald-600 pt-1">
                                Einstieg
                              </div>
                              <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm group-hover:shadow-md transition-shadow text-[0.9375rem] leading-relaxed text-slate-800 whitespace-pre-wrap border-l-8 border-l-emerald-100">
                                {selectedDraft.einleitung}
                              </div>
                           </div>

                           <div className="grid grid-cols-[140px_1fr] gap-8 group">
                              <div className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-indigo-600 pt-1">
                                Hauptteil
                              </div>
                              <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm group-hover:shadow-md transition-shadow text-[0.9375rem] leading-relaxed text-slate-800 whitespace-pre-wrap border-l-8 border-l-indigo-100">
                                {selectedDraft.hauptteil}
                              </div>
                           </div>

                           <div className="grid grid-cols-[140px_1fr] gap-8 group">
                              <div className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-amber-600 pt-1">
                                Schluss
                              </div>
                              <div className="p-8 bg-white border border-slate-100 rounded-[2rem] shadow-sm group-hover:shadow-md transition-shadow text-[0.9375rem] leading-relaxed text-slate-800 whitespace-pre-wrap border-l-8 border-l-amber-100">
                                {selectedDraft.schluss}
                              </div>
                           </div>
                        </div>
                      </section>
                   </div>
                </div>
              )}

              <div className="p-4 border-t border-border bg-slate-50/50 flex justify-between items-center px-8 print:hidden">
                 
                 <div className="flex gap-3">
                    <button 
                      onClick={() => setDraftToDelete(selectedDraft.id)}
                      className="btn btn-sm btn-ghost !text-red-500 hover:!bg-red-50"
                    >
                      <Trash2 size={16} /> Löschen
                    </button>
                    <button 
                      onClick={() => setShowWeeklyPlanInsert(true)}
                      className="btn btn-sm"
                    >
                      <CalendarPlus size={16} /> In Wochenplan
                    </button>
                    
                 </div>
              </div>

              {/* Print Only View */}
              <div className="hidden print:block print-only bg-white p-12">
                <div className="max-w-4xl mx-auto space-y-12">
                  <div className="border-b-8 border-slate-900 pb-10 mb-16 flex justify-between items-end">
                    <div>
                      <div className="text-[0.875rem] font-black uppercase tracking-[0.3em] text-emerald-600 mb-3">{selectedDraft.fach}</div>
                      <h1 className="text-6xl font-black tracking-tighter text-slate-900 mb-4">{selectedDraft.thema}</h1>
                      <div className="flex gap-4 items-center">
                        <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[0.75rem] font-black uppercase tracking-widest text-slate-600">Stundenentwurf</div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <div className="text-[0.75rem] font-bold text-slate-500">{app.stufe}. Klasse</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1">Datum:</div>
                      <div className="text-[1.5rem] leading-normal font-black">{new Date(selectedDraft.datum).toLocaleDateString('de-DE')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-16">
                    <section className="space-y-6">
                      <h2 className="text-[1.5rem] leading-normal font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-4 flex items-center gap-4">
                        <div className="w-3 h-8 bg-slate-900" />
                        1. Lernziele & Kompetenzen
                      </h2>
                      <div className="text-[1.25rem] leading-normal leading-relaxed text-slate-800 whitespace-pre-wrap pl-8">
                        {selectedDraft.lernziele}
                      </div>
                    </section>

                    <section className="space-y-8">
                      <h2 className="text-[1.5rem] leading-normal font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-4 flex items-center gap-4">
                        <div className="w-3 h-8 bg-emerald-500" />
                        2. Verlaufsplan
                      </h2>
                      
                      <div className="space-y-12">
                        <div className="relative pl-10 border-l-4 border-emerald-500">
                          <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                          <div className="text-[0.75rem] font-black uppercase text-emerald-600 mb-4 tracking-widest">Phase 1: Einstieg</div>
                          <div className="text-[1.25rem] leading-normal leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {selectedDraft.einleitung}
                          </div>
                        </div>

                        <div className="relative pl-10 border-l-4 border-indigo-500">
                          <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-indigo-500 border-4 border-white shadow-sm" />
                          <div className="text-[0.75rem] font-black uppercase text-indigo-600 mb-4 tracking-widest">Phase 2: Hauptteil / Erarbeitung</div>
                          <div className="text-[1.25rem] leading-normal leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {selectedDraft.hauptteil}
                          </div>
                        </div>

                        <div className="relative pl-10 border-l-4 border-amber-500">
                          <div className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-amber-500 border-4 border-white shadow-sm" />
                          <div className="text-[0.75rem] font-black uppercase text-amber-600 mb-4 tracking-widest">Phase 3: Schluss / Sicherung</div>
                          <div className="text-[1.25rem] leading-normal leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {selectedDraft.schluss}
                          </div>
                        </div>
                      </div>
                    </section>

                    {selectedDraft.material && (
                      <section className="space-y-6 pt-10">
                        <h2 className="text-[1.5rem] leading-normal font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-100 pb-4 flex items-center gap-4">
                          <div className="w-3 h-8 bg-slate-400" />
                          3. Materialien & Medien
                        </h2>
                        <div className="p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-100 text-[1.25rem] leading-normal leading-relaxed text-slate-700 whitespace-pre-wrap shadow-inner">
                          {selectedDraft.material}
                        </div>
                      </section>
                    )}
                  </div>

                  <div className="mt-40 pt-10 border-t border-slate-100 text-center opacity-30 italic text-[0.875rem] leading-snug">
                    Plan erstellt am {new Date().toLocaleDateString()} — Alle Rechte vorbehalten.
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    
    <AnimatePresence>
      {showAI && (
        <LessonPlannerAI 
          onClose={() => setShowAI(false)} 
          onApply={applyAIPlan}
          initialFach={selectedDraft?.fach}
          initialThema={selectedDraft?.thema}
        />
      )}
    </AnimatePresence>

    {/* Custom Confirmation Modal */}
    <AnimatePresence>
      {draftToDelete && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm print:hidden">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-[1.25rem] leading-normal font-black mb-2 uppercase tracking-tight">Entwurf löschen?</h3>
            <p className="text-slate-500 text-[0.875rem] leading-snug mb-8 leading-relaxed">
              Dieser Entwurf wird dauerhaft entfernt. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDraftToDelete(null)}
                className="py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-[0.875rem] leading-snug hover:bg-slate-200 transition-colors"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => deleteDraft(draftToDelete)}
                className="py-3 bg-red-600 text-white rounded-xl font-bold text-[0.875rem] leading-snug hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
              >
                Löschen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    {/* WEEKLY PLAN INSERT MODAL */}
    <AnimatePresence>
        {showWeeklyPlanInsert && (
          <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-[40px] shadow-3xl w-full max-w-3xl flex flex-col "
            >
              <div className="p-8 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tighter">In Wochenplan einfügen</h3>
                  <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Wähle eine Stunde aus (KW {app.currentKW || '?'}
                    {(() => {
                      if (!app.currentKW) return '';
                      const sw = getSW(kwToMonday(app.currentKW, getStartYear(app.schuljahr)), app?.schuljahr);
                      return sw ? ` • SW ${sw}` : '';
                    })()}
                    )
                  </p>
                </div>
                <button onClick={() => setShowWeeklyPlanInsert(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24} /></button>
              </div>

              <div className="p-8 overflow-x-auto">
                <div className="grid grid-cols-[60px_repeat(5,1fr)] border border-slate-200 rounded-3xl  min-w-[600px]">
                  <div className="p-3 bg-slate-50 border-r border-b border-slate-200 text-[0.625rem] font-black text-slate-400 uppercase text-center">Std</div>
                  {TAGE_NAMEN.map(tag => (
                    <div key={tag} className="p-3 bg-slate-50 border-r border-b border-slate-200 text-[0.625rem] font-black text-slate-400 uppercase text-center">{tag}</div>
                  ))}
                  
                  {[0,1,2,3,4,5].map(zIdx => (
                    <React.Fragment key={zIdx}>
                      <div className="p-3 border-r border-b border-slate-100 bg-slate-50/50 flex items-center justify-center font-black text-slate-400">{zIdx + 1}</div>
                      {TAGE_NAMEN.map(tag => {
                        const existing = app.wochenplanung[app.currentKW || 0]?.[tag]?.[zIdx];
                        return (
                          <button 
                            key={tag}
                            onClick={() => insertIntoWeeklyPlan(tag, zIdx)}
                            className={`p-2 border-r border-b border-slate-100 h-16 transition-all hover:bg-emerald-50 flex flex-col items-center justify-center gap-1 group relative`}
                          >
                            {existing ? (
                              <div className="text-[0.5rem] font-bold text-slate-400 text-wrap leading-tight break-words w-full text-center opacity-50">{existing.fach}</div>
                            ) : (
                              <Plus size={16} className="text-slate-200 group-hover:text-emerald-500 transition-colors" />
                            )}
                            <div className="absolute inset-0 bg-emerald-500 opacity-0 group-hover:opacity-5 transition-opacity" />
                          </button>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
