import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import { 
  TrendingUp, BarChart3, Calendar, Award, GraduationCap, 
  ChevronDown, X, Info, AlertCircle, Sparkles, Loader2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine, Scatter, ComposedChart
} from 'recharts';
import { getFachCfg } from '../lib/GradeUtils';
import { FAECHER_ALLE } from '../constants';

// Helper to convert grades string/number to decimal value for Austrian standard
export function parseGradeToValue(g: any): number | null {
  if (g === null || g === undefined || g === '') return null;
  if (typeof g === 'number') {
    if (g >= 1 && g <= 5) return g;
    return null;
  }
  if (typeof g === 'string') {
    const s = g.trim().replace(',', '.');
    if (s === '') return null;
    
    // Check if simple float
    const num = parseFloat(s);
    if (!isNaN(num) && num >= 1 && num <= 5) {
      return num;
    }
    
    // Match like "2+" or "3-"
    const matchTendency = s.match(/^([1-5])\s*([+\-]?)$/);
    if (matchTendency) {
      const base = parseInt(matchTendency[1], 10);
      const tend = matchTendency[2];
      if (tend === '+') {
        return Math.max(1, base - 0.25); // e.g. 2+ is 1.75
      } else if (tend === '-') {
        return Math.min(5, base + 0.25); // e.g. 2- is 2.25
      }
      return base;
    }
    
    // Match range like "2-3"
    const matchRange = s.match(/^([1-5])\s*-\s*([1-5])$/);
    if (matchRange) {
      const low = parseInt(matchRange[1], 10);
      const high = parseInt(matchRange[2], 10);
      return (low + high) / 2;
    }

    // Fallback: search for first digit 1-5
    const match = s.match(/(?:^|\D)([1-5])(?:\D|$)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

// Help compute weighted averages
function computeGradingAverage(
  saList: any[],
  lzkList: any[],
  wpList: any[],
  afgList: any[],
  cfg: any,
  miNote: number | null
): number | null {
  function getAvg(arr: any[]) {
    const vals = arr.map(parseGradeToValue).filter((val): val is number => val !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  const saAvg = cfg.sa ? getAvg(saList) : null;
  const lzkAvg = cfg.lzk ? getAvg(lzkList) : null;
  const wpAvg = cfg.wp ? getAvg(wpList) : null;
  const objAvg = cfg.obj ? getAvg(afgList) : null;
  const miAvg = cfg.g.mi > 0 ? miNote : null;

  const areas = [
    { avg: saAvg, gw: cfg.g.sa * 100 },
    { avg: lzkAvg, gw: cfg.g.lzk * 100 },
    { avg: wpAvg, gw: cfg.g.wp * 100 },
    { avg: objAvg, gw: cfg.g.obj * 100 },
    { avg: miAvg, gw: cfg.g.mi * 100 },
  ];

  const active = areas.filter(a => a.avg !== null && a.gw > 0);
  if (!active.length) return null;

  const sumGw = active.reduce((acc, a) => acc + a.gw, 0);
  if (sumGw === 0) return null;

  const sumNote = active.reduce((acc, a) => {
    const val = a.avg || 0;
    return acc + val * (a.gw / sumGw);
  }, 0);

  return isNaN(sumNote) ? null : Number(sumNote.toFixed(2));
}

interface NotenverlaufChartProps {
  schuelerId: string;
  initialFach?: string;
  compact?: boolean;
}

export default function NotenverlaufChart({ schuelerId, initialFach, compact = false }: NotenverlaufChartProps) {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  
  const rawFaecher = app.faecher && app.faecher.length > 0 ? app.faecher : FAECHER_ALLE;
  const activeFaecher = [
    ...['Deutsch', 'Mathematik'].filter(f => rawFaecher.includes(f)),
    ...rawFaecher.filter(f => !['Deutsch', 'Mathematik'].includes(f))
  ];
  const [selectedFach, setSelectedFach] = useState<string>(initialFach || activeFaecher[0] || 'Deutsch');
  const [selectedPeriod, setSelectedPeriod] = useState<'1' | '2' | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sa' | 'lzk' | 'wp' | 'obj'>('all');
  const [showClassAvg, setShowClassAvg] = useState<boolean>(true);
  
  // AI Trend Projection states
  const [showProjection, setShowProjection] = useState<boolean>(false);
  const [projectionData, setProjectionData] = useState<Record<string, any>>({});
  const [loadingProjection, setLoadingProjection] = useState<boolean>(false);
  const [projectionError, setProjectionError] = useState<string | null>(null);

  if (!student) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center font-bold">
        Schüler:in nicht gefunden!
      </div>
    );
  }

  // Generate assessment history data
  const chartData = useMemo(() => {
    const cfg = getFachCfg(app, selectedFach);
    const periods: ('1' | '2')[] = selectedPeriod === 'all' ? ['1', '2'] : [selectedPeriod];
    
    // We will collect every single individual grade chronologically within each semester
    const chronologicalGrades: Array<{
      id: string;
      semester: '1' | '2';
      type: 'sa' | 'lzk' | 'wp' | 'obj';
      typeLabel: string;
      originalGrade: string | number;
      numericGrade: number;
      label: string;
      timestamp: number;
      date: string | null;
    }> = [];

    periods.forEach(sem => {
      const nd = app.noten?.[student.id]?.[selectedFach]?.[sem] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
      
      const maxLen = Math.max(
        nd.sa?.length || 0,
        nd.lzk?.length || 0,
        nd.wp?.length || 0,
        nd.aufgaben?.length || 0
      );

      const generateTimestamp = (typ: string, fallbackOffsetMs: number, i: number) => {
        const customDate = app.notenMeta?.[selectedFach]?.colDates?.[typ]?.[i];
        if (customDate) return { ts: new Date(customDate).getTime(), date: customDate };
        // Fallback: approximate timeline
        const now = new Date();
        const year = now.getMonth() > 6 ? now.getFullYear() : now.getFullYear() - 1;
        const baseDate = sem === '1' ? new Date(year, 8, 1) : new Date(year + 1, 1, 1);
        return { ts: baseDate.getTime() + (i * 14 * 86400000) + fallbackOffsetMs, date: null };
      };

      for (let i = 0; i < maxLen; i++) {
        // Interleave assessments by index to simulate timeline
        if (nd.aufgaben && nd.aufgaben[i] !== undefined && nd.aufgaben[i] !== null && nd.aufgaben[i] !== '') {
          const parsed = parseGradeToValue(nd.aufgaben[i]);
          if (parsed !== null) {
            const label = app.notenMeta?.[selectedFach]?.colLabels?.obj?.[i] || `Aufgabe ${i + 1}`;
            const { ts, date } = generateTimestamp('obj', 0, i);
            chronologicalGrades.push({
              id: `${sem}-obj-${i}`,
              semester: sem,
              type: 'obj',
              typeLabel: app.notenLabels?.obj || 'Aufgabe',
              originalGrade: nd.aufgaben[i],
              numericGrade: parsed,
              label: label,
              timestamp: ts,
              date
            });
          }
        }
        if (nd.wp && nd.wp[i] !== undefined && nd.wp[i] !== null && nd.wp[i] !== '') {
          const parsed = parseGradeToValue(nd.wp[i]);
          if (parsed !== null) {
            const label = app.notenMeta?.[selectedFach]?.colLabels?.wp?.[i] || `${app.notenLabels?.wp || 'Werkstück'} ${i + 1}`;
            const { ts, date } = generateTimestamp('wp', 86400000, i);
            chronologicalGrades.push({
              id: `${sem}-wp-${i}`,
              semester: sem,
              type: 'wp',
              typeLabel: app.notenLabels?.wp || 'Werkstück',
              originalGrade: nd.wp[i],
              numericGrade: parsed,
              label: label,
              timestamp: ts,
              date
            });
          }
        }
        if (nd.lzk && nd.lzk[i] !== undefined && nd.lzk[i] !== null && nd.lzk[i] !== '') {
          const parsed = parseGradeToValue(nd.lzk[i]);
          if (parsed !== null) {
            const label = app.notenMeta?.[selectedFach]?.colLabels?.lzk?.[i] || `${app.notenLabels?.lzk || 'LZK'} ${i + 1}`;
            const { ts, date } = generateTimestamp('lzk', 2 * 86400000, i);
            chronologicalGrades.push({
              id: `${sem}-lzk-${i}`,
              semester: sem,
              type: 'lzk',
              typeLabel: 'Lernzielkontrolle',
              originalGrade: nd.lzk[i],
              numericGrade: parsed,
              label: label,
              timestamp: ts,
              date
            });
          }
        }
        if (nd.sa && nd.sa[i] !== undefined && nd.sa[i] !== null && nd.sa[i] !== '') {
          const parsed = parseGradeToValue(nd.sa[i]);
          if (parsed !== null) {
            const label = app.notenMeta?.[selectedFach]?.colLabels?.sa?.[i] || `SA ${i + 1}`;
            const { ts, date } = generateTimestamp('sa', 3 * 86400000, i);
            chronologicalGrades.push({
              id: `${sem}-sa-${i}`,
              semester: sem,
              type: 'sa',
              typeLabel: 'Schularbeit',
              originalGrade: nd.sa[i],
              numericGrade: parsed,
              label: label,
              timestamp: ts,
              date
            });
          }
        }
      }
    });

    // Sort all collected grades by their calculated timestamp
    chronologicalGrades.sort((a, b) => a.timestamp - b.timestamp);

    const classStudents = app.classes?.find((c: any) => c.id === app.activeClassId)?.schueler || app.schueler || [];

    const filteredGrades = selectedCategory === 'all'
      ? chronologicalGrades
      : chronologicalGrades.filter(g => g.type === selectedCategory);

    // Compute moving averages step-by-step
    const dataPoints: any[] = [];
    
    // Track grades accumulated per category, reset/handle per semester or cumulatively
    let accumulatedSa: any[] = [];
    let accumulatedLzk: any[] = [];
    let accumulatedWp: any[] = [];
    let accumulatedAfg: any[] = [];

    filteredGrades.forEach((g, idx) => {
      // Add standard miNote if configured
      const ndSem: any = app.noten?.[student.id]?.[selectedFach]?.[g.semester] || {};
      const miRaw = app.mitarbeit?.[student.id]?.[selectedFach]?.[g.semester] || 0;
      const sSetting = app.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' };
      
      let miNote: number | null = null;
      if (selectedCategory === 'all') {
        if (sSetting.mode === 'manual') {
          miNote = ndSem.miDirekt || null;
        } else {
          if (ndSem.miDirekt !== undefined && ndSem.miDirekt !== null) {
            miNote = ndSem.miDirekt;
          } else if (miRaw > 0) {
            // approx mi
            miNote = miRaw >= 13 ? 1 : miRaw >= 10 ? 2 : miRaw >= 7 ? 3 : miRaw >= 4 ? 4 : 5;
          }
        }
      }

      // Add to accumulations
      if (g.type === 'sa') accumulatedSa.push(g.originalGrade);
      if (g.type === 'lzk') accumulatedLzk.push(g.originalGrade);
      if (g.type === 'wp') accumulatedWp.push(g.originalGrade);
      if (g.type === 'obj') accumulatedAfg.push(g.originalGrade);

      const movingAvg = computeGradingAverage(
        accumulatedSa,
        accumulatedLzk,
        accumulatedWp,
        accumulatedAfg,
        cfg,
        miNote
      );

      // Compute weighted average for all students in the class at this milestone
      const studentAverages: number[] = [];
      const saCount = accumulatedSa.length;
      const lzkCount = accumulatedLzk.length;
      const wpCount = accumulatedWp.length;
      const objCount = accumulatedAfg.length;

      classStudents.forEach((cs: any) => {
        const csNdSem: any = app.noten?.[cs.id]?.[selectedFach]?.[g.semester] || {};
        
        // slice the corresponding grades
        const csSa = (csNdSem.sa || []).slice(0, saCount);
        const csLzk = (csNdSem.lzk || []).slice(0, lzkCount);
        const csWp = (csNdSem.wp || []).slice(0, wpCount);
        const csObj = (csNdSem.aufgaben || []).slice(0, objCount);

        // cs mitarbeit note:
        const csMiRaw = app.mitarbeit?.[cs.id]?.[selectedFach]?.[g.semester] || 0;
        let csMiNote: number | null = null;
        if (selectedCategory === 'all') {
          if (sSetting.mode === 'manual') {
            csMiNote = csNdSem.miDirekt || null;
          } else {
            if (csNdSem.miDirekt !== undefined && csNdSem.miDirekt !== null) {
              csMiNote = csNdSem.miDirekt;
            } else if (csMiRaw > 0) {
              csMiNote = csMiRaw >= 13 ? 1 : csMiRaw >= 10 ? 2 : csMiRaw >= 7 ? 3 : csMiRaw >= 4 ? 4 : 5;
            }
          }
        }

        const csAvg = computeGradingAverage(
          csSa,
          csLzk,
          csWp,
          csObj,
          cfg,
          csMiNote
        );

        if (csAvg !== null && !isNaN(csAvg)) {
          studentAverages.push(csAvg);
        }
      });

      const classAvgAtStep = studentAverages.length > 0
        ? Number((studentAverages.reduce((sum, val) => sum + val, 0) / studentAverages.length).toFixed(2))
        : null;

      dataPoints.push({
        ...g,
        displayLabel: `${g.label} (${g.semester}. Sem.)`,
        'Mittelwert': movingAvg || g.numericGrade, // fallback to single grade if average fails
        'Klassenschnitt': classAvgAtStep,
        'Einzelnote': g.numericGrade,
        typeLabel: g.typeLabel,
        semLabel: `${g.semester}. Semester`
      });
    });

    return dataPoints;
  }, [app, selectedFach, selectedPeriod, selectedCategory, student.id]);

  // Derived stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const grades = chartData.map(d => d.numericGrade);
    const best = Math.min(...grades);
    const worst = Math.max(...grades);
    const currentSchnitt = chartData[chartData.length - 1]['Mittelwert'];

    // Trend calculation: Compare first half of performance with second half of performance
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (chartData.length >= 2) {
      const mid = Math.floor(chartData.length / 2);
      const firstHalf = chartData.slice(0, mid).map(d => d.numericGrade);
      const secondHalf = chartData.slice(mid).map(d => d.numericGrade);
      
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Note: lower is better! So if avgSecond is LESS than avgFirst, it means student is getting better!
      if (avgSecond - avgFirst < -0.15) {
        trend = 'improving';
      } else if (avgSecond - avgFirst > 0.15) {
        trend = 'declining';
      }
    }

    return {
      best,
      worst,
      avg: currentSchnitt ? Number(currentSchnitt.toFixed(2)) : null,
      count: chartData.length,
      trend
    };
  }, [chartData]);

  const fetchProjection = async (subject: string) => {
    setLoadingProjection(true);
    setProjectionError(null);
    try {
      const weights = getFachCfg(app, subject);
      const hist = chartData.map(d => ({
        label: d.label,
        typeLabel: d.typeLabel,
        originalGrade: d.originalGrade,
        numericGrade: d.numericGrade,
        Mittelwert: d['Mittelwert'],
      }));

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'gradeProjection',
          params: {
            studentName: `${student.vorname} ${student.nachname}`,
            subject: subject,
            semester: selectedPeriod === 'all' ? '2' : selectedPeriod,
            history: hist,
            weights: {
              schularbeitenWeight: weights.g.sa,
              testsWeight: weights.g.lzk,
              werkstueckeWeight: weights.g.wp,
              aufgabenWeight: weights.g.obj,
              mitarbeitWeight: weights.g.mi,
            },
            classAvg: stats?.avg || null,
          }
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Fehler bei der KI-Berechnung');
      }

      const resData = await response.json();
      if (resData.text) {
        const parsed = JSON.parse(resData.text);
        setProjectionData(prev => ({
          ...prev,
          [subject]: parsed
        }));
      } else {
        throw new Error('Keine Antwort von der KI erhalten.');
      }
    } catch (err: any) {
      console.error(err);
      setProjectionError(err.message || 'Die KI-Verbindung konnte nicht aufgebaut werden.');
    } finally {
      setLoadingProjection(false);
    }
  };

  const toggleProjection = () => {
    if (!showProjection) {
      setShowProjection(true);
      if (!projectionData[selectedFach]) {
        fetchProjection(selectedFach);
      }
    } else {
      setShowProjection(false);
    }
  };

  // Keep projection auto-triggered if active and selected subject switches
  React.useEffect(() => {
    if (showProjection && !projectionData[selectedFach] && chartData.length > 0) {
      fetchProjection(selectedFach);
    }
  }, [selectedFach, selectedPeriod, selectedCategory, showProjection, chartData.length]);

  // Combined data for plotting actual + projected results
  const combinedData = useMemo(() => {
    if (chartData.length === 0) return [];
    if (!showProjection || !projectionData[selectedFach]) {
      return chartData.map(d => ({
        ...d,
        'Projektierter Verlauf': null,
        isProjected: false
      }));
    }

    const proj = projectionData[selectedFach];
    const lastActual = chartData[chartData.length - 1];

    // Map existing actual grades
    const actualMapped = chartData.map(d => ({
      ...d,
      'Projektierter Verlauf': null,
      isProjected: false
    }));

    // Start projection line from the last actual weighted Mittelwert
    if (actualMapped.length > 0) {
      actualMapped[actualMapped.length - 1]['Projektierter Verlauf'] = lastActual['Mittelwert'];
    }

    // Append 2 projected virtual milestones
    const virtualPoints = (proj.projectedCheckpoints || []).map((cp: any, idx: number) => ({
      id: `projected-${idx}`,
      semester: lastActual.semester,
      type: 'obj',
      typeLabel: cp.typeLabel || 'KI-Prognose',
      originalGrade: cp.numericGrade ? `${cp.numericGrade}` : '—',
      numericGrade: cp.numericGrade || null,
      label: cp.label || `Meilenstein ${idx + 1}`,
      displayLabel: `${cp.label || 'KI'} (KI-Prognose)`,
      'Mittelwert': null, // Actual moving average line is cut off
      'Klassenschnitt': null,
      'Einzelnote': null,
      'Projektierter Verlauf': cp.Mittelwert,
      projectedGrade: cp.numericGrade,
      semLabel: `${lastActual.semester}. Semester (Prognose)`,
      isProjected: true
    }));

    return [...actualMapped, ...virtualPoints];
  }, [chartData, showProjection, projectionData, selectedFach]);

  return (
    <div className={`space-y-6 ${compact ? '' : 'p-6 bg-white border border-slate-250/80 rounded-[2.5rem] shadow-xs'}`}>
      
      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
            <TrendingUp size={22} />
          </div>
          <div>
            <h4 className="text-[1.25rem] font-black text-slate-900 tracking-tight">Notenverlauf & Leistungsentwicklung</h4>
            <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Chronologische Analyse über das Schuljahr</p>
          </div>
        </div>

        {/* SELECTORS */}
        <div className="flex flex-wrap gap-2">
          {/* SUBJECT SELECTOR */}
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={selectedFach}
              onChange={(e) => setSelectedFach(e.target.value)}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[0.8125rem] font-bold text-slate-800 transition-all outline-none appearance-none cursor-pointer"
            >
              {activeFaecher.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* PERIOD SELECTOR */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-slate-600 text-[0.6875rem] font-bold w-full sm:w-auto">
            <button
              onClick={() => setSelectedPeriod('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${selectedPeriod === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-900'}`}
            >
              Ganzjahr
            </button>
            <button
              onClick={() => setSelectedPeriod('1')}
              className={`px-3 py-1.5 rounded-lg transition-all ${selectedPeriod === '1' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-900'}`}
            >
              1. Sem.
            </button>
            <button
              onClick={() => setSelectedPeriod('2')}
              className={`px-3 py-1.5 rounded-lg transition-all ${selectedPeriod === '2' ? 'bg-white text-slate-900 shadow-3xs' : 'hover:text-slate-900'}`}
            >
              2. Sem.
            </button>
          </div>

          {/* CATEGORY SELECTOR */}
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full sm:w-auto pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-[0.8125rem] font-bold text-slate-800 transition-all outline-none appearance-none cursor-pointer"
            >
              <option value="all">Alle Kategorien</option>
              <option value="sa">{app.notenLabels?.sa || 'Schularbeiten'}</option>
              <option value="lzk">{app.notenLabels?.lzk || 'Lernzielkontrollen'}</option>
              <option value="wp">{app.notenLabels?.wp || 'Werkstücke'}</option>
              <option value="obj">{app.notenLabels?.obj || 'Aufgaben/Sonstiges'}</option>
            </select>
            <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Toggle for Class Average */}
          <button
            type="button"
            onClick={() => setShowClassAvg(!showClassAvg)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-[0.6875rem] transition-all cursor-pointer w-full sm:w-auto justify-center ${
              showClassAvg 
                ? 'bg-slate-800 text-white border-slate-800 shadow-3xs hover:bg-slate-905' 
                : 'bg-white text-slate-600 border-slate-250 hover:border-slate-350 hover:text-slate-800'
            }`}
          >
            <span className="text-[0.6875rem]">👥</span>
            <span>Klassenschnitt einblenden</span>
          </button>

          {/* Toggle for KI Trend Projection */}
          <button
            type="button"
            onClick={toggleProjection}
            disabled={chartData.length === 0 || loadingProjection}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-[0.6875rem] transition-all cursor-pointer w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
              showProjection 
                ? 'bg-amber-650 text-white border-amber-650 shadow-3xs hover:bg-amber-700' 
                : 'bg-white text-amber-700 border-amber-250 hover:border-amber-400 hover:bg-amber-50/20'
            }`}
          >
            {loadingProjection ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[0.6875rem]">🔮</span>}
            <span>{loadingProjection ? 'KI berechnet...' : 'KI-Trend-Projektion'}</span>
          </button>
        </div>
      </div>

      {/* EMPTY STATE */}
      {chartData.length === 0 ? (
        <div className="p-12 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-[2rem] space-y-3">
          <div className="text-3xl">📊</div>
          <div>
            <p className="text-[0.875rem] font-bold text-slate-700">Keine Leistungsdaten vorhanden</p>
            <p className="text-[0.6875rem] text-slate-400 max-w-sm mx-auto mt-1 font-semibold leading-relaxed">
              Es wurden im ausgewählten Zeitraum noch keine Noten in "{selectedFach}" eingetragen, um den Lernverlauf darzustellen.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* STATS TILES */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-4 bg-slate-50/40 border border-slate-200/50 rounded-2xl flex flex-col justify-between">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Notenschnitt</span>
                <div>
                  <div className="text-[1.75rem] font-black text-slate-900 leading-none mt-1">
                    {stats.avg !== null ? stats.avg.toFixed(2) : '—'}
                  </div>
                  <p className="text-[0.5625rem] text-slate-400 font-bold mt-1 uppercase tracking-wide">Aktueller Leistungsstand</p>
                </div>
              </div>

              <div className="p-4 bg-emerald-50/20 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-800">Bestes Ergebnis</span>
                <div>
                  <div className="text-[1.75rem] font-black text-emerald-950 leading-none mt-1">
                    {stats.best ? stats.best : '—'}
                  </div>
                  <p className="text-[0.5625rem] text-emerald-600 font-bold mt-1 uppercase tracking-wide">Spitzenleistung</p>
                </div>
              </div>

              <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-rose-800">Maximum</span>
                <div>
                  <div className="text-[1.75rem] font-black text-rose-950 leading-none mt-1">
                    {stats.worst ? stats.worst : '—'}
                  </div>
                  <p className="text-[0.5625rem] text-rose-600 font-bold mt-1 uppercase tracking-wide">Tiefster Wert</p>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/20 border border-indigo-100 rounded-2xl flex flex-col justify-between">
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-indigo-800">Tendenz</span>
                <div className="mt-1">
                  {stats.trend === 'improving' ? (
                    <span className="px-2.5 py-1 bg-emerald-100/70 border border-emerald-200 text-emerald-800 rounded-xl text-[0.6875rem] leading-none font-black inline-flex items-center gap-1 uppercase tracking-wider">
                      📈 Steigend
                    </span>
                  ) : stats.trend === 'declining' ? (
                    <span className="px-2.5 py-1 bg-rose-100/70 border border-rose-250 text-rose-800 rounded-xl text-[0.6875rem] leading-none font-black inline-flex items-center gap-1 uppercase tracking-wider">
                      📉 Sinkend
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[0.6875rem] leading-none font-black inline-flex items-center gap-1 uppercase tracking-wider">
                      ⚖️ Stabil
                    </span>
                  )}
                  <p className="text-[0.5625rem] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">Letzte Leistungsphase</p>
                </div>
              </div>

            </div>
          )}

          {/* AI TREND PROJECTION INFO PANEL */}
          {showProjection && (
            <div className="bg-gradient-to-br from-amber-50/70 via-amber-50/20 to-white border border-amber-200 p-5 rounded-3xl space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h5 className="text-[0.875rem] font-black text-slate-805 tracking-tight">KI-Trend-Projektion & Leistungsanalyse</h5>
                    <p className="text-[0.625rem] font-extrabold text-amber-655 uppercase tracking-wider">Erstellt am {new Date().toLocaleDateString('de-DE')}</p>
                  </div>
                </div>
                
                {loadingProjection && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>

              {loadingProjection ? (
                <div className="space-y-3 py-2 animate-pulse">
                  <div className="h-4 bg-amber-100/20 rounded-md w-3/4"></div>
                  <div className="h-3 bg-amber-100/20 rounded-md w-1/2"></div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="h-10 bg-amber-100/10 rounded-xl"></div>
                    <div className="h-10 bg-amber-100/10 rounded-xl"></div>
                    <div className="h-10 bg-amber-100/10 rounded-xl"></div>
                  </div>
                </div>
              ) : projectionError ? (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50/50 border border-rose-100 p-3 rounded-2xl text-xs font-semibold">
                  <AlertCircle size={14} />
                  <span>{projectionError}</span>
                </div>
              ) : projectionData[selectedFach] ? (
                <div className="space-y-4">
                  {/* Summary of Projection values */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-amber-50/40 p-3 border border-amber-150/40 rounded-2xl text-center">
                      <p className="text-[0.5625rem] font-black uppercase text-amber-800 tracking-wider">Erwarteter Schnitt</p>
                      <p className="text-[1.375rem] font-black text-amber-950 mt-0.5 leading-none">
                        {Number(projectionData[selectedFach].predictedFinalSchnitt).toFixed(2)}
                      </p>
                    </div>

                    <div className="bg-amber-50/40 p-3 border border-amber-150/40 rounded-2xl text-center">
                      <p className="text-[0.5625rem] font-black uppercase text-amber-800 tracking-wider">Prognostizierte Endnote</p>
                      <p className="text-[1.375rem] font-black text-amber-955 mt-0.5 leading-none">
                        {projectionData[selectedFach].predictedFinalGrade}
                      </p>
                    </div>

                    <div className="bg-amber-50/40 p-3 border border-amber-150/40 rounded-2xl text-center">
                      <p className="text-[0.5625rem] font-black uppercase text-amber-800 tracking-wider">KI-Konfidenz</p>
                      <p className="text-[1.375rem] font-black text-amber-955 mt-0.5 leading-none">
                        {projectionData[selectedFach].confidence}%
                      </p>
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="space-y-2.5 text-slate-700 text-[0.75rem] leading-relaxed font-semibold pt-1">
                    <div className="p-3 bg-white/75 border border-amber-100/50 rounded-2xl space-y-1">
                      <span className="text-[0.625rem] uppercase tracking-wider text-slate-450 font-extrabold block">Trend-Analyse</span>
                      <p className="text-slate-800 font-bold">{projectionData[selectedFach].trendDescription}</p>
                    </div>

                    <div className="p-3 bg-white/75 border border-amber-100/50 rounded-2xl space-y-1">
                      <span className="text-[0.625rem] uppercase tracking-wider text-amber-655 font-extrabold block">Pädagogische Empfehlung</span>
                      <p className="text-slate-800 font-bold">{projectionData[selectedFach].recommendation}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs font-bold text-slate-450">
                  Keine Prognosendaten verfügbar. Bitte versuche es erneut.
                </div>
              )}
            </div>
          )}

          {/* MAIN CHART CANVAS */}
          <div className="bg-slate-50/30 border border-slate-200/50 p-4 rounded-[2rem]">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedData} margin={{ top: 20, right: 15, left: -25, bottom: 5 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  
                  <XAxis 
                    dataKey="label" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 900, fill: '#64748B' }} 
                  />
                  
                  {/* Reversing the Y-Axis: Austrian grades (1 = Very Good, 5 = Failing) */}
                  <YAxis 
                    domain={[1, 5]} 
                    reversed 
                    ticks={[1, 2, 3, 4, 5]}
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 800, fill: '#64748B' }} 
                  />
                  
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        if (data.isProjected) {
                          return (
                            <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-xl text-[0.6875rem] font-semibold space-y-2 max-w-xs">
                              <div className="border-b border-white/10 pb-1.5 mb-1 flex items-center justify-between gap-4">
                                <span className="font-extrabold text-amber-300 text-[0.75rem] leading-tight select-none">🔮 {data.label}</span>
                                <span className="text-[0.5625rem] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase select-none font-sans">KI-PROGNOSE</span>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[0.6875rem] font-bold text-slate-300">
                                  Typ: <strong className="text-amber-200">{data.typeLabel}</strong>
                                </p>
                                <p className="text-amber-400 font-black text-[0.8125rem] leading-normal">
                                  Erwartete Note: <strong className="font-black text-white bg-amber-500/30 px-1.5 py-0.5 rounded ml-1 text-[0.75rem]">{data.originalGrade}</strong>
                                </p>
                                <p className="text-amber-300 font-black text-[0.8125rem] leading-normal">
                                  Projizierter Notenschnitt: <strong className="font-black text-white">{Number(data['Projektierter Verlauf']).toFixed(2)}</strong>
                                </p>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-xl text-[0.6875rem] font-semibold space-y-2 max-w-xs">
                            <div className="border-b border-white/10 pb-1.5 mb-1 flex items-center justify-between gap-4">
                              <span className="font-extrabold text-slate-200 text-[0.75rem] leading-tight select-none">{data.label}</span>
                              <div className="flex gap-1.5">
                                {data.date && <span className="text-[0.5625rem] bg-indigo-500/20 px-2 py-0.5 rounded-md text-indigo-200 font-bold select-none">{new Date(data.date).toLocaleDateString('de-DE')}</span>}
                                <span className="text-[0.5625rem] bg-white/10 px-2 py-0.5 rounded-md text-slate-300 font-bold uppercase select-none">{data.semLabel}</span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[0.6875rem] font-bold text-slate-300">
                                Leistungsart: <strong className="text-indigo-300">{data.typeLabel}</strong>
                              </p>
                              <p className="text-amber-400 font-black text-[0.8125rem] leading-normal">
                                Eingetragene Note: <strong className="font-black text-white bg-white/20 px-1.5 py-0.5 rounded ml-1 text-[0.75rem]">{data.originalGrade}</strong>
                              </p>
                              <p className="text-sky-300 font-black text-[0.8125rem] leading-normal">
                                Schnitt nach dieser Note: <strong className="font-black text-white">{Number(data['Mittelwert']).toFixed(2)}</strong>
                              </p>
                              {data['Klassenschnitt'] !== undefined && data['Klassenschnitt'] !== null && (
                                <p className="text-slate-300 font-black text-[0.8125rem] leading-normal">
                                  Klassenschnitt bis dorthin: <strong className="font-black text-slate-200">{Number(data['Klassenschnitt']).toFixed(2)}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  
                  {/* Help reference lines across key bounds */}
                  <ReferenceLine y={1.5} stroke="#d1fae5" strokeDasharray="3 3" label={{ value: 'Sehr Gut', fill: '#10b981', fontSize: 8, fontWeight: 700, position: 'insideRight' }} />
                  <ReferenceLine y={4.5} stroke="#fee2e2" strokeDasharray="3 3" label={{ value: 'Grenzbereich', fill: '#f43f5e', fontSize: 8, fontWeight: 700, position: 'insideRight' }} />
 
                  <Legend 
                    wrapperStyle={{ fontSize: '10px', fontWeight: '800', paddingTop: '15px', color: '#64748B' }} 
                    verticalAlign="bottom"
                  />
                  
                  {/* Line representing the actual progress of weighted computed average */}
                  <Line 
                    name="Durchschnitt (Lernverlauf)" 
                    type="monotone" 
                    dataKey="Mittelwert" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ stroke: '#10b981', strokeWidth: 2, r: 4, fill: '#ffffff' }}
                    activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                    connectNulls
                  />
                  
                  {showProjection && (
                    <Line 
                      name="KI-Projektionsverlauf (Trend)" 
                      type="monotone" 
                      dataKey="Projektierter Verlauf" 
                      stroke="#f59e0b" 
                      strokeWidth={2.5} 
                      strokeDasharray="4 4"
                      dot={{ stroke: '#f59e0b', strokeWidth: 2, r: 4, fill: '#ffffff' }}
                      activeDot={{ r: 6, stroke: '#f59e0b', strokeWidth: 2 }}
                      connectNulls
                    />
                  )}
                  
                  {showClassAvg && (
                    <Line 
                      name="Klassendurchschnitt (Lernverlauf)" 
                      type="monotone" 
                      dataKey="Klassenschnitt" 
                      stroke="#64748b"  
                      strokeWidth={2} 
                      strokeDasharray="4 4"
                      dot={{ stroke: '#64748b', strokeWidth: 1.5, r: 3, fill: '#ffffff' }}
                      activeDot={{ r: 5, stroke: '#64748b', strokeWidth: 1.5 }}
                      connectNulls
                    />
                  )}
                  
                  {/* Scatter points indicating each discrete grade occurrence */}
                  <Scatter 
                    name="Einzelnote" 
                    dataKey="Einzelnote" 
                    fill="#3b82f6" 
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (!cx || !cy) return null;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="#ffffff" strokeWidth={1.5} className="shadow-2xs" />
                          <text x={cx} y={cy - 10} textAnchor="middle" fill="#1e3a8a" fontSize={7} fontWeight="900" className="select-none">
                            {payload.originalGrade}
                          </text>
                        </g>
                      );
                    }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* EXPLANATORY TIPS */}
          <div className="flex items-start gap-3 bg-indigo-50/40 p-4 border border-indigo-150/40 rounded-2xl">
            <Info size={16} className="text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[0.625rem] font-bold text-indigo-900 uppercase tracking-wider">Über den Notenverlauf</span>
              <p className="text-[0.6875rem] leading-relaxed font-semibold text-indigo-700">
                Die blaue Punkte zeigen jede einzelne dokumentierte Beurteilung im gewählten Fach an. Die grüne Linie repräsentiert die <strong>gewichtete Leistungsentwicklung</strong> des Schülers over Time (berechnet nach der aktuellen Gewichtungskonfiguration im Gradebook). Ein nach oben zeigender Verlauf entspricht besseren Noten (Richtung Sehr Gut / 1.0).
              </p>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// Separate printable modal container for the Gradebook spreadsheet
export function NotenverlaufModal({ schuelerId, fach, isOpen, onClose }: { schuelerId: string, fach: string, isOpen: boolean, onClose: () => void }) {
  const { app } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm no-print">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl p-6 relative overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-250"
        onClick={e => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* MODAL HEADER */}
        <div className="flex items-center gap-3 mb-6">
          <GraduationCap size={28} className="text-amber-500" />
          <div>
            <h3 className="text-[1.25rem] font-black text-slate-900 leading-tight">
              Lernentwicklung von {student.vorname} {student.nachname}
            </h3>
            <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Klassenmitglied • Schularbeiten- & Leistungsanalyse
            </p>
          </div>
        </div>

        {/* CHART CONTENT */}
        <NotenverlaufChart schuelerId={schuelerId} initialFach={fach} />
      </div>
    </div>
  );
}
