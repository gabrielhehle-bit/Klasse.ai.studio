import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Sparkles,
  Users,
  Printer,
  FileDown,
  Info,
  ChevronRight,
  Bot,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Target,
  CheckCircle2,
  Stethoscope,
  Activity
} from 'lucide-react';
import DossierKIPortfolio from './DossierKIPortfolio';
import DossierElternReport from './DossierElternReport';
import { exportSchuelerPDF } from '../../lib/exportService';

interface DossierBerichteProps {
  student: Student;
  initialSubView?: 'ki_summary' | 'eltern_report' | 'export';
  semester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
  onStartPresentation?: () => void;
}

export default function DossierBerichte({
  student,
  initialSubView = 'ki_summary',
  semester = '2',
  onSemesterChange,
  onStartPresentation
}: DossierBerichteProps) {
  const { app } = useApp();
  const [activeSubView, setActiveSubView] = useState<'ki_summary' | 'eltern_report' | 'export'>(
    initialSubView
  );

  // Sync when initialSubView changes
  React.useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [initialSubView]);

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Area Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-violet-600" />
            <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
              Berichte
            </h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
            Pädagogische Gesamtschau, elternverständliches Gesprächsblatt und Druckexporte.
          </p>
        </div>

        {/* Subview Selector */}
        <div className="flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => setActiveSubView('ki_summary')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'ki_summary'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Sparkles size={13} className={activeSubView === 'ki_summary' ? 'text-violet-600' : 'text-slate-400'} />
            <span>KI-Zusammenfassung</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('eltern_report')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'eltern_report'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Users size={13} className={activeSubView === 'eltern_report' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Eltern-Report</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubView('export')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSubView === 'export'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Printer size={13} className={activeSubView === 'export' ? 'text-slate-800' : 'text-slate-400'} />
            <span>Druck & Export</span>
          </button>
        </div>
      </div>

      {/* 1. SUBVIEW: KI-ZUSAMMENFASSUNG / PORTFOLIO */}
      {activeSubView === 'ki_summary' && (
        <div className="space-y-4">
          <DossierKIPortfolio student={student} />
        </div>
      )}

      {/* 2. SUBVIEW: ELTERN-REPORT */}
      {activeSubView === 'eltern_report' && (
        <div className="space-y-4">
          <DossierElternReport
            student={student}
            semester={semester}
            onSemesterChange={onSemesterChange}
            onStartPresentation={onStartPresentation}
          />
        </div>
      )}

      {/* 3. SUBVIEW: DRUCK & EXPORT */}
      {activeSubView === 'export' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-3xs">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
                <FileText size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900">
                  Vollständiges Schülerdossier drucken
                </h4>
                <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                  Erstellt eine druckfertige Gesamtausgabe für {student.vorname} {student.nachname} mit Stammdaten,
                  aktuellem Leistungsstand, Förderzielen, Diagnostik-Ergebnissen und pädagogischen Aufzeichnungen.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => exportSchuelerPDF(student.id, app)}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-3xs"
                  >
                    <Printer size={15} />
                    <span>Dossier als PDF ausgeben / drucken</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <FileDown size={15} />
                    <span>Aktuelle Ansicht drucken</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-3xs space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Enthaltene Bestandteile beim Gesamtexport
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Schülerstammdaten & Kontaktdaten</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Leistungsstand & Notenübersicht</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Diagnostische Erhebungen & MIKA-D</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Förderziele & pädagogische Maßnahmen</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span>Berichte und Gesprächshilfen für schulische Zwecke</span>
        <span>Schuljahr: {app.schuljahr || '2025/2026'}</span>
      </div>
    </div>
  );
}
