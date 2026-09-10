import React, { useState, useMemo } from 'react';
import { 
  X, 
  Layers, 
  User, 
  Calendar, 
  Play, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight, 
  Search,
  Filter,
  UserX,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Student } from '../../../types';
import { DiagnosticResult, DiagnosticCompetency } from '../../../types/diagnosticCore';
import { 
  ClassCompetencySummary, 
  COMPETENCY_STATUS_CONFIG, 
  formatGermanDate,
  getObservationTagInfo 
} from '../../../lib/diagnosticCoreUtils';

interface ClassCompetencyDetailModalProps {
  summary: ClassCompetencySummary;
  onClose: () => void;
  onSelectStudent: (student: Student) => void;
  onStartIndividualTest: (studentId?: string, competencyId?: string) => void;
}

export const ClassCompetencyDetailModal: React.FC<ClassCompetencyDetailModalProps> = ({
  summary,
  onClose,
  onSelectStudent,
  onStartIndividualTest,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const competency = summary.competency;
  const total = summary.totalStudentsCount;
  const tested = summary.testedStudentsCount;

  // Percentage calculations
  const secPercent = total > 0 ? (summary.statusCounts.secure / total) * 100 : 0;
  const mosPercent = total > 0 ? (summary.statusCounts.mostlySecure / total) * 100 : 0;
  const parPercent = total > 0 ? (summary.statusCounts.partlySecure / total) * 100 : 0;
  const needPercent = total > 0 ? (summary.statusCounts.needsObservation / total) * 100 : 0;
  const untestPercent = total > 0 ? (summary.untestedStudentsCount / total) * 100 : 0;

  // Filtered student list
  const filteredEntries = useMemo(() => {
    return summary.studentEntries.filter(entry => {
      // Status filter
      if (filterStatus !== 'all' && entry.status !== filterStatus) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const fullName = `${entry.student.vorname} ${entry.student.nachname}`.toLowerCase();
        return fullName.includes(q);
      }
      return true;
    });
  }, [summary.studentEntries, filterStatus, searchQuery]);

  const filteredUntestedStudents = useMemo(() => {
    if (filterStatus !== 'all' && filterStatus !== 'untested') return [];
    if (!searchQuery.trim()) return summary.untestedStudents;
    const q = searchQuery.toLowerCase();
    return summary.untestedStudents.filter(s =>
      `${s.vorname} ${s.nachname}`.toLowerCase().includes(q)
    );
  }, [summary.untestedStudents, filterStatus, searchQuery]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        id="modal-class-competency-detail"
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* 1. Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {summary.area?.name || summary.domain?.name}
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Klassenübersicht
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900">
              {competency.name}
            </h3>

            {competency.description && (
              <p className="text-xs text-slate-500 max-w-xl">
                {competency.description}
              </p>
            )}
          </div>

          <button
            id="btn-close-class-comp-modal"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Overview Statistics & Distribution Bar */}
        <div className="p-5 sm:p-6 bg-slate-50/60 border-b border-slate-100 space-y-4">
          {/* Header Stats */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-slate-900">
                {tested} von {total} Kindern erfasst
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({Math.round(total > 0 ? (tested / total) * 100 : 0)}%)
              </span>
            </div>

            {/* Tested Levels */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Getestete Niveaus:</span>
              {[1, 2, 3, 4].map(lvl => {
                const count = summary.levelCounts[lvl] || 0;
                if (count === 0) return null;
                return (
                  <span
                    key={lvl}
                    className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-md text-[11px]"
                  >
                    N{lvl}: {count}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Stacked Progress Bar */}
          <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex">
            {secPercent > 0 && <div style={{ width: `${secPercent}%` }} className="h-full bg-emerald-500" />}
            {mosPercent > 0 && <div style={{ width: `${mosPercent}%` }} className="h-full bg-sky-500" />}
            {parPercent > 0 && <div style={{ width: `${parPercent}%` }} className="h-full bg-amber-400" />}
            {needPercent > 0 && <div style={{ width: `${needPercent}%` }} className="h-full bg-rose-400" />}
            {untestPercent > 0 && <div style={{ width: `${untestPercent}%` }} className="h-full bg-slate-300" />}
          </div>

          {/* Status Counter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              onClick={() => setFilterStatus(filterStatus === 'secure' ? 'all' : 'secure')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                filterStatus === 'secure'
                  ? 'bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/70 border-emerald-200/70 hover:bg-emerald-100/50 text-emerald-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{summary.statusCounts.secure} Sicher</span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus(filterStatus === 'mostlySecure' ? 'all' : 'mostlySecure')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                filterStatus === 'mostlySecure'
                  ? 'bg-sky-100/90 border-sky-300 ring-2 ring-sky-500/20'
                  : 'bg-sky-50/70 border-sky-200/70 hover:bg-sky-100/50 text-sky-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-sky-900">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>{summary.statusCounts.mostlySecure} Überw. sicher</span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus(filterStatus === 'partlySecure' ? 'all' : 'partlySecure')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                filterStatus === 'partlySecure'
                  ? 'bg-amber-100/90 border-amber-300 ring-2 ring-amber-500/20'
                  : 'bg-amber-50/70 border-amber-200/70 hover:bg-amber-100/50 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{summary.statusCounts.partlySecure} Teilw. sicher</span>
              </div>
            </button>

            <button
              onClick={() => setFilterStatus(filterStatus === 'needsObservation' ? 'all' : 'needsObservation')}
              className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                filterStatus === 'needsObservation'
                  ? 'bg-rose-100/90 border-rose-300 ring-2 ring-rose-500/20'
                  : 'bg-rose-50/70 border-rose-200/70 hover:bg-rose-100/50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-rose-900">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>{summary.statusCounts.needsObservation} Beobachten</span>
              </div>
            </button>
          </div>

          {/* Frequent Observation Patterns / Strategies (if any) */}
          {summary.frequentObservations.length > 0 && (
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Häufige Beobachtungen:</span>
              {summary.frequentObservations.map((obs, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${obs.badgeBg} ${obs.badgeText}`}
                >
                  {obs.count}× {obs.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 3. Filter / Search Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700">Filter:</span>
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Alle ({total})
            </button>
            <button
              onClick={() => setFilterStatus('untested')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filterStatus === 'untested'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Offen ({summary.untestedStudentsCount})
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Schüler filtern..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 w-44"
            />
          </div>
        </div>

        {/* 4. Student List (Alphabetically sorted, no ranking) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Section: Tested students */}
          {filterStatus !== 'untested' && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Erfasste Kinder ({filteredEntries.length})
              </h4>

              {filteredEntries.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  Keine erfassten Kinder für diesen Filter.
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map(entry => {
                    const statusCfg = COMPETENCY_STATUS_CONFIG[entry.status] || COMPETENCY_STATUS_CONFIG.needsObservation;

                    return (
                      <div
                        key={entry.student.id}
                        className="p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50/50 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Student Name, Level & Date */}
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">
                              {entry.student.nachname}, {entry.student.vorname}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Niveau {entry.gradeLevel || 1}
                            </span>
                            {entry.score !== undefined && entry.maxScore !== undefined && (
                              <span className="text-[11px] text-slate-500 font-medium">
                                ({entry.score}/{entry.maxScore} Pkt.)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span>Letzter Check: {formatGermanDate(entry.date)}</span>
                            {entry.nextStep && (
                              <>
                                <span>•</span>
                                <span className="text-slate-600 truncate max-w-xs">{entry.nextStep}</span>
                              </>
                            )}
                          </div>

                          {/* Strategy / Observation tags */}
                          {(entry.observations || []).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {entry.observations?.slice(0, 3).map((obs, oIdx) => {
                                const info = getObservationTagInfo(obs.tag);
                                return (
                                  <span
                                    key={oIdx}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                      info?.badgeBg || 'bg-slate-100 border-slate-200'
                                    } ${info?.badgeText || 'text-slate-700'}`}
                                  >
                                    {info?.label || obs.text}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Status Badge & Direct Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold ${statusCfg.badgeBg} ${statusCfg.badgeText} border ${statusCfg.border}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${statusCfg.dotColor}`} />
                            {statusCfg.label}
                          </span>

                          <button
                            id={`btn-modal-profile-${entry.student.id}`}
                            onClick={() => {
                              onClose();
                              onSelectStudent(entry.student);
                            }}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Kindprofil
                          </button>

                          <button
                            id={`btn-modal-test-${entry.student.id}`}
                            onClick={() => {
                              onClose();
                              onStartIndividualTest(entry.student.id, competency.id);
                            }}
                            title="1:1-Check starten"
                            className="p-1.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Section: Untested students */}
          {(filterStatus === 'all' || filterStatus === 'untested') && filteredUntestedStudents.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Noch nicht in dieser Kompetenz erfasst ({filteredUntestedStudents.length})
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredUntestedStudents.map(student => (
                  <div
                    key={student.id}
                    className="p-3 rounded-xl border border-slate-200/70 bg-slate-50/70 flex items-center justify-between gap-2"
                  >
                    <div 
                      onClick={() => {
                        onClose();
                        onSelectStudent(student);
                      }}
                      className="cursor-pointer min-w-0"
                    >
                      <span className="text-xs font-bold text-slate-800 hover:text-indigo-600 block truncate">
                        {student.nachname}, {student.vorname}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Noch keine Erhebung
                      </span>
                    </div>

                    <button
                      id={`btn-untested-check-${student.id}`}
                      onClick={() => {
                        onClose();
                        onStartIndividualTest(student.id, competency.id);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-indigo-600 text-white rounded-lg text-[11px] font-bold transition-colors shrink-0 cursor-pointer shadow-2xs"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>Jetzt testen</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 5. Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors cursor-pointer shadow-2xs"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
export default ClassCompetencyDetailModal;
