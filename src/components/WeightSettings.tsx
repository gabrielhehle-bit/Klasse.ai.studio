
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FAECHER_ALLE, DEFAULT_GEWICHTUNG } from '../constants';
import { Save, RotateCcw, AlertTriangle, Zap } from 'lucide-react';

export default function WeightSettings({ onBack }: { onBack: () => void }) {
  const { app, setApp } = useApp();
  const [localWeights, setLocalWeights] = useState({ ...app.notenGewichtung });

  const getWeight = (fach: string) => {
    return localWeights[fach] || DEFAULT_GEWICHTUNG[fach] || DEFAULT_GEWICHTUNG['Deutsch'];
  };

  const updateWeight = (fach: string, field: string, value: number) => {
    if (value === 0) {
      const currentVal = (getWeight(fach)[field] || 0);
      if (currentVal > 0 && !confirm(`Möchtest du "${app.notenLabels?.[field] || field}" wirklich auf 0% setzen? Diese Kategorie wird dann nicht mehr für den Durchschnitt berechnet.`)) {
        return;
      }
    }
    const current = { ...getWeight(fach) };
    current[field] = value;
    setLocalWeights({ ...localWeights, [fach]: current });
  };

  const updateSACount = (fach: string, count: number) => {
    setApp(prev => {
      const nm = { ...(prev.notenMeta || {}) };
      const currentFach = { ...(nm[fach] || {}) };
      return {
        ...prev,
        notenMeta: {
          ...nm,
          [fach]: {
            ...currentFach,
            saCount: count
          }
        }
      };
    });
  };

  const updateLabel = (key: string, label: string) => {
    setApp(prev => ({
      ...prev,
      notenLabels: {
        ...(prev.notenLabels || {}),
        [key]: label
      }
    }));
  };

  const calculateSum = (fach: string) => {
    const w = getWeight(fach);
    return (w.sa || 0) + (w.lzk || 0) + (w.wp || 0) + (w.obj || 0) + (w.mi || 0) + (w.hue || 0);
  };

  const handleSaveAll = () => {
    const invalidFaecher = FAECHER_ALLE.filter(f => !app.faecher || app.faecher.includes(f))
      .filter(f => calculateSum(f) !== 100);

    if (invalidFaecher.length > 0) {
      alert(`Folgende Fächer haben keine 100%: ${invalidFaecher.join(', ')}`);
      return;
    }

    setApp(prev => ({ ...prev, notenGewichtung: localWeights }));
    alert('Gewichtungen erfolgreich gespeichert!');
    onBack();
  };

  const autoDistributeEvenly = (fach: string) => {
    const fields = [
      { key: 'sa', show: fach === 'Deutsch' || fach === 'Mathematik' },
      { key: 'lzk', show: true },
      { key: 'wp', show: true },
      { key: 'hue', show: true },
      { key: 'obj', show: true },
      { key: 'mi', show: true }
    ].filter(f => f.show);

    const count = fields.length;
    if (count === 0) return;

    const baseShare = Math.floor(100 / count);
    const remainder = 100 % count;

    // Build standard multi-factor distribution beautifully
    const newWeightsForFach = { ...getWeight(fach) };
    
    // reset other unused fields if any
    newWeightsForFach.sa = 0;
    newWeightsForFach.lzk = 0;
    newWeightsForFach.wp = 0;
    newWeightsForFach.hue = 0;
    newWeightsForFach.obj = 0;
    newWeightsForFach.mi = 0;

    fields.forEach((field, idx) => {
      const extra = idx < remainder ? 1 : 0;
      newWeightsForFach[field.key] = baseShare + extra;
    });

    setLocalWeights({ ...localWeights, [fach]: newWeightsForFach });
  };

  const resetAllWeights = () => {
    if (confirm('Möchtest du wirklich alle Fächer-Gewichtungen auf ihre Standardwerte zurücksetzen?')) {
      const resetObj: any = {};
      activeFaecher.forEach(fach => {
        resetObj[fach] = { ...(DEFAULT_GEWICHTUNG[fach] || DEFAULT_GEWICHTUNG['Deutsch']) };
      });
      setLocalWeights(resetObj);
    }
  };

  const symbols = {
    plus: { icon: '➕', label: 'Pluspunkte', color: 'text-orange-600', bg: 'bg-orange-100' },
    star: { icon: '⭐', label: 'Sterne', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    marble: { icon: '🔮', label: 'Murmeln', color: 'text-purple-600', bg: 'bg-purple-100' },
    diamond: { icon: '💎', label: 'Diamanten', color: 'text-blue-600', bg: 'bg-blue-100' },
    trophy: { icon: '🏆', label: 'Pokale', color: 'text-amber-600', bg: 'bg-amber-100' }
  };

  const activeFaecher = FAECHER_ALLE.filter(f => !app.faecher || app.faecher.includes(f));
  
  // Real-time metrics
  const totalFaecherCount = activeFaecher.length;
  const correctFaecherCount = activeFaecher.filter(f => calculateSum(f) === 100).length;
  const isEverythingOk = totalFaecherCount === correctFaecherCount;

  return (
    <div className="space-y-6">
      {/* Real-time Summary Dashboard Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-inner flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-[0.875rem] leading-snug font-black uppercase text-slate-800 tracking-wider">Kalibrierungs-Status</h3>
            <span className={`px-2.5 py-0.5 rounded-full text-[0.625rem] font-black uppercase tracking-wider ${isEverythingOk ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'}`}>
              {correctFaecherCount} / {totalFaecherCount} Fächer Bereit
            </span>
          </div>
          <p className="text-[0.6875rem] text-slate-500 font-medium leading-relaxed">
            Die Notenberechnung benötigt für jedes unterrichtete Fach eine Gewichtungssumme von genau <strong className="text-slate-700">100%</strong>.
          </p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shrink-0 w-full md:w-auto justify-end">
          <button 
            type="button"
            onClick={resetAllWeights}
            className="px-3.5 py-2 hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-black text-[0.625rem] uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            title="Alle Fächer auf Standard-Gewichtungen zurücksetzen"
          >
            <RotateCcw size={12} /> Standardwerte
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-2xs gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[0.6875rem] text-slate-400 font-medium">Summe pro Fach muss genau 100% ergeben.</div>
          <label className="flex items-center gap-2 cursor-pointer group mt-2">
            <div className={`w-10 h-5 rounded-full relative transition-colors ${app.notenMeta?.syncWpDeutschMath ? 'bg-indigo-500' : 'bg-slate-200'}`}>
              <div className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform ${app.notenMeta?.syncWpDeutschMath ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-[0.75rem] font-bold text-slate-700 group-hover:text-slate-900 transition-colors flex items-center gap-1.5">
              <Zap size={14} className={app.notenMeta?.syncWpDeutschMath ? 'text-indigo-500 fill-indigo-100' : 'text-slate-400'} />
              Wochenpläne für Deutsch & Mathematik synchronisieren
            </span>
            <input
              type="checkbox"
              className="hidden"
              checked={app.notenMeta?.syncWpDeutschMath || false}
              onChange={(e) => {
                setApp(prev => ({
                  ...prev,
                  notenMeta: {
                    ...(prev.notenMeta || {}),
                    syncWpDeutschMath: e.target.checked
                  }
                }));
              }}
            />
          </label>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={onBack} className="px-4 py-2 hover:bg-slate-50 border border-slate-250/70 text-slate-650 font-bold text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl transition-all cursor-pointer">Abbrechen</button>
          <button onClick={handleSaveAll} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[0.75rem] leading-tight uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10 active:scale-95">
            <Save size={13} /> Speichern
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeFaecher.map(fach => {
          const w = getWeight(fach);
          const sum = calculateSum(fach);
          const isOk = sum === 100;

          return (
            <div key={fach} className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm relative transition-all hover:shadow-md">
              <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-extrabold text-[0.875rem] text-slate-800">{fach}</h4>
                  <button
                    type="button"
                    onClick={() => autoDistributeEvenly(fach)}
                    className="px-2 py-0.5 text-[0.5625rem] font-black uppercase tracking-wider text-indigo-750 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-0.5"
                    title="Verteilt die 100% gleichmäßig auf die aktiven Bereiche dieses Fachs"
                  >
                    <Zap size={10} className="text-indigo-600 animate-pulse" />
                    <span>= Verteilen</span>
                  </button>
                </div>
                <div className={`px-3 py-1 rounded-full text-[0.6875rem] font-black border transition-all ${sum === 100 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : sum < 100 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                  {sum === 100 ? '✓ ' : ''}{sum}%
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { key: 'sa', label: app.notenLabels?.sa || 'Schularbeiten', show: fach === 'Deutsch' || fach === 'Mathematik' },
                  { key: 'lzk', label: app.notenLabels?.lzk || 'Lernzielkontrollen', show: true },
                  { key: 'wp', label: app.notenLabels?.wp || 'Wochenplan', show: true },
                  { key: 'hue', label: app.notenLabels?.hue || 'Hausübung', show: true },
                  { key: 'obj', label: app.notenLabels?.obj || 'Aufgaben/Objekte', show: true },
                  { key: 'mi', label: app.notenLabels?.mi || 'Mitarbeit', show: true }
                ].filter(f => f.show).map(field => (
                  <div key={field.key} className="space-y-1">
                    <div className="flex justify-between items-center text-[0.6875rem] font-medium text-text-secondary">
                      <input 
                        type="text"
                        className="bg-transparent border-none p-0 font-bold focus:ring-0 text-slate-700 hover:text-emerald-600 cursor-text w-32"
                        value={field.label}
                        onChange={(e) => updateLabel(field.key, e.target.value)}
                        placeholder="Name..."
                      />
                      <div className="flex items-center gap-2">
                        {field.key === 'sa' && (
                          <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-blue-50 rounded-lg">
                            <span className="text-[0.5625rem] uppercase font-black text-blue-400">Anzahl:</span>
                            <input 
                              type="number" min="0" max="10"
                              className="w-8 bg-transparent border-none p-0 text-center font-bold text-blue-700 text-[0.6875rem] focus:ring-0"
                              value={app.notenMeta?.[fach]?.saCount ?? 4}
                              onChange={(e) => updateSACount(fach, parseInt(e.target.value) || 0)}
                            />
                          </div>
                        )}
                        <input 
                          type="number"
                          className="w-12 px-1 py-0.5 border border-border rounded text-center font-bold text-text-primary"
                          value={w[field.key] || 0}
                          onFocus={e => e.target.select()}
                          onChange={e => updateWeight(fach, field.key, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                        />
                        <span className="font-bold">%</span>
                      </div>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="5"
                      className="w-full accent-green-700 h-1.5 bg-surface2 rounded-lg cursor-pointer"
                      value={w[field.key] || 0}
                      onChange={e => updateWeight(fach, field.key, parseInt(e.target.value))}
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Verteilung:</span>
                {sum === 100 ? (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider border border-emerald-100">
                    <span>✓ 100% Perfekt</span>
                  </div>
                ) : sum < 100 ? (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider border border-amber-250/50">
                    <AlertTriangle size={11} className="text-amber-600" />
                    <span>{sum}% ({100 - sum}% fehlen)</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-50 text-rose-700 rounded-lg text-[0.625rem] font-black uppercase tracking-wider border border-rose-200">
                    <AlertTriangle size={11} />
                    <span>{sum}% (+{sum - 100}% zu viel)</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card bg-white border border-stone-100 p-8 shadow-sm rounded-[2rem]">
        <div className="flex flex-col gap-1 mb-8">
          <h4 className="text-[0.8125rem] font-black uppercase tracking-widest text-amber-950">Mitarbeit-Steuerung</h4>
          <p className="text-[0.6875rem] text-stone-400 font-medium">Tracking-Symbole und Noten-Schwellen deines Belohnungssystems.</p>
        </div>

        <div className="space-y-10">
          <div className="space-y-4">
            <label className="text-[0.625rem] font-black uppercase text-stone-400 tracking-widest flex items-center gap-2 px-1">
              Symbol-Auswahl
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              {[
                { id: 'plus', icon: '➕', label: 'Pluspunkte' },
                { id: 'star', icon: '⭐', label: 'Sterne' },
                { id: 'marble', icon: '🔮', label: 'Murmeln' },
                { id: 'diamond', icon: '💎', label: 'Diamanten' },
                { id: 'trophy', icon: '🏆', label: 'Pokale' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setApp(prev => ({
                    ...prev,
                    mitarbeit_settings: {
                      ...(prev.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' }),
                      symbol: s.id,
                      custom_icon: null
                    }
                  }))}
                  className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${app.mitarbeit_settings?.symbol === s.id && !app.mitarbeit_settings?.custom_icon ? 'bg-amber-800 border-amber-900 text-white shadow-lg -translate-y-1' : 'bg-stone-50 border-stone-100 text-stone-400 hover:border-amber-200'}`}
                >
                  <span className="text-[1.5rem] leading-normal">{s.icon}</span>
                  <span className="text-[0.5625rem] font-black uppercase tracking-tighter text-center">{s.label}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  const icon = prompt('Gib ein Emoji oder Symbol ein:', '🍎') || '🍎';
                  setApp(prev => ({
                    ...prev,
                    mitarbeit_settings: {
                      ...(prev.mitarbeit_settings || { thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }, mode: 'absolute' }),
                      symbol: 'custom',
                      custom_icon: icon
                    }
                  }));
                }}
                className={`p-4 rounded-3xl border-2 border-dashed flex flex-col items-center gap-2 transition-all ${app.mitarbeit_settings?.symbol === 'custom' ? 'bg-amber-800 border-amber-900 text-white shadow-lg' : 'bg-stone-50 border-stone-200 text-stone-400 hover:border-amber-200'}`}
              >
                <span className="text-[1.5rem] leading-normal">{app.mitarbeit_settings?.custom_icon || '✏️'}</span>
                <span className="text-[0.5625rem] font-black uppercase tracking-tighter text-center">Eigene Wahl</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <label className="text-[0.625rem] font-black uppercase text-stone-400 tracking-widest flex items-center gap-2">
                Berechnungs-Modus
              </label>
              <div className="flex bg-stone-100 p-1 rounded-xl">
                <button 
                  onClick={() => setApp(prev => ({ ...prev, mitarbeit_settings: { ...(prev.mitarbeit_settings || {}), mode: 'absolute' } }))}
                  className={`px-4 py-1.5 rounded-lg text-[0.625rem] font-black uppercase transition-all ${(app.mitarbeit_settings?.mode === 'absolute' || !app.mitarbeit_settings?.mode) ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-400'}`}
                >
                  Fixe Punkte
                </button>
                <button 
                  onClick={() => setApp(prev => ({ ...prev, mitarbeit_settings: { ...(prev.mitarbeit_settings || {}), mode: 'relative' } }))}
                  className={`px-4 py-1.5 rounded-lg text-[0.625rem] font-black uppercase transition-all ${app.mitarbeit_settings?.mode === 'relative' ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-400'}`}
                >
                  Relativ (Durchschnitt)
                </button>
                <button 
                  onClick={() => setApp(prev => ({ ...prev, mitarbeit_settings: { ...(prev.mitarbeit_settings || {}), mode: 'manual' } }))}
                  className={`px-4 py-1.5 rounded-lg text-[0.625rem] font-black uppercase transition-all ${app.mitarbeit_settings?.mode === 'manual' ? 'bg-white text-amber-900 shadow-sm' : 'text-stone-400'}`}
                >
                  Manuelle Note
                </button>
              </div>
            </div>

            {app.mitarbeit_settings?.mode === 'manual' ? (
              <div className="space-y-4">
                <div className="p-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-[1.875rem] leading-tight shadow-sm border border-amber-100">
                    ✍️
                  </div>
                  <div>
                    <h5 className="text-[0.9375rem] font-black text-amber-950 uppercase tracking-widest leading-tight">Manueller Noteneintrag</h5>
                    <p className="text-[0.75rem] text-amber-800/60 font-medium px-4 mt-1">
                      In diesem Modus gibst du die Mitarbeit direkt als Note (1-5) in der Tabelle ein.
                      Punkte/Symbole werden ignoriert.
                    </p>
                  </div>
                </div>
              </div>
            ) : app.mitarbeit_settings?.mode === 'relative' ? (
              <div className="space-y-4">
                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-sm">
                      <Zap size={18} />
                    </div>
                    <div>
                      <h5 className="text-[0.8125rem] font-black text-indigo-950 uppercase tracking-widest">Team-Durchschnitts-Tool</h5>
                      <p className="text-[0.6875rem] text-indigo-600/70 font-medium">Noten hängen vom Niveau der ganzen Klasse ab.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { note: 1, label: 'Besser als Schnitt', def: 20 },
                      { note: 2, label: 'Besser als Schnitt', def: 10 },
                      { note: 3, label: 'Rund um Schnitt', def: 0 },
                      { note: 4, label: 'Unter Schnitt', def: -10 }
                    ].map(cfg => (
                      <div key={cfg.note} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[0.625rem] font-black text-indigo-400 uppercase tracking-widest">Note {cfg.note}</span>
                           <span className="text-[0.625rem] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                             {cfg.def > 0 ? `+${cfg.def}%` : `${cfg.def}%`}
                           </span>
                        </div>
                        <input 
                          type="number"
                          className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-[0.8125rem] font-bold outline-none focus:ring-2 ring-indigo-500/20"
                          value={app.mitarbeit_settings?.relative_thresholds?.[cfg.note] ?? cfg.def}
                          placeholder="% Abweichung"
                          onFocus={e => e.target.select()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setApp(prev => ({
                              ...prev,
                              mitarbeit_settings: {
                                ...(prev.mitarbeit_settings || {}),
                                relative_thresholds: {
                                  ...(prev.mitarbeit_settings?.relative_thresholds || {}),
                                  [cfg.note]: val
                                }
                              }
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-4 mt-2">
                    <button 
                      onClick={() => {
                        const isConfirmed = app.mitarbeit_settings?.relative_confirmed;
                        if (isConfirmed) {
                          if (confirm("Möchtest du das Team-Durchschnitts-Tool wieder deaktivieren?")) {
                            setApp(prev => ({
                              ...prev,
                              mitarbeit_settings: {
                                ...(prev.mitarbeit_settings || {}),
                                relative_confirmed: false
                              }
                            }));
                          }
                        } else {
                          if (confirm("Möchtest du das Team-Durchschnitts-Tool wirklich aktivieren? Die Noten deiner Schüler hängen dann direkt vom Klassendurchschnitt ab.")) {
                            setApp(prev => ({
                              ...prev,
                              mitarbeit_settings: {
                                ...(prev.mitarbeit_settings || {}),
                                relative_confirmed: true
                              }
                            }));
                          }
                        }
                      }}
                      className={`w-full py-4 rounded-2xl font-black text-[0.75rem] uppercase tracking-widest transition-all ${app.mitarbeit_settings?.relative_confirmed ? 'bg-emerald-600 text-white shadow-emerald-200 shadow-lg' : 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg hover:bg-indigo-700'}`}
                    >
                      {app.mitarbeit_settings?.relative_confirmed ? '✅ Modus Bestätigt & Aktiviert' : '🚀 JETZT BESTÄTIGEN & AKTIVIEREN'}
                    </button>
                    <p className="text-[0.625rem] text-indigo-600/50 italic leading-relaxed text-center px-4">
                      Der Notenschlüssel berechnet sich jede Woche neu anhand des Durchschnitts aller gesammelten {app.mitarbeit_settings?.custom_icon || (symbols[app.mitarbeit_settings?.symbol as keyof typeof symbols] || symbols.plus).label}.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(note => (
                    <div key={note} className="flex items-center gap-4 p-5 bg-stone-50 rounded-3xl border border-stone-100 group hover:border-amber-200 transition-all">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[1.25rem] leading-normal shadow-sm ${note === 1 ? 'bg-emerald-500 text-white' : note === 2 ? 'bg-blue-500 text-white' : note === 3 ? 'bg-amber-500 text-white' : 'bg-orange-500 text-white'}`}>
                        {note}
                      </div>
                      <div className="flex-1">
                        <div className="text-[0.625rem] font-black text-stone-400 uppercase tracking-widest mb-1.5">Note {note} ab...</div>
                        <div className="flex items-center gap-3">
                          <input 
                            type="number"
                            className="bg-white px-4 py-2.5 rounded-xl border border-stone-200 text-[0.9375rem] font-black outline-none focus:ring-4 ring-amber-500/10 w-24 text-center"
                            value={app.mitarbeit_settings?.thresholds?.[note] || (note === 1 ? 13 : note === 2 ? 10 : note === 3 ? 7 : 4)}
                            onFocus={e => e.target.select()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setApp(prev => ({
                                ...prev,
                                mitarbeit_settings: {
                                  ...(prev.mitarbeit_settings || { symbol: 'plus', thresholds: { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 } }),
                                  thresholds: {
                                    ...(prev.mitarbeit_settings?.thresholds || { 1: 13, 2: 10, 3: 7, 4: 4, 5: 0 }),
                                    [note]: val
                                  }
                                }
                              }));
                            }}
                          />
                          <span className="text-[0.75rem] font-black text-amber-950/40 uppercase tracking-widest">
                            {app.mitarbeit_settings?.custom_icon || (symbols[app.mitarbeit_settings?.symbol as keyof typeof symbols] || symbols.plus).label}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-[0.6875rem] text-emerald-800 font-bold justify-center uppercase tracking-widest">
                  Note 5 steht für alles darunter.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
