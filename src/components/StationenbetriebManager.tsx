import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Stationenbetrieb, Station } from '../types';
import { FAECHER_ALLE } from '../constants';
import { 
  Plus, Table, Check, X, ChevronLeft, LayoutGrid, Tag, Trash2, Calendar, 
  BookOpen, Search, ArrowUp, ArrowDown, Sparkles, Filter, Users, 
  TrendingUp, AlertCircle, CheckSquare, RotateCcw, Award, Star, HelpCircle, Settings
} from 'lucide-react';
import { generateId } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

// Color theme mapper matching subject settings
const getFachColors = (fach: string) => {
  const f = (fach || '').toLowerCase();
  if (f.includes('math') || f.includes('rechn')) {
    return {
      bg: 'bg-amber-50/40',
      text: 'text-amber-700',
      border: 'border-amber-200',
      progress: 'bg-amber-500',
      badge: 'bg-amber-100 text-amber-800',
      hover: 'hover:bg-amber-50',
      ring: 'ring-amber-500/20',
      gradient: 'from-amber-500/10 to-amber-600/5'
    };
  }
  if (f.includes('deutsch') || f.includes('lesen') || f.includes('schreib')) {
    return {
      bg: 'bg-rose-50/40',
      text: 'text-rose-700',
      border: 'border-rose-200',
      progress: 'bg-rose-500',
      badge: 'bg-rose-100 text-rose-800',
      hover: 'hover:bg-rose-50',
      ring: 'ring-rose-500/20',
      gradient: 'from-rose-500/10 to-rose-600/5'
    };
  }
  if (f.includes('sach') || f.includes('natur') || f.includes('heimat')) {
    return {
      bg: 'bg-emerald-50/40',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      progress: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800',
      hover: 'hover:bg-emerald-50',
      ring: 'ring-emerald-500/20',
      gradient: 'from-emerald-500/10 to-emerald-600/5'
    };
  }
  if (f.includes('engl') || f.includes('sprache')) {
    return {
      bg: 'bg-sky-50/40',
      text: 'text-sky-700',
      border: 'border-sky-200',
      progress: 'bg-sky-500',
      badge: 'bg-sky-100 text-sky-800',
      hover: 'hover:bg-sky-50',
      ring: 'ring-sky-500/20',
      gradient: 'from-sky-500/10 to-sky-600/5'
    };
  }
  if (f.includes('kunst') || f.includes('zeich') || f.includes('werk') || f.includes('gestalt')) {
    return {
      bg: 'bg-purple-50/40',
      text: 'text-purple-700',
      border: 'border-purple-200',
      progress: 'bg-purple-500',
      badge: 'bg-purple-100 text-purple-800',
      hover: 'hover:bg-purple-50',
      ring: 'ring-purple-500/20',
      gradient: 'from-purple-500/10 to-purple-600/5'
    };
  }
  if (f.includes('musik') || f.includes('gesang') || f.includes('ton')) {
    return {
      bg: 'bg-fuchsia-50/40',
      text: 'text-fuchsia-700',
      border: 'border-fuchsia-200',
      progress: 'bg-fuchsia-500',
      badge: 'bg-fuchsia-100 text-fuchsia-800',
      hover: 'hover:bg-fuchsia-50',
      ring: 'ring-fuchsia-500/20',
      gradient: 'from-fuchsia-500/10 to-fuchsia-600/5'
    };
  }
  if (f.includes('sport') || f.includes('beweg') || f.includes('turn')) {
    return {
      bg: 'bg-cyan-50/40',
      text: 'text-cyan-700',
      border: 'border-cyan-200',
      progress: 'bg-cyan-500',
      badge: 'bg-cyan-100 text-cyan-800',
      hover: 'hover:bg-cyan-50',
      ring: 'ring-cyan-500/20',
      gradient: 'from-cyan-500/10 to-cyan-600/5'
    };
  }
  if (f.includes('relig') || f.includes('ethik')) {
    return {
      bg: 'bg-amber-50/40',
      text: 'text-amber-800',
      border: 'border-amber-200',
      progress: 'bg-amber-600',
      badge: 'bg-amber-100 text-amber-900',
      hover: 'hover:bg-amber-50',
      ring: 'ring-amber-600/20',
      gradient: 'from-amber-600/10 to-amber-700/5'
    };
  }
  return {
    bg: 'bg-indigo-50/40',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    progress: 'bg-indigo-500',
    badge: 'bg-indigo-100 text-indigo-800',
    hover: 'hover:bg-indigo-50',
    ring: 'ring-indigo-500/20',
    gradient: 'from-indigo-500/10 to-indigo-600/5'
  };
};

export function StationenbetriebManager() {
  const { app, setApp } = useApp();
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeViewMode, setActiveViewMode] = useState<'matrix' | 'config'>('matrix');
  const [studentSearch, setStudentSearch] = useState('');
  const [hoveredCell, setHoveredCell] = useState<{ studentId: string; stationId: string } | null>(null);
  
  // High-fidelity tracking of students needing assistance ("Hilfebedarf")
  const [hilfeBedarf, setHilfeBedarf] = useState<Record<string, Record<string, boolean>>>({});

  const betriebe = app.stationenbetriebe || [];
  const students = app.schueler || [];
  const activePlan = betriebe.find(b => b.id === activePlanId);
  const zoomLevel = app.settings?.zoomLevel || 'standard';

  const createPlan = () => {
    const newPlan: Stationenbetrieb = {
      id: generateId(),
      titel: 'Neuer Stationenbetrieb',
      datum: new Date().toISOString().split('T')[0],
      fach: 'Sachunterricht',
      stationen: [
        { id: generateId(), name: 'Station 1', typ: 'pflicht' }
      ],
      erledigt: {}
    };
    setApp(prev => ({
      ...prev,
      stationenbetriebe: [...(prev.stationenbetriebe || []), newPlan]
    }));
    setActivePlanId(newPlan.id);
  };

  const deletePlan = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Stationenbetrieb wirklich löschen?')) {
      setApp(prev => ({
        ...prev,
        stationenbetriebe: (prev.stationenbetriebe || []).filter(b => b.id !== id)
      }));
      if (activePlanId === id) setActivePlanId(null);
    }
  };

  const updatePlan = (updates: Partial<Stationenbetrieb>) => {
    if (!activePlanId) return;
    setApp(prev => ({
      ...prev,
      stationenbetriebe: (prev.stationenbetriebe || []).map(b => 
        b.id === activePlanId ? { ...b, ...updates } : b
      )
    }));
  };

  const toggleErledigt = (studentId: string, stationId: string) => {
    if (!activePlanId || !activePlan) return;
    const current = activePlan.erledigt[studentId]?.[stationId] || false;
    
    // Clear need for help if checked complete
    if (!current) {
      setHilfeBedarf(prev => {
        const studentFlags = { ...(prev[studentId] || {}) };
        delete studentFlags[stationId];
        return { ...prev, [studentId]: studentFlags };
      });
    }

    setApp(prev => {
      const plans = [...(prev.stationenbetriebe || [])];
      const pIdx = plans.findIndex(b => b.id === activePlanId);
      if (pIdx === -1) return prev;
      
      const newPlan = { ...plans[pIdx] };
      newPlan.erledigt = { ...newPlan.erledigt };
      if (!newPlan.erledigt[studentId]) {
        newPlan.erledigt[studentId] = {};
      }
      newPlan.erledigt[studentId] = {
        ...newPlan.erledigt[studentId],
        [stationId]: !current
      };
      
      plans[pIdx] = newPlan;
      return { ...prev, stationenbetriebe: plans };
    });
  };

  const toggleNeedHelp = (studentId: string, stationId: string, e: React.MouseEvent) => {
    e.preventDefault(); // prevent default behavior
    e.stopPropagation();
    // Only allow setting help state if not already marked complete
    if (activePlan?.erledigt[studentId]?.[stationId]) return;

    setHilfeBedarf(prev => {
      const current = prev[studentId]?.[stationId] || false;
      return {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          [stationId]: !current
        }
      };
    });
  };

  const addStation = (typ: 'pflicht' | 'kuer') => {
    if (!activePlanId || !activePlan) return;
    const newStation: Station = {
      id: generateId(),
      name: `${typ === 'pflicht' ? 'Pflichtaufgabe' : 'Zusatzaufgabe'} ${activePlan.stationen.length + 1}`,
      typ
    };
    updatePlan({ stationen: [...activePlan.stationen, newStation] });
  };

  const updateStation = (stationId: string, name: string) => {
    if (!activePlanId || !activePlan) return;
    updatePlan({
      stationen: activePlan.stationen.map(s => s.id === stationId ? { ...s, name } : s)
    });
  };

  const deleteStation = (stationId: string) => {
    if (!activePlanId || !activePlan) return;
    updatePlan({
      stationen: activePlan.stationen.filter(s => s.id !== stationId)
    });
  };

  const moveStation = (index: number, direction: 'up' | 'down') => {
    if (!activePlanId || !activePlan) return;
    const newStationen = [...activePlan.stationen];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newStationen.length) return;
    
    const temp = newStationen[index];
    newStationen[index] = newStationen[targetIdx];
    newStationen[targetIdx] = temp;
    
    updatePlan({ stationen: newStationen });
  };

  const setAllStudentsStationStatus = (stationId: string, value: boolean) => {
    if (!activePlanId || !activePlan) return;
    const confirmMsg = value 
      ? `Möchtest du diese Station für alle Schüler:innen als erledigt markieren?`
      : `Möchtest du diese Station für alle Schüler:innen zurücksetzen?`;
    
    if (!window.confirm(confirmMsg)) return;

    // Clear help flags if completing
    if (value) {
      setHilfeBedarf(prev => {
        const updated = { ...prev };
        students.forEach(st => {
          if (updated[st.id]) {
            const copy = { ...updated[st.id] };
            delete copy[stationId];
            updated[st.id] = copy;
          }
        });
        return updated;
      });
    }

    setApp(prev => {
      const plans = [...(prev.stationenbetriebe || [])];
      const pIdx = plans.findIndex(b => b.id === activePlanId);
      if (pIdx === -1) return prev;
      
      const newPlan = { ...plans[pIdx] };
      newPlan.erledigt = { ...newPlan.erledigt };
      
      students.forEach(student => {
        if (!newPlan.erledigt[student.id]) {
          newPlan.erledigt[student.id] = {};
        }
        newPlan.erledigt[student.id] = {
          ...newPlan.erledigt[student.id],
          [stationId]: value
        };
      });
      
      plans[pIdx] = newPlan;
      return { ...prev, stationenbetriebe: plans };
    });
  };

  const setStudentAllPflichtStatus = (studentId: string, value: boolean) => {
    if (!activePlanId || !activePlan) return;
    
    // Clear help flags for Pflicht tasks of this student if setting to complete
    if (value) {
      setHilfeBedarf(prev => {
        const updated = { ...prev };
        if (updated[studentId]) {
          const studentFlags = { ...updated[studentId] };
          activePlan.stationen.forEach(station => {
            if (station.typ === 'pflicht') {
              delete studentFlags[station.id];
            }
          });
          updated[studentId] = studentFlags;
        }
        return updated;
      });
    }

    setApp(prev => {
      const plans = [...(prev.stationenbetriebe || [])];
      const pIdx = plans.findIndex(b => b.id === activePlanId);
      if (pIdx === -1) return prev;
      
      const newPlan = { ...plans[pIdx] };
      newPlan.erledigt = { ...newPlan.erledigt };
      
      if (!newPlan.erledigt[studentId]) {
        newPlan.erledigt[studentId] = {};
      }
      
      activePlan.stationen.forEach(station => {
        if (station.typ === 'pflicht') {
          newPlan.erledigt[studentId][station.id] = value;
        }
      });
      
      plans[pIdx] = newPlan;
      return { ...prev, stationenbetriebe: plans };
    });
  };

  // Calculates overall completion of compulsory tasks across the class (0-100)
  const getOverallPflichtCompletion = (plan: Stationenbetrieb) => {
    const pflichtStations = plan.stationen.filter(s => s.typ === 'pflicht');
    const totalPflichtCount = students.length * pflichtStations.length;
    if (totalPflichtCount === 0) return 0;
    
    let completedCount = 0;
    students.forEach(student => {
      pflichtStations.forEach(station => {
        if (plan.erledigt[student.id]?.[station.id]) {
          completedCount++;
        }
      });
    });
    return Math.round((completedCount / totalPflichtCount) * 100);
  };

  // Calculates details for the Bento Grid dashboard
  const getBentoStats = () => {
    if (!activePlan || students.length === 0) return null;
    const pflichtStations = activePlan.stationen.filter(s => s.typ === 'pflicht');
    const allStations = activePlan.stationen;
    
    const overallRate = getOverallPflichtCompletion(activePlan);
    
    // Student rankings (Pflicht + Kür combined)
    const studentCompletions = students.map(student => {
      const completedCount = allStations.filter(s => activePlan.erledigt[student.id]?.[s.id]).length;
      return { student, completedCount };
    });
    const sortedStudents = [...studentCompletions].sort((a, b) => b.completedCount - a.completedCount);
    const topStudents = sortedStudents.slice(0, 2).filter(x => x.completedCount > 0);

    // Station difficulty statistics
    const stationStats = allStations.map(station => {
      const completedCount = students.filter(student => activePlan.erledigt[student.id]?.[station.id]).length;
      const rate = students.length > 0 ? (completedCount / students.length) * 100 : 0;
      return { station, completedCount, rate };
    });

    const pflichtStatsOnly = stationStats.filter(s => s.station.typ === 'pflicht');
    
    // Hardest station (lowest completion rate among Pflicht tasks)
    let hardestStation = null;
    if (pflichtStatsOnly.length > 0) {
      hardestStation = [...pflichtStatsOnly].sort((a, b) => a.rate - b.rate)[0];
    }

    // Easiest station (highest completion rate)
    let easiestStation = null;
    if (stationStats.length > 0) {
      easiestStation = [...stationStats].sort((a, b) => b.rate - a.rate)[0];
    }

    // Number of active help requests
    let helpCount = 0;
    students.forEach(st => {
      if (hilfeBedarf[st.id]) {
        Object.values(hilfeBedarf[st.id]).forEach(val => {
          if (val) helpCount++;
        });
      }
    });

    return {
      overallRate,
      topStudents,
      hardestStation,
      easiestStation,
      helpCount
    };
  };

  const bento = getBentoStats();

  // Filters students based on search string
  const filteredStudents = students.filter(s => {
    const term = studentSearch.toLowerCase().trim();
    if (!term) return true;
    return s.vorname.toLowerCase().includes(term) || s.nachname.toLowerCase().includes(term);
  });

  return (
    <div className="h-full bg-slate-50 flex flex-col relative">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-[110] w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
            <LayoutGrid size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-tight whitespace-nowrap">Lernwerkstatt &amp; Stationen</h1>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Übersicht und Fortschritts-Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activePlanId ? (
            <button 
              onClick={() => { setActivePlanId(null); setStudentSearch(''); }} 
              className="btn bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shrink-0 gap-1.5"
            >
              <ChevronLeft size={16} /> Zurück zur Übersicht
            </button>
          ) : (
            <button onClick={createPlan} className="btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shrink-0 gap-1.5">
              <Plus size={16} /> Neuer Stationenbetrieb
            </button>
          )}
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
        {!activePlanId ? (
          <div className="max-w-5xl mx-auto space-y-8">
            {betriebe.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm border-dashed">
                <LayoutGrid size={48} className="mx-auto text-indigo-200 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 mb-2">Keine Stationenbetriebe vorhanden</h3>
                <p className="text-sm text-slate-500 mb-6">Erstelle deinen ersten Stationenbetrieb, um den Fortschritt deiner Klasse zu tracken.</p>
                <button onClick={createPlan} className="btn bg-indigo-600 hover:bg-indigo-700 text-white shadow-md mx-auto">
                  <Plus size={16} /> Jetzt erstellen
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {betriebe.map(plan => {
                  const colors = getFachColors(plan.fach);
                  const completion = getOverallPflichtCompletion(plan);
                  const pflichtCount = plan.stationen.filter(s => s.typ === 'pflicht').length;
                  const kuerCount = plan.stationen.filter(s => s.typ === 'kuer').length;
                  
                  return (
                    <motion.div 
                      key={plan.id}
                      onClick={() => setActivePlanId(plan.id)}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className={`bg-white rounded-2xl border border-slate-150 p-6 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group flex flex-col justify-between relative overflow-hidden`}
                    >
                      {/* Subject Color Splash Ribbon */}
                      <div className={`absolute top-0 inset-x-0 h-1 ${colors.progress}`} />

                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${colors.badge} ${colors.border}`}>
                            {plan.fach}
                          </span>
                          <button 
                            onClick={(e) => deletePlan(plan.id, e)} 
                            className="text-slate-300 hover:text-red-500 hover:bg-slate-50 p-1.5 rounded-full transition-all shrink-0"
                            title="Löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <h3 className="font-bold text-slate-800 text-lg mb-1 truncate group-hover:text-indigo-600 transition-colors">{plan.titel}</h3>
                        
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-5 font-semibold">
                          <Calendar size={13} className="text-slate-400" /> 
                          {new Date(plan.datum).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>

                      {/* Micro Progress Bar */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span>Klassen-Fortschritt</span>
                          <span className={`${colors.text} font-black`}>{completion}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${completion}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full ${colors.progress} rounded-full`}
                          />
                        </div>

                        <div className="flex gap-2 pt-2">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold tracking-tight">{pflichtCount} Pflicht-Aufgaben</span>
                          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold tracking-tight">{kuerCount} Kür-Aufgaben</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activePlan ? (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Active Plan Header Bar with Custom Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${getFachColors(activePlan.fach).badge} ${getFachColors(activePlan.fach).border}`}>
                  {activePlan.fach}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 leading-tight">{activePlan.titel}</h2>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">
                    {new Date(activePlan.datum).toLocaleDateString('de-AT', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto shadow-inner">
                <button
                  onClick={() => setActiveViewMode('matrix')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeViewMode === 'matrix' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table size={13} /> Tracker &amp; Analyse
                </button>
                <button
                  onClick={() => setActiveViewMode('config')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeViewMode === 'config' 
                      ? 'bg-white text-indigo-600 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Settings size={13} /> Stationen &amp; Settings
                </button>
              </div>
            </div>

            {/* Conditionally Render CONFIG tab */}
            {activeViewMode === 'config' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Workshop Settings */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                      <CheckSquare size={16} className="text-indigo-500" /> Grundeinstellungen
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Titel der Lernwerkstatt</label>
                        <input 
                          type="text" 
                          value={activePlan.titel} 
                          onChange={(e) => updatePlan({ titel: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-base font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                          placeholder="z.B. Lernwerkstatt Frühling"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Datum</label>
                          <input 
                            type="date" 
                            value={activePlan.datum} 
                            onChange={(e) => updatePlan({ datum: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.6875rem] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Fachbereich</label>
                          <select 
                            value={activePlan.fach} 
                            onChange={(e) => updatePlan({ fach: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 font-bold text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner cursor-pointer"
                          >
                            {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-semibold">
                    <span>Gesamtfortschritt der Klasse:</span>
                    <span className="font-extrabold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-[10px]">{bento?.overallRate}%</span>
                  </div>
                </div>

                {/* Right Column: Manage Stations */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Tag size={15} className="text-indigo-500" /> Stationen ({activePlan.stationen.length})
                      </h3>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => addStation('pflicht')} 
                          className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg font-black transition-colors border border-indigo-100 uppercase tracking-wider"
                        >
                          + Pflicht
                        </button>
                        <button 
                          onClick={() => addStation('kuer')} 
                          className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-black transition-colors border border-emerald-100 uppercase tracking-wider"
                        >
                          + Kür
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto max-h-[195px] space-y-2 pr-1 custom-scrollbar">
                      {activePlan.stationen.map((station, i) => (
                        <div key={station.id} className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/50 p-1.5 rounded-xl border border-slate-150 transition-all">
                          <div className={`w-1.5 h-6 rounded-full shrink-0 ${station.typ === 'pflicht' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                          <span className="text-[10px] font-black text-slate-400 w-3 text-center shrink-0">{i+1}</span>
                          <input 
                            type="text"
                            value={station.name}
                            onChange={(e) => updateStation(station.id, e.target.value)}
                            className="flex-1 bg-transparent border-none py-0.5 px-1 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none rounded min-w-0"
                            placeholder={`Station ${i+1}`}
                          />
                          
                          {/* Sort buttons */}
                          <div className="flex shrink-0">
                            <button 
                              disabled={i === 0} 
                              onClick={() => moveStation(i, 'up')}
                              className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                              title="Nach oben verschieben"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              disabled={i === activePlan.stationen.length - 1} 
                              onClick={() => moveStation(i, 'down')}
                              className="p-1 text-slate-300 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                              title="Nach unten verschieben"
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>

                          <button 
                            onClick={() => deleteStation(station.id)} 
                            className="text-slate-300 hover:text-red-500 hover:bg-white p-1 rounded-md transition-all shrink-0"
                            title="Löschen"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {activePlan.stationen.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-6">
                          Noch keine Stationen angelegt.<br />Klicke oben auf + Pflicht oder + Kür.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conditionally Render MATRIX & STATS tab */}
            {activeViewMode === 'matrix' && (
              <>
                {/* BENTO STATISTICS GRID (High-Fidelity Dashboard Row) */}
                {bento && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Overall compulsory completion ring */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Klassenschnitt (Pflicht)</span>
                    <span className="text-2xl font-black text-indigo-600 block">{bento.overallRate}%</span>
                    <span className="text-[10px] text-slate-400 font-semibold block">Erledigt-Schnitt der Klasse</span>
                  </div>
                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="28" cy="28" r="23" stroke="#f1f5f9" strokeWidth="4.5" fill="transparent" />
                      <circle cx="28" cy="28" r="23" stroke="#4f46e5" strokeWidth="4.5" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 23}
                        strokeDashoffset={2 * Math.PI * 23 * (1 - bento.overallRate / 100)}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black text-slate-600">{bento.overallRate}%</span>
                  </div>
                </div>

                {/* 2. Top Solvers / Lern-Champions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Lern-Champions</span>
                    <Award size={14} className="text-amber-500" />
                  </div>
                  {bento.topStudents.length > 0 ? (
                    <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                      {bento.topStudents.map((item, idx) => (
                        <div key={item.student.id} className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span className="truncate flex items-center gap-1.5">
                            <span className="text-[10px] text-amber-500 font-black">{idx === 0 ? '🏆' : '🥈'}</span>
                            {item.student.vorname} {item.student.nachname.charAt(0)}.
                          </span>
                          <span className="text-emerald-600 text-[11px] shrink-0 font-extrabold bg-emerald-50 px-1.5 py-0.5 rounded">
                            {item.completedCount} / {activePlan.stationen.length}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2">Noch keine Stationen abgeschlossen.</div>
                  )}
                </div>

                {/* 3. Hardest Station (Lowest completion among core) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fokus-Zone (Klassen-Baustelle)</span>
                    <AlertCircle size={14} className="text-rose-500" />
                  </div>
                  {bento.hardestStation ? (
                    <div className="space-y-1 flex-1 flex flex-col justify-center">
                      <span className="text-xs font-black text-slate-800 truncate block">
                        {bento.hardestStation.station.name}
                      </span>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>Lösungsquote:</span>
                        <span className="text-rose-600 font-extrabold">{Math.round(bento.hardestStation.rate)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${bento.hardestStation.rate}%` }} />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic py-2">Keine Pflichtstationen vorhanden.</div>
                  )}
                </div>

                {/* 4. Help Request / Active Status Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hilfebedarf & Fragen</span>
                    <span className={`text-2xl font-black block ${bento.helpCount > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-700'}`}>
                      {bento.helpCount} {bento.helpCount === 1 ? 'Kind' : 'Kinder'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold block truncate">Aktive Markierungen (Rechtsklick)</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${bento.helpCount > 0 ? 'bg-amber-100 text-amber-600 animate-bounce' : 'bg-slate-50 text-slate-400'}`}>
                    <HelpCircle size={18} />
                  </div>
                </div>
              </div>
            )}

            {/* MATRIX TRACKER GRID CONTAINER */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              {/* Matrix Control Bar (Filters & Tools) */}
              <div className="px-6 py-4 border-b border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40">
                <div className="relative w-full sm:w-72 shrink-0">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Schüler:in suchen..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
                  />
                  {studentSearch && (
                    <button 
                      onClick={() => setStudentSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-indigo-500" /> Pflichtstation
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Kürstation
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500" /> Hilfebedarf (Rechtsklick)
                  </div>
                </div>
              </div>

              {/* Scrollable table matrix with custom zoom level modifiers */}
              <div className="overflow-x-auto hide-scrollbar">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead>
                    <tr className="border-b border-slate-200">
                      
                      {/* Name Header Column */}
                      <th className="sticky left-0 z-40 bg-white border-r border-slate-200 p-4 min-w-[210px] shadow-[4px_0_12px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-2">Schüler:in</span>
                          <span className="text-[10px] font-bold text-slate-400 tracking-tight mr-1">Aktionen</span>
                        </div>
                      </th>
                      
                      {/* Stations Columns */}
                      {activePlan.stationen.map((station, i) => {
                        const completedStudentsCount = students.filter(student => activePlan.erledigt[student.id]?.[station.id]).length;
                        const completePercent = students.length > 0 ? Math.round((completedStudentsCount / students.length) * 100) : 0;
                        const isCore = station.typ === 'pflicht';

                        return (
                          <th 
                            key={station.id} 
                            className="p-3 min-w-[100px] max-w-[120px] text-center bg-slate-50/30 border-r border-slate-100 last:border-r-0 relative group/colHeader"
                          >
                            <div className="flex flex-col items-center gap-1 w-full mx-auto">
                              
                              {/* Type badge */}
                              <span className={`text-[8px] uppercase font-black tracking-widest px-1.5 py-0.5 rounded-md ${isCore ? 'bg-indigo-50 text-indigo-700 border border-indigo-100/50' : 'bg-emerald-50 text-emerald-700 border border-emerald-100/50'}`}>
                                {isCore ? 'Pflicht' : 'Kür'}
                              </span>

                              {/* Station Index & Custom name input */}
                              <div className="text-[11px] font-extrabold text-slate-800 truncate w-full px-1 flex items-center justify-center gap-0.5 mt-0.5" title={station.name}>
                                <span className="text-[10px] text-slate-400 font-bold">{i+1}.</span> {station.name}
                              </div>

                              {/* Station class rate micro indicator */}
                              <span className="text-[9px] text-slate-400 font-extrabold tracking-tight mt-0.5">
                                {completedStudentsCount} erledigt ({completePercent}%)
                              </span>

                              {/* Column batch controls (dropdown trigger/shortcuts) on hover */}
                              <div className="flex gap-1.5 opacity-0 group-hover/colHeader:opacity-100 transition-all pt-1 print:hidden">
                                <button 
                                  onClick={() => setAllStudentsStationStatus(station.id, true)}
                                  className="text-[9px] bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 px-1.5 py-0.5 rounded font-black shadow-3xs"
                                  title="Spalte für alle abschließen"
                                >
                                  Alle
                                </button>
                                <button 
                                  onClick={() => setAllStudentsStationStatus(station.id, false)}
                                  className="text-[9px] bg-white border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-slate-50 px-1 py-0.5 rounded font-black shadow-3xs"
                                  title="Spalte zurücksetzen"
                                >
                                  <RotateCcw size={10} />
                                </button>
                              </div>

                            </div>
                          </th>
                        );
                      })}

                      {/* Summary column */}
                      <th className="p-4 w-[120px] text-center bg-slate-50/70">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Fortschritt</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student, sIdx) => {
                      const pflichtTotal = activePlan.stationen.filter(s => s.typ === 'pflicht').length;
                      const pflichtErledigt = activePlan.stationen.filter(s => s.typ === 'pflicht').filter(s => activePlan.erledigt[student.id]?.[s.id]).length;
                      const kuerTotal = activePlan.stationen.filter(s => s.typ === 'kuer').length;
                      const kuerErledigt = activePlan.stationen.filter(s => s.typ === 'kuer').filter(s => activePlan.erledigt[student.id]?.[s.id]).length;
                      
                      const isFullyDonePflicht = pflichtTotal > 0 && pflichtErledigt === pflichtTotal;
                      const globalIndex = students.findIndex(s => s.id === student.id) + 1;

                      return (
                        <tr 
                          key={student.id} 
                          className="group hover:bg-slate-50/30 transition-colors"
                        >
                          {/* Student Name Sticky Cell */}
                          <td className="sticky left-0 z-30 bg-white group-hover:bg-slate-50 border-b border-r border-slate-200 p-3 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                            <div className="flex items-center justify-between pl-3 pr-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-[11px] font-bold text-slate-300 w-4 text-right tabular-nums shrink-0">{globalIndex}.</span>
                                <span className="font-extrabold text-slate-700 text-sm truncate">
                                  {student.vorname} {student.nachname}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                {isFullyDonePflicht && (
                                  <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="text-emerald-500 font-extrabold text-xs" 
                                    title="Alle Pflichtaufgaben abgeschlossen"
                                  >
                                    🎉
                                  </motion.span>
                                )}
                                
                                {/* Row shortcut */}
                                <button 
                                  onClick={() => setStudentAllPflichtStatus(student.id, !isFullyDonePflicht)}
                                  className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${isFullyDonePflicht ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'} transition-colors opacity-0 group-hover:opacity-100`}
                                  title={isFullyDonePflicht ? "Alle Pflichtaufgaben zurücksetzen" : "Alle Pflichtaufgaben erledigen"}
                                >
                                  {isFullyDonePflicht ? 'Reset' : 'Alle Pf.'}
                                </button>
                              </div>
                            </div>
                          </td>
                          
                          {/* Stations matrix inputs */}
                          {activePlan.stationen.map((station) => {
                            const isErledigt = activePlan.erledigt[student.id]?.[station.id];
                            const needsHelp = hilfeBedarf[student.id]?.[station.id];
                            
                            // Crosshair highlighting
                            const isHovered = hoveredCell && (hoveredCell.studentId === student.id || hoveredCell.stationId === station.id);
                            const isExactHovered = hoveredCell && hoveredCell.studentId === student.id && hoveredCell.stationId === station.id;

                            return (
                              <td 
                                key={station.id} 
                                onMouseEnter={() => setHoveredCell({ studentId: student.id, stationId: station.id })}
                                onMouseLeave={() => setHoveredCell(null)}
                                className={`border-b border-slate-100 p-2 text-center border-r last:border-r-0 border-r-slate-50 transition-colors ${isExactHovered ? 'bg-indigo-100/10' : isHovered ? 'bg-slate-100/20' : ''}`}
                              >
                                <motion.button
                                  whileHover={{ scale: 1.15 }}
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => toggleErledigt(student.id, station.id)}
                                  onContextMenu={(e) => toggleNeedHelp(student.id, station.id, e)}
                                  className={`w-8 h-8 rounded-xl mx-auto flex flex-col items-center justify-center relative transition-all shadow-3xs ${
                                    isErledigt 
                                      ? station.typ === 'pflicht' 
                                          ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30' 
                                          : 'bg-emerald-600 text-white ring-2 ring-emerald-500/30'
                                      : needsHelp
                                        ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-400/40 animate-pulse border-amber-300'
                                        : 'bg-slate-100 text-slate-300 hover:bg-slate-200/80 hover:text-slate-400 border border-slate-200/10'
                                  }`}
                                  title={isErledigt ? "Als unvollständig markieren" : "Erledigt (Rechtsklick für Hilfe-Marker)"}
                                >
                                  {needsHelp && !isErledigt ? (
                                    <HelpCircle size={14} strokeWidth={3.5} className="animate-spin-slow text-amber-900" />
                                  ) : (
                                    <Check size={16} strokeWidth={isErledigt ? 3.5 : 2} className={isErledigt ? 'opacity-100' : 'opacity-0 hover:opacity-20'} />
                                  )}

                                  {/* Custom tiny helper dots */}
                                  {needsHelp && !isErledigt && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 border border-white flex items-center justify-center animate-ping" />
                                  )}
                                </motion.button>
                              </td>
                            );
                          })}
                          
                          {/* Summary cell */}
                          <td className="border-b border-slate-150 p-2 text-center bg-slate-50/30">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                                <span className="font-extrabold text-indigo-600">Pf: {pflichtErledigt}/{pflichtTotal}</span>
                                {kuerTotal > 0 && <span className="text-emerald-600 font-extrabold">K: {kuerErledigt}/{kuerTotal}</span>}
                              </div>
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${isFullyDonePflicht ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                                  style={{ width: `${pflichtTotal > 0 ? (pflichtErledigt / pflichtTotal) * 100 : 0}%` }} 
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={activePlan.stationen.length + 2} className="p-12 text-center text-sm font-semibold text-slate-400 italic">
                          {students.length === 0 
                            ? 'Keine Schüler:innen in dieser Klasse angelegt.' 
                            : 'Keine Übereinstimmung für die Suche.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

            </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
