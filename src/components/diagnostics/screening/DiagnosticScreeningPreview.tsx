import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Play, 
  ArrowRight, 
  Users, 
  RotateCcw, 
  Save, 
  GraduationCap, 
  Search,
  Eye,
  Tag
} from 'lucide-react';
import { Student } from '../../../types';
import { 
  DiagnosticTestDefinition, 
  DiagnosticCompetency, 
  DiagnosticResult,
  CompetencyStatus
} from '../../../types/diagnosticCore';
import { COMPETENCY_STATUS_CONFIG, OBSERVATION_TYPE_CONFIG } from '../../../data/diagnosticCompetencies';

interface DiagnosticScreeningPreviewProps {
  testDefinition: DiagnosticTestDefinition;
  competency: DiagnosticCompetency;
  level: number;
  students: Student[];
  evaluatedResults: DiagnosticResult[];
  activeClassName?: string;
  onSaveAll: (results: DiagnosticResult[]) => void;
  onBackToRunner: () => void;
  onCancel: () => void;
  onStartIndividualTest: (studentId: string, competencyId: string, gradeLevel: number) => void;
}

export const DiagnosticScreeningPreview: React.FC<DiagnosticScreeningPreviewProps> = ({
  testDefinition,
  competency,
  level,
  students,
  evaluatedResults,
  activeClassName,
  onSaveAll,
  onBackToRunner,
  onCancel,
  onStartIndividualTest,
}) => {
  const studentMap = useMemo(() => {
    return new Map(students.map(s => [s.id, s]));
  }, [students]);

  // Group students by status
  const groupedResults = useMemo(() => {
    const groups: {
      statusKey: CompetencyStatus | 'insufficient';
      title: string;
      description: string;
      colorBadge: string;
      items: { student: Student; result: DiagnosticResult }[];
    }[] = [
      {
        statusKey: 'secure',
        title: 'Sicher',
        description: 'Im Klassenscreening zügig und fehlerfrei gelöst.',
        colorBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        items: [],
      },
      {
        statusKey: 'mostlySecure',
        title: 'Überwiegend sicher',
        description: 'Aufgaben weitgehend sicher gelöst; vereinzelt noch zählend oder zögernd.',
        colorBadge: 'bg-teal-50 text-teal-800 border-teal-200',
        items: [],
      },
      {
        statusKey: 'partlySecure',
        title: 'Teilweise sicher',
        description: 'Grundlagen erkennbar, jedoch noch unsicher oder vermehrter Unterstützungsbedarf.',
        colorBadge: 'bg-amber-50 text-amber-800 border-amber-200',
        items: [],
      },
      {
        statusKey: 'needsObservation',
        title: 'Weiter beobachten',
        description: 'Deutlicher Unterstützungsbedarf oder verharren in zählenden Strategien.',
        colorBadge: 'bg-rose-50 text-rose-800 border-rose-200',
        items: [],
      },
      {
        statusKey: 'insufficient',
        title: 'Nicht ausreichend beobachtet',
        description: 'Keine oder zu wenige Aufgaben beobachtet (z. B. abwesend).',
        colorBadge: 'bg-slate-50 text-slate-700 border-slate-200',
        items: [],
      },
    ];

    evaluatedResults.forEach(res => {
      const student = studentMap.get(res.studentId);
      if (!student) return;

      const compRes = res.competencyResults[0];
      const isInsufficient = (res.rawScore === 0 && res.maxScore === 0) || 
        compRes?.note?.includes('Nicht ausreichend beobachtet');

      if (isInsufficient) {
        groups[4].items.push({ student, result: res });
      } else {
        const status = compRes?.status || 'needsObservation';
        const group = groups.find(g => g.statusKey === status);
        if (group) {
          group.items.push({ student, result: res });
        } else {
          groups[3].items.push({ student, result: res });
        }
      }
    });

    // Alphabetically sort within each group (No Rankings!)
    groups.forEach(g => {
      g.items.sort((a, b) => 
        a.student.nachname.localeCompare(b.student.nachname, 'de') ||
        a.student.vorname.localeCompare(b.student.vorname, 'de')
      );
    });

    return groups.filter(g => g.items.length > 0);
  }, [evaluatedResults, studentMap]);

  const followUpCount = useMemo(() => {
    return evaluatedResults.filter(r => {
      const st = r.competencyResults[0]?.status;
      return st === 'partlySecure' || st === 'needsObservation';
    }).length;
  }, [evaluatedResults]);

  return (
    <div className="max-w-5xl mx-auto py-2 px-2 sm:px-4 space-y-6">
      {/* Overview Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                Ergebnisvorschau des Klassenscreenings
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Niveau {level}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">
              {testDefinition.title} • {competency.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {evaluatedResults.length} Kinder erfasst • Klasse {activeClassName || '2a'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onSaveAll(evaluatedResults)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Ergebnisse speichern ({evaluatedResults.length})</span>
            </button>
          </div>
        </div>

        {/* Pedagogical orientation banner */}
        <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-xl p-4 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-emerald-950 block mb-0.5">
              Pädagogische Orientierung:
            </span>
            <span>
              Das Screening verschafft einen schnellen ersten Eindruck. Es enthält keine Noten und keine Ranglisten.
              {followUpCount > 0 && (
                <span className="font-semibold text-emerald-900">
                  {' '}Bei {followUpCount} {followUpCount === 1 ? 'Kind' : 'Kindern'} empfiehlt sich ein gezielter 1:1-Check zur Vertiefung.
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Student Results */}
      <div className="space-y-4">
        {groupedResults.map((group) => {
          const isObservationGroup = group.statusKey === 'needsObservation' || group.statusKey === 'partlySecure';

          return (
            <div
              key={group.statusKey}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3"
            >
              {/* Group Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${group.colorBadge}`}>
                    {group.title}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    ({group.items.length} {group.items.length === 1 ? 'Kind' : 'Kinder'})
                  </span>
                </div>
                <span className="text-xs text-slate-400 italic">
                  {group.description}
                </span>
              </div>

              {/* Student Cards in Alphabetical Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {group.items.map(({ student, result }) => {
                  const compResult = result.competencyResults[0];
                  const tags = (result.observations || []).map(o => o.tag);

                  return (
                    <div
                      key={student.id}
                      className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h5 className="text-xs font-bold text-slate-900">
                            {student.nachname}, {student.vorname}
                          </h5>
                          {compResult && (
                            <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {compResult.score} / {compResult.maxScore} Aufgaben
                            </span>
                          )}
                        </div>

                        {compResult?.note && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                            {compResult.note}
                          </p>
                        )}

                        {/* Observation Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {tags.map((tag, idx) => {
                              const cfg = OBSERVATION_TYPE_CONFIG[tag as any];
                              return (
                                <span
                                  key={idx}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200"
                                >
                                  {cfg?.label || tag}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Action: 1:1 Check Button */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] text-slate-400">
                          {isObservationGroup ? 'Vertiefung empfohlen' : 'Optionale Vertiefung'}
                        </span>

                        <button
                          type="button"
                          id={`btn-screening-1to1-${student.id}`}
                          onClick={() => {
                            // First save all results, then transition
                            onSaveAll(evaluatedResults);
                            onStartIndividualTest(student.id, competency.id, level);
                          }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isObservationGroup
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>1:1-Check starten</span>
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

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBackToRunner}
          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Zurück zur Erfassung
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
          >
            Verwerfen
          </button>

          <button
            type="button"
            id="btn-screening-save-all-bottom"
            onClick={() => onSaveAll(evaluatedResults)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Screening-Ergebnisse speichern ({evaluatedResults.length} Kinder)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
