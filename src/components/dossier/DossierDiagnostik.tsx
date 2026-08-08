
import React, { useMemo, useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { Stethoscope, Activity, FileText, AlertCircle, Hash, TrendingUp, Plus, Clock, Sparkles, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, HelpCircle, Lightbulb, BookOpen, Calculator, Volume2, Award, Trash2, Brain, ExternalLink, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { berechneIpsativ } from '../../lib/ipsativeAnalyse';
import { FlowerChart } from '../FlowerChart';
import {
  getDiagnosticTestName,
  getValidStudentDiagnostics,
  isDiagnosticAlert
} from '../../lib/diagnosticData';

interface DossierDiagnostikProps {
  student: Student;
  onNavigateTab?: (tab: 'lernziele' | 'foerderprofil') => void;
}

export default function DossierDiagnostik({ student, onNavigateTab }: DossierDiagnostikProps) {
  const { app, setApp, setPage } = useApp();
  const [expandedTestId, setExpandedTestId] = useState<string | null>(null);
  const [chartFilter, setChartFilter] = useState<string>('all');
  const [visualCockpitTab, setVisualCockpitTab] = useState<'antolin' | 'exekutiv' | 'live' | 'ipsativ' | 'schneeflocke' | 'sonne'>('exekutiv');
  
  const diagnosenErhebungen = useMemo(
    () => getValidStudentDiagnostics(app, student.id),
    [app, student.id]
  );
  const rawStudentDiagnostics = useMemo(
    () => (app.diagnostikErhebungen || []).filter(entry => entry.schuelerId === student.id),
    [app.diagnostikErhebungen, student.id]
  );
  const diagnosticAlerts = useMemo(
    () => diagnosenErhebungen.filter(isDiagnosticAlert),
    [diagnosenErhebungen]
  );
  const latestDiagnostic = diagnosenErhebungen[0] || null;
  const invalidDiagnosticCount = Math.max(0, rawStudentDiagnostics.length - diagnosenErhebungen.length);
  const openSupportGoals = (student.foerderprofil?.foerderziele || [])
    .filter(goal => goal.status === 'offen' || goal.status === 'in Arbeit');
  const supportMeasures = student.foerderprofil?.massnahmen || [];
  const distinctProcedures = new Set(diagnosenErhebungen.map(entry => entry.testId)).size;
  const latestDiagnosticDate = latestDiagnostic?.datum
    ? new Date(`${latestDiagnostic.datum}T12:00:00`).toLocaleDateString('de-AT')
    : 'Nicht erfasst';

  const availableTestIdsForChart = useMemo(() => {
    const ids = new Set(diagnosenErhebungen.map(e => e.testId));
    return Array.from(ids);
  }, [diagnosenErhebungen]);

  const latestExekutiv = useMemo(() => {
    const list = diagnosenErhebungen.filter(e => e.type === 'exekutiv');
    return list.length > 0 ? list[0] : null;
  }, [diagnosenErhebungen]);

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

  const ikmRecords = useMemo(() => (app.ikmRecords || [])
    .filter(e => e.schuelerId === student.id)
    .sort((a, b) => (b.datum || '').localeCompare(a.datum || '')), [app.ikmRecords, student.id]);

  const antolinLatestAndAverages = useMemo(() => {
    const allRecords = app.antolinRecords || [];
    
    const latestRecordsByStudent = allRecords.reduce((acc: any[], rec) => {
      const existing = acc.find(r => r.schuelerId === rec.schuelerId);
      if (!existing || rec.datum > existing.datum) {
        if (existing) {
          acc = acc.filter(r => r.schuelerId !== rec.schuelerId);
        }
        acc.push(rec);
      }
      return acc;
    }, []);

    const totalBooks = latestRecordsByStudent.reduce((sum, r) => sum + r.anzahlBuecher, 0);
    const totalPoints = latestRecordsByStudent.reduce((sum, r) => sum + r.punkte, 0);
    const avgLeistung = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.leistung, 0) / latestRecordsByStudent.length) : 0;
    const avgSchwierigkeit = latestRecordsByStudent.length ? (latestRecordsByStudent.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecordsByStudent.length) : 0;

    const avgBooksValue = latestRecordsByStudent.length ? (totalBooks / latestRecordsByStudent.length) : 0;
    const avgPointsValue = latestRecordsByStudent.length ? (totalPoints / latestRecordsByStudent.length) : 0;

    const studentRecords = allRecords
      .filter(r => r.schuelerId === student.id)
      .sort((a, b) => b.datum.localeCompare(a.datum));
    
    const latestStudentRec = studentRecords.length > 0 ? studentRecords[0] : null;

    return {
      studentRecords,
      latestStudentRec,
      avgBooksValue,
      avgPointsValue,
      avgLeistungValue: avgLeistung,
      avgSchwierigkeitValue: avgSchwierigkeit
    };
  }, [app.antolinRecords, student.id]);

  const tests = app.diagnostikTests || [];

  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    
    // Add Standardized Tests
    diagnosenErhebungen.forEach(e => {
      const test = app.diagnostikTests?.find(t => t.id === e.testId);
      events.push({
        id: `test-${e.id}`,
        date: e.datum || 'Unbekannt',
        type: 'test',
        title: getDiagnosticTestName(e.testId, app.diagnostikTests || []),
        subtitle: `${e.ergebniswert} ${test?.einheit || 'PR'}`,
        description: e.kommentar || (e.type === 'exekutiv'
          ? 'Strukturierte pädagogische Beobachtung im Unterricht.'
          : 'Lernstandserhebung ohne ergänzenden Kommentar.'),
        status: isDiagnosticAlert(e) ? 'warning' : 'success',
        icon: '📊',
        rawDate: e.datum || ''
      });
    });

    // Add Status Log Changes
    const statusLogs = (app.statusLog || []).filter((l: any) => l.schuelerId === student.id);
    statusLogs.forEach((l: any) => {
      const behaviorStages = app.behavior_stages || [
        { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
        { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
        { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
        { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
        { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
      ];
      const matchedStage = behaviorStages.find((st: any) => st.id === l.iconId) || behaviorStages[2];
      
      let dateString = 'Kürzlich';
      if (l.timestamp) {
        dateString = new Date(l.timestamp).toLocaleDateString('de-DE');
      }

      events.push({
        id: `status-${l.id || Math.random().toString()}`,
        date: dateString,
        type: 'status',
        title: `Verhaltens-Status: ${matchedStage.label}`,
        subtitle: matchedStage.icon,
        description: `Der Schülerstatus wurde auf "${matchedStage.label}" gesetzt.`,
        status: matchedStage.id === '1' || matchedStage.id === '2' ? 'success' : matchedStage.id === '4' ? 'warning' : matchedStage.id === '5' ? 'danger' : 'neutral',
        icon: matchedStage.icon,
        rawDate: l.timestamp ? new Date(l.timestamp).toISOString() : ''
      });
    });

    // Add Qualitative Observations (Journal)
    const qualitativeNotes = (app.notes || []).filter((n: any) => n.schuelerId === student.id);
    qualitativeNotes.forEach((n: any) => {
      let dateString = 'Kürzlich';
      let rawDate = '';
      if (n.datum) {
        dateString = new Date(n.datum).toLocaleDateString('de-DE');
        rawDate = n.datum;
      }
      
      const isPositive = n.inhalt.toLowerCase().includes('toll') || n.inhalt.toLowerCase().includes('super') || n.inhalt.toLowerCase().includes('stark') || n.inhalt.toLowerCase().includes('verbessert') || n.inhalt.toLowerCase().includes('erledigt');
      const isNegative = n.inhalt.toLowerCase().includes('unruhig') || n.inhalt.toLowerCase().includes('schwierigkeiten') || n.inhalt.toLowerCase().includes('vergessen') || n.inhalt.toLowerCase().includes('durchhänger') || n.inhalt.toLowerCase().includes('probleme');
      
      events.push({
        id: `note-${n.id}`,
        date: dateString,
        type: 'note',
        title: `Beobachtung: ${n.kategorie || 'Journal'}`,
        subtitle: n.quelle || 'Unterricht',
        description: n.inhalt,
        status: isPositive ? 'success' : isNegative ? 'danger' : 'neutral',
        icon: '📝',
        rawDate: rawDate
      });
    });

    // Sort descending by date
    return events.sort((a, b) => {
      const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;
      const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;
      if (dateA && dateB) return dateB - dateA;
      return (b.date || '').localeCompare(a.date || '');
    });

  }, [diagnosenErhebungen, app.statusLog, app.notes, student.id, app.behavior_stages, app.diagnostikTests]);

  // Data for chart
  const chartData = useMemo(() => {
    let filtered = diagnosenErhebungen;
    if (chartFilter !== 'all') {
      filtered = diagnosenErhebungen.filter(e => e.testId === chartFilter);
    }
    if (filtered.length === 0) return [];
    
    return [...filtered].reverse().map(e => {
      let label = '';
      try {
        if (e.datum) {
          if (e.datum.includes('.')) {
            const parts = e.datum.split('.');
            if (parts.length >= 2) {
              label = `${parts[0]}.${parts[1]}.`;
            } else {
              label = e.datum;
            }
          } else {
            const d = new Date(e.datum);
            if (!isNaN(d.getTime())) {
              label = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
            } else {
              label = e.datum;
            }
          }
        } else {
          label = 'Unbekannt';
        }
      } catch (err) {
        label = 'Fehler';
      }
      return {
        datum: label,
        wert: e.ergebniswert,
        testName: tests.find(t => t.id === e.testId)?.name || 'Unbekannter Test'
      };
    });
  }, [diagnosenErhebungen, tests]);

  return (
    <div className="space-y-10 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 bg-indigo-500 rounded-full" />
          <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Diagnostik & Ergebnisse</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setApp(prev => ({ ...prev, activePrintTemplate: 'eltern_diagnostik', activePrintStudentId: student.id }));
              setPage('drucken');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95 border border-rose-100 shadow-sm"
          >
            <FileText size={14} /> Elternbericht (PDF)
          </button>
          <button 
            onClick={() => setPage('diagnostik')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-500 rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 border border-slate-200 shadow-sm"
          >
            Klassen-Übersicht
          </button>
          <button 
            onClick={() => setPage('diagnostik')} 
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus size={14} /> Eintrag erfassen
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-12 overflow-y-auto custom-scrollbar pr-2">
        <section className="space-y-4" aria-labelledby="diagnostik-entscheidung">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
            <div>
              <p className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-indigo-600">Auf einen Blick</p>
              <h4 id="diagnostik-entscheidung" className="text-xl font-black text-slate-900 mt-1">
                Diagnostischer Stand und nächste Schritte
              </h4>
              <p className="text-sm font-medium text-slate-500 mt-1">
                Nur gültige und diesem Kind zugeordnete Erhebungen werden berücksichtigt.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onNavigateTab?.('lernziele')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 text-xs font-black hover:bg-indigo-50 transition-colors"
              >
                <Target size={15} /> Lernziele öffnen
              </button>
              <button
                onClick={() => onNavigateTab?.('foerderprofil')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 transition-colors"
              >
                <Lightbulb size={15} /> Fördermaßnahmen öffnen
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Gültige Erhebungen</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{diagnosenErhebungen.length}</p>
              <p className="text-[0.6875rem] font-semibold text-slate-500 mt-1">{distinctProcedures} Verfahren</p>
            </div>
            <div className={`rounded-2xl border p-4 ${
              diagnosticAlerts.length > 0
                ? 'border-rose-200 bg-rose-50/70'
                : 'border-emerald-200 bg-emerald-50/60'
            }`}>
              <p className={`text-[0.625rem] font-black uppercase tracking-widest ${
                diagnosticAlerts.length > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>Auffällig markiert</p>
              <p className={`text-2xl font-black mt-1 ${
                diagnosticAlerts.length > 0 ? 'text-rose-900' : 'text-emerald-900'
              }`}>{diagnosticAlerts.length}</p>
              <p className="text-[0.6875rem] font-semibold text-slate-500 mt-1">
                {diagnosenErhebungen.length === 0 ? 'Noch keine Datengrundlage' : 'Keine automatische Diagnose'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Letzte Erhebung</p>
              <p className="text-base font-black text-slate-900 mt-2">{latestDiagnosticDate}</p>
              <p className="text-[0.6875rem] font-semibold text-slate-500 mt-1 line-clamp-1">
                {latestDiagnostic
                  ? getDiagnosticTestName(latestDiagnostic.testId, app.diagnostikTests || [])
                  : 'Noch keine Erhebung'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Förderplanung</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{openSupportGoals.length}</p>
              <p className="text-[0.6875rem] font-semibold text-slate-500 mt-1">
                offene Ziele · {supportMeasures.length} Maßnahmen
              </p>
            </div>
          </div>

          {diagnosticAlerts.length > 0 && openSupportGoals.length === 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-black text-amber-900">Auffälligkeit noch ohne offenes Förderziel</p>
                  <p className="text-xs font-medium text-amber-800/80 mt-0.5">
                    Prüfe die Erhebung pädagogisch und dokumentiere nur bei Bedarf ein konkretes Ziel.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab?.('lernziele')}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-black hover:bg-amber-700 transition-colors"
              >
                Ziel prüfen
              </button>
            </div>
          )}

          {invalidDiagnosticCount > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-600">
              <AlertCircle size={15} className="text-slate-500" />
              {invalidDiagnosticCount} {invalidDiagnosticCount === 1 ? 'Eintrag wird' : 'Einträge werden'} wegen unvollständiger oder unpassender Daten nicht ausgewertet.
            </div>
          )}
        </section>

        {/* ==========================================
            INTERACTIVE DIAGNOSTIC & PROGRESS COCKPIT 
           ========================================== */}
        <div className="bg-slate-50/70 border border-slate-150 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-200/50 pb-5">
            <div className="space-y-1">
              <span className="text-[0.625rem] font-black uppercase text-indigo-650 bg-indigo-50/80 px-2.5 py-1 rounded-full border border-indigo-100 tracking-wider">
                Detailansichten
              </span>
              <h4 className="text-[1.375rem] leading-tight font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles size={20} className="text-amber-500" />
                Erhebungen und Lernentwicklung
              </h4>
              <p className="text-[0.75rem] text-slate-400 font-bold uppercase tracking-wider">
                Gespeicherte Ergebnisse nach Bereich
              </p>
            </div>

            {/* Dashboard Tabs bar */}
            <div className="flex flex-col gap-3 w-full xl:w-auto shrink-0 text-left">
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                {[
                  {
                    groupName: '📊 Diagnosen',
                    tabs: [
                      { id: 'exekutiv', label: '🧠 Exekutiv', color: 'hover:bg-purple-50 text-purple-700 bg-purple-50/20' },
                      { id: 'live', label: '🔥 Live 1:1', color: 'hover:bg-rose-50 text-rose-700 bg-rose-50/20' },
                      { id: 'schneeflocke', label: '❄️ IKM Plus', color: 'hover:bg-cyan-50 text-cyan-700 bg-cyan-50/20' }
                    ]
                  },
                  {
                    groupName: '🏆 Leistungen & Ziele',
                    tabs: [
                      { id: 'antolin', label: '📚 Antolin', color: 'hover:bg-amber-50 text-amber-700 bg-amber-50/20' },
                      { id: 'ipsativ', label: '📈 Fortschritt', color: 'hover:bg-emerald-50 text-emerald-700 bg-emerald-50/20' },
                      { id: 'sonne', label: '☀️ Lernziele', color: 'hover:bg-yellow-50 text-yellow-700 bg-yellow-50/20' }
                    ]
                  }
                ].map((group, groupIdx) => (
                  <div key={groupIdx} className="flex flex-col gap-1 bg-slate-200/50 p-1.5 rounded-xl border border-slate-300/30 w-full sm:w-auto">
                    <span className="text-[0.55rem] font-black tracking-wider text-slate-400 px-1 uppercase">{group.groupName}</span>
                    <div className="flex flex-wrap gap-1">
                      {group.tabs.map(tab => {
                        const isSelected = visualCockpitTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setVisualCockpitTab(tab.id as any)}
                            className={`px-2 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white shadow-sm text-slate-900 border border-slate-200 font-black scale-102'
                                : `text-slate-500 hover:text-slate-900 ${tab.color}`
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* TAB 1: ANTOLIN LESE-TACCO */}
            {visualCockpitTab === 'antolin' && (
              <motion.div
                key="antolin-cockpit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full text-left"
              >
                {!antolinLatestAndAverages.latestStudentRec ? (
                  <div className="p-10 text-center bg-white rounded-[2.5rem] border border-slate-150 italic text-[0.6875rem] font-semibold text-slate-500 space-y-3 w-full">
                    <BookOpen size={32} className="mx-auto text-slate-350 block" />
                    <span>Für {student.vorname} liegen noch keine Antolin-Lesedaten vor.</span>
                    <p className="text-[0.625rem] text-slate-400 font-normal uppercase tracking-wider">Leseaufzeichnungen können im Lehrercockpit unter "Diagnostik" importiert oder erfasst werden.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Book Circle Gauge */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col items-center text-center justify-between">
                      <div>
                        <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 block mb-1">Lesequalität & Erfolgsquote</span>
                        <span className="text-xs font-bold text-slate-600">Verständnis der Buchfragen</span>
                      </div>
                      
                      {/* Gauge Ring SVG */}
                      <div className="relative w-36 h-36 flex items-center justify-center my-4">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                          <circle 
                            cx="50" 
                            cy="50" 
                            r="40" 
                            stroke="#f59e0b" 
                            strokeWidth="8" 
                            fill="transparent" 
                            strokeDasharray={251.2}
                            strokeDashoffset={251.2 - (251.2 * (antolinLatestAndAverages.latestStudentRec?.leistung || 0)) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute text-center">
                          <span className="text-[1.75rem] leading-none font-black text-slate-800 block font-mono">
                            {antolinLatestAndAverages.latestStudentRec?.leistung || 0}%
                          </span>
                          <span className="text-[0.55rem] font-black text-slate-400 uppercase tracking-widest">Richtigkeit</span>
                        </div>
                      </div>

                      <div className="text-[0.71875rem] font-bold text-slate-500 bg-amber-50 text-amber-800 border border-amber-100 px-3 py-1.5 rounded-xl">
                        Klassendurchschnitt liegt bei: <span className="font-mono font-black">{antolinLatestAndAverages.avgLeistungValue ? antolinLatestAndAverages.avgLeistungValue.toFixed(0) : 0}%</span>
                      </div>
                    </div>

                    {/* Comparative bar display for total points */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col justify-between text-left font-sans">
                      <div className="space-y-0.5">
                        <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 block">Antolin-Punktetacho</span>
                        <h5 className="font-black text-slate-800 text-[0.875rem] leading-snug">Gelesene Bücher & Fleiß-Bonus</h5>
                      </div>

                      <div className="space-y-4 py-4">
                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[0.6875rem] font-black text-amber-700 uppercase">Eigene Lesepunkte</span>
                            <span className="text-[1.25rem] leading-normal font-black text-slate-800 font-mono">
                              {antolinLatestAndAverages.latestStudentRec?.punkte || 0} <span className="text-xs text-slate-400">Pkt.</span>
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                              style={{ width: `${Math.min(100, ((antolinLatestAndAverages.latestStudentRec?.punkte || 0) / Math.max(250, antolinLatestAndAverages.avgPointsValue * 2)) * 100)}%` }} 
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-baseline mb-1">
                            <span className="text-[0.6875rem] font-black text-slate-500 uppercase">Klassen-Mittelwert</span>
                            <span className="text-[0.875rem] leading-snug font-bold text-slate-555 font-mono">
                              {antolinLatestAndAverages.avgPointsValue ? antolinLatestAndAverages.avgPointsValue.toFixed(0) : 0} Pkt.
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-slate-350 rounded-full" 
                              style={{ width: `${Math.min(100, (antolinLatestAndAverages.avgPointsValue / Math.max(250, antolinLatestAndAverages.avgPointsValue * 2)) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <span className="text-[0.6875rem] font-bold text-slate-500 leading-tight">
                          Das entspricht einem Lese-Zuwachs von <span className="font-black text-slate-700">+{Math.max(0, (antolinLatestAndAverages.latestStudentRec?.punkte || 0) - Math.round(antolinLatestAndAverages.avgPointsValue))} Punkten</span> gegenüber dem Durchschnitt!
                        </span>
                      </div>
                    </div>

                    {/* Parent feedback card with action tips */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col justify-between text-left bg-gradient-to-br from-amber-50/10 to-amber-50/40">
                      <div className="space-y-1.5 font-sans">
                        <div className="flex items-center gap-2">
                          <Sparkles size={14} className="text-amber-500" />
                          <span className="text-[0.625rem] font-black uppercase text-amber-700 tracking-wider">Lese-Pädagogischer Tipp</span>
                        </div>
                        <p className="text-[0.75rem] text-slate-600 leading-relaxed font-semibold">
                          {antolinLatestAndAverages.latestStudentRec?.leistung && antolinLatestAndAverages.latestStudentRec.leistung >= 90 ? (
                            `Hervorragende Leistung! ${student.vorname} liest mit großem Fokus. Wir empfehlen nun, die literarische Bandbreite auf Sachtexte und Abenteuer-Romane auf Stufe ${Math.min(5, (antolinLatestAndAverages.latestStudentRec?.schwierigkeit || 1) + 1)} auszudehnen, um neue Denkanstöße zu wecken.`
                          ) : antolinLatestAndAverages.latestStudentRec?.leistung && antolinLatestAndAverages.latestStudentRec.leistung < 75 ? (
                            `${student.vorname} liest fleißig, übersieht aber manchmal logische Verknüpfungen in langen Texten. Es hilft, Absätze gemeinsam zu lesen und mit kurzen Zwischenfragen ("Wer ist wohin gelaufen?") spielerisch das Sinnerfassen zu üben.`
                          ) : (
                            `Sehr solides Leseverhalten im Normbereich der Klasse! Unterstützen Sie ${student.vorname}, indem Sie feste Lese-Rituale etablieren (z.B. täglich 10 Minuten vor dem Schlafen eigenständig lesen und am nächsten Tag die Quizfragen auf Antolin lösen).`
                          )}
                        </p>
                      </div>

                      <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between font-sans">
                        <span className="text-[0.6rem] font-black text-slate-400">STUFEN-TARGETS: 2. Klässler</span>
                        <span className="text-[0.625rem] font-black text-amber-700">Schnitt: ST {antolinLatestAndAverages.latestStudentRec?.schwierigkeit || 2.4}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 2: EXEKUTIVES KOMPETENZPROFIL */}
            {visualCockpitTab === 'exekutiv' && (
              <motion.div
                key="exekutiv-cockpit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-6 rounded-3xl border border-slate-150 space-y-6 text-left"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[0.5625rem] font-black uppercase text-purple-600 tracking-wider flex items-center gap-1">
                      <Brain size={12} /> Neurologisches Exekutiv-Profil
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-xs">Untersuchung kognitiver Steuerungsleistungen des Stirnhirns</h5>
                  </div>
                  {latestExekutiv?.datum && (
                    <span className="text-[0.6875rem] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border">Letzter Check: {latestExekutiv.datum}</span>
                  )}
                </div>

                {!latestExekutiv ? (
                  <div className="p-10 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-slate-500 italic text-[0.6875rem] font-semibold space-y-3 w-full">
                    <Brain size={32} className="mx-auto text-slate-350 block" />
                    <span>Für {student.vorname} wurde noch kein neurologisches Exekutiv-Profil erfasst.</span>
                    <p className="text-[0.625rem] text-slate-400 font-normal uppercase tracking-wider">Erhebungen können im Lehrercockpit unter "Diagnostik" eingetragen werden.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    {/* Skill range slider blocks */}
                    <div className="space-y-4">
                      {[
                        { key: 'arbeitsgedaechtnis', label: 'Arbeitsgedächtnis (AG)', desc: 'Zahlen, Anweisungen kurzfristig merken und damit arbeiten', value: latestExekutiv?.meta?.arbeitsgedaechtnis || 4, color: 'bg-indigo-500' },
                        { key: 'inhibition', label: 'Inhibition / Impulskontrolle (Inh)', desc: 'Abwarten können, Störreizen widerstehen, Automatismen bremsen', value: latestExekutiv?.meta?.inhibition || 3, color: 'bg-emerald-500' },
                        { key: 'flexibilitaet', label: 'Planung & Flexibilität (Flex)', desc: 'Sich flexibel auf neue Aufgabenstrukturen einstellen', value: latestExekutiv?.meta?.flexibilitaet || 4, color: 'bg-amber-500' },
                        { key: 'aktivierung', label: 'Aktivierung & Initiierung (Akt)', desc: 'Ausdauernd beginnen und Aufgaben selbstständig anpacken', value: latestExekutiv?.meta?.aktivierung || 3, color: 'bg-teal-500' },
                        { key: 'emotionen', label: 'Emotionsregulation (Emo)', desc: 'Frusttoleranz bei Misserfolgen kontrolliert managen', value: latestExekutiv?.meta?.emotionen || 3, color: 'bg-rose-500' }
                      ].map(metric => {
                        const valueName = metric.value >= 4.5 ? 'Ausgezeichnet' : metric.value >= 3.5 ? 'Ziel erreicht / Stabil' : metric.value >= 2.5 ? 'Gelegentlich labil' : 'Fokusbedarf / Schwach';
                        const valueColor = metric.value >= 3.5 ? 'text-emerald-600' : metric.value >= 2.5 ? 'text-amber-600' : 'text-rose-600';
                        return (
                          <div key={metric.key} className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/50">
                            <div className="flex justify-between items-baseline">
                              <div>
                                <span className="text-xs font-black text-slate-800 block">{metric.label}</span>
                                <span className="text-[0.625rem] text-slate-400 font-medium block leading-normal">{metric.desc}</span>
                              </div>
                              <span className={`text-[0.6875rem] font-bold ${valueColor}`}>
                                {metric.value}/5 • {valueName}
                              </span>
                            </div>
                            
                            <div className="relative pt-1">
                              <div className="flex mb-1 items-center justify-between">
                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                                  {[1,2,3,4,5].map((level) => {
                                    const opacityStyle = level <= metric.value ? 'opacity-100' : 'opacity-20';
                                    return (
                                      <div 
                                        key={level} 
                                        className={`flex-1 h-full mr-0.5 last:mr-0 rounded ${metric.color} ${opacityStyle} transition-all`} 
                                      />
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Brain Explanation and Parent Guidance */}
                    <div className="space-y-4 p-5 bg-purple-50/30 rounded-3xl border border-purple-150/40">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                          <Brain size={18} />
                        </div>
                        <div>
                          <span className="text-[0.5625rem] font-black uppercase text-purple-700 tracking-wider block">Kognitive Neurowissenschaft im Klassenzimmer</span>
                          <h6 className="font-extrabold text-slate-800 text-xs">Warum diese Kompetenzen entscheidend sind:</h6>
                        </div>
                      </div>

                      <p className="text-[0.75rem] text-slate-600 leading-relaxed font-semibold">
                        Exekutive Funktionen steuern als "Chefplaner" im Gehirn selbstorganisiertes Lernen, emotionale Stabilität und Zielverfolgung. Im Gegensatz zur Intelligenz sind diese Steuerungen durch Alltagsrituale, gezielte Bewegungspausen und logische Visualisierungen hochgradig trainierbar.
                      </p>

                      <div className="bg-white p-3 rounded-2xl border border-purple-100/30 text-[0.6875rem] text-purple-900/80 font-bold space-y-1.5 leading-relaxed">
                        <span className="font-extrabold text-purple-800 uppercase text-[0.55rem] block">Alltagsempfehlungen für zu Hause:</span>
                        <p>
                          🎯 **Inhibition**: Brettspiele wie "Halt mal kurz" oder "Mensch ärgere dich nicht" stärken spielerisch das Abwarten und die Frusttoleranz.
                        </p>
                        <p>
                          📝 **Arbeitsgedächtnis**: Dem Kind nur eine Instruktion zurzeit geben ("Bitte hänge zuerst deine Jacke auf, DANN hole deine Schultasche").
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 3: 1:1 Live-DIAGNOSEN */}
            {visualCockpitTab === 'live' && (
              <motion.div
                key="live-cockpit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
              >
                {/* Live Reading Gauge */}
                {(() => {
                  const rgwTest = diagnosenErhebungen.find(e => e.testId === 'live-lesefluessigkeit');
                  
                  return (
                    <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[0.625rem] font-black text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0 select-none">
                            <Sparkles size={11} className="text-amber-500 animate-pulse" /> 1:1 Lesefluss-Messer (WPM)
                          </span>
                          {rgwTest?.datum && (
                            <span className="text-[0.5625rem] font-bold text-slate-400">{rgwTest.datum}</span>
                          )}
                        </div>
                        <h5 className="font-extrabold text-slate-800 text-xs">Individuelle Lesegeschwindigkeit & Genauigkeit</h5>
                      </div>

                      {rgwTest ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                              <span className="text-[1.375rem] leading-normal font-black text-slate-900 font-mono block">
                                {rgwTest.meta?.rgw} <span className="text-xs text-slate-400">WPM</span>
                              </span>
                              <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest mt-1 block">Lesetempo</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                              <span className="text-[1.375rem] leading-normal font-black text-rose-600 font-mono block">
                                {rgwTest.meta?.accuracy}%
                              </span>
                              <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest mt-1 block">Wortgenauigkeit</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[0.6875rem] font-bold">
                              <span>Leseschnelligkeit (Wort / Minute)</span>
                              <span className="text-slate-400">Ziel: {rgwTest.meta?.targetThreshold} WPM</span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-rose-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${Math.min(100, (rgwTest.meta?.rgw / rgwTest.meta?.targetThreshold) * 100)}%` }} 
                              />
                            </div>
                          </div>

                          <p className="text-[0.6875rem] text-slate-500 font-medium bg-rose-50/20 p-2.5 rounded-xl border border-rose-100/30 leading-relaxed italic">
                            💡 **Lesegenauigkeit**: Mit {rgwTest.meta?.accuracy}% Fehlerminimierung ist das Kind im <span className="font-extrabold text-rose-700">{rgwTest.meta?.accuracy >= 95 ? 'sicheren Einzelleser-Bereich' : 'instruktiven Frustrations-Grenzbereich'}</span>.
                          </p>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs italic font-semibold">
                          Es liegen noch keine 1:1 Live-Lesetests vor. Diesen können Sie kinderleicht im Lehrercockpit erfassen.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Live Math/Arithmetic Gauge */}
                {(() => {
                  const mathTest = diagnosenErhebungen.find(e => e.testId === 'live-kopfrechnen');
                  
                  return (
                    <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[0.625rem] font-black text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg uppercase tracking-wider flex items-center gap-1 shrink-0 select-none">
                            <Sparkles size={11} className="text-yellow-500 animate-pulse" /> 1:1 Kopfrechnen & Faktenabruf
                          </span>
                          {mathTest?.datum && (
                            <span className="text-[0.5625rem] font-bold text-slate-400">{mathTest.datum}</span>
                          )}
                        </div>
                        <h5 className="font-extrabold text-slate-800 text-xs">Arithmetischer Faktenabruf & Rechengeschwindigkeit</h5>
                      </div>

                      {mathTest ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                              <span className="text-[1.375rem] leading-normal font-black text-slate-900 font-mono block">
                                {mathTest.meta?.automated} <span className="text-xs text-slate-400">/10</span>
                              </span>
                              <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest mt-1 block">Blitz-Fakten (Auto)</span>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-2xl border text-center">
                              <span className="text-[1.375rem] leading-normal font-black text-teal-600 font-mono block">
                                {mathTest.meta?.correctPercent}%
                              </span>
                              <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest mt-1 block">Richtigkeit</span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[0.6875rem] font-bold">
                              <span>Direkter automatisierter Zugriff</span>
                              <span className="text-slate-400">Strategisch gerechnet: {mathTest.meta?.calculated}/10</span>
                            </div>
                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-teal-500 rounded-full transition-all duration-1000" 
                                style={{ width: `${(mathTest.meta?.automated / 10) * 100}%` }} 
                              />
                            </div>
                          </div>

                          <p className="text-[0.6875rem] text-slate-500 font-medium bg-teal-50/20 p-2.5 rounded-xl border border-teal-100/30 leading-relaxed italic">
                            🧠 **Rechenfehler**: Hat {mathTest.meta?.carryErrors || 0} Zehnerübergangsfehler gemacht. Ein klarer Hinweis auf Förderimpulse zur Zehnerüberbrückung.
                          </p>
                        </div>
                      ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs italic font-semibold">
                          Bisher wurde noch kein 1:1 Kopfrechentest (Live-Assessment) im Lehrercockpit durchgeführt.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}

            {/* TAB 4: IPSATIV LERNFORTSCHRITT */}
            {visualCockpitTab === 'ipsativ' && (
              <motion.div
                key="ipsativ-cockpit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-6 rounded-3xl border border-slate-150 space-y-6 text-left"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[0.5625rem] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                      <TrendingUp size={12} /> Ipsativer Entwicklungs-Fortschritt
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-xs">Entwicklung im Eigenvergleich (Keff-Index: Fortschritt über Zeit)</h5>
                  </div>
                  <span className="text-[0.5625rem] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 tracking-wider select-none">
                    Selbstvergleich statt Sozialnorm
                  </span>
                </div>

                {!ipsativeData || ipsativeData.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-3xl text-slate-500 italic text-xs font-semibold space-y-4">
                    <TrendingUp size={32} className="mx-auto text-slate-300 block" />
                    <span>Schreibe mind. 6 Noten in verschiedenen Fächern auf, um den persönlichen Wachstums-Indikator (Ipsativer Fortschritt) live zu errechnen!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={ipsativeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="fach" tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                            labelStyle={{ fontWeight: 900, fontSize: '10px' }}
                          />
                          <Bar dataKey="fortschrittProzent" fill="#10b981" radius={[8, 8, 0, 0]}>
                            {ipsativeData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.fortschrittProzent >= 0 ? '#10b981' : '#f43f5e'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4 p-5 bg-emerald-50/20 rounded-3xl border border-emerald-100/50">
                      <h6 className="text-[0.6875rem] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles size={13} className="text-amber-500 animate-pulse shrink-0" />
                        Anerkennung & Motivationstheorie:
                      </h6>
                      <p className="text-[0.75rem] text-slate-600 leading-relaxed font-semibold">
                        Die ipsative Bewertung vergleicht {student.vorname}s aktuelle Leistung ausschließlich mit seinen eigenen früheren Leistungen, nicht mit der Klasse. Dieser pädagogische Ansatz bricht negative Frustrationsschleifen auf und lässt Kinder ihr eigenes Lernen als stetigen Fortschritt begreifen ("Ich kann heute mehr als gestern!").
                      </p>
                      
                      {/* Highlight the strongest progression */}
                      {(() => {
                        const positiveOnly = [...ipsativeData].filter(i => i.fortschrittProzent > 0).sort((a,b) => b.fortschrittProzent - a.fortschrittProzent);
                        if (positiveOnly.length > 0) {
                          return (
                            <div className="bg-white p-3 rounded-2xl border border-emerald-100/30 text-[0.6875rem] text-slate-700 font-bold leading-normal">
                              🏆 **Grund zum Feiern!** Die größte persönliche Leistungssteigerung verzeichnet {student.vorname} im Fach <span className="font-extrabold text-emerald-600">{positiveOnly[0].fach}</span> mit herausragenden <span className="font-extrabold text-emerald-600">+{positiveOnly[0].fortschrittProzent.toFixed(1)}%</span> Zuwachs!
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB 5: IKM PLUS COMPETENCY SNOWFLAKE */}
            {visualCockpitTab === 'schneeflocke' && (() => {
              const latestIkm = ikmRecords[0];
              if (!latestIkm) {
                return (
                  <motion.div
                    key="schneeflocke-unregistered"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white p-8 rounded-3xl border border-slate-150 text-center text-slate-500 italic text-[0.6875rem] font-bold space-y-3 w-full"
                  >
                    <span className="block text-slate-600 text-sm">Keine standardisierten IKM-Daten</span>
                    <p className="text-[0.75rem] text-slate-400 font-semibold leading-relaxed max-w-md mx-auto">Für {student.vorname} wurden noch keine IKM Plus-Ergebnisse erfasst. Die Ergebnisse können im Lehrercockpit unter "Diagnostik" eingetragen werden.</p>
                  </motion.div>
                );
              }

              const domains = [
                { domain: 'Leseverständnis (Sachtexte)', score: latestIkm.deutschLesenPR, desc: 'Informationen aus komplexen Sachtexten entnehmen und deuten', color: 'bg-cyan-500' },
                { domain: 'Mathematische Basiskompetenz', score: latestIkm.mathematikPR, desc: 'Arithmetik, Geometrie und logisches Schließen im Zahlenraum', color: 'bg-blue-500' },
                { domain: 'Zuhören & Sinnerfassen', score: latestIkm.deutschZuhoerenPR, desc: 'Inhalte von Audiobeiträgen und Erzählungen exakt rekonstruieren', color: 'bg-teal-500' },
                { domain: 'Sprachbewusstsein', score: latestIkm.deutschSprachbewusstseinPR, desc: 'Grammatik-Strukturen, Rechtschreibung und Wortbedeutung bestimmen', color: 'bg-indigo-500' }
              ].filter(d => d.score !== undefined && d.score !== null);

              if (domains.length === 0) {
                return (
                  <motion.div
                    key="schneeflocke-no-scores"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white p-8 rounded-3xl border border-slate-150 text-center text-slate-500 italic text-[0.6875rem] font-bold space-y-3 w-full"
                  >
                    <span className="block text-slate-600 text-sm">Daten unvollständig</span>
                    <p className="text-[0.75rem] text-slate-400 font-semibold leading-relaxed max-w-md mx-auto">Für {student.vorname} sind im letzten IKM-Eintrag noch keine Fach-Prozentränge erfasst worden.</p>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key="schneeflocke-cockpit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-6 rounded-3xl border border-slate-150 space-y-6 text-left"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[0.5625rem] font-black uppercase text-cyan-600 tracking-wider flex items-center gap-1">
                        ❄️ IKM Plus Standardisiertes Kompetenzprofil
                      </span>
                      <h5 className="font-extrabold text-slate-800 text-xs">Bundesweites Kompetenz-Screening im Vergleich zur Referenz-Norm</h5>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      {domains.map((entry, idx) => {
                        const scoreNum = Number(entry.score);
                        const achievementStatus = scoreNum >= 85 ? 'Weit übertroffen 🚀' : scoreNum >= 70 ? 'Standard erreicht ⭐' : scoreNum >= 50 ? 'In Entwicklung 🌱' : 'Fokusförderungsbedarf ⚠️';
                        const statusColor = scoreNum >= 85 ? 'text-cyan-600' : scoreNum >= 70 ? 'text-emerald-600' : scoreNum >= 50 ? 'text-amber-600' : 'text-rose-600';
                        return (
                          <div key={idx} className="space-y-1.5 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/50">
                            <div className="flex justify-between items-baseline">
                              <div>
                                <span className="text-xs font-black text-slate-805 block">{entry.domain}</span>
                                <span className="text-[0.625rem] text-slate-400 font-medium block leading-normal">{entry.desc}</span>
                              </div>
                              <span className="text-xs font-mono font-black text-slate-705">{scoreNum} <span className="text-[0.6rem] font-bold text-slate-400">PR</span></span>
                            </div>
                            
                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative">
                              <div className="absolute top-0 bottom-0 left-[70%] w-0.5 bg-slate-350 z-10" title="Klassenschnitt (70 PR)" />
                              <div 
                                className={`h-full ${entry.color} rounded-full transition-all duration-1000`} 
                                style={{ width: `${scoreNum}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[0.625rem] font-bold">
                              <span className={statusColor}>{achievementStatus}</span>
                              <span className="text-slate-400 font-bold">Bundesnetzwert: 50 | Klassenschnitt: 70 PR</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4 p-5 bg-cyan-50/20 rounded-3xl border border-cyan-150/40 text-left">
                      <span className="text-[0.55rem] font-black uppercase text-cyan-800 tracking-widest block">💡 Pädagogischer Elternkompass (IKM)</span>
                      <p className="text-[0.75rem] text-slate-650 leading-relaxed font-semibold">
                        Die IKM Plus Ergebnisse messen Schüler-Kompetenzen standardisiert nach Standard-Kriterien des Lehrplans. Sie dienen als neutrale Orientierungshilfe zur Stärkenförderung.
                      </p>
                      <div className="bg-white p-3.5 rounded-2xl border border-cyan-100/50 text-[0.6875rem] leading-relaxed font-bold text-slate-700 space-y-2">
                        <span className="text-slate-900 block font-black uppercase text-[0.55rem]">Optimierungstipps für Zuhause:</span>
                        <p>📖 **Leseverständnis**: Ermuntern Sie das Kind, Sachtexte, Kochrezepte oder Spielanleitungen eigenständig zu deuten.</p>
                        <p>🧮 **Mathematik**: Rechnen Sie Alltagsaktivitäten spielerisch ein ("Wenn wir 3 Äpfel für 90 Cent kaufen, wie viel kostet einer?").</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {/* TAB 6: LERNZIEL-SONNE / FLOWERCHART */}
            {visualCockpitTab === 'sonne' && (
              <motion.div
                key="sonne-cockpit"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="bg-white p-6 rounded-3xl border border-slate-150 text-left space-y-6"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div className="space-y-0.5">
                    <span className="text-[0.5625rem] font-black uppercase text-yellow-600 tracking-wider flex items-center gap-1">
                      ☀️ Pädagogisches Lernziel-Sonnenblumen-Diagramm (FlowerChart)
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-xs">Ganzheitliche, bildhafte Darstellung aktiver Lehrplanziele & Kernkompetenzen</h5>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-5 flex justify-center py-2 min-h-[300px] lg:h-auto lg:min-h-[400px] relative">
                    <FlowerChart studentId={student.id} app={app} />
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <h6 className="text-[0.6875rem] font-black text-amber-800 uppercase tracking-widest">Wie man die Lernziel-Sonne liest:</h6>
                    <p className="text-[0.75rem] text-slate-600 leading-relaxed font-semibold">
                      Jedes Blütenblatt repräsentiert ein zentrales Fach oder ein Kompetenzfeld. Je größer, praller und farbiger das Blütenblatt gewachsen ist, desto stabiler und gefestigter beherrscht {student.vorname} dieses Unterrichtsthema.
                    </p>
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border text-[0.625rem] font-bold">
                      <div className="space-y-1">
                        <span className="block font-black text-rose-600">🔴 Kleine Blütenblätter:</span>
                        <p className="text-slate-500">Themen mit erhöhtem Förderbedarf, die wir im Unterricht spielerisch wiederholen.</p>
                      </div>
                      <div className="space-y-1">
                        <span className="block font-black text-emerald-600">🟢 Große Blütenblätter:</span>
                        <p className="text-slate-500">Stabile Kompetenzen mit hoher Eigenmotivation, auf die das Kind stolz sein kann.</p>
                      </div>
                    </div>
                    <p className="text-[0.6875rem] text-slate-400 italic font-bold font-sans">
                      Dieses bildhafte Feedback wird von Kindern und Eltern gleichermaßen geliebt, da es die Leistung nicht als "kalte Note" sondern als organisch wachsende Blume visualisiert.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>


        {/* NEW SUMMARY SECTION: IPSATIV, EXEKUTIV, INTERAKTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Interaktions Box */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
             <div>
               <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-blue-500 px-2 flex items-center gap-2 mb-4">
                 <Activity size={12} className="text-blue-500" />
                 Individuelle Interaktion
               </h4>
               <div className="px-2 space-y-3">
                 {(() => {
                    const studentLog = app.interaktionsLog?.eintraege?.filter(e => e.schuelerId === student.id) || [];
                    const student1to1 = studentLog.filter(e => e.war1zu1).sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
                    const last1to1 = student1to1.length > 0 ? new Date(student1to1[0].datum).toLocaleDateString('de-DE') : 'Nie';
                    return (
                       <>
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                             <span className="text-[0.6875rem] font-black text-slate-500 uppercase tracking-wider">1:1 Kontakte (Gesamt)</span>
                             <span className="font-black text-slate-800">{student1to1.length}</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                             <span className="text-[0.6875rem] font-black text-slate-500 uppercase tracking-wider">Letzter Kontakt</span>
                             <span className="font-black text-blue-600">{last1to1}</span>
                          </div>
                       </>
                    );
                 })()}
               </div>
             </div>
             <div className="pt-4 mt-4 border-t border-slate-50 flex justify-end">
               <button 
                 onClick={() => setPage('diagnostik')} 
                 className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
               >
                 Interaktion loggen <ExternalLink size={12}/>
               </button>
             </div>
           </div>

           {/* Ipsativ Box */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
             <div>
               <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-emerald-500 px-2 flex items-center gap-2 mb-4">
                 <TrendingUp size={12} className="text-emerald-500" />
                 Lernfortschritt (ipsativ)
               </h4>
               {(!ipsativeData || ipsativeData.length === 0) ? (
                  <p className="px-2 text-[0.75rem] text-slate-400 font-bold italic py-4">Zu wenig Leistungsdaten (min. 6 Noten).</p>
               ) : (
                  <div className="space-y-2 px-2">
                     {ipsativeData.slice(0, 3).map((d, i) => (
                       <div key={i} className="flex justify-between items-center text-[0.875rem] font-bold">
                         <span className="text-slate-600">{d.fach}</span>
                         <span className={d.trend === 'steigend' ? 'text-emerald-500' : d.trend === 'fallend' ? 'text-rose-500' : 'text-slate-500'}>
                           {d.trend === 'steigend' ? '+' : ''}{d.fortschrittProzent.toFixed(1)}% {d.trend === 'steigend' ? '📈' : d.trend === 'fallend' ? '📉' : '➡️'}
                         </span>
                       </div>
                     ))}
                  </div>
               )}
             </div>
             <div className="pt-4 mt-4 border-t border-slate-50 flex justify-end">
               <button onClick={() => setPage('diagnostik')} className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors">Vollständiger Verlauf <ExternalLink size={12}/></button>
             </div>
           </div>

           {/* Exekutiv Box */}
           <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
             <div>
               <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-purple-500 px-2 flex items-center gap-2 mb-4">
                 <Brain size={12} className="text-purple-500" />
                 Exekutive Funktionen
               </h4>
               {!latestExekutiv ? (
                  <p className="px-2 text-[0.75rem] text-slate-400 font-bold italic py-4">Keine Erhebung dokumentiert.</p>
               ) : (
                  <div className="px-2">
                     <div className="text-[0.6875rem] font-bold text-slate-400 mb-3">{latestExekutiv.datum} • {latestExekutiv.meta?.kontext}</div>
                     <div className="grid grid-cols-5 gap-2 text-center">
                        <div><div className="text-[1.125rem] font-black text-slate-800">{latestExekutiv.meta?.arbeitsgedaechtnis}</div><div className="text-[0.5rem] font-black uppercase tracking-tighter text-slate-400 mt-1">AG</div></div>
                        <div><div className="text-[1.125rem] font-black text-slate-800">{latestExekutiv.meta?.inhibition}</div><div className="text-[0.5rem] font-black uppercase tracking-tighter text-slate-400 mt-1">Inh</div></div>
                        <div><div className="text-[1.125rem] font-black text-slate-800">{latestExekutiv.meta?.flexibilitaet}</div><div className="text-[0.5rem] font-black uppercase tracking-tighter text-slate-400 mt-1">Flex</div></div>
                        <div><div className="text-[1.125rem] font-black text-slate-800">{latestExekutiv.meta?.aktivierung}</div><div className="text-[0.5rem] font-black uppercase tracking-tighter text-slate-400 mt-1">Akt</div></div>
                        <div><div className="text-[1.125rem] font-black text-slate-800">{latestExekutiv.meta?.emotionen}</div><div className="text-[0.5rem] font-black uppercase tracking-tighter text-slate-400 mt-1">Emo</div></div>
                     </div>
                  </div>
               )}
             </div>
             <div className="pt-4 mt-4 border-t border-slate-50 flex justify-end">
               <button onClick={() => setPage('diagnostik')} className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-widest text-slate-400 hover:text-purple-600 transition-colors">Vollständiger Verlauf <ExternalLink size={12}/></button>
             </div>
           </div>
        </div>

        {/* VISUALIZATION SECTION */}
        {diagnosenErhebungen.length > 1 && (
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                <TrendingUp size={12} className="text-indigo-500" />
                Verlauf & Analyse
              </h4>
              <select 
                value={chartFilter}
                onChange={(e) => setChartFilter(e.target.value)}
                className="text-[0.75rem] leading-tight font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg py-1 px-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Alle Messungen</option>
                {availableTestIdsForChart.map(testId => {
                  const test = tests.find(t => t.id === testId);
                  return <option key={testId} value={testId}>{test?.name || testId}</option>;
                })}
              </select>
            </div>
            {chartData.length > 1 ? (
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="datum" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 900 }}
                      labelStyle={{ fontSize: '9px', color: '#64748b', fontWeight: 700, marginBottom: '4px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="wert" 
                      stroke="#4f46e5" 
                      strokeWidth={4} 
                      dot={{ r: 5, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 7, strokeWidth: 0 }}
                      animationDuration={1500}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
               <div className="h-[200px] flex items-center justify-center text-[0.75rem] leading-tight font-bold text-slate-400 italic">
                 Mindestens 2 Messungen für die Verlaufskurve benötigt.
               </div>
            )}
          </div>
        )}

        {/* SHORT-TERM GOALS (Ziele / Meilensteine) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
              <Target size={12} className="text-indigo-500" />
              Persönliche Meilensteine & Vorhaben 🎯
            </h4>
            <span className="text-[0.5625rem] font-black uppercase text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 tracking-wider">
              {((app.schuelerGoals || []).filter((g: any) => g.schuelerId === student.id)).length} Vorhaben vereinbart
            </span>
          </div>

          {(() => {
            const studentGoals = (app.schuelerGoals || []).filter((g: any) => g.schuelerId === student.id);
            if (studentGoals.length === 0) {
              return (
                <div className="py-8 text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-100 rounded-3xl">
                  <Target size={28} className="mx-auto text-slate-200 block" />
                  <span className="block text-xs font-bold text-slate-500">Noch keine persönlichen Ziele formuliert</span>
                  <p className="text-[0.65rem] text-slate-400 max-w-sm mx-auto">Ziele stärken die Selbstwirksamkeit. Sie können neue Vorhaben direkt im Hauptmenü unter "Diagnostik &gt; Ziel-Diagnostik" vereinbaren.</p>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studentGoals.map((goal: any) => {
                  const stateColor = goal.status === 'erreicht' 
                    ? 'bg-emerald-50/40 border-emerald-100' 
                    : goal.status === 'verworfen'
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : goal.bereich === 'schule'
                    ? 'bg-amber-50/30 border-amber-100'
                    : 'bg-indigo-50/20 border-indigo-100';

                  return (
                    <div key={goal.id} className={`p-4 rounded-2xl border ${stateColor} flex flex-col justify-between text-left space-y-3`}>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.6rem] font-bold text-slate-450">
                            {new Date(goal.datum).toLocaleDateString('de-DE')}
                          </span>
                          <div className="flex gap-1.5 items-center">
                            {goal.bereich === 'schule' ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-black uppercase rounded border border-amber-250 text-[0.55rem]">
                                Schule
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-black uppercase rounded border border-indigo-200 text-[0.55rem]">
                                Leben
                              </span>
                            )}
                            
                            {goal.status === 'aktiv' && (
                              <span className="px-2 py-0.5 bg-sky-50 text-sky-800 font-black uppercase rounded border border-sky-200 text-[0.55rem]">
                                Aktiv 🎯
                              </span>
                            )}
                            {goal.status === 'erreicht' && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black uppercase rounded text-[0.55rem] flex items-center gap-0.5">
                                🏆 Erreicht
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs font-bold text-slate-700 font-sans italic leading-relaxed">
                          "{goal.zielText}"
                        </p>

                        {goal.status === 'erreicht' && goal.reflexion && (
                          <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100 text-[0.65rem] text-emerald-800 font-bold">
                            <span className="block text-[0.55rem] font-black uppercase tracking-wider text-emerald-500 mb-0.5">Rückmeldung & Reflexion:</span>
                            {goal.reflexion}
                          </div>
                        )}
                      </div>

                      {/* Small Quick Actions in Dossier */}
                      {goal.status === 'aktiv' && (
                        <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
                          <button
                            onClick={() => {
                              const reflexion = prompt('Feedback oder Reflexion des Kindes hinzufügen (optional):') || '';
                              setApp((prev: any) => ({
                                ...prev,
                                schuelerGoals: prev.schuelerGoals.map((g: any) => 
                                  g.id === goal.id 
                                    ? { ...g, status: 'erreicht', erledigtAm: new Date().toISOString().split('T')[0], reflexion } 
                                    : g
                                )
                              }));
                            }}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[0.55rem] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            🏆 Erreicht
                          </button>
                          <button
                            onClick={() => {
                              setApp((prev: any) => ({
                                ...prev,
                                schuelerGoals: prev.schuelerGoals.map((g: any) => 
                                  g.id === goal.id ? { ...g, status: 'verworfen' } : g
                                )
                              }));
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[0.55rem] font-black uppercase tracking-wider transition-all cursor-pointer"
                          >
                            Verwerfen
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* CHRONOLOGICAL TIMELINE SECTION */}
        <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
             <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-2 flex items-center gap-2">
                <Clock size={12} className="text-indigo-500" />
                Fortlaufende Lern- & Verhaltens-Timeline
             </h4>
             <span className="text-[0.5625rem] font-black uppercase text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100 tracking-wider">
               {timelineEvents.length} Ereignisse erfasst
             </span>
          </div>

          {timelineEvents.length === 0 ? (
            <p className="text-[0.75rem] leading-tight text-slate-500 italic py-6 text-center border-2 border-dashed border-slate-100 rounded-3xl">Bisher wurden keine Ereignisse oder Beobachtungen für die Timeline dokumentiert.</p>
          ) : (
            <div className="relative border-l-2 border-slate-100 pl-6 ml-4 space-y-8 py-2">
              {timelineEvents.map((ev, idx) => {
                let statusColor = "bg-slate-400";
                let badgeStyle = "bg-slate-50 text-slate-700 border-slate-100";
                if (ev.status === 'success') {
                  statusColor = "bg-emerald-500";
                  badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-100";
                } else if (ev.status === 'warning') {
                  statusColor = "bg-amber-500";
                  badgeStyle = "bg-amber-50 text-amber-700 border-amber-100";
                } else if (ev.status === 'danger') {
                  statusColor = "bg-rose-500";
                  badgeStyle = "bg-rose-50 text-rose-700 border-rose-100";
                }

                return (
                  <div key={ev.id} className="relative group">
                    {/* Ring indicator */}
                    <div className={`absolute -left-[32px] top-1.5 w-4 h-4 rounded-full border-4 border-white ${statusColor} shadow-xs z-10 transition-transform group-hover:scale-125`} />
                    
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                      <div className="space-y-1.5 flex-1">
                         <div className="flex flex-wrap items-center gap-2">
                           <span className="text-[0.75rem] leading-tight font-black text-slate-800">{ev.title}</span>
                           <span className={`text-[0.5625rem] font-black uppercase tracking-widest border px-2 py-0.5 rounded-md ${badgeStyle}`}>
                             {ev.subtitle}
                           </span>
                         </div>
                         <div className="text-[0.75rem] leading-tight font-semibold text-slate-650 leading-relaxed markdown-body">
                           <Markdown>{ev.description}</Markdown>
                         </div>
                      </div>
                      <div className="sm:text-right shrink-0">
                         <span className="text-[0.625rem] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md select-none">{ev.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-12 pt-10 border-t border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <Target size={20} />
              </div>
              <div>
                <h4 className="text-[1.125rem] font-black text-slate-900 leading-tight">Kollaboratives Entwicklungsdiagramm</h4>
                <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fusionierte Soft-Skills & Merkmale</p>
              </div>
            </div>
            
            <div className="bg-slate-50/50 border border-slate-200/60 rounded-[2.5rem] p-4 shadow-sm">
              <FlowerChart 
                studentId={student.id} 
                app={app} 
                isCollaborative={true} 
                editable={true} 
              />
            </div>

            <div className="mt-4 p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50 flex gap-4">
               <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
               <p className="text-[0.75rem] text-indigo-900/70 font-semibold italic">
                 Dieses Diagramm fusioniert klassische Entwicklungswerte (Soft-Skills) mit interaktiven Einschätzungen aus den KEL-Gesprächen.
               </p>
            </div>
          </div>
        </div>

        {/* Antolin SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <BookOpen size={14} className="text-emerald-500" />
                Antolin-Leseanalyse & Klassenvergleich
             </h4>
          </div>

          {antolinLatestAndAverages.studentRecords.length > 0 ? (
            <div className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-200/65 space-y-4 text-left">
              {antolinLatestAndAverages.latestStudentRec && (() => {
                const latest = antolinLatestAndAverages.latestStudentRec;
                const diffBooks = latest.anzahlBuecher - antolinLatestAndAverages.avgBooksValue;
                const diffPoints = latest.punkte - antolinLatestAndAverages.avgPointsValue;
                const diffLeistung = latest.leistung - antolinLatestAndAverages.avgLeistungValue;
                const diffSchwierigkeit = latest.schwierigkeit - antolinLatestAndAverages.avgSchwierigkeitValue;

                return (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3.5 rounded-2xl border border-amber-100/40 text-left">
                        <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Bücher gesamt</span>
                        <span className="text-lg font-black text-amber-700 font-mono mt-1 block">{latest.anzahlBuecher}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-emerald-100/40 text-left">
                        <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Punkte gesamt</span>
                        <span className="text-lg font-black text-emerald-700 font-mono mt-1 block">{latest.punkte}</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-indigo-100/30 text-left">
                        <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Erfolgsquote</span>
                        <span className="text-lg font-black text-indigo-700 font-mono mt-1 block">{latest.leistung}%</span>
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-sky-100/30 text-left">
                        <span className="text-[0.6rem] font-bold text-slate-500 block uppercase font-sans">Ø Schwierigkeit</span>
                        <span className="text-lg font-black text-sky-700 font-mono mt-1 block">ST {latest.schwierigkeit}</span>
                      </div>
                    </div>

                    {/* Comparisons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                        <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Vergleich mit dem Klassendurchschnitt</span>
                        
                        <div className="space-y-1.5">
                          {/* Books */}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs font-semibold text-slate-600">📖 Gelesene Bücher</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.6rem] text-slate-400">Schnitt: {antolinLatestAndAverages.avgBooksValue.toFixed(1)}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffBooks >= 0 ? 'bg-emerald-50 text-emerald-650' : 'bg-rose-50 text-rose-650'}`}>
                                {diffBooks >= 0 ? `+${diffBooks.toFixed(1)}` : diffBooks.toFixed(1)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Points */}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs font-semibold text-slate-600">🏆 Antolinpunkte</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.6rem] text-slate-400">Schnitt: {antolinLatestAndAverages.avgPointsValue.toFixed(0)}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffPoints >= 0 ? 'bg-emerald-50 text-emerald-655' : 'bg-rose-50 text-rose-655'}`}>
                                {diffPoints >= 0 ? `+${diffPoints.toFixed(0)}` : diffPoints.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          {/* Leistung */}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs font-semibold text-slate-600">🎯 Erfolgsquote</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.6rem] text-slate-400">Schnitt: {antolinLatestAndAverages.avgLeistungValue.toFixed(1)}%</span>
                              <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffLeistung >= 0 ? 'bg-emerald-50 text-emerald-655' : 'bg-rose-50 text-rose-655'}`}>
                                {diffLeistung >= 0 ? `+${diffLeistung.toFixed(1)}%` : `${diffLeistung.toFixed(1)}%`}
                              </span>
                            </div>
                          </div>

                          {/* Schwierigkeit */}
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs font-semibold text-slate-600">⚖️ Ø Buchschwierigkeit</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.6rem] text-slate-400">Schnitt: ST {antolinLatestAndAverages.avgSchwierigkeitValue.toFixed(1)}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-bold font-mono ${diffSchwierigkeit >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                {diffSchwierigkeit >= 0 ? `+${diffSchwierigkeit.toFixed(1)}` : diffSchwierigkeit.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* KI analysis block */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                            <Sparkles size={12} className="text-amber-500 animate-pulse" />
                            Pädagogisches Leseprofil (KI-Musteranalyse)
                          </span>
                          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                            {(() => {
                              const interpretations: string[] = [];
                              
                              if (diffBooks > 3 && diffPoints > 80) {
                                interpretations.push(`📚 **Herausragender Lese-Eifer**: Das Kind liest mit ${latest.anzahlBuecher} Werken weit über dem Durchschnitt der Klasse (${antolinLatestAndAverages.avgBooksValue.toFixed(1)}) und sammelt eifrig Bonuspunkte.`);
                              } else if (diffBooks > 0) {
                                interpretations.push(`📚 **Aktiver Leser**: Das Lesevolumen (${latest.anzahlBuecher} Bücher) liegt solides über dem Klassenschnitt.`);
                              } else if (diffBooks < -2) {
                                interpretations.push(`📚 **Wenig Lesemotivation**: Mit erst ${latest.anzahlBuecher} gelesenen Büchern liegt das Kind unter dem Klassenschnitt (${antolinLatestAndAverages.avgBooksValue.toFixed(1)}). Förderung empfohlen.`);
                              } else {
                                interpretations.push(`📚 **Durchschnittlich**: Das Lesetempo liegt im stabilen Mittelfeld der Klasse.`);
                              }

                              if (diffSchwierigkeit >= 0.7) {
                                interpretations.push(`🧠 **Anspruchsvoller Geschmack**: Das Kind traut sich an sichtlich schwerere Kost heran als die Klasse (Ø-Schwierigkeit ST ${latest.schwierigkeit} im Vergleich zum Schulschnitt von ST ${antolinLatestAndAverages.avgSchwierigkeitValue.toFixed(1)}).`);
                              } else if (diffSchwierigkeit >= 0.2) {
                                interpretations.push(`🧠 **Anspruchsvoll**: Die ausgewählten Bücher fallen tendenziell etwas schwieriger aus als bei den Mitschülern.`);
                              } else if (diffSchwierigkeit <= -0.7) {
                                interpretations.push(`🌱 **Leichtere Kost**: Das Kind wählt deutlich einfachere Bücher (ST ${latest.schwierigkeit} vs. Klassendurchschnitt ST ${antolinLatestAndAverages.avgSchwierigkeitValue.toFixed(1)}). Das ist ideal zur Steigerung des Leseflusses und Selbstvertrauens.`);
                              } else {
                                interpretations.push(`⚖️ **Standardniveau**: Die gewählte Lektüre passt genau zum durchschnittlichen Leseniveau der Klasse (ST ${latest.schwierigkeit}).`);
                              }

                              if (latest.leistung >= 90) {
                                interpretations.push(`🎯 **Hohe Lesepräzision**: Mit ${latest.leistung}% richtigen Antworten werden Buchinhalte exzellent verstanden und erinnert.`);
                              } else if (diffLeistung < -8) {
                                interpretations.push(`⚠️ **Flüchtigkeitsrisiko**: Die Erfolgsquote liegt mit ${latest.leistung}% deutlich unter dem Schnitt von ${antolinLatestAndAverages.avgLeistungValue.toFixed(0)}%. Das Kind liest womöglich unaufmerksam.`);
                              }

                              return interpretations.join(' ');
                            })()}
                          </p>
                        </div>
                        <div className="text-[0.6rem] text-slate-400 mt-2 border-t pt-2 flex justify-between">
                          <span>Zuletzt aktualisiert: {new Date(latest.datum).toLocaleDateString('de-DE')}</span>
                          <span>{antolinLatestAndAverages.studentRecords.length} Importe insgesamt</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 italic text-[0.75rem] leading-tight">
              Keine Antolin-Leistungsdaten für diesen Schüler importiert.
            </div>
          )}
        </div>

        {/* IKM Plus SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Hash size={14} className="text-amber-500" />
                IKM Plus Ergebnisse
             </h4>
             {student.ikmNummer && (
               <span className="text-[0.5625rem] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-200">ID: #{student.ikmNummer}</span>
             )}
          </div>

          {ikmRecords.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {ikmRecords.map(r => (
                 <div key={r.id} className="p-6 bg-amber-50/50 border border-amber-100 rounded-3xl shadow-sm space-y-4 relative group">
                    <div className="flex justify-between items-center gap-2">
                       <span className="text-[0.625rem] font-black text-amber-800 uppercase tabular-nums">{r.schuljahr} • {r.schulstufe}. Stufe</span>
                       <button
                         onClick={() => {
                           if (confirm('Möchtest du dieses IKM-Ergebnis wirklich dauerhaft löschen?')) {
                             setApp(prev => ({
                               ...prev,
                               ikmRecords: (prev.ikmRecords || []).filter((item: any) => item.id !== r.id)
                             }));
                           }
                         }}
                         className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded bg-white/20 transition-all opacity-0 group-hover:opacity-100"
                         title="IKM Daten löschen"
                       >
                         <Trash2 size={12} />
                       </button>
                    </div>
                    <div className="space-y-3">
                       {r.mathematikPR !== undefined && (
                         <div className="flex items-center justify-between">
                           <span className="text-[0.6875rem] font-black text-slate-600">Mathe</span>
                           <span className="text-[1.125rem] leading-normal font-black text-slate-900">{r.mathematikPR} PR</span>
                         </div>
                       )}
                       {r.deutschLesenPR !== undefined && (
                         <div className="flex items-center justify-between text-indigo-600">
                           <span className="text-[0.6875rem] font-black">Lesen</span>
                           <span className="text-[1.125rem] leading-normal font-black">{r.deutschLesenPR} PR</span>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 italic text-[0.75rem] leading-tight">
              Keine IKM Plus Daten für diesen Schüler gefunden.
            </div>
          )}
        </div>

        {/* Standardisierte Tests SECTION */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2">
             <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Activity size={14} className="text-indigo-500" />
                Diagnostische Tests & 1:1 Live-Protokolle
             </h4>
          </div>

          {diagnosenErhebungen.length > 0 ? (
            <div className="space-y-4">
              {diagnosenErhebungen.map(e => {
                const test = app.diagnostikTests?.find(t => t.id === e.testId);
                const isExpanded = expandedTestId === e.id;
                const unitLabel = test?.einheit || (e.testId === 'live-lesefluessigkeit' ? 'RGW/min' : e.testId === 'live-kopfrechnen' ? 'Fakten' : 'Pkt');
                const hasMeta = !!e.meta;

                return (
                  <div 
                    key={e.id} 
                    className="bg-white border border-slate-100 rounded-[2rem] shadow-sm  hover:border-indigo-200 transition-all cursor-pointer"
                    onClick={() => setExpandedTestId(isExpanded ? null : e.id)}
                  >
                    {/* Header bar */}
                    <div className="p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${isDiagnosticAlert(e) ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-500'}`}>
                         <span className="text-[1.125rem] leading-normal font-black leading-none">{e.ergebniswert}</span>
                         <span className="text-[0.4375rem] font-black uppercase tracking-tighter text-center max-w-[50px]  text-wrap leading-tight break-words">{unitLabel}</span>
                      </div>
                      <div className="flex-1">
                         <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h5 className="font-black text-slate-900 text-[0.875rem] leading-snug flex items-center gap-1.5">
                              {e.testId?.startsWith('live-') && <Sparkles size={13} className="text-yellow-500 animate-pulse shrink-0" />}
                              {getDiagnosticTestName(e.testId, app.diagnostikTests || [])}
                            </h5>
                            {isDiagnosticAlert(e) && (
                              <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[0.4375rem] font-black uppercase rounded tracking-wider flex items-center gap-0.5 shrink-0">
                                 <AlertCircle size={8} /> Pädagogisch prüfen
                              </span>
                            )}
                            {e.foerderbedarfErkannt && (
                              <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[0.4375rem] font-black uppercase rounded tracking-wider shrink-0">
                                Förderbedarf dokumentiert
                              </span>
                            )}
                            {e.type === 'exekutiv' && (
                              <span className="px-1.5 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 text-[0.4375rem] font-black uppercase rounded tracking-wider shrink-0">
                                Unterrichtsbeobachtung
                              </span>
                            )}
                            {e.testId?.startsWith('live-') && (
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[0.4375rem] font-black uppercase rounded tracking-wider flex items-center gap-0.5 shrink-0">
                                 1:1 Live-Diagnose
                              </span>
                            )}
                         </div>
                         <p className="text-[0.625rem] text-slate-400 font-bold uppercase tracking-widest">
                            {e.datum} • {e.schuljahr} • {e.schulstufe}. Schulstufe • Durchführung: {e.durchgefuehrtVon}
                         </p>
                      </div>
                      <div className="flex items-center gap-3 self-end sm:self-auto text-right" onClick={(ev) => ev.stopPropagation()}>
                         <span className="px-3 py-1 bg-slate-50 text-slate-400 text-[0.625rem] font-black rounded-lg uppercase tracking-widest">{test?.kategorie || 'Allgemein'}</span>
                         
                         <button
                           onClick={(ev) => {
                             ev.stopPropagation();
                             if (confirm('Möchtest du diese Messung/Diagnose wirklich unwiderruflich löschen?')) {
                               setApp(prev => ({
                                 ...prev,
                                 diagnostikErhebungen: (prev.diagnostikErhebungen || []).filter((item: any) => item.id !== e.id)
                               }));
                             }
                           }}
                           className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all h-9 w-9 flex items-center justify-center border border-transparent hover:border-rose-100"
                           title="Messung löschen"
                         >
                           <Trash2 size={15} />
                         </button>

                         <button 
                           onClick={(ev) => {
                             ev.stopPropagation();
                             setExpandedTestId(isExpanded ? null : e.id);
                           }}
                           className="p-2 text-slate-400 hover:text-indigo-650 hover:bg-indigo-50 rounded-xl transition-all h-9 w-9 flex items-center justify-center border border-transparent hover:border-indigo-100"
                         >
                           {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                         </button>
                      </div>
                    </div>

                    {/* Detailed Diagnostics Section on Expand */}
                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 border-t border-slate-50 bg-slate-50/40 text-left space-y-4" onClick={(ev) => ev.stopPropagation()}>
                        {e.meta?.auswertungsgrundlage && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3">
                            <div className="bg-white p-4 rounded-2xl border border-indigo-100">
                              <p className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-600 mb-1">Durchführungsgrundlage</p>
                              <p className="text-sm font-semibold text-slate-700">{e.meta.auswertungsgrundlage.durchfuehrung}</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-emerald-100">
                              <p className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 mb-1">Ergebnis richtig lesen</p>
                              <p className="text-sm font-semibold text-slate-700">{e.meta.auswertungsgrundlage.interpretation}</p>
                            </div>
                          </div>
                        )}
                        {hasMeta ? (
                          <>
                            {/* READING DETAILED PANEL */}
                            {e.meta.type === 'lesen' && (
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                  <BookOpen size={12} /> Detaillierte Lesediagnostik-Ebenen
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Lesetempo (RGW)</span>
                                    <div className="mt-1 flex items-baseline gap-1.5">
                                      <span className="text-[1.125rem] leading-normal font-black text-slate-900">{e.meta.rgw} <span className="text-[0.625rem] text-slate-400">WPM</span></span>
                                      <span className="text-[0.5625rem] font-bold text-slate-400">/ {e.meta.targetThreshold} Orientierung</span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Wortgenauigkeit</span>
                                    <div className="mt-1 flex items-baseline gap-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-indigo-600">{e.meta.accuracy}%</span>
                                      <span className="text-[0.5625rem] font-bold text-slate-400">({e.meta.totalWordsRead - e.meta.errorsCount}/{e.meta.totalWordsRead} W.)</span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Selbstkorrektur-Quote</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-emerald-600">{e.meta.selfCorrections || 0}</span>
                                      <span className="text-[0.5625rem] text-slate-400 font-bold block">Selbstkorrigierte Fehler</span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Gesamtdauer</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-slate-700">{e.meta.duration} Sek.</span>
                                      <span className="text-[0.5625rem] text-slate-400 font-bold block">Vorlese-Stoppuhr</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-[0.75rem] leading-tight text-indigo-950 flex gap-3">
                                  <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <p className="font-extrabold mb-1">Mögliche nächste Unterrichtsschritte für {student.vorname}:</p>
                                    {e.meta.rgw < e.meta.targetThreshold ? (
                                      <p className="font-semibold leading-relaxed text-indigo-900">
                                        Das Lesetempo liegt in diesem Durchgang mit {e.meta.rgw} RGW unter dem hinterlegten Orientierungswert von {e.meta.targetThreshold} RGW. Lesetandems, chorisches Lesen oder kurze Silbenübungen können erprobt und in weiteren Durchgängen beobachtet werden.
                                      </p>
                                    ) : e.meta.accuracy < 94 ? (
                                      <p className="font-semibold leading-relaxed text-indigo-900">
                                        {student.vorname} liest ausreichend schnell ({e.meta.rgw} WPM), hat aber eine erhöhte Fehlerrate (Genauigkeit: {e.meta.accuracy}%). Empfehlenswert sind gezielte Wortendungen-Spiele, genaues Erfassen von Wortstammlängen und kurze Fragen zum Sinnerfassen, um das voraussagende "Überlesen" einzudämmen.
                                      </p>
                                    ) : (
                                      <p className="font-semibold leading-relaxed text-indigo-900">
                                        In diesem Durchgang wurden {e.meta.accuracy}% Wortgenauigkeit und ein sicherer Lesefluss beobachtet. Als nächster Schritt können etwas anspruchsvollere Texte und Fragen zum Sinnerfassen angeboten werden.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* MENTAL ARITHMETIC DETAILED PANEL */}
                            {e.meta.type === 'kopf' && (
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg">
                                  <Calculator size={12} /> Ziffernspeicher & Kopfrechenanalyse
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                  <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Automatisierte Fakten</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-emerald-600">{e.meta.automated} <span className="text-[0.75rem] leading-tight text-slate-400">/ 10</span></span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Strategisch berechnet</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-teal-600">{e.meta.calculated} <span className="text-[0.75rem] leading-tight text-slate-400">/ 10</span></span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Zehnerübergangs-Fehler</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-rose-500">{e.meta.carryErrors || 0}</span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Allgemeine Fehler</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-slate-600">{e.meta.generalErrors || 0}</span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-2xl border border-slate-100 flex flex-col justify-between">
                                    <span className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider">Richtigkeitsquote</span>
                                    <div className="mt-1">
                                      <span className="text-[1.125rem] leading-normal font-black text-slate-800">{e.meta.correctPercent}%</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Question details grid */}
                                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                                  <div className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">Ergebnisliste pro Rechenterm:</div>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {e.meta.answers?.map((ans: any, aIdx: number) => {
                                      let badgeColor = "text-amber-700 bg-amber-50 border-amber-100";
                                      let badgeLabel = "⏱️ Berechnet";
                                      if (ans.response === 'auto') {
                                        badgeColor = "text-emerald-700 bg-emerald-50 border-emerald-100";
                                        badgeLabel = "⚡ Automatisiert";
                                      } else if (ans.response === 'fail_zehner') {
                                        badgeColor = "text-rose-700 bg-rose-50 border-rose-150 animate-pulse";
                                        badgeLabel = "❌ Zehnerfehler";
                                      } else if (ans.response === 'fail_general') {
                                        badgeColor = "text-rose-700 bg-rose-50 border-rose-150";
                                        badgeLabel = "❌ Rechenfehler";
                                      } else if (ans.response === 'no_val') {
                                        badgeColor = "text-slate-400 bg-slate-50 border-slate-100";
                                        badgeLabel = "⚪ Keine Antw.";
                                      }
                                      return (
                                        <div key={aIdx} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-center flex flex-col justify-between">
                                          <span className="text-[0.75rem] leading-tight font-black text-slate-700 font-mono select-all">{ans.q} = {ans.correct}</span>
                                          <span className={`text-[0.5rem] font-black uppercase tracking-tight border px-1.5 py-0.5 rounded-md mt-1.5 ${badgeColor}`}>{badgeLabel}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-150/40 text-[0.75rem] leading-tight text-teal-950 flex gap-3">
                                  <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-extrabold mb-1">Rechen-Lehrpfad für {student.vorname}:</p>
                                    {e.meta.carryErrors > 1 ? (
                                      <p className="font-semibold leading-relaxed text-teal-900">
                                        Es fallen wiederholte Unsicherheiten beim Zehnerübergang auf ({e.meta.carryErrors} Fehler). Es wird empfohlen, die Überbrückung über den 10er aktiv an Rechenrahmen oder Legematerialien zu externalisieren. Das logische Zerlegen ("Zuerst bis zur 10, dann den Rest addieren") muss verbal begleitet werden, um eine kognitive Überlastung zu vermeiden.
                                      </p>
                                    ) : e.meta.automated < 5 ? (
                                      <p className="font-semibold leading-relaxed text-teal-900">
                                        Das prinzipielle mathematische Verständnis ist korrekt (berechnete Lösungen: {e.meta.calculated}/10), jedoch beansprucht das Abrufen von Grundfakten zu viel Zeit (nur {e.meta.automated} automatisierte Abrufe). Spielerische Blitzrechen-Übungen (täglich 5 Minuten) oder digitale Kärtchenabfragen können die Geläufigkeit signifikant stärken.
                                      </p>
                                    ) : (
                                      <p className="font-semibold leading-relaxed text-teal-900">
                                        Erfreulich schneller Abruf! {student.vorname} beherrscht das automatisierte Kopfrechnen ({e.meta.automated}/10 im schnellen Zugriff). Wir können nun beginnen, komplexere halbschriftliche oder schriftliche Rechenverfahren und anspruchsvollere Sachaufgaben einzuführen, um das Kind optimal zu fordern.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* LANGUAGE & GRAMMAR DETAILED PANEL */}
                            {e.meta.type === 'sprache_grammatik' && (
                              <div className="space-y-4">
                                <div className="inline-flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-wider text-pink-800 bg-pink-50 px-2.5 py-1 rounded-lg">
                                  <Volume2 size={12} /> Sprachstrukturen & grammatikalische Bausteine
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-100">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[0.75rem] leading-tight font-black text-slate-700">Abgefragtes Niveau: {e.meta.levelTitle}</span>
                                    <span className="text-[0.75rem] leading-tight font-black text-pink-600">{e.meta.percentage}% Erfolgsquote</span>
                                  </div>
                                  <div className="w-full h-3 bg-slate-100 rounded-full ">
                                    <div className="h-full bg-pink-500 rounded-full transition-all duration-1000" style={{ width: `${e.meta.percentage}%` }} />
                                  </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-slate-100 space-y-2">
                                  <div className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">Überprüfte Sprachmuster im Detail:</div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {e.meta.answers?.map((ans: any, aIdx: number) => (
                                      <div key={aIdx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-[0.75rem] leading-tight">
                                        <span className="font-semibold text-slate-700">{ans.prompt}</span>
                                        {ans.passed ? (
                                          <span className="text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase flex items-center gap-0.5 select-none text-right shrink-0">✅ Gelöst</span>
                                        ) : (
                                          <span className="text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase flex items-center gap-0.5 select-none text-right shrink-0">❌ Fehler</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-[0.625rem] font-black uppercase text-slate-405 tracking-wider">Dokumentierte Notizen der Lehrperson:</div>
                            <div className="text-[0.75rem] leading-tight text-slate-650 bg-white p-4 rounded-2xl border border-slate-100 leading-relaxed font-semibold markdown-body italic">
                               <Markdown>{e.kommentar || "Keine zusätzlichen Details vorhanden."}</Markdown>
                            </div>
                          </div>
                        )}

                        {/* Teacher's raw note showing always as addition if present */}
                        {hasMeta && e.kommentar && e.kommentar.includes("Lehrperson-Notiz:") && (
                          <div className="space-y-1.5 mt-2 bg-white p-4 rounded-2xl border border-slate-100">
                            <div className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">Ergänzende Beobachtung der Lehrkraft:</div>
                            <div className="text-[0.75rem] leading-tight font-semibold text-slate-650 leading-relaxed markdown-body italic">
                               <Markdown>{e.kommentar.split("Lehrperson-Notiz:")[1]?.trim()}</Markdown>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-400 italic text-[0.75rem] leading-tight">
              Bisher wurden keine diagnostischen Tests dokumentiert. Click oben auf "Eintrag erfassen" oder nutze die 1:1 Live-Diagnosen!
            </div>
          )}
        </div>

        {/* Diagnosen & Zusammenfassungen */}
        {student.foerderprofil?.diagnosen && (
           <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50 space-y-4">
              <div className="flex items-center gap-3">
                <Stethoscope size={16} className="text-indigo-500" />
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-900">Pädagogische Diagnosen & Anmerkungen</span>
              </div>
              <div className="text-[0.8125rem] text-indigo-800 leading-relaxed font-medium whitespace-pre-wrap markdown-body">
                <Markdown>{student.foerderprofil.diagnosen}</Markdown>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
