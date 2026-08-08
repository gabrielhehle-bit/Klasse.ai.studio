import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { InteraktionsEintrag } from '../types';
import { getKalenderWoche } from '../lib/interaktionsAlgorithmus';
import { Filter, Search, MessageSquare, Sparkles, Lightbulb, Trash2 } from 'lucide-react';

export const InteractionLogView: React.FC = () => {
  const { app, setApp } = useApp();
  const schueler = app.schueler || [];
  const interaktionsLog = app.interaktionsLog?.eintraege || [];

  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterTyp, setFilterTyp] = useState<string>('all');
  const [filter1zu1, setFilter1zu1] = useState<string>('all');
  
  // Heatmap Weeks (letzte 8)
  const heatmapWeeks = useMemo(() => {
    const weeks = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      weeks.push({
        kw: getKalenderWoche(d),
        year: d.getFullYear(),
        date: d
      });
    }
    return weeks;
  }, []);

  const heatMapData = useMemo(() => {
    return schueler.map(s => {
       const countsByWeek = heatmapWeeks.map(w => {
          const count = interaktionsLog.filter(e => {
             if (e.schuelerId !== s.id || !e.war1zu1) return false;
             const ed = new Date(e.datum);
             return getKalenderWoche(ed) === w.kw && ed.getFullYear() === w.year;
          }).length;
          return count;
       });
       return { student: s, countsByWeek };
    }).sort((a,b) => a.student.vorname.localeCompare(b.student.vorname));
  }, [schueler, interaktionsLog, heatmapWeeks]);


  const filteredVerlauf = useMemo(() => {
     return interaktionsLog.filter(e => {
        if (filterStudent !== 'all' && e.schuelerId !== filterStudent) return false;
        if (filterTyp !== 'all' && e.typ !== filterTyp) return false;
        if (filter1zu1 === 'yes' && !e.war1zu1) return false;
        if (filter1zu1 === 'no' && e.war1zu1) return false;
        return true;
     }).sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [interaktionsLog, filterStudent, filterTyp, filter1zu1]);

  const handleDelete = (id: string) => {
    if (!window.confirm('Eintrag wirklich löschen?')) return;
    setApp(prev => ({
      ...prev,
      interaktionsLog: {
        ...prev.interaktionsLog,
        eintraege: (prev.interaktionsLog.eintraege || []).filter((e: InteraktionsEintrag) => e.id !== id)
      }
    }));
  };

  return (
    <div className="space-y-12">
      {/* Pedagogical Intro */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[2.5rem] p-8 flex flex-col md:flex-row gap-8 items-start shadow-sm">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
          <MessageSquare size={32} />
        </div>
        <div className="space-y-3 flex-1 text-left">
          <div className="flex items-center gap-3">
            <h3 className="text-[1.25rem] font-black text-slate-900 leading-none">Interaktions-Log & Beziehungsarbeit</h3>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-[0.5625rem] font-black uppercase tracking-widest">Dokumentation</span>
          </div>
          <p className="text-[0.9375rem] text-slate-700 leading-relaxed font-medium">
            Beziehungsarbeit ist das Fundament für erfolgreiches Lernen. Hier dokumentieren Sie systematisch Ihre sozialen Kontakte zu den Kindern. Das Ziel ist nicht die Überwachung, sondern die Sicherstellung, dass jedes Kind – auch die 'Stillen' – Ihre Aufmerksamkeit erhält.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-white/60 p-4 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
              <Lightbulb size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-slate-700 font-bold leading-snug">
                Nutzen Sie die <span className="text-indigo-600">Heatmap</span>, um zu sehen, wen Sie in letzter Zeit vielleicht 'übersehen' haben.
              </p>
            </div>
            <div className="bg-white/60 p-4 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
              <Sparkles size={18} className="text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-[0.8125rem] text-slate-700 font-bold leading-snug">
                Ein <span className="text-emerald-600 text-[0.875rem]">Lob</span> im Log ist wertvolle Munition für positive Bestärkung im Elterngespräch.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Header Profile Section */}
       <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-6">Kurzprofile & 1:1 Übersicht</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {schueler.map(s => {
                const sLog = interaktionsLog.filter(e => e.schuelerId === s.id);
                const s1to1 = sLog.filter(e => e.war1zu1).sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
                const letzeDate = s1to1.length > 0 ? new Date(s1to1[0].datum).toLocaleDateString('de-DE') : 'Nie';
                
                return (
                   <div key={s.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="font-bold text-slate-800">{s.vorname} {s.nachname}</div>
                      <div className="text-xs text-slate-500 font-medium mb-2">1:1 Kontakte: <span className="font-black text-slate-700">{s1to1.length}</span> (Zuletzt: {letzeDate})</div>
                      <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
                         {['gespraech', 'feedback', 'beobachtung', 'konflikt', 'lob', 'foerderung'].map(t => {
                            const tc = sLog.filter(e => e.typ === t).length;
                            if (tc === 0) return null;
                            const perc = (tc / Math.max(sLog.length, 1)) * 100;
                            const colors: any = { gespraech: 'bg-blue-500', feedback: 'bg-amber-500', beobachtung: 'bg-purple-500', konflikt: 'bg-rose-500', lob: 'bg-emerald-500', foerderung: 'bg-cyan-500' };
                            return <div key={t} style={{ width: `${perc}%` }} className={`${colors[t]}`} title={`${t}: ${tc}`} />
                         })}
                      </div>
                   </div>
                );
             })}
          </div>
       </div>

       {/* Heatmap Section */}
       <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-800 mb-6">1:1-Interaktionen Heatmap (Letzte 8 Wochen)</h2>
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr>
                      <th className="p-2 text-sm font-bold text-slate-500 border-b">Schüler/in</th>
                      {heatmapWeeks.map(w => (
                         <th key={w.kw} className="p-2 text-xs font-bold text-slate-400 text-center border-b">KW {w.kw}</th>
                      ))}
                   </tr>
                </thead>
                <tbody>
                   {heatMapData.map(row => (
                      <tr key={row.student.id} className="border-b border-slate-50 hover:bg-slate-50">
                         <td className="p-2 text-sm font-semibold text-slate-700 whitespace-nowrap">{row.student.vorname} {row.student.nachname}</td>
                         {row.countsByWeek.map((c, i) => (
                            <td key={i} className="p-1">
                               <div className={`h-8 w-full rounded-md flex items-center justify-center font-bold text-[10px] ${
                                  c === 0 ? 'bg-slate-50 text-transparent hover:text-slate-300' :
                                  c === 1 ? 'bg-emerald-100 text-emerald-700' :
                                  c === 2 ? 'bg-emerald-300 text-emerald-800' :
                                  'bg-emerald-500 text-white'
                               }`}>
                                  {c > 0 ? c : ''}
                               </div>
                            </td>
                         ))}
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>

       {/* Verlauf Table */}
       <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
             <h2 className="text-xl font-black text-slate-800">Gesamter Verlauf</h2>
             <div className="flex flex-wrap items-center gap-3">
                <select value={filterStudent} onChange={e => setFilterStudent(e.target.value)} className="bg-slate-50 border-slate-200 border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-emerald-500">
                   <option value="all">Alle Kinder</option>
                   {schueler.map(s => <option key={s.id} value={s.id}>{s.vorname} {s.nachname}</option>)}
                </select>
                <select value={filterTyp} onChange={e => setFilterTyp(e.target.value)} className="bg-slate-50 border-slate-200 border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-emerald-500">
                   <option value="all">Alle Typen</option>
                   <option value="gespraech">Gespräch</option>
                   <option value="feedback">Feedback</option>
                   <option value="beobachtung">Beobachtung</option>
                   <option value="konflikt">Konflikt</option>
                   <option value="lob">Lob</option>
                   <option value="foerderung">Förderung</option>
                </select>
                <select value={filter1zu1} onChange={e => setFilter1zu1(e.target.value)} className="bg-slate-50 border-slate-200 border rounded-lg px-3 py-1.5 text-sm font-semibold outline-none focus:border-emerald-500">
                   <option value="all">Alle (1:1 & Gruppe)</option>
                   <option value="yes">Nur 1:1</option>
                   <option value="no">Nur Gruppe</option>
                </select>
             </div>
          </div>
          
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <th className="p-3 font-black rounded-tl-xl">Datum</th>
                      <th className="p-3 font-black">Kind</th>
                      <th className="p-3 font-black">Typ</th>
                      <th className="p-3 font-black">1:1</th>
                      <th className="p-3 font-black">Kontext</th>
                      <th className="p-3 font-black">Notiz & Dauer</th>
                      <th className="p-3 font-black rounded-tr-xl">Aktion</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                   {filteredVerlauf.length === 0 ? (
                      <tr>
                         <td colSpan={6} className="p-8 text-center text-slate-500 font-semibold italic">Keine Einträge gefunden.</td>
                      </tr>
                   ) : filteredVerlauf.map(e => {
                      const s = schueler.find(cs => cs.id === e.schuelerId);
                      return (
                         <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 text-sm font-bold text-slate-600 whitespace-nowrap">{new Date(e.datum).toLocaleDateString()}</td>
                            <td className="p-3 text-sm font-black text-slate-800">{s?.vorname || '?'}</td>
                            <td className="p-3 text-sm font-semibold text-slate-600 capitalize">{e.typ}</td>
                            <td className="p-3 text-sm">{e.war1zu1 ? <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-xs uppercase text-center w-8 inline-block">Ja</span> : <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold text-xs uppercase text-center w-8 inline-block">-</span>}</td>
                            <td className="p-3 text-sm font-medium text-slate-600">{e.kontext || '-'}</td>
                            <td className="p-3 text-sm text-slate-500 max-w-xs truncate" title={e.notiz}>{e.notiz || '-'}{e.dauer ? ` (${e.dauer} Min)` : ''}</td>
                            <td className="p-3 text-right">
                               <button 
                                 onClick={() => handleDelete(e.id)} 
                                 className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                 title="Eintrag löschen"
                               >
                                 <Trash2 size={16} />
                               </button>
                            </td>
                         </tr>
                      );
                   })}
                </tbody>
             </table>
          </div>
       </div>

    </div>
  );
};
