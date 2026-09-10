import React, { useState, useMemo } from 'react';
import { 
  Check, 
  X, 
  Minus, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Sparkles, 
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Tag,
  EyeOff,
  Clock,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../../types';
import { 
  DiagnosticTestDefinition, 
  DiagnosticTaskDefinition,
  DiagnosticObservationTag
} from '../../../types/diagnosticCore';
import { StudentScreeningTaskResponse } from '../../../lib/diagnosticCoreUtils';
import { OBSERVATION_TYPE_CONFIG } from '../../../data/diagnosticCompetencies';

interface DiagnosticScreeningRunnerProps {
  testDefinition: DiagnosticTestDefinition;
  level: number;
  students: Student[];
  activeClassName?: string;
  onFinishScreening: (resultsByStudent: Record<string, Record<string, StudentScreeningTaskResponse>>) => void;
  onCancelScreening: () => void;
}

export const DiagnosticScreeningRunner: React.FC<DiagnosticScreeningRunnerProps> = ({
  testDefinition,
  level,
  students,
  activeClassName,
  onFinishScreening,
  onCancelScreening,
}) => {
  // Find current level definition
  const currentLevelDef = useMemo(() => {
    return testDefinition.levels.find(l => l.level === level) || testDefinition.levels[0];
  }, [testDefinition, level]);

  const tasks: DiagnosticTaskDefinition[] = currentLevelDef.tasks || [];
  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(0);
  const currentTask: DiagnosticTaskDefinition | undefined = tasks[currentTaskIndex];

  // Store student responses: studentId -> taskId -> response
  const [responses, setResponses] = useState<Record<string, Record<string, StudentScreeningTaskResponse>>>(() => {
    const initial: Record<string, Record<string, StudentScreeningTaskResponse>> = {};
    students.forEach(s => {
      initial[s.id] = {};
      tasks.forEach(t => {
        initial[s.id][t.id] = {
          status: 'not_observed',
          tags: [],
        };
      });
    });
    return initial;
  });

  // Filter state for student list in runner
  const [filterMode, setFilterMode] = useState<'all' | 'unanswered' | 'answered'>('all');
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);

  // Set student response for active task
  const setStudentStatus = (
    studentId: string, 
    status: 'correct' | 'partially_correct' | 'incorrect' | 'not_observed'
  ) => {
    if (!currentTask) return;
    setResponses(prev => {
      const studentMap = { ...(prev[studentId] || {}) };
      const currentResp = studentMap[currentTask.id] || { status: 'not_observed', tags: [] };
      studentMap[currentTask.id] = {
        ...currentResp,
        status,
      };
      return {
        ...prev,
        [studentId]: studentMap,
      };
    });
  };

  // Toggle tag for student on active task
  const toggleStudentTag = (studentId: string, tag: string) => {
    if (!currentTask) return;
    setResponses(prev => {
      const studentMap = { ...(prev[studentId] || {}) };
      const currentResp = studentMap[currentTask.id] || { status: 'not_observed', tags: [] };
      const currentTags = currentResp.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];

      studentMap[currentTask.id] = {
        ...currentResp,
        tags: newTags,
      };
      return {
        ...prev,
        [studentId]: studentMap,
      };
    });
  };

  // Quick mark all as correct on current task
  const markAllCorrect = () => {
    if (!currentTask) return;
    setResponses(prev => {
      const next = { ...prev };
      students.forEach(s => {
        const studentMap = { ...(next[s.id] || {}) };
        studentMap[currentTask.id] = {
          status: 'correct',
          tags: studentMap[currentTask.id]?.tags || [],
        };
        next[s.id] = studentMap;
      });
      return next;
    });
  };

  // Counts for current task
  const currentTaskStats = useMemo(() => {
    if (!currentTask) return { answered: 0, total: students.length };
    let answered = 0;
    students.forEach(s => {
      const resp = responses[s.id]?.[currentTask.id];
      if (resp && resp.status !== 'not_observed') {
        answered++;
      }
    });
    return { answered, total: students.length };
  }, [responses, currentTask, students]);

  // Filtered student list
  const visibleStudents = useMemo(() => {
    if (!currentTask) return students;
    if (filterMode === 'all') return students;
    return students.filter(s => {
      const resp = responses[s.id]?.[currentTask.id];
      const isAnswered = resp && resp.status !== 'not_observed';
      return filterMode === 'answered' ? isAnswered : !isAnswered;
    });
  }, [students, responses, currentTask, filterMode]);

  // Navigation handlers
  const handlePrevTask = () => {
    if (currentTaskIndex > 0) {
      setCurrentTaskIndex(prev => prev - 1);
    }
  };

  const handleNextTask = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else {
      // Last task reached -> finish and go to preview
      onFinishScreening(responses);
    }
  };

  // Common tags for the current task
  const availableTags = useMemo(() => {
    if (!currentTask) return [];
    if (currentTask.defaultObservationTags && currentTask.defaultObservationTags.length > 0) {
      return currentTask.defaultObservationTags;
    }
    return ['instant', 'strategy_used', 'counted', 'hesitant', 'needs_hint'] as DiagnosticObservationTag[];
  }, [currentTask]);

  return (
    <div className="max-w-6xl mx-auto py-2 px-2 sm:px-4 space-y-4">
      {/* Top Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Screening abbrechen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Klassenscreening läuft
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Niveau {level}
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {testDefinition.title} • Klasse {activeClassName || '2a'}
            </h3>
          </div>
        </div>

        {/* Task Progress Pills */}
        <div className="flex items-center gap-1.5">
          {tasks.map((t, idx) => {
            const isCurrent = idx === currentTaskIndex;
            const isCompleted = idx < currentTaskIndex;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCurrentTaskIndex(idx)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={currentTaskIndex === 0}
            onClick={handlePrevTask}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Zurück</span>
          </button>

          <button
            type="button"
            onClick={handleNextTask}
            className="flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <span>{currentTaskIndex === tasks.length - 1 ? 'Zur Auswertung' : 'Nächste Aufgabe'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Task Presentation Card (Große Aufgabe für die Tafel/Lehrkraft) */}
      {currentTask && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                {currentTaskIndex + 1}
              </span>
              <h4 className="text-base font-bold text-slate-900">
                {currentTask.prompt || `Aufgabe ${currentTaskIndex + 1}`}
              </h4>
            </div>

            {currentTask.instruction && (
              <span className="text-xs text-slate-500 italic bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                💡 {currentTask.instruction}
              </span>
            )}
          </div>

          {/* Visual Task Rendering */}
          <div className="py-2 flex flex-col items-center justify-center min-h-[100px] bg-slate-50/70 rounded-xl border border-slate-100 p-4">
            {/* Dots */}
            {currentTask.visual?.type === 'dots' && currentTask.visual.count && (
              <div className="flex flex-wrap items-center justify-center gap-3 p-3">
                {Array.from({ length: currentTask.visual.count }).map((_, i) => (
                  <span
                    key={i}
                    className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-emerald-700 shadow-xs"
                  />
                ))}
              </div>
            )}

            {/* Ten Frame */}
            {currentTask.visual?.type === 'ten_frame' && currentTask.visual.filled && (
              <div className="grid grid-cols-5 gap-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {Array.from({ length: 10 }).map((_, i) => {
                  const isFilled = currentTask.visual?.filled?.includes(i + 1);
                  return (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center bg-slate-50"
                    >
                      {isFilled && <div className="w-7 h-7 rounded-full bg-emerald-600 shadow-xs" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Twenty Frame */}
            {currentTask.visual?.type === 'twenty_frame' && currentTask.visual.filled && (
              <div className="grid grid-cols-10 gap-1.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs">
                {Array.from({ length: 20 }).map((_, i) => {
                  const isFilled = currentTask.visual?.filled?.includes(i + 1);
                  return (
                    <div
                      key={i}
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                        i < 10 ? 'border-slate-200 bg-slate-50' : 'border-emerald-100 bg-emerald-50/30'
                      }`}
                    >
                      {isFilled && (
                        <div
                          className={`w-6 h-6 rounded-full shadow-2xs ${
                            i < 10 ? 'bg-emerald-600' : 'bg-teal-600'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comparison */}
            {currentTask.visual?.type === 'comparison' && (
              <div className="flex items-center justify-center gap-8">
                <div className="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    {currentTask.visual.labelA || 'Links'}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: currentTask.visual.dotsA || 0 }).map((_, i) => (
                      <span key={i} className="w-6 h-6 rounded-full bg-blue-600" />
                    ))}
                  </div>
                </div>
                <span className="text-base font-bold text-slate-400">vs.</span>
                <div className="text-center p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500 block mb-2">
                    {currentTask.visual.labelB || 'Rechts'}
                  </span>
                  <div className="flex gap-2">
                    {Array.from({ length: currentTask.visual.dotsB || 0 }).map((_, i) => (
                      <span key={i} className="w-6 h-6 rounded-full bg-emerald-600" />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Calculation */}
            {currentTask.visual?.type === 'calculation' && currentTask.visual.calculation && (
              <div className="text-center py-2">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-wide font-mono bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-xs inline-block">
                  {currentTask.visual.calculation.expression}
                </div>
                {currentTask.visual.calculation.hintSteps && (
                  <div className="mt-2 text-xs text-slate-500 flex items-center justify-center gap-3">
                    <span className="font-semibold text-slate-600">Lösungsbeispiel:</span>
                    {currentTask.visual.calculation.hintSteps.join(' → ')}
                  </div>
                )}
              </div>
            )}

            {/* Comprehension Story */}
            {currentTask.visual?.type === 'comprehension_story' && currentTask.visual.comprehensionStory && (
              <div className="max-w-2xl bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-left">
                <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {currentTask.visual.comprehensionStory.title}
                </h5>
                <p className="text-sm text-slate-700 leading-relaxed font-serif">
                  {currentTask.visual.comprehensionStory.text}
                </p>
              </div>
            )}

            {/* Options display if choice */}
            {currentTask.options && currentTask.options.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <span className="text-xs text-slate-400 font-semibold mr-1">Antwortoptionen:</span>
                {currentTask.options.map((opt, i) => (
                  <span
                    key={i}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                      opt.isCorrect
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    {opt.label} {opt.isCorrect && '✓'}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Erfassung List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Erfassung für Aufgabe {currentTaskIndex + 1}
            </h4>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {currentTaskStats.answered} von {currentTaskStats.total} erfasst
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-2 py-1 rounded ${filterMode === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Alle ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('unanswered')}
                className={`px-2 py-1 rounded ${filterMode === 'unanswered' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Offen ({currentTaskStats.total - currentTaskStats.answered})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('answered')}
                className={`px-2 py-1 rounded ${filterMode === 'answered' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'}`}
              >
                Erfasst ({currentTaskStats.answered})
              </button>
            </div>

            {/* Quick helper */}
            <button
              type="button"
              id="btn-screening-mark-all-correct"
              onClick={markAllCorrect}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              title="Setzt alle Kinder für diese Aufgabe auf Richtig"
            >
              Alle [Richtig]
            </button>
          </div>
        </div>

        {/* Compact Student Rows */}
        <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto pr-1">
          {visibleStudents.map((student) => {
            const studentResp = currentTask ? responses[student.id]?.[currentTask.id] : undefined;
            const status = studentResp?.status || 'not_observed';
            const studentTags = studentResp?.tags || [];

            return (
              <div
                key={student.id}
                id={`row-screening-student-${student.id}`}
                className="py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition-colors"
              >
                {/* Student Name */}
                <div className="min-w-[140px] text-xs">
                  <span className="font-bold text-slate-900">{student.nachname}</span>, {student.vorname}
                </div>

                {/* Status Buttons: Richtig, Teilweise, Falsch, Nicht beobachtet */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'correct')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      status === 'correct'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Richtig</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'partially_correct')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      status === 'partially_correct'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                    }`}
                  >
                    <span>~</span>
                    <span>Teilweise</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'incorrect')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      status === 'incorrect'
                        ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Nicht korrekt</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentStatus(student.id, 'not_observed')}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                      status === 'not_observed'
                        ? 'bg-slate-200 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-400 border-slate-200 hover:text-slate-600'
                    }`}
                    title="Nicht beobachtet (z. B. abwesend oder nicht geprüft)"
                  >
                    <Minus className="w-3 h-3" />
                    <span className="hidden sm:inline">Nicht beobachtet</span>
                  </button>
                </div>

                {/* Quick Strategy Tag Chips */}
                <div className="flex flex-wrap items-center gap-1 md:justify-end">
                  {availableTags.map((tag) => {
                    const isTagged = studentTags.includes(tag);
                    const tagConfig = OBSERVATION_TYPE_CONFIG[tag];
                    const label = tagConfig?.label || tag;

                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleStudentTag(student.id, tag)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          isTagged
                            ? 'bg-slate-800 text-white border-slate-900 shadow-2xs'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
        >
          Screening abbrechen
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={currentTaskIndex === 0}
            onClick={handlePrevTask}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Vorherige Aufgabe
          </button>

          <button
            type="button"
            onClick={handleNextTask}
            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>{currentTaskIndex === tasks.length - 1 ? 'Zur Ergebnisvorschau' : 'Nächste Aufgabe'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-lg space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Screening abbrechen?
                </h4>
                <p className="text-xs text-slate-500">
                  Bisherige Eingaben dieses Screenings gehen verloren.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              Keine Sorge: Bereits gespeicherte frühere Diagnostikergebnisse bleiben vollständig erhalten.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Weiter erfassen
              </button>
              <button
                type="button"
                onClick={onCancelScreening}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-xs"
              >
                Abbrechen & Verwerfen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
