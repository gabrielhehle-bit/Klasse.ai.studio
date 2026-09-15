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
    <div className="max-w-[1180px] mx-auto py-5 px-3 sm:px-6 lg:px-8">
      {/* Header Bereich - Ruhig und fokussiert */}
      <div className="mb-8 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[var(--border-subtle,var(--border))] pb-5">
          <div>
            <h1 className="text-2xl sm:text-[1.75rem] font-black text-[var(--text-primary,var(--text))] tracking-[-0.025em]">
              Diagnostik & Lernstand
            </h1>
            <p className="text-sm text-[var(--text-secondary,var(--text2))] mt-1 font-medium">
              Was möchtest du gerade herausfinden?
            </p>
          </div>
          {activeClassName && (
            <div className="self-start sm:self-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-secondary,var(--text2))] border border-[var(--border-subtle,var(--border))]">
                Klasse: {activeClassName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pädagogischer Ablauf */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-2" aria-label="Diagnostischer Ablauf">
        {[
          ['1', 'Erkennen', 'Beobachten oder gezielt prüfen'],
          ['2', 'Verstehen', 'Ergebnisse im Verlauf einordnen'],
          ['3', 'Fördern', 'Nächste pädagogische Schritte ableiten'],
        ].map(([step, title, description]) => (
          <div key={step} className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle,var(--border))] bg-[var(--surface-subtle,var(--surface2))]/65 px-3.5 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border2))] text-[11px] font-bold text-[var(--accent)]">
              {step}
            </span>
            <div>
              <div className="text-xs font-bold text-[var(--text-primary,var(--text))]">{title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-[var(--text-muted,var(--text3))]">{description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Die 3 Hauptbereiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* 1. Einzelkind */}
        <motion.div
          className="group relative flex flex-col justify-between bg-[var(--surface-card,var(--surface))] rounded-2xl p-6 sm:p-7 border border-[var(--border-subtle,var(--border))] shadow-sm hover:border-[var(--accent)]/30 hover:bg-[var(--surface-subtle,var(--surface2))]/30 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
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
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] mb-5 transition-colors duration-150">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors mb-2">
              Einzelkind
            </h2>
            <p className="text-sm text-[var(--text-secondary,var(--text2))] leading-relaxed">
              Gezielt beobachten oder einen kurzen 1:1-Check durchführen.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border-subtle,var(--border))] flex items-center justify-between text-sm font-semibold text-[var(--accent)]">
            <span>Kind auswählen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 2. Klasse */}
        <motion.div
          className="group relative flex flex-col justify-between bg-[var(--surface-card,var(--surface))] rounded-2xl p-6 sm:p-7 border border-[var(--border-subtle,var(--border))] shadow-sm hover:border-[var(--accent)]/30 hover:bg-[var(--surface-subtle,var(--surface2))]/30 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
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
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] mb-5 transition-colors duration-150">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors mb-2">
              Klasse
            </h2>
            <p className="text-sm text-[var(--text-secondary,var(--text2))] leading-relaxed">
              Kurzes Screening oder Überblick über einen Lernbereich.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border-subtle,var(--border))] flex items-center justify-between text-sm font-semibold text-[var(--accent)]">
            <span>Bereich wählen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 3. Ergebnisse & Entwicklung */}
        <motion.div
          className="group relative flex flex-col justify-between bg-[var(--surface-card,var(--surface))] rounded-2xl p-6 sm:p-7 border border-[var(--border-subtle,var(--border))] shadow-sm hover:border-[var(--accent)]/30 hover:bg-[var(--surface-subtle,var(--surface2))]/30 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
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
            <div className="w-14 h-14 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/15 flex items-center justify-center text-[var(--accent)] mb-5 transition-colors duration-150">
              <LineChart className="w-7 h-7" />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-bold tracking-[-0.01em] text-[var(--text-primary,var(--text))] group-hover:text-[var(--accent)] transition-colors">
                Verstehen & Fördern
              </h2>
              {resultsCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent)]">
                  {resultsCount}
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--text-secondary,var(--text2))] leading-relaxed">
              Ergebnisse einordnen, Lernverläufe verstehen und nächste Schritte ableiten.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border-subtle,var(--border))] flex items-center justify-between text-sm font-semibold text-[var(--accent)]">
            <span>Ergebnisse einordnen</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Unauffälliger sekundärer Link zur bisherigen Diagnostik (Übergang) */}
      <div className="mt-12 pt-5 border-t border-[var(--border-subtle,var(--border))] flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--text-muted,var(--text3))] text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[var(--text-muted,var(--text3))]" />
          <span>Bisherige Verfahren bleiben für ältere Einträge erreichbar.</span>
        </div>

        <button
          id="btn-open-legacy-diagnostik"
          onClick={onOpenLegacy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[var(--text-secondary,var(--text2))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-subtle,var(--surface2))] font-medium transition-colors cursor-pointer border border-transparent hover:border-[var(--border-default,var(--border2))]"
          title="Historische Diagnostik und bisherige Verfahren öffnen"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Archiv & bisherige Diagnostik</span>
        </button>
      </div>
    </div>
  );
};
