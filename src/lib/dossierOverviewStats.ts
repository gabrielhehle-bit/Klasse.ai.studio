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
  return {weeks,stages,logs, latestBehavior:collapseDailyBehaviorHistory(app.statusLog||[],studentId).find(e=>behaviorLogDay(e)>=iso(new Date(year,7,1))&&behaviorLogDay(e)<=today), latestMood:Object.entries(app.schuelerStimmung?.[studentId]||{}).filter(([day,value])=>day>=iso(new Date(year,7,1))&&day<=today&&Number(value)>=1&&Number(value)<=5).sort(([a],[b])=>b.localeCompare(a))[0], moodCount:moods.length, excused:weeks.reduce((n,w)=>n+w.excused,0),unexcused:weeks.reduce((n,w)=>n+w.unexcused,0),attendanceCount:weeks.reduce((n,w)=>n+w.attendanceCount,0),today};
}
