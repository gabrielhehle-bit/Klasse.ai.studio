
import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, FileText, Printer, Eye, EyeOff, X, Check, Users, Layout, Book,
  Calendar, CalendarRange, CalendarDays, LifeBuoy, Zap, Clock, Sparkles, Search, Plus, BookOpen,
  Filter, ArrowUpDown, ChevronRight, Trash2, Edit3, Heart, History, User, BarChart3, FileCheck, Activity, Star, Map as MapIcon, ArrowLeft, RefreshCw, ShieldAlert
} from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';
import { TAGE_NAMEN, STUNDEN_INFO, FAECHER_ALLE, LESSON_SLOT_NUMBERS } from '../constants';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import { VertretungsStundenbild, VORLAGEN_VERTRETUNGSSTUNDEN } from '../types';
import { createMaterialItemFromStundenbild, migrateStundenbilderToMaterialien } from '../utils/materialienUtils';
import { askAI } from '../services/aiService';
import { getSW } from '../lib/utils';
import { berechne, getAssessmentMode } from '../lib/GradeUtils';
import { getDiagnosticTestById } from '../lib/diagnosticCoreUtils';
import { formatTransferGradeValue, getHandoverLessonPlans, getHandoverLessonTime } from '../lib/handoverUtils';
import { calculateMaterialStorageSize, MATERIAL_LIBRARY_MAX_MB, removeMaterialReferencesFromClasses, removeMaterialReferencesFromWeeklyPlan, upsertMaterial } from '../lib/materialLibraryUtils';
import Markdown from 'react-markdown';

// Help functions for date handling
function getISOWeek(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
}

function getDayName(date: Date) {
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  return days[date.getDay()];
}

function formatDate(date: Date) {
  return date.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Uebergabemappe() {
  const { app, setApp, setPage } = useApp();
  const [activeTab, setActiveTab] = useState<'config' | 'manage' | 'transfer'>('config');
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [transferStudentId, setTransferStudentId] = useState<string | null>(null);
  const [showTransferPrint, setShowTransferPrint] = useState(false);
  
  // One-time migration of the former handover lesson-plan collection into the shared material library.
  useEffect(() => {
    if (app.stundenbilderMigriert) return;
    setApp(prev => {
      const legacyLessonPlans =
        prev.vertretungsStundenbilder && prev.vertretungsStundenbilder.length > 0
          ? prev.vertretungsStundenbilder
          : VORLAGEN_VERTRETUNGSSTUNDEN;
      const migrationState = {
        ...prev,
        vertretungsStundenbilder: legacyLessonPlans,
      };
      return {
        ...migrationState,
        materialien: migrateStundenbilderToMaterialien(migrationState),
        stundenbilderMigriert: true,
      };
    });
  }, [app.stundenbilderMigriert, setApp]);

  // Trigger print configuration modal automatically if requested from Print Center
  useEffect(() => {
    if (app.openPrintModalOnLoad) {
      setShowPrintModal(true);
      setApp(prev => ({
        ...prev,
        openPrintModalOnLoad: false
      }));
    }
  }, [app.openPrintModalOnLoad]);

  // --- TAB 1: Config & Assignment State ---
  const [rangeMode, setRangeMode] = useState<'single' | 'multi' | 'week'>('single');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [weekDate, setWeekDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Assignments: Key is "YYYY-MM-DD-Std", Value is Stundenbild ID
  const [assignedStundenbilder, setAssignedStundenbilder] = useState<Record<string, string>>({});

  const [printLehrplan, setPrintLehrplan] = useState(false);
  const [printNotes, setPrintNotes] = useState(app.vertretungHinweise || '');
  
  // --- TAB 2: Management State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFach, setFilterFach] = useState('');
  const [filterStufe, setFilterStufe] = useState<number | ''>('');
  const [filterDauer, setFilterDauer] = useState<number | ''>('');
  const [filterSchwierigkeit, setFilterSchwierigkeit] = useState('');
  const [sortBy, setSortBy] = useState<'used' | 'date' | 'title'>('used');
  
  // --- UI/UX improvements state variables ---
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedTag, setSelectedTag] = useState('');
  const [transferModules, setTransferModules] = useState({
    stammdaten: true,
    leistungen: true,
    beobachtungen: true,
    ikm: true,
    diagnostik: true
  });
  
  const [emergencyChecklist, setEmergencyChecklist] = useState([
    { id: '1', text: 'Klassenzimmer-Schlüssel beim Schulwart hinterlegt', checked: false },
    { id: '2', text: 'Klassendienste (Tafeldienst etc.) zugeteilt', checked: false },
    { id: '3', text: 'Allergie- & Notfallkontaktliste liegt sichtbar am Lehrertisch', checked: false },
    { id: '4', text: 'Pausenregeln und Aufsichtszeiten kurz notiert', checked: false },
    { id: '5', text: 'Arbeitsblätter & Handreichungen kopiert und bereitgelegt', checked: false },
    { id: '6', text: 'Zugangsdaten / Logins für Schul-Tablets & WLAN vermerkt', checked: false }
  ]);
  const [newChecklistItem, setNewChecklistItem] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editingStundenbild, setEditingStundenbild] = useState<Partial<VertretungsStundenbild> | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [selectedStundenbild, setSelectedStundenbild] = useState<VertretungsStundenbild | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSinglePrint, setShowSinglePrint] = useState(false);

  const lessonPlans = useMemo(
    () => getHandoverLessonPlans(app.materialien),
    [app.materialien],
  );

  // Popular tags computed dynamically from material list + fallbacks
  const popularTags = useMemo(() => {
    const allTags = lessonPlans.flatMap(s => s.tags || []);
    const counts: Record<string, number> = {};
    allTags.forEach(tag => {
      counts[tag] = (counts[tag] || 0) + 1;
    });
    const dynamic = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
    const defaults = ["Spiele", "Einstieg", "Kreativ", "Bewegung", "Rätsel", "Partnerarbeit", "Lesen", "Rechnen", "Gruppe"];
    const merged = Array.from(new Set([...dynamic, ...defaults])).slice(0, 10);
    return merged;
  }, [lessonPlans]);

  // Filtered and Sorted list
  const filteredStundenbilder = useMemo(() => {
    let list = [...lessonPlans];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.titel.toLowerCase().includes(q) || 
        s.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    if (selectedTag) {
      list = list.filter(s => s.tags.includes(selectedTag));
    }
    
    if (filterFach) list = list.filter(s => s.fach === filterFach);
    if (filterStufe) list = list.filter(s => s.schulstufen.includes(filterStufe as number));
    if (filterDauer) list = list.filter(s => s.dauer === filterDauer);
    if (filterSchwierigkeit) list = list.filter(s => s.schwierigkeit === filterSchwierigkeit);
    
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
  }, [lessonPlans, searchQuery, filterFach, filterStufe, filterDauer, filterSchwierigkeit, sortBy, selectedTag]);

  const handleAiSuggest = async () => {
    if (!editingStundenbild?.fach || !editingStundenbild?.schulstufen?.length || !editingStundenbild?.dauer) {
      alert("Bitte Fach, Schulstufe und Dauer auswählen für die KI-Vorschläge.");
      return;
    }
    
    setIsAiLoading(true);
    try {
      const prompt = `Fach: ${editingStundenbild.fach}. 
      Schulstufe: ${editingStundenbild.schulstufen[0]}. 
      Dauer: ${editingStundenbild.dauer} Minuten. 
      Kontext: ${editingStundenbild.tags?.join(', ') || 'Unterrichtsvertretung'}.`;

      const response = await askAI('ki-stundenbild', prompt);

      if (!response) {
        throw new Error("Keine Antwort von der KI erhalten.");
      }

      const cleaned = response.replace(/```json|```/g, "").trim();
      const data = JSON.parse(cleaned);
      
      setEditingStundenbild(prev => ({
        ...prev,
        titel: data.titel,
        beschreibung: data.beschreibung,
        benoetigtesMaterial: data.benoetigtesMaterial,
        lernziel: data.lernziel,
        tags: data.tags
      }));
    } catch (error) {
      console.error("AI Suggestion failed:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveStundenbild = () => {
    if (!editingStundenbild?.titel?.trim() || !editingStundenbild?.fach) {
      alert('Bitte Titel und Fach angeben.');
      return;
    }

    const newId = editingStundenbild.id || `custom-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
    const sb: VertretungsStundenbild = {
      ...editingStundenbild as VertretungsStundenbild,
      id: newId,
      titel: editingStundenbild.titel.trim(),
      erstelltAm: editingStundenbild.erstelltAm || new Date().toISOString(),
      istEigeneVorlage: true,
      schulstufen: editingStundenbild.schulstufen || [app.stufe || 1],
      dauer: editingStundenbild.dauer || 45,
      schwierigkeit: editingStundenbild.schwierigkeit || 'mittel',
      beschreibung: editingStundenbild.beschreibung || '',
      benoetigtesMaterial: editingStundenbild.benoetigtesMaterial || [],
      lernziel: editingStundenbild.lernziel || '',
      tags: editingStundenbild.tags || [],
    };

    const existing = (app.materialien || []).find(material => material.id === newId);
    const created = createMaterialItemFromStundenbild(sb);
    const materialItem = existing
      ? {
          ...existing,
          ...created,
          erstelltAm: existing.erstelltAm || created.erstelltAm,
          favorit: existing.favorit,
          zuletztVerwendet: existing.zuletztVerwendet,
        }
      : created;
    const nextMaterials = upsertMaterial(app.materialien || [], materialItem);
    if (calculateMaterialStorageSize(nextMaterials) > MATERIAL_LIBRARY_MAX_MB) {
      alert('Speicher voll. Bitte lösche alte Materialien oder kürze das Stundenbild.');
      return;
    }

    setApp(prev => ({
      ...prev,
      materialien: upsertMaterial(prev.materialien || [], materialItem),
    }));
    setIsEditing(false);
    setEditingStundenbild(null);
  };

  const handleDeleteStundenbild = (id: string) => {
    if (confirm("Möchtest du dieses Stundenbild wirklich löschen?")) {
      setApp(prev => ({
        ...prev,
        materialien: prev.materialien?.filter(m => m.id !== id),
        wochenplanung: removeMaterialReferencesFromWeeklyPlan(prev.wochenplanung, [id]),
        classes: removeMaterialReferencesFromClasses(prev.classes, [id]),
      }));
      setAssignedStundenbilder(prev => Object.fromEntries(
        Object.entries(prev).filter(([, materialId]) => materialId !== id),
      ));
    }
  };

  const handleMarkUsed = (id: string) => {
    setApp(prev => ({
      ...prev,
      materialien: prev.materialien?.map(m => 
        m.id === id ? { ...m, zuletztVerwendet: new Date().toISOString() } : m
      )
    }));
  };

  const getStudentName = (id: string, forceReal: boolean = false) => {
    const s = app.schueler.find(sch => sch.id === id);
    if (!s) return 'Unbekannt';
    if (privacyMode && !forceReal) {
      return `${s.vorname.charAt(0)}. ${s.nachname.charAt(0)}.`;
    }
    return `${s.vorname} ${s.nachname}`;
  };

  const transferNotes = useMemo(() => {
    if (!transferStudentId) return [];
    const source = (app.notes && app.notes.length > 0) ? app.notes : (app.journal || []);
    return source
      .filter(note => note.schuelerId === transferStudentId)
      .slice()
      .sort((a, b) => String(b.datum || '').localeCompare(String(a.datum || '')))
      .slice(0, 5);
  }, [app.notes, app.journal, transferStudentId]);

  const transferGradeRows = useMemo(() => {
    if (!transferStudentId) return [];
    const subjects = Array.from(new Set(app.faecher || FAECHER_ALLE))
      .filter(fach => app.fachConfig?.[fach]?.unterrichtet !== false);

    return subjects.flatMap(fach => {
      const mode = getAssessmentMode(app, fach);
      const firstData = app.noten?.[transferStudentId]?.[fach]?.['1'];
      const secondData = app.noten?.[transferStudentId]?.[fach]?.['2'];
      const firstRaw = firstData?.endnote ?? berechne(app, transferStudentId, fach, '1');
      const secondRaw = secondData?.endnote ?? berechne(app, transferStudentId, fach, '2');
      const hasFirst = firstRaw !== null && firstRaw !== undefined && firstRaw !== '';
      const hasSecond = secondRaw !== null && secondRaw !== undefined && secondRaw !== '';
      if (!hasFirst && !hasSecond) return [];

      return [{
        fach,
        mode,
        semester1: formatTransferGradeValue(firstRaw, mode),
        semester2: formatTransferGradeValue(secondRaw, mode),
      }];
    });
  }, [app, transferStudentId]);

  const transferDiagnosticResults = useMemo(() => {
    if (!transferStudentId) return [];
    return (app.diagnosticResults || [])
      .filter(result => result.studentId === transferStudentId)
      .slice()
      .sort((a, b) => String(b.createdAt || b.date || '').localeCompare(String(a.createdAt || a.date || '')))
      .slice(0, 5);
  }, [app.diagnosticResults, transferStudentId]);
  const [printColumns, setPrintColumns] = useState<Record<string, boolean>>({
    geschlecht: true,
    geburtstag: true,
    erstsprache: false,
    daz: true,
    spf: true,
    espf: false,
    religion: false,
    telefon_mutter: true,
    telefon_vater: true,
    notiz: true
  });
  const [printPages, setPrintPages] = useState({
    cover: true,
    overview: true,
    list: true,
    seating: true,
    feedback: true
  });
  const [klassenlisteOrientation, setKlassenlisteOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [density, setDensity] = useState<'standard' | 'compact'>('standard');
  const [schulleitungName, setSchulleitungName] = useState('');
  const [sekretariatTel, setSekretariatTel] = useState('');
  const [nachbarKlasse, setNachbarKlasse] = useState('');
  const [dayNotes, setDayNotes] = useState<Record<string, string>>({});
  const [zoomLevel, setZoomLevel] = useState<number>(0.7);

  useEffect(() => {
    setPrintNotes(app.vertretungHinweise || '');
    setAssignedStundenbilder({});
    setDayNotes({});
    setTransferStudentId(null);
    setShowTransferPrint(false);
    setSelectedStundenbild(null);
    setShowDetailModal(false);
  }, [app.activeClassId]);

  // Generate list of dates to print
  const getDaysToPrint = () => {
    let dates: Date[] = [];
    if (rangeMode === 'single') {
      dates = [new Date(singleDate)];
    } else if (rangeMode === 'multi') {
      let current = new Date(startDate);
      const end = new Date(endDate);
      // Safety: max 14 days
      let count = 0;
      while (current <= end && count < 14) {
        if (current.getDay() !== 0 && current.getDay() !== 6) { // Skip Sat/Sun
          dates.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
        count++;
      }
    } else if (rangeMode === 'week') {
      const d = new Date(weekDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
      const monday = new Date(d.setDate(diff));
      for (let i = 0; i < 5; i++) {
        const next = new Date(monday);
        next.setDate(monday.getDate() + i);
        dates.push(next);
      }
    }
    return dates;
  };

  const renderAllPages = (isPreview: boolean) => {
    const daysToPrint = getDaysToPrint();
    const studentsSorted = [...app.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname));
    
    // Auto-scale seating plan logic
    const seats = studentsSorted.filter(s => app.sitzplan_schueler[s.id]).map(s => app.sitzplan_schueler[s.id]);
    const objs = app.sitzplan_objekte || [];
    let scalingInfo = { scale: 0.65, offsetX: 30, offsetY: 35 };
    if (seats.length > 0 || objs.length > 0) {
      const minX = Math.min(...seats.map(s => s.x), ...objs.map(o => o.x), 50);
      const maxX = Math.max(...seats.map(s => s.x + 110), ...objs.map(o => o.x + (o.w || 120)), 950);
      const minY = Math.min(...seats.map(s => s.y), ...objs.map(o => o.y), 50);
      const maxY = Math.max(...seats.map(s => s.y + 70), ...objs.map(o => o.y + (o.h || 60)), 550);
      
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      
      const containerW = 690;
      const containerH = 430;
      
      const scaleX = contentWidth > 0 ? (containerW / contentWidth) : 1;
      const scaleY = contentHeight > 0 ? (containerH / contentHeight) : 1;
      const scale = Math.min(scaleX, scaleY, 0.9);
      
      const offsetX = (containerW - (contentWidth * scale)) / 2 - minX * scale;
      const offsetY = (containerH - (contentHeight * scale)) / 2 - minY * scale;
      scalingInfo = { scale, offsetX, offsetY };
    }

    const pages: React.ReactNode[] = [];

    // Birthdays check helper
    const getBirthdaysToday = (date: Date) => {
      const bMonth = date.getMonth();
      const bDay = date.getDate();
      return studentsSorted.filter(s => {
        if (!s.geburtstag) return false;
        let bDate: Date;
        const parts = s.geburtstag.split(".");
        if (parts.length === 3) {
          bDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        } else {
          bDate = new Date(s.geburtstag);
        }
        return !isNaN(bDate.getTime()) && bDate.getMonth() === bMonth && bDate.getDate() === bDay;
      });
    };

    const hasBirthdayInRange = (student: typeof app.schueler[0]) => {
      if (!student.geburtstag) return false;
      let bDate: Date;
      const parts = student.geburtstag.split(".");
      if (parts.length === 3) {
        bDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        bDate = new Date(student.geburtstag);
      }
      if (isNaN(bDate.getTime())) return false;
      return daysToPrint.some(d => d.getMonth() === bDate.getMonth() && d.getDate() === bDate.getDate());
    };

    const hasMedicalAlert = (student: typeof app.schueler[0]) => {
      if (!student.notiz) return false;
      const noteLower = student.notiz.toLowerCase();
      const keywords = ['allergie', 'allergisch', 'medikament', 'krank', 'epilep', 'diabetes', 'wespe', 'biene', 'nuss', 'lactose', 'gluten', 'arzt', 'notfall', 'asthma', 'schock', 'epileptisch'];
      return keywords.some(kw => noteLower.includes(kw));
    };

    // PAGE 0: DECKBLATT
    if (printPages.cover) {
      pages.push(
        <div key="page-cover" className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'}`} style={{ pageBreakAfter: 'always' }}>
          <div className="flex-1 flex flex-col justify-between py-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-widest">{app.schulName || 'Volksschule'}</span>
              <span className="text-[0.625rem] font-black uppercase text-slate-400">Übergabe-Dossier</span>
            </div>

            <div className="text-center my-10 space-y-3">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <ClipboardList size={28} />
              </div>
              <h1 className="text-[1.875rem] leading-tight font-extrabold uppercase tracking-tight text-slate-900 leading-tight">Vertretungshilfe</h1>
              <div className="h-0.5 w-12 bg-indigo-600 mx-auto rounded-full" />
              <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Handover-Mappe für Lehrpersonen</p>
            </div>

            <div className="grid grid-cols-2 gap-3 border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
              <div className="space-y-1">
                <p className="text-[0.5rem] font-black text-slate-400 uppercase">Klasse</p>
                <p className="font-bold text-[0.875rem] leading-snug text-slate-800">{app.klassenbezeichnung || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.5rem] font-black text-slate-400 uppercase">Schuljahr</p>
                <p className="font-bold text-[0.875rem] leading-snug text-slate-800">{app.schuljahr || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.5rem] font-black text-slate-400 uppercase">Stammlehrperson</p>
                <p className="font-bold text-[0.875rem] leading-snug text-slate-800">{app.lehrerName || app.lehrerProfil?.name || 'Inhaber:in'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[0.5rem] font-black text-slate-400 uppercase">Zeitraum</p>
                <p className="font-bold text-[0.875rem] leading-snug text-slate-800 line-clamp-1">
                  {daysToPrint.length > 0 
                    ? (daysToPrint.length === 1 ? formatDate(daysToPrint[0]) : `${formatDate(daysToPrint[0])} bis ${formatDate(daysToPrint[daysToPrint.length-1])}`)
                    : 'Kein Zeitraum gewählt'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <h4 className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-widest">📋 Mappen-Inhalt:</h4>
              <div className="grid grid-cols-1 gap-1.5 text-[0.75rem] leading-tight text-slate-700">
                <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span>Organisatorischer Leitfaden &amp; Sicherheits-Nummern</span>
                </div>
                {printPages.overview && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Tagespläne für {daysToPrint.length} ausgewählte Tage</span>
                  </div>
                )}
                {printPages.list && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Klassenliste mit Schüler-Besonderheiten</span>
                  </div>
                )}
                {printPages.seating && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Sitzplan LEHRERCOCKPIT (Tafel/Vorne markiert)</span>
                  </div>
                )}
                {printPages.feedback && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-indigo-600 font-bold">✓</span>
                    <span>Substitution Feedback-Bogen</span>
                  </div>
                )}
              </div>
            </div>

            {emergencyChecklist.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <h4 className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest">📋 Vorbereitete Schritte (Checkliste):</h4>
                <div className="grid grid-cols-2 gap-2 text-[0.625rem] leading-tight">
                  {emergencyChecklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50/50 rounded-lg border border-slate-100">
                      <span className={item.checked ? 'text-emerald-600 font-extrabold' : 'text-slate-300 font-bold'}>
                        {item.checked ? '☑' : '☐'}
                      </span>
                      <span className={`line-clamp-1 ${item.checked ? 'text-slate-700 font-medium' : 'text-slate-400 italic'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <h4 className="text-[0.5625rem] font-black uppercase text-rose-500 tracking-widest">🚨 Wichtige Notfall-Kontakte:</h4>
              <div className="grid grid-cols-2 gap-3 text-[0.75rem] leading-tight">
                <div className="p-2 bg-rose-50/20 border border-rose-100 rounded-xl">
                  <p className="text-[0.4375rem] font-black text-rose-500 uppercase">Direktion / Schulleitung</p>
                  <p className="font-extrabold text-slate-800 text-[0.6875rem] text-wrap leading-tight break-words">{schulleitungName}</p>
                </div>
                <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[0.4375rem] font-black text-slate-400 uppercase">Sekretariat / Kanzlei</p>
                  <p className="font-extrabold text-slate-800 text-[0.6875rem] text-wrap leading-tight break-words">{sekretariatTel}</p>
                </div>
                <div className="col-span-2 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <p className="text-[0.4375rem] font-black text-slate-400 uppercase">Betreuende Lehrkraft (Ansprechpartner Nachbarklasse)</p>
                  <p className="font-extrabold text-slate-800 text-[0.6875rem] text-wrap leading-tight break-words">{nachbarKlasse}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center text-[0.53125rem] text-slate-400 border-t pt-2 mt-4 font-semibold">
            Erstellt mit Schulplaner am {new Date().toLocaleDateString('de-AT')} – Vertraulich behandeln und nur autorisierten Vertretungskräften zugänglich machen.
          </div>
        </div>
      );
    }

    // PAGE 1: TAGESPLÄNE
    if (printPages.overview) {
      daysToPrint.forEach((currentDay, dayIdx) => {
        const kw = getISOWeek(currentDay);
        const dayName = getDayName(currentDay);
        const dayStr = currentDay.toISOString().split('T')[0];
        const birthdaysToday = getBirthdaysToday(currentDay);

        pages.push(
          <div key={`page-day-${dayStr}`} className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'}`} style={{ pageBreakAfter: 'always' }}>
            <div className="space-y-4">
              <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-end">
                <div>
                  <span className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest">Tagesvertretung</span>
                  <h1 className="text-[1.5rem] leading-normal font-extrabold text-slate-900 mt-0.5">Stundenablauf für {formatDate(currentDay)}</h1>
                </div>
                <div className="text-right text-[0.6875rem]">
                  <p className="font-black text-slate-450 uppercase">Klasse {app.klassenbezeichnung || '—'}</p>
                  <p className="font-bold text-slate-600">KW {kw} {(() => { const sw = getSW(currentDay, app?.schuljahr); return sw ? ` • SW ${sw}` : ''; })()}</p>
                </div>
              </div>

              {birthdaysToday.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-250 rounded-xl flex items-center gap-2 select-none">
                  <span className="text-[1rem] leading-normal">🎂</span>
                  <div className="text-[0.625rem]">
                    <p className="font-black text-amber-800 uppercase tracking-wider text-[0.5rem]">Klassen-Ereignis:</p>
                    <p className="font-bold text-amber-900">
                      Heute hat <strong>{birthdaysToday.map(b => `${b.vorname} ${b.nachname}`).join(', ')}</strong> Geburtstag! Kurz feiern &amp; gratulieren.
                    </p>
                  </div>
                </div>
              )}

              <table className="w-full border-collapse border border-slate-300 text-[9pt] leading-snug">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-300 select-none text-[8.5pt]">
                    <th className="border border-slate-300 p-2 w-10 text-center">Std</th>
                    <th className="border border-slate-300 p-2 w-20 text-center">Zeit</th>
                    <th className="border border-slate-300 p-2 w-24 text-center">Fach</th>
                    <th className="border border-slate-300 p-2 text-left">Thema / Unterrichtsinhalt</th>
                    <th className="border border-slate-300 p-2 w-32 text-left">Materialien</th>
                  </tr>
                </thead>
                <tbody>
                  {LESSON_SLOT_NUMBERS.map(std => {
                    const stammFach = app.stammplan[dayName]?.[std];
                    const wpItem = app.wochenplanung[kw]?.[dayName]?.[std - 1];
                    const lpKey = `${kw}-${dayName}-${std - 1}`;
                    const lpList = app.wochenplan_lehrplan?.[lpKey] || [];
                    
                    const assignmentKey = `${dayStr}-${std}`;
                    const assignedId = assignedStundenbilder[assignmentKey];
                    const assignedSb = lessonPlans.find(m => m.id === assignedId);

                    const effectiveFach = (assignedSb?.faecher && assignedSb.faecher[0]) || wpItem?.fach || stammFach || '—';
                    const effectiveInhalt = assignedSb?.titel || wpItem?.thema || '—';

                    if (stammFach === 'frei' && !assignedSb && !wpItem) {
                      return (
                        <tr key={std} className="border-b border-slate-250 bg-slate-50/50 italic text-slate-400 select-none">
                          <td className="border border-slate-300 p-2 text-center font-bold bg-slate-50">{std}.</td>
                          <td className="border border-slate-300 p-2 text-center text-[7.5pt]">{getHandoverLessonTime(app.stundenZeiten, STUNDEN_INFO, std)}</td>
                          <td className="border border-slate-300 p-2 text-center font-bold" colSpan={3}>Unterrichtsfrei / Pause</td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={std} className="border-b border-slate-200 text-slate-800">
                        <td className="border border-slate-300 p-2 font-black text-center bg-slate-50">{std}.</td>
                        <td className="border border-slate-300 p-1.5 text-center text-[8pt] text-slate-500 font-semibold">{getHandoverLessonTime(app.stundenZeiten, STUNDEN_INFO, std)}</td>
                        <td className="border border-slate-300 p-2 text-center font-bold">{effectiveFach}</td>
                        <td className="border border-slate-300 p-2 text-left">
                          <div>
                            <p className="font-extrabold text-[0.6875rem] text-slate-900 leading-tight">{effectiveInhalt}</p>
                            {assignedSb && (
                              <span className="text-[6.5pt] font-black bg-indigo-50 border border-indigo-200 text-indigo-700 uppercase px-1 rounded inline-block mt-0.5">
                                Zugeordnetes Stundenbild
                              </span>
                            )}
                          </div>
                          {printLehrplan && lpList.length > 0 && (
                            <div className="mt-1 space-y-0.5 select-none">
                              {lpList.map((zuordnung, lIdx) => {
                                const kb = LEHRPLAN_VS_2023[zuordnung.fach]?.[app.stufe || 1]?.find(k => k.id === zuordnung.kompetenzbereichId);
                                return (
                                  <p key={lIdx} className="text-[6pt] text-slate-500 leading-none">
                                    Comp: {kb?.titel}
                                  </p>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-[8pt] text-slate-600 italic">
                          {assignedSb ? (
                            <span>Benoetigt: {assignedSb.benoetigtesMaterial.join(', ') || 'Keines'}</span>
                          ) : (
                            wpItem?.material || '—'
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {dayNotes[dayStr] && (
                <div className="p-3 border-l-4 border-indigo-500 bg-indigo-50/20 rounded-xl">
                  <p className="text-[7.5pt] font-black uppercase text-indigo-600 tracking-wider">Hinweis für diesen Tag:</p>
                  <p className="text-[0.75rem] leading-tight font-bold text-indigo-900 italic leading-snug">{dayNotes[dayStr]}</p>
                </div>
              )}
            </div>

            {dayIdx === daysToPrint.length - 1 && printNotes && (
              <div className="mt-4 pt-3 border-t">
                <h3 className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 mb-1 leading-none">⚠️ Allgemeine Klassenregeln, Rituale &amp; Hinweise:</h3>
                <div className="p-3 border border-slate-200 rounded-xl text-[0.625rem] leading-relaxed text-slate-600 bg-slate-50/50 whitespace-pre-wrap max-h-36 ">
                  <div dangerouslySetInnerHTML={{ __html: printNotes }} className="prose prose-sm font-semibold prose-p:my-0.5" />
                </div>
              </div>
            )}
          </div>
        );
      });
    }

    // PAGE 2: KLASSENLISTE
    if (printPages.list) {
      const activeCols = Object.entries(printColumns).filter(([_, v]) => v).map(([k, _]) => k);
      const rowPadding = density === 'compact' ? 'p-1 text-[7.5pt]' : 'p-2.5 text-[9pt]';

      pages.push(
        <div key="page-list" className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'} ${klassenlisteOrientation === 'landscape' ? 'klassenliste-landscape' : ''}`} style={{ pageBreakAfter: 'always' }}>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2">
              <div>
                <span className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest">Klassenstammdaten</span>
                <h1 className="text-[1.5rem] leading-normal font-extrabold text-slate-900">Klassenliste Klasse {app.klassenbezeichnung || '—'}</h1>
              </div>
              <span className="font-extrabold text-slate-500 uppercase tracking-widest text-[0.59375rem] bg-slate-50 px-2.5 py-1 rounded-lg">
                {studentsSorted.length} Kinder • {density === 'compact' ? 'Papier-Sparmodus' : 'Standard'}
              </span>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-slate-800 leading-tight">
              <thead>
                <tr className="bg-slate-50 text-slate-705 font-bold border-b border-slate-300 text-[8.5pt]">
                  <th className="border border-slate-300 p-2 w-8 text-center">#</th>
                  <th className="border border-slate-300 p-2 text-left w-24">Nachname</th>
                  <th className="border border-slate-300 p-2 text-left w-24">Vorname</th>
                  {activeCols.map(col => (
                    <th key={col} className="border border-slate-300 p-2 text-left capitalize text-[8pt]">
                      {col === 'telefon_mutter' ? 'Mutter Tel' : col === 'telefon_vater' ? 'Vater Tel' : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {studentsSorted.map((s, idx) => {
                  const isBday = hasBirthdayInRange(s);
                  const isMed = hasMedicalAlert(s);

                  return (
                    <tr key={s.id} className={`${idx % 2 === 1 ? 'bg-slate-50/20' : 'bg-white'} border-b border-slate-200`}>
                      <td className={`border border-slate-300 ${rowPadding} text-slate-400 text-center font-bold`}>{idx + 1}</td>
                      <td className={`border border-slate-300 ${rowPadding} font-black text-slate-900`}>
                        <div className="flex items-center gap-1.5">
                          {s.nachname}
                          {isBday && <span title="Geburtstag">🎂</span>}
                          {isMed && <span title="Wichtige Hinweise / Allergie">⚠️</span>}
                        </div>
                      </td>
                      <td className={`border border-slate-300 ${rowPadding} font-black text-slate-900`}>{s.vorname}</td>
                      
                      {printColumns.geschlecht && (
                        <td className={`border border-slate-300 text-center ${rowPadding} font-semibold text-slate-600`}>
                          {s.geschlecht === 'weiblich' ? 'W' : (s.geschlecht === 'männlich' ? 'M' : '-')}
                        </td>
                      )}
                      
                      {printColumns.geburtstag && (
                        <td className={`border border-slate-300 text-center ${rowPadding} text-[7.5pt] font-semibold whitespace-nowrap`}>
                          {s.geburtstag ? (s.geburtstag.includes('-') ? s.geburtstag.split('-').reverse().join('.') : s.geburtstag) : '-'}
                        </td>
                      )}

                      {printColumns.erstsprache && <td className={`border border-slate-300 ${rowPadding} text-wrap leading-tight break-words`}>{s.erstsprache || '-'}</td>}
                      
                      {printColumns.daz && (
                        <td className={`border border-slate-300 text-center ${rowPadding}`}>
                          {s.daz ? <span className="font-extrabold text-violet-700 text-[0.5rem] bg-violet-50 px-1 py-0.5 rounded leading-none border border-violet-100">🗣️ DaZ</span> : '-'}
                        </td>
                      )}
                      
                      {printColumns.spf && (
                        <td className={`border border-slate-300 text-center ${rowPadding}`}>
                          {s.spf ? <span className="font-extrabold text-blue-700 text-[0.5rem] bg-blue-50 px-1 py-0.5 rounded leading-none border border-blue-100">🎓 SPF</span> : '-'}
                        </td>
                      )}
                      
                      {printColumns.espf && (
                        <td className={`border border-slate-300 text-center ${rowPadding}`}>
                          {s.espf ? <span className="font-extrabold text-rose-700 text-[0.5rem] bg-rose-50 px-1 py-0.5 rounded leading-none border border-rose-100">espf</span> : '-'}
                        </td>
                      )}
                      
                      {printColumns.religion && <td className={`border border-slate-300 text-center ${rowPadding} text-[8pt]`}>{s.religion || '-'}</td>}
                      {printColumns.telefon_mutter && <td className={`border border-slate-300 text-[7.5pt] font-semibold tracking-tight ${rowPadding}`}>{s.telefon_mutter || '-'}</td>}
                      {printColumns.telefon_vater && <td className={`border border-slate-300 text-[7.5pt] font-semibold tracking-tight ${rowPadding}`}>{s.telefon_vater || '-'}</td>}
                      
                      {printColumns.notiz && (
                        <td className={`border border-slate-300 ${rowPadding} italic text-[7.5pt]`}>
                          <div className={`line-clamp-2 leading-tight font-medium ${isMed ? 'text-rose-700 font-black bg-rose-50 p-1 border border-rose-200' : 'text-slate-500'}`}>
                            {s.notiz || '—'}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[0.5rem] text-slate-405 font-bold italic border-t pt-2 mt-4 select-none">
            Hinweis: Vertrauliche Personaldaten – Vor unbefugtem Zugriff Dritter (Eltern, Schulfremden) schützen.
          </div>
        </div>
      );
    }

    // PAGE 3: SITZPLAN
    if (printPages.seating) {
      pages.push(
        <div key="page-seating" className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'}`} style={{ pageBreakAfter: 'always' }}>
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2">
              <div>
                <span className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest">LEHRERCOCKPITaufteilung</span>
                <h1 className="text-[1.5rem] leading-normal font-extrabold text-slate-900">Sitzplan</h1>
              </div>
              <span className="font-extrabold text-slate-550 uppercase tracking-widest text-[0.59375rem] bg-slate-50 px-2 py-1 rounded">
                {studentsSorted.filter(s => app.sitzplan_schueler[s.id]).length} Pulte belegt
              </span>
            </div>

            <div className="w-full flex justify-center py-1">
              <div className="bg-slate-800 text-slate-100 border-b-2 border-slate-900 rounded-xl px-12 py-2 text-[0.5625rem] font-black uppercase tracking-widest shadow text-center leading-none">
                📍 SCHULTAFEL / PANEL (VORNE)
              </div>
            </div>

            <div className="flex-1 border border-dashed border-slate-300 rounded-[1.5rem] bg-slate-50/30  relative min-h-[440px] shadow-inner">
              <div 
                className="absolute"
                style={{ 
                  transform: `scale(${scalingInfo.scale})`, 
                  transformOrigin: 'top left',
                  left: `${scalingInfo.offsetX}px`, 
                  top: `${scalingInfo.offsetY}px`,
                  width: '960px',
                  height: '600px'
                }}
              >
                {studentsSorted.filter(s => app.sitzplan_schueler[s.id]).map(s => {
                  const pos = app.sitzplan_schueler[s.id];
                  const isBday = hasBirthdayInRange(s);
                  const isMed = hasMedicalAlert(s);

                  return (
                    <div 
                      key={s.id}
                      className="absolute w-22 h-14 border border-slate-800 bg-white rounded-lg flex flex-col items-center justify-center p-1 shadow-sm font-semibold text-slate-900 leading-none"
                      style={{ left: pos.x, top: pos.y }}
                    >
                      <p className="text-[0.59375rem] font-extrabold text-wrap leading-tight break-words w-full text-center text-slate-950">{s.vorname}</p>
                      <p className="text-[0.5rem] text-slate-400 font-bold uppercase tracking-wider mt-0.5 text-wrap leading-tight break-words w-full text-center">{s.nachname}</p>
                      <div className="flex items-center gap-1 mt-0.5 leading-none h-3 select-none">
                        {isBday && <span className="text-[0.53125rem]">🎂</span>}
                        {isMed && <span className="text-[0.53125rem]">⚠️</span>}
                      </div>
                    </div>
                  );
                })}
                
                {(app.sitzplan_objekte || []).map(obj => (
                  <div 
                    key={obj.id}
                    className="absolute border border-slate-300 bg-slate-100/50 rounded-md flex items-center justify-center text-[0.5625rem] uppercase font-bold text-slate-500 text-center leading-tight shadow-sm border-dashed"
                    style={{ 
                      left: obj.x, 
                      top: obj.y, 
                      width: obj.w, 
                      height: obj.h,
                      transform: `rotate(${obj.rotation || 0}deg)`,
                    }}
                  >
                    {obj.type === 'teacher_desk' ? '🏫 LEHRPULT' : 'Tisch/Bank'}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[0.53125rem] text-slate-400 font-bold italic mt-2 border-t pt-1.5 flex justify-between">
            <span>* Sitzordnung entspricht dem regulären Klassenlayout.</span>
            <span>📍 Eingang</span>
          </div>
        </div>
      );
    }

    // PAGE 4: RÜCKMELDEBOGEN
    if (printPages.feedback) {
      pages.push(
        <div key="page-feedback" className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'}`} style={{ pageBreakAfter: 'always' }}>
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2">
              <div>
                <span className="text-[0.5625rem] font-black uppercase text-indigo-600 tracking-widest">Unterrichtsrückmeldung</span>
                <h1 className="text-[1.5rem] leading-normal font-extrabold text-slate-900">Rückmeldebogen für Klassenlehrer</h1>
              </div>
              <span className="font-extrabold text-slate-450 uppercase tracking-widest text-[0.59375rem] bg-slate-50 px-2.5 py-1 rounded">
                Handover-Feedback
              </span>
            </div>

            <p className="text-[0.625rem] text-slate-450 italic leading-relaxed">
              Bitte hinterlassen Sie eine kurze Rückmeldung zur Vertretung. Das erleichtert mir die Weiterarbeit bei meiner Rückkehr. Herzlichen Dank für Ihren Einsatz!
            </p>

            <div className="flex-1 space-y-4 pt-1">
              <div className="space-y-2">
                <h3 className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-600 border-b pb-0.5">👥 Fehlende Schüler:innen heute:</h3>
                <div className="border-b border-dashed border-slate-350 w-full h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-600 border-b pb-0.5">📚 Durchgenommener Unterrichtsstoff:</h3>
                <div className="space-y-2 pt-0.5">
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-600 border-b pb-0.5">✍️ Erledigte oder aufgegebene Hausübungen:</h3>
                <div className="space-y-2 pt-0.5">
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-600 border-b pb-0.5">🗣️ Zusammenarbeit &amp; Klima in der Klasse:</h3>
                <div className="space-y-2 pt-0.5">
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                  <div className="border-b border-dashed border-slate-350 w-full h-6" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 pt-6">
              <div className="space-y-6">
                <div className="border-b border-slate-300 h-6" />
                <p className="text-[0.5rem] font-black uppercase text-slate-400 tracking-wider">Datum / Unterschrift Vertretungsperson</p>
              </div>
              <div className="text-right flex items-end justify-end">
                <p className="text-[0.59375rem] font-bold text-slate-500 italic">„Vielen Dank für Ihre vertrauensvolle Arbeit!“</p>
              </div>
            </div>
          </div>

          <div className="text-center text-[0.53125rem] text-slate-400 border-t pt-2 mt-4 select-none">
            Hinterlassen am Lehrertisch – Klassio · Übergabemappe.
          </div>
        </div>
      );
    }

    // PAGE 5: WORKWHEETS FOR LESSON PLANS
    const assignedWorksheets = daysToPrint.flatMap(date => {
      const dateStr = date.toISOString().split('T')[0];
      return LESSON_SLOT_NUMBERS.map(std => {
        const id = assignedStundenbilder[`${dateStr}-${std}`];
        return lessonPlans.find(m => m.id === id);
      }).filter(Boolean);
    }).reduce((acc: any[], curr) => {
      if (curr && !acc.some(a => a.id === curr.id)) acc.push(curr);
      return acc;
    }, []);

    assignedWorksheets.forEach((sb) => {
      pages.push(
        <div key={`page-sb-${sb.id}`} className={`flex flex-col justify-between h-full bg-white text-slate-800 ${isPreview ? 'p-8' : 'p-10 printable-page'}`} style={{ pageBreakAfter: 'always' }}>
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="border-b-2 border-slate-900 pb-2 flex justify-between items-end">
              <div>
                <span className={`px-2 py-0.5 rounded text-[0.5rem] font-black uppercase tracking-wider inline-block border ${
                  sb.fach === 'Deutsch' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  sb.fach === 'Mathematik' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  sb.fach === 'Sachunterricht' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  'bg-slate-50 text-slate-650 border-slate-200'
                }`}>
                  {sb.fach}
                </span>
                <h1 className="text-[1.25rem] leading-normal font-extrabold text-slate-900 leading-tight mt-1 text-wrap leading-tight break-words max-w-lg">{sb.titel}</h1>
              </div>
              <div className="text-right text-[0.625rem]">
                <span className="text-[0.5rem] font-black uppercase text-slate-400 block tracking-widest">Detail-Stundenbild</span>
                <span className="font-bold text-slate-700">{sb.dauer} Min. • {(sb.schulstufen.join(', ') || app.stufe)}. Stufe</span>
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 flex-1 my-3">
              <div className="col-span-4 space-y-3">
                <div className="space-y-1">
                  <h4 className="text-[0.53125rem] font-black uppercase text-indigo-600 tracking-wider">Lernziele:</h4>
                  <p className="text-[0.625rem] font-semibold leading-relaxed text-slate-700 italic border-l-2 border-indigo-505 pl-1.5 pt-0.5">
                    {sb.lernziel}
                  </p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[0.53125rem] font-black uppercase text-emerald-600 tracking-wider">Materialien:</h4>
                  <ul className="list-disc list-inside text-[0.59375rem] font-semibold text-slate-700 pl-1 space-y-0.5 leading-snug">
                    {sb.benoetigtesMaterial.map((m, i) => <li key={i}>{m}</li>)}
                    {sb.benoetigtesMaterial.length === 0 && <li className="italic text-slate-400">Keine Hilfsmittel nötig</li>}
                  </ul>
                </div>
              </div>

              <div className="col-span-8 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 max-h-[380px] ">
                <h4 className="text-[0.59375rem] font-black uppercase text-slate-800 tracking-wider mb-2 border-b pb-1">
                  Verlauf &amp; Durchführung:
                </h4>
                <div className="space-y-2 text-[0.5625rem] leading-snug overflow-y-auto max-h-[330px]">
                  {sb.beschreibung.split('\n').filter(Boolean).map((phase, i) => {
                    const [title, ...content] = phase.split(':');
                    if (!content.length) return <p key={i} className="leading-snug font-semibold text-slate-705">{phase}</p>;
                    return (
                      <div key={i} className="space-y-0.5">
                        <p className="text-[0.5rem] font-black uppercase text-indigo-700 tracking-wider leading-none mt-1">{title.trim()}</p>
                        <p className="leading-relaxed font-semibold text-slate-600 pl-1.5 border-l border-slate-205">{content.join(':').trim()}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="border border-dashed border-slate-300 rounded-2xl p-3 relative bg-slate-50/20 select-none h-16 mt-2 flex items-center justify-center">
              <span className="absolute top-[-7px] left-4 bg-white px-1.5 text-[0.4375rem] font-black uppercase text-slate-400 tracking-widest border border-slate-200 rounded">
                Reflexion / Notizen:
              </span>
              <p className="text-[0.5625rem] font-bold italic text-slate-400 text-center leading-none">Hier handschriftliche Notizen des Tagesverlaufs oder Schülerbeobachtungen eintragen.</p>
            </div>
          </div>

          <div className="text-center text-[0.5rem] text-slate-400 border-t pt-1.5 mt-2 font-semibold">
            Modul Stundenbild – Schulplaner Handover &copy; {new Date().getFullYear()}
          </div>
        </div>
      );
    });

    return pages;
  };

  return (
    <div className="handover-folder-shell space-y-4 py-2">
      <div className="hidden">
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center print:hidden mb-1">
        <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap justify-center gap-1 border border-slate-200">
          <button 
            onClick={() => setActiveTab('config')}
            aria-pressed={activeTab === 'config'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.75rem] leading-snug font-bold transition-all ${activeTab === 'config' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList size={18} />
            Übergabe konfigurieren
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            aria-pressed={activeTab === 'manage'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.75rem] leading-snug font-bold transition-all ${activeTab === 'manage' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <BookOpen size={18} />
            Stundenbilder verwalten
          </button>
          <button 
            onClick={() => setActiveTab('transfer')}
            aria-pressed={activeTab === 'transfer'}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.75rem] leading-snug font-bold transition-all ${activeTab === 'transfer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <History size={18} />
            Schulwechsel-Paket
          </button>
        </div>
      </div>

      {/* Main View */}
      {activeTab === 'config' ? (
        <div className="print:hidden">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center max-w-5xl mx-auto print-hidden no-print">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-indigo-100">
              <ClipboardList size={28} />
            </div>
            <h1 className="text-[1.375rem] leading-tight font-black text-slate-900 tracking-tight mb-2">Vertretungs- &amp; Notfallmappe</h1>
            <p className="text-slate-500 text-[0.875rem] leading-relaxed mb-5 max-w-3xl">
              Bereite für einen kurzfristigen Ausfall eine vollständige <strong>Notfallmappe</strong> für deine Vertretung vor – mit Tagesablauf, ausgewählten Klasseninformationen, Sitzplan und wichtigen Kontakten.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2">
                    <Layout size={20} className="text-indigo-500" />
                    <span className="text-[0.75rem] leading-tight font-bold text-slate-700 uppercase tracking-wider">Stundenplan &amp; Zeiten</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2">
                    <Users size={20} className="text-emerald-500" />
                    <span className="text-[0.75rem] leading-tight font-bold text-slate-700 uppercase tracking-wider">Besonderheiten-Liste</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center gap-2">
                    <Book size={20} className="text-amber-500" />
                    <span className="text-[0.75rem] leading-tight font-bold text-slate-700 uppercase tracking-wider">Sitzplan-Skizze</span>
                </div>
            </div>

            <div className="bg-rose-50 border border-rose-100 text-rose-800 text-left p-4 rounded-xl w-full max-w-3xl mb-5 space-y-1.5">
              <h4 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider flex items-center gap-2 text-rose-700">
                🤒 Wichtig bei Krankheitsausfall:
              </h4>
              <p className="text-[0.8125rem] leading-relaxed font-semibold text-rose-900">
                Im Druckzentrum kannst du den <strong>Ausfallszeitraum</strong> sowie <strong>Aufgaben und Vertretungshinweise</strong> eintragen. Das Deckblatt wird anschließend automatisch für diesen Zeitraum zusammengestellt.
              </p>
            </div>

            {/* Emergency Checklist Widget */}
            <div className="w-full max-w-3xl bg-slate-50 border border-slate-200 p-4 rounded-2xl text-left mb-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[0.875rem] leading-snug font-black uppercase tracking-wider flex items-center gap-2 text-indigo-950">
                  ⚠️ Notfall-Checkliste für Vertretung:
                </h4>
                <span className="text-[0.625rem] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
                  {emergencyChecklist.filter(c => c.checked).length} von {emergencyChecklist.length} erledigt
                </span>
              </div>
              <p className="text-[0.75rem] text-slate-500 font-medium leading-relaxed">
                Hake ab, was bereits vorbereitet ist. Die Liste wird auf dem Deckblatt ausgegeben, damit deine Vertretung den Stand sofort erkennt.
              </p>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-label="Vorbereitung der Notfallmappe"
                aria-valuemin={0}
                aria-valuemax={emergencyChecklist.length}
                aria-valuenow={emergencyChecklist.filter(c => c.checked).length}
              >
                <div
                  className={`h-full rounded-full transition-all duration-500 ${emergencyChecklist.every(c => c.checked) ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                  style={{ width: `${emergencyChecklist.length ? (emergencyChecklist.filter(c => c.checked).length / emergencyChecklist.length) * 100 : 0}%` }}
                />
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {emergencyChecklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                    <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                      <input 
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => setEmergencyChecklist(prev => prev.map(c => c.id === item.id ? { ...c, checked: !c.checked } : c))}
                        className="w-4 h-4 rounded text-indigo-600 border-slate-250 focus:ring-indigo-500/20"
                      />
                      <span className={`text-[0.8125rem] font-semibold text-slate-700 transition-all ${item.checked ? 'line-through text-slate-400' : ''}`}>
                        {item.text}
                      </span>
                    </label>
                    <button 
                      onClick={() => setEmergencyChecklist(prev => prev.filter(c => c.id !== item.id))}
                      aria-label={`Checklisten-Punkt löschen: ${item.text}`}
                      className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add checklist item */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Eigenen Checklisten-Punkt hinzufügen..."
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newChecklistItem.trim()) {
                        setEmergencyChecklist(prev => [...prev, { id: `item-${Date.now()}`, text: newChecklistItem.trim(), checked: false }]);
                        setNewChecklistItem('');
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[0.8125rem] font-medium outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button 
                  onClick={() => {
                    if (newChecklistItem.trim()) {
                      setEmergencyChecklist(prev => [...prev, { id: `item-${Date.now()}`, text: newChecklistItem.trim(), checked: false }]);
                      setNewChecklistItem('');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[0.8125rem] font-bold shadow-md hover:bg-indigo-700 transition-colors"
                >
                  Hinzufügen
                </button>
              </div>
            </div>

            <div className="w-full max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <ShieldAlert size={19} className="mt-0.5 shrink-0 text-amber-700" />
                <div>
                  <p className="text-[0.75rem] font-black uppercase tracking-wider text-amber-900">Enthält möglicherweise sensible Daten</p>
                  <p className="mt-1 text-[0.75rem] font-medium leading-relaxed text-amber-800">
                    Nimm nur Informationen auf, die die Vertretung wirklich benötigt. Gesundheitsdaten, Kontakte und Zugangsdaten nicht offen liegen lassen und Ausdrucke nach der Verwendung sicher verwahren oder vernichten.
                  </p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowPrintModal(true)}
              className="btn btn-primary h-12 px-7 text-[0.875rem] leading-normal shadow-md flex items-center gap-2.5 bg-rose-600 hover:bg-rose-700 border-rose-600 hover:border-rose-700 active:scale-[0.99] transition-all rounded-xl"
            >
              <Printer size={19} />
              Notfallmappe konfigurieren &amp; drucken
            </button>
            
            <p className="mt-4 text-[0.625rem] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Du entscheidest vor dem Druck, welche Angaben enthalten sind
            </p>
          </div>
        </div>
      ) : activeTab === 'transfer' ? (
        <div className="print:hidden max-w-4xl mx-auto">
          <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-xl shadow-slate-900/5 text-center space-y-8">
            <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner ring-1 ring-amber-100">
              <History size={40} />
            </div>
            <div className="space-y-3">
              <h1 className="text-[1.875rem] leading-tight font-black text-slate-900 tracking-tight">Klassenwechsel-Übergabepaket</h1>
              <p className="text-slate-500 text-[1rem] leading-normal max-w-xl mx-auto font-medium">
                Generiere mit einem Klick ein vollständiges Übergabedossier für einen Schulwechsel oder Umzug. 
                Das Paket enthält Stammdaten, aktuelle Leistungen, IKM-Plus Ergebnisse und pädagogische Notizen.
              </p>
            </div>

            {/* GDPR privacy switch */}
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-2xl w-fit mx-auto select-none cursor-pointer" onClick={() => setPrivacyMode(!privacyMode)}>
              <div className={`w-9 h-5 rounded-full transition-colors flex items-center p-0.5 relative ${privacyMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                <motion.div layout className="w-4 h-4 bg-white rounded-full shadow-md" />
              </div>
              <span className="text-[0.75rem] font-bold text-indigo-950 flex items-center gap-1.5">
                {privacyMode ? <EyeOff size={14} className="text-indigo-600" /> : <Eye size={14} className="text-slate-500" />}
                DSGVO-Datenschutzmodus (anonymisiert)
              </span>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6 text-left max-w-xl mx-auto shadow-sm">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-[0.2em] block ml-1">Schüler:in auswählen</label>
                <select 
                  value={transferStudentId || ''} 
                  onChange={(e) => setTransferStudentId(e.target.value)}
                  className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-amber-500/20 transition-all outline-none"
                >
                  <option value="">Bitte wählen...</option>
                  {[...app.schueler].sort((a, b) => a.nachname.localeCompare(b.nachname)).map(s => (
                    <option key={s.id} value={s.id}>{s.nachname} {s.vorname}</option>
                  ))}
                </select>
              </div>

              {transferStudentId && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-white border border-slate-100 p-5 rounded-2xl space-y-4 shadow-sm"
                >
                  {/* Student Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-yellow-400 text-white font-black text-[1.125rem] rounded-xl flex items-center justify-center shadow-sm">
                      {getStudentName(transferStudentId).split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="text-[0.9375rem] leading-normal font-black text-slate-800">{getStudentName(transferStudentId)}</h3>
                      <p className="text-[0.6875rem] leading-tight text-slate-400 font-bold uppercase tracking-wider">{app.stufe}. Schulstufe • Klasse {app.klassenbezeichnung}</p>
                    </div>
                    <div className="ml-auto px-2.5 py-1 bg-slate-50 border border-slate-100 text-emerald-600 font-black text-[0.5625rem] rounded-lg uppercase tracking-widest">
                      Aktiv
                    </div>
                  </div>

                  <hr className="border-slate-50" />

                  {/* Selected Student Metrics */}
                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
                      <FileText size={16} className="text-indigo-500" />
                      <div>
                        <p className="text-[0.5625rem] font-black uppercase text-slate-400">Beobachtungen</p>
                        <p className="text-[0.75rem] font-black text-slate-700">{transferNotes.length} Berichte</p>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2.5">
                      <FileCheck size={16} className="text-emerald-500" />
                      <div>
                        <p className="text-[0.5625rem] font-black uppercase text-slate-400">IKM-Plus</p>
                        <p className="text-[0.75rem] font-black text-slate-700">{app.ikmRecords?.some(r => r.schuelerId === transferStudentId) ? 'Erfasst' : 'Keine Daten'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Module selection checklist */}
                  <div className="space-y-2.5 pt-1">
                    <p className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Dossier-Bausteine wählen:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { key: 'stammdaten', label: 'Stammdaten & Schulausschnitt' },
                        { key: 'leistungen', label: 'Leistungsstand' },
                        { key: 'beobachtungen', label: 'Pädagogische Notizen' },
                        { key: 'ikm', label: 'IKM Plus Testergebnisse' },
                        { key: 'diagnostik', label: 'Diagnostik & Förderbedarf' },
                      ].map((mod) => (
                        <label key={mod.key} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-100 rounded-xl cursor-pointer hover:border-amber-200 transition-all">
                          <input 
                            type="checkbox" 
                            checked={transferModules[mod.key as keyof typeof transferModules]} 
                            onChange={(e) => setTransferModules(prev => ({ ...prev, [mod.key]: e.target.checked }))}
                            className="w-4 h-4 rounded text-amber-500 border-slate-200 focus:ring-amber-500/20 mr-2"
                          />
                          <span className="text-[0.75rem] font-semibold text-slate-700">{mod.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div className="pt-2 flex justify-center">
                <button 
                  disabled={!transferStudentId}
                  onClick={() => setShowTransferPrint(true)}
                  className={`w-full py-4 rounded-2xl font-black uppercase text-[0.6875rem] tracking-widest flex items-center justify-center gap-3 transition-all ${
                    transferStudentId 
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 hover:bg-amber-600 active:scale-95' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <FileText size={18} />
                  Übergabepaket generieren
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              {[
                { title: 'Stammdaten', desc: 'Kontaktdaten & Geburtsdatum', icon: User },
                { title: 'Leistungsstand', desc: 'Noten aller Gegenstände', icon: BarChart3 },
                { title: 'IKM-Plus', desc: 'Aktuelle Kompetenzmessung', icon: FileCheck },
                { title: 'Diagnostik', desc: 'Lernverläufe & Förderbedarf', icon: Activity }
              ].map((feature, i) => (
                <div key={i} className="p-4 bg-white border border-slate-100 rounded-2xl flex gap-3 items-center">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                    <feature.icon size={20} />
                  </div>
                  <div>
                    <h4 className="text-[0.75rem] leading-tight font-black text-slate-800">{feature.title}</h4>
                    <p className="text-[0.625rem] text-slate-400 font-bold">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="print:hidden max-w-6xl mx-auto space-y-6">
           <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex-1 max-w-md relative">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                     type="text" 
                     placeholder="Titel oder Tags suchen..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-[0.875rem] leading-snug font-medium"
                   />
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => {
                       setEditingStundenbild({
                         schulstufen: [app.stufe || 1],
                         fach: 'Deutsch',
                         dauer: 45,
                         schwierigkeit: 'mittel',
                         benoetigtesMaterial: [],
                         tags: []
                       });
                       setIsEditing(true);
                     }}
                     className="btn btn-primary flex items-center gap-2 h-12 px-6 shadow-lg shadow-indigo-100"
                   >
                     <Plus size={20} />
                     <span className="text-[0.875rem] leading-snug font-bold">Neues Stundenbild</span>
                   </button>
                </div>
             </div>

             <div className="flex flex-wrap gap-3 items-center pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Filter size={14} className="text-slate-400" />
                  <select 
                    value={filterFach}
                    onChange={(e) => setFilterFach(e.target.value)}
                    className="bg-transparent text-[0.75rem] leading-tight font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="">Alle Fächer</option>
                    {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <BookOpen size={14} className="text-slate-400" />
                  <select 
                    value={filterStufe}
                    onChange={(e) => setFilterStufe(e.target.value ? parseInt(e.target.value) : '')}
                    className="bg-transparent text-[0.75rem] leading-tight font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="">Alle Stufen</option>
                    {[1, 2, 3, 4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock size={14} className="text-slate-400" />
                  <select 
                    value={filterDauer}
                    onChange={(e) => setFilterDauer(e.target.value ? parseInt(e.target.value) : '')}
                    className="bg-transparent text-[0.75rem] leading-tight font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="">Alle Zeiten</option>
                    {[10, 20, 30, 45, 60, 90].map(d => <option key={d} value={d}>{d} Min.</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Zap size={14} className="text-slate-400" />
                  <select 
                    value={filterSchwierigkeit}
                    onChange={(e) => setFilterSchwierigkeit(e.target.value)}
                    className="bg-transparent text-[0.75rem] leading-tight font-bold text-slate-600 outline-none cursor-pointer"
                  >
                    <option value="">Alle Levels</option>
                    <option value="einfach">Einfach</option>
                    <option value="mittel">Mittel</option>
                    <option value="anspruchsvoll">Anspruchsvoll</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-indigo-50 rounded-xl border border-indigo-100">
                  <ArrowUpDown size={14} className="text-indigo-500" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'used' | 'date' | 'title')}
                    className="bg-transparent text-[0.75rem] leading-tight font-bold text-indigo-700 outline-none cursor-pointer"
                  >
                    <option value="used">Zuletzt verwendet</option>
                    <option value="date">Neueste zuerst</option>
                    <option value="title">Titel A–Z</option>
                  </select>
                </div>
             </div>

             {/* Popular Horizontal Tag Bar */}
             <div className="flex items-center gap-2 py-4 border-b border-slate-50 overflow-x-auto scrollbar-none select-none">
               <span className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1">Beliebte Tags:</span>
               <button 
                 onClick={() => setSelectedTag('')}
                 className={`px-3 py-1.5 rounded-full text-[0.6875rem] font-bold transition-all border shrink-0 ${
                   selectedTag === '' 
                     ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                     : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                 }`}
               >
                 Alle
               </button>
               {popularTags.map(tag => (
                 <button 
                   key={tag}
                   onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                   className={`px-3 py-1.5 rounded-full text-[0.6875rem] font-bold transition-all border shrink-0 flex items-center gap-1 ${
                     selectedTag === tag 
                       ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' 
                       : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100 hover:border-slate-200'
                   }`}
                 >
                   <span>#</span>{tag}
                 </button>
               ))}
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                {filteredStundenbilder.map(s => (
                  <motion.div 
                    key={s.id}
                    layoutId={s.id}
                    onClick={() => {
                      setSelectedStundenbild(s);
                      setShowDetailModal(true);
                    }}
                    className="p-5 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all cursor-pointer group flex flex-col h-full"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider ${
                        s.fach === 'Deutsch' ? 'bg-rose-50 text-rose-600' :
                        s.fach === 'Mathematik' ? 'bg-amber-50 text-amber-600' :
                        s.fach === 'Sachunterricht' ? 'bg-emerald-50 text-emerald-600' :
                        'bg-slate-50 text-slate-600'
                      }`}>
                        {s.fach}
                      </span>
                      <div className="flex gap-1">
                        {s.schulstufen.map(st => (
                          <span key={st} className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[0.5625rem] font-black">
                            {st}
                          </span>
                        ))}
                      </div>
                    </div>
                    <h3 className="text-[1.125rem] leading-normal font-black text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors leading-tight">
                      {s.titel}
                    </h3>
                    <p className="text-[0.75rem] leading-tight text-slate-500 line-clamp-3 mb-4 leading-relaxed font-medium">
                      {s.beschreibung}
                    </p>

                    {/* Lesson Plan Tags */}
                    {s.tags && s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {s.tags.map(tag => (
                          <span 
                            key={tag}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTag(selectedTag === tag ? '' : tag);
                            }}
                            className={`px-2 py-0.5 rounded-md text-[0.5625rem] font-bold uppercase transition-colors ${
                              selectedTag === tag 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                      <div className="flex items-center gap-3 text-[0.625rem] font-bold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={12} /> {s.dauer}m</span>
                        <div className="flex items-center gap-1" title={`Level: ${s.schwierigkeit}`}>
                          <Zap size={11} className={
                            s.schwierigkeit === 'einfach' ? 'text-emerald-500' :
                            s.schwierigkeit === 'mittel' ? 'text-amber-500' : 'text-rose-500'
                           } />
                           <div className="flex gap-0.5">
                             <span className={`w-1.5 h-1.5 rounded-full ${s.schwierigkeit ? (s.schwierigkeit === 'einfach' ? 'bg-emerald-500' : s.schwierigkeit === 'mittel' ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                             <span className={`w-1.5 h-1.5 rounded-full ${s.schwierigkeit === 'mittel' || s.schwierigkeit === 'anspruchsvoll' ? (s.schwierigkeit === 'mittel' ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                             <span className={`w-1.5 h-1.5 rounded-full ${s.schwierigkeit === 'anspruchsvoll' ? 'bg-rose-500' : 'bg-slate-200'}`} />
                           </div>
                        </div>
                      </div>
                      {s.zuletztVerwendet && (
                        <span className="text-[0.5625rem] font-black text-emerald-500 uppercase flex items-center gap-1">
                          <Check size={10} /> Verwendet
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
                {filteredStundenbilder.length === 0 && (
                  <div className="col-span-full py-20 flex flex-col items-center text-slate-300">
                    <Search size={48} className="mb-4 opacity-20" />
                    <p className="text-[1.125rem] leading-normal font-bold">Keine Stundenbilder gefunden</p>
                    <p className="text-[0.875rem] leading-snug font-medium">Passe deine Filter an oder erstelle ein neues Bild.</p>
                  </div>
                )}
             </div>
           </div>
        </div>
      )}

      {/* --- PRINT WORKSPACE & LIVE PREVIEW PORTAL --- */}
      <AnimatePresence>
        {showPrintModal && (
          <div role="dialog" aria-modal="true" aria-labelledby="handover-print-dialog-title" className="fixed inset-0 z-[200] flex flex-col md:flex-row bg-slate-900 text-slate-100 print:hidden no-print print-hidden font-sans  select-none">
            
            {/* LEFT BAR: CONTROL CONFIGURATOR (width 440px / 480px) */}
            <div className="w-full md:w-[440px] xl:w-[480px] bg-slate-950 border-r border-slate-800 flex flex-col justify-between h-full shadow-2xl relative shrink-0">
              
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 backdrop-blur-md">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h2 id="handover-print-dialog-title" className="text-[0.875rem] leading-snug font-black uppercase tracking-wider text-white">Übergabe-Konfigurator</h2>
                    <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5 animate-pulse">Volksschule Mappen-Generator</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPrintModal(false)}
                  aria-label="Übergabe-Konfigurator schließen"
                  title="Schließen"
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sidebar Scroll Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
                
                {/* PRESETS BUTTONS */}
                <div className="space-y-2">
                  <p className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400">⚡ Schnelle Vorlagen (Zeitraum):</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        setRangeMode('single');
                        setSingleDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-2 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all text-slate-200"
                    >
                      Heute
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setRangeMode('single');
                        const tom = new Date();
                        tom.setDate(tom.getDate() + 1);
                        setSingleDate(tom.toISOString().split('T')[0]);
                      }}
                      className="px-2 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all text-slate-200"
                    >
                      Morgen
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setRangeMode('week');
                        setWeekDate(new Date().toISOString().split('T')[0]);
                      }}
                      className="px-2 py-2 bg-slate-900 border border-slate-800 hover:border-emerald-500 rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all text-slate-200"
                    >
                      Diese Woche
                    </button>
                  </div>
                </div>

                {/* RANGE CONFIG */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <div className="flex gap-2">
                    {['single', 'multi', 'week'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setRangeMode(mode as any)}
                        aria-pressed={rangeMode === mode}
                        className={`flex-1 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all ${
                          rangeMode === mode 
                            ? 'bg-indigo-600 text-white shadow' 
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {mode === 'single' ? 'Tag' : mode === 'multi' ? 'Bereich' : 'KW'}
                      </button>
                    ))}
                  </div>

                  {rangeMode === 'single' && (
                    <div className="space-y-1 bg-slate-950 p-2 text-slate-200 border border-slate-800 rounded-xl">
                      <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Datum auswählen:</label>
                      <input 
                        type="date" 
                        aria-label="Vertretungsdatum"
                        value={singleDate} 
                        onChange={e => setSingleDate(e.target.value)}
                        className="w-full bg-transparent text-slate-100 rounded px-2 py-1 text-[0.75rem] leading-tight font-bold outline-none"
                      />
                    </div>
                  )}

                  {rangeMode === 'multi' && (
                    <div className="grid grid-cols-2 gap-2 bg-slate-950 p-2 text-slate-200 border border-slate-800 rounded-xl">
                      <div className="space-y-1">
                        <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Startdatum:</label>
                        <input 
                          type="date" 
                          aria-label="Startdatum des Vertretungszeitraums"
                          value={startDate} 
                          onChange={e => setStartDate(e.target.value)}
                          className="w-full bg-transparent text-slate-100 rounded px-2 py-1 text-[0.6875rem] font-bold outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Enddatum:</label>
                        <input 
                          type="date" 
                          aria-label="Enddatum des Vertretungszeitraums"
                          value={endDate} 
                          onChange={e => setEndDate(e.target.value)}
                          className="w-full bg-transparent text-slate-100 rounded px-2 py-1 text-[0.6875rem] font-bold outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {rangeMode === 'week' && (
                    <div className="space-y-1 bg-slate-955 p-2 text-slate-200 border border-slate-800 rounded-xl">
                      <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Wähle einen Tag der Woche:</label>
                      <input 
                        type="date" 
                        aria-label="Tag der Vertretungswoche"
                        value={weekDate} 
                        onChange={e => setWeekDate(e.target.value)}
                        className="w-full bg-transparent text-slate-100 rounded px-2 py-1 text-[0.75rem] leading-tight font-bold outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* SCHULLEITUNG & NOTFALLDATEN */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400">🚨 Direktions- & Notfallkontakte:</p>
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="space-y-1 bg-slate-950 p-2 border border-slate-800 rounded-xl">
                      <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Schulleitung / direktion:</label>
                      <input 
                        type="text" 
                        aria-label="Schulleitung oder Direktion"
                        value={schulleitungName} 
                        onChange={e => setSchulleitungName(e.target.value)}
                        className="w-full bg-transparent text-slate-100 rounded px-1.5 py-0.5 text-[0.75rem] leading-tight font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1 bg-slate-955 p-2 border border-slate-800 rounded-xl">
                      <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Sekretariat Telefon:</label>
                      <input 
                        type="text" 
                        aria-label="Telefonnummer des Sekretariats"
                        value={sekretariatTel} 
                        onChange={e => setSekretariatTel(e.target.value)}
                        className="w-full bg-transparent text-slate-100 rounded px-1.5 py-0.5 text-[0.75rem] leading-tight font-bold outline-none"
                      />
                    </div>
                    <div className="space-y-1 bg-slate-950 p-2 border border-slate-800 rounded-xl">
                      <label className="text-[0.5rem] font-black text-indigo-400 uppercase">Betreuung Nachbarklasse:</label>
                      <input 
                        type="text" 
                        aria-label="Betreuende Lehrkraft der Nachbarklasse"
                        value={nachbarKlasse} 
                        onChange={e => setNachbarKlasse(e.target.value)}
                        className="w-full bg-transparent text-slate-100 rounded px-1.5 py-0.5 text-[0.75rem] leading-tight font-bold outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* DRUCKUMFANG (SEITENAUSWAHL) */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Layout size={14} />
                    Druckumfang (Mappen-Inhalt)
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { key: 'cover', label: 'Deckblatt / Infoseite' },
                      { key: 'overview', label: 'Tagesvertretungs-Abläufe' },
                      { key: 'list', label: 'Schülerstammdatenliste' },
                      { key: 'seating', label: 'Sitzplan-Anordnung' },
                      { key: 'feedback', label: 'Feedback-Rückmeldebogen' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setPrintPages(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                        aria-pressed={printPages[key as keyof typeof printPages]}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          printPages[key as keyof typeof printPages] 
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 font-extrabold shadow-sm' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 font-semibold hover:text-slate-300'
                        }`}
                      >
                        <span className="text-[0.75rem] leading-tight">{label}</span>
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          printPages[key as keyof typeof printPages] 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-800'
                        }`}>
                          {printPages[key as keyof typeof printPages] && <Check size={11} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* STUNDENBILDER ZUORDNEN */}
                <div className="space-y-4 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <label className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <Sparkles size={14} />
                      Stundenbilder zuordnen
                    </label>
                    <span className="text-[0.5rem] font-bold text-slate-400 uppercase">Leere Stunden füllen</span>
                  </div>

                  <div className="space-y-4">
                    {getDaysToPrint().map(date => {
                      const dName = getDayName(date);
                      const dateStr = date.toISOString().split('T')[0];
                      const kw = getISOWeek(date);

                      return (
                        <div key={dateStr} className="space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-850">
                          <p className="text-[0.625rem] font-extrabold text-indigo-400">{formatDate(date)}</p>
                          <div className="grid grid-cols-1 gap-2">
                            {LESSON_SLOT_NUMBERS.map(std => {
                              const stammFach = app.stammplan[dName]?.[std];
                              const wpItem = app.wochenplanung[kw]?.[dName]?.[std - 1];
                              const hasContent = stammFach || wpItem?.thema;
                              const assignmentKey = `${dateStr}-${std}`;

                              const isOverridden = assignedStundenbilder[assignmentKey];

                              if (hasContent && !isOverridden) {
                                return (
                                  <div key={std} className="flex items-center justify-between gap-2 p-2 bg-slate-900/40 border border-slate-850 rounded-lg">
                                    <div className="flex flex-col">
                                      <span className="text-[0.5625rem] font-bold text-slate-400">{std}. Std: {stammFach || wpItem?.fach}</span>
                                      <span className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-widest mt-0.5">Regulärer Stammplan</span>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        const firstSb = lessonPlans[0];
                                        if (firstSb) {
                                          setAssignedStundenbilder(prev => ({ ...prev, [assignmentKey]: firstSb.id }));
                                        } else {
                                          setAssignedStundenbilder(prev => ({ ...prev, [assignmentKey]: 'override-empty' }));
                                        }
                                      }}
                                      className="px-2 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 rounded-md text-[0.5625rem] font-black uppercase tracking-wider transition-colors"
                                    >
                                      Überschreiben
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div key={std} className={`flex items-center justify-between gap-2 p-2 bg-slate-900 border rounded-lg ${isOverridden ? 'border-amber-500/30 shadow-md shadow-amber-950/25' : 'border-slate-800'}`}>
                                  <div className="flex flex-col shrink-0">
                                    <span className="text-[0.59375rem] font-black text-slate-300">{std}. Std</span>
                                    {isOverridden && hasContent && (
                                      <span className="text-[0.5rem] font-bold text-amber-500 uppercase tracking-wider mt-0.5">Override</span>
                                    )}
                                  </div>
                                  <select 
                                    aria-label={`${std}. Stunde am ${formatDate(date)}: Stundenbild`}
                                    value={assignedStundenbilder[assignmentKey] || ''}
                                    onChange={(e) => setAssignedStundenbilder(prev => ({ ...prev, [assignmentKey]: e.target.value }))}
                                    className="flex-1 bg-transparent text-[0.65625rem] font-bold text-slate-200 outline-none cursor-pointer border-none p-0 focus:ring-0 animate-fade-in"
                                  >
                                    <option value="" className="bg-slate-950 text-slate-400">(Freie Stunde)</option>
                                    {lessonPlans.map(sb => (
                                      <option key={sb.id} value={sb.id} className="bg-slate-950 text-slate-100">{sb.titel} ({sb.dauer}m)</option>
                                    ))}
                                  </select>
                                  {hasContent && isOverridden && (
                                    <button 
                                      onClick={() => {
                                        setAssignedStundenbilder(prev => {
                                          const copy = { ...prev };
                                          delete copy[assignmentKey];
                                          return copy;
                                        });
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                                      title="Zurück zum Stammplan"
                                    >
                                      <RefreshCw size={11} />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    {getDaysToPrint().length === 0 && (
                      <p className="text-[0.625rem] text-slate-500 italic text-center py-4">Wähle zuerst einen Zeitraum aus.</p>
                    )}
                  </div>
                </div>

                {/* SPEZIELLE TAGESKOMMENTARE */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <p className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400">📝 Tagesbezogene Hinweise:</p>
                  <div className="space-y-3">
                    {getDaysToPrint().map(date => {
                      const dateStr = date.toISOString().split('T')[0];
                      return (
                        <div key={dateStr} className="space-y-1 bg-slate-950 p-2.5 border border-slate-850 rounded-xl">
                          <span className="text-[0.5625rem] font-black text-indigo-400 uppercase tracking-widest">{formatDate(date)}</span>
                          <textarea 
                            value={dayNotes[dateStr] || ''} 
                            onChange={e => setDayNotes(prev => ({ ...prev, [dateStr]: e.target.value }))}
                            placeholder="Anweisungen, Ausflüge oder Besonderheiten für diesen Tag..."
                            rows={2}
                            className="w-full bg-transparent text-slate-100 rounded text-[0.6875rem] font-semibold outline-none resize-none mt-1"
                          />
                        </div>
                      );
                    })}
                    {getDaysToPrint().length === 0 && (
                      <p className="text-[0.625rem] text-slate-500 italic text-center py-2">Wähle zuerst einen Zeitraum aus.</p>
                    )}
                  </div>
                </div>

                {/* GLOBALE HINWEISE/REGELN EDITIEREN */}
                <div className="space-y-2 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <FileText size={14} />
                    Allgemeine Mappen-Hinweise
                  </label>
                  <div className="h-44 border border-slate-800 rounded-xl  bg-white/5 relative">
                    <RichTextEditor
                      value={printNotes}
                      onChange={setPrintNotes}
                      placeholder="Regeln, Rituale, Pausenordnung, Besonderheiten..."
                      className="text-[0.75rem] leading-tight p-3 text-white placeholder-slate-500 bg-transparent min-h-full"
                    />
                  </div>
                </div>

                {/* SPALTENAUSWAHL KLASSENLISTE */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                    <Users size={14} />
                    Spalten Klassenliste
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-900 opacity-50">
                      <Check size={14} className="text-emerald-500 animate-pulse" />
                      <span className="text-[0.75rem] leading-tight text-slate-300 font-bold">Vorname</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950 border border-slate-900 opacity-50">
                      <Check size={14} className="text-emerald-500 animate-pulse" />
                      <span className="text-[0.75rem] leading-tight text-slate-300 font-bold">Nachname</span>
                    </div>
                    {Object.keys(printColumns).map((col) => (
                      <button
                        key={col}
                        onClick={() => setPrintColumns(prev => ({ ...prev, [col]: !prev[col] }))}
                        className={`flex items-center justify-between p-2 rounded-xl border transition-all text-left ${
                          printColumns[col] 
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold' 
                            : 'bg-slate-955 border-slate-850 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <span className="text-[0.75rem] leading-tight capitalize">{col.replace('_', ' ')}</span>
                        {printColumns[col] ? <Eye size={12} className="text-indigo-400" /> : <EyeOff size={12} className="text-slate-650" />}
                      </button>
                    ))}
                  </div>

                  {/* Orientation Selection */}
                  <div className="pt-2 space-y-3">
                    <p className="text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Ausrichtung Klassenliste:</p>
                    <div className="flex gap-2">
                      {[
                        { id: 'portrait', label: 'Hochformat', sub: 'Klassisches A4' },
                        { id: 'landscape', label: 'Querformat', sub: 'Extrabreit' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setKlassenlisteOrientation(opt.id as any)}
                          className={`flex-1 p-2 border rounded-xl text-left transition-all ${
                            klassenlisteOrientation === opt.id 
                              ? 'bg-indigo-600 border-indigo-600 text-white' 
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-350'
                          }`}
                        >
                          <p className="text-[0.75rem] leading-tight font-bold">{opt.label}</p>
                          <p className={`text-[0.5rem] ${klassenlisteOrientation === opt.id ? 'text-indigo-100' : 'text-slate-500'}`}>{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LAYOUT SPARDICHTE / DENSITY CONTROLS */}
                <div className="space-y-3 bg-slate-900 p-4 rounded-2xl border border-slate-800">
                  <label className="text-[0.5625rem] font-black uppercase tracking-widest text-emerald-400">📏 Layout-Spardichte (Liste):</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'standard', label: 'Fein (Standard)', sub: 'Standard A4 Zeilen' },
                      { id: 'compact', label: 'Dicht (Compact)', sub: 'Zusammengepresst' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDensity(opt.id as any)}
                        className={`flex-1 p-2 rounded-xl border text-left transition-all ${
                          density === opt.id 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow' 
                            : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <p className="text-[0.65625rem] font-black uppercase tracking-wider">{opt.label}</p>
                        <p className="text-[0.5rem] text-slate-500 leading-none mt-0.5">{opt.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* COMPETENCES / CURRICULS CONFIG */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-500/15 text-amber-500 rounded-lg">
                      <Book size={15} />
                    </div>
                    <div>
                      <p className="text-[0.75rem] leading-tight font-black uppercase text-slate-200">Lehrplan-Kompetenzen</p>
                      <p className="text-[0.5625rem] text-slate-450">Tageskompetenzen einblenden</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setPrintLehrplan(!printLehrplan)}
                    role="switch"
                    aria-label="Lehrplan-Kompetenzen drucken"
                    aria-checked={printLehrplan}
                    className={`w-10 h-5 rounded-full transition-all relative ${printLehrplan ? 'bg-emerald-500' : 'bg-slate-800'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${printLehrplan ? 'left-5.5' : 'left-0.5'}`} />
                  </button>
                </div>

              </div>

              {/* Sidebar Footer Buttons */}
              <div className="p-4 border-t border-slate-800 flex gap-2.5 bg-slate-950">
                <button 
                  onClick={() => setShowPrintModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold transition-colors text-[0.75rem] leading-tight"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={() => {
                    setApp(prev => ({ ...prev, vertretungHinweise: printNotes }));
                    setShowPrintModal(false);
                    setTimeout(() => window.print(), 350);
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold transition-all shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-1.5 text-[0.75rem] leading-tight"
                >
                  <Printer size={14} />
                  Mappe drucken
                </button>
              </div>

            </div>

            {/* RIGHT BAR: LIVE PRINT PREVIEW WORKSPACE */}
            <div className="flex-1 bg-slate-900 flex flex-col h-full  relative">
              
              {/* Preview Toolbar with Zoom level & Info */}
              <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 backdrop-blur-md z-10 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-slate-200">Interaktive Live-Vorschau (WYSIWYG)</p>
                </div>
                
                {/* Zoom Controls */}
                <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 select-none">
                  <span className="text-[0.625rem] font-black tracking-widest text-slate-450 uppercase">Zoom:</span>
                  <button 
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.max(0.4, Number((prev - 0.1).toFixed(1))))}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 bg-slate-900 text-[0.875rem] leading-snug font-black text-slate-300 transition-colors"
                  >
                    -
                  </button>
                  <span className="text-[0.75rem] leading-tight font-black font-mono tracking-tighter text-emerald-400 min-w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button 
                    type="button"
                    onClick={() => setZoomLevel(prev => Math.min(1.2, Number((prev + 0.1).toFixed(1))))}
                    className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-800 bg-slate-900 text-[0.875rem] leading-snug font-black text-slate-300 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Scrollable Workspace mimicking a draft review board */}
              <div className="flex-1 overflow-auto p-10 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px] bg-slate-950/20 flex flex-col items-center">
                
                {/* A4 Page list renderer with dynamic CSS scale */}
                <div className="flex flex-col gap-12 items-center pb-20 origin-top transition-transform duration-150" style={{ transform: `scale(${zoomLevel})` }}>
                  {renderAllPages(true).map((page, idx) => {
                    const isLandscape = (page as any).key === 'page-list' && klassenlisteOrientation === 'landscape';
                    const dimensionsStyle = isLandscape ? { width: '297mm', height: '210mm' } : { width: '210mm', height: '297mm' };
                    return (
                      <div 
                        key={idx} 
                        style={dimensionsStyle}
                        className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-slate-850 rounded-sm relative shrink-0 text-left overflow-hidden"
                      >
                        {page}
                      </div>
                    );
                  })}
                  {renderAllPages(true).length === 0 && (
                    <div className="p-16 bg-slate-900 border border-slate-850 rounded-3xl text-center text-slate-400 font-bold max-w-sm mt-12">
                      <p className="text-[0.875rem] leading-snug">Keine Seiten ausgewählt</p>
                      <p className="text-[0.6875rem] text-slate-550 font-medium mt-1">Aktiviere Mappen-Seiten im Druckumhang-Menü auf der linken Seite.</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}
      </AnimatePresence>

      {/* PAGE 4: DETAILED LESSON PLANS */}
        {getDaysToPrint().flatMap(date => {
          const dateStr = date.toISOString().split('T')[0];
          return LESSON_SLOT_NUMBERS.map(std => {
            const id = assignedStundenbilder[`${dateStr}-${std}`];
            return lessonPlans.find(m => m.id === id);
          }).filter(Boolean);
        }).reduce((acc: any[], curr) => {
          if (curr && !acc.some(a => a.id === curr.id)) acc.push(curr);
          return acc;
        }, []).map((sb) => (
          <div key={sb.id} className="p-[1.5cm] flex flex-col gap-6 min-h-screen printable-page" style={{ pageBreakAfter: 'always' }}>
            <div className="border-b-4 border-black pb-4 flex justify-between items-end">
              <div>
                <span className={`px-3 py-1 rounded-lg text-[0.75rem] leading-tight font-black uppercase tracking-wider inline-block mb-3 ${
                  sb.fach === 'Deutsch' ? 'bg-rose-50 text-rose-600' :
                  sb.fach === 'Mathematik' ? 'bg-amber-50 text-amber-600' :
                  sb.fach === 'Sachunterricht' ? 'bg-emerald-50 text-emerald-600' :
                  'bg-slate-50 text-slate-600'
                }`}>
                  {sb.fach}
                </span>
                <h1 className="text-4xl font-black uppercase tracking-tight">{sb.titel}</h1>
                <p className="text-[1.25rem] leading-normal font-bold text-stone-500">Stundenbild für die Volksschule ({sb.schulstufen.join(', ')}. Stufe)</p>
              </div>
              <div className="text-right">
                <div className="flex gap-4 mb-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black uppercase text-stone-400">Dauer</span>
                    <span className="font-bold text-[1.125rem] leading-normal">{sb.dauer} Min.</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[0.5625rem] font-black uppercase text-stone-400">Level</span>
                    <span className="font-bold text-[1.125rem] leading-normal capitalize">{sb.schwierigkeit}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <section>
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-indigo-500 mb-2 border-b border-indigo-100 flex items-center gap-2">
                    <Book size={14} /> Lernziel
                  </h3>
                  <p className="text-[0.875rem] leading-snug border-l-4 border-indigo-500 pl-4 py-1 font-medium leading-relaxed italic">
                    {sb.lernziel}
                  </p>
                </section>

                <section>
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-emerald-500 mb-2 border-b border-emerald-100 flex items-center gap-2">
                    <Zap size={14} /> Benötigtes Material
                  </h3>
                  <ul className="list-disc list-inside text-[0.875rem] leading-snug space-y-1 pl-2">
                    {sb.benoetigtesMaterial.map((m, i) => <li key={i} className="font-medium">{m}</li>)}
                    {sb.benoetigtesMaterial.length === 0 && <li className="italic text-stone-400">Kein spezielles Material nötig</li>}
                  </ul>
                </section>

                <section>
                   <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-stone-400 mb-2 border-b border-stone-100">Schlagworte</h3>
                   <div className="flex flex-wrap gap-2">
                      {sb.tags.map(t => <span key={t} className="px-2 py-1 bg-stone-100 rounded text-[0.625rem] font-bold text-stone-600">#{t}</span>)}
                   </div>
                </section>
              </div>

              <div className="space-y-6">
                <section className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-800 mb-4 flex items-center gap-2">
                    <FileText size={16} /> Ablauf / Durchführung
                  </h3>
                  <div className="space-y-6">
                    {sb.beschreibung.split('\n').map((phase, i) => {
                      const [title, ...content] = phase.split(':');
                      if (!content.length) return <p key={i} className="text-[0.875rem] leading-snug leading-relaxed">{phase}</p>;
                      return (
                        <div key={i}>
                          <p className="text-[0.6875rem] font-black uppercase text-indigo-600 tracking-wider mb-1">{title}</p>
                          <p className="text-[0.875rem] leading-snug leading-relaxed font-medium text-slate-700">{content.join(':').trim()}</p>
                        </div>
                      );
                    })}
                  </div>
                </section>
                
                <div className="pt-10">
                   <div className="h-32 border-2 border-dashed border-stone-200 rounded-2xl p-4 relative">
                      <span className="absolute top-[-10px] left-4 bg-white px-2 text-[0.625rem] font-black uppercase text-stone-400">Anmerkungen der Vertretung</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* SINGLE PRINT VIEW */}
        {showSinglePrint && selectedStundenbild && (
          <div className="fixed inset-0 z-[300] bg-white text-black p-[2cm] print:block overflow-auto no-print-hidden">
             <div className="max-w-4xl mx-auto space-y-10">
                <div className="border-b-8 border-indigo-600 pb-6 flex justify-between items-end">
                   <div>
                     <span className="text-[1.125rem] leading-normal font-black text-indigo-600 uppercase tracking-[0.2em]">{selectedStundenbild.fach}</span>
                     <h1 className="text-6xl font-black uppercase tracking-tighter leading-none mt-2">{selectedStundenbild.titel}</h1>
                   </div>
                   <div className="flex gap-10">
                      <div className="text-center">
                        <p className="text-[0.625rem] font-black uppercase text-stone-400 mb-1">Stufe</p>
                        <p className="text-[1.5rem] leading-normal font-black">{selectedStundenbild.schulstufen.join(', ')}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.625rem] font-black uppercase text-stone-400 mb-1">Dauer</p>
                        <p className="text-[1.5rem] leading-normal font-black">{selectedStundenbild.dauer} min</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[0.625rem] font-black uppercase text-stone-400 mb-1">Level</p>
                        <p className="text-[1.5rem] leading-normal font-black capitalize">{selectedStundenbild.schwierigkeit}</p>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
                   <div className="md:col-span-4 space-y-8">
                      <section>
                        <h2 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-indigo-600 mb-4 flex items-center gap-2">
                           <Book className="text-indigo-600" size={18} /> Lernziel
                        </h2>
                        <div className="text-[1.125rem] leading-normal font-bold text-slate-800 leading-tight border-l-4 border-indigo-600 pl-4 markdown-body">
                         <Markdown>{selectedStundenbild.lernziel}</Markdown>
                       </div>
                      </section>

                      <section>
                        <h2 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                           <Zap className="text-emerald-600" size={18} /> Material
                        </h2>
                        <ul className="space-y-2">
                          {selectedStundenbild.benoetigtesMaterial.map((m, i) => (
                            <li key={i} className="flex items-center gap-3 font-bold text-slate-700">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                               {m}
                            </li>
                          ))}
                        </ul>
                      </section>

                      <section className="pt-8 opacity-40">
                         <div className="flex flex-wrap gap-2">
                            {selectedStundenbild.tags.map(t => <span key={t} className="text-[0.75rem] leading-tight font-black uppercase">#{t}</span>)}
                         </div>
                      </section>
                   </div>

                   <div className="md:col-span-8">
                      <div className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-sm">
                         <h2 className="text-[0.875rem] leading-snug font-black uppercase tracking-widest text-slate-900 mb-8 flex items-center gap-3">
                            <FileText size={20} /> Durchführung & Phasen
                         </h2>
                         <div className="space-y-10">
                           {selectedStundenbild.beschreibung.split('\n').filter(Boolean).map((p, i) => {
                             const [title, ...body] = p.split(':');
                             return (
                               <div key={i} className="relative pl-8">
                                  <div className="absolute left-0 top-1 w-0.5 h-full bg-slate-200" />
                                  <div className="absolute left-[-4px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-600" />
                                  <h3 className="text-[0.75rem] leading-tight font-black uppercase text-indigo-600 tracking-widest mb-2">{title}</h3>
                                  <p className="text-[1.25rem] leading-normal font-medium text-slate-800 leading-relaxed">{body.join(':')}</p>
                               </div>
                             );
                           })}
                         </div>
                      </div>

                      <div className="mt-12">
                         <div className="h-40 border-2 border-dashed border-stone-300 rounded-[2rem] p-6 relative">
                            <span className="absolute top-[-12px] left-8 bg-white px-3 text-[0.75rem] leading-tight font-black uppercase text-stone-400">Anmerkungen & Reflexion der Vertretung</span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="text-center pt-8 border-t border-slate-100 no-print">
                   <button 
                     onClick={() => setShowSinglePrint(false)}
                     className="btn border border-stone-200 px-8"
                   >
                     Druckansicht schließen
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* --- MODALS --- */}
        {/* Detail Modal */}
        <AnimatePresence>
        {showDetailModal && selectedStundenbild && !showSinglePrint && (
           <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl  flex flex-col max-h-[90vh]"
              >
                <div className="p-8 pb-4 flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[0.625rem] font-black uppercase tracking-wider">{selectedStundenbild.fach}</span>
                        <div className="flex gap-1">
                          {selectedStundenbild.schulstufen.map(st => <span key={st} className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[0.5625rem] font-black">{st}</span>)}
                        </div>
                      </div>
                      <h2 className="text-[1.875rem] leading-tight font-black text-slate-800 tracking-tight leading-none pt-2">{selectedStundenbild.titel}</h2>
                   </div>
                   <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} /></button>
                </div>

                <div className="p-8 pt-4 overflow-y-auto space-y-8 flex-1">
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                         <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Clock size={18} /></div>
                         <div><p className="text-[0.625rem] font-black uppercase text-slate-400">Dauer</p><p className="text-[0.875rem] leading-snug font-bold text-slate-700">{selectedStundenbild.dauer} Min.</p></div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                         <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Zap size={18} /></div>
                         <div><p className="text-[0.625rem] font-black uppercase text-slate-400">Level</p><p className="text-[0.875rem] leading-snug font-bold text-slate-700 capitalize">{selectedStundenbild.schwierigkeit}</p></div>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-2xl flex items-center gap-3">
                         <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><BookOpen size={18} /></div>
                         <div><p className="text-[0.625rem] font-black uppercase text-emerald-400">Status</p><p className="text-[0.875rem] leading-snug font-bold text-emerald-700">{selectedStundenbild.zuletztVerwendet ? 'Schon mal verwendet' : 'Neu / Unbenutzt'}</p></div>
                      </div>
                   </div>

                   <section>
                      <h4 className="text-[0.75rem] leading-tight font-black uppercase text-indigo-500 tracking-widest mb-3 flex items-center gap-2"><Book size={14} /> Lernziel</h4>
                      <div className="text-slate-600 font-medium italic leading-relaxed bg-indigo-50/30 p-4 rounded-2xl border-l-4 border-indigo-500 markdown-body">
                        <Markdown>{selectedStundenbild.lernziel}</Markdown>
                      </div>
                   </section>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section>
                        <h4 className="text-[0.75rem] leading-tight font-black uppercase text-emerald-500 tracking-widest mb-3 flex items-center gap-2"><Zap size={14} /> Benötigtes Material</h4>
                        <div className="flex flex-wrap gap-2">
                           {selectedStundenbild.benoetigtesMaterial.map((m, i) => (
                             <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-[0.75rem] leading-tight font-bold border border-emerald-100">{m}</span>
                           ))}
                           {selectedStundenbild.benoetigtesMaterial.length === 0 && <p className="text-[0.75rem] leading-tight text-slate-400 italic">Kein spezielles Material erforderlich.</p>}
                        </div>
                      </section>
                      <section>
                         <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-400 tracking-widest mb-3">Tags</h4>
                         <div className="flex flex-wrap gap-2">
                            {selectedStundenbild.tags.map(t => <span key={t} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[0.625rem] font-bold">#{t}</span>)}
                         </div>
                      </section>
                   </div>

                   <section className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                      <h4 className="text-[0.75rem] leading-tight font-black uppercase text-slate-800 tracking-widest mb-4 flex items-center gap-2"><FileText size={14} /> Detaillierter Ablauf</h4>
                      <div className="space-y-6">
                        {selectedStundenbild.beschreibung.split('\n').filter(Boolean).map((p, i) => {
                           const [title, ...body] = p.split(':');
                           return (
                             <div key={i} className="space-y-1">
                                <p className="text-[0.625rem] font-black uppercase text-indigo-600 tracking-wider font-mono">{title}</p>
                                <p className="text-[0.875rem] leading-snug font-medium text-slate-700 leading-relaxed">{body.join(':')}</p>
                             </div>
                           );
                        })}
                      </div>
                   </section>
                </div>

                <div className="p-8 pt-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-3">
                   
                   <button 
                     onClick={() => {
                       handleMarkUsed(selectedStundenbild.id);
                       setShowDetailModal(false);
                     }}
                     className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 px-6 h-14"
                   >
                     <Check size={20} />
                     Als verwendet markieren
                   </button>
                   <button 
                     onClick={() => {
                       const editCopy = selectedStundenbild.istEigeneVorlage 
                        ? { ...selectedStundenbild } 
                        : { ...selectedStundenbild, id: undefined, istEigeneVorlage: true, titel: `${selectedStundenbild.titel} (Kopie)` };
                       setEditingStundenbild(editCopy);
                       setIsEditing(true);
                       setShowDetailModal(false);
                     }}
                     className="btn bg-white border border-slate-200 text-slate-600 flex items-center gap-2 px-6 h-14"
                   >
                     <Edit3 size={20} />
                     {selectedStundenbild.istEigeneVorlage ? 'Bearbeiten' : 'Vorlage kopieren & anpassen'}
                   </button>
                   {selectedStundenbild.istEigeneVorlage && (
                     <button 
                       onClick={() => {
                         handleDeleteStundenbild(selectedStundenbild.id);
                         setShowDetailModal(false);
                       }}
                       className="p-4 text-rose-500 hover:bg-rose-50 rounded-2xl transition-all ml-auto"
                     >
                       <Trash2 size={24} />
                     </button>
                   )}
                </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl  flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">
                  {editingStundenbild?.id ? 'Stundenbild bearbeiten' : 'Neues Stundenbild erstellen'}
                </h3>
                <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400">Titel</label>
                      <input 
                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={editingStundenbild?.titel || ''}
                        onChange={e => setEditingStundenbild(prev => ({ ...prev!, titel: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400">Fach</label>
                      <select 
                        className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                        value={editingStundenbild?.fach || ''}
                        onChange={e => setEditingStundenbild(prev => ({ ...prev!, fach: e.target.value }))}
                      >
                        {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[0.625rem] font-black uppercase text-slate-400">Schulstufen</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              const current = editingStundenbild?.schulstufen || [];
                              const next = current.includes(s) ? current.filter(st => st !== s) : [...current, s];
                              setEditingStundenbild(prev => ({ ...prev!, schulstufen: next }));
                            }}
                            className={`w-10 h-10 rounded-xl text-[0.75rem] leading-tight font-black transition-all ${editingStundenbild?.schulstufen?.includes(s) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Dauer (Min)</label>
                          <input 
                            type="number" 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={editingStundenbild?.dauer || ''}
                            onChange={e => setEditingStundenbild(prev => ({ ...prev!, dauer: parseInt(e.target.value) }))}
                          />
                       </div>
                       <div className="space-y-1">
                          <label className="text-[0.625rem] font-black uppercase text-slate-400">Schwierigkeit</label>
                          <select 
                            className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-bold focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                            value={editingStundenbild?.schwierigkeit || 'mittel'}
                            onChange={e => setEditingStundenbild(prev => ({ ...prev!, schwierigkeit: e.target.value as any }))}
                          >
                            <option value="einfach">Einfach</option>
                            <option value="mittel">Mittel</option>
                            <option value="anspruchsvoll">Anspruchsvoll</option>
                          </select>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <div className="flex justify-between items-center">
                       <label className="text-[0.625rem] font-black uppercase text-slate-400">Lernziel & Details</label>
                       <button 
                         onClick={handleAiSuggest}
                         disabled={isAiLoading}
                         className="text-[0.625rem] font-black uppercase text-indigo-600 flex items-center gap-1 hover:bg-indigo-50 px-2 py-1 rounded transition-all disabled:opacity-50"
                       >
                         {isAiLoading ? <Clock size={12} className="animate-spin" /> : <Sparkles size={12} />}
                         KI Vorschlag Generieren
                       </button>
                    </div>
                    <label className="text-[0.625rem] font-bold text-slate-400">Lernziel</label>
                    <input 
                      placeholder="Was sollen die Kinder lernen?"
                      className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                      value={editingStundenbild?.lernziel || ''}
                      onChange={e => setEditingStundenbild(prev => ({ ...prev!, lernziel: e.target.value }))}
                    />
                    <label className="text-[0.625rem] font-bold text-slate-400">Ablauf (Phasen mit ":" trennen, z.B. Einstieg: ...)</label>
                    <textarea 
                      placeholder="Einstieg: ...&#10;Arbeitsphase: ...&#10;Reflexion: ..."
                      className="w-full h-40 p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                      value={editingStundenbild?.beschreibung || ''}
                      onChange={e => setEditingStundenbild(prev => ({ ...prev!, beschreibung: e.target.value }))}
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400">Material & Tags</label>
                    <input 
                      placeholder="Materialien (mit Komma trennen)"
                      className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                      value={editingStundenbild?.benoetigtesMaterial?.join(', ') || ''}
                      onChange={e => setEditingStundenbild(prev => ({ ...prev!, benoetigtesMaterial: e.target.value.split(',').map(m => m.trim()).filter(Boolean) }))}
                    />
                    <input 
                      placeholder="Tags / Schlagworte (mit Komma trennen)"
                      className="w-full p-3 bg-slate-50 border-none rounded-xl text-[0.875rem] leading-snug font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editingStundenbild?.tags?.join(', ') || ''}
                      onChange={e => setEditingStundenbild(prev => ({ ...prev!, tags: e.target.value.split(',').map(m => m.trim()).filter(Boolean) }))}
                    />
                 </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                 <button onClick={() => setIsEditing(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold">Abbrechen</button>
                 <button onClick={handleSaveStundenbild} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100">Speichern</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="hidden print:block print:bg-white text-black p-0 m-0 w-full print-only overflow-visible">
        {renderAllPages(false)}
      </div>

        {/* PAGE 4: SCHULWECHSEL-PAKET (Individuell) */}
        {showTransferPrint && transferStudentId && (
          <div className="fixed inset-0 z-[300] bg-white overflow-y-auto no-scrollbar scroll-smooth">
             <div className="max-w-4xl mx-auto p-[1cm] space-y-8 bg-white text-black min-h-screen relative">
                
                {/* Print Header/Controls */}
                <div className="flex justify-between items-center print:hidden bg-slate-50 p-6 rounded-3xl mb-12 border border-slate-200">
                   <div className="flex items-center gap-4">
                      <button onClick={() => setShowTransferPrint(false)} className="p-3 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all cursor-pointer"><ArrowLeft size={20} /></button>
                      <div>
                        <h2 className="text-[1.25rem] leading-normal font-black text-slate-900">Vorschau: Übergabepaket</h2>
                        <p className="text-[0.75rem] leading-tight text-slate-500 font-bold uppercase tracking-widest">Dokument prüfen und ausdrucken oder als PDF speichern</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => window.print()}
                     className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl text-[0.8125rem] tracking-wide flex items-center gap-2 shadow-lg shadow-amber-100 transition-all active:scale-95"
                   >
                     <Printer size={16} />
                     Paket drucken / PDF
                   </button>
                </div>

                {/* THE ACTUAL DOCUMENT */}
                <div className="space-y-12 printable-dossier">
                   {/* Cover Page */}
                   <div className="text-center py-20 space-y-20 flex flex-col items-center justify-center min-h-[90vh]">
                      <div className="space-y-4">
                        <div className="w-24 h-24 bg-slate-50 rounded-4xl flex items-center justify-center text-slate-300 mx-auto border border-slate-100"><ClipboardList size={48} /></div>
                        <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900">Schulwechsel-Paket</h1>
                        <div className="h-1 w-20 bg-amber-500 mx-auto rounded-full"></div>
                        <p className="text-[1.25rem] leading-normal font-black text-slate-400 uppercase tracking-[0.3em]">Übergabe-Dossier</p>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[0.875rem] leading-snug font-black uppercase text-slate-400">Erstellt für</p>
                        <h2 className="text-4xl font-black text-slate-900">{getStudentName(transferStudentId)}</h2>
                        <p className="text-[1.125rem] leading-normal font-bold text-slate-500 uppercase tracking-widest">{app.stufe}. Schulstufe • Klasse {app.klassenbezeichnung}</p>
                      </div>

                      <div className="pt-20 grid grid-cols-2 gap-20 text-left w-full max-w-2xl border-t border-slate-100 mt-20">
                         <div>
                            <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-1">Datum</p>
                            <p className="font-bold">{new Date().toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                         </div>
                         <div>
                            <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-1">Ausstellende Lehrperson</p>
                            <p className="font-bold">{app.lehrerName || app.lehrerProfil?.name || 'Klassenlehrer:in'}</p>
                         </div>
                      </div>
                   </div>

                   <hr className="border-slate-100 border-2" />

                   {/* Data Sections */}
                   <div className="space-y-12">
                       {transferModules.stammdaten && (
                         <section className="space-y-6">
                         <h3 className="text-[1.5rem] leading-normal font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                           <User className="text-amber-500" /> Stammdaten & Schulauschnitt
                         </h3>
                         <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                  <p className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1">Voller Name</p>
                                  <p className="font-black text-[1.125rem] leading-normal">{getStudentName(transferStudentId)}</p>
                               </div>
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                  <p className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1">Geburtsdatum</p>
                                  <p className="font-black text-[1.125rem] leading-normal">{app.schueler.find(s => s.id === transferStudentId)?.geburtstag || '--'}</p>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <div className="bg-slate-50 p-4 rounded-2xl">
                                  <p className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1">Schule</p>
                                  <p className="font-black text-[1.125rem] leading-normal">{app.schulName || 'Volksschule'}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                   <p className="text-[0.5625rem] font-black uppercase text-slate-400 mb-1">Religionsbekenntnis</p>
                                   <p className="font-black text-[1.125rem] leading-normal">{app.schueler.find(s => s.id === transferStudentId)?.religion || '--'}</p>
                                </div>
                             </div>
                          </div>
                       </section>
                      )}


                      {transferModules.leistungen && (
                        <section className="space-y-4">
                          <h3 className="text-[1.5rem] leading-normal font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                            <BarChart3 className="text-emerald-500" /> Leistungsstand
                          </h3>
                          {transferGradeRows.length > 0 ? (
                            <div className="overflow-hidden rounded-2xl border border-slate-200">
                              <table className="w-full text-left text-[0.875rem]">
                                <thead className="bg-slate-50">
                                  <tr>
                                    <th className="p-3 font-black">Fach</th>
                                    <th className="p-3 font-black">1. Semester</th>
                                    <th className="p-3 font-black">2. Semester</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transferGradeRows.map(row => (
                                    <tr key={row.fach} className="border-t border-slate-100">
                                      <td className="p-3 font-bold">{row.fach}</td>
                                      <td className="p-3">{row.semester1}</td>
                                      <td className="p-3">{row.semester2}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold italic">
                              Keine Leistungsdaten erfasst.
                            </p>
                          )}
                          <p className="text-[0.625rem] text-slate-400 font-bold">
                            Prozent- und Punktebewertung werden als berechneter Gesamtstand in Prozent ausgegeben; Notenmodus als Notenwert.
                          </p>
                        </section>
                      )}

                      {/* Notizen */}
                      {transferModules.beobachtungen && (
                        <section className="space-y-4">
                           <h3 className="text-[1.5rem] leading-normal font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                             <FileText className="text-indigo-500" /> Pädagogische Beobachtungen
                           </h3>
                           <div className="p-8 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl min-h-32 text-[1.125rem] leading-normal italic leading-relaxed text-slate-700">
                              {transferNotes.map((note) => (
                                <div key={note.id} className="mb-4">
                                   <span className="text-[0.625rem] font-black uppercase text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">{note.datum || 'Ohne Datum'}</span>
                                   <p className="mt-1">{note.inhalt}</p>
                                </div>
                              ))}
                              {transferNotes.length === 0 && <p className="text-slate-400">Keine aktuellen Notizen vorhanden.</p>}
                           </div>
                        </section>
                      )}

                      {/* IKM RESULTS */}
                      {transferModules.ikm && (
                        <section className="space-y-4">
                           <h3 className="text-[1.5rem] leading-normal font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                             <FileCheck className="text-blue-500" /> IKM Plus Ergebnisse
                           </h3>
                           {app.ikmRecords?.find(r => r.schuelerId === transferStudentId) ? (
                             <div className="grid grid-cols-2 gap-4">
                                {(() => {
                                  const rec = app.ikmRecords.find(r => r.schuelerId === transferStudentId);
                                  return (
                                    <>
                                      <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col justify-between">
                                         <span className="text-[0.625rem] font-black uppercase text-slate-500">Deutsch Lesen</span>
                                         <span className="text-4xl font-black mt-2">{rec.deutschLesenPR || '--'} <span className="text-[0.875rem] leading-snug font-bold opacity-40 uppercase">Percentil</span></span>
                                      </div>
                                      <div className="p-6 bg-slate-900 text-white rounded-3xl flex flex-col justify-between">
                                         <span className="text-[0.625rem] font-black uppercase text-slate-500">Mathematik</span>
                                         <span className="text-4xl font-black mt-2">{rec.mathematikPR || '--'} <span className="text-[0.875rem] leading-snug font-bold opacity-40 uppercase">Percentil</span></span>
                                      </div>
                                      <div className="col-span-2 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                         <p className="text-[0.625rem] font-black uppercase text-slate-400 mb-2">KI-Diagnose & Empfehlung</p>
                                         <p className="text-[0.875rem] leading-snug font-bold leading-relaxed">{rec.kommentar || 'Keine KI-Analysedaten vorhanden.'}</p>
                                      </div>
                                    </>
                                  );
                                })()}
                             </div>
                           ) : (
                             <p className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold italic">Keine IKM Plus Ergebnisse erfasst.</p>
                           )}
                        </section>
                      )}


                      {transferModules.diagnostik && (
                        <section className="space-y-4">
                          <h3 className="text-[1.5rem] leading-normal font-black uppercase tracking-tight flex items-center gap-3 border-b-2 border-slate-900 pb-2">
                            <Activity className="text-purple-500" /> Diagnostik & Förderbedarf
                          </h3>
                          {transferDiagnosticResults.length > 0 ? (
                            <div className="space-y-3">
                              {transferDiagnosticResults.map(result => {
                                const definition = getDiagnosticTestById(result.testId);
                                return (
                                  <div key={result.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-start justify-between gap-4">
                                      <div>
                                        <p className="font-black text-slate-900">{definition?.title || result.testId}</p>
                                        <p className="text-[0.6875rem] font-bold text-slate-400">
                                          {result.date} · Niveau {result.gradeLevel || app.stufe}
                                        </p>
                                      </div>
                                      <span className="text-[0.6875rem] font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">
                                        {result.competencyResults?.length || 0} Kompetenzen
                                      </span>
                                    </div>
                                    {result.nextStep && (
                                      <div className="mt-3 pt-3 border-t border-slate-200">
                                        <p className="text-[0.625rem] font-black uppercase text-slate-400">Nächster pädagogischer Schritt</p>
                                        <p className="mt-1 text-[0.8125rem] font-bold text-slate-700">{result.nextStep}</p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="p-8 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400 font-bold italic">
                              Keine Ergebnisse aus dem kompetenzorientierten Diagnostiksystem erfasst.
                            </p>
                          )}
                        </section>
                      )}
                   </div>

                   <hr className="border-slate-100 border-2" />

                   {/* Closing/Signature Section */}
                   <div className="pt-20 flex justify-between items-end">
                      <div className="space-y-12">
                         <div className="w-48 border-b border-black"></div>
                         <p className="text-[0.875rem] leading-snug font-black uppercase text-slate-400 tracking-widest">Unterschrift Schulleitung</p>
                      </div>
                      <div className="space-y-12 text-right">
                         <div className="w-48 border-b border-black ml-auto"></div>
                         <p className="text-[0.875rem] leading-snug font-black uppercase text-slate-400 tracking-widest">Unterschrift Klassenlehrer:in</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html { 
            background: white !important; 
            color: black !important;
            font-family: "Inter", ui-sans-serif, system-ui, sans-serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hidden, .no-print, .print-hidden * { display: none !important; opacity: 0 !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; }
          .printable-page { 
            page-break-after: always; 
            min-height: 100vh; 
            display: block !important; 
            overflow: visible !important; 
            box-sizing: border-box !important;
          }
          
          /* Strong typographical hierarchies */
          h1, .h1 {
            font-size: 26pt !important;
            font-weight: 900 !important;
            letter-spacing: -0.025em !important;
            line-height: 1.15 !important;
            color: #18181b !important;
            margin: 0 0 8pt 0 !important;
            text-transform: uppercase !important;
          }
          h2, .h2 {
            font-size: 16pt !important;
            font-weight: 800 !important;
            letter-spacing: -0.02em !important;
            line-height: 1.25 !important;
            color: #27272a !important;
            border-bottom: 2px solid #e4e4e7 !important;
            padding-bottom: 4px !important;
            margin: 0 0 10pt 0 !important;
          }
          h3, .h3 {
            font-size: 12pt !important;
            font-weight: 800 !important;
            letter-spacing: -0.015em !important;
            color: #3f3f46 !important;
            margin: 0 0 6pt 0 !important;
          }
          p {
            margin: 0 0 6pt 0 !important;
            line-height: 1.4 !important;
          }
          
          /* Refined tables for print stability */
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            margin-top: 8px !important;
            border: 1.5px solid #09090b !important;
          }
          th {
            border: 1px solid #181a1b !important;
            background-color: #f4f4f5 !important;
            color: #09090b !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            font-size: 8pt !important;
            letter-spacing: 0.05em !important;
            padding: 8px 10px !important;
          }
          td {
            border: 0.75px solid #27272a !important;
            padding: 8px 10px !important;
            vertical-align: top !important;
          }
          
          @page { size: auto; margin: 15mm; }
          @page landscapePage { size: landscape; margin: 15mm; }
          .klassenliste-landscape {
            page: landscapePage !important;
            width: 267mm !important;
            max-width: 267mm !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-sizing: border-box;
          }
          .no-print-hidden {
             display: block !important;
          }
        }
      `}} />
    </div>
  );
}
