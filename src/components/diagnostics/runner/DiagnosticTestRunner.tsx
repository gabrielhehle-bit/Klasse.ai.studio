import React, { useState, useMemo } from 'react';
import { 
  User, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Layers, 
  Clock, 
  AlertTriangle,
  Play,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../../types';
import { 
  DiagnosticLevelDefinition, 
  DiagnosticObservationTag, 
  DiagnosticResult, 
  DiagnosticTaskDefinition, 
  DiagnosticTestDefinition 
} from '../../../types/diagnosticCore';
import { CompletedTaskRecord, evaluateOneToOneTest } from '../../../lib/diagnosticEvaluation';
import { DiagnosticTaskVisualView } from './DiagnosticTaskVisual';
import { DiagnosticObservationPanel } from './DiagnosticObservationPanel';
import { DiagnosticResultReview } from './DiagnosticResultReview';

interface DiagnosticTestRunnerProps {
  student: Student;
  test: DiagnosticTestDefinition;
  initialGradeLevel?: number;
  onSaveResult: (result: DiagnosticResult) => void;
  onCancel: () => void;
}

type RunnerStep = 'setup' | 'running' | 'review';

export const DiagnosticTestRunner: React.FC<DiagnosticTestRunnerProps> = ({
  student,
  test,
  initialGradeLevel,
  onSaveResult,
  onCancel,
}) => {
  // Determine suggested level based on student or initialGradeLevel
  const defaultLevelNum = useMemo(() => {
    if (initialGradeLevel && initialGradeLevel >= 1 && initialGradeLevel <= 4) {
      return initialGradeLevel;
    }
    const studentNiveau = (student as any).niveau || (student as any).stufe || (student as any).klasse;
    if (typeof studentNiveau === 'number' && studentNiveau >= 1 && studentNiveau <= 4) {
      return studentNiveau;
    }
    return 1;
  }, [student, initialGradeLevel]);

  // State
  const [selectedLevelNum, setSelectedLevelNum] = useState<number>(defaultLevelNum);
  const [currentStep, setCurrentStep] = useState<RunnerStep>('setup');
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Store answers and observations for each task
  const [taskResponses, setTaskResponses] = useState<
    Record<
      string,
      {
        selectedValue?: any;
        isCorrect: boolean;
        observationTags: DiagnosticObservationTag[];
        teacherNote?: string;
      }
    >
  >({});

  // Active level definition
  const activeLevel: DiagnosticLevelDefinition = useMemo(() => {
    const found = test.levels.find(l => l.level === selectedLevelNum);
    return found || test.levels[0];
  }, [test.levels, selectedLevelNum]);

  // Tasks in active level
  const tasks: DiagnosticTaskDefinition[] = useMemo(() => {
    return activeLevel.tasks || [];
  }, [activeLevel]);

  const currentTask: DiagnosticTaskDefinition | undefined = tasks[currentTaskIndex];

  // Current response state
  const currentResponse = useMemo(() => {
    if (!currentTask) return { isCorrect: false, observationTags: [] };
    return taskResponses[currentTask.id] || {
      selectedValue: undefined,
      isCorrect: false,
      observationTags: currentTask.defaultObservationTags ? [...currentTask.defaultObservationTags.slice(0, 1)] : [],
      teacherNote: '',
    };
  }, [currentTask, taskResponses]);

  // Handle Level Selection
  const handleStartTest = (levelNum: number) => {
    setSelectedLevelNum(levelNum);
    setCurrentStep('running');
    setCurrentTaskIndex(0);
    setTaskResponses({});
  };

  // Record Answer for Current Task
  const handleOptionSelect = (option: { label: string; value: any; isCorrect?: boolean; strategyTag?: DiagnosticObservationTag }) => {
    if (!currentTask) return;
    const isCorrect = option.isCorrect !== undefined ? option.isCorrect : option.value === currentTask.correctValue;

    setTaskResponses(prev => {
      const existingTags = prev[currentTask.id]?.observationTags || [];
      let newTags: DiagnosticObservationTag[];

      if (option.strategyTag) {
        newTags = Array.from(new Set([option.strategyTag, ...existingTags.filter(t => t !== 'instant' && t !== 'hesitant')]));
      } else if (existingTags.length > 0) {
        newTags = existingTags;
      } else {
        newTags = isCorrect ? ['instant'] : ['hesitant'];
      }

      return {
        ...prev,
        [currentTask.id]: {
          ...prev[currentTask.id],
          selectedValue: option.value,
          isCorrect,
          observationTags: newTags,
        },
      };
    });
  };

  // Direct Teacher Quick Correctness Toggles
  const handleSetCorrectness = (isCorrect: boolean) => {
    if (!currentTask) return;
    setTaskResponses(prev => ({
      ...prev,
      [currentTask.id]: {
        ...prev[currentTask.id],
        isCorrect,
        observationTags: prev[currentTask.id]?.observationTags || (isCorrect ? ['instant'] : ['hesitant']),
      },
    }));
  };

  // Toggle Observation Tag
  const handleToggleObservationTag = (tag: DiagnosticObservationTag) => {
    if (!currentTask) return;
    const currentTags = currentResponse.observationTags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];

    setTaskResponses(prev => ({
      ...prev,
      [currentTask.id]: {
        ...prev[currentTask.id],
        isCorrect: prev[currentTask.id]?.isCorrect ?? false,
        observationTags: newTags,
      },
    }));
  };

  // Change Teacher Note
  const handleChangeTeacherNote = (note: string) => {
    if (!currentTask) return;
    setTaskResponses(prev => ({
      ...prev,
      [currentTask.id]: {
        ...prev[currentTask.id],
        isCorrect: prev[currentTask.id]?.isCorrect ?? false,
        observationTags: prev[currentTask.id]?.observationTags || [],
        teacherNote: note,
      },
    }));
  };

  // Navigation between tasks
  const handleNextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Proceed to review
      setCurrentStep('review');
    }
  };

  const handlePreviousTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(prev => prev - 1);
    }
  };

  // Compile completed records for evaluation
  const completedTaskRecords: CompletedTaskRecord[] = useMemo(() => {
    return tasks.map(task => {
      const resp = taskResponses[task.id];
      return {
        taskId: task.id,
        task,
        isCorrect: resp ? resp.isCorrect : false,
        selectedValue: resp ? resp.selectedValue : undefined,
        observationTags: resp ? resp.observationTags : [],
        teacherNote: resp ? resp.teacherNote : undefined,
      };
    });
  }, [tasks, taskResponses]);

  // Compute Evaluation Result
  const evaluationResult = useMemo(() => {
    return evaluateOneToOneTest(activeLevel, completedTaskRecords, test.id);
  }, [activeLevel, completedTaskRecords, test.id]);

  // Calculate Progress
  const progressPercent = tasks.length > 0 ? Math.round(((currentTaskIndex + 1) / tasks.length) * 100) : 0;
  const answeredCount = Object.keys(taskResponses).length;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. SETUP / LEVEL SELECTION STEP */}
      {/* ========================================================================= */}
      {currentStep === 'setup' && (
        <motion.div
          key="step-setup"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Header Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                  1:1-Diagnostik-Check
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {test.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {test.subtitle || test.description}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-bold shrink-0 border border-indigo-100">
                <User className="w-4 h-4 text-indigo-600" />
                <span>{student.vorname} {student.nachname}</span>
              </div>
            </div>

            {/* Test info details */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Dauer: ca. {test.durationMinutes} Minuten</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <Layers className="w-4 h-4 text-slate-400" />
                <span>4 Schulstufen-Niveaus verfügbar</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-indigo-700">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Lehrer-geführte Beobachtung</span>
              </div>
            </div>
          </div>

          {/* Level Selection Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-bold text-slate-900">
                Niveaustufe auswählen
              </h3>
              <span className="text-xs text-slate-500">
                Startvorschlag basiert auf Klassenstufe
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {test.levels.map(lvl => {
                const isSelected = lvl.level === selectedLevelNum;
                const isRecommended = defaultLevelNum === lvl.level;

                return (
                  <div
                    key={lvl.level}
                    onClick={() => setSelectedLevelNum(lvl.level)}
                    className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left relative ${
                      isSelected
                        ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {lvl.level}
                          </span>
                          {lvl.label}
                        </span>

                        {isRecommended && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                            Klassen-Vorschlag
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        {lvl.description}
                      </p>

                      {lvl.focusPoints && lvl.focusPoints.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {lvl.focusPoints.map((pt, i) => (
                            <li key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                              <span className="text-indigo-500 font-bold">•</span>
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">
                        {lvl.tasks.length} Aufgaben • ca. {lvl.durationMinutes || 7} Min.
                      </span>
                      <span className={isSelected ? 'text-indigo-600 font-bold' : 'text-slate-400'}>
                        {isSelected ? 'Ausgewählt' : 'Wählen'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action footer */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              id="btn-cancel-setup"
              onClick={onCancel}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
            >
              Abbrechen
            </button>

            <button
              type="button"
              id="btn-start-test-runner"
              onClick={() => handleStartTest(selectedLevelNum)}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Check für {activeLevel.shortLabel} starten</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 2. ACTIVE TEST RUNNING STEP */}
      {/* ========================================================================= */}
      {currentStep === 'running' && currentTask && (
        <motion.div
          key={`step-running-${currentTask.id}`}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.15 }}
          className="max-w-3xl mx-auto space-y-5"
        >
          {/* Top Progress & Header Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {test.title}
                </span>
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold">
                  {activeLevel.shortLabel}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  {student.vorname} {student.nachname}
                </span>
                <button
                  type="button"
                  id="btn-abort-test"
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors font-medium cursor-pointer"
                >
                  Beenden
                </button>
              </div>
            </div>

            {/* Progress Bar & Indicators */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span>Aufgabe {currentTaskIndex + 1} von {tasks.length}</span>
                <span>{progressPercent}% abgeschlossen</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Task dot pills for jump */}
              <div className="flex items-center justify-center gap-1.5 pt-2">
                {tasks.map((t, idx) => {
                  const isCurrent = idx === currentTaskIndex;
                  const isAnswered = !!taskResponses[t.id];
                  const isSuccess = taskResponses[t.id]?.isCorrect;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      id={`pill-jump-${idx}`}
                      onClick={() => setCurrentTaskIndex(idx)}
                      className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'ring-2 ring-indigo-600 bg-indigo-600 text-white scale-110'
                          : isAnswered
                            ? isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Active Task Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            {/* Teacher Instruction Header */}
            {currentTask.instruction && (
              <div className="flex items-start gap-2.5 p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 font-medium">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 block">
                    Lehrer-Anweisung:
                  </span>
                  <span>{currentTask.instruction}</span>
                </div>
              </div>
            )}

            {/* Prompt Question */}
            <div className="text-center">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                {currentTask.prompt}
              </h3>
            </div>

            {/* Visual Task Material */}
            {currentTask.visual && (
              <DiagnosticTaskVisualView visual={currentTask.visual} />
            )}

            {/* Response Options / Teacher Input */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {test.mode === 'observation' ? 'Pädagogische Beobachtung erfassen' : 'Reaktion / Antwort des Kindes erfassen'}
                </label>
                <span className="text-[11px] text-slate-400">
                  {test.mode === 'observation' 
                    ? 'Wähle die passende Beobachtungsausprägung' 
                    : 'Wähle die gegebene Antwort oder setze direkt Richtig/Falsch'}
                </span>
              </div>

              {/* Multiple Choice Options (if task has options) */}
              {currentTask.options && currentTask.options.length > 0 && (
                <div className={`grid gap-2.5 ${
                  test.mode === 'observation' 
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' 
                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                }`}>
                  {currentTask.options.map((opt, i) => {
                    const isSelected = currentResponse.selectedValue === opt.value;
                    const isCorrect = opt.isCorrect !== undefined ? opt.isCorrect : opt.value === currentTask.correctValue;

                    return (
                      <button
                        key={i}
                        type="button"
                        id={`opt-btn-${i}`}
                        onClick={() => handleOptionSelect(opt)}
                        className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer font-bold text-sm flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? test.mode === 'observation'
                              ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm scale-[1.01]'
                              : isCorrect
                                ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm scale-[1.02]'
                                : 'bg-rose-600 border-rose-700 text-white shadow-sm scale-[1.02]'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <span className="leading-snug">{opt.label}</span>
                        {test.mode !== 'observation' && isCorrect && (
                          <span className={`text-[10px] font-normal ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                            (Zielantwort)
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Direct Teacher Assessment Buttons (Always available for flexibility) */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  id="btn-mark-correct"
                  onClick={() => handleSetCorrectness(true)}
                  className={`flex-1 sm:flex-none sm:min-w-[170px] py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    currentResponse.isCorrect && currentResponse.selectedValue === undefined
                      ? test.mode === 'observation'
                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                        : 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                      : currentResponse.isCorrect && currentResponse.selectedValue !== undefined
                        ? test.mode === 'observation'
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-200'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{test.mode === 'observation' ? 'Gelingt überwiegend sicher' : 'Richtig / Gelingt'}</span>
                </button>

                <button
                  type="button"
                  id="btn-mark-incorrect"
                  onClick={() => handleSetCorrectness(false)}
                  className={`flex-1 sm:flex-none sm:min-w-[170px] py-2.5 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    !currentResponse.isCorrect && currentResponse.selectedValue === undefined && taskResponses[currentTask.id]
                      ? test.mode === 'observation'
                        ? 'bg-amber-600 border-amber-700 text-white shadow-xs'
                        : 'bg-rose-600 border-rose-700 text-white shadow-xs'
                      : !currentResponse.isCorrect && currentResponse.selectedValue !== undefined
                        ? test.mode === 'observation'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>{test.mode === 'observation' ? 'Zeigt Unterstützungsbedarf' : 'Falsch / Unsicher'}</span>
                </button>
              </div>
            </div>

            {/* Qualitative Observation Panel */}
            <DiagnosticObservationPanel
              availableTags={currentTask.defaultObservationTags}
              selectedTags={currentResponse.observationTags}
              onToggleTag={handleToggleObservationTag}
              teacherNote={currentResponse.teacherNote}
              onChangeTeacherNote={handleChangeTeacherNote}
            />
          </div>

          {/* Navigation Controls Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              id="btn-task-previous"
              disabled={currentTaskIndex === 0}
              onClick={handlePreviousTask}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Vorherige</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-task-next"
                onClick={handleNextTask}
                className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-[0.99]"
              >
                <span>{currentTaskIndex === tasks.length - 1 ? 'Zur Auswertung' : 'Nächste Aufgabe'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ========================================================================= */}
      {/* 3. REVIEW STEP */}
      {/* ========================================================================= */}
      {currentStep === 'review' && (
        <motion.div
          key="step-review"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="space-y-6"
        >
          <DiagnosticResultReview
            student={student}
            test={test}
            level={activeLevel}
            evaluation={evaluationResult}
            onSave={onSaveResult}
            onBackToTasks={() => {
              setCurrentStep('running');
              setCurrentTaskIndex(tasks.length - 1);
            }}
            onCancel={onCancel}
          />
        </motion.div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">
                Check wirklich abbrechen?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Der aktuelle Fortschritt dieser Durchführung ({answeredCount} von {tasks.length} beantwortet) wird dabei nicht gespeichert.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                id="btn-abort-modal-resume"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                Fortsetzen
              </button>
              <button
                type="button"
                id="btn-abort-modal-confirm"
                onClick={() => {
                  setShowCancelModal(false);
                  onCancel();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 rounded-lg hover:bg-rose-700 cursor-pointer"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
