import React from 'react';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Calculator, 
  Lightbulb, 
  Tag, 
  Layers, 
  FileText,
  User,
  Zap,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../../types';
import { DiagnosticResult, DiagnosticCompetencyResult, CompetencyStatus } from '../../../types/diagnosticCore';
import { 
  getDiagnosticTestById, 
  getDiagnosticScreeningById,
  getDiagnosticCompetency, 
  getCompetencyStatusConfig, 
  getObservationTagInfo,
  formatGermanDate 
} from '../../../lib/diagnosticCoreUtils';

interface DiagnosticResultDetailModalProps {
  result: DiagnosticResult;
  student: Student;
  onClose: () => void;
}

export const DiagnosticResultDetailModal: React.FC<DiagnosticResultDetailModalProps> = ({
  result,
  student,
  onClose,
}) => {
  const testDef = getDiagnosticTestById(result.testId) || getDiagnosticScreeningById(result.testId);
  const isScreening = result.mode === 'screening' || result.source === 'screening';

  // Check if reading fluency metrics are present in notes or observations
  const isReadingTest = result.testId.includes('lesen') || result.testId.includes('fluessig');

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
                {isScreening ? (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full">
                    Klassenscreening (Überblick)
                  </span>
                ) : (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-0.5 rounded-full">
                    1:1 Diagnostik-Ergebnis
                  </span>
                )}
                <span className="text-xs text-slate-500 font-medium">
                  {student.vorname} {student.nachname}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {testDef?.title || result.testId}
              </h2>
              {testDef?.subtitle && (
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  {testDef.subtitle}
                </p>
              )}
            </div>

            <button
              id="btn-close-result-detail-modal"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200/70 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body (Scrollable) */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            {/* Meta bar: Date, Level, Mode, Score */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Datum</span>
                <span className="font-bold text-slate-800">{formatGermanDate(result.date, 'long')}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Niveaustufe</span>
                <span className="font-bold text-indigo-700">
                  {result.gradeLevel ? `Niveau ${result.gradeLevel}` : 'Standard'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Modus</span>
                <span className="font-bold text-slate-800">
                  {result.mode === 'oneToOne' ? '1:1 Einzeldurchführung' : result.mode}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Treffer / Punkte</span>
                <span className="font-bold text-slate-800">
                  {result.rawScore !== undefined && result.maxScore !== undefined
                    ? `${result.rawScore} / ${result.maxScore} (${result.normalizedScore ?? Math.round((result.rawScore / result.maxScore) * 100)}%)`
                    : '–'}
                </span>
              </div>
            </div>

            {/* Teilkompetenzen-Aufschlüsselung (Multi-Kompetenz z.B. Zahlenraum & Stellenwert) */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Bewertete Teilkompetenzen
              </span>

              <div className="space-y-2">
                {(result.competencyResults || []).map((cr, idx) => {
                  const comp = getDiagnosticCompetency(cr.competencyId);
                  const statusCfg = getCompetencyStatusConfig(cr.status);

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-slate-900 block">
                          {comp?.name || cr.competencyId}
                        </span>
                        {comp?.description && (
                          <span className="text-xs text-slate-500 block max-w-md">
                            {comp.description}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        {cr.score !== undefined && cr.maxScore !== undefined && (
                          <span className="text-xs text-slate-500 font-medium mr-1">
                            {cr.score}/{cr.maxScore}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                        >
                          <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Beobachtete Strategien & Merkmale */}
            {result.observations && result.observations.length > 0 && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Strukturierte Beobachtungen & Vorgehensweisen
                </span>

                <div className="grid grid-cols-1 gap-2">
                  {result.observations.map((obs, idx) => {
                    const tagInfo = getObservationTagInfo(obs.tag);

                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-start gap-3"
                      >
                        <div className="mt-0.5 shrink-0">
                          {obs.type === 'strength' && (
                            <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                          )}
                          {obs.type === 'strategy' && (
                            <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                              ★
                            </span>
                          )}
                          {obs.type === 'difficulty' && (
                            <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">
                              !
                            </span>
                          )}
                          {obs.type === 'observation' && (
                            <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                              •
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-800">
                              {tagInfo?.label || obs.tag || 'Beobachtung'}
                            </span>
                            {obs.tag && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                #{obs.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {obs.text || tagInfo?.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pädagogischer Nächster Schritt */}
            {result.nextStep && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <span>Empfohlener nächster Förderschritt</span>
                </div>
                <p className="text-sm text-slate-800 leading-relaxed font-medium pl-6">
                  „{result.nextStep}“
                </p>
              </div>
            )}

            {/* Notizen der Lehrkraft */}
            {result.notes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-wider">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notizen der Lehrkraft</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pl-5 whitespace-pre-wrap">
                  {result.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end">
            <button
              id="btn-close-result-detail-footer"
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
