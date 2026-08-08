import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart2,
  Users,
  Award,
  TrendingUp,
  Sparkles,
  BookOpen,
  ChevronRight,
  Calculator,
  Info,
  Layers,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";

interface Student {
  id: string;
  vorname: string;
  nachname: string;
  charakter?: string[];
}

interface SchularbeitClassStatsProps {
  subject: string;
  semester: string;
  saIndex: number;
  schueler: Student[];
  saAssessments: Record<string, any>;
  onClose?: () => void;
}

export default function SchularbeitClassStats({
  subject,
  semester,
  saIndex,
  schueler = [],
  saAssessments = {},
}: SchularbeitClassStatsProps) {
  const [activeTab, setActiveTab] = useState<"points" | "grades">("points");
  const [searchTerm, setSearchTerm] = useState("");

  // Extract evaluations for this specific Schularbeit
  const evaluations = useMemo(() => {
    const list: any[] = [];
    schueler.forEach((student) => {
      const studentAss =
        saAssessments[student.id]?.[subject]?.[semester]?.[saIndex];
      if (studentAss) {
        // Calculate points achieved per aspect category
        let inhaltPointsAchieved = 0;
        let inhaltPointsMax = 0;
        let ausdruckPointsAchieved = 0;
        let ausdruckPointsMax = 0;
        let sprachPointsAchieved = 0;
        let sprachPointsMax = 0;

        studentAss.aspects?.forEach((aspect: any) => {
          const title = aspect.title?.toLowerCase() || "";
          const points = aspect.criteria?.reduce((a: number, c: any) => a + (c.points || 0), 0) || 0;
          const max = aspect.criteria?.reduce((a: number, c: any) => a + (c.maxPoints || 0), 0) || 0;

          if (title.includes("inhalt") || title.startsWith("1.")) {
            inhaltPointsAchieved += points;
            inhaltPointsMax += max;
          } else if (title.includes("ausdruck") || title.startsWith("2.")) {
            ausdruckPointsAchieved += points;
            ausdruckPointsMax += max;
          } else if (title.includes("richtigkeit") || title.includes("grammatik") || title.startsWith("3.")) {
            sprachPointsAchieved += points;
            sprachPointsMax += max;
          }
        });

        // Sum up total points
        const totalPoints =
          studentAss.aspects?.reduce((acc: number, aspect: any) => {
            return (
              acc +
              (aspect.criteria?.reduce(
                (a: number, c: any) => a + (c.points || 0),
                0,
              ) || 0)
            );
          }, 0) || 0;

        const maxPoints =
          studentAss.aspects?.reduce((acc: number, aspect: any) => {
            return (
              acc +
              (aspect.criteria?.reduce(
                (a: number, c: any) => a + (c.maxPoints || 0),
                0,
              ) || 0)
            );
          }, 0) || 0;

        list.push({
          studentId: student.id,
          name: `${student.vorname} ${student.nachname}`,
          totalPoints,
          maxPoints,
          inhaltPoints: inhaltPointsAchieved,
          inhaltMax: inhaltPointsMax,
          ausdruckPoints: ausdruckPointsAchieved,
          ausdruckMax: ausdruckPointsMax,
          sprachPoints: sprachPointsAchieved,
          sprachMax: sprachPointsMax,
          grammatikTeilPoints: studentAss.grammarAchievedPoints || 0,
          grammatikTeilMax: studentAss.config?.maxGrammarPoints || 20,
          grammarEnabled: studentAss.config?.enableGrammar || false,
          arbeitsNote: studentAss.arbeitsNote || 5,
          rechtschreibNote: studentAss.rechtschreibNote || 5,
          gesamtnote: studentAss.gesamtnote || 5,
          wordCount: studentAss.wordCount || 0,
          errorCount: studentAss.errorCount || 0,
          spellingPoints: studentAss.spellingPoints || 0,
          config: studentAss.config || {},
        });
      }
    });

    // Sort by total points descending
    return list.sort((a, b) => b.totalPoints - a.totalPoints);
  }, [schueler, saAssessments, subject, semester, saIndex]);

  // Calculations for those evaluated
  const stats = useMemo(() => {
    const count = evaluations.length;
    if (count === 0) {
      return {
        count: 0,
        avgGrade: 0,
        avgPoints: 0,
        avgPointsPercent: 0,
        maxPointsPossible: 0,
        bestPoints: 0,
        lowestPoints: 0,
        gradeCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        passRate: 0,
        bestInhalt: null,
        bestAusdruck: null,
        bestGrammar: null,
        bestGrammarTeil: null,
        mostErrors: null,
        bestArbeitsNote: null,
        highestWordCount: null,
        bestOverall: null
      };
    }

    let sumGrade = 0;
    let sumPoints = 0;
    let bestPointsTotal = 0;
    let lowestPoints = Infinity;
    let maxPointsPossible = 0;
    const gradeCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    evaluations.forEach((ev) => {
      sumGrade += ev.gesamtnote;
      sumPoints += ev.totalPoints;
      maxPointsPossible = Math.max(maxPointsPossible, ev.maxPoints);
      bestPointsTotal = Math.max(bestPointsTotal, ev.totalPoints);
      lowestPoints = Math.min(lowestPoints, ev.totalPoints);
      const grade = ev.gesamtnote as 1 | 2 | 3 | 4 | 5;
      if (gradeCounts[grade] !== undefined) {
        gradeCounts[grade]++;
      }
    });

    // Special Insights
    const sortedByInhalt = [...evaluations].sort((a,b) => (b.inhaltPoints / (b.inhaltMax || 1)) - (a.inhaltPoints / (a.inhaltMax || 1)));
    const sortedByAusdruck = [...evaluations].sort((a,b) => (b.ausdruckPoints / (b.ausdruckMax || 1)) - (a.ausdruckPoints / (a.ausdruckMax || 1)));
    const sortedByGrammar = [...evaluations].sort((a,b) => (b.sprachPoints / (b.sprachMax || 1)) - (a.sprachPoints / (a.sprachMax || 1)));
    const sortedByGrammarTeil = [...evaluations].sort((a,b) => (b.grammatikTeilMax > 0 ? b.grammatikTeilPoints / b.grammatikTeilMax : 0) - (a.grammatikTeilMax > 0 ? a.grammatikTeilPoints / a.grammatikTeilMax : 0));
    const sortedByErrors = [...evaluations].sort((a,b) => b.errorCount - a.errorCount);
    const sortedByArbeitsNote = [...evaluations].sort((a,b) => a.arbeitsNote - b.arbeitsNote);
    const sortedByWordCount = [...evaluations].sort((a,b) => b.wordCount - a.wordCount);
    const sortedByOverall = [...evaluations].sort((a, b) => b.totalPoints - a.totalPoints);

    const passedCount = count - gradeCounts[5];

    return {
      count,
      avgGrade: sumGrade / count,
      avgPoints: sumPoints / count,
      avgPointsPercent:
        maxPointsPossible > 0
          ? (sumPoints / count / maxPointsPossible) * 100
          : 0,
      maxPointsPossible,
      bestPoints: bestPointsTotal,
      lowestPoints: lowestPoints === Infinity ? 0 : lowestPoints,
      gradeCounts,
      passRate: (passedCount / count) * 100,
      bestInhalt: sortedByInhalt[0],
      bestAusdruck: sortedByAusdruck[0],
      bestGrammar: sortedByGrammar[0],
      bestGrammarTeil: sortedByGrammarTeil[0],
      mostErrors: sortedByErrors[0],
      bestArbeitsNote: sortedByArbeitsNote[0],
      highestWordCount: sortedByWordCount[0],
      bestOverall: sortedByOverall[0]
    };
  }, [evaluations]);

  // Color mapping for grades
  const getGradeTheme = (grade: number) => {
    switch (grade) {
      case 1:
        return {
          bg: "bg-emerald-500",
          text: "text-emerald-700",
          border: "border-emerald-200",
          lightBg: "bg-emerald-50",
          chartCol: "bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-emerald-500/20",
          hex: "#10b981",
        };
      case 2:
        return {
          bg: "bg-indigo-500",
          text: "text-indigo-700",
          border: "border-indigo-200",
          lightBg: "bg-indigo-50",
          chartCol: "bg-gradient-to-t from-indigo-600 to-indigo-400 shadow-indigo-500/20",
          hex: "#6366f1",
        };
      case 3:
        return {
          bg: "bg-amber-500",
          text: "text-amber-700",
          border: "border-amber-200",
          lightBg: "bg-amber-50",
          chartCol: "bg-gradient-to-t from-amber-600 to-amber-400 shadow-amber-500/20",
          hex: "#f59e0b",
        };
      case 4:
        return {
          bg: "bg-orange-500",
          text: "text-orange-700",
          border: "border-orange-200",
          lightBg: "bg-orange-50",
          chartCol: "bg-gradient-to-t from-orange-600 to-orange-400 shadow-orange-500/15",
          hex: "#f97316",
        };
      default:
        return {
          bg: "bg-rose-500",
          text: "text-rose-700",
          border: "border-rose-200",
          lightBg: "bg-rose-50",
          chartCol: "bg-gradient-to-t from-rose-600 to-rose-400 shadow-rose-500/25",
          hex: "#ef4444",
        };
    }
  };

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) =>
      ev.name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [evaluations, searchTerm]);

  if (evaluations.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center max-w-lg mx-auto space-y-4">
        <div className="w-14 h-14 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
          <BarChart2 size={24} />
        </div>
        <div>
          <h3 className="text-[0.875rem] leading-snug font-black text-zinc-800 uppercase tracking-wider">
            Keine Statistik verfügbar
          </h3>
          <p className="text-[0.6875rem] font-bold text-zinc-500 leading-relaxed mt-1.5">
            Es wurden für diese Schularbeit noch keine Schüler-Beurteilungsbögen
            gespeichert.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-zinc-200/80 shadow-sm p-8 space-y-8 print:p-0 print:border-none print:shadow-none w-full mx-auto flex-1 flex flex-col justify-start overflow-y-auto">
      <style>{`
        @media print {
          @page { size: landscape; margin: 0.5cm; }
          .no-print { display: none !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .print-full { width: 100% !important; max-width: none !important; }
          .bg-white { border: none !important; padding: 0 !important; }
        }
      `}</style>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-6 no-print shrink-0">
        <div>
          <h3 className="text-[1.125rem] leading-snug font-black text-zinc-900 flex items-center gap-2 uppercase tracking-widest">
            <BarChart2 size={20} className="text-indigo-600" />
            Klassenstatistik {subject}
          </h3>
          <p className="text-[0.75rem] font-bold text-zinc-400 mt-1 uppercase tracking-widest">
            {semester}. Semester • {saIndex + 1}. Schularbeit • {evaluations.length} beurteilte Schüler
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("points")}
              className={`px-5 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all ${
                activeTab === "points" ? "bg-white text-zinc-900 shadow-lg" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Leistungs-Analyse
            </button>
            <button
              onClick={() => setActiveTab("grades")}
              className={`px-5 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-widest transition-all ${
                activeTab === "grades" ? "bg-white text-zinc-900 shadow-lg" : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              Notenspiegel
            </button>
          </div>

          <button 
            type="button"
            onClick={() => window.print()}
            className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl text-[0.6875rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-xl active:scale-95"
          >
            Bericht drucken
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-8 min-h-0">
        {/* Deutsch Specific Insights: High Performance & Need for Support */}
        {subject === "Deutsch" && (
          <div className="space-y-6 shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* Top Inhalt */}
            <div className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <Sparkles size={16} className="text-emerald-600" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-700">Inhalt</span>
              </div>
              <p className="text-[1rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.bestInhalt?.name}</p>
              <p className="text-[0.625rem] font-bold text-emerald-600 mt-2 uppercase tracking-wide">Beste Inhaltsbewertung</p>
            </div>

            {/* Top Ausdruck */}
            <div className="bg-indigo-50/40 border border-indigo-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <BookOpen size={16} className="text-indigo-600" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-indigo-700">Ausdruck</span>
              </div>
              <p className="text-[1rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.bestAusdruck?.name}</p>
              <p className="text-[0.625rem] font-bold text-indigo-600 mt-2 uppercase tracking-wide">Top Sprachlicher Ausdruck</p>
            </div>

            {/* Best Arbeitsnote */}
            <div className="bg-sky-50/40 border border-sky-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <Users size={16} className="text-sky-600" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-sky-700">Arbeitsnote</span>
              </div>
              <p className="text-[1rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.bestArbeitsNote?.name}</p>
              <p className="text-[0.625rem] font-bold text-sky-600 mt-2 uppercase tracking-wide">Beste Arbeitsnote (Inhalt & Ausdruck)</p>
            </div>

            {/* Top Grammar Part */}
            <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <Calculator size={16} className="text-blue-600" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-blue-700">Grammatik</span>
              </div>
              {stats.bestGrammarTeil?.grammarEnabled ? (
                <>
                  <p className="text-[1.125rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.bestGrammarTeil?.name}</p>
                  <p className="text-[0.625rem] font-bold text-blue-600 mt-2 uppercase tracking-wide">Bestleistung Grammatikteil</p>
                </>
              ) : (
                <>
                  <p className="text-[1.125rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.bestGrammar?.name}</p>
                  <p className="text-[0.625rem] font-bold text-blue-600 mt-2 uppercase tracking-wide">Beste Sprachrichtigkeit</p>
                </>
              )}
            </div>

            {/* Most Diligent / Longest Text (Conditionally shown if spelling is enabled) */}
            {(!evaluations[0] || evaluations[0].config?.enableSpelling !== false) && (
              <div className="bg-amber-50/40 border border-amber-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp size={16} className="text-amber-600" />
                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-amber-700">Wortanzahl</span>
                </div>
                <p className="text-[1rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.highestWordCount?.name}</p>
                <p className="text-[0.625rem] font-bold text-amber-600 mt-2 uppercase tracking-wide">{stats.highestWordCount?.wordCount} Wörter geschrieben</p>
              </div>
            )}

            {/* Support Needed (Most Errors) (Conditionally shown if spelling is enabled) */}
            {(!evaluations[0] || evaluations[0].config?.enableSpelling !== false) && (
              <div className="bg-rose-50/40 border border-rose-100 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <AlertTriangle size={16} className="text-rose-600" />
                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-rose-700">Fehlerfokus</span>
                </div>
                <p className="text-[1rem] font-black text-zinc-800 tracking-tight leading-none truncate">{stats.mostErrors?.name}</p>
                <p className="text-[0.625rem] font-bold text-rose-600 mt-2 uppercase tracking-wide">{stats.mostErrors?.errorCount} Fehler (Meiste RS-Fehler)</p>
              </div>
            )}
          </div>

          {/* Overall MVP / Best Overall Card */}
          <div className="bg-zinc-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full -mr-32 -mt-32 blur-[80px] group-hover:bg-amber-500/20 transition-all duration-700" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-32 -mb-32 blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-700" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-center md:text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-center md:justify-start gap-3">
                  <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/20">
                    <Award className="text-amber-950" size={24} />
                  </div>
                  <h4 className="text-[0.75rem] font-black uppercase tracking-[0.25em] text-amber-500">Gesamt-Bestleistung</h4>
                </div>
                <p className="text-[2.5rem] lg:text-[3.5rem] font-black tracking-tighter leading-none">{stats.bestOverall?.name}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <span className="block text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Punkte</span>
                    <span className="text-xl font-black">{stats.bestOverall?.totalPoints} / {stats.maxPointsPossible}</span>
                  </div>
                  <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl">
                    <span className="block text-[0.625rem] font-black text-zinc-500 uppercase tracking-widest mb-1">Entwicklung</span>
                    <span className="text-xl font-black text-emerald-400">{(stats.bestOverall?.totalPoints / (stats.maxPointsPossible || 1) * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
              
              <div className="shrink-0 flex flex-col items-center gap-4">
                <div className="w-40 h-40 relative flex items-center justify-center">
                   <svg className="w-full h-full -rotate-90">
                     <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/5" />
                     <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={440} strokeDashoffset={440 - (440 * (stats.bestOverall?.totalPoints / (stats.maxPointsPossible || 1)))} className="text-amber-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                     <span className="text-4xl font-black">1</span>
                     <span className="text-[0.625rem] font-extrabold uppercase tracking-widest text-zinc-500">Gesamtnote</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Class Average Grade */}
        <div className="bg-zinc-50 border border-zinc-200/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm hover:shadow transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center shrink-0">
            <Award size={18} />
          </div>
          <div>
            <div className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-widest leading-none">
              Notenschnitt
            </div>
            <div className="text-[1.125rem] leading-normal font-black text-zinc-800 mt-1.5 leading-none">
              {stats.avgGrade.toFixed(2).replace(".", ",")}
            </div>
            <div className="text-[0.53125rem] font-bold text-zinc-400 mt-1 flex items-center gap-0.5">
              Ziel-Klasse: ≤ 3.0
            </div>
          </div>
        </div>

        {/* KPI 2: Average Points */}
        <div className="bg-zinc-50 border border-zinc-200/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm hover:shadow transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/60 flex items-center justify-center shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-widest leading-none">
              Punkte-Schnitt
            </div>
            <div className="text-[1.125rem] leading-normal font-black text-indigo-750 text-indigo-600 mt-1.5 leading-none">
              {stats.avgPoints.toFixed(1).replace(".", ",")}
            </div>
            <div className="text-[0.53125rem] font-bold text-zinc-400 mt-1">
              von max. {stats.maxPointsPossible} Pkt (
              {stats.avgPointsPercent.toFixed(0)}%)
            </div>
          </div>
        </div>

        {/* KPI 3: Points Range */}
        <div className="bg-zinc-50 border border-zinc-200/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm hover:shadow transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100/60 flex items-center justify-center shrink-0">
            <Calculator size={18} />
          </div>
          <div>
            <div className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-widest leading-none">
              Bandbreite
            </div>
            <div className="text-[1.125rem] leading-normal font-black text-zinc-800 mt-1.5 leading-none">
              {stats.lowestPoints}-{stats.bestPoints} Pkt
            </div>
            <div className="text-[0.53125rem] font-bold text-zinc-400 mt-1">
              Abstand: {stats.bestPoints - stats.lowestPoints} Pkt
            </div>
          </div>
        </div>

        {/* KPI 4: Pass Rate */}
        <div className="bg-zinc-50 border border-zinc-200/40 p-4 rounded-2xl flex items-center gap-3.5 shadow-sm hover:shadow transition-all duration-300">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100/60 flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[0.5625rem] font-black text-zinc-400 uppercase tracking-widest leading-none">
              Erfolgsquote
            </div>
            <div className="text-[1.125rem] leading-normal font-black text-zinc-800 mt-1.5 leading-none">
              {stats.passRate.toFixed(0)}%
            </div>
            <div className="text-[0.53125rem] font-bold text-zinc-500 mt-1">
              {evaluations.length - stats.gradeCounts[5]} von{" "}
              {evaluations.length} Positiv
            </div>
          </div>
        </div>
      </div>

      {/* Points Density Chart (New) */}
      <div className="bg-white border border-zinc-200/60 rounded-[2.5rem] p-6 lg:p-8 space-y-4 shadow-sm">
        <div>
          <h4 className="text-[0.625rem] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
            <Sparkles size={12} className="text-amber-500" />
            Punkte-Verlauf & Dichte
          </h4>
          <p className="text-[0.75rem] font-bold text-zinc-600 mt-1">
            Visualisierung der Punkte-Streuung über die gesamte Klasse
          </p>
        </div>
        
        <div className="h-32 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={evaluations.map(ev => ({
                points: ev.totalPoints,
                name: ev.name
              })).sort((a, b) => a.points - b.points)}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/80 backdrop-blur-md border border-zinc-200 p-2 rounded-xl shadow-lg">
                        <div className="text-[0.625rem] font-black text-zinc-800">{data.name}</div>
                        <div className="text-[0.625rem] font-bold text-indigo-600">{data.points} Punkte</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="points" 
                stroke="#6366f1" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorPoints)" 
                animationDuration={2000}
              />
              <ReferenceLine 
                y={stats.avgPoints} 
                stroke="#ef4444" 
                strokeDasharray="3 3"
                label={{ position: 'top', value: `Schnitt: ${stats.avgPoints.toFixed(1)}`, fill: '#ef4444', fontSize: 10, fontWeight: 900 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Charts area */}
      {activeTab === "grades" ? (
        /* Notenspiegel with Recharts */
        <div className="bg-zinc-50/50 border border-zinc-200/40 rounded-[2.5rem] p-6 lg:p-8 space-y-6 shadow-inner relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-[0.625rem] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                <Layers size={12} className="text-indigo-400" />
                Interaktiver Klassenspiegel
              </h4>
              <p className="text-[0.75rem] font-bold text-zinc-600 mt-1">
                Verteilung der Noten 1 bis 5 in der gesamten Klasse
              </p>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={([1, 2, 3, 4, 5] as const).map(grade => ({
                  name: `Note ${grade}`,
                  count: stats.gradeCounts[grade] || 0,
                  grade: grade,
                  theme: getGradeTheme(grade)
                }))}
                margin={{ top: 20, right: 30, left: -20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#71717a' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#a1a1aa' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f4f4f5', radius: 12, opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white border border-zinc-200 shadow-2xl rounded-2xl p-4 min-w-[140px] animate-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[0.625rem] font-black px-2 py-0.5 rounded-lg text-white ${data.theme.bg}`}>
                              {data.name}
                            </span>
                          </div>
                          <div className="text-[1.25rem] leading-normal font-black text-zinc-900 leading-none">
                            {data.count} <span className="text-[0.625rem] font-bold text-zinc-400">Schüler</span>
                          </div>
                          <div className="h-1.5 w-full bg-zinc-100 rounded-full mt-3 overflow-hidden">
                            <div 
                              className={`h-full ${data.theme.bg}`} 
                              style={{ width: `${(data.count / stats.count) * 100}%` }}
                            />
                          </div>
                          <div className="text-[0.5625rem] font-black text-zinc-400 mt-1 uppercase tracking-tight">
                            {((data.count / stats.count) * 100).toFixed(1)}% der Klasse
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[12, 12, 4, 4]} 
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {([1, 2, 3, 4, 5] as const).map((grade, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getGradeTheme(grade).hex} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
                <ReferenceLine 
                  y={stats.count / 5} 
                  stroke="#cbd5e1" 
                  strokeDasharray="5 5" 
                  label={{ position: 'right', value: 'Schnitt', fill: '#94a3b8', fontSize: 9, fontWeight: 800 }} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 pt-6 border-t border-zinc-200/60">
            {([1, 2, 3, 4, 5] as const).map(grade => {
              const theme = getGradeTheme(grade);
              return (
                <div key={grade} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${theme.bg} shadow-sm`} />
                  <span className="text-[0.6875rem] font-black text-zinc-600 uppercase tracking-wider">
                    Note {grade}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Point distribution: horizontal interactive comparison bars for each student */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h4 className="text-[0.625rem] font-black uppercase text-zinc-400 tracking-wider">
              Erreichte Kriterienpunkte der Schüler
            </h4>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Schüler suchen..."
              className="px-3 py-1.5 border border-zinc-200 rounded-xl text-[0.75rem] leading-tight font-bold w-full sm:w-56 outline-none focus:ring-2 focus:ring-indigo-500/10 placeholder-zinc-400"
            />
          </div>

          <div className="bg-zinc-50/50 border border-zinc-200/40 rounded-2xl p-4 md:p-5 overflow-visible space-y-3.5 shadow-inner">
            {filteredEvaluations.map((ev) => {
              const theme = getGradeTheme(ev.gesamtnote);
              const percent =
                ev.maxPoints > 0 ? (ev.totalPoints / ev.maxPoints) * 100 : 0;

              // Find grading thresholds
              const isFirstGrading = ev.config?.grade1Points !== undefined;
              const g1P = ev.config?.grade1Points || 16;
              const g2P = ev.config?.grade2Points || 13;
              const g3P = ev.config?.grade3Points || 10;
              const g4P = ev.config?.grade4Points || 7;

              return (
                <div
                  key={ev.studentId}
                  className="space-y-1.5 group bg-white border border-zinc-200/40 hover:border-zinc-300 p-3.5 rounded-xl shadow-sm hover:shadow transition-all relative"
                >
                  <div className="flex justify-between items-center text-[0.75rem] leading-tight">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-900 group-hover:text-indigo-650 transition-colors">
                        {ev.name}
                      </span>
                      {ev.totalPoints === stats.bestPoints && (
                        <span className="text-[0.5rem] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          🏆 Bestwert
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-zinc-500 leading-none">
                        <strong className="text-zinc-800 font-black">
                          {ev.totalPoints.toString().replace(".", ",")}
                        </strong>{" "}
                        / {ev.maxPoints} Pkt
                      </span>
                      <span
                        className={`w-6 h-6 rounded-lg ${theme.bg} text-white font-black text-[0.75rem] leading-tight flex items-center justify-center shrink-0 shadow-sm shadow-zinc-550/25`}
                      >
                        {ev.gesamtnote}
                      </span>
                    </div>
                  </div>

                  {/* Achieve Bar with Markers */}
                  <div className="relative h-2.5 w-full bg-zinc-100 rounded-full  flex items-center">
                    {/* Progress Fill */}
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full ${theme.bg} rounded-full transition-all`}
                    />
                  </div>

                  {/* Details / Legend beneath the student bar */}
                  <div className="flex justify-between text-[0.5rem] font-bold text-zinc-400 select-none">
                    <span>
                      {ev.config?.enableSpelling !== false && (
                        `RS-Quote: ${ev.spellingPoints.toFixed(1).replace(".", ",")} (RS-Note: ${ev.rechtschreibNote})`
                      )}
                    </span>
                    <span className="flex items-center gap-1 flex-wrap">
                      <span>Schwelle 1er: {g1P} Pkt</span>
                      <span>•</span>
                      <span>4er: {g4P} Pkt</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredEvaluations.length === 0 && (
              <div className="text-center py-10 text-[0.75rem] leading-tight font-bold text-zinc-400">
                Keine Schüler mit diesen Suchbegriffen beurteilt.
              </div>
            )}
          </div>

          {/* Reference Average Line */}
          <div className="bg-indigo-50/50 border border-indigo-150 p-3.5 rounded-xl text-[0.625rem] font-bold text-indigo-850 space-y-1">
            <span className="uppercase text-[0.5625rem] font-black text-indigo-900 flex items-center gap-1">
              <Sparkles size={11} className="text-indigo-500" />{" "}
              Klassenzusammenfassung & Analyse:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[0.65625rem] font-medium leading-relaxed text-zinc-600">
              <div>
                Der Punktedurchschnitt liegt bei{" "}
                <strong className="text-zinc-800 font-bold">
                  {stats.avgPoints.toFixed(1).replace(".", ",")} Punkten
                </strong>
                . Dies entspricht einer mittleren Ausschöpfung von{" "}
                <strong className="text-zinc-800 font-bold">
                  {stats.avgPointsPercent.toFixed(0)}%
                </strong>{" "}
                des Kriterienkatalogs.
              </div>
              <div>
                Die Erfolgsquote liegt bei erfreulichen{" "}
                <strong className="text-zinc-805 font-black text-emerald-600">
                  {stats.passRate.toFixed(0)}%
                </strong>
                . Es wurden {stats.gradeCounts[1] || 0} mal "Sehr gut" und{" "}
                {stats.gradeCounts[5] || 0} mal "Nicht genügend" vergeben.
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
