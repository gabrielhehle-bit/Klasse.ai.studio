import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DiagnosticHome } from './DiagnosticHome';
import { DiagnosticIndividual } from './DiagnosticIndividual';
import { DiagnosticClass } from './DiagnosticClass';
import { DiagnosticResults } from './DiagnosticResults';
import DiagnostikLegacy from '../DiagnostikLegacy';
import { DiagnosticResult } from '../../types/diagnosticCore';

export type DiagnosticViewMode = 'home' | 'individual' | 'class' | 'results' | 'legacy';

export const DiagnosticContainer: React.FC = () => {
  const { app, updateApp } = useApp();
  const [view, setView] = useState<DiagnosticViewMode>(
    app.activeDiagnosticView === 'results' ? 'results' :
    app.activeDiagnosticView === 'individual' ? 'individual' :
    app.activeDiagnosticView === 'class' || app.activeDiagnosticView === 'screening' ? 'class' :
    app.activeDiagnosticView === 'legacy' ? 'legacy' : 'home'
  );
  const [selectedStudentIdForTest, setSelectedStudentIdForTest] = useState<string | undefined>(app.selectedDiagnosticStudentId);
  const [selectedCompetencyIdForTest, setSelectedCompetencyIdForTest] = useState<string | undefined>(app.selectedDiagnosticCompetencyId);
  const [selectedGradeLevelForTest, setSelectedGradeLevelForTest] = useState<number | undefined>(app.selectedDiagnosticGradeLevel);

  const students = app.schueler || [];
  const diagnosticResults = app.diagnosticResults || [];
  const activeClassName = (app as any).schulklasse || app.stufe || '2a';

  const handleSaveResult = (newResult: DiagnosticResult) => {
    const currentList = app.diagnosticResults || [];
    updateApp({
      diagnosticResults: [newResult, ...currentList],
    });
  };

  const handleSaveMultipleResults = (newResults: DiagnosticResult[]) => {
    const currentList = app.diagnosticResults || [];
    updateApp({
      diagnosticResults: [...newResults, ...currentList],
    });
  };

  const handleStartIndividual = (studentId: string, competencyId?: string, gradeLevel?: number) => {
    setSelectedStudentIdForTest(studentId);
    setSelectedCompetencyIdForTest(competencyId);
    setSelectedGradeLevelForTest(gradeLevel);
    setView('individual');
  };

  if (view === 'legacy') {
    return <DiagnostikLegacy onBackToNew={() => setView('home')} />;
  }

  if (view === 'individual') {
    return (
      <DiagnosticIndividual
        students={students}
        initialStudentId={selectedStudentIdForTest}
        initialCompetencyId={selectedCompetencyIdForTest}
        initialGradeLevel={selectedGradeLevelForTest}
        onBackToHome={() => {
          setSelectedStudentIdForTest(undefined);
          setSelectedCompetencyIdForTest(undefined);
          setSelectedGradeLevelForTest(undefined);
          setView('home');
        }}
        onSaveDiagnosticResult={handleSaveResult}
        onNavigateToResults={() => {
          setSelectedStudentIdForTest(undefined);
          setSelectedCompetencyIdForTest(undefined);
          setSelectedGradeLevelForTest(undefined);
          setView('results');
        }}
      />
    );
  }

  if (view === 'class') {
    return (
      <DiagnosticClass
        students={students}
        activeClassName={activeClassName}
        onBackToHome={() => setView('home')}
        onSaveDiagnosticResults={handleSaveMultipleResults}
        onStartIndividualTest={handleStartIndividual}
        onNavigateToResults={() => setView('results')}
      />
    );
  }

  if (view === 'results') {
    return (
      <DiagnosticResults
        results={diagnosticResults}
        students={students}
        activeClassName={activeClassName}
        onBackToHome={() => setView('home')}
        onStartIndividual={(studentId) => {
          setSelectedStudentIdForTest(studentId);
          setView('individual');
        }}
        onStartClass={() => setView('class')}
      />
    );
  }

  // Default: New Simplified Diagnostic Home
  return (
    <DiagnosticHome
      onSelectMode={(mode) => setView(mode)}
      onOpenLegacy={() => setView('legacy')}
      resultsCount={diagnosticResults.length}
      studentsCount={students.length}
      activeClassName={activeClassName}
    />
  );
};

export default DiagnosticContainer;
