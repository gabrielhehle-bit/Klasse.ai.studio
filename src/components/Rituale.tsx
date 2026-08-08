
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  RotateCw, 
  Timer, 
  Play, 
  Square, 
  CheckCircle2, 
  Trash2, 
  Trash, 
  UserPlus, 
  Users, 
  Trash2 as TrashIcon,
  Flower2,
  Shield,
  Brush,
  Tv,
  Box,
  Trash as Bin,
  ChevronRight,
  ChevronDown,
  X,
  Zap,
  Waves,
  Brain,
  Wind,
  Target,
  Volume2,
  VolumeX,
  Activity,
  Footprints,
  Heart,
  Cloud,
  Sun,
  RotateCcw,
  Milk,
  Mail,
  BookOpen,
  Calendar,
  Lightbulb,
  DoorOpen,
  Music,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { KlassenDienst } from '../types';

export type ExerciseCategory = 'POWER' | 'FOCUS' | 'RELAX';

export interface Exercise {
  id: string;
  titel: string;
  beschreibung: string;
  kategorie: ExerciseCategory;
  emoji: string;
}

export const UEBUNGEN: Exercise[] = [
  // POWER (Rot)
  { id: '1', kategorie: 'POWER', titel: "Hampelmann", beschreibung: "Viel Power! Springe und klatsche über dem Kopf.", emoji: "🏃‍♂️" },
  { id: '2', kategorie: 'POWER', titel: "Sessel-Lauf", beschreibung: "Laufe so schnell du kannst auf der Stelle!", emoji: "💺" },
  { id: '3', kategorie: 'POWER', titel: "Schattenboxen", beschreibung: "Boxe flink in die Luft. Zack, zack, zack!", emoji: "🥊" },
  { id: '4', kategorie: 'POWER', titel: "Wandsitz", beschreibung: "Lehne dich gegen eine Wand, als würdest du sitzen.", emoji: "🧗" },
  { id: '5', kategorie: 'POWER', titel: "Seilspringen", beschreibung: "Springe über ein unsichtbares Seil!", emoji: "➰" },
  { id: '6', kategorie: 'POWER', titel: "Power-Sprints", beschreibung: "Kurze schnelle Sprints auf der Stelle.", emoji: "⚡" },
  { id: '7', kategorie: 'POWER', titel: "Raketen-Start", beschreibung: "Gehe tief in die Hocke und springe hoch!", emoji: "🚀" },
  { id: '8', kategorie: 'POWER', titel: "Bären-Gang", beschreibung: "Bewege dich wie ein starker Bär durch den Raum.", emoji: "🐻" },
  { id: '9', kategorie: 'POWER', titel: "Gorilla-Tanz", beschreibung: "Trommle sanft auf die Brust und stampfe.", emoji: "🦍" },
  { id: '10', kategorie: 'POWER', titel: "Klettermax", beschreibung: "Klette eine unsichtbare Leiter hoch.", emoji: "🧗" },

  // BALANCE & FOKUS (Blau)
  { id: '11', kategorie: 'FOCUS', titel: "Der Baum", beschreibung: "Stehe auf einem Bein wie ein stabiler Baum.", emoji: "🌳" },
  { id: '12', kategorie: 'FOCUS', titel: "Standwaage", beschreibung: "Beuge dich vor und strecke ein Bein nach hinten.", emoji: "⚖️" },
  { id: '13', kategorie: 'FOCUS', titel: "Ninja-Freeze", beschreibung: "Bewege dich und erstarre plötzlich wie ein Ninja.", emoji: "🥷" },
  { id: '14', kategorie: 'FOCUS', titel: "Finger-Acht", beschreibung: "Male eine liegende Acht in die Luft.", emoji: "♾️" },
  { id: '15', kategorie: 'FOCUS', titel: "Zeitlupen-Gehen", beschreibung: "Gehe so langsam du nur kannst.", emoji: "🦥" },
  { id: '16', kategorie: 'FOCUS', titel: "Wolken-Nase", beschreibung: "Schreibe deinen Namen mit der Nasenspitze.", emoji: "👃" },
  { id: '17', kategorie: 'FOCUS', titel: "Seiltänzer", beschreibung: "Gehe auf einer unsichtbaren Linie.", emoji: "🧵" },
  { id: '18', kategorie: 'FOCUS', titel: "Einbein-Hüpfen", beschreibung: "Hüpfe ganz vorsichtig auf einem Bein.", emoji: "🦘" },
  { id: '19', kategorie: 'FOCUS', titel: "Stille Statue", beschreibung: "Bewege kein einziges Haar. Sei ganz still.", emoji: "🗿" },
  { id: '20', kategorie: 'FOCUS', titel: "Buch-Balance", beschreibung: "Balanciere ein unsichtbares Buch auf dem Kopf.", emoji: "📚" },

  // RELAX (Grün)
  { id: '21', kategorie: 'RELAX', titel: "Wolken pflücken", beschreibung: "Strecke dich ganz weit nach oben.", emoji: "☁️" },
  { id: '22', kategorie: 'RELAX', titel: "Elefanten-Öhrrchen", beschreibung: "Schüttle deine Hände und Arme locker aus.", emoji: "🐘" },
  { id: '23', kategorie: 'RELAX', titel: "Tiefes Atmen", beschreibung: "Atme tief ein und gaaanz langsam aus.", emoji: "🧘" },
  { id: '24', kategorie: 'RELAX', titel: "Nacken-Rollen", beschreibung: "Lasse deinen Kopf ganz sanft kreisen.", emoji: "🔄" },
  { id: '25', kategorie: 'RELAX', titel: "Zwergen-Schlaf", beschreibung: "Mache dich ganz klein und schließe die Augen.", emoji: "💤" },
  { id: '26', kategorie: 'RELAX', titel: "Gähnen & Dehnen", beschreibung: "Gähne herzhaft und dehne deinen ganzen Körper.", emoji: "🥱" },
  { id: '27', kategorie: 'RELAX', titel: "Wasserfall", beschreibung: "Beuge dich vor und lasse die Arme pendeln.", emoji: "🌊" },
  { id: '28', kategorie: 'RELAX', titel: "Baum im Wind", beschreibung: "Wiege dich sanft hin und her.", emoji: "🌬️" },
  { id: '29', kategorie: 'RELAX', titel: "Schmetterling", beschreibung: "Bewege deine Arme ganz zart wie Flügel.", emoji: "🦋" },
  { id: '30', kategorie: 'RELAX', titel: "Zauber-Hände", beschreibung: "Reibe deine Hände warm und lege sie auf die Augen.", emoji: "✨" },
];

export const STANDARD_DIENSTE: KlassenDienst[] = [
  { id: 'd-1', titel: "Mistmeister", icon: <Bin size={24} />, emoji: "🗑️", schuelerIds: [] },
  { id: 'd-2', titel: "Blumenwart", icon: <Flower2 size={24} />, emoji: "🌻", schuelerIds: [] },
  { id: 'd-3', titel: "Tafelprofi", icon: <Brush size={24} />, emoji: "🧹", schuelerIds: [] },
  { id: 'd-4', titel: "Pausenordnung", icon: <Box size={24} />, emoji: "📦", schuelerIds: [] },
  { id: 'd-5', titel: "Medienwart", icon: <Tv size={24} />, emoji: "💻", schuelerIds: [] },
  { id: 'd-6', titel: "Milchdienst", icon: <Milk size={24} />, emoji: "🥛", schuelerIds: [] },
  { id: 'd-7', titel: "Botendienst", icon: <Mail size={24} />, emoji: "📬", schuelerIds: [] },
  { id: 'd-8', titel: "Lüftungswart", icon: <Wind size={24} />, emoji: "🌬️", schuelerIds: [] },
  { id: 'd-9', titel: "Energiewart", icon: <Lightbulb size={24} />, emoji: "💡", schuelerIds: [] },
  { id: 'd-10', titel: "Bibliothekar", icon: <BookOpen size={24} />, emoji: "📚", schuelerIds: [] },
  { id: 'd-11', titel: "Kalenderdienst", icon: <Calendar size={24} />, emoji: "📅", schuelerIds: [] },
  { id: 'd-12', titel: "Garderobenwart", icon: <LayoutGrid size={24} />, emoji: "🧥", schuelerIds: [] },
];

export default function Rituale() {
  const { app, setApp } = useApp();
  const [activeTab, setActiveTab] = useState<'pause' | 'dienste'>('pause');

  // Flitzi-Pause State
  const [stage, setStage] = useState<'setup' | 'spinning' | 'active' | 'finished'>('setup');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | 'ALL'>('ALL');
  const [duration, setDuration] = useState<number>(60); 
  const [isMuted, setIsMuted] = useState(false);
  const [selectedUebung, setSelectedUebung] = useState<Exercise | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Audio Logic
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playSound = (type: 'beep' | 'tada' | 'gong' | 'beat') => {
    if (isMuted || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    if (type === 'beep') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'beat') {
      const freq = selectedUebung?.kategorie === 'POWER' ? 150 : (selectedUebung?.kategorie === 'RELAX' ? 80 : 110);
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'tada') {
      [440, 554, 659, 880].forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(f, ctx.currentTime + (i * 0.1));
        g.gain.setValueAtTime(0.1, ctx.currentTime + (i * 0.1));
        g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i * 0.1) + 0.3);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + (i * 0.1)); o.stop(ctx.currentTime + (i * 0.1) + 0.3);
      });
      return;
    } else if (type === 'gong') {
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.5);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
      osc.start();
      osc.stop(ctx.currentTime + 1.5);
    }
    osc.connect(gain);
    gain.connect(ctx.destination);
  };

  const startPause = () => {
    initAudio();
    setStage('spinning');
    setSelectedUebung(null);
    setIsTimerRunning(false);

    const possible = categoryFilter === 'ALL' 
      ? UEBUNGEN 
      : UEBUNGEN.filter(u => u.kategorie === categoryFilter);

    let count = 0;
    const maxCount = 30;
    let speed = 50;
    
    const spin = () => {
      setSelectedUebung(possible[Math.floor(Math.random() * possible.length)]);
      playSound('beep');
      count++;
      
      if (count < maxCount) {
        if (count > 20) speed += 30;
        setTimeout(spin, speed);
      } else {
        setTimeout(() => {
          setStage('active');
          setTimeLeft(duration);
          setIsTimerRunning(true);
          playSound('tada');
        }, 500);
      }
    };
    spin();
  };

  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);

      const bpm = selectedUebung?.kategorie === 'POWER' ? 130 : (selectedUebung?.kategorie === 'RELAX' ? 60 : 90);
      const interval = 60000 / bpm;
      beatIntervalRef.current = setInterval(() => playSound('beat'), interval);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setStage('finished');
      playSound('gong');
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [isTimerRunning, timeLeft]);

  // Klassendienste Logic
  const dienste = app.dienste || STANDARD_DIENSTE.map(d => ({ ...d, schuelerIds: [] }));

  const assignStudentToDienst = (dienstId: string, schuelerId: string) => {
    setApp(prev => {
      const currentDienste = prev.dienste || STANDARD_DIENSTE.map(d => ({ ...d, schuelerIds: [] }));
      const updatedDienste = currentDienste.map(d => {
        if (d.id === dienstId) {
          // Add if not already assigned
          if (!d.schuelerIds.includes(schuelerId)) {
            return { ...d, schuelerIds: [...d.schuelerIds, schuelerId] };
          }
        }
        return d;
      });
      return { ...prev, dienste: updatedDienste };
    });
  };

  const removeStudentFromDienst = (dienstId: string, schuelerId: string) => {
    setApp(prev => {
      const currentDienste = prev.dienste || [];
      const updatedDienste = currentDienste.map(d => {
        if (d.id === dienstId) {
          return { ...d, schuelerIds: d.schuelerIds.filter(id => id !== schuelerId) };
        }
        return d;
      });
      return { ...prev, dienste: updatedDienste };
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Tab Switcher */}
      <div className="flex p-4 gap-2 bg-white border-b border-slate-100 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('pause')}
            className={`px-6 py-2 rounded-xl text-[0.75rem] font-black uppercase tracking-widest transition-all ${activeTab === 'pause' ? 'bg-accent text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Bewegungspause
          </button>
          <button 
             onClick={() => setActiveTab('dienste')}
            className={`px-6 py-2 rounded-xl text-[0.75rem] font-black uppercase tracking-widest transition-all ${activeTab === 'dienste' ? 'bg-accent text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
          >
            Klassendienste
          </button>
        </div>
        {activeTab === 'pause' && (
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-xl transition-all ${isMuted ? 'bg-rose-500/20 text-rose-500' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
        )}
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-2xl border border-white/10 shadow-xl">
          <Sparkles size={16} className="text-amber-400" />
          <span className="text-[0.6875rem] font-black uppercase tracking-widest">Smartboard Focus</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-[#0f172a] text-white">
        <AnimatePresence mode="wait">
          {activeTab === 'pause' ? (
            <motion.div 
              key="pause-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex flex-col items-center justify-center min-h-full"
            >
              {stage === 'setup' && (
                <div className="w-full max-w-4xl space-y-12 py-10">
                  <div className="text-center space-y-2">
                    <h2 className="text-7xl font-black tracking-tighter">Flitzi-Pause</h2>
                    <p className="text-slate-400 text-[1.25rem] leading-normal font-medium">Wähle eine Kategorie für deine Smartboard-Pause</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'POWER', label: 'Power', color: 'bg-rose-500', icon: <Zap size={40} />, desc: 'Power-Übungen zum Auspowern' },
                      { id: 'FOCUS', label: 'Balance', color: 'bg-blue-500', icon: <Target size={40} />, desc: 'Fokus & Gleichgewicht' },
                      { id: 'RELAX', label: 'Relax', color: 'bg-emerald-500', icon: <Waves size={40} />, desc: 'Entspannung & Atmen' },
                    ].map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setCategoryFilter(cat.id as any)}
                        className={`flex flex-col items-center text-center p-8 rounded-[2.5rem] border-4 transition-all active:scale-95 ${categoryFilter === cat.id ? `border-white ${cat.color} shadow-[0_0_40px_rgba(255,255,255,0.2)]` : 'border-white/5 bg-white/5 hover:bg-white/10 opacity-60'}`}
                      >
                        <div className="mb-4">{cat.icon}</div>
                        <div className="text-[1.875rem] leading-tight font-black uppercase mb-2">{cat.label}</div>
                        <div className="text-[0.875rem] leading-snug font-medium opacity-60">{cat.desc}</div>
                      </button>
                    ))}
                    <button
                      onClick={() => setCategoryFilter('ALL')}
                      className={`md:col-span-3 py-6 rounded-3xl border-4 transition-all text-[1.5rem] leading-normal font-black uppercase tracking-widest ${categoryFilter === 'ALL' ? 'border-white bg-white/20' : 'border-white/5 bg-white/5 opacity-60'}`}
                    >
                      Zufällige Mischung
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-center gap-4">
                      {[60, 120, 180].map(sec => (
                        <button
                          key={sec}
                          onClick={() => setDuration(sec)}
                          className={`px-10 py-5 rounded-2xl text-[1.125rem] leading-normal font-black transition-all ${duration === sec ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
                        >
                          {sec / 60} Min.
                        </button>
                      ))}
                    </div>

                    <button 
                      onClick={startPause}
                      className="w-full py-8 bg-amber-500 text-amber-950 rounded-[2.5rem] text-4xl font-black uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(245,158,11,0.3)] hover:-translate-y-1 hover:shadow-[0_25px_60px_rgba(245,158,11,0.4)] transition-all active:scale-[0.98]"
                    >
                      Starten
                    </button>
                  </div>
                </div>
              )}

              {stage === 'spinning' && (
                <div className="flex flex-col items-center gap-10">
                  <div className="w-80 h-80 bg-white/5 rounded-[4rem] border-8 border-white animate-pulse flex items-center justify-center text-[10rem] shadow-2xl  relative">
                    <motion.div
                      animate={{ y: [0, -20, 0] }}
                      transition={{ duration: 0.1, repeat: Infinity }}
                    >
                      {selectedUebung?.emoji}
                    </motion.div>
                  </div>
                  <div className="text-4xl font-black uppercase tracking-[0.5em] animate-pulse">Wähle Übung...</div>
                </div>
              )}

              {stage === 'active' && selectedUebung && (
                <div className="w-full max-w-5xl flex flex-col items-center gap-12 text-center py-10">
                  <div className={`px-6 py-2 rounded-full font-black text-[0.875rem] leading-snug uppercase tracking-widest flex items-center gap-2 ${
                    selectedUebung.kategorie === 'POWER' ? 'bg-rose-500' : 
                    selectedUebung.kategorie === 'FOCUS' ? 'bg-blue-500' : 'bg-emerald-500'
                  }`}>
                    {selectedUebung.kategorie}
                  </div>
                  
                  <div className="flex flex-col items-center gap-6">
                    <div className="text-[15rem] leading-none mb-6 drop-shadow-2xl">{selectedUebung.emoji}</div>
                    <h3 className="text-8xl font-black leading-none">{selectedUebung.titel}</h3>
                    <p className="text-[1.875rem] leading-tight text-slate-400 font-medium max-w-3xl">{selectedUebung.beschreibung}</p>
                  </div>

                  <div className="relative pt-10">
                    <div className="relative w-64 h-64 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90">
                        <circle cx="128" cy="128" r="120" stroke="rgba(255,255,255,0.05)" strokeWidth="16" fill="transparent" />
                        <motion.circle 
                          cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="16" fill="transparent" 
                          strokeDasharray={754}
                          strokeDashoffset={754 - (timeLeft / duration) * 754}
                          strokeLinecap="round"
                          className={selectedUebung.kategorie === 'POWER' ? 'text-rose-500' : selectedUebung.kategorie === 'FOCUS' ? 'text-blue-500' : 'text-emerald-500'}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-6xl font-black tabular-nums">{timeLeft}s</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setIsTimerRunning(false);
                      setStage('setup');
                    }}
                    className="p-4 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-500 rounded-2xl transition-all flex items-center gap-2"
                  >
                    <Square size={20} />
                    <span>Beenden</span>
                  </button>
                </div>
              )}

              {stage === 'finished' && (
                <div className="flex flex-col items-center gap-10 text-center">
                  <div className="w-64 h-64 bg-emerald-500 rounded-[3rem] flex items-center justify-center text-white shadow-[0_0_60px_rgba(34,197,94,0.4)] animate-bounce">
                    <CheckCircle2 size={120} />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-7xl font-black">GESCHAFFT!</h3>
                    <p className="text-[1.5rem] leading-normal text-slate-400 font-medium">Bist du bereit für die nächste Runde?</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setStage('setup')}
                      className="px-12 py-6 bg-white/5 hover:bg-white/10 rounded-3xl text-[1.25rem] leading-normal font-black transition-all"
                    >
                      Menü
                    </button>
                    <button 
                      onClick={startPause}
                      className="px-12 py-6 bg-amber-500 text-amber-950 hover:bg-amber-400 rounded-3xl text-[1.25rem] leading-normal font-black shadow-xl transition-all flex items-center gap-3"
                    >
                      <RotateCcw size={24} />
                      Noch einmal
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="dienste"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-700/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/20 text-accent rounded-xl flex items-center justify-center">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-bold text-white">Klassendienste</h3>
                    <p className="text-[0.6875rem] text-slate-400 font-medium">Hüter der Ordnung & Gemeinschaft</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {(app.dienste || STANDARD_DIENSTE).map(dienst => (
                  <div 
                    key={dienst.id}
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-accent/50 transition-all group flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="w-11 h-11 bg-accent/10 text-accent rounded-xl flex items-center justify-center shrink-0 relative">
                        {(() => {
                           const sd = STANDARD_DIENSTE.find(s => s.titel === dienst.titel);
                           const icon = sd?.icon || <Users size={20} />;
                           const emoji = dienst.emoji || sd?.emoji;
                           return (
                             <>
                               {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 20 }) : icon}
                               {emoji && (
                                 <div className="absolute -bottom-1.5 -right-1.5 text-[0.875rem] bg-slate-800 rounded-full w-6 h-6 flex items-center justify-center shadow-lg border border-white/10">
                                   {emoji}
                                 </div>
                               )}
                             </>
                           );
                        })()}
                      </div>
                      <h4 className="text-[0.875rem] leading-snug font-bold text-white text-wrap leading-tight break-words">{dienst.titel}</h4>
                    </div>
                    
                    <div className="flex-1 min-h-[60px]">
                      <div className="flex flex-wrap gap-1.5">
                        {dienst.schuelerIds.length > 0 ? (
                          dienst.schuelerIds.map(sid => {
                            const student = app.schueler.find(s => s.id === sid);
                            return student ? (
                              <div 
                                key={sid} 
                                className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-white/10 rounded-lg group/chip"
                              >
                                <span className="text-[0.75rem] font-semibold text-slate-200 flex items-center gap-1.5">
                                  {student.emoji && <span>{student.emoji}</span>}
                                  {student.vorname}
                                </span>
                                <button 
                                  onClick={() => removeStudentFromDienst(dienst.id, sid)}
                                  className="p-1 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-md transition-all"
                                >
                                  <TrashIcon size={10} />
                                </button>
                              </div>
                            ) : null;
                          })
                        ) : (
                          <div className="w-full py-3 text-center text-slate-500 italic text-[0.6875rem] border border-dashed border-white/5 rounded-xl">
                            Nicht eingeteilt
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="relative">
                       <select 
                         className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-[0.6875rem] font-bold text-slate-300 outline-none focus:border-accent appearance-none cursor-pointer hover:bg-white/10 transition-colors"
                         onChange={(e) => {
                           if (e.target.value) assignStudentToDienst(dienst.id, e.target.value);
                           e.target.value = '';
                         }}
                         value=""
                       >
                         <option value="" disabled className="bg-slate-900">+ Hinzufügen</option>
                         {app.schueler
                            .filter(s => !dienst.schuelerIds.includes(s.id))
                            .sort((a,b) => a.vorname.localeCompare(b.vorname))
                            .map(s => (
                              <option key={s.id} value={s.id} className="bg-slate-900">{s.vorname} {s.nachname.charAt(0)}.</option>
                            ))
                         }
                       </select>
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                         <UserPlus size={12} />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
