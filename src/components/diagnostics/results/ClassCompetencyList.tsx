import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  ChevronRight, 
  Search, 
  CheckCircle2, 
  Filter, 
  Sparkles, 
  Users,
  Eye
} from 'lucide-react';
import { 
  ClassCompetencySummary,
  COMPETENCY_STATUS_CONFIG 
} from '../../../lib/diagnosticCoreUtils';
import { DIAGNOSTIC_DOMAINS } from '../../../data/diagnosticCompetencies';

interface ClassCompetencyListProps {
  summaries: ClassCompetencySummary[];
  onOpenCompetencyDetail: (competencyId: string) => void;
}

export const ClassCompetencyList: React.FC<ClassCompetencyListProps> = ({
  summaries,
  onOpenCompetencyDetail,
}) => {
  const [selectedDomainId, setSelectedDomainId] = useState<string>('all');
  const [onlyTested, setOnlyTested] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSummaries = useMemo(() => {
    return summaries.filter(item => {
      // Domain filter
      if (selectedDomainId !== 'all' && item.domain?.id !== selectedDomainId) {
        return false;
      }
      // Only tested toggle
      if (onlyTested && item.testedStudentsCount === 0) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.competency.name.toLowerCase().includes(q);
        const matchesArea = item.area?.name.toLowerCase().includes(q);
        const matchesDomain = item.domain?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesArea && !matchesDomain) {
          return false;
        }
      }
      return true;
    });
  }, [summaries, selectedDomainId, onlyTested, searchQuery]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-5 sm:p-6 space-y-5">
      {/* 1. Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Kompetenzübersicht der Klasse
          </h3>
          <p className="text-xs text-slate-500">
            Pro Kind fließt ausschließlich das jeweils aktuellste Testergebnis ein
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-class-competency-search"
              type="text"
              placeholder="Kompetenz suchen..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 w-44 sm:w-52"
            />
          </div>

          {/* Only tested toggle */}
          <label 
            id="toggle-only-tested"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={onlyTested}
              onChange={e => setOnlyTested(e.target.checked)}
              className="rounded text-slate-900 focus:ring-slate-400 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Nur erfasste ({summaries.filter(s => s.testedStudentsCount > 0).length})</span>
          </label>
        </div>
      </div>

      {/* 2. Domain Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          id="filter-domain-all"
          onClick={() => setSelectedDomainId('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
            selectedDomainId === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
          }`}
        >
          Alle Bereiche ({summaries.length})
        </button>

        {DIAGNOSTIC_DOMAINS.map(domain => {
          const domainComps = summaries.filter(s => s.domain?.id === domain.id);
          const isSelected = selectedDomainId === domain.id;

          return (
            <button
              key={domain.id}
              id={`filter-domain-${domain.id}`}
              onClick={() => setSelectedDomainId(domain.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{domain.name}</span>
              <span className="ml-1.5 opacity-70 text-[11px]">({domainComps.length})</span>
            </button>
          );
        })}
      </div>

      {/* 3. Competency Cards Grid */}
      {filteredSummaries.length === 0 ? (
        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-500 text-xs">
          Keine Kompetenzen für diesen Filter gefunden.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredSummaries.map(item => {
            const hasData = item.testedStudentsCount > 0;
            const total = item.totalStudentsCount;
            const tested = item.testedStudentsCount;

            // Calculate percentage shares for status bar
            const secPercent = total > 0 ? (item.statusCounts.secure / total) * 100 : 0;
            const mosPercent = total > 0 ? (item.statusCounts.mostlySecure / total) * 100 : 0;
            const parPercent = total > 0 ? (item.statusCounts.partlySecure / total) * 100 : 0;
            const needPercent = total > 0 ? (item.statusCounts.needsObservation / total) * 100 : 0;
            const untestPercent = total > 0 ? (item.untestedStudentsCount / total) * 100 : 0;

            return (
              <div
                key={item.competency.id}
                id={`class-comp-card-${item.competency.id}`}
                onClick={() => onOpenCompetencyDetail(item.competency.id)}
                className="p-4 rounded-2xl border border-slate-200/80 hover:border-slate-300 bg-white hover:bg-slate-50/40 hover:shadow-xs transition-all cursor-pointer space-y-3.5 group flex flex-col justify-between"
              >
                {/* Header: Area, Title & Coverage */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.area?.name || item.domain?.name}
                    </span>

                    <span 
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        hasData
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <span>Erfasst:</span>
                      <span>{tested}/{total}</span>
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {item.competency.name}
                  </h4>
                </div>

                {/* Status Bar & Breakdown */}
                {hasData ? (
                  <div className="space-y-2.5">
                    {/* Stacked Visual Bar */}
                    <div 
                      className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex"
                      title={`${item.statusCounts.secure} Sicher, ${item.statusCounts.mostlySecure} Überwiegend sicher, ${item.statusCounts.partlySecure} Teilweise sicher, ${item.statusCounts.needsObservation} Weiter beobachten, ${item.untestedStudentsCount} Offen`}
                    >
                      {secPercent > 0 && (
                        <div style={{ width: `${secPercent}%` }} className="h-full bg-emerald-500" />
                      )}
                      {mosPercent > 0 && (
                        <div style={{ width: `${mosPercent}%` }} className="h-full bg-sky-500" />
                      )}
                      {parPercent > 0 && (
                        <div style={{ width: `${parPercent}%` }} className="h-full bg-amber-400" />
                      )}
                      {needPercent > 0 && (
                        <div style={{ width: `${needPercent}%` }} className="h-full bg-rose-400" />
                      )}
                      {untestPercent > 0 && (
                        <div style={{ width: `${untestPercent}%` }} className="h-full bg-slate-200/90" />
                      )}
                    </div>

                    {/* Status Counters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50/70 border border-emerald-200/60 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-bold">{item.statusCounts.secure}</span>
                        <span className="text-[10px] truncate">Sicher</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-sky-800 bg-sky-50/70 border border-sky-200/60 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                        <span className="font-bold">{item.statusCounts.mostlySecure}</span>
                        <span className="text-[10px] truncate">Überw.</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-amber-900 bg-amber-50/70 border border-amber-200/60 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="font-bold">{item.statusCounts.partlySecure}</span>
                        <span className="text-[10px] truncate">Teilweise</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-rose-900 bg-rose-50/70 border border-rose-200/60 px-2 py-1 rounded-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-bold">{item.statusCounts.needsObservation}</span>
                        <span className="text-[10px] truncate">Beobachten</span>
                      </div>
                    </div>

                    {/* Tested Grade Levels */}
                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500 border-t border-slate-100">
                      <span className="font-semibold text-slate-600">Getestete Niveaus:</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map(lvl => {
                          const count = item.levelCounts[lvl] || 0;
                          if (count === 0) return null;
                          return (
                            <span
                              key={lvl}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]"
                            >
                              N{lvl}: {count}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Frequent Observation Pattern tags (if available) */}
                    {item.frequentObservations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {item.frequentObservations.slice(0, 2).map((obs, oIdx) => (
                          <span
                            key={oIdx}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${obs.badgeBg} ${obs.badgeText}`}
                          >
                            {obs.count}× {obs.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50/80 rounded-xl text-center space-y-1">
                    <p className="text-xs font-semibold text-slate-600">
                      In dieser Klasse noch nicht überprüft
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Klick öffnet die Detailansicht zum Starten
                    </p>
                  </div>
                )}

                {/* Footer Action Hint */}
                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 group-hover:text-indigo-600 font-semibold transition-colors">
                  <span>Klassen-Detailansicht</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default ClassCompetencyList;
