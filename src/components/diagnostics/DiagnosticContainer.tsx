import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { DiagnosticHome } from './DiagnosticHome';
import { DiagnosticIndividual } from './DiagnosticIndividual';
import { DiagnosticClass } from './DiagnosticClass';
import { DiagnosticResults } from './DiagnosticResults';
import DiagnostikLegacy from '../DiagnostikLegacy';
import { DiagnosticResult } from '../../types/diagnosticCore';
import { validateDiagnosticResult } from '../../lib/diagnosticCoreUtils';

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
  const activeClassId = app.activeClassId || undefined;
  const activeClassName = app.klassenbezeichnung?.trim() || app.klasse?.trim() || undefined;

  const previousClassIdRef = useRef(app.activeClassId);

  useEffect(() => {
    if (previousClassIdRef.current === app.activeClassId) return;
    previousClassIdRef.current = app.activeClassId;
    setView('home');
    setSelectedStudentIdForTest(undefined);
    setSelectedCompetencyIdForTest(undefined);
    setSelectedGradeLevelForTest(undefined);
  }, [app.activeClassId]);

  const validateResultForActiveClass = (result: DiagnosticResult): string[] => {
    const validation = validateDiagnosticResult(result);
    const errors = [...validation.errors];

    if (!activeClassId) errors.push('Keine aktive Klasse ausgewählt.');
    if (activeClassId && result.classId !== activeClassId) {
      errors.push('Das Diagnostikergebnis gehört nicht zur aktiven Klasse.');
    }
    if (!students.some(student => student.id === result.studentId)) {
      errors.push('Das Kind gehört nicht zur aktiven Klasse.');
    }

    return errors;
  };

  const handleSaveResult = (newResult: DiagnosticResult): boolean => {
    const errors = validateResultForActiveClass(newResult);
    if (errors.length > 0) {
      window.alert(`Ergebnis kann nicht gespeichert werden:\n${errors.join('\n')}`);
      return false;
    }

    const currentList = app.diagnosticResults || [];
    updateApp({
      diagnosticResults: [newResult, ...currentList.filter(result => result.id !== newResult.id)],
    });
    return true;
  };

  const handleSaveMultipleResults = (newResults: DiagnosticResult[]): boolean => {
    const errors = newResults.flatMap(result => validateResultForActiveClass(result));
    if (errors.length > 0) {
      window.alert(`Screening kann nicht gespeichert werden:\n${Array.from(new Set(errors)).join('\n')}`);
      return false;
    }

    const incomingIds = new Set(newResults.map(result => result.id));
    const currentList = app.diagnosticResults || [];
    updateApp({
      diagnosticResults: [...newResults, ...currentList.filter(result => !incomingIds.has(result.id))],
    });
    return true;
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
        activeClassId={activeClassId}
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
