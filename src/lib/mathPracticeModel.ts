export type MathOperation = '+' | '−' | '×' | '÷';
export type MathLevel = 'easy' | 'medium' | 'hard';
export interface ArithmeticTask { left:number; right:number; op:MathOperation; answer:number; choices:number[]; }
const pick=(min:number,max:number,rng:()=>number)=>min+Math.floor(Math.max(0,Math.min(0.999999999,rng()))*(max-min+1));
export const calculate=(left:number,op:MathOperation,right:number)=>op==='+'?left+right:op==='−'?left-right:op==='×'?left*right:left/right;
export function mathChoices(answer:number,rng:()=>number=Math.random,count=3){
 // A finite pool also terminates for a constant random source.
 const pool=Array.from({length:count+6},(_,i)=>Math.max(0,answer-3)+i).filter(x=>x!==answer);
 for(let i=pool.length-1;i>0;i--){const j=pick(0,i,rng);[pool[i],pool[j]]=[pool[j],pool[i]];}
 const result=[answer,...pool.slice(0,count-1)];
 for(let i=result.length-1;i>0;i--){const j=pick(0,i,rng);[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function arithmeticTask(op:MathOperation,range:number,rng:()=>number=Math.random):ArithmeticTask{
 let left:number,right:number,answer:number;
 if(op==='+'){left=pick(0,range,rng);right=pick(0,range-left,rng);answer=left+right;}
 else if(op==='−'){left=pick(0,range,rng);right=pick(0,left,rng);answer=left-right;}
 else if(op==='×'){left=pick(1,10,rng);right=pick(1,10,rng);answer=left*right;}
 else{right=pick(1,10,rng);answer=pick(1,10,rng);left=right*answer;}
 return {left,right,op,answer,choices:mathChoices(answer,rng)};
}
export function duelTask(level:MathLevel,op:MathOperation|'mixed',rng:()=>number=Math.random){
 const operation=op==='mixed'?(['+','−','×','÷'] as const)[pick(0,3,rng)]:op;
 if(level!=='hard'||operation==='+'||operation==='−')return arithmeticTask(operation,level==='easy'?20:level==='medium'?100:1000,rng);
 const right=pick(3,15,rng),other=pick(5,20,rng);
 const left=operation==='÷'?right*other:other,answer=calculate(left,operation,right);
 return {left,right,op:operation,answer,choices:mathChoices(answer,rng)};
}
export function awardDuel(scores:number[],player:number){const next=scores.map((n,i)=>n+(i===player?1:0));return {scores:next,winner:next[player]>=5?player:null};}
