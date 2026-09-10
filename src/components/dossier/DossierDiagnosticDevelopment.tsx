import React, { useState, useMemo } from 'react';
import { 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  Eye, 
  Clock, 
  ArrowRight, 
  ExternalLink, 
  Plus, 
  ChevronRight, 
  Lightbulb, 
  BookOpen, 
  Calculator, 
  Layers, 
  TrendingUp, 
  Activity,
  User,
  Users,
  Brain,
  ShieldCheck,
  Calendar,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../types';
import { 
  DiagnosticResult, 
  DiagnosticCompetency, 
  DiagnosticDomain,
  CompetencyStatus 
} from '../../types/diagnosticCore';
import { 
  DIAGNOSTIC_DOMAINS,
  DIAGNOSTIC_COMPETENCIES,
  DIAGNOSTIC_COMPETENCY_AREAS
} from '../../data/diagnosticCompetencies';
import { 
  getCompetenciesByDomain,
  getCompetencyStatusConfig,
  getStudentLatestCompetencyStatus,
  getStudentStrengthsAndObservations,
  getStudentFocusAreas,
  getStudentRecentDiagnostics,
  getDiagnosticTestById,
  getDiagnosticScreeningById,
  formatGermanDate,
  getObservationTagLabel,
  LatestCompetencyStatusInfo
} from '../../lib/diagnosticCoreUtils';
import { getDiagnosticTestByCompetencyId } from '../../data/diagnosticTests';
import { CompetencyDetailModal } from '../diagnostics/results/CompetencyDetailModal';
import { DiagnosticResultDetailModal } from '../diagnostics/results/DiagnosticResultDetailModal';
import { useApp } from '../../context/AppContext';

interface DossierDiagnosticDevelopmentProps {
  student: Student;
  onNavigateToFullDiagnostics?: (studentId: string, competencyId?: string, gradeLevel?: number) => void;
  onStart1to1Check?: (studentId: string, competencyId?: string, gradeLevel?: number) => void;
}

export const DossierDiagnosticDevelopment: React.FC<DossierDiagnosticDevelopmentProps> = ({
  student,
  onNavigateToFullDiagnostics,
  onStart1to1Check,
}) => {
  const { app, updateApp, setPage } = useApp();
  const [activeCompetencyModal, setActiveCompetencyModal] = useState<DiagnosticCompetency | null>(null);
  const [activeResultModal, setActiveResultModal] = useState<DiagnosticResult | null>(null);

  const allDiagnosticResults = app.diagnosticResults || [];
  
  // Results specifically for this student
  const studentResults = useMemo(() => {
    return allDiagnosticResults.filter(r => r.studentId === student.id);
  }, [allDiagnosticResults, student.id]);

  const hasResults = studentResults.length > 0;

  // 1. Navigation handlers
  const handleOpenFullDiagnostics = (competencyId?: string, gradeLevel?: number) => {
    if (onNavigateToFullDiagnostics) {
      onNavigateToFullDiagnostics(student.id, competencyId, gradeLevel);
      return;
    }
    updateApp({
      activeDiagnosticView: 'results',
      selectedDiagnosticStudentId: student.id,
      selectedDiagnosticCompetencyId: competencyId,
      selectedDiagnosticGradeLevel: gradeLevel,
    });
    setPage('diagnostik');
  };

  const handleStartTest = (competencyId?: string, gradeLevel?: number) => {
    if (onStart1to1Check) {
      onStart1to1Check(student.id, competencyId, gradeLevel);
      return;
    }
    updateApp({
      activeDiagnosticView: 'individual',
      selectedDiagnosticStudentId: student.id,
      selectedDiagnosticCompetencyId: competencyId,
      selectedDiagnosticGradeLevel: gradeLevel,
    });
    setPage('diagnostik');
  };

  // 2. Strengths and focus areas
  const strengths = useMemo(() => {
    return getStudentStrengthsAndObservations(allDiagnosticResults, student.id);
  }, [allDiagnosticResults, student.id]);

  const focusAreas = useMemo(() => {
    return getStudentFocusAreas(allDiagnosticResults, student.id);
  }, [allDiagnosticResults, student.id]);

  // 3. Recent diagnostics (3-5 items)
  const recentTests = useMemo(() => {
    return getStudentRecentDiagnostics(allDiagnosticResults, student.id, 5);
  }, [allDiagnosticResults, student.id]);

  // 4. Latest nextStep recommendation
  const latestNextStep = useMemo(() => {
    // Prefer nextStep from focus areas first, else from recent tests
    const focusWithStep = focusAreas.find(fa => fa.nextStep && fa.nextStep.trim().length > 0);
    if (focusWithStep && focusWithStep.nextStep) {
      return {
        text: focusWithStep.nextStep,
        competency: focusWithStep.competency.name,
        date: focusWithStep.date,
      };
    }

    const testWithStep = studentResults.find(r => r.nextStep && r.nextStep.trim().length > 0);
    if (testWithStep && testWithStep.nextStep) {
      return {
        text: testWithStep.nextStep,
        competency: undefined,
        date: testWithStep.date,
      };
    }

    return null;
  }, [focusAreas, studentResults]);

  // 5. Domain competencies breakdown (Tested vs Untested)
  const domainSummaries = useMemo(() => {
    return DIAGNOSTIC_DOMAINS.map(domain => {
      const allCompetencies = getCompetenciesByDomain(domain.id);
      
      const tested: {
        competency: DiagnosticCompetency;
        latest: LatestCompetencyStatusInfo;
      }[] = [];

      const untested: DiagnosticCompetency[] = [];

      allCompetencies.forEach(comp => {
        const latest = getStudentLatestCompetencyStatus(allDiagnosticResults, student.id, comp.id);
        if (latest) {
          tested.push({ competency: comp, latest });
        } else {
          untested.push(comp);
        }
      });

      return {
        domain,
        tested,
        untested,
        totalCount: allCompetencies.length,
      };
    });
  }, [allDiagnosticResults, student.id]);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar with Overview & Quick Navigation */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Stethoscope size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Diagnostik & Entwicklung
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-bold text-indigo-200">
                Kompetenzbasiert
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Pädagogischer Entwicklungsüberblick für {student.vorname} {student.nachname}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasResults ? (
            <button
              type="button"
              onClick={() => handleOpenFullDiagnostics()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <ExternalLink size={14} />
              <span>Ausführliche Diagnostik öffnen</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleStartTest()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>1:1-Check starten</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Empty State if no diagnosticResults exist */}
      {!hasResults ? (
        <div className="p-8 sm:p-10 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-4 shadow-3xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto shadow-sm">
            <Sparkles size={26} />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-sm font-black text-slate-900">
              Noch keine Ergebnisse im neuen Diagnostiksystem
            </h4>
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              Für {student.vorname} liegen noch keine Erhebungen aus dem kompetenzorientierten Diagnostiksystem vor.
              Starten Sie einen gezielten 1:1-Check oder ein Klassenscreening, um Lernstände und individuelle Förderansätze zu erfassen.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleStartTest()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>1:1-Check für {student.vorname} starten</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 3. Nächster pädagogischer Schritt (falls vorhanden) */}
          {latestNextStep && (
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50/70 via-orange-50/40 to-amber-50/70 border border-amber-200/80 rounded-2xl flex items-start gap-3.5 shadow-3xs">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Lightbulb size={18} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">
                    Nächster pädagogischer Schritt
                  </span>
                  {latestNextStep.date && (
                    <span className="text-[10px] font-bold text-amber-750">
                      Zuletzt erfasst: {formatGermanDate(latestNextStep.date)}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-850 leading-relaxed">
                  „{latestNextStep.text}“
                </p>
                {latestNextStep.competency && (
                  <p className="text-[11px] font-semibold text-amber-800">
                    Bezug: {latestNextStep.competency}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4. Aktueller Kompetenzstand (Nach Fachbereichen gegliedert) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Aktueller Kompetenzstand
                </h4>
                <p className="text-[11px] text-slate-500 font-normal mt-0.5">
                  Neuester erfasster Stand je Kompetenzbereich · Ohne Gesamtnote
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {domainSummaries.map(({ domain, tested, untested, totalCount }) => {
                const isMath = domain.id.includes('math');
                const isLv = domain.id.includes('lernvor');
                const isSl = domain.id.includes('sozial');
                const DomainIcon = isMath ? Calculator : isLv ? Brain : isSl ? Users : BookOpen;
                const domainBadgeStyle = isMath 
                  ? 'bg-amber-50 text-amber-700' 
                  : isLv 
                    ? 'bg-purple-50 text-purple-700' 
                    : isSl 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'bg-sky-50 text-sky-700';

                return (
                  <div 
                    key={domain.id}
                    className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Domain Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${domainBadgeStyle}`}>
                            <DomainIcon size={16} />
                          </div>
                          <div>
                            <h5 className="text-xs font-black text-slate-900">
                              {domain.name}
                            </h5>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {tested.length} von {totalCount} Kompetenzen erfasst
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Tested Competencies List */}
                      {tested.length > 0 ? (
                        <div className="space-y-2">
                          {tested.map(({ competency, latest }) => {
                            const statusConfig = getCompetencyStatusConfig(latest.status);

                            return (
                              <div
                                key={competency.id}
                                className="p-3 bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200/60 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-900">
                                      {competency.name}
                                    </span>
                                    {latest.gradeLevel && (
                                      <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                                        Niveau {latest.gradeLevel}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                                    <span>Erfasst: {formatGermanDate(latest.date)}</span>
                                    {latest.totalAttempts > 1 && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveCompetencyModal(competency);
                                        }}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                                      >
                                        · {latest.totalAttempts} Erhebungen (Verlauf)
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black border ${statusConfig.badgeBg} ${statusConfig.border}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                                    <span>{statusConfig.label}</span>
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setActiveCompetencyModal(competency)}
                                    title="Details & Verlauf anzeigen"
                                    className="p-1 rounded-lg text-slate-450 hover:text-indigo-600 hover:bg-white transition-colors"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                          <p className="text-[11px] font-bold text-slate-500">
                            Noch keine Erhebungen in {domain.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Untested competencies indicator (compact note, not overflowing list) */}
                    {untested.length > 0 && (
                      <div className="pt-2 border-t border-slate-100/80">
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            {untested.length} {untested.length === 1 ? 'weitere Kompetenz' : 'weitere Kompetenzen'} noch ohne Diagnostikeintrag
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenFullDiagnostics()}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            Übersicht
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Stärken & Weiter beobachten (2-Spalten-Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5A. Stärken */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        Stärken & Ressourcen
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Gesicherte Kompetenzen & positive Lösungsstrategien
                      </p>
                    </div>
                  </div>
                </div>

                {strengths.length > 0 ? (
                  <div className="space-y-2">
                    {strengths.slice(0, 4).map((str, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-2.5 bg-emerald-50/40 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-left"
                      >
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {str.title}
                            </span>
                            {str.date && (
                              <span className="text-[10px] text-emerald-800 font-semibold">
                                {formatGermanDate(str.date)}
                              </span>
                            )}
                          </div>
                          {str.description && str.description !== str.title && (
                            <p className="text-[11px] text-slate-600 font-normal mt-0.5">
                              {str.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500">
                      Noch keine spezifischen Stärken erfasst
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5B. Weiter beobachten */}
            <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                      <Eye size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        Weiter beobachten
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        Entwicklungsfelder ohne Defizit-Stigmatisierung
                      </p>
                    </div>
                  </div>
                </div>

                {focusAreas.length > 0 ? (
                  <div className="space-y-2">
                    {focusAreas.slice(0, 4).map((area, aIdx) => {
                      const statusConfig = getCompetencyStatusConfig(area.status);
                      const testAvailable = getDiagnosticTestByCompetencyId(area.competency.id);

                      return (
                        <div
                          key={aIdx}
                          className="p-2.5 bg-amber-50/30 border border-amber-200/60 rounded-xl space-y-1.5 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-black text-slate-900">
                                {area.competency.name}
                              </span>
                              {area.gradeLevel && (
                                <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-200 px-1 py-0.2 rounded">
                                  Niveau {area.gradeLevel}
                                </span>
                              )}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border ${statusConfig.badgeBg} ${statusConfig.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                              <span>{statusConfig.label}</span>
                            </span>
                          </div>

                          {area.nextStep && (
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                              Empfehlung: „{area.nextStep}“
                            </p>
                          )}

                          {/* Quick 1:1 action if test is available */}
                          {testAvailable && (
                            <div className="pt-1 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleStartTest(area.competency.id, area.gradeLevel)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-black transition-all cursor-pointer active:scale-95 shadow-3xs"
                              >
                                <Zap size={11} />
                                <span>1:1-Check starten</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-[11px] font-bold text-slate-500">
                      Aktuell keine Kompetenzen mit Beobachtungsbedarf
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 6. Letzte Diagnostiken (Kompakte Durchführungsliste) */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Letzte Diagnostikdurchführungen
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Die letzten 3–5 Erhebungen mit Quelle (Screening vs. 1:1)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleOpenFullDiagnostics()}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
              >
                <span>Alle ansehen</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {recentTests.length > 0 ? (
              <div className="space-y-2">
                {recentTests.map((res) => {
                  const testDef = getDiagnosticTestById(res.testId) || getDiagnosticScreeningById(res.testId);
                  const isScreening = res.mode === 'screening' || res.source === 'screening';

                  return (
                    <div
                      key={res.id}
                      onClick={() => setActiveResultModal(res)}
                      className="p-3 bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-200/60 hover:border-indigo-200 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-left"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">
                            {testDef?.title || res.testId}
                          </span>

                          {/* Screening vs 1:1-Check Badge */}
                          {isScreening ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                              Screening
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                              1:1-Check
                            </span>
                          )}

                          {res.gradeLevel && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                              Niveau {res.gradeLevel}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-slate-500 font-medium">
                          Durchgeführt am {formatGermanDate(res.date)}
                        </p>
                      </div>

                      {/* Competency status summary */}
                      <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-center">
                        {(res.competencyResults || []).map((cr, crIdx) => {
                          const statusConfig = getCompetencyStatusConfig(cr.status);
                          return (
                            <span
                              key={crIdx}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black border ${statusConfig.badgeBg} ${statusConfig.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
                              <span>{statusConfig.label}</span>
                            </span>
                          );
                        })}
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <p className="text-[11px] font-bold text-slate-500">
                  Keine kürzlichen Erhebungen vorhanden
                </p>
              </div>
            )}
          </div>

          {/* 7. Bottom Navigation Link */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="space-y-0.5">
              <span className="text-xs font-black text-slate-800 block">
                Möchten Sie den gesamten Lernverlauf im Detail untersuchen?
              </span>
              <span className="text-[11px] text-slate-500 font-normal block">
                In „Ergebnisse & Entwicklung“ finden Sie interaktive Verläufe, Aufgabenanalysen und Beobachtungsprotokolle.
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenFullDiagnostics()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <span>Detailanalyse öffnen</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </>
      )}

      {/* Embedded Modals for instant detailed inspection */}
      {activeCompetencyModal && (
        <CompetencyDetailModal
          competency={activeCompetencyModal}
          student={student}
          results={allDiagnosticResults}
          onClose={() => setActiveCompetencyModal(null)}
          onSelectResultDetail={(res) => {
            setActiveCompetencyModal(null);
            setActiveResultModal(res);
          }}
        />
      )}

      {activeResultModal && (
        <DiagnosticResultDetailModal
          result={activeResultModal}
          student={student}
          onClose={() => setActiveResultModal(null)}
        />
      )}
    </div>
  );
};

export default DossierDiagnosticDevelopment;
