import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Heart,
  HelpCircle,
  Layers,
  Sparkles,
  Stethoscope,
  Target,
  TrendingDown,
  TrendingUp,
  Minus
} from 'lucide-react';
import { Student } from '../../types';
import { FAECHER_ALLE } from '../../constants';
import { useApp } from '../../context/AppContext';
import {
  getStudentAttendanceSummary,
  getStudentBehaviorSummary,
  getStudentNotes
} from '../../lib/studentMetrics';
import {
  getDiagnosticTestName,
  getValidStudentDiagnostics,
  isDiagnosticAlert
} from '../../lib/diagnosticData';
import {
  getStudentStrengthsAndObservations,
  getStudentFocusAreas,
  formatGermanDate,
  getDiagnosticTestById,
  getDiagnosticScreeningById
} from '../../lib/diagnosticCoreUtils';
import { berechne, getAssessmentMode } from '../../lib/GradeUtils';
import { parseGradeToValue } from '../NotenverlaufChart';
import { LERNZIELE_BY_STUFE } from '../LernzielTracker';
import { getLernzielModell } from '../../lib/lernzielBewertungsmodell';

interface DossierUebersichtProps {
  student: Student;
  onTabChange: (tab: any) => void;
  semester: '1' | '2';
  onQuickEntry?: (type: 'note' | 'strength' | 'parent' | 'goal') => void;
}

function formatRelativeOrShortDate(value?: string | number): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Heute';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return d.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' });
}

function calculateSubjectTrend(
  app: any,
  studentId: string,
  subject: string,
  semester: '1' | '2',
  overallAvg: number | null
): { direction: 'up' | 'down' | 'stable' | 'none'; label: string } {
  if (overallAvg === null) return { direction: 'none', label: '' };

  const grades: number[] = [];
  const nd = app.noten?.[studentId]?.[subject]?.[semester] || {};
  ['aufgaben', 'sa', 'lzk', 'wp'].forEach(type => {
    const entries = nd[type];
    if (!Array.isArray(entries)) return;
    entries.forEach((g: any) => {
      const val = parseGradeToValue(g?.grade ?? g?.originalGrade ?? g?.numericGrade ?? g);
      if (val !== null) grades.push(val);
    });
  });

  if (grades.length < 2) {
    return { direction: 'none', label: '' };
  }

  const firstHalf = grades.slice(0, Math.floor(grades.length / 2));
  const secondHalf = grades.slice(Math.floor(grades.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const diff = avgSecond - avgFirst;

  if (diff < -0.15) {
    return { direction: 'up', label: 'verbessert' };
  } else if (diff > 0.15) {
    return { direction: 'down', label: 'schwächer' };
  } else {
    return { direction: 'stable', label: 'stabil' };
  }
}

export default function DossierUebersicht({ student, onTabChange, semester, onQuickEntry }: DossierUebersichtProps) {
  const [showEntryActions, setShowEntryActions] = useState(false);
  const { app, setApp } = useApp();

  const subjects = useMemo(() => {
    return FAECHER_ALLE.filter(subject => !app.faecher || app.faecher.includes(subject));
  }, [app.faecher]);

  const attendance = useMemo(() => {
    return getStudentAttendanceSummary(app, student.id);
  }, [app, student.id]);

  const behavior = useMemo(() => {
    return getStudentBehaviorSummary(app, student.id);
  }, [app, student.id]);

  const notes = useMemo(() => {
    return getStudentNotes(app, student.id);
  }, [app, student.id]);

  const diagnostics = useMemo(() => {
    return getValidStudentDiagnostics(app, student.id)
      .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime());
  }, [app, student.id]);

  const diagnosticAlerts = useMemo(() => {
    return diagnostics.filter(isDiagnosticAlert);
  }, [diagnostics]);

  // Competency-based diagnostic system
  const newDiagnosticResults = useMemo(() => {
    return (app.diagnosticResults || []).filter((r: any) => r.studentId === student.id);
  }, [app.diagnosticResults, student.id]);

  const newStrengths = useMemo(() => {
    return getStudentStrengthsAndObservations(app.diagnosticResults || [], student.id);
  }, [app.diagnosticResults, student.id]);

  const newFocusAreas = useMemo(() => {
    return getStudentFocusAreas(app.diagnosticResults || [], student.id);
  }, [app.diagnosticResults, student.id]);

  // Raw Support Goals & Measures
  const rawSupportGoals = useMemo(() => {
    return (student.foerderprofil?.foerderziele || []).filter(
      goal => goal.status === 'offen' || String(goal.status) === 'in_arbeit' || goal.status === 'in Arbeit'
    );
  }, [student.foerderprofil?.foerderziele]);

  const measures = useMemo(() => {
    return student.foerderprofil?.massnahmen || [];
  }, [student.foerderprofil?.massnahmen]);

  const linkedDiagnosticIds = useMemo(() => {
    return new Set(rawSupportGoals.map(goal => goal.diagnostikErhebungId).filter(Boolean));
  }, [rawSupportGoals]);

  const unaddressedDiagnosticAlerts = useMemo(() => {
    return diagnosticAlerts.filter(entry => !linkedDiagnosticIds.has(entry.id));
  }, [diagnosticAlerts, linkedDiagnosticIds]);

  const latestKel = useMemo(() => {
    return (app.kelGespraeche || [])
      .filter((item: any) => item.schuelerId === student.id)
      .sort((a: any, b: any) => new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime())[0];
  }, [app.kelGespraeche, student.id]);

  // Learning Goals (Lehrplan Lernziele)
  const { reachedGoals, inProgressGoals } = useMemo(() => {
    const classMatch = app.klassenbezeichnung?.match(/(\d)/);
    const classLevel = Number(app.stufe) || (classMatch ? parseInt(classMatch[1]) : 1);
    const stufe = Math.max(1, Math.min(4, classLevel));
    const stufenZiele = LERNZIELE_BY_STUFE[stufe] || LERNZIELE_BY_STUFE[1] || {};
    const goalModel = getLernzielModell(app.lernzielBewertungsmodell);
    const reachedValue = goalModel.levels[goalModel.levels.length - 1].value;
    const goalRatings = app.studentLernzielSemesterBewertungen?.[student.id]?.[semester]
      || (!app.studentLernzielSemesterBewertungen?.[student.id] && semester === '1' ? app.studentLernzielBewertungen?.[student.id] : undefined) || {};

    const reached: Array<{ id: string; text: string; fach: string }> = [];
    const inProgress: Array<{ id: string; text: string; fach: string }> = [];

    Object.entries(stufenZiele).forEach(([fach, goals]) => {
      if (Array.isArray(goals)) {
        goals.forEach(g => {
          const rating = goalRatings[g.id];
          if (rating === reachedValue) {
            reached.push({ id: g.id, text: g.text, fach });
          } else if (goalModel.levels.some(level => level.value === rating && level.value !== reachedValue)) {
            inProgress.push({ id: g.id, text: g.text, fach });
          }
        });
      }
    });

    return { reachedGoals: reached, inProgressGoals: inProgress };
  }, [app.klassenbezeichnung, app.stufe, app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen, app.lernzielBewertungsmodell, student.id, semester]);

  // Subject performance summary list
  const subjectPerformances = useMemo(() => {
    return subjects.map(subject => {
      const mode = getAssessmentMode(app, subject);
      const avg = berechne(app, student.id, subject, semester);
      const semesterData = app.noten?.[student.id]?.[subject]?.[semester];
      const endnote = semesterData?.endnote;
      const trend = calculateSubjectTrend(app, student.id, subject, semester, avg);

      let displayValue = '—';
      if (mode === 'grades' && endnote !== undefined && endnote !== null && String(endnote).trim() !== '' && String(endnote) !== '—') {
        displayValue = `Note ${endnote}`;
      } else if (avg !== null) {
        if (mode === 'percent') {
          displayValue = `${Math.round(avg)} %`;
        } else if (mode === 'points') {
          displayValue = `${avg.toFixed(1)} Pkt.`;
        } else {
          displayValue = `Note ${avg.toFixed(1).replace('.', ',')}`;
        }
      }

      return {
        subject,
        mode,
        avg,
        endnote,
        displayValue,
        trend,
        hasGrade: (mode === 'grades' && endnote !== undefined && endnote !== null && String(endnote).trim() !== '' && String(endnote) !== '—') || avg !== null
      };
    });
  }, [app, student.id, subjects, semester]);

  // Four stable entry points: never hide daily work or infer a grade average
  // from mixed grades, points and percentages.
  const assessedSubjects = subjectPerformances.filter(item => item.hasGrade);
  const observationCount = notes.length + behavior.logs.length;
  const quickCards = [
    {
      id: 'attendance', label: 'Anwesenheit', icon: CalendarDays, tab: 'beobachtungen_verlauf',
      value: attendance.hasData ? `${attendance.total} Fehlstunden` : 'Noch nicht erfasst',
      detail: attendance.hasData ? `${attendance.unexcused} unentschuldigt` : 'Anwesenheit öffnen',
    },
    {
      id: 'grades', label: 'Lernen', icon: BarChart3, tab: 'leistungen',
      value: assessedSubjects.length ? `${assessedSubjects.length} Fächer mit Bewertungen` : 'Noch keine Bewertungen',
      detail: 'Bewertungsmodus je Fach',
    },
    {
      id: 'observations', label: 'Beobachtungen', icon: Activity, tab: 'beobachtungen_verlauf',
      value: observationCount ? `${observationCount} Einträge` : 'Noch keine Einträge',
      detail: 'Beobachtungen öffnen',
    },
    {
      id: 'support', label: 'Förderung', icon: Heart, tab: 'foerderung',
      value: rawSupportGoals.length ? `${rawSupportGoals.length} aktive Ziele`
        : measures.length ? `${measures.length} Maßnahmen` : 'Noch keine Ziele erfasst',
      detail: measures.length ? `${measures.length} Maßnahmen dokumentiert` : 'Förderprofil öffnen',
    },
  ];

  // 2. STÄRKEN (Max 3-5 Points)
  const studentStrengths = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      context: string;
      tab: string;
    }> = [];

    // 1. Diagnostik Stärken
    newStrengths.slice(0, 2).forEach((s, idx) => {
      list.push({
        id: `strength-diag-${idx}`,
        title: s.title,
        context: s.description ? `Diagnostik · ${s.description}` : 'Diagnostische Erhebung',
        tab: 'diagnostik'
      });
    });

    // 2. Erreichte Lernziele
    reachedGoals.slice(0, 2).forEach((g, idx) => {
      list.push({
        id: `strength-goal-${idx}`,
        title: g.text,
        context: `Lernziel erreicht · ${g.fach}`,
        tab: 'lernziele'
      });
    });

    // 4. Förderprofil Stärken & Ressourcen
    const rawStaerken = student.foerderprofil?.staerken || (student.foerderprofil as any)?.ressourcen;
    if (rawStaerken) {
      const res = Array.isArray(rawStaerken)
        ? rawStaerken
        : typeof rawStaerken === 'string'
        ? rawStaerken.split('\n').map((r: string) => r.trim()).filter(Boolean)
        : [];
      res.slice(0, 2).forEach((r: string, idx: number) => {
        list.push({
          id: `strength-res-${idx}`,
          title: r,
          context: 'Förderprofil · Ressource',
          tab: 'foerderprofil'
        });
      });
    }

    // 5. Positive Beobachtungen
    notes
      .filter((n: any) => n.kategorie === 'Erfolg' || n.kategorie === 'Positiv')
      .slice(0, 2)
      .forEach((n: any, idx) => {
        list.push({
          id: `strength-note-${idx}`,
          title: n.inhalt || n.notiz || n.text || n.titel || 'Positive Entwicklung beobachtet',
          context: `Beobachtung · ${n.kategorie || 'Erfolg'}`,
          tab: 'stats'
        });
      });

    // 6. KEL Stärken
    const kelStaerken = (latestKel as any)?.staerkenKind;
    if (kelStaerken && typeof kelStaerken === 'string' && kelStaerken.trim().length > 0) {
      list.push({
        id: 'strength-kel',
        title: kelStaerken.trim(),
        context: 'KEL-Gespräch · Besprochene Stärken',
        tab: 'kel_reflexion'
      });
    }

    return list.slice(0, 5);
  }, [newStrengths, reachedGoals, student.foerderprofil, notes, latestKel]);

  // 3. WEITER BEOBACHTEN (Max 3-5 Points, strictly constructive)
  const observationFocusPoints = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      context: string;
      tab: string;
    }> = [];

    // 1. Unsichere diagnostische Kompetenzen
    newFocusAreas.slice(0, 2).forEach((fa, idx) => {
      list.push({
        id: `focus-diag-${idx}`,
        title: fa.competency.name,
        context: 'Diagnostik · Kompetenzfeld im Aufbau',
        tab: 'diagnostik'
      });
    });

    // 2. Offene diagnostische Hinweise
    unaddressedDiagnosticAlerts.slice(0, 2).forEach((al, idx) => {
      list.push({
        id: `focus-alert-${idx}`,
        title: `Ergebnis in „${getDiagnosticTestName(al.testId, app.diagnostikTests || [])}“ sichten`,
        context: 'Diagnostischer Hinweis zur Einordnung',
        tab: 'diagnostik'
      });
    });

    // 3. Offene Lernziele
    inProgressGoals.slice(0, 2).forEach((g, idx) => {
      list.push({
        id: `focus-goal-${idx}`,
        title: g.text,
        context: `Lernziel in Arbeit · ${g.fach}`,
        tab: 'lernziele'
      });
    });

    // 4. Aktive Förderziele
    rawSupportGoals.slice(0, 2).forEach(goal => {
      list.push({
        id: `focus-support-${goal.id}`,
        title: goal.ziel,
        context: `Aktives Förderziel · ${goal.bereich || 'Förderbereich'}`,
        tab: 'foerderprofil'
      });
    });

    // 6. Anwesenheitsmuster
    if (attendance.hasData && attendance.unexcused > 0) {
      list.push({
        id: 'focus-attendance',
        title: `${attendance.unexcused} unentschuldigte Fehlstunden dokumentiert`,
        context: 'Anwesenheit & Präsenz',
        tab: 'stats'
      });
    }

    return list.slice(0, 5);
  }, [newFocusAreas, unaddressedDiagnosticAlerts, app.diagnostikTests, inProgressGoals, rawSupportGoals, attendance]);

  // 4. NÄCHSTE SCHRITTE (Priority: 1. Förderziele, 2. Maßnahmen, 3. offene Diagnostik, 4. offene Lernziele)
  const nextSteps = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      detail: string;
      badge: string;
      tab: string;
      goalId?: string;
    }> = [];

    // 1. Aktive Förderziele
    rawSupportGoals.forEach(goal => {
      list.push({
        id: `step-goal-${goal.id}`,
        goalId: goal.id,
        title: `Förderziel: ${goal.ziel}`,
        detail: goal.zielDatum
          ? `Zieltermin: ${formatRelativeOrShortDate(goal.zielDatum)}`
          : `Status: ${goal.status} (${goal.bereich || 'Förderbereich'})`,
        badge: 'Förderziel',
        tab: 'foerderprofil'
      });
    });

    // 2. Bereits hinterlegte Maßnahmen
    measures
      .filter(m => m.wirksamkeit === 'unklar' || !m.wirksamkeit)
      .forEach(m => {
        list.push({
          id: `step-measure-${m.id}`,
          title: `Maßnahme: ${m.bezeichnung || m.beschreibung || 'Fördermaßnahme'}`,
          detail: m.kontrollDatum
            ? `Rückblick am ${formatRelativeOrShortDate(m.kontrollDatum)}`
            : 'Laufende didaktische Unterstützung',
          badge: 'Maßnahme',
          tab: 'foerderprofil'
        });
      });

    // 3. Offene diagnostische Beobachtungen / Hinweise
    if (unaddressedDiagnosticAlerts.length > 0) {
      list.push({
        id: 'step-diag-alert',
        title: `Diagnostik prüfen: ${getDiagnosticTestName(unaddressedDiagnosticAlerts[0].testId, app.diagnostikTests || [])}`,
        detail: 'Pädagogische Einordnung und bei Bedarf Förderziel ableiten',
        badge: 'Diagnostik',
        tab: 'diagnostik'
      });
    } else if (newFocusAreas.length > 0) {
      list.push({
        id: 'step-diag-focus',
        title: `Kompetenzförderung: ${newFocusAreas[0].competency.name}`,
        detail: 'Diagnostik · Gezielte Förderung im Kompetenzfeld',
        badge: 'Diagnostik',
        tab: 'diagnostik'
      });
    }

    // 4. Offene Lernziele
    if (inProgressGoals.length > 0) {
      list.push({
        id: `step-lz-${inProgressGoals[0].id}`,
        title: `Lernziel festigen: ${inProgressGoals[0].text}`,
        detail: `Fach: ${inProgressGoals[0].fach}`,
        badge: 'Lernziel',
        tab: 'lernziele'
      });
    }

    return list.slice(0, 5);
  }, [rawSupportGoals, measures, unaddressedDiagnosticAlerts, app.diagnostikTests, newFocusAreas, inProgressGoals]);

  // 5. LETZTE ENTWICKLUNGEN (Max 5 chronological pedagogical events)
  const recentEvents = useMemo(() => {
    const list: Array<{
      id: string;
      date: string | number;
      title: string;
      detail: string;
      type: string;
      tab: string;
    }> = [];

    // Diagnostik Erhebungen
    newDiagnosticResults.forEach((r: any) => {
      const testTitle = r.testId
        ? getDiagnosticTestById(r.testId)?.title || getDiagnosticScreeningById(r.testId)?.title || r.testId
        : 'Screening';
      list.push({
        id: `dev-diag-${r.id || r.date}`,
        date: r.date,
        title: `Diagnostik: ${testTitle}`,
        detail: 'Kompetenzbasierte Erhebung abgeschlossen',
        type: 'Diagnostik',
        tab: 'diagnostik'
      });
    });

    diagnostics.forEach((entry: any) => {
      list.push({
        id: `dev-legacy-diag-${entry.id}`,
        date: entry.datum,
        title: `Diagnostik: ${getDiagnosticTestName(entry.testId, app.diagnostikTests || [])}`,
        detail: 'Erhebung dokumentiert',
        type: 'Diagnostik',
        tab: 'diagnostik'
      });
    });

    // Förderziele
    (student.foerderprofil?.foerderziele || []).forEach(goal => {
      if (goal.startDatum) {
        list.push({
          id: `dev-goal-${goal.id}`,
          date: goal.startDatum,
          title: `Förderziel: ${goal.ziel}`,
          detail: `Bereich: ${goal.bereich || 'Förderung'} (${goal.status})`,
          type: 'Förderziel',
          tab: 'foerderprofil'
        });
      }
    });

    // Pädagogische Notizen / Beobachtungen
    notes.forEach((note: any) => {
      const date = note.datum || note.timestamp;
      if (date) {
        list.push({
          id: `dev-note-${note.id || date}`,
          date,
          title: `Beobachtung: ${note.kategorie || 'Pädagogisch'}`,
          detail: note.inhalt || note.notiz || note.text || note.titel || 'Eintrag im Journal',
          type: 'Beobachtung',
          tab: 'stats'
        });
      }
    });

    // KEL-Gespräche
    (app.kelGespraeche || [])
      .filter((item: any) => item.schuelerId === student.id && item.datum)
      .forEach((item: any) => {
        list.push({
          id: `dev-kel-${item.id}`,
          date: item.datum,
          title: 'KEL-Gespräch',
          detail: item.vereinbarungen || 'Gespräch mit Eltern und Kind dokumentiert',
          type: 'KEL',
          tab: 'kel_reflexion'
        });
      });

    // Sort descending by date, take top 5
    return list
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);
  }, [newDiagnosticResults, diagnostics, app.diagnostikTests, student.foerderprofil?.foerderziele, notes, app.kelGespraeche, student.id]);


  const completeGoal = (goalId: string) => {
    if (!window.confirm('Dieses Förderziel als erreicht markieren?')) return;
    setApp(previous => ({
      ...previous,
      schueler: previous.schueler.map(item => item.id === student.id ? {
        ...item,
        foerderprofil: {
          ...item.foerderprofil,
          foerderziele: (item.foerderprofil?.foerderziele || []).map(goal =>
            goal.id === goalId
              ? { ...goal, status: 'erreicht' as const, abgeschlossenAm: new Date().toISOString().slice(0, 10) }
              : goal
          ),
          letzteAktualisierung: new Date().toISOString()
        }
      } : item)
    }));
  };

  return (
    <div className="space-y-4">
      <section aria-label="Auf einen Blick">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
              <Compass size={18} className="text-indigo-600" />
              Auf einen Blick
            </h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Dokumentierte Informationen aus den bestehenden Bereichen.
            </p>
          </div>
          <div className="relative print:hidden">
            <button type="button" aria-expanded={showEntryActions} aria-controls="dossier-quick-actions"
              onClick={() => setShowEntryActions(open => !open)}
              className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
              + Eintrag
            </button>
            {showEntryActions && (
              <div id="dossier-quick-actions" className="absolute right-0 top-full z-30 mt-1 min-w-52 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                {([
                  ['note', 'Beobachtung / Notiz'],
                  ['strength', 'Stärke / Ressource'],
                  ['goal', 'Förderziel'],
                  ['parent', 'Elternkontakt']
                ] as const).map(([type, label]) => (
                  <button key={type} type="button"
                    onClick={() => {
                      setShowEntryActions(false);
                      if (onQuickEntry) onQuickEntry(type);
                      else onTabChange(type === 'goal' || type === 'strength' ? 'foerderung' : 'beobachtungen_verlauf');
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-indigo-50">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {quickCards.map(card => {
            const Icon = card.icon;
            return (
              <button key={card.id} type="button" onClick={() => onTabChange(card.tab)}
                className="group min-w-0 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
                <span className="flex items-center gap-1.5 text-[0.6875rem] font-bold text-slate-600">
                  <Icon size={15} aria-hidden="true" />
                  {card.label}
                </span>
                <span className="mt-1 block text-sm font-extrabold leading-snug text-slate-900">{card.value}</span>
                <span className="mt-0.5 block text-[0.6875rem] text-slate-500">{card.detail}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => onTabChange('diagnostik')}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:underline">
          <Stethoscope size={13} />
          Diagnostik: {newDiagnosticResults.length + diagnostics.length} dokumentierte Erhebungen
          <ArrowRight size={13} />
        </button>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start">
        <section className={`rounded-2xl border border-slate-200 bg-white shadow-2xs ${studentStrengths.length ? 'p-4' : 'px-4 py-3'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Stärken & Ressourcen</h3>
              <span className="text-xs text-slate-500">{studentStrengths.length} erfasst</span>
            </div>
            <button type="button" onClick={() => onQuickEntry ? onQuickEntry('strength') : onTabChange('foerderung')}
              className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
              + Stärke erfassen
            </button>
          </div>
          {studentStrengths.length ? (
            <div className="mt-3 space-y-2">
              {studentStrengths.map(strength => (
                <button key={strength.id} type="button" onClick={() => onTabChange(strength.tab)}
                  className="flex w-full items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-emerald-50/40">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">{strength.title}</span>
                    <span className="text-[0.6875rem] text-slate-600">{strength.context}</span>
                  </span>
                  <ArrowRight size={14} className="mt-1 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          ) : <p className="mt-1 text-xs text-slate-600">Noch keine Stärken dokumentiert.</p>}
        </section>

        <section className={`rounded-2xl border border-slate-200 bg-white shadow-2xs ${nextSteps.length ? 'p-4' : 'px-4 py-3'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Target size={17} className="text-indigo-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Nächste pädagogische Schritte</h3>
              <span className="text-xs text-slate-500">{nextSteps.length} Einträge</span>
            </div>
            <button type="button" onClick={() => onQuickEntry ? onQuickEntry('goal') : onTabChange('foerderung')}
              className="rounded-lg px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-50">
              + Förderziel
            </button>
          </div>
          {nextSteps.length ? (
            <div className="mt-3 space-y-2">
              {nextSteps.slice(0, 4).map(step => (
                <div key={step.id} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <button type="button" onClick={() => onTabChange(step.tab)}
                    className="flex w-full items-start justify-between gap-2 text-left hover:text-indigo-700">
                    <span>
                      <span className="block text-[0.65rem] font-bold uppercase text-indigo-700">{step.badge}</span>
                      <span className="block text-xs font-bold text-slate-900">{step.title}</span>
                      <span className="mt-0.5 block text-[0.6875rem] text-slate-600">{step.detail}</span>
                    </span>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-slate-400" />
                  </button>
                  {step.goalId && (
                    <button type="button" onClick={() => completeGoal(step.goalId!)}
                      className="mt-1.5 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[0.6875rem] font-semibold text-emerald-800 hover:bg-emerald-50">
                      Als erreicht markieren
                    </button>
                  )}
                </div>
              ))}
              {nextSteps.length > 4 && (
                <button type="button" onClick={() => onTabChange('foerderung')}
                  className="text-xs font-semibold text-indigo-700 hover:underline">Weitere Ziele und Maßnahmen anzeigen</button>
              )}
            </div>
          ) : <p className="mt-1 text-xs text-slate-600">Noch keine offenen Förderziele oder weiteren Schritte dokumentiert.</p>}
        </section>
      </div>

      {observationFocusPoints.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <AlertCircle size={16} className="text-amber-600" /> Weiter beobachten
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {observationFocusPoints.map(point => (
              <button key={point.id} type="button" onClick={() => onTabChange(point.tab)}
                className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:bg-amber-50/40">
                <span className="block text-xs font-bold text-slate-900">{point.title}</span>
                <span className="text-[0.6875rem] text-slate-600">{point.context}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <BarChart3 size={17} className="text-indigo-600" /> Aktuelle Leistungen
            </h3>
            <button type="button" onClick={() => onTabChange('leistungen')}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline">
              Alle Fächer & Bewertungen <ArrowRight size={13} />
            </button>
          </div>
          {assessedSubjects.length ? (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100">
              {assessedSubjects.slice(0, 4).map(item => (
                <button key={item.subject} type="button" onClick={() => onTabChange('leistungen')}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-indigo-50/40">
                  <span className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">{item.subject}</span>
                    <span className="block text-[0.6875rem] text-slate-500">
                      {item.mode === 'percent' ? 'Prozentwertung' : item.mode === 'points' ? 'Punktewertung' : 'Notenskala'}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-extrabold text-slate-900">{item.displayValue}</span>
                </button>
              ))}
              {assessedSubjects.length > 4 && (
                <button type="button" onClick={() => onTabChange('leistungen')}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50/40">
                  Weitere {assessedSubjects.length - 4} bewertete Fächer anzeigen
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span>Noch keine Bewertungen dokumentiert.</span>
              <button type="button" onClick={() => onTabChange('leistungen')}
                className="font-bold text-indigo-700 hover:underline">Zur Notenmappe</button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <Clock size={17} className="text-indigo-600" /> Letzte Entwicklungen
            </h3>
            <span className="text-xs text-slate-500">{recentEvents.length} Einträge</span>
          </div>
          {recentEvents.length ? (
            <div className="space-y-2">
              {recentEvents.map(event => (
                <button key={event.id} type="button" onClick={() => onTabChange(event.tab)}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-left hover:bg-indigo-50/40">
                  <span className="w-11 shrink-0 text-[0.6875rem] font-bold text-slate-500">{formatRelativeOrShortDate(event.date)}</span>
                  <span className="min-w-0">
                    <span className="block text-[0.65rem] font-bold uppercase text-indigo-700">{event.type}</span>
                    <span className="block text-xs font-bold text-slate-900">{event.title}</span>
                    <span className="block truncate text-[0.6875rem] text-slate-600">{event.detail}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : <p className="text-xs text-slate-600">Noch keine pädagogischen Ereignisse dokumentiert.</p>}
        </section>
      </div>
    </div>
  );

}
