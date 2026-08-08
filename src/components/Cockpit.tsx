
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Clock, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  Sun, 
  Coffee, 
  BookOpen, 
  MessageSquare,
  Trophy,
  Smile,
  Zap,
  Target,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { STUNDEN_INFO, FAECHER_ALLE } from '../constants';
import { getKW, getTodayName } from '../lib/utils';
import MorningCircleWidget from './MorningCircleWidget';

export default function Cockpit() {
  const { app, setApp } = useApp();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const kw = getKW(currentTime);
  const tag = getTodayName();
  const timeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Current lesson logic
  const getCurrentLesson = () => {
    const now = currentTime.getHours() * 60 + currentTime.getMinutes();
    const zeiten = [
      { start: 480, end: 530 },  // 1
      { start: 530, end: 585 },  // 2
      { start: 600, end: 650 },  // 3
      { start: 650, end: 705 },  // 4
      { start: 705, end: 750 },  // 5
      { start: 810, end: 860 },  // 6
      { start: 860, end: 910 },  // 7
      { start: 910, end: 960 },  // 8
    ];
    const idx = zeiten.findIndex(z => now >= z.start && now <= z.end);
    if (idx === -1) return null;
    
    const unit = zeiten[idx];
    const total = unit.end - unit.start;
    const elapsed = now - unit.start;
    const progress = Math.max(0, Math.min(100, (elapsed / total) * 100));
    
    return { idx, progress, timeRemaining: unit.end - now };
  };

  const currentLesson = getCurrentLesson();
  const daysDe = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const dayIndex = daysDe.indexOf(tag);
  const plan = dayIndex !== -1 ? (app.wochenplanung?.[kw]?.[dayIndex] || {}) : {};
  const stamm = app.stammplan?.[tag] || {};
  const currentFach = currentLesson !== null ? (plan[currentLesson.idx]?.fach || stamm[currentLesson.idx + 1] || 'Freistunde') : 'Hauspause/Freizeit';
  const currentThema = currentLesson !== null ? (plan[currentLesson.idx]?.thema || 'Unterrichtseinheit') : 'Erholungsphase';

  return (
    <div className="min-h-screen bg-bg transition-colors duration-300">
      <div className="max-w-[1536px] mx-auto px-6 py-10 lg:py-16">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 px-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-accent text-white shadow-lg shadow-accent/20 animate-pulse">
                <Target size={20} />
              </span>
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-accent">Schüler-Cockpit</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-black text-gradient-premium tracking-tight leading-none">
              Sei bereit für den {tag}.
            </h1>
          </div>
          <div className="flex items-center gap-6 bg-surface p-6 rounded-[2rem] border border-border shadow-xl shadow-slate-900/5 hover:border-accent/20 transition-all duration-300">
            <div className="text-right">
              <div className="text-3xl font-black text-text-primary tabular-nums leading-none mb-1">{timeStr}</div>
              <div className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">Uhr</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col items-center justify-center bg-accent/5 px-4 py-2 rounded-2xl border border-accent/10">
               <span className="text-[10px] font-black text-accent uppercase tracking-widest">{currentTime.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}</span>
            </div>
          </div>
        </div>

        {/* Bento Grid */}
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 auto-rows-min"
        >
          
          {/* Main Card: Current Lesson */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, y: 30 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } }
            }}
            whileHover={{ y: -4, scale: 1.005 }}
            className="lg:col-span-12 xl:col-span-8 p-10 lg:p-12 rounded-[3.5rem] bg-gradient-to-br from-slate-900 to-slate-950 text-white relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[400px]"
          >
            <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 pointer-events-none">
              <BookOpen size={400} strokeWidth={1} />
            </div>
            
            <div className="relative z-10">
              <div className="bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Wir sind gerade hier
              </div>
              
              <div className="space-y-2 mb-12">
                <h2 className="text-5xl lg:text-7xl font-black tracking-tighter leading-none mb-4">{currentFach}</h2>
                <p className="text-xl lg:text-2xl font-bold text-white/50 tracking-tight leading-none max-w-2xl">{currentThema}</p>
              </div>
            </div>

            <div className="relative z-10 w-full space-y-6">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <div className="text-[11px] font-black text-white/40 uppercase tracking-widest">Zeit verbleibend</div>
                   <div className="text-3xl font-black tabular-nums text-emerald-400">{currentLesson ? `${currentLesson.timeRemaining} Min.` : 'Pause'}</div>
                </div>
                <div className="text-right space-y-1">
                   <div className="text-[11px] font-black text-white/40 uppercase tracking-widest">Nächste Stunde</div>
                   <div className="text-md font-bold text-white/70">Mathe • 10:00 Uhr</div>
                </div>
              </div>
              <div className="h-4 bg-white/10 rounded-full overflow-hidden p-1 border border-white/10 relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${currentLesson?.progress || 0}%` }}
                  className="h-full bg-emerald-400 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.5)]"
                />
              </div>
            </div>
          </motion.div>

          {/* This Week Section */}
          <motion.div 
            variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } } }} 
            whileHover={{ y: -4 }}
            className="lg:col-span-12 xl:col-span-4 p-10 lg:p-12 rounded-[3.5rem] bg-surface border border-border shadow-xl shadow-slate-900/5 hover:border-border2 flex flex-col justify-between min-h-[400px] transition-all duration-300"
          >
             <div className="space-y-2 mb-10">
                <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em] mb-4">Highlights der Woche</h3>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0 shadow-inner">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-black text-text-primary leading-tight">Lese-Champion</div>
                      <p className="text-sm text-text-secondary font-medium leading-none mt-1">Wer liest diese Woche am meisten?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shrink-0 shadow-inner">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-black text-text-primary leading-tight">Vortrag: Bienen</div>
                      <p className="text-sm text-text-secondary font-medium leading-none mt-1">Donnerstag, 3. Stunde</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 shadow-inner">
                      <Zap size={20} />
                    </div>
                    <div>
                      <div className="text-lg font-black text-text-primary leading-tight">Mathe-Wettbewerb</div>
                      <p className="text-sm text-text-secondary font-medium leading-none mt-1">Freitag, 1. Stunde</p>
                    </div>
                  </div>
                </div>
             </div>
             
             <button className="w-full h-16 bg-slate-900 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-3 hover:translate-y-[-4px] hover:bg-slate-850 active:scale-95 transition-all shadow-xl shadow-slate-900/10 cursor-pointer">
               Wochenplan öffnen
               <ArrowRight size={18} />
             </button>
          </motion.div>

          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } } }} className="lg:col-span-12 xl:col-span-12">
             <MorningCircleWidget />
          </motion.div>

          {/* Secondary Bento Grid */}
          <motion.div variants={{ hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0.4 } } }} className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            
          {/* Status Card - Dynamic Badges & Hall of Fame */}
            <div className="md:col-span-1 p-10 rounded-[3rem] bg-accent text-white shadow-xl flex flex-col justify-between min-h-[320px] relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12">
                <Trophy size={120} />
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="w-14 h-14 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-inner">
                   🏆
                </div>
                <div>
                   <h3 className="text-2xl font-black tracking-tight">Hall of Fame</h3>
                   <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Unsere neuesten Abzeichen</p>
                </div>
              </div>

              <div className="space-y-4 relative z-10 mt-6">
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    // Collect all badges from all students, sorted by date
                    const allBadges = app.schueler.flatMap(s => 
                      (s.badges || []).map(b => ({ ...b, studentName: s.vorname }))
                    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    if (allBadges.length === 0) {
                      return <span className="text-[11px] font-bold text-white/50 italic">Noch keine Abzeichen diese Woche.</span>
                    }

                    return allBadges.slice(0, 4).map((badge, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-2xl flex items-center gap-2 group hover:bg-white/20 transition-all"
                      >
                         <span className="text-lg group-hover:scale-125 transition-transform">{badge.icon}</span>
                         <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-white/60 leading-none">{badge.studentName}</span>
                            <span className="text-[11px] font-bold leading-tight">{badge.name}</span>
                         </div>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
              
              <div className="pt-4 border-t border-white/10 mt-4 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-white/40">
                 <span>Gesamt: {app.schueler.reduce((acc, s) => acc + (s.badges?.length || 0), 0)}</span>
                 <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} className="text-white/60">LIVE</motion.span>
              </div>
            </div>

            {/* Notification Center */}
            <div className="md:col-span-1 p-10 rounded-[3rem] bg-surface border border-border shadow-xl shadow-slate-900/5 flex flex-col justify-between min-h-[280px]">
               <div className="flex items-center justify-between mb-2">
                  <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><Bell size={20} /></div>
                  <div className="bg-rose-500 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest shadow-lg shadow-rose-500/20">Wichtig</div>
               </div>
               <div className="space-y-2">
                 <h3 className="text-2xl font-black text-text-primary tracking-tight">Unterschrift?</h3>
                 <p className="text-sm font-medium text-text-secondary leading-tight">Bitte lass deine Eltern den Zettel für den Wandertag unterschreiben.</p>
               </div>
               <div className="pt-2">
                  <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">Erhalten vor 2 Stunden</div>
               </div>
            </div>

            {/* Break Card */}
            <div className="md:col-span-1 p-10 rounded-[3rem] bg-emerald-500 text-white shadow-xl flex flex-col justify-between min-h-[280px]">
               <div className="space-y-4">
                  <div className="w-14 h-14 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-2xl">
                     🍎
                  </div>
                  <div className="space-y-1">
                     <h3 className="text-2xl font-black tracking-tight">Gesunde Pause</h3>
                     <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest leading-none">Heute: Frische Äpfel vom Bio-Hof</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex bg-white/10 p-4 rounded-2xl items-center gap-4">
                    <div className="text-center">
                       <span className="block text-[8px] font-black text-white/50 uppercase leading-none">Min.</span>
                       <span className="text-xl font-black tabular-nums leading-none">15</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="text-sm font-bold uppercase tracking-widest">Zeit zum Toben</div>
                  </div>
               </div>
            </div>

          </motion.div>
        </motion.div>
        
        {/* Simple Footer/Info */}
        <div className="mt-16 text-center">
            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.4em]">Digitaler Schulplaner • Designed for Kids</p>
        </div>

      </div>
    </div>
  );
}
