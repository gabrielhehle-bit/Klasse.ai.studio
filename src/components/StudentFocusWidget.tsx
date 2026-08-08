import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import { Users, Sparkles, BrainCircuit } from 'lucide-react';
import { getSW } from '../lib/utils';

export default function StudentFocusWidget() {
  const { app } = useApp();
  const students = app.schueler || [];
  const currDate = new Date();
  const currentKW = getSW(currDate, app.schuljahr || '');
  const [fokus, setFokus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    
    // Create a simplified student status map
    const studentData = students.map(s => {
       const notas = app.schuelerNotizen?.[s.id] || '';
       return { name: s.vorname, notizen: notas };
    }).filter(s => s.notizen.length > 5); // only send those with notes to save tokens

    if (studentData.length === 0) {
        setFokus([{ name: "Hinweis", grund: "Nicht genug Schülernotizen vorhanden, um einen KI-Fokus zu generieren. Mach dir mehr Notizen im 'Klasse'-Reiter!", tipp: "Beobachte diese Woche das Sozialverhalten." }]);
        setIsLoading(false);
        return;
    }

    const prompt = `Analysiere die folgenden verkürzten Beobachtungsnotizen von Schülern. 
Wähle 2-3 Kinder aus, die diese Woche (KW ${currentKW + 1}) besondere Aufmerksamkeit, Lob oder Hilfe brauchen könnten (z.B. weil sie im Rückstand waren, Konflikte hatten oder sich extrem angestrengt haben).
Verhalte dich wie ein erfahrener Pädagoge. Antworte AUSSCHLIESSLICH als JSON-Array in genau diesem Format:
[
  { "name": "Name des Kindes", "grund": "Kurzer Grund aus den Notizen", "tipp": "1 konkreter pädagogischer Kurz-Tipp für diese Woche" }
]

Notizen:
${JSON.stringify(studentData)}`;

    try {
      const response = await askAI(prompt, "Du bist Pädagoge. Antworte rein mit JSON-Array.");
      const cleaned = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setFokus(parsed);
    } catch (e) {
      console.error(e);
      setFokus([{ name: "Fehler", grund: "KI konnte die Daten nicht richtig auswerten.", tipp: "Bitte später nochmal probieren." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Users size={20} className="text-indigo-500" />
             KI-Schülerfokus der Woche
          </h2>
          <p className="text-sm text-slate-500 mt-1">
             Stützt sich auf deine Beobachtungen und Notizen der Kinder.
          </p>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isLoading ? 'bg-indigo-100 text-indigo-400' : fokus ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}`}
        >
          {isLoading ? (
             <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          ) : (
             <Sparkles size={16} />
          )}
          {isLoading ? 'Analysiere Notizen...' : fokus ? 'Neu generieren' : 'Fokus finden'}
        </button>
      </div>

      {!fokus && !isLoading && (
         <div className="text-center py-6 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <BrainCircuit size={32} className="mx-auto text-indigo-200 mb-2" />
            <span className="text-slate-500 text-sm font-bold">Wer braucht diese Woche Support?</span>
         </div>
      )}

      {fokus && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fokus.map((f: any, i: number) => (
                <div key={i} className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-200/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                   <h3 className="font-black text-indigo-900 mb-2">{f.name}</h3>
                   <div className="text-xs text-indigo-800/70 font-medium mb-3 min-h-[40px] italic">"{f.grund}"</div>
                   <div className="bg-white rounded-xl p-3 text-xs leading-relaxed text-slate-700 shadow-sm font-medium border border-slate-100/50">
                      <strong className="text-indigo-600 block mb-1 uppercase tracking-wider text-[10px]">💡 KI-Tipp</strong>
                      {f.tipp}
                   </div>
                </div>
            ))}
         </div>
      )}
    </div>
  );
}
