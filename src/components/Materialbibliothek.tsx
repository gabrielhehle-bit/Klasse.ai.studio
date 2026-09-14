
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, ArrowUpDown, ChevronRight, Trash2, Edit3, Heart, 
  FileText, Link as LinkIcon, Sparkles, BookOpen, LifeBuoy, Mail, StickyNote,
  X, Download, ExternalLink, Copy, Printer, Info, AlertTriangle, Check,
  Folder, Database, ArrowLeft, Upload, ClipboardList, Wand2, Loader2,
  LayoutGrid, List, CheckSquare, Square, FolderClosed, Trash, BarChart2, Tag, UploadCloud, Palette
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { FAECHER_ALLE } from '../constants';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import { MaterialItem } from '../types';
import { generateTeachingMaterial } from '../services/aiService';
import { calculateMaterialStorageSize, upsertMaterial } from '../lib/materialLibraryUtils';
export { calculateMaterialStorageSize as calculateStorageSize } from '../lib/materialLibraryUtils';

const normalizeMaterialItem = (item: MaterialItem): MaterialItem => ({
  ...item,
  titel: item.titel || '',
  beschreibung: item.beschreibung || '',
  typ: item.typ || 'notiz',
  faecher: Array.isArray(item.faecher) ? item.faecher : [],
  schulstufen: Array.isArray(item.schulstufen) ? item.schulstufen : [],
  tags: Array.isArray(item.tags) ? item.tags : [],
  erstelltAm: item.erstelltAm || '',
});

export default function Materialbibliothek() {
  const { app, setApp, setPage } = useApp();
  const [activeTab, setActiveTab] = useState<string>('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFach, setFilterFach] = useState('');
  const [filterStufe, setFilterStufe] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'used' | 'date' | 'title'>('date');
  const [onlyAi, setOnlyAi] = useState(false);
  const [filterTag, setFilterTag] = useState<string | null>(null);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<'none' | 'fach' | 'typ'>('none');
  
  const [isAdding, setIsAdding] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [weekPlanMaterial, setWeekPlanMaterial] = useState<MaterialItem | null>(null);

  // Stats
  const storageMB = useMemo(() => calculateMaterialStorageSize(app.materialien || []), [app.materialien]);
  const favoritesCount = useMemo(() => (app.materialien || []).filter(m => m.favorit).length, [app.materialien]);
  const totalCount = (app.materialien || []).length;

  const activeFiltersCount = useMemo(() => {
    return (activeTab !== 'Alle' ? 1 : 0) + 
           (searchQuery ? 1 : 0) + 
           (filterFach ? 1 : 0) + 
           (filterStufe ? 1 : 0) + 
           (onlyAi ? 1 : 0) + 
           (filterTag ? 1 : 0);
  }, [activeTab, searchQuery, filterFach, filterStufe, onlyAi, filterTag]);

  const clearAllFilters = () => {
    setActiveTab('Alle');
    setSearchQuery('');
    setFilterFach('');
    setFilterStufe('');
    setOnlyAi(false);
    setFilterTag(null);
  };

  // Filtered & Sorted list
  const filteredMaterials = useMemo(() => {
    let list = (app.materialien || []).map(normalizeMaterialItem);
    
    // Tab filter
    if (activeTab === 'Favoriten') list = list.filter(m => m.favorit);
    else if (activeTab === 'Dateien') list = list.filter(m => m.typ === 'datei');
    else if (activeTab === 'Links') list = list.filter(m => m.typ === 'link');
    else if (activeTab === 'Stundenentwürfe') list = list.filter(m => m.typ === 'stundenentwurf');
    else if (activeTab === 'Notfallpläne') list = list.filter(m => m.typ === 'notfallplan');
    else if (activeTab === 'Elternbriefe') list = list.filter(m => m.typ === 'elternbrief');
    else if (activeTab === 'Beurteilungen') list = list.filter(m => m.typ === 'beurteilung');
    else if (activeTab === 'Reflexionen') list = list.filter(m => m.typ === 'reflexion');
    else if (activeTab === 'Notizen') list = list.filter(m => m.typ === 'notiz');

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m =>
        m.titel.toLowerCase().includes(q) ||
        m.beschreibung.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q)) ||
        (m.inhaltText && m.inhaltText.toLowerCase().includes(q))
      );
    }

    // Tag filter
    if (filterTag) {
      list = list.filter(m => m.tags.includes(filterTag));
    }

    // AI filter
    if (onlyAi) list = list.filter(m => m.kiGeneriert);

    // Metadata filters
    if (filterFach) list = list.filter(m => m.faecher.includes(filterFach));
    if (filterStufe) list = list.filter(m => m.schulstufen.includes(filterStufe as number));

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'title') return a.titel.localeCompare(b.titel);
      if (sortBy === 'date') return new Date(b.erstelltAm).getTime() - new Date(a.erstelltAm).getTime();
      if (sortBy === 'used') {
        const dateA = a.zuletztVerwendet ? new Date(a.zuletztVerwendet).getTime() : 0;
        const dateB = b.zuletztVerwendet ? new Date(b.zuletztVerwendet).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return list;
  }, [app.materialien, activeTab, searchQuery, onlyAi, filterFach, filterStufe, sortBy, filterTag]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    (app.materialien || []).forEach(m => (m.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [app.materialien]);

  // Handle Selection
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedItems.length === filteredMaterials.length) setSelectedItems([]);
    else setSelectedItems(filteredMaterials.map(m => m.id));
  };

  const handleBulkDelete = () => {
    if (confirm(`Möchtest du die ${selectedItems.length} markierten Materialien wirklich löschen?`)) {
      setApp(prev => ({
        ...prev,
        materialien: prev.materialien?.filter(m => !selectedItems.includes(m.id))
      }));
      setSelectedItems([]);
    }
  };

  const handleBulkFavorite = () => {
    setApp(prev => ({
      ...prev,
      materialien: prev.materialien?.map(m => selectedItems.includes(m.id) ? { ...m, favorit: true } : m)
    }));
    setSelectedItems([]);
  };

  // Grouping logic for Grid/List
  const groupedMaterials = useMemo(() => {
    if (groupBy === 'none') return { 'Alle Materialien': filteredMaterials };
    const groups: Record<string, MaterialItem[]> = {};
    filteredMaterials.forEach(m => {
      const key = groupBy === 'fach'
        ? (m.faecher.length > 0 ? m.faecher[0] : 'Ohne Fach')
        : ((m.typ || 'notiz').charAt(0).toUpperCase() + (m.typ || 'notiz').slice(1));
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [filteredMaterials, groupBy]);

  const handleToggleFavorit = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setApp(prev => ({
      ...prev,
      materialien: prev.materialien?.map(m => m.id === id ? { ...m, favorit: !m.favorit } : m)
    }));
  };

  const handleMarkUsed = (id: string) => {
    setApp(prev => ({
      ...prev,
      materialien: prev.materialien?.map(m => m.id === id ? { ...m, zuletztVerwendet: new Date().toISOString() } : m)
    }));
  };

  const handleDelete = (id: string) => {
    if (confirm("Möchtest du dieses Material wirklich löschen?")) {
      setApp(prev => ({
        ...prev,
        materialien: prev.materialien?.filter(m => m.id !== id)
      }));
      setShowDetail(false);
    }
  };

  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const isCompact = zoomLevel === 'compact';
  const isLarge = zoomLevel === 'large';

  return (
    <div className={`material-library-shell ${isCompact ? "space-y-4" : isLarge ? "space-y-8" : "space-y-5"}`}>
      {/* Header & Stats Widget */}
      <div className={`flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 ${
        isCompact ? 'pb-4 gap-4' : isLarge ? 'pb-10 gap-8' : 'pb-6 gap-5'
      }`}>
        <div className={`flex-1 ${isCompact ? 'space-y-2' : isLarge ? 'space-y-6' : 'space-y-4'}`}>
           <div className={`leading-snug font-medium text-slate-500 ${
             isCompact ? 'text-[0.75rem]' : isLarge ? 'text-[1rem]' : 'text-[0.875rem]'
           }`}>
              Unterrichtsmaterialien, Arbeitsblätter und Vorlagen organisieren
           </div>
           
           <div className={`grid grid-cols-2 md:grid-cols-4 ${isCompact ? 'gap-2.5' : isLarge ? 'gap-6' : 'gap-4'}`}>
              <div className={`bg-slate-50 border border-slate-100 flex flex-col ${
                isCompact ? 'p-2.5 rounded-xl gap-0.5' : isLarge ? 'p-5 rounded-[2rem] gap-1.5' : 'p-4 rounded-2xl gap-1'
              }`}>
                 <div className="flex items-center gap-2 text-slate-500 mb-0.5">
                   <Folder size={isCompact ? 14 : isLarge ? 20 : 16} />
                   <span className={`${isCompact ? 'text-[0.5625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.625rem]'} font-black uppercase tracking-wider`}>Gesamt</span>
                 </div>
                 <span className={`leading-normal font-black text-slate-800 ${
                   isCompact ? 'text-[1.125rem]' : isLarge ? 'text-[2rem]' : 'text-[1.5rem]'
                 }`}>{totalCount}</span>
              </div>
              
              <div className={`bg-rose-50 border border-rose-100 flex flex-col ${
                isCompact ? 'p-2.5 rounded-xl gap-0.5' : isLarge ? 'p-5 rounded-[2rem] gap-1.5' : 'p-4 rounded-2xl gap-1'
              }`}>
                 <div className="flex items-center gap-2 text-rose-500 mb-0.5">
                   <Heart size={isCompact ? 14 : isLarge ? 20 : 16} fill="currentColor" />
                   <span className={`${isCompact ? 'text-[0.5625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.625rem]'} font-black uppercase tracking-wider`}>Favoriten</span>
                 </div>
                 <span className={`leading-normal font-black text-rose-700 ${
                   isCompact ? 'text-[1.125rem]' : isLarge ? 'text-[2rem]' : 'text-[1.5rem]'
                 }`}>{favoritesCount}</span>
              </div>

              <div className={`bg-fuchsia-50 border border-fuchsia-100 flex flex-col ${
                isCompact ? 'p-2.5 rounded-xl gap-0.5' : isLarge ? 'p-5 rounded-[2rem] gap-1.5' : 'p-4 rounded-2xl gap-1'
              }`}>
                 <div className="flex items-center gap-2 text-fuchsia-500 mb-0.5">
                   <Sparkles size={isCompact ? 14 : isLarge ? 20 : 16} fill="currentColor" />
                   <span className={`${isCompact ? 'text-[0.5625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.625rem]'} font-black uppercase tracking-wider`}>KI-Inhalte</span>
                 </div>
                 <span className={`leading-normal font-black text-fuchsia-700 ${
                   isCompact ? 'text-[1.125rem]' : isLarge ? 'text-[2rem]' : 'text-[1.5rem]'
                 }`}>{(app.materialien || []).filter(m => m.kiGeneriert).length}</span>
              </div>

              <div className={`border transition-all flex flex-col ${
                isCompact ? 'p-2.5 rounded-xl gap-1' : isLarge ? 'p-5 rounded-[2rem] gap-2' : 'p-4 rounded-2xl gap-1.5'
              } ${storageMB > 4 ? 'bg-rose-50 border-rose-100 animate-pulse' : 'bg-indigo-50 border-indigo-100'}`}>
                 <div className="flex items-center justify-between">
                   <div className={`flex items-center gap-2 ${storageMB > 4 ? 'text-rose-500 font-bold' : 'text-indigo-500'}`}>
                     <Database size={isCompact ? 14 : isLarge ? 20 : 16} />
                     <span className={`${isCompact ? 'text-[0.5625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.625rem]'} font-black uppercase tracking-wider`}>Speicher</span>
                   </div>
                   {storageMB > 0 && (
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         if (confirm("Möchtest du den gesamten Speicher zurücksetzen? Das löscht alle deine hochgeladenen und generierten Materialien.")) {
                           setApp(prev => ({ ...prev, materialien: [] }));
                         }
                       }}
                       title="Speicher zurücksetzen"
                       className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors pointer-events-auto animate-in fade-in"
                     >
                       <Trash size={isCompact ? 10 : isLarge ? 14 : 12} />
                     </button>
                   )}
                 </div>
                 <div className={`flex flex-col mt-0.5 ${isCompact ? 'gap-0.5' : isLarge ? 'gap-2' : 'gap-1'}`}>
                   <span className={`leading-none font-black ${
                     isCompact ? 'text-[1rem]' : isLarge ? 'text-[1.625rem]' : 'text-[1.25rem]'
                   } ${storageMB > 4 ? 'text-rose-700' : 'text-indigo-800'}`}>
                      {storageMB.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className={`${isCompact ? 'text-[0.625rem]' : isLarge ? 'text-[0.875rem]' : 'text-[0.75rem]'} font-bold text-slate-400`}> MB von 5 MB</span>
                   </span>
                   {/* Storage Progress Bar */}
                   <div className={`w-full bg-slate-200/70 rounded-full overflow-hidden ${isCompact ? 'h-1 mt-0.5' : isLarge ? 'h-2 mt-2' : 'h-1.5 mt-1'}`}>
                     <div 
                       className={`h-full rounded-full transition-all duration-500 ${
                         storageMB > 4 ? 'bg-rose-600' : storageMB > 2.5 ? 'bg-amber-500' : 'bg-indigo-600'
                       }`}
                       style={{ width: `${Math.min(100, (storageMB / 5) * 100)}%` }}
                     />
                   </div>
                 </div>
              </div>
           </div>
        </div>
        
        <div className={`flex shrink-0 flex-col gap-2 sm:flex-row ${isCompact ? 'mt-1 md:mt-4' : isLarge ? 'mt-3 md:mt-10' : 'mt-2 md:mt-8'}`}>
          <button
            type="button"
            onClick={() => setPage('canva')}
            className={`flex items-center justify-center gap-2 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-5 font-black text-[var(--accent)] transition hover:border-[var(--accent)]/45 hover:bg-[var(--surface)] ${isCompact ? 'h-11 text-xs' : isLarge ? 'h-16 text-lg' : 'h-14 text-sm'}`}
          >
            <Palette size={isCompact ? 18 : isLarge ? 28 : 22} />
            <span>Mit Canva gestalten</span>
          </button>
          <button 
            onClick={() => {
              setSelectedMaterial(null);
              setIsAdding(true);
            }}
            className={`btn btn-primary flex shrink-0 items-center gap-2 shadow-xl hover:scale-[1.02] transition-transform ${isCompact ? 'h-11 px-5 rounded-xl text-xs' : isLarge ? 'h-16 px-10 rounded-[1.5rem] text-lg' : 'h-14 px-8'}`}
          >
            <Plus size={isCompact ? 18 : isLarge ? 28 : 24} />
            <span>Neues Material</span>
          </button>
        </div>
      </div>

      {storageMB > 4 && (
        <div className={`bg-rose-50 border border-rose-100 flex items-center gap-3 text-rose-700 leading-snug font-bold animate-in slide-in-from-top duration-300 ${
          isCompact ? 'p-2 rounded-xl text-[0.75rem]' : isLarge ? 'p-4 rounded-2xl text-[1rem]' : 'p-3 rounded-2xl text-[0.875rem]'
        }`}>
          <AlertTriangle size={isCompact ? 16 : isLarge ? 22 : 18} className="shrink-0" />
          Achtung: Speicher zu 80% gefüllt. Lösche nicht mehr benötigte Materialien.
        </div>
      )}

      <div className={`bg-white border border-slate-100 shadow-sm ${
        isCompact ? 'p-2.5 rounded-2xl' : isLarge ? 'p-5 rounded-[3rem]' : 'p-3 rounded-2xl'
      }`}>
        <p className={`font-bold text-slate-400 flex items-center gap-2 px-4 ${
          isCompact ? 'text-[0.5625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.625rem]'
        }`}>
          <Info size={isCompact ? 10 : isLarge ? 14 : 12} />
          Deine Materialien bleiben auf diesem Gerät gespeichert. Verfügbar sind insgesamt 5 MB; einzelne Dateien sollten möglichst kleiner als 1 MB sein.
        </p>
      </div>

      {/* Sticky Filter Header */}
      {totalCount > 0 && (
      <div className={`sticky top-0 z-[150] bg-slate-50/95 backdrop-blur-md shadow-sm border-b border-slate-100 ${
        isCompact ? 'pt-2 pb-3 -mx-2 px-2 space-y-2' : isLarge ? 'pt-4 pb-6 -mx-6 px-6 space-y-6' : 'pt-3 pb-4 -mx-4 px-4 space-y-3'
      }`}>
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 pb-1">
          {['Alle', 'Dateien', 'Links', 'Stundenentwürfe', 'Notfallpläne', 'Elternbriefe', 'Beurteilungen', 'Reflexionen', 'Notizen', 'Favoriten'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              aria-pressed={activeTab === tab}
              className={`leading-tight font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                isCompact ? 'px-4 py-2 rounded-xl text-[0.625rem]' : isLarge ? 'px-8 py-4 rounded-[1.25rem] text-[0.875rem]' : 'px-4 py-2 rounded-xl text-[0.6875rem]'
              } ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 hover:text-slate-800 border border-slate-100'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search & Filter */}
        <div className={`bg-white border border-slate-100 shadow-sm ${
          isCompact ? 'p-3 rounded-2xl space-y-2.5' : isLarge ? 'p-8 rounded-[2.5rem]' : 'p-4 rounded-2xl'
        } ${isCompact ? 'space-y-2.5' : isLarge ? 'space-y-6' : 'space-y-4'}`}>
          <div className={`flex flex-col md:flex-row ${isCompact ? 'gap-2.5' : isLarge ? 'gap-6' : 'gap-4'}`}>
            <div className="flex-1 relative">
              <Search className={`absolute -translate-y-1/2 text-slate-400 ${
                isCompact ? 'left-3' : isLarge ? 'left-5' : 'left-4'
              }`} size={isCompact ? 14 : isLarge ? 22 : 18} />
              <input 
                type="text" 
                placeholder="Suchen nach Titel, Beschreibung, Tags..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-slate-50 border-none focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium ${
                  isCompact ? 'pl-9 pr-3 py-2 rounded-xl text-[0.75rem]' : isLarge ? 'pl-14 pr-6 py-4 rounded-[1.75rem] text-[1rem]' : 'pl-12 pr-4 py-3 rounded-2xl text-[0.875rem]'
                }`}
              />
            </div>
            <div className={`flex flex-wrap items-center ${isCompact ? 'gap-2' : isLarge ? 'gap-4' : 'gap-3'}`}>
              <div className={`flex items-center bg-slate-50 border border-slate-100 ${
                isCompact ? 'px-2 py-1.5 rounded-lg gap-1.5' : isLarge ? 'px-4 py-3 rounded-[1.25rem] gap-3' : 'px-3 py-2 rounded-xl gap-2'
              }`}>
                <Filter size={isCompact ? 12 : isLarge ? 18 : 14} className="text-slate-400" />
                <select 
                  aria-label="Nach Fach filtern"
                  value={filterFach}
                  onChange={(e) => setFilterFach(e.target.value)}
                  className={`bg-transparent font-bold text-slate-600 outline-none cursor-pointer ${
                    isCompact ? 'text-[0.6875rem]' : isLarge ? 'text-[0.875rem]' : 'text-[0.75rem]'
                  }`}
                >
                  <option value="">Alle Fächer</option>
                  {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className={`flex items-center bg-slate-50 border border-slate-100 ${
                isCompact ? 'px-2 py-1.5 rounded-lg gap-1.5' : isLarge ? 'px-4 py-3 rounded-[1.25rem] gap-3' : 'px-3 py-2 rounded-xl gap-2'
              }`}>
                <BookOpen size={isCompact ? 12 : isLarge ? 18 : 14} className="text-slate-400" />
                <select 
                  aria-label="Nach Schulstufe filtern"
                  value={filterStufe}
                  onChange={(e) => setFilterStufe(e.target.value ? parseInt(e.target.value) : '')}
                  className={`bg-transparent font-bold text-slate-600 outline-none cursor-pointer ${
                    isCompact ? 'text-[0.6875rem]' : isLarge ? 'text-[0.875rem]' : 'text-[0.75rem]'
                  }`}
                >
                  <option value="">Alle Stufen</option>
                  {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                </select>
              </div>
              <div className={`flex items-center bg-indigo-50 border border-indigo-100 ${
                isCompact ? 'px-2 py-1.5 rounded-lg gap-1.5' : isLarge ? 'px-4 py-3 rounded-[1.25rem] gap-3' : 'px-3 py-2 rounded-xl gap-2'
              }`}>
                <ArrowUpDown size={isCompact ? 12 : isLarge ? 18 : 14} className="text-indigo-500" />
                <select 
                  aria-label="Materialien sortieren"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className={`bg-transparent font-bold text-indigo-700 outline-none cursor-pointer ${
                    isCompact ? 'text-[0.6875rem]' : isLarge ? 'text-[0.875rem]' : 'text-[0.75rem]'
                  }`}
                >
                  <option value="used">Zuletzt verwendet</option>
                  <option value="date">Erstelldatum</option>
                  <option value="title">Alphabetisch</option>
                </select>
              </div>
              <button 
                onClick={() => setOnlyAi(!onlyAi)}
                aria-pressed={onlyAi}
                className={`flex items-center gap-2 transition-all border font-bold ${
                  isCompact ? 'px-2.5 py-1.5 rounded-lg text-[0.6875rem]' : isLarge ? 'px-5 py-3 rounded-[1.25rem] text-[0.875rem]' : 'px-4 py-2 rounded-xl text-[0.75rem]'
                } ${onlyAi ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
              >
                <Sparkles size={isCompact ? 12 : isLarge ? 18 : 14} />
                Nur KI
              </button>
            </div>
          </div>

          {/* Additional Filter Tools & View Settings */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-100">
             <div className="flex flex-wrap items-center gap-2">
                 {allTags.length > 0 && (
                   <div className="flex items-center gap-2 pr-4 border-r border-slate-100">
                     <Tag size={14} className="text-slate-400" />
                     <div className="flex flex-wrap gap-1 max-w-[400px] ">
                        {allTags.slice(0, 5).map(tag => (
                           <button
                             key={tag}
                             onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                             className={`px-2 py-1 rounded-lg text-[0.625rem] font-bold border transition-colors ${filterTag === tag ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'}`}
                           >
                              #{tag}
                           </button>
                        ))}
                        {filterTag && !allTags.slice(0, 5).includes(filterTag) && (
                           <button onClick={() => setFilterTag(null)} className="px-2 py-1 rounded-lg text-[0.625rem] font-bold bg-indigo-600 text-white border border-indigo-600">#{filterTag} <X size={10} className="inline ml-1"/></button>
                        )}
                        {allTags.length > 5 && <span className="text-[0.625rem] text-slate-400 font-medium py-1 px-1">+{allTags.length - 5} weitere</span>}
                     </div>
                   </div>
                 )}

                 <div className="flex items-center gap-2 px-2">
                    <FolderClosed size={14} className="text-slate-400" />
                    <select 
                      aria-label="Materialien gruppieren"
                      value={groupBy}
                      onChange={(e) => setGroupBy(e.target.value as any)}
                      className="bg-transparent text-[0.75rem] leading-tight font-bold text-slate-600 outline-none cursor-pointer"
                    >
                      <option value="none">Nicht gruppieren</option>
                      <option value="fach">Nach Fach</option>
                      <option value="typ">Nach Typ</option>
                    </select>
                 </div>
             </div>

             <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button onClick={() => setViewMode('grid')} aria-label="Rasteransicht" aria-pressed={viewMode === 'grid'} title="Rasteransicht" className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={16} /></button>
                <button onClick={() => setViewMode('list')} aria-label="Listenansicht" aria-pressed={viewMode === 'list'} title="Listenansicht" className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}><List size={16} /></button>
             </div>
          </div>

          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 border-t border-slate-100/80 animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider mr-1">Aktive Filter:</span>
              
              {activeTab !== 'Alle' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[0.6875rem] font-bold border border-indigo-100/50">
                  Kategorie: {activeTab}
                  <button onClick={() => setActiveTab('Alle')} className="hover:text-indigo-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[0.6875rem] font-bold border border-indigo-100/50">
                  Suche: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-indigo-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              {filterFach && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[0.6875rem] font-bold border border-indigo-100/50">
                  Fach: {filterFach}
                  <button onClick={() => setFilterFach('')} className="hover:text-indigo-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              {filterStufe && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[0.6875rem] font-bold border border-indigo-100/50">
                  {filterStufe}. Stufe
                  <button onClick={() => setFilterStufe('')} className="hover:text-indigo-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              {filterTag && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[0.6875rem] font-bold border border-indigo-100/50">
                  Tag: #{filterTag}
                  <button onClick={() => setFilterTag(null)} className="hover:text-indigo-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              {onlyAi && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[0.6875rem] font-bold border border-emerald-100/50">
                  Nur KI-Inhalte
                  <button onClick={() => setOnlyAi(false)} className="hover:text-emerald-950 transition-colors ml-1 font-black">&times;</button>
                </span>
              )}

              <button 
                onClick={clearAllFilters}
                className="text-[0.6875rem] font-black text-rose-600 hover:text-rose-700 px-3 py-1 bg-rose-50 hover:bg-rose-100 rounded-full transition-all ml-auto flex items-center gap-1 shadow-sm"
              >
                <X size={10} /> Filter löschen
              </button>
            </div>
          )}
        </div>

        {/* Bulk Action Bar */}
        <AnimatePresence>
          {selectedItems.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className=""
            >
              <div className="bg-indigo-600 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl shadow-indigo-100/50">
                <div className="flex items-center gap-3 font-bold text-[0.875rem] leading-snug">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    {selectedItems.length}
                  </div>
                  Materialien ausgewählt
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[0.75rem] leading-tight font-bold transition-colors">
                    {selectedItems.length === filteredMaterials.length ? 'Auswahl aufheben' : 'Alle auswählen'}
                  </button>
                  <button onClick={handleBulkFavorite} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[0.75rem] leading-tight font-bold transition-colors flex items-center gap-2">
                    <Heart size={14} /> Markieren
                  </button>
                  <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500/80 hover:bg-rose-500 rounded-xl text-white text-[0.75rem] leading-tight font-bold transition-colors flex items-center gap-2">
                    <Trash2 size={14} /> Löschen
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Rendering using Grouping and ViewMode */}
      <div className="space-y-10">
        {Object.entries(groupedMaterials).map(([groupName, items]) => (
          <div key={groupName} className="space-y-4">
            {groupBy !== 'none' && (
               <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                 <h2 className="text-[1.25rem] leading-normal font-black text-slate-800">{groupName}</h2>
                 <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[0.75rem] leading-tight font-bold">{items.length}</span>
               </div>
            )}
            
            {viewMode === 'grid' ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isCompact ? 'gap-4' : isLarge ? 'gap-8' : 'gap-6'}`}>
                {items.map(m => (
                  <MaterialCard 
                    key={m.id} 
                    item={m} 
                    onClick={() => {
                      setSelectedMaterial(m);
                      setShowDetail(true);
                    }} 
                    onToggleFavorit={handleToggleFavorit}
                    isSelected={selectedItems.includes(m.id)}
                    onToggleSelection={() => toggleSelection(m.id)}
                    onDelete={() => handleDelete(m.id)}
                    viewMode="grid"
                  />
                ))}
              </div>
            ) : (
              <div className={`flex flex-col ${isCompact ? 'gap-2' : isLarge ? 'gap-4' : 'gap-3'}`}>
                {items.map(m => (
                  <MaterialCard 
                    key={m.id} 
                    item={m} 
                    onClick={() => {
                      setSelectedMaterial(m);
                      setShowDetail(true);
                    }} 
                    onToggleFavorit={handleToggleFavorit}
                    isSelected={selectedItems.includes(m.id)}
                    onToggleSelection={() => toggleSelection(m.id)}
                    onDelete={() => handleDelete(m.id)}
                    viewMode="list"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
        {filteredMaterials.length === 0 && (
          <div className="col-span-full py-14 px-6 flex flex-col items-center text-slate-350 bg-white border border-dashed border-slate-200 rounded-2xl">
            <span className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
              <Folder size={26} />
            </span>
            <p className="text-[1.125rem] leading-normal font-bold text-slate-700 mb-1">Keine Materialien gefunden</p>
            <p className="text-[0.875rem] leading-snug font-medium text-slate-500 text-center max-w-md">Lege Arbeitsblätter, Links, Stundenentwürfe oder Vorlagen zentral ab – dann findest du sie später über Suche und Filter sofort wieder.</p>
            {activeFiltersCount > 0 && (
              <button 
                onClick={clearAllFilters}
                className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-[0.8125rem] shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all hover:scale-[1.02]"
              >
                <X size={14} /> Filter zurücksetzen
              </button>
            )}
            {activeFiltersCount === 0 && (
              <button
                onClick={() => {
                  setSelectedMaterial(null);
                  setIsAdding(true);
                }}
                className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[0.8125rem] shadow-sm flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={15} /> Erstes Material anlegen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAdding && (
          <AddMaterialModal 
            onClose={() => setIsAdding(false)} 
            onSave={(item) => {
              const nextMaterials = upsertMaterial(app.materialien || [], item);
              const totalNewSize = calculateMaterialStorageSize(nextMaterials);
              if (totalNewSize > 5) {
                alert("Speicher voll. Bitte lösche alte Materialien oder reduziere die Dateigröße.");
                return;
              }
              setApp(prev => ({
                ...prev,
                materialien: upsertMaterial(prev.materialien || [], item)
              }));
              setSelectedMaterial(null);
              setIsAdding(false);
            }}
            initialData={selectedMaterial && selectedMaterial.id ? selectedMaterial : undefined}
          />
        )}
        {showDetail && selectedMaterial && (
          <MaterialDetailModal 
            item={selectedMaterial}
            onClose={() => setShowDetail(false)}
            onDelete={() => handleDelete(selectedMaterial.id)}
            onToggleFavorit={(e) => handleToggleFavorit(e, selectedMaterial.id)}
            onMarkUsed={() => handleMarkUsed(selectedMaterial.id)}
            onSendToWeekPlan={() => {
              setShowDetail(false);
              setWeekPlanMaterial(selectedMaterial);
            }}
            onEdit={() => {
              setShowDetail(false);
              setIsAdding(true);
            }}
          />
        )}
        {weekPlanMaterial && (
          <MaterialToWeekPlanModal
            item={weekPlanMaterial}
            onClose={() => setWeekPlanMaterial(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MaterialCard({ item, onClick, onToggleFavorit, isSelected, onToggleSelection, onDelete, viewMode }: { item: MaterialItem; onClick: () => void; onToggleFavorit: (e: React.MouseEvent, id: string) => void; isSelected?: boolean; onToggleSelection?: () => void; onDelete?: () => void; viewMode?: 'grid' | 'list' }) {
  const { app } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const isCompact = zoomLevel === 'compact';
  const isLarge = zoomLevel === 'large';

  const Icon = {
    datei: FileText,
    link: LinkIcon,
    stundenentwurf: BookOpen,
    notfallplan: LifeBuoy,
    elternbrief: Mail,
    beurteilung: ClipboardList,
    reflexion: Sparkles,
    notiz: StickyNote,
    sonstiges: StickyNote
  }[item.typ] || StickyNote;

  const typedBg = {
    datei: 'bg-blue-50 text-blue-600',
    link: 'bg-emerald-50 text-emerald-600',
    stundenentwurf: 'bg-indigo-50 text-indigo-600',
    notfallplan: 'bg-rose-50 text-rose-600',
    elternbrief: 'bg-amber-50 text-amber-600',
    beurteilung: 'bg-emerald-50 text-emerald-600',
    reflexion: 'bg-fuchsia-50 text-fuchsia-600',
    notiz: 'bg-slate-50 text-slate-600',
    sonstiges: 'bg-slate-50 text-slate-600'
  }[item.typ] || 'bg-slate-50 text-slate-600';

  const isDarkHover = item.typ === 'datei' || item.typ === 'link';

  if (viewMode === 'list') {
     return (
       <motion.div 
         layoutId={item.id}
         onClick={onClick}
         className={`border shadow-sm transition-all duration-300 cursor-pointer flex items-center group relative bg-white border-slate-100 hover:shadow-md hover:border-indigo-100 ${
           isCompact ? 'rounded-xl p-2.5 gap-2.5' : isLarge ? 'rounded-3xl p-6 gap-6' : 'rounded-2xl p-4 gap-4'
         } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}
       >
         <button 
           onClick={(e) => { e.stopPropagation(); onToggleSelection?.(); }}
           className={`shrink-0 p-1 rounded-lg transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
         >
           {isSelected ? <CheckSquare size={isCompact ? 16 : isLarge ? 24 : 20} /> : <Square size={isCompact ? 16 : isLarge ? 24 : 20} />}
         </button>

         <div className={`shrink-0 ${typedBg} ${
           isCompact ? 'p-1.5 rounded-lg' : isLarge ? 'p-3.5 rounded-2xl' : 'p-2.5 rounded-xl'
         }`}>
           <Icon size={isCompact ? 16 : isLarge ? 26 : 20} />
         </div>

         <div className={`flex-1 min-w-0 flex items-center justify-between ${isCompact ? 'gap-2.5' : isLarge ? 'gap-6' : 'gap-4'}`}>
            <div className="space-y-0.5 min-w-0">
               <h3 className={`leading-snug font-black text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors ${
                 isCompact ? 'text-[0.8125rem]' : isLarge ? 'text-[1.0625rem]' : 'text-[0.875rem]'
               }`}>
                 {item.titel}
               </h3>
               <p className={`font-medium text-slate-400 line-clamp-1 ${
                 isCompact ? 'text-[0.625rem]' : isLarge ? 'text-[0.75rem]' : 'text-[0.6875rem]'
               }`}>{item.beschreibung}</p>
            </div>

            <div className={`flex items-center shrink-0 ${isCompact ? 'gap-2' : isLarge ? 'gap-6' : 'gap-4'}`}>
               <div className="hidden md:flex items-center gap-2">
                 {item.faecher.slice(0, 2).map(f => (
                   <span key={f} className={`rounded-lg font-bold bg-slate-50 text-slate-500 ${
                     isCompact ? 'px-1.5 py-0.5 text-[0.5625rem]' : isLarge ? 'px-3 py-1 text-[0.75rem]' : 'px-2 py-0.5 text-[0.625rem]'
                   }`}>{f}</span>
                 ))}
               </div>
               
               {item.kiGeneriert && <Sparkles size={isCompact ? 12 : isLarge ? 18 : 14} className="text-emerald-500" />}

               {onDelete && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); onDelete(); }}
                   className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100 duration-200"
                   title="Löschen"
                 >
                   <Trash2 size={isCompact ? 14 : isLarge ? 20 : 16} />
                 </button>
               )}
               <button 
                 onClick={(e) => onToggleFavorit(e, item.id)}
                 className={`p-2 rounded-full transition-all ${item.favorit ? 'text-rose-500' : 'text-slate-200 hover:text-rose-300'}`}
               >
                 <Heart size={isCompact ? 15 : isLarge ? 22 : 18} fill={item.favorit ? "currentColor" : "none"} />
               </button>
            </div>
         </div>
       </motion.div>
     );
  }

  return (
    <motion.div 
      layoutId={item.id}
      onClick={onClick}
      className={`border shadow-sm transition-all duration-300 cursor-pointer flex flex-col group h-full relative ${
        isCompact ? 'rounded-2xl p-3 gap-2.5' : isLarge ? 'rounded-[2.5rem] p-7 gap-6' : 'rounded-[2rem] p-5 gap-4'
      } ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''} ${isDarkHover ? 'bg-white border-slate-100 hover:bg-zinc-800/95 hover:text-white hover:border-zinc-700 hover:shadow-2xl' : 'bg-white border-slate-100 hover:shadow-xl hover:border-indigo-100'}`}
    >
      <div className="flex justify-between items-start">
        <div className={`flex items-center ${isCompact ? 'gap-1.5' : isLarge ? 'gap-3' : 'gap-2'}`}>
           <button 
             onClick={(e) => { e.stopPropagation(); onToggleSelection?.(); }}
             className={`shrink-0 p-1 rounded-lg transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
           >
             {isSelected ? <CheckSquare size={isCompact ? 16 : isLarge ? 24 : 20} /> : <Square size={isCompact ? 16 : isLarge ? 24 : 20} />}
           </button>
           <div className={`${isCompact ? 'p-1.5 rounded-lg' : isLarge ? 'p-3.5 rounded-2xl' : 'p-2.5 rounded-xl'} ${typedBg}`}>
             <Icon size={isCompact ? 16 : isLarge ? 26 : 20} />
           </div>
        </div>
        <div className="flex items-center gap-1">
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all opacity-0 group-hover:opacity-100 duration-200"
              title="Löschen"
            >
              <Trash2 size={isCompact ? 14 : isLarge ? 20 : 16} />
            </button>
          )}
          <button 
            onClick={(e) => onToggleFavorit(e, item.id)}
            className={`p-2 rounded-full transition-all ${item.favorit ? 'text-rose-500' : 'text-slate-200 hover:text-rose-300'}`}
          >
            <Heart size={isCompact ? 16 : isLarge ? 24 : 20} fill={item.favorit ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className={`leading-normal font-black transition-colors leading-tight line-clamp-2 ${
          isCompact ? 'text-[0.875rem]' : isLarge ? 'text-[1.1875rem]' : 'text-[1rem]'
        } ${isDarkHover ? 'text-slate-800 group-hover:text-white' : 'text-slate-800 group-hover:text-indigo-650'}`}>
          {item.titel}
        </h3>
        {item.quelleModul === 'uebergabemappe' && (
          <div className={`flex items-center gap-1 mt-1 font-black uppercase tracking-tighter text-indigo-400 bg-indigo-50/50 w-fit rounded-full border border-indigo-100/50 ${
            isCompact ? 'px-1.5 py-0.5 text-[0.5rem]' : isLarge ? 'px-2.5 py-0.5 text-[0.625rem]' : 'px-2 py-0.5 text-[0.5625rem]'
          }`}>
            <ClipboardList size={isCompact ? 8 : isLarge ? 12 : 10} />
            Aus Übergabemappe
          </div>
        )}
        <p className={`font-medium line-clamp-2 transition-colors ${
          isCompact ? 'text-[0.625rem]' : isLarge ? 'text-[0.8125rem]' : 'text-[0.6875rem]'
        } ${isDarkHover ? 'text-slate-400 group-hover:text-zinc-350' : 'text-slate-400'}`}>{item.beschreibung}</p>
      </div>

      {item.typ === 'datei' && item.dateiTyp?.startsWith('image/') && item.dateiInhalt && (
        <div className={`aspect-video w-full rounded-2xl bg-slate-50 border border-slate-100`}>
          <img src={item.dateiInhalt} alt={item.titel} className="w-full h-full object-cover" />
        </div>
      )}

      <div className={`mt-auto pt-3 border-t transition-colors ${isDarkHover ? 'border-slate-50 group-hover:border-zinc-700' : 'border-slate-50'} space-y-3`}>
        <div className="flex flex-wrap gap-1.5">
          {item.faecher.slice(0, 2).map(f => (
            <span key={f} className={`font-black uppercase tracking-wider transition-colors ${
              isCompact ? 'px-1.5 py-0.5 text-[0.5rem]' : isLarge ? 'px-3 py-1 text-[0.6875rem]' : 'px-2 py-0.5 text-[0.5625rem]'
            } ${isDarkHover ? 'bg-slate-50 text-slate-500 group-hover:bg-zinc-700 group-hover:text-zinc-200' : 'bg-slate-50 text-slate-500'}`}>{f}</span>
          ))}
          {item.faecher.length > 2 && <span className={`font-bold transition-colors ${
            isCompact ? 'text-[0.5rem]' : isLarge ? 'text-[0.6875rem]' : 'text-[0.5625rem]'
          } ${isDarkHover ? 'text-slate-400 group-hover:text-zinc-400' : 'text-slate-400'}`}>+{item.faecher.length - 2}</span>}
        </div>
        <div className="flex items-center justify-between">
           <div className={`flex ${isCompact ? 'gap-0.5' : isLarge ? 'gap-1.5' : 'gap-1'}`}>
              {item.schulstufen.map(s => <span key={s} className={`bg-indigo-50 text-indigo-800 flex items-center justify-center font-black ${
                isCompact ? 'w-4 h-4 rounded text-[0.5rem]' : isLarge ? 'w-6 h-6 rounded-lg text-[0.6875rem]' : 'w-5 h-5 rounded-md text-[0.5625rem]'
              }`}>{s}</span>)}
           </div>
           {item.kiGeneriert && <Sparkles size={isCompact ? 10 : isLarge ? 14 : 12} className="text-emerald-500" />}
        </div>
      </div>
    </motion.div>
  );
}

function AddMaterialModal({ onClose, onSave, initialData }: { onClose: () => void; onSave: (item: MaterialItem) => void; initialData?: MaterialItem }) {
  const { app } = useApp();
  const [step, setStep] = useState(initialData ? 'details' : 'type');
  const [typ, setTyp] = useState<MaterialItem['typ']>(initialData?.typ || 'datei');
  const [formData, setFormData] = useState<Partial<MaterialItem>>(initialData || {
    titel: '',
    beschreibung: '',
    faecher: [],
    schulstufen: [],
    tags: [],
    favorit: false,
    kiGeneriert: false,
    quelleModul: 'manuell'
  });
  
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File) => {
    setFileError(null);
    setFileWarning(null);

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 3) {
      setFileError("Datei zu groß (> 3MB). Bitte verkleinere die Datei.");
      return;
    }
    if (sizeMB > 1) {
      setFileWarning("Hinweis: Datei ist über 1 MB groß. Das kann den Speicher schnell füllen.");
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        dateiName: file.name,
        dateiTyp: file.type,
        dateiInhalt: reader.result as string,
        titel: prev.titel || file.name.split('.')[0]
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    processFile(file);
  };

  // AI Generator States
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiFach, setAiFach] = useState('');
  const [aiThema, setAiThema] = useState('');
  const [aiStufe, setAiStufe] = useState(1);
  const [aiArt, setAiArt] = useState('Lesetext');
  const [aiDiff, setAiDiff] = useState(false);

  const handleGenerateAI = async () => {
    if (!aiThema || !aiFach) {
      alert("Bitte Thema und Fach angeben.");
      return;
    }
    setIsGenerating(true);
    const content = await generateTeachingMaterial(aiFach, aiThema, aiStufe, aiArt, aiDiff);
    setIsGenerating(false);
    if (content) {
      setFormData(prev => ({
        ...prev,
        titel: `${aiArt}: ${aiThema}`,
        beschreibung: `KI-generiert für ${aiStufe}. Stufe (${aiArt})`,
        inhaltText: content,
        faecher: [aiFach],
        schulstufen: [aiStufe],
        kiGeneriert: true,
        tags: ['KI', aiArt]
      }));
      setTyp('notiz'); // or a fitting type like 'sonstiges'
      setStep('details');
    } else {
      alert("Fehler bei der KI-Generierung.");
    }
  };

  const handleSave = () => {
    if (!formData.titel || !typ) {
      alert("Bitte Titel angeben.");
      return;
    }

    let finalLink = formData.externerLink;
    if (typ === 'link' && finalLink) {
      if (!finalLink.startsWith('http://') && !finalLink.startsWith('https://')) {
        finalLink = 'https://' + finalLink;
      }
      try {
        new URL(finalLink);
      } catch (e) {
        alert("Ungültige URL");
        return;
      }
    }

    const finalItem: MaterialItem = {
      ...formData as MaterialItem,
      id: initialData?.id || `mat-${Date.now()}`,
      typ,
      externerLink: finalLink,
      erstelltAm: initialData?.erstelltAm || new Date().toISOString(),
      faecher: formData.faecher || [],
      schulstufen: formData.schulstufen || [],
      tags: formData.tags || [],
      favorit: !!formData.favorit,
      kiGeneriert: !!formData.kiGeneriert,
      // Ensure inhaltText contains summary for stundenentwurf if fields are present
      inhaltText: (typ === 'stundenentwurf' && formData.lernziel) 
        ? `Lernziel: ${formData.lernziel}\n\nMaterial: ${formData.benoetigtesMaterial?.join(', ') || '-'}\n\nAblauf:\n${formData.inhaltText || ''}`
        : formData.inhaltText
    };
    onSave(finalItem);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-dialog-title"
        className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl  flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 id="material-dialog-title" className="text-[1.25rem] leading-normal font-black text-slate-800">
            {initialData ? 'Material bearbeiten' : step === 'type' ? 'Neues Material erstellen' : 'Details eingeben'}
          </h3>
          <button type="button" onClick={onClose} aria-label="Materialdialog schließen" title="Schließen" className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 flex-1">
          {step === 'type' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TypeSelectionCard 
                icon={<Upload size={24} />} 
                label="Datei hochladen" 
                desc="Bilder oder PDF" 
                color="bg-blue-50 text-blue-600"
                onClick={() => { setTyp('datei'); setStep('details'); }} 
              />
              <TypeSelectionCard 
                icon={<LinkIcon size={24} />} 
                label="Externen Link einfügen" 
                desc="Webseiten / Videos" 
                color="bg-emerald-50 text-emerald-600"
                onClick={() => { setTyp('link'); setStep('details'); }} 
              />
              <TypeSelectionCard 
                icon={<FileText size={24} />} 
                label="Eigene Notiz oder Inhalt" 
                desc="Text / Entwürfe" 
                color="bg-indigo-50 text-indigo-600"
                onClick={() => { setTyp('notiz'); setStep('details'); }} 
              />
              <TypeSelectionCard 
                icon={<Wand2 size={24} />} 
                label="Von KI generieren" 
                desc="Lesetexte, Übungen..." 
                color="bg-fuchsia-50 text-fuchsia-600"
                onClick={() => { setStep('ai-generator'); }} 
              />
            </div>
          ) : step === 'ai-generator' ? (
            <div className="space-y-6">
              <button 
                onClick={() => setStep('type')}
                className="flex items-center gap-1.5 text-slate-500 font-bold text-[0.6875rem] hover:text-slate-700 transition-colors uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Zurück zur Auswahl
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-fuchsia-100 text-fuchsia-600 rounded-2xl flex items-center justify-center">
                  <Wand2 size={24} />
                </div>
                <div>
                  <h4 className="text-[1.125rem] leading-normal font-black text-slate-800">KI-Inhaltsgenerator</h4>
                  <p className="text-[0.75rem] leading-tight font-bold text-slate-400">Erstelle passgenaues Unterrichtsmaterial in Sekunden.</p>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400">Fach *</label>
                    <select 
                      value={aiFach}
                      onChange={e => setAiFach(e.target.value)}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-fuchsia-500 outline-none cursor-pointer"
                    >
                      <option value="">Auswählen...</option>
                      {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400">Stufe *</label>
                    <select 
                      value={aiStufe}
                      onChange={e => setAiStufe(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-fuchsia-500 outline-none cursor-pointer"
                    >
                      {[1,2,3,4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400">Thema * (z.B. Waldtiere, Bruchrechnen...)</label>
                  <input 
                    type="text"
                    value={aiThema}
                    onChange={e => setAiThema(e.target.value)}
                    placeholder="Bruchrechnen, Waldtiere, Magnetismus..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-fuchsia-500 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400">Art des Materials</label>
                  <select 
                    value={aiArt}
                    onChange={e => setAiArt(e.target.value)}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-fuchsia-500 outline-none cursor-pointer"
                  >
                    <option value="Lesetext">Lesetext</option>
                    <option value="Lückentext">Lückentext</option>
                    <option value="Übungsaufgaben / Arbeitsblatt">Übungsaufgaben / Arbeitsblatt</option>
                    <option value="Quiz-Fragen">Quiz-Fragen</option>
                    <option value="Sach- bzw. Textaufgabe (Mathematik)">Sach- bzw. Textaufgabe</option>
                    <option value="Rollenspiel-Szenario">Rollenspiel-Szenario</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-fuchsia-600 rounded bg-slate-200 border-none" 
                      checked={aiDiff}
                      onChange={e => setAiDiff(e.target.checked)}
                    />
                    <div>
                      <div className="text-[0.875rem] leading-snug font-black text-slate-800 tracking-tight">Kognitive Differenzierung aktiv</div>
                      <div className="text-[0.625rem] font-medium text-slate-500">Erstellt 3 Varianten (Leicht, Mittel, Anspruchsvoll) in einem Dokument.</div>
                    </div>
                  </label>
                </div>
                
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiThema || !aiFach}
                  className="w-full h-14 mt-4 bg-fuchsia-600 hover:bg-fuchsia-700 disabled:opacity-50 text-white rounded-2xl font-black shadow-lg shadow-fuchsia-200 transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                  {isGenerating ? 'Generiere Material...' : 'Material jetzt generieren'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!initialData && (
                <button 
                  onClick={() => setStep('type')}
                  className="flex items-center gap-1.5 text-indigo-500 font-bold text-[0.75rem] leading-tight mb-2 hover:text-indigo-700 transition-colors"
                >
                  <ArrowLeft size={14} /> Zurück zur Auswahl
                </button>
              )}
              {typ === 'datei' && (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-8 border-2 border-dashed rounded-3xl text-center space-y-4 transition-all group relative ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-50/55 scale-[1.01] ring-4 ring-indigo-500/10' 
                      : 'border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50/50 hover:border-indigo-400'
                  }`}
                >
                  <input type="file" accept="image/*,application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" id="file-upload" onChange={handleFileChange} />
                  <div className="pointer-events-none">
                    <div className={`w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:scale-110 transition-transform ${isDragging ? 'animate-bounce text-indigo-600' : 'text-indigo-500'}`}>
                       <UploadCloud size={32} />
                    </div>
                    <p className="text-[0.875rem] leading-snug font-black text-indigo-900">
                      {isDragging ? 'Datei hier loslassen!' : 'Datei auswählen oder hierher ziehen'}
                    </p>
                    <p className="text-[0.75rem] leading-tight text-indigo-500/80 font-medium mt-1">JPG, PNG, GIF, PDF (max 3 MB)</p>
                  </div>
                  {formData.dateiName && (
                    <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl text-[0.75rem] leading-tight font-bold pointer-events-none">
                       <FileText size={14} /> {formData.dateiName}
                    </div>
                  )}
                  {fileError && <p className="text-[0.75rem] leading-tight font-bold text-rose-500 mt-2">{fileError}</p>}
                  {fileWarning && <p className="text-[0.75rem] leading-tight font-bold text-amber-500 mt-2">{fileWarning}</p>}
                </div>
              )}

              {typ === 'link' && (
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400">URL / Link</label>
                  <input 
                    type="url"
                    placeholder="https://..."
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.externerLink || ''}
                    onChange={e => setFormData(prev => ({ ...prev, externerLink: e.target.value }))}
                  />
                </div>
              )}

              {(typ !== 'datei' && typ !== 'link') && (
                <div className="space-y-3">
                   <div className="space-y-1 text-[0.75rem] leading-tight">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400">Inhalts-Art</label>
                      <div className="flex flex-wrap gap-2">
                        {['stundenentwurf', 'notfallplan', 'elternbrief', 'beurteilung', 'reflexion', 'notiz', 'sonstiges'].map(t => (
                          <button
                            key={t}
                            onClick={() => setTyp(t as any)}
                            className={`px-4 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest border transition-all ${typ === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100'}`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                   </div>

                   {typ === 'stundenentwurf' && (
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Dauer (Min)</label>
                          <input 
                            type="number" 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.dauer || ''}
                            onChange={e => setFormData(prev => ({ ...prev, dauer: parseInt(e.target.value) }))}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Schwierigkeit</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            value={formData.schwierigkeit || 'mittel'}
                            onChange={e => setFormData(prev => ({ ...prev, schwierigkeit: e.target.value as any }))}
                          >
                            <option value="einfach">Einfach</option>
                            <option value="mittel">Mittel</option>
                            <option value="anspruchsvoll">Anspruchsvoll</option>
                          </select>
                       </div>
                       <div className="col-span-2 space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Lernziel</label>
                          <input 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.lernziel || ''}
                            onChange={e => setFormData(prev => ({ ...prev, lernziel: e.target.value }))}
                          />
                       </div>
                       <div className="col-span-2 space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Material (Kommata)</label>
                          <input 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.benoetigtesMaterial?.join(', ') || ''}
                            onChange={e => setFormData(prev => ({ ...prev, benoetigtesMaterial: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                          />
                       </div>
                     </div>
                   )}

                   <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400">{typ === 'stundenentwurf' ? 'Ablauf' : 'Inhalt'}</label>
                      <textarea 
                        className="w-full h-40 p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                        placeholder={typ === 'stundenentwurf' ? 'Einstieg: ...\nArbeitsphase: ...\nReflexion: ...' : 'Text hier eingeben...'}
                        value={formData.inhaltText || ''}
                        onChange={e => setFormData(prev => ({ ...prev, inhaltText: e.target.value }))}
                      />
                   </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400">Titel *</label>
                  <input 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={formData.titel || ''}
                    onChange={e => setFormData(prev => ({ ...prev, titel: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400">Tags (Kommata)</label>
                  <input 
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Wort1, Wort2..."
                    value={formData.tags?.join(', ') || ''}
                    onChange={e => setFormData(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-400">Beschreibung</label>
                <input 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={formData.beschreibung || ''}
                  onChange={e => setFormData(prev => ({ ...prev, beschreibung: e.target.value }))}
                />
              </div>

              {/* Lehrplanbezug (Optional) */}
              <div className="space-y-1">
                <label className="text-[0.625rem] font-black uppercase text-slate-400 flex items-center gap-2"><BookOpen size={12} /> Lehrplanbezug (Optional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                   <select
                     value={formData.lehrplanZuordnung?.fach || ''}
                     onChange={e => setFormData(prev => ({
                        ...prev, 
                        lehrplanZuordnung: { fach: e.target.value, kompetenzbereichId: '', anwendungsbereichIds: [] }
                     }))}
                     className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                   >
                      <option value="">Kein Fach gewählt</option>
                      {Object.keys(LEHRPLAN_VS_2023).map(f => (
                         <option key={f} value={f}>{f}</option>
                      ))}
                   </select>

                   {formData.lehrplanZuordnung?.fach && (
                      <select
                        value={formData.lehrplanZuordnung?.kompetenzbereichId || ''}
                        onChange={e => setFormData(prev => ({
                           ...prev,
                           lehrplanZuordnung: prev.lehrplanZuordnung ? { ...prev.lehrplanZuordnung, kompetenzbereichId: e.target.value } : undefined
                        }))}
                        className="w-full p-4 bg-slate-50 border-none rounded-2xl text-[0.875rem] leading-snug font-medium outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500"
                      >
                         <option value="">Kompetenzbereich wählen...</option>
                         {(LEHRPLAN_VS_2023[formData.lehrplanZuordnung.fach || '']?.[app.stufe || 1] || []).map(kb => (
                            <option key={kb.id} value={kb.id}>{kb.titel}</option>
                         ))}
                      </select>
                   )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                 <div className="space-y-2">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400">Fächer</label>
                    <div className="flex flex-wrap gap-1.5 h-32 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-white shadow-inner custom-scrollbar">
                       {FAECHER_ALLE.map(f => (
                         <button
                           key={f}
                           onClick={() => {
                             const cur = formData.faecher || [];
                             setFormData(prev => ({ ...prev, faecher: cur.includes(f) ? cur.filter(x => x !== f) : [...cur, f] }));
                           }}
                           className={`px-3 py-1.5 rounded-xl text-[0.625rem] font-bold border transition-all ${formData.faecher?.includes(f) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-100'}`}
                         >
                           {f}
                         </button>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400">Schulstufen</label>
                    <div className="flex gap-2">
                       {[1, 2, 3, 4].map(s => (
                         <button
                           key={s}
                           onClick={() => {
                             const cur = formData.schulstufen || [];
                             setFormData(prev => ({ ...prev, schulstufen: cur.includes(s) ? cur.filter(x => x !== s) : [...cur, s] }));
                           }}
                           className={`w-12 h-12 rounded-2xl text-[0.75rem] leading-tight font-black border transition-all ${formData.schulstufen?.includes(s) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button onClick={onClose} className="flex-1 px-4 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold">Abbrechen</button>
          {step === 'details' && (
            <button 
              onClick={handleSave} 
              className="flex-1 px-4 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:scale-[1.02] transition-transform"
            >
              Speichern
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function TypeSelectionCard({ icon, label, desc, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-6 rounded-[2rem] border border-slate-100 bg-white hover:border-indigo-200 transition-all text-center space-y-3 group shadow-sm hover:shadow-xl`}
    >
      <div className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-[0.875rem] leading-snug font-black text-slate-800">{label}</div>
        <div className="text-[0.6875rem] text-slate-400">{desc}</div>
      </div>
    </button>
  );
}

function MaterialDetailModal({ item, onClose, onDelete, onToggleFavorit, onMarkUsed, onSendToWeekPlan, onEdit }: any) {
  const { app } = useApp();
  const getSafeLink = (url?: string) => {
    if (!url) return '';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  };

  const handleOpenPdf = () => {
    if (item.dateiInhalt) {
      const win = window.open();
      if (win) {
         win.document.write(`<iframe src="${item.dateiInhalt}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  const handleDownload = () => {
    if (item.dateiInhalt && item.dateiName) {
      const link = document.createElement('a');
      link.href = item.dateiInhalt;
      link.download = item.dateiName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyClipboard = () => {
    if (item.inhaltText) {
      navigator.clipboard.writeText(item.inhaltText);
      alert("In die Zwischenablage kopiert!");
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
       <motion.div 
         initial={{ opacity: 0, scale: 0.9, y: 30 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.9, y: 30 }}
         className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl  flex flex-col max-h-[95vh]"
       >
         <div className="p-8 pb-4 flex justify-between items-start">
            <div className="space-y-1">
               <div className="flex items-center gap-3">
                 <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[0.625rem] font-black uppercase tracking-wider">{item.typ}</span>
                 {item.kiGeneriert && <span className="flex items-center gap-1 text-[0.625rem] font-black text-emerald-500 uppercase"><Sparkles size={12} /> KI Generiert</span>}
               </div>
               <h2 className="text-[1.875rem] leading-tight font-black text-slate-800 tracking-tight leading-none pt-2">{item.titel}</h2>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={onToggleFavorit} className={`p-3 rounded-full transition-all ${item.favorit ? 'text-rose-500 bg-rose-50' : 'text-slate-200 hover:text-rose-300 bg-slate-50'}`}><Heart size={24} fill={item.favorit ? "currentColor" : "none"} /></button>
               <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
            </div>
         </div>

         <div className="p-8 pt-4 overflow-y-auto space-y-8 flex-1">
            <div className="flex flex-wrap gap-6 text-[0.6875rem] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-6">
               <div className="flex flex-col gap-1">
                  <span>Schulstufen</span>
                  <div className="flex gap-1">
                    {item.schulstufen.map((s: number) => <span key={s} className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">{s}</span>)}
                  </div>
               </div>
               <div className="flex flex-col gap-1">
                  <span>Fächer</span>
                  <div className="flex gap-2">
                    {item.faecher.map((f: string) => <span key={f} className="px-3 py-1 bg-slate-50 text-slate-600 rounded-lg">{f}</span>)}
                  </div>
               </div>
               <div className="flex flex-col gap-1">
                  <span>Erstellt am</span>
                  <span className="text-slate-700 pt-1">{new Date(item.erstelltAm).toLocaleDateString('de-DE')}</span>
               </div>
               {item.zuletztVerwendet && (
                 <div className="flex flex-col gap-1">
                    <span>Zuletzt verwendet</span>
                    <span className="text-emerald-500 pt-1 flex items-center gap-1"><Check size={12} /> {new Date(item.zuletztVerwendet).toLocaleDateString('de-DE')}</span>
                 </div>
               )}
               {item.lehrplanZuordnung?.fach && (
                 <div className="flex flex-col gap-1">
                    <span>Lehrplanbezug</span>
                    <span className="text-indigo-600 pt-1 font-bold flex flex-col">
                       {item.lehrplanZuordnung.fach} &rarr; {
                          (() => {
                            const fachData = LEHRPLAN_VS_2023[item.lehrplanZuordnung!.fach];
                            if (!fachData) return 'Allgemein';
                            const currentStufe = app.stufe || 1;
                            let kb = fachData[currentStufe]?.find(k => k.id === item.lehrplanZuordnung!.kompetenzbereichId);
                            if (!kb) {
                              for (const st of [1, 2, 3, 4]) {
                                kb = fachData[st]?.find(k => k.id === item.lehrplanZuordnung!.kompetenzbereichId);
                                if (kb) break;
                              }
                            }
                            return kb?.titel || 'Allgemein';
                          })()
                        }
                    </span>
                 </div>
               )}
            </div>

            {item.typ === 'datei' && (
              <div className="space-y-6">
                {item.dateiTyp?.startsWith('image/') && item.dateiInhalt && (
                  <div className="rounded-3xl  border border-slate-100 shadow-sm bg-slate-50">
                    <img src={item.dateiInhalt} alt={item.titel} className="w-full h-auto max-h-[500px] object-contain" />
                  </div>
                )}
                <div className="flex flex-wrap gap-4">
                  {item.dateiTyp === 'application/pdf' && (
                    <button onClick={handleOpenPdf} className="btn bg-indigo-600 text-white px-8 h-12 flex items-center gap-2"><ExternalLink size={18} /> PDF in neuem Tab öffnen</button>
                  )}
                  <button onClick={handleDownload} className="btn border border-slate-200 text-slate-600 px-8 h-12 flex items-center gap-2"><Download size={18} /> Datei herunterladen</button>
                </div>
              </div>
            )}

            {item.typ === 'link' && item.externerLink && (
              <div className="p-10 bg-emerald-50 rounded-[3rem] text-center space-y-6">
                <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mx-auto text-emerald-500 shadow-sm">
                  <LinkIcon size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-[1.25rem] leading-normal font-black text-emerald-900">Externer Link</h3>
                  <p className="text-emerald-700 font-medium opacity-70 underline text-wrap leading-tight break-words px-10">{item.externerLink}</p>
                </div>
                <a 
                  href={getSafeLink(item.externerLink)} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn bg-emerald-600 text-white px-10 h-14 inline-flex items-center gap-2 shadow-xl shadow-emerald-100"
                >
                  <ExternalLink size={20} />
                  Link in neuem Tab öffnen
                </a>
              </div>
            )}

            {item.inhaltText && (
              <div className="space-y-6">
                 <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 whitespace-pre-wrap text-[1.125rem] leading-normal font-medium text-slate-800 leading-relaxed printable-content overflow-x-hidden markdown-body">
                    <ReactMarkdown>{item.inhaltText}</ReactMarkdown>
                 </div>
                 <div className="flex flex-wrap gap-4 no-print">
                    <button onClick={handleCopyClipboard} className="btn border border-slate-200 text-slate-600 px-8 h-12 flex items-center gap-2"><Copy size={18} /> Kopieren</button>
                    
                 </div>
              </div>
            )}

            <section className="space-y-3 pb-10">
               <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-widest">Beschreibung</h4>
               <p className="text-slate-600 font-medium leading-relaxed">{item.beschreibung || 'Keine Beschreibung vorhanden.'}</p>
               <div className="flex flex-wrap gap-2 pt-2">
                  {item.tags.map((t: string) => <span key={t} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[0.75rem] leading-tight font-bold">#{t}</span>)}
               </div>
            </section>
         </div>

         <div className="p-8 pt-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-3 no-print">
            <button onClick={onSendToWeekPlan} className="btn bg-indigo-600 text-white flex items-center gap-2 px-6 h-14"><ClipboardList size={20} /> In Wochenplan</button>
            <button onClick={onMarkUsed} className="btn bg-emerald-600 text-white flex items-center gap-2 px-6 h-14"><Check size={20} /> Als verwendet markieren</button>
            <button onClick={onEdit} className="btn bg-white border border-slate-200 text-slate-600 flex items-center gap-2 px-6 h-14"><Edit3 size={20} /> Bearbeiten</button>
            <button onClick={onDelete} className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all ml-auto"><Trash2 size={24} /></button>
         </div>
       </motion.div>

       {/* Print Version for Text Content */}
       {item.inhaltText && (
          <div className="hidden print:block fixed inset-0 bg-white text-black p-[2cm] z-[1000] overflow-visible">
             <div className="border-b-4 border-black pb-4 mb-8">
                <span className="text-[0.75rem] leading-tight font-black uppercase text-stone-400 tracking-widest">{item.typ}</span>
                <h1 className="text-4xl font-black uppercase leading-tight mt-1">{item.titel}</h1>
                <div className="flex gap-4 mt-2 text-[10pt] font-bold">
                   <span>Fächer: {item.faecher.join(', ')}</span>
                   <span>•</span>
                   <span>Stufen: {item.schulstufen.join(', ')}</span>
                </div>
                {item.tags.length > 0 && <div className="text-[9pt] font-medium text-stone-500 mt-1 italic">#{item.tags.join(' #')}</div>}
             </div>
             <div className="whitespace-pre-wrap text-[12pt] leading-relaxed font-sans">
                {item.inhaltText}
             </div>
          </div>
       )}
    </div>
  );
}

// Utility export for Step 8

function getIsoWeekNumber(date = new Date()): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function MaterialToWeekPlanModal({ item, onClose }: { item: MaterialItem; onClose: () => void }) {
  const { app, setApp, setPage } = useApp();
  const [kw, setKw] = useState(getIsoWeekNumber());
  const [day, setDay] = useState('Montag');
  const [hour, setHour] = useState(1);
  const [mode, setMode] = useState<'append' | 'replace'>('append');

  const days = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
  const availableHours = useMemo(() => {
    const configured = Object.keys((app.stammplan as any)?.[day] || {})
      .map(Number)
      .filter(value => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    return configured.length > 0 ? configured : [1, 2, 3, 4, 5, 6, 7, 8];
  }, [app.stammplan, day]);

  useEffect(() => {
    if (!availableHours.includes(hour)) setHour(availableHours[0] || 1);
  }, [availableHours, hour]);

  const existing = (app.wochenplanung as any)?.[kw]?.[day]?.[hour - 1] || {};
  const existingMaterialIds = Array.isArray(existing.materialIds) ? existing.materialIds : [];
  const alreadyLinked = existingMaterialIds.includes(item.id);

  const save = () => {
    setApp(prev => {
      const wochenplanung = { ...(prev.wochenplanung || {}) } as any;
      const week = { ...(wochenplanung[kw] || {}) } as any;
      const dayPlan = { ...(week[day] || {}) } as any;
      const index = hour - 1;
      const slot = { ...(dayPlan[index] || {}) } as any;
      const currentIds = Array.isArray(slot.materialIds) ? slot.materialIds : [];
      const materialIds = mode === 'replace'
        ? [item.id]
        : Array.from(new Set([...currentIds, item.id]));

      dayPlan[index] = {
        ...slot,
        fach: slot.fach || (prev.stammplan as any)?.[day]?.[hour] || item.faecher?.[0] || '',
        material: mode === 'replace' ? '' : (slot.material || ''),
        materialIds,
      };
      week[day] = dayPlan;
      wochenplanung[kw] = week;

      return {
        ...prev,
        wochenplanung,
        materialien: (prev.materialien || []).map(material =>
          material.id === item.id
            ? { ...material, zuletztVerwendet: new Date().toISOString() }
            : material
        ),
      };
    });

    onClose();
    setPage('wochenplanung');
  };

  return (
    <div className="fixed inset-0 z-[270] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        className="w-full max-w-lg rounded-[2rem] bg-white shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-500">Material → Wochenplan</div>
            <h3 className="mt-1 text-xl font-black text-slate-900">{item.titel}</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <label className="space-y-1.5">
              <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">KW</span>
              <input
                type="number"
                min={1}
                max={53}
                value={kw}
                onChange={event => setKw(Math.min(53, Math.max(1, Number(event.target.value) || 1)))}
                className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Tag</span>
              <select value={day} onChange={event => setDay(event.target.value)} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 bg-white">
                {days.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <label className="space-y-1.5">
              <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Stunde</span>
              <select value={hour} onChange={event => setHour(Number(event.target.value))} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-800 bg-white">
                {availableHours.map(value => <option key={value} value={value}>{value}.</option>)}
              </select>
            </label>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
            <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Zielstunde</div>
            <div className="mt-1 text-sm font-black text-slate-800">{existing.fach || (app.stammplan as any)?.[day]?.[hour] || 'Noch kein Fach eingetragen'}</div>
            <div className="mt-1 text-xs text-slate-500">{existing.thema || 'Noch kein Thema eingetragen'}</div>
            {alreadyLinked && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[0.6875rem] font-bold text-emerald-700">
                <Check size={13} /> Dieses Material ist bereits verknüpft – es wird nicht doppelt gespeichert.
              </div>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 mb-2">Übernahme</legend>
            <label className="flex gap-3 p-3.5 rounded-2xl border border-slate-200 cursor-pointer">
              <input type="radio" name="materialTransferMode" checked={mode === 'append'} onChange={() => setMode('append')} />
              <span>
                <strong className="block text-sm text-slate-900">Ergänzen</strong>
                <span className="block text-xs text-slate-500 mt-0.5">Vorhandene Materialien bleiben; dieses Material kommt einmalig dazu.</span>
              </span>
            </label>
            <label className="flex gap-3 p-3.5 rounded-2xl border border-slate-200 cursor-pointer">
              <input type="radio" name="materialTransferMode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span>
                <strong className="block text-sm text-slate-900">Ersetzen</strong>
                <span className="block text-xs text-slate-500 mt-0.5">Nur die Materialzuordnung dieser Stunde wird ersetzt; Fach, Thema und übrige Planung bleiben erhalten.</span>
              </span>
            </label>
          </fieldset>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold">Abbrechen</button>
          <button type="button" onClick={save} className="h-12 flex-1 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center gap-2">
            <ClipboardList size={17} /> In Wochenplan übernehmen
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function useMaterialLibrary() {
  const { setApp } = useApp();
  
  const addMaterialFromAI = (item: Partial<MaterialItem>, quelleModul: string = 'ki-helfer') => {
    const newItem: MaterialItem = {
      id: item.id || `ai-${Date.now()}`,
      titel: item.titel || 'KI Generiertes Material',
      beschreibung: item.beschreibung || '',
      typ: item.typ || 'stundenentwurf',
      faecher: item.faecher || [],
      schulstufen: item.schulstufen || [],
      tags: item.tags || [],
      erstelltAm: new Date().toISOString(),
      favorit: false,
      kiGeneriert: true,
      quelleModul,
      inhaltText: item.inhaltText,
      externerLink: item.externerLink,
    };

    setApp(prev => ({
      ...prev,
      materialien: [...(prev.materialien || []), newItem]
    }));
  };

  return { addMaterialFromAI };
}
