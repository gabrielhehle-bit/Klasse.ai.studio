import React from 'react';
import { 
  Eye, 
  User, 
  ArrowRight, 
  Play, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Student } from '../../../types';
import { 
  ClassObservationNeedItem, 
  COMPETENCY_STATUS_CONFIG,
  formatGermanDate 
} from '../../../lib/diagnosticCoreUtils';

interface ClassObservationAlertsProps {
  items: ClassObservationNeedItem[];
  onSelectStudent: (student: Student) => void;
  onStartIndividualTest: (studentId: string, competencyId?: string) => void;
}

export const ClassObservationAlerts: React.FC<ClassObservationAlertsProps> = ({
  items,
  onSelectStudent,
  onStartIndividualTest,
}) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              Gezielt weiter beobachten
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Kinder mit partiellem oder zusätzlichem Beobachtungsbedarf im aktuellsten Teststand
          </p>
        </div>

        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full self-start sm:self-center">
          {items.length} {items.length === 1 ? 'Kind' : 'Kinder'} mit Beobachtungsschwerpunkt
        </span>
      </div>

      {/* Content Grid */}
      {items.length === 0 ? (
        <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/60 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-800">
            Keine offenen Beobachtungsschwerpunkte
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            In allen bisher durchgeführten Diagnostiken haben die erfassten Kinder gesicherte oder überwiegend gesicherte Kompetenzstände erreicht.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {items.map(item => {
            const student = item.student;

            return (
              <div
                key={student.id}
                id={`observation-student-${student.id}`}
                className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:shadow-xs transition-all space-y-3 flex flex-col justify-between"
              >
                {/* Student Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs flex items-center justify-center">
                      {student.vorname?.[0]}{student.nachname?.[0]}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {student.vorname} {student.nachname}
                      </h4>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {item.flaggedCompetencies.length} {item.flaggedCompetencies.length === 1 ? 'Bereich' : 'Bereiche'} zum Nachsehen
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-view-profile-${student.id}`}
                    onClick={() => onSelectStudent(student)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>Kind ansehen</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>

                {/* Flagged Competency Badges / Pills */}
                <div className="space-y-1.5 pt-1">
                  {item.flaggedCompetencies.map((fc, fcIdx) => {
                    const statusCfg = COMPETENCY_STATUS_CONFIG[fc.status] || COMPETENCY_STATUS_CONFIG.needsObservation;

                    return (
                      <div
                        key={fcIdx}
                        className="p-2 bg-white rounded-xl border border-slate-200/70 flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {fc.competency.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              Niveau {fc.gradeLevel || 1}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              {formatGermanDate(fc.date)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </span>

                          <button
                            id={`btn-retest-${student.id}-${fc.competency.id}`}
                            onClick={() => onStartIndividualTest(student.id, fc.competency.id)}
                            title="1:1-Check für diese Kompetenz starten"
                            className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ClassObservationAlerts;
