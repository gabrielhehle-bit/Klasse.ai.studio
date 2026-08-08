import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Clock, Play, Pause, RotateCcw, Activity, Star, Volume2, 
  Mic, CheckSquare, Square, Link as LinkIcon, QrCode, AlignLeft,
  X, Plus, Minus, UserCircle, Shuffle, ShieldAlert
} from 'lucide-react';

const FOKUS_THEMES_MAP: any = {
  "space-adventure": {
    bg: "bg-slate-950",
    bgDecor: "absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 pointer-events-none opacity-80",
    textColor: "text-white",
    baseWidget: "bg-slate-900/40 backdrop-blur-md border border-slate-700/50",
    accentHover: "hover:bg-blue-600/20 hover:border-blue-500/50",
    isLight: false
  },
  "jungle-safari": {
    bg: "bg-emerald-950",
    bgDecor: "absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/30 via-emerald-950 to-emerald-950 pointer-events-none opacity-80",
    textColor: "text-white",
    baseWidget: "bg-emerald-900/40 backdrop-blur-md border border-emerald-700/50",
    accentHover: "hover:bg-green-600/20 hover:border-green-500/50",
    isLight: false
  },
  "underwater-world": {
    bg: "bg-cyan-950",
    bgDecor: "absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-cyan-800/30 via-cyan-950 to-blue-950 pointer-events-none opacity-80",
    textColor: "text-white",
    baseWidget: "bg-cyan-900/40 backdrop-blur-md border border-cyan-700/50",
    accentHover: "hover:bg-cyan-500/20 hover:border-cyan-400/50",
    isLight: false
  },
  "magic-forest": {
    bg: "bg-fuchsia-950",
    bgDecor: "absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-800/30 via-fuchsia-950 to-slate-950 pointer-events-none opacity-80",
    textColor: "text-fuchsia-50",
    baseWidget: "bg-fuchsia-900/40 backdrop-blur-md border border-fuchsia-700/50",
    accentHover: "hover:bg-fuchsia-500/20 hover:border-fuchsia-400/50",
    isLight: false
  },
  "sunny-meadow": {
    bg: "bg-amber-50",
    bgDecor: "absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-200/40 via-amber-50 to-orange-100/20 pointer-events-none opacity-80",
    textColor: "text-amber-950",
    baseWidget: "bg-white/60 backdrop-blur-md border border-amber-200/60 shadow-xl shadow-amber-900/5",
    accentHover: "hover:bg-amber-100 hover:border-amber-300",
    isLight: true
  }
};

const SOUNDS = [
  { id: 'gong', label: 'Ruhegong', icon: <Volume2 size={24} /> },
  { id: 'applause', label: 'Applaus', icon: <Volume2 size={24} /> },
  { id: 'focus_music', label: 'Fokus-Musik', icon: <Volume2 size={24} /> },
  { id: 'success', label: 'Ta-Da!', icon: <Volume2 size={24} /> }
];

const PAUSES = [
  "10x Hampelmann machen!",
  "Auf einem Bein stehen (15 Sek)!",
  "Arme kreisen lassen!",
  "Wie ein Frosch hüpfen!",
  "Strecken, als ob ihr Äpfel pflückt!"
];

export default function StudentBentoDashboard({
  currentTheme,
  fokusTheme,
  time,
  onClose
}: any) {
  const { app, setApp } = useApp();
  const themeVars = FOKUS_THEMES_MAP[fokusTheme || "space-adventure"] || FOKUS_THEMES_MAP["space-adventure"];

  // WIDGET STATES
  const [timerMode, setTimerMode] = useState<'countdown' | 'stopwatch'>('countdown');
  const [timerSeconds, setTimerSeconds] = useState(300);
  const [timerActive, setTimerActive] = useState(false);

  const [todos, setTodos] = useState<{id: string, text: string, done: boolean}[]>([
    { id: 't1', text: 'Hausaufgabe abgeben', done: false },
    { id: 't2', text: 'Buch aufschlagen', done: false },
    { id: 't3', text: 'Still arbeiten', done: false }
  ]);
  const [newTodo, setNewTodo] = useState('');

  const [activePause, setActivePause] = useState<string | null>(null);
  const [noiseLevel, setNoiseLevel] = useState(20);
  const [qrInput, setQrInput] = useState('https://anton.app');
  const [noteContent, setNoteContent] = useState('Willkommen zur Stunde!');
  const [pickedStudent, setPickedStudent] = useState<any>(null);

  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (timerMode === 'countdown') {
            if (prev <= 1) {
              setTimerActive(false);
              confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
              return 0;
            }
            return prev - 1;
          } else {
            return prev + 1;
          }
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerMode]);

  useEffect(() => {
    // Fake Lärmpegel Generator 
    const interval = setInterval(() => {
        setNoiseLevel(Math.floor(20 + Math.random() * 40));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSound = (id: string) => {
    console.log(`Playing sound ${id} (audio API hook placeholder)`);
  };

  const pickRandomStudent = () => {
    if (!app.schueler || app.schueler.length === 0) return;
    let i = 0;
    const interval = setInterval(() => {
      setPickedStudent(app.schueler[Math.floor(Math.random() * app.schueler.length)]);
      i++;
      if (i > 15) {
        clearInterval(interval);
        confetti({ particleCount: 50, spread: 60, zIndex: 9999, origin: { y: 0.8 } });
      }
    }, 80);
  };

  const setKlassenglas = (count: number) => {
    setApp({ ...app, klassenglas_count: Math.max(0, count) });
    if (count > (app.klassenglas_count || 0)) {
        confetti({ particleCount: 30, spread: 100, zIndex: 9999 });
    }
  };

  const setAmpelStatus = (status: "green" | "yellow" | "red") => {
    setApp({ ...app, ampel_status: status });
  };

  const addStudentPoint = (sid: string, amount: number) => {
    setApp(prev => ({
        ...prev,
        mitarbeitLogs: [
            ...(prev.mitarbeitLogs || []),
            { id: Date.now().toString(), sid, points: amount, timestamp: new Date().toISOString() }
        ]
    }));
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const schuelerSorted = useMemo(() => {
    return [...(app.schueler || [])].sort((a,b) => a.vorname.localeCompare(b.vorname));
  }, [app.schueler]);

  const studentPoints = useMemo(() => {
    const m = new Map();
    (app.mitarbeitLogs || []).forEach((log: any) => {
      m.set(log.sid, (m.get(log.sid) || 0) + log.points);
    });
    return m;
  }, [app.mitarbeitLogs]);

  const cardClass = `p-6 rounded-3xl ${themeVars.baseWidget} shadow-lg transition-all flex flex-col gap-4  relative`;
  const tColor = themeVars.textColor;
  const tColorMuted = themeVars.isLight ? 'text-black/50' : 'text-white/60';
  
  return (
    <div className={`w-full h-full flex flex-col ${themeVars.bg} ${tColor} p-4 md:p-6  relative font-sans`}>
      <div className={themeVars.bgDecor} />
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
           <h1 className="text-[1.875rem] leading-tight md:text-4xl font-black uppercase tracking-widest drop-shadow-lg">
             Fokus-Board
           </h1>
           <span className={`text-[1.125rem] leading-normal font-bold px-3 py-1 rounded-full ${themeVars.isLight ? 'bg-black/10' : 'bg-white/10'}`}>
             {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
           </span>
        </div>
        <button 
           onClick={onClose}
           className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2"
        >
          <X size={18} />
          Pult-Modus
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0 z-10">
        
        {/* MAIN AREA */}
        <div className="col-span-12 lg:col-span-9 overflow-y-auto no-scrollbar scroll-smooth pr-2 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-12 gap-5 auto-rows-[minmax(180px,_auto)]">

            {/* WIDGET 1: TIMER */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass}`}>
               <div className="flex justify-between items-center">
                 <div className="flex gap-2">
                    <button 
                      onClick={() => { setTimerMode('countdown'); setTimerSeconds(300); setTimerActive(false); }}
                      className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-bold uppercase ${timerMode === 'countdown' ? 'bg-white text-slate-900' : 'bg-white/10'}`}
                    >Countdown</button>
                    <button 
                      onClick={() => { setTimerMode('stopwatch'); setTimerSeconds(0); setTimerActive(false); }}
                      className={`px-3 py-1.5 rounded-xl text-[0.75rem] leading-tight font-bold uppercase ${timerMode === 'stopwatch' ? 'bg-white text-slate-900' : 'bg-white/10'}`}
                    >Stoppuhr</button>
                 </div>
                 <Clock className={tColorMuted} size={24} />
               </div>
               <div className="flex-1 flex flex-col items-center justify-center">
                 <div className="text-[5rem] lg:text-[7rem] font-black tracking-tighter leading-none mb-4 font-mono drop-shadow-xl select-none">
                    {formatTime(timerSeconds)}
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => setTimerActive(!timerActive)}
                      className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all ${timerActive ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    >
                      {timerActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                    </button>
                    <button 
                      onClick={() => {
                        setTimerActive(false);
                        setTimerSeconds(timerMode === 'countdown' ? 300 : 0);
                      }}
                      className="w-16 h-16 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur text-white shadow-xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <RotateCcw size={28} />
                    </button>
                 </div>
                 {timerMode === 'countdown' && !timerActive && (
                    <div className="flex gap-2 mt-4">
                        {[1, 5, 10, 15].map(min => (
                          <button key={min} onClick={() => setTimerSeconds(min * 60)} className={`px-3 py-1 rounded-lg text-[0.875rem] leading-snug font-bold ${themeVars.isLight ? 'bg-black/5 hover:bg-black/10' : 'bg-white/10 hover:bg-white/20'}`}>
                             +{min}m
                          </button>
                        ))}
                    </div>
                 )}
               </div>
            </div>

            {/* WIDGET 2: BEWEGUNGSPAUSE */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass} bg-gradient-to-br from-indigo-500/80 to-purple-600/80 border-indigo-400/50 text-white justify-center items-center text-center`}>
               <Activity size={40} className="mb-2 opacity-80" />
               <h3 className="text-[1.25rem] leading-normal font-black uppercase tracking-widest mb-4 drop-shadow-md">Bewegungspause</h3>
               {activePause ? (
                 <motion.div initial={{scale:0.8, opacity:0}} animate={{scale:1, opacity:1}} className="bg-white/20 p-6 rounded-2xl w-full border border-white/30 backdrop-blur-md">
                   <p className="text-[1.5rem] leading-normal font-bold leading-tight mb-4">{activePause}</p>
                   <button onClick={() => setActivePause(null)} className="px-6 py-2 bg-white text-indigo-900 rounded-xl font-black uppercase text-[0.875rem] leading-snug shadow-xl active:scale-95 transition-transform">Fertig!</button>
                 </motion.div>
               ) : (
                 <button 
                   onClick={() => setActivePause(PAUSES[Math.floor(Math.random()*PAUSES.length)])}
                   className="w-full max-w-[200px] h-16 bg-white text-purple-900 rounded-2xl font-black text-[1.125rem] leading-normal uppercase tracking-wider shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                 >
                   Jetzt Starten
                 </button>
               )}
            </div>

            {/* WIDGET 3: KLASSENGLAS */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass}`}>
              <div className="flex justify-between items-center">
                <h3 className="text-[1.125rem] leading-normal font-black uppercase flex items-center gap-2">
                  <span className="text-amber-400 drop-shadow-sm">{app.settings?.klassenglasIcon || "💎"}</span> 
                  Klassenglas
                </h3>
                <span className="text-[1.5rem] leading-normal font-black font-mono px-3 py-1">{app.klassenglas_count || 0} <span className="text-[0.875rem] leading-snug opacity-60">/ {app.klassenglas_ziel || 10}</span></span>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-6">
                <div className="relative h-6 bg-black/20 rounded-full  shadow-inner border border-white/10">
                   <motion.div 
                     className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full"
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, ((app.klassenglas_count || 0) / (app.klassenglas_ziel || 10)) * 100)}%` }}
                     transition={{ duration: 0.5, ease: 'easeOut' }}
                   />
                </div>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setKlassenglas((app.klassenglas_count||0)-1)} className="w-16 h-16 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white flex items-center justify-center font-black text-[1.5rem] leading-normal shadow-lg active:scale-95 transition-all"><Minus/></button>
                  <button onClick={() => setKlassenglas((app.klassenglas_count||0)+1)} className="w-24 h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white flex items-center justify-center font-black text-[1.5rem] leading-normal shadow-lg active:scale-95 transition-all"><Plus size={32}/></button>
                </div>
              </div>
            </div>

            {/* WIDGET 4: SOUND-BOARD */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass}`}>
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider mb-2 flex items-center gap-2"><Volume2 size={18}/> Sound-Board</h3>
              <div className="grid grid-cols-2 gap-3 flex-1">
                {SOUNDS.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => handleSound(s.id)}
                    className={`rounded-2xl ${themeVars.isLight ? 'bg-white shadow border border-amber-200' : 'bg-white/10 hover:bg-white/20'} flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform p-3`}
                  >
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center ${themeVars.isLight ? 'bg-amber-100 text-amber-600' : 'bg-white/20 text-white'}`}>{s.icon}</div>
                     <span className="text-[0.75rem] leading-tight font-bold uppercase tracking-wider text-center">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* WIDGET 5: AMPEL MANUELL */}
            <div className={`col-span-12 xl:col-span-4 ${cardClass} items-center`}>
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-center mb-2">Verhaltensampel</h3>
              <div className="flex-1 flex flex-col bg-black/80 rounded-[2.5rem] p-3 gap-3 shadow-inner w-32 border-4 border-slate-700 mx-auto">
                {['red', 'yellow', 'green'].map(color => {
                  const isActive = app.ampel_status === color;
                  const bgMap:any = { red: 'bg-rose-500', yellow: 'bg-amber-400', green: 'bg-emerald-500' };
                  const shadowMap:any = { red: 'shadow-[0_0_40px_rgba(244,63,94,0.8)]', yellow: 'shadow-[0_0_40px_rgba(251,191,36,0.8)]', green: 'shadow-[0_0_40px_rgba(16,185,129,0.8)]' };
                  
                  return (
                    <button 
                      key={color} 
                      onClick={() => setAmpelStatus(color as any)}
                      className={`w-24 h-24 mx-auto rounded-full border-4 border-black/50 transition-all cursor-pointer ${isActive ? `${bgMap[color]} ${shadowMap[color]} scale-100` : 'bg-white/10 scale-90'}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* WIDGET 6: LÄRMAMPEL / MIKROFON */}
            <div className={`col-span-12 xl:col-span-4 ${cardClass}`}>
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-center mb-1 flex justify-center items-center gap-2"><Mic size={16}/> Lärm-Detektor</h3>
              <p className="text-[0.625rem] text-center opacity-50 mb-4 max-w-[150px] mx-auto">Web-Audio API Placeholder</p>
              <div className="flex-1 flex items-end justify-center gap-2 h-40 mt-auto px-4 pb-2">
                 {[...Array(6)].map((_, i) => {
                   const isActive = noiseLevel > i * 16;
                   const isDanger = noiseLevel > 70 && i > 3;
                   return (
                     <motion.div 
                       key={i}
                       animate={{ height: isActive ? 40 + Math.random()*80 : 10 }}
                       className={`w-8 rounded-t-xl ${isDanger ? 'bg-rose-500' : isActive ? 'bg-emerald-400' : 'bg-white/10'}`}
                     />
                   )
                 })}
              </div>
              <div className="text-center font-black mt-2">{noiseLevel}% Pegel</div>
            </div>

            {/* WIDGET 8: LOTTO-PICKER */}
            <div className={`col-span-12 xl:col-span-4 ${cardClass} bg-indigo-500/20 border-indigo-400/30`}>
               <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 mb-2"><Shuffle size={16}/> Zufallsgenerator</h3>
               <div className="flex-1 flex flex-col items-center justify-center py-6">
                 {pickedStudent ? (
                   <div className="text-center animate-bounce">
                     <div className="w-20 h-20 bg-indigo-500 text-white rounded-full flex items-center justify-center text-[1.875rem] leading-tight font-black mx-auto mb-3 shadow-xl">
                       {pickedStudent.vorname.charAt(0)}{pickedStudent.nachname?.charAt(0)}
                     </div>
                     <span className="text-[1.25rem] leading-normal font-black" style={{ color: currentTheme?.colors?.accent }}>{pickedStudent.vorname} {pickedStudent.nachname}</span>
                   </div>
                 ) : (
                   <UserCircle size={64} className="opacity-20 mb-4" />
                 )}
               </div>
               <button onClick={pickRandomStudent} className="w-full bg-indigo-500 hover:bg-indigo-400 text-white py-4 rounded-xl flex items-center justify-center font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Ziehen</button>
            </div>

            {/* WIDGET 7: TO-DO LISTE */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass}`}>
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider mb-2 flex items-center gap-2"><CheckSquare size={18}/> Stunden-Fahrplan</h3>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2 no-scrollbar">
                {todos.map(t => (
                  <button key={t.id} onClick={() => toggleTodo(t.id)} className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-95 ${t.done ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                    {t.done ? <CheckSquare className="text-emerald-500 shrink-0"/> : <Square className="opacity-50 shrink-0" />}
                    <span className={`font-bold text-[0.875rem] leading-snug md:text-[1rem] leading-normal ${t.done ? 'line-through opacity-70' : ''}`}>{t.text}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input 
                  value={newTodo} onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => { if(e.key==='Enter' && newTodo.trim()){ setTodos([...todos, {id: Date.now().toString(), text: newTodo.trim(), done: false}]); setNewTodo(''); } }}
                  placeholder="Hinzufügen..."
                  className={`flex-1 bg-white/10 border border-white/20 rounded-xl px-4 text-[0.875rem] leading-snug font-bold placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/30 ${themeVars.isLight ? 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400' : ''}`}
                />
              </div>
            </div>

            {/* WIDGET 11: NOTIZEN / TAFELBILD */}
            <div className={`col-span-12 xl:col-span-6 ${cardClass}`}>
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider mb-2 flex items-center gap-2"><AlignLeft size={18}/> Freitext / Tafel</h3>
              <textarea 
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                placeholder="Großes Tafelbild / Merksätze hier eingeben..."
                className={`flex-1 w-full resize-none rounded-2xl p-6 text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black leading-tight bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:opacity-30 ${themeVars.isLight ? 'bg-white border-amber-200 text-slate-800 focus:ring-amber-500/30' : ''}`}
              />
            </div>

            {/* WIDGET 10: QR-CODE */}
            <div className={`col-span-12 xl:col-span-4 ${cardClass} items-center justify-center`}>
              <h3 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-center mb-4 flex items-center gap-2"><QrCode size={16}/> Link teilen</h3>
              <div className="bg-white p-4 rounded-3xl shadow-xl">
                 <QRCodeSVG value={qrInput} size={140} level="M" />
              </div>
              <input 
                 value={qrInput} onChange={e => setQrInput(e.target.value)}
                 className={`mt-4 w-full text-center bg-black/10 border-none rounded-lg px-2 py-1.5 text-[0.75rem] leading-tight font-bold opacity-70 focus:opacity-100 outline-none ${themeVars.isLight ? 'text-black' : 'text-white'}`}
              />
            </div>

            {/* WIDGET 9: QUICKLINKS */}
            <div className={`col-span-12 xl:col-span-8 ${cardClass}`}>
              <h3 className="text-[1.125rem] leading-normal font-black uppercase tracking-wider mb-2 flex items-center gap-2"><LinkIcon size={18}/> Schnellzugriff</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                {[
                  {name: 'Anton App', url: 'https://anton.app', color: 'bg-emerald-500'},
                  {name: 'Antolin', url: 'https://antolin.de', color: 'bg-blue-500'},
                  {name: 'Schulmanger', url: '#', color: 'bg-indigo-500'},
                  {name: 'Timer', url: '#', color: 'bg-rose-500'}
                ].map((link, i) => (
                  <button key={i} className={`${link.color} rounded-2xl flex items-center justify-center text-white font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all py-4 text-[0.75rem] leading-tight md:text-[0.875rem] leading-snug`}>
                    {link.name}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* SIDEBAR (Right) */}
        <div className={`col-span-12 lg:col-span-3 flex flex-col ${themeVars.baseWidget} rounded-3xl p-4 gap-4 shadow-xl border-l-[3px] border-white/20`}>
          <div className="flex items-center justify-between px-2 shrink-0">
             <h2 className="text-[1.125rem] leading-normal font-black uppercase tracking-widest flex items-center gap-2">
               <UserCircle className="opacity-70" /> Live-Erfassung
             </h2>
             <span className="bg-white/10 px-2 py-0.5 rounded-full text-[0.75rem] leading-tight font-bold font-mono">{app.schueler?.length || 0}</span>
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar scroll-smooth flex flex-col gap-2 relative">
             {schuelerSorted.map(s => {
               const points = studentPoints.get(s.id) || 0;
               return (
                 <div key={s.id} className={`flex items-center justify-between p-3 rounded-2xl transition-all border ${points > 0 ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/5'} hover:bg-white/10 group`}>
                   
                   {/* Avatar / Name */}
                   <div className="flex flex-col gap-1 items-start max-w-[120px] ">
                     <span className="font-bold text-[0.875rem] leading-snug text-wrap leading-tight break-words" style={{ color: currentTheme?.colors?.accent }}>{s.vorname} {s.nachname?.charAt(0)}.</span>
                   </div>

                   {/* Controls */}
                   <div className="flex items-center gap-2">
                     <div className="flex items-center bg-black/20 rounded-xl  border border-white/5">
                        <button onClick={() => addStudentPoint(s.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-rose-500/50 active:bg-rose-500 transition-colors"><Minus size={14} /></button>
                        <div className={`w-6 text-center font-black font-mono text-[0.75rem] leading-tight ${points > 0 ? 'text-emerald-400' : ''}`}>{points}</div>
                        <button onClick={() => addStudentPoint(s.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-emerald-500/50 active:bg-emerald-500 transition-colors"><Plus size={14} /></button>
                     </div>
                     <button className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                        <ShieldAlert size={14} className="opacity-50" />
                     </button>
                   </div>
                 </div>
               )
             })}
          </div>
        </div>

      </div>
    </div>
  );
}
