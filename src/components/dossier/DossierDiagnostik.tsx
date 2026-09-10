import React, { useState, useMemo } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Stethoscope,
  Sparkles,
  CheckCircle2,
  Eye,
  Clock,
  ArrowRight,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BookOpen,
  Calculator,
  Brain,
  Users,
  AlertCircle,
  FileText,
  Target,
  Lightbulb,
  ExternalLink,
  Info,
  Calendar,
  Layers,
  X,
  History,
  Archive,
  Play
} from 'lucide-react';
import {
  DIAGNOSTIC_DOMAINS,
  DIAGNOSTIC_COMPETENCIES,
  DIAGNOSTIC_COMPETENCY_AREAS
} from '../../data/diagnosticCompetencies';
import {
  getCompetenciesByDomain,
  getCompetencyStatusConfig,
  getStudentLatestCompetencyStatus,
  getStudentCompetencyHistory,
  formatGermanDate,
  getDiagnosticTestById,
  getDiagnosticScreeningById,
  LatestCompetencyStatusInfo,
  StudentCompetencyHistoryEntry
} from '../../lib/diagnosticCoreUtils';
import {
  getDiagnosticTestByCompetencyId,
  DIAGNOSTIC_TESTS
} from '../../data/diagnosticTests';
import { getDiagnosticTestName, getValidStudentDiagnostics, isDiagnosticAlert } from '../../lib/diagnosticData';
import { CompetencyDetailModal } from '../diagnostics/results/CompetencyDetailModal';
import { DiagnosticTestRunner } from '../diagnostics/runner/DiagnosticTestRunner';
import { DossierTab } from '../StudentDossier';
import { DiagnosticResult, DiagnosticCompetency, DiagnosticTestDefinition } from '../../types/diagnosticCore';

interface DossierDiagnostikProps {
  student: Student;
  onNavigateTab?: (tab: 'lernziele' | 'foerderprofil') => void;
  onTabChange?: (tab: DossierTab) => void;
}

export default function DossierDiagnostik({
  student,
  onNavigateTab,
  onTabChange
}: DossierDiagnostikProps) {
  const { app, setApp, updateApp, setPage } = useApp();

  // Selected competency for detail history modal
  const [selectedCompetencyForDetail, setSelectedCompetencyForDetail] = useState<DiagnosticCompetency | null>(null);

  // Runner state for embedded 1:1 check
  const [activeTestForRunner, setActiveTestForRunner] = useState<{
    test: DiagnosticTestDefinition;
    competencyId?: string;
  } | null>(null);

  // Goal derivation modal state ("Förderziel ableiten")
  const [goalModalData, setGoalModalData] = useState<{
    competency: DiagnosticCompetency;
    domainName: string;
    suggestedGoal: string;
  } | null>(null);

  // Accordion state for domains (Progressive Disclosure)
  // Default: Deutsch and Mathe expanded, others can be clicked to open
  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({
    deutsch: true,
    mathe: true,
    lernvoraussetzungen: false,
    sozial_lernen: false
  });

  const toggleDomain = (domainId: string) => {
    setExpandedDomains(prev => ({
      ...prev,
      [domainId]: !prev[domainId]
    }));
  };

  // State for collapsible legacy archive
  const [showLegacyArchive, setShowLegacyArchive] = useState(false);

  // Diagnostic results for this student
  const allDiagnosticResults = app.diagnosticResults || [];
  const studentResults = useMemo(() => {
    return allDiagnosticResults.filter(r => r.studentId === student.id);
  }, [allDiagnosticResults, student.id]);

  // Save result handler for test runner
  const handleSaveRunnerResult = (result: DiagnosticResult) => {
    const updated = [result, ...(app.diagnosticResults || [])];
    updateApp({ diagnosticResults: updated });
    setActiveTestForRunner(null);
  };

  // Start 1:1 check helper
  const handleStartCheck = (comp: DiagnosticCompetency) => {
    const testDef = getDiagnosticTestByCompetencyId(comp.id);
    if (testDef) {
      setActiveTestForRunner({ test: testDef, competencyId: comp.id });
    } else {
      // Fallback: pick domain test or navigate
      const area = DIAGNOSTIC_COMPETENCY_AREAS.find(a => a.id === comp.areaId);
      const domainTests = DIAGNOSTIC_TESTS.filter(t => t.domainId === area?.domainId);
      if (domainTests.length > 0) {
        setActiveTestForRunner({ test: domainTests[0], competencyId: comp.id });
      } else {
        updateApp({
          activeDiagnosticView: 'individual',
          selectedDiagnosticStudentId: student.id,
          selectedDiagnosticCompetencyId: comp.id
        });
        setPage('diagnostik');
      }
    }
  };

  // Derive goal handler ("Förderziel ableiten")
  const handleOpenGoalModal = (comp: DiagnosticCompetency, domainName: string) => {
    const suggested = `Kompetenz im Bereich ${comp.name} festigen und gezielt begleiten`;
    setGoalModalData({
      competency: comp,
      domainName,
      suggestedGoal: suggested
    });
  };

  const handleSaveDerivedGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalModalData) return;

    const freshGoal = {
      id: `ziel-${Date.now()}`,
      ziel: goalModalData.suggestedGoal.trim(),
      bereich: goalModalData.domainName,
      startDatum: new Date().toISOString().split('T')[0],
      zielDatum: '',
      status: 'offen' as const,
      diagnostikErhebungId: goalModalData.competency.id
    };

    const currentProfil = student.foerderprofil || {};
    const existingGoals = currentProfil.foerderziele || [];

    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? {
        ...s,
        foerderprofil: {
          ...s.foerderprofil,
          foerderziele: [...existingGoals, freshGoal],
          letzteAktualisierung: new Date().toISOString()
        }
      } : s)
    }));

    setGoalModalData(null);
    if (onTabChange) {
      onTabChange('foerderung');
    } else if (onNavigateTab) {
      onNavigateTab('foerderprofil');
    }
  };

  // Structure competencies per domain
  const domainsWithData = useMemo(() => {
    return DIAGNOSTIC_DOMAINS.map(domain => {
      const allCompetencies = getCompetenciesByDomain(domain.id);
      
      const tested: {
        competency: DiagnosticCompetency;
        latest: LatestCompetencyStatusInfo;
        history: StudentCompetencyHistoryEntry[];
      }[] = [];

      const untested: DiagnosticCompetency[] = [];

      allCompetencies.forEach(comp => {
        const latest = getStudentLatestCompetencyStatus(allDiagnosticResults, student.id, comp.id);
        const history = getStudentCompetencyHistory(allDiagnosticResults, student.id, comp.id);
        if (latest) {
          tested.push({ competency: comp, latest, history });
        } else {
          untested.push(comp);
        }
      });

      return {
        domain,
        tested,
        untested,
        allCompetencies,
        isExpanded: !!expandedDomains[domain.id]
      };
    });
  }, [allDiagnosticResults, student.id, expandedDomains]);

  // Legacy diagnostic data
  const diagnosenErhebungen = useMemo(() => {
    return getValidStudentDiagnostics(app, student.id);
  }, [app, student.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Pädagogische Diagnostik
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-bold text-indigo-300">
                Kompetenzbasiert
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Strukturierte Erfassung fachlicher Kompetenzen und grundlegender Lernvoraussetzungen
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setApp(prev => ({
                ...prev,
                activePrintTemplate: 'elternbericht',
                activePrintStudentId: student.id
              }));
              setPage('drucken');
            }}
            className="px-3 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer active:scale-95"
            title="Pädagogischen Elternbericht drucken"
          >
            <FileText size={14} className="text-indigo-300" />
            <span>Elternbericht</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateApp({
                activeDiagnosticView: 'individual',
                selectedDiagnosticStudentId: student.id
              });
              setPage('diagnostik');
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Neuer Check</span>
          </button>
        </div>
      </div>

      {/* 2. PROGRESSIVE OFFENLEGUNG: 4 FACHBEREICHE */}
      <div className="space-y-4">
        {domainsWithData.map(({ domain, tested, untested, allCompetencies, isExpanded }) => {
          const isMath = domain.id.includes('math');
          const isLv = domain.id.includes('lernvor');
          const isSl = domain.id.includes('sozial');

          const DomainIcon = isMath ? Calculator : isLv ? Brain : isSl ? Users : BookOpen;
          const badgeTheme = isMath 
            ? 'bg-amber-50 text-amber-800 border-amber-200/80' 
            : isLv 
            ? 'bg-purple-50 text-purple-800 border-purple-200/80' 
            : isSl 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80' 
            : 'bg-sky-50 text-sky-800 border-sky-200/80';

          return (
            <div
              key={domain.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-3xs overflow-hidden transition-all"
            >
              {/* Domain Summary Header Button (Toggle) */}
              <button
                type="button"
                onClick={() => toggleDomain(domain.id)}
                className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer focus:outline-none"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${badgeTheme}`}>
                    <DomainIcon size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900">
                        {domain.name}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {tested.length} von {allCompetencies.length} Kompetenzen erfasst
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      {isLv 
                        ? 'Aufmerksamkeit, Arbeitsgedächtnis, Wahrnehmung & Graphomotorik'
                        : isMath
                        ? 'Zahlen & Operationen, Größen & Messen, Raum & Form'
                        : isSl
                        ? 'Arbeitsverhalten, Sozialverhalten & Metakognition'
                        : 'Lesen, Schreiben, Textverständnis & Sprachgefühl'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-400">
                    {isExpanded ? 'Einklappen' : 'Öffnen'}
                  </span>
                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Expanded Category Content */}
              {isExpanded && (
                <div className="p-4 sm:p-5 border-t border-slate-100 space-y-4 bg-slate-50/30">
                  {/* Spezifischer Hinweis für Lernvoraussetzungen */}
                  {isLv && (
                    <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex items-start gap-2.5 text-left">
                      <Info size={16} className="text-purple-700 shrink-0 mt-0.5" />
                      <p className="text-xs text-purple-900 leading-relaxed font-medium">
                        Diese Beobachtungschecks unterstützen die pädagogische Einschätzung von Lernvoraussetzungen. Sie ersetzen keine medizinische oder psychologische Diagnostik.
                      </p>
                    </div>
                  )}

                  {/* Competencies List */}
                  <div className="space-y-3">
                    {/* Tested Competencies */}
                    {tested.map(({ competency, latest, history }) => {
                      const statusCfg = getCompetencyStatusConfig(latest.status);

                      return (
                        <div
                          key={competency.id}
                          className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200/80 shadow-3xs space-y-3 text-left"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">
                                  {competency.name}
                                </span>
                                {latest.gradeLevel && (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                    Niveau {latest.gradeLevel}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                                <span>Letzter Check: {formatGermanDate(latest.date)}</span>
                                {history.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCompetencyForDetail(competency)}
                                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                  >
                                    <History size={11} />
                                    <span>{history.length} Erhebungen im Verlauf</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                              {/* 4-Stufen qualitative Status Badge */}
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${statusCfg.badgeBg} ${statusCfg.border}`}>
                                <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                                <span>{statusCfg.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Chronological progression indicator if multiple checks exist */}
                          {history.length > 1 && (
                            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-[10px]">
                              <span className="font-bold text-slate-400 shrink-0">Entwicklungsverlauf:</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {history.map((h, hIdx) => {
                                  const hCfg = getCompetencyStatusConfig(h.status);
                                  return (
                                    <React.Fragment key={h.resultId || hIdx}>
                                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${hCfg.badgeBg} ${hCfg.border}`}>
                                        {formatGermanDate(h.date)}: {hCfg.label}
                                      </span>
                                      {hIdx < history.length - 1 && (
                                        <ChevronRight size={11} className="text-slate-300" />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Pedagogical next step / observation if present */}
                          {latest.nextStep && (
                            <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-200/70 text-[11px] text-amber-900 font-medium">
                              <span className="font-bold">Nächster pädagogischer Schritt:</span> {latest.nextStep}
                            </div>
                          )}

                          {/* Action Buttons: 1:1 Check & Förderziel ableiten */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedCompetencyForDetail(competency)}
                              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 hover:underline"
                            >
                              Verlauf & Kriterien anzeigen
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenGoalModal(competency, domain.name)}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-3xs cursor-pointer active:scale-95"
                                title="Aus diesem Befund ein Förderziel ableiten"
                              >
                                <Target size={12} />
                                <span>Förderziel ableiten</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleStartCheck(competency)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-3xs cursor-pointer active:scale-95"
                                title="1:1-Check für diese Kompetenz durchführen"
                              >
                                <Play size={11} />
                                <span>1:1-Check starten</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Untested Competencies (Foldable list) */}
                    {untested.length > 0 && (
                      <div className="p-3 bg-white/70 rounded-xl border border-dashed border-slate-200 space-y-2">
                        <div className="text-[11px] font-bold text-slate-500">
                          Noch nicht erfasste Kompetenzen in {domain.name} ({untested.length}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {untested.map(uComp => (
                            <button
                              key={uComp.id}
                              type="button"
                              onClick={() => handleStartCheck(uComp)}
                              className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200/80 rounded-lg text-[10px] font-medium text-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                              title="Check starten"
                            >
                              <span>{uComp.name}</span>
                              <Plus size={10} className="text-indigo-600" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. KLASSISCHE ERHEBUNGEN & ARCHIV (Ausklappbar) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
        <button
          type="button"
          onClick={() => setShowLegacyArchive(!showLegacyArchive)}
          className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
              <Archive size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Klassische Erhebungen, Screenings & Archiv ({diagnosenErhebungen.length})
              </h4>
              <p className="text-[10px] text-slate-500">
                Frühere Testprotokolle, Antolin-Einträge und historische Verlaufsdaten
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
            <span>{showLegacyArchive ? 'Einklappen' : 'Archiv anzeigen'}</span>
            {showLegacyArchive ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showLegacyArchive && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {diagnosenErhebungen.length > 0 ? (
              diagnosenErhebungen.map((entry: any) => (
                <div
                  key={entry.id}
                  className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">
                      {getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}
                    </span>
                    {entry.kommentar && (
                      <p className="text-slate-500 text-[11px] mt-0.5">{entry.kommentar}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-700">{entry.ergebniswert || 'Dokumentiert'}</span>
                    <div className="text-[10px] text-slate-400">{entry.datum ? formatGermanDate(entry.datum) : ''}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Keine klassischen Erhebungen im Archiv vorhanden.
              </p>
            )}
          </div>
        )}
      </div>

      {/* MODAL: Competency Detail & Chronological Progression */}
      {selectedCompetencyForDetail && (
        <CompetencyDetailModal
          competency={selectedCompetencyForDetail}
          student={student}
          results={allDiagnosticResults}
          onClose={() => setSelectedCompetencyForDetail(null)}
        />
      )}

      {/* MODAL: Embedded 1:1 Check Runner */}
      {activeTestForRunner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <DiagnosticTestRunner
              student={student}
              test={activeTestForRunner.test}
              onSaveResult={handleSaveRunnerResult}
              onCancel={() => setActiveTestForRunner(null)}
            />
          </div>
        </div>
      )}

      {/* MODAL: Förderziel ableiten */}
      {goalModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Förderziel aus Diagnostik ableiten
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setGoalModalData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveDerivedGoal} className="space-y-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Befund / Kompetenz</span>
                <p className="text-xs font-black text-slate-900 mt-0.5">
                  {goalModalData.competency.name} ({goalModalData.domainName})
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Pädagogisches Förderziel *
                </label>
                <textarea
                  rows={3}
                  required
                  value={goalModalData.suggestedGoal}
                  onChange={e => setGoalModalData({ ...goalModalData, suggestedGoal: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 text-[11px] text-emerald-800 leading-relaxed font-medium">
                Das Ziel wird im Förderprofil von {student.vorname} hinterlegt und direkt mit dieser Diagnostik verknüpft.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGoalModalData(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95"
                >
                  Ziel speichern & zur Förderung
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
