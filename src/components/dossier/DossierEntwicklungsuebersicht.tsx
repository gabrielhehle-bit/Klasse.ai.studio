import React, { useMemo } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Compass,
  CheckCircle2,
  Eye,
  Heart,
  Clock,
  ArrowRight,
  BookOpen,
  Calculator,
  Brain,
  Users,
  Calendar,
  Sparkles,
  Layers,
  ChevronRight,
  FileText,
  Activity,
  Plus
} from 'lucide-react';
import {
  getStudentStrengthsAndObservations,
  getStudentFocusAreas,
  getStudentRecentDiagnostics,
  getDiagnosticDomain,
  getCompetencyStatusConfig,
  formatGermanDate,
  getDiagnosticScreeningById
} from '../../lib/diagnosticCoreUtils';
import { DIAGNOSTIC_COMPETENCIES } from '../../data/diagnosticCompetencies';
import { getDiagnosticTestById } from '../../data/diagnosticTests/index';
import { getDiagnosticTestName } from '../../lib/diagnosticData';
import { DossierTab } from '../StudentDossier';

interface DossierEntwicklungsuebersichtProps {
  student: Student;
  onTabChange: (tab: DossierTab, subSection?: string) => void;
  onStart1to1Check?: (studentId: string, competencyId?: string, gradeLevel?: number) => void;
}

export const DossierEntwicklungsuebersicht: React.FC<DossierEntwicklungsuebersichtProps> = ({
  student,
  onTabChange,
  onStart1to1Check
}) => {
  const { app, updateApp, setPage } = useApp();

  const allDiagnosticResults = app.diagnosticResults || [];
  const studentResults = useMemo(() => {
    return allDiagnosticResults.filter(r => r.studentId === student.id);
  }, [allDiagnosticResults, student.id]);

  // 1. Gesicherte Bereiche (Max 3-5 real items)
  const gesicherteBereiche = useMemo(() => {
    const list: { title: string; subtitle?: string; source: string; date?: string }[] = [];

    // A. From new diagnostic core results (secure status)
    studentResults.forEach(res => {
      (res.competencyResults || []).forEach(cr => {
        if (cr.status === 'secure' && list.length < 5) {
          const compDef = DIAGNOSTIC_COMPETENCIES.find(c => c.id === cr.competencyId);
          const compName = compDef?.name || cr.competencyId;
          if (!list.some(item => item.title === compName)) {
            list.push({
              title: compName,
              subtitle: cr.note || 'In standardisierter Erhebung gesichert erfasst',
              source: 'Diagnostik',
              date: res.date
            });
          }
        }
      });
    });

    // B. From foerderprofil.staerken
    const profileStrengths = student.foerderprofil?.staerken || [];
    profileStrengths.forEach(st => {
      if (list.length < 5 && !list.some(item => item.title.toLowerCase() === st.toLowerCase())) {
        list.push({
          title: st,
          subtitle: 'Im Förderprofil als Ressource dokumentiert',
          source: 'Förderprofil'
        });
      }
    });

    // C. From Lehrplan-Lernziele (if student has attained goals)
    const ratings = app.studentLernzielBewertungen?.[student.id] || {};
    Object.entries(ratings).forEach(([lzId, val]) => {
      if (val !== null && val >= 3 && list.length < 5) {
        list.push({
          title: `Lehrplanziel ${lzId}`,
          subtitle: 'Erreichte Teilkompetenz im Lehrplan',
          source: 'Lernziele'
        });
      }
    });

    return list.slice(0, 5);
  }, [studentResults, student.foerderprofil?.staerken, app.studentLernzielBewertungen, student.id]);

  // 2. Bereiche in Entwicklung (Max 3-5 constructive items, NO deficit terms)
  const bereicheInEntwicklung = useMemo(() => {
    const list: { title: string; hint: string; source: string; competencyId?: string; gradeLevel?: number }[] = [];

    // A. From diagnostic results (partlySecure or needsObservation)
    const focusAreas = getStudentFocusAreas(allDiagnosticResults, student.id);
    focusAreas.forEach(fa => {
      if (list.length < 5) {
        // Constructive phrasing
        const hint = fa.nextStep && fa.nextStep.trim().length > 0
          ? fa.nextStep
          : `Entwicklung im Bereich ${fa.competency.name} weiter festigen und begleiten`;

        list.push({
          title: fa.competency.name,
          hint,
          source: 'Diagnostik',
          competencyId: fa.competency.id,
          gradeLevel: fa.gradeLevel
        });
      }
    });

    // B. From open Förderziele
    const openGoals = (student.foerderprofil?.foerderziele || []).filter(
      (z: any) => z.status === 'offen' || z.status === 'in_arbeit'
    );
    openGoals.forEach((z: any) => {
      if (list.length < 5 && !list.some(item => item.title.toLowerCase() === z.ziel.toLowerCase())) {
        list.push({
          title: z.ziel,
          hint: z.bereich ? `Pädagogisches Ziel im Bereich ${z.bereich}` : 'Laufendes Förderziel',
          source: 'Förderung'
        });
      }
    });

    // C. From legacy diagnostic alerts (constructive label)
    const studentAlerts = (app.diagnostikErhebungen || []).filter(
      (e: any) => e.schuelerId === student.id && (e.status === 'alert' || e.auffaellig)
    );
    studentAlerts.forEach((al: any) => {
      const testName = getDiagnosticTestName(al.testId, app.diagnostikTests || []);
      if (list.length < 5 && !list.some(item => item.title === testName)) {
        list.push({
          title: testName,
          hint: al.kommentar || 'Ergebnis im nächsten Unterrichtsschritt aufgreifen',
          source: 'Erhebung'
        });
      }
    });

    return list.slice(0, 5);
  }, [allDiagnosticResults, student.id, student.foerderprofil?.foerderziele, app.diagnostikErhebungen, app.diagnostikTests]);

  // 3. Aktive Förderung Summary
  const foerderprofil = student.foerderprofil || {};
  const activeGoals = useMemo(() => {
    return (foerderprofil.foerderziele || []).filter(
      (z: any) => z.status === 'offen' || z.status === 'in_arbeit'
    );
  }, [foerderprofil.foerderziele]);

  const activeMeasures = useMemo(() => {
    return (foerderprofil.massnahmen || []).filter((m: any) => !m.abgeschlossen);
  }, [foerderprofil.massnahmen]);

  const nextGoalWithDate = useMemo(() => {
    const goalsWithDate = activeGoals
      .filter((g: any) => g.zielDatum)
      .sort((a: any, b: any) => new Date(a.zielDatum).getTime() - new Date(b.zielDatum).getTime());
    return goalsWithDate[0] || null;
  }, [activeGoals]);

  // 4. Letzte diagnostische Aktivitäten (Max 3 items, strictly non-admin)
  const letzteAktivitaeten = useMemo(() => {
    const items: {
      id: string;
      title: string;
      subtitle: string;
      date: string;
      rawDate: string;
      type: 'check' | 'observation' | 'goal' | 'kel';
      icon: React.ComponentType<{ size: number; className?: string }>;
    }[] = [];

    // A. Diagnostics checks
    studentResults.forEach(r => {
      const testDef = getDiagnosticTestById(r.testId) || getDiagnosticScreeningById(r.testId);
      items.push({
        id: `res-${r.id}`,
        title: testDef?.title || r.testId,
        subtitle: r.mode === 'screening' ? 'Klassenscreening durchgeführt' : '1:1-Kompetenzcheck erfasst',
        date: formatGermanDate(r.date),
        rawDate: r.date,
        type: 'check',
        icon: Compass
      });
    });

    // B. Legacy checks if any
    (app.diagnostikErhebungen || [])
      .filter((e: any) => e.schuelerId === student.id)
      .forEach((e: any) => {
        items.push({
          id: `leg-${e.id}`,
          title: getDiagnosticTestName(e.testId, app.diagnostikTests || []),
          subtitle: `Erhebungswert: ${e.ergebniswert || 'dokumentiert'}`,
          date: e.datum ? formatGermanDate(e.datum) : 'Kürzlich',
          rawDate: e.datum || '',
          type: 'check',
          icon: Activity
        });
      });

    // C. KEL Entries / Meetings
    const kelReflections = (app.kelGespraeche || []).filter((k: any) => k.schuelerId === student.id);
    kelReflections.forEach((k: any, idx: number) => {
      items.push({
        id: `kel-${idx}`,
        title: k.thema || 'KEL-Entwicklungsgespräch',
        subtitle: k.vereinbarung ? `Vereinbarung: „${k.vereinbarung}“` : 'Reflexionsbogen dokumentiert',
        date: k.datum ? formatGermanDate(k.datum) : 'Dokumentiert',
        rawDate: k.datum || '',
        type: 'kel',
        icon: Users
      });
    });

    // D. Goals updated recently
    (foerderprofil.foerderziele || []).forEach((g: any) => {
      if (g.startDatum) {
        items.push({
          id: `goal-${g.id}`,
          title: `Förderziel: ${g.ziel}`,
          subtitle: `Bereich ${g.bereich || 'Allgemein'} · Status: ${g.status === 'in_arbeit' ? 'In Arbeit' : 'Aktiv'}`,
          date: formatGermanDate(g.startDatum),
          rawDate: g.startDatum,
          type: 'goal',
          icon: Heart
        });
      }
    });

    // E. Journal Observation
    (app.notes || [])
      .filter((n: any) => n.schuelerId === student.id)
      .slice(0, 3)
      .forEach((n: any) => {
        items.push({
          id: `note-${n.id}`,
          title: n.kategorie ? `Beobachtung: ${n.kategorie}` : 'Pädagogische Notiz',
          subtitle: n.inhalt.length > 70 ? n.inhalt.substring(0, 70) + '…' : n.inhalt,
          date: n.datum ? formatGermanDate(n.datum) : 'Kürzlich',
          rawDate: n.datum || '',
          type: 'observation',
          icon: FileText
        });
      });

    // Sort descending and take max 3
    return items
      .sort((a, b) => (b.rawDate || '').localeCompare(a.rawDate || ''))
      .slice(0, 3);
  }, [studentResults, app.diagnostikErhebungen, app.diagnostikTests, app.kelGespraeche, foerderprofil.foerderziele, app.notes, student.id]);

  // Overall status summary counters for the top status cards
  const domainSummary = useMemo(() => {
    const testedDomainIds = new Set<string>();
    studentResults.forEach(r => {
      const testDef = getDiagnosticTestById(r.testId) || getDiagnosticScreeningById(r.testId);
      if (testDef?.domainId) {
        testedDomainIds.add(testDef.domainId);
      }
    });
    return {
      testedDomainsCount: testedDomainIds.size,
      totalChecks: studentResults.length + (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === student.id).length
    };
  }, [studentResults, app.diagnostikErhebungen, student.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* 1. Pädagogische Leitlinie: Beobachten → Überprüfen → Einordnen → Fördern → Entwicklung verfolgen */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">
              Entwicklung & Diagnostik · Gesamtüberblick
            </span>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
              Pädagogischer Entwicklungsstand für {student.vorname} {student.nachname}
            </h3>
            <p className="text-xs text-slate-300 font-medium">
              Ganzheitliche Zusammenschau aus Lernstand, Beobachtung, Förderung und KEL-Verlauf.
            </p>
          </div>

          {/* Pädagogischer Ablaufpfad */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/15 text-[11px] font-bold text-slate-200">
            <span className="text-indigo-300">Beobachten</span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-indigo-300">Überprüfen</span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-indigo-300">Einordnen</span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-indigo-300">Fördern</span>
            <ChevronRight size={12} className="text-slate-400" />
            <span className="text-emerald-300">Verfolgen</span>
          </div>
        </div>
      </div>

      {/* 2. Kompakter Entwicklungsstand (Status-Kacheln ohne künstliche Noten/Ampeln) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Diagnostik Stand */}
        <div 
          onClick={() => onTabChange('diagnostik')}
          className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-3xs hover:border-indigo-300 hover:shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Compass size={16} />
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </div>
          <div className="text-xs font-black text-slate-900">Diagnostische Checks</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {domainSummary.totalChecks > 0 ? (
              <span>{domainSummary.totalChecks} Erhebungen in {domainSummary.testedDomainsCount} Fachbereichen</span>
            ) : (
              <span>Noch keine Checks erfasst</span>
            )}
          </div>
        </div>

        {/* Aktive Förderziele */}
        <div 
          onClick={() => onTabChange('foerderung')}
          className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-3xs hover:border-emerald-300 hover:shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Heart size={16} />
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-xs font-black text-slate-900">Aktive Förderung</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {activeGoals.length > 0 ? (
              <span>{activeGoals.length} Förderziel{activeGoals.length > 1 ? 'e' : ''} · {activeMeasures.length} Maßnahme{activeMeasures.length > 1 ? 'n' : ''}</span>
            ) : (
              <span>Keine offenen Förderziele</span>
            )}
          </div>
        </div>

        {/* Beobachtungen & Journal */}
        <div 
          onClick={() => onTabChange('beobachtungen_verlauf')}
          className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-3xs hover:border-sky-300 hover:shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <FileText size={16} />
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="text-xs font-black text-slate-900">Pädagogische Notizen</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {(app.notes || []).filter((n: any) => n.schuelerId === student.id).length} Einträge im Journal
          </div>
        </div>

        {/* KEL Entwicklungsgespräch */}
        <div 
          onClick={() => onTabChange('beobachtungen_verlauf', 'kel')}
          className="p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/80 shadow-3xs hover:border-purple-300 hover:shadow-2xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Users size={16} />
            </div>
            <ArrowRight size={14} className="text-slate-300 group-hover:text-purple-600 transition-colors" />
          </div>
          <div className="text-xs font-black text-slate-900">KEL & Selbstreflexion</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {((app.kelGespraeche || []).filter((k: any) => k.schuelerId === student.id)).length > 0 ? (
              <span>{((app.kelGespraeche || []).filter((k: any) => k.schuelerId === student.id)).length} Gesprächseinträge</span>
            ) : (
              <span>Entwicklungsbogen öffnen</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Gesicherte Bereiche & Bereiche in Entwicklung (2 Spalten) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 3A. Gesicherte Bereiche */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Gesicherte Bereiche</h4>
                <p className="text-[10px] text-slate-500">
                  Stabile Kompetenzen und nachgewiesene Stärken
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              {gesicherteBereiche.length} erfasst
            </span>
          </div>

          {gesicherteBereiche.length > 0 ? (
            <div className="space-y-2">
              {gesicherteBereiche.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 sm:p-3 bg-emerald-50/40 border border-emerald-100/90 rounded-xl flex items-start gap-2.5 text-left"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 leading-snug">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                        {item.source}
                      </span>
                    </div>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-600 font-normal mt-0.5">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500">
                Noch keine gesicherten Kompetenzen dokumentiert
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Führen Sie gezielte Diagnostikchecks durch, um Stärken zu erfassen.
              </p>
            </div>
          )}
        </div>

        {/* 3B. Bereiche in Entwicklung */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Eye size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Bereiche in Entwicklung</h4>
                <p className="text-[10px] text-slate-500">
                  Konstruktive Entwicklungsfelder für die gezielte Unterstützung
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              {bereicheInEntwicklung.length} im Blick
            </span>
          </div>

          {bereicheInEntwicklung.length > 0 ? (
            <div className="space-y-2">
              {bereicheInEntwicklung.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 sm:p-3 bg-amber-50/30 border border-amber-200/70 rounded-xl flex items-start justify-between gap-2.5 text-left"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-900">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded">
                        {item.source}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-normal leading-relaxed">
                      {item.hint}
                    </p>
                  </div>

                  {item.competencyId && onStart1to1Check && (
                    <button
                      type="button"
                      onClick={() => onStart1to1Check(student.id, item.competencyId, item.gradeLevel)}
                      title="1:1-Check durchführen"
                      className="px-2 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold shrink-0 shadow-3xs cursor-pointer active:scale-95"
                    >
                      Check
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-500">
                Aktuell kein akuter Entwicklungsbedarf dokumentiert
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Alle erfassten Beobachtungen und Erhebungen zeigen einen stabilen Stand.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Aktive Förderung (Kompakte Zusammenfassung mit direktem Link) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Heart size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Aktive Förderung</h4>
              <p className="text-[10px] text-slate-500">
                Pädagogische Zielvereinbarungen und laufende Fördermaßnahmen
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('foerderung')}
            className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
          >
            <span>Zur Förderung wechseln</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {activeGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeGoals.map((ziel: any, zIdx: number) => {
              const linkedMeasures = activeMeasures.filter((m: any) => m.zielId === ziel.id);

              return (
                <div 
                  key={zIdx}
                  className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl space-y-2 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {ziel.ziel}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                      {ziel.bereich || 'Förderbereich'}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ziel.startDatum && (
                      <span>Start: {formatGermanDate(ziel.startDatum)}</span>
                    )}
                    {ziel.zielDatum && (
                      <span className="font-bold text-indigo-700">
                        Überprüfung: {formatGermanDate(ziel.zielDatum)}
                      </span>
                    )}
                    {linkedMeasures.length > 0 && (
                      <span className="text-slate-600">
                        · {linkedMeasures.length} {linkedMeasures.length === 1 ? 'Maßnahme' : 'Maßnahmen'} aktiv
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <p className="text-xs font-bold text-slate-600">
              Noch keine aktiven Förderziele für {student.vorname} festgelegt
            </p>
            <button
              type="button"
              onClick={() => onTabChange('foerderung')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
            >
              <Plus size={13} />
              <span>Förderziel anlegen</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. Letzte diagnostische Aktivität (Die letzten max 3 Aktivitäten) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Clock size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900">Letzte diagnostische Aktivitäten</h4>
              <p className="text-[10px] text-slate-500">
                Pädagogische Ereignisse, Checks und Zielvereinbarungen im zeitlichen Verlauf
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Maximal 3 aktuelle Einträge
          </span>
        </div>

        {letzteAktivitaeten.length > 0 ? (
          <div className="space-y-2">
            {letzteAktivitaeten.map((act) => {
              const ActIcon = act.icon;
              return (
                <div 
                  key={act.id}
                  className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-xl flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-indigo-600 flex items-center justify-center shrink-0 shadow-3xs">
                      <ActIcon size={14} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {act.title}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {act.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-600">
                      {act.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">
              Noch keine diagnostischen Aktivitäten verzeichnet
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
