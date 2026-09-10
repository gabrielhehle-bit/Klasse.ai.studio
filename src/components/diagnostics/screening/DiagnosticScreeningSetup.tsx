import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Play, 
  CheckSquare, 
  Square, 
  GraduationCap, 
  Clock, 
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { Student } from '../../../types';
import { 
  DiagnosticTestDefinition, 
  DiagnosticCompetency, 
  DiagnosticDomain, 
  DiagnosticCompetencyArea 
} from '../../../types/diagnosticCore';

interface DiagnosticScreeningSetupProps {
  testDefinition: DiagnosticTestDefinition;
  competency: DiagnosticCompetency;
  domain: DiagnosticDomain;
  area: DiagnosticCompetencyArea;
  students: Student[];
  activeClassName?: string;
  onStartScreening: (selectedLevel: number, selectedStudents: Student[]) => void;
  onCancel: () => void;
}

export const DiagnosticScreeningSetup: React.FC<DiagnosticScreeningSetupProps> = ({
  testDefinition,
  competency,
  domain,
  area,
  students,
  activeClassName,
  onStartScreening,
  onCancel,
}) => {
  // Determine default level based on class name or default to 2
  const defaultLevel = useMemo(() => {
    if (activeClassName) {
      const match = activeClassName.match(/(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 4) return num;
      }
    }
    if (testDefinition.recommendedGrade && testDefinition.recommendedGrade.length > 0) {
      return testDefinition.recommendedGrade[0];
    }
    return 2;
  }, [activeClassName, testDefinition]);

  const [selectedLevel, setSelectedLevel] = useState<number>(defaultLevel);

  // Alphabetically sorted students
  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => 
      a.nachname.localeCompare(b.nachname, 'de') || 
      a.vorname.localeCompare(b.vorname, 'de')
    );
  }, [students]);

  // Selected student IDs (default: all students)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(() => {
    return new Set(students.map(s => s.id));
  });

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedStudentIds(new Set(students.map(s => s.id)));
  };

  const deselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  // Current level definition
  const currentLevelDef = useMemo(() => {
    return testDefinition.levels.find(l => l.level === selectedLevel) || testDefinition.levels[0];
  }, [testDefinition, selectedLevel]);

  const participatingStudents = useMemo(() => {
    return sortedStudents.filter(s => selectedStudentIds.has(s.id));
  }, [sortedStudents, selectedStudentIds]);

  const handleStart = () => {
    if (participatingStudents.length === 0) return;
    onStartScreening(selectedLevel, participatingStudents);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Klassenscreening vorbereiten
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {domain.name} • {area.name}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {testDefinition.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {testDefinition.subtitle || testDefinition.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-100">
              <Users className="w-3.5 h-3.5" />
              Klasse {activeClassName || '2a'}
            </span>
          </div>
        </div>

        {/* Instructions / Pedagogical context */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            Zweck des Screenings:
          </p>
          <p className="leading-relaxed">
            Das Screening verschafft dir einen schnellen, strukturierten Überblick über die gesamte Klasse (ca. 3–5 Aufgaben). Es beantwortet, bei welchen Kindern die Kompetenz sicher sitzt und wo sich ein genauerer 1:1-Check lohnt.
          </p>
        </div>
      </div>

      {/* 1. Niveaustufe wählen */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              1. Screening-Niveau festlegen
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatisch vorgeschlagen anhand der Klassenstufe. Kann flexibel angepasst werden.
            </p>
          </div>
          {currentLevelDef && (
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {currentLevelDef.tasks.length} Aufgaben • ca. {currentLevelDef.durationMinutes || 5} Min.
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {testDefinition.levels.map((lvl) => {
            const isSelected = lvl.level === selectedLevel;
            return (
              <button
                key={lvl.level}
                type="button"
                id={`btn-screening-level-${lvl.level}`}
                onClick={() => setSelectedLevel(lvl.level)}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700' : 'text-slate-800'}`}>
                    Niveau {lvl.level}
                  </span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[11px] text-slate-500 leading-tight line-clamp-2">
                  {lvl.label.replace(`(Niveau ${lvl.level})`, '').trim()}
                </p>
              </button>
            );
          })}
        </div>

        {currentLevelDef && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Fokus Niveau {currentLevelDef.level}: </span>
            <span>{currentLevelDef.description}</span>
          </div>
        )}
      </div>

      {/* 2. Kinder auswählen */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              2. Teilnehmende Kinder auswählen
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Standardmäßig nehmen alle Kinder der Klasse teil. Abwesende Kinder können abgewählt werden.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              {participatingStudents.length} von {sortedStudents.length} ausgewählt
            </span>
            <button
              type="button"
              id="btn-screening-select-all"
              onClick={selectAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-emerald-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              Alle
            </button>
            <button
              type="button"
              id="btn-screening-deselect-all"
              onClick={deselectAll}
              className="text-[11px] font-semibold text-slate-600 hover:text-rose-600 px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
            >
              Keine
            </button>
          </div>
        </div>

        {/* Student Checkbox Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-2 max-h-80 overflow-y-auto pr-1">
          {sortedStudents.map((student) => {
            const isChecked = selectedStudentIds.has(student.id);
            return (
              <button
                key={student.id}
                type="button"
                id={`chk-screening-student-${student.id}`}
                onClick={() => toggleStudent(student.id)}
                className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isChecked
                    ? 'border-emerald-300 bg-emerald-50/40 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-400 opacity-60 hover:opacity-90'
                }`}
              >
                <div className="shrink-0 text-emerald-600">
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <span className="font-semibold">{student.nachname}</span>, {student.vorname}
                </div>
              </button>
            );
          })}
        </div>

        {participatingStudents.length === 0 && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Bitte wähle mindestens ein Kind für das Klassenscreening aus.</span>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          id="btn-screening-cancel-setup"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Abbrechen
        </button>

        <button
          type="button"
          id="btn-screening-start-active"
          disabled={participatingStudents.length === 0}
          onClick={handleStart}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Screening starten ({participatingStudents.length} Kinder)</span>
        </button>
      </div>
    </div>
  );
};
