import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileCheck,
  HeartHandshake,
  Info,
  Layers,
  MessageSquare,
  Sparkles,
  Target
} from 'lucide-react';
import DossierErlaeuterungsmatrix from './DossierErlaeuterungsmatrix';

interface DossierGespraecheBeurteilungenProps {
  student: Student;
  semester?: '1' | '2';
  onSemesterChange?: (semester: '1' | '2') => void;
}

export default function DossierGespraecheBeurteilungen({
  student,
  semester = '2',
  onSemesterChange
}: DossierGespraecheBeurteilungenProps) {
  const { app } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'kel_leitfaden'>('matrix');

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header with Subtab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-blue-600" />
            <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
              Gespräche & Beurteilungen
            </h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
            Erläuterungsmatrix (Oberau-Skala) und Vorbereitungshilfen für Entwicklungs- und KEL-Gespräche.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('matrix')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'matrix'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Award size={13} className={activeSubTab === 'matrix' ? 'text-blue-600' : 'text-slate-400'} />
            <span>Erläuterungsmatrix (Oberau)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('kel_leitfaden')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'kel_leitfaden'
                ? 'bg-white text-slate-900 shadow-3xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <HeartHandshake size={13} className={activeSubTab === 'kel_leitfaden' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Gesprächsvorbereitung</span>
          </button>
        </div>
      </div>

      {/* 1. SUBTAB: ERLÄUTERUNGSMATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="space-y-4">
          <DossierErlaeuterungsmatrix
            student={student}
            controlledSemester={semester}
            onSemesterChange={onSemesterChange}
          />
        </div>
      )}

      {/* 2. SUBTAB: GESPRÄCHSVORBEREITUNG */}
      {activeSubTab === 'kel_leitfaden' && (
        <div className="space-y-5">
          {/* Intro Card */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white text-indigo-700 shadow-3xs shrink-0">
                <HeartHandshake size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black text-indigo-950">
                  Leitfaden für das Entwicklungs- & KEL-Gespräch
                </h4>
                <p className="mt-1 text-xs text-indigo-900 font-medium leading-relaxed">
                  Strukturierte Vorbereitungshilfe für das Dreiecksgespräch zwischen Kind, Eltern und Lehrperson.
                  Die tatsächliche Durchführung und Protokollierung wird unter „Entwicklung & Diagnostik → Beobachtung & Verlauf“ geführt.
                </p>
              </div>
            </div>
          </div>

          {/* Phasen des KEL-Gesprächs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Phase 1</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[0.625rem] font-bold">5–10 Min.</span>
                </div>
                <h5 className="mt-2 text-sm font-bold text-slate-900">Das Kind berichtet (Präsentation)</h5>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  {student.vorname} zeigt eigene Lieblingsarbeiten, Stärken und Momente, auf die es besonders stolz ist.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.6875rem] text-slate-500">
                Fokus: Selbstwirksamkeit stärken
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Phase 2</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[0.625rem] font-bold">10–15 Min.</span>
                </div>
                <h5 className="mt-2 text-sm font-bold text-slate-900">Gemeinsame Einordnung</h5>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  Rückmeldung der Lehrkraft anhand von Arbeitsergebnissen und Beobachtungen. Eltern bringen ihre Perspektive ein.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.6875rem] text-slate-500">
                Fokus: Wertschätzende Transparenz
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Phase 3</span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[0.625rem] font-bold">5–10 Min.</span>
                </div>
                <h5 className="mt-2 text-sm font-bold text-slate-900">Konkrete Zielvereinbarung</h5>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed font-medium">
                  1–2 machbare nächste Schritte vereinbaren, an denen {student.vorname} in den nächsten Wochen arbeitet.
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.6875rem] text-slate-500">
                Fokus: Verbindlich & erreichbar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span>Beurteilungsgrundlagen nach Lehrplan 2023 & Schulunterrichtsgesetz</span>
        <span>Semester: {semester}. Semester</span>
      </div>
    </div>
  );
}
