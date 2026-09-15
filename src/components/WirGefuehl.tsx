import React, { useState, useMemo, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { 
  Trophy, Sparkles, Check, Plus, Minus,
  Heart, BookOpen, MessageSquare, ShieldCheck, Smile, ShieldAlert, Lightbulb,
  Users, Flame, RotateCcw, Clock, Volume2, Play, Pause, Settings, Sliders,
  Calendar, ArrowRight, Zap, Filter, Star, Info
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { COMMUNITY_MISSIONS_POOL } from '../types';
import { 
  KID_MOOD_SCALE, 
  formatMoodAverage, 
  getMoodMeta,
} from '../lib/moodTypes';
import { computeKidAttendanceMoodSummary } from '../lib/kidAttendanceAlgorithm';
import { formatLocalDateKey } from '../lib/utils';

const TEAM_GAMES = [
  {
    id: 'game-1',
    title: 'Flüster-Post mit Klatschen',
    category: 'Fokus & Ruhe',
    duration: '5 Min',
    goal: 'Konzentration & Stille',
    description: 'Die Kinder sitzen im Kreis. Ein geheimer Rhythmus wird per Schulterklopfen oder Handdruck weitergegeben. Schafft es der Rhythmus unverändert einmal ganz herum?',
    instructions: [
      'Alle Kinder schließen die Augen oder schauen nach unten.',
      'Der Lehrer oder ein Kind startet einen kurzen Klopf-Rhythmus auf der Schulter des Nachbarn.',
      'Dieser gibt ihn genau so an den nächsten Nachbarn weiter.',
      'Am Ende klatscht das letzte Kind den Rhythmus laut vor. Stimmt er?',
    ],
    tips: 'Perfekt, um nach einer lauten Phase wieder Fokus und absolute Stille in den Raum zu bringen.'
  },
  {
    id: 'game-2',
    title: 'Der wertschätzende Kreis',
    category: 'Gemeinschaft & Empathie',
    duration: '10 Min',
    goal: 'Klassengemeinschaft & Loben',
    description: 'Kinder werfen sich ein Wollknäuel oder einen Ball zu und sagen dem Empfänger ein ehrliches Kompliment oder danken für eine kleine Hilfe.',
    instructions: [
      'Die Klasse bildet einen großen Kreis.',
      'Ein Kind hält ein Wollknäuel, sucht Augenkontakt zu einem anderen Kind und sagt ein ehrliches Kompliment.',
      'Es wirft das Knäuel unter Festhalten des Fadens zum Empfänger.',
      'Es entsteht ein dichtes „Netz der Gemeinschaft“, das zeigt: Wir halten alle zusammen!'
    ],
    tips: 'Stärkt die Empathie und zeigt visuell, wie die Klasse vernetzt ist.'
  },
  {
    id: 'game-3',
    title: 'Der lautlose Turmbau',
    category: 'Kooperation & Teamwork',
    duration: '8 Min',
    goal: 'Nonverbale Absprache',
    description: 'In Kleingruppen soll aus Papier oder Stiften der höchste Turm gebaut werden – jedoch ohne ein einziges Wort zu sprechen!',
    instructions: [
      'Teile die Klasse in 4er-Teams auf.',
      'Jedes Team bekommt Papier oder Gegenstände aus dem Federmäppchen.',
      'Sobald der Timer startet, gilt: Absolute Redeverbot! Absprachen nur mit Gesten.',
      'Welches Team baut den stabilsten Turm in 5 Minuten?'
    ],
    tips: 'Fördert das gegenseitige Beobachten und die Rücksichtnahme.'
  },
  {
    id: 'game-4',
    title: 'Roboter-Steuerung',
    category: 'Vertrauen & Zuhören',
    duration: '5 Min',
    goal: 'Gegenseitiges Vertrauen',
    description: 'Ein Kind schließt die Augen („der Roboter“) und wird nur durch sanftes Tippen auf die Schulter steuernd navigiert.',
    instructions: [
      'Zwei Kinder arbeiten zusammen.',
      'Kind A schließt die Augen. Kind B navigiert Kind A durch Antippen der Schultern oder leises Flüstern.',
      'Nach 2 Minuten wird getauscht.',
      'Es darf nicht gerannt oder geschubst werden.'
    ],
    tips: 'Ideal zur Stärkung der Beziehungsqualität und für ein ruhiges, achtsames Miteinander.'
  },
  {
    id: 'game-5',
    title: 'Das Klassen-Konzert (Gemeinsames Summen)',
    category: 'Fokus & Ruhe',
    duration: '3 Min',
    goal: 'Gemeinsames Gehör',
    description: 'Die Klasse versucht, einen einzigen, harmonischen Summton zu erzeugen. Wenn einer lauter summt, bricht die Harmonie zusammen.',
    instructions: [
      'Alle setzen sich aufrecht hin und schließen die Augen.',
      'Auf das Zeichen beginnen alle, einen tiefen Ton zu summen („Mmmmmm“).',
      'Die Aufgabe ist, den Ton so anzupassen, dass er wie eine einzige große Welle im Raum klingt.',
      'Die Lehrperson beendet die Übung mit einem leisen Handzeichen.'
    ],
    tips: 'Beruhigt das Nervensystem ungemein und schafft eine erhabene, gemeinsame Schwingung.'
  }
];

export default function WirGefuehl() {
  const { app, setApp, setPage } = useApp();
  
  // MAIN TAB NAVIGATION: [ Heute ] | [ Gemeinsam ] | [ Klassenrat ] | [ ⋯ Mehr ]
  const [activeTab, setActiveTab] = useState<'heute' | 'gemeinsam' | 'klassenrat' | 'mehr'>('heute');
  const [mehrSubTab, setMehrSubTab] = useState<'verlauf' | 'beobachtungen' | 'spiele'>('verlauf');
  const [showTeacherMoodDetails, setShowTeacherMoodDetails] = useState(false);

  // Klassen-Vertrag (Class Contract) States
  const [contracts, setContracts] = useState<any[]>(() =>
    Array.isArray(app.classContracts) ? app.classContracts : []
  );
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleIcon, setNewRuleIcon] = useState('💡');
  const [isReflectingContracts, setIsReflectingContracts] = useState(false);
  const [tempRatings, setTempRatings] = useState<Record<string, number>>({});

  // Klassenrat States (Geschützt im verschlüsselten AppState)
  const [councilNotes, setCouncilNotes] = useState<any[]>(() =>
    Array.isArray(app.councilNotes) ? app.councilNotes : []
  );
  const [noteType, setNoteType] = useState<'lob' | 'sorge' | 'idee' | 'wunsch'>('lob');
  const [noteContent, setNoteContent] = useState('');
  const [noteFrom, setNoteFrom] = useState('');
  const [noteTo, setNoteTo] = useState('');
  const [briefkastenStage, setBriefkastenStage] = useState<'idle' | 'submitting' | 'success'>('idle');

  const updateContracts = (updated: any[]) => {
    setContracts(updated);
    setApp((prev: any) => ({ ...prev, classContracts: updated }));
  };

  const updateCouncilNotes = (updated: any[]) => {
    setCouncilNotes(updated);
    setApp((prev: any) => ({ ...prev, councilNotes: updated }));
  };

  useEffect(() => {
    const migrateLegacyArray = (key: string, current: any[] | undefined, apply: (items: any[]) => void) => {
      if (Array.isArray(current) && current.length > 0) {
        try { localStorage.removeItem(key); } catch {}
        return;
      }
      try {
        const saved = localStorage.getItem(key);
        if (!saved) return;
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) apply(parsed);
        localStorage.removeItem(key);
      } catch {
        try { localStorage.removeItem(key); } catch {}
      }
    };

    migrateLegacyArray('class_contracts_v1', app.classContracts, updateContracts);
    migrateLegacyArray('council_notes_v1', app.councilNotes, updateCouncilNotes);
    // Nur einmalige Migration alter Klartext-Browserdaten; neue Daten bleiben im verschlüsselten App-State.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (app.councilNotes && Array.isArray(app.councilNotes)) {
      setCouncilNotes(app.councilNotes);
    }
  }, [app.councilNotes]);

  useEffect(() => {
    if (app.classContracts && Array.isArray(app.classContracts)) {
      setContracts(app.classContracts);
    }
  }, [app.classContracts]);

  const todayKey = formatLocalDateKey(new Date());
  const moodSummary = useMemo(
    () => computeKidAttendanceMoodSummary(app.schueler || [], app, todayKey),
    [app.schueler, app.anwesenheit, app.anwesenheitDetail, app.schuelerStimmung, todayKey]
  );
  const moodAverageInfo = formatMoodAverage(moodSummary.stats.average);

  const activeStudentIds = useMemo(
    () => new Set((app.schueler || []).map((student) => student.id)),
    [app.schueler]
  );

  const todayBehaviorNotes = useMemo(
    () => (app.journal || [])
      .filter((entry: any) =>
        entry?.kategorie === 'Verhalten' &&
        (!entry.schuelerId || activeStudentIds.has(entry.schuelerId)) &&
        String(entry.datum || '').slice(0, 10) === todayKey
      )
      .sort((a: any, b: any) => String(b.datum || '').localeCompare(String(a.datum || ''))),
    [app.journal, activeStudentIds, todayKey]
  );

  const todayStatusChanges = useMemo(
    () => (app.statusLog || []).filter((entry: any) =>
      activeStudentIds.has(entry.schuelerId) && entry.datum === todayKey
    ),
    [app.statusLog, activeStudentIds, todayKey]
  );

  const recentBehaviorNotes = useMemo(
    () => (app.journal || [])
      .filter((entry: any) =>
        entry?.kategorie === 'Verhalten' &&
        (!entry.schuelerId || activeStudentIds.has(entry.schuelerId))
      )
      .sort((a: any, b: any) => String(b.datum || '').localeCompare(String(a.datum || '')))
      .slice(0, 20),
    [app.journal, activeStudentIds]
  );

  // States for Tägliches Ritual (Daily Ritual Flow)
  const [ritualStep, setRitualStep] = useState<number>(1);
  const [breathingSeconds, setBreathingSeconds] = useState<number>(60);
  const [isBreathingRunning, setIsBreathingRunning] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');

  const [selectedGameId, setSelectedGameId] = useState<string>('game-1');
  const [gameFilterCategory, setGameFilterCategory] = useState<string>('alle');

  // Interactive Game Timer
  const [gameTimer, setGameTimer] = useState<number>(300);
  const [isGameTimerRunning, setIsGameTimerRunning] = useState<boolean>(false);

  // Appreciation Prompt & Singing Bowl Sound
  const [appreciationPrompt, setAppreciationPrompt] = useState<string>("Gib heute einem Kind, das neben dir sitzt, ein ehrliches Kompliment für seine Mitarbeit.");
  const [isChimePlaying, setIsChimePlaying] = useState<boolean>(false);
  const [chimeProgress, setChimeProgress] = useState<number>(0);

  const [checkedSteps, setCheckedSteps] = useState<{[key: string]: boolean}>({});

  const toggleStep = (gameId: string, idx: number) => {
    const key = `${gameId}_${idx}`;
    setCheckedSteps((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const activeGame = useMemo(() => {
    return TEAM_GAMES.find(g => g.id === selectedGameId) || TEAM_GAMES[0];
  }, [selectedGameId]);

  React.useEffect(() => {
    const mins = parseInt(activeGame.duration) || 5;
    setGameTimer(mins * 60);
    setIsGameTimerRunning(false);
  }, [selectedGameId, activeGame.duration]);

  // Game timer countdown effect
  React.useEffect(() => {
    let interval: any = null;
    if (isGameTimerRunning && gameTimer > 0) {
      interval = setInterval(() => {
        setGameTimer(prev => {
          if (prev <= 1) {
            setIsGameTimerRunning(false);
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                gain.gain.setValueAtTime(0.2, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
                osc.start();
                osc.stop(ctx.currentTime + 1.2);
              }
            } catch (err) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGameTimerRunning, gameTimer]);

  // Guided breathing countdown effect
  React.useEffect(() => {
    let interval: any = null;
    if (isBreathingRunning && breathingSeconds > 0) {
      interval = setInterval(() => {
        setBreathingSeconds(prev => {
          if (prev <= 1) {
            setIsBreathingRunning(false);
            return 0;
          }
          const elapsed = 60 - prev;
          const cycle = elapsed % 8;
          if (cycle < 4) {
            setBreathingPhase('inhale');
          } else {
            setBreathingPhase('exhale');
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isBreathingRunning, breathingSeconds]);

  // Tibetan singing bowl synthesizer
  const playKlangschale = () => {
    setIsChimePlaying(true);
    setChimeProgress(100);
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const frequencies = [164.81, 247.22, 329.63, 493.88, 659.25];
        frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), ctx.currentTime);
          const duration = index === 0 ? 6.0 : 4.0 - (index * 0.5);
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.2 / frequencies.length, ctx.currentTime + 0.5);
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + duration);
        });
      }
    } catch (e) {}

    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const p = Math.max(0, 100 - (elapsed / 6000) * 100);
      setChimeProgress(p);
      if (elapsed < 6000) {
        requestAnimationFrame(animate);
      } else {
        setIsChimePlaying(false);
        setChimeProgress(0);
      }
    };
    requestAnimationFrame(animate);
  };

  const rollAppreciation = () => {
    const COMPLIMENTS_POOL = [
      "Gib heute einem Kind, das neben dir sitzt, ein ehrliches Kompliment für seine Mitarbeit.",
      "Suche dir in der Pause jemanden, mit dem du selten spielst, und frage, ob ihr gemeinsam etwas machen wollt.",
      "Sage heute einem anderen Kind danke, dass es in deiner Klasse ist.",
      "Hilf heute unaufgefordert jemandem, der seinen Platz aufräumt oder etwas sucht.",
      "Gehe zu einem Mitschüler und sage: 'Ich finde es toll, wie gut du in [Fach] bist.'",
      "Schenke heute mindestens drei Mitschülern ein bewusstes, warmes Lächeln.",
      "Teile heute einen Stift, ein Heft oder eine andere Kleinigkeit mit jemandem, der etwas vergessen hat.",
      "Frage heute jemanden in der Klasse: 'Wie geht es dir heute wirklich?' und höre aufmerksam zu.",
      "Halte heute jemandem bewusst die Klassentür auf und wünsche einen schönen Tag.",
      "Notiert als Tischgruppe gemeinsam drei Dinge, die ihr an eurer Nachbartischgruppe schätzt."
    ];
    let nextPrompt = appreciationPrompt;
    while (nextPrompt === appreciationPrompt) {
      nextPrompt = COMPLIMENTS_POOL[Math.floor(Math.random() * COMPLIMENTS_POOL.length)];
    }
    setAppreciationPrompt(nextPrompt);
  };

  const moodTrendData = useMemo(() => {
    const rows: Array<{ key: string; name: string; average: number | null; answered: number }> = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = formatLocalDateKey(date);
      const summary = computeKidAttendanceMoodSummary(app.schueler || [], app, key);
      rows.push({
        key,
        name: date.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit' }),
        average: summary.stats.average,
        answered: summary.answeredCount,
      });
    }
    return rows;
  }, [app.schueler, app.anwesenheit, app.anwesenheitDetail, app.schuelerStimmung]);

  const klassenglasCount = app.klassenglas_count || 0;
  const klassenglasGoal = app.klassenglas_ziel || 100;
  const unreadNotesCount = councilNotes.filter(n => n.status === 'neu').length;
  const activeMissions = app.klassenglas_missions || [];

  // Ruhige Empfehlung aus dem freiwilligen Check-in; keine Diagnose.
  const recommendedActivity = useMemo(() => {
    const average = moodSummary.stats.average;
    if (average === null) return TEAM_GAMES.find(g => g.id === 'game-3') || TEAM_GAMES[0];
    if (average >= 3.5) return TEAM_GAMES.find(g => g.id === 'game-5') || TEAM_GAMES[0];
    if (average <= 2) return TEAM_GAMES.find(g => g.id === 'game-2') || TEAM_GAMES[0];
    return TEAM_GAMES.find(g => g.id === 'game-3') || TEAM_GAMES[0];
  }, [moodSummary.stats.average]);

  return (
    <div className="wir-gefuehl-shell flex-1 bg-[var(--surface-app,var(--bg))] flex flex-col items-center px-3 sm:px-5 lg:px-6 py-5 overflow-y-auto w-full min-h-0 text-[var(--text-primary,var(--text))]">
      <div className="w-full max-w-[1180px] flex flex-col gap-5">
        
        {/* HEADER & BRANDING */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--surface-card,var(--surface))] p-5 rounded-2xl border border-[var(--border-subtle,var(--border))] shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[var(--accent)] text-[var(--accent-text,#fff)] flex items-center justify-center shadow-sm shrink-0">
              <Heart size={24} className="fill-white/20" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[var(--text-primary,var(--text))] tracking-tight leading-none">WIR-GEFÜHL</h1>
              <p className="text-xs text-[var(--text-secondary,var(--text2))] font-medium mt-1">„Wie geht es unserer Klasse heute und was tun wir gemeinsam?“</p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="bg-amber-50 border border-amber-200/70 px-3.5 py-2 rounded-2xl flex items-center gap-2">
              <Trophy size={16} className="text-amber-600" />
              <span className="text-xs font-black text-amber-900">{klassenglasCount} / {klassenglasGoal} Murmeln</span>
            </div>
            <button
              onClick={() => {
                setApp(p => ({
                  ...p,
                  klassenglas_count: Math.min((p.klassenglas_ziel || 100), (p.klassenglas_count || 0) + 1)
                }));
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
              }}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black text-xs rounded-2xl transition-all shadow-sm active:scale-95"
              title="+1 Murmel hinzufügen"
            >
              +1 💎
            </button>
          </div>
        </div>

        {/* RADICAL NAVIGATION: 4 CLEAR MAIN TABS */}
        <div className="grid grid-cols-4 bg-[var(--surface-subtle,var(--surface2))] p-1 rounded-xl gap-1 border border-[var(--border-subtle,var(--border))]">
          <button
            type="button"
            onClick={() => setActiveTab('heute')}
            className={`py-3 px-2 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              activeTab === 'heute'
                ? 'bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm'
                : 'text-[var(--text-muted,var(--text3))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-card,var(--surface))]'
            }`}
          >
            <Zap size={16} className={activeTab === 'heute' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Heute</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gemeinsam')}
            className={`py-3 px-2 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              activeTab === 'gemeinsam'
                ? 'bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm'
                : 'text-[var(--text-muted,var(--text3))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-card,var(--surface))]'
            }`}
          >
            <Users size={16} className={activeTab === 'gemeinsam' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Gemeinsam</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('klassenrat')}
            className={`py-3 px-2 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 relative ${
              activeTab === 'klassenrat'
                ? 'bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm'
                : 'text-[var(--text-muted,var(--text3))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-card,var(--surface))]'
            }`}
          >
            <MessageSquare size={16} className={activeTab === 'klassenrat' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Klassenrat</span>
            {unreadNotesCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {unreadNotesCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('mehr')}
            className={`py-3 px-2 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center justify-center gap-2 ${
              activeTab === 'mehr'
                ? 'bg-[var(--accent)] text-[var(--accent-text,#fff)] shadow-sm'
                : 'text-[var(--text-muted,var(--text3))] hover:text-[var(--text-primary,var(--text))] hover:bg-[var(--surface-card,var(--surface))]'
            }`}
          >
            <Settings size={16} className={activeTab === 'mehr' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>⋯ Mehr</span>
          </button>
        </div>


        {/* ==========================================
            1. TAB: HEUTE (DEFAULT LANDING VIEW)
           ========================================== */}
        {activeTab === 'heute' && (
          <div className="flex flex-col gap-6 animate-fade-in w-full">
            
            {/* BEFINDEN AUS DEM "ICH BIN DA!"-CHECK-IN */}
            <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Smile className="text-emerald-600" size={22} />
                    Wie geht es uns heute?
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1 max-w-2xl">
                    Das Wir-Gefühl übernimmt das freiwillige Befinden direkt aus dem „Ich bin da!“-Widget im Lehrercockpit. Hier wird keine zweite Stimmung erfasst.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPage('cockpit')}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text,#fff)] text-xs font-bold transition-colors shrink-0 shadow-sm"
                >
                  Zum „Ich bin da!“-Check-in
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <div className="text-sm font-black text-slate-800">
                    {moodSummary.presentCount > 0
                      ? `${moodSummary.answeredCount} von ${moodSummary.presentCount} anwesenden Kindern haben ihr Befinden angegeben`
                      : `${moodSummary.answeredCount} von ${moodSummary.totalStudents} Kindern haben ihr Befinden angegeben`}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    5 Smileys · freiwillig · Anwesenheit und Befinden bleiben getrennt gespeichert
                  </div>
                </div>
                {moodSummary.stats.average !== null && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl">
                    <span className="text-xl">{moodAverageInfo.emoji}</span>
                    <div>
                      <div className="text-xs font-black text-slate-800">Ø {moodSummary.stats.average.toFixed(1)}</div>
                      <div className={`text-[10px] font-bold ${moodAverageInfo.colorClass}`}>{moodAverageInfo.label}</div>
                    </div>
                  </div>
                )}
              </div>

              {moodSummary.stats.totalCount > 0 ? (
                <>
                  <div className="grid grid-cols-5 gap-2">
                    {KID_MOOD_SCALE.map((meta) => {
                      const count = moodSummary.stats.distribution[meta.value] || 0;
                      const pct = moodSummary.stats.distributionPct[meta.value] || 0;
                      return (
                        <div key={meta.value} className={`p-2 rounded-xl border text-center ${meta.badgeBg} ${meta.badgeBorder}`}>
                          <div className="text-xl">{meta.emoji}</div>
                          <div className="text-xs font-black text-slate-800">{count}×</div>
                          <div className="text-[9px] font-semibold text-slate-500">{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                    {moodSummary.calmSummary}
                  </div>
                </>
              ) : (
                <div className="p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                  Heute liegt noch keine freiwillige Befindensangabe vor. Der Check-in kann im Lehrercockpit erfolgen.
                </div>
              )}

              {moodSummary.details.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTeacherMoodDetails((value) => !value)}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-100"
                  >
                    <ShieldCheck size={13} />
                    {showTeacherMoodDetails ? 'Vertrauliche Einzelansicht ausblenden' : 'Vertrauliche Einzelansicht für die Lehrkraft'}
                  </button>

                  {showTeacherMoodDetails && (
                    <div className="mt-2 p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs">
                      <div className="flex items-center gap-2 text-amber-900 font-bold mb-2">
                        <ShieldAlert size={14} />
                        Nur für pädagogische Fürsorge – nicht öffentlich anzeigen oder bewerten.
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                        {moodSummary.details.map((detail) => {
                          const meta = detail.moodValue ? getMoodMeta(detail.moodValue) : undefined;
                          return (
                            <div key={detail.studentId} className="px-2.5 py-1.5 rounded-lg border bg-white border-slate-200 flex items-center justify-between gap-2">
                              <span className="truncate font-medium text-slate-700">{detail.displayName}</span>
                              <span className="shrink-0">{meta ? `${meta.emoji} ${meta.shortLabel}` : 'Keine Angabe'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VERBINDUNG ZU VERHALTEN & BEOBACHTUNGEN */}
            <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <ShieldAlert size={19} className="text-amber-600" />
                    Verhalten & Beobachtungen heute
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Wir-Gefühl zeigt vorhandene Beobachtungen an. Neue Verhaltensnotizen werden zentral unter „Notizen & Beobachtungen“ erfasst.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPage('verhalten')}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black shrink-0"
                >
                  Beobachtung erfassen
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <div className="text-2xl font-black text-amber-900">{todayBehaviorNotes.length}</div>
                  <div className="text-[11px] font-bold text-amber-700">Verhaltensnotizen heute</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-2xl font-black text-slate-900">{todayStatusChanges.length}</div>
                  <div className="text-[11px] font-bold text-slate-600">Statusänderungen heute</div>
                </div>
              </div>

              {todayBehaviorNotes.length > 0 && (
                <div className="space-y-2">
                  {todayBehaviorNotes.slice(0, 5).map((entry: any) => {
                    const student = entry.schuelerId ? (app.schueler || []).find((item) => item.id === entry.schuelerId) : undefined;
                    return (
                      <div key={entry.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          {student ? `${student.vorname} ${student.nachname}` : 'Klasse'}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">{entry.inhalt}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PASSENDE TAGESAKTION (1 PROMINENT RECOMMENDATION) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col gap-5 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    Heute passend
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-2">{recommendedActivity.title}</h3>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{recommendedActivity.goal} · {recommendedActivity.duration}</p>
                </div>

                <button
                  type="button"
                  onClick={rollAppreciation}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  🎲 Andere Aktion
                </button>
              </div>

              <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/60">
                "{recommendedActivity.description}"
              </p>

              {/* Interactive Runner Trigger */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <Clock size={14} className="text-emerald-600" />
                  <span>Dauer: {recommendedActivity.duration}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedGameId(recommendedActivity.id);
                    setActiveTab('gemeinsam');
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={14} /> Aktivität starten
                </button>
              </div>
            </div>

            {/* TÄGLICHES RITUAL (SIMPLIFIED 3-STEP FLOW) */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Sparkles className="text-amber-500" size={20} />
                    Tägliches Ritual (3 einfache Schritte)
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Check-in ansehen → Atempause / Impuls → gemeinsames Ritual abschließen
                  </p>
                </div>
                <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  Schritt {ritualStep} von 3
                </span>
              </div>

              {/* Steps Progress Indicator */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: 1, title: '1. Check-in' },
                  { step: 2, title: '2. Atempause' },
                  { step: 3, title: '3. Abschluss' }
                ].map(s => (
                  <button
                    key={s.step}
                    onClick={() => setRitualStep(s.step)}
                    className={`p-2.5 rounded-xl text-center text-xs font-black transition-all border ${
                      ritualStep === s.step 
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' 
                        : ritualStep > s.step 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>

              {/* Ritual Step Content */}
              {ritualStep === 1 && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">Schritt 1: Check-in ansehen</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {moodSummary.answeredCount > 0
                        ? `${moodSummary.answeredCount} Befindensangaben aus „Ich bin da!“ liegen vor.`
                        : 'Noch keine freiwillige Befindensangabe aus „Ich bin da!“ vorhanden.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setRitualStep(2)}
                    className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-sm hover:bg-emerald-500 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Weiter zu Schritt 2 <ArrowRight size={14} className="inline ml-1" />
                  </button>
                </div>
              )}

              {ritualStep === 2 && (
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col items-center text-center gap-4">
                  <h4 className="font-bold text-slate-800 text-sm">Schritt 2: 1 Minute Atempause & Klangschale</h4>
                  
                  <div className="relative w-36 h-36 flex items-center justify-center my-2">
                    <div 
                      className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 transition-all duration-[4000ms] ${
                        isBreathingRunning 
                          ? breathingPhase === 'inhale' 
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-110' 
                            : 'bg-rose-100 border-rose-300 text-rose-800 scale-90'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-2xl mb-0.5">{isBreathingRunning ? (breathingPhase === 'inhale' ? '🌌' : '🍃') : '🔔'}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {isBreathingRunning ? (breathingPhase === 'inhale' ? 'Einatmen' : 'Ausatmen') : 'Bereit'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!isBreathingRunning) {
                          playKlangschale();
                          setIsBreathingRunning(true);
                        } else {
                          setIsBreathingRunning(false);
                        }
                      }}
                      className="px-5 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-500 transition-all flex items-center gap-2"
                    >
                      {isBreathingRunning ? <Pause size={14} /> : <Play size={14} />}
                      {isBreathingRunning ? 'Pause' : 'Gong & Start'}
                    </button>
                    <button
                      onClick={() => setRitualStep(3)}
                      className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all"
                    >
                      Weiter zu Schritt 3
                    </button>
                  </div>
                </div>
              )}

              {ritualStep === 3 && (
                <div className="p-6 bg-gradient-to-tr from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col items-center text-center gap-4">
                  <span className="text-4xl">💎</span>
                  <div>
                    <h4 className="font-bold text-amber-950 text-base">Schritt 3: Belohnungs-Murmel werfen!</h4>
                    <p className="text-xs text-amber-800 font-semibold mt-1 max-w-md">
                      Ihr habt das Ritual abgeschlossen. Werft eine Murmel ins Klassenglas!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setApp(p => ({
                        ...p,
                        klassenglas_count: Math.min((p.klassenglas_ziel || 100), (p.klassenglas_count || 0) + 1)
                      }));
                      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                      alert("🎉 +1 Murmel im Klassenglas gesichert!");
                    }}
                    className="px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    💎 Murmel ins Glas werfen (+1)
                  </button>
                </div>
              )}
            </div>

            {/* KURZER TAGES-ÜBERBLICK */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Smile size={20} /></div>
                <div>
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Klassenstimmung</span>
                  <span className="text-sm font-black text-slate-800">
                    {moodSummary.stats.average !== null ? moodAverageInfo.label : 'Noch keine Angabe'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Trophy size={20} /></div>
                <div>
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Klassenglas</span>
                  <span className="text-sm font-black text-slate-800">{klassenglasCount} / {klassenglasGoal} Murmeln</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><MessageSquare size={20} /></div>
                <div>
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider block">Klassenrat-Briefkasten</span>
                  <span className="text-sm font-black text-slate-800">{unreadNotesCount} neue Zettel</span>
                </div>
              </div>
            </div>

          </div>
        )}


        {/* ==========================================
            2. TAB: GEMEINSAM (VERTRAG, MISSIONEN, SPIELE)
           ========================================== */}
        {activeTab === 'gemeinsam' && (
          <div className="flex flex-col gap-6 animate-fade-in w-full">
            
            {/* KLASSENVERTRAG */}
            <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <ShieldCheck className="text-purple-600" size={22} />
                    Unser Klassenvertrag & Verhaltenskodex
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Gemeinsam vereinbarte Regeln für ein wertschätzendes Miteinander.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReflectingContracts(!isReflectingContracts)}
                  className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isReflectingContracts 
                      ? 'bg-purple-600 text-white shadow-md' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  ⭐ {isReflectingContracts ? 'Reflexion beenden' : 'Gemeinsam reflektieren'}
                </button>
              </div>

              {/* Reflection Mode Banner */}
              {isReflectingContracts && (
                <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                  <div>
                    <h4 className="font-bold text-purple-900 text-sm">Klassen-Reflexion läuft...</h4>
                    <p className="text-xs text-purple-700 font-semibold mt-0.5">
                      Bewertet jede Regel mit 1-5 Sternen. Erreicht im Schnitt 4.0 Sterne für +5 Murmeln!
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      let sum = 0;
                      let count = 0;
                      const nextContracts = contracts.map(c => {
                        const rating = tempRatings[c.id] || c.stars || 5;
                        sum += rating;
                        count++;
                        return { ...c, stars: rating };
                      });
                      const average = sum / (count || 1);
                      updateContracts(nextContracts);

                      if (average >= 4.0) {
                        setApp((prev: any) => ({
                          ...prev,
                          klassenglas_count: Math.min((prev.klassenglas_ziel || 100), (prev.klassenglas_count || 0) + 5)
                        }));
                        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                        alert(`🎉 Klasse! Durchschnitt ${average.toFixed(1)} Sterne! +5 Murmeln gesichert!`);
                      } else {
                        alert(`👍 Danke für die ehrliche Reflexion! Schnitt: ${average.toFixed(1)} Sterne.`);
                      }
                      setIsReflectingContracts(false);
                      setTempRatings({});
                    }}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer shrink-0"
                  >
                    Auswerten & Speichern
                  </button>
                </div>
              )}

              {/* CONTRACT RULES GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {contracts.map((c) => {
                  const currentRating = isReflectingContracts ? (tempRatings[c.id] ?? c.stars ?? 5) : (c.stars ?? 5);
                  return (
                    <div key={c.id} className="p-5 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-3">
                      <div>
                        <div className="text-2xl mb-2">{c.icon}</div>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug">{c.rule}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">{c.description}</p>
                      </div>

                      <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                        <div className="flex gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <button
                              key={i}
                              disabled={!isReflectingContracts}
                              onClick={() => setTempRatings(prev => ({ ...prev, [c.id]: i + 1 }))}
                              className={`text-sm ${i < currentRating ? 'text-amber-400' : 'text-slate-300'} ${isReflectingContracts ? 'cursor-pointer hover:scale-125' : ''}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-400">{currentRating}/5</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* KLASSENMISSIONEN */}
            <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Trophy className="text-amber-500" size={22} />
                    Aktive Klassenmissionen
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Gemeinsam Ziele erreichen & Murmeln verdienen.</p>
                </div>

                <button
                  onClick={() => {
                    const pool = COMMUNITY_MISSIONS_POOL || [{icon: "🏆", title: "Flüsterkönig", description: "Wir arbeiten diese Woche in der Stillarbeit wirklich ganz leise.", rewardClassMarbles: 5}];
                    const randomMission = pool[Math.floor(Math.random() * pool.length)];
                    setApp(prev => ({
                      ...prev,
                      klassenglas_missions: [
                        ...(prev.klassenglas_missions || []),
                        {
                          id: 'mis-' + Date.now(),
                          title: `${randomMission.icon} ${randomMission.title}`,
                          description: randomMission.description,
                          rewardClassMarbles: randomMission.rewardClassMarbles
                        }
                      ]
                    }));
                  }}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> Neue Mission
                </button>
              </div>

              <div className="space-y-3">
                {activeMissions.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs font-bold">
                    Keine aktiven Missionen. Füge eine neue Mission hinzu!
                  </div>
                ) : (
                  activeMissions.map((miss: any) => (
                    <div key={miss.id} className="p-4 rounded-2xl border border-emerald-200/80 bg-emerald-50/30 flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{miss.title}</h4>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">{miss.description}</p>
                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-black">
                          +{miss.rewardClassMarbles} Murmeln
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          setApp((prev: any) => ({
                            ...prev,
                            klassenglas_count: Math.min((prev.klassenglas_ziel || 100), (prev.klassenglas_count || 0) + miss.rewardClassMarbles),
                            klassenglas_missions: prev.klassenglas_missions.filter((m: any) => m.id !== miss.id),
                            klassenglas_completed_missions: [
                              ...(prev.klassenglas_completed_missions || []),
                              { ...miss, completedAt: new Date().toISOString() }
                            ]
                          }));
                          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
                        }}
                        className="p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0"
                        title="Mission als abgeschlossen markieren"
                      >
                        <Check size={16} /> Erledigt
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* TEAMSPIELE / TEAM-BOOSTER */}
            <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Flame className="text-emerald-600" size={22} />
                    Teamspiele & Impulse
                  </h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Schnelle interaktive Übungen mit Schritt-für-Schritt Anleitung & Timer.
                  </p>
                </div>

                {/* Category Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {['alle', 'Fokus & Ruhe', 'Gemeinschaft & Empathie', 'Kooperation & Teamwork', 'Vertrauen & Zuhören'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setGameFilterCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                        gameFilterCategory === cat 
                          ? 'bg-slate-800 text-white border-slate-800' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'alle' ? 'Alle Spiele' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* ACTIVE GAME RUNNER ARENA */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <span className="text-[0.625rem] font-black uppercase text-emerald-600 tracking-widest">{activeGame.category}</span>
                    <h3 className="text-lg font-black text-slate-800 mt-0.5">{activeGame.title}</h3>
                    <p className="text-xs font-semibold text-slate-500">Ziel: {activeGame.goal}</p>
                  </div>

                  {/* Timer Widget */}
                  <div className="bg-white p-3 px-5 rounded-2xl border border-slate-200 text-center min-w-[140px] shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timer</span>
                    <div className="text-2xl font-mono font-black text-slate-800 my-1">
                      {Math.floor(gameTimer / 60).toString().padStart(2, '0')}:{(gameTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => setIsGameTimerRunning(!isGameTimerRunning)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white transition-all ${
                          isGameTimerRunning ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-600 hover:bg-emerald-500'
                        }`}
                      >
                        {isGameTimerRunning ? 'Pause' : 'Start'}
                      </button>
                      <button
                        onClick={() => {
                          const mins = parseInt(activeGame.duration) || 5;
                          setGameTimer(mins * 60);
                          setIsGameTimerRunning(false);
                        }}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[10px] font-bold"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instructions Checklist */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Anleitung Schritt für Schritt</h4>
                  {activeGame.instructions.map((step, idx) => {
                    const isChecked = !!checkedSteps[`${activeGame.id}_${idx}`];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleStep(activeGame.id, idx)}
                        className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                          isChecked ? 'bg-white/50 border-slate-200 text-slate-400 line-through' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>
                          {isChecked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-semibold">{step}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Pedagogical Tip */}
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-xl flex gap-2.5 items-start">
                  <Lightbulb size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-emerald-950 leading-relaxed italic">
                    Tipp: "{activeGame.tips}"
                  </p>
                </div>
              </div>

              {/* GAME SELECTION GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TEAM_GAMES
                  .filter(g => gameFilterCategory === 'alle' || g.category === gameFilterCategory)
                  .map(game => (
                    <button
                      key={game.id}
                      onClick={() => setSelectedGameId(game.id)}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        selectedGameId === game.id 
                          ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm' 
                          : 'bg-slate-50/50 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">{game.category} · {game.duration}</span>
                        <h4 className="font-bold text-slate-800 text-xs leading-snug">{game.title}</h4>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-700">Auswählen →</span>
                    </button>
                  ))}
              </div>
            </div>

          </div>
        )}


        {/* ==========================================
            3. TAB: KLASSENRAT
           ========================================== */}
        {activeTab === 'klassenrat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in w-full">
            
            {/* BRIEFKASTEN EINGABE */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col gap-5">
              <div className="flex gap-3 items-center">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-none">Klassen-Briefkasten</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Zettel für den Klassenrat einwerfen</p>
                </div>
              </div>

              {/* Form Category Pills */}
              <div className="space-y-3">
                <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Kategorie</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'lob', label: '🌸 Lob & Dank', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                    { type: 'sorge', label: '⚠️ Problem / Sorge', color: 'bg-rose-50 text-rose-800 border-rose-200' },
                    { type: 'idee', label: '💡 Idee / Vorschlag', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                    { type: 'wunsch', label: '✨ Herzenswunsch', color: 'bg-purple-50 text-purple-800 border-purple-200' }
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setNoteType(item.type as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-left cursor-pointer ${
                        noteType === item.type 
                          ? `${item.color} ring-2 ring-orange-500/20 shadow-sm` 
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Von wem?</label>
                    <input
                      type="text"
                      value={noteFrom}
                      onChange={(e) => setNoteFrom(e.target.value)}
                      placeholder="z.B. Leo oder Anonym"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Für wen?</label>
                    <input
                      type="text"
                      value={noteTo}
                      onChange={(e) => setNoteTo(e.target.value)}
                      placeholder="z.B. Alle, Mia"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Anliegen</label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Was möchtest du besprechen?..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 h-24 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!noteContent.trim()) {
                      alert("Bitte trage den Inhalt ein.");
                      return;
                    }
                    const newNote = {
                      id: 'n-' + Date.now(),
                      type: noteType,
                      content: noteContent.trim(),
                      from: noteFrom.trim() || 'Anonym',
                      to: noteTo.trim() || 'Alle',
                      date: new Date().toISOString(),
                      status: 'neu'
                    };
                    const updated = [newNote, ...councilNotes];
                    updateCouncilNotes(updated);
                    
                    setNoteContent('');
                    setNoteFrom('');
                    setNoteTo('');
                    alert("📮 Zettel erfolgreich in den Briefkasten eingeworfen!");
                  }}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all cursor-pointer"
                >
                  Zettel einwerfen 📮
                </button>
              </div>
            </div>

            {/* AGENDA / ZETTELBOX */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col gap-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-base">Agenda / Zettelbox ({councilNotes.length})</h3>
                  <p className="text-xs text-slate-400 font-semibold">Alle eingegangenen Anliegen für den Klassenrat</p>
                </div>

                <button
                  onClick={() => {
                    if (confirm("Möchtest du alle Zettel leeren?")) {
                      updateCouncilNotes([]);
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Box leeren
                </button>
              </div>

              {/* STICKY NOTES LIST */}
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {councilNotes.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold">
                    Der Briefkasten ist leer. Kinder können Zettel für den Klassenrat einwerfen.
                  </div>
                ) : (
                  councilNotes.map((note) => {
                    let badgeColor = 'bg-amber-100 text-amber-900 border-amber-200';
                    let emoji = '💡';
                    if (note.type === 'lob') { badgeColor = 'bg-emerald-100 text-emerald-900 border-emerald-200'; emoji = '🌸'; }
                    if (note.type === 'sorge') { badgeColor = 'bg-rose-100 text-rose-900 border-rose-200'; emoji = '⚠️'; }
                    if (note.type === 'wunsch') { badgeColor = 'bg-purple-100 text-purple-900 border-purple-200'; emoji = '✨'; }

                    return (
                      <div
                        key={note.id}
                        className={`p-4 rounded-2xl border flex flex-col gap-2.5 transition-all ${
                          note.status === 'done' ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-slate-50/70 border-slate-200/80 shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                            {emoji} {note.type.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Von {note.from} → Für {note.to}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                          "{note.content}"
                        </p>

                        <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                          {note.type === 'lob' && note.status !== 'done' && (
                            <button
                              onClick={() => {
                                setApp((prev: any) => ({
                                  ...prev,
                                  klassenglas_count: Math.min((prev.klassenglas_ziel || 100), (prev.klassenglas_count || 0) + 1)
                                }));
                                const nextNotes = councilNotes.map(x => x.id === note.id ? { ...x, status: 'done' } : x);
                                updateCouncilNotes(nextNotes);
                                confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
                              }}
                              className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-[10px] rounded-lg border border-amber-300 hover:bg-amber-200 transition-all cursor-pointer"
                            >
                              💎 +1 Murmel Belohnung
                            </button>
                          )}

                          {note.status !== 'done' ? (
                            <button
                              onClick={() => {
                                const nextNotes = councilNotes.map(x => x.id === note.id ? { ...x, status: 'done' } : x);
                                updateCouncilNotes(nextNotes);
                              }}
                              className="px-3 py-1 bg-slate-800 text-white font-bold text-[10px] rounded-lg hover:bg-slate-700 transition-all ml-auto cursor-pointer"
                            >
                              Besprochen
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const filtered = councilNotes.filter(x => x.id !== note.id);
                                updateCouncilNotes(filtered);
                              }}
                              className="text-[10px] font-bold text-rose-500 hover:underline ml-auto cursor-pointer"
                            >
                              Löschen
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        )}


        {/* ==========================================
            4. TAB: MEHR (ECHTER VERLAUF & BEOBACHTUNGEN)
           ========================================== */}
        {activeTab === 'mehr' && (
          <div className="flex flex-col gap-6 animate-fade-in w-full">
            <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'verlauf', label: '📊 Befinden-Verlauf' },
                { id: 'beobachtungen', label: '📝 Verhaltensbeobachtungen' },
                { id: 'spiele', label: '🎲 Gemeinschaftsaktivitäten' }
              ].map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setMehrSubTab(sub.id as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border ${
                    mehrSubTab === sub.id
                      ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {mehrSubTab === 'verlauf' && (
              <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Befinden aus „Ich bin da!“ – letzte 14 Tage</h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1">
                    Nur freiwillige Angaben anwesender Kinder. 1 = sehr gut, 5 = schlecht. Tage ohne Angaben bleiben leer.
                  </p>
                </div>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={moodTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis domain={[1, 5]} reversed ticks={[1, 2, 3, 4, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip formatter={(value: any) => [value == null ? 'Keine Angabe' : Number(value).toFixed(1), 'Ø Befinden']} />
                      <Area connectNulls={false} type="monotone" dataKey="average" stroke="#10b981" strokeWidth={3} fillOpacity={0.12} fill="#10b981" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {mehrSubTab === 'beobachtungen' && (
              <div className="bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 sm:p-6 border border-[var(--border-subtle,var(--border))] shadow-sm flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">Verhaltensbeobachtungen</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      Diese Einträge kommen direkt aus „Notizen & Beobachtungen“. Wir-Gefühl führt kein zweites Tagebuch.
                    </p>
                  </div>
                  <button type="button" onClick={() => setPage('verhalten')} className="px-4 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-[var(--accent-text,#fff)] rounded-xl text-xs font-bold transition-colors">
                    Zu Notizen & Beobachtungen
                  </button>
                </div>

                {recentBehaviorNotes.length > 0 ? (
                  <div className="space-y-2">
                    {recentBehaviorNotes.map((entry: any) => {
                      const student = entry.schuelerId ? (app.schueler || []).find((item) => item.id === entry.schuelerId) : undefined;
                      return (
                        <div key={entry.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              {student ? `${student.vorname} ${student.nachname}` : 'Klasse'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">{String(entry.datum || '').slice(0, 10)}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-700 mt-1">{entry.inhalt}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                    Noch keine Verhaltensbeobachtungen vorhanden.
                  </div>
                )}
              </div>
            )}

            {mehrSubTab === 'spiele' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEAM_GAMES.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setActiveTab('gemeinsam');
                    }}
                    className="text-left bg-[var(--surface-card,var(--surface))] rounded-2xl p-5 border border-[var(--border-subtle,var(--border))] shadow-sm hover:border-[var(--accent)]/30 transition-colors"
                  >
                    <div className="text-sm font-black text-slate-900">{game.title}</div>
                    <div className="text-[11px] font-bold text-emerald-700 mt-1">{game.goal} · {game.duration}</div>
                    <div className="text-xs text-slate-600 mt-3">{game.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
