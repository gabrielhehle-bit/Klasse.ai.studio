import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Sparkles,
  FileText,
  Target,
  CheckCircle2,
  Printer,
  Compass,
  ArrowRight,
  Layers,
  Heart
} from 'lucide-react';
import WorksheetGenerator from '../WorksheetGenerator';

interface DossierMaterialienProps {
  student: Student;
}

export default function DossierMaterialien({ student }: DossierMaterialienProps) {
  const { app } = useApp();
  const [showGenerator, setShowGenerator] = useState(false);

  // Focus areas from student's support profile
  const supportGoals = (student.foerderprofil?.foerderziele || [])
    .filter(g => g.status === 'offen' || g.status === 'in Arbeit');
  const studentStrengths = (student.foerderprofil?.staerken || []).filter(Boolean);

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-amber-500" />
            <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
              Materialien & Arbeitsblätter
            </h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
            Passgenaue Übungen, Differenzierungsblätter und Fördermaterial für {student.vorname}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowGenerator(!showGenerator)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition cursor-pointer shadow-3xs ${
            showGenerator
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Sparkles size={14} />
          <span>{showGenerator ? 'Fokus-Übersicht anzeigen' : 'Arbeitsblatt-Generator öffnen'}</span>
        </button>
      </div>

      {/* 1. RUHIGE STARTANSICHT: PÄDAGOGISCHE FOKUSKARTE & EMPFEHLUNG */}
      {!showGenerator ? (
        <div className="space-y-5">
          {/* Main Action Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-3xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-700 shrink-0">
                  <BookOpen size={26} />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    Individuelles Fördermaterial generieren
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed max-w-xl">
                    Erstelle differenzierte Arbeitsblätter, Leseübungen oder Rechentrainings, die auf das Niveau
                    und die Förderziele von {student.vorname} abgestimmt sind.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGenerator(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white hover:bg-slate-800 transition cursor-pointer shadow-3xs shrink-0"
              >
                <span>Generator starten</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Basisdaten für die Differenzierung */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aktive Förderziele */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-600 pb-2.5 border-b border-slate-100">
                  <Target size={15} className="text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Aktuelle Förderziele ({supportGoals.length})
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {supportGoals.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">
                      Keine offenen Förderziele erfasst. Das Material kann am allgemeinen Klassenlehrplan ausgerichtet werden.
                    </p>
                  ) : (
                    supportGoals.slice(0, 3).map(goal => (
                      <div key={goal.id} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                        <CheckCircle2 size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                        <span>{goal.ziel}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.6875rem] text-slate-400">
                Wird automatisch für gezielte Übungsaufgaben herangezogen
              </div>
            </div>

            {/* Stärken & Ressourcen */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-600 pb-2.5 border-b border-slate-100">
                  <Heart size={15} className="text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Dokumentierte Stärken
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {studentStrengths.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium italic">
                      Keine gesonderten Stärken im Förderprofil hinterlegt.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {studentStrengths.slice(0, 6).map((str, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[0.6875rem] font-bold"
                        >
                          {str}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-[0.6875rem] text-slate-400">
                Zur motivationalen Einstiegsgestaltung bei Aufgaben
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* 2. EINGEBETTETER ARBEITSBLATT-GENERATOR */
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs animate-in fade-in duration-300">
          <WorksheetGenerator initialStudentId={student.id} embeddedMode={true} />
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span>Unterrichtsmaterialien nach österreichischem Lehrplan VS 2023</span>
        <span>Schulstufe: {app.stufe || 1}. Klasse</span>
      </div>
    </div>
  );
}
