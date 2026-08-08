import React, { useMemo, useState } from 'react';
import { 
  BarChart3, Star, Smile, Sparkles, Compass, Target, BookOpen, 
  Award, Activity, ShieldAlert, FileText, Sparkle, Trash2, Plus, 
  MessageSquare, Calendar, Search, Filter, Brain, BookOpenCheck, TrendingUp,
  X, Check
} from 'lucide-react';
import { 
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line, ReferenceLine,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { Student } from '../../types';
import { isDiagnosticAlert } from '../../lib/diagnosticData';

interface SubjectDossierViewProps {
  student: Student;
  app: any;
  setApp: any;
  selectedSubject: string;
  currentSubjectData: any;
  subjectEvaluationText: string;
  gradeDistribution: Record<number, number>;
  subjectChronologicalGrades: any[];
  filteredDiagnosticsForSubject: any[];
  latestAntolin: any;
  classLevel: number;
  subjectGoals: any[];
  lernzieleState: Record<string, number>;
  handleToggleGoal: (goalId: string) => void;
  goalCompletionStats: any;
  studentNotes: any[];
  semester: '1' | '2';
}

export default function SubjectDossierView({
  student,
  app,
  setApp,
  selectedSubject,
  currentSubjectData,
  subjectEvaluationText,
  gradeDistribution,
  subjectChronologicalGrades,
  filteredDiagnosticsForSubject,
  latestAntolin,
  classLevel,
  subjectGoals,
  lernzieleState,
  handleToggleGoal,
  goalCompletionStats,
  studentNotes,
  semester
}: SubjectDossierViewProps) {
  // New local state variables for advanced micro-interactions
  const [newNoteText, setNewNoteText] = useState('');
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [noteCategory, setNoteCategory] = useState<'Notiz' | 'Beobachtung' | 'Erfolg' | 'Fokus'>('Notiz');
  const [noteSearch, setNoteSearch] = useState('');
  const [noteCategoryFilter, setNoteCategoryFilter] = useState<string>('All');

  // Interactive filters for grades
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<number | null>(null);
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeTypeFilter, setGradeTypeFilter] = useState<string>('all');

  // Interactive filters for diagnostics & goals
  const [diagSearch, setDiagSearch] = useState('');
  const [diagSupportOnly, setDiagSupportOnly] = useState(false);
  const [goalSearch, setGoalSearch] = useState('');
  const [goalStatusFilter, setGoalStatusFilter] = useState<string>('all');

  // Interactive Chart/Dashboard state
  const [activeChartTab, setActiveChartTab] = useState<'trend' | 'themen' | 'screenings'>('trend');
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);
  const [selectedDiagId, setSelectedDiagId] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Group learning goals by thematic area to create a beautiful live category completion score
  const themedGoalsData = useMemo(() => {
    if (!subjectGoals || subjectGoals.length === 0) return [];
    
    const categories: Record<string, { total: number; achievedWeight: number; goals: any[] }> = {};
    
    subjectGoals.forEach(ziel => {
      let category = 'Allgemein';
      const parts = ziel.text.split(':');
      if (parts.length > 1) {
        category = parts[0].trim();
      }
      
      if (!categories[category]) {
        categories[category] = { total: 0, achievedWeight: 0, goals: [] };
      }
      
      categories[category].total += 1;
      categories[category].goals.push(ziel);
      
      const r = lernzieleState[ziel.id] || 0;
      if (r === 1) categories[category].achievedWeight += 1.0;       // Erreicht (100%)
      else if (r === 2) categories[category].achievedWeight += 0.75;      // Im Wesentlichen (75%)
      else if (r === 3) categories[category].achievedWeight += 0.35;      // Minimal (35%)
    });
    
    return Object.entries(categories).map(([name, data]) => {
      const percentage = Math.round((data.achievedWeight / data.total) * 100);
      return {
        category: name,
        percentage,
        total: data.total,
        achievedCount: data.goals.filter(z => lernzieleState[z.id] === 1).length,
        goals: data.goals
      };
    });
  }, [subjectGoals, lernzieleState]);

  // Subject-specific note adder
  const handleAddSubjectNote = () => {
    if (!newNoteText.trim()) return;
    const newNote = {
      id: `note-dossier-${Date.now()}`,
      datum: noteDate,
      kategorie: noteCategory,
      inhalt: newNoteText.trim(),
      schuelerId: student.id,
      quelle: selectedSubject
    };
    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        notes: [newNote, ...(prev.notes || [])]
      }));
    }
    setNewNoteText('');
  };

  const handleDeleteSubjectNote = (noteId: string) => {
    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        notes: (prev.notes || []).filter((n: any) => n.id !== noteId)
      }));
    }
  };

  // Filter grade records based on search keywords, type filter, and interactive grade-distribution selection
  const displayedGrades = useMemo(() => {
    return subjectChronologicalGrades.filter(g => {
      const matchSearch = g.label.toLowerCase().includes(gradeSearch.toLowerCase());
      const matchType = gradeTypeFilter === 'all' || g.type === gradeTypeFilter;
      const matchSelectedGrade = selectedGradeFilter === null || Math.round(g.numericGrade) === selectedGradeFilter;
      const matchSelectedChartGrade = selectedGradeId === null || g.id === selectedGradeId;
      return matchSearch && matchType && matchSelectedGrade && matchSelectedChartGrade;
    });
  }, [subjectChronologicalGrades, gradeSearch, gradeTypeFilter, selectedGradeFilter, selectedGradeId]);

  // Filter diagnostics list based on test name/description and the support flag
  const displayedDiagnostics = useMemo(() => {
    return filteredDiagnosticsForSubject.filter(e => {
      const testName = (e.test?.name || '').toLowerCase();
      const testDesc = (e.test?.kurzbeschreibung || '').toLowerCase();
      const matchSearch = testName.includes(diagSearch.toLowerCase()) || testDesc.includes(diagSearch.toLowerCase());
      const matchSelectedDiagId = selectedDiagId === null || e.id === selectedDiagId;
      if (diagSupportOnly) {
        return matchSearch && isDiagnosticAlert(e) && matchSelectedDiagId;
      }
      return matchSearch && matchSelectedDiagId;
    });
  }, [filteredDiagnosticsForSubject, diagSearch, diagSupportOnly, selectedDiagId]);

  // Filter learning objectives/goals list
  const displayedGoals = useMemo(() => {
    return subjectGoals.filter(ziel => {
      if (selectedCategoryFilter) {
        const parts = ziel.text.split(':');
        const cat = parts.length > 1 ? parts[0].trim() : 'Allgemein';
        if (cat !== selectedCategoryFilter) return false;
      }
      
      const matchSearch = ziel.text.toLowerCase().includes(goalSearch.toLowerCase());
      const r = lernzieleState[ziel.id] || 0;
      
      if (goalStatusFilter === 'all') return matchSearch;
      if (goalStatusFilter === 'achieved') return matchSearch && r === 1;
      if (goalStatusFilter === 'partial') return matchSearch && r === 2;
      if (goalStatusFilter === 'minimal') return matchSearch && r === 3;
      if (goalStatusFilter === 'pending') return matchSearch && r === 0;
      return matchSearch;
    });
  }, [subjectGoals, goalSearch, goalStatusFilter, lernzieleState, selectedCategoryFilter]);

  // Filter subject-specific notes
  const displayedNotes = useMemo(() => {
    return studentNotes.filter((n: any) => {
      const isCorrectSubject = n.quelle === selectedSubject;
      const matchSearch = (n.inhalt || '').toLowerCase().includes(noteSearch.toLowerCase());
      const matchCategory = noteCategoryFilter === 'All' || n.kategorie === noteCategoryFilter;
      return isCorrectSubject && matchSearch && matchCategory;
    });
  }, [studentNotes, selectedSubject, noteSearch, noteCategoryFilter]);

  // Note type style helper
  const getNoteCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'Erfolg': return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
      case 'Fokus': return 'bg-sky-50 text-sky-700 border-sky-200/60';
      case 'Beobachtung': return 'bg-purple-50 text-purple-700 border-purple-200/60';
      default: return 'bg-slate-50 text-slate-600 border-slate-200/60';
    }
  };

  // Chart Data preparation for Notenentwicklung (Grade progression)
  const gradeChartData = useMemo(() => {
    return subjectChronologicalGrades.map((g, index) => {
      const formattedDate = g.date 
        ? new Date(g.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) 
        : `Sem ${g.semester}`;
      return {
        id: g.id || `grade-${g.semester}-${g.label}-${index}`,
        index: index + 1,
        date: formattedDate,
        fullDate: g.date ? new Date(g.date).toLocaleDateString('de-DE') : `Semester ${g.semester}`,
        grade: g.numericGrade,
        displayGrade: g.originalGrade,
        type: g.typeLabel,
        name: g.label,
      };
    });
  }, [subjectChronologicalGrades]);

  // Chart Data preparation for Diagnostic Screening Test results
  const diagnosticsChartData = useMemo(() => {
    return [...filteredDiagnosticsForSubject]
      .sort((a, b) => {
        if (a.datum && b.datum) return new Date(a.datum).getTime() - new Date(b.datum).getTime();
        return 0;
      })
      .map((e, index) => {
        const val = parseFloat(e.ergebniswert) || 0;
        const formattedDate = e.datum 
          ? new Date(e.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) 
          : 'Vor Kurzem';
        return {
          id: e.id || `diag-${index}`,
          index: index + 1,
          name: e.test?.name || 'Screening',
          date: formattedDate,
          fullDate: e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : 'Unbekanntes Datum',
          score: val,
          einheit: e.test?.einheit || 'PR',
          foerderbedarf: isDiagnosticAlert(e),
          description: e.test?.kurzbeschreibung || ''
        };
      });
  }, [filteredDiagnosticsForSubject]);

  const hasPRUnits = useMemo(() => {
    return diagnosticsChartData.some(d => d.einheit === 'PR');
  }, [diagnosticsChartData]);

  // Custom Grade Tooltip for polished visual display
  const CustomGradeTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-lg space-y-1.5 text-left text-xs max-w-xs">
          <div className="flex items-center gap-1.5 justify-between">
            <span className="px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase bg-indigo-50 text-indigo-700 border border-indigo-100">
              {data.type}
            </span>
            <span className="text-slate-400 font-bold font-mono text-[0.5625rem]">{data.fullDate}</span>
          </div>
          <p className="font-extrabold text-slate-800 line-clamp-2">{data.name}</p>
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[0.5625rem]">Erreichte Note:</span>
            <span className="font-black text-indigo-600 font-mono text-sm ml-auto">{data.displayGrade}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Diagnostics Tooltip
  const CustomDiagnosticsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-lg space-y-1.5 text-left text-xs max-w-xs">
          <div className="flex items-center gap-1.5 justify-between">
            <span className={`px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase ${
              data.foerderbedarf 
                ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {data.foerderbedarf ? 'Förderbedarf 🚨' : 'Normbereich ✅'}
            </span>
            <span className="text-slate-400 font-bold font-mono text-[0.5625rem]">{data.fullDate}</span>
          </div>
          <p className="font-extrabold text-slate-800">{data.name}</p>
          {data.description && (
            <p className="text-slate-400 text-[10px] font-medium leading-normal italic line-clamp-2">{data.description}</p>
          )}
          <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[0.5625rem]">Ergebnis:</span>
            <span className="font-black text-emerald-600 font-mono text-sm ml-auto">{data.score} {data.einheit}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Themed Goals Tooltip
  const CustomThemedGoalsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-lg space-y-1 text-left text-xs max-w-xs animate-fade-in">
          <p className="font-extrabold text-slate-800">{data.category}</p>
          <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[0.5625rem]">Fortschritt:</span>
            <span className="font-black text-indigo-600 font-mono text-sm ml-auto">{data.percentage}%</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {data.achievedCount} von {data.total} Zielen vollständig erreicht.
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* SUBJECT METRICS BENTO GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CARD 1: STUDENT AVERAGE */}
        <div className="p-6 bg-indigo-50/40 border border-indigo-100/50 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-800">Schnitt {selectedSubject} · {semester}. Sem.</span>
            <Smile size={16} className="text-indigo-500" />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none pb-1">
              {currentSubjectData?.avg ? currentSubjectData.avg.toFixed(2) : '—'}
            </div>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-2 uppercase tracking-wide">
              Rechnerischer Schnitt
              {semester === '2' && currentSubjectData?.previousAvg != null && (
                <span className="block normal-case tracking-normal text-indigo-400">
                  1. Semester: {currentSubjectData.previousAvg.toFixed(2)}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* CARD 2: CLASS AVERAGE */}
        <div className="p-6 bg-slate-50/70 border border-slate-200/50 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Mittelwert Klasse</span>
            <Star size={16} className="text-slate-400" />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none pb-1">
              {currentSubjectData?.classAvg ? currentSubjectData.classAvg.toFixed(2) : '—'}
            </div>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-2 uppercase tracking-wide">Durchschnittliche Klassenleistung</p>
          </div>
        </div>

        {/* CARD 3: CERTIFICATE GRADE */}
        <div className="p-6 bg-pink-50/40 border border-pink-100/50 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-pink-800">Zeugnisnote · {semester}. Sem.</span>
            <Award size={16} className="text-pink-500" />
          </div>
          <div>
            <div className="text-4xl font-black text-slate-900 leading-none pb-1">
              {currentSubjectData?.endnote || '—'}
            </div>
            <p className="text-[0.6875rem] text-slate-400 font-bold mt-2 uppercase tracking-wide">Eingetragene Semesternote</p>
          </div>
        </div>

        {/* CARD 4: SUBJECT TREND */}
        <div className="p-6 bg-white border border-slate-200 rounded-[1.5rem] shadow-3xs flex flex-col justify-between hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Leistungs-Trend</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div>
            {currentSubjectData?.trend && currentSubjectData.trend.direction !== 'none' ? (
              <div className="space-y-1">
                <span className={`px-2.5 py-1 rounded-lg text-[0.6875rem] leading-none font-black inline-block uppercase tracking-wider ${currentSubjectData.trend.colorClass}`}>
                  {currentSubjectData.trend.icon} {currentSubjectData.trend.text}
                </span>
                <p className="text-[0.5625rem] font-semibold text-slate-400 uppercase tracking-widest mt-1 truncate" title={currentSubjectData.trend.label}>
                  {currentSubjectData.trend.label}
                </p>
              </div>
            ) : (
              <div>
                <div className="text-xl font-extrabold text-slate-400">Konstant / Keine Daten</div>
                <p className="text-[0.59375rem] text-slate-400 font-bold uppercase tracking-wider mt-1">Keine verlässliche Aussage möglich</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DEVELOPMENT & DIAGNOSTIC COCKPIT */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h4 className="text-[1.125rem] font-black text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-indigo-600 animate-pulse" />
              <span>Entwicklungsverlauf & Fach-Dashboard</span>
            </h4>
            <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-widest">
              Interaktive Visualisierungen für {selectedSubject} — Analysiere Fortschritte und Detailergebnisse
            </p>
          </div>

          {/* Interactive tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 border border-slate-200/50 p-1 rounded-2xl select-none">
            <button
              onClick={() => {
                setActiveChartTab('trend');
                setSelectedCategoryFilter(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-[0.6875rem] leading-tight font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeChartTab === 'trend'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <TrendingUp size={14} />
              Leistungstrend
            </button>
            <button
              onClick={() => {
                setActiveChartTab('themen');
              }}
              className={`px-3.5 py-2 rounded-xl text-[0.6875rem] leading-tight font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeChartTab === 'themen'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Target size={14} />
              Themen-Fortschritt
            </button>
            <button
              onClick={() => {
                setActiveChartTab('screenings');
                setSelectedCategoryFilter(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-[0.6875rem] leading-tight font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                activeChartTab === 'screenings'
                  ? 'bg-white text-indigo-700 shadow-sm border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Brain size={14} />
              Diagnostik-Screenings
            </button>
          </div>
        </div>

        {/* Tab content */}
        {activeChartTab === 'trend' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Chart Area */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[0.6875rem] font-bold text-slate-500 flex items-center gap-1">
                  <TrendingUp size={12} className="text-indigo-500" />
                  Klicke auf einen Punkt im Verlauf für Details
                </span>
                <span className="text-[0.625rem] text-slate-400 font-bold font-mono">
                  {gradeChartData.length} Leistungsnachweise gesamt
                </span>
              </div>

              {gradeChartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <TrendingUp size={28} className="text-slate-300 mb-2" />
                  <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">Keine Noteneinträge vorhanden</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] text-center">
                    Sobald Leistungsüberprüfungen für dieses Fach eingetragen werden, erscheint hier der Notenverlauf.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50/30 rounded-2xl border border-slate-100 p-4 pt-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart 
                      data={gradeChartData} 
                      margin={{ top: 10, right: 15, left: -25, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          setSelectedGradeId(state.activePayload[0].payload.id);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        className="font-mono text-[10px] text-slate-400 font-bold"
                      />
                      <YAxis 
                        domain={[1, 5]} 
                        reversed 
                        ticks={[1, 2, 3, 4, 5]} 
                        tickLine={false}
                        axisLine={false}
                        dx={-4}
                        className="font-mono text-[10px] text-slate-400 font-bold"
                      />
                      <Tooltip content={<CustomGradeTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
                      <Line 
                        type="monotone" 
                        dataKey="grade" 
                        stroke="#6366f1" 
                        strokeWidth={3.5} 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5', cursor: 'pointer' }}
                        dot={{ r: 4.5, strokeWidth: 2, fill: '#ffffff', stroke: '#6366f1' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Analysis card on the right */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl h-full flex flex-col justify-between">
                <div>
                  <h5 className="text-[0.6875rem] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <Sparkles size={12} className="text-indigo-500" />
                    Trend-Detailanalyse
                  </h5>
                  
                  {selectedGradeId ? (() => {
                    const selectedGrade = gradeChartData.find(g => g.id === selectedGradeId);
                    if (!selectedGrade) return null;
                    const isGood = selectedGrade.grade <= 2;
                    const isCritical = selectedGrade.grade >= 4;

                    return (
                      <div className="mt-4 space-y-4 animate-fade-in">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-200/60 pb-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase bg-indigo-100 text-indigo-700 border border-indigo-200/50">
                              {selectedGrade.type}
                            </span>
                            <h6 className="font-extrabold text-slate-800 text-[0.9375rem] leading-tight">{selectedGrade.name}</h6>
                            <p className="text-[0.625rem] text-slate-400 font-bold font-mono">{selectedGrade.fullDate}</p>
                          </div>
                          <span className={`text-[1.5rem] font-black w-12 h-12 flex items-center justify-center rounded-xl border-2 ${
                            isGood ? 'bg-emerald-50 text-emerald-600 border-emerald-300 shadow-sm' :
                            isCritical ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-sm' :
                            'bg-amber-50 text-amber-600 border-amber-300 shadow-sm'
                          }`}>
                            {selectedGrade.displayGrade}
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[0.75rem] text-slate-500 leading-relaxed font-medium">
                            {isGood 
                              ? `Hervorragende Leistung im Leistungsnachweis „${selectedGrade.name}“. Das verweist auf eine gefestigte Kompetenzentwicklung.` 
                              : isCritical 
                              ? `In dieser Arbeit zeigen sich Lernlücken. Eine zusätzliche, gezielte Vertiefung oder Nachbesprechung wird angeraten.` 
                              : `Ein solides Ergebnis mit Entwicklungspotenzial. Die Kernziele wurden in wesentlichen Teilen verstanden.`}
                          </p>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="mt-8 text-center py-6 flex flex-col items-center justify-center text-slate-400">
                      <TrendingUp size={36} className="text-slate-350 stroke-1 mb-2 animate-bounce" />
                      <p className="text-[0.75rem] font-extrabold uppercase tracking-wide">Punkt auswählen</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-normal font-medium">
                        Klicke auf eine Note im Linien-Diagramm, um die detaillierte pädagogische Bewertung einzusehen.
                      </p>
                    </div>
                  )}
                </div>

                {selectedGradeId && (
                  <button
                    onClick={() => setSelectedGradeId(null)}
                    className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[0.6875rem] uppercase tracking-wider rounded-xl transition-all"
                  >
                    Leistungsfilter aufheben
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeChartTab === 'themen' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Chart Area */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[0.6875rem] font-bold text-slate-500 flex items-center gap-1">
                  <Target size={12} className="text-indigo-500" />
                  Klicke auf ein Themenfeld, um die Liste unten zu filtern
                </span>
                <span className="text-[0.625rem] text-slate-400 font-bold font-mono">
                  {themedGoalsData.length} Themenbereiche erfasst
                </span>
              </div>

              {themedGoalsData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <Target size={28} className="text-slate-300 mb-2" />
                  <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">Keine Ziele verzeichnet</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] text-center">
                    Für dieses Fach und diese Schulstufe sind keine Lernziele im Lehrplan hinterlegt.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50/30 rounded-2xl border border-slate-100 p-2 flex items-center justify-center h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="75%" 
                      data={themedGoalsData}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const clickedCategory = state.activePayload[0].payload.category;
                          setSelectedCategoryFilter(clickedCategory === selectedCategoryFilter ? null : clickedCategory);
                        }
                      }}
                    >
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis 
                        dataKey="category" 
                        tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }}
                      />
                      <PolarRadiusAxis 
                        angle={90} 
                        domain={[0, 100]} 
                        tickCount={5}
                        tick={{ fill: '#94a3b8', fontSize: 8 }}
                      />
                      <Radar 
                        name="Erreichung" 
                        dataKey="percentage" 
                        stroke="#6366f1" 
                        strokeWidth={2.5}
                        fill="#6366f1" 
                        fillOpacity={0.15} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5', cursor: 'pointer' }}
                      />
                      <Tooltip content={<CustomThemedGoalsTooltip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Side Progress Breakdown */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl h-full flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h5 className="text-[0.6875rem] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 border-b border-slate-200/60 pb-2">
                    <Award size={12} className="text-violet-500" />
                    Lehrplanbereiche Detailgrad
                  </h5>
                  
                  {themedGoalsData.length === 0 ? (
                    <p className="text-[0.6875rem] text-slate-400 italic">Keine detailiierten Themendaten vorhanden.</p>
                  ) : (
                    <div className="space-y-3 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin">
                      {themedGoalsData.map((data, idx) => {
                        const isFiltered = selectedCategoryFilter === data.category;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setSelectedCategoryFilter(isFiltered ? null : data.category)}
                            className={`p-2 rounded-xl transition-all border cursor-pointer ${
                              isFiltered 
                                ? 'bg-indigo-50/60 border-indigo-200/80 shadow-3xs' 
                                : 'bg-white border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[0.6875rem] font-bold text-slate-700 mb-1.5">
                              <span className="flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${isFiltered ? 'bg-indigo-600 animate-pulse' : 'bg-slate-350'}`} />
                                {data.category}
                              </span>
                              <span className="font-mono text-indigo-600">{data.percentage}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  data.percentage >= 80 ? 'bg-emerald-500' :
                                  data.percentage >= 50 ? 'bg-indigo-500' :
                                  data.percentage >= 25 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${data.percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedCategoryFilter && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-center justify-between text-[0.6875rem] text-indigo-900 font-bold animate-fade-in">
                    <span>Gefiltert nach: {selectedCategoryFilter}</span>
                    <button 
                      onClick={() => setSelectedCategoryFilter(null)}
                      className="text-indigo-600 hover:text-indigo-800 text-[10px] font-black uppercase tracking-wider"
                    >
                      Filter löschen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeChartTab === 'screenings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
            {/* Chart Area */}
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[0.6875rem] font-bold text-slate-500 flex items-center gap-1">
                  <Brain size={12} className="text-emerald-500" />
                  Klicke auf einen Balken, um Testergebnisse zu isolieren
                </span>
                <span className="text-[0.625rem] text-slate-400 font-bold font-mono">
                  {diagnosticsChartData.length} Diagnostik-Screenings durchgeführt
                </span>
              </div>

              {diagnosticsChartData.length === 0 ? (
                <div className="h-[280px] flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
                  <Brain size={28} className="text-slate-300 mb-2" />
                  <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider">Keine Screenings verzeichnet</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] text-center">
                    In diesem Fach wurden für {student.vorname} noch keine standardisierten Screening-Tests durchgeführt.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50/30 rounded-2xl border border-slate-100 p-4 pt-6">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart 
                      data={diagnosticsChartData} 
                      margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          setSelectedDiagId(state.activePayload[0].payload.id);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis 
                        dataKey="date" 
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                        className="font-mono text-[10px] text-slate-400 font-bold"
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tickLine={false}
                        axisLine={false}
                        dx={-4}
                        className="font-mono text-[10px] text-slate-400 font-bold"
                      />
                      <Tooltip content={<CustomDiagnosticsTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} />
                      {hasPRUnits && (
                        <ReferenceLine 
                          y={16} 
                          stroke="#ef4444" 
                          strokeDasharray="4 4" 
                          strokeWidth={1.5}
                          label={{ 
                            value: 'PR 16 Grenze', 
                            position: 'insideBottomRight', 
                            fill: '#f43f5e', 
                            fontSize: 9, 
                            fontWeight: 'bold',
                            offset: 5
                          }} 
                        />
                      )}
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={32} style={{ cursor: 'pointer' }}>
                        {diagnosticsChartData.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={entry.foerderbedarf ? '#f43f5e' : '#10b981'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Detailed analysis card on the right */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div className="bg-slate-50/50 border border-slate-200/60 p-5 rounded-2xl h-full flex flex-col justify-between">
                <div>
                  <h5 className="text-[0.6875rem] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1 border-b border-slate-200/60 pb-2 mb-3">
                    <ShieldAlert size={12} className="text-emerald-500" />
                    Screening-Ergebnis
                  </h5>
                  
                  {selectedDiagId ? (() => {
                    const selectedDiag = diagnosticsChartData.find(e => e.id === selectedDiagId);
                    if (!selectedDiag) return null;

                    return (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[0.5625rem] font-black uppercase ${
                              selectedDiag.foerderbedarf 
                                ? 'bg-rose-100 text-rose-700 border border-rose-200/60' 
                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                            }`}>
                              {selectedDiag.foerderbedarf ? 'Förderbedarf' : 'Normalbereich'}
                            </span>
                            <h6 className="font-extrabold text-slate-800 text-[0.875rem] leading-tight mt-1">{selectedDiag.name}</h6>
                            <p className="text-[0.625rem] text-slate-400 font-bold font-mono">{selectedDiag.fullDate}</p>
                          </div>
                          <span className={`text-[1.125rem] font-mono font-black w-12 h-12 flex flex-col items-center justify-center rounded-xl border ${
                            selectedDiag.foerderbedarf ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <span className="text-[0.8125rem] font-black">{selectedDiag.score}</span>
                            <span className="text-[0.5rem] font-bold -mt-1">{selectedDiag.einheit}</span>
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-[0.75rem] text-slate-500 leading-relaxed font-medium italic">
                            „{selectedDiag.description || 'Keine Kurzbeschreibung für diesen Screening-Test vorhanden.'}“
                          </p>
                          <p className="text-[0.7rem] text-slate-600 font-semibold leading-normal">
                            {selectedDiag.foerderbedarf 
                              ? `🚨 Wert unter PR 16 (Prozentrang). Ein erhöhter Förderbedarf liegt nahe. Pädagogische Unterstützung intensivieren.` 
                              : `✅ Wert liegt im unauffälligen Regelbereich der Normgruppe. Keine akuten Defizite verzeichnet.`}
                          </p>
                        </div>
                      </div>
                    );
                  })() : (
                    <div className="mt-8 text-center py-6 flex flex-col items-center justify-center text-slate-400">
                      <Brain size={36} className="text-slate-350 stroke-1 mb-2 animate-bounce" />
                      <p className="text-[0.75rem] font-extrabold uppercase tracking-wide">Test auswählen</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] leading-normal font-medium">
                        Klicke auf einen der Balken im Screenings-Graphen, um das genaue Testergebnis und Empfehlungen anzuzeigen.
                      </p>
                    </div>
                  )}
                </div>

                {selectedDiagId && (
                  <button
                    onClick={() => setSelectedDiagId(null)}
                    className="mt-4 w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-[0.6875rem] uppercase tracking-wider rounded-xl transition-all"
                  >
                    Diagnostikfilter aufheben
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TWO COLUMN DETAIL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* COLUMN LEFT (7 spans on lg): EVALUATIONS, NOTENVERTEILUNG, & TIMELINE */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* QUALITATIVE EVALUATION */}
          <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/30 border border-indigo-100/50 rounded-[2rem] p-6 shadow-3xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-700">
              <Sparkles size={16} className="animate-pulse" />
              <span className="text-[0.6875rem] font-black uppercase tracking-widest">Sachliche Fachzusammenfassung</span>
            </div>
            <p className="text-[0.8125rem] font-medium text-slate-700 leading-relaxed italic">
              „{subjectEvaluationText}“
            </p>
          </div>

          {/* INTERACTIVE NOTENVERTEILUNG BAR-CHART */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-700">
                <BarChart3 size={16} />
                <span className="text-[0.6875rem] font-black uppercase tracking-widest">Notenverteilung in {selectedSubject}</span>
              </div>
              <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-0.5 rounded border border-slate-150 animate-pulse">
                Balken anklicken für Leistungsfilter
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {[1, 2, 3, 4, 5].map((grade) => {
                const count = gradeDistribution[grade] || 0;
                const maxCount = Math.max(...Object.values(gradeDistribution), 1);
                const percentage = Math.round((count / maxCount) * 100);
                const isSelected = selectedGradeFilter === grade;
                
                const gradeLabel = 
                  grade === 1 ? 'Sehr gut (1)' :
                  grade === 2 ? 'Gut (2)' :
                  grade === 3 ? 'Befriedigend (3)' :
                  grade === 4 ? 'Genügend (4)' : 'Nicht genügend (5)';

                const colorClass = 
                  grade <= 2 ? 'bg-emerald-500 hover:bg-emerald-600' :
                  grade === 3 ? 'bg-amber-400 hover:bg-amber-500' : 'bg-rose-500 hover:bg-rose-600';

                return (
                  <button 
                    key={grade} 
                    onClick={() => setSelectedGradeFilter(isSelected ? null : grade)}
                    className={`w-full flex items-center gap-4 text-left p-1 rounded-lg transition-all ${
                      isSelected ? 'bg-indigo-50/60 ring-1 ring-indigo-200' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`text-[0.6875rem] font-bold w-28 shrink-0 transition-colors ${isSelected ? 'text-indigo-900 font-black' : 'text-slate-500'}`}>
                      {gradeLabel}
                    </span>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                      {count > 0 && (
                        <div 
                          className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                    </div>
                    <span className={`text-[0.6875rem] font-black w-6 text-right ${isSelected ? 'text-indigo-700 scale-110' : 'text-slate-700'}`}>
                      {count}x
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedGradeFilter !== null && (
              <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100/60 p-3 rounded-xl mt-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  <p className="text-[0.6875rem] font-extrabold text-indigo-900">
                    Gefiltert nach Note: {selectedGradeFilter === 1 ? 'Sehr gut (1)' : selectedGradeFilter === 2 ? 'Gut (2)' : selectedGradeFilter === 3 ? 'Befriedigend (3)' : selectedGradeFilter === 4 ? 'Genügend (4)' : 'Nicht genügend (5)'}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedGradeFilter(null)}
                  className="p-1 hover:bg-white text-indigo-600 rounded-lg transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          {/* CHRONOLOGICAL TIMELINE OF GRADE EVENTS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Calendar size={14} className="text-indigo-500" />
                Detaillierte Einzel-Leistungsnachweise ({displayedGrades.length})
              </h4>

              {/* In-Line Timeline Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={gradeSearch}
                    onChange={(e) => setGradeSearch(e.target.value)}
                    className="pl-7 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[0.6875rem] font-medium text-slate-700 w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <select
                  value={gradeTypeFilter}
                  onChange={(e) => setGradeTypeFilter(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[0.6875rem] font-bold text-slate-600 focus:outline-none cursor-pointer"
                >
                  <option value="all">Alle Typen</option>
                  <option value="sa">Schularbeiten</option>
                  <option value="lzk">Lernzielkontrollen</option>
                  <option value="wp">Wochenpläne</option>
                  <option value="obj">Hausübungen</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-xs space-y-6">
              {displayedGrades.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="w-14 h-14 bg-slate-50 text-slate-350 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">📝</div>
                  <h5 className="text-[0.875rem] font-black text-slate-800 tracking-tight">Keine Leistungsnachweise gefunden</h5>
                  <p className="text-[0.6875rem] text-slate-400 font-semibold mt-1">
                    Passe deine Filter an oder erfasse neue Noteneinträge.
                  </p>
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6 pt-2 pb-2">
                  {displayedGrades.map((g, idx) => {
                    const isSA = g.type === 'sa';
                    const isLZK = g.type === 'lzk';
                    const isWP = g.type === 'wp';
                    
                    return (
                      <div key={g.id} className="relative group animate-fade-in">
                        {/* Dot Indicator */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 bg-white transition-all duration-300 group-hover:scale-125 ${
                          isSA ? 'border-rose-500 ring-4 ring-rose-50/70' : 
                          isLZK ? 'border-amber-400 ring-4 ring-amber-50/70' : 
                          isWP ? 'border-indigo-400 ring-4 ring-indigo-50/70' : 'border-emerald-400 ring-4 ring-emerald-50/70'
                        }`} />
                        
                        <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/60 hover:bg-slate-50 border border-transparent hover:border-slate-150 transition-all duration-150">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider ${
                                isSA ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                isLZK ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                                isWP ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              }`}>
                                {g.typeLabel}
                              </span>
                              <span className="text-[0.625rem] text-slate-400 font-bold">
                                {g.date ? new Date(g.date).toLocaleDateString('de-DE') : `Semester ${g.semester}`}
                              </span>
                            </div>
                            <h5 className="text-[0.875rem] font-black text-slate-800 tracking-tight mt-1">{g.label}</h5>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[0.625rem] text-slate-400 font-black uppercase tracking-widest">Note:</span>
                            <span className={`text-[1.125rem] font-black px-3.5 py-1.5 rounded-xl border shadow-3xs ${
                              g.numericGrade <= 2 ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-100' :
                              g.numericGrade >= 4 ? 'bg-rose-500 text-white border-rose-500 shadow-rose-100' :
                              'bg-amber-400 text-white border-amber-400 shadow-amber-100'
                            }`}>
                              {g.originalGrade}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLUMN RIGHT (5 spans on lg): DIAGNOSTICS & LERNZIELE CONNECTED */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* COMPREHENSIVE PÄDAGOGISCHE DIAGNOSTIK */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2">
              <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Brain size={14} className="text-emerald-500" />
                Pädagogische Diagnostik & Screenings
              </h4>
            </div>

            <div className="bg-white border border-slate-200/85 rounded-[2.5rem] p-6 shadow-xs space-y-6">
              {/* ANTOLIN INTEGRATION FOR DEUTSCH */}
              {selectedSubject === 'Deutsch' && (
                <div className="border-b border-slate-100 pb-5 space-y-4.5">
                  <div className="flex items-center gap-2 text-amber-600">
                    <BookOpenCheck size={16} />
                    <span className="text-[0.6875rem] font-black uppercase tracking-widest">Antolin Lese-Statistik (Deutsch)</span>
                  </div>
                  
                  {latestAntolin ? (
                    <div className="grid grid-cols-2 gap-4 bg-amber-50/30 border border-amber-100 rounded-2xl p-4">
                      <div>
                        <span className="text-[0.5625rem] font-black text-amber-800 uppercase tracking-widest">Gelesene Bücher</span>
                        <p className="text-[1.375rem] font-black text-slate-900 mt-1">{latestAntolin.anzahlBuecher} Bücher</p>
                      </div>
                      <div>
                        <span className="text-[0.5625rem] font-black text-amber-800 uppercase tracking-widest">Antolin Punkte</span>
                        <p className="text-[1.375rem] font-black text-slate-900 mt-1">{latestAntolin.punkte} Pkt</p>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-amber-100">
                        <div className="flex justify-between text-[0.625rem] font-bold text-amber-800 uppercase tracking-wider mb-1">
                          <span>Quiz-Leistung (Erfolgsquote)</span>
                          <span>{latestAntolin.leistung}%</span>
                        </div>
                        <div className="w-full h-2 bg-amber-100/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${latestAntolin.leistung}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center italic text-[0.6875rem] text-slate-400">
                      Keine aktuellen Antolin-Daten für diesen Schüler erfasst.
                    </div>
                  )}
                </div>
              )}

              {/* SCREENING TEST RESULTS LIST WITH FILTERS */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3">
                  <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Spezifische Test-Ergebnisse</span>
                  
                  {/* Search and support only switch */}
                  <div className="flex flex-col gap-2">
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Test suchen..."
                        value={diagSearch}
                        onChange={(e) => setDiagSearch(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[0.7rem] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1 select-none">
                      <input
                        type="checkbox"
                        checked={diagSupportOnly}
                        onChange={(e) => setDiagSupportOnly(e.target.checked)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 border-slate-300"
                      />
                      <span className="text-[0.6875rem] font-extrabold text-slate-500 uppercase tracking-wider">Nur Förderbedarf anzeigen</span>
                    </label>
                  </div>
                </div>
                
                {displayedDiagnostics.length === 0 ? (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                    <p className="text-[0.6875rem] text-slate-400 italic">
                      Keine passenden Screenings in {selectedSubject} verzeichnet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {displayedDiagnostics.map((e: any) => (
                      <div key={e.id} className="p-3 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 rounded-xl flex items-center justify-between gap-3 animate-fade-in">
                        <div>
                          <p className="text-[0.75rem] font-black text-slate-800 leading-tight">{e.test?.name || 'Diagnostik Test'}</p>
                          <span className="text-[0.5625rem] text-slate-400 font-bold">{e.datum ? new Date(e.datum).toLocaleDateString('de-DE') : 'Vor Kurzem'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[0.75rem] font-black text-slate-800 bg-white border border-slate-200/80 px-2.5 py-1 rounded-lg">
                            {e.ergebniswert} {e.test?.einheit || 'PR'}
                          </span>
                          {isDiagnosticAlert(e) ? (
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100/80" title="Pädagogischer Prüfhinweis" />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100/80" title="Normgerechte Leistung" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INTERACTIVE LERNZIELE CHECKBOX PANEL */}
          <div className="space-y-4">
            <div className="flex flex-col gap-1 px-2">
              <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Target size={14} className="text-indigo-500" />
                Fach-Lernziele ({classLevel}. Klasse)
              </h4>
            </div>

            <div className="bg-white border border-slate-200/85 rounded-[2.5rem] p-6 shadow-xs space-y-5">
              {goalCompletionStats && (
                <div className="border-b border-slate-100 pb-4.5 space-y-2">
                  <div className="flex justify-between text-[0.6875rem] font-black uppercase text-slate-500">
                    <span>Lernziel-Erreichung</span>
                    <span className="text-indigo-600">{goalCompletionStats.achievedPercent}% voll erreicht</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full" 
                      style={{ width: `${goalCompletionStats.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[0.59375rem] text-slate-400 font-bold uppercase tracking-wide leading-tight">
                    {goalCompletionStats.achievedCount} von {goalCompletionStats.total} Kompetenzen voll abgesichert
                  </p>
                </div>
              )}

              {/* Lernziele Search and Status Filter */}
              <div className="space-y-2">
                <div className="relative">
                  <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Lernziel filtern..."
                    value={goalSearch}
                    onChange={(e) => setGoalSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[0.6875rem] font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: 'all', label: 'Alle' },
                    { id: 'achieved', label: '🟢 Erreicht' },
                    { id: 'partial', label: '🟡 Teilw.' },
                    { id: 'minimal', label: '🟠 Min.' },
                    { id: 'pending', label: '⚪ Offen' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setGoalStatusFilter(tab.id)}
                      className={`px-2.5 py-0.5 rounded-md text-[0.59375rem] font-black uppercase tracking-wider transition-all ${
                        goalStatusFilter === tab.id 
                          ? 'bg-indigo-600 text-white shadow-3xs' 
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {displayedGoals.length === 0 ? (
                <div className="py-6 text-center text-slate-400 italic text-[0.6875rem] bg-slate-50 rounded-xl">
                  Keine passenden Lernziele für die Kriterien vorhanden.
                </div>
              ) : (
                <div className="space-y-1 bg-slate-50/50 border border-slate-100 rounded-2xl p-3.5">
                  <p className="text-[0.5rem] font-black uppercase text-slate-400 tracking-widest mb-2.5 leading-none">
                    Tipp: Anklicken, um den Erreichungsstatus zu verändern!
                  </p>
                  <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                    {displayedGoals.map((ziel: any) => {
                      const r = lernzieleState[ziel.id] || 0;
                      const isAchieved = r === 1;
                      const isPartial = r === 2;
                      const isMinimal = r === 3;
                      
                      return (
                        <li 
                          key={ziel.id} 
                          onClick={() => handleToggleGoal(ziel.id)}
                          className="flex items-start gap-3.5 p-1.5 group cursor-pointer hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-150 animate-fade-in"
                        >
                          <div className="mt-0.5 shrink-0">
                            {isAchieved ? (
                              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[0.625rem] shadow-sm shadow-emerald-100">✓</div>
                            ) : isPartial ? (
                              <div className="w-5 h-5 rounded-full bg-lime-500 text-white flex items-center justify-center text-[0.625rem] shadow-sm shadow-lime-100">~</div>
                            ) : isMinimal ? (
                              <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center text-[0.625rem] shadow-sm shadow-amber-100">!</div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-300 border border-slate-200 flex items-center justify-center text-[0.625rem]" />
                            )}
                          </div>
                          <div className="space-y-0.5 flex-1 select-none">
                            <p className="text-[0.75rem] font-bold text-slate-800 leading-snug group-hover:text-indigo-900 transition-colors">
                              {ziel.text}
                            </p>
                            <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                              Status: 
                              {isAchieved ? (
                                <span className="text-emerald-600 font-black">Erreicht 🟢</span>
                              ) : isPartial ? (
                                <span className="text-lime-600 font-black">Im Wesentlichen 🟡</span>
                              ) : isMinimal ? (
                                <span className="text-amber-600 font-black">Minimal erreicht 🟠</span>
                              ) : (
                                <span className="text-slate-400 font-black">Ausstehend / Offen ⚪</span>
                              )}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FACHSPEZIFISCHE PEDAGOGICAL NOTES / JOURNAL */}
      <div className="pt-8 border-t border-slate-100 space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <MessageSquare size={14} className="text-indigo-500" />
            Pädagogische Beobachtungen & Journal ({selectedSubject})
          </h4>
          <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-150 px-2.5 py-0.5 rounded-md">
            {displayedNotes.length} Notizen gelistet
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Note Composer */}
          <div className="lg:col-span-5 bg-white border border-slate-200/80 rounded-[2.5rem] p-6 shadow-2xs h-fit space-y-4.5">
            <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
              <Plus size={16} className="text-indigo-600" />
              Notiz in {selectedSubject} erfassen
            </span>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Eintragsdatum</label>
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

              <div>
                <label className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest">Beobachtungstext</label>
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder={`Mitschriften oder auffällige Ereignisse im Fach ${selectedSubject} dokumentieren...`}
                  className="w-full mt-1 min-h-[110px] p-4 bg-slate-50 border border-slate-250 rounded-2xl text-[0.8125rem] font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={handleAddSubjectNote}
                disabled={!newNoteText.trim()}
                className="w-full py-3 px-5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                <span>Notiz speichern</span>
              </button>
            </div>
          </div>

          {/* Notes List with filters */}
          <div className="lg:col-span-7 bg-slate-50/50 border border-slate-200/70 rounded-[2.5rem] p-6 shadow-3xs space-y-4">
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Diese Notizen filtern..."
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

            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1.5 scrollbar-thin">
              {displayedNotes.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-xl flex items-center justify-center mx-auto mb-3 text-lg">📝</div>
                  <p className="text-[0.75rem] text-slate-400 font-semibold italic">Keine passenden Notizen in {selectedSubject} erfasst.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {displayedNotes.map((note) => (
                    <div key={note.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-start justify-between gap-4 shadow-3xs group hover:border-slate-200 transition-all duration-150 animate-fade-in">
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[0.625rem] text-slate-400 font-black tracking-wide flex items-center gap-1">
                            <Calendar size={11} />
                            {note.datum ? new Date(note.datum).toLocaleDateString('de-DE') : 'Vor Kurzem'}
                          </span>
                          <span className={`text-[0.5625rem] px-2 py-0.5 border rounded-full font-black uppercase tracking-widest ${getNoteCategoryStyles(note.kategorie)}`}>
                            {note.kategorie || 'Notiz'}
                          </span>
                        </div>
                        <p className="text-[0.78125rem] font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">{note.inhalt}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteSubjectNote(note.id)}
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
