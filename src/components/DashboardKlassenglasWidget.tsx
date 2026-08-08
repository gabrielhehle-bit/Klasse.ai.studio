import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { COMMUNITY_MISSIONS_POOL } from '../types';
import { generateClassPetMission } from '../services/aiService';

export default function DashboardKlassenglasWidget() {
  const { app, setApp, setPage } = useApp();
  
  const targetIcon = app.settings?.klassenglasIcon || "💎";
  const currentCount = app.klassenglas_count || 0;
  const targetGoal = app.klassenglas_ziel || 20;

  const [localCount, setLocalCount] = useState(currentCount);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMissionResult, setAiMissionResult] = useState<{ message: string, missions: any[] } | null>(null);
  const [showMissionSelect, setShowMissionSelect] = useState(false);

  useEffect(() => {
    setLocalCount(currentCount);
  }, [currentCount]);

  const updateMarbles = (amount: number) => {
    const newCount = Math.max(0, currentCount + amount);
    setApp(prev => ({
      ...prev,
      klassenglas_count: newCount
    }));

    if (amount > 0) {
      confetti({
        particleCount: amount * 15,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
      });
      if (app.rewardSound !== false) {
        try {
          const oscCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = oscCtx.createOscillator();
          const gain = oscCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, oscCtx.currentTime); 
          osc.frequency.setValueAtTime(880.00, oscCtx.currentTime + 0.1); 
          gain.gain.setValueAtTime(0.08, oscCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, oscCtx.currentTime + 0.35);
          osc.connect(gain);
          gain.connect(oscCtx.destination);
          osc.start();
          osc.stop(oscCtx.currentTime + 0.4);
        } catch (e) {}
      }
    }

    if (newCount >= targetGoal && currentCount < targetGoal) {
      setTimeout(() => {
        confetti({ particleCount: 100, spread: 130, origin: { y: 0.5 } });
      }, 500);
    }
  };

  const handleGenerateAiMissions = async () => {
    setIsGenerating(true);
    setAiMissionResult(null);
    try {
      const studentNames = (app.schueler || []).map((s: any) => s.name).join(', ');
      const activeNotes = (app.denkzettelNotes || []).filter((n: any) => !n.completed).map((n: any) => n.text).join('; ');
      const currentEnergy = app.classPet?.energy || 50;
      
      const contextData = {
        students: studentNames,
        recentClassNotes: activeNotes,
        currentEnergy: currentEnergy
      };
      
      const result = await generateClassPetMission(contextData);
      if (result && result.missions) {
        setAiMissionResult(result);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const addAiMission = (mission: any) => {
    setApp(prev => ({
      ...prev,
      klassenglas_missions: [
        ...(prev.klassenglas_missions || []),
        {
          id: 'ai-' + Date.now() + Math.random(),
          title: `${mission.icon} ${mission.title}`,
          description: mission.description,
          rewardClassMarbles: mission.rewardClassMarbles || 3,
          category: mission.category
        }
      ]
    }));
    setAiMissionResult(null);
  };

  return (
    <div className="relative h-full flex flex-col p-6 sm:p-8 rounded-[2.5rem] border text-text-primary shadow-[0_20px_50px_-12px_rgba(0,0,0,0.02)] min-h-[400px]" style={{ backgroundColor: 'color-mix(in srgb, var(--accent, #f59e0b) 6%, var(--surface, #ffffff))', borderColor: 'color-mix(in srgb, var(--accent, #f59e0b) 18%, var(--border, #cbd5e1))' }}>
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/5 rounded-[2.5rem] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-text-muted flex items-center gap-2">
          <span className="text-amber-500">🫙</span> Klassenglas
        </h3>
        <div className="w-8 h-8 rounded-full bg-surface2/50 flex items-center justify-center border border-border shrink-0 shadow-sm cursor-help hover:bg-surface transition-colors" title="Belohne die Klasse für gutes Verhalten!">
          <span className="text-amber-500 text-[0.875rem] leading-snug">ⓘ</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative z-10 pt-4">
        <div className="flex-1 grid grid-cols-2 gap-4">
            
          {/* Glass Visual */}
          <div className="flex justify-center border-r border-border/50 pr-4">
            <div className={`relative w-full max-w-[120px] h-[180px] sm:h-[220px] bg-surface2/45 border-[3px] border-text-secondary/70 rounded-b-3xl rounded-t-xl shadow-[inset_0_-10px_20px_rgba(0,0,0,0.04),0_10px_20px_rgba(0,0,0,0.05)] flex flex-col justify-end pb-4 pt-10 ${
                currentCount >= targetGoal ? 'ring-4 ring-amber-400/20 border-amber-500 animate-[pulse_2s_infinite]' : ''
            }`}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/6 h-4 bg-[#8c5221] border-b-2 border-amber-950 rounded-b-sm shadow-md z-20 flex items-center justify-center">
                    <div className="w-1/2 h-0.5 bg-amber-600/50 rounded" />
                </div>
                <div className="absolute top-6 left-2 bottom-6 w-1.5 bg-white/35 rounded-full pointer-events-none blur-[0.4px] z-10" />
                <div className="absolute top-6 right-2 bottom-6 w-0.5 bg-white/20 rounded-full pointer-events-none blur-[0.4px] z-10" />

                <div className="absolute inset-0 top-10 bottom-2 left-3 right-3 pointer-events-none">
                    {Array.from({ length: Math.min(100, currentCount) }).map((_, idx) => {
                        const itemsPerRow = 4;
                        const row = Math.floor(idx / itemsPerRow);
                        const col = idx % itemsPerRow;
                        const offsetChance = Math.sin(idx * 7) * 4;
                        const staggerX = (row % 2 === 0) ? 2 : -2;
                        const leftVal = 8 + col * 22 + staggerX + offsetChance;
                        const bottomVal = 2 + row * 14 + (Math.cos(idx * 11) * 2);
                        const rotation = Math.sin(idx * 13) * 45;
                        const itemScale = 0.8 + (Math.abs(Math.cos(idx * 17)) * 0.2);

                        return (
                            <span
                                key={idx}
                                className="absolute text-[0.875rem] leading-snug leading-none select-none transition-all duration-700 animate-[bounce_1s_ease-out_1]"
                                style={{
                                    left: `${leftVal}%`,
                                    bottom: `${bottomVal}px`,
                                    transform: `rotate(${rotation}deg) scale(${itemScale})`,
                                    textShadow: '1px 1px 1.5px rgba(0,0,0,0.1)'
                                }}
                            >
                                {targetIcon}
                            </span>
                        );
                    })}
                </div>

                {currentCount >= targetGoal && (
                    <div className="absolute inset-x-2 bottom-8 top-10 bg-gradient-to-t from-amber-500/90 to-amber-600/95 text-white flex flex-col items-center justify-center p-2 text-center rounded-2xl opacity-100 transition-all z-10 gap-1.5 shadow-xl ring-1 ring-white/20">
                        <Trophy className="text-amber-200 animate-[bounce_1.5s_infinite] drop-shadow-md" size={24} />
                        <span className="text-[0.46875rem] uppercase tracking-widest font-black text-amber-100">GESCHAFFT!</span>
                    </div>
                )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="text-center bg-surface/70 rounded-2xl p-3 border border-border/50">
              <span className="text-[0.625rem] font-black uppercase text-text-muted tracking-wider">Aktuell</span>
              <div className="text-[1.5rem] leading-normal font-black text-text-primary font-mono tracking-tighter">
                {currentCount} <span className="text-[0.875rem] leading-snug text-text-muted">/ {targetGoal}</span>
              </div>
              {app.klassenglas_belohnung && (
                <div className="mt-1 text-[0.625rem] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">
                  Ziel: {app.klassenglas_belohnung}
                </div>
              )}
            </div>

            <button 
              onClick={() => updateMarbles(1)}
              className="bg-amber-400 hover:bg-amber-500 active:scale-95 text-amber-950 font-black py-4 px-2 rounded-2xl cursor-pointer select-none transition-all flex flex-col items-center justify-center gap-1 shadow-[0_4px_14px_0_rgba(245,158,11,0.3)] border border-amber-300"
            >
              <span className="text-[1.25rem] leading-normal">+{targetIcon}</span>
              <span className="text-[0.5625rem] uppercase font-black tracking-widest opacity-80">+1 Hinzufügen</span>
            </button>
          </div>
        </div>

        {/* Missions Section */}
        <div className="mt-4 flex flex-col gap-2">
          {isGenerating ? (
            <div className="bg-surface/50 p-4 rounded-xl border border-border text-center animate-pulse">
              <span className="text-[1.125rem] leading-normal mb-1 block">🤔</span>
              <p className="text-[0.625rem] font-bold text-indigo-500 tracking-wide uppercase">KI überlegt...</p>
            </div>
          ) : aiMissionResult ? (
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-3 rounded-2xl border border-indigo-500/20 shadow-sm relative">
              <button onClick={() => setAiMissionResult(null)} className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-600 transition-colors">
                <X size={14} />
              </button>
              <p className="text-[0.625rem] pr-4 font-bold text-indigo-400 mb-3 italic leading-snug">"{aiMissionResult.message}"</p>
              <div className="space-y-2">
                {aiMissionResult.missions.map((mission: any, idx: number) => (
                  <div key={idx} className="bg-surface p-2.5 rounded-xl border border-indigo-500/20 shadow-sm flex items-start gap-2.5 group">
                    <span className="text-[1.25rem] leading-normal shrink-0 mt-0.5">{mission.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-[0.6875rem] font-black text-text-primary text-wrap leading-tight break-words">{mission.title}</h4>
                        <span className="text-[0.5625rem] font-black text-indigo-500 bg-indigo-500/10 px-1.5 py-0.5 rounded-md shrink-0">+{mission.rewardClassMarbles} 🪙</span>
                      </div>
                      <p className="text-[0.59375rem] text-text-muted font-medium leading-snug mt-0.5 line-clamp-2">{mission.description}</p>
                    </div>
                    <button onClick={() => addAiMission(mission)} className="shrink-0 w-7 h-7 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500 hover:text-white rounded-lg flex items-center justify-center transition-colors shadow-sm self-center">
                      <span className="text-[0.75rem] leading-tight font-black">✓</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {app.klassenglas_missions && app.klassenglas_missions.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.625rem] font-black uppercase tracking-widest text-text-muted font-sans">Aktive Mission</span>
                  </div>
                  {app.klassenglas_missions?.map((miss: any) => (
                    <div key={miss.id} className="bg-surface rounded-xl p-3 border border-border shadow-sm flex items-center justify-between gap-3 relative group">
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.6875rem] font-black text-text-primary leading-snug line-clamp-2" title={miss.title}>{miss.title}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[0.5625rem] font-bold text-text-secondary tracking-wider uppercase">+{miss.rewardClassMarbles || 1} {targetIcon}</span>
                          <span className="text-[0.5625rem] font-black text-indigo-600">{miss.progress || 0}%</span>
                        </div>
                        <div className="mt-1.5 w-full relative">
                          <div className="absolute top-0 left-0 h-1.5 rounded-full bg-indigo-500 pointer-events-none" style={{ width: `${miss.progress || 0}%` }}></div>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5"
                            value={miss.progress || 0} 
                            onChange={(e) => {
                              const newProgress = parseInt(e.target.value);
                              setApp(prev => ({
                                ...prev,
                                klassenglas_missions: prev.klassenglas_missions?.map((m: any) => 
                                  m.id === miss.id ? { ...m, progress: newProgress } : m
                                )
                              }));
                            }}
                            className="w-full h-1.5 bg-surface3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-indigo-600 [&::-webkit-slider-thumb]:shadow-md relative z-10"
                            style={{ WebkitAppearance: 'none', background: 'transparent' }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            updateMarbles(miss.rewardClassMarbles || 1);
                            setApp(prev => ({
                              ...prev,
                              klassenglas_missions: prev.klassenglas_missions?.filter((m: any) => m.id !== miss.id),
                              klassenglas_completed_missions: [
                                { ...miss, completedAt: new Date().toISOString() },
                                ...(prev.klassenglas_completed_missions || [])
                              ]
                            }));
                          }}
                          className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center shrink-0 border border-emerald-500/20"
                          title="Mission abschließen"
                        >
                          <span className="text-[0.875rem] leading-snug font-black text-center mt-0.5">✓</span>
                        </button>
                      </div>
                      <button 
                        onClick={() => {
                          setApp(prev => ({
                            ...prev,
                            klassenglas_missions: prev.klassenglas_missions?.filter((m: any) => m.id !== miss.id)
                          }));
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[0.625rem] font-black shadow-sm"
                        title="Mission löschen"
                      >
                         <X size={12} />
                      </button>
                    </div>
                  ))}
                  
                  <button onClick={handleGenerateAiMissions} className="w-full text-center mt-1 text-[0.5625rem] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-600 flex items-center justify-center gap-1">
                    <span className="text-[0.75rem] leading-tight">✨</span> KI Mission ergänzen
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 mt-1">
                  {showMissionSelect ? (
                    <div className="bg-surface2 rounded-xl p-2 h-[180px] overflow-y-auto space-y-1.5 border border-border shadow-inner relative style-scrollbar">
                      <div className="sticky top-0 bg-surface2 pb-1.5 flex justify-between items-center z-10 w-full mb-1">
                        <span className="text-[0.5625rem] font-black uppercase text-text-muted tracking-wider pl-1">Mission wählen</span>
                        <button onClick={() => setShowMissionSelect(false)} className="text-text-muted hover:text-text-primary bg-surface rounded-full p-0.5 shadow-sm cursor-pointer border-0">
                          <X size={12} />
                        </button>
                      </div>
                      {COMMUNITY_MISSIONS_POOL.map((mission, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setApp(prev => ({
                              ...prev,
                              klassenglas_missions: [
                                ...(prev.klassenglas_missions || []),
                                {
                                  id: mission.id + '-' + Date.now(),
                                  title: `${mission.icon} ${mission.title}`,
                                  description: mission.description,
                                  rewardClassMarbles: mission.rewardClassMarbles,
                                  category: mission.category
                                }
                              ]
                            }));
                            setShowMissionSelect(false);
                          }}
                          className="w-full text-left bg-surface p-2 rounded-lg border border-border hover:border-indigo-500/50 hover:shadow-md transition-all group flex gap-2 cursor-pointer"
                        >
                          <span className="text-[1rem] leading-normal shrink-0">{mission.icon}</span>
                          <div>
                            <div className="text-[0.625rem] font-black text-text-secondary leading-tight group-hover:text-indigo-600">{mission.title}</div>
                            <div className="text-[0.53125rem] font-bold text-amber-500 uppercase tracking-widest mt-0.5">+{mission.rewardClassMarbles} {targetIcon}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowMissionSelect(true)}
                        className="w-full bg-surface2 hover:bg-surface3 text-text-secondary transition-colors rounded-xl border border-border shadow-sm py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span className="text-[0.875rem] leading-snug">🎲</span>
                        <span className="text-[0.625rem] font-black uppercase tracking-widest">WIR-Mission wählen</span>
                      </button>
                      <button onClick={handleGenerateAiMissions} className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 transition-colors rounded-xl border border-indigo-500/30 shadow-sm py-2.5 px-3 flex items-center justify-center gap-2 cursor-pointer">
                        <span className="text-[0.875rem] leading-snug">✨</span>
                        <span className="text-[0.625rem] font-black uppercase tracking-widest">KI Mission vorschlagen</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Area */}
        <div className="mt-auto pt-5">
           <button 
             onClick={() => { if (setPage) setPage('klassengemeinschaft'); }} 
             className="w-full bg-surface hover:bg-surface2 text-text-secondary hover:text-text-primary transition-all rounded-xl border border-border shadow-sm flex items-center justify-center gap-2 py-3 px-4 group cursor-pointer active:scale-[0.98]"
           >
               <span className="text-[0.6875rem] font-black uppercase tracking-widest">Klassenglas Einstellungen ⚙️</span>
           </button>
        </div>

      </div>
    </div>
  );
}
