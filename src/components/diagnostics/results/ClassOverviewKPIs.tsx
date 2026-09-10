import React from 'react';
import { 
  Users, 
  UserCheck, 
  ClipboardCheck, 
  Layers, 
  Calculator, 
  BookOpen, 
  Sparkles, 
  HeartHandshake 
} from 'lucide-react';
import { ClassOverallKPIs } from '../../../lib/diagnosticCoreUtils';

interface ClassOverviewKPIsProps {
  kpis: ClassOverallKPIs;
  activeClassName?: string;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  mathematik: <Calculator className="w-4 h-4 text-amber-700" />,
  deutsch: <BookOpen className="w-4 h-4 text-sky-700" />,
  lernvoraussetzungen: <Sparkles className="w-4 h-4 text-violet-700" />,
  sozial_emotional: <HeartHandshake className="w-4 h-4 text-emerald-700" />,
};

const DOMAIN_ACCENT_BG: Record<string, string> = {
  mathematik: 'bg-amber-50 border-amber-200/80 text-amber-900',
  deutsch: 'bg-sky-50 border-sky-200/80 text-sky-900',
  lernvoraussetzungen: 'bg-violet-50 border-violet-200/80 text-violet-900',
  sozial_emotional: 'bg-emerald-50 border-emerald-200/80 text-emerald-900',
};

export const ClassOverviewKPIs: React.FC<ClassOverviewKPIsProps> = ({
  kpis,
  activeClassName = '2a',
}) => {
  return (
    <div className="space-y-4">
      {/* 1. Top High-level KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total students */}
        <div 
          id="kpi-card-students-total"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Klassenstärke</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{kpis.totalStudents}</span>
            <span className="text-xs text-slate-500 font-medium">Kinder</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Klasse {activeClassName}
          </p>
        </div>

        {/* Tested Students */}
        <div 
          id="kpi-card-students-tested"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Erfasste Kinder</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{kpis.testedStudentsCount}</span>
            <span className="text-xs text-slate-500 font-medium">von {kpis.totalStudents}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {kpis.untestedStudentsCount > 0 
              ? `${kpis.untestedStudentsCount} Kinder bisher ohne neue Checks` 
              : 'Alle Kinder mindestens einmal erfasst'}
          </p>
        </div>

        {/* Total Test Runs */}
        <div 
          id="kpi-card-diagnostic-runs"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Durchführungen</span>
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{kpis.totalDiagnosticRuns}</span>
            <span className="text-xs text-slate-500 font-medium">1:1-Checks</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Gesamtzahl abgeschlossener Erhebungen
          </p>
        </div>

        {/* Distinct Competencies Checked */}
        <div 
          id="kpi-card-competencies-distinct"
          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Kompetenzen</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900">{kpis.distinctCompetenciesTested}</span>
            <span className="text-xs text-slate-500 font-medium">überprüft</span>
          </div>
          <p className="text-[11px] text-slate-500">
            in mindestens einem Check erfasst
          </p>
        </div>
      </div>

      {/* 2. Domain Breakdown Cards (X von N) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Erfassungsstand nach Fach- & Entwicklungsbereich
          </h4>
          <span className="text-[11px] text-slate-500 font-medium">
            Pro Kind zählt mindestens 1 Erhebung in der Domain
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {kpis.domainCoverage.map(item => {
            const icon = DOMAIN_ICONS[item.domain.id] || <Layers className="w-4 h-4" />;
            const accentBg = DOMAIN_ACCENT_BG[item.domain.id] || 'bg-slate-50 border-slate-200 text-slate-800';
            const ratioPercent = item.totalCount > 0 ? (item.testedCount / item.totalCount) * 100 : 0;

            return (
              <div
                key={item.domain.id}
                id={`domain-card-${item.domain.id}`}
                className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${accentBg}`}>
                      {icon}
                    </div>
                    <span className="text-xs font-bold text-slate-900">
                      {item.domain.name}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-bold text-slate-900">
                      {item.testedCount} von {item.totalCount}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {item.testedCompetenciesCount} von {item.totalCompetenciesCount} Komp.
                    </span>
                  </div>

                  {/* Compact mini progress indicator */}
                  <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-full transition-all duration-300"
                      style={{ width: `${ratioPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default ClassOverviewKPIs;
