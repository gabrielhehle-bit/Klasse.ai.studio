import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  GraduationCap, Calendar, Award, BookOpen, Clock, Users, Flame, Save, Edit2, 
  MapPin, Compass, Check, Trophy, Sparkles, Plus, Minus, Landmark, ClipboardList, RefreshCw, BarChart2,
  Trash2, Printer, Leaf, Heart, Monitor, ToggleLeft, ToggleRight
} from 'lucide-react';
import { motion } from 'motion/react';
import TeacherSelfCare from './TeacherSelfCare';
import { PET_BREEDS, AVAILABLE_ACCESSORIES } from './ClassPetWidget';
import { ClassPetCanvas } from './ClassPetCanvas';
import PlanungsStatistik from './PlanungsStatistik';

export default function LehrerProfilView() {
  const { app, setApp } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [useAutoStats, setUseAutoStats] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'selfcare' | 'classpet'>('stats');
  const [showDecretModal, setShowDecretModal] = useState(false);
  const [selectedTimelineYearKey, setSelectedTimelineYearKey] = useState<string | null>(null);
  const [timelineHighlightInput, setTimelineHighlightInput] = useState('');

  // Ecological calculator: worksheets from localStorage + digital materials count
  const worksheetsCount = useMemo(() => {
    try {
      const data = localStorage.getItem('school_worksheets');
      if (data) {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) ? parsed.length : 3;
      }
    } catch (e) {}
    return 3;
  }, []);

  const materialsCount = app.materialien?.length || 0;
  const totalDigitalFiles = worksheetsCount + materialsCount;
  const totalPaperSaved = totalDigitalFiles * (app.schueler?.length || 22);
  const treesSavedCount = Math.max(1, Math.floor(totalPaperSaved / 150));

  // Active profile with robust defaults
  const profile = useMemo(() => {
    return app.lehrerProfil || {
      schulstundenJaehrlich: 120,
      schularbeitenManuell: 4,
      testsManuell: 8,
      ausfluegeManuell: 3,
      name: "Maximilian Musterlehrer",
      schule: "Volksschule Musterstadt",
      motto: "Pädagogik mit Herz ❤️",
      gegruendetYear: "2018"
    };
  }, [app.lehrerProfil]);

  // Temporary state for the edit form
  const [editForm, setEditForm] = useState({
    name: profile.name || '',
    schule: profile.schule || '',
    motto: profile.motto || '',
    gegruendetYear: profile.gegruendetYear || '2018',
    schulstundenJaehrlich: profile.schulstundenJaehrlich || 120,
    schularbeitenManuell: profile.schularbeitenManuell || 4,
    testsManuell: profile.testsManuell || 8,
    ausfluegeManuell: profile.ausfluegeManuell || 3
  });

  const handleStartEdit = () => {
    setEditForm({
      name: profile.name || '',
      schule: profile.schule || '',
      motto: profile.motto || '',
      gegruendetYear: profile.gegruendetYear || '2018',
      schulstundenJaehrlich: profile.schulstundenJaehrlich || 120,
      schularbeitenManuell: profile.schularbeitenManuell || 4,
      testsManuell: profile.testsManuell || 8,
      ausfluegeManuell: profile.ausfluegeManuell || 3
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    setApp(prev => ({
      ...prev,
      lehrerProfil: {
        ...prev.lehrerProfil,
        name: editForm.name,
        schule: editForm.schule,
        motto: editForm.motto,
        gegruendetYear: editForm.gegruendetYear,
        schulstundenJaehrlich: Number(editForm.schulstundenJaehrlich) || 0,
        schularbeitenManuell: Number(editForm.schularbeitenManuell) || 0,
        testsManuell: Number(editForm.testsManuell) || 0,
        ausfluegeManuell: Number(editForm.ausfluegeManuell) || 0
      }
    }));
    setIsEditing(false);
  };

  // Quick increment/decrement helper functions for fields
  const adjustField = (field: 'schulstundenJaehrlich' | 'schularbeitenManuell' | 'testsManuell' | 'ausfluegeManuell', delta: number) => {
    if (isEditing) {
      setEditForm(prev => ({
        ...prev,
        [field]: Math.max(0, (Number(prev[field]) || 0) + delta)
      }));
    } else {
      setApp(prev => {
        const currentProf = prev.lehrerProfil || {
          schulstundenJaehrlich: 120,
          schularbeitenManuell: 4,
          testsManuell: 8,
          ausfluegeManuell: 3,
          name: "Maximilian Musterlehrer",
          schule: "Volksschule Musterstadt",
          motto: "Pädagogik mit Herz ❤️",
          gegruendetYear: "2018"
        };
        const updatedVal = Math.max(0, (Number(currentProf[field]) || 0) + delta);
        return {
          ...prev,
          lehrerProfil: {
            ...currentProf,
            [field]: updatedVal
          }
        };
      });
    }
  };

  const handleSaveTimelineHighlight = (key: string, text: string) => {
    setApp(prev => ({
      ...prev,
      lehrerProfil: {
        ...(prev.lehrerProfil || {}),
        timelineHighlights: {
          ...(prev.lehrerProfil?.timelineHighlights || {}),
          [key]: text
        }
      }
    }));
    setSelectedTimelineYearKey(null);
  };

  // --- AUTOMATIC DATABASE CALCULATIONS ENGINE ---
  const autoStats = useMemo(() => {
    // 1. Schulstunden-Dienstberechnung
    // Sum total lessons scheduled in app.stammplan per week
    let weeklyStammHours = 0;
    Object.values(app.stammplan || {}).forEach(dayMap => {
      if (dayMap && typeof dayMap === 'object') {
        Object.values(dayMap).forEach(fach => {
          if (typeof fach === 'string' && fach.trim() !== '') {
            weeklyStammHours++;
          }
        });
      }
    });

    const schoolWeeks = 38; // standard school weeks per year
    const stammHoursCalculatedYearly = weeklyStammHours * schoolWeeks;

    // Sum planned diary slots in app.wochenplanung across all weeks
    let plannedLessonsCount = 0;
    Object.values(app.wochenplanung || {}).forEach(weekPlan => {
      if (weekPlan && typeof weekPlan === 'object') {
        Object.values(weekPlan).forEach(dayPlan => {
          if (dayPlan && typeof dayPlan === 'object') {
            Object.values(dayPlan).forEach((lesson: any) => {
              if (lesson && (lesson.fach || lesson.inhalt || lesson.thema)) {
                plannedLessonsCount++;
              }
            });
          }
        });
      }
    });

    // Final stunden count: if they have a stammplan, use that. Otherwise fallback nicely to planned slots or profile default.
    const taughtHours = stammHoursCalculatedYearly > 0 
      ? stammHoursCalculatedYearly 
      : (plannedLessonsCount > 0 ? plannedLessonsCount : (profile.schulstundenJaehrlich || 120));

    // 2. Schularbeiten calculation
    // From Gradebook (app.noten): Find maximum grade indexes filled under "sa" array per student per subject
    let saFromGradebook = 0;
    const saSubjectSems = new Map<string, number>();
    const studentIds = Object.keys(app.noten || {});
    
    studentIds.forEach(studentId => {
      const subjectsOfStudent = app.noten[studentId] || {};
      Object.keys(subjectsOfStudent).forEach(subject => {
        const semestersOfSubject = subjectsOfStudent[subject] || {};
        Object.keys(semestersOfSubject).forEach(sem => {
          const data = (semestersOfSubject[sem] || {}) as any;
          const key = `${subject}-${sem}`;
          if (Array.isArray(data.sa)) {
            const filledCount = data.sa.filter(v => v !== null && v !== undefined && v !== '').length;
            const currentMax = saSubjectSems.get(key) || 0;
            if (filledCount > currentMax) {
              saSubjectSems.set(key, filledCount);
            }
          }
        });
      });
    });
    saSubjectSems.forEach(count => {
      saFromGradebook += count;
    });

    // From Wochenplanung (app.wochenplanung): count keywords matching "schularbeit"
    let saFromLessons = 0;
    Object.values(app.wochenplanung || {}).forEach(weekPlan => {
      if (weekPlan && typeof weekPlan === 'object') {
        Object.values(weekPlan).forEach(dayPlan => {
          if (dayPlan && typeof dayPlan === 'object') {
            Object.values(dayPlan).forEach((lesson: any) => {
              const str = `${lesson.fach || ""} ${lesson.inhalt || ""} ${lesson.thema || ""}`.toLowerCase();
              if (str.includes("schularbeit") || str.includes("sa-termin") || str.includes("m-sa ") || str.includes("d-sa ")) {
                saFromLessons++;
              }
            });
          }
        });
      }
    });

    const schularbeiten = Math.max(saFromGradebook, saFromLessons) || profile.schularbeitenManuell || 4;

    // 3. Tests calculation
    // From Gradebook (app.noten): count max filled index under "lzk" (Lernzielkontrolle / Test)
    let lzkFromGradebook = 0;
    const lzkSubjectSems = new Map<string, number>();

    studentIds.forEach(studentId => {
      const subjectsOfStudent = app.noten[studentId] || {};
      Object.keys(subjectsOfStudent).forEach(subject => {
        const semestersOfSubject = subjectsOfStudent[subject] || {};
        Object.keys(semestersOfSubject).forEach(sem => {
          const data = (semestersOfSubject[sem] || {}) as any;
          const key = `${subject}-${sem}`;
          if (Array.isArray(data.lzk)) {
            const filledCount = data.lzk.filter(v => v !== null && v !== undefined && v !== '').length;
            const currentMax = lzkSubjectSems.get(key) || 0;
            if (filledCount > currentMax) {
              lzkSubjectSems.set(key, filledCount);
            }
          }
        });
      });
    });
    lzkSubjectSems.forEach(count => {
      lzkFromGradebook += count;
    });

    // From Wochenplanung (app.wochenplanung): count keywords matching "test", "prüfung", "lzks", "ansage"
    let testsFromLessons = 0;
    Object.values(app.wochenplanung || {}).forEach(weekPlan => {
      if (weekPlan && typeof weekPlan === 'object') {
        Object.values(weekPlan).forEach(dayPlan => {
          if (dayPlan && typeof dayPlan === 'object') {
            Object.values(dayPlan).forEach((lesson: any) => {
              const str = `${lesson.fach || ""} ${lesson.inhalt || ""} ${lesson.thema || ""}`.toLowerCase();
              if (/test|prüfung|prüfung|lzks|ansage|wortdiktat/i.test(str)) {
                testsFromLessons++;
              }
            });
          }
        });
      }
    });

    const tests = Math.max(lzkFromGradebook, testsFromLessons) || profile.testsManuell || 8;

    // 4. Ausflüge / Wandertage calculation
    let outingsCount = 0;
    // Walk through Wochenplanung
    Object.values(app.wochenplanung || {}).forEach(weekPlan => {
      if (weekPlan && typeof weekPlan === 'object') {
        Object.values(weekPlan).forEach(dayPlan => {
          if (dayPlan && typeof dayPlan === 'object') {
            Object.values(dayPlan).forEach((lesson: any) => {
              const str = `${lesson.fach || ""} ${lesson.inhalt || ""} ${lesson.thema || ""}`.toLowerCase();
              if (/ausflug|wandertag|exkursion|theater|kinobesuch/i.test(str)) {
                outingsCount++;
              }
            });
          }
        });
      }
    });

    // Walk through class notes
    const classNotes = app.notizen || [];
    classNotes.forEach((note: any) => {
      if (note.inhalt) {
        const str = note.inhalt.toLowerCase();
        if (/ausflug|wandertag|exkursion|theater|kinobesuch/i.test(str)) {
          outingsCount++;
        }
      }
    });

    // Walk through sammlungen (money collections log)
    const sammlungenList = app.klassenkasse?.sammlungen || [];
    sammlungenList.forEach((sammlung: any) => {
      if (sammlung.titel) {
        const str = sammlung.titel.toLowerCase();
        if (/ausflug|wandertag|exkursion|theater|eintrittsgeld/i.test(str)) {
          outingsCount++;
        }
      }
    });

    const ausfluege = outingsCount || profile.ausfluegeManuell || 3;

    return {
      weeklyStammHours,
      stammHoursCalculatedYearly,
      plannedLessonsCount,
      taughtHours,
      
      saFromGradebook,
      saFromLessons,
      schularbeiten,

      lzkFromGradebook,
      testsFromLessons,
      tests,

      outingsCount,
      ausfluege
    };
  }, [app.stammplan, app.wochenplanung, app.noten, app.notizen, app.klassenkasse?.sammlungen, profile]);

  // Deciding which values to load for active display
  const finalCurrentStunden = useAutoStats ? autoStats.taughtHours : profile.schulstundenJaehrlich;
  const finalCurrentSchularbeiten = useAutoStats ? autoStats.schularbeiten : profile.schularbeitenManuell;
  const finalCurrentTests = useAutoStats ? autoStats.tests : profile.testsManuell;
  const finalCurrentAusfluege = useAutoStats ? autoStats.ausfluege : profile.ausfluegeManuell;

  // --- LIFETIME LEHRERSTATISTIK: INCLUDES INTEGRATED ARCHIVED CLASSES ---
  // Count current active students + sum of all individual student database items inside the archive file.
  const activeStudentsCount = app.schueler?.length || 0;
  const historicalStudents = app.historicalStudents || [];
  const historicalStudentsCount = historicalStudents.length;
  const lifetimeStudentsTotal = activeStudentsCount + historicalStudentsCount;

  // Derive unique archived classes from HISTORICAL_STUDENTS to build all-time summary
  const archivedClasses = useMemo(() => {
    const classMap = new Map<string, { year: string; className: string; count: number }>();
    historicalStudents.forEach(student => {
      const key = `${student.year}-${student.class}`;
      if (!classMap.has(key)) {
        classMap.set(key, { year: student.year, className: student.class, count: 1 });
      } else {
        const item = classMap.get(key)!;
        item.count += 1;
      }
    });
    return Array.from(classMap.values()).sort((a, b) => b.year.localeCompare(a.year));
  }, [historicalStudents]);

  const archivedClassesCount = archivedClasses.length; // usually 5
  
  // Total career duration
  const currentYear = new Date().getFullYear();
  const startYear = parseInt(profile.gegruendetYear || '2018') || 2018;
  const careerYears = Math.max(1, currentYear - startYear + 1);

  // Lifelong totals with historical calculations (Each archived year has default stats, combined with current dynamic auto/manual calculations)
  const averageHoursPerArchivedYear = 720; 
  const lifetimeSchulstundenTotal = (archivedClassesCount * averageHoursPerArchivedYear) + Number(finalCurrentStunden);
  const lifetimeSchularbeitenTotal = (archivedClassesCount * 4) + Number(finalCurrentSchularbeiten);
  const lifetimeTestsTotal = (archivedClassesCount * 8) + Number(finalCurrentTests);
  const lifetimeAusfluegeTotal = (archivedClassesCount * 3) + Number(finalCurrentAusfluege);

  // Lifetime homework logs and grades given estimated dynamically
  const estimatedHomeworkCorrected = lifetimeStudentsTotal * 38; 
  const estimatedGradesGiven = lifetimeStudentsTotal * 3 * 6;

  // Milestones configured from lifetime stats
  const badges = [
    {
      id: 'hrs-master',
      label: 'Stunden-Magnat',
      desc: 'Mehr als 2.500 Unterrichtsstunden abgehalten',
      icon: Clock,
      active: lifetimeSchulstundenTotal >= 2500
    },
    {
      id: 'class-collector',
      label: 'Jahrgangs-Hüter',
      desc: 'Mindestens 4 archivierte Schulklassen erfolgreich entlassen',
      icon: Landmark, 
      active: archivedClassesCount >= 4
    },
    {
      id: 'student-shepherd',
      label: 'Mentoren-Pionier',
      desc: 'Über 40 Schüler pädagogisch begleitet',
      icon: Users,
      active: lifetimeStudentsTotal >= 40
    },
    {
      id: 'veteran',
      label: 'Erfahrener Pädagoge',
      desc: 'Seit mindestens 5 Dienstjahren aktiv am Lehren',
      icon: Award,
      active: careerYears >= 5
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in" id="lehrer-profil-section">
      
      {/* TABS */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 w-fit rounded-2xl mx-auto backdrop-blur-sm border border-slate-200/50 justify-center">
        <button 
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.875rem] leading-snug font-black transition-all ${activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Trophy size={16} /> Planungs-Statistik
        </button>
        <button 
          onClick={() => setActiveTab('selfcare')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[0.875rem] leading-snug font-black transition-all ${activeTab === 'selfcare' ? 'bg-white text-rose-500 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Sparkles size={16} /> Self-Care & Magie
        </button>
      </div>

      {activeTab === "stats" && (
        <PlanungsStatistik />
      )}
      
      {activeTab === 'selfcare' && (
        <TeacherSelfCare />
      )}

      {activeTab === 'classpet' && (() => {
        const petState = app.classPet || {
          enabled: true,
          animalType: 'dino',
          name: 'Spike',
          energy: 50,
          accessories: [],
          history: []
        };
        const showMascot = petState.showMascotOnDashboard !== false;
        const currentBreed = PET_BREEDS.find(b => b.id === petState.animalType) || PET_BREEDS[0];

        const handleSelectBreed = (breedId: typeof petState.animalType) => {
          const selectedBreed = PET_BREEDS.find(b => b.id === breedId) || PET_BREEDS[0];
          setApp(prev => {
            const current = prev.classPet || {
              enabled: true,
              animalType: 'dino',
              name: 'Spike',
              energy: 50,
              accessories: [],
              history: []
            };
            return {
              ...prev,
              classPet: {
                ...current,
                animalType: breedId,
                name: current.name === 'Spike' || current.name === 'Dragi' || current.name === 'Oli' || current.name === 'Kiki' || current.name === 'Poldi' ? selectedBreed.nameDefault : current.name
              }
            };
          });
        };

        const handleNameChange = (newName: string) => {
          setApp(prev => {
            const current = prev.classPet || {
              enabled: true,
              animalType: 'dino',
              name: 'Spike',
              energy: 50,
              accessories: [],
              history: []
            };
            return {
              ...prev,
              classPet: {
                ...current,
                name: newName
              }
            };
          });
        };

        const handleToggleMascotVisible = (visible: boolean) => {
          setApp(prev => {
            const current = prev.classPet || {
              enabled: true,
              animalType: 'dino',
              name: 'Spike',
              energy: 50,
              accessories: [],
              history: []
            };
            return {
              ...prev,
              classPet: {
                ...current,
                showMascotOnDashboard: visible
              }
            };
          });
        };

        const toggleAccessory = (accId: string) => {
          setApp(prev => {
            const current = prev.classPet || {
              enabled: true,
              animalType: 'dino',
              name: 'Spike',
              energy: 50,
              accessories: [],
              history: []
            };
            const accs = current.accessories || [];
            const nextAccs = accs.includes(accId)
              ? accs.filter(id => id !== accId)
              : [...accs, accId];
            return {
              ...prev,
              classPet: {
                ...current,
                accessories: nextAccs
              }
            };
          });
        };

        return (
          <div className="space-y-6 max-w-4xl mx-auto animate-fade-in font-sans">
            {/* Retro 8-Bit Banner */}
            <div className="bg-black text-green-400 p-6 rounded-[2rem] border-4 border-double border-green-500/50 shadow-2xl relative ">
              {/* Scanline pattern overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0.15))] bg-[length:100%_4px] pointer-events-none select-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-[1.875rem] leading-tight animate-bounce">👾</span>
                    <h3 className="text-[1.125rem] leading-normal font-pressstart uppercase tracking-wider text-green-400" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '13px' }}>
                      TAMAGOTCHI STEUERUNG
                    </h3>
                  </div>
                  <p className="text-[0.75rem] leading-tight text-green-500/80 uppercase font-mono tracking-widest mt-2">
                    Definiere das 8-Bit Klassen-Maskottchen, passe Namen an &amp; lege die Dashboard-Sichtbarkeit fest.
                  </p>
                </div>
                {/* 8-bit energy meter preview */}
                <div className="border border-green-500/40 bg-zinc-900/80 px-4 py-2 rounded-xl text-center font-mono">
                  <span className="text-[0.625rem] text-green-500 uppercase block tracking-wider font-bold">AKTUELLE VITALITÄT</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[0.875rem] leading-snug font-bold text-green-400">{petState.energy || 50}%</span>
                    <div className="w-24 h-2.5 bg-zinc-950 rounded-full border border-green-500/30 ">
                      <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${petState.energy || 50}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Customizer form */}
              <div className="md:col-span-7 space-y-6">
                
                {/* Name & Dashboard Visibility Grid */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                  <div>
                    <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 uppercase tracking-widest">
                      1. BASIS-DATEN &amp; PERSÖNLICHKEIT
                    </h4>
                    <p className="text-[0.75rem] leading-tight text-slate-400 font-bold mt-1">
                      Gib deinem Klassenhaustier eine unverwechselbare Persönlichkeit.
                    </p>
                  </div>

                  {/* Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase tracking-wider text-slate-500">Name des Tieres:</label>
                    <input 
                      type="text" 
                      value={petState.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="z.B. Oli" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl text-slate-800 text-[0.875rem] leading-snug font-bold outline-none transition-all shadow-sm"
                    />
                  </div>

                  {/* Dashboard-Plus-Substituter Info Block */}
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100/50 rounded-2xl flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[0.75rem] leading-tight font-black text-emerald-800 uppercase tracking-wider block">CO-EXISTENZ VON MASCOTTCHEN &amp; PLUS</span>
                      <p className="text-[0.6875rem] text-emerald-900/80 font-bold leading-normal max-w-sm">
                        Dein Haustier verweilt stets munter am Bildschirmrand &amp; trägt den magischen Plus-Button direkt an seiner Seite. Eine witzige und praktische Kombination!
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/10 text-emerald-800 border-2 border-emerald-200 px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider">
                      ✨ AKTIV
                    </div>
                  </div>
                </div>

                {/* Tier-Typen Selector Grid */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                  <div>
                    <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 uppercase tracking-widest">
                      2. TIER-TYP WÄHLEN
                    </h4>
                    <p className="text-[0.75rem] leading-tight text-slate-400 font-bold mt-1">
                      Welche Spezies soll die Klasse heute beim Lernen begleiten?
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {PET_BREEDS.map((breed) => {
                      const isSelected = petState.animalType === breed.id;
                      return (
                        <button
                          key={breed.id}
                          onClick={() => handleSelectBreed(breed.id)}
                          type="button"
                          className={`p-3 rounded-2xl border text-left flex items-center gap-3 w-full transition-all active:scale-98 cursor-pointer ${
                            isSelected 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-sm ring-2 ring-emerald-400/50' 
                              : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                          }`}
                        >
                          {/* Pixel design style */}
                          <span className="text-[1.875rem] leading-tight p-1 bg-white rounded-xl border border-black/5 flex items-center justify-center shadow-inner">
                            {breed.emoji}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[0.75rem] leading-tight font-black uppercase block tracking-wider leading-none">
                              {breed.breedLabel} ({breed.nameDefault})
                            </span>
                            <span className={`text-[0.5625rem] font-bold block text-wrap leading-tight break-words mt-1 ${isSelected ? 'text-emerald-850' : 'text-slate-400'}`}>
                              "{breed.baseReaction}"
                            </span>
                          </div>
                          {isSelected && <span className="text-emerald-500 font-black text-[0.875rem] leading-snug">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Preview Area */}
              <div className="md:col-span-12 lg:col-span-5 space-y-6">
                
                {/* 8-Bit Styled Device Preview */}
                <div className="bg-slate-950 p-6 rounded-[2.5rem] border-8 border-slate-800 shadow-2xl relative  flex flex-col items-center justify-between min-h-[420px]">
                  
                  {/* CRT Glass sheen reflection */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none rounded-[2rem]" />
                  {/* Vertical scanlines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.2)_50%,rgba(0,0,0,0.2))] bg-[length:100%_6px] pointer-events-none rounded-[2rem]" />
                  
                  {/* Internal Retro Frame */}
                  <div className="w-full text-center space-y-1 relative z-15">
                    <span 
                      className="text-[0.5625rem] text-green-400 font-pressstart tracking-widest leading-none block" 
                      style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '9px' }}
                    >
                      LIVE RETRO PREVIEW
                    </span>
                    <div className="w-12 h-1 mx-auto bg-green-500/30 rounded" />
                  </div>

                  {/* Character Avatar Canvas container */}
                  <div className="relative w-40 h-40 flex items-center justify-center p-6 border-4 border-dashed border-green-500/20 bg-black/60 rounded-[2rem] my-4 shadow-inner">
                    
                    {/* Retro radial grid backdrop */}
                    <div className="absolute inset-2 w-36 h-36 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                    {/* Low Energy snooze bubble Zzz */}
                    {petState.energy <= 24 && (
                      <div className="absolute top-4 right-4 text-[0.625rem] font-pressstart text-rose-400 animate-pulse" style={{ fontFamily: '"Press Start 2P"' }}>
                        zZz
                      </div>
                    )}

                    {/* High energy stars jumping */}
                    {petState.energy >= 80 && (
                      <span className="absolute top-4 left-4 text-[0.75rem] leading-tight select-none animate-bounce">✨</span>
                    )}

                    {/* Animated Pet Character - Using Standard Canvas */}
                    <div className="w-48 h-48 relative flex items-center justify-center select-none overflow-visible rounded-full">
                       <ClassPetCanvas 
                          animalType={petState.animalType || 'dog'} 
                          accessories={petState.accessories || []}
                          behaviorMode={petState.behaviorMode || 'auto'}
                          energy={petState.energy || 50}
                          scale={petState.scale || 1.0}
                       />
                    </div>
                  </div>

                  {/* Customization Details & Wardrobe List */}
                  <div className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl relative z-10 space-y-3 font-mono">
                    <div className="text-center">
                      <h5 className="text-[0.75rem] leading-tight font-bold text-white uppercase tracking-wider">{petState.name || "Mascot"}</h5>
                      <span className="text-[0.5625rem] text-green-400 uppercase tracking-widest block mt-0.5">{currentBreed.breedLabel}</span>
                    </div>

                    {/* Interactive Wardrobe Checkbox list */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[0.5rem] font-bold text-slate-500 uppercase tracking-widest block border-b border-zinc-800 pb-1">
                        ACCESSOIRES SCHUBLADE:
                      </span>
                      
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {AVAILABLE_ACCESSORIES.map(acc => {
                          const isEquipped = petState.accessories?.includes(acc.id);
                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => toggleAccessory(acc.id)}
                              className={`px-2 py-1.5 rounded-xl border text-[0.59375rem] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 ${
                                isEquipped 
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow' 
                                  : 'bg-zinc-950 border-zinc-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span>{acc.icon}</span>
                              <span className="text-[0.53125rem]">{acc.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* 📜 LEHRER-DECRET VINTAGE CERTIFICATE MODAL */}
      {showDecretModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto overflow-x-hidden">
          {/* Custom style to override any hidden elements for print */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                width: 210mm !important;
                height: 297mm !important;
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body * {
                visibility: hidden !important;
              }
              #printable-decret-canvas, #printable-decret-canvas * {
                visibility: visible !important;
              }
              #printable-decret-canvas {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                background: white !important;
                box-shadow: none !important;
                border: 14px double #b45309 !important;
                padding: 3rem !important;
                z-index: 999999 !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                box-sizing: border-box !important;
              }
              #printable-decret-canvas .print-no-show {
                display: none !important;
              }
            }
          `}} />

          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-100 flex flex-col max-h-[90vh] ">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-stone-50/50">
              <div className="flex items-center gap-2">
                <Trophy size={18} className="text-amber-600" />
                <span className="text-[0.875rem] leading-snug font-black text-slate-800 uppercase tracking-wider">Erfolgsurkunde Vorschau</span>
              </div>
              <button 
                onClick={() => setShowDecretModal(false)}
                className="text-[0.75rem] leading-tight hover:bg-slate-150 bg-slate-100 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg font-black cursor-pointer"
              >
                Schließen
              </button>
            </div>

            {/* Modal Scrollable Sandbox / Preview Container */}
            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto flex justify-center">
              
              {/* Dynamic Decret Preview Canvas */}
              <div 
                id="printable-decret-canvas"
                className="w-[145mm] h-[205mm] bg-[#faf6f0] border-[10px] border-double border-amber-700/80 p-10 rounded-lg shadow-lg flex flex-col justify-between text-center text-slate-900  relative"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {/* Gold Pattern Accents */}
                <div className="absolute top-2 left-2 right-2 bottom-2 border border-amber-600/30 pointer-events-none rounded" />
                
                {/* Crown / Crest */}
                <div className="space-y-3 pt-4">
                  <div className="mx-auto w-16 h-16 bg-amber-100 text-amber-800 rounded-full border-2 border-amber-600 flex items-center justify-center shadow-inner">
                    <span className="text-[1.875rem] leading-tight font-serif">🏛️</span>
                  </div>
                  <div>
                    <h2 className="text-[0.75rem] leading-tight font-serif font-black uppercase tracking-[0.2em] text-amber-800 leading-none">
                      Bundesministerium
                    </h2>
                    <p className="text-[0.625rem] font-serif uppercase tracking-[0.1em] text-amber-700 font-bold mt-1">
                      für Unterricht, Pädagogik & Bildungswunder
                    </p>
                  </div>
                </div>

                {/* Main Body Statement */}
                <div className="space-y-5">
                  <span className="text-[0.5625rem] font-serif uppercase tracking-[0.3em] font-black text-stone-550 block">DECRET DER ANERKENNUNG</span>
                  
                  <div className="space-y-1">
                    <p className="text-[0.625rem] italic font-serif text-stone-500 font-sans">In feierlicher Würdigung hervorragender Verdienste erlassen für:</p>
                    <h1 className="text-[1.5rem] leading-normal font-serif font-black text-amber-950 font-semibold tracking-wide capitalize py-1.5 border-b border-amber-200/40 w-5/6 mx-auto">
                      {profile.name || "Maximilian Musterlehrer"}
                    </h1>
                    <p className="text-[0.625rem] font-serif text-stone-500 font-bold tracking-tight pt-1">
                      Lehrkraft an der Institution: <span className="underline decoration-amber-300 font-black">{profile.schule || "Grundschule Musterstadt"}</span>
                    </p>
                  </div>

                  {/* Certified lifetime metrics */}
                  <div className="bg-amber-100/30 border border-amber-250/20 py-4 px-3 rounded-xl mx-2 my-1 space-y-3.5">
                    <p className="text-[0.71875rem] font-serif italic text-slate-800 leading-relaxed md:px-4">
                      „Zertifikat für vorbildliche und allseitige Bildungsleistung. Der hochgeschätzte Pädagoge begleitete mit Herz und unermüdlicher Kraft:“
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 text-center text-slate-950 pt-1">
                      <div className="border-r border-amber-200/50">
                        <span className="text-[0.9375rem] font-bold block text-amber-900 font-serif">~{lifetimeSchulstundenTotal}</span>
                        <span className="text-[0.46875rem] uppercase text-stone-500 block font-bold leading-tight mt-0.5">Unterrichts<br/>stunden</span>
                      </div>
                      <div className="border-r border-amber-200/50">
                        <span className="text-[0.9375rem] font-bold block text-amber-900 font-serif">{lifetimeStudentsTotal}</span>
                        <span className="text-[0.46875rem] uppercase text-stone-500 block font-bold leading-tight mt-0.5">begleitete<br/>Seelen</span>
                      </div>
                      <div>
                        <span className="text-[0.9375rem] font-bold block text-amber-900 font-serif">{lifetimeAusfluegeTotal}</span>
                        <span className="text-[0.46875rem] uppercase text-stone-500 block font-bold leading-tight mt-0.5">Exkursionen<br/>& Ausflüge</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[0.625rem] font-serif leading-relaxed text-stone-500 max-w-sm mx-auto">
                    Hiermit wird bescheinigt, dass {profile.name || "Maximilian Musterlehrer"} die Ideale moderner, liebevoller Bildungspflege zur Förderung kommender Generationen beispielhaft gelebt hat.
                  </p>
                </div>

                {/* Official Seal and Signatures */}
                <div className="flex justify-between items-end px-4 pb-4">
                  {/* Left: Vintage Seal */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-13 h-13 rounded-full border border-dashed border-red-500/80 bg-red-50/45 flex items-center justify-center rotate-[-12deg] text-[0.5625rem] font-bold text-red-650 tracking-wider">
                      <div className="border-2 border-dashed border-red-500 rounded-full w-10 h-10 flex flex-col items-center justify-center uppercase select-none font-serif text-[0.4375rem] font-bold font-sans">
                        <span>OFFIZIELL</span>
                        <span>SIEGEL</span>
                      </div>
                    </div>
                    <span className="text-[0.4375rem] uppercase font-bold text-stone-400 font-mono">Kanzlei-Register-Nr: VS{startYear}</span>
                  </div>

                  {/* Right: Signature line */}
                  <div className="flex flex-col items-center space-y-1 w-2/5">
                    <div className="w-4/5 border-b border-amber-900/60 pb-1 h-8 flex items-end justify-center">
                      <span className="font-serif italic text-amber-900 text-[0.75rem] leading-tight tracking-widest pl-2">Schulleitung</span>
                    </div>
                    <span className="text-[0.46875rem] uppercase font-black text-amber-800 tracking-wider font-serif">Unterschrift der Schulleitung</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-stone-50/50">
              <button 
                onClick={() => setShowDecretModal(false)}
                className="px-4 py-2 hover:bg-slate-150 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[0.75rem] leading-tight font-black cursor-pointer"
              >
                Abbrechen
              </button>
              <button 
                onClick={() => window.print()}
                className="px-5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-black text-[0.75rem] leading-tight rounded-xl cursor-pointer flex items-center gap-2 shadow-md active:scale-95 animate-pulse"
              >
                <Printer size={13} /> Urkunde ausdrucken (A4)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
