import React, { useMemo } from 'react';
import { BarChart3, BookOpen, FileText, Target, TrendingUp } from 'lucide-react';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { useApp } from '../context/AppContext';
import AssessmentDomainDonuts from './dossier/AssessmentDomainDonuts';
import { getStudentAssessmentDomainPerformance } from '../lib/assessmentDomainPerformance';

export type KelSubjectChartType = 'donuts' | 'bars';

interface KELSubjectPageProps {
  studentId: string;
  fach: string;
  semester: '1' | '2';
  note?: string;
  showNote?: boolean;
  selectedAreas?: string[];
  chartType?: KelSubjectChartType;
  subjectLabel: string;
  evidenceCount: number;
}

/**
 * The exact same gradebook area calculation as the pupil dossier. No extra
 * score, fabricated learning area or class comparison is introduced.
 */
export default function KELSubjectPage({
  studentId, fach, semester, note, showNote = false, selectedAreas,
  chartType = 'donuts', subjectLabel, evidenceCount,
}: KELSubjectPageProps) {
  const { app } = useApp();
  const areas = useMemo(() => {
    const documented = getStudentAssessmentDomainPerformance(app, studentId, fach, semester);
    return selectedAreas
      ? documented.filter(row => selectedAreas.includes(row.area))
      : documented;
  }, [app, studentId, fach, semester, selectedAreas]);
  const hasNote = showNote && Boolean(note?.trim());
  const bars = areas.slice(0, 8).map(row => ({
    name: row.area, value: row.percent, count: row.assessments,
  }));
  return (
    <section data-kel-subject-page={fach} className="w-full space-y-4 text-left">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex items-center gap-2 text-indigo-700"><BookOpen size={16}/><span className="text-xs font-extrabold uppercase tracking-wider">Fachstand</span></div>
          <p className="mt-3 break-words text-xl font-black text-slate-950">{subjectLabel}</p>
          <p className="mt-1 text-xs text-slate-600">Notenmappe dieses Kindes · Semester {semester}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-600"><Target size={16}/><span className="text-xs font-extrabold uppercase tracking-wider">Lernbereiche</span></div>
          <p className="mt-3 text-2xl font-black text-slate-950">{areas.length}</p>
          <p className="mt-1 text-xs text-slate-600">mit ausgewerteten Nachweisen</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-slate-600"><TrendingUp size={16}/><span className="text-xs font-extrabold uppercase tracking-wider">Dokumentation</span></div>
          <p className="mt-3 text-2xl font-black text-slate-950">{evidenceCount}</p>
          <p className="mt-1 text-xs text-slate-600">erfasste Leistungsnachweise</p>
        </div>
      </div>
      {areas.length > 0 && chartType === 'donuts' && (
        <AssessmentDomainDonuts studentId={studentId} subject={fach} semester={semester}
          selectedAreas={selectedAreas} />
      )}
      {areas.length > 0 && chartType === 'bars' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4" data-kel-subject-bars>
          <div className="mb-3 flex items-center gap-2"><BarChart3 size={17} className="text-indigo-600"/><h3 className="text-base font-black text-slate-900">Dokumentierte Lernbereiche</h3></div>
          <p className="mb-3 text-xs text-slate-600">Rechnerischer Stand aus den zugeordneten Bewertungen, keine vollständige Kompetenzdiagnose.</p>
          <div style={{ height: Math.max(200, Math.min(430, bars.length * 53 + 50)) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={bars} margin={{ top: 8, right: 30, bottom: 8, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" domain={[0,100]} tickFormatter={value => `${value}%`} tick={{ fontSize: 11 }}/>
                <YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number, _name: string, props: any) =>
                  [`${Number(value).toLocaleString('de-AT', { maximumFractionDigits: 1 })}% · ${props.payload.count} Nachweise`, 'Bewertete Nachweise']} />
                <Bar dataKey="value" fill="#4f46e5" radius={[0,7,7,0]} maxBarSize={25} isAnimationActive={false}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {areas.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center" data-kel-subject-empty>
          <p className="text-sm font-bold text-slate-800">Für dieses Fach sind noch keine Lernbereiche mit auswertbaren Bewertungen dokumentiert.</p>
          <p className="mt-2 text-xs text-slate-600">Lernbereiche können in der Notenmappe zugeordnet werden. Hier werden keine Werte ergänzt oder geschätzt.</p>
        </div>
      )}
      {hasNote && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5" data-kel-subject-note>
          <div className="flex items-center gap-2 text-amber-800"><FileText size={17}/><h3 className="text-sm font-black">Das besprechen wir in {fach}</h3></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{note?.trim()}</p>
        </div>
      )}
      <p className="text-center text-xs font-medium text-slate-500">
        Fachwerte und Lernbereiche stammen aus demselben Schülerdossier. Keine Klassenvergleiche.
      </p>
    </section>
  );
}
