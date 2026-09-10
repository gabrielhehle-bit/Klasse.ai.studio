import React from 'react';
import { User, Users, LineChart, ArrowRight, SlidersHorizontal, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface DiagnosticHomeProps {
  onSelectMode: (mode: 'individual' | 'class' | 'results') => void;
  onOpenLegacy: () => void;
  resultsCount?: number;
  studentsCount?: number;
  activeClassName?: string;
}

export const DiagnosticHome: React.FC<DiagnosticHomeProps> = ({
  onSelectMode,
  onOpenLegacy,
  resultsCount = 0,
  studentsCount = 0,
  activeClassName,
}) => {
  return (
    <div className="max-w-5xl mx-auto py-4 px-2 sm:px-4">
      {/* Header Bereich - Ruhig und fokussiert */}
      <div className="mb-10 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-200/80 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Diagnostik & Lernstand
            </h1>
            <p className="text-base text-slate-500 mt-1 font-normal">
              Was möchtest du gerade herausfinden?
            </p>
          </div>
          {activeClassName && (
            <div className="self-start sm:self-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Klasse: {activeClassName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Die 3 Hauptbereiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* 1. Einzelkind */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer"
          onClick={() => onSelectMode('individual')}
          id="card-diagnostic-individual"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMode('individual');
            }
          }}
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-200">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-2">
              Einzelkind
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Gezielt beobachten oder einen kurzen 1:1-Check durchführen.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-indigo-600 group-hover:text-indigo-700">
            <span>Kind auswählen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 2. Klasse */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-200 cursor-pointer"
          onClick={() => onSelectMode('class')}
          id="card-diagnostic-class"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMode('class');
            }
          }}
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-5 group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors mb-2">
              Klasse
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Kurzes Screening oder Überblick über einen Lernbereich.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
            <span>Bereich wählen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 3. Ergebnisse & Entwicklung */}
        <motion.div
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          className="group relative flex flex-col justify-between bg-white rounded-2xl p-6 sm:p-7 border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 cursor-pointer"
          onClick={() => onSelectMode('results')}
          id="card-diagnostic-results"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMode('results');
            }
          }}
        >
          <div>
            <div className="w-14 h-14 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-5 group-hover:scale-105 group-hover:bg-amber-600 group-hover:text-white transition-all duration-200">
              <LineChart className="w-7 h-7" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Ergebnisse & Entwicklung
              </h2>
              {resultsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  {resultsCount}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Beobachtungen, Lernstände und Verläufe ansehen.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-semibold text-amber-600 group-hover:text-amber-700">
            <span>Lernstände ansehen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Unauffälliger sekundärer Link zur bisherigen Diagnostik (Übergang) */}
      <div className="mt-16 pt-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-400" />
          <span>Neues Diagnostiksystem • Schritt 2</span>
        </div>

        <button
          id="btn-open-legacy-diagnostik"
          onClick={onOpenLegacy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium transition-colors cursor-pointer border border-transparent hover:border-slate-200"
          title="Zur alten Diagnostik-Toolsammlung wechseln"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Bisherige Diagnostik öffnen</span>
        </button>
      </div>
    </div>
  );
};
