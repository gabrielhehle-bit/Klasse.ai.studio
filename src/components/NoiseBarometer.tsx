import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, Wind, Thermometer, TrafficCone, AlertTriangle, Flower2, Droplets, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface NoiseBarometerProps {
  onClose?: () => void;
}

export const NoiseBarometer: React.FC<NoiseBarometerProps> = () => {
  const { app } = useApp();
  const theme = app?.settings?.theme || 'light';
  const isDark = theme === 'dark' || theme === 'terra';
  
  const [isActive, setIsActive] = useState(false);
  const isActiveRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<'thermometer' | 'traffic' | 'flower' | 'aquarium'>('traffic');
  const [threshold, setThreshold] = useState(60);
  const [isAlarm, setIsAlarm] = useState(false);
  const [growth, setGrowth] = useState(0); // Gamification progress 0-100
  const growthRef = useRef(0);
  const [elapsedTime, setElapsedTime] = useState({ green: 0, yellow: 0, red: 0 });

  useEffect(() => {
    if (!isActive) return;
    
    const interval = setInterval(() => {
      let currentState: 'green' | 'yellow' | 'red' = 'green';
      if (isAlarm) {
        currentState = 'red';
      } else if (volume > threshold * 0.7) {
        currentState = 'yellow';
      } else {
        currentState = 'green';
      }
      
      setElapsedTime(prev => ({
        ...prev,
        [currentState]: prev[currentState] + 0.1
      }));
    }, 100);
    
    return () => clearInterval(interval);
  }, [isActive, isAlarm, volume, threshold]);

  const totalSeconds = elapsedTime.green + elapsedTime.yellow + elapsedTime.red;
  const greenPercent = totalSeconds > 0 ? Math.round((elapsedTime.green / totalSeconds) * 100) : 0;
  const yellowPercent = totalSeconds > 0 ? Math.round((elapsedTime.yellow / totalSeconds) * 100) : 0;
  const redPercent = totalSeconds > 0 ? Math.max(0, 100 - greenPercent - yellowPercent) : 0;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const alarmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const alarmResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastVolumeRef = useRef(0);

  const startMic = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Mikrofon-Zugriff im Browser nicht möglich (eventuell blockiert oder kein HTTPS). Bitte in neuem Tab öffnen.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.5;
      analyzerRef.current = analyzer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1; // Default gain
      gainNodeRef.current = gainNode;
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(gainNode);
      gainNode.connect(analyzer);
      
      setIsActive(true);
      isActiveRef.current = true;
      updateVolume();
    } catch (err) {
      console.error('Microphone access denied:', err);
      setError('Mikrofon blockiert oder nicht gefunden. Bitte Zugriff erlauben.');
    }
  };

  // Sync sensitivity slider with gain node
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      // Sensitivität: 10% = leise (braucht viel lärm, gain ~0.5), 90% = laut (braucht wenig lärm, gain ~4.0)
      const gainValue = Math.max(0.1, (threshold / 50) + 0.2); 
      gainNodeRef.current.gain.setTargetAtTime(gainValue, audioContextRef.current.currentTime, 0.1);
    }
  }, [threshold]);

  const stopMic = () => {
    setIsActive(false);
    isActiveRef.current = false;
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setVolume(0);
    lastVolumeRef.current = 0;
    
    // Clear global share for class pet
    (window as any).__lastNoiseVolume = 0;
    (window as any).__isNoiseAlarm = false;

    setIsAlarm(false);
    if (alarmTimerRef.current) clearTimeout(alarmTimerRef.current);
    if (alarmResetTimerRef.current) clearTimeout(alarmResetTimerRef.current);
  };

  const updateVolume = () => {
    if (!analyzerRef.current || !isActiveRef.current) return;
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    // Calculate max energy instead of average, makes it much more responsive to speech
    let max = 0;
    for (let i = 0; i < dataArray.length; i++) {
       if (dataArray[i] > max) max = dataArray[i];
    }
    
    // Map max (0-255) to 0-100
    const targetVolume = Math.min(100, (max / 255) * 100);
    
    // Smoother EMA
    const smoothing = 0.25;
    const smoothedVolume = lastVolumeRef.current + (targetVolume - lastVolumeRef.current) * smoothing;
    
    lastVolumeRef.current = smoothedVolume;
    setVolume(smoothedVolume);

    // Share state globally for the interactive Class Pet
    (window as any).__lastNoiseVolume = smoothedVolume;
    (window as any).__noiseThreshold = threshold;
    (window as any).__isNoiseAlarm = smoothedVolume > threshold;

    // Gamification Logic (Flower/Aquarium)
    if (smoothedVolume > (threshold + 5)) {
      // Too loud - penalty
      growthRef.current = Math.max(0, growthRef.current - 0.4); // decrease fast
    } else if (smoothedVolume < (threshold - 10)) {
      // Quiet - reward
      growthRef.current = growthRef.current + 0.1; // increase slowly, NO CAP
    }
    setGrowth(growthRef.current);
    
    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  // Alarm Logic with cool-down delay
  useEffect(() => {
    if (isActive && volume > threshold) {
      if (!alarmTimerRef.current) {
        alarmTimerRef.current = setTimeout(() => {
          setIsAlarm(true);
        }, 1000); // 1.0s to detect persistent noise
      }
      // If volume is high, clear any reset timeout that was running
      if (alarmResetTimerRef.current) {
        clearTimeout(alarmResetTimerRef.current);
        alarmResetTimerRef.current = null;
      }
    } else {
      // Clear trigger timer if volume goes low before alarm activates
      if (alarmTimerRef.current) {
        clearTimeout(alarmTimerRef.current);
        alarmTimerRef.current = null;
      }
      
      // If currently in alarm state, use a cool-down timer to keep the red light glowing a bit longer
      if (isAlarm && !alarmResetTimerRef.current) {
        alarmResetTimerRef.current = setTimeout(() => {
          setIsAlarm(false);
          alarmResetTimerRef.current = null;
        }, 2500); // 2.5 seconds stable red light cooldown
      }
    }
  }, [volume, threshold, isActive, isAlarm]);

  useEffect(() => {
    return () => stopMic();
  }, []);

  const getAquariumItems = () => {
    const items = [];
    // Start with 5 items, add 1 every 2 growth points - more rapid growth!
    const count = 5 + Math.floor(growth / 2); 
    const types = ['🐟', '🐠', '🐡', '🦑', '🐙', '🦀', '🐬', '🐋', '🦈', '🐚', '🌿', '🦐', '🐢', '🦢', '⛵', '🌊', '🐳', '🧜‍♀️', '🔱', '🏝️', '🏴‍☠️', '⚓'];
    
    // Increased cap to 200, so it always feels like something new is coming
    for (let i = 0; i < Math.min(200, count); i++) {
      const type = types[i % types.length];
      const seed = i * 133.7;
      const x = (Math.sin(seed) * 45) + 50; // 5-95%
      const y = (Math.cos(seed) * 40) + 50; // 10-90%
      const duration = 10 + (Math.sin(seed * 2) * 5);
      const delay = (i * 0.5) % 5;
      
      items.push(
        <motion.div 
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
            x: [0, (Math.sin(seed) * 20), -(Math.cos(seed) * 20), 0],
            y: [0, -(Math.cos(seed) * 10), (Math.sin(seed) * 10), 0]
          }}
          transition={{ 
            opacity: { duration: 1 },
            scale: { duration: 1 },
            x: { repeat: Infinity, duration, ease: 'linear', delay },
            y: { repeat: Infinity, duration: duration * 0.8, ease: 'linear', delay }
          }}
          className="absolute text-[1.25rem] leading-normal select-none"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          {type}
        </motion.div>
      );
    }
    return items;
  };

  const textColor = 'text-text-primary';
  const subTextColor = 'text-text-secondary';
  const controlBg = 'bg-surface2/50';

  return (
    <div className="relative flex flex-col items-center gap-4 p-4 w-full h-full min-h-[250px] text-text-primary">
      {/* Alarm Border */}
      <AnimatePresence>
        {isAlarm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none border-[12px] border-rose-500/50 z-[1001] animate-pulse"
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between w-full mb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={isActive ? stopMic : startMic}
            className={`p-3 rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-lg ${isActive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
          >
            {isActive ? <MicOff size={18} /> : <Mic size={18} />}
            <span className="text-[0.625rem] font-black uppercase tracking-widest">{isActive ? 'Mic Aus' : 'Mic Ein'}</span>
          </button>

          {(elapsedTime.green > 0 || elapsedTime.yellow > 0 || elapsedTime.red > 0) && (
            <button
              onClick={() => setElapsedTime({ green: 0, yellow: 0, red: 0 })}
              className="p-3 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 transition-all active:scale-95 shadow-md border border-slate-200 flex items-center gap-1.5"
              title="Zeitstatistik zurücksetzen"
            >
              <RotateCcw size={14} />
              <span className="text-[0.5625rem] font-black uppercase tracking-widest">Reset</span>
            </button>
          )}
        </div>

        <div className={`flex gap-1.5 ${controlBg} p-1 rounded-xl`}>
          <button 
            onClick={() => setMode('thermometer')}
            className={`p-2 rounded-lg transition-all ${mode === 'thermometer' ? 'bg-surface shadow-md text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Thermometer"
          >
            <Thermometer size={16} />
          </button>
          <button 
            onClick={() => setMode('traffic')}
            className={`p-2 rounded-lg transition-all ${mode === 'traffic' ? 'bg-surface shadow-md text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Ampel"
          >
            <TrafficCone size={16} />
          </button>
          <button 
            onClick={() => setMode('flower')}
            className={`p-2 rounded-lg transition-all ${mode === 'flower' ? 'bg-surface shadow-md text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Blume (Gamification)"
          >
            <Flower2 size={16} />
          </button>
          <button 
            onClick={() => setMode('aquarium')}
            className={`p-2 rounded-lg transition-all ${mode === 'aquarium' ? 'bg-surface shadow-md text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
            title="Aquarium (Gamification)"
          >
            <Droplets size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full flex items-center justify-center relative">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-rose-500/10 backdrop-blur-sm rounded-3xl border border-rose-500/20 text-rose-500 p-4 text-center"
            >
              <AlertTriangle size={32} className="mb-2" />
              <p className="font-bold">{error}</p>
              <p className="text-[0.625rem] opacity-70">Bitte Zugriff erlauben</p>
            </motion.div>
          )}
        </AnimatePresence>

        {mode === 'thermometer' ? (
          <div className={`h-full w-12 ${controlBg} rounded-full border border-border p-1 relative  flex flex-col justify-end`}>
            <motion.div 
              className="w-full rounded-full transition-all duration-75"
              style={{
                height: `${isActive ? volume : 0}%`,
                background: volume > 75 ? '#ef4444' : volume > 40 ? '#f59e0b' : '#10b981',
                boxShadow: isActive ? `0 0 20px ${volume > 75 ? '#ef4444' : volume > 40 ? '#f59e0b' : '#10b981'}80` : 'none'
              }}
              animate={{ height: `${isActive ? volume : 0}%` }}
            />
          </div>
        ) : mode === 'flower' ? (
          <div className="flex flex-col items-center justify-end w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-100/20 to-transparent rounded-3xl" />
            <div className="relative z-10 flex flex-col items-center justify-end  pb-4 h-full w-full">
               <motion.div
                 className="flex flex-col items-center justify-end"
                 animate={{ height: `${Math.min(100, Math.max(20, growth))}%` }}
                 style={{ minHeight: '60px' }}
               >
                 <Flower2 size={64 + Math.min(30, growth * 0.5)} className="text-emerald-500" strokeWidth={1.5} />
                 <div className="w-2 bg-emerald-500 rounded-full h-full flex-1" />
               </motion.div>
               <div className="w-32 h-6 bg-emerald-800 rounded-full mt-[-8px] z-20 shrink-0" />
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-100/50 rounded-lg text-[0.625rem] text-emerald-900 font-black tabular-nums">{Math.round(growth)}%</div>
          </div>
        ) : mode === 'aquarium' ? (
          <div className="w-full h-full rounded-3xl border-4 border-slate-300 relative  bg-slate-50">
             <motion.div 
               className="absolute bottom-0 left-0 right-0 bg-blue-400/80"
               animate={{ height: `${Math.min(100, (growth % 100) + 20)}%` }}
               transition={{ type: 'spring', bounce: 0.1 }}
             >
                {/* Water surface animation */}
                <div className="absolute top-0 left-0 right-0 h-4 bg-blue-300/50" />
                {getAquariumItems()}
             </motion.div>
             <div className="absolute top-2 right-2 px-2 py-1 bg-white/50 rounded-lg text-[0.625rem] font-black tabular-nums">Punkte: {Math.round(growth)}</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-3 rounded-[2rem] bg-slate-900/90 border border-white/10 shadow-xl relative ">
             {/* Glass reflection effect */}
             <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
             
            {/* RED */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div 
                animate={isActive && isAlarm ? { scale: [1, 1.18, 1], opacity: [1, 0.8, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.3 }}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-300 relative flex items-center justify-center ${isActive && isAlarm ? 'bg-rose-500 border-rose-300 shadow-[0_0_30px_rgba(244,63,94,1)]' : 'bg-rose-950/20 border-white/5'}`}
              >
                {totalSeconds > 0 && (
                  <span className={`font-mono text-[0.5625rem] font-black select-none ${isActive && isAlarm ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-rose-400/80'}`}>
                    {redPercent}%
                  </span>
                )}
              </motion.div>
              <span className={`text-[0.5rem] font-black tracking-tighter ${isActive && isAlarm ? 'text-rose-400' : 'text-zinc-700'}`}>ZU LAUT! {totalSeconds > 0 && `(${redPercent}%)`}</span>
            </div>

            {/* YELLOW */}
            <div className="flex flex-col items-center gap-1.5">
              <motion.div 
                animate={isActive && !isAlarm && volume > threshold * 0.7 ? { opacity: [1, 0.6, 1] } : {}}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className={`w-10 h-10 rounded-full border-2 transition-all duration-300 relative flex items-center justify-center ${isActive && !isAlarm && volume > threshold * 0.7 ? 'bg-amber-500 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.7)]' : 'bg-amber-950/20 border-white/5'}`} 
              >
                {totalSeconds > 0 && (
                  <span className={`font-mono text-[0.5625rem] font-black select-none ${isActive && !isAlarm && volume > threshold * 0.7 ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-amber-400/80'}`}>
                    {yellowPercent}%
                  </span>
                )}
              </motion.div>
              <span className={`text-[0.5rem] font-black tracking-tighter ${isActive && !isAlarm && volume > threshold * 0.7 ? 'text-amber-400' : 'text-zinc-700'}`}>UNRUHIG {totalSeconds > 0 && `(${yellowPercent}%)`}</span>
            </div>

            {/* GREEN */}
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full border-2 transition-all duration-300 relative flex items-center justify-center ${isActive && !isAlarm && volume <= threshold * 0.7 ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-emerald-950/20 border-white/5'}`} >
                {totalSeconds > 0 && (
                  <span className={`font-mono text-[0.5625rem] font-black select-none ${isActive && !isAlarm && volume <= threshold * 0.7 ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]' : 'text-emerald-400/80'}`}>
                    {greenPercent}%
                  </span>
                )}
              </div>
              <span className={`text-[0.5rem] font-black tracking-tighter ${isActive && !isAlarm && volume <= threshold * 0.7 ? 'text-emerald-400' : 'text-zinc-700'}`}>LEISE {totalSeconds > 0 && `(${greenPercent}%)`}</span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full space-y-3 mt-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-[0.625rem] font-black uppercase text-text-secondary tracking-widest">Empfindlichkeit</span>
          <div className="flex items-center gap-2">
            <div className="text-[0.625rem] font-black tabular-nums text-text-primary">
              {threshold}%
            </div>
          </div>
        </div>
        <div className="relative h-6 flex items-center group/slider">
           <div className="absolute inset-0 flex items-center pointer-events-none px-0.5">
             <div className="w-full h-1 bg-black/5 rounded-full ">
               <motion.div 
                 className="h-full bg-emerald-500/20"
                 animate={{ width: `${volume}%` }}
               />
             </div>
           </div>
           <input 
            type="range" 
            min="10" 
            max="90" 
            value={threshold} 
            onChange={(e) => setThreshold(parseInt(e.target.value))}
            className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-amber-500 bg-surface3 hover:bg-opacity-80 transition-colors relative z-10"
          />
        </div>
      </div>
    </div>
  );
};


