import React from 'react';
import { Search, User, CheckCircle, Sparkles } from 'lucide-react';
import { Student } from '../../../types';
import { DiagnosticResult } from '../../../types/diagnosticCore';

interface StudentSelectorProps {
  students: Student[];
  selectedStudentId: string | null;
  onSelectStudent: (student: Student) => void;
  results: DiagnosticResult[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const StudentSelector: React.FC<StudentSelectorProps> = ({
  students,
  selectedStudentId,
  onSelectStudent,
  results,
  searchQuery,
  onSearchChange,
}) => {
  // Count results per student
  const studentResultCounts = React.useMemo(() => {
    const map = new Map<string, number>();
    results.forEach(r => {
      map.set(r.studentId, (map.get(r.studentId) || 0) + 1);
    });
    return map;
  }, [results]);

  const filteredStudents = React.useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      s =>
        s.vorname.toLowerCase().includes(q) ||
        s.nachname.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
      {/* Header with search & student count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Kind auswählen
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">
            {students.length} Kinder
          </span>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="input-student-search"
            placeholder="Kind suchen..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
          />
        </div>
      </div>

      {/* Horizontal scrollable or flex wrap compact list */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin">
        {filteredStudents.length === 0 ? (
          <div className="py-2 px-3 text-xs text-slate-400 italic">
            Kein Kind gefunden für „{searchQuery}“
          </div>
        ) : (
          filteredStudents.map(student => {
            const isSelected = student.id === selectedStudentId;
            const resultCount = studentResultCounts.get(student.id) || 0;
            const initials = `${student.vorname?.[0] || ''}${student.nachname?.[0] || ''}`;

            return (
              <button
                key={student.id}
                id={`btn-select-student-${student.id}`}
                onClick={() => onSelectStudent(student)}
                className={`group shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                    : 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-700 border-slate-200/80 hover:border-slate-300'
                }`}
              >
                {/* Initials circle */}
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 shadow-2xs'
                  }`}
                >
                  {initials || <User className="w-3 h-3" />}
                </span>

                {/* Name */}
                <span className="whitespace-nowrap font-medium">
                  {student.vorname} {student.nachname?.[0] ? `${student.nachname[0]}.` : ''}
                </span>

                {/* Result count pill */}
                {resultCount > 0 ? (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white text-amber-800'
                        : 'bg-amber-100 text-amber-800 border border-amber-200/70'
                    }`}
                    title={`${resultCount} Diagnostik-Ergebnis(se)`}
                  >
                    {resultCount}
                  </span>
                ) : (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSelected ? 'bg-white/40' : 'bg-slate-300'
                    }`}
                    title="Noch nicht diagnostiziert"
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
