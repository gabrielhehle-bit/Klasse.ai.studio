import React, { useEffect, useState } from 'react';
import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import { COLOR_TASKS, PAINT_LABELS, PAINT_COLORS, mixPaint, matchesPaintRecipe, CLOCK_TASKS, clockAngles, shiftClock, WEATHER_TASKS, WEATHER_ITEMS, checkWeather, SYMMETRY_PUZZLES, mirroredGrid, type Paint, type MirrorMode } from '../../lib/practiceLearningModel';

export interface PracticeProps { widget: any; currentIsLight: boolean; onUpdate?: (updates:any)=>void; }
export function useLessonState<T extends Record<string,unknown>>(props:PracticeProps,key:string,fallback:T){
 const [state,setState]=useState<T>(()=>readWidgetLifecycleState(props.widget,key,fallback));
 usePersistedWidgetLifecycleState(props.widget,props.onUpdate,key,state);
 return [state,setState] as const;
}
export const lessonButton='min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-bold';
const primary=lessonButton+' bg-accent text-accent-text border-accent';
export const LessonFrame:React.FC<{label:string;children:React.ReactNode}>=({label,children})=><div role="region" aria-label={label} data-practice-root className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden p-3 text-sm">{children}</div>;

export const ColormixerWidgetContent:React.FC<PracticeProps>=props=>{
 const [s,set]=useLessonState(props,'colormixer',{task:0,drops:[] as Paint[],feedback:'Füge Farbtropfen hinzu und prüfe deine Mischung.',tip:false,score:0,awarded:false,mixed:false});
 const task=COLOR_TASKS[s.task%COLOR_TASKS.length],mix=mixPaint(s.drops);
 const check=()=>{const correct=matchesPaintRecipe(s.drops,task.recipe);set(p=>({...p,mixed:true,feedback:correct?'Richtig! '+task.hint:'Noch nicht. Diese Mischung heißt '+mix.name+'. Schau dir den Tipp an und ändere deine Tropfen.',score:p.score+(correct&&!p.awarded?1:0),awarded:p.awarded||correct}));};
 return <LessonFrame label="Malfarben mischen">
  <p className="shrink-0 text-xs font-bold">Aufgabe {s.task+1} von {COLOR_TASKS.length} · {s.score} gelöst</p>
  <h3 className="shrink-0 text-xl font-black">Mische {task.name}</h3>
  <p className="shrink-0">Verwende nur die dafür nötigen Farben. Weiß hellt die Mischung auf.</p>
  <div className="grid shrink-0 grid-cols-4 gap-2">{(Object.keys(PAINT_LABELS) as Paint[]).map(color=><button type="button" key={color} disabled={s.drops.length>=8} className={lessonButton} onClick={()=>set(p=>({...p,drops:[...p.drops,color],mixed:false,feedback:'Prüfe deine Mischung.'}))}><span className="mr-2 inline-block h-4 w-4 rounded-full border" style={{background:PAINT_COLORS[color]}} aria-hidden="true"/>{PAINT_LABELS[color]}</button>)}</div>
  <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-4 rounded-2xl border p-3">
   <div className="flex h-full min-h-0 items-center justify-center rounded-2xl border" data-mixed-color={mix.hex} style={{background:s.mixed?mix.hex:s.drops.length?'linear-gradient(90deg,'+s.drops.map(d=>PAINT_COLORS[d]).join(',')+')':'#e2e8f0'}}><span className="rounded-lg border bg-white px-3 py-2 font-bold text-slate-900">{s.mixed?mix.name:'Noch nicht gemischt'}</span></div>
   <div className="min-w-0"><p className="font-bold">{s.drops.length}/8 Tropfen</p><p data-paint-drops className="mt-2 leading-relaxed">{s.drops.map(d=>PAINT_LABELS[d]).join(' + ')||'Das Gefäß ist leer.'}</p></div>
  </div>
  <div className="grid shrink-0 grid-cols-3 gap-2"><button className={lessonButton} disabled={!s.drops.length} onClick={()=>set(p=>({...p,drops:p.drops.slice(0,-1),mixed:false,feedback:'Letzter Tropfen entfernt.'}))}>Rückgängig</button><button className={lessonButton} onClick={()=>set(p=>({...p,drops:[],mixed:false,feedback:'Das Gefäß ist leer.'}))}>Leeren</button><button className={primary} disabled={!s.drops.length} onClick={check}>Mischen & prüfen</button></div>
  <p role="status" className="shrink-0 rounded-xl border bg-accent-soft p-2 font-semibold">{s.feedback}</p>
  <div className="grid shrink-0 grid-cols-2 gap-2"><button className={lessonButton} onClick={()=>set(p=>({...p,tip:!p.tip}))}>{s.tip?'Tipp ausblenden':'Tipp zeigen'}</button><button className={primary} onClick={()=>set(p=>({...p,task:(p.task+1)%COLOR_TASKS.length,drops:[],feedback:'Füge Farbtropfen hinzu und prüfe deine Mischung.',mixed:false,tip:false,awarded:false}))}>Nächste Aufgabe</button></div>
  {s.tip&&<p className="shrink-0 font-semibold">{task.hint}</p>}
  <p className="shrink-0 text-xs opacity-70">Vereinfachtes Malfarbenmodell. Echte Farbtöne hängen von Pigmenten und Mischmengen ab.</p>
 </LessonFrame>;
};

export const ClocksyncWidgetContent:React.FC<PracticeProps>=props=>{
 const [s,set]=useLessonState(props,'clocksync',{task:0,hour:12,minute:0,hint:false});
 const task=CLOCK_TASKS[s.task%CLOCK_TASKS.length],angles=clockAngles(s.hour,s.minute),matched=s.hour===task.hour&&s.minute===task.minute;
 const change=(delta:number)=>set(p=>({...p,...shiftClock(p.hour,p.minute,delta)}));
 return <LessonFrame label="Uhrzeit üben">
  <p className="shrink-0 text-xs font-bold">Aufgabe {s.task+1} von {CLOCK_TASKS.length} · rote Stunde, blaue Minute</p>
  <h3 className="shrink-0 text-xl font-black">{task.text}</h3>
  <div className="grid min-h-0 flex-1 grid-cols-[240px_minmax(0,1fr)] items-center gap-3">
   <div className="relative mx-auto h-[240px] w-[240px] rounded-full border-2 bg-white text-slate-900">
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-label="Analoge Uhr"><line data-clock-hand="hour" x1="50" y1="50" x2="50" y2="30" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" transform={'rotate('+angles.hour+' 50 50)'}/><line data-clock-hand="minute" x1="50" y1="50" x2="50" y2="20" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" transform={'rotate('+angles.minute+' 50 50)'}/><circle cx="50" cy="50" r="2" fill="#0f172a"/></svg>
    {[12,1,2,3,4,5,6,7,8,9,10,11].map(hour=>{const a=hour*Math.PI/6-Math.PI/2;return <button key={hour} aria-label={hour+' Uhr einstellen'} aria-pressed={hour===s.hour} className="absolute flex h-11 w-11 items-center justify-center rounded-full text-base font-black" style={{left:120+96*Math.cos(a),top:120+96*Math.sin(a),transform:'translate(-50%,-50%)',background:hour===s.hour?'#fee2e2':'#fff',color:'#0f172a'}} onClick={()=>set(p=>({...p,hour}))}>{hour}</button>;})}
   </div>
   <div className="grid min-w-0 grid-cols-3 gap-2" role="group" aria-label="Minuten einstellen">{Array.from({length:12},(_,i)=>i*5).map(minute=><button key={minute} className={lessonButton+(minute===s.minute?' bg-accent-soft text-accent':'')} aria-label={minute+' Minuten einstellen'} aria-pressed={minute===s.minute} onClick={()=>set(p=>({...p,minute}))}>{String(minute).padStart(2,'0')}</button>)}</div>
  </div>
  <div className="grid shrink-0 grid-cols-4 gap-2">{[[-60,'Stunde −1'],[60,'Stunde +1'],[-5,'Minute −5'],[5,'Minute +5']].map(([delta,label])=><button className={lessonButton} key={label} onClick={()=>change(Number(delta))}>{label}</button>)}</div>
  <p role="status" className="shrink-0 rounded-xl border bg-accent-soft p-2 font-bold">{matched?'Richtig eingestellt!':'Wähle die Stunde am Zifferblatt und die Minuten rechts.'}</p>
  <div className="grid shrink-0 grid-cols-2 gap-2"><button className={lessonButton} onClick={()=>set(p=>({...p,hint:!p.hint}))}>{s.hint?'Digitalhilfe ausblenden':'Digitalhilfe zeigen'}</button><button className={primary} disabled={!matched} onClick={()=>set(p=>({...p,task:(p.task+1)%CLOCK_TASKS.length,hour:12,minute:0,hint:false}))}>Nächste Uhr</button></div>
  {s.hint&&<p className="shrink-0 text-center font-mono font-bold">Eingestellt: {String(s.hour).padStart(2,'0')}:{String(s.minute).padStart(2,'0')} · Ziel: {String(task.hour).padStart(2,'0')}:{String(task.minute).padStart(2,'0')}</p>}
 </LessonFrame>;
};

export const KidWeatherWidgetContent:React.FC<PracticeProps>=props=>{
 const [s,set]=useLessonState(props,'kidweather',{task:0,selected:[] as string[],feedback:'Wähle passende Dinge und prüfe deine Auswahl.',score:0,awarded:false});
 const task=WEATHER_TASKS[s.task%WEATHER_TASKS.length];
 const toggle=(id:string)=>set(p=>({...p,selected:p.selected.includes(id)?p.selected.filter(x=>x!==id):[...p.selected,id],feedback:'Prüfe deine Auswahl.'}));
 const check=()=>{const result=checkWeather(s.task,s.selected);const names=(ids:readonly string[])=>ids.map(id=>WEATHER_ITEMS.find(x=>x.id===id)?.label||'ein festes Gebäude').join(', ');set(p=>({...p,feedback:result.correct?'Passend! '+task.explanation:task.id==='tempest'?task.explanation:'Noch nicht. '+(result.missing.length?'Es fehlt: '+names(result.missing)+'. ':'')+(result.extra.length?'Überlege noch einmal: '+names(result.extra)+'.':''),score:p.score+(result.correct&&!p.awarded?1:0),awarded:p.awarded||result.correct}));};
 return <LessonFrame label="Wetter und Kleidung">
  <div className="grid shrink-0 grid-cols-5 gap-2">{WEATHER_TASKS.map((t,i)=><button key={t.id} className={lessonButton+(i===s.task?' bg-accent-soft text-accent':'')} aria-pressed={i===s.task} onClick={()=>set(p=>({...p,task:i,selected:[],feedback:'Wähle passende Dinge und prüfe deine Auswahl.',awarded:false}))}>{t.emoji} {t.label}</button>)}</div>
  <h3 className="shrink-0 text-xl font-black">{task.text}</h3>
  <div className="flex min-h-0 flex-1 flex-col justify-center gap-3">
   {task.id==='tempest'?<div className="grid grid-cols-2 gap-3">{[['shelter','🏠 In ein festes Gebäude gehen'],['tree','🌳 Unter einen Baum stellen'],['umbrella','☂️ Den Schirm aufspannen'],['shed','🛖 In einer offenen Hütte warten']].map(([id,label])=><button key={id} className={lessonButton+(s.selected.includes(id)?' bg-accent-soft text-accent':'')} aria-pressed={s.selected.includes(id)} onClick={()=>set(p=>({...p,selected:[id],feedback:'Prüfe deine Auswahl.'}))}>{label}</button>)}</div>:<div className="grid grid-cols-4 gap-3">{WEATHER_ITEMS.map(item=><button key={item.id} className={lessonButton+(s.selected.includes(item.id)?' bg-accent-soft text-accent':'')} aria-pressed={s.selected.includes(item.id)} onClick={()=>toggle(item.id)}><span className="mr-2 text-xl" aria-hidden="true">{item.emoji}</span>{' '}{item.label}</button>)}</div>}
  </div>
  <button className={primary} onClick={check}>Auswahl prüfen</button>
  <p role="status" className="shrink-0 rounded-xl border bg-accent-soft p-3 font-semibold leading-relaxed">{s.feedback}</p>
  <div className="grid shrink-0 grid-cols-2 gap-2"><button className={lessonButton} onClick={()=>set(p=>({...p,selected:[],feedback:task.explanation}))}>Erklärung zeigen</button><button className={primary} onClick={()=>set(p=>({...p,task:(p.task+1)%WEATHER_TASKS.length,selected:[],feedback:'Wähle passende Dinge und prüfe deine Auswahl.',awarded:false}))}>Nächstes Wetter</button></div>
  <p className="shrink-0 text-xs opacity-70">Übungssituationen, keine aktuelle Wettervorhersage. Temperatur, Wind und Tätigkeit entscheiden mit.</p>
 </LessonFrame>;
};

const brushes=[{name:'Radierer',hex:'#e2e8f0'},{name:'Rot',hex:'#ef4444'},{name:'Blau',hex:'#3b82f6'},{name:'Gold',hex:'#fbbf24'},{name:'Grün',hex:'#22c55e'},{name:'Pink',hex:'#ec4899'},{name:'Schwarz',hex:'#111827'}];
export const ShadowshapesWidgetContent:React.FC<PracticeProps>=props=>{
 const [s,set]=useLessonState(props,'shadowshapes',{puzzle:0,mode:'classic' as MirrorMode,difficulty:'normal',brush:3,grid:SYMMETRY_PUZZLES[0].presets.map(row=>row.map(()=>0)),page:0,feedback:'Spiegle die Farben an der senkrechten Achse.',errors:[] as string[],lives:3,seconds:60,won:false,awarded:false,score:0});
 const puzzle=SYMMETRY_PUZZLES[s.puzzle%SYMMETRY_PUZZLES.length],expected=mirroredGrid(puzzle.presets,s.mode),pages=Math.ceil(puzzle.rows/3),start=s.page*3;
 const reset=(patch:Partial<typeof s>={})=>set(p=>{const next={...p,...patch},target=SYMMETRY_PUZZLES[next.puzzle%SYMMETRY_PUZZLES.length];return {...next,grid:target.presets.map(row=>row.map(()=>0)),page:0,feedback:'Male die fehlende Hälfte und prüfe sie.',errors:[],lives:3,seconds:60,won:false,awarded:false};});
 useEffect(()=>{if(s.difficulty!=='hard'||s.won||s.seconds<=0||s.lives<=0)return;const id=setInterval(()=>set(p=>({...p,seconds:Math.max(0,p.seconds-1),feedback:p.seconds<=1?'Zeit vorbei. Starte die Runde erneut.':p.feedback})),1000);return()=>clearInterval(id);},[s.difficulty,s.won,s.seconds<=0,s.lives<=0,set]);
 const check=()=>{const errors=expected.flatMap((row,r)=>row.flatMap((value,c)=>value!==s.grid[r]?.[c]?[r+'-'+c]:[]));const correct=!errors.length;set(p=>({...p,errors,won:correct,feedback:correct?'Richtig! Alle Felder passen.':'Noch nicht. '+errors.length+' Felder stimmen noch nicht.',lives:p.difficulty==='hard'&&!correct?Math.max(0,p.lives-1):p.lives,score:p.score+(correct&&!p.awarded?1:0),awarded:p.awarded||correct}));};
 const locked=s.difficulty==='hard'&&(s.seconds<=0||s.lives<=0);
 return <LessonFrame label="Symmetrie üben">
  <div className="grid shrink-0 grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2">
   <select aria-label="Symmetrie-Motiv" className={lessonButton+' min-w-0 w-full'} value={s.puzzle} onChange={e=>reset({puzzle:Number(e.target.value)})}>{SYMMETRY_PUZZLES.map((p,i)=><option key={p.name} value={i}>{p.name}</option>)}</select>
   <select aria-label="Symmetrie-Modus" className={lessonButton+' min-w-0 w-full'} value={s.mode} onChange={e=>reset({mode:e.target.value as MirrorMode})}><option value="classic">Spiegeln</option><option value="swap">Farbtausch</option><option value="rotate">180° drehen</option></select>
   <select aria-label="Symmetrie-Schwierigkeit" className={lessonButton+' min-w-0 w-full'} value={s.difficulty} onChange={e=>reset({difficulty:e.target.value})}><option value="easy">Mit Fehlerhilfe</option><option value="normal">Ohne Zeitdruck</option><option value="hard">60 Sekunden</option></select>
  </div>
  <p className="shrink-0 font-semibold">{s.mode==='rotate'?'Drehe das ganze Motiv um 180°. Oben wird unten, links wird rechts.':s.mode==='swap'?'Spiegle an der Achse und tausche Rot ↔ Blau, Gold ↔ Grün, Pink ↔ Schwarz.':'Spiegle an der senkrechten Achse. Der Abstand zur Achse bleibt gleich.'}{s.difficulty==='hard'&&' · '+s.seconds+' Sekunden · '+s.lives+' Versuche'}</p>
  <div className="grid shrink-0 grid-cols-7 gap-2" role="group" aria-label="Malfarbe auswählen">{brushes.map((b,i)=><button key={b.name} className={lessonButton+(s.brush===i?' ring-2 ring-accent':'')} aria-pressed={s.brush===i} onClick={()=>set(p=>({...p,brush:i}))}><span className="mr-1 inline-block h-3 w-3 rounded-full border" style={{background:b.hex}}/>{b.name}</button>)}</div>
  <div className="flex min-h-0 flex-1 items-center justify-center gap-3">
   <div className="grid gap-1" aria-label="Vorlage" style={{gridTemplateColumns:`repeat(${puzzle.size},44px)`}}>{puzzle.presets.slice(start,start+3).flatMap((row,i)=>row.map((v,c)=><div key={i+'-'+c} data-symmetry-left={(start+i)+'-'+c} data-color={v} className="flex h-11 w-11 items-center justify-center rounded border" style={{background:brushes[v].hex,color:v===6?'#fff':'#111827'}}>{v?brushes[v].name[0]:''}</div>))}</div>
   <div aria-label={s.mode==='rotate'?'Trennung der Motive':'Spiegelachse'} className="h-full w-1 shrink-0 bg-accent"/>
   <div className="grid gap-1" aria-label="Deine Ergänzung" style={{gridTemplateColumns:`repeat(${puzzle.size},44px)`}}>{s.grid.slice(start,start+3).flatMap((row,i)=>row.map((v,c)=>{const r=start+i,key=r+'-'+c;return <button key={key} data-symmetry-cell={key} data-color={v} disabled={locked} aria-label={'Zeile '+(r+1)+', Spalte '+(c+1)+': '+brushes[v].name} className={'flex h-11 w-11 items-center justify-center rounded border-2 '+(s.difficulty==='easy'&&s.errors.includes(key)?'ring-2 ring-rose-500':'')} style={{background:brushes[v].hex,color:v===6?'#fff':'#111827'}} onClick={()=>set(p=>({...p,grid:p.grid.map((line,j)=>j===r?line.map((color,k)=>k===c?p.brush:color):line),won:false,errors:[],feedback:'Prüfe dein Motiv.'}))}>{v?brushes[v].name[0]:''}</button>;}))}</div>
  </div>
  <div className="grid shrink-0 grid-cols-3 items-center gap-2"><button className={lessonButton} disabled={s.page===0} onClick={()=>set(p=>({...p,page:p.page-1}))}>Vorige Zeilen</button><p className="text-center font-bold">Zeilen {start+1}–{Math.min(start+3,puzzle.rows)} von {puzzle.rows}</p><button className={lessonButton} disabled={s.page>=pages-1} onClick={()=>set(p=>({...p,page:p.page+1}))}>Nächste Zeilen</button></div>
  <p role="status" className="shrink-0 rounded-xl border bg-accent-soft p-2 font-bold">{s.feedback}</p>
  <div className="grid shrink-0 grid-cols-3 gap-2"><button className={lessonButton} onClick={()=>reset()}>Neu beginnen</button><button className={primary} disabled={locked} onClick={check}>Motiv prüfen</button><button className={lessonButton} onClick={()=>reset({puzzle:(s.puzzle+1)%SYMMETRY_PUZZLES.length})}>Nächstes Motiv</button></div>
 </LessonFrame>;
};
