import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  Smile,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useApp } from '../context/AppContext';
import { faecherFuerKlasse } from '../lib/sek1Subjects';
import { calculateItemPercent, getAssessmentMode, getMaxPoints } from '../lib/GradeUtils';
import { getStudentGenderLabel } from '../lib/studentListData';

type PeriodKey = 'today' | 'week' | 'month' | 'semester' | 'year' | 'custom';
type Range = { from: Date; to: Date };

type AttendanceTotals = {
  recorded: number;
  present: number;
  excused: number;
  unexcused: number;
};

type StudentPeriodRow = {
  id: string;
  name: string;
  attendance: number | null;
  mood: number | null;
  participation: number;
  grade: number | null;
  performance: number | null;
  behavior: number | null;
};

interface Props {
  onSelectStudent?: (studentId: string) => void;
}

const PERIODS: Array<{ key: PeriodKey; label: string }> = [
  { key: 'today', label: 'Heute' },
  { key: 'week', label: 'Woche' },
  { key: 'month', label: 'Monat' },
  { key: 'semester', label: 'Semester' },
  { key: 'year', label: 'Schuljahr' },
  { key: 'custom', label: 'Eigener Zeitraum' },
];

const DEFAULT_BEHAVIOR_STAGES = [
  { id: '1', label: 'Super' },
  { id: '2', label: 'Gut' },
  { id: '3', label: 'OK' },
  { id: '4', label: 'Ermahnung' },
  { id: '5', label: 'Inakzeptabel' },
];

const DAY = 86_400_000;

function atNoon(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12, 0, 0, 0);
}

function addDays(value: Date, days: number) {
  const next = atNoon(value);
  next.setDate(next.getDate() + days);
  return next;
}

function iso(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function parseIso(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function timestampDate(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : atNoon(parsed);
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const isoDate = parseIso(value);
  if (isoDate) return isoDate;
  const numeric = Number(value);
  const parsed = Number.isFinite(numeric) && numeric > 0 ? new Date(numeric) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : atNoon(parsed);
}

function within(date: Date | null, range: Range) {
  return Boolean(date && date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime());
}

function schoolYearStart(app: any, now: Date) {
  const stored = Number(String(app.schuljahr || '').match(/20\d{2}/)?.[0]);
  const startYear = Number.isFinite(stored) && stored > 2000
    ? stored
    : now.getMonth() >= 7
      ? now.getFullYear()
      : now.getFullYear() - 1;
  return new Date(startYear, 7, 1, 12, 0, 0, 0);
}

function resolveRange(key: PeriodKey, app: any, customFrom: string, customTo: string, now = new Date()): Range {
  const today = atNoon(now);
  if (key === 'today') return { from: today, to: today };
  if (key === 'week') {
    const weekday = (today.getDay() + 6) % 7;
    return { from: addDays(today, -weekday), to: today };
  }
  if (key === 'month') return { from: new Date(today.getFullYear(), today.getMonth(), 1, 12), to: today };
  if (key === 'semester') {
    const yearStart = schoolYearStart(app, today);
    const secondSemesterStart = new Date(yearStart.getFullYear() + 1, 1, 1, 12);
    return today >= secondSemesterStart
      ? { from: secondSemesterStart, to: today }
      : { from: yearStart, to: today };
  }
  if (key === 'custom') {
    const from = parseIso(customFrom) || addDays(today, -29);
    const to = parseIso(customTo) || today;
    return from <= to ? { from, to } : { from: to, to: from };
  }
  return { from: schoolYearStart(app, today), to: today };
}

function previousRange(range: Range): Range {
  const days = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / DAY) + 1);
  const to = addDays(range.from, -1);
  return { from: addDays(to, -(days - 1)), to };
}

function formatRange(range: Range) {
  const formatter = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return iso(range.from) === iso(range.to)
    ? formatter.format(range.from)
    : `${formatter.format(range.from)} – ${formatter.format(range.to)}`;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function fmt(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? '—' : value.toFixed(digits).replace('.', ',');
}

function attendanceForStudent(app: any, studentId: string, range: Range): AttendanceTotals {
  const attendance = app.anwesenheit?.[studentId] || {};
  const details = app.anwesenheitDetail?.[studentId] || {};
  const dates = new Set([...Object.keys(attendance), ...Object.keys(details)]);
  const result: AttendanceTotals = { recorded: 0, present: 0, excused: 0, unexcused: 0 };

  dates.forEach(day => {
    const date = parseIso(day);
    if (!within(date, range)) return;
    const raw = attendance[day];
    const values = (typeof raw === 'string' ? [raw] : Object.values(raw || {}))
      .map(value => String(value).trim().toLocaleLowerCase('de-AT'))
      .filter(Boolean);
    const detail = details[day];

    let recordedForDay = 0;
    let absentForDay = 0;
    values.forEach(value => {
      if (['a', 'da', 'v', 'anwesend', 'present'].includes(value)) {
        result.present += 1;
        result.recorded += 1;
        recordedForDay += 1;
      } else if (value === 'e') {
        result.excused += 1;
        result.recorded += 1;
        recordedForDay += 1;
        absentForDay += 1;
      } else if (value === 'u') {
        result.unexcused += 1;
        result.recorded += 1;
        recordedForDay += 1;
        absentForDay += 1;
      }
    });

    const detailedAbsence = Math.max(0, Number(detail?.fehlstunden || 0));
    if (detailedAbsence > 0 && absentForDay === 0) {
      result.recorded += detailedAbsence;
      if (detail?.notiz === 'Unentschuldigt') result.unexcused += detailedAbsence;
      else result.excused += detailedAbsence;
    } else if (recordedForDay === 0 && detail && detailedAbsence === 0) {
      result.recorded += 1;
    }
  });

  return result;
}

function moodForStudent(app: any, studentId: string, range: Range) {
  const values = Object.entries(app.schuelerStimmung?.[studentId] || {})
    .filter(([day, value]) => within(parseIso(day), range) && Number(value) >= 1 && Number(value) <= 5)
    .map(([, value]) => Number(value));
  return { values, average: mean(values) };
}

function participationForStudent(app: any, studentId: string, range: Range) {
  const logs = (app.mitarbeitLogs || []).filter((log: any) =>
    log.sid === studentId &&
    log.kind !== 'social' &&
    Number.isFinite(Number(log.points)) &&
    within(timestampDate(log.timestamp), range)
  );
  return {
    logs,
    total: logs.reduce((sum: number, log: any) => sum + Number(log.points || 0), 0),
  };
}

function behaviorForStudent(app: any, studentId: string, range: Range) {
  const stages = Array.isArray(app.behavior_stages) && app.behavior_stages.length
    ? app.behavior_stages
    : DEFAULT_BEHAVIOR_STAGES;
  const scoreByStage = new Map<string, number>(
    stages.map((stage: any, index: number) => [String(stage.id), Math.max(1, 5 - index)])
  );
  const configuredStart = parseIso(String(app.settings?.behaviorStartDate || ''));
  const values = (app.statusLog || [])
    .filter((log: any) => {
      if (log.schuelerId !== studentId) return false;
      const date = timestampDate(log.datum) || timestampDate(log.timestamp);
      return within(date, range) && (!configuredStart || Boolean(date && date >= configuredStart));
    })
    .map((log: any) => scoreByStage.get(String(log.iconId)))
    .filter((value: unknown): value is number => typeof value === 'number' && Number.isFinite(value));
  const positive = values.filter(value => value >= 4).length;
  return {
    values,
    average: mean(values),
    count: values.length,
    positiveRate: values.length ? (positive / values.length) * 100 : null,
  };
}

function subjectAssessmentValues(app: any, studentId: string, subject: string, range: Range) {
  const mode = getAssessmentMode(app, subject);
  const meta: any = app.notenMeta?.[subject] || {};
  const gradeValues: number[] = [];
  const scores: number[] = [];

  (['1', '2'] as const).forEach(semester => {
    const data: any = app.noten?.[studentId]?.[subject]?.[semester] || {};
    (['sa', 'lzk', 'wp', 'aufgaben'] as const).forEach(category => {
      const list = Array.isArray(data[category]) ? data[category] : [];
      list.forEach((raw: any, index: number) => {
        const date = parseIso(String(meta.colDates?.[category]?.[index] || ''));
        if (!within(date, range)) return;
        if (raw === null || raw === undefined || raw === '' || ['e', 'f', 'x', '-'].includes(String(raw).toLocaleLowerCase('de-AT'))) return;

        const primitive = typeof raw === 'object'
          ? mode === 'points'
            ? raw.score ?? raw.punkte ?? raw.grade
            : mode === 'percent'
              ? raw.percent ?? raw.grade
              : raw.grade ?? raw.originalGrade ?? raw.numericGrade ?? raw.val ?? raw.note
          : raw;
        const numeric = Number(String(primitive).replace(',', '.'));
        if (!Number.isFinite(numeric)) return;

        if (mode === 'grades' && numeric >= 1 && numeric <= 5) {
          gradeValues.push(numeric);
          scores.push(((5 - numeric) / 4) * 100);
          return;
        }

        const percent = calculateItemPercent(numeric, mode, getMaxPoints(app, subject, category, index));
        if (percent !== null && Number.isFinite(percent)) scores.push(percent);
      });
    });
  });

  return { mode, gradeValues, scores };
}

function distribution<T>(values: T[], labeler: (value: T) => string) {
  const counts = new Map<string, number>();
  values.forEach(value => {
    const label = labeler(value) || 'Nicht erfasst';
    counts.set(label, (counts.get(label) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de-AT'));
}

export default function ClassDossier({ onSelectStudent }: Props) {
  const { app } = useApp();
  const anyApp = app as any;
  const [period, setPeriod] = useState<PeriodKey>('month');
  const [customFrom, setCustomFrom] = useState(() => iso(addDays(new Date(), -29)));
  const [customTo, setCustomTo] = useState(() => iso(new Date()));

  const students = useMemo(() => [...(app.schueler || [])], [app.schueler]);
  const subjects = useMemo(
    () => faecherFuerKlasse(app).filter(subject => !app.faecher?.length || app.faecher.includes(subject)),
    [app]
  );
  const range = useMemo(
    () => resolveRange(period, anyApp, customFrom, customTo),
    [period, anyApp.schuljahr, customFrom, customTo]
  );
  const compareRange = useMemo(
    () => previousRange(range),
    [range.from.getTime(), range.to.getTime()]
  );

  const calculateRangeMetrics = React.useCallback((targetRange: Range) => {
    const studentRows: StudentPeriodRow[] = students.map(student => {
      const attendance = attendanceForStudent(anyApp, student.id, targetRange);
      const mood = moodForStudent(anyApp, student.id, targetRange);
      const participation = participationForStudent(anyApp, student.id, targetRange);
      const behavior = behaviorForStudent(anyApp, student.id, targetRange);
      const assessments = subjects.map(subject => subjectAssessmentValues(anyApp, student.id, subject, targetRange));
      const grades = assessments.flatMap(value => value.gradeValues);
      const scores = assessments.flatMap(value => value.scores);
      return {
        id: student.id,
        name: `${student.vorname} ${student.nachname}`.trim(),
        attendance: attendance.recorded ? (attendance.present / attendance.recorded) * 100 : null,
        mood: mood.average,
        participation: participation.total,
        grade: mean(grades),
        performance: mean(scores),
        behavior: behavior.average,
      };
    });

    const attendanceTotals = students.reduce<AttendanceTotals>((totals, student) => {
      const value = attendanceForStudent(anyApp, student.id, targetRange);
      totals.recorded += value.recorded;
      totals.present += value.present;
      totals.excused += value.excused;
      totals.unexcused += value.unexcused;
      return totals;
    }, { recorded: 0, present: 0, excused: 0, unexcused: 0 });
    const moodValues = students.flatMap(student => moodForStudent(anyApp, student.id, targetRange).values);
    const behaviorValues = students.flatMap(student => behaviorForStudent(anyApp, student.id, targetRange).values);
    const participationLogs = (anyApp.mitarbeitLogs || []).filter((log: any) =>
      log.kind !== 'social' &&
      Number.isFinite(Number(log.points)) &&
      within(timestampDate(log.timestamp), targetRange)
    );
    const gradeValues = students.flatMap(student =>
      subjects.flatMap(subject => subjectAssessmentValues(anyApp, student.id, subject, targetRange).gradeValues)
    );
    const scoreValues = students.flatMap(student =>
      subjects.flatMap(subject => subjectAssessmentValues(anyApp, student.id, subject, targetRange).scores)
    );
    const positiveBehavior = behaviorValues.filter(value => value >= 4).length;

    return {
      studentRows,
      attendanceTotals,
      attendanceRate: attendanceTotals.recorded ? (attendanceTotals.present / attendanceTotals.recorded) * 100 : null,
      moodAverage: mean(moodValues),
      moodCount: moodValues.length,
      participationTotal: participationLogs.reduce((sum: number, log: any) => sum + Number(log.points || 0), 0),
      participationCount: participationLogs.length,
      gradeAverage: mean(gradeValues),
      scoreAverage: mean(scoreValues),
      behaviorAverage: mean(behaviorValues),
      behaviorCount: behaviorValues.length,
      behaviorPositiveRate: behaviorValues.length ? (positiveBehavior / behaviorValues.length) * 100 : null,
    };
  }, [anyApp, students, subjects]);

  const current = useMemo(
    () => calculateRangeMetrics(range),
    [calculateRangeMetrics, range.from.getTime(), range.to.getTime()]
  );
  const previous = useMemo(
    () => calculateRangeMetrics(compareRange),
    [calculateRangeMetrics, compareRange.from.getTime(), compareRange.to.getTime()]
  );

  const subjectPerformance = useMemo(() => subjects.map(subject => {
    const all = students.map(student => subjectAssessmentValues(anyApp, student.id, subject, range));
    const grades = all.flatMap(value => value.gradeValues);
    const scores = all.flatMap(value => value.scores);
    const averageGrade = mean(grades);
    const averageScore = mean(scores);
    return {
      subject,
      averageGrade,
      averageScore,
      score: averageScore ?? 0,
      display: averageGrade !== null
        ? `Ø ${fmt(averageGrade)}`
        : averageScore !== null
          ? `${fmt(averageScore, 0)} %`
          : '—',
      count: scores.length,
    };
  }), [subjects, students, anyApp, range.from.getTime(), range.to.getTime()]);

  const participationBySubject = useMemo(() => {
    const values = new Map<string, number>();
    (anyApp.mitarbeitLogs || []).forEach((log: any) => {
      if (log.kind === 'social' || !within(timestampDate(log.timestamp), range)) return;
      const subject = String(log.fach || 'Ohne Fach').trim() || 'Ohne Fach';
      values.set(subject, (values.get(subject) || 0) + Number(log.points || 0));
    });
    return [...values.entries()]
      .map(([subject, points]) => ({ subject, points }))
      .sort((a, b) => b.points - a.points);
  }, [anyApp.mitarbeitLogs, range.from.getTime(), range.to.getTime()]);

  const timeline = useMemo(() => {
    const dayCount = Math.max(1, Math.round((range.to.getTime() - range.from.getTime()) / DAY) + 1);
    const step = dayCount > 45 ? 7 : 1;
    const buckets: Array<{ from: Date; to: Date; label: string }> = [];
    for (let cursor = range.from; cursor <= range.to; cursor = addDays(cursor, step)) {
      const bucketTo = new Date(Math.min(addDays(cursor, step - 1).getTime(), range.to.getTime()));
      buckets.push({
        from: cursor,
        to: bucketTo,
        label: cursor.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' }),
      });
    }
    return buckets.map(bucket => {
      const metrics = calculateRangeMetrics({ from: bucket.from, to: bucket.to });
      return {
        label: bucket.label,
        attendance: metrics.attendanceRate,
        mood: metrics.moodAverage,
        behavior: metrics.behaviorAverage,
      };
    });
  }, [range.from.getTime(), range.to.getTime(), calculateRangeMetrics]);

  const genderData = useMemo(
    () => distribution(students, student => getStudentGenderLabel(student.geschlecht)),
    [students]
  );
  const religionData = useMemo(
    () => distribution(students, student => String(student.religion || '').trim() || 'Nicht erfasst'),
    [students]
  );
  const dazCount = students.filter(student => student.daz).length;
  const spfCount = students.filter(student => student.spf || student.espf).length;
  const languages = new Set(students.map(student => String(student.erstsprache || '').trim()).filter(Boolean));

  const activeClass = (anyApp.classes || []).find((entry: any) => entry.id === anyApp.activeClassId);
  const classLabel = activeClass?.name || activeClass?.label || anyApp.klasse || anyApp.klassenname || 'Aktive Klasse';

  const insights = useMemo(() => {
    const items: string[] = [];
    if (current.attendanceRate !== null && previous.attendanceRate !== null) {
      const delta = current.attendanceRate - previous.attendanceRate;
      if (Math.abs(delta) >= 1) {
        items.push(`Anwesenheit ${delta > 0 ? 'steigt' : 'sinkt'} gegenüber dem vorherigen Zeitraum um ${fmt(Math.abs(delta))} Prozentpunkte.`);
      }
    }
    if (current.moodAverage !== null && previous.moodAverage !== null) {
      const delta = current.moodAverage - previous.moodAverage;
      if (Math.abs(delta) >= 0.15) {
        items.push(`Befinden ${delta > 0 ? 'entwickelt sich positiver' : 'liegt niedriger'} als im vorherigen Zeitraum (${delta > 0 ? '+' : ''}${fmt(delta)}).`);
      }
    }
    if (current.behaviorAverage !== null && previous.behaviorAverage !== null) {
      const delta = current.behaviorAverage - previous.behaviorAverage;
      if (Math.abs(delta) >= 0.15) {
        items.push(`Verhalten ${delta > 0 ? 'entwickelt sich positiver' : 'liegt niedriger'} als im vorherigen Zeitraum (${delta > 0 ? '+' : ''}${fmt(delta)}).`);
      }
    }
    if (students.length && current.participationCount > 0) {
      const perChild = current.participationTotal / students.length;
      items.push(`Mitarbeit: ${current.participationCount} Einträge, durchschnittlich ${fmt(perChild)} Punkte pro Kind.`);
    }
    const weakestSubject = subjectPerformance
      .filter(item => item.count > 0)
      .sort((a, b) => (a.averageScore ?? 101) - (b.averageScore ?? 101))[0];
    if (weakestSubject) {
      items.push(`${weakestSubject.subject}: derzeit niedrigster Leistungsstand der datierten Fachwerte (${weakestSubject.display}).`);
    }
    if (!items.length) {
      items.push('Für diesen Zeitraum liegen noch nicht genug Vergleichsdaten für belastbare Hinweise vor.');
    }
    return items.slice(0, 4);
  }, [current, previous, students.length, subjectPerformance]);

  const performanceValue = current.gradeAverage !== null
    ? `Ø ${fmt(current.gradeAverage)}`
    : current.scoreAverage !== null
      ? `${fmt(current.scoreAverage, 0)} %`
      : '—';

  const summaryCards = [
    {
      label: 'Kinder',
      value: String(students.length),
      sub: genderData.map(item => `${item.count} ${item.label}`).join(' · ') || 'Stammdaten noch unvollständig',
      icon: <Users size={18} />,
    },
    {
      label: 'Anwesenheit',
      value: current.attendanceRate === null ? '—' : `${fmt(current.attendanceRate, 0)} %`,
      sub: `${current.attendanceTotals.excused} entsch. · ${current.attendanceTotals.unexcused} unentsch.`,
      icon: <CalendarDays size={18} />,
    },
    {
      label: 'Befinden',
      value: current.moodAverage === null ? '—' : `${fmt(current.moodAverage)} / 5`,
      sub: `${current.moodCount} Rückmeldungen`,
      icon: <Smile size={18} />,
    },
    {
      label: 'Mitarbeit',
      value: current.participationCount ? `${current.participationTotal >= 0 ? '+' : ''}${fmt(current.participationTotal, 0)}` : '—',
      sub: `${current.participationCount} Einträge`,
      icon: <Star size={18} />,
    },
    {
      label: 'Leistung',
      value: performanceValue,
      sub: 'nur datierte Leistungsnachweise',
      icon: <BarChart3 size={18} />,
    },
    {
      label: 'Verhalten',
      value: current.behaviorAverage === null ? '—' : `${fmt(current.behaviorAverage)} / 5`,
      sub: current.behaviorPositiveRate === null
        ? 'Noch keine Einträge'
        : `${current.behaviorCount} Einträge · ${fmt(current.behaviorPositiveRate, 0)} % positiv`,
      icon: <Activity size={18} />,
    },
  ];

  const sortedRows = [...current.studentRows].sort((a, b) => a.name.localeCompare(b.name, 'de-AT'));

  return (
    <div data-class-dossier className="space-y-4">
      <section data-klassio-area className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Klasse · {classLabel}</p>
            <h1 className="mt-1 text-xl font-black tracking-tight text-[var(--text)] sm:text-2xl">Klassendossier</h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-[var(--text2)]">
              Entwicklung der gesamten Klasse auf einen Blick: Anwesenheit, Befinden, Mitarbeit, Leistung und Verhalten.
            </p>
          </div>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-black text-[var(--accent)]">
            {formatRange(range)}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5" role="group" aria-label="Zeitraum im Klassendossier">
          {PERIODS.map(item => (
            <button
              key={item.key}
              type="button"
              data-class-period={item.key}
              aria-pressed={period === item.key}
              onClick={() => setPeriod(item.key)}
              className={`min-h-10 rounded-xl px-3 py-2 text-xs font-bold transition ${
                period === item.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'border border-[var(--border)] bg-[var(--surface2)] text-[var(--text2)] hover:border-[var(--accent)]/40'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="mt-3 grid gap-2 sm:max-w-xl sm:grid-cols-2" data-custom-period>
            <label className="text-xs font-bold text-[var(--text2)]">
              Von
              <input
                type="date"
                value={customFrom}
                onChange={event => setCustomFrom(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              />
            </label>
            <label className="text-xs font-bold text-[var(--text2)]">
              Bis
              <input
                type="date"
                value={customTo}
                onChange={event => setCustomTo(event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)]"
              />
            </label>
          </div>
        )}
      </section>

      <section aria-label="Klassendossier Kennzahlen" className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">
        {summaryCards.map(card => (
          <article
            key={card.label}
            data-class-summary-card
            className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
          >
            <div className="flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-wider text-[var(--text3)]">
              <span className="text-[var(--accent)]">{card.icon}</span>
              {card.label}
            </div>
            <strong className="mt-2 block truncate text-xl font-black text-[var(--text)]">{card.value}</strong>
            <span className="mt-1 block text-[0.68rem] font-semibold leading-snug text-[var(--text3)]">{card.sub}</span>
          </article>
        ))}
      </section>

      <section data-class-insights data-klassio-area className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles size={17} className="text-indigo-600" />
          <h2 className="text-sm font-black text-slate-900">Was fällt auf?</h2>
          <span className="ml-auto text-[0.65rem] font-bold text-slate-500">Vergleich mit {formatRange(compareRange)}</span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {insights.map(item => (
            <p key={item} className="rounded-xl bg-white/80 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700">
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-3" aria-label="Anwesenheit, Befinden und Verhalten im Verlauf">
        <article data-class-chart="attendance" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <CalendarDays size={17} className="text-teal-600" />
              Anwesenheit
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Anteil anwesender erfasster Einheiten</p>
          </div>
          <div className="mt-3 h-48">
            {timeline.some(item => item.attendance !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [`${fmt(Number(value), 0)} %`, 'Anwesenheit']} />
                  <Line type="monotone" dataKey="attendance" stroke="#0f766e" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-semibold text-[var(--text3)]">
                Noch keine Anwesenheitsdaten im Zeitraum.
              </p>
            )}
          </div>
        </article>

        <article data-class-chart="mood" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <Smile size={17} className="text-amber-600" />
              Befinden
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Rückmeldungen aus „Ich bin da“</p>
          </div>
          <div className="mt-3 h-48">
            {timeline.some(item => item.mood !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={24} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [fmt(Number(value)), 'Befinden']} />
                  <Line type="monotone" dataKey="mood" stroke="#d97706" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-semibold text-[var(--text3)]">
                Noch keine Befindens-Rückmeldungen im Zeitraum.
              </p>
            )}
          </div>
        </article>

        <article data-class-chart="behavior" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <Activity size={17} className="text-emerald-600" />
              Verhalten
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Aus den fünf Verhaltensstufen · 5 = sehr positiv</p>
          </div>
          <div className="mt-3 h-48">
            {timeline.some(item => item.behavior !== null) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeline} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={20} />
                  <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={24} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: any) => [fmt(Number(value)), 'Verhalten']} />
                  <Line type="monotone" dataKey="behavior" stroke="#059669" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-semibold text-[var(--text3)]">
                Noch keine Verhaltenseinträge im Zeitraum.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-2" aria-label="Mitarbeit und Leistung nach Fach">
        <article data-class-chart="participation" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <Star size={17} className="text-amber-600" />
              Mitarbeit nach Fach
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Punkte im ausgewählten Zeitraum</p>
          </div>
          <div className="mt-3 h-56">
            {participationBySubject.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={participationBySubject} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis width={28} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="points" name="Mitarbeit" fill="#d97706" radius={[5, 5, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-semibold text-[var(--text3)]">
                Keine Mitarbeitseinträge im Zeitraum.
              </p>
            )}
          </div>
        </article>

        <article data-class-chart="performance" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <BarChart3 size={17} className="text-indigo-600" />
              Leistung nach Fach
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Vergleichbarer Leistungsstand 0–100 · darunter der echte Fachwert</p>
          </div>
          <div className="mt-3 h-56">
            {subjectPerformance.some(item => item.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectPerformance.filter(item => item.count > 0)} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis domain={[0, 100]} width={32} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(_: any, __: any, props: any) => [props?.payload?.display || '—', 'Klassenwert']} />
                  <Bar dataKey="score" name="Leistungsstand" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={34} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-center text-xs font-semibold text-[var(--text3)]">
                Keine datierten Leistungsnachweise im Zeitraum.
              </p>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {subjectPerformance.filter(item => item.count > 0).map(item => (
              <span key={item.subject} className="rounded-lg bg-indigo-50 px-2 py-1 text-[0.65rem] font-bold text-indigo-800">
                {item.subject}: {item.display}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-3 xl:grid-cols-2" aria-label="Klassenstruktur">
        <article data-class-chart="gender" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <Users size={17} className="text-sky-600" />
              Klassenstruktur
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Aggregiert aus den Schülerstammdaten</p>
          </div>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genderData} margin={{ top: 6, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Kinder" fill="#0284c7" radius={[5, 5, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-2">
              <strong className="block text-base text-slate-900">{dazCount}</strong>
              <span className="text-[0.62rem] font-bold text-slate-500">DaZ</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <strong className="block text-base text-slate-900">{spfCount}</strong>
              <span className="text-[0.62rem] font-bold text-slate-500">SPF/eSPF</span>
            </div>
            <div className="rounded-xl bg-slate-50 p-2">
              <strong className="block text-base text-slate-900">{languages.size}</strong>
              <span className="text-[0.62rem] font-bold text-slate-500">Erstsprachen</span>
            </div>
          </div>
        </article>

        <article data-class-chart="religion" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <BookOpen size={17} className="text-violet-600" />
              Religion
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">Nur aggregierte Klassenwerte, keine Einzelnamen</p>
          </div>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={religionData} layout="vertical" margin={{ top: 6, right: 14, left: 14, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="Kinder" fill="#7c3aed" radius={[0, 5, 5, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section data-class-student-table className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-[var(--text)]">
              <Clock3 size={17} />
              Kinder im Blick
            </h2>
            <p className="mt-1 text-xs text-[var(--text3)]">
              Nur Kennzahlen des gewählten Zeitraums · Klick öffnet das Schülerdossier
            </p>
          </div>
          <span className="text-[0.65rem] font-bold text-[var(--text3)]">
            Keine vertraulichen Notiztexte in dieser Übersicht
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-xs">
            <thead>
              <tr className="text-[0.62rem] font-black uppercase tracking-wider text-[var(--text3)]">
                <th className="border-b border-[var(--border)] px-3 py-2">Kind</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Anwesenheit</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Befinden</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Mitarbeit</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Leistung</th>
                <th className="border-b border-[var(--border)] px-3 py-2">Verhalten</th>
                <th className="border-b border-[var(--border)] px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {sortedRows.map(row => (
                <tr key={row.id} className="group hover:bg-[var(--accent-soft)]/25">
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-black text-[var(--text)]">{row.name}</td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-semibold text-[var(--text2)]">
                    {row.attendance === null ? '—' : `${fmt(row.attendance, 0)} %`}
                  </td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-semibold text-[var(--text2)]">
                    {row.mood === null ? '—' : `${fmt(row.mood)} / 5`}
                  </td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-semibold text-[var(--text2)]">
                    {row.participation ? `${row.participation >= 0 ? '+' : ''}${fmt(row.participation, 0)}` : '—'}
                  </td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-semibold text-[var(--text2)]">
                    {row.grade !== null ? `Ø ${fmt(row.grade)}` : row.performance !== null ? `${fmt(row.performance, 0)} %` : '—'}
                  </td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 font-semibold text-[var(--text2)]">
                    {row.behavior === null ? '—' : `${fmt(row.behavior)} / 5`}
                  </td>
                  <td className="border-b border-[var(--border)]/70 px-3 py-2.5 text-right">
                    {onSelectStudent && (
                      <button
                        type="button"
                        onClick={() => onSelectStudent(row.id)}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2.5 font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      >
                        Dossier <ChevronRight size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
