import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Circle, Plus, Target, Trash2 } from 'lucide-react';

export default function WeeklyGoalsWidget({ kw }: { kw: number }) {
  const { app, updateApp } = useApp();
  const [newGoal, setNewGoal] = useState('');

  const goals = app.wochenZiele || [];

  const addGoal = () => {
    if (!newGoal.trim()) return;
    const newGoals = [...goals, { id: Date.now().toString(), text: newGoal.trim(), done: false }];
    updateApp({ wochenZiele: newGoals });
    setNewGoal('');
  };

  const toggleGoal = (id: string) => {
    const newGoals = goals.map(g => g.id === id ? { ...g, done: !g.done } : g);
    updateApp({ wochenZiele: newGoals });
  };

  const deleteGoal = (id: string) => {
    updateApp({ wochenZiele: goals.filter(g => g.id !== id) });
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50/50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm mb-6 pb-6">
      <div className="flex items-center gap-3 mb-4">
         <div className="bg-indigo-100/80 p-2 rounded-xl text-indigo-600 shadow-sm">
            <Target size={20} />
         </div>
         <div>
             <h3 className="font-bold text-slate-800">Mission KW {kw}</h3>
             <p className="text-xs font-medium text-slate-500">Dein Fokus für diese Woche</p>
         </div>
      </div>
      
      <div className="space-y-2 mb-3">
         {goals.length === 0 && <p className="text-sm text-slate-400 italic">Noch keine Ziele festgelegt. Was ist dir diese Woche wichtig?</p>}
         {goals.map((g) => (
            <div key={g.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${g.done ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200 hover:border-indigo-200'}`}>
               <button onClick={() => toggleGoal(g.id)} className="flex items-center gap-3 flex-1 text-left">
                  {g.done ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> : <Circle size={18} className="text-slate-300 shrink-0" />}
                  <span className={`text-sm font-bold ${g.done ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{g.text}</span>
               </button>
               <button onClick={() => deleteGoal(g.id)} className="text-slate-300 hover:text-rose-500 p-1 shrink-0">
                  <Trash2 size={16} />
               </button>
            </div>
         ))}
      </div>
      
      <div className="flex gap-2">
         <input 
            type="text"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addGoal(); }}
            placeholder="Neues Ziel (z.B. Anna extra loben)"
            className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
         />
         <button onClick={addGoal} disabled={!newGoal.trim()} className="bg-indigo-600 text-white p-2 rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition">
            <Plus size={18} />
         </button>
      </div>
    </div>
  );
}
