import React, { useState } from 'react';
import { LayoutGrid, Wand2, Loader2, CheckCircle2 } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function StationPlanerWidget({ app }: { app: any }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const prompt = `Zerlege das Unterrichtsthema "${topic}" in 5 methodische Stationen (z.B. Lesestation, Schreibstation, Hörstation, Spielstation, Fühlstation).
Gib bitte formatiert in exaktem JSON zurück, KEIN Markdown:
{
  "stations": [
    { "name": "...", "method": "...", "material": "...", "description": "..." }
  ]
}`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
          stations: [
              { name: "Lese-Ecke", method: "Lesen", material: "Infotexte", description: "Fehler generieren fallback." },
              { name: "Forschertisch", method: "Experimentieren", material: "Lupen", description: "Bitte Thema prüfen." }
          ]
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
          <LayoutGrid size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Stationenbetrieb & Lerntheke</h2>
          <p className="text-sm font-medium text-slate-500">Methodische Stationen für dein Wochenthema generieren</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input 
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Thema (zB Der Wald im Herbst)"
          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button 
          onClick={generate} 
          disabled={loading || !topic}
          className="bg-teal-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Stationenplanung erstellen
        </button>
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
           {result.stations?.map((st: any, idx: number) => (
               <div key={idx} className="bg-teal-50/50 border border-teal-100 p-4 rounded-2xl">
                  <h3 className="font-bold text-teal-900 mb-1 flex items-center gap-2">
                     <span className="bg-teal-200 text-teal-800 w-6 h-6 rounded-full flex items-center justify-center text-xs">{idx + 1}</span>
                     {st.name}
                  </h3>
                  <div className="text-xs text-teal-700 font-medium mb-2 uppercase tracking-wide">{st.method}</div>
                  <p className="text-sm text-slate-600 mb-3">{st.description}</p>
                  
                  <div className="bg-white p-2 rounded-xl border border-teal-100 text-xs font-medium text-slate-500 flex items-start gap-2">
                     <CheckCircle2 size={14} className="text-teal-400 shrink-0 mt-0.5" />
                     Material: {st.material}
                  </div>
               </div>
           ))}
        </div>
      )}
    </div>
  );
}
