
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { berechne } from '../lib/GradeUtils';
import { getOverviewNote } from '../lib/gradeOverviewValues';
import { FAECHER_ALLE } from '../constants';
import { Download, ArrowLeft, Users } from 'lucide-react';

export default function GradeOverview({ embedded = false, onBack }: { embedded?: boolean; onBack?: () => void } = {}) {
  const { app, setApp, setPage, switchClass } = useApp();
  const students = [...app.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname, 'de'));
  const activeFaecher = (app.faecher && app.faecher.length > 0) ? app.faecher : FAECHER_ALLE;

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
    const safeCsvCell = (value: string | number) => {
      const text = String(value);
      // Excel may execute untrusted names as formulas; protect cell values.
      const safe = /^[=+@-]/.test(text) ? "'" + text : text;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    let csvContent = "\uFEFF";
    const headerRow = ['Nachname', 'Vorname', ...activeFaecher, 'Durchschnitt'];
    csvContent += headerRow.map(safeCsvCell).join(';') + "\r\n";
    students.forEach(student => {
      let sum = 0;
      let count = 0;
      const row: (string | number)[] = [student.nachname, student.vorname];
      activeFaecher.forEach(fach => {
        const { noteToRender, numericForAvg } = getOverviewNote(app, student.id, fach, selectedSemester);
        row.push(noteToRender ?? '');
        if (numericForAvg !== null) { sum += numericForAvg; count++; }
      });
      row.push(count > 0 ? (sum / count).toFixed(1).replace('.', ',') : '');
      csvContent += row.map(safeCsvCell).join(';') + "\r\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Notenuebersicht_${app.klassenbezeichnung || 'Klasse'}_${selectedSemester === 'combined' ? 'Gesamt' : selectedSemester + '_Semester'}_SJ_${app.schuljahr || 'SJ'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={embedded ? "w-full min-w-0 space-y-4 pb-12 pt-2" : "w-full min-w-0 space-y-4 py-4"}>
      {embedded && (
        <nav aria-label="Notenmappe – Ansichten" className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm print:hidden">
          <button type="button" onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100">
            <ArrowLeft size={16} /> Zur Notenmappe
          </button>
          <span className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-800" aria-current="page">
            Notenübersicht
          </span>
        </nav>
      )}
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-900 print:hidden">
        Endnoten aller Fächer im Überblick. Manuelle Zeugnisnoten haben Vorrang vor berechneten Fachnoten;
        auch nicht unterrichtete Fächer können bei Bedarf manuell erfasst werden.
      </p>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 no-print">
        <div className="space-y-1">
          <h2 className="text-xl font-black leading-tight text-slate-900">Notenübersicht</h2>
          <p className="text-sm font-medium text-slate-600">{students.length} Kinder · {app.klassenbezeichnung || "Aktuelle Klasse"} · {selectedSemester === "combined" ? "Gesamtansicht" : selectedSemester + ". Semester"}</p>
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
            <Download size={14} /> CSV für Excel
          </button>
        </div>
      </div>

      {isEditMode && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 print:hidden">

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

      <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface/50 border-b border-border text-[0.625rem] font-bold uppercase tracking-widest text-text-muted">
                <th className="px-4 py-4 text-left border-r border-border/30 sticky left-0 bg-surface z-10 w-[180px]">Name</th>
                {activeFaecher.map(f => {
                  const hasNotenmappe = app.fachConfig?.[f]?.unterrichtet !== false;
                  return (
                    <th key={f} className={`px-2 py-4 text-center border-r border-border/30 min-w-[75px] uppercase font-bold text-[0.5625rem] ${!hasNotenmappe ? 'text-amber-800 bg-amber-50/40' : 'text-slate-700'}`}>
                      <div>{f}</div>
                      {selectedSemester !== 'combined' && (
                        <div className="text-[0.45rem] uppercase font-black text-slate-400/80 tracking-wider mt-0.5">
                          {selectedSemester}. Sem
                        </div>
                      )}
                      {!hasNotenmappe && <div className="text-[0.45rem] font-semibold text-amber-700/80 tracking-normal mt-0.5">(Manuell)</div>}
                    </th>
                  );
                })}
                <th className="px-4 py-4 text-center bg-amber-500/10 text-amber-900 border-l border-border/30">ø</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr>
                  <td colSpan={activeFaecher.length + 2} className="px-6 py-12 text-center">
                    <div role="status" className="mx-auto flex max-w-xl flex-col items-center gap-3 text-slate-700">
                      <Users size={28} aria-hidden="true" />
                      <strong className="text-base text-slate-900">In der aktuell ausgewählten Klasse sind keine Kinder vorhanden.</strong>
                      <span className="text-sm">Bitte prüfe oben die aktive Klasse. Falls du hier eigentlich eine Klasse mit Kindern erwartest, prüfe vor neuen Eingaben den geladenen Datenstand und die Datensicherung.</span>
                      {app.classes?.filter(room => room.id !== app.activeClassId && (room.schueler?.length || 0) > 0).length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 print:hidden" aria-label="Andere Klassen mit Kindern">
                          {app.classes.filter(room => room.id !== app.activeClassId && (room.schueler?.length || 0) > 0).map(room => (
                            <button key={room.id} type="button" onClick={() => switchClass(room.id)}
                              className="rounded-xl border border-emerald-700 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900 hover:bg-emerald-100">
                              {room.name} ({room.schueler.length} Kinder) öffnen
                            </button>
                          ))}
                        </div>
                      )}
                      <button type="button" onClick={() => setPage('klasse')} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white print:hidden">Zur Klassenauswahl</button>
                    </div>
                  </td>
                </tr>
              )}
              {students.map((s, i) => {
                let sum = 0;
                let count = 0;
                
                return (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface2/20 transition-colors">
                    <td className="px-4 py-3 text-[0.75rem] font-medium text-text-primary sticky left-0 bg-white group-hover:bg-surface2/20 border-r border-border/30 z-10">
                      {s.nachname} <span className="text-text-secondary font-normal">{s.vorname}</span>
                    </td>
                    {activeFaecher.map(f => {
                      const hasNotenmappe = app.fachConfig?.[f]?.unterrichtet !== false;
                      const currentSem = selectedSemester === 'combined' ? '1' : selectedSemester;
                      const nd: any = app.noten?.[s.id]?.[f]?.[currentSem] || {};

                      // Same precedence and numeric values as the CSV export.
                      const { noteToRender, numericForAvg } = getOverviewNote(app, s.id, f, selectedSemester);

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
                                    : (hasNotenmappe && berechne(app, s.id, f, selectedSemester as '1'|'2') !== null)
                                      ? 'border-emerald-300 text-emerald-700 bg-emerald-50/15 focus:ring-1 focus:ring-emerald-400' 
                                      : 'border-slate-200 text-slate-400 hover:border-slate-300 focus:ring-1 focus:ring-slate-300'
                                }`}
                              >
                                {(() => {
                                  const calcVal = hasNotenmappe ? berechne(app, s.id, f, selectedSemester as '1'|'2') : null;
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
