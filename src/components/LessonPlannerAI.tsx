
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  X, 
  Plus,
  Loader2, 
  Check, 
  CheckCircle2,
  ChevronRight, 
  BrainCircuit, 
  Target, 
  Clock,
  Layout,
  MessageSquare,
  Zap,
  Bot,
  ArrowRight,
  FileText,
  Eye,
  CalendarPlus,
  Printer,
  Copy,
  Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateDetailedLessonPlan, DetailedLessonPlan } from '../services/aiService';
import { TAGE_NAMEN, VM_ZEITEN, STUNDEN_INFO } from '../constants';
import { useMaterialLibrary } from './Materialbibliothek';
import { getSW, kwToMonday, getStartYear } from '../lib/utils';

interface LessonPlannerAIProps {
  onClose: () => void;
  onApply: (plan: DetailedLessonPlan) => void;
  initialFach?: string;
  initialThema?: string;
}

export default function LessonPlannerAI({ onClose, onApply, initialFach, initialThema }: LessonPlannerAIProps) {
  const { app, setApp } = useApp();
  const [fach, setFach] = useState(initialFach || 'Mathematik');
  const [thema, setThema] = useState(initialThema || '');
  const [duration, setDuration] = useState(50);
  const [lernziel, setLernziel] = useState('');
  const [eigenesMaterial, setEigenesMaterial] = useState('');
  const [selectedCommon, setSelectedCommon] = useState<string[]>([]);
  const [socialForm, setSocialForm] = useState('Flexibel');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DetailedLessonPlan | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showWeeklyPlanInsert, setShowWeeklyPlanInsert] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [saveMaterialSuccess, setSaveMaterialSuccess] = useState(false);
  const { addMaterialFromAI } = useMaterialLibrary();

  const saveToMaterialLibrary = () => {
    if (!plan) return;
    
    const content = `
STUNDENENTWURF: ${thema}
Fach: ${fach}
Dauer: ${duration} Min.

LERNZIELE:
Kognitiv: ${plan.lernziele.kognitiv}
Affektiv: ${plan.lernziele.affektiv}
Instrumental: ${plan.lernziele.instrumental}

VERLAUFSPLAN:
${plan.verlaufsplan.map((s, i) => `${i+1}. [${s.zeit}] ${s.phase}: ${s.aktion} (${s.sozialform})`).join('\n\n')}

MATERIALIEN:
${plan.materialien}

DIFFERENZIERUNG:
Starke: ${plan.differenzierung.starke}
Schwache: ${plan.differenzierung.schwache}
    `.trim();

    addMaterialFromAI({
      titel: thema || 'KI-Stundenentwurf',
      beschreibung: `${fach}, ${duration} Min. Generiert am ${new Date().toLocaleDateString('de-DE')}.`,
      typ: 'stundenentwurf',
      inhaltText: content,
      faecher: [fach],
      schulstufen: [app.stufe],
      tags: ['KI', 'Stundenentwurf', fach],
      dauer: duration,
      lernziel: plan.lernziele.kognitiv
    }, 'KI-Planer');

    setSaveMaterialSuccess(true);
    setTimeout(() => setSaveMaterialSuccess(false), 3000);
  };

  const savePlan = () => {
    if (!plan) return;
    const newEntwurf = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      fach,
      thema,
      plan
    };
    setApp(prev => ({
      ...prev,
      stundenentwuerfe: [newEntwurf, ...(prev.stundenentwuerfe || [])]
    }));
    alert('Stundenentwurf erfolgreich unter "Archiv" gespeichert!');
  };

  const copyPlanToClipboard = () => {
    if (!plan) return;
    const text = `
STUNDENENTWURF: ${thema}
Fach: ${fach}
Dauer: ${duration} Min.

LERNZIELE:
Kognitiv: ${plan.lernziele.kognitiv}
Affektiv: ${plan.lernziele.affektiv}

VERLAUFSPLAN:
${plan.verlaufsplan.map((s, i) => `${i+1}. [${s.zeit}] ${s.phase}: ${s.aktion}`).join('\n')}

MATERIALIEN:
${plan.materialien}

DIFFERENZIERUNG:
Starke: ${plan.differenzierung.starke}
Schwache: ${plan.differenzierung.schwache}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const commonMaterials = [
    'Digitale Tafel', 
    'iPads / Tablets', 
    'Schulbuch', 
    'Arbeitsblätter', 
    'Dokumentenkamera', 
    'Experimentierkasten', 
    'Laptops'
  ];

  const socialForms = [
    'Flexibel',
    'Frontalunterricht',
    'Gruppenarbeit',
    'Einzelarbeit',
    'Partnerarbeit',
    'Stationsbetrieb',
    'Wochenplan'
  ];

  const toggleCommon = (item: string) => {
    setSelectedCommon(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleGenerate = async () => {
    if (!thema || !lernziel) {
      alert('Bitte fülle Thema und Lernziel aus.');
      return;
    }

    setLoading(true);
    
    // Aggregate class context
    const classContext = `
      Klasse: ${app.stufe}. Schulstufe, ${app.schueler.length} Schüler/innen.
      Niveau (Notenmappe): ${app.notenmappe ? 'Detaillierte Noten vorhanden' : 'Keine Noten hinterlegt'}
      Notizen zu Schülern: ${app.schueler.map(s => s.notiz).filter(Boolean).slice(0, 10).join('; ')}
    `;

    const allMaterials = [...selectedCommon, eigenesMaterial].filter(Boolean).join(', ');

    const result = await generateDetailedLessonPlan(
      fach,
      thema,
      `${duration} Minuten`,
      lernziel,
      app.stufe,
      classContext,
      allMaterials,
      socialForm
    );

    if (typeof result === 'string') {
      alert(result);
    } else if (result) {
      setPlan(result);
    } else {
      alert('Fehler bei der Generierung. Bitte prüfe deinen API-Key.');
    }
    setLoading(false);
  };

  const insertIntoWeeklyPlan = (tag: string, idx: number) => {
    if (!plan) return;
    
    const activeKW = app.currentKW || 15; // fallback

    setApp(prev => ({
      ...prev,
      wochenplanung: {
        ...prev.wochenplanung,
        [activeKW]: {
          ...(prev.wochenplanung[activeKW] || {}),
          [tag]: {
            ...(prev.wochenplanung[activeKW]?.[tag] || {}),
            [idx]: { 
              fach: fach, 
              thema: thema,
              type: 'standard',
              material: plan.materialien,
              method: plan.verlaufsplan.map(s => `${s.phase}: ${s.aktion}`).join('\n\n'),
              social: socialForm.includes('Gruppe') ? 'group' : socialForm.includes('Partner') ? 'partner' : 'single',
              reflexion: ''
            }
          }
        }
      }
    }));
    setShowWeeklyPlanInsert(false);
    alert('Erfolgreich in den Wochenplan eingefügt!');
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[92vh]  flex flex-col"
      >
        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Bot size={28} />
            </div>
            <div>
              <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-tight">KI-Stundenplaner</h2>
              <p className="text-white/70 text-[0.6875rem] font-bold uppercase tracking-widest">Powered by Gemini AI Assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1  flex flex-col md:flex-row">
          {/* Input Panel */}
          <div className="w-full md:w-80 border-r border-slate-100 p-6 space-y-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <Layout size={12} /> Fach
                </label>
                <select 
                  className="input-field py-3 px-4"
                  value={fach}
                  onChange={e => setFach(e.target.value)}
                >
                  {app.faecher?.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <Target size={12} /> Thema
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Brüche addieren"
                  className="input-field py-3 px-4"
                  value={thema}
                  onChange={e => setThema(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <Clock size={12} /> Zeitrahmen (Minuten)
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input 
                      type="number"
                      className="input-field py-3 px-4 pr-12"
                      value={duration}
                      onChange={e => setDuration(parseInt(e.target.value) || 0)}
                      min="1"
                    />
                    <div className="absolute right-4 top-3.5 text-[0.625rem] font-black uppercase text-slate-400 pointer-events-none">
                      Min
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 30, 40, 50, 60, 90].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setDuration(m)}
                        className={`pill ${duration === m ? 'active' : ''}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <Layout size={12} /> Bevorzugte Methode
                </label>
                <select 
                  className="input-field py-3 px-4"
                  value={socialForm}
                  onChange={e => setSocialForm(e.target.value)}
                >
                  {socialForms.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <MessageSquare size={12} /> Grobes Lernziel
                </label>
                <textarea 
                  placeholder="z.B. Die Kinder sollen die Regeln verstehen..."
                  className="input-field h-24 py-3 px-4 resize-none"
                  value={lernziel}
                  onChange={e => setLernziel(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1">
                  <FileText size={12} /> Materialien & Ressourcen
                </label>
                
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {commonMaterials.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleCommon(item)}
                      className={`pill ${selectedCommon.includes(item) ? 'active' : ''}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <textarea 
                  placeholder="Weitere Materialien (z.B. Buch S. 20)..."
                  className="input-field h-24 py-3 px-4 resize-none border-dashed"
                  value={eigenesMaterial}
                  onChange={e => setEigenesMaterial(e.target.value)}
                />
              </div>
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="btn btn-accent w-full py-5 text-[0.75rem]"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Generiere...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Entwurf erstellen
                </>
              )}
            </button>
          </div>

          {/* Preview Panel */}
          <div className="flex-1 p-6 md:p-10 overflow-y-auto bg-slate-50/50 custom-scrollbar">
            {plan ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-10 max-w-4xl mx-auto"
              >
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-4 items-center justify-between bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100/50">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setShowOverview(true)}
                      className="btn btn-sm"
                    >
                      <Eye size={16} /> Übersicht
                    </button>
                    <button 
                      onClick={saveToMaterialLibrary}
                      className={`btn btn-sm ${saveMaterialSuccess ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-none'}`}
                    >
                      {saveMaterialSuccess ? <Check size={16} /> : <Archive size={16} />}
                      {saveMaterialSuccess ? 'Gesichert!' : 'In Mediathek'}
                    </button>
                    <button 
                      onClick={savePlan}
                      className="btn btn-sm bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none"
                    >
                      <CheckCircle2 size={16} /> Archiv
                    </button>
                    <button 
                      onClick={copyPlanToClipboard}
                      className="btn btn-sm"
                    >
                      {copySuccess ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />} 
                      {copySuccess ? 'Kopiert!' : 'Kopieren'}
                    </button>
                    
                  </div>

                  <button 
                    onClick={() => setShowWeeklyPlanInsert(true)}
                    className="btn btn-primary btn-sm h-12"
                  >
                    <CalendarPlus size={16} /> In Wochenplan einfügen
                  </button>
                </div>

                {/* Lernziele */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800">Konkrete Lernziele</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <div className="text-[0.625rem] font-black uppercase text-emerald-600 mb-2 flex items-center gap-2">
                        <BrainCircuit size={14} /> Kognitiv
                      </div>
                      <div className="text-[0.8125rem] font-medium leading-relaxed text-slate-700">{plan.lernziele.kognitiv}</div>
                    </div>
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <div className="text-[0.625rem] font-black uppercase text-indigo-600 mb-2 flex items-center gap-2">
                        <Target size={14} /> Affektiv
                      </div>
                      <div className="text-[0.8125rem] font-medium leading-relaxed text-slate-700">{plan.lernziele.affektiv}</div>
                    </div>
                    <div className="p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <div className="text-[0.625rem] font-black uppercase text-amber-600 mb-2 flex items-center gap-2">
                        <Zap size={14} /> Instrumental
                      </div>
                      <div className="text-[0.8125rem] font-medium leading-relaxed text-slate-700">{plan.lernziele.instrumental}</div>
                    </div>
                  </div>
                </section>

                {/* Verlaufsplan as Timeline */}
                <section>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800">Stundenverlauf</h3>
                  </div>
                  
                  <div className="space-y-0 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {plan.verlaufsplan.map((step, i) => (
                      <div key={i} className="relative pl-12 pb-10 last:pb-0">
                        {/* Dot */}
                        <div className="absolute left-0 top-1 w-9 h-9 rounded-full bg-white border-4 border-emerald-500 shadow-sm z-10 flex items-center justify-center">
                          <span className="text-[0.625rem] font-black text-emerald-600">{i + 1}</span>
                        </div>
                        
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3">
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[0.625rem] font-black uppercase tracking-widest rounded-full">
                                {step.phase}
                              </span>
                              <span className="flex items-center gap-1.5 text-slate-400 font-bold text-[0.75rem]">
                                <Clock size={14} /> {step.zeit}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col items-end">
                                <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-tighter">Sozialform</span>
                                <span className="text-[0.6875rem] font-bold text-slate-600">{step.sozialform}</span>
                              </div>
                              <div className="w-px h-6 bg-slate-100" />
                              <div className="flex flex-col items-end">
                                <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-tighter">Medien</span>
                                <span className="text-[0.6875rem] font-bold text-slate-600">{step.medien}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-[0.875rem] font-medium leading-relaxed text-slate-800 whitespace-pre-wrap">
                            {step.aktion}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Materialien */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800">Inhalt / Aufgabenstellung</h3>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative  group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <FileText size={80} />
                    </div>
                    <div className="text-[0.875rem] font-medium leading-relaxed text-slate-700 whitespace-pre-wrap relative z-10">
                      {plan.materialien}
                    </div>
                  </div>
                </section>

                {/* Differenzierung */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800">Differenzierung</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white"><ArrowRight size={14} /></div>
                         <h4 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-emerald-700">Schneller / Stärker</h4>
                      </div>
                      <p className="text-[0.8125rem] font-medium leading-relaxed text-emerald-900/80">{plan.differenzierung.starke}</p>
                    </div>
                    <div className="bg-rose-50/50 p-6 rounded-[2rem] border border-rose-100">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center text-white rotate-180"><ArrowRight size={14} /></div>
                         <h4 className="text-[0.6875rem] font-black uppercase tracking-[0.2em] text-rose-700">Langsamer / Schwächer</h4>
                      </div>
                      <p className="text-[0.8125rem] font-medium leading-relaxed text-rose-900/80">{plan.differenzierung.schwache}</p>
                    </div>
                  </div>
                </section>

                <div className="flex justify-center pt-8 pb-12">
                  <button 
                    onClick={() => onApply(plan)}
                    className="btn btn-accent px-12 py-5"
                  >
                    <Check size={20} /> Entwurf vervollständigen
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50 p-12 text-center">
                <BrainCircuit size={64} className="mb-2" />
                <div className="space-y-1">
                  <p className="text-[0.875rem] leading-snug font-black uppercase tracking-widest">Bereit zur Analyse</p>
                  <p className="text-[0.75rem] max-w-xs font-medium italic">Gib die Rahmendaten ein und die KI erstellt einen fachdidaktisch fundierten Entwurf.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* OVERVIEW MODAL / PRINT VIEW */}
      <AnimatePresence>
        {showOverview && plan && (
          <div className="fixed inset-0 z-[400] bg-white flex flex-col p-8 md:p-12 overflow-y-auto print:p-0 print:static print:h-auto">
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * { visibility: hidden; }
                .print-content, .print-content * { visibility: visible; }
                .print-content { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  padding: 2cm;
                }
                .no-print { display: none !important; }
                @page { margin: 1cm; }
                .page-break { page-break-before: always; }
              }
            ` }} />
            
            <div className="max-w-4xl mx-auto w-full space-y-12 print-content">
              <div className="flex justify-between items-end border-b-4 border-slate-900 pb-8">
                <div>
                  <div className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-emerald-600 mb-2">{fach}</div>
                  <h1 className="text-5xl font-black tracking-tight text-slate-900">{thema}</h1>
                  <div className="flex items-center gap-4 mt-4 text-slate-500 font-bold text-[0.8125rem] uppercase tracking-widest">
                    <span>{duration} Min</span>
                    <span className="opacity-20">|</span>
                    <span>{app.stufe}. Schulstufe</span>
                    <span className="opacity-20">|</span>
                    <span>{socialForm}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setShowOverview(false)}
                  className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all text-slate-900 no-print"
                >
                  <ArrowRight size={24} className="rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 print:grid-cols-2">
                <section className="space-y-6">
                  <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-6 bg-emerald-500 rounded-full" /> Lernziele
                  </h2>
                  <div className="space-y-4">
                    <div>
                        <div className="text-[0.625rem] font-black uppercase text-emerald-600 mb-1">Kognitiv</div>
                        <p className="text-[0.9375rem] leading-relaxed text-slate-700">{plan.lernziele.kognitiv}</p>
                    </div>
                    <div>
                        <div className="text-[0.625rem] font-black uppercase text-indigo-600 mb-1">Affektiv</div>
                        <p className="text-[0.9375rem] leading-relaxed text-slate-700">{plan.lernziele.affektiv}</p>
                    </div>
                    <div>
                        <div className="text-[0.625rem] font-black uppercase text-amber-600 mb-1">Instrumental</div>
                        <p className="text-[0.9375rem] leading-relaxed text-slate-700">{plan.lernziele.instrumental}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="w-2 h-6 bg-slate-900 rounded-full" /> Materialien
                  </h2>
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 text-[0.9375rem] leading-relaxed text-slate-700 italic print:bg-white print:border-slate-100">
                    {plan.materialien}
                  </div>
                </section>
              </div>

              <section className="space-y-8 page-break">
                <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                  <div className="w-2 h-6 bg-emerald-500 rounded-full" /> Verlaufsplan
                </h2>
                <div className="space-y-4">
                  {plan.verlaufsplan.map((s, i) => (
                    <div key={i} className="flex gap-6 p-6 bg-white border border-slate-100 rounded-3xl hover:shadow-md transition-shadow print:border-slate-200 print:shadow-none print:break-inside-avoid mb-4">
                      <div className="text-[1.5rem] leading-normal font-black text-slate-200 w-8">{i + 1}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-center text-[0.6875rem] font-black uppercase tracking-widest">
                          <span className="text-emerald-600">{s.phase}</span>
                          <span className="text-slate-400">{s.zeit} | {s.sozialform} | {s.medien}</span>
                        </div>
                        <p className="text-[0.9375rem] leading-relaxed text-slate-800">{s.aktion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-6 page-break">
                <h2 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest flex items-center gap-3">
                  <div className="w-2 h-6 bg-indigo-500 rounded-full" /> Differenzierung
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-2">Schneller / Stärker</h3>
                    <p className="text-[0.875rem] text-slate-700 leading-relaxed">{plan.differenzierung.starke}</p>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-2">Langsamer / Schwächer</h3>
                    <p className="text-[0.875rem] text-slate-700 leading-relaxed">{plan.differenzierung.schwache}</p>
                  </div>
                </div>
              </section>

              <div className="pt-12 flex justify-center no-print">
                
              </div>
            </div>
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
                <button onClick={() => setShowWeeklyPlanInsert(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
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
    </div>
  );
}
