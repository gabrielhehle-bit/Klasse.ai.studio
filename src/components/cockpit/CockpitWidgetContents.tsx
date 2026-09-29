import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { validClassroomQuiz, validClassroomRiddle } from '../../lib/classroomQuizRiddle';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Search, Sparkles, AlertTriangle, Plus, Minus, 
  RotateCcw, Sliders, Play, Pause, Eye, EyeOff, Check,
  ChevronRight, ChevronLeft, ChevronDown, Volume2, Image as ImageIcon,
  QrCode, Clipboard, Copy, CheckCircle, Trash2, Upload,
  Trophy, Waves, CloudSun, GraduationCap, Type, GlassWater,
  Link, Smile, Palette, Circle, Lock, Unlock, VolumeX,
  Star, HelpCircle, MapPin, Compass, Gift, ShieldAlert,
  Volume1, PenTool, Square, AlignJustify, Grid3X3, Home,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { askAI, generatePetSpeech, generateWidgetTasks } from '../../services/aiService';
import { useApp } from '../../context/AppContext';
import { classifyWidgetAiError, getWidgetAiStatusMessage, type WidgetAiStatus } from '../../lib/widgetAiState';
import { hasWidgetLifecycleState, readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../lib/widgetLifecycleState';
import { useAccessibleAction } from '../../lib/accessibleAction';
import { getKW } from '../../lib/utils';
import {
  SORTING_RANGE_OPTIONS,
  describeSortingMistake,
  formatSortingNumber,
  generateSortingNumbers,
  getSortingTarget,
  normalizeSortingWidgetSettings,
  type SortingCount,
  type SortingDirection,
  type SortingRangeKey,
  type SortingWidgetSettings,
} from '../../lib/sortingWidgetModel';
import {
  DAILY_QUOTE_THEME_LABELS,
  getActiveDailyQuote,
  getDailyQuotesForTheme,
  getNextDailyQuoteId,
  normalizeDailyQuotesWidgetSettings,
  parseAiDailyQuote,
  type DailyQuoteTheme,
  type DailyQuotesWidgetSettings,
} from '../../lib/dailyQuotesWidgetModel';
import {
  DICTIONARY_CATEGORY_LABELS,
  createDictionaryRound,
  filterDictionaryCards,
  nextDictionaryIndex,
  normalizeDictionaryWidgetSettings,
  type DictionaryCategory,
  type DictionaryMode,
  type DictionaryRound,
  type DictionaryWidgetSettings,
} from '../../lib/dictionaryWidgetModel';
import {
  PIANO_KEYS,
  getPianoKeyPrimaryLabel,
  getPianoKeySecondaryLabel,
  normalizePianoWidgetSettings,
  type PianoLabelMode,
  type PianoWidgetSettings,
} from '../../lib/pianoWidgetModel';
import {
  BODY_PARTS,
  createBodypartsQuizRound,
  getBodyPartById,
  normalizeBodypartsWidgetSettings,
  type BodypartsMode,
  type BodypartsQuizRound,
  type BodypartsWidgetSettings,
} from '../../lib/bodypartsWidgetModel';
import {
  createCompassPracticeRound,
  getCompassDirection,
  getCompassDirections,
  normalizeCompassWidgetSettings,
  stepCompassAngle,
  type CompassDirectionSet,
  type CompassMode,
  type CompassPracticeRound,
  type CompassWidgetSettings,
} from '../../lib/compassWidgetModel';
import {
  createCalendarPracticeRound,
  getCalendarIndexForDate,
  getCalendarItems,
  normalizeWeekdaysWidgetSettings,
  wrapCalendarIndex,
  type CalendarPracticeRound,
  type WeekdaysWidgetMode,
  type WeekdaysWidgetSettings,
  type WeekdaysWidgetView,
} from '../../lib/weekdaysWidgetModel';
import { ClassPetCanvas, ClassPetCanvasRef } from '../ClassPetCanvas';
import { PET_BREEDS } from '../ClassPetWidget';
import { WheelWidget, WheelWidgetProps } from './widgets/WheelWidget';
import { GroupsWidget } from './widgets/GroupsWidget';
import { TodoWidget } from './widgets/TodoWidget';
import { DiensteWidget, DiensteWidgetProps } from './widgets/DiensteWidget';
import { LinksWidget, LinksWidgetProps } from './widgets/LinksWidget';
import { QRCodeWidget, QRCodeWidgetProps } from './widgets/QRCodeWidget';
import { ImageWidget, ImageWidgetProps } from './widgets/ImageWidget';
import { DrawingWidget, DrawingWidgetProps } from './widgets/DrawingWidget';
import { StopwatchWidget, StopwatchWidgetProps } from './widgets/StopwatchWidget';
import { ClassRewardWidget, ClassRewardWidgetProps } from './widgets/ClassRewardWidget';
import { ScoreboardWidget, ScoreboardWidgetProps } from './widgets/ScoreboardWidget';
import { CalmSoundsWidget, CalmSoundsWidgetProps } from './widgets/CalmSoundsWidget';
import { BreathingWidget, BreathingWidgetProps } from './widgets/BreathingWidget';
import { FractionVisualizer } from './widgets/FractionVisualizer';
import { CalculatorWidget } from './widgets/CalculatorWidget';
import LernwoerterStudioWidget from './widgets/LernwoerterStudioWidget';
import WortSatzWerkstattWidget from './widgets/WortSatzWerkstattWidget';
export { ClassRewardWidget, ScoreboardWidget, CalmSoundsWidget, BreathingWidget, FractionVisualizer, CalculatorWidget, WortSatzWerkstattWidget };
export type { ClassRewardWidgetProps, ScoreboardWidgetProps, CalmSoundsWidgetProps, BreathingWidgetProps };

export const ClassRewardWidgetContent: React.FC<ClassRewardWidgetProps> = (props) => {
  const { app, setApp } = useApp();
  return <ClassRewardWidget app={app} setApp={setApp} {...props} />;
};

// ==========================================
// WIDGET 6: LÄRM-MESSER (LärmWidgetContent)
// ==========================================
interface LaermWidgetProps {
  widget: any;
  onUpdate: (updates: any) => void;
  currentIsLight: boolean;
  showSettings: boolean;
  onCloseSettings: () => void;
}

export const LärmWidgetContent: React.FC<LaermWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight,
  showSettings,
  onCloseSettings
}) => {
  const [isActive, setIsActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Classroom Live Quiet Stream analysis states
  const [warnCount, setWarnCount] = useState(0);
  const [quietStreak, setQuietStreak] = useState(0);
  const [maxQuietStreak, setMaxQuietStreak] = useState(0);
  
  // Custom simulation fallbacks for blocked frames or simple testing
  const [isSimulated, setIsSimulated] = useState(false);
  const [simulatedFluctuation, setSimulatedFluctuation] = useState(true);
  
  // Settings sync with widget local configuration or fallback state
  const mode = widget.settings?.mode || 'traffic'; // thermometer | traffic | flower | aquarium
  const threshold = widget.settings?.threshold ?? 60;
  const sensitivity = widget.settings?.sensitivity ?? 50;

  const isActiveRef = useRef(false);
  const lastVolumeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [growth, setGrowth] = useState(0);
  const growthRef = useRef(0);

  // Dynamic aquarium fish state
  const [fishList, setFishList] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    y: number;
    speedX: number;
    speedY: number;
    size: number;
    direction: 1 | -1;
  }>>([]);
  const [newFishSpawned, setNewFishSpawned] = useState<string | null>(null);
  const [fishFled, setFishFled] = useState<string | null>(null);
  const [loudTicks, setLoudTicks] = useState(0);
  const fishListRef = useRef<any[]>([]);

  useEffect(() => {
    fishListRef.current = fishList;
  }, [fishList]);

  // Food list state and ref for the fish to trace and eat
  const [foodList, setFoodList] = useState<Array<{
    id: string;
    x: number;
    y: number;
    speedY: number;
  }>>([]);
  const foodListRef = useRef<any[]>([]);

  useEffect(() => {
    foodListRef.current = foodList;
  }, [foodList]);

  // Silent Disco sound synthesizer state and refs
  const [discoSoundOn, setDiscoSoundOn] = useState(true);
  const discoAudioCtxRef = useRef<AudioContext | null>(null);
  const discoIntervalRef = useRef<number | null>(null);
  const discoStepRef = useRef(0);

  // Initialize aquarium fish when the user selects the mode
  useEffect(() => {
    if (mode === 'aquarium' && fishList.length === 0) {
      const initialPool = ['🐟', '🐠', '🐡'];
      const initialFish = initialPool.map((emoji, idx) => ({
        id: `fish-init-${idx}`,
        emoji,
        x: 15 + idx * 25 + Math.random() * 10,
        y: 45 + Math.random() * 30,
        speedX: (0.3 + Math.random() * 0.4) * (idx % 2 === 0 ? 1 : -1),
        speedY: (Math.random() * 0.2 - 0.1),
        size: 0.9 + Math.random() * 0.3,
        direction: (idx % 2 === 0 ? 1 : -1) as (1 | -1)
      }));
      setFishList(initialFish);
    }
  }, [mode, fishList.length]);

  // Food sinking physics simulation loop
  useEffect(() => {
    if (mode !== 'aquarium' || !isActive) return;
    const interval = setInterval(() => {
      setFoodList(prevFood => {
        if (prevFood.length === 0) return prevFood;
        return prevFood
          .map(f => ({ ...f, y: f.y + 0.8 }))
          .filter(f => f.y < 88); // food sinks to bottom sand level
      });
    }, 60);
    return () => clearInterval(interval);
  }, [mode, isActive]);

  // Aquarium fish movement and food-chasing physics simulation
  useEffect(() => {
    if (mode !== 'aquarium' || !isActive) return;
    const interval = setInterval(() => {
      setFishList(prev => {
        const currentFood = foodListRef.current;
        let foodEatenIds: string[] = [];

        const updatedFish = prev.map(fish => {
          const tooLoud = volume > threshold;
          const speedMultiplier = tooLoud ? 2.5 : 1;
          let nextX = fish.x;
          let nextY = fish.y;
          let nextDir = fish.direction;
          let nextSpeedX = fish.speedX;
          let nextSpeedY = fish.speedY;
          let nextSize = fish.size;

          // Find closest food item
          let targetFood = null;
          let minDist = 999;
          
          currentFood.forEach(f => {
            if (foodEatenIds.includes(f.id)) return;
            const dx = f.x - fish.x;
            const dy = f.y - fish.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
              targetFood = f;
            }
          });

          // Chase food if within 40% of aquarium
          if (targetFood && minDist < 40) {
            const tf = targetFood as any;
            const dirX = tf.x - fish.x;
            const dirY = tf.y - fish.y;
            
            // Steer towards food particle
            nextSpeedX = fish.speedX + (dirX > 0 ? 0.08 : -0.08);
            nextSpeedY = fish.speedY + (dirY > 0 ? 0.06 : -0.06);
            
            // Speed limits
            const maxSpeed = tooLoud ? 1.6 : 0.8;
            nextSpeedX = Math.max(-maxSpeed, Math.min(maxSpeed, nextSpeedX));
            nextSpeedY = Math.max(-0.4, Math.min(0.4, nextSpeedY));
            nextDir = nextSpeedX > 0 ? 1 : -1;

            nextX = fish.x + nextSpeedX * speedMultiplier;
            nextY = fish.y + nextSpeedY * speedMultiplier;

            // Eat food if very close
            if (minDist < 6.0) {
              foodEatenIds.push(tf.id);
              nextSize = Math.min(1.8, fish.size + 0.12); // grow slightly when eating!
              
              // 35% chance to lay an egg and breed a cute tiny baby fish!
              if (Math.random() < 0.35 && prev.length < 45) {
                setTimeout(() => {
                  setFishList(currentPool => {
                    const babyPool = ['🐟', '🐠', '🐡', '🦐'];
                    const babyEmoji = babyPool[Math.floor(Math.random() * babyPool.length)];
                    const babyFish = {
                      id: `baby-${Date.now()}-${Math.random()}`,
                      emoji: babyEmoji,
                      x: fish.x + (Math.random() * 8 - 4),
                      y: fish.y + (Math.random() * 8 - 4),
                      speedX: (0.2 + Math.random() * 0.25) * (Math.random() > 0.5 ? 1 : -1),
                      speedY: (Math.random() * 0.15 - 0.075),
                      size: 0.45, // very tiny baby!
                      direction: (Math.random() > 0.5 ? 1 : -1) as (1 | -1)
                    };
                    return [...currentPool, babyFish];
                  });
                  setNewFishSpawned("👶 Baby-" + (fish.emoji));
                  setTimeout(() => setNewFishSpawned(null), 1500);
                }, 10);
              }
            }
          } else {
            // Normal swimming physics
            nextX = fish.x + fish.speedX * speedMultiplier;
            nextY = fish.y + fish.speedY * speedMultiplier;

            // Bounce horizontally
            if (nextX < 4) {
              nextX = 4;
              nextSpeedX = Math.abs(fish.speedX);
              nextDir = 1;
            } else if (nextX > 92) {
              nextX = 92;
              nextSpeedX = -Math.abs(fish.speedX);
              nextDir = -1;
            }

            // Bounce vertically (stay in water)
            const waterTop = Math.max(10, 100 - Math.max(20, growth));
            if (nextY < waterTop + 5) {
              nextY = waterTop + 5;
              nextSpeedY = Math.abs(fish.speedY);
            } else if (nextY > 86) {
              nextY = 86;
              nextSpeedY = -Math.abs(fish.speedY);
            }

            // Natural vertical drifts
            if (Math.random() < 0.04) {
              nextSpeedY = (Math.random() * 0.2 - 0.1);
            }
          }

          return {
            ...fish,
            x: nextX,
            y: nextY,
            speedX: nextSpeedX,
            speedY: nextSpeedY,
            size: nextSize,
            direction: nextDir as (1 | -1)
          };
        });

        if (foodEatenIds.length > 0) {
          setFoodList(fList => fList.filter(f => !foodEatenIds.includes(f.id)));
        }

        return updatedFish;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [mode, isActive, volume, threshold, growth]);

  // Growth / Gamification progress updater
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      if (volume > threshold) {
        growthRef.current = Math.max(0, growthRef.current - 0.5);
        // Custom event for global visual alert
        const event = new CustomEvent("cockpit-noise-alert", {
          detail: { volume, threshold },
        });
        window.dispatchEvent(event);
      } else if (volume < threshold - 15) {
        growthRef.current = Math.min(100, growthRef.current + 0.15);
      }
      setGrowth(growthRef.current);
    }, 150);
    return () => clearInterval(interval);
  }, [isActive, volume, threshold]);

  // Dedicated 1-second metric analyzer tick (handles quiet streak fish spawn & loud streak fish fleeing)
  useEffect(() => {
    if (!isActive) {
      setQuietStreak(0);
      setLoudTicks(0);
      return;
    }
    const interval = setInterval(() => {
      // Analyze the volume at the end of the second
      const vol = lastVolumeRef.current;
      if (vol > threshold) {
        setWarnCount((prev) => prev + 1);
        setQuietStreak(0);

        // In aquarium mode, if it remains loud for 4 consecutive seconds, a fish flees (with a 60% chance to be more forgiving)!
        if (mode === 'aquarium') {
          setLoudTicks((prevTicks) => {
            const nextTicks = prevTicks + 1;
            if (nextTicks >= 4) {
              if (Math.random() < 0.60) {
                setFishList((prevFish) => {
                  if (prevFish.length > 1) {
                    const idx = Math.floor(Math.random() * prevFish.length);
                    const fledEmoji = prevFish[idx].emoji;
                    setFishFled(fledEmoji);
                    setTimeout(() => setFishFled(null), 2500);
                    return prevFish.filter((_, i) => i !== idx);
                  }
                  return prevFish;
                });
              }
              return 0; // Reset loud count
            }
            return nextTicks;
          });
        }
      } else {
        setLoudTicks(0);
        setQuietStreak((prev) => {
          const next = prev + 1;
          setMaxQuietStreak((m) => Math.max(m, next));

          // Every 4 seconds of quiet streak, we spawn a new fish in aquarium mode!
          if (mode === 'aquarium' && next > 0 && next % 4 === 0) {
            // Expanded emoji pools based on fish list count for exciting progression
            let emoji = '🐟';
            const currentLen = fishListRef.current.length;

            if (currentLen < 5) {
              const basicPool = ['🐟', '🐠', '🐡', '🦐'];
              emoji = basicPool[Math.floor(Math.random() * basicPool.length)];
            } else if (currentLen < 12) {
              const midPool = ['🐙', '🦑', '🪼', '🦀', '🐚', '🐚'];
              emoji = midPool[Math.floor(Math.random() * midPool.length)];
            } else if (currentLen < 22) {
              const rarePool = ['🐢', '🐬', '🦈', '🐳', '🐋', '🦦'];
              emoji = rarePool[Math.floor(Math.random() * rarePool.length)];
            } else {
              // Legendary / Secret creatures!
              const legendPool = ['🧜‍♀️', '🧜‍♂️', '🦭', '🐧', '👾', '👑', '💎', '🛸'];
              emoji = legendPool[Math.floor(Math.random() * legendPool.length)];
            }

            const newFish = {
              id: `fish-${Date.now()}-${Math.random()}`,
              emoji,
              x: 10 + Math.random() * 80,
              y: 40 + Math.random() * 40,
              speedX: (0.3 + Math.random() * 0.4) * (Math.random() > 0.5 ? 1 : -1),
              speedY: (Math.random() * 0.2 - 0.1),
              size: 0.85 + Math.random() * 0.45,
              direction: (Math.random() > 0.5 ? 1 : -1) as (1 | -1)
            };

            setFishList(prevFish => {
              if (prevFish.length < 50) { // Limit to 50 creatures
                return [...prevFish, newFish];
              }
              return prevFish;
            });
            setNewFishSpawned(emoji);
            setTimeout(() => setNewFishSpawned(null), 2000);
          }
          return next;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive, threshold, mode]);

  // Handle auto-fluctuating simulation noise wave
  useEffect(() => {
    if (!isActive || !isSimulated || !simulatedFluctuation) return;
    const interval = setInterval(() => {
      setVolume(prev => {
        const base = 42 + Math.sin(Date.now() / 850) * 22;
        const noise = (Math.random() - 0.5) * 12;
        const target = Math.max(0, Math.min(100, base + noise));
        const smoothed = prev + (target - prev) * 0.35;
        lastVolumeRef.current = smoothed;
        return smoothed;
      });
    }, 110);
    return () => clearInterval(interval);
  }, [isActive, isSimulated, simulatedFluctuation]);

  const startMic = async () => {
    try {
      setError(null);
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Mikrofon-Zugriff im Browser nicht möglich. Bitte in neuem Tab öffnen.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyzer = ctx.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.4;
      analyzerRef.current = analyzer;

      const gainNode = ctx.createGain();
      // Sensitivity gain factor
      const gainValue = Math.max(0.1, (sensitivity / 50) * 1.5);
      gainNode.gain.value = gainValue;
      gainNodeRef.current = gainNode;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(gainNode);
      gainNode.connect(analyzer);

      setIsActive(true);
      isActiveRef.current = true;
      updateVolume();
    } catch (err) {
      console.error('Mic access denied:', err);
      setError('Mikrofon blockiert oder nicht gefunden.');
    }
  };

  const stopMic = () => {
    setIsActive(false);
    isActiveRef.current = false;
    setIsSimulated(false);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolume(0);
    lastVolumeRef.current = 0;
  };

  // Sensitivity updates the runtime gain factor instantly
  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const gVal = Math.max(0.1, (sensitivity / 50) * 2.0);
      gainNodeRef.current.gain.setTargetAtTime(gVal, audioContextRef.current.currentTime, 0.1);
    }
  }, [sensitivity]);

  const updateVolume = () => {
    if (!analyzerRef.current || !isActiveRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    let max = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > max) max = dataArray[i];
    }

    const targetVal = Math.min(100, (max / 255) * 100);
    const smoothed = lastVolumeRef.current + (targetVal - lastVolumeRef.current) * 0.3;
    lastVolumeRef.current = smoothed;
    setVolume(smoothed);

    animationFrameRef.current = requestAnimationFrame(updateVolume);
  };

  const playDiscoStep = (ctx: AudioContext, step: number) => {
    try {
      const now = ctx.currentTime;
      
      // 1. Kick drum on beat 0 and beat 2 of 4
      if (step % 2 === 0) {
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.connect(kickGain);
        kickGain.connect(ctx.destination);
        
        kickOsc.frequency.setValueAtTime(120, now);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        kickGain.gain.setValueAtTime(0.3, now);
        kickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        kickOsc.start(now);
        kickOsc.stop(now + 0.15);
      }
      
      // 2. High hat on steps 1, 3, etc.
      if (step % 2 === 1) {
        const hatOsc = ctx.createOscillator();
        const hatGain = ctx.createGain();
        hatOsc.type = 'triangle';
        hatOsc.connect(hatGain);
        hatGain.connect(ctx.destination);
        
        hatOsc.frequency.setValueAtTime(1000, now);
        hatGain.gain.setValueAtTime(0.05, now);
        hatGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        
        hatOsc.start(now);
        hatOsc.stop(now + 0.05);
      }
      
      // 3. Pentatonic chord/melody plucks (retro style)
      const notes = [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // G, A, C, D, E, G, A, C
      const noteFreq = notes[step % notes.length];
      
      const synthOsc = ctx.createOscillator();
      const synthGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      synthOsc.type = (step % 4 === 0) ? 'sawtooth' : 'triangle';
      synthOsc.frequency.setValueAtTime(noteFreq, now);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + 0.22);
      
      synthOsc.connect(filter);
      filter.connect(synthGain);
      synthGain.connect(ctx.destination);
      
      const volMultiplier = (step % 4 === 0) ? 0.04 : 0.06;
      synthGain.gain.setValueAtTime(volMultiplier, now);
      synthGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      
      synthOsc.start(now);
      synthOsc.stop(now + 0.22);
    } catch (err) {
      console.warn('Disco synth error:', err);
    }
  };

  useEffect(() => {
    const isLoud = volume > threshold;
    const shouldPlay = isActive && mode === 'disco' && !isLoud && discoSoundOn;

    if (shouldPlay) {
      if (!discoAudioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        discoAudioCtxRef.current = new AudioContextClass();
      }
      const ctx = discoAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (!discoIntervalRef.current) {
        discoStepRef.current = 0;
        // Play step every 240ms (around 125 BPM eighth notes)
        discoIntervalRef.current = window.setInterval(() => {
          if (discoAudioCtxRef.current && discoAudioCtxRef.current.state === 'running') {
            playDiscoStep(discoAudioCtxRef.current, discoStepRef.current);
            discoStepRef.current = (discoStepRef.current + 1) % 16;
          }
        }, 240);
      }
    } else {
      if (discoIntervalRef.current) {
        clearInterval(discoIntervalRef.current);
        discoIntervalRef.current = null;
      }
      if (discoAudioCtxRef.current && discoAudioCtxRef.current.state === 'running') {
        discoAudioCtxRef.current.suspend().catch(() => {});
      }
    }

    return () => {
      if (discoIntervalRef.current) {
        clearInterval(discoIntervalRef.current);
        discoIntervalRef.current = null;
      }
    };
  }, [isActive, mode, volume > threshold, discoSoundOn]);

  useEffect(() => {
    return () => {
      if (discoIntervalRef.current) {
        clearInterval(discoIntervalRef.current);
      }
      if (discoAudioCtxRef.current) {
        discoAudioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleAquariumClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'aquarium' || !isActive) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Water level top boundary
    const waterTop = Math.max(10, 100 - Math.max(20, growth));
    if (clickY < waterTop) return; // ignore clicks above water level

    const newFood = {
      id: `food-${Date.now()}-${Math.random()}`,
      x: Math.max(4, Math.min(96, clickX)),
      y: clickY,
      speedY: 0.8
    };

    setFoodList(prev => [...prev, newFood]);
  };

  const isTooLoud = volume > threshold;
  const isWarning = !isTooLoud && volume > threshold - 15;

  return (
    <div className="flex-grow flex flex-col h-full w-full relative select-none justify-between overflow-hidden">
      {showSettings ? (
        <div className={`p-3 rounded-xl border flex flex-col gap-2.5 z-20 pointer-events-auto h-full overflow-y-auto ${
          currentIsLight ? 'bg-slate-50/90 border-slate-200' : 'bg-zinc-900/90 border-white/10'
        }`}>
          <div className="flex justify-between items-center shrink-0 border-b pb-1.5 border-dashed border-slate-350 dark:border-neutral-700">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-500">Lärmmesser Einstellungen</h4>
            <button onClick={onCloseSettings} className="p-1 text-[8px] uppercase tracking-widest font-black text-slate-400 hover:text-rose-500">
              Fertig
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Visualisierungsmodus</label>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { id: 'traffic', label: '🚦 Ampel' },
                  { id: 'thermometer', label: '🌡️ Thermometer' },
                  { id: 'flower', label: '🌸 Blume' },
                  { id: 'aquarium', label: '🐟 Aquarium' },
                  { id: 'rocket', label: '🚀 Rakete' },
                  { id: 'disco', label: '🪩 Party-Disco' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => onUpdate({ settings: { ...widget.settings, mode: m.id } })}
                    className={`p-1 text-[9px] font-bold rounded-lg border transition-all ${
                      mode === m.id 
                        ? 'bg-rose-500 border-rose-500 text-white shadow-sm' 
                        : currentIsLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' : 'bg-zinc-800 border-white/5 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Alarm-Schwelle</span>
                <span className="text-[9px] font-mono font-black text-rose-500">{threshold}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="95"
                value={threshold}
                onChange={(e) => onUpdate({ settings: { ...widget.settings, threshold: Number(e.target.value) } })}
                className="w-full accent-rose-500 cursor-pointer h-1 rounded-lg bg-slate-200 dark:bg-zinc-750"
              />
              {/* Presets Row */}
              <div className="flex gap-1 justify-between mt-1 select-none">
                {[
                  { label: "Flüstern 🤫", value: 35 },
                  { label: "Gruppe 🗣️", value: 65 },
                  { label: "Laut 📢", value: 85 }
                ].map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => onUpdate({ settings: { ...widget.settings, threshold: p.value } })}
                    className={`flex-1 py-0.5.5 py-1 px-1 rounded text-[7.5px] font-bold border transition-all cursor-pointer ${
                      threshold === p.value 
                        ? 'bg-rose-500/10 border-rose-500 text-rose-500' 
                        : currentIsLight ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-600' : 'bg-zinc-800 border-white/5 hover:bg-zinc-700 text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sensitivität</span>
                <span className="text-[9px] font-mono font-black text-indigo-500">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="95"
                value={sensitivity}
                onChange={(e) => onUpdate({ settings: { ...widget.settings, sensitivity: Number(e.target.value) } })}
                className="w-full accent-indigo-500 cursor-pointer h-1 rounded-lg bg-slate-200 dark:bg-zinc-750"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-between items-center h-full w-full relative min-h-0">
          {error ? (
            <div className="flex-grow flex flex-col items-center justify-center p-3 text-center text-[10px] text-red-500 font-bold w-full h-full gap-2">
              <MicOff size={20} className="text-red-500/80" />
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null);
                  setIsActive(true);
                  setIsSimulated(true);
                  setSimulatedFluctuation(true);
                }}
                className="mt-2 py-1.5 px-3 bg-indigo-500 text-white rounded-lg text-[8.5px] font-black uppercase tracking-wider cursor-pointer shadow active:scale-95 hover:bg-indigo-600"
              >
                Simulation starten ⚔️
              </button>
            </div>
          ) : !isActive ? (
            <div className="flex-grow flex flex-col items-center justify-center p-3 text-center w-full h-full min-h-0 gap-3">
              <button
                onClick={startMic}
                className={`py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5 shadow-md active:scale-95 ${
                  currentIsLight ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                <Mic size={11} />
                <span>Mikrofon Starten</span>
              </button>
              
              <div className="flex items-center gap-2 w-2/3 opacity-40">
                <hr className="flex-grow border-current" />
                <span className="text-[8px] font-black">ODER</span>
                <hr className="flex-grow border-current" />
              </div>

              <button
                onClick={() => {
                  setIsActive(true);
                  setIsSimulated(true);
                  setSimulatedFluctuation(true);
                }}
                className={`py-1.5 px-3.5 rounded-lg text-[8.5px] font-bold tracking-wide transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer border hover:scale-102 active:scale-95 ${
                  currentIsLight 
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300' 
                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                }`}
              >
                <span>Demo-Simulation laden 👋</span>
              </button>
            </div>
          ) : (
            <div className={`flex-grow flex flex-col justify-between items-center h-full w-full relative min-h-0 rounded-2xl transition-all duration-300 ${
              isTooLoud 
                ? 'ring-4 ring-rose-500/20 bg-rose-500/[0.02] animate-pulse' 
                : ''
            }`}>
              {/* Visualization Stage */}
              <div className="flex-grow flex items-center justify-center w-full min-h-0 relative select-none py-1">
                {mode === 'thermometer' && (
                  <div className="w-11 h-4/5 rounded-full bg-slate-100 dark:bg-zinc-900 border border-slate-200/50 dark:border-white/5 p-1 flex flex-col justify-end relative shadow-inner overflow-hidden">
                    <motion.div 
                      className={`w-full rounded-full transition-colors duration-250 ${
                        isTooLoud ? 'bg-rose-500 shadow-[0_0_12px_#ef4444]' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ height: `${volume}%` }}
                      layout
                    />
                    <div 
                      className="absolute left-0 right-0 border-t-2 border-dashed border-rose-500/50 z-10"
                      style={{ bottom: `${threshold}%` }}
                      title="Schwellenwert"
                    />
                  </div>
                )}

                {mode === 'traffic' && (
                  <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-100/60 dark:bg-zinc-900/60 border border-slate-200/40 dark:border-white/5 shadow-inner">
                    {[
                      { key: 'red', act: isTooLoud, col: 'bg-rose-500 shadow-[0_0_15px_#ef4444]' },
                      { key: 'yellow', act: isWarning, col: 'bg-amber-400 shadow-[0_0_15px_#fbbf24]' },
                      { key: 'green', act: !isTooLoud && !isWarning, col: 'bg-emerald-500 shadow-[0_0_15px_#10b981]' }
                    ].map(indicator => (
                      <div
                        key={indicator.key}
                        className={`w-10 h-10 rounded-full transition-all duration-300 ${
                          indicator.act ? indicator.col : 'bg-neutral-300 dark:bg-neutral-800 opacity-20'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {mode === 'flower' && (
                  <div className="flex flex-col items-center select-none w-full text-center">
                    <motion.div 
                      animate={{ 
                        scale: isTooLoud ? [1, 0.85, 1.05, 1] : lastVolumeRef.current > 15 ? 1 + lastVolumeRef.current * 0.004 : 1,
                        rotate: isActive && !isTooLoud ? lastVolumeRef.current * 0.8 : 0
                      }}
                      transition={{ type: "spring", stiffness: 120, damping: 10 }}
                      className="text-6xl drop-shadow-lg select-none filter group-hover:hue-rotate-15"
                    >
                      {isTooLoud ? '🥀' : growth > 65 ? '🌸' : growth > 30 ? '🌷' : '🌱'}
                    </motion.div>
                    <div className="mt-2.5 text-[8px] font-black uppercase text-slate-400 tracking-wider">
                      Ruhe-Bonus: <span className="font-mono text-emerald-500">{Math.round(growth)}%</span>
                    </div>
                  </div>
                )}

                {mode === 'aquarium' && (
                  <div 
                    onClick={handleAquariumClick}
                    className="w-full h-full relative rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-50 dark:bg-zinc-950 shadow-inner overflow-hidden cursor-pointer"
                    title="Klicke ins Wasser, um die Fische zu füttern!"
                  >
                    {/* Water Level Fill with Animated wave top */}
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-sky-400/30 via-sky-300/20 to-sky-200/10 dark:from-sky-950/50 dark:via-sky-900/35 dark:to-sky-850/15 border-t border-sky-300 dark:border-sky-700 pointer-events-none transition-all duration-300"
                      style={{ height: `${Math.max(20, growth)}%` }}
                      layout
                    >
                      {/* Animated Wave overlay */}
                      <div className="absolute -top-1 left-0 right-0 h-1.5 bg-sky-200/30 dark:bg-sky-400/20 animate-pulse" />
                    </motion.div>

                    {/* Tank Statistics Info Tag */}
                    <div className="absolute top-1.5 left-2 z-20 text-[7.5px] font-black uppercase text-sky-500 bg-sky-500/10 px-1.5 py-0.5 rounded-md border border-sky-400/20 select-none flex items-center gap-1">
                      <span>🐠 Fische: {fishList.length}/50</span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation(); // prevent adding food at click location
                          const waterTop = Math.max(10, 100 - Math.max(20, growth));
                          const newFoods = Array.from({ length: 3 }).map((_, idx) => ({
                            id: `btn-food-${Date.now()}-${idx}-${Math.random()}`,
                            x: 15 + Math.random() * 70,
                            y: waterTop + 2,
                            speedY: 0.8
                          }));
                          setFoodList(prev => [...prev, ...newFoods]);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[6.5px] uppercase tracking-wider px-1.5 py-0.5 rounded shadow cursor-pointer transition-all active:scale-95 ml-1"
                      >
                        🥞 Füttern
                      </button>
                    </div>

                    <div className="absolute top-1.5 right-2 z-20 text-[6px] font-bold text-sky-500/70 bg-black/10 px-1 py-0.5 rounded pointer-events-none select-none">
                      💡 Klicke ins Wasser zum Füttern!
                    </div>

                    {/* Seaweed plants decoration at bottom */}
                    <div className="absolute bottom-1 left-2 select-none text-base opacity-45 animate-[bounce_3s_infinite] pointer-events-none z-10">🌿</div>
                    <div className="absolute bottom-1 right-2 select-none text-base opacity-50 animate-[bounce_4s_infinite] pointer-events-none z-10">🌿</div>
                    <div className="absolute bottom-2 left-1/3 select-none text-xs opacity-35 pointer-events-none z-10">🌾</div>
                    <div className="absolute bottom-2 right-[40%] select-none text-[10px] opacity-40 pointer-events-none z-10">🌾</div>

                    {/* Dynamic Milestone Ornaments on Sand Bed */}
                    {fishList.length >= 6 && (
                      <div className="absolute bottom-1 left-[15%] select-none text-xs opacity-80 filter drop-shadow pointer-events-none z-10 animate-pulse" title="Perlenmuschel (6 Fische)">🐚</div>
                    )}
                    {fishList.length >= 10 && (
                      <motion.div 
                        animate={{ x: [0, 4, 0], y: [0, -1, 0] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                        className="absolute bottom-1 left-[45%] select-none text-xs opacity-90 filter drop-shadow pointer-events-none z-10" 
                        title="Krabbe (10 Fische)"
                      >
                        🦀
                      </motion.div>
                    )}
                    {fishList.length >= 14 && (
                      <div className="absolute bottom-1.5 right-[20%] select-none text-[14px] opacity-95 filter drop-shadow pointer-events-none z-10 animate-bounce" title="Schatzkiste! (14 Fische)">🪙</div>
                    )}
                    {fishList.length >= 18 && (
                      <div className="absolute bottom-2.5 left-[30%] select-none text-xl opacity-95 filter drop-shadow pointer-events-none z-10" title="Wasserschloss (18 Fische)">🏰</div>
                    )}
                    {fishList.length >= 23 && (
                      <div className="absolute bottom-3 right-[35%] select-none text-lg opacity-90 filter drop-shadow pointer-events-none z-10" title="Meerjungfrau-Statue (23 Fische)">🧜‍♀️</div>
                    )}
                    {fishList.length >= 28 && (
                      <div className="absolute bottom-1.5 left-[8%] select-none text-xl opacity-90 filter drop-shadow pointer-events-none z-10 animate-[pulse_2s_infinite]" title="Altes Piratenschiff (28 Fische)">🚢</div>
                    )}
                    {fishList.length >= 34 && (
                      <div className="absolute bottom-2 right-[10%] select-none text-sm opacity-95 filter drop-shadow-md pointer-events-none z-10 animate-bounce" title="Leuchtkristall (34 Fische)">💎</div>
                    )}

                    {/* Animated rising bubbles */}
                    {[1, 2, 3, 4].map((b) => (
                      <motion.span
                        key={`bubble-${b}`}
                        className="absolute text-sky-350 dark:text-sky-400 pointer-events-none opacity-50 text-[10px] select-none z-10"
                        initial={{ y: "115%", x: `${15 + b * 20}%` }}
                        animate={{ 
                          y: `${100 - Math.max(20, growth)}%`, 
                          x: [`${15 + b * 20}%`, `${15 + b * 20 + (b % 2 === 0 ? 4 : -4)}%`, `${15 + b * 20}%`], 
                          opacity: [0, 0.7, 0.7, 0] 
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 3.5 + b * 0.8,
                          ease: "easeInOut",
                          delay: b * 0.5
                        }}
                      >
                        🫧
                      </motion.span>
                    ))}

                    {/* Floating food flakes */}
                    {foodList.map(food => (
                      <span
                        key={food.id}
                        className="absolute text-[8px] pointer-events-none select-none z-15 pointer-events-none"
                        style={{ left: `${food.x}%`, top: `${food.y}%` }}
                      >
                        🟤
                      </span>
                    ))}

                    {/* Real-time floating physics fish simulation */}
                    <AnimatePresence>
                      {fishList.map((fish) => {
                        const tooLoud = volume > threshold;
                        return (
                          <motion.span
                            key={fish.id}
                            animate={{ 
                              scaleX: fish.direction,
                              scale: tooLoud ? fish.size * 0.75 : fish.size,
                              rotate: tooLoud ? [0, -15, 15, -15, 0] : [0, -2, 2, 0]
                            }}
                            transition={{
                              rotate: tooLoud 
                                ? { repeat: Infinity, duration: 0.2, ease: "linear" } 
                                : { repeat: Infinity, duration: 4.0 + (fish.id.charCodeAt(5) % 3), ease: "easeInOut" },
                              scaleX: { duration: 0.2 },
                              scale: { duration: 0.25 }
                            }}
                            exit={{ opacity: 0, scale: 0, y: fish.y + 20 }}
                            className="absolute text-base select-none pointer-events-none filter drop-shadow-sm z-20 transition-all duration-300"
                            style={{ 
                              left: `${fish.x}%`, 
                              top: `${fish.y}%`,
                              transformOrigin: "center center"
                            }}
                          >
                            {fish.emoji}
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>

                    {/* Smooth dynamic feedback overlays for spawns and fleeing */}
                    <AnimatePresence>
                      {newFishSpawned && (
                        <motion.div
                          initial={{ opacity: 0, y: 15, x: "-50%", scale: 0.7 }}
                          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                          exit={{ opacity: 0, y: -15, x: "-50%", scale: 0.7 }}
                          className="absolute top-10 left-1/2 -translate-x-1/2 bg-emerald-500/95 border border-emerald-400 text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-30 flex items-center gap-1"
                        >
                          <span>{newFishSpawned}</span>
                          <span>Neu im Tank! 🎉</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {fishFled && (
                        <motion.div
                          initial={{ opacity: 0, y: 15, x: "-50%", scale: 0.7 }}
                          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                          exit={{ opacity: 0, y: -15, x: "-50%", scale: 0.7 }}
                          className="absolute top-10 left-1/2 -translate-x-1/2 bg-rose-500/95 border border-rose-400 text-white font-black text-[8px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg z-30 flex items-center gap-1 animate-pulse"
                        >
                          <span>{fishFled}</span>
                          <span>Fisch floh vor Lärm! 🤫 Leise sein!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Too Loud Warning Overlay */}
                    {volume > threshold && (
                      <div className="absolute inset-0 bg-rose-500/10 flex flex-col items-center justify-center animate-pulse pointer-events-none z-20">
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-rose-500 bg-white/95 dark:bg-zinc-950 px-2.5 py-1 rounded-full border border-rose-500/40 shadow-sm">
                          Zu viel Lärm! 🤫 (Flucht in {Math.max(1, 4 - loudTicks)}s)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'disco' && (
                  <div className="w-full h-full relative rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-950 shadow-inner overflow-hidden flex flex-col justify-between p-2">
                    {/* Sweeping Neon Party Spotlights */}
                    <div 
                      className="absolute inset-0 transition-opacity duration-150 pointer-events-none z-0"
                      style={{
                        backgroundImage: volume > threshold 
                          ? 'radial-gradient(circle at 50% 10%, rgba(239, 68, 68, 0.4) 0%, transparent 70%)' 
                          : `radial-gradient(circle at ${40 + Math.sin(Date.now() / 400) * 35}% ${25 + Math.cos(Date.now() / 300) * 15}%, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.25) 40%, transparent 85%)`,
                        opacity: 0.3 + (volume / 100) * 0.7
                      }}
                    />

                    {/* Red Alarm Strobe Filter on loudness */}
                    {volume > threshold && (
                      <motion.div 
                        animate={{ backgroundColor: ["rgba(239, 68, 68, 0.15)", "rgba(239, 68, 68, 0)", "rgba(239, 68, 68, 0.15)"] }}
                        transition={{ repeat: Infinity, duration: 0.35 }}
                        className="absolute inset-0 pointer-events-none z-10"
                      />
                    )}

                    {/* Audio Sound Toggle Controller */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiscoSoundOn(!discoSoundOn);
                      }}
                      className={`absolute top-2 right-2 z-20 px-2 py-0.5 rounded border text-[6px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        discoSoundOn 
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                          : 'bg-slate-800 border-slate-700 text-slate-500'
                      }`}
                    >
                      {discoSoundOn ? "🔊 Ton: AN" : "🔇 Stumm"}
                    </button>
                    
                    {/* Rule Badge / Instructions */}
                    <div className="text-center z-10 select-none bg-black/55 border border-white/5 px-2 py-1 rounded-xl max-w-[95%] mx-auto mt-0.5">
                      <h5 className="text-[7.5px] font-black text-pink-400 uppercase tracking-widest leading-none">🤫 Silent-Disco (Leise-Spiel)</h5>
                      <p className="text-[6.5px] text-slate-350 font-bold leading-tight mt-0.5">
                        Spielregel: Bleibt flüsterleise (unter {threshold}%), damit die Musik & der DJ weiterfeiern! Bei Lärm stoppt die Musik!
                      </p>
                    </div>

                    {/* DJ Booth Stage in center */}
                    <div className="flex-grow flex flex-col items-center justify-center relative min-h-0 z-10 select-none gap-1">
                      
                      {/* Spinning Disco Ball */}
                      <div className="relative">
                        <motion.span
                          animate={volume > threshold ? { rotate: 0 } : { rotate: 360 }}
                          transition={volume > threshold ? { duration: 0 } : { repeat: Infinity, duration: 8, ease: "linear" }}
                          className="text-4xl filter drop-shadow inline-block"
                        >
                          🪩
                        </motion.span>
                      </div>

                      {volume > threshold ? (
                        <div className="flex flex-col items-center">
                          <span className="text-4xl filter drop-shadow-md select-none animate-bounce">🙉</span>
                          <span className="text-[7.5px] font-black uppercase text-rose-500 mt-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/25">
                            DJ BÄR: "ZU LAUT! 🤫 MUSIK-STOPP!"
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <motion.span
                            animate={{ 
                              y: [0, -5, 0],
                              rotate: [-4, 4, -4]
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.48,
                              ease: "easeInOut"
                            }}
                            className="text-4xl filter drop-shadow-md select-none"
                          >
                            🎧🐻
                          </motion.span>
                          <span className="text-[7.5px] font-black uppercase text-indigo-400 mt-1 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/25 animate-pulse">
                            DJ BÄR: "Wir tanzen! 🎵🕺"
                          </span>
                        </div>
                      )}

                      {/* Dancing Animal Crowd */}
                      <div className="flex gap-2 select-none justify-center items-center mt-1">
                        {['🦊', '🐰', '🐯', '🐼'].map((emoji, idx) => {
                          const tooLoud = volume > threshold;
                          return (
                            <motion.span
                              key={idx}
                              animate={tooLoud ? { y: 0, scale: 0.95 } : { y: [0, -4, 0], rotate: [-6, 6, -6] }}
                              transition={tooLoud ? {} : { repeat: Infinity, duration: 0.5 + idx * 0.1, ease: "easeInOut" }}
                              className="text-lg filter drop-shadow-sm inline-block"
                            >
                              {tooLoud ? '🙉' : emoji}
                            </motion.span>
                          );
                        })}
                      </div>

                      {/* Decibel Indicator Label */}
                      <span className="text-[7px] font-black uppercase text-purple-400/70 mt-1 tracking-widest font-mono">Pegel: {Math.round(volume)}%</span>
                    </div>

                    {/* Colorful Bouncing Neon Spectrum Equalizer Bars at bottom */}
                    <div className="w-full h-8 flex items-end justify-between gap-[1px] pointer-events-none z-10 px-1 mt-1">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const tooLoud = volume > threshold;
                        const barHeight = tooLoud 
                          ? "4px" 
                          : isActive 
                            ? `${Math.max(8, (volume * (0.3 + Math.sin(i * 1.5 + Date.now() / 140) * 0.25)))}%` 
                            : "6px";
                        const colors = [
                          "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]",
                          "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]",
                          "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
                          "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
                          "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]",
                          "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                        ];
                        const barColor = tooLoud ? "bg-slate-800 opacity-30 shadow-none" : colors[i % colors.length];
                        return (
                          <motion.div
                            key={i}
                            animate={{ height: barHeight }}
                            transition={{ type: "spring", stiffness: 180, damping: 12 }}
                            className={`flex-1 rounded-t-sm ${barColor} transition-all duration-150`}
                          />
                        );
                      })}
                    </div>

                    {/* Giant Alert Overlay on Loudness */}
                    {volume > threshold && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-20">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white bg-rose-600 border border-white/20 px-3 py-1 rounded-full animate-bounce shadow-md">
                          DISCO-STOPP! 🚨 ZU LAUT!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {mode === 'rocket' && (
                  <div className="w-full h-full relative rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-950 shadow-inner overflow-hidden flex flex-col justify-between p-2.5">
                    {/* Stars background */}
                    <div className="absolute inset-0 opacity-40 pointer-events-none select-none overflow-hidden">
                      <span className="absolute top-2 left-6 text-xs text-white">★</span>
                      <span className="absolute top-10 left-32 text-xs text-white">✨</span>
                      <span className="absolute top-20 left-12 text-[8px] text-white">★</span>
                      <span className="absolute top-14 left-48 text-xs text-white">⭐</span>
                      <span className="absolute top-4 left-52 text-[8px] text-white">✨</span>
                      <span className="absolute top-24 left-2 text-xs text-white">⭐</span>
                    </div>

                    {/* Target Moon */}
                    <div className="flex justify-between items-start shrink-0 relative z-10 select-none">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-base filter drop-shadow">🌙</span>
                        <span className="text-[7px] text-stone-400 font-bold uppercase tracking-wider">Ziel-Umlaufbahn</span>
                      </div>
                      <div className="text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-black/40 px-1.5 py-0.5 rounded-md border border-white/10">
                        Höhe: {Math.round(growth)}%
                      </div>
                    </div>

                    {/* Animated Rocket Flight */}
                    <div className="flex-grow flex items-end justify-center relative min-h-0 py-2.5">
                      <motion.div
                        className="relative flex flex-col items-center"
                        style={{ bottom: `${Math.min(90, Math.max(0, growth))}%` }}
                        animate={isTooLoud ? { x: [-1.5, 1.5, -1.5, 1.5, 0], rotate: [-2, 2, -2, 2, 0] } : {}}
                        transition={{ repeat: Infinity, duration: 0.15 }}
                        layout
                      >
                        <span className="text-3xl filter drop-shadow-md select-none">🚀</span>
                        {!isTooLoud && (
                          <div className="text-[9px] mt-0.5 animate-pulse text-indigo-400 drop-shadow">🔥</div>
                        )}
                      </motion.div>
                    </div>

                    {/* Warning overlay on Turbulence */}
                    {isTooLoud && (
                      <div className="absolute inset-0 bg-red-950/20 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-20">
                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 bg-black/85 border border-rose-500/40 px-3 py-1 rounded-full animate-bounce">
                          Turbulenzen ⚠️ Zu Laut!
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Simulated Manual Controller Panel */}
              {isSimulated && (
                <div className={`w-full shrink-0 flex flex-col gap-1 p-2 rounded-2xl mb-1.5 border ${
                  currentIsLight ? 'bg-indigo-50/40 border-indigo-100/60' : 'bg-indigo-950/10 border-indigo-900/40'
                }`}>
                  <div className="flex justify-between items-center w-full select-none">
                    <span className="text-[8px] font-black uppercase text-indigo-400">Manueller Testpuffer</span>
                    <button 
                      type="button"
                      onClick={() => setSimulatedFluctuation(!simulatedFluctuation)}
                      className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold cursor-pointer border transition-colors ${
                        simulatedFluctuation 
                          ? "bg-indigo-500 text-white border-transparent shadow-sm" 
                          : currentIsLight ? "bg-white text-slate-600 border-slate-200 hover:bg-slate-50" : "bg-white/5 text-slate-300 border-white/10"
                      }`}
                    >
                      {simulatedFluctuation ? "Auto-Welle ✔" : "Manuell schieben 🎚️"}
                    </button>
                  </div>
                  {!simulatedFluctuation && (
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(volume)}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setVolume(val);
                        lastVolumeRef.current = val;
                      }}
                      className="w-full accent-indigo-500 cursor-pointer h-1 rounded-lg bg-indigo-500/20"
                    />
                  )}
                </div>
              )}

              {/* Bottom Live Level and Smaller Stop Controller */}
              <div className="w-full shrink-0 flex flex-col gap-1.5 pt-1 pointer-events-auto items-center">
                {/* Audio Signal Bar */}
                <div className="w-full bg-slate-100 dark:bg-zinc-900 rounded-full h-1 overflow-hidden relative shadow-inner border border-slate-200/20">
                  <div 
                    className={`h-full transition-all duration-100 ${
                      isTooLoud ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${volume}%` }}
                  />
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-10"
                    style={{ left: `${threshold}%` }}
                  />
                </div>

                {/* 3-Column Bento Stats Panel */}
                <div className="w-full grid grid-cols-3 gap-1.5 px-0.5 my-1 shrink-0 select-none">
                  <div className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-t border-b hover:scale-102 transition-transform ${currentIsLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
                    <span className="text-[6.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Streaks</span>
                    <span className="text-[10px] font-mono font-black text-emerald-500 mt-0.5 tabular-nums leading-none">{quietStreak}s</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-t border-b hover:scale-102 transition-transform ${currentIsLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
                    <span className="text-[6.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Bester</span>
                    <span className="text-[10px] font-mono font-black text-indigo-500 mt-0.5 tabular-nums leading-none">{maxQuietStreak}s</span>
                  </div>
                  <div className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-xl border-t border-b hover:scale-102 transition-transform ${currentIsLight ? 'bg-slate-50/70 border-slate-100' : 'bg-white/[0.02] border-white/5'}`}>
                    <span className="text-[6.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">Warnungen</span>
                    <span className="text-[10px] font-mono font-black text-rose-500 mt-0.5 tabular-nums leading-none">{warnCount}</span>
                  </div>
                </div>

                <button
                  onClick={stopMic}
                  className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1 shadow-sm"
                >
                  <MicOff size={9} />
                  <span>Messer Stoppen</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// ==========================================
// WIDGET 7: LERNWÖRTER (LernwoerterWidgetContent)
// ==========================================
interface LernwoerterWidgetProps {
  widget: any;
  onUpdate: (updates: any) => void;
  app: any;
  setApp: any;
  showSettings: boolean;
  onCloseSettings: () => void;
}

export const LernwoerterWidgetContent: React.FC<LernwoerterWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp,
  showSettings,
  onCloseSettings
}) => {
  return (
    <LernwoerterStudioWidget
      widget={widget}
      onUpdate={onUpdate}
      app={app}
      setApp={setApp}
      currentIsLight={widget?.currentIsLight ?? true}
      defaultMode="cards"
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};


// ==========================================
// WIDGET 8: MINI-SCHÜLERLISTE (StudentListWidgetContent)
// ==========================================
interface StudentListWidgetProps {
  app: any;
  setApp: any;
  getBehaviorSymbol: (sid: string) => any;
  getTodayPoints: (sid: string) => number;
  addParticipation: (sid: string, e?: any) => void;
  removeParticipation: (sid: string) => void;
  currentIsLight: boolean;
}

export const StudentListWidgetContent: React.FC<StudentListWidgetProps> = ({
  app,
  setApp,
  getBehaviorSymbol,
  getTodayPoints,
  addParticipation,
  removeParticipation,
  currentIsLight
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompact, setIsCompact] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'noStars' | 'absent'>('all');
  const [luckyWinner, setLuckyWinner] = useState<any | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Helper to check if a student is absent today
  const checkIsAbsent = useCallback((studentId: string) => {
    const statusData = app.anwesenheit?.[studentId]?.[todayStr] || {};
    return Object.values(statusData).some(
      (v: any) => v === "f" || v === "e" || v === "u" || v === "krank" || v === "fehlt"
    );
  }, [app.anwesenheit, todayStr]);

  // Helper to check if a student has notes/comments
  const checkHasNotes = useCallback((studentId: string) => {
    return !!app.behavior_comments?.[studentId] || (app.studentNotes?.[studentId]?.length > 0);
  }, [app.behavior_comments, app.studentNotes]);

  const filteredStudents = useMemo(() => {
    const s = app.schueler || [];
    let list = [...s];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item: any) => 
        (item.vorname || '').toLowerCase().includes(q) || 
        (item.nachname || '').toLowerCase().includes(q)
      );
    }

    // Filter mode
    if (filterMode === 'active') {
      list = list.filter((student: any) => getTodayPoints(student.id) > 0 && !checkIsAbsent(student.id));
    } else if (filterMode === 'noStars') {
      list = list.filter((student: any) => getTodayPoints(student.id) === 0 && !checkIsAbsent(student.id));
    } else if (filterMode === 'absent') {
      list = list.filter((student: any) => checkIsAbsent(student.id));
    }

    return list;
  }, [app.schueler, searchQuery, filterMode, getTodayPoints, checkIsAbsent]);

  // Lucky Draw Trigger
  const triggerLuckyDraw = () => {
    // Pick from present students only (not absent)
    const candidates = (app.schueler || []).filter((s: any) => !checkIsAbsent(s.id));
    if (candidates.length === 0) return;

    setIsDrawing(true);
    setLuckyWinner(null);

    // Shuffle effect
    let counter = 0;
    const interval = setInterval(() => {
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      setLuckyWinner(randomCandidate);
      counter++;
      if (counter > 8) {
        clearInterval(interval);
        setIsDrawing(false);
      }
    }, 120);
  };

  // Bulk actions: Praise entire class
  const praiseClass = () => {
    const presentStudents = (app.schueler || []).filter((s: any) => !checkIsAbsent(s.id));
    if (presentStudents.length === 0) return;

    setApp((prev: any) => {
      let activeSubject = "";
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      const tagNames = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
      const tagName = tagNames[now.getDay()];
      
      const zeiten = [
        { start: 480, end: 530 },
        { start: 530, end: 585 },
        { start: 600, end: 650 },
        { start: 650, end: 705 },
        { start: 705, end: 750 },
        { start: 810, end: 860 },
        { start: 860, end: 910 },
        { start: 910, end: 960 },
      ];
      
      const unitIdx = zeiten.findIndex((z) => minutes >= z.start && minutes < z.end);
      if (unitIdx !== -1) {
        const kw = getKW(now);
        activeSubject = prev.wochenplanung?.[kw]?.[tagName]?.[unitIdx]?.fach || prev.stammplan?.[tagName]?.[unitIdx + 1] || "Unterricht";
      } else {
        activeSubject = "Unterricht";
      }

      const newLogs = [...(prev.mitarbeitLogs || [])];
      const nowStr = new Date().toISOString();

      presentStudents.forEach((student: any) => {
        newLogs.push({
          sid: student.id,
          points: 1,
          timestamp: nowStr,
          fach: activeSubject || "Unterricht"
        });
      });

      return {
        ...prev,
        mitarbeitLogs: newLogs
      };
    });
  };

  // Live action logs for today (max 3, sorted newest first)
  const recentLogs = useMemo(() => {
    const logs = (app.mitarbeitLogs || []).filter((log: any) => {
      const d = new Date(log.timestamp);
      const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return logDateStr === todayStr;
    });
    return logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 3);
  }, [app.mitarbeitLogs, todayStr]);

  // Total daily tally
  const classTotalPoints = useMemo(() => {
    return (app.schueler || []).reduce((sum: number, s: any) => sum + getTodayPoints(s.id), 0);
  }, [app.schueler, getTodayPoints, app.mitarbeitLogs]);

  // Undo a specific action log
  const handleUndoLog = (logToUndo: any) => {
    setApp((prev: any) => ({
      ...prev,
      mitarbeitLogs: (prev.mitarbeitLogs || []).filter((log: any) => log.timestamp !== logToUndo.timestamp || log.sid !== logToUndo.sid)
    }));
  };

  return (
    <div className="flex-grow flex flex-col h-full w-full relative select-none justify-between overflow-hidden">
      {/* Action Header */}
      <div className="shrink-0 space-y-1.5 mb-2 pointer-events-auto w-full">
        {/* Search & Lucky Draw */}
        <div className="flex gap-1.5 items-center">
          <div className="relative flex-grow">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Schüler suchen..."
              className="w-full pl-7 pr-3 py-1.5 rounded-xl text-[10px] font-bold border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white text-slate-800 border-slate-200"
            />
            <Search size={10} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Lucky Draw button */}
          <button
            onClick={triggerLuckyDraw}
            disabled={isDrawing}
            className="p-1.5 bg-indigo-550 hover:bg-indigo-500 active:scale-95 text-white rounded-xl flex items-center justify-center border border-indigo-400 cursor-pointer shadow-sm disabled:opacity-50 transition-all shrink-0"
            title="Zufälligen anwesenden Schüler auslosen"
          >
            <span className="text-xs" role="img" aria-label="lucky-draw">🎲</span>
          </button>
        </div>

        {/* Dynamic Filters (Interactive tabs) */}
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-0.5 border-b border-slate-200/40 dark:border-white/5">
          {[
            { id: 'all', label: 'Alle' },
            { id: 'active', label: 'Aktiv (⭐)' },
            { id: 'noStars', label: 'Noch ohne ⭐' },
            { id: 'absent', label: 'Abwesend' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterMode(tab.id as any)}
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                filterMode === tab.id
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : currentIsLight
                    ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk & Layout buttons */}
        <div className="flex gap-1">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              isCompact 
                ? 'bg-indigo-500 border-indigo-400 text-white' 
                : currentIsLight 
                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200' 
                  : 'bg-zinc-800 border-white/5 text-slate-300 hover:bg-zinc-700'
            }`}
            title={isCompact ? "Normale Ansicht" : "Kompakte Ansicht"}
          >
            {isCompact ? <AlignJustify size={10} /> : <Grid3X3 size={10} />}
            <span>{isCompact ? "Normal" : "Kompakt"}</span>
          </button>

          <button
            onClick={praiseClass}
            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 text-white text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
            title="Allen anwesenden Schülern +1 Mitarbeitspunkt geben"
          >
            <Sparkles size={9} />
            <span>Klasse loben (+1)</span>
          </button>
        </div>
      </div>

      {/* Lucky Draw Overlay Overlay */}
      <AnimatePresence>
        {luckyWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-x-2 top-14 z-50 p-2.5 rounded-xl border shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 border-indigo-400 text-white text-center pointer-events-auto"
          >
            <div className="flex justify-between items-start">
              <span className="text-[7px] font-black uppercase tracking-wider bg-white/20 px-1.5 py-0.5 rounded">
                {isDrawing ? "🎲 Mischt..." : "🎯 Glückskind gezogen!"}
              </span>
              <button
                onClick={() => setLuckyWinner(null)}
                className="text-white/60 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-black mt-1.5 truncate">
              {isDrawing ? "⏳ ..." : `${luckyWinner.emoji || "🧑‍🎓"} ${luckyWinner.vorname} ${luckyWinner.nachname || ""}`}
            </p>
            {!isDrawing && (
              <div className="flex gap-1 justify-center mt-2">
                <button
                  onClick={(e) => {
                    addParticipation(luckyWinner.id, e);
                    setLuckyWinner(null);
                  }}
                  className="bg-white hover:bg-slate-100 text-indigo-600 text-[8px] font-black uppercase px-2 py-1 rounded shadow cursor-pointer active:scale-95 transition-all"
                >
                  Belohnen (+1 ⭐)
                </button>
                <button
                  onClick={triggerLuckyDraw}
                  className="bg-black/20 hover:bg-black/30 text-white text-[8px] font-black uppercase px-2 py-1 rounded cursor-pointer active:scale-95 transition-all"
                >
                  Nochmal würfeln
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student List */}
      <div className="flex-grow overflow-y-auto w-full pointer-events-auto pr-0.5 space-y-1 scrollbar-thin max-h-full">
        {filteredStudents.length === 0 ? (
          <div className="p-4 text-center text-[10px] font-bold text-slate-400">Keine passenden Schüler gefunden</div>
        ) : (
          filteredStudents.map((student: any) => {
            const points = getTodayPoints(student.id);
            const symbol = getBehaviorSymbol(student.id);
            const isAbsent = checkIsAbsent(student.id);
            const hasNotes = checkHasNotes(student.id);
            
            if (isCompact) {
              return (
                <div 
                  key={student.id} 
                  className={`flex items-center justify-between py-0.5 px-1.5 rounded-lg border transition-all ${
                    isAbsent
                      ? 'opacity-40 bg-slate-100/10 dark:bg-black/20 border-dashed border-slate-200 dark:border-white/5'
                      : currentIsLight 
                        ? 'border-slate-100 hover:bg-slate-50/50 text-slate-700' 
                        : 'border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-grow">
                    <span className="text-xs shrink-0" title={symbol.label}>
                      {isAbsent ? "💤" : symbol.icon}
                    </span>
                    <span className="text-[9px] font-bold truncate leading-none">
                      {student.vorname} {student.nachname?.charAt(0) || ''}.
                    </span>
                    {isAbsent ? (
                      <span className="text-[7px] font-black uppercase bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-stone-400 px-1 py-0.1 rounded shrink-0">Fehlt</span>
                    ) : (
                      <>
                        <span className="text-[8px] font-black text-amber-500 shrink-0">⭐{points}</span>
                        {hasNotes && <span className="text-[8px] shrink-0" title="Notiz vorhanden">📝</span>}
                      </>
                    )}
                  </div>

                  {!isAbsent && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => removeParticipation(student.id)}
                        className="w-4 h-4 rounded bg-red-500/10 hover:bg-red-500 text-rose-500 hover:text-white transition-all flex items-center justify-center font-black cursor-pointer"
                      >
                        <Minus size={8} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => addParticipation(student.id, e)}
                        className="w-4 h-4 rounded bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all flex items-center justify-center font-black cursor-pointer"
                      >
                        <Plus size={8} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div 
                key={student.id} 
                className={`flex items-center justify-between p-1 px-1.5 rounded-xl border transition-all ${
                  isAbsent
                    ? 'opacity-40 bg-slate-100/10 dark:bg-black/20 border-dashed border-slate-200 dark:border-white/5'
                    : currentIsLight 
                      ? 'border-slate-100 hover:bg-slate-50/50 text-slate-700' 
                      : 'border-white/5 bg-zinc-900/35 hover:bg-zinc-900/60 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-grow">
                  {/* Avatar / Emoji trigger */}
                  <span className="text-xl filter drop-shadow hover:scale-110 active:scale-95 transition-transform" title={symbol.label}>
                    {isAbsent ? "💤" : symbol.icon}
                  </span>
                  
                  {/* Name and stars indicator */}
                  <div className="min-w-0 flex-grow leading-tight">
                    <p className="text-[10px] font-black tracking-tight truncate">
                      {student.vorname} {student.nachname || ''}
                    </p>
                    <div className="flex items-center gap-1.5">
                      {isAbsent ? (
                        <span className="text-[7.5px] font-black uppercase bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-stone-400 px-1.5 py-0.2 rounded">Abwesend</span>
                      ) : (
                        <>
                          <span className="text-[8px] font-bold text-amber-500">⭐ {points}</span>
                          {hasNotes && <span className="text-[8px]" title="Notiz vorhanden">📝</span>}
                          {student.badges && student.badges.length > 0 && (
                            <div className="flex gap-0.5">
                              {student.badges.slice(0, 2).map((b: any) => (
                                <span key={b.id} title={b.name} className="text-[8px]">
                                  {b.icon}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score control actions */}
                {!isAbsent && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => removeParticipation(student.id)}
                      className="w-6 h-6 rounded-lg bg-red-500/10 hover:bg-red-500 text-rose-500 hover:text-white transition-all duration-150 flex items-center justify-center font-black active:scale-90 cursor-pointer border border-rose-500/15"
                    >
                      <Minus size={11} strokeWidth={3} />
                    </button>
                    <button
                      onClick={(e) => addParticipation(student.id, e)}
                      className="w-6 h-6 rounded-lg bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white transition-all duration-150 flex items-center justify-center font-black active:scale-95 hover:scale-105 cursor-pointer border border-emerald-500/15"
                    >
                      <Plus size={11} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Tally & Live logging action feed (Mitarbeits-Protokoll) */}
      <div className="shrink-0 mt-2 pointer-events-auto">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-500 border-t border-slate-200/40 dark:border-white/5 pt-2 pb-1.5">
          <span>Tages-Punkte</span>
          <span className="font-black text-amber-500">🏆 {classTotalPoints} ⭐</span>
        </div>

        {recentLogs.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-stone-500 mb-1">
              <span>Kürzliche Aktionen</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            {recentLogs.map((log: any, idx: number) => {
              const studentName = app.schueler?.find((s: any) => s.id === log.sid)?.vorname || "Schüler";
              const d = new Date(log.timestamp);
              const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              const isPositive = log.points > 0;
              
              return (
                <div key={idx} className="flex items-center justify-between text-[9px] bg-black/5 dark:bg-white/5 p-1 px-1.5 rounded-lg border border-slate-200/20 dark:border-white/5">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPositive ? `+${log.points}` : log.points}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-stone-300">{studentName}</span>
                    <span className="text-[7.5px] text-slate-400 dark:text-stone-500">({log.fach})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7.5px] text-slate-400 dark:text-stone-550">{timeStr}</span>
                    <button 
                      onClick={() => handleUndoLog(log)}
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      title="Aktion rückgängig machen"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


// ==========================================
// WIDGET 9: GRUPPEN-ANZEIGE (GroupsWidgetContent)
// ==========================================
export interface GroupsWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  app?: any;
  setApp?: any;
  generatedGroups?: any[];
  setGeneratedGroups?: (groups: any[]) => void;
  generateGroups?: (count?: number, isSize?: boolean, overrideStrategy?: string) => void;
  currentIsLight: boolean;
  settingsInPicker?: boolean;
  onClosePickerSettings?: () => void;
}

export const GroupsWidgetContent: React.FC<GroupsWidgetProps> = (props) => {
  return <GroupsWidget {...props} />;
};


// ==========================================
// WIDGET 10: QR-CODE (QrCodeWidgetContent)
// ==========================================
export type { QRCodeWidgetProps as QrCodeWidgetProps };

export const QrCodeWidgetContent: React.FC<QRCodeWidgetProps> = (props) => {
  return <QRCodeWidget {...props} />;
};


// ==========================================
// WIDGET 11: BILD / ARBEITSBLATT (ImageWidgetContent)
// ==========================================
export type { ImageWidgetProps };

export const ImageWidgetContent: React.FC<ImageWidgetProps> = (props) => {
  return <ImageWidget {...props} />;
};


// ==========================================
// WIDGET 12: PHASEN / TIMELINE (PhasenWidgetContent)
// ==========================================
interface PhasenWidgetProps {
  widget: any;
  lessonPhases: any[];
  setLessonPhases: (phases: any[]) => void;
  currentIsLight: boolean;
}

export const PhasenWidgetContent: React.FC<PhasenWidgetProps> = ({
  widget,
  lessonPhases,
  setLessonPhases,
  currentIsLight
}) => {
  const activeIdx = lessonPhases.findIndex((p: any) => p.active);
  const total = lessonPhases.length;

  const [editingId, setEditingId] = useState<string | null>(null);

  const navigatePhase = (direction: 'prev' | 'next') => {
    if (total === 0) return;
    let newIdx = 0;
    if (direction === 'prev') {
      newIdx = Math.max(0, activeIdx - 1);
    } else {
      newIdx = Math.min(total - 1, activeIdx + 1);
    }

    setLessonPhases(lessonPhases.map((phase: any, i: number) => ({
      ...phase,
      active: i === newIdx
    })));
  };

  const selectPhaseByIndex = (idx: number) => {
    setLessonPhases(lessonPhases.map((phase: any, i: number) => ({
      ...phase,
      active: i === idx
    })));
  };

  const handleAddPhase = () => {
    const nextNum = lessonPhases.length + 1;
    const newPhase = {
      id: `p-custom-${Date.now()}`,
      label: `Phase ${nextNum}`,
      active: lessonPhases.length === 0
    };
    setLessonPhases([...lessonPhases, newPhase]);
  };

  const handleDeletePhase = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = lessonPhases.filter((p: any) => p.id !== id);
    if (activeIdx >= filtered.length) {
      const updated = filtered.map((p: any, i: number) => ({ ...p, active: i === filtered.length - 1 }));
      setLessonPhases(updated);
    } else {
      setLessonPhases(filtered);
    }
  };

  return (
    <div className="flex-grow flex flex-col h-full w-full relative select-none justify-between overflow-hidden">
      {total === 0 ? (
        <div className="flex-grow flex flex-col justify-center items-center text-center p-3 select-none">
          <span className="text-3xl mb-1 text-slate-400">🧭</span>
          <p className="text-[10px] font-black class text-slate-450 uppercase tracking-widest mb-2">Keine Stundenphasen konfiguriert!</p>
          <button
            onClick={handleAddPhase}
            className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[8px] font-black uppercase tracking-wider cursor-pointer shadow active:scale-95"
          >
            ➕ Phase hinzufügen
          </button>
        </div>
      ) : (
        <div className="flex-grow flex flex-col justify-between h-full w-full relative min-h-0">
          
          {/* Active Phase display banner (Big) */}
          <div className="text-center shrink-0 mb-1 leading-normal w-full px-1 flex items-center justify-between gap-1">
            <span className="text-[8px] font-black uppercase tracking-wider text-rose-500 block">Klassenphasen:</span>
            <button
              onClick={handleAddPhase}
              className="text-[8px] font-black uppercase bg-indigo-500 hover:bg-indigo-600 text-white px-1.5 py-0.5 rounded cursor-pointer transition-all"
            >
              ➕ Phase
            </button>
          </div>

          {/* Stepper Timeline List (Adaptive layout spacing) */}
          <div className="flex-grow overflow-y-auto space-y-1 py-1.5 w-full pointer-events-auto pr-0.5 select-none min-h-0 scrollbar-thin">
            {lessonPhases.map((phase: any, index: number) => {
              const isActive = index === activeIdx;
              const isPast = index < activeIdx;
              const isEditing = editingId === phase.id;

              return (
                <div
                  key={phase.id}
                  className="group relative flex items-center w-full"
                >
                  <button
                    type="button"
                    onClick={() => !isEditing && selectPhaseByIndex(index)}
                    className={`flex-grow min-h-11 flex items-center gap-1.5 p-1 rounded-xl text-left border cursor-pointer select-none transition-all duration-200 outline-none pr-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      isActive 
                        ? 'bg-rose-500 border-rose-500 text-white shadow-md font-black' 
                        : isPast
                          ? currentIsLight ? 'bg-emerald-50/50 text-emerald-700/60 border-emerald-100/40' : 'bg-emerald-999 bg-opacity-10 text-emerald-550 border-emerald-500/10'
                          : currentIsLight ? 'bg-slate-50/40 border-slate-100 text-slate-500 hover:bg-slate-100/40' : 'bg-zinc-900 border-white/5 text-slate-450 hover:bg-zinc-800'
                    }`}
                  >
                    {/* Status index bubble */}
                    <span className={`w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center shrink-0 ${
                      isActive 
                        ? 'bg-white text-rose-500' 
                        : isPast
                          ? 'bg-emerald-500 text-white'
                          : 'bg-black/10 dark:bg-white/10 text-slate-450'
                    }`}>
                      {index + 1}
                    </span>

                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={phase.label}
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = e.target.value.trim() || phase.label;
                          setLessonPhases(lessonPhases.map((p: any) => p.id === phase.id ? { ...p, label: val } : p));
                        }}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingId(null);
                        }}
                        className={`px-1.5 py-0.5 text-[9.5px] font-bold rounded-md border outline-none max-w-[120px] ${
                          currentIsLight ? 'bg-white text-slate-800 border-indigo-400' : 'bg-black/60 text-white border-indigo-500'
                        }`}
                      />
                    ) : (
                      <span 
                        className="text-[9.5px] font-bold truncate flex-grow cursor-pointer"
                        onDoubleClick={() => setEditingId(phase.id)}
                        title="Doppelklick zum Bearbeiten"
                      >
                        {phase.label}
                      </span>
                    )}

                  </button>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingId(phase.id); }}
                      className="absolute right-8 z-10 min-h-11 min-w-11 rounded-lg text-[8.5px] opacity-0 group-hover:opacity-75 hover:bg-white/60 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      aria-label={`Phase ${phase.label} bearbeiten`}
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                  )}

                  {/* Delete Option for customized phases or any phase */}
                  {lessonPhases.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeletePhase(phase.id, e)}
                      className="absolute right-1 z-10 min-h-11 min-w-11 rounded-lg text-slate-400 hover:text-rose-500 text-[10px] font-bold p-1 cursor-pointer transition-all opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      aria-label={`Phase ${phase.label} löschen`}
                      title="Phase löschen"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Stepper controls */}
          <div className="w-full shrink-0 flex gap-1 pointer-events-auto pt-1.5 border-t border-dashed border-slate-350 dark:border-neutral-800">
            <button
              onClick={() => navigatePhase('prev')}
              disabled={activeIdx <= 0}
              className={`flex-1 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 border ${
                activeIdx <= 0
                  ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200/40'
                  : currentIsLight ? 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-95' : 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-white active:scale-95'
              }`}
            >
              <ChevronLeft size={11} strokeWidth={3} />
              <span>Zurück</span>
            </button>
            <button
              onClick={() => navigatePhase('next')}
              disabled={activeIdx >= total - 1}
              className={`flex-1 py-1.5 rounded-xl text-[8.5px] font-black uppercase tracking-widest cursor-pointer transition-all duration-200 flex items-center justify-center gap-1 border ${
                activeIdx >= total - 1
                  ? 'opacity-30 cursor-not-allowed text-slate-400 border-slate-200/40'
                  : currentIsLight ? 'bg-rose-500 border-rose-500 hover:bg-rose-600 text-white hover:shadow shadow-sm active:scale-95' : 'bg-rose-500 border-rose-500 hover:bg-rose-600 text-white active:scale-95'
              }`}
            >
              <span>Weiter</span>
              <ChevronRight size={11} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// WIDGET 13: SIGNAL-TÖNE (SoundsWidgetContent)
// ==========================================
interface SoundsWidgetProps {
  playSound: (id: string) => void;
  currentIsLight: boolean;
}

export const SoundsWidgetContent: React.FC<SoundsWidgetProps> = ({
  playSound,
  currentIsLight
}) => {
  const sounds = [
    { id: "bowl", label: "Ruhegong", emoji: "🥣" },
    { id: "applause", label: "Applaus", emoji: "👏" },
    { id: "fanfare", label: "Fanfare", emoji: "🎺" },
    { id: "tada", label: "Ta-Da!", emoji: "🎉" },
    { id: "bell", label: "Schulglocke", emoji: "🔔" },
    { id: "laser", label: "Laser", emoji: "⚡" },
    { id: "timer", label: "Countdown", emoji: "⏳" },
    { id: "nature", label: "Ocean", emoji: "🌊" },
    { id: "error", label: "Fehler", emoji: "❌" },
  ];

  // Metronome State
  const [metronomeActive, setMetronomeActive] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [beatTick, setBeatTick] = useState(false);

  useEffect(() => {
    if (!metronomeActive) return;
    const intervalMs = (60 / bpm) * 1000;
    
    const triggerBeat = () => {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(1000, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
          osc.start();
          osc.stop(ctx.currentTime + 0.08);
        }
      } catch (e) {
        console.warn("Metronome visual trigger failed to sound:", e);
      }
      setBeatTick(true);
      setTimeout(() => setBeatTick(false), 90);
    };

    triggerBeat();
    const timer = setInterval(triggerBeat, intervalMs);
    return () => clearInterval(timer);
  }, [metronomeActive, bpm]);

  return (
    <div className="flex-grow flex flex-col justify-between h-full w-full relative select-none pt-1">
      <div className="grid grid-cols-3 gap-1.5 flex-grow overflow-y-auto pr-0.5 pointer-events-auto min-h-0 pb-1.5 scrollbar-thin">
        {sounds.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => playSound(s.id)}
            className={`flex flex-col items-center justify-center gap-1.5 p-1 px-1.5 rounded-xl transition-all active:scale-90 group cursor-pointer shadow-sm border-b-2 overflow-hidden relative ${
              currentIsLight
                ? "bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-700"
                : "bg-zinc-800/80 border-slate-900 shadow-black/40 hover:border-indigo-505 dark:hover:border-indigo-500 hover:bg-zinc-700/80 text-slate-200"
            }`}
          >
            <div className="absolute inset-0 bg-indigo-500 opacity-0 group-hover:opacity-5 pointer-events-none transition-opacity" />
            
            <div className={`w-7 h-7 rounded-full flex items-center justify-center filter drop-shadow-sm transition-transform duration-300 group-hover:-translate-y-0.5 ${currentIsLight ? 'bg-slate-50' : 'bg-black/30'}`}>
                <span className="text-lg group-hover:scale-115 transition-transform">{s.emoji}</span>
            </div>
            
            <span className="text-[8.5px] font-black uppercase text-center tracking-widest truncate w-full group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Metronome control deck at footer */}
      <div className={`mt-1.5 p-2 rounded-xl flex items-center justify-between gap-1.5 pointer-events-auto transition-colors ${
        currentIsLight ? 'bg-slate-100/80 border border-slate-200' : 'bg-zinc-950/40 border border-white/5'
      }`}>
        <div className="flex items-center gap-2">
          {/* Pulsing visual light indicator */}
          <div className={`w-3.5 h-3.5 rounded-full transition-all duration-75 flex items-center justify-center shrink-0 border ${
            beatTick 
              ? 'bg-gradient-to-r from-rose-500 to-rose-455 scale-125 border-transparent shadow shadow-rose-500/50' 
              : 'bg-zinc-300 dark:bg-zinc-800 border-transparent'
          }`} />
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Tempo</span>
            <span className="text-[10px] font-black tracking-tighter text-indigo-500 dark:text-indigo-400">{bpm} BPM</span>
          </div>
        </div>

        <input
          type="range"
          min="40"
          max="240"
          value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="flex-grow max-w-[90px] h-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 accent-indigo-500 cursor-pointer"
        />

        <button
          onClick={() => setMetronomeActive(!metronomeActive)}
          className={`px-3 py-1 text-[8.5px] uppercase font-black tracking-widest rounded-lg transition-all active:scale-95 cursor-pointer ${
            metronomeActive 
              ? 'bg-rose-500 text-white shadow shadow-rose-500/20' 
              : 'bg-indigo-500 text-white shadow shadow-indigo-500/20 hover:bg-indigo-650'
          }`}
        >
          {metronomeActive ? 'Stop' : 'Metronom'}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// WIDGET 14: TO-DO (TodoWidgetContent)
// ==========================================
interface TodoWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  todoList?: { id: string; text: string; done: boolean }[];
  setTodoList?: React.Dispatch<React.SetStateAction<{ id: string; text: string; done: boolean }[]>>;
  currentIsLight: boolean;
  isFullscreen?: boolean;
}

export const TodoWidgetContent: React.FC<TodoWidgetProps> = (props) => {
  return <TodoWidget {...props} />;
};

// ==========================================
// WIDGET 15: DIENSTE (DiensteWidgetContent)
// ==========================================
export const DiensteWidgetContent: React.FC<DiensteWidgetProps> = (props) => {
  return <DiensteWidget {...props} />;
};

// ==========================================
// WIDGET 16: LINKS (LinksWidgetContent)
// ==========================================
export const LinksWidgetContent: React.FC<LinksWidgetProps> = (props) => {
  return <LinksWidget {...props} />;
};

// ==========================================
// WIDGET 17: CLASS PET (PetWidgetContent)
// ==========================================
export const PetWidgetContent: React.FC<{
  app: any;
  setApp: any;
  currentIsLight: boolean;
}> = ({ app, setApp, currentIsLight }) => {
  const petCanvasRef = useRef<ClassPetCanvasRef>(null);
  const [speechBubble, setSpeechBubble] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [clickAnimationType, setClickAnimationType] = useState<"jump" | "spin">("jump");
  const [animationTrigger, setAnimationTrigger] = useState<boolean>(false);

  const handlePetClick = () => {
    const isSpin = Math.random() < 0.4;
    setClickAnimationType(isSpin ? "spin" : "jump");
    if (petCanvasRef.current) {
      if (isSpin) {
        petCanvasRef.current.celebrate();
      } else {
        petCanvasRef.current.bounce();
      }
    }
    setAnimationTrigger(true);
    setTimeout(() => setAnimationTrigger(false), 850);
  };

  const DEFAULT_PET_STATE = {
    enabled: true,
    animalType: 'dog',
    name: 'Bello',
    energy: 50,
    knowledge: 50,
    hunger: 50,
    fun: 50,
    accessories: [],
    history: [],
    level: 1,
    xp: 0,
    children: [
      { name: "Lukas", strength: "Rechnen & Knobeln 🧠" },
      { name: "Mia", strength: "Malen & Kreativität 🎨" },
      { name: "Noah", strength: "Dichten & Vorlesen 📖" },
      { name: "Emma", strength: "Natur & Pflanzen 🌿" }
    ]
  };
  
  // Use global app classPet state and merge with defaults for stable preservation
  const petState = { ...DEFAULT_PET_STATE, ...(app.classPet || {}) };
  const kids = petState.children || DEFAULT_PET_STATE.children;

  const [editName, setEditName] = useState<string>(petState.name);
  const [editType, setEditType] = useState<string>(petState.animalType);
  const [editKids, setEditKids] = useState<{name: string, strength: string}[]>(kids);

  // Sync state once editor opens
  useEffect(() => {
    if (isEditing) {
      setEditName(petState.name);
      setEditType(petState.animalType);
      setEditKids(kids);
    }
  }, [isEditing]);

  const handleFeed = () => {
    petCanvasRef.current?.feed();
    setSpeechBubble("Mmmh, lecker! 😋");
    
    // Update global state: increase energy and hunger
    setApp((prev: any) => ({
      ...prev,
      classPet: {
        ...petState,
        energy: Math.min(100, (petState.energy || 50) + 10),
        hunger: Math.min(100, (petState.hunger || 50) + 15)
      }
    }));
    
    setTimeout(() => setSpeechBubble(null), 3000);
  };

  const generateAIQuote = async () => {
    setIsSpeaking(true);
    setSpeechBubble("Hmm, lass mich kurz überlegen...");
    
    // Pick a random child if available to personalize the greeting
    const targetKid = editKids.length > 0 ? editKids[Math.floor(Math.random() * editKids.length)] : null;
    
    try {
       let prompt = `Du bist ein liebenswertes und witziges Klassentier (Name: ${petState.name}, Typ: ${petState.animalType}). Sag einen sehr kurzen, aufmunternden oder witzigen Satz zur Klasse (max. 10 Wörter).`;
       if (targetKid) {
         prompt = `Du bist ein liebenswertes Klassentier namens ${petState.name} (ein ${petState.animalType}). Sag einen extrem kurzen, aufgeweckten Satz zur Klasse (max. 12 Wörter) und grüße dabei das Kind ${targetKid.name} für seine tolle Stärke "${targetKid.strength}".`;
       }

       const response = await askAI('ki-klassentier', prompt);
       if (response) {
          let cleanResp = response.replace(/"/g, '').trim();
          setSpeechBubble(cleanResp);
          petCanvasRef.current?.bounce();
          
          const audioBase64 = await generatePetSpeech(cleanResp, "Kore");
          if (audioBase64) {
            if (audio) audio.pause();
            const snd = new Audio(`data:audio/mp3;base64,${audioBase64}`);
            snd.play();
            setAudio(snd);
          }
       }
    } catch(err) {
       console.error("AI class pet error", err);
       if (targetKid) {
         setSpeechBubble(`Hallo! ${targetKid.name}, du bist spitze in ${targetKid.strength}! ✨`);
       } else {
         setSpeechBubble(`Hallo! Ich bin euer ${petState.name}!`);
       }
    }
    setIsSpeaking(false);
    setTimeout(() => setSpeechBubble(null), 7000);
  };

  const saveSettings = () => {
    setApp((prev: any) => ({
      ...prev,
      classPet: {
        ...petState,
        name: editName,
        animalType: editType,
        children: editKids
      }
    }));
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 pointer-events-auto overflow-y-auto bg-slate-50 dark:bg-zinc-900 rounded-xl">
        <div className="shrink-0 flex justify-between items-center mb-1.5 border-b pb-1 border-slate-200 dark:border-zinc-800">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500">
            ⚙️ Klassentier Einstellungen
          </span>
          <button 
            onClick={() => setIsEditing(false)}
            className="text-[8px] font-extrabold text-slate-400 hover:text-red-500 cursor-pointer"
          >
            Schließen
          </button>
        </div>

        {/* Setting Inputs */}
        <div className="flex-grow space-y-2 text-[9px] min-h-0 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="font-extrabold text-slate-500 block mb-0.5">Name des Tiers:</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-1.5 py-1 text-[9px] font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-850"
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-500 block mb-0.5">Tierart:</label>
              <select 
                value={editType}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setEditType(newType);
                  const breed = PET_BREEDS.find((b) => b.id === newType) || PET_BREEDS[0];
                  const isDefaultName = PET_BREEDS.some((b) => b.nameDefault === editName) || !editName;
                  if (isDefaultName) {
                    setEditName(breed.nameDefault);
                  }
                }}
                className="w-full px-1.5 py-1 text-[9px] font-bold rounded-lg border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-850"
              >
                {PET_BREEDS.map((breed) => (
                  <option key={breed.id} value={breed.id}>
                    {breed.breedLabel} {breed.emoji}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 mt-2">
              <span className="font-black text-slate-500 uppercase text-[8px] tracking-wide">Kinder & Stärken</span>
              <button 
                onClick={() => setEditKids([...editKids, { name: "Kind", strength: "Stärke" }])}
                className="px-1.5 py-0.5 rounded bg-indigo-505 bg-indigo-500 text-white font-black text-[7.5px] cursor-pointer"
              >
                + Neu
              </button>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto border p-1 rounded-lg bg-white/50 dark:bg-black/20 border-slate-200 dark:border-zinc-800">
              {editKids.map((kid, idx) => (
                <div key={idx} className="flex gap-1 items-center bg-white dark:bg-zinc-800/50 p-1 rounded-md shadow-2xs">
                  <input 
                    type="text" 
                    value={kid.name}
                    placeholder="Vorname"
                    onChange={(e) => {
                      const copy = [...editKids];
                      copy[idx].name = e.target.value;
                      setEditKids(copy);
                    }}
                    className="w-14 px-1 py-0.5 border text-[8px] font-bold rounded"
                  />
                  <input 
                    type="text" 
                    value={kid.strength}
                    placeholder="Stärke / Talent"
                    onChange={(e) => {
                      const copy = [...editKids];
                      copy[idx].strength = e.target.value;
                      setEditKids(copy);
                    }}
                    className="flex-1 px-1 py-0.5 border text-[8px] font-bold rounded"
                  />
                  <button 
                    onClick={() => setEditKids(editKids.filter((_, i) => i !== idx))}
                    className="text-red-500 text-[8px] font-extrabold px-1 cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="shrink-0 flex gap-1 mt-2.5">
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 py-1 bg-slate-250 bg-slate-200 text-slate-700 font-black text-[8px] uppercase tracking-wider rounded-lg text-center cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={saveSettings}
            className="flex-1 py-1 bg-emerald-500 text-white font-black text-[8px] uppercase tracking-wider rounded-lg text-center cursor-pointer"
          >
            Speichern
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onDoubleClick={() => setIsEditing(true)}
      title="Doppelklick für Einstellungen"
      className="flex-grow flex flex-col justify-between h-full w-full relative select-none pointer-events-auto"
    >
      <div className="absolute top-1 left-1 right-1 z-30 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <select
            value={petState.animalType}
            onChange={(e) => {
              const newType = e.target.value as any;
              const breed = PET_BREEDS.find((b) => b.id === newType) || PET_BREEDS[0];
              const isDefaultName = PET_BREEDS.some((b) => b.nameDefault === petState.name) || !petState.name;
              const newName = isDefaultName ? breed.nameDefault : petState.name;
              setApp((prev: any) => ({
                ...prev,
                classPet: {
                  ...petState,
                  animalType: newType,
                  name: newName,
                }
              }));
            }}
            className="px-1.5 py-0.5 text-[8.5px] font-black rounded-md border border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-850/95 shadow-xs text-slate-700 dark:text-neutral-200 cursor-pointer focus:outline-hidden"
            title="Haustier direkt im Lehrercockpit ändern"
          >
            {PET_BREEDS.map((breed) => (
              <option key={breed.id} value={breed.id}>
                {breed.emoji} {breed.nameDefault}
              </option>
            ))}
          </select>
        </div>
        <div className="pointer-events-auto">
          <button 
            onClick={() => setIsEditing(true)}
            className="p-1 rounded bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 border border-slate-200 dark:border-white/5 cursor-pointer"
            title="Tiereinstellungen öffnen"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center relative pointer-events-auto overflow-hidden">
        
        <AnimatePresence>
          {speechBubble && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              onClick={() => setSpeechBubble(null)}
              className="absolute top-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] leading-snug font-bold py-2 px-3 rounded-2xl shadow-xl w-44 text-center z-50 cursor-pointer select-none border-2 border-indigo-400"
            >
              <div>{speechBubble}</div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-indigo-500" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="relative w-28 h-28 flex items-center justify-center shrink-0 bg-gradient-to-b from-indigo-50/20 to-white/60 dark:from-zinc-800/20 dark:to-zinc-950/60 border border-indigo-100/40 dark:border-white/5 shadow-inner rounded-full overflow-hidden cursor-pointer mb-2"
          onClick={handlePetClick}
          animate={
            animationTrigger
              ? clickAnimationType === "spin"
                ? {
                    rotate: [0, 360],
                    scale: [1, 1.15, 0.95, 1],
                    y: [0, -15, 0],
                  }
                : {
                    y: [0, -35, 8, -3, 0],
                    scale: [1, 1.12, 0.88, 1.05, 1],
                    rotate: [0, -6, 6, -3, 0],
                  }
              : { y: 0, scale: 1, rotate: 0 }
          }
          transition={{
            duration: 0.85,
            ease: "easeInOut",
          }}
          whileHover={{ scale: 1.05 }}
          title="Klick mich!"
        >
          {/* Pet Canvas */}
          <div className="absolute inset-0 pointer-events-none z-10 w-full h-full flex items-center justify-center">
            <ClassPetCanvas
              ref={petCanvasRef}
              isCalm={true}
              animalType={petState.animalType}
              accessories={petState.accessories}
              behaviorMode={petState.behaviorMode || "auto"}
              energy={petState.energy}
              scale={(petState.scale || 1.0) * 0.95}
            />
          </div>

          {/* Small touch hint overlay */}
          <div className="absolute bottom-1.5 text-[6.5px] font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-slate-100 dark:border-white/5 select-none animate-pulse pointer-events-none z-20 shadow-xs">
            👆 Klick!
          </div>
        </motion.div>

        <div className="text-center w-full z-10 bottom-2 absolute pt-1 bg-gradient-to-t from-white via-white/80 dark:from-black dark:via-black/80 to-transparent">
           <div className={`text-xs font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-800' : 'text-white'}`}>
             {petState.name}
           </div>
           <div className={`text-[8.5px] font-bold uppercase tracking-wider ${currentIsLight ? 'text-indigo-500' : 'text-indigo-400'}`}>
             Stufe {petState.level || 1} • {petState.xp || 0} XP
           </div>
        </div>
      </div>

      <div className="shrink-0 flex gap-1 p-1 z-25 border-t border-dashed border-gray-400/20 pointer-events-auto bg-white/50 dark:bg-black/50 backdrop-blur-md">
         <button
            onClick={handleFeed}
            className="flex-grow py-1.5 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-xl shadow-sm hover:bg-emerald-600 transition-all cursor-pointer text-center active:scale-95 flex items-center justify-center gap-1"
          >
            🍎 Füttern
         </button>
         <button
            disabled={isSpeaking}
            onClick={generateAIQuote}
            className={`flex-grow py-1.5 border font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 ${
              currentIsLight 
                ? "bg-slate-50 border-slate-200 text-indigo-600 hover:bg-slate-100 shadow-sm" 
                : "bg-indigo-500/20 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30"
            }`}
          >
            {isSpeaking ? <span className="animate-spin">⏳</span> : <Sparkles size={11} />}
            Sprechen
         </button>
      </div>
    </div>
  );
};

// --- Drawing Widget (Zeichentafel) ---
export const DRAWING_WIDGET_FONTS = [
  { id: 'sans', name: 'Standard (Inter)', family: 'Inter', css: 'Inter, sans-serif' },
  { id: 'edu', name: 'Schreibschrift', family: 'Edu VIC WA NT Beginner', css: '"Edu VIC WA NT Beginner", cursive' },
  { id: 'playpen', name: 'Marker (Playpen)', family: 'Playpen Sans', css: '"Playpen Sans", sans-serif' },
  { id: 'kalam', name: 'Kreide (Kalam)', family: 'Kalam', css: 'Kalam, cursive' },
  { id: 'caveat', name: 'Deko (Caveat)', family: 'Caveat', css: 'Caveat, cursive' },
  { id: 'patrick', name: 'Handschrift (Patrick)', family: 'Patrick Hand', css: '"Patrick Hand", cursive' },
  { id: 'comic', name: 'Comic Neue', family: 'Comic Neue', css: '"Comic Neue", sans-serif' },
  { id: 'mono', name: 'Mono (JetBrains)', family: 'JetBrains Mono', css: '"JetBrains Mono", monospace' },
  { id: 'outfit', name: 'Modern (Outfit)', family: 'Outfit', css: 'Outfit, sans-serif' },
  { id: 'playfair', name: 'Klassisch (Playfair)', family: 'Playfair Display', css: '"Playfair Display", serif' },
  { id: 'lexend', name: 'Lesbar (Lexend)', family: 'Lexend', css: 'Lexend, sans-serif' },
  { id: 'fredoka', name: 'Verspielt (Fredoka)', family: 'Fredoka', css: 'Fredoka, sans-serif' },
  { id: 'comfortaa', name: 'Rund (Comfortaa)', family: 'Comfortaa', css: 'Comfortaa, sans-serif' },
  { id: 'pixel', name: 'Pixel (Press Start)', family: 'Press Start 2P', css: '"Press Start 2P", monospace' },
];

export { DrawingWidget };

export const DrawingWidgetContent: React.FC<DrawingWidgetProps> = (props) => {
  return <DrawingWidget {...props} />;
};

export { StopwatchWidget };
export type { StopwatchWidgetProps };

export const StopwatchWidgetContent: React.FC<StopwatchWidgetProps> = (props) => {
  return <StopwatchWidget {...props} />;
};

const evaluateCalculatorExpression = (input: string): number => {
  const expression = input.replace(/x/g, '*').replace(/\s+/g, '');
  let index = 0;

  const parseNumber = (): number => {
    const start = index;
    while (index < expression.length && /[0-9.]/.test(expression[index])) index += 1;
    const token = expression.slice(start, index);
    if (!token || (token.match(/\./g)?.length ?? 0) > 1) throw new Error('Invalid number');
    const value = Number(token);
    if (!Number.isFinite(value)) throw new Error('Invalid number');
    return value;
  };

  const parseFactor = (): number => {
    if (expression[index] === '+') {
      index += 1;
      return parseFactor();
    }
    if (expression[index] === '-') {
      index += 1;
      return -parseFactor();
    }
    return parseNumber();
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    while (expression[index] === '*' || expression[index] === '/' || expression[index] === '%') {
      const operator = expression[index++];
      const right = parseFactor();
      if ((operator === '/' || operator === '%') && right === 0) throw new Error('Division by zero');
      if (operator === '*') value *= right;
      else if (operator === '/') value /= right;
      else value %= right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (expression[index] === '+' || expression[index] === '-') {
      const operator = expression[index++];
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (index !== expression.length || !Number.isFinite(result)) throw new Error('Invalid expression');
  return result;
};

// --- Calculator Widget ---
export const CalculatorWidgetContent: React.FC<{ widget: any, currentIsLight: boolean, isFullscreen?: boolean }> = ({ widget, currentIsLight, isFullscreen }) => {
  return <CalculatorWidget widget={widget} currentIsLight={currentIsLight} isFullscreen={isFullscreen} />;
};

// --- Dice Widget ---
const DICE_FACES = [
  "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"
];

// Helper to render customized physical die dots
const renderDieDots = (val: number, dotColor: string) => {
  const dotClass = `w-2 h-2 rounded-full ${dotColor} transition-all duration-300`;
  switch (val) {
    case 1:
      return (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${dotClass} w-2.5 h-2.5 shadow-xs`} />
        </div>
      );
    case 2:
      return (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          <div className="flex justify-start"><div className={dotClass} /></div>
          <div className="flex justify-end"><div className={dotClass} /></div>
        </div>
      );
    case 3:
      return (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          <div className="flex justify-start"><div className={dotClass} /></div>
          <div className="flex justify-center"><div className={dotClass} /></div>
          <div className="flex justify-end"><div className={dotClass} /></div>
        </div>
      );
    case 4:
      return (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
        </div>
      );
    case 5:
      return (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
          <div className="flex justify-center">
            <div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
        </div>
      );
    case 6:
    default:
      return (
        <div className="absolute inset-0 p-2 flex flex-col justify-between">
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
          <div className="flex justify-between">
            <div className={dotClass} /><div className={dotClass} />
          </div>
        </div>
      );
  }
};

const getDieStyles = (idx: number, mode: 'sum' | 'diff' | 'prod') => {
  if (mode === 'diff') {
    if (idx === 0) {
      return {
        bg: "bg-gradient-to-br from-blue-400 to-blue-600 text-white border-2 border-blue-300 dark:border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.35)]",
        dot: "bg-white",
        label: "Startwert 🔵",
        badge: "bg-blue-500 text-white"
      };
    } else {
      return {
        bg: "bg-gradient-to-br from-rose-400 to-red-600 text-white border-2 border-rose-300 dark:border-red-500 shadow-[0_4px_12px_rgba(239,68,68,0.35)]",
        dot: "bg-white",
        label: `Abzug ${idx} 🔴`,
        badge: "bg-rose-500 text-white"
      };
    }
  } else if (mode === 'prod') {
    return {
      bg: "bg-gradient-to-br from-amber-400 to-amber-600 text-white border-2 border-amber-300 dark:border-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.35)]",
      dot: "bg-white",
      label: `Faktor ${idx + 1} 🟡`,
      badge: "bg-amber-500 text-white"
    };
  } else {
    // sum
    return {
      bg: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-2 border-emerald-300 dark:border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.35)]",
      dot: "bg-white",
      label: `Zahl ${idx + 1} 🟢`,
      badge: "bg-emerald-500 text-white"
    };
  }
};

type ClassroomDiceMode = 'sum' | 'diff' | 'prod';
const validDice = (values: unknown): number[] =>
  Array.isArray(values) && values.length >= 1 && values.length <= 6 &&
  values.every(value => Number.isInteger(value) && value >= 0 && value < 6)
    ? values : [0, 0];
export const DiceWidgetContent: React.FC<{
  widget: any; onUpdate?: (updates: any) => void; currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const [dice, setDice] = useState<number[]>(() => validDice(widget?.settings?.diceValues));
  const [rolling, setRolling] = useState(false);
  const [mathMode, setMathMode] = useState<ClassroomDiceMode>(() =>
    widget?.settings?.diceMathMode === 'diff' || widget?.settings?.diceMathMode === 'prod'
      ? widget.settings.diceMathMode : 'sum');
  const [revealed, setRevealed] = useState(false);
  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const persistDice = (values: number[], mode: ClassroomDiceMode) => {
    if (onUpdate && widget?.id) onUpdate({ settings: {
      ...(widget.settings || {}), diceValues: values, diceMathMode: mode,
    } });
  };
  useEffect(() => {
    return () => { if (rollTimerRef.current) clearInterval(rollTimerRef.current); };
  }, []);
  useEffect(() => {
    if (!rolling) {
      setDice(validDice(widget?.settings?.diceValues));
      if (widget?.settings?.diceMathMode === 'sum' || widget?.settings?.diceMathMode === 'diff' ||
          widget?.settings?.diceMathMode === 'prod') setMathMode(widget.settings.diceMathMode);
    }
  }, [widget?.settings?.diceValues, widget?.settings?.diceMathMode]);

  const roll = () => {
    if (rollTimerRef.current) return;
    setRolling(true);
    setRevealed(false);
    let rolls = 0;
    rollTimerRef.current = setInterval(() => {
      rolls += 1;
      if (rolls >= 16) {
        if (rollTimerRef.current) clearInterval(rollTimerRef.current);
        rollTimerRef.current = null;
        const nextValues = dice.map(() => Math.floor(Math.random() * 6));
        setDice(nextValues);
        setRolling(false);
        persistDice(nextValues, mathMode);
      } else setDice(prev => prev.map(() => Math.floor(Math.random() * 6)));
    }, 50);
  };

  const rollAction = useAccessibleAction(roll);
  const coverResultAction = useAccessibleAction(() => setRevealed(false));

  const values = useMemo(() => dice.map(d => d + 1), [dice]);

  const resultValue = useMemo(() => {
    if (mathMode === 'prod') {
      return values.reduce((acc, curr) => acc * curr, 1);
    } else if (mathMode === 'diff') {
      // First die minus all subsequent dice
      return values.reduce((acc, curr, idx) => idx === 0 ? curr : acc - curr, 0);
    } else {
      return values.reduce((acc, curr) => acc + curr, 0);
    }
  }, [values, mathMode]);

  const resultLabel = useMemo(() => {
    if (mathMode === 'prod') return 'Produkt';
    if (mathMode === 'diff') return 'Differenz';
    return 'Summe';
  }, [mathMode]);

  const changeDiceCount = (action: 'add' | 'remove') => {
    if (rolling || rollTimerRef.current) return;
    setRevealed(false);
    const next = action === 'remove' && dice.length > 1 ? dice.slice(0, -1)
      : action === 'add' && dice.length < 6 ? [...dice, 0] : dice;
    setDice(next);
    persistDice(next, mathMode);
  };

  const equationDisplay = useMemo(() => {
    if (mathMode === 'diff') {
      return (
        <div className="flex items-center gap-1 font-mono text-xs font-black select-none">
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-blue-500 text-white shadow-xs text-[10px]">🔵 {values[0]}</span>
          {values.slice(1).map((val, idx) => (
            <React.Fragment key={idx}>
              <span className="mx-0.5 text-slate-400 font-extrabold">-</span>
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-rose-500 text-white shadow-xs text-[10px]">🔴 {val}</span>
            </React.Fragment>
          ))}
          <span className="mx-1 text-indigo-500 font-extrabold">=</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{resultValue}</span>
        </div>
      );
    } else if (mathMode === 'prod') {
      return (
        <div className="flex items-center gap-1 font-mono text-xs font-black select-none">
          {values.map((val, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="mx-0.5 text-slate-400 font-extrabold">×</span>}
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-amber-500 text-white shadow-xs text-[10px]">🟡 {val}</span>
            </React.Fragment>
          ))}
          <span className="mx-1 text-indigo-500 font-extrabold">=</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{resultValue}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 font-mono text-xs font-black select-none">
          {values.map((val, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="mx-0.5 text-slate-400 font-extrabold">+</span>}
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-emerald-500 text-white shadow-xs text-[10px]">🟢 {val}</span>
            </React.Fragment>
          ))}
          <span className="mx-1 text-indigo-500 font-extrabold">=</span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{resultValue}</span>
        </div>
      );
    }
  }, [values, mathMode, resultValue]);

  return (
    <div className="flex-grow flex flex-col items-center justify-between p-2 gap-2 h-full pointer-events-auto min-h-0 overflow-y-auto">
      {/* Selector Toolbar - Number of Dice */}
      <div className="flex items-center gap-1 shrink-0 z-10 select-none">
        <span className={`text-[8.5px] font-black uppercase tracking-wider ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>Würfel:</span>
        {[1, 2, 3, 4, 5, 6].map((num) => (
          <button
            type="button"
            key={num}
            disabled={rolling}
            onClick={() => {
              setRevealed(false);
              const next = Array.from({ length: num }, () => Math.floor(Math.random() * 6));
              setDice(next);
              persistDice(next, mathMode);
            }}
            aria-label={`${num} Würfel auswählen`}
            aria-pressed={dice.length === num}
            className={`min-w-11 min-h-11 rounded-lg text-xs font-black transition-all cursor-pointer hover:scale-105 active:scale-95 border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
              dice.length === num
                ? 'bg-indigo-500 border-transparent text-white shadow-sm'
                : currentIsLight
                ? 'bg-white border-slate-200 text-slate-650 hover:bg-slate-100'
                : 'bg-zinc-900 border-white/10 text-slate-300 hover:bg-zinc-800'
            }`}
          >
            {num}
          </button>
        ))}
      </div>

      <div className="flex-grow flex flex-col items-center justify-center gap-2 py-1 select-none">
        {/* Dice displays */}
        <div className="flex gap-2.5 flex-wrap justify-center items-center max-w-full">
          {dice.map((d, i) => {
            const val = d + 1;
            const style = getDieStyles(i, mathMode);
            return (
              <div key={i} className="flex flex-col items-center gap-1 select-none">
                <motion.button
                  type="button"
                  role="button" tabIndex={0}
                  {...rollAction.buttonProps}
                  aria-label={`Würfel ${i + 1} werfen`}
                  animate={rolling ? { 
                    rotate: [0, 180, 360], 
                    scale: [1, 1.15, 1],
                    y: [0, -12, 0]
                  } : {}}
                  transition={{ 
                    duration: 0.4, 
                    repeat: rolling ? Infinity : 0, 
                    ease: "easeInOut" 
                  }}
                  className={`min-w-11 min-h-11 w-12 h-12 md:w-14 md:h-14 rounded-2xl relative cursor-pointer flex items-center justify-center ${style.bg} select-none hover:scale-105 active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent`}
                >
                  {/* Glare and 3D effects */}
                  <div className="absolute inset-0 rounded-2xl border border-white/20 pointer-events-none" />
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/10 rounded-t-2xl pointer-events-none" />

                  {/* 1 to 6 custom dots */}
                  {renderDieDots(val, style.dot)}
                </motion.button>

                {/* Subtitle Label for each die showing start/subtract value */}
                <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-400">
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Math mode result with covering mechanism */}
        {!rolling && (
          <div className="flex flex-col items-center gap-2 mt-1">
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="min-h-11 px-3.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-[9px] uppercase tracking-wider shadow-md hover:scale-102 cursor-pointer active:scale-95 transition-all flex items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span>🧠</span> Ergebnis raten (Aufdecken!)
              </button>
            ) : (
              <motion.button
                type="button"
                {...coverResultAction.buttonProps}
                aria-label="Ergebnis wieder verdecken"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`min-h-11 p-2 rounded-xl border shadow-sm cursor-pointer select-none hover:opacity-95 active:scale-95 transition-all flex flex-col items-center gap-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  currentIsLight ? 'bg-indigo-50 border-indigo-150 text-indigo-700' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                }`}
                title="Wieder verdecken"
              >
                <div className="text-[7.5px] font-black uppercase tracking-widest opacity-60">Rechnung ({resultLabel}):</div>
                {equationDisplay}
              </motion.button>
            )}

            {/* Arithmetic Toggles */}
            {dice.length > 1 && (
              <div className="flex gap-1 items-center justify-center border border-dashed rounded-lg p-0.5 border-slate-200 dark:border-white/10 select-none">
                {[
                  { mode: 'sum', icon: '+', label: 'Summe' },
                  { mode: 'diff', icon: '-', label: 'Differenz' },
                  { mode: 'prod', icon: '×', label: 'Produkt' }
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => {
                      const mode = item.mode as ClassroomDiceMode;
                      setMathMode(mode);
                      setRevealed(false);
                      persistDice(dice, mode);
                    }}
                    aria-pressed={mathMode === item.mode}
                    className={`min-h-11 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                      mathMode === item.mode
                        ? 'bg-indigo-500 text-white shadow-xs'
                        : currentIsLight
                        ? 'text-slate-500 hover:bg-slate-100'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                    title={item.label}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-1.5 w-full justify-center shrink-0">
        <button type="button" aria-label="Einen Würfel entfernen" disabled={rolling || dice.length <= 1} onClick={() => changeDiceCount('remove')} className={`min-h-11 min-w-11 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${currentIsLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}>-1</button>
        <button type="button" {...rollAction.buttonProps} aria-label="Würfel werfen" disabled={rolling} className="flex-1 min-h-11 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] uppercase font-black tracking-widest shadow-md hover:scale-102 cursor-pointer active:scale-95 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Würfeln!</button>
        <button type="button" aria-label="Einen Würfel hinzufügen" disabled={rolling || dice.length >= 6} onClick={() => changeDiceCount('add')} className={`min-h-11 min-w-11 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 border focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${currentIsLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-white/5 hover:bg-white/10 text-white border-white/10'}`}>+1</button>
      </div>
    </div>
  );
};

// --- AI Quiz & Riddle Helpers ---
const safeExtractJSON = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const sliced = text.slice(start, end + 1);
      try {
        return JSON.parse(sliced);
      } catch (err) {
        // Clean invisible control-chars
        const cleaned = sliced
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .trim();
        return JSON.parse(cleaned);
      }
    }
    throw new Error("Invalid JSON: " + text);
  }
};

export const AIQuizWidgetContent: React.FC<{ widget: any, onUpdate?: (updates: any) => void, currentIsLight: boolean }> = ({ widget, onUpdate, currentIsLight }) => {
  const storedQuiz = validClassroomQuiz(widget?.settings?.classroomQuiz);
  const [topic, setTopic] = useState(storedQuiz?.t || "Tiere");
  const [selectedCategory, setSelectedCategory] = useState("Zufall");
  const [customTopic, setCustomTopic] = useState("");
  const [popularTopics, setPopularTopics] = useState<string[]>([
    "Österreich",
    "Haustiere",
    "Saurier",
    "Weltall",
    "Multiplikation",
    "Wald"
  ]);
  const [question, setQuestion] = useState(storedQuiz?.q || "Welches Tier ist das größte landlebende Säugetier?");
  const [options, setOptions] = useState<string[]>(storedQuiz?.o || ["Elefant", "Giraffe", "Nashorn", "Nilpferd"]);
  const [answer, setAnswer] = useState(storedQuiz?.a ?? 0);
  const [selected, setSelected] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<'Leicht' | 'Mittel' | 'Schwer'>(() =>
    ['Leicht', 'Mittel', 'Schwer'].includes(widget?.settings?.quizDifficulty)
      ? widget.settings.quizDifficulty : 'Mittel');
  const saveQuestion = (candidate: unknown, chosenDifficulty: 'Leicht' | 'Mittel' | 'Schwer') => {
    const valid = validClassroomQuiz(candidate);
    if (!valid) return false;
    setTopic(valid.t);
    setQuestion(valid.q);
    setOptions(valid.o);
    setAnswer(valid.a);
    if (onUpdate && widget?.id) onUpdate({ settings: {
      ...(widget.settings || {}), classroomQuiz: valid, quizDifficulty: chosenDifficulty,
    } });
    return true;
  };

  const categories = [
    { id: "Zufall", label: "🎲 Zufall" },
    { id: "Tiere", label: "🐾 Tiere" },
    { id: "Weltraum", label: "🚀 Weltall" },
    { id: "Saurier", label: "🦖 Dinos" },
    { id: "Mathe", label: "➕ Mathe" },
    { id: "Sachkunde", label: "🧠 Wissen" },
  ];

  const generateNew = async (forcedCategory?: string, forcedDifficulty?: 'Leicht' | 'Mittel' | 'Schwer') => {
    if (isLoading) return;
    setIsLoading(true);
    setSelected(null);
    setFeedbackMessage(null);
    const catToUse = forcedCategory || selectedCategory;
    const diffToUse = forcedDifficulty || difficulty;

    try {
      const categoryPrompt = catToUse === "Zufall"
        ? "aus einem beliebigen lehrreichen und kindgerechten Sachbereich (Natur, Weltall, Technik, Geschichte, Haustiere, Biologie, Sport)"
        : `spezifisch aus dem Bereich oder Thema "${catToUse}"`;

      const prompt = `Erstelle eine kurze, kindgerechte und spannende Quizfrage (Multiple Choice, genau 4 Antworten) für Grundschulkinder im Alter von 8-10 Jahren ${categoryPrompt} mit dem Schwierigkeitsgrad "${diffToUse}".
Gib die Antwort AUSSCHLIESSLICH im puren JSON-Format zurück, ohne umschließende Code-Zäune wie \`\`\`json.
Strikte JSON-Struktur:
{"t":"${(catToUse === "Zufall" ? "Mischmasch" : catToUse).substring(0, 16)}", "q":"Hier steht die spannende Frage?", "o":["Antwort A (Falsch)","Antwort B (Richtig/Falsch)","Antwort C (Richtig/Falsch)","Antwort D (Richtig/Falsch)"], "a": IndexDerKorrektenAntwortAlsZahlVon0Bis3}`;

      const response = await askAI('ki-quiz', prompt);
      if (response) {
        const data = safeExtractJSON(response.trim());
        if (!saveQuestion(data, diffToUse)) throw new Error('Ungültige Quizfrage erhalten');
      }
    } catch (err) {
      console.error("AI Quiz generation error:", err);
      // Nice educational fallback so the widget NEVER completely breaks
      const fallbackQuestions = [
        { t: "Natur", q: "Warum verfärben sich Blätter im Herbst bunt?", o: ["Weil sie alt werden", "Weil der Baum Nährstoffe zurückzieht", "Durch den Regen", "Weil Tiere sie anknabbern"], a: 1 },
        { t: "Weltraum", q: "Welcher Planet ist der Sonne am nächsten?", o: ["Venus", "Erde", "Merkur", "Mars"], a: 2 },
        { t: "Mathe", q: "Wie viele Minuten hat eine ganze Stunde?", o: ["60 Minuten", "100 Minuten", "50 Minuten", "120 Minuten"], a: 0 }
      ];
      const selectedFallback = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      saveQuestion(selectedFallback, diffToUse);
    }
    setIsLoading(false);
  };

  const handleSelect = (idx: number) => {
    if (isLoading || selected !== null || idx < 0 || idx >= options.length) return;
    setSelected(idx);
    if (idx === answer) {
      setFeedbackMessage("🎉 Richtig gelöst! Großartig gemacht! 🌟");
    } else {
      setFeedbackMessage(`😢 Fast! Die richtige Antwort wäre gewesen: "${options[answer]}"`);
    }
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-between p-3 select-none relative h-full w-full pointer-events-auto min-h-0 overflow-y-auto ki-quiz-container">
      {/* Category badgess at the top */}
      <div className="w-full flex flex-col gap-1.5 mb-2.5 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[8.5px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 ${currentIsLight ? 'bg-indigo-100 text-indigo-600' : 'bg-indigo-500/20 text-indigo-400'}`}>
              <Sparkles size={10} className="text-amber-400 animate-pulse" /> KI Quiz: {topic}
            </span>
            {/* Colored Difficulty Badge */}
            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shadow-xs ${
              difficulty === 'Leicht'
                ? 'bg-emerald-100/90 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                : difficulty === 'Schwer'
                  ? 'bg-rose-100/90 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30'
                  : 'bg-amber-100/90 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
            }`}>
              {difficulty}
            </span>
          </div>
          <button 
            disabled={isLoading} 
            onClick={() => generateNew()} 
            className={`w-7 h-7 flex items-center justify-center rounded-xl cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-sm ${currentIsLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' : 'bg-white/10 hover:bg-white/20 text-slate-200'}`}
            title="Neue Frage generieren"
          >
            <RotateCcw size={12} className={isLoading ? "animate-spin text-indigo-400" : ""} />
          </button>
        </div>

        {/* Difficulty Selector Row */}
        <div className="flex items-center gap-1.5 mt-0.5 mb-1 bg-slate-50 dark:bg-zinc-900/40 p-1 rounded-xl border border-slate-200/40 dark:border-white/5">
          <span className={`text-[8px] font-black uppercase tracking-wider opacity-60 px-1 ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>Niveau:</span>
          <div className="flex gap-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg border border-slate-200/50 dark:border-white/5 flex-grow">
            {(['Leicht', 'Mittel', 'Schwer'] as const).map((level) => {
              const isActive = difficulty === level;
              const colorClasses = level === 'Leicht' 
                ? (isActive ? 'bg-emerald-500 text-white shadow-xs font-black' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-500')
                : level === 'Schwer'
                  ? (isActive ? 'bg-rose-500 text-white shadow-xs font-black' : 'text-slate-500 dark:text-slate-400 hover:text-rose-500')
                  : (isActive ? 'bg-amber-500 text-white shadow-xs font-black' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500');

              return (
                <button
                  key={level}
                  disabled={isLoading}
                  onClick={() => {
                    setDifficulty(level);
                    generateNew(undefined, level);
                  }}
                  className={`flex-1 text-[8.5px] py-1 rounded-md font-bold transition-all text-center cursor-pointer select-none ${colorClasses}`}
                >
                  {level}
                </button>
              );
            })}
          </div>
        </div>

        {/* Horizontal scroll of categories */}
        <div className="flex gap-1 overflow-x-auto pb-1 style-scrollbar max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              disabled={isLoading}
              onClick={() => {
                setSelectedCategory(cat.id);
                generateNew(cat.id);
              }}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 ${
                selectedCategory === cat.id 
                  ? "bg-indigo-500 text-white shadow-md font-extrabold" 
                  : currentIsLight ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
          {selectedCategory !== "Zufall" && !categories.some(c => c.id === selectedCategory) && (
            <span className="px-2 py-1 rounded-lg text-[9px] font-extrabold bg-pink-500 text-white shadow-md whitespace-nowrap animate-pulse">
              ✨ {selectedCategory}
            </span>
          )}
        </div>

        {/* Custom topic input field */}
        <div className="flex gap-1 items-center">
          <input
            type="text"
            placeholder="Anderes Thema eingeben... (z.B. Haustiere)"
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customTopic.trim()) {
                const t = customTopic.trim();
                setSelectedCategory(t);
                setPopularTopics(prev => {
                  const filtered = prev.filter(p => p.toLowerCase() !== t.toLowerCase());
                  return [t, ...filtered].slice(0, 8);
                });
                generateNew(t);
                setCustomTopic("");
              }
            }}
            className={`flex-grow px-2 py-1 text-[10px] rounded-lg border outline-none transition-all placeholder:opacity-60 font-medium ${
              currentIsLight 
                ? 'bg-white border-slate-200 focus:border-indigo-400 text-slate-800 focus:ring-1 focus:ring-indigo-150' 
                : 'bg-white/5 border-white/10 focus:border-indigo-500 text-slate-200 focus:ring-1 focus:ring-indigo-950/40'
            }`}
          />
          <button
            onClick={() => {
              if (customTopic.trim()) {
                const t = customTopic.trim();
                setSelectedCategory(t);
                setPopularTopics(prev => {
                  const filtered = prev.filter(p => p.toLowerCase() !== t.toLowerCase());
                  return [t, ...filtered].slice(0, 8);
                });
                generateNew(t);
                setCustomTopic("");
              }
            }}
            disabled={isLoading || !customTopic.trim()}
            className="p-1 px-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/30 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[9px] font-black uppercase tracking-wider gap-1 shrink-0"
            title="Frage zu diesem Thema zaubern"
          >
            <Sparkles size={9} /> Erstellen
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center w-full min-h-0 relative mb-2">
        <h3 className={`text-center font-black text-sm leading-snug mb-3.5 max-w-[95%] drop-shadow-sm px-1.5 ${currentIsLight ? 'text-slate-800' : 'text-slate-100'}`}>
          {isLoading ? (
            <span className="flex items-center gap-1 justify-center">
              <span className="animate-bounce">🔮</span> Die KI zaubert eine Frage...
            </span>
          ) : question}
        </h3>

        <div className="grid grid-cols-2 gap-2.5 w-full">
          {options.map((opt, i) => {
            let stateClass = currentIsLight 
              ? 'bg-white border-slate-200 text-slate-700 shadow-sm hover:border-indigo-400 hover:bg-slate-50' 
              : 'bg-black/20 border-white/10 text-slate-200 hover:border-indigo-500/50 hover:bg-white/5';
            
            if (selected !== null) {
              if (i === answer) {
                stateClass = 'bg-emerald-500 border-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] font-extrabold scale-[1.02]';
              } else if (i === selected) {
                stateClass = 'bg-rose-500 border-rose-500 text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)]';
              } else {
                stateClass = currentIsLight 
                  ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-40' 
                  : 'bg-black/10 border-transparent text-slate-500 opacity-30';
              }
            }

            const optionLabels = ["A", "B", "C", "D"];
            return (
              <button
                key={i}
                disabled={selected !== null || isLoading}
                onClick={() => handleSelect(i)}
                className={`py-3 px-2 rounded-2xl text-[10.5px] font-bold border transition-all active:scale-95 text-center cursor-pointer min-h-[44px] flex items-center justify-center break-words leading-tight ${stateClass}`}
              >
                <span className="font-extrabold mr-1 bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[8.5px] tracking-tight">{optionLabels[i]}</span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {feedbackMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={`w-full text-center p-2 rounded-2xl text-[10px] font-extrabold border shadow-inner ${
            selected === answer 
              ? currentIsLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
              : currentIsLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
          }`}
        >
          {feedbackMessage}
        </motion.div>
      )}
    </div>
  );
};

/** One visible Quiz & Rätsel entry; older standalone AI-Quiz widgets remain readable. */
export const RiddleWidgetContent: React.FC<{
  widget: any; onUpdate?: (updates: any) => void; currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const [activePanel, setActivePanel] = useState<'riddle' | 'quiz'>(
    widget?.settings?.quizRiddlePanel === 'quiz' ? 'quiz' : 'riddle');
  const selectPanel = (panel: 'riddle' | 'quiz') => {
    setActivePanel(panel);
    if (onUpdate && widget?.id) onUpdate({ settings: {
      ...(widget.settings || {}), quizRiddlePanel: panel,
    } });
  };
  return <div className="flex h-full w-full min-h-0 flex-col">
    <nav role="group" aria-label="Quiz und Rätsel" className="grid shrink-0 grid-cols-2 gap-1 p-2">
      <button type="button" aria-pressed={activePanel === 'riddle'} onClick={() => selectPanel('riddle')}
        className={`min-h-11 rounded-xl px-2 text-xs font-bold ${activePanel === 'riddle' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-white'}`}>
        Rätsel
      </button>
      <button type="button" aria-pressed={activePanel === 'quiz'} onClick={() => selectPanel('quiz')}
        className={`min-h-11 rounded-xl px-2 text-xs font-bold ${activePanel === 'quiz' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-900 dark:bg-zinc-800 dark:text-white'}`}>
        Quiz
      </button>
    </nav>
    <div className="min-h-0 flex-1">
      {activePanel === 'quiz'
        ? <AIQuizWidgetContent widget={widget} onUpdate={onUpdate} currentIsLight={currentIsLight} />
        : <ClassroomRiddleGame widget={widget} onUpdate={onUpdate} currentIsLight={currentIsLight} />}
    </div>
  </div>;
};

const ClassroomRiddleGame: React.FC<{ widget: any, onUpdate?: (updates: any) => void, currentIsLight: boolean }> = ({ widget, onUpdate, currentIsLight }) => {
  const [revealed, setRevealed] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [riddleCategory, setRiddleCategory] = useState("Zufall");
  const [customRiddleTopic, setCustomRiddleTopic] = useState("");
  const [item, setItem] = useState<{q: string, a: string, emoji: string}>(
    () => validClassroomRiddle(widget?.settings?.classroomRiddle) || {
      q: "Was hat einen Hals, aber keinen Kopf?",
      a: "Eine Flasche",
      emoji: "Flasche 🍾",
    });
  const saveRiddle = (candidate: unknown) => {
    const valid = validClassroomRiddle(candidate);
    if (!valid) return false;
    setItem(valid);
    if (onUpdate && widget?.id) onUpdate({ settings: {
      ...(widget.settings || {}), classroomRiddle: valid,
    } });
    return true;
  };

  const categories = [
    { id: "Zufall", label: "🎲 Alles" },
    { id: "Tiere", label: "🐾 Tiere" },
    { id: "Schule", label: "🎒 Schule" },
    { id: "Natur", label: "🌲 Natur" },
    { id: "Scherzfragen", label: "😜 Witze" }
  ];

  const generateNew = async (forcedCategory?: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setRevealed(false);
    setHintsRevealed(false);
    const catToUse = forcedCategory || riddleCategory;
    try {
      const categoryPrompt = catToUse === "Zufall"
        ? "ein beliebiges, lustiges und kindgerechtes Rätsel für Volksschulkinder"
        : `spezifisch ein Rätsel über das Thema oder Kategorie "${catToUse}"`;

      const prompt = `Erstelle ein kurzes, witziges oder nachdenkliches Kinder-Rätsel (Alter 8-10 Jahre) ${categoryPrompt}.
Gib die Antwort AUSSCHLIESSLICH im puren JSON-Format zurück, ohne umschließende Code-Zäune wie \`\`\`json.
Strikte JSON-Struktur:
{"q":"Das knifflige Rätsel?", "a":"Die kurze Lösung", "emoji":"Ein passendes Emoji"}`;

      const response = await askAI('ki-raetsel', prompt);
      if (response) {
        const data = safeExtractJSON(response.trim());
        if (!saveRiddle(data)) throw new Error('Ungültiges Rätsel erhalten');
      }
    } catch (err) {
      console.error("AI Riddle error", err);
      const offlineRiddles: {[key: string]: {q: string, a: string, emoji: string}[]} = {
        Tiere: [
          { q: "Ich bin klein, grau und habe spitze Zähne. Am liebsten esse ich Käse. Wer bin ich?", a: "Eine Maus", emoji: "Maus 🐭" },
          { q: "Ich knabbere gerne Karotten, habe lange Ohren und kann hoch hüpfen. Wer bin ich?", a: "Ein Hase", emoji: "Hase 🐰" },
          { q: "Wer trägt sein Haus auf dem Rücken und schleicht gaaanz langsam über den Weg?", a: "Eine Schnecke", emoji: "Schnecke 🐌" }
        ],
        Schule: [
          { q: "Ich habe viele bunte Stifte in meinem Bauch und passe in jede Schultasche. Was bin ich?", a: "Das Federmäppchen", emoji: "Federpennal ✏️" },
          { q: "Ich habe Blätter, aber bin kein Baum. Ich erzähle Geschichten, aber sprechen kann ich kaum. Was bin ich?", a: "Ein Buch", emoji: "Buch 📚" },
          { q: "Ich helfe dir, Fehler wegzumachen. Wenn du mich auf Papier reibst, schrumpfe ich. Was bin ich?", a: "Ein Radiergummi", emoji: "Radiergummi 🧼" }
        ],
        Natur: [
          { q: "Ich bin gelb und warm. Ich scheine am Himmel und wecke dich morgens auf. Wer bin ich?", a: "Die Sonne", emoji: "Sonne ☀️" },
          { q: "Ich falle vom Himmel, mache alles nass und lasse Pflanzen wachsen. Was bin ich?", a: "Der Regen", emoji: "Regen 🌧️" },
          { q: "Wir tanzen im Winter leise vom Himmel herunter und sind alle einzigartig. Wer sind wir?", a: "Schneeflocken", emoji: "Schneeflocke ❄️" }
        ],
        Scherzfragen: [
          { q: "Welcher Kopf kann nicht denken?", a: "Der Salatstadt / Kohlkopf", emoji: "Salat 🥬" },
          { q: "Was wird nasser, je mehr man sich damit abtrocknet?", a: "Ein Handtuch", emoji: "Handtuch 🧼" },
          { q: "Was hat einen Hals, aber keinen Kopf?", a: "Eine Flasche", emoji: "Flasche 🍾" }
        ]
      };

      const selectedCat = catToUse === "Zufall" ? ["Tiere", "Schule", "Natur", "Scherzfragen"][Math.floor(Math.random() * 4)] : catToUse;
      const list = offlineRiddles[selectedCat] || offlineRiddles["Scherzfragen"];
      saveRiddle(list[Math.floor(Math.random() * list.length)]);
    }
    setIsLoading(false);
  };

  const { char: firstNounLetter, isArticleSkipped, strippedLength } = useMemo(() => {
    const ans = item.a || "";
    let trimmed = ans.trim();
    // Remove "Lösung: " prefix if present 
    trimmed = trimmed.replace(/^lösung:\s*/i, '');
    // Strip German articles: Ein, Eine, Einer, Einem, Einen, Der, Die, Das, Des, Dem, Den, as well as full sentences like "Es ist eine"
    const articleRegex = /^(es\s+ist\s+eine?r?\s+|einer?|eine?|einem|einen|der|die|das|des|dem|den)\s+/i;
    const match = trimmed.match(articleRegex);
    let stripped = trimmed;
    if (match) {
      stripped = trimmed.slice(match[0].length).trim();
    }
    return {
      char: stripped ? stripped.charAt(0).toUpperCase() : (trimmed.charAt(0).toUpperCase() || "?"),
      isArticleSkipped: !!match,
      strippedLength: stripped.length
    };
  }, [item.a]);

  return (
    <div className="flex-grow flex flex-col justify-between items-center relative h-full w-full select-none p-3 pointer-events-auto min-h-0 overflow-y-auto">
      <div className="w-full flex flex-col gap-1.5 mb-2 shrink-0">
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-500 opacity-90">
            <Sparkles size={10} className="text-yellow-400 animate-pulse" /> KI Rätselspaß: {riddleCategory}
          </span>
          <button 
            disabled={isLoading} 
            onClick={() => generateNew()} 
            className={`w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-sm ${currentIsLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-500' : 'bg-white/10 hover:bg-white/20 text-slate-400'}`}
            title="Neues Rätsel erfinden"
          >
            <RotateCcw size={12} className={isLoading ? "animate-spin text-emerald-500" : ""} />
          </button>
        </div>

        {/* Categories list */}
        <div className="flex gap-1 overflow-x-auto pb-1 style-scrollbar max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              disabled={isLoading}
              onClick={() => {
                setRiddleCategory(cat.id);
                generateNew(cat.id);
              }}
              className={`px-2 py-1 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 ${
                riddleCategory === cat.id 
                  ? "bg-emerald-500 text-white shadow-md font-extrabold" 
                  : currentIsLight ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-white/5 hover:bg-white/10 text-slate-300"
              }`}
            >
              {cat.label}
            </button>
          ))}
          {riddleCategory !== "Zufall" && !categories.some(c => c.id === riddleCategory) && (
            <span className="px-2 py-1 rounded-lg text-[9px] font-extrabold bg-pink-500 text-white shadow-md whitespace-nowrap">
              ✨ {riddleCategory}
            </span>
          )}
        </div>

        {/* Custom topic prompt */}
        <div className="flex gap-1 items-center">
          <input
            type="text"
            placeholder="Eigenes Rätsel-Thema... (z.B. Sport, Essen)"
            value={customRiddleTopic}
            onChange={(e) => setCustomRiddleTopic(e.target.value)}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customRiddleTopic.trim()) {
                setRiddleCategory(customRiddleTopic.trim());
                generateNew(customRiddleTopic.trim());
              }
            }}
            className={`flex-grow px-2 py-1 text-[10px] rounded-lg border outline-none transition-all placeholder:opacity-60 font-medium ${
              currentIsLight 
                ? 'bg-white border-slate-200 focus:border-emerald-400 text-slate-800 focus:ring-1 focus:ring-emerald-100' 
                : 'bg-white/5 border-white/10 focus:border-emerald-500 text-slate-200'
            }`}
          />
          <button
            onClick={() => {
              if (customRiddleTopic.trim()) {
                setRiddleCategory(customRiddleTopic.trim());
                generateNew(customRiddleTopic.trim());
              }
            }}
            disabled={isLoading || !customRiddleTopic.trim()}
            className="min-h-11 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95 text-[9px] font-black uppercase tracking-wider gap-0.5 shrink-0"
          >
            <Sparkles size={9} /> Erstellen
          </button>
        </div>
      </div>

      <div className="my-auto flex flex-col items-center justify-center text-center w-full px-1.5 flex-grow">
        <span className="text-4.5xl mb-2 drop-shadow-md animate-bounce">{isLoading ? "⏳" : "🤔"}</span>
        <h3 className={`font-black text-[13px] leading-relaxed max-w-[95%] mb-3.5 ${currentIsLight ? 'text-slate-800' : 'text-white'}`}>
          {isLoading ? <span className="animate-pulse">Die KI kramt im Rätselbuch...</span> : `"${item.q}"`}
        </h3>

        {!isLoading && (
          <div className="flex flex-col gap-2.5 items-center w-full max-w-[90%]">
            {revealed ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center"
              >
                <div className={`px-5 py-2.5 rounded-2xl border-2 border-emerald-500 font-extrabold text-xs tracking-wide shadow-lg ${currentIsLight ? 'bg-emerald-50 text-emerald-700' : 'bg-emerald-950/40 text-emerald-400'}`}>
                  {item.a} {item.emoji}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex gap-2 w-full justify-center">
                  <button 
                    onClick={() => setRevealed(true)}
                    className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg cursor-pointer rounded-xl font-black text-[9.5px] uppercase tracking-widest transition-all active:scale-95-all"
                  >
                    Lösung zeigen 💡
                  </button>
                  <button 
                    onClick={() => setHintsRevealed(!hintsRevealed)}
                    className={`flex-1 py-2 px-3 border rounded-xl font-black text-[9.5px] uppercase tracking-widest transition-all active:scale-95-all cursor-pointer ${
                      hintsRevealed 
                        ? 'bg-amber-500 border-transparent text-white' 
                        : currentIsLight ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  >
                    {hintsRevealed ? "Tipp ausblenden 🙈" : "Tipp anzeigen 🔎"}
                  </button>
                </div>

                {hintsRevealed && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-[9.5px] p-2 rounded-xl text-center border font-bold ${
                      currentIsLight ? 'bg-amber-50 border-amber-250 text-amber-700' : 'bg-amber-950/20 border-amber-900/50 text-amber-400'
                    }`}
                  >
                    🌟 Erster Buchstabe des Nomen: <span className="font-mono text-xs uppercase font-black bg-amber-500/20 px-1 py-0.5 rounded">{firstNounLetter}</span> {isArticleSkipped ? <span className="text-[7.5px] text-amber-600 dark:text-amber-500 block mt-0.5">(Artikel übersprungen!)</span> : ""} • Wortlänge: <span className="font-mono text-xs font-black">{strippedLength}</span> Zeichen
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const WeatherWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [city, setCity] = useState("Wien");
  const [temp, setTemp] = useState<number | null>(null);
  const [conditionIndex, setConditionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const weatherTypes = [
    { code: [0], icon: "☀️", color: "from-blue-400 to-sky-300", name: "Sonnig", emoji: "😎", textColor: "text-amber-500" },
    { code: [1, 2, 3], icon: "🌤️", color: "from-sky-300 to-indigo-200", name: "Leicht Bewölkt", emoji: "😊", textColor: "text-sky-600" },
    { code: [45, 48], icon: "🌫️", color: "from-slate-400 to-gray-300", name: "Nebel", emoji: "😶‍🌫️", textColor: "text-slate-600" },
    { code: [51, 53, 55, 61, 63, 65, 80, 81, 82], icon: "🌧️", color: "from-indigo-600 to-cyan-700", name: "Regen", emoji: "☔", textColor: "text-blue-300" },
    { code: [95, 96, 99], icon: "⛈️", color: "from-slate-800 to-zinc-700", name: "Gewitter", emoji: "⚡", textColor: "text-yellow-400" },
    { code: [71, 73, 75, 77, 85, 86], icon: "❄️", color: "from-blue-200 to-indigo-100", name: "Schnee", emoji: "⛄", textColor: "text-sky-800" },
  ];

  const fetchWeather = async (lat: number, lon: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`);
      const data = await res.json();
      if (data && data.current) {
        setTemp(Math.round(data.current.temperature_2m));
        const wCode = data.current.weather_code;
        const matchedIdx = weatherTypes.findIndex(wt => wt.code.includes(wCode));
        setConditionIndex(matchedIdx >= 0 ? matchedIdx : 1);
      }
    } catch (err) {
      console.error("Weather fetch failed", err);
    }
    setIsLoading(false);
  };

  const searchAndFetchWeather = async (cityName: string) => {
    if (!cityName.trim()) return;
    setIsLoading(true);
    try {
      const resGeo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=de`);
      const dataGeo = await resGeo.json();
      if (dataGeo && dataGeo.results && dataGeo.results.length > 0) {
        const item = dataGeo.results[0];
        setCity(item.name);
        await fetchWeather(item.latitude, item.longitude);
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCity("Mein Standort");
          fetchWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          setCity("Wien");
          fetchWeather(48.2082, 16.3738); 
        }
      );
    } else {
      setCity("Wien");
      fetchWeather(48.2082, 16.3738);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchAction.activate('keyboard');
    }
  };

  const searchAction = useAccessibleAction(() => searchAndFetchWeather(city));
  const cycleWeatherAction = useAccessibleAction(() => {
    setConditionIndex((currentIndex) => (currentIndex + 1) % weatherTypes.length);
  });

  const current = weatherTypes[conditionIndex] || weatherTypes[1];

  return (
    <div className={`relative flex flex-col items-center justify-between p-3 h-full gap-2 pointer-events-auto min-h-0 rounded-b-2xl overflow-hidden bg-gradient-to-b ${current.color} transition-all duration-1000`}>
      {/* Decorative backdrop elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, white, transparent 70%)' }}></div>
      
      <div className="z-10 w-full flex items-center justify-between px-1 gap-1">
        <div className="relative flex items-center w-28 group">
          <input 
            type="text" 
            value={city} 
            onChange={e => setCity(e.target.value)} 
            onKeyDown={handleKeyDown}
            className="w-full font-black text-xs tracking-wide bg-transparent outline-none border-b border-white/30 focus:border-white/85 pb-0.5 text-white/95 drop-shadow-md placeholder-white/50 pr-4"
            placeholder="Ort..."
          />
          <button
            type="button"
            {...searchAction.buttonProps}
            aria-label="Wetter suchen"
            className="absolute right-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-white/65 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <Search size={10} aria-hidden="true" />
          </button>
        </div>
        <div className="text-white drop-shadow-md font-bold text-[8.5px] uppercase tracking-wider">{current.name}</div>
      </div>

      <button
        type="button"
        {...cycleWeatherAction.buttonProps}
        aria-label="Wetterdarstellung wechseln"
        className="z-10 my-auto inline-flex min-h-24 min-w-24 items-center justify-center rounded-2xl text-6xl filter drop-shadow-lg hover:scale-110 active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        <span className="relative">
           {current.icon}
           <span className="absolute -bottom-2 -right-2 text-xl drop-shadow-sm">{current.emoji}</span>
        </span>
      </button>

      <div className="z-10 flex items-center justify-center min-w-[70px] bg-black/15 dark:bg-black/25 px-4 py-1.5 rounded-2xl border border-white/20 shadow-xl backdrop-blur-md">
        <span className="text-2xl font-black tabular-nums tracking-tighter text-white drop-shadow-md">{isLoading ? "⏳" : `${temp}°`}</span>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 1: PUNKTE-TAFEL (Scoreboard - F22 F-UI Standard)
// ==========================================
export const ScoreboardWidgetContent: React.FC<ScoreboardWidgetProps> = (props) => {
  return <ScoreboardWidget {...props} />;
};

// ==========================================
// WIDGET: GLÜCKSRAD (Wheel Of Fortune)
// ==========================================

export const WheelWidgetContent: React.FC<WheelWidgetProps> = (props) => {
  return <WheelWidget {...props} />;
};

// (WheelWidgetContent has been extracted to widgets/WheelWidget.tsx)


// ==========================================
// NEW WIDGET 3: ATEMPAUSE (Breathing Circle)
// ==========================================
export const BreathingWidgetContent: React.FC<BreathingWidgetProps> = (props) => {
  return <BreathingWidget {...props} />;
};

// ==========================================
// NEW WIDGET 4: WETTERSTATION (Interactive Weather/Clothes Selector)
// ==========================================
export const KidWeatherWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [cond, setCond] = useState<'sun' | 'rain' | 'cloud' | 'snow' | 'tempest'>('sun');
  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [solvedCurrent, setSolvedCurrent] = useState(false);

  // Sound Synthesizer for Frog "Ribbit" voice
  const playFrogVoice = (expression: 'happy' | 'cold' | 'hot' | 'normal') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const playCroak = (pitch: number, speed: number, biquadFreq: number, delay: number = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(biquadFreq, now + delay);
        filter.Q.setValueAtTime(6, now + delay);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(pitch, now + delay);
        osc.frequency.linearRampToValueAtTime(pitch * 0.85, now + delay + speed);

        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.01);
        gain.gain.linearRampToValueAtTime(0.08, now + delay + speed * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + speed);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + speed + 0.05);
      };

      if (expression === 'happy') {
        // High pitched double cheerful ribbit
        playCroak(290, 0.08, 950, 0);
        playCroak(340, 0.1, 1050, 0.12);
      } else if (expression === 'cold') {
        // Shivering stuttering croak
        playCroak(130, 0.04, 450, 0);
        playCroak(120, 0.04, 420, 0.06);
        playCroak(110, 0.05, 400, 0.12);
      } else if (expression === 'hot') {
        // Slow, tired, sweeping sigh-like croak
        playCroak(150, 0.38, 550, 0);
      } else {
        // Normal frog croak
        playCroak(190, 0.11, 750, 0);
        playCroak(170, 0.13, 700, 0.15);
      }
    } catch (e) {}
  };

  const toggleClothing = (id: string) => {
    setSelectedClothes(prev => {
      const isRemoving = prev.includes(id);
      const next = isRemoving ? prev.filter(c => c !== id) : [...prev, id];
      
      playFrogVoice('normal');
      return next;
    });
  };

  const weatherConfig = {
    sun: { emoji: "☀️", label: "Sonnig 🕶️", color: "from-amber-400 to-sky-350", rec: ["kappe", "tshirt"], warning: "Stell dir vor: bei Hitze brauche ich Kappe & T-Shirt! Keine dicken Sachen! 🥵" },
    rain: { emoji: "🌧️", label: "Regnerisch ☔", color: "from-indigo-400 to-slate-450", rec: ["jacke", "stiefel", "schirm"], warning: "Ohje, ich brauche Schutz: Jacke, Stiefel und einen Schirm! ☔" },
    cloud: { emoji: "☁️", label: "Wolkig 🌬️", color: "from-slate-400 to-blue-300", rec: ["jacke", "tshirt"], warning: "Es zieht! Zieh mir lieber eine Jacke über das T-Shirt. 🌬️" },
    snow: { emoji: "❄️", label: "Schnee ⛄", color: "from-sky-300 to-indigo-300", rec: ["jacke", "stiefel", "handschuhe", "haube"], warning: "Zitterzahn! Im Schnee brauche ich Jacke, Haube, Handschuhe und Stiefel! 🥶⛄" },
    tempest: { emoji: "🌩️", label: "Gewitter ⚡", color: "from-zinc-700 to-slate-800", rec: ["jacke", "schirm"], warning: "Achtung! Bei Blitz und Jackenwind setze ich lieber den Schirmschutz auf! ⚡" }
  };

  const itemsList = [
    { id: "kappe", char: "🧢", name: "Sonnenkappe" },
    { id: "tshirt", char: "👕", name: "T-Shirt" },
    { id: "jacke", char: "🧥", name: "Winterjacke" },
    { id: "stiefel", char: "🥾", name: "Stiefel" },
    { id: "handschuhe", char: "🧤", name: "Handschuhe" },
    { id: "schirm", char: "☂️", name: "Schirmschutz" },
    { id: "haube", char: "🧣", name: "Wollmütze" }
  ];

  // Helper validation matching logic
  const feedbackMessage = useMemo(() => {
    const recs = weatherConfig[cond].rec;
    const missing = recs.filter(r => !selectedClothes.includes(r));
    const extra = selectedClothes.filter(c => !recs.includes(c));

    if (selectedClothes.length === 0) {
      return "Zieh mich passend zum Wetter an! 🐸👚";
    }
    if (missing.length === 0 && extra.length === 0) {
      return "Perfekt! Ich bin genau richtig gekleidet! 🤩🐸🟢";
    }
    if (missing.length > 0) {
      const matchLabel = itemsList.find(x => x.id === missing[0])?.name || "";
      return `Brrr/Uff! Mir fehlt noch: ${matchLabel}! 🧐`;
    }
    if (extra.length > 0) {
      const extraLabel = itemsList.find(x => x.id === extra[0])?.name || "";
      return `Hoppla! ${extraLabel} ist bei diesem Wetter zu viel! 🥵`;
    }
    return weatherConfig[cond].warning;
  }, [selectedClothes, cond]);

  const allCorrect = useMemo(() => {
    const recs = weatherConfig[cond].rec;
    const missing = recs.filter(r => !selectedClothes.includes(r));
    const extra = selectedClothes.filter(c => !recs.includes(c));
    return missing.length === 0 && extra.length === 0;
  }, [selectedClothes, cond]);

  // Handle happy voice play and streak logic on success
  useEffect(() => {
    if (allCorrect) {
      if (!solvedCurrent) {
        setSolvedCurrent(true);
        setStreak(s => s + 1);
        playFrogVoice('happy');
      }
    } else {
      setSolvedCurrent(false);
    }
  }, [allCorrect, solvedCurrent]);

  const setRandomWeather = () => {
    const types: Array<keyof typeof weatherConfig> = ['sun', 'rain', 'cloud', 'snow', 'tempest'];
    let next = cond;
    while (next === cond) {
      next = types[Math.floor(Math.random() * types.length)];
    }
    setCond(next);
    setSelectedClothes([]);
    setSolvedCurrent(false);
    
    // Play sound of new weather
    if (next === 'sun') playFrogVoice('happy');
    else if (next === 'snow') playFrogVoice('cold');
    else playFrogVoice('normal');
  };

  // Generate simple animated weather ambient particles
  const particles = useMemo(() => {
    const count = cond === 'rain' ? 12 : cond === 'snow' ? 10 : cond === 'tempest' ? 6 : cond === 'sun' ? 5 : 4;
    return Array.from({ length: count }).map((_, i) => {
      const left = `${Math.random() * 100}%`;
      const delay = `${Math.random() * 4}s`;
      const duration = cond === 'rain' ? `${1 + Math.random() * 1.5}s` : `${3 + Math.random() * 3}s`;
      let char = '💧';
      if (cond === 'snow') char = '❄️';
      else if (cond === 'sun') char = '✨';
      else if (cond === 'cloud') char = '💨';
      else if (cond === 'tempest') char = '⚡';

      return (
        <span 
          key={i} 
          className="absolute text-xs select-none pointer-events-none opacity-25 animate-bounce-subtle"
          style={{ 
            left, 
            top: '-15px', 
            animationDelay: delay, 
            animationDuration: duration,
            animationName: cond === 'rain' || cond === 'snow' ? 'fall' : 'floatHorizontal'
          }}
        >
          {char}
        </span>
      );
    });
  }, [cond]);

  return (
    <div className={`flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2 transition-all duration-500 rounded-b-2xl bg-gradient-to-b ${weatherConfig[cond].color} relative overflow-hidden`}>
      
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-10px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.35; }
          90% { opacity: 0.35; }
          100% { transform: translateY(180px) rotate(360deg); opacity: 0; }
        }
        @keyframes floatHorizontal {
          0% { transform: translateX(-20px) translateY(${Math.random() * 100}px); opacity: 0; }
          10% { opacity: 0.25; }
          90% { opacity: 0.25; }
          100% { transform: translateX(280px) translateY(${Math.random() * 100}px); opacity: 0; }
        }
      `}</style>

      {/* Render Particles */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {particles}
      </div>

      {/* Top row with weather status, streaks & Random game button */}
      <div className="flex gap-1.5 items-center justify-between shrink-0 select-none z-10">
        <div className="flex gap-1 items-center bg-black/10 dark:bg-black/25 px-2 py-0.5 rounded-lg border border-white/10">
          <span className="text-[8.5px] font-black uppercase text-white tracking-widest flex items-center gap-1">
            🐸 Wetterfrosch
          </span>
          {streak > 0 && (
            <span className="text-[8.5px] font-black bg-rose-500 text-white px-1.5 py-0.2 rounded-full shadow animate-pulse">
              {streak} 🔥
            </span>
          )}
        </div>
        <button
          onClick={setRandomWeather}
          className="bg-white/20 hover:bg-white/35 text-white border border-white/10 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest cursor-pointer transition-all active:scale-95"
          title="Nächste Wetter-Challenge starten"
        >
          Anderes Wetter 🎲
        </button>
      </div>

      {/* Visual weather condition selectors */}
      <div className="flex gap-1 items-center justify-between shrink-0 select-none bg-black/15 dark:bg-black/30 rounded-xl p-1 border border-white/10 z-10">
        {(Object.keys(weatherConfig) as Array<keyof typeof weatherConfig>).map((k) => (
          <button
            key={k}
            onClick={() => { setCond(k); setSelectedClothes([]); setSolvedCurrent(false); }}
            className={`flex-1 py-1 flex flex-col items-center justify-center rounded-lg text-xs transition-all cursor-pointer ${
              cond === k 
                ? 'bg-white text-slate-900 shadow font-black scale-102 border-b-2 border-slate-450' 
                : 'hover:bg-white/15 opacity-70 hover:opacity-100 text-white font-bold'
            }`}
          >
            <span className="text-sm">{weatherConfig[k].emoji}</span>
            <span className="text-[6.5px] uppercase tracking-wide">{weatherConfig[k].label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Main interaction workspace */}
      <div className="flex-grow flex justify-between items-center gap-2 min-h-0 py-0.5 z-10">
        
        {/* Wetterfrosch Avatar Panel */}
        <div className="flex-1 flex flex-col items-center justify-center bg-white/35 dark:bg-black/55 rounded-2xl p-2 border border-white/20 h-full relative">
          
          {/* Main Visual Frog Mascot */}
          <div className="relative flex flex-col items-center justify-center my-auto h-20 w-20">
            <span 
              className={`text-5xl filter drop-shadow z-10 transition-transform ${
                allCorrect 
                  ? 'animate-bounce scale-110' 
                  : cond === 'snow' && !selectedClothes.includes('jacke')
                    ? 'animate-pulse' 
                    : 'animate-bounce-subtle'
              }`}
            >
              {allCorrect ? '🐸✨' : cond === 'snow' && !selectedClothes.includes('jacke') ? '🥶' : cond === 'sun' && selectedClothes.includes('jacke') ? '🥵' : '🐸'}
            </span>
            
            {allCorrect && (
              <>
                <span className="absolute -top-3 left-0 text-xs animate-ping">⭐</span>
                <span className="absolute -bottom-2 right-0 text-xs animate-ping">🌟</span>
              </>
            )}

            {/* Render selected clothes absolutely around the frog */}
            {selectedClothes.includes('kappe') && <span className="absolute -top-2.5 z-20 text-3xl filter drop-shadow" style={{ transform: 'rotate(-10deg) scale(0.9)' }}>🧢</span>}
            {selectedClothes.includes('haube') && <span className="absolute -top-2.5 z-20 text-3xl filter drop-shadow animate-pulse" style={{ transform: 'scale(1.05)' }}>🧣</span>}
            
            {selectedClothes.includes('schirm') && <span className="absolute right-[-14px] top-[-9px] z-30 text-4xl filter drop-shadow" style={{ transform: 'rotate(15deg)' }}>☂️</span>}
            
            {/* Body clothes */}
            {selectedClothes.includes('tshirt') && !selectedClothes.includes('jacke') && <span className="absolute bottom-[-5px] z-20 text-4xl filter drop-shadow" style={{ transform: 'scale(1.15)' }}>👕</span>}
            {selectedClothes.includes('jacke') && <span className="absolute bottom-[-8px] z-25 text-4xl filter drop-shadow" style={{ transform: 'scale(1.25)' }}>🧥</span>}
            
            {/* Accessories */}
            {selectedClothes.includes('handschuhe') && (
              <>
                <span className="absolute left-[-4px] bottom-1 z-30 text-xl filter drop-shadow" style={{ transform: 'rotate(-45deg)' }}>🧤</span>
                <span className="absolute right-[-4px] bottom-1 z-30 text-xl filter drop-shadow" style={{ transform: 'scaleX(-1) rotate(-45deg)' }}>🧤</span>
              </>
            )}
            
            {/* Shoes */}
            {selectedClothes.includes('stiefel') && <span className="absolute bottom-[-18px] z-0 text-3xl filter drop-shadow">🥾</span>}
          </div>

          {/* Dialog Bubble representing the Frog speaking to the child */}
          <div className="mt-2.5 bg-white/95 dark:bg-zinc-900/95 text-slate-800 dark:text-neutral-150 p-1.5 rounded-xl shadow-md border border-white/40 text-center w-full min-h-[38px] flex items-center justify-center">
            <p className={`text-[8.5px] leading-tight font-black ${allCorrect ? 'text-emerald-600' : 'text-slate-700 dark:text-gray-300'}`}>
              {feedbackMessage}
            </p>
          </div>
        </div>

        {/* Clothes picker board */}
        <div className="flex-1 grid grid-cols-2 gap-1.5 max-h-full overflow-y-auto pr-0.5 py-0.5 scrollbar-thin">
          {itemsList.map((item) => {
            const isSelected = selectedClothes.includes(item.id);
            const isRec = weatherConfig[cond].rec.includes(item.id);
            return (
              <button
                key={item.id}
                onClick={() => toggleClothing(item.id)}
                className={`py-1 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-white text-slate-800 border-white shadow shadow-white/30 scale-[1.03] font-bold' 
                    : isRec 
                      ? 'bg-white/20 hover:bg-white/30 border-teal-300 text-white animate-pulse' 
                      : 'bg-white/5 hover:bg-white/10 border-transparent text-white/80'
                }`}
              >
                <span className="text-lg relative">
                  {item.char}
                  {isRec && !isSelected && (
                    <span className="absolute -top-1 -right-1 text-[8px]">⭐</span>
                  )}
                </span>
                <span className="text-[7.5px] font-extrabold uppercase mt-0.5 tracking-wider truncate max-w-full px-1">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      
    </div>
  );
};

// ==========================================
// NEW WIDGET 5: RECHNEN-TRAINER (Mathcards Flashcards)
// ==========================================
export const MathcardsWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [operator, setOperator] = useState<'+' | '-' | '×'>('+');
  const [numRange, setNumRange] = useState<10 | 100>(10);
  const [score, setScore] = useState({ r: 0, t: 0 });
  
  // Flashcard values
  const [left, setLeft] = useState(5);
  const [right, setRight] = useState(3);
  const [choices, setChoices] = useState<number[]>([]);
  const [answered, setAnswered] = useState<boolean>(false);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);

  const generateCard = () => {
    setAnswered(false);
    setSelectedAns(null);

    let l = 0, r = 0, ans = 0;
    if (operator === '+') {
      l = Math.floor(Math.random() * (numRange - 2)) + 2;
      r = Math.floor(Math.random() * (numRange - l - 1)) + 1;
      ans = l + r;
    } else if (operator === '-') {
      l = Math.floor(Math.random() * (numRange - 2)) + 3;
      r = Math.floor(Math.random() * (l - 1)) + 1;
      ans = l - r;
    } else {
      // Multiplication 1x1
      l = Math.floor(Math.random() * 9) + 2;
      r = Math.floor(Math.random() * 9) + 2;
      ans = l * r;
    }

    setLeft(l);
    setRight(r);

    // Make multiple choices
    const items = new Set<number>([ans]);
    const attempts = 0;
    while (items.size < 3) {
      const variation = Math.max(1, ans + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1));
      items.add(variation);
    }
    setChoices(Array.from(items).sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    generateCard();
  }, [operator, numRange]);

  const handleAnswerClick = (val: number) => {
    if (answered) return;
    setSelectedAns(val);
    setAnswered(true);

    const actualAns = operator === '+' ? left + right : operator === '-' ? left - right : left * right;
    setScore(prev => ({
      r: prev.r + (val === actualAns ? 1 : 0),
      t: prev.t + 1
    }));
  };

  const actualAns = operator === '+' ? left + right : operator === '-' ? left - right : left * right;

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      {/* Arithmetic config buttons bar */}
      <div className="flex justify-between items-center gap-1.5 shrink-0 select-none">
        <div className="flex gap-1 border border-dashed rounded-lg p-0.5 border-slate-200 dark:border-white/10">
          {(['+', '-', '×'] as const).map((op) => (
            <button
              key={op}
              onClick={() => setOperator(op)}
              className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-black cursor-pointer transition-all ${
                operator === op 
                  ? 'bg-indigo-500 text-white shadow' 
                  : currentIsLight ? 'text-slate-600 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {op}
            </button>
          ))}
        </div>

        {operator !== '×' && (
          <div className="flex gap-1 border border-dashed rounded-lg p-0.5 border-slate-200 dark:border-white/10">
            {([10, 100] as const).map((max) => (
              <button
                key={max}
                onClick={() => setNumRange(max)}
                className={`px-1.5 py-0.5 rounded text-[8px] font-black cursor-pointer transition-all ${
                  numRange === max
                    ? 'bg-indigo-500 text-white'
                    : currentIsLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                ZR{max}
              </button>
            ))}
          </div>
        )}

        {score.t > 0 && (
          <span className="text-[8px] font-black text-emerald-505 dark:text-emerald-400 border border-transparent tracking-widest leading-none">
            {score.r} / {score.t} ⭐
          </span>
        )}
      </div>

      {/* Main Flashcard container */}
      <div className="flex-grow flex flex-col items-center justify-center min-h-0 py-1 select-none">
        <motion.div 
          key={`${left}-${right}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className={`w-full max-w-[150px] p-3 rounded-2xl border text-center relative select-none shadow-sm flex flex-col justify-center ${
            currentIsLight ? 'bg-white border-slate-200 shadow-slate-100' : 'bg-black/15 border-white/5'
          }`}
        >
          <div className="text-xl font-black tabular-nums tracking-wide text-indigo-505 dark:text-indigo-400 select-none">
            {left} {operator} {right} = ?
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col gap-1.5 shrink-0 select-none">
        {/* Answer Choice buttons */}
        <div className="grid grid-cols-3 gap-1.5">
          {choices.map((v, i) => {
            const isChoiceSelected = selectedAns === v;
            const isCorrectOption = v === actualAns;
            return (
              <button
                key={i}
                disabled={answered}
                onClick={() => handleAnswerClick(v)}
                className={`py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                  answered
                    ? isCorrectOption
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 scale-[1.02]'
                      : isChoiceSelected
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-600 dark:text-rose-450'
                        : 'opacity-40 border-transparent bg-slate-100 dark:bg-white/5 text-slate-400'
                    : currentIsLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-transparent text-slate-700 hover:scale-[1.02] active:scale-95'
                    : 'bg-white/5 hover:bg-white/10 border-transparent text-slate-350 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>

        {answered ? (
          <button
            onClick={generateCard}
            className="w-full py-1.5 bg-indigo-500 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-transform active:scale-95 shadow-md hover:bg-indigo-650 cursor-pointer"
          >
            Nächste Frage ▶️
          </button>
        ) : (
          <div className="text-[8px] font-black uppercase text-center text-slate-400 tracking-wider">Wähle die richtige Antwort!</div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 6: SATZ-BAUKASTEN -> Wort- & Satzwerkstatt (Legacy Scrambler)
// ==========================================
export const ScramblerWidgetContent: React.FC<{
  widget?: any;
  currentIsLight?: boolean;
  onUpdate?: (updates: any) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight = true,
  onUpdate,
  isFullscreen,
  showSettings,
  onCloseSettings,
}) => {
  return (
    <WortSatzWerkstattWidget
      widget={widget}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
      isFullscreen={isFullscreen}
      defaultMode="sentence"
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};

// ==========================================
// NEW WIDGET 7: WASSER-TRINKER (Water Tracker)
// ==========================================
export const WatertrackerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [glasses, setGlasses] = useState(0); // Starts at 0!
  const target = 10;

  // Water Bubble sound synthesizer
  const playWaterSound = useCallback((isReset: boolean = false) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      if (isReset) {
        // Soft ocean wave splash sound
        const bufferSize = ctx.sampleRate * 1.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(150, now + 1.2);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
        return;
      }

      // Quick bubble/pour sound with upward pitch sweep
      const playBubble = (timeOffset: number, startFreq: number, endFreq: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now + timeOffset);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + timeOffset + 0.12);
        
        gain.gain.setValueAtTime(0, now + timeOffset);
        gain.gain.linearRampToValueAtTime(0.06, now + timeOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.15);
      };

      playBubble(0, 260, 600);
      playBubble(0.07, 340, 800);
      playBubble(0.14, 420, 1050);
    } catch (e) {}
  }, []);

  const modifyGlasses = (amount: number) => {
    setGlasses(prev => {
      const next = Math.max(0, Math.min(15, prev + amount));
      if (amount > 0) {
        playWaterSound(false);
      } else {
        playWaterSound(true);
      }
      return next;
    });
  };

  const handleReset = () => {
    setGlasses(0);
    playWaterSound(true);
  };

  const isOverTarget = glasses >= target;
  const liters = (glasses * 0.25).toFixed(2);
  const targetLiters = (target * 0.25).toFixed(1);

  // Water level percentage
  const percent = Math.min(100, (glasses / target) * 100);

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <style>{`
        @keyframes waveMove {
          0% { transform: translateX(0); }
          50% { transform: translateX(-25%); }
          100% { transform: translateX(0); }
        }
        @keyframes floatFish {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-4px) rotate(5deg); }
        }
      `}</style>

      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Klassen-Wassertracker 💧
        </span>
        <button 
          onClick={handleReset}
          className="text-[7.5px] font-black text-rose-500 uppercase tracking-widest hover:underline hover:text-rose-600 cursor-pointer transition-all"
        >
          Reset 🔄
        </button>
      </div>

      <div className="flex-grow flex items-center justify-around min-h-0 gap-2">
        
        {/* Visual interactive tumbler/glass with waves & fish */}
        <div className="relative w-20 h-32 border-[3px] border-slate-600 dark:border-zinc-700 rounded-b-3xl rounded-t-lg overflow-hidden shrink-0 flex items-end shadow-md p-0.5 bg-slate-100 dark:bg-black/10">
          
          {/* Glass measurements markings */}
          <div className="absolute inset-y-0 right-1.5 flex flex-col justify-between text-[5px] font-bold text-slate-400/80 z-20 pointer-events-none select-none py-2">
            <span>{target} G (2.5L)</span>
            <span>5 G (1.25L)</span>
            <span>0 G</span>
          </div>

          {/* Water level container */}
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full relative bg-gradient-to-t from-cyan-400/90 to-sky-400/90 rounded-b-[21px] flex items-end min-h-[4px]"
          >
            {/* Animated double SVG waves */}
            {glasses > 0 && (
              <div className="absolute top-[-8px] left-0 right-0 h-2.5 overflow-hidden w-[200%] pointer-events-none select-none">
                <svg 
                  viewBox="0 0 120 28" 
                  className="absolute left-0 w-full h-full fill-sky-400/90"
                  style={{ animation: 'waveMove 3.5s ease-in-out infinite' }}
                >
                  <path d="M0 15 Q 30 0, 60 15 T 120 15 T 240 15 L 240 28 L 0 28 Z" />
                </svg>
                <svg 
                  viewBox="0 0 120 28" 
                  className="absolute left-[-10px] w-full h-full fill-cyan-300/65 opacity-80"
                  style={{ animation: 'waveMove 2.2s ease-in-out infinite' }}
                >
                  <path d="M0 12 Q 30 22, 60 12 T 120 12 T 240 12 L 240 28 L 0 28 Z" />
                </svg>
              </div>
            )}

            {/* Mascot Fish Swimming around in the water container! */}
            {glasses > 0 && (
              <span 
                className="absolute text-sm left-4 select-none pointer-events-none filter drop-shadow z-10"
                style={{ 
                  bottom: `${Math.max(10, percent * 0.15)}px`,
                  animation: 'floatFish 2.5s ease-in-out infinite'
                }}
              >
                🐟
              </span>
            )}
          </motion.div>

          {/* Thirsty fish at the bottom if water is at zero */}
          {glasses === 0 && (
            <div className="absolute bottom-2 left-0 right-0 flex flex-col items-center justify-center opacity-80 animate-pulse text-center">
              <span className="text-sm">🐠</span>
              <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Durstig! 🥺</span>
            </div>
          )}
        </div>

        {/* Real-time statistics display & hydration feedback */}
        <div className="flex-1 flex flex-col justify-center items-center text-center select-none gap-2">
          <div className="flex flex-col">
            <span className="text-3xl font-black tabular-nums tracking-tight text-cyan-500 dark:text-cyan-400 leading-none">
              {liters}<span className="text-xs font-black uppercase tracking-wider ml-0.5">L</span>
            </span>
            <span className="text-[9px] font-extrabold text-slate-550 dark:text-slate-400 uppercase tracking-widest mt-1">
              {glasses} / {target} Gläser
            </span>
            <span className="text-[7.5px] font-mono opacity-70 mt-0.5">
              Ziel: {targetLiters} Liter (10 Gläser)
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isOverTarget ? (
              <motion.div 
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                className="text-[8.5px] uppercase font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm"
              >
                <span>🐳 Hydriert! Streak +1</span>
              </motion.div>
            ) : glasses > 0 ? (
              <div className="text-[8px] uppercase font-black text-cyan-500 dark:text-cyan-400 animate-pulse bg-cyan-500/10 px-2 py-0.5 rounded-full">
                Gut gemacht! Weiter so! 🥤
              </div>
            ) : (
              <div className="text-[7.5px] uppercase font-extrabold text-slate-400 italic">Bleibe fit und trinke Wasser! 🧘</div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Buttons controllers for multiple containers */}
      <div className="flex flex-col gap-1.5 shrink-0 select-none">
        
        {/* Quick select buttons */}
        <div className="flex gap-1">
          <button 
            onClick={() => modifyGlasses(1)}
            className="flex-1 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/25 text-cyan-500 dark:text-cyan-400 text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
            title="Glas (+250 ml)"
          >
            🥛 Glas (+1)
          </button>
          <button 
            onClick={() => modifyGlasses(2)}
            className="flex-1 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-500 dark:text-sky-400 text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
            title="Sportflasche (+500 ml)"
          >
            🧴 Flasche (+2)
          </button>
          <button 
            onClick={() => modifyGlasses(4)}
            className="flex-1 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 text-indigo-500 dark:text-indigo-400 text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
            title="Flasche/Karaffe (+1000 ml)"
          >
            🏺 Karaffe (+4)
          </button>
        </div>

        {/* Adjuster buttons */}
        <div className="flex gap-1.5">
          <button 
            onClick={() => modifyGlasses(-1)}
            disabled={glasses === 0}
            className={`flex-1 py-1 rounded-xl text-[9px] font-black border transition-transform active:scale-95 cursor-pointer ${
              glasses === 0 ? 'opacity-40 cursor-not-allowed' : ''
            } ${
              currentIsLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500' : 'bg-zinc-900 hover:bg-zinc-805 border-white/5 text-slate-400'
            }`}
          >
            -1 Glas
          </button>
          <button 
            onClick={() => modifyGlasses(1)}
            className="flex-grow py-1 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white text-[9px] font-black cursor-pointer shadow-md shadow-cyan-500/10 active:scale-95 transition-all"
          >
            +1 Glas 💧
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 8: WORTKETTE (Word Chain Vocabulary Game)
// ==========================================
export const WordchainWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "wordchain", {
    chain: ["Esel", "Löwe", "Elefant", "Tiger"],
    wordInput: "",
    feedback: null as string | null,
    hints: [] as string[],
    owlState: "happy" as "happy" | "thinking" | "confused" | "cheering",
  });
  const [chain, setChain] = useState<string[]>(() => lifecycle.chain);
  const [wordInput, setWordInput] = useState<string>(() => lifecycle.wordInput);
  const [feedback, setFeedback] = useState<string | null>(() => lifecycle.feedback);
  const [hints, setHints] = useState<string[]>(() => lifecycle.hints);
  const [owlState, setOwlState] = useState<'happy' | 'thinking' | 'confused' | 'cheering'>(() => lifecycle.owlState);

  usePersistedWidgetLifecycleState(widget, onUpdate, "wordchain", {
    chain,
    wordInput,
    feedback,
    hints,
    owlState,
  });

  const schoolWordsDict: Record<string, string[]> = {
    A: ["Apfel 🍎", "Affe 🐒", "Ameise 🐜", "Auto 🚗", "Auge 👁️"],
    B: ["Baum 🌳", "Ball ⚽", "Biene 🐝", "Buch 📖", "Brot 🍞"],
    C: ["Clown 🤡", "Computer 💻", "Chor 🎤", "Café ☕"],
    D: ["Delfin 🐬", "Drache 🐉", "Dino 🦖", "Dach 🏠"],
    E: ["Esel 🫏", "Elefant 🐘", "Ente 🦆", "Eis 🍦", "Erde 🌍"],
    F: ["Fisch 🐟", "Frosch 🐸", "Fuchs 🦊", "Feder 🪶", "Fahrrad 🚲"],
    G: ["Giraffe 🦒", "Gitarre 🎸", "Gabel 🍴", "Garten 🏡", "Gold 🪙"],
    H: ["Hund 🐶", "Haus 🏠", "Hase 🐰", "Himmel ☁️", "Honig 🍯"],
    I: ["Igel 🦔", "Insel 🏝️", "Imker 🐝", "Indianer 🤠"],
    J: ["Jaguar 🐆", "Jacke 🧥", "Jojo 🪀", "Junge 👦"],
    K: ["Katze 🐱", "Krokodil 🐊", "Krone 👑", "Keks 🍪", "Kind 👶"],
    L: ["Löwe 🦁", "Lampe 💡", "Löffel 🥄", "Lehrer 👨‍🏫", "Luftballon 🎈"],
    M: ["Maus 🐭", "Mond 🌙", "Möhre 🥕", "Mütze 🧢", "Milch 🥛"],
    N: ["Nashorn 🦏", "Nest 🪹", "Nase 👃", "Nuss 🌰"],
    O: ["Opa 👴", "Oma 👵", "Ordner 📁", "Obst 🍎", "Ozean 🌊"],
    P: ["Papagei 🦜", "Pinguin 🐧", "Pilz 🍄", "Puppe 🪆", "Pferd 🐎"],
    Q: ["Qualle 🪼", "Quark 🥣", "Quelle ⛲", "Quiz ❓"],
    R: ["Robbe 🦭", "Rakete 🚀", "Regen 🌧️", "Ring 💍", "Rad 🚲"],
    S: ["Sonne ☀️", "Schiff 🚢", "Schule 🏫", "Schnecke 🐌", "Stern ⭐"],
    T: ["Tiger 🐯", "Tasse ☕", "Tisch 🪑", "Tasche 🎒", "Torte 🎂"],
    U: ["Uhr ⏱️", "U-Boot 🚢", "Uhu 🦉", "Untertasse 🛸"],
    V: ["Vogel 🐦", "Vulkan 🌋", "Vase 🏺", "Vater 👨"],
    W: ["Wal 🐳", "Wolke ☁️", "Wurm 🪱", "Wasser 💧", "Wind 💨"],
    X: ["Xylophon 🎹", "Xerox 🖨️"],
    Y: ["Yeti ❄️", "Yacht ⛵", "Yoga 🧘"],
    Z: ["Zebra 🦓", "Zitrone 🍋", "Zahn 🦷", "Zelt ⛺", "Zug 🚂"]
  };

  const playChainSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      }
    } catch (e) {}
  };

  const currLetter = chain.length > 0 
    ? chain[chain.length - 1].charAt(chain[chain.length - 1].length - 1).toUpperCase() 
    : '?';

  const triggerHint = () => {
    const list = schoolWordsDict[currLetter] || [];
    if (list.length > 0) {
      const shuffled = [...list].sort(() => 0.5 - Math.random()).slice(0, 3);
      setHints(shuffled);
      setOwlState('thinking');
    } else {
      setHints(["Keine Tipps verfügbar, sei kreativ! 💡"]);
      setOwlState('confused');
    }
  };

  const speakWord = (word: string) => {
    if (!word) return;
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'de-DE';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {}
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const cleanWord = wordInput.trim();
    if (!cleanWord) return;

    // Check letter match
    if (chain.length > 0) {
      const prev = chain[chain.length - 1];
      const prevLast = prev.toLowerCase().charAt(prev.length - 1);
      const nextFirst = cleanWord.toLowerCase().charAt(0);
      
      if (prevLast !== nextFirst) {
        setFeedback(`Fehler: "${cleanWord}" muss mit '${prevLast.toUpperCase()}' beginnen!`);
        playChainSound('error');
        setOwlState('confused');
        return;
      }
    }

    // Check duplicate words
    const isDup = chain.some(t => t.toLowerCase() === cleanWord.toLowerCase());
    if (isDup) {
      setFeedback(`Fehler: "${cleanWord}" wurde bereits verwendet!`);
      playChainSound('error');
      setOwlState('confused');
      return;
    }

    // Success commit
    setChain(prev => [...prev, cleanWord]);
    setWordInput("");
    setFeedback(null);
    setHints([]);
    playChainSound('success');
    setOwlState('cheering');
    speakWord(cleanWord);
    setTimeout(() => setOwlState('happy'), 1500);
  };

  const popWord = () => {
    if (chain.length <= 1) return;
    setChain(prev => prev.slice(0, prev.length - 1));
    setFeedback(null);
    setHints([]);
    setOwlState('happy');
  };

  const renderHighlightedWord = (word: string) => {
    if (word.length < 2) return <span className="font-sans font-black">{word}</span>;
    const first = word.charAt(0);
    const middle = word.slice(1, -1);
    const last = word.charAt(word.length - 1);
    return (
      <span className="font-sans font-black inline-flex items-center gap-0.5 select-none">
        <span className="text-emerald-500 font-extrabold underline decoration-2">{first}</span>
        <span>{middle}</span>
        <span className="text-amber-500 font-extrabold underline decoration-2">{last}</span>
      </span>
    );
  };

  const getOwlEmoji = () => {
    switch (owlState) {
      case 'thinking': return '🦉🧠';
      case 'confused': return '🦉❔';
      case 'cheering': return '🦉✨🏆';
      default: return '🦉🎓';
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2.5 h-full min-h-0 pointer-events-auto select-none gap-1.5">
      <div className="flex justify-between items-center px-1 shrink-0">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🔗 Phonetische Wortkette
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Score: {chain.length} Wörter</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <button 
            onClick={triggerHint}
            className="px-2 py-0.5 rounded text-[7.5px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-white cursor-pointer active:scale-95 transition-all shadow-xs"
            title="Tipp bekommen"
          >
            💡 Tipp
          </button>
          {chain.length > 1 && (
            <button 
              onClick={popWord}
              className="text-[7.5px] font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer"
            >
              Zurück ⬅️
            </button>
          )}
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-between min-h-0 py-0.5 gap-1.5 select-none">
        {/* Animated word lists chain */}
        <div className="flex-grow overflow-y-auto max-h-[85px] py-1 px-1.5 flex flex-wrap gap-1.5 items-center justify-start border-2 border-dashed rounded-xl border-indigo-200/55 dark:border-white/10 select-none scrollbar-thin">
          {chain.map((w, idx) => {
            const isActive = idx === chain.length - 1;
            return (
              <div key={idx} className="flex items-center gap-1 shrink-0 select-none">
                {idx > 0 && <span className="text-[8px] text-slate-400">➔</span>}
                <button
                  onClick={() => speakWord(w)}
                  className={`px-2 py-0.5 rounded-lg text-[9.5px] shadow-xs select-none transition-all cursor-pointer hover:scale-105 active:scale-95 border ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white tracking-wide scale-[1.03] ring-2 ring-indigo-400/30 border-transparent font-extrabold'
                      : currentIsLight
                      ? 'bg-white text-slate-750 hover:bg-slate-50 border-slate-205'
                      : 'bg-zinc-900 text-slate-300 border-white/5 hover:bg-zinc-800'
                  }`}
                  title="Wort anhören"
                >
                  {renderHighlightedWord(w)}
                </button>
              </div>
            );
          })}
        </div>

        {/* Word hints display */}
        {hints.length > 0 && (
          <div className="flex flex-col items-center justify-center p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-fade-in shrink-0">
            <span className="text-[7.5px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">Tipp-Kiste von Schlaubi:</span>
            <div className="flex gap-1.5 mt-1">
              {hints.map((hint, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const rawWord = hint.split(" ")[0]; // remove emoji
                    setWordInput(rawWord);
                    setHints([]);
                    setOwlState('cheering');
                  }}
                  className="px-2 py-0.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-black text-[8px] cursor-pointer transition-transform hover:scale-105 active:scale-95 shadow-sm"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Teacher Owl & Letter alert status bar */}
        <div className="h-6 flex items-center justify-between px-1.5 bg-slate-50 dark:bg-zinc-900/60 rounded-lg border border-slate-200/40 dark:border-white/5 shrink-0 select-none">
          <div className="flex items-center gap-1">
            <span className="text-sm animate-pulse">{getOwlEmoji()}</span>
            <span className="text-[7.5px] font-black text-indigo-600 dark:text-indigo-400">SCHLAUBI</span>
          </div>

          <div className="flex-grow text-center px-2">
            {feedback ? (
              <span className="text-[7.5px] font-black uppercase text-rose-500 animate-bounce leading-none">{feedback}</span>
            ) : (
              <span className="text-[7px] font-bold text-slate-500 dark:text-slate-400">
                Endet auf <span className="text-[8.5px] font-black text-amber-500">'{currLetter}'</span> ➔ Beginne mit <span className="text-[8.5px] font-black text-emerald-500">'{currLetter}'</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-1.5 shrink-0 select-none">
        <input
          type="text"
          value={wordInput}
          onChange={e => setWordInput(e.target.value.replace(/[^a-zA-ZäöüÄÖÜß-]/g, ""))}
          placeholder={`Wort mit '${currLetter}'...`}
          className="flex-grow text-[9.5px] font-bold px-2.5 py-1.5 rounded-lg border outline-none dark:bg-zinc-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 border-slate-200 dark:border-white/5 focus:border-indigo-400 transition-colors"
        />
        <button
          type="submit"
          className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[9px] uppercase tracking-widest cursor-pointer shadow-md select-none active:scale-95 transition-all"
        >
          Senden
        </button>
      </form>
    </div>
  );
};

// ==========================================
// NEW WIDGET 9: STIMMUNGSTHERMOMETER (Mood Board)
// ==========================================
export const MoodmeterWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [votedCounts, setVotedCounts] = useState<{ [key: string]: number }>({
    "😆": 3,
    "🙂": 5,
    "🥱": 2,
    "😕": 1,
    "😡": 0
  });

  const voteMood = (moodKey: string) => {
    setVotedCounts(prev => ({ ...prev, [moodKey]: prev[moodKey] + 1 }));
  };

  const totalVotes = Object.values(votedCounts).reduce((acc, c) => acc + c, 0);

  const resetVotes = () => {
    setVotedCounts({
      "😆": 0,
      "🙂": 0,
      "🥱": 0,
      "😕": 0,
      "😡": 0
    });
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
          Anonymes Stimmungsthermometer
        </span>
        {totalVotes > 0 && (
          <button 
            onClick={resetVotes}
            className="text-[7.5px] font-black text-rose-500 uppercase tracking-widest hover:underline cursor-pointer"
          >
            Leeren 🧹
          </button>
        )}
      </div>

      {/* Visual statistics charts feedback */}
      <div className="flex-grow flex flex-col gap-1.5 justify-center min-h-0 p-1 bg-black/5 dark:bg-black/20 rounded-2xl select-none">
        {Object.keys(votedCounts).map((key) => {
          const val = votedCounts[key];
          const pct = totalVotes > 0 ? (val / totalVotes) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-2 select-none">
              <button 
                onClick={() => voteMood(key)}
                className="w-5 h-5 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-800 text-sm hover:scale-115 border border-slate-200 dark:border-white/5 cursor-pointer shadow-xs active:scale-95 text-center leading-none"
                title="Stimme abgeben!"
              >
                {key}
              </button>
              
              <div className="flex-grow h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden relative select-none flex items-center pl-1.5 border border-transparent">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.3 }}
                  className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-full"
                />
                <span className="z-10 text-[8.5px] font-black text-white/95 text-left leading-none tracking-tight mix-blend-exclusion">
                  {val} ({Math.round(pct)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[7.5px] font-bold text-slate-400 uppercase text-center tracking-wider select-none shrink-0 mb-0.5">
        Tappe auf ein Emoji, um deine Stimme abzugeben!
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 10: FARBMISCHER (Art Color Theory Mixer)
// ==========================================
export const ColormixerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [drops, setDrops] = useState<Array<'red' | 'yellow' | 'blue' | 'white'>>([]);
  const [questSuccess, setQuestSuccess] = useState<boolean | null>(null);
  const [score, setScore] = useState<number>(0);
  const [showTip, setShowTip] = useState<boolean>(false);
  const [isMixing, setIsMixing] = useState<boolean>(false);
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [splashes, setSplashes] = useState<Array<{ id: number, x: number, color: string }>>([]);
  const [squeezingTube, setSqueezingTube] = useState<'red' | 'yellow' | 'blue' | 'white' | null>(null);
  const [fallingDrops, setFallingDrops] = useState<Array<{ id: number, color: 'red' | 'yellow' | 'blue' | 'white', x: number }>>([]);

  const colorsMap = {
    red: '#ef4444',
    yellow: '#eab308',
    blue: '#3b82f6',
    white: '#ffffff'
  };

  const quests = useMemo(() => [
    { 
      target: "Grün 🍏", 
      hint: "Gelb 🟡 + Blau 🔵", 
      desc: "Mische zwei Primärfarben, um die Farbe von sauren Äpfeln zu erhalten. Ein Partner ist die Farbe der heißen Sonne, der andere das kühle, tiefe Meer.", 
      check: (ds: string[]) => ds.includes('yellow') && ds.includes('blue') && !ds.includes('red') 
    },
    { 
      target: "Orange 🍊", 
      hint: "Rot 🔴 + Gelb 🟡", 
      desc: "Diese saftige Mischung hat denselben Namen wie eine süße Zitrusfrucht. Du brauchst die feurige Farbe der Liebe und die strahlende Sonne.", 
      check: (ds: string[]) => ds.includes('red') && ds.includes('yellow') && !ds.includes('blue') 
    },
    { 
      target: "Violett / Lila 🍇", 
      hint: "Rot 🔴 + Blau 🔵", 
      desc: "Eine königliche, edle Farbe. Mische die Signalfarbe der Feuerwehr mit der weiten Farbe des wolkenlosen Sommerhimmels.", 
      check: (ds: string[]) => ds.includes('red') && ds.includes('blue') && !ds.includes('yellow') 
    },
    { 
      target: "Rosa / Hellrot 🌸", 
      hint: "Rot 🔴 + Weiß ⚪", 
      desc: "Eine zarte Blütenfarbe wie Frühlings-Kirschblüten. Du nimmst ein kräftiges, feuriges Rot und schwächst es mit etwas Sanftem ab.", 
      check: (ds: string[]) => ds.includes('red') && ds.includes('white') && !ds.includes('blue') && !ds.includes('yellow') 
    },
    { 
      target: "Hellgrün / Pastellgrün 🥬", 
      hint: "Gelb 🟡 + Blau 🔵 + Weiß ⚪", 
      desc: "Wie frischer, knackiger Salat im Gemüsegarten. Du mischst zuerst ein saftiges Grün und bringst dann helles Licht hinein.", 
      check: (ds: string[]) => ds.includes('yellow') && ds.includes('blue') && ds.includes('white') && !ds.includes('red') 
    }
  ], []);

  const [activeQuestIdx, setActiveQuestIdx] = useState<number>(0);
  const currentQuest = quests[activeQuestIdx];

  const handleAddDrop = (color: 'red' | 'yellow' | 'blue' | 'white') => {
    if (drops.length >= 8 || isMixing) return;
    setSqueezingTube(color);
    setTimeout(() => setSqueezingTube(null), 250);

    const newDropId = Date.now() + Math.random();
    // Random position horizontally to fall down
    const randomX = 15 + Math.random() * 70;
    setFallingDrops(prev => [...prev, { id: newDropId, color, x: randomX }]);

    // Drop falls and lands in beaker after 500ms
    setTimeout(() => {
      setDrops(prev => [...prev, color]);
      setQuestSuccess(null);
      setIsMixed(false);
      setFallingDrops(prev => prev.filter(d => d.id !== newDropId));

      // Trigger splash ripple animation
      const splashId = Date.now() + Math.random();
      setSplashes(prev => [...prev, { id: splashId, x: randomX, color }]);
      setTimeout(() => {
        setSplashes(prev => prev.filter(s => s.id !== splashId));
      }, 800);
    }, 500);
  };

  const handleClear = () => {
    if (isMixing) return;
    setDrops([]);
    setQuestSuccess(null);
    setIsMixed(false);
  };

  const handleVerify = () => {
    if (drops.length === 0 || isMixing) return;
    setIsMixing(true);
    setQuestSuccess(null);

    // Run beautiful vortex swirl animation
    setTimeout(() => {
      setIsMixing(false);
      setIsMixed(true);
      const isMatched = currentQuest.check(drops);
      setQuestSuccess(isMatched);
      if (isMatched) {
        setScore(prev => prev + 1);
        import('canvas-confetti').then(m => {
          if (m && typeof m.default === 'function') {
            m.default({ particleCount: 70, spread: 60, origin: { y: 0.85 } });
          }
        }).catch(() => {});
      }
    }, 1500);
  };

  const handleNextQuest = () => {
    setActiveQuestIdx(prev => (prev + 1) % quests.length);
    setDrops([]);
    setQuestSuccess(null);
    setIsMixed(false);
    setShowTip(false);
  };

  // Color mix math algorithm (RGB Weighted Averaging)
  const mixResult = useMemo(() => {
    if (drops.length === 0) return { hex: "#e2e8f0", r: 226, g: 232, b: 240, name: "Leer 🧪" };
    let r = 0, g = 0, b = 0;
    drops.forEach(d => {
      if (d === 'red') { r += 239; g += 68; b += 68; }
      else if (d === 'yellow') { r += 234; g += 179; b += 8; }
      else if (d === 'blue') { r += 59; g += 130; b += 246; }
      else if (d === 'white') { r += 255; g += 255; b += 255; }
    });
    r = Math.round(r / drops.length);
    g = Math.round(g / drops.length);
    b = Math.round(b / drops.length);

    // Human-friendly naming logic
    const count = { red: 0, yellow: 0, blue: 0, white: 0 };
    drops.forEach(d => count[d]++);

    let name = "Mischfarbe 🎨";
    if (count.white > 0 && count.white === drops.length) {
      name = "Kreideweiß ⚪";
    } else if (count.red > 0 && count.yellow === 0 && count.blue === 0) {
      name = count.white > 0 ? "Pastellrosa 🌸" : "Erdbeerrot 🔴";
    } else if (count.yellow > 0 && count.red === 0 && count.blue === 0) {
      name = count.white > 0 ? "Hellgelb 🍦" : "Sonnengelb 🟡";
    } else if (count.blue > 0 && count.red === 0 && count.yellow === 0) {
      name = count.white > 0 ? "Himmelblau ❄️" : "Königsblau 🔵";
    } else {
      if (!count.red && count.yellow && count.blue) {
        name = count.white > 0 ? "Hellgrün / Lindgrün 🥬" : "Wiesengrün 🍏";
      } else if (count.red && count.yellow && !count.blue) {
        name = count.white > 0 ? "Pfirsichfarben 🍑" : "Laufendes Orange 🍊";
      } else if (count.red && !count.yellow && count.blue) {
        name = count.white > 0 ? "Flieder / Hellviolett 🦄" : "Zartes Violett 🍇";
      } else if (count.red && count.yellow && count.blue) {
        name = "Schlammbraun 🤎";
      }
    }

    const toHex = (num: number) => {
      const hex = num.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return { hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`, r, g, b, name };
  }, [drops]);

  // Gradient representing component colors before mixing (unmixed chemical layers)
  const unmixedGradient = useMemo(() => {
    if (drops.length === 0) return "#e2e8f0";
    const colors = drops.map(d => colorsMap[d]);
    if (colors.length === 1) return colors[0];
    return `linear-gradient(to bottom, ${colors.join(', ')})`;
  }, [drops]);

  // Gradient representing component colors spinning during mix
  const mixingGradient = useMemo(() => {
    if (drops.length === 0) return "";
    const uniqueDrops = Array.from(new Set(drops));
    const hexColors = uniqueDrops.map(d => colorsMap[d]);
    if (hexColors.length === 1) return hexColors[0];
    return `linear-gradient(135deg, ${hexColors.join(', ')})`;
  }, [drops]);

  const countOf = (col: string) => drops.filter(d => d === col).length;

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      {/* Title with Score */}
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8.5px] font-black uppercase tracking-widest flex items-center gap-1 ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
          🧪 Zauber-Mischbecher
        </span>
        <div className="flex items-center gap-1 bg-indigo-500/10 px-1.5 py-0.5 rounded-full border border-indigo-500/20">
          <span className="text-[7.5px] text-indigo-500 font-extrabold uppercase">Punkte:</span>
          <span className="text-[8.5px] font-bold text-indigo-600 dark:text-indigo-300 font-mono">🏆 {score}</span>
        </div>
      </div>

      {/* Quest / Challenge Banner */}
      <div className={`p-1.5 rounded-xl border flex flex-col gap-0.5 relative overflow-hidden shrink-0 transition-all ${
        questSuccess === true 
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
          : questSuccess === false 
            ? "bg-rose-500/10 border-rose-500/30 text-rose-500 dark:text-rose-400" 
            : currentIsLight ? "bg-slate-50 border-slate-200" : "bg-zinc-900 border-white/5"
      }`}>
        <div className="flex justify-between items-start gap-1">
          <span className="text-[8px] font-black uppercase text-indigo-500">
            🎯 Farbtheorie-Rätsel:
          </span>
          {questSuccess === true && (
            <span className="text-[7.5px] font-bold uppercase text-emerald-500 animate-bounce">
              Perfekt! 🎉
            </span>
          )}
        </div>
        <p className="text-[10px] font-black leading-snug">
          {questSuccess === true ? "Gebacken und gemischt! Well done." : `Mische ${currentQuest.target}`}
        </p>
        <p className="text-[8px] opacity-90 leading-tight">
          {currentQuest.desc}
        </p>

        {/* Tip Toggle mechanism */}
        {questSuccess !== true && (
          <div className="flex items-center gap-2 mt-1">
            <button 
              type="button"
              onClick={() => setShowTip(!showTip)}
              className="text-[8px] font-extrabold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 cursor-pointer flex items-center gap-0.5 bg-indigo-500/5 px-1.5 py-0.5 rounded-md border border-indigo-500/10"
            >
              <span>💡</span> {showTip ? "Tipp verbergen" : "Rezept-Tipp anzeigen"}
            </button>
            {showTip && (
              <motion.span 
                initial={{ opacity: 0, x: -5 }} 
                animate={{ opacity: 1, x: 0 }} 
                className="text-[8px] font-mono font-black text-indigo-600 dark:text-indigo-300"
              >
                Rezept: {currentQuest.hint}
              </motion.span>
            )}
          </div>
        )}

        {questSuccess === true && (
          <button 
            onClick={handleNextQuest}
            className="absolute right-1.5 bottom-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[8px] uppercase tracking-wider cursor-pointer shadow-md active:scale-95 transition-all"
          >
            Nächste Mission ➜
          </button>
        )}
      </div>

      {/* Interactive Visual Cup/Beaker container */}
      <div className="flex-grow flex items-center justify-around gap-1 min-h-0 relative py-1">
        
        {/* Mixing Beaker Container */}
        <motion.div 
          animate={isMixing ? {
            rotate: [-6, 6, -6, 6, -3, 3, 0],
            x: [-2, 2, -2, 2, 0],
            scale: [1, 1.05, 0.98, 1.02, 1]
          } : {}}
          transition={{ duration: 1.5 }}
          className="relative w-20 h-22 border-3 border-t-0 border-slate-300 dark:border-neutral-700 rounded-b-3xl flex flex-col justify-end overflow-hidden shadow-lg bg-black/[0.02]"
        >
          {/* Glass glare effect */}
          <div className="absolute inset-y-0 right-1.5 w-1 bg-white/20 rounded-full pointer-events-none z-35" />
          
          {/* Empty Beaker placeholder status */}
          {drops.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <span className="text-[7.5px] font-black text-slate-400 dark:text-neutral-500 select-none opacity-60 uppercase tracking-widest animate-pulse">
                Leer 🧪
              </span>
            </div>
          )}

          {/* Liquid Vortex swirl during mixing */}
          {isMixing && (
            <div className="absolute inset-0 pointer-events-none z-25 overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  className="w-12 h-12 rounded-full border-2 border-dashed border-white/40 relative flex items-center justify-center"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-sm animate-pulse" />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-sm animate-pulse" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-400 shadow-sm animate-pulse" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border shadow-sm animate-pulse" />
                </motion.div>
              </div>
            </div>
          )}

          {/* Falling liquid droplets */}
          {fallingDrops.map(drop => (
            <motion.div
              key={drop.id}
              initial={{ y: -80, scale: 1.5, opacity: 1 }}
              animate={{ y: 90, scale: [1.5, 1, 0.5], opacity: [1, 1, 0] }}
              transition={{ duration: 0.5, ease: "easeIn" }}
              className={`absolute w-3.5 h-3.5 rounded-full z-15 shadow-sm ${
                drop.color === 'red' ? 'bg-red-500' : drop.color === 'yellow' ? 'bg-yellow-400' : drop.color === 'blue' ? 'bg-blue-500' : 'bg-white border border-slate-300'
              }`}
              style={{ left: `${drop.x}%` }}
            />
          ))}

          {/* Dynamic liquid fill element */}
          <motion.div 
            animate={{ 
              height: `${drops.length === 0 ? 0 : Math.min(100, drops.length * 12.5)}%`,
              scaleY: isMixing ? [1, 1.15, 0.9, 1.05, 1] : 1
            }}
            transition={{ type: "spring", stiffness: 80, damping: 12 }}
            style={{ background: isMixed ? mixResult.hex : unmixedGradient }}
            className="w-full relative flex items-center justify-center border-t border-white/35 transition-all"
          >
            {/* Liquid shine lines */}
            <div className="absolute inset-x-0 top-0 h-1 bg-white/25 z-10" />

            {/* Rotating colorful gradient swirl layer on active mixing */}
            {isMixing && (
              <motion.div
                initial={{ opacity: 0, rotate: 0, scale: 1 }}
                animate={{ opacity: 1, rotate: 360, scale: [1, 1.25, 1] }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                style={{ background: mixingGradient }}
                className="absolute inset-0 z-5"
              />
            )}

            {/* Fluid Animated Liquid Wave overlay */}
            {drops.length > 0 && (
              <div className="absolute left-0 right-0 -top-2 h-2.5 overflow-hidden pointer-events-none w-full z-10">
                {/* Wave Layer 1 */}
                <motion.svg
                  viewBox="0 0 160 20"
                  preserveAspectRatio="none"
                  className="absolute left-0 bottom-0 h-full w-[200%] z-10"
                  style={{ fill: isMixing ? '#a5b4fc' : isMixed ? mixResult.hex : (colorsMap[drops[0]] || '#e2e8f0') }}
                  animate={{ x: ['0%', '-50%'] }}
                  transition={{ repeat: Infinity, duration: isMixing ? 0.8 : 2.5, ease: "linear" }}
                >
                  <path d="M 0 10 Q 20 4, 40 10 T 80 10 T 120 10 T 160 10 L 160 20 L 0 20 Z" />
                </motion.svg>

                {/* Wave Layer 2 */}
                <motion.svg
                  viewBox="0 0 160 20"
                  preserveAspectRatio="none"
                  className="absolute left-0 bottom-0 h-full w-[200%] opacity-55 z-20"
                  style={{ fill: isMixing ? '#818cf8' : isMixed ? mixResult.hex : (colorsMap[drops[drops.length - 1]] || '#e2e8f0') }}
                  animate={{ x: ['-50%', '0%'] }}
                  transition={{ repeat: Infinity, duration: isMixing ? 0.6 : 1.8, ease: "linear" }}
                >
                  <path d="M 0 10 Q 20 4, 40 10 T 80 10 T 120 10 T 160 10 L 160 20 L 0 20 Z" />
                </motion.svg>
              </div>
            )}

            {/* Floating liquid bubbles */}
            {drops.length > 0 && Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: "100%", x: `${15 + i * 20}%`, scale: 0.5 + Math.random() * 0.5, opacity: 0 }}
                animate={{ 
                  y: "-100%", 
                  x: [
                    `${15 + i * 20}%`, 
                    `${15 + i * 20 + (Math.random() * 12 - 6)}%`, 
                    `${15 + i * 20}%`
                  ],
                  opacity: [0, 0.7, 0.7, 0]
                }}
                transition={{ 
                  duration: 2.2 + Math.random() * 2, 
                  repeat: Infinity, 
                  delay: i * 0.5,
                  ease: "easeInOut"
                }}
                className="absolute bottom-0 w-1.5 h-1.5 rounded-full bg-white/40 pointer-events-none z-10 border border-white/20"
              />
            ))}

            {/* Splash ripples upon droplets landing */}
            {splashes.map(s => {
              const bgClass = s.color === 'red' ? 'bg-red-400' : s.color === 'yellow' ? 'bg-yellow-300' : s.color === 'blue' ? 'bg-blue-400' : 'bg-white';
              return (
                <motion.div
                  key={s.id}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{ scale: [0, 1.8, 3.2], opacity: [0.8, 0.4, 0] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`absolute w-4 h-4 rounded-full border border-white/30 -translate-x-1/2 -translate-y-1/2 z-20 ${bgClass}`}
                  style={{ left: `${s.x}%`, top: '0px' }}
                />
              );
            })}
            
            {drops.length > 0 && (
              <span className="text-[8px] font-black tracking-wider text-black/40 mix-blend-overlay animate-pulse select-none uppercase z-10">
                {drops.length}/8 Tropfen
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Proportions Stats Display */}
        <div className="flex flex-col gap-1 text-[8.5px] font-black uppercase text-slate-450">
          <span className="border-b pb-0.5 text-center mb-0.5 border-slate-200 dark:border-white/5 text-[7.5px] tracking-wider text-slate-400">Verhältnis:</span>
          <div className="flex items-center gap-1 text-red-500">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>Rot: {countOf('red')}x</span>
          </div>
          <div className="flex items-center gap-1 text-amber-500">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <span>Gelb: {countOf('yellow')}x</span>
          </div>
          <div className="flex items-center gap-1 text-blue-500">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Blau: {countOf('blue')}x</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-full bg-white border" />
            <span>Weiß: {countOf('white')}x</span>
          </div>
        </div>
      </div>

      {/* Squeezable Paint Tube Buttons with squeeze bounce */}
      <div className="shrink-0 flex items-center justify-between gap-1 select-none">
        <motion.button 
          onClick={() => handleAddDrop('red')}
          disabled={drops.length >= 8 || isMixing}
          animate={squeezingTube === 'red' ? { scale: 0.85, rotate: -5 } : { scale: 1 }}
          className="flex-1 py-1 rounded-xl bg-gradient-to-b from-red-400 to-red-600 text-white font-extrabold text-[8.5px] uppercase cursor-pointer transition-all shadow-sm flex flex-col items-center gap-0.5 disabled:opacity-50"
        >
          <span>Rot 🔴</span>
          <span className="text-[6.5px] opacity-75 font-mono">+ Tropfen</span>
        </motion.button>

        <motion.button 
          onClick={() => handleAddDrop('yellow')}
          disabled={drops.length >= 8 || isMixing}
          animate={squeezingTube === 'yellow' ? { scale: 0.85, rotate: 5 } : { scale: 1 }}
          className="flex-1 py-1 rounded-xl bg-gradient-to-b from-yellow-450 from-yellow-400 to-amber-500 text-slate-900 font-extrabold text-[8.5px] uppercase cursor-pointer transition-all shadow-sm flex flex-col items-center gap-0.5 disabled:opacity-50"
        >
          <span>Gelb 🟡</span>
          <span className="text-[6.5px] opacity-75 font-mono">+ Tropfen</span>
        </motion.button>

        <motion.button 
          onClick={() => handleAddDrop('blue')}
          disabled={drops.length >= 8 || isMixing}
          animate={squeezingTube === 'blue' ? { scale: 0.85, rotate: -5 } : { scale: 1 }}
          className="flex-1 py-1 rounded-xl bg-gradient-to-b from-blue-400 to-blue-600 text-white font-extrabold text-[8.5px] uppercase cursor-pointer transition-all shadow-sm flex flex-col items-center gap-0.5 disabled:opacity-50"
        >
          <span>Blau 🔵</span>
          <span className="text-[6.5px] opacity-75 font-mono">+ Tropfen</span>
        </motion.button>

        <motion.button 
          onClick={() => handleAddDrop('white')}
          disabled={drops.length >= 8 || isMixing}
          animate={squeezingTube === 'white' ? { scale: 0.85, rotate: 5 } : { scale: 1 }}
          className="flex-1 py-1 rounded-xl bg-gradient-to-b from-slate-100 to-white text-slate-750 border border-slate-300 text-slate-800 font-extrabold text-[8.5px] uppercase cursor-pointer transition-all shadow-sm flex flex-col items-center gap-0.5 disabled:opacity-50"
        >
          <span>Weiß ⚪</span>
          <span className="text-[6.5px] opacity-75 font-mono">+ Tropfen</span>
        </motion.button>
      </div>

      {/* Control Actions & Current Mixed Color Banner */}
      <div className="shrink-0 flex items-center justify-between gap-2 border-t pt-1.5 border-slate-100 dark:border-white/5 select-none">
        
        {/* Reset */}
        <button 
          onClick={handleClear}
          disabled={isMixing}
          className={`px-2 py-1.5 rounded-xl border text-[8.5px] font-black uppercase transition-all cursor-pointer disabled:opacity-40 ${
            currentIsLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600' : 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-slate-300'
          }`}
          title="Mischbecher reinigen"
        >
          Leeren 🧹
        </button>

        {/* Squeezed blend display */}
        <div className="flex-grow flex items-center gap-2 justify-center bg-black/5 dark:bg-black/15 p-1 rounded-xl border border-transparent dark:border-white/5 limit-w-36">
          <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: mixResult.hex }} />
          <div className="flex flex-col text-left truncate">
            <span className="text-[8.5px] font-black truncate">{isMixing ? "Mischen..." : mixResult.name}</span>
            <span className="text-[6.5px] font-mono opacity-60 font-medium">{mixResult.hex.toUpperCase()}</span>
          </div>
        </div>

        {/* Verify solution button */}
        <button 
          onClick={handleVerify}
          disabled={drops.length === 0 || questSuccess === true || isMixing}
          className={`px-3 py-1.5 rounded-xl text-white font-extrabold text-[8.5px] uppercase tracking-wider shadow active:scale-95 cursor-pointer flex items-center gap-1 transition-all ${
            drops.length === 0 || questSuccess === true || isMixing
              ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-zinc-800 text-slate-500' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/15'
          }`}
        >
          {isMixing ? "Wirbelt... 🌀" : "Mischen & Prüfen! 🧪"}
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 11: BUCHSTABENGITTER (Word Grid Finder)
// ==========================================
export const WordgridWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "wordgrid", {
    difficulty: "easy" as "easy" | "medium" | "hard",
    grid: [] as string[][],
    targetWords: [] as string[],
    selectedLetters: [] as string[],
    foundWords: [] as string[],
    foundCells: [] as string[],
    message: "Suchgitter geladen! Finde alle Wörter. 🔍",
    stars: 0,
  });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => lifecycle.difficulty);
  const [grid, setGrid] = useState<string[][]>(() => lifecycle.grid);
  const [targetWords, setTargetWords] = useState<string[]>(() => lifecycle.targetWords);
  const [selectedLetters, setSelectedLetters] = useState<string[]>(() => lifecycle.selectedLetters);
  const [foundWords, setFoundWords] = useState<string[]>(() => lifecycle.foundWords);
  const [foundCells, setFoundCells] = useState<string[]>(() => lifecycle.foundCells);
  const [message, setMessage] = useState<string>(() => lifecycle.message);
  const [stars, setStars] = useState<number>(() => lifecycle.stars);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "wordgrid"));
  const previousDifficultyRef = useRef(difficulty);

  usePersistedWidgetLifecycleState(widget, onUpdate, "wordgrid", {
    difficulty,
    grid,
    targetWords,
    selectedLetters,
    foundWords,
    foundCells,
    message,
    stars,
  });

  // Word pools for each difficulty
  const wordPools = {
    easy: ['BUCH', 'KIND', 'HEFT', 'TAFEL', 'MAUS', 'TIER', 'BAUM'],
    medium: ['SCHULE', 'LERNEN', 'SPIEL', 'KLASSE', 'STIFT', 'HEUTE', 'TINTE'],
    hard: ['SCHREIBEN', 'RECHNEN', 'FERIEN', 'LEHRER', 'WISSEN', 'FREUNDE', 'ZEICHNEN']
  };

  const initGridGame = useCallback((diff: 'easy' | 'medium' | 'hard') => {
    const size = diff === 'easy' ? 5 : diff === 'medium' ? 6 : 7;
    const pool = wordPools[diff];
    const numWords = diff === 'easy' ? 3 : diff === 'medium' ? 4 : 5;
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffledPool.slice(0, numWords);
    
    // Initialize empty grid
    let newGrid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
    
    selected.forEach(word => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 100) {
        attempts++;
        const dir = Math.floor(Math.random() * 2); // 0 = horizontal, 1 = vertical
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        
        if (dir === 0) {
          // Horizontal
          if (col + word.length <= size) {
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
              if (newGrid[row][col + i] !== '' && newGrid[row][col + i] !== word[i]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              for (let i = 0; i < word.length; i++) {
                newGrid[row][col + i] = word[i];
              }
              placed = true;
            }
          }
        } else {
          // Vertical
          if (row + word.length <= size) {
            let canPlace = true;
            for (let i = 0; i < word.length; i++) {
              if (newGrid[row + i][col] !== '' && newGrid[row + i][col] !== word[i]) {
                canPlace = false;
                break;
              }
            }
            if (canPlace) {
              for (let i = 0; i < word.length; i++) {
                newGrid[row + i][col] = word[i];
              }
              placed = true;
            }
          }
        }
      }
    });

    // Fill empty cells with random letters
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (newGrid[r][c] === '') {
          newGrid[r][c] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
      }
    }

    setGrid(newGrid);
    setTargetWords(selected);
    setSelectedLetters([]);
    setFoundWords([]);
    setFoundCells([]);
    setMessage('Wörtergitter bereit! Finde die Wörter. 🔍');
  }, []);

  useEffect(() => {
    const difficultyChanged = previousDifficultyRef.current !== difficulty;
    previousDifficultyRef.current = difficulty;
    if (!didRestoreRef.current || difficultyChanged) {
      didRestoreRef.current = true;
      initGridGame(difficulty);
    }
  }, [difficulty, initGridGame]);

  const toggleLetter = (row: number, col: number) => {
    const key = `${row}-${col}`;
    if (foundCells.includes(key)) return; // Already solved
    
    // Constraint: only allow selecting adjacent or free selection
    // To make it super simple, we let kids toggle free-style, but we maintain the click sequence!
    if (selectedLetters.includes(key)) {
      setSelectedLetters(prev => prev.filter(k => k !== key));
    } else {
      setSelectedLetters(prev => [...prev, key]);
    }
  };

  const triggerSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (success) {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else {
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {}
  };

  const currentSpelledWord = useMemo(() => {
    return selectedLetters.map(k => {
      const [r, c] = k.split('-').map(Number);
      return grid[r]?.[c] || '';
    }).join('');
  }, [selectedLetters, grid]);

  const checkSelection = () => {
    if (selectedLetters.length === 0) return;
    
    // Sort selected letters by coordinate sequence to respect reading direction
    const sortedKeys = [...selectedLetters].sort((a, b) => {
      const [r1, c1] = a.split('-').map(Number);
      const [r2, c2] = b.split('-').map(Number);
      return r1 === r2 ? c1 - c2 : r1 - r2;
    });

    const wordSorted = sortedKeys.map(k => {
      const [r, c] = k.split('-').map(Number);
      return grid[r][c];
    }).join('');

    const wordRaw = selectedLetters.map(k => {
      const [r, c] = k.split('-').map(Number);
      return grid[r][c];
    }).join('');

    const matchingWord = targetWords.find(w => 
      w === wordSorted || 
      w === wordSorted.split('').reverse().join('') || 
      w === wordRaw || 
      w === wordRaw.split('').reverse().join('')
    );

    if (matchingWord) {
      if (foundWords.includes(matchingWord)) {
        setMessage(`"${matchingWord}" hast du schon gefunden! ✨`);
        setSelectedLetters([]);
        triggerSound(false);
      } else {
        const newFoundWords = [...foundWords, matchingWord];
        setFoundWords(newFoundWords);
        setFoundCells(prev => [...prev, ...selectedLetters]);
        setMessage(`Klasse! "${matchingWord}" gefunden! 🎓🎉`);
        setSelectedLetters([]);
        triggerSound(true);
        setStars(prev => prev + 1);

        if (newFoundWords.length === targetWords.length) {
          setMessage('Super! Du hast alle Wörter im Gitter gefunden! 🏆👑');
        }
      }
    } else {
      setMessage('Kein passendes Wort... Probiere es noch einmal! 🔍');
      setSelectedLetters([]);
      triggerSound(false);
    }
  };

  const size = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 7;

  return (
    <div className="flex-grow flex flex-col justify-between p-2.5 h-full min-h-0 pointer-events-auto select-none gap-1.5">
      <div className="flex justify-between items-center px-1 shrink-0">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🔍 Buchstabengitter
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Sterne: {"⭐".repeat(stars)}</span>
        </div>
        <button 
          onClick={() => {
            initGridGame(difficulty);
            setStars(0);
          }} 
          className="text-[7.5px] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-600 cursor-pointer"
        >
          Neu Mischen 🔄
        </button>
      </div>

      {/* Difficulty selector */}
      <div className="flex gap-1.5 shrink-0 justify-center scale-95 leading-none">
        {(['easy', 'medium', 'hard'] as const).map(d => (
          <button
            key={d}
            onClick={() => {
              setDifficulty(d);
              setStars(0);
            }}
            className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-wide cursor-pointer transition-all ${
              difficulty === d
                ? 'bg-indigo-600 text-white shadow-sm'
                : currentIsLight
                  ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
            }`}
          >
            {d === 'easy' ? 'Leicht (5x5)' : d === 'medium' ? 'Mittel (6x6)' : 'Schwer (7x7)'}
          </button>
        ))}
      </div>

      {/* Spelled word bubble helper */}
      <div className="shrink-0 flex items-center justify-center min-h-[22px] px-1 bg-indigo-50 dark:bg-zinc-900/40 rounded-lg border border-indigo-100/40 dark:border-white/5">
        {selectedLetters.length > 0 ? (
          <div className="flex gap-1 items-center animate-fade-in">
            <span className="text-[7px] font-black uppercase tracking-widest text-indigo-500 mr-1">Dein Wort:</span>
            {currentSpelledWord.split('').map((char, index) => (
              <span key={index} className="w-4 h-4 rounded bg-indigo-500 text-white font-black text-[9px] flex items-center justify-center shadow-xs">
                {char}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500">Tippe Buchstaben nacheinander an!</span>
        )}
      </div>

      {/* Word Search Grid */}
      <div className="flex-grow flex items-center justify-center min-h-0">
        <div 
          className="grid gap-1 mx-auto"
          style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        >
          {grid.map((row, rIdx) => 
            row.map((letter, cIdx) => {
              const key = `${rIdx}-${cIdx}`;
              const isSel = selectedLetters.includes(key);
              const isFound = foundCells.includes(key);
              
              // Get click order index
              const clickIndex = selectedLetters.indexOf(key);

              return (
                <button
                  key={key}
                  onClick={() => toggleLetter(rIdx, cIdx)}
                  disabled={isFound}
                  className={`w-7 h-7 rounded-lg text-[11px] font-black flex items-center justify-center border transition-all cursor-pointer relative ${
                    isFound
                      ? 'bg-emerald-500 border-emerald-500 text-white opacity-90 shadow-sm font-extrabold scale-[0.98]'
                      : isSel
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-md font-black scale-105'
                        : currentIsLight
                          ? 'bg-slate-50 hover:bg-slate-150 border-slate-200 text-slate-800'
                          : 'bg-zinc-850 hover:bg-zinc-750 border-white/5 text-slate-200'
                  }`}
                >
                  {letter}
                  {isSel && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 text-white text-[6px] font-mono font-black flex items-center justify-center shadow-xs scale-90 border border-white dark:border-zinc-900">
                      {clickIndex + 1}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Word lists to search */}
      <div className="shrink-0 text-center">
        <p className={`text-[8px] font-black uppercase tracking-wide truncate ${
          foundWords.length === targetWords.length ? 'text-emerald-500 animate-pulse' : currentIsLight ? 'text-slate-700' : 'text-slate-300'
        }`}>
          {message}
        </p>
        
        <div className="flex flex-wrap gap-1 justify-center mt-1.5 max-h-12 overflow-y-auto">
          {targetWords.map(word => {
            const isFound = foundWords.includes(word);
            return (
              <span
                key={word}
                className={`text-[7.5px] px-1.5 py-0.5 rounded-md font-extrabold transition-all border ${
                  isFound
                    ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 line-through scale-95 opacity-60'
                    : currentIsLight ? 'bg-slate-100 border-slate-205 text-slate-650' : 'bg-zinc-900 border-white/5 text-slate-300'
                }`}
              >
                {word}
              </span>
            );
          })}
        </div>
      </div>

      <button
        onClick={checkSelection}
        disabled={selectedLetters.length === 0}
        className={`w-full py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-center cursor-pointer transition-all ${
          selectedLetters.length > 0
            ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-md hover:scale-[1.01] active:scale-95'
            : 'bg-slate-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-650 cursor-not-allowed'
        }`}
      >
        ✔ Wort Prüfen ({selectedLetters.length} Briefe)
      </button>
    </div>
  );
};

// ==========================================
// NEW WIDGET 12: RHYTHMUS-KLOPFER (Rhythm Sequencer Practice)
// ==========================================
export const RhythmWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [bpm, setBpm] = useState<number>(90);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Custom Time Signatures & Bar Length setup
  const [timeSignature, setTimeSignature] = useState<'4_4' | '3_4'>('4_4');
  const [numBars, setNumBars] = useState<1 | 2>(1);

  // Score stats
  const [streak, setStreak] = useState<number>(0);
  const [rating, setRating] = useState<string>('Bereit für den Beat? 🥁');

  // Steps sequence containing 'clap' (Klatschen), 'slap' (Patschen), 'stomp' (Stampfen) or 'rest' (Pause)
  const [sequence, setSequence] = useState<('clap' | 'slap' | 'stomp' | 'rest')[]>([
    'stomp', 'slap', 'clap', 'rest',
    'stomp', 'slap', 'clap', 'rest'
  ]);

  // Compute actual active steps based on timeSignature and numBars
  const activeStepsCount = useMemo(() => {
    const stepsInBar = timeSignature === '4_4' ? 4 : 3;
    return stepsInBar * numBars;
  }, [timeSignature, numBars]);

  // Adjust active step index limits
  useEffect(() => {
    if (currentStep >= activeStepsCount) {
      setCurrentStep(0);
    }
  }, [activeStepsCount, currentStep]);

  // High-fidelity analog percussion synthesis using Web Audio API
  const triggerAnalogSound = useCallback((type: 'clap' | 'slap' | 'stomp' | 'lightTick' | 'successClick') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'stomp') {
        // High-fidelity Deep Bass Drum (Stampfen) - Sine pitch sweep 150Hz -> 40Hz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearToValueAtTimeAtNow ? (gain.gain as any).linearToValueAtTimeAtNow(0.4, now) : gain.gain.linearRampToValueAtTime(0.4, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'slap') {
        // High-fidelity Woodblock / Rimshot (Patschen) - Mid range high Q bandpass
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.Q.setValueAtTime(5, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'clap') {
        // High-fidelity Handclap (Klatschen) - Modulated filtered noise
        const bufferSize = ctx.sampleRate * 0.15; 
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.Q.setValueAtTime(2.5, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        // Emulate rapid double-triggering of a handclap
        gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.025);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);
      } else if (type === 'successClick') {
        // Bright cheerful synthesizer note (Pentatonic chime)
        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now); // E5

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else {
        // Soft analog tick for Rest / Metronome pulse
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.012, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {}
  }, [isMuted]);

  // Handle step clock interval
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = (60 / bpm) * 1000;
    const intervalId = setInterval(() => {
      setCurrentStep(prev => {
        const next = (prev + 1) % activeStepsCount;
        const action = sequence[next];
        if (action === 'clap' || action === 'slap' || action === 'stomp') {
          triggerAnalogSound(action);
        } else {
          triggerAnalogSound('lightTick');
        }
        return next;
      });
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [isPlaying, bpm, sequence, activeStepsCount, triggerAnalogSound]);

  // Click / Space game timing trigger
  const handleKlopfen = () => {
    if (!isPlaying) {
      setRating('Starte den Beat, um mitzuspielen! ▶');
      return;
    }

    const currentExpectation = sequence[currentStep];
    if (currentExpectation !== 'rest') {
      // Good hit!
      setStreak(s => s + 1);
      triggerAnalogSound('successClick');

      // Random funny rating message
      const ratings = ["SUPER!", "PERFEKT!", "IM TAKT! ⭐", "GROOVY! 🎉"];
      const randomMsg = ratings[Math.floor(Math.random() * ratings.length)];
      setRating(`${randomMsg} (+${streak + 1})`);
    } else {
      // Oops! Rest hit
      setStreak(0);
      triggerAnalogSound('lightTick');
      setRating("Hoppla! Das war eine Pause 💤");
    }
  };

  const toggleSequence = (idx: number) => {
    setSequence(prev => {
      const copy = [...prev];
      const moves: ('clap' | 'slap' | 'stomp' | 'rest')[] = ['stomp', 'slap', 'clap', 'rest'];
      const curIdx = moves.indexOf(copy[idx] || 'rest');
      const nextIdx = (curIdx + 1) % moves.length;
      copy[idx] = moves[nextIdx];
      
      // Play brief feedback sound of the selected item
      const added = copy[idx];
      if (added !== 'rest') {
        triggerAnalogSound(added);
      } else {
        triggerAnalogSound('lightTick');
      }
      return copy;
    });
  };

  // Quick preset templates for classrooms
  const applyPreset = (type: 'basic' | 'march' | 'waltz' | 'funky') => {
    if (type === 'basic') {
      setSequence(['stomp', 'slap', 'clap', 'rest', 'stomp', 'slap', 'clap', 'rest']);
      setTimeSignature('4_4');
    } else if (type === 'march') {
      setSequence(['stomp', 'stomp', 'clap', 'rest', 'stomp', 'stomp', 'clap', 'rest']);
      setTimeSignature('4_4');
    } else if (type === 'waltz') {
      setSequence(['stomp', 'slap', 'slap', 'stomp', 'slap', 'slap', 'stomp', 'slap']);
      setTimeSignature('3_4');
    } else if (type === 'funky') {
      setSequence(['stomp', 'clap', 'slap', 'clap', 'stomp', 'clap', 'slap', 'clap']);
      setTimeSignature('4_4');
    }
    setStreak(0);
    setCurrentStep(0);
    setRating('Muster geladen! Probiere es aus.');
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      
      {/* Configuration Header Row */}
      <div className="flex flex-col gap-1.5 shrink-0">
        <div className="flex justify-between items-center">
          <span className={`text-[8.5px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-450'}`}>
            ⚡ Rhythmus-Klopfer
          </span>
          
          {/* Mute and Setup options */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold border transition-all cursor-pointer ${
                isMuted 
                  ? currentIsLight ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  : 'bg-indigo-500 text-white border-transparent'
              }`}
            >
              {isMuted ? "🔇 Stumm" : "🔊 Ton"}
            </button>
          </div>
        </div>

        {/* Bar & Signature Selectors */}
        <div className="flex justify-between items-center gap-1.5 text-[7px] font-black bg-slate-55/50 dark:bg-zinc-900/40 p-1 rounded-lg">
          <div className="flex gap-1.5">
            {/* 3/4 or 4/4 Selector */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-md p-0.5 border border-slate-200 dark:border-white/5">
              {(['4_4', '3_4'] as const).map((sig) => (
                <button
                  key={sig}
                  onClick={() => { setTimeSignature(sig); setStreak(0); }}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer text-[7px] ${
                    timeSignature === sig ? 'bg-indigo-500 text-white font-extrabold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {sig === '4_4' ? '4/4' : '3/4'}
                </button>
              ))}
            </div>

            {/* 1 or 2 Bars Selector */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-md p-0.5 border border-slate-200 dark:border-white/5">
              {([1, 2] as const).map((bar) => (
                <button
                  key={bar}
                  onClick={() => { setNumBars(bar); setStreak(0); }}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer text-[7px] ${
                    numBars === bar ? 'bg-indigo-500 text-white font-extrabold' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {bar} Takt{bar > 1 ? 'e' : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Quick presets list */}
          <div className="flex gap-1">
            {(['basic', 'waltz', 'funky'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className="bg-indigo-500/10 text-indigo-500 px-1 rounded border border-indigo-500/20 text-[6.5px] uppercase cursor-pointer py-0.5"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Tempo controls */}
        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-zinc-900/30 p-1 rounded-lg">
          <span className="text-[7.5px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase">Tempo:</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black text-indigo-500 font-mono">{bpm} BPM</span>
            <input 
              type="range" 
              min="55" 
              max="160" 
              value={bpm} 
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-20 accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Dynamic Grid Steps Display */}
      <div className="flex flex-wrap gap-1.5 justify-center my-1.5 shrink-0 z-10">
        {Array.from({ length: activeStepsCount }).map((_, idx) => {
          const step = sequence[idx] || 'rest';
          const isActive = idx === currentStep && isPlaying;
          
          let icon = '💤';
          let label = 'Ruhe';
          let borderStyle = 'border-slate-200 dark:border-zinc-800';
          let pulseClass = '';
          
          if (step === 'clap') { 
            icon = '👏'; 
            label = 'Klatschen';
            borderStyle = 'border-rose-350 dark:border-rose-900'; 
          } else if (step === 'slap') { 
            icon = '🖐️'; 
            label = 'Patschen';
            borderStyle = 'border-blue-350 dark:border-blue-900'; 
          } else if (step === 'stomp') { 
            icon = '🥾'; 
            label = 'Stampfen';
            borderStyle = 'border-amber-400 dark:border-amber-900'; 
          }

          if (isActive) {
            pulseClass = "scale-110 ring-4 ring-amber-400 bg-amber-450 z-20 text-slate-900 shadow-lg";
          }

          return (
            <button
              key={idx}
              onClick={() => toggleSequence(idx)}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-between border p-1 transition-all cursor-pointer relative overflow-hidden ${borderStyle} ${
                isActive
                  ? 'bg-amber-400 text-slate-900 font-bold'
                  : step !== 'rest'
                    ? currentIsLight ? 'bg-indigo-50/80 text-indigo-700 hover:bg-indigo-100/90' : 'bg-indigo-950/45 text-indigo-400 hover:bg-indigo-900/40'
                    : currentIsLight ? 'bg-slate-50 hover:bg-slate-100 text-slate-400' : 'bg-zinc-850/60 border-white/5 text-slate-600 hover:bg-zinc-800'
              } ${pulseClass}`}
            >
              <span className={`text-sm sm:text-base ${isActive ? 'animate-bounce' : ''}`}>{icon}</span>
              <span className="text-[5.5px] font-black uppercase opacity-65 leading-none">
                S{idx+1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Feedback Dashboard Screen & Streak indicators */}
      <div className="bg-slate-50 dark:bg-zinc-950 p-2 rounded-xl flex flex-col items-center justify-center border border-slate-150 dark:border-white/5 min-h-[48px] text-center">
        <div className="flex items-center gap-1.5">
          <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500 animate-pulse">
            {rating}
          </p>
          {streak > 0 && (
            <span className="text-[7.5px] font-extrabold bg-rose-500 text-white px-1.5 py-0.2 rounded-full shadow animate-bounce">
              {streak}x 🔥
            </span>
          )}
        </div>
        <p className={`text-[6.5px] font-mono mt-0.5 opacity-60 ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Klicke auf die Symbole oben, um deinen eigenen Rhythmus zu komponieren! 🎶
        </p>
      </div>

      {/* Primary Action controls */}
      <div className="flex gap-1.5 shrink-0 select-none">
        <button
          onClick={() => {
            setIsPlaying(!isPlaying);
            setStreak(0);
            setRating(isPlaying ? 'Rhythmus pausiert! ⏸' : 'Lass uns klatschen! ▶');
          }}
          className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all ${
            isPlaying ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-md shadow-rose-500/10' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-500/10'
          }`}
        >
          {isPlaying ? '■ Rhythmus Stop' : '▶ Rhythmus Start'}
        </button>
        <button
          onClick={handleKlopfen}
          className="flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider bg-indigo-500 hover:bg-indigo-600 text-white shadow-md shadow-indigo-500/15 active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-1"
        >
          <span>🥁 JETZT KLOPFEN!</span>
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 13: GEOMETRIE-MUSTER (Shape collage generator)
// ==========================================
export const GeometryWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  type ShapeType = 'circle' | 'square' | 'rectangle' | 'triangle';
  type Mode = 'pattern' | 'compare';
  type PlacedShape = { id: number; type: ShapeType; color: string; rotation: number; size: number; x: number; y: number };

  const shapes: Array<{ type: ShapeType; label: string; solid: string }> = [
    { type: 'circle', label: 'Kreis', solid: 'Kugel' },
    { type: 'square', label: 'Quadrat', solid: 'Würfel' },
    { type: 'rectangle', label: 'Rechteck', solid: 'Quader' },
    { type: 'triangle', label: 'Dreieck', solid: 'Dreiecksprisma' },
  ];

  const colors = [
    { val: '#ef4444', label: 'Rot' },
    { val: '#eab308', label: 'Gelb' },
    { val: '#3b82f6', label: 'Blau' },
    { val: '#10b981', label: 'Grün' },
    { val: '#a855f7', label: 'Lila' },
  ];

  const lifecycle = readWidgetLifecycleState(widget, "geometry", {
    mode: "pattern" as Mode,
    activeShape: "circle" as ShapeType,
    colorVal: "#3b82f6",
    placedShapes: [] as PlacedShape[],
    rotation: 0,
    size: 42,
    compareRotation: 28,
    nextId: 0,
  });
  const [mode, setMode] = useState<Mode>(() => lifecycle.mode);
  const [activeShape, setActiveShape] = useState<ShapeType>(() => lifecycle.activeShape);
  const [colorVal, setColorVal] = useState<string>(() => lifecycle.colorVal);
  const [placedShapes, setPlacedShapes] = useState<PlacedShape[]>(() => lifecycle.placedShapes);
  const [rotation, setRotation] = useState<number>(() => lifecycle.rotation);
  const [size, setSize] = useState<number>(() => lifecycle.size);
  const [compareRotation, setCompareRotation] = useState<number>(() => lifecycle.compareRotation);
  const idCounter = useRef(Math.max(lifecycle.nextId, ...lifecycle.placedShapes.map(shape => shape.id), 0));

  usePersistedWidgetLifecycleState(widget, onUpdate, "geometry", {
    mode,
    activeShape,
    colorVal,
    placedShapes,
    rotation,
    size,
    compareRotation,
    nextId: idCounter.current,
  });

  const addShapeAt = (x: number, y: number) => {
    idCounter.current += 1;
    setPlacedShapes((current) => [
      ...current,
      { id: idCounter.current, type: activeShape, color: colorVal, rotation, size, x, y },
    ]);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'pattern') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(95, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(92, Math.max(8, ((event.clientY - rect.top) / rect.height) * 100));
    addShapeAt(x, y);
  };

  const placeDefault = () => addShapeAt(50, 50);

  const removeLast = () => setPlacedShapes((current) => current.slice(0, -1));
  const clearCanvas = () => setPlacedShapes([]);

  const renderFlatShape = (shape: ShapeType, color: string, extraClass = 'w-full h-full') => {
    if (shape === 'circle') {
      return <div className={`${extraClass} rounded-full border-[3px]`} style={{ borderColor: color, backgroundColor: `${color}26` }} />;
    }
    if (shape === 'square') {
      return <div className={`${extraClass} rounded-md border-[3px]`} style={{ borderColor: color, backgroundColor: `${color}26` }} />;
    }
    if (shape === 'rectangle') {
      return <div className={`${extraClass} rounded-md border-[3px] scale-x-125`} style={{ borderColor: color, backgroundColor: `${color}26` }} />;
    }
    return (
      <svg viewBox="0 0 100 100" className={extraClass} fill={`${color}26`} stroke={color} strokeWidth="7">
        <polygon points="50,12 92,86 8,86" />
      </svg>
    );
  };

  const renderSolid = (shape: ShapeType, color: string) => {
    if (shape === 'circle') {
      return (
        <div
          className="w-28 h-28 rounded-full border-2 shadow-xl"
          style={{
            borderColor: color,
            background: `radial-gradient(circle at 32% 28%, #ffffff, ${color}88 45%, ${color} 100%)`,
          }}
          aria-label="Kugel"
        />
      );
    }

    if (shape === 'square' || shape === 'rectangle') {
      const width = shape === 'rectangle' ? 112 : 88;
      const depth = shape === 'rectangle' ? 34 : 44;
      return (
        <div className="relative h-28 flex items-center justify-center" aria-label={shape === 'square' ? 'Würfel' : 'Quader'}>
          <div
            className="relative border-2 shadow-lg"
            style={{
              width,
              height: shape === 'rectangle' ? 64 : 88,
              borderColor: color,
              backgroundColor: `${color}35`,
              transform: `rotateX(-12deg) rotateY(${compareRotation}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            <div
              className="absolute inset-0 border-2"
              style={{
                borderColor: color,
                backgroundColor: `${color}20`,
                transform: `translate(${depth}px, -${depth * 0.55}px)`,
              }}
            />
            <div
              className="absolute border-2"
              style={{
                width: depth,
                height: '100%',
                right: -depth,
                top: -(depth * 0.55),
                borderColor: color,
                backgroundColor: `${color}28`,
                transform: 'skewY(-35deg)',
                transformOrigin: 'left bottom',
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-32 h-28" aria-label="Dreiecksprisma">
        <svg viewBox="0 0 160 120" className="w-full h-full">
          <polygon points="30,95 70,25 110,95" fill={`${color}25`} stroke={color} strokeWidth="4" />
          <polygon points="70,70 110,10 150,70" fill={`${color}18`} stroke={color} strokeWidth="4" />
          <line x1="30" y1="95" x2="70" y2="70" stroke={color} strokeWidth="4" />
          <line x1="70" y1="25" x2="110" y2="10" stroke={color} strokeWidth="4" />
          <line x1="110" y1="95" x2="150" y2="70" stroke={color} strokeWidth="4" />
        </svg>
      </div>
    );
  };

  const activeMeta = shapes.find((shape) => shape.type === activeShape)!;
  const properties: Record<ShapeType, { flat: string[]; solid: string[]; question: string }> = {
    circle: {
      flat: ['keine Ecken', 'keine geraden Seiten'],
      solid: ['keine Ecken', 'keine Kanten', 'eine gekrümmte Oberfläche'],
      question: 'Was ist bei Kreis und Kugel rund?',
    },
    square: {
      flat: ['4 Ecken', '4 gleich lange Seiten'],
      solid: ['8 Ecken', '12 Kanten', '6 quadratische Flächen'],
      question: 'Welche Flächen des Würfels sind Quadrate?',
    },
    rectangle: {
      flat: ['4 Ecken', 'gegenüberliegende Seiten gleich lang'],
      solid: ['8 Ecken', '12 Kanten', '6 rechteckige Flächen'],
      question: 'Wo findest du Rechtecke am Quader?',
    },
    triangle: {
      flat: ['3 Ecken', '3 Seiten'],
      solid: ['6 Ecken', '9 Kanten', '5 Flächen'],
      question: 'Welche zwei Flächen des Dreiecksprismas sind Dreiecke?',
    },
  };
  const activeProperties = properties[activeShape];

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1" role="tablist" aria-label="Geometrie-Modus">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'pattern'}
            onClick={() => setMode('pattern')}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold ${
              mode === 'pattern' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Muster bauen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'compare'}
            onClick={() => setMode('compare')}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold ${
              mode === 'compare' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            2D ↔ 3D
          </button>
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Form auswählen">
          {shapes.map((shape) => (
            <button
              key={shape.type}
              type="button"
              onClick={() => setActiveShape(shape.type)}
              className={`min-h-11 px-2.5 rounded-lg border text-xs font-bold ${
                activeShape === shape.type
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {shape.label}
            </button>
          ))}
        </div>
      </div>

      {mode === 'pattern' ? (
        <>
          <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Muster-Idee: Wiederhole Formen oder Farben bewusst, zum Beispiel Kreis – Quadrat – Kreis – Quadrat.
          </div>

          <div
            onClick={handleCanvasClick}
            className={`flex-1 min-h-52 sm:min-h-64 rounded-2xl border-2 relative overflow-hidden cursor-crosshair ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}
            aria-label="Musterfläche – zum Platzieren einer Form tippen"
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px',
                color: currentIsLight ? '#e2e8f0' : '#334155',
              }}
            />
            {placedShapes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="max-w-xs text-center">
                  <div className="text-base font-black text-slate-600 dark:text-slate-300">Baue ein Muster</div>
                  <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Wähle Form und Farbe und tippe auf die Fläche.</div>
                </div>
              </div>
            )}
            {placedShapes.map((shape) => (
              <div
                key={shape.id}
                className="absolute flex items-center justify-center pointer-events-none transition-transform"
                style={{
                  width: shape.size,
                  height: shape.size,
                  left: `${shape.x}%`,
                  top: `${shape.y}%`,
                  transform: `translate(-50%, -50%) rotate(${shape.rotation}deg)`,
                }}
              >
                {renderFlatShape(shape.type, shape.color)}
              </div>
            ))}
          </div>

          <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Größe: {size}px
                <input
                  type="range"
                  min="28"
                  max="76"
                  value={size}
                  onChange={(event) => setSize(Number(event.target.value))}
                  className="mt-2 w-full h-11 accent-accent cursor-pointer"
                  aria-label="Formgröße"
                />
              </label>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Drehung: {rotation}°
                <input
                  type="range"
                  min="0"
                  max="330"
                  step="30"
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  className="mt-2 w-full h-11 accent-accent cursor-pointer"
                  aria-label="Drehwinkel"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <button type="button" onClick={placeDefault} className="min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold text-sm">
                Form mittig setzen
              </button>
              <button
                type="button"
                onClick={removeLast}
                disabled={placedShapes.length === 0}
                className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent disabled:opacity-40"
              >
                Letzte zurück
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                disabled={placedShapes.length === 0}
                className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-rose-400 hover:text-rose-600 disabled:opacity-40"
              >
                Alles löschen
              </button>
            </div>
          </div>

          <div className="shrink-0 flex flex-wrap gap-2 items-center" role="group" aria-label="Farbe auswählen">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Farbe</span>
            {colors.map((color) => (
              <button
                key={color.val}
                type="button"
                onClick={() => setColorVal(color.val)}
                aria-label={color.label}
                aria-pressed={colorVal === color.val}
                className={`min-h-11 min-w-11 rounded-full border-2 transition-transform active:scale-95 ${
                  colorVal === color.val ? 'ring-2 ring-accent ring-offset-2 dark:ring-offset-slate-900' : ''
                }`}
                style={{ backgroundColor: color.val, borderColor: currentIsLight ? '#cbd5e1' : '#475569' }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Vergleiche Fläche und Körper: Was bleibt gleich, was kommt in 3D dazu?
          </div>

          <div className="flex-1 min-h-52 sm:min-h-64 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className={`rounded-2xl border p-4 flex flex-col items-center justify-center gap-3 ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">2D-Fläche</div>
              <div className="w-28 h-28 flex items-center justify-center">
                {renderFlatShape(activeShape, colorVal, 'w-24 h-24')}
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{activeMeta.label}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center">flach · Länge und Breite</div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 text-center">
                {activeProperties.flat.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>

            <div className={`rounded-2xl border p-4 flex flex-col items-center justify-center gap-3 ${
              currentIsLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-700'
            }`}>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">3D-Körper</div>
              <div className="w-full h-32 flex items-center justify-center" style={{ perspective: '700px' }}>
                {renderSolid(activeShape, colorVal)}
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-slate-100">{activeMeta.solid}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center">räumlich · Länge, Breite und Höhe</div>
              <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 text-center">
                {activeProperties.solid.map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200">
            Beobachte: {activeProperties.question}
          </div>

          <label className="shrink-0 text-xs font-bold text-slate-600 dark:text-slate-300">
            Körper drehen: {compareRotation}°
            <input
              type="range"
              min="-45"
              max="45"
              value={compareRotation}
              onChange={(event) => setCompareRotation(Number(event.target.value))}
              className="mt-2 w-full h-11 accent-accent cursor-pointer"
              aria-label="3D-Körper drehen"
            />
          </label>
        </>
      )}
    </div>
  );
};


// ==========================================
// NEW WIDGET 14: BRUCHTEIL-VISUALISIERER (Fraction Pie Visualizer)
// ==========================================
export const FractionsWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [numerator, setNumerator] = useState<number>(3);
  const [denominator, setDenominator] = useState<number>(8);
  const [viewMode, setViewMode] = useState<'circle' | 'bar' | 'grid' | 'set'>('circle');

  const handleDenominatorChange = (val: number) => {
    const clamped = Math.max(2, Math.min(100, val));
    setDenominator(clamped);
    if (numerator > clamped) {
      setNumerator(clamped);
    }
  };

  const handleNumeratorChange = (val: number) => {
    const clamped = Math.max(0, Math.min(denominator, val));
    setNumerator(clamped);
  };

  const incrementNumerator = () => {
    if (numerator < denominator) setNumerator(prev => prev + 1);
  };
  const decrementNumerator = () => {
    if (numerator > 0) setNumerator(prev => prev - 1);
  };
  const incrementDenominator = () => {
    if (denominator < 100) setDenominator(prev => prev + 1);
  };
  const decrementDenominator = () => {
    if (denominator > 2) {
      setDenominator(prev => {
        const next = prev - 1;
        if (numerator > next) setNumerator(next);
        return next;
      });
    }
  };

  // Generate pie slices coordinates
  const getPieSlicePath = (index: number) => {
    const total = denominator;
    const angle = 360 / total;
    const startAngle = index * angle;
    const endAngle = (index + 1) * angle;

    const rad = Math.PI / 180;
    const x1 = 50 + 40 * Math.sin(startAngle * rad);
    const y1 = 50 - 40 * Math.cos(startAngle * rad);
    const x2 = 50 + 40 * Math.sin(endAngle * rad);
    const y2 = 50 - 40 * Math.cos(endAngle * rad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    return `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const getGridLayout = (total: number) => {
    if (total === 100) return { cols: 10, rows: 10 };
    if (total === 50) return { cols: 10, rows: 5 };
    if (total === 48) return { cols: 8, rows: 6 };
    if (total === 40) return { cols: 8, rows: 5 };
    if (total === 36) return { cols: 6, rows: 6 };
    if (total === 30) return { cols: 6, rows: 5 };
    if (total === 25) return { cols: 5, rows: 5 };
    if (total === 24) return { cols: 6, rows: 4 };
    if (total === 20) return { cols: 5, rows: 4 };
    if (total === 16) return { cols: 4, rows: 4 };
    if (total === 15) return { cols: 5, rows: 3 };
    if (total === 12) return { cols: 4, rows: 3 };
    if (total === 10) return { cols: 5, rows: 2 };
    if (total === 8) return { cols: 4, rows: 2 };
    if (total === 6) return { cols: 3, rows: 2 };
    if (total === 4) return { cols: 2, rows: 2 };

    for (let c = 10; c >= 2; c--) {
      if (total % c === 0) {
        return { cols: c, rows: total / c };
      }
    }

    if (total <= 5) return { cols: total, rows: 1 };
    if (total <= 12) return { cols: Math.ceil(total / 2), rows: 2 };
    if (total <= 20) return { cols: Math.ceil(total / 4), rows: 4 };
    if (total <= 35) return { cols: 5, rows: Math.ceil(total / 5) };
    if (total <= 50) return { cols: 10, rows: Math.ceil(total / 10) };
    return { cols: 10, rows: Math.ceil(total / 10) };
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
          Bruchrechnen-Trainer
        </span>
        
        {/* Compact Representation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200/50 dark:border-zinc-700/50">
          {(['circle', 'bar', 'grid', 'set'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={mode === 'circle' ? 'Kreis' : mode === 'bar' ? 'Streifen' : mode === 'grid' ? 'Gitter' : 'Menge'}
              className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all cursor-pointer ${
                viewMode === mode
                  ? 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
              }`}
            >
              {mode === 'circle' ? '🍰' : mode === 'bar' ? '📊' : mode === 'grid' ? '🏁' : '🔵'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 my-1 shrink-0 justify-center flex-grow min-h-0">
        {/* Dynamic Visualization Area */}
        <div className="flex-1 flex justify-center items-center min-h-[90px] max-h-[140px] w-full">
          {viewMode === 'circle' && (
            <div className="w-20 h-20 relative flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle cx="50" cy="50" r="41" fill="none" stroke={currentIsLight ? '#e2e8f0' : '#27272a'} strokeWidth="1.5" />
                {Array.from({ length: denominator }).map((_, i) => {
                  const isFilled = i < numerator;
                  const sliceStrokeWidth = denominator > 50 ? 0.2 : denominator > 24 ? 0.5 : denominator > 12 ? 0.8 : 1.2;
                  return (
                    <path
                      key={i}
                      d={getPieSlicePath(i)}
                      fill={isFilled ? '#6366f1' : 'transparent'}
                      stroke={currentIsLight ? '#f1f5f9' : '#18181b'}
                      strokeWidth={sliceStrokeWidth}
                      className="transition-all duration-150"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className={`text-[11px] font-black drop-shadow-sm px-1.5 py-0.5 rounded bg-white/70 dark:bg-zinc-900/70 border border-slate-200/50 dark:border-zinc-800/50 ${currentIsLight ? 'text-slate-700' : 'text-white'}`}>
                  {numerator}/{denominator}
                </span>
              </div>
            </div>
          )}

          {viewMode === 'bar' && (
            <div className="w-full max-w-[200px] flex flex-col gap-2 items-center">
              <div className="w-full h-10 border-2 border-slate-300 dark:border-zinc-700 rounded-xl overflow-hidden flex bg-slate-100/30 dark:bg-zinc-900/30 shadow-inner">
                {Array.from({ length: denominator }).map((_, i) => {
                  const isFilled = i < numerator;
                  const borderClass = denominator > 60 ? 'border-r-[0.1px]' : denominator > 30 ? 'border-r-[0.5px]' : 'border-r';
                  return (
                    <div
                      key={i}
                      className={`flex-1 h-full last:border-r-0 border-slate-300 dark:border-zinc-700 transition-all duration-150 ${borderClass}`}
                      style={{
                        backgroundColor: isFilled ? '#6366f1' : 'transparent',
                      }}
                    />
                  );
                })}
              </div>
              <span className={`text-[9px] font-extrabold ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Bruchstreifen
              </span>
            </div>
          )}

          {viewMode === 'grid' && (
            <div className="w-full max-w-[200px] flex flex-col items-center gap-1.5">
              {(() => {
                const layout = getGridLayout(denominator);
                return (
                  <div 
                    className="grid gap-0.5 border border-slate-300 dark:border-zinc-700 p-1 rounded-xl bg-slate-100/30 dark:bg-zinc-900/30 shadow-inner w-full"
                    style={{
                      gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
                      aspectRatio: `${layout.cols} / ${layout.rows}`,
                    }}
                  >
                    {Array.from({ length: denominator }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[3px] border border-slate-250 dark:border-zinc-750 transition-all duration-150 ${
                          i < numerator ? 'bg-indigo-500' : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                );
              })()}
              <span className={`text-[9px] font-extrabold ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Rastergitter
              </span>
            </div>
          )}

          {viewMode === 'set' && (
            <div className="w-full flex flex-col items-center gap-1">
              <div className="flex flex-wrap gap-1 justify-center items-center py-1 w-full max-h-[110px] overflow-y-auto custom-scrollbar">
                {Array.from({ length: denominator }).map((_, i) => {
                  // Compute dynamic size
                  const sizeClass = denominator > 50 
                    ? 'w-2 h-2 rounded-full' 
                    : denominator > 24 
                      ? 'w-3 h-3 rounded-full text-[5px]' 
                      : denominator > 12 
                        ? 'w-4.5 h-4.5 rounded-full text-[7px]' 
                        : 'w-6 h-6 rounded-full text-[9px]';
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        if (numerator === i + 1) {
                          setNumerator(i);
                        } else {
                          setNumerator(i + 1);
                        }
                      }}
                      className={`flex items-center justify-center font-black transition-all duration-150 cursor-pointer select-none active:scale-90 border ${sizeClass} ${
                        i < numerator
                          ? 'bg-indigo-500 border-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-850 border-slate-250 dark:border-zinc-750 text-slate-400 dark:text-zinc-500 hover:border-slate-300 dark:hover:border-zinc-650'
                      }`}
                      title={`Teil ${i + 1}`}
                    >
                      {denominator <= 24 && (i + 1)}
                    </div>
                  );
                })}
              </div>
              <span className={`text-[9px] font-extrabold ${currentIsLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Menge (Anklicken zum Färben)
              </span>
            </div>
          )}
        </div>

        {/* Fraction Stack Box Display */}
        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-50 dark:bg-zinc-850/50 border border-slate-100 dark:border-white/5 w-16 h-18 shadow-xs shrink-0 select-none">
          <span className="text-[14px] font-black text-indigo-500 border-b-2 border-slate-400 px-1">{numerator}</span>
          <span className={`text-[14px] font-black ${currentIsLight ? 'text-slate-700' : 'text-slate-300'}`}>{denominator}</span>
        </div>
      </div>

      {/* German statement description explanation */}
      <div className="text-center py-1 px-2 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-xl shrink-0">
        <p className={`text-[8.5px] font-black uppercase tracking-wide ${currentIsLight ? 'text-slate-700' : 'text-indigo-400'}`}>
          {numerator} von {denominator} Teilen ({Math.round((numerator / denominator) * 100)}%)
        </p>
      </div>

      {/* Sliders layout inside widget */}
      <div className="flex flex-col gap-2 shrink-0 select-none">
        {/* Numerator (Zähler) Slider with Buttons */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[7px] font-black uppercase text-slate-400">
            <span>Zähler (oben):</span>
            <span className="font-mono text-[9px] font-black text-indigo-500">{numerator}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={decrementNumerator}
              className="w-5 h-5 rounded-md bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center border border-slate-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-transform"
            >
              -
            </button>
            <input 
              type="range" 
              min="0" 
              max={denominator} 
              value={numerator} 
              onChange={(e) => handleNumeratorChange(Number(e.target.value))}
              className="flex-grow accent-indigo-500 h-1.5 cursor-pointer"
            />
            <button
              onClick={incrementNumerator}
              className="w-5 h-5 rounded-md bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center border border-slate-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </div>

        {/* Denominator (Nenner) Slider with Buttons */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[7px] font-black uppercase text-slate-400">
            <span>Nenner (unten, max. 100):</span>
            <span className="font-mono text-[9px] font-black text-indigo-500">{denominator}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={decrementDenominator}
              className="w-5 h-5 rounded-md bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center border border-slate-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-transform"
            >
              -
            </button>
            <input 
              type="range" 
              min="2" 
              max="100" 
              value={denominator} 
              onChange={(e) => handleDenominatorChange(Number(e.target.value))}
              className="flex-grow accent-indigo-500 h-1.5 cursor-pointer"
            />
            <button
              onClick={incrementDenominator}
              className="w-5 h-5 rounded-md bg-slate-100 dark:bg-zinc-850 hover:bg-slate-200 dark:hover:bg-zinc-800 text-xs font-black flex items-center justify-center border border-slate-200 dark:border-zinc-700 cursor-pointer active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Preset Badges */}
      <div className="flex flex-wrap gap-1 justify-center shrink-0 pt-1 border-t border-slate-100 dark:border-zinc-800/85">
        {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 30, 50, 100].map(p => (
          <button
            key={p}
            onClick={() => handleDenominatorChange(p)}
            className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold border cursor-pointer transition-all duration-150 ${
              denominator === p
                ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                : 'bg-slate-50 dark:bg-zinc-850 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-zinc-700/80 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 15: DEUTSCHE WORT-UHR (German spoken word clock)
// ==========================================
export const WordclockWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: any) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({ widget, currentIsLight, onUpdate, showSettings = false, onCloseSettings }) => {
  const saved = widget?.settings || {};
  const [lernModus, setLernModus] = useState<boolean>(saved.wordclockPracticeMode === true);
  const [lernHour, setLernHour] = useState<number>(
    typeof saved.wordclockPracticeHour === 'number' ? saved.wordclockPracticeHour : 10,
  );
  const [lernMin, setLernMin] = useState<number>(
    typeof saved.wordclockPracticeMinute === 'number' ? saved.wordclockPracticeMinute : 15,
  );
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const persistPractice = (patch: Record<string, unknown>) => {
    onUpdate?.({ settings: { ...(widget?.settings || {}), ...patch } });
  };

  const changeMode = (next: boolean) => {
    setLernModus(next);
    persistPractice({ wordclockPracticeMode: next });
  };

  const changeHour = (next: number) => {
    setLernHour(next);
    persistPractice({ wordclockPracticeHour: next });
  };

  const changeMinute = (next: number) => {
    setLernMin(next);
    persistPractice({ wordclockPracticeMinute: next });
  };

  useEffect(() => {
    if (lernModus) return;
    const update = () => setCurrentTime(new Date());
    const interval = setInterval(update, 10000);
    window.addEventListener('focus', update);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', update);
    };
  }, [lernModus]);

  const activeHour = lernModus ? lernHour : currentTime.getHours();
  const activeMin = lernModus ? lernMin : currentTime.getMinutes();

  const getGermanSpokenTime = (h: number, m: number): string => {
    const formattedHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    const nextHour = (formattedHour % 12) + 1;

    if (m === 0) return `Punkt ${formattedHour} Uhr`;
    if (m === 5) return `Fünf nach ${formattedHour}`;
    if (m === 10) return `Zehn nach ${formattedHour}`;
    if (m === 15) return `Viertel nach ${formattedHour}`;
    if (m === 20) return `Zehn vor halb ${nextHour}`;
    if (m === 25) return `Fünf vor halb ${nextHour}`;
    if (m === 30) return `Halb ${nextHour}`;
    if (m === 35) return `Fünf nach halb ${nextHour}`;
    if (m === 40) return `Zehn nach halb ${nextHour}`;
    if (m === 45) return `Viertel vor ${nextHour}`;
    if (m === 50) return `Zehn vor ${nextHour}`;
    if (m === 55) return `Fünf vor ${nextHour}`;

    const roundedMin = Math.round(m / 5) * 5;
    if (roundedMin === 60) return `Punkt ${nextHour} Uhr`;
    return getGermanSpokenTime(h, roundedMin) + " (ungefähr)";
  };

  const spokenText = getGermanSpokenTime(activeHour, activeMin);

  return (
    <div className="relative flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex flex-col gap-3 p-3 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Wort-Uhr einstellen</p>
              <p className="mt-0.5 text-[10px] opacity-65">Echtzeit oder Übungsuhr auswählen.</p>
            </div>
            <button type="button" onClick={onCloseSettings}
              className="min-h-11 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5">
              Fertig
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => changeMode(false)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-black ${
                !lernModus ? 'border-accent bg-accent text-accent-text' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
              }`}>
              ⏱️ Echtzeit
            </button>
            <button type="button" onClick={() => changeMode(true)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-black ${
                lernModus ? 'border-accent bg-accent text-accent-text' : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
              }`}>
              💡 Üben
            </button>
          </div>

          {lernModus && (
            <div className="space-y-3">
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-white/10">
                <span className="w-16 text-xs font-black">Stunde</span>
                <input type="range" min="0" max="23" value={lernHour}
                  onChange={(e) => changeHour(Number(e.target.value))}
                  className="min-w-0 flex-1 text-accent accent-current" />
                <span className="w-7 text-right font-mono text-sm font-black text-accent">{lernHour}</span>
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-white/10">
                <span className="w-16 text-xs font-black">Minute</span>
                <input type="range" min="0" max="59" step="5" value={lernMin}
                  onChange={(e) => changeMinute(Number(e.target.value))}
                  className="min-w-0 flex-1 text-accent accent-current" />
                <span className="w-7 text-right font-mono text-sm font-black text-accent">{lernMin}</span>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end items-center px-1 shrink-0 min-h-6">
        <span className={`text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-1 ${
          lernModus ? 'bg-accent-soft text-accent' : currentIsLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-400'
        }`}>
          {lernModus ? '💡 Übungsmodus' : '⏱️ Echtzeit'}
        </span>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 min-h-0 my-1 py-1">
        <span className="text-[clamp(1.6rem,8cqw,4rem)] font-black text-accent tracking-tight tabular-nums">
          {String(activeHour).padStart(2, '0')}:{String(activeMin).padStart(2, '0')}
        </span>
        <div className="w-full text-center px-2 py-2 mt-2 rounded-xl bg-slate-50 dark:bg-zinc-850/60 border border-slate-100 dark:border-white/5 min-h-11 flex items-center justify-center">
          <p className={`text-[clamp(.7rem,3cqw,1.15rem)] font-black tracking-tight leading-snug ${currentIsLight ? 'text-slate-800' : 'text-slate-200'}`}>
            💬 „{spokenText}“
          </p>
        </div>
      </div>

      <p className="text-[9px] text-center opacity-55 shrink-0 select-none pb-1">
        {lernModus ? 'Übungszeit über das Zahnrad verändern.' : 'Das Zahnrad schaltet in den Übungsmodus.'}
      </p>
    </div>
  );
};

// ==========================================
// NEW WIDGET 16: ZAHLENSORTIERER (Number Sorter Game)
// ==========================================
export const SortingWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeSortingWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const [numbers, setNumbers] = useState<number[]>([]);
  const [targetOrder, setTargetOrder] = useState<number[]>([]);
  const [sorted, setSorted] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{
    kind: 'instruction' | 'success' | 'warning' | 'complete';
    text: string;
  }>({
    kind: 'instruction',
    text: settings.direction === 'asc'
      ? 'Beginne mit der kleinsten Zahl.'
      : 'Beginne mit der größten Zahl.',
  });
  const [wrongValue, setWrongValue] = useState<number | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const persistSettings = useCallback((patch: Partial<SortingWidgetSettings>) => {
    if (!onUpdate) return;
    onUpdate({
      settings: {
        ...(widget?.settings || {}),
        ...settings,
        ...patch,
      },
    });
  }, [onUpdate, settings, widget?.settings]);

  const initializeGame = useCallback(() => {
    const generated = generateSortingNumbers(settings);
    setNumbers(generated);
    setTargetOrder(getSortingTarget(generated, settings.direction));
    setSorted([]);
    setWrongValue(null);
    setFeedback({
      kind: 'instruction',
      text: settings.direction === 'asc'
        ? 'Beginne mit der kleinsten Zahl.'
        : 'Beginne mit der größten Zahl.',
    });
  }, [settings.rangeKey, settings.direction, settings.count]);

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => () => {
    if (wrongTimerRef.current !== null) clearTimeout(wrongTimerRef.current);
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close().catch(() => {});
      } catch {}
      audioContextRef.current = null;
    }
  }, []);

  const playStepTone = useCallback((step: number) => {
    if (!settings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContextRef.current || new AudioCtx();
      audioContextRef.current = ctx;
      if (ctx.state === 'suspended') void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(360 + step * 85, now);
      gain.gain.setValueAtTime(0.085, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    } catch {}
  }, [settings.soundEnabled]);

  const handleNumClick = (value: number) => {
    const nextExpected = targetOrder[sorted.length];
    if (nextExpected === undefined) return;

    if (value !== nextExpected) {
      setWrongValue(value);
      setFeedback({
        kind: 'warning',
        text: describeSortingMistake(value, nextExpected, settings.direction),
      });
      if (wrongTimerRef.current !== null) clearTimeout(wrongTimerRef.current);
      wrongTimerRef.current = setTimeout(() => {
        setWrongValue(null);
        wrongTimerRef.current = null;
      }, 700);
      return;
    }

    const updated = [...sorted, value];
    setSorted(updated);
    setWrongValue(null);
    playStepTone(updated.length);

    if (updated.length === targetOrder.length) {
      setFeedback({
        kind: 'complete',
        text: 'Geschafft! Die Zahlen sind richtig geordnet.',
      });
      return;
    }

    setFeedback({
      kind: 'success',
      text: settings.direction === 'asc'
        ? 'Richtig. Welche Zahl ist jetzt die kleinste?'
        : 'Richtig. Welche Zahl ist jetzt die größte?',
    });
  };

  const activeRange = SORTING_RANGE_OPTIONS.find(option => option.key === settings.rangeKey)
    || SORTING_RANGE_OPTIONS[1];
  const isComplete = targetOrder.length > 0 && sorted.length === targetOrder.length;

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Zahlensortierer"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col gap-3 overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-accent">Zahlensortierer-Einstellungen</p>
              <p className="mt-1 text-xs opacity-65">Aufgabe vorbereiten. Während des Sortierens bleibt die Tafel ruhig.</p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Zahlenraum</p>
            <div className="grid grid-cols-2 gap-1.5">
              {SORTING_RANGE_OPTIONS.map(option => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={settings.rangeKey === option.key}
                  onClick={() => persistSettings({ rangeKey: option.key as SortingRangeKey })}
                  className={settingButtonClass(settings.rangeKey === option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <div className="grid shrink-0 grid-cols-2 gap-3">
            <section>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Reihenfolge</p>
              <div className="grid gap-1.5">
                {([
                  ['asc', 'Klein → groß'],
                  ['desc', 'Groß → klein'],
                ] as Array<[SortingDirection, string]>).map(([direction, label]) => (
                  <button
                    key={direction}
                    type="button"
                    aria-pressed={settings.direction === direction}
                    onClick={() => persistSettings({ direction })}
                    className={settingButtonClass(settings.direction === direction)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Anzahl</p>
              <div className="grid gap-1.5">
                {([3, 5, 7] as SortingCount[]).map(count => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={settings.count === count}
                    onClick={() => persistSettings({ count })}
                    className={settingButtonClass(settings.count === count)}
                  >
                    {count} Zahlen
                  </button>
                ))}
              </div>
            </section>
          </div>

          <button
            type="button"
            aria-pressed={settings.soundEnabled}
            onClick={() => persistSettings({ soundEnabled: !settings.soundEnabled })}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold ${
              settings.soundEnabled
                ? 'border-accent bg-accent-soft text-accent'
                : currentIsLight
                  ? 'border-slate-200 bg-slate-50 text-slate-700'
                  : 'border-white/10 bg-white/5 text-slate-200'
            }`}
          >
            {settings.soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>Bestätigungston {settings.soundEnabled ? 'an' : 'aus'}</span>
          </button>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black text-accent">
          {settings.direction === 'asc' ? '↑ Klein → groß' : '↓ Groß → klein'}
        </span>
        <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-65">
          <span>{activeRange.shortLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{sorted.length}/{settings.count}</span>
        </div>
      </div>

      <div
        aria-label="Bereits richtig sortierte Zahlen"
        className={`mt-3 grid min-h-14 shrink-0 items-center gap-1 rounded-2xl border px-2 py-1.5 ${
          currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}
        style={{ gridTemplateColumns: `repeat(${settings.count}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: settings.count }).map((_, index) => {
          const value = sorted[index];
          return (
            <span
              key={index}
              className={`flex h-10 min-w-0 items-center justify-center rounded-xl px-1 text-xs sm:text-sm font-black tabular-nums ${
                value !== undefined
                  ? 'bg-accent text-accent-text shadow-sm'
                  : currentIsLight
                    ? 'border border-dashed border-slate-300 bg-white text-slate-300'
                    : 'border border-dashed border-white/15 bg-black/10 text-white/20'
              }`}
            >
              {value !== undefined ? formatSortingNumber(value) : '·'}
            </span>
          );
        })}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center py-3">
        <div className="grid w-full grid-cols-3 gap-2">
          {numbers.map((number) => {
            const alreadySorted = sorted.includes(number);
            const isWrong = wrongValue === number;
            return (
              <button
                key={number}
                type="button"
                disabled={alreadySorted || isComplete}
                onClick={() => handleNumClick(number)}
                aria-label={`${formatSortingNumber(number)} wählen`}
                className={`min-h-14 rounded-2xl border px-2 text-lg font-black tabular-nums shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-default ${
                  alreadySorted
                    ? currentIsLight
                      ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-55'
                      : 'border-white/5 bg-white/5 text-white/20 opacity-55'
                    : isWrong
                      ? 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200'
                      : currentIsLight
                        ? 'border-slate-200 bg-white text-slate-900 hover:border-accent hover:bg-accent-soft active:scale-[0.98]'
                        : 'border-white/10 bg-white/5 text-white hover:border-accent hover:bg-white/10 active:scale-[0.98]'
                }`}
              >
                {formatSortingNumber(number)}
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`flex min-h-12 shrink-0 items-center justify-center rounded-xl border px-3 text-center text-xs font-bold leading-snug ${
          feedback.kind === 'complete'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
            : feedback.kind === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200'
              : feedback.kind === 'success'
                ? 'border-accent bg-accent-soft text-accent'
                : currentIsLight
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : 'border-white/10 bg-white/5 text-slate-300'
        }`}
      >
        {feedback.kind === 'complete' && <CheckCircle size={16} className="mr-1.5 shrink-0" />}
        {feedback.text}
      </div>

      <button
        type="button"
        onClick={initializeGame}
        className="mt-2 min-h-11 shrink-0 rounded-xl bg-accent px-4 text-xs font-black text-accent-text shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        Neue Aufgabe
      </button>
    </div>
  );
};

// ==========================================
// NEW WIDGET 17: MORGEN-MOTTO BOARD (Encouragement Affirms)
// ==========================================
export const DailyquotesWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeDailyQuotesWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const activeQuote = useMemo(() => getActiveDailyQuote(settings), [settings]);
  const [editTitle, setEditTitle] = useState(settings.customTitle);
  const [editText, setEditText] = useState(settings.customText);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>('');

  useEffect(() => {
    setEditTitle(settings.customTitle);
    setEditText(settings.customText);
  }, [settings.customTitle, settings.customText]);

  const persistSettings = useCallback((patch: Partial<DailyQuotesWidgetSettings>) => {
    if (!onUpdate) return;
    onUpdate({
      settings: {
        ...(widget?.settings || {}),
        ...settings,
        ...patch,
      },
    });
  }, [onUpdate, settings, widget?.settings]);

  const selectTheme = (theme: DailyQuoteTheme) => {
    const first = getDailyQuotesForTheme(theme)[0];
    persistSettings({
      theme,
      currentQuoteId: first?.id || settings.currentQuoteId,
      useCustom: false,
    });
    setAiStatus('');
  };

  const rotateQuote = () => {
    persistSettings({
      currentQuoteId: getNextDailyQuoteId(settings.currentQuoteId, settings.theme),
      useCustom: false,
    });
    setAiStatus('');
  };

  const applyCustomMotto = () => {
    const text = editText.trim();
    if (!text) {
      setAiStatus('Bitte zuerst einen Motto-Satz eingeben.');
      return;
    }
    const title = editTitle.trim() || '💬 Unser Motto';
    persistSettings({
      customTitle: title,
      customText: text,
      useCustom: true,
    });
    setAiStatus('Eigenes Motto wird auf der Tafel angezeigt.');
  };

  const useCollection = () => {
    persistSettings({ useCustom: false });
    setAiStatus('Motto-Sammlung ist aktiv.');
  };

  const fetchAiQuote = async () => {
    if (isAiLoading) return;
    setIsAiLoading(true);
    setAiStatus('KI-Vorschlag wird erstellt …');
    const themeLabel = DAILY_QUOTE_THEME_LABELS[settings.theme];
    try {
      const prompt = `Erstelle ein kurzes, ruhiges und kindgerechtes Morgen-Motto auf Deutsch für Volksschulkinder.
Thema: ${themeLabel}.
Es darf motivieren, aber nicht übertreiben oder Druck machen. Formuliere konkret, freundlich und alltagstauglich.
Keine Namen, keine persönlichen Daten, keine Leistungsversprechen.
Antworte exakt als: <Emoji + kurzer Titel mit höchstens 4 Wörtern>;<Motto-Satz mit höchstens 18 Wörtern>
Kein Markdown und kein weiterer Text.`;
      const response = await askAI('ki-wissen', prompt);
      const parsed = parseAiDailyQuote(response);
      if (!parsed) {
        setAiStatus('Der KI-Vorschlag konnte nicht gelesen werden. Die Motto-Sammlung bleibt verfügbar.');
        return;
      }
      setEditTitle(parsed.title);
      setEditText(parsed.text);
      persistSettings({
        customTitle: parsed.title,
        customText: parsed.text,
        useCustom: true,
      });
      setAiStatus('KI-Vorschlag wird auf der Tafel angezeigt.');
    } catch {
      setAiStatus('KI ist gerade nicht verfügbar. Die Motto-Sammlung funktioniert weiterhin offline.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Morgen-Motto"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-accent">Morgen-Motto-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Thema wählen oder ein eigenes Motto für die Klasse vorbereiten.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Thema</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(DAILY_QUOTE_THEME_LABELS) as Array<[DailyQuoteTheme, string]>).map(([theme, label]) => (
                <button
                  key={theme}
                  type="button"
                  aria-pressed={settings.theme === theme && !settings.useCustom}
                  onClick={() => selectTheme(theme)}
                  className={settingButtonClass(settings.theme === theme && !settings.useCustom)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={`mt-4 shrink-0 rounded-2xl border p-3 ${
            currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
          }`}>
            <div className="mb-2">
              <p className="text-xs font-black">Eigenes Motto</p>
              <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">
                Wird nur für dieses Widget gespeichert und kann jederzeit wieder durch die Sammlung ersetzt werden.
              </p>
            </div>
            <label className="block text-[10px] font-black uppercase tracking-wider opacity-55">
              Kurzer Titel
              <input
                type="text"
                value={editTitle}
                maxLength={60}
                onChange={event => setEditTitle(event.target.value)}
                placeholder="z. B. 🌱 Schritt für Schritt"
                className={`mt-1 min-h-11 w-full rounded-xl border px-3 text-sm font-semibold outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft ${
                  currentIsLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-zinc-900 text-white'
                }`}
              />
            </label>
            <label className="mt-3 block text-[10px] font-black uppercase tracking-wider opacity-55">
              Motto-Satz
              <textarea
                value={editText}
                maxLength={220}
                onChange={event => setEditText(event.target.value)}
                placeholder="Was soll heute gut sichtbar auf der Tafel stehen?"
                rows={3}
                className={`mt-1 min-h-20 w-full resize-none rounded-xl border px-3 py-2 text-sm font-medium leading-relaxed outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft ${
                  currentIsLight ? 'border-slate-300 bg-white text-slate-900' : 'border-white/10 bg-zinc-900 text-white'
                }`}
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={applyCustomMotto}
                className="min-h-11 rounded-xl bg-accent px-3 text-xs font-black text-accent-text hover:bg-accent-hover"
              >
                Eigenes Motto anzeigen
              </button>
              <button
                type="button"
                onClick={useCollection}
                className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
                  currentIsLight
                    ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    : 'border-white/10 bg-zinc-900 text-slate-200 hover:bg-white/10'
                }`}
              >
                Sammlung verwenden
              </button>
            </div>
          </section>

          <section className={`mt-4 shrink-0 rounded-2xl border p-3 ${
            currentIsLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-zinc-900'
          }`}>
            <div className="flex items-start gap-2">
              <Sparkles size={17} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <div>
                <p className="text-xs font-black">KI-Vorschlag</p>
                <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">
                  Es wird nur das gewählte Thema gesendet – keine Schüler- oder Klassendaten.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={isAiLoading}
              onClick={fetchAiQuote}
              className="mt-2 min-h-11 w-full rounded-xl border border-accent bg-accent-soft px-3 text-xs font-black text-accent transition-colors hover:bg-accent hover:text-accent-text disabled:opacity-50"
            >
              {isAiLoading ? 'Vorschlag wird erstellt …' : 'KI-Vorschlag erstellen'}
            </button>
            {aiStatus && (
              <p role="status" aria-live="polite" className="mt-2 text-[11px] font-semibold leading-relaxed opacity-70">
                {aiStatus}
              </p>
            )}
          </section>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black text-accent">
          {activeQuote.custom ? 'Eigenes Motto' : DAILY_QUOTE_THEME_LABELS[settings.theme]}
        </span>
        {activeQuote.custom && (
          <span className="text-[10px] font-bold opacity-55">gespeichert</span>
        )}
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center py-3">
        <article className={`flex w-full flex-col items-center justify-center rounded-3xl border px-4 py-5 text-center shadow-sm ${
          currentIsLight
            ? 'border-slate-200 bg-slate-50/80'
            : 'border-white/10 bg-white/5'
        }`}>
          <h3 className="text-lg font-black leading-tight text-accent sm:text-xl">
            {activeQuote.title}
          </h3>
          <p className="mt-3 text-[clamp(0.95rem,3.6cqw,1.35rem)] font-semibold leading-relaxed tracking-tight">
            „{activeQuote.text}“
          </p>
        </article>
      </div>

      <button
        type="button"
        onClick={rotateQuote}
        className="min-h-11 shrink-0 rounded-xl bg-accent px-4 text-xs font-black text-accent-text shadow-sm transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus-ring"
      >
        Nächstes Motto
      </button>
    </div>
  );
};

// ==========================================
// NEW WIDGET 18: BILDWÖRTERBUCH (Flipping Language Cards)
// ==========================================
export const DictionaryWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeDictionaryWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const cards = useMemo(
    () => filterDictionaryCards(settings.category),
    [settings.category],
  );
  const lifecycle = readWidgetLifecycleState(widget, "dictionary", {
    activeIdx: 0,
    round: null as DictionaryRound | null,
    selectedChoiceId: null as string | null,
    answerState: "idle" as "idle" | "wrong" | "correct",
    feedback: "",
  });
  const [activeIdx, setActiveIdx] = useState<number>(() => lifecycle.activeIdx);
  const [round, setRound] = useState<DictionaryRound | null>(() => lifecycle.round || createDictionaryRound(cards));
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(() => lifecycle.selectedChoiceId);
  const [answerState, setAnswerState] = useState<'idle' | 'wrong' | 'correct'>(() => lifecycle.answerState);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "dictionary"));
  const previousCardsRef = useRef(cards.map(card => card.id).join("|"));
  const onUpdateRef = useRef(onUpdate);

  usePersistedWidgetLifecycleState(widget, onUpdate, "dictionary", {
    activeIdx,
    round,
    selectedChoiceId,
    answerState,
    feedback,
  });
  onUpdateRef.current = onUpdate;

  const persistSettings = useCallback((patch: Partial<DictionaryWidgetSettings>) => {
    if (!onUpdateRef.current) return;
    // Only send the changed keys. Unterrichtsmodus merges them atomically with
    // the current widget settings, so rapid setting changes cannot overwrite
    // one another with an older render snapshot.
    onUpdateRef.current({ settings: patch });
  }, []);

  const speak = useCallback((text: string, lang: 'de' | 'en') => {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'de' ? 'de-DE' : 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech support is optional; the vocabulary remains fully usable without it.
    }
  }, []);

  useEffect(() => () => {
    try {
      window.speechSynthesis?.cancel();
    } catch {}
  }, []);

  useEffect(() => {
    const cardsChanged = previousCardsRef.current !== cards.map(card => card.id).join("|");
    previousCardsRef.current = cards.map(card => card.id).join("|");
    if (didRestoreRef.current && !cardsChanged) return;

    didRestoreRef.current = true;
    setActiveIdx(0);
    const nextRound = createDictionaryRound(cards);
    setRound(nextRound);
    setSelectedChoiceId(null);
    setAnswerState('idle');
    setFeedback('');
  }, [cards]);

  const activeCard = cards[activeIdx] || cards[0];

  const moveCard = (direction: 1 | -1) => {
    if (!cards.length) return;
    const nextIdx = nextDictionaryIndex(activeIdx, cards.length, direction);
    setActiveIdx(nextIdx);
    if (settings.speakOnChange) {
      speak(cards[nextIdx].de, 'de');
    }
  };

  const changeMode = (mode: DictionaryMode) => {
    persistSettings({ mode });
    setSelectedChoiceId(null);
    setAnswerState('idle');
    setFeedback('');
    if (mode === 'match') {
      setRound(createDictionaryRound(cards));
    }
  };

  const nextRound = () => {
    const next = createDictionaryRound(cards);
    setRound(next);
    setSelectedChoiceId(null);
    setAnswerState('idle');
    setFeedback('');
    if (settings.speakOnChange && next) {
      speak(next.target.de, 'de');
    }
  };

  const chooseCard = (choiceId: string) => {
    if (!round || answerState === 'correct') return;
    const choice = round.choices.find(item => item.id === choiceId);
    if (!choice) return;
    setSelectedChoiceId(choiceId);

    if (choice.id === round.target.id) {
      setAnswerState('correct');
      setFeedback(`Richtig – das ist ${round.target.de}.`);
      speak(round.target.de, 'de');
    } else {
      setAnswerState('wrong');
      setFeedback(`${choice.de} passt noch nicht. Versuch es noch einmal.`);
      speak(choice.de, 'de');
    }
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
      role="region"
      aria-label="Bildwörterbuch"
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Bildwörterbuch-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Wortfeld und Sprachhilfen für dieses Widget festlegen.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Wortfeld</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.entries(DICTIONARY_CATEGORY_LABELS) as Array<[DictionaryCategory, string]>).map(([category, label]) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={settings.category === category}
                  onClick={() => persistSettings({ category })}
                  className={settingButtonClass(settings.category === category)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={`mt-4 shrink-0 rounded-2xl border p-3 ${
            currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
          }`}>
            <p className="text-xs font-black">Sprachhilfen</p>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                aria-pressed={settings.showEnglish}
                onClick={() => persistSettings({ showEnglish: !settings.showEnglish })}
                className={settingButtonClass(settings.showEnglish)}
              >
                Englisch {settings.showEnglish ? 'anzeigen' : 'ausblenden'}
              </button>
              <button
                type="button"
                aria-pressed={settings.speakOnChange}
                onClick={() => persistSettings({ speakOnChange: !settings.speakOnChange })}
                className={settingButtonClass(settings.speakOnChange)}
              >
                Beim Weiterblättern {settings.speakOnChange ? 'vorlesen' : 'nicht automatisch vorlesen'}
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-1.5" role="group" aria-label="Lernmodus">
        <button
          type="button"
          aria-pressed={settings.mode === 'learn'}
          onClick={() => changeMode('learn')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'learn'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Lernen
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === 'match'}
          onClick={() => changeMode('match')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'match'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Zuordnen
        </button>
      </div>

      {settings.mode === 'learn' && activeCard ? (
        <>
          <div className="flex min-h-0 flex-1 items-center justify-center py-3">
            <article className={`flex w-full flex-col items-center justify-center rounded-3xl border px-4 py-4 text-center shadow-sm ${
              currentIsLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
            }`}>
              <span className="text-[clamp(3.25rem,18cqw,6rem)] leading-none" aria-hidden="true">
                {activeCard.emoji}
              </span>
              <p className="mt-3 text-[clamp(1rem,5cqw,1.45rem)] font-black leading-tight text-accent">
                {activeCard.de}
              </p>
              {settings.showEnglish && (
                <p className="mt-1 text-sm font-semibold opacity-65">
                  {activeCard.en}
                </p>
              )}
              <div className="mt-3 flex w-full max-w-xs gap-2">
                <button
                  type="button"
                  onClick={() => speak(activeCard.de, 'de')}
                  className={`min-h-11 flex-1 rounded-xl border px-3 text-xs font-black transition-colors ${
                    currentIsLight
                      ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      : 'border-white/10 bg-zinc-900 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <Volume2 size={15} aria-hidden="true" />
                    Deutsch
                  </span>
                </button>
                {settings.showEnglish && (
                  <button
                    type="button"
                    onClick={() => speak(activeCard.en, 'en')}
                    className={`min-h-11 flex-1 rounded-xl border px-3 text-xs font-black transition-colors ${
                      currentIsLight
                        ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        : 'border-white/10 bg-zinc-900 text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="inline-flex items-center justify-center gap-1.5">
                      <Volume2 size={15} aria-hidden="true" />
                      English
                    </span>
                  </button>
                )}
              </div>
            </article>
          </div>

          <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button
              type="button"
              onClick={() => moveCard(-1)}
              className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
                currentIsLight
                  ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              }`}
            >
              Zurück
            </button>
            <span className="min-w-12 text-center text-[11px] font-bold tabular-nums opacity-55">
              {activeIdx + 1}/{cards.length}
            </span>
            <button
              type="button"
              onClick={() => moveCard(1)}
              className="min-h-11 rounded-xl bg-accent px-3 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Weiter
            </button>
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          {round ? (
            <>
              <div className={`shrink-0 rounded-2xl border px-3 py-3 text-center ${
                currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Finde das passende Bild</p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <p className="text-base font-black text-accent">{round.target.de}</p>
                  <button
                    type="button"
                    onClick={() => speak(round.target.de, 'de')}
                    aria-label={`${round.target.de} vorlesen`}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-accent bg-accent-soft text-accent"
                  >
                    <Volume2 size={17} aria-hidden="true" />
                  </button>
                </div>
                {settings.showEnglish && (
                  <p className="text-xs font-semibold opacity-55">{round.target.en}</p>
                )}
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-2 content-center gap-2 py-3">
                {round.choices.map(choice => {
                  const isSelected = selectedChoiceId === choice.id;
                  const isCorrectChoice = choice.id === round.target.id;
                  const showCorrect = answerState === 'correct' && isCorrectChoice;
                  const showWrong = answerState === 'wrong' && isSelected;

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => chooseCard(choice.id)}
                      aria-label={`Bild auswählen: ${choice.de}`}
                      className={`min-h-20 rounded-2xl border-2 text-4xl shadow-sm transition-colors ${
                        showCorrect
                          ? 'border-emerald-500 bg-emerald-500/15'
                          : showWrong
                            ? 'border-rose-500 bg-rose-500/10'
                            : currentIsLight
                              ? 'border-slate-200 bg-white hover:border-accent hover:bg-accent-soft'
                              : 'border-white/10 bg-white/5 hover:border-accent hover:bg-white/10'
                      }`}
                    >
                      <span aria-hidden="true">{choice.emoji}</span>
                    </button>
                  );
                })}
              </div>

              <div className="shrink-0">
                <p
                  role="status"
                  aria-live="polite"
                  className={`min-h-8 px-1 text-center text-xs font-bold leading-relaxed ${
                    answerState === 'correct'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : answerState === 'wrong'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'opacity-55'
                  }`}
                >
                  {feedback || 'Tippe auf das passende Bild.'}
                </p>
                {answerState === 'correct' && (
                  <button
                    type="button"
                    onClick={nextRound}
                    className="mt-1 min-h-11 w-full rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
                  >
                    Nächste Aufgabe
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm font-semibold opacity-60">
              Für dieses Wortfeld sind keine Karten vorhanden.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// NEW WIDGET 19: KLASSENKLAVIER (Melodic Playable Keyboard)
// ==========================================
export const PianoWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const activeNoteTimerRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const settings = useMemo(
    () => normalizePianoWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const [activeNote, setActiveNote] = useState<string | null>(null);

  const persistSettings = useCallback((patch: Partial<PianoWidgetSettings>) => {
    if (!onUpdateRef.current) return;
    onUpdateRef.current({ settings: patch });
  }, []);

  const ensureAudio = useCallback(() => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;

    let ctx = audioContextRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const master = ctx.createGain();
      master.connect(ctx.destination);
      masterGainRef.current = master;
    }

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    if (masterGainRef.current) {
      masterGainRef.current.gain.setTargetAtTime(settings.volume, ctx.currentTime, 0.01);
    }
    return ctx;
  }, [settings.volume]);

  const playNote = useCallback((note: string, frequency: number) => {
    try {
      const ctx = ensureAudio();
      const master = masterGainRef.current;
      if (!ctx || !master) return;

      const now = ctx.currentTime;
      const partials = [
        { multiple: 1, level: 0.34, decay: 1.25, type: 'sine' as OscillatorType },
        { multiple: 2.002, level: 0.12, decay: 0.85, type: 'sine' as OscillatorType },
        { multiple: 3.006, level: 0.055, decay: 0.52, type: 'triangle' as OscillatorType },
      ];

      partials.forEach(partial => {
        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();
        oscillator.type = partial.type;
        oscillator.frequency.setValueAtTime(frequency * partial.multiple, now);
        envelope.gain.setValueAtTime(0.0001, now);
        envelope.gain.exponentialRampToValueAtTime(partial.level, now + 0.006);
        envelope.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay);
        oscillator.connect(envelope);
        envelope.connect(master);
        oscillator.start(now);
        oscillator.stop(now + partial.decay + 0.05);
      });

      // A very short filtered burst gives the synthetic tone a gentle key attack.
      const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.018)), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const attackGain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(Math.min(2200, frequency * 3.2), now);
      filter.Q.setValueAtTime(2.8, now);
      attackGain.gain.setValueAtTime(0.035, now);
      attackGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
      source.connect(filter);
      filter.connect(attackGain);
      attackGain.connect(master);
      source.start(now);

      setActiveNote(note);
      if (activeNoteTimerRef.current !== null) {
        window.clearTimeout(activeNoteTimerRef.current);
      }
      activeNoteTimerRef.current = window.setTimeout(() => {
        setActiveNote(null);
        activeNoteTimerRef.current = null;
      }, 260);
    } catch {
      // The visual keyboard remains usable even when browser audio is unavailable.
    }
  }, [ensureAudio]);

  useEffect(() => {
    return () => {
      if (activeNoteTimerRef.current !== null) {
        window.clearTimeout(activeNoteTimerRef.current);
      }
      const ctx = audioContextRef.current;
      audioContextRef.current = null;
      masterGainRef.current = null;
      if (ctx && ctx.state !== 'closed') {
        void ctx.close();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (showSettings || event.repeat || !containerRef.current) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      const isActive =
        containerRef.current.contains(document.activeElement) ||
        containerRef.current.matches(':hover');
      if (!isActive) return;

      const key = PIANO_KEYS.find(item => item.shortcut === event.key);
      if (!key) return;
      event.preventDefault();
      playNote(key.note, key.frequency);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playNote, showSettings]);

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const volumePresets = [
    { label: 'Leise', value: 0.35 },
    { label: 'Normal', value: 0.55 },
    { label: 'Kräftig', value: 0.75 },
  ];

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Klassen-Klavier"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 outline-none select-none focus-visible:ring-2 focus-visible:ring-accent ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Klassen-Klavier-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Beschriftung, Farben und Lautstärke für dieses Klavier festlegen.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Beschriftung</p>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                ['solfege', 'Do Re Mi'],
                ['letters', 'C D E'],
                ['both', 'Beides'],
              ] as Array<[PianoLabelMode, string]>).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={settings.labelMode === mode}
                  onClick={() => persistSettings({ labelMode: mode })}
                  className={settingButtonClass(settings.labelMode === mode)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Lautstärke</p>
            <div className="grid grid-cols-3 gap-1.5">
              {volumePresets.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  aria-pressed={Math.abs(settings.volume - preset.value) < 0.01}
                  onClick={() => persistSettings({ volume: preset.value })}
                  className={settingButtonClass(Math.abs(settings.volume - preset.value) < 0.01)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            aria-pressed={settings.showColors}
            onClick={() => persistSettings({ showColors: !settings.showColors })}
            className={`mt-4 ${settingButtonClass(settings.showColors)}`}
          >
            Farbpunkte {settings.showColors ? 'anzeigen' : 'ausblenden'}
          </button>

          <p className="mt-3 text-xs leading-relaxed opacity-60">
            Die Zahlentasten 1–8 spielen dieselben Töne, solange das Widget aktiv ist.
          </p>
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between gap-2">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[10px] font-black text-accent">
          Eine Oktave · C4–C5
        </span>
        <span className="text-[11px] font-bold tabular-nums opacity-55">
          Tasten 1–8
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center py-3">
        <div className="grid h-full min-h-24 w-full grid-cols-8 gap-1.5">
          {PIANO_KEYS.map(key => {
            const isActive = activeNote === key.note;
            const secondary = getPianoKeySecondaryLabel(key, settings.labelMode);
            return (
              <button
                key={key.note}
                type="button"
                onClick={() => playNote(key.note, key.frequency)}
                aria-label={`${key.solfege}, ${key.note}, Taste ${key.shortcut}`}
                className={`relative flex min-w-0 flex-col items-center justify-end rounded-b-2xl rounded-t-lg border px-1 pb-3 pt-2 shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                  isActive
                    ? 'translate-y-1 border-accent bg-accent-soft shadow-inner'
                    : currentIsLight
                      ? 'border-slate-200 bg-white hover:border-accent hover:bg-slate-50'
                      : 'border-white/10 bg-zinc-800 hover:border-accent hover:bg-zinc-700'
                }`}
              >
                <span className="absolute right-1.5 top-1.5 text-[10px] font-black opacity-35">
                  {key.shortcut}
                </span>
                {settings.showColors && (
                  <span className={`mb-2 h-3 w-3 rounded-full ${key.toneClass}`} aria-hidden="true" />
                )}
                <span className="text-[clamp(0.7rem,3.2cqw,1rem)] font-black leading-none">
                  {getPianoKeyPrimaryLabel(key, settings.labelMode)}
                </span>
                {secondary && (
                  <span className="mt-1 text-[10px] font-bold opacity-50">
                    {secondary}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p role="status" aria-live="polite" className="min-h-5 shrink-0 text-center text-xs font-bold opacity-65">
        {activeNote
          ? `${PIANO_KEYS.find(key => key.note === activeNote)?.solfege || ''} · ${activeNote}`
          : 'Tippe eine Taste an oder nutze die Zahlentasten 1–8.'}
      </p>
    </div>
  );
};

// ==========================================
// NEW WIDGET 20: KÖRPER-ENTDECKER (School Biology Station)
// ==========================================
export const BodypartsWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeBodypartsWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const [selectedPartId, setSelectedPartId] = useState<string>(BODY_PARTS[0].id);
  const [round, setRound] = useState<BodypartsQuizRound | null>(() => createBodypartsQuizRound());
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [feedback, setFeedback] = useState('');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const selectedPart = getBodyPartById(selectedPartId);

  const persistSettings = useCallback((patch: Partial<BodypartsWidgetSettings>) => {
    if (!onUpdateRef.current) return;
    onUpdateRef.current({ settings: patch });
  }, []);

  const changeMode = (mode: BodypartsMode) => {
    persistSettings({ mode });
    setSelectedChoiceId(null);
    setAnswerState('idle');
    setFeedback('');
    if (mode === 'quiz') {
      setRound(createBodypartsQuizRound());
    }
  };

  const selectPart = (id: string) => {
    setSelectedPartId(id);
  };

  const nextRound = () => {
    setRound(createBodypartsQuizRound());
    setSelectedChoiceId(null);
    setAnswerState('idle');
    setFeedback('');
  };

  const chooseAnswer = (id: string) => {
    if (!round || answerState === 'correct') return;
    setSelectedChoiceId(id);
    if (id === round.target.id) {
      setAnswerState('correct');
      setSelectedPartId(round.target.id);
      setFeedback(`Richtig – das ist ${round.target.name}.`);
      return;
    }
    const picked = round.choices.find(choice => choice.id === id);
    setAnswerState('wrong');
    setFeedback(`${picked?.name || 'Diese Antwort'} passt noch nicht. Versuch es noch einmal.`);
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const BodyMap = ({ activeId, reveal = true }: { activeId?: string; reveal?: boolean }) => {
    const active = activeId ? getBodyPartById(activeId) : null;
    return (
      <div className={`relative mx-auto h-full min-h-40 w-full max-w-48 overflow-hidden rounded-3xl border ${
        currentIsLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
      }`}>
        <svg
          viewBox="0 0 100 200"
          className="absolute inset-0 h-full w-full text-slate-400 dark:text-zinc-600"
          aria-hidden="true"
        >
          <g fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="50" cy="22" rx="12" ry="14" />
            <path d="M45 34 L45 40 L55 40 L55 34 Z" />
            <path d="M34 40 C34 40 50 38 66 40 C66 55 64 80 60 98 Q50 102 40 98 C36 80 34 55 34 40 Z" />
            <path d="M34 40 C29 48 20 62 14 76 C12 80 15 84 19 81 C24 74 31 62 34 53 Z" />
            <path d="M66 40 C71 48 80 62 86 76 C88 80 85 84 81 81 C76 74 69 62 66 53 Z" />
            <path d="M40 98 C40 115 42 145 40 165 Q38 192 43 192 C47 192 47 165 48 130 L49.5 98 Z" />
            <path d="M60 98 C60 115 58 145 60 165 Q62 192 57 192 C53 192 53 165 52 130 L50.5 98 Z" />
          </g>
        </svg>
        {reveal && active && (
          <div
            className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-accent bg-accent-soft text-2xl shadow-md"
            style={{ left: `${active.x}%`, top: `${active.y / 2}%` }}
            aria-label={`${active.name} – Lage im Körper`}
          >
            <span aria-hidden="true">{active.emoji}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      role="region"
      aria-label="Körper-Entdecker"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Körper-Entdecker-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Zusätzliche Informationen für die Lernansicht ein- oder ausblenden.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 grid gap-2">
            <button
              type="button"
              aria-pressed={settings.showFacts}
              onClick={() => persistSettings({ showFacts: !settings.showFacts })}
              className={settingButtonClass(settings.showFacts)}
            >
              Sachinfo {settings.showFacts ? 'anzeigen' : 'ausblenden'}
            </button>
            <button
              type="button"
              aria-pressed={settings.showActivities}
              onClick={() => persistSettings({ showActivities: !settings.showActivities })}
              className={settingButtonClass(settings.showActivities)}
            >
              Mitmach-Idee {settings.showActivities ? 'anzeigen' : 'ausblenden'}
            </button>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Die Inhalte erklären grundlegende Körperfunktionen kindgerecht. Sie ersetzen keine medizinische Beratung.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2" role="group" aria-label="Lernmodus">
        <button
          type="button"
          aria-pressed={settings.mode === 'explore'}
          onClick={() => changeMode('explore')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'explore'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Entdecken
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === 'quiz'}
          onClick={() => changeMode('quiz')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'quiz'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Zuordnen
        </button>
      </div>

      {settings.mode === 'explore' ? (
        <>
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(105px,0.4fr)_minmax(0,1fr)] gap-3 py-3">
            <BodyMap activeId={selectedPart.id} />
            <article className={`flex min-h-0 flex-col justify-center rounded-3xl border p-4 ${
              currentIsLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-white/5'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-3xl" aria-hidden="true">{selectedPart.emoji}</span>
                <h3 className="text-lg font-black leading-tight text-accent">{selectedPart.name}</h3>
              </div>
              <p className="mt-3 text-sm font-semibold leading-relaxed">{selectedPart.role}</p>
              {settings.showFacts && (
                <div className={`mt-3 rounded-2xl px-3 py-2 text-xs font-semibold leading-relaxed ${
                  currentIsLight ? 'bg-slate-50 text-slate-600' : 'bg-black/20 text-slate-300'
                }`}>
                  <span className="font-black">Schon gewusst?</span> {selectedPart.fact}
                </div>
              )}
              {settings.showActivities && (
                <div className="mt-2 rounded-2xl border border-accent bg-accent-soft px-3 py-2 text-xs font-semibold leading-relaxed text-accent">
                  <span className="font-black">Mitmach-Idee:</span> {selectedPart.activity}
                </div>
              )}
            </article>
          </div>

          <div className="grid shrink-0 grid-cols-4 gap-1.5">
            {BODY_PARTS.map(part => (
              <button
                key={part.id}
                type="button"
                aria-pressed={selectedPart.id === part.id}
                onClick={() => selectPart(part.id)}
                className={`min-h-11 rounded-xl border px-2 py-1.5 text-[11px] font-black leading-tight transition-colors ${
                  selectedPart.id === part.id
                    ? 'border-accent bg-accent text-accent-text'
                    : currentIsLight
                      ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
                      : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
                }`}
              >
                <span className="mr-1" aria-hidden="true">{part.emoji}</span>
                {part.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col pt-3">
          {round ? (
            <>
              <div className={`shrink-0 rounded-2xl border px-4 py-3 text-center ${
                currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
              }`}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Welcher Körperteil ist gemeint?</p>
                <p className="mt-1 text-sm font-black leading-relaxed text-accent">{round.target.quizQuestion}</p>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[minmax(100px,0.36fr)_minmax(0,1fr)] gap-3 py-3">
                <BodyMap
                  activeId={round.target.id}
                  reveal={answerState === 'correct'}
                />
                <div className="grid content-center grid-cols-2 gap-2">
                  {round.choices.map(choice => {
                    const isSelected = selectedChoiceId === choice.id;
                    const isCorrect = choice.id === round.target.id;
                    const correctStyle = answerState === 'correct' && isCorrect;
                    const wrongStyle = answerState === 'wrong' && isSelected;

                    return (
                      <button
                        key={choice.id}
                        type="button"
                        onClick={() => chooseAnswer(choice.id)}
                        className={`min-h-16 rounded-2xl border-2 px-2 py-2 text-sm font-black transition-colors ${
                          correctStyle
                            ? 'border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : wrongStyle
                              ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                              : currentIsLight
                                ? 'border-slate-200 bg-white text-slate-800 hover:border-accent hover:bg-accent-soft'
                                : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10'
                        }`}
                      >
                        <span className="mb-1 block text-2xl" aria-hidden="true">{choice.emoji}</span>
                        {choice.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="shrink-0">
                <p
                  role="status"
                  aria-live="polite"
                  className={`min-h-8 text-center text-xs font-bold leading-relaxed ${
                    answerState === 'correct'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : answerState === 'wrong'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'opacity-55'
                  }`}
                >
                  {feedback || 'Wähle eine Antwort. Bei einer falschen Antwort darfst du weiterprobieren.'}
                </p>
                {answerState === 'correct' && (
                  <button
                    type="button"
                    onClick={nextRound}
                    className="mt-1 min-h-11 w-full rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
                  >
                    Nächste Aufgabe
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm font-semibold opacity-60">
              Keine Aufgabe verfügbar.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// NEW WIDGET 21: ZAHNPUTZ-STATION (Toothbrush Timer)
// ==========================================
export const ToothbrushWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [timeLeft, setTimeLeft] = useState(120);
  const [isActive, setIsActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const steps = [
    { name: "Kau-Flächen oben/unten (hin und her) 🪥", duration: 30, color: "text-amber-500", icon: "🦷" },
    { name: "Außen-Seiten (schön kreisen) ↺", duration: 30, color: "text-emerald-500", icon: "🌀" },
    { name: "Innen-Seiten (von rot nach weiß fegen) 🧼", duration: 30, color: "text-sky-500", icon: "🧼" },
    { name: "Zunge & Ausspülen (blitzblank!) ✨", duration: 30, color: "text-indigo-500", icon: "✨" }
  ];

  // Synthesize realistic friction brushing and chime sounds using Web Audio API
  const playScrubSound = useCallback((type: 'scrub' | 'ding' | 'complete') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'scrub') {
        // Sh-sh noise: filtered bandpassed white noise with quick amplitude ramps
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.Q.setValueAtTime(4, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.025, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.15);
      } else if (type === 'ding') {
        // Pleasant double-chime ding when a quadrant is completed
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now); // G5
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, now + 0.1); // C6

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.1);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);
      } else if (type === 'complete') {
        // Congratulatory jingle tune (C-E-G-C chord sweep)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);
          
          gain.gain.setValueAtTime(0, now + idx * 0.12);
          gain.gain.linearRampToValueAtTime(0.05, now + idx * 0.12 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
          
          osc.connect(gain).connect(ctx.destination);
          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.4);
        });
      }
    } catch (e) {}
  }, [isMuted]);

  // Toothbrush scrub timer loop
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          
          // Phase transition sound! (every 30 seconds)
          if (next > 0 && next % 30 === 0) {
            playScrubSound('ding');
          } else if (next === 0) {
            playScrubSound('complete');
          } else {
            // Scrubbing noise feedback (every second, double-sh-sh)
            playScrubSound('scrub');
            setTimeout(() => playScrubSound('scrub'), 350);
          }
          return next;
        });
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, playScrubSound]);

  const currentStepIdx = Math.min(3, Math.floor((120 - timeLeft) / 30));
  const progressPercent = ((120 - timeLeft) / 120) * 100;
  
  // Seconds left in the current active phase
  const phaseSecondsLeft = timeLeft % 30 === 0 && timeLeft > 0 ? 30 : timeLeft % 30;

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <style>{`
        @keyframes brushSwing {
          0%, 100% { transform: translateX(-8px) rotate(-15deg); }
          50% { transform: translateX(8px) rotate(15deg); }
        }
        @keyframes shineStar {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Header and sound controller */}
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
          Zahnputz-Station 🪥
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`text-[7px] font-black px-1.5 py-0.2 rounded border transition-all ${
              isMuted 
                ? currentIsLight ? 'bg-slate-100 text-slate-400' : 'bg-zinc-800 text-zinc-500'
                : 'bg-indigo-500 text-white'
            }`}
          >
            {isMuted ? "🔇 Stumm" : "🔊 Sound"}
          </button>
          <span className="text-[10px] font-mono font-black tabular-nums bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded-md">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Immersive Graphics Area - Animated teeth and toothbrush */}
      <div className="flex-grow flex flex-col items-center justify-center text-center px-1 relative gap-1">
        
        {/* Animated Dentistry Theater */}
        <div className="relative w-28 h-14 bg-indigo-500/5 dark:bg-indigo-950/15 border border-slate-200/40 dark:border-white/5 rounded-2xl flex items-center justify-center overflow-hidden mb-1 shadow-inner">
          
          {/* Sparkles / Shine stars */}
          {timeLeft < 120 && (
            <>
              <span className="absolute text-yellow-400 text-xs top-2 left-3" style={{ animation: 'shineStar 1.8s infinite' }}>✦</span>
              <span className="absolute text-cyan-400 text-[10px] bottom-3 right-4" style={{ animation: 'shineStar 1.2s infinite 0.5s' }}>✦</span>
              <span className="absolute text-white text-[9px] top-3 right-3" style={{ animation: 'shineStar 2s infinite 1s' }}>✦</span>
            </>
          )}

          {/* Smiling Teeth Row Graphic */}
          <div className="flex flex-col items-center select-none gap-0.5 z-10">
            {/* Top teeth */}
            <div className="flex gap-0.5">
              {['🦷','🦷','🦷','🦷','🦷','🦷'].map((t, idx) => (
                <span key={`top-${idx}`} className={`text-base filter drop-shadow transition-all duration-500 ${
                  currentStepIdx === 0 ? 'animate-pulse scale-105 filter hue-rotate-15' : ''
                }`}>
                  {t}
                </span>
              ))}
            </div>
            {/* Bottom teeth */}
            <div className="flex gap-0.5">
              {['🦷','🦷','🦷','🦷','🦷','🦷'].map((t, idx) => (
                <span key={`bot-${idx}`} className={`text-base filter drop-shadow transition-all duration-500 ${
                  currentStepIdx === 1 ? 'animate-pulse scale-105' : ''
                }`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Animated toothbrush overlay sliding dynamically */}
          {isActive && (
            <span 
              className="absolute text-2xl z-20 pointer-events-none filter drop-shadow-md select-none"
              style={{
                top: currentStepIdx === 0 || currentStepIdx === 2 ? '15%' : '45%',
                animation: 'brushSwing 0.7s ease-in-out infinite'
              }}
            >
              🪥
            </span>
          )}
        </div>

        {/* Dynamic active instruction banner */}
        <div className="flex items-center gap-1">
          <span className="text-base animate-pulse">{steps[currentStepIdx]?.icon}</span>
          <p className={`text-[8.5px] font-black leading-tight ${steps[currentStepIdx]?.color}`}>
            {steps[currentStepIdx]?.name}
          </p>
        </div>

        {/* Phase progress descriptor */}
        <p className={`text-[7px] opacity-75 leading-tight ${currentIsLight ? 'text-slate-550' : 'text-slate-400'}`}>
          Bereichswechsel in <span className="font-black font-mono text-indigo-500 text-[8px]">{phaseSecondsLeft}s</span> (30s pro Seite)
        </p>
      </div>

      {/* Progress slider bar */}
      <div className="shrink-0 space-y-1.5">
        <div className="relative w-full bg-slate-200 dark:bg-zinc-850 h-3 rounded-full overflow-hidden shadow-inner flex items-center p-0.5">
          <div 
            style={{ width: `${progressPercent}%` }}
            className="bg-gradient-to-r from-sky-400 via-indigo-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-out relative"
          >
            {/* Foam bubbles effect along the slider */}
            {isActive && (
              <div className="absolute right-1 top-0 bottom-0 flex items-center gap-0.5 opacity-80 animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" />
                <span className="w-1 h-1 bg-white rounded-full" />
              </div>
            )}
          </div>
        </div>

        {/* Step dots visual indicator checklist */}
        <div className="grid grid-cols-4 gap-1 text-center shrink-0">
          {steps.map((st, idx) => {
            const isFinished = currentStepIdx > idx;
            const isCurrent = currentStepIdx === idx;
            return (
              <div 
                key={idx} 
                className={`py-0.5 px-1 rounded-md border text-[6.5px] font-bold uppercase transition-all flex items-center justify-center gap-0.5 ${
                  isFinished 
                    ? 'bg-emerald-500/15 border-emerald-500/20 text-emerald-500' 
                    : isCurrent 
                      ? 'bg-indigo-500/15 border-indigo-500 text-indigo-500 font-extrabold ring-1 ring-indigo-500/25' 
                      : currentIsLight ? 'bg-slate-50 border-slate-150 text-slate-400' : 'bg-zinc-900 border-white/5 text-zinc-500'
                }`}
              >
                <span>{isFinished ? "✅" : st.icon}</span>
                <span className="truncate max-w-[45px]">Ph. {idx + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Control Button Actions */}
        <div className="flex gap-1.5">
          <button
            onClick={() => {
              setIsActive(!isActive);
              playScrubSound('scrub');
            }}
            className={`flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center gap-1 ${
              isActive 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10' 
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10'
            }`}
          >
            {isActive ? "Pause ⏸" : "Starten 🪥"}
          </button>
          <button
            onClick={() => { setIsActive(false); setTimeLeft(120); }}
            className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              currentIsLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-850 border-white/5 text-slate-350 hover:bg-zinc-800'
            }`}
          >
            ↺ reset
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 22: KLASSEN-CHALLENGE (Daily Mission)
// ==========================================
export const ChallengeWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const challenges = [
    { title: "Das Echo der Höflichkeit 🌸", desc: "Jedes Kind sagt heute mindestens dreimal 'Danke!' oder 'Bitte!' zu einem Mitschüler." },
    { title: "Die Aufräum-Blitze ⚡", desc: "Wenn das Signal ertönt, räumt jeder im Handumdrehen 3 herumliegende Papierchen auf!" },
    { title: "Flüster-Meister 🤫", desc: "Für die nächsten 10 Minuten sprechen wir in flüsternden Elfenstimmen." },
    { title: "Der Lächeln-Virus 🙂", desc: "Schenke heute mindestens 3 Mitschülern ein freundliches, stilles Lächeln." },
    { title: "Stuhl-Schleicher 🐁", desc: "Beim Aufstehen schieben wir alle unsere Stühle absolut geräuschlos heran." },
    { title: "Teamwork-Raketen 🚀", desc: "Löse eine Arbeitsaufgabe komplett zu zweit und helft euch gegenseitig." }
  ];

  const [idx, setIdx] = useState(0);
  const [complete, setComplete] = useState(false);

  const triggerNext = () => {
    setIdx((prev) => (prev + 1) % challenges.length);
    setComplete(false);
  };

  const playSuccessChime = () => {
    setComplete(true);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-end items-center px-1 shrink-0 min-h-6">
        <span className="text-[9px] px-2 py-1 rounded-full font-black bg-accent-soft text-accent uppercase">
          Mission {idx + 1}
        </span>
      </div>

      <div className={`flex-grow flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all ${
        complete 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
          : currentIsLight ? 'bg-slate-50 border-slate-100 text-slate-800' : 'bg-zinc-850/30 border-white/5 text-slate-200'
      }`}>
        <span className="text-xl mb-1 animate-pulse">{complete ? "🏆" : "🎯"}</span>
        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-accent">
          {challenges[idx].title}
        </h4>
        <p className="text-[11px] sm:text-xs font-bold mt-1.5 text-slate-600 dark:text-slate-300 leading-relaxed px-1">
          {challenges[idx].desc}
        </p>
      </div>

      <div className="shrink-0 flex gap-1.5">
        <button
          onClick={playSuccessChime}
          disabled={complete}
          className={`flex-1 min-h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 ${
            complete 
              ? 'bg-emerald-500 text-white cursor-not-allowed shadow shadow-emerald-500/20' 
              : 'bg-accent hover:bg-accent-hover text-accent-text shadow-sm active:scale-95'
          }`}
        >
          {complete ? "Erledigt! 🎉" : "Klasse geschafft! 💪"}
        </button>
        <button
          onClick={triggerNext}
          className={`min-h-11 min-w-11 px-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
            currentIsLight ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-zinc-850 border-white/5 text-slate-350 hover:bg-zinc-800'
          }`}
        >
          🎲 Neu
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 23: GEOGRAPHIE-KOMPASS
// ==========================================
export const CompassWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeCompassWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const directions = useMemo(
    () => getCompassDirections(settings.directionSet),
    [settings.directionSet],
  );
  const [angle, setAngle] = useState<number>(0);
  const [practiceRound, setPracticeRound] = useState<CompassPracticeRound | null>(
    () => createCompassPracticeRound(getCompassDirections(settings.directionSet)),
  );
  const [answerState, setAnswerState] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [feedback, setFeedback] = useState('');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const currentDirection = getCompassDirection(angle);

  const persistSettings = useCallback((patch: Partial<CompassWidgetSettings>) => {
    if (!onUpdateRef.current) return;
    onUpdateRef.current({ settings: patch });
  }, []);

  useEffect(() => {
    const nextDirections = getCompassDirections(settings.directionSet);
    setAngle(previous =>
      nextDirections.some(direction => direction.angle === previous)
        ? previous
        : (nextDirections[0]?.angle ?? 0),
    );
    setPracticeRound(previous =>
      createCompassPracticeRound(nextDirections, Math.random, previous?.target.angle),
    );
    setAnswerState('idle');
    setFeedback('');
  }, [settings.directionSet]);

  useEffect(() => {
    setAnswerState('idle');
    setFeedback('');
    if (settings.mode === 'practice') {
      setPracticeRound(previous =>
        createCompassPracticeRound(directions, Math.random, previous?.target.angle),
      );
    }
  }, [settings.mode]);

  const changeMode = (mode: CompassMode) => {
    persistSettings({ mode });
  };

  const changeDirectionSet = (directionSet: CompassDirectionSet) => {
    persistSettings({ directionSet });
  };

  const selectDirection = (nextAngle: number) => {
    if (settings.mode === 'practice' && answerState === 'correct') return;
    setAngle(nextAngle);
    if (answerState === 'wrong') {
      setAnswerState('idle');
      setFeedback('');
    }
  };

  const rotate = (step: -1 | 1) => {
    selectDirection(stepCompassAngle(angle, step, settings.directionSet));
  };

  const checkPractice = () => {
    if (!practiceRound) return;
    if (angle === practiceRound.target.angle) {
      setAnswerState('correct');
      setFeedback(`Richtig – ${practiceRound.target.name} ist ${practiceRound.target.label}.`);
      return;
    }
    setAnswerState('wrong');
    setFeedback(`Noch nicht. Du hast ${currentDirection.name} gewählt. Versuch es noch einmal.`);
  };

  const nextPractice = () => {
    setPracticeRound(previous =>
      createCompassPracticeRound(directions, Math.random, previous?.target.angle),
    );
    setAnswerState('idle');
    setFeedback('');
  };

  const settingButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
    active
      ? 'border-accent bg-accent-soft text-accent'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const directionButtonClass = (selected: boolean) => `min-h-11 rounded-xl border px-2 py-2 text-center text-xs font-black transition-colors ${
    selected
      ? 'border-accent bg-accent text-accent-text'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Geographie-Kompass"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Geographie-Kompass-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Lege fest, welche Himmelsrichtungen und Hilfen auf der Tafel sichtbar sind.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 shrink-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider opacity-55">Himmelsrichtungen</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={settings.directionSet === 'cardinal'}
                onClick={() => changeDirectionSet('cardinal')}
                className={settingButtonClass(settings.directionSet === 'cardinal')}
              >
                4 Haupthimmelsrichtungen
              </button>
              <button
                type="button"
                aria-pressed={settings.directionSet === 'all'}
                onClick={() => changeDirectionSet('all')}
                className={settingButtonClass(settings.directionSet === 'all')}
              >
                8 Richtungen
              </button>
            </div>
          </section>

          <section className="mt-4 shrink-0">
            <button
              type="button"
              aria-pressed={settings.showDegrees}
              onClick={() => persistSettings({ showDegrees: !settings.showDegrees })}
              className={settingButtonClass(settings.showDegrees)}
            >
              Gradangaben {settings.showDegrees ? 'anzeigen' : 'ausblenden'}
            </button>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Hinweis: Sonnenaufgang und Sonnenuntergang liegen je nach Jahreszeit nicht exakt im Osten beziehungsweise Westen. Die Hinweise im Widget sind bewusst als ungefähre Orientierung formuliert.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2" role="group" aria-label="Lernmodus">
        <button
          type="button"
          aria-pressed={settings.mode === 'explore'}
          onClick={() => changeMode('explore')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'explore'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Erkunden
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === 'practice'}
          onClick={() => changeMode('practice')}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
            settings.mode === 'practice'
              ? 'border-accent bg-accent text-accent-text'
              : currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
          }`}
        >
          Üben
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(145px,0.85fr)_minmax(0,1fr)] items-center gap-3 py-3">
        <div className="flex min-h-0 items-center justify-center">
          <div className={`relative aspect-square w-full max-w-52 rounded-full border-4 shadow-sm ${
            currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-zinc-800'
          }`}>
            <div className="absolute inset-[10%] rounded-full border border-dashed border-slate-300/80 dark:border-white/15" />

            <span className={`absolute left-1/2 top-2 -translate-x-1/2 text-sm font-black ${
              angle === 0 ? 'text-red-500' : 'opacity-70'
            }`}>N</span>
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm font-black ${
              angle === 90 ? 'text-accent' : 'opacity-70'
            }`}>O</span>
            <span className={`absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-black ${
              angle === 180 ? 'text-accent' : 'opacity-70'
            }`}>S</span>
            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black ${
              angle === 270 ? 'text-accent' : 'opacity-70'
            }`}>W</span>

            {settings.directionSet === 'all' && (
              <>
                <span className={`absolute right-[16%] top-[15%] text-[10px] font-black ${
                  angle === 45 ? 'text-accent' : 'opacity-50'
                }`}>NO</span>
                <span className={`absolute bottom-[15%] right-[16%] text-[10px] font-black ${
                  angle === 135 ? 'text-accent' : 'opacity-50'
                }`}>SO</span>
                <span className={`absolute bottom-[15%] left-[16%] text-[10px] font-black ${
                  angle === 225 ? 'text-accent' : 'opacity-50'
                }`}>SW</span>
                <span className={`absolute left-[16%] top-[15%] text-[10px] font-black ${
                  angle === 315 ? 'text-accent' : 'opacity-50'
                }`}>NW</span>
              </>
            )}

            <svg
              viewBox="0 0 100 100"
              className="absolute inset-[15%] h-[70%] w-[70%] drop-shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: `rotate(${angle}deg)` }}
              aria-hidden="true"
            >
              <polygon points="50,5 41,51 50,45" fill="#ef4444" />
              <polygon points="50,5 59,51 50,45" fill="#f87171" />
              <polygon points="50,95 41,49 50,55" fill="currentColor" opacity="0.45" />
              <polygon points="50,95 59,49 50,55" fill="currentColor" opacity="0.28" />
              <circle cx="50" cy="50" r="7" fill="currentColor" opacity="0.9" />
              <circle cx="50" cy="50" r="2.6" fill="#ef4444" />
            </svg>

            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 translate-y-8 flex-col items-center">
              <span className="rounded-full bg-accent-soft px-2 py-1 text-xs font-black text-accent">
                {currentDirection.label}
                {settings.showDegrees ? ` · ${currentDirection.angle}°` : ''}
              </span>
            </div>
          </div>
        </div>

        <div className={`flex min-h-0 flex-col justify-center rounded-3xl border p-4 ${
          currentIsLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
        }`}>
          {settings.mode === 'explore' ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Ausgewählte Richtung</p>
              <h3 className="mt-1 text-lg font-black leading-tight text-accent">
                {currentDirection.name} ({currentDirection.label})
              </h3>
              {settings.showDegrees && (
                <p className="mt-1 text-xs font-bold tabular-nums opacity-55">{currentDirection.angle}°</p>
              )}
              <p className="mt-3 text-sm font-semibold leading-relaxed">
                {currentDirection.explanation}
              </p>
            </>
          ) : practiceRound ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Aufgabe</p>
              <h3 className="mt-1 text-base font-black leading-snug text-accent">
                Stelle {practiceRound.target.name} ein.
              </h3>
              <p className="mt-2 text-xs font-semibold leading-relaxed opacity-65">
                Wähle eine Richtung und prüfe anschließend deine Einstellung.
              </p>
              <p
                role="status"
                aria-live="polite"
                className={`mt-3 min-h-10 text-sm font-bold leading-relaxed ${
                  answerState === 'correct'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : answerState === 'wrong'
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'opacity-55'
                }`}
              >
                {feedback || 'Noch nicht geprüft.'}
              </p>
              {answerState === 'correct' && (
                <p className="mt-1 text-xs font-semibold leading-relaxed opacity-65">
                  {practiceRound.target.explanation}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold opacity-60">Keine Übungsaufgabe verfügbar.</p>
          )}
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-1.5" role="group" aria-label="Himmelsrichtung wählen">
        {directions.map(direction => (
          <button
            key={direction.angle}
            type="button"
            aria-pressed={angle === direction.angle}
            disabled={settings.mode === 'practice' && answerState === 'correct'}
            onClick={() => selectDirection(direction.angle)}
            className={`${directionButtonClass(angle === direction.angle)} disabled:cursor-default disabled:opacity-70`}
          >
            <span className="block text-sm">{direction.label}</span>
            {settings.mode === 'explore' && (
              <span className="mt-0.5 block text-[10px] font-bold opacity-65">{direction.name}</span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-[1fr_minmax(120px,1.4fr)_1fr] gap-2">
        <button
          type="button"
          onClick={() => rotate(-1)}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            currentIsLight
              ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
              : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
          }`}
          aria-label="Eine Richtung gegen den Uhrzeigersinn"
        >
          ↶ Zurück
        </button>

        {settings.mode === 'practice' ? (
          answerState === 'correct' ? (
            <button
              type="button"
              onClick={nextPractice}
              className="min-h-11 rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Nächste Aufgabe
            </button>
          ) : (
            <button
              type="button"
              onClick={checkPractice}
              className="min-h-11 rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Prüfen
            </button>
          )
        ) : (
          <div className="flex min-h-11 items-center justify-center rounded-xl bg-accent-soft px-3 text-center text-xs font-bold text-accent">
            Gegenrichtungen: N–S · O–W
          </div>
        )}

        <button
          type="button"
          onClick={() => rotate(1)}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black ${
            currentIsLight
              ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
              : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
          }`}
          aria-label="Eine Richtung im Uhrzeigersinn"
        >
          Weiter ↷
        </button>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 24: WOCHENTAGE-TRAINER
// ==========================================
export const WeekdaysWidgetContent: React.FC<{
  widget: any;
  currentIsLight: boolean;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight,
  onUpdate,
  showSettings = false,
  onCloseSettings,
}) => {
  const settings = useMemo(
    () => normalizeWeekdaysWidgetSettings(widget?.settings),
    [widget?.settings],
  );
  const today = useMemo(() => new Date(), []);
  const items = useMemo(() => getCalendarItems(settings.view), [settings.view]);
  const actualIndex = getCalendarIndexForDate(settings.view, today);
  const [selectedIndex, setSelectedIndex] = useState(actualIndex);
  const [practiceRound, setPracticeRound] = useState<CalendarPracticeRound>(
    () => createCalendarPracticeRound(settings.view),
  );
  const [answerState, setAnswerState] = useState<'idle' | 'wrong' | 'correct'>('idle');
  const [feedback, setFeedback] = useState('');
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const persistSettings = useCallback((patch: Partial<WeekdaysWidgetSettings>) => {
    if (!onUpdateRef.current) return;
    onUpdateRef.current({ settings: patch });
  }, []);

  useEffect(() => {
    const nextActualIndex = getCalendarIndexForDate(settings.view, today);
    setSelectedIndex(nextActualIndex);
    setPracticeRound(previous =>
      createCalendarPracticeRound(settings.view, Math.random, previous?.key),
    );
    setAnswerState('idle');
    setFeedback('');
  }, [settings.view, today]);

  useEffect(() => {
    setAnswerState('idle');
    setFeedback('');
    if (settings.mode === 'practice') {
      setPracticeRound(previous =>
        createCalendarPracticeRound(settings.view, Math.random, previous?.key),
      );
      setSelectedIndex(getCalendarIndexForDate(settings.view, today));
    }
  }, [settings.mode]);

  const changeView = (view: WeekdaysWidgetView) => {
    persistSettings({ view });
  };

  const changeMode = (mode: WeekdaysWidgetMode) => {
    persistSettings({ mode });
  };

  const selectItem = (index: number) => {
    if (settings.mode === 'practice' && answerState === 'correct') return;
    setSelectedIndex(index);
    if (answerState === 'wrong') {
      setAnswerState('idle');
      setFeedback('');
    }
  };

  const resetToToday = () => {
    setSelectedIndex(getCalendarIndexForDate(settings.view, today));
    setAnswerState('idle');
    setFeedback('');
  };

  const checkPractice = () => {
    if (selectedIndex === practiceRound.answerIndex) {
      setAnswerState('correct');
      setFeedback(`Richtig – ${items[practiceRound.answerIndex]}.`);
      return;
    }
    setAnswerState('wrong');
    setFeedback(`Noch nicht. Du hast ${items[selectedIndex]} gewählt. Versuch es noch einmal.`);
  };

  const nextPractice = () => {
    setPracticeRound(previous =>
      createCalendarPracticeRound(settings.view, Math.random, previous?.key),
    );
    setSelectedIndex(getCalendarIndexForDate(settings.view, today));
    setAnswerState('idle');
    setFeedback('');
  };

  const previousIndex = wrapCalendarIndex(selectedIndex - 1, items.length);
  const nextIndex = wrapCalendarIndex(selectedIndex + 1, items.length);
  const selectedIsActual = selectedIndex === actualIndex;

  const actualDateLabel = settings.view === 'weekdays'
    ? new Intl.DateTimeFormat('de-AT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(today)
    : new Intl.DateTimeFormat('de-AT', {
        month: 'long',
        year: 'numeric',
      }).format(today);

  const segmentButtonClass = (active: boolean) => `min-h-11 rounded-xl border px-3 text-xs font-black transition-colors ${
    active
      ? 'border-accent bg-accent text-accent-text'
      : currentIsLight
        ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
        : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
  }`;

  const itemButtonClass = (selected: boolean, isActual: boolean) => `min-h-11 rounded-xl border px-2 py-2 text-center text-xs font-black transition-colors ${
    selected
      ? 'border-accent bg-accent text-accent-text'
      : isActual
        ? 'border-accent bg-accent-soft text-accent'
        : currentIsLight
          ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
          : 'border-white/10 bg-white/5 text-slate-100 hover:border-accent hover:bg-white/10'
  }`;

  return (
    <div
      role="region"
      aria-label="Wochentage-Trainer"
      className={`relative flex h-full min-h-0 w-full flex-col overflow-hidden p-3 select-none ${
        currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
      }`}
    >
      {showSettings && (
        <div className={`absolute inset-0 z-30 flex min-h-0 flex-col overflow-y-auto p-4 ${
          currentIsLight ? 'bg-white text-slate-900' : 'bg-zinc-900 text-slate-100'
        }`}>
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-accent">Wochentage-Trainer-Einstellungen</p>
              <p className="mt-1 text-xs leading-relaxed opacity-65">
                Lege fest, ob das echte aktuelle Datum im Morgenkreis sichtbar ist.
              </p>
            </div>
            <button
              type="button"
              onClick={onCloseSettings}
              className="min-h-11 shrink-0 rounded-xl border border-slate-200 px-3 text-xs font-black hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
            >
              Fertig
            </button>
          </div>

          <section className="mt-4 shrink-0">
            <button
              type="button"
              aria-pressed={settings.showActualDate}
              onClick={() => persistSettings({ showActualDate: !settings.showActualDate })}
              className={`min-h-11 w-full rounded-xl border px-3 py-2 text-left text-xs font-bold transition-colors ${
                settings.showActualDate
                  ? 'border-accent bg-accent-soft text-accent'
                  : currentIsLight
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
              }`}
            >
              Aktuelles Datum {settings.showActualDate ? 'anzeigen' : 'ausblenden'}
            </button>
          </section>

          <div className={`mt-4 rounded-2xl border p-3 text-xs leading-relaxed ${
            currentIsLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-300'
          }`}>
            Im Erkunden-Modus kannst du jeden Tag oder Monat antippen. „Zurück zu heute“ setzt die Auswahl wieder auf den echten aktuellen Kalendertag beziehungsweise Monat.
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-2 gap-2" role="group" aria-label="Kalenderbereich">
        <button
          type="button"
          aria-pressed={settings.view === 'weekdays'}
          onClick={() => changeView('weekdays')}
          className={segmentButtonClass(settings.view === 'weekdays')}
        >
          Wochentage
        </button>
        <button
          type="button"
          aria-pressed={settings.view === 'months'}
          onClick={() => changeView('months')}
          className={segmentButtonClass(settings.view === 'months')}
        >
          Monate
        </button>
      </div>

      <div className="mt-2 grid shrink-0 grid-cols-2 gap-2" role="group" aria-label="Lernmodus">
        <button
          type="button"
          aria-pressed={settings.mode === 'explore'}
          onClick={() => changeMode('explore')}
          className={segmentButtonClass(settings.mode === 'explore')}
        >
          Erkunden
        </button>
        <button
          type="button"
          aria-pressed={settings.mode === 'practice'}
          onClick={() => changeMode('practice')}
          className={segmentButtonClass(settings.mode === 'practice')}
        >
          Üben
        </button>
      </div>

      {settings.showActualDate && (
        <div className={`mt-2 flex shrink-0 items-center justify-between gap-2 rounded-2xl border px-3 py-2 ${
          currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Heute</p>
            <p className="truncate text-sm font-black capitalize">{actualDateLabel}</p>
          </div>
          {!selectedIsActual && settings.mode === 'explore' && (
            <button
              type="button"
              onClick={resetToToday}
              className="min-h-11 shrink-0 rounded-xl bg-accent-soft px-3 text-xs font-black text-accent hover:bg-accent hover:text-accent-text"
            >
              Zurück zu heute
            </button>
          )}
        </div>
      )}

      {settings.mode === 'practice' && (
        <div className={`mt-2 shrink-0 rounded-2xl border p-3 ${
          currentIsLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-white/5'
        }`}>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-50">Aufgabe</p>
          <p className="mt-1 text-base font-black leading-snug text-accent">{practiceRound.prompt}</p>
          <p
            role="status"
            aria-live="polite"
            className={`mt-1 min-h-5 text-xs font-bold ${
              answerState === 'correct'
                ? 'text-emerald-600 dark:text-emerald-400'
                : answerState === 'wrong'
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'opacity-55'
            }`}
          >
            {feedback || 'Wähle deine Antwort und prüfe sie.'}
          </p>
        </div>
      )}

      <div className="min-h-0 flex-1 py-2">
        <div className={`grid h-full content-center gap-2 ${
          settings.view === 'weekdays' ? 'grid-cols-4' : 'grid-cols-4'
        }`} role="group" aria-label={settings.view === 'weekdays' ? 'Wochentage auswählen' : 'Monate auswählen'}>
          {items.map((item, index) => {
            const selected = selectedIndex === index;
            const isActual = actualIndex === index;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                disabled={settings.mode === 'practice' && answerState === 'correct'}
                onClick={() => selectItem(index)}
                className={`${itemButtonClass(selected, isActual)} disabled:cursor-default disabled:opacity-70`}
              >
                <span className="block text-sm">{item}</span>
                {settings.mode === 'explore' && isActual && !selected && (
                  <span className="mt-0.5 block text-[10px] font-bold opacity-70">
                    {settings.view === 'weekdays' ? 'heute' : 'aktuell'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {settings.mode === 'explore' ? (
        <div className={`grid shrink-0 grid-cols-3 gap-2 rounded-2xl border p-2 ${
          currentIsLight ? 'border-slate-200 bg-slate-50/80' : 'border-white/10 bg-white/5'
        }`}>
          <div className="flex min-h-11 flex-col items-center justify-center rounded-xl px-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-45">
              {settings.view === 'weekdays' ? 'Gestern' : 'Davor'}
            </span>
            <span className="mt-0.5 text-xs font-bold">{items[previousIndex]}</span>
          </div>
          <div className="flex min-h-11 flex-col items-center justify-center rounded-xl bg-accent-soft px-2 text-center text-accent">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
              {settings.view === 'weekdays' ? 'Heute' : 'Ausgewählt'}
            </span>
            <span className="mt-0.5 text-sm font-black">{items[selectedIndex]}</span>
          </div>
          <div className="flex min-h-11 flex-col items-center justify-center rounded-xl px-2 text-center">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-45">
              {settings.view === 'weekdays' ? 'Morgen' : 'Danach'}
            </span>
            <span className="mt-0.5 text-xs font-bold">{items[nextIndex]}</span>
          </div>
        </div>
      ) : (
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={resetToToday}
            disabled={answerState === 'correct'}
            className={`min-h-11 rounded-xl border px-3 text-xs font-black disabled:cursor-default disabled:opacity-60 ${
              currentIsLight
                ? 'border-slate-200 bg-white text-slate-700 hover:border-accent hover:bg-accent-soft'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-accent hover:bg-white/10'
            }`}
          >
            Auswahl zurücksetzen
          </button>
          {answerState === 'correct' ? (
            <button
              type="button"
              onClick={nextPractice}
              className="min-h-11 rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Nächste Aufgabe
            </button>
          ) : (
            <button
              type="button"
              onClick={checkPractice}
              className="min-h-11 rounded-xl bg-accent px-4 text-xs font-black text-accent-text hover:bg-accent-hover"
            >
              Prüfen
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ==========================================
// WIDGET: KLASSEN-SPARSCHWEIN (Migriert & konsolidiert auf Klassenglas-Daten)
// ==========================================
export const PiggybankWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ widget, currentIsLight }) => {
  const { app, setApp } = useApp();
  return (
    <ClassRewardWidget
      app={app}
      setApp={setApp}
      widget={{
        ...widget,
        settings: {
          symbol: '🪙',
          style: 'jar',
          ...(widget?.settings || {}),
        },
      }}
      currentIsLight={currentIsLight}
    />
  );
};

// ==========================================
// NEW WIDGET 26: STIMM-LAUTSTÄRKEN (Rule Guidelines)
// ==========================================
export const NoisescalesWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [activeLevel, setActiveLevel] = useState(0);

  const levels = [
    { num: 0, icon: "🤫", title: "Flüster-Stimme", desc: "Nur mein Nachbar hört mich leise rascheln." },
    { num: 1, icon: "🗣️", title: "Partner-Stimme", desc: "Zwei flüstern leise, die Nachbartische hören nichts." },
    { num: 2, icon: "👥", title: "Gruppen-Stimme", desc: "Ein toller Austausch am Tisch mit gedämpfter Stimme." },
    { num: 3, icon: "🎤", title: "Vortrags-Stimme", desc: "Präsentieren vor der ganzen Klasse - laut und klar!" }
  ];

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
          Erwartete Stimmlautstärke
        </span>
      </div>

      {/* Grid of noise rules */}
      <div className="flex-grow flex flex-col justify-center gap-1 my-1">
        {levels.map((lvl) => {
          const isSelected = activeLevel === lvl.num;
          return (
            <button
              key={lvl.num}
              onClick={() => {
                setActiveLevel(lvl.num);
                try {
                  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.frequency.setValueAtTime(330 + (lvl.num * 80), ctx.currentTime);
                  gain.gain.setValueAtTime(0.08, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.2);
                } catch (e) {}
              }}
              className={`w-full p-1.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'bg-yellow-500/10 border-yellow-500 text-yellow-600 dark:text-yellow-400 shadow' 
                  : currentIsLight ? 'bg-white border-slate-100 hover:bg-slate-50 text-slate-700' : 'bg-zinc-850 border-white/5 text-slate-350 hover:bg-zinc-805'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center font-black ${
                isSelected ? 'bg-yellow-500 text-white' : 'bg-slate-100 dark:bg-zinc-800'
              }`}>
                {lvl.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[7.5px] font-black uppercase tracking-wide leading-none">{lvl.title}</h4>
                <p className={`text-[6px] font-bold mt-0.5 truncate opacity-80`}>{lvl.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 27: WORT-SALAT (German Anagram Game)
// ==========================================
export const WordscrambleWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const dictionaryEasy = useMemo(() => [
    { original: "BALL", clue: "Rund und fliegt durch die Luft ⚽" },
    { original: "HUHN", clue: "Legt leckere Eier im Stall 🐔" },
    { original: "MAUS", clue: "Ein kleines Tier, das Käse mag 🐭" },
    { original: "HASE", clue: "Hat lange Ohren und hoppelt gern 🐰" },
    { original: "AUTO", clue: "Fährt auf vier Rädern auf der Straße 🚗" },
    { original: "HEFT", clue: "Darin schreibst du deine Aufgaben auf 📖" },
    { original: "BUCH", clue: "Spannende Geschichten zum Lesen 📚" },
    { original: "BROT", clue: "Leckere Scheibe mit Butter am Morgen 🍞" },
    { original: "FISCH", clue: "Schwimmt munter im tiefen Wasser 🐟" }
  ], []);

  const dictionaryMedium = useMemo(() => [
    { original: "SCHULE", clue: "Wo gelernt und gelacht wird 🏫" },
    { original: "KLASSE", clue: "Zusammen sind wir unschlagbar 👥" },
    { original: "LEHRER", clue: "Hilft dir beim Rechnen & Schreiben 🎓" },
    { original: "KREIDE", clue: "Zum Schreiben auf der grünen Tafel 🖍️" },
    { original: "PAUSE", clue: "Toben, Frühstück und Spielen! 🥪" },
    { original: "TAFEL", clue: "Darauf schreibt der Lehrer mit Kreide 🖼️" },
    { original: "WISSEN", clue: "Das Ergebnis von fleißigem Lernen 💡" },
    { original: "PANDA", clue: "Ein schwarz-weißer Bär, der Bambus mag 🐼" },
    { original: "FLIEGEN", clue: "Sich wie ein Vogel in der Luft bewegen ✈️" }
  ], []);

  const dictionaryHard = useMemo(() => [
    { original: "BUECHER", clue: "Enthalten spannende Geschichten 📚" },
    { original: "SCHULER", clue: "Fleißige Kinder im Klassenzimmer 🎒" },
    { original: "LERNEN", clue: "Wissen in den Kopf bekommen 🧠" },
    { original: "SPIELEN", clue: "Macht am meisten Spaß auf dem Schulhof 🧸" },
    { original: "FREUNDE", clue: "Mit ihnen spielt man am liebsten 🤝" },
    { original: "FERIEN", clue: "Die schönste Zeit des Schuljahres 🎉" },
    { original: "REGENBOGEN", clue: "Bunte Farben am Himmel nach dem Regen 🌈" },
    { original: "BLEISTIFT", clue: "Damit zeichnest und schreibst du im Heft ✏️" },
    { original: "FAHRRAD", clue: "Fährt auf zwei Rädern durch Muskelkraft 🚲" }
  ], []);

  const dictionaryExpert = useMemo(() => [
    { original: "HAUSAUFGABE", clue: "Kleine Übung für zu Hause nach der Schule 🏠" },
    { original: "WOERTERBUCH", clue: "Ein großes Buch zum Nachschlagen von Wörtern 📖" },
    { original: "KLASSENZIMMER", clue: "Der bunte Raum, in dem wir alle lernen 🏫" },
    { original: "PAUSENHOF", clue: "Großer Platz zum Rennen und Spielen in der Pause 🏃" },
    { original: "TASCHENRECHNER", clue: "Ein kleines Gerät, das für uns Zahlen rechnet 🧮" },
    { original: "SCHULRANZEN", clue: "Den trägst du auf dem Rücken zur Schule 🎒" }
  ], []);

  const { app } = useApp();
  const lifecycle = readWidgetLifecycleState(widget, "wordscramble", {
    difficulty: "medium" as "easy" | "medium" | "hard" | "expert",
    activeDictionary: dictionaryMedium as { original: string; clue: string }[],
    aiError: null as string | null,
    wordIdx: 0,
    selectedIds: [] as number[],
    scrambledLetters: [] as { id: number; char: string }[],
    feedback: "Entwirre den Wortsalat!",
    score: 0,
    showHint: false,
  });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>(() => lifecycle.difficulty);
  const [activeDictionary, setActiveDictionary] = useState<{ original: string, clue: string }[]>(() => lifecycle.activeDictionary);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const [wordIdx, setWordIdx] = useState<number>(() => lifecycle.wordIdx);
  const [selectedIds, setSelectedIds] = useState<number[]>(() => lifecycle.selectedIds);
  const [scrambledLetters, setScrambledLetters] = useState<{ id: number; char: string }[]>(() => lifecycle.scrambledLetters);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const [score, setScore] = useState<number>(() => lifecycle.score);
  const [showHint, setShowHint] = useState<boolean>(() => lifecycle.showHint);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "wordscramble"));
  const initialDifficultySyncRef = useRef(true);
  const initialScrambleRef = useRef(true);
  const solvedEffectInitialRef = useRef(true);

  usePersistedWidgetLifecycleState(widget, onUpdate, "wordscramble", {
    difficulty,
    activeDictionary,
    aiError,
    wordIdx,
    selectedIds,
    scrambledLetters,
    feedback,
    score,
    showHint,
  });

  const averageNiveau = useMemo(() => {
    if (!app.schueler || app.schueler.length === 0) return 3;
    const sum = app.schueler.reduce((acc, s) => acc + (s.niveau || 3), 0);
    return Math.round(sum / app.schueler.length);
  }, [app.schueler]);

  // Sync dictionary pool based on selected difficulty. A remount with a
  // lifecycle snapshot keeps its task pool; an explicit difficulty change
  // still starts the corresponding pool.
  useEffect(() => {
    if (initialDifficultySyncRef.current) {
      initialDifficultySyncRef.current = false;
      if (didRestoreRef.current) return;
    }
    if (difficulty === 'easy') {
      setActiveDictionary(dictionaryEasy);
    } else if (difficulty === 'medium') {
      setActiveDictionary(dictionaryMedium);
    } else if (difficulty === 'hard') {
      setActiveDictionary(dictionaryHard);
    } else {
      setActiveDictionary(dictionaryExpert);
    }
    setWordIdx(0);
    setSelectedIds([]);
  }, [difficulty, dictionaryEasy, dictionaryMedium, dictionaryHard, dictionaryExpert]);

  const loadAIWords = async () => {
    setIsLoadingAI(true);
    setAiError(null);
    try {
      const diff = difficulty === 'easy' ? 'leicht' : difficulty === 'hard' ? 'schwer' : difficulty === 'expert' ? 'extrem' : 'mittel';
      const result = await generateWidgetTasks("wordscramble", app.stufe || 4, averageNiveau, diff);
      if (result && result.tasks && Array.isArray(result.tasks) && result.tasks.length > 0) {
        setActiveDictionary(result.tasks);
        setWordIdx(0);
        setSelectedIds([]);
      } else {
        setAiError("Fehler beim Laden.");
      }
    } catch (e) {
      setAiError("KI unerreicht.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // When active word or dictionary changes, scramble letters once and store
  useEffect(() => {
    if (initialScrambleRef.current) {
      initialScrambleRef.current = false;
      if (didRestoreRef.current && lifecycle.scrambledLetters.length > 0) return;
    }

    const currentWordObj = activeDictionary[wordIdx] || activeDictionary[0] || dictionaryMedium[0];
    if (!currentWordObj) return;

    const letters = currentWordObj.original.split('').map((char, index) => ({
      id: index,
      char: char.toUpperCase()
    }));

    // Fisher-Yates shuffle
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    // Avoid accidentally outputting exactly the solved word
    if (letters.map(l => l.char).join('') === currentWordObj.original.toUpperCase()) {
      letters.reverse();
    }

    setScrambledLetters(letters);
    setSelectedIds([]);
    setFeedback("Klicke auf die Buchstaben unten, um das Wort zu bilden!");
    setShowHint(false);
  }, [wordIdx, activeDictionary, dictionaryMedium]);

  const playClickSound = (stepCount: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(350 + (stepCount * 50), ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2); // G5
      
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      
      osc1.connect(gain);
      gain.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.45);
    } catch (e) {}
  };

  const speak = (text: string) => {
    try {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE';
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  };

  const handleLetterClick = (id: number) => {
    if (solved) return;
    setSelectedIds([...selectedIds, id]);
    playClickSound(selectedIds.length);
  };

  const handleSlotClick = (id: number) => {
    if (solved) return;
    setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    playClickSound(selectedIds.length - 1);
  };

  const handleClear = () => {
    setSelectedIds([]);
  };

  const handleNext = () => {
    setWordIdx((prev) => (prev + 1) % activeDictionary.length);
    setSelectedIds([]);
  };

  const currentWord = activeDictionary[wordIdx] || activeDictionary[0] || dictionaryMedium[0];
  const currentSelectionString = selectedIds.map(id => scrambledLetters.find(l => l.id === id)?.char || '').join('');
  const solved = currentWord && currentSelectionString === currentWord.original.toUpperCase();

  // Star points progress. A restored solved word has already been scored.
  useEffect(() => {
    if (solvedEffectInitialRef.current) {
      solvedEffectInitialRef.current = false;
      if (didRestoreRef.current && solved) return;
    }
    if (solved) {
      playSuccessSound();
      setFeedback("✨ Sensationell! Du hast das Wort richtig entwirrt!");
      setScore(s => s + 1);
      speak(currentWord.original);
    }
  }, [solved, currentWord]);

  // Educational Hint System
  const handleHint = () => {
    if (solved || !currentWord) return;
    
    const targetChars = currentWord.original.toUpperCase().split('');
    const currentSelectionChars = selectedIds.map(id => scrambledLetters.find(l => l.id === id)?.char || '');
    
    let firstMismatchIdx = -1;
    for (let i = 0; i < targetChars.length; i++) {
      if (currentSelectionChars[i] !== targetChars[i]) {
        firstMismatchIdx = i;
        break;
      }
    }
    
    if (firstMismatchIdx !== -1) {
      const targetChar = targetChars[firstMismatchIdx];
      // Find a matching letter object that isn't selected yet
      const matchingLetter = scrambledLetters.find(
        l => l.char === targetChar && !selectedIds.includes(l.id)
      );
      
      if (matchingLetter) {
        // Truncate selected list up to mismatch, then append matching
        const correctPrefix = selectedIds.slice(0, firstMismatchIdx);
        setSelectedIds([...correctPrefix, matchingLetter.id]);
        setFeedback(`Eule Schlaumeier flüstert: Der nächste Buchstabe ist "${targetChar}"! 💡`);
        playClickSound(firstMismatchIdx);
        setShowHint(true);
      }
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2.5 h-full min-h-0 pointer-events-auto select-none gap-2">
      {/* Header with Title and Difficulty Selector */}
      <div className="flex justify-between items-center px-1 shrink-0">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🥗 Wort-Salat
          </span>
          <div className="flex gap-1 mt-0.5">
            {(['easy', 'medium', 'hard', 'expert'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-1.5 py-0.5 rounded text-[6px] font-extrabold uppercase tracking-wide cursor-pointer transition-all ${
                  difficulty === d
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : currentIsLight
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                {d === 'easy' ? 'Leicht' : d === 'medium' ? 'Mittel' : d === 'hard' ? 'Schwer' : 'Experte'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={loadAIWords}
            disabled={isLoadingAI}
            title={`Generiert Aufgaben basierend auf Niveau ${averageNiveau}`}
            className={`px-1.5 py-0.5 rounded text-[6px] font-bold flex items-center gap-0.5 transition-all text-white ${
              isLoadingAI ? 'bg-indigo-300 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 cursor-pointer'
            }`}
          >
            <Sparkles className="w-1.5 h-1.5" />
            {isLoadingAI ? "KI..." : `KI ✨`}
          </button>
          <span className="text-[7.5px] bg-indigo-50/10 text-indigo-500 px-1.5 font-black rounded">
            {wordIdx + 1}/{activeDictionary.length}
          </span>
        </div>
      </div>

      {/* Mascot Bubble */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 bg-indigo-50/40 dark:bg-zinc-900/40 p-1.5 rounded-xl border border-indigo-500/5">
        <div className="flex items-center gap-1.5 truncate flex-grow">
          <span className="text-xl shrink-0 animate-bounce">🦉</span>
          <div className="flex flex-col text-left truncate">
            <span className="text-[6px] font-black uppercase text-indigo-500">Eule Schlaumeier</span>
            <p className="text-[7.5px] font-medium text-slate-600 dark:text-slate-300 leading-none truncate max-w-56">
              {solved 
                ? "Unglaublich! Du bist ein echter Wort-Meister! 🌟" 
                : showHint 
                  ? `Hinweis: ${currentWord.clue}`
                  : "Möchtest du einen Tipp von mir? 💡"
              }
            </p>
          </div>
        </div>
        {!solved && (
          <button
            onClick={() => setShowHint(!showHint)}
            className={`p-1 rounded-lg transition-all border shrink-0 cursor-pointer ${
              showHint
                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:border-zinc-700 text-slate-500 dark:text-neutral-400'
            }`}
            title={showHint ? "Tipp ausblenden" : "Tipp einblenden"}
          >
            {showHint ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
          </button>
        )}
      </div>

      {/* Main Game Stage */}
      <div className="flex flex-col items-center justify-center flex-grow p-1 text-center">
        {/* Dash Slot Placeholders for target word */}
        <div className="flex gap-1 mb-3.5 justify-center flex-wrap">
          {currentWord.original.split('').map((_, idx) => {
            const selectedLetterId = selectedIds[idx];
            const letterObj = scrambledLetters.find(l => l.id === selectedLetterId);
            
            return (
              <button
                key={idx}
                onClick={() => letterObj && handleSlotClick(letterObj.id)}
                disabled={solved || !letterObj}
                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs transition-all border relative cursor-pointer ${
                  letterObj
                    ? solved
                      ? 'bg-emerald-500 border-emerald-600 text-white animate-bounce shadow-md scale-105'
                      : 'bg-indigo-500 border-indigo-600 text-white shadow hover:bg-indigo-600'
                    : 'bg-transparent border-dashed border-slate-300 dark:border-zinc-800 text-transparent'
                }`}
              >
                {letterObj ? letterObj.char : ""}
                {!letterObj && (
                  <span className="absolute bottom-1 w-2.5 h-0.5 bg-slate-300 dark:bg-zinc-700" />
                )}
              </button>
            );
          })}
        </div>

        {/* Shuffled Bank of letters to choose from */}
        <div className="flex gap-1 justify-center flex-wrap">
          {scrambledLetters.map((letterObj) => {
            const isUsed = selectedIds.includes(letterObj.id);

            return (
              <button
                key={letterObj.id}
                disabled={isUsed || solved}
                onClick={() => handleLetterClick(letterObj.id)}
                className={`w-6.5 h-6.5 rounded-lg text-[9.5px] font-black shadow-sm transition-all border cursor-pointer ${
                  isUsed
                    ? 'opacity-15 bg-slate-100 border-transparent text-slate-300 dark:bg-zinc-900 dark:text-zinc-800 scale-95'
                    : currentIsLight 
                      ? 'bg-white border-slate-200 hover:bg-slate-100 hover:scale-102 text-slate-800' 
                      : 'bg-zinc-850 border-white/5 hover:bg-zinc-800 hover:scale-102 text-slate-200'
                }`}
              >
                {letterObj.char}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control Footer */}
      <div className="shrink-0 flex gap-1.5 pt-0.5 items-center justify-between">
        {/* Stars counter / Stats */}
        <div className="flex gap-0.5 items-center bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-xl text-[8px] font-extrabold text-amber-500">
          <Trophy className="w-2.5 h-2.5 text-amber-500 shrink-0" />
          <span>Sterne: {score}</span>
        </div>

        {/* Tipp button */}
        <button
          onClick={handleHint}
          disabled={solved}
          className={`px-2 py-1 rounded-xl border text-[8px] font-black uppercase transition-all flex items-center gap-0.5 cursor-pointer ${
            solved
              ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400 bg-slate-100'
              : currentIsLight
                ? 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-600'
                : 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-amber-300'
          }`}
          title="Ersten ungelösten Buchstaben einsetzen"
        >
          Tipp 💡
        </button>

        {/* Next / Clear */}
        <div className="flex-1 flex justify-end gap-1">
          {solved ? (
            <button
              onClick={handleNext}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8.5px] uppercase tracking-wider transition-all shadow-md cursor-pointer flex items-center gap-1"
            >
              Nächstes Wort ➔
            </button>
          ) : (
            <button
              onClick={handleClear}
              disabled={selectedIds.length === 0}
              className={`px-2 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                selectedIds.length === 0
                  ? 'opacity-40 cursor-not-allowed border-transparent text-slate-400 bg-slate-100 dark:bg-zinc-900'
                  : currentIsLight 
                    ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                    : 'bg-transparent border-white/5 text-slate-350 hover:bg-zinc-850'
              }`}
            >
              Löschen 🗑️
            </button>
          )}
        </div>
      </div>

      {/* Rhythmic Status message */}
      <p className="shrink-0 text-[7px] font-extrabold text-indigo-500 text-center truncate">{feedback}</p>
    </div>
  );
};

// ==========================================
// NEW WIDGET 28: SYMMETRIE-SPIEL (Shadowshapes)
// ==========================================
export const ShadowshapesWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  // Configured levels with customized grid dimensional matrices - Expanded to 15 unique levels
  const puzzles = useMemo(() => [
    {
      name: "Sehr leicht: Herz ❤️",
      size: 2, 
      rows: 4,
      presets: [
        [0, 1],
        [1, 1],
        [1, 1],
        [0, 1]
      ]
    },
    {
      name: "Leicht: Tannenbaum 🌲",
      size: 2,
      rows: 5,
      presets: [
        [0, 4],
        [0, 4],
        [1, 4],
        [1, 4],
        [0, 6]
      ]
    },
    {
      name: "Leicht: Schmetterling 🦋",
      size: 2,
      rows: 4,
      presets: [
        [1, 0],
        [1, 3],
        [0, 3],
        [1, 0]
      ]
    },
    {
      name: "Mittel: Bunte Krone 👑",
      size: 3,
      rows: 6,
      presets: [
        [0, 2, 0],
        [3, 3, 0],
        [0, 3, 4],
        [0, 2, 4],
        [5, 0, 0],
        [5, 0, 2]
      ]
    },
    {
      name: "Knifflig: Rakete 🚀",
      size: 3,
      rows: 6,
      presets: [
        [0, 0, 1],
        [0, 1, 2],
        [0, 2, 2],
        [0, 2, 6],
        [3, 3, 6],
        [1, 0, 0]
      ]
    },
    {
      name: "Sehr knifflig: Bunte Spinne 🕷️",
      size: 4,
      rows: 8,
      presets: [
        [6, 5, 0, 0],
        [0, 6, 5, 0],
        [6, 0, 0, 5],
        [5, 6, 4, 0],
        [0, 4, 6, 5],
        [1, 0, 6, 0],
        [0, 1, 0, 6],
        [6, 1, 0, 0]
      ]
    },
    {
      name: "Fortgeschritten: Turm 🏰",
      size: 4,
      rows: 6,
      presets: [
        [0, 2, 0, 6],
        [0, 2, 1, 6],
        [0, 3, 2, 2],
        [0, 3, 2, 6],
        [4, 4, 2, 6],
        [4, 4, 4, 4]
      ]
    },
    {
      name: "Fortgeschritten: Maske 🎭",
      size: 5,
      rows: 7,
      presets: [
        [5, 0, 5, 0, 0],
        [5, 5, 5, 2, 0],
        [0, 5, 6, 2, 2],
        [0, 5, 5, 6, 2],
        [0, 0, 5, 5, 5],
        [0, 0, 0, 5, 5],
        [0, 0, 0, 0, 5]
      ]
    },
    {
      name: "Profi: Mandala 🌺",
      size: 5,
      rows: 8,
      presets: [
        [3, 0, 0, 0, 3],
        [0, 3, 0, 3, 0],
        [0, 0, 5, 0, 0],
        [0, 5, 1, 5, 0],
        [3, 0, 1, 0, 3],
        [0, 3, 4, 3, 0],
        [0, 4, 4, 4, 0],
        [4, 0, 4, 0, 4]
      ]
    },
    {
      name: "Meister: Phönix 🦅",
      size: 6,
      rows: 8,
      presets: [
        [0, 0, 0, 0, 1, 1],
        [0, 0, 0, 1, 1, 3],
        [0, 0, 1, 1, 3, 3],
        [1, 1, 1, 3, 3, 0],
        [1, 1, 3, 3, 0, 0],
        [0, 1, 3, 0, 0, 0],
        [0, 0, 3, 4, 0, 0],
        [0, 0, 0, 4, 4, 0]
      ]
    },
    {
      name: "Meister: Pixel-Alien 👾",
      size: 6,
      rows: 9,
      presets: [
        [0, 0, 2, 2, 0, 0],
        [0, 2, 2, 2, 2, 0],
        [2, 2, 6, 2, 2, 2],
        [2, 2, 2, 2, 2, 2],
        [2, 0, 2, 2, 0, 2],
        [0, 2, 2, 2, 2, 0],
        [0, 0, 2, 2, 0, 0],
        [0, 2, 0, 0, 2, 0],
        [2, 0, 0, 0, 0, 2]
      ]
    },
    {
      name: "Großmeister: Diamant 💎",
      size: 6,
      rows: 10,
      presets: [
        [0, 0, 0, 0, 0, 2],
        [0, 0, 0, 0, 2, 2],
        [0, 0, 0, 2, 2, 5],
        [0, 0, 2, 2, 5, 5],
        [0, 2, 2, 5, 5, 2],
        [2, 2, 5, 5, 2, 0],
        [2, 5, 5, 2, 0, 0],
        [5, 5, 2, 0, 0, 0],
        [5, 2, 0, 0, 0, 0],
        [2, 0, 0, 0, 0, 0]
      ]
    },
    {
      name: "Ultra-Knifflig: Labyrinth 🕸️",
      size: 7,
      rows: 10,
      presets: [
        [6, 6, 6, 6, 6, 6, 6],
        [6, 0, 0, 0, 0, 0, 0],
        [6, 0, 6, 6, 6, 6, 6],
        [6, 0, 6, 0, 0, 0, 6],
        [6, 0, 6, 0, 6, 0, 6],
        [6, 0, 6, 0, 6, 0, 6],
        [6, 0, 0, 0, 6, 0, 6],
        [6, 6, 6, 6, 6, 0, 6],
        [0, 0, 0, 0, 0, 0, 6],
        [6, 6, 6, 6, 6, 6, 6]
      ]
    },
    {
      name: "Extrem: Yin Yang ☯️",
      size: 6,
      rows: 10,
      presets: [
        [0, 0, 6, 6, 6, 6],
        [0, 6, 6, 6, 6, 6],
        [6, 6, 6, 0, 0, 6],
        [6, 6, 6, 0, 0, 6],
        [6, 6, 6, 6, 6, 6],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 6, 6, 0],
        [0, 0, 0, 6, 6, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0]
      ]
    },
    {
      name: "Unmöglich: Mega-Mosaik 🌌",
      size: 8,
      rows: 11,
      presets: [
        [1, 2, 3, 4, 5, 6, 1, 2],
        [2, 3, 4, 5, 6, 1, 2, 3],
        [3, 4, 5, 6, 1, 2, 3, 4],
        [4, 5, 0, 0, 0, 0, 4, 5],
        [5, 6, 0, 3, 3, 0, 5, 6],
        [6, 1, 0, 3, 3, 0, 6, 1],
        [1, 2, 0, 0, 0, 0, 1, 2],
        [2, 3, 4, 5, 6, 1, 2, 3],
        [3, 4, 5, 6, 1, 2, 3, 4],
        [4, 5, 6, 1, 2, 3, 4, 5],
        [5, 6, 1, 2, 3, 4, 5, 6]
      ]
    }
  ], []);

  // Selected paint brush brush index
  const [selectedBrush, setSelectedBrush] = useState<number>(3); // start with gold brush
  const [activePuzzleIdx, setActivePuzzleIdx] = useState<number>(0);

  // New modifiers: Mirror Mode, Difficulty, Lives, Timer
  const [mirrorMode, setMirrorMode] = useState<'classic' | 'swap' | 'rotate'>('classic');
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal');
  const [lives, setLives] = useState<number>(3);
  const [timerSeconds, setTimerSeconds] = useState<number>(60);
  const [incorrectCells, setIncorrectCells] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState<number>(0);

  // Available interactive colors: 0 is empty slate grey
  const colors = [
    { id: 0, name: "🧹 Radierer", bgClass: 'bg-slate-100/60 dark:bg-zinc-950 border-slate-300/40 text-[6px]' },
    { id: 1, name: "Rot", bgClass: 'bg-red-500 border-red-600 border-b-2' },
    { id: 2, name: "Blau", bgClass: 'bg-blue-500 border-blue-600 border-b-2' },
    { id: 3, name: "Gold", bgClass: 'bg-amber-400 border-amber-500 border-b-2' },
    { id: 4, name: "Grün", bgClass: 'bg-emerald-500 border-emerald-600 border-b-2' },
    { id: 5, name: "Pink", bgClass: 'bg-pink-500 border-pink-600 border-b-2' },
    { id: 6, name: "Schwarz", bgClass: 'bg-black border-zinc-700 shadow shadow-inner border-b-2 text-white' }
  ];

  const activePuzzle = puzzles[activePuzzleIdx];
  const presets = activePuzzle.presets;

  // Initialize right interactive mirror grid dynamically based on the active level
  const [rightGrid, setRightGrid] = useState<number[][]>(() => 
    Array.from({ length: puzzles[0].rows }, () => Array(puzzles[0].size).fill(0))
  );

  // Validation response feedback states
  const [showStatusHint, setShowStatusHint] = useState<"none" | "success" | "failure">("none");

  // Reset grid whenever puzzle index, difficulty, or mirrorMode shifts
  const handleReset = () => {
    setRightGrid(
      Array.from({ length: activePuzzle.rows }, () => Array(activePuzzle.size).fill(0))
    );
    setShowStatusHint("none");
    setIncorrectCells({});
    setLives(3);
    setTimerSeconds(difficulty === 'hard' ? 60 : 0);
  };

  useEffect(() => {
    handleReset();
  }, [activePuzzleIdx, difficulty, mirrorMode]);

  // Timer Countdown Effect for Hard Mode
  useEffect(() => {
    if (difficulty !== 'hard' || showStatusHint === 'success' || timerSeconds <= 0) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowStatusHint("failure");
          // Play a sad buzz sound
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(130, ctx.currentTime);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.55);
          } catch (e) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [difficulty, showStatusHint, timerSeconds]);

  const toggleCell = (row: number, rightCol: number) => {
    setShowStatusHint("none");
    // Clear individual wrong indicator when player touches the cell
    setIncorrectCells(prev => {
      const copy = { ...prev };
      delete copy[`${row}-${rightCol}`];
      return copy;
    });

    setRightGrid(prev => {
      // Paint with chosen brush immediately to make it direct and premium
      const next = prev.map((r, rIdx) => 
        rIdx === row 
          ? r.map((c, cIdx) => {
              if (cIdx === rightCol) {
                // If it is already painted with selectedBrush, toggle it empty, or vice versa
                return c === selectedBrush ? 0 : selectedBrush;
              }
              return c;
            }) 
          : [...r]
      );

      // Auditory click stimulation
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(400 + (row * 65), ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (e) {}

      return next;
    });
  };

  // Check the current symmetry based on current mode
  const checkSymmetry = () => {
    const wrongMap: Record<string, boolean> = {};
    let allCorrect = true;

    for (let r = 0; r < activePuzzle.rows; r++) {
      for (let c = 0; c < activePuzzle.size; c++) {
        const leftValue = presets[r][c];
        
        let expectedValue = leftValue;
        if (mirrorMode === 'swap') {
          if (leftValue === 1) expectedValue = 2;
          else if (leftValue === 2) expectedValue = 1;
          else if (leftValue === 3) expectedValue = 4;
          else if (leftValue === 4) expectedValue = 3;
          else if (leftValue === 5) expectedValue = 6;
          else if (leftValue === 6) expectedValue = 5;
        }

        if (mirrorMode === 'rotate') {
          const rotatedRow = activePuzzle.rows - 1 - r;
          const rotatedCol = activePuzzle.size - 1 - c;
          const rightValue = rightGrid[rotatedRow]?.[rotatedCol];
          if (expectedValue !== rightValue) {
            wrongMap[`${rotatedRow}-${rotatedCol}`] = true;
            allCorrect = false;
          }
        } else {
          const targetRightCol = activePuzzle.size - 1 - c;
          const rightValue = rightGrid[r]?.[targetRightCol];
          if (expectedValue !== rightValue) {
            wrongMap[`${r}-${targetRightCol}`] = true;
            allCorrect = false;
          }
        }
      }
    }
    return { allCorrect, wrongMap };
  };

  const { allCorrect: isCompleted } = checkSymmetry();

  const handleVerifyClick = () => {
    const { allCorrect, wrongMap } = checkSymmetry();
    setIncorrectCells(wrongMap);

    if (allCorrect) {
      setShowStatusHint("success");
      setStreak(prev => prev + 1);
      // Joyful celebration sound
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
        });
      } catch (e) {}
    } else {
      setShowStatusHint("failure");
      setStreak(0);
      
      if (difficulty === 'hard') {
        setLives(prev => {
          const next = prev - 1;
          if (next <= 0) {
            // Out of lives! Play Game Over sound
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.frequency.setValueAtTime(100, ctx.currentTime);
              gain.gain.setValueAtTime(0.12, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
              osc.connect(gain).connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.85);
            } catch (e) {}
          }
          return next;
        });
      }

      // Sad buzz note
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } catch (e) {}
    }
  };

  // Determine optimal size class for responsive grids
  const cellSizeClass = activePuzzle.size >= 7 
    ? 'w-3.5 h-3.5 sm:w-4 sm:h-4 text-[5px]' 
    : activePuzzle.size >= 5 
      ? 'w-4 h-4 sm:w-4.5 sm:h-4.5 text-[6px]' 
      : 'w-5 h-5 text-[7px]';

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-1.5">
      <div className="flex flex-col gap-1 shrink-0">
        <div className="flex justify-between items-center px-1">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
            📐 Spiegelbild-Forscher PRO
          </span>
          <div className="flex items-center gap-1.5">
            {streak > 0 && (
              <span className="text-[7px] font-black px-1.5 py-0.5 bg-orange-500 text-white rounded shadow animate-bounce flex items-center gap-0.5">
                🔥 {streak}
              </span>
            )}
            <span className={`text-[7px] px-1.5 py-0.5 font-black uppercase rounded ${isCompleted ? 'bg-emerald-500 text-white shadow' : 'bg-amber-500/10 text-amber-500'}`}>
              {isCompleted ? "Spiegelbild! ⭐" : "Spiegeln!"}
            </span>
          </div>
        </div>

        {/* Puzzle Level Selectors Container */}
        <div className="flex flex-col gap-1 bg-slate-100/80 dark:bg-zinc-900/60 p-1 rounded-lg border border-slate-200 dark:border-white/5">
          <div className="flex justify-between items-center px-1">
            <span className="text-[6.5px] font-black uppercase text-slate-400 dark:text-zinc-500">
              Level wählen ({activePuzzleIdx + 1}/15)
            </span>
          </div>
          <div className="flex max-h-12 overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500/30 p-0.5 rounded-md text-[6.5px] font-black gap-1 flex-wrap">
            {puzzles.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setActivePuzzleIdx(idx)}
                className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                  activePuzzleIdx === idx ? 'bg-indigo-500 text-white font-extrabold' : 'text-slate-500 dark:text-neutral-300 bg-black/5 hover:bg-black/10'
                }`}
              >
                {p.name.split(':')[0]}
              </button>
            ))}
          </div>
        </div>
        
        {/* Modifier Control Settings row */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-zinc-950 p-1 rounded-lg border border-slate-200/60 dark:border-white/5">
          {/* Mirror Mode selector */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[5.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Spiegeltyp 🪞</span>
            <div className="flex gap-0.5 text-[6.5px]">
              <button 
                onClick={() => setMirrorMode('classic')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${mirrorMode === 'classic' ? 'bg-indigo-550 text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
              >
                Klassisch
              </button>
              <button 
                onClick={() => setMirrorMode('swap')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${mirrorMode === 'swap' ? 'bg-pink-500 text-white animate-pulse' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
                title="Farben werden im Spiegel vertauscht!"
              >
                Tausch 🎨
              </button>
              <button 
                onClick={() => setMirrorMode('rotate')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${mirrorMode === 'rotate' ? 'bg-purple-550 text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
                title="180° Punkt-Drehung!"
              >
                180° 🌀
              </button>
            </div>
          </div>

          {/* Difficulty selector */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[5.5px] font-black uppercase text-slate-400 dark:text-zinc-500 tracking-wider">Modus-Schwierigkeit ⚙️</span>
            <div className="flex gap-0.5 text-[6.5px]">
              <button 
                onClick={() => setDifficulty('easy')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${difficulty === 'easy' ? 'bg-emerald-500 text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
              >
                Locker 🟢
              </button>
              <button 
                onClick={() => setDifficulty('normal')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${difficulty === 'normal' ? 'bg-amber-500 text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
              >
                Normal 🟡
              </button>
              <button 
                onClick={() => setDifficulty('hard')}
                className={`flex-1 py-0.5 px-1 rounded font-black transition-all cursor-pointer ${difficulty === 'hard' ? 'bg-rose-550 text-white' : 'bg-black/5 text-slate-500 hover:bg-black/10'}`}
              >
                Profi 🔴
              </button>
            </div>
          </div>
        </div>

        {/* Info label about active mode rules */}
        <div className="text-[6.5px] font-bold text-center text-slate-500 leading-tight">
          <span>{activePuzzle.name}</span>
          {mirrorMode === 'swap' && (
            <span className="text-pink-500 ml-1.5 font-black uppercase">⚠️ Farbtausch aktiv: Rot↔Blau | Gold↔Grün | Pink↔Schwarz!</span>
          )}
          {mirrorMode === 'rotate' && (
            <span className="text-purple-500 ml-1.5 font-black uppercase">🌀 Rotationsmodus aktiv: 180° Punkt-Spiegelung!</span>
          )}
          {difficulty === 'easy' && (
            <span className="text-emerald-500 ml-1.5 font-black">🟢 Fehlerhilfen leuchten rot auf!</span>
          )}
        </div>
      </div>

      {/* Challenge Stats HUD when in Hard Mode */}
      {difficulty === 'hard' && (
        <div className="flex justify-between items-center bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg shrink-0">
          <div className="flex items-center gap-1 text-[7.5px] font-black text-rose-500 uppercase">
            <span>Leben:</span>
            <span className="flex gap-0.5 text-xs">
              {lives <= 0 ? "☠️ GAME OVER" : Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="transition-all duration-300">
                  {i < lives ? "❤️" : "🖤"}
                </span>
              ))}
            </span>
          </div>

          <div className={`flex items-center gap-1 text-[7.5px] font-black ${timerSeconds <= 15 ? 'text-red-500 animate-pulse scale-105' : 'text-slate-500'} uppercase`}>
            <span>Zeit übrig:</span>
            <span className="font-mono bg-black/10 px-1.5 py-0.5 rounded font-black">{timerSeconds}s</span>
          </div>
        </div>
      )}

      {/* Drawing color brushes selection panel */}
      <div className="shrink-0 flex items-center justify-center gap-1.5">
        <span className="text-[6.5px] font-black tracking-wider uppercase opacity-55">Farbe wählen:</span>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {colors.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedBrush(c.id)}
              className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full border cursor-pointer hover:scale-110 active:scale-95 transition-all relative flex items-center justify-center ${
                selectedBrush === c.id 
                  ? 'ring-2 ring-indigo-500 scale-125 border-white shadow-md z-10' 
                  : 'border-slate-300/60'
              } ${c.id === 0 ? 'bg-slate-200/80 dark:bg-zinc-800' : colors[c.id].bgClass}`}
              title={c.name}
            >
              {c.id === 0 && <span className="text-[7.5px]">🧹</span>}
              {selectedBrush === c.id && c.id !== 0 && (
                <span className={`w-1.5 h-1.5 rounded-full ${c.id === 6 ? 'bg-white' : 'bg-black/55'}`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Viewport Canvas */}
      <div className="flex-grow flex items-center justify-center p-0.5">
        {lives <= 0 && difficulty === 'hard' ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-pulse">
            <span className="text-3xl">☠️</span>
            <p className="text-[9px] font-black text-rose-500 uppercase mt-1">Keine Leben mehr übrig!</p>
            <p className="text-[7px] text-slate-500 font-bold mt-0.5">Muster wird zurückgesetzt...</p>
          </div>
        ) : timerSeconds <= 0 && difficulty === 'hard' ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-pulse">
            <span className="text-3xl">⏳</span>
            <p className="text-[9px] font-black text-rose-500 uppercase mt-1">Zeit abgelaufen!</p>
            <p className="text-[7px] text-slate-500 font-bold mt-0.5">Lass uns den Timer neustarten.</p>
          </div>
        ) : (
          <div className={`grid p-1.5 bg-slate-100/50 dark:bg-zinc-900 rounded-xl border border-dashed border-slate-300 dark:border-white/10 relative scale-102 gap-1`}>
            
            {/* Vertical symmetry mirror line with state icons */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-indigo-500/50 z-10 select-none pointer-events-none flex flex-col justify-around items-center">
              <span className="text-[6px] bg-indigo-500 text-white rounded-full p-0.5 -translate-x-1/2">
                {mirrorMode === 'classic' ? '🪞' : mirrorMode === 'swap' ? '🎨' : '🌀'}
              </span>
            </div>

            {/* Core dynamic layout row mapping */}
            {Array.from({ length: activePuzzle.rows }).map((_, rIdx) => {
              return (
                <div key={rIdx} className="flex gap-1 items-center justify-center">
                  
                  {/* Left Preset Columns (Read Only to mirror) */}
                  <div className="flex gap-1">
                    {Array.from({ length: activePuzzle.size }).map((_, cIdx) => {
                      const cellVal = presets[rIdx]?.[cIdx] ?? 0;
                      const colorData = colors[cellVal] || colors[0];
                      return (
                        <div 
                          key={`left-${cIdx}`}
                          className={`${cellSizeClass} rounded border transition-all ${colorData.bgClass}`} 
                        />
                      );
                    })}
                  </div>

                  {/* Symmetrical gap space */}
                  <div className="w-0.5" />

                  {/* Right Interactive Columns (Click to paint with brush) */}
                  <div className="flex gap-1">
                    {Array.from({ length: activePuzzle.size }).map((_, cIdx) => {
                      const cellVal = rightGrid[rIdx]?.[cIdx] ?? 0;
                      const colorData = colors[cellVal] || colors[0];
                      const isWrong = incorrectCells[`${rIdx}-${cIdx}`];
                      return (
                        <button
                          key={`right-${cIdx}`}
                          onClick={() => toggleCell(rIdx, cIdx)}
                          className={`${cellSizeClass} rounded transition-all border cursor-pointer hover:border-indigo-400 active:scale-95 ${colorData.bgClass} ${
                            isWrong ? 'ring-2 ring-rose-500 border-rose-500 animate-pulse' : ''
                          }`}
                        />
                      );
                    })}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation feedback logs */}
      {showStatusHint !== "none" && (
        <div className={`p-1 rounded-lg border text-center text-[7.5px] font-bold tracking-tight animate-fade-in shrink-0 ${
          showStatusHint === "success"
            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400'
        }`}>
          {showStatusHint === "success" 
            ? "Mustergiltig! Alle Quadrate spiegeln sich wunderschön! 🏆🤩" 
            : difficulty === 'hard'
              ? `Leider falsch! Du hast noch ${lives} von 3 Leben übrig. Schau ganz genau hin! 🕵️`
              : "Ein paar Farben stimmen noch nicht. Schau noch mal genau auf den Spiegelstrich! 🕵️"
          }
        </div>
      )}

      {/* Verification control rail */}
      <div className="shrink-0 flex gap-1 justify-center items-center pt-0.5 border-t border-slate-100 dark:border-white/5">
        <button
          onClick={handleReset}
          className={`px-3 py-1 rounded-lg border text-[7.5px] font-black uppercase transition-all cursor-pointer ${
            currentIsLight ? 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50' : 'bg-zinc-850 border-white/5 text-slate-400 hover:bg-zinc-805'
          }`}
        >
          Löschen 🧹
        </button>

        <button
          onClick={handleVerifyClick}
          disabled={lives <= 0 || (difficulty === 'hard' && timerSeconds <= 0)}
          className="flex-1 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-400 text-white font-black text-[7.5px] uppercase transition-all shadow-md cursor-pointer text-center"
        >
          Überprüfen 🔍
        </button>
      </div>
    </div>
  );
};

export const EmotionsWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const moods = [
    { zone: "Rot 🔴", emoji: "😡", feel: "Wütend / Genervt", advise: "Ein Schluck kühles Wasser trinken, 3 Sekunden tief ausatmen. Alles wird gut! 🌬️", bg: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400", angle: -65 },
    { zone: "Gelb 🟡", emoji: "🤪", feel: "Voller Energie", advise: "Hummeln im Hintern? Schüttle deine Hände kräftig aus! 🐝", bg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400", angle: -30 },
    { zone: "Grün 🟢", emoji: "😊", feel: "Super / Bereit", advise: "Hellwach & ausgeglichen. Du bist bereit für neue Abenteuer! 🚀", bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400", angle: 0 },
    { zone: "Lila 🟣", emoji: "💭", feel: "Nachdenklich", advise: "Lausche deinen Gedanken. Male ein kleines Symbol auf dein Blatt! 🎨", bg: "bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400", angle: 30 },
    { zone: "Blau 🔵", emoji: "🥱", feel: "Müde / Schlapp", advise: "Zeit zum Aufladen. Lege kurz den Kopf ab oder strecke dich ganz lang! 🔋", bg: "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-400", angle: 65 }
  ];

  const [selectIdx, setSelectIdx] = useState(2); // Start at green "Super / Bereit"
  const [isMuted, setIsMuted] = useState(false);

  // Synthesize customized emotional tone sweeps
  const playEmotionSound = useCallback((idx: number) => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (idx === 0) {
        // Red (Wütend) - Comforting warm low-pass sweep down to ground
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (idx === 1) {
        // Yellow (Voller Energie) - Playful bubbling rising arpeggio
        const notes = [329.63, 392.00, 523.25, 659.25]; // E4, G4, C5, E5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);

          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);

          osc.connect(gain).connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.2);
        });
      } else if (idx === 2) {
        // Green (Super/Bereit) - Bright major chords arpeggio C-E-G-C
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.06);

          gain.gain.setValueAtTime(0, now + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.04, now + i * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.25);

          osc.connect(gain).connect(ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.3);
        });
      } else if (idx === 3) {
        // Purple (Nachdenklich) - High sparkling chime bells
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
      } else {
        // Blue (Müde/Schlapp) - Deep calming sub drone
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(110, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(111, now); // Gentle chorusing detune

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
      }
    } catch (e) {}
  }, [isMuted]);

  const activeMoodSelection = (idx: number) => {
    setSelectIdx(idx);
    playEmotionSound(idx);
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      
      {/* Header and sound controller */}
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
          Gefühls-Barometer 🌈
        </span>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`text-[7px] font-black px-1.5 py-0.2 rounded border transition-all ${
            isMuted 
              ? currentIsLight ? 'bg-slate-100 text-slate-400' : 'bg-zinc-800 text-zinc-500'
              : 'bg-indigo-500 text-white'
          }`}
        >
          {isMuted ? "🔇 Stumm" : "🔊 Sound"}
        </button>
      </div>

      {/* Barometer Gauge Section with physical needle arrow */}
      <div className="flex-grow flex items-center justify-center relative min-h-[55px] shrink-0">
        
        {/* Semi-circular dial background */}
        <div className="relative w-40 h-20 overflow-hidden flex items-end justify-center">
          <svg className="w-full h-full absolute top-0 left-0" viewBox="0 0 160 80">
            {/* Color arcs */}
            {/* Rot */}
            <path d="M 10 80 A 70 70 0 0 1 35 25" fill="none" stroke="#f87171" strokeWidth="10" strokeLinecap="round" />
            {/* Gelb */}
            <path d="M 35 25 A 70 70 0 0 1 65 12" fill="none" stroke="#fbbf24" strokeWidth="10" strokeLinecap="round" />
            {/* Grün */}
            <path d="M 65 12 A 70 70 0 0 1 95 12" fill="none" stroke="#34d399" strokeWidth="10" strokeLinecap="round" />
            {/* Lila */}
            <path d="M 95 12 A 70 70 0 0 1 125 25" fill="none" stroke="#c084fc" strokeWidth="10" strokeLinecap="round" />
            {/* Blau */}
            <path d="M 125 25 A 70 70 0 0 1 150 80" fill="none" stroke="#60a5fa" strokeWidth="10" strokeLinecap="round" />

            {/* Dial markers */}
            {moods.map((m, i) => {
              const rad = (m.angle * Math.PI) / 180;
              const x1 = 80 + 55 * Math.sin(rad);
              const y1 = 80 - 55 * Math.cos(rad);
              const x2 = 80 + 63 * Math.sin(rad);
              const y2 = 80 - 63 * Math.cos(rad);
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="opacity-70"
                />
              );
            })}

            {/* Inner Core Dial Base */}
            <circle cx="80" cy="80" r="12" fill={currentIsLight ? "#475569" : "#1e293b"} />
          </svg>

          {/* Dial Needle */}
          <motion.div 
            style={{ originX: 0.5, originY: 1 }}
            animate={{ rotate: moods[selectIdx].angle }}
            transition={{ type: "spring", stiffness: 120, damping: 14 }}
            className="absolute bottom-0 w-1.5 h-16 bg-gradient-to-t from-slate-600 to-rose-500 rounded-full flex justify-center shadow-md z-10"
          >
            {/* Needle tip pointer dot */}
            <div className="w-2.5 h-2.5 bg-rose-500 rounded-full border border-white absolute top-0 scale-90" />
          </motion.div>
        </div>
      </div>

      {/* Buttons Selection Grid */}
      <div className="grid grid-cols-5 gap-1.5 shrink-0 select-none">
        {moods.map((m, idx) => (
          <button
            key={idx}
            onClick={() => activeMoodSelection(idx)}
            className={`flex flex-col items-center justify-center p-1 rounded-xl border transition-all cursor-pointer ${
              selectIdx === idx 
                ? 'bg-indigo-50 dark:bg-zinc-800 border-indigo-500 border-[2px] shadow-sm scale-105' 
                : currentIsLight ? 'bg-white border-slate-150 hover:bg-slate-50' : 'bg-zinc-850 border-white/5 hover:bg-zinc-800'
            }`}
          >
            <span className="text-base leading-none">{m.emoji}</span>
            <span className="text-[5.5px] font-black mt-1 uppercase truncate max-w-full text-slate-500 dark:text-slate-400 leading-none">
              {m.zone.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Suggestion Activity Card */}
      <div className={`p-2 rounded-2xl border text-center flex-grow flex flex-col justify-center min-h-[50px] transition-all duration-300 ${moods[selectIdx].bg}`}>
        <h4 className="text-[7.5px] font-black uppercase tracking-wider leading-none">
          {moods[selectIdx].feel} • Unser Tipp:
        </h4>
        <p className="text-[7.5px] font-bold mt-1 px-1.5 leading-normal whitespace-pre-line text-slate-700 dark:text-slate-200">
          {moods[selectIdx].advise}
        </p>
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 30: UHRZEIT-MACHER (Analog Clocks)
// ==========================================
export const ClocksyncWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const challenges = [
    { text: "Stelle die Uhr auf 03:00 Uhr! 🕐", hour: 3, minute: 0 },
    { text: "Stelle die Uhr auf halb 5 (04:30 Uhr)! 🕣", hour: 4, minute: 30 },
    { text: "Stelle die Uhr auf Viertel vor 12 (11:45 Uhr)! 🕛", hour: 11, minute: 45 },
    { text: "Stelle die Uhr auf Goldene Pause (09:15 Uhr)! 🕘", hour: 9, minute: 15 },
    { text: "Stelle die Uhr auf 10 nach 10 (10:10 Uhr)! 🕙", hour: 10, minute: 10 }
  ];

  const [taskIdx, setTaskIdx] = useState(0);
  const [currentHour, setCurrentHour] = useState(12);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [showDigitalHint, setShowDigitalHint] = useState(false);

  const matched = currentHour === challenges[taskIdx].hour && currentMinute === challenges[taskIdx].minute;

  const playChimeOnMatch = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  const changeTime = (hChange: number, mChange: number) => {
    setCurrentHour((prev) => {
      const next = (prev + hChange + 11) % 12 + 1; // 1 to 12
      return next;
    });
    setCurrentMinute((prev) => {
      const next = (prev + mChange + 60) % 60;
      return next;
    });
  };

  // Click direct hour setting helper
  const handleHourSelection = (hourNum: number) => {
    setCurrentHour(hourNum);
  };

  useEffect(() => {
    if (matched) {
      playChimeOnMatch();
    }
  }, [matched]);

  const handleNextTask = () => {
    setTaskIdx((prev) => (prev + 1) % challenges.length);
    setCurrentHour(12);
    setCurrentMinute(0);
    setShowDigitalHint(false);
  };

  // SVG Calculations for hands angles
  const minAngle = (currentMinute / 60) * 360;
  const hourAngle = ((currentHour % 12) / 12) * 360 + (currentMinute / 60) * 30;

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
          🕰️ Uhrzeitmacher
        </span>
        <button
          onClick={() => setShowDigitalHint(!showDigitalHint)}
          className={`px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider transition-all border ${
            currentIsLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300' : 'bg-zinc-805 hover:bg-zinc-700 text-zinc-300 border-white/15'
          }`}
        >
          {showDigitalHint ? "📟 Verstecken" : "📟 Digitalhilfe"}
        </button>
      </div>

      <div className="flex-grow flex items-center justify-center p-0.5 relative">
        <div className="relative w-18 h-18 bg-white dark:bg-zinc-900 rounded-full border-2 border-slate-705 shadow-md flex items-center justify-center">
          
          {/* Hour interactive quick-click zones */}
          <div className="absolute inset-0 w-full h-full rounded-full pointer-events-auto">
            {/* Quick setting anchors: clicking on quadrants or dial numbers */}
            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hr) => {
              const angle = (hr / 12) * 2 * Math.PI - Math.PI / 2;
              const x = 50 + 38 * Math.cos(angle);
              const y = 50 + 38 * Math.sin(angle);
              return (
                <button
                  key={hr}
                  onClick={() => handleHourSelection(hr)}
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                  className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-black transition-all cursor-pointer ${
                    currentHour === hr 
                      ? 'bg-rose-500 text-white font-black scale-110 shadow shadow-rose-300'
                      : currentIsLight 
                        ? 'hover:bg-slate-100 text-slate-800' 
                        : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                  title={`${hr} Uhr`}
                >
                  {hr}
                </button>
              );
            })}
          </div>

          {/* SVG Clock Dial Hands display */}
          <svg className="w-full h-full p-1.5 pointer-events-none z-10" viewBox="0 0 100 100">
            {/* Hour markers background ticks */}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
              <line
                key={deg}
                x1="50" y1="12"
                x2="50" y2="15"
                stroke={currentIsLight ? "#94a3b8" : "#4b5563"}
                strokeWidth="1.5"
                style={{ transform: `rotate(${deg}deg)`, transformOrigin: '50% 50%' }}
              />
            ))}
            
            {/* Center origin */}
            <circle cx="50" cy="50" r="3" fill="#1e293b" />
            
            {/* Hour hand (red) */}
            <line 
              x1="50" y1="50" 
              x2="50" y2="30" 
              stroke="#ef4444" 
              strokeWidth="4" 
              strokeLinecap="round"
              style={{ transform: `rotate(${hourAngle}deg)`, transformOrigin: '50% 50%' }} 
            />
            
            {/* Minute hand (blue) */}
            <line 
              x1="50" y1="50" 
              x2="50" y2="20" 
              stroke="#3b82f6" 
              strokeWidth="2.8" 
              strokeLinecap="round"
              style={{ transform: `rotate(${minAngle}deg)`, transformOrigin: '50% 50%' }} 
            />
          </svg>
        </div>
      </div>

      <div className={`p-1.5 rounded-xl border text-center shadow-inner ${
        matched 
          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-extrabold pr-3' 
          : currentIsLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-850/50 border-white/5'
      }`}>
        <p className="text-[7.5px] uppercase font-bold leading-normal">
          {matched ? "Super! Genau richtig! 🎉" : challenges[taskIdx].text}
        </p>
        
        {showDigitalHint && (
          <p className="text-[8px] font-mono mt-0.5 tracking-wider text-rose-500 font-extrabold animate-pulse">
            Eingestellt: {currentHour.toString().padStart(2, '0')}:{currentMinute.toString().padStart(2, '0')} Uhr
          </p>
        )}
      </div>

      {/* Adjust buttons */}
      <div className="shrink-0 flex gap-0.5">
        <button
          onClick={() => changeTime(-1, 0)}
          className={`flex-1 py-1 rounded-lg text-[6.5px] font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-805 border cursor-pointer border-slate-200 dark:border-white/5`}
        >
          H-1
        </button>
        <button
          onClick={() => changeTime(1, 0)}
          className={`flex-1 py-1 rounded-lg text-[6.5px] font-black uppercase text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-805 border cursor-pointer border-slate-200 dark:border-white/5`}
        >
          H+1
        </button>
        <button
          onClick={() => changeTime(0, -5)}
          className={`flex-1 py-1 rounded-lg text-[6.5px] font-black uppercase text-indigo-500 hover:bg-slate-100 dark:hover:bg-zinc-805 border cursor-pointer border-slate-200 dark:border-white/5`}
        >
          M-5
        </button>
        <button
          onClick={() => changeTime(0, 5)}
          className={`flex-1 py-1 rounded-lg text-[6.5px] font-black uppercase text-indigo-500 hover:bg-slate-100 dark:hover:bg-zinc-805 border cursor-pointer border-slate-200 dark:border-white/5`}
        >
          M+5
        </button>
      </div>

      {matched && (
        <button
          onClick={handleNextTask}
          className="w-full py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[7.5px] uppercase transition-all shadow-md cursor-pointer shrink-0 animate-bounce"
        >
          Nächste Uhr 🤩
        </button>
      )}
    </div>
  );
};

// ==========================================
// NEW WIDGET 22: KLANG-MEMORY (Sound Memory)
// ==========================================
export const SoundmemoryWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [difficulty, setDifficulty] = useState<4 | 6 | 8 | 12 | 16>(6);
  const [cards, setCards] = useState<{ id: number; freq: number; flipped: boolean; matched: boolean }[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [win, setWin] = useState(false);
  const [instrument, setInstrument] = useState<'xylophone' | 'piano' | 'flute' | 'guitar' | 'retro'>('xylophone');

  // Pure pentatonic/C-major musical frequencies for ears stimulation
  const getFrequenciesForDifficulty = (diff: number) => {
    const list = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      349.23, // F4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      698.46  // F5
    ];
    return list.slice(0, diff / 2);
  };

  const playFrequency = (freq: number, instType: string = instrument) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      if (instType === "piano") {
        // Klavier (Piano): Blend of triangle (fundamental) & sine (overtone) with exponential decay
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.005);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        const osc1 = ctx.createOscillator();
        osc1.type = "triangle";
        osc1.frequency.setValueAtTime(freq, now);

        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * 2, now);
        
        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.04, now);

        osc1.connect(gainNode);
        osc2.connect(gain2);
        gain2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.3);
        osc2.stop(now + 1.3);
      } else if (instType === "flute") {
        // Flöte (Flute): Soft attack/release, pure sine wave with gentle 6Hz LFO vibrato
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);

        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(6, now); // 6 Hz vibrato
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(4, now); // vibrato depth
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.08); // soft attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85); // soft release

        osc.connect(gain);
        gain.connect(ctx.destination);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.9);
        osc.stop(now + 0.9);
      } else if (instType === "guitar") {
        // Gitarre (Guitar): Low-pass swept triangle wave for string pluck simulation
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.Q.setValueAtTime(1, now);
        filter.frequency.setValueAtTime(1800, now);
        filter.frequency.exponentialRampToValueAtTime(180, now + 0.7);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.95);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.0);
      } else if (instType === "retro") {
        // Retro (8-Bit Sound): Classic arcade square wave, immediate attack, short envelope
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      } else {
        // Xylophon (Xylophone) - default: Metallic high overtone strike + sine wave fundamental
        const osc1 = ctx.createOscillator();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(freq, now);
        const gain1 = ctx.createGain();
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.15, now + 0.002);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        const osc2 = ctx.createOscillator();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(freq * 3, now); // high overtone
        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0, now);
        gain2.gain.linearRampToValueAtTime(0.08, now + 0.002);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08); // decays instantly
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
      }
    } catch (e) {}
  };

  const setupGame = (currentDiff: number = difficulty) => {
    const freqsToUse = getFrequenciesForDifficulty(currentDiff);
    const list = [...freqsToUse, ...freqsToUse];
    const shuffled = list
      .map((freq, idx) => ({ id: idx, freq, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setSelected([]);
    setWin(false);
  };

  useEffect(() => {
    setupGame();
  }, [difficulty]);

  const handleCardClick = (id: number, freq: number) => {
    if (selected.length === 2 || win) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;

    playFrequency(freq);

    const updated = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    setCards(updated);

    const nextSelected = [...selected, id];
    setSelected(nextSelected);

    if (nextSelected.length === 2) {
      const [firstId, secondId] = nextSelected;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);

      if (firstCard && secondCard) {
        if (firstCard.freq === secondCard.freq) {
          setTimeout(() => {
            setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, matched: true, flipped: false } : c));
            setSelected([]);
            
            // Success celebrate jingle (with selected instrument!)
            playFrequency(659.25, instrument); // E5
          }, 500);
        } else {
          setTimeout(() => {
            setCards(prev => prev.map(c => (c.id === firstId || c.id === secondId) ? { ...c, flipped: false } : c));
            setSelected([]);
          }, 1100);
        }
      }
    }
  };

  useEffect(() => {
    if (cards.length > 0 && cards.every(c => c.matched)) {
      setWin(true);
    }
  }, [cards]);

  const getInstrumentIcon = (instType: string) => {
    switch (instType) {
      case 'piano': return '🎹';
      case 'flute': return '💨';
      case 'guitar': return '🎸';
      case 'retro': return '👾';
      default: return '🪵';
    }
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      {/* Top Header Row */}
      <div className="flex justify-between items-center px-1 shrink-0 flex-wrap gap-1">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-400'}`}>
          🎵 Klang-Memory
        </span>
        
        {/* Memory Grid cards configuration links */}
        <div className="flex bg-slate-100 dark:bg-zinc-805 bg-zinc-805 p-0.5 rounded-lg border border-slate-300/10 text-[6px] font-black shrink-0">
          {([4, 6, 8, 12, 16] as const).map((count) => (
            <button
               key={count}
               onClick={() => setDifficulty(count)}
               className={`px-1 py-0.5 rounded cursor-pointer transition-all ${
                 difficulty === count ? 'bg-indigo-500 text-white font-extrabold' : 'text-slate-500 dark:text-neutral-300'
               }`}
            >
              {count}
            </button>
          ))}
        </div>

        <button
          onClick={() => setupGame()}
          className={`px-1 py-0.5 rounded text-[6.5px] font-black uppercase cursor-pointer transition-all border ${
            currentIsLight 
              ? 'bg-white hover:bg-slate-100 text-slate-755 border-slate-300' 
              : 'bg-zinc-800 hover:bg-zinc-700 text-neutral-200 border-zinc-700'
          }`}
        >
          Mischen 🔁
        </button>
      </div>

      {/* Instrument Selection Row */}
      <div className={`flex justify-center gap-1 p-1 rounded-xl border ${
        currentIsLight 
          ? 'bg-slate-50 border-slate-200/50' 
          : 'bg-zinc-900/60 border-zinc-800/60'
      } shrink-0`}>
        {([
          { id: 'xylophone', label: 'Xylophon', icon: '🪵' },
          { id: 'piano', label: 'Klavier', icon: '🎹' },
          { id: 'flute', label: 'Flöte', icon: '💨' },
          { id: 'guitar', label: 'Gitarre', icon: '🎸' },
          { id: 'retro', label: 'Retro', icon: '👾' }
        ] as const).map((inst) => (
          <button
            key={inst.id}
            onClick={() => {
              setInstrument(inst.id);
              playFrequency(349.23, inst.id); // Play trial F4 tone
            }}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[7px] font-extrabold uppercase transition-all cursor-pointer ${
              instrument === inst.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : currentIsLight
                  ? 'hover:bg-slate-200/50 text-slate-600'
                  : 'hover:bg-zinc-800/50 text-slate-350'
            }`}
            title={`Instrument wechseln zu ${inst.label}`}
          >
            <span className="text-xs">{inst.icon}</span>
            <span className="hidden sm:inline">{inst.label}</span>
          </button>
        ))}
      </div>

      {/* Game Grid area */}
      <div className="flex-grow flex flex-col justify-center items-center px-1 py-1 min-h-0">
        {win ? (
          <div className="text-center animate-fade-in p-2">
            <span className="text-2xl block mb-1">🎉 🥳 🏆</span>
            <p className="text-[10px] font-extrabold text-emerald-500 uppercase tracking-wider">Super Gehört!</p>
            <p className="text-[7.5px] text-slate-400 mt-0.5">Alle Klangpaare erfolgreich erkannt.</p>
          </div>
        ) : (
          <div className={`grid gap-1 w-full max-w-[210px] ${
            difficulty <= 6 
              ? 'grid-cols-3' 
              : 'grid-cols-4'
          }`}>
            {cards.map((card) => {
              const isRevealed = card.flipped || card.matched;
              return (
                <button
                  key={card.id}
                  onClick={() => handleCardClick(card.id, card.freq)}
                  disabled={card.matched}
                  className={`aspect-square rounded-lg border flex items-center justify-center text-xs transition-all transform duration-300 cursor-pointer ${
                    card.matched 
                      ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500 scale-95' 
                      : isRevealed
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-500 font-bold scale-105 shadow'
                        : currentIsLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                          : 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-slate-450'
                  }`}
                >
                  {card.matched ? "✓" : isRevealed ? getInstrumentIcon(instrument) : "❓"}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 23: WORT-DETEKTIV (Spelling Detective -> Lernwörter-Studio)
// ==========================================
export const SpellingdetectiveWidgetContent: React.FC<{ widget: any, currentIsLight: boolean, onUpdate?: (updates: any) => void }> = ({ widget, currentIsLight, onUpdate }) => {
  const { app, setApp } = useApp();
  return (
    <LernwoerterStudioWidget
      widget={widget}
      onUpdate={onUpdate}
      app={app}
      setApp={setApp}
      currentIsLight={currentIsLight}
      defaultMode="spelling"
    />
  );
};

// ==========================================
// NEW WIDGET 24: ZAHLENGERADE-SCHÄTZER (Number Line Estimator)
// ==========================================
// ==========================================
// NEW WIDGET 24: ZAHLENGERADE-SCHÄTZER (Number Line Estimator)
// ==========================================
export const NumberlineWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  // Preset list for quick access
  const rangePresets = [
    { label: "0 - 100", min: 0, max: 100 },
    { label: "0 - 1000", min: 0, max: 1000 },
    { label: "100 - 500", min: 100, max: 500 },
    { label: "200 - 1000", min: 200, max: 1000 },
    { label: "-50 - 50", min: -50, max: 50 },
    { label: "-100 - 100", min: -100, max: 100 }
  ];

  const [presetIdx, setPresetIdx] = useState<number>(0);
  const [customMin, setCustomMin] = useState<number>(0);
  const [customMax, setCustomMax] = useState<number>(100);
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);

  const [target, setTarget] = useState(0);
  const [guess, setGuess] = useState(50);
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<{ feedback: string; diff: number; stars: number } | null>(null);

  const activeMin = isCustomRange ? customMin : rangePresets[presetIdx].min;
  const activeMax = isCustomRange ? customMax : rangePresets[presetIdx].max;

  const initGame = () => {
    const rangeSpan = activeMax - activeMin;
    // Generate target, ensuring it is within min and max, and not too close to boundaries
    const offset = Math.floor(Math.random() * (rangeSpan - 10)) + 5;
    setTarget(activeMin + offset);
    setGuess(activeMin + Math.floor(rangeSpan / 2));
    setChecked(false);
    setResult(null);
  };

  useEffect(() => {
    initGame();
  }, [presetIdx, customMin, customMax, isCustomRange]);

  const handleCheck = () => {
    const diff = Math.abs(guess - target);
    const rangeSpan = activeMax - activeMin;
    const diffPct = (diff / rangeSpan) * 100;

    let feedback = "";
    let stars = 0;

    if (diff === 0) {
      feedback = "Auf den Punkt getroffen! Goldstern! 🤩🏆";
      stars = 3;
    } else if (diffPct <= 2.5) {
      feedback = "Genial geschätzt! Fast perfekt! ⭐⭐";
      stars = 2;
    } else if (diffPct <= 6) {
      feedback = "Sehr gut geschätzt! Ziemlich nah dran! ⭐";
      stars = 1;
    } else {
      feedback = "Guter Versuch! Übung macht den Meister.";
      stars = 0;
    }

    setResult({ feedback, diff, stars });
    setChecked(true);

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(stars > 0 ? 523.25 : 200, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  };

  // Helper to map a value to percent location on line
  const getPct = (val: number) => {
    const rangeSpan = activeMax - activeMin;
    if (rangeSpan === 0) return 0;
    return ((val - activeMin) / rangeSpan) * 100;
  };

  return (
    <div className="flex flex-col h-full w-full p-2 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden gap-1">
      {/* Header and target indicator */}
      <div className="shrink-0 flex justify-between items-center px-1">
        <div className="flex flex-col">
          <span className={`text-[8.5px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
            📍 Zahlenstrahl-Schätzer
          </span>
          <span className="text-[6.5px] opacity-65">Finde die Position der gesuchten Zahl</span>
        </div>
        <span className="text-[9.5px] font-black text-indigo-500 animate-pulse bg-indigo-500/10 px-1.5 py-0.5 rounded shrink-0">
          Finde die {target}!
        </span>
      </div>

      {/* Preset & custom range configuration panel */}
      <div className={`p-1.5 rounded-xl border shrink-0 ${currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-850/40 border-white/5'}`}>
        <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400 mb-1">
          <span>Zahlenraum / Startwert wählen:</span>
          <button 
            onClick={() => setIsCustomRange(!isCustomRange)} 
            className="text-[6.5px] text-indigo-500 hover:underline font-black uppercase cursor-pointer"
          >
            {isCustomRange ? "Standard-Bereiche" : "Eigener Bereich ⚙️"}
          </button>
        </div>

        {!isCustomRange ? (
          <div className="grid grid-cols-6 gap-0.5">
            {rangePresets.map((preset, idx) => (
              <button
                key={idx}
                disabled={checked}
                onClick={() => setPresetIdx(idx)}
                className={`py-0.5 px-0.5 text-[6.5px] font-black rounded border cursor-pointer transition-all ${
                  presetIdx === idx && !isCustomRange
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : currentIsLight
                      ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                      : 'bg-zinc-900 border-zinc-700/65 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 items-center justify-center">
            <div className="flex items-center gap-1">
              <span className="text-[6.5px] font-bold text-slate-400">Start:</span>
              <input 
                type="number"
                value={customMin}
                disabled={checked}
                onChange={(e) => setCustomMin(parseInt(e.target.value) || 0)}
                className={`w-9 px-1 text-center font-bold text-[8px] rounded border ${currentIsLight ? 'bg-white text-slate-700' : 'bg-zinc-950 text-white border-zinc-750'}`}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[6.5px] font-bold text-slate-400">Ende:</span>
              <input 
                type="number"
                value={customMax}
                disabled={checked}
                onChange={(e) => setCustomMax(Math.max(customMin + 10, parseInt(e.target.value) || (customMin + 100)))}
                className={`w-10 px-1 text-center font-bold text-[8px] rounded border ${currentIsLight ? 'bg-white text-slate-700' : 'bg-zinc-950 text-white border-zinc-750'}`}
              />
            </div>
          </div>
        )}
      </div>

      {/* Main visual number line area */}
      <div className="flex-grow flex flex-col justify-center items-center px-1">
        <div className="w-full relative py-5 flex flex-col items-center">
          
          {/* Spatial slider progress line - MUCH THICKER now (h-3 instead of h-1) */}
          <div className="w-full h-3.5 bg-slate-200 dark:bg-zinc-800 rounded-full relative shadow-inner overflow-visible border border-slate-350 dark:border-zinc-700">
            {/* Color-coded range gradient track */}
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500/20 via-indigo-500/40 to-indigo-500/20 rounded-full w-full pointer-events-none" />

            {/* Scale Tick Marks & Labels */}
            <div className="absolute -top-4 left-0 flex flex-col items-center">
              <div className="w-0.5 h-1 bg-slate-400 dark:bg-zinc-600 mb-0.5" />
              <span className="text-[7.5px] font-mono font-black text-slate-500 dark:text-zinc-400">{activeMin}</span>
            </div>
            
            <div className="absolute -top-4 left-[50%] transform -translate-x-1/2 flex flex-col items-center">
              <div className="w-0.5 h-1 bg-slate-400 dark:bg-zinc-600 mb-0.5" />
              <span className="text-[7.5px] font-mono font-black text-slate-400 dark:text-zinc-500">{activeMin + Math.round((activeMax - activeMin) / 2)}</span>
            </div>
            
            <div className="absolute -top-4 right-0 flex flex-col items-center">
              <div className="w-0.5 h-1 bg-slate-400 dark:bg-zinc-600 mb-0.5" />
              <span className="text-[7.5px] font-mono font-black text-slate-500 dark:text-zinc-400">{activeMax}</span>
            </div>

            {/* Target pin revealed upon submission */}
            {checked && (
              <div 
                className="absolute -top-5 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white font-black transform -translate-x-1/2 transition-all duration-700 animate-bounce shadow-md z-10"
                style={{ left: `${getPct(target)}%` }}
                title={`Ziel: ${target}`}
              >
                🎯
              </div>
            )}

            {/* Visual indicator of tip placement before checking */}
            <div 
              className={`absolute top-[-3px] w-4 h-4 rounded-full border-2 border-indigo-500 shadow-sm transform -translate-x-1/2 transition-all duration-200 pointer-events-none ${
                checked ? 'bg-amber-500 border-amber-500' : 'bg-white dark:bg-zinc-950'
              }`}
              style={{ left: `${getPct(guess)}%` }}
            />
          </div>

          <input
            type="range"
            min={activeMin}
            max={activeMax}
            value={guess}
            disabled={checked}
            onChange={(e) => setGuess(parseInt(e.target.value))}
            className="w-full h-8 opacity-95 accent-indigo-500 cursor-pointer mt-1"
          />

          <div className="text-center font-black mt-1">
            <span className="text-[7px] font-black uppercase text-slate-400 block">Dein Tipp:</span>
            <span className="text-sm font-black text-indigo-500 tracking-tight leading-none mt-0.5">
              {checked ? guess : "???"}
            </span>
          </div>
        </div>

        {checked && result && (
          <div className="text-center p-1 bg-indigo-500/5 rounded-xl border border-indigo-500/10 animate-fade-in w-full">
            <p className="text-[8.5px] font-black uppercase text-indigo-500 tracking-tight">{result.feedback}</p>
            <p className="text-[7.5px] text-slate-400 mt-0.5">
              Ziel: <span className="font-bold text-slate-700 dark:text-white">{target}</span> | Abweichung: <span className="font-black text-red-500">±{result.diff}</span>
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-1 mt-1">
        {checked ? (
          <button
            onClick={initGame}
            className="w-full py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wide transition-all shadow cursor-pointer text-center"
          >
            Nächste Zahl ➔
          </button>
        ) : (
          <button
            onClick={handleCheck}
            className="w-full py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[8px] uppercase tracking-wide transition-all shadow cursor-pointer text-center animate-pulse"
          >
            Schätzung prüfen ⭐
          </button>
        )}
      </div>
    </div>
  );
};

// ==========================================
// NEW WIDGET 25: RECHEN-SCHLANGE (Math Chain)
// ==========================================
export const MathchainWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [chainText, setChainText] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [choices, setChoices] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const initChain = (diff = difficulty) => {
    let text = "";
    let finalVal = 0;

    if (diff === 'easy') {
      // 3 simple addition/subtraction steps
      const startVal = Math.floor(Math.random() * 10) + 1; // 1 to 10
      const op1Add = Math.floor(Math.random() * 8) + 1; // + 1 to 8
      const op2Minus = Math.floor(Math.random() * Math.min(startVal + op1Add - 1, 5)) + 1; // ensure no negative
      const op3Add = Math.floor(Math.random() * 6) + 1; // + 1 to 6

      finalVal = startVal + op1Add - op2Minus + op3Add;
      text = `Starte mit ${startVal} ➔ addiere ${op1Add} ➔ subtrahiere ${op2Minus} ➔ addiere ${op3Add}`;
    } else if (diff === 'medium') {
      // 3 mixed steps including a multiplier
      const startVal = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const op1 = Math.floor(Math.random() * 5) + 2; // + 2 to 6
      const op2Multiplier = Math.floor(Math.random() * 2) + 2; // x 2 or 3
      const op3Minus = Math.floor(Math.random() * 4) + 1; // - 1 to 4

      finalVal = (startVal + op1) * op2Multiplier - op3Minus;
      text = `Starte mit ${startVal} ➔ addiere ${op1} ➔ multipliziere mit ${op2Multiplier} ➔ subtrahiere ${op3Minus}`;
    } else {
      // 4 advanced steps including division and larger numbers
      // We choose starting values and operations so that division results in an integer
      const multiplier = Math.floor(Math.random() * 4) + 2; // 2 to 5
      const divisionStepResult = Math.floor(Math.random() * 8) + 2; // 2 to 9
      const intermediateSum = divisionStepResult * multiplier; // this is the sum that will be divided
      
      const startVal = Math.floor(Math.random() * 15) + 5; // 5 to 19
      const op1Add = intermediateSum - startVal; // make sure start + op1Add = intermediateSum

      const op3Mult = Math.floor(Math.random() * 3) + 3; // x 3 to 5
      const op4Add = Math.floor(Math.random() * 12) + 5; // + 5 to 16

      finalVal = divisionStepResult * op3Mult + op4Add;
      text = `Starte mit ${startVal} ➔ addiere ${op1Add} ➔ dividiere durch ${multiplier} ➔ multipliziere mit ${op3Mult} ➔ addiere ${op4Add}`;
    }

    setChainText(text);
    setCorrectAnswer(finalVal);

    // Generate incorrect answers around the value
    const uniqueChoices = new Set([finalVal]);
    while (uniqueChoices.size < 3) {
      const offset = (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 5) + 1);
      const fake = finalVal + offset;
      if (fake > 0) uniqueChoices.add(fake);
    }
    setChoices(Array.from(uniqueChoices).sort(() => Math.random() - 0.5));
    setSelected(null);
    setChecked(false);
  };

  useEffect(() => {
    initChain();
  }, [difficulty]);

  const handleChoice = (val: number) => {
    if (checked) return;
    setSelected(val);
    setChecked(true);

    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(val === correctAnswer ? 587.33 : 150, ctx.currentTime); // D5 or buzzer
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
          🐍 Mathematik-Schlange
        </span>
        <div className="flex gap-0.5 bg-slate-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
          <button
            onClick={() => setDifficulty('easy')}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black cursor-pointer transition-colors ${
              difficulty === 'easy'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Einfach
          </button>
          <button
            onClick={() => setDifficulty('medium')}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black cursor-pointer transition-colors ${
              difficulty === 'medium'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Mittel
          </button>
          <button
            onClick={() => setDifficulty('hard')}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black cursor-pointer transition-colors ${
              difficulty === 'hard'
                ? 'bg-indigo-500 text-white'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Schwer
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center px-1 text-center">
        <div className="bg-indigo-500/5 px-2.5 py-2.5 rounded-xl border border-indigo-500/10 mb-2 w-full">
          <p className="text-[9.5px] leading-relaxed font-bold tracking-tight text-indigo-500">
            {chainText}
          </p>
        </div>

        <div className="flex gap-1.5 justify-center w-full mb-1">
          {choices.map((choice, idx) => {
            const isSelected = selected === choice;
            const isCorrect = choice === correctAnswer;
            return (
              <button
                key={idx}
                onClick={() => handleChoice(choice)}
                disabled={checked}
                className={`flex-1 py-1.5 rounded-xl border font-bold text-xs cursor-pointer transition-all transform hover:scale-105 ${
                  checked
                    ? isCorrect
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md font-black ring-2 ring-emerald-300'
                      : isSelected
                        ? 'bg-red-500 border-red-500 text-white shadow shadow-red-200'
                        : currentIsLight
                          ? 'bg-slate-50 opacity-40 border-slate-200 text-slate-500'
                          : 'bg-zinc-900 opacity-30 border-zinc-800 text-zinc-500'
                    : currentIsLight
                      ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 shadow-sm'
                      : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-neutral-200 shadow shadow-black/80'
                }`}
              >
                {choice}
              </button>
            );
          })}
        </div>

        {checked && (
          <div className="text-center p-1 bg-indigo-500/5 rounded border border-indigo-500/10 mt-1 animate-fade-in w-full">
            <p className="text-[8px] font-black uppercase text-slate-400">
              {selected === correctAnswer ? "Richtig gelöst! 🎉" : `Leider falsch, das Ergebnis war ${correctAnswer}`}
            </p>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-1">
        <button
          onClick={() => initChain()}
          className="w-full py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[7.5px] uppercase transition-all shadow cursor-pointer text-center"
        >
          Nächste Schlange ➔
        </button>
      </div>
    </div>
  );
};

// ==========================================
// WIDGET: ZIEL-THERMOMETER (Migriert & konsolidiert auf Klassenglas-Daten mit Thermometer-Stil)
// ==========================================
export const ThermometerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ widget, currentIsLight }) => {
  const { app, setApp } = useApp();
  return (
    <ClassRewardWidget
      app={app}
      setApp={setApp}
      widget={{
        ...widget,
        settings: {
          style: 'thermometer',
          ...(widget?.settings || {}),
        },
      }}
      currentIsLight={currentIsLight}
    />
  );
};

// ==========================================
// WIDGET 27: WORT- & SATZWERKSTATT (Legacy Compoundsplit)
// ==========================================
export const CompoundsplitWidgetContent: React.FC<{
  widget?: any;
  currentIsLight?: boolean;
  onUpdate?: (updates: any) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight = true,
  onUpdate,
  isFullscreen,
  showSettings,
  onCloseSettings,
}) => {
  return (
    <WortSatzWerkstattWidget
      widget={widget}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
      isFullscreen={isFullscreen}
      defaultMode="compound"
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};

// ==========================================
// NEW WIDGET 28: GERÄUSCHE-QUIZ (Synthesizer Sound Ear Training)
// ==========================================
export const SoundquizWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  return null;
};
// ==========================================
// NEW WIDGET 29: KOPFRECHEN-DUELL (2-Player Local Math Duel)
// ==========================================
export const MathduelWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [operatorFilter, setOperatorFilter] = useState<'mixed' | 'plus' | 'minus' | 'multiply' | 'divide'>('mixed');

  const [eq, setEq] = useState("3 + 4");
  const [ans, setAns] = useState(7);
  const [options, setOptions] = useState<number[]>([]);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

  const generateDuellEq = (diff = difficulty, opF = operatorFilter) => {
    // Choose which operation to run
    let op = opF;
    if (opF === 'mixed') {
      const ops: Array<'plus' | 'minus' | 'multiply' | 'divide'> = ['plus', 'minus', 'multiply', 'divide'];
      op = ops[Math.floor(Math.random() * ops.length)];
    }

    let n1 = 0, n2 = 0, text = "", correct = 0;

    if (diff === 'easy') {
      if (op === 'plus') {
        n1 = Math.floor(Math.random() * 9) + 1; // 1 to 9
        n2 = Math.floor(Math.random() * 9) + 1; // 1 to 9
        text = `${n1} + ${n2}`;
        correct = n1 + n2;
      } else if (op === 'minus') {
        n1 = Math.floor(Math.random() * 8) + 3; // 3 to 10
        n2 = Math.floor(Math.random() * (n1 - 1)) + 1; // n2 < n1 to avoid negatives
        text = `${n1} - ${n2}`;
        correct = n1 - n2;
      } else if (op === 'multiply') {
        n1 = Math.floor(Math.random() * 5) + 1; // 1 to 5
        n2 = Math.floor(Math.random() * 5) + 1; // 1 to 5
        text = `${n1} x ${n2}`;
        correct = n1 * n2;
      } else { // divide
        n2 = Math.floor(Math.random() * 4) + 1; // divisor: 1 to 4
        correct = Math.floor(Math.random() * 4) + 1; // quotient: 1 to 4
        n1 = correct * n2; // dividend
        text = `${n1} : ${n2}`;
      }
    } else if (diff === 'medium') {
      if (op === 'plus') {
        n1 = Math.floor(Math.random() * 45) + 5; // 5 to 50
        n2 = Math.floor(Math.random() * 45) + 5; // 5 to 50
        text = `${n1} + ${n2}`;
        correct = n1 + n2;
      } else if (op === 'minus') {
        n1 = Math.floor(Math.random() * 80) + 20; // 20 to 100
        n2 = Math.floor(Math.random() * (n1 - 5)) + 3; // n2 < n1
        text = `${n1} - ${n2}`;
        correct = n1 - n2;
      } else if (op === 'multiply') {
        n1 = Math.floor(Math.random() * 8) + 2; // 2 to 9
        n2 = Math.floor(Math.random() * 8) + 2; // 2 to 9
        text = `${n1} x ${n2}`;
        correct = n1 * n2;
      } else { // divide
        n2 = Math.floor(Math.random() * 8) + 2; // divisor: 2 to 9
        correct = Math.floor(Math.random() * 9) + 2; // quotient: 2 to 10
        n1 = correct * n2;
        text = `${n1} : ${n2}`;
      }
    } else { // hard
      if (op === 'plus') {
        n1 = Math.floor(Math.random() * 300) + 50; // 50 to 350
        n2 = Math.floor(Math.random() * 300) + 50; // 50 to 350
        text = `${n1} + ${n2}`;
        correct = n1 + n2;
      } else if (op === 'minus') {
        n1 = Math.floor(Math.random() * 600) + 200; // 200 to 800
        n2 = Math.floor(Math.random() * (n1 - 50)) + 20;
        text = `${n1} - ${n2}`;
        correct = n1 - n2;
      } else if (op === 'multiply') {
        n1 = Math.floor(Math.random() * 15) + 5; // 5 to 19
        n2 = Math.floor(Math.random() * 12) + 4; // 4 to 15
        text = `${n1} x ${n2}`;
        correct = n1 * n2;
      } else { // divide
        n2 = Math.floor(Math.random() * 12) + 3; // divisor: 3 to 14
        correct = Math.floor(Math.random() * 18) + 5; // quotient: 5 to 22
        n1 = correct * n2;
        text = `${n1} : ${n2}`;
      }
    }

    setEq(text);
    setAns(correct);

    const fakes = new Set([correct]);
    const maxOffset = diff === 'easy' ? 4 : diff === 'medium' ? 12 : 35;
    while (fakes.size < 3) {
      const diffOffset = (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * maxOffset) + 1);
      const fakeVal = correct + diffOffset;
      if (fakeVal > 0) fakes.add(fakeVal);
    }
    setOptions(Array.from(fakes).sort(() => Math.random() - 0.5));
  };

  useEffect(() => {
    generateDuellEq(difficulty, operatorFilter);
  }, [difficulty, operatorFilter]);

  const handleTap = (player: 1 | 2, tappedVal: number) => {
    if (winner) return;

    if (tappedVal === ans) {
      // Correct!
      if (player === 1) {
        const nextScore = score1 + 1;
        setScore1(nextScore);
        if (nextScore >= 5) {
          setWinner("Spieler 1 (Grün) 🌟");
        }
      } else {
        const nextScore = score2 + 1;
        setScore2(nextScore);
        if (nextScore >= 5) {
          setWinner("Spieler 2 (Blau) 🌟");
        }
      }

      // Success pitch
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(659.25, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.155);
      } catch (e) {}

      if (score1 + 1 < 5 && score2 + 1 < 5) {
        generateDuellEq(difficulty, operatorFilter);
      }
    } else {
      // Punish with subtraction or a beep
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } catch (e) {}
    }
  };

  const resetDuell = () => {
    setScore1(0);
    setScore2(0);
    setWinner(null);
    generateDuellEq(difficulty, operatorFilter);
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      {/* Settings control bar */}
      <div className={`p-1 rounded-xl border shrink-0 flex flex-col gap-1 ${currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-850/40 border-white/5'}`}>
        <div className="flex justify-between items-center px-1">
          <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
            ⚔️ Rechen-Duell
          </span>
          <button
            onClick={resetDuell}
            className={`px-1.5 py-0.5 rounded text-[6px] font-black uppercase cursor-pointer transition-all border ${
              currentIsLight ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700' : 'bg-zinc-850 hover:bg-zinc-850 border-zinc-700 text-neutral-300'
            }`}
          >
            Reset
          </button>
        </div>

        {/* Options Row 1: Difficulty */}
        <div className="flex justify-between items-center text-[7px] font-black px-1">
          <span className="text-slate-400">Level:</span>
          <div className="flex gap-0.5">
            {(['easy', 'medium', 'hard'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDifficulty(lvl)}
                className={`px-1.5 py-0.5 rounded text-[6.5px] font-bold cursor-pointer transition-colors ${
                  difficulty === lvl
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {lvl === 'easy' ? 'Einfach' : lvl === 'medium' ? 'Mittel' : 'Schwer'}
              </button>
            ))}
          </div>
        </div>

        {/* Options Row 2: Operator selection */}
        <div className="flex justify-between items-center text-[7px] font-black px-1">
          <span className="text-slate-400">Rechnen:</span>
          <div className="flex gap-0.5">
            {(['mixed', 'plus', 'minus', 'multiply', 'divide'] as const).map((op) => (
              <button
                key={op}
                onClick={() => setOperatorFilter(op)}
                className={`px-1 py-0.5 rounded text-[6.5px] font-bold cursor-pointer transition-colors ${
                  operatorFilter === op
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {op === 'mixed' ? '±×÷' : op === 'plus' ? '+' : op === 'minus' ? '-' : op === 'multiply' ? '×' : '÷'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {winner ? (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-2 animate-bounce">
          <span className="text-3xl block">🏆 👑</span>
          <p className="text-xs font-black uppercase text-amber-500 tracking-tight mt-1">SIEG!</p>
          <p className="text-[10px] font-extrabold text-indigo-500">{winner}</p>
          <button
            onClick={resetDuell}
            className="mt-2 px-3 py-1 bg-indigo-500 text-white font-bold rounded-lg text-[9px] hover:bg-indigo-600 transition-all cursor-pointer shadow-md"
          >
            Nochmal spielen! 🤝
          </button>
        </div>
      ) : (
        <div className="flex-grow flex items-stretch divide-x divide-slate-300 dark:divide-zinc-700 min-h-0 gap-2">
          {/* Player 1 Left (Emerald theme) */}
          <div className="flex-1 flex flex-col justify-between items-center text-center p-1 bg-emerald-500/5 rounded-xl border border-emerald-500/10 min-h-0">
            <div className="shrink-0">
              <span className="text-[7.5px] font-black uppercase tracking-wider text-emerald-500">Spieler 1</span>
              <p className="text-base font-extrabold text-emerald-600 leading-none mt-0.5">{score1} Pt.</p>
            </div>

            <div className="flex-grow flex flex-col justify-center w-full my-1.5 min-h-0">
              <p className="text-xs font-bold mb-1 opacity-70">Lösung für:</p>
              <p className="text-sm font-black text-slate-800 dark:text-white leading-normal underline decoration-emerald-400 decoration-2 mb-1.5">{eq}</p>

              <div className="flex flex-col gap-1 w-full shrink-0">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleTap(1, opt)}
                    className="py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[9.5px] cursor-pointer shadow-sm transform hover:scale-102 transition-all leading-none"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player 2 Right (Sky theme) */}
          <div className="flex-1 flex flex-col justify-between items-center text-center p-1 bg-sky-500/5 rounded-xl border border-sky-500/10 min-h-0">
            <div className="shrink-0">
              <span className="text-[7.5px] font-black uppercase tracking-wider text-sky-500">Spieler 2</span>
              <p className="text-base font-extrabold text-sky-600 leading-none mt-0.5">{score2} Pt.</p>
            </div>

            <div className="flex-grow flex flex-col justify-center w-full my-1.5 min-h-0">
              <p className="text-xs font-bold mb-1 opacity-70">Lösung für:</p>
              <p className="text-sm font-black text-slate-800 dark:text-white leading-normal underline decoration-sky-400 decoration-2 mb-1.5">{eq}</p>

              <div className="flex flex-col gap-1 w-full shrink-0">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleTap(2, opt)}
                    className="py-1 rounded bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-[9.5px] cursor-pointer shadow-sm transform hover:scale-102 transition-all leading-none"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// NEW WIDGET 30: FORMEN-ENTDECKER (2D Shapes Estimator)
// ==========================================
export const ShapepuzzleWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const figures = [
    { 
      id: "triangle", 
      name: "Dreieck", 
      emoji: "🔺", 
      vertices: 3, 
      sides: 3,
      points: [{x:50, y:20}, {x:15, y:80}, {x:80, y:80}], 
      text: "Zähle die Ecken und Seiten dieses roten Dreiecks:",
      colorCorner: "#ef4444", // Red
      colorSide: "#f59e0b", // Amber
      colorFace: "rgba(239, 68, 68, 0.15)",
      name3D: "Dreiecks-Pyramide (Tetraeder)",
      faces3D: 4,
      edges3D: 6,
      vertices3D: 4,
      css3dClass: "pyramid"
    },
    { 
      id: "square", 
      name: "Quadrat", 
      emoji: "🟩", 
      vertices: 4, 
      sides: 4,
      points: [{x:25, y:25}, {x:75, y:25}, {x:75, y:75}, {x:25, y:75}], 
      text: "Zähle die Ecken und Seiten dieses viereckigen Quadrats:",
      colorCorner: "#3b82f6", // Blue
      colorSide: "#10b981", // Emerald
      colorFace: "rgba(59, 130, 246, 0.15)",
      name3D: "Würfel (Hexaeder)",
      faces3D: 6,
      edges3D: 12,
      vertices3D: 8,
      css3dClass: "cube"
    },
    { 
      id: "pentagon", 
      name: "Fünfeck", 
      emoji: "⬠", 
      vertices: 5, 
      sides: 5,
      points: [{x:50, y:15}, {x:85, y:40}, {x:72, y:82}, {x:28, y:82}, {x:15, y:40}], 
      text: "Ein schönes, gleichmäßiges Haus/Fünfeck:",
      colorCorner: "#a855f7", // Purple
      colorSide: "#ec4899", // Pink
      colorFace: "rgba(168, 85, 247, 0.15)",
      name3D: "Fünfeckiges Prisma",
      faces3D: 7,
      edges3D: 15,
      vertices3D: 10,
      css3dClass: "prism5"
    },
    { 
      id: "hexagon", 
      name: "Sechseck", 
      emoji: "⬡", 
      vertices: 6, 
      sides: 6,
      points: [{x:50, y:15}, {x:80, y:33}, {x:80, y:67}, {x:50, y:85}, {x:20, y:67}, {x:20, y:33}], 
      text: "Die Bienenwabe hat genau diese Anzahl Ecken:",
      colorCorner: "#06b6d4", // Cyan
      colorSide: "#f59e0b", // Amber
      colorFace: "rgba(6, 182, 212, 0.15)",
      name3D: "Sechseckiges Prisma",
      faces3D: 8,
      edges3D: 18,
      vertices3D: 12,
      css3dClass: "prism6"
    }
  ];

  const [currentIdx, setCurrentIdx] = useState(0);
  const [clickedVertices, setClickedVertices] = useState<number[]>([]);
  const [clickedSides, setClickedSides] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [solved, setSolved] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);

  const fig = figures[currentIdx];

  const handleVertexClick = (idx: number) => {
    if (solved || viewMode === '3d') return;
    if (clickedVertices.includes(idx)) {
      setClickedVertices(prev => prev.filter(v => v !== idx));
    } else {
      setClickedVertices(prev => [...prev, idx]);
      playTone(330 + idx * 50);
    }
  };

  const handleSideClick = (idx: number) => {
    if (solved || viewMode === '3d') return;
    if (clickedSides.includes(idx)) {
      setClickedSides(prev => prev.filter(s => s !== idx));
    } else {
      setClickedSides(prev => [...prev, idx]);
      playTone(440 + idx * 60);
    }
  };

  const playTone = (freq: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch (e) {}
  };

  const handleGuessSubmit = (val: number) => {
    if (solved) return;
    setGuess(val);
    if (val === fig.vertices) {
      setSolved(true);
      setClickedVertices(fig.points.map((_, i) => i)); // reveal all
      setClickedSides(fig.points.map((_, i) => i)); // reveal all
      playTone(523.25);
    } else {
      playTone(120);
    }
  };

  const loadNextFigure = () => {
    setCurrentIdx((prev) => (prev + 1) % figures.length);
    setClickedVertices([]);
    setClickedSides([]);
    setSolved(false);
    setGuess(null);
    setViewMode('2d');
  };

  return (
    <div className="flex-grow flex flex-col justify-between p-2 h-full min-h-0 pointer-events-auto select-none gap-2">
      <div className="flex justify-between items-center px-1 shrink-0">
        <span className={`text-[8px] font-black uppercase tracking-widest ${currentIsLight ? 'text-slate-400' : 'text-slate-500'}`}>
          📐 Formen-Entdecker (2D & 3D)
        </span>
        
        {/* View mode toggle */}
        <div className="flex gap-0.5 bg-slate-150 dark:bg-zinc-900 p-0.5 rounded-lg border border-slate-300/10">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black cursor-pointer transition-colors ${
              viewMode === '2d' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            2D Fläche
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-black cursor-pointer transition-colors ${
              viewMode === '3d' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            3D Körper 🧊
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center px-1 text-center">
        <p className="text-[7.5px] text-slate-400 font-extrabold uppercase mb-1 leading-none">
          {viewMode === '2d' ? fig.text : `3D Körper: ${fig.name3D}`}
        </p>

        {/* Visualizer Frame */}
        <div className="w-24 h-24 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl relative overflow-hidden mb-1.5 flex items-center justify-center">
          {viewMode === '2d' ? (
            <svg className="w-full h-full pointer-events-auto absolute" viewBox="0 0 100 100">
              {/* Fill Face (Fläche) */}
              <polygon
                points={fig.points.map(p => `${p.x},${p.y}`).join(" ")}
                style={{ fill: fig.colorFace }}
                className={`transition-all duration-300 ${solved ? 'stroke-2' : ''}`}
              />

              {/* Draw individual Sides/Edges with clickable hit areas */}
              {fig.points.map((pt, idx) => {
                const nextPt = fig.points[(idx + 1) % fig.points.length];
                const isSideSelected = clickedSides.includes(idx);
                return (
                  <g key={`side-${idx}`}>
                    {/* Thick invisible interaction stroke */}
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={nextPt.x}
                      y2={nextPt.y}
                      stroke="transparent"
                      strokeWidth="8"
                      className="cursor-pointer"
                      onClick={() => handleSideClick(idx)}
                    />
                    {/* Visual side stroke */}
                    <line
                      x1={pt.x}
                      y1={pt.y}
                      x2={nextPt.x}
                      y2={nextPt.y}
                      stroke={isSideSelected || solved ? fig.colorSide : "#cbd5e1"}
                      strokeWidth={isSideSelected || solved ? "2.5" : "1.5"}
                      className="pointer-events-none transition-all duration-300"
                    />
                  </g>
                );
              })}
              
              {/* Dots Corners (Ecken) to click */}
              {fig.points.map((pt, idx) => {
                const isSelected = clickedVertices.includes(idx);
                return (
                  <circle
                    key={`corner-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected || solved ? 4 : 2.5}
                    onClick={() => handleVertexClick(idx)}
                    style={{ fill: isSelected || solved ? fig.colorCorner : "#94a3b8" }}
                    className="cursor-pointer transition-all duration-300 stroke-white stroke-1 hover:scale-125"
                  />
                );
              })}
            </svg>
          ) : (
            /* Premium Interactive 3D Perspective CSS rendering */
            <div className="relative w-full h-full flex items-center justify-center perspective-[300px] overflow-visible">
              <div 
                className="w-10 h-10 relative transform-style-3d animate-spin-slow transition-transform"
                style={{ 
                  animation: 'spin 12s linear infinite',
                  transformStyle: 'preserve-3d'
                }}
              >
                {/* Custom geometric shape representation */}
                {fig.id === 'triangle' && (
                  <div className="absolute inset-0 transform-style-3d">
                    {/* 4 triangular faces for a tetrahedron */}
                    {[0, 1, 2, 3].map((f) => {
                      const rotY = f * 120;
                      return (
                        <div 
                          key={f}
                          className="absolute w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[35px]"
                          style={{
                            borderBottomColor: fig.colorSide,
                            transform: `rotateY(${rotY}deg) translateZ(12px) rotateX(19.5deg)`,
                            opacity: 0.75,
                            transformOrigin: '50% 100%'
                          }}
                        />
                      );
                    })}
                  </div>
                )}

                {fig.id === 'square' && (
                  <div className="absolute inset-0 transform-style-3d">
                    {/* 6 Cube faces */}
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'translateZ(20px)' }} />
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'rotateY(180deg) translateZ(20px)' }} />
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'rotateY(90deg) translateZ(20px)' }} />
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'rotateY(-90deg) translateZ(20px)' }} />
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'rotateX(90deg) translateZ(20px)' }} />
                    <div className="absolute inset-0 border border-emerald-400 bg-emerald-500/20" style={{ transform: 'rotateX(-90deg) translateZ(20px)' }} />
                  </div>
                )}

                {fig.id === 'pentagon' && (
                  <div className="absolute inset-0 transform-style-3d">
                    {/* Pentagon prism body sides */}
                    {[0,1,2,3,4].map((s) => (
                      <div 
                        key={s}
                        className="absolute w-6 h-12 border border-pink-400 bg-pink-500/15"
                        style={{
                          transform: `rotateY(${s * 72}deg) translateZ(16px)`,
                          left: '8px',
                          top: '-10px'
                        }}
                      />
                    ))}
                  </div>
                )}

                {fig.id === 'hexagon' && (
                  <div className="absolute inset-0 transform-style-3d">
                    {/* Hexagonal prism body sides */}
                    {[0,1,2,3,4,5].map((s) => (
                      <div 
                        key={s}
                        className="absolute w-6 h-12 border border-amber-400 bg-amber-500/15"
                        style={{
                          transform: `rotateY(${s * 60}deg) translateZ(18px)`,
                          left: '8px',
                          top: '-10px'
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Infinite rotation CSS */}
              <style>{`
                @keyframes spin {
                  0% { transform: rotateX(-20deg) rotateY(0deg); }
                  100% { transform: rotateX(-20deg) rotateY(360deg); }
                }
                .perspective-300 { perspective: 300px; }
                .transform-style-3d { transform-style: preserve-3d; }
              `}</style>
            </div>
          )}
        </div>

        {viewMode === '2d' ? (
          <>
            {/* Legend / Info guide to teach correct names */}
            <div className="flex gap-2 justify-center mb-1.5 text-[6.5px] font-bold">
              <span className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: fig.colorCorner }} />
                Ecken: {clickedVertices.length} / {fig.vertices}
              </span>
              <span className="flex items-center gap-0.5">
                <span className="w-2.5 h-0.5 inline-block" style={{ backgroundColor: fig.colorSide }} />
                Seiten: {clickedSides.length} / {fig.sides}
              </span>
            </div>

            {/* Guess Selector */}
            <div className="flex gap-1 justify-center shrink-0 w-full mb-1">
              {[3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  onClick={() => handleGuessSubmit(num)}
                  disabled={solved}
                  className={`flex-1 py-0.5 rounded font-black text-[10px] cursor-pointer transition-all ${
                    solved && num === fig.vertices
                      ? 'bg-emerald-500 text-white shadow ring-2 ring-emerald-200'
                      : guess === num
                        ? 'bg-red-500 text-white'
                        : currentIsLight
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-neutral-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            {solved && (
              <div className="text-center p-0.5 bg-emerald-500/10 rounded border border-emerald-500/20 w-full animate-fade-in leading-none">
                <span className="text-[8px] font-extrabold text-emerald-500 uppercase">Super! Genau {fig.vertices} Ecken und {fig.sides} Seiten! ⭐</span>
              </div>
            )}
          </>
        ) : (
          /* 3D Property Card */
          <div className="w-full bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-1 text-left flex flex-col gap-0.5 leading-none animate-fade-in">
            <span className="text-[7.5px] font-black uppercase text-indigo-400">Eigenschaften des Körpers:</span>
            <div className="grid grid-cols-3 gap-1 mt-0.5 text-[7px] font-bold">
              <div className="p-0.5 rounded bg-white/5 border border-white/5">
                <span className="block text-slate-400">Flächen:</span>
                <span className="text-[8.5px] font-black text-indigo-400">{fig.faces3D}</span>
              </div>
              <div className="p-0.5 rounded bg-white/5 border border-white/5">
                <span className="block text-slate-400">Ecken:</span>
                <span className="text-[8.5px] font-black text-indigo-400">{fig.vertices3D}</span>
              </div>
              <div className="p-0.5 rounded bg-white/5 border border-white/5">
                <span className="block text-slate-400">Kanten:</span>
                <span className="text-[8.5px] font-black text-indigo-400">{fig.edges3D}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-1">
        <button
          onClick={loadNextFigure}
          className="w-full py-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[7.5px] uppercase transition-all shadow cursor-pointer text-center"
        >
          Nächste Figur ➔
        </button>
      </div>
    </div>
  );
};


// ==========================================
// WIDGET: GITARREN-STIMMGERÄT (GuitartunerWidgetContent)
// ==========================================
interface ReferenceString {
  label: string;
  note: string;
  freq: number;
  stringNum: number;
  name: string;
}

const REFERENCE_STRINGS: ReferenceString[] = [
  { label: 'e', note: 'E4', freq: 329.63, stringNum: 1, name: '1. Saite: Hohes E' },
  { label: 'H', note: 'B3', freq: 246.94, stringNum: 2, name: '2. Saite: H' },
  { label: 'G', note: 'G3', freq: 196.00, stringNum: 3, name: '3. Saite: G' },
  { label: 'D', note: 'D3', freq: 146.83, stringNum: 4, name: '4. Saite: D' },
  { label: 'A', note: 'A2', freq: 110.00, stringNum: 5, name: '5. Saite: A' },
  { label: 'E', note: 'E2', freq: 82.41, stringNum: 6, name: '6. Saite: Tiefer-Bass E' },
];

export const GuitartunerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [activeStringIndex, setActiveStringIndex] = useState<number>(2); // Default to G string
  const [isPlayingRef, setIsPlayingRef] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  
  // Audio state
  const [detectedFreq, setDetectedFreq] = useState<number | null>(null);
  const [deviationCents, setDeviationCents] = useState<number>(0);
  const [autoDetectString, setAutoDetectString] = useState<boolean>(true);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const oscGainRef = useRef<GainNode | null>(null);

  const micStreamRef = useRef<MediaStream | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Play standard reference tone using Web Audio synthesis
  const playReferenceTone = (freq: number) => {
    try {
      // Stop anything active
      stopReferenceTone();

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      const actx = new AudioCtxClass();
      audioCtxRef.current = actx;

      // Primary sine oscillator for pure pitch
      const osc = actx.createOscillator();
      osc.type = 'triangle'; // triangle has warmer acoustic tone
      osc.frequency.setValueAtTime(freq, actx.currentTime);

      // Lowpass filter to make the wave warmer (guitar-like feel)
      const biquad = actx.createBiquadFilter();
      biquad.type = 'lowpass';
      biquad.frequency.setValueAtTime(800, actx.currentTime);

      // Gain envelope for volume decay
      const gainNode = actx.createGain();
      gainNode.gain.setValueAtTime(0.35, actx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 3.5);

      osc.connect(biquad);
      biquad.connect(gainNode);
      gainNode.connect(actx.destination);

      oscRef.current = osc;
      oscGainRef.current = gainNode;

      osc.start();
      setIsPlayingRef(true);

      // Auto clear state after sound has died
      setTimeout(() => {
        setIsPlayingRef(false);
      }, 3500);

    } catch (e) {
      console.error("Audio Synthesis error", e);
    }
  };

  const stopReferenceTone = () => {
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch (e) {}
      oscRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    setIsPlayingRef(false);
  };

  // Auto-correlation implementation for accurate pitch detection
  const performAutoCorrelation = (buffer: Float32Array, sampleRate: number): number => {
    const SIZE = buffer.length;
    let rms = 0;

    for (let i = 0; i < SIZE; i++) {
      const val = buffer[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.008) return -1; // Silent room threshold

    let r1 = 0;
    let r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = SIZE - 1; i >= SIZE / 2; i--) {
      if (Math.abs(buffer[i]) < thres) { r2 = i; break; }
    }

    const buf = buffer.subarray(r1, r2);
    const len = buf.length;

    const c = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      for (let j = 0; j < len - i; j++) {
        c[i] = c[i] + buf[j] * buf[j + i];
      }
    }

    let d = 0;
    while (c[d] > c[d + 1]) d++;
    let maxval = -1;
    let maxpos = -1;
    for (let i = d; i < len; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    let T0 = maxpos;

    const x1 = c[T0 - 1];
    const x2 = c[T0];
    const x3 = c[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  };

  // Start analyzer loop for Microphone monitoring
  const animateMicPitch = () => {
    if (!analyzerRef.current) return;
    
    const bufferSize = 2048;
    const buffer = new Float32Array(bufferSize);
    analyzerRef.current.getFloatTimeDomainData(buffer);

    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    const tempCtx = new AudioCtxClass();
    const rate = tempCtx.sampleRate;
    tempCtx.close().catch(() => {});

    const frequency = performAutoCorrelation(buffer, rate);

    if (frequency > 50 && frequency < 800) {
      setDetectedFreq(Math.round(frequency * 10) / 10);

      // Find best target string reference match
      let targetIdx = activeStringIndex;
      if (autoDetectString) {
        let nearestIdx = 0;
        let minDiff = Infinity;
        REFERENCE_STRINGS.forEach((str, idx) => {
          const diff = Math.abs(frequency - str.freq);
          if (diff < minDiff) {
            minDiff = diff;
            nearestIdx = idx;
          }
        });
        targetIdx = nearestIdx;
        setActiveStringIndex(nearestIdx);
      }

      const targetFreq = REFERENCE_STRINGS[targetIdx].freq;
      
      // Calculate deviation in cents (1 scale unit = 1 cent)
      const cents = 1200 * Math.log2(frequency / targetFreq);
      
      // Filter out crazy jumps, cap deviation at -50 to +50
      if (!isNaN(cents) && Math.abs(cents) < 180) {
        setDeviationCents(Math.max(-50, Math.min(50, cents)));
      }
    } else {
      // Graceful decay towards neutral if silent
      setDeviationCents(prev => prev * 0.82);
    }

    animationFrameRef.current = requestAnimationFrame(animateMicPitch);
  };

  const startListening = async () => {
    setAudioError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const actx = new AudioCtxClass();
      const source = actx.createMediaStreamSource(stream);
      const analyzer = actx.createAnalyser();
      analyzer.fftSize = 2048;
      
      source.connect(analyzer);
      analyzerRef.current = analyzer;
      setIsListening(true);
      
      // Begin tracking loop
      animationFrameRef.current = requestAnimationFrame(animateMicPitch);
    } catch (err: any) {
      console.error("Microphone access failed", err);
      setAudioError("Mikrofon-Berechtigung wurde verweigert oder ist nicht verfügbar.");
    }
  };

  const stopListening = () => {
    setIsListening(false);
    setDetectedFreq(null);
    setDeviationCents(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    analyzerRef.current = null;
  };

  // Cleanup audio contexts on unmount
  useEffect(() => {
    return () => {
      stopReferenceTone();
      stopListening();
    };
  }, []);

  const activeStr = REFERENCE_STRINGS[activeStringIndex];
  const isPerfect = Math.abs(deviationCents) <= 3.5;
  const isFlat = deviationCents < -3.5;
  const isSharp = deviationCents > 3.5;

  return (
    <div className="flex flex-col h-full w-full p-2.5 select-none min-h-0 justify-between">
      {/* Dynamic Upper Title and Mic Button */}
      <div className="flex justify-between items-center mb-1 shrink-0">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🎸 Gitarren-Stimmgerät
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Pitch Tracker & Audio-Saiten</span>
        </div>

        <button
          onClick={isListening ? stopListening : startListening}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold text-[8.5px] shadow-sm cursor-pointer transition-all ${
            isListening 
              ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
          }`}
        >
          {isListening ? (
            <>
              <MicOff size={11} /> Stop Mic
            </>
          ) : (
            <>
              <Mic size={11} /> Live Stimm-Modus
            </>
          )}
        </button>
      </div>

      {audioError && (
        <p className="text-[7px] text-red-500 font-extrabold text-center leading-normal mb-1">
          ⚠️ {audioError}
        </p>
      )}

      {/* Main Alignment Dial & Needle */}
      <div className="flex-grow flex flex-col justify-center items-center py-1 min-h-0">
        <div className="relative w-full max-w-[130px] aspect-video flex flex-col items-center justify-end overflow-hidden mb-1">
          {/* Dial Scale Base (SVG Arc) */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 50">
            {/* Gray baseline path */}
            <path
              d="M 10 45 A 35 35 0 0 1 90 45"
              fill="none"
              stroke={currentIsLight ? "#e2e8f0" : "#3f3f46"}
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Center target zone highlight */}
            <path
              d="M 42 12 A 35 35 0 0 1 58 12"
              fill="none"
              stroke="#10b981"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Zero point anchor mark */}
            <line x1="50" y1="5" x2="50" y2="10" stroke="#10b981" strokeWidth="2" />
          </svg>

          {/* Rotated Physical Compass Needle */}
          <div 
            className="absolute bottom-1 w-0.5 h-12 bg-indigo-500 origin-bottom rounded-full transition-transform duration-150 ease-out"
            style={{ 
              transform: `rotate(${deviationCents * 1.5}deg)`,
              backgroundColor: isPerfect ? '#10b981' : isFlat ? '#f59e0b' : '#ef4444'
            }}
          />

          {/* Text Status Indicator overlay */}
          <div className="text-center translate-y-2 z-10 shrink-0 select-none">
            {isListening ? (
              <div className="font-black text-xs leading-none">
                <span className={isPerfect ? 'text-emerald-500' : isFlat ? 'text-amber-500' : 'text-red-500'}>
                  {activeStr.label.toUpperCase()}
                </span>
                <span className="text-[7.5px] font-bold tracking-widest block opacity-70 mt-0.5">
                  {detectedFreq ? `${detectedFreq} Hz` : '-- Hz'}
                </span>
              </div>
            ) : (
              <span className="text-[8px] font-extrabold tracking-wider uppercase opacity-40">
                Wähle eine Saite
              </span>
            )}
          </div>
        </div>

        {/* Flat / In-Tune / Sharp Visual Badge Panel */}
        <div className="h-4 flex items-center justify-center shrink-0 w-full mb-1">
          {isListening && (
            <div className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1.5 transition-all ${
              isPerfect 
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400' 
                : isFlat 
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400'
            }`}>
              {isPerfect && (<><CheckCircle size={9.5} /> Perfekt gestimmt!</>)}
              {isFlat && "Zu tief (Spann herauf! 🪕)"}
              {isSharp && "Zu hoch (Lockere die Saite! ➔)"}
            </div>
          )}
        </div>
      </div>

      {/* Manual String Selection Row (Guitar pegs visual layout) */}
      <div className="shrink-0 flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[7px] font-extrabold text-slate-400 dark:text-neutral-500 px-1">
          <span>TIEFE SAITEN (6)</span>
          <span>HOHE SAITEN (1)</span>
        </div>

        <div className="grid grid-cols-6 gap-1.5">
          {REFERENCE_STRINGS.map((str, idx) => {
            const isActive = activeStringIndex === idx;
            return (
              <button
                key={str.stringNum}
                onClick={() => {
                  stopReferenceTone();
                  setActiveStringIndex(idx);
                  playReferenceTone(str.freq);
                }}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all cursor-pointer border ${
                  isActive 
                    ? 'bg-indigo-500 text-white shadow-md border-indigo-600' 
                    : currentIsLight 
                      ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800' 
                      : 'bg-zinc-800/80 border-zinc-700/60 hover:bg-zinc-700 text-neutral-200'
                }`}
              >
                <span className="text-[10px] font-black leading-none">{str.label}</span>
                <span className="text-[6.5px] mt-0.5 opacity-60 font-mono leading-none">{str.note}</span>
              </button>
            );
          })}
        </div>

        {/* Audio control reference button */}
        <div className="flex gap-1 items-center mt-1">
          <button
            onClick={() => {
              if (isPlayingRef) {
                stopReferenceTone();
              } else {
                playReferenceTone(activeStr.freq);
              }
            }}
            className={`flex-1 py-1 px-2 rounded-xl text-[8px] font-extrabold uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all ${
              isPlayingRef
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-neutral-100'
            }`}
          >
            <Volume2 size={10} />
            {isPlayingRef ? "Ton Stoppen" : `${activeStr.label}-Ton abspielen`}
          </button>

          <label className="flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoDetectString}
              onChange={(e) => setAutoDetectString(e.target.checked)}
              className="rounded text-indigo-500 accent-indigo-500 text-[8px] scale-80 cursor-pointer"
            />
            <span className="text-[7px] font-black uppercase tracking-wider text-slate-400 dark:text-neutral-500 select-none">Saite automatisch erkennen</span>
          </label>
        </div>
      </div>
    </div>
  );
};


// ========================================================
// 1. WIDGET: KLASSEN-KRYPTOGRAPH (SecretagentWidgetContent)
// ========================================================
export const SecretagentWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [shift, setShift] = useState<number>(3);
  const [inputText, setInputText] = useState<string>("GEHEIM");
  const [gameUnlocked, setGameUnlocked] = useState<boolean>(false);
  const [safeGuess, setSafeGuess] = useState<number>(1);
  const [safeTarget, setSafeTarget] = useState<number>(() => Math.floor(Math.random() * 10) + 1);
  const [safeMessage, setSafeMessage] = useState<string>("Drehe am Schloss!");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);

  const caesarCipher = (str: string, originalShift: number) => {
    return str.replace(/[A-Z]/gi, (char) => {
      const charCode = char.charCodeAt(0);
      let limit = 65;
      if (charCode >= 65 && charCode <= 90) limit = 65;
      else if (charCode >= 97 && charCode <= 122) limit = 97;
      else return char;
      return String.fromCharCode(((charCode - limit + originalShift) % 26 + 26) % 26 + limit);
    });
  };

  const playChime = (success: boolean) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (success) {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else {
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch(e){}
  };

  const checkSafeCombo = () => {
    if (safeGuess === safeTarget) {
      setGameUnlocked(true);
      setSafeMessage("🔓 Genial! Schloss geknackt!");
      playChime(true);
    } else {
      setSafeMessage(safeGuess < safeTarget ? "➔ Höher drehen! (Lauter Klick 🔊)" : "➔ Niedriger drehen! (Widerstand 🛑)");
      playChime(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex flex-wrap justify-between items-center gap-2 mb-1">
        <span className="text-[10px] font-mono font-bold opacity-70">Codieren & Safe knacken · Cäsar</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="min-h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10 font-bold text-[10px] cursor-pointer"
          >
            Anleitung {showInstructions ? "❌" : "❓"}
          </button>
          <button
            onClick={() => {
              setSafeTarget(Math.floor(Math.random() * 10) + 1);
              setGameUnlocked(false);
              setSafeMessage("Drehe am Schloss!");
            }}
            className="min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold text-[10px] cursor-pointer"
          >
            Reset Game
          </button>
        </div>
      </div>

      {showInstructions && (
        <div className={`p-2 rounded-xl mb-1 text-[8px] leading-relaxed border animate-fade-in shrink-0 ${
          currentIsLight ? 'bg-amber-50/80 border-amber-200 text-slate-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'
        }`}>
          <p className="font-extrabold text-[8.5px] mb-1 text-amber-600 dark:text-amber-400">🕵️ Missions-Briefing:</p>
          <ol className="list-decimal pl-3 space-y-0.5">
            <li><strong>Caesar-Verschlüsselung:</strong> Verschiebe die Buchstaben deines Wortes um die eingestellte Anzahl (Schlüssel). A wird bei 3 zu D. Versuche Geheimbotschaften an deine Klasse zu senden!</li>
            <li><strong>Knobelspiel (Tresor):</strong> Finde die geheime Zahl (1 bis 10). Die Waage bzw. das Schloss gibt dir Geräusche und Klicks als Feedback:
              <br/>- <em>Höher drehen:</em> Ein Klick-Ton ertönt.
              <br/>- <em>Niedriger drehen:</em> Spürbarer Widerstand (tiefer Ton).
            </li>
          </ol>
        </div>
      )}

      <div className="flex-grow flex flex-col gap-2 min-h-0 justify-center">
        {/* Encoder Mode */}
        <div className={`p-2 rounded-xl border ${currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/60 border-zinc-700/60'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-extrabold uppercase text-accent">Caesar-Verschlüsselung</span>
            <span className="text-[8px] font-bold font-mono">Schlüssel: {shift}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Text..."
              maxLength={15}
              className={`min-h-11 px-2 rounded-xl text-[11px] uppercase font-bold text-center border ${currentIsLight ? 'bg-white text-slate-800' : 'bg-zinc-950 text-white border-zinc-700'}`}
            />
            <div className={`px-1.5 py-0.5 rounded text-[9.5px] text-emerald-500 font-bold text-center border truncate ${currentIsLight ? 'bg-white border-slate-200' : 'bg-zinc-950 border-zinc-700'}`}>
              {caesarCipher(inputText, shift) || "---"}
            </div>
          </div>
          <input
            type="range"
            min="1"
            max="25"
            value={shift}
            onChange={(e) => setShift(parseInt(e.target.value))}
            className="w-full text-accent accent-current h-2 cursor-pointer"
          />
        </div>

        {/* Lock Game */}
        <div className={`p-2 rounded-xl border ${gameUnlocked ? 'bg-emerald-500/10 border-emerald-500/20' : currentIsLight ? 'bg-slate-50 border-slate-200' : 'bg-zinc-800/60 border-zinc-700/60'}`}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-extrabold uppercase text-rose-500">🕵️ Knobelspiel: Tresor knacken</span>
            <span className="text-[7.5px] font-mono opacity-80">Geheimer Zahlencode 1-10</span>
          </div>
          <div className="flex gap-2 items-center justify-between">
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="10"
                value={safeGuess}
                onChange={(e) => setSafeGuess(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className={`min-h-11 w-14 px-2 text-center text-sm font-black rounded-xl ${currentIsLight ? 'bg-white text-slate-800 border' : 'bg-zinc-950 text-white border border-zinc-700'}`}
              />
              <button
                onClick={checkSafeCombo}
                disabled={gameUnlocked}
                className="min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[10px] font-black uppercase tracking-wide cursor-pointer active:scale-95 transition-all"
              >
                Drehen & Testen
              </button>
            </div>
            <div className={`text-[10px] font-black leading-snug ${gameUnlocked ? 'text-emerald-500 animate-bounce' : 'text-slate-500 dark:text-neutral-400'}`}>
              {safeMessage}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// ========================================================
// 2. WIDGET: BRUCHTEIL-BÄCKER (FractioncakeWidgetContent)
// ========================================================
export const FractioncakeWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [denom, setDenom] = useState<number>(4);
  const [userSlices, setUserSlices] = useState<boolean[]>([true, true, false, false]);
  const [cakeFlavor, setCakeFlavor] = useState<'strawberry' | 'chocolate' | 'kiwi'>('strawberry');
  const [testMode, setTestMode] = useState<boolean>(false);
  const [testDenom, setTestDenom] = useState<number>(3);
  const [testNum, setTestNum] = useState<number>(1);
  const [feedback, setFeedback] = useState<string>("Backe leckere Brüche im Ofen! 🍰 Tippe auf die Stücke!");
  const [testSolved, setTestSolved] = useState<boolean>(false);

  const flavorColor = {
    strawberry: '#ef4444',
    chocolate: '#78350f',
    kiwi: '#10b981'
  }[cakeFlavor];

  // Number of active slices
  const activeCount = userSlices.filter(Boolean).length;

  // Sync slices list size when denominator changes
  useEffect(() => {
    if (!testMode) {
      // Create new array of size 'denom', and pre-fill some slices
      const newSlices = Array(denom).fill(false);
      // Pre-fill about half
      const fillCount = Math.floor(denom / 2);
      for (let i = 0; i < fillCount; i++) {
        newSlices[i] = true;
      }
      setUserSlices(newSlices);
    }
  }, [denom, testMode]);

  const getSlices = () => {
    let list: any[] = [];
    const step = 360 / denom;
    for (let i = 0; i < denom; i++) {
      list.push({ start: i * step, end: (i + 1) * step, active: !!userSlices[i] });
    }
    return list;
  };

  const startTest = () => {
    const randomDenom = [2, 3, 4, 6, 8, 12][Math.floor(Math.random() * 6)];
    const randomNum = Math.floor(Math.random() * (randomDenom - 1)) + 1;
    setTestDenom(randomDenom);
    setTestNum(randomNum);
    setDenom(randomDenom);
    setUserSlices(Array(randomDenom).fill(false));
    setTestMode(true);
    setTestSolved(false);
    setFeedback(`🍳 Backe einen Kuchen mit genau ${randomNum}/${randomDenom} Belegung! Tippe auf die Stücke!`);
  };

  const handleSliceClick = (idx: number) => {
    if (testMode && testSolved) return;
    
    const copy = [...userSlices];
    copy[idx] = !copy[idx];
    setUserSlices(copy);

    const count = copy.filter(Boolean).length;
    if (testMode) {
      setFeedback(`Kuchen belegt: ${count}/${testDenom}. Gesucht sind ${testNum}/${testDenom}!`);
    } else {
      setFeedback(`Kuchen belegt: ${count} von ${denom} Stücken (${count}/${denom})!`);
    }

    // Play slicing sound
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {}
  };

  const checkTestAnswer = () => {
    if (activeCount === testNum) {
      setFeedback("🎉 Exzellent! Der Kuchen ist perfekt gebacken und richtig belegt! 👩‍🍳");
      setTestSolved(true);
      
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          [523.25, 659.25, 783.99].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
            gain.gain.setValueAtTime(0.05, ctx.currentTime + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          });
        }
      } catch {}
    } else {
      setFeedback(`⚠️ Das stimmt noch nicht! Du hast ${activeCount}/${testDenom} belegt, gesucht ist aber ${testNum}/${testDenom}!`);
    }
  };

  // Render topping items on active slices
  const renderTopping = (start: number, end: number, idx: number) => {
    const midAngle = (start + end) / 2;
    const rad = (midAngle - 90) * Math.PI / 180;
    
    // Position 1 (main topping)
    const tx = Math.round(24 * Math.cos(rad));
    const ty = Math.round(24 * Math.sin(rad));

    // Secondary positions for extra rich looks
    const t2x = Math.round(34 * Math.cos((midAngle - 80) * Math.PI / 180));
    const t2y = Math.round(34 * Math.sin((midAngle - 80) * Math.PI / 180));
    
    const t3x = Math.round(34 * Math.cos((midAngle - 100) * Math.PI / 180));
    const t3y = Math.round(34 * Math.sin((midAngle - 100) * Math.PI / 180));

    if (cakeFlavor === 'strawberry') {
      return (
        <g key={idx} className="pointer-events-none">
          <circle cx={tx} cy={ty} r="3.5" fill="#fef08a" stroke="#ca8a04" strokeWidth="0.5" />
          <circle cx={t2x} cy={t2y} r="1.5" fill="#ffffff" />
          <circle cx={t3x} cy={t3y} r="1.5" fill="#ffffff" />
        </g>
      );
    } else if (cakeFlavor === 'chocolate') {
      return (
        <g key={idx} className="pointer-events-none">
          <rect x={tx - 1.5} y={ty - 1.5} width="3" height="3" transform={`rotate(${midAngle} ${tx} ${ty})`} fill="#fed7aa" rx="0.5" />
          <circle cx={t2x} cy={t2y} r="1.2" fill="#fed7aa" />
          <circle cx={t3x} cy={t3y} r="1.2" fill="#fed7aa" />
        </g>
      );
    } else {
      return (
        <g key={idx} className="pointer-events-none">
          <circle cx={tx} cy={ty} r="1.2" fill="#18181b" />
          <circle cx={t2x} cy={t2y} r="1" fill="#18181b" />
          <circle cx={t3x} cy={t3y} r="1" fill="#18181b" />
          <ellipse cx={tx} cy={ty} rx="1" ry="2" transform={`rotate(${midAngle} ${tx} ${ty})`} fill="none" stroke="#ffffff" strokeWidth="0.4" />
        </g>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🍰 Bruchteil-Bäcker
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Tippe auf Stücke im Kuchen!</span>
        </div>
        <button
          onClick={() => { testMode ? setTestMode(false) : startTest(); }}
          className={`px-2 py-0.5 rounded font-black text-[8px] text-white cursor-pointer transition-colors ${testMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-600 hover:bg-violet-700'}`}
        >
          {testMode ? "Tafeltraining" : "Bäcker-Prüfung 🍳"}
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-around py-1.5 min-h-0">
        
        {/* Visual cake tray space */}
        <div className="flex flex-col sm:flex-row items-center justify-around gap-2.5">
          
          {/* LARGE Interactive Cake SVG */}
          <div className="relative w-32 h-32 rounded-full border border-slate-300 dark:border-zinc-700 bg-amber-50/10 overflow-hidden shadow-md flex items-center justify-center transition-transform hover:scale-102">
            <svg viewBox="-50 -50 100 100" className="w-28 h-28">
              <circle cx="0" cy="0" r="46" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1" className="opacity-15" />
              {getSlices().map((slice, idx) => {
                const radStart = (slice.start - 90) * Math.PI / 180;
                const radEnd = (slice.end - 90) * Math.PI / 180;
                const x1 = Math.round(44 * Math.cos(radStart));
                const y1 = Math.round(44 * Math.sin(radStart));
                const x2 = Math.round(44 * Math.cos(radEnd));
                const y2 = Math.round(44 * Math.sin(radEnd));
                const largeArc = slice.end - slice.start > 180 ? 1 : 0;
                const pathData = `M 0 0 L ${x1} ${y1} A 44 44 0 ${largeArc} 1 ${x2} ${y2} Z`;
                return (
                  <g key={idx}>
                    <path
                      d={pathData}
                      onClick={() => handleSliceClick(idx)}
                      fill={slice.active ? flavorColor : '#e2e8f0'}
                      stroke={currentIsLight ? '#ffffff' : '#1e1b4b'}
                      strokeWidth="1.5"
                      className="cursor-pointer hover:opacity-90 transition-all duration-150"
                    />
                    {slice.active && renderTopping(slice.start, slice.end, idx)}
                  </g>
                );
              })}
              <circle cx="0" cy="0" r="3" fill="#ffffff" />
            </svg>
          </div>

          {/* Elegant Fraction Display Panel */}
          <div className="flex flex-row items-center gap-3 bg-slate-50 dark:bg-zinc-900 px-3 py-2 rounded-xl border border-slate-250/40">
            {/* Standard mathematical fraction bar notation */}
            <div className="flex flex-col items-center justify-center font-mono select-none px-1">
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{activeCount}</span>
              <div className="w-6 h-[2px] bg-slate-800 dark:bg-white my-1" />
              <span className="text-xl font-black text-slate-700 dark:text-slate-300 leading-none">{denom}</span>
            </div>

            {/* Split controls or targets */}
            {!testMode ? (
              <div className="flex flex-col gap-1.5 w-24">
                <div className="flex items-center justify-between text-[6.5px] font-black uppercase tracking-wider text-slate-400">
                  <span>Schnitt-Teile:</span>
                  <span className="font-mono font-black text-[8px] text-teal-600">{denom}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={denom}
                  onChange={(e) => {
                    const d = parseInt(e.target.value);
                    setDenom(d);
                  }}
                  className="accent-indigo-500 w-full cursor-pointer h-1 rounded"
                />
                <span className="text-[6px] font-bold text-slate-400/80 leading-none">Tippe auf den Kuchen, um Stücke zu belegen!</span>
              </div>
            ) : (
              <div className="flex flex-col gap-1 w-24 items-center text-center">
                <span className="text-[7.5px] font-black uppercase text-indigo-400">Auftrag:</span>
                <span className="text-sm font-black text-amber-500 font-mono leading-tight">{testNum} / {testDenom}</span>
                
                {!testSolved ? (
                  <button
                    onClick={checkTestAnswer}
                    className="w-full py-1 mt-0.5 rounded text-[7px] font-black uppercase text-white cursor-pointer transition-all active:scale-95 bg-emerald-500 hover:bg-emerald-600"
                  >
                    Ofen schieben ✔
                  </button>
                ) : (
                  <button
                    onClick={startTest}
                    className="w-full py-1 mt-0.5 rounded text-[7px] font-black uppercase text-white cursor-pointer transition-all active:scale-95 bg-indigo-500 hover:bg-indigo-600"
                  >
                    Nächster ➔
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Flavor choices selection */}
        <div className="shrink-0 grid grid-cols-3 gap-1 mt-1">
          {(['strawberry', 'chocolate', 'kiwi'] as const).map((flavor) => (
            <button
              key={flavor}
              onClick={() => setCakeFlavor(flavor)}
              className={`py-0.5 rounded text-[7px] font-black uppercase text-center border cursor-pointer transition-colors ${
                cakeFlavor === flavor 
                  ? 'bg-slate-200 border-slate-400 dark:bg-zinc-700 dark:border-zinc-500 text-slate-900 dark:text-slate-100' 
                  : 'bg-transparent border-transparent opacity-60 text-slate-500'
              }`}
            >
              {flavor === 'strawberry' ? '🍓 Erdbeere' : flavor === 'chocolate' ? '🍫 Schoko' : '🥝 Kiwi'}
            </button>
          ))}
        </div>

        <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-1">{feedback}</p>
      </div>
    </div>
  );
};


  // ========================================================
// 3. WIDGET: WORT- & SATZWERKSTATT (Legacy Sentencebuilding)
// ========================================================
export const SentencebuildingWidgetContent: React.FC<{
  widget?: any;
  currentIsLight?: boolean;
  onUpdate?: (updates: any) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight = true,
  onUpdate,
  isFullscreen,
  showSettings,
  onCloseSettings,
}) => {
  return (
    <WortSatzWerkstattWidget
      widget={widget}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
      isFullscreen={isFullscreen}
      defaultMode="sentence"
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};

// ========================================================
// 4. WIDGET: SEQUENZ-MUSTER-MACHER (PatternmakerWidgetContent)
// ========================================================
interface LogikPattern {
  sequence: string[];
  options: string[];
  correct: string;
}

const PATTERNS_BY_LEVEL: Record<'easy' | 'medium' | 'hard' | 'extreme', LogikPattern[]> = {
  easy: [
    { sequence: ['🔴', '🔵', '🔴', '🔵', '🔴'], options: ['🔵', '🔴', '🟡', '🟢'], correct: '🔵' },
    { sequence: ['🍎', '🍏', '🍎', '🍏', '🍎'], options: ['🍎', '🍏', '🍉', '🍌'], correct: '🍏' },
    { sequence: ['🔺', '🟩', '🔺', '🟩', '🔺'], options: ['🔺', '🟩', '🟡', '🔷'], correct: '🟩' },
    { sequence: ['⭐', '🎈', '⭐', '🎈', '⭐'], options: ['🎈', '⭐', '🍦', '🎁'], correct: '🎈' },
    { sequence: ['🌞', '🌛', '🌞', '🌛', '🌞'], options: ['🌞', '🌛', '⭐', '🌍'], correct: '🌛' },
    { sequence: ['🐝', '🌸', '🐝', '🌸', '🐝'], options: ['🐝', '🌸', '🌲', '🍎'], correct: '🌸' }
  ],
  medium: [
    { sequence: ['🐱', '🐱', '🐶', '🐱', '🐱'], options: ['🐱', '🐶', '🐹', '🦊'], correct: '🐶' },
    { sequence: ['🚗', '🚕', '🚙', '🚗', '🚕'], options: ['🚗', '🚙', '🚕', '🏍️'], correct: '🚙' },
    { sequence: ['🍦', '🍫', '🍬', '🍦', '🍫'], options: ['🍦', '🍫', '🍬', '🎂'], correct: '🍬' },
    { sequence: ['🎲', '🎯', '🎮', '🎲', '🎯'], options: ['🎲', '🎯', '🎮', '🧩'], correct: '🎮' },
    { sequence: ['⚽', '🏀', '🏐', '⚽', '🏀'], options: ['⚽', '🏀', '🏐', '🎾'], correct: '🏐' },
    { sequence: ['🦁', '🐯', '🐼', '🦁', '🐯'], options: ['🦁', '🐯', '🐼', '🐨'], correct: '🐼' },
    { sequence: ['🍌', '🍒', '🍇', '🍌', '🍒'], options: ['🍌', '🍒', '🍇', '🍉'], correct: '🍇' }
  ],
  hard: [
    { sequence: ['⬆️', '➡️', '⬇️', '⬅️', '⬆️'], options: ['⬆️', '➡️', '⬇️', '⬅️'], correct: '➡️' },
    { sequence: ['🌑', '🌒', '🌓', '🌔', '🌕'], options: ['🌑', '🌒', '🌓', '🌕'], correct: '🌑' },
    { sequence: ['🥚', '🐣', '🐥', '🐔', '🥚'], options: ['🥚', '🐣', '🐥', '🐔'], correct: '🐣' },
    { sequence: ['🥇', '🥈', '🥉', '🥇', '🥈'], options: ['🥇', '🥈', '🥉', '🏆'], correct: '🥉' },
    { sequence: ['🌧️', '🌈', '☀️', '🌧️', '🌈'], options: ['🌧️', '🌈', '☀️', '❄️'], correct: '☀️' },
    { sequence: ['🔴', '🔵', '🔵', '🔴', '🔵'], options: ['🔴', '🔵', '🟡', '🟢'], correct: '🔵' }
  ],
  extreme: [
    { sequence: ['🔴', '🔵', '🔴', '🔴', '🔵'], options: ['🔴', '🔵', '🟡', '🟢'], correct: '🔴' }, // Growth: 1R, 1B, 2R, 1B, 3R -> next is R
    { sequence: ['🍏', '🍎', '🍏', '🍏', '🍎'], options: ['🍏', '🍎', '🍉', '🍌'], correct: '🍏' }, // Growth: 1G, 1R, 2G, 1R, 3G -> next is G
    { sequence: ['⚀', '⚁', '⚂', '⚃', '⚄'], options: ['⚀', '⚂', '⚄', '⚅'], correct: '⚅' },
    { sequence: ['🕐', '🕒', '🕔', '🕖', '🕘'], options: ['🕙', '🕚', '🕛', '🕑'], correct: '🕚' },
    { sequence: ['⚪', '🟡', '🔴', '🔵', '⚪'], options: ['⚪', '🟡', '🔴', '🔵'], correct: '🟡' },
    { sequence: ['🟡', '🟡', '🟡', '🔵', '🟡'], options: ['🟡', '🔵', '🔴', '🟢'], correct: '🟡' }, // Block: 3Y, 1B, 3Y, 1B... next is Y
    { sequence: ['🦊', '🐰', '🦊', '🐰', '🐰'], options: ['🦊', '🐰', '🐹', '🐻'], correct: '🦊' } // Fox, 1 Rabbit, Fox, 2 Rabbits -> Fox
  ]
};

export const PatternmakerWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const { app } = useApp();
  const lifecycle = readWidgetLifecycleState(widget, "patternmaker", {
    difficulty: "medium" as "easy" | "medium" | "hard" | "extreme",
    aiPatterns: null as LogikPattern[] | null,
    patternIdx: 0,
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
    streak: 0,
    feedback: "Finde das fehlende Symbol!",
  });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(() => lifecycle.difficulty);
  const [aiPatterns, setAiPatterns] = useState<LogikPattern[] | null>(() => lifecycle.aiPatterns);
  const [patternIdx, setPatternIdx] = useState<number>(() => lifecycle.patternIdx);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isLoadingAI = aiStatus === "loading";
  const [streak, setStreak] = useState<number>(() => lifecycle.streak);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "patternmaker"));
  const previousDifficultyRef = useRef(difficulty);

  usePersistedWidgetLifecycleState(widget, onUpdate, "patternmaker", {
    difficulty,
    aiPatterns,
    patternIdx,
    aiStatus,
    aiError,
    streak,
    feedback,
  });

  // Filter current active patterns
  const activePatterns = useMemo(() => {
    if (aiPatterns) return aiPatterns;
    return PATTERNS_BY_LEVEL[difficulty];
  }, [difficulty, aiPatterns]);

  // Difficulty is an explicit new task action; a remount restores the
  // persisted pattern, streak and feedback instead.
  useEffect(() => {
    const difficultyChanged = previousDifficultyRef.current !== difficulty;
    previousDifficultyRef.current = difficulty;
    if (didRestoreRef.current && !difficultyChanged) return;

    didRestoreRef.current = true;
    setAiPatterns(null);
    setPatternIdx(0);
    setStreak(0);
    setFeedback("Finde das fehlende Symbol!");
    setAiStatus("idle");
    setAiError(null);
  }, [difficulty]);

  const averageNiveau = useMemo(() => {
    if (!app.schueler || app.schueler.length === 0) return 3;
    const sum = app.schueler.reduce((acc, s) => acc + (s.niveau || 3), 0);
    return Math.round(sum / app.schueler.length);
  }, [app.schueler]);

  const loadAIPatterns = async () => {
    setAiStatus("loading");
    setAiError(null);
    try {
      const apiDiff = difficulty === 'easy' ? 'leicht' : difficulty === 'medium' ? 'mittel' : difficulty === 'hard' ? 'schwer' : 'extrem';
      const result = await generateWidgetTasks("patternmaker", app.stufe || 4, averageNiveau, apiDiff);
      if (result && result.tasks && Array.isArray(result.tasks) && result.tasks.length > 0) {
        setAiPatterns(result.tasks);
        setPatternIdx(0);
        setStreak(0);
        setFeedback("✨ Frische KI-Muster geladen!");
        setAiStatus("success");
      } else {
        const status: WidgetAiStatus = "error";
        setAiStatus(status);
        setAiError(getWidgetAiStatusMessage(status));
      }
    } catch (e) {
      const status = classifyWidgetAiError(e);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };

  const activePattern = activePatterns[patternIdx % activePatterns.length] || PATTERNS_BY_LEVEL.medium[0];

  const triggerSound = (status: boolean) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (status) {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch (e) {}
  };

  const handleGuess = (item: string) => {
    if (item === activePattern.correct) {
      setStreak(prev => prev + 1);
      setFeedback("🌟 Klasse! Absolut richtig!");
      triggerSound(true);
      setTimeout(() => {
        setPatternIdx((patternIdx + 1) % activePatterns.length);
        setFeedback("Finde das nächste Glied!");
      }, 1000);
    } else {
      setStreak(0);
      setFeedback("❌ Schade, versuche es nochmal!");
      triggerSound(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex flex-col gap-1 mb-1 pb-1 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
              🎨 Logische Mustermacher {aiPatterns ? "✨ KI" : ""}
            </span>
            <span className="text-[7px] font-mono opacity-80">Sequenzen & logische Folgen</span>
          </div>
          <span className="text-[8px] font-mono font-black border px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-800 dark:bg-zinc-800 dark:text-neutral-200">
            Serie: {streak} 🔥
          </span>
        </div>

        {/* Level Selector */}
        <div className="flex justify-between items-center gap-1 mt-1">
          <div className="flex gap-0.5">
            {(['easy', 'medium', 'hard', 'extreme'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-1 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wide cursor-pointer transition-all ${
                  difficulty === d && !aiPatterns
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : currentIsLight
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-150'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                {d === 'easy' ? 'Leicht' : d === 'medium' ? 'Mittel' : d === 'hard' ? 'Schwer' : '💥 Extrem'}
              </button>
            ))}
          </div>

          <button 
            onClick={loadAIPatterns}
            disabled={isLoadingAI}
            title={`Generiert Muster per KI für Level ${difficulty}`}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-bold flex items-center gap-0.5 transition-all text-white ${
              isLoadingAI ? 'bg-indigo-300 animate-pulse' : 'bg-amber-500 hover:bg-amber-600 active:scale-95 cursor-pointer'
            }`}
          >
            <Sparkles className="w-1.5 h-1.5" />
            {isLoadingAI ? "Generiere..." : "KI-Muster"}
          </button>
        </div>
        {aiStatus !== "idle" && aiStatus !== "success" && (
          <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-amber-700 dark:text-amber-300">
            <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
            {aiStatus !== "loading" && (
              <button type="button" onClick={loadAIPatterns} className="underline font-bold cursor-pointer">Erneut versuchen</button>
            )}
          </div>
        )}

      </div>

      <div className="flex-grow flex flex-col justify-center items-center py-2 min-h-0">
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 mb-3 min-h-14">
          <AnimatePresence mode="popLayout">
            {activePattern.sequence.map((emoji, i) => (
              <motion.span
                key={`${patternIdx}-${i}`}
                initial={{ opacity: 0, scale: 0.3, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.3 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                className="text-2xl select-none"
              >
                {emoji}
              </motion.span>
            ))}
          </AnimatePresence>
          <motion.div 
            animate={{ scale: [0.95, 1.05, 0.95] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-9 h-9 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/10 flex items-center justify-center"
          >
            <span className="text-indigo-600 font-extrabold text-sm font-mono">?</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-4 gap-2 w-full max-w-[240px]">
          {activePattern.options.map((option, i) => (
            <motion.button
              key={`${patternIdx}-opt-${i}`}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => handleGuess(option)}
              className={`p-2.5 text-center text-lg rounded-xl bg-white hover:bg-slate-50 dark:bg-zinc-850 border border-slate-150 dark:border-zinc-750 text-slate-800 dark:text-neutral-100 cursor-pointer shadow-sm transition-colors`}
            >
              {option}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="shrink-0 text-center min-h-6">
        <p className="text-[8.5px] font-black uppercase text-blue-500 tracking-wider animate-pulse">{feedback}</p>
      </div>
    </div>
  );
};


// ========================================================
// 5. WIDGET: WORT-ANALYSATOR (WordexplorerWidgetContent)
// ========================================================
export const WordexplorerWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "wordexplorer", {
    word: "SCHULE",
    syllablesCount: 2,
    vowelsList: ["U", "E"],
    isNoun: true,
    aiExplanation: "",
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
  });
  const [word, setWord] = useState<string>(() => lifecycle.word);
  const [syllablesCount, setSyllablesCount] = useState<number>(() => lifecycle.syllablesCount);
  const [vowelsList, setVowelsList] = useState<string[]>(() => lifecycle.vowelsList);
  const [isNoun, setIsNoun] = useState<boolean>(() => lifecycle.isNoun);
  const [aiExplanation, setAiExplanation] = useState<string>(() => lifecycle.aiExplanation);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isAiLoading = aiStatus === "loading";

  usePersistedWidgetLifecycleState(widget, onUpdate, "wordexplorer", {
    word,
    syllablesCount,
    vowelsList,
    isNoun,
    aiExplanation,
    aiStatus,
    aiError,
  });

  const testWord = (wInput: string) => {
    const caps = wInput.toUpperCase().trim();
    setWord(caps);
    setAiExplanation(""); // Reset explanation upon word change
    setAiStatus("idle");
    setAiError(null);

    // simple syllable logic count - count vowel clusters
    const clusterRegex = /[AEIOUYÄÖÜ]+|EI|AU|EU|IE/gi;
    const matches = caps.match(clusterRegex);
    const count = matches ? matches.length : 1;
    setSyllablesCount(count === 0 ? 1 : count);

    // extract vowels
    const vowels = caps.split('').filter(char => /[AEIOUÄÖÜ]/i.test(char));
    setVowelsList([...new Set(vowels)]);

    // check noun - usually nouns start with a upper letter in normal texts
    setIsNoun(/[A-Z]/.test(wInput[0]));
  };

  const playClap = (count: number) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          osc.start();
          osc.stop(ctx.currentTime + 0.15);
        }, i * 360);
      }
    } catch(e){}
  };

  const handleFetchAiExplanation = async () => {
    if (!word) return;
    setAiStatus("loading");
    setAiError(null);
    try {
      const prompt = `Erkläre das Wort "${word}" in 1 kurzen Satz so einfach, dass ein 7-jähriges Kind es versteht (didaktische Reduktion). Bilde dann einen super lustigen Satz mit dem Wort (1 Satz) mit einem passenden Emoji am Ende. Halte deine Antwort ultrakompakt (max. 35 Wörter insgesamt).`;
      const response = await askAI('ki-wissen', prompt);
      if (response) {
        setAiExplanation(response);
        setAiStatus("success");
      } else {
        const status: WidgetAiStatus = "error";
        setAiStatus(status);
        setAiError(getWidgetAiStatusMessage(status));
      }
    } catch (err) {
      const status = classifyWidgetAiError(err);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🔍 Wort-Analysator {aiExplanation && "✨ AI"}
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Silben, Selbstlaute & Wortart</span>
        </div>
      </div>

      <div className="flex-grow flex flex-col gap-1.5 min-h-0 justify-center">
        <div className="flex gap-1.5">
          <input
            type="text"
            defaultValue={word}
            onBlur={(e) => testWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                testWord((e.target as HTMLInputElement).value);
              }
            }}
            className={`flex-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-center border ${currentIsLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-zinc-950 text-white border-zinc-700'}`}
          />
          <button
            onClick={() => playClap(syllablesCount)}
            className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[8px] font-bold flex gap-1 items-center cursor-pointer active:scale-95 transition-all"
          >
            🔊 Klatschen
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mt-1">
          <div className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-center border dark:border-zinc-700">
            <span className="text-[7.5px] uppercase block opacity-60">Silbenanzahl</span>
            <span className="text-sm font-black text-rose-500 font-mono">{syllablesCount}</span>
          </div>

          <div className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-center border dark:border-zinc-700">
            <span className="text-[7.5px] uppercase block opacity-60">Selbstlaute</span>
            <span className="text-[9.5px]/tight font-black font-mono text-teal-600 truncate block mt-0.5">{vowelsList.join(', ') || '-'}</span>
          </div>

          <div className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-center border dark:border-zinc-700">
            <span className="text-[7.5px] uppercase block opacity-60">Nomen?</span>
            <span className="text-[9.5px]/tight font-black text-indigo-500 block mt-0.5">{isNoun ? "Ja (Groß)" : "Nein (Klein)"}</span>
          </div>
        </div>

        {/* AI block of explanations */}
        <div className="mt-1 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg p-1.5 border border-indigo-200/30 text-left min-h-[38px] flex flex-col justify-center">
          {aiExplanation && (
            <p className="text-[8px] font-medium leading-normal text-slate-700 dark:text-indigo-200">{aiExplanation}</p>
          )}
          {aiStatus !== "idle" && aiStatus !== "success" ? (
            <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-indigo-700 dark:text-indigo-300">
              <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
              {aiStatus !== "loading" && (
                <button type="button" onClick={handleFetchAiExplanation} className="underline font-bold cursor-pointer">Erneut versuchen</button>
              )}
            </div>
          ) : !aiExplanation ? (
            <button
              onClick={handleFetchAiExplanation}
              disabled={isAiLoading}
              className="w-full py-1 text-center font-bold text-[8px] uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="animate-pulse">✨</span> KI-Weisheit & Beispielsatz abrufen!
            </button>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 mt-1">
        <span className="text-[7px] text-center block text-slate-400 dark:text-neutral-500 font-mono">Trage ein Wort ein und drücke Enter. Hol dir dann KI-Unterstützung!</span>
      </div>
    </div>
  );
};


// ========================================================
// 6. WIDGET: WAAGEN-SCHÄTZER (WeightscaleWidgetContent)
// ========================================================
export const WeightscaleWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [mode, setMode] = useState<'free' | 'mystery'>('free');
  const [leftWeight, setLeftWeight] = useState<number>(100);
  const [rightWeight, setRightWeight] = useState<number>(0);
  
  // Mystery Game States
  const mysteryItems = [
    { name: "Apfel 🍏", weight: 150, emoji: "🍏" },
    { name: "Buch 📚", weight: 400, emoji: "📚" },
    { name: "Pokal 🏆", weight: 750, emoji: "🏆" },
    { name: "Diamant 💎", weight: 50, emoji: "💎" },
    { name: "Schulranzen 🎒", weight: 1200, emoji: "🎒" },
    { name: "Kätzchen 🐱", weight: 2000, emoji: "🐱" }
  ];
  const [activeMysteryIdx, setActiveMysteryIdx] = useState<number>(0);
  const [guessChecked, setGuessChecked] = useState<boolean>(false);

  const activeMystery = mysteryItems[activeMysteryIdx];

  const handleModeChange = (newMode: 'free' | 'mystery') => {
    setMode(newMode);
    setRightWeight(0);
    setGuessChecked(false);
    if (newMode === 'free') {
      setLeftWeight(150);
    } else {
      setLeftWeight(mysteryItems[activeMysteryIdx].weight);
    }
  };

  const handleMysteryItemChange = (idx: number) => {
    setActiveMysteryIdx(idx);
    setRightWeight(0);
    setGuessChecked(false);
    setLeftWeight(mysteryItems[idx].weight);
  };

  const addRightWeight = (amount: number) => {
    setRightWeight(prev => Math.min(5000, prev + amount));
  };

  const clearRightWeight = () => {
    setRightWeight(0);
    setGuessChecked(false);
  };

  const diff = leftWeight - rightWeight;
  const rotation = Math.max(-18, Math.min(18, diff * 0.12));

  return (
    <div className="flex flex-col h-full w-full p-2 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      {/* Mode Toggle: direct learning interaction, not hidden configuration */}
      <div className="shrink-0 flex flex-wrap justify-between items-center gap-2 mb-1">
        <span className="text-[10px] font-mono font-bold opacity-70">Gewichte schätzen & vergleichen</span>
        <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-700/50 shrink-0">
          <button
            onClick={() => handleModeChange('free')}
            className={`min-h-11 px-3 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              mode === 'free'
                ? 'bg-accent text-accent-text shadow-sm'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
            }`}
          >
            Frei
          </button>
          <button
            onClick={() => handleModeChange('mystery')}
            className={`min-h-11 px-3 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
              mode === 'mystery'
                ? 'bg-accent text-accent-text shadow-sm'
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700'
            }`}
          >
            Rätsel 🕵️
          </button>
        </div>
      </div>

      {/* Main Board */}
      <div className="flex-grow flex flex-col justify-center items-center py-1 min-h-0">
        {/* Custom Visual Scale SVG */}
        <div className="relative w-full max-w-[150px] aspect-[16/10] flex flex-col items-center justify-end overflow-hidden mb-1.5 bg-slate-500/5 dark:bg-zinc-900/10 rounded-xl p-1 border border-slate-200/20 dark:border-zinc-850">
          
          {/* Mystery target hints */}
          {mode === 'mystery' && (
            <div className="absolute top-1 left-1.5 flex items-center gap-1">
              <span className="text-[9px]">{activeMystery.emoji}</span>
              <span className="text-[7px] font-black uppercase text-amber-500">{activeMystery.name}</span>
            </div>
          )}

          <svg viewBox="0 0 100 60" className="w-full h-full pointer-events-none">
            {/* Stand Base */}
            <path d="M 35 55 L 65 55 L 50 45 Z" fill="#475569" stroke="#334155" strokeWidth="1" />
            <line x1="50" y1="25" x2="50" y2="45" stroke="#475569" strokeWidth="4" />

            {/* Scale beam (rotating) */}
            <g transform={`rotate(${rotation} 50 25)`}>
              {/* Main crossbar */}
              <line x1="15" y1="25" x2="85" y2="25" stroke="#0ea5e9" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="25" r="2.5" fill="#f59e0b" />

              {/* Left Side Hangers and Plate */}
              <line x1="18" y1="25" x2="18" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="18" y1="25" x2="12" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="18" y1="25" x2="24" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 10 40 Q 18 43 26 40" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

              {/* Right Side Hangers and Plate */}
              <line x1="82" y1="25" x2="82" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="82" y1="25" x2="76" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <line x1="82" y1="25" x2="88" y2="40" stroke="#94a3b8" strokeWidth="1" />
              <path d="M 74 40 Q 82 43 90 40" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
            </g>

            {/* Center Pointer / Arrow indicator */}
            <line x1="50" y1="25" x2={50 + Math.sin(rotation * Math.PI / 180) * 12} y2={25 - Math.cos(rotation * Math.PI / 180) * 12} stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          </svg>

          {/* Graphical objects rendered over plates */}
          <div className="absolute inset-x-0 bottom-4 flex justify-between px-3.5 pointer-events-none">
            {/* Left plate object representation */}
            <div className="w-9 flex flex-col items-center justify-end transform transition-transform" style={{ transform: `translateY(${rotation * 0.45}px)` }}>
              {mode === 'mystery' ? (
                <span className="text-xl animate-bounce duration-1000">{activeMystery.emoji}</span>
              ) : (
                <div className="w-5 h-5 rounded bg-accent text-accent-text font-black text-[7.5px] flex items-center justify-center shadow-xs">
                  {leftWeight}g
                </div>
              )}
            </div>

            {/* Right plate object representation */}
            <div className="w-9 flex flex-col items-center justify-end transform transition-transform" style={{ transform: `translateY(${-rotation * 0.45}px)` }}>
              {rightWeight > 0 ? (
                <div className="flex flex-col-reverse items-center justify-end -space-y-1">
                  {/* Visual weight blocks stack */}
                  {rightWeight >= 1000 && <div className="w-6 h-3 bg-amber-600 border border-amber-700 text-[6px] font-bold text-white flex items-center justify-center rounded-sm">1kg</div>}
                  {rightWeight % 1000 >= 500 && <div className="w-5 h-2.5 bg-yellow-600 border border-yellow-700 text-[5px] font-bold text-white flex items-center justify-center rounded-sm">500g</div>}
                  {rightWeight % 500 >= 100 && <div className="w-4 h-2 bg-slate-400 border border-slate-500 text-[5px] font-bold text-white flex items-center justify-center rounded-sm">100g</div>}
                  {rightWeight % 100 > 0 && <div className="w-3 h-1.5 bg-accent border border-accent text-[4px] font-bold text-accent-text flex items-center justify-center rounded-xs">..</div>}
                </div>
              ) : (
                <span className="text-[6.5px] text-slate-400 dark:text-zinc-600 italic">Leer</span>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Controls based on Mode */}
        {mode === 'free' ? (
          <div className="grid grid-cols-2 gap-2 w-full mt-1 shrink-0">
            {/* Left Weights Control */}
            <div className={`p-1.5 rounded-xl border ${currentIsLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-850/40 border-white/5'}`}>
              <div className="text-center font-black text-[7.5px] text-slate-400 dark:text-zinc-500 uppercase">Links: {leftWeight}g</div>
              <div className="flex gap-1 justify-center mt-1">
                <button onClick={() => setLeftWeight(prev => Math.max(0, prev - 50))} className="min-h-11 min-w-11 px-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[10px] font-black cursor-pointer">-50</button>
                <button onClick={() => setLeftWeight(prev => prev + 50)} className="min-h-11 min-w-11 px-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[10px] font-black cursor-pointer">+50</button>
              </div>
            </div>

            {/* Right Weights Control */}
            <div className={`p-1.5 rounded-xl border ${currentIsLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-850/40 border-white/5'}`}>
              <div className="text-center font-black text-[7.5px] text-slate-400 dark:text-zinc-500 uppercase">Rechts: {rightWeight}g</div>
              <div className="flex gap-1 justify-center mt-1">
                <button onClick={() => setRightWeight(prev => Math.max(0, prev - 50))} className="min-h-11 min-w-11 px-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[10px] font-black cursor-pointer">-50</button>
                <button onClick={() => setRightWeight(prev => prev + 50)} className="min-h-11 min-w-11 px-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[10px] font-black cursor-pointer">+50</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1 w-full mt-1 shrink-0">
            {/* Select Mystery Item Selector */}
            <div className="flex flex-wrap gap-1 justify-center py-1">
              {mysteryItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleMysteryItemChange(idx)}
                  className={`min-h-11 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                    activeMysteryIdx === idx
                      ? 'bg-accent border-accent text-accent-text font-black'
                      : currentIsLight 
                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-zinc-850 border-zinc-700/80 text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {item.emoji} {item.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Physical weight adding blocks buttons */}
            <div className={`p-1.5 rounded-xl border ${currentIsLight ? 'bg-slate-50 border-slate-100' : 'bg-zinc-850/40 border-white/5'}`}>
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500 dark:text-zinc-500 mb-1">
                <span>Gewichte rechts hinzufügen:</span>
                <span className="font-mono text-accent font-black">{rightWeight}g</span>
              </div>
              
              <div className="grid grid-cols-4 gap-1">
                {[10, 50, 100, 500].map(amt => (
                  <button
                    key={amt}
                    onClick={() => addRightWeight(amt)}
                    className="min-h-11 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-[10px] font-black cursor-pointer transition-colors"
                  >
                    +{amt}g
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer message / Verification feedback */}
      <div className="shrink-0 flex gap-1.5 items-center justify-between mt-1">
        {mode === 'mystery' && (
          <button
            onClick={clearRightWeight}
            className="min-h-11 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
          >
            Leeren 🗑️
          </button>
        )}
        
        <div className="flex-grow text-center">
          {mode === 'mystery' ? (
            Math.abs(diff) === 0 ? (
              <span className="text-[8.5px] font-black text-emerald-500 animate-bounce block">🎉 Perfekt ausbalanciert! Das Gewicht ist genau {leftWeight}g!</span>
            ) : rightWeight > 0 ? (
              <span className={`text-[10px] font-bold block ${diff > 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {diff > 0 ? "⚠️ Zu leicht! Lege mehr Gewichte auf." : "⚠️ Zu schwer! Nimm Gewicht herunter."}
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">Finde das Gewicht von {activeMystery.emoji} heraus!</span>
            )
          ) : Math.abs(diff) < 10 ? (
            <span className="text-[8px] font-black text-emerald-500 animate-pulse block">🎉 Waage im perfekten Gleichgewicht! (⚖️)</span>
          ) : (
            <span className="text-[7.5px] text-slate-400 dark:text-zinc-500 block">Passe die Gewichte an, um die Waage auszubalancieren</span>
          )}
        </div>
      </div>
    </div>
  );
};


// ========================================================
// 7. WIDGET: BUNDESLÄNDER-FORSCHER (GeographyquizWidgetContent)
// ========================================================
interface GeoState {
  name: string;
  capital: string;
  fact: string;
}

const DE_STATES: GeoState[] = [
  { name: "Wien", capital: "Wien", fact: "Größte Stadt Österreichs mit Stephansdom" },
  { name: "Steiermark", capital: "Graz", fact: "Das grüne Herz Österreichs mit viel Wald" },
  { name: "Salzburg", capital: "Salzburg", fact: "Geburtsort von Mozart & weltberühmten Festspielen" },
  { name: "Tirol", capital: "Innsbruck", fact: "Gebirgsland mit der berühmten Bergisel-Schanze" },
  { name: "Kärnten", capital: "Klagenfurt", fact: "Berühmt für warme Badeseen wie den Wörthersee" },
];

export const GeographyquizWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [activeGeoIndex, setActiveGeoIndex] = useState<number>(0);
  const [userGuess, setUserGuess] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("Errate die Landeshauptstadt!");
  
  // AI State extensions
  const [aiDetails, setAiDetails] = useState<{ rivers: string, mountains: string, funFact: string } | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [aiQuiz, setAiQuiz] = useState<{ question: string, choices: string[], correctIndex: number } | null>(null);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  const [quizFeedback, setQuizFeedback] = useState<string>("");

  const activeState = DE_STATES[activeGeoIndex];

  const checkCapital = () => {
    if (userGuess.trim().toLowerCase() === activeState.capital.toLowerCase()) {
      setFeedback("🎉 Richtig! Fantastisch gemacht!");
    } else {
      setFeedback(`❌ Falsch, versuche es nochmal!`);
    }
  };

  const handleNextState = () => {
    setActiveGeoIndex((activeGeoIndex + 1) % DE_STATES.length);
    setUserGuess("");
    setFeedback("Errate die Landeshauptstadt!");
    setAiDetails(null);
    setAiQuiz(null);
    setQuizFeedback("");
  };

  const fetchAiDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const prompt = `Beschreibe das österreichische Bundesland "${activeState.name}" für Grundschulkinder. Nenne die wichtigsten Flüsse, Seen, Berge und einen witzigen Fakt oder eine Sage.
Antworte exakt in folgendem Format (einzelne Zeile mit Semikolons, kein Markdown):
Flüsse: <Die Flüsse>; Berge: <Berge & Seen>; Fakt: <Lustiger Fakt für Kinder>`;
      const response = await askAI('ki-wissen', prompt);
      if (response && response.includes(';')) {
        const parts = response.split(';');
        let rivers = "Flüsse nicht geladen";
        let mountains = "Berge nicht geladen";
        let funFact = "Fakt nicht geladen";
        parts.forEach(p => {
          const lower = p.toLowerCase().trim();
          if (lower.startsWith('flüsse:')) rivers = p.substring(p.indexOf(':') + 1).trim();
          else if (lower.startsWith('berge:')) mountains = p.substring(p.indexOf(':') + 1).trim();
          else if (lower.startsWith('fakt:') || lower.startsWith('fact:')) funFact = p.substring(p.indexOf(':') + 1).trim();
        });
        setAiDetails({ rivers, mountains, funFact });
      } else {
        setAiDetails({
          rivers: "Flüsse & Seen erkunden! 🌊",
          mountains: "Alpen & Täler erforschen! 🏔️",
          funFact: response || "Schönes Land!"
        });
      }
    } catch (e) {
      setFeedback("Details-AI momentan nicht erreichbar.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchAiQuiz = async () => {
    setIsLoadingQuiz(true);
    setQuizFeedback("");
    try {
      const prompt = `Erstelle eine spannende, kindgerechte Multiple-Choice-Frage über das österreichische Bundesland "${activeState.name}" (Geographie, Natur, Flüsse, Kultur oder Sage).
Der Ausgang MUSS exakt folgendes JSON Format haben (ohne Markdown):
{
  "question": "Kurze Frage?",
  "choices": ["Antwort A", "Antwort B", "Antwort C"],
  "correctIndex": 1
}
Wobei 'correctIndex' der 0-basierte Index (0, 1 oder 2) der richtigen Antwort im choices-Array ist.`;
      const response = await askAI('ki-quiz', prompt);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed && typeof parsed.question === 'string' && Array.isArray(parsed.choices)) {
        setAiQuiz(parsed);
      }
    } catch (e) {
      setQuizFeedback("Quiz-Generation ist fehlgeschlagen.");
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleQuizAnswer = (idx: number) => {
    if (!aiQuiz) return;
    if (idx === aiQuiz.correctIndex) {
      setQuizFeedback("🎉 Genial gelöst! Das stimmt exakt!");
    } else {
      setQuizFeedback(`❌ Oh Schade! Probiere eine andere Antwort.`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🗺️ Bundesländer-Forscher (AUSTRIAN EDITION)
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Geographie spielerisch erkunden</span>
        </div>
        <button
          onClick={handleNextState}
          className="px-1.5 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[7px] cursor-pointer"
        >
          Nächstes Land ➔
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-start py-1 min-h-0 gap-1.5">
        <div className="bg-slate-100/50 dark:bg-zinc-800/40 rounded-xl p-1.5 border dark:border-zinc-700 text-center">
          <span className="text-xs font-black text-rose-500 tracking-wide uppercase">{activeState.name}</span>
          <p className="text-[8px] text-center opacity-80 block my-0.5">{activeState.fact}</p>

          <div className="flex gap-1.5 items-center w-full mt-1.5 justify-center">
            <input
              type="text"
              value={userGuess}
              onChange={(e) => setUserGuess(e.target.value)}
              placeholder="Hauptstadt..."
              className={`flex-1 max-w-[100px] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-center border ${currentIsLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-zinc-950 text-white border-zinc-700'}`}
            />
            <button
              onClick={checkCapital}
              className="px-2 py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-black text-[8px] uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
            >
              Prüfen
            </button>
          </div>
          <p className="text-[7.5px] font-bold text-blue-500 mt-1">{feedback}</p>
        </div>

        {/* AI Geography Details Block */}
        <div className="bg-amber-100/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-xl p-1.5 min-h-[45px] flex flex-col justify-center">
          {aiDetails ? (
            <div className="text-[7.5px]/tight text-left text-slate-800 dark:text-amber-200 font-medium space-y-1">
              <p>🌊 <span className="font-extrabold text-blue-500">Gewässer:</span> {aiDetails.rivers}</p>
              <p>🏔️ <span className="font-extrabold text-emerald-500">Landschaft:</span> {aiDetails.mountains}</p>
              <p>💡 <span className="font-extrabold text-amber-500">Fun Fact:</span> {aiDetails.funFact}</p>
            </div>
          ) : (
            <button
              onClick={fetchAiDetails}
              disabled={isLoadingDetails}
              className="w-full text-center font-bold text-[7.5px] uppercase text-amber-600 dark:text-amber-400 hover:text-amber-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              {isLoadingDetails ? "Erforsche Gewässer & Berge... 🧭" : "🧭 Naturforsche starten (Flüsse, Berge, Seen)"}
            </button>
          )}
        </div>

        {/* AI Quiz Trivia Questions Block */}
        <div className="bg-indigo-100/10 dark:bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-1.5 min-h-[45px] flex flex-col justify-center text-center">
          {aiQuiz ? (
            <div className="space-y-1.5">
              <p className="text-[8px] font-extrabold text-indigo-700 dark:text-indigo-300 leading-tight">❓ Geographie-Quiz: {aiQuiz.question}</p>
              <div className="flex gap-1 justify-center">
                {aiQuiz.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuizAnswer(i)}
                    className="px-1.5 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[7px]"
                  >
                    {choice}
                  </button>
                ))}
              </div>
              {quizFeedback && <p className="text-[7.5px] font-black text-emerald-500">{quizFeedback}</p>}
            </div>
          ) : (
            <button
              onClick={fetchAiQuiz}
              disabled={isLoadingQuiz}
              className="w-full text-center font-bold text-[7.5px] uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center justify-center gap-1 cursor-pointer"
            >
              {isLoadingQuiz ? "Generiere Quiz-Frage... 🧠" : "❓ Interaktive KI-Spezialfrage laden"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ========================================================
// ========================================================
// 8. WIDGET: NATUR-MISCHPULT / FOKUS-KLÄNGE (CalmrainWidgetContent)
// ========================================================
export const CalmrainWidgetContent: React.FC<CalmSoundsWidgetProps> = (props) => {
  return <CalmSoundsWidget {...props} />;
};


// ========================================================
// 9. WIDGET: SCHÄTZ-GLAS (EstimationjarWidgetContent)
// ========================================================
export const EstimationjarWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "estimationjar", {
    contentType: "beads" as "beads" | "marbles" | "stars" | "cookies" | "gummybears" | "coins",
    difficulty: "medium" as "easy" | "medium" | "hard",
    jarCount: 36,
    userGuess: 35,
    revealed: false,
    feedback: "Schätze die Menge, ohne jedes Stück einzeln zu zählen.",
  });
  const [contentType, setContentType] = useState<'beads' | 'marbles' | 'stars' | 'cookies' | 'gummybears' | 'coins'>(() => lifecycle.contentType);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(() => lifecycle.difficulty);
  const [jarCount, setJarCount] = useState<number>(() => lifecycle.jarCount);
  const [userGuess, setUserGuess] = useState<number>(() => lifecycle.userGuess);
  const [revealed, setRevealed] = useState<boolean>(() => lifecycle.revealed);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "estimationjar"));
  const previousContentTypeRef = useRef(contentType);
  const previousDifficultyRef = useRef(difficulty);

  usePersistedWidgetLifecycleState(widget, onUpdate, "estimationjar", {
    contentType,
    difficulty,
    jarCount,
    userGuess,
    revealed,
    feedback,
  });

  const contentMeta = {
    beads: { singular: 'Perle', plural: 'Perlen', emoji: '🔴' },
    marbles: { singular: 'Murmel', plural: 'Murmeln', emoji: '🔮' },
    stars: { singular: 'Stern', plural: 'Sterne', emoji: '⭐' },
    cookies: { singular: 'Keks', plural: 'Kekse', emoji: '🍪' },
    gummybears: { singular: 'Gummibärchen', plural: 'Gummibärchen', emoji: '🧸' },
    coins: { singular: 'Münze', plural: 'Münzen', emoji: '🪙' },
  } as const;

  const ranges = {
    easy: { min: 10, max: 25, step: 1 },
    medium: { min: 25, max: 60, step: 5 },
    hard: { min: 60, max: 120, step: 5 },
  } as const;

  const activeRange = ranges[difficulty];
  const activeContent = contentMeta[contentType];

  const regenerateJar = useCallback((nextDifficulty: 'easy' | 'medium' | 'hard' = difficulty) => {
    const range = ranges[nextDifficulty];
    const count = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const roundedGuess = Math.round(count / range.step) * range.step;
    setJarCount(count);
    setUserGuess(Math.max(range.min, Math.min(range.max, roundedGuess)));
    setRevealed(false);
    setFeedback(`Schätze: Wie viele ${contentMeta[contentType].plural} sind im Glas?`);
  }, [difficulty, contentType]);

  useEffect(() => {
    const contentChanged = previousContentTypeRef.current !== contentType;
    const difficultyChanged = previousDifficultyRef.current !== difficulty;
    previousContentTypeRef.current = contentType;
    previousDifficultyRef.current = difficulty;

    if (!didRestoreRef.current || contentChanged || difficultyChanged) {
      didRestoreRef.current = true;
      regenerateJar(difficulty);
    }
  }, [difficulty, contentType, regenerateJar]);

  const handleValidation = () => {
    setRevealed(true);
    const diff = Math.abs(userGuess - jarCount);
    const tolerance = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 5 : 10;
    if (diff === 0) {
      setFeedback(`Exakt getroffen: ${jarCount} ${activeContent.plural}.`);
    } else if (diff <= tolerance) {
      setFeedback(`Sehr gut geschätzt: ${jarCount} ${activeContent.plural}, nur ${diff} daneben.`);
    } else {
      setFeedback(`Es sind ${jarCount} ${activeContent.plural}. Deine Schätzung lag ${diff} daneben.`);
    }
  };

  const itemCoords = useMemo(() => {
    const list: Array<{ x: number; y: number; scale: number; color: string }> = [];
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    for (let i = 0; i < 120; i += 1) {
      const cols = 8;
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = 12 + col * 10.6 + (row % 2 ? 4 : 0);
      const y = 8 + row * 5.8;
      list.push({
        x,
        y,
        scale: 0.86 + ((i * 7) % 8) / 50,
        color: colors[i % colors.length],
      });
    }
    return list;
  }, []);

  const clusterMarks = useMemo(() => {
    if (difficulty === 'easy') return [5, 10, 15, 20, 25];
    if (difficulty === 'medium') return [10, 20, 30, 40, 50, 60];
    return [20, 40, 60, 80, 100, 120];
  }, [difficulty]);

  const setGuess = (value: number) => {
    setUserGuess(Math.max(activeRange.min, Math.min(activeRange.max, value)));
    setRevealed(false);
  };

  const guessDifference = userGuess - jarCount;
  const nearestTen = Math.round(jarCount / 10) * 10;
  const reflectionText = guessDifference === 0
    ? 'Deine Schätzung war exakt.'
    : guessDifference > 0
      ? `Du hast um ${guessDifference} zu hoch geschätzt.`
      : `Du hast um ${Math.abs(guessDifference)} zu niedrig geschätzt.`;

  const renderItem = (index: number) => {
    const coord = itemCoords[index];
    if (contentType === 'beads') {
      return <div className="w-full h-full rounded-full shadow-sm" style={{ backgroundColor: coord.color }} />;
    }
    if (contentType === 'marbles') {
      return <div className="w-full h-full rounded-full border border-white/50 shadow-sm" style={{ background: `radial-gradient(circle at 30% 30%, white, ${coord.color})` }} />;
    }
    return <span className="leading-none">{activeContent.emoji}</span>;
  };

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Inhalt auswählen">
          {(Object.keys(contentMeta) as Array<keyof typeof contentMeta>).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              className={`min-h-11 px-2.5 rounded-lg border text-xs font-bold ${
                contentType === type
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {contentMeta[type].emoji} {contentMeta[type].plural}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Schwierigkeitsstufe">
          {(['easy', 'medium', 'hard'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              className={`min-h-11 px-3 rounded-lg border text-xs font-bold ${
                difficulty === level
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {level === 'easy' ? '10–25' : level === 'medium' ? '25–60' : '60–120'}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        Schätz-Tipp: Teile das Glas gedanklich in Gruppen von 5 oder 10 statt jedes Stück einzeln zu zählen.
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-5">
        <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-t-[2rem] rounded-b-[4rem] border-4 border-slate-400/80 dark:border-slate-600 bg-slate-100/30 dark:bg-slate-900/40 shadow-xl overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-8 rounded-b-xl bg-amber-800 border-b-2 border-amber-950" />
          <div className="absolute inset-y-8 left-3 w-3 rounded-full bg-white/25 pointer-events-none" />
          {itemCoords.slice(0, jarCount).map((coord, index) => (
            <div
              key={index}
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                left: `${coord.x}%`,
                bottom: `${coord.y}%`,
                width: difficulty === 'hard' ? '8%' : difficulty === 'medium' ? '9%' : '11%',
                aspectRatio: '1',
                transform: `scale(${coord.scale})`,
                fontSize: difficulty === 'hard' ? '14px' : difficulty === 'medium' ? '17px' : '20px',
              }}
            >
              {renderItem(index)}
            </div>
          ))}

          <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none">
            {clusterMarks.map((mark) => {
              const relative = (mark - activeRange.min) / Math.max(1, activeRange.max - activeRange.min);
              return (
                <div
                  key={mark}
                  className="absolute left-2 right-2 border-t border-dashed border-slate-400/35"
                  style={{ bottom: `${Math.max(4, Math.min(94, relative * 90))}%` }}
                />
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deine Schätzung</div>
            <div className="mt-1 text-4xl font-black tabular-nums text-accent">{userGuess}</div>
          </div>

          <div className="grid grid-cols-[44px_1fr_44px] gap-2 items-center">
            <button
              type="button"
              onClick={() => setGuess(userGuess - activeRange.step)}
              className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-black text-lg hover:border-accent"
              aria-label={`Schätzung um ${activeRange.step} verringern`}
            >
              −
            </button>
            <input
              type="range"
              min={activeRange.min}
              max={activeRange.max}
              step={activeRange.step}
              value={userGuess}
              onChange={(event) => setGuess(Number(event.target.value))}
              className="w-full h-11 accent-accent cursor-pointer"
              aria-label="Menge schätzen"
            />
            <button
              type="button"
              onClick={() => setGuess(userGuess + activeRange.step)}
              className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-black text-lg hover:border-accent"
              aria-label={`Schätzung um ${activeRange.step} erhöhen`}
            >
              +
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              activeRange.min,
              Math.round((activeRange.min + activeRange.max) / 3 / activeRange.step) * activeRange.step,
              Math.round(((activeRange.min + activeRange.max) * 2 / 3) / activeRange.step) * activeRange.step,
              activeRange.max,
            ].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setGuess(value)}
                className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
              >
                {value}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={revealed ? () => regenerateJar(difficulty) : handleValidation}
            className="min-h-11 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black text-sm"
          >
            {revealed ? 'Neues Glas' : 'Schätzung prüfen'}
          </button>
        </div>
      </div>

      {revealed && (
        <>
        <div className="shrink-0 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Geschätzt</div>
            <div className="text-lg font-black">{userGuess}</div>
          </div>
          <div className="rounded-xl border border-accent/30 bg-accent-soft px-2 py-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Tatsächlich</div>
            <div className="text-lg font-black">{jarCount}</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-2">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Abweichung</div>
            <div className="text-lg font-black">{Math.abs(userGuess - jarCount)}</div>
          </div>
        </div>

        <div className="shrink-0 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
          {reflectionText} Die tatsächliche Menge liegt nahe bei {nearestTen}. Nutze beim nächsten Mal 10er-Gruppen als Orientierung.
        </div>
        </>
      )}

      <p
        aria-live="polite"
        className="shrink-0 min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        {feedback}
      </p>
    </div>
  );
};


export const ReflexgameWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [gameState, setGameState] = useState<'idle' | 'waiting' | 'trigger' | 'done'>('idle');
  const [triggerTime, setTriggerTime] = useState<number>(0);
  const [leftScore, setLeftScore] = useState<number | null>(null);
  const [rightScore, setRightScore] = useState<number | null>(null);
  const [winnerMessage, setWinnerMessage] = useState<string>("Bist du schneller?");
  const triggerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTriggerTimer = useCallback(() => {
    if (triggerTimerRef.current) {
      clearTimeout(triggerTimerRef.current);
      triggerTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTriggerTimer(), [clearTriggerTimer]);

  const triggerReaction = () => {
    clearTriggerTimer();
    setGameState('waiting');
    setLeftScore(null);
    setRightScore(null);
    setWinnerMessage("Konzentration … wartet auf das Signal!");

    const delay = Math.floor(Math.random() * 3000) + 2000;
    triggerTimerRef.current = setTimeout(() => {
      triggerTimerRef.current = null;
      setGameState('trigger');
      setTriggerTime(performance.now());
      setWinnerMessage("💥 JETZT DRÜCKEN! 💥");
    }, delay);
  };

  const handleTap = (side: 'left' | 'right') => {
    if (gameState === 'waiting') {
      clearTriggerTimer();
      setWinnerMessage(side === 'left' ? "🔴 Links: Fehlstart!" : "🔵 Rechts: Fehlstart!");
      setGameState('idle');
      return;
    }

    if (gameState !== 'trigger') return;

    const elapsed = Math.max(0, Math.round(performance.now() - triggerTime));
    if (side === 'left') {
      setLeftScore(elapsed);
      setWinnerMessage(`🏆 Team LINKS gewinnt! (${elapsed} ms)`);
    } else {
      setRightScore(elapsed);
      setWinnerMessage(`🏆 Team RECHTS gewinnt! (${elapsed} ms)`);
    }
    setGameState('done');
  };

  const waiting = gameState === 'waiting';
  const ready = gameState === 'trigger';

  return (
    <div className="flex flex-col h-full w-full p-2.5 select-none min-h-0 overflow-hidden gap-2">
      <div className="shrink-0 flex flex-wrap justify-between items-center gap-2">
        <span className="text-[10px] font-mono font-bold opacity-70">
          Reaktionszeit-Duell · links A · rechts L
        </span>
        <button
          onClick={triggerReaction}
          disabled={waiting}
          className="min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black text-[10px] uppercase tracking-wide transition-all active:scale-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {waiting ? "Warten …" : gameState === 'done' ? "Nochmal" : "Start Duell ⏱️"}
        </button>
      </div>

      <div className="flex-grow grid grid-cols-2 gap-2 min-h-0">
        <button
          type="button"
          onClick={() => handleTap('left')}
          aria-label="Team Links drücken"
          className={`min-h-11 rounded-2xl border-2 flex flex-col justify-center items-center cursor-pointer transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${ready
            ? 'bg-rose-500 border-rose-600 text-white animate-pulse'
            : currentIsLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-zinc-800 border-zinc-700 text-neutral-200'}`}
        >
          <span className="text-[10px] uppercase tracking-widest block opacity-70">Team Rot</span>
          <span className="text-sm font-black">LINKS · A</span>
          {leftScore !== null && <span className="text-sm font-mono mt-1 font-black">{leftScore} ms</span>}
        </button>

        <button
          type="button"
          onClick={() => handleTap('right')}
          aria-label="Team Rechts drücken"
          className={`min-h-11 rounded-2xl border-2 flex flex-col justify-center items-center cursor-pointer transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${ready
            ? 'bg-cyan-500 border-cyan-600 text-white animate-pulse'
            : currentIsLight
              ? 'bg-slate-50 border-slate-200 text-slate-800'
              : 'bg-zinc-800 border-zinc-700 text-neutral-200'}`}
        >
          <span className="text-[10px] uppercase tracking-widest block opacity-70">Team Blau</span>
          <span className="text-sm font-black">RECHTS · L</span>
          {rightScore !== null && <span className="text-sm font-mono mt-1 font-black">{rightScore} ms</span>}
        </button>
      </div>

      <div
        className={`shrink-0 min-h-11 rounded-xl px-3 flex items-center justify-center text-center font-extrabold ${ready
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-base animate-pulse'
          : waiting
            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px]'
            : 'bg-slate-100/70 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-[11px]'}`}
        aria-live="polite"
      >
        {winnerMessage}
      </div>
    </div>
  );
};


// ========================================================
// 11. WIDGET: MATHE-PYRAMIDE (MathpyramidWidgetContent)
// ========================================================
export const MathpyramidWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  type Difficulty = 'easy' | 'medium' | 'hard';
  const [level, setLevel] = useState<Difficulty>('medium');
  const [range, setRange] = useState<10 | 20 | 100 | 1000>(100);
  const [blocks, setBlocks] = useState<number[]>([15, 8, 7, 5, 3, 4]);
  const [given, setGiven] = useState<boolean[]>([false, true, true, false, true, false]);
  const [userInputs, setUserInputs] = useState<string[]>(['', '8', '7', '', '3', '']);
  const [checked, setChecked] = useState<boolean[]>([false, false, false, false, false, false]);
  const [feedback, setFeedback] = useState<string>('Jeder Stein ist die Summe der zwei Steine darunter.');
  const [showHint, setShowHint] = useState(false);

  const generatePyramid = useCallback((difficulty: Difficulty, r: number) => {
    let b1 = 1;
    let b2 = 1;
    let b3 = 1;
    let top = r + 1;

    // Generate until the complete pyramid really stays inside the selected number range.
    while (top > r) {
      const maxBottom = Math.max(2, Math.floor(r / 4));
      b1 = Math.floor(Math.random() * maxBottom) + 1;
      b2 = Math.floor(Math.random() * maxBottom) + 1;
      b3 = Math.floor(Math.random() * maxBottom) + 1;
      top = b1 + 2 * b2 + b3;
    }

    const m1 = b1 + b2;
    const m2 = b2 + b3;
    const fullPyramid = [top, m1, m2, b1, b2, b3];
    setBlocks(fullPyramid);

    let showIndices: number[];
    if (difficulty === 'easy') {
      // All base stones given: calculate upwards.
      showIndices = [3, 4, 5];
    } else if (difficulty === 'medium') {
      // Three independent clues: requires forward and backward thinking.
      showIndices = [1, 2, 4];
    } else {
      // Still exactly solvable: top + one middle + its outer base stone determine the rest.
      showIndices = Math.random() > 0.5 ? [0, 1, 3] : [0, 2, 5];
    }

    const nextGiven = Array.from({ length: 6 }, (_, index) => showIndices.includes(index));
    setGiven(nextGiven);
    setUserInputs(fullPyramid.map((value, index) => nextGiven[index] ? String(value) : ''));
    setChecked(Array(6).fill(false));
    setShowHint(false);
    setFeedback('Jeder Stein ist die Summe der zwei Steine darunter.');
  }, []);

  useEffect(() => {
    generatePyramid(level, range);
  }, [level, range, generatePyramid]);

  const playPyramidChime = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const frequencies = success ? [523.25, 659.25, 783.99] : [150];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.08;
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(success ? 0.06 : 0.08, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.24);
      });
    } catch {}
  };

  const updateInput = (index: number, raw: string) => {
    if (given[index]) return;
    const value = raw.replace(/[^0-9]/g, '').slice(0, 4);
    setUserInputs((current) => current.map((entry, entryIndex) => entryIndex === index ? value : entry));
    setChecked((current) => current.map((entry, entryIndex) => entryIndex === index ? false : entry));
    setShowHint(false);
  };

  const checkAnswer = () => {
    const missingIndices = given.map((isGiven, index) => !isGiven && userInputs[index].trim() === '' ? index : -1).filter((index) => index >= 0);
    if (missingIndices.length > 0) {
      setFeedback(`Es fehlen noch ${missingIndices.length} ${missingIndices.length === 1 ? 'Stein' : 'Steine'}.`);
      return;
    }

    const nextChecked = userInputs.map((value, index) => given[index] || Number(value) === blocks[index]);
    setChecked(nextChecked);
    const allCorrect = nextChecked.every(Boolean);

    if (allCorrect) {
      setFeedback('Alles richtig – die Pyramide stimmt.');
      playPyramidChime(true);
    } else {
      const wrongCount = nextChecked.filter((correct, index) => !given[index] && !correct).length;
      setFeedback(`${wrongCount} ${wrongCount === 1 ? 'Stein stimmt' : 'Steine stimmen'} noch nicht. Prüfe die Nachbarsteine.`);
      playPyramidChime(false);
    }
  };

  const isComplete = checked.every(Boolean);
  const editableIndices = given.map((isGiven, index) => isGiven ? -1 : index).filter((index) => index >= 0);
  const correctEditableCount = editableIndices.filter((index) => checked[index] && Number(userInputs[index]) === blocks[index]).length;
  const nextBlankIndex = editableIndices.find((index) => userInputs[index].trim() === '') ?? editableIndices.find((index) => !checked[index]) ?? -1;

  const hintForIndex = (index: number) => {
    if (index === 0) return 'Für den obersten Stein brauchst du die beiden Steine direkt darunter.';
    if (index === 1) return given[3] || userInputs[3] ? 'Links in der Mitte: untere linke Zahl + untere mittlere Zahl.' : 'Nutze den obersten Stein zusammen mit dem rechten Mittelstein.';
    if (index === 2) return given[5] || userInputs[5] ? 'Rechts in der Mitte: untere mittlere Zahl + untere rechte Zahl.' : 'Nutze den obersten Stein zusammen mit dem linken Mittelstein.';
    if (index === 3) return 'Unterer linker Stein: linker Mittelstein minus unterer Mittelstein.';
    if (index === 4) return 'Unterer Mittelstein verbindet beide Mittelsteine. Suche eine passende Differenz.';
    if (index === 5) return 'Unterer rechter Stein: rechter Mittelstein minus unterer Mittelstein.';
    return 'Suche zuerst einen Stein, bei dem zwei benachbarte Werte schon bekannt sind.';
  };

  const renderStone = (index: number) => {
    const isGiven = given[index];
    const hasBeenChecked = checked[index];
    const valueCorrect = Number(userInputs[index]) === blocks[index];
    return (
      <input
        key={index}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={isGiven ? `Vorgegebener Stein ${blocks[index]}` : `Fehlenden Pyramidenstein ${index + 1} eintragen`}
        readOnly={isGiven || (hasBeenChecked && valueCorrect)}
        value={userInputs[index]}
        onChange={(event) => updateInput(index, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            checkAnswer();
          }
        }}
        className={`w-16 sm:w-20 min-h-14 sm:min-h-16 text-center font-black text-lg sm:text-xl rounded-xl border-2 shadow-sm transition-all outline-none ${
          isGiven
            ? currentIsLight
              ? 'bg-slate-100 text-slate-800 border-slate-300'
              : 'bg-slate-800 text-slate-100 border-slate-600'
            : hasBeenChecked && valueCorrect
              ? 'bg-emerald-500 text-white border-emerald-600'
              : hasBeenChecked
                ? 'bg-rose-50 text-rose-800 border-rose-400 focus:border-rose-500 dark:bg-rose-950/40 dark:text-rose-200'
                : currentIsLight
                  ? 'bg-white text-slate-900 border-accent/40 focus:border-accent focus:ring-2 focus:ring-accent/20'
                  : 'bg-slate-900 text-slate-100 border-accent/50 focus:border-accent focus:ring-2 focus:ring-accent/20'
        }`}
      />
    );
  };

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1" role="group" aria-label="Schwierigkeitsstufe">
          {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              onClick={() => setLevel(difficulty)}
              className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                level === difficulty
                  ? 'bg-accent text-accent-text shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
              }`}
            >
              {difficulty === 'easy' ? 'Einfach' : difficulty === 'medium' ? 'Mittel' : 'Schwer'}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Zahlenraum">
          {([10, 20, 100, 1000] as const).map((numberRange) => (
            <button
              key={numberRange}
              type="button"
              onClick={() => setRange(numberRange)}
              className={`min-h-11 px-2.5 rounded-lg text-xs font-bold border transition-colors ${
                range === numberRange
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              ZR {numberRange}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        Regel: Zwei Nachbarsteine addieren → der Stein darüber.
      </div>

      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-500 dark:text-slate-400" aria-label="Legende">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-400 bg-slate-200 dark:bg-slate-700" />
            Vorgegeben
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-accent bg-white dark:bg-slate-900" />
            Selbst rechnen
          </span>
        </div>
        <span className="font-bold tabular-nums text-slate-600 dark:text-slate-300">
          {correctEditableCount}/{editableIndices.length} gelöst
        </span>
      </div>

      <div className="flex-1 min-h-0 flex flex-col justify-center items-center gap-3 sm:gap-4 py-2" aria-label="Zahlenpyramide">
        <div className="flex justify-center">{renderStone(0)}</div>
        <div className="flex justify-center gap-3 sm:gap-4">
          {renderStone(1)}
          {renderStone(2)}
        </div>
        <div className="flex justify-center gap-3 sm:gap-4">
          {renderStone(3)}
          {renderStone(4)}
          {renderStone(5)}
        </div>
      </div>

      {showHint && !isComplete && nextBlankIndex >= 0 && (
        <div className="shrink-0 rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
          Denk-Tipp: {hintForIndex(nextBlankIndex)}
        </div>
      )}

      <div className="shrink-0 flex flex-wrap gap-2">
        {!isComplete && (
          <button
            type="button"
            onClick={() => setShowHint((visible) => !visible)}
            className="min-h-11 px-3 rounded-xl border border-accent/30 bg-accent-soft text-accent font-bold text-sm hover:border-accent"
            aria-pressed={showHint}
          >
            {showHint ? 'Tipp ausblenden' : 'Denk-Tipp'}
          </button>
        )}
        <button
          type="button"
          onClick={checkAnswer}
          disabled={isComplete}
          className="flex-1 min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 text-accent-text font-black text-sm shadow-sm"
        >
          {isComplete ? 'Gelöst' : 'Pyramide prüfen'}
        </button>
        <button
          type="button"
          onClick={() => generatePyramid(level, range)}
          className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
        >
          Neue Pyramide
        </button>
      </div>

      <p
        aria-live="polite"
        className={`shrink-0 min-h-11 rounded-xl border px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold ${
          isComplete
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            : checked.some(Boolean) && checked.some((correct, index) => !given[index] && !correct)
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        {feedback}
      </p>
    </div>
  );
};


// ========================================================
// 12. WIDGET: MÜLL-TRENNER RECYCLING (WastebinWidgetContent)
// ========================================================
interface WasteItem {
  id: number;
  name: string;
  emoji: string;
  binType: 'bio' | 'papier' | 'gelb' | 'sonder' | 'rest';
  explanation: string;
}

export const WastebinWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const wasteDatabase: WasteItem[] = useMemo(() => [
    { id: 1, name: 'Apfelrest', emoji: '🍎', binType: 'bio', explanation: 'Obst- und Gemüsereste gehören normalerweise in den Biomüll oder auf den Kompost.' },
    { id: 2, name: 'Bananenschale', emoji: '🍌', binType: 'bio', explanation: 'Obstschalen sind Bioabfall und können kompostiert werden.' },
    { id: 3, name: 'Welke Blumen', emoji: '🥀', binType: 'bio', explanation: 'Pflanzenreste gehören normalerweise zum Bioabfall.' },
    { id: 4, name: 'Zeitung', emoji: '📰', binType: 'papier', explanation: 'Sauberes Papier gehört ins Altpapier.' },
    { id: 5, name: 'Karton', emoji: '📦', binType: 'papier', explanation: 'Sauberer Karton gehört gefaltet ins Altpapier.' },
    { id: 6, name: 'Schulheft ohne Plastikhülle', emoji: '📓', binType: 'papier', explanation: 'Papierhefte ohne Kunststoffteile können ins Altpapier.' },
    { id: 7, name: 'Joghurtbecher', emoji: '🥛', binType: 'gelb', explanation: 'Leere Verpackungen aus Kunststoff gehören in die Sammlung für Leicht- und Metallverpackungen.' },
    { id: 8, name: 'Getränkedose', emoji: '🥫', binType: 'gelb', explanation: 'Leere Metallverpackungen gehören in die Verpackungssammlung.' },
    { id: 9, name: 'Getränkekarton', emoji: '🧃', binType: 'gelb', explanation: 'Getränkekartons werden über die Verpackungssammlung erfasst.' },
    { id: 10, name: 'Batterie', emoji: '🔋', binType: 'sonder', explanation: 'Batterien gehören nicht in den Restmüll. Sie müssen zu einer Batteriesammelstelle oder Rücknahmestelle.' },
    { id: 11, name: 'LED-Lampe', emoji: '💡', binType: 'sonder', explanation: 'LED- und Energiesparlampen gehören zur Elektro- bzw. Problemstoffsammlung, nicht in den Restmüll.' },
    { id: 12, name: 'Kaputter Taschenrechner', emoji: '🧮', binType: 'sonder', explanation: 'Elektrogeräte gehören zur Elektroaltgerätesammlung.' },
    { id: 13, name: 'Benutztes Pflaster', emoji: '🩹', binType: 'rest', explanation: 'Benutzte Hygieneartikel gehören in den Restmüll.' },
    { id: 14, name: 'Kaugummi', emoji: '🍬', binType: 'rest', explanation: 'Kaugummi gehört in den Restmüll.' },
    { id: 15, name: 'Kaputtes Plastiklineal', emoji: '📐', binType: 'rest', explanation: 'Ein Lineal ist keine Verpackung und gehört normalerweise in den Restmüll.' },
  ], []);

  const bins = [
    { id: 'bio' as const, label: 'Biomüll', hint: 'Küchen- & Pflanzenreste', rule: 'organisch und kompostierbar', icon: '🌱', surface: 'bg-emerald-600', text: 'text-white' },
    { id: 'papier' as const, label: 'Altpapier', hint: 'sauberes Papier & Karton', rule: 'sauber und überwiegend aus Papier', icon: '📄', surface: 'bg-blue-600', text: 'text-white' },
    { id: 'gelb' as const, label: 'Verpackung', hint: 'Kunststoff & Metall', rule: 'eine leere Verpackung', icon: '♻️', surface: 'bg-amber-400', text: 'text-slate-900' },
    { id: 'sonder' as const, label: 'Sammelstelle', hint: 'Batterien & Elektro', rule: 'gefährlich, elektrisch oder speziell zu sammeln', icon: '⚠️', surface: 'bg-rose-600', text: 'text-white' },
    { id: 'rest' as const, label: 'Restmüll', hint: 'nicht verwertbarer Rest', rule: 'kein Bioabfall, kein Papier und keine Verpackung', icon: '🗑️', surface: 'bg-slate-700', text: 'text-white' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [feedback, setFeedback] = useState('Wähle die passende Entsorgung.');

  const currentItem = wasteDatabase[currentIndex % wasteDatabase.length];

  const pickNewItem = useCallback(() => {
    setCurrentIndex((current) => {
      let next = current;
      while (next === current && wasteDatabase.length > 1) {
        next = Math.floor(Math.random() * wasteDatabase.length);
      }
      return next;
    });
    setSelectedBin(null);
    setAnswered(false);
    setFeedback('Wähle die passende Entsorgung.');
  }, [wasteDatabase.length]);

  useEffect(() => {
    setCurrentIndex(Math.floor(Math.random() * wasteDatabase.length));
  }, [wasteDatabase.length]);

  const handleRecycle = (type: WasteItem['binType']) => {
    if (answered) return;
    setSelectedBin(type);
    setAnswered(true);
    setAttemptCount((count) => count + 1);
    const correct = currentItem.binType === type;
    if (correct) {
      setCorrectCount((count) => count + 1);
      setFeedback('Richtig zugeordnet.');
    } else {
      const correctBin = bins.find((bin) => bin.id === currentItem.binType);
      setFeedback(`Noch nicht. Passend ist: ${correctBin?.label ?? 'andere Sammlung'}.`);
    }
  };

  const accuracy = attemptCount === 0 ? 0 : Math.round((correctCount / attemptCount) * 100);
  const correctBinMeta = bins.find((bin) => bin.id === currentItem.binType)!;

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Übung</div>
          <div className="text-sm font-black text-slate-900 dark:text-slate-100">{correctCount}/{attemptCount || 0} richtig</div>
        </div>
        {attemptCount > 0 && (
          <div className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Trefferquote</div>
            <div className="text-lg font-black text-accent">{accuracy}%</div>
          </div>
        )}
      </div>

      <div className={`flex-1 min-h-44 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 px-4 py-5 transition-colors ${
        answered
          ? selectedBin === currentItem.binType
            ? 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800'
            : 'bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-800'
          : currentIsLight
            ? 'bg-white border-slate-200'
            : 'bg-slate-900 border-slate-700'
      }`}>
        <div className="text-6xl sm:text-7xl" aria-hidden="true">{currentItem.emoji}</div>
        <div className="text-xl sm:text-2xl font-black text-center text-slate-900 dark:text-slate-100">{currentItem.name}</div>
        {!answered && (
          <div className="text-sm text-center text-slate-500 dark:text-slate-400">Wohin gehört dieser Gegenstand?</div>
        )}
        {answered && (
          <div className="max-w-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 px-3 py-2 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Warum?</div>
            <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{currentItem.explanation}</div>
            <div className="mt-2 rounded-lg bg-accent-soft border border-accent/20 px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
              Merkregel: {correctBinMeta.rule}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        Denkregel: Ist es Bioabfall, Papier, Verpackung, Problemstoff/Elektro oder bleibt nur Restmüll?
      </div>

      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {bins.map((bin) => {
          const isSelected = selectedBin === bin.id;
          const isCorrect = answered && currentItem.binType === bin.id;
          const isWrongSelected = answered && isSelected && !isCorrect;
          return (
            <button
              key={bin.id}
              type="button"
              onClick={() => handleRecycle(bin.id)}
              disabled={answered}
              aria-pressed={isSelected}
              className={`min-h-20 rounded-2xl border-2 px-2 py-3 font-bold shadow-sm transition-all disabled:cursor-default ${
                isCorrect
                  ? 'ring-4 ring-emerald-300 border-emerald-600'
                  : isWrongSelected
                    ? 'ring-4 ring-rose-300 border-rose-600'
                    : 'border-transparent hover:scale-[1.02] active:scale-95'
              } ${bin.surface} ${bin.text}`}
            >
              <span className="block text-2xl" aria-hidden="true">{bin.icon}</span>
              <span className="block mt-1 text-sm">{bin.label}</span>
              <span className="block mt-0.5 text-[11px] font-semibold opacity-80">{bin.hint}</span>
            </button>
          );
        })}
      </div>

      {answered && (
        <button
          type="button"
          onClick={pickNewItem}
          className="shrink-0 min-h-11 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black text-sm"
        >
          Nächster Gegenstand
        </button>
      )}

      <p
        aria-live="polite"
        className="shrink-0 min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        {feedback}
      </p>

      <p className="shrink-0 text-[11px] text-center text-slate-500 dark:text-slate-400">
        Hinweis: Entsorgungsregeln können regional abweichen. Im Zweifel gelten die Vorgaben der örtlichen Gemeinde bzw. Abfallberatung.
      </p>
    </div>
  );
};


interface Melody {
  name: string;
  emoji: string;
  notes: { label: string; index: number }[];
}

export const TonetrainerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  type Instrument = 'xylophon' | 'glockenspiel' | 'klavier';
  type Mode = 'freeplay' | 'memory' | 'learn';

  const notes = useMemo(() => [
    { label: 'C', freq: 261.63, color: 'bg-rose-500 border-rose-400', key: '1' },
    { label: 'D', freq: 293.66, color: 'bg-orange-500 border-orange-400', key: '2' },
    { label: 'E', freq: 329.63, color: 'bg-amber-500 border-amber-400', key: '3' },
    { label: 'F', freq: 349.23, color: 'bg-emerald-500 border-emerald-400', key: '4' },
    { label: 'G', freq: 392.0, color: 'bg-blue-500 border-blue-400', key: '5' },
    { label: 'A', freq: 440.0, color: 'bg-cyan-600 border-cyan-500', key: '6' },
    { label: 'H', freq: 493.88, color: 'bg-violet-500 border-violet-400', key: '7' },
    { label: 'C₂', freq: 523.25, color: 'bg-fuchsia-500 border-fuchsia-400', key: '8' },
  ], []);

  const melodies: Melody[] = useMemo(() => [
    {
      name: 'Alle meine Entchen',
      emoji: '🦆',
      notes: [
        { label: 'C', index: 0 }, { label: 'D', index: 1 }, { label: 'E', index: 2 }, { label: 'F', index: 3 },
        { label: 'G', index: 4 }, { label: 'G', index: 4 }, { label: 'A', index: 5 }, { label: 'A', index: 5 },
        { label: 'A', index: 5 }, { label: 'A', index: 5 }, { label: 'G', index: 4 },
      ],
    },
    {
      name: 'Bruder Jakob',
      emoji: '🔔',
      notes: [
        { label: 'C', index: 0 }, { label: 'D', index: 1 }, { label: 'E', index: 2 }, { label: 'C', index: 0 },
        { label: 'C', index: 0 }, { label: 'D', index: 1 }, { label: 'E', index: 2 }, { label: 'C', index: 0 },
        { label: 'E', index: 2 }, { label: 'F', index: 3 }, { label: 'G', index: 4 },
      ],
    },
    {
      name: 'Kuckuck',
      emoji: '🌲',
      notes: [
        { label: 'G', index: 4 }, { label: 'E', index: 2 }, { label: 'G', index: 4 }, { label: 'E', index: 2 },
        { label: 'F', index: 3 }, { label: 'D', index: 1 }, { label: 'D', index: 1 }, { label: 'C', index: 0 },
      ],
    },
  ], []);

  const [instrument, setInstrument] = useState<Instrument>('xylophon');
  const [mode, setMode] = useState<Mode>('freeplay');
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('Spiele frei oder wähle eine Hörübung.');
  const [memoryLength, setMemoryLength] = useState(4);
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [memoryStep, setMemoryStep] = useState(0);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [selectedMelody, setSelectedMelody] = useState<Melody>(melodies[0]);
  const [melodyStep, setMelodyStep] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    setIsPlayingSequence(false);
    setActiveNote(null);
  }, []);

  useEffect(() => () => {
    clearTimers();
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
    }
  }, [clearTimers]);

  const getAudioContext = () => {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  };

  const playSingleFreq = (freq: number) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);

    if (instrument === 'xylophon') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.46);
      return;
    }

    if (instrument === 'glockenspiel') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 2, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.1);
      return;
    }

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.13, now);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
    master.connect(ctx.destination);
    [1, 2, 3].forEach((multiple, index) => {
      const osc = ctx.createOscillator();
      osc.type = index === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq * multiple, now);
      const partial = ctx.createGain();
      partial.gain.setValueAtTime(1 / (index + 1), now);
      osc.connect(partial).connect(master);
      osc.start(now);
      osc.stop(now + 1.12);
    });
  };

  const flashAndPlay = (index: number) => {
    setActiveNote(index);
    playSingleFreq(notes[index].freq);
    const timer = window.setTimeout(() => setActiveNote((current) => current === index ? null : current), 260);
    timersRef.current.push(timer);
  };

  const playSequence = (sequence: number[]) => {
    clearTimers();
    setIsPlayingSequence(true);
    setFeedback('Höre genau hin.');
    sequence.forEach((noteIndex, sequenceIndex) => {
      const timer = window.setTimeout(() => {
        flashAndPlay(noteIndex);
        if (sequenceIndex === sequence.length - 1) {
          const finishTimer = window.setTimeout(() => {
            setIsPlayingSequence(false);
            setMemoryStep(0);
            setFeedback('Jetzt du: Spiele die Töne in derselben Reihenfolge.');
          }, 420);
          timersRef.current.push(finishTimer);
        }
      }, sequenceIndex * 620);
      timersRef.current.push(timer);
    });
  };

  const playScale = () => {
    clearTimers();
    setMode('freeplay');
    setFeedback('Höre die Tonleiter: Jeder Ton wird Schritt für Schritt höher.');
    notes.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        flashAndPlay(index);
        if (index === notes.length - 1) {
          const finishTimer = window.setTimeout(() => {
            setFeedback('C bis C₂ bilden zusammen eine Oktave.');
          }, 400);
          timersRef.current.push(finishTimer);
        }
      }, index * 420);
      timersRef.current.push(timer);
    });
  };

  const startMemory = () => {
    const sequence = Array.from({ length: memoryLength }, () => Math.floor(Math.random() * notes.length));
    setMode('memory');
    setMemorySequence(sequence);
    setMemoryStep(0);
    playSequence(sequence);
  };

  const startLearning = (melody: Melody) => {
    clearTimers();
    setMode('learn');
    setSelectedMelody(melody);
    setMelodyStep(0);
    setFeedback(`Starte mit ${melody.notes[0].label}.`);
  };

  const handleTap = (index: number) => {
    if (isPlayingSequence) return;
    flashAndPlay(index);

    if (mode === 'memory' && memorySequence.length > 0) {
      if (index !== memorySequence[memoryStep]) {
        setMemoryStep(0);
        setFeedback('Das war ein anderer Ton. Hör die Folge noch einmal an und achte auf die Richtung der Tonhöhen.');
        return;
      }
      const nextStep = memoryStep + 1;
      if (nextStep >= memorySequence.length) {
        setMemoryStep(0);
        setFeedback('Richtig nachgespielt.');
      } else {
        setMemoryStep(nextStep);
        setFeedback(`Richtig. Noch ${memorySequence.length - nextStep} ${memorySequence.length - nextStep === 1 ? 'Ton' : 'Töne'}.`);
      }
    }

    if (mode === 'learn') {
      const expected = selectedMelody.notes[melodyStep];
      if (index !== expected.index) {
        setFeedback(`Höre auf den Zielton: Als Nächstes kommt ${expected.label}.`);
        return;
      }
      const nextStep = melodyStep + 1;
      if (nextStep >= selectedMelody.notes.length) {
        setFeedback(`${selectedMelody.name} geschafft. Spiele es noch einmal oder wähle ein anderes Lied.`);
        setMelodyStep(0);
      } else {
        setMelodyStep(nextStep);
        setFeedback(`Gut. Nächster Ton: ${selectedMelody.notes[nextStep].label}.`);
      }
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, select, textarea, [contenteditable="true"]')) return;
      const noteIndex = notes.findIndex((note) => note.key === event.key);
      if (noteIndex >= 0 && !event.repeat) {
        event.preventDefault();
        handleTap(noteIndex);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const barHeights = [176, 164, 152, 140, 128, 116, 104, 92];

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1" role="tablist" aria-label="Tontrainer-Modus">
          {([
            ['freeplay', 'Freispiel'],
            ['memory', 'Nachspielen'],
            ['learn', 'Lied lernen'],
          ] as Array<[Mode, string]>).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => {
                clearTimers();
                setMode(value);
                if (value === 'freeplay') setFeedback('Spiele frei auf den Klangstäben.');
                if (value === 'learn') startLearning(selectedMelody);
              }}
              className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold ${
                mode === value ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
          Klang
          <select
            value={instrument}
            onChange={(event) => setInstrument(event.target.value as Instrument)}
            className="ml-2 min-h-11 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 font-bold"
          >
            <option value="xylophon">Xylophon</option>
            <option value="glockenspiel">Glockenspiel</option>
            <option value="klavier">Klavier</option>
          </select>
        </label>
      </div>

      {mode === 'memory' && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
          {[3, 4, 6].map((length) => (
            <button
              key={length}
              type="button"
              onClick={() => setMemoryLength(length)}
              className={`min-h-11 px-3 rounded-xl border font-bold text-sm ${
                memoryLength === length ? 'bg-accent text-accent-text border-accent' : 'border-slate-300 dark:border-slate-700 hover:border-accent'
              }`}
            >
              {length} Töne
            </button>
          ))}
          <button
            type="button"
            onClick={startMemory}
            disabled={isPlayingSequence}
            className="min-h-11 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black disabled:opacity-40"
          >
            Neue Folge
          </button>
          {memorySequence.length > 0 && (
            <button
              type="button"
              onClick={() => playSequence(memorySequence)}
              disabled={isPlayingSequence}
              className="min-h-11 px-4 rounded-xl border border-accent/40 bg-accent-soft text-accent font-bold disabled:opacity-40"
            >
              Nochmal anhören
            </button>
          )}
        </div>
      )}

      {mode === 'learn' && (
        <div className="shrink-0 flex flex-wrap items-center justify-center gap-2">
          {melodies.map((melody) => (
            <button
              key={melody.name}
              type="button"
              onClick={() => startLearning(melody)}
              className={`min-h-11 px-3 rounded-xl border font-bold text-sm ${
                selectedMelody.name === melody.name
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 hover:border-accent'
              }`}
            >
              {melody.emoji} {melody.name}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mode === 'freeplay' && 'Entdecke: Von links nach rechts werden die Töne höher. C bis C₂ ist eine Oktave.'}
        {mode === 'memory' && `Hören → merken → nachspielen. Fortschritt: ${memoryStep}/${memorySequence.length || memoryLength}`}
        {mode === 'learn' && `${selectedMelody.name}: Ton ${melodyStep + 1} von ${selectedMelody.notes.length} · Ziel: ${selectedMelody.notes[melodyStep]?.label}`}
      </div>

      {mode === 'freeplay' && (
        <div className="shrink-0 flex justify-center">
          <button
            type="button"
            onClick={playScale}
            className="min-h-11 px-4 rounded-xl border border-accent/40 bg-accent-soft text-accent font-bold text-sm hover:border-accent"
          >
            Tonleiter anhören
          </button>
        </div>
      )}

      <div className="shrink-0 flex items-center justify-between gap-3 text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
        <span>tiefer</span>
        <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-slate-300 via-accent/50 to-accent" aria-label="Tonhöhe steigt von links nach rechts" />
        <span>höher</span>
      </div>

      <div className={`flex-1 min-h-60 rounded-2xl border px-3 py-5 flex items-end justify-center gap-2 sm:gap-3 ${
        currentIsLight ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-900 border-slate-700'
      }`}>
        {notes.map((note, index) => {
          const isActive = activeNote === index;
          const isLearnTarget = mode === 'learn' && selectedMelody.notes[melodyStep]?.index === index;
          return (
            <button
              key={note.label}
              type="button"
              onClick={() => handleTap(index)}
              disabled={isPlayingSequence}
              aria-label={`Ton ${note.label} spielen, Taste ${note.key}`}
              className={`relative min-w-10 sm:min-w-12 rounded-xl border-2 text-white font-black shadow-md transition-all active:translate-y-1 disabled:cursor-default ${note.color} ${
                isActive ? 'ring-4 ring-white scale-105' : ''
              } ${isLearnTarget ? 'ring-4 ring-accent ring-offset-2 dark:ring-offset-slate-900' : ''}`}
              style={{ height: barHeights[index] }}
            >
              <span className="block text-lg">{note.label}</span>
              {isLearnTarget && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-1 text-[10px] text-accent-text shadow-sm">
                  Nächster Ton
                </span>
              )}
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
                {note.key}
              </span>
            </button>
          );
        })}
      </div>

      <p
        aria-live="polite"
        className="shrink-0 min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        {feedback}
      </p>
    </div>
  );
};


// ========================================================
// 14. WIDGET: WINKEL-DETEKTIV (AngledetectiveWidgetContent)
// ========================================================
export const AngledetectiveWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  type Level = 'basic' | 'mixed' | 'precise';
  const lifecycle = readWidgetLifecycleState(widget, "angledetective", {
    level: "mixed" as Level,
    targetAngle: 90,
    guessAngle: 90,
    isRevealed: false,
    feedback: "Schätze zuerst die Winkelart und dann den Gradwert.",
  });
  const [level, setLevel] = useState<Level>(() => lifecycle.level);
  const [targetAngle, setTargetAngle] = useState<number>(() => lifecycle.targetAngle);
  const [guessAngle, setGuessAngle] = useState<number>(() => lifecycle.guessAngle);
  const [isRevealed, setIsRevealed] = useState<boolean>(() => lifecycle.isRevealed);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "angledetective"));
  const previousLevelRef = useRef(level);

  usePersistedWidgetLifecycleState(widget, onUpdate, "angledetective", {
    level,
    targetAngle,
    guessAngle,
    isRevealed,
    feedback,
  });

  const getAngleType = (angle: number) => {
    if (angle === 90) return 'rechter Winkel';
    if (angle === 180) return 'gestreckter Winkel';
    if (angle < 90) return 'spitzer Winkel';
    return 'stumpfer Winkel';
  };

  const generateAngle = useCallback((difficulty: Level = level) => {
    const basic = [30, 45, 60, 90, 120, 135, 150, 180];
    const mixed = [20, 30, 40, 45, 60, 75, 90, 105, 120, 135, 150, 160, 180];
    const precise = Array.from({ length: 17 }, (_, index) => (index + 1) * 10);
    const angles = difficulty === 'basic' ? basic : difficulty === 'mixed' ? mixed : precise;
    const picked = angles[Math.floor(Math.random() * angles.length)];
    setTargetAngle(picked);
    setGuessAngle(90);
    setIsRevealed(false);
    setFeedback('Welche Winkelart siehst du? Schätze danach den Gradwert.');
  }, [level]);

  useEffect(() => {
    const levelChanged = previousLevelRef.current !== level;
    previousLevelRef.current = level;
    if (!didRestoreRef.current || levelChanged) {
      didRestoreRef.current = true;
      generateAngle(level);
    }
  }, [level, generateAngle]);

  const handleReveal = () => {
    setIsRevealed(true);
    const diff = Math.abs(guessAngle - targetAngle);
    if (diff <= 5) {
      setFeedback(`Sehr genau: ${targetAngle}° ist ein ${getAngleType(targetAngle)}.`);
    } else if (diff <= 15) {
      setFeedback(`Gut geschätzt. Ziel: ${targetAngle}°, Abweichung: ${diff}°.`);
    } else {
      setFeedback(`Ziel: ${targetAngle}°. Dein Tipp liegt ${diff}° daneben. Vergleiche mit 90°.`);
    }
  };

  const renderProtractorTicks = () => {
    const ticks = [];
    for (let angle = 0; angle <= 180; angle += 10) {
      const rad = (angle - 180) * Math.PI / 180;
      const major = angle % 30 === 0;
      const r1 = major ? 34 : 38;
      const r2 = 44;
      ticks.push(
        <line
          key={angle}
          x1={50 + r1 * Math.cos(rad)}
          y1={50 + r1 * Math.sin(rad)}
          x2={50 + r2 * Math.cos(rad)}
          y2={50 + r2 * Math.sin(rad)}
          stroke={major ? '#64748b' : currentIsLight ? '#cbd5e1' : '#475569'}
          strokeWidth={major ? 1.5 : 0.8}
        />
      );
    }
    return ticks;
  };

  const getSectorPath = (angle: number, radius: number) => {
    const startRad = Math.PI;
    const endRad = (180 + angle) * Math.PI / 180;
    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const angleType = getAngleType(targetAngle);
  const estimateDiff = Math.abs(guessAngle - targetAngle);
  const relationToRightAngle = targetAngle === 90 ? 'genau 90°' : targetAngle < 90 ? 'kleiner als 90°' : 'größer als 90°';

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Winkel-Schwierigkeit">
          {(['basic', 'mixed', 'precise'] as const).map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              onClick={() => setLevel(difficulty)}
              className={`min-h-11 px-3 rounded-lg border text-xs sm:text-sm font-bold ${
                level === difficulty
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {difficulty === 'basic' ? 'Grundwinkel' : difficulty === 'mixed' ? 'Gemischt' : '10°-Schritte'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => generateAngle(level)}
          className="min-h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
        >
          Neuer Winkel
        </button>
      </div>

      <div className="shrink-0 rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
        Denk zuerst: Ist der Winkel kleiner, genau oder größer als 90°?
      </div>

      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-bold">
        {[
          ['< 90°', 'spitz'],
          ['90°', 'recht'],
          ['90–180°', 'stumpf'],
          ['180°', 'gestreckt'],
        ].map(([rangeLabel, typeLabel]) => (
          <div key={typeLabel} className="rounded-xl border border-slate-200 dark:border-slate-700 px-2 py-2 text-center bg-slate-50 dark:bg-slate-800">
            <div className="text-slate-500 dark:text-slate-400">{rangeLabel}</div>
            <div className="mt-0.5 text-slate-900 dark:text-slate-100">{typeLabel}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-5">
        <div className="relative w-64 h-36 sm:w-72 sm:h-40">
          <svg className="w-full h-full" viewBox="0 0 100 55" role="img" aria-label="Winkel mit Halbkreis-Winkelmesser">
            <path d="M 6 50 A 44 44 0 0 1 94 50" fill="none" stroke={currentIsLight ? '#cbd5e1' : '#475569'} strokeWidth="1.5" />
            {renderProtractorTicks()}
            <line x1="50" y1="50" x2="8" y2="50" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="50" y1="50" x2="50" y2="16" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" aria-label="90 Grad Referenz" />
            <path d={getSectorPath(targetAngle, 30)} fill="rgba(59,130,246,0.18)" stroke="#3b82f6" strokeWidth="2" />
            <line
              x1="50"
              y1="50"
              x2={50 + 30 * Math.cos((180 + targetAngle) * Math.PI / 180)}
              y2={50 + 30 * Math.sin((180 + targetAngle) * Math.PI / 180)}
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {isRevealed && (
              <line
                x1="50"
                y1="50"
                x2={50 + 27 * Math.cos((180 + guessAngle) * Math.PI / 180)}
                y2={50 + 27 * Math.sin((180 + guessAngle) * Math.PI / 180)}
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
            )}
            <circle cx="50" cy="50" r="2.8" fill="#334155" />
            <text x="7" y="54" fontSize="5" fill="#64748b">0°</text>
            <text x="47" y="7" fontSize="5" fill="#64748b">90°</text>
            <text x="88" y="54" fontSize="5" fill="#64748b">180°</text>
          </svg>
        </div>

        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-center">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deine Schätzung</div>
            <div className="mt-1 text-4xl font-black tabular-nums text-accent">{guessAngle}°</div>
          </div>

          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
            Winkel einstellen
            <input
              type="range"
              min="0"
              max="180"
              step={level === 'precise' ? 10 : 5}
              value={guessAngle}
              onChange={(event) => {
                setGuessAngle(Number(event.target.value));
                setIsRevealed(false);
              }}
              className="mt-2 w-full h-11 accent-accent cursor-pointer"
              aria-label="Geschätzten Winkel einstellen"
            />
          </label>

          <div className="grid grid-cols-4 gap-2">
            {[45, 90, 135, 180].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setGuessAngle(preset);
                  setIsRevealed(false);
                }}
                className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
              >
                {preset}°
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={isRevealed ? () => generateAngle(level) : handleReveal}
            className="min-h-11 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black text-sm"
          >
            {isRevealed ? 'Nächster Winkel' : 'Schätzung prüfen'}
          </button>
        </div>
      </div>

      {isRevealed && (
        <div className="shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center">
            <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Lösung</div>
            <div className="text-lg font-black text-slate-900 dark:text-slate-100">{targetAngle}°</div>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-center bg-slate-50 dark:bg-slate-800">
            <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Winkelart</div>
            <div className="text-sm font-black text-slate-900 dark:text-slate-100">{angleType}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{relationToRightAngle}</div>
          </div>
          <div className={`rounded-xl border px-3 py-2 text-center ${
            estimateDiff <= 5
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
              : estimateDiff <= 15
                ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
                : 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800'
          }`}>
            <div className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Abweichung</div>
            <div className="text-lg font-black tabular-nums">{estimateDiff}°</div>
          </div>
        </div>
      )}

      <p
        aria-live="polite"
        className="shrink-0 min-h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300"
      >
        {feedback}
      </p>
    </div>
  );
};


// ========================================================
// 15. WIDGET: REIM-MASCHINE (RhymemachineWidgetContent)
// ========================================================
interface RhymeWord {
  base: string;
  rhyme: string;
  wrongs: string[];
}

export const RhymemachineWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const wordsDatabase: RhymeWord[] = useMemo(() => [
    { base: "Maus", rhyme: "Haus", wrongs: ["Hose", "Baum", "Katz"] },
    { base: "Baum", rhyme: "Traum", wrongs: ["Hand", "Buch", "Lied"] },
    { base: "Katz", rhyme: "Spatz", wrongs: ["Mund", "Blume", "Stift"] },
    { base: "Kopf", rhyme: "Topf", wrongs: ["Brot", "Fenster", "Schrank"] },
    { base: "Sonne", rhyme: "Tonne", wrongs: ["Wolke", "Regen", "Mond"] },
    { base: "Hand", rhyme: "Sand", wrongs: ["Wand", "Ball", "Buch"] },
    { base: "Kind", rhyme: "Wind", wrongs: ["Vogel", "Hund", "Schule"] },
    { base: "Hund", rhyme: "Mund", wrongs: ["Zahn", "Nase", "Fuß"] },
    { base: "Schaf", rhyme: "Schlaf", wrongs: ["Woll", "Berg", "Gras"] },
    { base: "Rose", rhyme: "Hose", wrongs: ["Garten", "Duft", "Blatt"] },
    { base: "Zahn", rhyme: "Bahn", wrongs: ["Kopf", "Weg", "Rad"] },
    { base: "Brot", rhyme: "Rot", wrongs: ["Teig", "Butter", "Käse"] },
    { base: "Flug", rhyme: "Zug", wrongs: ["Luft", "Himmel", "Reise"] },
    { base: "Stein", rhyme: "Bein", wrongs: ["Sand", "Kies", "Kopf"] },
    { base: "Fisch", rhyme: "Tisch", wrongs: ["Wasser", "See", "Netz"] },
    { base: "Ball", rhyme: "Knall", wrongs: ["Tor", "Spiel", "Wiese"] },
    { base: "Licht", rhyme: "Gesicht", wrongs: ["Lampe", "Tag", "Dunkel"] },
    { base: "Wald", rhyme: "Kalt", wrongs: ["Baum", "Blatt", "Natur"] },
    { base: "Bär", rhyme: "Meer", wrongs: ["Honig", "Wald", "Tatz"] },
    { base: "Schuh", rhyme: "Kuh", wrongs: ["Socke", "Leder", "Schritt"] }
  ], []);

  const lifecycle = readWidgetLifecycleState(widget, "rhymemachine", {
    activeWordIdx: 0,
    choices: [] as string[],
    spinning: false,
    feedback: "Zieh den Hebel um ein deutsches Wort zu drehen! 🎰",
    poem: "",
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
  });
  const [activeWordIdx, setActiveWordIdx] = useState<number>(() => lifecycle.activeWordIdx);
  const [choices, setChoices] = useState<string[]>(() => lifecycle.choices);
  const [spinning, setSpinning] = useState<boolean>(() => lifecycle.spinning);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const [poem, setPoem] = useState<string>(() => lifecycle.poem);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isPoemLoading = aiStatus === "loading";

  usePersistedWidgetLifecycleState(widget, onUpdate, "rhymemachine", {
    activeWordIdx,
    choices,
    spinning,
    feedback,
    poem,
    aiStatus,
    aiError,
  });

  const spinMachine = useCallback(() => {
    setSpinning(true);
    setPoem("");
    setAiStatus("idle");
    setAiError(null);
    setFeedback("🎰 Slot rattert... 🎰");

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.setValueAtTime(600 + i * 50, ctx.currentTime);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
          }, i * 120);
        }
      }
    } catch {}

    setTimeout(() => {
      const pickedIdx = Math.floor(Math.random() * wordsDatabase.length);
      setActiveWordIdx(pickedIdx);
      const picked = wordsDatabase[pickedIdx];

      const opt = [picked.rhyme, ...picked.wrongs].sort(() => Math.random() - 0.5);
      setChoices(opt);
      setSpinning(false);
      setFeedback("Finde das passende Reimwort! 🎯");
    }, 800);
  }, [wordsDatabase]);

  const fetchPoem = async () => {
    const active = wordsDatabase[activeWordIdx];
    if (!active) return;
    setAiStatus("loading");
    setAiError(null);
    try {
      const prompt = `Schreibe ein kurzes, witziges, kindgerechtes deutsches Gedicht (exakt 4 Zeilen) im Paarreim (AABB).
Das Gedicht MUSS die Reimwörter "${active.base}" und "${active.rhyme}" am Ende von Zeile 1 und Zeile 2 enthalten.
Beispiel-Thema: Niedlich, humorvoll, über Tiere, Schule oder Kinder-Alltag.
Antworte NUR mit dem Gedicht (4 Zeilen getrennt durch Zeilenumbruch, max. 30 Wörter). Keine Einleitung, kein Titel!`;
      const result = await askAI('ki-wissen', prompt);
      if (result) {
        setPoem(result);
        setAiStatus("success");
      } else {
        const status: WidgetAiStatus = "error";
        setAiStatus(status);
        setAiError(getWidgetAiStatusMessage(status));
      }
    } catch (e) {
      const status = classifyWidgetAiError(e);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };

  useEffect(() => {
    spinMachine();
  }, [spinMachine]);

  const speakRhymeTone = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        [500, 650, 800, 1000].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.07);
          gain.gain.setValueAtTime(0.06, ctx.currentTime + idx * 0.07);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.07 + 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.07);
          osc.stop(ctx.currentTime + idx * 0.07 + 0.15);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {}
  };

  const handleGuess = (word: string) => {
    const core = wordsDatabase[activeWordIdx];
    if (word === core.rhyme) {
      setFeedback(`🎉 Absolut richtig! "${core.base}" reimt sich auf "${word}"!`);
      speakRhymeTone(true);
    } else {
      setFeedback(`❌ Daneben! "${core.base}" reimt sich nicht auf "${word}".`);
      speakRhymeTone(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🎰 Reim-Maschine {poem && "✨ AI"}
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Sprachgefühl & Reime schulen</span>
        </div>
        <button
          onClick={spinMachine}
          disabled={spinning}
          className="px-1.5 py-0.5 rounded bg-indigo-500 text-white font-bold text-[7.5px] active:scale-95 transition-all"
        >
          🎰 Drehen!
        </button>
      </div>

      <div className="flex-grow flex flex-col justify-center items-center py-1.5 min-h-0">
        <div className="border-3 border-teal-500 bg-amber-50 rounded-2xl p-1.5 text-center px-4 shadow-md bg-opacity-90 max-w-[120px] transition-transform duration-300 animate-pulse relative text-slate-800">
          <span className="text-[7px] uppercase tracking-widest text-teal-600 block font-black">Das Wort:</span>
          <span className="text-sm font-black text-slate-900 leading-none">
            {spinning ? "🎰..." : wordsDatabase[activeWordIdx]?.base}
          </span>
        </div>

        {!spinning && (
          <div className="grid grid-cols-2 gap-1 w-full max-w-[180px] mt-2 scale-95">
            {choices.map((it, idx) => (
              <button
                key={idx}
                onClick={() => handleGuess(it)}
                className={`py-1 rounded-lg border font-black text-[8px] tracking-wide active:scale-95 transition-all cursor-pointer ${
                  currentIsLight 
                    ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800' 
                    : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white'
                }`}
              >
                🔊 {it}
              </button>
            ))}
          </div>
        )}

        {/* AI Poem Box */}
        {!spinning && (
          <div className="w-full mt-2 bg-indigo-50/50 dark:bg-indigo-950/25 border border-indigo-100 dark:border-indigo-900/40 rounded-xl p-1.5 min-h-[35px] flex flex-col justify-center">
            {poem && (
              <div className="text-center font-mono italic text-[7.5px]/tight text-indigo-900 dark:text-indigo-200 whitespace-pre-line font-medium">
                {poem}
              </div>
            )}
            {aiStatus !== "idle" && aiStatus !== "success" ? (
              <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-indigo-700 dark:text-indigo-300">
                <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
                {aiStatus !== "loading" && (
                  <button type="button" onClick={fetchPoem} className="underline font-bold cursor-pointer">Erneut versuchen</button>
                )}
              </div>
            ) : !poem ? (
              <button
                onClick={fetchPoem}
                disabled={isPoemLoading}
                className="w-full py-0.5 text-center font-bold text-[7.5px] uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center justify-center gap-1 cursor-pointer"
              >
                📝 ✨ Eigenes Gedicht mit KI dichten!
              </button>
            ) : null}
          </div>
        )}
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};


// ========================================================
// 16. WIDGET: BUCHSTABEN-SUPPE (AlphabetsoupWidgetContent)
// ========================================================
const SOUP_DICTS: Record<'easy' | 'medium' | 'hard' | 'extreme', string[]> = {
  easy: ["KIND", "MAMA", "PAPA", "BUCH", "ZEIT", "SPIEL", "HEFT", "MAUS", "BAUM", "HAUS", "KATZE", "AUTO", "VOGEL"],
  medium: ["SCHULE", "KREIDE", "KLASSE", "LERNEN", "PAUSE", "POSTER", "RECHNEN", "FRAGEN", "DENKEN", "WISSEN", "FERIEN", "LEHRER"],
  hard: ["SCHREIBEN", "ZEICHNEN", "ZEUGNIS", "COMPUTER", "TAFELBILD", "SPIELPLATZ", "WISSENSCHAFT", "KLASSENZIMMER", "FERIENZEIT"],
  extreme: ["LEHRERZIMMER", "DEUTSCHUNTERRICHT", "HAUSAUFGABENHEFT", "ZUSAMMENGESETZT", "BUCHSTABENSUPPE", "QUERSUMMENROBOTER", "DAMPFSCHIFFFAHRT"]
};

export const AlphabetsoupWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const { app } = useApp();
  const lifecycle = readWidgetLifecycleState(widget, "alphabetsoup", {
    difficulty: "medium" as "easy" | "medium" | "hard" | "extreme",
    aiDictionary: null as string[] | null,
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
    targetWord: "SCHULE",
    letters: [] as { id: number; char: string; x: number; y: number; color: string }[],
    userInput: "",
    consumedIds: [] as number[],
    feedback: "Tippe schwimmende Zutaten-Buchstaben! 🍲",
  });
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(() => lifecycle.difficulty);
  const [aiDictionary, setAiDictionary] = useState<string[] | null>(() => lifecycle.aiDictionary);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isLoadingAI = aiStatus === "loading";

  const activeDictionary = useMemo(() => {
    if (aiDictionary) return aiDictionary;
    return SOUP_DICTS[difficulty];
  }, [difficulty, aiDictionary]);

  const averageNiveau = useMemo(() => {
    if (!app.schueler || app.schueler.length === 0) return 3;
    const sum = app.schueler.reduce((acc, s) => acc + (s.niveau || 3), 0);
    return Math.round(sum / app.schueler.length);
  }, [app.schueler]);

  const loadAISoup = async () => {
    setAiStatus("loading");
    setAiError(null);
    try {
      const apiDiff = difficulty === 'easy' ? 'leicht' : difficulty === 'medium' ? 'mittel' : difficulty === 'hard' ? 'schwer' : 'extrem';
      const result = await generateWidgetTasks("alphabetsoup", app.stufe || 4, averageNiveau, apiDiff);
      if (result && result.tasks && Array.isArray(result.tasks) && result.tasks.length > 0) {
        setAiDictionary(result.tasks);
        setFeedback("✨ Frische KI-Suppenwörter geladen!");
        setAiStatus("success");
      } else {
        const status: WidgetAiStatus = "error";
        setAiStatus(status);
        setAiError(getWidgetAiStatusMessage(status));
      }
    } catch (e) {
      const status = classifyWidgetAiError(e);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };
  
  const [targetWord, setTargetWord] = useState<string>(() => lifecycle.targetWord);
  const [letters, setLetters] = useState<{ id: number, char: string, x: number, y: number, color: string }[]>(() => lifecycle.letters);
  const [userInput, setUserInput] = useState<string>(() => lifecycle.userInput);
  const [consumedIds, setConsumedIds] = useState<number[]>(() => lifecycle.consumedIds);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "alphabetsoup"));
  const previousDifficultyRef = useRef(difficulty);
  const previousDictionaryRef = useRef(activeDictionary);

  usePersistedWidgetLifecycleState(widget, onUpdate, "alphabetsoup", {
    difficulty,
    aiDictionary,
    aiStatus,
    aiError,
    targetWord,
    letters,
    userInput,
    consumedIds,
    feedback,
  });

  const startNewSoup = useCallback(() => {
    if (activeDictionary.length === 0) return;
    const pickedWord = activeDictionary[Math.floor(Math.random() * activeDictionary.length)];
    setTargetWord(pickedWord);
    setUserInput("");
    setConsumedIds([]);
    setFeedback(`Buchstabiere "${pickedWord}"!`);

    // Split target word into letters
    const pool = pickedWord.split("");
    
    // Add distractors based on difficulty
    const distractorCounts = { easy: 2, medium: 4, hard: 6, extreme: 8 };
    const distractors = distractorCounts[difficulty];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < distractors; i++) {
      pool.push(alphabet[Math.floor(Math.random() * alphabet.length)]);
    }

    // Shuffle pool
    const shuffledPool = pool
      .map((char, index) => ({ char, sortVal: Math.random(), index }))
      .sort((a, b) => a.sortVal - b.sortVal);

    const bubbleColors = [
      'bg-amber-200 dark:bg-amber-300 text-amber-950', 
      'bg-emerald-200 dark:bg-emerald-300 text-emerald-950', 
      'bg-sky-200 dark:bg-sky-300 text-sky-950', 
      'bg-rose-200 dark:bg-rose-300 text-rose-950', 
      'bg-violet-200 dark:bg-violet-300 text-violet-950', 
      'bg-yellow-200 dark:bg-yellow-300 text-yellow-950'
    ];

    const bubbleList = shuffledPool.map((item, index) => {
      // Keep within bounds of the soup bowl: x: 10% to 80%, y: 10% to 75%
      const angle = (index / shuffledPool.length) * 2 * Math.PI;
      const radiusX = 35; // percentage radius
      const radiusY = 25;
      const cx = 45;
      const cy = 40;
      const x = cx + radiusX * Math.cos(angle) + (Math.random() * 8 - 4);
      const y = cy + radiusY * Math.sin(angle) + (Math.random() * 8 - 4);

      return {
        id: item.index,
        char: item.char,
        x: Math.max(5, Math.min(85, x)),
        y: Math.max(5, Math.min(80, y)),
        color: bubbleColors[index % bubbleColors.length],
      };
    });

    setLetters(bubbleList);
  }, [activeDictionary, difficulty]);

  useEffect(() => {
    const difficultyChanged = previousDifficultyRef.current !== difficulty;
    const dictionaryChanged = previousDictionaryRef.current !== activeDictionary;
    previousDifficultyRef.current = difficulty;
    previousDictionaryRef.current = activeDictionary;

    if (!didRestoreRef.current || difficultyChanged || dictionaryChanged) {
      didRestoreRef.current = true;
      startNewSoup();
    }
  }, [startNewSoup, difficulty, activeDictionary]);

  // Reset when difficulty changes
  useEffect(() => {
    setAiDictionary(null);
    setAiStatus("idle");
    setAiError(null);
  }, [difficulty]);

  const triggerBubblePop = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 180;
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch {}
  };

  const handleBubbleClick = (item: { char: string, id: number }) => {
    if (consumedIds.includes(item.id)) return;

    const nextInput = userInput + item.char;
    const newConsumed = [...consumedIds, item.id];
    setUserInput(nextInput);
    setConsumedIds(newConsumed);
    triggerBubblePop(true);

    if (!targetWord.startsWith(nextInput)) {
      setFeedback("⚠️ Oh nein, das war falsch buchstabiert!");
      setUserInput("");
      setConsumedIds([]);
      triggerBubblePop(false);
      return;
    }

    if (nextInput === targetWord) {
      setFeedback(`🎉 Perfekt Gelöst! "${targetWord}" ist geschafft!`);
      setTimeout(() => startNewSoup(), 1200);
    } else {
      setFeedback("👍 Richtig! Finde den nächsten Buchstaben!");
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex flex-col gap-1 mb-1 pb-1 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
              🥣 Buchstaben-Suppe {aiDictionary ? "✨ KI" : ""}
            </span>
            <span className="text-[7px] font-mono opacity-80">Schwimmende Buchstaben tippen</span>
          </div>
          <button
            onClick={startNewSoup}
            className="px-1.5 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[6.5px] uppercase tracking-wider cursor-pointer active:scale-95"
          >
            Mischen 🍲
          </button>
        </div>

        {/* Level Toggles */}
        <div className="flex justify-between items-center gap-1 mt-1">
          <div className="flex gap-0.5">
            {(['easy', 'medium', 'hard', 'extreme'] as const).map(d => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={`px-1.5 py-0.5 rounded text-[6.5px] font-black uppercase tracking-wide cursor-pointer transition-all ${
                  difficulty === d && !aiDictionary
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : currentIsLight
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-150'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                }`}
              >
                {d === 'easy' ? 'Leicht' : d === 'medium' ? 'Mittel' : d === 'hard' ? 'Schwer' : '💥 Extrem'}
              </button>
            ))}
          </div>

          <button 
            onClick={loadAISoup}
            disabled={isLoadingAI}
            title={`Generiert Wörter per KI für Level ${difficulty}`}
            className={`px-1.5 py-0.5 rounded text-[6.5px] font-bold flex items-center gap-0.5 transition-all text-white ${
              isLoadingAI ? 'bg-indigo-300 animate-pulse' : 'bg-amber-500 hover:bg-amber-600 active:scale-95 cursor-pointer'
            }`}
          >
            <Sparkles className="w-1.5 h-1.5" />
            {isLoadingAI ? "Generiere..." : "KI-Suppe"}
          </button>
        </div>
        {aiStatus !== "idle" && aiStatus !== "success" && (
          <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-amber-700 dark:text-amber-300">
            <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
            {aiStatus !== "loading" && (
              <button type="button" onClick={loadAISoup} className="underline font-bold cursor-pointer">Erneut versuchen</button>
            )}
          </div>
        )}

      </div>

      <div className="flex-grow flex flex-col justify-between relative min-h-0 bg-amber-50/10 dark:bg-zinc-900/40 rounded-2xl border-2 border-amber-500/30 overflow-hidden py-1 mb-1">
        
        {/* Interactive floating soup basin */}
        <div className="relative flex-grow min-h-[140px] z-10 overflow-hidden">
          {letters.map((bubble, i) => {
            const isConsumed = consumedIds.includes(bubble.id);
            return (
              <motion.button
                key={`${bubble.id}-${bubble.char}`}
                onClick={() => handleBubbleClick(bubble)}
                animate={isConsumed ? {
                  scale: [1, 1.4, 0],
                  opacity: 0,
                } : {
                  x: [0, Math.sin(i + 1) * 12, -Math.sin(i + 2) * 12, 0],
                  y: [0, Math.cos(i + 2) * 10, -Math.cos(i + 1) * 10, 0],
                }}
                transition={isConsumed ? {
                  duration: 0.25,
                } : {
                  repeat: Infinity,
                  duration: 5 + (i % 3) * 2,
                  ease: "easeInOut"
                }}
                className={`absolute w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] border border-white/60 shadow-md cursor-pointer transition-colors ${bubble.color}`}
                style={{
                  left: `${bubble.x}%`,
                  top: `${bubble.y}%`,
                  pointerEvents: isConsumed ? 'none' : 'auto',
                }}
              >
                {bubble.char}
              </motion.button>
            );
          })}
        </div>

        {/* Word Board HUD */}
        <div className="shrink-0 bg-amber-500/10 dark:bg-zinc-900 py-1.5 px-3 text-center border-t border-amber-500/20 z-20">
          <span className="text-[7px] text-amber-600 dark:text-amber-400 uppercase block font-extrabold tracking-wider">Gesuchtes Wort:</span>
          <span className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest block py-0.5">
            {targetWord}
          </span>
          <div className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700 rounded-full px-3 py-0.5 mt-0.5 shadow-inner">
            <span className="text-[7px] text-slate-400 uppercase font-black">Eingabe:</span>
            <span className="text-[9px] font-mono font-black text-indigo-600 dark:text-indigo-400 tracking-wider">
              {userInput || "___"}
            </span>
          </div>
        </div>
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};


// ========================================================
// 17. WIDGET: TEILBARKEITS-ROBOTER (DivrobotWidgetContent)
// ========================================================
export const DivrobotWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [divRule, setDivRule] = useState<number>(3);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [numbersPool, setNumbersPool] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string>("Füttere den Roboter! 🤖");
  const [score, setScore] = useState<number>(0);
  const [emotion, setEmotion] = useState<'idle' | 'happy' | 'sad'>('idle');
  const [explanation, setExplanation] = useState<string | null>(null);

  // Rules dictionary in German for children
  const rulesDict: Record<number, string> = {
    2: "Eine Zahl ist durch 2 teilbar, wenn sie gerade ist (endet auf 0, 2, 4, 6, 8).",
    3: "Eine Zahl ist durch 3 teilbar, wenn ihre Quersumme (Ziffernsumme) durch 3 teilbar ist.",
    4: "Eine Zahl ist durch 4 teilbar, wenn ihre letzten zwei Stellen durch 4 teilbar sind.",
    5: "Eine Zahl ist durch 5 teilbar, wenn sie auf 0 oder 5 endet.",
    6: "Eine Zahl ist durch 6 teilbar, wenn sie durch 2 (gerade) und durch 3 (Quersumme) teilbar ist.",
    8: "Eine Zahl ist durch 8 teilbar, wenn ihre letzten drei Stellen durch 8 teilbar sind (oder 3-mal halbierbar).",
    9: "Eine Zahl ist durch 9 teilbar, wenn ihre Quersumme (Ziffernsumme) durch 9 teilbar ist.",
    10: "Eine Zahl ist durch 10 teilbar, wenn sie auf 0 endet."
  };

  const getExplanationText = (num: number, rule: number): string => {
    const isDiv = num % rule === 0;
    const isEven = num % 2 === 0;
    const lastDigit = num % 10;
    const digits = num.toString().split('').map(Number);
    const sum = digits.reduce((a, b) => a + b, 0);

    if (rule === 2) {
      return `${num} endet auf ${lastDigit}. Da ${lastDigit} ${isEven ? 'gerade' : 'ungerade'} ist, ist ${num} ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    if (rule === 3) {
      return `Quersumme von ${num} ist: ${digits.join('+')} = ${sum}. Da ${sum} ${sum % 3 === 0 ? 'durch 3 teilbar' : 'NICHT durch 3 teilbar'} ist, ist ${num} ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    if (rule === 5) {
      return `${num} endet auf ${lastDigit}. Da es ${isDiv ? 'auf 0 oder 5' : 'nicht auf 0 oder 5'} endet, ist ${num} ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    if (rule === 10) {
      return `${num} endet auf ${lastDigit}. Durch 10 teilbare Zahlen müssen auf 0 enden. Also ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    if (rule === 9) {
      return `Quersumme von ${num} ist: ${digits.join('+')} = ${sum}. Da ${sum} ${sum % 9 === 0 ? 'durch 9 teilbar' : 'NICHT durch 9 teilbar'} ist, ist ${num} ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    if (rule === 6) {
      const div3 = sum % 3 === 0;
      return `${num} ist ${isEven ? 'gerade' : 'ungerade'} und hat Quersumme ${sum} (${div3 ? 'teilbar' : 'nicht teilbar'} durch 3). Da ${isDiv ? 'beide Bedingungen gelten' : 'nicht beide Bedingungen gelten'}, ist ${num} ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
    }
    // General rule explanation fallback
    return `${num} geteilt durch ${rule} ist ${Math.floor(num / rule)} ${isDiv ? 'ohne Rest' : `mit Rest ${num % rule}`}. Daher ${isDiv ? 'teilbar' : 'NICHT teilbar'}!`;
  };

  const generateNumbers = useCallback((rule: number, diff: 'easy' | 'medium' | 'hard') => {
    const maxVal = diff === 'easy' ? 40 : diff === 'medium' ? 120 : 300;
    const list: number[] = [];
    while (list.length < 6) {
      const isDiv = Math.random() > 0.45;
      if (isDiv) {
        const mult = Math.floor(Math.random() * Math.floor(maxVal / rule)) + 1;
        const candidate = mult * rule;
        if (candidate > 0 && candidate <= maxVal && !list.includes(candidate)) {
          list.push(candidate);
        }
      } else {
        const candidate = Math.floor(Math.random() * (maxVal - 10)) + 10;
        if (candidate % rule !== 0 && !list.includes(candidate)) {
          list.push(candidate);
        }
      }
    }
    setNumbersPool(list);
    setExplanation(null);
  }, []);

  useEffect(() => {
    generateNumbers(divRule, difficulty);
  }, [divRule, difficulty, generateNumbers]);

  const playRobotSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {}
  };

  const handleEatNumber = (num: number) => {
    const isDiv = num % divRule === 0;
    const expl = getExplanationText(num, divRule);
    setExplanation(expl);

    if (isDiv) {
      setScore(s => s + 10);
      setEmotion('happy');
      setFeedback(`🤖 Mjam! ${num} ist teilbar!`);
      playRobotSound(true);
      setNumbersPool(prev => prev.filter(n => n !== num));
      setTimeout(() => setEmotion('idle'), 1600);
    } else {
      setScore(s => Math.max(0, s - 5));
      setEmotion('sad');
      setFeedback(`⚡ Autsch! ${num} liegt schwer im Magen!`);
      playRobotSound(false);
      setTimeout(() => setEmotion('idle'), 1600);
    }
  };

  const changeRule = (rule: number) => {
    setDivRule(rule);
    setScore(0);
    setEmotion('idle');
    setExplanation(null);
    setFeedback(`🤖 Neue Diät! Isst jetzt Teilbares durch ${rule}`);
  };

  const renderRobotSvg = () => {
    let eyeColor = '#22d3ee'; // cyan
    let mouthPath = 'M 15 28 Q 20 28 25 28'; // straight line
    let antennaColor = '#f59e0b'; // amber

    if (emotion === 'happy') {
      eyeColor = '#10b981'; // emerald
      mouthPath = 'M 15 26 Q 20 34 25 26'; // wide happy chewing smile
      antennaColor = '#10b981';
    } else if (emotion === 'sad') {
      eyeColor = '#ef4444'; // red
      mouthPath = 'M 15 31 Q 20 24 25 31'; // frown
      antennaColor = '#ef4444';
    }

    return (
      <svg className="w-16 h-24 filter drop-shadow-md" viewBox="0 0 40 50">
        {/* Antenna */}
        <line x1="20" y1="10" x2="20" y2="4" stroke="#64748b" strokeWidth="2" />
        <circle cx="20" cy="3" r="2.5" fill={antennaColor} className="animate-pulse" />
        <circle cx="20" cy="3" r="2" fill={antennaColor} />

        {/* Head */}
        <rect x="6" y="10" width="28" height="24" rx="4" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
        {/* Screen around eyes */}
        <rect x="9" y="13" width="22" height="10" rx="2" fill="#1e293b" />
        
        {/* Eyes */}
        <circle cx="14" cy="18" r="2.5" fill={eyeColor} />
        <circle cx="26" cy="18" r="2.5" fill={eyeColor} />

        {/* Mouth */}
        <path d={mouthPath} stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" fill="none" />

        {/* Neck */}
        <rect x="16" y="34" width="8" height="4" fill="#94a3b8" />

        {/* Body badge with division rule */}
        <rect x="10" y="38" width="20" height="10" rx="2" fill="#475569" />
        <text x="20" y="45.5" fill="#22d3ee" fontSize="7" fontWeight="black" textAnchor="middle" fontFamily="monospace">
          :{divRule}
        </text>
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      
      {/* Top selection area */}
      <div className="shrink-0 flex flex-col gap-1 mb-1 border-b border-slate-100 dark:border-zinc-800 pb-1">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
              🤖 Teilbarkeits-Roboter
            </span>
            {/* Difficulty picker */}
            <div className="flex gap-1 mt-0.5">
              {(['easy', 'medium', 'hard'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-1.5 py-0.2 rounded text-[6.5px] font-black uppercase tracking-wide cursor-pointer transition-all ${
                    difficulty === d
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : currentIsLight
                        ? 'bg-slate-100 text-slate-500 hover:bg-slate-150'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-750'
                  }`}
                >
                  {d === 'easy' ? 'Leicht' : d === 'medium' ? 'Mittel' : 'Schwer'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Rule picker */}
          <div className="flex flex-wrap gap-0.5 max-w-[130px] justify-end">
            {[2, 3, 4, 5, 6, 8, 9, 10].map(r => (
              <button
                key={r}
                onClick={() => changeRule(r)}
                className={`px-1 py-0.5 rounded font-black text-[6.5px] cursor-pointer transition-colors ${
                  divRule === r ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-neutral-300'
                }`}
              >
                :{r}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic rule of thumb hint display */}
        <div className="bg-indigo-50/50 dark:bg-black/20 p-1 rounded-md text-left mt-0.5 border border-indigo-100/30">
          <p className="text-[6.5px]/tight font-medium text-indigo-700 dark:text-indigo-300">
            💡 <span className="font-extrabold uppercase">Regel für :{divRule}</span> — {rulesDict[divRule]}
          </p>
        </div>
      </div>

      <div className="flex-grow flex flex-row items-center justify-around gap-2 py-1 min-h-0">
        
        {/* Animated robot visualizer */}
        <div className="shrink-0 flex items-center justify-center p-1">
          {renderRobotSvg()}
        </div>

        {/* Numbers options */}
        <div className="flex-1 grid grid-cols-3 gap-1 content-center scale-95">
          {numbersPool.map((n, i) => (
            <button
              key={i}
              onClick={() => handleEatNumber(n)}
              className={`py-2 text-center rounded-lg border-2 font-black text-[10px] tracking-wide active:scale-90 transition-transform cursor-pointer ${
                currentIsLight 
                  ? 'bg-amber-100/90 border-amber-300 text-amber-900 shadow-xs hover:bg-amber-50' 
                  : 'bg-zinc-800 border-zinc-700 text-slate-200 shadow-xs hover:bg-zinc-700'
              }`}
            >
              {n}
            </button>
          ))}
          {numbersPool.length === 0 && (
            <button
              onClick={() => generateNumbers(divRule, difficulty)}
              className="col-span-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[8px] rounded uppercase cursor-pointer"
            >
              Neu füllen 🍎
            </button>
          )}
        </div>
      </div>

      {explanation && (
        <div className="shrink-0 bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/25 p-1 rounded-lg text-left my-1">
          <p className="text-[6.5px]/snug font-bold text-amber-600 dark:text-amber-400">
            📖 Erklärung: {explanation}
          </p>
        </div>
      )}

      {/* Footer statistics */}
      <div className="shrink-0 flex justify-between items-center bg-slate-100/30 dark:bg-black/10 px-2 py-0.5 rounded-lg border border-slate-200/20">
        <span className="text-[7.5px] font-extrabold text-blue-500 truncate max-w-[130px]">{feedback}</span>
        <span className="text-[7px] font-black uppercase text-emerald-500">Score: {score}</span>
      </div>
    </div>
  );
};


// ========================================================
// WIDGET: KLASSENZIEL-BAROMETER (Migriert & konsolidiert auf Klassenglas-Daten mit Barometer-Stil)
// ========================================================
export const ClasstargetWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ widget, currentIsLight }) => {
  const { app, setApp } = useApp();
  return (
    <ClassRewardWidget
      app={app}
      setApp={setApp}
      widget={{
        ...widget,
        settings: {
          style: 'barometer',
          symbol: '⭐',
          ...(widget?.settings || {}),
        },
      }}
      currentIsLight={currentIsLight}
    />
  );
};


// ========================================================
// 19. WIDGET: MORSE-STATION (MorsecodeWidgetContent)
// ========================================================
export const MorsecodeWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "morsecode", {
    isGlowing: false,
    challengeWord: "SOS",
    userInput: "",
    feedback: "Blinke Signale oder lerne morse! 🔦",
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
    isAiActive: false,
    showGuide: false,
  });
  const [isGlowing, setIsGlowing] = useState<boolean>(() => lifecycle.isGlowing);
  const [challengeWord, setChallengeWord] = useState<string>(() => lifecycle.challengeWord);
  const [userInput, setUserInput] = useState<string>(() => lifecycle.userInput);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isAiLoading = aiStatus === "loading";
  const [isAiActive, setIsAiActive] = useState<boolean>(() => lifecycle.isAiActive);
  const [showGuide, setShowGuide] = useState<boolean>(() => lifecycle.showGuide);

  usePersistedWidgetLifecycleState(widget, onUpdate, "morsecode", {
    isGlowing,
    challengeWord,
    userInput,
    feedback,
    aiStatus,
    aiError,
    isAiActive,
    showGuide,
  });

  const dictionary = useMemo(() => ["SOS", "JA", "HI", "SCHULE", "ZEIT", "KIND"], []);

  const triggerChallenge = () => {
    setIsAiActive(false);
    setAiStatus("idle");
    setAiError(null);
    const word = dictionary[Math.floor(Math.random() * dictionary.length)];
    setChallengeWord(word);
    setUserInput("");
    setFeedback(`Challenge gestartet! Entschlüssle das Morse-Wort!`);
  };

  const playCustomBeep = (freq: number, duration: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration - 0.02);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const getMorseSeq = (char: string): string => {
    const map: Record<string, string> = {
      'S': '...', 'O': '---', 'J': '.---', 'A': '.-', 'C': '-.-.', 'K': '-.-', 'P': '.--.',
      'I': '..', 'T': '-', 'H': '....', 'U': '..-', 'L': '.-..', 'E': '.', 'Z': '--..',
      'B': '-...', 'D': '-..', 'F': '..-.', 'G': '--.', 'M': '--', 'N': '-.', 'Q': '--.-',
      'R': '.-.', 'V': '...-', 'W': '.--', 'X': '-..-', 'Y': '-.--'
    };
    return map[char.toUpperCase()] || '';
  };

  const fetchAiWord = async () => {
    setAiStatus("loading");
    setAiError(null);
    try {
      const prompt = `Gib ein einziges deutsches Nomen (Wort) mit genau oder maximal 4-5 Buchstaben für Grundschulkinder aus (z.B. MAUS, HUHN, BALL, BAUM, Keks, Dino, Löwe). Keine Sonderzeichen, Umlaute (ä,ö,ü ersetze durch ae, oe, ue) oder Satzzeichen. Gibbons ausschließlich das rohe Wort ohne Begleittext aus.`;
      const result = await askAI('ki-wissen', prompt);
      const cleanWord = String(result || "").replace(/[^a-zA-Z]/g, '').trim().toUpperCase();
      if (cleanWord && cleanWord.length >= 2 && cleanWord.length <= 6) {
        setChallengeWord(cleanWord);
        setUserInput("");
        setIsAiActive(true);
        setAiStatus("success");
        setFeedback("Spionage-Code empfangen! Klicke auf Abspielen! 📻✨");
      } else {
        const status: WidgetAiStatus = "error";
        setAiStatus(status);
        setAiError(getWidgetAiStatusMessage(status));
      }
    } catch (e) {
      const status = classifyWidgetAiError(e);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };

  const runSecretMorseFlash = () => {
    setFeedback("Taschenlampe blinkt... 🔦");
    let cumulativeDelay = 100;

    challengeWord.split("").forEach((char) => {
      const morsePattern = getMorseSeq(char);
      morsePattern.split("").forEach((sig) => {
        const activeTime = sig === '.' ? 150 : 380;
        
        setTimeout(() => {
          setIsGlowing(true);
          playCustomBeep(650, activeTime / 1000);
        }, cumulativeDelay);

        setTimeout(() => {
          setIsGlowing(false);
        }, cumulativeDelay + activeTime);

        cumulativeDelay += activeTime + 180;
      });
      cumulativeDelay += 350;
    });

    setTimeout(() => {
      setFeedback("Wie lautete das geheime blinkende Wort?");
    }, cumulativeDelay);
  };

  const checkTranslate = () => {
    if (userInput.toUpperCase().trim() === challengeWord) {
      setFeedback("🎉 Perfekt entschlüsselt! Meister-Kryptograph!");
      playCustomBeep(880, 0.4);
    } else {
      setFeedback(`❌ Huch! Das gesuchte Wort war nicht "${userInput}".`);
      playCustomBeep(180, 0.3);
    }
  };




  const morseAlphabet: Record<string, string> = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..'
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🔦 Morse-Station {isAiActive ? "✨ AI" : ""}
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Codes mit Licht und Beep</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className={`px-1.5 py-0.5 rounded font-black text-[7px] cursor-pointer transition-colors ${
              showGuide
                ? 'bg-amber-500 text-white'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            📚 {showGuide ? "Spiel" : "Anleitung"}
          </button>
          <button
            onClick={fetchAiWord}
            disabled={isAiLoading}
            className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-extrabold text-[7px]"
          >
            {isAiLoading ? "Funk... 📻" : "✨ KI-Code"}
          </button>
          <button
            onClick={triggerChallenge}
            className="px-1.5 py-0.5 rounded bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-[7px] cursor-pointer"
          >
            Standard 🔮
          </button>
        </div>
      {aiStatus !== "idle" && aiStatus !== "success" && (
        <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-amber-700 dark:text-amber-300">
          <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
          {aiStatus !== "loading" && (
            <button type="button" onClick={fetchAiWord} className="underline font-bold cursor-pointer">Erneut versuchen</button>
          )}
        </div>
      )}

      </div>

      {showGuide ? (
        <div className="flex-grow flex flex-col p-2 bg-indigo-50/50 dark:bg-zinc-900/60 rounded-xl border border-indigo-100/30 dark:border-zinc-800 text-left min-h-0 overflow-y-auto gap-2">
          <div>
            <h4 className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400">📖 Anleitung für Kinder:</h4>
            <p className="text-[7.5px]/snug text-slate-650 dark:text-slate-350 mt-0.5">
              1. Klicke auf <span className="font-bold">🔊 Abspielen</span>, um das geheime Wort anzuhören und leuchten zu sehen.<br />
              2. Ein kurzer Ton/Blitz <span className="font-bold">·</span> ist ein Punkt. Ein langer Ton/Blitz <span className="font-bold">-</span> ist ein Strich.<br />
              3. Entschlüssle Buchstabe für Buchstabe mit der Tabelle unten und trage das Wort ein!
            </p>
          </div>

          <div>
            <h4 className="text-[8.5px] font-black uppercase text-amber-500 mb-1">📻 Das Morse-Alphabet:</h4>
            <div className="grid grid-cols-4 gap-1">
              {Object.entries(morseAlphabet).map(([lettr, code]) => (
                <div key={lettr} className="flex justify-between items-center px-1.5 py-0.5 rounded bg-white dark:bg-zinc-800 border border-slate-100 dark:border-zinc-700/50">
                  <span className="text-[9px] font-black text-slate-800 dark:text-white">{lettr}</span>
                  <span className="text-[8.5px] font-mono font-black text-indigo-500 dark:text-indigo-400">{code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-row items-center justify-around gap-2 py-1 min-h-0">
          <div className={`relative w-15 h-15 rounded-full border-3 flex justify-center items-center transition-all ${
            isGlowing 
              ? 'bg-yellow-300 border-yellow-400 shadow-xl shadow-yellow-200 ring-4 ring-yellow-400/20' 
              : 'bg-zinc-800 border-zinc-900 text-slate-500'
          }`}>
            <span className={`text-xl ${isGlowing ? 'animate-pulse' : 'opacity-60'}`}>🔦</span>
            {isGlowing && <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />}
          </div>

          <div className="flex flex-col gap-1.5 flex-1 max-w-[110px]">
            <button
              onClick={runSecretMorseFlash}
              className="w-full py-1 text-center font-black rounded-lg bg-teal-500 hover:bg-teal-600 text-white text-[7.5px] uppercase tracking-wider cursor-pointer active:scale-95"
            >
              🔊 Abspielen!
            </button>
            <input
              type="text"
              placeholder="Wort eingeben"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value.toUpperCase())}
              className={`w-full px-1 py-1 text-center font-black rounded border text-[10px] ${
                currentIsLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-950 border-zinc-700 text-white'
              }`}
            />
            <button
              onClick={checkTranslate}
              className="w-full py-0.5 rounded bg-rose-500 hover:bg-rose-600 text-white font-black text-[7px] uppercase tracking-wider cursor-pointer transition-colors"
            >
              Raten 🔎
            </button>
          </div>
        </div>
      )}

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};


// ========================================================
// 20. WIDGET: SATZZEICHEN-ZOO (PunctuationzooWidgetContent)
// ========================================================
interface ZooSentence {
  text: string;
  missingMark: '.' | '?' | '!';
  animal: string;
  explanation: string;
}

export const PunctuationzooWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const zooDatabase: ZooSentence[] = useMemo(() => [
    { text: "Wohin hüpft der kleine grüne Frosch", missingMark: '?', animal: "🐸 Frosch", explanation: "Das ist eine Frage! Fragewörter wie 'Wohin' brauchen ein Fragezeichen (?)." },
    { text: "Das gestreifte Zebra knabbert an frischem Heu", missingMark: '.', animal: "🦓 Zebra", explanation: "Das ist ein Aussagesatz! Wir erzählen etwas ganz normales, also kommt ein Punkt (.)." },
    { text: "Lauf schnell weg vor dem hungrigen Löwen", missingMark: '!', animal: "🦁 Löwe", explanation: "Das ist ein Ausruf oder Befehl! Ein Warnsatz braucht ein Ausrufezeichen (!)." },
    { text: "Wo schläft der müde Koala-Bär am liebsten", missingMark: '?', animal: "🐨 Koala", explanation: "Das ist eine Frage! Am Ende einer Frage steht immer ein Fragezeichen (?)." },
    { text: "Das lustige Äffchen turnt flink durch das Gehege", missingMark: '.', animal: "🐒 Affe", explanation: "Das ist ein Aussagesatz! Wir berichten eine einfache Tatsache, also kommt ein Punkt (.)." },
    { text: "Wie laut trompetet das kleine Elefanten-Baby", missingMark: '?', animal: "🐘 Elefant", explanation: "Das ist eine Frage! Ein Fragewort wie 'Wie' verlangt ein Fragezeichen (?)." },
    { text: "Hüte dich vor dem gefährlichen Krokodil", missingMark: '!', animal: "🐊 Krokodil", explanation: "Das ist ein Ausruf oder Befehl! Eine Aufforderung endet mit einem Ausrufezeichen (!)." },
    { text: "Schau mal, wie hoch die bunte Giraffe ihren Kopf strecken kann", missingMark: '!', animal: "🦒 Giraffe", explanation: "Das ist ein Ausruf des Staunens! Ein staunender Satz endet mit einem Ausrufezeichen (!)." },
    { text: "Der schlaue Pandabär kaut gemütlich an seinem grünen Bambus", missingMark: '.', animal: "🐼 Panda", explanation: "Das ist ein Aussagesatz! Eine Erzählung endet mit einem Punkt (.)." },
    { text: "Warum fliegt der schlaue Papagei nicht einfach weg", missingMark: '?', animal: "🦜 Papagei", explanation: "Das ist eine Frage! 'Warum' leitet eine Frage ein und endet mit einem Fragezeichen (?)." }
  ], []);

  const lifecycle = readWidgetLifecycleState(widget, "punctuationzoo", {
    activeIdx: 0,
    customSentence: null as ZooSentence | null,
    isLocked: true,
    aiStatus: "idle" as WidgetAiStatus,
    aiError: null as string | null,
    streak: 0,
    feedback: "Befreie das Tier durch das richtige Satzzeichen am Ende! 🐒",
    showExplanation: false,
    isPlayingAudio: false,
  });
  const [activeIdx, setActiveIdx] = useState<number>(() => lifecycle.activeIdx);
  const [customSentence, setCustomSentence] = useState<ZooSentence | null>(() => lifecycle.customSentence);
  const [isLocked, setIsLocked] = useState<boolean>(() => lifecycle.isLocked);
  const [aiStatus, setAiStatus] = useState<WidgetAiStatus>(() => lifecycle.aiStatus);
  const [aiError, setAiError] = useState<string | null>(() => lifecycle.aiError);
  const isAiLoading = aiStatus === "loading";
  const [streak, setStreak] = useState<number>(() => lifecycle.streak);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);
  const [showExplanation, setShowExplanation] = useState<boolean>(() => lifecycle.showExplanation);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(() => lifecycle.isPlayingAudio);
  const didRestoreRef = useRef(hasWidgetLifecycleState(widget, "punctuationzoo"));

  usePersistedWidgetLifecycleState(widget, onUpdate, "punctuationzoo", {
    activeIdx,
    customSentence,
    isLocked,
    aiStatus,
    aiError,
    streak,
    feedback,
    showExplanation,
    isPlayingAudio,
  });

  const rollNewZooSentence = useCallback(() => {
    setCustomSentence(null);
    setAiStatus("idle");
    setAiError(null);
    setActiveIdx((prev) => {
      let next = Math.floor(Math.random() * zooDatabase.length);
      while (next === prev && zooDatabase.length > 1) {
        next = Math.floor(Math.random() * zooDatabase.length);
      }
      return next;
    });
    setIsLocked(true);
    setShowExplanation(false);
    setFeedback("Hilf dem Tier! Welches Satzzeichen fehlt am Ende?");
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  }, [zooDatabase]);

  useEffect(() => {
    if (!didRestoreRef.current) {
      didRestoreRef.current = true;
      rollNewZooSentence();
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [rollNewZooSentence]);

  const activeSentence = customSentence || zooDatabase[activeIdx];

  const handleSpeak = () => {
    if (!activeSentence) return;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(activeSentence.text);
      utterance.lang = 'de-DE';
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setFeedback("Sprachausgabe wird von diesem Browser leider nicht unterstützt.");
    }
  };

  const fetchAiSentence = async () => {
    setAiStatus("loading");
    setAiError(null);
    try {
      const prompt = `Erstelle einen einzelnen kurzen, lustigen, kindgerechten Satz auf Deutsch über ein beliebiges Tier. Der Satz muss am Ende genau ein fehlendes Satzzeichen haben (entweder ein Punkt '.', ein Fragezeichen '?' oder ein Ausrufezeichen '!').
Regeln:
1. Der Satz darf am Ende selbst KEIN Satzzeichen enthalten.
2. Das fehlende Satzzeichen muss eines von diesen dreien sein: '.', '?', '!'.
3. Wähle ein passendes Tier mit einem Emoji davor (z. B. "🦊 Fuchs" oder "🐼 Pandabär").
4. Antworte in genau diesem Format, getrennt durch ein Semikolon:
<Tier mit Emoji>;<Satz>;<Das fehlende Satzzeichen (. oder ? oder !)>
Beispiel: 🦘 Känguru;Wie hoch kann ein Känguru hüpfen;?
Gib absolut nichts anderes aus als diese Zeile!`;
      const res = await askAI('ki-quiz', prompt);
      if (res && res.includes(';')) {
        const parts = res.split(';');
        if (parts.length >= 3) {
          const animal = parts[0].trim();
          const text = parts[1].trim();
          const missingMark = parts[2].trim() as '.' | '?' | '!';
          if (['.', '?', '!'].includes(missingMark)) {
            setCustomSentence({
              text,
              missingMark,
              animal,
              explanation: missingMark === '?' ? "Das ist eine Frage! Am Ende einer Frage steht ein Fragezeichen." : missingMark === '!' ? "Das ist ein Ausruf oder Befehl! Das fordert ein Ausrufezeichen." : "Das ist ein normaler Aussagesatz! Er endet mit einem Punkt."
            });
            setIsLocked(true);
            setShowExplanation(false);
            setAiStatus("success");
            setAiError(null);
            setFeedback("Ein KI-Tier wurde herbeigebeamt! Kannst du es befreien? ✨");
            return;
          }
        }
      }
      const status: WidgetAiStatus = "error";
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    } catch (e) {
      const status = classifyWidgetAiError(e);
      setAiStatus(status);
      setAiError(getWidgetAiStatusMessage(status));
    }
  };

  const playCageSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        [440, 554.37, 659.25, 880].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.15);
        });
      } else {
        [150, 150].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.15);
        });
      }
    } catch {}
  };

  const handleApplyPunctuation = (mark: '.' | '?' | '!') => {
    if (!activeSentence) return;
    if (activeSentence.missingMark === mark) {
      setIsLocked(false);
      setShowExplanation(true);
      setStreak(s => s + 1);
      setFeedback(`🏆 Richtig! Das Satzzeichen "${mark}" befreit den ${activeSentence.animal}!`);
      playCageSound(true);
      // Read completed sentence automatically on success!
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(activeSentence.text + " " + (mark === '.' ? 'Punkt' : mark === '?' ? 'Fragezeichen' : 'Ausrufezeichen'));
        utterance.lang = 'de-DE';
        window.speechSynthesis.speak(utterance);
      }
    } else {
      setStreak(0);
      setFeedback(`❌ Das passt leider nicht. Überlege noch einmal!`);
      playCageSound(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="shrink-0 flex justify-between items-center pb-1 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'} flex items-center gap-1`}>
            🦁 Satzzeichen-Zoo {customSentence && "✨ KI"}
          </span>
          <span className="text-[7px] font-mono opacity-80">Hilf Tieren mit Satzzeichen!</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-zinc-800 text-emerald-700 dark:text-emerald-300">
            Serie: {streak} 🔥
          </span>
          <button
            onClick={fetchAiSentence}
            disabled={isAiLoading}
            className="px-1.5 py-0.5 rounded bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-[6.5px] uppercase tracking-wider cursor-pointer shadow-xs transition-colors"
          >
            {isAiLoading ? "Lade..." : "✨ KI-Tier"}
          </button>
        </div>
      </div>

        {aiStatus !== "idle" && aiStatus !== "success" && (
          <div role="status" aria-live="polite" className="flex items-center justify-between gap-1 text-[7px] text-amber-700 dark:text-amber-300">
            <span>{aiError || getWidgetAiStatusMessage(aiStatus)}</span>
            {aiStatus !== "loading" && (
              <button type="button" onClick={fetchAiSentence} className="underline font-bold cursor-pointer">Erneut versuchen</button>
            )}
          </div>
        )}

      {/* Cage & Animal View */}
      <div className="flex-grow flex flex-col justify-center items-center py-2 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl relative min-h-[140px] border border-slate-100 dark:border-zinc-800 shadow-xs overflow-hidden mt-1.5">
        
        {/* Interactive Cage */}
        <div className="relative w-16 h-16 bg-amber-500/5 dark:bg-amber-500/5 rounded-2xl flex items-center justify-center border border-amber-500/10 shadow-inner">
          {/* Cage Bars (Animated with Framer Motion) */}
          <AnimatePresence>
            {isLocked && (
              <motion.div 
                initial={{ opacity: 1, scaleY: 1 }}
                exit={{ opacity: 0, scaleY: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="absolute inset-0 flex justify-around px-2.5 py-1 bg-slate-400/15 dark:bg-zinc-800/20 rounded-2xl border-4 border-slate-400 dark:border-zinc-600 overflow-hidden z-20"
              >
                <div className="w-1 bg-slate-500 dark:bg-zinc-500 h-full rounded-full shadow-xs" />
                <div className="w-1 bg-slate-500 dark:bg-zinc-500 h-full rounded-full shadow-xs" />
                <div className="w-1 bg-slate-500 dark:bg-zinc-500 h-full rounded-full shadow-xs" />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.span 
            animate={isLocked ? { scale: 0.95 } : { scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
            transition={isLocked ? {} : { repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="text-3xl select-none z-10"
          >
            {activeSentence?.animal?.split(" ")?.[0] || "❔"}
          </motion.span>
        </div>

        {/* Animal Label */}
        <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500 mt-1">
          {activeSentence?.animal?.split(" ")?.[1] || "Unbekanntes Tier"}
        </span>

        {/* MAXIMUM READABILITY TYPOGRAPHY PANEL */}
        <div className="mt-2.5 px-4 text-center w-full max-w-[250px]">
          <div className="relative bg-white dark:bg-zinc-850 p-3 rounded-2xl border-l-4 border-indigo-500 dark:border-indigo-400 shadow-md flex flex-col items-center gap-1">
            <p className="font-extrabold text-sm sm:text-base leading-snug text-slate-900 dark:text-neutral-50 px-1 font-sans">
              „{activeSentence?.text}
              <span className={`inline-flex items-center justify-center px-1.5 py-0.2 ml-1 font-black rounded-lg transition-all ${
                isLocked 
                  ? 'bg-indigo-100 dark:bg-indigo-950/75 text-indigo-600 dark:text-indigo-300 animate-pulse border border-dashed border-indigo-400 text-xs sm:text-sm' 
                  : 'bg-emerald-500 text-white shadow-xs text-xs sm:text-sm'
              }`}>
                {isLocked ? "?" : activeSentence.missingMark}
              </span>“
            </p>
            
            {/* Audio Read-Aloud Button */}
            <button
              onClick={handleSpeak}
              className={`mt-1.5 p-1.5 rounded-full cursor-pointer flex items-center justify-center gap-1 transition-all ${
                isPlayingAudio 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'bg-slate-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 hover:bg-slate-200'
              }`}
              title="Satz laut vorlesen lassen"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span className="text-[6.5px] uppercase font-black tracking-wide pr-1">Vorlesen</span>
            </button>
          </div>
        </div>

        {/* Pedagogical explanation box */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 mx-4 p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 rounded-xl text-center max-w-[240px]"
            >
              <p className="text-[8.5px] font-bold text-emerald-700 dark:text-emerald-400 leading-normal">
                💡 {activeSentence.explanation}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Buttons (Grammatical Labeled Punctuation) */}
      <div className="shrink-0 space-y-1.5 mt-2">
        <div className="flex gap-2 justify-center">
          <motion.button
            whileHover={isLocked ? { scale: 1.05 } : {}}
            whileTap={isLocked ? { scale: 0.95 } : {}}
            onClick={() => handleApplyPunctuation('.')}
            disabled={!isLocked}
            className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-base leading-none">.</span>
            <span className="text-[6.5px] tracking-wider uppercase font-black opacity-90 mt-0.5">Aussage (Punkt)</span>
          </motion.button>

          <motion.button
            whileHover={isLocked ? { scale: 1.05 } : {}}
            whileTap={isLocked ? { scale: 0.95 } : {}}
            onClick={() => handleApplyPunctuation('?')}
            disabled={!isLocked}
            className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-base leading-none">?</span>
            <span className="text-[6.5px] tracking-wider uppercase font-black opacity-90 mt-0.5">Frage (?)</span>
          </motion.button>

          <motion.button
            whileHover={isLocked ? { scale: 1.05 } : {}}
            whileTap={isLocked ? { scale: 0.95 } : {}}
            onClick={() => handleApplyPunctuation('!')}
            disabled={!isLocked}
            className="flex-1 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-black text-sm rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-md transition-colors flex flex-col items-center justify-center"
          >
            <span className="text-base leading-none">!</span>
            <span className="text-[6.5px] tracking-wider uppercase font-black opacity-90 mt-0.5">Ausruf (!)</span>
          </motion.button>
        </div>

        {/* Footer actions */}
        <div className="flex justify-between items-center pt-1.5">
          <p className="text-[7.5px] font-black text-blue-500 dark:text-blue-400 truncate max-w-[150px] animate-pulse uppercase">
            {feedback}
          </p>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={rollNewZooSentence}
            className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-wider shadow-xs flex items-center gap-1 cursor-pointer ${
              currentIsLight 
                ? 'bg-white border border-slate-200 text-indigo-600 hover:bg-slate-50' 
                : 'bg-zinc-850 border border-zinc-700 text-indigo-400 hover:bg-zinc-800'
            }`}
          >
            Nächstes Tier 🦒 →
          </motion.button>
        </div>
      </div>
    </div>
  );
};


// ========================================================
// 21. WIDGET: GEHEIMSPRACHEN-BOX (SecretcodeWidgetContent)
// ========================================================
export const SecretcodeWidgetContent: React.FC<{
  widget: any;
  onUpdate?: (updates: { settings?: any; [key: string]: any }) => void;
  currentIsLight: boolean;
}> = ({ widget, onUpdate, currentIsLight }) => {
  const lifecycle = readWidgetLifecycleState(widget, "secretcode", {
    method: "caesar" as "caesar" | "rot13",
    caesarKey: 3,
    textToEncode: "AGENT",
    encodedText: "",
    feedback: "Entschlüssle geheime Botschaften! 🕵️‍♂️",
  });
  const [method, setMethod] = useState<'caesar' | 'rot13'>(() => lifecycle.method);
  const [caesarKey, setCaesarKey] = useState<number>(() => lifecycle.caesarKey);
  const [textToEncode, setTextToEncode] = useState<string>(() => lifecycle.textToEncode);
  const [encodedText, setEncodedText] = useState<string>(() => lifecycle.encodedText);
  const [feedback, setFeedback] = useState<string>(() => lifecycle.feedback);

  usePersistedWidgetLifecycleState(widget, onUpdate, "secretcode", {
    method,
    caesarKey,
    textToEncode,
    encodedText,
    feedback,
  });

  const runEncode = useCallback(() => {
    let result = "";
    const txt = textToEncode.toUpperCase();
    for (let i = 0; i < txt.length; i++) {
      const code = txt.charCodeAt(i);
      if (code >= 65 && code <= 90) { // A-Z
        const shift = method === 'rot13' ? 13 : caesarKey;
        let newCode = code + shift;
        if (newCode > 90) {
          newCode = 65 + (newCode - 91);
        }
        result += String.fromCharCode(newCode);
      } else {
        result += txt[i];
      }
    }
    setEncodedText(result);
  }, [textToEncode, caesarKey, method]);

  useEffect(() => {
    runEncode();
  }, [runEncode]);

  const playAgentBeep = (freq: number, dur: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🕵️ Agenten-Kryptobox
          </span>
          <span className="text-[7.5px] font-mono opacity-80">Geheimsprachen spielerisch lernen</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setMethod('caesar')}
            className={`px-1 py-0.5 rounded text-[7px] font-black ${method === 'caesar' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            Caesar
          </button>
          <button
            onClick={() => setMethod('rot13')}
            className={`px-1 py-0.5 rounded text-[7px] font-black ${method === 'rot13' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            ROT13
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col justify-around py-1.5 min-h-0 gap-1.5">
        <div>
          <label className="text-[7.5px] font-extrabold uppercase opacity-70 block mb-0.5">Klartext eingeben:</label>
          <input
            type="text"
            maxLength={12}
            value={textToEncode}
            onChange={(e) => {
              setTextToEncode(e.target.value.toUpperCase());
              playAgentBeep(800, 0.05);
            }}
            className={`w-full px-2 py-1 text-center font-black rounded-lg border text-xs tracking-wider uppercase ${
              currentIsLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-zinc-900 border-zinc-700 text-yellow-300'
            }`}
          />
        </div>

        {method === 'caesar' && (
          <div className="flex items-center gap-2">
            <span className="text-[7.5px] font-bold">Verschiebung:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={caesarKey}
              onChange={(e) => {
                setCaesarKey(parseInt(e.target.value));
                playAgentBeep(1000, 0.04);
              }}
              className="flex-grow h-1 bg-indigo-200 rounded appearance-none cursor-pointer"
            />
            <span className="text-xs font-black text-indigo-500">+{caesarKey}</span>
          </div>
        )}

        <div className="p-2 border border-dashed rounded-xl border-indigo-400 bg-indigo-500/5 text-center">
          <span className="text-[7px] font-black uppercase text-indigo-400 block tracking-widest leading-none mb-1">Geheimcode (Verschlüsselt):</span>
          <span className="text-sm font-extrabold tracking-widest text-emerald-500 break-words font-mono block">
            {encodedText || "___"}
          </span>
        </div>
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};


// ========================================================
// 22. WIDGET: UHREN-LERN-TRAINER (ClockpuzzleWidgetContent)
// ========================================================
export const ClockpuzzleWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  type Mode = 'read' | 'set';
  type Level = 'hour' | 'half' | 'quarter';
  const [mode, setMode] = useState<Mode>('read');
  const [level, setLevel] = useState<Level>('quarter');
  const [targetClock, setTargetClock] = useState<{ h: number; m: number }>({ h: 8, m: 15 });
  const [studentClock, setStudentClock] = useState<{ h: number; m: number }>({ h: 8, m: 0 });
  const [choices, setChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<string>('Lies die Uhrzeit am Zifferblatt ab.');

  const minuteOptions = useMemo(() => {
    if (level === 'hour') return [0];
    if (level === 'half') return [0, 30];
    return [0, 15, 30, 45];
  }, [level]);

  const formatTime = (clock: { h: number; m: number }) =>
    `${String(clock.h).padStart(2, '0')}:${String(clock.m).padStart(2, '0')}`;

  const rollNewTime = useCallback((nextMode: Mode = mode) => {
    const minutes = level === 'hour' ? [0] : level === 'half' ? [0, 30] : [0, 15, 30, 45];
    const pickedH = Math.floor(Math.random() * 12) + 1;
    const pickedM = minutes[Math.floor(Math.random() * minutes.length)];
    const target = { h: pickedH, m: pickedM };
    setTargetClock(target);
    setSelectedChoice(null);
    setChecked(false);

    if (nextMode === 'read') {
      const correct = formatTime(target);
      const options = new Set<string>([correct]);
      while (options.size < 4) {
        const wrongH = Math.floor(Math.random() * 12) + 1;
        const wrongM = minutes[Math.floor(Math.random() * minutes.length)];
        options.add(formatTime({ h: wrongH, m: wrongM }));
      }
      setChoices([...options].sort());
      setFeedback('Welche Uhrzeit zeigt die Uhr?');
    } else {
      setStudentClock({ h: 12, m: 0 });
      setFeedback(`Stelle ${formatTime(target)} Uhr ein.`);
    }
  }, [level, mode]);

  useEffect(() => {
    rollNewTime(mode);
  }, [level, mode, rollNewTime]);

  const playDing = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(success ? 800 : 150, ctx.currentTime);
      gain.gain.setValueAtTime(success ? 0.05 : 0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {}
  };

  const checkReadAnswer = (choice: string) => {
    setSelectedChoice(choice);
    setChecked(true);
    const correct = choice === formatTime(targetClock);
    if (correct) {
      setFeedback('Richtig – du hast die Uhr korrekt abgelesen.');
      playDing(true);
      return;
    }
    const [choiceHour, choiceMinute] = choice.split(':').map(Number);
    if (choiceMinute !== targetClock.m) {
      setFeedback('Der Minutenzeiger passt noch nicht. Schau zuerst auf den langen orangefarbenen Zeiger.');
    } else if (choiceHour !== targetClock.h) {
      setFeedback('Die Minuten stimmen. Prüfe jetzt den kurzen dunklen Stundenzeiger.');
    } else {
      setFeedback('Schau beide Zeiger noch einmal genau an.');
    }
    playDing(false);
  };

  const changeStudentHour = (delta: number) => {
    setStudentClock((current) => ({ ...current, h: ((current.h - 1 + delta + 12) % 12) + 1 }));
    setChecked(false);
  };

  const changeStudentMinute = (delta: number) => {
    setStudentClock((current) => {
      const options = minuteOptions;
      const currentIndex = Math.max(0, options.indexOf(current.m));
      const nextIndex = (currentIndex + delta + options.length) % options.length;
      return { ...current, m: options[nextIndex] };
    });
    setChecked(false);
  };

  const checkSetAnswer = () => {
    setChecked(true);
    const correct = studentClock.h === targetClock.h && studentClock.m === targetClock.m;
    setFeedback(correct ? 'Richtig eingestellt.' : 'Noch nicht. Prüfe Minuten- und Stundenzeiger getrennt.');
    playDing(correct);
  };

  const displayClock = mode === 'read' ? targetClock : studentClock;
  const hourDeg = (displayClock.h % 12) * 30 + displayClock.m * 0.5;
  const minDeg = displayClock.m * 6;
  const isCorrect = mode === 'read'
    ? checked && selectedChoice === formatTime(targetClock)
    : checked && studentClock.h === targetClock.h && studentClock.m === targetClock.m;

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-1" role="tablist" aria-label="Uhrentrainer-Modus">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'read'}
            onClick={() => setMode('read')}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold ${
              mode === 'read' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Uhr ablesen
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'set'}
            onClick={() => setMode('set')}
            className={`min-h-11 px-3 rounded-lg text-xs sm:text-sm font-bold ${
              mode === 'set' ? 'bg-accent text-accent-text shadow-sm' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Uhr einstellen
          </button>
        </div>

        <div className="flex flex-wrap gap-1" role="group" aria-label="Uhrzeit-Schwierigkeit">
          {(['hour', 'half', 'quarter'] as const).map((difficulty) => (
            <button
              key={difficulty}
              type="button"
              onClick={() => setLevel(difficulty)}
              className={`min-h-11 px-2.5 rounded-lg border text-xs font-bold ${
                level === difficulty
                  ? 'bg-accent text-accent-text border-accent'
                  : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent'
              }`}
            >
              {difficulty === 'hour' ? 'Volle Stunden' : difficulty === 'half' ? 'Halbe Stunden' : 'Viertelstunden'}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2">
        <div className="rounded-xl bg-accent-soft border border-accent/20 px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mode === 'read'
            ? 'Merke: Der lange Zeiger zeigt die Minuten, der kurze Zeiger die Stunden.'
            : `Ziel: ${formatTime(targetClock)} Uhr`}
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-300" aria-label="Zeiger-Legende">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1 w-6 rounded bg-orange-600" />
            Minutenzeiger
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-5 rounded bg-slate-800 dark:bg-slate-200" />
            Stundenzeiger
          </span>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-5 sm:gap-7 py-2">
        <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full bg-amber-50 border-4 border-amber-500 flex items-center justify-center shadow-lg">
          <svg className="w-[92%] h-[92%]" viewBox="0 0 100 100" role="img" aria-label={`Analoge Uhr mit ${formatTime(displayClock)} Uhr`}>
            <circle cx="50" cy="50" r="48" fill="white" stroke="#d97706" strokeWidth="1.5" />
            {Array.from({ length: 60 }, (_, index) => {
              const major = index % 5 === 0;
              return (
                <line
                  key={index}
                  x1="50"
                  y1={major ? '4' : '5.5'}
                  x2="50"
                  y2={major ? '10' : '8'}
                  stroke={major ? '#451a03' : '#cbd5e1'}
                  strokeWidth={major ? '2' : '0.8'}
                  transform={`rotate(${index * 6} 50 50)`}
                />
              );
            })}
            {[12,1,2,3,4,5,6,7,8,9,10,11].map((number, index) => {
              const angle = (index * 30 - 90) * Math.PI / 180;
              return (
                <text
                  key={number}
                  x={50 + Math.cos(angle) * 36}
                  y={52.5 + Math.sin(angle) * 36}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="900"
                  fill="#451a03"
                >
                  {number}
                </text>
              );
            })}
            <line x1="50" y1="50" x2="50" y2="29" stroke="#1e293b" strokeWidth="4.5" strokeLinecap="round" transform={`rotate(${hourDeg} 50 50)`} />
            <line x1="50" y1="50" x2="50" y2="16" stroke="#ea580c" strokeWidth="2.8" strokeLinecap="round" transform={`rotate(${minDeg} 50 50)`} />
            <circle cx="50" cy="50" r="3.8" fill="#ea580c" />
          </svg>
        </div>

        {mode === 'read' ? (
          <div className="w-full max-w-xs">
            <div className="grid grid-cols-2 gap-2">
              {choices.map((choice) => {
                const selected = selectedChoice === choice;
                const correct = choice === formatTime(targetClock);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => checkReadAnswer(choice)}
                    className={`min-h-14 rounded-xl border-2 font-mono font-black text-base active:scale-95 transition-all ${
                      checked && selected
                        ? correct
                          ? 'bg-emerald-500 text-white border-emerald-600'
                          : 'bg-rose-500 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-accent'
                    }`}
                  >
                    {choice} Uhr
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xs flex flex-col gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-center">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Deine Uhr</div>
              <div className="mt-1 text-3xl font-black tabular-nums text-accent">{formatTime(studentClock)}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => changeStudentHour(-1)} className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:border-accent" aria-label="Stundenzeiger zurück">− Stunde</button>
              <button type="button" onClick={() => changeStudentHour(1)} className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:border-accent" aria-label="Stundenzeiger vor">+ Stunde</button>
              <button type="button" onClick={() => changeStudentMinute(-1)} className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:border-accent" aria-label="Minutenzeiger zurück">− Minuten</button>
              <button type="button" onClick={() => changeStudentMinute(1)} className="min-h-11 rounded-xl border border-slate-300 dark:border-slate-700 font-bold hover:border-accent" aria-label="Minutenzeiger vor">+ Minuten</button>
            </div>
            <button type="button" onClick={checkSetAnswer} className="min-h-11 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-black">
              Uhr prüfen
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 flex justify-center">
        <button
          type="button"
          onClick={() => rollNewTime(mode)}
          className="min-h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 font-bold text-sm hover:border-accent"
        >
          Neue Uhrzeit
        </button>
      </div>

      <p
        aria-live="polite"
        className={`shrink-0 min-h-11 rounded-xl border px-3 py-2 flex items-center justify-center text-center text-xs sm:text-sm font-semibold ${
          isCorrect
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
            : checked
              ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
              : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
        }`}
      >
        {feedback}
      </p>
    </div>
  );
};


// ========================================================
// 23. WIDGET: BRUCHTEILE-MALER (FractiongridWidgetContent)
// ========================================================
export const FractiongridWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [shape, setShape] = useState<'circle' | 'grid' | 'strip'>('grid');
  const [totalSquares, setTotalSquares] = useState<number>(8);
  const [targetNum, setTargetNum] = useState<number>(3);
  const [coloredCells, setColoredCells] = useState<boolean[]>(Array(8).fill(false));
  const [feedback, setFeedback] = useState<string>("Male den angegebenen Bruchteil an! 🍕");

  // Adapt divider counts to shapes
  const getSlicesOptions = () => {
    if (shape === 'circle') return [3, 4, 6, 8, 12];
    if (shape === 'strip') return [3, 4, 5, 6, 8, 10];
    return [4, 6, 8, 9, 12, 16]; // grid
  };

  const generateFractionChallenge = useCallback((total: number, currentShape = shape) => {
    setTotalSquares(total);
    const pickedNum = Math.floor(Math.random() * (total - 1)) + 1;
    setTargetNum(pickedNum);
    setColoredCells(Array(total).fill(false));
    
    const emoji = currentShape === 'circle' ? '🍕' : currentShape === 'strip' ? '📏' : '🟥';
    setFeedback(`${emoji} Färbe genau ${pickedNum}/${total} der Form ein!`);
  }, [shape]);

  useEffect(() => {
    // Select a valid total for the chosen shape
    const options = getSlicesOptions();
    const defaultTotal = options.includes(totalSquares) ? totalSquares : options[0];
    generateFractionChallenge(defaultTotal, shape);
  }, [shape, generateFractionChallenge]);

  const playGridPop = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (success) {
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        });
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      }
    } catch {}
  };

  const handleToggleCell = (idx: number) => {
    const copy = [...coloredCells];
    copy[idx] = !copy[idx];
    setColoredCells(copy);
    
    // Quick mini sound effect
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 650;
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  };

  const checkAnswer = () => {
    const counted = coloredCells.filter(Boolean).length;
    if (counted === targetNum) {
      setFeedback("🎉 Perfekt richtig eingefärbt! Ausgezeichnet!");
      playGridPop(true);
    } else {
      setFeedback(`⚠️ Das sind leider nur ${counted}/${totalSquares}. Gesucht ist ${targetNum}/${totalSquares}!`);
      playGridPop(false);
    }
  };

  // Helper to determine Grid Columns
  const getGridCols = () => {
    if (totalSquares === 4) return 'grid-cols-2';
    if (totalSquares === 6) return 'grid-cols-3';
    if (totalSquares === 8) return 'grid-cols-4';
    if (totalSquares === 9) return 'grid-cols-3';
    if (totalSquares === 12) return 'grid-cols-4';
    if (totalSquares === 16) return 'grid-cols-4';
    return 'grid-cols-4';
  };

  // SVG drawing for circle slices
  const renderCircleShape = () => {
    const radius = 42;
    const slices = [];
    const step = 360 / totalSquares;
    for (let i = 0; i < totalSquares; i++) {
      const startAngle = i * step;
      const endAngle = (i + 1) * step;
      const rad1 = (startAngle - 90) * Math.PI / 180;
      const rad2 = (endAngle - 90) * Math.PI / 180;
      const x1 = 50 + radius * Math.cos(rad1);
      const y1 = 50 + radius * Math.sin(rad1);
      const x2 = 50 + radius * Math.cos(rad2);
      const y2 = 50 + radius * Math.sin(rad2);
      const largeArcFlag = step > 180 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
      slices.push({ pathData, active: coloredCells[i] });
    }

    return (
      <svg className="w-28 h-28 transform -rotate-90 filter drop-shadow-md" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" fill={currentIsLight ? '#fef3c7' : '#1e1b4b'} stroke="#f59e0b" strokeWidth="2.5" />
        {slices.map((slice, idx) => (
          <path
            key={idx}
            d={slice.pathData}
            onClick={() => handleToggleCell(idx)}
            className="cursor-pointer transition-colors duration-200 hover:opacity-90"
            fill={slice.active ? '#f97316' : currentIsLight ? '#ffffff' : '#3f3f46'}
            stroke={currentIsLight ? '#b45309' : '#1e1b4b'}
            strokeWidth="1.5"
          />
        ))}
        <circle cx="50" cy="50" r="4" fill="#d97706" />
      </svg>
    );
  };

  // SVG drawing for strip shape
  const renderStripShape = () => {
    return (
      <div className="flex border-3 border-orange-500 rounded-xl overflow-hidden w-full max-w-[180px] h-10 shadow-md">
        {coloredCells.map((active, idx) => (
          <button
            key={idx}
            onClick={() => handleToggleCell(idx)}
            className={`flex-1 border-r last:border-r-0 transition-colors duration-200 cursor-pointer ${
              active 
                ? 'bg-orange-500 border-orange-600' 
                : currentIsLight 
                  ? 'bg-white border-slate-300 hover:bg-amber-50' 
                  : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 overflow-y-auto overflow-x-hidden">
      
      {/* Upper header row */}
      <div className="shrink-0 flex justify-between items-start mb-1 gap-1 border-b border-slate-100 dark:border-zinc-800 pb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            🍕 Bruchteile-Maler
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Wähle Form & Einteilungen!</span>
        </div>
        
        {/* Form buttons */}
        <div className="flex gap-0.5">
          {(['grid', 'circle', 'strip'] as const).map(f => (
            <button
              key={f}
              onClick={() => setShape(f)}
              className={`px-1 py-0.5 rounded text-[6.5px] font-black uppercase cursor-pointer ${
                shape === f ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600'
              }`}
            >
              {f === 'grid' ? 'Gitter 🟥' : f === 'circle' ? 'Kreis 🍕' : 'Streifen 📏'}
            </button>
          ))}
        </div>
      </div>

      {/* Parts dividers buttons bar */}
      <div className="shrink-0 flex justify-between items-center bg-slate-100/60 dark:bg-black/20 p-1 rounded-xl mb-1.5 text-[6.5px] font-black">
        <span className="text-slate-400 uppercase">Teile (Nenner):</span>
        <div className="flex gap-0.5">
          {getSlicesOptions().map(total => (
            <button
              key={total}
              onClick={() => generateFractionChallenge(total, shape)}
              className={`px-1.5 py-0.5 rounded font-black cursor-pointer transition-all ${
                totalSquares === total 
                  ? 'bg-indigo-500 text-white scale-102 shadow-xs' 
                  : 'bg-slate-200 dark:bg-zinc-800 text-slate-700'
              }`}
            >
              {total}
            </button>
          ))}
        </div>
      </div>

      {/* Challenge goal displays */}
      <div className="flex-grow flex flex-col justify-center items-center py-1.5 min-h-0">
        <div className="bg-orange-500/10 p-1 px-3 border border-orange-500 rounded-xl mb-2 text-center shadow-inner">
          <span className="text-sm font-black text-orange-600 leading-none">
            {targetNum} / {totalSquares}
          </span>
        </div>

        {/* Dynamic shape visualizer */}
        <div className="flex justify-center items-center w-full">
          {shape === 'circle' && renderCircleShape()}
          {shape === 'strip' && renderStripShape()}
          {shape === 'grid' && (
            <div className={`grid gap-1 scale-95 ${getGridCols()}`}>
              {coloredCells.map((isColored, idx) => (
                <button
                  key={idx}
                  onClick={() => handleToggleCell(idx)}
                  className={`w-7 h-7 rounded-lg border-2 transition-all cursor-pointer ${
                    isColored
                      ? 'bg-orange-500 border-orange-600 scale-102 shadow-md'
                      : currentIsLight
                        ? 'bg-white border-slate-300 hover:bg-amber-50'
                        : 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control Actions */}
      <div className="shrink-0 flex gap-1 items-center mt-1">
        <button
          onClick={checkAnswer}
          className="flex-grow py-1 rounded bg-orange-500 hover:bg-orange-600 text-white font-black text-[8px] uppercase tracking-widest cursor-pointer active:scale-95 transition-all"
        >
          Prüfen ✔
        </button>
        <button
          onClick={() => generateFractionChallenge(totalSquares, shape)}
          className="py-1 px-1.5 rounded bg-slate-400 text-white font-bold text-[8px]"
        >
          Neu Rechen
        </button>
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};


// ========================================================
// 25. WIDGET: WORT- & SATZWERKSTATT (Legacy Wordbuilder)
// ========================================================
export const WordbuilderWidgetContent: React.FC<{
  widget?: any;
  currentIsLight?: boolean;
  onUpdate?: (updates: any) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = ({
  widget,
  currentIsLight = true,
  onUpdate,
  isFullscreen,
  showSettings,
  onCloseSettings,
}) => {
  return (
    <WortSatzWerkstattWidget
      widget={widget}
      currentIsLight={currentIsLight}
      onUpdate={onUpdate}
      isFullscreen={isFullscreen}
      defaultMode="word"
      showSettings={showSettings}
      onCloseSettings={onCloseSettings}
    />
  );
};

export const WortSatzWerkstattWidgetContent: React.FC<{
  widget?: any;
  currentIsLight?: boolean;
  onUpdate?: (updates: any) => void;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}> = (props) => {
  return <WortSatzWerkstattWidget {...props} />;
};

// ========================================================
// 27. WIDGET: NATUR-GERÄUSCHE-BOARD (SoundmachineWidgetContent - Konsolidiert mit Fokus-Klängen)
// ========================================================
export const SoundmachineWidgetContent: React.FC<CalmSoundsWidgetProps> = (props) => {
  return <CalmSoundsWidget {...props} />;
};


// ========================================================
// 28. WIDGET: GEWICHTE-BALKENWAAGE (MathbalancerWidgetContent)
// ========================================================
export const MathbalancerWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [leftWeight, setLeftWeight] = useState<number>(12);
  const [knownRight, setKnownRight] = useState<number>(5);
  const [unknownX, setUnknownX] = useState<number>(7);
  const [userGuess, setUserGuess] = useState<number | null>(null);
  const [status, setStatus] = useState<'leftHeavier' | 'rightHeavier' | 'balanced'>('leftHeavier');
  const [feedback, setFeedback] = useState<string>("Bringe die Balkenwaage ins Gleichgewicht.");
  const [showHint, setShowHint] = useState(false);

  const answerChoices = useMemo(() => {
    const pool = Array.from({ length: 18 }, (_, index) => index + 1).filter((value) => value !== unknownX);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
    }
    return [...pool.slice(0, 7), unknownX].sort((a, b) => a - b);
  }, [unknownX]);

  const generateBalanceProblem = useCallback(() => {
    const term1 = Math.floor(Math.random() * 8) + 2;
    const term2 = Math.floor(Math.random() * 8) + 2;
    const leftSum = term1 + term2;
    const rightKnown = Math.floor(Math.random() * (leftSum - 2)) + 1;
    const xSol = leftSum - rightKnown;

    setLeftWeight(leftSum);
    setKnownRight(rightKnown);
    setUnknownX(xSol);
    setUserGuess(null);
    setStatus('leftHeavier');
    setShowHint(false);
    setFeedback(`Links liegen ${leftSum} kg. Rechts liegen ${rightKnown} kg + X kg. Finde X.`);
  }, []);

  useEffect(() => {
    generateBalanceProblem();
  }, [generateBalanceProblem]);

  const speakScaleSound = (success: boolean) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (success) {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {}
  };

  const handleApplyGuess = (guess: number) => {
    setUserGuess(guess);
    const calculatedRight = knownRight + guess;
    if (calculatedRight === leftWeight) {
      setStatus('balanced');
      setFeedback(`Perfekt ausgewogen: ${leftWeight} kg = ${knownRight} kg + ${guess} kg.`);
      speakScaleSound(true);
    } else if (calculatedRight > leftWeight) {
      setStatus('rightHeavier');
      setFeedback(`Zu schwer: Rechts liegen jetzt ${calculatedRight} kg.`);
      speakScaleSound(false);
    } else {
      setStatus('leftHeavier');
      setFeedback(`Noch zu leicht: Rechts liegen erst ${calculatedRight} kg.`);
      speakScaleSound(false);
    }
  };

  return (
    <div className="min-h-full w-full p-3 sm:p-4 flex flex-col justify-between gap-3 select-none overflow-visible">
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div className={`rounded-xl border px-3 py-2 font-mono font-black text-lg sm:text-xl ${
          currentIsLight
            ? 'bg-slate-50 border-slate-200 text-slate-900'
            : 'bg-slate-800 border-slate-700 text-slate-100'
        }`}>
          {leftWeight} = {knownRight} + <span className="text-accent">{userGuess ?? 'X'}</span>
        </div>
        <button
          type="button"
          onClick={generateBalanceProblem}
          className="min-h-11 px-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold text-xs sm:text-sm shadow-sm transition-colors"
          aria-label="Neue Gewichte-Waage erstellen"
        >
          Neue Waage
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center gap-4 min-h-0">
        <div className="relative w-full max-w-sm h-28 flex justify-center items-end" aria-label="Balkenwaage">
          <div
            className={`absolute top-10 w-56 sm:w-64 h-1.5 bg-slate-500 origin-center transition-transform duration-500 flex justify-between px-4 items-start ${
              status === 'leftHeavier' ? 'rotate-6' : status === 'rightHeavier' ? '-rotate-6' : 'rotate-0'
            }`}
          >
            <div className="w-20 h-20 border-2 border-accent bg-amber-50 rounded-full flex items-center justify-center text-base font-black text-slate-800 -mt-[72px] shadow-sm">
              {leftWeight} kg
            </div>

            <div className="w-20 h-20 border-2 border-accent bg-orange-100 rounded-full flex flex-col items-center justify-center text-sm font-black text-slate-800 -mt-[72px] shadow-sm">
              <span>{knownRight} kg</span>
              <span className="text-xs text-orange-700">+ {userGuess !== null ? userGuess : 'X'} kg</span>
            </div>
          </div>

          <div className="w-3 h-14 bg-slate-400 rounded-t-lg" />
          <div className="absolute bottom-0 w-20 h-2 bg-slate-400 rounded-full" />
        </div>

        {showHint && status !== 'balanced' && (
          <div className="w-full max-w-sm rounded-xl border border-accent/30 bg-accent-soft px-3 py-2 text-center text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">
            Tipp: Starte bei {knownRight} und ergänze bis {leftWeight}. Wie viel fehlt?
          </div>
        )}

        <div className="grid grid-cols-4 gap-2 w-full max-w-sm">
          {answerChoices.map((guess) => (
            <button
              key={guess}
              type="button"
              onClick={() => handleApplyGuess(guess)}
              aria-pressed={userGuess === guess}
              className={`min-h-11 text-center font-black rounded-xl text-sm cursor-pointer active:scale-95 transition-all border ${
                userGuess === guess
                  ? status === 'balanced'
                    ? 'bg-emerald-500 text-white border-emerald-600'
                    : 'bg-rose-500 text-white border-rose-600'
                  : currentIsLight
                    ? 'bg-white border-slate-300 text-slate-800 hover:border-accent hover:bg-accent-soft'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-accent hover:bg-slate-700'
              }`}
            >
              {guess} kg
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex flex-col gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {status !== 'balanced' ? (
            <button
              type="button"
              onClick={() => setShowHint((value) => !value)}
              className="min-h-11 px-3 rounded-xl border border-accent/30 bg-accent-soft text-accent font-bold text-xs sm:text-sm hover:border-accent transition-colors"
              aria-pressed={showHint}
            >
              {showHint ? 'Tipp ausblenden' : 'Tipp anzeigen'}
            </button>
          ) : (
            <button
              type="button"
              onClick={generateBalanceProblem}
              className="min-h-11 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold text-sm shadow-sm"
            >
              Nächste Waage
            </button>
          )}
        </div>

      <p
        aria-live="polite"
        className={`shrink-0 min-h-11 flex items-center justify-center rounded-xl px-3 py-2 text-center text-xs sm:text-sm font-bold border ${
          status === 'balanced'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : userGuess !== null
              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        }`}
      >
        {feedback}
      </p>
      </div>
    </div>
  );
};


// ========================================================
// 29. WIDGET: ANIMAL AUDIO MEMORY (AnimalvoiceWidgetContent)
// ========================================================
export const AnimalvoiceWidgetContent: React.FC<{ widget: any, currentIsLight: boolean }> = ({ currentIsLight }) => {
  const [pitch, setPitch] = useState<number>(880);
  const [resonance, setResonance] = useState<number>(4);
  const [selectedProgram, setSelectedProgram] = useState<string>('chatter');
  const [isGlowing, setIsGlowing] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("Synthesizer bereit. Drücke PROGRAMM-TASTEN! 🤖");

  const programs = [
    { id: 'chatter', name: 'Computer 👾', desc: 'Süße binäre Chatters' },
    { id: 'laser', name: 'Laser 🛸', desc: 'Sci-Fi Weltall sweeps' },
    { id: 'servo', name: 'Gelenk ⚙️', desc: 'Ratternde Roboter-Joints' },
    { id: 'engine', name: 'Booster 🚀', desc: 'Tiefe Düsentriebwerke' },
    { id: 'siren', name: 'Warnung 🚨', desc: 'Alarm Modulator' },
    { id: 'greet', name: 'Robo-Form 🤖', desc: 'Metallisches Greet' }
  ];

  const triggerRobotSynthSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      setIsGlowing(true);
      setTimeout(() => setIsGlowing(false), 350);

      // Lowpass/Bandpass filter setup to map the Resonance slider
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(pitch * 2, now);
      filter.Q.setValueAtTime(resonance, now);
      filter.connect(ctx.destination);

      if (selectedProgram === 'chatter') {
        // Stochastic arpeggiator computer chatter trigger
        setFeedback("⚙️ Generiere arithmetische Binär-Chatters...");
        [0, 0.05, 0.1, 0.15, 0.2, 0.25].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          
          // Random walk frequency scaled by pitch slider
          const noteFreq = pitch * (0.6 + Math.sin(idx * 3) * 0.4) * (1 + (Math.random() * 0.15));
          osc.frequency.setValueAtTime(noteFreq, now + delay);
          
          gain.gain.setValueAtTime(0.06, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.045);
          
          osc.connect(gain).connect(filter);
          osc.start(now + delay);
          osc.stop(now + delay + 0.05);
        });
      } else if (selectedProgram === 'laser') {
        // Fast downward pitch sweep (Laser)
        setFeedback("🛸 Zapp! Kosmische Gamma-Explosion!");
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        
        osc.frequency.setValueAtTime(pitch * 2.2, now);
        osc.frequency.exponentialRampToValueAtTime(80 + (pitch * 0.15), now + 0.25);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.connect(gain).connect(filter);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (selectedProgram === 'servo') {
        // Simulated mechanical robotic joint (Servo joint rotation)
        setFeedback("⚙️ Servo_Befehl: _ROTATION_AKTIV...");
        // Use a continuous triangle wave + rapid amplitude modulation to make it buzz/click
        const osc = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch * 0.45, now);
        osc.frequency.linearRampToValueAtTime(pitch * 0.6, now + 0.35);

        modulator.type = 'sawtooth';
        modulator.frequency.value = 55; // 55Hz vibration
        modGain.gain.setValueAtTime(pitch * 0.15, now);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.38);

        modulator.connect(modGain);
        modGain.connect(osc.frequency);

        osc.connect(gain).connect(filter);
        modulator.start(now);
        osc.start(now);
        modulator.stop(now + 0.4);
        osc.stop(now + 0.4);
      } else if (selectedProgram === 'engine') {
        // Rocket Booster sub-bass growl with tremolo
        setFeedback("🚀 Booster-Triebwerke zünden... Volle Resonanz!");
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(35 + (pitch * 0.04), now);
        osc.frequency.exponentialRampToValueAtTime(55 + (pitch * 0.08), now + 0.42);

        lfo.type = 'sine';
        lfo.frequency.value = 14; // tremolo freq
        lfoGain.gain.setValueAtTime(0.07, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        lfo.connect(lfoGain).connect(gain.gain);
        osc.connect(gain).connect(filter);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.45);
        osc.stop(now + 0.45);
      } else if (selectedProgram === 'siren') {
        // Frequency modulated warning alarm sirens
        setFeedback("🚨 Systemmeldung: _WARNUNG_RESONANZ_!!!");
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(pitch * 0.8, now);
        osc.frequency.linearRampToValueAtTime(pitch * 1.4, now + 0.18);
        osc.frequency.linearRampToValueAtTime(pitch * 0.8, now + 0.35);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        osc.connect(gain).connect(filter);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Metallic speech ring modulation (Robo-Greet)
        setFeedback("🤖 Servus! Ich bin dein Klassen-Snythesizers!");
        const carrier = ctx.createOscillator();
        const modulator = ctx.createOscillator();
        const modGain = ctx.createGain();
        const gain = ctx.createGain();

        carrier.type = 'sawtooth';
        carrier.frequency.setValueAtTime(pitch * 0.3, now);

        modulator.type = 'sine';
        modulator.frequency.value = 120; // Formant ring modulator
        modGain.gain.setValueAtTime(pitch * 0.8, now);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        modulator.connect(modGain).connect(carrier.frequency);
        carrier.connect(gain).connect(filter);

        modulator.start(now);
        carrier.start(now);
        modulator.stop(now + 0.35);
        carrier.stop(now + 0.35);
      }
    } catch {}
  };

  const robotSoundAction = useAccessibleAction(triggerRobotSynthSound);

  return (
    <div className="flex flex-col h-full w-full p-2.5 justify-between select-none min-h-0 pointer-events-auto">
      <div className="shrink-0 flex justify-between items-center mb-1">
        <div className="flex flex-col">
          <span className={`text-[9px] font-black uppercase tracking-widest ${currentIsLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
            👂 Roboter-Sounds
          </span>
          <span className="text-[7.5px] font-mono opacity-80 font-black">Synthesizer-Gehörschulung & Klangwelten</span>
        </div>
      </div>

      {/* Cybernetic responsive vector graphics & controls rows */}
      <div className="flex-grow flex flex-row items-center justify-around gap-2.5 min-h-0 py-1">
        {/* Animated glowing vector robotic face mask */}
        <button
          type="button"
          {...robotSoundAction.buttonProps}
          aria-label="Roboter-Sound abspielen"
          className={`relative min-h-11 min-w-11 w-[65px] h-[78px] rounded-2xl border-3 flex flex-col items-center justify-around p-1.5 shadow-sm cursor-pointer transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
            isGlowing
              ? 'bg-indigo-500/20 border-teal-400 scale-105 shadow-xl ring-2 ring-teal-400'
              : 'bg-slate-100/60 border-slate-400 dark:bg-black/30 dark:border-zinc-700'
          }`}
        >
          {/* Antennas */}
          <div className={`w-1 h-3 rounded-t-full transition-colors duration-200 ${isGlowing ? 'bg-teal-400 animate-ping' : 'bg-slate-500'}`} />
          
          {/* Eyes */}
          <div className="flex justify-between w-full px-2 mt-1">
            <div className={`w-3 h-3 rounded-full border transition-all duration-200 ${isGlowing ? 'bg-teal-400 border-white scale-110 shadow-lg' : 'bg-slate-800 dark:bg-zinc-950 border-transparent'}`} />
            <div className={`w-3 h-3 rounded-full border transition-all duration-200 ${isGlowing ? 'bg-teal-400 border-white scale-110 shadow-lg' : 'bg-slate-800 dark:bg-zinc-950 border-transparent'}`} />
          </div>

          <div className="w-10 h-0.5 bg-slate-400 dark:bg-zinc-650" />

          {/* Glowing speaker matrix mouth */}
          <div className="flex items-center gap-0.5 mt-1.5 h-3">
            {[1, 2, 3, 4, 5].map((bar) => {
              const h = isGlowing ? `${Math.floor(Math.random() * 8) + 4}px` : '3px';
              return (
                <div 
                  key={bar} 
                  className={`w-1 rounded-sm transition-all duration-150 ${isGlowing ? 'bg-cyan-400' : 'bg-slate-700'}`}
                  style={{ height: h }}
                />
              );
            })}
          </div>
          <span className="text-[6.5px] font-mono tracking-widest uppercase mt-auto text-slate-500">PLAY</span>
        </button>

        {/* Modular programs selection */}
        <div className="flex-1 flex flex-col gap-1.5 justify-center min-h-0 select-none">
          <div className="grid grid-cols-2 gap-0.5">
            {programs.map((prog) => (
              <button
                key={prog.id}
                onClick={() => {
                  setSelectedProgram(prog.id);
                  setFeedback(`Bereit: ${prog.name}. Drücke links aufs Gesicht!`);
                }}
                className={`py-1 text-[7px] font-black truncate rounded-lg border transition-all cursor-pointer ${
                  selectedProgram === prog.id
                    ? 'bg-indigo-500 text-white border-indigo-600 scale-95 font-black shadow'
                    : currentIsLight
                      ? 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                      : 'bg-zinc-800 border-zinc-700 text-slate-300 hover:bg-zinc-750'
                }`}
              >
                {prog.name}
              </button>
            ))}
          </div>

          {/* Knobs / Sliders to adjust sound synthesis online */}
          <div className="space-y-1 bg-slate-100/30 dark:bg-zinc-900/40 p-1.5 rounded-lg border border-slate-200/50 dark:border-white/5">
            <div className="flex justify-between text-[6.5px] font-extrabold uppercase text-slate-500">
              <span>Frequenz (Hz):</span>
              <span className="font-mono text-indigo-505 text-indigo-500 font-black">{pitch}Hz</span>
            </div>
            <input 
              type="range"
              min="150"
              max="1800"
              value={pitch}
              onChange={(e) => setPitch(parseInt(e.target.value))}
              className="w-full accent-teal-400 h-1"
            />

            <div className="flex justify-between text-[6.5px] font-extrabold uppercase text-slate-500">
              <span>Filter-Resonanz (Q):</span>
              <span className="font-mono text-indigo-505 text-indigo-500 font-black">Q={resonance}</span>
            </div>
            <input 
              type="range"
              min="1"
              max="15"
              value={resonance}
              onChange={(e) => setResonance(parseInt(e.target.value))}
              className="w-full accent-teal-400 h-1"
            />
          </div>
        </div>
      </div>

      <p className="shrink-0 text-[7px] font-extrabold text-blue-500 text-center truncate mt-0.5">{feedback}</p>
    </div>
  );
};



