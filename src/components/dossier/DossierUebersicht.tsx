import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, CalendarDays, Clock, Smile, Plus, Star } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { faecherFuerKlasse } from '../../lib/sek1Subjects';
import { berechne, calculateItemPercent, getAssessmentMode, getMaxPoints } from '../../lib/GradeUtils';
import { getStudentNotes } from '../../lib/studentMetrics';
import { getDossierOverviewStats, getDossierPeriodDays, getDossierParticipationTimeline } from '../../lib/dossierOverviewStats';
import { getMoodMeta } from '../../lib/moodTypes';
import { behaviorLogDay } from '../../lib/dailyBehaviorEntries';
import { getStudentSubjectParticipationSummary } from '../../lib/studentParticipation';
import { getStudentHomeworkSummary } from '../../lib/studentHomework';

interface Props {
  student: Student;
  semester: '1'|'2';
  onTabChange: (tab:any)=>void;
  onSubjectSelect?: (fach:string)=>void;
  onQuickEntry?: (type:'note'|'strength'|'parent'|'goal')=>void;
}

type AttendanceHeatStatus = 'present'|'excused'|'unexcused'|'empty'|'weekend';

const dateLabel=(date?:string)=>date ? new Date(date+'T12:00:00').toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}) : '';
const noteDateLabel=(note:any)=>{
  const raw=note?.datum ?? note?.date ?? note?.timestamp;
  if (raw===null || raw===undefined || raw==='') return 'Ohne Datum';
  if (typeof raw==='number') return new Date(raw).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'});
  const text=String(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return dateLabel(text.slice(0,10));
  if (/^\d{10,}$/.test(text)) return new Date(Number(text)).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'});
  const parsed=new Date(text);
  return Number.isNaN(parsed.getTime())?'Ohne Datum':parsed.toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'});
};
const noteDisplayMeta=(note:any)=>{
  const category=String(note?.kategorie||'Notiz').trim();
  const subject=String(note?.fach||'').trim();
  const art=String(note?.art||'neutral');
  if (/eltern/i.test(category)) return {label:'Elternkontakt', badge:'bg-sky-50 text-sky-800 border-sky-100'};
  if (subject) return {label:'Fachnotiz', badge:'bg-indigo-50 text-indigo-800 border-indigo-100'};
  if (/journal|reflexion/i.test(category)) return {label:'Journal', badge:'bg-violet-50 text-violet-800 border-violet-100'};
  if (art==='positiv') return {label:'Positive Beobachtung', badge:'bg-emerald-50 text-emerald-800 border-emerald-100'};
  if (art==='beobachten') return {label:'Beobachten', badge:'bg-amber-50 text-amber-800 border-amber-100'};
  return {label:'Beobachtung', badge:'bg-slate-50 text-slate-700 border-slate-200'};
};

export default function DossierUebersicht({student,semester,onTabChange,onSubjectSelect,onQuickEntry}:Props) {
  const {app}=useApp();
  const [period,setPeriod]=useState<'recent'|'year'>('recent');
  const trendStats=useMemo(()=>getDossierOverviewStats(app,student.id,period),[app,student.id,period]);
  const yearStats=useMemo(()=>getDossierOverviewStats(app,student.id,'year'),[app,student.id]);
  const subjects=faecherFuerKlasse(app).filter(f=>!app.faecher?.length||app.faecher.includes(f));
  const allNotes=getStudentNotes(app,student.id);
  const notes=allNotes.slice(0,5);
  const classroomRows=subjects.map(fach=>({
    fach,
    participation:getStudentSubjectParticipationSummary(app,student.id,fach,semester),
    homework:getStudentHomeworkSummary(app,student.id,fach,semester),
  }));
  const participationSubjects=classroomRows.filter(row=>row.participation.hasData).length;
  const trackedHomeworkSubjects=classroomRows.filter(row=>row.homework.tracked).length;
  const missingHomework=classroomRows.reduce((sum,row)=>sum+(row.homework.tracked?row.homework.missing:0),0);
  const latestStage=yearStats.stages.find((s:any)=>s.id===yearStats.latestBehavior?.iconId);
  const mood=yearStats.latestMood ? getMoodMeta(Number(yearStats.latestMood[1])) : undefined;
  const trendLatestStage=trendStats.stages.find((s:any)=>s.id===trendStats.latestBehavior?.iconId);
  const trendMood=trendStats.latestMood ? getMoodMeta(Number(trendStats.latestMood[1])) : undefined;
  const todayAttendance=app.anwesenheit?.[student.id]?.[yearStats.today];
  const todayDetail=app.anwesenheitDetail?.[student.id]?.[yearStats.today];
  const todayValues=typeof todayAttendance==='string'?[todayAttendance]:Object.values(todayAttendance||{});
  const todayHasDetailedAbsence=Number(todayDetail?.fehlstunden||0)>0;
  const todayStatus=todayValues.includes('u')?'Unentschuldigt':todayValues.includes('e')?'Entschuldigt':todayHasDetailedAbsence?(todayDetail?.notiz==='Unentschuldigt'?'Unentschuldigt':'Entschuldigt'):todayValues.some(v=>['a','da','v'].includes(String(v)))?'Anwesend':'Heute noch nicht erfasst';
  const openSubject=(fach:string)=>onSubjectSelect?onSubjectSelect(fach):onTabChange('leistungen');
  const totalParticipation=classroomRows.reduce((sum,row)=>sum+row.participation.total,0);
  const participationEntries=classroomRows.flatMap(row=>row.participation.entries);

  const subjectCards=subjects.map(fach=>{
    const mode=getAssessmentMode(app,fach);
    const nd:any=app.noten?.[student.id]?.[fach]?.[semester]||{};
    const meta:any=app.notenMeta?.[fach]||{};
    const avg=berechne(app,student.id,fach,semester);
    const final=nd.endnote;
    const hasFinal=mode==='grades'&&final!==undefined&&final!==null&&String(final).trim()!==''&&String(final)!=='—';
    const display=hasFinal?String(final):avg===null?'Noch keine Bewertung':`${avg.toFixed(1).replace('.',',')}${mode==='percent'?' %':mode==='points'?' % · Punktebasis':''}`;
    const currentNumeric=hasFinal?Number(String(final).replace(',','.')):avg;
    const normalizedCurrent=currentNumeric===null||!Number.isFinite(Number(currentNumeric))?null:mode==='grades'?Math.max(0,Math.min(100,((5-Number(currentNumeric))/4)*100)):Math.max(0,Math.min(100,Number(currentNumeric)));
    const assessments:{score:number;date:string;order:number}[]=[];
    let assessmentCount=0;
    let order=0;
    (['sa','lzk','wp','aufgaben'] as const).forEach(category=>{
      const list=Array.isArray(nd[category])?nd[category]:[];
      list.forEach((raw:any,idx:number)=>{
        if(raw===null||raw===undefined||raw===''||['e','f','x','-'].includes(String(raw).toLowerCase())){order++;return;}
        assessmentCount++;
        const primitive=typeof raw==='object'?(mode==='points'?(raw.score??raw.punkte??raw.grade):(mode==='percent'?(raw.percent??raw.grade):(raw.grade??raw.originalGrade??raw.numericGrade??raw.val??raw.note))):raw;
        const numeric=Number(String(primitive).replace(',','.'));
        if(!Number.isFinite(numeric)){order++;return;}
        let score:number|null=null;
        if(mode==='grades'&&numeric>=1&&numeric<=5) score=((5-numeric)/4)*100;
        else score=calculateItemPercent(numeric,mode,getMaxPoints(app,fach,category,idx));
        if(score!==null) assessments.push({score,date:String(meta.colDates?.[category]?.[idx]||''),order});
        order++;
      });
    });
    assessments.sort((a,b)=>a.date&&b.date?a.date.localeCompare(b.date):a.order-b.order);
    const trendValues=assessments.slice(-6).map(item=>item.score);
    const delta=trendValues.length>1?trendValues[trendValues.length-1]-trendValues[0]:null;
    const trendLabel=delta===null?'Trend ab 2 Nachweisen':delta>7?'↗ verbessert':delta<-7?'↘ rückläufig':'→ stabil';
    const classroom=classroomRows.find(row=>row.fach===fach)!;
    return {fach,mode,display,hasFinal,avg,normalizedCurrent,trendValues,trendLabel,assessmentCount,participation:classroom.participation,homework:classroom.homework};
  });

  const assessedSubjects=subjectCards.filter(card=>card.avg!==null||card.hasFinal).length;
  const totalAssessments=subjectCards.reduce((sum,cardData)=>sum+cardData.assessmentCount,0);
  const homeworkCoreText=trackedHomeworkSubjects===0?'HÜ noch nicht erfasst':missingHomework>0?`${missingHomework} fehlende HÜ`:'keine fehlenden HÜ';

  const participationPeriod=useMemo(
    ()=>getDossierParticipationTimeline(participationEntries,trendStats,period),
    [participationEntries,trendStats,period]
  );
  const participationTimeline=participationPeriod.timeline;

  const wellbeingTimeline=useMemo(()=>trendStats.weeks.map((week:any)=>{
    let count=0;
    let weighted=0;
    trendStats.stages.forEach((stage:any,index:number)=>{
      const stageCount=Number(week.stages?.[stage.id]||0);
      count+=stageCount;
      weighted+=stageCount*(index+1);
    });
    return {...week,behavior:count?weighted/count:null};
  }),[trendStats]);

  const attendanceHeatmap=useMemo(()=>{
    const attendance=(app.anwesenheit?.[student.id]||{}) as Record<string,any>;
    const details=(app.anwesenheitDetail?.[student.id]||{}) as Record<string,any>;
    return getDossierPeriodDays(trendStats.start,trendStats.today).map(key=>{
      const date=new Date(key+'T12:00:00');
      const raw=attendance[key];
      const values=typeof raw==='string'?[raw]:Object.values(raw||{}).map(String);
      const detail=details[key];
      const hasDetailedAbsence=Number(detail?.fehlstunden||0)>0;
      const weekend=date.getDay()===0||date.getDay()===6;
      let status:AttendanceHeatStatus=weekend?'weekend':'empty';
      if(values.includes('u')||detail?.notiz==='Unentschuldigt') status='unexcused';
      else if(values.includes('e')||hasDetailedAbsence) status='excused';
      else if(values.some(value=>['a','da','v'].includes(value))) status='present';
      return {key,status,label:date.toLocaleDateString('de-AT',{weekday:'short',day:'2-digit',month:'2-digit'})};
    });
  },[app.anwesenheit,app.anwesenheitDetail,student.id,trendStats.start,trendStats.today]);

  const attendanceTone:Record<AttendanceHeatStatus,string>={
    present:'bg-teal-500',
    excused:'bg-amber-300',
    unexcused:'bg-rose-500',
    empty:'bg-slate-100',
    weekend:'bg-slate-50 ring-1 ring-inset ring-slate-100',
  };
  const chartAxes=<><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" tick={{fontSize:10}} axisLine={false} tickLine={false} minTickGap={20}/></>;
  const card='min-w-0 rounded-2xl border border-slate-200 bg-white p-4';

  return <div className="space-y-4" data-dossier-overview>
    <section data-dossier-cockpit data-klassio-area aria-label="Schnellüberblick" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Auf einen Blick</p>
          <h2 className="mt-0.5 text-lg font-black text-slate-900">Wie läuft es gerade?</h2>
        </div>
        <span className="text-[0.68rem] font-semibold text-slate-500">Ganzes Schuljahr · Details per Klick</span>
      </div>
      <div aria-label="Kernüberblick" className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <button data-dossier-summary-card data-klassio-interactive type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-xl border border-teal-100 bg-white p-3 text-left transition hover:border-teal-200">
          <span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-teal-700"><CalendarDays size={14}/>Anwesenheit</span>
          <strong className="mt-2 block truncate text-base font-black text-slate-900">{todayStatus}</strong>
          <span className="mt-1 block text-[0.68rem] leading-snug text-slate-500">{yearStats.excused+yearStats.unexcused} Fehlstunden im Schuljahr</span>
        </button>
        <button data-dossier-summary-card data-klassio-interactive type="button" onClick={()=>onTabChange('leistungen')} className="rounded-xl border border-amber-100 bg-white p-3 text-left transition hover:border-amber-200">
          <span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-amber-700"><Star size={14}/>Mitarbeit</span>
          <strong className="mt-2 block text-lg font-black text-slate-900">{totalParticipation} ★</strong>
          <span className="mt-1 block text-[0.68rem] leading-snug text-slate-500">{participationSubjects}/{subjects.length||0} Fächer mit Einträgen</span>
        </button>
        <button data-dossier-summary-card data-klassio-interactive type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-xl border border-violet-100 bg-white p-3 text-left transition hover:border-violet-200">
          <span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-violet-700"><Activity size={14}/>Verhalten & Befinden</span>
          <strong className="mt-2 block truncate text-sm font-black text-slate-900">{latestStage?latestStage.icon+' '+latestStage.label:'Noch kein Verhalten'}</strong>
          <span className="mt-1 block truncate text-[0.68rem] text-slate-500">{mood?mood.emoji+' '+mood.label:`${yearStats.moodCount} Befindens-Rückmeldungen`}</span>
        </button>
        <button data-dossier-summary-card data-klassio-interactive type="button" onClick={()=>onTabChange('leistungen')} className="rounded-xl border border-indigo-100 bg-white p-3 text-left transition hover:border-indigo-200">
          <span className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-wider text-indigo-700"><BarChart3 size={14}/>Lernentwicklung</span>
          <strong className="mt-2 block text-lg font-black text-slate-900">{assessedSubjects}/{subjects.length||0} Fächer</strong>
          <span className={`mt-1 block text-[0.68rem] leading-snug ${missingHomework>0?'font-semibold text-rose-700':'text-slate-500'}`}>{totalAssessments} Nachweise · {homeworkCoreText}</span>
        </button>
      </div>
    </section>

    <section aria-label="Mitarbeit, Verhalten, Befinden & Anwesenheit" className="space-y-3" data-klassio-area>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Mitarbeit, Verhalten, Befinden & Anwesenheit</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Verläufe, die etwas sagen</h2>
          <p className="mt-1 text-xs text-slate-500">Zeitverlauf statt dekorativer Kennzahlen · Werte per Tipp oder Mauszeiger</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Zeitraum der Alltagsdiagramme">
          {([['recent','6 Wochen'],['year','Schuljahr']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={period===key} onClick={()=>setPeriod(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${period===key?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{label}</button>)}
        </div>
      </div>
      <div className="grid gap-3 xl:grid-cols-3">
        <section className={card} data-dossier-trend-card="participation">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Star size={17} className="text-amber-600"/>Mitarbeit</h3><p className="mt-1 text-[0.68rem] text-slate-500">Punkte im gewählten Zeitraum</p></div>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[0.68rem] font-bold text-amber-800">{participationPeriod.total} ★ im Zeitraum</span>
          </div>
          <div className="mt-3 h-32">{participationTimeline.some(item=>item.points!==0)?<ResponsiveContainer width="100%" height="100%"><BarChart data={participationTimeline} margin={{top:4,right:4,left:-8,bottom:0}}>{chartAxes}<YAxis allowDecimals={false} width={22} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="points" name="Mitarbeit" fill="#d97706" radius={[5,5,0,0]} maxBarSize={24}/></BarChart></ResponsiveContainer>:<p className="flex h-full items-center justify-center text-xs text-slate-400">Keine Mitarbeitseinträge im Zeitraum</p>}</div>
          <p className="mt-2 text-[0.65rem] text-slate-500">{participationPeriod.count} protokollierte Einträge im Zeitraum</p>
        </section>

        <section className={card} data-dossier-trend-card="wellbeing">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity size={17} className="text-violet-600"/>Verhalten & Befinden</h3><p className="mt-1 text-[0.68rem] text-slate-500">Gemeinsamer Verlauf ohne Kreisdiagramm</p></div>
            <span className="max-w-[10rem] rounded-full bg-violet-50 px-2.5 py-1 text-right text-[0.68rem] font-bold text-violet-800">{trendLatestStage?trendLatestStage.icon+' '+trendLatestStage.label:trendMood?trendMood.emoji+' '+trendMood.label:'Noch nicht erfasst'}</span>
          </div>
          <div className="mt-3 h-32">{trendStats.logs.length||trendStats.moodCount?<ResponsiveContainer width="100%" height="100%"><LineChart data={wellbeingTimeline} margin={{top:4,right:4,left:-8,bottom:0}}>{chartAxes}<YAxis domain={[1,Math.max(5,trendStats.stages.length)]} ticks={[1,3,5]} width={22} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(value:any,name:any)=>name==='Befinden'?[Number(value).toFixed(1),'Befinden']:[Number(value).toFixed(1),'Verhalten']}/><Line dataKey="behavior" name="Verhalten" stroke="#7c3aed" strokeWidth={2.5} dot={{r:2.5}} connectNulls={false}/><Line dataKey="mood" name="Befinden" stroke="#d97706" strokeWidth={2} strokeDasharray="5 4" dot={{r:2}} connectNulls={false}/></LineChart></ResponsiveContainer>:<p className="flex h-full items-center justify-center text-xs text-slate-400">Noch keine Verlaufsdaten im Zeitraum</p>}</div>
          <p className="mt-2 text-[0.65rem] text-slate-500">{trendStats.latestBehavior?'Letzter Eintrag: '+dateLabel(behaviorLogDay(trendStats.latestBehavior)):'Noch kein Verhalten dokumentiert'} · {trendStats.moodCount} Befindens-Rückmeldungen im Zeitraum</p>
        </section>

        <section className={card} data-dossier-trend-card="attendance">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays size={17} className="text-teal-600"/>Anwesenheit</h3><p className="mt-1 text-[0.68rem] text-slate-500">Kalender statt weiterer Balken</p></div>
            <span className="max-w-[9rem] rounded-full bg-teal-50 px-2.5 py-1 text-right text-[0.68rem] font-bold text-teal-800">{todayStatus}</span>
          </div>
          <div className="mt-4 grid max-h-48 gap-1 overflow-y-auto" data-attendance-heatmap data-period-start={trendStats.start} data-period-end={trendStats.today} role="group" tabIndex={0} aria-label="Anwesenheitskalender">
            {attendanceHeatmap.map(day=><span key={day.key} data-attendance-day data-date={day.key} title={`${day.label}: ${day.status==='present'?'anwesend':day.status==='excused'?'entschuldigt':day.status==='unexcused'?'unentschuldigt':day.status==='weekend'?'Wochenende':'nicht erfasst'}`} aria-label={`${day.label}: ${day.status}`} className={`${attendanceTone[day.status]} block`}/>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.62rem] font-semibold text-slate-500"><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-teal-500"/>anwesend</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-amber-300"/>entschuldigt</span><span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-rose-500"/>unentschuldigt</span></div>
          <p className="mt-2 text-[0.65rem] text-slate-500">{trendStats.excused} entschuldigt · {trendStats.unexcused} unentschuldigt</p>
        </section>
      </div>
      <div className="flex justify-end"><button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="text-xs font-semibold text-indigo-700 hover:underline">Alle Beobachtungen & Verlaufsdaten öffnen <ArrowRight size={13} className="inline"/></button></div>
    </section>

    <section className={card} aria-label="Notenstand aller Fächer" data-dossier-subject-grid data-klassio-area>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="flex items-center gap-2 text-base font-black text-slate-900"><BarChart3 size={18} className="text-indigo-600"/>Alle Fächer auf einen Blick</h2><p className="mt-1 text-xs text-slate-500">Bewertung, Trend, Mitarbeit und Hausübungen direkt pro Fach.</p></div>
        <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Alle Bewertungen <ArrowRight size={14} className="inline"/></button>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {subjectCards.map(cardData=>{
          const points=cardData.trendValues.length>1?cardData.trendValues.map((value,index,all)=>`${(index/(all.length-1))*100},${27-(Math.max(0,Math.min(100,value))*0.22)}`).join(' '):'';
          const participationText=cardData.participation.hasData?`${cardData.participation.total} ★ Mitarbeit`:'Mitarbeit —';
          const homeworkText=!cardData.homework.tracked?'HÜ —':cardData.homework.missing===0?'HÜ ✓':`${cardData.homework.missing} fehlende HÜ`;
          return <button key={cardData.fach} type="button" onClick={()=>openSubject(cardData.fach)} className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><span className="block truncate text-sm font-black text-slate-900">{cardData.fach}</span><span className="mt-0.5 block text-[0.62rem] font-semibold text-slate-400">{cardData.mode==='grades'?'Noten 1–5':cardData.mode==='percent'?'Prozent':'Punkte'}</span></div>
              <div className="shrink-0 text-right"><strong className={`block text-base font-black ${cardData.avg===null&&!cardData.hasFinal?'text-slate-400':'text-indigo-700'}`}>{cardData.hasFinal?'Endnote ':cardData.mode==='grades'&&cardData.avg!==null?'Ø ':''}{cardData.display}</strong><span className="text-[0.62rem] font-semibold text-slate-500">{cardData.trendLabel}</span></div>
            </div>
            <div className="mt-3 grid grid-cols-[1fr_5.5rem] items-center gap-3">
              <div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" aria-label={`Bewertungsstand ${cardData.fach}`}><div className="h-full rounded-full bg-indigo-500 transition-all" style={{width:`${cardData.normalizedCurrent??0}%`}}/></div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-slate-600"><span>{cardData.assessmentCount} {cardData.assessmentCount===1?'Nachweis':'Nachweise'}</span><span className={cardData.participation.hasData?'':'text-slate-400'}>{participationText}</span><span className={!cardData.homework.tracked?'text-slate-400':cardData.homework.missing>0?'font-bold text-rose-700':''}>{homeworkText}</span></div>
              </div>
              <div data-subject-sparkline className="h-9 text-indigo-500">{points?<svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-label={`Verlauf ${cardData.fach}`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="100" cy={27-(Math.max(0,Math.min(100,cardData.trendValues[cardData.trendValues.length-1]))*0.22)} r="3" fill="currentColor"/></svg>:<div className="flex h-full items-center justify-center rounded-lg bg-slate-50 px-1 text-center text-[0.58rem] font-semibold leading-tight text-slate-400">Trend ab 2</div>}</div>
            </div>
          </button>;
        })}
      </div>
      {!subjects.length&&<p className="text-sm text-slate-500">Noch keine Fächer ausgewählt.</p>}
    </section>

    <section className={card} aria-label="Aktuelle Notizen" data-klassio-area>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Clock size={17}/>Aktuelle Notizen</h3>
          <p className="mt-1 text-xs text-slate-500">{allNotes.length ? allNotes.length+' Einträge insgesamt · die neuesten 5 hier im Überblick' : 'Beobachtungen, Fachnotizen und Elternkontakte an einem Ort'}</p>
        </div>
        <div className="flex flex-wrap gap-1.5" aria-label="Eintrag hinzufügen">
          <button type="button" onClick={()=>onQuickEntry?onQuickEntry('note'):onTabChange('beobachtungen_verlauf')} className="flex min-h-9 items-center gap-1 rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"><Plus size={13}/>Notiz</button>
          <button type="button" onClick={()=>onQuickEntry?onQuickEntry('parent'):onTabChange('beobachtungen_verlauf')} className="min-h-9 rounded-lg bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100">+ Elternkontakt</button>
        </div>
      </div>
      {notes.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-100">
          {notes.map((n:any,index:number)=>{
            const meta=noteDisplayMeta(n);
            const content=String(n.inhalt||n.notiz||n.text||n.titel||'Ohne Text');
            const subject=String(n.fach||'').trim();
            const category=String(n.kategorie||'').trim();
            return <button key={n.id||String(n.timestamp||n.datum||index)+'-'+content} type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="grid w-full gap-2 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-start">
              <span className="pt-0.5 text-[0.68rem] font-semibold text-slate-500">{noteDateLabel(n)}</span>
              <span className="min-w-0">
                <span className="line-clamp-2 block text-sm leading-snug text-slate-800">{content}</span>
                <span className="mt-1 flex flex-wrap gap-1.5 text-[0.65rem] text-slate-500">{subject&&<span className="rounded bg-indigo-50 px-1.5 py-0.5 font-semibold text-indigo-700">{subject}</span>}{category&&category!==meta.label&&<span>{category}</span>}</span>
              </span>
              <span className={'w-fit rounded-full border px-2 py-1 text-[0.62rem] font-bold '+meta.badge}>{meta.label}</span>
            </button>;
          })}
        </div>
      ) : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Noch keine Notizen dokumentiert.</p>}
      <div className="mt-3 flex justify-end"><button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="text-xs font-semibold text-indigo-700 hover:underline">Alle Notizen öffnen <ArrowRight size={13} className="inline"/></button></div>
    </section>
  </div>;
}
