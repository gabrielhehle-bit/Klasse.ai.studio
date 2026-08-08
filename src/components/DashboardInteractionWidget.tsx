import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { berechneWochenEmpfehlung, getKalenderWoche } from '../lib/interaktionsAlgorithmus';
import { MessageSquare, RefreshCw, User } from 'lucide-react';
import { InteractionModal } from './InteractionModal';

export const DashboardInteractionWidget: React.FC = () => {
   const { app, setApp } = useApp();
   const [modalStudent, setModalStudent] = useState<string | null>(null);

   const empf = app.interaktionsLog?.wochenEmpfehlung;
   const today = new Date();
   const currentKw = getKalenderWoche(today);
   const currentYear = today.getFullYear();

   useEffect(() => {
      // Auto-calculate on Monday or if not present
      if (!empf || (today.getDay() === 1 && (empf.kw !== currentKw || empf.jahr !== currentYear))) {
         handleRecalculate();
      }
   }, []);

   const handleRecalculate = () => {
      const schuelerIds = berechneWochenEmpfehlung(
         app.interaktionsLog?.eintraege || [], 
         app.schueler || [], 
         app, 
         new Date(), 
         4 // Limit to 4 cards for widget? 3-5 is the requirement. 
      );
      setApp(prev => {
         const log = prev.interaktionsLog || { eintraege: [], wochenEmpfehlung: null };
         return {
            ...prev,
            interaktionsLog: {
               ...log,
               wochenEmpfehlung: {
                  kw: currentKw,
                  jahr: currentYear,
                  schuelerIds,
                  generiert: new Date().toISOString()
               }
            }
         };
      });
   };

   // Render children
   const recIds = empf?.schuelerIds || [];
   const renderCards = () => {
      if (app.schueler?.length === 0) {
         return <div className="p-4 text-center text-text-muted font-medium text-sm">Füge zuerst Schüler:innen hinzu.</div>;
      }
      
      return recIds.map(sid => {
         const student = app.schueler?.find(s => s.id === sid);
         if (!student) return null;

         // Need reasons again (the algo could return them, or we recount real quick)
         const student1to1 = (app.interaktionsLog?.eintraege || [])
            .filter(e => e.schuelerId === sid && e.war1zu1)
            .sort((a,b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
         
         const letze = student1to1.length > 0 ? new Date(student1to1[0].datum) : null;
         let daysWithout = letze ? Math.floor((today.getTime() - letze.getTime()) / (1000 * 3600 * 24)) : 999;
         
         let reasons = [];
         if (daysWithout === 999) reasons.push('Noch nie 1:1');
         else if (daysWithout > 14) reasons.push(`>14 Tage ohne 1:1`);
         else if (daysWithout > 7) reasons.push(`>7 Tage ohne 1:1`);
         else reasons.push(`Vor ${daysWithout} Tagen`);

         if (student.notiz?.toLowerCase().includes('daz') || student.espf || student.daz || student.spf) reasons.push('DaZ/SPF');
         const foerderplaene = student.foerderprofil?.massnahmen || [];
         if (foerderplaene.length > 0) reasons.push('Förderplan');

         return (
            <div key={sid} className="bg-surface2 rounded-2xl p-3 flex items-center justify-between gap-3 border border-border/80 hover:border-accent/40 transition-colors group">
               <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`w-10 h-10 rounded-full flex shrink-0 items-center justify-center text-lg font-black shadow-inner border border-border ${student.geschlecht === 'weiblich' ? 'bg-pink-500/10 text-pink-500' : student.geschlecht === 'männlich' ? 'bg-blue-500/10 text-blue-500' : 'bg-surface3/40 text-text-muted'}`}>
                     {student.emoji || <User size={18} />}
                  </div>
                  <div className="truncate">
                     <h4 className="text-sm font-black text-text-primary truncate">{student.vorname} {student.nachname}</h4>
                     <p className="text-[10px] text-text-muted truncate font-semibold uppercase tracking-wider">{reasons.join(' · ')}</p>
                  </div>
               </div>
               <button 
                  onClick={() => setModalStudent(sid)}
                  className="w-8 h-8 rounded-xl bg-surface border border-border text-accent hover:bg-accent hover:text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
                  title="Interaktion erfassen"
               >
                  <MessageSquare size={14} />
               </button>
            </div>
         );
      });
   };

   return (
      <div className="bg-surface rounded-[2.5rem] p-6 shadow-sm border border-border flex flex-col gap-4">
         <div className="flex justify-between items-center">
            <div>
               <h3 className="text-lg font-black text-text-primary flex items-center gap-2">
                  <MessageSquare size={18} className="text-accent" /> Diese Woche: Individuelle Aufmerksamkeit
               </h3>
               <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Errechnete Empfehlungen</p>
            </div>
            <button onClick={handleRecalculate} className="p-2 text-text-muted hover:text-accent hover:bg-surface2 rounded-xl transition-all" title="Neu berechnen">
               <RefreshCw size={16} />
            </button>
         </div>

         <div className="flex flex-col gap-2">
            {renderCards()}
         </div>

         <InteractionModal 
            isOpen={!!modalStudent} 
            onClose={() => setModalStudent(null)} 
            presetStudentId={modalStudent} 
         />
      </div>
   );
};
