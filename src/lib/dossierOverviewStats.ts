import { behaviorLogDay, collapseDailyBehaviorHistory } from './dailyBehaviorEntries';
import { getStudentAttendanceSummary, getStudentBehaviorSummary } from './studentMetrics';

export function getDossierOverviewStats(app: any, studentId: string, period: 'recent' | 'year', now = new Date()) {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const monday = (d: Date) => { const x = new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()-((x.getDay()+6)%7)); return x; };
  const today = iso(now);
  const year = Number(String(app.schuljahr || '').match(/20\d{2}/)?.[0]) || now.getFullYear()-(now.getMonth()<7?1:0);
  const from = period === 'year' ? new Date(year,7,1) : monday(new Date(now.getFullYear(),now.getMonth(),now.getDate()-35));
  const start = iso(from);
  const stages = getStudentBehaviorSummary(app, studentId).stages;
  const weeks: Array<{date: string; label: string; mood: number|null; moodCount: number; behaviorCount: number; stages: Record<string,number>; excused: number; unexcused: number; attendanceCount: number}> = [];
  for (let d=monday(from); iso(d)<=today; d.setDate(d.getDate()+7)) weeks.push({date:iso(d),label:d.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}),mood:null,moodCount:0,behaviorCount:0,stages:{},excused:0,unexcused:0,attendanceCount:0});
  const bucket = (day: string) => day>=start && day<=today ? weeks.find(w=>w.date===iso(monday(new Date(day+'T12:00:00')))) : undefined;
  const logs = collapseDailyBehaviorHistory(app.statusLog || [],studentId).filter(e=>bucket(behaviorLogDay(e)));
  logs.forEach(e=>{const w=bucket(behaviorLogDay(e))!; if (!stages.some((s:any)=>s.id===e.iconId)) return; w.stages[e.iconId]=(w.stages[e.iconId]||0)+1; w.behaviorCount++;});
  const moods = Object.entries(app.schuelerStimmung?.[studentId] || {}).filter(([day,value])=>bucket(day)&&Number.isFinite(Number(value))&&Number(value)>=1&&Number(value)<=5).sort(([a],[b])=>b.localeCompare(a));
  moods.forEach(([day,value])=>{const w=bucket(day)!; w.mood=((w.mood||0)*w.moodCount+Number(value))/(++w.moodCount);});
  const attendanceDates = new Set([...Object.keys(app.anwesenheit?.[studentId]||{}),...Object.keys(app.anwesenheitDetail?.[studentId]||{})]);
  attendanceDates.forEach(day=>{const w=bucket(day); if(!w)return; const summary=getStudentAttendanceSummary({anwesenheit:{[studentId]:{[day]:app.anwesenheit?.[studentId]?.[day]}},anwesenheitDetail:{[studentId]:{[day]:app.anwesenheitDetail?.[studentId]?.[day]}}},studentId); w.excused+=summary.excused; w.unexcused+=summary.unexcused; w.attendanceCount++;});
  return {weeks,stages,logs, latestBehavior:logs[0], latestMood:moods[0], moodCount:moods.length, excused:weeks.reduce((n,w)=>n+w.excused,0),unexcused:weeks.reduce((n,w)=>n+w.unexcused,0),attendanceCount:weeks.reduce((n,w)=>n+w.attendanceCount,0),start,today};
}

/** Calendar dates, including both ends; local date increments preserve DST days. */
export function getDossierPeriodDays(start: string, today: string): string[] {
  const days: string[] = [];
  const date = new Date(start + 'T12:00:00');
  const end = new Date(today + 'T12:00:00');
  if (!Number.isFinite(date.getTime()) || !Number.isFinite(end.getTime())) return days;
  while (date <= end) {
    const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    days.push(day);
    date.setDate(date.getDate()+1);
  }
  return days;
}

export function getDossierParticipationTimeline(
  entries: Array<{ timestamp: string; points: number }>,
  range: Pick<ReturnType<typeof getDossierOverviewStats>, 'start' | 'today' | 'weeks'>,
  period: 'recent' | 'year',
) {
  const selected = entries.filter(entry => {
    const date = new Date(entry.timestamp);
    if (!Number.isFinite(date.getTime()) || !Number.isFinite(entry.points)) return false;
    const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    return day >= range.start && day <= range.today;
  });
  const buckets = new Map<string, { label: string; points: number }>();
  if (period === 'recent') {
    range.weeks.forEach(week => buckets.set(week.date, {label: week.label, points: 0}));
  } else {
    getDossierPeriodDays(range.start, range.today).forEach(day => {
      const key = day.slice(0,7);
      if (!buckets.has(key)) buckets.set(key, {
        label: new Date(day+'T12:00:00').toLocaleDateString('de-AT',{month:'short'}), points: 0,
      });
    });
  }
  selected.forEach(entry => {
    const date = new Date(entry.timestamp);
    if (period === 'recent') date.setDate(date.getDate()-((date.getDay()+6)%7));
    const day = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const bucket = buckets.get(period === 'recent' ? day : day.slice(0,7));
    if (bucket) bucket.points += entry.points;
  });
  return { timeline: [...buckets.values()], count: selected.length, total: selected.reduce((sum,entry)=>sum+entry.points,0) };
}
