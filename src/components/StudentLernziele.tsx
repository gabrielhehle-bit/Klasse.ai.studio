import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Target, Printer, Save, CheckCircle2, Search, 
  ChevronDown, ChevronUp, Clock, Check, Sparkles, 
  ArrowRight, Stethoscope, HeartHandshake, Layers
} from 'lucide-react';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';
import { getLernzielModell } from '../lib/lernzielBewertungsmodell';
import LernzielVisualisierung from './LernzielVisualisierung';

interface StudentLernzieleProps {
  schuelerId: string;
  initialSubject?: string;
  onOpenSupportProfile?: () => void;
  onNavigateTab?: (tab: string, extra?: any) => void;
  semester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
}

type GoalRatings = Record<string, number | null>;
type SemesterGoalRatings = Partial<Record<'1' | '2', GoalRatings>>;

interface ParsedGoal {
  id: string;
  rawText: string;
  kompetenzbereich: string;
  zielText: string;
  fach: string;
}

export default function StudentLernziele({ 
  schuelerId, 
  initialSubject,
  onOpenSupportProfile, 
  onNavigateTab,
  semester, 
  onSemesterChange 
}: StudentLernzieleProps) {
  const { app, setApp } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  const goalModel = getLernzielModell(app.lernzielBewertungsmodell);
  const reachedLevel = goalModel.levels[goalModel.levels.length - 1];
  const reachedValue = reachedLevel.value;

  const initialClassMatch = app.klassenbezeichnung?.match(/(\d)/);
  const initialClassLevel = Number(app.stufe) || (initialClassMatch ? parseInt(initialClassMatch[1]) : 1);
  
  const [selectedStufe, setSelectedStufe] = useState<number>(Math.max(1, Math.min(4, initialClassLevel)));
  const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>(semester || '1');
  const [semesterEvaluations, setSemesterEvaluations] = useState<SemesterGoalRatings>({});
  const [evaluationData, setEvaluationData] = useState<GoalRatings>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRated, setShowOnlyRated] = useState(false);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>('Alle');
  const [collapsedAreas, setCollapsedAreas] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (semester) setSelectedSemester(semester);
  }, [semester]);

  useEffect(() => {
    if (initialSubject) {
      setActiveSubjectTab(initialSubject);
    }
  }, [initialSubject]);

  const currentLernziele = LERNZIELE_BY_STUFE[selectedStufe] || LERNZIELE_BY_STUFE[1];
  const FAECHER = useMemo(() => Object.keys(currentLernziele), [currentLernziele]);

  // Load evaluations
  useEffect(() => {
    if (schuelerId) {
      try {
        const semesterSynced = app.studentLernzielSemesterBewertungen?.[schuelerId];
        if (semesterSynced) {
          setSemesterEvaluations(semesterSynced);
          setEvaluationData(semesterSynced[selectedSemester] || {});
          return;
        }
        const savedSemester = localStorage.getItem(`student_lernziele_semester_${schuelerId}`);
        if (savedSemester) {
          const parsedSemester = JSON.parse(savedSemester) as SemesterGoalRatings;
          setSemesterEvaluations(parsedSemester);
          setEvaluationData(parsedSemester[selectedSemester] || {});
          setApp(prev => ({
            ...prev,
            studentLernzielBewertungen: {
              ...(prev.studentLernzielBewertungen || {}),
              [schuelerId]: parsedSemester[selectedSemester] || {}
            },
            studentLernzielSemesterBewertungen: {
              ...(prev.studentLernzielSemesterBewertungen || {}),
              [schuelerId]: parsedSemester
            }
          }));
          return;
        }
        const syncedEvaluations = app.studentLernzielBewertungen?.[schuelerId];
        const savedEval = localStorage.getItem(`student_lernziele_${schuelerId}`);
        const legacyEvaluations = syncedEvaluations || (savedEval ? JSON.parse(savedEval) : null);
        if (legacyEvaluations) {
          const migrated = { [selectedSemester]: legacyEvaluations } as SemesterGoalRatings;
          setSemesterEvaluations(migrated);
          setEvaluationData(legacyEvaluations);
          setApp(prev => ({
            ...prev,
            studentLernzielBewertungen: {
              ...(prev.studentLernzielBewertungen || {}),
              [schuelerId]: legacyEvaluations
            },
            studentLernzielSemesterBewertungen: {
              ...(prev.studentLernzielSemesterBewertungen || {}),
              [schuelerId]: migrated
            }
          }));
        } else {
          setSemesterEvaluations({});
          setEvaluationData({});
        }
      } catch (e) {
        console.error("Error loading lernziele details", e);
      }
    }
  }, [schuelerId]);

  useEffect(() => {
    setEvaluationData(semesterEvaluations[selectedSemester] || {});
  }, [selectedSemester, semesterEvaluations]);

  useEffect(() => {
    if (!schuelerId || !app.studentLernzielSemesterBewertungen?.[schuelerId]) return;
    try {
      localStorage.removeItem(`student_lernziele_${schuelerId}`);
      localStorage.removeItem(`student_lernziele_semester_${schuelerId}`);
    } catch {}
  }, [schuelerId, app.studentLernzielSemesterBewertungen]);


  useEffect(() => {
    setSelectedStufe(Math.max(1, Math.min(4, Number(app.stufe) || initialClassLevel)));
    setSearchTerm('');
    setShowOnlyRated(false);
  }, [schuelerId]);

  // Parse all goals into structured model: Fach -> Kompetenzbereich -> Lernziel
  const allParsedGoals: ParsedGoal[] = useMemo(() => {
    const list: ParsedGoal[] = [];
    FAECHER.forEach(fach => {
      const ziele = currentLernziele[fach] || [];
      ziele.forEach(goal => {
        const colonIndex = goal.text.indexOf(':');
        const kompetenzbereich = colonIndex > -1 ? goal.text.substring(0, colonIndex).trim() : 'Allgemein';
        const zielText = colonIndex > -1 ? goal.text.substring(colonIndex + 1).trim() : goal.text;
        list.push({
          id: goal.id,
          rawText: goal.text,
          kompetenzbereich,
          zielText,
          fach
        });
      });
    });
    return list;
  }, [FAECHER, currentLernziele]);

  // Save handler (Datenschutz B6/B8: Ausschließlich im verschlüsselten AppState speichern, kein Klartext-localStorage)
  const handleSave = () => {
    setSaveStatus('saving');
    try {
      // Entferne etwaige unverschlüsselte Alt-Schlüssel aus dem lokalen Browser-Speicher
      try {
        localStorage.removeItem(`student_lernziele_${schuelerId}`);
        localStorage.removeItem(`student_lernziele_semester_${schuelerId}`);
      } catch {}

      setApp(prev => ({
        ...prev,
        studentLernzielBewertungen: {
          ...(prev.studentLernzielBewertungen || {}),
          [schuelerId]: evaluationData
        },
        studentLernzielSemesterBewertungen: {
          ...(prev.studentLernzielSemesterBewertungen || {}),
          [schuelerId]: semesterEvaluations
        }
      }));
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500);
    } catch (e) {
      console.error("Fehler beim Speichern der Lernziele:", e);
      setSaveStatus('idle');
    }
  };

  // Rating change handler
  const handleRatingChange = (zielId: string, rating: number | null) => {
    setEvaluationData(prev => {
      const next = {
        ...prev,
        [zielId]: prev[zielId] === rating ? null : rating
      };
      const nextSemesters = {
        ...semesterEvaluations,
        [selectedSemester]: next
      };
      setSemesterEvaluations(nextSemesters);
      setApp(current => ({
        ...current,
        studentLernzielBewertungen: {
          ...(current.studentLernzielBewertungen || {}),
          [schuelerId]: next
        },
        studentLernzielSemesterBewertungen: {
          ...(current.studentLernzielSemesterBewertungen || {}),
          [schuelerId]: nextSemesters
        }
      }));
      return next;
    });
  };

  const handlePrint = () => {
    handleSave();
    setTimeout(() => {
      window.print();
    }, 200);
  };

  if (!student) {
    return (
      <div className="p-8 text-center text-slate-400">
        Kein Student ausgewählt.
      </div>
    );
  }

  // Diagnostics & Foerderprofil cross connections
  const studentDiagnostics = (app.diagnostikErhebungen || []).filter(e => e.schuelerId === student.id);
  const individualSupportGoals = student.foerderprofil?.foerderziele || [];

  const hasDiagnosticForFach = (fach: string, kb?: string) => {
    const fLower = fach.toLowerCase();
    const kbLower = (kb || '').toLowerCase();
    return studentDiagnostics.some(d => {
      const testName = ((d as any).testName || d.testId || '').toLowerCase();
      if (fLower.includes('deutsch')) {
        return testName.includes('lese') || testName.includes('phon') || testName.includes('recht') || testName.includes('gramm') || kbLower.includes('lesen');
      }
      if (fLower.includes('mathe')) {
        return testName.includes('mathe') || testName.includes('kopf') || testName.includes('zahlen') || testName.includes('mengen');
      }
      return false;
    });
  };

  const hasSupportGoalForFach = (fach: string, kb?: string) => {
    const fLower = fach.toLowerCase();
    const kbLower = (kb || '').toLowerCase();
    return individualSupportGoals.some(g => {
      const bLower = (g.bereich || '').toLowerCase();
      const zLower = (g.ziel || '').toLowerCase();
      return bLower.includes(fLower) || zLower.includes(fLower) || (kb && (bLower.includes(kbLower) || zLower.includes(kbLower)));
    });
  };

  // Requirement 10: Lernziel-Fokus
  // Aktuell in Arbeit (maximal 5 relevante Lernziele)
  const inWorkGoals = allParsedGoals
    .filter(g => goalModel.levels.some(level => level.value !== reachedValue && evaluationData[g.id] === level.value))
    .slice(0, 5);

  // Zuletzt erreicht (maximal 5 zuletzt erreichte Lernziele)
  const reachedGoals = allParsedGoals
    .filter(g => evaluationData[g.id] === reachedValue)
    .slice(0, 5);

  // Statistics
  const ratedCount = allParsedGoals.filter(g => evaluationData[g.id] !== null && evaluationData[g.id] !== undefined).length;
  const reachedCount = allParsedGoals.filter(g => evaluationData[g.id] === reachedValue).length;
  const inWorkCount = allParsedGoals.filter(g => goalModel.levels.some(level => level.value !== reachedValue && evaluationData[g.id] === level.value)).length;

  // Filtered goals by subject, search, and rated
  const filteredSubjects = activeSubjectTab === 'Alle' ? FAECHER : [activeSubjectTab];

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-6 w-1.5 rounded-full bg-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Lernziele & Kompetenzen</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Fachliche Lehrplanziele für {student.vorname} {student.nachname} · {selectedStufe}. Schulstufe
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Schulstufen-Auswahl */}
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/70">
            {[1, 2, 3, 4].map(stufe => (
              <button
                key={stufe}
                type="button"
                onClick={() => setSelectedStufe(stufe)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  selectedStufe === stufe 
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {stufe}. Stufe
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={13} /> Drucken
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            {saveStatus === 'saving' ? (
              <span>Speichern...</span>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 size={13} /> Gespeichert
              </>
            ) : (
              <>
                <Save size={13} /> Speichern
              </>
            )}
          </button>
        </div>
      </div>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden">
        <summary className="cursor-pointer text-sm font-black text-slate-800">Lernstand veranschaulichen · Kind / Eltern / Lehrperson</summary>
        <p className="mt-2 text-xs text-slate-600">Dieselben dokumentierten Lernziele, unterschiedliche Ansichten. Die Einstellungen gelten pro Klasse.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          <LernzielVisualisierung goalIds={allParsedGoals.map(goal => goal.id)} ratings={evaluationData} model={goalModel} mode={goalModel.views.kind} title="Für Kinder" />
          <LernzielVisualisierung goalIds={allParsedGoals.map(goal => goal.id)} ratings={evaluationData} model={goalModel} mode={goalModel.views.parents} title="Für Eltern" />
          <LernzielVisualisierung goalIds={allParsedGoals.map(goal => goal.id)} ratings={evaluationData} model={goalModel} mode={goalModel.views.teachers} title="Für Lehrpersonen" />
        </div>
      </details>

      {/* Requirement 10: Lernziel-Fokus (Kompakte Zusammenfassung ganz zu Beginn) */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
        {/* Aktuell in Arbeit (max 5) */}
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-600" />
              <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                Weitere Lernzielstufen ({inWorkGoals.length}{inWorkCount > 5 ? ` von ${inWorkCount}` : ''})
              </h4>
            </div>
            <span className="text-[0.6875rem] font-medium text-amber-700">Fokusziele</span>
          </div>

          {inWorkGoals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-200 bg-white/60 p-5 text-center text-xs text-amber-800/80">
              Derzeit sind keine Lernziele in den übrigen Beurteilungsstufen dokumentiert.
            </div>
          ) : (
            <div className="space-y-2">
              {inWorkGoals.map(goal => {
                const currentRating = evaluationData[goal.id];
                const hasDiag = hasDiagnosticForFach(goal.fach, goal.kompetenzbereich);
                const hasSupport = hasSupportGoalForFach(goal.fach, goal.kompetenzbereich);

                return (
                  <div key={goal.id} className="rounded-xl border border-amber-200/70 bg-white p-3 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.625rem] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">
                            {goal.fach}
                          </span>
                          <span className="text-[0.625rem] font-medium text-slate-500">
                            {goal.kompetenzbereich}
                          </span>
                          {/* Cross connection badges (Req 11 & 12) */}
                          {hasDiag && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('diagnostik')}
                              className="inline-flex items-center gap-1 text-[0.5625rem] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded hover:bg-blue-100 transition cursor-pointer"
                              title="Diagnostik öffnen"
                            >
                              <Stethoscope size={10} /> Diagnostik vorhanden
                            </button>
                          )}
                          {hasSupport && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('foerderung')}
                              className="inline-flex items-center gap-1 text-[0.5625rem] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                              title="Förderung öffnen"
                            >
                              <HeartHandshake size={10} /> Im Förderprofil
                            </button>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 leading-snug">
                          {goal.zielText}
                        </p>
                      </div>

                      {/* Quick Status Buttons */}
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => handleRatingChange(goal.id, reachedValue)}
                          className="px-2 py-1 rounded-lg text-[0.625rem] font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
                          title={reachedLevel.label + ' markieren'}
                        >
                          {reachedLevel.symbol} {reachedLevel.label}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Zuletzt erreicht (max 5) */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                {reachedLevel.label} ({reachedGoals.length}{reachedCount > 5 ? ` von ${reachedCount}` : ''})
              </h4>
            </div>
            <span className="text-[0.6875rem] font-medium text-emerald-700">Erfolge</span>
          </div>

          {reachedGoals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-white/60 p-5 text-center text-xs text-emerald-800/80">
              Noch keine Lernziele in der Stufe „{reachedLevel.label}“ markiert.
            </div>
          ) : (
            <div className="space-y-2">
              {reachedGoals.map(goal => (
                <div key={goal.id} className="rounded-xl border border-emerald-200/70 bg-white p-3 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.625rem] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-1.5 py-0.5 rounded">
                          {goal.fach}
                        </span>
                        <span className="text-[0.625rem] font-medium text-slate-500">
                          {goal.kompetenzbereich}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {goal.zielText}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[0.625rem] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg shrink-0">
                      {reachedLevel.symbol} {reachedLevel.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs print:hidden">
        {/* Fach Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveSubjectTab('Alle')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeSubjectTab === 'Alle'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Alle Fächer ({allParsedGoals.length})
          </button>
          {FAECHER.map(fach => (
            <button
              key={fach}
              type="button"
              onClick={() => setActiveSubjectTab(fach)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubjectTab === fach
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {fach}
            </button>
          ))}
        </div>

        {/* Search input & Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Lernziel suchen..."
              className="h-8 w-44 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowOnlyRated(v => !v)}
            className={`h-8 px-3 rounded-xl border text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              showOnlyRated
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {showOnlyRated ? 'Nur bewertete' : 'Alle Status'}
          </button>
        </div>
      </div>

      {/* Requirement 8: Vollständige Fach- und Kompetenzstruktur */}
      {/* Fach → Kompetenzbereich → Lernziel */}
      <div className="space-y-6">
        {filteredSubjects.map(fach => {
          // Goals for this subject
          const subjectGoals = allParsedGoals.filter(g => g.fach === fach);
          
          // Group by Kompetenzbereich
          const groupedByKb: Record<string, ParsedGoal[]> = {};
          subjectGoals.forEach(g => {
            const kb = g.kompetenzbereich;
            if (!groupedByKb[kb]) groupedByKb[kb] = [];
            
            // Search filter
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch = !term || g.zielText.toLowerCase().includes(term) || kb.toLowerCase().includes(term);
            const matchesRated = !showOnlyRated || (evaluationData[g.id] !== null && evaluationData[g.id] !== undefined);
            
            if (matchesSearch && matchesRated) {
              groupedByKb[kb].push(g);
            }
          });

          const kbKeys = Object.keys(groupedByKb).filter(kb => groupedByKb[kb].length > 0);
          if (kbKeys.length === 0) return null;

          return (
            <div key={fach} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Fach Header */}
              <div className="flex items-center justify-between bg-slate-50/80 px-5 py-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-slate-500" />
                  <h4 className="text-sm font-bold text-slate-900">{fach}</h4>
                  <span className="text-xs text-slate-500 font-medium">
                    · {subjectGoals.filter(g => evaluationData[g.id] !== null && evaluationData[g.id] !== undefined).length} von {subjectGoals.length} dokumentiert
                  </span>
                </div>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('leistungen')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
                  >
                    Zur Leistungsübersicht →
                  </button>
                )}
              </div>

              {/* Kompetenzbereiche under this Fach */}
              <div className="divide-y divide-slate-100">
                {kbKeys.map(kb => {
                  const goalsInKb = groupedByKb[kb];
                  const areaKey = `${fach}_${kb}`;
                  const isCollapsed = collapsedAreas[areaKey];
                  const hasDiag = hasDiagnosticForFach(fach, kb);
                  const hasSupport = hasSupportGoalForFach(fach, kb);

                  return (
                    <div key={kb} className="p-4 sm:p-5">
                      {/* Kompetenzbereich Bar */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                            {kb}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            ({goalsInKb.length} {goalsInKb.length === 1 ? 'Lernziel' : 'Lernziele'})
                          </span>

                          {/* Querverbindung Diagnostik (Req 11) */}
                          {hasDiag && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('diagnostik')}
                              className="inline-flex items-center gap-1 text-[0.625rem] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md hover:bg-blue-100 transition cursor-pointer"
                              title="Diagnostik zu diesem Bereich anzeigen"
                            >
                              <Stethoscope size={11} /> Passende diagnostische Beobachtung vorhanden
                            </button>
                          )}

                          {/* Querverbindung Förderung (Req 12) */}
                          {hasSupport && onNavigateTab && (
                            <button
                              type="button"
                              onClick={() => onNavigateTab('foerderung')}
                              className="inline-flex items-center gap-1 text-[0.625rem] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition cursor-pointer"
                              title="Förderprofil öffnen"
                            >
                              <HeartHandshake size={11} /> Im Förderprofil berücksichtigt
                            </button>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCollapsedAreas(p => ({ ...p, [areaKey]: !isCollapsed }))}
                          className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition flex items-center gap-1"
                        >
                          {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                        </button>
                      </div>

                      {/* Goals List */}
                      {!isCollapsed && (
                        <div className="space-y-2 mt-2">
                          {goalsInKb.map(goal => {
                            const currentRating = evaluationData[goal.id]; // 1 = erreicht, 2 = im wesentlichen, 3 = minimal, null = offen

                            return (
                              <div
                                key={goal.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition"
                              >
                                <div className="text-xs font-medium text-slate-800 leading-relaxed pr-2">
                                  {goal.zielText}
                                </div>

                                {/* Status Switcher (Requirement 9: keine Schulnoten erzeugen!) */}
                                <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                  <button type="button" onClick={() => handleRatingChange(goal.id, null)}
                                    aria-pressed={currentRating === null || currentRating === undefined}
                                    className={'rounded-lg border px-2 py-1 text-[0.625rem] font-semibold ' +
                                      (currentRating === null || currentRating === undefined
                                        ? 'border-slate-400 bg-slate-200 text-slate-800'
                                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100')}
                                    title="Keine Einschätzung für dieses Lernziel"
                                  >{goalModel.emptyLabel}</button>
                                  {goalModel.levels.map(level => (
                                    <button type="button" key={level.value}
                                      onClick={() => handleRatingChange(goal.id, level.value)}
                                      aria-pressed={currentRating === level.value}
                                      className="rounded-lg border px-2 py-1 text-[0.625rem] font-bold transition hover:brightness-95"
                                      style={{ backgroundColor: currentRating === level.value ? level.color : 'white',
                                        borderColor: level.color,
                                        color: currentRating === level.value ? 'white' : level.color }}
                                      title={level.label}
                                    >{level.symbol} {level.label}</button>
                                  ))}
                                  {typeof currentRating === 'number' && !goalModel.levels.some(level => level.value === currentRating) &&
                                    <span className="text-xs font-bold text-rose-700">Frühere unbekannte Stufe {currentRating} – bitte prüfen</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredSubjects.every(fach => {
          const ziele = allParsedGoals.filter(g => g.fach === fach);
          return ziele.length === 0;
        }) && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
            Keine Lernziele für die gewählten Filter vorhanden.
          </div>
        )}
      </div>

      {/* Print View */}
      <div className="hidden print:block space-y-6 text-black bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm]">
        <div className="text-center mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-black uppercase tracking-widest">Lehrplan-Lernziele</h1>
          <p className="text-sm mt-1">{student.vorname} {student.nachname} · {selectedStufe}. Schulstufe · {selectedSemester}. Semester</p>
        </div>

        {FAECHER.map(fach => {
          const ziele = allParsedGoals.filter(g => g.fach === fach);
          if (ziele.length === 0) return null;

          return (
            <div key={fach} className="mb-4">
              <h3 className="font-bold text-sm uppercase tracking-wider mb-2 border-b border-black/30 pb-1">{fach}</h3>
              <div className="space-y-1">
                {ziele.map(g => {
                  const rating = evaluationData[g.id];
                  const ratingLabel = rating === 1 ? 'Erreicht' : rating === 2 ? 'Im Wesentlichen' : rating === 3 ? 'In Entwicklung' : 'Offen';
                  return (
                    <div key={g.id} className="flex items-center justify-between text-xs py-1 border-b border-black/10">
                      <span><strong>{g.kompetenzbereich}:</strong> {g.zielText}</span>
                      <span className="font-semibold">{ratingLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
