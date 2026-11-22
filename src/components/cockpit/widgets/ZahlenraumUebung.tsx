import {useEffect, useRef} from 'react';
import {GradeSelect, schoolLevel} from './GradeSelect';
const targets = [
  [7,4,9,6,10,8],[30,85,10,65,45,90],[243,507,680,914,305,761],
  [324700,845200,995000,74900,410100,165000],
];
const marks = [[10,30,70],[25,55,85],[10,40,80],[15,40,65],[25,45,75],[30,65,90]];
const btn='min-h-11 rounded-lg border border-current/30 px-3 font-semibold aria-pressed:bg-accent aria-pressed:text-accent-text';
export function numberRound(level: number, round=0) {
  return {level:schoolLevel(level), round:round%6, answer:'', checked:false, covered:false};
}
export function ZahlenraumUebung({state,change,exit}:{state:ReturnType<typeof numberRound>;change:(s:ReturnType<typeof numberRound>)=>void;exit:()=>void}){
  const {level,round,answer,covered,checked}=state;
  const target=targets[level-1][round];
  const expected=level===4 ? Math.round(target/10000)*10000 : target;
  const correct=answer!=='' && Number(answer)===expected;
  const choose=(value:string)=>change({...state,answer:value,checked:false});
  const cover=useRef(()=>{});
  useEffect(()=>{cover.current=()=>change({...state,covered:true});},[state,change]);
  useEffect(()=>{
    if(level!==1 || covered)return;
    const id=setTimeout(()=>cover.current(),2000);
    return ()=>clearTimeout(id);
  },[level,round,covered]);
  return <section aria-label="Zahlenraum üben" className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 text-center">
    <div className="flex items-center justify-between"><GradeSelect level={level} change={n=>change(numberRound(n))}/><button className={btn} onClick={exit}>Zur Darstellung</button></div>
    <h3 className="text-xl font-bold">{['Wie viele Punkte hast du gesehen?',`Wo liegt ${target}?`,`Baue die Zahl ${target}.`,`Runde ${target.toLocaleString('de-AT')} auf den nächsten Zehntausender.`][level-1]}</h3>
    {level===1 && <div className="flex flex-col items-center gap-2"><div aria-label={covered?'Punkte verdeckt':target+' Punkte'} className="grid grid-cols-5 gap-1 rounded border p-2">
      {Array.from({length:10},(_,i)=><span key={i} className={'size-6 rounded-full border '+(covered?'invisible':i<target?'bg-current':'opacity-30')}/>)}</div>
      {covered && <button className={btn} onClick={()=>change({...state,covered:false})}>Noch einmal zeigen</button>}</div>}
    {level===2 && <div className="mx-6"><div className="relative h-14 border-b-2">
      {Array.from({length:11},(_,i)=><span key={i} className="absolute bottom-0 h-2 border-l" style={{left:i*10+'%'}}/>)}
      {marks[round].map((n,i)=><button key={n} className={btn+' absolute bottom-0 -translate-x-1/2'} style={{left:n+'%'}} aria-pressed={answer===String(n)} onClick={()=>choose(String(n))}>{'ABC'[i]}<span className="absolute bottom-0 left-1/2 h-2 border-l"/></button>)}
    </div><div className="flex justify-between"><span>0</span><span>50</span><span>100</span></div></div>}
    {level===3 && <div className="flex flex-wrap justify-center gap-3">{['Hunderter','Zehner','Einer'].map((name,i)=><label key={name} className="flex max-w-24 flex-col gap-1">{name}
      <select className={btn} value={answer[i]??'-'} onChange={e=>{const digits=(answer||'---').split('');digits[i]=e.target.value;choose(digits.join(''));}}><option value="-">–</option>{Array.from({length:10},(_,j)=><option key={j}>{j}</option>)}</select>
      <span className="flex flex-wrap gap-1">{Array.from({length:Number(answer[i])||0},(_,j)=><span key={j} className={'bg-current '+['size-5','h-5 w-0.5','size-0.5'][i]}/>)}</span>
    </label>)}</div>}
    {(level===4 || (level===1 && covered)) && <label>Antwort <input className={btn+' w-32'} inputMode="numeric" value={answer} onChange={e=>{if(/^\d{0,7}$/.test(e.target.value))choose(e.target.value);}}/></label>}
    <p role="status">{checked && (correct?(level===4?'Richtig. Welche Ziffer hat beim Runden entschieden?':'Das passt.'):['Denk an die Fünferreihe.','Schau auf die Zehnerschritte.','Prüfe die Stellen von links nach rechts.','Schau auf die Tausenderstelle.'][level-1])}</p>
    <div className="flex flex-wrap justify-center gap-2"><button className={btn} disabled={!answer || answer.includes('-') || (level===1&&!covered)} onClick={()=>change({...state,checked:true})}>Prüfen</button>
    <button className={btn} onClick={()=>change(numberRound(level,round+1))}>Nächste Aufgabe</button></div>
  </section>;
}
