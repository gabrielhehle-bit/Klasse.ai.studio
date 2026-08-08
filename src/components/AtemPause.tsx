import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Play, Square, Wind, Sparkles, Check, Volume2, VolumeX } from 'lucide-react';

export default function AtemPause() {
  const { app } = useApp();
  const [active, setActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCounter, setBreathCounter] = useState(4); // 4 seconds per phase
  const [muted, setMuted] = useState(false);
  const [finished, setFinished] = useState(false);

  // Audio Context for offline synthesized sounds
  const playSound = (freq: number, type: OscillatorType, duration: number) => {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Could not play sound: ", e);
    }
  };

  // Theme color mapping based on Wizard Face / Settings
  const themeHexMap: Record<string, string> = {
    classic_light: '#0f172a',
    deep_dark: '#ea580c',
    soft_sage: '#10b981',
    ocean_breeze: '#3b82f6',
    warm_sand: '#f59e0b',
    lavender_field: '#8b5cf6',
    cozy_mint: '#10b981',
    sakura_dream: '#f43f5e',
    custom_theme: '#14b8a6'
  };

  const currentThemeId = app.theme || 'classic_light';
  const themeColor = themeHexMap[currentThemeId] || '#6366f1';

  // Countdown timer & Breathing state machine
  useEffect(() => {
    let timer: any = null;
    let breathTimer: any = null;

    if (active && timeLeft > 0) {
      // General timer countdown
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setActive(false);
            setFinished(true);
            playSound(523.25, 'sine', 1.5); // End audio chime (C5)
            // Stille-Checkoff logic or success feedback
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Breathing rhythm timer
      breathTimer = setInterval(() => {
        setBreathCounter((prev) => {
          if (prev <= 1) {
            // Transition phase
            setBreathPhase((current) => {
              if (current === 'inhale') {
                playSound(440, 'triangle', 0.55); // High soft state change
                return 'hold';
              } else if (current === 'hold') {
                playSound(330, 'triangle', 0.55); // Low soft state change
                return 'exhale';
              } else {
                playSound(349.23, 'sine', 0.45); // Rising start
                return 'inhale';
              }
            });
            return 4; // Reset to 4 seconds
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setActive(false);
    }

    return () => {
      if (timer) clearInterval(timer);
      if (breathTimer) clearInterval(breathTimer);
    };
  }, [active, timeLeft, breathPhase]);

  const handleStart = () => {
    playSound(349.23, 'sine', 0.45); // Gentle start sound (F4)
    setTimeLeft(60);
    setBreathPhase('inhale');
    setBreathCounter(4);
    setFinished(false);
    setActive(true);
  };

  const handleStop = () => {
    setActive(false);
  };

  // Dynamic label for breathing phase
  const getPhaseLabel = () => {
    if (breathPhase === 'inhale') return 'Tief Einatmen... 🌤️';
    if (breathPhase === 'hold') return 'Atem Halten... 🧘';
    return 'Langsam Ausatmen... 🍃';
  };

  // Circle scaling class or inline styling
  const getCircleScale = () => {
    if (!active) return 1.0;
    if (breathPhase === 'inhale') {
      // Expanding
      return 1.35 + (4 - breathCounter) * 0.12; 
    }
    if (breathPhase === 'hold') {
      // Maximized and glowing
      return 1.83;
    }
    // Contracting
    return 1.83 - (4 - breathCounter) * 0.18;
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] relative  flex flex-col justify-between shadow-2xl h-full border border-slate-800">
      {/* Background radial soft light gradient matching theme color */}
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 blur-3xl rounded-full"
        style={{
          background: `radial-gradient(circle, ${themeColor} 0%, transparent 70%)`,
          transform: active && breathPhase === 'inhale' ? 'scale(1.2)' : 'scale(1)'
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-emerald-400">
            <Wind size={20} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-[1rem] leading-normal font-black text-white">60-Sekunden Atem-Pause</h3>
            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Konzentration & Puls-Senker</p>
          </div>
        </div>
        
        <button 
          onClick={() => setMuted(!muted)} 
          className="text-slate-400 hover:text-white p-2 transition-colors"
          title={muted ? 'Ton einschalten' : 'Stumm schalten'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>

      {/* Main visualization area */}
      <div className="flex-1 flex flex-col items-center justify-center py-6 z-10 min-h-[220px]">
        {finished ? (
          <div className="text-center space-y-4 animate-scale-up">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto shadow-emerald-500/10 shadow-lg">
              <Check className="text-emerald-400" size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-[1.125rem] leading-normal font-black text-emerald-300">Pause Beendet!</h4>
              <p className="text-[0.75rem] leading-tight text-slate-300 font-medium max-w-[240px] mx-auto leading-relaxed">
                Dein Kopf ist wieder frei, der Puls gesenkt. Weiter geht's mit neuer Energie! ✨
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-8">
            {/* Pulsating interactive circle */}
            <div className="relative flex items-center justify-center w-28 h-28">
              {/* Outer soft glowing halo */}
              <div 
                className="absolute inset-0 rounded-full opacity-30 transition-all duration-[1000ms] ease-in-out"
                style={{
                  backgroundColor: themeColor,
                  transform: `scale(${getCircleScale() * 1.15})`,
                  filter: 'blur(10px)',
                }}
              />
              
              {/* Inner crisp circle */}
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-white/90 drop-shadow-xl font-bold font-mono transition-transform duration-[1000ms] ease-in-out"
                style={{
                  backgroundColor: themeColor,
                  transform: `scale(${getCircleScale()})`,
                  boxShadow: `0 10px 25px -5px ${themeColor}60`
                }}
              />
              
              {/* Center icon or label */}
              <div className="absolute font-sans font-black text-[0.625rem] pointer-events-none uppercase tracking-wider text-white">
                {active ? `${breathCounter}s` : '🧘'}
              </div>
            </div>

            {/* Instruction labels */}
            <div className="text-center space-y-1">
              <p className="text-[0.875rem] leading-snug font-black transition-all duration-500 text-white min-h-[20px]">
                {active ? getPhaseLabel() : 'Sofortige Ruhe finden'}
              </p>
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {active ? `Noch ${timeLeft}s im Timer` : 'Atem-Takt: 4s ein • 4s halten • 4s aus'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Buttons foot */}
      <div className="flex justify-center z-10 w-full pt-2">
        {active ? (
          <button 
            onClick={handleStop}
            className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-2xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Square size={12} fill="currentColor" /> Stoppen
          </button>
        ) : (
          <button 
            onClick={handleStart}
            className="px-6 py-2.5 bg-white text-slate-950 hover:bg-slate-50 hover:scale-105 active:scale-95 rounded-2xl text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-1.5 cursor-pointer"
          >
            <Play size={12} fill="currentColor" /> Atem-Pause starten
          </button>
        )}
      </div>
    </div>
  );
}
