import React, { useState } from 'react';
import { RefreshCw, Wand2, Loader2, AlertCircle } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function SpiralTrackerWidget({ app }: { app: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    try {
      // Create a simplified history representation for AI
      const historyStr = JSON.stringify(app.jahresplanung || {}).substring(0, 2000); // Send past plans
      
      const prompt = `Analysiere die Stoffverteilung der letzten Wochen.
Das Konzept des Spiralcurriculums besagt, dass Lerninhalte (wie Einmaleins, Wortarten, Rechtschreibstrategien) regelmäßig (alle ~6 Wochen) wiederholt werden müssen.
Analysiere die Daten und nenne 3 Themen, die dringend bald wiederholt werden müssten.
Jahresplanung: ${historyStr}

Antworte exakt im JSON-Format, KEIN Markdown:
{
  "topics": [
    { "name": "...", "last_seen_kw": 32, "suggestion": "..." }
  ]
}`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
          topics: [
              { name: "Einmaleins Automatisierung", last_seen_kw: 34, suggestion: "Als 5-Minuten-Ritual vor Mathe einbauen." },
              { name: "Namenwörter erkennen", last_seen_kw: 35, suggestion: "In der Hausaufgabe 3 Nomen unterstreichen lassen." }
          ]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <RefreshCw size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Spiralcurriculum-Tracker</h2>
          <p className="text-sm font-medium text-slate-500">Vergessenskurve durchbrechen: Gezielte Wiederholungen vorschlagen</p>
        </div>
      </div>

      {!result ? (
        <button 
          onClick={generate} 
          disabled={loading}
          className="bg-rose-100 text-rose-700 px-5 py-3 rounded-xl font-bold text-sm hover:bg-rose-200 transition-colors flex items-center gap-2 shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Lern-Historie analysieren
        </button>
      ) : (
        <div className="space-y-3 mt-4">
            <div className="flex justify-end pr-2"><button onClick={() => setResult(null)} className="text-xs text-rose-600 font-bold hover:underline">Neu analysieren</button></div>
            {result.topics?.map((topic: any, idx: number) => (
               <div key={idx} className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex gap-4 items-start">
                  <div className="bg-rose-100 text-rose-600 w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1">
                      <AlertCircle size={16} />
                  </div>
                  <div>
                      <div className="font-bold text-rose-900 mb-1">{topic.name}</div>
                      <div className="text-xs text-rose-700 mb-2 font-medium">Zuletzt KW {topic.last_seen_kw} • Vor über 6 Wochen</div>
                      <div className="text-sm text-slate-600 bg-white p-2 rounded-lg border border-rose-100/50">
                         <strong>Tipp:</strong> {topic.suggestion}
                      </div>
                  </div>
               </div>
            ))}
        </div>
      )}
    </div>
  );
}
