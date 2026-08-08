import React, { useState } from 'react';
import { motion } from 'motion/react';

// ============================================================================
// NATIVE WEB AUDIO API SOUND GENERATOR (100% OFFLINE & INSTANT)
// ============================================================================
export const playMagicSound = (type: 'click' | 'correct' | 'wrong' | 'levelup' | 'sparkle') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else if (type === 'sparkle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'correct') {
      // Warm, major pentatonic chime chord
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4 + i * 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + 0.5 + i * 0.05);
      });
    } else if (type === 'wrong') {
      // Descending buzzer sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      
      // Lowpass filter to avoid hurting ears
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'levelup') {
      // Rising scale arpeggio
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3 + i * 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + 0.4 + i * 0.07);
      });
    }
  } catch (e) {
    console.warn("Audio Context error:", e);
  }
};

// ============================================================================
// CHARACTER AVATARS (FRIDOLIN THE WISE SCHOLAR OWL & LUMI THE RAINBOW CHAMELEON)
// ============================================================================

export const FridolinAvatar: React.FC<{ mood?: 'happy' | 'thinking' | 'excited' | 'wise' }> = ({ mood = 'wise' }) => {
  return (
    <motion.div 
      id="fridolin_avatar_container"
      className="relative flex items-center justify-center select-none"
      animate={{
        y: mood === 'excited' ? [0, -14, 0, -14, 0] : [0, -5, 0],
        rotate: mood === 'thinking' ? [0, 4, -4, 0] : mood === 'excited' ? [0, 3, -3, 3, 0] : 0,
        scale: mood === 'excited' ? [1, 1.1, 1] : 1
      }}
      transition={{
        duration: mood === 'excited' ? 1.2 : 3.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Floating magical sparkles around Fridolin */}
      <div className="absolute top-0 left-0 text-amber-300 animate-ping text-[0.75rem] leading-tight">✨</div>
      <div className="absolute top-4 right-1 text-sky-300 animate-pulse text-[0.75rem] leading-tight">🌟</div>
      <div className="absolute bottom-4 left-2 text-pink-300 animate-bounce text-[0.625rem]">✨</div>

      <svg viewBox="0 0 120 120" className="w-full h-full max-w-full max-h-full drop-shadow-[0_15px_25px_rgba(245,158,11,0.3)]">
        {/* Soft magical glow */}
        <defs>
          <radialGradient id="owlGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="wizardHatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="owlBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="65" r="48" fill="url(#owlGlow)" />

        {/* Branch / Ast */}
        <path d="M15 98 C 40 93, 80 93, 105 98" stroke="#7c2d12" strokeWidth="9" strokeLinecap="round" />
        {/* Golden claws / Füßchen mit Sternenstaub-Glow */}
        <path d="M43 96 L39 103" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
        <path d="M50 96 L48 103" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
        <path d="M70 96 L72 103" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />
        <path d="M77 96 L81 103" stroke="#fbbf24" strokeWidth="5" strokeLinecap="round" />

        {/* Left & Right Wings (Flügel) - they flap gently when excited */}
        <motion.path 
          d="M26 62 C 10 48, 25 32, 45 38" 
          fill="#334155" 
          animate={mood === 'excited' ? { rotate: [0, -15, 0, -15, 0] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <motion.path 
          d="M94 62 C 110 48, 95 32, 75 38" 
          fill="#334155" 
          animate={mood === 'excited' ? { rotate: [0, 15, 0, 15, 0] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        />

        {/* Main Body */}
        <rect x="33" y="34" width="54" height="58" rx="27" fill="url(#owlBodyGrad)" stroke="#475569" strokeWidth="2" />
        
        {/* Sage feather belly pattern (Plüschbauch mit bunten Federchen) */}
        <path d="M44 64 C 49 59, 71 59, 76 64" fill="none" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
        <path d="M47 71 C 52 67, 68 67, 73 71" fill="none" stroke="#fbcfe8" strokeWidth="3" strokeLinecap="round" />
        <path d="M50 78 C 54 75, 66 75, 70 78" fill="none" stroke="#bfdbfe" strokeWidth="3" strokeLinecap="round" />

        {/* Cute Head Feather Tufts (Ohren) */}
        <path d="M40 35 L 26 16 L 46 26 Z" fill="#334155" />
        <path d="M80 35 L 94 16 L 74 26 Z" fill="#334155" />

        {/* Big Rounded Golden wizard Spectacles (Zauberer-Brille) */}
        <circle cx="47" cy="48" r="16" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
        <circle cx="73" cy="48" r="16" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
        <line x1="59" y1="48" x2="61" y2="48" stroke="#f59e0b" strokeWidth="3.5" />

        {/* Large expressive high-contrast Eyes (Super süße Augen) */}
        <circle cx="47" cy="48" r="12" fill="#ffffff" />
        <circle cx="73" cy="48" r="12" fill="#ffffff" />

        {/* Eyeballs reflecting light. If thinking, looking up/sideways. If happy, smiling arcs */}
        {mood === 'happy' || mood === 'excited' ? (
          <>
            <path d="M40 49 C 43 43, 51 43, 54 49" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M66 49 C 69 43, 77 43, 80 49" fill="none" stroke="#0f172a" strokeWidth="4.5" strokeLinecap="round" />
            {/* Blushing cheeks for happy owl */}
            <circle cx="39" cy="62" r="4.5" fill="#f43f5e" opacity="0.4" />
            <circle cx="81" cy="62" r="4.5" fill="#f43f5e" opacity="0.4" />
          </>
        ) : mood === 'thinking' ? (
          <>
            <circle cx="51" cy="44" r="6" fill="#1e293b" />
            <circle cx="77" cy="44" r="6" fill="#1e293b" />
            <circle cx="53" cy="41" r="2.5" fill="#ffffff" />
            <circle cx="79" cy="41" r="2.5" fill="#ffffff" />
          </>
        ) : (
          <>
            {/* Standard shiny wise eyes */}
            <circle cx="47" cy="48" r="6.5" fill="#0f172a" />
            <circle cx="73" cy="48" r="6.5" fill="#0f172a" />
            {/* Sparkly reflection points */}
            <circle cx="45" cy="45" r="2.5" fill="#ffffff" />
            <circle cx="71" cy="45" r="2.5" fill="#ffffff" />
            <circle cx="49" cy="51" r="1.2" fill="#ffffff" />
            <circle cx="75" cy="51" r="1.2" fill="#ffffff" />
          </>
        )}

        {/* Beak / Schnabel */}
        <polygon points="60,53 53,65 67,65" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />

        {/* Magical Purple Wizard Hat & Golden Star on top */}
        <g>
          <path d="M32 20 Q 60 -10 88 20 Z" fill="url(#wizardHatGrad)" stroke="#818cf8" strokeWidth="1.5" />
          <ellipse cx="60" cy="20" rx="30" ry="4" fill="#4f46e5" />
          {/* Hat stars */}
          <polygon points="60,-3 62,-8 67,-8 63,-11 65,-16 60,-13 55,-16 57,-11 53,-8 58,-8" fill="#fbbf24" className="animate-pulse" />
          <polygon points="51,8 53,6 56,7 54,9 55,12 52,10 49,11 51,9 50,6 52,7" fill="#fef08a" />
          <polygon points="68,8 70,6 73,7 71,9 72,12 69,10 66,11 68,9 67,6 69,7" fill="#fef08a" />
        </g>
      </svg>
    </motion.div>
  );
};

export const LumiAvatar: React.FC<{ mood?: 'happy' | 'thinking' | 'excited' | 'wise' }> = ({ mood = 'happy' }) => {
  return (
    <motion.div 
      id="lumi_avatar_container"
      className="relative flex items-center justify-center select-none"
      animate={{
        scale: mood === 'excited' ? [1, 1.1, 0.98, 1.05, 1] : [1, 1.03, 1],
        rotate: mood === 'happy' ? [0, 5, -5, 0] : mood === 'thinking' ? [0, -3, 3, 0] : 0
      }}
      transition={{
        duration: mood === 'excited' ? 1.0 : 4.5,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      {/* Floating stars or bubbles around Lumi */}
      <div className="absolute top-1 left-2 text-emerald-400 animate-bounce text-[0.75rem] leading-tight">🟢</div>
      <div className="absolute top-2 right-4 text-amber-300 animate-ping text-[0.625rem]">⭐</div>
      <div className="absolute bottom-3 right-0 text-cyan-300 animate-pulse text-[0.75rem] leading-tight">✨</div>

      <svg viewBox="0 0 120 120" className="w-full h-full max-w-full max-h-full drop-shadow-[0_15px_25px_rgba(16,185,129,0.3)]">
        <defs>
          <radialGradient id="lumiGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#c6f6d5" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#c6f6d5" stopOpacity="0" />
          </radialGradient>
          {/* Chameleon Color Changing Gradient (magische Farbanpassung!) */}
          <linearGradient id="chameleonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            {mood === 'excited' ? (
              <>
                <stop offset="0%" stopColor="#f43f5e" /> {/* glowing pink-red when excited */}
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ec4899" />
              </>
            ) : mood === 'thinking' ? (
              <>
                <stop offset="0%" stopColor="#06b6d4" /> {/* curious cyan blue */}
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#10b981" />
              </>
            ) : (
              <>
                {/* Default magical bright green gradient */}
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="60%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx="60" cy="65" r="48" fill="url(#lumiGlow)" />

        {/* Cute Curly Chameleon Tail (Zuckersüßer Kringelschwanz) */}
        <rect x="23" y="70" width="12" height="12" rx="6" fill="#15803d" className="opacity-20" />
        <motion.path 
          d="M26 80 C 6 92, 12 114, 28 108 C 38 102, 32 92, 29 90" 
          fill="none" 
          stroke="url(#chameleonGrad)" 
          strokeWidth="11" 
          strokeLinecap="round"
          animate={{ strokeWidth: [11, 13, 11] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Back ridges (Kleine schillernde Zacken auf dem Rücken) */}
        <path d="M40 44 C 48 32, 73 32, 81 44" fill="none" stroke="#fbbf24" strokeWidth="6.5" strokeLinecap="round" strokeDasharray="6,4" />

        {/* Main Body & head shape (Zauberkörper) */}
        <rect x="36" y="44" width="46" height="43" rx="19" fill="url(#chameleonGrad)" stroke="#10b981" strokeWidth="1" />
        <path d="M68 46 C 78 39, 94 38, 98 52 C 101 64, 84 71, 74 66 Z" fill="url(#chameleonGrad)" stroke="#10b981" strokeWidth="1" />

        {/* Tiny playful feet (Kleine tapsige Füße) */}
        <circle cx="46" cy="86" r="6" fill="#047857" />
        <circle cx="74" cy="86" r="6" fill="#047857" />
        
        {/* Soft tummy patch */}
        <ellipse cx="55" cy="65" rx="11" ry="16" fill="#ccfbf1" opacity="0.75" />

        {/* Giant adorable cartoon Chameleon Eyes (Riesige Kulleraugen) */}
        <circle cx="83" cy="51" r="14" fill="#047857" />
        <circle cx="83" cy="51" r="10.5" fill="#e0f2fe" />
        
        {/* Colorful magic iris layer */}
        <circle cx="83" cy="51" r="7.5" fill={mood === 'excited' ? '#ec4899' : mood === 'thinking' ? '#06b6d4' : '#f59e0b'} />

        {/* Pupil directions matching mood */}
        {mood === 'thinking' ? (
          <circle cx="86" cy="47" r="4.5" fill="#0c4a6e" /> // Looking up to the stars
        ) : mood === 'excited' ? (
          <circle cx="83" cy="51" r="5" fill="#0f172a" /> // Centered and wide
        ) : (
          <circle cx="80" cy="53" r="4.5" fill="#0f172a" /> // Happy relaxed look
        )}
        {/* Reflections */}
        <circle cx="81.5" cy="49" r="2.2" fill="#ffffff" />
        <circle cx="84.5" cy="53" r="1" fill="#ffffff" />

        {/* Rosy blush checks */}
        <circle cx="68" cy="63" r="5" fill="#f43f5e" opacity="0.6" />

        {/* Wide happy smile (Ein breites Lächeln) */}
        <path d="M82 62 C 86 65, 91 63, 93 60" fill="none" stroke="#047857" strokeWidth="3" strokeLinecap="round" />
        
        {/* Super cute golden crown if excited, or star sign */}
        {mood === 'excited' && (
          <g transform="translate(48,15)">
            <polygon points="5,10 10,2 15,10 20,2 25,10" fill="#f59e0b" stroke="#d97706" strokeWidth="1" />
            <circle cx="10" cy="1" r="1" fill="#ef4444" />
            <circle cx="20" cy="1" r="1" fill="#ef4444" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};



// ============================================================================
// RICH, INTERACTIVE IMMERSIVE MINI-GAME RENDERER FOR THE ADVENTURER (KID MODE)
// ============================================================================

interface VisualTaskProps {
  id: number;
  visualType: string;
  choices: { id: string; label: string; icon?: string; detail?: string }[];
  onSelect: (choiceId: string) => void;
  selectedId: string | null;
  correctAnswerId: string;
  extraData?: any;
  onLongPressChoice?: (text: string) => void;
}

export const ActiveVisualTaskRenderer: React.FC<VisualTaskProps> = ({
  id,
  visualType,
  choices,
  onSelect,
  selectedId,
  correctAnswerId,
  extraData,
  onLongPressChoice
}) => {
  // State for Task 1: Crystals found list
  const [foundCrystals, setFoundCrystals] = useState<Record<number, boolean>>({});
  // State for Task 6: Clapped Syllables stars
  const [starClaps, setStarClaps] = useState<Record<number, boolean>>({});

  const clickChoice = (choiceId: string, isCorrect: boolean) => {
    onSelect(choiceId);
    if (isCorrect) {
      playMagicSound('correct');
    } else {
      playMagicSound('click');
    }
  };

  // ---------------------------------------------------------
  // 1. CHOOSE COMPANION START (visualType = 'companion')
  // ---------------------------------------------------------
  if (visualType === 'companion') {
    return (
      <div id="visual_task_0" className="space-y-4 text-center">
        <h4 className="text-[0.75rem] leading-tight font-black text-amber-300 uppercase tracking-widest">Wähle deinen Begleiter:</h4>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 px-2">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <motion.button
                key={choice.id}
                onClick={() => clickChoice(choice.id, true)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`p-3 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] border-3 text-center transition-all cursor-pointer relative  flex flex-col items-center justify-center ${
                  isSel
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                    : 'bg-emerald-950/90 border-2 border-emerald-700/80 hover:bg-emerald-900/90 text-amber-100'
                }`}
              >
                {/* Visual companion graphic preview */}
                <div className="h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 flex items-center justify-center">
                  {choice.id === 'treah' || choice.id === 'fridolin' ? (
                    <FridolinAvatar mood={isSel ? 'excited' : 'happy'} />
                  ) : (
                    <LumiAvatar mood={isSel ? 'excited' : 'happy'} />
                  )}
                </div>
                <span className="text-[0.875rem] leading-snug sm:text-[1.125rem] leading-normal md:text-[1.25rem] leading-normal font-black block mt-2">{choice.label}</span>
                <span className={`text-[0.625rem] sm:text-[0.75rem] leading-tight md:text-[0.875rem] leading-snug block mt-1.5 leading-relaxed font-semibold ${isSel ? 'text-slate-900' : 'text-slate-200'}`}>
                  {choice.detail}
                </span>

                {isSel && (
                  <motion.div 
                    layoutId="companionGlowBorder"
                    className="absolute inset-0 border-3 border-amber-300 rounded-[1.5rem] sm:rounded-[2rem] pointer-events-none"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 2. CRYSTAL CAVE COUNT (visualType = 'crystals')
  // ---------------------------------------------------------
  if (visualType === 'crystals') {
    const totalCaveCrystals = [1, 2, 3, 4, 5, 6, 7];
    const isCountComplete = Object.values(foundCrystals).filter(Boolean).length === 7;
    return (
      <div id="visual_task_1" className="space-y-4">
        {/* Interactive counting panel */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl relative text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">
            💡 Tippe auf alle blau glitzernden Kristalle im Gras, um sie zum Strahlen zu bringen!
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-4 py-3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900 to-emerald-980 rounded-2xl min-h-[90px]">
            {totalCaveCrystals.map((idx) => {
              const clicked = foundCrystals[idx];
              return (
                <motion.button
                  key={idx}
                  onClick={() => {
                    setFoundCrystals(p => ({ ...p, [idx]: !p[idx] }));
                    playMagicSound('sparkle');
                  }}
                  animate={{
                    scale: clicked ? [1, 1.3, 1.1] : [1, 1.05, 1],
                    rotate: clicked ? [0, 15, -10, 0] : 0
                  }}
                  className={`w-11 h-11 rounded-full cursor-pointer flex items-center justify-center text-[1.5rem] leading-normal transition-all ${
                    clicked 
                      ? 'bg-amber-400 border-2 border-amber-200 text-[1.875rem] leading-tight shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'bg-emerald-900/60 border border-emerald-700/60 hover:bg-emerald-800'
                  }`}
                >
                  💎
                </motion.button>
              );
            })}
          </div>

          {/* Prompt success status */}
          <div className="mt-2 text-[0.625rem] font-black text-amber-400">
            {isCountComplete ? '🎉 Super gezählt! Wähle nun die 7 Kristalle unten aus.' : `Bisher gefunden: ${Object.values(foundCrystals).filter(Boolean).length} von 7`}
          </div>
        </div>

        {/* Answers row */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 text-amber-100 border-2 border-emerald-700/80 hover:bg-emerald-800 hover:border-emerald-500 hover:text-white'
                }`}
              >
                <span className="text-[1.25rem] leading-normal block">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black block leading-normal">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 3. RUNE PATTERN STONES BRIDGES (visualType = 'rune-pattern')
  // ---------------------------------------------------------
  if (visualType === 'rune-pattern') {
    return (
      <div id="visual_task_3" className="space-y-4">
        {/* Interactive Pattern Road */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl relative text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Die Runenreihe führt über den Fluss. Welcher Stein muss ans Ende?</p>
          <div className="flex items-center justify-center gap-3.5 py-4 p-2 bg-slate-900 rounded-2xl">
            <span className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-[1.125rem] leading-normal shadow-md ring-2 ring-rose-400 border border-rose-300 pointer-events-none">🔴</span>
            <span className="text-emerald-500 font-bold">➔</span>
            <span className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-[1.125rem] leading-normal shadow-md ring-2 ring-blue-400 border border-blue-300 pointer-events-none">🔵</span>
            <span className="text-emerald-500 font-bold">➔</span>
            <span className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center text-[1.125rem] leading-normal shadow-md ring-2 ring-rose-400 border border-rose-300 pointer-events-none">🔴</span>
            <span className="text-emerald-500 font-bold">➔</span>
            <span className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-[1.125rem] leading-normal shadow-md ring-2 ring-blue-400 border border-blue-300 pointer-events-none">🔵</span>
            <span className="text-emerald-500 font-bold">➔</span>
            {/* The gap */}
            <motion.div 
              animate={{
                boxShadow: selectedId === 'red' ? '0 0 15px rgba(239,68,68,0.6)' : '0 0 8px rgba(251,191,36,0.3)'
              }}
              className={`w-10 h-10 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
                selectedId === 'red' ? 'bg-rose-600 border-rose-300 font-bold text-[1.125rem] leading-normal' :
                selectedId === 'blue' ? 'bg-blue-600 border-blue-300 font-bold text-[1.125rem] leading-normal' :
                selectedId === 'green' ? 'bg-emerald-600 border-emerald-300 font-bold text-[1.125rem] leading-normal' :
                'border-amber-400 bg-amber-500/10 text-amber-300 text-[0.75rem] leading-tight font-black animate-pulse'
              }`}
            >
              {selectedId ? (selectedId === 'red' ? '🔴' : selectedId === 'blue' ? '🔵' : '🟢') : '?'}
            </motion.div>
          </div>
        </div>

        {/* Answers stone representation */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 shadow-lg font-black' 
                    : 'bg-emerald-900 text-amber-100 border border-emerald-700/80 hover:bg-emerald-800 hover:border-emerald-500 hover:text-white'
                }`}
              >
                <span className="text-[1.875rem] leading-tight">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 4. CLAPPING SYLLABLES (visualType = 'syllables')
  // ---------------------------------------------------------
  if (visualType === 'syllables') {
    const syllablesList = extraData?.syllables || ['Schmet', 'ter', 'ling'];
    const targetCount = syllablesList.length;
    const isCountComplete = Object.values(starClaps).filter(Boolean).length === targetCount;
    return (
      <div id="visual_task_6" className="space-y-4">
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl relative text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">
            💡 Sprich laut mit: "{syllablesList.join(' - ').toUpperCase()}"! Klatsche im Takt und entzünde die Silben-Sterne!
          </p>

          <div className="flex items-center justify-center gap-5 py-4 bg-slate-900 rounded-2xl">
            {syllablesList.map((syllable: string, index: number) => {
              const starIdx = index + 1;
              const active = starClaps[starIdx];
              return (
                <motion.button
                  key={starIdx}
                  onClick={() => {
                    setStarClaps(p => ({ ...p, [starIdx]: !p[starIdx] }));
                    playMagicSound('sparkle');
                  }}
                  animate={{
                    scale: active ? [1, 1.4, 1.1] : [1, 1.05, 1],
                    rotate: active ? [0, 45, 0] : 0
                  }}
                  className={`w-14 h-14 rounded-full flex flex-col items-center justify-center gap-1 transition-all border cursor-pointer ${
                    active 
                      ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' 
                      : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-[1.5rem] leading-normal">⭐</span>
                  <span className="text-[0.5rem] font-black tracking-tighter uppercase leading-none">
                    {syllable}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-2 text-[0.625rem] font-black text-amber-400">
            {isCountComplete ? `🎉 Alle Sterne funkeln perfekt! Klicke unten auf "${targetCount} Sterne".` : `Eingeklatscht: ${Object.values(starClaps).filter(Boolean).length} von ${targetCount} Silben`}
          </div>
        </div>

        {/* Answers */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 text-amber-100 border-2 border-emerald-700/80 hover:bg-emerald-800 hover:border-emerald-400 hover:text-white'
                }`}
              >
                <span className="text-[1.875rem] leading-tight">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 5. MATH STONE WALL COMPLEMENTS (visualType = 'math-wall')
  // ---------------------------------------------------------
  if (visualType === 'math-wall') {
    const topNumber = extraData?.top !== undefined ? extraData.top : 10;
    const leftNumber = extraData?.left !== undefined ? extraData.left : 7;
    return (
      <div id="visual_task_7" className="space-y-4">
        {/* Interactive Math Wall */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl relative text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Finde das passende Steinstück, damit die Zahlenmauer hält!</p>
          
          <div className="max-w-[200px] mx-auto py-3 space-y-1">
            {/* Top stone */}
            <div className="w-full bg-slate-700 text-white rounded-t-xl border-x border-t border-slate-500 py-3 font-mono font-black text-[1.5rem] leading-normal shadow-inner text-center">
              {topNumber}
            </div>
            {/* Two bottom stones */}
            <div className="grid grid-cols-2 gap-1 animate-fade-in">
              <div className="bg-slate-800 border border-slate-600 text-indigo-400 py-3.5 font-mono font-black text-[1.125rem] leading-normal rounded-bl-xl text-center">
                {leftNumber}
              </div>
              <motion.div 
                animate={{
                  scale: selectedId ? [1, 1.05, 1] : 1
                }}
                className={`border text-slate-900 py-3.5 font-mono font-black text-[1.125rem] leading-normal rounded-br-xl text-center flex items-center justify-center transition-all ${
                  selectedId === correctAnswerId ? 'bg-amber-400 border-amber-200 shadow' : 'bg-slate-900 border-slate-750 text-amber-300 animate-pulse'
                }`}
              >
                {selectedId ? selectedId : '?'}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Action button choices */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 border-2 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-500 text-amber-100 hover:text-white font-semibold'
                }`}
              >
                <span className="text-[1.875rem] leading-tight">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 6. SYMMETRY MIRROR LAKE (visualType = 'mirror')
  // ---------------------------------------------------------
  if (visualType === 'mirror') {
    return (
      <div id="visual_task_10" className="space-y-4">
        {/* Interactive Mirror */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Die Rune spiegelt sich im glasklaren Waldsee!</p>
          <div className="grid grid-rows-2 gap-1 bg-slate-900 p-3 rounded-2xl max-w-[180px] mx-auto border border-emerald-800/30">
            {/* Top real object */}
            <div className="flex flex-col items-center justify-center p-2 border-b border-dashed border-sky-500/30 text-white font-black">
              <span className="text-4xl text-amber-300">🌙</span>
              <span className="text-[0.5rem] uppercase text-slate-400 tracking-wider">Himmel-Rune (Rechts)</span>
            </div>
            {/* Mirror reflecting lake */}
            <div className="flex flex-col items-center justify-center p-2 text-sky-200 bg-sky-950/20 font-black relative ">
              <div className="absolute inset-0 bg-blue-500/5 backdrop-blur-xs" />
              {selectedId === 'korrekt' ? (
                <motion.span animate={{ y: [4, 0, 4] }} transition={{ repeat: Infinity, duration: 2 }} className="text-4xl text-sky-300 transform scale-x-[-1]">🌙</motion.span> // exact horizontal mirror
              ) : selectedId === 'oben' ? (
                <span className="text-4xl text-rose-300 transform rotate-180">🌙</span>
              ) : (
                <span className="text-[1.5rem] leading-normal text-slate-500 animate-pulse">?</span>
              )}
              <span className="text-[0.5rem] uppercase text-sky-400 tracking-wider z-10 mt-1">Seespiegelung</span>
            </div>
          </div>
        </div>

        {/* choices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-3.5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 border-2 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-500 text-amber-100 hover:text-white font-semibold'
                }`}
              >
                <span className="text-[1.5rem] leading-normal">{choice.icon}</span>
                <span className="text-[0.625rem] font-black leading-tight block">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 7. KEY GEOMETRY CRYSTAL LOCK (visualType = 'lock')
  // ---------------------------------------------------------
  if (visualType === 'lock') {
    return (
      <div id="visual_task_13" className="space-y-4">
        {/* Lock visual card */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Welcher Schlüssel schließt dieses dreieckige Schloss auf?</p>
          <div className="flex items-center justify-center h-20 w-20 mx-auto rounded-full bg-slate-900 border-4 border-slate-600 relative">
            {selectedId === 'dreieck' ? (
              <motion.span animate={{ rotate: [0, 90, 90, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="text-[1.875rem] leading-tight text-amber-400">🔺</motion.span>
            ) : selectedId === 'kreis' ? (
              <span className="text-[1.875rem] leading-tight text-rose-500">🟡</span>
            ) : selectedId === 'quadrat' ? (
              <span className="text-[1.875rem] leading-tight text-blue-500">🟦</span>
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-300 animate-pulse flex items-center justify-center text-[0.75rem] leading-tight text-amber-300 font-bold">?</div>
            )}
            <div className="absolute bottom-2.5 text-[0.5rem] font-black text-slate-500 uppercase tracking-widest leading-none">Schloss</div>
          </div>
        </div>

        {/* choice key tiles */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 border-2 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-500 text-amber-100 hover:text-white font-semibold'
                }`}
              >
                <span className="text-[1.25rem] leading-normal block">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black block leading-normal">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 8. WATER LILY STEPS PATH ON SEA (visualType = 'lily-pads')
  // ---------------------------------------------------------
  if (visualType === 'lily-pads') {
    const sequence = extraData?.sequence || [10, 20, 30, '??', 50];
    return (
      <div id="visual_task_18" className="space-y-4">
        {/* River road */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl relative text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Hüpfe über das Zahlenmeer. Setze die richtige Zahl ein!</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5 py-4 bg-sky-950/80 rounded-2xl">
            {sequence.map((item: any, idx: number) => {
              const isGap = item === '??';
              if (isGap) {
                return (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-amber-500 font-bold">➔</span>}
                    <motion.span 
                      animate={{
                        scale: selectedId ? [1, 1.1, 1] : [1, 0.95, 1]
                      }}
                      className={`px-3.5 py-2.5 border-2 rounded-full font-mono text-[0.75rem] leading-tight font-black transition-all ${
                        selectedId === correctAnswerId ? 'bg-amber-400 border-amber-200 text-slate-950 shadow' : 'bg-slate-900 border-dashed border-amber-400 text-amber-300 animate-pulse'
                      }`}
                    >
                      {selectedId ? selectedId : '??'}
                    </motion.span>
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="text-amber-500 font-bold">➔</span>}
                  <span className="px-3.5 py-2.5 bg-emerald-800 border-2 border-emerald-500 text-emerald-100 font-black rounded-full font-mono text-[0.75rem] leading-tight shadow">
                    {item}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* choices */}
        <div className="grid grid-cols-3 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-5 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg shadow-amber-500/10' 
                    : 'bg-emerald-900 border-2 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-500 text-amber-100 hover:text-white font-semibold'
                }`}
              >
                <span className="text-[1.875rem] leading-tight">{choice.icon}</span>
                <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black">{choice.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // EXTRA: REPLACEMENT PATHS AND BOILING CAULDRONS FOR SIZE/ORDER (visualType = 'sorting')
  // ---------------------------------------------------------
  if (visualType === 'sorting') {
    return (
      <div id="visual_task_14" className="space-y-4">
        {/* Potions scale illustration */}
        <div className="bg-emerald-950 border border-emerald-800/60 p-4 rounded-3xl text-center">
          <p className="text-[0.625rem] font-bold text-amber-200 mb-2">Bringe den Magierucksack vom kleinsten Volumen zum größten Volumen in Ordnung!</p>
          <div className="flex items-end justify-center gap-5 py-4 bg-slate-900 rounded-2xl min-h-[90px]">
            <div className="flex flex-col items-center">
              <span className="text-[1.5rem] leading-normal transform scale-75 animate-pulse">🍼</span>
              <span className="text-[0.5rem] font-black uppercase text-slate-400 mt-1">1. Klein</span>
            </div>
            <div className="text-slate-500 text-[0.75rem] leading-tight font-bold pb-2">➔</div>
            <div className="flex flex-col items-center">
              <span className="text-[1.875rem] leading-tight transform scale-100 animate-pulse">🍶</span>
              <span className="text-[0.5rem] font-black uppercase text-slate-400 mt-1">2. Mittel</span>
            </div>
            <div className="text-slate-500 text-[0.75rem] leading-tight font-bold pb-2">➔</div>
            <div className="flex flex-col items-center">
              <span className="text-4xl transform scale-125 animate-pulse">🧪</span>
              <span className="text-[0.5rem] font-black uppercase text-slate-400 mt-1">3. Riesig</span>
            </div>
          </div>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((choice) => {
            const isSel = selectedId === choice.id;
            return (
              <button
                key={choice.id}
                onClick={() => clickChoice(choice.id, choice.id === correctAnswerId)}
                onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
                className={`p-4 rounded-2xl border-2 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isSel 
                    ? 'bg-amber-400 text-slate-950 border-amber-300 scale-103 font-black shadow-lg' 
                    : 'bg-emerald-900 border-2 border-emerald-700 hover:bg-emerald-800 hover:border-emerald-500 text-amber-100 hover:text-white font-semibold'
                }`}
              >
                <div className="flex items-center gap-1.5">{choice.icon} <span className="text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal font-black">{choice.label}</span></div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // DEFAULT STANDARD PARCHMENT MAGIC CARD RENDER (For all other quests)
  // ---------------------------------------------------------
  return (
    <div id="visual_task_default" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {choices.map((choice) => {
        const isSel = selectedId === choice.id;
        return (
          <motion.button
            key={choice.id}
            onClick={() => clickChoice(choice.id, choice.id === (correctAnswerId || 'any'))}
            onContextMenu={(e) => { e.preventDefault(); onLongPressChoice?.(choice.label); }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`p-4 sm:p-6 md:p-8 rounded-3xl text-center border-2 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative  ${
              isSel
                ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 border-amber-200 scale-102 font-black shadow-[0_10px_20px_rgba(245,158,11,0.3)]'
                : 'bg-emerald-900 border-2 border-emerald-700/80 text-amber-100 hover:bg-emerald-800 hover:border-emerald-500 hover:text-white shadow-md'
            }`}
          >
            {/* Elegant glowing runic pattern backing */}
            <div className="absolute -top-3 -right-3 text-emerald-800/20 text-4xl pointer-events-none select-none font-mono">🔮</div>
            
            <span className="text-4xl sm:text-5xl md:text-6xl block relative z-10 bounce-anim">{choice.icon || '📜'}</span>
            <div className="space-y-1 relative z-10">
              <span className="text-[1rem] leading-normal sm:text-[1.125rem] leading-normal md:text-[1.25rem] leading-normal font-extrabold block leading-snug">{choice.label}</span>
              {choice.detail && (
                <span className={`text-[0.75rem] leading-tight sm:text-[0.875rem] leading-snug block leading-normal opacity-90 font-medium ${isSel ? 'text-slate-900' : 'text-slate-200'}`}>
                  {choice.detail}
                </span>
              )}
            </div>
            
            {/* Symmetrical framing details like a proper magic card */}
            <div className="absolute bottom-2 right-4 w-2 h-2 rounded-full opacity-30 bg-amber-200" />
            <div className="absolute bottom-2 left-4 w-2 h-2 rounded-full opacity-30 bg-amber-200" />
            <div className="absolute top-2 right-4 w-1.5 h-1.5 rounded-full opacity-30 bg-amber-200" />
            <div className="absolute top-2 left-4 w-1.5 h-1.5 rounded-full opacity-30 bg-amber-200" />
          </motion.button>
        );
      })}
    </div>
  );
};
