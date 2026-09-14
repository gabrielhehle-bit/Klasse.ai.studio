import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Layers, 
  Sparkles, 
  ArrowRight, 
  UserCheck, 
  Search, 
  Calendar, 
  ChevronRight,
  Eye,
  EyeOff,
  PlusCircle,
  Play,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { Student } from '../../../types';
import { DiagnosticResult } from '../../../types/diagnosticCore';
import { 
  getClassOverallKPIs,
  getClassCompetenciesOverview,
  getClassStudentsNeedingObservation,
  getClassUntestedSummary,
  ClassCompetencySummary
} from '../../../lib/diagnosticCoreUtils';
import { ClassOverviewKPIs } from './ClassOverviewKPIs';
import { ClassCompetencyList } from './ClassCompetencyList';
import { ClassObservationAlerts } from './ClassObservationAlerts';
import { ClassUntestedOverview } from './ClassUntestedOverview';
import { ClassCompetencyDetailModal } from './ClassCompetencyDetailModal';

interface ClassPerspectiveViewProps {
  students: Student[];
  results: DiagnosticResult[];
  activeClassName?: string;
  onSelectStudent: (student: Student) => void;
  onStartIndividualTest?: (studentId?: string, competencyId?: string) => void;
  onStartClassScreening?: () => void;
}

export const ClassPerspectiveView: React.FC<ClassPerspectiveViewProps> = ({
  students = [],
  results = [],
  activeClassName,
  onSelectStudent,
  onStartIndividualTest = () => {},
  onStartClassScreening,
}) => {
  // Selected competency for the modal
  const [selectedCompetencyIdForModal, setSelectedCompetencyIdForModal] = useState<string | null>(null);

  // Overall KPIs
  const overallKPIs = useMemo(() => {
    return getClassOverallKPIs(students, results);
  }, [students, results]);

  // All Competency summaries
  const competencySummaries = useMemo(() => {
    return getClassCompetenciesOverview(students, results);
  }, [students, results]);

  // Students needing observation
  const observationNeedItems = useMemo(() => {
    return getClassStudentsNeedingObservation(students, results);
  }, [students, results]);

  // Untested summary
  const untestedSummary = useMemo(() => {
    return getClassUntestedSummary(students, results);
  }, [students, results]);

  // Selected summary for modal
  const selectedSummary = useMemo(() => {
    if (!selectedCompetencyIdForModal) return null;
    return competencySummaries.find(s => s.competency.id === selectedCompetencyIdForModal) || null;
  }, [competencySummaries, selectedCompetencyIdForModal]);

  // Empty State if no diagnostic results exist yet
  if (results.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-8 sm:p-12 text-center space-y-5 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
          <Users className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900">
            Noch keine Diagnostikergebnisse{activeClassName ? ` für Klasse ${activeClassName}` : ''}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Die Klassenperspektive fasst die 1:1-Checks aller Kinder übersichtlich zusammen. Führe erste standardisierte Checks durch, um Kompetenzverteilungen und Förderbedarfe zu sehen.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            id="btn-empty-start-individual"
            onClick={() => onStartIndividualTest()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Ersten 1:1-Check starten</span>
          </button>

          {onStartClassScreening && (
            <button
              id="btn-empty-start-class"
              onClick={onStartClassScreening}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
              <span>Klassenscreening</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Top Erfassungsstand & KPIs */}
      <ClassOverviewKPIs
        kpis={overallKPIs}
        activeClassName={activeClassName}
      />

      {/* 2. Kompetenzübersicht der Klasse */}
      <ClassCompetencyList
        summaries={competencySummaries}
        onOpenCompetencyDetail={compId => setSelectedCompetencyIdForModal(compId)}
      />

      {/* 3. Gezielt weiter beobachten (Alerts & Focal points) */}
      <ClassObservationAlerts
        items={observationNeedItems}
        onSelectStudent={onSelectStudent}
        onStartIndividualTest={onStartIndividualTest}
      />

      {/* 4. Noch nicht überprüft (Systematic Erfassungsplanung) */}
      <ClassUntestedOverview
        studentsWithoutAnyResults={untestedSummary.studentsWithoutAnyResults}
        competencyUntestedList={untestedSummary.competencyUntestedList}
        onOpenCompetencyDetail={compId => setSelectedCompetencyIdForModal(compId)}
        onStartIndividualTest={onStartIndividualTest}
        onSelectStudent={onSelectStudent}
      />

      {/* 5. Competency Detail Modal for the entire class */}
      {selectedSummary && (
        <ClassCompetencyDetailModal
          summary={selectedSummary}
          onClose={() => setSelectedCompetencyIdForModal(null)}
          onSelectStudent={onSelectStudent}
          onStartIndividualTest={onStartIndividualTest}
        />
      )}
    </div>
  );
};
export default ClassPerspectiveView;
