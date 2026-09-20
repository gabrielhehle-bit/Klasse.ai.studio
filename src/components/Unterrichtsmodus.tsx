import { shouldApplyTafelCommand } from '../lib/tafelCommands';
import { getTodayIsoDate } from '../lib/kidAttendanceAlgorithm';
import { dailyBehaviorEntries } from '../lib/dailyBehaviorEntries';
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import { createPortal } from "react-dom";
import { useApp } from "../context/AppContext";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from "recharts";
import { Note, UNIFIED_DEFAULT_BADGES } from "../types";
import {
  generatePetChatResponse,
  generatePetSpeech,
  callServerAI,
} from "../services/aiService";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Info,
  Star,
  X,
  ArrowLeft,
  Gem,
  Smile,
  Trophy,
  Circle,
  Clock as ClockIcon,
  Users,
  ArrowRight,
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  MessageSquare,
  Send,
  RefreshCw,
  ExternalLink,
  Activity,
  Map as MapIcon,
  BarChart3,
  Plus,
  ChevronRight,
  ChevronLeft,
  Edit3,
  Save,
  Music,
  Flag,
  GraduationCap,
  Laptop,
  BookOpen,
  Quote,
  Scissors,
  Download,
  Moon,
  Youtube,
  Zap,
  Sparkles,
  Monitor,
  Layout,
  Settings,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  Palette,
  Type,
  Gamepad2,
  Search,
  Link,
  Ghost,
  Minus,
  Trash2,
  Check,
  QrCode,
  Target,
  Network,
  ListTodo,
  Waves,
  Settings2,
  Sliders,
  Hourglass,
  StickyNote,
  ListChecks,
  CloudSun,
  Lightbulb,
  ChevronDown,
  Calendar,
  CalendarDays,
  PartyPopper,
  Maximize,
  Minimize,
  Grid,
  Wifi,
  Watch,
  GlassWater,
  Ear,
  CheckSquare,
  Volume2 as VolumeIcon,
  Square,
  AlignJustify,
  Grid3X3,
  Maximize2,
  Heart,
  User,
  Scaling,
  Home,
  Eye,
  Edit2,
  CircleDot,
  Compass,
  Hexagon,
  Columns2,
  Columns3,
  Smartphone,
  MoreHorizontal,
  Unlock,
  PenTool,
  Presentation,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import {
  getKW,
  getTodayName,
  logStatusChange,
  logObservation,
  getSW,
} from "../lib/utils";
import {
  UNTERRICHTSMODUS_THEMES,
  UNTERRICHTSMODUS_HINTERGRUENDE,
} from "../lib/unterrichtsmodusThemes";
import { RichTextEditor } from "./RichTextEditor";
import { useToast } from "../context/ToastContext";
import { PET_BREEDS, AVAILABLE_ACCESSORIES } from "./ClassPetWidget";
import { MobileRemoteController } from "./MobileRemoteController";
import { UnterrichtsmodusThemePicker } from "./UnterrichtsmodusThemePicker";
import { ClassPetCanvas } from "./ClassPetCanvas";
import { ALL_WIDGET_CONFIG } from "./WidgetConfig";

const Attendance = React.lazy(() => import("./Attendance"));
const SeatingPlan = React.lazy(() => import("./SeatingPlan"));
const Gradebook = React.lazy(() => import("./Gradebook"));

import { UEBUNGEN, STANDARD_DIENSTE } from "./Rituale";
import { FONTS, MAX_LESSON_SLOTS, STUNDEN_INFO } from "../constants";
import { buildLessonTimeSlots, findCurrentLessonBreak, findCurrentLessonSlot } from "../lib/lessonTimeSlots";
import MorningCircleWidget from "./MorningCircleWidget";
import MorningRiddleWidget from "./MorningRiddleWidget";
import QuizWidget from "./QuizWidget";
import MindmapWidget from "./MindmapWidget";
import WhiteboardWidget from "./WhiteboardWidget";
import Tafel from "./Tafel";
import LernwoerterWidget from "./LernwoerterWidget";
import FlowerPuzzleWidget from "./FlowerPuzzleWidget";
const MemoizedFlowerPuzzleWidget = memo(FlowerPuzzleWidget);
import { PenLine, Copy, AlignRight } from "lucide-react";
import { generateStudentGroups } from "../lib/groupsAlgorithm";
import { getPresentStudents, getDisplayStudentName } from "./cockpit/studentSelectionUtils";
import { CockpitWidget } from "./cockpit/CockpitWidget";
import { CockpitVorlagenModal } from "./cockpit/CockpitVorlagenModal";
import { BoardTextEditor } from "./cockpit/BoardTextEditor";
import { BoardInk, type InkItem } from "./cockpit/BoardInk";
import { BirthdayCelebration } from "./cockpit/BirthdayCelebration";
import { PLANNED_COCKPIT_WIDGETS } from "./cockpit/plannedCockpitCatalog";
import { getCheckInMode } from "../lib/checkInWidgetMode";
import { COCKPIT_PAPERS, getCockpitPaperStyle, normalizeCockpitPaperSpacing, type CockpitPaper } from "../lib/cockpitPaper";
import { COCKPIT_QUICKBAR_ITEMS, normalizeCockpitQuickbarSettings, toggleCockpitQuickbarItem } from "../lib/cockpitQuickbar";
import { PublicStudentListWidget as StudentListWidgetContent } from "./cockpit/PublicStudentListWidget";
import { ClassRewardWidget } from "./cockpit/widgets/ClassRewardWidget";
import {
  LärmWidgetContent,
  LernwoerterWidgetContent,
  GroupsWidgetContent,
  QrCodeWidgetContent,
  ImageWidgetContent,
  PhasenWidgetContent,
  SoundsWidgetContent as LegacySoundsWidgetContent,
  TodoWidgetContent as LegacyTodoWidgetContent,
  DiensteWidgetContent,
  LinksWidgetContent,
  DrawingWidgetContent,
  PetWidgetContent,
  StopwatchWidgetContent,
  CalculatorWidgetContent,
  DiceWidgetContent,
  WeatherWidgetContent,
  AIQuizWidgetContent,
  RiddleWidgetContent,
  ScoreboardWidgetContent,
  WheelWidgetContent,
  BreathingWidgetContent,
  KidWeatherWidgetContent,
  MathcardsWidgetContent,
  ScramblerWidgetContent,
  WatertrackerWidgetContent,
  WordchainWidgetContent,
  MoodmeterWidgetContent,
  ColormixerWidgetContent,
  WordgridWidgetContent,
  RhythmWidgetContent,
  GeometryWidgetContent,
  WordclockWidgetContent,
  SortingWidgetContent,
  DailyquotesWidgetContent,
  DictionaryWidgetContent,
  PianoWidgetContent,
  BodypartsWidgetContent,
  ToothbrushWidgetContent,
  ChallengeWidgetContent,
  CompassWidgetContent,
  WeekdaysWidgetContent,
  PiggybankWidgetContent,
  NoisescalesWidgetContent as LegacyNoisescalesWidgetContent,
  WordscrambleWidgetContent,
  ShadowshapesWidgetContent,
  EmotionsWidgetContent,
  ClocksyncWidgetContent,
  SoundmemoryWidgetContent,
  SpellingdetectiveWidgetContent,
  NumberlineWidgetContent,
  MathchainWidgetContent,
  ThermometerWidgetContent,
  CompoundsplitWidgetContent,
  MathduelWidgetContent,
  ShapepuzzleWidgetContent,
  GuitartunerWidgetContent,
  SecretagentWidgetContent,
  SentencebuildingWidgetContent,
  PatternmakerWidgetContent,
  WordexplorerWidgetContent,
  WeightscaleWidgetContent,
  GeographyquizWidgetContent,
  CalmrainWidgetContent,
  EstimationjarWidgetContent,
  ReflexgameWidgetContent,
  MathpyramidWidgetContent,
  WastebinWidgetContent,
  TonetrainerWidgetContent,
  AngledetectiveWidgetContent,
  RhymemachineWidgetContent,
  AlphabetsoupWidgetContent,
  DivrobotWidgetContent,
  ClasstargetWidgetContent,
  MorsecodeWidgetContent,
  PunctuationzooWidgetContent,
  SecretcodeWidgetContent,
  ClockpuzzleWidgetContent,
  TrafficquizWidgetContent,
  WordbuilderWidgetContent,
  WortSatzWerkstattWidgetContent,
  WatercycleWidgetContent,
  SoundmachineWidgetContent,
  MathbalancerWidgetContent,
  AnimalvoiceWidgetContent,
  ConstellationWidgetContent,
} from "./cockpit/CockpitWidgetContents";
import {
  MultitrainerWidgetContent,
  MoneycalcWidgetContent,
  StoryemojisWidgetContent,
  AbcorderWidgetContent,
  PlanetariumWidgetContent,
  TischCheckWidgetContent,
  FairCallWidgetContent,
} from "./cockpit/NewWidgets";
import { TimelineWidgetContent } from "./cockpit/TimelineWidgetContent";
import { ClockWidgetContent } from "./cockpit/ClockWidgetContent";
import { PhasesWidgetContent } from "./cockpit/PhasesWidgetContent";
import { TrafficLightWidgetContent } from "./cockpit/TrafficLightWidgetContent";
import { NoiseMeterWidgetContent } from "./cockpit/NoiseMeterWidgetContent";
import { NoiseScaleWidgetContent } from "./cockpit/NoiseScaleWidgetContent";
import { SoundsWidgetContent } from "./cockpit/SoundsWidgetContent";
import { TodoWidgetContent } from "./cockpit/TodoWidgetContent";
import { RandomNameWidgetContent } from "./cockpit/RandomNameWidgetContent";
import { AnschauungWidgetContent } from "./cockpit/AnschauungWidgetContent";
import { KidAttendanceWidgetContent } from "./cockpit/KidAttendanceWidgetContent";
import { ZahlenraumStudioContent } from "./cockpit/ZahlenraumStudioContent";
import { KopfrechenStudioContent } from "./cockpit/KopfrechenStudioContent";
import { FractionVisualizerContent } from "./cockpit/FractionVisualizerContent";
import { TimerWidgetContent } from "./cockpit/TimerWidgetContent";
import { InstructionWidget } from "./cockpit/widgets/InstructionWidget";
import { CockpitWidgetConfig } from "../types";

// Web Audio API Sound Generation
const playSound = (
  type:
    | "bowl"
    | "beep"
    | "fanfare"
    | "applause"
    | "tada"
    | "error"
    | "bell"
    | "laser"
    | "timer"
    | "nature",
) => {
  const AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  const now = ctx.currentTime;

  if (type === "applause") {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1000, now);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.2);
    gain.gain.linearRampToValueAtTime(0, now + 2);
    noise.start(now);
    noise.stop(now + 2);
    return;
  }

  if (type === "nature") {
    // Generate soft white noise wind sweep
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.setValueAtTime(3, now);
    // Modulate filter frequency to mimic waves
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 1.2);
    filter.frequency.exponentialRampToValueAtTime(300, now + 3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 3);

    noise.start(now);
    noise.stop(now + 3);
    return;
  }

  if (type === "bell") {
    // Brass gong/bell toll using multiple sinusoids for natural resonance
    const partials = [1, 1.2, 1.5, 2, 2.5, 3];
    const baseFreq = 392; // G4 bell tone
    partials.forEach((p, idx) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(
        baseFreq * p + (idx === 0 ? 0 : Math.random() * 4 - 2),
        now,
      );

      const volume = 0.25 / (idx + 1);
      g.gain.setValueAtTime(volume, now);
      // Overtone decay faster
      const decay = 2.5 / (p * 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, now + decay);

      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + decay);
    });
    return;
  }

  if (type === "laser") {
    // Fast spacey downward sweep to instantly get focus
    osc.type = "triangle";
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.35);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
    return;
  }

  if (type === "timer") {
    // Play 4 ticking pulses simulating a countdown timer
    for (let i = 0; i < 4; i++) {
      const tickOsc = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tickOsc.type = "sine";
      tickOsc.frequency.setValueAtTime(1200, now + i * 0.4);
      tickGain.gain.setValueAtTime(0.15, now + i * 0.4);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.08);
      tickOsc.connect(tickGain);
      tickGain.connect(ctx.destination);
      tickOsc.start(now + i * 0.4);
      tickOsc.stop(now + i * 0.4 + 0.08);
    }
    return;
  }

  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === "bowl") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, now);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
    osc.start(now);
    osc.stop(now + 4);
  } else if (type === "beep") {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === "error") {
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === "tada") {
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);
    osc.frequency.setValueAtTime(1046.5, now + 0.3);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  } else if (type === "fanfare") {
    osc.type = "square";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(554.37, now + 0.1);
    osc.frequency.setValueAtTime(659.25, now + 0.2);
    osc.frequency.setValueAtTime(880, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
};

const playPetSound = (breedId: string) => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  
  if (breedId === "dog") {
    // Dog bark: two quick high pitch barks
    [0, 0.15].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(450, now + delay);
      osc.frequency.exponentialRampToValueAtTime(700, now + delay + 0.05);
      osc.frequency.exponentialRampToValueAtTime(300, now + delay + 0.12);
      gain.gain.setValueAtTime(0.2, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.12);
    });
  } else if (breedId === "cat") {
    // Cat meow: upward then downward pitch sweep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.quadraticCurveToValueAtTime(880, now + 0.15, 650, now + 0.35);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (breedId === "owl") {
    // Owl hoot: "Hoo-hoo!"
    [0, 0.25].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now + delay);
      osc.frequency.exponentialRampToValueAtTime(360, now + delay + 0.08);
      osc.frequency.exponentialRampToValueAtTime(320, now + delay + 0.2);
      gain.gain.setValueAtTime(0.25, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.2);
    });
  } else if (breedId === "frog") {
    // Frog croak: rapid low pitch pulse train
    for (let i = 0; i < 6; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(100, now + i * 0.04);
      gain.gain.setValueAtTime(0.15, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.03);
    }
  } else if (breedId === "unicorn" || breedId === "dino" || breedId === "pig" || breedId === "dobby") {
    // Magic sparkle arpeggio for Unicorn, Dino, etc.
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);
      gain.gain.setValueAtTime(0.15, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.25);
    });
  } else {
    // Default chime
    playSound("bell");
  }
};

import { NoiseBarometer } from "./NoiseBarometer";

const MemoizedNoiseBarometer = memo(NoiseBarometer);
const MemoizedQRCodeCanvas = memo(QRCodeCanvas);
const MemoizedRichTextEditor = memo(RichTextEditor);
const MemoizedQuizWidget = memo(QuizWidget);
const MemoizedMindmapWidget = memo(MindmapWidget);
const MemoizedMorningCircleWidget = memo(MorningCircleWidget);
const MemoizedMorningRiddleWidget = memo(MorningRiddleWidget);

const KlassenglasErweitert = memo(
  ({
    app,
    setApp,
    activeFokusThemeVars,
    isFullscreen,
    addJarGem,
    jarShaking,
    isConfirmingClear,
    setIsConfirmingClear,
  }: any) => {
    const [activeTab, setActiveTab] = useState<"kurve" | "mission">("kurve");

    const [climateLog, setClimateLog] = useState<any[]>(() => {
      const saved = localStorage.getItem("klassengemeinschaft_year_klima_v1");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      return [];
    });

    const chartData = useMemo(() => {
      const dataByDate: Record<
        string,
        { positive: number; challenge: number; score: number }
      > = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const ds = d.toLocaleDateString("de-DE", {
          weekday: "short",
          day: "2-digit",
        });
        dataByDate[ds] = { positive: 0, challenge: 0, score: 50 };
      }

      climateLog.forEach((log) => {
        const d = new Date(log.date);
        const ds = d.toLocaleDateString("de-DE", {
          weekday: "short",
          day: "2-digit",
        });
        if (dataByDate[ds]) {
          if (log.type === "positive") {
            dataByDate[ds].positive += log.val;
            dataByDate[ds].score += log.val;
          } else {
            dataByDate[ds].challenge += Math.abs(log.val);
            dataByDate[ds].score += log.val;
          }
        }
      });

      return Object.keys(dataByDate).map((key) => ({
        name: key,
        score: Math.max(0, Math.min(100, dataByDate[key].score)),
      }));
    }, [climateLog]);

    return (
      <div
        className={`flex pointer-events-auto ${isFullscreen ? "w-full h-full items-stretch flex-row gap-6 p-4" : "flex-row gap-2 w-full h-full min-h-0 min-w-0 p-1 items-stretch"}`}
        style={
          !isFullscreen
            ? {
                aspectRatio: "42/50",
                margin: "auto",
                maxHeight: "100%",
                maxWidth: "100%",
              }
            : undefined
        }
      >
        {/* SMALL VIEW PORT MISSIONEN (Left Side) */}
        {!isFullscreen && (
          <div
            className={`flex-1 flex flex-col min-w-0 min-h-0 gap-1.5 relative pointer-events-auto border-r pr-1.5 py-1 ${activeFokusThemeVars.isLight ? "border-slate-200" : "border-white/10"}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div
                className={`text-[10px] font-black uppercase tracking-widest ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/40"}`}
              >
                Missionen
              </div>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const pool = [
                    {
                      icon: "🏆",
                      title: "Flüsterkönig",
                      description:
                        "Wir arbeiten diese Woche in der Stillarbeit wirklich ganz leise.",
                      rewardClassMarbles: 5,
                    },
                    {
                      icon: "🤝",
                      title: "Teamplayer",
                      description:
                        "Wir helfen uns gegenseitig bei Problemen anstatt sofort den Lehrer zu rufen.",
                      rewardClassMarbles: 8,
                    },
                    {
                      icon: "🧹",
                      title: "Saubere Klasse",
                      description:
                        "Am Ende des Tages sehen Tische und Boden blitzblank aus.",
                      rewardClassMarbles: 3,
                    },
                    {
                      icon: "👂",
                      title: "Aktives Zuhören",
                      description:
                        "Wir lassen Mitschüler ausreden und melden uns fair.",
                      rewardClassMarbles: 5,
                    },
                  ];
                  const randomMission =
                    pool[Math.floor(Math.random() * pool.length)];
                  setApp((prev: any) => ({
                    ...prev,
                    klassenglas_missions: [
                      ...(prev.klassenglas_missions || []),
                      {
                        id: "mis-" + Date.now(),
                        title: `${randomMission.icon} ${randomMission.title}`,
                        description: randomMission.description,
                        rewardClassMarbles: randomMission.rewardClassMarbles,
                      },
                    ],
                  }));
                }}
                className={`p-1.5 rounded-lg border transition-all ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-600" : "bg-white/5 border-white/10 hover:bg-white/10 text-white/80"}`}
              >
                <Plus size={12} strokeWidth={3} />
              </button>
            </div>
            <div className="flex flex-col gap-2 flex-grow overflow-y-auto custom-scrollbar pr-1 pb-2">
              {app.klassenglas_missions?.map((mission: any) => (
                <div
                  key={mission.id}
                  className={`flex items-start gap-2 p-2 rounded-xl border shadow-sm transition-all group/mb ${activeFokusThemeVars.isLight ? "bg-white border-slate-200" : "bg-white/10 border-white/10"}`}
                >
                  <div className="shrink-0 text-lg sm:text-xl mt-0.5">
                    {mission.title.split(" ")[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-black text-[11px] sm:text-xs leading-snug break-words ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-white"}`}
                    >
                      {mission.title.substring(mission.title.indexOf(" ") + 1)}
                    </div>
                    <div
                      className={`text-[9px] sm:text-[9.5px] mt-1 line-clamp-2 sm:line-clamp-none ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white/60"}`}
                    >
                      {mission.description}
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className={`text-[8.5px] font-bold uppercase ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/40"}`}
                      >
                        Sterne:
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={mission.rewardClassMarbles}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1;
                          if (val > 0) {
                            setApp((prev: any) => ({
                              ...prev,
                              klassenglas_missions:
                                prev.klassenglas_missions.map((m: any) =>
                                  m.id === mission.id
                                    ? { ...m, rewardClassMarbles: val }
                                    : m,
                                ),
                            }));
                          }
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className={`w-9 px-1 py-0.5 text-[9px] sm:text-[10px] font-bold rounded border text-center ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 text-slate-800 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400" : "bg-white/5 border-white/10 text-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"} outline-none transition-all`}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 pt-0.5">
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApp((prev: any) => ({
                          ...prev,
                          klassenglas_count: Math.min(
                            prev.klassenglas_ziel || 100,
                            (prev.klassenglas_count || 0) +
                              mission.rewardClassMarbles,
                          ),
                          klassenglas_missions: (
                            prev.klassenglas_missions || []
                          ).filter((m: any) => m.id !== mission.id),
                          klassenglas_completed_missions: [
                            ...(prev.klassenglas_completed_missions || []),
                            {
                              ...mission,
                              completedAt: new Date().toISOString(),
                            },
                          ],
                        }));
                        addJarGem(mission.rewardClassMarbles);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors border border-emerald-200 shadow-sm"
                      title="Mission abschließen"
                    >
                      <Check size={11} strokeWidth={3} />
                    </button>
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setApp((prev: any) => ({
                          ...prev,
                          klassenglas_missions: (
                            prev.klassenglas_missions || []
                          ).filter((m: any) => m.id !== mission.id),
                        }));
                      }}
                      className={`p-1.5 rounded-lg transition-colors border shadow-sm ${activeFokusThemeVars.isLight ? "bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200" : "bg-white/5 text-white/40 border-white/10 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30"}`}
                      title="Mission entfernen"
                    >
                      <Trash2 size={11} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
              {(!app.klassenglas_missions ||
                app.klassenglas_missions.length === 0) && (
                <div
                  className={`text-center py-4 sm:py-6 text-xs font-bold opacity-50 ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white"}`}
                >
                  Keine Missionen
                </div>
              )}
            </div>
          </div>
        )}

        {/* GLAS ANSICHT */}
        <div
          className={`flex flex-col items-center flex-1 min-w-0 min-h-0 h-full ${isFullscreen ? "justify-center px-8 shrink-0 w-1/2 relative" : "justify-center shrink"} pb-1`}
        >
          {/* Status Header */}
          <div className="w-full flex justify-between items-end px-1 mb-2 sm:mb-4">
            <div className="flex flex-col">
              <div
                className={`flex items-baseline gap-1 px-3 py-1.5 rounded-xl border shadow-sm backdrop-blur-sm ${activeFokusThemeVars.isLight ? "bg-white/80 border-black/10" : "bg-black/40 border-white/10"}`}
              >
                <span
                  className={`text-2xl font-black drop-shadow-sm ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-white"}`}
                >
                  {app.klassenglas_count}
                </span>
                <span
                  className={`text-xs font-bold ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white/50"}`}
                >
                  / {app.klassenglas_ziel || 100}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/30"}`}
              >
                Ziel anpassen
              </span>
              <div
                className={`flex items-center gap-1 rounded-xl px-2 py-1 border ring-1 shadow-inner ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/5 ring-black/5" : "bg-black/40 border-white/10 ring-white/5"}`}
              >
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setApp((prev: any) => ({
                      ...prev,
                      klassenglas_ziel: Math.max(
                        1,
                        (prev.klassenglas_ziel || 100) - 1,
                      ),
                    }));
                  }}
                  className={`p-1 transition-colors ${activeFokusThemeVars.isLight ? "text-slate-400 hover:text-amber-500" : "text-white/40 hover:text-amber-500"}`}
                >
                  <Minus size={12} />
                </button>
                <input
                  type="number"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  value={app.klassenglas_ziel || 100}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val))
                      setApp((prev: any) => ({
                        ...prev,
                        klassenglas_ziel: val,
                      }));
                  }}
                  className="w-10 bg-transparent border-none text-[12px] font-black text-amber-500 outline-none p-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setApp((prev: any) => ({
                      ...prev,
                      klassenglas_ziel: (prev.klassenglas_ziel || 100) + 1,
                    }));
                  }}
                  className={`p-1 transition-colors ${activeFokusThemeVars.isLight ? "text-slate-400 hover:text-amber-500" : "text-white/40 hover:text-amber-500"}`}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full pt-1 mb-4 pointer-events-auto">
            <span
              className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/30"}`}
            >
              Gemeinsames Ziel (Belohnung)
            </span>
            <input
              type="text"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              value={app.klassenglas_belohnung || ""}
              onChange={(e) => {
                setApp((prev: any) => ({
                  ...prev,
                  klassenglas_belohnung: e.target.value,
                }));
              }}
              placeholder="Pizzaparty..."
              className={`w-full max-w-[180px] p-2 text-xs font-bold text-center rounded-xl border outline-none transition-colors ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 text-slate-800 placeholder:text-slate-300 focus:border-amber-400" : "bg-black/20 border-white/10 text-white placeholder:text-white/20 focus:border-amber-500"}`}
            />
          </div>

          <div className="flex flex-col items-center gap-1.5 w-full pt-1 mb-6 pointer-events-auto">
            <span
              className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/30"}`}
            >
              Symbol wählen
            </span>
            <div className="flex items-center gap-1.5 justify-center pointer-events-auto">
              <input
                type="text"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                value={app.settings?.klassenglasIcon ?? "💎"}
                onChange={(e) => {
                  setApp((prev: any) => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      klassenglasIcon: e.target.value,
                    },
                  }));
                }}
                className={`w-10 h-8 rounded-xl text-center text-lg outline-none border transition-all ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 text-slate-800 focus:border-amber-500 shadow-sm" : "bg-black/40 border-white/10 text-white focus:border-amber-500"}`}
                title="Eigenes Emoji"
              />
              <div className="flex flex-wrap gap-1 max-w-[120px] justify-center">
                {["💎", "⭐", "🍬", "🍪", "🎈", "🍎", "🐾"].map((sym) => (
                  <button
                    key={sym}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setApp((prev: any) => ({
                        ...prev,
                        settings: { ...prev.settings, klassenglasIcon: sym },
                      }));
                    }}
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10.5px] transition-all hover:scale-115 active:scale-95 border ${
                      (app.settings?.klassenglasIcon ?? "💎") === sym
                        ? "bg-amber-500 border-amber-500 text-amber-950 scale-105 shadow-sm"
                        : activeFokusThemeVars.isLight
                          ? "bg-white border-slate-200 hover:bg-slate-100 text-slate-700"
                          : "bg-black/40 border-white/10 text-slate-350 hover:bg-neutral-800"
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <motion.div
            animate={
              jarShaking
                ? {
                    x: [0, -5, 5, -5, 5, 0],
                    rotate: [0, -0.5, 0.5, -0.5, 0.5, 0],
                  }
                : {}
            }
            className={`relative w-28 h-40 bg-white/[0.04] border-2 border-white/20 rounded-b-[40px] rounded-t-[20px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)] backdrop-blur-3xl group/jar ${app.klassenglas_count >= (app.klassenglas_ziel || 100) ? "ring-4 ring-amber-500/50 border-amber-500/50 shadow-[0_0_60px_rgba(245,158,11,0.6)]" : ""}`}
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
            <div className="absolute top-4 left-3 w-1.5 h-20 bg-white/20 rounded-full blur-[2px]" />

            <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-wrap-reverse justify-center gap-1 content-start transition-all duration-1000 h-full">
              {Array.from({ length: Math.min(app.klassenglas_count, 100) }).map(
                (_, i) => {
                  const colors = [
                    "from-amber-300 to-amber-600",
                    "from-sky-300 to-sky-600",
                    "from-emerald-300 to-emerald-600",
                    "from-rose-300 to-rose-600",
                    "from-violet-300 to-violet-600",
                    "from-orange-300 to-orange-600",
                  ];
                  const size =
                    app.klassenglas_count > 100
                      ? "w-1.5 h-1.5"
                      : app.klassenglas_count > 50
                        ? "w-2 h-2"
                        : app.klassenglas_count > 20
                          ? "w-3 h-3"
                          : "w-4 h-4";
                  return (
                    <motion.div
                      key={i}
                      initial={{
                        scale: 0,
                        y: -200,
                        x: Math.random() * 40 - 20,
                        rotate: -45,
                      }}
                      animate={{
                        scale: 1,
                        y: 0,
                        x: 0,
                        rotate: (i * 137.5) % 360,
                        transition: {
                          type: "spring",
                          damping: 20,
                          stiffness: 150,
                          delay: Math.min(i * 0.05, 5),
                        },
                      }}
                      className={`${size} flex-none flex items-center justify-center relative select-none`}
                    >
                      <span
                        style={{
                          fontSize: app.klassenglas_count > 50 ? "8px" : "14px",
                        }}
                      >
                        {app.settings?.klassenglasIcon || "💎"}
                      </span>
                    </motion.div>
                  );
                },
              )}
            </div>
            <motion.div
              className="absolute inset-x-0 bottom-0 pointer-events-none bg-amber-500/20"
              animate={{
                height: `${Math.min(100, (app.klassenglas_count / (app.klassenglas_ziel || 100)) * 100)}%`,
              }}
              transition={{ duration: 1.5, ease: "circOut" }}
            />
          </motion.div>

          <div className="flex flex-col gap-4 w-full mt-6">
            <div className="flex gap-2">
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() =>
                  setApp((prev: any) => ({
                    ...prev,
                    klassenglas_count: Math.max(0, prev.klassenglas_count - 1),
                  }))
                }
                title="-1"
                className={`flex-1 py-4 rounded-2xl border flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95 group ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/10 text-slate-800" : "bg-white/5 border-white/10 text-white"}`}
              >
                <Minus
                  size={24}
                  className="opacity-40 group-hover:opacity-100 transition-opacity"
                />
              </button>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => addJarGem(1)}
                title="+1 Edelstein"
                className="flex-[3] py-4 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center hover:bg-amber-400 transition-all shadow-[0_20px_40px_rgba(245,158,11,0.3)] active:scale-90 relative overflow-hidden group/btn"
              >
                <Plus size={32} strokeWidth={4} />
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
              </button>
            </div>
            <div className="flex justify-center">
              {isConfirmingClear ? (
                <div className="flex items-center gap-2 bg-rose-500/10 rounded-xl p-1 border border-rose-500/20">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsConfirmingClear(false);
                    }}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase transition-colors ${activeFokusThemeVars.isLight ? "text-rose-600/60 hover:text-rose-600" : "text-white/40 hover:text-white"}`}
                  >
                    Abbrechen
                  </button>
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setApp((prev: any) => ({
                        ...prev,
                        klassenglas_count: 0,
                      }));
                      setIsConfirmingClear(false);
                    }}
                    className="px-3 py-1.5 bg-rose-500 text-white rounded-lg text-[9px] font-black uppercase shadow-lg shadow-rose-500/30"
                  >
                    Leeren bestätigen
                  </button>
                </div>
              ) : (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingClear(true);
                  }}
                  className={`flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-rose-500/10 transition-all group ${activeFokusThemeVars.isLight ? "text-slate-400 hover:text-rose-500" : "text-white/20 hover:text-rose-500"}`}
                >
                  <Trash2
                    size={12}
                    className="opacity-50 group-hover:opacity-100"
                  />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Glas leeren
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {isFullscreen && (
          <div
            className={`flex-1 border-l flex flex-col pt-4 overflow-hidden pointer-events-auto ${activeFokusThemeVars.isLight ? "border-slate-200" : "border-white/10"}`}
          >
            <div className="px-8 flex items-center justify-between pointer-events-auto">
              <h2
                className={`text-xl font-black ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-white"}`}
              >
                Erweiterungen
              </h2>
              <div
                className={`flex p-1 rounded-xl ${activeFokusThemeVars.isLight ? "bg-slate-100" : "bg-white/10"}`}
              >
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setActiveTab("kurve")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "kurve" ? (activeFokusThemeVars.isLight ? "bg-white text-indigo-700 shadow-sm" : "bg-indigo-500 text-white shadow-sm") : activeFokusThemeVars.isLight ? "text-slate-500 hover:text-slate-700" : "text-white/60 hover:text-white"}`}
                >
                  Klassenklima
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setActiveTab("mission")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "mission" ? (activeFokusThemeVars.isLight ? "bg-white text-amber-700 shadow-sm" : "bg-amber-500 text-white shadow-sm") : activeFokusThemeVars.isLight ? "text-slate-500 hover:text-slate-700" : "text-white/60 hover:text-white"}`}
                >
                  Missionen
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-8 mt-6 pb-8 custom-scrollbar relative block pointer-events-auto">
              {activeTab === "kurve" && (
                <div className="flex flex-col gap-6 animate-fade-in pointer-events-auto block z-20">
                  <div
                    className={`p-5 rounded-2xl border ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}
                  >
                    <h3
                      className={`text-sm font-black uppercase tracking-widest text-slate-400 mb-4 ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/40"}`}
                    >
                      Verhaltenskurve (14 Tage)
                    </h3>
                    <div className="w-full h-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient
                              id="colorScoreF"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor={
                                  activeFokusThemeVars.isLight
                                    ? "#6366f1"
                                    : "#a5b4fc"
                                }
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor={
                                  activeFokusThemeVars.isLight
                                    ? "#6366f1"
                                    : "#a5b4fc"
                                }
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke={
                              activeFokusThemeVars.isLight
                                ? "#f1f5f9"
                                : "rgba(255,255,255,0.1)"
                            }
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fill: activeFokusThemeVars.isLight
                                ? "#94a3b8"
                                : "rgba(255,255,255,0.5)",
                              fontWeight: 700,
                            }}
                            dy={10}
                          />
                          <YAxis
                            domain={[0, 100]}
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fontSize: 10,
                              fill: activeFokusThemeVars.isLight
                                ? "#94a3b8"
                                : "rgba(255,255,255,0.5)",
                            }}
                            dx={-10}
                          />
                          <RechartsTooltip
                            contentStyle={{
                              borderRadius: "1rem",
                              border: "none",
                              backgroundColor: activeFokusThemeVars.isLight
                                ? "white"
                                : "#1e293b",
                              color: activeFokusThemeVars.isLight
                                ? "black"
                                : "white",
                              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                              fontWeight: "bold",
                            }}
                            itemStyle={{ fontSize: "14px" }}
                          />
                          <Area
                            type="monotone"
                            dataKey="score"
                            stroke={
                              activeFokusThemeVars.isLight
                                ? "#6366f1"
                                : "#818cf8"
                            }
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorScoreF)"
                            activeDot={{
                              r: 6,
                              fill: activeFokusThemeVars.isLight
                                ? "#6366f1"
                                : "#818cf8",
                              stroke: "#fff",
                              strokeWidth: 3,
                            }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div
                    className={`p-5 rounded-2xl border ${activeFokusThemeVars.isLight ? "bg-white border-slate-200" : "bg-white/5 border-white/10"}`}
                  >
                    <p
                      className={`text-sm font-bold ${activeFokusThemeVars.isLight ? "text-slate-600" : "text-white/70"}`}
                    >
                      💡 <strong>Tipp:</strong> Diese Kurve visualisiert die
                      positiven und korrigierenden Einträge aus dem "Wir-Gefühl"
                      Tool im Dashboard. Sie dient zur pädagogischen Reflexion
                      des Klassenklimas.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "mission" && (
                <div className="flex flex-col gap-4 animate-fade-in pointer-events-auto block z-20">
                  <button
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      const pool = [
                        {
                          icon: "🏆",
                          title: "Flüsterkönig",
                          description:
                            "Wir arbeiten diese Woche in der Stillarbeit wirklich ganz leise.",
                          rewardClassMarbles: 5,
                        },
                        {
                          icon: "🤝",
                          title: "Teamplayer",
                          description:
                            "Wir helfen uns gegenseitig bei Problemen anstatt sofort den Lehrer zu rufen.",
                          rewardClassMarbles: 8,
                        },
                        {
                          icon: "🧹",
                          title: "Saubere Klasse",
                          description:
                            "Am Ende des Tages sehen Tische und Boden blitzblank aus.",
                          rewardClassMarbles: 3,
                        },
                        {
                          icon: "👂",
                          title: "Aktives Zuhören",
                          description:
                            "Wir lassen Mitschüler ausreden und melden uns fair.",
                          rewardClassMarbles: 5,
                        },
                      ];
                      const randomMission =
                        pool[Math.floor(Math.random() * pool.length)];
                      setApp((prev: any) => ({
                        ...prev,
                        klassenglas_missions: [
                          ...(prev.klassenglas_missions || []),
                          {
                            id: "mis-" + Date.now(),
                            title: `${randomMission.icon} ${randomMission.title}`,
                            description: randomMission.description,
                            rewardClassMarbles:
                              randomMission.rewardClassMarbles,
                          },
                        ],
                      }));
                    }}
                    className={`w-full py-3 rounded-2xl flex items-center justify-center gap-2 font-black border transition-all hover:scale-[1.02] ${activeFokusThemeVars.isLight ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" : "bg-white/5 border-white/10 text-white hover:bg-white/10"}`}
                  >
                    <Plus size={16} /> Zufällige Mission generieren
                  </button>

                  <div className="flex flex-col gap-3">
                    {app.klassenglas_missions?.length === 0 ? (
                      <div
                        className={`text-center py-8 text-sm font-bold opacity-50 ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white"}`}
                      >
                        Keine Missionen aktiv.
                      </div>
                    ) : (
                      app.klassenglas_missions?.map((miss: any) => (
                        <div
                          key={miss.id}
                          className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 shadow-sm" : "bg-white/5 border-white/10"}`}
                        >
                          <div className="text-3xl mt-1">
                            {miss.title.split(" ")[0]}
                          </div>
                          <div className="flex-1">
                            <h4
                              className={`font-black text-sm ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-white"}`}
                            >
                              {miss.title.substring(
                                miss.title.indexOf(" ") + 1,
                              )}
                            </h4>
                            <p
                              className={`text-xs mt-1 ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white/60"}`}
                            >
                              {miss.description}
                            </p>
                            <span className="inline-block mt-2 px-2 py-1 bg-amber-500/10 text-amber-600 rounded-md text-[10px] font-black border border-amber-500/20">
                              +{miss.rewardClassMarbles} Edelsteine
                            </span>
                          </div>
                          <button
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setApp((prev: any) => ({
                                ...prev,
                                klassenglas_count: Math.min(
                                  prev.klassenglas_ziel || 100,
                                  (prev.klassenglas_count || 0) +
                                    miss.rewardClassMarbles,
                                ),
                                klassenglas_missions:
                                  prev.klassenglas_missions.filter(
                                    (m: any) => m.id !== miss.id,
                                  ),
                                klassenglas_completed_missions: [
                                  ...(prev.klassenglas_completed_missions ||
                                    []),
                                  {
                                    ...miss,
                                    completedAt: new Date().toISOString(),
                                  },
                                ],
                              }));
                              addJarGem(miss.rewardClassMarbles);
                            }}
                            className="self-center p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400 transition-colors shadow-md active:scale-90"
                          >
                            <Check size={16} strokeWidth={3} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

const isHexLight = (hexColor: string): boolean => {
  if (!hexColor || !hexColor.startsWith("#")) return false;
  const hex = hexColor.substring(1);
  const len = hex.length;
  let r = 255,
    g = 255,
    b = 255;
  if (len === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (len === 6) {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq > 140;
};

const FOKUS_THEMES_MAP: Record<string, any> = {
  classic_light: {
    bg: "bg-[#f8fafc]",
    box: "bg-white/95 backdrop-blur-md border border-slate-200 shadow-md",
    border1: "border border-slate-250 shadow-sm",
    border2: "border border-slate-250 shadow-sm",
    border3: "border border-slate-250 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,23,42,0.02),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-slate-900",
    highlightBg: "bg-slate-100 border border-slate-300 text-slate-900",
    circleBorder: "border-slate-800 ring-slate-800/10",
    textColor: "text-slate-900",
    secondaryText: "text-slate-500",
    isLight: true,
  },
  deep_dark: {
    bg: "bg-[#09090b]",
    box: "bg-[#18181b]/95 backdrop-blur-md border border-white/5 shadow-xl",
    border1: "border border-white/10 shadow-sm",
    border2: "border border-white/10 shadow-sm",
    border3: "border border-white/10 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.03),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-amber-500",
    highlightBg: "bg-amber-500/10 border border-amber-500/20 text-[#f59e0b]",
    circleBorder: "border-amber-500 ring-amber-500/25",
    textColor: "text-white",
    secondaryText: "text-stone-400",
    isLight: false,
  },
  soft_sage: {
    bg: "bg-[#dcfce7]",
    box: "bg-white/90 backdrop-blur-md border border-emerald-300 shadow-md",
    border1: "border border-emerald-400 shadow-sm",
    border2: "border border-emerald-400 shadow-sm",
    border3: "border border-emerald-400 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(21,128,61,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-emerald-800",
    highlightBg: "bg-emerald-100 border border-emerald-300 text-emerald-900",
    circleBorder: "border-emerald-700 ring-emerald-700/20",
    textColor: "text-[#14532d]",
    secondaryText: "text-[#166534]",
    isLight: true,
  },
  ocean_breeze: {
    bg: "bg-[#dbeafe]",
    box: "bg-white/90 backdrop-blur-md border border-blue-300 shadow-md",
    border1: "border border-blue-400 shadow-sm",
    border2: "border border-blue-400 shadow-sm",
    border3: "border border-blue-400 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-blue-800",
    highlightBg: "bg-blue-100 border border-blue-300 text-blue-900",
    circleBorder: "border-blue-600 ring-blue-600/20",
    textColor: "text-[#1e3a8a]",
    secondaryText: "text-[#1e40af]",
    isLight: true,
  },
  warm_sand: {
    bg: "bg-[#ffedd5]",
    box: "bg-white/90 backdrop-blur-md border border-orange-200 shadow-md",
    border1: "border border-orange-300 shadow-sm",
    border2: "border border-orange-300 shadow-sm",
    border3: "border border-orange-300 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,88,12,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-orange-900",
    highlightBg: "bg-[#ffedd5] border border-orange-300 text-orange-900",
    circleBorder: "border-orange-700 ring-orange-700/20",
    textColor: "text-[#7c2d12]",
    secondaryText: "text-[#9a3412]",
    isLight: true,
  },
  lavender_field: {
    bg: "bg-[#f3e8ff]",
    box: "bg-white/90 backdrop-blur-md border border-purple-200 shadow-md",
    border1: "border border-purple-300 shadow-sm",
    border2: "border border-purple-300 shadow-sm",
    border3: "border border-purple-300 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(147,51,234,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-purple-800",
    highlightBg: "bg-purple-100 border border-purple-300 text-purple-900",
    circleBorder: "border-purple-600 ring-purple-600/20",
    textColor: "text-[#581c87]",
    secondaryText: "text-[#6b21a8]",
    isLight: true,
  },
  cozy_mint: {
    bg: "bg-[#ccfbf1]",
    box: "bg-white/90 backdrop-blur-md border border-teal-200 shadow-md",
    border1: "border border-teal-300 shadow-sm",
    border2: "border border-teal-300 shadow-sm",
    border3: "border border-teal-300 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(13,148,136,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-teal-800",
    highlightBg: "bg-teal-100 border border-teal-300 text-[#115e59]",
    circleBorder: "border-teal-600 ring-teal-600/20",
    textColor: "text-[#134e4a]",
    secondaryText: "text-[#115e59]",
    isLight: true,
  },
  sakura_dream: {
    bg: "bg-[#fce7f3]",
    box: "bg-white/90 backdrop-blur-md border border-pink-200 shadow-md",
    border1: "border border-pink-300 shadow-sm",
    border2: "border border-pink-300 shadow-sm",
    border3: "border border-pink-300 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(219,39,119,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-pink-800",
    highlightBg: "bg-pink-100 border border-pink-300 text-[#831843]",
    circleBorder: "border-pink-600 ring-pink-600/20",
    textColor: "text-[#831843]",
    secondaryText: "text-[#9d174d]",
    isLight: true,
  },
  custom_theme: {
    bg: "bg-[#f3f4f6]",
    box: "bg-white/95 backdrop-blur-md border border-slate-300 shadow-md",
    border1: "border border-slate-200 shadow-sm",
    border2: "border border-slate-200 shadow-sm",
    border3: "border border-slate-200 shadow-sm",
    rounded: "rounded-3xl",
    bgDecor:
      "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.02),transparent_40%)] pointer-events-none transition-all duration-700",
    highlightText: "text-teal-600",
    highlightBg: "bg-teal-50 border border-teal-200 text-teal-700",
    circleBorder: "border-teal-500 ring-teal-500/20",
    textColor: "text-[#171717]",
    secondaryText: "text-[#404040]",
    isLight: true,
  },
};

const InstructionWidgetContent = (props: any) => {
  return <InstructionWidget {...props} />;
};

const DEFAULT_COCKPIT_LAYOUT: CockpitWidgetConfig[] = [
  {
    id: "widget-clock",
    type: "clock",
    x: 74,
    y: 5,
    w: 25,
    h: 28,
    visible: false,
  },
  {
    id: "widget-instruction",
    type: "instruction",
    x: 4,
    y: 8,
    w: 64,
    h: 62,
    visible: false,
  },
  {
    id: "widget-timer",
    type: "timer",
    x: 74,
    y: 28,
    w: 22,
    h: 36,
    visible: false,
  },
  {
    id: "widget-trafficlight",
    type: "trafficlight",
    x: 4,
    y: 20,
    w: 16,
    h: 60,
    visible: false,
  },
  {
    id: "widget-randomname",
    type: "randomname",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    visible: false,
  },
  {
    id: "widget-noisemeter",
    type: "noisemeter",
    x: 4,
    y: 68,
    w: 28,
    h: 42,
    visible: false,
  },
  {
    id: "widget-vocabulary",
    type: "vocabulary",
    x: 22,
    y: 64,
    w: 35,
    h: 48,
    visible: false,
  },
  {
    // Legacy floating studentlist remains in the schema to read old backups.
    // Its rendering and creation are retired; the student sidebar is unchanged.
    id: "widget-studentlist",
    type: "studentlist",
    x: 48,
    y: 64,
    w: 25,
    h: 65,
    visible: false,
  },
  {
    id: "widget-kidattendance",
    type: "kidattendance",
    x: 20,
    y: 15,
    w: 55,
    h: 65,
    visible: false,
  },
  {
    id: "widget-groups",
    type: "groups",
    x: 4,
    y: 34,
    w: 35,
    h: 48,
    visible: false,
  },
  {
    id: "widget-qrcode",
    type: "qrcode",
    x: 40,
    y: 34,
    w: 24,
    h: 44,
    visible: false,
  },
  {
    id: "widget-image",
    type: "image",
    x: 50,
    y: 15,
    w: 32,
    h: 50,
    visible: false,
  },
  {
    id: "widget-phases",
    type: "phases",
    x: 22,
    y: 4,
    w: 28,
    h: 58,
    visible: false,
  },
  {
    id: "widget-sounds",
    type: "sounds",
    x: 4,
    y: 15,
    w: 32,
    h: 45,
    visible: false,
  },
  {
    id: "widget-todo",
    type: "todo",
    x: 22,
    y: 34,
    w: 26,
    h: 44,
    visible: false,
  },
  {
    id: "widget-dienste",
    type: "dienste",
    x: 4,
    y: 52,
    w: 32,
    h: 46,
    visible: false,
  },
  {
    id: "widget-klassenglas",
    type: "klassenglas",
    x: 48,
    y: 34,
    w: 25,
    h: 40,
    visible: false,
  },
  {
    id: "widget-links",
    type: "links",
    x: 4,
    y: 76,
    w: 22,
    h: 30,
    visible: false,
  },
  {
    id: "widget-drawing",
    type: "drawing",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    visible: false,
    settings: {
      boardMode: "whiteboard",
      isDirectMode: true,
    },
  },
  { id: "widget-pet", type: "pet", x: 10, y: 40, w: 26, h: 38, visible: false },
  {
    id: "widget-stopwatch",
    type: "stopwatch",
    x: 10,
    y: 60,
    w: 24,
    h: 34,
    visible: false,
  },
  {
    id: "widget-calculator",
    type: "calculator",
    x: 30,
    y: 40,
    w: 24,
    h: 46,
    visible: false,
  },
  {
    id: "widget-dice",
    type: "dice",
    x: 30,
    y: 60,
    w: 24,
    h: 32,
    visible: false,
  },
  {
    id: "widget-weather",
    type: "weather",
    x: 50,
    y: 60,
    w: 24,
    h: 32,
    visible: false,
  },
  {
    id: "widget-aiquiz",
    type: "aiquiz",
    x: 50,
    y: 20,
    w: 42,
    h: 55,
    visible: false,
  },
  {
    id: "widget-riddle",
    type: "riddle",
    x: 10,
    y: 30,
    w: 32,
    h: 45,
    visible: false,
  },
  {
    id: "widget-scoreboard",
    type: "scoreboard",
    x: 10,
    y: 50,
    w: 30,
    h: 45,
    visible: false,
  },
  {
    id: "widget-wheel",
    type: "wheel",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    visible: false,
  },
  {
    id: "widget-breathing",
    type: "breathing",
    x: 30,
    y: 50,
    w: 28,
    h: 44,
    visible: false,
  },
  {
    id: "widget-kidweather",
    type: "kidweather",
    x: 50,
    y: 15,
    w: 32,
    h: 45,
    visible: false,
  },
  {
    id: "widget-kopfrechnen",
    type: "kopfrechnen",
    x: 50,
    y: 45,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-scrambler",
    type: "scrambler",
    x: 74,
    y: 15,
    w: 34,
    h: 45,
    visible: false,
  },
  {
    id: "widget-watertracker",
    type: "watertracker",
    x: 74,
    y: 45,
    w: 26,
    h: 44,
    visible: false,
  },
  {
    id: "widget-wordchain",
    type: "wordchain",
    x: 10,
    y: 70,
    w: 35,
    h: 48,
    visible: false,
  },
  {
    id: "widget-moodmeter",
    type: "moodmeter",
    x: 34,
    y: 70,
    w: 30,
    h: 45,
    visible: false,
  },
  {
    id: "widget-colormixer",
    type: "colormixer",
    x: 58,
    y: 70,
    w: 45,
    h: 55,
    visible: false,
  },
  {
    id: "widget-wordgrid",
    type: "wordgrid",
    x: 10,
    y: 80,
    w: 42,
    h: 55,
    visible: false,
  },
  {
    id: "widget-rhythm",
    type: "rhythm",
    x: 34,
    y: 80,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-geometry",
    type: "geometry",
    x: 58,
    y: 80,
    w: 40,
    h: 45,
    visible: false,
  },
  {
    id: "widget-fractionvisualizer",
    type: "fractionvisualizer",
    x: 10,
    y: 90,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-fractions",
    type: "fractions",
    x: 10,
    y: 90,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-wordclock",
    type: "wordclock",
    x: 32,
    y: 90,
    w: 34,
    h: 42,
    visible: false,
  },
  {
    id: "widget-sorting",
    type: "sorting",
    x: 54,
    y: 90,
    w: 40,
    h: 52,
    visible: false,
  },
  {
    id: "widget-dailyquotes",
    type: "dailyquotes",
    x: 76,
    y: 90,
    w: 28,
    h: 40,
    visible: false,
  },
  {
    id: "widget-dictionary",
    type: "dictionary",
    x: 10,
    y: 100,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-piano",
    type: "piano",
    x: 32,
    y: 100,
    w: 55,
    h: 35,
    visible: false,
  },
  {
    id: "widget-bodyparts",
    type: "bodyparts",
    x: 56,
    y: 100,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-toothbrush",
    type: "toothbrush",
    x: 10,
    y: 110,
    w: 28,
    h: 44,
    visible: false,
  },
  {
    id: "widget-challenge",
    type: "challenge",
    x: 32,
    y: 110,
    w: 32,
    h: 45,
    visible: false,
  },
  {
    id: "widget-compass",
    type: "compass",
    x: 54,
    y: 110,
    w: 34,
    h: 45,
    visible: false,
  },
  {
    id: "widget-weekdays",
    type: "weekdays",
    x: 76,
    y: 110,
    w: 34,
    h: 44,
    visible: false,
  },
  {
    id: "widget-piggybank",
    type: "piggybank",
    x: 10,
    y: 120,
    w: 30,
    h: 44,
    visible: false,
  },
  {
    id: "widget-noisescales",
    type: "noisescales",
    x: 32,
    y: 120,
    w: 34,
    h: 44,
    visible: false,
  },
  {
    id: "widget-wordscramble",
    type: "wordscramble",
    x: 54,
    y: 120,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-shadowshapes",
    type: "shadowshapes",
    x: 76,
    y: 120,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-emotions",
    type: "emotions",
    x: 10,
    y: 130,
    w: 34,
    h: 46,
    visible: false,
  },
  {
    id: "widget-clocksync",
    type: "clocksync",
    x: 32,
    y: 130,
    w: 36,
    h: 50,
    visible: false,
  },
  {
    id: "widget-soundmemory",
    type: "soundmemory",
    x: 54,
    y: 130,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-spellingdetective",
    type: "spellingdetective",
    x: 76,
    y: 130,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-numberline",
    type: "numberline",
    x: 10,
    y: 140,
    w: 55,
    h: 38,
    visible: false,
  },
  {
    id: "widget-mathchain",
    type: "mathchain",
    x: 32,
    y: 140,
    w: 42,
    h: 52,
    visible: false,
  },
  {
    id: "widget-thermometer",
    type: "thermometer",
    x: 54,
    y: 140,
    w: 24,
    h: 55,
    visible: false,
  },
  {
    id: "widget-compoundsplit",
    type: "compoundsplit",
    x: 76,
    y: 140,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-mathduel",
    type: "mathduel",
    x: 32,
    y: 150,
    w: 48,
    h: 55,
    visible: false,
  },
  {
    id: "widget-shapepuzzle",
    type: "shapepuzzle",
    x: 56,
    y: 150,
    w: 40,
    h: 52,
    visible: false,
  },
  {
    id: "widget-guitartuner",
    type: "guitartuner",
    x: 10,
    y: 160,
    w: 32,
    h: 46,
    visible: false,
  },
  {
    id: "widget-secretagent",
    type: "secretagent",
    x: 32,
    y: 160,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-fractioncake",
    type: "fractioncake",
    x: 54,
    y: 160,
    w: 38,
    h: 52,
    visible: false,
  },
  {
    id: "widget-sentencebuilding",
    type: "sentencebuilding",
    x: 76,
    y: 160,
    w: 46,
    h: 48,
    visible: false,
  },
  {
    id: "widget-patternmaker",
    type: "patternmaker",
    x: 10,
    y: 170,
    w: 44,
    h: 48,
    visible: false,
  },
  {
    id: "widget-wordexplorer",
    type: "wordexplorer",
    x: 32,
    y: 170,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-weightscale",
    type: "weightscale",
    x: 54,
    y: 170,
    w: 40,
    h: 50,
    visible: false,
  },
  {
    id: "widget-geographyquiz",
    type: "geographyquiz",
    x: 76,
    y: 170,
    w: 42,
    h: 52,
    visible: false,
  },
  {
    id: "widget-calmrain",
    type: "calmrain",
    x: 10,
    y: 180,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-estimationjar",
    type: "estimationjar",
    x: 32,
    y: 180,
    w: 34,
    h: 46,
    visible: false,
  },
  {
    id: "widget-reflexgame",
    type: "reflexgame",
    x: 54,
    y: 180,
    w: 40,
    h: 48,
    visible: false,
  },
  {
    id: "widget-mathpyramid",
    type: "mathpyramid",
    x: 10,
    y: 190,
    w: 40,
    h: 52,
    visible: false,
  },
  {
    id: "widget-wastebin",
    type: "wastebin",
    x: 32,
    y: 190,
    w: 44,
    h: 52,
    visible: false,
  },
  {
    id: "widget-tonetrainer",
    type: "tonetrainer",
    x: 54,
    y: 190,
    w: 42,
    h: 50,
    visible: false,
  },
  {
    id: "widget-angledetective",
    type: "angledetective",
    x: 76,
    y: 190,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-rhymemachine",
    type: "rhymemachine",
    x: 10,
    y: 200,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-alphabetsoup",
    type: "alphabetsoup",
    x: 32,
    y: 200,
    w: 40,
    h: 52,
    visible: false,
  },
  {
    id: "widget-divrobot",
    type: "divrobot",
    x: 54,
    y: 200,
    w: 36,
    h: 48,
    visible: false,
  },
  {
    id: "widget-classtarget",
    type: "classtarget",
    x: 76,
    y: 200,
    w: 34,
    h: 55,
    visible: false,
  },
  {
    id: "widget-morsecode",
    type: "morsecode",
    x: 10,
    y: 210,
    w: 42,
    h: 50,
    visible: false,
  },
  {
    id: "widget-punctuationzoo",
    type: "punctuationzoo",
    x: 32,
    y: 210,
    w: 42,
    h: 50,
    visible: false,
  },
  {
    id: "widget-secretcode",
    type: "secretcode",
    x: 54,
    y: 210,
    w: 40,
    h: 50,
    visible: false,
  },
  {
    id: "widget-clockpuzzle",
    type: "clockpuzzle",
    x: 76,
    y: 210,
    w: 38,
    h: 50,
    visible: false,
  },
  {
    id: "widget-fractiongrid",
    type: "fractiongrid",
    x: 10,
    y: 220,
    w: 42,
    h: 52,
    visible: false,
  },
  {
    id: "widget-trafficquiz",
    type: "trafficquiz",
    x: 32,
    y: 220,
    w: 42,
    h: 50,
    visible: false,
  },
  {
    id: "widget-wortsatzwerkstatt",
    type: "wortsatzwerkstatt",
    x: 54,
    y: 220,
    w: 46,
    h: 52,
    visible: false,
  },
  {
    id: "widget-wordbuilder",
    type: "wordbuilder",
    x: 54,
    y: 220,
    w: 46,
    h: 48,
    visible: false,
  },
  {
    id: "widget-watercycle",
    type: "watercycle",
    x: 76,
    y: 220,
    w: 44,
    h: 55,
    visible: false,
  },
  {
    id: "widget-soundmachine",
    type: "soundmachine",
    x: 10,
    y: 230,
    w: 42,
    h: 50,
    visible: false,
  },
  {
    id: "widget-mathbalancer",
    type: "mathbalancer",
    x: 32,
    y: 230,
    w: 44,
    h: 52,
    visible: false,
  },
  {
    id: "widget-animalvoice",
    type: "animalvoice",
    x: 54,
    y: 230,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-constellation",
    type: "constellation",
    x: 76,
    y: 230,
    w: 45,
    h: 55,
    visible: false,
  },
  {
    id: "widget-multitrainer",
    type: "multitrainer",
    x: 10,
    y: 240,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-moneycalc",
    type: "moneycalc",
    x: 32,
    y: 240,
    w: 40,
    h: 50,
    visible: false,
  },
  {
    id: "widget-storyemojis",
    type: "storyemojis",
    x: 54,
    y: 240,
    w: 42,
    h: 48,
    visible: false,
  },
  {
    id: "widget-abcorder",
    type: "abcorder",
    x: 76,
    y: 240,
    w: 38,
    h: 48,
    visible: false,
  },
  {
    id: "widget-planetarium",
    type: "planetarium",
    x: 10,
    y: 250,
    w: 42,
    h: 55,
    visible: false,
  },
  {
    id: "widget-tischcheck",
    type: "tischcheck",
    x: 32,
    y: 250,
    w: 32,
    h: 48,
    visible: false,
  },
  {
    id: "widget-faircall",
    type: "faircall",
    x: 54,
    y: 250,
    w: 32,
    h: 48,
    visible: false,
  },
  {
    id: "widget-hangman",
    type: "hangman",
    x: 10,
    y: 260,
    w: 38,
    h: 56,
    visible: false,
  },
  {
    id: "widget-timeline",
    type: "timeline",
    x: 35,
    y: 5,
    w: 38,
    h: 18,
    visible: false,
  },
  {
    id: "widget-anschauung",
    type: "anschauung",
    x: 10,
    y: 270,
    w: 42,
    h: 52,
    visible: false,
  },
  {
    id: "widget-zahlenraum",
    type: "zahlenraum",
    x: 10,
    y: 140,
    w: 46,
    h: 48,
    visible: false,
  },
];

const DEFAULT_WORKSPACE_PROFILES: any[] = [];

const loadAndSanitizeLayout = (layout: any): CockpitWidgetConfig[] => {
  const knownTypes = [
    "clock",
    "instruction",
    "timer",
    "trafficlight",
    "randomname",
    "noisemeter",
    "vocabulary",
    "studentlist",
    "kidattendance",
    "groups",
    "qrcode",
    "image",
    "phases",
    "sounds",
    "todo",
    "dienste",
    "klassenglas",
    "links",
    "drawing",
    "pet",
    "stopwatch",
    "calculator",
    "dice",
    "weather",
    "aiquiz",
    "riddle",
    "scoreboard",
    "wheel",
    "breathing",
    "kidweather",
    "mathcards",
    "scrambler",
    "watertracker",
    "wordchain",
    "moodmeter",
    "colormixer",
    "wordgrid",
    "rhythm",
    "geometry",
    "fractionvisualizer",
    "fractions",
    "wordclock",
    "sorting",
    "dailyquotes",
    "dictionary",
    "piano",
    "bodyparts",
    "toothbrush",
    "challenge",
    "compass",
    "weekdays",
    "piggybank",
    "noisescales",
    "wordscramble",
    "shadowshapes",
    "emotions",
    "clocksync",
    "soundmemory",
    "spellingdetective",
    "numberline",
    "mathchain",
    "thermometer",
    "compoundsplit",
    "mathduel",
    "shapepuzzle",
    "guitartuner",
    "secretagent",
    "fractioncake",
    "sentencebuilding",
    "patternmaker",
    "wordexplorer",
    "weightscale",
    "geographyquiz",
    "calmrain",
    "estimationjar",
    "reflexgame",
    "mathpyramid",
    "wastebin",
    "tonetrainer",
    "angledetective",
    "rhymemachine",
    "alphabetsoup",
    "divrobot",
    "classtarget",
    "morsecode",
    "punctuationzoo",
    "secretcode",
    "clockpuzzle",
    "fractiongrid",
    "trafficquiz",
    "wortsatzwerkstatt",
    "wordbuilder",
    "watercycle",
    "soundmachine",
    "mathbalancer",
    "animalvoice",
    "constellation",
    "multitrainer",
    "moneycalc",
    "anschauung",
    "storyemojis",
    "abcorder",
    "planetarium",
    "tischcheck",
    "faircall",
    "hangman",
    "timeline",
    "kopfrechnen",
    "zahlenraum",
  ];
  if (!Array.isArray(layout) || layout.length === 0) {
    return DEFAULT_COCKPIT_LAYOUT;
  }
  try {
    const rawSanitized: CockpitWidgetConfig[] = layout
      .filter((w: any) => w && knownTypes.includes(w.type))
      .map((w: any) => {
        let wWidth =
          typeof w.w === "number" && !isNaN(w.w)
            ? Math.max(12, Math.min(100, w.w))
            : 25;
        let hHeight =
          typeof w.h === "number" && !isNaN(w.h)
            ? Math.max(10, Math.min(100, w.h))
            : 20;

        if (
          (w.type === "randomname" || w.type === "wheel") &&
          wWidth === 50 &&
          hHeight === 70
        ) {
          wWidth = 100;
          hHeight = 100;
          w.x = 0;
          w.y = 0;
        }

        let x = typeof w.x === "number" && !isNaN(w.x) ? w.x : 50;
        let y = typeof w.y === "number" && !isNaN(w.y) ? w.y : 50;

        // 1. Clamping against board edges
        x = Math.max(0, Math.min(100 - wWidth, x));
        y = Math.max(0, Math.min(100 - hHeight, y));

        // 2. Tabu-Zone check (top-left reserved space: x < 21 && y < 14)
        if (x < 21 && y < 14) {
          if (x < 10) {
            y = Math.min(100 - hHeight, y + 16);
          } else {
            x = 22;
          }
        }

        return {
          id:
            w.id ||
            `widget-${w.type}-${Math.random().toString(36).substring(2, 5)}`,
          type: w.type,
          x,
          y,
          w: wWidth,
          h: hHeight,
          visible: w.type === "studentlist" ? false : !!w.visible,
          hasBeenOpened: !!w.hasBeenOpened,
          settings: w.settings || {},
        } as CockpitWidgetConfig;
      });

    // 3. Resolve exact deckungsgleiche coordinates
    const seenPositions = new Set<string>();
    const sanitized = rawSanitized.map((w) => {
      let x = w.x;
      let y = w.y;
      let key = `${x.toFixed(1)},${y.toFixed(1)}`;
      let count = 0;
      while (seenPositions.has(key) && count < 15) {
        x = Math.min(100 - w.w, x + 3.0);
        y = Math.min(100 - w.h, y + 2.5);
        key = `${x.toFixed(1)},${y.toFixed(1)}`;
        count++;
      }
      seenPositions.add(key);
      return { ...w, x, y };
    });

    // Ensure all 17 widget types are covered in layout config
    const typesPresent = sanitized.map((t: any) => t.type);
    const missingTypes = knownTypes.filter((t) => !typesPresent.includes(t));
    missingTypes.forEach((t) => {
      const def = DEFAULT_COCKPIT_LAYOUT.find((d) => d.type === t);
      if (def) sanitized.push(def);
    });

    return sanitized;
  } catch (e) {
    return DEFAULT_COCKPIT_LAYOUT;
  }
};

// F11 ClockWidget Delegation
const InnerClockWidget = (props: any) => {
  return <ClockWidgetContent {...props} />;
};

export default function Unterrichtsmodus({ onClose }: { onClose: () => void }) {
  const { app, setApp, setPage } = useApp();
  const { showToast } = useToast();
  const [time, setTime] = useState(new Date());
  const cockpitClassLabel = (app.klassenbezeichnung || "").trim();
  const classPetEnabled = app.classPet ? app.classPet.enabled !== false : false;
  const lessonTimeSlots = useMemo(
    () => buildLessonTimeSlots(app.stundenZeiten, STUNDEN_INFO, MAX_LESSON_SLOTS),
    [app.stundenZeiten],
  );

  const checkIsAutoBirthday = (geburtstagStr: string | undefined | null) => {
    if (!geburtstagStr) return false;
    let bday: Date;
    const parts = geburtstagStr.split(".");
    const today = new Date();
    if (parts.length === 3) {
      bday = new Date(
        today.getFullYear(),
        parseInt(parts[1]) - 1,
        parseInt(parts[0]),
      );
    } else {
      bday = new Date(geburtstagStr);
    }

    if (isNaN(bday.getTime())) return false;

    const tMonth = today.getMonth();
    const tDate = today.getDate();
    const tDay = today.getDay(); // 0 = Sun, 6 = Sat

    let dashboardSettings = { moveWeekendBirthdays: "none" };
    try {
      const saved = localStorage.getItem("dashboard_settings_v7");
      if (saved) dashboardSettings = JSON.parse(saved);
    } catch {}

    // Exact match today
    if (bday.getMonth() === tMonth && bday.getDate() === tDate) {
      if (tDay === 0 || tDay === 6) {
        // Weekend birthday
        return (
          dashboardSettings?.moveWeekendBirthdays !== "friday" &&
          dashboardSettings?.moveWeekendBirthdays !== "monday"
        );
      }
      return true; // Weekday exact match
    }

    // Move to Friday
    if (dashboardSettings?.moveWeekendBirthdays === "friday" && tDay === 5) {
      const sat = new Date(today.getFullYear(), tMonth, tDate + 1);
      const sun = new Date(today.getFullYear(), tMonth, tDate + 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    // Move to Monday
    if (dashboardSettings?.moveWeekendBirthdays === "monday" && tDay === 1) {
      const sun = new Date(today.getFullYear(), tMonth, tDate - 1);
      const sat = new Date(today.getFullYear(), tMonth, tDate - 2);
      if (
        (bday.getMonth() === sat.getMonth() &&
          bday.getDate() === sat.getDate()) ||
        (bday.getMonth() === sun.getMonth() && bday.getDate() === sun.getDate())
      ) {
        return true;
      }
    }

    return false;
  };

  const [ampelSeconds, setAmpelSeconds] = useState<Record<string, number>>({
    gruen: 0,
    gelb: 0,
    rot: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const current = app.ampel_status || "gruen";
      if (current === "gruen" || current === "gelb" || current === "rot") {
        setAmpelSeconds((prev) => ({
          ...prev,
          [current]: prev[current] + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [app.ampel_status]);

  const formatAmpelTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getAmpelPercentage = (color: string) => {
    const total = ampelSeconds.gruen + ampelSeconds.gelb + ampelSeconds.rot;
    if (total === 0) {
      return color === "gruen" ? "100%" : "0%";
    }
    const val = (ampelSeconds[color] / total) * 100;
    return `${Math.round(val)}%`;
  };

  const [localLuuiseThema, setLocalLuuiseThema] = useState("");
  const [timerDisplaySec, setTimerDisplaySec] = useState(0);

  // Cockpit Widget Stage State
  const [cockpitWidgets, setCockpitWidgets] = useState<CockpitWidgetConfig[]>(
    () => {
      return loadAndSanitizeLayout(app.cockpitLayout);
    },
  );
  // Widgets bleiben immer frei verschiebbar. So muss im Unterricht kein
  // separater Layout-Modus ein- oder ausgeschaltet werden.
  const isLayoutLocked = false;
  const isLayoutEditing = true;
  const [isMoreOptionsMenuOpen, setIsMoreOptionsMenuOpen] = useState(false);
  const [isQuickBarSettingsOpen, setIsQuickBarSettingsOpen] = useState(false);
  const [isAddWidgetMenuOpen, setIsAddWidgetMenuOpen] = useState(false);
  const [isWidgetConfigurationOpen, setIsWidgetConfigurationOpen] = useState(false);
  const [selectedWidgetConfiguration, setSelectedWidgetConfiguration] = useState<"kidattendance" | "groups">("kidattendance");
  const [isVorlagenModalOpen, setIsVorlagenModalOpen] = useState(false);
  const [vorlagenStartTab, setVorlagenStartTab] = useState<"browse" | "create">("browse");
  const [activeWidgetCategory, setActiveWidgetCategory] =
    useState<string>("core");
  const [expandedCoreWidget, setExpandedCoreWidget] = useState<string | null>(null);
  const [widgetSearch, setWidgetSearch] = useState<string>("");
  const [isBoardTextEditing, setIsBoardTextEditing] = useState(false);
  const [boardTool, setBoardTool] = useState<'select' | 'text'>('select');
  const boardTextCommandRef = useRef<((command: string, argument?: string) => void) | null>(null);
  const [isBirthdayCelebrationOpen, setIsBirthdayCelebrationOpen] = useState(false);
  useEffect(() => { setIsBirthdayCelebrationOpen(false); }, [app.activeClassId]);
  const boardTextClassKey = app.activeClassId || "unassigned";
  const cockpitPaper = ((app.boardSettings as any)?.cockpitPaperByClass?.[boardTextClassKey] || "blank") as CockpitPaper;
  const setCockpitPaper = (paper: CockpitPaper) => setApp((prev: any) => ({
    ...prev,
    boardSettings: {
      ...(prev.boardSettings || {}),
      cockpitPaperByClass: {
        ...(prev.boardSettings?.cockpitPaperByClass || {}),
        [boardTextClassKey]: paper,
      },
    },
  }));
  const cockpitPaperSpacing = normalizeCockpitPaperSpacing((app.boardSettings as any)?.cockpitPaperSpacingByClass?.[boardTextClassKey]);
  const setCockpitPaperSpacing = (spacing: number) => setApp((prev: any) => ({
    ...prev, boardSettings: {
      ...(prev.boardSettings || {}), cockpitPaperSpacingByClass: {
        ...(prev.boardSettings?.cockpitPaperSpacingByClass || {}),
        [boardTextClassKey]: normalizeCockpitPaperSpacing(spacing),
      },
    },
  }));
  const quickBarSettings = normalizeCockpitQuickbarSettings((app.boardSettings as any)?.cockpitQuickbarByClass?.[boardTextClassKey]);
  const updateQuickBarSettings = (update: (settings: ReturnType<typeof normalizeCockpitQuickbarSettings>) => ReturnType<typeof normalizeCockpitQuickbarSettings>) => {
    if (!app.activeClassId) return;
    setApp((prev: any) => {
      const current = normalizeCockpitQuickbarSettings(prev.boardSettings?.cockpitQuickbarByClass?.[boardTextClassKey]);
      return { ...prev, boardSettings: {
        ...(prev.boardSettings || {}),
        cockpitQuickbarByClass: {
          ...(prev.boardSettings?.cockpitQuickbarByClass || {}),
          [boardTextClassKey]: update(current),
        },
      } };
    });
  };
  const resetQuickBarSettings = () => {
    if (!app.activeClassId) return;
    setApp((prev: any) => {
      const next = { ...(prev.boardSettings?.cockpitQuickbarByClass || {}) };
      delete next[boardTextClassKey];
      return { ...prev, boardSettings: { ...(prev.boardSettings || {}), cockpitQuickbarByClass: next } };
    });
    setIsQuickBarSettingsOpen(false);
  };
  const boardInkItems: InkItem[] = Array.isArray((app.boardSettings as any)?.cockpitInkByClass?.[boardTextClassKey])
    ? ((app.boardSettings as any).cockpitInkByClass[boardTextClassKey] as InkItem[])
    : [];
  const saveBoardInkItems = useCallback((items: InkItem[]) => {
    if (!app.activeClassId) return;
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...(prev.boardSettings || {}),
        cockpitInkByClass: {
          ...(prev.boardSettings?.cockpitInkByClass || {}),
          [boardTextClassKey]: items,
        },
      },
    }));
  }, [app.activeClassId, boardTextClassKey, setApp]);
  const boardTextHtml =
    ((app.boardSettings as any)?.cockpitTextByClass?.[boardTextClassKey] as string | undefined) || "";

  const saveBoardTextHtml = useCallback(
    (html: string) => {
      setApp((prev: any) => ({
        ...prev,
        boardSettings: {
          ...(prev.boardSettings || {}),
          cockpitTextByClass: {
            ...(prev.boardSettings?.cockpitTextByClass || {}),
            [boardTextClassKey]: html,
          },
        },
      }));
    },
    [boardTextClassKey, setApp],
  );

  useEffect(() => {
    setIsBoardTextEditing(false);
    setBoardTool('select');
    setIsQuickBarSettingsOpen(false);
  }, [boardTextClassKey]);

  useEffect(() => {
    if (isLayoutLocked) {
      setIsAddWidgetMenuOpen(false);
      setIsSlotMenuOpen(false);
      setWidgetSettingsOpenId(null);
      setIsMoreOptionsMenuOpen(false);
    }
  }, [isLayoutLocked]);
  const [favoritesBySubject, setFavoritesBySubject] = useState<
    Record<string, string[]>
  >(() => {
    try {
      const saved = localStorage.getItem("cockpit_favorites_by_subject");
      if (saved) return JSON.parse(saved);
    } catch {}
    try {
      const oldSaved = localStorage.getItem("cockpit_favorite_types");
      if (oldSaved) {
        const parsed = JSON.parse(oldSaved);
        if (Array.isArray(parsed)) {
          return { Allgemein: parsed };
        }
      }
    } catch {}
    return { Allgemein: [] };
  });
  const [recentWidgetTypes, setRecentWidgetTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("cockpit_recent_widget_types");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedFavFolder, setSelectedFavFolder] =
    useState<string>("active_subject");

  const getResolvedFavFolder = () => {
    if (selectedFavFolder === "active_subject") {
      return getActiveSubject();
    }
    return selectedFavFolder;
  };

  const toggleFavorite = (type: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const folder = getResolvedFavFolder();
    setFavoritesBySubject((prev) => {
      const currentList = prev[folder] || [];
      const updatedList = currentList.includes(type)
        ? currentList.filter((t) => t !== type)
        : [...currentList, type];
      const next = {
        ...prev,
        [folder]: updatedList,
      };
      localStorage.setItem(
        "cockpit_favorites_by_subject",
        JSON.stringify(next),
      );
      return next;
    });
  };

  const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);
  const [isSlotMenuOpen, setIsSlotMenuOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  // --- 1-7 LEHRER-COCKPIT ADVANCED FEATURES ---
  
  // 1. Renameable Slot Names
  const [slotNames, setSlotNames] = useState<{ [key: string]: string }>(() => {
    try {
      const saved = localStorage.getItem("cockpit_slot_names_v2");
      return saved ? JSON.parse(saved) : { A: "Layout A", B: "Layout B", C: "Layout C" };
    } catch (e) {
      return { A: "Layout A", B: "Layout B", C: "Layout C" };
    }
  });

  const saveSlotName = (slot: string, newName: string) => {
    setSlotNames((prev) => {
      const next = { ...prev, [slot]: newName };
      localStorage.setItem("cockpit_slot_names_v2", JSON.stringify(next));
      return next;
    });
  };

  // 2. Soundboard Toggle State
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);

  // 3. Noise Alert State
  const [noiseAlertActive, setNoiseAlertActive] = useState(false);

  useEffect(() => {
    let timer: any;
    const handleAlert = () => {
      setNoiseAlertActive(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setNoiseAlertActive(false);
      }, 1500);
    };
    window.addEventListener("cockpit-noise-alert", handleAlert);
    return () => {
      window.removeEventListener("cockpit-noise-alert", handleAlert);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // 4. Quick timer helper
  const handleQuickTimer = (minutes: number) => {
    setCockpitWidgets((prev) =>
      prev.map((w) =>
        w.id === "widget-timer" ? { ...w, visible: true } : w
      )
    );
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: true,
        timerEnd: Date.now() + minutes * 60 * 1000,
      },
    }));
    showToast(`⏱️ Timer gestartet für ${minutes} Minute(n)!`, "success");
    playSound("beep");
  };

  // 5. Lucky Draw State
  const [luckyStudent, setLuckyStudent] = useState<any | null>(null);
  const [isLuckyDrawing, setIsLuckyDrawing] = useState(false);

  const startLuckyDraw = () => {
    const students = app?.schueler || [];
    if (students.length === 0) {
      showToast("Keine Kinder in der aktuellen Klasse vorhanden.", "info");
      return;
    }
    setIsLuckyDrawing(true);
    setLuckyStudent(null);
    playSound("laser");

    let count = 0;
    const maxTicks = 18;
    const interval = setInterval(() => {
      const randomStudent = students[Math.floor(Math.random() * students.length)];
      setLuckyStudent(randomStudent);
      count++;
      if (count >= maxTicks) {
        clearInterval(interval);
        setIsLuckyDrawing(false);
        playSound("tada");
      }
    }, 110);
  };

  // 7. Zen wave nature ambient synthesizer
  const ambientAudioCtxRef = useRef<AudioContext | null>(null);
  const ambientNoiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [isAmbientPlaying, setIsAmbientPlaying] = useState(false);

  const startAmbientSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ambientAudioCtxRef.current = ctx;

      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(350, ctx.currentTime);
      filter.Q.setValueAtTime(1.0, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.06, ctx.currentTime);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(220, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      source.start(0);
      lfo.start(0);

      ambientNoiseNodeRef.current = source;
      setIsAmbientPlaying(true);
      showToast("🧘 Zen-Modus aktiviert: Meeresrauschen-Synthese gestartet.", "success");
    } catch (err) {
      console.error("Failed to start ambient sound", err);
    }
  };

  const stopAmbientSound = () => {
    if (ambientNoiseNodeRef.current) {
      try { ambientNoiseNodeRef.current.stop(); } catch (e) {}
      ambientNoiseNodeRef.current = null;
    }
    if (ambientAudioCtxRef.current) {
      try { ambientAudioCtxRef.current.close(); } catch (e) {}
      ambientAudioCtxRef.current = null;
    }
    setIsAmbientPlaying(false);
    showToast("Zen-Modus deaktiviert.", "info");
  };

  // Cleanup ambient on unmount
  useEffect(() => {
    return () => {
      if (ambientNoiseNodeRef.current) {
        try { ambientNoiseNodeRef.current.stop(); } catch (e) {}
      }
      if (ambientAudioCtxRef.current) {
        try { ambientAudioCtxRef.current.close(); } catch (e) {}
      }
    };
  }, []);
  const [focusOrder, setFocusOrder] = useState<string[]>(() => {
    return [
      "widget-clock",
      "widget-instruction",
      "widget-timer",
      "widget-trafficlight",
      "widget-randomname",
      "widget-noisemeter",
      "widget-vocabulary",
      "widget-studentlist",
      "widget-groups",
      "widget-qrcode",
      "widget-image",
      "widget-phases",
      "widget-sounds",
      "widget-todo",
      "widget-dienste",
      "widget-klassenglas",
      "widget-links",
    ];
  });
  const [timerToCloseId, setTimerToCloseId] = useState<string | null>(null);
  const [widgetSettingsOpenId, setWidgetSettingsOpenId] = useState<
    string | null
  >(null);

  const isCockpitWidget = (id: string) => {
    const cockpitTypes = [
      "clock",
      "instruction",
      "timer",
      "trafficlight",
      "randomname",
      "noisemeter",
      "vocabulary",
      "studentlist",
      "kidattendance",
      "groups",
      "qrcode",
      "image",
      "phases",
      "sounds",
      "todo",
      "dienste",
      "klassenglas",
      "links",
      "drawing",
      "pet",
      "stopwatch",
      "calculator",
      "dice",
      "weather",
      "aiquiz",
      "riddle",
      "toothbrush",
      "challenge",
      "compass",
      "weekdays",
      "piggybank",
      "noisescales",
      "wordscramble",
      "shadowshapes",
      "emotions",
      "clocksync",
      "soundmemory",
      "spellingdetective",
      "numberline",
      "mathchain",
      "thermometer",
      "compoundsplit",
      "mathduel",
      "shapepuzzle",
      "guitartuner",
      "secretagent",
      "fractionvisualizer",
      "fractioncake",
      "sentencebuilding",
      "patternmaker",
      "wordexplorer",
      "weightscale",
      "geographyquiz",
      "calmrain",
      "estimationjar",
      "reflexgame",
      "mathpyramid",
      "wastebin",
      "tonetrainer",
      "angledetective",
      "rhymemachine",
      "alphabetsoup",
      "divrobot",
      "classtarget",
      "morsecode",
      "punctuationzoo",
      "secretcode",
      "clockpuzzle",
      "fractiongrid",
      "trafficquiz",
      "wortsatzwerkstatt",
      "wordbuilder",
      "watercycle",
      "soundmachine",
      "mathbalancer",
      "animalvoice",
      "constellation",
      "hangman",
      "timeline",
      "kidattendance",
      "kopfrechnen",
    ];
    const typeMap: Record<string, string> = {
      timer: "timer",
      ampel: "trafficlight",
      lottowinner: "randomname",
      laerm: "noisemeter",
      lernwoerter: "vocabulary",
      groups: "groups",
      qrcode: "qrcode",
      sounds: "sounds",
      todo: "todo",
      dienste: "dienste",
      klassenglas: "klassenglas",
      links: "links",
      studentlist: "studentlist",
      sticky: "sticky",
    };
    const mappedType = typeMap[id] || id;
    return cockpitTypes.includes(mappedType);
  };

  const isToolActive = (toolId: string) => {
    const typeMap: Record<string, string> = {
      timer: "timer",
      ampel: "trafficlight",
      lottowinner: "randomname",
      laerm: "noisemeter",
      lernwoerter: "vocabulary",
      groups: "groups",
      qrcode: "qrcode",
      sounds: "sounds",
      todo: "todo",
      dienste: "dienste",
      klassenglas: "klassenglas",
      links: "links",
      studentlist: "studentlist",
      sticky: "sticky",
    };
    const mappedType = typeMap[toolId] || toolId;
    if (isCockpitWidget(toolId)) {
      return !!cockpitWidgets.find((w) => w.type === mappedType && w.visible);
    }
    return !!(app.boardWidgets || []).find((w) => w.type === toolId);
  };

  const toggleTool = (toolId: string) => {
    const typeMap: Record<string, string> = {
      timer: "timer",
      ampel: "trafficlight",
      lottowinner: "randomname",
      laerm: "noisemeter",
      lernwoerter: "vocabulary",
      groups: "groups",
      qrcode: "qrcode",
      sounds: "sounds",
      todo: "todo",
      dienste: "dienste",
      klassenglas: "klassenglas",
      links: "links",
      studentlist: "studentlist",
      sticky: "sticky",
    };
    let mappedType = typeMap[toolId] || toolId;

    if (toolId === "instruction") {
      mappedType = "drawing";
    }

    if (isCockpitWidget(toolId) || toolId === "instruction") {
      const isCurrentlyActive = !!cockpitWidgets.find(
        (w) => w.type === mappedType && w.visible,
      );
      if (isCurrentlyActive) {
        const widgetObj = cockpitWidgets.find((w) => w.type === mappedType);
        if (widgetObj) {
          handleCloseWidget(widgetObj.id, widgetObj.type);
        }
      } else {
        handleOpenWidgetInCockpitLayout(mappedType as any);
        if (toolId === "instruction") {
          setTimeout(() => {
            setCockpitWidgets((prev) =>
              prev.map((w) => {
                if (w.type === "drawing") {
                  return {
                    ...w,
                    settings: {
                      ...(w.settings || {}),
                      boardMode: "text",
                    },
                  };
                }
                return w;
              }),
            );
          }, 50);
        }
      }
    } else {
      toggleWidget(toolId as any);
    }
  };

  // Auto-migrate old boardWidgets (like laerm, lernwoerter, groups, etc.) to the new cockpitWidgets
  useEffect(() => {
    const oldWidgetsToMigrate = (app.boardWidgets || []).filter((w: any) =>
      [
        "timer",
        "ampel",
        "lottowinner",
        "laerm",
        "lernwoerter",
        "groups",
        "qrcode",
      ].includes(w.type),
    );
    if (oldWidgetsToMigrate.length === 0) return;

    const typeMapping: Record<string, string> = {
      timer: "timer",
      ampel: "trafficlight",
      lottowinner: "randomname",
      laerm: "noisemeter",
      lernwoerter: "vocabulary",
      groups: "groups",
      qrcode: "qrcode",
    };

    let updatedCockpitLayout = [...cockpitWidgets];
    let changed = false;

    oldWidgetsToMigrate.forEach((oldW: any) => {
      const cockpitType = typeMapping[oldW.type];
      if (!cockpitType) return;

      const widgetInCockpitIdx = updatedCockpitLayout.findIndex(
        (w) => w.type === cockpitType,
      );
      if (widgetInCockpitIdx !== -1) {
        if (!updatedCockpitLayout[widgetInCockpitIdx].visible) {
          updatedCockpitLayout[widgetInCockpitIdx] = {
            ...updatedCockpitLayout[widgetInCockpitIdx],
            visible: true,
          };
          changed = true;
        }
      }
    });

    if (changed) {
      setCockpitWidgets(updatedCockpitLayout);
      setApp((prev: any) => ({
        ...prev,
        cockpitLayout: updatedCockpitLayout,
        boardWidgets: (prev.boardWidgets || []).filter(
          (w: any) =>
            ![
              "timer",
              "ampel",
              "lottowinner",
              "laerm",
              "lernwoerter",
              "groups",
              "qrcode",
            ].includes(w.type),
        ),
      }));
    } else {
      const hasOldWidgets = (app.boardWidgets || []).some((w: any) =>
        [
          "timer",
          "ampel",
          "lottowinner",
          "laerm",
          "lernwoerter",
          "groups",
          "qrcode",
        ].includes(w.type),
      );
      if (hasOldWidgets) {
        setApp((prev: any) => ({
          ...prev,
          boardWidgets: (prev.boardWidgets || []).filter(
            (w: any) =>
              ![
                "timer",
                "ampel",
                "lottowinner",
                "laerm",
                "lernwoerter",
                "groups",
                "qrcode",
              ].includes(w.type),
          ),
        }));
      }
    }
  }, [app.boardWidgets, cockpitWidgets]);

  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructionInput, setInstructionInput] = useState("");

  const [widgetRandomMode, setWidgetRandomMode] = useState<
    "roulette" | "wheel"
  >("roulette");
  const [widgetWheelAngle, setWidgetWheelAngle] = useState(0);

  const [isDrawingName, setIsDrawingName] = useState(false);
  const [shufflingName, setShufflingName] = useState("");
  const [drawnName, setDrawnName] = useState("");
  const [withoutReplacement, setWithoutReplacement] = useState(false);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [activeLabelEditId, setActiveLabelEditId] = useState<string | null>(
    null,
  );

  const handleLottoDrawName = () => {
    const availableSchuelerForDraw = withoutReplacement
      ? app.schueler.filter((s: any) => !excludedStudentIds.includes(s.id))
      : app.schueler;

    if (app.schueler.length === 0 || isDrawingName) return;

    if (availableSchuelerForDraw.length === 0) {
      if (withoutReplacement) {
        setExcludedStudentIds([]);
      }
      return;
    }

    setIsDrawingName(true);
    setDrawnName("");

    if (widgetRandomMode === "wheel") {
      const N = availableSchuelerForDraw.length;
      const finalIdx = Math.floor(Math.random() * N);
      const finalStudent = availableSchuelerForDraw[finalIdx];

      if (withoutReplacement)
        setExcludedStudentIds((prev) => [...prev, finalStudent.id]);

      const sliceSize = 360 / Math.max(1, N);
      const baseTarget = 360 - (finalIdx * sliceSize + sliceSize / 2);

      const targetAngle =
        widgetWheelAngle + 1800 + (baseTarget - (widgetWheelAngle % 360));
      setWidgetWheelAngle(targetAngle);

      let ticks = 0;
      const tickInterval = setInterval(() => {
        playSound("click" as any);
        ticks++;
        if (ticks > 12) clearInterval(tickInterval);
      }, 200);

      setTimeout(() => {
        clearInterval(tickInterval);
        setDrawnName(
          `${finalStudent.vorname} ${finalStudent.nachname.charAt(0)}.`,
        );
        setIsDrawingName(false);
        playSound("tada" as any);
      }, 2600);
    } else {
      let count = 0;
      const interval = setInterval(() => {
        const idx = Math.floor(Math.random() * availableSchuelerForDraw.length);
        const student = availableSchuelerForDraw[idx];
        setShufflingName(`${student.vorname} ${student.nachname.charAt(0)}.`);
        count++;
        if (count >= 15) {
          clearInterval(interval);
          const finalIdx = Math.floor(
            Math.random() * availableSchuelerForDraw.length,
          );
          const finalStudent = availableSchuelerForDraw[finalIdx];
          if (withoutReplacement)
            setExcludedStudentIds((prev) => [...prev, finalStudent.id]);
          setDrawnName(
            `${finalStudent.vorname} ${finalStudent.nachname.charAt(0)}.`,
          );
          setIsDrawingName(false);
          playSound("tada" as any);
        }
      }, 100);
    }
  };

  const bringToFront = (id: string) => {
    setFocusOrder((prev) => {
      const list = prev.filter((item) => item !== id);
      return [...list, id];
    });
  };

  const handleUpdateWidgetPos = (
    id: string,
    updates: Partial<CockpitWidgetConfig>,
  ) => {
    setCockpitWidgets((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, ...updates, hasBeenOpened: true } : w,
      ),
    );
    setApp((prev) => ({
      ...prev,
      cockpitLayout: (prev.cockpitLayout || cockpitWidgets).map((w) =>
        w.id === id ? { ...w, ...updates, hasBeenOpened: true } : w,
      ),
    }));
  };

  const handleOpenWidgetInCockpitLayout = (
    type: CockpitWidgetConfig["type"],
  ) => {
    // Only the sidebar may provide public plus points now.
    if (type === "studentlist") return;
    setRecentWidgetTypes((previous) => {
      const updatedRecent = [String(type), ...previous.filter((entry) => entry !== type)].slice(0, 5);
      localStorage.setItem("cockpit_recent_widget_types", JSON.stringify(updatedRecent));
      return updatedRecent;
    });
    const visibleWidgets = cockpitWidgets.filter((w) => w.visible);

    // Default start coords outside tabu zone (x >= 22, y >= 15)
    let finalX = 22;
    let finalY = 15;

    if (visibleWidgets.length > 0) {
      // Find the last visible widget to cascade/offset relative to it
      const lastW = visibleWidgets[visibleWidgets.length - 1];
      finalX = Math.min(75, lastW.x + 3.0);
      finalY = Math.min(75, lastW.y + 3.0);
    }

    // Ensure it's not overlapping exactly or extremely close with any existing visible widget
    let overlap = true;
    let limit = 0;
    while (overlap && limit < 25) {
      overlap = false;
      for (const w of visibleWidgets) {
        if (Math.abs(w.x - finalX) < 1.5 && Math.abs(w.y - finalY) < 1.5) {
          finalX = Math.min(80, finalX + 3.0);
          finalY = Math.min(80, finalY + 3.0);
          overlap = true;
          break;
        }
      }
      limit++;
    }

    const updated = cockpitWidgets.map((w) => {
      if (w.type === type) {
        const def = DEFAULT_COCKPIT_LAYOUT.find((d) => d.type === type);
        const useOld = w.hasBeenOpened || w.visible;
        const isMaxWidget = type === "randomname" || type === "wheel";
        const isWhiteboard = type === "drawing";
        return {
          ...w,
          visible: true,
          hasBeenOpened: true, // Mark it as opened!
          x: isWhiteboard ? 0 : useOld ? w.x : isMaxWidget ? 0 : finalX,
          y: isWhiteboard ? 0 : useOld ? w.y : isMaxWidget ? 0 : finalY,
          w: isWhiteboard ? 100 : useOld ? w.w : Math.min(def?.w || w.w, 46),
          h: isWhiteboard ? 100 : useOld ? w.h : Math.min(def?.h || w.h, 46),
          settings: isWhiteboard
            ? {
                ...(w.settings || {}),
                boardMode: w.settings?.boardMode || "whiteboard",
                isDirectMode: true,
              }
            : w.settings,
        };
      }
      return w;
    });
    setCockpitWidgets(updated);
    setApp((prev) => ({
      ...prev,
      cockpitLayout: updated,
    }));
    const found = updated.find((w) => w.type === type);
    if (found) bringToFront(found.id);
  };

  const handleAutoArrangeWidgets = () => {
    const visibleOnes = cockpitWidgets.filter((w) => w.visible);
    if (visibleOnes.length === 0) {
      showToast("Keine aktiven Widgets zum Anordnen geöffnet.", "info");
      return;
    }

    const count = visibleOnes.length;
    let cols = 1;
    let rows = 1;
    if (count > 1) {
      cols = Math.ceil(Math.sqrt(count));
      rows = Math.ceil(count / cols);
    }

    const padding = 2; // % margin
    const availW = 100 - padding * 2;
    const availH = 100 - padding * 2;
    const cellW = availW / cols;
    const cellH = availH / rows;

    const updated = cockpitWidgets.map((w) => {
      if (!w.visible) return w;
      const idx = visibleOnes.findIndex((vw) => vw.id === w.id);
      const r = Math.floor(idx / cols);
      const c = idx % cols;

      // "Automatisch anordnen" darf bewusst auch die Fenstergröße harmonisieren:
      // vier Widgets passen damit als echtes 2×2-Raster auf die Arbeitsfläche.
      const targetW = Math.min(w.w, Math.max(18, cellW - 3));
      const targetH = Math.min(w.h, Math.max(18, cellH - 3));
      let targetX = padding + c * cellW + (cellW - targetW) / 2;
      let targetY = padding + r * cellH + (cellH - targetH) / 2;

      targetX = Math.max(1, Math.min(100 - targetW - 1, targetX));
      targetY = Math.max(1, Math.min(100 - targetH - 1, targetY));

      return {
        ...w,
        x: targetX,
        y: targetY,
        w: targetW,
        h: targetH,
      };
    });

    setCockpitWidgets(updated);
    setApp((p: any) => ({
      ...p,
      cockpitLayout: updated,
    }));
    showToast(`${count} Widgets wurden automatisch angeordnet!`, "success");
  };

  const handleClearAllWidgets = () => {
    const visibleCount = cockpitWidgets.filter((w) => w.visible).length;
    if (visibleCount === 0) {
      showToast("Es sind keine Widgets geöffnet.", "info");
      return;
    }
    const cleared = cockpitWidgets.map((w) => ({ ...w, visible: false }));
    setCockpitWidgets(cleared);
    setApp((p: any) => ({
      ...p,
      cockpitLayout: cleared,
    }));
    showToast("Alle Widgets wurden geschlossen.", "info");
  };

  const handleCloseWidget = (id: string, type: string) => {
    if (type === "timer" && app.boardSettings.timerRunning) {
      setTimerToCloseId(id);
    } else {
      executeWidgetClose(id);
    }
  };

  const executeWidgetClose = (id: string) => {
    setCockpitWidgets((prev) => {
      const updated = prev.map((w) =>
        w.id === id ? { ...w, visible: false } : w,
      );
      setApp((p) => ({ ...p, cockpitLayout: updated }));
      return updated;
    });
  };

  const handleSaveProfile = (
    dataOrName:
      | string
      | { name: string; icon?: string; category?: string; description?: string },
  ) => {
    const name = typeof dataOrName === "string" ? dataOrName : dataOrName.name;
    if (!name || !name.trim()) return;

    const icon = typeof dataOrName === "object" ? dataOrName.icon : "📋";
    const category = typeof dataOrName === "object" ? dataOrName.category : "Vorlagen";
    const description = typeof dataOrName === "object" ? dataOrName.description : "";

    const newProfile = {
      id: "profile_custom_" + Date.now(),
      name: name.trim(),
      icon: icon || "📋",
      category: category || "Vorlagen",
      description: description || "",
      createdAt: new Date().toLocaleDateString("de-DE"),
      layout: JSON.parse(JSON.stringify(cockpitWidgets)),
    };

    setApp((prev: any) => ({
      ...prev,
      workspaceProfiles: [...(prev.workspaceProfiles || []), newProfile],
    }));
    showToast(`Vorlage "${name}" erfolgreich gespeichert!`, "success");
    setNewProfileName("");
  };

  const handleUpdateProfile = (profileId: string) => {
    setApp((prev: any) => {
      let currentProfiles = prev.workspaceProfiles || [];
      if (currentProfiles.length === 0) {
        currentProfiles = DEFAULT_WORKSPACE_PROFILES;
      }
      return {
        ...prev,
        workspaceProfiles: currentProfiles.map((p: any) =>
          p.id === profileId
            ? { ...p, layout: JSON.parse(JSON.stringify(cockpitWidgets)) }
            : p,
        ),
      };
    });
    showToast("Vorlage mit aktueller Unterrichtsfläche aktualisiert!", "success");
  };

  const handleLoadProfile = (profileId: string) => {
    const listToSearch =
      app.workspaceProfiles && app.workspaceProfiles.length > 0
        ? app.workspaceProfiles
        : DEFAULT_WORKSPACE_PROFILES;
    const profile = listToSearch.find((p: any) => p.id === profileId);
    if (profile && profile.layout) {
      const loaded = loadAndSanitizeLayout(profile.layout);
      setCockpitWidgets(loaded);
      setApp((prev: any) => ({
        ...prev,
        cockpitLayout: loaded,
      }));
      showToast(`Profil "${profile.name}" geladen!`, "success");
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    setApp((prev: any) => {
      let currentProfiles = prev.workspaceProfiles || [];
      if (currentProfiles.length === 0) {
        currentProfiles = DEFAULT_WORKSPACE_PROFILES;
      }
      return {
        ...prev,
        workspaceProfiles: currentProfiles.filter(
          (p: any) => p.id !== profileId,
        ),
      };
    });
    showToast("Profil gelöscht", "info");
  };

  const handleSaveLayoutSlot = (slot: "A" | "B" | "C") => {
    const field = slot === "A" ? "cockpitLayoutA" : slot === "B" ? "cockpitLayoutB" : "cockpitLayoutC";
    setApp((prev) => ({
      ...prev,
      [field]: JSON.parse(JSON.stringify(cockpitWidgets)),
    }));
    // Remove legacy plaintext slot if it exists.
    if (slot === "C") localStorage.removeItem("cockpitLayoutC");
    showToast(`Layout "${slotNames[slot] || slot}" erfolgreich gespeichert!`, "success");
  };

  const handleLoadLayoutSlot = (slot: "A" | "B" | "C") => {
    const field = slot === "A" ? "cockpitLayoutA" : slot === "B" ? "cockpitLayoutB" : "cockpitLayoutC";
    const saved = app[field];
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const loaded = loadAndSanitizeLayout(saved);
      setCockpitWidgets(loaded);
      setApp((prev) => ({
        ...prev,
        cockpitLayout: loaded,
      }));
      showToast(`Layout "${slotNames[slot] || slot}" erfolgreich geladen!`, "success");
    } else {
      showToast(`Kein gespeichertes Layout in "${slotNames[slot] || slot}" vorhanden.`, "info");
    }
  };
  const [showBoardSettings, setShowBoardSettings] = useState(false);
  const [isFontSettingsOpen, setIsFontSettingsOpen] = useState(false);
  const [fullscreenWidgetId, setFullscreenWidgetId] = useState<string | null>(
    null,
  );
  const [groupsSettingsTab, setGroupsSettingsTab] = useState<
    "zufall" | "fixed"
  >("zufall");
  const [isThemePickerOpen, setIsThemePickerOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [cockpitView, setCockpitView] = useState<
    "cockpit" | "seating" | "attendance" | "gradebook"
  >("cockpit");
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const cockpitAutoSaveStorageKey =
    `cockpit_last_auto_save_date_${app.activeClassId || "unassigned"}`;
  const [hasAutoSavedToday, setHasAutoSavedToday] = useState<string | null>(
    () => localStorage.getItem(cockpitAutoSaveStorageKey),
  ); // ISO date of last successful daily save for the active class

  useEffect(() => {
    setHasAutoSavedToday(localStorage.getItem(cockpitAutoSaveStorageKey));
  }, [cockpitAutoSaveStorageKey]);

  const updateHasAutoSavedToday = (dateStr: string) => {
    setHasAutoSavedToday(dateStr);
    localStorage.setItem(cockpitAutoSaveStorageKey, dateStr);
  };
  const [showSyncInfo, setShowSyncInfo] = useState(false);
  const [syncModalTab, setSyncModalTab] = useState<'remote' | 'wifi'>('remote');
  const [isTafelOpen, setTafelOpenLocal] = useState(false);
  const setIsTafelOpen = useCallback((open: boolean) => {
    setTafelOpenLocal(open);
    setApp(prev => prev.boardSettings?.isTafelOpen === open ? prev : {
      ...prev, boardSettings: { ...prev.boardSettings, isTafelOpen: open },
    });
  }, [setApp]);
  useEffect(() => { setIsTafelOpen(false); }, [app.activeClassId, setIsTafelOpen]);
  const tafelSession = useRef({
    classId: app.activeClassId, enteredAt: Date.now(), lastId: app.boardSettings?.tafelCommand?.id,
  });

  useEffect(() => {
    const session = tafelSession.current;
    if (session.classId !== app.activeClassId) {
      tafelSession.current = { classId: app.activeClassId, enteredAt: Date.now(), lastId: app.boardSettings?.tafelCommand?.id };
      setIsTafelOpen(false);
      return;
    }
    const command = app.boardSettings?.tafelCommand;
    if (shouldApplyTafelCommand(command, app.activeClassId, session.enteredAt, session.lastId)) {
      session.lastId = command!.id;
      setIsTafelOpen(command!.open);
    }
  }, [app.activeClassId, app.boardSettings?.tafelCommand]);

  const isSmartboardOnly = !!(
    app.boardSettings?.splitSmartboardMode &&
    !app.boardSettings?.isRemoteController
  );

  // Class Pet Smartboard Interactive states
  const handleScaleChange = (delta: number) => {
    setApp((p: any) => ({
      ...p,
      classPet: {
        ...(p.classPet || {
          enabled: true,
          animalType: "dog",
          name: "Spike",
          energy: 100,
          accessories: [],
          history: [],
        }),
        scale: Math.min(2.5, Math.max(0.4, (p.classPet?.scale || 1.0) + delta)),
      },
    }));
  };

  const [petReactionText, setPetReactionText] = useState<string>("");
  const [petIsHovered, setPetIsHovered] = useState<boolean>(false);
  const [petBounceTrigger, setPetBounceTrigger] = useState(false);
  const [clickAnimationType, setClickAnimationType] = useState<"jump" | "spin">("jump");
  const [animationTrigger, setAnimationTrigger] = useState<boolean>(false);
  const [petDancing, setPetDancing] = useState(false);
  const [petDanceProgress, setPetDanceProgress] = useState(60);
  const [petAccessoryOverlayOpen, setPetAccessoryOverlayOpen] = useState(false);
  const [pendingPetActions, setPendingPetActions] = useState<Array<() => void>>([]);
  const [petModalTab, setPetModalTab] = useState<"profil" | "garderobe" | "ai">(
    "profil",
  );

  useEffect(() => {
    if (!petAccessoryOverlayOpen && pendingPetActions.length > 0) {
      // Execute all queued actions with a slight stagger
      pendingPetActions.forEach((action, idx) => {
        setTimeout(() => action(), idx * 600);
      });
      setPendingPetActions([]);
    }
  }, [petAccessoryOverlayOpen, pendingPetActions]);

  const [petChatInput, setPetChatInput] = useState<string>("");
  const [petIsThinking, setPetIsThinking] = useState<boolean>(false);
  const [petIsSpeaking, setPetIsSpeaking] = useState<boolean>(false);
  const [petChatAudio, setPetChatAudio] = useState<HTMLAudioElement | null>(
    null,
  );
  const [petAutoSpeak, setPetAutoSpeak] = useState<boolean>(false);

  const queuePetAction = (action: () => void, text?: string) => {
    setPendingPetActions((prev) => [...prev, action]);
    if (text) {
      setPetReactionText(text + " (Startet nach dem Schließen)");
    } else {
      setPetReactionText("Aktion vorgemerkt... Schließe das Fenster.");
    }
  };

  const handlePetChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!petChatInput.trim() || petIsThinking) return;
    const msg = petChatInput;
    setPetChatInput("");
    await handlePetChat(msg);
  };

  const handlePetChat = async (userMsg: string) => {
    if (!userMsg.trim() || petIsThinking) return;

    setPetIsThinking(true);
    try {
      const petState = app.classPet || {
        enabled: true,
        animalType: "dino",
        name: "Spike",
        energy: 50,
        mood: 75,
      };

      const response = await generatePetChatResponse({
        petName: petState.name || "Spike",
        petType: petState.animalType || "dino",
        energy: petState.energy || 50,
        mood: petState.mood || 75,
        userMessage: userMsg,
        currentActivity: petBehaviorState,
        activeWidgets: (app.boardWidgets || []).map((w) => w.type),
      });

      if (response) {
        setPetReactionText(response);
        if (petAutoSpeak) {
          handleSpeakText(response);
        }
      }
    } catch (error) {
      console.error("Pet chat failed", error);
    } finally {
      setPetIsThinking(false);
    }
  };

  const handleSpeakText = async (text: string) => {
    if (petIsSpeaking) {
      if (petChatAudio) {
        petChatAudio.pause();
        setPetIsSpeaking(false);
      }
      return;
    }

    try {
      setPetIsSpeaking(true);
      const audioBase64 = await generatePetSpeech(text, "Kore");
      if (audioBase64) {
        const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
        setPetChatAudio(audio);
        audio.onended = () => setPetIsSpeaking(false);
        audio.play();
      }
    } catch (error) {
      console.error("Speech generation failed", error);
      setPetIsSpeaking(false);
    }
  };

  // Custom smart behavior cycle: idle, walking, sleeping, joy, learning
  const [petBehaviorState, setPetBehaviorState] = useState<
    "idle" | "walking" | "sleeping" | "joy" | "learning"
  >("idle");
  const petCanvasRef = useRef<any>(null);
  const lastJoyEventTimeRef = useRef<number>(0);
  const petJoyTimeoutRef = useRef<any>(null);
  const hasGreetedMorningRef = useRef<boolean>(false);

  useEffect(() => {
    // Tageszeiten-Rituale: "Guten Morgen"
    if (!hasGreetedMorningRef.current) {
      hasGreetedMorningRef.current = true;
      const hours = new Date().getHours();
      let greeting = "";
      if (hours < 11) {
        greeting = "Guten Morgen Klasse! 👋 Bereit für den Tag?";
      } else if (hours >= 18) {
        greeting = "Schönen Abend! Ich packe schon mal meine Sachen... 🎒";
      }

      if (greeting) {
        setTimeout(() => {
          if (petCanvasRef.current) {
            petCanvasRef.current.celebrate();
          }
          setPetReactionText(greeting);
          setPetIsWaving(true);
          setPetIsWakingUp(true);
          setTimeout(() => {
            setPetIsWaving(false);
            setPetIsWakingUp(false);
          }, 4000);
        }, 1500);
      }
    }
  }, []);

  useEffect(() => {
    if (petBehaviorState === "joy" && petCanvasRef.current) {
      petCanvasRef.current.celebrate();
    }
  }, [petBehaviorState]);
  const [petWalkDirection, setPetWalkDirection] = useState<"left" | "right">(
    "right",
  );
  const [petJoySparks, setPetJoySparks] = useState<
    { id: number; x: number; y: number; char: string }[]
  >([]);
  const [petX, setPetX] = useState(45);
  const [petTargetX, setPetTargetX] = useState<number | null>(null);
  const [petYOffset, setPetYOffset] = useState(16);
  const [isClimbingSidebar, setIsClimbingSidebar] = useState(false);
  const [isSlidingDown, setIsSlidingDown] = useState(false);
  const climbVelocityRef = useRef(0);
  const climbTimerRef = useRef(0);
  const [petWalkDuration, setPetWalkDuration] = useState(5);
  const [petQuickMenuOpen, setPetQuickMenuOpen] = useState(false);
  const [petInactiveSeconds, setPetInactiveSeconds] = useState<number>(0);
  const [petSleptDueToInactivity, setPetSleptDueToInactivity] =
    useState<boolean>(false);
  const [petIsWaving, setPetIsWaving] = useState<boolean>(false);
  const [petIsWakingUp, setPetIsWakingUp] = useState<boolean>(false);
  const [isDeactivatingPet, setIsDeactivatingPet] = useState<boolean>(false);
  const [actualShowPet, setActualShowPet] = useState<boolean>(() => classPetEnabled);

  useEffect(() => {
    const shouldBeActive = classPetEnabled;

    if (shouldBeActive && !actualShowPet) {
      // Re-activating: skip animation or reset it
      setActualShowPet(true);
      setIsDeactivatingPet(false);
    } else if (!shouldBeActive && actualShowPet && !isDeactivatingPet) {
      // Trigger deactivation animation
      setIsDeactivatingPet(true);
    }
  }, [classPetEnabled, actualShowPet, isDeactivatingPet]);

  const petLastHoverTimeRef = useRef<number>(0);

  // Remembers when we have alerted about lesson end or break transitions
  const lastClassroomAlertRef = useRef<{
    lastNotifiedHourIdx: number | null;
    lastNotifiedBreakMin: number | null;
  }>({
    lastNotifiedHourIdx: null,
    lastNotifiedBreakMin: null,
  });

  useEffect(() => {
    if (isDeactivatingPet) {
      setPetReactionText(`Tschüss Klasse! Ich mache eine kleine Pause! 👋`);
      // Start walking towards the right side / widget bar
      setPetTargetX(100);
      setPetBehaviorState("walking");

      const timeoutId = setTimeout(() => {
        // Now wave
        setPetBehaviorState("idle");
        setPetIsWaving(true);

        setTimeout(() => {
          setActualShowPet(false);
          setIsDeactivatingPet(false);
        }, 2000);
      }, 5000); // 5 sec walking time

      return () => clearTimeout(timeoutId);
    }
  }, [isDeactivatingPet]);

  // Calculate strict bounds to ensure the pet and its 256px wide speech bubble never overflow
  // and never disappear under the student sidebar.
  const getSafePetBounds = () => {
    const container = outerContainerRef.current;
    if (!container) return { minX: 8, maxX: 92 };

    const w = container.clientWidth;
    const sidebar = sidebarRef.current;
    const sidebarW = sidebar ? sidebar.clientWidth : 0;

    const bubbleHalfWidth = 128;
    const extraPadding = 12; // Safety margin
    const paddingLeftPx = bubbleHalfWidth + extraPadding;
    const paddingRightPx = bubbleHalfWidth + extraPadding + sidebarW;

    let minXPct = (paddingLeftPx / w) * 100;
    let maxXPct = ((w - paddingRightPx) / w) * 100;

    if (minXPct > maxXPct) {
      const mid = (minXPct + maxXPct) / 2;
      minXPct = Math.max(5, mid - 2);
      maxXPct = Math.min(95, mid + 2);
    }

    return { minX: Math.max(0, minXPct), maxX: Math.min(100, maxXPct) };
  };

  // Helper to calculate landing bottom offset (gravity ceiling) based on widgets and notes board
  const getLandingOffsetForX = (xPercent: number) => {
    const container = outerContainerRef.current;
    if (!container) return 32;

    const containerRect = container.getBoundingClientRect();
    const xPixel = containerRect.left + (xPercent / 100) * containerRect.width;

    const board = boardRef.current;
    let highestY = 40; // Base floor raised slightly for visibility
    if (board) {
      const boardRect = board.getBoundingClientRect();
      // Orient at the bottom of the rich notes board
      highestY = Math.max(40, containerRect.bottom - boardRect.bottom + 20);
    }

    // Check all active widgets to see if they are below the pet (for climbing & gravity)
    const widgetElements = document.querySelectorAll(".board-widget-element");
    widgetElements.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const tolerance = 15; // horizontal buffer in px
      if (xPixel >= rect.left - tolerance && xPixel <= rect.right + tolerance) {
        const offsetFromBottom = containerRect.bottom - rect.top;
        if (offsetFromBottom > highestY) {
          highestY = offsetFromBottom;
        }
      }
    });

    return Math.min(highestY, containerRect.height - 120);
  };

  const startSidebarClimbing = () => {
    if (isClimbingSidebar || isSlidingDown) return;

    setPetTargetX(null);
    setPetBehaviorState("idle");
    setIsSlidingDown(false);

    const container = outerContainerRef.current;
    const sidebar = sidebarRef.current;
    const w = container ? container.clientWidth : 1000;
    const sidebarW = sidebar ? sidebar.clientWidth : 335;
    const sidebarXPercent = sidebarW > 0 ? ((w - sidebarW / 2) / w) * 100 : 92;

    setPetX(sidebarXPercent);
    const landingY = getLandingOffsetForX(sidebarXPercent);
    setPetYOffset(landingY);

    climbVelocityRef.current = 5;
    climbTimerRef.current = 0;
    setIsClimbingSidebar(true);

    const climberQuotes = [
      `🧗‍♂️ Bergsteiger-Modus aktiv! Ich klettere die Schülerliste empor!`,
      `🧗‍♂️ Kraxel, kraxel! Ich laufe an der Schülerliste hoch!`,
      `🧗‍♂️ Schaut mal alle her! Ich erklimme die Schülerliste! ✨`,
    ];
    setPetReactionText(
      climberQuotes[Math.floor(Math.random() * climberQuotes.length)],
    );
  };

  // Climbing & sliding physics effect
  useEffect(() => {
    if (!isClimbingSidebar && !isSlidingDown) {
      climbVelocityRef.current = 0;
      return;
    }

    let active = true;
    const stepTime = 40; // ~25 fps game step

    const runPhysics = () => {
      if (!active) return;

      if (isClimbingSidebar) {
        // --- CLIMBING MODE WITH PHYSICS-BASED STOPS ---
        const container = outerContainerRef.current;
        const containerHeight = container ? container.clientHeight : 600;
        const maxClimbHeight = containerHeight - 125; // stay within screen boundaries

        climbTimerRef.current += stepTime;

        // Occasionally push upward (like steps of climbing)
        // Climb every 1600ms, last for a quick burst
        if (climbTimerRef.current >= 1600 && climbVelocityRef.current <= 0.1) {
          climbTimerRef.current = 0;
          climbVelocityRef.current = 10 + Math.random() * 8; // Burst upward

          const climbNoises = [
            "Hopp! 🧗‍♂️",
            "Und rauf! 💪",
            "Kletter, kletter... 🐾",
            "Zack! 🚀",
          ];
          setPetReactionText(
            climbNoises[Math.floor(Math.random() * climbNoises.length)],
          );
        }

        // Apply friction/deceleration to climbing velocity
        climbVelocityRef.current *= 0.82; // steep friction decay

        // Update Y offset
        setPetYOffset((prev) => {
          let nextY = prev + climbVelocityRef.current;
          if (nextY >= maxClimbHeight) {
            nextY = maxClimbHeight;
            climbVelocityRef.current = 0;

            // Peak achievement!
            if (prev < maxClimbHeight - 2) {
              setPetReactionText(
                "Gipfelstürmer! Ich habe die Spitze erreicht! 🏔️👑 Klick mich zum Rutschen!",
              );
            }
          }
          return nextY;
        });

        // Sideways locking - keep pet centered inside Schülerliste (sidebar area)
        if (container) {
          const sidebar = sidebarRef.current;
          const sidebarW = sidebar ? sidebar.clientWidth : 335;
          const sidebarXPercent =
            sidebarW > 0
              ? ((container.clientWidth - sidebarW / 2) /
                  container.clientWidth) *
                100
              : 92;
          setPetX(sidebarXPercent);
        }
      } else if (isSlidingDown) {
        // --- SLIDING DOWN MODE ---
        // Slide downwards with acceleration
        climbVelocityRef.current += 1.4; // Slightly more gravity for snappier feel
        const terminalSpeed = 26; // Faster slide
        const speed = Math.min(terminalSpeed, climbVelocityRef.current);

        setPetYOffset((prev) => {
          const targetFloorY = getLandingOffsetForX(petX);
          const nextY = prev - speed;

          if (nextY <= targetFloorY) {
            // Hit bottom! Finish slide
            setIsSlidingDown(false);
            setPetBehaviorState("idle");
            setPetReactionText("Huiii! Sicher gelandet! 🛝✨");

            // Land bounce trigger without sound
            setPetBounceTrigger(true);
            setTimeout(() => setPetBounceTrigger(false), 800);
            if (
              petCanvasRef.current &&
              typeof petCanvasRef.current.bounce === "function"
            ) {
              petCanvasRef.current.bounce();
            }

            return targetFloorY;
          }
          return Math.max(targetFloorY - 50, nextY); // Prevent massive clip
        });
      }

      setTimeout(runPhysics, stepTime);
    };

    const timer = setTimeout(runPhysics, stepTime);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isClimbingSidebar, isSlidingDown, petX]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message}`,
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // Countdown timer for Class Pet Activ-Dancebreak
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (petDancing && petDanceProgress > 0) {
      interval = setInterval(() => {
        setPetDanceProgress((prev) => {
          if (prev <= 1) {
            setPetDancing(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [petDancing, petDanceProgress]);

  // Dynamic Class Pet Interactive Behavior Cycle & Joy Listener
  useEffect(() => {
    const defaultName = app.classPet?.name || "Spike";

    // 1. Listen for positive entries (custom event)
    const handleJoyEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const customMsg =
        customEvent.detail?.message || `${defaultName} hüpft vor Freude! 🎉`;

      // Update text IMMEDIATELY so giving points to children is responsive and real-time
      setPetReactionText(customMsg);
      setPetBounceTrigger(true);
      setTimeout(() => setPetBounceTrigger(false), 900);

      // Throttling: If the last joy ceremony was less than 2.0 seconds ago,
      // skip heavy animations (sounds and sparks) to save RAM and CPU!
      const now = Date.now();
      const isThrottled = now - lastJoyEventTimeRef.current < 2000;
      if (isThrottled) {
        return;
      }
      lastJoyEventTimeRef.current = now;

      // Upgrade state immediately to joy
      setPetBehaviorState("joy");

      // Spawn colorful particle explosion emojis with a slightly wider, more festive spread!
      const sparkChars = ["✨", "⭐", "🌟", "🎉", "🎈", "💖", "🍀", "🚀"];
      const newSparks = Array.from({ length: 12 }).map((_, i) => ({
        id: Date.now() + i + Math.random(),
        x: (Math.random() - 0.5) * 160, // wider horizontal spread for beautiful floating motion
        y: Math.random() * -70 - 20, // displacement upwards
        char: sparkChars[i % sparkChars.length],
      }));
      setPetJoySparks(newSparks);

      // Clean up sparks & reset behavior state after 4 seconds
      if (petJoyTimeoutRef.current) {
        clearTimeout(petJoyTimeoutRef.current);
      }
      petJoyTimeoutRef.current = setTimeout(() => {
        setPetJoySparks([]);
        setPetBehaviorState("idle");
      }, 4000);
    };

    window.addEventListener("classpet-joy", handleJoyEvent);

    // 2. Helper to find columns free of activeWidgets (KI-Layout-Analyse)
    const getSafeColumnsForPet = () => {
      const board = boardRef.current;
      const activeWidgets = (app.boardWidgets || []).filter(
        (w) =>
          ![
            "links",
            "sounds",
            "classpet",
            "timer",
            "ampel",
            "lottowinner",
            "laerm",
            "lernwoerter",
            "groups",
            "qrcode",
          ].includes(w.type),
      );
      if (!board) return [15, 30, 50, 70, 85];

      const boardWidth = board.clientWidth || 1200;
      const boardHeight = board.clientHeight || 700;

      // Classify the bottom of the screen in 20 sections of 5% each
      const segments = new Array(20).fill(0);

      activeWidgets.forEach((w) => {
        // approximate width depending on widget type
        const wWidth =
          w.type === "groups" ? 340 : w.type === "sticky" ? 240 : 260;
        const wHeight = w.type === "groups" ? 400 : 300;

        // check if widget overlaps with the bottom area vertically (where the pet resides, normally under y: boardHeight - 200px)
        const widgetBottom = w.y + wHeight;
        const overlapsVertically = widgetBottom > boardHeight - 220;

        const leftPct = (w.x / boardWidth) * 100;
        const rightPct = ((w.x + wWidth) / boardWidth) * 100;

        // penalty score
        const penalty = overlapsVertically ? 12 : 3;

        const startSeg = Math.max(0, Math.floor(leftPct / 5));
        const endSeg = Math.min(19, Math.ceil(rightPct / 5));

        for (let s = startSeg; s <= endSeg; s++) {
          segments[s] += penalty;
        }
      });

      // Find the segments with the lowest overlap score
      let minScore = 999;
      for (let s = 1; s < 19; s++) {
        // keep away from absolute corners 0% and 95%+
        if (segments[s] < minScore) {
          minScore = segments[s];
        }
      }

      const bestPercentages: number[] = [];
      for (let s = 1; s < 19; s++) {
        if (segments[s] === minScore) {
          bestPercentages.push(s * 5 + 2.5);
        }
      }

      return bestPercentages.length > 0 ? bestPercentages : [15, 50, 85];
    };

    // 3. Continuous Random Behavior Cycle & Teacher-configured mode lock
    const behaviorInterval = setInterval(() => {
      if (isClimbingSidebar || isSlidingDown) return;
      const configMode = app.classPet?.behaviorMode || "auto";
      const isLocked = app.classPet?.isLocked || false;

      // STRICT LOCK: If teacher configured a specific mode manually, stay in it
      if (isLocked) {
        if (configMode === "sleep" && petBehaviorState !== "sleeping")
          setPetBehaviorState("sleeping");
        if (configMode === "learn" && petBehaviorState !== "learning")
          setPetBehaviorState("learning");
        if (configMode === "idle" && petBehaviorState !== "idle")
          setPetBehaviorState("idle");
        if (
          configMode === "wander" &&
          petBehaviorState !== "walking" &&
          petBehaviorState !== "idle"
        )
          setPetBehaviorState("idle");
        return;
      }

      // If teacher configured sleep, force sleep
      if (configMode === "sleep") {
        setPetBehaviorState("sleeping");
        return;
      }
      // If teacher configured learning, force learning
      if (configMode === "learn") {
        setPetBehaviorState("learning");
        return;
      }
      // If teacher configured idle (Ruhe), force idle
      if (configMode === "idle") {
        setPetBehaviorState("idle");
        return;
      }

      // If it's after 18:00, sleep if in auto mode
      const isAfter18 = new Date().getHours() >= 18;
      if (isAfter18 && configMode === "auto") {
        setPetBehaviorState("sleeping");
        return;
      }

      setPetBehaviorState((current) => {
        // Joy overrides standard intervals, and Active Dance break takes precedence
        if (current === "joy" || petDancing) return current;

        // Since configMode is 'wander', it only wanders (walking <=> idle)
        const rand = Math.random();

        // 12% probability of spontaneous student list climbing if sidebar is visible
        if (
          rand < 0.12 &&
          sidebarMode !== "hidden" &&
          app.schueler &&
          app.schueler.length > 0
        ) {
          setTimeout(() => {
            startSidebarClimbing();
          }, 0);
          return "idle";
        }

        if (rand < 0.45) {
          // WALK STATE: Choose a random coordinate staying strictly within text bubble and sidebar bounds
          const bounds = getSafePetBounds();
          const targetX =
            Math.floor(Math.random() * (bounds.maxX - bounds.minX)) +
            bounds.minX;
          setPetTargetX(targetX);

          const targetY = getLandingOffsetForX(targetX);
          const isClimbing = targetY > 50;
          const walkPhrases = isClimbing
            ? [
                `🐾 Schaut mal, ich klettere auf ein Widget rauf! 🧗‍♂️`,
                `🐾 Huii! Von hier oben habe ich eine tolle Aussicht! 🌟`,
                `🐾 Ich balanciere über eure Widgetfelder! 🎪`,
                `🐾 Kletter, kletter... Wer herrscht hier über das Smartboard? 👑`,
              ]
            : [
                `🐾 Wander, wander... Ich erkunde das Cockpit!`,
                `🐾 Lalala, spazierengehen hält fit!`,
                `🐾 Schnüffel, schnüffel... Gibt es hier Kekse im Klassenraum?`,
                `🐾 Ich laufe eine kleine Runde vorbei an euren Plätzen!`,
              ];
          setPetReactionText(
            walkPhrases[Math.floor(Math.random() * walkPhrases.length)],
          );
          return "walking";
        } else {
          // IDLE STATE
          const idlePhrases = [
            `Ich passe gut auf eure tollen Ideen auf! 💖`,
            `Lernen macht Riesenspaß mit euch! 🧠✨`,
            `Ich liebe unsere Klasse! Streichel mich gerne! 🍎`,
            `Spitze, wie aufmerksam ihr heute alle seid! 😍`,
          ];
          setPetReactionText(
            idlePhrases[Math.floor(Math.random() * idlePhrases.length)],
          );
          return "idle";
        }
      });
    }, 14000);

    return () => {
      window.removeEventListener("classpet-joy", handleJoyEvent);
      clearInterval(behaviorInterval);
      if (petJoyTimeoutRef.current) {
        clearTimeout(petJoyTimeoutRef.current);
      }
    };
  }, [
    app.classPet?.name,
    app.classPet?.behaviorMode,
    petDancing,
    app.boardWidgets,
  ]);

  // Immediate synchronization when behaviorMode changes
  useEffect(() => {
    const configMode = app.classPet?.behaviorMode || "auto";
    if (configMode === "sleep") {
      setPetBehaviorState("sleeping");
    } else if (configMode === "learn") {
      setPetBehaviorState("learning");
    } else if (configMode === "idle") {
      setPetBehaviorState("idle");
    } else if (configMode === "wander" || configMode === "auto") {
      if (petBehaviorState !== "walking" && petBehaviorState !== "idle") {
        setPetBehaviorState("idle");
      }
    }
  }, [app.classPet?.behaviorMode]);

  // Teacher inactivity trigger (5 min = 300s) & wake-up behavior
  useEffect(() => {
    const defaultName = app.classPet?.name || "Spike";

    const tickInterval = setInterval(() => {
      setPetInactiveSeconds((prev) => {
        const nextSec = prev + 1;
        // At 300 seconds (5 min of inactivity), initiate the sleep transition
        if (nextSec >= 300) {
          const configMode = app.classPet?.behaviorMode || "auto";
          if (petBehaviorState !== "sleeping" && configMode === "auto") {
            setPetBehaviorState("sleeping");
            setPetSleptDueToInactivity(true);
            const sleepyQuotes = [
              `Uuuund... zZz... ${defaultName} schlummert ein... 😴💤`,
              `${defaultName} hat sich schlafen gelegt, weil es so ruhig ist... zZz... 😴`,
              `Chrr-püh... zZz... Pause tut gut! Gute Nacht... 😴`,
            ];
            setPetReactionText(
              sleepyQuotes[Math.floor(Math.random() * sleepyQuotes.length)],
            );
          }
        }
        return nextSec;
      });
    }, 1000);

    const resetTimer = () => {
      setPetInactiveSeconds(0);

      const configMode = app.classPet?.behaviorMode || "auto";
      const isLocked = app.classPet?.isLocked || false;
      const isAfter18 = new Date().getHours() >= 18;

      // If teacher manually selected a restricted mode, do not wake up automatically via activity
      if (
        isLocked &&
        (configMode === "sleep" ||
          configMode === "learn" ||
          configMode === "idle")
      ) {
        return;
      }

      if (isAfter18 && configMode === "auto") {
        // Keep sleep mode active after 18:00
        return;
      }

      setPetSleptDueToInactivity((wasAsleep) => {
        if (wasAsleep) {
          // Wake up the pet back to idle!
          setPetBehaviorState("idle");
          const wakeQuotes = [
            `Miau! Äh, Hallo! ☀️ ${defaultName} ist wieder hellwach!`,
            `Gähn... hach! ${defaultName} streckt sich und freut sich, dich zu sehen! 🦖`,
            `Ahoi! Ich habe wunderbar geschlafen. Bereit für die Klasse! 👀✨`,
          ];
          setPetReactionText(
            wakeQuotes[Math.floor(Math.random() * wakeQuotes.length)],
          );
        }
        return false;
      });
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("pointerdown", resetTimer);
    window.addEventListener("click", resetTimer);

    return () => {
      clearInterval(tickInterval);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("pointerdown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [petBehaviorState, app.classPet?.name]);

  // Detailed incremental step-by-step walking loop for precise collision boundaries & climbing (terrain follower)
  useEffect(() => {
    if (
      petBehaviorState !== "walking" ||
      petTargetX === null ||
      isClimbingSidebar ||
      isSlidingDown
    )
      return;

    let active = true;
    const intervalFrameTime = 40; // ~25 fps game step simulation

    const gameStep = () => {
      if (!active) return;

      setPetX((prev) => {
        const diff = petTargetX - prev;
        if (Math.abs(diff) < 1.0) {
          // Reached walk destination! Stabilize and enter IDLE state
          setPetBehaviorState("idle");
          setPetTargetX(null);
          return petTargetX;
        }

        // Stepping mechanics
        const baseSpeed = 0.8; // percentage of horizontal travel per frame
        const nextX =
          diff > 0
            ? Math.min(petTargetX, prev + baseSpeed)
            : Math.max(petTargetX, prev - baseSpeed);
        setPetWalkDirection(diff > 0 ? "right" : "left");

        // Dynamic edge climb/gravity fall collision calculation
        const landingY = getLandingOffsetForX(nextX);
        setPetYOffset(landingY);

        return nextX;
      });

      setTimeout(gameStep, intervalFrameTime);
    };

    const timer = setTimeout(gameStep, intervalFrameTime);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [petBehaviorState, petTargetX]);

  // Auto-clear speech bubble after 8 seconds of inactivity
  useEffect(() => {
    if (petReactionText) {
      const timer = setTimeout(() => {
        setPetReactionText("");
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [petReactionText]);

  // Periodic random greetings every 3 minutes using student names (Namenliste) and the class name
  useEffect(() => {
    const triggerTick = () => {
      if (petBehaviorState === "sleeping") return; // Silent during sleep

      const studentNames = (app.schueler || [])
        .map((s) => s.vorname)
        .filter(Boolean);
      const randomStudent =
        studentNames.length > 0
          ? studentNames[Math.floor(Math.random() * studentNames.length)]
          : "Klasse";
      const className = app.klassenbezeichnung || "Klasse";
      const petName = app.classPet?.name || "Spike";

      let periodicLines: string[] = [];
      if (petBehaviorState === "learning") {
        periodicLines = [
          `Pssst... Ihr lernt so toll, Klasse ${className}! 📚`,
          `Wie läuft die Aufgabe, ${randomStudent}? Ich drücke die Pfoten! 🐾📖`,
          `Ich liebe ruhige Arbeitsphasen mit der Klasse ${className}. 🤫`,
          `Super Fokus, ${randomStudent}! Weiter so! ✨`,
        ];
      } else {
        periodicLines = [
          `${petName} freut sich riesig, hier bei der Klasse ${className} zu sein! 🐾`,
          `Hallo ${randomStudent}! Lust auf eine kurze Aktiv-Tanzpause? 🎵`,
          `Die Klasse ${className} ist heute wieder so fleißig! 💖`,
          `Geht es allen gut? Mach weiter so, ${randomStudent}! ⭐`,
          `Ich passe prima auf euch auf in der ${className}! 👋`,
        ];
      }

      const randomLine =
        periodicLines[Math.floor(Math.random() * periodicLines.length)];
      setPetReactionText(randomLine);
    };

    const interval = setInterval(triggerTick, 180000); // 3 minutes = 180000 ms
    return () => clearInterval(interval);
  }, [
    petBehaviorState,
    app.schueler,
    app.klassenbezeichnung,
    app.classPet?.name,
  ]);

  // Gravity and climbing correction: automatically recalculate pet's vertical height
  // when widgets are dragged, added or the pet's horizontal position updates.
  useEffect(() => {
    if (isClimbingSidebar || isSlidingDown) return;
    const targetY = getLandingOffsetForX(petX);
    if (Math.abs(petYOffset - targetY) > 2) {
      setPetYOffset(targetY);

      // If he did a significant climb up, speak a cute phrase
      if (targetY > 70 && petYOffset <= 50) {
        const climbGreetings = [
          "Wuuu! Seht mal, wie hoch ich klettern kann! 🦖🧗‍♂️",
          "Hoppla hopp! Ich klettere auf die Aussichtsplattform! 🌟",
          "Sport am Morgen vertreibt Kummer und Sorgen! 💪🐾",
        ];
        setPetReactionText(
          climbGreetings[Math.floor(Math.random() * climbGreetings.length)],
        );
      }
    }
  }, [app.boardWidgets, petX]);

  // Extended Design States
  const [activePultTheme, setActivePultTheme] = useState(
    () => app.unterrichtsmodus_theme || app.theme || "classic_light",
  );
  const [fokusTheme, setFokusTheme] = useState("deep_dark");
  const customBgColor = app.customBgColor || "#121214";

  useEffect(() => {
    if (
      app.unterrichtsmodus_theme &&
      app.unterrichtsmodus_theme !== activePultTheme
    ) {
      setActivePultTheme(app.unterrichtsmodus_theme);
    }
  }, [app.unterrichtsmodus_theme]);
  const [activeFont, setActiveFont] = useState(
    () =>
      app.boardSettings?.activeFont ||
      `font-${app?.settings?.fontFamily || "standard"}`,
  );

  useEffect(() => {
    if (app.boardSettings?.activeFont) {
      setActiveFont((curr) => {
        if (curr !== app.boardSettings.activeFont) {
          return app.boardSettings.activeFont;
        }
        return curr;
      });
    } else {
      const globalFont = `font-${app?.settings?.fontFamily || "standard"}`;
      setActiveFont((curr) => {
        if (curr !== globalFont) {
          return globalFont;
        }
        return curr;
      });
    }
  }, [app.boardSettings?.activeFont, app?.settings?.fontFamily]);

  useEffect(() => {
    // Only update app state if font actually changed and differs from app state
    if (app.boardSettings && app.boardSettings.activeFont !== activeFont) {
      const timeout = setTimeout(() => {
        setApp((p: any) => {
          if (p.boardSettings.activeFont === activeFont) return p;
          return {
            ...p,
            boardSettings: {
              ...p.boardSettings,
              activeFont: activeFont,
            },
          };
        });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [activeFont, app.boardSettings, setApp]);

  // Listen for remote sound/confetti triggers from Handy-Fernbedienung
  const startMountTimeRef = useRef<number>(Date.now());
  const lastProcessedSoundRef = useRef<number | undefined>(
    app.boardSettings?.remoteSoundToPlay?.timestamp,
  );
  useEffect(() => {
    const trigger = app.boardSettings?.remoteSoundToPlay;
    if (trigger && trigger.timestamp > startMountTimeRef.current) {
      if (
        !lastProcessedSoundRef.current ||
        trigger.timestamp > lastProcessedSoundRef.current
      ) {
        lastProcessedSoundRef.current = trigger.timestamp;
        playSound(trigger.type);
        if (
          trigger.type === "fanfare" ||
          trigger.type === "tada" ||
          trigger.type === "applause"
        ) {
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 },
          });
        }
      }
    }
  }, [app.boardSettings?.remoteSoundToPlay]);

  // High-Quality Primary School board templates & export states
  const [isFocusModeLightOff, setIsFocusModeLightOff] = useState(false);
  const [tplName, setTplName] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<
    Array<{
      id: string;
      title: string;
      content: string;
      paperType: "blank" | "lined" | "squared" | "writing-lines" | "millimeter";
      paperSize: number;
      activeFont: string;
    }>
  >(() => {
    const loaded = localStorage.getItem("lehrer_tafelbild_templates");
    if (loaded) {
      try {
        return JSON.parse(loaded);
      } catch (e) {}
    }
    return [
      {
        id: "template-morgenkreis",
        title: "☀️ Morgenkreis & Tagesplan",
        content: `Guten Morgen, liebe Klasse! ☀️<br>Heute ist <b>Dienstag</b>.<br><br><b>Unser Tagesplan:</b><br>1. Deutsch (Schreibübung)<br>2. Mathe (Rechnen bis 20)<br>3. Musik (Singen und Bewegen) 🎶`,
        paperType: "blank",
        paperSize: 40,
        activeFont: "font-sans",
      },
      {
        id: "template-mathe",
        title: "🧮 Mathe Rechentafel",
        content: `Kopfrechnen-Meisterschaft! 🧮<br><br>Löse die Rätsel so schnell du kannst:<br>• 12 + 7 = ___<br>• 20 - 6 = ___<br>• 15 + ___ = 20<br>• 8 + 8 - 3 = ___`,
        paperType: "squared",
        paperSize: 40,
        activeFont: "font-dyslexic",
      },
      {
        id: "template-schreibhaus",
        title: "🏠 Schreibhaus-Übung (G/F)",
        content: `Schreibübung im Schreibhaus! 🏠<br><br>Schreibe die Buchstaben sauber in die Zeilen:<br>• <b>g</b> (Kopf im Wohnzimmer, Schleife im Keller)<br>• <b>f</b> (Kopf im Dach, Körper im Wohnzimmer)<br>• <b>A</b> (Dach und Wohnzimmer)`,
        paperType: "writing-lines",
        paperSize: 44,
        activeFont: "font-schulschrift",
      },
    ];
  });

  const handleSaveTemplate = (titleInput: string) => {
    if (!titleInput.trim()) {
      showToast("Bitte gib einen Namen für die Vorlage ein.", "error");
      return;
    }
    const newTpl = {
      id: `tpl-${Date.now()}`,
      title: titleInput.trim(),
      content: app.vertretungHinweise || "",
      paperType: (app.boardSettings?.paperType || "blank") as any,
      paperSize: app.boardSettings?.paperSize || 40,
      activeFont: activeFont || "font-sans",
    };
    const updated = [...savedTemplates, newTpl];
    setSavedTemplates(updated);
    localStorage.setItem("lehrer_tafelbild_templates", JSON.stringify(updated));
    showToast("Tafelbild-Vorlage gespeichert!", "success");
    setTplName("");
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    localStorage.setItem("lehrer_tafelbild_templates", JSON.stringify(updated));
    showToast("Vorlage gelöscht.", "info");
  };

  const handleLoadTemplate = (tpl: any) => {
    setApp((prev: any) => ({
      ...prev,
      vertretungHinweise: tpl.content,
      boardSettings: {
        ...prev.boardSettings,
        paperType: tpl.paperType,
        paperSize: tpl.paperSize,
      },
    }));
    if (tpl.activeFont) {
      setActiveFont(tpl.activeFont);
    }
    showToast(`Vorlage "${tpl.title}" geladen.`, "success");
  };

  const handleExportTafelbild = () => {
    const content = app.vertretungHinweise || "";
    const safeClassPart = cockpitClassLabel
      ? "_" + cockpitClassLabel.replace(/[^\p{L}\p{N}._-]+/gu, "_")
      : "";
    const title = `Tafelbild${safeClassPart}_${new Date().toLocaleDateString("de-DE")}`;
    const fontToLoadStr =
      activeFont === "font-druckschrift"
        ? "Druckschrift"
        : activeFont === "font-schulschrift"
          ? "Schulschrift"
          : "Standard Sans";

    const htmlFileContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      padding: 40px;
      background: #f8fafc;
      color: #0f172a;
      line-height: 1.6;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.04);
      border: 1px solid #e2e8f0;
    }
    h1 {
      font-size: 26px;
      font-weight: 900;
      margin-bottom: 5px;
      color: #0f172a;
      letter-spacing: -0.025em;
    }
    .date {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 24px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .meta-badge {
      display: inline-flex;
      align-items: center;
      background: #f1f5f9;
      color: #475569;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      margin-left: 10px;
    }
    .board-content {
      border-top: 2px solid #f1f5f9;
      padding-top: 24px;
      font-size: 22px;
      white-space: pre-wrap;
      color: #1e293b;
    }
    @media print {
      body {
        padding: 0;
        background: transparent;
      }
      .container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
      <h1>Tafelbild${cockpitClassLabel ? ` • Klasse ${cockpitClassLabel}` : ""}</h1>
      <span class="meta-badge">Schrift: ${fontToLoadStr}</span>
    </div>
    <div class="date">Erstellt am ${new Date().toLocaleDateString("de-DE")} • Unterrichtsassistent</div>
    <div class="board-content">
${content}
    </div>
  </div>
</body>
</html>
    `.trim();

    const blob = new Blob([htmlFileContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(
      "Tafelbild erfolgreich als HTML-Arbeitsblatt exportiert!",
      "success",
    );
  };
  const sidebarMode = app.boardSettings?.sidebarMode || "expanded";
  const [prevSidebarMode, setPrevSidebarMode] = useState<"expanded" | "mini">(
    "expanded",
  );
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarWidth, setSidebarWidth] = useState(290);

  useEffect(() => {
    if (!sidebarRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setSidebarWidth(entry.contentRect.width);
      }
    });
    observer.observe(sidebarRef.current);
    return () => observer.disconnect();
  }, [sidebarMode]);

  const changeSidebarMode = (mode: "expanded" | "mini" | "hidden") => {
    if (mode === "expanded" || mode === "mini") {
      setPrevSidebarMode(mode);
    }
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        sidebarMode: mode,
      },
    }));
  };

  // Keep the widget board usable on tablets and smaller laptop windows. The
  // full student list otherwise consumes most of the available board width.
  useEffect(() => {
    const adaptSidebarToViewport = () => {
      const nextMode =
        window.innerWidth < 720
          ? "hidden"
          : window.innerWidth < 1100 && sidebarMode === "expanded"
            ? "mini"
            : null;

      if (!nextMode || nextMode === sidebarMode) return;

      setApp((prev: any) => ({
        ...prev,
        boardSettings: {
          ...prev.boardSettings,
          sidebarMode: nextMode,
        },
      }));
    };

    adaptSidebarToViewport();
    window.addEventListener("resize", adaptSidebarToViewport);
    return () => window.removeEventListener("resize", adaptSidebarToViewport);
  }, [sidebarMode, setApp]);

  // Student list sidebar options and long-click settings
  const [activeStudentSettingsId, setActiveStudentSettingsId] = useState<
    string | null
  >(null);
  const [showSubjectSettings, setShowSubjectSettings] = useState(false);
  const [sessionSuccessMessage, setSessionSuccessMessage] = useState<
    string | null
  >(null);
  const pressTimer = useRef<Record<string, any>>({});
  const [quickCommentText, setQuickCommentText] = useState("");
  const [quickCommentSaved, setQuickCommentSaved] = useState(false);
  const [newBadgeName, setNewBadgeName] = useState("");
  const [newBadgeIcon, setNewBadgeIcon] = useState("🧠");
  const [recentOmission, setRecentOmission] = useState<{
    type: "hu" | "material";
    detail: string;
    studentId: string;
  } | null>(null);
  const [sentNotificationSuccess, setSentNotificationSuccess] =
    useState<boolean>(false);
  const [customMaterial, setCustomMaterial] = useState<string>("");

  // Determine Mode (Synced with viewMode)
  const currentModus = "lehrperson";
  const viewMode = "teacher";

  // Dynamic Theme & Background based on mode
  const currentThemeId =
    app.unterrichtsmodus_theme ||
    app.unterrichtsmodus_themeProModus?.[currentModus] ||
    app.theme ||
    "classic_light";
  let currentTheme =
    UNTERRICHTSMODUS_THEMES[currentThemeId] ||
    UNTERRICHTSMODUS_THEMES.classic_light;

  const currentBgId =
    app.unterrichtsmodus_hintergrund ||
    app.unterrichtsmodus_hintergrundProModus?.[currentModus] ||
    "kein";
  const currentBg =
    UNTERRICHTSMODUS_HINTERGRUENDE[currentBgId] ||
    UNTERRICHTSMODUS_HINTERGRUENDE.kein;

  const customImg =
    app.unterrichtsmodus_eigenesBild ||
    app.unterrichtsmodus_eigenesBildProModus?.[currentModus];
  const canvaBackground = app.unterrichtsmodus_canvaBild;

  const sidebarOpen = app.unterrichtsmodus_sidebar_open ?? false;
  const setSidebarOpen = (open: boolean) =>
    setApp((prev) => ({ ...prev, unterrichtsmodus_sidebar_open: open }));

  const ampelGlow =
    app.ampel_status === "rot"
      ? "rgba(244, 63, 94, 0.03)"
      : app.ampel_status === "gelb"
        ? "rgba(251, 191, 36, 0.03)"
        : app.ampel_status === "gruen"
          ? "rgba(16, 185, 129, 0.03)"
          : "transparent";

  const tagName = getTodayName();
  const kw = getKW(new Date());

  const getTodayPoints = useCallback(
    (sid: string) => {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      let total = 0;
      if (app.mitarbeitLogs && app.mitarbeitLogs.length > 0) {
        app.mitarbeitLogs.forEach((log: any) => {
          const d = new Date(log.timestamp);
          const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (log.sid === sid && logDateStr === todayStr) {
            total += log.points;
          }
        });
      }
      return total;
    },
    [app.mitarbeitLogs],
  );

  const [widgetVisibility, setWidgetVisibility] = useState({
    helfer: true,
    stundenplan: true,
    klassenglas: true,
    termine: true,
    tagesbester: true,
    wochenbester: true,
    klassenspiegel: true,
  });
  const [useShortNames, setUseShortNames] = useState(false);
  const [activeSubjectOverride, setActiveSubjectOverride] =
    useState<string>("auto");

  const [newFachInput, setNewFachInput] = useState("");
  const [newNoteInput, setNewNoteInput] = useState("");

  const handleAddFach = () => {
    if (!newFachInput.trim()) return;
    setApp((prev: any) => {
      const planStr = prev.wochenplanung || {};
      const currentWeekPlan = planStr[kw] || {};
      const currentDayPlan =
        currentWeekPlan[tagName] || prev.stammplan?.[tagName] || [];
      const updatedDayPlan = [...currentDayPlan, { fach: newFachInput.trim() }];
      return {
        ...prev,
        wochenplanung: {
          ...planStr,
          [kw]: {
            ...currentWeekPlan,
            [tagName]: updatedDayPlan,
          },
        },
      };
    });
    setNewFachInput("");
  };

  const handleAddNote = () => {
    if (!newNoteInput.trim()) return;
    setApp((prev: any) => {
      const n = prev.notizen || [];
      return {
        ...prev,
        notizen: [
          {
            id: Date.now().toString(),
            inhalt: newNoteInput.trim(),
            termin: new Date().toISOString(),
          },
          ...n,
        ],
      };
    });
    setNewNoteInput("");
  };

  const [lessonPhases, setLessonPhases] = useState<
    { id: string; label: string; active: boolean }[]
  >([
    { id: "1", label: "Einstieg", active: true },
    { id: "2", label: "Erarbeitung", active: false },
    { id: "3", label: "Sicherung", active: false },
  ]);
  const currentPhaseName =
    lessonPhases.find((p) => p.active)?.label || "Unterricht";

  // Exit Focus Mode with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        setIsFocusMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode]);

  const getCurrentHour = () => {
    const now = time.getHours() * 60 + time.getMinutes();
    const current = findCurrentLessonSlot(lessonTimeSlots, now);
    if (!current) return null;
    const unitIdx = current.slot - 1;
    const progress = Math.max(
      0,
      Math.min(
        100,
        ((now - current.start) / (current.end - current.start)) * 100,
      ),
    );
    return {
      idx: unitIdx,
      timeLeft: current.end - now,
      label: `${unitIdx + 1}. Einheit`,
      progress,
      next: app.stammplan?.[tagName]?.[unitIdx + 1],
    };
  };

  const currentHour = getCurrentHour();

  const getActiveSubject = useCallback(() => {
    const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    const dayPlan = tagName ? (app.wochenplanung?.[kw]?.[tagName] || {}) : {};
    const defaultSub = currentHour
      ? dayPlan[currentHour.idx]?.fach ||
        app.stammplan?.[tagName]?.[currentHour.idx + 1] ||
        "Unterricht"
      : "Unterricht";
    return defaultSub;
  }, [
    currentHour,
    app.wochenplanung,
    app.stammplan,
    kw,
    tagName,
  ]);

  const getSubjectColorClasses = useCallback((subjectName?: string) => {
    if (!subjectName) {
      return {
        text: "text-emerald-500",
        bg: "bg-emerald-500",
        shadow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]"
      };
    }
    const configColor = app?.fachConfig?.[subjectName]?.color;
    const ln = subjectName.toLowerCase();
    
    let color = "emerald";
    if (configColor && configColor !== "slate") {
      color = configColor;
    } else {
      if (ln.includes("werken") || ln.includes("technik") || ln.includes("design")) color = "orange";
      else if (ln.includes("bewegung") || ln.includes("sport")) color = "teal";
      else if (ln.includes("fremdsprache") || ln.includes("englisch")) color = "sky";
      else if (ln.includes("deutsch")) color = "blue";
      else if (ln.includes("mathematik")) color = "red";
      else if (ln.includes("sachunterricht") || ln.includes("sachkunde")) color = "emerald";
      else if (ln.includes("bildnerische") || ln.includes("kunst") || ln.includes("gestaltung")) color = "purple";
      else if (ln.includes("musik")) color = "pink";
      else if (ln.includes("religion")) color = "indigo";
      else color = "emerald";
    }

    const mapping: Record<string, { text: string, bg: string, shadow: string }> = {
      blue: { text: "text-blue-500", bg: "bg-blue-500", shadow: "shadow-[0_0_15px_rgba(59,130,246,0.4)]" },
      red: { text: "text-red-500", bg: "bg-red-500", shadow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]" },
      emerald: { text: "text-emerald-500", bg: "bg-emerald-500", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]" },
      indigo: { text: "text-indigo-500", bg: "bg-indigo-500", shadow: "shadow-[0_0_15px_rgba(99,102,241,0.4)]" },
      sky: { text: "text-sky-500", bg: "bg-sky-500", shadow: "shadow-[0_0_15px_rgba(14,165,233,0.4)]" },
      purple: { text: "text-purple-500", bg: "bg-purple-500", shadow: "shadow-[0_0_15px_rgba(168,85,247,0.4)]" },
      pink: { text: "text-pink-500", bg: "bg-pink-500", shadow: "shadow-[0_0_15px_rgba(236,72,153,0.4)]" },
      orange: { text: "text-orange-500", bg: "bg-orange-500", shadow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]" },
      teal: { text: "text-teal-500", bg: "bg-teal-500", shadow: "shadow-[0_0_15px_rgba(20,184,166,0.4)]" },
      slate: { text: "text-slate-500", bg: "bg-slate-500", shadow: "shadow-[0_0_15px_rgba(100,116,139,0.4)]" },
      stone: { text: "text-stone-500", bg: "bg-stone-500", shadow: "shadow-[0_0_15px_rgba(120,113,108,0.4)]" },
      amber: { text: "text-amber-500", bg: "bg-amber-500", shadow: "shadow-[0_0_15px_rgba(245,158,11,0.4)]" },
      fuchsia: { text: "text-fuchsia-500", bg: "bg-fuchsia-500", shadow: "shadow-[0_0_15px_rgba(217,70,239,0.4)]" },
      rose: { text: "text-rose-500", bg: "bg-rose-500", shadow: "shadow-[0_0_15px_rgba(244,63,94,0.4)]" },
      yellow: { text: "text-yellow-500", bg: "bg-yellow-500", shadow: "shadow-[0_0_15px_rgba(234,179,8,0.4)]" },
      lime: { text: "text-lime-500", bg: "bg-lime-500", shadow: "shadow-[0_0_15px_rgba(132,204,22,0.4)]" },
      green: { text: "text-green-500", bg: "bg-green-500", shadow: "shadow-[0_0_15px_rgba(34,197,94,0.4)]" },
      cyan: { text: "text-cyan-500", bg: "bg-cyan-500", shadow: "shadow-[0_0_15px_rgba(6,182,212,0.4)]" },
      violet: { text: "text-violet-500", bg: "bg-violet-500", shadow: "shadow-[0_0_15px_rgba(139,92,246,0.4)]" },
    };

    return mapping[color] || { text: "text-emerald-500", bg: "bg-emerald-500", shadow: "shadow-[0_0_15px_rgba(16,185,129,0.4)]" };
  }, [app?.fachConfig]);

  // Automatic Lesson Loading
  useEffect(() => {
    const kw = getKW(new Date());
    const day = getTodayName();
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();

    // Logic matching getCurrentHour and the configured 1–10 lesson slots.
    const currentSlot = findCurrentLessonSlot(lessonTimeSlots, minutes);
    const unitIdx = currentSlot ? currentSlot.slot - 1 : -1;

    if (unitIdx !== -1) {
      const lessonNum = unitIdx + 1;
      const lessonData = app.wochenplanung?.[kw]?.[day]?.[lessonNum];

      if (lessonData && (lessonData.fach || lessonData.inhalt)) {
        // Formulate content
        let content = "";
        if (lessonData.fach && lessonData.inhalt)
          content = `${lessonData.fach}: ${lessonData.inhalt}`;
        else if (lessonData.fach) content = lessonData.fach;
        else if (lessonData.inhalt) content = lessonData.inhalt;

        // Fill if empty or has placeholder
        if (
          !app.vertretungHinweise ||
          app.vertretungHinweise === "Anweisung hier tippen..."
        ) {
          setApp((prev) => ({ ...prev, vertretungHinweise: content }));
        }
      }
    }
  }, []); // Run once on mount

  const lessonInfoLine = useMemo(() => {
    const kw = getKW(time);
    const day = getTodayName();
    const lessonNum = currentHour ? currentHour.idx + 1 : null;

    if (!lessonNum) {
      const dayIdx = time.getDay();
      if (dayIdx === 0 || dayIdx === 6)
        return "Außerhalb Unterrichtszeit – aktuelle Stunde nicht bestimmbar";
      return "Aktuell keine aktive Unterrichtsstunde";
    }

    const lessonData = app.wochenplanung?.[kw]?.[day]?.[lessonNum];
    if (lessonData) {
      return `${lessonData.fach} • ${lessonNum}. Stunde${lessonData.thema ? ` • ${lessonData.thema}` : ""}`;
    }
    return `${lessonNum}. Stunde • Kein Eintrag im Wochenplan`;
  }, [time, app.wochenplanung, currentHour]);

  // REWARD SYSTEM STATE
  const [rewardAnimations, setRewardAnimations] = useState<
    { id: string; studentId: string; x: number; y: number }[]
  >([]);

  // Flitzi-Pause State
  const [isPauseSpinning, setIsPauseSpinning] = useState(false);
  const [selectedUebung, setSelectedUebung] = useState<
    (typeof UEBUNGEN)[0] | null
  >(null);
  const [pauseCategory, setPauseCategory] = useState<
    "POWER" | "FOCUS" | "RELAX" | "ALL"
  >("ALL");
  const [pauseDuration, setPauseDuration] = useState(60);
  const [pauseTimeLeft, setPauseTimeLeft] = useState(0);
  const [isPauseTimerRunning, setIsPauseTimerRunning] = useState(false);
  const pauseTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const beatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initPauseAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  };

  const playPauseBeat = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    const interval = 60 / 120; // 120 BPM
    const tempoInterval = setInterval(() => {
      if (!isPauseTimerRunning) {
        clearInterval(tempoInterval);
        return;
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(0.01, now + 0.1);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    }, interval * 1000);

    beatIntervalRef.current = tempoInterval;
  };

  const startPauseAction = () => {
    initPauseAudio();
    setIsPauseSpinning(true);
    setSelectedUebung(null);
    setIsPauseTimerRunning(false);
    setPauseTimeLeft(pauseDuration);

    let count = 0;
    const maxCount = 30;
    let speed = 50;

    const possibleExercises =
      pauseCategory === "ALL"
        ? UEBUNGEN
        : UEBUNGEN.filter((u) => u.kategorie === pauseCategory);

    const spin = () => {
      setSelectedUebung(
        possibleExercises[Math.floor(Math.random() * possibleExercises.length)],
      );
      playSound("beep");
      count++;

      if (count < maxCount) {
        // Slow down spinning
        if (count > 20) speed += 30;
        setTimeout(spin, speed);
      } else {
        setIsPauseSpinning(false);
        setIsPauseTimerRunning(true);
        playSound("tada");
        triggerConfetti();
        playPauseBeat();
      }
    };

    setTimeout(spin, speed);
  };

  useEffect(() => {
    if (isPauseTimerRunning && pauseTimeLeft > 0) {
      pauseTimerIntervalRef.current = setInterval(() => {
        setPauseTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (pauseTimeLeft === 0 && isPauseTimerRunning) {
      setIsPauseTimerRunning(false);
      playSound("bowl");
      if (pauseTimerIntervalRef.current)
        clearInterval(pauseTimerIntervalRef.current);
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    }

    return () => {
      if (pauseTimerIntervalRef.current)
        clearInterval(pauseTimerIntervalRef.current);
      if (beatIntervalRef.current) clearInterval(beatIntervalRef.current);
    };
  }, [isPauseTimerRunning, pauseTimeLeft]);

  const classTotalStars = useMemo(() => {
    const subject = getActiveSubject();
    let total = 0;
    app.schueler.forEach((s) => {
      total += app.mitarbeit?.[s.id]?.[subject]?.["1"] || 0;
    });
    return total;
  }, [app.schueler, app.mitarbeit, getActiveSubject]);

  const triggerRewardAnimation = (
    studentId: string,
    event: React.MouseEvent,
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setRewardAnimations((prev) => [
      ...prev,
      { id, studentId, x: event.clientX, y: event.clientY },
    ]);

    // Auto-remove animation after 1s
    setTimeout(() => {
      setRewardAnimations((prev) => prev.filter((a) => a.id !== id));
    }, 1000);

    // Play sound if enabled
    if (app.rewardSound !== false) {
      playSound("tada");
    }
  };

  const theme = app.cockpitTheme || "dark";
  const themes = {
    dark: "bg-[#0a0a09] text-white",
    lavender: "bg-[#1a1226] text-purple-50",
    earth: "bg-[#0d1a0d] text-emerald-50",
    nordic: "bg-[#0f172a] text-slate-50",
  };

  const [showSpotlight, setShowSpotlight] = useState(false);
  const [spotlightStudent, setSpotlightStudent] = useState<any>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [noRepeats, setNoRepeats] = useState(false);
  const [lottoMode, setLottoMode] = useState<"standard" | "wheel">("wheel");
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [activeWheelPool, setActiveWheelPool] = useState<any[] | null>(null);

  const spinningRef = useRef({
    isSpinning: false,
    angle: 0,
    velocity: 0,
    lastTickAngle: 0,
    animationFrameId: 0,
  });

  useEffect(() => {
    return () => {
      if (spinningRef.current.animationFrameId) {
        cancelAnimationFrame(spinningRef.current.animationFrameId);
      }
    };
  }, []);

  const spinWheel = () => {
    if (spinningRef.current.isSpinning) return;

    let pool = [...app.schueler];
    if (noRepeats && selectedStudentIds.size < app.schueler.length) {
      pool = app.schueler.filter((s) => !selectedStudentIds.has(s.id));
    } else if (noRepeats && selectedStudentIds.size >= app.schueler.length) {
      setSelectedStudentIds(new Set());
      pool = [...app.schueler];
    }

    if (pool.length === 0) pool = [...app.schueler];
    setActiveWheelPool(pool);

    spinningRef.current.isSpinning = true;
    setIsSpinning(true);
    spinningRef.current.velocity = 18 + Math.random() * 12;
    spinningRef.current.lastTickAngle = spinningRef.current.angle;

    const tickSound = () => {
      try {
        const AudioContext =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      } catch (e) {}
    };

    const updateSpin = () => {
      const state = spinningRef.current;
      if (!state.isSpinning) return;

      state.velocity *= 0.985;
      state.angle += state.velocity;
      setWheelAngle(state.angle);

      const numSlices = pool.length;
      if (numSlices > 0) {
        const sliceSize = 360 / numSlices;
        const currentSlice = Math.floor(state.angle / sliceSize);
        const lastSlice = Math.floor(state.lastTickAngle / sliceSize);
        if (currentSlice !== lastSlice) {
          tickSound();
          state.lastTickAngle = state.angle;
        }
      }

      if (state.velocity < 0.15) {
        state.isSpinning = false;
        setIsSpinning(false);
        state.velocity = 0;

        const normalizedAngle = (270 - (state.angle % 360) + 360) % 360;
        const sliceSize = 360 / pool.length;
        const winningIndex =
          Math.floor(normalizedAngle / sliceSize) % pool.length;
        const winner = pool[winningIndex];

        if (winner) {
          setSpotlightStudent(winner);
          if (noRepeats) {
            setSelectedStudentIds((prev) => new Set(prev).add(winner.id));
          }
          playSound("tada");
        }
      } else {
        state.animationFrameId = requestAnimationFrame(updateSpin);
      }
    };

    spinningRef.current.animationFrameId = requestAnimationFrame(updateSpin);
  };
  const [todoList, setTodoList] = useState<
    { id: string; text: string; done: boolean }[]
  >([]);
  const [todoInput, setTodoInput] = useState("");
  const [showCleanup, setShowCleanup] = useState(false);
  const [cleanupItems, setCleanupItems] = useState([
    "Fenster geschlossen?",
    "Tafel sauber geputzt?",
    "Boden frei von Müll?",
    "Alle Stühle oben?",
    "Licht & Beamer aus?",
    "Material versorgt?",
  ]);
  const [openSettingsId, setOpenSettingsId] = useState<string | null>(null);

  const startSpotlight = () => {
    let pool = [...app.schueler];
    if (noRepeats && selectedStudentIds.size < app.schueler.length) {
      pool = app.schueler.filter((s) => !selectedStudentIds.has(s.id));
    } else if (noRepeats && selectedStudentIds.size >= app.schueler.length) {
      // Reset if everyone was called
      setSelectedStudentIds(new Set());
    }

    if (pool.length === 0) pool = [...app.schueler];

    setShowSpotlight(true);
    let count = 0;
    const interval = setInterval(() => {
      const random = pool[Math.floor(Math.random() * pool.length)];
      setSpotlightStudent(random);
      count++;
      if (count > 15) {
        clearInterval(interval);
        if (noRepeats && random) {
          setSelectedStudentIds((prev) => new Set(prev).add(random.id));
        }
      }
    }, 100);
  };

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const outerContainerRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const [showLinksSheet, setShowLinksSheet] = useState(false);
  const [showSoundsSheet, setShowSoundsSheet] = useState(false);

  const [showZenFocus, setShowZenFocus] = useState(false);
  const [zenSoundType, setZenSoundType] = useState<
    "none" | "rain" | "wind" | "waves"
  >("none");
  const [isEditingZenTime, setIsEditingZenTime] = useState(false);
  const [zenTimeInput, setZenTimeInput] = useState("");

  const zenAudioRef = useRef<{
    ctx: AudioContext | null;
    noiseSource: AudioBufferSourceNode | null;
    lfoSource: OscillatorNode | null;
    gainNode: GainNode | null;
    filterNode: BiquadFilterNode | null;
  }>({
    ctx: null,
    noiseSource: null,
    lfoSource: null,
    gainNode: null,
    filterNode: null,
  });

  useEffect(() => {
    // Helper to stop all playing zen sounds
    const stopZenSounds = () => {
      const state = zenAudioRef.current;
      try {
        if (state.noiseSource) {
          state.noiseSource.stop();
          state.noiseSource.disconnect();
          state.noiseSource = null;
        }
        if (state.lfoSource) {
          state.lfoSource.stop();
          state.lfoSource.disconnect();
          state.lfoSource = null;
        }
        if (state.filterNode) {
          state.filterNode.disconnect();
          state.filterNode = null;
        }
        if (state.gainNode) {
          state.gainNode.disconnect();
          state.gainNode = null;
        }
        if (state.ctx) {
          state.ctx.close();
          state.ctx = null;
        }
      } catch (err) {
        console.error("Error stopping zen sound synth:", err);
      }
    };

    if (!showZenFocus || zenSoundType === "none") {
      stopZenSounds();
      return;
    }

    stopZenSounds(); // clean any existing first

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      const filterNode = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();
      let lfoSource: OscillatorNode | null = null;

      if (zenSoundType === "rain") {
        filterNode.type = "bandpass";
        filterNode.frequency.setValueAtTime(1000, now);
        filterNode.Q.setValueAtTime(1.2, now);

        noiseSource.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.08, now);

        const rLfo = ctx.createOscillator();
        const rLfoGain = ctx.createGain();
        rLfo.type = "sine";
        rLfo.frequency.setValueAtTime(0.4, now);
        rLfoGain.gain.setValueAtTime(0.02, now);

        rLfo.connect(rLfoGain);
        rLfoGain.connect(gainNode.gain);
        rLfo.start(now);
        lfoSource = rLfo;
      } else if (zenSoundType === "wind") {
        filterNode.type = "bandpass";
        filterNode.frequency.setValueAtTime(350, now);
        filterNode.Q.setValueAtTime(2.0, now);

        noiseSource.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.35, now);

        const windLfo = ctx.createOscillator();
        const windLfoGain = ctx.createGain();
        windLfo.type = "sine";
        windLfo.frequency.setValueAtTime(0.07, now);
        windLfoGain.gain.setValueAtTime(180, now);

        windLfo.connect(windLfoGain);
        windLfoGain.connect(filterNode.frequency);
        windLfo.start(now);
        lfoSource = windLfo;
      } else if (zenSoundType === "waves") {
        filterNode.type = "lowpass";
        filterNode.frequency.setValueAtTime(450, now);

        noiseSource.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(ctx.destination);

        gainNode.gain.setValueAtTime(0.12, now);

        const waveLfo = ctx.createOscillator();
        const waveLfoGain = ctx.createGain();
        waveLfo.type = "sine";
        waveLfo.frequency.setValueAtTime(0.05, now);
        waveLfoGain.gain.setValueAtTime(0.08, now);

        waveLfo.connect(waveLfoGain);
        waveLfoGain.connect(gainNode.gain);
        waveLfo.start(now);
        lfoSource = waveLfo;
      }

      noiseSource.start(now);

      zenAudioRef.current = {
        ctx,
        noiseSource,
        lfoSource,
        gainNode,
        filterNode,
      };
    } catch (err) {
      console.error("Failed to start zen sound synthesizer:", err);
    }

    return () => stopZenSounds();
  }, [showZenFocus, zenSoundType]);

  const toggleWidget = (type: string) => {
    if (type === "links") {
      setShowLinksSheet(!showLinksSheet);
      setShowSoundsSheet(false);
      return;
    }
    if (type === "sounds") {
      setShowSoundsSheet(!showSoundsSheet);
      setShowLinksSheet(false);
      return;
    }
    const current = app.boardWidgets || [];
    // Allow multiple instances for sticky notes and timers
    const allowMultiple = ["sticky"];

    if (!allowMultiple.includes(type) && current.find((w) => w.type === type)) {
      setApp((prev) => ({
        ...prev,
        boardWidgets: (prev.boardWidgets || []).filter((w) => w.type !== type),
      }));
    } else {
      const id = `${type}-${Math.random().toString(36).substr(2, 9)}`;
      const offset = (app.boardWidgets?.length || 0) * 40;
      const boardRect = boardRef.current?.getBoundingClientRect();
      const initialX = boardRect
        ? Math.min(boardRect.width - 250, 200 + offset)
        : 200 + offset;
      const initialY = boardRect
        ? Math.min(boardRect.height - 200, 150 + offset)
        : 150 + offset;

      setApp((prev) => ({
        ...prev,
        boardWidgets: [
          ...(prev.boardWidgets || []),
          { id, type, x: initialX, y: initialY, scale: 1 },
        ],
      }));
    }
  };

  const startTimer = (minutes: number) => {
    setApp((prev) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: true,
        timerEnd: Date.now() + minutes * 60 * 1000,
        timerTotal: minutes * 60,
      },
    }));
    setTimerDisplaySec(minutes * 60);
  };

  const removeWidget = (id: string) => {
    setApp((prev) => ({
      ...prev,
      boardWidgets: (prev.boardWidgets || []).filter((w) => w.id !== id),
    }));
  };

  const updateWidgetPos = (id: string, x: number, y: number) => {
    setApp((prev) => ({
      ...prev,
      boardWidgets: (prev.boardWidgets || []).map((w) =>
        w.id === id ? { ...w, x, y } : w,
      ),
    }));
  };

  const updateWidgetScale = (id: string, delta: number) => {
    setApp((prev) => ({
      ...prev,
      boardWidgets: (prev.boardWidgets || []).map((w) => {
        if (w.id === id) {
          const currentScale = w.scale || 1;
          const nextScale = Math.min(2, Math.max(0.5, currentScale + delta));
          return { ...w, scale: nextScale };
        }
        return w;
      }),
    }));
  };

  const setWidgetScale = (id: string, scale: number) => {
    setApp((prev) => ({
      ...prev,
      boardWidgets: (prev.boardWidgets || []).map((w) => {
        if (w.id === id) {
          return { ...w, scale: Math.min(2, Math.max(0.5, scale)) };
        }
        return w;
      }),
    }));
  };

  // Stopwatch State
  const [stopwatchSec, setStopwatchSec] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const swInterval = useRef<NodeJS.Timeout | null>(null);

  // Student Sidebar
  const [studentSearch, setStudentSearch] = useState("");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  // Group generation local state
  const [groupCount, setGroupCount] = useState(4);
  const [generatedGroups, setGeneratedGroups] = useState<string[][]>([]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Classroom & Time-aware Automatic Class Pet scheduler
  useEffect(() => {
    const today = new Date();
    const hours = today.getHours();
    const minutes = today.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    // 1. Evening Sleep Mode (Automatic Sleep Mode after 18:00)
    if (hours >= 18 && (app.classPet?.behaviorMode || "auto") === "auto") {
      if (petBehaviorState !== "sleeping") {
        setPetBehaviorState("sleeping");
        const defaultName = app.classPet?.name || "Spike";
        setPetReactionText(
          `Es ist nach 18:00 Uhr! Chrr-püh... Zeit für den Schönheitsschlaf von ${defaultName}... 🥱💤`,
        );
      }
      return;
    }

    // 2. Lesson Ending Notification (Less than or equal to 5 minutes left)
    const currentHourData = getCurrentHour();
    if (
      currentHourData &&
      currentHourData.timeLeft <= 5 &&
      currentHourData.timeLeft > 0
    ) {
      if (
        lastClassroomAlertRef.current.lastNotifiedHourIdx !==
        currentHourData.idx
      ) {
        lastClassroomAlertRef.current.lastNotifiedHourIdx = currentHourData.idx;

        const closingGreetings = [
          `🔔 Die ${~~currentHourData.idx + 1}. Stunde geht langsam zu Ende! Noch ca. ${currentHourData.timeLeft} Minuten... Habt ihr eure Stifte schon eingepackt? 🎒`,
          `⏳ Fast geschafft für diese Stunde! Nur noch wenige Minuten, dann gibt es eine Pause für uns alle! 🐾`,
          `✨ Die Stunde neigt sich dem Ende zu. Große Leistung heute, Klasse! 🌟`,
        ];
        setPetReactionText(
          closingGreetings[Math.floor(Math.random() * closingGreetings.length)],
        );
      }
    } else if (!currentHourData) {
      // Not in a lesson, clean/reset the notified lesson IDX so we can notify next lesson
      if (lastClassroomAlertRef.current.lastNotifiedHourIdx !== null) {
        lastClassroomAlertRef.current.lastNotifiedHourIdx = null;
      }
    }

    // 3. Pausen folgen den in Klassio eingestellten Stundenzeiten.
    const currentBreak = findCurrentLessonBreak(lessonTimeSlots, totalMinutes);
    const isLunchBreak =
      currentBreak?.afterSlot === (app.mittagspauseNachStunde || 5);

    if (currentBreak) {
      const breakTypeKey = currentBreak.start;
      if (lastClassroomAlertRef.current.lastNotifiedBreakMin !== breakTypeKey) {
        lastClassroomAlertRef.current.lastNotifiedBreakMin = breakTypeKey;

        const breakGreetings = !isLunchBreak
          ? [
              `☀️ Juhu, Pause! Packt das Pausenbrot aus und holt euch frische Luft! 🏃‍♂️🍎`,
              `🎒 Pause! Macht euch locker, spielt draußen eine Runde und atmet tief durch! 🌿✨`,
              `🎈 Pause! Ich halte hier fleißig die Stellung, während ihr draußen tobt! 👣`,
            ]
          : [
              `🍕 Mmh, Mittagszeit! Zeit für ein leckeres Mittagessen und Entspannung! Guten Appetit! 😋🥗`,
              `💤 Große Pause! Ich mache es mir auch kurz kuschlig auf dem Teppich. 🦦`,
              `🥪 Schöne Mittagspause für alle! Kraft tanken für die nächste Einheit! ☀️`,
            ];
        setPetReactionText(
          breakGreetings[Math.floor(Math.random() * breakGreetings.length)],
        );

        // Put pet in idle so it is awake or happy during breaks rather than sleeping
        setPetBehaviorState("idle");
      }
    } else {
      // Reset break notify flag outside of breaks
      if (lastClassroomAlertRef.current.lastNotifiedBreakMin !== null) {
        lastClassroomAlertRef.current.lastNotifiedBreakMin = null;
      }
    }
  }, [time, petBehaviorState, app.classPet?.name, app.classPet?.behaviorMode, app.mittagspauseNachStunde, lessonTimeSlots]);

  // Global Timer Sync - only active when ZenFocus overlay is open to avoid 1-second global re-renders in standard cockpit mode
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showZenFocus && app.boardSettings.timerRunning && app.boardSettings.timerEnd) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(
          0,
          Math.floor((app.boardSettings.timerEnd! - now) / 1000),
        );
        setTimerDisplaySec(diff);
        if (diff === 0 && app.boardSettings.timerRunning) {
          playSound("bell");
          setApp((prev) => ({
            ...prev,
            boardSettings: { ...prev.boardSettings, timerRunning: false },
          }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [
    app.boardSettings.timerRunning,
    app.boardSettings.timerEnd,
    showZenFocus,
    setApp,
  ]);

  // Stopwatch Logic
  useEffect(() => {
    if (stopwatchRunning) {
      swInterval.current = setInterval(
        () => setStopwatchSec((s) => s + 1),
        1000,
      );
    } else {
      if (swInterval.current) clearInterval(swInterval.current);
    }
    return () => {
      if (swInterval.current) clearInterval(swInterval.current);
    };
  }, [stopwatchRunning]);

  // Keyboard support for scaling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!openSettingsId) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        updateWidgetScale(openSettingsId, 0.05);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        updateWidgetScale(openSettingsId, -0.05);
      } else if (e.key === "Escape") {
        setOpenSettingsId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openSettingsId, app.boardWidgets]);

  // Reward Logic Helpers
  const addParticipation = (sid: string, event?: React.MouseEvent) => {
    const subject = getActiveSubject();
    (window as any).__lastMitarbeitPlusTime = Date.now();

    if (event) {
      triggerRewardAnimation(sid, event);
    }

    setApp((prev) => {
      const newLogs = [
        ...(prev.mitarbeitLogs || []),
        {
          id: Date.now().toString() + Math.random().toString(),
          sid,
          points: 1,
          timestamp: new Date().toISOString(),
          fach: subject,
        },
      ];

      return {
        ...prev,
        mitarbeitLogs: newLogs,
      };
    });
  };

  const removeParticipation = (sid: string) => {
    const subject = getActiveSubject();
    setApp((prev) => {
      // Find today's accumulated points for this student
      let todayPoints = 0;
      const todayStr = new Date().toISOString().split("T")[0];
      if (prev.mitarbeitLogs && prev.mitarbeitLogs.length > 0) {
        prev.mitarbeitLogs.forEach((log: any) => {
          const d = new Date(log.timestamp);
          const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (log.sid === sid && logDateStr === todayStr) {
            todayPoints += log.points;
          }
        });
      }

      if (todayPoints <= 0) return prev;

      const newLogs = [
        ...(prev.mitarbeitLogs || []),
        {
          id: Date.now().toString() + Math.random().toString(),
          sid,
          points: -1,
          timestamp: new Date().toISOString(),
          fach: subject,
        },
      ];

      return {
        ...prev,
        mitarbeitLogs: newLogs,
      };
    });
  };

  const clearAllParticipation = () => {
    setApp((prev) => {
      const todayStr = new Date().toISOString().split("T")[0];
      const filteredLogs = (prev.mitarbeitLogs || []).filter((log: any) => {
        const d = new Date(log.timestamp);
        const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return logDateStr !== todayStr;
      });
      return {
        ...prev,
        mitarbeitLogs: filteredLogs,
      };
    });
  };

  // Long click helpers for students list
  const startPress = (sid: string) => {
    if (pressTimer.current[sid]) {
      clearTimeout(pressTimer.current[sid]);
    }
    pressTimer.current[sid] = setTimeout(() => {
      setQuickCommentText("");
      setQuickCommentSaved(false);
      setActiveStudentSettingsId(sid);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 600); // 600ms for a solid holding guesture
  };

  const endPress = (sid: string) => {
    if (pressTimer.current[sid]) {
      clearTimeout(pressTimer.current[sid]);
      delete pressTimer.current[sid];
    }
  };

  const setStudentBehavior = (sid: string, stageId: string) => {
    setApp((prev) => {
      const currentStageId =
        prev.behavior_status?.[sid] || prev.behavior_default_stage_id || "1";
      const prevIdx = parseInt(currentStageId) || 1;
      const nextIdx = parseInt(stageId) || 1;
      if (nextIdx > prevIdx)
        (window as any).__lastVerhaltenDownTime = Date.now();
      else if (stageId === "1" || nextIdx === 1)
        (window as any).__lastVerhaltenSuperTime = Date.now();
      return {
        ...prev,
        behavior_status: {
          ...(prev.behavior_status || {}),
          [sid]: stageId,
        },
      };
    });
  };

  const commitAllowance = useMemo(() => {
    const todayTag = getTodayName(time) || "Montag";
    const todayKw = getKW(time);

    const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
    const dayIdx = daysDe.indexOf(todayTag);
    const wp = todayTag ? (app.wochenplanung?.[todayKw]?.[todayTag] || {}) : {};
    const sp = app.stammplan?.[todayTag] || {};

    let lastActiveHourIdx = -1;
    for (let i = 0; i < MAX_LESSON_SLOTS; i++) {
      const wpItem = wp[i];
      const spItem = sp[i + 1];
      let hasSubject = false;
      if (wpItem && (wpItem.fach || wpItem.inhalt)) {
        hasSubject = true;
      } else if (spItem) {
        if (typeof spItem === "object") {
          const itemObj = spItem as Record<string, any>;
          if (itemObj && itemObj.fach) {
            hasSubject = true;
          }
        } else if (typeof spItem === "string" && spItem) {
          hasSubject = true;
        }
      }

      if (hasSubject) {
        lastActiveHourIdx = i;
      }
    }

    if (lastActiveHourIdx === -1) {
      return {
        allowed: true,
        reason: "",
        lastHourIdx: -1,
        allowedFromTime: "",
      };
    }

    const lastHour = lessonTimeSlots.find(
      (slot) => slot.slot === lastActiveHourIdx + 1,
    );
    if (!lastHour) {
      return {
        allowed: true,
        reason: "",
        lastHourIdx: lastActiveHourIdx,
        allowedFromTime: "",
      };
    }

    const currentMinuteOfDay = time.getHours() * 60 + time.getMinutes();
    const startOfAllowedPeriod = lastHour.end - 10;
    const allowed = currentMinuteOfDay >= startOfAllowedPeriod;

    const allowedFromHour = Math.floor(startOfAllowedPeriod / 60);
    const allowedFromMin = startOfAllowedPeriod % 60;
    const allowedFromTime = `${allowedFromHour.toString().padStart(2, "0")}:${allowedFromMin.toString().padStart(2, "0")}`;

    return {
      allowed,
      reason: `Erst ab ${allowedFromTime} Uhr freigegeben (letzten 10 Min. der ${lastActiveHourIdx + 1}. Stunde)`,
      lastHourIdx: lastActiveHourIdx,
      allowedFromTime,
    };
  }, [time, app.wochenplanung, app.stammplan, lessonTimeSlots]);

  // Commit current teacher cockpit student behaviors to the persistent chronicle history (At End of Lesson)
  const commitBehaviorToHistory = useCallback((skipConfetti = false) => {
    if (!commitAllowance.allowed) {
      setSessionSuccessMessage(`⚠️ ${commitAllowance.reason}`);
      setTimeout(() => setSessionSuccessMessage(null), 4500);
      return;
    }

    const defaultStages = [
      { id: "1", label: "Exzellent", color: "#10b981", icon: "🌟" },
      { id: "2", label: "Gut", color: "#3b82f6", icon: "😊" },
      { id: "3", label: "Neutral", color: "#94a3b8", icon: "😐" },
      { id: "4", label: "Ermahnung", color: "#f59e0b", icon: "⚠️" },
      { id: "5", label: "Inakzeptabel", color: "#ef4444", icon: "🚫" },
    ];
    const defaultStageId = app.behavior_default_stage_id || "3";
    const currentSubject = getActiveSubject();
    const currentHourIdx = currentHour ? currentHour.idx + 1 : 1;

    let loggedCount = 0;

    setApp((prev) => {
      const currentStatuses = prev.behavior_status || {};
      const newEntries: any[] = [];
      const currentMitarbeit = prev.mitarbeit || {};
      const newMitarbeit = { ...currentMitarbeit };
      const todayStr = getTodayIsoDate();

      (prev.schueler || []).forEach((student: any) => {
        // Ein Kind erhält maximal einen Tagesabschluss. Re-Render, manuelles Sichern,
        // erneuter Cockpit-Aufruf und Automatik dürfen keine Duplikate erzeugen.
        if (dailyBehaviorEntries(prev.statusLog || [], student.id, todayStr).length) return;
        const stageId = currentStatuses[student.id] || defaultStageId;
        newEntries.push({
          id: Math.random().toString(36).substr(2, 9),
          schuelerId: student.id,
          datum: todayStr,
          iconId: stageId,
          timestamp: Date.now(),
          fach: currentSubject,
          stunde: currentHourIdx,
        });
        loggedCount++;

        // Calculate today's mitarbeit points for this student
        let todayPoints = 0;
        if (prev.mitarbeitLogs && prev.mitarbeitLogs.length > 0) {
          prev.mitarbeitLogs.forEach((log: any) => {
            const d = new Date(log.timestamp);
            const logDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (log.sid === student.id && logDateStr === todayStr) {
              todayPoints += log.points;
            }
          });
        }

        if (todayPoints !== 0 && currentSubject) {
          const studentMi = { ...(newMitarbeit[student.id] || {}) };
          const subjectMi = { ...(studentMi[currentSubject] || {}) };
          const currentVal = subjectMi["1"] || 0;
          subjectMi["1"] = Math.max(0, currentVal + todayPoints);
          studentMi[currentSubject] = subjectMi;
          newMitarbeit[student.id] = studentMi;
        }
      });

      // Bei erneutem Aufruf denselben unveränderten Stand belassen; auch keine
      // Mitarbeitspunkte doppelt buchen oder weitere Beobachtungen generieren.
      if (newEntries.length === 0) return prev;
      return {
        ...prev,
        statusLog: [...newEntries, ...(prev.statusLog || [])],
        behavior_status: {}, // reset to clean state
        mitarbeit: newMitarbeit,
      };
    });

    // Fire success confetti
    if (!skipConfetti) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.85 },
        colors: ["#10b981", "#3b82f6", "#f43f5e"],
      });
    }

    setSessionSuccessMessage(
      `Tagesabschluss für ${loggedCount} Kinder gesichert. Bereits gespeicherte Tageswerte bleiben unverändert.`,
    );
    setTimeout(() => {
      setSessionSuccessMessage(null);
    }, 4500);

    // After manually or automatically committing, flag today as saved to prevent duplicate auto-saves on close
    const todayStr = new Date().toISOString().split("T")[0];
    updateHasAutoSavedToday(todayStr);
  }, [
    commitAllowance,
    app.behavior_default_stage_id,
    getActiveSubject,
    currentHour,
    setApp,
    // Note: updateHasAutoSavedToday is derived from useState/localStorage, stable reference not strictly needed in deps
  ]);

  const behaviorSavedToday = hasAutoSavedToday === getTodayIsoDate() ||
    (app.schueler?.length > 0 && app.schueler.every(student =>
      dailyBehaviorEntries(app.statusLog || [], student.id, getTodayIsoDate()).length > 0
    ));

  // Automatic Behavior Auto-Save logic
  useEffect(() => {
    // Check if we already saved today (for this specific date)
    const todayStr = getTodayIsoDate();
    if (behaviorSavedToday) return;

    // We only auto-save if the last active lesson is truly over
    if (commitAllowance.allowed && commitAllowance.lastHourIdx !== -1) {
      const lastHour = lessonTimeSlots.find(
        (slot) => slot.slot === commitAllowance.lastHourIdx + 1,
      );
      if (!lastHour) return;

      const currentMinuteOfDay = time.getHours() * 60 + time.getMinutes();
      const lastHourEnd = lastHour.end;

      // Auto-save happens exactly at the end of the last hour or afterwards
      if (currentMinuteOfDay >= lastHourEnd) {
        console.log("Auto-saving behavior & mitarbeit at end of school day...");
        commitBehaviorToHistory(true);
      }
    }
  }, [time, commitAllowance, commitBehaviorToHistory, behaviorSavedToday, lessonTimeSlots]);

  const handleCloseCockpit = () => {
    // Nur dann beim Schließen sichern, wenn der Tagesabschluss bereits freigegeben ist.
    // Ein zu frühes Schließen darf den Tag niemals fälschlich als gespeichert markieren.
    if (!behaviorSavedToday && commitAllowance.allowed) {
      console.log(
        "Auto-saving behavior & mitarbeit on closing classroom cockpit...",
      );
      commitBehaviorToHistory(true);
    }
    onClose();
  };

  const cycleBehavior = (sid: string) => {
    const defaultStages = [
      { id: "1", label: "Exzellent", color: "#10b981", icon: "🌟" },
      { id: "2", label: "Gut", color: "#3b82f6", icon: "😊" },
      { id: "3", label: "Neutral", color: "#94a3b8", icon: "😐" },
      { id: "4", label: "Ermahnung", color: "#f59e0b", icon: "⚠️" },
      { id: "5", label: "Inakzeptabel", color: "#ef4444", icon: "🚫" },
    ];
    const stages = app.behavior_stages || defaultStages;
    const currentStageId =
      app.behavior_status?.[sid] ||
      app.behavior_default_stage_id ||
      stages[0].id;
    const currentIndex = stages.findIndex((s) => s.id === currentStageId);
    const nextIndex = (currentIndex + 1) % stages.length;
    const nextStageId = stages[nextIndex].id;

    // Direct state change only, log is committed only at the end of schedule/lesson unit
    setApp((prev) => ({
      ...prev,
      behavior_status: {
        ...(prev.behavior_status || {}),
        [sid]: nextStageId,
      },
    }));
  };

  const adjustBehavior = (sid: string, delta: number) => {
    setApp((prev) => ({
      ...prev,
      verhalten: {
        ...prev.verhalten,
        [sid]: (prev.verhalten[sid] || 0) + delta,
      },
    }));
  };

  const [showLinkAdder, setShowLinkAdder] = useState(false);
  const [newLink, setNewLink] = useState({
    label: "",
    url: "",
    icon: "link",
    color: "blue",
  });

  const addLink = () => {
    if (!newLink.label || !newLink.url) return;
    const id = Math.random().toString();
    setApp((prev) => ({
      ...prev,
      quickLinks: [...(prev.quickLinks || []), { id, ...newLink }],
    }));
    setNewLink({ label: "", url: "", icon: "link", color: "blue" });
    setShowLinkAdder(false);
  };

  const removeLink = (id: string) => {
    setApp((prev) => ({
      ...prev,
      quickLinks: (prev.quickLinks || []).filter((l) => l.id !== id),
    }));
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#f59e0b", "#fbbf24", "#ffffff", "#10b981", "#3b82f6"],
    });
  };

  const handlePetActionInSmartboard = (
    bonus: number,
    reaction: string,
    emoji: string,
  ) => {
    const petState = app.classPet || {
      enabled: true,
      animalType: "dino",
      name: "Spike",
      energy: 50,
      accessories: [],
      history: [],
    };
    const newEnergy = Math.min(100, (petState.energy || 0) + bonus);
    const finalReaction = reaction.replace("{name}", petState.name);

    setApp((prev) => {
      const current = prev.classPet || {
        enabled: true,
        animalType: "dino",
        name: "Spike",
        energy: 50,
        accessories: [],
        history: [],
      };
      const updated = {
        ...current,
        energy: newEnergy,
        history: [
          {
            id: Date.now().toString() + Math.random().toString(),
            action: emoji + " Smartboard",
            datum: new Date().toISOString(),
            energyDelta: bonus,
            text: finalReaction,
          },
          ...(current.history || []),
        ].slice(0, 15),
      };
      return {
        ...prev,
        classPet: updated,
      };
    });

    setPetReactionText(finalReaction);
    setPetBounceTrigger(true);
    setTimeout(() => setPetBounceTrigger(false), 800);
  };

  const triggerClassPetAI = async (
    interactionType: "click" | "chat" | "cockpit_analysis",
    userMsg?: string,
  ) => {
    const petState = app.classPet || {
      enabled: true,
      animalType: "dino",
      name: "Spike",
      energy: 50,
      accessories: [],
      history: [],
      memories: [],
    };

    setPetIsThinking(true);

    try {
      // Gather active widgets
      const activeWidgetsList = (app.boardWidgets || [])
        .filter((w) => w.type !== "classpet")
        .map((w) => {
          switch (w.type) {
            case "timer":
              return "Digitaler Timer";
            case "ampel":
              return "Ampel-Signalgeber";
            case "klassenglas":
              return "Belohnungs-Klassenglas";
            case "sticky":
              return "Zettel-Notizen";
            case "sounds":
              return "Soundboard";
            case "mindmap":
              return "Kreative Mindmap";
            case "todo":
              return "Aufgabenliste (To-Do)";
            default:
              return w.type;
          }
        });

      // Get accessories translated names
      const equippedAccs = (petState.accessories || []).map((id) => {
        const acc = AVAILABLE_ACCESSORIES.find((a) => a.id === id);
        return acc ? acc.name : id;
      });

      // Fetch active cockpit theme
      const cockpitTheme = app.cockpitTheme || "classic_light";

      // B1.5 DATENSCHUTZ: Datenminimierung & Pseudonymisierung!
      // Keine Vor- oder Nachnamen an die KI übertragen!
      // Erzeuge stattdessen neutrale temporäre Bezeichnungen (Kind A, Kind B, Kind C...).
      // Die Zuordnung zu den echten Schülern bleibt ausschließlich lokal im Browser.
      const petStudentMap = new Map<string, string>(); // Alias -> Echter Vorname
      const relevantStudents = (app.schueler || []).map((s, idx) => {
        // Berechne Buchstaben-Code: A, B, ..., Z, AA, AB ...
        let label = "";
        let n = idx;
        while (n >= 0) {
          label = String.fromCharCode(65 + (n % 26)) + label;
          n = Math.floor(n / 26) - 1;
        }
        const alias = `Kind ${label}`;
        const realName = (s.vorname || "").trim();
        if (realName) {
          petStudentMap.set(alias, realName);
        }
        return {
          vorname: alias,
        };
      });

      // Call Express AI Route via secure callServerAI
      const rawText = await callServerAI("classPetAI", {
        petName: petState.name,
        petType: petState.animalType,
        energy: petState.energy,
        accessories: equippedAccs,
        activeWidgets: activeWidgetsList,
        cockpitTheme: cockpitTheme,
        memories: petState.memories || [],
        students: relevantStudents,
        interactionType,
        userMessage: userMsg,
      });

      // Since responseText can contain markdown JSON or unparsed structures
      let parsed: any;
      try {
        let cleanText = (rawText || "").trim();
        if (cleanText.startsWith("```")) {
          cleanText = cleanText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "");
        }
        parsed = JSON.parse(cleanText);
      } catch (err) {
        console.error("Failed to parse pet AI JSON response:", rawText);
        parsed = {
          text:
            rawText ||
            `Huch! Meine Gedanken purzeln gerade durcheinander. Aber ich freue mich riesig, hier zu sein! ❤️`,
          learnedFact: `Spike war kurz abgelenkt.`,
          behavior: "idle",
          energyDelta: 5,
        };
      }

      let dialogue =
        parsed.text ||
        `Miau/Saurier-Grüße! Ich kriege gerade schlaue Gedanken!`;
      let fact = parsed.learnedFact;

      // Lokale Re-Identifizierung: Ersetze temporäre Aliase ("Kind A", "Kind B"...) durch die echten Vornamen
      petStudentMap.forEach((realName, alias) => {
        const regex = new RegExp(`\\b${alias}\\b`, "g");
        dialogue = dialogue.replace(regex, realName);
        if (fact) {
          fact = fact.replace(regex, realName);
        }
      });

      const recommendedBehavior = parsed.behavior || "idle";
      const energyDelta =
        parsed.energyDelta !== undefined ? parsed.energyDelta : 5;

      // Update local pet behavior state
      setPetBehaviorState(recommendedBehavior as any);
      setPetReactionText(dialogue);
      setPetBounceTrigger(true);
      setTimeout(() => setPetBounceTrigger(false), 800);

      // Add to experiences / memories and history log
      setApp((prev) => {
        const current = prev.classPet || {
          enabled: true,
          animalType: "dino",
          name: "Spike",
          energy: 50,
          accessories: [],
          history: [],
          memories: [],
        };

        const currentMemories = current.memories || [];
        // Unique memories capped at 10
        const updatedMemories =
          fact && !currentMemories.includes(fact)
            ? [fact, ...currentMemories].slice(0, 10)
            : currentMemories;

        const nextEnergy = Math.max(
          0,
          Math.min(100, (current.energy || 50) + energyDelta),
        );

        return {
          ...prev,
          classPet: {
            ...current,
            energy: nextEnergy,
            memories: updatedMemories,
            history: [
              {
                id: Date.now().toString() + Math.random().toString(),
                action: "🤖 KI Gedanken",
                datum: new Date().toISOString(),
                energyDelta: energyDelta,
                text: `${current.name} lernt: "${fact || "Neues Wissen"}"`,
              },
              ...(current.history || []),
            ].slice(0, 15),
          },
        };
      });
    } catch (error) {
      console.error("Failed to trigger class pet AI:", error);
      setPetReactionText(
        `*Nachdenkliches Brummen* Ich bin gerade sehr konzentriert! ❤️`,
      );
    } finally {
      setPetIsThinking(false);
    }
  };

  const [jarShaking, setJarShaking] = useState(false);

  const addJarGem = (amount: number = 1) => {
    if (amount <= 1) {
      const nextCount = app.klassenglas_count + 1;
      setApp((prev) => ({ ...prev, klassenglas_count: nextCount }));
      setJarShaking(true);
      setTimeout(() => setJarShaking(false), 500);
      playSound("beep");
      if (nextCount >= (app.klassenglas_ziel || 100)) {
        triggerConfetti();
        playSound("fanfare");
      }
      return;
    }

    // Add multiple sequentially!
    let currentAdded = 0;
    const interval = setInterval(() => {
      setApp((prev) => {
        const nextCount = prev.klassenglas_count + 1;
        setJarShaking(true);
        setTimeout(() => setJarShaking(false), 300);

        if (nextCount >= (prev.klassenglas_ziel || 100)) {
          triggerConfetti();
          playSound("fanfare");
        } else {
          playSound("beep");
        }

        return {
          ...prev,
          klassenglas_count: nextCount,
        };
      });

      currentAdded++;
      if (currentAdded >= amount) {
        clearInterval(interval);
      }
    }, 250); // elegant and beautiful delay for incremental fall
  };

  const saveNote = (sid: string) => {
    if (!tempNote.trim()) {
      setEditingNotes(null);
      return;
    }

    const student = app.schueler.find((s) => s.id === sid);
    const newNote: Note = {
      id: Date.now().toString(),
      titel: `Live Notiz: ${student?.vorname || "Schüler"}`,
      inhalt: tempNote,
      icon: "📝",
      timestamp: Date.now(),
      schuelerId: sid,
    };

    setApp((prev) => ({
      ...prev,
      notizen: [newNote, ...(prev.notizen || [])],
    }));
    setEditingNotes(null);
    setTempNote("");
  };

  const startNoteEdit = (sid: string, current: string) => {
    setEditingNotes(sid);
    setTempNote(current);
  };

  const generateGroups = (
    count?: number,
    isSize: boolean = false,
    _overrideStrategy?: string,
  ) => {
    const finalVal = count || groupCount;
    const present = getPresentStudents(app.schueler || [], app);
    const presentIds = present.map((s) => s.id);
    const genResult = generateStudentGroups(presentIds, {
      mode: isSize ? 'size' : 'count',
      value: finalVal,
    });
    const result: string[][] = genResult.groups.map((g) =>
      g.studentIds.map((id) => {
        const st = (app.schueler || []).find((s: any) => s.id === id);
        return st ? getDisplayStudentName(st, app.schueler || []) : id;
      })
    );

    setGeneratedGroups(result);
    setApp((prev: any) => ({ ...prev, lastGroups: result }));
  };

  const getBehaviorSymbol = (sid: string) => {
    const defaultStages = [
      { id: "1", label: "Super", color: "#10b981", icon: "🌟" },
      { id: "2", label: "Gut", color: "#3b82f6", icon: "❤️" },
      { id: "3", label: "OK", color: "#94a3b8", icon: "😐" },
      { id: "4", label: "Achtung", color: "#f59e0b", icon: "⚠️" },
      { id: "5", label: "Stopp", color: "#ef4444", icon: "🚫" },
    ];
    const stages = app.behavior_stages || defaultStages;
    const statusId =
      app.behavior_status?.[sid] ||
      app.behavior_default_stage_id ||
      stages[0]?.id ||
      "1";
    const stage = stages.find((s) => s.id === statusId) || stages[0];

    if (!stage)
      return {
        icon: <Circle size={18} className="text-slate-500" />,
        color: "transparent",
      };

    const renderIcon = (iconStr: string) => {
      const iconMap: Record<string, string> = {
        star: "🌟",
        heart: "❤️",
        love: "❤️",
        smile: "😊",
        minus: "😐",
        "alert-triangle": "⚠️",
        "x-circle": "🚫",
        check: "✅",
        zap: "⚡",
        gem: "💎",
        trophy: "🏆",
        target: "🎯",
        award: "🎖️",
      };

      const normalized = (iconStr || "").toLowerCase();
      const emoji = iconMap[normalized];

      if (emoji) {
        return (
          <span className="text-2xl sm:text-3xl leading-none select-none">
            {emoji}
          </span>
        );
      }

      // If not in map, check if it's already an emoji
      if (iconStr?.length > 2) {
        return <Circle size={18} className="text-white/20" />;
      }

      return (
        <span className="text-2xl sm:text-3xl leading-none select-none">
          {iconStr || "😐"}
        </span>
      );
    };

    return {
      icon: renderIcon(stage.icon),
      color: stage.color,
      label: stage.label,
    };
  };

  const getParticipationSymbol = () => {
    // Check if custom participation icon is set
    if ((app as any).mitarbeit_settings?.custom_icon) {
      return (
        <span className="text-[14px]">
          {(app as any).mitarbeit_settings.custom_icon}
        </span>
      );
    }
    const symbol = app?.settings?.verhaltenSymbol || "smiley";
    if (symbol === "diamond")
      return <Gem size={18} className="text-amber-500" />;
    if (symbol === "trophy")
      return <Trophy size={18} className="text-amber-500" />;
    if (symbol === "plus") return <Plus size={18} className="text-amber-500" />;
    return <Star size={18} className="text-amber-500" />;
  };

  const currentActiveTheme = true ? activePultTheme : fokusTheme;

  const PULT_THEMES_MAP: Record<string, any> = {
    classic_light: {
      bg: "bg-[#f8fafc]",
      box: "bg-white/95 backdrop-blur-md shadow-md",
      border: "border border-slate-200",
      accent: "text-slate-900 font-extrabold group-hover:text-slate-750",
      hover: "hover:border-slate-300 hover:bg-slate-50/50",
      activeObj: "bg-slate-100 border-slate-450 text-slate-900 shadow-sm",
      inactiveObj:
        "hover:border-slate-300 hover:bg-slate-50 text-slate-500 hover:text-slate-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(15,23,42,0.02),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-slate-800 ring-slate-800/10",
      textColor: "text-slate-900",
      secondaryText: "text-slate-500",
      isLight: true,
    },
    deep_dark: {
      bg: "bg-[#09090b]",
      box: "bg-[#18181b]/95 backdrop-blur-md shadow-xl",
      border: "border border-white/5",
      accent: "text-amber-500 font-extrabold group-hover:text-amber-400",
      hover: "hover:border-amber-500/30 hover:bg-[#27272a]/50",
      activeObj:
        "bg-[#27272a] border-amber-500/50 text-amber-400 shadow-[0_4px_15px_rgba(245,158,11,0.2)]",
      inactiveObj:
        "hover:border-neutral-800 hover:bg-zinc-900 text-neutral-400 hover:text-amber-400",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.03),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-amber-500 ring-amber-500/25",
      textColor: "text-white",
      secondaryText: "text-stone-400",
      isLight: false,
    },
    soft_sage: {
      bg: "bg-[#dcfce7]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-emerald-300",
      accent: "text-emerald-800 font-extrabold group-hover:text-emerald-900",
      hover: "hover:border-emerald-400 hover:bg-emerald-50/50",
      activeObj: "bg-emerald-100 border-emerald-400 text-emerald-900",
      inactiveObj:
        "hover:border-emerald-400 hover:bg-emerald-50 text-emerald-800/70 hover:text-emerald-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(21,128,61,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-emerald-700 ring-emerald-700/20",
      textColor: "text-[#14532d]",
      secondaryText: "text-[#166534]",
      isLight: true,
    },
    ocean_breeze: {
      bg: "bg-[#dbeafe]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-blue-300",
      accent: "text-blue-800 font-extrabold group-hover:text-blue-900",
      hover: "hover:border-blue-400 hover:bg-blue-50/50",
      activeObj: "bg-blue-100 border-blue-400 text-blue-900",
      inactiveObj:
        "hover:border-blue-400 hover:bg-blue-50 text-blue-800/70 hover:text-blue-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-blue-500 ring-blue-500/20",
      textColor: "text-[#1e3a8a]",
      secondaryText: "text-[#1e40af]",
      isLight: true,
    },
    warm_sand: {
      bg: "bg-[#ffedd5]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-orange-300",
      accent: "text-orange-900 font-extrabold group-hover:text-orange-950",
      hover: "hover:border-orange-400 hover:bg-[#fff9f0]/50",
      activeObj: "bg-orange-100 border-orange-400 text-orange-900",
      inactiveObj:
        "hover:border-orange-400 hover:bg-orange-50 text-orange-800/70 hover:text-orange-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(234,88,12,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-orange-700 ring-orange-700/20",
      textColor: "text-[#7c2d12]",
      secondaryText: "text-[#9a3412]",
      isLight: true,
    },
    lavender_field: {
      bg: "bg-[#f3e8ff]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-purple-300",
      accent: "text-purple-800 font-extrabold group-hover:text-purple-900",
      hover: "hover:border-purple-400 hover:bg-purple-50/50",
      activeObj: "bg-purple-100 border-purple-400 text-purple-900",
      inactiveObj:
        "hover:border-purple-400 hover:bg-purple-50 text-purple-800/70 hover:text-purple-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(147,51,234,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-purple-600 ring-purple-600/20",
      textColor: "text-[#581c87]",
      secondaryText: "text-[#6b21a8]",
      isLight: true,
    },
    cozy_mint: {
      bg: "bg-[#ccfbf1]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-teal-300",
      accent: "text-teal-800 font-extrabold group-hover:text-teal-900",
      hover: "hover:border-teal-400 hover:bg-teal-50/50",
      activeObj: "bg-teal-100 border-teal-400 text-teal-900",
      inactiveObj:
        "hover:border-teal-400 hover:bg-teal-50 text-teal-800/70 hover:text-teal-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(13,148,136,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-teal-600 ring-teal-600/20",
      textColor: "text-[#134e4a]",
      secondaryText: "text-[#115e59]",
      isLight: true,
    },
    sakura_dream: {
      bg: "bg-[#fce7f3]",
      box: "bg-white/90 backdrop-blur-md shadow-md",
      border: "border border-pink-300",
      accent: "text-pink-800 font-extrabold group-hover:text-pink-900",
      hover: "hover:border-pink-400 hover:bg-pink-50/50",
      activeObj: "bg-pink-100 border-pink-400 text-pink-900",
      inactiveObj:
        "hover:border-pink-400 hover:bg-pink-50 text-pink-800/70 hover:text-pink-900",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(219,39,119,0.05),transparent_40%)] pointer-events-none transition-all duration-700",
      circleBorder: "border-pink-500 ring-pink-500/20",
      textColor: "text-[#831843]",
      secondaryText: "text-[#9d174d]",
      isLight: true,
    },
    custom_theme: {
      bg: "bg-[#f3f4f6]",
      box: "bg-white/95 backdrop-blur-md border border-slate-300 shadow-md",
      border1: "border border-slate-200 shadow-sm",
      border2: "border border-slate-200 shadow-sm",
      border3: "border border-slate-200 shadow-sm",
      rounded: "rounded-3xl",
      bgDecor:
        "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.02),transparent_40%)] pointer-events-none transition-all duration-700",
      accent: "text-teal-600 font-extrabold group-hover:text-teal-700",
      hover: "hover:border-teal-200 hover:bg-teal-50/50",
      activeObj: "bg-teal-50 border-teal-400 text-teal-700",
      inactiveObj:
        "hover:border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-teal-650",
      circleBorder: "border-teal-500 ring-teal-500/20",
      textColor: "text-[#171717]",
      secondaryText: "text-[#404040]",
      isLight: true,
    },
  };

  const isCustomLight = isHexLight(customBgColor);
  const activePultThemeVars =
    activePultTheme === "custom_theme"
      ? {
          bg: "", // applied as style={{ backgroundColor: customBgColor }}
          box: isCustomLight
            ? "bg-white/95 backdrop-blur-md shadow-xl"
            : "bg-neutral-900/90 backdrop-blur-md shadow-xl",
          border: isCustomLight
            ? "border border-black/10"
            : "border border-white/10",
          accent: isCustomLight
            ? "text-amber-600 font-extrabold group-hover:text-amber-700"
            : "text-amber-400/80 font-extrabold group-hover:text-amber-300",
          hover: isCustomLight
            ? "hover:border-amber-500/25 hover:bg-stone-50/50"
            : "hover:border-amber-500/30 hover:bg-neutral-900/50",
          activeObj: isCustomLight
            ? "bg-amber-100 border-amber-500 text-amber-900"
            : "bg-amber-950/45 border-amber-500/50 text-amber-400 shadow-[0_4px_20px_rgba(245,158,11,0.25)]",
          inactiveObj: isCustomLight
            ? "hover:border-stone-200 hover:bg-stone-100 text-neutral-600 hover:text-amber-700"
            : "hover:border-stone-800 hover:bg-stone-900 text-neutral-400 hover:text-amber-400",
          bgDecor:
            "absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.04),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(245,158,11,0.02),transparent_40%)] pointer-events-none transition-all duration-700",
          circleBorder: "border-amber-400 ring-amber-400/25",
          textColor: isCustomLight ? "text-stone-950" : "text-white",
          secondaryText: isCustomLight ? "text-stone-600" : "text-stone-400",
          isLight: isCustomLight,
        }
      : PULT_THEMES_MAP[activePultTheme] || PULT_THEMES_MAP["deep_dark"];

  const currentIsLight = activePultThemeVars.isLight;

  const activeFokusThemeVarsRaw =
    FOKUS_THEMES_MAP[fokusTheme] || FOKUS_THEMES_MAP["deep_dark"];
  const activeFokusThemeVars = {
    ...activeFokusThemeVarsRaw,
    isLight: currentIsLight,
  };

  // Theme-compliant styling for the current class badge and other indicators
  const getThemeClassBadgeClasses = () => {
    switch (activePultTheme) {
      case "deep_dark":
        return "bg-[#ea580c]/10 border-[#ea580c]/30 text-[#ea580c]";
      case "classic_light":
        return "bg-slate-50 border-slate-300 text-slate-800";
      case "soft_sage":
        return "bg-emerald-50 border-emerald-250 text-emerald-800";
      case "ocean_breeze":
        return "bg-blue-50 border-blue-200 text-blue-600";
      case "warm_sand":
        return "bg-[#fdf6e2] border-amber-800/20 text-[#78350f]";
      case "lavender_field":
        return "bg-violet-50 border-violet-200 text-violet-700";
      case "cozy_mint":
        return "bg-emerald-50 border-emerald-200 text-emerald-700";
      case "sakura_dream":
        return "bg-rose-50 border-rose-250 text-rose-700";
      case "custom_theme":
      default: {
        const isLight = isCustomLight;
        return isLight
          ? "bg-slate-50 border-slate-300 text-slate-800"
          : "bg-slate-900/60 border-slate-700 text-slate-100";
      }
    }
  };

  const getThemeClassBadgeStyle = () => {
    if (activePultTheme === "custom_theme") {
      const tc = customTextColor || (isCustomLight ? "#1e293b" : "#f8fafc");
      return {
        color: tc,
        borderColor: `${tc}35`,
        backgroundColor: `${tc}10`,
      };
    }
    return undefined;
  };

  const paperType = app.boardSettings?.paperType || "blank";
  const paperSize = app.boardSettings?.paperSize || 40;

  const paperStyle = useMemo(() => {
    const isLight = activePultThemeVars.isLight;
    const lineColor = isLight
      ? "rgba(0, 0, 0, 0.25)"
      : "rgba(255, 255, 255, 0.25)";
    if (paperType === "lined") {
      return {
        backgroundImage: `repeating-linear-gradient(transparent, transparent ${paperSize - 1}px, ${lineColor} ${paperSize - 1}px, ${lineColor} ${paperSize}px)`,
        backgroundSize: `100% ${paperSize}px`,
      };
    } else if (paperType === "squared") {
      return {
        backgroundImage: `repeating-linear-gradient(transparent, transparent ${paperSize - 1}px, ${lineColor} ${paperSize - 1}px, ${lineColor} ${paperSize}px), repeating-linear-gradient(90deg, transparent, transparent ${paperSize - 1}px, ${lineColor} ${paperSize - 1}px, ${lineColor} ${paperSize}px)`,
        backgroundSize: `${paperSize}px ${paperSize}px`,
      };
    } else if (paperType === "writing-lines") {
      // 1./2. Klasse Schreiblinien with Dach, Haus/Wohnzimmer Shading, and baseline
      // S is the height of a single lane zone. 1 row consists of 3 lanes (Dach, Wohnzimmer, Keller) + a gap.
      // Total repeating slot consists of 4 line segments plus 1 gap region
      const S = paperSize / 3;
      const totalH = S * 4.5;
      const shCol = isLight
        ? "rgba(234, 179, 8, 0.12)"
        : "rgba(234, 179, 8, 0.08)";
      const cleanLineColor = isLight
        ? "rgba(0,0,0,0.22)"
        : "rgba(255,255,255,0.22)";
      const houseStroke = isLight
        ? "rgba(0,0,0,0.32)"
        : "rgba(255,255,255,0.32)";
      const houseFill = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)";

      const houseSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="${totalH}">
        <!-- Dach (Roof) -->
        <polygon points="15,2 4,${S - 1} 26,${S - 1}" fill="none" stroke="${houseStroke}" stroke-width="1.2" />
        <!-- Wohnzimmer (Living room) -->
        <rect x="5" y="${S + 1}" width="20" height="${S - 2}" fill="${shCol}" stroke="${houseStroke}" stroke-width="1.2" />
        <!-- Keller (Cellar) -->
        <path d="M 5 ${S * 2 + 1} L 5 ${S * 3 - 2} L 25 ${S * 3 - 2} L 25 ${S * 2 + 1}" fill="${houseFill}" stroke="${houseStroke}" stroke-width="1.2" stroke-dasharray="2,2" />
        <circle cx="15" cy="${S * 2.5}" r="2.5" fill="none" stroke="${houseStroke}" stroke-width="1" />
      </svg>`;

      const linesSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="${totalH}">
        <rect x="0" y="${S}" width="100" height="${S}" fill="${shCol}" />
        <line x1="0" y1="0.5" x2="100" y2="0.5" stroke="${cleanLineColor}" stroke-width="0.8" />
        <line x1="0" y1="${S}" x2="100" y2="${S}" stroke="${cleanLineColor}" stroke-width="0.6" stroke-dasharray="2,2" />
        <line x1="0" y1="${S * 2}" x2="100" y2="${S * 2}" stroke="${cleanLineColor}" stroke-width="1.8" />
        <line x1="0" y1="${S * 3}" x2="100" y2="${S * 3}" stroke="${cleanLineColor}" stroke-width="0.8" />
      </svg>`;

      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(houseSvg.trim())}"), url("data:image/svg+xml,${encodeURIComponent(linesSvg.trim())}")`,
        backgroundSize: `30px ${totalH}px, 100% ${totalH}px`,
        backgroundRepeat: `repeat-y, repeat`,
        backgroundPosition: `28px 46px, 0px 46px`,
      };
    } else if (paperType === "millimeter") {
      // Fine millimeter graph paper style with subdivided grids
      const step = paperSize / 5;
      const cleanLineColor = isLight
        ? "rgba(0,0,0,0.18)"
        : "rgba(255,255,255,0.18)";
      const escSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${paperSize}" height="${paperSize}">
        <defs>
          <pattern id="m-grid" width="${step}" height="${step}" patternUnits="userSpaceOnUse">
            <path d="M ${step} 0 L 0 0 0 ${step}" fill="none" stroke="${cleanLineColor}" stroke-width="0.4" opacity="0.35" />
          </pattern>
        </defs>
        <rect width="${paperSize}" height="${paperSize}" fill="url(#m-grid)" />
        <path d="M ${paperSize} 0 L 0 0 0 ${paperSize}" fill="none" stroke="${cleanLineColor}" stroke-width="1.5" opacity="0.8" />
      </svg>`;
      return {
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(escSvg.trim())}")`,
        backgroundSize: `${paperSize}px ${paperSize}px`,
      };
    }
    return {};
  }, [paperType, paperSize, activePultThemeVars.isLight]);

  // Barrierefreiheit
  let derivedFontClass = activeFont;
  if (activeFont === "font-dyslexic") {
    derivedFontClass = "font-dyslexic tracking-wide leading-relaxed";
  }

  // Intercept currentTheme to ensure its light/dark mode matches the new theme engine
  if (activeFokusThemeVarsRaw.isLight && currentTheme.id === "deep_dark") {
    currentTheme = UNTERRICHTSMODUS_THEMES.classic_light;
  } else if (
    !activeFokusThemeVarsRaw.isLight &&
    currentTheme.id === "classic_light"
  ) {
    currentTheme = UNTERRICHTSMODUS_THEMES.deep_dark;
  }

  const customTextColor = app.boardSettings?.boardTextColor;

  // Create a localized clone of currentTheme to not pollute the global object
  currentTheme = {
    ...currentTheme,
    colors: {
      ...currentTheme.colors,
      textPrimary:
        customTextColor ||
        (activeFokusThemeVarsRaw.isLight ? "#1c1917" : "#ffffff"),
      textSecondary: customTextColor
        ? `${customTextColor}d0`
        : currentIsLight
          ? "#78716c"
          : "#a8a29e",
      textMuted: customTextColor
        ? `${customTextColor}85`
        : currentIsLight
          ? "#a8a29e"
          : "#737373",
      surface: currentIsLight ? "#ffffff" : "#171716",
      border: currentIsLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.05)",
    },
  };

  if (app.boardSettings?.isRemoteController) {
    return (
      <MobileRemoteController
        onClose={handleCloseCockpit}
        getActiveSubject={getActiveSubject}
      />
    );
  }

  return (
    <div
      ref={outerContainerRef}
      className={`fixed inset-0 z-[1000] ${isFocusModeLightOff ? "is-light-off" : ""} ${currentIsLight ? "" : "cockpit-contrast-dark"} ${true ? (activePultTheme === "custom_theme" ? "" : activePultThemeVars.bg) : activeFokusThemeVars.bg} ${true ? (customTextColor ? "" : activePultThemeVars.textColor) : activeFokusThemeVars.textColor} ${derivedFontClass} overflow-hidden flex flex-col p-2 sm:p-3 gap-2 sm:gap-3`}
      style={{
        backgroundColor:
          activePultTheme === "custom_theme" ? customBgColor : undefined,
        color: customTextColor || undefined,
      }}
      data-theme={currentActiveTheme}
      data-style={currentActiveTheme}
    >
      {/* Background Decor */}
      <div
        className={
          true ? activePultThemeVars.bgDecor : activeFokusThemeVars.bgDecor
        }
      />

      {/* Selected Background Pattern/Image Layer */}
      {currentBgId !== "kein" && (
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            ...currentBg.style,
            ...((currentBgId === "eigenes" && customImg) || (currentBgId === "canva" && canvaBackground)
              ? {
                  backgroundImage: `url("${currentBgId === "canva" ? canvaBackground : customImg}")`,
                  backgroundSize: "contain",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }
              : {}),
            opacity: currentBgId === "canva" ? 0.82 : currentBgId === "eigenes" ? 0.35 : 0.25,
          }}
        />
      )}

      {/* Cinematic focus "Licht aus" style override */}
      <style>{`
        .is-light-off {
          background-color: #080706 !important;
          background-image: none !important;
          transition: background-color 1s ease-in-out !important;
        }
        .is-light-off .dim-in-focus {
          opacity: 0.04 !important;
          filter: blur(1.5px) grayscale(80%);
          pointer-events: none !important;
          transition: all 1s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
      `}</style>

      {/* Scrim for header readability */}
      <div
        className={`absolute top-0 left-0 right-0 h-40 pointer-events-none z-[490] dim-in-focus transition-all duration-700 ${currentIsLight ? "bg-gradient-to-b from-black/5 to-transparent" : "bg-gradient-to-b from-black/40 to-transparent"}`}
      />
      {/* HEADER ROOM */}
      <header
        className={`w-full px-3 sm:px-4 min-h-[50px] py-1.5 flex justify-between items-center relative z-[500] shrink-0 border shadow-sm backdrop-blur-xl rounded-xl gap-2 overflow-visible ${currentIsLight ? "bg-white/90 border-slate-200" : "bg-black/60 border-white/10"} dim-in-focus`}
      >
        {/* Left: Branding & Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-initial shrink-0 min-w-0">
          <button
            onClick={handleCloseCockpit}
            className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer border shadow-md hover:scale-105 active:scale-95 ${currentIsLight ? "bg-black/5 border-black/10 text-slate-700 hover:bg-black/10 hover:text-black" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/15 hover:text-white"}`}
            title="Lehrercockpit schließen · Zurück zu Heute"
            aria-label="Lehrercockpit schließen · Zurück zu Heute"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
          </button>

          <div className="flex flex-col justify-center">
            <div
              className={`text-xs sm:text-sm font-black tracking-tight flex items-center gap-1 sm:gap-1.5 ${currentIsLight ? "text-slate-950" : "text-white"}`}
            >
              LEHRERCOCKPIT
              {cockpitClassLabel && (
                <span
                  className={`px-1 sm:px-1.5 py-0.5 border rounded-md text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-sm transition-all duration-300 ${getThemeClassBadgeClasses()}`}
                  style={getThemeClassBadgeStyle()}
                >
                  {cockpitClassLabel}
                </span>
              )}
            </div>
            {/* 1. Auto-Save & Manual-Commit status indicator */}
            <div className="flex items-center gap-1 mt-0.5 select-none">
              <span className="relative flex h-1.5 w-1.5">
                {behaviorSavedToday ? (
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]" />
                ) : (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </>
                )}
              </span>
              <span className={`text-[7.5px] font-black uppercase tracking-wider ${behaviorSavedToday ? "text-emerald-500" : "text-amber-500"}`}>
                {behaviorSavedToday ? "Heute gesichert" : "Speichert beim Beenden"}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Lesson Progress & Selector */}
        {(() => {
          const subjectColors = getSubjectColorClasses(getActiveSubject());
          return (
            <div className="hidden md:flex flex-col items-center flex-shrink-0 w-64 xl:w-80 max-w-[32%] px-1.5">
              <div className="w-full flex justify-between items-center mb-0.5 px-0.5">
                {/* Subject name */}
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-xs sm:text-xs xl:text-sm font-extrabold uppercase tracking-wider truncate ${
                      currentIsLight 
                        ? "text-slate-900" 
                        : "text-white/95"
                    }`}
                  >
                    {getActiveSubject() || "Unterricht"}
                  </span>
                </div>

                {/* Percentage */}
                {currentHour ? (
                  <span
                    className={`text-xs sm:text-xs xl:text-sm font-black tabular-nums shrink-0 ${subjectColors.text}`}
                  >
                    {Math.round(currentHour.progress)}%
                  </span>
                ) : null}
              </div>

              {/* Progress Bar */}
              {currentHour && (
                <div className="w-full">
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden p-[1px] border ${currentIsLight ? "bg-black/10 border-black/5" : "bg-black/40 border-white/5"}`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${subjectColors.shadow} ${subjectColors.bg}`}
                      style={{ width: `${currentHour.progress}%` }}
                    />
                  </div>
                  {/* Day Hours Indicator */}
                  <div className="flex gap-1 justify-center mt-1.5 w-full select-none">
                    {lessonTimeSlots.map(({ slot }) => {
                      const hIdx = slot - 1;
                      const isPast = hIdx < currentHour.idx;
                      const isCurrent = hIdx === currentHour.idx;
                      return (
                        <div
                          key={slot}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            isCurrent
                              ? `w-4 ${subjectColors.bg}`
                              : isPast
                                ? 'w-2 bg-emerald-500/60'
                                : 'w-1 bg-black/10 dark:bg-white/10'
                          }`}
                          title={`${slot}. Stunde`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Right: Actions, Clock & Controls */}
        <div className="flex flex-nowrap items-center justify-end gap-1 sm:gap-2 xl:gap-2.5 flex-1 min-w-0 py-1">
          {/* Action: Stunde abschließen */}
          {!(
            app.boardSettings?.splitSmartboardMode &&
            !app.boardSettings?.isRemoteController
          ) &&
            currentHour &&
            (() => {
              const pendingCount = Object.keys(
                app.behavior_status || {},
              ).filter(
                (sid) =>
                  (app.behavior_status || {})[sid] !==
                  (app.behavior_default_stage_id || "3"),
              ).length;
              const todayStr = new Date().toISOString().split("T")[0];
              const alreadySavedToday = behaviorSavedToday;
              const isButtonDisabled =
                !commitAllowance.allowed || alreadySavedToday;

              return (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => commitBehaviorToHistory()}
                    disabled={isButtonDisabled}
                    className={`relative group py-1 px-2 sm:py-1.5 sm:px-2.5 h-8 sm:h-8.5 rounded-lg border font-black text-[9px] uppercase tracking-wider flex items-center gap-2 transition-all duration-300 shadow-md ${
                      isButtonDisabled
                        ? currentIsLight
                          ? "opacity-30 cursor-not-allowed bg-black/5 border-black/5 text-slate-500"
                          : "opacity-30 cursor-not-allowed bg-black/20 border-white/5 text-white/40"
                        : pendingCount > 0
                          ? "bg-amber-500 border-amber-400 text-black hover:bg-amber-400 hover:scale-[1.02] active:scale-95 cursor-pointer shadow-lg shadow-amber-500/30"
                          : currentIsLight
                            ? "bg-black/5 hover:bg-black/10 border-black/10 text-slate-700 active:scale-95 cursor-pointer"
                            : "bg-white/10 hover:bg-white/20 border-white/10 text-white active:scale-95 cursor-pointer"
                    }`}
                  >
                    {isButtonDisabled ? (
                      <Lock size={11} className="opacity-50" />
                    ) : (
                      <div className="relative">
                        <CheckCircle2
                          size={13}
                          className={
                            pendingCount > 0 ? "text-black" : "text-emerald-400"
                          }
                        />
                        {pendingCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border-2 border-amber-500 animate-pulse" />
                        )}
                      </div>
                    )}
                    <span className="hidden xl:inline">
                      {alreadySavedToday ? "Gespeichert" : "Tag sichern"}
                    </span>
                    {pendingCount > 0 && !alreadySavedToday && (
                      <span className="bg-black/20 px-1 py-0.5 rounded-lg text-[8px] font-black">
                        {pendingCount}
                      </span>
                    )}
                  </button>

                  {isButtonDisabled && (
                    <div
                      className={`flex flex-col items-start leading-none shrink-0 ${currentIsLight ? "text-slate-500" : "text-white/30"}`}
                    >
                      <span className="text-[7px] font-black uppercase tracking-tighter mb-0.5 opacity-50">
                        Verfügbar
                      </span>
                      <span
                        className={`text-[9px] font-black tabular-nums ${currentIsLight ? "text-slate-800" : "text-white/60"}`}
                      >
                        {alreadySavedToday
                          ? "Morgen wieder"
                          : `ab ${commitAllowance.allowedFromTime}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}

          {!(
            app.boardSettings?.splitSmartboardMode &&
            !app.boardSettings?.isRemoteController
          ) && (
            <div
              className={`w-px h-6 shrink-0 hidden sm:block ${currentIsLight ? "bg-black/10" : "bg-white/10"}`}
            />
          )}

          {/* Time & Design Section */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 flex-nowrap shrink-0">
            {/* Clock */}
            <div className="flex flex-col items-end shrink-0 select-none">
              <span
                className={`text-sm sm:text-base xl:text-lg font-black font-mono tracking-tight tabular-nums leading-none ${currentIsLight ? "text-slate-950" : "text-white"}`}
              >
                {time.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span
                className={`text-[7px] sm:text-[7.5px] xl:text-[8px] font-black uppercase tracking-[0.15em] mt-0.5 ${currentIsLight ? "text-slate-500" : "text-white/40"}`}
              >
                {time
                  .toLocaleDateString("de-DE", { weekday: "short" })
                  .toUpperCase()}{" "}
                {time.toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            </div>

            <div
              className={`w-px h-6 shrink-0 hidden sm:block ${currentIsLight ? "bg-black/10" : "bg-white/10"}`}
            />

            {isSmartboardOnly && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setApp((p) => ({
                      ...p,
                      boardSettings: {
                        ...p.boardSettings,
                        splitSmartboardMode: false,
                      },
                    }))
                  }
                  className="h-8 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer shadow-md active:scale-95"
                  title="Smartboard-Ansicht beenden und zur Lehrkraft-Cockpit zurückkehren"
                >
                  <Monitor size={12} strokeWidth={2.5} />
                  <span>Smartboard verlassen</span>
                </button>
              </div>
            )}

            {/* Quick Palette Indicator Selector */}
            <div className="flex items-center gap-1 sm:gap-2 justify-end flex-nowrap">
                          </div>
          </div>
        </div>
      </header>
      {false ? (
        <div className="flex-1 flex flex-col w-full min-h-0 relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl"></div>
      ) : (
        <div className="flex-1 flex flex-col gap-2 sm:gap-3 min-h-0 relative z-10 mb-2 overflow-hidden">
          <div className="flex-1 flex gap-4 min-h-0 overflow-hidden relative">
            {false ? (
              // SMARTBOARD EXCLUSIVE GRID
              <div className="flex-1 flex flex-col gap-6 bg-slate-950/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl relative overflow-hidden text-left select-none">
                {/* Background decorative ambient lights */}
                <div className="absolute top-0 left-1/4 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none" />

                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 relative z-10 shrink-0">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 mt-1">
                      <div className="h-6 px-2.5 bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center">
                        📺 Smartboard-Modus
                      </div>
                      {app.boardSettings?.activeSyncCode && (
                        <div className="h-6 px-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg flex items-center justify-center gap-1.5">
                          <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
                          Live-Verbindung ({app.boardSettings.activeSyncCode})
                        </div>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      📍 Wer ist heute da?
                    </h2>
                    <p className="text-[11px] text-stone-400 font-medium">
                      Trage deine Anwesenheit ein oder sieh dir deinen heutigen
                      Check-In Status an.
                    </p>
                  </div>

                  {/* Realtime stats card */}
                  <div className="flex gap-4 bg-zinc-900/40 border border-white/5 rounded-2xl p-4 shrink-0">
                    <div className="text-center min-w-[50px]">
                      <div className="text-emerald-400 text-lg font-black leading-none">
                        {
                          (app.schueler || []).filter((s) => {
                            const todayStr = new Date()
                              .toISOString()
                              .split("T")[0];
                            const dayAtt =
                              app.anwesenheit[s.id]?.[todayStr] || {};
                            return (
                              !Object.values(dayAtt).includes("e") &&
                              !Object.values(dayAtt).includes("u")
                            );
                          }).length
                        }
                      </div>
                      <div className="text-[8px] text-stone-400 font-black uppercase tracking-wide mt-1 mt-1.5">
                        Da
                      </div>
                    </div>
                    <div className="w-[1px] bg-white/10" />
                    <div className="text-center min-w-[50px]">
                      <div className="text-amber-400 text-lg font-black leading-none">
                        {
                          (app.schueler || []).filter((s) => {
                            const todayStr = new Date()
                              .toISOString()
                              .split("T")[0];
                            const dayAtt =
                              app.anwesenheit[s.id]?.[todayStr] || {};
                            return Object.values(dayAtt).includes("e");
                          }).length
                        }
                      </div>
                      <div className="text-[8px] text-stone-400 font-black uppercase tracking-wide mt-1.5">
                        Entschuldigt
                      </div>
                    </div>
                    <div className="w-[1px] bg-white/10" />
                    <div className="text-center min-w-[50px]">
                      <div className="text-rose-400 text-lg font-black leading-none">
                        {
                          (app.schueler || []).filter((s) => {
                            const todayStr = new Date()
                              .toISOString()
                              .split("T")[0];
                            const dayAtt =
                              app.anwesenheit[s.id]?.[todayStr] || {};
                            return Object.values(dayAtt).includes("u");
                          }).length
                        }
                      </div>
                      <div className="text-[8px] text-stone-400 font-black uppercase tracking-wide mt-1.5">
                        Fehlend
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big cards grid */}
                <div className="flex-1 overflow-y-auto no-scrollbar relative z-10 py-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[...(app.schueler || [])]
                      .sort((a, b) =>
                        a.nachname.localeCompare(b.nachname, "de"),
                      )
                      .map((student) => {
                        const todayStr = new Date().toISOString().split("T")[0];
                        const dayAtt =
                          app.anwesenheit[student.id]?.[todayStr] || {};
                        const hasExcused = Object.values(dayAtt).includes("e");
                        const hasUnexcused =
                          Object.values(dayAtt).includes("u");
                        const delay =
                          app.anwesenheitDetail?.[student.id]?.[todayStr]
                            ?.verspaetung || 0;

                        let statusText = "Anwesend";
                        let statusColor = currentIsLight
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
                        let glowBorder = currentIsLight
                          ? "border-slate-200 bg-white/80 shadow-xs"
                          : "border-white/5 bg-zinc-900/30";

                        if (hasExcused) {
                          statusText = "Entschuldigt";
                          statusColor = currentIsLight
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-amber-500/15 text-amber-500 border-amber-500/20";
                          glowBorder = currentIsLight
                            ? "border-amber-250 bg-amber-50/40 shadow-xs"
                            : "border-amber-500/20 bg-amber-500/5";
                        } else if (hasUnexcused) {
                          statusText = "Fehlend";
                          statusColor = currentIsLight
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/20";
                          glowBorder = currentIsLight
                            ? "border-rose-250 bg-rose-50/40 shadow-xs"
                            : "border-rose-500/20 bg-rose-500/5";
                        } else if (delay > 0) {
                          statusText = `Verspätet (${delay}m)`;
                          statusColor = currentIsLight
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-orange-500/15 text-orange-400 border-orange-500/20";
                          glowBorder = currentIsLight
                            ? "border-orange-250 bg-orange-50/40 shadow-xs"
                            : "border-orange-500/25 bg-orange-500/5";
                        }

                        const nameStyle =
                          app.boardSettings?.studentNameStyle ||
                          "vorname_nachname";
                        let displayName = `${student.vorname} ${student.nachname}`;
                        let hideEmojiBox = false;

                        if (nameStyle === "nachname_vorname")
                          displayName = `${student.nachname} ${student.vorname}`;
                        else if (nameStyle === "nur_vorname") {
                          displayName = student.vorname;
                          hideEmojiBox = true;
                        } else if (nameStyle === "nur_nachname") {
                          displayName = student.nachname;
                          hideEmojiBox = true;
                        } else if (nameStyle === "vorname_initiale")
                          displayName = `${student.vorname} ${student.nachname.charAt(0)}.`;
                        else if (nameStyle === "nur_initialen") {
                          displayName = `${student.vorname.charAt(0)}.${student.nachname.charAt(0)}.`;
                          hideEmojiBox = true;
                        } else if (nameStyle === "nur_emoji")
                          displayName = student.emoji || "🧑‍🎓";
                        else if (nameStyle === "emoji_vorname")
                          displayName = `${student.emoji || "🧑‍🎓"} ${student.vorname}`;

                        const isBirthday =
                          (
                            app.unterrichtsmodus_geburtstagskinder || []
                          ).includes(student.id) ||
                          checkIsAutoBirthday(student.geburtstag);

                        return (
                          <div
                            key={student.id}
                            className={`flex flex-col items-center justify-between p-5 rounded-3xl border ${glowBorder} transition-all duration-300 relative overflow-hidden text-center h-[170px] shadow-lg`}
                          >
                            <div className="absolute top-3.5 right-3.5 flex h-2 w-2">
                              <span
                                className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${hasExcused ? "bg-amber-400" : hasUnexcused ? "bg-rose-400" : "bg-emerald-400"}`}
                              ></span>
                              <span
                                className={`relative inline-flex rounded-full h-2 w-2 ${hasExcused ? "bg-amber-500" : hasUnexcused ? "bg-rose-500" : "bg-emerald-500"}`}
                              ></span>
                            </div>

                            {!hideEmojiBox && (
                              <div
                                className={`mt-2 w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md border ${
                                  currentIsLight
                                    ? "bg-slate-100 border-slate-200"
                                    : "bg-white/5 border-white/5"
                                }`}
                              >
                                {isBirthday ? (
                                  <span className="animate-bounce">🎁</span>
                                ) : (
                                  student.emoji || "🧑‍🎓"
                                )}
                              </div>
                            )}

                            <div
                              className={`w-full space-y-2 mt-1 shrink-0 ${hideEmojiBox ? "mt-auto mb-6" : ""}`}
                            >
                              <div
                                className={`font-sans font-black text-[13px] line-clamp-1 tracking-tight leading-tight ${isBirthday ? "bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-amber-500 to-emerald-500 drop-shadow-[0_0_12px_rgba(236,72,153,0.3)] animate-pulse" : ""}`}
                                style={
                                  !isBirthday
                                    ? {
                                        color:
                                          customTextColor ||
                                          (currentIsLight
                                            ? "#0f172a"
                                            : "#f8fafc"),
                                      }
                                    : {}
                                }
                              >
                                {displayName}
                              </div>
                              <div
                                className={`py-1 px-3 border rounded-xl text-[8px] font-black uppercase tracking-wider ${statusColor} inline-block mx-auto`}
                              >
                                {statusText}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* LEFT COLUMN: CONTROL CENTER */}
                <div className="flex-1 flex gap-4 min-h-0 relative">
                  {cockpitView === "seating" ? (
                    <div
                      className={`flex-1 flex flex-col ${activePultThemeVars.box || "bg-black/20"} rounded-2xl border ${activePultThemeVars.border || "border-white/10"} overflow-hidden shadow-2xl relative`}
                    >
                      <div className="absolute top-4 right-4 z-50">
                        <button
                          onClick={() => setCockpitView("cockpit")}
                          className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl"
                        >
                          <X size={14} /> Cockpit
                        </button>
                      </div>
                      <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
                        <React.Suspense
                          fallback={
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                            </div>
                          }
                        >
                          <SeatingPlan />
                        </React.Suspense>
                      </div>
                    </div>
                  ) : cockpitView === "gradebook" ? (
                    <div
                      className={`flex-1 flex flex-col ${activePultThemeVars.box || "bg-black/20"} rounded-2xl border ${activePultThemeVars.border || "border-white/10"} overflow-hidden shadow-2xl relative`}
                    >
                      <div className="absolute top-4 right-4 z-50">
                        <button
                          onClick={() => setCockpitView("cockpit")}
                          className="p-2.5 bg-black/40 hover:bg-black/60 text-white rounded-xl backdrop-blur-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-xl"
                        >
                          <X size={14} /> Cockpit
                        </button>
                      </div>
                      <div className="flex-1 p-6 flex flex-col overflow-auto">
                        <React.Suspense
                          fallback={
                            <div className="flex-1 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
                            </div>
                          }
                        >
                          <Gradebook />
                        </React.Suspense>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col min-h-0 h-full w-full relative">
                      {/* Board Utility Toolbar Header (outside stage, prevents overlapping with stage active widgets or drawing board) */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl no-print shrink-0 bg-white/90 dark:bg-zinc-900/80 border border-slate-200 dark:border-white/10 shadow-sm relative z-50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isLayoutLocked ? "bg-amber-500" : "bg-emerald-500"} animate-pulse`} />
                          <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-neutral-300">
                            Unterrichtsfläche
                          </h3>
                          {isLayoutLocked && (
                            <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Fixiert
                            </span>
                          )}
                        </div>

                        {/* Top Toolbar Action Buttons (aligned on the right) */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Add Widget Button */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setIsAddWidgetMenuOpen(!isAddWidgetMenuOpen)
                              }
                              className="min-h-11 px-4 rounded-xl font-semibold text-sm flex items-center gap-1.5 transition-all shadow-sm cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white"
                              title="Widget auf die gemeinsame Fläche legen"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                              <span>Widget hinzufügen</span>
                            </button>

                            {isAddWidgetMenuOpen && (
                              <div
                                className={`fixed left-4 top-[8.5rem] w-[880px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-9.5rem)] overflow-y-auto overscroll-contain rounded-2xl border p-3.5 shadow-2xl flex flex-col gap-3 z-[1000] ${
                                  currentIsLight
                                    ? "bg-white border-slate-100 animate-in fade-in slide-in-from-top-3 duration-200"
                                    : "bg-zinc-900 border-white/10 animate-in fade-in slide-in-from-top-3 duration-200"
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row gap-2 justify-between items-center px-1">
                                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 self-start sm:self-auto">
                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    Widget auswählen
                                  </div>
                                  {/* Responsive search bar to quickly find widgets */}
                                  <div className="relative w-full sm:w-80 shrink-0">
                                    <input
                                      type="text"
                                      aria-label="Widget suchen" placeholder="Was brauchst du? Zum Beispiel Timer …"
                                      value={widgetSearch}
                                      onChange={(e) =>
                                        setWidgetSearch(e.target.value)
                                      }
                                      autoFocus
                                      className={`w-full px-3 py-3 pr-8 text-sm rounded-lg border outline-none font-bold transition-all placeholder:text-slate-400 ${
                                        currentIsLight
                                          ? "bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-400"
                                          : "bg-white/5 border-white/10 text-white focus:border-indigo-500"
                                      }`}
                                    />
                                    {widgetSearch ? (
                                      <button
                                        type="button"
                                        onClick={() => setWidgetSearch("")}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 text-[8px] font-bold"
                                      >
                                        ✕
                                      </button>
                                    ) : (
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                                        🔍
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button type="button" onClick={() => setIsAddWidgetMenuOpen(false)} className="self-end min-h-11 px-4 rounded-lg border text-sm font-semibold">Auswahl schließen</button>
                                <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3 text-slate-900"
                                  aria-label="Widget-Einstellungen im Menü Widget hinzufügen">
                                  <button type="button" onClick={() => setIsWidgetConfigurationOpen(open => !open)}
                                    aria-expanded={isWidgetConfigurationOpen}
                                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-white px-3 text-left text-sm font-black">
                                    <span>⚙️ Widget-Einstellungen</span>
                                    <span aria-hidden="true">{isWidgetConfigurationOpen ? "▴" : "▾"}</span>
                                  </button>
                                  {isWidgetConfigurationOpen && (
                                    <div className="mt-3 space-y-3" role="group" aria-label="Einstellungen für ein Widget auswählen">
                                      <label className="block text-sm font-semibold">
                                        Widget auswählen
                                        <select aria-label="Widget für Einstellungen" value={selectedWidgetConfiguration}
                                          onChange={event => setSelectedWidgetConfiguration(event.target.value as "kidattendance" | "groups")}
                                          className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                                          <option value="kidattendance">🖐️ Ich bin da!</option>
                                          <option value="groups">👥 Gruppen bilden</option>
                                        </select>
                                      </label>
                                      {(() => {
                                        const configured = cockpitWidgets.find(widget => widget.type === selectedWidgetConfiguration);
                                        if (!configured) return <p role="status" className="text-sm">Füge dieses Widget zuerst hinzu, um seine Einstellungen zu speichern.</p>;
                                        const saveSetting = (key: string, value: string) =>
                                          handleUpdateWidgetPos(configured.id, { settings: { ...(configured.settings || {}), [key]: value } });
                                        return selectedWidgetConfiguration === "kidattendance" ? (
                                          <fieldset className="space-y-2">
                                            <legend className="text-sm font-black">Ich bin da! · Erfassung</legend>
                                            {([
                                              ["all", "A · Alle Kinder (Standard)", "Alle Namen gleichzeitig anzeigen. Kinder checken sich selbst ein und können freiwillig ihr Befinden angeben."],
                                              ["individual", "B · Nacheinander", "Name auswählen, Check-in bestätigen und danach freiwillig das Befinden angeben."],
                                              ["teacher", "C · Lehrkraft erfasst", "Die Lehrkraft erfasst die Anwesenheit. Anwesende Kinder können danach freiwillig ihr Befinden angeben."],
                                            ] as const).map(([mode, label, detail]) => (
                                              <label key={mode} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                                <input type="radio" name="cockpit-checkin-mode" value={mode}
                                                  checked={getCheckInMode(configured.settings) === mode}
                                                  onChange={() => saveSetting("checkInMode", mode)}
                                                  className="mt-1 h-5 w-5 shrink-0" />
                                                <span><strong className="block text-sm">{label}</strong>
                                                  <span className="block text-xs text-slate-600">{detail}</span></span>
                                              </label>
                                            ))}
                                          </fieldset>
                                        ) : (
                                          <fieldset className="space-y-2">
                                            <legend className="text-sm font-black">Gruppen bilden · Wer wird eingeteilt?</legend>
                                            {([
                                              ["present", "Heute anwesende Kinder", "Die bestehende Auswahl der anwesenden Kinder verwenden."],
                                              ["all", "Alle Kinder der Klasse", "Alle Kinder der aktiven Klasse berücksichtigen, auch bei Abwesenheit."],
                                            ] as const).map(([scope, label, detail]) => (
                                              <label key={scope} className="flex min-h-11 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                                                <input type="radio" name="cockpit-group-scope" value={scope}
                                                  checked={(configured.settings?.studentScope === "all" ? "all" : "present") === scope}
                                                  onChange={() => saveSetting("studentScope", scope)}
                                                  className="mt-1 h-5 w-5 shrink-0" />
                                                <span><strong className="block text-sm">{label}</strong>
                                                  <span className="block text-xs text-slate-600">{detail}</span></span>
                                              </label>
                                            ))}
                                            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3"
                                              role="group" aria-label="Gruppengröße oder Gruppenanzahl einstellen">
                                              <h4 className="text-sm font-black">Gruppenaufteilung</h4>
                                              <div className="grid grid-cols-2 gap-2">
                                                {([
                                                  ["size", "Kinder pro Gruppe"],
                                                  ["count", "Anzahl Gruppen"],
                                                ] as const).map(([mode, label]) => (
                                                  <label key={mode} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-2 text-xs font-bold">
                                                    <input type="radio" name="cockpit-group-mode" value={mode}
                                                      checked={(configured.settings?.mode === "count" ? "count" : "size") === mode}
                                                      onChange={() => handleUpdateWidgetPos(configured.id, {
                                                        settings: { ...(configured.settings || {}), mode, targetValue: 4 },
                                                      })}
                                                      className="h-5 w-5 shrink-0" />{label}
                                                  </label>
                                                ))}
                                              </div>
                                              <div className="flex flex-wrap gap-2">
                                                {(configured.settings?.mode === "count" ? [2, 3, 4, 5, 6] : [2, 3, 4, 5]).map(value => (
                                                  <button key={value} type="button"
                                                    aria-pressed={(typeof configured.settings?.targetValue === "number" ? configured.settings.targetValue : 4) === value}
                                                    onClick={() => handleUpdateWidgetPos(configured.id, {
                                                      settings: { ...(configured.settings || {}), mode: configured.settings?.mode === "count" ? "count" : "size", targetValue: value },
                                                    })}
                                                    className={`min-h-11 min-w-11 rounded-lg border px-3 text-sm font-bold ${
                                                      (typeof configured.settings?.targetValue === "number" ? configured.settings.targetValue : 4) === value
                                                        ? "border-indigo-500 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-900"
                                                    }`}>
                                                    {value}{configured.settings?.mode === "count" ? " Gr." : "er"}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                            <p className="text-xs text-slate-600">Die Auswahl gilt bei der nächsten Einteilung. Bestehende Gruppen werden nicht ungefragt neu gemischt.</p>
                                            {!configured.visible && (
                                              <button type="button" onClick={() => handleOpenWidgetInCockpitLayout("groups")}
                                                className="min-h-11 w-full rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white">
                                                Gruppen-Widget öffnen, um die weiteren Optionen zu bearbeiten
                                              </button>
                                            )}
                                            {configured.visible && (
                                              <div id="cockpit-groups-settings-host" className="w-full" aria-label="Weitere Gruppen-Einstellungen: Kinder pausieren, Paar-Wünsche, Namen" />
                                            )}
                                          </fieldset>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </section>
                                {/* Category Switcher Tab Bar */}
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                                  {[
                                    { id: "core", label: "19 Kernwidgets" },
                                    { id: "categories", label: "Weitere Widgets" },
                                    { id: "favorites", label: "★ Favoriten" },
                                    { id: "struct", label: "🗂️ Ablauf & Organisation" },
                                    {
                                      id: "interactivity",
                                      label: "👥 Klasse & Interaktion",
                                    },
                                    { id: "mathe", label: "🔢 Mathematik" },
                                    { id: "deutsch", label: "📖 Deutsch" },
                                    {
                                      id: "sachunterricht",
                                      label: "🌍 Sachunterricht",
                                    },
                                    { id: "tools", label: "🛠️ Werkzeuge" },
                                    {
                                      id: "mindfulness",
                                      label: "🍃 Spiele & Fokus",
                                    },
                                  ].map((cat) => {
                                    const allAvailableWidgets = [
                                      { type: "timeline", category: "struct" },
                                      { type: "clock", category: "struct" },
                                      { type: "timer", category: "struct" },
                                      { type: "stopwatch", category: "struct" },
                                      {
                                        type: "trafficlight",
                                        category: "struct",
                                      },
                                      { type: "todo", category: "struct" },
                                      { type: "dienste", category: "struct" },
                                      { type: "links", category: "struct" },
                                      { type: "phases", category: "struct" },
                                      { type: "wordclock", category: "struct" },

                                      {
                                        type: "randomname",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "groups",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "wheel",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "kidattendance",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "scoreboard",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "challenge",
                                        category: "interactivity",
                                      },

                                      { type: "zahlenraum", category: "mathe" },
                                      { type: "kopfrechnen", category: "mathe" },
                                      { type: "fractionvisualizer", category: "mathe" },
                                      {
                                        type: "mathbalancer",
                                        category: "mathe",
                                      },
                                      { type: "moneycalc", category: "mathe" },
                                      {
                                        type: "mathpyramid",
                                        category: "mathe",
                                      },
                                      {
                                        type: "clockpuzzle",
                                        category: "mathe",
                                      },
                                      { type: "geometry", category: "mathe" },
                                      {
                                        type: "angledetective",
                                        category: "mathe",
                                      },
                                      {
                                        type: "estimationjar",
                                        category: "mathe",
                                      },

                                      {
                                        type: "vocabulary",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wortsatzwerkstatt",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordchain",
                                        category: "deutsch",
                                      },
                                      { type: "wordgrid", category: "deutsch" },
                                      {
                                        type: "dictionary",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordscramble",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "secretcode",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "storyemojis",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "bodyparts",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "compass",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "weekdays",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "trafficquiz",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "watercycle",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "constellation",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "planetarium",
                                        category: "sachunterricht",
                                      },

                                      {
                                        type: "calculator",
                                        category: "tools",
                                      },
                                      {
                                        type: "instruction",
                                        category: "tools",
                                      },
                                      { type: "noisemeter", category: "tools" },
                                      { type: "image", category: "tools" },
                                      { type: "qrcode", category: "tools" },
                                      { type: "drawing", category: "tools" },
                                      { type: "sounds", category: "tools" },
                                      {
                                        type: "klassenglas",
                                        category: "tools",
                                      },
                                      {
                                        type: "noisescales",
                                        category: "tools",
                                      },
                                      {
                                        type: "guitartuner",
                                        category: "tools",
                                      },

                                      {
                                        type: "aiquiz",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "riddle",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "colormixer",
                                        category: "mindfulness",
                                      },
                                      { type: "dice", category: "mindfulness" },
                                      {
                                        type: "shadowshapes",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "clocksync",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "soundmemory",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "breathing",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "kidweather",
                                        category: "mindfulness",
                                      },
                                      { type: "pet", category: "mindfulness" },
                                      {
                                        type: "weather",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "moodmeter",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "watertracker",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "rhythm",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "dailyquotes",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "toothbrush",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "emotions",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "calmrain",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "animalvoice",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "piano",
                                        category: "mindfulness",
                                      },
                                      { type: "scrambler", category: "deutsch" },
                                      { type: "fractions", category: "mathe" },
                                      { type: "sorting", category: "mathe" },
                                      { type: "piggybank", category: "mathe" },
                                      { type: "spellingdetective", category: "deutsch" },
                                      { type: "numberline", category: "mathe" },
                                      { type: "mathchain", category: "mathe" },
                                      { type: "thermometer", category: "struct" },
                                      { type: "compoundsplit", category: "deutsch" },
                                      { type: "mathduel", category: "mathe" },
                                      { type: "shapepuzzle", category: "mathe" },
                                      { type: "secretagent", category: "mindfulness" },
                                      { type: "fractioncake", category: "mathe" },
                                      { type: "sentencebuilding", category: "deutsch" },
                                      { type: "patternmaker", category: "tools" },
                                      { type: "wordexplorer", category: "deutsch" },
                                      { type: "weightscale", category: "mathe" },
                                      { type: "geographyquiz", category: "sachunterricht" },
                                      { type: "reflexgame", category: "mindfulness" },
                                      { type: "wastebin", category: "sachunterricht" },
                                      { type: "tonetrainer", category: "tools" },
                                      { type: "rhymemachine", category: "deutsch" },
                                      { type: "alphabetsoup", category: "deutsch" },
                                      { type: "divrobot", category: "mathe" },
                                      { type: "classtarget", category: "interactivity" },
                                      { type: "morsecode", category: "tools" },
                                      { type: "punctuationzoo", category: "deutsch" },
                                      { type: "fractiongrid", category: "mathe" },
                                      { type: "wordbuilder", category: "deutsch" },
                                      { type: "soundmachine", category: "tools" },
                                      { type: "multitrainer", category: "mathe" },
                                      { type: "abcorder", category: "deutsch" },
                                      { type: "tischcheck", category: "interactivity" },
                                      { type: "faircall", category: "interactivity" },
                                      { type: "hangman", category: "deutsch" },
                                      { type: "anschauung", category: "mathe" },
                                    ];

                                    let count = 0;
                                    if (cat.id === "core") {
                                      count = PLANNED_COCKPIT_WIDGETS.length;
                                    } else if (cat.id === "categories") {
                                      count = new Set(
                                        allAvailableWidgets.map((item) => item.category),
                                      ).size;
                                    } else if (cat.id === "favorites") {
                                      count = (
                                        favoritesBySubject[
                                          getResolvedFavFolder()
                                        ] || []
                                      ).length;
                                    } else {
                                      count = allAvailableWidgets.filter(
                                        (item) => item.category === cat.id,
                                      ).length;
                                    }

                                    return (
                                      <button
                                        key={cat.id}
                                        onClick={() =>
                                          setActiveWidgetCategory(cat.id)
                                        }
                                        className={`min-h-11 px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                          activeWidgetCategory === cat.id
                                            ? "bg-indigo-500 text-white shadow"
                                            : currentIsLight
                                              ? "text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                                              : "text-slate-400 hover:bg-zinc-800 hover:text-white"
                                        }`}
                                      >
                                        <span>{cat.label}</span>
                                        <span
                                          className={`text-[7px] px-1.5 py-0.2 rounded-full font-bold ${activeWidgetCategory === cat.id ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-slate-400"}`}
                                        >
                                          {count}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto scrollbar-thin pr-1 pb-1">
                                  {(() => {
                                    const allAvailableWidgets = [
                                      {
                                        type: "timeline",
                                        label: "🛤 Tages-Zeitstrahl",
                                        desc: "Interaktiver visueller Ablaufplan",
                                        category: "struct",
                                      },
                                      {
                                        type: "clock",
                                        label: "⏱️ Uhrzeit & Datum",
                                        desc: "Analoge/Digitale Zeitanzeige",
                                        category: "struct",
                                      },
                                      {
                                        type: "timer",
                                        label: "⏳ Timer / Sanduhr",
                                        desc: "Countdown-Timer & Sanduhr",
                                        category: "struct",
                                      },
                                      {
                                        type: "stopwatch",
                                        label: "⏱️ Stoppuhr",
                                        desc: "Rundenzeitzähler",
                                        category: "struct",
                                      },
                                      {
                                        type: "trafficlight",
                                        label: "🚦 Status-Ampel",
                                        desc: "Verhalten und Lernampel",
                                        category: "struct",
                                      },
                                      {
                                        type: "todo",
                                        label: "📝 Aufgaben-Checkliste",
                                        desc: "Schnelle Tafel-To-Do-Listen",
                                        category: "struct",
                                      },
                                      {
                                        type: "dienste",
                                        label: "🧹 Klassendienste",
                                        desc: "Ämter- & Diensteverteilung",
                                        category: "struct",
                                      },
                                      {
                                        type: "links",
                                        label: "🔗 Link- & Dateispeicher",
                                        desc: "Eigene Verknüpfungen ablegen",
                                        category: "struct",
                                      },
                                      {
                                        type: "phases",
                                        label: "🧭 Unterrichtsphasen",
                                        desc: "Erarbeitung, Reflexion, etc.",
                                        category: "struct",
                                      },
                                      {
                                        type: "wordclock",
                                        label: "⏰ Deutsche Wort-Uhr",
                                        desc: "Kindgerechtes Uhrlernen",
                                        category: "struct",
                                      },

                                      {
                                        type: "randomname",
                                        label: "🎯 Zufallsauswahl",
                                        desc: "Namen aus Schülerliste ziehen",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "groups",
                                        label: "👥 Gruppen-Einteiler",
                                        desc: "Zufällige Teams auslosen",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "wheel",
                                        label: "🎡 Glücksrad",
                                        desc: "Zufallsauswahl Rad",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "kidattendance",
                                        label: "🖐️ Ich bin da!",
                                        desc: "Kinder bestätigen ihre Anwesenheit selbst",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "scoreboard",
                                        label: "🏆 Gruppen-Punkte",
                                        desc: "Team-Punktetafel",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "challenge",
                                        label: "🎯 Klassen-Challenge",
                                        desc: "Herausforderungen für die Klasse",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "secretagent",
                                        label: "🕵️‍♂️ Klassen-Kryptograph",
                                        desc: "Caesar-Chiffre & Safe-Knacker Rätsel",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "weightscale",
                                        label: "⚖️ Waagen-Schätzer",
                                        desc: "Gewichte vergleichen & ausbalancieren",
                                        category: "interactivity",
                                      },
                                      {
                                        type: "reflexgame",
                                        label: "⚡ Blitz-Reaktions-Trainer",
                                        desc: "Reaktionsgeschwindigkeit-Duell für Kinder",
                                        category: "interactivity",
                                      },

                                      {
                                        type: "zahlenraum",
                                        label: "🔢 Zahlenraum-Studio",
                                        desc: "Mengenbilder, Hunderterfeld & Zahlenstrahl (ZR 10 bis 1000)",
                                        category: "mathe",
                                      },
                                      {
                                        type: "kopfrechnen",
                                        label: "🧠 Kopfrechentrainer",
                                        desc: "Blitzrechnen, Einmaleins/Einsineins & Rechenketten",
                                        category: "mathe",
                                      },
                                      {
                                        type: "fractionvisualizer",
                                        label: "◐ Bruch-Visualisierer",
                                        desc: "Brüche im Kreis & Streifen darstellen und vergleichen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "mathbalancer",
                                        label: "⚖️ Gewichte-Waage",
                                        desc: "Gleiche die Balkenwaage aus",
                                        category: "mathe",
                                      },
                                      {
                                        type: "moneycalc",
                                        label: "💶 Taschengeld-Zähler",
                                        desc: "Geldbeträge zusammenzählen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "mathpyramid",
                                        label: "📐 Mathe-Pyramide",
                                        desc: "Löse die Zahlenpyramide durch Addition",
                                        category: "mathe",
                                      },
                                      {
                                        type: "clockpuzzle",
                                        label: "⏰ Uhren-Lern-Trainer",
                                        desc: "Lerne analoge Uhrzeiten einzustellen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "geometry",
                                        label: "📐 Geometrie-Muster",
                                        desc: "Bunte geometrische Collagen",
                                        category: "mathe",
                                      },
                                      {
                                        type: "angledetective",
                                        label: "📐 Winkel-Detektiv",
                                        desc: "Schätze Winkel im rotierenden Scheinwerferstrahl",
                                        category: "mathe",
                                      },
                                      {
                                        type: "estimationjar",
                                        label: "🫙 Schätz-Glas",
                                        desc: "Mengen und Murmel-Anzahlen schätzen",
                                        category: "mathe",
                                      },

                                      {
                                        type: "vocabulary",
                                        label: "🔤 Lernwörter-Studio",
                                        desc: "Lernkartei, Stolperstellen & ABC-Ordnung",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wortsatzwerkstatt",
                                        label: "✍️ Wort- & Satzwerkstatt",
                                        desc: "Wörter bauen, zerlegen & Sätze ordnen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordchain",
                                        label: "🔗 Wortketten-Spiel",
                                        desc: "Kettenwörter-Generator",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordgrid",
                                        label: "🔍 Buchstaben-Suchgitter",
                                        desc: "Wortsuchspiel auf Deutsch",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "dictionary",
                                        label: "📚 Emoji-Wörterbuch",
                                        desc: "Flips-Vokabelkarten DE & EN",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "wordscramble",
                                        label: "🍲 Wort-Salat (Anagramm)",
                                        desc: "Anagramme entschlüsseln",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "secretcode",
                                        label: "🕵️ Geheimsprachen-Box",
                                        desc: "Verschlüssle Botschaften",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "storyemojis",
                                        label: "🎭 Story-Emojis",
                                        desc: "Bildimpulse für Geschichten & Erzählungen",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "wordexplorer",
                                        label: "🔍 Wort-Analysator",
                                        desc: "Silben, Vokale & Wortart bestimmen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "patternmaker",
                                        label: "🎨 Sequenz-Muster-Macher",
                                        desc: "Logische Muster fortführen",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "rhymemachine",
                                        label: "🎰 Reim-Maschine",
                                        desc: "Finde das passende Reimwort",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "alphabetsoup",
                                        label: "🥣 Buchstaben-Suppe",
                                        desc: "Wörter buchstabieren",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "morsecode",
                                        label: "🔦 Morse-Code-Station",
                                        desc: "Sende Lichtsignale",
                                        category: "deutsch",
                                      },
                                      {
                                        type: "punctuationzoo",
                                        label: "🐒 Satzzeichen-Zoo",
                                        desc: "Finde die fehlenden Satzzeichen",
                                        category: "deutsch",
                                      },

                                      {
                                        type: "bodyparts",
                                        label: "🦴 Körper-Entdecker",
                                        desc: "Kindgerechte Anatomie-Fakten",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "compass",
                                        label: "🧭 Geographie-Kompass",
                                        desc: "Orientierung & Himmelsrichtungen lernen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "weekdays",
                                        label: "📅 Wochentage-Trainer",
                                        desc: "Wochentage und Monate lernen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "trafficquiz",
                                        label: "🚴 Fahrrad-Führerschein",
                                        desc: "Lerne wichtige Verkehrszeichen",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "watercycle",
                                        label: "💧 Wasserkreislauf-Puzzle",
                                        desc: "Stationen des Wasserkreislaufs",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "constellation",
                                        label: "✨ Sternbilder-Zeichner",
                                        desc: "Verbinde Sterne zu echten Himmels-Sternbildern",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "planetarium",
                                        label: "🌍 Planetensystem",
                                        desc: "Planeten unseres Sonnensystems entdecken",
                                        category: "sachunterricht",
                                      },
                                      {
                                        type: "geographyquiz",
                                        label: "🗺️ Bundesländer-Forscher",
                                        desc: "Bundesländer & Hauptstädte raten",
                                        category: "sachunterricht",
                                      },

                                      {
                                        type: "instruction",
                                        label: "📝 Arbeitsanweisung",
                                        desc: "Großes Textfeld für Aufgaben",
                                        category: "tools",
                                      },
                                      {
                                        type: "tischcheck",
                                        label: "🎒 Tisch-Check",
                                        desc: "Visualisiere benötigte Materialien am Platz",
                                        category: "tools",
                                      },
                                      {
                                        type: "faircall",
                                        label: "🙋‍♀️ Fair-Call",
                                        desc: "Gerechter Zufallsaufrufer mit Aufrufhistorie",
                                        category: "tools",
                                      },
                                      {
                                        type: "hangman",
                                        label: "🌸 Blumen-Rätsel",
                                        desc: "Sätze oder Wörter schrittweise erraten",
                                        category: "play",
                                      },
                                      {
                                        type: "calculator",
                                        label: "🧮 Grundschulrechner",
                                        desc: "Klarer Smartboard-Rechner für Grundrechenarten",
                                        category: "tools",
                                      },
                                      {
                                        type: "noisemeter",
                                        label: "🔊 Lärmampel / Messer",
                                        desc: "Lautstärkekontrolle visualisiert",
                                        category: "tools",
                                      },
                                      {
                                        type: "image",
                                        label: "🖼️ Tafelbild-Projektor",
                                        desc: "Eigene Tafelfiles hochladen",
                                        category: "tools",
                                      },
                                      {
                                        type: "qrcode",
                                        label: "🔗 QR-Code-Generator",
                                        desc: "Links für Schüler bereitstellen",
                                        category: "tools",
                                      },
                                      {
                                        type: "drawing",
                                        label: "🖍️ Zeichenfeld",
                                        desc: "Skizzen & Handschrift auf Tafel",
                                        category: "tools",
                                      },
                                      {
                                        type: "sounds",
                                        label: "🎵 Soundboard Töne",
                                        desc: "Klassenzimmersignale abspielen",
                                        category: "tools",
                                      },
                                      {
                                        type: "klassenglas",
                                        label: "💎 Klassenziel & Belohnungsglas",
                                        desc: "Gemeinsames Klassenziel (Glas, Thermometer, Barometer)",
                                        category: "tools",
                                      },
                                      {
                                        type: "noisescales",
                                        label: "🤫 Lautstärke-Modelle",
                                        desc: "Lautstärke-Pegel als Orientierung",
                                        category: "tools",
                                      },
                                      {
                                        type: "guitartuner",
                                        label: "🎸 Gitarren-Stimmgerät",
                                        desc: "Saiten stimmen mit Referenztönen",
                                        category: "tools",
                                      },

                                      {
                                        type: "aiquiz",
                                        label: "🤖 KI Lern-Quiz",
                                        desc: "Lernfragen beantworten",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "riddle",
                                        label: "🧩 Scherz- & Logikrätsel",
                                        desc: "Tägliche Knobelfragen für Kinder",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "colormixer",
                                        label: "🎨 Kunst Farbmischung",
                                        desc: "Farbzusammenstellungen spielerisch",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "dice",
                                        label: "🎲 Tafel-Würfel",
                                        desc: "Zweifarbwürfel werfen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "shadowshapes",
                                        label: "🦋 Symmetrie-Spiel",
                                        desc: "Schattenmotive spiegeln",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "clocksync",
                                        label: "⏰ Uhrzeit-Macher",
                                        desc: "Stelle analoge Zeiger passend zur digitalen Uhr",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "soundmemory",
                                        label: "🎵 Klang-Memory",
                                        desc: "Finde gleiche Töne über Gehör",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "breathing",
                                        label: "🍃 Atempause",
                                        desc: "Ruhige angeleitete Atemübung",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "kidweather",
                                        label: "🕶️ Wetterfrosch Station",
                                        desc: "Wie zieht man sich passend an?",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "pet",
                                        label: "🐾 Digitales Klassentier",
                                        desc: "Klimatier hegen & pflegen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "weather",
                                        label: "☁️ Aktueller Wetterbericht",
                                        desc: "Wetterdaten abrufen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "moodmeter",
                                        label: "🙂 Stimmungsmesser",
                                        desc: "Befinden der Schüler erfassen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "watertracker",
                                        label: "💧 Wasserbedarf-Tracker",
                                        desc: "Tagesbedarfskontrolle",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "rhythm",
                                        label: "🥁 Rhythmus-Klopfer",
                                        desc: "Beats & Takte interaktiv üben",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "dailyquotes",
                                        label: "💡 Morgen-Mottos",
                                        desc: "Positive Affirmationen am Morgen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "toothbrush",
                                        label: "🪥 Zahnputz-Station",
                                        desc: "Schritt-für-Schritt Putzanleitung",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "emotions",
                                        label: "🎭 Gefühls-Barometer",
                                        desc: "Auseinandersetzung mit Gefühlen",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "animalvoice",
                                        label: "🤖 Roboter-Sounds",
                                        desc: "Welcher Roboter macht dieses Geräusch?",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "piano",
                                        label: "🎹 Klassen-Klavier",
                                        desc: "Spielbare Tonleiter & Musik",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "calmrain",
                                        label: "🌧️ Fokus-Klänge",
                                        desc: "Beruhigende Natur- und Fokusgeräusche für Stillarbeit",
                                        category: "mindfulness",
                                      },

                                      {
                                        type: "wastebin",
                                        label: "♻️ Müll-Trenner",
                                        desc: "Ordne Abfallprodukte richtig ein",
                                        category: "mindfulness",
                                      },
                                      {
                                        type: "tonetrainer",
                                        label: "🎵 Tonleiter-Entdecker",
                                        desc: "Spiele Töne und lerne Melodien nach Gehör",
                                        category: "mindfulness",
                                      },
                                      { type: "scrambler", label: "✍️ Wort- & Satzwerkstatt", desc: "Wörter und Sätze spielerisch ordnen und untersuchen", category: "deutsch" },
                                      { type: "fractions", label: "◐ Bruch-Visualisierer", desc: "Brüche anschaulich darstellen", category: "mathe" },
                                      { type: "sorting", label: "🔢 Zahlensortierer", desc: "Zahlen vergleichen und sortieren", category: "mathe" },
                                      { type: "piggybank", label: "🐷 Klassen-Sparschwein", desc: "Geldbeträge spielerisch darstellen", category: "mathe" },
                                      { type: "spellingdetective", label: "🔤 Rechtschreib-Detektiv", desc: "Wörter untersuchen und Rechtschreibung trainieren", category: "deutsch" },
                                      { type: "numberline", label: "🔢 Zahlenstrahl", desc: "Zahlen auf dem Zahlenstrahl verorten", category: "mathe" },
                                      { type: "mathchain", label: "🧠 Rechenkette", desc: "Rechenketten gemeinsam bearbeiten", category: "mathe" },
                                      { type: "thermometer", label: "🌡️ Ziel-Thermometer", desc: "Fortschritt und Ziele sichtbar machen", category: "struct" },
                                      { type: "compoundsplit", label: "✍️ Zusammengesetzte Wörter", desc: "Wortbausteine erkennen und zusammensetzen", category: "deutsch" },
                                      { type: "mathduel", label: "⚔️ Mathe-Duell", desc: "Kurze Rechenduelle für die Klasse", category: "mathe" },
                                      { type: "shapepuzzle", label: "📐 Formen-Entdecker", desc: "Geometrische Formen entdecken und zuordnen", category: "mathe" },
                                      { type: "fractioncake", label: "🍰 Bruch-Kuchen", desc: "Bruchteile mit anschaulichen Flächen darstellen", category: "mathe" },
                                      { type: "sentencebuilding", label: "✍️ Satzbau", desc: "Sätze aufbauen und Satzteile ordnen", category: "deutsch" },
                                      { type: "divrobot", label: "🤖 Teilbarkeits-Roboter", desc: "Teilbarkeit spielerisch untersuchen", category: "mathe" },
                                      { type: "classtarget", label: "🎯 Klassen-Ziel", desc: "Gemeinsame Ziele sichtbar verfolgen", category: "interactivity" },
                                      { type: "fractiongrid", label: "◐ Bruch-Raster", desc: "Brüche im Raster visualisieren", category: "mathe" },
                                      { type: "wordbuilder", label: "🔤 Wort-Baukasten", desc: "Wörter aus Bausteinen zusammensetzen", category: "deutsch" },
                                      { type: "soundmachine", label: "🎵 Klang-Maschine", desc: "Klänge und Signale im Unterricht einsetzen", category: "tools" },
                                      { type: "multitrainer", label: "🧠 Multi-Trainer", desc: "Verschiedene Rechenarten trainieren", category: "mathe" },
                                      { type: "abcorder", label: "🔤 ABC-Sortierer", desc: "Wörter alphabetisch ordnen", category: "deutsch" },
                                      { type: "anschauung", label: "🔢 Zahlenraum-Studio", desc: "Zahlenräume anschaulich darstellen", category: "mathe" },
                                    ];

                                    const resolvedActiveFach =
                                      getActiveSubject();
                                    const availableFolders = [
                                      {
                                        id: "active_subject",
                                        label: `📁 Aktuelles Fach: ${resolvedActiveFach}`,
                                      },
                                      {
                                        id: "Allgemein",
                                        label: "📁 Allgemein",
                                      },
                                      { id: "Deutsch", label: "📁 Deutsch" },
                                      {
                                        id: "Mathematik",
                                        label: "📁 Mathematik",
                                      },
                                      { id: "Englisch", label: "📁 Englisch" },
                                      {
                                        id: "Sachunterricht",
                                        label: "📁 Sachunterricht",
                                      },
                                      { id: "Musik", label: "📁 Musik" },
                                      { id: "Kunst", label: "📁 Kunst" },
                                      { id: "Sport", label: "📁 Sport" },
                                      { id: "Religion", label: "📁 Religion" },
                                    ].filter((folder) => {
                                      if (
                                        folder.id === "active_subject" ||
                                        folder.id === "Allgemein"
                                      )
                                        return true;
                                      if (folder.id === resolvedActiveFach)
                                        return false;
                                      const count = (
                                        favoritesBySubject[folder.id] || []
                                      ).length;
                                      return count > 0;
                                    });

                                    const currentResolvedFolder =
                                      getResolvedFavFolder();
                                    const query = widgetSearch
                                      .toLowerCase()
                                      .trim();
                                    if (activeWidgetCategory === "core" && !query) {
                                      return (
                                        <>
                                          <p className="col-span-full text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            19 übersichtliche Einstiege. Pluspunkte findest du weiterhin rechts in der Schülerliste. Alte Layouts bleiben beim Import lesbar.
                                          </p>
                                          {PLANNED_COCKPIT_WIDGETS.map((group) => {
                                            const variants = group.sources
                                              .map((type) => allAvailableWidgets.find((item) => item.type === type))
                                              .filter((item): item is (typeof allAvailableWidgets)[number] => Boolean(item));
                                            const expanded = expandedCoreWidget === group.id;
                                            return (
                                              <div key={group.id} data-testid={`cockpit-core-group-${group.id}`} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white">
                                                <button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 text-left text-sm font-bold hover:bg-indigo-50 dark:hover:bg-white/10"
                                                  aria-expanded={variants.length > 1 ? expanded : undefined}
                                                  onClick={() => {
                                                    if (variants.length === 1) {
                                                      handleOpenWidgetInCockpitLayout(variants[0].type as CockpitWidgetConfig["type"]);
                                                      setIsAddWidgetMenuOpen(false);
                                                    } else {
                                                      setExpandedCoreWidget(expanded ? null : group.id);
                                                    }
                                                  }}>
                                                  <span>{group.label}</span>
                                                  <span aria-hidden="true" className="text-indigo-600 dark:text-indigo-300">{variants.length > 1 ? (expanded ? "−" : "+") : "＋"}</span>
                                                </button>
                                                {variants.length > 1 && expanded && (
                                                  <div className="mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2 dark:border-white/15">
                                                    {variants.map((variant) => (
                                                      <button type="button" key={variant.type}
                                                        className="min-h-11 rounded-lg px-3 text-left text-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:bg-white/10"
                                                        onClick={() => {
                                                          handleOpenWidgetInCockpitLayout(variant.type as CockpitWidgetConfig["type"]);
                                                          setIsAddWidgetMenuOpen(false);
                                                        }}>
                                                        {variant.label}
                                                      </button>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </>
                                      );
                                    }

                                    const filteredList =
                                      allAvailableWidgets.filter((item) => {
                                        if (query) {
                                          const labelMatch = (item.label || "")
                                            .toLowerCase()
                                            .includes(query);
                                          const descMatch = (item.desc || "")
                                            .toLowerCase()
                                            .includes(query);
                                          return labelMatch || descMatch;
                                        }

                                        let matchesCategory = false;
                                        if (activeWidgetCategory === "categories") {
                                          matchesCategory = false;
                                        } else if (
                                          activeWidgetCategory === "favorites"
                                        ) {
                                          const favs =
                                            favoritesBySubject[
                                              currentResolvedFolder
                                            ] || [];
                                          matchesCategory = favs.includes(
                                            item.type,
                                          );
                                        } else {
                                          matchesCategory =
                                            item.category ===
                                            activeWidgetCategory;
                                        }

                                        return matchesCategory;
                                      });

                                    if (
                                      activeWidgetCategory === "categories" &&
                                      !query
                                    ) {
                                      return (
                                        <div className="col-span-1 sm:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-300 dark:border-white/15 bg-slate-50/80 dark:bg-white/[0.03] px-6 py-10 text-center">
                                          <div className="mx-auto mb-3 w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                            <Grid3X3 size={20} />
                                          </div>
                                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Wähle oben eine Kategorie
                                          </p>
                                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Oder tippe einen Begriff in die Suche. Dann durchsucht Klassio automatisch den gesamten Widget-Katalog.
                                          </p>
                                        </div>
                                      );
                                    }

                                    if (
                                      activeWidgetCategory === "favorites" &&
                                      filteredList.length === 0
                                    ) {
                                      return (
                                        <>
                                          <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-1.5 p-2 mb-3 bg-black/10 dark:bg-white/5 rounded-2xl border border-white/5">
                                            <div className="w-full text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1 flex justify-between items-center">
                                              <span>📁 FAVORITEN-ORDNER:</span>
                                              <span className="font-mono text-indigo-400">
                                                Aktives Fach:{" "}
                                                {resolvedActiveFach}
                                              </span>
                                            </div>
                                            {availableFolders.map((folder) => {
                                              const folderName =
                                                folder.id === "active_subject"
                                                  ? resolvedActiveFach
                                                  : folder.id;
                                              const count = (
                                                favoritesBySubject[
                                                  folderName
                                                ] || []
                                              ).length;
                                              const isSelected =
                                                selectedFavFolder === folder.id;
                                              return (
                                                <button
                                                  key={folder.id}
                                                  type="button"
                                                  onClick={() =>
                                                    setSelectedFavFolder(
                                                      folder.id,
                                                    )
                                                  }
                                                  className={`px-2.5 py-1 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                    isSelected
                                                      ? "bg-indigo-500 text-white shadow-md scale-102"
                                                      : currentIsLight
                                                        ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                        : "bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                                                  }`}
                                                >
                                                  <span>{folder.label}</span>
                                                  <span
                                                    className={`text-[7px] px-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-slate-400"}`}
                                                  >
                                                    {count}
                                                  </span>
                                                </button>
                                              );
                                            })}
                                          </div>
                                          <div className="col-span-2 sm:col-span-3 py-10 flex flex-col items-center justify-center text-center opacity-70">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                                              <Star
                                                size={18}
                                                className="stroke-[2.5]"
                                              />
                                            </div>
                                            <p className="text-[10px] font-bold">
                                              Ordner "{currentResolvedFolder}"
                                              ist leer
                                            </p>
                                            <p className="text-[7.5px] mt-1 max-w-[240px] leading-relaxed">
                                              Klicke auf das Stern-Symbol bei
                                              einem beliebigen Widget in den
                                              anderen Kategorien, um es zu **"
                                              {currentResolvedFolder}"**
                                              hinzuzufügen!
                                            </p>
                                          </div>
                                        </>
                                      );
                                    }

                                    const renderedFoldersHeader =
                                      activeWidgetCategory === "favorites" ? (
                                        <div className="col-span-2 sm:col-span-3 flex flex-wrap gap-1.5 p-2 mb-3 bg-black/10 dark:bg-white/5 rounded-2xl border border-white/5">
                                          <div className="w-full text-[8.5px] font-black uppercase tracking-wider text-slate-400 mb-1 px-1 flex justify-between items-center">
                                            <span>📁 FAVORITEN-ORDNER:</span>
                                            <span className="font-mono text-indigo-400">
                                              Aktives Fach: {resolvedActiveFach}
                                            </span>
                                          </div>
                                          {availableFolders.map((folder) => {
                                            const folderName =
                                              folder.id === "active_subject"
                                                ? resolvedActiveFach
                                                : folder.id;
                                            const count = (
                                              favoritesBySubject[folderName] ||
                                              []
                                            ).length;
                                            const isSelected =
                                              selectedFavFolder === folder.id;
                                            return (
                                              <button
                                                key={folder.id}
                                                type="button"
                                                onClick={() =>
                                                  setSelectedFavFolder(
                                                    folder.id,
                                                  )
                                                }
                                                className={`px-2.5 py-1 rounded-xl text-[8.5px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                                  isSelected
                                                    ? "bg-indigo-500 text-white shadow-md scale-102"
                                                    : currentIsLight
                                                      ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                                                      : "bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                                                }`}
                                              >
                                                <span>{folder.label}</span>
                                                <span
                                                  className={`text-[7px] px-1 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10 text-slate-400"}`}
                                                >
                                                  {count}
                                                </span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      ) : null;

                                    return (
                                      <>
                                        {renderedFoldersHeader}
                                        {filteredList.length === 0 && (
                                          <div className="col-span-2 sm:col-span-3 py-10 flex flex-col items-center justify-center text-center opacity-70">
                                            <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                                              🔍
                                            </div>
                                            <p className="text-[10px] font-bold">
                                              Keine passende Widgets gefunden
                                            </p>
                                            <p className="text-[7.5px] mt-1 max-w-[240px] leading-relaxed">
                                              Passe deine Suche oder deine
                                              Kategorie-Filter an, um andere
                                              Cockpit-Hilfen anzuzeigen!
                                            </p>
                                          </div>
                                        )}
                                        {filteredList.map((item) => {
                                          const widgetObj = cockpitWidgets.find(
                                            (w) => w.type === item.type,
                                          );
                                          const isActive = widgetObj?.visible;
                                          const isFav = (
                                            favoritesBySubject[
                                              getResolvedFavFolder()
                                            ] || []
                                          ).includes(item.type);
                                          return (
                                            <div
                                              key={item.type}
                                              className={`w-full p-2.5 rounded-xl text-left flex flex-col justify-between items-start transition-all border group relative min-h-[104px] ${
                                                isActive
                                                  ? "opacity-60 bg-slate-100 dark:bg-zinc-800/50 border-transparent"
                                                  : currentIsLight
                                                    ? "bg-white border-slate-100 hover:border-indigo-200 hover:bg-slate-50 text-slate-700 active:bg-slate-100"
                                                    : "bg-zinc-900 border-white/5 hover:border-indigo-500/30 hover:bg-zinc-850 text-slate-200 active:bg-zinc-800"
                                              }`}
                                            >
                                              {/* Toggle Favorite Star Button */}
                                              <button
                                                type="button"
                                                onClick={(e) =>
                                                  toggleFavorite(item.type, e)
                                                }
                                                className={`absolute top-2 right-2 p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-zinc-850 transition-colors z-[1001] ${
                                                  isFav
                                                    ? "text-amber-500"
                                                    : "text-slate-300 dark:text-zinc-600 hover:text-amber-500"
                                                } scale-100 active:scale-95 cursor-pointer`}
                                                title={
                                                  isFav
                                                    ? "Von Favoriten entfernen"
                                                    : "Zu Favoriten hinzufügen"
                                                }
                                              >
                                                <Star
                                                  size={11}
                                                  fill={
                                                    isFav
                                                      ? "currentColor"
                                                      : "none"
                                                  }
                                                  className="stroke-[2.5]"
                                                />
                                              </button>

                                              <button
                                                disabled={isActive}
                                                onClick={() => {
                                                  if (widgetObj) {
                                                    handleOpenWidgetInCockpitLayout(
                                                      item.type as any,
                                                    );
                                                  }
                                                  setIsAddWidgetMenuOpen(false);
                                                }}
                                                className="w-full h-full text-left flex flex-col justify-between items-start cursor-pointer disabled:cursor-not-allowed"
                                              >
                                                <div className="w-full flex items-center justify-between font-semibold text-sm">
                                                  <span className="truncate pr-7 group-hover:text-indigo-500 transition-colors">
                                                    {item.label}
                                                  </span>
                                                  {isActive && (
                                                    <Check
                                                      size={11}
                                                      className="text-emerald-500 stroke-[3] shrink-0 absolute top-[11px] right-8"
                                                    />
                                                  )}
                                                </div>
                                                <p className="text-xs mt-2 opacity-80 font-medium leading-relaxed pr-7">
                                                  {item.desc}
                                                </p>
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>




                          <button
                            type="button"
                            onClick={() => {
                              setVorlagenStartTab("create");
                              setIsVorlagenModalOpen(true);
                            }}
                            className={`min-h-11 px-3 rounded-xl border text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              currentIsLight
                                ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                                : "bg-zinc-900 border-white/10 text-white/80 hover:bg-zinc-800"
                            }`}
                            title="Aktuelles Widget-Layout als neue Vorlage speichern"
                          >
                            <Save size={13} />
                            <span className="hidden md:inline">Vorlage erstellen</span>
                            <span className="md:hidden">Vorlage</span>
                          </button>

                          {/* Secondary Actions: Dropdown Menu (••• Optionen) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setIsMoreOptionsMenuOpen((prev) => !prev)}
                              className={`h-8 px-2.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isMoreOptionsMenuOpen
                                  ? "bg-indigo-600 border-indigo-600 text-white"
                                  : currentIsLight
                                    ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                                    : "bg-zinc-900 border-white/10 hover:bg-zinc-800 text-white/80"
                              }`}
                              title="Weitere Optionen & Layout-Werkzeuge"
                            >
                              <MoreHorizontal size={14} />
                              <span className="hidden sm:inline text-[9px] font-black uppercase tracking-wider">Optionen</span>
                            </button>

                            {isMoreOptionsMenuOpen && (
                              <div
                                className={`absolute right-0 top-10 w-72 max-h-[70vh] overflow-y-auto rounded-2xl border p-2 shadow-2xl flex flex-col gap-1 z-[1000] ${
                                  currentIsLight
                                    ? "bg-white border-slate-200 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150"
                                    : "bg-zinc-900 border-white/10 text-white animate-in fade-in slide-in-from-top-2 duration-150"
                                }`}
                              >
                                <div className="px-2 py-1 text-[8.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                                  Gestaltung & Unterricht
                                </div>
                                <button type="button" onClick={() => { setIsThemePickerOpen(true); setIsMoreOptionsMenuOpen(false); }}
                                  className="w-full min-h-10 rounded-lg px-2.5 py-2 text-left text-sm font-semibold hover:bg-slate-100">🎨 Design & Farben</button>
                                <button type="button" onClick={() => { setIsBirthdayCelebrationOpen(true); setIsMoreOptionsMenuOpen(false); }}
                                  className="w-full min-h-10 rounded-lg px-2.5 py-2 text-left text-sm font-semibold hover:bg-slate-100">🎂 Geburtstag</button>
                                <button type="button" aria-expanded={isQuickBarSettingsOpen}
                                  onClick={() => setIsQuickBarSettingsOpen(open => !open)}
                                  className="w-full min-h-10 rounded-lg px-2.5 py-2 text-left text-sm font-semibold hover:bg-slate-100"
                                >▤ Widget-Leiste {isQuickBarSettingsOpen ? '▴' : '▾'}</button>
                                {isQuickBarSettingsOpen && (
                                  <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800"
                                    aria-label="Zusätzliche Widget-Leiste konfigurieren">
                                    <label className="flex min-h-10 items-center gap-2 font-semibold">
                                      <input type="checkbox" checked={quickBarSettings.enabled}
                                        disabled={!app.activeClassId}
                                        onChange={event => updateQuickBarSettings(settings => ({ ...settings, enabled: event.target.checked }))} />
                                      Zusätzliche Widget-Leiste anzeigen
                                    </label>
                                    <p className="text-slate-600">Wähle deine Schnellzugriffe. Alle anderen Widgets bleiben über „Widget hinzufügen“ verfügbar.</p>
                                    {COCKPIT_QUICKBAR_ITEMS.map(item => (
                                      <label key={item.id} className="flex min-h-9 items-center gap-2">
                                        <input type="checkbox" checked={quickBarSettings.itemIds.includes(item.id)}
                                          disabled={!app.activeClassId}
                                          onChange={() => updateQuickBarSettings(settings => toggleCockpitQuickbarItem(settings, item.id))} />
                                        {item.label}
                                      </label>
                                    ))}
                                    <button type="button" onClick={resetQuickBarSettings}
                                      className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold hover:bg-slate-100">
                                      Widget-Leiste zurücksetzen
                                    </button>
                                  </div>
                                )}
                                <div className="px-2 py-1 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                                  Weitere Funktionen
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAutoArrangeWidgets();
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Sparkles size={12} className="text-amber-500 shrink-0" />
                                  <span>Automatisch anordnen</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setVorlagenStartTab("browse");
                                    setIsVorlagenModalOpen(true);
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Layout size={12} className="text-indigo-500 shrink-0" />
                                  <span className="flex-1">Vorlagen & Profile</span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[8px] font-black bg-indigo-500 text-white">
                                    {app.workspaceProfiles && app.workspaceProfiles.length > 0
                                      ? app.workspaceProfiles.length
                                      : DEFAULT_WORKSPACE_PROFILES.length}
                                  </span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsSlotMenuOpen(true);
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Settings2 size={12} className="text-slate-400 shrink-0" />
                                  <span>Layouts & Schnell-Slots</span>
                                </button>

                                <div
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left ${
                                    currentIsLight ? "text-slate-600" : "text-white/70"
                                  }`}
                                >
                                  <Unlock size={12} className="text-emerald-500 shrink-0" />
                                  <span>Widgets immer verschiebbar</span>
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-white/5 my-0.5" />
                                <div className="px-2 pt-1 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                                  Ansicht
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (sidebarMode === "hidden") {
                                      changeSidebarMode(prevSidebarMode || "expanded");
                                    } else {
                                      changeSidebarMode("hidden");
                                    }
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Users size={12} className="text-amber-500 shrink-0" />
                                  <span>{sidebarMode !== "hidden" ? "Schülerliste ausblenden" : "Schülerliste einblenden"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setApp((prev: any) => {
                                      const existing = prev.classPet;
                                      const currentlyEnabled = existing
                                        ? existing.enabled !== false
                                        : false;
                                      return {
                                        ...prev,
                                        classPet: {
                                          ...(existing || {
                                            enabled: false,
                                            animalType: "dino",
                                            name: "Spike",
                                            energy: 50,
                                            accessories: [],
                                            history: [],
                                            memories: [],
                                          }),
                                          enabled: !currentlyEnabled,
                                        },
                                      };
                                    });
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <span className="w-3 text-center shrink-0">🐾</span>
                                  <span>{classPetEnabled ? "Klassentier ausblenden" : "Klassentier einblenden"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsFocusModeLightOff((prev) => !prev);
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Lightbulb size={12} className="text-amber-500 shrink-0" />
                                  <span>Fokusmodus{isFocusModeLightOff ? " beenden" : ""}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    toggleFullscreen();
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  {isFullscreen ? <Minimize size={12} className="text-slate-400 shrink-0" /> : <Maximize size={12} className="text-slate-400 shrink-0" />}
                                  <span>{isFullscreen ? "Vollbild beenden" : "Vollbildmodus"}</span>
                                </button>

                                <div className="h-px bg-slate-100 dark:bg-white/5 my-0.5" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    handleClearAllWidgets();
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className="w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 text-left transition-colors cursor-pointer"
                                >
                                  <Trash2 size={12} className="shrink-0" />
                                  <span>Alle Widgets schließen</span>
                                </button>
                                <div className="h-px bg-slate-100 dark:bg-white/5 my-0.5" />
                                <div className="px-2 pt-1 text-[8.5px] font-black uppercase tracking-wider text-slate-400">
                                  Archiv
                                </div>
                                <button
                                  type="button"
                                  id="btn-menu-open-digitale-tafel"
                                  onClick={() => {
                                    setIsTafelOpen(true);
                                    setIsMoreOptionsMenuOpen(false);
                                  }}
                                  className={`w-full px-2.5 py-1.5 rounded-lg text-[9.5px] font-bold flex items-center gap-2 text-left transition-colors cursor-pointer ${
                                    currentIsLight ? "hover:bg-slate-100" : "hover:bg-white/10"
                                  }`}
                                >
                                  <Presentation size={12} className="text-slate-400 shrink-0" />
                                  <span>Alte Tafelinhalte öffnen</span>
                                </button>
                              </div>
                            )}

                            {/* Layout Slot Menu Modal if opened */}
                            {isSlotMenuOpen && (
                              <div
                                className={`absolute top-11 right-0 w-64 rounded-2xl border p-2 shadow-2xl flex flex-col gap-2 z-[1000] ${
                                  currentIsLight
                                    ? "bg-white border-slate-100 animate-in fade-in slide-in-from-top-3 duration-200"
                                    : "bg-zinc-900 border-white/10 animate-in fade-in slide-in-from-top-3 duration-200"
                                }`}
                              >
                                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-white/5">
                                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-400">
                                    Arbeitsbereiche & Profile
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setIsSlotMenuOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                                  >
                                    ✕
                                  </button>
                                </div>

                                <div className="p-1">
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={newProfileName}
                                      onChange={(e) =>
                                        setNewProfileName(e.target.value)
                                      }
                                      placeholder="Neues Profil (z.B. Morgenkreis)"
                                      className="flex-1 text-[10px] px-2 py-1.5 rounded-l-md border border-slate-200 dark:border-white/10 bg-transparent text-slate-800 dark:text-white placeholder:opacity-50 focus:outline-none"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          handleSaveProfile(newProfileName);
                                        }
                                      }}
                                    />
                                    <button
                                      onClick={() => {
                                        handleSaveProfile(newProfileName);
                                      }}
                                      disabled={!newProfileName.trim()}
                                      className="px-2 py-1.5 rounded-r-md bg-indigo-500 text-white font-black text-[9px] uppercase tracking-wider disabled:opacity-50 transition-all hover:bg-indigo-600 cursor-pointer"
                                    >
                                      Speichern
                                    </button>
                                  </div>
                                </div>

                                <div className="max-h-48 overflow-y-auto mt-1 flex flex-col gap-1.5 px-1 pb-1">
                                  {(app.workspaceProfiles &&
                                  app.workspaceProfiles.length > 0
                                    ? app.workspaceProfiles
                                    : DEFAULT_WORKSPACE_PROFILES
                                  ).map((profile) => (
                                    <div
                                      key={profile.id}
                                      className="flex flex-col p-1.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 gap-1.5"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold px-1 text-slate-700 dark:text-slate-200 truncate pr-2">
                                          {profile.name}
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleDeleteProfile(profile.id)
                                          }
                                          className="text-rose-500 hover:text-rose-600 px-1 opacity-60 hover:opacity-100 transition-opacity"
                                          title="Profil löschen"
                                        >
                                          <span className="text-[10px]">
                                            🗑️
                                          </span>
                                        </button>
                                      </div>
                                      <div className="flex gap-1.5 h-6">
                                        <button
                                          onClick={() => {
                                            handleUpdateProfile(profile.id);
                                            setIsSlotMenuOpen(false);
                                          }}
                                          className="flex-1 rounded bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[9px] hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                                        >
                                          Überschreiben
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleLoadProfile(profile.id);
                                            setIsSlotMenuOpen(false);
                                          }}
                                          className="flex-1 rounded bg-emerald-500 text-white font-bold text-[9px] hover:bg-emerald-600 transition-colors shadow-sm"
                                        >
                                          Laden
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="h-px bg-slate-100 dark:bg-zinc-800 my-1" />

                                <div className="px-2 pt-1 pb-2 border-t border-slate-100 dark:border-white/5 mt-1">
                                  <div className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                                    Schnell-Slots
                                  </div>
                                  {["A", "B", "C"].map((slot) => {
                                    const isSaved = slot === "A"
                                      ? !!app.cockpitLayoutA
                                      : slot === "B"
                                        ? !!app.cockpitLayoutB
                                        : !!app.cockpitLayoutC;
                                    return (
                                      <div
                                        key={slot}
                                        className="flex flex-col gap-1 mb-2 bg-slate-50 dark:bg-white/[0.02] p-1.5 rounded-xl border border-black/5 dark:border-white/5"
                                      >
                                        <div className="flex items-center gap-1">
                                          <span className="text-[9px] font-black text-indigo-500">{slot}</span>
                                          <input
                                            type="text"
                                            value={slotNames[slot] || ""}
                                            onChange={(e) => saveSlotName(slot, e.target.value)}
                                            className="flex-1 bg-transparent border-none text-[9px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 rounded px-1"
                                          />
                                        </div>
                                        <div className="flex gap-1.5">
                                          <button
                                            onClick={() => {
                                              handleSaveLayoutSlot(slot as any);
                                            }}
                                            className="flex-1 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[8px] hover:bg-indigo-100 dark:hover:bg-indigo-500/20"
                                          >
                                            Speichern
                                          </button>
                                          <button
                                            disabled={!isSaved}
                                            onClick={() => {
                                              handleLoadLayoutSlot(slot as any);
                                              setIsSlotMenuOpen(false);
                                            }}
                                            className={`flex-1 py-0.5 rounded font-bold text-[8px] ${
                                              isSaved
                                                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                                                : "bg-transparent text-slate-300 dark:text-slate-600 border border-slate-200 dark:border-white/5 cursor-not-allowed"
                                            }`}
                                          >
                                            Laden
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <button
                                  onClick={() => {
                                    setCockpitWidgets(DEFAULT_COCKPIT_LAYOUT);
                                    setApp((p) => ({
                                      ...p,
                                      cockpitLayout: DEFAULT_COCKPIT_LAYOUT,
                                    }));
                                    showToast(
                                      "Leere Ausgangsfläche geladen.",
                                      "info",
                                    );
                                    setIsSlotMenuOpen(false);
                                  }}
                                  className="w-full px-2 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-rose-500 text-center hover:bg-rose-500/10 transition-all cursor-pointer"
                                >
                                  Leere Ausgangsfläche laden
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* A single shared toolbar, outside the white teaching surface. */}
                      <div
                        role="toolbar"
                        aria-label="Unterrichtsfläche: Text und Papier"
                        className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm"
                      >
                        <button type="button" aria-pressed={boardTool === 'text'}
                          onClick={() => { const editing = boardTool !== 'text'; setBoardTool(editing ? 'text' : 'select'); setIsBoardTextEditing(editing); }}
                          className={`min-h-11 rounded-lg border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 ${boardTool === 'text' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-100'}`}
                        >TEXT</button>
                        <label className="flex min-h-11 items-center gap-2 text-xs font-semibold">
                          Papier
                          <select aria-label="Papierart der Unterrichtsfläche" value={cockpitPaper}
                            onChange={event => setCockpitPaper(event.target.value as CockpitPaper)}
                            className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm">
                            {COCKPIT_PAPERS.map(paper => <option key={paper.id} value={paper.id}>{paper.label}</option>)}
                          </select>
                        </label>
                        {cockpitPaper !== 'blank' && (
                          <label className="flex min-h-11 items-center gap-2 text-xs font-semibold">
                            {cockpitPaper === 'grid' ? 'Kästchengröße' : cockpitPaper === 'handwriting' ? 'Schreibzonen' : 'Zeilenabstand'}
                            <input type="range" min={16} max={80} step={4} value={cockpitPaperSpacing}
                              aria-label="Papierabstand einstellen" onChange={event => setCockpitPaperSpacing(Number(event.target.value))}
                              className="w-24 accent-indigo-600" />
                            <span className="tabular-nums">{cockpitPaperSpacing}px</span>
                          </label>
                        )}
                        {boardTool === 'text' && (
                          <>
                            <select aria-label="Textgröße" defaultValue="p"
                              onChange={event => boardTextCommandRef.current?.('formatBlock', event.target.value)}
                              className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-sm">
                              <option value="p">Normal</option>
                              <option value="h2">Groß</option>
                              <option value="h1">Sehr groß</option>
                            </select>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('bold')}
                              className="min-h-11 rounded-lg border border-slate-300 px-4 text-sm font-black">Fett</button>
                            <label className="flex min-h-11 items-center gap-1.5 text-xs font-semibold">Textfarbe
                              <input type="color" aria-label="Textfarbe auswählen" defaultValue="#172554"
                                onChange={event => boardTextCommandRef.current?.('foreColor', event.target.value)}
                                className="h-10 w-11 rounded border border-slate-300" />
                            </label>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('justifyLeft')}
                              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">Links</button>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('justifyCenter')}
                              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">Mitte</button>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('justifyRight')}
                              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm">Rechts</button>
                          </>
                        )}
                        {boardTool === 'text' && (
                          <>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('undo')}
                              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">↶ Rückgängig</button>
                            <button type="button" onMouseDown={event => event.preventDefault()}
                              onClick={() => boardTextCommandRef.current?.('redo')}
                              className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm font-semibold">↷ Wiederholen</button>
                          </>
                        )}
                      </div>

                      {quickBarSettings.enabled && quickBarSettings.itemIds.length > 0 && app.activeClassId && (
                        <nav aria-label="Zusätzliche Widget-Leiste"
                          className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-slate-800 shadow-sm">
                          {COCKPIT_QUICKBAR_ITEMS.filter(item => quickBarSettings.itemIds.includes(item.id)).map(item => (
                            <button type="button" key={item.id}
                              className="min-h-11 rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                              onClick={() => {
                                if (item.id === 'termine') {
                                  // Preserve the older, separately stored date widget without creating duplicate data.
                                  toggleWidget('termine');
                                } else {
                                  handleOpenWidgetInCockpitLayout(item.id as CockpitWidgetConfig['type']);
                                }
                              }}
                            >{item.label}</button>
                          ))}
                        </nav>
                      )}

                      {/* Widget Board (classroomscreen.com style) */}
                      <div
                        ref={boardRef}
                        className={`flex-1 relative group rounded-2xl border overflow-hidden pointer-events-auto h-full w-full min-h-[460px] ${isBoardTextEditing ? "select-text" : "select-none"} ${
                          currentIsLight
                            ? "bg-white border-slate-200 shadow-sm"
                            : "bg-white border-slate-200 shadow-inner"
                        }`}
                        id="widget-board-stage"
                        style={getCockpitPaperStyle(cockpitPaper, currentBgId === "canva" ? canvaBackground : null, cockpitPaperSpacing)}
                      >
                        <BoardTextEditor
                          value={boardTextHtml}
                          active={isBoardTextEditing}
                          onChange={saveBoardTextHtml}
                          externalToolbar
                          commandRef={boardTextCommandRef}
                          onDone={() => {
                            setIsBoardTextEditing(false);
                            setBoardTool('select');
                          }}
                        />
                        <BoardInk
                          key={boardTextClassKey}
                          items={boardInkItems}
                          active={false}
                          externalTool="pen"
                          externalColor="#172554"
                          externalWidth={4}
                          hideToolbar
                          onChange={saveBoardInkItems}
                          onDone={() => setBoardTool('select')}
                        />
                        {/* Centered Confirm Dialog inside stage instead of native popup */}
                        {timerToCloseId && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] no-print">
                            <div
                              className={`p-6 rounded-3xl border max-w-sm flex flex-col gap-4 text-center shadow-2xl ${
                                currentIsLight
                                  ? "bg-white border-slate-200 animate-in zoom-in-95 duration-200"
                                  : "bg-zinc-900 border-white/10 animate-in zoom-in-95 duration-200"
                              }`}
                            >
                              <h4 className="text-sm font-black uppercase tracking-wider text-rose-500">
                                Timer beenden?
                              </h4>
                              <p className="text-[11px] font-bold text-slate-500 dark:text-neutral-400">
                                Der Timer läuft noch. Möchtest du das Widget
                                trotzdem schließen? Dadurch wird der Timer
                                gestoppt.
                              </p>
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => {
                                    const tId = timerToCloseId;
                                    setTimerToCloseId(null);
                                    executeWidgetClose(tId);
                                    setTimerDisplaySec(0);
                                    setApp((p) => ({
                                      ...p,
                                      boardSettings: {
                                        ...p.boardSettings,
                                        timerRunning: false,
                                        timerEnd: undefined,
                                      },
                                    }));
                                    showToast(
                                      "Timer gestoppt und geschlossen.",
                                      "info",
                                    );
                                  }}
                                  className="px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                                >
                                  Ja, schließen
                                </button>
                                <button
                                  onClick={() => setTimerToCloseId(null)}
                                  className={`px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all cursor-pointer ${
                                    currentIsLight
                                      ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                                      : "bg-zinc-805 border-white/10 text-white hover:bg-zinc-700"
                                  }`}
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Render active cockpit widgets */}
                        {cockpitWidgets
                          .filter((w) => w.visible && w.type !== "studentlist")
                          .map((widget) => {
                            const zIn = 10 + focusOrder.indexOf(widget.id);
                            const isFocused =
                              focusOrder.indexOf(widget.id) ===
                              focusOrder.length - 1;
                            return (
                              <CockpitWidget
                                key={widget.id}
                                widget={widget}
                                zIndex={zIn}
                                stageRef={boardRef}
                                currentIsLight={currentIsLight}
                                activePultThemeVars={activePultThemeVars}
                                onFocus={() => bringToFront(widget.id)}
                                onClose={() =>
                                  handleCloseWidget(widget.id, widget.type)
                                }
                                onUpdate={(updates) =>
                                  handleUpdateWidgetPos(widget.id, updates)
                                }
                                showSettingsButton={[
                                  "noisemeter",
                                  "vocabulary",
                                  "qrcode",
                                  "image",
                                  "timer",
                                  "drawing",
                                ].includes(widget.type)}
                                onSettingsToggle={() =>
                                  setWidgetSettingsOpenId((prev) =>
                                    prev === widget.id ? null : widget.id,
                                  )
                                }
                                headerExtra={null}
                                isFocused={isFocused}
                                layoutLocked={!isLayoutEditing}
                              >
                                {(() => {
                                  switch (widget.type) {
                                    case "tischcheck":
                                      return (
                                        <TischCheckWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "faircall":
                                      return (
                                        <FairCallWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "hangman":
                                      return (
                                        <div className="w-[100%] h-full p-2 relative">
                                          <MemoizedFlowerPuzzleWidget
                                            stufe={
                                              parseInt(
                                                app?.klassenbezeichnung || "4",
                                              ) || 4
                                            }
                                            currentTopic="Spielen!"
                                          />
                                        </div>
                                      );

                                    case "wordgrid":
                                      return (
                                        <WordgridWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "rhythm":
                                      return (
                                        <RhythmWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "geometry":
                                      return (
                                        <GeometryWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "fractionvisualizer":
                                    case "fractions":
                                    case "fractioncake":
                                    case "fractiongrid":
                                      return (
                                        <FractionVisualizerContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wordclock":
                                      return (
                                        <WordclockWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "sorting":
                                      return (
                                        <SortingWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "dailyquotes":
                                      return (
                                        <DailyquotesWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "dictionary":
                                      return (
                                        <DictionaryWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "piano":
                                      return (
                                        <PianoWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "bodyparts":
                                      return (
                                        <BodypartsWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "toothbrush":
                                      return (
                                        <ToothbrushWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "challenge":
                                      return (
                                        <ChallengeWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "compass":
                                      return (
                                        <CompassWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "weekdays":
                                      return (
                                        <WeekdaysWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "piggybank":
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
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          activeFokusThemeVars={
                                            activeFokusThemeVars
                                          }
                                          isFullscreen={false}
                                        />
                                      );

                                    case "noisescales":
                                      return (
                                        <NoiseScaleWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wordscramble":
                                      return (
                                        <WordscrambleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "shadowshapes":
                                      return (
                                        <ShadowshapesWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "emotions":
                                      return (
                                        <EmotionsWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "clocksync":
                                      return (
                                        <ClocksyncWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "soundmemory":
                                      return (
                                        <SoundmemoryWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "spellingdetective":
                                      return (
                                        <SpellingdetectiveWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "numberline":
                                      return (
                                        <ZahlenraumStudioContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "thermometer":
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
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          activeFokusThemeVars={
                                            activeFokusThemeVars
                                          }
                                          isFullscreen={false}
                                        />
                                      );

                                    case "compoundsplit":
                                      return (
                                        <CompoundsplitWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "mathduel":
                                      return (
                                        <MathduelWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "shapepuzzle":
                                      return (
                                        <ShapepuzzleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "guitartuner":
                                      return (
                                        <GuitartunerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "secretagent":
                                      return (
                                        <SecretagentWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "sentencebuilding":
                                      return (
                                        <SentencebuildingWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "patternmaker":
                                      return (
                                        <PatternmakerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wordexplorer":
                                      return (
                                        <WordexplorerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "weightscale":
                                      return (
                                        <WeightscaleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "geographyquiz":
                                      return (
                                        <GeographyquizWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "calmrain":
                                      return (
                                        <CalmrainWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "estimationjar":
                                      return (
                                        <EstimationjarWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "reflexgame":
                                      return (
                                        <ReflexgameWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "mathpyramid":
                                      return (
                                        <MathpyramidWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wastebin":
                                      return (
                                        <WastebinWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "tonetrainer":
                                      return (
                                        <TonetrainerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "angledetective":
                                      return (
                                        <AngledetectiveWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "rhymemachine":
                                      return (
                                        <RhymemachineWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "alphabetsoup":
                                      return (
                                        <AlphabetsoupWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "divrobot":
                                      return (
                                        <DivrobotWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "classtarget":
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
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          activeFokusThemeVars={
                                            activeFokusThemeVars
                                          }
                                          isFullscreen={false}
                                        />
                                      );

                                    case "morsecode":
                                      return (
                                        <MorsecodeWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "punctuationzoo":
                                      return (
                                        <PunctuationzooWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "secretcode":
                                      return (
                                        <SecretcodeWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "clockpuzzle":
                                      return (
                                        <ClockpuzzleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "trafficquiz":
                                      return (
                                        <TrafficquizWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wordbuilder":
                                      return (
                                        <WordbuilderWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "wortsatzwerkstatt":
                                      return (
                                        <WortSatzWerkstattWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "watercycle":
                                      return (
                                        <WatercycleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "soundmachine":
                                      return (
                                        <SoundmachineWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "mathbalancer":
                                      return (
                                        <MathbalancerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "animalvoice":
                                      return (
                                        <AnimalvoiceWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "constellation":
                                      return (
                                        <ConstellationWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "anschauung":
                                    case "zahlenraum":
                                      return (
                                        <ZahlenraumStudioContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "moneycalc":
                                      return (
                                        <MoneycalcWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "storyemojis":
                                      return (
                                        <StoryemojisWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "abcorder":
                                      return (
                                        <AbcorderWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "planetarium":
                                      return (
                                        <PlanetariumWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "clock":
                                      return (
                                        <ClockWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "timer":
                                      return (
                                        <TimerWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "trafficlight":
                                      return (
                                        <TrafficLightWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "randomname":
                                      return (
                                        <RandomNameWidgetContent
                                          widget={widget}
                                          app={app}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "instruction":
                                      return (
                                        <InstructionWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                          showSettings={
                                            widgetSettingsOpenId === widget.id
                                          }
                                          onCloseSettings={() =>
                                            setWidgetSettingsOpenId(null)
                                          }
                                        />
                                      );

                                    case "DEPRECATED_INSTRUCTION_DUMMY" as any: {
                                      const text =
                                        app.vertretungHinweise ||
                                        "Anweisung hier tippen...";
                                      const wStyle = widget.settings || {};
                                      const fontFamily =
                                        wStyle.fontFamily || "Inter";

                                      // Normalize fontSize to accurate number values
                                      let sizeVal = 24;
                                      const rawSize = wStyle.fontSize;
                                      if (typeof rawSize === "number") {
                                        sizeVal = rawSize;
                                      } else if (typeof rawSize === "string") {
                                        if (rawSize.endsWith("px")) {
                                          sizeVal = parseInt(rawSize) || 24;
                                        } else {
                                          if (rawSize === "xs") sizeVal = 14;
                                          else if (rawSize === "base")
                                            sizeVal = 18;
                                          else if (rawSize === "lg")
                                            sizeVal = 24;
                                          else if (rawSize === "xl")
                                            sizeVal = 32;
                                          else if (rawSize === "2xl")
                                            sizeVal = 44;
                                          else if (rawSize === "3xl")
                                            sizeVal = 60;
                                        }
                                      }

                                      const isItalic = !!wStyle.italic;
                                      const isBold = !!wStyle.bold;
                                      const isUnderline = !!wStyle.underline;
                                      const textColor = wStyle.color || "";

                                      const getFontFamilyValue = (
                                        f: string,
                                      ) => {
                                        if (f === "Dyslexic")
                                          return '"OpenDyslexic", "Lexend", "Lexend Deca", sans-serif';
                                        if (f === "Schulschrift")
                                          return '"Edu VIC WA NT Beginner", "Patrick Hand", cursive';
                                        if (f === "Druckschrift")
                                          return '"Playpen Sans", "Comic Neue", cursive';
                                        if (f === "Georgia")
                                          return "Georgia, Cambria, serif";
                                        if (f === "JetBrains Mono")
                                          return '"JetBrains Mono", Menlo, monospace';
                                        if (f === "Comic")
                                          return '"Comic Sans MS", "Comic Neue", cursive';
                                        return "Inter, system-ui, sans-serif";
                                      };

                                      return (
                                        <div className="flex-grow flex flex-col min-h-0 w-full relative h-full pr-0.5">
                                          {isEditingInstructions ? (
                                            <div className="flex-grow flex flex-col gap-1.5 w-full min-h-0 pointer-events-auto">
                                              {/* Formatting toolbar */}
                                              <div className="flex flex-wrap gap-1.5 items-center bg-black/5 dark:bg-black/25 p-1.5 rounded-xl border border-slate-205 dark:border-white/5 select-none shrink-0">
                                                {/* Font selector */}
                                                <select
                                                  value={fontFamily}
                                                  onChange={(e) => {
                                                    handleUpdateWidgetPos(
                                                      widget.id,
                                                      {
                                                        settings: {
                                                          ...wStyle,
                                                          fontFamily:
                                                            e.target.value,
                                                        },
                                                      },
                                                    );
                                                  }}
                                                  className={`text-[8.5px] font-bold p-1 rounded-md border outline-none cursor-pointer ${
                                                    currentIsLight
                                                      ? "bg-white border-slate-300 text-slate-700"
                                                      : "bg-neutral-805 border-white/10 text-white"
                                                  }`}
                                                >
                                                  <option value="Inter">
                                                    Standard (Sans)
                                                  </option>
                                                  <option value="Georgia">
                                                    Klassisch (Serif)
                                                  </option>
                                                  <option value="JetBrains Mono">
                                                    Code (Mono)
                                                  </option>
                                                  <option value="Comic">
                                                    Comic (Schule)
                                                  </option>
                                                  <option value="Dyslexic">
                                                    Legasthenie (Lexend)
                                                  </option>
                                                  <option value="Schulschrift">
                                                    Schulschrift (Österreich)
                                                  </option>
                                                  <option value="Druckschrift">
                                                    Druckschrift (Österreich)
                                                  </option>
                                                </select>

                                                {/* Interactive sizing slider & precise controls */}
                                                <div className="flex items-center gap-1 bg-white/40 dark:bg-black/20 px-1.5 py-0.5 rounded-lg border border-transparent dark:border-white/5">
                                                  <span className="text-[7.5px] font-black opacity-70">
                                                    A-
                                                  </span>
                                                  <input
                                                    type="range"
                                                    min="12"
                                                    max="96"
                                                    value={sizeVal}
                                                    onChange={(e) => {
                                                      handleUpdateWidgetPos(
                                                        widget.id,
                                                        {
                                                          settings: {
                                                            ...wStyle,
                                                            fontSize: parseInt(
                                                              e.target.value,
                                                            ),
                                                          },
                                                        },
                                                      );
                                                    }}
                                                    className="w-14 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                    title="Schriftgröße anpassen"
                                                  />
                                                  <span className="text-[7.5px] font-black opacity-70">
                                                    A+
                                                  </span>

                                                  <input
                                                    type="number"
                                                    min="12"
                                                    max="150"
                                                    value={sizeVal}
                                                    onChange={(e) => {
                                                      const val = Math.max(
                                                        12,
                                                        Math.min(
                                                          150,
                                                          parseInt(
                                                            e.target.value,
                                                          ) || 24,
                                                        ),
                                                      );
                                                      handleUpdateWidgetPos(
                                                        widget.id,
                                                        {
                                                          settings: {
                                                            ...wStyle,
                                                            fontSize: val,
                                                          },
                                                        },
                                                      );
                                                    }}
                                                    className={`w-7 text-[8px] text-center font-bold font-mono py-0.5 rounded border ${
                                                      currentIsLight
                                                        ? "bg-white border-slate-300 text-slate-800"
                                                        : "bg-neutral-800 border-white/10 text-white"
                                                    }`}
                                                  />
                                                  <span className="text-[7px] font-mono opacity-60">
                                                    px
                                                  </span>
                                                </div>

                                                {/* Bold Toggle */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateWidgetPos(
                                                      widget.id,
                                                      {
                                                        settings: {
                                                          ...wStyle,
                                                          bold: !isBold,
                                                        },
                                                      },
                                                    );
                                                  }}
                                                  className={`p-1 w-5 h-5 rounded font-extrabold text-[9px] duration-155 border flex items-center justify-center cursor-pointer ${
                                                    isBold
                                                      ? "bg-indigo-500 text-white border-indigo-400"
                                                      : currentIsLight
                                                        ? "bg-white border-slate-200 hover:bg-slate-100"
                                                        : "bg-neutral-800 border-white/10"
                                                  }`}
                                                >
                                                  B
                                                </button>

                                                {/* Italic Toggle */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateWidgetPos(
                                                      widget.id,
                                                      {
                                                        settings: {
                                                          ...wStyle,
                                                          italic: !isItalic,
                                                        },
                                                      },
                                                    );
                                                  }}
                                                  className={`p-1 w-5 h-5 rounded italic text-[9px] duration-155 border flex items-center justify-center cursor-pointer ${
                                                    isItalic
                                                      ? "bg-indigo-500 text-white border-indigo-400"
                                                      : currentIsLight
                                                        ? "bg-white border-slate-200 hover:bg-slate-100"
                                                        : "bg-neutral-800 border-white/10"
                                                  }`}
                                                >
                                                  I
                                                </button>

                                                {/* Underline Toggle */}
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateWidgetPos(
                                                      widget.id,
                                                      {
                                                        settings: {
                                                          ...wStyle,
                                                          underline:
                                                            !isUnderline,
                                                        },
                                                      },
                                                    );
                                                  }}
                                                  className={`p-1 w-5 h-5 rounded underline text-[9px] duration-155 border flex items-center justify-center cursor-pointer ${
                                                    isUnderline
                                                      ? "bg-indigo-500 text-white border-indigo-400"
                                                      : currentIsLight
                                                        ? "bg-white border-slate-200 hover:bg-slate-100"
                                                        : "bg-neutral-800 border-white/10"
                                                  }`}
                                                >
                                                  U
                                                </button>

                                                <div className="h-4 w-[1px] bg-slate-200/60 dark:bg-white/10 mx-0.5" />

                                                {/* Palette */}
                                                <div className="flex gap-0.5">
                                                  {[
                                                    { code: "", label: "❌" },
                                                    {
                                                      code: "#ef4444",
                                                      label: "🔴",
                                                    },
                                                    {
                                                      code: "#f59e0b",
                                                      label: "🟡",
                                                    },
                                                    {
                                                      code: "#10b981",
                                                      label: "🟢",
                                                    },
                                                    {
                                                      code: "#3b82f6",
                                                      label: "🔵",
                                                    },
                                                    {
                                                      code: "#a855f7",
                                                      label: "🟣",
                                                    },
                                                  ].map((c) => (
                                                    <button
                                                      key={c.code}
                                                      type="button"
                                                      onClick={() => {
                                                        handleUpdateWidgetPos(
                                                          widget.id,
                                                          {
                                                            settings: {
                                                              ...wStyle,
                                                              color: c.code,
                                                            },
                                                          },
                                                        );
                                                      }}
                                                      className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] border transition-all cursor-pointer ${
                                                        textColor === c.code
                                                          ? "scale-110 border-indigo-500 ring-1 ring-indigo-500/20"
                                                          : "border-black/5 dark:border-white/5"
                                                      }`}
                                                      style={{
                                                        backgroundColor:
                                                          c.code ||
                                                          "transparent",
                                                      }}
                                                      title={
                                                        c.code ||
                                                        "Standardfarbe"
                                                      }
                                                    >
                                                      {c.code === ""
                                                        ? "❌"
                                                        : ""}
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* Live interactive preview as you type/style */}
                                              <div
                                                className={`p-2.5 rounded-xl border border-dashed text-center min-h-[50px] flex items-center justify-center shrink-0 max-h-[140px] overflow-y-auto ${
                                                  currentIsLight
                                                    ? "bg-slate-50/50 border-slate-200 text-slate-800"
                                                    : "bg-[#18181b]/40 border-white/5 text-white"
                                                }`}
                                              >
                                                <div className="flex flex-col w-full">
                                                  <span className="text-[7px] font-mono text-slate-450 uppercase mb-1 block select-none">
                                                    Live-Vorschau
                                                  </span>
                                                  <p
                                                    className={`leading-normal whitespace-pre-wrap break-all w-full ${
                                                      isBold
                                                        ? "font-black"
                                                        : "font-semibold"
                                                    } ${isItalic ? "italic" : ""} ${isUnderline ? "underline" : ""}`}
                                                    style={{
                                                      fontFamily:
                                                        getFontFamilyValue(
                                                          fontFamily,
                                                        ),
                                                      fontSize: `${sizeVal}px`,
                                                      color:
                                                        textColor || undefined,
                                                    }}
                                                  >
                                                    {instructionInput ||
                                                      "Geben Sie einen Text ein..."}
                                                  </p>
                                                </div>
                                              </div>

                                              <textarea
                                                className={`flex-grow w-full p-2.5 rounded-xl text-[10px] font-bold outline-none resize-none border focus:ring-2 focus:ring-indigo-500/20 ${
                                                  currentIsLight
                                                    ? "bg-slate-50 border-slate-200 text-slate-800"
                                                    : "bg-[#18181b] border-white/5 text-white"
                                                }`}
                                                value={instructionInput}
                                                onChange={(e) =>
                                                  setInstructionInput(
                                                    e.target.value,
                                                  )
                                                }
                                                onKeyDown={(e) => {
                                                  if (e.key === "Escape")
                                                    setIsEditingInstructions(
                                                      false,
                                                    );
                                                }}
                                                autoFocus
                                                placeholder="Text eingeben..."
                                              />
                                              <div className="flex gap-1.5 shrink-0 justify-end">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    setIsEditingInstructions(
                                                      false,
                                                    )
                                                  }
                                                  className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase border cursor-pointer ${
                                                    currentIsLight
                                                      ? "bg-slate-50 border-slate-200 hover:bg-slate-100"
                                                      : "bg-zinc-800 border-white/10 hover:bg-zinc-700"
                                                  }`}
                                                >
                                                  Abbrechen
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setApp((prev) => ({
                                                      ...prev,
                                                      vertretungHinweise:
                                                        instructionInput,
                                                    }));
                                                    setIsEditingInstructions(
                                                      false,
                                                    );
                                                  }}
                                                  className="px-2.5 py-0.5 rounded-lg bg-indigo-500 text-white font-extrabold text-[9px] uppercase tracking-wider cursor-pointer hover:bg-indigo-600 shadow"
                                                >
                                                  Speichern
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div
                                              onClick={() => {
                                                setInstructionInput(
                                                  text ===
                                                    "Anweisung hier tippen..."
                                                    ? ""
                                                    : text,
                                                );
                                                setIsEditingInstructions(true);
                                              }}
                                              className={`flex-grow flex items-center justify-center text-center p-2 rounded-xl border border-dashed transition-all cursor-pointer pointer-events-auto ${
                                                currentIsLight
                                                  ? "hover:bg-slate-50 hover:border-slate-300 border-slate-200/60"
                                                  : "hover:bg-white/5 hover:border-white/20 border-white/5"
                                              }`}
                                            >
                                              <p
                                                className={`leading-normal transition-all select-all whitespace-pre-wrap break-all w-full ${
                                                  isBold
                                                    ? "font-black"
                                                    : "font-semibold"
                                                } ${isItalic ? "italic" : ""} ${
                                                  isUnderline ? "underline" : ""
                                                }`}
                                                style={{
                                                  fontFamily:
                                                    getFontFamilyValue(
                                                      fontFamily,
                                                    ),
                                                  fontSize: `${sizeVal}px`,
                                                  color: textColor || undefined,
                                                }}
                                              >
                                                {text}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    }

                                    case "noisemeter":
                                      return (
                                        <NoiseMeterWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "vocabulary":
                                      return (
                                        <LernwoerterWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          showSettings={
                                            widgetSettingsOpenId === widget.id
                                          }
                                          onCloseSettings={() =>
                                            setWidgetSettingsOpenId(null)
                                          }
                                        />
                                      );
                                    case "kidattendance":
                                      return (
                                        <KidAttendanceWidgetContent
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                        />
                                      );

                                    case "groups":
                                      return (
                                        <GroupsWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          generatedGroups={generatedGroups}
                                          setGeneratedGroups={
                                            setGeneratedGroups
                                          }
                                          generateGroups={generateGroups}
                                          currentIsLight={currentIsLight}
                                          settingsInPicker={isAddWidgetMenuOpen && isWidgetConfigurationOpen && selectedWidgetConfiguration === "groups"}
                                          onClosePickerSettings={() => setIsWidgetConfigurationOpen(false)}
                                        />
                                      );

                                    case "qrcode":
                                      return (
                                        <QrCodeWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          showSettings={
                                            widgetSettingsOpenId === widget.id
                                          }
                                          onCloseSettings={() =>
                                            setWidgetSettingsOpenId(null)
                                          }
                                          currentIsLight={currentIsLight}
                                          isFullscreen={false}
                                        />
                                      );

                                    case "image":
                                      return (
                                        <ImageWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          showSettings={
                                            widgetSettingsOpenId === widget.id
                                          }
                                          onCloseSettings={() =>
                                            setWidgetSettingsOpenId(null)
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "drawing":
                                      return (
                                        <DrawingWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          onOpenInTafel={() => setIsTafelOpen(true)}
                                          showSettings={
                                            widgetSettingsOpenId === widget.id
                                          }
                                          onCloseSettings={() =>
                                            setWidgetSettingsOpenId(null)
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "pet":
                                      return (
                                        <PetWidgetContent
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "weather":
                                      return (
                                        <WeatherWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "aiquiz":
                                      return (
                                        <AIQuizWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "scoreboard":
                                      return (
                                        <ScoreboardWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "wheel":
                                      return (
                                        <WheelWidgetContent
                                          widget={widget}
                                          app={app}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "breathing":
                                      return (
                                        <BreathingWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "kidweather":
                                      return (
                                        <KidWeatherWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "kopfrechnen":
                                    case "mathcards":
                                    case "multitrainer":
                                    case "mathchain":
                                      return (
                                        <KopfrechenStudioContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "scrambler":
                                      return (
                                        <ScramblerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "watertracker":
                                      return (
                                        <WatertrackerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "wordchain":
                                      return (
                                        <WordchainWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "moodmeter":
                                      return (
                                        <MoodmeterWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "colormixer":
                                      return (
                                        <ColormixerWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "riddle":
                                      return (
                                        <RiddleWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "stopwatch":
                                      return (
                                        <StopwatchWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "calculator":
                                      return (
                                        <CalculatorWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "dice":
                                      return (
                                        <DiceWidgetContent
                                          widget={widget}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "phases":
                                      return (
                                        <PhasesWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          lessonPhases={lessonPhases}
                                          setLessonPhases={setLessonPhases}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "sounds":
                                      return (
                                        <SoundsWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          playSound={playSound}
                                          currentIsLight={currentIsLight}
                                        />
                                      );

                                    case "todo":
                                      return (
                                        <TodoWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          isFullscreen={
                                            fullscreenWidgetId === widget.id
                                          }
                                        />
                                      );

                                    case "dienste":
                                      return (
                                        <DiensteWidgetContent
                                          widget={widget}
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                          isFullscreen={false}
                                        />
                                      );

                                    case "klassenglas":
                                      return (
                                        <ClassRewardWidget
                                          app={app}
                                          setApp={setApp}
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          currentIsLight={currentIsLight}
                                          activeFokusThemeVars={
                                            activeFokusThemeVars
                                          }
                                          isFullscreen={false}
                                        />
                                      );

                                    case "links":
                                      return (
                                        <LinksWidgetContent
                                          widget={widget}
                                          onUpdate={(updates) =>
                                            handleUpdateWidgetPos(
                                              widget.id,
                                              updates,
                                            )
                                          }
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                          isFullscreen={false}
                                        />
                                      );

                                    case "timeline":
                                      return (
                                        <TimelineWidgetContent
                                          app={app}
                                          setApp={setApp}
                                          currentIsLight={currentIsLight}
                                          widget={widget}
                                        />
                                      );

                                    default:
                                      return <div>Unknown Widget</div>;
                                  }
                                })()}
                              </CockpitWidget>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Sidebar toggle floating handle when hidden */}
                  {sidebarMode === "hidden" && (
                    <button
                      onClick={() =>
                        changeSidebarMode(prevSidebarMode || "expanded")
                      }
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-6 h-14 bg-black/20 hover:bg-black/60 dark:bg-white/10 dark:hover:bg-white/20 border-y border-l border-white/10 text-neutral-500 hover:text-white rounded-l-xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md group"
                      title="Schülerliste einblenden"
                    >
                      <ChevronLeft
                        size={16}
                        className="stroke-[3] group-hover:-translate-x-0.5 transition-transform"
                      />
                    </button>
                  )}
                </div>

                {/* RIGHT COLUMN: STUDENT LIST SIDEBAR */}
                <AnimatePresence initial={false}>
                  {sidebarMode !== "hidden" && (
                    <motion.div
                      ref={sidebarRef}
                      initial={{ width: 0, opacity: 0, x: 24 }}
                      animate={{
                        width: sidebarMode === "mini" ? 240 : 335,
                        opacity: 1,
                        x: 0,
                      }}
                      exit={{
                        width: 0,
                        opacity: 0,
                        x: 24,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 32,
                      }}
                      className={`flex flex-col ${activePultThemeVars.box} rounded-2xl border ${activePultThemeVars.border} overflow-hidden min-h-0 relative shrink-0 dim-in-focus group/sidebar`}
                    >
                      {/* Subtle Collapse Toggle Handle inside the sidebar edge */}
                      <button
                        onClick={() => changeSidebarMode("hidden")}
                        className="absolute left-0 top-1/2 -translate-y-1/2 z-50 w-6 h-14 bg-black/10 hover:bg-rose-500/80 dark:bg-black/30 dark:hover:bg-rose-600/90 border-y border-r border-transparent hover:border-rose-400/50 text-neutral-400 hover:text-white rounded-r-xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm opacity-0 group-hover/sidebar:opacity-100 group/btn"
                        title="Seitenleiste einfahren"
                      >
                        <ChevronRight
                          size={16}
                          className="stroke-[3] group-hover/btn:translate-x-0.5 transition-transform"
                        />
                      </button>

                      {/* Compact Header with state controls */}
                      <div className="p-2.5 border-b border-neutral-200/40 dark:border-white/5 bg-black/10 dark:bg-black/40 flex flex-col gap-1.5 shrink-0">
                        {sidebarMode === "mini" && (
                          <div className="flex flex-col items-center gap-2 py-1 select-none w-full">
                            <button
                              type="button"
                              onClick={() => changeSidebarMode("expanded")}
                              title="Vollständige Liste"
                              className="w-8 h-8 rounded-full bg-neutral-800/40 hover:bg-neutral-800 dark:bg-white/5 dark:hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer border border-neutral-700/10"
                            >
                              <ChevronLeft size={16} className="stroke-[2.5]" />
                            </button>

                            <div className="h-[1px] w-full bg-neutral-200/10 dark:bg-white/5" />

                            <span
                              className="text-xl shrink-0 leading-none drop-shadow-sm"
                              title={`Fach: ${getActiveSubject()}`}
                            >
                              {getActiveSubject() === "Deutsch"
                                ? "📕"
                                : getActiveSubject() === "Mathematik"
                                  ? "🔢"
                                  : "🏫"}
                            </span>

                            <button
                              type="button"
                              onClick={() => changeSidebarMode("hidden")}
                              title="Schülerliste ganz ausblenden"
                              className="w-6 h-6 rounded-lg text-neutral-450 hover:text-rose-450 hover:bg-rose-500/10 cursor-pointer transition-all flex items-center justify-center shrink-0"
                            >
                              <X size={12} className="stroke-[2.5]" />
                            </button>
                          </div>
                        )}

                        {sidebarMode === "expanded" && (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-[9px] font-black uppercase ${currentIsLight ? "text-slate-400" : "text-neutral-450"}`}
                              >
                                Aktuelles Fach:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                    currentIsLight
                                      ? "bg-slate-100 text-slate-700 border border-slate-200"
                                      : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-sm"
                                  }`}
                                >
                                  {getActiveSubject()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div
                        className={`flex-1 overflow-y-auto no-scrollbar py-3 ${sidebarMode === "mini" ? "px-1 space-y-3.5" : "px-2.5 space-y-2"}`}
                      >
                        <StudentListWidgetContent
                          key={app.activeClassId || 'no-class'}
                          app={app}
                          getTodayPoints={getTodayPoints}
                          addParticipation={addParticipation}
                          removeParticipation={removeParticipation}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      )}

      {/* FOKUS BOTTOM DOCK */}
      {false && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1.5 rounded-full border border-white/10 shadow-2xl z-[100001] opacity-0 hover:opacity-100 transition-opacity duration-300 group/fokusdock`}
        >
          <div className="absolute inset-0 -top-8 -bottom-8 -left-8 -right-8 pointer-events-auto" />
          <div className="flex items-center gap-1 relative z-10">
            {[
              { id: "helfer", icon: Users, label: "HELFER" },
              { id: "stundenplan", icon: Calendar, label: "STUNDENPLAN" },
              { id: "klassenglas", icon: GlassWater, label: "KLASSENGLAS" },
              { id: "termine", icon: Bell, label: "TERMINE" },
              { id: "tagesbester", icon: Star, label: "TAGESBESTER" },
              { id: "wochenbester", icon: Trophy, label: "WOCHENBESTER" },
              { id: "klassenspiegel", icon: Activity, label: "SPIEGEL" },
            ].map((item) => {
              const isVisible =
                widgetVisibility[item.id as keyof typeof widgetVisibility];
              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setWidgetVisibility((p) => ({
                      ...p,
                      [item.id]: !isVisible,
                    }))
                  }
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all group relative border border-transparent ${isVisible ? "bg-white/20 text-white shadow-inner" : "text-white/40 hover:bg-white/10 hover:text-white/80"}`}
                >
                  <item.icon size={16} strokeWidth={2} />
                  <span
                    className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-white/10 shadow-xl pointer-events-none whitespace-nowrap`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}

            <div className="w-px h-6 bg-white/20 mx-1" />

            <button
              onClick={() => setUseShortNames(!useShortNames)}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all group relative border border-transparent ${useShortNames ? "bg-blue-500/30 text-blue-300 shadow-inner" : "text-white/40 hover:bg-white/10 hover:text-white/80"}`}
            >
              <Type size={16} strokeWidth={2} />
              <span
                className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border border-white/10 shadow-xl pointer-events-none whitespace-nowrap`}
              >
                NAMEN: {useShortNames ? "KÜRZEL" : "VOLL"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* DRAGGABLE WIDGETS */}
      {portalTarget &&
        createPortal(
          <>
            <AnimatePresence>
              {true &&
                (app.boardWidgets || [])
                  .filter(
                    (w) =>
                      ![
                        "links",
                        "sounds",
                        "classpet",
                        "timer",
                        "ampel",
                        "lottowinner",
                        "laerm",
                        "lernwoerter",
                        "groups",
                        "qrcode",
                      ].includes(w.type),
                  )
                  .map((widget) => (
                    <motion.div
                      key={widget.id}
                      data-classpet-widget="true"
                      data-widget-type={widget.type}
                      drag
                      dragConstraints={boardRef}
                      dragElastic={0.1}
                      dragMomentum={false}
                      whileDrag={{
                        scale: 1.03,
                        zIndex: 99999,
                        opacity: 0.95,
                        cursor: "grabbing",
                      }}
                      onDragEnd={(e, info) => {
                        const board = boardRef.current;
                        if (board) {
                          const boardRect = board.getBoundingClientRect();
                          // Find the actual widget container (the one with the z-50 class)
                          const target = (e.target as HTMLElement).closest(
                            ".z-50",
                          ) as HTMLElement;
                          if (!target) return;

                          const widgetRect = target.getBoundingClientRect();

                          // The actual new position we want to save
                          let nextX = widget.x + info.offset.x;
                          let nextY = widget.y + info.offset.y;

                          // Clamp based on ACTUAL current dimensions
                          // nextX/nextY represent the top-left corner relative to the board
                          nextX = Math.max(
                            0,
                            Math.min(nextX, boardRect.width - widgetRect.width),
                          );
                          nextY = Math.max(
                            0,
                            Math.min(
                              nextY,
                              boardRect.height - widgetRect.height,
                            ),
                          );

                          updateWidgetPos(widget.id, nextX, nextY);
                        }
                      }}
                      animate={{
                        x: widget.x,
                        y: widget.y,
                        scale:
                          widget.scale ||
                          (fullscreenWidgetId === widget.id ? 1.5 : 1),
                        opacity: 1,
                        width: fullscreenWidgetId === widget.id ? 800 : "auto", // Large fixed size instead of 100%
                        height: fullscreenWidgetId === widget.id ? 600 : "auto",
                      }}
                      initial={{
                        opacity: 0,
                        scale: 0.5,
                        x: widget.x,
                        y: widget.y,
                      }}
                      transition={{
                        type: "spring",
                        damping: 40,
                        stiffness: 600,
                        // Shorter duration for scale to feel snappier
                        scale: { duration: 0.2 },
                        // No transition for x/y when state update happens after drag end
                        // to prevent the "jumping back" spring effect
                        x: { type: "tween", duration: 0.2 },
                        y: { type: "tween", duration: 0.2 },
                      }}
                      className={`absolute z-50 transform-gpu will-change-transform select-none board-widget-element ${fullscreenWidgetId === widget.id ? "" : "cursor-move active:cursor-grabbing"}`}
                      data-widget-id={widget.id}
                      style={{
                        top: 0,
                        left: 0,
                        transformOrigin: "top left",
                        zIndex: fullscreenWidgetId === widget.id ? 99999 : 50,
                      }}
                    >
                      <div
                        className={`${activePultThemeVars.box} ${activePultThemeVars.border1} rounded-[2rem] shadow-2xl p-5 ${fullscreenWidgetId === widget.id ? "w-full h-full" : widget.type === "groups" ? "min-w-[340px]" : "min-w-[240px]"} relative group transition-all duration-300 ${fullscreenWidgetId === widget.id ? "" : "hover:scale-[1.02]"} overflow-hidden group/widget flex flex-col`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <div
                          className={`flex justify-between items-center ${fullscreenWidgetId === widget.id ? "mb-1 shrink-0" : "mb-3"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[9px] font-black uppercase tracking-[0.2em]"
                              style={{
                                color: currentTheme.colors.textSecondary,
                              }}
                            >
                              {widget.type}
                            </span>
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onPointerDown={(e) => {
                                  e.stopPropagation();
                                  setOpenSettingsId(
                                    openSettingsId === widget.id
                                      ? null
                                      : widget.id,
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-all ${openSettingsId === widget.id ? "shadow-lg scale-110 opacity-100" : "hover:bg-white/10"} ${!sidebarOpen ? "opacity-60 hover:opacity-100" : "opacity-80 hover:opacity-100"}`}
                                style={{
                                  backgroundColor:
                                    openSettingsId === widget.id
                                      ? currentTheme.colors.accent
                                      : `${currentTheme.colors.textPrimary}0d`,
                                  color:
                                    openSettingsId === widget.id
                                      ? currentTheme.colors.buttonText
                                      : currentTheme.colors.textSecondary,
                                }}
                                title="Einstellungen"
                              >
                                <Settings2 size={13} />
                              </button>
                              {(widget.type === "quiz" ||
                                widget.type === "mindmap" ||
                                widget.type === "lottowinner" ||
                                widget.type === "riddle") && (
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() =>
                                    setFullscreenWidgetId(
                                      fullscreenWidgetId === widget.id
                                        ? null
                                        : widget.id,
                                    )
                                  }
                                  className={`p-1.5 rounded-lg transition-all hover:bg-white/10 ${!sidebarOpen ? "opacity-60 hover:opacity-100" : "opacity-80 hover:opacity-100"}`}
                                  style={{
                                    color: currentTheme.colors.textSecondary,
                                  }}
                                  title="Vollbild umschalten"
                                >
                                  <Maximize2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => removeWidget(widget.id)}
                            className="p-1 hover:bg-white/10 rounded-lg text-rose-500 transition-colors opacity-60 hover:opacity-100"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        {/* Settings Popover */}
                        <AnimatePresence>
                          {openSettingsId === widget.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="widget-settings-panel absolute top-10 left-0 right-0 z-[100] backdrop-blur-xl border rounded-xl p-4 shadow-2xl transition-colors duration-700 overflow-auto resize"
                              style={{
                                backgroundColor: `${currentTheme.colors.surface}f9`,
                                borderColor: currentTheme.colors.border,
                              }}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="p-1.5 rounded-lg"
                                    style={{
                                      backgroundColor: `${currentTheme.colors.accent}1a`,
                                    }}
                                  >
                                    <Sliders
                                      size={12}
                                      style={{
                                        color: currentTheme.colors.accent,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className="text-[10px] font-black uppercase tracking-tight"
                                    style={{
                                      color: currentTheme.colors.textSecondary,
                                    }}
                                  >
                                    Einstell. {widget.type}
                                  </span>
                                </div>
                                <button
                                  onClick={() => setOpenSettingsId(null)}
                                  className="p-1 rounded-lg transition-colors"
                                  style={{
                                    color: `${currentTheme.colors.textPrimary}4d`,
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>

                              <div className="space-y-4">
                                <div
                                  className="flex justify-between items-center text-[8px] font-black uppercase"
                                  style={{
                                    color: currentTheme.colors.textMuted,
                                  }}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <Sliders size={8} /> Größe
                                  </span>
                                  <span
                                    className="font-black tabular-nums"
                                    style={{
                                      color: currentTheme.colors.accent,
                                    }}
                                  >
                                    {Math.round((widget.scale || 1) * 100)}%
                                  </span>
                                </div>
                                <input
                                  type="range"
                                  min="0.5"
                                  max="2"
                                  step="0.01"
                                  value={widget.scale || 1}
                                  onChange={(e) =>
                                    setWidgetScale(
                                      widget.id,
                                      parseFloat(e.target.value),
                                    )
                                  }
                                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                                  style={{
                                    backgroundColor: `${currentTheme.colors.textPrimary}1a`,
                                    accentColor: currentTheme.colors.accent,
                                  }}
                                />
                                <div
                                  className="text-[7px] italic"
                                  style={{
                                    color: currentTheme.colors.textMuted,
                                  }}
                                >
                                  Pfeiltasten ←/→ für Feinjustierung
                                </div>

                                <div className="flex gap-2 pt-1">
                                  <button
                                    onClick={() => setWidgetScale(widget.id, 1)}
                                    className="flex-1 py-2 border rounded-lg text-[8px] font-black uppercase transition-all flex items-center justify-center gap-1.5"
                                    style={{
                                      backgroundColor: `${currentTheme.colors.textPrimary}0d`,
                                      borderColor: currentTheme.colors.border,
                                      color: currentTheme.colors.textSecondary,
                                    }}
                                  >
                                    <RotateCcw size={10} />
                                    Reset
                                  </button>
                                  <button
                                    onClick={() => setOpenSettingsId(null)}
                                    className="flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all"
                                    style={{
                                      backgroundColor:
                                        currentTheme.colors.accent,
                                      color: currentTheme.colors.buttonText,
                                    }}
                                  >
                                    Schließen
                                  </button>
                                </div>
                              </div>

                              <div
                                className="mt-3 pt-3 border-t text-[7px] text-center italic"
                                style={{
                                  borderColor: currentTheme.colors.border,
                                  color: currentTheme.colors.textMuted,
                                }}
                              >
                                Änderungen werden sofort sichtbar.
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="pointer-events-auto cursor-default">
                          {widget.type === "timer" && (
                            <div className="space-y-4">
                              <div className="flex justify-center mb-2">
                                <div className="flex bg-surface2/20 p-0.5 rounded-lg border border-border/10">
                                  {(
                                    [
                                      "digital",
                                      "hourglass",
                                      "circle",
                                      "stoppuhr",
                                    ] as const
                                  ).map((t) => (
                                    <button
                                      key={t}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() =>
                                        setApp((prev) => ({
                                          ...prev,
                                          boardSettings: {
                                            ...prev.boardSettings,
                                            timerType: t,
                                          },
                                        }))
                                      }
                                      className={`px-2 py-1 rounded-md text-[7px] font-black uppercase transition-all ${app.boardSettings.timerType === t ? "bg-amber-500 text-amber-950 shadow-lg" : "text-text-muted hover:text-text-primary"}`}
                                    >
                                      {t}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {app.boardSettings.timerType === "stoppuhr" ? (
                                <div className="text-center space-y-4 mt-4">
                                  <div className="text-5xl font-black tabular-nums tracking-tighter text-blue-400">
                                    {Math.floor(stopwatchSec / 60)
                                      .toString()
                                      .padStart(2, "0")}
                                    :
                                    {(stopwatchSec % 60)
                                      .toString()
                                      .padStart(2, "0")}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() =>
                                        setStopwatchRunning(!stopwatchRunning)
                                      }
                                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${stopwatchRunning ? "bg-rose-500/20 border-rose-500/30 text-rose-500 hover:bg-rose-500/30" : "bg-blue-500/20 border-blue-500/30 text-blue-500 hover:bg-blue-500/30"}`}
                                    >
                                      {stopwatchRunning ? (
                                        <Pause size={12} className="mx-auto" />
                                      ) : (
                                        <Play size={12} className="mx-auto" />
                                      )}
                                    </button>
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => {
                                        setStopwatchSec(0);
                                        setStopwatchRunning(false);
                                      }}
                                      className="p-2 bg-surface2/20 rounded-lg border border-border/20 hover:bg-surface2/30 text-text-primary flex-none transition-all"
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="h-32 flex flex-col items-center justify-center relative z-0">
                                    {(app.boardSettings.timerType ===
                                      "digital" ||
                                      !app.boardSettings.timerType) && (
                                      <div
                                        className={`font-black tabular-nums tracking-tighter transition-all duration-300 ${(() => {
                                          const total =
                                            app.boardSettings?.timerTotal || 60;
                                          const pct =
                                            total > 0
                                              ? timerDisplaySec / total
                                              : 0;
                                          const col =
                                            timerDisplaySec === 0
                                              ? "rose"
                                              : pct > 0.5
                                                ? "emerald"
                                                : pct > 0.15
                                                  ? "amber"
                                                  : "rose";
                                          return col === "emerald"
                                            ? "text-emerald-500"
                                            : col === "amber"
                                              ? "text-amber-500"
                                              : "text-rose-500 animate-pulse scale-105";
                                        })()} ${fullscreenWidgetId === widget.id ? "text-9xl scale-125" : "text-5xl"}`}
                                      >
                                        {Math.floor(timerDisplaySec / 60)
                                          .toString()
                                          .padStart(2, "0")}
                                        :
                                        {(timerDisplaySec % 60)
                                          .toString()
                                          .padStart(2, "0")}
                                      </div>
                                    )}

                                    {app.boardSettings.timerType ===
                                      "hourglass" && (
                                      <div
                                        className={`relative transition-all duration-300 ${fullscreenWidgetId === widget.id ? "w-28 h-48 scale-125" : "w-16 h-28"}`}
                                      >
                                        {/* Glass Body */}
                                        <div className="absolute inset-0 border-2 border-border/20 rounded-2xl bg-surface/10 backdrop-blur-sm shadow-inner" />

                                        {/* Upper and Lower Chambers */}
                                        <div className="absolute top-1 left-2.5 right-2.5 bottom-1 flex flex-col gap-1.5 py-1">
                                          {/* Upper half */}
                                          <div className="flex-1 relative overflow-hidden bg-surface2/10 rounded-t-xl rounded-b-[40%]">
                                            <motion.div
                                              className={`absolute bottom-0 left-0 right-0 ${(() => {
                                                const total =
                                                  app.boardSettings
                                                    ?.timerTotal || 60;
                                                const pct =
                                                  total > 0
                                                    ? timerDisplaySec / total
                                                    : 0;
                                                const col =
                                                  timerDisplaySec === 0
                                                    ? "rose"
                                                    : pct > 0.5
                                                      ? "emerald"
                                                      : pct > 0.15
                                                        ? "amber"
                                                        : "rose";
                                                return col === "emerald"
                                                  ? "bg-gradient-to-t from-emerald-500/90 to-emerald-400/40"
                                                  : col === "amber"
                                                    ? "bg-gradient-to-t from-amber-500/90 to-amber-400/40"
                                                    : "bg-gradient-to-t from-rose-500/90 to-rose-400/40";
                                              })()}`}
                                              animate={{
                                                height: `${(timerDisplaySec / (app.boardSettings.timerTotal || 60)) * 100}%`,
                                              }}
                                              transition={{
                                                type: "tween",
                                                ease: "linear",
                                              }}
                                            />
                                          </div>

                                          {/* Neck with falling sand animation */}
                                          <div className="h-1 relative flex justify-center z-20">
                                            {app.boardSettings.timerRunning &&
                                              timerDisplaySec > 0 && (
                                                <motion.div
                                                  className={`w-0.5 h-14 absolute top-0 ${(() => {
                                                    const total =
                                                      app.boardSettings
                                                        ?.timerTotal || 60;
                                                    const pct =
                                                      total > 0
                                                        ? timerDisplaySec /
                                                          total
                                                        : 0;
                                                    const col =
                                                      timerDisplaySec === 0
                                                        ? "rose"
                                                        : pct > 0.5
                                                          ? "emerald"
                                                          : pct > 0.15
                                                            ? "amber"
                                                            : "rose";
                                                    return col === "emerald"
                                                      ? "bg-emerald-400"
                                                      : col === "amber"
                                                        ? "bg-amber-400"
                                                        : "bg-rose-400";
                                                  })()}`}
                                                  animate={{
                                                    opacity: [0.4, 0.9, 0.4],
                                                    scaleY: [1, 1.2, 1],
                                                    translateX: [
                                                      "-50%",
                                                      "-50%",
                                                    ],
                                                  }}
                                                  transition={{
                                                    repeat: Infinity,
                                                    duration: 0.5,
                                                    ease: "linear",
                                                  }}
                                                />
                                              )}
                                          </div>

                                          {/* Lower half */}
                                          <div className="flex-1 relative overflow-hidden bg-surface2/10 rounded-b-xl rounded-t-[40%]">
                                            <motion.div
                                              className={`absolute bottom-0 left-0 right-0 ${(() => {
                                                const total =
                                                  app.boardSettings
                                                    ?.timerTotal || 60;
                                                const pct =
                                                  total > 0
                                                    ? timerDisplaySec / total
                                                    : 0;
                                                const col =
                                                  timerDisplaySec === 0
                                                    ? "rose"
                                                    : pct > 0.5
                                                      ? "emerald"
                                                      : pct > 0.15
                                                        ? "amber"
                                                        : "rose";
                                                return col === "emerald"
                                                  ? "bg-gradient-to-t from-emerald-600 to-emerald-500/60"
                                                  : col === "amber"
                                                    ? "bg-gradient-to-t from-amber-600 to-amber-500/60"
                                                    : "bg-gradient-to-t from-rose-600 to-rose-500/60";
                                              })()}`}
                                              animate={{
                                                height: `${(1 - timerDisplaySec / (app.boardSettings.timerTotal || 60)) * 100}%`,
                                              }}
                                              transition={{
                                                type: "tween",
                                                ease: "linear",
                                              }}
                                            />
                                          </div>
                                        </div>

                                        {/* Decorative End Caps */}
                                        <div className="absolute -top-0.5 left-0 right-0 h-1 bg-border/20 rounded-full" />
                                        <div className="absolute -bottom-0.5 left-0 right-0 h-1 bg-border/20 rounded-full" />

                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <div
                                            className={`text-[10px] font-black bg-surface/60 shadow-xl backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-border/10 ${(() => {
                                              const total =
                                                app.boardSettings?.timerTotal ||
                                                60;
                                              const pct =
                                                total > 0
                                                  ? timerDisplaySec / total
                                                  : 0;
                                              const col =
                                                timerDisplaySec === 0
                                                  ? "rose"
                                                  : pct > 0.5
                                                    ? "emerald"
                                                    : pct > 0.15
                                                      ? "amber"
                                                      : "rose";
                                              return col === "emerald"
                                                ? "text-emerald-500"
                                                : col === "amber"
                                                  ? "text-amber-500"
                                                  : "text-rose-500 animate-pulse";
                                            })()}`}
                                          >
                                            {Math.floor(timerDisplaySec / 60)}m
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {app.boardSettings.timerType ===
                                      "circle" && (
                                      <div
                                        className={`relative flex items-center justify-center p-6 pointer-events-none transition-all duration-300 ${fullscreenWidgetId === widget.id ? "w-[380px] h-[380px] scale-110" : "w-56 h-56"}`}
                                      >
                                        <svg
                                          viewBox="-5 -5 110 110"
                                          className="w-full h-full -rotate-90 overflow-visible pointer-events-none transition-all duration-300"
                                          style={{
                                            filter: `drop-shadow(0 0 40px ${(() => {
                                              const total =
                                                app.boardSettings?.timerTotal ||
                                                60;
                                              const pct =
                                                total > 0
                                                  ? timerDisplaySec / total
                                                  : 0;
                                              const col =
                                                timerDisplaySec === 0
                                                  ? "rose"
                                                  : pct > 0.5
                                                    ? "emerald"
                                                    : pct > 0.15
                                                      ? "amber"
                                                      : "rose";
                                              return col === "emerald"
                                                ? "rgba(16,185,129,0.6)"
                                                : col === "amber"
                                                  ? "rgba(245,158,11,0.6)"
                                                  : "rgba(244,63,94,0.6)";
                                            })()})`,
                                          }}
                                        >
                                          <circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            className="stroke-text-primary/5 fill-none"
                                            strokeWidth="6"
                                          />
                                          <motion.circle
                                            cx="50"
                                            cy="50"
                                            r="45"
                                            className={`fill-none transition-all duration-500 ${(() => {
                                              const total =
                                                app.boardSettings?.timerTotal ||
                                                60;
                                              const pct =
                                                total > 0
                                                  ? timerDisplaySec / total
                                                  : 0;
                                              const col =
                                                timerDisplaySec === 0
                                                  ? "rose"
                                                  : pct > 0.5
                                                    ? "emerald"
                                                    : pct > 0.15
                                                      ? "amber"
                                                      : "rose";
                                              return col === "emerald"
                                                ? "stroke-emerald-500"
                                                : col === "amber"
                                                  ? "stroke-amber-400"
                                                  : "stroke-rose-500";
                                            })()}`}
                                            strokeWidth="6"
                                            strokeDasharray={283}
                                            animate={{
                                              strokeDashoffset:
                                                283 *
                                                (1 -
                                                  timerDisplaySec /
                                                    (app.boardSettings
                                                      .timerTotal || 60)),
                                            }}
                                            transition={{
                                              type: "tween",
                                              ease: "linear",
                                            }}
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                          <div
                                            className={`font-black tabular-nums tracking-tighter transition-all duration-300 ${(() => {
                                              const total =
                                                app.boardSettings?.timerTotal ||
                                                60;
                                              const pct =
                                                total > 0
                                                  ? timerDisplaySec / total
                                                  : 0;
                                              const col =
                                                timerDisplaySec === 0
                                                  ? "rose"
                                                  : pct > 0.5
                                                    ? "emerald"
                                                    : pct > 0.15
                                                      ? "amber"
                                                      : "rose";
                                              return col === "emerald"
                                                ? "text-emerald-400"
                                                : col === "amber"
                                                  ? "text-amber-400"
                                                  : "text-rose-400 animate-pulse";
                                            })()} ${fullscreenWidgetId === widget.id ? "text-7xl" : "text-4xl"}`}
                                          >
                                            {Math.floor(timerDisplaySec / 60)}:
                                            {(timerDisplaySec % 60)
                                              .toString()
                                              .padStart(2, "0")}
                                          </div>
                                          <div className="text-[8px] font-black uppercase text-text-muted/40 tracking-[0.2em] mt-1">
                                            sekunden
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-3 gap-1 relative z-10">
                                    {[1, 2, 5, 10, 15].map((m) => (
                                      <button
                                        key={m}
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
                                        onClick={() => startTimer(m)}
                                        className="p-1 bg-surface2/10 rounded border border-border/10 text-[8px] font-bold text-text-secondary hover:bg-amber-500 hover:text-amber-950 transition-colors flex items-center justify-center"
                                      >
                                        {m}m
                                      </button>
                                    ))}
                                    <form
                                      onSubmit={(e) => {
                                        e.preventDefault();
                                        const formData = new FormData(
                                          e.currentTarget,
                                        );
                                        const val = Number(
                                          formData.get("custom_time"),
                                        );
                                        if (val > 0) startTimer(val);
                                      }}
                                      className="relative flex"
                                    >
                                      <input
                                        type="number"
                                        name="custom_time"
                                        placeholder="min"
                                        className="w-full p-1 bg-surface2/10 rounded border border-border/10 text-[8px] font-bold text-text-secondary text-center focus:outline-none focus:bg-amber-500/20 focus:text-amber-500 appearance-none m-0"
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === " " ||
                                            e.key === "Enter"
                                          )
                                            e.stopPropagation();
                                        }}
                                      />
                                    </form>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() =>
                                        setApp((prev) => ({
                                          ...prev,
                                          boardSettings: {
                                            ...prev.boardSettings,
                                            timerRunning:
                                              !prev.boardSettings.timerRunning,
                                          },
                                        }))
                                      }
                                      className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${app.boardSettings.timerRunning ? "bg-rose-500/20 border-rose-500/30 text-rose-500 hover:bg-rose-500/30" : "bg-emerald-500/20 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/30"}`}
                                    >
                                      {app.boardSettings.timerRunning ? (
                                        <Pause size={12} className="mx-auto" />
                                      ) : (
                                        <Play size={12} className="mx-auto" />
                                      )}
                                    </button>
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() =>
                                        setApp((prev) => ({
                                          ...prev,
                                          boardSettings: {
                                            ...prev.boardSettings,
                                            timerRunning: false,
                                            timerEnd: 0,
                                          },
                                        }))
                                      }
                                      className="p-2 bg-surface2/20 rounded-lg border border-border/20 hover:bg-surface2/30 text-text-primary flex-none transition-all"
                                    >
                                      <RotateCcw size={12} />
                                    </button>
                                  </div>

                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      setShowZenFocus(true);
                                      if (
                                        !app.boardSettings.timerRunning &&
                                        timerDisplaySec === 0
                                      ) {
                                        startTimer(15);
                                      }
                                    }}
                                    className="w-full py-2 bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-500/30 hover:border-indigo-500/50 hover:from-indigo-900 hover:to-slate-800 text-indigo-300 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                                  >
                                    🧘 Zen-Kino-Fokus
                                  </button>
                                </>
                              )}
                            </div>
                          )}

                          {widget.type === "groups" && (
                            <div className="space-y-4">
                              <div className="flex bg-black/10 border border-white/10 rounded-lg p-1">
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() => setGroupsSettingsTab("zufall")}
                                  className={`flex-1 py-1 text-[9px] font-black uppercase rounded-md transition-all ${groupsSettingsTab === "zufall" ? "bg-amber-500 text-amber-950" : "text-white/40 hover:text-white/80"}`}
                                >
                                  Zufall
                                </button>
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={() => setGroupsSettingsTab("fixed")}
                                  className={`flex-1 py-1 text-[9px] font-black uppercase rounded-md transition-all ${groupsSettingsTab === "fixed" ? "bg-indigo-500 text-white" : "text-white/40 hover:text-white/80"}`}
                                >
                                  Gespeichert
                                </button>
                              </div>

                              {groupsSettingsTab === "zufall" ? (
                                <>
                                  <div className="flex flex-col gap-2">
                                    <div
                                      className={`flex ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"} p-1 rounded-xl border`}
                                    >
                                      {[
                                        {
                                          id: "count",
                                          label: "Anzahl Gruppen",
                                          icon: <Users size={10} />,
                                        },
                                        {
                                          id: "size",
                                          label: "Gruppengröße",
                                          icon: <GraduationCap size={10} />,
                                        },
                                      ].map((mode) => (
                                        <button
                                          key={mode.id}
                                          onPointerDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          onClick={() =>
                                            setApp((prev) => ({
                                              ...prev,
                                              boardSettings: {
                                                ...prev.boardSettings,
                                                groupMode: mode.id as any,
                                              },
                                            }))
                                          }
                                          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-[8px] font-black uppercase transition-all ${app.boardSettings.groupMode === mode.id ? "bg-amber-500 text-amber-950 shadow-lg" : "text-stone-500 hover:text-stone-300"}`}
                                        >
                                          {mode.icon}
                                          {mode.label}
                                        </button>
                                      ))}
                                    </div>

                                    <div className="grid grid-cols-4 gap-1.5">
                                      {(app.boardSettings.groupMode === "size"
                                        ? [2, 3, 4, 6]
                                        : [2, 3, 4, 5]
                                      ).map((num) => (
                                        <button
                                          key={num}
                                          onPointerDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setGroupCount(num);
                                            generateGroups(
                                              num,
                                              app.boardSettings.groupMode ===
                                                "size",
                                            );
                                          }}
                                          className={`py-2 rounded-xl border text-sm font-black transition-all active:scale-95 ${groupCount === num ? "bg-amber-500 border-amber-400 text-amber-950 shadow-md" : activeFokusThemeVars.isLight ? "bg-black/5 border-black/5 text-slate-600 hover:bg-black/10" : "bg-white/5 border-white/5 text-stone-500 hover:bg-white/10"}`}
                                        >
                                          {num}
                                          {app.boardSettings.groupMode ===
                                          "size"
                                            ? "er"
                                            : ""}
                                        </button>
                                      ))}
                                    </div>

                                    <select
                                      onPointerDown={(e) => e.stopPropagation()}
                                      value={
                                        app.boardSettings.groupStrategy ||
                                        "zufall"
                                      }
                                      onChange={(e) => {
                                        const strategy = e.target.value;
                                        setApp((prev: any) => ({
                                          ...prev,
                                          boardSettings: {
                                            ...prev.boardSettings,
                                            groupStrategy: strategy,
                                          },
                                        }));
                                        generateGroups(
                                          groupCount,
                                          app.boardSettings.groupMode ===
                                            "size",
                                          strategy,
                                        );
                                      }}
                                      className={`w-full text-[10px] font-bold p-2 mt-2 rounded-xl outline-none ${activeFokusThemeVars.isLight ? "bg-black/5 text-slate-700" : "bg-white/5 text-slate-300"}`}
                                    >
                                      <option value="zufall">Zufall</option>
                                      <option value="daz_mix">
                                        DAZ gut verteilen
                                      </option>
                                      <option value="gender_mix">
                                        Geschlechter mischen
                                      </option>
                                      <option value="leistungs_mix">
                                        Niveau (stark/schwach mix)
                                      </option>
                                      <option value="leistungs_homogen">
                                        Niveau (homogene Gruppen)
                                      </option>
                                      <option value="smart_ki">
                                        ✨ KI-optimierte Mischung
                                      </option>
                                    </select>
                                  </div>

                                  <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1.5 pr-1">
                                    {generatedGroups.map((g, i) => (
                                      <div
                                        key={i}
                                        className={`text-[9px] font-bold ${activeFokusThemeVars.isLight ? "text-slate-800 bg-black/5 border-black/5" : "text-stone-300 bg-white/5 border-white/5"} p-2 rounded-xl border leading-tight`}
                                      >
                                        <div className="text-[7px] font-black uppercase text-amber-500/60 mb-0.5">
                                          Gruppe {i + 1}
                                        </div>
                                        {g.join(", ")}
                                      </div>
                                    ))}
                                    {generatedGroups.length === 0 && (
                                      <div className="flex flex-col items-center justify-center py-4 text-stone-600 opacity-50">
                                        <Users size={24} className="mb-2" />
                                        <div className="text-[8px] font-black uppercase tracking-wider">
                                          Bereit zum Losen
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </>
                              ) : (
                                <div className="max-h-[300px] overflow-y-auto no-scrollbar space-y-2 pr-1">
                                  {!app.differenzierungsGruppen ||
                                  app.differenzierungsGruppen.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-4 text-stone-600 opacity-50 text-center">
                                      <span className="text-[8px] font-black uppercase tracking-wider">
                                        Keine Gruppen gespeichert.
                                        <br />
                                        (Unter Differenzierung)
                                      </span>
                                    </div>
                                  ) : (
                                    app.differenzierungsGruppen.map((g) => (
                                      <button
                                        key={g.id}
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const schuelerIds =
                                            g.schuelerIds || [];
                                          const names = schuelerIds.map(
                                            (sid) => {
                                              const s = app.schueler.find(
                                                (sch) => sch.id === sid,
                                              );
                                              return s
                                                ? `${s.vorname} ${s.nachname.charAt(0)}.`
                                                : "Unbekannt";
                                            },
                                          );
                                          setGeneratedGroups([names]);
                                        }}
                                        className={`w-full text-left p-2 rounded-xl transition-all border group/fg ${activeFokusThemeVars.isLight ? "bg-white border-black/10 hover:border-black/30" : "bg-black/20 border-white/10 hover:border-white/30"}`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <span
                                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${g.farbe}`}
                                          >
                                            {g.emoji}
                                          </span>
                                          <span
                                            className={`text-[10px] font-black uppercase ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-slate-200"}`}
                                          >
                                            {g.name}
                                          </span>
                                        </div>
                                        <div
                                          className={`text-[8px] leading-tight opacity-60 line-clamp-2 ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-slate-400"}`}
                                        >
                                          {g.schuelerIds
                                            .map(
                                              (sid) =>
                                                app.schueler.find(
                                                  (sch) => sch.id === sid,
                                                )?.vorname,
                                            )
                                            .filter(Boolean)
                                            .join(", ")}
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {widget.type === "poll" && (
                            <div className="space-y-2">
                              <div className="text-[8px] font-black uppercase text-center text-stone-500">
                                Stimmungsbild
                              </div>
                              <div className="flex gap-2 justify-center py-1">
                                {[
                                  {
                                    icon: "👍",
                                    color: "hover:bg-emerald-500/20",
                                  },
                                  {
                                    icon: "😐",
                                    color: "hover:bg-amber-500/20",
                                  },
                                  { icon: "👎", color: "hover:bg-rose-500/20" },
                                ].map((e) => (
                                  <button
                                    key={e.icon}
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className={`w-10 h-10 border rounded-xl text-xl transition-all ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"} ${e.color}`}
                                  >
                                    {e.icon}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {widget.type === "lottowinner" && (
                            <div
                              className={`py-2 flex items-center min-w-[220px] ${fullscreenWidgetId === widget.id ? "w-full h-full flex-row gap-12 justify-center px-12" : "space-y-4 flex-col"}`}
                            >
                              {/* Layout separation for fullscreen */}
                              <div
                                className={`flex flex-col gap-4 ${fullscreenWidgetId === widget.id ? "w-[280px] shrink-0 bg-black/5 p-6 rounded-3xl border border-black/5 shadow-inner" : "w-full"}`}
                              >
                                <div
                                  className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${activeFokusThemeVars.isLight ? "text-amber-600" : "text-amber-500/40"}`}
                                >
                                  Lotto-Picker
                                </div>

                                {/* Mode Select Tabs */}
                                <div
                                  className={`flex gap-1 w-full p-1.5 rounded-xl border no-print ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/10" : "bg-black/15 border-white/5"}`}
                                >
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setLottoMode("standard")}
                                    className={`flex-1 py-1.5 px-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                                      lottoMode === "standard"
                                        ? activeFokusThemeVars.isLight
                                          ? "bg-amber-500 text-amber-50 shadow-sm"
                                          : "bg-amber-500 text-stone-900 shadow-sm"
                                        : activeFokusThemeVars.isLight
                                          ? "text-slate-500 hover:text-slate-800 hover:bg-black/5"
                                          : "text-stone-400 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    Standard
                                  </button>
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => setLottoMode("wheel")}
                                    className={`flex-1 py-1.5 px-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                                      lottoMode === "wheel"
                                        ? activeFokusThemeVars.isLight
                                          ? "bg-amber-500 text-amber-50 shadow-sm"
                                          : "bg-amber-500 text-stone-900 shadow-sm"
                                        : activeFokusThemeVars.isLight
                                          ? "text-slate-500 hover:text-slate-800 hover:bg-black/5"
                                          : "text-stone-400 hover:text-white hover:bg-white/5"
                                    }`}
                                  >
                                    🎡 Glücksrad
                                  </button>
                                </div>

                                {/* Counts Panel */}
                                <div
                                  className={`w-full flex flex-col gap-1.5 p-3 rounded-2xl border ${activeFokusThemeVars.isLight ? "bg-white shadow-sm border-slate-200" : "bg-black/10 border-white/5"}`}
                                >
                                  <div
                                    className={`flex items-center justify-between text-[9px] font-black uppercase tracking-wider ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-text-secondary"}`}
                                  >
                                    <span>Wiederholen?</span>
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => setNoRepeats(!noRepeats)}
                                      className={`px-1.5 py-0.5 rounded transition-all font-black text-[7px] border`}
                                      style={{
                                        backgroundColor: noRepeats
                                          ? `${currentTheme.colors.accent}15`
                                          : "transparent",
                                        borderColor: noRepeats
                                          ? currentTheme.colors.accent
                                          : activeFokusThemeVars.isLight
                                            ? "rgba(0,0,0,0.1)"
                                            : "rgba(255,255,255,0.08)",
                                        color: noRepeats
                                          ? currentTheme.colors.accent
                                          : "inherit",
                                      }}
                                    >
                                      {noRepeats ? "Nein (Fix)" : "Ja (Mix)"}
                                    </button>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] font-bold">
                                    <span
                                      style={{
                                        color:
                                          currentTheme.colors.textSecondary,
                                      }}
                                    >
                                      Gezogen:
                                    </span>
                                    <div className="flex items-center gap-1 font-mono">
                                      <span
                                        style={{
                                          color:
                                            currentTheme.colors.textPrimary,
                                        }}
                                        className="font-black"
                                      >
                                        {selectedStudentIds.size}
                                      </span>
                                      <span
                                        className={
                                          activeFokusThemeVars.isLight
                                            ? "opacity-40"
                                            : "opacity-30"
                                        }
                                      >
                                        /
                                      </span>
                                      <span
                                        style={{
                                          color:
                                            currentTheme.colors.textSecondary,
                                        }}
                                      >
                                        {app.schueler.length} SuS
                                      </span>
                                      {selectedStudentIds.size > 0 && (
                                        <button
                                          onPointerDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          onClick={() =>
                                            setSelectedStudentIds(new Set())
                                          }
                                          className={`ml-1 p-0.5 rounded cursor-pointer transition-all ${activeFokusThemeVars.isLight ? "text-rose-600 hover:bg-rose-50" : "text-red-500 hover:bg-rose-500/10"}`}
                                          title="Gezogene Schüler zurücksetzen"
                                        >
                                          <RotateCcw size={10} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Mini Progress bar */}
                                  <div
                                    className={`w-full h-1.5 rounded-full overflow-hidden mt-0.5 ${activeFokusThemeVars.isLight ? "bg-slate-100" : "bg-neutral-800"}`}
                                  >
                                    <div
                                      className="h-full bg-emerald-500 transition-all duration-300"
                                      style={{
                                        width: `${(selectedStudentIds.size / Math.max(1, app.schueler.length)) * 100}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                {/* Standard Mode button shown at bottom of left panel if fullscreen */}
                                {lottoMode !== "wheel" &&
                                  fullscreenWidgetId === widget.id && (
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={startSpotlight}
                                      className="w-full mt-4 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                      style={{
                                        backgroundColor:
                                          currentTheme.colors.accent,
                                        color: currentTheme.colors.buttonText,
                                      }}
                                    >
                                      <Zap size={14} />
                                      Ziehen
                                    </button>
                                  )}
                              </div>

                              {lottoMode === "wheel" ? (
                                <div
                                  className={`flex flex-col items-center gap-3.5 ${fullscreenWidgetId === widget.id ? "flex-1 h-full justify-center max-w-[600px]" : "w-full"}`}
                                >
                                  {app.schueler.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-stone-500 uppercase tracking-widest font-black">
                                      Keine Schüler angelegt
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className={`relative select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)] ${fullscreenWidgetId === widget.id ? "w-96 h-96" : "w-44 h-44"}`}
                                      >
                                        <svg
                                          viewBox="0 0 200 200"
                                          className="w-full h-full"
                                        >
                                          {/* The spinning wheel body */}
                                          <g
                                            transform={`rotate(${wheelAngle}, 100, 100)`}
                                          >
                                            {(() => {
                                              const computedPool =
                                                noRepeats &&
                                                selectedStudentIds.size <
                                                  app.schueler.length
                                                  ? app.schueler.filter(
                                                      (s) =>
                                                        !selectedStudentIds.has(
                                                          s.id,
                                                        ),
                                                    )
                                                  : app.schueler;

                                              const drawPool =
                                                activeWheelPool ||
                                                (computedPool.length === 0
                                                  ? [...app.schueler]
                                                  : computedPool);

                                              if (drawPool.length <= 1) {
                                                return (
                                                  <g>
                                                    <circle
                                                      cx="100"
                                                      cy="100"
                                                      r="90"
                                                      fill="#a855f7"
                                                      className="stroke-white/20 stroke-2"
                                                    />
                                                    {drawPool[0] && (
                                                      <text
                                                        x="100"
                                                        y="103"
                                                        textAnchor="middle"
                                                        className="fill-white font-black text-[9px] uppercase tracking-wider"
                                                      >
                                                        {drawPool[0].vorname.slice(
                                                          0,
                                                          10,
                                                        )}
                                                      </text>
                                                    )}
                                                  </g>
                                                );
                                              }

                                              const colorsList = [
                                                "#ec4899",
                                                "#a855f7",
                                                "#6366f1",
                                                "#0ea5e9",
                                                "#10b981",
                                                "#f59e0b",
                                                "#ef4444",
                                                "#14b8a6",
                                                "#3b82f6",
                                                "#f43f5e",
                                                "#d946ef",
                                                "#f97316",
                                              ];

                                              const angle =
                                                360 / drawPool.length;

                                              return drawPool.map((s, idx) => {
                                                const startAngle = idx * angle;
                                                const endAngle =
                                                  (idx + 1) * angle;
                                                const d2r = (deg: number) =>
                                                  (deg * Math.PI) / 180;

                                                const r = 90;
                                                const x1 =
                                                  100 +
                                                  r * Math.cos(d2r(startAngle));
                                                const y1 =
                                                  100 +
                                                  r * Math.sin(d2r(startAngle));
                                                const x2 =
                                                  100 +
                                                  r * Math.cos(d2r(endAngle));
                                                const y2 =
                                                  100 +
                                                  r * Math.sin(d2r(endAngle));
                                                const largeArcFlag =
                                                  angle > 180 ? 1 : 0;

                                                const d = `M 100 100 L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                                                const color =
                                                  colorsList[
                                                    idx % colorsList.length
                                                  ];
                                                const middAngle =
                                                  (idx + 0.5) * angle;

                                                return (
                                                  <g key={s.id}>
                                                    <path
                                                      d={d}
                                                      fill={color}
                                                      className="stroke-white/15 stroke-[1]"
                                                    />
                                                    <g
                                                      transform={`rotate(${middAngle}, 100, 100)`}
                                                    >
                                                      <text
                                                        x={176}
                                                        y={102.5}
                                                        textAnchor="end"
                                                        className="fill-white font-black text-[6.5px] uppercase tracking-wider select-none outline-none"
                                                      >
                                                        {s.vorname.slice(0, 7)}
                                                      </text>
                                                    </g>
                                                  </g>
                                                );
                                              });
                                            })()}

                                            {/* Inner metallic style rim */}
                                            <circle
                                              cx="100"
                                              cy="100"
                                              r="82"
                                              fill="none"
                                              className="stroke-white/10 stroke-[0.5]"
                                            />
                                          </g>

                                          {/* Unmoving External frame border */}
                                          <circle
                                            cx="100"
                                            cy="100"
                                            r="92"
                                            fill="none"
                                            className="stroke-white/20 stroke-[3]"
                                          />
                                          <circle
                                            cx="100"
                                            cy="100"
                                            r="90"
                                            fill="none"
                                            className="stroke-black/30 stroke-[1]"
                                          />

                                          {/* Unmoving Pointer pin pointing down from top */}
                                          <polygon
                                            points="100,20 91,2 109,2"
                                            className="fill-rose-500 stroke-white stroke-2 drop-shadow-md"
                                          />
                                          <circle
                                            cx="100"
                                            cy="6"
                                            r="2.5"
                                            fill="white"
                                          />

                                          {/* Central hubcap */}
                                          <circle
                                            cx="100"
                                            cy="100"
                                            r="20"
                                            fill="#151515"
                                            className="stroke-white/25 stroke-2"
                                          />
                                          <circle
                                            cx="100"
                                            cy="100"
                                            r="17"
                                            fill="none"
                                            className="stroke-amber-500/25 stroke-dashed animate-[spin_10s_linear_infinite]"
                                          />
                                          <text
                                            x="100"
                                            y="103"
                                            textAnchor="middle"
                                            className="text-xs select-none"
                                          >
                                            🎡
                                          </text>
                                        </svg>
                                      </div>

                                      {/* Active Winner Highlight Banner */}
                                      <div className="text-center min-h-[36px] flex flex-col items-center justify-center">
                                        {spotlightStudent ? (
                                          <motion.div
                                            key={spotlightStudent.id}
                                            initial={{
                                              scale: 0.85,
                                              opacity: 0,
                                              y: 5,
                                            }}
                                            animate={{
                                              scale: 1,
                                              opacity: 1,
                                              y: 0,
                                            }}
                                            className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl"
                                          >
                                            <span className="text-xs font-black text-amber-400">
                                              ⚡ {spotlightStudent.vorname}{" "}
                                              {spotlightStudent.nachname
                                                ? `${spotlightStudent.nachname.charAt(0)}.`
                                                : ""}
                                            </span>
                                          </motion.div>
                                        ) : (
                                          <span className="text-[9px] text-stone-500 font-bold uppercase tracking-widest">
                                            Drehe das Glücksrad!
                                          </span>
                                        )}
                                      </div>

                                      <button
                                        onPointerDown={(e) =>
                                          e.stopPropagation()
                                        }
                                        onClick={spinWheel}
                                        disabled={isSpinning}
                                        className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${fullscreenWidgetId === widget.id ? "text-sm mt-4" : "text-[11px]"}`}
                                        style={{
                                          backgroundColor:
                                            currentTheme.colors.accent,
                                          color: currentTheme.colors.buttonText,
                                        }}
                                      >
                                        <Zap
                                          size={14}
                                          className={
                                            isSpinning ? "animate-spin" : ""
                                          }
                                        />
                                        {isSpinning
                                          ? "Glücksrad dreht..."
                                          : "DREHEN"}
                                      </button>
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div
                                  className={`flex flex-col items-center justify-center gap-6 ${fullscreenWidgetId === widget.id ? "flex-1 h-full" : "w-full"}`}
                                >
                                  <div
                                    className={`relative ${fullscreenWidgetId === widget.id ? "w-56 h-56" : "w-32 h-32"}`}
                                  >
                                    <div className="absolute inset-0 border-4 border-dashed border-amber-500/10 rounded-full animate-[spin_10s_linear_infinite]" />
                                    <div className="absolute inset-2 border border-white/5 rounded-full" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <AnimatePresence mode="wait">
                                        {spotlightStudent ? (
                                          <motion.div
                                            key={spotlightStudent.id}
                                            initial={{
                                              scale: 0.5,
                                              opacity: 0,
                                              rotate: -20,
                                            }}
                                            animate={{
                                              scale: 1,
                                              opacity: 1,
                                              rotate: 0,
                                            }}
                                            className="flex flex-col items-center"
                                          >
                                            <div
                                              className={`bg-amber-500 text-amber-950 flex items-center justify-center font-black shadow-[0_0_30px_rgba(245,158,11,0.4)] mb-2 ${fullscreenWidgetId === widget.id ? "w-28 h-28 text-5xl rounded-[2rem]" : "w-16 h-16 text-2xl rounded-2xl"}`}
                                            >
                                              {spotlightStudent.vorname.charAt(
                                                0,
                                              )}
                                            </div>
                                            <div
                                              className={`font-black text-center truncate ${fullscreenWidgetId === widget.id ? "text-2xl max-w-[200px]" : "text-[10px] max-w-[120px] text-text-primary/40"}`}
                                              style={{
                                                color:
                                                  currentTheme.colors
                                                    .textSecondary,
                                              }}
                                            >
                                              {spotlightStudent.vorname}
                                            </div>
                                          </motion.div>
                                        ) : (
                                          <div
                                            className="text-text-muted/40"
                                            style={{
                                              color:
                                                currentTheme.colors.textMuted,
                                            }}
                                          >
                                            <Trophy
                                              size={
                                                fullscreenWidgetId === widget.id
                                                  ? 80
                                                  : 40
                                              }
                                              strokeWidth={1}
                                            />
                                          </div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  </div>

                                  {/* Standard button is normally right here, but shifted to left menu in fullscreen */}
                                  {fullscreenWidgetId !== widget.id && (
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={startSpotlight}
                                      className="w-full py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                      style={{
                                        backgroundColor:
                                          currentTheme.colors.accent,
                                        color: currentTheme.colors.buttonText,
                                      }}
                                    >
                                      <Zap size={14} />
                                      Ziehen
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {widget.type === "ampel" && (
                            <div
                              className="flex flex-col gap-3 py-4 items-center w-full px-4 rounded-3xl border shadow-2xl backdrop-blur-3xl transition-colors duration-700"
                              style={{
                                backgroundColor: `${currentTheme.colors.surface}cc`,
                                borderColor: currentTheme.colors.border,
                              }}
                            >
                              {[
                                {
                                  id: "rot",
                                  phase: "red",
                                  color: "bg-rose-500",
                                  shadow: `shadow-[0_0_20px_rgba(244,63,94,0.6)]`,
                                },
                                {
                                  id: "gelb",
                                  phase: "yellow",
                                  color: "bg-amber-400",
                                  shadow: `shadow-[0_0_20px_rgba(251,191,36,0.6)]`,
                                },
                                {
                                  id: "gruen",
                                  phase: "green",
                                  color: "bg-emerald-500",
                                  shadow: `shadow-[0_0_20px_rgba(16,185,129,0.6)]`,
                                },
                              ].map((p) => (
                                <div
                                  key={p.id}
                                  className="flex flex-col items-center gap-1.5 w-full"
                                >
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() =>
                                      setApp((prev) => ({
                                        ...prev,
                                        ampel_status: p.id as any,
                                      }))
                                    }
                                    className={`w-20 h-20 rounded-full shrink-0 transition-all duration-500 ${app.ampel_status === p.id ? `${p.color} ring-[6px] ring-white/20 scale-110 ${p.shadow} z-10` : "opacity-20 grayscale hover:opacity-40"}`}
                                    style={{
                                      backgroundColor:
                                        app.ampel_status === p.id
                                          ? undefined
                                          : `${currentTheme.colors.textPrimary}20`,
                                    }}
                                  />
                                  <input
                                    type="text"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    className={`bg-transparent text-[10px] font-black uppercase tracking-[0.3em] text-center outline-none w-full transition-all duration-500 ${app.ampel_status === p.id ? "opacity-100 scale-110 drop-shadow-2xl" : "opacity-30"}`}
                                    style={{
                                      color: currentTheme.colors.textPrimary,
                                    }}
                                    value={
                                      app.ampelLabels?.[
                                        p.phase as keyof typeof app.ampelLabels
                                      ] || ""
                                    }
                                    onChange={(e) =>
                                      setApp((prev) => ({
                                        ...prev,
                                        ampelLabels: {
                                          ...prev.ampelLabels!,
                                          [p.phase]: e.target.value,
                                        },
                                      }))
                                    }
                                    placeholder="..."
                                  />
                                  <div className="flex items-center gap-1.5 mt-0.5 justify-center">
                                    <span
                                      className={`text-[11px] font-black tracking-tight transition-all duration-300 ${app.ampel_status === p.id ? "scale-110 text-emerald-400 font-extrabold" : "opacity-70"}`}
                                      style={{
                                        color: currentTheme.colors.textPrimary,
                                      }}
                                    >
                                      {getAmpelPercentage(p.id)}
                                    </span>
                                    <span
                                      className="text-[9px] font-bold opacity-45"
                                      style={{
                                        color: currentTheme.colors.textPrimary,
                                      }}
                                    >
                                      ({formatAmpelTime(ampelSeconds[p.id])})
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {widget.type === "luuise" && (
                            <div
                              className="flex flex-col gap-3.5 py-4 items-center w-full px-4 rounded-3xl border shadow-2xl backdrop-blur-3xl transition-all duration-300"
                              style={{
                                backgroundColor: `${currentTheme.colors.surface}e0`,
                                borderColor: currentTheme.colors.border,
                              }}
                            >
                              <div className="text-[10px] font-black uppercase text-rose-400 tracking-[0.25em] mb-1">
                                Luuise Tracker 🎯
                              </div>

                              {app.luuiseTracker?.aktiv ? (
                                <div className="w-full flex flex-col gap-3">
                                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-center">
                                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-300 block mb-1">
                                      UNSER FOKUS:
                                    </span>
                                    <div className="text-sm font-black text-white leading-tight select-text">
                                      {app.luuiseTracker.thema}
                                    </div>
                                    <div className="text-[8px] text-neutral-400 mt-1.5 uppercase tracking-widest font-mono">
                                      Start: {app.luuiseTracker.startDatum}
                                    </div>
                                  </div>

                                  {/* Ampel status feedback selection */}
                                  <div className="flex flex-col items-center gap-2">
                                    <span className="text-[8px] font-black tracking-widest uppercase text-neutral-400 font-sans">
                                      Heutige Stimmung eintragen:
                                    </span>

                                    <div className="flex gap-4 items-center justify-center py-2">
                                      {[
                                        {
                                          id: "gruen",
                                          color:
                                            "bg-emerald-500 hover:bg-emerald-400",
                                          shadow:
                                            "shadow-[0_0_20px_rgba(16,185,129,0.5)]",
                                          label: "Super! 🟢",
                                          emoji: "🟢",
                                        },
                                        {
                                          id: "gelb",
                                          color:
                                            "bg-amber-400 hover:bg-amber-300",
                                          shadow:
                                            "shadow-[0_0_20px_rgba(251,191,36,0.5)]",
                                          label: "Mittel 🟡",
                                          emoji: "🟡",
                                        },
                                        {
                                          id: "rot",
                                          color:
                                            "bg-rose-500 hover:bg-rose-400",
                                          shadow:
                                            "shadow-[0_0_20px_rgba(244,63,94,0.5)]",
                                          label: "Fokus! 🔴",
                                          emoji: "🔴",
                                        },
                                      ].map((step) => {
                                        const todayStr = new Date()
                                          .toISOString()
                                          .split("T")[0];
                                        const isSelected =
                                          app.luuiseTracker?.eintraege?.[
                                            todayStr
                                          ] === step.id;

                                        return (
                                          <button
                                            key={step.id}
                                            onPointerDown={(e) =>
                                              e.stopPropagation()
                                            }
                                            onClick={() => {
                                              const trackingVal = step.id as
                                                | "gruen"
                                                | "gelb"
                                                | "rot";
                                              setApp((prev: any) => {
                                                const tracker =
                                                  prev.luuiseTracker || {
                                                    aktiv: true,
                                                    thema: "",
                                                    startDatum: "",
                                                    eintraege: {},
                                                  };
                                                return {
                                                  ...prev,
                                                  luuiseTracker: {
                                                    ...tracker,
                                                    eintraege: {
                                                      ...tracker.eintraege,
                                                      [todayStr]: trackingVal,
                                                    },
                                                  },
                                                };
                                              });
                                              if (trackingVal === "gruen") {
                                                confetti({
                                                  particleCount: 60,
                                                  spread: 50,
                                                  origin: { y: 0.7 },
                                                });
                                              }
                                            }}
                                            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer ${
                                              isSelected
                                                ? `${step.color} ${step.shadow} scale-110 ring-4 ring-white`
                                                : "bg-neutral-800/80 hover:scale-105 opacity-40 hover:opacity-80"
                                            }`}
                                            title={step.label}
                                          >
                                            <span className="text-xl font-bold select-none">
                                              {step.emoji}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Mini Stats visualization */}
                                  <div className="p-2.5 bg-black/10 border border-white/5 rounded-xl text-center">
                                    <span className="text-[8px] font-black uppercase text-neutral-400 tracking-wider block mb-1 font-sans">
                                      BILANZ BISHER:
                                    </span>
                                    <div className="flex justify-around items-center text-[10px] font-bold font-mono">
                                      {(() => {
                                        const vals = Object.values(
                                          app.luuiseTracker?.eintraege || {},
                                        );
                                        const greens = vals.filter(
                                          (v) => v === "gruen",
                                        ).length;
                                        const yellows = vals.filter(
                                          (v) => v === "gelb",
                                        ).length;
                                        const reds = vals.filter(
                                          (v) => v === "rot",
                                        ).length;
                                        return (
                                          <>
                                            <span className="text-emerald-400 font-sans">
                                              🟢 {greens}
                                            </span>
                                            <span className="text-amber-300 font-sans">
                                              🟡 {yellows}
                                            </span>
                                            <span className="text-rose-450 font-sans">
                                              🔴 {reds}
                                            </span>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      if (
                                        confirm(
                                          "Möchtest du den aktuellen Luuise-Fokus wirklich beenden? Die Daten bleiben im Statistik-Journal erhalten.",
                                        )
                                      ) {
                                        setApp((prev: any) => ({
                                          ...prev,
                                          luuiseTracker: {
                                            ...prev.luuiseTracker,
                                            aktiv: false,
                                          },
                                        }));
                                      }
                                    }}
                                    className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-450 hover:bg-rose-500/10 p-1.5 rounded-lg transition-all cursor-pointer font-sans"
                                  >
                                    Fokus abschließen 🏁
                                  </button>
                                </div>
                              ) : (
                                <div className="w-full flex flex-col gap-2.5 p-1 text-center items-center">
                                  <span className="text-[10px] text-neutral-400 leading-snug font-sans">
                                    Es ist aktuell kein Luuise-Fokus aktiv.
                                    Starte einen im Cockpit oder richte ihn hier
                                    direkt ein:
                                  </span>
                                  <div className="w-full flex flex-col gap-1.5 mt-1.5">
                                    <input
                                      type="text"
                                      onPointerDown={(e) => e.stopPropagation()}
                                      value={localLuuiseThema}
                                      onChange={(e) =>
                                        setLocalLuuiseThema(e.target.value)
                                      }
                                      placeholder="z.B. Leise flüstern..."
                                      className="w-full p-2 text-[11px] font-bold rounded-xl bg-neutral-950 border border-white/10 text-white outline-none focus:border-rose-400"
                                    />
                                    <button
                                      onPointerDown={(e) => e.stopPropagation()}
                                      onClick={() => {
                                        if (!localLuuiseThema.trim()) return;
                                        setApp((prev: any) => ({
                                          ...prev,
                                          luuiseTracker: {
                                            aktiv: true,
                                            thema: localLuuiseThema.trim(),
                                            startDatum: new Date()
                                              .toISOString()
                                              .split("T")[0],
                                            eintraege: {},
                                          },
                                        }));
                                        setLocalLuuiseThema("");
                                      }}
                                      className="w-full py-2 bg-rose-500 hover:bg-rose-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer font-sans"
                                    >
                                      Fokus starten! 🚀
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {widget.type === "lernwoerter" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl overflow-hidden min-h-0 ${fullscreenWidgetId === widget.id ? "w-full h-full flex-1" : "w-[600px] h-[450px]"}`}
                            >
                              <LernwoerterWidget
                                isFullscreen={fullscreenWidgetId === widget.id}
                              />
                            </div>
                          )}

                          {widget.type === "todo" && (
                            <div className="w-full h-full min-h-[160px]">
                              <TodoWidgetContent
                                widget={widget}
                                onUpdate={(updates) =>
                                  handleUpdateWidgetPos(widget.id, updates)
                                }
                                currentIsLight={currentIsLight}
                                isFullscreen={fullscreenWidgetId === widget.id}
                              />
                            </div>
                          )}

                          {widget.type === "qrcode" && (
                            <div className="w-full h-full min-h-[300px]">
                              <QrCodeWidgetContent
                                widget={widget}
                                onUpdate={(updates) =>
                                  handleUpdateWidgetPos(widget.id, updates)
                                }
                                currentIsLight={currentIsLight}
                                isFullscreen={fullscreenWidgetId === widget.id}
                              />
                            </div>
                          )}

                          {widget.type === "sticky" && (
                            <div className="py-1 w-full h-full min-h-[100px]">
                              <textarea
                                onPointerDown={(e) => e.stopPropagation()}
                                className="w-full h-full bg-amber-200/90 text-amber-900 p-3 rounded-xl font-bold text-[11px] outline-none shadow-inner resize-none"
                                placeholder="Notiz..."
                                value={
                                  widget.meta?.text !== undefined
                                    ? widget.meta.text
                                    : "Wichtige Notiz für alle!"
                                }
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setApp((prev: any) => ({
                                    ...prev,
                                    boardWidgets: (prev.boardWidgets || []).map(
                                      (bw: any) =>
                                        bw.id === widget.id
                                          ? {
                                              ...bw,
                                              meta: {
                                                ...(bw.meta || {}),
                                                text,
                                              },
                                            }
                                          : bw,
                                    ),
                                  }));
                                }}
                              />
                            </div>
                          )}

                          {widget.type === "laerm" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl min-h-0 ${fullscreenWidgetId === widget.id ? "w-full h-full flex flex-col justify-center items-center" : "w-[450px] h-[350px] flex flex-col justify-center items-center"}`}
                            >
                              <MemoizedNoiseBarometer />
                            </div>
                          )}

                          {(widget.type === "klassenglas" || widget.type === "piggybank" || widget.type === "thermometer" || widget.type === "classtarget") && (
                            <div className="w-full h-full flex flex-col justify-center items-center p-4">
                              <ClassRewardWidget
                                app={app}
                                setApp={setApp}
                                widget={widget}
                                onUpdate={(updates) =>
                                  handleUpdateWidgetPos(
                                    widget.id,
                                    updates,
                                  )
                                }
                                currentIsLight={currentIsLight}
                                activeFokusThemeVars={activeFokusThemeVars}
                                isFullscreen={true}
                              />
                            </div>
                          )}

                          {/* Floating Class Pet is rendered dynamically below as a free-roaming pet directly on the dashboard */}

                          {widget.type === "pause" && (
                            <div className="flex flex-col items-center py-2 space-y-4 w-[260px]">
                              <div className="text-center space-y-1">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                  <Zap size={14} className="text-amber-500" />
                                  <div className="text-[11px] font-black uppercase text-amber-500 tracking-[0.3em]">
                                    Flitzi-Pause
                                  </div>
                                  <Zap size={14} className="text-amber-500" />
                                </div>
                                <div
                                  className={`text-[9px] font-bold uppercase tracking-widest ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white/20"}`}
                                >
                                  Kurze Bewegung für zwischendurch
                                </div>
                              </div>

                              <div
                                className={`relative w-full h-[13.75rem] rounded-[2.5rem] border-2 flex flex-col items-center justify-center p-4 overflow-hidden group/box shadow-2xl ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/10" : "bg-black/40 border-white/10"}`}
                              >
                                <div
                                  className={`absolute inset-0 transition-opacity duration-1000 ${isPauseSpinning ? "opacity-20" : "opacity-0"}`}
                                >
                                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#f59e0b,transparent,transparent,#f59e0b)] animate-[spin_3s_linear_infinite]" />
                                </div>

                                <AnimatePresence mode="wait">
                                  {selectedUebung ? (
                                    <motion.div
                                      key={selectedUebung.id}
                                      initial={{
                                        opacity: 0,
                                        y: 50,
                                        rotate: -5,
                                      }}
                                      animate={{ opacity: 1, y: 0, rotate: 0 }}
                                      exit={{ opacity: 0, y: -50, scale: 0.8 }}
                                      transition={{
                                        type: "spring",
                                        damping: 25,
                                        stiffness: 300,
                                      }}
                                      className="flex flex-col items-center text-center gap-2 relative z-10"
                                    >
                                      <div className="relative">
                                        <motion.div
                                          animate={
                                            isPauseSpinning
                                              ? {}
                                              : {
                                                  scale: [1, 1.1, 1],
                                                  rotate: [0, 5, -5, 0],
                                                }
                                          }
                                          transition={{
                                            repeat: Infinity,
                                            duration: 2,
                                          }}
                                          className="text-7xl drop-shadow-[0_10px_30px_rgba(245,158,11,0.4)] relative z-10"
                                        >
                                          {selectedUebung.emoji || "⚡"}
                                        </motion.div>
                                        {!isPauseSpinning && (
                                          <div className="absolute -inset-4 bg-amber-500/20 blur-2xl rounded-full -z-10 animate-pulse" />
                                        )}
                                      </div>

                                      <div className="space-y-1">
                                        <div
                                          className={`text-xl font-black tracking-tight drop-shadow-md ${activeFokusThemeVars.isLight ? "text-slate-800" : "text-white"}`}
                                        >
                                          {selectedUebung.titel}
                                        </div>
                                        <div
                                          className={`text-[10px] font-bold max-w-[200px] leading-relaxed line-clamp-2 ${activeFokusThemeVars.isLight ? "text-slate-600" : "text-white/50"}`}
                                        >
                                          {selectedUebung.beschreibung}
                                        </div>
                                      </div>

                                      {isPauseTimerRunning && (
                                        <div className="mt-4 flex flex-col items-center gap-3 w-full px-4">
                                          <div className="text-4xl font-display font-black text-amber-500 tabular-nums drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                                            {Math.floor(pauseTimeLeft / 60)}:
                                            {(pauseTimeLeft % 60)
                                              .toString()
                                              .padStart(2, "0")}
                                          </div>
                                          <div
                                            className={`w-full h-2 rounded-full overflow-hidden border p-0.5 ${activeFokusThemeVars.isLight ? "bg-black/10 border-black/10" : "bg-white/5 border-white/10"}`}
                                          >
                                            <motion.div
                                              className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.6)] rounded-full"
                                              initial={{ width: "100%" }}
                                              animate={{
                                                width: `${(pauseTimeLeft / (pauseDuration || 60)) * 100}%`,
                                              }}
                                              transition={{
                                                duration: 1,
                                                ease: "linear",
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  ) : (
                                    <div className="flex flex-col items-center gap-4 py-8">
                                      <div
                                        className={`w-24 h-24 rounded-[2rem] border flex items-center justify-center ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/10 text-slate-300" : "bg-white/5 border-white/5 text-white/10"}`}
                                      >
                                        <RotateCcw
                                          size={48}
                                          strokeWidth={1}
                                          className="animate-[spin_4s_linear_infinite]"
                                        />
                                      </div>
                                      <div
                                        className={`text-[11px] font-black uppercase tracking-[0.3em] ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/20"}`}
                                      >
                                        Warten auf Zufall
                                      </div>
                                    </div>
                                  )}
                                </AnimatePresence>
                              </div>

                              <div className="w-full space-y-3">
                                {!isPauseSpinning && !isPauseTimerRunning && (
                                  <div className="flex flex-col gap-2 mb-2">
                                    <div className="flex gap-1 justify-center">
                                      {[
                                        {
                                          id: "POWER",
                                          label: "Power",
                                          icon: Zap,
                                        },
                                        {
                                          id: "FOCUS",
                                          label: "Fokus",
                                          icon: Target,
                                        },
                                        {
                                          id: "RELAX",
                                          label: "Relax",
                                          icon: Waves,
                                        },
                                        {
                                          id: "ALL",
                                          label: "Alle",
                                          icon: RotateCcw,
                                        },
                                      ].map((cat) => (
                                        <button
                                          key={cat.id}
                                          onPointerDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          onClick={() =>
                                            setPauseCategory(cat.id as any)
                                          }
                                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[8px] font-black transition-all border ${pauseCategory === cat.id ? "bg-indigo-500 text-white border-indigo-400" : activeFokusThemeVars.isLight ? "bg-black/5 text-slate-500 border-black/10 hover:bg-black/10 hover:text-slate-700" : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"}`}
                                        >
                                          <cat.icon size={8} />
                                          {cat.label}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="flex gap-1 justify-center">
                                      {[30, 60, 120, 180, 300].map((d) => (
                                        <button
                                          key={d}
                                          onPointerDown={(e) =>
                                            e.stopPropagation()
                                          }
                                          onClick={() => setPauseDuration(d)}
                                          className={`px-2 py-1 rounded-lg text-[8px] font-black transition-all border ${pauseDuration === d ? "bg-amber-500 text-amber-950 border-amber-400" : activeFokusThemeVars.isLight ? "bg-black/5 text-slate-500 border-black/10 hover:bg-black/10" : "bg-white/5 text-white/30 border-white/10 hover:bg-white/10"}`}
                                        >
                                          {d < 60 ? `${d}s` : `${d / 60}m`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <button
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={startPauseAction}
                                  disabled={isPauseSpinning}
                                  className={`w-full h-16 rounded-2xl flex items-center justify-center gap-4 font-black uppercase text-sm tracking-[0.2em] transition-all active:scale-95 shadow-2xl ${isPauseSpinning ? (activeFokusThemeVars.isLight ? "bg-black/5 text-slate-400" : "bg-white/5 text-white/20") : "bg-gradient-to-br from-emerald-500 to-emerald-600 text-emerald-950 hover:from-emerald-400 hover:to-emerald-500 border border-emerald-400/50"}`}
                                >
                                  {isPauseSpinning ? (
                                    <RotateCcw
                                      className="animate-spin"
                                      size={20}
                                    />
                                  ) : (
                                    <Play
                                      size={20}
                                      className="fill-emerald-950"
                                    />
                                  )}
                                  <span>
                                    {isPauseSpinning
                                      ? "Wird ausgewählt..."
                                      : "Auswahl Starten"}
                                  </span>
                                </button>

                                {isPauseTimerRunning && (
                                  <button
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={() => {
                                      setIsPauseTimerRunning(false);
                                      if (pauseTimerIntervalRef.current)
                                        clearInterval(
                                          pauseTimerIntervalRef.current,
                                        );
                                      if (beatIntervalRef.current)
                                        clearInterval(beatIntervalRef.current);
                                    }}
                                    className={`w-full py-3 hover:bg-rose-500/10 hover:border-rose-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-all border ${activeFokusThemeVars.isLight ? "bg-black/5 border-black/5 text-slate-400" : "bg-white/5 border-white/5 text-white/20"}`}
                                  >
                                    Abbrechen & Reset
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {widget.type === "tagesplan" &&
                            (() => {
                              const getHeutePlan = () => {
                                const daysDe = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];
                                const dayIdx = daysDe.indexOf(tagName);
                                const wp = tagName ? (app.wochenplanung?.[kw]?.[tagName] || {}) : {};
                                const sp = app.stammplan?.[tagName];
                                const result = [];
                                for (let i = 0; i < MAX_LESSON_SLOTS; i++) {
                                  if (wp && wp[i] && wp[i].fach)
                                    result.push({ idx: i, ...wp[i] });
                                  else if (sp && sp[i + 1]) {
                                    const spItem = sp[i + 1];
                                    result.push(
                                      typeof spItem === "object"
                                        ? { idx: i, ...(spItem as any) }
                                        : { idx: i, fach: spItem },
                                    );
                                  }
                                }
                                return result;
                              };
                              const hPlan = getHeutePlan();
                              const cHourIdx = currentHour
                                ? currentHour.idx
                                : -1;
                              return (
                                <div className="flex flex-col gap-3 p-2 w-80">
                                  <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-amber-500 tracking-widest border-b border-white/10 pb-2">
                                    <CalendarDays size={14} /> Tagesplan (
                                    {tagName})
                                  </div>
                                  <div className="flex flex-col gap-2 relative">
                                    {hPlan.length > 0 ? (
                                      hPlan.map((h: any) => (
                                        <div
                                          key={h.idx}
                                          className={`flex items-center gap-3 p-2 rounded-xl text-[11px] font-bold transition-all ${cHourIdx === h.idx ? "bg-amber-500/20 text-amber-500 border border-amber-500/30 shadow-inner" : activeFokusThemeVars.isLight ? "bg-black/5 border border-transparent text-slate-700" : "bg-white/5 border border-white/5 text-stone-300"}`}
                                        >
                                          <div className="w-5 font-black opacity-50 tabular-nums">
                                            {h.idx + 1}.
                                          </div>
                                          <div className="flex-1 truncate">
                                            {h.fach || "Unterricht"}
                                          </div>
                                          {(h.inhalt || h.thema) && (
                                            <div className="opacity-50 text-[10px] max-w-[100px] truncate">
                                              {h.inhalt || h.thema}
                                            </div>
                                          )}
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-center italic opacity-50 py-4 text-xs font-bold">
                                        Kein Plan für heute hinterlegt.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                          {widget.type === "termine" &&
                            (() => {
                              // Calculate termine internally
                              const events = [];
                              const actKwPlan = app.wochenplanung?.[kw] || {};
                              Object.entries(actKwPlan).forEach(
                                ([day, dayPlan]) => {
                                  if (dayPlan && typeof dayPlan === "object") {
                                    Object.values(dayPlan).forEach(
                                      (lesson: any) => {
                                        const str =
                                          `${lesson.fach || ""} ${lesson.inhalt || ""} ${lesson.thema || ""}`.trim();
                                        if (!str) return;
                                        if (
                                          /schularbeit|test|prüfung|lzks|ansage/i.test(
                                            str,
                                          )
                                        ) {
                                          events.push({
                                            text: `${day}: ${str}`,
                                            icon: "📝",
                                            priority: 2,
                                          });
                                        } else if (
                                          /ausflug|wandertag|exkursion|theater/i.test(
                                            str,
                                          )
                                        ) {
                                          events.push({
                                            text: `${day}: ${str}`,
                                            icon: "🚌",
                                            priority: 2,
                                          });
                                        }
                                      },
                                    );
                                  }
                                },
                              );
                              const notes = app?.notizen || [];
                              notes.forEach((n) => {
                                if (!n.termin || !n.inhalt) return;
                                try {
                                  if (getKW(new Date(n.termin)) === kw) {
                                    const str = n.inhalt.trim();
                                    if (
                                      /schularbeit|test|prüfung|lzks|ansage/i.test(
                                        str,
                                      )
                                    ) {
                                      events.push({
                                        text: str,
                                        icon: "📝",
                                        priority: 2,
                                      });
                                    } else if (
                                      /ausflug|wandertag|exkursion|theater/i.test(
                                        str,
                                      )
                                    ) {
                                      events.push({
                                        text: str,
                                        icon: "🎒",
                                        priority: 2,
                                      });
                                    } else {
                                      events.push({
                                        text: str,
                                        icon: "📌",
                                        priority: 1,
                                      });
                                    }
                                  }
                                } catch (e) {}
                              });
                              // Add Geburtstage
                              const todayYear = new Date().getFullYear();
                              (app.schueler || []).forEach((s) => {
                                if (s.geburtstag) {
                                  try {
                                    let bDate: Date;
                                    const parts = s.geburtstag.split(".");
                                    if (parts.length === 3) {
                                      bDate = new Date(
                                        todayYear,
                                        parseInt(parts[1]) - 1,
                                        parseInt(parts[0]),
                                      );
                                    } else {
                                      bDate = new Date(s.geburtstag);
                                      bDate.setFullYear(todayYear);
                                    }
                                    if (
                                      !isNaN(bDate.getTime()) &&
                                      getKW(bDate) === kw
                                    ) {
                                      // Find week day
                                      const dayName = [
                                        "Sonntag",
                                        "Montag",
                                        "Dienstag",
                                        "Mittwoch",
                                        "Donnerstag",
                                        "Freitag",
                                        "Samstag",
                                      ][bDate.getDay()];
                                      events.push({
                                        text: `${dayName}: ${s.vorname} ${s.nachname}`,
                                        icon: "🎂",
                                        priority: 3,
                                      });
                                    }
                                  } catch (e) {}
                                }
                              });
                              const uniqueEvents = Array.from(
                                new Map(
                                  events.map((item) => [item.text, item]),
                                ).values(),
                              );
                              uniqueEvents.sort(
                                (a, b) => b.priority - a.priority,
                              );

                              return (
                                <div className="flex flex-col gap-3 p-2 w-80">
                                  <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase text-blue-400 tracking-widest border-b border-white/10 pb-2">
                                    <Bell size={14} />{" "}
                                    <span>Wichtige Termine (KW {kw}</span>
                                    {(() => {
                                      const sw = getSW(
                                        time || new Date(),
                                        app?.schuljahr,
                                      );
                                      return sw ? (
                                        <>
                                          <span className="opacity-40 text-[8px] mx-1">
                                            |
                                          </span>
                                          <span className="text-[8px] text-blue-300 font-bold">
                                            SW {sw}
                                          </span>
                                        </>
                                      ) : null;
                                    })()}
                                    <span>)</span>
                                  </div>
                                  <div className="flex flex-col gap-2 relative">
                                    {uniqueEvents.length > 0 ? (
                                      uniqueEvents.map((ev: any, i: number) => (
                                        <div
                                          key={i}
                                          className={`flex items-start gap-3 p-2.5 rounded-xl text-xs font-bold border border-transparent ${activeFokusThemeVars.isLight ? "bg-black/5 text-slate-700" : "bg-white/5 border-white/5 text-stone-300"}`}
                                        >
                                          <div className="text-base leading-none">
                                            {ev.icon}
                                          </div>
                                          <div className="flex-1 leading-snug">
                                            {ev.text}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div
                                        className={`text-center italic opacity-50 py-4 text-xs font-bold ${activeFokusThemeVars.isLight ? "text-slate-600" : "text-stone-400"}`}
                                      >
                                        Keine Termine diese Woche.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                          {widget.type === "riddle" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl min-h-0 ${fullscreenWidgetId === widget.id ? "w-full h-full flex-1" : "w-[700px] h-[480px]"}`}
                            >
                              <MemoizedMorningRiddleWidget />
                            </div>
                          )}

                          {widget.type === "quiz" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl overflow-hidden min-h-0 ${fullscreenWidgetId === widget.id ? "w-full h-full flex-1" : "w-[800px] h-[500px]"}`}
                            >
                              <MemoizedQuizWidget />
                            </div>
                          )}

                          {widget.type === "mindmap" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl overflow-hidden min-h-0 ${fullscreenWidgetId === widget.id ? "w-full h-full flex-1" : "w-[750px] h-[550px]"}`}
                            >
                              <MemoizedMindmapWidget widgetId={widget.id} />
                            </div>
                          )}

                          {widget.type === "dienste" && (
                            <div
                              className={`pointer-events-auto rounded-[2rem] shadow-2xl overflow-hidden min-h-0 ${
                                fullscreenWidgetId === widget.id
                                  ? "w-full h-full flex-1"
                                  : "w-[750px] h-[550px]"
                              }`}
                            >
                              <DiensteWidgetContent
                                widget={widget}
                                app={app}
                                setApp={setApp}
                                currentIsLight={activeFokusThemeVars.isLight}
                                isFullscreen={fullscreenWidgetId === widget.id}
                              />
                            </div>
                          )}
                        </div>

                        {/* Widget Resize Handle */}
                        {fullscreenWidgetId !== widget.id && (
                          <div
                            className="absolute bottom-1 right-1 w-8 h-8 z-50 cursor-se-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity active:opacity-100 touch-none"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startScale =
                                widget.scale ||
                                (fullscreenWidgetId === widget.id ? 1.5 : 1);

                              const handleMove = (moveE: PointerEvent) => {
                                const dx = moveE.clientX - startX;
                                const dy = moveE.clientY - startY;

                                // Use the primary movement direction for scaling (bottom-right diagonal)
                                const delta = (dx + dy) / 2;

                                // 1.0 scale unit per 400px of movement for smooth dragging
                                const newScale = startScale + delta / 400;

                                setWidgetScale(widget.id, newScale);
                              };
                              const handleUp = () => {
                                window.removeEventListener(
                                  "pointermove",
                                  handleMove,
                                );
                                window.removeEventListener(
                                  "pointerup",
                                  handleUp,
                                );
                              };
                              window.addEventListener(
                                "pointermove",
                                handleMove,
                              );
                              window.addEventListener("pointerup", handleUp);
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 14 14"
                              fill="none"
                              className="text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            >
                              <path
                                d="M13 1L1 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                              <path
                                d="M13 7L7 13"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
            </AnimatePresence>
          </>,
          portalTarget,
        )}

      {/* Floating Class Pet in Unterrichtsmodus (free-roaming directly in the foreground, across the entire screen including Schülerliste) */}
      <AnimatePresence mode="wait">
        {actualShowPet &&
          (() => {
            const petState = app.classPet || {
              enabled: true,
              animalType: "dino",
              name: "Spike",
              energy: 50,
              accessories: [],
              history: [],
            };
            if (!petState.enabled) return null;

            const currentBreed =
              PET_BREEDS.find((b) => b.id === petState.animalType) ||
              PET_BREEDS[0];

            const currentPetOpacity = 1.0;

            const currentBounds = getSafePetBounds();
            const renderPetX =
              isClimbingSidebar || isSlidingDown
                ? petX
                : Math.max(
                    currentBounds.minX,
                    Math.min(currentBounds.maxX, petX),
                  );

            return (
              <motion.div
                key="floating-classpet-outer"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{
                  opacity: 0,
                  scale: 0,
                  x: 500,
                  y: 0,
                  filter: "blur(10px)",
                  transition: { duration: 0.8, ease: "backIn" },
                }}
                className="absolute inset-0 pointer-events-none z-[1050]"
              >
                <motion.div
                  drag
                  dragConstraints={outerContainerRef}
                  dragElastic={0.15}
                  dragMomentum={false}
                  onDragEnd={(e, info) => {
                    const board = outerContainerRef.current;
                    if (board) {
                      const boardRect = board.getBoundingClientRect();
                      const target = e.currentTarget as HTMLElement;
                      if (target) {
                        const petRect = target.getBoundingClientRect();

                        // Calculate the percentage relative to the board and strictly clamp against bounds
                        const petCenterX =
                          petRect.left + petRect.width / 2 - boardRect.left;
                        const rawX = (petCenterX / boardRect.width) * 100;

                        const bounds = getSafePetBounds();
                        const newPetX = Math.max(
                          bounds.minX,
                          Math.min(bounds.maxX, rawX),
                        );

                        // Calculate custom bottom offset with gravity (climbing / falling)
                        const finalYOffset = getLandingOffsetForX(newPetX);

                        // Stop active walk and climbing/sliding behaviors on manual user drag interaction
                        setPetTargetX(null);
                        setPetBehaviorState("idle");
                        setIsClimbingSidebar(false);
                        setIsSlidingDown(false);

                        setPetX(newPetX);
                        setPetYOffset(finalYOffset);
                      }
                    }
                  }}
                  initial={{ x: 0, y: 50, opacity: 0 }}
                  animate={{
                    left: `${renderPetX}%`,
                    bottom: `${petYOffset}px`,
                    opacity: currentPetOpacity,
                    x: 0,
                    y: 0,
                  }}
                  transition={{
                    left: {
                      type: "spring",
                      stiffness: 140,
                      damping: 20,
                    },
                    bottom: {
                      type: "spring",
                      damping: 30,
                      stiffness: 180,
                      restDelta: 0.01,
                    },
                    x: { type: "tween", duration: 0 },
                    y: { type: "tween", duration: 0 },
                    opacity: { duration: 0.5 },
                  }}
                  whileDrag={{ scale: 1.08 }}
                  className="absolute -translate-x-1/2 flex flex-col items-center pointer-events-auto cursor-grab active:cursor-grabbing select-none w-[180px] h-[180px] z-[2000]"
                  onMouseEnter={() => {
                    setPetIsHovered(true);
                    if (
                      Date.now() - (petLastHoverTimeRef.current || 0) <
                      5000
                    ) {
                      return; // Wait 5 seconds before changing the hover text again
                    }
                    petLastHoverTimeRef.current = Date.now();

                    if (petBehaviorState === "sleeping") {
                      setPetIsWakingUp(true);
                      const isAfter18 = new Date().getHours() >= 18;
                      const sleepyQuotes = isAfter18
                        ? [
                            `*blinzelt schläfrig* Chrrrr... Es ist nach 18:00 Uhr und Schlafenszeit! 🥱🌙`,
                            `*gähnt* Es ist schon Abend! Ich öffne nur ganz kurz meine Augen... 🥱💤`,
                            `Mmh... *blinzelt müde* Abendzeit ist Kuschelzeit... Träumt ihr auch schon? 🐾👀`,
                            `*gähn* So spät schon... Ich schlafe tief und fest, aber danke fürs Streicheln! 😴🌌`,
                          ]
                        : [
                            `*blinzelt* Chrrrr... Hmm, hast du mich gestreichelt? 🥱💤`,
                            `Mmh... *gähnt* Ich träume gerade so schön von Leckerlies... 😴`,
                            `Huch? *blinzelt müde* Hallöchen... Ich schlafe nur ein kleines bisschen. 🐾`,
                            `*gähnt leise* Ich passe auch im Traum auf euch auf... 💜`,
                          ];
                      const selected =
                        sleepyQuotes[
                          Math.floor(Math.random() * sleepyQuotes.length)
                        ];
                      setPetReactionText(selected);
                    } else {
                      if (petBehaviorState !== "learning" && !petDancing) {
                        setPetIsWaving(true);
                      }
                      const students = app.schueler || [];
                      const randomStudentObj =
                        students.length > 0
                          ? students[
                              Math.floor(Math.random() * students.length)
                            ]
                          : null;
                      const randomStudent = randomStudentObj
                        ? randomStudentObj.vorname
                        : "Klasse";
                      const className = app.klassenbezeichnung || "Klasse";

                      const hasBadges =
                        randomStudentObj &&
                        randomStudentObj.badges &&
                        randomStudentObj.badges.length > 0;
                      const badgeMention = hasBadges
                        ? randomStudentObj.badges[0].name
                        : "";
                      const characterMention =
                        (randomStudentObj as any)?.charaktereigenschaften ||
                        "freundlich";

                      const today = new Date();
                      const weekdaysGerman = [
                        "Sonntag",
                        "Montag",
                        "Dienstag",
                        "Mittwoch",
                        "Donnerstag",
                        "Freitag",
                        "Samstag",
                      ];
                      const currentDayName = weekdaysGerman[today.getDay()];
                      const currentHourData = getCurrentHour();
                      const nowMins =
                        today.getHours() * 60 + today.getMinutes();

                      const currentBreak = findCurrentLessonBreak(
                        lessonTimeSlots,
                        nowMins,
                      );
                      const isLunchBreak =
                        currentBreak?.afterSlot ===
                        (app.mittagspauseNachStunde || 5);

                      let greetings: string[] = [];
                      if (petBehaviorState === "learning") {
                        greetings = [
                          `Pssst... Viel Erfolg beim Lernen, ${randomStudent}! 📖✨`,
                          `Ich passe gut auf, während die Klasse ${className} lernt! ✍️`,
                          `Ihr macht das toll! Konzentriert euch weiter! 🤫💻`,
                          `Super fleißig, Klasse ${className}! Weiter so, ${randomStudent}! 🌟`,
                          randomStudentObj
                            ? `Ich sehe, du bist ganz vertieft, ${randomStudent}! Dein Fokus bringt dich weiter! 📚`
                            : `Alle sind hochkonzentriert in der Einheit. Weiter so!`,
                          hasBadges
                            ? `Mit deinem Abzeichen '${badgeMention}' bist du ein echtes Vorbild, ${randomStudent}! 🏅`
                            : `Leise knistert das Papier... so gutes Lernen! 📄`,
                        ];
                      } else if (currentBreak) {
                        greetings = [
                          `Hey ${randomStudent}! Schnapp dir ein Pausenbrot! Wir haben gerade Pause! 🥪⚽`,
                          `Huhu! Genieß die freie Zeit der Pause, ${randomStudent}! 🥳✨`,
                          `Pause ist herrlich! Zeit zum Dehnen, Strecken und Reden mit Freunden! 🎈`,
                          characterMention
                            ? `Deine Stärke ist es ${characterMention} zu sein! Nutz die Pause, um deine Batterien aufzuladen, ${randomStudent}! ⚡`
                            : `Tief durchatmen - Pausenzeit! 🌬️`,
                          `Schnell nach draußen an die frische Luft! 🦋🌞`,
                          `Habt ihr ein paar coole Spiele für den Pausenhof? Zieht mich mit ein! 🎲`,
                        ];
                      } else if (
                        currentHourData &&
                        currentHourData.timeLeft <= 5
                      ) {
                        greetings = [
                          `Puh, gleich ist die Stunde rum, ${randomStudent}! Nur noch ${currentHourData.timeLeft} Minuten! ⏳🎒`,
                          `Hast du schon alles eingepackt? Die Stunde geht dem Ende zu! 🔔✨`,
                          `Aufregend! Fast Feierabend für diese Einheit, ${randomStudent}! 🦖`,
                          `Wir sind bald fertig für heute, haltet durch! Die letzten ${currentHourData.timeLeft} Minuten schaffen wir auch noch! ⏱️`,
                          `Endspurt, ${className}! Schreibt die Hausaufgaben auf, falls ihr welche habt! 📝`,
                        ];
                      } else {
                        let weekdayRemark = "";
                        switch (today.getDay()) {
                          case 1:
                            weekdayRemark =
                              "Hab einen super Start in die Schulwoche am Montag! 🗓️";
                            break;
                          case 2:
                            weekdayRemark =
                              "Es ist Dienstag - voll motiviert durch den Tag! 💪";
                            break;
                          case 3:
                            weekdayRemark =
                              "Schönen Mittwoch! Bergfest – die halbe Schulwoche ist schon geschafft! 🎉";
                            break;
                          case 4:
                            weekdayRemark =
                              "Donnerstag! Nur noch ein kleiner Schritt bis zum Wochenende! 🌅";
                            break;
                          case 5:
                            weekdayRemark =
                              "Juhu, Freitag! Endspurt vor dem kuscheligen Wochenende! 🍿";
                            break;
                          default:
                            weekdayRemark =
                              "Wochenende! Zeit zum Ausruhen und Spaß haben! 🛋️✨";
                        }

                        greetings = [
                          `Hallo, ${randomStudent}! Schön dich zu sehen! 👋 ${weekdayRemark}`,
                          `Huhu! Schöne Grüße an die Klasse ${className}! 🐾 ${weekdayRemark}`,
                          `Lust auf ein Abenteuer heute, ${randomStudent}? ⭐ ${weekdayRemark}`,
                          `Ahoi! Die Klasse ${className} ist spitze! 👋 ${weekdayRemark}`,
                          `Hallo! Ich helfe dir gerne beim heutigen Lernen, ${randomStudent}! 🥰`,
                          `Hey ${randomStudent}! Wie klappt das Lernen in der ${className} heute am ${currentDayName}? ✍️`,
                          characterMention
                            ? `Bleib weiterhin so ${characterMention}, ${randomStudent}, das bewundere ich! 🌟`
                            : `Wir schaffen ein tolles Jahr zusammen! 🚀`,
                          hasBadges
                            ? `Ich bin stolz auf dich und dein Abzeichen '${badgeMention}', ${randomStudent}! Weiter so! 🥇`
                            : `Du hast tolles Potenzial, ziele hoch! 🎯`,
                          `Hast du mir eigentlich schon einen Keks gegeben, ${randomStudent}? Nein? Schade! 🍪😂`,
                          `Lass uns die anderen gemeinsam überraschen, ${randomStudent}! 🕵️‍♂️`,
                        ];
                      }
                      const selectedGreeting =
                        greetings[Math.floor(Math.random() * greetings.length)];
                      setPetReactionText(selectedGreeting);
                    }
                  }}
                  onMouseLeave={() => {
                    setPetIsHovered(false);
                    setPetIsWaving(false);
                    setPetIsWakingUp(false);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();

                    if (isClimbingSidebar) {
                      setIsClimbingSidebar(false);
                      setIsSlidingDown(true);
                      climbVelocityRef.current = 4; // slide starting push
                      setPetReactionText(
                        `Huuuiiii! Abfahrt! Ich rutsche herunter! 🛝💨`,
                      );
                      return;
                    }

                    if (isSlidingDown) {
                      setPetReactionText(
                        `Wuuuhuuu! Überschlag beim Rutschen! 🌀✨`,
                      );
                      if (
                        petCanvasRef.current &&
                        typeof petCanvasRef.current.bounce === "function"
                      ) {
                        petCanvasRef.current.bounce();
                      }
                      return;
                    }

                    const isSpin = Math.random() < 0.4;
                    setClickAnimationType(isSpin ? "spin" : "jump");
                    setAnimationTrigger(true);
                    setTimeout(() => setAnimationTrigger(false), 850);

                    if (petCanvasRef.current) {
                      if (isSpin) {
                        petCanvasRef.current.celebrate();
                      } else {
                        petCanvasRef.current.bounce();
                      }
                    }

                    const tickles = [
                      `Hihi! Das kitzelt! 😂`,
                      `Kicher! ${petState.name} freut sich riesig!`,
                      `Wiggel-wiggel! Danke für die Streicheleinheit! 🥰`,
                      `${petState.name} strahlt über das ganze Gesicht!`,
                    ];
                    const r =
                      tickles[Math.floor(Math.random() * tickles.length)];
                    setPetReactionText(r);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setPetAccessoryOverlayOpen(true);
                    setPetQuickMenuOpen(false);
                  }}
                >
                  {/* Speech text - Rendered as beautiful raw text without speech bubble containers */}
                  <AnimatePresence>
                    {petReactionText && petIsHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.92 }}
                        transition={{ type: "spring", damping: 16 }}
                        className={`absolute ${petQuickMenuOpen ? "bottom-80" : "bottom-28"} w-64 text-center select-none cursor-default font-extrabold tracking-wide z-[45] transition-all duration-300`}
                        style={{
                          color: "#ffffff",
                          textShadow:
                            "0 2px 7px rgba(0,0,0,1.0), 0 1px 3px rgba(0,0,0,1.0), 0 0 10px rgba(0,0,0,0.8)",
                        }}
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <p className="leading-snug text-[15px] filter drop-shadow relative group/text">
                          "{petReactionText}"
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSpeakText(petReactionText);
                            }}
                            className={`absolute -right-8 top-0 p-1.5 rounded-full transition-all opacity-0 group-hover/text:opacity-100 ${petIsSpeaking ? "bg-indigo-600 text-white opacity-100" : "bg-black/50 text-white hover:bg-black/70"}`}
                          >
                            {petIsSpeaking ? (
                              <Volume2 size={12} className="animate-pulse" />
                            ) : (
                              <Volume2 size={12} />
                            )}
                          </button>
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Redesigned Status Premium Quick Menu Overlay */}
                  <AnimatePresence>
                    {petQuickMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.85 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ type: "spring", damping: 15 }}
                        className="absolute bottom-24 bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)] rounded-3xl p-3 flex flex-col items-center gap-2 w-[245px] z-[55]"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <div className="flex justify-between w-full items-center px-1.5 pb-2 border-b border-white/10">
                          <span className="text-[9px] font-black uppercase text-amber-400 tracking-widest font-sans flex items-center gap-1">
                            👑 {petState.name} Steuerung
                          </span>
                          <button
                            onClick={() => setPetQuickMenuOpen(false)}
                            className="w-5 h-5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-[9px] text-slate-300 hover:text-white transition-all cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                          {/* Chat Input Section */}
                          <div className="w-full px-1 pt-1 pb-2 border-t border-white/10 mt-1">
                            <form
                              onSubmit={handlePetChatSubmit}
                              className="relative group/chat"
                            >
                              <input
                                type="text"
                                value={petChatInput}
                                onChange={(e) =>
                                  setPetChatInput(e.target.value)
                                }
                                placeholder={`Frag mich etwas...`}
                                className="w-full bg-white/5 border border-white/10 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 rounded-xl py-1.5 pl-2.5 pr-14 text-[10px] font-bold text-white outline-none transition-all placeholder:text-slate-500"
                              />
                              <div className="absolute inset-y-0 right-0.5 flex items-center gap-0.5">
                                {petIsThinking && (
                                  <div className="mr-1">
                                    <motion.div
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{
                                        repeat: Infinity,
                                        duration: 1,
                                      }}
                                      className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                                    />
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setPetAutoSpeak(!petAutoSpeak)}
                                  className={`p-1 rounded-lg transition-all ${petAutoSpeak ? "text-indigo-400" : "text-slate-500 hover:text-slate-300"}`}
                                  title={
                                    petAutoSpeak
                                      ? "Vorlesen an"
                                      : "Vorlesen aus"
                                  }
                                >
                                  {petAutoSpeak ? (
                                    <Volume2 size={11} />
                                  ) : (
                                    <VolumeX size={11} />
                                  )}
                                </button>
                                <button
                                  type="submit"
                                  disabled={
                                    !petChatInput.trim() || petIsThinking
                                  }
                                  className="p-1 px-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-30 transition-all active:scale-95 shadow-sm"
                                >
                                  {petIsThinking ? (
                                    <RefreshCw
                                      size={11}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Send size={11} />
                                  )}
                                </button>
                              </div>
                            </form>
                          </div>

                          <button
                            onClick={() => {
                              setPetBehaviorState("sleeping");
                              setPetReactionText(
                                `Schlafmodus aktiv! Chrr-püh... zZz... Ich schlafe leise am Rand, damit ihr super konzentriert lernen könnt! 😴`,
                              );
                              setApp((prev) => ({
                                ...prev,
                                classPet: {
                                  ...(prev.classPet || {
                                    enabled: true,
                                    animalType: "dino",
                                    name: "Spike",
                                    energy: 50,
                                    accessories: [],
                                    history: [],
                                    memories: [],
                                  }),
                                  behaviorMode: "sleep",
                                  isLocked: true,
                                },
                              }));
                              setPetQuickMenuOpen(false);
                            }}
                            className={`w-full py-1.5 px-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer ${
                              petBehaviorState === "sleeping"
                                ? "bg-indigo-600/40 border-indigo-400/50 text-white shadow-[0_4px_12px_rgba(79,70,229,0.35)] font-black backdrop-blur-md"
                                : "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <span className="text-base">😴</span>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide leading-none">
                                Schlafen
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold leading-normal">
                                Chrr-püh... zZz...
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setPetBehaviorState("learning");
                              setPetReactionText(
                                `Arbeitsmodus aktiv! 📖 Ich lese hier leise mein Buch, passe gut auf euch auf und störe niemanden! ✍️✨`,
                              );
                              setApp((prev) => ({
                                ...prev,
                                classPet: {
                                  ...(prev.classPet || {
                                    enabled: true,
                                    animalType: "dino",
                                    name: "Spike",
                                    energy: 50,
                                    accessories: [],
                                    history: [],
                                    memories: [],
                                  }),
                                  behaviorMode: "learn",
                                  isLocked: true,
                                },
                              }));
                              setPetQuickMenuOpen(false);
                            }}
                            className={`w-full py-1.5 px-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer ${
                              petBehaviorState === "learning"
                                ? "bg-amber-600/40 border-amber-400/50 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)] font-black backdrop-blur-md"
                                : "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <span className="text-base">📖</span>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide leading-none">
                                Lernen
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold leading-normal">
                                Leise lesen & zusehen
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setPetBehaviorState("idle");
                              setPetReactionText(
                                `Spielmodus aktiv! Ich bin wieder wach und tapsig. Spaziere gerne über den Bildschirm! 🐾`,
                              );
                              setApp((prev) => ({
                                ...prev,
                                classPet: {
                                  ...(prev.classPet || {
                                    enabled: true,
                                    animalType: "dino",
                                    name: "Spike",
                                    energy: 50,
                                    accessories: [],
                                    history: [],
                                    memories: [],
                                  }),
                                  behaviorMode: "wander",
                                  isLocked: true,
                                },
                              }));
                              setPetQuickMenuOpen(false);
                            }}
                            className={`w-full py-1.5 px-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer ${
                              petBehaviorState !== "sleeping" &&
                              petBehaviorState !== "learning"
                                ? "bg-indigo-600/40 border-indigo-400/50 text-white shadow-[0_4px_12px_rgba(99,102,241,0.35)] font-black backdrop-blur-md"
                                : "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <span className="text-base">🐾</span>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide leading-none">
                                Wandern
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold leading-normal">
                                Herumtapsen & Spaß haben
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              setPetReactionText(
                                `Automatischer Modus aktiv! Ich entscheide selbst, wann ich schlafe oder herumlaufe. ✨`,
                              );
                              setApp((prev) => ({
                                ...prev,
                                classPet: {
                                  ...(prev.classPet || {
                                    enabled: true,
                                    animalType: "dino",
                                    name: "Spike",
                                    energy: 50,
                                    accessories: [],
                                    history: [],
                                    memories: [],
                                  }),
                                  behaviorMode: "auto",
                                  isLocked: false,
                                },
                              }));
                              setPetQuickMenuOpen(false);
                            }}
                            className={`w-full py-1.5 px-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer ${
                              !app.classPet?.isLocked
                                ? "bg-slate-600/40 border-slate-400/50 text-white shadow-[0_4px_12px_rgba(71,85,105,0.35)] font-black backdrop-blur-md"
                                : "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10"
                            }`}
                          >
                            <span className="text-base">🤖</span>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide leading-none">
                                Auto-Pilot
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold leading-normal">
                                KI gesteuert & dynamisch
                              </span>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              startSidebarClimbing();
                              setPetQuickMenuOpen(false);
                            }}
                            disabled={sidebarMode === "hidden"}
                            className={`w-full py-1.5 px-3 rounded-2xl border flex items-center gap-3 transition-all active:scale-95 cursor-pointer ${
                              isClimbingSidebar
                                ? "bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-white shadow-[0_4px_12px_rgba(245,158,11,0.35)] font-black"
                                : sidebarMode === "hidden"
                                  ? "opacity-45 bg-white/5 border-white/5 text-slate-400 cursor-not-allowed"
                                  : "bg-white/5 border-white/5 text-slate-200 hover:bg-white/10 hover:border-white/10"
                            }`}
                            title={
                              sidebarMode === "hidden"
                                ? "Schülerliste muss dafür eingeblendet sein!"
                                : "Klassentier klettert Schülerliste hoch"
                            }
                          >
                            <span className="text-base">🧗‍♂️</span>
                            <div className="flex flex-col items-start text-left">
                              <span className="text-[10px] font-extrabold uppercase tracking-wide leading-none">
                                Klettern
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold leading-normal">
                                {sidebarMode === "hidden"
                                  ? "Liste ist ausgeblendet"
                                  : "Schülerliste hochklettern!"}
                              </span>
                            </div>
                          </button>
                        </div>

                        <div className="flex items-center justify-between w-full px-2.5 py-2 bg-white/5 rounded-2xl border border-white/5 mt-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                            Größe
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScaleChange(-0.1);
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-white/10 rounded-lg text-white hover:bg-white/20 active:scale-90 transition-all font-bold cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-[10px] font-mono font-bold text-white w-9 text-center">
                              {Math.round((petState.scale || 1.0) * 100)}%
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleScaleChange(0.1);
                              }}
                              className="w-7 h-7 flex items-center justify-center bg-white/10 rounded-lg text-white hover:bg-white/20 active:scale-90 transition-all font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="w-full mt-1 border-t border-white/10 pt-2 pb-0.5">
                          <button
                            onClick={() => {
                              setPetAccessoryOverlayOpen(true);
                              setPetQuickMenuOpen(false);
                            }}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-[10px] font-black uppercase tracking-wider text-center rounded-xl text-slate-200 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            ⚙️ Einstellungen
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Standardized Canvas Pet Rendering - Invisible container */}
                  <div className="w-full h-full relative flex-1 min-h-0 flex items-center justify-center select-none overflow-visible mt-2">
                    <motion.div
                      className="relative w-full h-full flex items-center justify-center overflow-visible pointer-events-none"
                      animate={
                        animationTrigger
                          ? clickAnimationType === "spin"
                            ? {
                                scale: [1, 1.25, 0.85, 1.1, 1],
                                y: [0, -35, 5, -8, 0],
                              }
                            : {
                                y: [0, -45, 10, -4, 0],
                                scale: [1, 1.12, 0.88, 1.05, 1],
                              }
                          : { y: 0, scale: 1, rotate: 0 }
                      }
                      transition={{
                        duration: 0.85,
                        ease: "easeInOut",
                      }}
                    >
                      {petBehaviorState === "sleeping" && (
                        <div className="absolute top-4 right-6 pointer-events-none select-none font-mono font-black flex flex-col items-center z-30">
                          <motion.span
                            animate={{
                              y: [0, -20],
                              x: [0, 4, -2],
                              opacity: [0, 1, 0],
                              scale: [0.6, 1.0, 0.7],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: 0,
                            }}
                            className="absolute text-violet-400 text-xs"
                          >
                            z
                          </motion.span>
                          <motion.span
                            animate={{
                              y: [0, -28],
                              x: [0, -3, 3],
                              opacity: [0, 1, 0],
                              scale: [0.7, 1.1, 0.8],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: 1,
                            }}
                            className="absolute text-violet-400 text-sm"
                          >
                            Z
                          </motion.span>
                          <motion.span
                            animate={{
                              y: [0, -36],
                              x: [0, 6, -4],
                              opacity: [0, 1, 0],
                              scale: [0.8, 1.3, 0.9],
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              delay: 2,
                            }}
                            className="absolute text-violet-400 text-md"
                          >
                            Zz
                          </motion.span>
                        </div>
                      )}

                      <ClassPetCanvas
                        ref={petCanvasRef}
                        isCalm={true}
                        animalType={petState.animalType || "dog"}
                        accessories={Array.from(
                          new Set([
                            ...(petState.accessories || []),
                            ...(getActiveSubject().toLowerCase().includes("mathe")
                              ? ["calculator", "glasses"]
                              : []),
                            ...(getActiveSubject().toLowerCase().includes("musik")
                              ? ["headphones"]
                              : []),
                          ]),
                        )}
                        behaviorMode={
                          petBehaviorState === "sleeping"
                            ? "sleep"
                            : petBehaviorState === "learning"
                              ? "learn"
                              : "wander"
                        }
                        energy={petState.energy || 50}
                        isMoving={
                          isClimbingSidebar
                            ? climbVelocityRef.current > 0.1
                            : isSlidingDown
                              ? true
                              : petBehaviorState === "walking"
                        }
                        isWakingUp={petIsWakingUp}
                        homeStyle={petState.homeStyle || "basket"}
                        boardWidgets={app.boardWidgets || []}
                        isPauseTimerRunning={isPauseTimerRunning}
                        scale={petState.scale || 1.0}
                        isClimbingSidebar={isClimbingSidebar}
                        isSlidingDown={isSlidingDown}
                        isBirthday={
                          (app.unterrichtsmodus_geburtstagskinder &&
                            app.unterrichtsmodus_geburtstagskinder.length > 0) ||
                          (app.schueler || []).some((s) =>
                            checkIsAutoBirthday(s.geburtstag),
                          )
                        }
                        birthdayNames={
                          app.schueler
                            ?.filter(
                              (s) =>
                                (
                                  app.unterrichtsmodus_geburtstagskinder || []
                                ).includes(s.id) ||
                                checkIsAutoBirthday(s.geburtstag),
                            )
                            .map((s) => s.vorname)
                            .join(", ") || ""
                        }
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            );
          })()}
      </AnimatePresence>

      {/* Centered Accessory Deck Modal Backdrop */}
      <AnimatePresence>
        {petAccessoryOverlayOpen && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-md z-[2000] flex items-center justify-center p-4 pointer-events-auto">
            <motion.div
              drag
              dragMomentum={false}
              dragElastic={0.1}
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="w-full max-w-4xl h-full max-h-[780px] relative z-[100] rounded-[2.5rem] flex flex-col text-white overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-slate-700/50 bg-slate-900/98 cursor-default active:cursor-grabbing"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Scanline subtle pattern */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.12)_50%,rgba(0,0,0,0.12))] bg-[length:100%_4px] pointer-events-none opacity-20" />

              {/* Decorative top header glow */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500 shadow-[0_4px_30px_rgba(16,185,129,0.5)]" />

              <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden p-6 md:p-8">
                {/* Header */}
                <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🐾</span>
                    <div className="text-left">
                      <h3 className="text-sm font-black text-indigo-400 tracking-wider flex items-center gap-2">
                        HAUSTIER-KOMMANDOZENTRALE
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Größe anpassen, Haustier einkleiden und spielerische Interaktionen steuern!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPetAccessoryOverlayOpen(false)}
                    className="text-slate-400 hover:text-white hover:bg-white/10 w-8 h-8 flex items-center justify-center rounded-xl text-md font-bold cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {/* TAB SELECTOR */}
                <div className="flex gap-1.5 p-1 bg-slate-950/60 rounded-xl my-4 border border-slate-800 shrink-0">
                  <button
                    onClick={() => setPetModalTab("profil")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      petModalTab === "profil"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <span>⚙️</span> Profil & Größe
                  </button>
                  <button
                    onClick={() => setPetModalTab("garderobe")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      petModalTab === "garderobe"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <span>🎒</span> Kleiderschrank
                  </button>
                  <button
                    onClick={() => setPetModalTab("ai")}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      petModalTab === "ai"
                        ? "bg-indigo-600 text-white shadow-md font-black"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                    }`}
                  >
                    <span>🎮</span> Interaktion & KI
                  </button>
                </div>

                {/* TAB CONTENT - Scrollable area */}
                <div className="flex-1 overflow-y-auto style-scrollbar pr-2 min-h-0">
                  {/* TAB 1: PROFIL & GRÖSSE */}
                  {petModalTab === "profil" && (
                    <div className="space-y-6 animate-fadeIn duration-200 text-left">
                      {(() => {
                        const petState = app.classPet || {
                          enabled: true,
                          animalType: "dino",
                          name: "Spike",
                          energy: 50,
                          accessories: [],
                          history: [],
                          memories: [],
                        };
                        const currentBreed =
                          PET_BREEDS.find((b) => b.id === petState.animalType) ||
                          PET_BREEDS[0];

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Left Box: Name, Breed and Preview */}
                            <div className="space-y-4">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                                Haustier-Profil
                              </span>

                              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                                <div className="flex items-center gap-4">
                                  {/* Animated Mascot Button to change breed */}
                                  <button
                                    onClick={() => {
                                      const currentIndex = PET_BREEDS.findIndex((b) => b.id === petState.animalType);
                                      const nextIndex = (currentIndex + 1) % PET_BREEDS.length;
                                      const nextBreed = PET_BREEDS[nextIndex];
                                      const isDefaultName = PET_BREEDS.some((b) => b.nameDefault === petState.name) || !petState.name;
                                      const newName = isDefaultName ? nextBreed.nameDefault : petState.name;
                                      setApp((prev: any) => ({
                                        ...prev,
                                        classPet: {
                                          ...petState,
                                          animalType: nextBreed.id,
                                          name: newName,
                                        }
                                      }));
                                    }}
                                    className="text-6xl animate-bounce relative flex items-center justify-center w-20 h-20 bg-slate-900 rounded-full border border-slate-700/60 shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-transform duration-200 focus:outline-none shrink-0"
                                    title="Klicken, um die Tierart zu wechseln! 🔄"
                                  >
                                    {currentBreed.emoji}
                                    {petState.accessories?.map((accId) => {
                                      const acc = AVAILABLE_ACCESSORIES.find((a) => a.id === accId);
                                      if (!acc) return null;
                                      return (
                                        <span key={acc.id} className={`${acc.styleClass} text-xl absolute`}>
                                          {acc.icon}
                                        </span>
                                      );
                                    })}
                                  </button>

                                  <div className="flex-1 min-w-0 font-mono">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs text-slate-400 uppercase font-bold">Name</span>
                                      <input
                                        type="text"
                                        value={petState.name}
                                        onChange={(e) => {
                                          const newName = e.target.value;
                                          setApp((prev) => ({
                                            ...prev,
                                            classPet: {
                                              ...(prev.classPet || {}),
                                              name: newName,
                                            } as any
                                          }));
                                        }}
                                                                       className="w-full bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs text-white focus:border-indigo-500 outline-none font-bold"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tierart wählen</label>
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
                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-indigo-400 cursor-pointer focus:outline-none hover:border-indigo-500/40 transition-colors"
                                  >
                                    {PET_BREEDS.map((breed) => (
                                      <option key={breed.id} value={breed.id} className="bg-slate-900 text-white">
                                        {breed.emoji} {breed.breedLabel} ({breed.nameDefault})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="space-y-1.5 pt-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Energie / Zufriedenheit</span>
                                    <span className="text-xs text-indigo-400 font-bold font-mono">{petState.energy || 50}%</span>
                                  </div>
                                  <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800 overflow-hidden p-0.5">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_12px_rgba(129,140,248,0.5)] transition-all duration-300"
                                      style={{ width: `${petState.energy || 50}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Quick selector of animals */}
                              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
                                  Tierart Schnellwahl:
                                </span>
                                <div className="grid grid-cols-6 gap-2">
                                  {PET_BREEDS.map((breed) => {
                                    const isSelected = breed.id === petState.animalType;
                                    return (
                                      <button
                                        key={breed.id}
                                        onClick={() => {
                                          const isDefaultName = PET_BREEDS.some((b) => b.nameDefault === petState.name) || !petState.name;
                                          const newName = isDefaultName ? breed.nameDefault : petState.name;
                                          setApp((prev: any) => ({
                                            ...prev,
                                            classPet: {
                                              ...petState,
                                              animalType: breed.id,
                                              name: newName,
                                            }
                                          }));
                                        }}
                                        className={`p-2 flex flex-col items-center justify-center rounded-xl transition-all duration-150 cursor-pointer ${
                                          isSelected
                                            ? "bg-indigo-500/20 border-2 border-indigo-400 scale-105 shadow-md"
                                            : "bg-slate-900/60 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/80"
                                        }`}
                                        title={`${breed.breedLabel}`}
                                      >
                                        <span className="text-xl">{breed.emoji}</span>
                                        <span className="text-[7px] text-slate-400 truncate mt-0.5 max-w-full font-bold">
                                          {breed.breedLabel}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Right Box: Scale Slider, Preset, and Sleeping house */}
                            <div className="space-y-4">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                                Größe & Schlaf-Zuhause
                              </span>

                              {/* NEU: Haustier-Größe / Skalierung */}
                              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                                <div className="flex justify-between items-center">
                                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                    Größe im Unterrichtsmodus
                                  </label>
                                  <span className="text-sm font-black text-indigo-400 font-mono bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                                    {(petState.scale || 1.0).toFixed(1)}x
                                  </span>
                                </div>

                                <p className="text-[10px] text-slate-400 leading-normal">
                                  Bewege den Schieberegler oder nutze die Voreinstellungen, um die Darstellungsgröße deines Haustiers auf dem Smartboard anzupassen.
                                </p>

                                <div className="space-y-2 pt-2">
                                  <input
                                    type="range"
                                    min="0.5"
                                    max="2.0"
                                    step="0.1"
                                    value={petState.scale || 1.0}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setApp((prev: any) => ({
                                        ...prev,
                                        classPet: {
                                          ...(prev.classPet || {}),
                                          scale: val,
                                        },
                                      }));
                                    }}
                                    className="w-full accent-emerald-500 bg-slate-900 h-2.5 rounded-full cursor-pointer appearance-none border border-slate-800"
                                  />
                                  <div className="flex justify-between text-[8px] text-slate-500 font-mono font-bold px-1">
                                    <span>0.5x (Winzig)</span>
                                    <span>1.0x (Standard)</span>
                                    <span>1.5x (Groß)</span>
                                    <span>2.0x (Riesig)</span>
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2 pt-1">
                                  {[
                                    { label: "Winzig", val: 0.6, icon: "🔍" },
                                    { label: "Standard", val: 1.0, icon: "⚖️" },
                                    { label: "Mittel", val: 1.3, icon: "📈" },
                                    { label: "Riesig", val: 1.7, icon: "👑" },
                                  ].map((preset) => {
                                    const isSelected = Math.abs((petState.scale || 1.0) - preset.val) < 0.05;
                                    return (
                                      <button
                                        key={preset.label}
                                        onClick={() => {
                                          setApp((prev: any) => ({
                                            ...prev,
                                            classPet: {
                                              ...(prev.classPet || {}),
                                              scale: preset.val,
                                            },
                                          }));
                                        }}
                                        className={`py-2 px-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wide flex flex-col items-center gap-1 transition-all duration-150 cursor-pointer ${
                                          isSelected
                                            ? "bg-emerald-500 text-slate-950 font-black shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-105"
                                            : "bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                                        }`}
                                      >
                                        <span className="text-sm">{preset.icon}</span>
                                        <span>{preset.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Schlaf-Zuhause */}
                              <div className="bg-slate-950/30 p-4 rounded-2xl border border-slate-800/80">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">
                                  🏡 Schlaf-Zuhause wählen:
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  {[
                                    { id: "basket", name: "Körbchen", icon: "🧺" },
                                    { id: "nest", name: "Zelt-Nest", icon: "🪺" },
                                    { id: "tent", name: "Zelt", icon: "⛺" },
                                    { id: "capsule", name: "Kapsel", icon: "🛸" },
                                  ].map((home) => {
                                    const isSelected = (petState.homeStyle || "basket") === home.id;
                                    return (
                                      <button
                                        key={home.id}
                                        onClick={() => {
                                          setApp((prev) => ({
                                            ...prev,
                                            classPet: {
                                              ...(prev.classPet || {}),
                                              homeStyle: home.id as any,
                                            } as any,
                                          }));
                                        }}
                                        className={`py-3 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-2.5 ${
                                          isSelected
                                            ? "bg-indigo-600/30 border-indigo-400 text-white shadow-lg"
                                            : "bg-slate-900 border-slate-800/85 text-slate-400 hover:bg-slate-800 hover:border-slate-700"
                                        }`}
                                      >
                                        <span className="text-lg">{home.icon}</span>
                                        <span className="truncate">{home.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* TAB 2: GARDEROBE */}
                  {petModalTab === "garderobe" && (
                    <div className="space-y-4 animate-fadeIn duration-200 text-left">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                          🎒 Garderobe / Accessoires (Hut & Brille)
                        </span>
                        <button
                          onClick={() => {
                            setApp((prev) => ({
                              ...prev,
                              classPet: {
                                ...(prev.classPet || { enabled: true, animalType: "dino", name: "Spike", energy: 50, history: [] }),
                                accessories: [],
                              },
                            }));
                          }}
                          className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 transition-colors cursor-pointer"
                        >
                          Alle ablegen 🧹
                        </button>
                      </div>

                      <div className="bg-slate-950/40 p-5 rounded-2xl border border-slate-800/80">
                        <p className="text-[10.5px] text-slate-400 mb-4 leading-normal">
                          Statte dein Klassen-Tier mit tollen Hüten, Brillen oder Schleifen aus! Klicke auf ein Accessoire, um es anzuziehen oder abzulegen. Es wird direkt auf dem Tierchen gerendert.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {AVAILABLE_ACCESSORIES.map((acc) => {
                            const petState = app.classPet || {
                              enabled: true,
                              animalType: "dino",
                              name: "Spike",
                              energy: 50,
                              accessories: [],
                              history: [],
                            };
                            const isEquipped = petState.accessories?.includes(acc.id);
                            return (
                              <button
                                key={acc.id}
                                onClick={() => {
                                  setApp((prev) => {
                                    const current = prev.classPet || {
                                      enabled: true,
                                      animalType: "dino",
                                      name: "Spike",
                                      energy: 50,
                                      history: [],
                                      accessories: [],
                                    };
                                    const accs = current.accessories || [];
                                    const nextAccs = accs.includes(acc.id)
                                      ? accs.filter((id) => id !== acc.id)
                                      : [...accs, acc.id];
                                    return {
                                      ...prev,
                                      classPet: {
                                        ...current,
                                        accessories: nextAccs,
                                      },
                                    };
                                  });
                                }}
                                className={`py-4 px-3 rounded-2xl text-[10px] font-black uppercase tracking-wider text-center border cursor-pointer active:scale-95 transition-all duration-200 flex flex-col items-center gap-2 justify-center relative ${
                                  isEquipped
                                    ? "bg-indigo-500/10 border-indigo-400 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)] scale-[1.03]"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 hover:bg-slate-850"
                                }`}
                              >
                                {isEquipped && (
                                  <span className="absolute top-1.5 right-1.5 bg-indigo-500 text-white text-[7px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center">
                                    ✓
                                  </span>
                                )}
                                <span className="text-3xl filter drop-shadow-sm">{acc.icon}</span>
                                <span className="truncate max-w-full font-bold text-[9px]">{acc.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: SPIEL & KI */}
                  {petModalTab === "ai" && (
                    <div className="space-y-6 animate-fadeIn duration-200 text-left">
                      {/* Subgrid: Left column behavior modes + toys, Right column AI chat */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Column Left: Actions & Play toys */}
                        <div className="space-y-4">
                          {/* Behavior/Focus mode section */}
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1 mb-2">
                              Fokus & Aktivitäts-Modus
                            </span>
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                              <p className="text-[10px] text-slate-400 leading-normal">
                                Entscheide, wie sich das Haustier verhalten soll, um Fokus oder Entspannung in der Klasse zu fördern.
                              </p>

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    if (petBehaviorState === "sleeping") {
                                      setPetBehaviorState("joy");
                                      setPetReactionText(`Ahoi! Ich habe wunderbar geschlafen. Bereit für die Klasse! 👀✨`);
                                      setApp((prev) => ({
                                        ...prev,
                                        classPet: {
                                          ...(prev.classPet || {
                                            enabled: true,
                                            animalType: "dino",
                                            name: "Spike",
                                            energy: 50,
                                            accessories: [],
                                            history: [],
                                            memories: [],
                                          }),
                                          behaviorMode: "wander",
                                          isLocked: true,
                                        },
                                      }));
                                    } else {
                                      setPetBehaviorState("sleeping");
                                      setPetReactionText(`Schlafmodus aktiv! Chrr-püh... zZz... Ich schlafe leise am Rand, damit ihr super konzentriert lernen könnt! 😴`);
                                      setApp((prev) => ({
                                        ...prev,
                                        classPet: {
                                          ...(prev.classPet || {
                                            enabled: true,
                                            animalType: "dino",
                                            name: "Spike",
                                            energy: 50,
                                            accessories: [],
                                            history: [],
                                            memories: [],
                                          }),
                                          behaviorMode: "sleep",
                                          isLocked: true,
                                        },
                                      }));
                                    }
                                  }}
                                  className={`py-3 px-2 border rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1.5 active:scale-95 transition-all text-center cursor-pointer ${
                                    petBehaviorState === "sleeping"
                                      ? "bg-indigo-600/30 border-indigo-400 text-white shadow-md"
                                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="text-xl">😴</span>
                                  <span>{petBehaviorState === "sleeping" ? "Aufwecken" : "Schlafen legen"}</span>
                                </button>

                                <button
                                  onClick={() => {
                                    if (petBehaviorState === "learning") {
                                      setPetBehaviorState("joy");
                                      setPetReactionText(`Arbeitsmodus beendet. Ich bin wieder zum Spielen bereit! 😃`);
                                      setApp((prev) => ({
                                        ...prev,
                                        classPet: {
                                          ...(prev.classPet || {
                                            enabled: true,
                                            animalType: "dino",
                                            name: "Spike",
                                            energy: 50,
                                            accessories: [],
                                            history: [],
                                            memories: [],
                                          }),
                                          behaviorMode: "wander",
                                          isLocked: true,
                                        },
                                      }));
                                    } else {
                                      setPetBehaviorState("learning");
                                      setPetReactionText(`Arbeitsmodus aktiv! 📖 Ich lese hier leise mein Buch, passe gut auf euch auf und störe niemanden! ✍️✨`);
                                      setApp((prev) => ({
                                        ...prev,
                                        classPet: {
                                          ...(prev.classPet || {
                                            enabled: true,
                                            animalType: "dino",
                                            name: "Spike",
                                            energy: 50,
                                            accessories: [],
                                            history: [],
                                            memories: [],
                                          }),
                                          behaviorMode: "learn",
                                          isLocked: true,
                                        },
                                      }));
                                    }
                                  }}
                                  className={`py-3 px-2 border rounded-xl text-[10px] font-black uppercase flex flex-col items-center gap-1.5 active:scale-95 transition-all text-center cursor-pointer ${
                                    petBehaviorState === "learning"
                                      ? "bg-amber-600/30 border-amber-400 text-white shadow-md"
                                      : "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800"
                                  }`}
                                >
                                  <span className="text-xl">📖</span>
                                  <span>{petBehaviorState === "learning" ? "Stoppen" : "Lernen lassen"}</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Spontaneous Actions */}
                          <div>
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1 mb-2">
                              Aktionen & Interaktion
                            </span>
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => {
                                    setPetAccessoryOverlayOpen(false);
                                    if (petDancing) {
                                      setPetDancing(false);
                                      setPetReactionText(`Tanzpause beendet. Puh! 😃`);
                                    } else {
                                      setPetDancing(true);
                                      setPetReactionText(`🎵 Aktiv-Pause! Steht auf und tanzt! 🕺`);
                                    }
                                  }}
                                  className="py-3 px-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white rounded-xl text-[10px] font-black uppercase active:scale-90 transition-all text-center cursor-pointer flex flex-col items-center gap-1.5"
                                >
                                  <span className="text-xl">🕺</span>
                                  <span>{petDancing ? "Tanz stopp" : "Tanz-Pause 🕺"}</span>
                                </button>
                                <button
                                  onClick={() => handlePetActionInSmartboard(15, "🍬 Mampf!", "🍬")}
                                  className="py-3 px-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-400/30 text-white rounded-xl text-[10px] font-black uppercase active:scale-90 transition-all text-center cursor-pointer flex flex-col items-center gap-1.5"
                                >
                                  <span className="text-xl">🍬</span>
                                  <span>Leckerli geben</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Toys */}
                          <div>
                            <div className="flex justify-between items-center px-1 mb-2">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                Spielsachen werfen (Smartboard)
                              </span>
                              <button
                                onClick={() => petCanvasRef.current?.clearToys()}
                                className="text-[8px] font-black text-rose-400 hover:text-rose-355 uppercase bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition-colors"
                              >
                                Aufräumen 🧹
                              </button>
                            </div>
                            <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.spawnToy("ball"), "Flummi geworfen")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🥎</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Flummi
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.spawnToy("bubble"), "Blasen gemacht")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>💦</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Blasen
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.spawnToy("balloon"), "Ballon aufgeblasen")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🎈</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Ballon
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.spawnToy("yarn"), "Wollknäuel geworfen")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🧶</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Wolle
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.spawnToy("feather"), "Mit der Feder gespielt")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🪶</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Feder
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.feed(), "Mampf mampf! Das tut gut!")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🍪</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Füttern
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.celebrate(), "Juhuuu! Salto!")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>✨</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Kunststück
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => petCanvasRef.current?.bounce(), "High-Five! Toll gemacht!")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>✋</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    High-Five
                                  </span>
                                </button>
                                <button
                                  onClick={() => queuePetAction(() => {
                                    if(petCanvasRef.current && typeof petCanvasRef.current.setMood === "function") {
                                      petCanvasRef.current.setMood(100);
                                    }
                                  }, "Gemeinsam durchatmen...")}
                                  className="py-2.5 bg-slate-900 hover:bg-slate-800 rounded-xl text-lg transition-all cursor-pointer border border-slate-800 hover:border-slate-700 active:scale-90 flex flex-col items-center gap-1"
                                >
                                  <span>🧘</span>
                                  <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-wide">
                                    Beruhigen
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Column Right: AI Brain */}
                        <div className="space-y-4">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block px-1">
                            🧠 KI-Gehirn & Live-Unterhaltung
                          </span>

                          {(() => {
                            const petState = app.classPet || {
                              enabled: true,
                              name: "Spike",
                            };
                            return (
                              <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-inner">
                                <div className="bg-indigo-950/20 border border-indigo-500/20 p-3.5 rounded-xl text-left">
                                  <span className="text-[8px] font-extrabold text-indigo-400 uppercase tracking-widest block mb-1">
                                    Umgebungs-KI aktiviert:
                                  </span>
                                  <p className="text-[10px] text-slate-300 leading-normal font-sans">
                                    {petState.name} lernt kontinuierlich aus euren Klassen-Interaktionen und besitzt ein eigenes, schlaues Gehirn!
                                  </p>
                                </div>

                                {/* Custom Speech Bubble */}
                                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl min-h-[100px] flex flex-col justify-between">
                                  <div className="space-y-1">
                                    <span className="font-bold text-indigo-400 text-[8px] uppercase block tracking-widest">
                                      💬 {petState.name}:
                                    </span>
                                    <p className="text-[11px] leading-relaxed text-slate-255 italic font-sans font-medium">
                                      {petReactionText ? `"${petReactionText}"` : `"Hallo! Ich bin bereit zum Quatschen oder Lernen. Stell mir eine Frage!"`}
                                    </p>
                                  </div>

                                  {petIsThinking && (
                                    <div className="flex gap-1 items-center justify-start mt-2 text-[8px] text-slate-400 font-mono font-bold">
                                      <span className="animate-ping rounded-full w-1.5 h-1.5 bg-indigo-400" />
                                      <span>Denkt nach...</span>
                                    </div>
                                  )}
                                </div>

                                {/* Live chat input */}
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={petChatInput}
                                    onChange={(e) => setPetChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && petChatInput.trim() && !petIsThinking) {
                                        triggerClassPetAI("chat", petChatInput.trim());
                                        setPetChatInput("");
                                      }
                                    }}
                                    disabled={petIsThinking}
                                    placeholder={`Frage ${petState.name} etwas...`}
                                    className="flex-1 bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs text-white placeholder-slate-500 focus:border-indigo-500 outline-none font-sans"
                                  />
                                  <button
                                    onClick={() => {
                                      if (petChatInput.trim() && !petIsThinking) {
                                        triggerClassPetAI("chat", petChatInput.trim());
                                        setPetChatInput("");
                                      }
                                    }}
                                    disabled={petIsThinking || !petChatInput.trim()}
                                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all shrink-0 cursor-pointer"
                                  >
                                    Fragen
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Save Button */}
                <div className="pt-4 border-t border-slate-800 mt-4 shrink-0">
                  <button
                    onClick={() => setPetAccessoryOverlayOpen(false)}
                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black uppercase rounded-xl text-xs tracking-widest cursor-pointer shadow-lg shadow-indigo-500/10 active:scale-95 transition-all"
                  >
                    EINSTELLUNGEN ÜBERNEHMEN & SCHLIESSEN 🐾
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QR Code Kopplungs-Info Card */}
      <AnimatePresence>
        {app.boardSettings?.activeSyncCode &&
          showSyncInfo &&
          !app.boardSettings?.isRemoteController && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-[3000] flex items-center justify-center pointer-events-none p-4"
            >
              <div className="w-[360px] bg-black/95 backdrop-blur-3xl p-6 rounded-3xl border border-indigo-500/30 shadow-[0_20px_100px_rgba(0,0,0,0.85)] pointer-events-auto select-none flex flex-col gap-3">
                {/* Header & Tabs */}
                <div className="flex justify-between items-center">
                  {/* Mode Tabs */}
                  <div className="flex bg-white/10 p-0.5 rounded-xl gap-0.5">
                    <button
                      onClick={() => setSyncModalTab('remote')}
                      className={`px-2.5 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                        syncModalTab === 'remote' ? 'bg-indigo-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <Smartphone size={12} /> Remote
                    </button>
                    <button
                      onClick={() => setSyncModalTab('wifi')}
                      className={`px-2.5 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                        syncModalTab === 'wifi' ? 'bg-emerald-600 text-white shadow' : 'text-stone-400 hover:text-white'
                      }`}
                    >
                      <Wifi size={12} /> WLAN
                    </button>
                  </div>

                  <button
                    onClick={() => setShowSyncInfo(false)}
                    className="text-stone-400 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>

                {syncModalTab === 'remote' ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-indigo-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={13} /> Handy-Fernbedienung
                      </div>
                      {(() => {
                        const lastActive = app.boardSettings?.remoteLastActiveTs;
                        const isRecentlyActive = lastActive && (Date.now() - lastActive < 30000);
                        return (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.5625rem] font-black uppercase ${
                            isRecentlyActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            <span>{isRecentlyActive ? '🟢 VERBUNDEN' : '🟡 WARTE SCAN'}</span>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-2xl shadow-inner">
                      <QRCodeCanvas
                        value={`${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings.activeSyncCode}`}
                        size={150}
                        level={"Q"}
                      />
                    </div>

                    <div className="text-center bg-white/5 border border-white/10 rounded-2xl p-2 font-mono">
                      <div className="text-[8px] text-indigo-300 font-bold uppercase tracking-wider mb-0.5">Kopplungscode</div>
                      <div className="text-lg font-black text-white tracking-widest">{app.boardSettings.activeSyncCode}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const syncUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings?.activeSyncCode}`;
                          navigator.clipboard.writeText(syncUrl);
                          showToast("Kopplungs-Link kopiert!", "success");
                        }}
                        className="py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
                      >
                        <Copy size={11} /> Link kopieren
                      </button>

                      <button
                        onClick={() => {
                          const syncUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings?.activeSyncCode}`;
                          window.open(syncUrl, '_blank', 'width=420,height=800,resizable=yes');
                        }}
                        className="py-2 bg-white/10 hover:bg-white/20 text-stone-200 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-white/10"
                      >
                        <ExternalLink size={11} /> In neuem Tab
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-emerald-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                        <Wifi size={13} /> WLAN-Kopplungscode
                      </div>
                      <span className="text-[0.5625rem] font-extrabold text-emerald-300 uppercase tracking-wider bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        Netzwerk-QR
                      </span>
                    </div>

                    <div className="flex flex-col items-center justify-center bg-white p-3.5 rounded-2xl shadow-inner">
                      <QRCodeCanvas
                        value={app.boardSettings?.wifiSettings?.security === 'nopass'
                          ? `WIFI:S:${app.boardSettings?.wifiSettings?.ssid || 'Schul-WLAN-Klasse'};T:nopass;;`
                          : `WIFI:S:${app.boardSettings?.wifiSettings?.ssid || 'Schul-WLAN-Klasse'};T:WPA;P:${app.boardSettings?.wifiSettings?.password || 'Schule2026!'};;`
                        }
                        size={150}
                        level={"Q"}
                      />
                    </div>

                    <div className="text-center bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-2 font-mono">
                      <div className="text-[8px] text-emerald-300 font-bold uppercase tracking-wider mb-0.5">WLAN-Netzwerk (SSID)</div>
                      <div className="text-sm font-black text-white tracking-wider">{app.boardSettings?.wifiSettings?.ssid || 'Schul-WLAN-Klasse'}</div>
                      <div className="text-[10px] text-emerald-200 font-mono mt-0.5">
                        PW: <span className="text-white font-bold">{app.boardSettings?.wifiSettings?.password || 'Schule2026!'}</span>
                      </div>
                    </div>

                    <p className="text-[8.5px] leading-relaxed text-stone-300 font-sans text-center">
                      📱 Halte deine Handy-Kamera auf diesen Code, um direkt mit dem Schul-WLAN verbunden zu werden.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
      </AnimatePresence>

      {/* Collapse Toggle Handle (Tab style when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 transition-all group"
          style={{ backgroundColor: `${currentTheme.colors.textPrimary}05` }}
        >
          <div className="relative">
            <Users
              size={24}
              className="transition-colors"
              style={{ color: `${currentTheme.colors.textPrimary}33` }}
            />
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center border-2"
              style={{
                backgroundColor: currentTheme.colors.accent,
                color: currentTheme.colors.buttonText,
                borderColor: currentTheme.colors.surface,
              }}
            >
              {app.schueler.length}
            </div>
          </div>
        </button>
      )}

      <AnimatePresence>
        {isThemePickerOpen && (
          <UnterrichtsmodusThemePicker
            app={app}
            setApp={setApp}
            isOpen={isThemePickerOpen}
            onClose={() => setIsThemePickerOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSpotlight && (
          <motion.div
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: -100, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[400] w-[400px]"
          >
            <div
              className="rounded-2xl p-4 border shadow-3xl flex items-center gap-4"
              style={{
                backgroundColor: `${currentTheme.colors.background}f5`,
                borderColor: currentTheme.colors.border,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black shadow-lg"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  color: currentTheme.colors.buttonText,
                }}
              >
                {spotlightStudent?.vorname?.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[9px] font-black uppercase tracking-widest mb-0.5 flex items-center justify-between"
                  style={{ color: `${currentTheme.colors.accent}99` }}
                >
                  <span>Zufallsauswahl</span>
                  <button
                    onClick={() => setNoRepeats(!noRepeats)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full transition-all border`}
                    style={{
                      backgroundColor: noRepeats
                        ? `${currentTheme.colors.accent}33`
                        : "transparent",
                      borderColor: noRepeats
                        ? currentTheme.colors.accent
                        : currentTheme.colors.border,
                      color: noRepeats
                        ? currentTheme.colors.accent
                        : currentTheme.colors.textSecondary,
                    }}
                  >
                    <RotateCcw size={8} />
                    <span className="text-[7px] font-black">
                      {noRepeats ? "Fix" : "Mix"}
                    </span>
                  </button>
                </div>
                <h2
                  className="text-xl font-black tracking-tighter truncate"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  {spotlightStudent?.vorname}
                </h2>
              </div>
              <button
                onClick={() => setShowSpotlight(false)}
                className="w-10 h-10 hover:bg-opacity-80 rounded-lg flex items-center justify-center transition-all border"
                style={{
                  backgroundColor: `${currentTheme.colors.accent}1a`,
                  color: currentTheme.colors.accent,
                  borderColor: `${currentTheme.colors.accent}33`,
                }}
              >
                <Check size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLEANUP Checklist Overlay */}
      <AnimatePresence>
        {showCleanup && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="fixed top-32 right-12 bottom-12 w-96 rounded-[3.5rem] shadow-2xl shadow-black p-10 z-[250] border flex flex-col transition-colors duration-700 backdrop-blur-2xl"
            style={{
              backgroundColor: `${currentTheme.colors.surface}f9`,
              borderColor: currentTheme.colors.border,
            }}
          >
            <div className="flex items-center gap-6 mb-10 relative">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-[1.5rem] flex items-center justify-center">
                <Sparkles size={32} />
              </div>
              <div>
                <h3
                  className="text-2xl font-black tracking-tight"
                  style={{ color: currentTheme.colors.textPrimary }}
                >
                  Klasse verlassen
                </h3>
                <p
                  className="text-[11px] font-black uppercase tracking-widest mt-0.5"
                  style={{ color: currentTheme.colors.textSecondary }}
                >
                  Checkliste
                </p>
              </div>
              <button
                onClick={() => setShowCleanup(false)}
                className="absolute -top-4 -right-4 w-10 h-10 bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {cleanupItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-5 p-5 border rounded-3xl cursor-pointer group transition-all"
                  style={{
                    backgroundColor: `${currentTheme.colors.textPrimary}05`,
                    borderColor: currentTheme.colors.border,
                  }}
                >
                  <div className="flex items-center gap-5 flex-1">
                    <div
                      className="w-8 h-8 border-2 rounded-xl flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: currentTheme.colors.border,
                      }}
                    >
                      <Check
                        size={18}
                        className="scale-0 group-hover:scale-100 transition-transform"
                        style={{ color: currentTheme.colors.accent }}
                      />
                    </div>
                    <span
                      className="text-[15px] font-black transition-colors"
                      style={{ color: currentTheme.colors.textSecondary }}
                    >
                      {item}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCleanupItems((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                    }}
                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Eigener Punkt..."
                    className="flex-1 rounded-2xl px-4 py-3 text-sm font-bold outline-none transition-all border"
                    style={{
                      backgroundColor: `${currentTheme.colors.textPrimary}0d`,
                      borderColor: currentTheme.colors.border,
                      color: currentTheme.colors.textPrimary,
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          setCleanupItems((prev) => [...prev, val]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="pt-8">
              <button
                onClick={() => setShowCleanup(false)}
                className="w-full h-16 rounded-2xl font-black text-[12px] uppercase tracking-[0.25em] shadow-xl active:scale-95 transition-all"
                style={{
                  backgroundColor: currentTheme.colors.accent,
                  color: currentTheme.colors.buttonText,
                }}
              >
                Alles erledigt!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTE EDIT OVERLAY */}
      <AnimatePresence>
        {editingNotes && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#1a1816] w-[400px] rounded-[2.5rem] border border-white/10 shadow-3xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Edit3 size={18} className="text-amber-500" />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Notiz bearbeiten
                  </h3>
                </div>
                <button
                  onClick={() => setEditingNotes(null)}
                  className={`p-2 rounded-full transition-all ${currentIsLight ? "hover:bg-black/5 text-slate-400 hover:text-slate-800" : "hover:bg-white/5 text-white/20 hover:text-white"}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div
                  className={`p-4 rounded-2xl border ${currentIsLight ? "bg-black/5 border-black/5" : "bg-white/5 border-white/5"}`}
                >
                  <div className="text-[8px] font-black text-amber-500/40 uppercase tracking-widest mb-1">
                    Schüler:in
                  </div>
                  <div
                    className={`text-sm font-bold capitalize ${currentIsLight ? "text-slate-800" : "text-white"}`}
                  >
                    {app.schueler.find((s) => s.id === editingNotes)?.vorname}{" "}
                    {app.schueler.find((s) => s.id === editingNotes)?.nachname}
                  </div>
                </div>

                <textarea
                  autoFocus
                  className={`w-full h-32 rounded-2xl p-4 text-sm outline-none focus:border-amber-500/40 transition-all resize-none ${currentIsLight ? "bg-black/5 border-black/10 text-slate-800" : "bg-black/40 border-white/10 text-white/80"}`}
                  placeholder="Notiz eingeben..."
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingNotes(null)}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${currentIsLight ? "bg-black/5 text-slate-500 hover:bg-black/10" : "bg-white/5 text-white/40 hover:bg-white/10"}`}
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => saveNote(editingNotes!)}
                    className="flex-[2] py-4 rounded-2xl bg-amber-500 text-amber-950 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                  >
                    Speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK LINKS SHEET */}
      <AnimatePresence>
        {showLinksSheet && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ pointerEvents: "auto", opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
              onPointerDown={() => setShowLinksSheet(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative z-[601] w-full max-w-sm rounded-[2rem] border overflow-hidden p-6 shadow-2xl ${activeFokusThemeVars.isLight ? "bg-white/80 border-slate-200 shadow-slate-900/10" : "bg-[#18181b]/80 border-white/10 shadow-black/50"} backdrop-blur-2xl`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center">
                    <Link size={16} />
                  </div>
                  <h3
                    className={`font-black tracking-tight ${activeFokusThemeVars.isLight ? "text-slate-900" : "text-white"}`}
                  >
                    Quick Links
                  </h3>
                </div>
                <button
                  onPointerDown={() => setShowLinksSheet(false)}
                  className={`p-2 rounded-full transition-all ${activeFokusThemeVars.isLight ? "text-slate-400 hover:bg-slate-100 hover:text-slate-800" : "text-white/40 hover:bg-white/10 hover:text-white"}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar pb-4">
                {(app.quickLinks || []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {(app.quickLinks || []).map((link) => {
                      const colorClassLight =
                        link.color === "sky"
                          ? "bg-sky-50 border-sky-200 text-sky-900 hover:bg-sky-100"
                          : link.color === "indigo"
                            ? "bg-indigo-50 border-indigo-200 text-indigo-900 hover:bg-indigo-100"
                            : link.color === "emerald"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100"
                              : link.color === "rose"
                                ? "bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100"
                                : link.color === "amber"
                                  ? "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                                  : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100";

                      const colorClassDark =
                        link.color === "sky"
                          ? "bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20"
                          : link.color === "indigo"
                            ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20"
                            : link.color === "emerald"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : link.color === "rose"
                                ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20"
                                : link.color === "amber"
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                  : "bg-white/5 border-white/5 text-white/90 hover:bg-white/10";

                      const iconBgClass =
                        link.color === "sky"
                          ? "bg-sky-500"
                          : link.color === "indigo"
                            ? "bg-indigo-500"
                            : link.color === "emerald"
                              ? "bg-emerald-500"
                              : link.color === "rose"
                                ? "bg-rose-500"
                                : link.color === "amber"
                                  ? "bg-amber-500"
                                  : "bg-blue-500";

                      return (
                        <div
                          key={link.id}
                          className={`flex flex-col p-3 rounded-xl border transition-all ${activeFokusThemeVars.isLight ? colorClassLight : colorClassDark} relative group`}
                        >
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 mb-1 overflow-hidden"
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <div
                              className={`w-6 h-6 rounded flex items-center justify-center font-black text-white text-[10px] shrink-0 ${iconBgClass}`}
                            >
                              {link.label.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-sm truncate">
                              {link.label}
                            </span>
                          </a>
                          <button
                            onPointerDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              removeLink(link.id);
                            }}
                            className={`absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg ${activeFokusThemeVars.isLight ? "bg-white/80 hover:bg-white text-slate-400 hover:text-rose-500" : "bg-black/50 hover:bg-black/80 text-white/50 hover:text-rose-400"}`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`text-center py-8 text-sm font-bold ${activeFokusThemeVars.isLight ? "text-slate-400" : "text-white/40"}`}
                  >
                    Noch keine Links hinzugefügt.
                  </div>
                )}
              </div>

              {showLinkAdder ? (
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Titel (z.B. Anton App)"
                    value={newLink.label}
                    onChange={(e) =>
                      setNewLink({ ...newLink, label: e.target.value })
                    }
                    className={`w-full p-3 rounded-xl text-sm font-bold outline-none border transition-all ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 focus:border-blue-500" : "bg-black/40 border-white/10 focus:border-blue-500"}`}
                  />
                  <input
                    type="url"
                    placeholder="URL (https://...)"
                    value={newLink.url}
                    onChange={(e) =>
                      setNewLink({ ...newLink, url: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addLink();
                    }}
                    className={`w-full p-3 rounded-xl text-sm font-bold outline-none border transition-all ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 focus:border-blue-500" : "bg-black/40 border-white/10 focus:border-blue-500"}`}
                  />
                  <div className="flex gap-2 justify-center py-2">
                    {["blue", "sky", "indigo", "emerald", "rose", "amber"].map(
                      (color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLink({ ...newLink, color })}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${newLink.color === color ? "border-white scale-110 shadow-lg" : "border-transparent scale-100 hover:scale-110"} bg-${color}-500`}
                        />
                      ),
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowLinkAdder(false)}
                      className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider ${activeFokusThemeVars.isLight ? "bg-slate-100 text-slate-500" : "bg-white/5 text-white/50"}`}
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={addLink}
                      className="flex-1 py-3 rounded-xl font-bold bg-blue-500 text-white text-xs uppercase tracking-wider"
                    >
                      Hinzufügen
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowLinkAdder(true)}
                  className={`w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-dashed ${activeFokusThemeVars.isLight ? "border-slate-300 text-slate-500 hover:bg-slate-50 hover:text-slate-800" : "border-white/20 text-white/50 hover:bg-white/5 hover:text-white"}`}
                >
                  <Plus size={14} /> Neuer Link
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ZEN FOCUS OVERLAY */}
      <AnimatePresence>
        {showZenFocus && (
          <div className="fixed inset-0 z-[1200] flex flex-col items-center justify-between p-6 bg-[#040406] text-stone-100 overflow-hidden select-none">
            {/* Ambient Background subtle lights/aurora for cinema atmosphere */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-30">
              <div
                className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] animate-pulse"
                style={{ animationDuration: "8s" }}
              />
              <div
                className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse"
                style={{ animationDuration: "12s" }}
              />
            </div>

            {/* Top Bar with title & exit */}
            <div className="w-full flex items-center justify-between text-stone-400 z-10 max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="text-xl">🧘</span>
                <div className="text-left">
                  <h4 className="text-xs font-black tracking-widest text-indigo-400 uppercase">
                    Zen-Kino-Fokus
                  </h4>
                  <p className="text-[9px] font-bold text-stone-500 uppercase tracking-widest mt-0.5">
                    Konzentration & Entspannung
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowZenFocus(false);
                  setZenSoundType("none");
                }}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5 shadow-md active:scale-95 duration-150"
                title="Zen-Fokus verlassen"
              >
                <X size={18} />
              </button>
            </div>

            {/* Central Circle Display */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 gap-8 min-h-0 w-full max-w-md">
              <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
                {/* Visual pulse rings */}
                {app.boardSettings.timerRunning && (
                  <>
                    <div className="absolute inset-0 rounded-full border border-indigo-500/5 animate-[ping_4s_linear_infinite]" />
                    <div className="absolute inset-4 rounded-full border border-emerald-500/5 animate-[ping_6s_linear_infinite]" />
                  </>
                )}

                {/* Main ticking circle */}
                <svg
                  viewBox="-5 -5 110 110"
                  className="w-full h-full -rotate-90 drop-shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-visible pointer-events-none"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    className="stroke-[#13121a] fill-none"
                    strokeWidth="4"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="46"
                    className="stroke-indigo-500 fill-none"
                    strokeWidth="4"
                    strokeDasharray={289}
                    animate={{
                      strokeDashoffset:
                        289 *
                        (1 -
                          timerDisplaySec /
                            (app.boardSettings.timerTotal || 60)),
                    }}
                    transition={{ type: "tween", ease: "linear" }}
                    strokeLinecap="round"
                    style={{ strokeWidth: 3 }}
                  />
                </svg>

                {/* Inner central time text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-stone-500 text-[10px] font-black uppercase tracking-[0.25em] mb-2 leading-none">
                    {app.boardSettings.timerRunning
                      ? "Verbleibende Zeit"
                      : "Zeit (Klicken zum Ändern)"}
                  </span>

                  <div
                    onClick={() => {
                      if (!app.boardSettings.timerRunning) {
                        setZenTimeInput(
                          Math.floor(timerDisplaySec / 60).toString(),
                        );
                        setIsEditingZenTime(true);
                      }
                    }}
                    className={`text-6xl font-black tabular-nums tracking-tighter transition-all duration-300 ${
                      app.boardSettings.timerRunning
                        ? ""
                        : "cursor-pointer hover:text-indigo-400"
                    } ${
                      timerDisplaySec < 10 && app.boardSettings.timerRunning
                        ? "text-rose-500 animate-pulse scale-105"
                        : "text-indigo-200"
                    }`}
                  >
                    {isEditingZenTime ? (
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={zenTimeInput}
                        onChange={(e) => setZenTimeInput(e.target.value)}
                        onBlur={() => {
                          setIsEditingZenTime(false);
                          const mins = parseInt(zenTimeInput);
                          if (!isNaN(mins) && mins >= 0) {
                            const secs = mins * 60;
                            setTimerDisplaySec(secs);
                            setApp((prev) => ({
                              ...prev,
                              boardSettings: {
                                ...prev.boardSettings,
                                timerTotal: secs,
                                timerEnd: prev.boardSettings.timerRunning
                                  ? Date.now() + secs * 1000
                                  : prev.boardSettings.timerEnd,
                              },
                            }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          } else if (e.key === "Escape") {
                            setIsEditingZenTime(false);
                          }
                        }}
                        className="w-28 text-center bg-white/5 border-b-2 border-indigo-500 text-5xl font-black outline-none focus:ring-0 p-1 rounded-lg text-indigo-100"
                        placeholder="Min"
                        autoFocus
                        onPointerDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        {Math.floor(timerDisplaySec / 60)
                          .toString()
                          .padStart(2, "0")}
                        <span className="text-indigo-500">:</span>
                        {(timerDisplaySec % 60).toString().padStart(2, "0")}
                      </>
                    )}
                  </div>

                  {/* Tiny animated progress feedback */}
                  <div className="mt-4 flex items-center gap-1">
                    {app.boardSettings.timerRunning ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-black tracking-widest text-[#10b981] uppercase">
                          Fokus aktiv
                        </span>
                      </>
                    ) : timerDisplaySec === 0 ? (
                      <span className="text-[8px] font-black tracking-widest text-amber-500 uppercase">
                        Beendet ✨
                      </span>
                    ) : (
                      <span className="text-[8px] font-black tracking-widest text-stone-500 uppercase">
                        Pausiert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Adjustment Controls (+/- 1 & 5 minutes + Reset) */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const currentTotal = app.boardSettings.timerTotal || 60;
                    const newTotal = Math.max(0, currentTotal - 60);
                    const now = Date.now();
                    setApp((prev) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        timerTotal: newTotal,
                        timerEnd: prev.boardSettings.timerRunning
                          ? now + newTotal * 1000
                          : prev.boardSettings.timerEnd,
                      },
                    }));
                    if (!app.boardSettings.timerRunning) {
                      setTimerDisplaySec(Math.max(0, timerDisplaySec - 60));
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black text-stone-400 hover:text-white transition-all cursor-pointer duration-150"
                >
                  -1 Min
                </button>
                <button
                  onClick={() => {
                    const currentTotal = app.boardSettings.timerTotal || 60;
                    const newTotal = Math.max(0, currentTotal - 300);
                    const now = Date.now();
                    setApp((prev) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        timerTotal: newTotal,
                        timerEnd: prev.boardSettings.timerRunning
                          ? now + newTotal * 1000
                          : prev.boardSettings.timerEnd,
                      },
                    }));
                    if (!app.boardSettings.timerRunning) {
                      setTimerDisplaySec(Math.max(0, timerDisplaySec - 300));
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black text-stone-400 hover:text-white transition-all cursor-pointer duration-150"
                >
                  -5 Min
                </button>

                {/* Main Play/Pause */}
                <button
                  onClick={() => {
                    const now = Date.now();
                    if (app.boardSettings.timerRunning) {
                      setApp((prev) => ({
                        ...prev,
                        boardSettings: {
                          ...prev.boardSettings,
                          timerRunning: false,
                        },
                      }));
                    } else {
                      const totalToDo =
                        timerDisplaySec > 0 ? timerDisplaySec : 15 * 60;
                      setApp((prev) => ({
                        ...prev,
                        boardSettings: {
                          ...prev.boardSettings,
                          timerRunning: true,
                          timerEnd: now + totalToDo * 1000,
                          timerTotal:
                            prev.boardSettings.timerTotal || totalToDo,
                        },
                      }));
                    }
                  }}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 border duration-150 ${
                    app.boardSettings.timerRunning
                      ? "bg-rose-500/20 border-rose-500/40 text-rose-400 hover:bg-rose-500/30"
                      : "bg-indigo-500 text-indigo-950 border-indigo-400/20 hover:bg-indigo-400"
                  }`}
                >
                  {app.boardSettings.timerRunning ? (
                    <Pause size={18} />
                  ) : (
                    <Play size={18} className="translate-x-[1px]" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setApp((prev) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        timerRunning: false,
                        timerEnd: 0,
                      },
                    }));
                    setTimerDisplaySec(15 * 60);
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-stone-400 hover:text-stone-200 border border-white/5 flex items-center justify-center transition-all cursor-pointer shadow-inner active:scale-95 duration-150"
                  title="Zurücksetzen auf 15m"
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  onClick={() => {
                    const currentTotal = app.boardSettings.timerTotal || 60;
                    const newTotal = currentTotal + 300;
                    const now = Date.now();
                    setApp((prev) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        timerTotal: newTotal,
                        timerEnd: prev.boardSettings.timerRunning
                          ? now + newTotal * 1000
                          : prev.boardSettings.timerEnd,
                      },
                    }));
                    if (!app.boardSettings.timerRunning) {
                      setTimerDisplaySec(timerDisplaySec + 300);
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black text-stone-400 hover:text-white transition-all cursor-pointer duration-150"
                >
                  +5 Min
                </button>

                <button
                  onClick={() => {
                    const currentTotal = app.boardSettings.timerTotal || 60;
                    const newTotal = currentTotal + 60;
                    const now = Date.now();
                    setApp((prev) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        timerTotal: newTotal,
                        timerEnd: prev.boardSettings.timerRunning
                          ? now + newTotal * 1000
                          : prev.boardSettings.timerEnd,
                      },
                    }));
                    if (!app.boardSettings.timerRunning) {
                      setTimerDisplaySec(timerDisplaySec + 60);
                    }
                  }}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black text-stone-400 hover:text-white transition-all cursor-pointer duration-150"
                >
                  +1 Min
                </button>
              </div>
            </div>

            {/* Bottom Panel with Sound Ambient Selection & Status */}
            <div className="w-full flex flex-col items-center gap-4 z-10 max-w-xl border-t border-white/5 pt-6 pb-2">
              <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest flex items-center gap-1">
                <span>🔉</span> Kinoraum Hintergrund-Kulisse (White-Noise)
              </span>

              {/* Sound Option selectors */}
              <div className="flex flex-wrap gap-2 items-center justify-center">
                {[
                  { id: "none", label: "Aus", icon: "🔇" },
                  { id: "rain", label: "Regen", icon: "🌧️" },
                  { id: "wind", label: "Waldwind", icon: "🌲" },
                  { id: "waves", label: "Meeresrauschen", icon: "🌊" },
                ].map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => setZenSoundType(sound.id as any)}
                    className={`px-4 py-2.5 rounded-2xl text-[10px] uppercase font-black tracking-wider transition-all cursor-pointer flex items-center gap-2 border duration-150 ${
                      zenSoundType === sound.id
                        ? "bg-indigo-500/25 text-indigo-300 border-indigo-400/40 shadow-inner"
                        : "bg-white/5 border-white/5 text-stone-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span>{sound.icon}</span>
                    <span>{sound.label}</span>
                  </button>
                ))}
              </div>

              {/* Helpful subtle advice for students */}
              <p className="text-[10px] text-stone-600 font-bold uppercase tracking-wider text-center mt-1">
                ✨ Ruhiges Arbeiten • Einatmen • Ausatmen ✨
              </p>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SOUNDBOARD SHEET */}
      <AnimatePresence>
        {showSoundsSheet && (
          <div className="fixed inset-0 z-[600] flex flex-col justify-end pointer-events-none p-4 pb-20 sm:pb-32 items-center">
            <motion.div
              initial={{ pointerEvents: "auto", opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm cursor-pointer pointer-events-auto"
              onPointerDown={() => setShowSoundsSheet(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className={`relative z-[601] w-full max-w-2xl rounded-3xl border overflow-hidden p-6 shadow-[0_30px_60px_rgba(0,0,0,0.4)] pointer-events-auto ${activeFokusThemeVars.isLight ? "bg-white/90 border-slate-200" : "bg-[#18181b]/90 border-white/10"} backdrop-blur-3xl`}
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                    <Volume2 size={20} />
                  </div>
                  <div>
                    <h3
                      className={`text-lg font-black tracking-tight leading-none ${activeFokusThemeVars.isLight ? "text-slate-900" : "text-white"}`}
                    >
                      Soundboard
                    </h3>
                    <p
                      className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${activeFokusThemeVars.isLight ? "text-slate-500" : "text-white/40"}`}
                    >
                      Gong & Effekte
                    </p>
                  </div>
                </div>
                <button
                  onPointerDown={() => setShowSoundsSheet(false)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeFokusThemeVars.isLight ? "bg-black/5 hover:bg-black/10 text-slate-600" : "bg-white/5 hover:bg-white/10 text-white/50 hover:text-white"}`}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "bowl",
                    label: "Ruhegong",
                    icon: <Volume2 size={24} />,
                  },
                  {
                    id: "applause",
                    label: "Applaus",
                    icon: <Volume2 size={24} />,
                  },
                  {
                    id: "fanfare",
                    label: "Fanfare",
                    icon: <Music size={24} />,
                  },
                  { id: "tada", label: "Ta-Da!", icon: <Trophy size={24} /> },
                  {
                    id: "bell",
                    label: "Schulglocke",
                    icon: <Bell size={24} />,
                  },
                  {
                    id: "laser",
                    label: "Sci-Fi Laser",
                    icon: <Zap size={24} />,
                  },
                  {
                    id: "timer",
                    label: "Countdown",
                    icon: <Hourglass size={24} />,
                  },
                  {
                    id: "nature",
                    label: "Ocean Wave",
                    icon: <Waves size={24} />,
                  },
                  {
                    id: "error",
                    label: "Fehler",
                    icon: <AlertTriangle size={24} />,
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    className={`flex flex-col items-center justify-center gap-3 p-4 rounded-2xl transition-all active:scale-95 group border ${activeFokusThemeVars.isLight ? "bg-white border-slate-200 hover:border-amber-400 hover:shadow-lg shadow-sm" : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20"}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      playSound(s.id as any);
                    }}
                  >
                    <div
                      className={`transition-transform group-hover:scale-110 group-active:scale-95 ${activeFokusThemeVars.isLight ? "text-slate-700 group-hover:text-amber-500" : "text-white/60 group-hover:text-white"}`}
                    >
                      {s.icon}
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest ${activeFokusThemeVars.isLight ? "text-slate-600" : "text-white/50"}`}
                    >
                      {s.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLYING REWARD ANIMATIONS */}
      <AnimatePresence>
        {rewardAnimations.map((anim) => (
          <motion.div
            key={anim.id}
            initial={{ scale: 0.5, x: anim.x, y: anim.y, opacity: 1 }}
            animate={{
              scale: [1, 2, 0.5],
              x: anim.x,
              y: anim.y - 120, // Fly upwards
              opacity: [1, 1, 0],
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed pointer-events-none z-[1100] text-amber-400 drop-shadow-2xl"
          >
            {React.cloneElement(getParticipationSymbol() as any, {
              size: 48,
              className:
                "fill-amber-500/50 filter drop-shadow(0 0 8px rgba(245,158,11,0.6))",
            })}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* SUCCESS POPUP FOR COCKPIT ACTIONS */}
      <AnimatePresence>
        {sessionSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[3000] max-w-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-400/20"
          >
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-sm shrink-0">
              ✔️
            </div>
            <span>{sessionSuccessMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STUDENT LONG-PRESS OPTIONS MODAL */}
      <AnimatePresence>
        {activeStudentSettingsId &&
          (() => {
            const student = (app.schueler || []).find(
              (s) => s.id === activeStudentSettingsId,
            );
            if (!student) return null;

            const studentPoints = getTodayPoints(student.id);
            const currentStageId = app.behavior_status?.[student.id] || "3";

            const defaultStages = [
              {
                id: "1",
                label: "Exzellent",
                color: "bg-emerald-500",
                icon: "🌟",
              },
              { id: "2", label: "Gut", color: "bg-blue-500", icon: "😊" },
              { id: "3", label: "Neutral", color: "bg-slate-500", icon: "😐" },
              {
                id: "4",
                label: "Ermahnung",
                color: "bg-amber-500",
                icon: "⚠️",
              },
              {
                id: "5",
                label: "Inakzeptabel",
                color: "bg-rose-500",
                icon: "🚫",
              },
            ];
            const stages = app.behavior_stages || defaultStages;

            const baseBadges = UNIFIED_DEFAULT_BADGES;

            const availableBadges = [
              ...baseBadges,
              ...(app.custom_badges || []),
            ];

            return (
              <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
                {/* Blur Background */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveStudentSettingsId(null)}
                  className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md"
                />

                {/* Card Container */}
                <motion.div
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 20 }}
                  className="student-settings-modal relative w-full max-w-2xl max-h-[88vh] bg-neutral-900 border border-neutral-700 text-white rounded-2xl p-5 shadow-2xl flex flex-col gap-4 overflow-y-auto overscroll-contain font-sans z-10"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Einstellungen für ${student.vorname} ${student.nachname}`}
                >
                  {/* Header Section */}
                  <div className="sticky top-0 z-20 -mx-1 -mt-1 px-1 pt-1 pb-3 flex items-center justify-between border-b border-white/10 bg-neutral-900/95 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="relative group/emoji">
                        <span className="text-3xl leading-none cursor-pointer hover:scale-110 transition-transform block">
                          {student.emoji || "👦"}
                        </span>
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-[8px] px-1 rounded font-black opacity-0 group-hover/emoji:opacity-100 transition-opacity">
                          ÄNDERN
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <span
                          className="font-extrabold text-sm tracking-tight break-words whitespace-normal leading-tight"
                          style={{
                            color: "#ffffff",
                          }}
                        >
                          {student.vorname} {student.nachname}
                        </span>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mt-0.5">
                          Schnell-Cockpit
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveStudentSettingsId(null)}
                      className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <nav className="sticky top-[3.75rem] z-20 -mx-1 px-1 py-2 flex gap-1.5 overflow-x-auto no-scrollbar bg-neutral-900/95 backdrop-blur-xl border-b border-white/10" aria-label="Bereiche der Schüler-Einstellungen">
                    {[
                      { id: "student-behavior-section", label: "Verhalten" },
                      { id: "student-points-section", label: "Mitarbeit" },
                      { id: "student-omissions-section", label: "Vergesser" },
                      { id: "student-badges-section", label: "Badges" },
                      { id: "student-notes-section", label: "Notiz" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-indigo-600 border border-neutral-700 hover:border-indigo-500 text-[9px] font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </nav>

                  {/* Emoji Picker Section */}
                  <div id="student-behavior-section" className="flex flex-col gap-1.5 scroll-mt-32">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                      Emoji auswählen
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-black/20 rounded-xl">
                      {[
                        "👦",
                        "👧",
                        "🌈",
                        "⭐",
                        "🦄",
                        "🦁",
                        "🐼",
                        "🦊",
                        "🐯",
                        "🦖",
                        "🚀",
                        "🎸",
                        "🎨",
                        "⚽",
                        "🍦",
                        "🍕",
                        "🍔",
                        "🎮",
                        "📚",
                        "🧙",
                        "👩‍🏫",
                        "👨‍🏫",
                      ].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setApp((prev: any) => ({
                              ...prev,
                              schueler: (prev.schueler || []).map((s: any) =>
                                s.id === student.id ? { ...s, emoji } : s,
                              ),
                            }));
                          }}
                          className={`text-xl p-1 rounded-lg transition-all hover:bg-white/10 ${student.emoji === emoji ? "bg-amber-500/20 ring-1 ring-amber-500" : ""}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1. Verhalten auswählen (Select behavior stage) */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                      Schüler-Verhalten stundenweise einstellen
                    </span>
                    <div className="grid grid-cols-5 gap-1.5">
                      {stages.map((stg) => {
                        const isActive = currentStageId === stg.id;
                        return (
                          <button
                            key={stg.id}
                            onClick={() => {
                              setStudentBehavior(student.id, stg.id);
                            }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all border cursor-pointer active:scale-95 ${
                              isActive
                                ? "bg-amber-500 border-amber-400 text-amber-950 shadow-md scale-105 font-black"
                                : "bg-neutral-800/60 border-neutral-700/20 text-white/70 hover:bg-neutral-800"
                            }`}
                            title={stg.label}
                          >
                            <span className="text-lg mb-0.5">{stg.icon}</span>
                            <span className="text-[7.5px] truncate max-w-full font-bold">
                              {stg.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Points adjustments (Score counter) */}
                  <div id="student-points-section" className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/10 p-3 rounded-xl scroll-mt-32">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-350">
                        Klassen-Mitarbeit heute
                      </span>
                      <span className="text-[10px] font-bold text-neutral-400 font-mono">
                        Stand: {studentPoints} Gläser
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 mt-1">
                      <button
                        onClick={() => removeParticipation(student.id)}
                        className="flex-1 py-1 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 hover:text-rose-400 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1 border border-rose-500/10 active:scale-95 transition-all"
                      >
                        -1 Abziehen
                      </button>
                      <button
                        onClick={(e) => addParticipation(student.id, e)}
                        className="flex-1 py-1 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 hover:text-emerald-400 font-black rounded-xl text-xs uppercase flex items-center justify-center gap-1 border border-emerald-500/10 active:scale-95 transition-all"
                      >
                        +1 Hinzufügen
                      </button>
                    </div>
                  </div>

                  {/* EXTRA: Vergesser-Tracker & Eltern-Info */}
                  <div id="student-omissions-section" className="flex flex-col gap-2.5 bg-neutral-950/60 border border-neutral-700 p-3.5 rounded-xl scroll-mt-32">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                        🎒 VERGESSER-TRACKER
                      </span>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono">
                        Fach: {getActiveSubject()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {/* HÜ Vergessen Button */}
                      <button
                        onClick={() => {
                          const activeFach = getActiveSubject();
                          const semAttr = "1";

                          setApp((prev) => {
                            const studentNoten = prev.noten?.[student.id] || {};
                            const subjectNoten = studentNoten[activeFach] || {};
                            const semData = subjectNoten[semAttr] || { hue: 0 };
                            const currentHue = semData.hue || 0;

                            const updatedNoten = {
                              ...(prev.noten || {}),
                              [student.id]: {
                                ...studentNoten,
                                [activeFach]: {
                                  ...subjectNoten,
                                  [semAttr]: {
                                    ...semData,
                                    hue: currentHue + 1,
                                  },
                                },
                              },
                            };

                            const newLogEntry = {
                              id:
                                "log-hue-" +
                                Date.now() +
                                Math.random().toString(),
                              schuelerId: student.id,
                              datum: new Date().toISOString().split("T")[0],
                              iconId: "4", // "Achtung" (⚠️)
                              timestamp: Date.now(),
                              comment: `Hausübung vergessen im Fach ${activeFach}`,
                            };

                            const newJournalEntry = {
                              id:
                                "note-hue-" +
                                Date.now() +
                                Math.random().toString(),
                              titel: "Hausübung vergessen",
                              inhalt: `Hausübung im Fach ${activeFach} vergessen.`,
                              icon: "🏠",
                              timestamp: Date.now(),
                              schuelerId: student.id,
                              kategorie: "Hausaufgabe",
                            };

                            return {
                              ...prev,
                              noten: updatedNoten,
                              statusLog: [
                                newLogEntry,
                                ...(prev.statusLog || []),
                              ],
                              notizen: [
                                newJournalEntry,
                                ...(prev.notizen || []),
                              ],
                            };
                          });

                          setRecentOmission({
                            type: "hu",
                            detail: `Hausübung im Fach ${activeFach}`,
                            studentId: student.id,
                          });
                          setSentNotificationSuccess(false);
                        }}
                        className="p-2.5 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 hover:border-rose-500/35 text-rose-405 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition-all active:scale-95 text-center"
                      >
                        <span className="text-xl">🏠</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-tight text-white">
                          HÜ vergessen
                        </span>
                        {(() => {
                          const activeFach = getActiveSubject();
                          const semAttr = "1";
                          const currentHue =
                            app.noten?.[student.id]?.[activeFach]?.[semAttr]
                              ?.hue || 0;
                          return (
                            <span className="text-[10px] font-black font-mono text-rose-300">
                              {currentHue}{" "}
                              {currentHue === 1 ? "Fehlübung" : "Fehlübungen"}
                            </span>
                          );
                        })()}
                      </button>

                      {/* Material Vergessen Button (Quick Toggle options) */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[8px] font-bold text-neutral-450 uppercase tracking-widest text-center mb-0.5">
                          Material vergessen:
                        </span>
                        <div className="grid grid-cols-2 gap-1 flex-1">
                          {[
                            {
                              label: "Mathebuch",
                              icon: "📕",
                              name: "Mathebuch",
                            },
                            {
                              label: "Deutschheft",
                              icon: "📓",
                              name: "Deutschheft",
                            },
                            {
                              label: "Sportzeug",
                              icon: "👟",
                              name: "Sportzeug",
                            },
                            {
                              label: "Unterschrift",
                              icon: "✍️",
                              name: "Unterschrift",
                            },
                          ].map((mat) => (
                            <button
                              key={mat.name}
                              type="button"
                              onClick={() => {
                                const activeFach = getActiveSubject();

                                setApp((prev) => {
                                  const newLogEntry = {
                                    id:
                                      "log-mat-" +
                                      Date.now() +
                                      Math.random().toString(),
                                    schuelerId: student.id,
                                    datum: new Date()
                                      .toISOString()
                                      .split("T")[0],
                                    iconId: "4", // "Achtung" (⚠️)
                                    timestamp: Date.now(),
                                    comment: `Material vergessen: ${mat.icon} ${mat.label} (${activeFach})`,
                                  };

                                  const newJournalEntry = {
                                    id:
                                      "note-mat-" +
                                      Date.now() +
                                      Math.random().toString(),
                                    titel: "Material vergessen",
                                    inhalt: `${mat.icon} ${mat.label} im Unterricht (${activeFach}) vergessen.`,
                                    icon: "🎒",
                                    timestamp: Date.now(),
                                    schuelerId: student.id,
                                    kategorie: "Material",
                                  };

                                  return {
                                    ...prev,
                                    statusLog: [
                                      newLogEntry,
                                      ...(prev.statusLog || []),
                                    ],
                                    notizen: [
                                      newJournalEntry,
                                      ...(prev.notizen || []),
                                    ],
                                  };
                                });

                                setRecentOmission({
                                  type: "material",
                                  detail: `${mat.icon} ${mat.label}`,
                                  studentId: student.id,
                                });
                                setSentNotificationSuccess(false);
                              }}
                              className="py-1 px-1 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 hover:border-amber-500/35 text-amber-400 rounded-lg text-[8.5px] font-black uppercase text-center cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5"
                              title={`${mat.label} vergessen`}
                            >
                              <span>{mat.icon}</span>
                              <span className="truncate max-w-full leading-none text-[7.5px]">
                                {mat.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Anderes Material Form */}
                    <div className="border-t border-neutral-800/65 pt-2.5 flex flex-col gap-1.5">
                      <span className="text-[8px] font-black text-neutral-450 uppercase tracking-widest">
                        Anderes Material eingeben:
                      </span>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!customMaterial.trim()) return;

                          const matName = customMaterial.trim();
                          const activeFach = getActiveSubject();

                          setApp((prev) => {
                            const newLogEntry = {
                              id:
                                "log-mat-custom-" +
                                Date.now() +
                                Math.random().toString(),
                              schuelerId: student.id,
                              datum: new Date().toISOString().split("T")[0],
                              iconId: "4", // "Achtung" (⚠️)
                              timestamp: Date.now(),
                              comment: `Material vergessen: 🎒 ${matName} (${activeFach})`,
                            };

                            const newJournalEntry = {
                              id:
                                "note-mat-custom-" +
                                Date.now() +
                                Math.random().toString(),
                              titel: "Material vergessen",
                              inhalt: `🎒 ${matName} im Unterricht (${activeFach}) vergessen.`,
                              icon: "🎒",
                              timestamp: Date.now(),
                              schuelerId: student.id,
                              kategorie: "Material",
                            };

                            return {
                              ...prev,
                              statusLog: [
                                newLogEntry,
                                ...(prev.statusLog || []),
                              ],
                              notizen: [
                                newJournalEntry,
                                ...(prev.notizen || []),
                              ],
                            };
                          });

                          setRecentOmission({
                            type: "material",
                            detail: `🎒 ${matName}`,
                            studentId: student.id,
                          });
                          setSentNotificationSuccess(false);
                          setCustomMaterial("");
                        }}
                        className="flex gap-1.5"
                      >
                        <input
                          type="text"
                          value={customMaterial}
                          onChange={(e) => setCustomMaterial(e.target.value)}
                          placeholder="z.B. Bleistift, Geodreieck..."
                          className="flex-grow bg-black/40 border border-neutral-800 text-white rounded-lg text-[9px] px-2 py-1 focus:outline-none focus:border-indigo-550 placeholder-neutral-500 font-sans font-medium"
                        />
                        <button
                          type="submit"
                          disabled={!customMaterial.trim()}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-450 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-[8px] font-black uppercase tracking-tight text-center cursor-pointer transition-all active:scale-95 flex items-center justify-center font-sans shrink-0"
                        >
                          OK
                        </button>
                      </form>
                    </div>

                    {/* AUTOMATISCHER ELTERN-INFO DRAFT PREVIEW BANNER */}
                    <AnimatePresence>
                      {recentOmission &&
                        recentOmission.studentId === student.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl flex flex-col gap-2 overflow-hidden"
                          >
                            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                              <div className="flex items-center gap-1.5 font-sans">
                                <span className="text-xs">📨</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-indigo-400">
                                  Automatische Eltern-Mitteilung
                                </span>
                              </div>
                              <button
                                onClick={() => setRecentOmission(null)}
                                className="text-[9px] text-neutral-400 hover:text-white cursor-pointer font-bold leading-none p-1"
                              >
                                ✕
                              </button>
                            </div>

                            {!sentNotificationSuccess ? (
                              <>
                                <div className="text-[10px] space-y-1 text-neutral-350 font-sans">
                                  <div>
                                    <span className="font-bold text-neutral-450 uppercase text-[8px] tracking-wider block">
                                      Empfänger-E-Mail:
                                    </span>
                                    <span className="text-indigo-300 font-mono text-[9px] break-all">
                                      {student.email_eltern ||
                                        "gabrielhehle@gmail.com"}
                                    </span>
                                  </div>
                                  <div className="bg-black/30 p-2 rounded-lg border border-white/5 font-sans leading-relaxed text-[8.5px] text-neutral-405">
                                    <span className="font-bold block text-neutral-300 mb-0.5 text-[8.5px]">
                                      Betreff: Mitteilung:{" "}
                                      {recentOmission.type === "hu"
                                        ? "Hausübung"
                                        : "Fehlendes Material"}{" "}
                                      vergessen – {student.vorname}
                                    </span>
                                    <p className="italic text-neutral-400 leading-snug">
                                      "Sehr geehrte Erziehungsberechtigte, ihr
                                      Kind {student.vorname} hat heute im{" "}
                                      {recentOmission.type === "hu"
                                        ? "Fach " + getActiveSubject()
                                        : "Unterricht"}{" "}
                                      {recentOmission.type === "hu"
                                        ? "die Hausaufgabe"
                                        : "das Material (" +
                                          recentOmission.detail +
                                          ")"}{" "}
                                      vergessen. Bitte sorgen Sie dafür, dass
                                      diese nachgeholt wird."
                                    </p>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSentNotificationSuccess(true);
                                    confetti({
                                      particleCount: 40,
                                      spread: 50,
                                      origin: { y: 0.5 },
                                    });
                                  }}
                                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg text-[9px] uppercase tracking-wider cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                                >
                                  <span>📧</span> Jetzt Eltern benachrichtigen
                                </button>
                              </>
                            ) : (
                              <div className="text-center py-2 space-y-1.5">
                                <span className="text-xl inline-block animate-bounce">
                                  🚀
                                </span>
                                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">
                                  Mitteilung versandt!
                                </p>
                                <p className="text-[8.5px] text-neutral-400 font-medium">
                                  Eine E-Mail und Push-Notification wurde an die
                                  Eltern (
                                  {student.email_eltern ||
                                    "gabrielhehle@gmail.com"}
                                  ) übermittelt.
                                </p>
                              </div>
                            )}
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>

                  {/* 3. Badges (Verleihen & Löschen) */}
                  <div id="student-badges-section" className="flex flex-col gap-2 bg-indigo-950/20 border border-indigo-400/20 p-3.5 rounded-xl scroll-mt-32">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                      Medaillen & Stickers verleihen
                    </span>

                    {/* Grid of available badges to click & add! */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                      {availableBadges.map((badge) => (
                        <button
                          key={badge.name}
                          onClick={() => {
                            setApp((prev) => ({
                              ...prev,
                              schueler: prev.schueler.map((s) =>
                                s.id === student.id
                                  ? {
                                      ...s,
                                      badges: [
                                        {
                                          id:
                                            Date.now().toString() +
                                            Math.random().toString(),
                                          name: badge.name,
                                          icon: badge.icon,
                                          date: new Date().toISOString(),
                                        },
                                        ...(s.badges || []),
                                      ],
                                    }
                                  : s,
                              ),
                            }));
                            confetti({
                              particleCount: 25,
                              spread: 40,
                              origin: { y: 0.4 },
                            });
                          }}
                          className="min-h-14 py-1.5 px-2 text-[9px] bg-neutral-800 border border-neutral-600 hover:bg-indigo-900/70 hover:border-indigo-400 rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 active:scale-95 text-white"
                        >
                          <span className="text-sm">{badge.icon}</span>
                          <span className="text-[8px] font-extrabold truncate max-w-full">
                            {badge.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Create Custom Badge Form */}
                    <div className="mt-1 p-2 bg-white/[0.02] rounded-xl border border-white/5 flex flex-col gap-1.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-neutral-450 leading-none">
                        Eigenes Abzeichen erstellen
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="🧠"
                          maxLength={4}
                          value={newBadgeIcon}
                          onChange={(e) => setNewBadgeIcon(e.target.value)}
                          className="w-10 text-center bg-neutral-950/60 border border-neutral-800 rounded-lg py-1 px-1 text-xs outline-none font-bold text-white focus:border-amber-500/50 transition-colors"
                          title="Emoji für das Abzeichen"
                        />
                        <input
                          type="text"
                          placeholder="z.B. Super-Zuhörer"
                          value={newBadgeName}
                          onChange={(e) => setNewBadgeName(e.target.value)}
                          className="flex-1 bg-neutral-950/60 border border-neutral-800 rounded-lg py-1 px-2 text-xs outline-none text-white focus:border-amber-500/50 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newBadgeName.trim()) return;
                            const icon = newBadgeIcon.trim() || "⭐";
                            const name = newBadgeName.trim();

                            const alreadyExists = availableBadges.some(
                              (b) =>
                                b.name.toLowerCase() === name.toLowerCase(),
                            );
                            if (alreadyExists) return;

                            setApp((prev) => ({
                              ...prev,
                              custom_badges: [
                                ...(prev.custom_badges || []),
                                { icon, name },
                              ],
                            }));
                            setNewBadgeName("");
                            setNewBadgeIcon("🧠");
                          }}
                          className="px-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black rounded-lg text-[9px] uppercase cursor-pointer transition-all active:scale-95"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Active badges list with remove button */}
                    {student.badges && student.badges.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                        <span className="text-[8px] font-black uppercase tracking-wider text-neutral-550 mb-1">
                          Eingetragen ({student.badges.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-[4.6875rem] overflow-y-auto no-scrollbar">
                          {student.badges.map((b) => (
                            <div
                              key={b.id}
                              className="flex items-center gap-1 bg-neutral-800 text-[10px] py-0.5 px-1.5 rounded-lg border border-neutral-700 font-bold"
                            >
                              <span>
                                {b.icon} {b.name}
                              </span>
                              <button
                                onClick={() => {
                                  setApp((prev) => ({
                                    ...prev,
                                    schueler: prev.schueler.map((s) =>
                                      s.id === student.id
                                        ? {
                                            ...s,
                                            badges: (s.badges || []).filter(
                                              (it) => it.id !== b.id,
                                            ),
                                          }
                                        : s,
                                    ),
                                  }));
                                }}
                                className="text-[10px] text-red-500 hover:text-red-400 hover:scale-110 ml-0.5 font-bold cursor-pointer"
                                title="Abzeichen entfernen"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Observing Direct Notes logger */}
                  <div id="student-notes-section" className="flex flex-col gap-1.5 bg-neutral-950/50 border border-neutral-700 p-3.5 rounded-xl scroll-mt-32">
                    <span className="text-[9px] font-black uppercase tracking-widest text-neutral-300">
                      Cockpit Beobachtungsnotiz erfassen
                    </span>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="text"
                        value={quickCommentText}
                        onChange={(e) => setQuickCommentText(e.target.value)}
                        placeholder="z.B. Hat super fleißig gerechnet..."
                        className="flex-grow bg-neutral-950 border border-neutral-800 text-xs py-1.5 px-3 rounded-xl text-neutral-200 outline-none focus:border-amber-400 duration-150"
                      />
                      <button
                        onClick={() => {
                          if (quickCommentText.trim()) {
                            logObservation(
                              setApp,
                              student.id,
                              quickCommentText.trim(),
                              "Journal",
                              "Cockpit",
                            );
                            setQuickCommentText("");
                            setQuickCommentSaved(true);
                            setTimeout(() => setQuickCommentSaved(false), 3000);
                          }
                        }}
                        className="px-3 py-1.5 bg-amber-500 text-amber-950 hover:bg-amber-400 font-black rounded-xl text-[10px] uppercase cursor-pointer active:scale-95 transition-all shrink-0"
                      >
                        Loggen
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>

      {/* Synchronized Lotto Winner Overlay on big screen */}
      {app.lottoWinner && (
        <div className="fixed inset-0 z-[5000] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-8 animate-fade-in">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl bg-[#1c1917]/90 border-2 border-amber-500 rounded-[3rem] p-12 text-center space-y-8 shadow-[0_0_50px_rgba(245,158,11,0.25)]"
          >
            <div className="space-y-3">
              <span className="inline-block px-5 py-2 bg-amber-500/10 border border-amber-500/35 text-amber-300 rounded-full text-xs font-black uppercase tracking-[0.3em] shadow-inner mb-2 animate-bounce">
                🎯 LOTTO-GEWINNER GEZOGEN 🎯
              </span>
              <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">
                Am Lehrer-Handy ausgelöst
              </p>
            </div>

            <div className="text-[10rem] leading-none select-none my-8 drop-shadow-[0_15px_15px_rgba(0,0,0,0.5)] flex items-center justify-center h-48">
              🎉
            </div>

            <h2 className="text-5xl font-black text-white uppercase tracking-tight antialiased drop-shadow-lg leading-tight">
              {app.lottoWinner}
            </h2>

            <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
              Drücke am Handy auf "Schließen", um das Fenster wieder
              auszublenden und fortzufahren.
            </p>
          </motion.div>
        </div>
      )}

      {/* Cinematic focus "Licht aus" dynamic exit button Overlay */}
      <AnimatePresence>
        {isFocusModeLightOff && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 right-6 z-[3000] pointer-events-auto"
          >
            <button
              onClick={() => setIsFocusModeLightOff(false)}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-lg font-black text-[10px] uppercase tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Lightbulb size={12} className="fill-stone-950 text-stone-950" />
              <span>Licht an</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tafel full-screen fixed-overlay */}
      {isTafelOpen && (
        <Tafel
          onClose={() => {
            setIsTafelOpen(false);
            if (app.boardSettings?.isTafelOpen) {
              setApp((prev: any) => ({
                ...prev,
                boardSettings: {
                  ...prev.boardSettings,
                  isTafelOpen: false,
                },
              }));
            }
          }}
        />
      )}

      {isBirthdayCelebrationOpen && (
        <BirthdayCelebration
          students={app.schueler ?? []}
          isBirthdayToday={(student) => checkIsAutoBirthday(student.geburtstag)}
          onClose={() => setIsBirthdayCelebrationOpen(false)}
        />
      )}

      {/* Cockpit Vorlagen Modal */}
      <CockpitVorlagenModal
        isOpen={isVorlagenModalOpen}
        initialTab={vorlagenStartTab}
        onClose={() => setIsVorlagenModalOpen(false)}
        cockpitWidgets={cockpitWidgets}
        workspaceProfiles={app.workspaceProfiles || []}
        defaultProfiles={DEFAULT_WORKSPACE_PROFILES}
        onSaveProfile={(data) => handleSaveProfile(data)}
        onLoadProfile={(pId) => handleLoadProfile(pId)}
        onUpdateProfile={(pId) => handleUpdateProfile(pId)}
        onDeleteProfile={(pId) => handleDeleteProfile(pId)}
        onResetToDefault={() => {
          setCockpitWidgets(DEFAULT_COCKPIT_LAYOUT);
          setApp((p) => ({
            ...p,
            cockpitLayout: DEFAULT_COCKPIT_LAYOUT,
          }));
          showToast("Unterrichtsfläche geleert.", "info");
        }}
        currentIsLight={currentIsLight}
        slotNames={slotNames}
        saveSlotName={saveSlotName}
        handleSaveLayoutSlot={handleSaveLayoutSlot}
        handleLoadLayoutSlot={handleLoadLayoutSlot}
        showToast={showToast}
      />
    </div>
  );
}

// --- HELPERS ---
const getFachIcon = (fach?: string) => {
  const f = fach?.toLowerCase() || "";
  if (f.includes("deutsch")) return <BookOpen size={24} />;
  if (f.includes("mathe")) return <BarChart3 size={24} />;
  if (f.includes("sach")) return <Lightbulb size={24} />;
  if (f.includes("musik")) return <Music size={24} />;
  if (f.includes("sport") || f.includes("turn")) return <Zap size={24} />;
  if (f.includes("kunst") || f.includes("bildnerisch"))
    return <Palette size={24} />;
  if (f.includes("englisch")) return <Laptop size={24} />;
  if (f.includes("religion")) return <CloudSun size={24} />;
  return <GraduationCap size={24} />;
};

const NoiseAlarmIndicator = () => {
  return null;
};
