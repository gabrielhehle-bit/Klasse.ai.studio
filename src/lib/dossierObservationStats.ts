import { behaviorLogDay, collapseDailyBehaviorHistory } from './dailyBehaviorEntries';
import { getStudentBehaviorSummary } from './studentMetrics';

export type ObservationPeriod = 'recent' | 'year';
export const ATTENDANCE_LABELS = { present: 'Anwesend', mixed: 'Teilweise abwesend', excused: 'Entschuldigt', unexcused: 'Unentschuldigt', unknown: 'Ohne Status' };
export type AttendanceKind = keyof typeof ATTENDANCE_LABELS;
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const validDay = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) && iso(new Date(day+'T12:00:00')) === day;
const monday = (d: Date) => { const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); x.setDate(x.getDate()-(x.getDay()+6)%7); return x; };
export const observationDateLabel = (day: string) => new Date(day+'T12:00:00').toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'});

export function getDossierObservationStats(app: any, studentId: string, period: ObservationPeriod, now=new Date()) {
  const year=Number(String(app.schuljahr||'').match(/20\d{2}/)?.[0]) || now.getFullYear()-(now.getMonth()<7?1:0);
  const schoolStart=iso(new Date(year,7,1));
  const schoolEnd=iso(new Date(year+1,6,31));
  const end=[iso(now),schoolEnd].sort()[0];
  const start=period==='year'?schoolStart:[schoolStart,iso(monday(new Date(now.getFullYear(),now.getMonth(),now.getDate()-35)))].sort().at(-1)!;
  const inRange=(day: string) => validDay(day)&&day>=start&&day<=end;
  const stages=getStudentBehaviorSummary(app,studentId).stages as Array<{id:string;label:string;icon:string;color:string}>;
  const behavior=collapseDailyBehaviorHistory(app.statusLog||[],studentId).filter(log=>inRange(behaviorLogDay(log))).map(log=>({...log,date:behaviorLogDay(log)}));
  const moods=Object.entries(app.schuelerStimmung?.[studentId]||{}).filter(([date,value])=>inRange(date)&&Number.isInteger(Number(value))&&Number(value)>=1&&Number(value)<=5).map(([date,value])=>({date,value:Number(value)})).sort((a,b)=>b.date.localeCompare(a.date));
  const dates=new Set<string>([...Object.keys(app.anwesenheit?.[studentId]||{}),...Object.keys(app.anwesenheitDetail?.[studentId]||{})]);
  const attendance=Array.from(dates).filter(inRange).map(date=>{
    const raw=app.anwesenheit?.[studentId]?.[date];
    const values=typeof raw==='string'?[raw]:Object.values(raw||{});
    const detail=app.anwesenheitDetail?.[studentId]?.[date]||{};
    const present=values.some(v=>['a','da','v'].includes(String(v)));
    const excused=values.some(v=>v==='e'||v==='k');
    const unexcused=values.includes('u');
    const missedHours=Number(detail.fehlstunden)||0;
    let kind:AttendanceKind='unknown';
    if(present&&(excused||unexcused||missedHours>0))kind='mixed';
    else if(unexcused)kind='unexcused';
    else if(excused)kind='excused';
    else if(missedHours>0)kind=detail.notiz==='Unentschuldigt'?'unexcused':'excused';
    else if(present)kind='present';
    return {date,kind,note:String(detail.notiz||''),missedHours};
  }).sort((a,b)=>b.date.localeCompare(a.date));
  const weeks:Array<{date:string;label:string;stages:Record<string,number>;behaviorCount:number;unknownBehavior:number;mood:number|null;moodCount:number;present:number;mixed:number;excused:number;unexcused:number;unknown:number}>=[];
  for(let d=monday(new Date(start+'T12:00:00'));iso(d)<=end;d.setDate(d.getDate()+7))weeks.push({date:iso(d),label:observationDateLabel(iso(d)),stages:{},behaviorCount:0,unknownBehavior:0,mood:null,moodCount:0,present:0,mixed:0,excused:0,unexcused:0,unknown:0});
  const bucket=(date:string)=>weeks.find(w=>w.date===iso(monday(new Date(date+'T12:00:00'))))!;
  behavior.forEach(log=>{const w=bucket(log.date);if(stages.some(s=>s.id===log.iconId))w.stages[log.iconId]=(w.stages[log.iconId]||0)+1;else w.unknownBehavior++;w.behaviorCount++;});
  moods.forEach(m=>{const w=bucket(m.date);w.mood=((w.mood||0)*w.moodCount+m.value)/(++w.moodCount);});
  attendance.forEach(a=>bucket(a.date)[a.kind]++);
  return {start,end,stages,behavior,moods,attendance,weeks};
}
