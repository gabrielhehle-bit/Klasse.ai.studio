import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Mic, Trash2, Search, Filter, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export default function StimmNotizen() {
  const { app, setApp } = useApp();
  const [filter, setFilter] = useState('Alle');
  const [search, setSearch] = useState('');

  const notizen = app.stimmNotizen || [];
  
  const filtered = notizen.filter(n => {
    if (filter !== 'Alle' && n.kategorie !== filter) return false;
    if (search && !n.transkription.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());

  const deleteNote = (id: string) => {
    if (!confirm('Sicher, dass Sie diese Sprachnotiz löschen möchten?')) return;
    setApp(prev => ({
      ...prev,
      stimmNotizen: (prev.stimmNotizen || []).filter(n => n.id !== id)
    }));
  };

  return (
    <div className="h-full flex flex-col p-4 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-[1.5rem] leading-normal lg:text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Mic size={20} />
            </div>
            Stimm-Notizen
          </h1>
          <p className="text-[0.875rem] leading-snug font-bold text-slate-500 mt-2">Ihre gesprochenen Unterrichts- und Schüler-Notizen</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[0.875rem] leading-snug focus:outline-none focus:border-slate-300 transition-all font-medium"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-[0.875rem] leading-snug font-bold text-slate-700 cursor-pointer outline-none focus:border-slate-300 transition-all"
            >
              <option value="Alle">Alle Kategorien</option>
              <option value="Unterricht">Unterricht</option>
              <option value="Kind">Kind</option>
              <option value="Eltern">Eltern</option>
              <option value="Sonstiges">Sonstiges</option>
            </select>
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
           <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center h-64 flex flex-col items-center justify-center">
             <Mic className="text-slate-300 w-12 h-12 mb-4" />
             <h3 className="text-[1.125rem] leading-normal font-black text-slate-800">Keine Notizen gefunden</h3>
             <p className="text-[0.875rem] leading-snug font-medium text-slate-500 max-w-sm mx-auto mt-2">
               Sie haben noch keine Stimm-Notizen aufgenommen oder keine entspricht dem aktuellen Filter.
             </p>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             {filtered.map(note => {
               const student = app.schueler?.find(s => s.id === note.schuelerId);
               
               return (
                 <motion.div 
                   key={note.id}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col group relative"
                 >
                   <button 
                     onClick={() => deleteNote(note.id)}
                     className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                   >
                     <Trash2 size={16} />
                   </button>
                   
                   <div className="flex items-center gap-2 mb-4">
                     <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[0.625rem] font-black uppercase tracking-widest border border-slate-200/50">
                       {note.kategorie || 'Sonstiges'}
                     </span>
                     {student && (
                       <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[0.625rem] font-black uppercase tracking-widest border border-indigo-100/50">
                         {student.vorname} {student.nachname}
                       </span>
                     )}
                   </div>
                   
                   <p className="text-[0.875rem] leading-snug text-slate-700 leading-relaxed font-medium flex-1 mb-6">
                     {note.transkription}
                   </p>
                   
                   <div className="flex items-center gap-2 text-[0.75rem] leading-tight font-bold text-slate-400 mt-auto">
                     <Calendar size={14} />
                     {new Date(note.datum).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
                   </div>
                 </motion.div>
               );
             })}
           </div>
        )}
      </div>
    </div>
  );
}
