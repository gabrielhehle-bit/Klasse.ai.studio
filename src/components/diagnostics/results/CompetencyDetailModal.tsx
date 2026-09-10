import React from 'react';
import { 
  X, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  Sparkles, 
  Layers, 
  Lightbulb, 
  BookOpen, 
  Calculator,
  ChevronRight,
  Info,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../../types';
import { DiagnosticCompetency, DiagnosticResult, CompetencyStatus } from '../../../types/diagnosticCore';
import { 
  getCompetencyStatusConfig, 
  getStudentCompetencyHistory, 
  getObservationTagInfo,
  formatGermanDate,
  getDiagnosticTestById,
  getDiagnosticScreeningById,
  StudentCompetencyHistoryEntry
} from '../../../lib/diagnosticCoreUtils';

interface CompetencyDetailModalProps {
  competency: DiagnosticCompetency;
  student: Student;
  results: DiagnosticResult[];
  onClose: () => void;
  onSelectResultDetail?: (result: DiagnosticResult) => void;
}

export const CompetencyDetailModal: React.FC<CompetencyDetailModalProps> = ({
  competency,
  student,
  results,
  onClose,
  onSelectResultDetail,
}) => {
  const history = React.useMemo(() => {
    return getStudentCompetencyHistory(results, student.id, competency.id);
  }, [results, student.id, competency.id]);

  const latestEntry: StudentCompetencyHistoryEntry | undefined = history[history.length - 1];
  const latestStatusConfig = latestEntry ? getCompetencyStatusConfig(latestEntry.status) : null;
  const latestTest = latestEntry ? (getDiagnosticTestById(latestEntry.testId) || getDiagnosticScreeningById(latestEntry.testId)) : null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-slate-50/80 border-b border-slate-200/80 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
                  Kompetenzprofil
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  {student.vorname} {student.nachname}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {competency.name}
              </h2>
              {competency.description && (
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  {competency.description}
                </p>
              )}
            </div>

            <button
              id="btn-close-competency-modal"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* 1. Aktueller Status & getestetes Niveau */}
            {latestEntry && latestStatusConfig ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Aktueller Stand
                  </span>
                  <div className="flex items-center gap-2">
                    {latestEntry.gradeLevel && (
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                        Niveau {latestEntry.gradeLevel}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${latestStatusConfig.badgeBg} ${latestStatusConfig.badgeText} border ${latestStatusConfig.border}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${latestStatusConfig.dotColor}`} />
                      {latestStatusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Letzte Erhebung: <strong>{formatGermanDate(latestEntry.date, 'long')}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Test: <strong>{latestTest?.title || latestEntry.testId}</strong></span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-700">
                  Noch nicht überprüft
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Für {student.vorname} liegt im neuen Diagnostiksystem noch keine Erhebung zu dieser Kompetenz vor.
                </p>
              </div>
            )}

            {/* 2. Nächster pädagogischer Schritt */}
            {latestEntry?.nextStep && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Nächster pädagogischer Schritt</span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium pl-6">
                  „{latestEntry.nextStep}“
                </p>
              </div>
            )}

            {/* 3. Chronologischer Lernverlauf (Timeline) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Lernverlauf ({history.length} {history.length === 1 ? 'Erhebung' : 'Erhebungen'})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">
                  Chronologisch geordnet
                </span>
              </div>

              {history.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Keine bisherigen Verlaufsdaten vorhanden.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {history.map((entry, idx) => {
                    const statusCfg = getCompetencyStatusConfig(entry.status);
                    const testDef = getDiagnosticTestById(entry.testId) || getDiagnosticScreeningById(entry.testId);
                    const fullResult = results.find(r => r.id === entry.resultId);

                    return (
                      <div
                        key={entry.resultId + idx}
                        className="relative group p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition-all"
                      >
                        {/* Dot on timeline */}
                        <div
                          className={`absolute -left-6 top-4 w-3.5 h-3.5 rounded-full border-2 border-white ${statusCfg.dotColor} shadow-xs`}
                        />

                        {/* Top row: Date & Level & Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {formatGermanDate(entry.date, 'long')}
                            </span>
                            {entry.gradeLevel && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold">
                                Niveau {entry.gradeLevel}
                              </span>
                            )}
                            {/* Niveau-Anstieg Indicator */}
                            {entry.levelChange === 'increased' && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                <span>Niveau erhöht ({entry.prevLevel} → {entry.gradeLevel})</span>
                              </span>
                            )}
                          </div>

                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Test name & score */}
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                          <span>Test: <strong>{testDef?.title || entry.testId}</strong></span>
                          {entry.score !== undefined && entry.maxScore !== undefined && (
                            <span className="text-slate-500 font-medium">
                              Ergebnis: {entry.score}/{entry.maxScore} Punkte
                            </span>
                          )}
                        </div>

                        {/* Observations in this session */}
                        {entry.observations && entry.observations.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Beobachtete Strategien & Merkmale:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.observations.map((obs, obsIdx) => {
                                const tagInfo = getObservationTagInfo(obs.tag);
                                return (
                                  <span
                                    key={obsIdx}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                                      tagInfo
                                        ? `${tagInfo.badgeBg} ${tagInfo.badgeText}`
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                    title={obs.text}
                                  >
                                    {tagInfo?.label || obs.text}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Note if present */}
                        {entry.note && (
                          <p className="mt-2 text-xs text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            {entry.note}
                          </p>
                        )}

                        {/* Clickable full result trigger */}
                        {fullResult && onSelectResultDetail && (
                          <div className="mt-2.5 pt-1.5 flex justify-end">
                            <button
                              onClick={() => {
                                onSelectResultDetail(fullResult);
                              }}
                              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <span>Komplettes Testergebnis ansehen</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end">
            <button
              id="btn-close-competency-modal-footer"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            >
              Schließen
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
