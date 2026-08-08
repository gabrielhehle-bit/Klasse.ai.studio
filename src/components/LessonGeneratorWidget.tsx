import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import { Sparkles, BrainCircuit, CheckCircle2 } from 'lucide-react';

export default function LessonGeneratorWidget({ materialTodo }: { materialTodo: any[] }) {
  const [selectedTopic, setSelectedTopic] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lessonPlan, setLessonPlan] = useState<any>(null);

  const handleGenerate = async (m: any) => {
    setSelectedTopic(m);
    setIsLoading(true);
    setLessonPlan(null);
    
    const context = {
        fach: m.fach,
        thema: m.thema || m.text,
        dauer_min: 50
    };

    const prompt = `Du bist Fach-didaktischer Experte für die Primarstufe (Grundschule).
Erstelle für das folgende Thema einen sauberen, extrem prägnanten Unterrichtsverlaufsplan (50 Minuten).
Antworte AUSSCHLIESSLICH mit gültigem JSON, das exakt folgendes Schema erfüllt:
{
  "phasen": [
    {
      "name": "Name der Phase (z.B. Einstieg, Erarbeitung, Sicherung)",
      "dauer": "X min",
      "lehrer_handlung": "Kurze, klare Beschreibung was du tust",
      "schueler_handlung": "Was machen die Kinder?",
      "sozialform": "Plenum / Einzel / Partner / Gruppe"
    }
  ],
  "tipp": "Ein kurzer gamification oder differenzierungs Tipp am Rande"
}

Hier sind die Eckdaten:
${JSON.stringify(context, null, 2)}`;

    try {
      const response = await askAI(prompt, "Du lieferst ausschließlich rohes JSON ohne Markdown.");
      const cleaned = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setLessonPlan(parsed);
    } catch (e) {
      console.error(e);
      setLessonPlan({ error: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="bg-indigo-100 p-3 rounded-full text-indigo-600 shrink-0">
           <Sparkles size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">KI-Unterrichtsverlauf Generator</h2>
          <p className="text-sm font-medium text-slate-500">Wähle eine Stunde aus dem aktuellen Plan, um einen 50-Minuten-Verlauf zu generieren.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 border border-slate-200 rounded-2xl p-4 max-h-[400px] overflow-y-auto bg-slate-50">
             <h3 className="font-bold text-slate-700 text-sm mb-4">Deine geplanten Stunden</h3>
             {materialTodo.length > 0 ? materialTodo.slice(0, 10).map((m, i) => {
                 const isSelected = selectedTopic === m;
                 return (
                 <div 
                    key={i} 
                    onClick={() => handleGenerate(m)}
                    className={`p-3 rounded-xl border cursor-pointer mb-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700'}`}
                 >
                    <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{m.fach}</div>
                    <div className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-indigo-900'}`}>{m.thema || m.text}</div>
                 </div>
             )}) : (
                 <div className="text-sm text-slate-500 italic text-center mt-8">Noch keine Themen im Plan (mit Materialverweis) gefunden.</div>
             )}
          </div>
          
          <div className="col-span-1 md:col-span-2">
             {!selectedTopic && !isLoading && !lessonPlan && (
                <div className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-white text-center">
                   <BrainCircuit size={48} className="text-slate-300 mb-4" />
                   <p className="text-slate-500 font-bold mb-1">KI-Verlaufsplan generieren</p>
                   <p className="text-xs text-slate-400">Klicke links auf ein Thema, um loszulegen.</p>
                </div>
             )}

             {isLoading && (
                <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-indigo-50/50 text-center border border-indigo-100">
                   <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
                   <p className="text-indigo-800 font-bold mb-1">Skizze wird generiert...</p>
                   <p className="text-xs text-indigo-600">Didaktische Phasen für "{selectedTopic?.thema || selectedTopic?.text}" werden geplant.</p>
                </div>
             )}

             {lessonPlan && !isLoading && !lessonPlan.error && (
                <div className="bg-slate-800 text-slate-200 p-6 rounded-2xl shadow-inner relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                       <BrainCircuit size={100} />
                   </div>
                   <div className="text-indigo-400 mb-4 font-bold text-sm tracking-widest uppercase border-b border-slate-700 pb-2">
                       // Verlauf: {selectedTopic?.thema || selectedTopic?.text}
                   </div>
                   
                   <div className="space-y-4">
                      {lessonPlan.phasen?.map((p: any, idx: number) => (
                         <div key={idx} className="bg-slate-900/50 border border-slate-700 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-indigo-300">{p.name}</span>
                               <span className="text-xs bg-slate-700 px-2 py-1 rounded text-white font-mono">{p.dauer}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                                <div><strong className="text-slate-400 block mb-1">Lehrkraft:</strong> {p.lehrer_handlung}</div>
                                <div><strong className="text-slate-400 block mb-1">Schüler:</strong> {p.schueler_handlung}</div>
                            </div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1 mt-3">
                               <Sparkles size={10} /> Sozialform: {p.sozialform}
                            </div>
                         </div>
                      ))}
                   </div>
                   
                   {lessonPlan.tipp && (
                       <div className="mt-4 bg-indigo-900/40 border border-indigo-500/30 p-3 rounded-lg flex items-start gap-3">
                          <CheckCircle2 size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                          <span className="text-indigo-200 text-sm leading-snug">{lessonPlan.tipp}</span>
                       </div>
                   )}
                </div>
             )}

             {lessonPlan && lessonPlan.error && (
                 <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-rose-50 text-center border border-rose-200">
                    <p className="text-rose-600 font-bold">Oh je, da hat sich die KI verschluckt.</p>
                    <p className="text-rose-500 text-xs mt-1">Versuche es bitte noch einmal oder lade die Seite neu.</p>
                    <button onClick={() => handleGenerate(selectedTopic)} className="mt-4 px-4 py-2 bg-rose-600 text-white font-bold rounded-lg text-sm hover:bg-rose-700">Neu generieren</button>
                 </div>
             )}
          </div>
      </div>
    </div>
  );
}
