import React, { useState } from 'react';
import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import { GEOMETRY_FIGURES, projectSolid, generateDivisibilityPool, DIVISIBILITY_RULES } from '../../lib/geometryPractice';

type Props = { widget: any; currentIsLight: boolean; onUpdate?: (updates: any) => void };
const button = 'min-h-11 min-w-11 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-bold hover:border-accent aria-pressed:bg-accent aria-pressed:text-accent-text aria-pressed:border-accent disabled:opacity-50';
const panel = 'rounded-xl border border-slate-200 dark:border-slate-700 p-2';
const playTone = (success: boolean) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext(), oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.frequency.setValueAtTime(success ? 523 : 140, context.currentTime);
    gain.gain.setValueAtTime(.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .15);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.onended = () => { void context.close(); };
    oscillator.start(); oscillator.stop(context.currentTime + .17);
  } catch {}
};

export const ShapepuzzleWidgetContent = ({ widget, onUpdate }: Props) => {
  const saved = readWidgetLifecycleState(widget, 'shapepuzzle', { currentIdx: 0, clickedVertices: [] as number[], clickedSides: [] as number[], viewMode: '2d', solved: false, guess: null as number | null, rotation: 28 });
  const [state, setState] = useState(saved);
  usePersistedWidgetLifecycleState(widget, onUpdate, 'shapepuzzle', state);
  const update = (patch: Partial<typeof state>) => setState(s => ({ ...s, ...patch }));
  const fig = GEOMETRY_FIGURES[state.currentIdx % GEOMETRY_FIGURES.length];
  const points = Array.from({ length: fig.sides }, (_, i) => {
    const angle = -Math.PI / 2 + i * 2 * Math.PI / fig.sides + (fig.sides === 4 ? Math.PI / 4 : 0);
    return { x: 100 + 75 * Math.cos(angle), y: 100 + 75 * Math.sin(angle) };
  });
  const solidPoints = projectSolid(fig.solid.vertices, state.rotation);
  const toggle = (key: 'clickedVertices' | 'clickedSides', i: number) => {
    if (state.solved) return;
    update({ [key]: state[key].includes(i) ? state[key].filter(n => n !== i) : [...state[key], i] });
  };
  const guess = (n: number) => {
    if (state.solved) return;
    playTone(n === fig.sides);
    update({ guess: n, solved: n === fig.sides, ...(n === fig.sides ? { clickedVertices: points.map((_, i) => i), clickedSides: points.map((_, i) => i) } : {}) });
  };
  return <div data-practice-root data-shape-sides={fig.sides} className="h-full w-full p-2 flex flex-col gap-1 min-h-0">
    <div className="flex gap-2 justify-between items-center"><h3 className="font-bold">{fig.name}</h3><div className="flex gap-2">
      <button className={button} aria-pressed={state.viewMode === '2d'} onClick={() => update({viewMode:'2d'})}>2D Fläche</button>
      <button className={button} aria-pressed={state.viewMode === '3d'} onClick={() => update({viewMode:'3d'})}>3D Körper</button>
    </div></div>
    {state.viewMode === '2d' ? <>
      <p className="text-sm">Markiere die Ecken und Seiten im Uhrzeigersinn; zähle die Ecken.</p>
      <div className="flex-1 min-h-0 grid grid-cols-[160px_1fr] gap-3 items-center">
        <svg viewBox="0 0 200 200" className="w-[160px] h-[160px]" role="img" aria-label={fig.name}>
          <polygon points={points.map(p=>`${p.x},${p.y}`).join(' ')} fill="#3b82f622" />
          {points.map((p,i)=><g key={i}><line x1={p.x} y1={p.y} x2={points[(i+1)%points.length].x} y2={points[(i+1)%points.length].y} stroke={state.clickedSides.includes(i)?'#f59e0b':'#94a3b8'} strokeWidth="4" />
            <circle cx={p.x} cy={p.y} r="7" fill={state.clickedVertices.includes(i)?'#ef4444':'#64748b'}/><text x={p.x} y={p.y-12} textAnchor="middle" fontSize="14" fill="currentColor">{i+1}</text></g>)}
        </svg>
        <div className="grid grid-cols-2 gap-2">{(['clickedVertices','clickedSides'] as const).map(key=><div key={key} className={panel}><p className="text-sm font-bold mb-2">{key==='clickedVertices'?'Ecken':'Seiten'}: {state[key].length}</p><div className="grid grid-cols-3 gap-2">{points.map((_,i)=><button key={i} className={button} disabled={state.solved} aria-label={`${key==='clickedVertices'?'Ecke':'Seite'} ${i+1}`} aria-pressed={state[key].includes(i)} onClick={()=>toggle(key,i)}>{i+1}</button>)}</div></div>)}</div>
      </div>
      <div><p className="text-sm font-bold mb-1">Wie viele Ecken hat die Fläche?</p><div className="grid grid-cols-6 gap-2">{[3,4,5,6,7,8].map(n=><button key={n} className={button} disabled={state.solved} aria-label={`${n} Ecken antworten`} onClick={()=>guess(n)}>{n}</button>)}</div></div>
      <p role="status" className={panel+' text-sm'}>{state.solved?`Richtig! ${fig.name}: ${fig.sides} Ecken und ${fig.sides} Seiten.`:state.guess===null?'Markiere die Ecken und Seiten oder gib deinen Tipp ab.':`${state.guess} stimmt noch nicht. Zähle die markierten Ecken.`}</p>
    </> : <>
      <p className="text-sm">Eine Fläche dieses Körpers hat die Form {fig.name}: {fig.solid.name}. Eine Fläche ist flach; ein Körper hat auch Tiefe.</p>
      <svg viewBox="0 0 200 200" className="flex-1 min-h-0 w-full" role="img" aria-label={fig.solid.name}>
        {fig.solid.edges.map(([a,b],i)=><line key={i} x1={solidPoints[a].x} y1={solidPoints[a].y} x2={solidPoints[b].x} y2={solidPoints[b].y} stroke="#3b82f6" strokeWidth="3" data-solid-edge/>) }
        {solidPoints.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill="#ef4444" data-solid-vertex/>)}
      </svg>
      <p className={panel+' text-center font-bold'}>{fig.solid.name}: {fig.solid.vertices.length} Ecken · {fig.solid.edges.length} Kanten · {fig.solid.faces} Flächen</p>
      <label className="text-sm">Körper drehen: {state.rotation}°<input aria-label="Körper drehen" type="range" className="w-full h-11" min="-45" max="45" value={state.rotation} onChange={e=>update({rotation:Number(e.target.value)})}/></label>
    </>}
    <button className={button} onClick={()=>update({currentIdx:(state.currentIdx+1)%GEOMETRY_FIGURES.length,clickedVertices:[],clickedSides:[],solved:false,guess:null,viewMode:'2d'})}>Nächste Form</button>
  </div>;
};

const rules: Record<number,string> = {
  2:'Die letzte Ziffer ist 0, 2, 4, 6 oder 8.', 3:'Die Quersumme ist durch 3 teilbar.', 4:'Die Zahl aus den letzten zwei Ziffern ist durch 4 teilbar.',
  5:'Die letzte Ziffer ist 0 oder 5.', 6:'Die Zahl ist durch 2 und durch 3 teilbar.', 8:'Die Zahl aus den letzten drei Ziffern ist durch 8 teilbar.',
  9:'Die Quersumme ist durch 9 teilbar.', 10:'Die letzte Ziffer ist 0.',
};
export const DivrobotWidgetContent = ({ widget, onUpdate }: Props) => {
  const [state,setState] = useState(() => readWidgetLifecycleState(widget,'divrobot',{divRule:3,difficulty:'medium',numbersPool:generateDivisibilityPool(3,120),used:[] as number[],score:0,feedback:'Finde die drei passenden Zahlen. Falsche Zahlen kannst du nur einmal auswählen.',explanation:''}));
  usePersistedWidgetLifecycleState(widget,onUpdate,'divrobot',state);
  const max = (diff:string) => diff==='easy'?40:diff==='medium'?120:300;
  const reset = (divRule=state.divRule,difficulty=state.difficulty,resetScore=false) => setState(s=>({...s,divRule,difficulty,numbersPool:generateDivisibilityPool(divRule,max(difficulty)),used:[],score:resetScore?0:s.score,feedback:'Finde die drei passenden Zahlen.',explanation:''}));
  const remaining=state.numbersPool.filter(n=>n%state.divRule===0&&!state.used.includes(n)).length;
  const eat = (num:number) => {
    if (state.used.includes(num) || !remaining) return;
    playTone(num % state.divRule === 0);
    setState(s=>{
    if(s.used.includes(num)||!remaining)return s;
    const fits=num%s.divRule===0, sum=String(num).split('').reduce((total,n)=>total+Number(n),0);
    return {...s,used:[...s.used,num],score:Math.max(0,s.score+(fits?10:-5)),feedback:fits?`Richtig! ${num} ist durch ${s.divRule} teilbar.`:`${num} ist nicht durch ${s.divRule} teilbar.`,explanation:`${num} : ${s.divRule} = ${Math.floor(num/s.divRule)}${fits?' ohne Rest':` mit Rest ${num%s.divRule}`}.${[3,6,9].includes(s.divRule)?` Quersumme: ${String(num).split('').join(' + ')} = ${sum}.`:''}`};
    });
  };
  return <div data-practice-root data-div-rule={state.divRule} data-div-score={state.score} className="h-full w-full p-2 flex flex-col gap-3 min-h-0">
    <div className="flex justify-between items-center gap-2"><h3 className="font-bold">🤖 Teilbarkeits-Roboter</h3><div className="flex gap-2">{['easy','medium','hard'].map((d,i)=><button key={d} className={button} aria-pressed={state.difficulty===d} onClick={()=>{if(d!==state.difficulty)reset(state.divRule,d,true);}}>{['Leicht','Mittel','Schwer'][i]}</button>)}</div></div>
    <div className="grid grid-cols-8 gap-2" aria-label="Teiler auswählen">{DIVISIBILITY_RULES.map(r=><button className={button} key={r} aria-label={`Teilbarkeit durch ${r}`} aria-pressed={state.divRule===r} onClick={()=>{if(r!==state.divRule)reset(r,state.difficulty,true);}}>:{r}</button>)}</div>
    <p className={panel+' text-sm'}><strong>Regel für :{state.divRule}:</strong> {rules[state.divRule]}</p>
    <div className="flex-1 min-h-0 grid grid-cols-3 gap-3 content-center">{state.numbersPool.map(n=><button key={n} data-div-number={n} className={button+' text-2xl min-h-16'} disabled={state.used.includes(n)||remaining===0} onClick={()=>eat(n)}>{n}{state.used.includes(n)?n%state.divRule===0?' ✓':' ✕':''}</button>)}</div>
    <p role="status" className={panel+' text-sm'}>{state.feedback} {remaining===0?'Alle passenden Zahlen gefunden!':''}</p>
    {state.explanation&&<p className={panel+' text-sm'}>{state.explanation}</p>}
    <div className="flex justify-between items-center"><p className="font-bold">Punkte: {state.score} · Noch passend: {remaining}</p><button className={button} onClick={()=>reset()}>Neu füllen</button></div>
  </div>;
};
