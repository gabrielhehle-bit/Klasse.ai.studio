import React, { useState, useMemo } from 'react';
import { 
  User, 
  Users, 
  Sparkles, 
  ChevronRight, 
  ArrowLeft 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student } from '../../types';
import { DiagnosticResult, DiagnosticCompetency } from '../../types/diagnosticCore';
import { DiagnosticNavigationHeader } from './DiagnosticNavigationHeader';
import { StudentSelector } from './results/StudentSelector';
import { IndividualProfileView } from './results/IndividualProfileView';
import { ClassPerspectiveView } from './results/ClassPerspectiveView';
import { CompetencyDetailModal } from './results/CompetencyDetailModal';
import { DiagnosticResultDetailModal } from './results/DiagnosticResultDetailModal';

interface DiagnosticResultsProps {
  results: DiagnosticResult[];
  students: Student[];
  onBackToHome: () => void;
  onStartIndividual: (studentId?: string) => void;
  onStartClass: () => void;
  activeClassName?: string;
}

export type ResultsPerspective = 'kind' | 'klasse';

export const DiagnosticResults: React.FC<DiagnosticResultsProps> = ({
  results = [],
  students = [],
  onBackToHome,
  onStartIndividual,
  onStartClass,
  activeClassName = '2a',
}) => {
  // Perspective toggle: 'kind' (default) vs 'klasse'
  const [perspective, setPerspective] = useState<ResultsPerspective>('kind');

  // Selected student for individual view
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(() => {
    if (students.length === 0) return null;
    // Prefer student who already has results
    const studentWithResult = students.find(s => results.some(r => r.studentId === s.id));
    return studentWithResult ? studentWithResult.id : students[0].id;
  });

  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Active Modals
  const [activeCompetencyModal, setActiveCompetencyModal] = useState<DiagnosticCompetency | null>(null);
  const [activeResultDetailModal, setActiveResultDetailModal] = useState<DiagnosticResult | null>(null);

  // Selected student object
  const selectedStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  const handleSelectStudentFromClass = (student: Student) => {
    setSelectedStudentId(student.id);
    setPerspective('kind');
  };

  return (
    <div className="max-w-5xl mx-auto py-3 px-2 sm:px-4 space-y-5">
      {/* 1. Navigation Header */}
      <DiagnosticNavigationHeader
        title="Ergebnisse & Entwicklung"
        subtitle="Kompetenzstände, individuelle Lernverläufe und pädagogische Förderansätze"
        breadcrumbs={[
          { label: 'Diagnostik', onClick: onBackToHome },
          { label: 'Ergebnisse & Entwicklung' },
        ]}
        onBack={onBackToHome}
        backLabel="Zur Übersicht"
      />

      {/* 2. Perspective Toggle: Kind (Standard) vs. Klasse */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs">
          <button
            id="tab-perspective-kind"
            onClick={() => setPerspective('kind')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              perspective === 'kind'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Kind-Perspektive</span>
          </button>

          <button
            id="tab-perspective-klasse"
            onClick={() => setPerspective('klasse')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              perspective === 'klasse'
                ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Klassen-Perspektive</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{results.length} neue Diagnostikergebnisse</span>
        </div>
      </div>

      {/* 3. Main Perspective Content */}
      <AnimatePresence mode="wait">
        {perspective === 'kind' ? (
          <motion.div
            key="perspective-kind"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="space-y-5"
          >
            {/* Student Selector Bar */}
            {students.length > 0 ? (
              <>
                <StudentSelector
                  students={students}
                  selectedStudentId={selectedStudentId}
                  onSelectStudent={s => setSelectedStudentId(s.id)}
                  results={results}
                  searchQuery={studentSearchQuery}
                  onSearchChange={setStudentSearchQuery}
                />

                {/* Individual Student Profile View */}
                {selectedStudent && (
                  <IndividualProfileView
                    student={selectedStudent}
                    results={results}
                    activeClassName={activeClassName}
                    onOpenCompetencyDetail={comp => setActiveCompetencyModal(comp)}
                    onOpenResultDetail={res => setActiveResultDetailModal(res)}
                    onStartIndividualTest={studentId => onStartIndividual(studentId || selectedStudent.id)}
                  />
                )}
              </>
            ) : (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-slate-500 text-xs">
                Keine Schüler in der aktuellen Klasse angelegt.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="perspective-klasse"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            <ClassPerspectiveView
              students={students}
              results={results}
              activeClassName={activeClassName}
              onSelectStudent={handleSelectStudentFromClass}
              onStartIndividualTest={(studentId) => onStartIndividual(studentId)}
              onStartClassScreening={onStartClass}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Modals */}
      {activeCompetencyModal && selectedStudent && (
        <CompetencyDetailModal
          competency={activeCompetencyModal}
          student={selectedStudent}
          results={results}
          onClose={() => setActiveCompetencyModal(null)}
          onSelectResultDetail={res => {
            setActiveCompetencyModal(null);
            setActiveResultDetailModal(res);
          }}
        />
      )}

      {activeResultDetailModal && selectedStudent && (
        <DiagnosticResultDetailModal
          result={activeResultDetailModal}
          student={selectedStudent}
          onClose={() => setActiveResultDetailModal(null)}
        />
      )}
    </div>
  );
};
export default DiagnosticResults;
