import React, { useState } from 'react';
import { Book, Wand2, Loader2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { askAI } from '../../services/aiService';
import { LEHRPLAN_VS_2023 } from '../../lehrplan';

export default function LehrplanCheckWidget({ app, setApp, nextKW, kw }: { app: any, setApp: any, nextKW: number, kw: any }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const checkLehrplan = async () => {
    setLoading(true);
    try {
      const planData: any[] = [];
      const selektierteKompetenzen: any[] = [];
      const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
      
      [0, 1, 2, 3, 4].forEach(dayIdx => {
          const dayName = dayNames[dayIdx];
          const day = kw[dayIdx];
          if (day) {
              Object.keys(day).forEach(zIdx => {
                  const stunde = day[zIdx];
                  if (stunde && stunde.fach && stunde.thema) {
                      planData.push({
                          slot: `${dayName} Stunde ${parseInt(zIdx) + 1}`,
                          fach: stunde.fach,
                          thema: stunde.thema
                      });
                  }
                  
                  // Lehrplan-Mappings für diese Stunde abrufen
                  const key = `${nextKW}-${dayName}-${zIdx}`;
                  const mapped = app.wochenplan_lehrplan?.[key];
                  if (mapped && mapped.length > 0) {
                      mapped.forEach((m: any) => {
                          const fachData = LEHRPLAN_VS_2023[m.fach]?.[app.stufe || 1];
                          if (fachData) {
                              const kb = fachData.find(k => k.id === m.kompetenzbereichId);
                              if (kb) {
                                  const ans = m.anwendungsbereichIds.map((aId: string) => kb.anwendungsbereiche.find(a => a.id === aId)?.titel).filter(Boolean);
                                  selektierteKompetenzen.push({
                                      slot: `${dayName} Stunde ${parseInt(zIdx) + 1}`,
                                      fach: m.fach,
                                      kompetenz: kb.titel,
                                      ziele: ans
                                  });
                              }
                          }
                      });
                  }
              });
          }
      });

      if (planData.length === 0) {
          setResult({ 
              status: "warning", 
              message: "Keine Planungseinträge für die Woche gefunden. Bitte plane zuerst deinen Unterricht." 
          });
          setLoading(false);
          return;
      }

      if (selektierteKompetenzen.length === 0) {
          setResult({ 
              status: "warning", 
              message: "Keine Lehrplankompetenzen im Wochenplan zugewiesen. Bitte weise den Stunden Lehrplanziele zu, um den Check zu starten." 
          });
          setLoading(false);
          return;
      }

      const prompt = `Analysiere die folgende stündliche Unterrichtsplanung und gleiche sie mit den zugewiesenen Lehrplankompetenzen ab.
      
Planung (Themen): ${JSON.stringify(planData)}
Zugewiesene Kompetenzen: ${JSON.stringify(selektierteKompetenzen)}

Gibt es Diskrepanzen? (Z.B. Thema passt inhaltlich nicht zur zugewiesenen Kompetenz, oder es fehlt offensichtlich etwas Wichtiges).
Formatiere deine Antwort als exaktes JSON, KEIN Markdown:
{
  "matches": [
    { "slot": "...", "status": "ok", "comment": "passt gut zusammen" }
  ],
  "warnings": [
    { "slot": "...", "issue": "...", "suggestion": "..." }
  ],
  "summary": "Gesamtfazit der Abdeckung"
}`;

      const res = await askAI('ki-helfer', prompt);
      const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      setResult({ status: "success", data: parsed });

      setApp((prev: any) => ({
          ...prev,
          lehrplanChecksHistory: [
              {
                  date: new Date().toISOString(),
                  kw: nextKW,
                  summary: parsed.summary,
                  warnings: parsed.warnings || [],
                  matches: parsed.matches || []
              },
              ...(prev.lehrplanChecksHistory || [])
          ]
      }));
    } catch (e) {
      console.error(e);
      setResult({ 
          status: "error", 
          message: "Ein Fehler ist bei der KI-Analyse aufgetreten. Bitte versuche es erneut." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
          <Book size={24} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-800">Lehrplan-Abgleich</h2>
          <p className="text-sm font-medium text-slate-500">Prüft Themen ggf. auf Diskrepanzen zu den hinterlegten Lernzielen</p>
        </div>
        {!result && (
          <button 
            onClick={checkLehrplan} 
            disabled={loading}
            className="bg-cyan-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Jetzt prüfen
          </button>
        )}
      </div>

      {result && result.status === "warning" && (
         <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-sm flex gap-3 items-center">
            <AlertTriangle size={20} className="shrink-0 text-amber-500" />
            <span>{result.message}</span>
            <button onClick={() => setResult(null)} className="ml-auto font-bold text-amber-700 hover:underline">Neu laden</button>
         </div>
      )}

      {result && result.status === "error" && (
         <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200 text-sm flex gap-3 items-center">
            <AlertTriangle size={20} className="shrink-0 text-rose-500" />
            <span>{result.message}</span>
            <button onClick={() => setResult(null)} className="ml-auto font-bold text-rose-700 hover:underline">Neu laden</button>
         </div>
      )}

      {result && result.status === "success" && result.data && (
        <div className="space-y-4">
           {result.data.warnings && result.data.warnings.length > 0 && (
               <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  <h3 className="font-bold text-rose-900 mb-3 flex items-center gap-2">
                     <AlertTriangle size={16} /> Gefundene Diskrepanzen
                  </h3>
                  <div className="space-y-3">
                     {result.data.warnings.map((w: any, idx: number) => (
                         <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100/50 shadow-sm text-sm">
                             <div className="font-bold text-slate-800 mb-1">{w.slot}</div>
                             <div className="text-rose-700 font-medium mb-1">Problem: {w.issue}</div>
                             <div className="text-slate-600 flex items-start gap-1">
                                <ArrowRight size={14} className="shrink-0 mt-0.5 text-rose-400" /> 
                                <span>Tipp: {w.suggestion}</span>
                             </div>
                         </div>
                     ))}
                  </div>
               </div>
           )}

           {(!result.data.warnings || result.data.warnings.length === 0) && (
               <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3 items-center text-emerald-800">
                  <CheckCircle2 size={24} className="text-emerald-500" />
                  <div>
                    <div className="font-bold">Alles im grünen Bereich!</div>
                    <div className="text-sm opacity-90">Keine Diskrepanzen zwischen Planung und Lehrplan gefunden.</div>
                  </div>
               </div>
           )}

           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm mt-4">
              <h3 className="font-bold text-slate-700 mb-2">Gesamtfazit der KI:</h3>
              <p className="text-slate-600">{result.data.summary}</p>
           </div>
           
           <div className="flex justify-end pt-2">
              <button 
                 onClick={checkLehrplan} 
                 disabled={loading}
                 className="text-cyan-700 font-bold text-sm flex items-center gap-2 hover:underline"
              >
                 {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCwIcon />}
                 Erneut prüfen
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

const RefreshCwIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
