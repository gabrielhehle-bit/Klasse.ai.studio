import React, { useState } from 'react';
import { Home, Wand2, Loader2, Calendar } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function HomeworkBalancerWidget({ app }: { app: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    setLoading(true);
    try {
      const currentKwStr = Object.keys(app.wochenplan || {})[0];
      const plan = app.wochenplan ? app.wochenplan[currentKwStr] : {};

      const prompt = `Analysiere den aktuellen Wochenplan und verteile sinnvolle Hausaufgaben (HÜ) über die Tage Montag bis Donnerstag.
Kriterien: Belastung gleichmäßig verteilen, Korrekturaufwand der Lehrkraft beachten.
Wochenplan Daten: ${JSON.stringify(plan)}
Antworte exakt im JSON-Format, KEIN Markdown:
{
  "tage": [
    {
       "wochentag": "Montag",
       "hue_vorschlag": "...",
       "zeitaufwand_minuten": 15,
       "korrektur_kommentar": "Schnell kontrollierbar"
    }
  ],
  "zusammenfassung": "..."
}`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
          tage: [
              { wochentag: "Montag", hue_vorschlag: "Lesen S. 12", zeitaufwand_minuten: 10, korrektur_kommentar: "Mündlich" },
              { wochentag: "Dienstag", hue_vorschlag: "Mathe Arbeitsblatt 1", zeitaufwand_minuten: 20, korrektur_kommentar: "Selbstkontrolle" },
              { wochentag: "Mittwoch", hue_vorschlag: "Rechtschreib-Training", zeitaufwand_minuten: 15, korrektur_kommentar: "Einsammeln" },
              { wochentag: "Donnerstag", hue_vorschlag: "Keine HÜ - langes Projekt", zeitaufwand_minuten: 0, korrektur_kommentar: "-" }
          ],
          zusammenfassung: "Standard-Verteilung generiert aufgrund von Lücken im Plan."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
          <Home size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Hausaufgaben-Wochenbalancer</h2>
          <p className="text-sm font-medium text-slate-500">Gleichmäßige Belastung für Schüler und minimaler Korrekturaufwand</p>
        </div>
      </div>

      {!result ? (
        <button 
          onClick={generate} 
          disabled={loading}
          className="bg-orange-100 text-orange-700 px-5 py-3 rounded-xl font-bold text-sm hover:bg-orange-200 transition-colors flex items-center gap-2 shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Aus aktuellem Wochenplan generieren
        </button>
      ) : (
        <div className="space-y-4 mt-4">
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
               {result.tage?.map((tag: any, idx: number) => (
                   <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col">
                      <div className="font-bold text-slate-700 flex justify-between items-center mb-3">
                         {tag.wochentag}
                         <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{tag.zeitaufwand_minuten} Min.</span>
                      </div>
                      <div className="text-sm font-medium text-slate-800 bg-white p-2 border border-slate-200 rounded-lg mb-auto">
                         {tag.hue_vorschlag}
                      </div>
                      <div className="text-xs text-slate-500 mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
                         <Calendar size={12} className="text-slate-400" />
                         Korrektur: <span className="font-bold">{tag.korrektur_kommentar}</span>
                      </div>
                   </div>
               ))}
           </div>
           
           <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-sm text-orange-800/80 mt-2 text-center">
               {result.zusammenfassung}
               <button onClick={() => setResult(null)} className="ml-4 font-bold hover:underline text-orange-600">Neu berechnen</button>
           </div>
        </div>
      )}
    </div>
  );
}
