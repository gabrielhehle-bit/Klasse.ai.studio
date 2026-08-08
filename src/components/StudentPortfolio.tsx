import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student, PortfolioEntry } from '../types';
import { Plus, Image as ImageIcon, Camera, Trash2, Calendar, Star, Info, Check, Map, Award, Wand2, Sparkles, Compass, Heart, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { LERNZIELE_BY_STUFE } from './LernzielTracker';
import { analyzePortfolioEntryForGoals } from '../services/aiService';

const getFachStyles = (fachName: string) => {
  const name = (fachName || '').toLowerCase();
  if (name.includes('math') || name.includes('rechnen')) {
    return 'bg-blue-50/80 text-blue-700 border-blue-100/80 hover:bg-blue-100/50';
  }
  if (name.includes('deutsch') || name.includes('lesen') || name.includes('schreiben') || name.includes('rechtschreiben') || name.includes('sprache')) {
    return 'bg-rose-50/80 text-rose-700 border-rose-100/80 hover:bg-rose-100/50';
  }
  if (name.includes('sach') || name.includes('natur') || name.includes('umwelt') || name.includes('kosmisch')) {
    return 'bg-emerald-50/80 text-emerald-700 border-emerald-100/80 hover:bg-emerald-100/50';
  }
  if (name.includes('eng') || name.includes('fremd')) {
    return 'bg-purple-50/80 text-purple-700 border-purple-100/80 hover:bg-purple-100/50';
  }
  if (name.includes('musik') || name.includes('gesang')) {
    return 'bg-pink-50/80 text-pink-700 border-pink-100/80 hover:bg-pink-100/50';
  }
  if (name.includes('kunst') || name.includes('zeich') || name.includes('werk') || name.includes('bild')) {
    return 'bg-amber-50/80 text-amber-700 border-amber-100/80 hover:bg-amber-100/50';
  }
  if (name.includes('sport') || name.includes('turn') || name.includes('beweg')) {
    return 'bg-cyan-50/80 text-cyan-700 border-cyan-100/80 hover:bg-cyan-100/50';
  }
  return 'bg-slate-50/80 text-slate-700 border-slate-100 hover:bg-slate-100/50';
};

export default function StudentPortfolio({ schuelerId }: { schuelerId: string }) {
  const { app, setApp } = useApp();
  const student = app.schueler.find(s => s.id === schuelerId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAdding, setIsAdding] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<PortfolioEntry>>({
    titel: '',
    beschreibung: '',
    isInKEL: false,
    tags: ['Sonstiges']
  });

  // Filter and display state
  const [activeFilter, setActiveFilter] = useState<string>('Alle');

  if (!student) return null;

  const portfolio = student.portfolio || [];

  const ikmRecord = (app.ikmRecords || []).find((r: any) => r.schuelerId === schuelerId);
  let ikmLernpfad: any = null;
  if (ikmRecord && ikmRecord.kommentar) {
    try {
      ikmLernpfad = JSON.parse(ikmRecord.kommentar);
    } catch (e) {}
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setNewEntry(prev => ({ ...prev, bildUrl: event.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!newEntry.titel) return;

    const entry: PortfolioEntry = {
      id: crypto.randomUUID(),
      datum: new Date().toISOString(),
      titel: newEntry.titel,
      beschreibung: newEntry.beschreibung,
      bildUrl: newEntry.bildUrl,
      isInKEL: newEntry.isInKEL,
      tags: newEntry.tags || ['Sonstiges']
    };

    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => {
        if (s.id === schuelerId) {
          return {
            ...s,
            portfolio: [entry, ...(s.portfolio || [])]
          }
        }
        return s;
      })
    }));

    setIsAdding(false);
    setNewEntry({
      titel: '',
      beschreibung: '',
      isInKEL: false,
      tags: ['Sonstiges']
    });
  };

  const deleteEntry = (entryId: string) => {
    if(!confirm("Eintrag wirklich löschen?")) return;
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => {
        if (s.id === schuelerId) {
          return {
            ...s,
            portfolio: (s.portfolio || []).filter(p => p.id !== entryId)
          }
        }
        return s;
      })
    }));
  };

  const toggleKEL = (entryId: string) => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => {
        if (s.id === schuelerId) {
          return {
            ...s,
            portfolio: (s.portfolio || []).map(p => 
              p.id === entryId ? {...p, isInKEL: !p.isInKEL} : p
            )
          }
        }
        return s;
      })
    }));
  };

  const analyzeEntry = async (entry: PortfolioEntry) => {
    setAnalyzingId(entry.id);
    try {
      const stufe = student?.niveau || 1;
      const allGoalsObj = LERNZIELE_BY_STUFE[stufe] || {};
      const availableGoals: {id: string, text: string, fach: string}[] = [];
      Object.keys(allGoalsObj).forEach(fach => {
        allGoalsObj[fach].forEach(g => availableGoals.push({ ...g, fach }));
      });
      
      const matchedIds = await analyzePortfolioEntryForGoals(entry.titel, entry.beschreibung || '', availableGoals);
      
      if (matchedIds && matchedIds.length > 0) {
        const matched = matchedIds.map(id => availableGoals.find(g => g.id === id)).filter(Boolean) as any[];
        
        setApp(prev => ({
          ...prev,
          schueler: prev.schueler.map(s => {
            if (s.id === schuelerId) {
              return {
                ...s,
                portfolio: (s.portfolio || []).map(p => 
                  p.id === entry.id ? {...p, matchedLernziele: matched} : p
                )
              }
            }
            return s;
          })
        }));
      } else {
        alert("Keine eindeutigen Lernziele für diesen Eintrag gefunden.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setAnalyzingId(null);
    }
  };

  const addGoalToStudent = (goal: any) => {
      setApp(prev => ({
          ...prev,
          schuelerGoals: [
              ...(prev.schuelerGoals || []),
              {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  schuelerId: schuelerId,
                  bereich: 'schule',
                  zielText: goal.text,
                  datum: new Date().toISOString().split('T')[0],
                  status: 'aktiv'
              }
          ]
      }));
      alert(`Ziel "${goal.text}" zum Schüler-Portfolio hinzugefügt.`);
  };

  const kelHighlights = portfolio.filter(p => p.isInKEL);

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.02)] space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen size={18} />
            </span>
            <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">E-Portfolio & Timeline</h3>
          </div>
          <p className="text-[0.75rem] leading-tight font-bold text-slate-400 mt-1 pl-8">Sammlung von Kunstwerken, Heften & Erfolgen von {student.vorname}</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[0.75rem] leading-tight font-black transition-all shadow-md active:scale-95 ${
            isAdding 
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-100'
          } cursor-pointer`}
        >
          {isAdding ? <Info size={14} /> : <Plus size={14} />} {isAdding ? 'Abbrechen' : 'Neuer Eintrag'}
        </button>
      </div>

      {/* KEL Highlights Premium Section */}
      {kelHighlights.length > 0 && (
        <div className="bg-gradient-to-br from-amber-500/5 to-amber-600/10 border border-amber-200/60 rounded-3xl p-5 md:p-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-500 shadow-[0_4px_25px_rgba(245,158,11,0.02)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-600">
                <Star size={16} className="fill-amber-500 text-amber-500" />
              </div>
              <div>
                <h4 className="text-[0.875rem] font-black text-amber-950 tracking-tight leading-none">KEL-Schlüsselmomente & Highlights</h4>
                <p className="text-[0.6875rem] text-amber-800/80 font-bold mt-1">Herausragende Entwicklungsmeilensteine für das KEL-Gespräch</p>
              </div>
            </div>
            <span className="text-[0.5625rem] font-black uppercase tracking-wider text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-200/50">
              {kelHighlights.length} {kelHighlights.length === 1 ? 'Eintrag' : 'Einträge'}
            </span>
          </div>

          {/* Horizontal carousel */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-amber-200/80">
            {kelHighlights.map((entry) => (
              <div
                key={`carousel-${entry.id}`}
                className="w-72 shrink-0 bg-white p-4 rounded-2xl border border-amber-200/70 shadow-sm hover:shadow-md transition-all duration-300 relative group/carousel"
              >
                {/* Tape clip decoration to look like physical polaroid pinup */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-3.5 bg-amber-500/20 rounded-xs border-x border-amber-500/30 rotate-2 select-none pointer-events-none" />

                <div className="flex flex-col h-full justify-between">
                  <div>
                    {entry.bildUrl && (
                      <div className="relative overflow-hidden rounded-xl border-2 border-slate-50 shadow-xs mb-3">
                        <img
                          src={entry.bildUrl}
                          alt={entry.titel}
                          className="w-full h-32 object-cover object-center"
                        />
                      </div>
                    )}
                    <h5 className="text-[0.8125rem] font-black text-slate-900 line-clamp-1 leading-snug tracking-tight mb-1">{entry.titel}</h5>
                    {entry.beschreibung && (
                      <p className="text-[0.6875rem] font-semibold text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {entry.beschreibung}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-[0.5625rem] font-bold text-slate-400">
                      {format(new Date(entry.datum), "dd.MM.yyyy", { locale: de })}
                    </span>
                    {entry.tags && entry.tags[0] && (
                      <span className={`text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getFachStyles(entry.tags[0])}`}>
                        {entry.tags[0]}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Filter Pills */}
      <div className="space-y-2 pb-1">
        <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 pl-1 block">Timeline filtern</label>
        <div className="flex flex-wrap gap-1.5">
          {['Alle', 'Highlight ⭐', 'Deutsch', 'Mathematik', 'Sachunterricht', 'Kunst & Werken', 'Musik', 'Sport', 'Sonstiges'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3.5 py-1.5 rounded-full text-[0.72rem] font-black border transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 shadow-inner space-y-4 animate-fade-in">
          <div className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-indigo-500 animate-pulse" /> Neuer Portfolio-Eintrag
          </div>
          <input 
            value={newEntry.titel || ''}
            onChange={e => setNewEntry(prev => ({ ...prev, titel: e.target.value }))}
            placeholder="Titel (z.B. Toll gezeichneter Schmetterling)"
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-bold placeholder-slate-400/80 transition-all outline-none"
          />
          <textarea 
            value={newEntry.beschreibung || ''}
            onChange={e => setNewEntry(prev => ({ ...prev, beschreibung: e.target.value }))}
            placeholder="Notiz oder Beschreibung..."
            className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-[0.875rem] leading-snug font-medium resize-none h-24 placeholder-slate-400/80 transition-all outline-none"
          />

          {/* Subject tag selection */}
          <div className="space-y-2">
            <label className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-450 block">Fach / Kategorie auswählen</label>
            <div className="flex flex-wrap gap-2">
              {['Deutsch', 'Mathematik', 'Sachunterricht', 'Kunst & Werken', 'Musik', 'Sport', 'Sonstiges'].map((subject) => {
                const isSelected = newEntry.tags?.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => setNewEntry(prev => ({ ...prev, tags: [subject] }))}
                    className={`px-3.5 py-1.5 rounded-xl text-[0.72rem] font-black border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pt-2">
            <div className="flex flex-wrap items-center gap-4">
              <input 
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageUpload}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black transition-all border ${
                  newEntry.bildUrl 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-100 shadow-3xs'
                }`}
              >
                {newEntry.bildUrl ? <Check size={14} /> : <Camera size={14} />} 
                {newEntry.bildUrl ? 'Foto angehängt' : 'Foto aufnehmen / wählen'}
              </button>

              <label className="flex items-center gap-2 cursor-pointer group bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-3xs select-none">
                <input 
                  type="checkbox"
                  checked={newEntry.isInKEL || false}
                  onChange={e => setNewEntry(prev => ({ ...prev, isInKEL: e.target.checked }))}
                  className="w-4 h-4 rounded text-amber-500 border-slate-300 focus:ring-amber-500"
                />
                <span className="text-[0.75rem] leading-tight font-bold text-slate-600 group-hover:text-slate-900 transition-colors flex items-center gap-1">
                  <Star size={12} className={newEntry.isInKEL ? "text-amber-500 fill-amber-500" : "text-slate-400"} /> KEL Highlight
                </span>
              </label>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={!newEntry.titel}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white px-8 py-2.5 rounded-xl text-[0.75rem] leading-tight font-black transition-all shadow-md hover:shadow-indigo-100 w-full sm:w-auto cursor-pointer"
            >
              Speichern
            </button>
          </div>
        </div>
      )}

      <div className="relative pl-1 before:absolute before:inset-y-0 before:left-6 before:-translate-x-px before:w-0.5 before:bg-gradient-to-b before:from-indigo-200 before:via-slate-200 before:to-transparent pt-4 space-y-8">
        
        {ikmLernpfad && (ikmLernpfad.stationen || ikmLernpfad.elternTipps) && (
          <div className="relative pl-12 group">
            <div className="absolute left-1 top-0 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-500 text-white z-10 shadow-md transition-transform group-hover:scale-110">
               <Map size={18} />
            </div>

            <div className="w-full p-6 rounded-[2rem] bg-gradient-to-br from-amber-50/70 via-orange-50/45 to-yellow-50/30 border border-amber-200/80 shadow-[0_4px_20px_rgba(245,158,11,0.05)] hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)] hover:border-amber-300 transition-all relative">
              <div className="text-[0.5625rem] font-black uppercase tracking-[0.15em] text-amber-700 mb-3 flex items-center gap-1.5 bg-amber-100/60 w-fit px-2.5 py-1 rounded-full border border-amber-200/50">
                <Compass size={11} className="text-amber-600 animate-spin-slow" /> IKM PLUS SCHATZKARTE
              </div>
              
              {ikmLernpfad.stationen && ikmLernpfad.stationen.length > 0 && (
                <div className="mt-4 mb-5">
                  <h4 className="text-[0.875rem] leading-snug font-black text-amber-950 font-sans tracking-tight mb-3 flex items-center gap-2">
                    <Star size={14} className="text-amber-500 fill-amber-500" />
                    Der Abenteuer-Schatzkartenpfad
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {ikmLernpfad.stationen.map((st: any, i: number) => (
                      <div key={i} className="flex gap-3 bg-white/90 p-3.5 rounded-2xl border border-amber-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.01)] hover:border-amber-200 transition-all">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.625rem] font-black text-white shrink-0 shadow-sm ${i === 0 ? 'bg-amber-500' : (i === 1 ? 'bg-orange-500' : 'bg-yellow-500')}`}>
                          {i + 1}
                        </span>
                        <div>
                           <p className="text-[0.75rem] leading-tight font-black text-slate-800 tracking-tight">{st.titel}</p>
                           <p className="text-[0.625rem] font-medium text-slate-500 mt-1 leading-relaxed">{st.aufgabe}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ikmLernpfad.elternTipps && ikmLernpfad.elternTipps.length > 0 && (
                <div className="mt-5 pt-5 border-t border-amber-200/60">
                  <h4 className="text-[0.875rem] leading-snug font-black text-orange-900 font-sans tracking-tight mb-3 flex items-center gap-2">
                     <Award size={14} className="text-orange-500" /> Spielerischer Eltern-Ratgeber
                  </h4>
                  <div className="space-y-2">
                    {ikmLernpfad.elternTipps.map((tipp: string, i: number) => (
                      <div key={i} className="flex gap-2.5 bg-white/60 p-3 rounded-xl border border-amber-100/60 items-start hover:bg-white/95 transition-all">
                        <span className="text-[0.875rem] leading-snug select-none shrink-0 mt-0.5">💡</span>
                        <p className="text-[0.6875rem] font-bold text-amber-950 font-sans leading-relaxed">{tipp}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {portfolio.filter(entry => {
          if (activeFilter === 'Alle') return true;
          if (activeFilter === 'Highlight ⭐') return entry.isInKEL;
          return entry.tags?.includes(activeFilter);
        }).map((entry, idx) => {
          const isKelHighlight = entry.isInKEL;
          return (
            <div key={entry.id} className="relative pl-12 group animate-in fade-in duration-300">
              
              <div className={`absolute left-1 top-0 flex items-center justify-center w-10 h-10 rounded-full border-4 border-white z-10 shadow-md transition-transform group-hover:scale-110 ${
                isKelHighlight 
                  ? 'bg-amber-500 text-white ring-4 ring-amber-100/50' 
                  : 'bg-indigo-50 text-indigo-600'
              }`}>
                 {isKelHighlight ? <Star size={16} className="fill-white" /> : <ImageIcon size={16} />}
              </div>

              <div className={`w-full p-6 rounded-[2rem] border transition-all duration-300 relative ${
                isKelHighlight
                  ? 'bg-gradient-to-br from-white via-amber-50/10 to-amber-100/5 border-amber-200/80 shadow-[0_6px_25px_rgba(245,158,11,0.03)] hover:shadow-[0_12px_30px_rgba(245,158,11,0.07)] hover:border-amber-300'
                  : 'bg-white border-slate-100 shadow-[0_4px_25px_rgba(0,0,0,0.015)] hover:shadow-[0_12px_30px_rgba(99,102,241,0.05)] hover:border-indigo-200/80'
              }`}>
                
                {/* Floating controls */}
                <div className="absolute top-5 right-5 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button 
                     onClick={() => toggleKEL(entry.id)} 
                     className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                       isKelHighlight 
                         ? 'text-amber-500 bg-amber-50 border border-amber-200/40 shadow-3xs' 
                         : 'text-slate-450 hover:bg-slate-50 hover:text-amber-500'
                     }`} 
                     title="Als KEL Highlight markieren"
                   >
                     <Star size={13} className={isKelHighlight ? "fill-amber-500 text-amber-500" : ""} />
                   </button>
                   <button 
                     onClick={() => deleteEntry(entry.id)} 
                     className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100 cursor-pointer"
                   >
                     <Trash2 size={13} />
                   </button>
                </div>

                {/* Card Header metadata */}
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  <div className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-150">
                    <Calendar size={10} /> {format(new Date(entry.datum), "dd. MMMM yyyy", { locale: de })}
                  </div>
                  {isKelHighlight && (
                    <span className="text-[0.5625rem] font-black uppercase tracking-wider text-amber-700 bg-amber-100/75 px-2.5 py-1 rounded-full border border-amber-200/40 flex items-center gap-1">
                      <Star size={9} className="fill-amber-600 text-amber-600" /> KEL-SCHLÜSSELERLEBNIS
                    </span>
                  )}
                  {entry.tags && entry.tags[0] && (
                    <span className={`text-[0.5625rem] font-black uppercase tracking-wider px-2 py-1 rounded-full border ${getFachStyles(entry.tags[0])}`}>
                      {entry.tags[0]}
                    </span>
                  )}
                </div>

                <h4 className="text-[0.9375rem] font-black text-slate-900 leading-snug tracking-tight mb-2.5 pr-16">{entry.titel}</h4>
                {entry.beschreibung && (
                  <p className="text-[0.75rem] leading-relaxed font-semibold text-slate-500 mb-4 bg-slate-50/40 p-3.5 rounded-2xl border border-slate-100/50">
                    {entry.beschreibung}
                  </p>
                )}
                
                {/* Polaroid-style visual image layout */}
                {entry.bildUrl && (
                  <div className="relative overflow-hidden rounded-2xl border-4 border-white shadow-md hover:shadow-lg transition-transform duration-300 hover:scale-[1.005] max-w-full md:max-w-xl mb-4">
                    <img 
                      src={entry.bildUrl} 
                      alt={entry.titel} 
                      className="w-full h-auto object-cover max-h-[340px]" 
                    />
                    <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[0.5625rem] font-black tracking-wider uppercase px-2 py-0.5 rounded-full backdrop-blur-xs select-none">
                      Vorschau
                    </div>
                  </div>
                )}
                
                {entry.matchedLernziele && entry.matchedLernziele.length > 0 ? (
                  <div className="mt-4 pt-4 border-t border-slate-100/80">
                    <p className="text-[0.6875rem] font-black text-slate-500 mb-2.5 flex items-center gap-1">
                      <Check size={12} className="text-emerald-500 shrink-0"/> Verknüpfte Lernfortschritte:
                    </p>
                    <div className="space-y-2">
                      {entry.matchedLernziele.map((goal, gIdx) => (
                        <div key={gIdx} className="flex justify-between items-center bg-white rounded-xl p-2.5 border border-slate-150/70 hover:border-slate-300 shadow-3xs transition-all">
                          <div className="flex-1 min-w-0 pr-2">
                            <span className={`text-[0.5625rem] font-black uppercase tracking-widest px-2 py-0.5 rounded border mr-2.5 inline-block ${getFachStyles(goal.fach)}`}>
                              {goal.fach}
                            </span>
                            <span className="text-[0.71rem] font-bold text-slate-700 leading-normal">{goal.text}</span>
                          </div>
                          <button 
                            onClick={() => addGoalToStudent(goal)}
                            className="ml-2 text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 border border-indigo-100 hover:border-indigo-600 p-1.5 rounded-lg transition-all shadow-3xs flex items-center justify-center shrink-0 cursor-pointer"
                            title="Als Schülerziel übernehmen"
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => analyzeEntry(entry)}
                      disabled={analyzingId === entry.id}
                      className="flex items-center gap-1.5 text-[0.6875rem] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {analyzingId === entry.id ? (
                        <><svg className="animate-spin h-3 w-3 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> KI-Analyse läuft...</>
                      ) : (
                        <><Wand2 size={12} /> Lernziele verknüpfen</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {portfolio.filter(entry => {
          if (activeFilter === 'Alle') return true;
          if (activeFilter === 'Highlight ⭐') return entry.isInKEL;
          return entry.tags?.includes(activeFilter);
        }).length === 0 && (
          <div className="text-center py-12 px-6 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center max-w-lg mx-auto">
            <div className="w-12 h-12 bg-white text-indigo-500 rounded-full flex items-center justify-center border border-slate-200 shadow-sm mb-4">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <h4 className="text-[0.875rem] font-black text-slate-800 tracking-tight leading-none mb-1.5">
              {portfolio.length === 0 ? 'Noch keine Meilensteine eingetragen' : 'Keine passenden Meilensteine'}
            </h4>
            <p className="text-[0.6875rem] font-bold text-slate-400 max-w-xs leading-relaxed">
              {portfolio.length === 0 
                ? 'Halte Fotos von Heften, Auszeichnungen oder Kunstwerken fest und lasse sie automatisch mit dem Lehrplan verknüpfen.'
                : `Es gibt momentan keine Einträge in der Kategorie "${activeFilter}" für ${student.vorname}.`
              }
            </p>
            {portfolio.length === 0 ? (
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-[0.6875rem] font-black transition-all border border-indigo-100 cursor-pointer"
              >
                <Plus size={12} /> Ersten Eintrag erstellen
              </button>
            ) : (
              <button
                onClick={() => setActiveFilter('Alle')}
                className="mt-4 flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-[0.6875rem] font-black transition-all border border-slate-200 cursor-pointer"
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
