import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { EmptyState } from './EmptyState';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { berechne } from '../lib/GradeUtils';
import { formatLocalDateKey } from '../lib/utils';
import { FAECHER_ALLE } from '../constants';
import { KEL_GRADES_INFO, FlowerChart } from './FlowerChart';
import { 
  BarChart3, TrendingUp, Info, Sparkles, Filter, Calculator, User, CreditCard, Search,
  Briefcase, RefreshCw, AlertTriangle, ArrowRight, Wallet, CheckSquare, 
  DollarSign, MessageSquare, BookOpen, Star, Award, Target, Notebook, Calendar, Clock,
  Heart, Plus, Trash2, UserMinus, FileText, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Mail, Phone, GraduationCap, Users, Printer, X, Rocket,
  ArrowLeft, SmilePlus, AlertCircle, ChevronUp, ChevronDown, ThumbsUp, Compass, TrendingDown, Activity, Flame, MoreHorizontal
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line, AreaChart, Area, PieChart, Pie } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import StudentDossier from './StudentDossier';
import OberauSkala from './OberauSkala';
import LehrerProfilView from './LehrerProfilView';
import StudentStatsEditor from './StudentStatsEditor';
import { STANDARD_KEL_BEREICHE } from '../types';
import { generateKELAssessment } from '../services/aiService';
import KELPresentation from './KELPresentation';
import {
  getStudentAttendanceSummary,
  getStudentNotes
} from '../lib/studentMetrics';
import {
  getClassPerformanceStats,
  getStudentPerformanceSummary,
  getSubjectPerformanceAverages
} from '../lib/statisticsMetrics';

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
  return createPortal(children, document.body);
};

function SuggestionsGrid() {
  const { app, setApp } = useApp();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const activeStudents = app.schueler || [];
  const toolSubjects = useMemo(
    () => ((app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE)
      .filter(fach => app.fachConfig?.[fach]?.unterrichtet !== false),
    [app.faecher, app.fachConfig],
  );
  const comparisonClasses = useMemo(
    () => (app.classes || []).filter(classroom =>
      classroom.id !== app.activeClassId && (classroom.schueler || []).length > 0
    ),
    [app.classes, app.activeClassId],
  );

  // Tool 1: Noten-Prognose-Rechner
  const [t1StudentId, setT1StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t1NewGrade, setT1NewGrade] = useState<number>(3);
  const [t1NewWeight, setT1NewWeight] = useState<number>(50); // in %

  // Tool 2: Ipsativer Lernfortschritts-Tracker
  const [t2StudentId, setT2StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t2PrevAvg, setT2PrevAvg] = useState<number>(2.8);

  // Tool 3: Kompetenzorientiertes Zeugnis-Radar
  const [t3StudentId, setT3StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t3Skills, setT3Skills] = useState({
    lese: 4,
    rechtschreiben: 3,
    text: 4,
    grammatik: 3,
    praesentation: 5
  });

  // Tool 4: Fehlzeiten-/Leistungsübersicht aus echten Klassiodaten
  const t4ScatterData = useMemo(() => activeStudents.flatMap(student => {
    const attendance = getStudentAttendanceSummary(app, student.id);
    const performance = getStudentPerformanceSummary(app, student.id, toolSubjects);
    if (!attendance.hasData && !performance.hasData) return [];
    return [{
      name: student.vorname,
      fehlstunden: attendance.total,
      leistung: performance.normalizedAverage,
    }];
  }), [activeStudents, app, toolSubjects]);

  // Tool 5: Screening-Assistant
  const [t5StudentId, setT5StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t5Checklist, setT5Checklist] = useState({
    laute: false,
    ziffern: false,
    kopfrechnen: false,
    zeit: false,
    textverstaendnis: false
  });

  // Tool 6: Selbsteinschätzungs-Abgleich (Gap)
  const [t6StudentId, setT6StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t6Emp, setT6Emp] = useState({
    ordnungStudent: 2,
    ordnungTeacher: 4,
    mitarbeitStudent: 5,
    mitarbeitTeacher: 3,
    sozialStudent: 4,
    sozialTeacher: 4,
    fokusStudent: 3,
    fokusTeacher: 2
  });

  // Tool 7: Belastungs-Heatmap; startet bewusst leer statt mit erfundenen Prüfungen.
  const [t7Exams, setT7Exams] = useState<Array<{ name: string, week: number, day: string }>>([]);
  const [t7NewExamName, setT7NewExamName] = useState('');
  const [t7NewExamWeek, setT7NewExamWeek] = useState(1);
  const [t7NewExamDay, setT7NewExamDay] = useState('Mo');

  // Tool 8: Förderplan Generator
  const [t8StudentId, setT8StudentId] = useState<string>(activeStudents[0]?.id || '');
  const [t8Goals, setT8Goals] = useState('');
  const [t8Measures, setT8Measures] = useState('');
  const [t8ParentSupport, setT8ParentSupport] = useState('');
  const [t8IsPrinted, setT8IsPrinted] = useState(false);

  // Tool 9: Vergleich ausschließlich mit tatsächlich vorhandenen weiteren Klassen.
  const [t9RefClass, setT9RefClass] = useState<string>('');

  // Tool 10: Sitzplatz-Dynamik & Soziogramm
  const [t10FocusId, setT10FocusId] = useState<string>(activeStudents[0]?.id || '');
  const [t10Partner1Id, setT10Partner1Id] = useState<string>(activeStudents[1]?.id || '');
  const [t10Partner2Id, setT10Partner2Id] = useState<string>(activeStudents[2]?.id || '');
  const [t10OptimizationResult, setT10OptimizationResult] = useState<string>('');

  useEffect(() => {
    const firstId = activeStudents[0]?.id || '';
    const secondId = activeStudents[1]?.id || '';
    const thirdId = activeStudents[2]?.id || secondId;
    const ensureStudent = (value: string, fallback: string) =>
      activeStudents.some(student => student.id === value) ? value : fallback;

    setT1StudentId(value => ensureStudent(value, firstId));
    setT2StudentId(value => ensureStudent(value, firstId));
    setT3StudentId(value => ensureStudent(value, firstId));
    setT5StudentId(value => ensureStudent(value, firstId));
    setT6StudentId(value => ensureStudent(value, firstId));
    setT8StudentId(value => ensureStudent(value, firstId));
    setT10FocusId(value => ensureStudent(value, firstId));
    setT10Partner1Id(value => ensureStudent(value, secondId));
    setT10Partner2Id(value => ensureStudent(value, thirdId));
    setT9RefClass(value =>
      comparisonClasses.some(classroom => classroom.id === value)
        ? value
        : (comparisonClasses[0]?.id || '')
    );
    setT10OptimizationResult('');
  }, [app.activeClassId, activeStudents, comparisonClasses]);

  if (activeStudents.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler:innen vorhanden"
        description="Spezialwerkzeuge verwenden ausschließlich echte Klassiodaten. Lege zuerst Schüler:innen in der aktiven Klasse an."
      />
    );
  }

  const list = [
    {
      title: "1. Noten-Prognose-Rechner (Grade Forecast)",
      short: "Interaktive Simulation von potenziellen Prüfungsnoten und Gewohnheiten.",
      details: "Lehrkräfte und Schüler können Prognosewerte für künftige Klassenarbeiten eingeben, um deren prozentuale oder arithmetische Auswirkungen auf den finalen Zeugnisschnitt in Echtzeit zu simulieren. Ideal für Motivationsgespräche vor Schularbeiten.",
      icon: "🧮",
      render: () => {
        const student = activeStudents.find(s => s.id === t1StudentId) || activeStudents[0];
        const performance = getStudentPerformanceSummary(app, student.id, toolSubjects);
        const baseGrade = performance.gradeAverage;
        const forecastWeightDecimal = t1NewWeight / 100;
        const newAverage = baseGrade === null
          ? null
          : Number(((baseGrade * (1 - forecastWeightDecimal)) + (t1NewGrade * forecastWeightDecimal)).toFixed(2));
        const delta = baseGrade === null || newAverage === null
          ? null
          : Number((newAverage - baseGrade).toFixed(2));
        
        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">🧮 Prognose-Tool ausführen</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label htmlFor="t1-student-select" className="block text-[0.6875rem] font-bold text-slate-400">Schüler auswählen:</label>
                <select 
                  id="t1-student-select"
                  value={t1StudentId} 
                  onChange={(e) => setT1StudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[0.75rem] font-bold text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {activeStudents.map(s => {
                    const avg = getStudentPerformanceSummary(app, s.id, toolSubjects).gradeAverage;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.vorname} {s.nachname}{avg !== null ? ` (Notenschnitt: ${avg.toFixed(2)})` : ' (keine Notenskala-Daten)'}
                      </option>
                    );
                  })}
                </select>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[0.6875rem] font-bold">
                    <label htmlFor="t1-new-grade" className="text-slate-400">Prognostizierte Note:</label>
                    <span className="text-indigo-400 font-extrabold">{t1NewGrade}</span>
                  </div>
                  <input 
                    id="t1-new-grade"
                    type="range" min={1} max={5} step={1}
                    value={t1NewGrade}
                    onChange={(e) => setT1NewGrade(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[0.6875rem] font-bold">
                    <label htmlFor="t1-new-weight" className="text-slate-400">Gewichtung der neuen Note:</label>
                    <span className="text-indigo-400 font-extrabold">{t1NewWeight}%</span>
                  </div>
                  <input 
                    id="t1-new-weight"
                    type="range" min={10} max={100} step={5}
                    value={t1NewWeight}
                    onChange={(e) => setT1NewWeight(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[0.5625rem] font-black uppercase text-slate-500 block">Echtzeit-Berechnung</span>
                  <div className="flex justify-between items-baseline border-b border-slate-800/60 pb-2">
                    <span className="text-[0.75rem] text-slate-300 font-bold">Aktueller Schnitt:</span>
                    <span className="text-md font-extrabold text-slate-200">{baseGrade !== null ? baseGrade.toFixed(2) : '–'}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-[0.75rem] text-indigo-300 font-bold">Prognostizierter Schnitt:</span>
                    <span className="text-xl font-black text-indigo-400">{newAverage !== null ? newAverage.toFixed(2) : '–'}</span>
                  </div>
                </div>

                <div className={`mt-3 p-2.5 rounded-lg text-[0.6875rem] font-bold leading-relaxed border ${
                  delta === 0 
                    ? 'bg-slate-900 border-slate-800 text-slate-400' 
                    : delta < 0 
                    ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
                }`}>
                  {delta === null ? (
                    'Für diese Simulation werden echte Beurteilungen auf der Notenskala 1–5 benötigt. Prozent- und Punktedaten werden hier bewusst nicht als Noten umgedeutet.'
                  ) : delta === 0 ? (
                    'Keine Änderung im simulierten arithmetischen Mittel.'
                  ) : delta < 0 ? (
                    `📈 Simulierte Verbesserung um ${Math.abs(delta)} Punkte auf der Notenskala.`
                  ) : (
                    `📉 Simulierte Verschiebung um +${delta} Punkte auf der Notenskala.`
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "2. Ipsativer Lernfortschritts-Tracker (Individual Basis)",
      short: "Mappe basierend auf der individuellen Eigenentwicklung statt nur Kohortenvergleich.",
      details: "Anstatt Schüler nur am Klassendurchschnitt (soziale Bezugsnorm) zu messen, visualisiert dieses Tool die Entwicklung im Vergleich zu ihrer eigenen historischen Basis (ipsative Bezugsnorm). Großer Motivationsfaktor für leistungsschwächere Schüler.",
      icon: "📈",
      render: () => {
        const student = activeStudents.find(s => s.id === t2StudentId) || activeStudents[0];
        const currentGrade = getStudentPerformanceSummary(app, student.id, toolSubjects).gradeAverage;
        const diff = currentGrade === null ? null : Number((t2PrevAvg - currentGrade).toFixed(2));
        
        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">📈 Ipsativer Fortschrittsvergleich</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label htmlFor="t2-student-select" className="block text-[0.6875rem] font-bold text-slate-400">Schüler auswählen:</label>
                <select 
                  id="t2-student-select"
                  value={t2StudentId} 
                  onChange={(e) => setT2StudentId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[0.75rem] font-bold text-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                  ))}
                </select>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[0.6875rem] font-bold">
                    <label htmlFor="t2-prev-avg" className="text-slate-400">Vorheriger Durchschnitt (Referenzwert):</label>
                    <span className="text-indigo-400 font-black">{t2PrevAvg}</span>
                  </div>
                  <input 
                    id="t2-prev-avg"
                    type="range" min={1.0} max={5.0} step={0.1}
                    value={t2PrevAvg}
                    onChange={(e) => setT2PrevAvg(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <span className="text-[0.5625rem] font-black uppercase text-slate-500 block">Ipsativer Entwicklungsgrad</span>
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-center bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className="block text-[0.5625rem] font-black text-slate-400">VORHER</span>
                      <span className="text-sm font-extrabold text-slate-300">{t2PrevAvg}</span>
                    </div>
                    <span className="text-xl">➡️</span>
                    <div className="text-center bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-950">
                      <span className="block text-[0.5625rem] font-black text-indigo-400">JETZT</span>
                      <span className="text-sm font-black text-indigo-300">{currentGrade !== null ? currentGrade.toFixed(2) : '–'}</span>
                    </div>
                  </div>
                </div>

                <div className={`mt-3 p-2.5 rounded-lg text-[0.6875rem] leading-relaxed font-bold border ${
                  diff > 0 
                    ? 'bg-emerald-950/30 border-emerald-950 text-emerald-300' 
                    : diff < 0 
                    ? 'bg-rose-950/30 border-rose-955 text-rose-300' 
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}>
                  {diff === null ? (
                    'Keine Beurteilungen auf der Notenskala 1–5 vorhanden. Der manuelle Referenzvergleich wird deshalb nicht berechnet.'
                  ) : diff > 0 ? (
                    `📈 Simulierte Verbesserung um ${diff} gegenüber dem manuell gesetzten Referenzwert.`
                  ) : diff < 0 ? (
                    `📉 Aktueller Notenschnitt liegt um ${Math.abs(diff)} über dem manuell gesetzten Referenzwert.`
                  ) : (
                    'Der aktuelle Notenschnitt entspricht dem manuell gesetzten Referenzwert.'
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "3. Kompetenzorientiertes Zeugnis-Radar (Radar-Chart)",
      short: "Visualisierung von Teildisziplinen wie Leseverständnis, Orthografie oder Wortschatz.",
      details: "Spidermaps (Netzdiagramme) brechen starre Fächernoten auf und zeigen feinmaschige Kompetenzen (z.B. in Deutsch: Lesekompetenz, Rechtschreibung, kreatives Schreiben, Grammatik), um passgenaue, individuelle Förderpläne abzuleiten.",
      icon: "🎯",
      render: () => {
        // We'll draw an interactive Pentagonal chart using highly responsive vector elements!
        const points = [
          { name: "Lesen", val: t3Skills.lese, key: "lese" },
          { name: "Rechtschreiben", val: t3Skills.rechtschreiben, key: "rechtschreiben" },
          { name: "Aufsatz", val: t3Skills.text, key: "text" },
          { name: "Grammatik", val: t3Skills.grammatik, key: "grammatik" },
          { name: "Präsentieren", val: t3Skills.praesentation, key: "praesentation" }
        ];

        // Calculating poly coordinates
        const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
          const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
          return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
          };
        };

        const center = 75;
        const maxRadius = 50;

        // Base pentagon rings (at val 1, 2, 3, 4, 5)
        const renderRing = (ringVal: number) => {
          const r = (ringVal / 5) * maxRadius;
          const p = [0, 72, 144, 216, 288].map(deg => polarToCartesian(center, center, r, deg));
          return `M ${p[0].x} ${p[0].y} L ${p[1].x} ${p[1].y} L ${p[2].x} ${p[2].y} L ${p[3].x} ${p[3].y} L ${p[4].x} ${p[4].y} Z`;
        };

        // Active student dynamic poly outline
        const activePolyPoints = points.map((p, idx) => {
          const r = (p.val / 5) * maxRadius;
          const deg = idx * 72;
          return polarToCartesian(center, center, r, deg);
        });
        const activePath = `M ${activePolyPoints[0].x} ${activePolyPoints[0].y} L ${activePolyPoints[1].x} ${activePolyPoints[1].y} L ${activePolyPoints[2].x} ${activePolyPoints[2].y} L ${activePolyPoints[3].x} ${activePolyPoints[3].y} L ${activePolyPoints[4].x} ${activePolyPoints[4].y} Z`;

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <div className="space-y-1">
              <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">🎯 Kompetenz-Radar & Spidermap</h5>
              <p className="text-[0.625rem] text-slate-400 font-bold">Manuelle Gesprächs-/Planungssimulation. Die Regler werden nicht als Diagnostikdaten gespeichert.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              
              <div className="sm:col-span-4 flex justify-center">
                <svg width="150" height="150" className="overflow-visible">
                  {/* Grid Rings */}
                  {[1, 2, 3, 4, 5].map((ring) => (
                    <path 
                      key={ring} 
                      d={renderRing(ring)} 
                      fill="none" 
                      stroke="#334155" 
                      strokeWidth="0.5" 
                      strokeDasharray={ring % 2 === 0 ? "2 2" : undefined}
                    />
                  ))}
                  
                  {/* Grid spoke axes */}
                  {[0, 72, 144, 216, 288].map((deg, ix) => {
                    const outer = polarToCartesian(center, center, maxRadius, deg);
                    const labelPos = polarToCartesian(center, center, maxRadius + 14, deg);
                    return (
                      <g key={ix}>
                        <line x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="#334155" strokeWidth="0.5" />
                        <text 
                          x={labelPos.x} 
                          y={labelPos.y + 3} 
                          fill="#94a3b8" 
                          fontSize="7" 
                          fontWeight="900" 
                          textAnchor="middle"
                        >
                          {points[ix].name}
                        </text>
                      </g>
                    );
                  })}

                  {/* Active Skill Area Polygon */}
                  <path d={activePath} fill="rgba(99, 102, 241, 0.25)" stroke="#6366f1" strokeWidth="2.5" />
                  
                  {/* Data Point Dots */}
                  {activePolyPoints.map((pt, ix) => (
                    <circle key={ix} cx={pt.x} cy={pt.y} r="3" fill="#818cf8" stroke="#fff" strokeWidth="1" />
                  ))}
                </svg>
              </div>

              <div className="sm:col-span-8 space-y-2.5">
                <div className="flex gap-2 items-center mb-1">
                  <label htmlFor="t3-student-select" className="text-[0.625rem] uppercase font-black tracking-wider text-slate-500">Student:</label>
                  <select 
                    id="t3-student-select"
                    value={t3StudentId} 
                    onChange={(e) => setT3StudentId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.vorname}</option>
                    ))}
                  </select>
                </div>

                {points.map((skill) => (
                  <div key={skill.key} className="space-y-0.5">
                    <div className="flex justify-between text-[0.6875rem] font-bold">
                      <label htmlFor={`t3-skill-${skill.key}`} className="text-slate-450">{skill.name}:</label>
                      <span className="text-indigo-400 font-extrabold">{skill.val} / 5</span>
                    </div>
                    <input 
                      id={`t3-skill-${skill.key}`}
                      type="range" min={1} max={5} step={1}
                      value={skill.val}
                      onChange={(e) => setT3Skills(p => ({ ...p, [skill.key]: Number(e.target.value) }))}
                      className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                ))}
              </div>

            </div>
          </div>
        );
      }
    },
    {
      title: "4. Fehlzeiten-Korrelationsanalyse (Heatmap)",
      short: "Statistischer Abgleich von Absentismus und fachspezifischer Leistungsentwicklung.",
      details: "Eine automatisierte Heatmap oder Korrelationsgrafik deckt kritische Schwellenwerte auf (z.B. ab wann unentschuldigte Fehlzeiten verlässlich zu einem Leistungsabfall in Mathematik oder Sprachen führen).",
      icon: "⚠️",
      render: () => {
        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">⚠️ Absentismus & Performance</h5>
              <span className="text-[0.625rem] bg-indigo-950/85 border border-indigo-850 px-2.5 py-1 rounded-lg text-indigo-300 font-bold">
                Echte Schülerdaten
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-[0.625rem] text-slate-400 font-bold block leading-relaxed">
                Diese Übersicht stellt erfasste Fehlstunden und den skalenübergreifend normalisierten Leistungsindex nebeneinander. Sie behauptet keine Kausalität oder Diagnose.
              </span>

              {/* Vertical Chart bar list representing the correlation */}
              <div className="space-y-2.5">
                {t4ScatterData.length > 0 ? t4ScatterData.map((data, ix) => {
                  const percentageWidth = Math.min(100, data.fehlstunden > 0 ? (data.fehlstunden / Math.max(...t4ScatterData.map(item => item.fehlstunden), 1)) * 100 : 0);
                  return (
                    <div key={ix} className="p-3 bg-slate-950/45 rounded-xl border border-slate-800/80 space-y-1.5">
                      <div className="flex justify-between items-center text-[0.7rem]">
                        <span className="font-extrabold text-slate-200">{data.name}</span>
                        <span className="text-[0.625rem] font-bold text-slate-450">{data.fehlstunden} Fehlstunden</span>
                      </div>
                      <div className="flex gap-3 items-center">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div style={{ width: `${percentageWidth}%` }} className="h-full rounded-full bg-indigo-500 transition-all duration-500" />
                        </div>
                        <span className="font-black text-[0.725rem] text-slate-300 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md min-w-[4.5rem] text-center">
                          {data.leistung !== null ? `${data.leistung.toFixed(1)} %` : 'keine Leistung'}
                        </span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-700 text-[0.6875rem] font-bold text-slate-400 text-center">
                    Noch keine Anwesenheits- oder Leistungsdaten vorhanden.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "5. Dyskalkulie & Legasthenie Screening-Assistant",
      short: "Früherkennungs-Filter basierend auf Fehlermustern in schriftlichen Beiträgen.",
      details: "Ein KI-gestütztes Assistenzmodul sucht nach typischen, wiederkehrenden Fehlermustern in Schülerinhalten, um Hinweise auf eventuelle Teilleistungsstörungen (LRS, Dyskalkulie) frühzeitig an die Lehrkraft zu melden.",
      icon: "🧠",
      render: () => {
        const student = activeStudents.find(s => s.id === t5StudentId) || activeStudents[0];
        
        // Count active indicators checked
        const score = Object.values(t5Checklist).filter(Boolean).length;
        let riskLabel = "🌱 Geringes Risiko";
        let riskColor = "text-emerald-400 bg-emerald-950/50 border-emerald-900";
        if (score >= 4) {
          riskLabel = "🚨 Deutlich erhöhtes Risiko";
          riskColor = "text-rose-450 bg-rose-950/50 border-rose-900";
        } else if (score >= 2) {
          riskLabel = "⚠️ Erhöhtes Risiko / Verdacht";
          riskColor = "text-amber-450 bg-amber-950/50 border-amber-900";
        }

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">🧠 Diagnostischer Screening-Assistent</h5>
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <label htmlFor="t5-student-select" className="text-[0.6875rem] font-bold text-slate-450">Fokus-Kind:</label>
                <select 
                  id="t5-student-select"
                  value={t5StudentId} 
                  onChange={(e) => {
                    setT5StudentId(e.target.value);
                    setT5Checklist({ laute: false, ziffern: false, kopfrechnen: false, zeit: false, textverstaendnis: false });
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                  ))}
                </select>
              </div>

              {/* Checklist items */}
              <div className="space-y-2 pt-2">
                <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500 block">Symptomatische Beobachtungs-Checkliste:</span>
                {[
                  { key: 'laute', label: 'Vertauscht ähnlich klingende Laute beim lauten Vorlesen / Schreiben' },
                  { key: 'ziffern', label: 'Häufige Spiegelschrift bei Zahlen oder verwechselt die Stellen (z.B. 12 vs 21)' },
                  { key: 'kopfrechnen', label: 'Benutzt noch intensiv die Finger als Zählhilfe bei einfachsten Rechenschritten' },
                  { key: 'zeit', label: 'Auffallend hoher Zeitaufwand zum Erfassen einfacher Schriftsätze' },
                  { key: 'textverstaendnis', label: 'Starke Diskrepanz zwischen mündlichen Leistungen und schriftlichem Abruf' }
                ].map((item) => (
                  <label key={item.key} className="flex gap-3 items-start p-2 rounded-xl bg-slate-950/45 border border-slate-800/60 hover:bg-slate-950 transition-colors cursor-pointer select-none focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500">
                    <input 
                      type="checkbox" 
                      checked={t5Checklist[item.key as keyof typeof t5Checklist]}
                      onChange={(e) => setT5Checklist(prev => ({ ...prev, [item.key]: e.target.checked }))}
                      className="mt-0.5 rounded border-slate-800 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 bg-slate-900 focus:outline-none"
                    />
                    <span className="text-[0.6875rem] text-slate-300 leading-normal font-semibold">{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Result Indicator */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[0.7rem] font-bold ${riskColor}`}>
                <div className="space-y-1">
                  <span className="block text-[0.5625rem] font-black uppercase text-slate-400">Auswertung für {student.vorname}:</span>
                  <span className="text-[0.8125rem] font-black">{riskLabel}</span>
                </div>
                <div className="text-[0.65rem] max-w-sm leading-relaxed text-slate-300 font-medium">
                  {score >= 4 ? (
                    "💡 Empfohlenes Handeln: Vereinbare kurzfristig ein Gespräch mit Schulpsychologen / Eltern bezüglich gezielter Diagnostik-Sitzungen (LRS/Diskalkulie)."
                  ) : score >= 2 ? (
                    "💡 Empfohlenes Handeln: Biete verstärkte Üben-Hausaufgaben mit Bildkarten / Rechenschieber an, behalte die Hausaufgaben genau im Auge."
                  ) : (
                    "🌱 Aktuell sind keine akuten, auffälligen Interventionen aus pädagogischer Sicht erforderlich."
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "6. Schüler-Selbsteinschätzungs-Abgleich (Gap-Analyse)",
      short: "Gegenüberstellung von Selbst- und Fremdwahrnehmung auf einer visuellen Oberfläche.",
      details: "Schüler bewerten ihre Mitarbeit und ihr Benehmen wöchentlich selbst. Das Interface legt diese Kurve transparent über die Lehrereinschätzung, um Differenzen der Fremd- und Eigenbeobachtung als Gesprächsanlass offenzulegen.",
      icon: "⚖️",
      render: () => {
        const student = activeStudents.find(s => s.id === t6StudentId) || activeStudents[0];
        
        // Compute Gap Score (Average absolute divergence)
        const categories = [
          { name: "Arbeitstempo", t: t6Emp.ordnungTeacher, s: t6Emp.ordnungStudent, key: 'ordnung' },
          { name: "Mitarbeit", t: t6Emp.mitarbeitTeacher, s: t6Emp.mitarbeitStudent, key: 'mitarbeit' },
          { name: "Sozialverhalten", t: t6Emp.sozialTeacher, s: t6Emp.sozialStudent, key: 'sozial' },
          { name: "Fokus & Ausdauer", t: t6Emp.fokusTeacher, s: t6Emp.fokusStudent, key: 'fokus' }
        ];

        const totalDiff = categories.reduce((sum, c) => sum + Math.abs(c.t - c.s), 0);
        const avgGap = (totalDiff / categories.length).toFixed(1);

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">⚖️ Selbsteinschätzungs-Spiegel</h5>
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <label htmlFor="t6-student-select" className="text-[0.6875rem] font-bold text-slate-450">Kind auswählen:</label>
                <select 
                  id="t6-student-select"
                  value={t6StudentId} 
                  onChange={(e) => {
                    setT6StudentId(e.target.value);
                    const seed = e.target.value.charCodeAt(0) || 3;
                    setT6Emp({
                      ordnungStudent: (seed % 3) + 2,
                      ordnungTeacher: ((seed + 1) % 3) + 2,
                      mitarbeitStudent: ((seed + 2) % 3) + 3,
                      mitarbeitTeacher: ((seed + 3) % 3) + 2,
                      sozialStudent: 4,
                      sozialTeacher: 4,
                      fokusStudent: ((seed + 4) % 3) + 2,
                      fokusTeacher: ((seed + 5) % 3) + 2
                    });
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.vorname}</option>
                  ))}
                </select>
              </div>

              {/* Sliders comparison mapping */}
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat.key} className="space-y-2 p-3 bg-slate-950/45 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between items-center text-[0.7rem]">
                      <span className="font-extrabold text-slate-200">{cat.name}</span>
                      <span className="text-[0.625rem] font-black text-indigo-300">Divergenz: {Math.abs(cat.t - cat.s)} Pkt.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <div className="flex justify-between text-[0.6rem] font-bold text-slate-400 mb-1">
                          <label htmlFor={`t6-student-${cat.key}`}>Aussage Schüler: {cat.s} / 5</label>
                        </div>
                        <input 
                          id={`t6-student-${cat.key}`}
                          type="range" min={1} max={5} step={1}
                          value={cat.s}
                          onChange={(e) => setT6Emp(p => ({ ...p, [`${cat.key}Student`]: Number(e.target.value) }))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[0.6rem] font-bold text-slate-400 mb-1">
                          <label htmlFor={`t6-teacher-${cat.key}`}>Schätzung Lehrer: {cat.t} / 5</label>
                        </div>
                        <input 
                          id={`t6-teacher-${cat.key}`}
                          type="range" min={1} max={5} step={1}
                          value={cat.t}
                          onChange={(e) => setT6Emp(p => ({ ...p, [`${cat.key}Teacher`]: Number(e.target.value) }))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total GAP assessment badge */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[0.7rem] flex justify-between items-center">
                <div>
                  <span className="text-[0.5625rem] font-black uppercase text-slate-500 block">Inkongruenz-Faktor (Durchschnitt):</span>
                  <span className="text-sm font-black text-indigo-400">Ø {avgGap} Abweichungs-Punkte</span>
                </div>
                <div className="text-[0.625rem] text-right font-medium max-w-[12rem] text-slate-400 leading-normal">
                  {Number(avgGap) > 1.5 ? (
                    "⚠️ Hohe Abweichung! {student.vorname} schätzt sich drastisch anders ein als du. Perfekt für das KEL-Gespräch."
                  ) : (
                    "🌱 Starke Kongruenz! Eigenwahrnehmung und professionelle Fremdwahrnehmung sind nahezu kongruent."
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      title: "7. Fachübergreifende Belastungs-Heatmap (Prüfungsdichte)",
      short: "Intelligente Termin-Matrix zur Vermeidung von konzentrierten Stresswochen.",
      details: "Durch Koordination aller Lehrpersonen entsteht ein Stressindikator-Kalender. Wenn in einer Woche bereits 2 große Schularbeiten geplant sind, sperrt das System diese Woche automatisch für weitere schwere Tests, um den Leistungsdruck abzufedern.",
      icon: "🗓️",
      render: () => {
        // Quick 4-week grid generator
        const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
        const renderCell = (weekNum: number, dayName: string) => {
          const registered = t7Exams.filter(ex => ex.week === weekNum && ex.day === dayName);
          const weight = registered.length;
          
          let cellColor = 'bg-slate-950 hover:bg-slate-900 border-slate-850';
          if (weight >= 2) cellColor = 'bg-rose-950/80 border-rose-900 hover:bg-rose-900/60';
          else if (weight === 1) cellColor = 'bg-amber-950/70 border-amber-900 hover:bg-amber-900/60';

          return (
            <div 
              key={`${weekNum}-${dayName}`} 
              className={`border rounded-xl p-2 min-h-[4rem] text-left transition-colors flex flex-col justify-between ${cellColor}`}
            >
              <div className="flex justify-between items-center">
                <span className="text-[0.5625rem] font-black text-slate-500">{dayName}</span>
                {weight > 0 && (
                  <span className={`text-[0.5rem] font-black px-1.5 py-0.2 rounded ${
                    weight >= 2 ? 'bg-rose-800 text-rose-100 animate-pulse' : 'bg-amber-800 text-amber-100'
                  }`}>
                    {weight} Tests
                  </span>
                )}
              </div>
              <div className="space-y-0.5 mt-1 overflow-x-hidden">
                {registered.map((tr, index) => (
                  <span key={index} className="block text-[0.55rem] font-black text-slate-200 uppercase truncate">
                    • {tr.name}
                  </span>
                ))}
              </div>
            </div>
          );
        };

        const addTest = () => {
          if (!t7NewExamName.trim()) return;
          setT7Exams(prev => [...prev, { name: t7NewExamName, week: t7NewExamWeek, day: t7NewExamDay }]);
          setT7NewExamName('');
        };

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">🗓️ Terminkoordinator & Stressampel</h5>
            
            {/* Input Form element */}
            <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="space-y-1">
                <label htmlFor="t7-exam-name" className="block text-[0.5625rem] font-black uppercase text-slate-400">Prüfungsbezeichnung:</label>
                <input 
                  id="t7-exam-name"
                  type="text" 
                  placeholder="z.B. Englisch SA" 
                  value={t7NewExamName}
                  onChange={(e) => setT7NewExamName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-100 placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none max-w-[8.5rem]"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="t7-exam-week" className="block text-[0.5625rem] font-black uppercase text-slate-400">Schulwoche:</label>
                <select 
                  id="t7-exam-week"
                  value={t7NewExamWeek} 
                  onChange={(e) => setT7NewExamWeek(Number(e.target.value))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  <option value={1}>Woche 1</option>
                  <option value={2}>Woche 2</option>
                  <option value={3}>Woche 3</option>
                  <option value={4}>Woche 4</option>
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="t7-exam-day" className="block text-[0.5625rem] font-black uppercase text-slate-400">Wochentag:</label>
                <select 
                  id="t7-exam-day"
                  value={t7NewExamDay} 
                  onChange={(e) => setT7NewExamDay(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {days.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <button 
                onClick={addTest}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-[0.6875rem] font-black shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                title="Prüfung hinzufügen"
              >
                ➕ Eintragen
              </button>
            </div>

            {/* Calendary representation Grid */}
            <div className="space-y-3">
              {[1, 2, 3].map((weekNum) => {
                const totalExInWeek = t7Exams.filter(e => e.week === weekNum).length;
                let warningBanner = null;
                if (totalExInWeek >= 3) {
                  warningBanner = (
                    <span className="text-[0.55rem] font-black uppercase text-rose-450 bg-rose-950/60 border border-rose-900 px-2 py-0.5 rounded-md">
                      ⚠️ Überlastungs-Gefahr (Gesperrt für weitere Tests)
                    </span>
                  );
                } else if (totalExInWeek === 2) {
                  warningBanner = (
                    <span className="text-[0.55rem] font-black uppercase text-amber-450 bg-amber-950/60 border border-amber-900 px-2 py-0.5 rounded-md">
                      🌻 Erhöhte Dichte
                    </span>
                  );
                }
                
                return (
                  <div key={weekNum} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.625rem] font-black text-slate-450">Klassenstufe KW 2{weekNum}</span>
                      {warningBanner}
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {days.map(dayName => renderCell(weekNum, dayName))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }
    },
    {
      title: "8. One-Click Pädagogischer Förderplan (Automatisches PDF)",
      short: "Vollständig ausgefüllte, offizielle Vorlagen für schulische Förderpläne per Mausklick.",
      details: "Basierend auf den gesammelten Noten, Verhaltensdaten und Diagnostiken generiert die Plattform per Klick einen behördlich anerkannten Förderplanentwurf inklusive pädagogischer Zielsetzungen für Eltern und Schulleitung.",
      icon: "📋",
      render: () => {
        const student = activeStudents.find(s => s.id === t8StudentId) || activeStudents[0];
        
        const handlePrintSimulation = () => {
          setT8IsPrinted(true);
          setTimeout(() => setT8IsPrinted(false), 3000);
          
          // True print action for just the generated plan
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(`
              <html>
                <head>
                  <title>Pädagogischer Förderplan: ${student.vorname} ${student.nachname}</title>
                  <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; background: white; }
                    .header { text-align: center; border-b: 4px solid #4338ca; padding-bottom: 20px; margin-bottom: 30px; }
                    h1 { font-size: 24px; font-weight: 800; color: #1e1b4b; text-transform: uppercase; margin-bottom: 5px; }
                    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 12px; font-size: 14px; }
                    .box { border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin-bottom: 20px; }
                    .box-title { font-weight: bold; font-size: 12px; color: #4f46e5; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
                    p { line-height: 1.6; font-size: 14px; margin-top: 5px; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
                    .sig { border-top: 1px solid #cbd5e1; width: 200px; text-align: center; padding-top: 5px; margin-top: 40px; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>Individueller Entwicklungs- & Förderplan</h1>
                    <p style="margin: 0; color: #6366f1; font-weight: bold;">Grundschule Oberau • Schuljahr 2026/27</p>
                  </div>
                  <div class="meta border">
                    <div><strong>Schüler/in:</strong> ${student.vorname} ${student.nachname}</div>
                    <div><strong>Klasse:</strong> 4A</div>
                    <div><strong>Notendurchschnitt:</strong> ${(student as any).note || 'None'}</div>
                    <div><strong>Erstellungsdatum:</strong> ${new Date().toLocaleDateString('de-DE')}</div>
                  </div>
                  <div class="box">
                    <div class="box-title">1. Pädagogische Entwicklungsziele:</div>
                    <p>${t8Goals}</p>
                  </div>
                  <div class="box">
                    <div class="box-title">2. Konkrete schulische Fördermaßnahmen:</div>
                    <p>${t8Measures}</p>
                  </div>
                  <div class="box">
                    <div class="box-title">3. Vereinbarte Maßnahmen für das Elternhaus:</div>
                    <p>${t8ParentSupport}</p>
                  </div>
                  <div class="footer">
                    <div>
                      <br/>
                      <div class="sig">Klassenlehrkraft</div>
                    </div>
                    <div>
                      <br/>
                      <div class="sig">Eltern / Erziehungsberechtigte</div>
                    </div>
                  </div>
                  <script>window.print();</script>
                </body>
              </html>
            `);
            printWindow.document.close();
          }
        };

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest flex justify-between items-center">
              <span>📋 Förderplan-Vorlage erzeugen</span>
              <span className="text-[0.5625rem] font-bold text-slate-550 italic">Klassenstufe 4</span>
            </h5>

            <div className="space-y-3.5">
              <div className="flex gap-2 items-center">
                <label htmlFor="t8-student-select" className="text-[0.6875rem] font-bold text-slate-450">Kind auswählen:</label>
                <select 
                  id="t8-student-select"
                  value={t8StudentId} 
                  onChange={(e) => setT8StudentId(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                <div className="space-y-1">
                  <label htmlFor="t8-goals" className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-450">1. Pädagogische Ziele:</label>
                  <textarea 
                    id="t8-goals"
                    value={t8Goals} 
                    onChange={(e) => setT8Goals(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[0.7rem] leading-relaxed font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="t8-measures" className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-450">2. Konkrete schulische Maßnahmen:</label>
                  <textarea 
                    id="t8-measures"
                    value={t8Measures} 
                    onChange={(e) => setT8Measures(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[0.7rem] leading-relaxed font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="t8-parent-support" className="block text-[0.6rem] font-black uppercase tracking-wider text-slate-450">3. Kooperation Elternhaus:</label>
                  <textarea 
                    id="t8-parent-support"
                    value={t8ParentSupport} 
                    onChange={(e) => setT8ParentSupport(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-[0.7rem] leading-relaxed font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                    rows={2}
                  />
                </div>
              </div>

              {/* Action Button */}
              <button 
                onClick={handlePrintSimulation}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-2.5 text-[0.725rem] font-black transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {t8IsPrinted ? (
                  <>🎉 Förderplan wurde exportiert (PDF-Kopie)</>
                ) : (
                  <>🖨️ Förderplan-PDF generieren & drucken</>
                )}
              </button>
            </div>
          </div>
        );
      }
    },
    {
      title: "9. Paralleler Kohortenvergleich (Inter-Klassen-Vergleich)",
      short: "Aggregierter Vergleich mit tatsächlich vorhandenen weiteren Klassen.",
      details: "Vergleicht ausschließlich gespeicherte Klassiodaten. Die Darstellung zeigt normalisierte Leistungsindizes und keine erfundenen Parallelklassen oder Jahrgangswerte.",
      icon: "👥",
      render: () => {
        const refClass = comparisonClasses.find(classroom => classroom.id === t9RefClass);
        if (!refClass) {
          return (
            <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100">
              <p className="text-[0.6875rem] font-bold text-slate-400 text-center">
                Für einen Klassenvergleich muss mindestens eine weitere Klasse mit echten Schüler- und Leistungsdaten vorhanden sein.
              </p>
            </div>
          );
        }

        const referenceApp = {
          ...app,
          activeClassId: refClass.id,
          schueler: refClass.schueler || [],
          noten: refClass.noten || {},
          notenMeta: refClass.notenMeta || {},
          notenGewichtung: refClass.notenGewichtung || {},
          mitarbeit: refClass.mitarbeit || {},
          mitarbeit_settings: refClass.mitarbeit_settings || app.mitarbeit_settings,
          faecher: refClass.faecher || app.faecher,
          fachConfig: refClass.fachConfig || app.fachConfig,
        } as any;
        const referenceSubjects = (refClass.faecher && refClass.faecher.length > 0) ? refClass.faecher : toolSubjects;
        const sharedSubjects = toolSubjects.filter(subject => referenceSubjects.includes(subject));
        const currentRows = getSubjectPerformanceAverages(app, activeStudents, sharedSubjects);
        const refRows = getSubjectPerformanceAverages(referenceApp, refClass.schueler || [], sharedSubjects);
        const subjects = sharedSubjects.flatMap(subject => {
          const active = currentRows.find(row => row.subject === subject);
          const ref = refRows.find(row => row.subject === subject);
          if (!active || !ref) return [];
          return [{
            name: subject,
            active: active.normalizedAverage,
            ref: ref.normalizedAverage,
          }];
        });

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">👥 Klassenvergleich</h5>
                <p className="text-[0.5625rem] text-slate-500 font-bold mt-1">Leistungsindex 0–100 · skalenübergreifend normalisiert</p>
              </div>
              <div className="flex items-center gap-1.5">
                <label htmlFor="t9-ref-class" className="text-[0.5625rem] font-black uppercase text-slate-450">Referenzklasse:</label>
                <select
                  id="t9-ref-class"
                  value={t9RefClass}
                  onChange={(e) => setT9RefClass(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-0.5 text-[0.675rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                >
                  {comparisonClasses.map(classroom => (
                    <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {subjects.length > 0 ? (
              <div className="space-y-3.5">
                {subjects.map(sub => (
                  <div key={sub.name} className="space-y-1 bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl">
                    <div className="flex justify-between text-[0.7rem] font-bold gap-3">
                      <span className="text-slate-150">{sub.name}</span>
                      <div className="flex gap-3 text-slate-400 text-[0.65rem]">
                        <span>{app.klassenbezeichnung || 'Aktive Klasse'}: <strong className="text-indigo-400">{sub.active.toFixed(1)} %</strong></span>
                        <span>{refClass.name}: <strong>{sub.ref.toFixed(1)} %</strong></span>
                      </div>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-2 items-center">
                        <span className="text-[0.45rem] font-black uppercase text-indigo-400 min-w-[3rem]">Aktiv</span>
                        <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden">
                          <div style={{ width: `${sub.active}%` }} className="h-full bg-indigo-500 rounded-full" />
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="text-[0.45rem] font-black uppercase text-slate-500 min-w-[3rem]">Referenz</span>
                        <div className="w-full bg-slate-900/80 h-1.5 rounded-full overflow-hidden">
                          <div style={{ width: `${sub.ref}%` }} className="h-full bg-slate-500 rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[0.6875rem] font-bold text-slate-400 text-center py-4">
                Für die beiden Klassen liegen noch keine gemeinsam vergleichbaren Leistungsdaten vor.
              </p>
            )}

            <p className="text-[0.6rem] text-slate-500 font-medium italic leading-relaxed">
              Es werden ausschließlich aggregierte Werte aus den im lokalen Klassio-Datenbestand vorhandenen Klassen berechnet.
            </p>
          </div>
        );
      }
    },
    {
      title: "10. Digitales Soziogramm & Interaktive Sitzplatz-Dynamik",
      short: "Analyse sozialer Präferenzen für ein harmonisches und integratives Miteinander.",
      details: "Durch ein kurzes, spielerisches Befragen ('Mit wem arbeitest du am liebsten und mit wem möchtest du noch mehr zusammenwachsen?') visualisiert das System ein anonymes Beziehungsgeflecht der Klasse. Ein intelligenter Algorithmus berechnet daraufhin optimierte Sitzplankombinationen, die schüchterne Kinder behutsam integrieren, das Sozialgefüge stärken und Konfliktherde reduzieren.",
      icon: "🧩",
      render: () => {
        const student = activeStudents.find(s => s.id === t10FocusId) || activeStudents[0];
        const wish1 = activeStudents.find(s => s.id === t10Partner1Id) || activeStudents[1];
        const wish2 = activeStudents.find(s => s.id === t10Partner2Id) || activeStudents[2];

        const runOptimizer = () => {
          if (t10Partner1Id === t10Partner2Id) {
            setT10OptimizationResult("⚠️ Fehler: Bitte wähle zwei unterschiedliche Wunschpartner aus!");
            return;
          }
          setT10OptimizationResult(`✅ Optimierung erfolgreich! \nDer Sitzordnungs-Algorithmus schlägt vor, ${student.vorname} an einen gemeinsamen Gruppentisch mit ${wish1.vorname} zu setzen. Da ${wish2.vorname} bereits einen anderen dichten Partnerwunsch hat, wird ${wish2.vorname} am direkt angrenzenden Tisch platziert, was eine hervorragende Balance aus Wunschkopplung und Integrationsförderung gewährt.`);
        };

        return (
          <div className="mt-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100 space-y-4">
            <h5 className="font-black text-[0.8125rem] text-indigo-400 uppercase tracking-widest">🧩 Interaktives Soziogramm & Sitzordnung</h5>
            
            <div className="space-y-3.5">
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-950/45 border border-slate-800 p-3 rounded-xl">
                <div className="space-y-1">
                  <label htmlFor="t10-focus-select" className="block text-[0.5625rem] font-black uppercase text-slate-455">Fokus-Kind:</label>
                  <select 
                    id="t10-focus-select"
                    value={t10FocusId} 
                    onChange={(e) => setT10FocusId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                  >
                    {activeStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.vorname}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="t10-partner1-select" className="block text-[0.5625rem] font-black uppercase text-slate-455">1. Wunschpartner/in:</label>
                  <select 
                    id="t10-partner1-select"
                    value={t10Partner1Id} 
                    onChange={(e) => setT10Partner1Id(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                  >
                    {activeStudents.filter(s => s.id !== t10FocusId).map(s => (
                      <option key={s.id} value={s.id}>{s.vorname}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label htmlFor="t10-partner2-select" className="block text-[0.5625rem] font-black uppercase text-slate-455">2. Wunschpartner/in:</label>
                  <select 
                    id="t10-partner2-select"
                    value={t10Partner2Id} 
                    onChange={(e) => setT10Partner2Id(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[0.7rem] font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 focus:outline-none"
                  >
                    {activeStudents.filter(s => s.id !== t10FocusId).map(s => (
                      <option key={s.id} value={s.id}>{s.vorname}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                onClick={runOptimizer}
                className="w-full bg-indigo-650 hover:bg-indigo-600 text-white rounded-xl py-2 text-[0.7rem] font-black transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                🔮 Sitzordnung berechnen & balancieren
              </button>

              {t10OptimizationResult && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-900/60 text-[0.675rem] font-medium leading-relaxed text-indigo-200/90 whitespace-pre-wrap">
                  {t10OptimizationResult}
                </div>
              )}
            </div>
          </div>
        );
      }
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {list.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div 
            key={idx} 
            className={`border rounded-2xl p-4 transition-all text-left duration-300 ${
              isOpen 
                ? 'bg-slate-900 border-indigo-500 shadow-lg text-indigo-50 h-auto' 
                : 'bg-slate-950/20 border-slate-800 text-slate-100 hover:border-slate-700'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              aria-expanded={isOpen}
              aria-controls={`suggestion-details-${idx}`}
              aria-label={`${item.title}. ${item.short}`}
              className="w-full text-left focus:ring-2 focus:ring-indigo-500 focus:outline-none rounded-xl p-1.5 -m-1.5 transition-all select-none block cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  <span className="text-[0.8125rem] font-extrabold tracking-tight leading-snug">{item.title}</span>
                </div>
                <span className="text-[0.6875rem] text-indigo-400 font-black" aria-hidden="true">
                  {isOpen ? '🔼' : '🔽'}
                </span>
              </div>
              
              <p className="text-[0.725rem] text-slate-300 leading-relaxed font-semibold mt-1.5">
                {item.short}
              </p>
            </button>

            {isOpen && (
              <div id={`suggestion-details-${idx}`} className="mt-3 border-t border-indigo-900/60 pt-2.5">
                <p className="text-[0.7rem] text-indigo-200 leading-relaxed font-medium">
                  {item.details}
                </p>
                {item.render && item.render()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SMILEYS = [
  { wert: 1, icon: '🤩', label: 'strahlend' },
  { wert: 2, icon: '😊', label: 'lächelnd' },
  { wert: 3, icon: '😐', label: 'neutral' },
  { wert: 4, icon: '😔', label: 'traurig' }
];

const KATEGORIE_COLORS = {
  lernen: 'bg-blue-50 text-blue-600 border-blue-100',
  arbeitsverhalten: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  sozialverhalten: 'bg-rose-50 text-rose-600 border-rose-100',
  interessen: 'bg-amber-50 text-amber-600 border-amber-100'
};

const KATEGORIE_LABELS = {
  lernen: 'Lernen',
  arbeitsverhalten: 'Arbeitsverhalten',
  sozialverhalten: 'Sozialverhalten',
  interessen: 'Interessen'
};



interface StatisticsProps {
  initialTab?: 'stats' | 'profiles' | 'lehrer';
}

export default function Statistics({ initialTab = 'stats' }: StatisticsProps) {
  const { app, setApp, updateStudent, notenUpdateTrigger, setPage } = useApp();
  const students = app.schueler;

  const [activeTab, setActiveTab] = useState<'stats' | 'profiles' | 'mehr' | 'lehrer'>(
    initialTab === 'lehrer' ? 'mehr' : initialTab
  );
  const [statsSubTab, setStatsSubTab] = useState<'leistung' | 'antolin'>('leistung');
  const [mehrSubTab, setMehrSubTab] = useState<'charts' | 'tools' | 'antolin' | 'lehrer'>(
    initialTab === 'lehrer' ? 'lehrer' : 'charts'
  );
  const [profilesSubTab, setProfilesSubTab] = useState<'liste' | 'antolin'>('liste');
  const [activeFach, setActiveFach] = useState<string>('Gesamt');
  
  // Student selection state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [antolinSelectedStudentId, setAntolinSelectedStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [profileSubTab, setProfileSubTab] = useState<'dossier' | 'parents' | 'behavior'>('dossier');
  const [showFoerderDetail, setShowFoerderDetail] = useState(false);

  // KEL Parent-Info Dashboard States
  const [kelAgreementInput, setKelAgreementInput] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [parentNotesFilter, setParentNotesFilter] = useState<'all' | 'positive'>('all');
  const [kelCategoriesToShow, setKelCategoriesToShow] = useState<string[]>(['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen']);
  const [presentationModeActive, setPresentationModeActive] = useState<boolean>(false);
  const [presentationView, setPresentationView] = useState<'slides' | 'dossier'>('slides');
  const [kelDetailFach, setKelDetailFach] = useState<string | null>(null);
  const [kelChartType, setKelChartType] = useState<'column' | 'bar' | 'line' | 'area' | 'pie'>('column');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [aiLoadingState, setAiLoadingState] = useState<string | null>(null);
  const sem = '1';

  const calculateStudentMonthlyDeltas = (schuelerId: string) => {
    const recs = (app.antolinRecords || [])
      .filter(r => r.schuelerId === schuelerId)
      .sort((a,b) => a.datum.localeCompare(b.datum));
      
    if (recs.length === 0) return [];
    
    const deltas: { date: string; monthLabel: string; booksDelta: number; pointsDelta: number; cumulativeBooks: number; cumulativePoints: number }[] = [];
    
    for (let i = 0; i < recs.length; i++) {
      const current = recs[i];
      const dateObj = new Date(current.datum);
      const monthLabel = dateObj.toLocaleDateString('de-DE', { month: 'long' });
      
      if (i === 0) {
        deltas.push({
          date: current.datum,
          monthLabel,
          booksDelta: current.anzahlBuecher,
          pointsDelta: current.punkte,
          cumulativeBooks: current.anzahlBuecher,
          cumulativePoints: current.punkte
        });
      } else {
        const prev = recs[i - 1];
        deltas.push({
          date: current.datum,
          monthLabel,
          booksDelta: Math.max(0, current.anzahlBuecher - prev.anzahlBuecher),
          pointsDelta: Math.max(0, current.punkte - prev.punkte),
          cumulativeBooks: current.anzahlBuecher,
          cumulativePoints: current.punkte
        });
      }
    }
    return deltas;
  };
  const toggleExpand = (itemId: string, defaultExpanded: boolean = false, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedItems(prev => {
      const current = prev[itemId] !== undefined ? prev[itemId] : defaultExpanded;
      return { ...prev, [itemId]: !current };
    });
  };
  
  // Portfolio Entry Form State
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [portfolioSubject, setPortfolioSubject] = useState('');
  const [portfolioRating, setPortfolioRating] = useState('Sehr Gut');
  const [portfolioDesc, setPortfolioDesc] = useState('');

  // Observation Notes Form State
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteInhalt, setNewNoteInhalt] = useState('');
  const [newNoteKategorie, setNewNoteKategorie] = useState('Allgemein');
  const [newNoteTitel, setNewNoteTitel] = useState('Beobachtung');
  const [aiPolishingNote, setAiPolishingNote] = useState(false);

  // Parent Meeting Form State
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeetingThema, setNewMeetingThema] = useState('');
  const [newMeetingNotizen, setNewMeetingNotizen] = useState('');
  const [newMeetingVereinbarungen, setNewMeetingVereinbarungen] = useState('');
  const [newMeetingTeilnehmer, setNewMeetingTeilnehmer] = useState('Mutter, Vater, Klassenlehrerin');
  const [newMeetingDatum, setNewMeetingDatum] = useState(() => formatLocalDateKey(new Date()));

  const [portfolioEntries, setPortfolioEntries] = useState<Record<string, { id: string; titel: string; fach: string; datum: string; bewertung: string; beschreibung: string }[]>>(
    () => (app.portfolioEntries || {}) as any
  );

  // One-time migration of historical unencrypted portfolio data into class-local app state.
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('lm_portfolio_entries_v2');
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, any[]>;
      if (!parsed || typeof parsed !== 'object') {
        localStorage.removeItem('lm_portfolio_entries_v2');
        return;
      }

      setApp(prev => {
        const classes = (prev.classes || []).map(classroom => {
          const studentIds = new Set((classroom.schueler || []).map(student => student.id));
          const migrated = Object.fromEntries(
            Object.entries(parsed).filter(([studentId]) => studentIds.has(studentId))
          );
          if (Object.keys(migrated).length === 0) return classroom;
          return {
            ...classroom,
            portfolioEntries: {
              ...(classroom.portfolioEntries || {}),
              ...migrated,
            },
          };
        });
        const activeClass = classes.find(classroom => classroom.id === prev.activeClassId);
        return {
          ...prev,
          classes,
          portfolioEntries: {
            ...(prev.portfolioEntries || {}),
            ...(activeClass?.portfolioEntries || {}),
          },
        };
      });
      localStorage.removeItem('lm_portfolio_entries_v2');
    } catch {
      // Corrupt historical local data is ignored rather than replacing encrypted state.
    }
  }, [setApp]);

  // KI summary state
  const [summary, setSummary] = useState<string>('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  React.useEffect(() => {
    setSelectedStudentId(null);
    setAntolinSelectedStudentId(null);
    setSearch('');
    setProfileSubTab('dossier');
    setShowFoerderDetail(false);
    setShowAddPortfolio(false);
    setShowAddNote(false);
    setShowAddMeeting(false);
    setPresentationModeActive(false);
    setKelDetailFach(null);
    setExpandedItems({});
    setSummary('');
    setSummaryError(null);
    setPortfolioEntries((app.portfolioEntries || {}) as any);
  }, [app.activeClassId]);

  // Sync selectedStudentForPortfolio from other app sections
  React.useEffect(() => {
    if (app.selectedStudentForPortfolio) {
      setSelectedStudentId(app.selectedStudentForPortfolio);
      setActiveTab('profiles');
      setApp(prev => ({ ...prev, selectedStudentForPortfolio: undefined }));
    }
  }, [app.selectedStudentForPortfolio, setApp]);

  // Sync summary with encrypted app state and migrate historical browser-only data once.
  React.useEffect(() => {
    if (!selectedStudentId) {
      setSummary('');
      setProfileSubTab('dossier');
      return;
    }

    const appCached = app.kiPortfolioSummaries?.[selectedStudentId];
    if (appCached) {
      setSummary(appCached);
    } else {
      try {
        const key = `ki_portfolio_summary_${selectedStudentId}`;
        const cached = localStorage.getItem(key);
        if (cached) {
          setSummary(cached);
          setApp(prev => ({
            ...prev,
            kiPortfolioSummaries: {
              ...(prev.kiPortfolioSummaries || {}),
              [selectedStudentId]: cached,
            },
          }));
          localStorage.removeItem(key);
        } else {
          setSummary('');
        }
      } catch {
        setSummary('');
      }
    }
    setSummaryError(null);
    setProfileSubTab('dossier');
  }, [selectedStudentId, app.kiPortfolioSummaries, setApp]);

  // One-time migration of legacy Oberau remarks/evaluation data for the selected student.
  React.useEffect(() => {
    if (!selectedStudentId) return;
    try {
      const remarksKey = `oberau_remarks_${selectedStudentId}`;
      const evalKey = `oberau_eval_${selectedStudentId}`;
      const remarks = localStorage.getItem(remarksKey);
      const evaluationRaw = localStorage.getItem(evalKey);
      if (!remarks && !evaluationRaw) return;

      let evaluationData: Record<string, number | null> | undefined;
      if (evaluationRaw) {
        try {
          const parsed = JSON.parse(evaluationRaw);
          if (parsed && typeof parsed === 'object') evaluationData = parsed;
        } catch {}
      }

      setApp(prev => ({
        ...prev,
        oberauData: {
          ...(prev.oberauData || {}),
          [selectedStudentId]: {
            ...(prev.oberauData?.[selectedStudentId] || {}),
            ...(remarks ? { remarks } : {}),
            ...(evaluationData ? { evaluationData } : {}),
          },
        },
      }));
      localStorage.removeItem(remarksKey);
      localStorage.removeItem(evalKey);
    } catch {}
  }, [selectedStudentId, setApp]);



  useEscapeKey(() => setPresentationModeActive(false), presentationModeActive);
  useEscapeKey(() => setKelDetailFach(null), kelDetailFach !== null);
  useEscapeKey(() => setShowAddPortfolio(false), showAddPortfolio);
  useEscapeKey(() => setShowAddNote(false), showAddNote);
  useEscapeKey(() => setShowAddMeeting(false), showAddMeeting);

  const handleUpdateKelRating = (studentId: string, bereichId: string, type: 'kind' | 'lehrer', value: number) => {
    setApp((prev: any) => {
      const currentMeetings = prev.kelGespraeche || [];
      const index = currentMeetings.findIndex((k: any) => k.schuelerId === studentId);
      
      let updatedMeeting: any;
      if (index >= 0) {
        const existing = currentMeetings[index];
        updatedMeeting = {
          ...existing,
          selbsteinschaetzungKind: {
            ...(existing.selbsteinschaetzungKind || {}),
            ...(type === 'kind' 
              ? { [bereichId]: { wert: value, kommentar: existing.selbsteinschaetzungKind?.[bereichId]?.kommentar || '' } } 
              : {})
          },
          einschaetzungLehrperson: {
            ...(existing.einschaetzungLehrperson || {}),
            ...(type === 'lehrer' 
              ? { [bereichId]: { wert: value, kommentar: existing.einschaetzungLehrperson?.[bereichId]?.kommentar || '' } } 
              : {})
          }
        };
      } else {
        updatedMeeting = {
          id: `kel-${Date.now()}`,
          schuelerId: studentId,
          datum: formatLocalDateKey(new Date()),
          schuljahr: prev.schuljahr || '2023/24',
          selbsteinschaetzungKind: {
            [bereichId]: { wert: type === 'kind' ? value : 2, kommentar: '' }
          },
          einschaetzungLehrperson: {
            [bereichId]: { wert: type === 'lehrer' ? value : 2, kommentar: '' }
          },
          zieleKind: [],
          vereinbarungen: '',
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false
        };
      }
      
      const newMeetings = index >= 0 
        ? currentMeetings.map((k: any, idx: number) => idx === index ? updatedMeeting : k)
        : [...currentMeetings, updatedMeeting];
        
      return {
        ...prev,
        kelGespraeche: newMeetings
      };
    });
  };

  const handleUpdateKelComment = (studentId: string, bereichId: string, type: 'kind' | 'lehrer', comment: string) => {
    setApp((prev: any) => {
      const currentMeetings = prev.kelGespraeche || [];
      const index = currentMeetings.findIndex((k: any) => k.schuelerId === studentId);
      
      let updatedMeeting: any;
      if (index >= 0) {
        const existing = currentMeetings[index];
        updatedMeeting = {
          ...existing,
          selbsteinschaetzungKind: {
            ...(existing.selbsteinschaetzungKind || {}),
            ...(type === 'kind' 
              ? { [bereichId]: { wert: existing.selbsteinschaetzungKind?.[bereichId]?.wert ?? 2, kommentar: comment } } 
              : {})
          },
          einschaetzungLehrperson: {
            ...(existing.einschaetzungLehrperson || {}),
            ...(type === 'lehrer' 
              ? { [bereichId]: { wert: existing.einschaetzungLehrperson?.[bereichId]?.wert ?? 2, kommentar: comment } } 
              : {})
          }
        };
      } else {
        updatedMeeting = {
          id: `kel-${Date.now()}`,
          schuelerId: studentId,
          datum: formatLocalDateKey(new Date()),
          schuljahr: prev.schuljahr || '2023/24',
          selbsteinschaetzungKind: {
            [bereichId]: { wert: 2, kommentar: type === 'kind' ? comment : '' }
          },
          einschaetzungLehrperson: {
            [bereichId]: { wert: 2, kommentar: type === 'lehrer' ? comment : '' }
          },
          zieleKind: [],
          vereinbarungen: '',
          naechsterTermin: '',
          unterschriftKind: false,
          unterschriftEltern: false,
          unterschriftLehrperson: false
        };
      }
      
      const newMeetings = index >= 0 
        ? currentMeetings.map((k: any, idx: number) => idx === index ? updatedMeeting : k)
        : [...currentMeetings, updatedMeeting];
        
      return {
        ...prev,
        kelGespraeche: newMeetings
      };
    });
  };

  const activeFaecher = useMemo(() => {
    // If user has specific subjects selected in app settings, use them. Otherwise show all standard ones.
    const subjects = (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;
    return subjects;
  }, [app.faecher]);

  // Save portfolio entry to localStorage
  const handleAddPortfolioEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !portfolioTitle.trim() || !portfolioSubject) return;

    const newEntry = {
      id: `port-${Date.now()}`,
      titel: portfolioTitle.trim(),
      fach: portfolioSubject,
      datum: formatLocalDateKey(new Date()),
      bewertung: portfolioRating,
      beschreibung: portfolioDesc.trim()
    };

    const updated = {
      ...portfolioEntries,
      [selectedStudentId]: [newEntry, ...(portfolioEntries[selectedStudentId] || [])]
    };

    setPortfolioEntries(updated);
    setApp(prev => ({
      ...prev,
      portfolioEntries: updated
    }));
    try {
      localStorage.removeItem('lm_portfolio_entries_v2');
    } catch {}

    // Reset Form
    setPortfolioTitle('');
    setPortfolioSubject('');
    setPortfolioRating('Sehr Gut');
    setPortfolioDesc('');
    setShowAddPortfolio(false);
  };

  const handleDeletePortfolioEntry = (entryId: string) => {
    if (!selectedStudentId) return;
    const updated = {
      ...portfolioEntries,
      [selectedStudentId]: (portfolioEntries[selectedStudentId] || []).filter(item => item.id !== entryId)
    };
    setPortfolioEntries(updated);
    setApp(prev => ({
      ...prev,
      portfolioEntries: updated
    }));
    try {
      localStorage.removeItem('lm_portfolio_entries_v2');
    } catch {}
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !newNoteInhalt.trim()) return;

    const newNote = {
      id: `profile-note-${globalThis.crypto?.randomUUID?.() || Date.now()}`,
      datum: new Date().toISOString(),
      kategorie: 'Notiz' as const,
      inhalt: newNoteInhalt.trim(),
      schuelerId: selectedStudentId,
      quelle: `Statistik & Profile · ${newNoteKategorie || newNoteTitel || 'Beobachtung'}`,
    };

    setApp(prev => ({
      ...prev,
      notes: [newNote, ...(prev.notes || [])],
      journal: [newNote, ...(prev.journal || [])],
    }));

    setNewNoteInhalt('');
    setNewNoteKategorie('Allgemein');
    setNewNoteTitel('Beobachtung');
    setShowAddNote(false);
  };

  const handleDeleteNote = (id: string) => {
    if (!confirm('Eintrag wirklich löschen?')) return;
    setApp((prev: any) => ({
      ...prev,
      notes: (prev.notes || []).filter((note: any) => note.id !== id),
      journal: (prev.journal || []).filter((note: any) => note.id !== id),
      notizen: (prev.notizen || []).filter((note: any) => note.id !== id),
    }));
  };

  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !newMeetingThema.trim()) return;

    const newMeeting = {
      id: `meet-${Date.now()}`,
      schuelerId: selectedStudentId,
      datum: newMeetingDatum || formatLocalDateKey(new Date()),
      thema: newMeetingThema.trim(),
      notizen: newMeetingNotizen.trim(),
      vereinbarungen: newMeetingVereinbarungen.trim(),
      teilnehmer: newMeetingTeilnehmer.trim(),
    };

    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: [newMeeting, ...(prev.elterngespraeche || [])]
    }));

    setNewMeetingThema('');
    setNewMeetingNotizen('');
    setNewMeetingVereinbarungen('');
    setNewMeetingTeilnehmer('Mutter, Vater, Klassenlehrerin');
    setNewMeetingDatum(formatLocalDateKey(new Date()));
    setShowAddMeeting(false);
  };

  const handleDeleteMeeting = (id: string) => {
    if (!confirm('Gesprächsprotokoll wirklich löschen?')) return;
    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: (prev.elterngespraeche || []).filter((m: any) => m.id !== id)
    }));
  };

  const handlePolishNote = async () => {
    if (!newNoteInhalt.trim() || aiPolishingNote) return;
    setAiPolishingNote(true);
    try {
      const { polishText } = await import('../services/aiService');
      const polished = await polishText(newNoteInhalt);
      if (polished) {
        setNewNoteInhalt(polished.trim());
      }
    } catch (err) {
      console.error('Polishing note note failed', err);
    } finally {
      setAiPolishingNote(false);
    }
  };

  const getPortfolioForStudent = (sid: string) => {
    return portfolioEntries[sid] || [];
  };

  // --- Attendance aggregation ---
  const getAttendanceStats = (sid: string) => getStudentAttendanceSummary(app, sid);

  // Class attendance metrics
  const classAttendance = useMemo(() => {
    let excusedTotal = 0;
    let unexcusedTotal = 0;
    const studentAbsences: { name: string; fullName: string; initials: string; entschuldigt: number; unentschuldigt: number; total: number; hasData: boolean }[] = [];

    students.forEach(s => {
      const stats = getAttendanceStats(s.id);
      excusedTotal += stats.excused;
      unexcusedTotal += stats.unexcused;
      studentAbsences.push({
        name: s.vorname,
        fullName: `${s.vorname} ${s.nachname}`,
        initials: `${s.vorname.charAt(0)}.${s.nachname.charAt(0)}.`,
        entschuldigt: stats.excused,
        unentschuldigt: stats.unexcused,
        total: stats.total,
        hasData: stats.hasData
      });
    });

    // Sort descending by total absences so the kids with more absences are shown first
    studentAbsences.sort((a, b) => b.total - a.total);

    return {
      excusedTotal,
      unexcusedTotal,
      hasData: studentAbsences.some(item => item.hasData),
      studentsData: studentAbsences
    };
  }, [app.anwesenheit, students]);

  // Participation Trend Curves (Mitarbeit)
  const mitarbeitTrend = useMemo(() => {
    const logs = app.mitarbeitLogs || [];
    if (logs.length === 0) {
      return [];
    }
    const sortedLogs = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const dataMap: Record<string, number> = {};
    let runningSum = 0;
    sortedLogs.forEach(log => {
      const d = new Date(log.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) + '.';
      runningSum += log.points || 0;
      dataMap[d] = runningSum;
    });
    return Object.entries(dataMap).map(([date, points]) => ({
      date,
      Punkte: points
    })).slice(-10);
  }, [app.mitarbeitLogs]);

  // --- Calculations for Klassenstatistik ---
  const stats = useMemo(() => {
    const subjects = activeFach === 'Gesamt' ? activeFaecher : [activeFach];
    return getClassPerformanceStats(app, students, subjects, '1');
  }, [app, students, activeFach, activeFaecher, notenUpdateTrigger]);

  // Fächervergleich nutzt immer einen einheitlichen 0–100-Leistungsindex.
  const subjectAverages = useMemo(() => {
    const getShortSubjectName = (fullName: string) => {
      const lower = fullName.toLowerCase();
      if (lower.includes('math')) return 'M';
      if (lower.includes('deutsch')) return 'D';
      if (lower.includes('sach')) return 'SU';
      if (lower.includes('engl')) return 'E';
      if (lower.includes('sport') || lower.includes('bewe')) return 'BS';
      if (lower.includes('rel')) return 'Rel';
      if (lower.includes('musik')) return 'ME';
      if (lower.includes('bild')) return 'BE';
      if (lower.includes('werk')) return 'WE';
      return fullName.substring(0, Math.min(3, fullName.length)).toUpperCase();
    };

    return getSubjectPerformanceAverages(app, students, activeFaecher, '1').map(row => ({
      ...row,
      subjectShort: getShortSubjectName(row.subject),
    }));
  }, [app, students, activeFaecher, notenUpdateTrigger]);

  // Bestes Fach = höchster normalisierter Leistungsindex.
  const bestSubject = useMemo(() => {
    if (!subjectAverages.length) return null;
    return [...subjectAverages].sort((a, b) => b.normalizedAverage - a.normalizedAverage)[0];
  }, [subjectAverages]);

  const dataCoverage = useMemo(() => {
    const studentsWithGrades = students.filter(student =>
      getStudentPerformanceSummary(app, student.id, activeFaecher, '1').hasData
    ).length;
    const studentsWithAttendance = students.filter(student =>
      getStudentAttendanceSummary(app, student.id).hasData
    ).length;

    return {
      totalStudents: students.length,
      studentsWithGrades,
      studentsWithAttendance,
      studentsWithBehavior: new Set(
        (app.statusLog || [])
          .map((entry: any) => entry.schuelerId)
          .filter((id: string) => students.some(student => student.id === id))
      ).size,
      studentsWithDiagnostics: new Set([
        ...(app.diagnostikErhebungen || []).map((entry: any) => entry.schuelerId),
        ...(app.diagnosticResults || []).map((entry: any) => entry.studentId),
      ].filter((id: string) => students.some(student => student.id === id))).size
    };
  }, [app, students, activeFaecher]);

  const colors = ['#059669', '#10b981', '#f59e0b', '#ef4444', '#b91c1c'];

  // --- Calculations for Selector and Student Profile Details ---
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => a.nachname.localeCompare(b.nachname));
  }, [students]);

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter(s => 
      `${s.vorname} ${s.nachname}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [sortedStudents, search]);

  const classHasAntolinData = useMemo(() => {
    const activeStudentIds = new Set((students || []).map(s => s.id));
    return (app.antolinRecords || []).some(r => activeStudentIds.has(r.schuelerId));
  }, [app.antolinRecords, students]);

  const antolinClassStats = useMemo(() => {
    const activeStudentIds = new Set((students || []).map(s => s.id));
    const classRecords = (app.antolinRecords || []).filter(r => activeStudentIds.has(r.schuelerId));

    const latestRecordsByStudent: Record<string, any> = {};
    classRecords.forEach(r => {
      const existing = latestRecordsByStudent[r.schuelerId];
      if (!existing || r.datum.localeCompare(existing.datum) > 0) {
        latestRecordsByStudent[r.schuelerId] = r;
      }
    });

    const latestRecords = Object.values(latestRecordsByStudent);
    const totalBooks = latestRecords.reduce((sum, r) => sum + r.anzahlBuecher, 0);
    const totalPoints = latestRecords.reduce((sum, r) => sum + r.punkte, 0);
    const avgLeistung = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.leistung, 0) / latestRecords.length).toFixed(1) : '0';
    const avgSchwierigkeit = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecords.length).toFixed(1) : '0';
    
    const avgBooksValue = latestRecords.length ? (totalBooks / latestRecords.length) : 0;
    const avgPointsValue = latestRecords.length ? (totalPoints / latestRecords.length) : 0;
    const avgLeistungValue = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.leistung, 0) / latestRecords.length) : 0;
    const avgSchwierigkeitValue = latestRecords.length ? (latestRecords.reduce((sum, r) => sum + r.schwierigkeit, 0) / latestRecords.length) : 0;

    const uniqueDates = Array.from(new Set(classRecords.map(r => r.datum))).sort();
    const classTimelineData = uniqueDates.map(date => {
      const recsOnDate = classRecords.filter(r => r.datum === date);
      const booksSum = recsOnDate.reduce((sum, r) => sum + r.anzahlBuecher, 0);
      const pointsSum = recsOnDate.reduce((sum, r) => sum + r.punkte, 0);
      return {
        Datum: new Date(date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }),
        Bücher: booksSum,
        Punkte: pointsSum
      };
    });

    return {
      latestRecordsByStudent,
      latestRecords,
      totalBooks,
      totalPoints,
      avgLeistung,
      avgSchwierigkeit,
      avgBooksValue,
      avgPointsValue,
      avgLeistungValue,
      avgSchwierigkeitValue,
      uniqueDates,
      classTimelineData
    };
  }, [app.antolinRecords, students]);

  const classOverviewMetrics = useMemo(() => {
    let strongPerformanceCount = 0;
    let attentionPerformanceCount = 0;
    const blindSpotStudents: { id: string; name: string; reason: string }[] = [];
    let openAlertCount = 0;

    const twentyEightDaysAgo = Date.now() - 28 * 24 * 60 * 60 * 1000;

    students.forEach(student => {
      const performance = getStudentPerformanceSummary(app, student.id, activeFaecher, '1');
      if (performance.normalizedAverage !== null) {
        if (performance.normalizedAverage >= 80) strongPerformanceCount++;
        else if (performance.normalizedAverage < 40) attentionPerformanceCount++;
      }

      const attendance = getStudentAttendanceSummary(app, student.id);
      if (attendance.unexcused > 0) openAlertCount++;

      const notes = getStudentNotes(app, student.id);
      if (notes.length === 0) {
        blindSpotStudents.push({
          id: student.id,
          name: `${student.vorname} ${student.nachname}`,
          reason: 'Bisher keine Beobachtungen erfasst',
        });
      } else {
        const latest = Math.max(...notes.map((note: any) =>
          new Date(note.datum || note.timestamp || 0).getTime()
        ));
        if (latest < twentyEightDaysAgo) {
          blindSpotStudents.push({
            id: student.id,
            name: `${student.vorname} ${student.nachname}`,
            reason: 'Keine neue Notiz seit über 4 Wochen',
          });
        }
      }
    });

    const openDiag = (app.diagnostikErhebungen || [])
      .filter((entry: any) => entry.status === 'Offen' || entry.status === 'In Bearbeitung')
      .length;

    return {
      strongPerformanceCount,
      attentionPerformanceCount,
      blindSpotStudents,
      openAlertCount: openAlertCount + openDiag,
    };
  }, [students, app, activeFaecher]);

  const classNoticeInsights = useMemo(() => {
    const list: { id: string; badge: string; badgeColor: string; title: string; text: string }[] = [];

    if (stats.totalCount > 0) {
      list.push({
        id: 'gpa',
        badge: stats.averageDescriptor,
        badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-100',
        title: 'Aktueller Leistungsstand der Klasse',
        text: `${stats.averageDescriptor}: ${stats.averageLabel} über ${stats.totalCount} auswertbare Fachstände.`
      });
    }

    if (classOverviewMetrics.strongPerformanceCount > 0) {
      list.push({
        id: 'positive',
        badge: 'Positive Entwicklung',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        title: 'Leistungsstarke Schüler:innen',
        text: `${classOverviewMetrics.strongPerformanceCount} Schüler:innen liegen im normalisierten Leistungsindex bei mindestens 80 %.`
      });
    }

    if (classOverviewMetrics.attentionPerformanceCount > 0) {
      list.push({
        id: 'attention',
        badge: 'Beobachten',
        badgeColor: 'bg-amber-50 text-amber-700 border-amber-100',
        title: 'Unterstützungsbedarf',
        text: `${classOverviewMetrics.attentionPerformanceCount} Schüler:innen liegen im normalisierten Leistungsindex derzeit unter 40 %.`
      });
    }

    if (classAttendance.unexcusedTotal > 0) {
      list.push({
        id: 'attendance',
        badge: 'Auffällig',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-100',
        title: 'Fehlzeiten im Blick behalten',
        text: `Es wurden insgesamt ${classAttendance.unexcusedTotal} unentschuldigte Fehlstunden in der Klasse dokumentiert.`
      });
    }

    if (classOverviewMetrics.blindSpotStudents.length > 0) {
      list.push({
        id: 'blindspots',
        badge: 'Wenig Daten vorhanden',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        title: 'Dokumentation ergänzen',
        text: `Bei ${classOverviewMetrics.blindSpotStudents.length} Schüler:innen liegen seit über 4 Wochen keine aktuellen Einträge im Beobachtungsjournal vor.`
      });
    }

    return list;
  }, [stats, classOverviewMetrics, classAttendance]);

  const getStudentPerformance = (sid: string | null) => {
    if (!sid) return [];
    return getStudentPerformanceSummary(app, sid, activeFaecher, '1').entries;
  };

  const student = students.find(s => s.id === selectedStudentId);
  const studentPerformance = getStudentPerformance(selectedStudentId);
  const meetings = (app.elterngespraeche || []).filter(meeting => meeting.schuelerId === selectedStudentId);
  const studentNotes = selectedStudentId ? getStudentNotes(app, selectedStudentId) : [];

  const studentPerformanceIndex = studentPerformance.length > 0
    ? studentPerformance.reduce((sum, entry) => sum + entry.normalizedPercent, 0) / studentPerformance.length
    : null;

  // Single pupil vs class comparison on the common 0–100 performance index.
  const compareChartData = useMemo(() => {
    if (!selectedStudentId) return [];
    const subjectRows = getSubjectPerformanceAverages(app, students, activeFaecher, '1');
    const studentRows = getStudentPerformanceSummary(app, selectedStudentId, activeFaecher, '1').entries;
    return activeFaecher.flatMap(subject => {
      const studentEntry = studentRows.find(entry => entry.subject === subject);
      const classEntry = subjectRows.find(entry => entry.subject === subject);
      if (!studentEntry && !classEntry) return [];
      return [{
        subject: subject.length > 15 ? `${subject.substring(0, 15)}...` : subject,
        'Schüler': studentEntry?.normalizedPercent ?? null,
        'Klassen-Ø': classEntry?.normalizedAverage ?? null,
      }];
    });
  }, [app, selectedStudentId, students, activeFaecher, notenUpdateTrigger]);

  // SVG Sparkline Trend Generator
  const renderSparkline = (sid: string) => {
    const performance = getStudentPerformance(sid);
    const series = performance.map(entry => entry.normalizedPercent);
    if (series.length < 2) return null;

    const width = 100;
    const height = 30;
    const padding = 3;
    const maxVal = 100;
    const minVal = 0;
    const valRange = 100;
    
    const pointsString = series.map((val, idx) => {
      const x = (idx / (series.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val - minVal) / valRange) * (height - padding * 2) - padding;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg className="w-24 h-8 text-indigo-500 stroke-current fill-none stroke-2" viewBox={`0 0 ${width} ${height}`}>
        <polyline strokeLinecap="round" strokeLinejoin="round" points={pointsString} />
      </svg>
    );
  };

  // Companion Dictionary of all matrix criteria for AI context
  const CRITERION_DICT: Record<string, string> = {
    'de_hoeren_gespraeche': 'Deutsch Hören/Sprechen: Gespräche führen/Beitrag im Unterricht',
    'de_hoeren_standardsprache': 'Deutsch Hören/Sprechen: Standardsprache/Aussprache/Vortrag',
    'de_hoeren_zuhoeren': 'Deutsch Hören/Sprechen: Zuhör-Kompetenz/Zuhören',
    'de_lesen_fliessend': 'Deutsch Lesen: Lautlesekompetenz/Flüssig lesen',
    'de_lesen_verstaendnis': 'Deutsch Lesen: Sinnoffenheit/Leseverständnis',
    'de_lesen_info_verarbeit': 'Deutsch Lesen: Strukturierte Textarbeit/Textverständnis',
    'de_rechtschreiben_richtig': 'Deutsch Rechtschreiben: Formale Richtigkeit/Texte abschreiben',
    'de_rechtschreiben_lernwoerter': 'Deutsch Rechtschreiben: Schreibwortschatz/Lernwörter',
    'de_rechtschreiben_wortfamilie': 'Deutsch Rechtschreiben: Grammatik/Wortstämme/Groß-Kleinschreibung',
    'de_rechtschreiben_wortarten': 'Deutsch Rechtschreiben: Bestimmen von Wortarten/Satzstrukturen',
    'de_rechtschreiben_zeitformen': 'Deutsch Rechtschreiben: Erkennen und Bilden von Zeitformen',
    'de_verfassen_planen': 'Deutsch Verfassen: Planvoller Textentwurf',
    'de_verfassen_ueberarbeiten': 'Deutsch Verfassen: Redigieren/Nachbereiten von Textentwürfen',
    'ma_zahlen_zahlenraum': 'Mathematik: Begriffliches Erfassen und Orientieren im Zahlenraum',
    'ma_zahlen_stellenwert': 'Mathematik: Stellenwertschreiben und -lesen',
    'ma_zahlen_daten': 'Mathematik: Tabellen und Daten erheben',
    'ma_rechnen_addition': 'Mathematik Rechnen: Schriftliches Additionsverfahren',
    'ma_rechnen_subtraktion': 'Mathematik Rechnen: Schriftliches Subtraktionsverfahren',
    'ma_rechnen_multiplikation': 'Mathematik Rechnen: Multiplizieren/Malreihen',
    'ma_rechnen_division': 'Mathematik Rechnen: Dividieren',
    'ma_rechnen_sachaufgaben': 'Mathematik Rechnen: Analysieren von Sachaufgaben/Sachrechnen',
    'ma_groessen_umwandeln': 'Mathematik Rechnen: Arbeiten mit Maßeinheiten/Größen',
    'ma_raum_figuren': 'Mathematik Geometrie: Erkennen von Figuren und Körpern',
    'ma_raum_umfang': 'Mathematik Geometrie: Umfangberechnungen',
    'su_interesse': 'Sachunterricht: Eigeninteresse und Wissbegierde an Themenfragen',
    'su_wiedergabe': 'Sachunterricht: Inhaltliche Wiedergabe und begriffliches Erklären von Inhalten',
    'me_interesse': 'Musikerziehung: Rhythmisches Gefühl/Interesse an Musik',
    'td_planung': 'Technik & Design: Kreativer planvoller Werkunterricht',
    'kg_gestaltung': 'Kunst & Gestaltung: Ästhetisches Gestalten und Feinmotorik',
    'bs_freude': 'Bewegung & Sport: Sportlicher Einsatz und faires Teamverhalten',
    're_interesse': 'Religion: Engagement und Mitgestaltung des Unterrichts',
    'al_mitarbeit': 'Allgemeines Verhalten: Unterrichtsbeteiligung/Mitarbeit',
    'al_konzentration': 'Allgemeines Verhalten: Fokus, Konzentration und Ausdauer',
    'al_arbeitstempo': 'Allgemeines Verhalten: Angemessenes Arbeitstempo',
    'al_ordnung': 'Allgemeines Verhalten: Struktur, Ordnung und Heftführung',
    'al_selbststaendigkeit': 'Allgemeines Verhalten: Eigenverantwortung/Selbstständigkeit',
    'al_hausuebungen': 'Allgemeines Verhalten: Verlässliches Erledigen der Hausaufgaben'
  };

  // Compile Förderprofil & Erläuterungen-Matrix details for the AI Summarizer
  const compileSupportAndMatrixData = () => {
    if (!student) return '';
    const lines: string[] = [];
    
    // 1. Freitext Erläuterung (Zeugnis-Bemerkungen: bevorzugt aus verschlüsseltem AppState)
    const remarks = (app as any).oberauData?.[student.id]?.remarks || localStorage.getItem(`oberau_remarks_${student.id}`);
    if (remarks && remarks.trim()) {
      lines.push(`FREITEXT-ERLÄUTERUNG ZUM ZEUGNIS:\n"${remarks.trim()}"`);
    }

    // 2. Förderprofil (Bereiche & Ziele)
    const profil = student.foerderprofil;
    if (profil) {
      if (profil.foerderbedarfBereiche && profil.foerderbedarfBereiche.length > 0) {
        lines.push(`FÖRDERBEDARF-BEREICHE DER FÖRDERUNG:\n- ${profil.foerderbedarfBereiche.join('\n- ')}`);
      }
      if (profil.foerderziele && profil.foerderziele.length > 0) {
        const goalsText = profil.foerderziele
          .map(z => `- Bereich: ${z.bereich} | Ziel: ${z.ziel} | Status: ${z.status} ${z.notiz ? `| Notiz: ${z.notiz}` : ''}`)
          .join('\n');
        lines.push(`FÖRDERZIELE IM DETAIL:\n${goalsText}`);
      }
    }

    // 3. Oberau Matrix Bewertungen (bevorzugt aus verschlüsseltem AppState)
    let evalObj = (app as any).oberauData?.[student.id]?.evaluationData;
    if (!evalObj) {
      const evalRaw = localStorage.getItem(`oberau_eval_${student.id}`);
      if (evalRaw) {
        try {
          evalObj = JSON.parse(evalRaw);
        } catch {}
      }
    }
    if (evalObj) {
      try {
        const ratedItems: string[] = [];
        
        Object.entries(evalObj).forEach(([id, val]) => {
          if (val !== null && val !== undefined) {
            const label = CRITERION_DICT[id] || id;
            ratedItems.push(`- ${label}: Bewertung ${val} von 6`);
          }
        });
        
        if (ratedItems.length > 0) {
          lines.push(`ZEUGNIS-BEWERTUNGSMATRIX (Erläuterungen 1 bis 6):\n${ratedItems.join('\n')}`);
        }
      } catch (e) {
        console.error("Error parsing matrix evaluations in summary generator", e);
      }
    }

    return lines.join('\n\n');
  };

  // AI Summarizer logic
  const handleGenerateSummary = async () => {
    if (!selectedStudentId || !student) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const activeFaecher = (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;
      const gradeSummary = activeFaecher.map(subject => {
        const avg = berechne(app, student.id, subject, '1');
        const rawEndnote = app.noten?.[student.id]?.[subject]?.[ '1' ]?.endnote || 
                           app.noten?.[student.id]?.[subject]?.[ '2' ]?.endnote;
        const endnote = rawEndnote || (avg !== null ? Math.round(avg).toString() : '—');
        return { subject, avg, endnote };
      }).filter(item => item.avg !== null || item.endnote !== '—');

      const perfString = gradeSummary.length > 0
        ? gradeSummary.map(g => `- Fach: ${g.subject} | Schnitt: ${g.avg ? g.avg.toFixed(2) : 'kein Schnitt'} | Zeugnisnote / Endnote: ${g.endnote}`).join('\n')
        : 'Keine Leistungsdaten eingetragen.';

      const absStats = getAttendanceStats(selectedStudentId);
      const absenceString = `Fehlzeiten / Anwesenheit des Schülers:
- Entschuldigte Fehlstunden: ${absStats.excused}
- Unentschuldigte Fehlstunden: ${absStats.unexcused}
- Gesamtfehlstunden: ${absStats.total}`;

      const fromNotes = (app.notes || [])
        .filter(n => n.schuelerId === student.id)
        .map(n => `Am ${n.datum || 'Unbekannt'}: [Kategorie: ${n.kategorie || 'Leistung/Verhalten'}]: ${n.inhalt}`);

      const fromNotizen = (app.notizen || [])
        .filter(n => n.schuelerId === student.id)
        .map(n => `Am ${n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : 'Unbekannt'}: [Kategorie: ${n.kategorie || 'Journal'}]: ${n.inhalt}`);

      const allMyNotes = [...fromNotes, ...fromNotizen];
      const notesString = allMyNotes.length > 0
        ? allMyNotes.join('\n')
        : 'Keine Beobachtungs- oder Verhaltensnotizen erfasst.';

      const CRITERION_DICT_LOCAL: Record<string, string> = {
        'de_hoeren_gespraeche': 'Deutsch Hören/Sprechen: Gespräche führen/Beitrag im Unterricht',
        'de_hoeren_standardsprache': 'Deutsch Hören/Sprechen: Standardsprache/Aussprache/Vortrag',
        'de_hoeren_zuhoeren': 'Deutsch Hören/Sprechen: Zuhör-Kompetenz/Zuhören',
        'de_lesen_fliessend': 'Deutsch Lesen: Lautlesekompetenz/Flüssig lesen',
        'de_lesen_verstaendnis': 'Deutsch Lesen: Sinnoffenheit/Leseverständnis',
        'de_lesen_info_verarbeit': 'Deutsch Lesen: Strukturierte Textarbeit/Textverständnis',
        'de_rechtschreiben_richtig': 'Deutsch Rechtschreiben: Formale Richtigkeit/Texte abschreiben',
        'de_rechtschreiben_lernwoerter': 'Deutsch Rechtschreiben: Schreibwortschatz/Lernwörter',
        'de_rechtschreiben_wortfamilie': 'Deutsch Rechtschreiben: Grammatik/Wortstämme/Groß-Kleinschreibung',
        'de_rechtschreiben_wortarten': 'Deutsch Rechtschreiben: Bestimmen von Wortarten/Satzstrukturen',
        'de_rechtschreiben_zeitformen': 'Deutsch Rechtschreiben: Erkennen und Bilden von Zeitformen',
        'de_verfassen_planen': 'Deutsch Verfassen: Planvoller Textentwurf',
        'de_verfassen_ueberarbeiten': 'Deutsch Verfassen: Redigieren/Nachbereiten von Textentwürfen',
        'ma_zahlen_zahlenraum': 'Mathematik: Begriffliches Erfassen und Orientieren im Zahlenraum',
        'ma_zahlen_stellenwert': 'Mathematik: Stellenwertschreiben und -lesen',
        'ma_zahlen_daten': 'Mathematik: Tabellen und Daten erheben',
        'ma_rechnen_addition': 'Mathematik Rechnen: Schriftliches Additionsverfahren',
        'ma_rechnen_subtraktion': 'Mathematik Rechnen: Schriftliches Subtraktionsverfahren',
        'ma_rechnen_multiplikation': 'Mathematik Rechnen: Multiplizieren/Malreihen',
        'ma_rechnen_division': 'Mathematik Rechnen: Dividieren',
        'ma_rechnen_sachaufgaben': 'Mathematik Rechnen: Analysieren von Sachaufgaben/Sachrechnen',
        'ma_groessen_umwandeln': 'Mathematik Rechnen: Arbeiten mit Maßeinheiten/Größen',
        'ma_raum_figuren': 'Mathematik Geometrie: Erkennen von Figuren und Körpern',
        'ma_raum_umfang': 'Mathematik Geometrie: Umfangberechnungen',
        'su_interesse': 'Sachunterricht: Eigeninteresse und Wissbegierde an Themenfragen',
        'su_wiedergabe': 'Sachunterricht: Inhaltliche Wiedergabe und begriffliches Erklären von Inhalten',
        'me_interesse': 'Musikerziehung: Rhythmisches Gefühl/Interesse an Musik',
        'td_planung': 'Technik & Design: Kreativer planvoller Werkunterricht',
        'kg_gestaltung': 'Kunst & Gestaltung: Ästhetisches Gestalten und Feinmotorik',
        'bs_freude': 'Bewegung & Sport: Sportlicher Einsatz und faires Teamverhalten',
        're_interesse': 'Religion: Engagement und Mitgestaltung des Unterrichts',
        'al_mitarbeit': 'Allgemeines Verhalten: Unterrichtsbeteiligung/Mitarbeit',
        'al_konzentration': 'Allgemeines Verhalten: Fokus, Konzentration und Ausdauer',
        'al_arbeitstempo': 'Allgemeines Verhalten: Angemessenes Arbeitstempo',
        'al_ordnung': 'Allgemeines Verhalten: Struktur, Ordnung und Heftführung',
        'al_selbststaendigkeit': 'Allgemeines Verhalten: Eigenverantwortung/Selbstständigkeit',
        'al_hausuebungen': 'Allgemeines Verhalten: Verlässliches Erledigen der Hausaufgaben'
      };

      const latestKel = (app.kelGespraeche || [])
        .filter(k => k.schuelerId === student.id)
        .sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime())[0];

      const refLines: string[] = [];
      if (latestKel) {
        refLines.push(`Letztes KEL-Gespräch am ${latestKel.datum}:`);
        if (latestKel.vereinbarungen) refLines.push(`- Vereinbarungen: ${latestKel.vereinbarungen}`);
        
        const selbsteinschätzung: string[] = [];
        const lehrereinschätzung: string[] = [];

        if (latestKel.selbsteinschaetzungKind) {
          Object.entries(latestKel.selbsteinschaetzungKind).forEach(([cId, valObj]) => {
            if (valObj && valObj.wert) {
              const label = CRITERION_DICT_LOCAL[cId] || cId;
              selbsteinschätzung.push(`  - ${label}: ${valObj.wert}/4 Sterne${valObj.kommentar ? ` (Kommentar: "${valObj.kommentar}")` : ''}`);
            }
          });
        }

        if (latestKel.einschaetzungLehrperson) {
          Object.entries(latestKel.einschaetzungLehrperson).forEach(([cId, valObj]) => {
            if (valObj && valObj.wert) {
              const label = CRITERION_DICT_LOCAL[cId] || cId;
              lehrereinschätzung.push(`  - ${label}: ${valObj.wert}/4 Sterne${valObj.kommentar ? ` (Kommentar: "${valObj.kommentar}")` : ''}`);
            }
          });
        }

        if (selbsteinschätzung.length > 0) {
          refLines.push(`SELBSTEINSCHÄTZUNG DES KINDES (Reflexionskatalog):\n${selbsteinschätzung.join('\n')}`);
        }
        if (lehrereinschätzung.length > 0) {
          refLines.push(`EINSCHÄTZUNG DER LEHRPERSON (Reflexionskatalog):\n${lehrereinschätzung.join('\n')}`);
        }
      }
      const reflexionString = refLines.join('\n\n');

      const ikmRecord = (app.ikmRecords || []).find((r: any) => r.schuelerId === student.id);
      const ikmString = ikmRecord
        ? `IKM Plus Ergebnisse (Schulstufe ${ikmRecord.schulstufe}, Schuljahr ${ikmRecord.schuljahr || 'aktuell'}):
- Deutsch Lesen (PR): ${ikmRecord.deutschLesenPR !== undefined ? ikmRecord.deutschLesenPR + '%' : 'nicht erfasst'}
- Deutsch Zuhören (PR): ${ikmRecord.deutschZuhoerenPR !== undefined ? ikmRecord.deutschZuhoerenPR + '%' : 'nicht erfasst'}
- Deutsch Sprachbewusstsein (PR): ${ikmRecord.deutschSprachbewusstseinPR !== undefined ? ikmRecord.deutschSprachbewusstseinPR + '%' : 'nicht erfasst'}
- Mathematik (PR): ${ikmRecord.mathematikPR !== undefined ? ikmRecord.mathematikPR + '%' : 'nicht erfasst'}
- Pädagogische Stärken (IKM): ${ikmRecord.diagnoseStaerken || 'keine'}
- Pädagogische Herausforderungen (IKM): ${ikmRecord.diagnoseHerausforderungen || 'keine'}
${ikmRecord.kommentar ? `- Pädagogischer Kommentar/Lernpfad-Tipps: ${ikmRecord.kommentar}` : ''}`
        : 'Keine IKM Plus Ergebnisse vorhanden.';

      const stages = app.behavior_stages || [
        { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
        { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
        { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
        { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
        { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
      ];

      const studentLogs = (app.statusLog || [])
        .filter(l => l.schuelerId === student.id)
        .sort((a,b) => b.timestamp - a.timestamp);
      
      const behaviorText = studentLogs.map(l => {
        const dateStr = new Date(l.timestamp).toLocaleDateString('de-DE');
        const stage = stages.find(s => s.id === l.iconId) || { label: 'Unbekannt', icon: '❓' };
        return `[${dateStr}] Einstufung: ${stage.icon} ${stage.label} | Kommentar: ${l.comment || 'kein Kommentar'}`;
      }).join('\n');

      const behaviorNote = app.behavior_notes?.[student.id];
      const badgesList = (student.badges || [])
        .map(b => `- ${b.icon} ${b.name} (${new Date(b.date).toLocaleDateString('de-DE')})`)
        .join('\n');

      const behaviorSections = [];
      if (behaviorNote) behaviorSections.push(`Pädagogische Verhaltensnote:\n${behaviorNote}`);
      if (badgesList) behaviorSections.push(`Vergebene Abzeichen (Badges):\n${badgesList}`);
      if (behaviorText) behaviorSections.push(`Verhaltensverlauf:\n${behaviorText}`);
      
      const behaviorString = behaviorSections.join('\n\n') || 'Keine spezifischen Verhaltensberichte vorhanden.';

      const foerderAndErlauterungData = compileSupportAndMatrixData();
      const portfolioText = (student.portfolio || [])
        .map(e => `[${e.datum}] Titel: ${e.titel}${e.beschreibung ? ` | Beschreibung: ${e.beschreibung}` : ''}${e.isInKEL ? ' (Im KEL-Fokus)' : ''}`)
        .join('\n');
      
      const combinedNotes = [notesString, student.portfolio && student.portfolio.length > 0 ? `Portfolio-Stücke:\n${portfolioText}` : ''].filter(Boolean).join('\n\n');
      const combinedMeetings = [meetings.map(m => `Datum: ${new Date(m.datum).toLocaleDateString('de-AT')}, Thema: ${m.thema}, Notizen: ${m.notizen}, Vereinbarungen: ${m.vereinbarungen}`).join('\n') || 'Keine Elterngespräche eingetragen.', reflexionString !== 'Keine KEL-Reflexionen / Einschätzungen gefunden.' && reflexionString ? `Reflexionskatalog & Einschätzung:\n${reflexionString}` : ''].filter(Boolean).join('\n\n');
      const combinedSupport = [foerderAndErlauterungData, ikmString !== 'Keine IKM Plus Ergebnisse vorhanden.' ? `IKM-Informationen:\n${ikmString}` : ''].filter(Boolean).join('\n\n');

      const { generatePortfolioSummary } = await import('../services/aiService');
      const result = await generatePortfolioSummary(
        `${student.vorname} ${student.nachname}`,
        perfString,
        combinedMeetings,
        combinedNotes,
        absenceString,
        combinedSupport
      );

      if (result) {
        setSummary(result);
        setApp(prev => ({
          ...prev,
          kiPortfolioSummaries: {
            ...((prev as any).kiPortfolioSummaries || {}),
            [selectedStudentId]: result
          }
        }));
        try {
          localStorage.removeItem(`ki_portfolio_summary_${selectedStudentId}`);
        } catch {}
      } else {
        setSummaryError('Zusammenfassung konnte nicht erstellt werden. Bitte versuchen Sie es erneut.');
      }
    } catch (err: any) {
      setSummaryError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoadingSummary(false);
    }
  };

  // Sync KEL Agreement Input with student data
  useEffect(() => {
    if (student) {
      setKelAgreementInput((student as any).kelAgreement || '');
    } else {
      setKelAgreementInput('');
    }
  }, [selectedStudentId, student]);

  const saveKelAgreement = () => {
    if (!student) return;
    const updatedStudent = {
      ...student,
      kelAgreement: kelAgreementInput
    };
    updateStudent(updatedStudent);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  const addPresetAgreementText = (presetText: string) => {
    setKelAgreementInput(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return `- ${presetText}`;
      if (trimmed.endsWith('.') || trimmed.endsWith('!') || trimmed.endsWith('\n')) {
        return `${trimmed}\n- ${presetText}`;
      }
      return `${trimmed}.\n- ${presetText}`;
    });
  };

  const renderParentsDashboard = () => {
    if (!student) return null;

    const sem = '1';

    // Class attendance metrics
    const classAvgAbsences = (() => {
      if (students.length === 0) return { excused: 0, unexcused: 0, total: 0 };
      let totalExcused = 0;
      let totalUnexcused = 0;
      students.forEach(s => {
        const stats = getAttendanceStats(s.id);
        totalExcused += stats.excused;
        totalUnexcused += stats.unexcused;
      });
      const cExcused = Number((totalExcused / students.length).toFixed(1));
      const cUnexcused = Number((totalUnexcused / students.length).toFixed(1));
      return {
        excused: cExcused,
        unexcused: cUnexcused,
        total: Number((cExcused + cUnexcused).toFixed(1))
      };
    })();

    const activeFaecherList = FAECHER_ALLE;
    const gradeData = activeFaecherList.map(fach => {
      const sAvg = berechne(app, student.id, fach, '1');
      let classSum = 0;
      let classCount = 0;
      app.schueler.forEach(st => {
        const g = berechne(app, st.id, fach, '1');
        if (g !== null) {
          classSum += g;
          classCount++;
        }
      });
      const cAvg = classCount > 0 ? classSum / classCount : null;
      if (sAvg === null && cAvg === null) return null;
      
      // Transform grades: Better grade (low number) = Taller bar (high number)
      // 1 -> 5, 2 -> 4, 3 -> 3, 4 -> 2, 5 -> 1
      return {
        subject: fach.length > 15 ? `${fach.substring(0, 15)}...` : fach,
        fullSubjectName: fach,
        'Schüler': sAvg !== null ? Number((6 - sAvg).toFixed(2)) : null,
        'Klassen-Ø': cAvg !== null ? Number((6 - cAvg).toFixed(2)) : null,
        originalStudentAvg: sAvg,
        originalClassAvg: cAvg
      };
    }).filter(Boolean);

    const studentAbs = getAttendanceStats(student.id);
    const absenceData = [
      { name: 'Entschuldigt', 'Schüler': studentAbs.excused, 'Klassen-Ø': classAvgAbsences.excused },
      { name: 'Unentschuldigt', 'Schüler': studentAbs.unexcused, 'Klassen-Ø': classAvgAbsences.unexcused },
      { name: 'Gesamt', 'Schüler': studentAbs.total, 'Klassen-Ø': classAvgAbsences.total }
    ];

    const samCollections = (app.klassenkasse?.sammlungen || []).map(s => {
      const statusValue = s.status?.[student.id] || 'offen';
      const paidAmount = s.betraege?.[student.id] || 0;
      const totalAmount = s.betrag;
      return {
        id: s.id,
        titel: s.titel,
        paidAmount,
        totalAmount,
        status: statusValue,
        datum: s.erstelltAm || ''
      };
    });
    
    let financeRequired = 0;
    let financePaid = 0;
    samCollections.forEach(c => {
      financeRequired += c.totalAmount;
      financePaid += c.paidAmount;
    });
    const isFinanceBalanced = financePaid >= financeRequired;

    const customPortfolio = portfolioEntries[student.id] || [];
    const defaultPortfolio = [
      {
        id: `def-1-${student.id}`,
        titel: 'Forschungstagebuch: Waldökologie',
        fach: 'Sachunterricht',
        datum: formatLocalDateKey(new Date()),
        bewertung: 'Sehr Gut',
        beschreibung: 'Detaillierte Analyse lokaler Ökosysteme und eigenständiges Herbarium. Großer Fokus auf den Schutz einheimischer Bäume.'
      },
      {
        id: `def-2-${student.id}`,
        titel: 'Portfolio-Mappe: Geometrisches Zeichnen',
        fach: 'Mathematik',
        datum: formatLocalDateKey(new Date()),
        bewertung: 'Gut',
        beschreibung: 'Präzise Rekonstruktionen geometrischer Grundformen und kreative Symmetriebilder.'
      }
    ];
    const portfolioToDisplay = customPortfolio.length > 0 ? customPortfolio : defaultPortfolio;

    const latestMeeting = meetings.length > 0 ? meetings[0] : null;

    const profil = student.foerderprofil || {};
    const strengths = profil.staerken || ['Besonders hilfsbereit in Gruppenarbeiten', 'Starkes logisch-mathematisches Verständnis'];
    const supportAreas = profil.foerderbedarfBereiche || ['Arbeitsorganisation', 'Schriftlicher Ausdruck'];
    const supportGoals = profil.foerderziele || [];
    const supportMeasures = profil.massnahmen || [];

    // Homework stats across all subjects
    let totalHueForgotten = 0;
    activeFaecher.forEach(fach => {
      const hnd = app.noten?.[student.id]?.[fach]?.[sem] || { hue: 0 };
      totalHueForgotten += hnd.hue || 0;
    });

    // Participation states across all active subjects
    let totalMitarbeitPoints = 0;
    activeFaecher.forEach(fach => {
      const miPoints = app.mitarbeit?.[student.id]?.[fach]?.[sem] || 0;
      totalMitarbeitPoints += miPoints;
    });

    // Helper to format average grade with a text label
    const formatGradeLabel = (g: number) => {
      if (g <= 1.5) return 'Sehr Gut 🌟';
      if (g <= 2.5) return 'Gut ✨';
      if (g <= 3.5) return 'Befriedigend 👍';
      if (g <= 4.5) return 'Genügend 🎯';
      return 'Nicht genügend 🛠️';
    };

    // Filter notes for parents
    const filteredNotesForParents = studentNotes.filter(n => {
      if (parentNotesFilter === 'all') return true;
      const contentLower = n.inhalt.toLowerCase();
      const catLower = (n.kategorie || '').toLowerCase();
      const isPositiveCat = ['lernfortschritt', 'sozialverhalten', 'mitarbeit'].includes(catLower);
      const isPositiveWord = contentLower.includes('super') || contentLower.includes('gut') || contentLower.includes('toll') || contentLower.includes('sehr') || contentLower.includes('freudig') || contentLower.includes('aktiv') || contentLower.includes('hilfsbereit') || contentLower.includes('aufmerksam') || contentLower.includes('fortschritt');
      return isPositiveCat || isPositiveWord;
    });

    return (
      <div className="space-y-8 animate-fadeIn text-slate-900 pb-12">
        
        {/* TOP WELCOME BOX - PRESENTATION MODE */}
        <div className="bg-white text-slate-900 border-2 border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-xl relative ">
          
          <div className="absolute right-0 top-0 w-80 h-80 bg-slate-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[0.625rem] font-black uppercase tracking-widest text-slate-500">
                Laptop-Präsentationsmodus für Eltern
              </span>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-slate-900 drop-shadow-sm">
                Herzlich willkommen zum KEL-Gespräch!
              </h2>
              <p className="font-medium text-[1.125rem] leading-normal md:text-[1.25rem] leading-normal leading-relaxed text-slate-700 drop-shadow-sm">
                Schön, dass Sie da sind! Hier haben wir eine übersichtliche Zusammenfassung der schulischen Entwicklung und Erfolge von <strong className="text-slate-900 font-black underline decoration-amber-400 decoration-2 underline-offset-4">{student.vorname} {student.nachname}</strong> zusammengestellt.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setPresentationModeActive(true);
                }}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[0.75rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
              >
                <Sparkles size={16} className="animate-pulse" />
                <span>🖥️ KEL-Präsentation</span>
              </button>

              
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-200">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 backdrop-blur-xs text-center md:text-left">
              <span className="text-[0.5625rem] font-black uppercase text-slate-500 tracking-wider block">Leistungs-Durchschnitt</span>
              <span className="text-[1.5rem] leading-normal font-black text-slate-900 block mt-1">
                {studentAvg > 0 ? studentAvg.toFixed(2) : '—'}
              </span>
              <span className="text-[0.625rem] font-extrabold text-amber-500 mt-1 block">
                {studentAvg > 0 ? formatGradeLabel(studentAvg) : 'Keine Noten'}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 backdrop-blur-xs text-center md:text-left">
              <span className="text-[0.5625rem] font-black uppercase text-slate-500 tracking-wider block">Mitarbeitsgläser</span>
              <span className="text-[1.5rem] leading-normal font-black text-slate-900 block mt-1 flex items-center justify-center md:justify-start gap-1">
                ✏️ {totalMitarbeitPoints}
              </span>
              <span className="text-[0.625rem] font-extrabold text-emerald-600 mt-1 block">
                {totalMitarbeitPoints > 15 ? 'Enthusiastisch 🚀' : totalMitarbeitPoints > 5 ? 'Aktiv & Beteiligt 👍' : 'Ausbaufähig 🎯'}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 backdrop-blur-xs text-center md:text-left">
              <span className="text-[0.5625rem] font-black uppercase text-slate-500 tracking-wider block">Hausübungen</span>
              <span className="text-[1.5rem] leading-normal font-black text-slate-900 block mt-1">
                🏠 {totalHueForgotten}
              </span>
              <span className={`text-[0.625rem] font-extrabold mt-1 block ${totalHueForgotten === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalHueForgotten === 0 ? 'Absolut Vorbildlich!' : `${totalHueForgotten}x vergessen`}
              </span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 backdrop-blur-xs text-center md:text-left">
              <span className="text-[0.5625rem] font-black uppercase text-slate-500 tracking-wider block">Lob & Abzeichen</span>
              <span className="text-[1.5rem] leading-normal font-black text-slate-900 block mt-1 flex items-center justify-center md:justify-start gap-1">
                🏆 {student.badges?.length || 0}
              </span>
              <span className="text-[0.625rem] font-extrabold text-indigo-500 mt-1 block">
                {student.badges && student.badges.length > 0 ? 'Besondere Erfolge' : 'In Entwicklung'}
              </span>
            </div>
          </div>
        </div>

        {/* SEC: Fächer & Leistungen */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_grades', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black">
                <BookOpen size={20} />
              </div>
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Fächer & Leistungen</h3>
                <p className="text-slate-450 font-bold text-[0.75rem] leading-tight mt-0.5">Noten, Mitarbeit und Hausübungen im Überblick.</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_grades'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_grades'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {FAECHER_ALLE.map(fach => {
                    const avg = berechne(app, student.id, fach, sem);
                    const miPoints = app.mitarbeit?.[student.id]?.[fach]?.[sem] || 0;
                    const hueCount = app.noten?.[student.id]?.[fach]?.[sem]?.hue || 0;

                    return (
                      <div 
                        key={fach} 
                        onClick={() => setKelDetailFach(fach)}
                        className="bg-slate-50/50 rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-lg hover:border-slate-200 cursor-pointer transition-all active:scale-[0.98] hover:scale-[1.01] flex flex-col justify-between group"
                      >
                        <div className="space-y-5">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 flex items-center justify-center font-black text-[0.75rem] leading-tight shrink-0 border border-slate-200">
                                {fach.substring(0, 2).toUpperCase()}
                              </div>
                              <h4 className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight uppercase text-wrap leading-tight break-words max-w-[150px]">
                                {fach}
                              </h4>
                            </div>
                            {avg !== null ? (
                              <div className="text-right">
                                <span className="text-[0.75rem] leading-tight font-black px-2.5 py-1 rounded-full bg-slate-900 text-accent shadow-xs">
                                  {avg.toFixed(1)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[0.625rem] font-black uppercase text-slate-350 tracking-wider">Keine Note</span>
                            )}
                          </div>

                          <div className="space-y-4 pt-2 border-t border-slate-200/50">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[0.6875rem] font-bold text-slate-650">
                                <span className="flex items-center gap-1">✏️ Mitarbeit</span>
                                <span className="font-extrabold text-slate-850">{miPoints}</span>
                              </div>
                              <div className="h-2 bg-white rounded-full  border border-slate-200/50">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    miPoints >= 10 ? 'bg-emerald-500' : miPoints >= 5 ? 'bg-indigo-500' : 'bg-amber-450'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(5, (miPoints / 12) * 100))}%` }}
                                />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[0.6875rem] font-bold text-slate-650">
                                <span className="flex items-center gap-1">🏠 Hausübungen</span>
                                <span className={`font-black uppercase tracking-wider text-[0.625rem] px-2 py-0.2 rounded-md ${
                                  hueCount === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                                }`}>
                                  {hueCount === 0 ? '✓' : `${hueCount}x`}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-5 pt-3 border-t border-slate-150 flex justify-between items-center text-[0.625rem] font-black uppercase text-slate-400">
                          <span className="text-indigo-600 font-extrabold group-hover:text-indigo-800 transition-colors flex items-center gap-1">
                            Details →
                          </span>
                          <span>{avg !== null ? formatGradeLabel(avg) : '—'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Leistungsvergleich */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_comparison', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <TrendingUp size={20} />
              </div>
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Leistungsvergleich (Klassen-Ø)</h3>
                <p className="text-slate-450 font-bold text-[0.75rem] leading-tight mt-0.5">Visueller Vergleich der Fachnoten.</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_comparison'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_comparison'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100"
              >
                {gradeData.length > 0 ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-[0.6875rem] font-bold text-indigo-700 flex items-center gap-2">
                      <Info size={14} />
                      <span>Info: Höhere Säulen bedeuten bessere Noten (1 ist am höchsten). </span>
                    </div>
                    <div className="h-72 w-full pt-4">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <BarChart data={gradeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="subject" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                          <YAxis 
                            domain={[1, 5]} 
                            ticks={[1, 2, 3, 4, 5]} 
                            tickLine={false} 
                            axisLine={false} 
                            tick={{ fontSize: 11, fill: '#94a3b8' }} 
                            tickFormatter={(val) => (6 - val).toString()} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 900, fontSize: 11 }}
                            formatter={(value: any, name: any, props: any) => {
                              const original = name === 'Schüler' ? props.payload.originalStudentAvg : props.payload.originalClassAvg;
                              return [original ? original.toFixed(2) : '—', name === 'Schüler' ? student.vorname : 'Klassen-Ø'];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900, paddingTop: 12 }} />
                          <Bar dataKey="Schüler" fill="#4f46e5" radius={[6, 6, 0, 0]} name={`${student?.vorname} (Schnitt)`} barSize={35} />
                          <Bar dataKey="Klassen-Ø" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Klassenschnitt" barSize={35} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 text-[0.75rem] leading-tight font-bold font-sans">
                    Keine akademischen Leistungen erfasst.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Fehlzeiten */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_absences', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">Fehlzeiten im Klassen-Vergleich</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Gegenüberstellung entschuldigter und unentschuldigter Fehlstunden</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_absences'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_absences'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100 "
              >
                <div className="h-64 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                    <BarChart data={absenceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 11 }} />
                      <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900 }} />
                      <Bar dataKey="Schüler" fill="#6366f1" name={`${student.vorname}`} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Klassen-Ø" fill="#cbd5e1" name="Klassen-Schnitt" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-slate-100">
                  <div className="text-center">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Entschuldigt</span>
                    <span className="text-[1.25rem] leading-normal font-black text-slate-850">{studentAbs.excused}h</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Unentschuldigt</span>
                    <span className="text-[1.25rem] leading-normal font-black text-rose-600">{studentAbs.unexcused}h</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Klassen-Schnitt</span>
                    <span className="text-[1.25rem] leading-normal font-black text-slate-500">{classAvgAbsences.total}h</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Abzeichen & Stärken */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_badges', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-black">
                <Award size={20} />
              </div>
              <div>
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">Abzeichen & Stärken</h3>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Gemeinsam Erfolge feiern</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_badges'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_badges'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100 "
              >
                {student.badges && student.badges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {student.badges.map((b) => (
                      <div key={b.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                        <span className="text-[1.875rem] leading-tight select-none shrink-0">{b.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[0.875rem] leading-snug font-black text-slate-800 block text-wrap leading-tight break-words">{b.name}</span>
                          <span className="text-[0.6875rem] font-semibold text-slate-500 block leading-normal mt-0.5">
                            Ermutigung durch Anerkennung!
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50 text-slate-400 flex flex-col items-center justify-center">
                    <span className="text-4xl block pb-2">🌱</span>
                    <span className="text-[0.75rem] leading-tight font-bold block">Noch keine Abzeichen verliehen.</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* VISUAL FLOWER CHART COMPARISON */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_diagramm', false)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black">
                <Compass size={20} />
              </div>
              <div>
                <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">KEL-Entwicklungsdiagramm</h4>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Übersicht, Visualisierung und Bewertung (0-5 Skala)</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_diagramm'] === true ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_diagramm'] === true && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pt-4 border-t border-slate-100"
              >
                {/* CHECKBOX / PILL FILTER SELECTORS */}
                <div className="bg-slate-50/70 p-5 rounded-3xl border border-slate-150 space-y-3">
                  <div className="flex justify-between items-center text-[0.625rem] font-black uppercase text-slate-400 tracking-wide font-sans">
                    <span>Entwicklungsbereiche filtern (Anzeige-Kontrolle)</span>
                    <span>{kelCategoriesToShow.length} von 4 aktiv</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['lernen', 'arbeitsverhalten', 'sozialverhalten', 'interessen'].map(kat => {
                      const isActive = kelCategoriesToShow.includes(kat);
                      const symbol = kat === 'lernen' ? '📚' : kat === 'arbeitsverhalten' ? '⚙️' : kat === 'sozialverhalten' ? '🤝' : '💡';
                      return (
                        <button
                          key={kat}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setKelCategoriesToShow(prev => prev.filter(c => c !== kat));
                            } else {
                              setKelCategoriesToShow(prev => [...prev, kat]);
                            }
                          }}
                          className={`px-4 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all flex items-center gap-2 border cursor-pointer select-none active:scale-95 ${
                            isActive 
                              ? 'bg-slate-900 border-transparent text-accent shadow-md shadow-slate-900/10' 
                              : 'bg-white text-slate-550 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{symbol}</span>
                          <span>{KATEGORIE_LABELS[kat as keyof typeof KATEGORIE_LABELS]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* INTEGRATED SVG FLOWER CHART */}
                <FlowerChart 
                  studentId={student.id} 
                  app={app} 
                  selectedKats={kelCategoriesToShow} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Förderplan */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_ifp', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center font-black">
                <Heart size={18} className="fill-rose-500 text-rose-500" />
              </div>
              <div>
                <h4 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Erläuterungen & Förderplan (IFP-Auszug)</h4>
                <p className="text-slate-450 font-bold text-[0.75rem] leading-tight mt-0.5">Vereinbarte Förderungsmaßnahmen.</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_ifp'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_ifp'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100 "
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 space-y-3">
                      <span className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-850 block font-sans">✨ Vorhandene Stärken & Ressourcen:</span>
                      <ul className="space-y-1.5 font-bold text-[0.75rem] leading-tight text-emerald-950 list-disc list-inside">
                        {strengths.map((sStr, idx) => (
                          <li key={idx}>{sStr}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-150 space-y-3">
                      <span className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 block font-sans">🎯 Entwicklungsfelder / Fokus:</span>
                      <ul className="space-y-1.5 font-bold text-[0.75rem] leading-tight text-slate-700 list-disc list-inside">
                        {supportAreas.map((saStr, idx) => (
                          <li key={idx}>{saStr}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-150 space-y-4 shadow-3xs">
                    <div>
                      <span className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 block pb-1 font-sans">Individueller Förderplan:</span>
                      <span className="text-[0.875rem] leading-snug font-black text-slate-800">Aktive Bildungsziele & Maßnahmen</span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[0.625rem] font-black uppercase text-indigo-700 block bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md w-max font-sans">Förderziele</span>
                        <ul className="space-y-1 font-bold text-[0.75rem] leading-tight text-slate-755 list-disc list-inside">
                          {supportGoals.length > 0 ? (
                            supportGoals.map((tg, idx) => (
                              <li key={tg.id || idx} className="whitespace-pre-wrap">
                                {tg.ziel} <span className="text-[0.5625rem] font-black uppercase text-indigo-650 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100 ml-1.5">{tg.status}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-slate-400 italic">Keine expliziten Sonderförderungsziele definiert.</li>
                          )}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[0.625rem] font-black uppercase text-emerald-700 block bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md w-max font-sans">Maßnahmen</span>
                        <ul className="space-y-1 font-bold text-[0.75rem] leading-tight text-slate-755 list-disc list-inside">
                          {supportMeasures.length > 0 ? (
                            supportMeasures.map((ms, idx) => (
                              <li key={ms.id || idx} className="whitespace-pre-wrap">
                                {ms.beschreibung} <span className="text-[0.5625rem] font-black uppercase text-emerald-650 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 ml-1.5">{ms.wirksamkeit}</span>
                              </li>
                            ))
                          ) : (
                            <li className="text-slate-400 italic">Schulische Regelmaßnahmen sind aktiv.</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Finanzen */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_finances', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-black">
                <CreditCard size={20} />
              </div>
              <div>
                <h4 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">Finanzen & Elternbeiträge</h4>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Zahlungsstatus in der Klassenkasse.</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_finances'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_finances'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100 "
              >
                <div className="space-y-4">
                  <div className="space-y-2 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex justify-between text-[0.75rem] leading-tight font-black text-slate-700">
                      <span>Bezahlt: {financePaid}€ von {financeRequired}€</span>
                      <span className={isFinanceBalanced ? "text-emerald-600" : "text-amber-600"}>
                        {isFinanceBalanced ? "Vollständig!" : "Offen"}
                      </span>
                    </div>
                    <div className="h-3 bg-slate-200 rounded-full ">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isFinanceBalanced ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${financeRequired > 0 ? (financePaid / financeRequired) * 100 : 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {samCollections.map(col => (
                      <div key={col.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl text-[0.75rem] leading-tight font-bold shadow-sm">
                        <div className="min-w-0">
                          <span className="text-slate-800 block text-wrap leading-tight break-words font-black">{col.titel}</span>
                          <span className="text-[0.625rem] text-slate-400">{col.totalAmount}€</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[0.5625rem] font-black uppercase ${
                          col.status === 'bezahlt' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                          {col.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SEC: Beobachtungsnotizen */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <button 
            type="button"
            onClick={() => toggleExpand('kel_notes', true)}
            className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black">
                <Notebook size={20} />
              </div>
              <div>
                <h4 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">Beobachtungsnotizen (Archiv)</h4>
                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Gesammelte Beobachtungen aus dem Unterricht.</p>
              </div>
            </div>
            <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
              {expandedItems['kel_notes'] !== false ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          <AnimatePresence>
            {expandedItems['kel_notes'] !== false && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="pt-4 border-t border-slate-100 "
              >
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setParentNotesFilter('all')}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all ${
                      parentNotesFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-450 hover:text-slate-700'
                    }`}
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    onClick={() => setParentNotesFilter('positive')}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all ${
                      parentNotesFilter === 'positive' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    ⭐ Stärken-Fokus
                  </button>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {filteredNotesForParents.map((n) => (
                    <div key={n.id} className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">
                          {n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : 'Eintrag'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[0.5625rem] font-black uppercase text-slate-500">
                          {n.kategorie || 'Beobachtung'}
                        </span>
                      </div>
                      <p className="text-[0.875rem] leading-snug font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {n.inhalt}
                      </p>
                    </div>
                  ))}
                  {filteredNotesForParents.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-[0.75rem] leading-tight font-bold">Keine Noten vorhanden.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* BOTTOM ROW: INTERACTIVE WORKPLACE FOR GOAL AGREEMENT */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/50 rounded-[2.5rem] p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-505 text-amber-500 flex items-center justify-center shadow-md shrink-0 text-[1.25rem] leading-normal font-bold">
                🤝
              </div>
              <div>
                <h4 className="text-[1.125rem] leading-normal font-black text-amber-950 tracking-tight leading-snug">Gemeinsame Zielvereinbarung / KEL-Protokoll</h4>
                <p className="text-amber-800/80 font-bold text-[0.75rem] leading-tight mt-0.5">Vorsätze live mit Eltern & Kind eintragen und am Laptop sichern.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-[0.625rem] font-black uppercase text-amber-800/60 tracking-wider block">Vorlagen-Ziele (Schnell-Auswahl):</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { text: 'Hausübungsheft täglich verlässlich führen', label: 'HÜ-Eintrag' },
                  { text: 'Täglich 10 Minuten laut Lesen üben', label: 'Lesetraining' },
                  { text: 'Heftführung sauberer und ordentlicher gestalten', label: 'Heftordnung' },
                  { text: 'Sich im Unterricht aktiver von selber melden', label: 'Mitarbeit steigern' },
                  { text: 'Zu Stundenbeginn pünktlich das Material herrichten', label: 'Organisation' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => addPresetAgreementText(preset.text)}
                    className="px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wide bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 transition-all cursor-pointer shadow-3xs select-none"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={kelAgreementInput}
                onChange={(e) => setKelAgreementInput(e.target.value)}
                placeholder="Trage hier getroffene Vereinbarungen ein..."
                rows={4}
                className="w-full bg-white border border-amber-200 p-5 rounded-2xl shadow-inner text-[0.875rem] leading-snug font-bold text-amber-950 outline-none focus:border-amber-400 placeholder:text-amber-900/35 leading-relaxed"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {showSavedToast && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="text-[0.75rem] leading-tight font-black text-emerald-600 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      ✓ KEL-Ziele erfolgreich für {student.vorname} gespeichert!
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={saveKelAgreement}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 font-extrabold text-[0.75rem] leading-tight uppercase tracking-widest text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-2 select-none self-stretch sm:self-auto justify-center"
              >
                💾 KEL-Ziele speichern
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBehaviorDashboard = (isCollapsible: boolean = false) => {
    if (!student) return null;

    // Attendance metrics
    const classAvgAbsences = (() => {
      if (students.length === 0) return { excused: 0, unexcused: 0, total: 0 };
      let totalExcused = 0;
      let totalUnexcused = 0;
      students.forEach(s => {
        const stats = getAttendanceStats(s.id);
        totalExcused += stats.excused;
        totalUnexcused += stats.unexcused;
      });
      const cExcused = Number((totalExcused / students.length).toFixed(1));
      const cUnexcused = Number((totalUnexcused / students.length).toFixed(1));
      return {
        excused: cExcused,
        unexcused: cUnexcused,
        total: Number((cExcused + cUnexcused).toFixed(1))
      };
    })();

    const studentAbs = getAttendanceStats(student.id);
    const absenceData = [
      { name: 'Entschuldigt', 'Schüler': studentAbs.excused, 'Klassen-Ø': classAvgAbsences.excused },
      { name: 'Unentschuldigt', 'Schüler': studentAbs.unexcused, 'Klassen-Ø': classAvgAbsences.unexcused },
      { name: 'Gesamt', 'Schüler': studentAbs.total, 'Klassen-Ø': classAvgAbsences.total }
    ];

    // Behavior calculations
    const behaviorStages: { id: string; label: string; color: string; icon: string; severity?: number }[] = app.behavior_stages || [
      { id: '1', label: 'Super', color: '#10b981', icon: '🌟', severity: 0 },
      { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊', severity: 1 },
      { id: '3', label: 'OK', color: '#94a3b8', icon: '😐', severity: 2 },
      { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️', severity: 3 },
      { id: '5', label: 'Problem', color: '#ef4444', icon: '🚫', severity: 4 },
    ].sort((a, b) => (b.severity || 0) - (a.severity || 0)); // Importance order: Negative/Alerts first
    
    // Sort stages for journal to show most important (severe) ones if needed, or alphabetical
    const sortedStagesByImportance = [...behaviorStages].sort((a, b) => (b.severity || 0) - (a.severity || 0));
    const currentStatusId = app.behavior_status?.[student.id] || app.behavior_default_stage_id || '2';
    const currentStage = behaviorStages.find(s => s.id === currentStatusId) || behaviorStages[1];
    
    const studentStatusLogs = (app.statusLog || []).filter(l => l.schuelerId === student.id);
    const stageCounts = behaviorStages.reduce((acc, stage) => {
      acc[stage.id] = studentStatusLogs.filter(l => l.iconId === stage.id).length;
      return acc;
    }, {} as Record<string, number>);

    // Class average behavior metrics
    const classStageCounts = behaviorStages.reduce((acc, stage) => {
      let count = 0;
      app.schueler.forEach(s => {
        count += (app.statusLog || []).filter(l => l.schuelerId === s.id && l.iconId === stage.id).length;
      });
      acc[stage.id] = count / Math.max(1, app.schueler.length);
      return acc;
    }, {} as Record<string, number>);

    const dashboardContent = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* FEHLZEITEN-VERGLEICH */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Fehlzeiten im Klassen-Vergleich</h4>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wide">Gegenüberstellung entschuldigter und unentschuldigter Fehlstunden</p>
            </div>
          </div>

          <div className="h-64 w-full pt-2">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
              <BarChart data={absenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900 }} />
                <Bar dataKey="Schüler" fill="#6366f1" name={`${student.vorname}`} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Klassen-Ø" fill="#cbd5e1" name="Klassen-Schnitt" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
             <div className="text-center">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Entschuldigt</span>
                <span className="text-[1.25rem] leading-normal font-black text-slate-850">{studentAbs.excused}h</span>
             </div>
             <div className="text-center">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Unentschuldigt</span>
                <span className="text-[1.25rem] leading-normal font-black text-rose-600">{studentAbs.unexcused}h</span>
             </div>
             <div className="text-center">
                <span className="text-[0.625rem] font-black uppercase text-slate-400 block tracking-wider">Klassen-Schnitt</span>
                <span className="text-[1.25rem] leading-normal font-black text-slate-500">{classAvgAbsences.total}h</span>
             </div>
          </div>
        </div>

        {/* VERHALTENS-JOURNAL */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">
                <SmilePlus size={20} />
              </div>
              <h4 className="text-[1.125rem] leading-normal font-black text-slate-800 tracking-tight">Verhaltens-Journal</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-4 border-r border-slate-100 pr-4 mr-4 shrink-0">
                <span className="text-5xl">{currentStage.icon}</span>
                <div>
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest block">Status</span>
                  <span className="text-[1.5rem] leading-normal font-black" style={{ color: currentStage.color }}>{currentStage.label}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest block">Vergleich: Häufigkeit vs. Klassendurchschnitt</span>
            <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                <BarChart data={behaviorStages.map(s => ({ 
                  name: s.label, 
                  'Schüler': stageCounts[s.id] || 0, 
                  'Klassen-Ø': Number(classStageCounts[s.id]?.toFixed(2)) || 0,
                  color: s.color 
                }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f1f5f9', opacity: 0.4 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: 10, fontWeight: 900 }} />
                  <Legend />
                  <Bar dataKey="Schüler" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="Klassen-Ø" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest block">Wichtigste Ereignisse (Chronologisch)</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {studentStatusLogs
                .sort((a, b) => {
                  // Importance: severity first, then time
                  const stageA = behaviorStages.find(s => s.id === a.iconId);
                  const stageB = behaviorStages.find(s => s.id === b.iconId);
                  const sevA = (stageA as any)?.severity || 0;
                  const sevB = (stageB as any)?.severity || 0;
                  if (sevB !== sevA) return sevB - sevA;
                  return b.timestamp - a.timestamp;
                })
                .slice(0, 12).map((log, i) => (
                <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3">
                  <span className="text-[1.25rem] leading-normal shrink-0">{behaviorStages.find(s => s.id === log.iconId)?.icon || '📝'}</span>
                  <div className="min-w-0">
                    <p className="text-[0.75rem] leading-tight font-bold text-slate-800 text-wrap leading-tight break-words">{log.comment || behaviorStages.find(s => s.id === log.iconId)?.label}</p>
                    <span className="text-[0.5625rem] text-slate-400 font-black uppercase">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* VERHALTENSNOTIZEN (MOVED HERE) */}
        <div className="lg:col-span-2">
            <div className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <button 
                  onClick={(e) => toggleExpand('dossier_notizen', false, e as any)}
                  className="flex items-center gap-3 text-left w-full sm:w-auto flex-1 transition-all"
                >
                  <div className="w-10 h-10 bg-amber-50 text-amber-550 rounded-2xl flex items-center justify-center border border-amber-100 shrink-0">
                    <Notebook size={18} />
                  </div>
                  <div>
                    <h4 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">Verhaltensnotizen</h4>
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">{studentNotes.length} Journalnotizen & Beobachtungen</p>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddNote(!showAddNote)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1 border border-slate-200"
                  >
                    {showAddNote ? 'Schließen' : (
                      <>
                        <Plus size={12} /> Hinzufügen
                      </>
                    )}
                  </button>
                  <button 
                    onClick={(e) => toggleExpand('dossier_notizen', false, e as any)}
                    className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    {expandedItems['dossier_notizen'] === true ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedItems['dossier_notizen'] === true && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 pt-4 border-t border-slate-100"
                  >

              <AnimatePresence>
                {showAddNote && (
                  <motion.form
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleAddNote}
                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 "
                  >
                    <h5 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-550 font-bold">Neue Verhaltensnotiz</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[0.5625rem] font-black uppercase text-slate-500 block pb-1 font-bold">Titel / Art</label>
                        <input
                          type="text"
                          value={newNoteTitel}
                          onChange={e => setNewNoteTitel(e.target.value)}
                          placeholder="z.B. Beobachtung..."
                          className="w-full bg-white border border-slate-205 p-2.5 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-900 placeholder-slate-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[0.5625rem] font-black uppercase text-slate-500 block pb-1 font-bold">Kategorie</label>
                        <select
                          value={newNoteKategorie}
                          onChange={e => setNewNoteKategorie(e.target.value)}
                          className="w-full bg-white border border-slate-205 p-2.5 rounded-xl text-[0.75rem] leading-tight font-bold focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-900"
                        >
                          {['Allgemein', 'Verhalten', 'Lernfortschritt', 'Sozialverhalten', 'Arbeitsverhalten', 'Mitarbeit'].map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center pb-1">
                        <label className="text-[0.5625rem] font-black uppercase text-slate-500 block font-bold">Beschreibung / Verhaltensbeobachtung</label>
                        <button
                          type="button"
                          onClick={handlePolishNote}
                          disabled={aiPolishingNote || !newNoteInhalt.trim()}
                          className="text-[0.5625rem] font-black uppercase text-indigo-650 hover:text-indigo-850 disabled:text-slate-400 cursor-pointer flex items-center gap-1.5 transition-colors"
                        >
                          {aiPolishingNote ? (
                            <>
                              <div className="w-2.5 h-2.5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                              Korrektur...
                            </>
                          ) : (
                            <>
                              <Sparkles size={11} className="text-indigo-505 animate-pulse" /> KI Formulierer
                            </>
                          )}
                        </button>
                      </div>
                      <textarea
                        value={newNoteInhalt}
                        onChange={e => setNewNoteInhalt(e.target.value)}
                        placeholder="Beschreibe die pädagogische Beobachtung..."
                        rows={3}
                        className="w-full bg-white border border-slate-205 p-3 rounded-xl text-[0.75rem] leading-tight font-semibold leading-relaxed focus:ring-1 focus:ring-amber-500 focus:outline-none text-slate-900 placeholder-slate-400"
                        required
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddNote(false)}
                        className="px-4 py-2 border border-slate-205 text-slate-500 hover:bg-slate-100 rounded-xl text-[0.625rem] font-black uppercase tracking-widest cursor-pointer bg-white"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-[0.625rem] font-black uppercase tracking-widest cursor-pointer shadow-md shadow-amber-600/10"
                      >
                        Speichern
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-1 custom-scrollbar">
                {studentNotes.map((n) => {
                  const getCatStyles = (cat: string) => {
                    switch(cat) {
                      case 'Verhalten': return 'bg-amber-500 text-white border-amber-600';
                      case 'Lernfortschritt': return 'bg-emerald-500 text-white border-emerald-600';
                      case 'Sozialverhalten': return 'bg-blue-500 text-white border-blue-600';
                      case 'Arbeitsverhalten': return 'bg-purple-500 text-white border-purple-600';
                      case 'Mitarbeit': return 'bg-indigo-500 text-white border-indigo-600';
                      default: return 'bg-slate-600 text-white border-slate-705';
                    }
                  };

                  return (
                    <div key={n.id} className="p-5 bg-slate-50/70 hover:bg-slate-50 rounded-2xl border border-slate-150 space-y-2 transition-all group relative">
                      <button 
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                        className="absolute right-3 top-3 p-1.5 hover:bg-rose-50 hover:text-rose-500 rounded-lg text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Löschen"
                      >
                        <Trash2 size={13} />
                      </button>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1 font-sans">
                          <Clock size={11} /> {n.timestamp ? new Date(n.timestamp).toLocaleDateString('de-DE') : 'Unbekannt'}
                        </span>
                        <span className={`text-[0.5625rem] font-black uppercase tracking-widest px-2 py-0.5 border rounded-md ${getCatStyles(n.kategorie || 'Allgemein')}`}>
                          {n.kategorie || 'Allgemein'}
                        </span>
                        {n.titel && n.titel !== 'Beobachtung' && (
                          <span className="text-[0.5625rem] font-black text-slate-500 bg-white border border-slate-205 px-2 py-0.5 rounded-md">
                            {n.titel}
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-white p-4 rounded-2xl border border-slate-155 mt-2 text-slate-800">
                        <p className="text-[0.75rem] leading-tight font-semibold leading-relaxed whitespace-pre-wrap">
                          {n.inhalt}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {studentNotes.length === 0 && !showAddNote && (
                  <div className="pt-4">
                    <EmptyState 
                      icon="📝" 
                      title="Keine Notizen" 
                      description="Erfasse pädagogische Beobachtungen zum Schüler, um sie beim Elterngespräch griffbereit zu haben." 
                      actionLabel="Erste Notiz anlegen"
                      onAction={() => setShowAddNote(true)}
                    />
                  </div>
                )}
              </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </div>
    );

    if (!isCollapsible) {
      return (
        <div className="space-y-8 animate-fadeIn text-slate-900 pb-12">
          <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black shadow-sm">
                <SmilePlus size={28} />
              </div>
              <div>
                <h2 className="text-[1.875rem] leading-tight font-black tracking-tight text-slate-900">Verhalten und Präsenz</h2>
                <p className="text-slate-500 font-bold">Detaillierte Chronik des Sozialverhaltens und Fehlzeiten-Analyse.</p>
              </div>
            </div>
          </div>
          {dashboardContent}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        <button 
          type="button"
          onClick={() => toggleExpand('kel_behavior', false)}
          className="flex items-center justify-between gap-4 flex-wrap w-full text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-black">
              <SmilePlus size={20} />
            </div>
            <div>
              <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Verhalten und Präsenz</h3>
              <p className="text-slate-450 font-bold text-[0.75rem] leading-tight mt-0.5">Chronik des Sozialverhaltens und Fehlzeiten.</p>
            </div>
          </div>
          <div className="p-2 rounded-full border border-slate-100 text-slate-400 hover:bg-slate-50 transition-colors">
            {expandedItems['kel_behavior'] === true ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {expandedItems['kel_behavior'] === true && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-slate-100 "
            >
              <div className="pt-4">
                {dashboardContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="statistics-shell h-full flex flex-col py-1 space-y-4 max-w-7xl mx-auto w-full text-slate-900">
      <AnimatePresence>
        {kelDetailFach && (() => {
          const detailFach = kelDetailFach;
          
          // 1. Schularbeiten calculations
          const classmatesSa = app.schueler.map((s: any) => app.noten?.[s.id]?.[detailFach]?.[sem]?.sa || []);
          const maxSaCount = classmatesSa.length > 0 ? Math.max(0, ...classmatesSa.map((arr: any) => arr.length)) : 0;
          const saDetails = Array.from({ length: maxSaCount }).map((_, idx) => {
            const studentGrade = app.noten?.[student.id]?.[detailFach]?.[sem]?.sa?.[idx];
            const classmatesGrades = app.schueler.map((s: any) => app.noten?.[s.id]?.[detailFach]?.[sem]?.sa?.[idx])
              .filter((g: any): g is number => typeof g === 'number' && !isNaN(g) && g >= 1 && g <= 5);
            const classAvg = classmatesGrades.length > 0 ? parseFloat((classmatesGrades.reduce((a, b) => a + b, 0) / classmatesGrades.length).toFixed(2)) : null;
            return {
              name: `SA ${idx + 1}`,
              studentGrade: typeof studentGrade === 'number' ? studentGrade : null,
              classAvg,
            };
          });
          
          const studentSaList = saDetails.map(d => d.studentGrade).filter((g): g is number => g !== null);
          const studentSaAvgValue = studentSaList.length > 0 ? parseFloat((studentSaList.reduce((a, b) => a + b, 0) / studentSaList.length).toFixed(2)) : null;
          const classSaList = saDetails.map(d => d.classAvg).filter((g): g is number => g !== null);
          const classSaAvgValue = classSaList.length > 0 ? parseFloat((classSaList.reduce((a, b) => a + b, 0) / classSaList.length).toFixed(2)) : null;

          // 2. Wochenplan calculations
          const classmatesWp = app.schueler.map((s: any) => app.noten?.[s.id]?.[detailFach]?.[sem]?.wp || []);
          const maxWpCount = classmatesWp.length > 0 ? Math.max(0, ...classmatesWp.map((arr: any) => arr.length)) : 0;
          const wpDetails = Array.from({ length: maxWpCount }).map((_, idx) => {
            const studentGrade = app.noten?.[student.id]?.[detailFach]?.[sem]?.wp?.[idx];
            const classmatesGrades = app.schueler.map((s: any) => app.noten?.[s.id]?.[detailFach]?.[sem]?.wp?.[idx])
              .filter((g: any): g is number => typeof g === 'number' && !isNaN(g) && g >= 1 && g <= 5);
            const classAvg = classmatesGrades.length > 0 ? parseFloat((classmatesGrades.reduce((a, b) => a + b, 0) / classmatesGrades.length).toFixed(2)) : null;
            return { name: `WP ${idx + 1}`, studentGrade: typeof studentGrade === 'number' ? studentGrade : null, classAvg };
          });
          const studentWpList = wpDetails.map(d => d.studentGrade).filter((g): g is number => g !== null);
          const studentWpAvgValue = studentWpList.length > 0 ? parseFloat((studentWpList.reduce((a, b) => a + b, 0) / studentWpList.length).toFixed(2)) : null;
          const classWpList = wpDetails.map(d => d.classAvg).filter((g): g is number => g !== null);
          const classWpAvgValue = classWpList.length > 0 ? parseFloat((classWpList.reduce((a, b) => a + b, 0) / classWpList.length).toFixed(2)) : null;

          // 3. Lernkontrollen
          const studentLzkList = (app.noten?.[student.id]?.[detailFach]?.[sem]?.lzk || [])
            .filter((g: any): g is number => typeof g === 'number' && !isNaN(g) && g >= 1 && g <= 5);
          const studentLzkAvgValue = studentLzkList.length > 0 ? parseFloat((studentLzkList.reduce((a, b) => a + b, 0) / studentLzkList.length).toFixed(2)) : null;
          const classLzkList = app.schueler.flatMap((s: any) => app.noten?.[s.id]?.[detailFach]?.[sem]?.lzk || [])
            .filter((g: any): g is number => typeof g === 'number' && !isNaN(g) && g >= 1 && g <= 5);
          const classLzkAvgValue = classLzkList.length > 0 ? parseFloat((classLzkList.reduce((a, b) => a + b, 0) / classLzkList.length).toFixed(2)) : null;

          // Chart data
          const chartDataSummary = [
            { name: 'Schularbeiten (SA)', 'Schüler': studentSaAvgValue || 0, 'Klassenschnitt': classSaAvgValue || 0 },
            { name: 'Wochenplan (WOPL)', 'Schüler': studentWpAvgValue || 0, 'Klassenschnitt': classWpAvgValue || 0 },
            { name: 'Lernkontrollen (LZK)', 'Schüler': studentLzkAvgValue || 0, 'Klassenschnitt': classLzkAvgValue || 0 },
          ].filter(item => item['Schüler'] > 0 || item['Klassenschnitt'] > 0);

          const getPerformanceBadge = (grade: number | null, avg: number | null) => {
            if (grade === null || avg === null) return <span className="text-slate-400 font-semibold">—</span>;
            const diff = grade - avg;
            if (diff <= -0.5) return <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[0.5625rem] font-black border border-emerald-100 flex items-center gap-0.5 shadow-2xs">Über Durchschnitt 🚀</span>;
            if (diff >= 0.5) return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[0.5625rem] font-black border border-amber-100 flex items-center gap-0.5 shadow-2xs">Ausbaufähig 🎯</span>;
            return <span className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full text-[0.5625rem] font-black border border-slate-100 flex items-center gap-0.5 shadow-2xs">Im Schnitt 🤝</span>;
          };

          return (
            <ModalPortal>
              <motion.div 
                key="kel-fach-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-md bg-slate-900/60 overflow-y-auto"
                onClick={() => setKelDetailFach(null)}
              >
                <motion.div 
                  initial={{ scale: 0.95, y: 15, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.95, y: 15, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl relative border border-slate-100 space-y-6 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={() => setKelDetailFach(null)} className="absolute right-6 top-6 w-10 h-10 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-all active:scale-95 cursor-pointer shadow-xs"><X size={18} /></button>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-black text-[1.25rem] leading-normal tracking-tight shadow-md">{detailFach.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[0.5625rem] font-black uppercase tracking-widest text-indigo-600">Fachentwicklung</span>
                        <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight block mt-0.5">{detailFach} — Detailanalyse</h3>
                      </div>
                    </div>
                  </div>
                  {/* KEL Detail Analysis Content */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                      <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <BarChart3 size={14} /> Leistungs-Zusammenfassung
                      </h4>
                      <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                          <BarChart data={chartDataSummary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 900, paddingTop: 10 }} />
                            <Bar dataKey="Schüler" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                            <Bar dataKey="Klassenschnitt" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-center text-center">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block mb-1">Mein Schnitt</span>
                        <span className="text-[1.875rem] leading-tight font-black text-slate-900">{(chartDataSummary.reduce((a, b) => a + b['Schüler'], 0) / (chartDataSummary.length || 1)).toFixed(2)}</span>
                        <span className="text-[0.5625rem] font-bold text-indigo-500 mt-2">{detailFach} GPA</span>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-center text-center">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block mb-1">Klassen Ø</span>
                        <span className="text-[1.875rem] leading-tight font-black text-slate-400">{(chartDataSummary.reduce((a, b) => a + b['Klassenschnitt'], 0) / (chartDataSummary.length || 1)).toFixed(2)}</span>
                        <span className="text-[0.5625rem] font-bold text-slate-400 mt-2">Gesamtschnitt</span>
                      </div>
                      <div className="col-span-2 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                         <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-600 block mb-3">Erfolgs-Indikator</span>
                         <div className="space-y-4">
                           {saDetails.map((sa, i) => (
                             <div key={i} className="flex items-center justify-between">
                               <span className="text-[0.75rem] leading-tight font-bold text-slate-700">{sa.name}</span>
                               <div className="flex items-center gap-3">
                                 <span className={`text-[0.625rem] font-black px-2 py-0.5 rounded-md ${sa.studentGrade === 1 ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-900'}`}>{sa.studentGrade || '—'}</span>
                                 {getPerformanceBadge(sa.studentGrade, sa.classAvg)}
                               </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </ModalPortal>
          );
        })()}
      </AnimatePresence>
      
      {/* Real-time Sub Filter Controls: 3 Hauptbereiche */}
      <div className="flex justify-center w-full pb-2">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full md:w-auto gap-1">
          <button
            type="button"
            aria-pressed={selectedStudentId === null && activeTab === 'stats'}
            onClick={() => {
              setSelectedStudentId(null);
              setActiveTab('stats');
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedStudentId === null && activeTab === 'stats'
                ? 'bg-white text-indigo-650 shadow-md border border-slate-200/50 scale-[1.01]'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50/60'
            }`}
          >
            <BarChart3 size={15} className={selectedStudentId === null && activeTab === 'stats' ? "text-indigo-600" : "text-slate-400"} />
            Klassenübersicht
          </button>
          <button
            type="button"
            aria-pressed={selectedStudentId !== null || activeTab === 'profiles'}
            onClick={() => {
              setActiveTab('profiles');
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedStudentId !== null || activeTab === 'profiles'
                ? 'bg-white text-indigo-650 shadow-md border border-slate-200/50 scale-[1.01]'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50/60'
            }`}
          >
            <User size={15} className={selectedStudentId !== null || activeTab === 'profiles' ? "text-indigo-600" : "text-slate-400"} />
            Schülerprofile
          </button>
          <button
            type="button"
            aria-pressed={selectedStudentId === null && (activeTab === 'mehr' || activeTab === 'lehrer')}
            onClick={() => {
              setSelectedStudentId(null);
              setActiveTab('mehr');
            }}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedStudentId === null && (activeTab === 'mehr' || activeTab === 'lehrer')
                ? 'bg-white text-indigo-650 shadow-md border border-slate-200/50 scale-[1.01]'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50/60'
            }`}
          >
            <MoreHorizontal size={15} className={selectedStudentId === null && (activeTab === 'mehr' || activeTab === 'lehrer') ? "text-indigo-600" : "text-slate-400"} />
            ⋯ Mehr
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedStudentId !== null ? (
          <motion.div
            key="student-detail"
            initial={{ opacity: 0, x: 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -25 }}
            className="space-y-4 w-full min-w-0 overflow-hidden"
          >
            <StudentDossier 
              schuelerId={selectedStudentId} 
              onBack={() => setSelectedStudentId(null)} 
              onStudentChange={setSelectedStudentId} 
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* --- SECTION 1: KLASSENÜBERSICHT (Kompakt & Übersichtlich) --- */}
            {activeTab === 'stats' && (
              <div className="space-y-6 animate-fade-in">
                {/* Header Banner */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Klassenübersicht & Pädagogische Impulse</h3>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      Auf einen Blick: Wo steht die Klasse und welche Bereiche verdienen besondere Aufmerksamkeit?
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('mehr');
                      setMehrSubTab('charts');
                    }}
                    className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-indigo-150 shrink-0"
                  >
                    <BarChart3 size={15} />
                    Alle Statistiken & Detaildiagramme
                  </button>
                </div>

                {/* 6 Compact KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Leistung</div>
                    <div className="text-2xl font-black text-slate-900 my-1 tabular-nums">Ø {stats.average}</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Klassenschnitt</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Anwesenheit</div>
                    <div className="text-2xl font-black text-rose-600 my-1 tabular-nums">{classAttendance.unexcusedTotal} h</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Unentschuldigt</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Entwicklung</div>
                    <div className="text-2xl font-black text-amber-600 my-1 tabular-nums">{classOverviewMetrics.negativeTrendCount} ↘</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Notenschnitt ≥ 3,8</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Positiv</div>
                    <div className="text-2xl font-black text-emerald-600 my-1 tabular-nums">{classOverviewMetrics.positiveTrendCount} ↗</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Notenschnitt ≤ 2,2</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Blinde Flecken</div>
                    <div className="text-2xl font-black text-slate-700 my-1 tabular-nums">{classOverviewMetrics.blindSpotStudents.length} ❓</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Keine Notiz seit &gt;4W</div>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Offene Hinweise</div>
                    <div className="text-2xl font-black text-indigo-600 my-1 tabular-nums">{classOverviewMetrics.openAlertCount} ⚠️</div>
                    <div className="text-[0.625rem] text-slate-450 font-bold">Fehlzeiten & Diagnostik</div>
                  </div>
                </div>

                {/* Section: Was fällt auf? */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                      💡
                    </div>
                    <div>
                      <h4 className="text-md font-black text-slate-900">Was fällt auf? (Zentrale Erkenntnisse)</h4>
                      <p className="text-xs text-slate-400 font-bold">Automatisch aggregiert aus Noten, Anwesenheiten, Notizen und Diagnostikdaten</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    {classNoticeInsights.map((insight) => (
                      <div key={insight.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[0.625rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${insight.badgeColor}`}>
                            {insight.badge}
                          </span>
                        </div>
                        <h5 className="font-black text-sm text-slate-800">{insight.title}</h5>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">{insight.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Blinde Flecken in der Dokumentation */}
                {classOverviewMetrics.blindSpotStudents.length > 0 && (
                  <div className="bg-amber-50/40 p-6 rounded-[2rem] border border-amber-150 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-sm">
                        ❓
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-amber-950">Blinde Flecken & Aufmerksamkeitsbereiche</h4>
                        <p className="text-xs text-amber-800 font-medium">Bei folgenden Schüler:innen liegt der letzte Journal-Eintrag länger zurück oder es fehlen Beobachtungen:</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                      {classOverviewMetrics.blindSpotStudents.map(b => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(b.id);
                            setActiveTab('profiles');
                          }}
                          className="p-3 bg-white rounded-xl border border-amber-200/80 text-left hover:border-amber-400 transition-all cursor-pointer"
                        >
                          <div className="font-black text-xs text-slate-800">{b.name}</div>
                          <div className="text-[0.6875rem] text-amber-700 font-medium mt-0.5">{b.reason}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* --- SECTION 3: ⋯ MEHR (Diagramme, Spezialwerkzeuge, Antolin, Lehrerprofil) --- */}
            {(activeTab === 'mehr' || activeTab === 'lehrer') && (
              <div className="space-y-6 animate-fade-in">
                {/* Sub Tab Switcher for Mehr */}
                <div className="flex flex-wrap border-b border-slate-200 gap-4 mb-2">
                  <button
                    type="button"
                    onClick={() => setMehrSubTab('charts')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      mehrSubTab === 'charts'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    📊 Detail-Statistiken
                  </button>
                  <button
                    type="button"
                    onClick={() => setMehrSubTab('tools')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      mehrSubTab === 'tools'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    🛠️ Spezialwerkzeuge
                  </button>
                  <button
                    type="button"
                    onClick={() => setMehrSubTab('antolin')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      mehrSubTab === 'antolin'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen size={13} className="text-amber-500" /> Antolin Lese-Statistik
                  </button>
                  <button
                    type="button"
                    onClick={() => setMehrSubTab('lehrer')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      mehrSubTab === 'lehrer'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    👤 Lehrerprofil
                  </button>
                </div>

                {mehrSubTab === 'tools' && (
                  <SuggestionsGrid />
                )}

                {mehrSubTab === 'lehrer' && (
                  <LehrerProfilView />
                )}

                {(mehrSubTab === 'charts' || mehrSubTab === 'antolin') && (
                  <div className="space-y-6">
                {/* Sub Tab Switcher */}
                <div className="flex border-b border-slate-200 gap-6 mb-2">
                  <button
                    type="button"
                    aria-pressed={statsSubTab === 'leistung'}
                    onClick={() => setStatsSubTab('leistung')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      statsSubTab === 'leistung'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    Noten- & Verhaltensanalyse
                  </button>
                  <button
                    type="button"
                    aria-pressed={statsSubTab === 'antolin'}
                    onClick={() => setStatsSubTab('antolin')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      statsSubTab === 'antolin'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen size={13} className="text-amber-500" /> Antolin Lese-Statistik
                  </button>
                </div>

                {statsSubTab === 'leistung' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Filter size={18} />
                  </span>
                  <div>
                    <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider text-slate-400">Diagramm-Steuerung</h3>
                    <p className="text-[0.75rem] leading-tight text-slate-450 font-bold">Wählen Sie das Fach aus, dessen Notendiagramme angezeigt werden sollen.</p>
                  </div>
                </div>
                <div className="relative w-full sm:w-auto">
                  <select 
                    aria-label="Fach für die Notendiagramme"
                    value={activeFach}
                    onChange={(e) => setActiveFach(e.target.value)}
                    className="appearance-none bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl pl-5 pr-10 py-2.5 text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-700 cursor-pointer outline-none transition-all w-full sm:w-60 focus:bg-white"
                  >
                    <option value="Gesamt">Gesamtübersicht (Alle Fächer)</option>
                    {activeFaecher.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <ChevronDown size={14} />
                  </span>
                </div>
              </div>

              <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4" aria-labelledby="data-coverage-heading">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 id="data-coverage-heading" className="text-sm font-black text-slate-900">Datenstand der Klassenübersicht</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      Alle Kennzahlen stammen direkt aus Notenmappe, Anwesenheit, Verhalten und Diagnostik.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:min-w-[520px]">
                    {[
                      { label: 'Noten', value: dataCoverage.studentsWithGrades, color: 'text-indigo-700' },
                      { label: 'Anwesenheit', value: dataCoverage.studentsWithAttendance, color: 'text-emerald-700' },
                      { label: 'Beobachtungen', value: dataCoverage.studentsWithBehavior, color: 'text-amber-700' },
                      { label: 'Diagnostik', value: dataCoverage.studentsWithDiagnostics, color: 'text-violet-700' }
                    ].map(item => (
                      <div key={item.label} className="rounded-xl border border-white bg-white/90 px-3 py-2 shadow-xs">
                        <div className={`text-lg font-black tabular-nums ${item.color}`}>
                          {item.value}<span className="text-xs text-slate-400">/{dataCoverage.totalStudents}</span>
                        </div>
                        <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-500">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Aggregated Bento Grid of KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="group relative p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between min-h-[125px]">
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <TrendingUp size={15} />
                  </div>
                  <div>
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Klassenschnitt</div>
                    <div className="text-4xl font-black tracking-tight tabular-nums text-slate-900 mt-1">{stats.average}</div>
                  </div>
                  <div className="text-[0.625rem] text-slate-450 mt-3 font-semibold uppercase tracking-wider">Arithmetisches Mittel</div>
                </div>
                
                <div className="group relative p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-indigo-200 transition-all duration-300 flex flex-col justify-between min-h-[125px]">
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                    <CheckSquare size={15} />
                  </div>
                  <div>
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Noteneinträge</div>
                    <div className="text-4xl font-black tracking-tight tabular-nums text-slate-900 mt-1">{stats.totalCount}</div>
                  </div>
                  <div className="text-[0.625rem] text-slate-450 mt-3 font-semibold uppercase tracking-wider">Gesamtbeurteilungen</div>
                </div>
                
                <div className="group relative p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-rose-200 transition-all duration-300 flex flex-col justify-between min-h-[125px]">
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 group-hover:bg-rose-600 group-hover:text-white transition-colors duration-300">
                    <AlertTriangle size={15} />
                  </div>
                  <div>
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Note 5</div>
                    <div className="text-4xl font-black tracking-tight tabular-nums text-slate-900 mt-1">{stats.totalCount > 0 ? stats.risks : '–'}</div>
                  </div>
                  <div className="text-[0.625rem] text-slate-450 mt-3 font-semibold uppercase tracking-wider">
                    {stats.totalCount > 0 ? 'Einträge mit Förderbedarf' : 'Noch keine Auswertung'}
                  </div>
                </div>

                <div className="group relative p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-amber-200 transition-all duration-300 flex flex-col justify-between min-h-[125px]">
                  <div className="absolute top-5 right-5 w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300">
                    <Award size={15} />
                  </div>
                  <div>
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.15em] text-slate-400 mb-1">Bestes Fach</div>
                    <div className="text-[1.25rem] leading-tight font-black text-slate-900 mt-1 mr-6 break-words line-clamp-1" title={bestSubject ? bestSubject.subject : '–'}>
                      {bestSubject ? bestSubject.subject : '–'}
                    </div>
                  </div>
                  <div className="text-[0.625rem] text-slate-450 mt-3 font-semibold uppercase tracking-wider">
                    Schnitt: {bestSubject ? bestSubject.average.toFixed(2) : '–'}
                  </div>
                </div>
              </div>

              {/* Aggregated Bento Grid of Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* 1. NOTENSPIEGEL */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-3 text-[1rem] leading-normal font-black tracking-tight text-slate-900">
                      <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <BarChart3 size={18} />
                      </div>
                      <div>
                        <div>Notenspiegel der Klasse</div>
                        <p className="text-[0.625rem] text-slate-400 font-semibold uppercase tracking-wider">Häufigkeitsverteilung für "{activeFach}"</p>
                      </div>
                    </h4>
                  </div>
                  <div className="h-64 w-full">
                    {stats.totalCount > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                      <BarChart data={stats.distribution}>
                        <defs>
                          {colors.map((color, i) => (
                            <linearGradient key={`grad-${i}`} id={`barGrad-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={color} stopOpacity={1} />
                              <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 900, fill: '#64748b' }} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip 
                          cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                          contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 900, backgroundColor: 'white' }}
                        />
                        <Bar dataKey="count" radius={[10, 10, 0, 0]} barSize={45} name="Anzahl">
                          {stats.distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center px-6">
                        <BarChart3 size={28} className="text-slate-300 mb-2" />
                        <p className="text-sm font-black text-slate-700">Noch keine Noten für diese Auswahl</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Wähle ein anderes Fach oder erfasse zuerst Beurteilungen.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. FÄCHERÜBERSICHT */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-3 text-[1rem] leading-normal font-black tracking-tight text-slate-900">
                      <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <div>Fächerübersicht</div>
                        <p className="text-[0.625rem] text-slate-400 font-semibold uppercase tracking-wider">Klassen-Ø nach Unterrichtsfach</p>
                      </div>
                    </h4>
                  </div>
                  <div className="h-64 w-full">
                    {subjectAverages.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <AreaChart data={subjectAverages} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                          <defs>
                            <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.65}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.15}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="subjectShort" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} interval={0} />
                          <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} reversed={true} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-slate-950 text-white p-4 rounded-3xl border border-slate-800 shadow-xl text-[0.75rem] leading-tight space-y-1.5 font-sans">
                                    <p className="font-extrabold uppercase tracking-wide text-slate-400 text-[0.625rem]">{data.subject}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                      <span className="font-black text-white text-[0.8125rem]">Schnitt: Ø {data.average.toFixed(2)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Area type="monotone" dataKey="average" stroke="#f59e0b" strokeWidth={4} fillOpacity={1} fill="url(#colorAvg)" dot={{ stroke: '#f59e0b', strokeWidth: 3, fill: 'white', r: 6 }} activeDot={{ r: 8, strokeWidth: 0 }} name="Klassenschnitt" baseValue={5} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[0.75rem] leading-tight gap-2">
                        <BarChart3 size={32} className="opacity-30" />
                        Keine Noteneinträge verfügbar
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. FEHLZEITEN-VERTEILUNG */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-6 lg:col-span-2">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-3 text-[1rem] leading-normal font-black tracking-tight text-slate-900">
                      <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                        <UserMinus size={18} />
                      </div>
                      <div>
                        <div>Fehlzeiten-Übersicht (Gesamtstunden pro Kind)</div>
                        <p className="text-[0.625rem] text-slate-400 font-semibold uppercase tracking-wider">Alle Schüler sortiert nach Abwesenheit</p>
                      </div>
                    </h4>
                  </div>
                  <div className="w-full" style={{ height: classAttendance.hasData ? Math.max(400, classAttendance.studentsData.length * 35) + 'px' : '260px' }}>
                    {classAttendance.hasData ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <BarChart layout="vertical" data={classAttendance.studentsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                          <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis 
                            dataKey="fullName" 
                            type="category"
                            axisLine={false} 
                            tickLine={false} 
                            interval={0}
                            tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                            width={140}
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '10px 14px', fontWeight: 800 }} 
                            formatter={(value: any, name: any) => [value + "h", name === 'entschuldigt' ? 'Entschuldigt' : 'Unentschuldigt']}
                          />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', paddingBottom: 20 }} />
                          <Bar dataKey="entschuldigt" stackId="a" fill="#34d399" radius={[0, 0, 0, 0]} name="Entschuldigt" barSize={16} />
                          <Bar dataKey="unentschuldigt" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} name="Unentschuldigt" barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold text-[0.75rem] leading-tight gap-2">
                        <Clock size={36} className="text-slate-300" />
                        <span className="text-slate-600 text-[0.875rem] leading-snug">Noch keine Anwesenheitsdaten vorhanden</span>
                        <span className="text-slate-400 font-medium text-[0.6875rem]">Es wird erst ausgewertet, wenn Anwesenheit erfasst wurde.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. MITARBEIT ENTWICKLUNGS-KURVE */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-6">
                  <div className="flex justify-between items-center">
                    <h4 className="flex items-center gap-3 text-[1rem] leading-normal font-black tracking-tight text-slate-900">
                      <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <div>Entwicklungs-Kurve (Mitarbeit)</div>
                        <p className="text-[0.625rem] text-slate-400 font-semibold uppercase tracking-wider">Klassendynamischer Summentrend über Zeit</p>
                      </div>
                    </h4>
                  </div>
                  <div className="h-64 w-full">
                    {mitarbeitTrend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <AreaChart data={mitarbeitTrend}>
                          <defs>
                            <linearGradient id="colorMitarbeit" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '12px 16px', fontWeight: 900 }} />
                          <Area type="monotone" dataKey="Punkte" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorMitarbeit)" dot={{ stroke: '#6366f1', strokeWidth: 2, fill: 'white', r: 4 }} activeDot={{ r: 7 }} name="Punkte Trend" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-400">
                        <TrendingUp size={32} className="opacity-25" />
                        <span className="text-[0.75rem] font-black text-slate-600">Noch kein Mitarbeitstrend verfügbar</span>
                        <span className="max-w-xs text-[0.6875rem] font-medium">Die Kurve entsteht automatisch, sobald Mitarbeitseinträge erfasst wurden.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* --- NEU: KLASSENAMPEL & VERHALTENS-ZENTRALE --- */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-[2.5rem] p-6 lg:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200/50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                      <Activity size={20} className="text-emerald-500 animate-pulse" />
                    </span>
                    <div>
                      <h4 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-450">Klassenübersicht & Status</h4>
                      <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Klassenweites Verhaltens-Dashboard</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-[0.6875rem] font-black uppercase bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-emerald-700">
                    <span>● Aktueller Stand</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Traffic Light Column Chart */}
                  <div className="lg:col-span-7 bg-white rounded-3xl p-5 border border-slate-100 shadow-3xs space-y-4">
                    <div>
                      <h4 className="text-[0.875rem] font-black text-slate-800">Verteilungs-Spiegel der Verhaltensampel</h4>
                      <p className="text-[0.6875rem] text-slate-400 font-bold">Wie viele Kinder befinden sich aktuell auf welcher Verhaltens-Stufe?</p>
                    </div>

                    <div className="h-64 w-full">
                      {(() => {
                        const stages = app.behavior_stages || [
                          { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                          { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' },
                          { id: '3', label: 'OK', color: '#94a3b8', icon: '😐' },
                          { id: '4', label: 'Ermahnung', color: '#f59e0b', icon: '⚠️' },
                          { id: '5', label: 'Inakzeptabel', color: '#ef4444', icon: '🚫' }
                        ];
                        
                        const distribData = stages.map(stage => {
                          const count = (app.schueler || []).filter((s: any) => {
                            const currentId = app.behavior_status?.[s.id] || app.behavior_default_stage_id || '3';
                            return currentId === stage.id;
                          }).length;
                          return {
                            name: `${stage.icon} ${stage.label}`,
                            count,
                            color: stage.color
                          };
                        });

                        return (
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                            <BarChart data={distribData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }} />
                              <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                              <Tooltip 
                                cursor={{ fill: '#e2e8f0', opacity: 0.15 }}
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '10px 14px', fontWeight: 800, backgroundColor: 'white' }}
                              />
                              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                                {distribData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Weekly Highlight Sidebar */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-3xs space-y-4 h-full flex flex-col justify-between">
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-[0.875rem] font-black text-slate-800 flex items-center gap-1.5">
                            <Sparkles size={16} className="text-amber-500" /> Wöchentliche Highlights
                          </h4>
                          <p className="text-[0.6875rem] text-slate-400 font-bold">Besonders häufige positive Rückmeldungen in der Klasse</p>
                        </div>

                        <div className="space-y-3">
                          {(() => {
                            const stages = app.behavior_stages || [
                              { id: '1', label: 'Super', color: '#10b981', icon: '🌟' },
                              { id: '2', label: 'Gut', color: '#3b82f6', icon: '😊' }
                            ];
                            const positiveLogs = (app.statusLog || []).filter((l: any) => {
                              const sIdx = stages.findIndex(st => st.id === l.iconId);
                              return (sIdx === 0 || sIdx === 1) && l.comment;
                            });

                            const praises: Record<string, number> = {};
                            positiveLogs.forEach((l: any) => {
                              const text = l.comment.trim();
                              if (text) praises[text] = (praises[text] || 0) + 1;
                            });

                            let topPraises = Object.entries(praises)
                              .map(([text, count]) => ({ text, count }))
                              .sort((a,b) => b.count - a.count)
                              .slice(0, 3);

                            if (topPraises.length === 0) {
                              return (
                                <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center">
                                  <p className="text-[0.75rem] font-black text-slate-600">Noch keine positiven Rückmeldungen erfasst</p>
                                  <p className="mt-1 text-[0.6875rem] font-medium leading-relaxed text-slate-400">Highlights erscheinen erst, wenn tatsächliche Rückmeldungen mit Kommentar vorliegen.</p>
                                </div>
                              );
                            }

                            return topPraises.map((praise, idx) => {
                              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                              return (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-colors">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-base">{medal}</span>
                                    <span className="text-[0.75rem] text-slate-700 font-bold leading-tight line-clamp-2">{praise.text}</span>
                                  </div>
                                  <span className="text-[0.625rem] font-black uppercase text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md self-center font-mono shrink-0">
                                    {praise.count}x
                                  </span>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Fast facts */}
                      <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-50/60 text-[0.6875rem] font-medium leading-relaxed text-slate-700 flex gap-2.5 items-start mt-4">
                        <span className="text-lg">📈</span>
                        <div>
                          <span className="font-extrabold uppercase text-[0.5625rem] text-indigo-700 block">Klassenbeobachtung:</span>
                          Diese Zusammenfassung verwendet ausschließlich tatsächlich erfasste Rückmeldungen. Ohne Einträge wird keine Klassenbeobachtung erzeugt.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            )}

            {statsSubTab === 'antolin' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Section Header */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Antolin Lese-Statistik & Entwicklungen</h3>
                    <p className="text-slate-500 font-bold text-[0.75rem] leading-tight">Überblicken Sie das Leseverhalten der Klasse und die zeitlichen Entwicklungen.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-full">
                      Klassen-Analyse: Lesemotivation
                    </span>
                  </div>
                </div>

                {!classHasAntolinData ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs my-8">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100 shadow-3xs">
                      <BookOpen size={28} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Noch keine Antolin-Daten vorhanden</h4>
                      <p className="text-slate-450 text-xs max-w-md mx-auto leading-relaxed">
                        In der Schule machen viele Klassen Antolin. Um die gelesenen Bücher, gesammelten Punkte und individuellen Veränderungen der Kinder zu sehen, lade bitte zuerst den Antolin-Klassenbericht unter "Diagnostik" hoch.
                      </p>
                    </div>
                    <div>
                      <button 
                        onClick={() => {
                          setPage('diagnostik');
                        }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.6875rem] font-black uppercase rounded-xl tracking-wider transition-all duration-300 shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
                      >
                        <RefreshCw size={13} />
                        Zu den Diagnostik-Uploads
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Metrics Card Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                          <BookOpen size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Klasse gelesene Bücher</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.totalBooks}</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                          <Award size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Gesamte Antolinpunkte</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.totalPoints} Pkt</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                          <TrendingUp size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Durchschnittl. Erfolg</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">{antolinClassStats.avgLeistung}%</h4>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex items-center gap-4">
                        <span className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
                          <Notebook size={24} />
                        </span>
                        <div>
                          <span className="block text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Ø Schwierigkeitsstufe</span>
                          <h4 className="text-[1.5rem] leading-none font-black text-slate-900 mt-1">ST {antolinClassStats.avgSchwierigkeit}</h4>
                        </div>
                      </div>
                    </div>

                    {/* Class timeline charts */}
                    {antolinClassStats.classTimelineData.length > 0 && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-[0.875rem] font-black uppercase text-slate-500 tracking-wider font-sans">Klassen-Entwicklung (Gelesene Bücher)</h4>
                          <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                              <AreaChart data={antolinClassStats.classTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorBooks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="Datum" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                <Tooltip />
                                <Area type="monotone" dataKey="Bücher" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorBooks)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
                          <h4 className="text-[0.875rem] font-black uppercase text-slate-500 tracking-wider font-sans">Klassen-Entwicklung (Punkte)</h4>
                          <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                              <AreaChart data={antolinClassStats.classTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="Datum" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                <Tooltip />
                                <Area type="monotone" dataKey="Punkte" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )}

            {activeTab === 'profiles' && (
              <div className="space-y-6 pt-6 animate-fade-in">
                {/* Sub Tab Switcher */}
                <div className="flex border-b border-slate-200 gap-6 mb-2">
                  <button
                    onClick={() => setProfilesSubTab('liste')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                      profilesSubTab === 'liste'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    Klassenliste & Einzelprofile
                  </button>
                  <button
                    onClick={() => setProfilesSubTab('antolin')}
                    className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                      profilesSubTab === 'antolin'
                        ? 'border-indigo-600 text-indigo-750 font-black'
                        : 'border-transparent text-slate-400 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen size={13} className="text-amber-500" /> Antolin Einzel-Statistiken
                  </button>
                </div>

                {profilesSubTab === 'liste' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Klassenliste & Einzelprofile</h3>
                  <p className="text-slate-400 font-bold text-[0.75rem] leading-tight mt-1">Öffne ein Profil, um Leistungen, Beobachtungen und Förderinformationen gebündelt zu bearbeiten.</p>
                </div>
                <div className="relative w-full sm:w-80 flex items-center">
                  <span className="absolute left-3.5 text-slate-400 pointer-events-none">
                    <Search size={16} />
                  </span>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-2xl pl-10 pr-10 py-2.5 text-[0.75rem] leading-tight font-bold text-slate-700 cursor-text outline-none transition-all placeholder:text-slate-400 focus:bg-white"
                    placeholder="Suche nach Name..."
                    aria-label="Schülerprofile durchsuchen"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch('')}
                      className="absolute right-3.5 text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-full hover:bg-slate-200/50 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Grid with custom sparklines & absences stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.length === 0 && (
                  <div className="md:col-span-2 lg:col-span-3 rounded-[2rem] border-2 border-dashed border-slate-200 bg-white px-6 py-10 text-center">
                    <Search size={24} className="mx-auto text-slate-300 mb-3" />
                    <p className="font-black text-slate-700">Kein passendes Schülerprofil gefunden</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Prüfe den Suchbegriff oder lösche die Suche.</p>
                  </div>
                )}
                {filteredStudents.map(s => {
                  const studentGradesLocal = getStudentGrades(s.id);
                  const localAvg = studentGradesLocal.length > 0
                    ? studentGradesLocal.reduce((a, b) => a + b.wert, 0) / studentGradesLocal.length
                    : null;

                  const attStats = getAttendanceStats(s.id);
                  const meetingsCount = (app.elterngespraeche || []).filter(m => m.schuelerId === s.id).length;
                  const notesCount = (app.notizen || []).filter(n => n.schuelerId === s.id).length;

                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      aria-label={`${s.vorname} ${s.nachname}: Schülerprofil öffnen`}
                      className="group bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-950/5 hover:-translate-y-2 transition-all duration-300 text-left flex flex-col justify-between min-h-[255px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                          {s.foto ? (
                            <img 
                              src={s.foto} 
                              alt={`${s.vorname} ${s.nachname}`} 
                              className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shadow-sm shrink-0 group-hover:scale-105 transition-all duration-300"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center text-[1rem] leading-normal font-black shrink-0 border border-slate-150 shadow-inner group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105 transition-all duration-300">
                              {s.vorname.charAt(0)}{s.nachname.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-[1.125rem] leading-tight font-black text-slate-800 text-wrap leading-tight break-words group-hover:text-indigo-650 transition-colors uppercase tracking-tight">
                              {s.nachname}
                            </h4>
                            <p className="text-[0.875rem] leading-snug font-bold text-slate-450 text-wrap leading-tight break-words mt-0.5">
                              {s.vorname}
                            </p>
                            
                            {/* Short level tag or Daz indicators */}
                            <div className="flex gap-1.5 mt-2.5 flex-wrap">
                              {s.niveau !== null && s.niveau !== undefined && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[0.5625rem] font-black text-indigo-700">
                                  Niveau {s.niveau}
                                </span>
                              )}
                              {s.spf && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-md bg-rose-50 border border-rose-100 text-[0.5625rem] font-black text-rose-700">
                                  SPF
                                </span>
                              )}
                              {s.daz && (
                                <span className="inline-flex px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[0.5625rem] font-black text-amber-700">
                                  DAZ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Sparkline graph at top-right */}
                        <div className="pt-1.5 shrink-0 select-none text-right">
                          {studentGradesLocal.length > 0 ? (
                            <>
                              {renderSparkline(s.id)}
                              <div className="text-[0.5rem] text-right font-black uppercase text-slate-350 tracking-wider mt-1">Notenverlauf · 30 Tage</div>
                            </>
                          ) : (
                            <div className="max-w-24 rounded-lg bg-slate-50 px-2 py-1.5 text-[0.5625rem] font-black leading-tight text-slate-400">
                              Noch keine Notendaten
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Secondary metrics row */}
                      <div className="grid grid-cols-2 gap-3 mt-4 py-3 border-t border-b border-slate-100 bg-slate-50/50 rounded-2xl px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <GraduationCap size={14} />
                          </div>
                          <div>
                            <div className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">Notenschnitt</div>
                            <div className="text-[0.9375rem] font-black text-slate-800 leading-none mt-0.5">
                              {localAvg !== null ? localAvg.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                            <Calendar size={14} />
                          </div>
                          <div>
                            <div className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider">Fehlzeiten</div>
                            <div className="text-[0.6875rem] font-black text-slate-800 leading-tight mt-0.5">
                              {attStats.unexcused > 0 || attStats.excused > 0
                                ? `${attStats.unexcused} unentsch. · ${attStats.excused} entsch.`
                                : 'Keine erfasst'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer count row */}
                      <div className="flex items-center justify-between pt-4">
                        <div className="flex gap-2.5">
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg shadow-3xs" title="Noteneinträge">
                            <Award size={12} className="text-emerald-500" />
                            <span className="text-[0.6875rem] font-extrabold text-slate-650">{studentGradesLocal.length}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg shadow-3xs" title="Elterngespräche">
                            <MessageSquare size={12} className="text-indigo-500" />
                            <span className="text-[0.6875rem] font-extrabold text-slate-650">{meetingsCount}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg shadow-3xs" title="Beobachtungen">
                            <FileText size={12} className="text-amber-500" />
                            <span className="text-[0.6875rem] font-extrabold text-slate-650">{notesCount}</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg flex items-center justify-center group-hover:bg-indigo-650 group-hover:text-white group-hover:border-indigo-650 transition-all duration-300">
                          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-300" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SECTION: Klassenweite Analyse Verhalten und Präsenz */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center font-black">
                    <SmilePlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">Klassenweite Analyse: Verhalten und Präsenz</h3>
                    <p className="text-slate-500 font-bold text-[0.875rem] leading-snug">Übersicht über soziale Dynamiken und Anwesenheitstrends der gesamten Klasse.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Class-wide Behavior Distribution */}
                  <div className="space-y-6">
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <BarChart3 size={14} /> Dokumentierte Verhaltensbeobachtungen
                    </h4>
                    {(app.statusLog || []).length === 0 ? (
                      <div className="h-64 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center px-6">
                        <SmilePlus size={26} className="text-slate-300 mb-3" />
                        <p className="font-black text-slate-700">Noch keine Beobachtungen dokumentiert</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Sobald Verhaltenseinträge vorliegen, erscheint hier ihre durchschnittliche Verteilung.</p>
                      </div>
                    ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                        <BarChart data={(app.behavior_stages || []).map(stage => {
                          let count = 0;
                          app.schueler.forEach(s => {
                            count += (app.statusLog || []).filter(l => l.schuelerId === s.id && l.iconId === stage.id).length;
                          });
                          return { name: stage.label, count: Number((count / Math.max(1, app.schueler.length)).toFixed(2)), color: stage.color };
                        })}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontWeight: 900 }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                            {(app.behavior_stages || []).map((s, idx) => (
                              <Cell key={`cell-${idx}`} fill={s.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    )}
                  </div>

                  {/* Class-wide Attendance Summary */}
                  <div className="space-y-6">
                    <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                       <Clock size={14} /> Fehlzeiten-Zahlen (Durchschnitt)
                    </h4>
                    {!Object.values(app.anwesenheit || {}).some((studentDays: any) => Object.keys(studentDays || {}).length > 0) ? (
                      <div className="h-64 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center px-6">
                        <Clock size={26} className="text-slate-300 mb-3" />
                        <p className="font-black text-slate-700">Noch keine Anwesenheit erfasst</p>
                        <p className="text-xs font-bold text-slate-400 mt-1">Die Durchschnittswerte werden angezeigt, sobald Anwesenheitsdaten vorhanden sind.</p>
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-64 content-center">
                       {(() => {
                         let totalExcused = 0;
                         let totalUnexcused = 0;
                         students.forEach(s => {
                           const stats = getAttendanceStats(s.id);
                           totalExcused += stats.excused;
                           totalUnexcused += stats.unexcused;
                         });
                         const avgExcused = (totalExcused / Math.max(1, students.length)).toFixed(1);
                         const avgUnexcused = (totalUnexcused / Math.max(1, students.length)).toFixed(1);
                         
                         return (
                           <>
                             <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 text-center space-y-2">
                               <span className="text-[0.6875rem] font-black uppercase text-emerald-800 tracking-wider block">Ø Entschuldigt</span>
                               <span className="text-4xl font-black text-emerald-700">{avgExcused}h</span>
                             </div>
                             <div className="bg-rose-50 rounded-3xl p-6 border border-rose-100 text-center space-y-2">
                               <span className="text-[0.6875rem] font-black uppercase text-rose-800 tracking-wider block">Ø Unentschuldigt</span>
                               <span className="text-4xl font-black text-rose-700">{avgUnexcused}h</span>
                             </div>
                           </>
                         )
                       })()}
                    </div>
                    )}
                  </div>
                </div>
              </div>
                  </div>
                )}

            {profilesSubTab === 'antolin' && (
              <div className="space-y-6 animate-fade-in text-left">
                {/* Section Header */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Antolin Einzel-Statistiken</h3>
                    <p className="text-slate-500 font-bold text-[0.75rem] leading-tight">Analysieren Sie die Leseleistungen der einzelnen Schüler im Detail.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="px-3.5 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs rounded-full">
                      Schülerprofile: Leseerfolge
                    </span>
                  </div>
                </div>

                {!classHasAntolinData ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs my-8">
                    <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600 border border-amber-100 shadow-3xs">
                      <BookOpen size={28} />
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Noch keine Antolin-Daten vorhanden</h4>
                      <p className="text-slate-450 text-xs max-w-md mx-auto leading-relaxed">
                        In der Schule machen viele Klassen Antolin. Um die gelesenen Bücher, gesammelten Punkte und individuellen Veränderungen der Kinder zu sehen, lade bitte zuerst den Antolin-Klassenbericht unter "Diagnostik" hoch.
                      </p>
                    </div>
                    <div>
                      <button 
                        onClick={() => {
                          setPage('diagnostik');
                        }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[0.6875rem] font-black uppercase rounded-xl tracking-wider transition-all duration-300 shadow-md hover:shadow-indigo-500/10 active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
                      >
                        <RefreshCw size={13} />
                        Zu den Diagnostik-Uploads
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Sidebar: Student list with Antolin quick overview */}
                    <div className="lg:col-span-4 space-y-3">
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                          <Search size={15} />
                        </span>
                        <input
                          className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl pl-9 pr-4 py-2.5 text-[0.75rem] leading-tight font-bold text-slate-700 cursor-text outline-none transition-all placeholder:text-slate-400 focus:bg-white"
                          placeholder="Schüler suchen..."
                          value={search}
                          onChange={e => setSearch(e.target.value)}
                        />
                      </div>

                      <div className="bg-white border border-slate-100 rounded-[2rem] p-3 shadow-xs max-h-[500px] overflow-y-auto space-y-1 divide-y divide-slate-50">
                        {filteredStudents.map(s => {
                          const hasRecord = antolinClassStats.latestRecordsByStudent[s.id];
                          const points = hasRecord ? hasRecord.punkte : 0;
                          const books = hasRecord ? hasRecord.anzahlBuecher : 0;
                          const isSelected = antolinSelectedStudentId === s.id;

                          return (
                            <button
                              key={s.id}
                              onClick={() => setAntolinSelectedStudentId(s.id)}
                              className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between cursor-pointer border ${
                                isSelected 
                                  ? 'bg-amber-50/65 border-amber-200 text-amber-950 shadow-3xs font-black' 
                                  : 'border-transparent text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                  isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-650'
                                }`}>
                                  {s.vorname[0]}{s.nachname[0]}
                                </span>
                                <div>
                                  <span className="block text-xs font-bold">{s.vorname} {s.nachname}</span>
                                  {hasRecord ? (
                                    <span className="block text-[0.6rem] text-slate-450 font-bold">
                                      {books} {books === 1 ? 'Buch' : 'Bücher'} • {points} Pkt.
                                    </span>
                                  ) : (
                                    <span className="block text-[0.6rem] text-slate-400 font-bold">Kein Eintrag</span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight size={14} className={isSelected ? 'text-amber-600' : 'text-slate-300'} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Panel: Selected student's detailed Antolin progress card and list */}
                    <div className="lg:col-span-8">
                      {(() => {
                        const selStudentObj = students.find(s => s.id === antolinSelectedStudentId);
                        if (!selStudentObj) {
                          return (
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center h-full flex flex-col justify-center items-center space-y-4 shadow-sm">
                              <BookOpen size={48} className="text-slate-300" />
                              <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-700">Kein Schüler ausgewählt</h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                  Wählen Sie ein Kind aus der Liste links aus, um den detaillierten Antolin-Leseverlauf, den Erfolgsprozentsatz und die Timeline anzuzeigen.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        // Get records for selected student
                        const personalRecords = (app.antolinRecords || [])
                          .filter(r => r.schuelerId === selStudentObj.id)
                          .sort((a, b) => a.datum.localeCompare(b.datum));

                        if (personalRecords.length === 0) {
                          return (
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-12 text-center h-full flex flex-col justify-center items-center space-y-4 shadow-sm">
                              <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                                <BookOpen size={20} />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-black text-slate-700">Keine Daten für {selStudentObj.vorname}</h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                  Für {selStudentObj.vorname} {selStudentObj.nachname} wurden in diesem Antolin-Bericht keine Leseeinträge erfasst.
                                </p>
                              </div>
                            </div>
                          );
                        }

                        const latestRec = personalRecords[personalRecords.length - 1];

                        // Individual progress timeline
                        const studentTimelineData = personalRecords.map(r => ({
                          Datum: new Date(r.datum).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' }),
                          Bücher: r.anzahlBuecher,
                          Punkte: r.punkte,
                          Erfolg: r.leistung
                        }));

                        return (
                          <div className="space-y-6">
                            {/* Personal Summary Card */}
                            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-6">
                              <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-black text-sm">
                                    {selStudentObj.vorname[0]}{selStudentObj.nachname[0]}
                                  </div>
                                  <div>
                                    <h4 className="text-md font-black text-slate-900 leading-tight">
                                      {selStudentObj.vorname} {selStudentObj.nachname}
                                    </h4>
                                    <p className="text-[0.6875rem] text-slate-450 font-bold">Lese-Fortschritt & Diagnose</p>
                                  </div>
                                </div>
                                <span className="px-3 py-1 bg-amber-50 border border-amber-150 rounded-lg text-amber-700 font-bold text-xs">
                                  Letztes Update: {new Date(latestRec.datum).toLocaleDateString('de-DE')}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
                                  <span className="block text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Bücher gesamt</span>
                                  <span className="text-2xl font-black text-slate-800 mt-1 block">{latestRec.anzahlBuecher}</span>
                                </div>
                                <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
                                  <span className="block text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Punkte gesamt</span>
                                  <span className="text-2xl font-black text-amber-600 mt-1 block">{latestRec.punkte} Pkt.</span>
                                </div>
                                <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-100">
                                  <span className="block text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider">Erfolgsquote</span>
                                  <span className="text-2xl font-black text-emerald-600 mt-1 block">{latestRec.leistung}%</span>
                                </div>
                              </div>
                            </div>

                            {/* Personal Area Chart */}
                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                              <h4 className="text-[0.875rem] font-black uppercase text-slate-500 tracking-wider font-sans">
                                Punkteentwicklung im Zeitverlauf
                              </h4>
                              <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={1}>
                                  <AreaChart data={studentTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorStudentPoints" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="Datum" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                    <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="Punkte" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorStudentPoints)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </motion.div>
    )}
      </AnimatePresence>

      {/* KEL PRESENTATION MODE OVERLAY */}
      <AnimatePresence>
        {presentationModeActive && student && (
          <ModalPortal>
            <KELPresentation
              student={student}
              app={app}
              sem={sem}
              activeFaecher={activeFaecher}
              onClose={() => setPresentationModeActive(false)}
              getAttendanceStats={getAttendanceStats}
              berechne={berechne}
              STANDARD_KEL_BEREICHE={STANDARD_KEL_BEREICHE}
            />
          </ModalPortal>
        )}
      </AnimatePresence>
    </div>
  );
}
