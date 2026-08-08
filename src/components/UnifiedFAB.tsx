import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Mic, 
  StickyNote, 
  UserPlus, 
  CalendarCheck, 
  X, 
  Bot,
  Sparkles,
  Heart,
  Wind,
  Coffee,
  Settings as SettingsIcon,
  ChevronRight,
  ShieldAlert,
  Dumbbell,
  Play,
  RotateCcw,
  Volume2,
  Tv,
  Loader2,
  Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { askAI } from '../services/aiService';
import { PET_BREEDS, AVAILABLE_ACCESSORIES, PetBreed, Accessory } from './ClassPetWidget';

interface PlayAction {
  id: string;
  label: string;
  icon: string;
  energyBonus: number;
  responseTemplate: (petName: string) => string;
}

const FAB_PET_ACTIONS: PlayAction[] = [
  {
    id: 'star',
    label: 'Knabbern',
    icon: '⭐',
    energyBonus: 15,
    responseTemplate: (name) => `⭐ Mampf! ${name} nascht einen Glücksstern und strahlt über beide Ohren!`
  },
  {
    id: 'praise',
    label: 'Loben',
    icon: '💖',
    energyBonus: 10,
    responseTemplate: (name) => `💖 Oh danke! ${name} kuschelt sich an und schickt ganz viel Wärme in die Klasse!`
  },
  {
    id: 'air',
    label: 'Lüften',
    icon: '🍃',
    energyBonus: 10,
    responseTemplate: (name) => `🍃 O2-Kick! ${name} dreht vor lauter frischer Sauerstoff-Power eine lustige Schleife!`
  },
  {
    id: 'tanz',
    label: 'Zappeln',
    icon: '🎵',
    energyBonus: 15,
    responseTemplate: (name) => `🎵 Shake-it! ${name} legt einen fetzigen Zappel-Tanz auf das Pult!`
  }
];

interface Particle {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotate: number;
}

export default function UnifiedFAB() {
  const { app, setApp, setPage } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [reactionText, setReactionText] = useState<string>('');
  const [bounceTrigger, setBounceTrigger] = useState(false);
  
  // Immersive Beamer interaction states
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isDancing, setIsDancing] = useState(false);
  const [danceProgress, setDanceProgress] = useState(60); // 1 minute countdown

  // KI Chat State
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Lazy initialize pet values
  const petState = app.classPet || {
    enabled: true,
    animalType: 'dino',
    name: 'Spike',
    energy: 50,
    accessories: [],
    history: []
  };

  const showMascot = true;
  const [showPetControls, setShowPetControls] = useState(false);

  useEffect(() => {
    setShowPetControls(false);
  }, []);

  const isPetEnabled = petState.enabled !== false;
  const currentBreed = PET_BREEDS.find(b => b.id === petState.animalType) || PET_BREEDS[0];

  const updatePet = (updater: (prev: typeof petState) => Partial<typeof petState>) => {
    setApp(prev => {
      const current = prev.classPet || {
        enabled: true,
        animalType: 'dino',
        name: 'Spike',
        energy: 50,
        accessories: [],
        history: []
      };
      const updated = { ...current, ...updater(current) };
      return {
        ...prev,
        classPet: updated
      };
    });
  };

  const playInteractSound = (freq: number = 523.25, type: OscillatorType = 'sine', duration: number = 0.3) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.type = type;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      }
    } catch (e) {}
  };

  // Synthesizes a beautiful ascending praise arpeggio sound sequence
  const playMagicalArpeggio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const timeOffset = index * 0.12;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);
        gain.gain.setValueAtTime(0.05, ctx.currentTime + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + timeOffset);
        osc.stop(ctx.currentTime + timeOffset + 0.3);
      });
    } catch (e) {}
  };

  // Handles active selection and particle spawning
  const triggerParticles = (emoji: string) => {
    const newParticles: Particle[] = Array.from({ length: 15 }).map(() => ({
      id: crypto.randomUUID(),
      emoji,
      x: Math.random() * 80 - 45, // offset offset
      y: Math.random() * 80 - 40,
      scale: Math.random() * 1.5 + 0.8,
      rotate: Math.random() * 90 - 45
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1800);
  };

  // Countdown for active fun dance break
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDancing && danceProgress > 0) {
      interval = setInterval(() => {
        setDanceProgress(prev => {
          if (prev <= 1) {
            setIsDancing(false);
            playMagicalArpeggio();
            return 60;
          }
          return prev - 1;
        });
        // Spark a few funny music notes
        triggerParticles('🎵');
        playInteractSound(Math.random() * 300 + 300, 'triangle', 0.1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isDancing, danceProgress]);

  const handlePetAction = (act: PlayAction) => {
    const newEnergy = Math.min(100, petState.energy + act.energyBonus);
    const response = act.responseTemplate(petState.name);

    const historyItem = {
      id: crypto.randomUUID(),
      action: act.label,
      datum: new Date().toISOString(),
      energyDelta: act.energyBonus,
      text: response
    };

    updatePet(prev => ({
      energy: newEnergy,
      history: [historyItem, ...(prev.history || [])].slice(0, 15)
    }));

    setReactionText(response);
    setBounceTrigger(true);
    triggerParticles(act.icon);
    setTimeout(() => setBounceTrigger(false), 800);
    playInteractSound(587.33, 'triangle', 0.45); // D5 note sound
  };


  const handleTickle = () => {
    setBounceTrigger(true);
    setTimeout(() => setBounceTrigger(false), 800);
    const tickleResponses = [
      `Kicher-kicher! ${petState.name} findet das kitzelig!`,
      `Hihi! Das kitzelt am Bauch! 😄`,
      `Wiggel-wiggel! ${petState.name} freut sich riesig!`,
      `${petState.name} schaut dich dankbar an.`
    ];
    const rand = tickleResponses[Math.floor(Math.random() * tickleResponses.length)];
    setReactionText(rand);
    triggerParticles('✨');
    playInteractSound(659.25, 'sine', 0.2); // E5 note
  };

  const handleAskPet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiThinking) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsAiThinking(true);
    setReactionText('...');
    setBounceTrigger(true);
    setTimeout(() => setBounceTrigger(false), 800);

    try {
      const prompt = `Antworte als das Klassentier ${petState.name} (Typ: ${currentBreed.breedLabel}). 
Der Charakter ist fröhlich, motivierend und kindgerecht (Volksschule).
Die Lehrperson sagt zu dir: "${userMessage}"
Antworte kurz, lustig und in maximal 2-3 Sätzen. Nutze ab und zu Emojis.`;

      const response = await askAI('ki-helfer', prompt);
      setReactionText(response.trim());
      
      const newEnergy = Math.min(100, petState.energy + 2); // Talking gives small energy boost
      updatePet(prev => ({
        energy: newEnergy,
        history: [{
          id: crypto.randomUUID(),
          action: 'KI-Gespräch',
          datum: new Date().toISOString(),
          energyDelta: 2,
          text: response.trim()
        }, ...(prev.history || [])].slice(0, 15)
      }));

      playInteractSound(783.99, 'sine', 0.2); // G5 Note
      triggerParticles('💬');
    } catch (error) {
      setReactionText('Uups! Da habe ich dich kurz nicht verstanden. 🐾');
    } finally {
      setIsAiThinking(false);
    }
  };

  const teacherActions = [
    { 
      id: 'denkzettel', 
      label: 'Denkzettel schreiben', 
      desc: 'Schnelle Tafelnotiz oder Ermahnung',
      icon: <StickyNote size={18} />, 
      color: 'bg-amber-500 shadow-amber-500/20', 
      action: () => setApp(prev => ({ ...prev, showDenkzettel: true })) 
    },
    { 
      id: 'voice', 
      label: 'Sprachnotiz aufnehmen', 
      desc: 'Kurzer Audio-Eintrag für dich',
      icon: <Mic size={18} />, 
      color: 'bg-rose-500 shadow-rose-500/20', 
      action: () => setApp(prev => ({ ...prev, stimmNotizModal: true })) 
    },
    { 
      id: 'student', 
      label: 'Schüler hinzufügen', 
      desc: 'Neue Kinder in die Liste aufnehmen',
      icon: <UserPlus size={18} />, 
      color: 'bg-indigo-500 shadow-indigo-500/20', 
      action: () => setPage('schueler') 
    },
    { 
      id: 'attendance', 
      label: 'Anwesenheit prüfen', 
      desc: 'Wer fehlt heute im Unterricht?',
      icon: <CalendarCheck size={18} />, 
      color: 'bg-emerald-500 shadow-emerald-500/20', 
      action: () => setPage('anwesenheit') 
    },
    { 
      id: 'ai', 
      label: 'KI Helfer fragen', 
      desc: 'Unterrichtsideen & Planer-Feedback',
      icon: <Bot size={18} />, 
      color: 'bg-slate-900 shadow-slate-900/10', 
      action: () => setPage('ki-helfer') 
    },
  ];

  const defaultDialogue = () => {
    if (petState.energy <= 20) return `Zzz... ich bin ganz müde. Ein Glücksstern würde mir jetzt Kraft geben! 🌟`;
    if (petState.energy >= 85) return `Superklasse! Ich bin vollgeladen mit purer Freude und Lernenergie! 🚀 Let's go!`;
    return `Hallo! Ich bin ${petState.name}. Ich passe auf, dass wir heute einen spitzenmäßigen Unterricht haben! ✨`;
  };

  // Switcher: If the Class Pet is explicitly DISABLED, replace it with the gorgeous Denkzettel write-pad FAB
  if (!isPetEnabled) {
    return (
      <div id="unified-fab-denkzettel-only" className="fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-3 no-print font-sans">
        
        {/* Simple elegant Label tooltip shown on hover */}
        <div className="absolute right-0 bottom-full mb-2 bg-slate-950/90 text-white rounded-xl px-2.5 py-1 text-[0.59375rem] font-black tracking-widest uppercase opacity-0 invisible hover:opacity-100 group-hover:opacity-100 transition-all pointer-events-none shadow">
          Denkzettel schreiben 📝
        </div>

        {/* Floating action button dedicated directly to Denkzettel modal entry */}
        <div className="relative group">
          
          {/* Subtle Warm Halo Glow */}
          <div className="absolute -inset-1 rounded-[2.2rem] opacity-25 filter blur-[5px] bg-amber-500/70 animate-pulse pointer-events-none" />

          <motion.button
            onClick={() => {
              setApp(prev => ({ ...prev, showDenkzettel: true }));
              playInteractSound(587.33, 'sine', 0.15); // D5 chime
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="w-[62px] h-[62px] rounded-[1.8rem] flex items-center justify-center bg-gradient-to-tr from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white shadow-[0_12px_36px_rgba(245,158,11,0.35)] active:scale-95 border-3 border-white shrink-0 relative transition-transform cursor-pointer"
            title="Ermahnung oder Tafel-Denkzettel verfassen"
          >
            <StickyNote size={26} className="text-white transform -rotate-6 filter drop-shadow" />
            
            {/* Minimal red active badge represent writing readiness */}
            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
            </span>
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div id="unified-fab-classpet" className="fixed bottom-6 right-6 z-[300] flex flex-col items-end gap-3 no-print font-sans">
      
      {/* EXTREMELY POLISHED INTERACTIVE CONSOLE POP-OVER */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.85, y: 35, x: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 35, x: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="w-[320.5px] max-w-[calc(100vw-2rem)] bg-white rounded-[2.5rem] shadow-[0_24px_56px_rgba(15,23,42,0.18)] border border-slate-105 flex flex-col  pb-4"
          >
            {/* Console Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[1.25rem] leading-normal">🏆</span>
                <div>
                  <h4 className="text-[0.75rem] leading-tight font-black text-slate-800 uppercase tracking-widest">{petState.name}</h4>
                  <p className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Klassen-Begleiter & Cockpit</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = !showPetControls;
                    setShowPetControls(next);
                    playInteractSound(440, 'sine', 0.1);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[0.5625rem] font-black uppercase tracking-wider border transition-all ${
                    showPetControls 
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-650' 
                      : 'bg-slate-100 border-slate-200 text-slate-650'
                  }`}
                >
                  {showPetControls ? 'Aktionen' : 'Haustier'}
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    playInteractSound(350, 'sine', 0.1);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Render Tab Content */}
            {showPetControls ? (
              /* TAB 1: INTERACTIVE GAMEPLAY MODULE (THE ANIMAL ITSELF) */
              <div className="p-4 space-y-4 flex-1">
                
                {/* Character Interactive Frame */}
                <div className="flex flex-col items-center bg-slate-50/50 p-4 border border-slate-100 rounded-3xl relative">
                  
                  {/* Floating aura */}
                  <div className={`absolute w-16 h-16 rounded-full blur-xl opacity-10 ${
                    petState.energy > 50 ? 'bg-emerald-400' : 'bg-amber-400'
                  }`} />
                  
                  {/* Avatar with overlays */}
                  <motion.div
                    animate={bounceTrigger ? {
                      scale: [1, 1.3, 0.9, 1.15, 1],
                      rotate: [0, -12, 12, -6, 0],
                      y: [0, -20, 5, -5, 0]
                    } : {
                      y: [0, -4, 0, -4, 0]
                    }}
                    transition={{ duration: bounceTrigger ? 0.8 : 3, repeat: bounceTrigger ? 0 : Infinity, ease: "easeInOut" }}
                    className="text-6xl select-none relative w-16 h-16 flex items-center justify-center cursor-pointer mb-2"
                    onClick={handleTickle}
                    title="Kitzeln!"
                  >
                    <span>{currentBreed.emoji}</span>
                    {petState.accessories.map(accId => {
                      const acc = AVAILABLE_ACCESSORIES.find(a => a.id === accId);
                      if (!acc) return null;
                      return (
                        <span key={acc.id} className={acc.styleClass}>
                          {acc.icon}
                        </span>
                      );
                    })}
                  </motion.div>

                  {/* Active Animal Dialogue bubble */}
                  <div className="bg-white border border-slate-100 text-[0.65625rem] leading-relaxed text-slate-600 font-semibold italic text-center p-2.5 rounded-2xl w-full shadow-sm relative">
                    {reactionText || defaultDialogue()}
                  </div>

                  {/* KI Chat Input */}
                  <form onSubmit={handleAskPet} className="w-full relative mt-2">
                    <input
                      type="text"
                      placeholder={`Frage ${petState.name} etwas...`}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isAiThinking}
                      className="w-full text-[0.625rem] bg-white border border-slate-200 rounded-full px-3 py-1.5 pr-8 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow disabled:opacity-50 font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || isAiThinking}
                      className="absolute right-1 top-1 bottom-1 w-5 h-5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-full flex items-center justify-center disabled:opacity-50 disabled:bg-transparent"
                    >
                      {isAiThinking ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                    </button>
                  </form>
                </div>

                {/* Energy gauge tracker */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">
                    <span>Energie</span>
                    <span className="text-slate-800 font-mono">{petState.energy}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 border border-slate-200 rounded-full ">
                    <div 
                      className={`h-full bg-gradient-to-r ${
                        petState.energy < 25 
                          ? 'from-rose-500 to-red-400' 
                          : petState.energy < 60 
                          ? 'from-amber-500 to-orange-400' 
                          : 'from-teal-400 to-emerald-500'
                      } rounded-full transition-all duration-500`}
                      style={{ width: `${petState.energy}%` }}
                    />
                  </div>
                </div>

                {/* Play items */}
                <div className="space-y-1.5">
                  <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest leading-none block">Glück & Vitalität schenken:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FAB_PET_ACTIONS.map((act) => (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => handlePetAction(act)}
                        className="flex flex-col items-center p-1.5 bg-slate-50 hover:bg-indigo-50/50 hover:border-indigo-200 active:scale-90 rounded-xl border border-slate-200 transition-all cursor-pointer"
                        title={`${act.label} (+${act.energyBonus} XP)`}
                      >
                        <span className="text-[1.25rem] leading-normal mb-0.5">{act.icon}</span>
                        <span className="text-[0.5rem] font-extrabold text-slate-600">{act.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-[0.5625rem] text-slate-400 font-bold italic">Klicke oben auf "Aktionen" für Schnellmenüs</p>
                </div>

              </div>
            ) : (
              /* TAB 2: UNIFIED TEACHER QUICK ACTION TOOLBAR */
              <div className="px-4 py-3 space-y-2 flex-1 max-h-[350px] overflow-y-auto style-scrollbar">
                <span className="text-[0.5625rem] font-black text-slate-400 uppercase tracking-widest leading-none block mb-2">Schnell-Operationszentrale:</span>
                
                <div className="space-y-1.5">
                  {teacherActions.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => {
                        act.action();
                        setIsOpen(false);
                        playInteractSound(523.25, 'sine', 0.15); // C5 sound
                      }}
                      className="w-full flex items-center gap-3 p-2.5 bg-slate-50/60 hover:bg-slate-100 active:scale-98 rounded-2xl border border-slate-150 transition-all group text-left cursor-pointer"
                    >
                      <div className={`w-9 h-9 shrink-0 ${act.color} text-white rounded-xl flex items-center justify-center shadow-sm transition-all group-hover:scale-105`}>
                        {act.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.71875rem] font-black text-slate-850 group-hover:text-indigo-650 transition-colors">{act.label}</p>
                        <p className="text-[0.5625rem] text-slate-400 font-medium text-wrap leading-tight break-words mt-0.5">{act.desc}</p>
                      </div>
                      <ChevronRight size={13} className="text-slate-300 group-hover:text-indigo-500 transition-all transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>

                <p className="text-center text-[0.5625rem] text-slate-400 font-bold italic mt-2.5">
                  Begleiter-Laune beeinflussbar im "Haustier" Modus!
                </p>
              </div>
            )}
            
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING PRIMARY PET CHARACTER BUTTON (RECOLORS BASED ON LAUNE / CONSOLE STATE) */}
      <div className="relative group/fab">
        
        {/* Halo Glow Ring representing energy level */}
        {showMascot && (
          <div className={`absolute -inset-1.5 rounded-[2.2rem] opacity-35 filter blur-[6px] animate-pulse pointer-events-none transition-all duration-700 ${
            petState.energy < 25 
              ? 'bg-rose-500' 
              : petState.energy < 60 
              ? 'bg-amber-400' 
              : 'bg-emerald-400'
          }`} />
        )}

        {/* Small floating energy level tag above the mascot */}
        {showMascot && !isOpen && (
          <div className="absolute top-[-0.9rem] right-1.5 bg-slate-900 border border-slate-800 text-white rounded-full px-1.5 py-0.5 text-[0.5rem] font-bold font-mono shadow opacity-0 group-hover/fab:opacity-100 transition-opacity z-10 pointer-events-none">
            {petState.name}: {petState.energy}% ⚡
          </div>
        )}

        {/* The Float Core Button containing the animal */}
        <motion.button
          onClick={() => {
            setIsOpen(!isOpen);
            playInteractSound(isOpen ? 440 : 523.25, 'sine', 0.12);
          }}
          animate={isOpen ? {
            scale: [1, 0.92, 1],
            rotate: [0, 4, 0]
          } : {
            y: [0, -5, 0], // subtle floating animation
          }}
          transition={isOpen ? {
            duration: 0.25
          } : {
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-[68px] h-[68px] rounded-[2.2rem] flex items-center justify-center border-4 shadow-2xl transition-all duration-300 relative z-20 cursor-pointer overflow-visible ${
            isOpen 
              ? 'bg-slate-900 border-slate-700 scale-95 text-slate-450' 
              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:scale-105 active:scale-95'
          }`}
          title={`${petState.name} - ${currentBreed.breedLabel}`}
        >
          {/* Main animal character sizing */}
          <span className="text-4xl select-none relative flex items-center justify-center">
            {currentBreed.emoji}
            
            {/* Display wardrobe overlays directly on the floating badge! */}
            {petState.accessories?.map(accId => {
              const acc = AVAILABLE_ACCESSORIES.find(a => a.id === accId);
              if (!acc) return null;
              
              // Scale down slightly for the launcher button
              const isCentered = acc.styleClass.includes('-translate-x-1/2');
              return (
                <span 
                  key={acc.id} 
                  className={acc.styleClass}
                  style={{ transform: isCentered ? 'translateX(-50%) scale(0.75)' : 'scale(0.75)' }}
                >
                  {acc.icon}
                </span>
              );
            })}
          </span>

          {/* Interactive Plus / Close corner badge */}
          <div 
            className={`absolute -bottom-1 -right-1 rounded-full w-6.5 h-6.5 border-2 border-white flex items-center justify-center shadow-lg transition-all duration-300 transform ${
              isOpen 
                ? 'bg-rose-500 text-white rotate-45 scale-110' 
                : 'bg-indigo-600 text-white hover:bg-indigo-550 group-hover/fab:scale-110'
            }`}
          >
            <Plus size={11} strokeWidth={4} />
          </div>

          {/* Low energy sleepy state Zzz bubbles floating */}
          {showMascot && !isOpen && petState.energy <= 24 && (
            <div className="absolute top-0 right-[-0.2rem] text-[0.625rem] animate-bounce text-slate-500 font-bold select-none pointer-events-none">
              zZZ
            </div>
          )}

          {/* High energy stars jumping indicators */}
          {showMascot && !isOpen && petState.energy >= 80 && (
            <span className="absolute -top-1.5 -left-1 text-[0.75rem] leading-tight animate-ping duration-1000 text-amber-400 select-none pointer-events-none">✨</span>
          )}

          {/* Simple notification small red dot representing open state */}
          {showMascot && !isOpen && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -left-0.5 w-4.5 h-4.5 bg-rose-500 border-3 border-white rounded-full shadow-sm z-10"
            />
          )}
        </motion.button>
      </div>

      {/* Invisible backdrop click dismisser */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-transparent z-[-1]" 
          onClick={() => setIsOpen(false)} 
        />
      )}
    </div>
  );
}

