import React, { useState, useEffect, useMemo } from 'react';
import { Target, Search, CheckCircle2, ChevronRight, RefreshCcw, Sparkles, User, Users, Dice5, Trophy, Plus, X, Award, Check } from 'lucide-react';
import { generateQuiz, QAItem } from '../services/aiService';
import { useApp } from '../context/AppContext';
import { UNTERRICHTSMODUS_THEMES } from '../lib/unterrichtsmodusThemes';
import { FAECHER_ALLE } from '../constants';

export default function QuizWidget() {
  const { app, setApp } = useApp();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Einfach'|'Mittel'|'Schwer'>('Mittel');
  const [isLoading, setIsLoading] = useState(false);
  const [quizData, setQuizData] = useState<QAItem[] | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamic theme settings
  const currentThemeId = app.unterrichtsmodus_theme || app.theme || 'classic_light';
  const currentTheme = UNTERRICHTSMODUS_THEMES[currentThemeId] || UNTERRICHTSMODUS_THEMES.classic_light;

  // Gamification state
  const [selectedStudents, setSelectedStudents] = useState<any[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  // Aggregation & Evaluation States
  const [quizScores, setQuizScores] = useState<Record<string, { student: any; correct: number; total: number }>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [plusAddedRecord, setPlusAddedRecord] = useState<Record<string, { success: boolean; subject: string }>>({});
  const [globalSubject, setGlobalSubject] = useState<string>('Sachunterricht');
  
  // Extract suggestions from weekly plan
  const suggestions = useMemo(() => {
    const kw = app.activeKW || 1;
    const plan = app.wochenplanung?.[kw] || {};
    const items = new Set<string>();
    
    Object.values(plan).forEach((dayPlan: any) => {
      Object.keys(dayPlan).forEach((key: any) => {
        const item = dayPlan[key];
        if (item.thema && typeof item.thema === 'string' && item.thema.length > 2) {
          items.add(item.thema.trim());
        }
        if (item.fach && typeof item.fach === 'string' && item.fach.length > 2) {
          items.add(item.fach.trim());
        }
      });
    });
    return Array.from(items).slice(0, 8);
  }, [app]);
  
  // Helper to guess subject based on topic name
  const guessSubject = (topicStr: string): string => {
    const lower = (topicStr || '').toLowerCase();
    if (lower.includes('mathe') || lower.includes('rechnen') || lower.includes('zahl') || lower.includes('geometrie') || lower.includes('bruch')) return 'Mathematik';
    if (lower.includes('deutsch') || lower.includes('lesen') || lower.includes('schreiben') || lower.includes('rechtschreib') || lower.includes('grammatik') || lower.includes('wort')) return 'Deutsch';
    if (lower.includes('englisch') || lower.includes('english') || lower.includes('vocab')) return 'Englisch';
    if (lower.includes('musik') || lower.includes('sing') || lower.includes('lied') || lower.includes('noten')) return 'Musikerziehung';
    if (lower.includes('sport') || lower.includes('turnen') || lower.includes('lauf')) return 'Bewegung und Sport';
    if (lower.includes('türkisch')) return 'Türkisch';
    if (lower.includes('religion') || lower.includes('bibel')) return 'Religion';
    return 'Sachunterricht'; // fallback
  };

  // Automatically update the global subject recommendation when the topic is initialized or changed
  useEffect(() => {
    if (topic) {
      setGlobalSubject(guessSubject(topic));
    }
  }, [topic]);

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim()) return;
    setIsLoading(true);
    setError(null);
    setQuizData(null);
    
    const stufe = app.stufe || 4;
    const data = await generateQuiz(topic, stufe, difficulty);
    if (data && Array.isArray(data) && data.length > 0) {
      setQuizData(data);
      setCurrentQIndex(0);
      setRevealed(false);
      setSelectedStudents([]);
      setQuizScores({});
      setShowSummary(false);
      setPlusAddedRecord({});
    } else {
      setError("Konnte kein Quiz generieren. Bitte versuch es nochmal.");
    }
    setIsLoading(false);
  };
  
  const recordQuestionAnswers = () => {
    setQuizScores(prev => {
      const copy = { ...prev };
      selectedStudents.forEach(st => {
        const existing = copy[st.id] || { student: st, correct: 0, total: 0 };
        copy[st.id] = {
          student: st,
          correct: existing.correct + (st.answerStatus === 'correct' ? 1 : 0),
          total: existing.total + 1
        };
      });
      return copy;
    });
  };

  const nextQuestion = () => {
    recordQuestionAnswers();
    if (quizData && currentQIndex < quizData.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
      setRevealed(false);
      setSelectedStudents([]);
    }
  };

  const finishQuiz = () => {
    recordQuestionAnswers();
    setShowSummary(true);
  };

  const handleReset = () => {
    setQuizData(null);
    setTopic('');
    setCurrentQIndex(0);
    setRevealed(false);
    setError(null);
    setSelectedStudents([]);
    setQuizScores({});
    setShowSummary(false);
    setPlusAddedRecord({});
  };

  const pickStudent = (onlySPF: boolean = false, count: number = 1) => {
    if (isSpinning) return;
    
    let pool = (app.schueler || []).filter((s:any) => !selectedStudents.find(sel => sel.id === s.id));
    if (onlySPF) pool = pool.filter((s:any) => s.spf || s.espf);
    
    if (pool.length === 0) return;
    
    setIsSpinning(true);
    let spins = 0;
    
    // Choose unique students from pool
    const toPick: any[] = [];
    const tempPool = [...pool];
    for (let c = 0; c < count; c++) {
      if (tempPool.length === 0) break;
      const r = Math.floor(Math.random() * tempPool.length);
      toPick.push({
        ...tempPool.splice(r, 1)[0],
        answerStatus: 'neutral' // 'correct' | 'incorrect' | 'neutral'
      });
    }
    
    const tempIndexStart = selectedStudents.length;
    
    const interval = setInterval(() => {
      spins++;
      // Rotate selected student visual simulation
      const rawRandom = pool[Math.floor(Math.random() * pool.length)];
      const randomStudent = { ...rawRandom, answerStatus: 'neutral' };
      setSelectedStudents(prev => {
        const base = prev.slice(0, tempIndexStart);
        return [...base, ...toPick.slice(0, -1), randomStudent];
      });
      
      if (spins > 12) {
        clearInterval(interval);
        setSelectedStudents(prev => {
          const base = prev.slice(0, tempIndexStart);
          return [...base, ...toPick];
        });
        setIsSpinning(false);
      }
    }, 80);
  };

  const addMitarbeitPoint = (studentId: string, subjectName: string) => {
    const sem = '1'; // Default first semester
    
    setApp(prev => {
      const studentMI = prev.mitarbeit?.[studentId] || {};
      const fachMI = studentMI[subjectName] || {};
      const currentVal = fachMI[sem] || 0;
      const nextVal = currentVal + 1;
      
      return {
        ...prev,
        mitarbeit: {
          ...(prev.mitarbeit || {}),
          [studentId]: {
            ...studentMI,
            [subjectName]: {
              ...fachMI,
              [sem]: nextVal
            }
          }
        }
      };
    });

    setPlusAddedRecord(prev => ({
      ...prev,
      [studentId]: { success: true, subject: subjectName }
    }));
  };

  const rewardAllCorrect = (subjectName: string) => {
    const sem = '1';
    const studentsToReward = Object.values(quizScores).filter(
      item => item.correct > 0 && !plusAddedRecord[item.student.id]?.success
    );

    if (studentsToReward.length === 0) return;

    setApp(prev => {
      const updatedMitarbeit = { ...(prev.mitarbeit || {}) };
      
      studentsToReward.forEach(item => {
        const studentId = item.student.id;
        const studentMI = updatedMitarbeit[studentId] || {};
        const fachMI = studentMI[subjectName] || {};
        const currentVal = fachMI[sem] || 0;
        const nextVal = currentVal + 1;
        
        updatedMitarbeit[studentId] = {
          ...studentMI,
          [subjectName]: {
            ...fachMI,
            [sem]: nextVal
          }
        };
      });

      return {
        ...prev,
        mitarbeit: updatedMitarbeit
      };
    });

    setPlusAddedRecord(prev => {
      const copy = { ...prev };
      studentsToReward.forEach(item => {
        copy[item.student.id] = { success: true, subject: subjectName };
      });
      return copy;
    });
  };

  // Custom visual CSS for the final scorecard celebration
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      @keyframes celebrate-star {
        0% { transform: scale(0.6) rotate(-15deg); opacity: 0; }
        50% { transform: scale(1.15) rotate(10deg); opacity: 1; }
        100% { transform: scale(1.0) rotate(0deg); opacity: 1; }
      }
      .animate-celebrate {
        animation: celebrate-star 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  if (!quizData) {
    return (
      <div className="w-full h-full p-8 flex flex-col justify-center rounded-[2rem]  relative bg-transparent font-sans">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col items-center max-w-lg mx-auto w-full text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm border" style={{ backgroundColor: `${currentTheme.colors.accent}15`, borderColor: currentTheme.colors.border, color: currentTheme.colors.accent }}>
            <Target size={32} strokeWidth={2.5} />
          </div>
          
          <h2 className="text-[1.875rem] leading-tight font-black mb-3 tracking-tight" style={{ color: currentTheme.colors.textPrimary }}>KI-Quiz Generator</h2>
          <p className="text-[0.875rem] leading-snug mb-8 font-medium leading-relaxed" style={{ color: currentTheme.colors.textSecondary }}>Lass die KI aus jedem Thema in Sekunden ein spannendes interaktives LEHRERCOCKPIT-Quiz zaubern.</p>
          
          <form onSubmit={handleGenerate} className="w-full">
            <div className="mb-4">
              <input
                type="text"
                autoFocus
                placeholder="Z.B. Römer, Waldtiere, Planeten..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                className="w-full rounded-2xl px-6 py-4 text-[1.125rem] leading-normal font-bold outline-none transition-colors shadow-inner text-center border"
                style={{ backgroundColor: `${currentTheme.colors.textPrimary}05`, borderColor: currentTheme.colors.border, color: currentTheme.colors.textPrimary }}
              />
            </div>
            
            {suggestions.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {suggestions.map((s, i) => (
                  <button 
                    key={i} 
                    type="button" 
                    onClick={() => setTopic(s)} 
                    className="px-3 py-1.5 text-[0.75rem] leading-tight font-bold rounded-lg border transition-colors bg-white hover:bg-slate-50 border-slate-200 text-slate-700 cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex justify-center gap-3 mb-6">
              {(['Einfach', 'Mittel', 'Schwer'] as const).map(level => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficulty(level)}
                  className="px-4 py-2 rounded-xl text-[0.875rem] leading-snug font-bold transition-colors border cursor-pointer"
                  style={{
                    backgroundColor: difficulty === level ? `${currentTheme.colors.accent}15` : 'transparent',
                    borderColor: difficulty === level ? currentTheme.colors.accent : currentTheme.colors.border,
                    color: difficulty === level ? currentTheme.colors.accent : currentTheme.colors.textSecondary
                  }}
                >
                  {level}
                </button>
              ))}
            </div>
            
            <button
              type="submit"
              disabled={isLoading || !topic.trim()}
              className="w-full py-4 rounded-2xl font-black text-[1.125rem] leading-normal uppercase tracking-widest text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer border"
              style={{ backgroundColor: currentTheme.colors.accent, borderColor: currentTheme.colors.border, color: currentTheme.colors.buttonText }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <RefreshCcw className="animate-spin" size={20} /> Generiere...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> Quiz erstellen
                  </>
                )}
              </span>
            </button>
            
            {error && (
              <p className="text-rose-450 font-bold mt-4 text-[0.875rem] leading-snug">{error}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Render the celebratory summary and participation points logging view
  if (showSummary) {
    const totalParticipation = Object.keys(quizScores).length;
    const allParticipants = Object.values(quizScores);

    return (
      <div className="w-full h-full p-6 md:p-8 flex flex-col justify-start rounded-[2rem] overflow-y-auto relative bg-transparent font-sans custom-scrollbar">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        
        {/* Celebration Header Block */}
        <div className="relative z-10 flex flex-col items-center text-center mt-2 mb-8">
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-2xl animate-pulse scale-150" />
            
            {/* Pulsing Trophy Circle */}
            <div className="w-20 h-20 rounded-3xl bg-amber-500 border-4 border-white shadow-2xl flex items-center justify-center text-white animate-celebrate">
              <Trophy size={40} className="drop-shadow-lg" />
            </div>
            
            <div className="absolute -top-3 -left-5 bg-teal-500 text-white text-[0.5625rem] font-black px-2.5 py-1 rounded-full shadow-md rotate-[-8deg] uppercase tracking-wider">
              Abgeschlossen!
            </div>
            <div className="absolute -bottom-2 -right-5 bg-fuchsia-600 text-white text-[0.5625rem] font-black px-2.5 py-1 rounded-full shadow-md rotate-[12deg] uppercase tracking-wider">
              Super gelöst! 🎉
            </div>
          </div>
          
          <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black mb-1.5 tracking-tight" style={{ color: currentTheme.colors.textPrimary }}>
            Auswertung: {topic}
          </h2>
          <p className="text-[0.75rem] leading-tight font-semibold max-w-md mx-auto" style={{ color: currentTheme.colors.textSecondary }}>
            Herzlichen Glückwunsch! Du kannst hier ganz einfach die Leistung einsehen und verdiente Mitarbeitspunkte direkt eintragen.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 items-start">
          {/* Action & Metrics sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="p-5 rounded-2xl border-2 bg-slate-50 border-slate-200 shadow-sm">
              <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Quiz details</span>
              <p className="text-[1.125rem] leading-normal font-black mt-1" style={{ color: currentTheme.colors.textPrimary }}>{topic}</p>
              <div className="inline-block mt-2 px-2 py-0.5 border text-[0.625rem] font-black rounded uppercase tracking-wider bg-white" style={{ color: currentTheme.colors.accent, borderColor: currentTheme.colors.border }}>
                {difficulty}
              </div>
            </div>

            <div className="p-5 rounded-2xl border-2 bg-slate-50 border-slate-200 shadow-sm">
              <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Beteiligung</span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[1.875rem] leading-tight font-black" style={{ color: currentTheme.colors.textPrimary }}>{totalParticipation}</span>
                <span className="text-[0.75rem] leading-tight font-bold text-slate-500">Kinder aufgerufen</span>
              </div>
            </div>

            {/* Subject configuration point */}
            <div className="p-5 rounded-2xl border-2 bg-white border-slate-200 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-indigo-500" />
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-700">Standardfach für plus</span>
              </div>
              
              <p className="text-[0.625rem] text-slate-550 leading-normal">
                Stelle das Fach ein, in welchem das Plus eingetragen werden soll. Du kannst das Fach beim jeweiligen Kind auch einzeln wählen.
              </p>

              <select
                value={globalSubject}
                onChange={(e) => setGlobalSubject(e.target.value)}
                className="w-full text-[0.75rem] leading-tight font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 outline-none focus:border-indigo-500"
              >
                {FAECHER_ALLE.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>

              {allParticipants.some(i => i.correct > 0) && (
                <button
                  type="button"
                  onClick={() => rewardAllCorrect(globalSubject)}
                  className="mt-1 w-full py-2.5 rounded-xl text-[0.5625rem] font-black uppercase tracking-widest text-white bg-indigo-650 hover:bg-indigo-600 transition-all shadow-sm active:scale-95"
                >
                  Alle mit Richtigen belohnen (+1 ➕)
                </button>
              )}
            </div>
          </div>

          {/* Student scores rows */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <h3 className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-2">
              <Users size={14} /> Aufgerufene Kinder ({allParticipants.length})
            </h3>

            {allParticipants.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed text-slate-400">
                <User size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-[0.625rem] font-black uppercase tracking-wider">Niemand am Picker aufgerufen</p>
                <p className="text-[0.6875rem] mt-0.5 text-slate-400">Es wurden für dieses Quiz keine Kinder am Würfel aufgerufen.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
                {allParticipants.map((item, idx) => {
                  const s = item.student;
                  const record = plusAddedRecord[s.id];
                  const hasAdded = !!record?.success;
                  
                  return (
                    <div 
                      key={s.id} 
                      className="p-3.5 rounded-xl border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-slate-350 transition-colors"
                      style={{ borderColor: hasAdded ? '#10b981' : '#e2e8f0' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {s.foto || s.avatar ? (
                            <img src={s.foto || s.avatar} alt={s.vorname} className="w-9 h-9 rounded-full object-cover border border-slate-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 font-black text-[0.75rem] leading-tight uppercase border border-slate-200">
                              {s.vorname?.[0]}{s.nachname?.[0]}
                            </div>
                          )}
                          {(s.spf || s.espf) && (
                            <span className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-white text-[0.375rem] font-black px-1 rounded-sm shadow-xs">SPF</span>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[0.75rem] leading-tight font-black text-slate-850">{s.vorname} {s.nachname}</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[0.5625rem] font-bold text-slate-600 bg-slate-100 border px-1.5 py-0.5 rounded-md">
                              {item.correct} / {item.total} Richtig
                            </span>
                            {item.correct === item.total && item.correct > 0 && (
                              <span className="text-[0.5rem] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-sm">
                                ⭐ Fehlerfrei!
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasAdded ? (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[0.5625rem] font-black uppercase tracking-wider animate-bounce">
                            <Check size={11} strokeWidth={3} /> Eingetragen in {record.subject}!
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => addMitarbeitPoint(s.id, globalSubject)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[0.5625rem] font-black uppercase tracking-widest flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-sm border border-emerald-600"
                            >
                              <Plus size={9} strokeWidth={3} /> Plus eintragen
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar Actions */}
        <div className="relative z-10 border-t border-slate-200 pt-5 flex justify-between items-center h-14 mt-auto">
          <button
            type="button"
            onClick={() => setShowSummary(false)}
            className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[0.625rem] font-black uppercase tracking-wider text-slate-500"
          >
            Zurück Fragen
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-2.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest text-white shadow-md hover:scale-105 transition-transform cursor-pointer border font-semibold"
            style={{ backgroundColor: currentTheme.colors.accent, borderColor: currentTheme.colors.border, color: currentTheme.colors.buttonText }}
          >
            Beenden & Schließen
          </button>
        </div>
      </div>
    );
  }

  const currentQ = quizData[currentQIndex];

  return (
    <div className="w-full h-full p-8 flex flex-col justify-center rounded-[2rem]  relative bg-transparent font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-fuchsia-600/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      
      <div className="relative z-10 flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black border" style={{ backgroundColor: `${currentTheme.colors.accent}15`, borderColor: currentTheme.colors.border, color: currentTheme.colors.accent }}>
            {currentQIndex + 1}
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-widest uppercase text-[0.75rem] leading-tight" style={{ color: currentTheme.colors.accent }}>Frage {currentQIndex + 1} von {quizData.length}</span>
            <span className="font-medium text-[0.625rem] uppercase tracking-wider" style={{ color: currentTheme.colors.textSecondary }}>{topic} • {difficulty}</span>
          </div>
        </div>
        
        <div className="flex gap-2 isolate">
           <button 
             onClick={handleReset} 
             className="px-4 py-2 rounded-xl border text-[0.75rem] leading-tight font-black tracking-wider uppercase transition-colors hover:bg-rose-500/10 hover:text-rose-400"
             style={{ borderColor: currentTheme.colors.border, color: currentTheme.colors.textSecondary }}
           >
             Beenden
           </button>
        </div>
      </div>
      
      <div className="relative z-10 flex-1 flex flex-col min-h-0 py-2">
        <div className="flex justify-between items-center gap-4 mb-4 shrink-0 flex-wrap md:flex-nowrap">
          <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black leading-tight flex-1 text-center balance-text" style={{ color: currentTheme.colors.textPrimary }}>
            {currentQ.question}
          </h2>
          
          {/* Gamification Panel: Student Picker - ALWAYS VISIBLE */}
          <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border min-w-[220px]" style={{ backgroundColor: `${currentTheme.colors.accent}04`, borderColor: currentTheme.colors.border }}>
            <div className="flex flex-col gap-1.5 w-full">
              <div className="flex items-center justify-between">
                <span className="text-[0.5625rem] uppercase tracking-widest font-black" style={{ color: currentTheme.colors.accent }}>wer ist dran?</span>
              </div>
              
              {!revealed ? (
                <div className="grid grid-cols-2 gap-1 w-full scale-95">
                  <button 
                    onClick={() => pickStudent(false, 1)} 
                    disabled={isSpinning}
                    className="p-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg text-white font-black text-[0.5625rem] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={10} /> 1 KIND
                  </button>
                  <button 
                    onClick={() => pickStudent(false, 2)} 
                    disabled={isSpinning}
                    className="p-1.5 bg-fuchsia-700 hover:bg-fuchsia-600 rounded-lg text-white font-black text-[0.5625rem] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={10} /> 2 KINDER
                  </button>
                  <button 
                    onClick={() => pickStudent(true, 1)} 
                    disabled={isSpinning}
                    className="p-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-black text-[0.5625rem] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={10} /> 1 SPF
                  </button>
                  <button 
                    onClick={() => pickStudent(true, 2)} 
                    disabled={isSpinning}
                    className="p-1.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-white font-black text-[0.5625rem] flex items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Plus size={10} /> 2 SPF
                  </button>
                </div>
              ) : (
                <div className="text-[0.5625rem] font-black uppercase text-center py-1 tracking-wider text-emerald-700 border border-emerald-150 bg-emerald-50 rounded bg-white shadow-xs">
                  ✏️ Antwort bewerten!
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 max-w-[300px]">
              {selectedStudents.map((student, idx) => {
                const isCorrect = student.answerStatus === 'correct';
                const isIncorrect = student.answerStatus === 'incorrect';

                return (
                  <div 
                    key={idx} 
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-300 group ${
                      isCorrect ? 'border-emerald-500 bg-emerald-50' :
                      isIncorrect ? 'border-rose-550 bg-rose-50' :
                      'border-indigo-400'
                    }`}
                    style={{ backgroundColor: currentTheme.colors.surface }}
                  >
                    {!revealed && !isSpinning && (
                      <button 
                        onClick={() => setSelectedStudents(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-505 text-white bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
                      >
                        <X size={10} />
                      </button>
                    )}
                    <div className="relative">
                      {student.foto || student.avatar ? (
                        <img src={student.foto || student.avatar} alt={student.vorname} className="w-10 h-10 rounded-full mb-1 object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-full mb-1 bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-black text-[0.75rem] leading-tight uppercase border">
                          {student.vorname?.[0]}{student.nachname?.[0]}
                        </div>
                      )}
                      {(student.spf || student.espf) && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[0.4375rem] font-black px-1 rounded shadow-sm">SPF</div>
                      )}
                    </div>
                    <span className="text-[0.625rem] font-black text-wrap leading-tight break-words max-w-[60px]" style={{ color: currentTheme.colors.textPrimary }}>{student.vorname}</span>

                    {/* Check / Cross grading options for chosen student */}
                    {revealed && (
                      <div className="flex gap-1 mt-1 justify-center items-center">
                        <button
                          type="button"
                          title="Richtig beantwortet"
                          onClick={() => {
                            setSelectedStudents(prev => prev.map((s, i) => i === idx ? { ...s, answerStatus: 'correct' } : s));
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isCorrect ? 'bg-emerald-500 text-white scale-110 shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'
                          }`}
                        >
                          <Check size={11} strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          title="Falsch beantwortet"
                          onClick={() => {
                            setSelectedStudents(prev => prev.map((s, i) => i === idx ? { ...s, answerStatus: 'incorrect' } : s));
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isIncorrect ? 'bg-rose-500 text-white scale-110 shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600'
                          }`}
                        >
                          <X size={11} strokeWidth={3} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {selectedStudents.length === 0 && !isSpinning && !revealed && (
                <button 
                  onClick={() => pickStudent()} 
                  className="w-16 h-16 flex flex-col items-center justify-center rounded-xl transition-colors border-2 border-dashed cursor-pointer"
                  style={{ backgroundColor: `${currentTheme.colors.accent}08`, borderColor: `${currentTheme.colors.accent}20`, color: currentTheme.colors.textSecondary }}
                >
                  <Dice5 size={24} className="mb-0.5" />
                  <span className="text-[0.4375rem] font-black uppercase">WÜRFELN</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0 overflow-y-auto custom-scrollbar p-2">
          {currentQ.options.map((opt, i) => {
            const isCorrect = i === currentQ.correctIndex;
            
            let btnStyle: React.CSSProperties = {
              backgroundColor: `${currentTheme.colors.textPrimary}05`,
              borderColor: currentTheme.colors.border,
              color: currentTheme.colors.textPrimary
            };
            
            let letterStyle: React.CSSProperties = {
              backgroundColor: `${currentTheme.colors.accent}15`,
              color: currentTheme.colors.accent
            };
            
            if (revealed) {
              if (isCorrect) {
                btnStyle = {
                  backgroundColor: '#10b981',
                  borderColor: '#34d399',
                  color: '#ffffff',
                  transform: 'scale(1.02)'
                };
                letterStyle = {
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff'
                };
              } else {
                btnStyle = {
                  backgroundColor: 'transparent',
                  borderColor: currentTheme.colors.border,
                  color: currentTheme.colors.textMuted,
                  opacity: 0.4
                };
              }
            }
            
            const letters = ['A', 'B', 'C', 'D'];
            
            return (
              <button 
                key={i}
                disabled={revealed}
                className="relative flex items-center p-5 rounded-2xl border-2 transition-all duration-300 text-left cursor-pointer disabled:cursor-default  group"
                style={btnStyle}
                onClick={() => setRevealed(true)}
              >
                {revealed && isCorrect && (
                  <div className="absolute inset-0 bg-white/10 pointer-events-none animate-pulse" />
                )}
                <div 
                  className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-[1.125rem] leading-normal mr-4 border"
                  style={letterStyle}
                >
                  {letters[i]}
                </div>
                <span className="text-[1.125rem] leading-normal font-bold transition-colors">
                  {opt}
                </span>
                
                {revealed && isCorrect && (
                  <CheckCircle2 className="absolute right-6 text-white" size={32} />
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="relative z-10 mt-6 flex justify-end h-14">
        {revealed && currentQIndex < quizData.length - 1 && (
          <button
            onClick={nextQuestion}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform cursor-pointer border"
            style={{ backgroundColor: currentTheme.colors.accent, color: currentTheme.colors.buttonText, borderColor: currentTheme.colors.border }}
          >
            Nächste Frage <ChevronRight size={20} />
          </button>
        )}
        {revealed && currentQIndex === quizData.length - 1 && (
          <button
            onClick={finishQuiz}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-md hover:scale-105 transition-transform cursor-pointer border animate-bounce"
            style={{ backgroundColor: currentTheme.colors.accent, color: currentTheme.colors.buttonText, borderColor: currentTheme.colors.border }}
          >
            Auswertung anzeigen <Trophy size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
