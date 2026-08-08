import React, { useState } from 'react';
import { Target, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function TestPlannerWidget({ app }: { app: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    try {
      // Gather the last 4 weeks of plans
      const currentKw = app.currentKW || 42;
      const historyKws = [currentKw - 3, currentKw - 2, currentKw - 1, currentKw];
      
      let context = {};
      historyKws.forEach(kw => {
         if (app.wochenplanung && app.wochenplanung[kw]) {
             context[kw] = app.wochenplanung[kw];
         }
      });

      const prompt = `Analysiere die Stoffverteilung der letzten 4 Wochen (KW ${historyKws.join(', ')}). 
Schlage ein Raster für die nächste Lernzielkontrolle / Schularbeit (z.B. in Mathematik oder Deutsch) vor.
Bitte im exakt parsbaren JSON Format antworten, KEIN Markdown:
{
  "subject": "Mathematik oder Deutsch etc.",
  "recommended_kw": "KW X",
  "competencies": [
    { "name": "...", "weight": "z.B. 40%", "topics": ["Thema 1", "Thema 2"] }
  ],
  "advice": "Kurzer Tipp zur methodischen Abprüfung"
}

Kontext:
${JSON.stringify(context)}
`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
          subject: "Mathematik",
          recommended_kw: "Demnächst",
          competencies: [
              { name: "Rechenoperationen", weight: "50%", topics: ["Addition im Zahlenraum 100", "Einmaleins"] }
          ],
          advice: "Nicht genügend Planungsdaten der letzten Wochen gefunden. Planen Sie diese manuell ein."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
          <Target size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Lernzielkontrollen-Assistent</h2>
          <p className="text-sm font-medium text-slate-500">Analysiert die letzten 4 Wochen für optimale Schularbeit-Raster</p>
        </div>
      </div>

      {!result ? (
        <button 
          onClick={generate} 
          disabled={loading}
          className="bg-amber-100 text-amber-700 px-5 py-3 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors flex items-center gap-2 shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Aus Stoff der letzten 4 Wochen generieren
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
             <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-amber-900 border-b border-amber-200 pb-2 flex-1">Vorschlag: LZK {result.subject} ({result.recommended_kw})</h3>
                <button onClick={() => setResult(null)} className="text-xs text-amber-600 font-bold hover:underline ml-4">Neu generieren</button>
             </div>
             
             <div className="mt-4 space-y-3">
                {result.competencies?.map((comp: any, idx: number) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-amber-100 flex items-start gap-3">
                        <div className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded mt-0.5 min-w-[50px] text-center">{comp.weight}</div>
                        <div>
                            <div className="font-bold text-slate-700 text-sm">{comp.name}</div>
                            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-1">
                                {comp.topics?.map((t: string, i: number) => (
                                    <span key={i} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
             </div>
             
             {result.advice && (
                 <div className="mt-4 flex gap-2 items-start text-sm text-amber-800 bg-white/50 p-3 rounded-xl border border-amber-100/50">
                    <ArrowRight size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <span>{result.advice}</span>
                 </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}
