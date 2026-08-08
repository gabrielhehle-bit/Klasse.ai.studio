import React, { memo } from 'react';
import { useApp } from '../context/AppContext';
import { PET_BREEDS, AVAILABLE_ACCESSORIES } from './ClassPetWidget';
import { motion } from 'motion/react';

const ClassPetSettingsPanel = memo(({ forceDarkMode }: { forceDarkMode?: boolean }) => {
  const { app, setApp } = useApp();
  
  const petState = app.classPet || {
    enabled: true,
    animalType: 'dino',
    name: 'Spike',
    energy: 50,
    accessories: [],
    history: [],
    behaviorMode: 'auto'
  };

  const handleBreedChange = (breedId: string) => {
    const breed = PET_BREEDS.find(b => b.id === breedId);
    if (!breed) return;
    setApp({
      ...app,
      classPet: { ...petState, animalType: breed.id, name: breed.nameDefault }
    });
  };

  const handleToggleAccessory = (accId: string) => {
    const current = petState.accessories || [];
    const newAccs = current.includes(accId)
      ? current.filter(id => id !== accId)
      : [...current, accId];
      
    setApp({
      ...app,
      classPet: { ...petState, accessories: newAccs }
    });
  };

  const setBehaviorMode = React.useCallback((mode: 'auto' | 'wander' | 'sleep' | 'learn' | 'quiet') => {
    setApp(prev => {
      return {
        ...prev,
        classPet: { ...prev.classPet, behaviorMode: mode as any }
      };
    });
  }, [setApp]);

  const currentIsLight = forceDarkMode ? false : !app.theme?.includes('dark');

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-3 gap-8 ${currentIsLight ? 'text-slate-800' : 'text-slate-200'}`}>
      
      {/* COLUMN 1: General & Behavior */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8]">Status</label>
            <button
              onClick={() => setApp({ ...app, classPet: { ...petState, enabled: !petState.enabled } })}
              className={`w-full py-3 rounded-2xl border-2 text-[0.75rem] leading-tight font-black uppercase tracking-widest transition-all cursor-pointer ${
                petState.enabled 
                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : currentIsLight 
                    ? 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
              }`}
            >
              {petState.enabled ? '✅ Aktiviert' : '💤 Deaktiviert'}
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8]">Verhalten</label>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { id: 'auto', label: 'Tagesrhythmus', icon: '🕰️' },
                { id: 'wander', label: 'Erkunden', icon: '🚶' },
                { id: 'sleep', label: 'Schlafen', icon: '💤' },
                { id: 'learn', label: 'Lernen', icon: '📚' },
                { id: 'quiet', label: 'Ruhig verhalten', icon: '🤫' }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => setBehaviorMode(m.id as any)}
                  className={`py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    petState.behaviorMode === m.id
                      ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : currentIsLight 
                        ? 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                        : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'
                  }`}
                >
                  <span className="text-[1.25rem] leading-normal">{m.icon}</span>
                  <span className="text-[0.5rem] font-black uppercase tracking-tighter">{m.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[0.5625rem] text-[#64748b] leading-tight px-1 italic">
              Ein gewählter Modus verhindert, dass das Tier nachts automatisch schläft.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
            <div className="flex justify-between items-center">
              <label className="text-[0.625rem] font-black uppercase tracking-widest text-[#94a3b8]">
                Größe
              </label>
              <span className="text-[0.625rem] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                {Math.round((petState.scale || 1.0) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={petState.scale || 1.0}
                onChange={(e) => {
                  const newScale = parseFloat(e.target.value);
                  setApp({
                    ...app,
                    classPet: { ...petState, scale: newScale }
// @ts-ignore
                  });
                }}
                className="w-full accent-indigo-500 h-1.5 bg-slate-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <button
                type="button"
                onClick={() => {
                  setApp({
                    ...app,
                    classPet: { ...petState, scale: 1.0 }
// @ts-ignore
                  });
                }}
                className="px-2 py-1 text-[0.5rem] font-black uppercase tracking-wider rounded bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-200"
              >
                Reset
              </button>
            </div>
            <div className="flex justify-between text-[0.5rem] font-bold text-slate-400 uppercase tracking-wider px-1">
              <span>Klein (50%)</span>
              <span>Groß (150%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: Breed Selection */}
      <div className="space-y-4">
        <span className="text-[0.625rem] font-black uppercase tracking-widest block px-1 text-[#94a3b8]">Wähle dein Tier:</span>
        <div className="grid grid-cols-2 gap-2">
          {PET_BREEDS.map((breed) => (
            <button
              key={breed.id}
              onClick={() => handleBreedChange(breed.id)}
              className={`py-4 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer border-2 ${
                petState.animalType === breed.id
                  ? 'bg-amber-100 border-amber-500 text-amber-900 shadow-md scale-[1.02]'
                  : currentIsLight 
                    ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-600'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
              }`}
            >
              <span className="text-[1.875rem] leading-tight mb-1">{breed.emoji}</span>
              <span className="text-[0.5625rem] font-black uppercase text-center block px-1 leading-tight tracking-tight">{breed.nameDefault}</span>
            </button>
          ))}
        </div>
      </div>

      {/* COLUMN 3: Outfits */}
      <div className="space-y-4">
        <span className="text-[0.625rem] font-black uppercase tracking-widest block px-1 text-[#94a3b8]">Kleiderschrank:</span>
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-hide">
          {AVAILABLE_ACCESSORIES.map((acc) => {
            const isWorn = petState.accessories?.includes(acc.id);
            return (
              <button
                key={acc.id}
                onClick={() => handleToggleAccessory(acc.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  isWorn
                    ? currentIsLight ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm' : 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : currentIsLight ? 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm text-slate-600' : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <span className="text-[1.5rem] leading-normal shrink-0">{acc.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.625rem] font-black leading-tight uppercase text-wrap leading-tight break-words">{acc.name}</p>
                  <p className={`text-[0.5rem] font-bold uppercase mt-0.5 ${isWorn ? 'text-amber-500' : 'text-slate-400'}`}>
                    {isWorn ? 'Wird getragen' : 'Anprobieren'}
                  </p>
                </div>
                {isWorn && <div className="w-2 h-2 rounded-full bg-amber-500" />}
              </button>
            );
          })}
        </div>
      </div>
      
    </div>
  );
});

export default ClassPetSettingsPanel;
