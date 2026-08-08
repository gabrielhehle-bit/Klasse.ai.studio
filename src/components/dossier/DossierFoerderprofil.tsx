import React, { useState, useMemo } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Heart, Sparkles, Plus, Trash2, Save, Smile, Target, CheckCircle2, AlertTriangle, Clock, Activity, TrendingUp, Brain, ExternalLink, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { berechneIpsativ } from '../../lib/ipsativeAnalyse';
import { FlowerChart } from '../FlowerChart';
import { getDiagnosticTestName, getValidStudentDiagnostics, isDiagnosticAlert } from '../../lib/diagnosticData';

interface DossierFoerderprofilProps {
  student: Student;
}

const BEREICHE = ["Lesen", "Schreiben", "Rechnen", "Konzentration", "Sozialverhalten", "Motorik", "Sprache"];

export default function DossierFoerderprofil({ student }: DossierFoerderprofilProps) {
  const { app, setApp, setPage } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'staerken' | 'bereiche' | 'ziele' | 'massnahmen' | 'entwicklung' | 'softskills'>('staerken');

  // Strengths States
  const [newStaerke, setNewStaerke] = useState('');
  
  const profil = student.foerderprofil || {};
  const staerken = profil.staerken || [];

  // Goal States
  const [isAddingZiel, setIsAddingZiel] = useState(false);
  const [newZiel, setNewZiel] = useState({
    ziel: '',
    bereich: BEREICHE[0],
    startDatum: new Date().toISOString().split('T')[0],
    zielDatum: '',
    status: 'offen' as any,
    diagnostikErhebungId: ''
  });

  // Measure States
  const [isAddingMassnahme, setIsAddingMassnahme] = useState(false);
  const [newMassnahme, setNewMassnahme] = useState({
    bezeichnung: '',
    beschreibung: '',
    datum: new Date().toISOString().split('T')[0],
    wirksamkeit: 'unklar' as any,
    zielId: '',
    kontrollDatum: ''
  });

  const updateProfil = (changes: any) => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? {
        ...s,
        foerderprofil: {
          ...s.foerderprofil,
          ...changes,
          letzteAktualisierung: new Date().toISOString()
        }
      } : s)
    }));
  };

  // Strengths handling
  const updateStaerken = (newList: string[]) => {
    updateProfil({ staerken: newList });
  };

  const addStaerke = () => {
    if (!newStaerke.trim()) return;
    updateStaerken([...staerken, newStaerke.trim()]);
    setNewStaerke('');
  };

  // Goals handling
  const addZiel = () => {
    if (!newZiel.ziel.trim()) return;
    const fresh = {
      id: `ziel-${Date.now()}`,
      ziel: newZiel.ziel.trim(),
      bereich: newZiel.bereich,
      startDatum: newZiel.startDatum,
      zielDatum: newZiel.zielDatum,
      status: newZiel.status,
      diagnostikErhebungId: newZiel.diagnostikErhebungId || undefined,
    };
    const nextGoals = [...(profil.foerderziele || []), fresh];
    updateProfil({ foerderziele: nextGoals });
    setNewZiel({
      ziel: '',
      bereich: BEREICHE[0],
      startDatum: new Date().toISOString().split('T')[0],
      zielDatum: '',
      status: 'offen',
      diagnostikErhebungId: ''
    });
    setIsAddingZiel(false);
  };

  const deleteZiel = (id: string) => {
    if (confirm('Möchten Sie dieses Förderziel wirklich löschen?')) {
      const nextGoals = (profil.foerderziele || []).filter(z => z.id !== id);
      updateProfil({ foerderziele: nextGoals });
    }
  };

  // Measures handling
  const addMassnahme = () => {
    if (!newMassnahme.bezeichnung.trim()) return;
    const fresh = {
      id: `mass-${Date.now()}`,
      bezeichnung: newMassnahme.bezeichnung.trim(),
      beschreibung: newMassnahme.beschreibung.trim(),
      datum: newMassnahme.datum,
      wirksamkeit: newMassnahme.wirksamkeit,
      zielId: newMassnahme.zielId || undefined,
      kontrollDatum: newMassnahme.kontrollDatum || undefined,
    };
    const nextMassnahmen = [...(profil.massnahmen || []), fresh];
    updateProfil({ massnahmen: nextMassnahmen });
    setNewMassnahme({
      bezeichnung: '',
      beschreibung: '',
      datum: new Date().toISOString().split('T')[0],
      wirksamkeit: 'unklar',
      zielId: '',
      kontrollDatum: ''
    });
    setIsAddingMassnahme(false);
  };

  const deleteMassnahme = (id: string) => {
    if (confirm('Möchten Sie diese Maßnahme wirklich löschen?')) {
      const nextMassnahmen = (profil.massnahmen || []).filter(m => m.id !== id);
      updateProfil({ massnahmen: nextMassnahmen });
    }
  };

  // --- NEW: IPSATIVE & EXEKUTIVE DATA ---
  const ipsativeData = useMemo(() => {
    const userNotes: {wert: number, datum: string, fach: string}[] = [];
    if (app.noten && app.noten[student.id]) {
      for (const fachId in app.noten[student.id]) {
        for (const sem in app.noten[student.id][fachId]) {
          const g = app.noten[student.id][fachId][sem];
          if (!g) continue;
          
          const mapList = (arr: any[], prefix: string) => {
            if (Array.isArray(arr)) {
              arr.forEach((v, idx) => {
                if (typeof v === 'number') {
                  userNotes.push({ wert: v, datum: `${sem} ${prefix} ${idx+1}`, fach: fachId });
                }
              });
            }
          };
          mapList(g.sa, 'SA');
          mapList(g.lzk, 'LZK');
          mapList(g.wp, 'WP');
        }
      }
    }
    return berechneIpsativ(userNotes, app.ipsativeGewichtung ?? 70);
  }, [app.noten, student.id, app.ipsativeGewichtung]);

  const latestExekutiv = useMemo(() => {
    if (!app.diagnostikErhebungen) return null;
    const exList = app.diagnostikErhebungen.filter(e => e.schuelerId === student.id && e.type === 'exekutiv');
    if (exList.length === 0) return null;
    exList.sort((a, b) => (b.datum || '').localeCompare(a.datum || ''));
    return exList[0];
  }, [app.diagnostikErhebungen, student.id]);

  const radarData = useMemo(() => {
    if (!latestExekutiv || !latestExekutiv.meta) return [];
    return [
      { subject: 'Arbeitsgedächtnis', A: latestExekutiv.meta.arbeitsgedaechtnis || 0, fullMark: 10 },
      { subject: 'Inhibition', A: latestExekutiv.meta.inhibition || 0, fullMark: 10 },
      { subject: 'Flexibilität', A: latestExekutiv.meta.flexibilitaet || 0, fullMark: 10 },
      { subject: 'Aktivierung', A: latestExekutiv.meta.aktivierung || 0, fullMark: 10 },
      { subject: 'Emotionen', A: latestExekutiv.meta.emotionen || 0, fullMark: 10 }
    ];
  }, [latestExekutiv]);

  const goalsFiltered = useMemo(() => {
    const goals = profil.foerderziele || [];
    return {
      deutsch: goals.filter(z => ["Lesen", "Schreiben", "Sprache"].includes(z.bereich)),
      mathe: goals.filter(z => ["Rechnen"].includes(z.bereich)),
      overgreifend: goals.filter(z => ["Konzentration", "Sozialverhalten", "Motorik"].includes(z.bereich))
    };
  }, [profil.foerderziele]);
  const studentDiagnostics = useMemo(
    () => getValidStudentDiagnostics(app, student.id),
    [app, student.id]
  );
  const diagnosticAlerts = studentDiagnostics.filter(isDiagnosticAlert);
  const activeGoals = (profil.foerderziele || []).filter(z => z.status === 'offen' || z.status === 'in Arbeit');
  const reachedGoals = (profil.foerderziele || []).filter(z => z.status === 'erreicht');
  const measures = profil.massnahmen || [];
  const evaluatedMeasures = measures.filter(m => m.wirksamkeit !== 'unklar');
  const unlinkedMeasures = measures.filter(measure => !measure.zielId);
  const reviewsDue = measures.filter(measure =>
    measure.kontrollDatum &&
    measure.wirksamkeit === 'unklar' &&
    new Date(`${measure.kontrollDatum}T23:59:59`).getTime() < Date.now()
  );
  const overdueGoals = activeGoals.filter(goal => {
    if (!goal.zielDatum) return false;
    const due = new Date(goal.zielDatum);
    due.setHours(23, 59, 59, 999);
    return due.getTime() < Date.now();
  });
  const nextRecommendedTab =
    staerken.length === 0 ? 'staerken' :
    diagnosticAlerts.length > 0 && (profil.foerderbedarfBereiche || []).length === 0 ? 'bereiche' :
    activeGoals.length === 0 ? 'ziele' :
    measures.length === 0 || unlinkedMeasures.length > 0 || reviewsDue.length > 0 ? 'massnahmen' :
    evaluatedMeasures.length === 0 ? 'entwicklung' :
    'entwicklung';
  const nextStepLabel =
    staerken.length === 0 ? 'Mindestens eine Stärke dokumentieren' :
    diagnosticAlerts.length > 0 && (profil.foerderbedarfBereiche || []).length === 0 ? 'Diagnostik-Hinweise einem Bereich zuordnen' :
    activeGoals.length === 0 ? 'Ein beobachtbares Förderziel formulieren' :
    measures.length === 0 ? 'Eine passende Maßnahme zum Ziel festlegen' :
    unlinkedMeasures.length > 0 ? 'Bestehende Maßnahmen einem Förderziel zuordnen' :
    reviewsDue.length > 0 ? 'Fällige Wirksamkeitsprüfung dokumentieren' :
    evaluatedMeasures.length === 0 ? 'Wirksamkeit der Maßnahme nach Beobachtung einschätzen' :
    'Verlauf prüfen und nächsten Termin festlegen';
  const getLinkedDiagnostic = (entryId?: string) =>
    entryId ? studentDiagnostics.find(entry => entry.id === entryId) : undefined;
  const getLinkedGoal = (goalId?: string) =>
    goalId ? (profil.foerderziele || []).find(goal => goal.id === goalId) : undefined;
  // --------------------------------------

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Tab Header Group */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 bg-rose-500 rounded-full" />
          <div>
            <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Förderprofil & Maßnahmen</h3>
            <p className="text-[0.75rem] leading-tight font-bold text-slate-400 uppercase tracking-widest mt-0.5">Stärken → Hinweise → Ziele → Maßnahmen → Wirkung</p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="max-w-full overflow-x-auto bg-slate-100 p-1 rounded-2xl flex gap-0.5 self-start sm:self-auto">
          {[
            { id: 'staerken', label: 'Stärken', icon: Smile },
            { id: 'bereiche', label: 'Förderbereiche', icon: Activity },
            { id: 'ziele', label: 'Ziele', icon: Target },
            { id: 'massnahmen', label: 'Maßnahmen', icon: CheckCircle2 },
            { id: 'entwicklung', label: 'Verlauf', icon: TrendingUp },
            { id: 'softskills', label: 'Entwicklungsprofil', icon: Zap },
          ].map(t => (
            <button
              key={t.id}
              id={`subtab-${t.id}`}
              type="button"
              onClick={() => setActiveSubTab(t.id as any)}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl text-[0.625rem] sm:text-[0.6875rem] font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSubTab === t.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40' : 'text-slate-450 hover:text-slate-700'
              }`}
            >
              <t.icon size={13} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Stärken', value: staerken.length, helper: 'Ressourcen', tone: 'rose' },
          { label: 'Diagnostik', value: diagnosticAlerts.length, helper: diagnosticAlerts.length === 0 ? 'keine offenen Hinweise' : diagnosticAlerts.length === 1 ? 'Hinweis prüfen' : 'Hinweise prüfen', tone: diagnosticAlerts.length ? 'amber' : 'slate' },
          { label: 'Aktive Ziele', value: activeGoals.length, helper: overdueGoals.length ? `${overdueGoals.length} überfällig` : `${reachedGoals.length} erreicht`, tone: overdueGoals.length ? 'amber' : 'indigo' },
          {
            label: 'Maßnahmen',
            value: measures.length,
            helper: reviewsDue.length
              ? `${reviewsDue.length} Prüfung fällig`
              : unlinkedMeasures.length
                ? `${unlinkedMeasures.length} ohne Ziel`
                : `${evaluatedMeasures.length} bewertet`,
            tone: reviewsDue.length || unlinkedMeasures.length ? 'amber' : 'emerald'
          },
          { label: '1:1-Kontakte', value: (app.interaktionsLog?.eintraege || []).filter(e => e.schuelerId === student.id && e.war1zu1).length, helper: 'dokumentiert', tone: 'sky' }
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-[0.6rem] font-black uppercase tracking-wider text-slate-400">{card.label}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{card.value}</div>
            <div className={`mt-1 text-[0.65rem] font-bold ${card.tone === 'amber' ? 'text-amber-700' : 'text-slate-500'}`}>{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
          <Target size={18} />
        </div>
        <div className="flex-1">
          <div className="text-[0.6rem] font-black uppercase tracking-wider text-indigo-600">Nächster sinnvoller Schritt</div>
          <div className="mt-1 text-sm font-black text-indigo-950">{nextStepLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setActiveSubTab(nextRecommendedTab as any)}
          className="rounded-xl bg-indigo-700 px-4 py-2.5 text-xs font-black text-white hover:bg-indigo-800"
        >
          Bereich öffnen
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center shrink-0">
               <Activity size={20} />
            </div>
            <div>
               <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500">1:1 Interaktions-Bilanz</h4>
               {(() => {
                  const studentLog = app.interaktionsLog?.eintraege?.filter(e => e.schuelerId === student.id) || [];
                  const student1to1 = studentLog.filter(e => e.war1zu1).sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
                  const last1to1 = student1to1.length > 0 ? new Date(student1to1[0].datum).toLocaleDateString('de-DE') : 'noch nicht dokumentiert';
                  return (
                     <p className="text-[0.875rem] font-black text-slate-800">
                        {student1to1.length} <span className="font-semibold text-slate-400 text-[0.75rem]">Gesamt</span> • Letzter Kontakt: <span className="text-blue-600">{last1to1}</span>
                     </p>
                  );
               })()}
            </div>
         </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeSubTab === 'staerken' && (
            <motion.div 
              key="staerken"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="space-y-6"
            >
              <p className="text-[0.78125rem] font-medium text-slate-500 leading-relaxed max-w-2xl">
                Hier dokumentieren wir die positiven Aspekte, besonderen Fähigkeiten und Interessen des Kindes. 
                Pädagogische Förderung baut auf vorhandenen Ressourcen auf.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {staerken.map((s, idx) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={idx} 
                      className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm hover:border-rose-200 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                        <Smile size={18} />
                      </div>
                      <span className="text-[0.875rem] leading-snug font-black text-slate-800 flex-1">{s}</span>
                      <button 
                        type="button"
                        onClick={() => updateStaerken(staerken.filter((_, i) => i !== idx))}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-slate-300 hover:text-rose-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="p-5 bg-slate-50 border border-slate-150 border-dashed rounded-[1.5rem] flex items-center gap-4">
                  <input 
                    className="flex-1 bg-transparent border-none outline-none text-[0.875rem] leading-snug font-black text-slate-900 placeholder:text-slate-350"
                    placeholder="Eigenschaft oder Talent..."
                    value={newStaerke}
                    onChange={e => setNewStaerke(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addStaerke()}
                  />
                  <button 
                    type="button"
                    onClick={addStaerke}
                    className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:scale-105 transition-all shadow-lg active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div className="p-8 bg-rose-50/40 rounded-[2rem] border border-rose-100/50 space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-rose-500" />
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-rose-900">Ressourcen-Fokus</span>
                </div>
                <p className="text-[0.8125rem] text-rose-800 leading-relaxed italic">
                  "Jedes Kind hat Talente, die gesehen werden wollen. Wenn wir an den Stärken ansetzen, steigt die Motivation für die Arbeit an den Herausforderungen."
                </p>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'bereiche' && (
            <motion.div 
              key="bereiche"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="space-y-6"
            >
              <p className="text-[0.78125rem] font-medium text-slate-500 leading-relaxed max-w-2xl">
                Wählen Sie die pädagogischen Fokusschwerpunkte für das Kind. Diese dienen als strukturgebende Grundlage für Ihre individuellen Förderziele.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Deutschbereich */}
                <div className="bg-emerald-50/25 border border-emerald-100 rounded-3xl p-5 space-y-4 text-left shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-emerald-100 pb-2.5">
                    <span className="text-xl">📖</span>
                    <div>
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider">Deutsch</h4>
                      <p className="text-[0.625rem] text-slate-400 font-bold uppercase font-sans">Lese- & Schreibfokus</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    {["Lesen", "Schreiben", "Sprache"].map(b => {
                      const isSelected = (profil.foerderbedarfBereiche || []).includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            const current = profil.foerderbedarfBereiche || [];
                            const next = isSelected ? current.filter(x => x !== b) : [...current, b];
                            updateProfil({ foerderbedarfBereiche: next });
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-[0.6875rem] font-black transition-all border text-left cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' 
                              : 'bg-white border-slate-150 text-slate-650 hover:border-emerald-300 hover:bg-emerald-50/20'
                          }`}
                        >
                          <span>{b}</span>
                          {isSelected && <span className="font-sans font-black text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mathematik */}
                <div className="bg-amber-50/20 border border-amber-100 rounded-3xl p-5 space-y-4 text-left shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-amber-100 pb-2.5">
                    <span className="text-xl">🔢</span>
                    <div>
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider">Mathematik</h4>
                      <p className="text-[0.625rem] text-slate-400 font-bold uppercase font-sans">Rechnen & Arithmetik</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    {["Rechnen"].map(b => {
                      const isSelected = (profil.foerderbedarfBereiche || []).includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            const current = profil.foerderbedarfBereiche || [];
                            const next = isSelected ? current.filter(x => x !== b) : [...current, b];
                            updateProfil({ foerderbedarfBereiche: next });
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-[0.6875rem] font-black transition-all border text-left cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-amber-500 border-amber-600 text-white shadow-sm' 
                              : 'bg-white border-slate-150 text-slate-650 hover:border-amber-300 hover:bg-amber-50/20'
                          }`}
                        >
                          <span>Rechnen & Zahlen</span>
                          {isSelected && <span className="font-sans font-black text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Übergreifende Bereiche */}
                <div className="bg-indigo-50/25 border border-indigo-100 rounded-3xl p-5 space-y-4 text-left shadow-2xs">
                  <div className="flex items-center gap-2.5 border-b border-indigo-105 pb-2.5">
                    <span className="text-xl">🧠</span>
                    <div>
                      <h4 className="text-xs font-black text-indigo-805 uppercase tracking-wider">Fächerübergreifend</h4>
                      <p className="text-[0.625rem] text-slate-400 font-bold uppercase font-sans">Verhalten & Softskills</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    {["Konzentration", "Sozialverhalten", "Motorik"].map(b => {
                      const isSelected = (profil.foerderbedarfBereiche || []).includes(b);
                      return (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            const current = profil.foerderbedarfBereiche || [];
                            const next = isSelected ? current.filter(x => x !== b) : [...current, b];
                            updateProfil({ foerderbedarfBereiche: next });
                          }}
                          className={`w-full px-3.5 py-2.5 rounded-xl text-[0.6875rem] font-black transition-all border text-left cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-indigo-600 border-indigo-750 text-white shadow-sm' 
                              : 'bg-white border-slate-150 text-slate-650 hover:border-indigo-300 hover:bg-indigo-50/20'
                          }`}
                        >
                          <span>{b}</span>
                          {isSelected && <span className="font-sans font-black text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-indigo-50/20 rounded-[2rem] border border-indigo-100/50 flex gap-4">
                <AlertTriangle size={24} className="text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[0.8125rem] text-slate-600 leading-relaxed font-semibold">
                  Die Einteilung der Förderbereiche koordiniert die spätere Berichtslegung sowie die zielgerichtete Generierung passgenauer Übungsbehelfe im Portfolio und in der Live-Diagnostik.
                </p>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'ziele' && (
            <motion.div 
              key="ziele"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="space-y-5"
            >
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-2">
                <span className="text-[0.75rem] leading-tight font-bold text-slate-500 pl-1">Ziele definieren und Lernerfolge dokumentieren.</span>
                <button
                  type="button"
                  onClick={() => setIsAddingZiel(!isAddingZiel)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 font-extrabold text-[0.625rem] tracking-wider text-white uppercase rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                >
                  <Plus size={12} />
                  Ziel hinzufügen
                </button>
              </div>

              {/* ADD GOAL FORM */}
              <AnimatePresence>
                {isAddingZiel && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 "
                  >
                    <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-800">Neues Förderziel anlegen</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-left">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Bereich</label>
                        <select
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700 outline-none"
                          value={newZiel.bereich}
                          onChange={e => setNewZiel({ ...newZiel, bereich: e.target.value })}
                        >
                          <optgroup label="📖 Deutsch">
                            <option value="Lesen">Lesen</option>
                            <option value="Schreiben">Schreiben</option>
                            <option value="Sprache">Sprache</option>
                          </optgroup>
                          <optgroup label="🔢 Mathematik">
                            <option value="Rechnen">Rechnen</option>
                          </optgroup>
                          <optgroup label="🧠 Fächerübergreifend">
                            <option value="Konzentration">Konzentration</option>
                            <option value="Sozialverhalten">Sozialverhalten</option>
                            <option value="Motorik">Motorik</option>
                          </optgroup>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Start-Datum</label>
                          <input
                            type="date"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700"
                            value={newZiel.startDatum}
                            onChange={e => setNewZiel({ ...newZiel, startDatum: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Ziel-Datum (Soll)</label>
                          <input
                            type="date"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700"
                            value={newZiel.zielDatum}
                            onChange={e => setNewZiel({ ...newZiel, zielDatum: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <label className="text-[0.625rem] uppercase font-black text-slate-400 block">
                        Anlass aus der Diagnostik (optional)
                      </label>
                      <select
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700 outline-none"
                        value={newZiel.diagnostikErhebungId}
                        onChange={e => setNewZiel({ ...newZiel, diagnostikErhebungId: e.target.value })}
                      >
                        <option value="">Ohne direkte Diagnostik-Verknüpfung</option>
                        {studentDiagnostics.map(entry => (
                          <option key={entry.id} value={entry.id}>
                            {entry.datum} · {getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}
                            {isDiagnosticAlert(entry) ? ' · auffällig markiert' : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[0.625rem] font-medium text-slate-500">
                        Die Verknüpfung dokumentiert den Anlass, erzeugt aber nicht automatisch einen Förderbedarf.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Konkrete Zielformulierung</label>
                        <input
                          type="text"
                          placeholder="z.B. Kann sinnerfassend lesen und einfache Inhalte wiedergeben"
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-emerald-500/20 text-slate-850 outline-none"
                          value={newZiel.ziel}
                          onChange={e => setNewZiel({ ...newZiel, ziel: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Status</label>
                        <select
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700 outline-none"
                          value={newZiel.status}
                          onChange={e => setNewZiel({ ...newZiel, status: e.target.value as any })}
                        >
                          <option value="offen">Offen (Nicht begonnen)</option>
                          <option value="in Arbeit">In Arbeit</option>
                          <option value="erreicht">Erreicht</option>
                          <option value="verworfen">Verworfen</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingZiel(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-white text-[0.75rem] leading-tight font-bold rounded-xl"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        disabled={!newZiel.ziel.trim()}
                        onClick={addZiel}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[0.75rem] leading-tight font-bold rounded-xl"
                      >
                        Speichern
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* GOALS LIST GROUPED */}
              <div className="space-y-6">
                {(goalsFiltered.deutsch.length > 0 || goalsFiltered.mathe.length > 0 || goalsFiltered.overgreifend.length > 0) ? (
                  <div className="space-y-8 text-left">
                    {/* DEUTSCH */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                        <span className="text-base">📖</span>
                        <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Deutsch (Lesen, Schreiben, Sprache)</h5>
                        <span className="text-[0.5625rem] bg-emerald-50 border border-emerald-100 font-extrabold text-emerald-700 px-2.5 py-0.5 rounded-full">
                          {goalsFiltered.deutsch.length} {goalsFiltered.deutsch.length === 1 ? 'Ziel' : 'Ziele'}
                        </span>
                      </div>
                      {goalsFiltered.deutsch.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {goalsFiltered.deutsch.map(z => (
                            <div key={z.id} className="group relative p-5 bg-white border border-slate-150 hover:border-slate-200 rounded-3xl shadow-3xs space-y-4 transition-colors">
                              <button
                                type="button"
                                onClick={() => deleteZiel(z.id)}
                                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Ziel löschen"
                              >
                                <Trash2 size={13} />
                              </button>

                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[0.5625rem] font-black uppercase rounded-lg">{z.bereich}</span>
                                
                                <select
                                  value={z.status}
                                  onChange={e => {
                                    const updated = (profil.foerderziele || []).map(item => item.id === z.id ? { ...item, status: e.target.value as any } : item);
                                    updateProfil({ foerderziele: updated });
                                  }}
                                  className={`text-[0.625rem] font-extrabold uppercase px-1.5 py-0.5 pr-5 rounded border-0 focus:ring-0 cursor-pointer outline-none ${
                                    z.status === 'erreicht' ? 'bg-emerald-100 text-emerald-700' : 
                                    z.status === 'in Arbeit' ? 'bg-blue-100 text-blue-700' : 
                                    z.status === 'verworfen' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-550'
                                  }`}
                                >
                                  <option value="offen">Offen</option>
                                  <option value="in Arbeit">In Arbeit</option>
                                  <option value="erreicht">Erreicht</option>
                                  <option value="verworfen">Verworfen</option>
                                </select>
                              </div>

                              <p className="text-[0.8125rem] leading-snug font-semibold text-slate-800 leading-tight pr-6">{z.ziel || 'Kein Zieltext'}</p>
                              {getLinkedDiagnostic(z.diagnostikErhebungId) && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[0.625rem] font-bold text-amber-800">
                                  Anlass: {getDiagnosticTestName(getLinkedDiagnostic(z.diagnostikErhebungId)!.testId, app.diagnostikTests || [])}
                                  {' · '}{getLinkedDiagnostic(z.diagnostikErhebungId)!.datum}
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                                <div className="flex items-center gap-1"><Clock size={11} /> Erstellt: {z.startDatum}</div>
                                {z.zielDatum && <div className="ml-auto">Soll: {z.zielDatum}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[0.7rem] italic text-slate-400 pl-1">Keine aktuellen Deutsch-Förderziele definiert.</p>
                      )}
                    </div>

                    {/* MATHEMATIK */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                        <span className="text-base">🔢</span>
                        <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Mathematik (Rechnen)</h5>
                        <span className="text-[0.5625rem] bg-indigo-50 border border-indigo-100 font-extrabold text-indigo-700 px-2.5 py-0.5 rounded-full">
                          {goalsFiltered.mathe.length} {goalsFiltered.mathe.length === 1 ? 'Ziel' : 'Ziele'}
                        </span>
                      </div>
                      {goalsFiltered.mathe.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {goalsFiltered.mathe.map(z => (
                            <div key={z.id} className="group relative p-5 bg-white border border-slate-150 hover:border-slate-200 rounded-3xl shadow-3xs space-y-4 transition-colors">
                              <button
                                type="button"
                                onClick={() => deleteZiel(z.id)}
                                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Ziel löschen"
                              >
                                <Trash2 size={13} />
                              </button>

                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-850 border border-amber-100 text-[0.5625rem] font-black uppercase rounded-lg">{z.bereich}</span>
                                
                                <select
                                  value={z.status}
                                  onChange={e => {
                                    const updated = (profil.foerderziele || []).map(item => item.id === z.id ? { ...item, status: e.target.value as any } : item);
                                    updateProfil({ foerderziele: updated });
                                  }}
                                  className={`text-[0.625rem] font-extrabold uppercase px-1.5 py-0.5 pr-5 rounded border-0 focus:ring-0 cursor-pointer outline-none ${
                                    z.status === 'erreicht' ? 'bg-emerald-100 text-emerald-700' : 
                                    z.status === 'in Arbeit' ? 'bg-blue-100 text-blue-700' : 
                                    z.status === 'verworfen' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-550'
                                  }`}
                                >
                                  <option value="offen">Offen</option>
                                  <option value="in Arbeit">In Arbeit</option>
                                  <option value="erreicht">Erreicht</option>
                                  <option value="verworfen">Verworfen</option>
                                </select>
                              </div>

                              <p className="text-[0.8125rem] leading-snug font-semibold text-slate-800 leading-tight pr-6">{z.ziel || 'Kein Zieltext'}</p>
                              {getLinkedDiagnostic(z.diagnostikErhebungId) && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[0.625rem] font-bold text-amber-800">
                                  Anlass: {getDiagnosticTestName(getLinkedDiagnostic(z.diagnostikErhebungId)!.testId, app.diagnostikTests || [])}
                                  {' · '}{getLinkedDiagnostic(z.diagnostikErhebungId)!.datum}
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                                <div className="flex items-center gap-1"><Clock size={11} /> Erstellt: {z.startDatum}</div>
                                {z.zielDatum && <div className="ml-auto">Soll: {z.zielDatum}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[0.7rem] italic text-slate-400 pl-1">Keine aktuellen Mathematik-Förderziele definiert.</p>
                      )}
                    </div>

                    {/* ÜBERGREIFEND */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-indigo-100 pb-2">
                        <span className="text-base">🧠</span>
                        <h5 className="text-[0.625rem] font-black uppercase text-slate-500 tracking-wider">Fächerübergreifend (Konzentration, Verhalten, Motorik)</h5>
                        <span className="text-[0.5625rem] bg-indigo-50 border border-indigo-100 font-extrabold text-indigo-700 px-2.5 py-0.5 rounded-full">
                          {goalsFiltered.overgreifend.length} {goalsFiltered.overgreifend.length === 1 ? 'Ziel' : 'Ziele'}
                        </span>
                      </div>
                      {goalsFiltered.overgreifend.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {goalsFiltered.overgreifend.map(z => (
                            <div key={z.id} className="group relative p-5 bg-white border border-slate-150 hover:border-slate-200 rounded-3xl shadow-3xs space-y-4 transition-colors">
                              <button
                                type="button"
                                onClick={() => deleteZiel(z.id)}
                                className="absolute right-4 top-4 w-7 h-7 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                title="Ziel löschen"
                              >
                                <Trash2 size={13} />
                              </button>

                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 text-[0.5625rem] font-black uppercase rounded-lg">{z.bereich}</span>
                                
                                <select
                                  value={z.status}
                                  onChange={e => {
                                    const updated = (profil.foerderziele || []).map(item => item.id === z.id ? { ...item, status: e.target.value as any } : item);
                                    updateProfil({ foerderziele: updated });
                                  }}
                                  className={`text-[0.625rem] font-extrabold uppercase px-1.5 py-0.5 pr-5 rounded border-0 focus:ring-0 cursor-pointer outline-none ${
                                    z.status === 'erreicht' ? 'bg-emerald-100 text-emerald-700' : 
                                    z.status === 'in Arbeit' ? 'bg-blue-100 text-blue-700' : 
                                    z.status === 'verworfen' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-550'
                                  }`}
                                >
                                  <option value="offen">Offen</option>
                                  <option value="in Arbeit">In Arbeit</option>
                                  <option value="erreicht">Erreicht</option>
                                  <option value="verworfen">Verworfen</option>
                                </select>
                              </div>

                              <p className="text-[0.8125rem] leading-snug font-semibold text-slate-800 leading-tight pr-6">{z.ziel || 'Kein Zieltext'}</p>
                              {getLinkedDiagnostic(z.diagnostikErhebungId) && (
                                <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[0.625rem] font-bold text-amber-800">
                                  Anlass: {getDiagnosticTestName(getLinkedDiagnostic(z.diagnostikErhebungId)!.testId, app.diagnostikTests || [])}
                                  {' · '}{getLinkedDiagnostic(z.diagnostikErhebungId)!.datum}
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-50 pt-3">
                                <div className="flex items-center gap-1"><Clock size={11} /> Erstellt: {z.startDatum}</div>
                                {z.zielDatum && <div className="ml-auto">Soll: {z.zielDatum}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[0.7rem] italic text-slate-400 pl-1">Keine aktuellen übergreifenden Förderziele definiert.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400 italic text-[0.75rem] leading-tight bg-slate-50 rounded-3xl border border-dashed border-slate-200">Keine Förderziele definiert.</div>
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'massnahmen' && (
            <motion.div 
              key="massnahmen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-2">
                <span className="text-[0.75rem] leading-tight font-bold text-slate-500 pl-1">Pädagogische Maßnahmen und Interventionen.</span>
                <button
                  type="button"
                  onClick={() => setIsAddingMassnahme(!isAddingMassnahme)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 font-extrabold text-[0.625rem] tracking-wider text-white uppercase rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-3xs"
                >
                  <Plus size={12} />
                  Maßnahme hinzufügen
                </button>
              </div>

              {/* ADD MEASURE FORM */}
              <AnimatePresence>
                {isAddingMassnahme && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4 "
                  >
                    <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-850">Neue Fördermaßnahme dokumentieren</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Maßnahme / Bezeichnung</label>
                        <input
                          type="text"
                          placeholder="z.B. Einzelsitzungen mit Lese-Patin"
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-indigo-500/20 text-slate-850 outline-none"
                          value={newMassnahme.bezeichnung}
                          onChange={e => setNewMassnahme({ ...newMassnahme, bezeichnung: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Datum</label>
                          <input
                            type="date"
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700"
                            value={newMassnahme.datum}
                            onChange={e => setNewMassnahme({ ...newMassnahme, datum: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Wirksamkeit</label>
                          <select
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700 outline-none"
                            value={newMassnahme.wirksamkeit}
                            onChange={e => setNewMassnahme({ ...newMassnahme, wirksamkeit: e.target.value as any })}
                          >
                            <option value="unklar">Unklar</option>
                            <option value="gering">Gering</option>
                            <option value="mittel">Mittel</option>
                            <option value="hoch">Hoch (Sehr wirksam)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">
                          Zugehöriges Förderziel
                        </label>
                        <select
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700 outline-none"
                          value={newMassnahme.zielId}
                          onChange={e => setNewMassnahme({ ...newMassnahme, zielId: e.target.value })}
                        >
                          <option value="">Noch keinem Ziel zugeordnet</option>
                          {(profil.foerderziele || [])
                            .filter(goal => goal.status !== 'verworfen')
                            .map(goal => (
                              <option key={goal.id} value={goal.id}>
                                {goal.bereich} · {goal.ziel}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[0.625rem] uppercase font-black text-slate-400 block">
                          Wirksamkeit prüfen am
                        </label>
                        <input
                          type="date"
                          className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold text-slate-700"
                          value={newMassnahme.kontrollDatum}
                          min={newMassnahme.datum}
                          onChange={e => setNewMassnahme({ ...newMassnahme, kontrollDatum: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[0.625rem] uppercase font-black text-slate-400 block">Beschreibung & Pädagogischer Kontext</label>
                      <textarea
                        rows={2.5}
                        placeholder="z.B. Zweimal wöchentlich 20 Minuten lautes Lesen zur Verbesserung des Leseflusses..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-indigo-500/20 text-slate-850 outline-none"
                        value={newMassnahme.beschreibung}
                        onChange={e => setNewMassnahme({ ...newMassnahme, beschreibung: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingMassnahme(false)}
                        className="px-4 py-2 border border-slate-200 hover:bg-white text-[0.75rem] leading-tight font-bold rounded-xl"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="button"
                        disabled={!newMassnahme.bezeichnung.trim()}
                        onClick={addMassnahme}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[0.75rem] leading-tight font-bold rounded-xl"
                      >
                        Speichern
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* MEASURES LIST */}
              <div className="space-y-4">
                 {(profil.massnahmen || []).map((m) => (
                   <div key={m.id} className="group relative p-6 bg-white border border-slate-150 hover:border-slate-250 rounded-3xl shadow-sm flex items-start gap-5 transition-colors">
                      <button
                        type="button"
                        onClick={() => deleteMassnahme(m.id)}
                        className="absolute right-4 top-4 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 text-slate-450 hover:bg-red-50 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        title="Maßnahme löschen"
                      >
                        <Trash2 size={13} />
                      </button>

                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        m.wirksamkeit === 'hoch' ? 'bg-emerald-100 text-emerald-600' :
                        m.wirksamkeit === 'mittel' ? 'bg-blue-100 text-blue-600' : 
                        m.wirksamkeit === 'gering' ? 'bg-amber-100 text-amber-600' : 'bg-slate-150 text-slate-400'
                      }`}>
                         <CheckCircle2 size={24} />
                      </div>
                      <div className="flex-1 pr-8">
                         <h5 className="font-extrabold text-slate-950 text-[0.875rem] leading-snug mb-1">{m.bezeichnung || 'Neue Maßnahme'}</h5>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-3">
                           <label className="space-y-1">
                             <span className="block text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Förderziel</span>
                             <select
                               value={m.zielId || ''}
                               onChange={e => {
                                 const updated = (profil.massnahmen || []).map(item =>
                                   item.id === m.id ? { ...item, zielId: e.target.value || undefined } : item
                                 );
                                 updateProfil({ massnahmen: updated });
                               }}
                               className={`w-full rounded-lg border px-2.5 py-2 text-[0.6875rem] font-bold outline-none ${
                                 m.zielId ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'
                               }`}
                             >
                               <option value="">Noch keinem Ziel zugeordnet</option>
                               {(profil.foerderziele || []).filter(goal => goal.status !== 'verworfen').map(goal => (
                                 <option key={goal.id} value={goal.id}>{goal.bereich} · {goal.ziel}</option>
                               ))}
                             </select>
                           </label>
                           <label className="space-y-1">
                             <span className="block text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Prüftermin</span>
                             <input
                               type="date"
                               value={m.kontrollDatum || ''}
                               min={m.datum}
                               onChange={e => {
                                 const updated = (profil.massnahmen || []).map(item =>
                                   item.id === m.id ? { ...item, kontrollDatum: e.target.value || undefined } : item
                                 );
                                 updateProfil({ massnahmen: updated });
                               }}
                               className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[0.6875rem] font-bold text-slate-700 outline-none"
                             />
                           </label>
                         </div>
                         {getLinkedGoal(m.zielId) && (
                           <p className="mb-2 text-[0.625rem] font-semibold text-emerald-700">
                             Verknüpft mit: {getLinkedGoal(m.zielId)!.ziel}
                           </p>
                         )}
                         {m.kontrollDatum && m.wirksamkeit === 'unklar' &&
                           new Date(`${m.kontrollDatum}T23:59:59`).getTime() < Date.now() && (
                           <p className="mb-2 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-[0.625rem] font-black text-amber-800">
                             <AlertTriangle size={11} /> Wirksamkeitsprüfung fällig
                           </p>
                         )}
                         <p className="text-[0.75rem] leading-tight text-slate-550 font-bold leading-tight mb-3">{m.beschreibung || 'Keine Beschreibung.'}</p>
                         <div className="flex items-center gap-4">
                            <span className="text-[0.5625rem] font-black uppercase text-slate-400 flex items-center gap-1"><Clock size={10} /> {m.datum}</span>
                            
                            <select
                              value={m.wirksamkeit}
                              onChange={e => {
                                const updated = (profil.massnahmen || []).map(item => item.id === m.id ? { ...item, wirksamkeit: e.target.value as any } : item);
                                updateProfil({ massnahmen: updated });
                              }}
                              className={`text-[0.53125rem] font-extrabold uppercase p-1 px-3 pr-6 rounded border-0 focus:ring-0 cursor-pointer outline-none ${
                                m.wirksamkeit === 'hoch' ? 'bg-emerald-50 text-emerald-600' :
                                m.wirksamkeit === 'mittel' ? 'bg-blue-50 text-blue-600' :
                                m.wirksamkeit === 'gering' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-500'
                              }`}
                            >
                              <option value="unklar">Wirksamkeit: Unklar</option>
                              <option value="gering">Wirksamkeit: Gering</option>
                              <option value="mittel">Wirksamkeit: Mittel</option>
                              <option value="hoch">Wirksamkeit: Hoch</option>
                            </select>
                         </div>
                      </div>
                   </div>
                 ))}
                 {(!profil.massnahmen || profil.massnahmen.length === 0) && (
                   <div className="p-12 text-center text-slate-400 italic text-[0.75rem] leading-tight bg-slate-50 rounded-3xl border border-dashed border-slate-200">Keine Maßnahmen dokumentiert.</div>
                 )}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'entwicklung' && (
             <motion.div 
               key="entwicklung"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               transition={{ duration: 0.12 }}
               className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6"
             >
                {/* Ipsative Lernentwicklung (Compact) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                       <TrendingUp size={16} className="text-emerald-500" />
                       Lernentwicklung (ipsativ)
                    </h4>
                  </div>
                  {(!ipsativeData || ipsativeData.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 italic text-[0.75rem] leading-tight bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                       Keine ausreichenden Leistungsdaten für eine ipsative Analyse vorhanden. (Min. 6 Noten pro Fach nötig)
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ipsativeData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl shadow-3xs hover:border-emerald-200 transition-colors">
                           <div>
                              <div className="text-[0.75rem] font-black uppercase tracking-wider text-slate-700">{d.fach}</div>
                              <div className="text-[0.5625rem] font-bold text-slate-400">{d.datenpunkte} Datenpunkte</div>
                           </div>
                           <div className="flex items-center gap-4">
                              <div className="text-right">
                                 <div className={`text-[1.125rem] leading-none font-black ${d.trend === 'steigend' ? 'text-emerald-500' : d.trend === 'fallend' ? 'text-rose-500' : 'text-slate-500'}`}>
                                   {d.trend === 'steigend' ? '📈' : d.trend === 'fallend' ? '📉' : '➡️'} {d.trend === 'steigend' ? '+' : ''}{d.fortschrittProzent.toFixed(1)}%
                                 </div>
                                 <div className="text-[0.5625rem] font-black uppercase text-slate-400">Trend</div>
                              </div>
                              <div className="text-center bg-slate-50 rounded-xl px-3 py-1 border border-slate-100">
                                 <div className="text-[0.875rem] font-black text-slate-900">{d.aktuellerDurchschnitt.toFixed(2)}</div>
                                 <div className="text-[0.5rem] font-bold text-slate-400">Schnitt</div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Exekutive Funktionen (Radar) */}
                <div className="space-y-4 flex flex-col h-full"> 
                  <div className="flex items-center justify-between shrink-0">
                    <h4 className="text-[0.875rem] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                       <Brain size={16} className="text-purple-500" />
                       Exekutive Funktionen
                    </h4>
                    <button 
                      onClick={() => { setApp(prev => ({...prev, activePrintTemplate: 'exekutiv_erfass'})); setPage('diagnostik'); }}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[0.625rem] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Plus size={12} /> Neue Erhebung
                    </button>
                  </div>

                  {!latestExekutiv ? (
                    <div className="p-8 text-center text-slate-400 italic text-[0.75rem] leading-tight bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex-1 flex items-center justify-center min-h-[220px]">
                       Bisher keine exekutiven Funktionen erfasst.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-3xs flex flex-1 flex-col items-center min-h-[300px]">
                       <div className="w-full flex items-center justify-between mb-4">
                          <div>
                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">Letzte Erhebung</span>
                            <div className="text-[0.6875rem] font-bold text-slate-400 mt-1">{latestExekutiv.datum} • {latestExekutiv.meta?.kontext || 'Allgemein'}</div>
                          </div>
                       </div>
                       
                       <div className="w-full flex-1 relative min-h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                              <PolarGrid stroke="#e2e8f0" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#cbd5e1', fontSize: 9 }} />
                              <Radar name={student.vorname} dataKey="A" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.2} />
                            </RadarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end shrink-0">
                    <button 
                      onClick={() => setPage('diagnostik')}
                      className="flex items-center gap-1.5 text-[0.6875rem] font-black text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest"
                    >
                       Vollständiger Verlauf in der Diagnostik <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
             </motion.div>
          )}

          {activeSubTab === 'softskills' && (
             <motion.div 
               key="softskills"
               initial={{ opacity: 0, scale: 0.98 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.98 }}
               transition={{ duration: 0.12 }}
               className="space-y-6"
             >
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="text-[1.125rem] font-black text-slate-900 leading-tight">Kollaboratives Entwicklungsdiagramm</h4>
                    <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fusionierte Soft-Skills & Merkmale</p>
                  </div>
                </div>

                <div className="bg-white/50 border border-slate-150 rounded-[2.5rem] p-4 shadow-sm">
                  <FlowerChart 
                    studentId={student.id} 
                    app={app} 
                    isCollaborative={true} 
                    editable={true} 
                  />
                </div>

                <div className="p-8 bg-indigo-50/40 rounded-[2rem] border border-indigo-100/50 space-y-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-indigo-500" />
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-900">Pädagogische Bilanz</span>
                  </div>
                  <p className="text-[0.8125rem] text-indigo-800 leading-relaxed italic">
                    "Das Diagramm zeigt die Übereinstimmung zwischen der Selbsteinschätzung des Kindes (🌸) und dem Feedback der Lehrperson. Eine hohe Kongruenz ist die beste Basis für gelingende Förderung."
                  </p>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
