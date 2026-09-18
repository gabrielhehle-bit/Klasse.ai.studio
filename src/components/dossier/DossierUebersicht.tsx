import React, { useMemo } from 'react';
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
  getStudentGradeSummary,
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

interface DossierUebersichtProps {
  student: Student;
  onTabChange: (tab: any) => void;
  semester: '1' | '2';
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

export default function DossierUebersicht({ student, onTabChange, semester }: DossierUebersichtProps) {
  const { app } = useApp();

  const subjects = useMemo(() => {
    return FAECHER_ALLE.filter(subject => !app.faecher || app.faecher.includes(subject));
  }, [app.faecher]);

  const grades = useMemo(() => {
    return getStudentGradeSummary(app, student.id, subjects, semester);
  }, [app, student.id, subjects, semester]);

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
      goal => goal.status === 'offen' || goal.status === 'in Arbeit'
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
    const goalRatings = app.studentLernzielSemesterBewertungen?.[student.id]?.[semester] || app.studentLernzielBewertungen?.[student.id] || {};

    const reached: Array<{ id: string; text: string; fach: string }> = [];
    const inProgress: Array<{ id: string; text: string; fach: string }> = [];

    Object.entries(stufenZiele).forEach(([fach, goals]) => {
      if (Array.isArray(goals)) {
        goals.forEach(g => {
          const rating = goalRatings[g.id];
          if (rating === 1) {
            reached.push({ id: g.id, text: g.text, fach });
          } else if (rating === 2 || rating === 3) {
            inProgress.push({ id: g.id, text: g.text, fach });
          }
        });
      }
    });

    return { reachedGoals: reached, inProgressGoals: inProgress };
  }, [app.klassenbezeichnung, app.stufe, app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen, student.id, semester]);

  // Subject performance summary list
  const subjectPerformances = useMemo(() => {
    return subjects.map(subject => {
      const mode = getAssessmentMode(app, subject);
      const avg = berechne(app, student.id, subject, semester);
      const semesterData = app.noten?.[student.id]?.[subject]?.[semester];
      const endnote = semesterData?.endnote;
      const trend = calculateSubjectTrend(app, student.id, subject, semester, avg);

      let displayValue = '—';
      if (endnote && endnote !== '—') {
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
        hasGrade: endnote && endnote !== '—' || avg !== null
      };
    });
  }, [app, student.id, subjects, semester]);

  // 1. AUF EINEN BLICK: 4-6 Info Cards
  const quickCards = useMemo(() => {
    const list: Array<{
      id: string;
      label: string;
      value: string;
      detail: string;
      icon: any;
      tab: string;
      priority: number;
    }> = [];

    // Card: Leistungsstand
    if (grades.hasData) {
      list.push({
        id: 'grades',
        label: 'Leistungsstand',
        value: `${grades.gradedSubjects} Fächer bewertet`,
        detail: grades.average !== null ? `Ø ${grades.average.toFixed(2)} Notenschnitt` : 'Aktuelle Noten erfasst',
        icon: BarChart3,
        tab: 'leistungen',
        priority: 10
      });
    }

    // Card: Diagnostik
    const totalDiagnostics = newDiagnosticResults.length || diagnostics.length;
    if (totalDiagnostics > 0) {
      list.push({
        id: 'diagnostics',
        label: 'Diagnostik',
        value: `${totalDiagnostics} ${totalDiagnostics === 1 ? 'Erhebung' : 'Erhebungen'}`,
        detail: newFocusAreas.length > 0
          ? `${newFocusAreas.length} Bereiche zur Beobachtung`
          : newStrengths.length > 0
          ? `${newStrengths.length} Kompetenzen gesichert`
          : 'Kompetenzstand erfasst',
        icon: Stethoscope,
        tab: 'diagnostik',
        priority: 20
      });
    }

    // Card: Anwesenheit
    if (attendance.hasData) {
      list.push({
        id: 'attendance',
        label: 'Anwesenheit',
        value: attendance.total === 0 ? 'Keine Fehlstunden' : `${attendance.total} Fehlstunden`,
        detail: attendance.unexcused > 0
          ? `${attendance.unexcused} unentschuldigt`
          : 'Präsenz unauffällig',
        icon: CalendarDays,
        tab: 'stats',
        priority: 30
      });
    }

    // Card: Beobachtungen
    const obsCount = notes.length + behavior.logs.length;
    if (obsCount > 0 || behavior.hasExplicitStatus) {
      const latestNoteDate = [...notes, ...behavior.logs].reduce((latest, n) => {
        const d = new Date((n as any).datum || (n as any).timestamp || 0).getTime();
        return d > latest ? d : latest;
      }, 0);
      const daysSince = latestNoteDate > 0 ? Math.floor((Date.now() - latestNoteDate) / (1000 * 60 * 60 * 24)) : null;

      list.push({
        id: 'behavior',
        label: 'Beobachtungen',
        value: daysSince === 0
          ? 'Notiz heute erfasst'
          : daysSince !== null && daysSince <= 7
          ? `Vor ${daysSince} Tagen erfasst`
          : `${obsCount} ${obsCount === 1 ? 'Eintrag' : 'Einträge'}`,
        detail: behavior.stage?.label ? `Stufe: ${behavior.stage.label}` : 'Pädagogisches Journal',
        icon: Activity,
        tab: 'stats',
        priority: 40
      });
    }

    // Card: Förderziele
    if (rawSupportGoals.length > 0 || measures.length > 0) {
      list.push({
        id: 'support',
        label: 'Förderziele',
        value: rawSupportGoals.length > 0
          ? `${rawSupportGoals.length} ${rawSupportGoals.length === 1 ? 'aktives Ziel' : 'aktive Ziele'}`
          : 'Kein Ziel offen',
        detail: measures.length > 0 ? `${measures.length} Maßnahmen hinterlegt` : 'Förderprofil',
        icon: Heart,
        tab: 'foerderprofil',
        priority: 50
      });
    }

    // Fallback guidance cards if few or no data exists
    if (list.length < 4) {
      if (!list.some(c => c.id === 'grades')) {
        list.push({
          id: 'grades-empty',
          label: 'Leistungsstand',
          value: 'Noch keine Noten',
          detail: 'Notenmappe öffnen',
          icon: BarChart3,
          tab: 'leistungen',
          priority: 15
        });
      }
      if (!list.some(c => c.id === 'diagnostics')) {
        list.push({
          id: 'diagnostics-empty',
          label: 'Diagnostik',
          value: 'Noch nicht erhoben',
          detail: 'Screening durchführen',
          icon: Stethoscope,
          tab: 'diagnostik',
          priority: 25
        });
      }
      if (!list.some(c => c.id === 'behavior')) {
        list.push({
          id: 'behavior-empty',
          label: 'Beobachtungen',
          value: 'Keine Notizen',
          detail: 'Journal öffnen',
          icon: Activity,
          tab: 'stats',
          priority: 45
        });
      }
      if (!list.some(c => c.id === 'support')) {
        list.push({
          id: 'support-empty',
          label: 'Förderziele',
          value: 'Kein Förderbedarf',
          detail: 'Förderprofil ansehen',
          icon: Heart,
          tab: 'foerderprofil',
          priority: 55
        });
      }
    }

    return list.slice(0, 6);
  }, [grades, newDiagnosticResults, diagnostics, newFocusAreas, newStrengths, attendance, notes, behavior, rawSupportGoals, measures]);

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

    // 3. Fächer mit sehr guten Leistungen
    subjectPerformances
      .filter(sp => sp.hasGrade && (sp.endnote === '1' || (sp.avg !== null && sp.avg <= 1.8)))
      .slice(0, 2)
      .forEach(sp => {
        list.push({
          id: `strength-subject-${sp.subject}`,
          title: `Sehr gute Fachleistung in ${sp.subject} (${sp.displayValue})`,
          context: 'Lernen & Leistungen',
          tab: 'leistungen'
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
  }, [newStrengths, reachedGoals, subjectPerformances, student.foerderprofil, notes, latestKel]);

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

    // 5. Abweichende Leistungsentwicklung
    subjectPerformances
      .filter(sp => sp.hasGrade && (sp.trend.direction === 'down' || (sp.avg !== null && sp.avg >= 3.8)))
      .slice(0, 2)
      .forEach(sp => {
        list.push({
          id: `focus-subject-${sp.subject}`,
          title: `${sp.subject}: ${sp.trend.direction === 'down' ? 'Zuletzt schwächerer Verlauf' : 'Erhöhter Übungsbedarf'} (${sp.displayValue})`,
          context: 'Leistungsentwicklung im Blick behalten',
          tab: 'leistungen'
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
  }, [newFocusAreas, unaddressedDiagnosticAlerts, app.diagnostikTests, inProgressGoals, rawSupportGoals, subjectPerformances, attendance]);

  // 4. NÄCHSTE SCHRITTE (Priority: 1. Förderziele, 2. Maßnahmen, 3. offene Diagnostik, 4. offene Lernziele)
  const nextSteps = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      detail: string;
      badge: string;
      tab: string;
    }> = [];

    // 1. Aktive Förderziele
    rawSupportGoals.forEach(goal => {
      list.push({
        id: `step-goal-${goal.id}`,
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
    rawSupportGoals.forEach(goal => {
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
  }, [newDiagnosticResults, diagnostics, app.diagnostikTests, rawSupportGoals, notes, app.kelGespraeche, student.id]);

  return (
    <div className="space-y-5">
      {/* 1. SEKTION: AUF EINEN BLICK (4-6 Information Cards) */}
      <section>
        <div className="mb-3.5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Compass size={18} className="text-indigo-600" />
              Auf einen Blick
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Kompakte pädagogische Orientierung aus aktuellen Unterrichts- und Entwicklungsdaten.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {quickCards.map(card => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onTabChange(card.tab)}
                className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50/30"
                aria-label={`${card.label}: ${card.value}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-700">
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[0.6rem] font-black uppercase tracking-wider text-slate-400">
                    {card.label}
                  </span>
                  <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                    <span className="truncate text-sm font-black text-slate-900">{card.value}</span>
                    <span className="truncate text-[0.7rem] font-semibold text-slate-500">{card.detail}</span>
                  </div>
                </div>
                <ArrowRight size={13} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
              </button>
            );
          })}
        </div>
      </section>

      {/* HAUPTBEREICH (2-Spaltiges Layout auf Desktop, 1 Spalte Mobil) */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] items-start">
        {/* LINKE SPALTE: Stärken, Weiter beobachten, Nächste Schritte */}
        <div className="space-y-4">
          {/* 2. STÄRKEN */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Stärken & Ressourcen
                  </h3>
                  <p className="text-[0.7rem] font-medium text-slate-500 mt-0.5">
                    Gesicherte Kompetenzen und positive Beobachtungen
                  </p>
                </div>
              </div>
              <span className="text-[0.65rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {studentStrengths.length} erfasst
              </span>
            </div>

            <div className="space-y-2">
              {studentStrengths.length > 0 ? (
                studentStrengths.map(strength => (
                  <button
                    key={strength.id}
                    type="button"
                    onClick={() => onTabChange(strength.tab)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50/80 hover:bg-emerald-50/40 border border-slate-100 hover:border-emerald-200 transition-all flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="inline-block text-[0.62rem] font-extrabold uppercase tracking-wider text-emerald-700">
                        {strength.context}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {strength.title}
                      </p>
                    </div>
                    <ArrowRight size={13} className="mt-1 text-slate-300 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    Noch keine ausreichenden Beobachtungen vorhanden.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 3. WEITER BEOBACHTEN */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <AlertCircle size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Weiter beobachten
                  </h3>
                  <p className="text-[0.7rem] font-medium text-slate-500 mt-0.5">
                    Entwicklungsfelder mit weiterem Übungs- oder Begleitbedarf
                  </p>
                </div>
              </div>
              <span className="text-[0.65rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {observationFocusPoints.length} Hinweise
              </span>
            </div>

            <div className="space-y-2">
              {observationFocusPoints.length > 0 ? (
                observationFocusPoints.map(point => (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => onTabChange(point.tab)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50/80 hover:bg-amber-50/40 border border-slate-100 hover:border-amber-200 transition-all flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <span className="inline-block text-[0.62rem] font-extrabold uppercase tracking-wider text-slate-600">
                        {point.context}
                      </span>
                      <p className="text-xs font-bold text-slate-800 leading-snug">
                        {point.title}
                      </p>
                    </div>
                    <ArrowRight size={13} className="mt-1 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    Aktuell keine Auffälligkeiten zur Beobachtung dokumentiert.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 4. NÄCHSTE SCHRITTE */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Target size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Nächste pädagogische Schritte
                  </h3>
                  <p className="text-[0.7rem] font-medium text-slate-500 mt-0.5">
                    Priorisierte didaktische Vorhaben, Ziele und Maßnahmen
                  </p>
                </div>
              </div>
              <span className="text-[0.65rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {nextSteps.length} Schritte
              </span>
            </div>

            <div className="space-y-2">
              {nextSteps.length > 0 ? (
                nextSteps.map(step => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => onTabChange(step.tab)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-100 hover:border-indigo-200 transition-all flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[0.6rem] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {step.badge}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 leading-snug mt-1">
                        {step.title}
                      </div>
                      <p className="text-[0.72rem] font-medium text-slate-500 leading-relaxed">
                        {step.detail}
                      </p>
                    </div>
                    <ArrowRight size={13} className="mt-1.5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    Aktuell keine konkreten Maßnahmen hinterlegt.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* RECHTE SPALTE: Aktuelle Leistungen, Letzte Entwicklungen */}
        <div className="space-y-4">
          {/* 5. AKTUELLE LEISTUNGEN */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Aktuelle Leistungen
                  </h3>
                  <p className="text-[0.7rem] font-medium text-slate-500 mt-0.5">
                    Fächerübersicht mit Bewertungsmodus und Entwicklungstrend
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('leistungen')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Lernen & Leistungen</span>
                <ArrowRight size={13} />
              </button>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-100 overflow-hidden">
              {subjectPerformances.map(sp => (
                <button
                  key={sp.subject}
                  type="button"
                  onClick={() => onTabChange('leistungen')}
                  className="w-full flex items-center justify-between p-3 bg-white hover:bg-slate-50/80 transition-colors text-left cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                      {sp.subject}
                    </span>
                    <span className="block text-[0.65rem] font-medium text-slate-400">
                      {sp.mode === 'percent' ? 'Prozentwertung' : sp.mode === 'points' ? 'Punktewertung' : 'Notenskala'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-900">
                      {sp.displayValue}
                    </span>

                    {/* Trend indicator */}
                    {sp.trend.direction === 'up' && (
                      <span className="flex items-center gap-0.5 text-[0.65rem] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded" title="Positive Entwicklung">
                        <TrendingUp size={11} />
                        <span className="hidden sm:inline">{sp.trend.label}</span>
                      </span>
                    )}
                    {sp.trend.direction === 'stable' && (
                      <span className="flex items-center gap-0.5 text-[0.65rem] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded" title="Stabiler Notenstand">
                        <Minus size={11} />
                        <span className="hidden sm:inline">{sp.trend.label}</span>
                      </span>
                    )}
                    {sp.trend.direction === 'down' && (
                      <span className="flex items-center gap-0.5 text-[0.65rem] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded" title="Zuletzt schwächer">
                        <TrendingDown size={11} />
                        <span className="hidden sm:inline">{sp.trend.label}</span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* 6. LETZTE ENTWICKLUNGEN */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Letzte Entwicklungen
                  </h3>
                  <p className="text-[0.7rem] font-medium text-slate-500 mt-0.5">
                    Pädagogische Chronologie der letzten Erhebungen und Einträge
                  </p>
                </div>
              </div>
              <span className="text-[0.65rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {recentEvents.length} Einträge
              </span>
            </div>

            <div className="space-y-2">
              {recentEvents.length > 0 ? (
                recentEvents.map(event => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onTabChange(event.tab)}
                    className="w-full text-left p-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-all flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.62rem] font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          {event.type}
                        </span>
                        <span className="text-[0.68rem] font-bold text-slate-400">
                          {formatRelativeOrShortDate(event.date)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 leading-snug">
                        {event.title}
                      </div>
                      <p className="text-[0.72rem] font-medium text-slate-500 line-clamp-1">
                        {event.detail}
                      </p>
                    </div>
                    <ArrowRight size={13} className="mt-1 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
                  <p className="text-xs font-medium text-slate-500">
                    Noch keine pädagogischen Entwicklungen erfasst.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
