import React, { useMemo, useState } from 'react';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import { getDossierObservationStats, ATTENDANCE_LABELS, observationDateLabel, type ObservationPeriod } from '../../lib/dossierObservationStats';
import { getMoodMeta } from '../../lib/moodTypes';
import { toLocalDateKey } from '../../lib/localDate';

const colors=['#10b981','#3b82f6','#64748b','#f59e0b','#ef4444'];
const attendanceColors={present:'#10b981',mixed:'#8b5cf6',excused:'#0ea5e9',unexcused:'#ef4444',unknown:'#94a3b8'};
const card='min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-3';
const axes=<><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/><XAxis dataKey="label" tick={{fontSize:10}} minTickGap={20} axisLine={false} tickLine={false}/></>;
const empty=(label:string)=><p className="flex h-44 items-center justify-center text-center text-sm text-slate-500">{label}</p>;
export default function DossierObservationCharts({student,initialDetail='verhalten'}:{student:Student;initialDetail?:'verhalten'|'anwesenheit'}) {
 const {app,setApp,setPage}=useApp();
 const [period,setPeriod]=useState<ObservationPeriod>('recent');
 const [detail,setDetail]=useState<'verhalten'|'befinden'|'anwesenheit'>(initialDetail);
 const [entryDay,setEntryDay]=useState(()=>toLocalDateKey());
 const [entryStage,setEntryStage]=useState('');
 const [entryMessage,setEntryMessage]=useState('');
 const activeClassId=app.activeClassId;
 const stats=useMemo(()=>getDossierObservationStats(app,student.id,period),[app,student.id,period]);
 const series=stats.stages.map((s,i)=>({...s,key:`stage${i}`,chartColor:/^#[0-9a-f]{3,8}$/i.test(s.color)?s.color:colors[i%colors.length]}));
 const data=stats.weeks.map(w=>({...w,...Object.fromEntries(series.map(s=>[s.key,w.stages[s.id]||0]))}));
 const latestMood=stats.moods[0];
 const latestBehavior=stats.behavior[0];
 const stage=stats.stages.find(s=>s.id===latestBehavior?.iconId);
 const present=stats.attendance.filter(a=>a.kind==='present').length;
 const absent=stats.attendance.filter(a=>['excused','unexcused','mixed'].includes(a.kind)).length;
 const fullYear=useMemo(()=>getDossierObservationStats(app,student.id,'year'),[app,student.id]);
 const timelineWidth=period==='year' && stats.weeks.length>6 ? Math.min(1700,stats.weeks.length*52+60) : 0;
 const saveDailyBehavior=(event:React.FormEvent)=>{
   event.preventDefault();
   const stageId=entryStage;
   const dayValue=new Date(entryDay+'T12:00:00');
   const validDay=/^\d{4}-\d{2}-\d{2}$/.test(entryDay) &&
     !Number.isNaN(dayValue.getTime()) && toLocalDateKey(dayValue)===entryDay &&
     entryDay>=fullYear.start && entryDay<=fullYear.end;
   if(!validDay || !stats.stages.some(stage=>stage.id===stageId)){
     setEntryMessage('Bitte ein gültiges Datum und eine Verhaltensstufe auswählen.');
     return;
   }
   const entry={
     id:crypto.randomUUID(),schuelerId:student.id,datum:entryDay,iconId:stageId,
     timestamp:Date.now()
   };
   setApp(previous=>{
     if(previous.activeClassId!==activeClassId ||
       !previous.schueler.some(child=>child.id===student.id)) return previous;
     return {
       ...previous,
       statusLog:[entry,...(previous.statusLog||[])],
       ...(entryDay===toLocalDateKey()?{
         behavior_status:{...(previous.behavior_status||{}),[student.id]:stageId}
       }:{})
     };
   });
   setEntryMessage('Tagesrückmeldung gespeichert. Vorherige Einträge bleiben im Verlauf erhalten.');
 };
 return <section data-dossier-observation-charts className="space-y-5">
  <div className="flex flex-wrap items-start justify-between gap-3">
   <div><h3 className="text-lg font-bold text-slate-900">Verhalten, Befinden & Anwesenheit</h3><p className="mt-1 text-xs text-slate-500">{observationDateLabel(stats.start)} – {observationDateLabel(stats.end)} · Schuljahr {app.schuljahr}</p></div>
   <div role="group" aria-label="Beobachtungszeitraum" className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">{([['recent','Letzte 6 Wochen'],['year','Gesamtes Schuljahr']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={period===key} onClick={()=>setPeriod(key)} className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${period===key?'bg-white text-slate-900 shadow-sm':'text-slate-500'}`}>{label}</button>)}</div>
  </div>
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
   <section data-observation-behavior data-observation-latest-stage={latestBehavior?.iconId || ''} className={`${card} xl:col-span-2`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-sm font-bold">Verhalten</h4><span className="text-xs text-slate-500">{stats.behavior.length} erfasste Tage</span></div>
    <p className="text-sm font-semibold text-slate-800">{latestBehavior?`${stage?.icon||''} ${stage?.label||'Frühere Verhaltensstufe'} · zuletzt am ${observationDateLabel(latestBehavior.date)}`:'Noch kein Verhalten im Zeitraum erfasst'}</p>
    {stats.behavior.length?<div data-observation-chart-scroll="behavior" className="min-w-0 overflow-x-auto overscroll-x-contain" tabIndex={timelineWidth?0:undefined} aria-label="Verhalten nach Wochen, bei vielen Wochen seitlich scrollbar"><div className="h-52" style={{minWidth:timelineWidth?`${timelineWidth}px`:'100%'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}>{axes}<YAxis allowDecimals={false} width={25} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#f8fafc'}}/>{series.map(s=><Bar key={s.id} dataKey={s.key} name={`${s.icon} ${s.label}`} fill={s.chartColor} stackId="behavior" isAnimationActive={false}/>)}{stats.behavior.some(b=>!stats.stages.some(s=>s.id===b.iconId))&&<Bar dataKey="unknownBehavior" name="Frühere Verhaltensstufe" fill="#94a3b8" stackId="behavior" isAnimationActive={false}/>}</BarChart></ResponsiveContainer></div></div>:empty('Keine Verhaltensrückmeldungen im Zeitraum')}
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">{series.map(s=><span key={s.id}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{background:s.chartColor}}/>{s.icon} {s.label}</span>)}</div>
    <p className="text-xs text-slate-500">Tage pro Woche und erfasster Stufe · je Tag die letzte Tagesrückmeldung.</p>
    <form data-observation-behavior-editor onSubmit={saveDailyBehavior} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="mb-2 text-xs font-bold text-slate-800">Tagesverhalten dokumentieren</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-[8rem] flex-1 text-xs font-semibold text-slate-700">
          Datum
          <input data-observation-behavior-date type="date" value={entryDay}
            min={fullYear.start} max={fullYear.end}
            onChange={event=>setEntryDay(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900"/>
        </label>
        <label className="min-w-[8rem] flex-1 text-xs font-semibold text-slate-700">
          Verhaltensstufe
          <select data-observation-behavior-stage value={entryStage}
            onChange={event=>setEntryStage(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-900">
            <option value="">Stufe auswählen</option>
            {stats.stages.map(stage=><option key={stage.id} value={stage.id}>{stage.icon} {stage.label}</option>)}
          </select>
        </label>
        <button data-observation-behavior-save type="submit"
          className="min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800">
          Tagesstand speichern
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">Eine Rückmeldung pro Tag im Diagramm. Nachträgliche Einträge ändern nicht den aktuellen Klassenstatus.</p>
      {entryMessage && <p role="status" className="mt-2 text-xs font-medium text-slate-700">{entryMessage}</p>}
    </form>
   </section>
   <section data-observation-mood className={card}>
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Befinden</h4><span className="text-xs text-slate-500">{stats.moods.length} Rückmeldungen</span></div>
    <p className="text-sm font-semibold">{latestMood?`${getMoodMeta(latestMood.value)?.emoji} ${getMoodMeta(latestMood.value)?.label} · ${observationDateLabel(latestMood.date)}`:'Noch keine Rückmeldung im Zeitraum'}</p>
    {stats.moods.length?<div data-observation-chart-scroll="mood" className="min-w-0 overflow-x-auto overscroll-x-contain" tabIndex={timelineWidth?0:undefined} aria-label="Befinden nach Wochen, bei vielen Wochen seitlich scrollbar"><div className="h-52" style={{minWidth:timelineWidth?`${timelineWidth}px`:'100%'}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data}>{axes}<YAxis domain={[1,5]} reversed ticks={[1,2,3,4,5]} width={25} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip formatter={(v:any)=>[Number(v).toFixed(1),'Wochenmittel']}/><Line dataKey="mood" name="Befinden" stroke="#d97706" strokeWidth={2} dot={{r:3}} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></div>:empty('Keine Befindensdaten im Zeitraum')}
    <p className="text-xs text-slate-500">1 = Sehr gut · 3 = Okay · 5 = Schlecht.<br/>Wochenmittel aus den Rückmeldungen des Kindes. Lücken = keine Angabe.</p>
   </section>
   <section data-observation-attendance className={card}>
    <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-bold">Anwesenheit</h4><span className="text-xs text-slate-500">{stats.attendance.length} erfasste Tage</span></div>
    <p className="text-sm font-semibold">{stats.attendance.length?`${present} vollständig anwesend · ${absent} mit Abwesenheit`:'Noch keine Anwesenheitsdaten im Zeitraum'}</p>
    {stats.attendance.length?<div data-observation-chart-scroll="attendance" className="min-w-0 overflow-x-auto overscroll-x-contain" tabIndex={timelineWidth?0:undefined} aria-label="Anwesenheit nach Wochen, bei vielen Wochen seitlich scrollbar"><div className="h-52" style={{minWidth:timelineWidth?`${timelineWidth}px`:'100%'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data}>{axes}<YAxis allowDecimals={false} width={25} tick={{fontSize:10}} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:'#f8fafc'}}/>{Object.entries(ATTENDANCE_LABELS).map(([key,label])=><Bar key={key} dataKey={key} name={label} stackId="attendance" fill={attendanceColors[key]} isAnimationActive={false}/>)}</BarChart></ResponsiveContainer></div></div>:empty('Keine Anwesenheitsdaten im Zeitraum')}
    <div className="flex flex-wrap gap-x-3 gap-y-2 text-xs text-slate-600">{Object.entries(ATTENDANCE_LABELS).map(([key,label])=><span key={key}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{background:attendanceColors[key]}}/>{label}</span>)}</div>
    <p className="text-xs text-slate-500">Tage pro Woche · teilweise abwesende Tage werden getrennt gezeigt. Nicht erfasste Tage bleiben ungezählt.</p>
   </section>
  </div>
  <section className={card}>
   <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="text-sm font-bold">Einzelne Tagesdaten</h4><div className="flex flex-wrap gap-1" role="group" aria-label="Tagesdaten auswählen">{([['verhalten','Verhalten'],['befinden','Befinden'],['anwesenheit','Anwesenheit']] as const).map(([key,label])=><button key={key} type="button" aria-pressed={detail===key} onClick={()=>setDetail(key)} className={`min-h-10 rounded-lg px-3 text-xs font-semibold ${detail===key?'bg-indigo-50 text-indigo-700':'text-slate-500 hover:bg-slate-50'}`}>{label}</button>)}</div></div>
   <div className="max-h-96 overflow-y-auto divide-y divide-slate-100" data-observation-records>
    {detail==='verhalten'&&stats.behavior.map((b,i)=>{const s=stats.stages.find(s=>s.id===b.iconId);return <div key={b.id||i} className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-sm"><time className="text-slate-500">{observationDateLabel(b.date)}</time><span className="font-semibold">{s?.icon} {s?.label||'Frühere Verhaltensstufe'}</span>{(b.bemerkung||b.comment)&&<p className="w-full break-words text-slate-600">{b.bemerkung||b.comment}</p>}</div>;})}
    {detail==='befinden'&&stats.moods.map(m=><div key={m.date} className="flex gap-4 py-3 text-sm"><time className="text-slate-500">{observationDateLabel(m.date)}</time><span>{getMoodMeta(m.value)?.emoji} {getMoodMeta(m.value)?.label}</span></div>)}
    {detail==='anwesenheit'&&stats.attendance.map(a=><div key={a.date} className="flex flex-wrap gap-x-4 gap-y-1 py-3 text-sm"><time className="text-slate-500">{observationDateLabel(a.date)}</time><span className="font-semibold">{ATTENDANCE_LABELS[a.kind]}</span>{a.missedHours>0&&<span className="text-slate-500">{a.missedHours} Fehlstunden</span>}{a.note&&<p className="w-full break-words text-slate-600">{a.note}</p>}</div>)}
    {!(detail==='verhalten'?stats.behavior.length:detail==='befinden'?stats.moods.length:stats.attendance.length)&&<p className="py-6 text-sm text-slate-500">Keine Einträge im gewählten Zeitraum.</p>}
   </div>
   {detail==='verhalten'&&<button type="button" onClick={()=>setPage('verhalten')} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Verhalten bearbeiten</button>}
   {detail==='anwesenheit'&&<button type="button" onClick={()=>setPage('anwesenheit')} className="min-h-10 rounded-lg px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">Anwesenheit & Befinden bearbeiten</button>}
  </section>
 </section>;
}
