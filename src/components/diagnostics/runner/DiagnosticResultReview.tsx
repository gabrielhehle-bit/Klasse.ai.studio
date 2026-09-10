import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  Save, 
  User, 
  Layers, 
  TrendingUp, 
  Lightbulb, 
  AlertCircle, 
  Zap, 
  ListOrdered,
  Sparkles,
  ArrowRight,
  BookmarkCheck
} from 'lucide-react';
import { Student } from '../../../types';
import { 
  DiagnosticLevelDefinition, 
  DiagnosticResult, 
  DiagnosticTestDefinition 
} from '../../../types/diagnosticCore';
import { EvaluationResult } from '../../../lib/diagnosticEvaluation';
import { getCompetencyStatusConfig } from '../../../lib/diagnosticCoreUtils';
import { getCompetencyById } from '../../../data/diagnosticCompetencies';

import { TAG_CONFIG } from './DiagnosticObservationPanel';

interface DiagnosticResultReviewProps {
  student: Student;
  test: DiagnosticTestDefinition;
  level: DiagnosticLevelDefinition;
  evaluation: EvaluationResult;
  onSave: (result: DiagnosticResult) => void;
  onBackToTasks: () => void;
  onCancel: () => void;
}

export const DiagnosticResultReview: React.FC<DiagnosticResultReviewProps> = ({
  student,
  test,
  level,
  evaluation,
  onSave,
  onBackToTasks,
  onCancel,
}) => {
  const [editableNextStep, setEditableNextStep] = useState(evaluation.suggestedNextStep);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const statusCfg = getCompetencyStatusConfig(evaluation.status);

  const handleSaveResult = () => {
    setIsSaving(true);

    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];

    const finalCompetencyResults = evaluation.competencyResults && evaluation.competencyResults.length > 0
      ? evaluation.competencyResults
      : [
          {
            competencyId: test.competencyIds[0] || 'ma-zahlen-mengen',
            status: evaluation.status,
            score: evaluation.rawScore,
            maxScore: evaluation.maxScore,
            note: evaluation.summaryText,
          },
        ];

    const newResult: DiagnosticResult = {
      id: `diag-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      schemaVersion: 1,
      studentId: student.id,
      classId: (student as any).schulklasseId || (student as any).klasse || 'default',
      testId: test.id,
      date: isoDate,
      mode: (test.mode as any) || 'oneToOne',
      createdAt: now.toISOString(),
      gradeLevel: level.level,
      rawScore: evaluation.rawScore,
      maxScore: evaluation.maxScore,
      normalizedScore: evaluation.normalizedScore,
      competencyResults: finalCompetencyResults,
      observations: evaluation.structuredObservations,
      nextStep: editableNextStep.trim() || undefined,
      notes: generalNotes.trim() || undefined,
    };

    onSave(newResult);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                {test.mode === 'observation' ? 'Pädagogische Beobachtung (1:1)' : 'Ergebnis-Vorschau (1:1 Check)'}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold">
                {level.label}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              {test.title}
            </h2>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-bold shrink-0 self-start sm:self-auto border border-indigo-100">
            <User className="w-4 h-4 text-indigo-600" />
            <span>{student.vorname} {student.nachname}</span>
          </div>
        </div>

        {/* Primary Evaluation Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Status Badge Block */}
          <div className={`p-4 rounded-xl border ${statusCfg.badgeBg} ${statusCfg.border} flex flex-col justify-between`}>
            <span className="text-xs font-semibold text-slate-600">
              {test.mode === 'observation' ? 'Einschätzung' : 'Erreichter Gesamtstatus'}
            </span>
            <div className="mt-2 flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${statusCfg.dotColor}`} />
              <span className={`text-base font-bold ${statusCfg.badgeText}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {statusCfg.description}
            </p>
          </div>

          {/* Quantitative Score */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600">
              {test.mode === 'observation' ? 'Erfüllte Kriterien' : 'Punkte & Trefferquote'}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {evaluation.rawScore} / {evaluation.maxScore}
              </span>
              <span className="text-xs font-bold text-indigo-600">
                ({evaluation.normalizedScore}%)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {test.mode === 'observation' ? `Kriterien auf Niveau ${level.level} positiv beobachtet` : `Richtige Antworten im Niveau ${level.level}`}
            </p>
          </div>

          {/* Level Info */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Geprüfte Schulstufe
            </span>
            <div className="mt-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-700" />
              <span className="text-base font-bold text-slate-900">
                Niveau {level.level}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {level.shortLabel}
            </p>
          </div>
        </div>

        {/* Multi-Competency Breakdown if multiple sub-competencies present */}
        {evaluation.competencyResults && evaluation.competencyResults.length > 1 && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Teilkompetenzen im Detail
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evaluation.competencyResults.map(compRes => {
                const compDef = getCompetencyById(compRes.competencyId);
                const subCfg = getCompetencyStatusConfig(compRes.status);
                return (
                  <div 
                    key={compRes.competencyId}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {compDef?.name || compRes.competencyId}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {compRes.score !== undefined && compRes.maxScore !== undefined
                          ? `${compRes.score}/${compRes.maxScore} gelöst`
                          : ''}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${subCfg.badgeBg}`}>
                      <span className={`w-2 h-2 rounded-full ${subCfg.dotColor}`} />
                      {subCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Evaluation Summary Text */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-medium">
          {evaluation.summaryText}
        </div>
      </div>

      {/* Observation Counts Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Beobachtete Lösungswege & Strategien
        </h3>

        {/* Dynamic Tag Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {Object.entries(evaluation.observationCounts)
            .filter(([_, count]) => count > 0)
            .map(([tagKey, count]) => {
              const cfg = (TAG_CONFIG as any)[tagKey] || {
                label: tagKey,
                icon: Sparkles,
                activeBg: 'bg-indigo-600',
              };
              const Icon = cfg.icon;

              return (
                <div key={tagKey} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-semibold text-slate-800 truncate" title={cfg.label}>
                      {cfg.label}
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-700 shrink-0 px-2 py-0.5 bg-indigo-50/80 rounded-md">
                    {count}x
                  </span>
                </div>
              );
            })}
        </div>

        {/* Structured Observations List */}
        {evaluation.structuredObservations.length > 0 && (
          <div className="space-y-2 pt-2">
            {evaluation.structuredObservations.map((obs, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>{obs.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Level Advice if available */}
      {evaluation.levelAdvice && (
        <div className="bg-indigo-50/70 rounded-2xl border border-indigo-100 p-5 flex items-start gap-3.5">
          <Sparkles className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              Pädagogischer Hinweis zum Niveau
            </h4>
            <p className="text-xs text-indigo-800 leading-relaxed font-medium">
              {evaluation.levelAdvice.message}
            </p>
          </div>
        </div>
      )}

      {/* Suggested Next Step (Editable) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
          Pädagogisch neutraler nächster Schritt (anpassbar)
        </label>
        <textarea
          id="textarea-next-step"
          rows={3}
          value={editableNextStep}
          onChange={(e) => setEditableNextStep(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all leading-relaxed"
          placeholder="Nächsten Schritt für die Förderung oder weitere Beobachtung eingeben..."
        />
        <p className="text-[11px] text-slate-400">
          Dieser Vorschlag wurde automatisch anhand der Testergebnisse formuliert und kann beliebig modifiziert werden.
        </p>

        {/* Optional notes */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Zusätzliche Bemerkungen (optional)
          </label>
          <input
            type="text"
            id="input-general-notes"
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="z. B. 'Sehr motiviert mitgemacht', 'Morgenkreis-Transfer beobachten'..."
            className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <button
          type="button"
          id="btn-back-to-tasks"
          onClick={onBackToTasks}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          Aufgaben überprüfen
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            id="btn-cancel-review"
            onClick={onCancel}
            className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
          >
            Verwerfen
          </button>

          <button
            type="button"
            id="btn-save-diagnostic-result"
            onClick={handleSaveResult}
            disabled={isSaving}
            className="w-1/2 sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Ergebnis speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
