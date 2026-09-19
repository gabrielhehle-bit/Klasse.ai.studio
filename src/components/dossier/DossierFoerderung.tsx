import React, { useState, useMemo } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Heart,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Edit2,
  Check,
  X,
  Stethoscope,
  Lightbulb,
  FileText,
  HelpCircle,
  AlertCircle
} from 'lucide-react';
import { getDiagnosticTestName } from '../../lib/diagnosticData';
import { formatGermanDate, getDiagnosticScreeningById } from '../../lib/diagnosticCoreUtils';
import { getDiagnosticTestById } from '../../data/diagnosticTests/index';
import { DossierTab } from '../StudentDossier';

interface DossierFoerderungProps {
  student: Student;
  onNavigateToDiagnostics?: () => void;
  onTabChange?: (tab: DossierTab) => void;
  initialAddGoal?: boolean;
  onQuickEntryConsumed?: () => void;
}

const BEREICHE = [
  'Lesen',
  'Schreiben',
  'Rechnen',
  'Lernvoraussetzungen',
  'Konzentration & Aufmerksamkeit',
  'Arbeitsgedächtnis',
  'Sozialverhalten',
  'Motorik',
  'Sprache & Wortschatz'
];

export const DossierFoerderung: React.FC<DossierFoerderungProps> = ({
  student,
  onNavigateToDiagnostics,
  onTabChange,
  initialAddGoal,
  onQuickEntryConsumed
}) => {
  const { app, setApp } = useApp();

  const profil = student.foerderprofil || {};
  const allGoals = profil.foerderziele || [];
  const allMeasures = profil.massnahmen || [];
  const staerken = profil.staerken || [];

  // Active vs completed goals
  const activeGoals = useMemo(() => {
    return allGoals.filter((g: any) => g.status === 'offen' || g.status === 'in_arbeit');
  }, [allGoals]);

  const completedGoals = useMemo(() => {
    return allGoals.filter((g: any) => g.status === 'erreicht' || g.status === 'abgebrochen');
  }, [allGoals]);

  // Collapsible state for completed goals
  const [showCompletedGoals, setShowCompletedGoals] = useState(false);

  // New goal state
  const [isAddingGoal, setIsAddingGoal] = useState(Boolean(initialAddGoal));
  React.useEffect(() => { if (initialAddGoal) onQuickEntryConsumed?.(); }, []);
  const [newGoalText, setNewGoalText] = useState('');
  const [newGoalArea, setNewGoalArea] = useState(BEREICHE[0]);
  const [newGoalStartDate, setNewGoalStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  const [newGoalDiagId, setNewGoalDiagId] = useState('');

  // New measure state
  const [isAddingMeasure, setIsAddingMeasure] = useState(false);
  const [newMeasureName, setNewMeasureName] = useState('');
  const [newMeasureDesc, setNewMeasureDesc] = useState('');
  const [newMeasureGoalId, setNewMeasureGoalId] = useState('');
  const [newMeasureDate, setNewMeasureDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMeasureReviewDate, setNewMeasureReviewDate] = useState('');

  // Strengths state
  const [newStrength, setNewStrength] = useState('');

  // Profil Updater helper
  const updateProfil = (changes: any) => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? {
        ...s,
        foerderprofil: {
          ...s.foerderprofil,
          ...changes,
          letzteAktualisierung: new Date().toISOString()
        }
      } : s)
    }));
  };

  // Add goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const freshGoal = {
      id: `ziel-${Date.now()}`,
      ziel: newGoalText.trim(),
      bereich: newGoalArea,
      startDatum: newGoalStartDate,
      zielDatum: newGoalTargetDate || undefined,
      status: 'offen' as const,
      diagnostikErhebungId: newGoalDiagId || undefined,
    };

    updateProfil({
      foerderziele: [...allGoals, freshGoal]
    });

    setNewGoalText('');
    setNewGoalTargetDate('');
    setNewGoalDiagId('');
    setIsAddingGoal(false);
  };

  // Toggle goal status
  const handleToggleGoalStatus = (goalId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'erreicht' ? 'in_arbeit' : 'erreicht';
    const updatedGoals = allGoals.map((g: any) => {
      if (g.id === goalId) {
        return {
          ...g,
          status: nextStatus,
          abgeschlossenAm: nextStatus === 'erreicht' ? new Date().toISOString().split('T')[0] : undefined
        };
      }
      return g;
    });
    updateProfil({ foerderziele: updatedGoals });
  };

  // Delete goal
  const handleDeleteGoal = (goalId: string) => {
    if (confirm('Möchten Sie dieses Förderziel wirklich entfernen?')) {
      updateProfil({
        foerderziele: allGoals.filter((g: any) => g.id !== goalId),
        massnahmen: allMeasures.filter((m: any) => m.zielId !== goalId)
      });
    }
  };

  // Add measure
  const handleAddMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeasureName.trim()) return;

    const freshMeasure = {
      id: `msn-${Date.now()}`,
      bezeichnung: newMeasureName.trim(),
      beschreibung: newMeasureDesc.trim(),
      datum: newMeasureDate,
      kontrollDatum: newMeasureReviewDate || undefined,
      zielId: newMeasureGoalId || undefined,
      wirksamkeit: 'unklar' as const,
      abgeschlossen: false
    };

    updateProfil({
      massnahmen: [...allMeasures, freshMeasure]
    });

    setNewMeasureName('');
    setNewMeasureDesc('');
    setNewMeasureGoalId('');
    setNewMeasureReviewDate('');
    setIsAddingMeasure(false);
  };

  // Update measure effectiveness
  const handleUpdateMeasureEffectiveness = (measureId: string, wirksamkeit: any) => {
    const updated = allMeasures.map((m: any) => m.id === measureId ? { ...m, wirksamkeit } : m);
    updateProfil({ massnahmen: updated });
  };

  // Delete measure
  const handleDeleteMeasure = (measureId: string) => {
    if (confirm('Möchten Sie diese Fördermaßnahme wirklich entfernen?')) {
      updateProfil({
        massnahmen: allMeasures.filter((m: any) => m.id !== measureId)
      });
    }
  };

  // Add strength
  const handleAddStrength = () => {
    if (!newStrength.trim()) return;
    updateProfil({
      staerken: [...staerken, newStrength.trim()]
    });
    setNewStrength('');
  };

  // Remove strength
  const handleRemoveStrength = (index: number) => {
    const next = [...staerken];
    next.splice(index, 1);
    updateProfil({ staerken: next });
  };

  // Diagnostic tests lookup for linking
  const studentDiagnosticRecords = useMemo(() => {
    const results = (app.diagnosticResults || []).filter(r => r.studentId === student.id);
    const legacy = (app.diagnostikErhebungen || []).filter((e: any) => e.schuelerId === student.id);
    return { results, legacy };
  }, [app.diagnosticResults, app.diagnostikErhebungen, student.id]);

  // Helper to resolve linked diagnostic title
  const getLinkedDiagnosticName = (diagId?: string) => {
    if (!diagId) return null;
    // Check new core results
    const foundCore = (app.diagnosticResults || []).find(r => r.id === diagId || r.testId === diagId);
    if (foundCore) {
      const def = getDiagnosticTestById(foundCore.testId) || getDiagnosticScreeningById(foundCore.testId);
      return def?.title || foundCore.testId;
    }
    // Check legacy
    const foundLegacy = (app.diagnostikErhebungen || []).find((e: any) => e.id === diagId || e.testId === diagId);
    if (foundLegacy) {
      return getDiagnosticTestName(foundLegacy.testId, app.diagnostikTests || []);
    }
    return diagId;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
            <Heart size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Pädagogische Förderung
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-bold text-emerald-300">
                Förderplan & Maßnahmen
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Zielvereinbarungen, didaktische Maßnahmen und Ressourcen für {student.vorname} {student.nachname}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingGoal(true)}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>Förderziel anlegen</span>
          </button>
        </div>
      </div>

      {/* MODAL / FORM: Add Goal */}
      {isAddingGoal && (
        <div className="p-4 sm:p-5 bg-white border-2 border-indigo-200 rounded-2xl shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Neues Förderziel vereinbaren
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingGoal(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleAddGoal} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Förderziel (konkret, erreichbar formuliert) *
              </label>
              <input
                type="text"
                required
                value={newGoalText}
                onChange={e => setNewGoalText(e.target.value)}
                placeholder="z. B. Wendet den Zehnerübergang bei Additionsaufgaben bis 20 mit Zerlegung an"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bereich
                </label>
                <select
                  value={newGoalArea}
                  onChange={e => setNewGoalArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {BEREICHE.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Startdatum
                </label>
                <input
                  type="date"
                  value={newGoalStartDate}
                  onChange={e => setNewGoalStartDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Geplante Überprüfung (optional)
                </label>
                <input
                  type="date"
                  value={newGoalTargetDate}
                  onChange={e => setNewGoalTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
              </div>
            </div>

            {/* Optional Diagnostic Linking */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Zugehörige Diagnostik (optional)
              </label>
              <select
                value={newGoalDiagId}
                onChange={e => setNewGoalDiagId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">-- Keine Verknüpfung / Allgemeine Beobachtung --</option>
                {studentDiagnosticRecords.results.map(r => {
                  const def = getDiagnosticTestById(r.testId) || getDiagnosticScreeningById(r.testId);
                  return (
                    <option key={r.id} value={r.id}>
                      Diagnostik: {def?.title || r.testId} ({formatGermanDate(r.date)})
                    </option>
                  );
                })}
                {studentDiagnosticRecords.legacy.map((e: any) => (
                  <option key={e.id} value={e.id}>
                    Erhebung: {getDiagnosticTestName(e.testId, app.diagnostikTests || [])} ({e.datum || 'Vorherig'})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingGoal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95"
              >
                Förderziel speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 1. AKTIVE FÖRDERZIELE (Immer oben) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-50 text-indigo-700">
              <Target size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                1. Aktive Förderziele ({activeGoals.length})
              </h4>
              <p className="text-[10px] text-slate-500">
                Verbindliche pädagogische Schwerpunkte und Entwicklungsschritte
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingGoal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            <Plus size={13} />
            <span>Neues Ziel</span>
          </button>
        </div>

        {activeGoals.length > 0 ? (
          <div className="space-y-3">
            {activeGoals.map((ziel: any) => {
              const linkedMeasures = allMeasures.filter((m: any) => m.zielId === ziel.id);
              const linkedDiagTitle = getLinkedDiagnosticName(ziel.diagnostikErhebungId);

              return (
                <div
                  key={ziel.id}
                  className="p-3.5 sm:p-4 bg-slate-50/70 hover:bg-slate-100/50 border border-slate-200/80 rounded-xl transition-all space-y-2.5 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-slate-900 leading-snug">
                          {ziel.ziel}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                          {ziel.bereich || 'Allgemein'}
                        </span>
                        {ziel.status === 'in_arbeit' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                            In Arbeit
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Offen
                          </span>
                        )}
                      </div>

                      {/* Diagnostic connection */}
                      {linkedDiagTitle && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700">
                          <Stethoscope size={11} />
                          <span>Zugehörige Diagnostik: {linkedDiagTitle}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleGoalStatus(ziel.id, ziel.status)}
                        className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-3xs cursor-pointer active:scale-95"
                        title="Als erreicht markieren"
                      >
                        <CheckCircle2 size={12} />
                        <span>Als erreicht markieren</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(ziel.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Förderziel löschen"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Date & measures summary */}
                  <div className="pt-1 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-medium">
                    <div className="flex items-center gap-3 flex-wrap">
                      {ziel.startDatum && (
                        <span>Start: {formatGermanDate(ziel.startDatum)}</span>
                      )}
                      {ziel.zielDatum && (
                        <span className="font-bold text-indigo-700">
                          Geplante Überprüfung: {formatGermanDate(ziel.zielDatum)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-600">
                        {linkedMeasures.length} {linkedMeasures.length === 1 ? 'Maßnahme' : 'Maßnahmen'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewMeasureGoalId(ziel.id);
                          setIsAddingMeasure(true);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        + Maßnahme ergänzen
                      </button>
                    </div>
                  </div>

                  {/* Linked measures rendered under goal if any */}
                  {linkedMeasures.length > 0 && (
                    <div className="space-y-1.5 pl-2 sm:pl-3 border-l-2 border-indigo-200 pt-1">
                      {linkedMeasures.map((m: any) => (
                        <div
                          key={m.id}
                          className="p-2 bg-white rounded-lg border border-slate-200/60 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900">{m.bezeichnung}</span>
                            {m.beschreibung && (
                              <span className="text-slate-500 font-normal ml-1.5 text-[11px]">
                                – {m.beschreibung}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteMeasure(m.id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 space-y-2">
            <p className="text-xs font-bold text-slate-600">
              Aktuell keine offenen Förderziele für {student.vorname}
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Vereinbaren Sie bei Bedarf individuelle Entwicklungsziele, um gezielte Maßnahmen festzuhalten.
            </p>
            <button
              type="button"
              onClick={() => setIsAddingGoal(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-3xs cursor-pointer"
            >
              <Plus size={13} />
              <span>Förderziel vereinbaren</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL / FORM: Add Measure */}
      {isAddingMeasure && (
        <div className="p-4 sm:p-5 bg-white border-2 border-emerald-200 rounded-2xl shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-emerald-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Neue pädagogische Fördermaßnahme dokumentieren
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingMeasure(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={handleAddMeasure} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bezeichnung der Maßnahme *
              </label>
              <input
                type="text"
                required
                value={newMeasureName}
                onChange={e => setNewMeasureName(e.target.value)}
                placeholder="z. B. 10 Minuten Partner-Blitzrechnen mit Anschauungsmaterial (Zehnerstreifen)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Didaktische Durchführung / Details (optional)
              </label>
              <textarea
                rows={2}
                value={newMeasureDesc}
                onChange={e => setNewMeasureDesc(e.target.value)}
                placeholder="z. B. 2x wöchentlich in der Freiarbeit, Schwerpunkt Stopp bei 10"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Zugeordnetes Förderziel
                </label>
                <select
                  value={newMeasureGoalId}
                  onChange={e => setNewMeasureGoalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="">-- Ohne direktes Ziel / Allgemein --</option>
                  {activeGoals.map((g: any) => (
                    <option key={g.id} value={g.id}>{g.ziel}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Beginn der Maßnahme
                </label>
                <input
                  type="date"
                  value={newMeasureDate}
                  onChange={e => setNewMeasureDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Kontrolltermin (optional)
                </label>
                <input
                  type="date"
                  value={newMeasureReviewDate}
                  onChange={e => setNewMeasureReviewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingMeasure(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95"
              >
                Maßnahme speichern
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. MASSNAHMEN (Alle laufenden Maßnahmen) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700">
              <Lightbulb size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                2. Didaktische Fördermaßnahmen ({allMeasures.length})
              </h4>
              <p className="text-[10px] text-slate-500">
                Konkrete Unterrichts- und Differenzierungsangebote
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingMeasure(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
          >
            <Plus size={13} />
            <span>Maßnahme erfassen</span>
          </button>
        </div>

        {allMeasures.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allMeasures.map((m: any) => {
              const matchedGoal = allGoals.find((g: any) => g.id === m.zielId);

              return (
                <div
                  key={m.id}
                  className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900">
                      {m.bezeichnung}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeasure(m.id)}
                      className="text-slate-400 hover:text-rose-600 p-0.5"
                      title="Maßnahme löschen"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {m.beschreibung && (
                    <p className="text-[11px] text-slate-600 font-normal">
                      {m.beschreibung}
                    </p>
                  )}

                  {matchedGoal && (
                    <div className="text-[10px] text-indigo-700 font-bold flex items-center gap-1">
                      <Target size={11} />
                      <span>Ziel: {matchedGoal.ziel}</span>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Seit: {formatGermanDate(m.datum)}</span>

                    {/* Effectiveness selector */}
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-slate-600">Wirksamkeit:</span>
                      <select
                        value={m.wirksamkeit || 'unklar'}
                        onChange={e => handleUpdateMeasureEffectiveness(m.id, e.target.value)}
                        className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-bold bg-white focus:outline-none"
                      >
                        <option value="unklar">Offen / Unklar</option>
                        <option value="sehr_wirksam">Sehr wirksam</option>
                        <option value="teilweise_wirksam">Teilweise wirksam</option>
                        <option value="nicht_wirksam">Nicht wirksam</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">
              Noch keine spezifischen Fördermaßnahmen eingetragen
            </p>
          </div>
        )}
      </div>

      {/* 3. RESSOURCEN / STÄRKEN */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-700">
              <Sparkles size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                3. Ressourcen & Stärken ({staerken.length})
              </h4>
              <p className="text-[10px] text-slate-500">
                Pädagogische Anknüpfungspunkte, Stärken und positive Motivation
              </p>
            </div>
          </div>
        </div>

        {/* List of strengths */}
        <div className="flex flex-wrap gap-2">
          {staerken.map((st: string, idx: number) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-3xs"
            >
              <span>{st}</span>
              <button
                type="button"
                onClick={() => handleRemoveStrength(idx)}
                className="text-amber-600 hover:text-amber-900 ml-0.5"
                title="Stärke entfernen"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {staerken.length === 0 && (
            <p className="text-xs text-slate-400 italic">
              Noch keine spezifischen Stärken hinterlegt.
            </p>
          )}
        </div>

        {/* Quick add strength input */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input
            type="text"
            value={newStrength}
            onChange={e => setNewStrength(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddStrength())}
            placeholder="Neue Stärke eintragen (z. B. Hohe Lesemotivation, Hilfsbereitschaft)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={handleAddStrength}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-3xs cursor-pointer active:scale-95"
          >
            Hinzufügen
          </button>
        </div>
      </div>

      {/* 4. ÜBERPRÜFUNG & VERLAUF */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-700">
              <Clock size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                4. Überprüfung & Verlauf
              </h4>
              <p className="text-[10px] text-slate-500">
                Pädagogische Re-Evaluation und zeitliche Dokumentation
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {activeGoals.filter((g: any) => g.zielDatum).length > 0 ? (
            activeGoals.filter((g: any) => g.zielDatum).map((g: any) => (
              <div
                key={g.id}
                className="p-3 bg-slate-50/70 border border-slate-200/70 rounded-xl flex items-center justify-between gap-2 text-left"
              >
                <div>
                  <div className="text-xs font-black text-slate-900">{g.ziel}</div>
                  <div className="text-[10px] text-slate-500">Bereich: {g.bereich}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kontrolltermin</div>
                  <div className="text-xs font-black text-indigo-700">{formatGermanDate(g.zielDatum)}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 italic py-2">
              Keine anstehenden Kontrolltermine hinterlegt.
            </p>
          )}
        </div>
      </div>

      {/* 5. ABGESCHLOSSENE ZIELE (Standardmäßig eingeklappt) */}
      <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-3xs space-y-3">
        <button
          type="button"
          onClick={() => setShowCompletedGoals(!showCompletedGoals)}
          className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-slate-100 text-slate-600">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                5. Abgeschlossene Förderziele ({completedGoals.length})
              </h4>
              <p className="text-[10px] text-slate-500">
                Erreichte oder archivierte Zielvereinbarungen
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
            <span>{showCompletedGoals ? 'Einklappen' : 'Anzeigen'}</span>
            {showCompletedGoals ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        {showCompletedGoals && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            {completedGoals.length > 0 ? (
              completedGoals.map((ziel: any) => (
                <div
                  key={ziel.id}
                  className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-2 text-left opacity-80"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-bold text-slate-800 line-through">
                        {ziel.ziel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 pl-5">
                      Bereich: {ziel.bereich}
                      {ziel.abgeschlossenAm && ` · Erreicht am ${formatGermanDate(ziel.abgeschlossenAm)}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleGoalStatus(ziel.id, ziel.status)}
                    className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:underline"
                  >
                    Wieder öffnen
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-2">
                Noch keine abgeschlossenen Förderziele vorhanden.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
