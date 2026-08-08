import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Bot, Sparkles, AlertTriangle, FileText, Calendar, RotateCcw, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { askAI } from '../services/aiService';
import { getKW, getSW } from '../lib/utils';
import Markdown from 'react-markdown';

export default function DashboardWeeklyReviewWidget() {
  const { app, setApp } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate if today is Friday and no review for current week exists
  useEffect(() => {
    const today = new Date();
    const currentKW = app?.currentKW || getKW(today);
    
    // Day 5 is Friday
    if (today.getDay() === 5) {
      if (!app.wochenrueckblick || app.wochenrueckblick.kw !== currentKW) {
        generateReview(currentKW);
      }
    }
  }, [app.wochenrueckblick]);

  const generateReview = async (kw?: number) => {
    setLoading(true);
    setError(null);
    try {
      const currentKW = kw || app?.currentKW || getKW(new Date());
      const students = app.schueler || [];
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      const sevenDaysAgo = new Date(currentDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const past7DaysActivities = (app.activityLog || []).filter((a: any) => new Date(a.timestamp) >= sevenDaysAgo);
      const activityText = past7DaysActivities.map((a: any) => `- ${a.action}`).join('\n');

      const absenteesAndDays: string[] = [];
      students.forEach(s => {
        const ad = app.anwesenheit?.[s.id];
        if (ad) {
           let daysOut = 0;
           Object.entries(ad).forEach(([dateStr, hours]) => {
             const d = new Date(dateStr);
             if (d >= sevenDaysAgo && d <= currentDate) {
                 if (Object.values(hours).some(v => v !== 'a' && v !== '')) {
                     daysOut++;
                 }
             }
           });
           if (daysOut > 0) {
               absenteesAndDays.push(`${s.vorname} (${daysOut} Tage)`);
           }
        }
      });
      const absenteeText = absenteesAndDays.join(', ');

      const kels = (app.kelGespraeche || []).filter(k => new Date(k.datum) >= sevenDaysAgo)
                     .map(k => {
                        const s = students.find(st => st.id === k.schuelerId);
                        return `- KEL mit ${s?.vorname}`;
                     }).join('\n');

      const activeStudentIds = new Set(students.map(s => s.id));
      const diagnostics = (app.diagnostikErhebungen || []).filter(d => activeStudentIds.has(d.schuelerId) && new Date(d.datum) >= sevenDaysAgo)
                     .map(d => {
                        const s = students.find(st => st.id === d.schuelerId);
                        const t = app.diagnostikTests?.find(test => test.id === d.testId);
                        return `- Diagnostik: ${t?.name} bei ${s?.vorname}`;
                     }).join('\n');

      const weeklyPlan = (app.wochenplanung || {})[currentKW];
      let topics: string[] = [];
      if (weeklyPlan) {
          Object.values(weeklyPlan).forEach(dayArr => {
             if (Array.isArray(dayArr)) {
                 dayArr.forEach(item => {
                     const txt = [item.fach, item.thema].filter(Boolean).join(': ');
                     if (txt) topics.push(txt);
                 });
             }
          });
      }
      // Unique topics
      topics = Array.from(new Set(topics));
      let topicText = topics.map(t => `- ${t}`).slice(0, 10).join('\n'); // keep it reasonable

      const notes = (app.notes || []).concat(app.journal || [])
                      .filter(n => new Date(n.datum) >= sevenDaysAgo)
                      .map(n => {
                          const s = students.find(st => st.id === n.schuelerId);
                          return `- Notiz zu ${s?.vorname}: ${(n as any).text || n.inhalt}`;
                      }).join('\n');

      const prompt = `Erstelle einen kurzen Wochenrückblick (KW ${currentKW}).
Aktivitäten:\n${activityText || 'Keine signifikanten Einträge'}
Abwesenheiten: ${absenteeText || 'Keine'}
KEL-Gespräche:\n${kels || 'Keine'}
Diagnostik:\n${diagnostics || 'Keine'}
Behandelte Unterrichtsthemen (Auswahl):\n${topicText || 'Keine spezifischen Themen eingetragen'}
Verhaltensnotizen:\n${notes || 'Keine'}

Fasse zusammen: Was wurde diese Woche geleistet? Welche Kinder waren auffällig (positiv oder negativ)? Was sollte nächste Woche beachtet werden? Wenn keine Daten vorhanden sind, schreibe einen freundlichen, sehr kurzen pädagogischen Platzhalter. Formatiere den Text sauber mit Überschriften (z.B. **Zusammenfassung**, **Auffälligkeiten**, **Für nächste Woche**). Max. 200 Wörter.`;

      const instruction = "Du bist ein pädagogischer Assistent für Volksschullehrerinnen und Volksschullehrer in Österreich. Du hilfst beim Reflektieren der Unterrichtswoche. Antworte auf Deutsch, professionell aber warmherzig, in maximal 200 Wörtern.";

      const response = await askAI(prompt, instruction);
      
      const resData = {
          datum: new Date().toISOString(),
          inhalt: response,
          kw: currentKW
      };

      setApp(prev => ({ ...prev, wochenrueckblick: resData }));

    } catch (err) {
      console.error(err);
      setError('Konnte keinen Rückblick generieren. Prüfe deine Internetverbindung oder API-Key.');
    } finally {
      setLoading(false);
    }
  };

  const hasData = !!app.wochenrueckblick;

  return (
    <div className="bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-3xl  shadow-sm flex flex-col group h-full transition-all hover:border-neutral-700">
      <div className="p-4 border-b border-white/10 flex items-center justify-between opacity-80 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
             <Bot size={16} />
           </div>
           <div>
              <div className="text-[0.625rem] font-black uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Sparkles size={10} className="text-amber-500" /> Wöchentliche KI-Reflexion
              </div>
              <div className="text-[0.75rem] leading-tight font-bold text-neutral-300">Wochenrückblick</div>
           </div>
        </div>
        <button 
           onClick={() => generateReview()} 
           disabled={loading}
           className="p-2 bg-neutral-800 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-700 transition active:scale-95 disabled:opacity-50"
           title="Generieren abrufen"
        >
           <RotateCcw size={14} className={loading ? "animate-spin text-blue-400" : ""} />
        </button>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-center relative min-h-[220px]">
        {loading ? (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-400 space-y-4">
              <Bot size={32} className="animate-pulse" />
              <div className="text-[0.75rem] leading-tight font-bold uppercase tracking-widest animate-pulse">KI liest die Woche...</div>
           </div>
        ) : error ? (
           <div className="flex flex-col items-center justify-center text-center text-rose-400 space-y-3">
              <AlertTriangle size={24} className="opacity-50" />
              <div className="text-[0.875rem] leading-snug font-bold">{error}</div>
              <button 
                onClick={() => generateReview()}
                className="mt-2 px-4 py-2 bg-rose-500/10 rounded-lg text-[0.75rem] leading-tight font-black uppercase text-rose-300 hover:bg-rose-500/20 transition"
              >
                 Erneut probieren
              </button>
           </div>
        ) : !hasData ? (
           <div className="flex flex-col items-center justify-center text-center text-neutral-500 space-y-3">
              <Calendar size={32} className="opacity-30" />
              <div className="text-[0.875rem] leading-snug font-bold max-w-[200px]">Noch kein Wochenrückblick für diese Woche vorhanden.</div>
              <button 
                onClick={() => generateReview()}
                className="mt-2 px-4 py-2 bg-white/10 rounded-xl text-[0.75rem] leading-tight font-black uppercase text-white hover:bg-white/20 transition shadow-sm"
              >
                 Jetzt erstellen
              </button>
           </div>
        ) : (
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto no-scrollbar pr-2 pb-4 text-[0.875rem] leading-snug text-neutral-300 leading-relaxed max-w-full markdown-body">
                 <Markdown>{app.wochenrueckblick!.inhalt}</Markdown>
              </div>
              <div className="pt-3 border-t border-white/10 mt-auto flex items-center justify-between text-[0.625rem] uppercase font-black tracking-widest text-neutral-500">
                  <div className="flex items-center gap-1.5">
                     <Clock size={10} /> 
                     Zuletzt: {new Date(app.wochenrueckblick!.datum).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'short' })} – KW {app.wochenrueckblick!.kw}{(() => { const sw = getSW(new Date(app.wochenrueckblick!.datum), app?.schuljahr); return sw ? <span className="text-[0.53125rem] opacity-75 ml-1 font-bold"> (SW {sw})</span> : null; })()}
                  </div>
              </div>
           </motion.div>
        )}
      </div>
    </div>
  );
}
