import React, { useMemo, useState, useEffect } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { getChildWeeklyDossierRows } from '../../lib/classroomWeeklyPlan';
import { 
  BarChart3, ChevronRight, ArrowLeft, ArrowUpRight, ArrowRight, ArrowDownRight,
  Target, Stethoscope, HeartHandshake, Calendar, FileText, CheckCircle2,
  AlertCircle, Plus, Edit2, Trash2, X, Check, Save, Layers, Clock, TrendingUp, Star
} from 'lucide-react';
import { berechne, getNotenLabel, getFachCfg, getShowPointsPercent, getMaxPoints } from '../../lib/GradeUtils';
import { FAECHER_ALLE } from '../../constants';
import DossierAssessmentChart from './DossierAssessmentChart';
import { getDossierAssessmentChart } from '../../lib/dossierAssessmentChart';
import { getStudentSubjectParticipationSummary, type SubjectParticipationSummary } from '../../lib/studentParticipation';
import { getStudentHomeworkSummary, type StudentHomeworkSummary } from '../../lib/studentHomework';
import { writeDossierAssessment } from '../../lib/dossierAssessmentWrite';

interface DossierLeistungenProps {
  initialSubject?: string;
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
  participation: SubjectParticipationSummary;
  homework: StudentHomeworkSummary;
}

export default function DossierLeistungen({
  student,
  initialSubject,
  semester,
  onNavigateTab
}: DossierLeistungenProps) {
  const { app, setApp } = useApp();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(initialSubject || null);
  useEffect(() => { setSelectedSubject(initialSubject || null); }, [initialSubject, student.id]);
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
        const maxScore = getMaxPoints(app, fach, cat.key, idx);

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
            note: entry.note || entry.kommentar || meta.colNotes?.[cat.key]?.[idx] || '',
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
            note: meta.colNotes?.[cat.key]?.[idx] || '',
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
    const chartRows = getDossierAssessmentChart(items, mode).rows;
    if (chartRows.length < 2) return { direction: 'none' as const, label: null };
    if (mode === 'grades') {
      const grades = chartRows.map(row => row.value);

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
    const percentages = chartRows.map(row => row.value);

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
      const participation = getStudentSubjectParticipationSummary(app, student.id, fach, semester);
      const homework = getStudentHomeworkSummary(app, student.id, fach, semester);

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
      const g = getFachCfg(app, fach).g;
      const weightsSummary = (['sa', 'lzk', 'wp', 'obj', 'mi', 'hue'] as const).filter(key => g[key] > 0).map(key => `${getNotenLabel(app, fach, key)}: ${Math.round(g[key] * 100)} %`).join(' · ') || 'Keine Gewichtung hinterlegt';

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
        weightsSummary,
        participation,
        homework
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

    const { fach, category, colIndex, label, date, grade, score, maxScore, percent, note } = editingItem;
    setApp(prev => writeDossierAssessment(prev, {
      studentId: student.id,
      fach,
      semester: semester as '1' | '2',
      category,
      colIndex,
      label,
      date,
      grade,
      score,
      maxScore,
      percent,
      note,
    }));

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
    const showPointsPercent = getShowPointsPercent(app, s.fach);

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

          <div className="flex min-w-0 items-center gap-2">
            <button type="button" aria-label="Vorheriges Fach" disabled={faecher.indexOf(s.fach) === 0} onClick={() => setSelectedSubject(faecher[faecher.indexOf(s.fach)-1])} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"><ArrowLeft size={16}/></button>
            <select aria-label="Fach auswählen" value={s.fach} onChange={e=>setSelectedSubject(e.target.value)} className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold sm:max-w-64">
              {faecher.map(f=><option key={f} value={f}>{f}</option>)}
            </select>
            <button type="button" aria-label="Nächstes Fach" disabled={faecher.indexOf(s.fach) === faecher.length-1} onClick={() => setSelectedSubject(faecher[faecher.indexOf(s.fach)+1])} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 disabled:opacity-30"><ChevronRight size={16}/></button>
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
              <p className="text-xs text-slate-500">{s.itemsCount} Leistungsnachweise · Ganzes Schuljahr</p>
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
          <details className="mt-3 border-t border-slate-100 pt-3">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">Gewichtung, Lernziele & weitere Details</summary>
            <p className="mt-2 text-xs text-slate-500">Gewichtung: {s.weightsSummary}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
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
          </details>
        </div>

        <DossierAssessmentChart items={s.items} mode={s.mode} />

        <div className="grid gap-4 lg:grid-cols-2" aria-label="Fachalltag">
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4" aria-label={`Mitarbeit in ${s.fach}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <Star size={16} className="text-amber-600" />
                  Mitarbeit
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  Derselbe Fachstand, der auch in der Notenmappe geführt wird.
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white px-4 py-2 text-right">
                <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Fachsterne</div>
                <div className="text-lg font-black text-slate-900">{s.participation.total}</div>
              </div>
            </div>

            {s.participation.recent.length > 0 ? (
              <div className="mt-3 border-t border-amber-100 pt-3">
                <p className="mb-2 text-[0.625rem] font-bold uppercase tracking-wider text-slate-500">Letzte Änderungen</p>
                <div className="flex flex-wrap gap-2">
                  {s.participation.recent.map(entry => (
                    <span key={entry.id} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-100 bg-white px-2.5 py-1.5 text-xs text-slate-700">
                      <span className={entry.points >= 0 ? 'font-black text-emerald-700' : 'font-black text-rose-700'}>
                        {entry.points > 0 ? '+' : ''}{entry.points}
                      </span>
                      <span>
                        {new Date(entry.timestamp).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-3 border-t border-amber-100 pt-3 text-xs text-slate-500">
                Noch keine protokollierten Fachsterne.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4" aria-label={`Hausübungen in ${s.fach}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <CheckCircle2 size={16} className="text-rose-600" />
                  Hausübungen
                </h4>
                <p className="mt-1 text-xs text-slate-600">
                  Derselbe HÜ-Stand und dieselben Regeln wie in der Notenmappe.
                </p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-right">
                <div className="text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">Fehlende HÜ</div>
                <div className="text-lg font-black text-slate-900">
                  {s.homework.tracked ? s.homework.missing : '–'}
                </div>
                {!s.homework.tracked && <div className="text-[0.625rem] font-semibold text-slate-400">nicht erfasst</div>}
              </div>
            </div>

            {s.homework.tracked ? (
              <div className="mt-3 border-t border-rose-100 pt-3 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 font-bold ${s.homework.mode === 'document' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-rose-200 bg-white text-rose-700'}`}>
                    {s.homework.mode === 'document' ? 'Nur dokumentiert' : 'In Bewertung aktiv'}
                  </span>
                  {s.homework.mode === 'grade' && s.homework.percent !== null && (
                    <span className="font-semibold text-slate-700">
                      {s.homework.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} % · rechnerisch Note {s.homework.calculatedGrade}
                    </span>
                  )}
                </div>
                {s.homework.note && (
                  <p className="mt-2 rounded-lg border border-rose-100 bg-white px-3 py-2 text-slate-700">
                    {s.homework.note}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 border-t border-rose-100 pt-3 text-xs text-slate-500">
                Für dieses Fach wurde noch kein HÜ-Stand dokumentiert.
              </p>
            )}
          </section>
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
                            {showPointsPercent && mode === 'points' && item.percent !== undefined && (
                              <div className="text-[0.6875rem] text-slate-500 font-medium">
                                ({item.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} %)
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

                {/* Main Metrics: Aktuelle Bewertung, Nachweise, Mitarbeit & Hausübungen */}
                <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50/70 border border-slate-100 p-3 my-3 md:grid-cols-4">
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
                  <div>
                    <div className="flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                      <Star size={11} className="text-amber-500" /> Mitarbeit
                    </div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">
                      {s.participation.total}
                    </div>
                    <div className="text-[0.625rem] font-semibold text-slate-500">
                      {s.participation.total === 1 ? 'Fachstern' : 'Fachsterne'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                      <CheckCircle2 size={11} className="text-rose-500" /> Hausübungen
                    </div>
                    <div className="mt-0.5 text-lg font-black text-slate-900">
                      {s.homework.tracked ? s.homework.missing : '–'}
                    </div>
                    <div className="text-[0.625rem] font-semibold text-slate-500">
                      {s.homework.tracked ? (s.homework.missing === 1 ? 'fehlende HÜ' : 'fehlende HÜ') : 'nicht erfasst'}
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
                          ? `${s.latestItem.score}/${s.latestItem.maxScore} Pkt.${getShowPointsPercent(app, s.fach) && s.latestItem.percent !== undefined ? ` · ${s.latestItem.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} %` : ''}` 
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

      <details className="rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-600">Wochenplan · Rückmeldungen des Kindes ({childWeeklyFeedback.length})</summary>
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
          gezählt werden Aufgaben mit Hilfeanfrage, nicht die Zahl der Klicks.
        </p>
      </section>
      </details>

      {filteredSummaries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-xs text-slate-500">
          Keine Fächer entsprechen dem aktuellen Filterkriterium.
        </div>
      )}
    </div>
  );
}
