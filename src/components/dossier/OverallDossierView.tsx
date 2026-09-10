import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Star, Smile, Sparkles, Compass, Target, BookOpen, 
  Award, Activity, ShieldAlert, FileText, Sparkle, Trash2, Plus, 
  MessageSquare, Calendar, Search, Filter, Eye, ChevronRight
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { Student } from '../../types';
import NotenverlaufChart from '../NotenverlaufChart';

interface OverallDossierViewProps {
  student: Student;
  app: any;
  setApp: any;
  gradeSummary: any[];
  studentTotalAvg: number | null;
  classTotalAvg: number | null;
  comparisonResult: () => { text: string; color: string };
  overallText: string;
  criticalCount: number;
  latestAntolin: any;
  strengths: any[];
  challenges: any[];
  comparisonChartData: any[];
  studentNotes: any[];
  setSelectedSubject: (subject: string) => void;
  getSubjectEmoji: (subject: string) => string;
  semester: '1' | '2';
}

export default function OverallDossierView({
  student,
  app,
  setApp,
  gradeSummary,
  studentTotalAvg,
  classTotalAvg,
  comparisonResult,
  overallText,
  criticalCount,
  latestAntolin,
  strengths,
  challenges,
  comparisonChartData,
  studentNotes,
  setSelectedSubject,
  getSubjectEmoji,
  semester
}: OverallDossierViewProps) {
  // Local state for the Overall View's custom note writer
  const [newNoteText, setNewNoteText] = useState('');
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noteCategory, setNoteCategory] = useState<'Notiz' | 'Beobachtung' | 'Erfolg' | 'Fokus'>('Notiz');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('All');
  const [chartType, setChartType] = useState<'bar' | 'radar' | 'area'>('bar');
  const behaviorStageId = app.behavior_status?.[student.id];
  const diagnosticsCount = (app.diagnostikErhebungen || [])
    .filter((entry: any) => entry.schuelerId === student.id).length;

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-dossier-${Date.now()}`,
      datum: noteDate,
      kategorie: noteCategory,
      inhalt: newNoteText.trim(),
      schuelerId: student.id,
      quelle: 'Allgemein'
    };
    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        notes: [newNote, ...(prev.notes || [])]
      }));
    }
    setNewNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        notes: (prev.notes || []).filter((n: any) => n.id !== noteId)
      }));
    }
  };

  // Filter notes by search keyword and category
  const filteredNotes = useMemo(() => {
    return studentNotes.filter((n: any) => {
      const matchSearch = (n.inhalt || '').toLowerCase().includes(noteSearch.toLowerCase()) ||
                          (n.quelle || '').toLowerCase().includes(noteSearch.toLowerCase());
      if (noteCategoryFilter === 'All') return matchSearch;
      return matchSearch && n.kategorie === noteCategoryFilter;
    });
  }, [studentNotes, noteSearch, noteCategoryFilter]);

  // Style helper for note category badges
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'Erfolg': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'Fokus': return 'bg-sky-50 text-sky-700 border-sky-200/60';
      case 'Beobachtung': return 'bg-purple-50 text-purple-700 border-purple-200/60';
      default: return 'bg-slate-50 text-slate-600 border-slate-200/60';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* TOP STATISTICS BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-amber-50/40 border border-amber-100/70 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-amber-800">Gesamtschnitt · Schuljahr</span>
            <Smile size={16} className="text-amber-500" />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none pb-1">
              {studentTotalAvg ? studentTotalAvg.toFixed(2) : '—'}
            </div>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-2 uppercase tracking-wide">Mittelwert über alle Schulfächer</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50/80 border border-slate-200/60 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Klassenmittel · Schuljahr</span>
            <Star size={16} className="text-slate-400" />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none pb-1">
              {classTotalAvg ? classTotalAvg.toFixed(2) : '—'}
            </div>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-2 uppercase tracking-wide">Durchschnitt aller Klassenmitglieder</p>
          </div>
        </div>

        <div className="p-6 bg-indigo-50/40 border border-indigo-100/60 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-transform">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-800">Leistungsrang</span>
            <Sparkles size={16} className="text-indigo-400" />
          </div>
          <div>
            <span className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-black inline-block uppercase tracking-wider ${comparisonResult().color}`}>
              {comparisonResult().text}
            </span>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-3.5 uppercase tracking-wide">Relative Positionierung im Klassenschnitt</p>
          </div>
        </div>
      </div>

      {/* PEDAGOGICAL STATEMENT CARD */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-white shadow-xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h4 className="text-[1.125rem] font-black tracking-tight flex items-center gap-2 text-white">
                Datengestützte Leistungsübersicht
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[0.5625rem] font-black uppercase tracking-widest leading-none">Gespeicherte Daten</span>
              </h4>
              <p className="text-[0.6875rem] font-bold text-white/90 uppercase tracking-widest mt-0.5">Rechnerische Zusammenfassung für das Schuljahr</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[0.5625rem] text-white font-black uppercase tracking-widest">Förderstatus Erhebungen</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              {diagnosticsCount === 0 ? (
                <span className="px-2.5 py-1 bg-slate-500/20 text-slate-300 border border-slate-500/30 rounded-lg text-[0.625rem] font-black uppercase tracking-wider">Nicht erfasst</span>
              ) : criticalCount === 0 ? (
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-[0.625rem] font-black uppercase tracking-wider">Keine Auffälligkeit markiert</span>
              ) : (
                <span className="px-2.5 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                  <ShieldAlert size={12} /> {criticalCount}x Abweichend
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center gap-2 text-indigo-300">
              <FileText size={14} />
              <span className="text-[0.6875rem] font-black uppercase tracking-widest">Sachliche Datenzusammenfassung</span>
            </div>
            <div className="bg-white/5 border border-white/15 p-5.5 rounded-2xl">
              <p className="text-[0.8125rem] font-medium leading-relaxed text-indigo-50/90 italic">
                „{overallText}“
              </p>
            </div>
            <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 px-4 py-3 rounded-xl">
              <Sparkle size={13} className="text-amber-400 shrink-0" />
              <p className="text-[0.625rem] text-indigo-200/80 font-medium leading-snug">
                Die Zusammenfassung nennt nur vorhandene Werte. Die pädagogische Bewertung und Formulierung bleibt bei der Lehrkraft.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-indigo-300">
              <Activity size={14} />
              <span className="text-[0.6875rem] font-black uppercase tracking-widest">Kompetenz-Metriken</span>
            </div>
            <div className="bg-white/5 border border-white/15 p-5.5 rounded-2xl space-y-4">
              <div>
                <div className="flex justify-between text-[0.6875rem] font-black uppercase text-slate-300 mb-1">
                  <span>Fachnoten-Profil</span>
                  <span className="text-white">{studentTotalAvg ? studentTotalAvg.toFixed(2) : '—'}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-400 rounded-full" 
                    style={{ width: studentTotalAvg ? `${Math.max(10, Math.min(100, (6 - studentTotalAvg) * 20))}%` : '0%' }}
                  />
                </div>
              </div>

              {(() => {
                const stageLabel = behaviorStageId
                  ? (app.behavior_stages || []).find((stage: any) => stage.id === behaviorStageId)?.label || 'Erfasst'
                  : 'Nicht erfasst';
                const progressWidth = behaviorStageId
                  ? (behaviorStageId === '1' ? '100%' : behaviorStageId === '2' ? '80%' : '60%')
                  : '0%';
                return (
                  <div>
                    <div className="flex justify-between text-[0.6875rem] font-black uppercase text-slate-300 mb-1">
                      <span>Sozial- & Arbeitsverhalten</span>
                      <span className="text-white">{stageLabel}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 rounded-full" 
                        style={{ width: progressWidth }}
                      />
                    </div>
                  </div>
                );
              })()}

              <div>
                <div className="flex justify-between text-[0.6875rem] font-black uppercase text-slate-300 mb-1">
                  <span>Antolin Sinnerfassung</span>
                  <span className="text-white">{latestAntolin ? `${latestAntolin.punkte} Pkt` : 'Keine Daten'}</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-400 rounded-full" 
                    style={{ width: latestAntolin ? `${Math.min(100, (latestAntolin.punkte / 300) * 100)}%` : '0%' }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[0.6875rem] font-black uppercase text-slate-300 mb-1">
                  <span>Diagnostik-Ergebnisse</span>
                  <span className="text-white">
                    {diagnosticsCount === 0 ? 'Nicht erfasst' : criticalCount === 0 ? 'Keine Auffälligkeit markiert' : `${criticalCount}x auffällig`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${criticalCount === 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}
                    style={{ width: diagnosticsCount === 0 ? '0%' : criticalCount === 0 ? '100%' : `${Math.max(20, 100 - (criticalCount * 25))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STRENGTHS AND CHALLENGES CARD */}
      <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Compass size={20} />
            </div>
            <div>
              <h4 className="text-[1rem] font-black text-slate-900 tracking-tight">Kollaborative Entwicklungsbilanz</h4>
              <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automatischer Datenabgleich mit Schüler-Entwicklungsdiagramm</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[0.625rem] font-black text-slate-500 uppercase tracking-widest">Daten live synchron</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Sparkles size={14} />
              <span className="text-[0.6875rem] font-black uppercase tracking-widest">Schülerspezifische Stärken (TOP 3)</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {strengths.length > 0 ? strengths.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3.5 bg-emerald-50/45 border border-emerald-100 rounded-2xl group hover:bg-emerald-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[1rem] shadow-3xs group-hover:scale-110 transition-transform">🌸</div>
                    <div>
                      <p className="text-[0.75rem] font-black text-emerald-900 leading-tight">{s.label}</p>
                      <p className="text-[0.59375rem] text-emerald-600 font-bold uppercase tracking-tight">{s.kategorie}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.875rem] font-black text-emerald-700">{s.value}</span>
                    <span className="text-[0.5rem] font-black text-emerald-400">/5</span>
                  </div>
                </div>
              )) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center italic text-[0.6875rem] text-slate-400">Keine ausgeprägten Stärken im System hinterlegt.</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Target size={14} />
              <span className="text-[0.6875rem] font-black uppercase tracking-widest">Entwicklungsfelder / Lernfokus</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {challenges.length > 0 ? challenges.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3.5 bg-indigo-50/45 border border-indigo-100 rounded-2xl group hover:bg-indigo-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[1rem] shadow-3xs group-hover:scale-110 transition-transform">🎯</div>
                    <div>
                      <p className="text-[0.75rem] font-black text-indigo-900 leading-tight">{s.label}</p>
                      <p className="text-[0.59375rem] text-indigo-600 font-bold uppercase tracking-tight">{s.kategorie}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.875rem] font-black text-indigo-700">{s.value}</span>
                    <span className="text-[0.5rem] font-black text-indigo-400">/5</span>
                  </div>
                </div>
              )) : (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center italic text-[0.6875rem] text-slate-400">Keine akuten Entwicklungsfelder vermerkt.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TWO COLUMN GRID: INTERACTIVE TABLE & COMPARISON CHART */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* INTERACTIVE TABLE: FÄCHERÜBERGREIFENDER GESAMTNOTENSPIEGEL */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BookOpen size={14} className="text-indigo-500" />
              Fächerübergreifender Gesamtnotenspiegel
            </h4>
            <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 animate-pulse bg-slate-100 px-2 py-0.5 rounded-md">
              Zeile anklicken für Detailseite
            </span>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-5 py-4 text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Unterrichtsfach</th>
                  <th className="px-5 py-4 text-[0.625rem] font-black uppercase tracking-widest text-slate-500 text-center">Schnitt {semester}. Sem.</th>
                  <th className="px-5 py-4 text-[0.625rem] font-black uppercase tracking-widest text-slate-500 text-center">Klassenschnitt</th>
                  <th className="px-5 py-4 text-[0.625rem] font-black uppercase tracking-widest text-slate-500 text-center">Zeugnisnote</th>
                  <th className="px-4 py-4 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {gradeSummary.map((s, idx) => {
                  const hasGrades = s.avg !== null;
                  return (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedSubject(s.subject)}
                      className="hover:bg-indigo-50/40 cursor-pointer border-b border-slate-100 last:border-0 transition-all duration-150 group"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{getSubjectEmoji(s.subject)}</span>
                          <span className="text-[0.875rem] font-black text-slate-800 group-hover:text-indigo-900 transition-colors">{s.subject}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {hasGrades ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[0.75rem] font-black leading-tight ${
                                s.avg! <= 2.2 ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                                s.avg! >= 3.8 ? 'bg-rose-50 text-rose-800 border border-rose-100' : 'bg-amber-50 text-amber-800 border border-amber-100'
                              }`}>
                                {s.avg.toFixed(2)}
                              </span>
                              {s.trend && s.trend.direction !== 'none' && (
                                <span
                                  className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-lg text-[0.5625rem] font-bold ${s.trend.colorClass}`}
                                  title={s.trend.label}
                                >
                                  {s.trend.icon}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[0.75rem]">—</span>
                          )}
                          {semester === '2' && s.previousAvg != null && (
                            <span className="text-[0.5625rem] font-bold text-slate-400">
                              1. Sem.: {s.previousAvg.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {s.classAvg ? (
                          <span className="text-slate-500 font-bold text-[0.75rem]">{s.classAvg.toFixed(2)}</span>
                        ) : (
                          <span className="text-slate-400 text-[0.75rem]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[0.875rem] font-black text-slate-900 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg">
                          {s.endnote}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECHARTS CHART: SCHNITT-GEGENÜBERSTELLUNG */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <BarChart3 size={14} className="text-indigo-500" />
              Schnitt-Gegenüberstellung
            </h4>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 shadow-2xs flex flex-col justify-between h-[360px]">
            {/* Interactive Toggle Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100/80 mb-2 shrink-0">
              <span className="text-[0.625rem] font-extrabold uppercase tracking-widest text-slate-400">Diagramm-Typ</span>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40">
                <button 
                  type="button" 
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 text-[0.625rem] font-black uppercase rounded-lg transition-all cursor-pointer ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-3xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Säule
                </button>
                <button 
                  type="button" 
                  onClick={() => setChartType('radar')}
                  className={`px-3 py-1 text-[0.625rem] font-black uppercase rounded-lg transition-all cursor-pointer ${chartType === 'radar' ? 'bg-white text-indigo-600 shadow-3xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Netz
                </button>
                <button 
                  type="button" 
                  onClick={() => setChartType('area')}
                  className={`px-3 py-1 text-[0.625rem] font-black uppercase rounded-lg transition-all cursor-pointer ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-3xs border border-slate-200/40' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Fläche
                </button>
              </div>
            </div>

            <div className="h-48 w-full">
              {comparisonChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-[0.75rem]">Keine Leistungsdaten erfasst.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart 
                      data={comparisonChartData} 
                      margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                      style={{ cursor: 'pointer' }}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          setSelectedSubject(String(state.activeLabel));
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} />
                      <YAxis domain={[1, 5]} reversed axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-2xl text-[0.6875rem] font-semibold space-y-1">
                                <p className="font-extrabold text-slate-300 text-[0.75rem] border-b border-white/10 pb-1 mb-1">{data.name}</p>
                                <p className="text-amber-400 font-extrabold">Schüler: {data['Schüler-Schnitt'] ? Number(data['Schüler-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-blue-400 font-extrabold">Klasse: {data['Klassen-Schnitt'] ? Number(data['Klassen-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-[0.5625rem] text-slate-400 font-bold border-t border-white/5 pt-1 mt-1">💡 Klicken für Details</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                      <Bar name="Schüler-Schnitt" dataKey="Schüler-Schnitt" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={14} />
                      <Bar name="Klassen-Schnitt" dataKey="Klassen-Schnitt" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={14} />
                    </BarChart>
                  ) : chartType === 'radar' ? (
                    <RadarChart 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="75%" 
                      data={comparisonChartData}
                      style={{ cursor: 'pointer' }}
                      onClick={(state) => {
                        // In RadarChart, we can find the active label or clicked index
                        if (state && state.activeLabel) {
                          setSelectedSubject(String(state.activeLabel));
                        }
                      }}
                    >
                      <PolarGrid stroke="#f1f5f9" />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 900, fill: '#475569' }} />
                      <PolarRadiusAxis domain={[1, 5]} reversed tick={{ fontSize: 7, fill: '#94a3b8' }} axisLine={false} />
                      <Radar name="Schüler-Schnitt" dataKey="Schüler-Schnitt" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                      <Radar name="Klassen-Schnitt" dataKey="Klassen-Schnitt" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={1.5} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-2xl text-[0.6875rem] font-semibold space-y-1">
                                <p className="font-extrabold text-slate-300 text-[0.75rem] border-b border-white/10 pb-1 mb-1">{data.name}</p>
                                <p className="text-amber-400 font-extrabold">Schüler: {data['Schüler-Schnitt'] ? Number(data['Schüler-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-blue-400 font-extrabold">Klasse: {data['Klassen-Schnitt'] ? Number(data['Klassen-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-[0.5625rem] text-slate-400 font-bold border-t border-white/5 pt-1 mt-1">💡 Klicken für Details</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                    </RadarChart>
                  ) : (
                    <AreaChart 
                      data={comparisonChartData} 
                      margin={{ top: 10, right: 5, left: -25, bottom: 0 }}
                      style={{ cursor: 'pointer' }}
                      onClick={(state) => {
                        if (state && state.activeLabel) {
                          setSelectedSubject(String(state.activeLabel));
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="colorSchueler" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorKlasse" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} />
                      <YAxis domain={[1, 5]} reversed axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 border border-slate-800 text-white p-3 rounded-xl shadow-2xl text-[0.6875rem] font-semibold space-y-1">
                                <p className="font-extrabold text-slate-300 text-[0.75rem] border-b border-white/10 pb-1 mb-1">{data.name}</p>
                                <p className="text-amber-400 font-extrabold">Schüler: {data['Schüler-Schnitt'] ? Number(data['Schüler-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-blue-400 font-extrabold">Klasse: {data['Klassen-Schnitt'] ? Number(data['Klassen-Schnitt']).toFixed(2) : '—'}</p>
                                <p className="text-[0.5625rem] text-slate-400 font-bold border-t border-white/5 pt-1 mt-1">💡 Klicken für Details</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                      <Area name="Schüler-Schnitt" type="monotone" dataKey="Schüler-Schnitt" stroke="#f59e0b" fillOpacity={1} fill="url(#colorSchueler)" strokeWidth={2} connectNulls />
                      <Area name="Klassen-Schnitt" type="monotone" dataKey="Klassen-Schnitt" stroke="#3b82f6" fillOpacity={1} fill="url(#colorKlasse)" strokeWidth={1.5} connectNulls />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl shrink-0 mt-2">
              <p className="text-[0.625rem] text-slate-500 font-medium leading-relaxed">
                Hinweis: Die österreichische Notenskala verläuft von 1 (Sehr gut) bis 5 (Nicht genügend). Ein niedrigerer Wert entspricht somit einer besseren Durchschnittsleistung.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CHRONOLOGICAL GRAPH PROGRESSION */}
      <div className="pt-6 border-t border-slate-100">
        <NotenverlaufChart schuelerId={student.id} compact={true} />
      </div>

      {/* GENERAL OBSERVATION JOURNAL & NOTE WRITER */}
      <div className="pt-8 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <MessageSquare size={14} className="text-indigo-500" />
            Allgemeines Beobachtungsjournal & Pädagogische Akte
          </h4>
          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
            {filteredNotes.length} Notizen gefiltert
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Notes Writer Form */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-2xs h-fit space-y-4.5">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                <Plus size={16} className="text-indigo-600" />
                Neuen Eintrag verfassen
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Form Row: Date and Category Selector */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Datum</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-[0.75rem] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Kategorie</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-250 rounded-xl text-[0.75rem] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Notiz">Notiz</option>
                    <option value="Beobachtung">Beobachtung</option>
                    <option value="Erfolg">Erfolg ⭐</option>
                    <option value="Fokus">Fokus 🎯</option>
                  </select>
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Inhalt</label>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Verfasse eine qualitative Beobachtung oder halte Meilensteine und Unterstützungen fest..."
                  className="w-full mt-1 min-h-[110px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[0.8125rem] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={handleAddNote}
                disabled={!newNoteText.trim()}
                className="w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                <span>Eintrag sichern</span>
              </button>
            </div>
          </div>

          {/* Notes Filter and List */}
          <div className="lg:col-span-7 bg-slate-50/50 border border-slate-200/70 rounded-[2rem] p-6 shadow-3xs space-y-4">
            
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Notizen durchsuchen..."
                  value={noteSearch}
                  onChange={(e) => setNoteSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[0.78125rem] font-medium text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shrink-0">
                <Filter size={12} className="text-slate-400" />
                <select
                  value={noteCategoryFilter}
                  onChange={(e) => setNoteCategoryFilter(e.target.value)}
                  className="bg-transparent border-0 text-[0.75rem] font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="All">Alle Typen</option>
                  <option value="Notiz">Notizen</option>
                  <option value="Beobachtung">Beobachtungen</option>
                  <option value="Erfolg">Erfolge</option>
                  <option value="Fokus">Lernfokus</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1.5 scrollbar-thin">
              {filteredNotes.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center mx-auto mb-3 text-lg">📝</div>
                  <p className="text-[0.75rem] text-slate-400 font-semibold italic">Keine passenden Notizen oder Beobachtungen vorhanden.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-white border border-slate-100/90 rounded-2xl flex items-start justify-between gap-4 shadow-3xs group hover:border-slate-200 transition-all duration-150">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.625rem] text-slate-400 font-black tracking-wide flex items-center gap-1">
                            <Calendar size={11} />
                            {note.datum ? new Date(note.datum).toLocaleDateString('de-DE') : 'Vor Kurzem'}
                          </span>
                          <span className={`text-[0.5625rem] px-2 py-0.5 border rounded-full font-black uppercase tracking-widest ${getCategoryStyles(note.kategorie)}`}>
                            {note.kategorie || 'Notiz'}
                          </span>
                          <span className="text-[0.5625rem] px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-black uppercase tracking-widest">
                            {note.quelle || 'Allgemein'}
                          </span>
                        </div>
                        <p className="text-[0.78125rem] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{note.inhalt}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-slate-300 hover:text-rose-500 p-1 rounded-lg hover:bg-slate-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Eintrag entfernen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
