import React, { useState } from 'react';
import { Layers, Wand2, Loader2, ArrowRight } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function DifferentiationWidget({ app }: { app: any }) {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const prompt = `Erstelle für das Thema "${topic}" eine Niveaudifferenzierung in drei Stufen (Base, Advanced, Expert).
Bitte antworte im exakt parsbaren JSON Format, KEIN Markdown:
{
  "base": { "ziel": "...", "methodik": "...", "material_tipp": "..." },
  "advanced": { "ziel": "...", "methodik": "...", "material_tipp": "..." },
  "expert": { "ziel": "...", "methodik": "...", "material_tipp": "..." }
}`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult(parsed);
    } catch (e) {
      console.error(e);
      setResult({
          base: { ziel: "Grundverständnis aufbauen", methodik: "Viel Anschauungsmaterial", material_tipp: "Bilder und große Schrift" },
          advanced: { ziel: "Sichere Anwendung", methodik: "Selbstständiges Arbeiten", material_tipp: "Standardaufgaben" },
          expert: { ziel: "Transfer und Knobeln", methodik: "Offene Aufgabenstellungen", material_tipp: "Knobelkartei" }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center shrink-0">
          <Layers size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Differenzierungs-Matrix</h2>
          <p className="text-sm font-medium text-slate-500">Automatische methodische Reduktion & Knobelaufgaben</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input 
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Zu differenzierendes Thema (zB Bruchrechnen)"
          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
        />
        <button 
          onClick={generate} 
          disabled={loading || !topic}
          className="bg-fuchsia-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-fuchsia-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Matrix erstellen
        </button>
      </div>

      {result && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
               <h3 className="font-bold text-slate-700 text-center mb-3">🌱 Base <span className="block text-xs font-normal text-slate-500">(Unterstützung)</span></h3>
               <div className="space-y-3 text-sm">
                   <div><strong className="text-slate-600 block text-xs">Ziel:</strong> {result.base?.ziel}</div>
                   <div><strong className="text-slate-600 block text-xs">Methodik:</strong> {result.base?.methodik}</div>
                   <div className="bg-white p-2 rounded-xl text-slate-600 text-xs border border-slate-200">
                      <strong>Material:</strong> {result.base?.material_tipp}
                   </div>
               </div>
            </div>

            <div className="border border-fuchsia-200 rounded-2xl p-4 bg-fuchsia-50">
               <h3 className="font-bold text-fuchsia-900 text-center mb-3">🎯 Advanced <span className="block text-xs font-normal text-fuchsia-600">(Standard)</span></h3>
               <div className="space-y-3 text-sm">
                   <div><strong className="text-fuchsia-800 block text-xs">Ziel:</strong> {result.advanced?.ziel}</div>
                   <div><strong className="text-fuchsia-800 block text-xs">Methodik:</strong> {result.advanced?.methodik}</div>
                   <div className="bg-white p-2 rounded-xl text-fuchsia-800 text-xs border border-fuchsia-100">
                      <strong>Material:</strong> {result.advanced?.material_tipp}
                   </div>
               </div>
            </div>

            <div className="border border-indigo-200 rounded-2xl p-4 bg-indigo-50">
               <h3 className="font-bold text-indigo-900 text-center mb-3">🚀 Expert <span className="block text-xs font-normal text-indigo-600">(Forderung)</span></h3>
               <div className="space-y-3 text-sm">
                   <div><strong className="text-indigo-800 block text-xs">Ziel:</strong> {result.expert?.ziel}</div>
                   <div><strong className="text-indigo-800 block text-xs">Methodik:</strong> {result.expert?.methodik}</div>
                   <div className="bg-white p-2 rounded-xl text-indigo-800 text-xs border border-indigo-100">
                      <strong>Material:</strong> {result.expert?.material_tipp}
                   </div>
               </div>
            </div>
        </div>
      )}
    </div>
  );
}
