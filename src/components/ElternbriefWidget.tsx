import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import { Mail, Sparkles, Copy, CheckCircle2 } from 'lucide-react';

export default function ElternbriefWidget({ kwData, wochentyp }: { kwData: any, wochentyp: string }) {
  const [isLoading, setIsLoading] = useState(false);
  const [brief, setBrief] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    
    // Extract topics
    const subjectsCount: Record<string, string[]> = {};
    Object.values(kwData).forEach((day: any) => {
        Object.values(day).forEach((st: any) => {
            if (st && st.fach && st.thema) {
                if (!subjectsCount[st.fach]) subjectsCount[st.fach] = [];
                if (!subjectsCount[st.fach].includes(st.thema)) {
                    subjectsCount[st.fach].push(st.thema);
                }
            }
        });
    });

    const context = {
        kw: wochentyp,
        faecher: subjectsCount
    };

    const prompt = `Du bist Lehrkraft an einer Grundschule. Verfasse einen positiven, ermutigenden und übersichtlichen "Wochen-Rückblick" Elternbrief (ca. 100-150 Wörter) für die Eltern deiner Klasse.
Der Brief soll zusammenfassen, was die Kinder in der aktuellen Planungs-Woche (KW ${wochentyp}) tolles gelernt haben.
Nutze diese tatsächlichen Unterrichtsthemen als Basis:
${JSON.stringify(context, null, 2)}

Schreibe in einer klaren, freundlichen "Wir"-Form (z.B. "Diese Woche haben wir uns mit dem Thema X beschäftigt...").
Verwende am Ende eine verabschiedende Grußformel. Formatiere den Text ohne Markdown und direkt lesbar (oder nutze einfache Zeilenumbrüche).`;

    try {
      const response = await askAI(prompt, "Du bist eine freundliche Grundschullehrkraft.");
      setBrief(response.trim());
    } catch (e) {
      console.error(e);
      setBrief("Fehler beim Generieren. Bitte versuche es später noch einmal.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <Mail size={20} className="text-indigo-500" />
             Elternbrief-Generator & Rückblick
          </h2>
          <p className="text-sm text-slate-500 mt-1">
             Erstellt automatisch ein Wochen-Update für die Eltern/SchoolFox anhand deines Plans.
          </p>
        </div>
        <button 
          onClick={handleGenerate} 
          disabled={isLoading}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${isLoading ? 'bg-indigo-100 text-indigo-400' : brief ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'}`}
        >
          {isLoading ? (
             <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          ) : (
             <Sparkles size={16} />
          )}
          {isLoading ? 'Schreibe Brief...' : brief ? 'Neu entwerfen' : 'Text generieren'}
        </button>
      </div>

      {brief && (
         <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative mt-4 group">
            <button 
               onClick={copyToClipboard}
               className="absolute top-4 right-4 bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 flex items-center gap-2"
            >
               {copied ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Copy size={16} />}
               <span className="text-xs font-bold">{copied ? 'Kopiert!' : 'Kopieren'}</span>
            </button>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap font-medium">{brief}</p>
         </div>
      )}
    </div>
  );
}
