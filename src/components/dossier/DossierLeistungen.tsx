import React, { useMemo, useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { getChildWeeklyDossierRows } from '../../lib/classroomWeeklyPlan';
import { 
  BarChart3, ChevronRight, ArrowLeft, ArrowUpRight, ArrowRight, ArrowDownRight,
  Target, Stethoscope, HeartHandshake, Calendar, FileText, CheckCircle2,
  AlertCircle, Plus, Edit2, Trash2, X, Check, Save, Layers, Clock, TrendingUp
} from 'lucide-react';
import { berechne, getNotenLabel } from '../../lib/GradeUtils';
import { FAECHER_ALLE } from '../../constants';

interface DossierLeistungenProps {
  student: Student;
  semester: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
  onNavigateTab?: (tab: string, extra?: any) => void;
}

export interface AssessmentItem {
  id: string;
  category: 'sa' | 'lzk' | 'wp' | 'aufgaben' | 'mitarbeit' | 'sonstiges';
  categoryLabel: string;
  label: string;
  date: string;
  rawGrade?: number | string;
  score?: number;
  maxScore?: number;
  percent?: number;
  note?: string;
  mode: 'grades' | 'percent' | 'points';
  colIndex?: number;
}

export interface SubjectAssessmentSummary {
  fach: string;
  mode: 'grades' | 'percent' | 'points';
  currentValue: number | null;
  currentDisplay: string;
  endnote?: number | string | null;
  itemsCount: number;
  items: AssessmentItem[];
  latestItem: AssessmentItem | null;
  trend: {
    direction: 'up' | 'stable' | 'down' | 'none';
    label: string | null;
    diff?: number;
  };
  hasCriticalGrade: boolean;
  weightsSummary: string;
}

export default function DossierLeistungen({
  student,
  semester,
  onNavigateTab
}: DossierLeistungenProps) {
  const { app, setApp } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'stable'>('all');

  // Modal State for adding/editing an assessment item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{
    fach: string;
    category: 'sa' | 'lzk' | 'wp' | 'aufgaben';
    colIndex: number;
    label: string;
    date: string;
    grade: string;
    score: string;
    maxScore: string;
    percent: string;
    note: string;
  } | null>(null);

  // Active subjects in the class
  const faecher = useMemo(() => {
    return (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;
  }, [app.faecher]);

  // Method to extract all individual assessment items for a subject
  const getAssessmentItems = (fach: string): AssessmentItem[] => {
    const nd = app.noten?.[student.id]?.[fach]?.[semester] || {};
    const meta = app.notenMeta?.[fach] || {};
    const mode: 'grades' | 'percent' | 'points' = meta.assessmentMode || 'grades';
    const items: AssessmentItem[] = [];

    const categories: { key: 'sa' | 'lzk' | 'wp' | 'aufgaben'; label: string }[] = [
      { key: 'sa', label: getNotenLabel(app, fach, 'sa', 'Schularbeit') },
      { key: 'lzk', label: getNotenLabel(app, fach, 'lzk', 'Lernzielkontrolle') },
      { key: 'wp', label: getNotenLabel(app, fach, 'wp', 'Wochenplan') },
      { key: 'aufgaben', label: getNotenLabel(app, fach, 'obj', 'Aufgabe / HÜ') }
    ];

    categories.forEach(cat => {
      const rawList = nd[cat.key];
      if (!Array.isArray(rawList)) return;

      rawList.forEach((entry: any, idx: number) => {
        if (entry === null || entry === undefined || entry === '') return;

        const defaultLabel = meta.colLabels?.[cat.key]?.[idx] || `${cat.label} ${idx + 1}`;
        const defaultDate = meta.colDates?.[cat.key]?.[idx] || '';
        const maxScore = meta.colPoints?.[cat.key]?.[idx] || 100;

        if (typeof entry === 'object') {
          const rawVal = entry.grade ?? entry.originalGrade ?? entry.numericGrade ?? entry.val ?? entry.note;
          const score = typeof entry.score === 'number' ? entry.score : (typeof entry.punkte === 'number' ? entry.punkte : undefined);
          const maxP = typeof entry.maxScore === 'number' ? entry.maxScore : (typeof entry.maxPunkte === 'number' ? entry.maxPunkte : maxScore);
          const pct = typeof entry.percent === 'number' ? entry.percent : (score !== undefined && maxP > 0 ? (score / maxP) * 100 : undefined);

          items.push({
            id: `${cat.key}_${idx}`,
            category: cat.key,
            categoryLabel: cat.label,
            label: entry.label || defaultLabel,
            date: entry.date || defaultDate,
            rawGrade: rawVal,
            score,
            maxScore: maxP,
            percent: pct,
            note: entry.note || entry.kommentar || '',
            mode,
            colIndex: idx
          });
        } else {
          // Entry is primitive (number or string)
          const numVal = parseFloat(String(entry).replace(',', '.'));
          let pct: number | undefined = undefined;
          let score: number | undefined = undefined;

          if (mode === 'percent') {
            pct = !isNaN(numVal) ? numVal : undefined;
          } else if (mode === 'points') {
            score = !isNaN(numVal) ? numVal : undefined;
            pct = score !== undefined && maxScore > 0 ? (score / maxScore) * 100 : undefined;
          }

          items.push({
            id: `${cat.key}_${idx}`,
            category: cat.key,
            categoryLabel: cat.label,
            label: defaultLabel,
            date: defaultDate,
            rawGrade: entry,
            score,
            maxScore: mode === 'points' ? maxScore : undefined,
            percent: pct,
            note: '',
            mode,
            colIndex: idx
          });
        }
      });
    });

    // Sort chronologically by date or order
    return items.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return 0;
    });
  };

  // Requirement 6: Methodically clean trend calculation
  const calculateMethodologicalTrend = (items: AssessmentItem[], mode: 'grades' | 'percent' | 'points') => {
    // Only calculate if at least 2 comparable data points exist
    if (items.length < 2) {
      return { direction: 'none' as const, label: null };
    }

    if (mode === 'grades') {
      const grades = items
        .map(i => {
          const n = parseFloat(String(i.rawGrade).replace(',', '.'));
          return (!isNaN(n) && n >= 1 && n <= 5) ? n : null;
        })
        .filter((n): n is number => n !== null);

      if (grades.length < 2) return { direction: 'none' as const, label: null };

      const half = Math.floor(grades.length / 2);
      const firstAvg = grades.slice(0, half).reduce((a, b) => a + b, 0) / half;
      const secondHalf = grades.slice(half);
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      // In Austrian grades, lower number is better!
      const diff = firstAvg - secondAvg;
      if (diff >= 0.25) {
        return { direction: 'up' as const, label: 'Verbesserung', diff };
      } else if (diff <= -0.25) {
        return { direction: 'down' as const, label: 'Rückgang', diff };
      }
      return { direction: 'stable' as const, label: 'Stabil', diff: 0 };
    }

    // Mode is percent or points
    const percentages = items
      .map(i => i.percent)
      .filter((n): n is number => typeof n === 'number' && !isNaN(n));

    if (percentages.length < 2) return { direction: 'none' as const, label: null };

    const half = Math.floor(percentages.length / 2);
    const firstAvg = percentages.slice(0, half).reduce((a, b) => a + b, 0) / half;
    const secondHalf = percentages.slice(half);
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;
    if (diff >= 4.0) {
      return { direction: 'up' as const, label: 'Verbesserung', diff };
    } else if (diff <= -4.0) {
      return { direction: 'down' as const, label: 'Rückgang', diff };
    }
    return { direction: 'stable' as const, label: 'Stabil', diff: 0 };
  };

  // Summaries per subject
  const subjectSummaries: SubjectAssessmentSummary[] = useMemo(() => {
    return faecher.map(fach => {
      const meta = app.notenMeta?.[fach] || {};
      const mode: 'grades' | 'percent' | 'points' = meta.assessmentMode || 'grades';
      const items = getAssessmentItems(fach);
      const trend = calculateMethodologicalTrend(items, mode);
      
      const val = berechne(app, student.id, fach, semester);
      const nd = (app.noten?.[student.id]?.[fach]?.[semester] || {}) as any;
      const endnote = nd.endnote ?? null;

      let currentDisplay = 'Keine Daten';
      let hasCriticalGrade = false;

      if (val !== null) {
        if (mode === 'grades') {
          currentDisplay = `${val.toFixed(1).replace('.', ',')}`;
          if (val > 4.2) hasCriticalGrade = true;
        } else if (mode === 'percent') {
          currentDisplay = `${val.toFixed(1).replace('.', ',')} %`;
          if (val < 50) hasCriticalGrade = true;
        } else {
          currentDisplay = `${val.toFixed(1).replace('.', ',')} % (Punkte)`;
          if (val < 50) hasCriticalGrade = true;
        }
      }

      // Latest item
      const latestItem = items.length > 0 ? items[items.length - 1] : null;

      // Weights text
      const g = meta.gewichtung || { sa: 40, lzk: 30, mi: 30 };
      const weightsSummary = `SA: ${g.sa || 0}%, LZK: ${g.lzk || 0}%, MI: ${g.mi || 0}%`;

      return {
        fach,
        mode,
        currentValue: val,
        currentDisplay,
        endnote,
        itemsCount: items.length,
        items,
        latestItem,
        trend,
        hasCriticalGrade,
        weightsSummary
      };
    });
  }, [faecher, app, student.id, semester]);

  // Filtered summaries for main list
  const filteredSummaries = useMemo(() => {
    if (statusFilter === 'critical') {
      return subjectSummaries.filter(s => s.hasCriticalGrade || s.trend.direction === 'down');
    }
    if (statusFilter === 'stable') {
      return subjectSummaries.filter(s => !s.hasCriticalGrade && s.currentValue !== null);
    }
    return subjectSummaries;
  }, [subjectSummaries, statusFilter]);

  // Selected subject details
  const activeSubjectData = useMemo(() => {
    if (!selectedSubject) return null;
    return subjectSummaries.find(s => s.fach === selectedSubject) || null;
  }, [selectedSubject, subjectSummaries]);

  // Diagnostics check for selected subject
  const diagnosticsForSelectedSubject = useMemo(() => {
    if (!selectedSubject) return [];
    const all = app.diagnostikErhebungen || [];
    return all.filter(d => {
      if (d.schuelerId !== student.id) return false;
      const testName = ((d as any).testName || d.testId || '').toLowerCase();
      const sLower = selectedSubject.toLowerCase();
      if (sLower.includes('deutsch')) {
        return testName.includes('lese') || testName.includes('phon') || testName.includes('recht') || testName.includes('gramm');
      }
      if (sLower.includes('mathe')) {
        return testName.includes('mathe') || testName.includes('kopf') || testName.includes('zahlen');
      }
      return (d as any).fach?.toLowerCase() === sLower;
    });
  }, [selectedSubject, app.diagnostikErhebungen, student.id]);

  // Support goals check for selected subject
  const supportGoalsForSelectedSubject = useMemo(() => {
    if (!selectedSubject) return [];
    const goals = student.foerderprofil?.foerderziele || [];
    const sLower = selectedSubject.toLowerCase();
    return goals.filter(g => (g.bereich || '').toLowerCase().includes(sLower) || (g.ziel || '').toLowerCase().includes(sLower));
  }, [selectedSubject, student.foerderprofil?.foerderziele]);

  // Save / Update Assessment Handler
  const handleSaveAssessment = () => {
    if (!editingItem) return;

    const { fach, category, colIndex, label, date, grade, score, maxScore, note } = editingItem;

    setApp(prev => {
      const noten = { ...(prev.noten || {}) };
      if (!noten[student.id]) noten[student.id] = {};
      if (!noten[student.id][fach]) noten[student.id][fach] = {};
      if (!noten[student.id][fach][semester]) (noten[student.id][fach] as any)[semester] = { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };

      const prevSubj = (noten[student.id]?.[fach]?.[semester] || {}) as any;
      const subjData: any = {
        sa: [],
        lzk: [],
        wp: [],
        aufgaben: [],
        hue: 0,
        hueAnm: [],
        ...prevSubj
      };
      const list = Array.isArray(subjData[category]) ? [...subjData[category]] : [];

      const mode = prev.notenMeta?.[fach]?.assessmentMode || 'grades';
      
      let entryToSave: any;
      if (mode === 'grades') {
        entryToSave = {
          grade: grade.trim(),
          label: label.trim(),
          date: date,
          note: note.trim()
        };
      } else if (mode === 'points') {
        const s = parseFloat(score);
        const ms = parseFloat(maxScore) || 100;
        entryToSave = {
          score: !isNaN(s) ? s : 0,
          maxScore: ms,
          percent: ms > 0 && !isNaN(s) ? (s / ms) * 100 : 0,
          label: label.trim(),
          date: date,
          note: note.trim()
        };
      } else {
        const p = parseFloat(score);
        entryToSave = {
          percent: !isNaN(p) ? p : 0,
          label: label.trim(),
          date: date,
          note: note.trim()
        };
      }

      list[colIndex] = entryToSave;
      subjData[category] = list;
      noten[student.id][fach][semester] = subjData;

      // Update meta column labels if provided
      const notenMeta = { ...(prev.notenMeta || {}) };
      if (!notenMeta[fach]) notenMeta[fach] = {};
      if (!notenMeta[fach].colLabels) notenMeta[fach].colLabels = {};
      if (!notenMeta[fach].colLabels[category]) notenMeta[fach].colLabels[category] = [];
      notenMeta[fach].colLabels[category][colIndex] = label;

      if (!notenMeta[fach].colDates) notenMeta[fach].colDates = {};
      if (!notenMeta[fach].colDates[category]) notenMeta[fach].colDates[category] = [];
      notenMeta[fach].colDates[category][colIndex] = date;

      return {
        ...prev,
        noten,
        notenMeta
      };
    });

    setIsModalOpen(false);
    setEditingItem(null);
  };

  // Delete Assessment Handler
  const handleDeleteAssessment = (fach: string, category: string, colIndex: number) => {
    setApp(prev => {
      const noten = { ...(prev.noten || {}) };
      if (!noten[student.id]?.[fach]?.[semester]) return prev;

      const prevSubj = (noten[student.id][fach][semester] || {}) as any;
      const subjData: any = {
        sa: [],
        lzk: [],
        wp: [],
        aufgaben: [],
        hue: 0,
        hueAnm: [],
        ...prevSubj
      };
      if (Array.isArray(subjData[category])) {
        const list = [...subjData[category]];
        list[colIndex] = null;
        subjData[category] = list;
        noten[student.id][fach][semester] = subjData;
      }

      return {
        ...prev,
        noten
      };
    });
  };

  // Open add modal
  const handleOpenAddModal = (fach: string, category: 'sa' | 'lzk' | 'wp' | 'aufgaben' = 'sa') => {
    const nd = app.noten?.[student.id]?.[fach]?.[semester] || {};
    const existingList = Array.isArray(nd[category]) ? nd[category] : [];
    const nextIndex = existingList.length;

    setEditingItem({
      fach,
      category,
      colIndex: nextIndex,
      label: `${category === 'sa' ? 'Schularbeit' : category === 'lzk' ? 'Lernzielkontrolle' : category === 'wp' ? 'Wochenplan' : 'Aufgabe'} ${nextIndex + 1}`,
      date: new Date().toISOString().split('T')[0],
      grade: '2',
      score: '25',
      maxScore: '30',
      percent: '80',
      note: ''
    });
    setIsModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (item: AssessmentItem, fach: string) => {
    setEditingItem({
      fach,
      category: item.category as any,
      colIndex: item.colIndex ?? 0,
      label: item.label,
      date: item.date || new Date().toISOString().split('T')[0],
      grade: String(item.rawGrade ?? '2'),
      score: String(item.score ?? ''),
      maxScore: String(item.maxScore ?? '30'),
      percent: String(item.percent ?? ''),
      note: item.note || ''
    });
    setIsModalOpen(true);
  };

  // Helper for mode badge text
  const getModeBadge = (mode: 'grades' | 'percent' | 'points') => {
    switch (mode) {
      case 'grades': return 'Noten 1–5';
      case 'percent': return 'Prozent (0–100 %)';
      case 'points': return 'Punktebasis';
    }
  };

  // ==========================================
  // VIEW: FACH-DETAILANSICHT (Requirement 4)
  // ==========================================
  if (activeSubjectData) {
    const s = activeSubjectData;
    const mode = s.mode;

    // Group items by category (only categories with data or active!)
    const categoriesWithData = [
      { key: 'sa', label: 'Schularbeiten / Tests', items: s.items.filter(i => i.category === 'sa') },
      { key: 'lzk', label: 'Lernzielkontrollen', items: s.items.filter(i => i.category === 'lzk') },
      { key: 'wp', label: 'Wochenplan / WOPL', items: s.items.filter(i => i.category === 'wp') },
      { key: 'aufgaben', label: 'Hausübungen & Aufgaben', items: s.items.filter(i => i.category === 'aufgaben') },
    ].filter(c => c.items.length > 0);

    return (
      <div className="space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedSubject(null)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-xs"
            >
              <ArrowLeft size={14} /> Zurück zur Fächerübersicht
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ganzes Schuljahr</span>
          </div>

          {/* Quick Subject Switcher Pills */}
          <div className="flex flex-wrap items-center gap-1 overflow-x-auto py-1">
            {faecher.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setSelectedSubject(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  f === s.fach
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Fach-Header */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900">{s.fach}</h3>
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                  {getModeBadge(s.mode)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Gewichtung: <span className="font-semibold text-slate-700">{s.weightsSummary}</span>
              </p>
            </div>

            {/* Stand & Action */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-right">
                <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Aktuelle Bewertung</div>
                <div className="text-lg font-black text-slate-900">{s.currentDisplay}</div>
                {s.endnote && (
                  <div className="text-[0.6875rem] font-bold text-indigo-700">Endnote fixiert: {s.endnote}</div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal(s.fach)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              >
                <Plus size={14} /> Leistungsnachweis eintragen
              </button>
            </div>
          </div>

          {/* Querverweise zu Lernzielen, Diagnostik & Förderung */}
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('lernziele', { fach: s.fach })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition cursor-pointer"
              >
                <Target size={13} /> Lernziele zu {s.fach} anzeigen
              </button>
            )}

            {diagnosticsForSelectedSubject.length > 0 && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('diagnostik')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-800 hover:bg-blue-100 transition cursor-pointer"
              >
                <Stethoscope size={13} /> {diagnosticsForSelectedSubject.length} Diagnostik-Einträge vorhanden
              </button>
            )}

            {supportGoalsForSelectedSubject.length > 0 && onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('foerderung')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
              >
                <HeartHandshake size={13} /> Im Förderprofil berücksichtigt
              </button>
            )}
          </div>
        </div>

        {/* Leistungsentwicklung (zeitlicher Verlauf) (Requirement 4 & 7) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-500" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Leistungsentwicklung im Schuljahr ({s.items.length} {s.items.length === 1 ? 'Nachweis' : 'Nachweise'})
              </h4>
            </div>

            {s.trend.direction !== 'none' && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                s.trend.direction === 'up'
                  ? 'bg-emerald-100 text-emerald-800'
                  : s.trend.direction === 'down'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {s.trend.direction === 'up' && <ArrowUpRight size={14} />}
                {s.trend.direction === 'down' && <ArrowDownRight size={14} />}
                {s.trend.direction === 'stable' && <ArrowRight size={14} />}
                {s.trend.label}
              </span>
            )}
          </div>

          {s.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-xs text-slate-500">
              Für dieses Fach wurden in diesem Schuljahr noch keine Einzelnoten oder Leistungsnachweise erfasst.
            </div>
          ) : s.items.length < 2 ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-600">
                Bisher liegt 1 Leistungsnachweis vor. Für einen methodisch sauberen Trendverlauf sind mindestens 2 getrennte Erhebungen erforderlich.
              </div>
              {/* Single item display */}
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <span className="text-xs font-bold text-slate-800">{s.items[0].label}</span>
                  <div className="text-[0.6875rem] text-slate-400">{s.items[0].date || 'Ohne Datum'} · {s.items[0].categoryLabel}</div>
                </div>
                <div className="text-sm font-black text-slate-900">
                  {mode === 'grades' ? `Note ${s.items[0].rawGrade}` : mode === 'points' ? `${s.items[0].score}/${s.items[0].maxScore} Pkt.` : `${s.items[0].percent}%`}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {s.items.map((item, idx) => (
                  <div key={item.id} className="relative rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">
                        #{idx + 1} {item.categoryLabel}
                      </span>
                      <span className="text-[0.625rem] text-slate-400">
                        {item.date || 'Kein Datum'}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate mb-1">
                      {item.label}
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 mt-2">
                      <span className="text-sm font-black text-slate-900">
                        {mode === 'grades' 
                          ? `Note ${item.rawGrade}` 
                          : mode === 'points' 
                          ? `${item.score ?? '-'} / ${item.maxScore ?? '-'} Pkt.` 
                          : `${item.percent ?? '-'} %`}
                      </span>
                      {mode === 'points' && item.percent !== undefined && (
                        <span className="text-xs font-medium text-slate-500">
                          {Math.round(item.percent)} %
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Leistungsdaten nach Kategorien (Requirement 4 & 5) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Leistungsnachweise nach Kategorien
            </h4>
            <span className="text-xs text-slate-400">
              Nur Kategorien mit vorhandenen Daten werden angezeigt
            </span>
          </div>

          {categoriesWithData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              In diesem Fach sind noch keine Einträge vorhanden. Klicke auf „Leistungsnachweis eintragen“, um eine Bewertung hinzuzufügen.
            </div>
          ) : (
            categoriesWithData.map(cat => (
              <div key={cat.key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {cat.label} ({cat.items.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenAddModal(s.fach, cat.key as any)}
                    className="text-[0.6875rem] font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    + Weiteren Nachweis erfassen
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {cat.items.map(item => (
                    <div key={item.id} className="p-4 hover:bg-slate-50/50 transition">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{item.label}</span>
                            <span className="text-[0.6875rem] text-slate-400">·</span>
                            <span className="text-[0.6875rem] text-slate-500">
                              {item.date ? new Date(`${item.date}T00:00:00`).toLocaleDateString('de-AT') : 'Ohne Datum'}
                            </span>
                          </div>
                          {item.note && (
                            <p className="text-xs text-slate-600 italic">
                              „{item.note}“
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-black text-slate-900">
                              {mode === 'grades' 
                                ? `Note ${item.rawGrade}` 
                                : mode === 'points' 
                                ? `${item.score ?? '-'} / ${item.maxScore ?? '-'} Pkt.` 
                                : `${item.percent ?? '-'} %`}
                            </div>
                            {mode === 'points' && item.percent !== undefined && (
                              <div className="text-[0.6875rem] text-slate-500 font-medium">
                                ({Math.round(item.percent)} %)
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item, s.fach)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Bearbeiten"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssessment(s.fach, item.category, item.colIndex ?? 0)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Löschen"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal for adding/editing an assessment */}
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h4 className="text-sm font-bold text-slate-900">
                  Leistungsnachweis {editingItem.fach}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={editingItem.category}
                    onChange={e => setEditingItem({ ...editingItem, category: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-600"
                  >
                    <option value="sa">Schularbeit / Test</option>
                    <option value="lzk">Lernzielkontrolle</option>
                    <option value="wp">Wochenplan / WOPL</option>
                    <option value="aufgaben">Hausübung / Aufgabe</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Bezeichnung
                  </label>
                  <input
                    type="text"
                    value={editingItem.label}
                    onChange={e => setEditingItem({ ...editingItem, label: e.target.value })}
                    placeholder="z. B. 1. Schularbeit"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Datum
                  </label>
                  <input
                    type="date"
                    value={editingItem.date}
                    onChange={e => setEditingItem({ ...editingItem, date: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>

                {mode === 'grades' ? (
                  <div>
                    <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Note (1 bis 5)
                    </label>
                    <select
                      value={editingItem.grade}
                      onChange={e => setEditingItem({ ...editingItem, grade: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600"
                    >
                      <option value="1">1 - Sehr gut</option>
                      <option value="2">2 - Gut</option>
                      <option value="3">3 - Befriedigend</option>
                      <option value="4">4 - Genügend</option>
                      <option value="5">5 - Nicht genügend</option>
                    </select>
                  </div>
                ) : mode === 'points' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Erreichte Punkte
                      </label>
                      <input
                        type="number"
                        value={editingItem.score}
                        onChange={e => setEditingItem({ ...editingItem, score: e.target.value })}
                        placeholder="z. B. 24"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Maximalpunkte
                      </label>
                      <input
                        type="number"
                        value={editingItem.maxScore}
                        onChange={e => setEditingItem({ ...editingItem, maxScore: e.target.value })}
                        placeholder="z. B. 30"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Erreichter Prozentwert (%)
                    </label>
                    <input
                      type="number"
                      value={editingItem.percent}
                      onChange={e => setEditingItem({ ...editingItem, percent: e.target.value })}
                      placeholder="z. B. 85"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:border-indigo-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[0.625rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Sachliche Notiz / Kommentar (optional)
                  </label>
                  <textarea
                    value={editingItem.note}
                    onChange={e => setEditingItem({ ...editingItem, note: e.target.value })}
                    placeholder="z. B. Selbstständig gelöst, Nachfrage bei Textaufgabe..."
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer shadow-xs"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: LEISTUNGSÜBERSICHT (Standardansicht)
  // ==========================================
  const childWeeklyFeedback = getChildWeeklyDossierRows(student);
  const helpTaskCount = childWeeklyFeedback.filter(record => record.helpRequested).length;
  const completedTaskCount = childWeeklyFeedback.filter(record => record.done).length;
  return (
    <div className="space-y-6">
      <section aria-label="Wochenplan-Rückmeldungen des Kindes"
        className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 text-slate-900">
        <h3 className="text-base font-extrabold">📋 Wochenplan · Rückmeldungen des Kindes</h3>
        <p className="mt-1 text-sm text-slate-700">
          {childWeeklyFeedback.length ? `${completedTaskCount} von ${childWeeklyFeedback.length} dokumentierten Aufgaben fertig · bei ${helpTaskCount} Aufgaben Hilfe angefragt`
            : 'Noch keine Rückmeldungen aus dem Wochenplan der Kinder.'}
        </p>
        {childWeeklyFeedback.length > 0 && (
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto" role="list">
            {childWeeklyFeedback.map(record => (
              <div key={record.taskId} role="listitem" className="rounded-xl border border-indigo-100 bg-white p-3 text-sm">
                <p className="font-bold">{record.taskSubject ? `${record.taskSubject} · ` : ''}{record.taskTitle}</p>
                <p className="text-xs text-slate-600">Schuljahr {record.schoolYear} · KW {record.week}</p>
                <p className="mt-1 font-semibold">
                  {record.done ? '✓ Fertig' : record.helpRequested ? '✋ Hilfe angefragt · noch nicht als fertig gemeldet' : 'Noch nicht fertig'}
                  {record.done && record.difficulty ? ` · Einschätzung: ${record.difficulty === 'sehr-schwierig' ? 'sehr schwer' : record.difficulty === 'schwierig' ? 'schwer' : record.difficulty}` : ''}
                  {record.helpRequested && record.done ? ' · Zuvor Hilfe angefragt' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-slate-600">
          Die Einschätzungen stammen vom Kind. Eine Hilfeanfrage bleibt auch nach „Fertig“ dokumentiert;
          gezählt werden Aufgaben mit Hilfeanfrage, nicht die Zahl der Klicks. Nur im Dossier anzeigen.
        </p>
      </section>
      {/* Header Area (No cross-subject overall grade! Strictly forbidden by Req 3) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-slate-900" />
            <h3 className="text-lg font-bold text-slate-900">Leistungsübersicht</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Fachbezogene Leistungsdaten für {student.vorname} {student.nachname} · Ganzes Schuljahr
          </p>
        </div>

        {/* Semester & Filter Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick status filter */}
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/70">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alle Fächer ({subjectSummaries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('critical')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                statusFilter === 'critical'
                  ? 'bg-white text-amber-900 shadow-xs border border-slate-200/60'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Klärungsbedarf ({subjectSummaries.filter(s => s.hasCriticalGrade || s.trend.direction === 'down').length})
            </button>
          </div>
        </div>
      </div>

      {/* Fach-Karten Grid (Requirement 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSummaries.map(s => {
          return (
            <div
              key={s.fach}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Fachname, Modus-Badge, Trend */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="text-base font-black text-slate-900">{s.fach}</h4>
                    <span className="inline-block mt-0.5 rounded-md bg-slate-100 px-2 py-0.5 text-[0.625rem] font-bold text-slate-600 border border-slate-200">
                      {getModeBadge(s.mode)}
                    </span>
                  </div>

                  {/* Trend Indicator (Req 6) */}
                  {s.trend.direction !== 'none' ? (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0 ${
                      s.trend.direction === 'up'
                        ? 'bg-emerald-100 text-emerald-800'
                        : s.trend.direction === 'down'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {s.trend.direction === 'up' && <ArrowUpRight size={14} />}
                      {s.trend.direction === 'down' && <ArrowDownRight size={14} />}
                      {s.trend.direction === 'stable' && <ArrowRight size={14} />}
                      {s.trend.label}
                    </span>
                  ) : (
                    <span className="text-[0.625rem] font-medium text-slate-400">
                      Kein Trend
                    </span>
                  )}
                </div>

                {/* Main Metrics: Aktuelle Bewertung & Nachweise */}
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50/70 border border-slate-100 p-3 my-3">
                  <div>
                    <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Aktuelle Bewertung</div>
                    <div className="text-lg font-black text-slate-900 mt-0.5">
                      {s.currentDisplay}
                    </div>
                  </div>
                  <div>
                    <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Leistungsdaten</div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      {s.itemsCount} {s.itemsCount === 1 ? 'Nachweis' : 'Nachweise'} erfasst
                    </div>
                  </div>
                </div>

                {/* Letzte relevante Bewertung */}
                <div className="text-xs border-t border-slate-100 pt-2.5 mt-2">
                  <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                    Letzte relevante Bewertung
                  </div>
                  {s.latestItem ? (
                    <div className="flex items-center justify-between text-slate-700 font-medium">
                      <span className="truncate pr-2">
                        {s.latestItem.label} ({s.latestItem.date || 'Ohne Datum'})
                      </span>
                      <span className="font-bold shrink-0">
                        {s.mode === 'grades' 
                          ? `Note ${s.latestItem.rawGrade}` 
                          : s.mode === 'points' 
                          ? `${s.latestItem.score}/${s.latestItem.maxScore} Pkt.` 
                          : `${s.latestItem.percent}%`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Noch keine Bewertung erfasst</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Querverweis zu Lernzielen + Fach öffnen Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {onNavigateTab ? (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('lernziele', { fach: s.fach })}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Lernziele zu {s.fach} →
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSubject(s.fach)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                >
                  Fach öffnen <ChevronRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredSummaries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
          Keine Fächer entsprechen dem aktuellen Filterkriterium.
        </div>
      )}
    </div>
  );
}
