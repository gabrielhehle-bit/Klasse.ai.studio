import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { 
  Trophy, Sparkles, Check, Plus, Minus,
  Heart, BookOpen, Activity, MessageSquare, ShieldCheck, Smile, ShieldAlert, Lightbulb,
  Users, Flame, RotateCcw, Clock, Volume2, Play, Pause, Settings, Sliders
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { COMMUNITY_MISSIONS_POOL } from '../types';

const TEAM_GAMES = [
  {
    id: 'game-1',
    title: 'Flüster-Post mit Klatschen',
    category: 'Fokus & Ruhe',
    duration: '5 Min',
    goal: 'Konzentration & Stille',
    description: 'Die Kinder sitzen im Kreis. Ein geheimer Rhythmus (z.B. zwei kurze Klatscher, ein langer) wird per Schulterklopfen oder Handdruck an das nächste Kind weitergegeben. Schafft es der Rhythmus unverändert einmal ganz herum?',
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
    description: 'Kinder werfen sich einen Wollknäuel oder Ball zu und sagen dem Empfänger ein ehrliches, kurzes Kompliment oder danken für eine kleine Hilfe.',
    instructions: [
      'Die Klasse bildet einen großen Kreis.',
      'Ein Kind hält ein Wollknäuel, sucht Augenkontakt zu einem anderen Kind und sagt: „Ich danke dir, dass du mir gestern bei Mathe geholfen hast“ oder „Ich mag es, dass du immer so fröhlich bist.“',
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
    description: 'In Kleingruppen von 4 Kindern soll aus Papier, Heften oder Stiften der höchste Turm gebaut werden – jedoch ohne ein einziges Wort zu sprechen!',
    instructions: [
      'Teile die Klasse in 4er-Teams auf.',
      'Jedes Team bekommt ein paar Blätter Schmierpapier oder nutzt Gegenstände aus dem eigenen Federmäppchen.',
      'Sobald der Timer startet, gilt: Absolute Redeverbot! Absprachen dürfen nur mit Gesten erfolgen.',
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
    description: 'Ein Kind schließt die Augen („der Roboter“) und wird nur durch sanftes Tippen auf die Schulter (links/rechts/Schnittstelle) oder leise Sprachbefehle steuernd durch einen einfachen Parcours geführt.',
    instructions: [
      'Zwei Kinder arbeiten zusammen.',
      'Kind A schließt die Augen. Kind B steht dahinter und navigiert Kind A durch Antippen der linken/rechten Schulter oder leises Flüstern um die Schultische herum.',
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
    description: 'Die Klasse versucht, einen einzigen, harmonischen Summton zu erzeugen. Wenn einer lauter summt oder aus der Reihe tanzt, bricht die Harmonie zusammen.',
    instructions: [
      'Alle setzen sich aufrecht hin und schließen die Augen.',
      'Auf das Zeichen des Lehrers beginnen alle, einen tiefen Ton zu summen („Mmmmmm“).',
      'Die Aufgabe ist, den Ton so anzupassen, dass er wie eine einzige, große, sanfte Welle im Raum klingt.',
      'Der Lehrer beendet die Übung mit einem leisen Handzeichen.'
    ],
    tips: 'Beruhigt das Nervensystem ungemein und schafft eine erhabene, gemeinsame Schwingung.'
  }
];

export default function WirGefuehl() {
  const { app, setApp } = useApp();
  
  const [activeTab, setActiveTab] = useState<'ritual' | 'klima' | 'klassenglas' | 'tagebuch' | 'spiele' | 'barometer' | 'vertrag' | 'klassenrat'>('ritual');
  
  // Klassen-Vertrag (Class Contract) States
  const [contracts, setContracts] = useState<any[]>(() => {
    const saved = localStorage.getItem('class_contracts_v1');
    return saved ? JSON.parse(saved) : [
      { id: 'c1', rule: 'Einander zuhören', icon: '👂', description: 'Wir lassen andere ausreden und hören aufmerksam zu.', stars: 5, status: 'aktiv' },
      { id: 'c2', rule: 'Freundlicher Umgang', icon: '🤝', description: 'Wir schlichten Streit friedlich und sprechen nett miteinander.', stars: 5, status: 'aktiv' },
      { id: 'c3', rule: 'Ordnung halten', icon: '🧹', description: 'Wir hinterlassen unseren Platz und die Klasse sauber.', stars: 4, status: 'aktiv' },
      { id: 'c4', rule: 'Leise Arbeitsphasen', icon: '🤫', description: 'In Stillarbeitsphasen konzentrieren wir uns ganz auf unsere Aufgabe.', stars: 4, status: 'aktiv' },
    ];
  });
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleIcon, setNewRuleIcon] = useState('💡');
  const [isReflectingContracts, setIsReflectingContracts] = useState(false);
  const [tempRatings, setTempRatings] = useState<Record<string, number>>({});

  // Klassenrat States
  const [councilNotes, setCouncilNotes] = useState<any[]>(() => {
    const saved = localStorage.getItem('council_notes_v1');
    return saved ? JSON.parse(saved) : [
      { id: 'n1', type: 'lob', content: 'Mia hat mir heute beim Aufräumen geholfen, weils sie nett ist. Danke!', from: 'Leo', to: 'Mia', date: new Date().toISOString(), status: 'neu' },
      { id: 'n2', type: 'idee', content: 'Können wir im Schulhof eine Fußball-Pause vereinbaren, damit sich die Klassen abwechseln?', from: 'Klassenrat-Team', to: 'Alle', date: new Date().toISOString(), status: 'neu' }
    ];
  });
  const [noteType, setNoteType] = useState<'lob' | 'sorge' | 'idee' | 'wunsch'>('lob');
  const [noteContent, setNoteContent] = useState('');
  const [noteFrom, setNoteFrom] = useState('');
  const [noteTo, setNoteTo] = useState('');
  const [briefkastenStage, setBriefkastenStage] = useState<'idle' | 'submitting' | 'success'>('idle');
  
  // States for Tägliches Ritual (Daily Ritual)
  const [ritualStep, setRitualStep] = useState<number>(1);
  const [ritualMood, setRitualMood] = useState<'motiviert' | 'muede' | 'unruhig' | 'kooperativ' | 'frustriert' | null>(null);
  const [breathingSeconds, setBreathingSeconds] = useState<number>(60);
  const [isBreathingRunning, setIsBreathingRunning] = useState<boolean>(false);
  const [breathingPhase, setBreathingPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [ritualCompleted, setRitualCompleted] = useState<boolean>(false);

  const [selectedGameId, setSelectedGameId] = useState<string>('game-1');
  const [barometerMood, setBarometerMood] = useState<'motiviert' | 'muede' | 'unruhig' | 'kooperativ' | 'frustriert' | null>(null);
  const [barometerNote, setBarometerNote] = useState('');
  const [barometerStatus, setBarometerStatus] = useState<string | null>(null);

  const MOODS_META = {
    motiviert: { label: 'Motiviert', emoji: '🚀', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    muede: { label: 'Müde', emoji: '🥱', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    unruhig: { label: 'Unruhig', emoji: '🐝', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    kooperativ: { label: 'Kooperativ', emoji: '🤝', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    frustriert: { label: 'Frustriert', emoji: '😟', color: 'bg-rose-50 text-rose-700 border-rose-200' }
  };

  const [barometerHistory, setBarometerHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('barometer_history_v1');
    return saved ? JSON.parse(saved) : [
      { id: 'b1', date: new Date(Date.now() - 86400000 * 2).toISOString(), mood: 'kooperativ', note: 'Klasse hat hervorragend in Gruppen gearbeitet.' },
      { id: 'b2', date: new Date(Date.now() - 86400000).toISOString(), mood: 'unruhig', note: 'Nach der Pause etwas wuselig. Gong half sehr.' }
    ];
  });

  const handleSaveBarometer = () => {
    if (!barometerMood) return;
    const newLog = {
      id: 'baro-' + Date.now(),
      date: new Date().toISOString(),
      mood: barometerMood,
      note: barometerNote.trim()
    };
    const updated = [newLog, ...barometerHistory];
    setBarometerHistory(updated);
    localStorage.setItem('barometer_history_v1', JSON.stringify(updated));
    setBarometerNote('');
    setBarometerStatus("Stimmungsbild erfolgreich archiviert!");
    setTimeout(() => setBarometerStatus(null), 3000);
  };

  // New States for interactive game timer
  const [gameTimer, setGameTimer] = useState<number>(300); // default 5 min
  const [isGameTimerRunning, setIsGameTimerRunning] = useState<boolean>(false);

  // States for appreciation and harmony sound
  const [appreciationPrompt, setAppreciationPrompt] = useState<string>("Gib heute einem Kind, das neben dir sitzt, ein ehrliches Kompliment für seine Mitarbeit.");
  const [isChimePlaying, setIsChimePlaying] = useState<boolean>(false);
  const [chimeProgress, setChimeProgress] = useState<number>(0);

  const [checkedSteps, setCheckedSteps] = useState<{[key: string]: boolean}>(() => {
    const saved = localStorage.getItem('game_checked_steps_v1');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleStep = (gameId: string, idx: number) => {
    const key = `${gameId}_${idx}`;
    const nextChecked = !checkedSteps[key];
    const updated = { ...checkedSteps, [key]: nextChecked };
    setCheckedSteps(updated);
    localStorage.setItem('game_checked_steps_v1', JSON.stringify(updated));
    
    if (nextChecked) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(400 + idx * 80, ctx.currentTime);
          gain.gain.setValueAtTime(0.04, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.start();
          osc.stop(ctx.currentTime + 0.1);
        }
      } catch (e) {}
    }
  };

  // Sync game timer with selected game
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
            // play simple audio beep
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
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

  // Guided breathing countdown effect for Tägliches Ritual
  React.useEffect(() => {
    let interval: any = null;
    if (isBreathingRunning && breathingSeconds > 0) {
      interval = setInterval(() => {
        setBreathingSeconds(prev => {
          if (prev <= 1) {
            setIsBreathingRunning(false);
            // play double chime at the end
            try {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) {
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.frequency.setValueAtTime(523.25, ctx.currentTime);
                gain.gain.setValueAtTime(0.1, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
                osc.start();
                osc.stop(ctx.currentTime + 1.0);
              }
            } catch (err) {}
            return 0;
          }
          // Shift breathing phase every 4 seconds
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

  // Synthesize a beautiful Tibetan singing bowl sound
  const playKlangschale = () => {
    setIsChimePlaying(true);
    setChimeProgress(100);
    
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        // Layer fundamental + 4 harmonics for rich singing bowl sound
        const frequencies = [164.81, 247.22, 329.63, 493.88, 659.25]; // E3 fundamental & harmonics
        
        frequencies.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();
          
          osc.type = 'sine';
          // subtle detune to make it warmer
          osc.frequency.setValueAtTime(freq + (Math.random() * 1.5 - 0.75), ctx.currentTime);
          
          // Fundamental lasts 6 seconds, higher harmonics decay faster
          const duration = index === 0 ? 6.0 : 4.0 - (index * 0.5);
          
          gainNode.gain.setValueAtTime(0, ctx.currentTime);
          gainNode.gain.linearRampToValueAtTime(0.2 / frequencies.length, ctx.currentTime + 0.5); // attack
          gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration); // decay
          
          osc.connect(gainNode);
          gainNode.connect(ctx.destination);
          
          osc.start();
          osc.stop(ctx.currentTime + duration);
        });
      }
    } catch (e) {
      console.warn("Web Audio API not supported or blocked:", e);
    }
    
    // Animate the ripple ring decay over 6 seconds
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
    
    // play a little happy spark sound
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15); // E6 slide
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch(e) {}
  };

  // Year-long climate data
  const [climateLog, setClimateLog] = useState<any[]>(() => {
    const saved = localStorage.getItem('klassengemeinschaft_year_klima_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    // Seed with empty/some default data for demonstration
    return [
      { id: 1, date: new Date(Date.now() - 3*86400000).toISOString(), type: 'positive', text: 'Toller Zusammenhalt bei der Gruppenarbeit!', val: 5 },
      { id: 2, date: new Date(Date.now() - 2*86400000).toISOString(), type: 'challenge', text: 'Starke Unruhe nach der Pause', val: -2 },
      { id: 3, date: new Date().toISOString(), type: 'positive', text: 'Klassendienste wurden selbsständig erledigt.', val: 3 },
    ];
  });

  const saveClimate = (newLogs: any[]) => {
    setClimateLog(newLogs);
    localStorage.setItem('klassengemeinschaft_year_klima_v1', JSON.stringify(newLogs));
  }

  const [newLogType, setNewLogType] = useState<'positive' | 'challenge'>('positive');
  const [newLogText, setNewLogText] = useState('');

  const addLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;
    const val = newLogType === 'positive' ? 5 : -2;
    const newEntry = {
      id: Date.now(),
      date: new Date().toISOString(),
      type: newLogType,
      text: newLogText,
      val
    };
    saveClimate([newEntry, ...climateLog]);
    setNewLogText('');
    
    // Optionally add a gem for positive logs
    if (newLogType === 'positive') {
      setApp(p => ({
        ...p,
        klassenglas_count: Math.min((p.klassenglas_ziel || 100), (p.klassenglas_count || 0) + 1)
      }));
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#fbbf24', '#f59e0b', '#10b981'] });
    }
  };

  // Generate chart data based on days
  const chartData = useMemo(() => {
    const dataByDate: Record<string, { positive: number, challenge: number, score: number }> = {};
    // Last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i*86400000);
      const ds = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' });
      dataByDate[ds] = { positive: 0, challenge: 0, score: 50 }; // Base score 50
    }
    
    climateLog.forEach(log => {
      const d = new Date(log.date);
      const ds = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit' });
      if (dataByDate[ds]) {
        if (log.type === 'positive') {
          dataByDate[ds].positive += log.val;
          dataByDate[ds].score += log.val;
        } else {
          dataByDate[ds].challenge += Math.abs(log.val);
          dataByDate[ds].score += log.val;
        }
      }
    });
    
    return Object.keys(dataByDate).map(key => ({
      name: key,
      score: Math.max(0, Math.min(100, dataByDate[key].score)),
      positive: dataByDate[key].positive,
      challenge: dataByDate[key].challenge
    }));
  }, [climateLog]);

  const microIntervention = useMemo(() => {
    const recent = climateLog.slice(0, 5);
    const positiveCount = recent.filter(l => l.type === 'positive').length;
    
    if (recent.length === 0) {
      return {
        title: "Beobachtung starten",
        desc: "Fange an, kleine positive Interaktionen im Alltag zu notieren, um ein Gefühl für das Klassenklima zu bekommen.",
        study: "Regelmäßiges, konkretes Feedback kann Lernprozesse unterstützen und nächste Schritte sichtbar machen."
      };
    }
    
    if (recent.length > 0 && positiveCount <= recent.length / 2) {
      return {
        title: "Positive Beobachtungen bewusst stärken",
        desc: "Der Fokus lag zuletzt oft auf herausfordernden Situationen. Halten Sie bewusst auch konkrete positive Interaktionen und Fortschritte fest.",
        study: "Ein ausgewogener Blick auf Stärken und Herausforderungen unterstützt eine wertschätzende pädagogische Reflexion."
      };
    }
    
    return {
      title: "Autonomie stärken",
      desc: "Das Klima wirkt aktuell positiv und stabil. Nutzen Sie diese Phase, um der Klasse schrittweise mehr Verantwortung zu übertragen, etwa durch Peer-Feedback oder Helferrollen.",
      study: "Erlebte Autonomie kann Motivation fördern, wenn Aufgaben, Unterstützung und Verantwortung zum Entwicklungsstand passen."
    };
  }, [climateLog]);

  const activeMissions = app?.klassenglas_missions || [];
  const completedMissions = app?.klassenglas_completed_missions || [];

  const [wirGefuehlConfig, setWirGefuehlConfig] = useState<any>(() => {
    const saved = localStorage.getItem('hehle_v3_wir_gefuehl_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      timeframe: 'gesamt', // 'heute' | 'gesamt'
      includeKlassenglas: true,
      klassenglasWeight: 5,
      includeMitarbeit: true,
      mitarbeitWeight: 1,
      includeBadges: true,
      badgesWeight: 10,
      includePositiveInteractions: true,
      positiveInteractionsWeight: 3
    };
  });

  const [showConfigPanel, setShowConfigPanel] = useState(false);

  const saveConfig = (newConfig: any) => {
    setWirGefuehlConfig(newConfig);
    localStorage.setItem('hehle_v3_wir_gefuehl_config', JSON.stringify(newConfig));
  };

  const totalMitarbeit = useMemo(() => {
    let sum = 0;
    if (app.mitarbeit) {
      Object.values(app.mitarbeit).forEach(fMap => {
        Object.values(fMap).forEach(sMap => {
          Object.values(sMap).forEach(val => sum += val);
        });
      });
    }
    return sum;
  }, [app.mitarbeit]);

  const totalBadges = app.schueler?.reduce((acc, s) => acc + (s.badges ? s.badges.length : 0), 0) || 0;
  
  const totalPositiveInteractions = useMemo(() => {
    const journalCount = (app.journal || []).filter(p => ['Erfolg', 'Verhalten'].includes(p.kategorie) && ((p.inhalt || '').toLowerCase().includes('lob') || (p.inhalt || '').toLowerCase().includes('gut') || (p.inhalt || '').toLowerCase().includes('hilf') || (p.inhalt || '').toLowerCase().includes('freundlich'))).length || 0;
    const notesCount = (app.notes || []).filter(p => ['Erfolg', 'Verhalten'].includes(p.kategorie) && ((p.inhalt || '').toLowerCase().includes('lob') || (p.inhalt || '').toLowerCase().includes('gut') || (p.inhalt || '').toLowerCase().includes('hilf') || (p.inhalt || '').toLowerCase().includes('freundlich'))).length || 0;
    const statusPraiseCount = (app.statusLog || []).filter(l => l.iconId === '1' || l.iconId === '2').length || 0;
    return Math.max(journalCount, notesCount) + statusPraiseCount;
  }, [app.journal, app.notes, app.statusLog]);

  const klassenglasCount = app.klassenglas_count || 0;

  // --- DAILY POINT CALCULATIONS ---
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayMitarbeit = useMemo(() => {
    return (app.mitarbeitLogs || []).reduce((sum, log) => {
      const logDate = log.timestamp ? log.timestamp.split('T')[0] : '';
      if (logDate === todayStr) {
        return sum + (log.points || 0);
      }
      return sum;
    }, 0);
  }, [app.mitarbeitLogs, todayStr]);

  const todayBadges = useMemo(() => {
    let count = 0;
    app.schueler?.forEach(s => {
      (s.badges || []).forEach(b => {
        const bDate = b.date ? b.date.split('T')[0] : '';
        if (bDate === todayStr) {
          count += 1;
        }
      });
    });
    return count;
  }, [app.schueler, todayStr]);

  const todayPositiveInteractions = useMemo(() => {
    const journalCount = (app.journal || []).filter(p => {
      const pDate = p.datum ? p.datum.split('T')[0] : '';
      if (pDate !== todayStr) return false;
      return ['Erfolg', 'Verhalten'].includes(p.kategorie) && (
        (p.inhalt || '').toLowerCase().includes('lob') || 
        (p.inhalt || '').toLowerCase().includes('gut') || 
        (p.inhalt || '').toLowerCase().includes('hilf') || 
        (p.inhalt || '').toLowerCase().includes('freundlich')
      );
    }).length;

    const notesCount = (app.notes || []).filter(p => {
      const pDate = p.datum ? p.datum.split('T')[0] : '';
      if (pDate !== todayStr) return false;
      return ['Erfolg', 'Verhalten'].includes(p.kategorie) && (
        (p.inhalt || '').toLowerCase().includes('lob') || 
        (p.inhalt || '').toLowerCase().includes('gut') || 
        (p.inhalt || '').toLowerCase().includes('hilf') || 
        (p.inhalt || '').toLowerCase().includes('freundlich')
      );
    }).length;

    const statusPraiseCount = (app.statusLog || []).filter(l => {
      const lDate = l.datum ? l.datum.split('T')[0] : '';
      return lDate === todayStr && (l.iconId === '1' || l.iconId === '2');
    }).length;

    return Math.max(journalCount, notesCount) + statusPraiseCount;
  }, [app.journal, app.notes, app.statusLog, todayStr]);

  const todayKlassenglas = useMemo(() => {
    return climateLog.filter(l => {
      const lDate = l.date ? l.date.split('T')[0] : '';
      return lDate === todayStr && l.type === 'positive';
    }).length;
  }, [climateLog, todayStr]);

  const calculatedEnergy = useMemo(() => {
    const isToday = wirGefuehlConfig.timeframe === 'heute';
    
    const countKlassenglas = isToday ? todayKlassenglas : klassenglasCount;
    const countMitarbeit = isToday ? todayMitarbeit : totalMitarbeit;
    const countBadges = isToday ? todayBadges : totalBadges;
    const countPositive = isToday ? todayPositiveInteractions : totalPositiveInteractions;

    let energy = 0;
    if (wirGefuehlConfig.includeKlassenglas) energy += countKlassenglas * wirGefuehlConfig.klassenglasWeight;
    if (wirGefuehlConfig.includeMitarbeit) energy += countMitarbeit * wirGefuehlConfig.mitarbeitWeight;
    if (wirGefuehlConfig.includeBadges) energy += countBadges * wirGefuehlConfig.badgesWeight;
    if (wirGefuehlConfig.includePositiveInteractions) energy += countPositive * wirGefuehlConfig.positiveInteractionsWeight;

    return energy;
  }, [wirGefuehlConfig, todayKlassenglas, klassenglasCount, todayMitarbeit, totalMitarbeit, todayBadges, totalBadges, todayPositiveInteractions, totalPositiveInteractions]);

  return (
    <div className="wir-gefuehl-shell flex-1 bg-[#f4f7f3] flex flex-col items-center p-4 lg:p-6 overflow-y-auto w-full min-h-0">
      <div className="w-full max-w-[1200px] flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Heart size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Wir-Gefühl</h1>
              <p className="text-sm text-slate-500 font-medium mt-1">Klassenklima gemeinsam wahrnehmen und gestalten</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-sm flex items-center gap-2.5 min-w-[125px]">
              <div className="text-amber-500 bg-amber-50 p-2 rounded-xl"><Trophy size={18} /></div>
              <div>
                <p className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Klassenglas</p>
                <p className="text-lg font-black text-slate-800 leading-none">{klassenglasCount} <span className="text-[0.75rem] text-slate-400 font-bold">💎</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-sm flex items-center gap-2.5 min-w-[125px]">
              <div className="text-emerald-500 bg-emerald-50 p-2 rounded-xl"><Plus size={18} /></div>
              <div>
                <p className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Mitarbeit</p>
                <p className="text-lg font-black text-slate-800 leading-none">{totalMitarbeit} <span className="text-[0.75rem] text-slate-400 font-bold">Punkte</span></p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-2.5 px-3.5 border border-slate-200 shadow-sm flex items-center gap-2.5 min-w-[125px]">
              <div className="text-rose-500 bg-rose-50 p-2 rounded-xl"><Heart size={18} /></div>
              <div>
                <p className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Interaktionen</p>
                <p className="text-lg font-black text-slate-800 leading-none">{totalPositiveInteractions + totalBadges} <span className="text-[0.75rem] text-slate-400 font-bold">Gesamt</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 text-indigo-950">
          <ShieldCheck size={17} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden="true" />
          <p className="text-xs font-semibold leading-relaxed">
            Pädagogische Notizen können sensible Angaben enthalten. Zeigen Sie personenbezogene Einträge nicht im Klassen- oder Präsentationsmodus und beschränken Sie den Zugriff auf berechtigte Personen.
          </p>
        </div>

        {/* NEW: Aggregated Wir-Gefühl Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-[0.03] pointer-events-none">
            <Heart className="w-64 h-64 text-rose-500" />
          </div>
          
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex flex-col gap-1">
              <h2 className="text-[1.125rem] font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="text-amber-500 animate-pulse" size={20} />
                Klassen-Energie (Wir-Gefühl)
              </h2>
              <p className="text-[0.75rem] font-medium text-slate-500 max-w-3xl">
                Eure gemeinsame Stärke wächst durch positive Taten. Die Lehrperson kann entscheiden, welche Aktivitäten einfließen und wie hoch sie gewichtet werden.
              </p>
            </div>
            
            <button
              type="button"
              aria-expanded={showConfigPanel}
              aria-controls="wir-gefuehl-konfiguration"
              onClick={() => setShowConfigPanel(!showConfigPanel)}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 shrink-0 ${
                showConfigPanel 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm" 
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }`}
              title="Formel anpassen"
            >
              <Settings size={18} className={showConfigPanel ? "animate-spin-slow" : ""} />
              <span className="text-xs font-bold hidden sm:inline">Konfigurieren</span>
            </button>
          </div>

          {/* Configurator Slider Drawer */}
          {showConfigPanel && (
            <div id="wir-gefuehl-konfiguration" className="relative z-10 p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-5 animate-in slide-in-from-top-3 duration-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200/60 gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Sliders size={16} className="text-indigo-500" />
                    Faktoren & Gewichtung für die Klassen-Energie
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Bestimme, welche Verhaltensweisen wie viel Energie-Punkte (XP) geben.</p>
                </div>
                
                {/* Timeframe selector */}
                <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm self-start md:self-auto shrink-0">
                  <button
                    type="button"
                    aria-pressed={wirGefuehlConfig.timeframe === 'heute'}
                    onClick={() => saveConfig({ ...wirGefuehlConfig, timeframe: 'heute' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      wirGefuehlConfig.timeframe === 'heute'
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Clock size={12} />
                    Nur heute gewertet
                  </button>
                  <button
                    type="button"
                    aria-pressed={wirGefuehlConfig.timeframe === 'gesamt'}
                    onClick={() => saveConfig({ ...wirGefuehlConfig, timeframe: 'gesamt' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
                      wirGefuehlConfig.timeframe === 'gesamt'
                        ? "bg-indigo-500 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Trophy size={12} />
                    Gesamter Zeitraum
                  </button>
                </div>
              </div>

              {/* Grid of the 4 sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Factor: Klassenglas */}
                <div className={`p-4 bg-white rounded-xl border transition-all flex flex-col gap-3 shadow-sm ${wirGefuehlConfig.includeKlassenglas ? 'border-amber-200/80 bg-amber-50/10' : 'border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wirGefuehlConfig.includeKlassenglas}
                        onChange={(e) => saveConfig({ ...wirGefuehlConfig, includeKlassenglas: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">💎 Klassenglas-Murmeln</span>
                    </label>
                    <span className="text-[0.6875rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Heute: {todayKlassenglas} • Gesamt: {klassenglasCount}
                    </span>
                  </div>
                  {wirGefuehlConfig.includeKlassenglas && (
                    <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold">Gewichtung (XP pro Murmel)</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, klassenglasWeight: Math.max(1, wirGefuehlConfig.klassenglasWeight - 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >-</button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">{wirGefuehlConfig.klassenglasWeight}</span>
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, klassenglasWeight: Math.min(50, wirGefuehlConfig.klassenglasWeight + 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Factor: Mitarbeit */}
                <div className={`p-4 bg-white rounded-xl border transition-all flex flex-col gap-3 shadow-sm ${wirGefuehlConfig.includeMitarbeit ? 'border-emerald-200/80 bg-emerald-50/10' : 'border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wirGefuehlConfig.includeMitarbeit}
                        onChange={(e) => saveConfig({ ...wirGefuehlConfig, includeMitarbeit: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">✍️ Mitarbeitspunkte</span>
                    </label>
                    <span className="text-[0.6875rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Heute: {todayMitarbeit} • Gesamt: {totalMitarbeit}
                    </span>
                  </div>
                  {wirGefuehlConfig.includeMitarbeit && (
                    <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold">Gewichtung (XP pro Pluspunkt)</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, mitarbeitWeight: Math.max(1, wirGefuehlConfig.mitarbeitWeight - 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >-</button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">{wirGefuehlConfig.mitarbeitWeight}</span>
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, mitarbeitWeight: Math.min(50, wirGefuehlConfig.mitarbeitWeight + 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Factor: Badges */}
                <div className={`p-4 bg-white rounded-xl border transition-all flex flex-col gap-3 shadow-sm ${wirGefuehlConfig.includeBadges ? 'border-rose-200/80 bg-rose-50/10' : 'border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wirGefuehlConfig.includeBadges}
                        onChange={(e) => saveConfig({ ...wirGefuehlConfig, includeBadges: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">🏆 Erreichte Badges</span>
                    </label>
                    <span className="text-[0.6875rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Heute: {todayBadges} • Gesamt: {totalBadges}
                    </span>
                  </div>
                  {wirGefuehlConfig.includeBadges && (
                    <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold">Gewichtung (XP pro Badge)</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, badgesWeight: Math.max(1, wirGefuehlConfig.badgesWeight - 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >-</button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">{wirGefuehlConfig.badgesWeight}</span>
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, badgesWeight: Math.min(100, wirGefuehlConfig.badgesWeight + 5) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Factor: Positive Interaktionen */}
                <div className={`p-4 bg-white rounded-xl border transition-all flex flex-col gap-3 shadow-sm ${wirGefuehlConfig.includePositiveInteractions ? 'border-indigo-200/80 bg-indigo-50/10' : 'border-slate-200 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={wirGefuehlConfig.includePositiveInteractions}
                        onChange={(e) => saveConfig({ ...wirGefuehlConfig, includePositiveInteractions: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">💬 Lobe & Positive Einträge</span>
                    </label>
                    <span className="text-[0.6875rem] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                      Heute: {todayPositiveInteractions} • Gesamt: {totalPositiveInteractions}
                    </span>
                  </div>
                  {wirGefuehlConfig.includePositiveInteractions && (
                    <div className="flex items-center justify-between gap-3 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold">Gewichtung (XP pro Lob/Aktion)</span>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, positiveInteractionsWeight: Math.max(1, wirGefuehlConfig.positiveInteractionsWeight - 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >-</button>
                        <span className="text-xs font-black text-slate-800 w-6 text-center">{wirGefuehlConfig.positiveInteractionsWeight}</span>
                        <button 
                          onClick={() => saveConfig({ ...wirGefuehlConfig, positiveInteractionsWeight: Math.min(50, wirGefuehlConfig.positiveInteractionsWeight + 1) })}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 font-black text-slate-600 hover:bg-slate-50 flex items-center justify-center text-xs"
                        >+</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Level and Energy Progress Bar */}
          <div className="flex flex-col gap-2 relative z-10">
            {(() => {
              const currentLevel = Math.floor(calculatedEnergy / 100) + 1;
              const currentProgress = calculatedEnergy % 100;
              const isToday = wirGefuehlConfig.timeframe === 'heute';
              
              return (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex flex-col">
                      <span className="text-[0.6875rem] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        Level {currentLevel} {isToday ? '(Heutiger Tag)' : '(Gesamt)'}
                      </span>
                      <span className="text-lg font-black text-slate-800 mt-0.5">{calculatedEnergy} Energy-XP</span>
                    </div>
                    <span className="text-xs font-black text-slate-500">
                      noch {100 - currentProgress} XP bis Level {currentLevel + 1}
                    </span>
                  </div>
                  
                  <div className="h-5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner flex border border-slate-200">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 rounded-full transition-all duration-1000 ease-out flex items-center justify-end px-2"
                      style={{ width: `${currentProgress}%` }}
                    >
                       {currentProgress > 8 && <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />}
                    </div>
                  </div>

                  {/* Dynamic point list */}
                  <div className="flex flex-wrap items-center justify-center gap-y-2 gap-x-4 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest">Aktivierte Faktoren:</span>
                    
                    {wirGefuehlConfig.includeKlassenglas && (
                      <span className="text-[0.6875rem] text-slate-500 font-bold flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100/50">
                        💎 Klassenglas: +{(isToday ? todayKlassenglas : klassenglasCount) * wirGefuehlConfig.klassenglasWeight} XP
                      </span>
                    )}
                    
                    {wirGefuehlConfig.includeMitarbeit && (
                      <span className="text-[0.6875rem] text-slate-500 font-bold flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100/50">
                        ✍️ Mitarbeit: +{(isToday ? todayMitarbeit : totalMitarbeit) * wirGefuehlConfig.mitarbeitWeight} XP
                      </span>
                    )}

                    {wirGefuehlConfig.includeBadges && (
                      <span className="text-[0.6875rem] text-slate-500 font-bold flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full border border-rose-100/50">
                        🏆 Badges: +{(isToday ? todayBadges : totalBadges) * wirGefuehlConfig.badgesWeight} XP
                      </span>
                    )}

                    {wirGefuehlConfig.includePositiveInteractions && (
                      <span className="text-[0.6875rem] text-slate-500 font-bold flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/50">
                        💬 Lob & Gesten: +{(isToday ? todayPositiveInteractions : totalPositiveInteractions) * wirGefuehlConfig.positiveInteractionsWeight} XP
                      </span>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-sm w-full">
          <button 
            type="button"
            aria-pressed={activeTab === 'ritual'}
            onClick={() => setActiveTab('ritual')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'ritual' ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <Sparkles size={16} /> Tägliches Ritual
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'klima'}
            onClick={() => setActiveTab('klima')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'klima' ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <Activity size={16} /> Klima-Radar
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'barometer'}
            onClick={() => setActiveTab('barometer')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'barometer' ? "bg-rose-50 text-rose-700 shadow-sm border border-rose-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <Users size={16} /> Klassen-Barometer
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'spiele'}
            onClick={() => setActiveTab('spiele')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'spiele' ? "bg-emerald-50 text-emerald-700 shadow-sm border border-emerald-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <Flame size={16} /> Team-Booster (Spiele)
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'vertrag'}
            onClick={() => setActiveTab('vertrag')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'vertrag' ? "bg-purple-50 text-purple-700 shadow-sm border border-purple-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <ShieldCheck size={16} /> Klassen-Vertrag
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'klassenrat'}
            onClick={() => setActiveTab('klassenrat')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'klassenrat' ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <MessageSquare size={16} /> Klassenrat & Briefkasten
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'tagebuch'}
            onClick={() => setActiveTab('tagebuch')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'tagebuch' ? "bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <BookOpen size={16} /> Pädagogisches Tagebuch
          </button>
          <button 
            type="button"
            aria-pressed={activeTab === 'klassenglas'}
            onClick={() => setActiveTab('klassenglas')}
            className={"px-3 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 " + (activeTab === 'klassenglas' ? "bg-amber-50 text-amber-700 shadow-sm border border-amber-100" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700")}
          >
            <Trophy size={16} /> Klassenglas & Missionen
          </button>
        </div>

        {/* --- TÄGLICHES RITUAL TAB --- */}
        {activeTab === 'ritual' && (
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            {/* Step Navigation/Status Indicator */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-none">Morgenkreis & Tägliches Ritual</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Startet den Schultag als starkes Team</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { step: 1, label: 'Energie-Check' },
                  { step: 2, label: 'Tages-Impuls' },
                  { step: 3, label: 'Atempause' },
                  { step: 4, label: 'Belohnung' }
                ].map((s) => (
                  <React.Fragment key={s.step}>
                    {s.step > 1 && (
                      <div className={`h-0.5 w-6 md:w-10 rounded ${ritualStep >= s.step ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                    )}
                    <button
                      type="button"
                      aria-current={ritualStep === s.step ? 'step' : undefined}
                      onClick={() => {
                        if (s.step === 1 || (s.step === 2 && ritualMood) || (s.step === 3 && ritualMood) || (s.step === 4 && ritualMood)) {
                          setRitualStep(s.step);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                        ritualStep === s.step 
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20' 
                          : ritualStep > s.step 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center text-[0.625rem]">
                        {ritualStep > s.step ? "✓" : s.step}
                      </span>
                      <span className="hidden sm:inline">{s.label}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Step Content Arena */}
            {ritualStep === 1 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6">
                <div className="text-center max-w-md mx-auto">
                  <span className="text-3xl">📊</span>
                  <h3 className="text-xl font-black text-slate-800 mt-2">Wie fühlt sich die Klasse heute?</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                    Frage die Kinder nach ihrer Stimmung und wählt gemeinsam das passende Symbol aus.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto w-full">
                  {(Object.keys(MOODS_META) as Array<keyof typeof MOODS_META>).map((key) => {
                    const meta = MOODS_META[key];
                    const isSelected = ritualMood === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setRitualMood(key);
                          // Auto save to history to keep logs accurate!
                          const newLog = {
                            id: 'baro-' + Date.now(),
                            date: new Date().toISOString(),
                            mood: key,
                            note: 'Eingeloggt im Täglichen Ritual'
                          };
                          setBarometerHistory(prev => [newLog, ...prev]);
                          localStorage.setItem('barometer_history_v1', JSON.stringify([newLog, ...barometerHistory]));
                          
                          // play bubble pop sound
                          try {
                            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                            if (AudioContext) {
                              const ctx = new AudioContext();
                              const osc = ctx.createOscillator();
                              const gain = ctx.createGain();
                              osc.connect(gain);
                              gain.connect(ctx.destination);
                              osc.frequency.setValueAtTime(350, ctx.currentTime);
                              gain.gain.setValueAtTime(0.08, ctx.currentTime);
                              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                              osc.start();
                              osc.stop(ctx.currentTime + 0.1);
                            }
                          } catch (e) {}
                        }}
                        className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 relative ${
                          isSelected 
                            ? `${meta.color} scale-102 ring-4 ring-indigo-500/10` 
                            : 'border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white text-slate-600'
                        }`}
                      >
                        <span className="text-4xl">{meta.emoji}</span>
                        <span className="text-xs font-black tracking-wide">{meta.label}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-indigo-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {ritualMood && (
                  <div className="max-w-xl mx-auto w-full p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex gap-3 animate-fade-in items-start mt-2">
                    <Lightbulb size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-500 block">Pädagogische Empfehlung</span>
                      <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-0.5">
                        {ritualMood === 'motiviert' && "Super! Ein motivierter Start ist genial für fordernde Aufgaben, Partnerprojekte oder das Lösen von Klassen-Missionen."}
                        {ritualMood === 'muede' && "Sanfte Einstiege sind jetzt wichtig. Beginnt mit dem gemeinsamen Summen (Klassen-Konzert) oder einer Dehnübung."}
                        {ritualMood === 'unruhig' && "Macht nachher unbedingt die 1-minütige Atempause mit der Klangschale. Das erdet die Kinder spürbar."}
                        {ritualMood === 'kooperativ' && "Hervorragende Voraussetzung für Teamaufgaben. Macht euch gegenseitig heute Komplimente!"}
                        {ritualMood === 'frustriert' && "Sprecht kurz darüber, bevor ihr startet: 'Gibt es etwas, das uns gerade bedrückt?'"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    onClick={() => setRitualStep(2)}
                    disabled={!ritualMood}
                    className={`px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide shadow-sm transition-all active:scale-95 flex items-center gap-2 ${
                      ritualMood 
                        ? 'bg-indigo-600 text-white hover:bg-indigo-500 cursor-pointer shadow-md shadow-indigo-600/20' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    Weiter zu Schritt 2 <Check size={16} />
                  </button>
                </div>
              </div>
            )}

            {ritualStep === 2 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6 animate-fade-in">
                <div className="text-center max-w-md mx-auto">
                  <span className="text-3xl">🎯</span>
                  <h3 className="text-xl font-black text-slate-800 mt-2">Unser Verbindungs-Impuls</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                    Diese kleine soziale Mission stärkt das WIR-Gefühl im Laufe des Tages. Besprecht sie kurz mit der Klasse.
                  </p>
                </div>

                <div className="max-w-xl mx-auto w-full p-8 bg-gradient-to-tr from-amber-50/40 to-orange-50/40 border-2 border-amber-200 rounded-3xl flex flex-col gap-4 text-center items-center justify-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[0.625rem] font-black uppercase tracking-widest text-amber-600/60 bg-amber-100/50 px-2.5 py-1 rounded-full">
                    Aktion des Tages
                  </div>
                  <span className="text-3xl">🤝</span>
                  <p className="text-base font-bold text-amber-950 leading-relaxed max-w-[420px]">
                    "{appreciationPrompt}"
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                  <button
                    type="button"
                    onClick={rollAppreciation}
                    className="px-6 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-2"
                  >
                    🎲 Anderen Impuls würfeln
                  </button>
                  <button
                    type="button"
                    onClick={() => setRitualStep(3)}
                    className="px-8 py-3.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-black text-sm tracking-wide shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    Verstanden, weiter zu Schritt 3 <Check size={16} />
                  </button>
                </div>
              </div>
            )}

            {ritualStep === 3 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6 animate-fade-in">
                <div className="text-center max-w-md mx-auto">
                  <span className="text-3xl">🧘</span>
                  <h3 className="text-xl font-black text-slate-800 mt-2">1 Minute Atempause</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                    Kommt gemeinsam zur Ruhe. Startet die Klangschale und folgt dem kreisförmigen Atem-Takt.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center py-6 gap-6">
                  {/* Breathing Circle Container */}
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    {/* Outer Breathing Pulse Halo */}
                    <div 
                      className={`absolute inset-0 rounded-full bg-indigo-400/10 transition-all duration-[4000ms] ease-in-out ${
                        isBreathingRunning 
                          ? breathingPhase === 'inhale' ? 'scale-110 opacity-60 bg-indigo-400/20' : 'scale-90 opacity-20 bg-rose-400/10'
                          : 'scale-100 opacity-40'
                      }`}
                    />
                    
                    {/* Core Breathing Bubble */}
                    <div 
                      className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-[4000ms] ease-in-out relative border-4 ${
                        isBreathingRunning
                          ? breathingPhase === 'inhale' 
                            ? 'bg-gradient-to-tr from-indigo-50 to-indigo-100 border-indigo-400 text-indigo-800 scale-105' 
                            : 'bg-gradient-to-tr from-rose-50 to-rose-100 border-rose-300 text-rose-800 scale-95'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-3xl mb-1">
                        {isBreathingRunning 
                          ? breathingPhase === 'inhale' ? '🌌' : '🍃'
                          : '🔔'
                        }
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-center">
                        {isBreathingRunning 
                          ? breathingPhase === 'inhale' ? 'Einatmen' : 'Ausatmen'
                          : 'Bereit?'
                        }
                      </span>
                      {isBreathingRunning && (
                        <span className="text-[0.625rem] font-bold text-slate-400 mt-1">Spreizung im Takt</span>
                      )}
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div className="text-center">
                    <div className="text-3xl font-mono font-black text-slate-800 leading-none mb-1">
                      00:{breathingSeconds.toString().padStart(2, '0')}
                    </div>
                    <p className="text-[0.6875rem] font-bold text-slate-400 uppercase tracking-wider">
                      {isBreathingRunning ? "Atem-Timer läuft" : "Ruhe-Übung bereit"}
                    </p>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isBreathingRunning) {
                          playKlangschale();
                          setIsBreathingRunning(true);
                        } else {
                          setIsBreathingRunning(false);
                        }
                      }}
                      className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                        isBreathingRunning
                          ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm shadow-rose-500/20'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/25'
                      }`}
                    >
                      {isBreathingRunning ? <Pause size={14} /> : <Play size={14} />}
                      {isBreathingRunning ? "Pause" : "Gong & Starten"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsBreathingRunning(false);
                        setBreathingSeconds(60);
                        setBreathingPhase('inhale');
                      }}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-bold transition-all"
                      title="Zurücksetzen"
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-center border-t border-slate-100 pt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBreathingRunning(false);
                      setRitualStep(4);
                    }}
                    className="px-8 py-3.5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 font-black text-sm tracking-wide shadow-sm transition-all active:scale-95 flex items-center gap-2"
                  >
                    Weiter zu Schritt 4 <Check size={16} />
                  </button>
                </div>
              </div>
            )}

            {ritualStep === 4 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6 animate-fade-in text-center max-w-xl mx-auto">
                <div className="max-w-md mx-auto">
                  <span className="text-4xl">💎</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-2">Klassen-Belohnung!</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">
                    Ihr habt das tägliche Ritual erfolgreich gemeistert. Lass ein Kind nach vorne kommen, um die Belohnungs-Murmel ins Klassenglas zu werfen!
                  </p>
                </div>

                <div className="py-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setApp(p => ({
                        ...p,
                        klassenglas_count: Math.min((p.klassenglas_ziel || 100), (p.klassenglas_count || 0) + 1)
                      }));
                      setRitualCompleted(true);
                      setRitualStep(5);
                      
                      confetti({
                        particleCount: 150,
                        spread: 85,
                        origin: { y: 0.6 }
                      });
                      
                      try {
                        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                        if (AudioContext) {
                          const ctx = new AudioContext();
                          const now = ctx.currentTime;
                          [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                            gain.gain.setValueAtTime(0.08, now + idx * 0.12);
                            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.3);
                            osc.start(now + idx * 0.12);
                            osc.stop(now + idx * 0.12 + 0.3);
                          });
                        }
                      } catch (e) {}
                    }}
                    className="w-40 h-40 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-200 border-8 border-white shadow-[0_20px_40px_rgba(245,158,11,0.3)] hover:scale-105 active:scale-95 transition-all text-6xl flex items-center justify-center animate-pulse cursor-pointer"
                    title="Murmel einwerfen!"
                  >
                    💎
                  </button>
                </div>

                <p className="text-xs font-black text-amber-600 uppercase tracking-widest">
                  Klickt auf die Murmel, um sie einzuwerfen
                </p>
              </div>
            )}

            {ritualStep === 5 && (
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6 animate-fade-in text-center max-w-xl mx-auto">
                <div>
                  <span className="text-5xl">🎉</span>
                  <h3 className="text-2xl font-black text-slate-800 mt-4">Wunderbar gemacht!</h3>
                  <p className="text-sm font-semibold text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                    Das tägliche Ritual ist abgeschlossen. Die Klassen-Stimmung ist eingeloggt, die Tagesaufgabe besprochen und eure Lungen sind voller frischer Energie. 
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-2xl text-xs font-black uppercase tracking-widest">
                    ✓ +1 Murmel im Klassenglas ({app.klassenglas_count || 0}/{app.klassenglas_ziel || 100})
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRitualStep(1);
                      setRitualMood(null);
                      setBreathingSeconds(60);
                      setIsBreathingRunning(false);
                      setRitualCompleted(false);
                    }}
                    className="px-6 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
                  >
                    Ritual zurücksetzen
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('klassenglas')}
                    className="px-8 py-3.5 bg-indigo-600 text-white hover:bg-indigo-500 font-black text-sm tracking-wide rounded-2xl shadow-sm transition-all active:scale-95"
                  >
                    Zum Klassenglas wechseln
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- KLIMA RADAR TAB --- */}
        {activeTab === 'klima' && (
          <div className="flex flex-col gap-6 w-full animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Insight Card */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col lg:col-span-1 border-t-4 border-t-indigo-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Lightbulb size={16} />
                    </div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Micro-Intervention</h2>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-center gap-3">
                  <h3 className="text-[1.125rem] font-black text-indigo-900 leading-snug">{microIntervention.title}</h3>
                  <p className="text-[0.875rem] font-medium text-slate-700 leading-relaxed">
                    {microIntervention.desc}
                  </p>
                  <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3">
                    <BookOpen size={16} className="text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-[0.75rem] font-medium text-slate-500 italic leading-snug">
                      {microIntervention.study}
                    </p>
                  </div>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ergebnis-Profil (Gesamt)</span>
                    </div>
                    <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100">
                       <div className="bg-emerald-500 h-full rounded-full transition-all" style={{width: `${Math.max(10, (climateLog.filter(l => l.type==="positive").length / Math.max(1, climateLog.length)) * 100)}%`}}></div>
                       <div className="bg-rose-400 h-full rounded-full transition-all" style={{width: `${Math.max(10, (climateLog.filter(l => l.type==="challenge").length / Math.max(1, climateLog.length)) * 100)}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col lg:col-span-2">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Klima-Trend (14 Tage)</h2>
                </div>
                <div className="flex-1 min-h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dx={-10} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '14px' }}
                      />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={{r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 3}} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Quick Entry */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <MessageSquare className="w-48 h-48" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Pädagogische Reflexion</h2>
              <form onSubmit={addLog} className="relative z-10 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                <div className="flex bg-slate-100 p-1 rounded-2xl w-fit shrink-0">
                  <button type="button" aria-pressed={newLogType === 'positive'} onClick={()=>setNewLogType('positive')} className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${newLogType === 'positive' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>
                     <Smile size={18} /> Positiv
                  </button>
                  <button type="button" aria-pressed={newLogType === 'challenge'} onClick={()=>setNewLogType('challenge')} className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all ${newLogType === 'challenge' ? 'bg-white shadow-sm text-rose-600' : 'text-slate-500 hover:text-slate-700'}`}>
                     <ShieldAlert size={18} /> Herausforderung
                  </button>
                </div>
                <input 
                  type="text" 
                  value={newLogText}
                  onChange={e=>setNewLogText(e.target.value)}
                  aria-label="Pädagogische Beobachtung"
                  placeholder={newLogType === 'positive' ? "Was ist heute gut gelungen? (Positiver Eintrag)" : "Welche Situation war herausfordernd? (Kein Einfluss auf Noten)"}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all min-w-[200px]"
                />
                <button type="submit" className={`px-6 py-3 rounded-2xl font-black text-white shadow-sm hover:shadow-md transition-all active:scale-95 whitespace-nowrap ${newLogType==='positive' ? 'bg-emerald-500 hover:bg-emerald-600 border border-emerald-600' : 'bg-rose-500 hover:bg-rose-600 border border-rose-600'}`}>
                  Notieren
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- BAROMETER TAB --- */}
        {activeTab === 'barometer' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in w-full">
            
            {/* Left/Middle Column: Stimmungs-Radar */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm lg:col-span-2 flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Users size={22} className="text-rose-500" />
                  Wie geht's uns heute? (Stimmungs-Check)
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Ermittle das kollektive Energie- und Gefühlslevel deiner Klasse, um den Schultag optimal zu rhythmisieren.
                </p>
              </div>

              {/* Mood Choices */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-2">
                {(Object.keys(MOODS_META) as Array<keyof typeof MOODS_META>).map((moodKey) => {
                  const meta = MOODS_META[moodKey];
                  const isSelected = barometerMood === moodKey;
                  return (
                    <button
                      key={moodKey}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setBarometerMood(moodKey);
                        try {
                          // Play soft bubble pop sound
                          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                          if (AudioContext) {
                            const ctx = new AudioContext();
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.frequency.setValueAtTime(300 + Math.random() * 200, ctx.currentTime);
                            gain.gain.setValueAtTime(0.08, ctx.currentTime);
                            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                            osc.start();
                            osc.stop(ctx.currentTime + 0.08);
                          }
                        } catch (e) {}
                      }}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2 relative overflow-hidden ${
                        isSelected 
                          ? `${meta.color} scale-102 ring-4 ring-rose-500/10` 
                          : 'border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-slate-600'
                      }`}
                    >
                      <span className="text-3xl filter drop-shadow-sm transition-transform group-hover:scale-110">{meta.emoji}</span>
                      <span className="text-xs font-black tracking-wide">{meta.label}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Pedagogical Tip Box (Dynamic) */}
              {barometerMood && (
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 flex gap-4 animate-fade-in items-start">
                  <div className="p-2.5 bg-white rounded-xl text-amber-500 shadow-sm shrink-0">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Pädagogische Empfehlung für "{MOODS_META[barometerMood].label}"</span>
                    <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                      {barometerMood === 'motiviert' && "Perfekte Zeit für anspruchsvolle Lerninhalte, Partnerarbeiten oder das Vorantreiben eurer aktiven Klassen-Missionen!"}
                      {barometerMood === 'muede' && "Führe jetzt ein kurzes Spiel im Team-Booster-Tab durch (z.B. 'Flüster-Post mit Klatschen') oder nutze das Klassen-Konzert zur sanften Reaktivierung."}
                      {barometerMood === 'unruhig' && "Nutze den 'Klangschalen-Impuls' oder den 'lautlosen Turmbau' (im Team-Booster), um die Klasse wieder sanft zur Ruhe zu führen."}
                      {barometerMood === 'kooperativ' && "Der ideale Tag für 'Der wertschätzende Kreis'! Lasst euch gegenseitig spüren, wie wichtig das Team ist und teilt Komplimente."}
                      {barometerMood === 'frustriert' && "Zeit für eine kurze Blitzlicht-Reflexion. Besprecht kurz gemeinsam, was die Klasse blockiert oder frustriert, bevor es weitergeht."}
                    </p>
                  </div>
                </div>
              )}

              {/* Form Input */}
              <div className="flex flex-col gap-2 mt-2">
                <label htmlFor="barometer-note" className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Anmerkungen oder Beobachtungen (optional)</label>
                <textarea
                  id="barometer-note"
                  value={barometerNote}
                  onChange={(e) => setBarometerNote(e.target.value)}
                  placeholder="z.B. Einige Kinder hatten heute eine unruhige Pause; Stimmung ist nach dem Wochenstart leicht träge..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:bg-white transition-all h-24 resize-none"
                />
              </div>

              {barometerStatus && (
                <div className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold animate-fade-in">
                  ✓ {barometerStatus}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveBarometer}
                disabled={!barometerMood}
                className={`py-3.5 px-6 rounded-2xl font-black text-white text-sm tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 text-center ${
                  barometerMood 
                    ? 'bg-rose-500 hover:bg-rose-600 border border-rose-600 cursor-pointer' 
                    : 'bg-slate-200 border border-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                Stimmungsbild sichern
              </button>
            </div>

            {/* Right Column: Klangschale & Verlauf */}
            <div className="flex flex-col gap-6">
              
              {/* Tibetan Singing Bowl / Raum-Harmonizer */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <Volume2 className="w-64 h-64 text-indigo-500" />
                </div>
                
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Raum-Harmonizer</h3>
                <p className="text-xs font-bold text-slate-400 max-w-[240px] leading-relaxed mb-6">
                  Spiele einen beruhigenden Klangschalen-Gong, um die Klasse augenblicklich zu sammeln und zu fokussieren.
                </p>

                {/* Circular Bell Visualizer */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* Ripple Ring 1 */}
                  {isChimePlaying && (
                    <div 
                      className="absolute inset-0 rounded-full border border-indigo-400/30 animate-ping" 
                      style={{ animationDuration: '3s' }}
                    />
                  )}
                  {/* Ripple Ring 2 */}
                  {isChimePlaying && (
                    <div 
                      className="absolute inset-4 rounded-full border border-rose-400/20 animate-ping" 
                      style={{ animationDuration: '4s', animationDelay: '0.8s' }}
                    />
                  )}
                  
                  {/* Main Interactive Button */}
                  <button
                    type="button"
                    onClick={playKlangschale}
                    className={`w-32 h-32 rounded-full flex flex-col items-center justify-center gap-1 shadow-md hover:shadow-xl transition-all border-4 relative overflow-hidden active:scale-95 ${
                      isChimePlaying 
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-600 scale-102' 
                        : 'bg-gradient-to-tr from-slate-50 to-slate-100 border-slate-200 text-slate-600 hover:border-indigo-200'
                    }`}
                  >
                    {/* Progress Fill Indicator */}
                    <div 
                      className="absolute bottom-0 left-0 right-0 bg-indigo-500/10 pointer-events-none"
                      style={{ height: `${chimeProgress}%` }}
                    />
                    
                    <div className={`transition-transform duration-500 ${isChimePlaying ? 'scale-125 rotate-12' : 'group-hover:scale-110'}`}>
                      🔔
                    </div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest mt-1">
                      {isChimePlaying ? "Schwingt..." : "Anschlagen"}
                    </span>
                  </button>
                </div>

                <div className="mt-6 p-3 bg-indigo-50/50 border border-indigo-100/30 rounded-xl w-full">
                  <p className="text-[0.75rem] font-medium text-indigo-900 leading-snug">
                    Synthetische tibetische Klangschale – moduliert reine, warme Obertöne direkt im Browser.
                  </p>
                </div>
              </div>

              {/* Barometer History List */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex-1">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                  <span>Stimmungsverlauf</span>
                  <button 
                    type="button"
                    onClick={() => {
                      if (confirm("Möchtest du den Verlauf wirklich leeren?")) {
                        setBarometerHistory([]);
                        localStorage.setItem('barometer_history_v1', JSON.stringify([]));
                      }
                    }}
                    className="text-[0.6875rem] font-black uppercase text-rose-500 hover:underline"
                  >
                    Leeren
                  </button>
                </h3>
                
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {barometerHistory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Noch keine historischen Einträge.</p>
                  ) : (
                    barometerHistory.map((item: any) => {
                      const moodMeta = MOODS_META[item.mood as keyof typeof MOODS_META];
                      return (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                          <span className="text-xl shrink-0 mt-0.5">{moodMeta?.emoji || '🚀'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-black text-slate-700">{moodMeta?.label || item.mood}</span>
                              <span className="text-[0.625rem] font-bold text-slate-400 uppercase">
                                {new Date(item.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}, {new Date(item.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {item.note && (
                              <p className="text-xs text-slate-500 mt-1 truncate font-medium" title={item.note}>
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* --- TEAM BOOSTER (SPIELE) TAB --- */}
        {activeTab === 'spiele' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in w-full">
            
            {/* Left Column: Game List Selector */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-1">Spiel-Bibliothek</h3>
                <p className="text-xs font-bold text-slate-400">Wähle ein schnelles Aktivierungs- oder Beruhigungsspiel.</p>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {TEAM_GAMES.map((game) => {
                  const isSelected = selectedGameId === game.id;
                  let catColor = "bg-indigo-50 text-indigo-700";
                  if (game.category.includes("Ruhe")) catColor = "bg-purple-50 text-purple-700 border-purple-100";
                  if (game.category.includes("Team")) catColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (game.category.includes("Empathie")) catColor = "bg-rose-50 text-rose-700 border-rose-100";
                  if (game.category.includes("Vertrauen")) catColor = "bg-amber-50 text-amber-700 border-amber-100";
                  
                  return (
                    <button
                      type="button"
                      key={game.id}
                      onClick={() => setSelectedGameId(game.id)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all flex flex-col text-left gap-2 relative ${
                        isSelected 
                          ? 'bg-emerald-50/20 border-emerald-500 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1 w-full">
                        <span className={`px-2 py-0.5 rounded-lg text-[0.625rem] font-black uppercase tracking-wider border ${catColor}`}>
                          {game.category}
                        </span>
                        <span className="text-[0.625rem] font-black text-slate-400 flex items-center gap-1 whitespace-nowrap">
                          <Clock size={10} /> {game.duration}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-[0.9375rem] leading-snug">{game.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">{game.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Middle/Right Column: Selected Active Game Arena */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Active Game Card Details */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                  <Flame className="w-64 h-64 text-emerald-500" />
                </div>

                <div className="flex justify-between items-start gap-4 z-10 flex-wrap">
                  <div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 block mb-1">Aktiver Team-Booster</span>
                    <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">{activeGame.title}</h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">Ziel: {activeGame.goal}</p>
                  </div>
                  
                  {/* Interactive Timer Widget */}
                  <div className="bg-slate-50 border border-slate-100 p-3 px-5 rounded-2xl text-center min-w-[120px]">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block mb-1">Spiel-Timer</span>
                    <div className="text-2xl font-mono font-black text-slate-800 leading-none tracking-tight mb-2">
                      {Math.floor(gameTimer / 60).toString().padStart(2, '0')}:{(gameTimer % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="flex gap-1 justify-center">
                      <button
                        type="button"
                        onClick={() => setIsGameTimerRunning(!isGameTimerRunning)}
                        className={`px-3 py-1 rounded-lg text-[0.6875rem] font-black uppercase tracking-wide transition-colors ${
                          isGameTimerRunning 
                            ? 'bg-rose-500 text-white hover:bg-rose-600' 
                            : 'bg-emerald-500 text-white hover:bg-emerald-600'
                        }`}
                      >
                        {isGameTimerRunning ? "Pause" : "Start"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const mins = parseInt(activeGame.duration) || 5;
                          setGameTimer(mins * 60);
                          setIsGameTimerRunning(false);
                        }}
                        className="p-1 px-2 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg text-[0.6875rem]"
                        title="Zurücksetzen"
                      >
                        <RotateCcw size={12} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progressive Instructions Checklist */}
                <div className="flex flex-col gap-3.5 mt-2 z-10">
                  <h4 className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 mb-1">Ablauf & Anleitung</h4>
                  <div className="space-y-3">
                    {activeGame.instructions.map((step, idx) => {
                      const isChecked = !!checkedSteps[`${activeGame.id}_${idx}`];
                      return (
                        <div 
                          key={idx} 
                          onClick={() => toggleStep(activeGame.id, idx)}
                          className={`p-4 rounded-xl border flex gap-3 cursor-pointer transition-all active:scale-99 ${
                            isChecked 
                              ? 'bg-slate-50/50 border-slate-100 text-slate-400 line-through border-dashed' 
                              : 'bg-white border-slate-150 text-slate-700 hover:bg-slate-50/30'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span className="text-[0.875rem] font-semibold leading-snug">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips Box */}
                <div className="p-4 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl flex gap-3 mt-2 z-10">
                  <Lightbulb size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-700 block">Pädagogischer Tipp</span>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5 leading-relaxed italic">
                      "{activeGame.tips}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Appreciation Generator Module */}
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                  <Sparkles className="w-64 h-64 text-amber-500" />
                </div>

                <div className="flex flex-col gap-1 z-10">
                  <span className="text-[0.625rem] font-black uppercase tracking-widest text-amber-600">Komplimente-Karussell (Wertschätzung)</span>
                  <h3 className="text-lg font-black text-slate-800">Achtsamkeits-Impuls des Tages</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">
                    Kleine Impulse für ein starkes Miteinander. Integriere diesen Auftrag spielerisch im Tagesverlauf oder am Ende einer Stunde.
                  </p>
                </div>

                <div className="p-6 bg-gradient-to-tr from-amber-50/30 to-orange-50/30 border border-amber-100 rounded-2xl flex flex-col gap-4 relative z-10 text-center items-center justify-center min-h-[100px] shadow-inner">
                  <span className="text-2xl">🤝</span>
                  <p className="text-[0.9375rem] font-bold text-amber-900 leading-relaxed max-w-[480px]">
                    "{appreciationPrompt}"
                  </p>
                </div>

                <button
                  type="button"
                  onClick={rollAppreciation}
                  className="py-3.5 px-6 rounded-2xl bg-amber-500 border border-amber-600 text-amber-950 hover:bg-amber-400 font-black text-sm tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95 text-center flex items-center justify-center gap-2"
                >
                  🎲 Neuen Impuls ausgeben
                </button>
              </div>

            </div>

          </div>
        )}

        {/* --- TAGEBUCH TAB --- */}
        {activeTab === 'tagebuch' && (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm animate-fade-in w-full min-h-[500px]">
             <div className="flex items-center justify-between mb-8">
               <h2 className="text-xl font-black text-slate-800 tracking-tight">Pädagogisches Tagebuch</h2>
               <div className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest">
                 {climateLog.length} Einträge im Schuljahr
               </div>
             </div>
             
             <div className="space-y-4">
               {climateLog.length === 0 ? (
                 <div className="text-center py-12 text-slate-400 font-medium">Noch keine Einträge vorhanden.</div>
               ) : (
                 climateLog.map(log => (
                   <div key={log.id} className={`p-5 rounded-2xl border ${log.type === 'positive' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'} flex gap-4`}>
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${log.type === 'positive' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500'}`}>
                       {log.type === 'positive' ? <Smile size={20} /> : <ShieldAlert size={20} />}
                     </div>
                     <div className="flex-1">
                       <p className="font-bold text-slate-800 text-[1rem] leading-snug">{log.text}</p>
                       <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{new Date(log.date).toLocaleString('de-DE', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} Uhr</p>
                     </div>
                     <button onClick={() => saveClimate(climateLog.filter(l => l.id !== log.id))} className="text-slate-300 hover:text-rose-500 transition-colors self-start p-1"><Minus size={16} /></button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {/* --- KLASSENGLAS & MISSIONEN TAB --- */}
        {activeTab === 'klassenglas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in w-full">
            
            {/* Das Glas */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                 <Trophy className="w-64 h-64" />
               </div>
               
               <div className="w-full text-center mb-6">
                 <h2 className="text-xl font-black text-slate-800 tracking-tight mb-2">Das Klassenglas</h2>
                 <p className="text-slate-500 font-medium text-sm max-w-[300px] mx-auto">Ein visueller Verstärker für gutes Verhalten. Füllt das Glas gemeinsam!</p>
               </div>
               
               {/* Ziel & Belohnung Inline-Editing */}
               <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8 relative z-10 flex flex-col gap-4">
                  <div className="flex flex-col">
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1">Gemeinsames Ziel (Belohnung)</label>
                    <input 
                      type="text" 
                      value={app.klassenglas_belohnung || ''} 
                      onChange={(e) => setApp(p => ({ ...p, klassenglas_belohnung: e.target.value }))}
                      placeholder="z.B. Pizzaparty, Hausaufgabenfrei..."
                      className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full placeholder:font-normal"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1">Anzahl Ziel-Murmeln</label>
                    <div className="flex gap-2 items-center w-full">
                      <button onClick={() => setApp(p => ({ ...p, klassenglas_ziel: Math.max(1, (p.klassenglas_ziel || 100) - 5) }))} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                        <Minus size={16} />
                      </button>
                      <input 
                        type="number" 
                        value={app.klassenglas_ziel || 100} 
                        onChange={(e) => setApp(p => ({ ...p, klassenglas_ziel: Math.max(1, parseInt(e.target.value) || 100) }))}
                        className="flex-1 min-w-0 bg-white border border-slate-200 rounded-xl px-3 py-2 text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button onClick={() => setApp(p => ({ ...p, klassenglas_ziel: (p.klassenglas_ziel || 100) + 5 }))} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors shrink-0">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
               </div>
               
               <div className="relative w-48 h-64 bg-slate-50 border-4 border-slate-200 rounded-b-[60px] rounded-t-[30px] overflow-hidden shadow-inner flex flex-col-reverse items-center justify-start pb-4">
                 {/* Progress fill */}
                 <div 
                   className="absolute bottom-0 left-0 right-0 bg-amber-400/20 transition-all duration-1000"
                   style={{ height: `${Math.min(100, ((app.klassenglas_count||0) / (app.klassenglas_ziel || 100)) * 100)}%` }}
                 />
                 
                 <div className="z-10 flex flex-wrap-reverse justify-center gap-1.5 p-4 content-start w-full">
                   {Array.from({length: Math.min(app.klassenglas_count||0, 100)}).map((_, i) => (
                     <div key={i} className={`${(app.klassenglas_count||0) > 50 ? 'text-sm' : 'text-xl'} animate-bounce-in`}>
                       {app.settings?.klassenglasIcon || "💎"}
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="mt-8 flex items-center gap-6 z-10 w-full max-w-[300px]">
                  <div className="flex-1 text-center bg-slate-50 rounded-2xl py-3 border border-slate-100 relative">
                    {app.klassenglas_count >= (app.klassenglas_ziel || 100) && (
                      <div className="absolute -top-3 -right-2">
                        <span className="flex h-5 w-5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 items-center justify-center text-[0.5rem] text-white font-black">✓</span>
                        </span>
                      </div>
                    )}
                    <div className="text-sm font-black uppercase text-slate-400 tracking-widest">Aktuell</div>
                    <div className="text-3xl font-black text-amber-500">{app.klassenglas_count||0}</div>
                  </div>
                  <div className="text-slate-300 font-black text-2xl">/</div>
                  <div className="flex-1 text-center bg-slate-50 rounded-2xl py-3 border border-slate-100">
                    <div className="text-sm font-black uppercase text-slate-400 tracking-widest">Ziel</div>
                    <div className="text-3xl font-black text-slate-700">{app.klassenglas_ziel || 100}</div>
                  </div>
               </div>

               {app.klassenglas_belohnung && (
                 <div className="mt-4 px-4 py-2 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl text-center w-full max-w-[300px] z-10">
                   <span className="text-[0.625rem] font-black uppercase tracking-widest text-amber-600 block mb-0.5">Wir sammeln für</span>
                   <span className="text-[0.875rem] font-bold text-amber-900 leading-snug">{app.klassenglas_belohnung}</span>
                 </div>
               )}

               <div className="mt-6 flex gap-3 w-full max-w-[300px] z-10">
                 <button 
                   onClick={() => setApp(p => ({ ...p, klassenglas_count: Math.max(0, (p.klassenglas_count||0) - 1)}))}
                   className="flex-1 py-3 bg-white border border-slate-200 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all font-black text-slate-600"
                 >
                   -1
                 </button>
                 <button 
                   onClick={() => {
                     setApp(p => ({ ...p, klassenglas_count: Math.min((p.klassenglas_ziel || 100), (p.klassenglas_count||0) + 1)}));
                     confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#fbbf24', '#f59e0b', '#10b981'] });
                   }}
                   className="flex-[2] py-3 bg-amber-500 border border-amber-600 text-amber-950 rounded-xl hover:bg-amber-400 transition-all font-black shadow-[0_10px_20px_rgba(245,158,11,0.2)] active:scale-95"
                 >
                   +1 Hinzufügen
                 </button>
               </div>
            </div>

            {/* Missionen */}
            <div className="flex flex-col gap-6">
               <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex-1">
                 <div className="flex items-center justify-between mb-6">
                   <h2 className="text-xl font-black text-slate-800 tracking-tight">Klassen-Missionen</h2>
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
                     className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2"
                   >
                     <Plus size={16} /> Neue Mission
                   </button>
                 </div>
                 
                 <div className="space-y-3">
                   {activeMissions.length === 0 ? (
                     <div className="text-center py-10 bg-slate-50 border border-slate-100 border-dashed rounded-2xl">
                       <ShieldCheck size={32} className="mx-auto text-slate-300 mb-3" />
                       <p className="text-slate-500 font-medium text-sm">Keine aktiven Missionen.</p>
                       <p className="text-slate-400 text-xs mt-1">Füge eine Mission hinzu, um die Klasse zu motivieren!</p>
                     </div>
                   ) : (
                     activeMissions.map((miss: any) => (
                       <div key={miss.id} className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 flex items-start gap-4 group">
                         <div className="text-3xl mt-1">{miss.title.split(' ')[0]}</div>
                         <div className="flex-1">
                           <h4 className="font-bold text-slate-800 text-[1rem] leading-snug">{miss.title.substring(miss.title.indexOf(' ') + 1)}</h4>
                           <p className="text-sm font-medium text-slate-600 mt-1">{miss.description}</p>
                           <div className="mt-3 flex items-center gap-2">
                             <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-black">+{miss.rewardClassMarbles} Belohnung</span>
                           </div>
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
                             confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
                           }}
                           className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 flex items-center justify-center transition-all shadow-sm shrink-0 self-center"
                           title="Mission abschließen"
                         >
                           <Check size={20} strokeWidth={3} />
                         </button>
                       </div>
                     ))
                   )}
                 </div>
               </div>
               
               {/* Abgeschlossene Missionen Sidebar */}
               <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                 <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Gemeinsam erreicht</h3>
                 <div className="flex flex-wrap gap-2">
                   {completedMissions.length === 0 ? (
                     <span className="text-sm text-slate-400 font-medium italic">Noch keine Erfolge verzeichnet.</span>
                   ) : (
                     completedMissions.map((miss: any) => (
                       <div key={miss.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-bold border border-emerald-100">
                         <span>{miss.title.split(' ')[0]}</span>
                         <span className="truncate max-w-[150px]">{miss.title.substring(miss.title.indexOf(' ') + 1)}</span>
                       </div>
                     ))
                   )}
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* --- KLASSEN-VERTRAG TAB --- */}
        {activeTab === 'vertrag' && (
          <div className="flex flex-col gap-6 w-full animate-fade-in animate-duration-200">
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <ShieldCheck size={22} className="text-purple-600" />
                  Unser Klassen-Vertrag & Verhaltenskodex
                </h2>
                <p className="text-sm font-medium text-slate-500 mt-1">
                  Gemeinsam erarbeitete Vereinbarungen für ein harmonisches Klassenzimmer. Reflektiert sie regelmäßig, um das Klassenglas zu füllen!
                </p>
              </div>
              
              <button
                type="button"
                onClick={() => setIsReflectingContracts(!isReflectingContracts)}
                className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2 ${
                  isReflectingContracts 
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                ⭐ {isReflectingContracts ? "Reflexion beenden" : "Klassen-Reflexion starten"}
              </button>
            </div>

            {/* Reflection Mode Alert */}
            {isReflectingContracts && (
              <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                <div className="flex gap-3 items-start">
                  <span className="text-2xl mt-0.5">🧐</span>
                  <div>
                    <h4 className="font-bold text-purple-900">Gemeinsame Reflexion läuft...</h4>
                    <p className="text-xs font-semibold text-purple-700 mt-0.5 leading-relaxed">
                      Sprecht über jede Regel. Wie gut klappt es heute? Klickt auf die Sterne (1-5) für jeden Vertrag. 
                      Erreicht im Durchschnitt mindestens 4.0 Sterne, um Belohnungen freizuschalten!
                    </p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    // Save ratings and reward
                    let sum = 0;
                    let count = 0;
                    const nextContracts = contracts.map(c => {
                      const rating = tempRatings[c.id] || c.stars || 5;
                      sum += rating;
                      count++;
                      return { ...c, stars: rating };
                    });
                    
                    const average = sum / (count || 1);
                    setContracts(nextContracts);
                    localStorage.setItem('class_contracts_v1', JSON.stringify(nextContracts));
                    
                    if (average >= 4.0) {
                      setApp((prev: any) => ({
                        ...prev,
                        klassenglas_count: Math.min((prev.klassenglas_ziel || 100), (prev.klassenglas_count || 0) + 5)
                      }));
                      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
                      alert(`🎉 Großartig! Ein Durchschnitt von ${average.toFixed(1)} Sternen! Die Klasse erhält +5 Murmeln für das Klassenglas!`);
                    } else {
                      alert(`👍 Danke für das ehrliche Feedback! Der Durchschnitt liegt bei ${average.toFixed(1)} Sternen. Dranbleiben – morgen schaffen wir die 4-Sterne-Marke!`);
                    }
                    setIsReflectingContracts(false);
                    setTempRatings({});
                  }}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md shadow-purple-600/20 active:scale-95 shrink-0"
                >
                  Reflexion speichern & auswerten
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contracts.map((c) => {
                const currentRating = isReflectingContracts ? (tempRatings[c.id] ?? c.stars ?? 5) : (c.stars ?? 5);
                return (
                  <div key={c.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative group">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <span className="text-3xl p-2.5 bg-slate-50 border border-slate-100 rounded-2xl group-hover:scale-115 transition-transform">{c.icon}</span>
                        <span className="text-[0.625rem] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">Aktiv</span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-[1.125rem] leading-tight">{c.rule}</h3>
                      <p className="text-xs font-semibold text-slate-400 mt-2 leading-relaxed">{c.description}</p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mt-5 flex flex-col gap-2">
                      <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Aktuelle Bewertung</span>
                      
                      <div className="flex gap-1.5 items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={!isReflectingContracts}
                            onClick={() => {
                              setTempRatings(prev => ({ ...prev, [c.id]: i + 1 }));
                              // play tick sound
                              try {
                                const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                                if (AudioContext) {
                                  const ctx = new AudioContext();
                                  const osc = ctx.createOscillator();
                                  const gain = ctx.createGain();
                                  osc.connect(gain);
                                  gain.connect(ctx.destination);
                                  osc.frequency.setValueAtTime(400 + (i * 100), ctx.currentTime);
                                  gain.gain.setValueAtTime(0.05, ctx.currentTime);
                                  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
                                  osc.start();
                                  osc.stop(ctx.currentTime + 0.08);
                                }
                              } catch (e) {}
                            }}
                            className={`text-xl transition-all ${isReflectingContracts ? 'cursor-pointer hover:scale-125' : 'cursor-default'} ${
                              i < currentRating ? 'text-amber-400 filter drop-shadow-sm' : 'text-slate-200'
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="text-xs font-black text-slate-500 ml-auto tabular-nums">{currentRating}/5</span>
                      </div>
                    </div>

                    {/* Delete button (only when not reflecting and custom) */}
                    {!isReflectingContracts && !['c1', 'c2', 'c3', 'c4'].includes(c.id) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Möchtest du diese Regel wirklich löschen?")) {
                            const filtered = contracts.filter(x => x.id !== c.id);
                            setContracts(filtered);
                            localStorage.setItem('class_contracts_v1', JSON.stringify(filtered));
                          }
                         }}
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                        title="Vertrag löschen"
                      >
                        <Minus size={14} />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add Contract Form Card */}
              <div className="bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                    <Plus size={16} className="text-slate-400" />
                    Einen neuen Vertrag schließen
                  </h3>
                  <p className="text-xs text-slate-400 font-semibold mt-1">
                    Ergänzt gemeinsam eine neue Vereinbarung, die euch im Alltag wichtig ist.
                  </p>
                  
                  <div className="space-y-3 mt-4">
                    <div className="flex gap-2">
                      <select
                        value={newRuleIcon}
                        onChange={(e) => setNewRuleIcon(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="💡">💡 Idea</option>
                        <option value="🤫">🤫 Silence</option>
                        <option value="🧹">🧹 Clean</option>
                        <option value="👂">👂 Listen</option>
                        <option value="🤝">🤝 Help</option>
                        <option value="🏃">🏃 Movement</option>
                        <option value="🎒">🎒 Schoolbag</option>
                        <option value="🌳">🌳 Nature</option>
                        <option value="🧩">🧩 Puzzle</option>
                        <option value="🎨">🎨 Art</option>
                      </select>
                      <input
                        type="text"
                        value={newRuleTitle}
                        onChange={(e) => setNewRuleTitle(e.target.value)}
                        placeholder="Name der Regel..."
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>
                    <textarea
                      value={newRuleDesc}
                      onChange={(e) => setNewRuleDesc(e.target.value)}
                      placeholder="Beschreibung des Ziels (z.B. Wie setzen wir das um?)..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 h-16 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!newRuleTitle.trim() || !newRuleDesc.trim()) {
                      alert("Bitte trage einen Namen und eine kurze Beschreibung ein.");
                      return;
                    }
                    const newRule = {
                      id: 'c-' + Date.now(),
                      rule: newRuleTitle.trim(),
                      icon: newRuleIcon,
                      description: newRuleDesc.trim(),
                      stars: 5,
                      status: 'aktiv'
                    };
                    const updated = [...contracts, newRule];
                    setContracts(updated);
                    localStorage.setItem('class_contracts_v1', JSON.stringify(updated));
                    setNewRuleTitle('');
                    setNewRuleDesc('');
                    setNewRuleIcon('💡');
                    
                    // Play spark chime
                    try {
                      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioContext) {
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
                        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5 slide
                        gain.gain.setValueAtTime(0.05, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.15);
                      }
                    } catch(e) {}
                  }}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all"
                >
                  Regel hinzufügen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- KLASSENRAT TAB --- */}
        {activeTab === 'klassenrat' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in w-full">
            
            {/* Linke Spalte: Der Briefkasten */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6 relative overflow-hidden">
              <div className="flex gap-3 items-center">
                <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl shadow-sm">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base leading-none">Klassen-Briefkasten</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Werft eure Zettel für den Klassenrat ein</p>
                </div>
              </div>

              {/* Decorative letter slot */}
              <div className="bg-slate-800 rounded-3xl p-6 border-4 border-slate-600 shadow-inner flex flex-col items-center justify-center gap-4 py-8 relative">
                <div className="w-full h-4 bg-slate-950 rounded-full shadow-inner border border-slate-700/50" />
                <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Briefschlitz (Anliegen einwerfen)</span>
                
                {briefkastenStage === 'submitting' && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3 animate-fade-in rounded-[20px]">
                    <div className="w-10 h-14 bg-white/95 rounded-lg shadow-lg border border-slate-300 flex flex-col justify-between p-2 animate-bounce">
                      <div className="w-6 h-1 bg-indigo-500 rounded" />
                      <div className="w-4 h-1 bg-slate-300 rounded" />
                    </div>
                    <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-200 animate-pulse">Zettel rutscht rein...</span>
                  </div>
                )}

                {briefkastenStage === 'success' && (
                  <div className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center gap-2 animate-fade-in rounded-[20px]">
                    <span className="text-3xl">📮</span>
                    <span className="text-[0.6875rem] font-black uppercase tracking-widest text-white">Eingeworfen! Danke!</span>
                    <span className="text-[10px] font-bold text-emerald-100">Dein Zettel liegt sicher im Briefkasten.</span>
                  </div>
                )}
              </div>

              {/* Inbox Note Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Zettel-Art</label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {[
                      { type: 'lob', label: '🌸 Lob & Dank', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                      { type: 'sorge', label: '⚠️ Problem', color: 'bg-rose-50 text-rose-700 border-rose-100' },
                      { type: 'idee', label: '💡 Idee / Vorschlag', color: 'bg-amber-50 text-amber-700 border-amber-100' },
                      { type: 'wunsch', label: '✨ Herzenswunsch', color: 'bg-purple-50 text-purple-700 border-purple-100' }
                    ].map((item) => (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setNoteType(item.type as any)}
                        className={`px-3 py-2 rounded-xl text-xs font-black border transition-all text-left ${
                          noteType === item.type 
                            ? `${item.color} ring-4 ring-orange-500/10 scale-102` 
                            : 'border-slate-100 bg-slate-50/50 hover:bg-slate-50 text-slate-500'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Von wem?</label>
                    <input
                      type="text"
                      value={noteFrom}
                      onChange={(e) => setNoteFrom(e.target.value)}
                      placeholder="z.B. Leo (oder leer lassen)"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Für wen?</label>
                    <input
                      type="text"
                      value={noteTo}
                      onChange={(e) => setNoteTo(e.target.value)}
                      placeholder="z.B. Ganze Klasse, Frau L."
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Dein Anliegen</label>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Was möchtest du sagen oder besprechen?..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-semibold text-slate-700 h-24 mt-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!noteContent.trim()) {
                      alert("Bitte trage den Inhalt deines Anliegens ein.");
                      return;
                    }
                    
                    // Trigger submission animation
                    setBriefkastenStage('submitting');
                    
                    // play slip chime sound
                    try {
                      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
                      if (AudioContext) {
                        const ctx = new AudioContext();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4
                        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6 slide
                        gain.gain.setValueAtTime(0.06, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.3);
                      }
                    } catch(e) {}

                    setTimeout(() => {
                      setBriefkastenStage('success');
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
                      setCouncilNotes(updated);
                      localStorage.setItem('council_notes_v1', JSON.stringify(updated));
                      
                      setNoteContent('');
                      setNoteFrom('');
                      setNoteTo('');
                      setNoteType('lob');
                      
                      setTimeout(() => {
                        setBriefkastenStage('idle');
                      }, 2000);
                    }, 1000);
                  }}
                  className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 border border-orange-600 text-white rounded-2xl font-black text-sm tracking-wide shadow-md shadow-orange-500/10 active:scale-95 transition-all cursor-pointer text-center"
                >
                  Zettel einwerfen 📮
                </button>
              </div>
            </div>

            {/* Rechte Spalte: Klassenrat Agenda / Briefkasten-Öffnung */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col gap-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-800 text-lg tracking-tight">Klassenrats-Agenda (Zettelbox)</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">Hier seht ihr alle eingeworfenen Briefe für die Wochen-Besprechung</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Möchtest du alle besprochenen oder alle Zettel wirklich leeren?")) {
                      setCouncilNotes([]);
                      localStorage.setItem('council_notes_v1', JSON.stringify([]));
                    }
                  }}
                  className="text-[0.625rem] font-black uppercase text-rose-500 hover:underline cursor-pointer"
                >
                  Box leeren
                </button>
              </div>

              {/* Visual Sticky Notes Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-2">
                {councilNotes.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-slate-50 border border-slate-100 border-dashed rounded-3xl flex flex-col items-center justify-center">
                    <span className="text-4xl mb-3">📬</span>
                    <p className="text-slate-500 font-bold text-sm">Der Briefkasten ist aktuell leer.</p>
                    <p className="text-slate-400 text-xs max-w-[220px] mx-auto mt-1">
                      Kinder können hier ihre Ideen, Sorgen oder Lobs für das Freitags-Meeting eintragen.
                    </p>
                  </div>
                ) : (
                  councilNotes.map((note) => {
                    // Determine colors based on note type
                    let noteStyle = 'bg-amber-50/60 border-amber-200 text-slate-800 shadow-amber-100/30';
                    let badgeStyle = 'bg-amber-100 text-amber-800 border-amber-200';
                    let titleEmoji = '💡';
                    
                    if (note.type === 'lob') {
                      noteStyle = 'bg-emerald-50/60 border-emerald-200 text-slate-800 shadow-emerald-100/30';
                      badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      titleEmoji = '🌸';
                    } else if (note.type === 'sorge') {
                      noteStyle = 'bg-rose-50/60 border-rose-200 text-slate-800 shadow-rose-100/30';
                      badgeStyle = 'bg-rose-100 text-rose-800 border-rose-200';
                      titleEmoji = '⚠️';
                    } else if (note.type === 'wunsch') {
                      noteStyle = 'bg-purple-50/60 border-purple-200 text-slate-800 shadow-purple-100/30';
                      badgeStyle = 'bg-purple-100 text-purple-800 border-purple-200';
                      titleEmoji = '✨';
                    }

                    return (
                      <div 
                        key={note.id} 
                        className={`p-5 rounded-2xl border-2 shadow-sm flex flex-col justify-between gap-4 relative transition-all duration-300 hover:scale-102 hover:shadow-md ${noteStyle} ${
                          note.status === 'done' ? 'opacity-40 grayscale scale-95' : ''
                        }`}
                      >
                        {/* Header */}
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 border rounded-full text-[0.5625rem] font-black uppercase tracking-wider ${badgeStyle}`}>
                              {titleEmoji} {note.type === 'lob' ? 'Lob & Dank' : note.type === 'sorge' ? 'Sorge / Problem' : note.type === 'wunsch' ? 'Wunsch' : 'Idee'}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {new Date(note.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs font-black text-slate-800 leading-none mb-1">
                            <span className="opacity-40">Von:</span> {note.from} <span className="opacity-40 ml-1">Für:</span> {note.to}
                          </p>

                          <p className="text-xs font-semibold text-slate-700 leading-relaxed mt-2.5 whitespace-pre-line border-t border-slate-900/5 pt-2.5">
                            "{note.content}"
                          </p>
                        </div>

                        {/* Action Footer */}
                        <div className="flex gap-2 border-t border-slate-900/5 pt-2.5 items-center justify-between">
                          {note.type === 'lob' && note.status !== 'done' ? (
                            <button
                              type="button"
                              onClick={() => {
                                // Reward marble and mark as done
                                setApp((prev: any) => ({
                                  ...prev,
                                  klassenglas_count: Math.min((prev.klassenglas_ziel || 100), (prev.klassenglas_count || 0) + 1)
                                }));
                                
                                const nextNotes = councilNotes.map(x => x.id === note.id ? { ...x, status: 'done' } : x);
                                setCouncilNotes(nextNotes);
                                localStorage.setItem('council_notes_v1', JSON.stringify(nextNotes));
                                
                                confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 }, colors: ['#fbbf24', '#f59e0b'] });
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-500 hover:text-white text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-1 transition-all cursor-pointer"
                              title="Loben & 1 Klassenglas-Murmel belohnen"
                            >
                              💎 +1 Murmel
                            </button>
                          ) : (
                            <div />
                          )}

                          {note.status !== 'done' ? (
                            <button
                              type="button"
                              onClick={() => {
                                const nextNotes = councilNotes.map(x => x.id === note.id ? { ...x, status: 'done' } : x);
                                setCouncilNotes(nextNotes);
                                localStorage.setItem('council_notes_v1', JSON.stringify(nextNotes));
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ml-auto cursor-pointer"
                            >
                              <Check size={10} strokeWidth={3} /> Besprochen
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const filtered = councilNotes.filter(x => x.id !== note.id);
                                setCouncilNotes(filtered);
                                localStorage.setItem('council_notes_v1', JSON.stringify(filtered));
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-rose-500 hover:underline ml-auto cursor-pointer"
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

      </div>
    </div>
  );
}
