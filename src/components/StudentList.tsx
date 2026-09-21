
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Student, UNIFIED_DEFAULT_BADGES } from '../types';
import { 
  Plus, Search, Edit2, Trash2, UserPlus, Phone, Globe, 
  Languages, Gift, Info, Star, GraduationCap, Activity, 
  FileText, Heart, X, Printer, History, Save,
  Clock, Filter, ChevronRight, Notebook, Sparkles, Loader2, Award, ArrowLeft, Download, Mic, AlertCircle, Map, FileUp, Camera
} from 'lucide-react';
import { KlassenlistenImport } from './KlassenlistenImport';
import { DebouncedInput } from './DebouncedInput';
import { motion, AnimatePresence } from 'motion/react';
import StudentDossier from './StudentDossier';
import Sek1ClassPicker from './Sek1ClassPicker';
import ClassOverviewStats from './ClassOverviewStats';
import StudentPortfolio from './StudentPortfolio';
const StudentMap = React.lazy(() => import('./StudentMap'));
import { EmptyState } from './EmptyState';
import confetti from 'canvas-confetti';
import StudentTimeline from './StudentTimeline';
import { exportSchuelerPDF } from '../lib/exportService';
import { calculateStudentAge, getStudentComparableName, getStudentGenderLabel, mergeImportedStudents, normalizeStudentGender, parseStudentBirthday, sortStudentsForList, toDateInputValue } from '../lib/studentListData';

const isBirthdayToday = (geburtstagStr: string | undefined | null) => {
  const bday = parseStudentBirthday(geburtstagStr);
  if (!bday) return false;
  const today = new Date();
  return bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth();
};

const playBirthdayJingle = () => {
  const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  
  // Happy birthday notes (C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00, A4 = 440.00, B4 = 493.88, C5 = 523.25)
  // Notes: C C D C F E
  const notes = [
    { freq: 261.63, delay: 0 },
    { freq: 261.63, delay: 0.2 },
    { freq: 293.66, delay: 0.4 },
    { freq: 261.63, delay: 0.8 },
    { freq: 349.23, delay: 1.2 },
    { freq: 329.63, delay: 1.6 },
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, now + note.delay);
    
    gain.gain.setValueAtTime(0, now + note.delay);
    gain.gain.linearRampToValueAtTime(0.18, now + note.delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.6);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + note.delay);
    osc.stop(now + note.delay + 0.655);
  });
};

const handleBirthdayCelebrate = (studentName: string) => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    zIndex: 99999
  });
  playBirthdayJingle();
};

export default function StudentList() {
  const { app, updateStudent, deleteStudent, setApp, setPage } = useApp();
  const zoomLevel = app?.settings?.zoomLevel || "standard";
  const isCompact = zoomLevel === "compact" || app?.settings?.uiScale === 0.88;
  const isLarge = zoomLevel === "large";

  const schueler = app?.schueler || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentFormSection, setStudentFormSection] = useState<'basis' | 'paedagogik' | 'kontakte'>('basis');
  const [isKlassenlistImportOpen, setIsKlassenlistImportOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [timelineStudent, setTimelineStudent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [showClassStatistics, setShowClassStatistics] = useState(false);
  const [showColumnOptions, setShowColumnOptions] = useState(false);
  const [menuStudentId, setMenuStudentId] = useState<string | null>(null);
  type OptionalColumn = 'birthday' | 'funding' | 'firstLanguage' | 'secondLanguage' | 'religion' | 'gender' | 'level';
  const [visibleColumns, setVisibleColumns] = useState<Record<OptionalColumn, boolean>>(() => {
    const defaults: Record<OptionalColumn, boolean> = {
      birthday: true, funding: true, firstLanguage: false, secondLanguage: false,
      religion: false, gender: false, level: false,
    };
    try {
      const saved = JSON.parse(localStorage.getItem('klassio_student_list_columns_v1') || 'null');
      if (saved && typeof saved === 'object') {
        for (const key of Object.keys(defaults) as OptionalColumn[]) {
          if (typeof saved[key] === 'boolean') defaults[key] = saved[key];
        }
      }
    } catch { /* local settings unavailable: use defaults */ }
    return defaults;
  });
  useEffect(() => {
    try { localStorage.setItem('klassio_student_list_columns_v1', JSON.stringify(visibleColumns)); }
    catch { /* optional device preference; do not interrupt class work */ }
  }, [visibleColumns]);
  const [selectedFolderStudent, setSelectedFolderStudent] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [folderQuickNote, setFolderQuickNote] = useState('');
  const [isBadgeSelectorOpen, setIsBadgeSelectorOpen] = useState(false);
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('🧠');

  const [sortBy, setSortBy] = useState<'nachname' | 'vorname' | 'alter'>('nachname');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  type FundingFilter = 'daz' | 'spf' | 'espf';
  const [activeFilters, setActiveFilters] = useState<FundingFilter[]>([]);
  const [inlineEditingNiveau, setInlineEditingNiveau] = useState<string | null>(null);
  
  const [visibleLimit, setVisibleLimit] = useState(15);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleLimit(15);
  }, [searchTerm, activeFilters, sortBy, sortOrder]);

  useEffect(() => {
    if (isModalOpen) setStudentFormSection('basis');
  }, [isModalOpen]);

  useEffect(() => {
    // A class change must never keep an old child, editor or interaction open.
    setSelectedFolderStudent(null);
    setEditingStudent(null);
    setTimelineStudent(null);
    setIsModalOpen(false);
    setIsKlassenlistImportOpen(false);
    setInlineEditingNiveau(null);
    setFolderQuickNote('');
    setSearchTerm('');
    setActiveFilters([]);
    setViewMode('list');
    setShowClassStatistics(false);
    setShowColumnOptions(false);
    setMenuStudentId(null);
  }, [app.activeClassId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleLimit(prev => prev + 15);
      }
    }, { rootMargin: '120px' });
    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, [schueler.length, visibleLimit]);
  
  const isDuplicateName = useMemo(() => {
    if (!editingStudent?.vorname || !editingStudent?.nachname) return false;
    const currentFullName = `${editingStudent.vorname.trim()} ${editingStudent.nachname.trim()}`.toLowerCase();
    return schueler.some(s => s.id !== editingStudent.id && getStudentComparableName(s) === currentFullName);
  }, [editingStudent?.vorname, editingStudent?.nachname, schueler, editingStudent?.id]);

  const { maleCount, femaleCount, diverseCount, unknownGenderCount, dazCount, spfCount, espfCount } = useMemo(() => {
    return {
      maleCount: schueler.filter(s => normalizeStudentGender(s.geschlecht) === 'männlich').length,
      femaleCount: schueler.filter(s => normalizeStudentGender(s.geschlecht) === 'weiblich').length,
      diverseCount: schueler.filter(s => normalizeStudentGender(s.geschlecht) === 'divers').length,
      unknownGenderCount: schueler.filter(s => !s.geschlecht).length,
      dazCount: schueler.filter(s => s.daz).length,
      spfCount: schueler.filter(s => s.spf).length,
      espfCount: schueler.filter(s => s.espf).length,
    };
  }, [schueler]);

  const religionCounts = useMemo(() => {
    return schueler.reduce((acc, s) => {
      const rel = s.religion || 'Unbekannt';
      acc[rel] = (acc[rel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [schueler]);

  const { avgAge, minAge, maxAge } = useMemo(() => {
    const agesList = schueler
      .map(s => calculateStudentAge(s.geburtstag))
      .filter((age): age is number => age !== null);

    return {
      avgAge: agesList.length > 0 ? (agesList.reduce((a, b) => a + b, 0) / agesList.length).toFixed(1) : '–',
      minAge: agesList.length > 0 ? Math.min(...agesList) : '–',
      maxAge: agesList.length > 0 ? Math.max(...agesList) : '–',
    };
  }, [schueler]);

  const filteredStudents = useMemo(() => {
    const filtered = schueler.filter(s => {
      const normalizedSearch = searchTerm.trim().toLowerCase();
      const matchesSearch = [
        s.vorname,
        s.nachname,
        `${s.vorname || ''} ${s.nachname || ''}`,
        `${s.nachname || ''} ${s.vorname || ''}`,
        s.ikmNummer,
        s.sv_nummer,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      if (!matchesSearch) return false;
      // Selecting multiple badges narrows the list to children matching all of them.
      return activeFilters.every(filter => Boolean(s[filter]));
    });

    return sortStudentsForList(filtered, sortBy, sortOrder);
  }, [schueler, searchTerm, activeFilters, sortBy, sortOrder]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const vorname = editingStudent?.vorname?.trim() || '';
    const nachname = editingStudent?.nachname?.trim() || '';
    if (!editingStudent || !vorname || !nachname) {
      setStudentFormSection('basis');
      return;
    }

    const student = {
      ...editingStudent,
      id: editingStudent.id || crypto.randomUUID(),
      name: `${vorname} ${nachname}`,
      niveau: editingStudent.niveau || 3,
      vorname,
      nachname,
    } as Student;
    updateStudent(student);
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleDeleteStudent = (student: Student) => {
    const fullName = `${student.vorname} ${student.nachname}`.trim();
    const confirmed = confirm(
      `${fullName} wirklich aus dieser Klasse löschen?\n\nDabei werden auch die zu diesem Kind gespeicherten Notizen, Anwesenheiten, Bewertungen, Diagnostik- und Sitzplandaten aus dieser Klasse entfernt. Finanztransaktionen bleiben für die Kassenbilanz erhalten, werden aber vom Kind entkoppelt.`
    );
    if (!confirmed) return;

    if (selectedFolderStudent === student.id) setSelectedFolderStudent(null);
    deleteStudent(student.id);
  };

  if (selectedFolderStudent) {
    return (
      <div className="space-y-4 w-full min-w-0 overflow-hidden">
        <Sek1ClassPicker />
        <StudentDossier 
          schuelerId={selectedFolderStudent} 
          onBack={() => setSelectedFolderStudent(null)} 
          onStudentChange={setSelectedFolderStudent} 
        />
      </div>
    );
  }

  return (
    <>
      <Sek1ClassPicker />
      {schueler.length === 0 ? (
        <div className="py-20 print:hidden">
          <EmptyState 
            icon="👋"
            title="Willkommen in deiner neuen Klasse!"
            description="Es sind noch keine Schüler:innen angelegt. Starte jetzt und lege deine erste Schülerin oder deinen ersten Schüler an."
            actionLabel="Schüler:in hinzufügen"
            onAction={() => { 
              setEditingStudent({ plz: '', ort: '', niveau: 3 }); 
              setIsModalOpen(true); 
            }}
          />
        </div>
      ) : (
        <>
          <div className={`${isCompact ? "space-y-4" : isLarge ? "space-y-8" : "space-y-6"} print:hidden`}>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-2.5 sm:px-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-700">
            <span className="font-extrabold text-slate-900">{schueler.length} Kinder</span>
            <span>{maleCount} Jungen · {femaleCount} Mädchen{diverseCount ? ` · ${diverseCount} divers` : ''}{unknownGenderCount ? ` · ${unknownGenderCount} offen` : ''}</span>
            <span>DaZ {dazCount} · SPF {spfCount} · ESPF {espfCount}</span>
            <button type="button" aria-expanded={showClassStatistics} aria-controls="klassio-class-statistics"
              onClick={() => setShowClassStatistics(open => !open)}
              className="ml-auto rounded-lg border border-indigo-200 px-3 py-1.5 text-indigo-700 font-bold hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600">
              {showClassStatistics ? 'Statistik ausblenden' : 'Klassenstatistik anzeigen'}
            </button>
          </div>
          {showClassStatistics && <div id="klassio-class-statistics"><ClassOverviewStats students={schueler} /></div>}
        </div>

        <div className={`flex flex-col gap-3 bg-white border border-slate-200 shadow-sm print:hidden ${
          isCompact ? 'p-2 sm:p-3 rounded-xl' : isLarge ? 'p-4 sm:p-6 rounded-2xl' : 'p-3 sm:p-4 rounded-2xl'
        }`}>
          {/* Top row: Title and Add button */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 sm:gap-3 w-full">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className={`bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 border border-slate-100 shrink-0 ${
                isCompact ? 'w-7 h-7' : isLarge ? 'w-10 h-10' : 'w-8 h-8 sm:w-9 sm:h-9'
              }`}>
                <GraduationCap size={isCompact ? 13 : isLarge ? 18 : 15} />
              </div>
              <div>
                <h3 className={`${isCompact ? 'text-[0.55rem]' : isLarge ? 'text-[0.7rem]' : 'text-[0.55rem] sm:text-[0.65rem]'} font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 leading-none`}>Klassenliste</h3>
                <p className={`${isCompact ? 'text-[0.7rem]' : isLarge ? 'text-[0.95rem]' : 'text-[0.7rem] sm:text-[0.8rem]'} text-slate-900 font-black mt-0.5 sm:mt-1`}>
                  {filteredStudents.length} {activeFilters.length > 0 || searchTerm ? `von ${schueler.length}` : ''} Schüler/innen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <button 
                onClick={() => setIsKlassenlistImportOpen(true)}
                title="Klassenliste importieren"
                className={`flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer ${
                  isCompact ? 'w-7 h-7' : isLarge ? 'w-11 h-11 rounded-xl' : 'w-8 h-8 sm:w-10 sm:h-10'
                }`}
              >
                <FileUp size={isCompact ? 11 : isLarge ? 17 : 14} />
              </button>
              <button type="button"
                onClick={() => setShowColumnOptions(open => !open)}
                aria-expanded={showColumnOptions}
                aria-controls="klassio-student-column-options"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                Spalten anpassen
              </button>
              <button 
                onClick={() => { 
                  setEditingStudent({ plz: '', ort: '', niveau: 3 });
                  setIsModalOpen(true);
                }}
                className={`flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-black uppercase tracking-wider flex justify-center items-center transition-all shadow-md active:scale-95 cursor-pointer ${
                  isCompact ? 'px-2 py-1 text-[0.55rem] gap-1' : isLarge ? 'px-5 py-3 text-[0.75rem] gap-2 rounded-xl' : 'px-3.5 py-2.5 text-[0.6875rem] gap-1.5'
                }`}
              >
                <UserPlus size={isCompact ? 11 : isLarge ? 16 : 13} />
                <span>Schüler hinzufügen</span>
              </button>
            </div>
          </div>

          {showColumnOptions && (
            <div id="klassio-student-column-options"
              className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
              role="group" aria-label="Sichtbare Spalten in der Schülerliste">
              <span className="text-xs font-semibold text-slate-600">Name immer sichtbar · zusätzlich anzeigen:</span>
              {([
                ['birthday', 'Geburtstag'], ['funding', 'Förderung'],
                ['firstLanguage', 'Erstsprache'], ['secondLanguage', 'Zweitsprache'],
                ['religion', 'Religion'], ['gender', 'Geschlecht'], ['level', 'Niveau'],
              ] as const).map(([key, label]) => (
                <label key={key} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={visibleColumns[key]}
                    onChange={event => setVisibleColumns(previous => ({ ...previous, [key]: event.target.checked }))}
                    className="accent-indigo-600" />
                  {label}
                </label>
              ))}
              <button type="button"
                onClick={() => setVisibleColumns({
                  birthday: true, funding: true, firstLanguage: false, secondLanguage: false,
                  religion: false, gender: false, level: false,
                })}
                className="text-xs font-bold text-indigo-700 hover:underline">
                Standardansicht
              </button>
            </div>
          )}

          {/* Middle row: Search, Sort, Filters */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 animate-pulse" size={14} />
                <DebouncedInput 
                  className={`w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[0.8125rem] leading-tight font-medium focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-500 ${
                    isCompact ? 'text-[0.7rem] py-1 pl-7 pr-7' : isLarge ? 'text-[0.825rem] py-2 pl-9 pr-9' : ''
                  }`}
                  placeholder="Name oder Schülernummer suchen..."
                  value={searchTerm}
                  onChange={setSearchTerm}
                  debounceMs={300}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    aria-label="Suche zurücksetzen"
                    title="Suche zurücksetzen"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-350 hover:text-slate-600 transition-colors p-0.5 rounded-full hover:bg-slate-200/50"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <select 
                aria-label="Schülerliste sortieren nach"
                className={`bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-[0.6875rem] font-medium outline-none focus:border-indigo-600 transition-all cursor-pointer ${
                  isCompact ? 'w-24 text-[0.625rem] py-1' : isLarge ? 'w-36 text-[0.75rem] py-2' : 'w-28 sm:w-32'
                }`}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="nachname">Nachname</option>
                <option value="vorname">Vorname</option>
                <option value="alter">Alter</option>
              </select>
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className={`px-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all font-black uppercase flex items-center justify-center shrink-0 ${
                  isCompact ? 'text-[0.55rem] h-7' : isLarge ? 'text-[0.75rem] h-10 w-10' : 'text-[0.625rem]'
                }`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-50 border border-slate-200 px-2 py-1.5" aria-label="Förderkennzeichen kombinierbar filtern">
              <button type="button" onClick={() => setActiveFilters([])}
                aria-pressed={activeFilters.length === 0}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${activeFilters.length === 0 ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                Alle {schueler.length}
              </button>
              {([
                ['daz', 'DaZ', dazCount],
                ['spf', 'SPF', spfCount],
                ['espf', 'ESPF', espfCount],
              ] as const).map(([filter, label, count]) => (
                <button type="button" key={filter}
                  aria-pressed={activeFilters.includes(filter)}
                  title={`${label}-Kennzeichen filtern; mehrere Kennzeichen kombinierbar`}
                  onClick={() => setActiveFilters(previous => previous.includes(filter)
                    ? previous.filter(item => item !== filter)
                    : [...previous, filter])}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${activeFilters.includes(filter) ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-indigo-200' : 'text-slate-600 hover:bg-white'}`}>
                  {label} {count}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: View modes */}
          <div className={`flex bg-slate-50 border border-slate-200 overflow-x-auto no-scrollbar width-full auto-cols-auto ${
          isCompact ? 'p-0.5 rounded-md' : isLarge ? 'p-1.5 rounded-xl' : 'p-1 rounded-xl'
          }`}>
            <button 
                onClick={() => setViewMode('list')}
                className={`flex-1 flex items-center justify-center transition-all whitespace-nowrap ${
                  isCompact 
                    ? 'px-2 py-1 text-[0.5rem] gap-1 rounded-sm' 
                    : isLarge 
                      ? 'px-4 py-2.5 text-[0.6875rem] gap-2 rounded-lg' 
                      : 'px-3 py-1.5 text-[0.5625rem] gap-1.5 rounded-md'
                } ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <div className="flex gap-0.5"><div className="w-1.5 h-1.5 bg-current rounded-sm" /><div className="w-1.5 h-1.5 bg-current rounded-sm" /></div>
                <span className="hidden sm:inline">Liste</span>
            </button>
            <button 
                onClick={() => setViewMode('grid')}
                className={`flex-1 flex items-center justify-center transition-all whitespace-nowrap ${
                  isCompact 
                    ? 'px-2 py-1 text-[0.5rem] gap-1 rounded-sm' 
                    : isLarge 
                      ? 'px-4 py-2.5 text-[0.6875rem] gap-2 rounded-lg' 
                      : 'px-3 py-1.5 text-[0.5625rem] gap-1.5 rounded-md'
                } ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <div className="grid grid-cols-2 gap-0.5"><div className="w-1 h-1 bg-current rounded-sm" /><div className="w-1 h-1 bg-current rounded-sm" /><div className="w-1 h-1 bg-current rounded-sm" /><div className="w-1 h-1 bg-current rounded-sm" /></div>
                <span className="hidden sm:inline">Kacheln</span>
            </button>
            <button 
                onClick={() => setViewMode('map')}
                className={`flex-1 flex items-center justify-center transition-all whitespace-nowrap ${
                  isCompact 
                    ? 'px-2 py-1 text-[0.5rem] gap-1 rounded-sm' 
                    : isLarge 
                      ? 'px-4 py-2.5 text-[0.6875rem] gap-2 rounded-lg' 
                      : 'px-3 py-1.5 text-[0.5625rem] gap-1.5 rounded-md'
                } ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
                <Map size={isCompact ? 9 : isLarge ? 14 : 11} />
                <span className="hidden sm:inline">Karte</span>
            </button>
          </div>
        </div>

  {filteredStudents.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center print:hidden">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 mb-4">
            <Search size={20} />
          </div>
          <h4 className="font-black text-slate-900">Keine passenden Schüler:innen</h4>
          <p className="text-sm text-slate-500 mt-1">Passe die Suche oder den Filter an.</p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setActiveFilters([]); }}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-colors"
          >
            Suche & Filter zurücksetzen
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl print:hidden">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[620px] text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-600">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2.5">#</th>
                  <th scope="col" className="px-3 py-2.5">Schüler/in</th>
                  {visibleColumns.birthday && <th scope="col" className="px-3 py-2.5 whitespace-nowrap">Geburtstag</th>}
                  {visibleColumns.funding && <th scope="col" className="px-3 py-2.5">Förderung</th>}
                  {visibleColumns.firstLanguage && <th scope="col" className="px-3 py-2.5">Erstsprache</th>}
                  {visibleColumns.secondLanguage && <th scope="col" className="px-3 py-2.5">Zweitsprache</th>}
                  {visibleColumns.religion && <th scope="col" className="px-3 py-2.5">Religion</th>}
                  {visibleColumns.gender && <th scope="col" className="px-3 py-2.5">Geschlecht</th>}
                  {visibleColumns.level && <th scope="col" className="px-3 py-2.5">Niveau</th>}
                  <th scope="col" className="px-3 py-2.5 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student, index) => {
                  const birthday = isBirthdayToday(student.geburtstag);
                  return (
                    <tr key={student.id} className={`hover:bg-indigo-50/40 ${birthday ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-3 py-2 text-slate-500 tabular-nums">{index + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => setSelectedFolderStudent(student.id)}
                            className="text-left font-bold text-slate-900 hover:text-indigo-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                            title="Schülerdossier öffnen">
                            {student.nachname} {student.vorname}
                          </button>
                          {birthday && (
                            <button type="button" onClick={() => handleBirthdayCelebrate(student.vorname)}
                              aria-label={`Geburtstag von ${student.vorname} feiern`} title="Geburtstag feiern" className="text-amber-600">
                              <Gift size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                      {visibleColumns.birthday && (
                        <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                          {student.geburtstag ? (student.geburtstag.includes('-')
                            ? student.geburtstag.split('-').reverse().join('.') : student.geburtstag) : '–'}
                        </td>
                      )}
                      {visibleColumns.funding && (
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap items-center gap-1">
                            <button type="button" onClick={() => updateStudent({ ...student, daz: !student.daz })}
                              aria-pressed={Boolean(student.daz)} aria-label={`DaZ bei ${student.vorname} ${student.nachname} umschalten`}
                              title="DaZ-Kennzeichen umschalten"
                              className={`rounded border px-1.5 py-0.5 text-[0.6875rem] font-bold ${student.daz ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-amber-700'}`}>
                              DaZ
                            </button>
                            <button type="button" onClick={() => updateStudent({ ...student, spf: !student.spf })}
                              aria-pressed={Boolean(student.spf)} aria-label={`SPF bei ${student.vorname} ${student.nachname} umschalten`}
                              title="SPF-Kennzeichen umschalten"
                              className={`rounded border px-1.5 py-0.5 text-[0.6875rem] font-bold ${student.spf ? 'bg-violet-50 text-violet-800 border-violet-300' : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-violet-700'}`}>
                              SPF
                            </button>
                            {student.espf && <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[0.6875rem] font-bold text-emerald-800">ESPF</span>}
                            {app.differenzierungsGruppen?.filter(group => group.schuelerIds.includes(student.id)).map(group => (
                              <span key={group.id} className={`rounded px-1.5 py-0.5 text-xs text-white ${group.farbe}`} title={group.name || 'Gruppe'}>
                                {group.emoji}
                              </span>
                            ))}
                          </div>
                        </td>
                      )}
                      {visibleColumns.firstLanguage && <td className="px-3 py-2">{student.erstsprache || '–'}</td>}
                      {visibleColumns.secondLanguage && <td className="px-3 py-2">{student.zweitsprache || '–'}</td>}
                      {visibleColumns.religion && <td className="px-3 py-2">{student.religion || '–'}</td>}
                      {visibleColumns.gender && <td className="px-3 py-2">{getStudentGenderLabel(student.geschlecht)}</td>}
                      {visibleColumns.level && <td className="px-3 py-2">{student.niveau || '–'}</td>}
                      <td className="px-3 py-2">
                        <div className="flex justify-end items-center gap-1.5">
                          <button type="button" onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                            className="rounded-lg p-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
                            aria-label={`${student.vorname} ${student.nachname} bearbeiten`} title="Bearbeiten">
                            <Edit2 size={16} />
                          </button>
                          <button type="button" onClick={() => setMenuStudentId(old => old === student.id ? null : student.id)}
                            aria-expanded={menuStudentId === student.id}
                            aria-label={`Weitere Aktionen für ${student.vorname} ${student.nachname}`}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-slate-600 hover:bg-slate-100" title="Weitere Aktionen">
                            ⋯
                          </button>
                          {menuStudentId === student.id && (
                            <button type="button"
                              onClick={() => { setMenuStudentId(null); handleDeleteStudent(student); }}
                              className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                              aria-label={`${student.vorname} ${student.nachname} aus der Klasse entfernen`}>
                              Entfernen
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : false ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:p-8">
           <div className="lg:col-span-1 space-y-3 pr-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between px-2 mb-4">
                <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Schülerordner</h4>
                <button 
                  onClick={() => setViewMode('list')} 
                  className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-[0.1em] text-accent hover:text-accent/80 bg-accent/10 px-2 py-1 rounded-lg transition-colors"
                >
                  <ArrowLeft size={12} strokeWidth={2.5} />
                  Zurück
                </button>
              </div>
              {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname)).map(s => {
                  const noteCount = (app.notizen || []).filter(n => n.schuelerId === s.id).length;
                  return (
                    <button 
                      key={s.id}
                      onClick={() => { setSelectedFolderStudent(s.id); setIsSidebarCollapsed(true); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-3xl border transition-all text-left ${selectedFolderStudent === s.id ? 'bg-accent border-accent text-white shadow-xl shadow-accent/20' : 'bg-white border-slate-100 hover:border-accent/30 text-slate-900 shadow-sm'}`}
                    >
                       <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-[0.875rem] leading-snug font-black ${selectedFolderStudent === s.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                          {s.vorname.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className={`text-[0.75rem] leading-tight font-black text-wrap leading-tight break-words ${selectedFolderStudent === s.id ? 'text-white' : 'text-slate-900'}`}>{s.nachname}</div>
                          <div className={`text-[0.625rem] font-medium ${selectedFolderStudent === s.id ? 'text-white/60' : 'text-slate-400'}`}>{s.vorname}</div>
                       </div>
                       {noteCount > 0 && (
                          <div className={`px-2 py-0.5 rounded-lg text-[0.5625rem] font-black ${selectedFolderStudent === s.id ? 'bg-white text-slate-900 shadow-3xs' : 'bg-slate-100 text-slate-500'}`}>
                             {noteCount}
                          </div>
                       )}
                    </button>
                  )
              })}
           </div>
           <div className="lg:col-span-3 space-y-6">
              {selectedFolderStudent ? (
                 <>
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between transition-all">
                       <div className="flex items-center gap-4 sm:p-6">
                           {(() => {
                              const curS = app.schueler.find(s => s.id === selectedFolderStudent);
                              return curS?.foto ? (
                                 <img 
                                    src={curS.foto} 
                                    alt={`${curS.vorname} ${curS.nachname}`} 
                                    className="w-20 h-20 rounded-full object-cover border border-zinc-800/10 shadow-sm"
                                    referrerPolicy="no-referrer"
                                 />
                              ) : (
                                 <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[1.5rem] leading-normal font-black border border-slate-200 shadow-inner">
                                    {curS?.emoji ? <span className="text-5xl leading-none drop-shadow-sm">{curS.emoji}</span> : `${curS?.vorname.charAt(0)}${curS?.nachname.charAt(0)}`}
                                 </div>
                              );
                           })()}
                           <div>
                              <h3 className="text-[1.5rem] leading-normal font-black text-slate-900 tracking-tight">
                                 {app.schueler.find(s => s.id === selectedFolderStudent)?.vorname} {app.schueler.find(s => s.id === selectedFolderStudent)?.nachname}
                              </h3>
                              <p className="text-[0.6875rem] font-black text-accent uppercase tracking-widest mt-1">Sammelordner für Notizen & Beobachtungen</p>
                           </div>
                       </div>
                       <div className="flex h-12 px-6 bg-slate-50 rounded-2xl items-center gap-4 border border-slate-100">
                          <div className="text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Inhalt:</div>
                          <div className="text-[0.875rem] leading-snug font-black text-slate-900">{(app.notizen || []).filter(n => n.schuelerId === selectedFolderStudent).length} Einträge</div>
                       </div>
                    </div>

                    <div className="bg-slate-900 p-4 sm:p-6 rounded-2xl shadow-md">
                       <h4 className="text-[0.625rem] font-black text-white/40 uppercase tracking-[0.2em] mb-4">Schnell-Notiz erstellen</h4>
                       <div className="flex gap-4">
                          <input 
                             type="text" 
                             placeholder="Neue Beobachtung tippen..."
                             className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-[0.875rem] leading-snug font-medium outline-none focus:border-accent transition-all"
                             value={folderQuickNote}
                             onChange={(e) => setFolderQuickNote(e.target.value)}
                             onKeyDown={(e) => {
                                if (e.key === 'Enter' && folderQuickNote.trim()) {
                                   const newNote = {
                                      id: Date.now().toString(),
                                      titel: 'Ordnernotiz',
                                      inhalt: folderQuickNote,
                                      icon: '📝',
                                      timestamp: Date.now(),
                                      schuelerId: selectedFolderStudent
                                   };
                                   setApp(prev => ({ 
                                      ...prev, 
                                      notizen: [newNote, ...(prev.notizen || [])] 
                                   }));
                                   setFolderQuickNote('');
                                }
                             }}
                          />
                          <button 
                             onClick={() => {
                                if (folderQuickNote.trim()) {
                                   const newNote = {
                                      id: Date.now().toString(),
                                      titel: 'Ordnernotiz',
                                      inhalt: folderQuickNote,
                                      icon: '📝',
                                      timestamp: Date.now(),
                                      schuelerId: selectedFolderStudent
                                   };
                                   setApp(prev => ({ 
                                      ...prev, 
                                      notizen: [newNote, ...(prev.notizen || [])] 
                                   }));
                                   setFolderQuickNote('');
                                }
                             }}
                             className="px-4 sm:px-8 bg-accent text-white font-black text-[0.75rem] uppercase tracking-widest rounded-2xl shadow-lg shadow-accent/20 active:scale-95 transition-all"
                          >
                             Hinzufügen
                          </button>
                       </div>
                    </div>

                    {/* BADGES DISPLAY */}
                    <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                       <div className="flex items-center justify-between">
                          <h4 className="text-[0.625rem] font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                             <Award size={14} className="text-amber-500" />
                             Erhaltene Badges
                          </h4>
                          <button
                             onClick={() => setIsBadgeSelectorOpen(!isBadgeSelectorOpen)}
                             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase transition-all border cursor-pointer ${
                                isBadgeSelectorOpen
                                   ? 'bg-amber-500 border-amber-400 text-amber-950 font-black'
                                   : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                             }`}
                          >
                             <Sparkles size={11} />
                             {isBadgeSelectorOpen ? 'Schließen' : 'Abzeichen verleihen'}
                          </button>
                       </div>

                       <AnimatePresence>
                          {isBadgeSelectorOpen ? (
                             <motion.div
                                key="badgeSelector"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className=""
                             >
                                <div className="p-4 bg-amber-50/60 border border-amber-200/50 rounded-2xl grid grid-cols-2 sm:grid-cols-3 gap-2">
                                   {[
                                      ...UNIFIED_DEFAULT_BADGES,
                                      
                                      
                                      
                                      
                                      
                                      
                                      
                                      
                                       
                                       ...(app.custom_badges || []).map((cb, idx) => ({
                                          id: `custom-${idx}`,
                                          name: cb.name,
                                          icon: cb.icon
                                       }))
                                   ].map(badge => (
                                      <button
                                         key={badge.id}
                                         onClick={() => {
                                            setApp(prev => ({
                                               ...prev,
                                               schueler: prev.schueler.map(s => 
                                                  s.id === selectedFolderStudent
                                                     ? { 
                                                          ...s, 
                                                          badges: [
                                                             { 
                                                                id: Date.now().toString() + Math.random().toString(), 
                                                                name: badge.name, 
                                                                icon: badge.icon, 
                                                                date: new Date().toISOString() 
                                                             }, 
                                                             ...(s.badges || [])
                                                          ] 
                                                       }
                                                     : s
                                               )
                                            }));
                                            setIsBadgeSelectorOpen(false);
                                            confetti({
                                               particleCount: 100,
                                               spread: 70,
                                               origin: { y: 0.6 },
                                               colors: ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6']
                                            });
                                         }}
                                         className="flex items-center gap-2 p-2 bg-white hover:bg-amber-100/50 border border-amber-200/40 rounded-xl text-left transition-all active:scale-95 cursor-pointer"
                                      >
                                         <span className="text-[1.25rem] leading-normal drop-shadow-sm shrink-0">{badge.icon}</span>
                                         <span className="text-[0.625rem] font-black text-slate-800 leading-tight">{badge.name}</span>
                                      </button>
                                   ))}
                                </div>
                             </motion.div>
                          ) : null}
                       </AnimatePresence>

                       <div className="flex flex-wrap gap-2.5">
                           {(() => {
                              const badges = app.schueler.find(s => s.id === selectedFolderStudent)?.badges || [];
                              if (badges.length === 0) {
                                 return <div className="text-[0.75rem] leading-tight font-bold text-slate-350 italic px-1">Noch keine Badges erhalten.</div>;
                              }
                              return badges.map(b => (
                                 <div 
                                    key={b.id} 
                                    onClick={() => {
                                       if (confirm(`Möchtest du das Abzeichen "${b.name}" wieder entfernen?`)) {
                                          setApp(prev => ({
                                             ...prev,
                                             schueler: prev.schueler.map(s => 
                                                s.id === selectedFolderStudent
                                                   ? { ...s, badges: (s.badges || []).filter(item => item.id !== b.id) }
                                                   : s
                                             )
                                          }));
                                       }
                                    }}
                                    className="flex items-center gap-2 bg-gradient-to-br from-amber-100 to-amber-50 hover:from-rose-50 hover:to-rose-100 hover:border-rose-200 hover:text-rose-600 border border-amber-250 px-3 py-1.5 rounded-full shadow-xs cursor-pointer transition-all group/badge" 
                                    title={`${new Date(b.date).toLocaleDateString()} - Klicken zum Löschen`}
                                 >
                                    <span className="text-[0.875rem] leading-snug drop-shadow-sm group-hover/badge:scale-110 transition-transform">{b.icon}</span>
                                    <span className="text-[0.625rem] font-black text-amber-900 group-hover/badge:text-rose-600 tracking-tight">{b.name}</span>
                                    <span className="text-[0.5rem] opacity-0 group-hover/badge:opacity-100 text-rose-500 font-black ml-1">✕</span>
                                 </div>
                              ));
                           })()}
                        </div>

                        {/* Create Custom Badge Form */}
                        <div className="mt-4 p-4 bg-amber-50/20 border border-amber-200/20 rounded-2xl flex flex-col gap-2">
                           <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-450 leading-none">Eigenes Abzeichen erstellen</span>
                           <div className="flex gap-2.5">
                              <input 
                                 type="text"
                                 title="Emoji für das Abzeichen"
                                 placeholder="🧠"
                                 maxLength={4}
                                 value={newBadgeIcon}
                                 onChange={(e) => setNewBadgeIcon(e.target.value)}
                                 className="w-12 text-center bg-white border border-slate-200 rounded-xl py-1.5 px-1 text-[0.875rem] leading-snug outline-none font-bold text-slate-800 focus:border-amber-500 transition-colors"
                              />
                              <input 
                                 type="text"
                                 placeholder="z.B. Super-Zuhörer"
                                 value={newBadgeName}
                                 onChange={(e) => setNewBadgeName(e.target.value)}
                                 className="flex-1 bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[0.75rem] leading-tight outline-none text-slate-800 focus:border-amber-500 transition-colors"
                              />
                              <button
                                 type="button"
                                 onClick={() => {
                                    if (!newBadgeName.trim()) return;
                                    const icon = newBadgeIcon.trim() || '⭐';
                                    const name = newBadgeName.trim();
                                    
                                    const baseNames = [
                                       'Super aufgeräumt', 'Toll geholfen', 'Kreative Idee',
                                       'Super Fokus', 'Großer Mut', 'Fleißige Ameise',
                                       'Künstler/in', 'Mathe-Genie', 'Leseratte', 'Klassenclown'
                                    ];
                                    const alreadyExists = UNIFIED_DEFAULT_BADGES.some(b => b.name.toLowerCase() === name.toLowerCase()) || (app.custom_badges || []).some(b => b.name.toLowerCase() === name.toLowerCase());
                                    if (alreadyExists) return;

                                    setApp(prev => ({
                                       ...prev,
                                       custom_badges: [
                                          ...(prev.custom_badges || []),
                                          { icon, name }
                                       ]
                                    }));
                                    setNewBadgeName('');
                                    setNewBadgeIcon('🧠');
                                 }}
                                 className="px-4 bg-amber-500 hover:bg-amber-400 text-amber-955 font-black rounded-xl text-[0.625rem] uppercase cursor-pointer transition-all active:scale-95 shadow-xs"
                              >
                                 + Erstellen
                              </button>
                           </div>
                        </div>
                     </div>

                    <div className="space-y-4">
                       {(app.notizen || [])
                         .filter(n => n.schuelerId === selectedFolderStudent)
                         .sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0))
                         .map(note => (
                           <div key={note.id} className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-5 hover:shadow-md transition-all group">
                              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-[1.25rem] leading-normal group-hover:scale-110 transition-transform">
                                 {note.icon || '📝'}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <div className="flex justify-between items-start mb-1">
                                    <h5 className="font-black text-slate-800 tracking-tight">{note.titel}</h5>
                                    <div className="flex items-center gap-2">
                                       <span className="text-[0.625rem] font-black text-slate-300 uppercase tabular-nums">
                                          {note.timestamp ? new Date(note.timestamp).toLocaleDateString() : '–'} • {note.timestamp ? new Date(note.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '–'}
                                       </span>
                                       <button 
                                          onClick={() => {
                                             if(confirm('Notiz wirklich löschen?')) {
                                                setApp(prev => ({
                                                   ...prev,
                                                   notizen: (prev.notizen || []).filter(n => n.id !== note.id)
                                                }));
                                             }
                                          }}
                                          className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-rose-500"
                                       >
                                          <Trash2 size={12} />
                                       </button>
                                    </div>
                                 </div>
                                 <p className="text-[0.875rem] text-slate-500 font-medium leading-relaxed">{note.inhalt}</p>
                              </div>
                           </div>
                         ))}
                    </div>
                 </>
              ) : (
                  <div className="h-[50vh] bg-slate-50 rounded-2xl border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                     <FileText size={48} className="mb-4 opacity-20" />
                     <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em]">Wähle einen Schüler aus um die Notizen anzuzeigen</p>
                  </div>
               )}
            </div>
         </div>
      ) : false ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:p-6">
           {(!isSidebarCollapsed || !selectedFolderStudent) && (
              <div className="lg:col-span-1 space-y-3 pr-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <div className="flex items-center justify-between px-2 mb-4">
                   <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Schülerliste</h4>
                   <button 
                     onClick={() => setViewMode('list')} 
                     className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-[0.1em] text-accent hover:text-accent/80 bg-accent/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                   >
                     <ArrowLeft size={12} strokeWidth={2.5} />
                     Zurück
                   </button>
                 </div>
                 {[...app.schueler].sort((a,b) => a.nachname.localeCompare(b.nachname)).map(s => (
                     <button 
                       key={s.id}
                       onClick={() => { setSelectedFolderStudent(s.id); setIsSidebarCollapsed(true); }}
                       className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedFolderStudent === s.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-900 shadow-3xs'}`}
                     >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.75rem] leading-tight font-black shrink-0 ${selectedFolderStudent === s.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                           <Sparkles size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={`text-[0.75rem] leading-tight font-black text-wrap leading-tight break-words leading-tight ${selectedFolderStudent === s.id ? 'text-white' : 'text-slate-900'}`}>{s.nachname}</div>
                           <div className={`text-[0.625rem] font-medium leading-none ${selectedFolderStudent === s.id ? 'text-white/60' : 'text-slate-400'}`}>{s.vorname}</div>
                        </div>
                     </button>
                 ))}
              </div>
           )}
           <div className={`${(!isSidebarCollapsed || !selectedFolderStudent) ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
              {selectedFolderStudent ? (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <button
                       onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[0.625rem] font-bold uppercase tracking-wider rounded-lg transition-all border border-slate-200 cursor-pointer"
                       title={isSidebarCollapsed ? "Schülerliste anzeigen" : "Schülerliste ausblenden"}
                     >
                       <span>{isSidebarCollapsed ? "→" : "←"} Schülerliste {isSidebarCollapsed ? "einblenden" : "ausblenden"}</span>
                     </button>
                   </div>
                   <StudentPortfolio schuelerId={selectedFolderStudent} />
                 </div>
              ) : (
                 <div className="h-[50vh] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                    <Sparkles size={48} className="mb-4 opacity-20" />
                    <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em]">Wähle eine/n Schüler/in aus um das E-Portfolio zu öffnen</p>
                 </div>
              )}
           </div>
        </div>
      ) : false ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:p-6">
           {(!isSidebarCollapsed || !selectedFolderStudent) && (
              <div className="lg:col-span-1 space-y-3 pr-2 max-h-[75vh] overflow-y-auto custom-scrollbar">
                 <div className="flex items-center justify-between px-2 mb-4">
                   <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Schülerliste</h4>
                   <button 
                     onClick={() => setViewMode('list')} 
                     className="flex items-center gap-1.5 text-[0.625rem] font-black uppercase tracking-[0.1em] text-accent hover:text-accent/80 bg-accent/10 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                   >
                     <ArrowLeft size={12} strokeWidth={2.5} />
                     Zurück
                   </button>
                 </div>
                 {([...app.schueler]).sort((a,b) => (a.nachname || '').localeCompare(b.nachname || '')).map(s => (
                     <button 
                       key={s.id}
                       onClick={() => { setSelectedFolderStudent(s.id); setIsSidebarCollapsed(true); }}
                       className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedFolderStudent === s.id ? 'bg-rose-500 border-rose-500 text-white shadow-sm' : 'bg-white border-slate-200 hover:border-rose-300 text-slate-900 shadow-3xs'}`}
                     >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.75rem] leading-tight font-black shrink-0 ${selectedFolderStudent === s.id ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                           <Heart size={13} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className={`text-[0.75rem] leading-tight font-black text-wrap leading-tight break-words leading-tight ${selectedFolderStudent === s.id ? 'text-white' : 'text-slate-900'}`}>{s.nachname}</div>
                           <div className={`text-[0.625rem] font-medium leading-none ${selectedFolderStudent === s.id ? 'text-white/60' : 'text-slate-400'}`}>{s.vorname}</div>
                        </div>
                     </button>
                 ))}
              </div>
           )}
           <div className={`${(!isSidebarCollapsed || !selectedFolderStudent) ? 'lg:col-span-3' : 'lg:col-span-4'} space-y-4`}>
              {selectedFolderStudent ? (
                 <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <button
                       onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                       className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[0.625rem] font-bold uppercase tracking-wider rounded-lg transition-all border border-slate-200 cursor-pointer"
                       title={isSidebarCollapsed ? "Schülerliste anzeigen" : "Schülerliste ausblenden"}
                     >
                       <span>{isSidebarCollapsed ? "→" : "←"} Schülerliste {isSidebarCollapsed ? "einblenden" : "ausblenden"}</span>
                     </button>
                   </div>
                   <StudentDossier schuelerId={selectedFolderStudent} onBack={() => { setViewMode('list'); setSelectedFolderStudent(null); }} onStudentChange={setSelectedFolderStudent} />
                 </div>
              ) : (
                 <div className="h-[50vh] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                    <Heart size={48} className="mb-4 opacity-20" />
                    <p className="text-[0.6875rem] font-black uppercase tracking-[0.2em]">Wähle eine/n Schüler/in aus um das Förderprofil zu bearbeiten</p>
                 </div>
              )}
           </div>
        </div>
      ) : viewMode === 'map' ? (
        <React.Suspense fallback={
          <div className="flex flex-col items-center justify-center h-64 gap-4 bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-100">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-450 animate-pulse">Karte wird geladen...</span>
          </div>
        }>
          <StudentMap students={filteredStudents} />
        </React.Suspense>
      ) : (
        <div className={`grid print:hidden ${
          isCompact 
            ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2.5' 
            : isLarge 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4'
        }`}>
          {filteredStudents.map((s, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={s.id} 
              onClick={() => setSelectedFolderStudent(s.id)}
              className={`bg-white rounded-2xl border hover:shadow-md hover:scale-[1.01] transition-all duration-200 group flex flex-col h-full cursor-pointer relative ${
                isCompact ? 'p-2.5 border-slate-150/70' : isLarge ? 'p-6 border-slate-200 shadow-sm' : 'p-4 border-slate-200/80 shadow-xs'
              } ${
                isBirthdayToday(s.geburtstag) 
                  ? 'bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-indigo-500/10 border-amber-300' 
                  : s.spf 
                    ? 'bg-purple-50/10 border-purple-250 shadow-3xs' 
                    : s.espf 
                      ? 'bg-emerald-50/10 border-emerald-250 shadow-3xs' 
                      : ''
              }`}
            >
              <div className={`flex items-start justify-between ${isCompact ? 'mb-1.5' : 'mb-3'}`}>
                {s.foto ? (
                  <img 
                    src={s.foto} 
                    alt={`${s.vorname} ${s.nachname}`} 
                    className={`object-cover border border-slate-100 shadow-xs ${
                      isCompact ? 'w-8 h-8 rounded-md' : isLarge ? 'w-14 h-14 rounded-xl' : 'w-11 h-11 rounded-lg'
                    }`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className={`flex items-center justify-center font-black shadow-inner border border-slate-100/85 shrink-0 ${
                    isCompact ? 'w-8 h-8 rounded-md text-[0.7rem]' : isLarge ? 'w-14 h-14 rounded-xl text-[1.125rem]' : 'w-11 h-11 rounded-lg text-[0.875rem] leading-snug'
                  } ${s.geschlecht === 'weiblich' ? 'bg-rose-50 text-rose-500' : s.geschlecht === 'männlich' ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                    {s.emoji ? (
                      <span className={`${isCompact ? 'text-[1rem]' : isLarge ? 'text-[1.625rem]' : 'text-[1.25rem]'} leading-none drop-shadow-2xs`}>
                        {s.emoji}
                      </span>
                    ) : (
                      s.vorname.charAt(0) + s.nachname.charAt(0)
                    )}
                  </div>
                )}
                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                   <button 
                     onClick={(e) => { e.stopPropagation(); setEditingStudent(s); setIsModalOpen(true); }}
                     className={`flex items-center justify-center bg-slate-50 hover:bg-amber-55 border border-slate-200/40 text-slate-500 hover:text-amber-600 rounded-lg transition-all active:scale-90 cursor-pointer ${
                       isCompact ? 'w-5 h-5' : isLarge ? 'w-8.5 h-8.5' : 'w-7 h-7'
                     }`}
                     title="Bearbeiten"
                   >
                     <Edit2 size={isCompact ? 9 : isLarge ? 14 : 12} />
                   </button>
                   <button 
                     onClick={(e) => { e.stopPropagation(); if(confirm('Sicher löschen?')) deleteStudent(s.id); }}
                     className={`flex items-center justify-center bg-slate-50 hover:bg-red-55 border border-slate-200/40 text-slate-450 hover:text-red-600 rounded-lg transition-all active:scale-90 cursor-pointer ${
                       isCompact ? 'w-5 h-5' : isLarge ? 'w-8.5 h-8.5' : 'w-7 h-7'
                     }`}
                     title="Löschen"
                   >
                     <Trash2 size={isCompact ? 9 : isLarge ? 14 : 12} />
                   </button>
                </div>
              </div>
              
              <div className={`${isCompact ? 'mb-1.5' : 'mb-2.5'} flex-1`}>
                 <h4 className={`font-black text-slate-900 leading-snug text-wrap leading-tight break-words flex items-center justify-between gap-1 ${
                   isCompact ? 'text-[0.75rem]' : isLarge ? 'text-[1.05rem]' : 'text-[0.84375rem]'
                 }`}>
                   {isBirthdayToday(s.geburtstag) ? (
                     <span className="bg-gradient-to-r from-pink-500 via-amber-500 to-indigo-500 bg-clip-text text-transparent font-black pr-1 font-extrabold animate-pulse">
                       {s.vorname} {s.nachname}
                     </span>
                   ) : (
                     <span>{s.vorname} {s.nachname}</span>
                   )}
                   {isBirthdayToday(s.geburtstag) && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         handleBirthdayCelebrate(s.vorname);
                       }}
                       className="inline-flex items-center justify-center p-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-[0.75rem] leading-tight rounded-full cursor-pointer animate-bounce select-none border border-amber-500/20 active:scale-95 duration-100 animate-pulse"
                       title="Geburtstagsüberraschung starten! 🎂🎉"
                       type="button"
                     >
                       🎂
                     </button>
                   )}
                 </h4>
                 <div className={`flex items-center gap-2 font-black uppercase text-slate-400 ${
                   isCompact ? 'text-[0.5rem] tracking-tight mt-0.5' : 'text-[0.5625rem] tracking-widest mt-1'
                 }`}>
                    <span>{s.besuchsjahr ? `${s.besuchsjahr}. Jahr` : 'Neu'}</span>
                    <span className="opacity-20">•</span>
                    <span className="px-1 py-0.2 rounded bg-slate-50 border border-slate-150 text-slate-600 text-[0.52rem] font-bold">Niveau {s.niveau || 3}</span>
                 </div>
                <div className="mt-1 inline-flex self-start rounded-md bg-slate-50 px-1.5 py-0.5 text-[0.625rem] font-bold text-slate-500 border border-slate-100">
                  Geschlecht: {getStudentGenderLabel(s.geschlecht)}
                </div>

                 {/* Wichtige Eigenschaften */}
                 <div className={`mt-2.5 pt-2 border-t border-slate-100/60 flex flex-col ${isCompact ? 'gap-0.5' : 'gap-1'} text-slate-600`}>
                    {s.geburtstag && (
                      <div className={`flex items-center gap-1.5 font-medium ${isCompact ? 'text-[0.6rem]' : 'text-[0.6875rem]'}`}>
                        <span className="text-slate-400 select-none">📅</span>
                        <span>
                          {s.geburtstag.includes('-') ? s.geburtstag.split('-').reverse().join('.') : s.geburtstag}
                        </span>
                      </div>
                    )}
                    {s.religion && (
                      <div className={`flex items-center gap-1.5 font-medium ${isCompact ? 'text-[0.6rem]' : 'text-[0.6875rem]'}`}>
                        <span className="text-slate-400 select-none">⛪</span>
                        <span className="truncate" title={s.religion}>{s.religion}</span>
                      </div>
                    )}
                    {s.erstsprache && (
                      <div className={`flex items-center gap-1.5 font-medium ${isCompact ? 'text-[0.6rem]' : 'text-[0.6875rem]'}`}>
                        <span className="text-slate-400 select-none">🗣️</span>
                        <span className="truncate text-slate-700 font-semibold" title={`${s.erstsprache}${s.zweitsprache ? ` / ${s.zweitsprache}` : ''}`}>
                          {s.erstsprache} {s.zweitsprache ? `/ ${s.zweitsprache}` : ''}
                        </span>
                      </div>
                    )}
                 </div>
              </div>

              <div className={`flex flex-wrap gap-1 ${isCompact ? 'mb-1.5' : 'mb-2.5'}`}>
                 {s.ikmNummer !== undefined && s.ikmNummer !== null && (
                   <span className={`bg-amber-50 text-amber-800 font-black rounded uppercase tracking-tight border border-amber-200 shadow-3xs flex items-center gap-0.5 ${
                     isCompact ? 'px-1 py-0.2 text-[0.45rem]' : isLarge ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-1.5 py-0.5 text-[0.5625rem]'
                   }`}>
                     <span>🔢</span><span>IKM {s.ikmNummer}</span>
                   </span>
                 )}
                 {s.daz && (
                   <span className={`bg-amber-100 text-amber-700 font-black rounded uppercase tracking-tight border border-amber-200/50 ${
                     isCompact ? 'px-1 py-0.2 text-[0.45rem]' : isLarge ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-1.5 py-0.5 text-[0.5625rem]'
                   }`}>DAZ</span>
                 )}
                 {s.espf && (
                   <span className={`bg-emerald-100 text-emerald-700 font-black rounded uppercase tracking-tight border border-emerald-200/50 ${
                     isCompact ? 'px-1 py-0.2 text-[0.45rem]' : isLarge ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-1.5 py-0.5 text-[0.5625rem]'
                   }`}>ESPF</span>
                 )}
                 {s.spf && (
                   <span className={`bg-indigo-100 text-indigo-700 font-black rounded uppercase tracking-tight border border-indigo-200/50 ${
                     isCompact ? 'px-1 py-0.2 text-[0.45rem]' : isLarge ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-1.5 py-0.5 text-[0.5625rem]'
                   }`}>SPF</span>
                 )}
                 
                 {app.differenzierungsGruppen?.filter(g => g.schuelerIds.includes(s.id)).map(g => (
                    <span key={g.id} className={`flex items-center gap-0.5 rounded font-black uppercase tracking-tight text-white border shadow-3xs ${g.farbe} ${
                      isCompact ? 'px-1 py-0.2 text-[0.45rem]' : isLarge ? 'px-2.5 py-1 text-[0.6875rem]' : 'px-1.5 py-0.5 text-[0.5625rem]'
                    }`} title={g.name || 'Gruppe'}>
                      <span>{g.emoji}</span>
                      <span>{g.name}</span>
                    </span>
                 ))}
              </div>

              <div className={`border-t border-slate-100 flex items-center justify-between gap-1 mt-auto ${
                isCompact ? 'pt-1.5' : isLarge ? 'pt-4' : 'pt-2.5'
              }`} onClick={e => e.stopPropagation()}>
                 <div className="flex items-center gap-1">
                    <button 
                       onClick={(e) => { e.stopPropagation(); setSelectedFolderStudent(s.id); }}
                       className={`bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 text-indigo-700 active:scale-95 transition-all cursor-pointer font-black uppercase tracking-wider ${
                         isCompact ? 'px-2 py-1 text-[0.45rem] rounded-md' : isLarge ? 'px-4 py-2.5 text-[0.6875rem] rounded-xl' : 'px-2.5 py-1.5 text-[0.5625rem] rounded-lg'
                       }`}
                    >
                       Dossier öffnen
                    </button>
                 </div>
                 {s.telefon_mutter ? (
                    <a href={`tel:${s.telefon_mutter}`} className={`rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-xs transition-colors shrink-0 ${
                      isCompact ? 'w-5 h-5 rounded' : isLarge ? 'w-9 h-9 rounded-xl' : 'w-7 h-7 rounded-lg'
                    }`}>
                       <Phone size={isCompact ? 9 : isLarge ? 13 : 11} />
                    </a>
                 ) : s.telefon_vater ? (
                    <a href={`tel:${s.telefon_vater}`} className={`rounded-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-xs transition-colors shrink-0 ${
                      isCompact ? 'w-5 h-5 rounded' : isLarge ? 'w-9 h-9 rounded-xl' : 'w-7 h-7 rounded-lg'
                    }`}>
                       <Phone size={isCompact ? 9 : isLarge ? 13 : 11} />
                    </a>
                 ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      )}
      </>
    )}

      {isKlassenlistImportOpen && (
        <KlassenlistenImport
          onClose={() => setIsKlassenlistImportOpen(false)}
          onImport={(kids, meta) => {
            setApp(prev => {
              const merged = mergeImportedStudents(prev.schueler || [], kids);
              return {
                ...prev,
                schueler: merged.students,
                ...(meta?.klasse ? { klassenbezeichnung: meta.klasse } : {}),
                ...(meta?.schuljahr ? { schuljahr: meta.schuljahr } : {}),
                ...(meta?.lehrerName ? { lehrerName: meta.lehrerName } : {}),
                ...(meta?.schulName ? { schulName: meta.schulName } : {}),
                ...(meta?.schulkennzahl ? { schulkennzahl: meta.schulkennzahl } : {}),
              };
            });
            setIsKlassenlistImportOpen(false);
          }}
        />
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/60 backdrop-blur-md print:hidden flex justify-center p-2 sm:p-4 items-start sm:items-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-dialog-title"
            className="bg-white rounded-2xl shadow-lg w-full max-w-2xl my-auto flex flex-col border border-slate-200 overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] min-h-0"
          >
            <div className="p-3 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
              <h3 id="student-dialog-title" className="text-[1.125rem] leading-normal sm:text-[1.5rem] leading-normal font-black text-slate-900 leading-tight">
                {editingStudent?.id ? 'Schüler bearbeiten' : 'Neuer Schüler'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                type="button"
                aria-label="Schülerformular schließen"
                title="Schließen"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 sm:p-6 custom-scrollbar">
              <form id="student-form" onSubmit={handleSave} className="space-y-6">
                <nav aria-label="Schülerformular Bereiche" className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1.5">
                  {[
                    { id: 'basis', label: 'Basisdaten', hint: 'Person & Schule' },
                    { id: 'paedagogik', label: 'Pädagogik', hint: 'Förderung & Sitzplatz' },
                    { id: 'kontakte', label: 'Kontakte', hint: 'Adresse & Freigaben' },
                  ].map((section, index) => {
                    const active = studentFormSection === section.id;
                    return (
                      <button
                        key={section.id}
                        type="button"
                        aria-current={active ? 'step' : undefined}
                        onClick={() => setStudentFormSection(section.id as 'basis' | 'paedagogik' | 'kontakte')}
                        className={`min-w-0 rounded-xl px-2 py-2.5 text-left transition-all ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                            : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-black ${
                            active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-[0.6875rem] font-black">{section.label}</div>
                            <div className="hidden sm:block truncate text-[0.5625rem] font-semibold text-slate-400">{section.hint}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* Stammdaten */}
                <div className={studentFormSection === 'basis' ? 'space-y-4' : 'hidden'}>
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 bg-accent rounded-full" />
                    <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-900">Stammdaten</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Vorname</label>
                      <input 
                        autoFocus
                        required
                        className="input-field py-2 sm:py-3"
                        placeholder="z.B. Lukas"
                        value={editingStudent?.vorname || ''}
                        onChange={e => setEditingStudent({...editingStudent, vorname: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Nachname</label>
                      <input 
                        required
                        className="input-field py-2 sm:py-3"
                        placeholder="z.B. Müller"
                        value={editingStudent?.nachname || ''}
                        onChange={e => setEditingStudent({...editingStudent, nachname: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {isDuplicateName && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-800"
                    >
                      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-[0.6875rem] leading-normal font-bold">
                        <span className="font-extrabold uppercase tracking-wide block text-amber-900 mb-0.5">⚠️ Mögliches Duplikat erkannt</span>
                        Ein Schüler oder eine Schülerin mit dem Namen <strong className="text-amber-900">"{editingStudent?.vorname} {editingStudent?.nachname}"</strong> existiert bereits in dieser Klasse. Bitte stelle sicher, dass du Einträge nicht doppelt anlegst.
                      </div>
                    </motion.div>
                  )}
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Geschlecht</label>
                      <select 
                        aria-label="Geschlecht"
                        className="input-field py-2 sm:py-3 cursor-pointer"
                        value={editingStudent?.geschlecht || ''}
                        onChange={e => setEditingStudent({...editingStudent, geschlecht: e.target.value})}
                      >
                        <option value="">–</option>
                        <option value="weiblich">weiblich</option>
                        <option value="männlich">männlich</option>
                        <option value="divers">divers</option>
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Besuchsjahr</label>
                      <input 
                        type="number"
                        aria-label="Besuchsjahr"
                        className="input-field py-2 sm:py-3"
                        placeholder="z.B. 1"
                        value={editingStudent?.besuchsjahr || ''}
                        onChange={e => setEditingStudent({...editingStudent, besuchsjahr: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Niveau</label>
                      <select 
                        aria-label="Niveau"
                        className="input-field py-2 sm:py-3 cursor-pointer"
                        value={editingStudent?.niveau || 3}
                        onChange={e => setEditingStudent({...editingStudent, niveau: parseInt(e.target.value)})}
                      >
                        {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                     <div className="space-y-0.5">
                       <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Geburtsdatum</label>
                       <input 
                         type="date"
                         aria-label="Geburtsdatum"
                         className="input-field py-2 sm:py-3"
                         value={toDateInputValue(editingStudent?.geburtstag)}
                         onChange={e => setEditingStudent({...editingStudent, geburtstag: e.target.value})}
                       />
                     </div>
                     <div className="space-y-0.5">
                       <label className="text-[0.5625rem] font-black uppercase tracking-[0.1em] text-slate-400 px-1">SV-Nummer</label>
                       <input 
                         className="input-field py-2 sm:py-3"
                         placeholder="XXXX XXXXXX"
                         value={editingStudent?.sv_nummer || ''}
                         onChange={e => setEditingStudent({...editingStudent, sv_nummer: e.target.value})}
                       />
                     </div>
                     <div className="space-y-0.5">
                       <div className="flex items-center justify-between px-1">
                         <label className="text-[0.5625rem] font-black uppercase tracking-[0.1em] text-amber-600">IKM-Nummer</label>
                         <span className="text-[0.4375rem] bg-amber-50 text-amber-700 border border-amber-100 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">Wichtig!</span>
                       </div>
                       <input 
                         type="number"
                         aria-label="IKM-Nummer"
                         className="input-field py-2 sm:py-3 font-semibold text-amber-700 border-amber-200 focus:border-amber-500 focus:ring-amber-500"
                         placeholder="z.B. 17"
                         min="1"
                         max="99"
                         value={editingStudent?.ikmNummer || ''}
                         onChange={e => setEditingStudent({...editingStudent, ikmNummer: e.target.value ? parseInt(e.target.value) : undefined})}
                       />
                     </div>
                   </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Staatszugehörigkeit</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="Österreich"
                        value={editingStudent?.staatsbuergerschaft || ''}
                        onChange={e => setEditingStudent({...editingStudent, staatsbuergerschaft: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Religion</label>
                      <select 
                        aria-label="Religion"
                        className="input-field py-2 sm:py-3 cursor-pointer"
                        value={editingStudent?.religion || ''}
                        onChange={e => setEditingStudent({...editingStudent, religion: e.target.value})}
                      >
                        <option value="">–</option>
                        <option value="röm.-kath.">röm.-kath.</option>
                        <option value="islam (IGGÖ)">islam (IGGÖ)</option>
                        <option value="o.B.">o.B.</option>
                        <option value="evang. A.B.">evang. A.B.</option>
                        <option value="orth.">orth.</option>
                        <option value="sonstige">sonstige</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className={studentFormSection === 'paedagogik' ? 'space-y-6' : 'hidden'}>
                {/* Förderung & Sprache */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                    <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-900">Förderung & Sprache</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Muttersprache / Erstsprache</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="z.B. Deutsch 🇦🇹"
                        value={editingStudent?.erstsprache || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const isDeutsch = val.trim().toLowerCase().startsWith('deutsch');
                          const hasValue = val.trim() !== '';
                          setEditingStudent({
                            ...editingStudent, 
                            erstsprache: val,
                            daz: hasValue ? !isDeutsch : (editingStudent?.daz ?? false)
                          } as any);
                        }}
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Zweite Sprache / Muttersprache</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="z.B. Türkisch 🇹🇷, Englisch 🇬🇧"
                        value={editingStudent?.zweitsprache || ''}
                        onChange={e => {
                          setEditingStudent({
                            ...editingStudent, 
                            zweitsprache: e.target.value
                          } as any);
                        }}
                      />
                    </div>
                    
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">DaZ Sprachförder-Niveau (MIKA-D)</label>
                      <select 
                        aria-label="DaZ Sprachförder-Niveau (MIKA-D)"
                        className="input-field py-2 sm:py-3 cursor-pointer"
                        value={editingStudent?.foerderprofil?.mikaDStatus || ''}
                        onChange={e => {
                          const val = e.target.value;
                          const isDaz = val !== '' && val !== 'nicht erhoben';
                          setEditingStudent({
                            ...editingStudent,
                            daz: isDaz || (editingStudent?.daz ?? false),
                            foerderprofil: {
                              ...(editingStudent?.foerderprofil || {}),
                              mikaDStatus: val as any
                            }
                          } as any);
                        }}
                      >
                        <option value="">Kein DaZ-Bedarf</option>
                        <option value="1">Außerordentlich (ao) - Stufe 1</option>
                        <option value="2">Außerordentlich (ao) - Stufe 2</option>
                        <option value="3">Außerordentlich (ao) - Stufe 3</option>
                        <option value="ordentlich">Ordentlicher Status (o)</option>
                        <option value="nicht erhoben">Nicht erhoben / Sonstige</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer group bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm hover:border-accent transition-all">
                      <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-200 text-accent focus:ring-accent/10 cursor-pointer"
                          checked={editingStudent?.daz || false}
                          onChange={e => setEditingStudent({...editingStudent, daz: e.target.checked} as any)}
                      />
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 group-hover:text-accent transition-colors">DAZ Status</span>
                    </label>
                    
                    <label className="flex items-center gap-2 cursor-pointer group bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm hover:border-emerald-500 transition-all">
                      <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-200 text-emerald-500 focus:ring-emerald-500/10 cursor-pointer"
                          checked={editingStudent?.espf || false}
                          onChange={e => setEditingStudent({...editingStudent, espf: e.target.checked} as any)}
                      />
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 group-hover:text-emerald-500 transition-colors">ESPF Status</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer group bg-white px-3 py-2 rounded-xl border border-slate-100 shadow-sm hover:border-purple-500 transition-all">
                      <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-200 text-purple-500 focus:ring-purple-500/10 cursor-pointer"
                          checked={editingStudent?.spf || false}
                          onChange={e => setEditingStudent({...editingStudent, spf: e.target.checked} as any)}
                      />
                      <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 group-hover:text-purple-500 transition-colors">SPF Status</span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1 block">
                      Förderung in bestimmten Bereichen (Förderbedarf)
                    </label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      {/* Deutsch-Bereiche */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 text-left">
                        <span className="text-[0.55rem] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">📖 Deutsch</span>
                        <div className="space-y-1.5 pt-1">
                          {["Lesen", "Schreiben", "Sprache"].map(bereich => {
                            const currentBereiche = editingStudent?.foerderprofil?.foerderbedarfBereiche || [];
                            const isChecked = currentBereiche.includes(bereich);
                            return (
                              <button
                                key={bereich}
                                type="button"
                                onClick={() => {
                                  const newBereiche = isChecked 
                                    ? currentBereiche.filter(b => b !== bereich)
                                    : [...currentBereiche, bereich];
                                  setEditingStudent({
                                    ...editingStudent,
                                    foerderprofil: {
                                      ...(editingStudent?.foerderprofil || {}),
                                      foerderbedarfBereiche: newBereiche
                                    }
                                  } as any);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all border text-left flex items-center justify-between cursor-pointer ${
                                  isChecked 
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm' 
                                    : 'bg-white font-semibold text-slate-550 border-slate-200 hover:border-emerald-300'
                                }`}
                              >
                                <span>{bereich === 'Lesen' ? '📖 Lesen' : bereich === 'Schreiben' ? '✏️ Schreiben' : '🗣️ Sprache'}</span>
                                {isChecked && <span className="text-[0.65rem] font-sans font-black">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mathe-Bereich */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 text-left">
                        <span className="text-[0.55rem] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">🔢 Mathematik</span>
                        <div className="space-y-1.5 pt-1">
                          {["Rechnen"].map(bereich => {
                            const currentBereiche = editingStudent?.foerderprofil?.foerderbedarfBereiche || [];
                            const isChecked = currentBereiche.includes(bereich);
                            return (
                              <button
                                key={bereich}
                                type="button"
                                onClick={() => {
                                  const newBereiche = isChecked 
                                    ? currentBereiche.filter(b => b !== bereich)
                                    : [...currentBereiche, bereich];
                                  setEditingStudent({
                                    ...editingStudent,
                                    foerderprofil: {
                                      ...(editingStudent?.foerderprofil || {}),
                                      foerderbedarfBereiche: newBereiche
                                    }
                                  } as any);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all border text-left flex items-center justify-between cursor-pointer ${
                                  isChecked 
                                    ? 'bg-amber-500 border-amber-600 text-white shadow-sm' 
                                    : 'bg-white font-semibold text-slate-550 border-slate-200 hover:border-amber-300'
                                }`}
                              >
                                <span>🧮 Rechnen</span>
                                {isChecked && <span className="text-[0.65rem] font-sans font-black">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Übergreifende Bereiche */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-2 text-left">
                        <span className="text-[0.55rem] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">🧠 Übergreifend</span>
                        <div className="space-y-1.5 pt-1">
                          {["Konzentration", "Sozialverhalten", "Motorik"].map(bereich => {
                            const currentBereiche = editingStudent?.foerderprofil?.foerderbedarfBereiche || [];
                            const isChecked = currentBereiche.includes(bereich);
                            return (
                              <button
                                key={bereich}
                                type="button"
                                onClick={() => {
                                  const newBereiche = isChecked 
                                    ? currentBereiche.filter(b => b !== bereich)
                                    : [...currentBereiche, bereich];
                                  setEditingStudent({
                                    ...editingStudent,
                                    foerderprofil: {
                                      ...(editingStudent?.foerderprofil || {}),
                                      foerderbedarfBereiche: newBereiche
                                    }
                                  } as any);
                                }}
                                className={`w-full px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all border text-left flex items-center justify-between cursor-pointer ${
                                  isChecked 
                                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' 
                                    : 'bg-white font-semibold text-slate-550 border-slate-200 hover:border-indigo-300'
                                }`}
                              >
                                <span>{bereich === 'Konzentration' ? '🎯 Konzentration' : bereich === 'Sozialverhalten' ? '🤝 Sozialverhalten' : '🏃 Motorik'}</span>
                                {isChecked && <span className="text-[0.65rem] font-sans font-black">✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Charaktereigenschaften (Förderprofil) */}
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1 block">
                          Stärken & Ressourcen
                        </label>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { key: 'ruhig', label: 'Ruhig 🤫' },
                          { key: 'konzentriert', label: 'Konzentriert 🎯' },
                          { key: 'aufmerksam', label: 'Aufmerksam 👁️' },
                          { key: 'hilfsbereit', label: 'Hilfsbereit 🤝' },
                          { key: 'interessiert', label: 'Interessiert 💡' },
                          { key: 'kreativ', label: 'Kreativ 🎨' }
                        ].map(trait => {
                          const currentTraits = editingStudent?.charakter || [];
                          const isChecked = currentTraits.includes(trait.key);
                          return (
                            <button
                              key={trait.key}
                              type="button"
                              onClick={() => {
                                const newTraits = isChecked 
                                  ? currentTraits.filter(t => t !== trait.key)
                                  : [...currentTraits, trait.key];
                                setEditingStudent({
                                  ...editingStudent,
                                  charakter: newTraits
                                } as any);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all border ${isChecked ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm' : 'bg-slate-50 font-semibold text-slate-400 border-slate-200 hover:border-slate-300'}`}
                            >
                              {trait.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-amber-500 px-1 block">
                          Pädagogischer Sitzplatz-Fokus (Unterstützung & Impulse)
                        </label>
                        <span className="text-[0.5rem] font-black text-slate-400 uppercase tracking-widest px-1">Ressourcenorientierte Steuerung</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { key: 'lebhaft', label: 'Lebhaft 🏃‍♂️' },
                          { key: 'braucht_ruhepol', label: 'Braucht Ruhepol 🕊️' },
                          { key: 'braucht_fokus', label: 'Braucht Fokus-Partner 🎯' },
                          { key: 'impulsstark', label: 'Impulsstark ⚡' },
                          { key: 'braucht_naehe', label: 'Lehrkraft-Nähe 🧑‍🏫' }
                        ].map(trait => {
                          const currentTraits = editingStudent?.charakter || [];
                          const isChecked = currentTraits.includes(trait.key);
                          return (
                            <button
                              key={trait.key}
                              type="button"
                              onClick={() => {
                                const newTraits = isChecked 
                                  ? currentTraits.filter(t => t !== trait.key)
                                  : [...currentTraits, trait.key];
                                setEditingStudent({
                                  ...editingStudent,
                                  charakter: newTraits
                                } as any);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all border ${isChecked ? 'bg-amber-600 border-amber-700 text-white shadow-sm' : 'bg-slate-50 font-semibold text-slate-400 border-slate-200 hover:border-slate-300'}`}
                            >
                              {trait.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sitzplatz-Beziehungsregeln (Sperr- & Wunschpartner) */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-4 bg-teal-500 rounded-full" />
                      <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-900">Sitzplatz-Beziehungen 👥</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Wunschpartner */}
                      <div className="space-y-2">
                        <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-emerald-600 px-1 block">
                          Wunschpartner (Sollten nebeneinander sitzen)
                        </label>
                        <select
                          aria-label="Wunschpartner hinzufügen"
                          className="input-field py-2 text-[0.75rem] leading-tight"
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const currentWP = editingStudent?.wunschpartner || [];
                            if (!currentWP.includes(e.target.value)) {
                              setEditingStudent({
                                ...editingStudent,
                                wunschpartner: [...currentWP, e.target.value]
                              } as any);
                            }
                          }}
                        >
                          <option value="">+ Wunschpartner hinzufügen...</option>
                          {schueler
                            .filter(s => s.id !== editingStudent?.id && !(editingStudent?.wunschpartner || []).includes(s.id) && !(editingStudent?.sperrpartner || []).includes(s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.vorname} {s.nachname}
                              </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(editingStudent?.wunschpartner || []).map(wpId => {
                            const partner = schueler.find(s => s.id === wpId);
                            if (!partner) return null;
                            return (
                              <span
                                key={wpId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[0.625rem] font-black uppercase tracking-tight rounded-xl border border-emerald-200/50"
                              >
                                <span>{partner.vorname} {partner.nachname.charAt(0)}.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStudent({
                                      ...editingStudent,
                                      wunschpartner: (editingStudent?.wunschpartner || []).filter(id => id !== wpId)
                                    } as any);
                                  }}
                                  className="hover:text-emerald-950 font-bold ml-1 text-[0.6875rem]"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Sperrpartner */}
                      <div className="space-y-2">
                        <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-rose-500 px-1 block">
                          Abstand halten (Sollten NICHT nebeneinander sitzen)
                        </label>
                        <select
                          aria-label="Abstandskandidat hinzufügen"
                          className="input-field py-2 text-[0.75rem] leading-tight"
                          value=""
                          onChange={(e) => {
                            if (!e.target.value) return;
                            const currentSP = editingStudent?.sperrpartner || [];
                            if (!currentSP.includes(e.target.value)) {
                              setEditingStudent({
                                ...editingStudent,
                                sperrpartner: [...currentSP, e.target.value]
                              } as any);
                            }
                          }}
                        >
                          <option value="">+ Abstandskandidat hinzufügen...</option>
                          {schueler
                            .filter(s => s.id !== editingStudent?.id && !(editingStudent?.wunschpartner || []).includes(s.id) && !(editingStudent?.sperrpartner || []).includes(s.id))
                            .map(s => (
                              <option key={s.id} value={s.id}>
                                {s.vorname} {s.nachname}
                              </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(editingStudent?.sperrpartner || []).map(spId => {
                            const partner = schueler.find(s => s.id === spId);
                            if (!partner) return null;
                            return (
                              <span
                                key={spId}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-[0.625rem] font-black uppercase tracking-tight rounded-xl border border-red-200/50"
                              >
                                <span>{partner.vorname} {partner.nachname.charAt(0)}.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStudent({
                                      ...editingStudent,
                                      sperrpartner: (editingStudent?.sperrpartner || []).filter(id => id !== spId)
                                    } as any);
                                  }}
                                  className="hover:text-red-950 font-bold ml-1 text-[0.6875rem]"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                </div>

                <div className={studentFormSection === 'kontakte' ? 'space-y-6' : 'hidden'}>
                {/* Kontakt */}
                <div className="space-y-4 pt-1">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <h4 className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-900">Kontakt & Adresse</h4>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Anschrift</label>
                    <input 
                      className="input-field py-2 sm:py-3"
                      placeholder="Musterstraße 12"
                      value={editingStudent?.anschrift || ''}
                      onChange={e => setEditingStudent({...editingStudent, anschrift: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="col-span-1 space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">PLZ</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="1234"
                        value={editingStudent?.plz || ''}
                        onChange={e => setEditingStudent({...editingStudent, plz: e.target.value})}
                      />
                    </div>
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Ort</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="Musterstadt"
                        value={editingStudent?.ort || ''}
                        onChange={e => setEditingStudent({...editingStudent, ort: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Telefon Mutter</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="+43..."
                        value={editingStudent?.telefon_mutter || ''}
                        onChange={e => setEditingStudent({...editingStudent, telefon_mutter: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Telefon Vater</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="+43..."
                        value={editingStudent?.telefon_vater || ''}
                        onChange={e => setEditingStudent({...editingStudent, telefon_vater: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Email Eltern</label>
                      <input 
                        type="email"
                        className="input-field py-2 sm:py-3"
                        placeholder="eltern@email.at"
                        value={editingStudent?.email_eltern || ''}
                        onChange={e => setEditingStudent({...editingStudent, email_eltern: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Profilbild (Foto URL oder Base64)</label>
                      <input 
                        className="input-field py-2 sm:py-3"
                        placeholder="https://... oder Base64..."
                        value={editingStudent?.foto || ''}
                        onChange={e => setEditingStudent({...editingStudent, foto: e.target.value})}
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Profil-Emoji</label>
                      <input 
                        className="input-field py-2 sm:py-3 text-[1.5rem] leading-normal"
                        placeholder="🦊"
                        value={editingStudent?.emoji || ''}
                        onChange={e => setEditingStudent({...editingStudent, emoji: e.target.value})}
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Foto- & Veröffentlichungsfreigabe */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-1.5">
                      <Camera size={11} className="text-slate-500" />
                      <span>Foto-Freigabe</span>
                    </label>
                    {editingStudent?.fotoFreigabe && (
                      <button 
                        type="button" 
                        onClick={() => setEditingStudent({...editingStudent, fotoFreigabe: undefined})}
                        className="text-[0.625rem] font-medium text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        Auswahl aufheben
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { 
                        value: 'erlaubt', 
                        label: 'Darf fotografiert werden', 
                        desc: 'Grundsätzlich im schulischen Kontext'
                      },
                      { 
                        value: 'nur_homepage', 
                        label: 'Darf nur für die Schulhomepage fotografiert werden', 
                        desc: 'Ausschließlich für die Schulhomepage'
                      },
                      { 
                        value: 'nicht_erlaubt', 
                        label: 'Darf nicht fotografiert werden', 
                        desc: 'Keine Fotos im schulischen Rahmen'
                      },
                    ].map((opt) => {
                      const isSelected = editingStudent?.fotoFreigabe === opt.value;
                      return (
                        <label 
                          key={opt.value} 
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <input 
                            type="radio" 
                            name="fotoFreigabe"
                            value={opt.value}
                            checked={isSelected}
                            onChange={() => setEditingStudent({...editingStudent, fotoFreigabe: opt.value as any})}
                            className="mt-0.5 w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                              {opt.label}
                            </div>
                            <div className={`text-[0.6875rem] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                              {opt.desc}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Gesundheit, Allergien & Notizen */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Allergien und Unverträglichkeiten</label>
                    <textarea 
                      className="input-field py-2 sm:py-3 h-16 sm:h-20 resize-none"
                      placeholder="z.B. Erdnussallergie, Laktoseintoleranz, Glutenunverträglichkeit, Wespenstiche, keine bekannten Allergien..."
                      value={editingStudent?.allergien || ''}
                      onChange={e => setEditingStudent({...editingStudent, allergien: e.target.value})}
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[0.5625rem] font-black uppercase tracking-[0.2em] text-slate-400 px-1">Besondere Notizen & Hinweise</label>
                    <textarea 
                      className="input-field py-2 sm:py-3 h-16 sm:h-20 resize-none"
                      placeholder="Pädagogische oder organisatorische Hinweise..."
                      value={editingStudent?.notiz || ''}
                      onChange={e => setEditingStudent({...editingStudent, notiz: e.target.value})}
                    />
                  </div>
                </div>
                </div>
              </form>
            </div>

            <div className="p-3 sm:p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost sm:flex-1 py-3 sm:py-4 order-3 sm:order-1"
              >
                Abbrechen
              </button>
              {studentFormSection !== 'basis' && (
                <button
                  type="button"
                  onClick={() => setStudentFormSection(studentFormSection === 'kontakte' ? 'paedagogik' : 'basis')}
                  className="btn btn-ghost sm:flex-1 py-3 sm:py-4 order-2"
                >
                  Zurück
                </button>
              )}
              {studentFormSection !== 'kontakte' ? (
                <button
                  type="button"
                  onClick={() => setStudentFormSection(studentFormSection === 'basis' ? 'paedagogik' : 'kontakte')}
                  disabled={studentFormSection === 'basis' && (!editingStudent?.vorname?.trim() || !editingStudent?.nachname?.trim())}
                  className="btn btn-accent sm:flex-1 py-3 sm:py-4 order-1 sm:order-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              ) : (
                <button 
                  type="submit"
                  form="student-form"
                  disabled={!editingStudent?.vorname?.trim() || !editingStudent?.nachname?.trim()}
                  className="btn btn-accent sm:flex-1 py-3 sm:py-4 shadow-xl shadow-accent/20 order-1 sm:order-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {editingStudent?.id ? 'Speichern' : 'Anlegen'}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Print View Only */}
      <AnimatePresence>
        {timelineStudent ? (
          <motion.div 
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] p-4 sm:p-4 sm:p-6 md:p-12 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg h-full max-h-[800px]"
            >
               <StudentTimeline studentId={timelineStudent} onClose={() => setTimelineStudent(null)} />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="hidden print:block bg-white text-slate-800 p-4 sm:p-6 print:p-0 print:shadow-none">
        <div className="mb-4 print:break-after-avoid">
          <h1 className="text-[1.5rem] leading-normal font-black text-slate-900 print:text-[1.25rem] leading-normal print:break-after-avoid">Schülerliste</h1>
          <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest mt-1 print:break-after-avoid">
            Sortiert nach: {sortBy === 'nachname' ? 'Nachname' : sortBy === 'vorname' ? 'Vorname' : 'Alter/Geburtsdatum'} • Filter: {activeFilters.length ? activeFilters.map(value => value.toUpperCase()).join(' + ') : 'Alle Schüler'}
          </p>
        </div>
        <table className="w-full print:w-full print:border-collapse print:text-[0.75rem] leading-tight">
          <thead>
            <tr className="print:break-inside-avoid print:border-b print:border-gray-300">
              <th className="w-10 print:border print:border-gray-300 print:p-2 text-left">#</th>
              <th className="print:border print:border-gray-300 print:p-2 text-left">Nachname</th>
              <th className="print:border print:border-gray-300 print:p-2 text-left">Vorname</th>
              <th className="w-28 text-center print:border print:border-gray-300 print:p-2">Geburtsdatum</th>
              <th className="w-24 text-left print:border print:border-gray-300 print:p-2">Religion</th>
              <th className="w-12 text-center print:border print:border-gray-300 print:p-2">DaZ</th>
              <th className="w-12 text-center print:border print:border-gray-300 print:p-2">SPF</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s, idx) => (
              <React.Fragment key={s.id}>
                <tr className="print:break-inside-avoid print:border-b print:border-gray-300">
                  <td className="print:border print:border-gray-300 print:p-2">{idx + 1}</td>
                  <td className="font-extrabold text-slate-900 print:border print:border-gray-300 print:p-2">{s.nachname}</td>
                  <td className="font-medium text-slate-700 print:border print:border-gray-300 print:p-2">{s.vorname}</td>
                  <td className="text-center tabular-nums print:border print:border-gray-300 print:p-2">{s.geburtstag ? (s.geburtstag.includes('-') ? s.geburtstag.split('-').reverse().join('.') : s.geburtstag) : '–'}</td>
                  <td className="print:border print:border-gray-300 print:p-2">{s.religion || '–'}</td>
                  <td className="text-center font-black text-amber-600 print:border print:border-gray-300 print:p-2">{s.daz ? '✓' : ''}</td>
                  <td className="text-center font-black text-indigo-600 print:border print:border-gray-300 print:p-2">{(s.spf || s.espf) ? '✓' : ''}</td>
                </tr>
                {((idx + 1) % 25 === 0 && idx < filteredStudents.length - 1) && (
                   <tr key={`break-${idx}`} className="hidden print:hidden"><td colSpan={7} className="print:break-after-page"></td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 sm:p-8 text-[0.625rem] text-slate-400 font-bold uppercase tracking-wider print:break-inside-avoid">
          <div>Zusammenfassung: Gesucht/Gefiltert: {filteredStudents.length} von {schueler.length} Schüler/innen</div>
          <div className="text-right">Klassenliste • Gedruckt mit Klassio</div>
        </div>
      </div>

    </>
  );
}
