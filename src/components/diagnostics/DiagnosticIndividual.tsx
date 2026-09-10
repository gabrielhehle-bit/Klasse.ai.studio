import React, { useState, useMemo } from 'react';
import { 
  User, 
  Search, 
  BookOpen, 
  Calculator, 
  Brain, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  GraduationCap, 
  RotateCcw,
  Sparkles,
  Play,
  Layers,
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
  getDiagnosticCompetency 
} from '../../lib/diagnosticCoreUtils';
import { getDiagnosticTestByCompetencyId } from '../../data/diagnosticTests';
import { DiagnosticNavigationHeader, BreadcrumbItem } from './DiagnosticNavigationHeader';
import { DiagnosticTestRunner } from './runner/DiagnosticTestRunner';

interface DiagnosticIndividualProps {
  students: Student[];
  initialStudentId?: string;
  initialCompetencyId?: string;
  initialGradeLevel?: number;
  onBackToHome: () => void;
  onSaveDiagnosticResult?: (result: DiagnosticResult) => void;
  onNavigateToResults?: () => void;
}

export const DiagnosticIndividual: React.FC<DiagnosticIndividualProps> = ({
  students,
  initialStudentId,
  initialCompetencyId,
  initialGradeLevel,
  onBackToHome,
  onSaveDiagnosticResult,
  onNavigateToResults,
}) => {
  // Determine initial domain, area and competency if initialCompetencyId is supplied
  const initialData = useMemo(() => {
    if (!initialCompetencyId) return { domainId: null, areaId: null, compId: null };
    const comp = getDiagnosticCompetency(initialCompetencyId);
    if (!comp) return { domainId: null, areaId: null, compId: null };
    const area = getDiagnosticCompetencyArea(comp.areaId);
    if (!area) return { domainId: null, areaId: null, compId: comp.id };
    return {
      domainId: area.domainId,
      areaId: area.id,
      compId: comp.id,
    };
  }, [initialCompetencyId]);

  // Navigation / Selection State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    if (initialStudentId) {
      return students.find(s => s.id === initialStudentId) || null;
    }
    return null;
  });
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(initialData.domainId);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(initialData.areaId);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(initialData.compId);

  // Active Test Runner state
  const [isRunningTest, setIsRunningTest] = useState<boolean>(false);
  const [justSavedResult, setJustSavedResult] = useState<DiagnosticResult | null>(null);

  // Search state for student list
  const [searchQuery, setSearchQuery] = useState('');

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

  // Check if a registered test definition exists for this competency
  const registeredTest = useMemo(() => {
    if (!selectedCompetencyId) return undefined;
    return getDiagnosticTestByCompetencyId(selectedCompetencyId);
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

  // Filtered students by search
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => 
      `${s.vorname} ${s.nachname}`.toLowerCase().includes(q) ||
      (s.name && s.name.toLowerCase().includes(q))
    );
  }, [students, searchQuery]);

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
        label: 'Einzelkind', 
        onClick: selectedStudent ? () => {
          setSelectedStudent(null);
          setSelectedDomainId(null);
          setSelectedAreaId(null);
          setSelectedCompetencyId(null);
        } : undefined 
      },
    ];

    if (selectedStudent) {
      items.push({
        label: `${selectedStudent.vorname} ${selectedStudent.nachname}`,
        onClick: selectedDomainId ? () => {
          setSelectedDomainId(null);
          setSelectedAreaId(null);
          setSelectedCompetencyId(null);
        } : undefined,
      });
    }

    if (selectedDomain) {
      items.push({
        label: selectedDomain.name,
        onClick: selectedAreaId ? () => {
          setSelectedAreaId(null);
          setSelectedCompetencyId(null);
        } : undefined,
      });
    }

    if (selectedArea) {
      items.push({
        label: selectedArea.name,
        onClick: selectedCompetencyId ? () => {
          setSelectedCompetencyId(null);
        } : undefined,
      });
    }

    if (selectedCompetency) {
      items.push({
        label: selectedCompetency.name,
        onClick: isRunningTest ? () => setIsRunningTest(false) : undefined,
      });
    }

    if (isRunningTest && registeredTest) {
      items.push({
        label: '1:1-Check',
      });
    }

    return items;
  }, [selectedStudent, selectedDomain, selectedArea, selectedCompetency, isRunningTest, registeredTest, onBackToHome]);

  // Handle Back Button
  const handleStepBack = () => {
    if (isRunningTest) {
      setIsRunningTest(false);
    } else if (justSavedResult) {
      setJustSavedResult(null);
      setSelectedCompetencyId(null);
    } else if (selectedCompetencyId) {
      setSelectedCompetencyId(null);
    } else if (selectedAreaId) {
      setSelectedAreaId(null);
    } else if (selectedDomainId) {
      setSelectedDomainId(null);
    } else if (selectedStudent) {
      setSelectedStudent(null);
    } else {
      onBackToHome();
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-3 px-2 sm:px-4">
      {/* Navigation Header with Breadcrumbs */}
      <DiagnosticNavigationHeader
        title="Einzelkind-Diagnostik"
        subtitle={
          !selectedStudent
            ? "Wähle eine Schülerin oder einen Schüler für den 1:1-Check aus"
            : !selectedDomain
            ? `Fachbereich für ${selectedStudent.vorname} ${selectedStudent.nachname} wählen`
            : !selectedArea
            ? `Kompetenzbereich in ${selectedDomain.name} wählen`
            : !selectedCompetency
            ? `Spezifische Kompetenz in ${selectedArea.name} wählen`
            : `Ausgewählte Kompetenz für ${selectedStudent.vorname}`
        }
        breadcrumbs={breadcrumbs}
        onBack={handleStepBack}
        backLabel={selectedStudent ? "Zurück" : "Zur Übersicht"}
      />

      <AnimatePresence mode="wait">
        {/* ===================================================================
            SCHRITT A: Schülerauswahl
            =================================================================== */}
        {!selectedStudent && (
          <motion.div
            key="step-student"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Suchfeld */}
            <div className="mb-6 max-w-md">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="input-search-student-diagnostic"
                  placeholder="Schüler:in suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Schüler-Grid */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                <User className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-slate-700">Keine Kinder gefunden</p>
                <p className="text-xs text-slate-400 mt-1">
                  {students.length === 0 
                    ? "In dieser Klasse sind noch keine Schüler:innen angelegt." 
                    : "Kein Eintrag entspricht dem aktuellen Suchfilter."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {filteredStudents.map((s) => {
                  const initials = `${s.vorname?.[0] || ''}${s.nachname?.[0] || ''}`.toUpperCase() || '?';
                  return (
                    <button
                      key={s.id}
                      id={`btn-select-student-${s.id}`}
                      onClick={() => {
                        setSelectedStudent(s);
                        setSearchQuery('');
                      }}
                      className="group flex items-center justify-between p-4 bg-white border border-slate-200/90 rounded-xl hover:border-indigo-300 hover:shadow-xs transition-all text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                            {s.vorname} {s.nachname}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {s.espf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                ESPF
                              </span>
                            )}
                            {s.spf && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                SPF
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              Niveau {s.niveau || 1}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT B: Fachbereich (Domain) auswählen
            =================================================================== */}
        {selectedStudent && !selectedDomainId && (
          <motion.div
            key="step-domain"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {/* Kind Banner */}
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                  {selectedStudent.vorname[0]}{selectedStudent.nachname[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {selectedStudent.vorname} {selectedStudent.nachname}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Schritt 1 von 3 • Was möchtest du anschauen?
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 underline cursor-pointer"
              >
                Anderes Kind
              </button>
            </div>

            {/* 4 Zentrale Domänen aus diagnosticCompetencies.ts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DIAGNOSTIC_DOMAINS.map((domain) => (
                <button
                  key={domain.id}
                  id={`btn-domain-${domain.id}`}
                  onClick={() => setSelectedDomainId(domain.id)}
                  className="group flex flex-col justify-between p-6 bg-white border border-slate-200/90 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all text-left cursor-pointer"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-4 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                      {renderDomainIcon(domain.icon)}
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5">
                      {domain.name}
                    </h4>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {domain.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-indigo-600">
                    <span>Kompetenzbereiche öffnen</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT C: Kompetenzbereich auswählen
            =================================================================== */}
        {selectedStudent && selectedDomain && !selectedAreaId && (
          <motion.div
            key="step-area"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {selectedDomain.name} – Kompetenzbereich wählen
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wähle einen Teilbereich zur detaillierten Erfassung
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableAreas.map((area) => {
                const count = getCompetenciesByArea(area.id).length;
                return (
                  <button
                    key={area.id}
                    id={`btn-area-${area.id}`}
                    onClick={() => setSelectedAreaId(area.id)}
                    className="group flex flex-col justify-between p-5 bg-white border border-slate-200/90 rounded-xl hover:border-indigo-400 hover:shadow-sm transition-all text-left cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {area.name}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {count} {count === 1 ? 'Kompetenz' : 'Kompetenzen'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {area.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-indigo-600">
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
            SCHRITT D: Einzelkompetenz auswählen
            =================================================================== */}
        {selectedStudent && selectedDomain && selectedArea && !selectedCompetencyId && (
          <motion.div
            key="step-competency"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedArea.name} – Kompetenz auswählen
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Wähle die gezielte Kompetenz für {selectedStudent.vorname}
              </p>
            </div>

            <div className="space-y-3">
              {availableCompetencies.map((comp) => {
                const hasTest = !!getDiagnosticTestByCompetencyId(comp.id);

                return (
                  <button
                    key={comp.id}
                    id={`btn-competency-${comp.id}`}
                    onClick={() => setSelectedCompetencyId(comp.id)}
                    className={`w-full group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border rounded-xl hover:shadow-xs transition-all text-left cursor-pointer ${
                      hasTest ? 'border-indigo-200/90 hover:border-indigo-500' : 'border-slate-200/90 hover:border-slate-400'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {comp.name}
                        </h4>
                        {hasTest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            1:1-Check bereit
                          </span>
                        )}
                        {comp.recommendedGrade && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            <GraduationCap className="w-3 h-3" />
                            Stufe {comp.recommendedGrade.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {comp.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className="text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                        Auswählen
                      </span>
                      <ChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===================================================================
            SCHRITT E: Endzustand / 1:1-Test-Runner / Test-Starter
            =================================================================== */}
        {selectedStudent && selectedDomain && selectedArea && selectedCompetency && (
          <motion.div
            key="step-endstate"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Fall A: Aktive Testdurchführung */}
            {isRunningTest && registeredTest ? (
              <DiagnosticTestRunner
                student={selectedStudent}
                test={registeredTest}
                initialGradeLevel={(selectedStudent as any).niveau || (selectedStudent as any).stufe || 1}
                onSaveResult={(savedResult) => {
                  if (onSaveDiagnosticResult) {
                    onSaveDiagnosticResult(savedResult);
                  }
                  setJustSavedResult(savedResult);
                  setIsRunningTest(false);
                }}
                onCancel={() => setIsRunningTest(false)}
              />
            ) : justSavedResult ? (
              /* Fall B: Erfolgreich gespeichertes Ergebnis */
              <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-xs text-center space-y-6 max-w-2xl mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Erhebung abgeschlossen
                  </span>
                  <h3 className="text-xl font-bold text-slate-900">
                    Ergebnis erfolgreich gespeichert!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Der 1:1-Check für <strong>{selectedStudent.vorname} {selectedStudent.nachname}</strong> ({selectedCompetency.name}) wurde in den Diagnostik-Ergebnissen hinterlegt.
                  </p>
                </div>

                {/* Score & Next Step preview */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left space-y-2 text-xs">
                  {justSavedResult.gradeLevel && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Schulstufe/Niveau:</span>
                      <span className="font-bold text-slate-900">Niveau {justSavedResult.gradeLevel}</span>
                    </div>
                  )}
                  {justSavedResult.rawScore !== undefined && justSavedResult.maxScore !== undefined && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold">Ergebnis:</span>
                      <span className="font-bold text-indigo-600">{justSavedResult.rawScore} / {justSavedResult.maxScore} richtig ({justSavedResult.normalizedScore}%)</span>
                    </div>
                  )}
                  {justSavedResult.nextStep && (
                    <div className="pt-2 border-t border-slate-200/60 text-slate-700">
                      <span className="font-semibold text-slate-900 block mb-0.5">Nächster Schritt:</span>
                      <p className="text-slate-600 italic">„{justSavedResult.nextStep}“</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {onNavigateToResults && (
                    <button
                      type="button"
                      id="btn-goto-results-overview"
                      onClick={() => onNavigateToResults()}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <span>Ergebnisse & Entwicklung ansehen</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    id="btn-new-check-same-student"
                    onClick={() => {
                      setJustSavedResult(null);
                      setSelectedCompetencyId(null);
                      setSelectedAreaId(null);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                  >
                    Weitere Kompetenz für {selectedStudent.vorname} prüfen
                  </button>

                  <button
                    type="button"
                    id="btn-check-other-student"
                    onClick={() => {
                      setJustSavedResult(null);
                      setSelectedStudent(null);
                      setSelectedDomainId(null);
                      setSelectedAreaId(null);
                      setSelectedCompetencyId(null);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Anderes Kind wählen
                  </button>
                </div>
              </div>
            ) : registeredTest ? (
              /* Fall C: Registrierter Test verfügbar -> Test Launch Card */
              <div className="space-y-6">
                {/* Pfad-Zusammenfassung */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                        Ausgewählte Kompetenz
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {selectedCompetency.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedDomain.name} • {selectedArea.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                        <User className="w-3.5 h-3.5" />
                        {selectedStudent.vorname} {selectedStudent.nachname}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedCompetency.description}
                  </p>

                  {selectedCompetency.tags && selectedCompetency.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {selectedCompetency.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 1:1 Check Launch Card */}
                <div className="bg-white rounded-2xl border-2 border-indigo-600/30 p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-bold">
                          1:1-Diagnostik-Check bereit
                        </span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          ca. {registeredTest.durationMinutes} Min.
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-slate-900">
                        {registeredTest.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-xl">
                        {registeredTest.subtitle || registeredTest.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        id="btn-launch-1to1-test"
                        onClick={() => setIsRunningTest(true)}
                        className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.99]"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>Check jetzt starten</span>
                      </button>
                    </div>
                  </div>

                  {/* Level overview */}
                  <div className="relative z-10 pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-3">
                      Enthaltene Niveaustufen (frei wählbar)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                      {registeredTest.levels.map((lvl) => (
                        <div
                          key={lvl.level}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-left flex flex-col justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">
                              {lvl.label}
                            </span>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {lvl.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-semibold text-indigo-600 mt-2 block">
                            {lvl.tasks.length} Aufgaben
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Erfasst Lösungswege, Strategien (z. B. Subitizing, Bündelung) und Beobachtungs-Tags</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-choose-other-comp-from-card"
                        onClick={() => setSelectedCompetencyId(null)}
                        className="text-xs text-slate-500 hover:text-slate-800 font-medium underline cursor-pointer"
                      >
                        Andere Kompetenz
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Fall D: Neutraler Endzustand für noch nicht migrierte Kompetenzen */
              <div className="space-y-6">
                {/* Pfad-Zusammenfassung */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                        Ausgewählter Diagnostik-Pfad
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {selectedCompetency.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {selectedDomain.name} • {selectedArea.name}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                        <User className="w-3.5 h-3.5" />
                        {selectedStudent.vorname} {selectedStudent.nachname}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedCompetency.description}
                  </p>

                  {selectedCompetency.tags && selectedCompetency.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {selectedCompetency.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-xs">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    Noch kein neuer Diagnostik-Check für diese Kompetenz hinterlegt.
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    In den nächsten Schritten werden hier standardisierte 1:1-Checks, Beobachtungsraster und Förderempfehlungen für <strong>{selectedCompetency.name}</strong> verknüpft.
                  </p>

                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      id="btn-choose-other-competency"
                      onClick={() => setSelectedCompetencyId(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
                    >
                      Andere Kompetenz wählen
                    </button>
                    <button
                      id="btn-choose-other-student"
                      onClick={() => {
                        setSelectedStudent(null);
                        setSelectedDomainId(null);
                        setSelectedAreaId(null);
                        setSelectedCompetencyId(null);
                      }}
                      className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer"
                    >
                      Anderes Kind wählen
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
