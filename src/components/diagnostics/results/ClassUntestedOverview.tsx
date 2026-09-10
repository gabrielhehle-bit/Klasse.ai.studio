import React, { useState } from 'react';
import { 
  UserX, 
  Layers, 
  Play, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  Users,
  Search
} from 'lucide-react';
import { Student } from '../../../types';
import { DiagnosticCompetency, DiagnosticDomain } from '../../../types/diagnosticCore';

interface UntestedCompetencyItem {
  competency: DiagnosticCompetency;
  domain?: DiagnosticDomain;
  untestedCount: number;
  testedCount: number;
  untestedStudents: Student[];
}

interface ClassUntestedOverviewProps {
  studentsWithoutAnyResults: Student[];
  competencyUntestedList: UntestedCompetencyItem[];
  onOpenCompetencyDetail: (competencyId: string) => void;
  onStartIndividualTest: (studentId?: string, competencyId?: string) => void;
  onSelectStudent: (student: Student) => void;
}

export const ClassUntestedOverview: React.FC<ClassUntestedOverviewProps> = ({
  studentsWithoutAnyResults,
  competencyUntestedList,
  onOpenCompetencyDetail,
  onStartIndividualTest,
  onSelectStudent,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'competencies'>('students');
  const [filterQuery, setFilterQuery] = useState('');

  const filteredCompetencies = competencyUntestedList.filter(item => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.competency.name.toLowerCase().includes(q) ||
      (item.domain?.name && item.domain.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
      {/* Header with Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Noch nicht überprüft
          </h3>
          <p className="text-xs text-slate-500">
            Systematische Erfassungsplanung für ausstehende Diagnostiken
          </p>
        </div>

        {/* View Toggle */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-center">
          <button
            id="tab-untested-students"
            onClick={() => setActiveTab('students')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Kinder ohne Check ({studentsWithoutAnyResults.length})
          </button>
          <button
            id="tab-untested-competencies"
            onClick={() => setActiveTab('competencies')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'competencies'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Offene Kompetenzen ({competencyUntestedList.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Students with zero results */}
      {activeTab === 'students' && (
        <div className="space-y-3">
          {studentsWithoutAnyResults.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-2">
              <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-slate-800">
                Alle Kinder der Klasse erfasst
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Jedes Kind dieser Klasse verfügt bereits über mindestens ein neues Diagnostikergebnis.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {studentsWithoutAnyResults.map(student => (
                <div
                  key={student.id}
                  id={`untested-student-${student.id}`}
                  className="p-3 bg-slate-50/70 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all flex items-center justify-between gap-3 group"
                >
                  <div 
                    onClick={() => onSelectStudent(student)}
                    className="flex items-center gap-2.5 cursor-pointer min-w-0"
                  >
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                      {student.vorname?.[0]}{student.nachname?.[0]}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                        {student.vorname} {student.nachname}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Bislang kein Check
                      </span>
                    </div>
                  </div>

                  <button
                    id={`btn-start-test-${student.id}`}
                    onClick={() => onStartIndividualTest(student.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-semibold transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    <Play className="w-2.5 h-2.5" />
                    <span>Check</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Competency-based untested gaps */}
      {activeTab === 'competencies' && (
        <div className="space-y-3">
          <div className="relative max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Kompetenz filtern..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCompetencies.map(item => (
              <div
                key={item.competency.id}
                id={`untested-comp-${item.competency.id}`}
                onClick={() => onOpenCompetencyDetail(item.competency.id)}
                className="p-3.5 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 hover:bg-white hover:shadow-2xs transition-all cursor-pointer space-y-2 flex flex-col justify-between group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {item.domain?.name}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {item.competency.name}
                    </h4>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shrink-0">
                    noch {item.untestedCount} offen
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span className="truncate max-w-[200px]">
                    Offen bei: {item.untestedStudents.slice(0, 3).map(s => s.vorname).join(', ')}
                    {item.untestedStudents.length > 3 ? ` +${item.untestedStudents.length - 3}` : ''}
                  </span>
                  <div className="flex items-center gap-1 font-semibold text-slate-700 group-hover:text-indigo-600 shrink-0">
                    <span>Erfassen</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default ClassUntestedOverview;
