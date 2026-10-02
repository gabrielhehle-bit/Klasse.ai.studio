import React, { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, CalendarDays, Clock, Smile, Plus, Star, ClipboardCheck } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import { faecherFuerKlasse } from '../../lib/sek1Subjects';
import { berechne, getAssessmentMode } from '../../lib/GradeUtils';
import { getStudentNotes } from '../../lib/studentMetrics';
import { getDossierOverviewStats } from '../../lib/dossierOverviewStats';
import { getMoodMeta } from '../../lib/moodTypes';
import { behaviorLogDay } from '../../lib/dailyBehaviorEntries';
import { getStudentSubjectParticipationSummary } from '../../lib/studentParticipation';
import { getStudentHomeworkSummary } from '../../lib/studentHomework';

interface Props { student: Student; semester: '1'|'2'; onTabChange: (tab:any)=>void; onSubjectSelect?: (fach:string)=>void; onQuickEntry?: (type:'note'|'strength'|'parent'|'goal')=>void; }
const dateLabel=(date?:string)=>date ? new Date(date+'T12:00:00').toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'}) : '';
export default function DossierUebersicht({student,semester,onTabChange,onSubjectSelect,onQuickEntry}:Props) {
  const {app}=useApp();
  const [period,setPeriod]=useState<'recent'|'year'>('recent');
  const stats=useMemo(()=>getDossierOverviewStats(app,student.id,period),[app,student.id,period]);
  const subjects=faecherFuerKlasse(app).filter(f=>!app.faecher?.length||app.faecher.includes(f));
  const notes=getStudentNotes(app,student.id).slice(0,5);
  const classroomRows=subjects.map(fach=>({
    fach,
    participation:getStudentSubjectParticipationSummary(app,student.id,fach,semester),
    homework:getStudentHomeworkSummary(app,student.id,fach,semester),
  }));
  const classroomRowsWithData=classroomRows.filter(row=>row.participation.hasData||row.homework.tracked);
  const participationSubjects=classroomRows.filter(row=>row.participation.hasData).length;
  const trackedHomeworkSubjects=classroomRows.filter(row=>row.homework.tracked).length;
  const missingHomework=classroomRows.reduce((sum,row)=>sum+(row.homework.tracked?row.homework.missing:0),0);
  const latestStage=stats.stages.find((s:any)=>s.id===stats.latestBehavior?.iconId);
  const mood=stats.latestMood ? getMoodMeta(Number(stats.latestMood[1])) : undefined;
  const todayAttendance=app.anwesenheit?.[student.id]?.[stats.today];
  const todayDetail=app.anwesenheitDetail?.[student.id]?.[stats.today];
  const todayValues=typeof todayAttendance==='string'?[todayAttendance]:Object.values(todayAttendance||{});
  const todayHasDetailedAbsence=Number(todayDetail?.fehlstunden||0)>0;
  const todayStatus=todayValues.includes('u')?'Unentschuldigt':todayValues.includes('e')?'Entschuldigt':todayHasDetailedAbsence?(todayDetail?.notiz==='Unentschuldigt'?'Unentschuldigt':'Entschuldigt'):todayValues.some(v=>['a','da','v'].includes(String(v)))?'Anwesend':'Heute noch nicht erfasst';
  const openSubject=(fach:string)=>onSubjectSelect?onSubjectSelect(fach):onTabChange('leistungen');
  const chartAxes=<><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" tick={{fontSize:10}} axisLine={false} tickLine={false} minTickGap={20}/></>;
  const card='min-w-0 rounded-2xl border border-slate-200 bg-white p-4';
  return <div className="space-y-4" data-dossier-overview>
    <section className={card} aria-label="Notenstand aller Fächer">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><BarChart3 size={20} className="text-indigo-600"/>Alle Fächer auf einen Blick</h2><p className="mt-1 text-xs text-slate-500">Je Fach gilt die in der Notenmappe eingestellte Skala · Fach anklicken für Einzelbewertungen</p></div><button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50">Alle Bewertungen <ArrowRight size={14} className="inline"/></button></div>
      <div className="grid gap-x-8 gap-y-1 lg:grid-cols-2 xl:grid-cols-3">
      {subjects.map(fach=>{const mode=getAssessmentMode(app,fach);const avg=berechne(app,student.id,fach,semester);const final=app.noten?.[student.id]?.[fach]?.[semester]?.endnote;const hasFinal=mode==='grades'&&final!==undefined&&final!==null&&String(final).trim()!==''&&String(final)!=='—';const numeric=hasFinal?Number(String(final).replace(',','.')):avg;const valid=numeric!==null&&Number.isFinite(numeric);const pos=valid ? mode==='grades'?(Number(numeric)-1)/4*100:Number(numeric) : null;const display=hasFinal?String(final):avg===null?'Noch keine Bewertung':`${avg.toFixed(1).replace('.',',')}${mode==='percent'?' %':mode==='points'?' % (Punkte)':''}`;return <button key={fach} type="button" onClick={()=>openSubject(fach)} className="rounded-xl px-2 py-1 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"><div className="mb-1 flex items-center justify-between gap-2"><span className="text-sm font-semibold text-slate-800">{fach}</span><span className={`text-xs font-bold ${avg===null&&!hasFinal?'text-slate-400':'text-indigo-700'}`}>{hasFinal?'Endnote ':mode==='grades'&&avg!==null?'Ø ':''}{display}</span></div>{<><div className="relative mx-2 h-2 rounded-full bg-slate-100">{(mode==='grades'?[0,25,50,75,100]:[0,50,100]).map(p=><span key={p} className="absolute top-0 h-2 w-px bg-slate-300" style={{left:`${p}%`}}/>)}{pos!==null&&<span className="absolute -top-1 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-white bg-indigo-600 shadow-sm" style={{left:`${Math.max(0,Math.min(100,pos))}%`}}/>}</div><div className="relative mx-2 mt-1 h-4 text-[10px] text-slate-500">{(mode==='grades'?['1','2','3','4','5']:['0 %','50 %','100 %']).map((t,i,labels)=><span key={t} className="absolute whitespace-nowrap" style={{left:`${i/(labels.length-1)*100}%`,transform:i===0?'none':i===labels.length-1?'translateX(-100%)':'translateX(-50%)'}}>{t}</span>)}</div></>}</button>;})}
      </div>{!subjects.length&&<p className="text-sm text-slate-500">Noch keine Fächer ausgewählt.</p>}
    </section>
    <section aria-label="Kernüberblick" className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
      <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-3 text-left hover:bg-violet-50"><span className="flex items-center gap-2 text-xs font-bold text-violet-800"><Activity size={15}/>Verhalten</span><strong className="mt-2 block text-sm text-slate-900">{latestStage?latestStage.icon+' '+latestStage.label:'Noch nicht erfasst'}</strong><span className="mt-1 block text-[0.65rem] text-slate-500">{stats.logs.length} Beobachtungen im Zeitraum</span></button>
      <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-left hover:bg-amber-50"><span className="flex items-center gap-2 text-xs font-bold text-amber-800"><Smile size={15}/>Befinden</span><strong className="mt-2 block text-sm text-slate-900">{mood?mood.emoji+' '+mood.label:'Noch nicht erfasst'}</strong><span className="mt-1 block text-[0.65rem] text-slate-500">{stats.moodCount} Rückmeldungen im Zeitraum</span></button>
      <button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3 text-left hover:bg-teal-50"><span className="flex items-center gap-2 text-xs font-bold text-teal-800"><CalendarDays size={15}/>Anwesenheit</span><strong className="mt-2 block text-sm text-slate-900">{todayStatus}</strong><span className="mt-1 block text-[0.65rem] text-slate-500">{stats.excused+stats.unexcused} Fehlstunden im Zeitraum</span></button>
      <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-2xl border border-yellow-100 bg-yellow-50/60 p-3 text-left hover:bg-yellow-50"><span className="flex items-center gap-2 text-xs font-bold text-yellow-800"><Star size={15}/>Mitarbeit</span><strong className="mt-2 block text-sm text-slate-900">{participationSubjects}/{subjects.length || 0} Fächer erfasst</strong><span className="mt-1 block text-[0.65rem] text-slate-500">Fachsterne aus dem Unterrichtsmodus</span></button>
      <button type="button" onClick={()=>onTabChange('leistungen')} className="rounded-2xl border border-rose-100 bg-rose-50/60 p-3 text-left hover:bg-rose-50"><span className="flex items-center gap-2 text-xs font-bold text-rose-800"><ClipboardCheck size={15}/>Hausübungen</span><strong className="mt-2 block text-sm text-slate-900">{trackedHomeworkSubjects?missingHomework+' fehlend':'Noch nicht erfasst'}</strong><span className="mt-1 block text-[0.65rem] text-slate-500">{trackedHomeworkSubjects} Fächer mit HÜ-Daten</span></button>
    </section>
    <section className={card} aria-label="Mitarbeit und Hausübungen">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">Mitarbeit & Hausübungen</h2>
          <p className="mt-1 text-xs text-slate-500">Direkt aus Notenmappe und Unterrichtsmodus · Fach anklicken für Details</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[0.68rem] font-bold">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800"><Star size={12} className="mr-1 inline"/>Mitarbeit in {participationSubjects}/{subjects.length || 0} Fächern</span>
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-800"><ClipboardCheck size={12} className="mr-1 inline"/>{trackedHomeworkSubjects ? missingHomework+' fehlende HÜ' : 'HÜ noch nicht erfasst'}</span>
        </div>
      </div>
      {classroomRowsWithData.length ? (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {classroomRowsWithData.map(row=><button key={row.fach} type="button" onClick={()=>openSubject(row.fach)}
            className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition hover:border-slate-200 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500">
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-800">{row.fach}</span>
              <span className="mt-0.5 block text-[0.68rem] text-slate-500">{row.participation.hasData ? row.participation.total+' '+(row.participation.total===1?'Fachstern':'Fachsterne') : 'Mitarbeit noch nicht erfasst'}</span>
            </span>
            <span className={'shrink-0 rounded-lg px-2 py-1 text-[0.68rem] font-black '+(!row.homework.tracked?'bg-slate-100 text-slate-500':row.homework.missing>0?'bg-rose-100 text-rose-800':'bg-emerald-100 text-emerald-800')}>
              {!row.homework.tracked?'HÜ –':row.homework.missing===0?'HÜ ✓':'HÜ −'+row.homework.missing}
            </span>
          </button>)}
        </div>
      ) : <p className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">Noch keine Mitarbeit oder Hausübungen dokumentiert.</p>}
    </section>
    <section aria-label="Verhalten, Befinden & Anwesenheit" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-400">Verhalten, Befinden & Anwesenheit</p>
          <h2 className="mt-0.5 text-base font-bold text-slate-900">Verläufe</h2>
          <p className="mt-1 text-xs text-slate-500">Entwicklung im Zeitverlauf · Details erscheinen beim Darüberfahren</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Zeitraum der Alltagsdiagramme">
          {([['recent','6 Wochen'],['year','Schuljahr']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={period===key} onClick={()=>setPeriod(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${period===key?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{label}</button>)}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <section className={card} data-dossier-trend-card="behavior">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Activity size={17} className="text-violet-600"/>Verhalten</h3><p className="mt-1 text-[0.68rem] text-slate-500">{stats.logs.length} Tagesbeobachtungen</p></div>
            <span className="max-w-[9rem] rounded-full bg-violet-50 px-2.5 py-1 text-right text-[0.68rem] font-bold text-violet-800">{latestStage?latestStage.icon+' '+latestStage.label:'Noch nicht erfasst'}</span>
          </div>
          <div className="mt-3 h-32">{stats.logs.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={stats.weeks} margin={{top:4,right:4,left:-8,bottom:0}}>{chartAxes}<YAxis allowDecimals={false} width={22} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/>{stats.stages.map((s:any)=><Bar key={s.id} dataKey={(w:any)=>w.stages[s.id]||0} name={s.label} stackId="behavior" fill={s.color} maxBarSize={20}/>)}</BarChart></ResponsiveContainer>:<p className="flex h-full items-center justify-center text-xs text-slate-400">Keine Beobachtungen im Zeitraum</p>}</div>
          <p className="mt-2 text-[0.65rem] text-slate-500">{stats.latestBehavior?'Letzter Eintrag: '+dateLabel(behaviorLogDay(stats.latestBehavior)):'Noch kein Verhalten dokumentiert'}</p>
        </section>
        <section className={card} data-dossier-trend-card="mood">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Smile size={17} className="text-amber-600"/>Befinden</h3><p className="mt-1 text-[0.68rem] text-slate-500">{stats.moodCount} Rückmeldungen</p></div>
            <span className="max-w-[9rem] rounded-full bg-amber-50 px-2.5 py-1 text-right text-[0.68rem] font-bold text-amber-800">{mood?mood.emoji+' '+mood.label:'Noch nicht erfasst'}</span>
          </div>
          <div className="mt-3 h-32">{stats.moodCount?<ResponsiveContainer width="100%" height="100%"><LineChart data={stats.weeks} margin={{top:4,right:4,left:-8,bottom:0}}>{chartAxes}<YAxis domain={[1,5]} reversed ticks={[1,3,5]} width={22} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(value:any)=>[Number(value).toFixed(1),'Wochenmittel']}/><Line dataKey="mood" name="Befinden" stroke="#d97706" strokeWidth={2} dot={{r:2.5}} connectNulls={false}/></LineChart></ResponsiveContainer>:<p className="flex h-full items-center justify-center text-xs text-slate-400">Keine Rückmeldungen im Zeitraum</p>}</div>
          <p className="mt-2 text-[0.65rem] text-slate-500">1 = sehr gut · 3 = okay · 5 = schlecht · Wochenmittel</p>
        </section>
        <section className={card} data-dossier-trend-card="attendance">
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><CalendarDays size={17} className="text-teal-600"/>Anwesenheit</h3><p className="mt-1 text-[0.68rem] text-slate-500">{stats.excused+stats.unexcused} Fehlstunden</p></div>
            <span className="max-w-[9rem] rounded-full bg-teal-50 px-2.5 py-1 text-right text-[0.68rem] font-bold text-teal-800">{todayStatus}</span>
          </div>
          <div className="mt-3 h-32">{stats.attendanceCount?<ResponsiveContainer width="100%" height="100%"><BarChart data={stats.weeks} margin={{top:4,right:4,left:-8,bottom:0}}>{chartAxes}<YAxis allowDecimals={false} width={22} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey={(w:any)=>w.attendanceCount?w.excused:null} name="Entschuldigt" stackId="absence" fill="#14b8a6" maxBarSize={20}/><Bar dataKey={(w:any)=>w.attendanceCount?w.unexcused:null} name="Unentschuldigt" stackId="absence" fill="#f43f5e" maxBarSize={20}/></BarChart></ResponsiveContainer>:<p className="flex h-full items-center justify-center text-xs text-slate-400">Noch keine Anwesenheit dokumentiert</p>}</div>
          <p className="mt-2 text-[0.65rem] text-slate-500">{stats.excused} entschuldigt · {stats.unexcused} unentschuldigt</p>
        </section>
      </div>
      <div className="flex justify-end"><button type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="text-xs font-semibold text-indigo-700 hover:underline">Alle Beobachtungen & Verlaufsdaten öffnen <ArrowRight size={13} className="inline"/></button></div>
    </section>
    <section className={card}><div className="mb-3 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-bold"><Clock size={17}/>Aktuelle Notizen</h3><button type="button" onClick={()=>onQuickEntry?onQuickEntry('note'):onTabChange('beobachtungen_verlauf')} className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"><Plus size={14}/>Eintrag</button></div>{notes.length?notes.map((n:any)=><button key={n.id||`${n.datum}-${n.inhalt}`} type="button" onClick={()=>onTabChange('beobachtungen_verlauf')} className="flex w-full gap-3 border-t border-slate-100 py-3 text-left hover:bg-slate-50"><span className="shrink-0 text-xs text-slate-500">{dateLabel(String(n.datum||'').slice(0,10))}</span><span className="min-w-0 text-sm text-slate-800">{n.inhalt||n.notiz||n.text||n.titel}<span className="mt-1 block text-xs text-slate-500">{n.kategorie}{n.fach?` · ${n.fach}`:''}</span></span></button>):<p className="text-xs text-slate-500">Noch keine Notizen dokumentiert.</p>}</section>
  </div>;
}
