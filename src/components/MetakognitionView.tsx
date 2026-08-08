import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MetaKognitionsProtokoll, LernStrategie } from '../types';
import { Plus, CheckSquare, BookOpen, Brain, TrendingUp, Calendar, Loader2, Sparkles, X, ChevronRight, Save, Trash2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FAECHER_H } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateMetakognitionFeedback } from '../services/aiService';

const STRATEGIEN_INFO: Record<LernStrategie, { label: string; desc: string; icon: string }> = {
  active_recall: { label: 'Active Recall', desc: 'Ich frage mich selbst ab, ohne ins Heft zu schauen', icon: '🧠' },
  spaced_repetition: { label: 'Spaced Repetition', desc: 'Ich lerne über mehrere Tage verteilt, nicht alles auf einmal', icon: '📅' },
  chunking: { label: 'Chunking', desc: 'Ich teile den Stoff in kleine Blöcke auf', icon: '🧩' },
  elaboration: { label: 'Elaboration', desc: 'Ich erkläre den Stoff jemandem oder mir selbst', icon: '💬' },
  lernkarten: { label: 'Lernkarten', desc: 'Ich schreibe Karteikarten und übe damit', icon: '🃏' },
  vorlesen: { label: 'Vorlesen', desc: 'Ich lese laut vor oder erkläre es laut', icon: '🔊' },
  abschreiben: { label: 'Abschreiben', desc: 'Ich schreibe den Stoff ab und unterstreiche', icon: '✏️' },
  ueben: { label: 'Üben', desc: 'Ich rechne/übe viele Aufgaben durch', icon: '📝' },
  nichts: { label: 'Nicht gelernt', desc: '', icon: '😴' },
  sonstiges: { label: 'Sonstiges', desc: '', icon: '🤔' },
};

const EMOTIONS = [
  { value: 1, emoji: '😄' },
  { value: 2, emoji: '🙂' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '😕' },
  { value: 5, emoji: '😟' },
];

const REAKTIONEN = [
  { value: 'zufrieden', emoji: '😌', label: 'Zufrieden' },
  { value: 'ok', emoji: '😐', label: 'Ok' },
  { value: 'enttaeuscht', emoji: '😞', label: 'Enttäuscht' },
  { value: 'ueberrascht_positiv', emoji: '😲', label: 'Positiv überrascht' },
  { value: 'ueberrascht_negativ', emoji: '😵', label: 'Negativ überrascht' },
];

export const MetakognitionView: React.FC = () => {
  const { app, setApp } = useApp();
  const protokolle = app.metaKognitionsProtokolle || [];
  const schuelerList = [...(app.schueler || [])].sort((a,b) => a.vorname.localeCompare(b.vorname));
  
  const [activeView, setActiveView] = useState<'liste' | 'analyse'>('liste');
  const [modalMode, setModalMode] = useState<'none' | 'new' | 'edit_phase2'>('none');
  const [editItem, setEditItem] = useState<Partial<MetaKognitionsProtokoll> | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [analyseStudent, setAnalyseStudent] = useState<string>('all');

  const offenen = protokolle.filter(p => !p.nachPhase).sort((a,b) => new Date(a.pruefungsDatum).getTime() - new Date(b.pruefungsDatum).getTime());
  const abgeschlossenen = protokolle.filter(p => !!p.nachPhase).sort((a,b) => new Date(b.pruefungsDatum).getTime() - new Date(a.pruefungsDatum).getTime());

  const handleCreateNew = () => {
    setEditItem({
      id: `meta_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
      schuelerId: schuelerList[0]?.id || '',
      fach: FAECHER_H[0],
      pruefungsDatum: new Date().toISOString().split('T')[0],
      vorPhase: {
        erfasstAm: new Date().toISOString(),
        lernStrategien: [],
        lernDauer: 30,
        selbstEinschaetzung: 3,
        lernOrt: 'Zuhause'
      }
    });
    setModalMode('new');
  };

  const savePhase1 = () => {
    if (!editItem || !editItem.schuelerId) return;
    setApp(prev => ({
      ...prev,
      metaKognitionsProtokolle: [...(prev.metaKognitionsProtokolle || []), editItem as MetaKognitionsProtokoll]
    }));
    setModalMode('none');
    setEditItem(null);
  };

  const openPhase2 = (p: MetaKognitionsProtokoll) => {
    setEditItem({
       ...p,
       nachPhase: {
          erfasstAm: new Date().toISOString(),
          note: 3,
          kindReaktion: 'ok',
          strategieWirksam: null
       }
    });
    setModalMode('edit_phase2');
  };

  const savePhase2 = () => {
    if (!editItem) return;
    setApp(prev => ({
      ...prev,
      metaKognitionsProtokolle: (prev.metaKognitionsProtokolle || []).map(x => x.id === editItem.id ? (editItem as MetaKognitionsProtokoll) : x)
    }));
    setModalMode('none');
    setEditItem(null);
  };

  const generateFeedback = async () => {
    if (!editItem || !editItem.nachPhase || !editItem.vorPhase) return;
    setIsGenerating(true);
    const student = schuelerList.find(s => s.id === editItem.schuelerId);
    
    const feedback = await generateMetakognitionFeedback(
       student?.vorname || 'Kind',
       student?.besuchsjahr || 'X',
       editItem.vorPhase.lernStrategien.map(s => STRATEGIEN_INFO[s as LernStrategie].label),
       editItem.vorPhase.lernDauer || 0,
       editItem.vorPhase.selbstEinschaetzung || 3,
       editItem.nachPhase.note || 3,
       editItem.nachPhase.kindReaktion,
       editItem.nachPhase.strategieWirksam ? 'Wirksam' : editItem.nachPhase.strategieWirksam === false ? 'Nicht wirksam' : 'Teilweise'
    );
    
    if (feedback) {
       setEditItem({
          ...editItem,
          nachPhase: { ...editItem.nachPhase, feedbackText: feedback }
       });
    }
    setIsGenerating(false);
  };

  const removeProtokoll = (id: string) => {
    if (!confirm('Protokoll löschen?')) return;
    setApp(prev => ({
      ...prev,
      metaKognitionsProtokolle: (prev.metaKognitionsProtokolle || []).filter(x => x.id !== id)
    }));
  };

  // ANALYSE DATEN
  const analyseData = useMemo(() => {
    const list = analyseStudent === 'all' ? abgeschlossenen : abgeschlossenen.filter(x => x.schuelerId === analyseStudent);
    if (list.length === 0) return { stratMap: [], accuracy: 0, total: 0 };
    
    const map = new Map<LernStrategie, { count: number, totalNote: number, wirksamCount: number }>();
    let accMatches = 0;

    list.forEach(p => {
       const note = p.nachPhase!.note;
       const ein = p.vorPhase!.selbstEinschaetzung;
       // 1-2 Note = 1-2 Einschaetzung
       if ((note <= 2 && ein <= 2) || (note === 3 && ein === 3) || (note >= 4 && ein >= 4)) accMatches++;

       p.vorPhase!.lernStrategien.forEach(s => {
          const entry = map.get(s) || { count: 0, totalNote: 0, wirksamCount: 0 };
          entry.count++;
          entry.totalNote += note;
          if (p.nachPhase!.strategieWirksam || p.nachPhase!.strategieWirksam === null) entry.wirksamCount++; // Treat partly/null as partly
          map.set(s, entry);
       });
    });

    const arr = Array.from(map.entries()).map(([k, v]) => ({
       strat: k,
       label: STRATEGIEN_INFO[k].label,
       count: v.count,
       avgNote: v.totalNote / v.count,
       wirksamPerc: (v.wirksamCount / v.count) * 100
    })).sort((a,b) => b.wirksamPerc - a.wirksamPerc); // Sort by highest efficacy

    return { stratMap: arr, accuracy: Math.round((accMatches / list.length)*100), total: list.length };
  }, [analyseStudent, abgeschlossenen]);

  return (
    <div className="space-y-6">
       {/* Pedagogical Intro */}
       <div className="bg-gradient-to-br from-violet-50 to-fuchsia-50 border border-violet-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row gap-8 items-start shadow-sm">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-violet-500 shadow-sm shrink-0">
          <Brain size={32} />
        </div>
        <div className="space-y-3 flex-1 text-left">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.25rem] font-black text-slate-900 leading-none">Metakognition: Das Lernen steuern</h3>
            <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-[0.5625rem] font-black uppercase tracking-widest">Lernstrategien</span>
          </div>
          <p className="text-[0.9375rem] text-slate-700 leading-relaxed font-medium">
            Wissenschaftliche Studien zeigen: Kinder, die wissen, <span className="italic">wie</span> sie lernen, erzielen deutlich bessere Ergebnisse. Hier unterstützen Sie die Kinder dabei, vor einer Prüfung Strategien zu wählen und danach zu reflektieren: "War meine Methode wirksam?"
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white/60 p-4 rounded-2xl border border-violet-100/50 flex items-start gap-3">
              <Sparkles size={18} className="text-fuchsia-500 shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-slate-700 font-bold leading-snug">
                Nutzen Sie den <span className="text-violet-600">KI-Vorschlag</span> nach der Rückgabe, um dem Kind motivierendes, prozessorientiertes Feedback zu geben.
              </p>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-violet-100/50 flex items-start gap-3">
              <TrendingUp size={18} className="text-violet-500 shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-slate-700 font-bold leading-snug">
                Die <span className="text-slate-900">Auswertung</span> zeigt Ihnen, welche Lerntechniken in Ihrer Klasse tatsächlich zum Erfolg führen.
              </p>
            </div>
          </div>
        </div>
      </div>

       <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit">
         <button onClick={() => setActiveView('liste')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView==='liste'?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Erfassung & Protokolle</button>
         <button onClick={() => setActiveView('analyse')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeView==='analyse'?'bg-white text-slate-800 shadow-sm':'text-slate-500 hover:text-slate-700'}`}>Auswertung</button>
       </div>

       {activeView === 'liste' && (
         <div className="space-y-8">
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-3xl p-6 text-white shadow-md flex justify-between items-center">
               <div>
                 <h2 className="text-xl font-black flex items-center gap-2"><Brain /> Metakognitive Protokolle</h2>
                 <p className="text-violet-100 font-medium">Lernstrategien datenbasiert erfassen (Hattie d=0.69)</p>
               </div>
               <button onClick={handleCreateNew} className="bg-white text-violet-600 px-6 py-3 rounded-2xl font-black hover:bg-violet-50 transition-all flex items-center gap-2 shadow-sm">
                 <Plus size={20} /> Protokoll anlegen
               </button>
            </div>

            {/* OFFENE */}
            {offenen.length > 0 && (
               <div>
                  <h3 className="text-slate-400 font-black uppercase tracking-wider text-sm mb-4">Offen & anstehend ({offenen.length})</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {offenen.map(p => {
                        const student = schuelerList.find(s => s.id === p.schuelerId);
                        const days = Math.ceil((new Date(p.pruefungsDatum).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                        return (
                           <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-violet-300 transition-all group flex flex-col justify-between min-h-[160px]">
                              <div>
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="font-black text-slate-800">{student?.vorname}</div>
                                    <div className={`text-xs font-bold px-2 py-1 rounded-md ${days < 0 ? 'bg-rose-100 text-rose-600' : days <= 2 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                                       {days < 0 ? 'Überfällig' : `in ${days} Tagen`}
                                    </div>
                                 </div>
                                 <div className="text-sm font-bold text-violet-600 mb-1">{p.pruefungsName} ({p.fach})</div>
                                 <div className="flex gap-1 mt-3 flex-wrap">
                                    {p.vorPhase?.lernStrategien.slice(0,3).map(s => (
                                       <span key={s} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium" title={STRATEGIEN_INFO[s].label}>{STRATEGIEN_INFO[s].icon} {STRATEGIEN_INFO[s].label}</span>
                                    ))}
                                    {p.vorPhase!.lernStrategien.length > 3 && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium">+{p.vorPhase!.lernStrategien.length-3}</span>}
                                 </div>
                              </div>
                              <button onClick={() => openPhase2(p)} className="mt-4 w-full py-2 bg-violet-50 text-violet-700 font-bold rounded-xl hover:bg-violet-100 transition-colors flex justify-center items-center gap-2">
                                <CheckSquare size={16} /> Ergebnis eintragen
                              </button>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}

            {/* ABGESCHLOSSENE */}
            {abgeschlossenen.length > 0 && (
               <div>
                  <h3 className="text-slate-400 font-black uppercase tracking-wider text-sm mb-4">Abgeschlossen ({abgeschlossenen.length})</h3>
                  <div className="bg-white border border-slate-100 shadow-sm rounded-3xl overflow-hidden overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-black">
                              <th className="p-4">Kind</th>
                              <th className="p-4">Prüfung</th>
                              <th className="p-4 w-20 text-center">Note</th>
                              <th className="p-4">Strategien</th>
                              <th className="p-4 whitespace-nowrap">Wirksam?</th>
                              <th className="p-4"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                           {abgeschlossenen.map(p => {
                              const s = schuelerList.find(x => x.id === p.schuelerId);
                              return (
                                 <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800 whitespace-nowrap">{s?.vorname || '?'}</td>
                                    <td className="p-4 text-sm"><span className="font-semibold text-slate-700">{p.pruefungsName}</span> <span className="text-slate-400">({p.fach})</span></td>
                                    <td className="p-4 text-center">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mx-auto ${
                                          p.nachPhase!.note <= 2 ? 'bg-emerald-100 text-emerald-700' : p.nachPhase!.note === 3 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                       }`}>{p.nachPhase!.note}</div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-600">
                                       {p.vorPhase!.lernStrategien.slice(0,2).map(x => STRATEGIEN_INFO[x].label).join(', ')}{p.vorPhase!.lernStrategien.length > 2 ? '...' : ''}
                                    </td>
                                    <td className="p-4 text-sm font-semibold">
                                       {p.nachPhase!.strategieWirksam ? <span className="text-emerald-600">Ja</span> : p.nachPhase!.strategieWirksam === false ? <span className="text-rose-600">Nein</span> : <span className="text-amber-600">Teilweise</span>}
                                    </td>
                                    <td className="p-4 text-right">
                                       <button onClick={() => removeProtokoll(p.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors rounded-xl"><Trash2 size={16}/></button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            )}
         </div>
       )}

       {activeView === 'analyse' && (
          <div className="space-y-6">
             <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><TrendingUp /> Strategie-Wirksamkeit</h2>
                   <select 
                      value={analyseStudent} 
                      onChange={e => setAnalyseStudent(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
                   >
                      <option value="all">Ganze Klasse</option>
                      {schuelerList.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                   </select>
                </div>

                {analyseData.total < 3 ? (
                   <div className="text-center py-12 text-slate-400 font-medium">Zu wenig Daten für Auswertung – bitte mehrere Protokolle anlegen ({analyseData.total} vorhanden).</div>
                ) : (
                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                            <div className="text-emerald-600 font-black uppercase text-xs tracking-wider mb-2">Am Wirksamsten</div>
                            <div className="text-lg font-black text-emerald-900">{analyseData.stratMap[0]?.label || '-'}</div>
                            <div className="text-sm font-semibold text-emerald-700">Wirksamkeits-Quote: {Math.round(analyseData.stratMap[0]?.wirksamPerc || 0)}%</div>
                         </div>
                         <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                            <div className="text-blue-600 font-black uppercase text-xs tracking-wider mb-2">Selbsteinschätzungs-Genauigkeit</div>
                            <div className="text-lg font-black text-blue-900">{analyseData.accuracy}%</div>
                            <div className="text-sm font-semibold text-blue-700">Realistische Einschätzung vor der Prüfung</div>
                         </div>
                      </div>

                      <div className="h-72 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analyseData.stratMap} margin={{ top: 20, right: 30, left: 0, bottom: 50 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="strat" tick={{fontSize: 12, fontWeight: 600, fill: '#64748b'}} angle={-45} textAnchor="end" tickFormatter={(v) => STRATEGIEN_INFO[v as LernStrategie]?.label || v} />
                              <YAxis yAxisId="left" orientation="left" domain={[1, 5]} reversed tick={{fill: '#64748b'}} label={{ value: 'Ø Note', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{fill: '#64748b'}} label={{ value: 'Wirksam %', angle: 90, position: 'insideRight', fill: '#94a3b8' }} />
                              <Tooltip cursor={{fill: '#f8fafc'}}
                                 content={({active, payload}) => {
                                    if(active && payload && payload.length) {
                                       const d = payload[0].payload;
                                       return (
                                          <div className="bg-white p-3 rounded-xl shadow-xl border border-slate-100 font-medium">
                                             <div className="font-black text-slate-800 mb-1">{d.label}</div>
                                             <div className="text-xs text-slate-500 mb-1">{d.count}x gewählt</div>
                                             <div className="text-sm font-bold text-emerald-600">{Math.round(d.wirksamPerc)}% wirksam</div>
                                             <div className="text-sm font-bold text-indigo-600">Ø Note: {d.avgNote.toFixed(1)}</div>
                                          </div>
                                       )
                                    }
                                    return null;
                                 }}
                              />
                              <Bar yAxisId="right" dataKey="wirksamPerc" fill="#8b5cf6" radius={[4,4,0,0]} barSize={40}>
                                 {analyseData.stratMap.map((entry, i) => (
                                    <Cell key={`cell-${i}`} fill={i === 0 ? '#10b981' : i === analyseData.stratMap.length-1 ? '#f59e0b' : '#c4b5fd'} />
                                 ))}
                              </Bar>
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                )}
             </div>
          </div>
       )}

       <AnimatePresence>
          {modalMode !== 'none' && editItem && (
             <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
               <motion.div initial={{opacity: 0, scale: 0.95}} animate={{opacity: 1, scale: 1}} exit={{opacity: 0, scale: 0.95}} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">
                  
                  {/* MODAL HEADER */}
                  <div className={`p-4 sm:p-6 text-white flex justify-between items-center shrink-0 ${modalMode === 'new' ? 'bg-violet-600' : 'bg-emerald-600'}`}>
                     <div>
                        <h2 className="font-black text-xl">{modalMode === 'new' ? 'Vor der Prüfung' : 'Nach der Korrektur'}</h2>
                        <p className="text-white/80 font-medium text-sm">{modalMode === 'new' ? 'Strategiewahl & Selbsteinschätzung' : 'Wirksamkeit evaluieren'}</p>
                     </div>
                     <button onClick={() => setModalMode('none')} className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"><X size={20}/></button>
                  </div>

                  {/* MODAL BODY */}
                  <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                     
                     {modalMode === 'new' && editItem.vorPhase && (
                        <>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">Schüler/in</label>
                                 <select value={editItem.schuelerId} onChange={e => setEditItem({...editItem, schuelerId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none">
                                    {schuelerList.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">Datum</label>
                                 <input type="date" value={editItem.pruefungsDatum} onChange={e => setEditItem({...editItem, pruefungsDatum: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none"/>
                              </div>
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Fach & Prüfung</label>
                              <div className="flex gap-4">
                                 <select value={editItem.fach} onChange={e => setEditItem({...editItem, fach: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none shrink-0 w-36">
                                    {FAECHER_H.map(f => <option key={f} value={f}>{f}</option>)}
                                 </select>
                                 <input type="text" placeholder="z.B. Ansage 3" value={editItem.pruefungsName} onChange={e => setEditItem({...editItem, pruefungsName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none"/>
                              </div>
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-4">Wie lernt das Kind? (Mehrfachwahl)</label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                 {(Object.entries(STRATEGIEN_INFO) as [LernStrategie, any][]).map(([key, info]) => {
                                    const isSel = editItem.vorPhase!.lernStrategien.includes(key);
                                    return (
                                       <button key={key} onClick={() => {
                                          const current = editItem.vorPhase!.lernStrategien;
                                          const next = isSel ? current.filter(x => x !== key) : [...current, key];
                                          setEditItem({...editItem, vorPhase: {...editItem.vorPhase!, lernStrategien: next}});
                                       }} className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${isSel ? 'border-violet-500 bg-violet-50 shadow-sm ring-1 ring-violet-500' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xl bg-white shadow-sm ${isSel?'ring-1 ring-violet-200':''}`}>{info.icon}</div>
                                          <div>
                                             <div className={`font-black text-sm ${isSel?'text-violet-900':'text-slate-700'}`}>{info.label}</div>
                                             <div className={`text-[0.7rem] font-medium leading-snug mt-0.5 ${isSel?'text-violet-700':'text-slate-500'}`}>{info.desc}</div>
                                          </div>
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">Lern-Dauer (Minuten)</label>
                                 <div className="flex items-center gap-4">
                                    <input type="range" min="0" max="180" step="15" value={editItem.vorPhase.lernDauer} onChange={e => setEditItem({...editItem, vorPhase: {...editItem.vorPhase!, lernDauer: parseInt(e.target.value)}})} className="w-full accent-violet-500" />
                                    <span className="font-black text-violet-600 w-12 text-right">{editItem.vorPhase.lernDauer}m</span>
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-2">Wie fühlt es sich vorbereitet?</label>
                                 <div className="flex justify-between">
                                    {EMOTIONS.map(emo => (
                                       <button key={emo.value} onClick={() => setEditItem({...editItem, vorPhase: {...editItem.vorPhase!, selbstEinschaetzung: emo.value}})} className={`text-2xl transition-transform hover:scale-110 ${editItem.vorPhase!.selbstEinschaetzung === emo.value ? 'scale-125 saturate-150 drop-shadow-md' : 'opacity-40 grayscale'} `}>
                                          {emo.emoji}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           
                           <div>
                              <button onClick={savePhase1} className="w-full py-4 mt-4 bg-violet-600 hover:bg-violet-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-violet-500/20 active:scale-95 flex items-center justify-center gap-2">
                                 <Save size={20} /> Phase 1 abspeichern
                              </button>
                           </div>
                        </>
                     )}

                     {modalMode === 'edit_phase2' && editItem.nachPhase && (
                        <>
                           <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-wrap gap-x-6 gap-y-2">
                              <div className="text-sm"><span className="text-slate-400 font-semibold">Kind:</span> <span className="font-black text-slate-800">{schuelerList.find(s => s.id === editItem.schuelerId)?.vorname}</span></div>
                              <div className="text-sm"><span className="text-slate-400 font-semibold">Prüfung:</span> <span className="font-black text-slate-800">{editItem.pruefungsName}</span></div>
                              <div className="text-sm"><span className="text-slate-400 font-semibold">Strategien:</span> <span className="font-bold text-violet-600">{editItem.vorPhase!.lernStrategien.map(s => STRATEGIEN_INFO[s as LernStrategie].label).join(', ')}</span></div>
                           </div>

                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-4">Note</label>
                                 <div className="flex gap-2">
                                    {[1,2,3,4,5].map(n => (
                                       <button key={n} onClick={() => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, note: n}})} className={`flex-1 aspect-square rounded-xl text-xl font-black transition-all border-2 ${editItem.nachPhase!.note === n ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'}`}>
                                          {n}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold text-slate-700 mb-4">Reaktion des Kindes</label>
                                 <div className="flex justify-between gap-1">
                                    {REAKTIONEN.map(r => (
                                       <button key={r.value} onClick={() => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, kindReaktion: r.value as any}})} className={`text-3xl transition-transform hover:scale-110 ${editItem.nachPhase!.kindReaktion === r.value ? 'scale-110 saturate-150 drop-shadow-md' : 'opacity-40 grayscale'} `} title={r.label}>
                                          {r.emoji}
                                       </button>
                                    ))}
                                 </div>
                              </div>
                           </div>

                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Hat die Lernstrategie funktioniert?</label>
                              <div className="flex gap-3 bg-slate-50 p-2 rounded-2xl">
                                 <button onClick={() => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, strategieWirksam: true}})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${editItem.nachPhase!.strategieWirksam === true ? 'bg-white shadow border border-emerald-200 text-emerald-700' : 'text-slate-500 hover:bg-slate-100'}`}>Ja</button>
                                 <button onClick={() => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, strategieWirksam: null}})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${editItem.nachPhase!.strategieWirksam === null ? 'bg-white shadow border border-amber-200 text-amber-700' : 'text-slate-500 hover:bg-slate-100'}`}>Teilweise</button>
                                 <button onClick={() => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, strategieWirksam: false}})} className={`flex-1 py-3 rounded-xl font-bold transition-all ${editItem.nachPhase!.strategieWirksam === false ? 'bg-white shadow border border-rose-200 text-rose-700' : 'text-slate-500 hover:bg-slate-100'}`}>Nein</button>
                              </div>
                           </div>

                           <div>
                              <div className="flex justify-between items-center mb-2">
                                 <label className="block text-sm font-bold text-slate-700">Metakognitives Feedback formulieren</label>
                                 <button onClick={generateFeedback} disabled={isGenerating || editItem.nachPhase!.strategieWirksam === undefined} className="text-xs font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-emerald-100 transition-colors disabled:opacity-50">
                                    {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} KI-Vorschlag
                                 </button>
                              </div>
                              <textarea 
                                 value={editItem.nachPhase!.feedbackText || ''} 
                                 onChange={e => setEditItem({...editItem, nachPhase: {...editItem.nachPhase!, feedbackText: e.target.value}})}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium outline-none h-24 resize-none text-slate-800"
                                 placeholder="Prozessorientiertes Feedback: z.B. 'Du hast tolle Karteikarten geschrieben, das hat gut geklappt...'"
                              />
                           </div>

                           <div>
                              <button onClick={savePhase2} className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-2">
                                 <Save size={20} /> Protokoll abschließen
                              </button>
                           </div>
                        </>
                     )}
                     
                  </div>
               </motion.div>
             </div>
          )}
       </AnimatePresence>
    </div>
  );
};

