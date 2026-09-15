import React, { useState, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Calculator, 
  Brain, 
  ChevronRight, 
  GraduationCap, 
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../types';
import { 
  DiagnosticDomain, 
  DiagnosticCompetencyArea, 
  DiagnosticCompetency,
  DiagnosticResult 
} from '../../types/diagnosticCore';
import { 
  DIAGNOSTIC_DOMAINS, 
  DIAGNOSTIC_COMPETENCY_AREAS 
} from '../../data/diagnosticCompetencies';
import { 
  getCompetenciesByArea,
  getDiagnosticDomain,
  getDiagnosticCompetencyArea,
  getDiagnosticCompetency,
  getDiagnosticScreeningByCompetencyId,
  evaluateScreeningForStudent,
  StudentScreeningTaskResponse
} from '../../lib/diagnosticCoreUtils';
import { DiagnosticNavigationHeader, BreadcrumbItem } from './DiagnosticNavigationHeader';
import { DiagnosticScreeningSetup } from './screening/DiagnosticScreeningSetup';
import { DiagnosticScreeningRunner } from './screening/DiagnosticScreeningRunner';
import { DiagnosticScreeningPreview } from './screening/DiagnosticScreeningPreview';

interface DiagnosticClassProps {
  students?: Student[];
  onBackToHome: () => void;
  activeClassId?: string;
  activeClassName?: string;
  onSaveDiagnosticResults?: (results: DiagnosticResult[]) => boolean;
  onStartIndividualTest?: (studentId: string, competencyId?: string, gradeLevel?: number) => void;
  onNavigateToResults?: () => void;
}

export const DiagnosticClass: React.FC<DiagnosticClassProps> = ({
  students = [],
  onBackToHome,
  activeClassId,
  activeClassName,
  onSaveDiagnosticResults,
  onStartIndividualTest,
  onNavigateToResults,
}) => {
  // Navigation / Selection State
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(null);

  // Screening Session State
  const [isRunningScreening, setIsRunningScreening] = useState<boolean>(false);
  const [screeningLevel, setScreeningLevel] = useState<number>(2);
  const [activeScreeningStudents, setActiveScreeningStudents] = useState<Student[]>([]);
  const [evaluatedResults, setEvaluatedResults] = useState<DiagnosticResult[] | null>(null);
  const [savedSuccessMessage, setSavedSuccessMessage] = useState<string | null>(null);
  const [screeningErrorMessage, setScreeningErrorMessage] = useState<string | null>(null);

  // Resolved entities
  const selectedDomain: DiagnosticDomain | undefined = useMemo(() => {
    return selectedDomainId ? getDiagnosticDomain(selectedDomainId) : undefined;
  }, [selectedDomainId]);

  const selectedArea: DiagnosticCompetencyArea | undefined = useMemo(() => {
    return selectedAreaId ? getDiagnosticCompetencyArea(selectedAreaId) : undefined;
  }, [selectedAreaId]);

  const selectedCompetency: DiagnosticCompetency | undefined = useMemo(() => {
    return selectedCompetencyId ? getDiagnosticCompetency(selectedCompetencyId) : undefined;
  }, [selectedCompetencyId]);

  // Check if a screening is registered for the selected competency
  const registeredScreening = useMemo(() => {
    if (!selectedCompetencyId) return undefined;
    return getDiagnosticScreeningByCompetencyId(selectedCompetencyId);
  }, [selectedCompetencyId]);

  // Filtered areas for selected domain
  const availableAreas: DiagnosticCompetencyArea[] = useMemo(() => {
    if (!selectedDomainId) return [];
    return DIAGNOSTIC_COMPETENCY_AREAS
      .filter(a => a.domainId === selectedDomainId)
      .sort((a, b) => a.order - b.order);
  }, [selectedDomainId]);

  // Filtered competencies for selected area
  const availableCompetencies: DiagnosticCompetency[] = useMemo(() => {
    if (!selectedAreaId) return [];
    return getCompetenciesByArea(selectedAreaId);
  }, [selectedAreaId]);

  // Domain Icon Renderer
  const renderDomainIcon = (iconName: string, className = "w-6 h-6") => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className={className} />;
      case 'Calculator': return <Calculator className={className} />;
      case 'Brain': return <Brain className={className} />;
      case 'Users': return <Users className={className} />;
      default: return <BookOpen className={className} />;
    }
  };

  // Build Breadcrumbs
  const breadcrumbs: BreadcrumbItem[] = useMemo(() => {
    const items: BreadcrumbItem[] = [
      { label: 'Diagnostik', onClick: onBackToHome },
      { 
        label: 'Klassenscreening', 
        onClick: selectedDomainId ? () => {
          setSelectedDomainId(null);
          setSelectedAreaId(null);
          setSelectedCompetencyId(null);
          setIsRunningScreening(false);
          setEvaluatedResults(null);
        } : undefined 
      },
    ];

    if (selectedDomain) {
      items.push({
        label: selectedDomain.name,
        onClick: selectedAreaId ? () => {
          setSelectedAreaId(null);
          setSelectedCompetencyId(null);
          setIsRunningScreening(false);
          setEvaluatedResults(null);
        } : undefined,
      });
    }

    if (selectedArea) {
      items.push({
        label: selectedArea.name,
        onClick: selectedCompetencyId ? () => {
          setSelectedCompetencyId(null);
          setIsRunningScreening(false);
          setEvaluatedResults(null);
        } : undefined,
      });
    }

    if (selectedCompetency) {
      items.push({
        label: selectedCompetency.name,
      });
    }

    return items;
  }, [selectedDomain, selectedArea, selectedCompetency, onBackToHome, selectedDomainId, selectedAreaId, selectedCompetencyId]);

  // Handle Step Back
  const handleStepBack = () => {
    if (evaluatedResults) {
      setEvaluatedResults(null);
    } else if (isRunningScreening) {
      setIsRunningScreening(false);
    } else if (selectedCompetencyId) {
      setSelectedCompetencyId(null);
    } else if (selectedAreaId) {
      setSelectedAreaId(null);
    } else if (selectedDomainId) {
      setSelectedDomainId(null);
    } else {
      onBackToHome();
    }
  };

  // Start Screening from Setup
  const handleStartScreening = (level: number, selectedStudents: Student[]) => {
    if (!activeClassId) {
      setScreeningErrorMessage('Für ein Klassenscreening muss zuerst eine aktive Klasse ausgewählt sein.');
      return;
    }
    setScreeningLevel(level);
    setActiveScreeningStudents(selectedStudents);
    setIsRunningScreening(true);
    setEvaluatedResults(null);
    setSavedSuccessMessage(null);
    setScreeningErrorMessage(null);
  };

  // Runner completed -> Evaluate results for each student
  const handleFinishRunner = (
    responsesByStudent: Record<string, Record<string, StudentScreeningTaskResponse>>
  ) => {
    if (!registeredScreening || !selectedCompetency) return;
    if (!activeClassId) {
      setScreeningErrorMessage('Das Screening wurde nicht ausgewertet, weil keine aktive Klasse zugeordnet ist.');
      setIsRunningScreening(false);
      return;
    }

    const screeningSessionId = `session-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const results: DiagnosticResult[] = [];

    activeScreeningStudents.forEach(student => {
      const studentTaskResponses = responsesByStudent[student.id] || {};
      const evalRes = evaluateScreeningForStudent({
        student,
        testDefinition: registeredScreening,
        level: screeningLevel,
        classId: activeClassId,
        screeningSessionId,
        taskResponses: studentTaskResponses,
      });
      results.push(evalRes);
    });

    setEvaluatedResults(results);
    setIsRunningScreening(false);
  };

  // Save All Evaluated Results
  const handleSaveAllResults = (results: DiagnosticResult[]) => {
    const saved = onSaveDiagnosticResults ? onSaveDiagnosticResults(results) : false;
    if (!saved) {
      setScreeningErrorMessage('Die Screening-Ergebnisse wurden nicht gespeichert. Bitte Zuordnung und aktive Klasse prüfen.');
      return;
    }
    setSavedSuccessMessage(`${results.length} Screening-Ergebnisse wurden erfolgreich gespeichert.`);
    setScreeningErrorMessage(null);
    setEvaluatedResults(null);
    setIsRunningScreening(false);
    setSelectedCompetencyId(null);
  };

  // Active Runner Mode
  if (isRunningScreening && registeredScreening) {
    return (
      <DiagnosticScreeningRunner
        testDefinition={registeredScreening}
        level={screeningLevel}
        students={activeScreeningStudents}
        activeClassName={activeClassName}
        onFinishScreening={handleFinishRunner}
        onCancelScreening={() => {
          setIsRunningScreening(false);
          setEvaluatedResults(null);
        }}
      />
    );
  }

  // Active Preview Mode
  if (evaluatedResults && registeredScreening && selectedCompetency) {
    return (
      <DiagnosticScreeningPreview
        testDefinition={registeredScreening}
        competency={selectedCompetency}
        level={screeningLevel}
        students={activeScreeningStudents}
        evaluatedResults={evaluatedResults}
        activeClassName={activeClassName}
        onSaveAll={handleSaveAllResults}
        onBackToRunner={() => {
          setIsRunningScreening(true);
        }}
        onCancel={() => {
          setEvaluatedResults(null);
        }}
        onStartIndividualTest={(studentId, competencyId, gradeLevel) => {
          if (onStartIndividualTest) {
            onStartIndividualTest(studentId, competencyId, gradeLevel);
          }
        }}
      />
    );
  }

  return (
    <div className="max-w-[1180px] mx-auto py-4 px-3 sm:px-6 lg:px-8 space-y-5">
      {screeningErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <span className="text-xs font-bold text-rose-800">{screeningErrorMessage}</span>
          <button
            type="button"
            onClick={() => setScreeningErrorMessage(null)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2 py-1 cursor-pointer"
          >
            Schließen
          </button>
        </div>
      )}

      {/* Success Notification Banner if saved */}
      {savedSuccessMessage && (
        <div className="p-4 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-2xl flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[var(--accent)] shrink-0" />
            <span className="text-xs font-bold text-emerald-900">
              {savedSuccessMessage}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onNavigateToResults && (
              <button
                type="button"
                onClick={onNavigateToResults}
                className="text-xs font-bold text-[var(--accent)] hover:text-emerald-800 underline px-2 py-1 cursor-pointer"
              >
                Zur Auswertung
              </button>
            )}
            <button
              type="button"
              onClick={() => setSavedSuccessMessage(null)}
              className="text-xs font-semibold text-[var(--text-muted,var(--text3))] hover:text-slate-700 px-2 py-1 cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <DiagnosticNavigationHeader
        title="Klassenscreening & Lernbereich"
        subtitle={
          !selectedDomain
            ? "Welchen Lernbereich möchtest du mit der Klasse screenen?"
            : !selectedArea
            ? `Kompetenzbereich in ${selectedDomain.name} wählen`
            : !selectedCompetency
            ? `Spezifische Kompetenz für das Screening in ${selectedArea.name} wählen`
            : `Ausgewählte Screening-Kompetenz`
        }
        breadcrumbs={breadcrumbs}
        onBack={handleStepBack}
        backLabel={selectedDomain ? "Zurück" : "Zur Übersicht"}
        actionSlot={
          activeClassName && (
            <span className="text-xs font-semibold px-2.5 py-1 bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 rounded-full">
              Klasse {activeClassName}
            </span>
          )
        }
      />

      <AnimatePresence mode="wait">
        {/* ===================================================================
            SCHRITT A: Fachbereich auswählen
            =================================================================== */}
        {!selectedDomainId && (
          <motion.div
            key="step-class-domain"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DIAGNOSTIC_DOMAINS.map((domain) => (
                <button
                  key={domain.id}
                  id={`btn-class-domain-${domain.id}`}
                  onClick={() => setSelectedDomainId(domain.id)}
                  className="group flex flex-col justify-between p-6 bg-[var(--surface-card,var(--surface))] border border-[var(--border-subtle,var(--border))] rounded-2xl hover:border-[var(--accent)]/35 hover:shadow-md transition-all text-left cursor-pointer"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-subtle,var(--border))] flex items-center justify-center text-slate-700 mb-4 group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent)] group-hover:border-emerald-100 transition-all">
                      {renderDomainIcon(domain.icon)}
                    </div>
                    <h4 className="text-lg font-bold text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors mb-1.5">
                      {domain.name}
                    </h4>
                    <p className="text-xs text-[var(--text-muted,var(--text3))] leading-relaxed">
                      {domain.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-[var(--border-subtle,var(--border))] flex items-center justify-between text-xs font-semibold text-[var(--text-muted,var(--text3))] group-hover:text-[var(--accent)]">
                    <span>Kompetenzbereiche öffnen</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT B: Kompetenzbereich auswählen
            =================================================================== */}
        {selectedDomain && !selectedAreaId && (
          <motion.div
            key="step-class-area"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-6">
              <h3 className="text-lg font-bold text-[var(--text-primary,var(--text))]">
                {selectedDomain.name} – Kompetenzbereich wählen
              </h3>
              <p className="text-xs text-[var(--text-muted,var(--text3))] mt-0.5">
                Wähle den Schwerpunkt für das gemeinsame Klassenscreening
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableAreas.map((area) => {
                const count = getCompetenciesByArea(area.id).length;
                return (
                  <button
                    key={area.id}
                    id={`btn-class-area-${area.id}`}
                    onClick={() => setSelectedAreaId(area.id)}
                    className="group flex flex-col justify-between p-5 bg-[var(--surface-card,var(--surface))] border border-[var(--border-subtle,var(--border))] rounded-xl hover:border-[var(--accent)]/35 hover:shadow-sm transition-all text-left cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-bold text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors">
                          {area.name}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? 'Kompetenz' : 'Kompetenzen'}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-muted,var(--text3))] leading-relaxed">
                        {area.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-[var(--border-subtle,var(--border))] flex items-center justify-between text-xs font-semibold text-[var(--text-muted,var(--text3))] group-hover:text-[var(--accent)]">
                      <span>Kompetenzen anzeigen</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT C: Einzelkompetenz auswählen
            =================================================================== */}
        {selectedDomain && selectedArea && !selectedCompetencyId && (
          <motion.div
            key="step-class-competency"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-5">
              <h3 className="text-lg font-bold text-[var(--text-primary,var(--text))]">
                {selectedArea.name} – Kompetenz auswählen
              </h3>
              <p className="text-xs text-[var(--text-muted,var(--text3))] mt-0.5">
                Wähle die Zielkompetenz für das Screening
              </p>
            </div>

            <div className="space-y-3">
              {availableCompetencies.map((comp) => {
                const hasScreening = !!getDiagnosticScreeningByCompetencyId(comp.id);

                return (
                  <button
                    key={comp.id}
                    id={`btn-class-competency-${comp.id}`}
                    onClick={() => setSelectedCompetencyId(comp.id)}
                    className="w-full group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--surface-card,var(--surface))] border border-[var(--border-subtle,var(--border))] rounded-xl hover:border-[var(--accent)]/35 hover:shadow-xs transition-all text-left cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors">
                          {comp.name}
                        </h4>
                        {comp.recommendedGrade && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-[var(--text-secondary,var(--text2))]">
                            <GraduationCap className="w-3 h-3" />
                            Stufe {comp.recommendedGrade.join(', ')}
                          </span>
                        )}
                        {hasScreening && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20">
                            <Sparkles className="w-3 h-3" />
                            Screening bereit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted,var(--text3))] line-clamp-2">
                        {comp.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--accent)]">
                        {hasScreening ? 'Screening starten' : 'Screening vorbereiten'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT D: Ausgewählte Kompetenz -> Setup oder Fallback
            =================================================================== */}
        {selectedDomain && selectedArea && selectedCompetency && (
          <motion.div
            key="step-class-setup-or-fallback"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {registeredScreening ? (
              <DiagnosticScreeningSetup
                testDefinition={registeredScreening}
                competency={selectedCompetency}
                domain={selectedDomain}
                area={selectedArea}
                students={students}
                activeClassName={activeClassName}
                onStartScreening={handleStartScreening}
                onCancel={() => setSelectedCompetencyId(null)}
              />
            ) : (
              <div className="space-y-6">
                {/* Pfad-Zusammenfassung */}
                <div className="bg-white rounded-2xl border border-[var(--border-default,var(--border2))] p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle,var(--border))] pb-4 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider">
                        Ausgewählter Screening-Bereich
                      </span>
                      <h3 className="text-lg font-bold text-[var(--text-primary,var(--text))] mt-1">
                        {selectedCompetency.name}
                      </h3>
                      <p className="text-xs text-[var(--text-muted,var(--text3))] mt-0.5">
                        {selectedDomain.name} • {selectedArea.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded-full text-xs font-bold">
                        <Users className="w-3.5 h-3.5" />
                        Klassenscreening
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary,var(--text2))] leading-relaxed bg-[var(--surface-subtle,var(--surface2))] p-4 rounded-xl border border-[var(--border-subtle,var(--border))]">
                    {selectedCompetency.description}
                  </p>
                </div>

                {/* Neutraler Fallback */}
                <div className="bg-gradient-to-br from-slate-50 to-emerald-50/30 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white border border-[var(--border-default,var(--border2))] text-[var(--accent)] flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-[var(--text-primary,var(--text))] mb-1">
                    Für diese Kompetenz ist noch kein Klassenscreening hinterlegt.
                  </h4>
                  <p className="text-xs text-[var(--text-muted,var(--text3))] max-w-md mx-auto leading-relaxed">
                    Pilot-Screenings sind aktuell für <strong>Mengenverständnis</strong>, <strong>Zehnerübergang</strong> und <strong>Leseverständnis</strong> verfügbar.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      id="btn-class-choose-other-competency"
                      onClick={() => setSelectedCompetencyId(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-[var(--border-default,var(--border2))] rounded-lg hover:bg-[var(--surface-subtle,var(--surface2))] transition-colors cursor-pointer shadow-xs"
                    >
                      Andere Kompetenz wählen
                    </button>
                    <button
                      id="btn-class-choose-other-domain"
                      onClick={() => {
                        setSelectedDomainId(null);
                        setSelectedAreaId(null);
                        setSelectedCompetencyId(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[var(--accent)] bg-[var(--accent-soft)] border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                    >
                      Anderen Fachbereich wählen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
