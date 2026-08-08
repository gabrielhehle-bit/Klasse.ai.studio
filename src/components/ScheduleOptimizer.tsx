import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { askAI } from '../services/aiService';
import { CalendarRange, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { getKW } from '../lib/utils';
import { KI_SYSTEM_PROMPTS } from '../kiSystemPrompts';

export default function ScheduleOptimizer() {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const currDate = new Date();
  const actualKW = getKW(currDate);
  const activeKW = app.currentKW || actualKW;
  const kwData = app.wochenplanung?.[activeKW] || {};

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const scheduleData = JSON.stringify(kwData, null, 2);
      const prompt = `Analysiere den folgenden Stundenplan für die KW ${activeKW} auf Plausibilität (z.B. Verteilung von Kernfächern wie Deutsch/Mathe am Vormittag/Nachmittag, Abwechslung zwischen kognitiven und kreativen/motorischen Fächern, sinnvolle Blockung). 
      
Gib mir eine kurze, freundliche Zusammenfassung und konkrete Optimierungsvorschläge. Wenn möglich, liefere anwendbare Verbesserungen im JSON-Format, die direkt eingespielt werden können (ein Array von Änderungen mit 'tag' (z.B. 'Montag'), 'stunde' (Index 0-5), neuem 'fach' und kurzer 'begruendung'). Bitte antworte im Format:
{
  "zusammenfassung": "dein text",
  "vorschlaege": ["vorschlag 1", "vorschlag 2"],
  "updates": [
     { "tag": "Montag", "stunde": 4, "fach": "Bewegung", "begruendung": "Kurze Begründung für die Änderung" }
  ]
}

Aktueller Plan:
${scheduleData}
      `;
      
      const response = await askAI(prompt, "Du bist ein Experte für Unterrichtsplanung in der Primarstufe. Antworte ausschließlich mit gültigem JSON, das exakt dem geforderten Schema entspricht.");
      
      const sanitizedResponse = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(sanitizedResponse);
      setAnalysis(parsed);
      
      setApp({
        ...app,
        scheduleAnalysis: {
          ...(app.scheduleAnalysis || {}),
          [activeKW]: parsed
        }
      });
      
    } catch (e) {
      console.error(e);
      setAnalysis({
          error: "Fehler bei der Analyse. Versuche es noch einmal."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyUpdates = () => {
    if (!analysis?.updates) return;
    const currentWeekPlan = { ...kwData };
    const TAGE_NAMEN = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    
    let updatesApplied = 0;
    analysis.updates.forEach((update: any) => {
      const tagIndex = TAGE_NAMEN.indexOf(update.tag);
      if (tagIndex !== -1 && update.stunde !== undefined && update.fach) {
         if (!currentWeekPlan[tagIndex]) currentWeekPlan[tagIndex] = {};
         if (!currentWeekPlan[tagIndex][update.stunde]) currentWeekPlan[tagIndex][update.stunde] = {};
         currentWeekPlan[tagIndex][update.stunde].fach = update.fach;
         updatesApplied++;
      }
    });
    
    setApp({
       ...app,
       wochenplanung: {
           ...app.wochenplanung,
           [activeKW]: currentWeekPlan
       },
       scheduleAnalysis: {
           ...(app.scheduleAnalysis || {}),
           [activeKW]: null
       }
    });
    
    setAnalysis({
       ...analysis,
       applied: true
    });
    
    showToast(`Erfolgreich ${updatesApplied} Änderung(en) in den Wochenplan übernommen.`, 'success');
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm overflow-y-auto max-h-full">
       <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><CalendarRange size={24} className="text-emerald-500" /> Stundenplan-Check</h2>
            <p className="text-sm font-medium text-slate-500">Plausibilitätsprüfung und Optimierung deiner Planung für KW {activeKW}</p>
          </div>
       </div>
       
       {!analysis && !isLoading && (
          <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100">
             <CalendarRange size={48} className="mx-auto text-slate-300 mb-4" />
             <h3 className="font-bold text-slate-700 mb-2">Wie gut ist deine Woche strukturiert?</h3>
             <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">Die KI prüft Fächerverteilung, Rhythmisierung und Ausgewogenheit und generiert Verbesserungsvorschläge, die du per Knopfdruck anwenden kannst.</p>
             <button onClick={handleAnalyze} className="btn-primary inline-flex items-center gap-2">
                <Sparkles size={18} /> Plan jetzt analysieren
             </button>
          </div>
       )}
       
       {isLoading && (
          <div className="text-center py-12">
             <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Sparkles size={24} className="text-emerald-500 animate-spin" />
             </div>
             <p className="font-bold text-slate-600">KI analysiert Stundenplan...</p>
          </div>
       )}
       
       {analysis && !isLoading && !analysis.error && (
          <div className="space-y-6">
             <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl">
                 <h3 className="font-bold text-emerald-900 mb-2">KI-Zusammenfassung</h3>
                 <p className="text-sm text-emerald-800">{analysis.zusammenfassung}</p>
             </div>
             
             {analysis.vorschlaege && analysis.vorschlaege.length > 0 && (
                 <div>
                    <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ArrowRight size={18} /> Optimierungsvorschläge</h3>
                    <ul className="space-y-2">
                       {analysis.vorschlaege.map((v: string, i: number) => (
                           <li key={i} className="flex gap-2 items-start text-sm text-slate-600 bg-slate-50 p-3 border border-slate-100 rounded-xl">
                              <CheckCircle2 size={16} className="shrink-0 text-emerald-400 mt-0.5" /> <span>{v}</span>
                           </li>
                       ))}
                    </ul>
                 </div>
             )}
             
             {analysis.updates && analysis.updates.length > 0 && (
                 <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                    <h3 className="font-bold text-indigo-900 mb-3">Vorschläge direkt anwenden</h3>
                    <p className="text-sm text-indigo-800 mb-4">Die KI schlägt {analysis.updates.length} Anpassungen vor (z.B. {analysis.updates[0].fach} am {analysis.updates[0].tag}).</p>
                    
                    {analysis.applied ? (
                       <button disabled className="w-full bg-emerald-600 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm">
                          <CheckCircle2 size={18} /> Erfolgreich angewendet
                       </button>
                    ) : (
                       <button onClick={applyUpdates} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
                          <Sparkles size={18} /> Änderungen in Wochenplan übernehmen
                       </button>
                    )}
                 </div>
             )}
             
             <div className="text-center">
                 <button onClick={() => setAnalysis(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 underline">
                    Neue Analyse starten
                 </button>
             </div>
          </div>
       )}
       
       {analysis && analysis.error && (
          <div className="text-center py-10 bg-red-50 text-red-600 rounded-2xl">
             <p className="font-bold">{analysis.error}</p>
             <button onClick={() => setAnalysis(null)} className="mt-4 px-4 py-2 bg-red-100 rounded-xl font-bold">Nochmal versuchen</button>
          </div>
       )}
    </div>
  );
}
