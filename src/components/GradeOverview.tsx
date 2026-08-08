
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { berechne } from '../lib/GradeUtils';
import { FAECHER_ALLE } from '../constants';
import { Printer, Download, Search, Sparkles } from 'lucide-react';

export default function GradeOverview() {
  const { app, setApp } = useApp();
  const students = [...app.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
  const activeFaecher = FAECHER_ALLE;

  const [selectedSemester, setSelectedSemester] = useState<'1' | '2' | 'combined'>('combined');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const handleToggleEdit = () => {
    if (!isEditMode) {
      setIsEditMode(true);
      if (selectedSemester === 'combined') {
        setSelectedSemester('1');
      }
    } else {
      setIsEditMode(false);
    }
  };

  const selectSemester = (sem: '1' | '2' | 'combined') => {
    setSelectedSemester(sem);
    if (sem === 'combined') {
      setIsEditMode(false);
    }
  };

  const exportCSV = () => {
    let csvContent = "\uFEFF"; // Add UTF-8 BOM representation for Excel to recognize special characters like German double s and umlauts correctly
    // Header
    const headerRow = ["Nachname", "Vorname", ...activeFaecher, "Durchschnitt"].join(";");
    csvContent += headerRow + "\r\n";
    
    // Rows
    students.forEach((s) => {
      let sum = 0;
      let count = 0;
      const row = [s.nachname, s.vorname];
      
      activeFaecher.forEach(f => {
        const note1 = berechne(app, s.id, f, '1');
        const note2 = berechne(app, s.id, f, '2');
        let note: number | null = null;
        if (note1 !== null && note2 !== null) {
          note = (note1 + note2) / 2;
        } else if (note1 !== null) {
          note = note1;
        } else if (note2 !== null) {
          note = note2;
        }
        
        if (note !== null) {
          sum += note;
          count++;
          row.push(Math.round(note).toString());
        } else {
          row.push("");
        }
      });
      
      row.push(count > 0 ? (sum / count).toFixed(1).replace(".", ",") : "–");
      csvContent += row.join(";") + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Notenuebersicht_${app.klassenbezeichnung || 'Klasse'}_SJ_${app.schuljahr || 'SJ'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 py-4 max-w-7xl mx-auto flex-1 flex flex-col w-full">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-4 no-print shrink-0">
        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
          <Sparkles size={20} />
        </div>
        <div className="flex-1">
          <h4 className="text-[0.75rem] font-black uppercase text-amber-900 tracking-tight">Vollwertige Notenmappe & Zeugnisnotenerfassung</h4>
          <p className="text-[0.6875rem] text-amber-700 font-medium">
            Aggregiert die eingetragenen Leistungsbeurteilungen und erlaubt es Ihnen, die Endnote für alle Fächer (auch inaktive Nebenfächer, die Sie nicht unterrichten) einzutragen.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 no-print">
        <div className="space-y-1">
          <h2 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Gesamtübersicht Noten</h2>
          <p className="text-slate-500 font-medium tracking-tight">Alle Noten der Klasse {app.klassenbezeichnung} im Überblick.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Semester Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => selectSemester('combined')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSemester === 'combined'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Gesamt (Kombiniert)
            </button>
            <button
              type="button"
              onClick={() => selectSemester('1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSemester === '1'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              1. Semester
            </button>
            <button
              type="button"
              onClick={() => selectSemester('2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSemester === '2'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              2. Semester
            </button>
          </div>

          {/* Edit Mode Toggle Button */}
          <button
            type="button"
            onClick={handleToggleEdit}
            className={`btn btn-sm cursor-pointer flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              isEditMode
                ? 'bg-amber-600 hover:bg-amber-700 border-amber-600 text-white shadow-md'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {isEditMode ? '✏️ Bearbeitungs-Modus aktiv' : '✏️ Noten eintragen / überschreiben'}
          </button>

          <button onClick={exportCSV} className="btn btn-sm btn-primary cursor-pointer flex items-center gap-1.5">
            <Download size={14} /> Excel Export
          </button>
        </div>
      </div>

      {isEditMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 no-print animate-in fade-in duration-300">
          <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 text-xl shadow-inner">
            ✏️
          </div>
          <div className="space-y-1.5">
            <h4 className="text-[0.875rem] font-black uppercase text-amber-900 tracking-tight flex items-center gap-2">
              <span>Direkte Notenerfassung aktiv ({selectedSemester}. Semester)</span>
              <span className="text-[0.625rem] bg-amber-200 text-amber-800 px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest">Bearbeitungsmodus</span>
            </h4>
            <p className="text-[0.75rem] text-amber-700 leading-relaxed font-medium">
              Hier können Sie Endnoten für alle Fächer (sowohl aktive Hauptfächer als auch inaktive Nebenfächer) direkt eintragen. 
              Geben Sie bei inaktiven Fächern die Noten manuell ein, damit diese im <strong>Druckzentrum</strong> vollständig auf dem Zeugnisnotenspiegel gedruckt werden.
              Bei aktiven Fächern überschreiben manuelle Noten (gelb markiert) die live-berechneten Noten (grün markiert). Wählen Sie <span className="font-bold">„–“</span>, um wieder die berechnete Note zu nutzen.
            </p>
          </div>
        </div>
      )}

      <div className="card !p-0 md:p-0 overflow-y-auto shadow-md flex-1 custom-scrollbar">
        <div className="w-full overflow-x-auto no-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface/50 border-b border-border text-[0.625rem] font-bold uppercase tracking-widest text-text-muted">
                <th className="px-4 py-4 text-left border-r border-border/30 sticky left-0 bg-surface z-10 w-[180px]">Name</th>
                {activeFaecher.map(f => {
                  const isFachActive = !app.faecher || app.faecher.includes(f);
                  return (
                    <th key={f} className={`px-2 py-4 text-center border-r border-border/30 min-w-[75px] uppercase font-bold text-[0.5625rem] ${!isFachActive ? 'text-slate-400 bg-slate-50/50' : 'text-slate-700'}`}>
                      <div>{f}</div>
                      {selectedSemester !== 'combined' && (
                        <div className="text-[0.45rem] uppercase font-black text-slate-400/80 tracking-wider mt-0.5">
                          {selectedSemester}. Sem
                        </div>
                      )}
                      {!isFachActive && <div className="text-[0.45rem] lowercase font-normal text-slate-400 font-sans tracking-normal mt-0.5">(einfach)</div>}
                    </th>
                  );
                })}
                <th className="px-4 py-4 text-center bg-amber-500/10 text-amber-900 border-l border-border/30">ø</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                let sum = 0;
                let count = 0;
                
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface2/20 transition-colors">
                    <td className="px-4 py-3 text-[0.75rem] font-medium text-text-primary sticky left-0 bg-white group-hover:bg-surface2/20 border-r border-border/30 z-10">
                      {s.nachname} <span className="text-text-secondary font-normal">{s.vorname}</span>
                    </td>
                    {activeFaecher.map(f => {
                      const isFachActive = !app.faecher || app.faecher.includes(f);
                      const currentSem = selectedSemester === 'combined' ? '1' : selectedSemester;
                      const nd: any = app.noten?.[s.id]?.[f]?.[currentSem] || {};

                      const getNoteInfo = (semIdx: '1' | '2') => {
                        const ndSem = app.noten[s.id]?.[f]?.[semIdx];
                        const calculated = berechne(app, s.id, f, semIdx);
                        if (ndSem?.endnote) {
                          const num = parseFloat(ndSem.endnote.toString().replace(',','.'));
                          return !isNaN(num) ? num : ndSem.endnote;
                        }
                        return calculated !== null ? Math.round(calculated) : null;
                      };

                      let noteToRender: string | number | null = null;
                      let numericForAvg: number | null = null;

                      if (selectedSemester === 'combined') {
                        const note1 = getNoteInfo('1');
                        const note2 = getNoteInfo('2');
                        
                        if (note1 !== null && note2 !== null) {
                          if (typeof note1 === 'number' && typeof note2 === 'number') {
                            numericForAvg = (note1 + note2) / 2;
                            noteToRender = Math.round(numericForAvg);
                          } else {
                            noteToRender = `${note1} / ${note2}`;
                          }
                        } else if (note1 !== null) {
                          noteToRender = note1;
                          if (typeof note1 === 'number') numericForAvg = note1;
                        } else if (note2 !== null) {
                          noteToRender = note2;
                          if (typeof note2 === 'number') numericForAvg = note2;
                        }
                      } else {
                        const noteVal = getNoteInfo(selectedSemester);
                        noteToRender = noteVal;
                        if (typeof noteVal === 'number') numericForAvg = noteVal;
                      }

                      if (numericForAvg !== null) {
                        sum += numericForAvg;
                        count++;
                      }

                      return (
                        <td key={f} className="px-2 py-3 text-center border-r border-border/30">
                          {isEditMode ? (
                            <div className="flex items-center justify-center">
                              <select
                                value={nd.endnote || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setApp((prev: any) => {
                                    const currentNoten = prev.noten || {};
                                    const sidData = currentNoten[s.id] || {};
                                    const fachData = sidData[f] || {};
                                    const semData = fachData[selectedSemester as '1'|'2'] || { sa: [], lzk: [], wp: [], aufgaben: [], hue: 0, hueAnm: [] };
                                    
                                    return {
                                      ...prev,
                                      noten: {
                                        ...currentNoten,
                                        [s.id]: {
                                          ...sidData,
                                          [f]: {
                                            ...fachData,
                                            [selectedSemester as '1'|'2']: {
                                              ...semData,
                                              endnote: val
                                            }
                                          }
                                        }
                                      }
                                    };
                                  });
                                }}
                                className={`w-full max-w-[80px] bg-white border rounded-xl py-1 px-1 text-center font-bold text-[0.7125rem] outline-none transition-all cursor-pointer ${
                                  nd.endnote 
                                    ? 'border-amber-400 text-amber-700 bg-amber-50/20 focus:ring-1 focus:ring-amber-400 shadow-sm' 
                                    : (isFachActive && berechne(app, s.id, f, selectedSemester as '1'|'2') !== null)
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-400' 
                                      : 'border-slate-200 text-slate-400 hover:border-slate-300 focus:ring-1 focus:ring-slate-300'
                                }`}
                              >
                                {(() => {
                                  const calcVal = isFachActive ? berechne(app, s.id, f, selectedSemester as '1'|'2') : null;
                                  const calcRounded = calcVal !== null ? Math.round(calcVal) : null;
                                  return (
                                    <option value="">{calcRounded !== null ? `– (${calcRounded})` : '–'}</option>
                                  );
                                })()}
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5</option>
                                <option value="SPF">SPF</option>
                                <option value="ESPF">ESPF</option>
                              </select>
                            </div>
                          ) : (
                            noteToRender !== null ? (
                              typeof noteToRender === 'number' ? (
                                <span className={`nb nb-${noteToRender}`}>{noteToRender}</span>
                              ) : (
                                <span className="font-bold text-[0.75rem] leading-tight text-text-primary">{noteToRender}</span>
                              )
                            ) : (
                              <span className="text-[0.625rem] text-text-muted">–</span>
                            )
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center font-bold text-[0.8125rem] bg-amber-500/5">
                      {count > 0 ? (sum / count).toFixed(1) : '–'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
