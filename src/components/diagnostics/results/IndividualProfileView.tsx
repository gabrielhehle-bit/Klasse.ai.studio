import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Calculator, 
  Brain, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Sparkles, 
  Lightbulb, 
  Eye, 
  Plus, 
  ChevronRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Student } from '../../../types';
import { 
  DiagnosticResult, 
  DiagnosticCompetency, 
  DiagnosticDomain,
  CompetencyStatus 
} from '../../../types/diagnosticCore';
import { 
  DIAGNOSTIC_DOMAINS,
  DIAGNOSTIC_COMPETENCIES,
  DIAGNOSTIC_COMPETENCY_AREAS
} from '../../../data/diagnosticCompetencies';
import { 
  getCompetenciesByDomain,
  getCompetencyStatusConfig,
  getStudentDomainCompetenciesStatus,
  getStudentStrengthsAndObservations,
  getStudentFocusAreas,
  getStudentRecentDiagnostics,
  getDiagnosticTestById,
  getDiagnosticScreeningById,
  formatGermanDate,
  DomainCompetencyOverviewItem
} from '../../../lib/diagnosticCoreUtils';

interface IndividualProfileViewProps {
  student: Student;
  results: DiagnosticResult[];
  activeClassName?: string;
  onOpenCompetencyDetail: (competency: DiagnosticCompetency) => void;
  onOpenResultDetail: (result: DiagnosticResult) => void;
  onStartIndividualTest: (studentId?: string) => void;
}

export const IndividualProfileView: React.FC<IndividualProfileViewProps> = ({
  student,
  results,
  activeClassName,
  onOpenCompetencyDetail,
  onOpenResultDetail,
  onStartIndividualTest,
}) => {
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('all');

  // Filter all results for this student
  const studentResults = useMemo(() => {
    return results
      .filter(r => r.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }, [results, student.id]);

  const lastTestDate = studentResults.length > 0 ? studentResults[0].date : undefined;

  // Stärken & Weiter beobachten
  const strengths = useMemo(() => {
    return getStudentStrengthsAndObservations(results, student.id);
  }, [results, student.id]);

  const focusAreas = useMemo(() => {
    return getStudentFocusAreas(results, student.id);
  }, [results, student.id]);

  // Last 5 tests
  const recentTests = useMemo(() => {
    return getStudentRecentDiagnostics(results, student.id, 5);
  }, [results, student.id]);

  // Filter domains according to filter
  const displayedDomains = useMemo(() => {
    if (selectedDomainFilter === 'all') {
      return DIAGNOSTIC_DOMAINS;
    }
    return DIAGNOSTIC_DOMAINS.filter(d => d.id === selectedDomainFilter);
  }, [selectedDomainFilter]);

  const getDomainIcon = (domainId: string) => {
    switch (domainId) {
      case 'deutsch':
        return <BookOpen className="w-4 h-4" />;
      case 'mathematik':
        return <Calculator className="w-4 h-4" />;
      case 'lernvoraussetzungen':
        return <Brain className="w-4 h-4" />;
      case 'sozial-lernen':
        return <Users className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  // =========================================================================
  // CASE 1: Student has 0 results (Quiet Empty State)
  // =========================================================================
  if (studentResults.length === 0) {
    return (
      <div className="space-y-6">
        {/* Compact Student Header */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-base flex items-center justify-center shadow-2xs">
              {student.vorname?.[0]}{student.nachname?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {student.vorname} {student.nachname}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                {activeClassName && <span>Klasse {activeClassName}</span>}
                {activeClassName && <span>•</span>}
                <span className="text-slate-400">Noch keine Diagnostik erfasst</span>
              </div>
            </div>
          </div>

          <button
            id="btn-start-test-for-empty-student"
            onClick={() => onStartIndividualTest(student.id)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Diagnostik starten</span>
          </button>
        </div>

        {/* Quiet Empty State Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
            <Sparkles className="w-7 h-7 text-amber-500" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">
              Noch keine Diagnostikergebnisse
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              Sobald du einen 1:1-Check oder später ein Screening durchführst, erscheint hier das differenzierte Kompetenzprofil von {student.vorname}.
            </p>
          </div>

          <div className="pt-2">
            <button
              id="btn-empty-start-first-test"
              onClick={() => onStartIndividualTest(student.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>1:1-Check für {student.vorname} durchführen</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // CASE 2: Student has results (Individual Competency Profile)
  // =========================================================================
  return (
    <div className="space-y-6">
      {/* 1. Student Header Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-base flex items-center justify-center shadow-2xs">
            {student.vorname?.[0]}{student.nachname?.[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                {student.vorname} {student.nachname}
              </h2>
              {activeClassName && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                  Klasse {activeClassName}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="font-medium">
                <strong>{studentResults.length}</strong> {studentResults.length === 1 ? 'Diagnostik-Ergebnis' : 'Diagnostik-Ergebnisse'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Letzte Erhebung: {formatGermanDate(lastTestDate, 'long')}
              </span>
            </div>
          </div>
        </div>

        <button
          id="btn-add-test-for-student"
          onClick={() => onStartIndividualTest(student.id)}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Neuen 1:1 Check starten</span>
        </button>
      </div>

      {/* 2. Domain Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedDomainFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            selectedDomainFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
          }`}
        >
          Alle Bereiche
        </button>
        {DIAGNOSTIC_DOMAINS.map(domain => {
          const isSelected = selectedDomainFilter === domain.id;
          return (
            <button
              key={domain.id}
              onClick={() => setSelectedDomainFilter(domain.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80'
              }`}
            >
              {getDomainIcon(domain.id)}
              <span>{domain.name}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Domain Competencies Profile Grid */}
      <div className="space-y-5">
        {displayedDomains.map(domain => {
          const items: DomainCompetencyOverviewItem[] = getStudentDomainCompetenciesStatus(
            results,
            student.id,
            domain.id
          );

          if (items.length === 0) return null;

          return (
            <div
              key={domain.id}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-5 space-y-4"
            >
              {/* Domain Title bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                    {getDomainIcon(domain.id)}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {domain.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {domain.description}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-400">
                  {items.filter(i => i.isTested).length} von {items.length} überprüft
                </span>
              </div>

              {/* Competencies Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(item => {
                  const comp = item.competency;
                  const statusCfg = item.latestStatus ? getCompetencyStatusConfig(item.latestStatus) : null;

                  return (
                    <div
                      key={comp.id}
                      onClick={() => onOpenCompetencyDetail(comp)}
                      className="group p-3.5 rounded-2xl border border-slate-200/80 hover:border-indigo-300 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3"
                    >
                      {/* Top: Competency name & description */}
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {comp.name}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0 mt-0.5" />
                        </div>
                        {comp.description && (
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                            {comp.description}
                          </p>
                        )}
                      </div>

                      {/* Bottom: Status & Level or Untested */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                        {item.isTested && statusCfg ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              {item.latestGradeLevel && (
                                <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold">
                                  Niveau {item.latestGradeLevel}
                                </span>
                              )}
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                                {statusCfg.label}
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-400 font-medium">
                              {formatGermanDate(item.latestDate)}
                            </span>
                          </>
                        ) : (
                          <div className="w-full flex items-center justify-between">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200/60">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                              Noch nicht überprüft
                            </span>
                            <span className="text-[10px] text-slate-400 italic">
                              Klick für Detail
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Grid: Stärken & Weiter beobachten */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Stärken */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-emerald-800 border-b border-slate-100 pb-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Stärken & gesicherte Grundlagen
            </h4>
          </div>

          {strengths.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Noch keine gesicherten Kompetenzen aus Durchführungen erfasst.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {strengths.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs flex items-start gap-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="space-y-0.5 flex-1">
                    <span className="font-bold text-slate-800 block">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="text-slate-600 block text-[11px]">
                        {item.description}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weiter beobachten */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-amber-800 border-b border-slate-100 pb-2.5">
            <Eye className="w-4 h-4 text-amber-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Weiter beobachten & Förderschritte
            </h4>
          </div>

          {focusAreas.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Aktuell keine Kompetenzen mit zusätzlichem Beobachtungsbedarf markiert.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {focusAreas.map((item, idx) => {
                const statusCfg = getCompetencyStatusConfig(item.status);
                return (
                  <div
                    key={idx}
                    onClick={() => onOpenCompetencyDetail(item.competency)}
                    className="p-2.5 rounded-xl bg-amber-50/40 border border-amber-100/90 text-xs flex items-start justify-between gap-2 hover:bg-amber-50/80 transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">
                          {item.competency.name}
                        </span>
                        {item.gradeLevel && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                            Niveau {item.gradeLevel}
                          </span>
                        )}
                      </div>
                      {item.nextStep && (
                        <p className="text-slate-600 text-[11px] italic line-clamp-1">
                          „{item.nextStep}“
                        </p>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. Letzte Diagnostiken (Last 5 test runs) */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Letzte Diagnostik-Durchführungen
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            Klick öffnet das Einzelergebnis
          </span>
        </div>

        <div className="space-y-2">
          {recentTests.map((res, idx) => {
            const testDef = getDiagnosticTestById(res.testId) || getDiagnosticScreeningById(res.testId);
            const isScreening = res.mode === 'screening' || res.source === 'screening';

            return (
              <div
                key={res.id || idx}
                onClick={() => onOpenResultDetail(res)}
                className="p-3 rounded-2xl border border-slate-200/80 hover:border-indigo-300 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {testDef?.title || res.testId}
                    </span>
                    {isScreening ? (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        Screening
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                        1:1-Check
                      </span>
                    )}
                    {res.gradeLevel && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                        Niveau {res.gradeLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>{formatGermanDate(res.date, 'long')}</span>
                    {res.rawScore !== undefined && res.maxScore !== undefined && (
                      <>
                        <span>•</span>
                        <span>{res.rawScore}/{res.maxScore} Punkte ({res.normalizedScore ?? Math.round((res.rawScore / res.maxScore) * 100)}%)</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Badges of evaluated competencies in this test */}
                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center shrink-0">
                  {(res.competencyResults || []).map((cr, crIdx) => {
                    const statusCfg = getCompetencyStatusConfig(cr.status);
                    const comp = DIAGNOSTIC_COMPETENCIES.find(c => c.id === cr.competencyId);
                    return (
                      <span
                        key={crIdx}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                        title={comp?.name}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                        <span>{comp?.name || cr.competencyId}: {statusCfg.label}</span>
                      </span>
                    );
                  })}
                  <ChevronRight className="w-4 h-4 text-slate-400 ml-1" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
