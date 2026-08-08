import React, { useState, useMemo } from 'react';
import { Archive as ArchiveIcon, Search, Filter, ChevronLeft, ChevronRight, Download, FileSpreadsheet, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_HISTORICAL_STUDENTS } from '../data/historicalStudents';

export const HISTORICAL_STUDENTS = DEFAULT_HISTORICAL_STUDENTS;

export default function Archive() {
  const { app, setApp } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('Alle');
  const [selectedClass, setSelectedClass] = useState('Alle');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const historicalStudents = app.historicalStudents || [];

  // Group unique archived classes
  const archivedClassesList = useMemo(() => {
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

  // Derive filter choices
  const years = useMemo(() => {
    return ['Alle', ...Array.from(new Set(historicalStudents.map(s => s.year)))];
  }, [historicalStudents]);

  const classes = useMemo(() => {
    const list = historicalStudents.filter(s => selectedYear === 'Alle' || s.year === selectedYear);
    return ['Alle', ...Array.from(new Set(list.map(s => s.class)))];
  }, [historicalStudents, selectedYear]);

  // Handle resetting page on filter change
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setSelectedClass('Alle');
    setCurrentPage(1);
  };

  const handleClassChange = (cls: string) => {
    setSelectedClass(cls);
    setCurrentPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteClass = (className: string, yearStr: string) => {
    const confirmMsg = `Möchten Sie die Klasse "${className}" (${yearStr}) wirklich vollständig aus dem Archiv löschen? Alle zugehörigen archivierten Schülerdaten werden unwiderruflich gelöscht. Erstellen Sie vorher bei Bedarf eine Datensicherung.`;
    if (confirm(confirmMsg)) {
      setApp(prev => ({
        ...prev,
        historicalStudents: (prev.historicalStudents || []).filter(s => !(s.class === className && s.year === yearStr))
      }));
      if (selectedClass === className && selectedYear === yearStr) {
        setSelectedClass('Alle');
        setSelectedYear('Alle');
      }
      setCurrentPage(1);
    }
  };

  const handleDeleteStudent = (id: string, name: string) => {
    if (confirm(`Möchten Sie den Archiveintrag von "${name}" wirklich unwiderruflich löschen? Erstellen Sie vorher bei Bedarf eine Datensicherung.`)) {
      setApp(prev => ({
        ...prev,
        historicalStudents: (prev.historicalStudents || []).filter(s => s.id !== id)
      }));
    }
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return historicalStudents.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.class.toLowerCase().includes(searchTerm.toLowerCase());
      const matchYear = selectedYear === 'Alle' || s.year === selectedYear;
      const matchClass = selectedClass === 'Alle' || s.class === selectedClass;
      return matchSearch && matchYear && matchClass;
    });
  }, [historicalStudents, searchTerm, selectedYear, selectedClass]);

  // Statistics
  const stats = useMemo(() => {
    if (filteredStudents.length === 0) return { avgGrade: 0, topStudentsCount: 0 };
    const sum = filteredStudents.reduce((acc, s) => acc + s.average, 0);
    const top = filteredStudents.filter(s => s.average <= 1.5).length;
    return {
      avgGrade: Number((sum / filteredStudents.length).toFixed(2)),
      topStudentsCount: top
    };
  }, [filteredStudents]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(start, start + itemsPerPage);
  }, [filteredStudents, currentPage, itemsPerPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Grade color badges
  const getGradeBadge = (grade: number) => {
    let color = '';
    if (grade === 1) color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    else if (grade === 2) color = 'bg-blue-50 text-blue-700 border-blue-100';
    else if (grade === 3) color = 'bg-amber-50 text-amber-700 border-amber-100';
    else if (grade === 4) color = 'bg-orange-50 text-orange-700 border-orange-100';
    else color = 'bg-rose-50 text-rose-700 border-rose-100';

    return (
      <span className={`w-6 h-6 rounded-md border flex items-center justify-center font-bold text-[0.75rem] leading-tight ${color}`}>
        {grade}
      </span>
    );
  };

  return (
    <div className="archive-shell max-w-6xl mx-auto space-y-4 py-4 px-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 bg-amber-50 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <ArchiveIcon size={21} />
          </div>
          <div>
            <h2 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Archivierte Jahrgänge</h2>
            <p className="text-[0.75rem] text-slate-500 font-medium">Durchsuchen Sie archivierte Stammblätter aus vorangegangenen Schuljahren.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto self-stretch sm:self-auto">
          <div className="flex bg-amber-50/50 rounded-2xl p-3 border border-amber-100/40 items-center gap-4 flex-1 sm:flex-initial">
            <div className="text-right">
              <p className="text-[0.5rem] font-black uppercase tracking-wider text-amber-700">Notenschnitt Gesamt</p>
              <p className="text-[1.125rem] leading-normal font-black text-slate-900 font-mono leading-none mt-0.5">{stats.avgGrade || '—'}</p>
            </div>
            <div className="w-[1px] h-6 bg-amber-200/40" />
            <div>
              <p className="text-[0.5rem] font-black uppercase tracking-wider text-amber-700">Schnitt bis 1,5</p>
              <p className="text-[1.125rem] leading-normal font-black text-slate-900 font-mono leading-none mt-0.5">{stats.topStudentsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Filter and Search Bar */}
      <div className="sticky top-0 z-30 bg-[#f4f7f3]/95 backdrop-blur-md py-3 border-b border-stone-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              aria-label="Archiv nach Schüler oder Klasse durchsuchen"
              placeholder="Schüler oder Klasse suchen..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full h-12 pl-11 pr-4 bg-white border border-stone-200 rounded-2xl text-[0.8125rem] font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/35 focus:border-amber-600 shadow-sm transition-all"
            />
          </div>

          {/* Academic Year Filter */}
          <div className="relative min-w-[140px]">
            <span className="absolute left-3.5 top-[5px] text-[0.5rem] font-black uppercase tracking-wider text-slate-400">Schuljahr</span>
            <select
              aria-label="Archiv nach Schuljahr filtern"
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="w-full h-12 pt-3 pl-3.5 pr-8 bg-white border border-stone-200 rounded-2xl text-[0.75rem] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/35 cursor-pointer appearance-none shadow-sm transition-all"
            >
              {years.map(yr => (
                <option key={yr} value={yr}>{yr === 'Alle' ? 'Alle Schuljahre' : yr}</option>
              ))}
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>

          {/* Class Filter */}
          <div className="relative min-w-[140px]">
            <span className="absolute left-3.5 top-[5px] text-[0.5rem] font-black uppercase tracking-wider text-slate-400">Klasse</span>
            <select
              aria-label="Archiv nach Klasse filtern"
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full h-12 pt-3 pl-3.5 pr-8 bg-white border border-stone-200 rounded-2xl text-[0.75rem] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/35 cursor-pointer appearance-none shadow-sm transition-all"
            >
              {classes.map(cl => (
                <option key={cl} value={cl}>{cl === 'Alle' ? 'Alle Klassen' : cl}</option>
              ))}
            </select>
            <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
          </div>
        </div>

        {/* Action Controls / Page size */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-2xl border border-stone-200 shadow-sm">
            <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-tighter">Zeilen:</span>
            <select
              aria-label="Einträge pro Seite"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-[0.6875rem] font-black text-slate-700 bg-transparent outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={8}>8</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
            </select>
          </div>
          <button 
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="h-10 px-4 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-[0.6875rem] font-black transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 size={13} />
            Löschbereich öffnen
          </button>
          <button 
            type="button"
            disabled
            title="Der XLS-Export ist im Prototyp noch nicht verfügbar"
            className="h-10 px-4 bg-stone-100 border border-stone-200 text-stone-400 rounded-xl text-[0.6875rem] font-black transition-all flex items-center justify-center gap-2 cursor-not-allowed"
          >
            <FileSpreadsheet size={13} />
            XLS-Export folgt
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-stone-100 p-12 text-center flex flex-col items-center justify-center space-y-4 shadow-xl shadow-slate-900/5">
          <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-300">
            <Search size={28} />
          </div>
          <div className="space-y-1">
            <h3 className="text-[1rem] leading-normal font-black text-slate-900">Keine Datensätze gefunden</h3>
            <p className="text-[0.75rem] leading-tight font-semibold text-slate-400 max-w-sm">
              Verfeinern Sie die Suche oder wählen Sie eine andere Kombination aus Schuljahr und Klasse.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedYear('Alle');
              setSelectedClass('Alle');
            }}
            className="px-5 h-10 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/60 shadow-xl shadow-slate-900/[0.02]  flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-[0.75rem] border-collapse text-left">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200/60">
                  <th className="py-4 px-5 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem]">Schüler:in</th>
                  <th className="py-4 px-4 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-center">Klasse & Jahr</th>
                  <th className="py-4 px-3 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-center">Deutsch</th>
                  <th className="py-4 px-3 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-center">Mathe</th>
                  <th className="py-4 px-3 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-center">Sachunterr.</th>
                  <th className="py-4 px-4 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem]">Sozialverhalten</th>
                  <th className="py-4 px-4 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-right">Notenschnitt</th>
                  <th className="py-4 px-5 font-black text-slate-400 uppercase tracking-widest text-[0.5625rem] text-center">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {paginatedStudents.map((s, index) => {
                  const isGoldAvg = s.average <= 1.34;
                  return (
                    <tr key={s.id} className="hover:bg-amber-50/15 transition-colors group">
                      <td className="py-4 px-5 font-bold text-slate-950 flex flex-col">
                        <span className="text-[0.8125rem]">{s.name}</span>
                        <span className="w-fit text-[0.5625rem] font-bold text-amber-800 uppercase tracking-wider leading-none mt-1 px-1.5 py-1 rounded-md bg-amber-50 border border-amber-100">Schreibgeschützt</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="font-bold text-slate-700">{s.class}</div>
                        <div className="text-[0.625rem] text-slate-400 font-medium leading-none mt-0.5">{s.year}</div>
                      </td>
                      <td className="py-4 px-3 align-middle"><div className="flex justify-center">{getGradeBadge(s.german)}</div></td>
                      <td className="py-4 px-3 align-middle"><div className="flex justify-center">{getGradeBadge(s.math)}</div></td>
                      <td className="py-4 px-3 align-middle"><div className="flex justify-center">{getGradeBadge(s.sach)}</div></td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.625rem] font-black uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-100">
                          {s.behavior}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono font-black text-[0.8125rem] text-slate-800">
                        <span className={isGoldAvg ? 'text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100' : ''}>
                          {s.average.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            disabled
                            aria-label={`Detailansicht für ${s.name} noch nicht verfügbar`}
                            className="p-1.5 bg-stone-50 text-stone-300 border border-stone-200/40 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                            title="Die Detailansicht ist im Prototyp noch nicht verfügbar"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            aria-label={`Archiveintrag von ${s.name} löschen`}
                            onClick={() => handleDeleteStudent(s.id, s.name)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 border border-rose-200/40 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                            title="Aus dem Archiv löschen"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-stone-50/70 border-t border-stone-200/60 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[0.6875rem] font-bold text-slate-500">
              Einträge <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> bis <strong className="text-slate-800">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> von <strong className="text-slate-800">{filteredStudents.length}</strong>
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Vorherige Archivseite"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="w-10 h-10 rounded-xl bg-white border border-stone-200/80 hover:border-amber-600/30 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:border-stone-200 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    aria-label={`Archivseite ${pageNum}`}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-[0.6875rem] font-black transition-all shadow-sm ${isActive ? 'bg-amber-600 border border-amber-600 text-white' : 'bg-white border border-stone-200/80 hover:border-amber-600/30 text-slate-700 hover:text-slate-900'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                aria-label="Nächste Archivseite"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="w-10 h-10 rounded-xl bg-white border border-stone-200/80 hover:border-amber-600/30 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:hover:border-stone-200 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info notice */}
      <p className="text-[0.625rem] font-black text-center text-stone-400 uppercase tracking-widest mt-4">
        Archivdaten enthalten personenbezogene Informationen und dürfen nur berechtigten Personen zugänglich sein.
      </p>

      {/* Klassen löschen Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div role="dialog" aria-modal="true" aria-labelledby="archive-delete-dialog-title" className="bg-white rounded-2xl w-full max-w-md border border-stone-200 shadow-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Trash2 size={18} className="text-rose-600" />
                <h3 id="archive-delete-dialog-title" className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">Klassen aus dem Archiv löschen</h3>
              </div>
              <button 
                type="button"
                aria-label="Dialog zum Löschen von Klassen schließen"
                onClick={() => setShowDeleteModal(false)}
                className="text-stone-400 hover:text-stone-700 font-extrabold text-[0.875rem] leading-snug cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[0.75rem] leading-tight text-stone-500 font-medium leading-relaxed">
              Wählen Sie eine archivierte Klasse aus, um sie unwiderruflich aus dem Systemarchiv und der Statistik zu entfernen. Erstellen Sie vorher bei Bedarf eine Datensicherung.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {archivedClassesList.length === 0 ? (
                <p className="text-[0.75rem] leading-tight text-stone-400 italic text-center py-6 font-semibold">Keine archivierten Klassen vorhanden.</p>
              ) : (
                archivedClassesList.map((cl, i) => (
                  <div key={i} className="flex justify-between items-center bg-stone-50 hover:bg-stone-100/70 p-3 rounded-2xl border border-stone-200/40 transition-all">
                    <div>
                      <h4 className="font-bold text-slate-800 text-[0.75rem] leading-tight">{cl.className}</h4>
                      <p className="text-[0.625rem] text-slate-500 font-bold">Schuljahr {cl.year} • {cl.count} Schüler:innen</p>
                    </div>
                    <button 
                      type="button"
                      aria-label={`${cl.className} aus dem Schuljahr ${cl.year} unwiderruflich löschen`}
                      onClick={() => {
                        handleDeleteClass(cl.className, cl.year);
                      }}
                      className="p-1.5 bg-rose-50 text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-700"
                      title="Diese Klasse löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-stone-100">
              <button 
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-5 h-10 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
