
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { getSchulstartKW, kwToMonday, getStartYear, kwYear, isHoliday, getKW, getSW, sortYearlySubjects } from '../lib/utils';
import { DEFAULT_YEARLY_SUBJECTS, DEUTSCH_UNTERFAECHER } from '../constants';
import { Calendar, Printer, Download, ChevronRight, Edit3, Save, X, Info, FileText, Settings, Plus, Trash2, Flag, Star, ChevronDown, ChevronUp, AlertCircle, MapPin, ArrowDown, PartyPopper, MessageSquare, Users, Sparkles, Copy, Clipboard, Palette, Check, LayoutGrid, Search, EyeOff, BookOpen, Maximize2, Minimize2, FileSpreadsheet, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LernzielTracker from './LernzielTracker';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import { callServerAI } from '../services/aiService';
import JahresplanExcelModal from './JahresplanExcelModal';
import { JahresplanImportRow } from '../lib/planerExcelService';
import { applyYearPlanImportRows, shiftYearPlanSubjectForward, yearPlanCellDisplayText, yearPlanCellEntries } from '../lib/yearlyPlanData';
import { occupiedYearPlanCell, plannedYearWeeks, conflictingYearWeeks } from '../lib/annualPlanSafety';

const COLOR_PALETTES: Record<string, { name: string, desc: string, colors: Record<string, string> }> = {
  pastell: {
    name: 'Pastell-Klassiker',
    desc: 'Sanfte, klassische Schulfarben',
    colors: {
      deutsch_sprache: 'bg-rose-100/90 border-rose-300 text-rose-950 font-bold',
      deutsch_rs: 'bg-emerald-105 border-emerald-300 text-emerald-950 font-bold',
      deutsch_vvt: 'bg-orange-100/90 border-orange-300 text-orange-950 font-bold',
      lesen: 'bg-blue-100/90 border-blue-300 text-blue-950 font-bold',
      lernwoerter: 'bg-indigo-100/90 border-indigo-300 text-indigo-950 font-bold',
      checks: 'bg-red-100/90 border-red-300 text-red-950 font-bold',
      mathe_et: 'bg-amber-100/90 border-amber-300 text-amber-950 font-bold',
      mathe_ut: 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold',
      sachunterricht: 'bg-stone-100/90 border-stone-300 text-stone-950 font-bold',
      sonstiges: 'bg-slate-100/90 border-slate-300 text-slate-950 font-bold',
    }
  },
  nordic: {
    name: 'Nordic Forest',
    desc: 'Natürliche, beruhigende Wald- & Erdtöne',
    colors: {
      deutsch_sprache: 'bg-teal-100 border-teal-300 text-teal-950 font-bold',
      deutsch_rs: 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold',
      deutsch_vvt: 'bg-stone-200 border-stone-300 text-stone-900 font-bold',
      lesen: 'bg-cyan-100 border-cyan-300 text-cyan-950 font-bold',
      lernwoerter: 'bg-indigo-100 border-indigo-300 text-indigo-950 font-bold',
      checks: 'bg-orange-100 border-orange-300 text-orange-950 font-bold',
      mathe_et: 'bg-amber-100 border-amber-300 text-amber-950 font-bold',
      mathe_ut: 'bg-lime-100 border-lime-300 text-lime-950 font-bold',
      sachunterricht: 'bg-green-100 border-green-300 text-green-950 font-bold',
      sonstiges: 'bg-slate-200 border-slate-300 text-slate-900 font-bold',
    }
  },
  retro: {
    name: 'Soft Retro',
    desc: 'Warme, stilvolle Vintage-Atmosphäre',
    colors: {
      deutsch_sprache: 'bg-rose-200/60 border-rose-300 text-rose-900 font-bold',
      deutsch_rs: 'bg-yellow-200/60 border-yellow-300 text-yellow-900 font-bold',
      deutsch_vvt: 'bg-orange-200/60 border-orange-300 text-orange-900 font-bold',
      lesen: 'bg-sky-200/60 border-sky-300 text-sky-900 font-bold',
      lernwoerter: 'bg-purple-200/60 border-purple-300 text-purple-900 font-bold',
      checks: 'bg-red-200/60 border-red-300 text-red-900 font-bold',
      mathe_et: 'bg-amber-200/60 border-amber-300 text-amber-900 font-bold',
      mathe_ut: 'bg-lime-200/60 border-lime-300 text-lime-900 font-bold',
      sachunterricht: 'bg-orange-100 border-orange-200 text-orange-900 font-bold',
      sonstiges: 'bg-stone-200 border-stone-300 text-stone-900 font-bold',
    }
  },
  contrast: {
    name: 'High Contrast',
    desc: 'Klar abgegrenzt & Barrierefrei',
    colors: {
      deutsch_sprache: 'bg-pink-300 border-pink-600 text-black font-extrabold',
      deutsch_rs: 'bg-green-300 border-green-600 text-black font-extrabold',
      deutsch_vvt: 'bg-orange-300 border-orange-600 text-black font-extrabold',
      lesen: 'bg-sky-300 border-sky-600 text-black font-extrabold',
      lernwoerter: 'bg-purple-300 border-purple-600 text-black font-extrabold',
      checks: 'bg-red-400 border-red-700 text-white font-extrabold',
      mathe_et: 'bg-yellow-300 border-yellow-600 text-black font-extrabold',
      mathe_ut: 'bg-yellow-100 border-yellow-500 text-black font-extrabold',
      sachunterricht: 'bg-stone-300 border-stone-600 text-black font-extrabold',
      sonstiges: 'bg-slate-300 border-slate-600 text-black font-extrabold',
    }
  },
  custom: {
    name: 'Eigene Fächerfarben',
    desc: 'Verwendet die Farben aus deinen Profileinstellungen',
    colors: {}
  }
};

const SUGGESTION_CORPUS: Record<string, Record<number, string[]>> = {
  deutsch_sprache: {
    1: ['Wortarten spielerisch unterscheiden (Nomen & Verben)', 'Satzanfänge groß schreiben', 'Sätze bauen aus Bildkarten', 'Gesprächsregeln kennenlernen'],
    2: ['Subjekt und Prädikat in einfachen Sätzen', 'Aussagesatz, Fragesatz & Ausrufesatz', 'Wortfamilien und Wortfelder erforschen', 'Zuhören & Erzählen im Kreis'],
    3: ['Satzglieder bestimmen (Verschiebe- & Ersatzprobe)', 'Präteritum und Perfekt im Vergleich', 'Wortarten vertiefen: Pronomen & Adjektive', 'Aktives Zuhören & Notieren'],
    4: ['Satzglieder vertiefen (Subjekt, Prädikat, O3, O4)', 'Die vier Fälle des Nomens bestimmen', 'Direkte Rede mit Begleitsatz richtig setzen', 'Eine eigene Rede/Präsentation planen']
  },
  deutsch_rs: {
    1: ['Laute hören und den Buchstaben zuordnen', 'Silben klatschen und Wörter aufschreiben', 'Umgang mit Zwielauten (ei, au, eu)', 'Lauttreues Schreiben festigen'],
    2: ['Doppelkonsonanten (tz, ck, mm, nn...)', 'Großschreibung von Nomen und Satzanfängen', 'Wörter mit Dehnungs-h erforschen', 'Wortgrenzen im Satz erkennen'],
    3: ['Stummes h und Doppelvokale üben', 'Wortstammregel anwenden (Umlautung ä/e)', 'Auslautverhärtung prüfen (p/b, t/d, k/g)', 'Abschreibstrategien anwenden'],
    4: ['Fremdwörter richtig schreiben', 'Nennform- & Personalform-Regeln beachten', 'Regeln zur Worttrennung am Zeilenende', 'Die Rechtschreibhilfe im Wörterbuch nutzen']
  },
  deutsch_vvt: {
    1: ['Eine kleine Bildergeschichte beschreiben', 'Einen Wunschzettel verfassen', 'Erste Sätze zu Erlebnissen schreiben', 'Wörter kreativ zusammensetzen'],
    2: ['Aufbau einer Reizwortgeschichte (Anfang, Hauptteil, Schluss)', 'Einen persönlichen Brief schreiben', 'Steckbrief über das Lieblingstier gestalten', 'Eigene Erlebnisse gliedern'],
    3: ['Eine spannende Abenteuergeschichte entwerfen', 'Einen logischen Vorgang beschreiben (Rezept)', 'Gefühle und Adjektive in Aufsätzen einbauen', 'Einen Entwurf überarbeiten'],
    4: ['Eine sachliche Personenbeschreibung verfassen', 'Eine packende Erlebniserzählung schreiben', 'Eigene Argumente zu einem Thema strukturieren', 'Eine Fantasiegeschichte verfassen & illustrieren']
  },
  lesen: {
    1: ['Buchstaben-Laut-Verbindung festigen', 'Kurze Lesespiele auf Wort- und Satzebene', 'Vorlesen einfacher, kurzer Kinderbücher', 'Einfache Reime vervollständigen'],
    2: ['Sinnerfassendes Lesen trainieren (Lese-Mal-Blätter)', 'Klassische Fabeln gemeinsam lesen', 'Gezieltes Suchen von Informationen im Text', 'Fragen zum Gelesenen beantworten'],
    3: ['Einen Lesevortrag vorbereiten (Betonung, Lautstärke)', 'Sachtexte strukturieren und markieren', 'Klassenlektüre besprechen und reflektieren', 'Wichtige Schlüsselbegriffe herausfiltern'],
    4: ['Literarische Texte analysieren (Charaktere)', 'Schnelles Querlesen & Scanning-Technik üben', 'Eine eigene Buchpräsentation gestalten', 'Klassische Balladen & Gedichte verstehen']
  },
  lernwoerter: {
    1: ['Lernwörter mit allen Sinnen schreiben (Sand, Luft)', 'Lernwörter-Diktat mit Partnerkontrolle', 'Lernwörter im Suchsel/Gitterrätsel finden', 'Lernwörter kneten'],
    2: ['Lernwort-Kartei anlegen', 'Kreative Sätze mit den aktuellen Lernwörtern bauen', 'Schreib-Ufo: Lernwörter mehrmals fehlerfrei schreiben', 'Lernwörter ordnen'],
    3: ['Wortfamilien zu den Lernwörtern bilden', 'Lernwörter nach dem Alphabet sortieren', 'Fehler-Suchspiel mit den Lernwörtern im Text', 'Lernwörter-Diktat'],
    4: ['Lernwörter in verschiedenen Zeitformen einsetzen', 'Satzdiktate mit Fokus auf schwierige Stellen', 'Lernwörter-Domino für kooperatives Üben', 'Lernwörter rückwärts buchstabieren']
  },
  mathe_et: {
    1: ['Zahlenraum bis 20 begreifen', 'Plus- und Minusrechnen im ersten Zehner', 'Zehnerübergang anschaulich erarbeiten', 'Verdoppeln und Halbieren'],
    2: ['Zahlenraum bis 100 erschließen', 'Das kleine Einmaleins einführen (Reihen)', 'Schriftliche Addition ohne Überschreitung', 'Zahlenrätsel und logische Reihen'],
    3: ['Zahlenraum bis 10 000 & schriftliche Subtraktion', 'Schriftliche Multiplikation mit einer Stelle', 'Halbschriftliche Division durchführen', 'Sachrechnen mit Geldbeträgen'],
    4: ['Zahlenraum bis 1 Million (Stellenwerttafel)', 'Schriftliche Division mit zweistelligen Divisoren', 'Kommazahlen und Geldbeträge im Alltag', 'Große Zahlen runden & schätzen']
  },
  mathe_ut: {
    1: ['Geometrische Formen erkennen (Kreis, Quadrat, Dreieck)', 'Einfache Symmetrien legen (Spiegel)', 'Uhrzeiten: Volle Stunden ablesen', 'Einfache Muster fortsetzen'],
    2: ['Längenmaße einführen (m, dm, cm)', 'Körper und ihre Eigenschaften (Würfel, Quader)', 'Rechnen mit Euro und Cent im Kaufladen', 'Uhrzeit: Halbe Stunden bestimmen'],
    3: ['Gewichtsmaße kennenlernen (kg, dag, g)', 'Uhrzeiten minutengenau ablesen und rechnen', 'Einfache Sachaufgaben zeichnerisch lösen', 'Maßstäbe vergrößern & verkleinern'],
    4: ['Flächeninhalt und Umfang berechnen', 'Volumen und Rauminhalte begreifen (Liter)', 'Große Maßeinheiten umwandeln (t, kg, g, m, km)', 'Körpernetze zeichnen und falten']
  },
  sachunterricht: {
    1: ['Die Schule und den Schulweg sicher kennen', 'Verhalten im Straßenverkehr (Ampel, Zebrastreifen)', 'Der Kalender: Wochentage und Jahreszeiten', 'Klassengemeinschaft & Klassenregeln'],
    2: ['Haustiere und Nutztiere vergleichen', 'Die Organe und Sinne des Menschen', 'Orientierung im Heimatort (Himmelsrichtungen)', 'Obst- & Gemüsesorten im Jahreskreis'],
    3: ['Die Waldtiere und Stockwerke des Waldes', 'Das Bundesland kennenlernen (Wappen, Bezirke)', 'Der Wasserkreislauf und Aggregatzustände', 'Getreidearten & Vom Korn zum Brot'],
    4: ['Österreich: Grenzen, Berge, Flüsse und Hauptstädte', 'Die Geschichte der Heimat (Römer, Ritter)', 'Der menschliche Körper und gesunde Ernährung', 'Sonnensystem & Planeten erkunden']
  },
  sonstiges: {
    1: ['Malen mit Primärfarben & Mischen', 'Gemeinschaftsspiele im Kreis', 'Singen einfacher Kinderlieder', 'Rhythmus klatschen'],
    2: ['Basteln mit Naturmaterialien (Herbst)', 'Rhythmus-Übungen mit Body Percussion', 'Bewegungsspiele in Kleingruppen', 'Falten von Tieren'],
    3: ['Papierflieger falten und Flugweite messen (MINT)', 'Grafische Muster mit Lineal zeichnen', 'Einfache Programmier-Spiele (Scratch Jr)', 'Eigene Kugelbahnen entwerfen'],
    4: ['Kettenreaktionen bauen (MINT-Projekt)', 'Perspektivisches Zeichnen von Gebäuden', 'Singen im Kanon & Orff-Instrumente', 'Mosaikbilder gestalten']
  }
};

const SUBJECTS = [
  { id: 'deutsch_sprache', label: 'Sprache', color: 'bg-rose-200 border-rose-400 text-rose-950 font-black' },
  { id: 'deutsch_rs', label: 'RS', color: 'bg-emerald-200 border-emerald-400 text-emerald-950 font-black' },
  { id: 'deutsch_vvt', label: 'VVT', color: 'bg-orange-200 border-orange-400 text-orange-950 font-black' },
  { id: 'lesen', label: 'Lesen', color: 'bg-blue-200 border-blue-400 text-blue-950 font-black' },
  { id: 'lernwoerter', label: 'Lernwörter', color: 'bg-indigo-200 border-indigo-400 text-indigo-950 font-black' },
  { id: 'checks', label: 'Checks/SA', color: 'bg-red-200 border-red-400 text-red-950 font-black' },
  { id: 'mathe_et', label: 'M ET', color: 'bg-amber-200 border-amber-400 text-amber-950 font-black' },
  { id: 'mathe_ut', label: 'M ÜT', color: 'bg-amber-100 border-amber-300 text-amber-900 font-bold' },
  { id: 'sachunterricht', label: 'SU', color: 'bg-stone-200 border-stone-400 text-stone-950 font-black' },
  { id: 'sonstiges', label: 'MINT / BE', color: 'bg-slate-200 border-slate-400 text-slate-950 font-black' },
];

const MONATE = [
  { name: 'September', num: 8 },
  { name: 'Oktober', num: 9 },
  { name: 'November', num: 10 },
  { name: 'Dezember', num: 11 },
  { name: 'Jänner', num: 0 },
  { name: 'Februar', num: 1 },
  { name: 'März', num: 2 },
  { name: 'April', num: 3 },
  { name: 'Mai', num: 4 },
  { name: 'Juni', num: 5 },
  { name: 'Juli', num: 6 },
];

export default function YearlyPlan() {
  const { app, setApp } = useApp();
  const [editingCell, setEditingCell] = useState<{ kw: number, subjectId: string } | null>(null);
  const [yearPlannerTab, setYearPlannerTab] = useState<'inhalt' | 'rahmen' | 'weitere'>('inhalt');
  const [viewingCell, setViewingCell] = useState<{ kw: number, subjectId: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editValue, setEditValue] = useState<{ thema: string, buch: string, type: string, subCategory: string, subCategories?: string[], items?: any[], completed?: boolean }>({ thema: '', buch: '', type: 'standard', subCategory: '', subCategories: [], items: [], completed: false });
  const [viewMode, setViewMode] = useState<'table' | 'months'>('table');
  const hasYearPlanEntries = useMemo(() => (
    Object.values(app.jahresplanung || {}).some((week: any) => {
      if (typeof week === 'string') return Boolean(week.trim());
      if (!week || typeof week !== 'object') return false;
      return Object.values(week).some((cell: any) => {
        if (typeof cell === 'string') return Boolean(cell.trim());
        if (!cell || typeof cell !== 'object') return false;
        return yearPlanCellEntries(cell).length > 0;
      });
    })
  ), [app.jahresplanung]);
  const [isolatedSubjectId, setIsolatedSubjectId] = useState<string | null>(null);
  const [draggedSubjectData, setDraggedSubjectData] = useState<{kw: number, subjectId: string} | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{kw: number, subjectId: string} | null>(null);
  const [planWeeksCount, setPlanWeeksCount] = useState<number>(1);
  const [autoSuffix, setAutoSuffix] = useState<'none' | 'part' | 'fortsetzung'>('part');
  // A single readable display density; old preference and stored plans are untouched.
  const [densityMode] = useState<'kompakt' | 'normal' | 'detail'>('normal');

  // NEW INTERACTIVE & USABILITY STATES
  const [copiedTopic, setCopiedTopic] = useState<any | null>(null);
  const [suggestingCell, setSuggestingCell] = useState<{ kw: number, subjectId: string } | null>(null);
  const [isGeneratingSparkSuggestion, setIsGeneratingSparkSuggestion] = useState(false);
  const [showLehrplanDrawer, setShowLehrplanDrawer] = useState(false);
  const [lpFach, setLpFach] = useState<string>('Deutsch');
  const [lpSearch, setLpSearch] = useState<string>('');

  // Keep track of scroll position manually to avoid jumps on save
  const scrollPosRef = useRef<number>(0);

  const saveScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollPosRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  const restoreScrollPosition = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosRef.current;
    }
  };

  const closeEditingCell = () => {
    saveScrollPosition();
    setEditingCell(null);
    setTimeout(restoreScrollPosition, 0);
    setTimeout(restoreScrollPosition, 50);
  };


  // AI-Assistent states
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiSubjectsOnly, setAiSubjectsOnly] = useState<string>('all');
  const [aiTargetWeek, setAiTargetWeek] = useState<string>('all');
  const [aiUserFocus, setAiUserFocus] = useState<string>('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiGeneratingError, setAiGeneratingError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`;
    }
  };

  useEffect(() => {
    if (editingCell) {
      const timer = setTimeout(adjustTextareaHeight, 10);
      return () => clearTimeout(timer);
    }
  }, [editingCell, editValue.thema]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleJahresplanImport = (importedRows: JahresplanImportRow[], mode: 'merge' | 'overwrite') => {
    if (mode === 'overwrite') {
      const impacted = importedRows.filter(row => row?.subjectId &&
        occupiedYearPlanCell(app.jahresplanung?.[row.kw]?.[row.subjectId]));
      if (impacted.length && !window.confirm(
        `Der Excel-Import würde ${new Set(impacted.map(row => `${row.kw}-${row.subjectId}`)).size} bereits ausgefüllte Jahresplan-Zellen ersetzen. Möchtest du diese Einträge wirklich überschreiben? Tipp: Mit „Ergänzen“ bleiben sie erhalten.`
      )) return;
    }
    setApp(prev => ({
      ...prev,
      jahresplanung: applyYearPlanImportRows(
        prev.jahresplanung || {},
        importedRows,
        mode,
      ),
    }));
  };

  const activePaletteKey = app.settings?.yearlyColorPalette || 'pastell';

  const subjects = React.useMemo(() => {
    const base = app.jahresplan_faecher || DEFAULT_YEARLY_SUBJECTS;
    return sortYearlySubjects(base).map(s => {
      // 1. Check if we have a palette match for this subject ID and we are NOT in custom mode
      if (activePaletteKey !== 'custom') {
        const paletteColors = COLOR_PALETTES[activePaletteKey]?.colors;
        if (paletteColors && paletteColors[s.id]) {
          return { ...s, color: paletteColors[s.id] };
        }
      }

      // Resolve from custom user profile colors (app.fachConfig)
      // Normalize subject label or id to find matching key in app.fachConfig
      const labelLower = s.label.toLowerCase();
      const idLower = s.id.toLowerCase();
      
      let matchedKey = s.label; // default fallback
      if (app.fachConfig) {
        // Try direct match
        if (app.fachConfig[s.label]) {
          matchedKey = s.label;
        } else {
          // Try search mapping
          const foundKey = Object.keys(app.fachConfig).find(key => {
            const kl = key.toLowerCase();
            return kl.includes(labelLower) || labelLower.includes(kl) ||
                   kl.includes(idLower) || idLower.includes(kl) ||
                   (kl === 'deutsch' && (idLower.includes('deutsch') || idLower.includes('lesen') || idLower.includes('sprache') || idLower.includes('vvt') || idLower.includes('rs') || idLower.includes('lernwoerter') || labelLower.includes('lesen') || labelLower.includes('rs') || labelLower.includes('sprache') || labelLower.includes('vvt') || labelLower.includes('lernwörter'))) ||
                   (kl === 'mathematik' && (idLower.includes('mathe') || labelLower.includes('m et') || labelLower.includes('m üt')));
          });
          if (foundKey) matchedKey = foundKey;
        }
      }

      const config = (app.fachConfig || {})[matchedKey];
      if (config) {
        const c = config.color;
        
        // Define all Tailwind light/dark/border values safely to look incredibly polished and eye-pleasing
        const colorClassMap: Record<string, string> = {
          blue: 'bg-blue-100/90 border-blue-300 text-blue-950 font-bold',
          red: 'bg-red-100/90 border-red-300 text-red-950 font-bold',
          emerald: 'bg-emerald-100/90 border-emerald-300 text-emerald-950 font-bold',
          indigo: 'bg-indigo-100/90 border-indigo-300 text-indigo-950 font-bold',
          sky: 'bg-sky-100/90 border-sky-300 text-sky-950 font-bold',
          purple: 'bg-purple-100/90 border-purple-300 text-purple-950 font-bold',
          pink: 'bg-pink-100/90 border-pink-300 text-pink-950 font-bold',
          orange: 'bg-orange-100/90 border-orange-300 text-orange-950 font-bold',
          teal: 'bg-teal-100/90 border-teal-300 text-teal-950 font-bold',
          slate: 'bg-slate-100/90 border-slate-300 text-slate-700 font-bold',
          stone: 'bg-stone-100/90 border-stone-300 text-stone-700 font-bold',
          amber: 'bg-amber-100/90 border-amber-300 text-amber-950 font-bold',
          fuchsia: 'bg-fuchsia-100/90 border-fuchsia-300 text-fuchsia-950 font-bold',
          rose: 'bg-rose-100/90 border-rose-300 text-rose-950 font-bold',
          yellow: 'bg-yellow-100/90 border-yellow-300 text-yellow-950 font-bold',
          lime: 'bg-lime-100/90 border-lime-300 text-lime-950 font-bold',
          green: 'bg-green-100/90 border-green-300 text-green-950 font-bold',
          cyan: 'bg-cyan-100/90 border-cyan-300 text-cyan-950 font-bold',
          violet: 'bg-violet-100/90 border-violet-300 text-violet-950 font-bold',
        };
        
        const colorClass = colorClassMap[c] || `bg-${c}-50 border-${c}-200 text-${c}-800 font-bold`;
        return { ...s, color: colorClass };
      }
      return s;
    });
  }, [app.jahresplan_faecher, app.fachConfig, activePaletteKey]);

  const visibleSubjects = isolatedSubjectId ? subjects.filter(s => s.id === isolatedSubjectId) : subjects;

  const getColumnBg = (subjectColor: string) => {
    if (subjectColor.includes('rose')) return 'bg-rose-50/80 group-hover:bg-rose-100/70 border-rose-100/50';
    if (subjectColor.includes('emerald')) return 'bg-emerald-50/80 group-hover:bg-emerald-100/70 border-emerald-100/50';
    if (subjectColor.includes('amber')) return 'bg-amber-50/80 group-hover:bg-amber-100/70 border-amber-100/50';
    if (subjectColor.includes('blue')) return 'bg-blue-50/80 group-hover:bg-blue-100/70 border-blue-100/50';
    if (subjectColor.includes('indigo')) return 'bg-indigo-50/80 group-hover:bg-indigo-100/70 border-indigo-100/50';
    if (subjectColor.includes('orange')) return 'bg-orange-50/80 group-hover:bg-orange-100/70 border-orange-100/50';
    if (subjectColor.includes('stone')) return 'bg-stone-50/80 group-hover:bg-stone-100/70 border-stone-100/50';
    if (subjectColor.includes('slate')) return 'bg-slate-50/80 group-hover:bg-slate-100/70 border-slate-100/50';
    if (subjectColor.includes('pink')) return 'bg-pink-50/80 group-hover:bg-pink-100/70 border-pink-100/50';
    if (subjectColor.includes('cyan')) return 'bg-cyan-50/80 group-hover:bg-cyan-100/70 border-cyan-100/50';
    if (subjectColor.includes('red')) return 'bg-red-50/80 group-hover:bg-red-100/70 border-red-100/50';
    if (subjectColor.includes('purple')) return 'bg-purple-50/80 group-hover:bg-purple-100/70 border-purple-100/50';
    if (subjectColor.includes('sky')) return 'bg-sky-50/80 group-hover:bg-sky-100/70 border-sky-100/50';
    if (subjectColor.includes('teal')) return 'bg-teal-50/80 group-hover:bg-teal-100/70 border-teal-100/50';
    return 'bg-white group-hover:bg-stone-50';
  };

  const startYear = getStartYear(app.schuljahr);
  const actualKW = getKW(new Date());
  
  // Initialize currentKW to actualKW if it's not set or from a different session context
  useEffect(() => {
    if (!app.currentKW || app.currentKW < 1 || app.currentKW > 53) {
      setApp(prev => ({ ...prev, currentKW: actualKW }));
    }
  }, []);

  const activeKW = app.currentKW || actualKW;
  const startKW = getSchulstartKW(app.schuljahr, app.bundesland || 'VBG');
  
  // Generate sequence of KWs until end of July of the next year
  const endYear = startYear + 1;
  const startMonday = kwToMonday(startKW, startYear);
  const weeks = [];
  let currentMonday = new Date(startMonday);
  let swIndex = 1;
  
  while (currentMonday.getFullYear() < endYear || (currentMonday.getFullYear() === endYear && currentMonday.getMonth() < 7)) {
    const kw = getKW(currentMonday);
    
    // Determine the proper ISO year for this week
    const thursday = new Date(currentMonday);
    thursday.setDate(thursday.getDate() + 3);
    const isoYear = thursday.getFullYear();
    
    weeks.push({ sw: swIndex, kw: kw, year: isoYear, monday: new Date(currentMonday) });
    
    currentMonday.setDate(currentMonday.getDate() + 7);
    swIndex++;
  }

  const openYearPlanEditor = (kw: number, subjectId: string) => {
    const existing = app.jahresplanung[kw]?.[subjectId] || { thema: '', buch: '', type: 'standard', subCategory: '', subCategories: [], items: [], completed: false };
    setEditValue({
      thema: existing.thema || '',
      buch: existing.buch || '',
      type: existing.type || 'standard',
      subCategory: existing.subCategory || '',
      subCategories: existing.subCategories || (existing.subCategory ? [existing.subCategory] : []),
      items: existing.items || [],
      completed: !!existing.completed
    });
    setPlanWeeksCount(1);
    setAutoSuffix('part');
    setYearPlannerTab('inhalt');
    setEditingCell({ kw, subjectId });
  };

  const handleCellClick = (kw: number, subjectId: string) => {
    const existing = app.jahresplanung[kw]?.[subjectId];
    const hasPlanning = yearPlanCellEntries(existing).length > 0 || Boolean(existing?.type && existing.type !== 'standard');
    if (hasPlanning) {
      setViewingCell({ kw, subjectId });
      return;
    }
    openYearPlanEditor(kw, subjectId);
  };

  const handleDragStart = (e: React.DragEvent, kw: number, subjectId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ kw, subjectId }));
    setDraggedSubjectData({ kw, subjectId });
  };

  const handleDrop = (e: React.DragEvent, targetKw: number, targetSubjectId: string) => {
    e.preventDefault();
    setDragOverCell(null);
    setDraggedSubjectData(null);
    const raw = e.dataTransfer.getData('application/json');
    const plainText = e.dataTransfer.getData('text/plain').trim();
    let payload: any = null;
    try { if (raw) payload = JSON.parse(raw); } catch { return; }
    if (!raw || payload?.type === 'lehrplan') {
      const topic = String(payload?.type === 'lehrplan' ? payload.title || '' : plainText).trim();
      if (!topic) return;
      if (occupiedYearPlanCell(app.jahresplanung?.[targetKw]?.[targetSubjectId])) {
        window.alert('In dieser Woche und diesem Fach ist schon etwas geplant. Bestehende Einträge bleiben erhalten.');
        return;
      }
      setApp(previous => {
        if (occupiedYearPlanCell(previous.jahresplanung?.[targetKw]?.[targetSubjectId])) return previous;
        const plan = { ...(previous.jahresplanung || {}) };
        plan[targetKw] = {
          ...(plan[targetKw] || {}),
          [targetSubjectId]: {
            thema: topic, buch: '', type: 'standard', subCategory: '', subCategories: [], items: [],
          },
        };
        return { ...previous, jahresplanung: plan };
      });
      return;
    }

    const sourceKw = Number(payload?.kw);
    const sourceSubjectId = String(payload?.subjectId || '');
    if (!Number.isInteger(sourceKw) || !sourceSubjectId ||
        (sourceKw === targetKw && sourceSubjectId === targetSubjectId)) return;

    setApp(previous => {
      const original = previous.jahresplanung || {};
      const source = original[sourceKw]?.[sourceSubjectId];
      if (!source) return previous;
      const target = original[targetKw]?.[targetSubjectId];
      const plan = { ...original };
      const sourceWeek = { ...(original[sourceKw] || {}) };
      const targetWeek = sourceKw === targetKw ? sourceWeek : { ...(original[targetKw] || {}) };
      targetWeek[targetSubjectId] = source;
      if (target) sourceWeek[sourceSubjectId] = target;
      else delete sourceWeek[sourceSubjectId];
      plan[sourceKw] = sourceWeek;
      plan[targetKw] = targetWeek;
      return { ...previous, jahresplanung: plan };
    });
  };

  const toggleCompleted = (kw: number, subjectId: string) => {
    setApp(prev => {
      const jp = { ...(prev.jahresplanung || {}) };
      if (!jp[kw]) jp[kw] = {};
      const existing = jp[kw][subjectId] || { thema: '', buch: '', type: 'standard', subCategory: '', subCategories: [], items: [], completed: false };
      jp[kw][subjectId] = { ...existing, completed: !existing.completed };
      return { ...prev, jahresplanung: jp };
    });
  };

  const clearCell = (kw: number, subjectId: string) => {
    setApp(prev => {
      const jp = { ...(prev.jahresplanung || {}) };
      if (jp[kw]) {
        delete jp[kw][subjectId];
      }
      return { ...prev, jahresplanung: jp };
    });
  };

  const cycleCellType = (kw: number, subjectId: string) => {
    const types = ['standard', 'sa', 'test', 'lzk', 'event'];
    setApp(prev => {
      const jp = { ...(prev.jahresplanung || {}) };
      if (!jp[kw]) jp[kw] = {};
      const existing = jp[kw][subjectId] || { thema: '', buch: '', type: 'standard', subCategory: '', subCategories: [], items: [] };
      const currentIdx = types.indexOf(existing.type || 'standard');
      const nextType = types[(currentIdx + 1) % types.length];
      jp[kw][subjectId] = { ...existing, type: nextType };
      return { ...prev, jahresplanung: jp };
    });
  };

  const pasteTopic = (kw: number, subjectId: string) => {
    if (!copiedTopic) return;
    if (occupiedYearPlanCell(app.jahresplanung?.[kw]?.[subjectId])) {
      window.alert('Hier steht bereits eine Planung. Wähle eine leere Zelle, damit nichts überschrieben wird.');
      return;
    }
    setApp(prev => {
      if (occupiedYearPlanCell(prev.jahresplanung?.[kw]?.[subjectId])) return prev;
      return { ...prev, jahresplanung: {
        ...prev.jahresplanung,
        [kw]: { ...(prev.jahresplanung[kw] || {}), [subjectId]: { ...copiedTopic, completed: false } },
      }};
    });
  };

  const shiftEverythingDown = (startKw: number, subjectId: string) => {
    const orderedTeachingKws = weeks
      .filter(({ monday }) => {
        const holiday = isHoliday(
          monday,
          app.calendarSettings?.disabledHolidays,
          app.bundesland || 'VBG',
        );
        const normalized = (holiday || '').toLocaleLowerCase('de-AT');
        return !(
          holiday &&
          (
            normalized.includes('ferien') ||
            normalized.includes('schluss') ||
            normalized.includes('beginn')
          )
        );
      })
      .map(({ kw }) => kw);

    setApp(prev => ({
      ...prev,
      jahresplanung: shiftYearPlanSubjectForward(
        prev.jahresplanung || {},
        subjectId,
        startKw,
        orderedTeachingKws,
      ),
    }));
  };

  const renderCellContent = (data: any, s: any, kw: number) => {
    const isDraggable = !!data && !!(data?.items?.length > 0 || data?.thema || data?.buch || (data?.type && data.type !== 'standard'));
    const isCompleted = !!data?.completed;
    const hasMultipleItems = data?.items && data.items.length > 0;
    const displayTitle = hasMultipleItems 
      ? (data.items.map((it: any) => it.thema).filter(Boolean).join(', ') || data?.thema) 
      : data?.thema;

    return (
      <div 
        className={`min-h-full h-full relative flex flex-col justify-between ${draggedSubjectData?.kw === kw && draggedSubjectData?.subjectId === s.id ? 'opacity-30' : ''}`}
        draggable={isDraggable}
        onDragStart={isDraggable ? (e) => handleDragStart(e, kw, s.id) : undefined}
      >
        {/* CONTEXTUAL HOVER ACTIONS PANEL */}
        <div 
          className="absolute -top-2.5 -right-2 z-30 hidden group-hover/cell:flex items-center gap-1 bg-white p-1 rounded-lg shadow-md border border-stone-200"
          onClick={e => e.stopPropagation()}
        >
          {isDraggable ? (
            <>
              {/* Completed toggle */}
              <button 
                onClick={() => toggleCompleted(kw, s.id)}
                className={`p-1 rounded hover:bg-stone-100 transition-colors ${isCompleted ? 'text-emerald-600' : 'text-stone-400'}`}
                title="Erledigt umschalten"
              >
                <Check size={10} className="stroke-[3]" />
              </button>
              
              {/* Copy */}
              <button 
                onClick={() => setCopiedTopic(data)}
                className="p-1 rounded text-stone-500 hover:bg-stone-100 transition-colors"
                title="Thema kopieren"
              >
                <Copy size={10} />
              </button>

              {/* Cycle Type */}
              <button 
                onClick={() => cycleCellType(kw, s.id)}
                className="p-1 rounded text-stone-500 hover:bg-stone-100 transition-colors"
                title="Typ umschalten (SA/Test)"
              >
                <Flag size={10} />
              </button>

              {/* Shift Down */}
              <button 
                onClick={() => shiftEverythingDown(kw, s.id)}
                className="p-1 rounded text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Alles 1 Woche verschieben"
              >
                <ArrowDown size={10} />
              </button>

              {/* Delete */}
              <button 
                onClick={() => clearCell(kw, s.id)}
                className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                title="Löschen"
              >
                <Trash2 size={10} />
              </button>
            </>
          ) : (
            <>
              {/* Sparkles Suggestion */}
              <button 
                onClick={() => setSuggestingCell({ kw, subjectId: s.id })}
                className="p-1 rounded text-amber-500 hover:bg-amber-50 animate-pulse transition-colors"
                title="Vorschläge anzeigen (KI)"
              >
                <Sparkles size={11} className="fill-current" />
              </button>

              {/* Paste Topic if copied */}
              {copiedTopic && (
                <button 
                  onClick={() => pasteTopic(kw, s.id)}
                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors"
                  title="Kopiertes Thema einfügen"
                >
                  <Clipboard size={10} />
                </button>
              )}
            </>
          )}
        </div>
        
        {isDraggable ? (
          densityMode === 'kompakt' ? (
            /* KOMPAKT MODE */
            <div className={`p-1.5 rounded-lg transition-all shadow-xs select-none min-h-full flex items-start justify-between gap-1.5 ${
              isCompleted ? 'bg-emerald-50/70 opacity-70 line-through' :
              data?.type === 'sa' ? 'bg-rose-100/90 ring-1 ring-rose-300' :
              data?.type === 'test' || data?.type === 'lzk' ? 'bg-amber-100/90 ring-1 ring-amber-300' :
              'bg-white/90 border border-stone-200/60'
            }`}>
              <div className="flex items-start gap-1 min-w-0 flex-1">
                {isCompleted && <span className="text-emerald-600 font-bold text-[0.625rem] shrink-0 mt-0.5">✓</span>}
                <span className={`text-[0.625rem] font-bold leading-snug break-words whitespace-normal text-left ${
                  data?.type === 'sa' ? 'text-rose-950 font-black' : 'text-stone-800'
                }`} title={displayTitle}>
                  {displayTitle}
                </span>
              </div>
              {data?.type === 'sa' && <Flag size={9} className="text-rose-600 fill-current shrink-0 mt-0.5" />}
              {(data?.type === 'test' || data?.type === 'lzk') && <AlertCircle size={9} className="text-amber-600 shrink-0 mt-0.5" />}
              {data?.type === 'event' && <MapPin size={9} className="text-indigo-600 fill-current shrink-0 mt-0.5" />}
            </div>
          ) : densityMode === 'normal' ? (
            /* NORMAL MODE */
            <div className={`p-2 rounded-xl transition-all shadow-sm select-none min-h-full flex flex-col justify-between gap-1.5 ${
              isCompleted ? 'bg-emerald-50/50 opacity-70 line-through' :
              data?.type === 'sa' ? 'bg-rose-50 ring-1 ring-rose-200' :
              data?.type === 'test' || data?.type === 'lzk' ? 'bg-amber-50 ring-1 ring-amber-200' :
              'bg-white/80'
            }`}>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-1.5">
                  <div className={`font-bold leading-snug text-[0.6875rem] break-words whitespace-normal text-left ${
                    isCompleted ? 'text-stone-500 font-medium' :
                    data?.type === 'sa' ? 'text-rose-950 font-black' :
                    'text-stone-900 font-bold'
                  }`}>
                    {isCompleted && <span className="text-emerald-600 mr-1">✓</span>}
                    {displayTitle}
                  </div>
                  <div className="flex flex-col gap-1 items-center shrink-0 mt-0.5">
                    {data?.type === 'sa' && <Flag size={10} className="text-rose-600 fill-current" />}
                    {(data?.type === 'test' || data?.type === 'lzk') && <AlertCircle size={10} className="text-amber-600" />}
                    {data?.type === 'event' && <MapPin size={10} className="text-indigo-600 fill-current" />}
                  </div>
                </div>
                {data?.subCategories && data.subCategories.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {data.subCategories.map((sc: string) => (
                      <span key={sc} className="text-[0.5rem] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded leading-none">
                        {sc.replace('Deutsch ', '')}
                      </span>
                    ))}
                  </div>
                ) : data?.subCategory && (
                  <div className="text-[0.5rem] font-bold text-blue-700 bg-blue-50 px-1 py-0.5 rounded w-fit mt-1.5 leading-none">
                    {data.subCategory.replace('Deutsch ', '')}
                  </div>
                )}
              </div>
              {data?.buch && (
                <div className="text-[0.5rem] text-stone-500 italic mt-1 flex items-start gap-1 opacity-80 break-words whitespace-normal text-left">
                  <FileText size={8} className="shrink-0 mt-0.5" />
                  <span className="break-words whitespace-normal leading-tight">{data.buch}</span>
                </div>
              )}
            </div>
          ) : (
            /* DETAIL MODE */
            hasMultipleItems ? (
              <div className={`flex flex-col gap-2 min-h-full p-2 rounded-xl transition-all shadow-sm select-none ${isCompleted ? 'bg-emerald-50/50 opacity-70 line-through' : 'bg-white/80'}`}>
                {data.items.map((it: any) => (
                  <div key={it.id} className="leading-tight border-b border-stone-100 pb-2 mb-1 last:border-0 last:pb-0 last:mb-0">
                    {(it.subCategories && it.subCategories.length > 0) ? (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {it.subCategories.map((sc: string) => (
                          <div key={sc} className="text-[0.5rem] font-black uppercase text-blue-600 px-1 bg-blue-50 rounded border border-blue-100">{sc.replace('Deutsch ', '')}</div>
                        ))}
                      </div>
                    ) : it.subCategory && (
                      <div className="text-[0.5625rem] font-black uppercase text-blue-600 tracking-wider mb-0.5 w-fit bg-blue-50 px-1 rounded">{it.subCategory.replace('Deutsch ', '')}</div>
                    )}
                    <div className="font-bold text-[0.6875rem] text-stone-900 leading-snug break-words whitespace-normal text-left">{it.thema}</div>
                    {it.buch && (
                      <div className="text-[0.5625rem] text-stone-500 font-medium italic mt-1 flex items-start gap-1 opacity-70 break-words whitespace-normal text-left">
                        <Info size={8} className="shrink-0 mt-0.5" />
                        <span className="leading-tight break-words">{it.buch}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`space-y-1.5 p-2 rounded-xl transition-all shadow-sm select-none min-h-full flex flex-col justify-between gap-1.5 ${isCompleted ? 'bg-emerald-50/50 opacity-70 line-through' : data?.type === 'sa' ? 'bg-rose-50 ring-1 ring-rose-200' : data?.type === 'test' || data?.type === 'lzk' ? 'bg-amber-50 ring-1 ring-amber-200' : 'bg-white/80'}`}>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-1.5">
                    <div className={`font-black leading-snug text-[0.6875rem] break-words whitespace-normal text-left ${isCompleted ? 'text-stone-500 font-medium' : data?.type === 'sa' ? 'text-rose-950 font-black' : 'text-stone-900 font-bold'}`}>
                      {isCompleted && <span className="text-emerald-600 mr-1">✓</span>}
                      {data?.thema}
                    </div>
                    <div className="flex flex-col gap-1 items-center shrink-0 mt-0.5">
                      {data?.type === 'sa' && <Flag size={11} className="text-rose-600 fill-current drop-shadow-sm" />}
                      {(data?.type === 'test' || data?.type === 'lzk') && <AlertCircle size={11} className="text-amber-600 drop-shadow-sm" />}
                      {data?.type === 'event' && <MapPin size={11} className="text-indigo-600 fill-current drop-shadow-sm" />}
                      {data?.type === 'spielefest' && <PartyPopper size={11} className="text-fuchsia-600" />}
                      {data?.type === 'konferenz' && <Users size={11} className="text-blue-600" />}
                      {data?.type === 'gespraech' && <MessageSquare size={11} className="text-violet-600" />}
                      {data?.type === 'sonstiges' && <Calendar size={11} className="text-rose-600" />}
                    </div>
                  </div>
                  
                  {data?.subCategories && data.subCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {data.subCategories.map((sc: string) => (
                        <div key={sc} className="text-[0.5625rem] text-blue-700 font-bold bg-blue-100/80 px-1.5 py-0.5 rounded leading-none">
                          {sc.replace('Deutsch ', '')}
                        </div>
                      ))}
                    </div>
                  ) : data?.subCategory && (
                    <div className="text-[0.5625rem] text-blue-700 font-bold bg-blue-100/80 px-1.5 py-0.5 rounded w-fit mt-1.5 leading-none">
                      {data.subCategory.replace('Deutsch ', '')}
                    </div>
                  )}
                </div>
                {data?.buch && (
                  <div className="text-[0.5625rem] text-stone-500 italic flex items-start gap-1 mt-2 font-black bg-stone-100/50 px-1.5 py-1 rounded-lg leading-snug border border-black/5 break-words whitespace-normal text-left">
                    <FileText size={10} className="shrink-0 mt-0.5" />
                    <span className="text-wrap leading-tight break-words">{data.buch}</span>
                  </div>
                )}
              </div>
            )
          )
        ) : (
          /* EMPTY CELL */
          <div className={`opacity-0 group-hover/cell:opacity-100 flex flex-col items-center justify-center min-h-full h-full transition-all gap-1 ${
            densityMode === 'kompakt' ? 'min-h-[28px] py-0.5' : densityMode === 'normal' ? 'min-h-[44px] py-1' : 'min-h-[60px] py-2'
          }`}>
            <Plus size={densityMode === 'kompakt' ? 12 : 15} className="text-stone-400 hover:scale-125 transition-transform" />
            {densityMode !== 'kompakt' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSuggestingCell({ kw, subjectId: s.id }); }} 
                className="p-1 rounded bg-amber-50 text-amber-500 hover:bg-amber-100 border border-amber-200 flex items-center gap-1 text-[0.55rem] font-black uppercase tracking-tight scale-90"
              >
                <Sparkles size={10} className="fill-current animate-pulse" /> Vorschlag
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSave = () => {
    if (!editingCell) return;
    const { kw, subjectId } = editingCell;
    const teachingWeek = (week: { kw: number; monday: Date }) => {
      const holiday = isHoliday(week.monday, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
      const text = (holiday || '').toLocaleLowerCase('de-AT');
      return !holiday || !['ferien', 'schluss', 'beginn'].some(word => text.includes(word));
    };
    const targetKws = planWeeksCount === 1 ? [kw] : plannedYearWeeks(weeks, kw, planWeeksCount, teachingWeek);
    if (planWeeksCount > 1) {
      if (targetKws.length < planWeeksCount) {
        window.alert('Für diesen Zeitraum sind nicht genügend Unterrichtswochen vorhanden. Es wurde nichts gespeichert.');
        return;
      }
      const occupied = conflictingYearWeeks(app.jahresplanung || {}, targetKws, subjectId, kw);
      if (occupied.length) {
        window.alert(`Die folgenden Wochen enthalten bereits Einträge in diesem Fach: ${occupied.join(', ')}. Bitte wähle einen freien Zeitraum; bestehende Jahrespläne wurden nicht verändert.`);
        return;
      }
    }

    let finalValue = { ...editValue };
    // If there is currently typed content and we have previous items, move current content to items as well
    if ((finalValue.thema.trim() || (finalValue.subCategories && finalValue.subCategories.length > 0)) && finalValue.items && finalValue.items.length > 0) {
      finalValue.items = [
        ...finalValue.items, 
        { 
          id: crypto.randomUUID(), 
          thema: finalValue.thema, 
          buch: finalValue.buch, 
          subCategory: finalValue.subCategory, 
          subCategories: finalValue.subCategories || [], 
          type: finalValue.type 
        }
      ];
      finalValue.thema = '';
      finalValue.buch = '';
      finalValue.subCategories = [];
      finalValue.subCategory = '';
    }
    
    setApp(prev => {
      const current = prev.jahresplanung || {};
      const existingConflicts = conflictingYearWeeks(current, targetKws, subjectId, kw);
      // Recheck at update time to prevent clobbering an edit made in another module.
      if (existingConflicts.length) return prev;
      const updatedPlanning = { ...current };
      for (let index = 0; index < targetKws.length; index++) {
        const targetKw = targetKws[index];
        const currentCell = current[targetKw]?.[subjectId] || {};
        const nextTopic = finalValue.thema.trim()
          ? autoSuffix === 'part' && planWeeksCount > 1
            ? `${finalValue.thema} (Teil ${index + 1})`
            : autoSuffix === 'fortsetzung' && index > 0
              ? `${finalValue.thema} (Forts.)`
              : finalValue.thema
          : finalValue.thema;
        updatedPlanning[targetKw] = {
          ...(current[targetKw] || {}),
          [subjectId]: {
            ...currentCell,
            ...finalValue,
            thema: nextTopic,
            // Sub-items of the original week stay with their week.
            items: index === 0 ? (finalValue.items || []) : [],
          },
        };
      }
      return { ...prev, jahresplanung: updatedPlanning };
    });
    closeEditingCell();
  };

  // AI-Assistent helpers
  const getEmptyCellsList = () => {
    const list: Array<{ kw: number; sw: number; subjectIds: string[] }> = [];
    weeks.forEach(({ sw, kw, monday }) => {
      if (aiTargetWeek !== 'all' && kw.toString() !== aiTargetWeek) return;
      const holiday = isHoliday(monday, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
      const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
      if (isSevereHoliday) return;

      const plannedWeek = app.jahresplanung[kw] || {};
      const emptySubjectIds: string[] = [];
      
      subjects.forEach(s => {
        if (aiSubjectsOnly !== 'all' && s.id !== aiSubjectsOnly) return;
        
        const cellData = plannedWeek[s.id];
        const isEmpty = !cellData || (!cellData.thema?.trim() && (!cellData.items || cellData.items.length === 0));
        if (isEmpty) {
          emptySubjectIds.push(s.id);
        }
      });

      if (emptySubjectIds.length > 0) {
        list.push({ kw, sw, subjectIds: emptySubjectIds });
      }
    });
    return list;
  };

  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true);
    setAiGeneratingError(null);
    setAiSuggestions([]);
    
    const emptyCells = getEmptyCellsList();
    if (emptyCells.length === 0) {
      setAiGeneratingError("Es wurden keine freien Wochen oder Fächer gefunden, die befüllt werden können.");
      setIsGeneratingSuggestions(false);
      return;
    }

    const slicedEmptyCells = emptyCells.slice(0, 15);

    try {
      const text = await callServerAI("generateYearlyPlanSuggestions", {
        stufe: app.stufe || 4,
        subjects: subjects.map(s => ({ id: s.id, label: s.label })),
        existingPlanning: app.jahresplanung || {},
        emptyWeeks: slicedEmptyCells,
        userFocus: aiUserFocus
      });

      let resultText = (text || "").trim();
      if (resultText.startsWith("```")) {
        resultText = resultText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
      }
      
      const parsed = JSON.parse(resultText);
      if (parsed && Array.isArray(parsed.suggestions)) {
        setAiSuggestions(parsed.suggestions);
      } else {
        throw new Error("Ungültiges Antwortformat der KI erhalten.");
      }
    } catch (err: any) {
      console.error(err);
      setAiGeneratingError(err.message || "Es gab ein Problem bei der Kontaktaufnahme mit der KI. Bitte versuche es erneut.");
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleApplySingleSuggestion = (suggestion: any) => {
    const { kw, subjectId, thema, buch } = suggestion;
    if (occupiedYearPlanCell(app.jahresplanung?.[kw]?.[subjectId])) {
      window.alert('Diese Zelle enthält bereits eine Planung. Die KI hat nichts überschrieben.');
      return;
    }
    setApp(prev => {
      if (occupiedYearPlanCell(prev.jahresplanung?.[kw]?.[subjectId])) return prev;
      return { ...prev, jahresplanung: {
        ...prev.jahresplanung,
        [kw]: {
          ...(prev.jahresplanung[kw] || {}),
          [subjectId]: { thema, buch: buch || '', type: 'standard', subCategory: '', subCategories: [], items: [] },
        },
      }};
    });
    setAiSuggestions(prev => prev.filter(item => !(item.kw === kw && item.subjectId === subjectId)));
  };

  const handleApplyAllSuggestions = () => {
    setApp(prev => {
      const original = prev.jahresplanung || {};
      const updated = { ...original };
      aiSuggestions.forEach(suggestion => {
        if (occupiedYearPlanCell(original[suggestion.kw]?.[suggestion.subjectId])) return;
        updated[suggestion.kw] = {
          ...(updated[suggestion.kw] || {}),
          [suggestion.subjectId]: {
            thema: suggestion.thema,
            buch: suggestion.buch || '',
            type: 'standard',
            subCategory: '',
            subCategories: [],
            items: [],
          },
        };
      });
      return { ...prev, jahresplanung: updated };
    });
    setAiSuggestions([]);
    setShowAiModal(false);
  };

  const activeTab = app.settings?.planTab || 'jahresplan';

  return (
    <div className={`yearly-plan-shell flex flex-col space-y-4 bg-[#f4f7f3] ${isFullscreen ? 'fixed inset-0 z-[450] w-screen h-screen overflow-y-auto p-3 sm:p-5' : 'h-full px-4 lg:px-6'}`}>
      {/* Header toolbar */}
      <div className="flex flex-col gap-2 bg-white p-2 sm:p-3 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full justify-start min-w-0">
          <div className="flex items-center gap-2 mr-auto min-w-[190px]">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <LayoutGrid size={17} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 leading-tight">Jahresübersicht</h2>
              <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Themen und Lernziele nach Schulwochen planen</p>
            </div>
          </div>
          
          <div className="flex bg-stone-100 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-stone-200 shrink-0 shadow-inner">
            <button 
              onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, planTab: 'jahresplan' } }))}
              aria-pressed={activeTab === 'jahresplan'}
              className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[0.625rem] sm:text-[0.75rem] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'jahresplan' ? 'bg-white text-slate-800 shadow-sm translate-y-[-1px]' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Themen & Stoff
            </button>
            <button 
              onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, planTab: 'lernziele' } }))}
              aria-pressed={activeTab === 'lernziele'}
              className={`px-2.5 sm:px-4 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[0.625rem] sm:text-[0.75rem] font-black uppercase tracking-wider transition-all duration-200 ${activeTab === 'lernziele' ? 'bg-white text-slate-800 shadow-sm translate-y-[-1px]' : 'text-stone-500 hover:text-stone-800'}`}
            >
              Lernziele-Tracker
            </button>
          </div>

          {activeTab === 'jahresplan' && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-stone-100 p-0.5 sm:p-1 rounded-xl sm:rounded-2xl border border-stone-200 shrink-0 shadow-inner">
                <button 
                  onClick={() => setViewMode('table')}
                  aria-pressed={viewMode === 'table'}
                  className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[0.5625rem] sm:text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'table' ? 'bg-white text-emerald-700 shadow-sm translate-y-[-1px]' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  Tabelle
                </button>
                <button 
                  onClick={() => setViewMode('months')}
                  aria-pressed={viewMode === 'months'}
                  className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[0.5625rem] sm:text-[0.6875rem] font-black uppercase tracking-wider transition-all duration-200 ${viewMode === 'months' ? 'bg-white text-emerald-700 shadow-sm translate-y-[-1px]' : 'text-stone-500 hover:text-stone-800'}`}
                >
                  Monatsübersicht
                </button>
              </div>

            </div>
          )}
        </div>
        
        {activeTab === 'jahresplan' && (
        <div className="flex flex-wrap items-center gap-1.5 w-full justify-start min-w-0 border-t border-slate-100 pt-2">
          <button 
            onClick={() => {
              setAiSuggestions([]);
              setAiGeneratingError(null);
              setShowAiModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-[0.75rem] font-black transition-all active:scale-95 shadow-sm cursor-pointer"
          >
            <span>✨</span> Themen-Assistent (KI)
          </button>
          
          {/* Lehrplan-Seitenlade Button */}
          <button 
            onClick={() => setShowLehrplanDrawer(prev => !prev)}
            className={`flex-1 md:flex-none inline-flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3.5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[0.52rem] xs:text-[0.58rem] sm:text-[0.6875rem] md:text-[0.8125rem] font-black transition-all border active:scale-95 shadow-sm cursor-pointer ${
              showLehrplanDrawer 
                ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700' 
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <BookOpen size={11} className="sm:w-[15px] sm:h-[15px]" /> 
            <span>Lehrplan {showLehrplanDrawer ? 'ausblenden' : 'anzeigen'}</span>
          </button>

          {/* Designer-Farbschemas Preset Picker */}
          <div className="relative group shrink-0">
            <button 
              className="inline-flex items-center justify-center gap-1 sm:gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-2 sm:px-3.5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[0.52rem] xs:text-[0.58rem] sm:text-[0.6875rem] md:text-[0.8125rem] font-black transition-all border border-stone-200 active:scale-95 cursor-pointer"
              title="Designer-Farbschema wechseln"
            >
              <Palette size={11} className="sm:w-[15px] sm:h-[15px]" />
              <span className="hidden sm:inline">Farbschema</span>
              <ChevronDown size={10} className="text-stone-400 shrink-0 ml-0.5" />
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-stone-200 rounded-xl shadow-xl py-1.5 z-50 hidden group-hover:block hover:block">
              <div className="px-3 py-1 text-[0.55rem] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100 mb-1">Farbschemas</div>
              {Object.entries(COLOR_PALETTES).map(([key, pal]) => {
                const isActive = (app.settings?.yearlyColorPalette || 'pastell') === key;
                return (
                  <button
                    key={key}
                    onClick={() => setApp(prev => ({ ...prev, settings: { ...prev.settings, yearlyColorPalette: key } }))}
                    className={`w-full px-3 py-1.5 text-left text-[0.6875rem] font-bold flex items-center justify-between transition-colors ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-stone-700 hover:bg-stone-50'}`}
                  >
                    <div>
                      <div className="font-extrabold">{pal.name}</div>
                      <div className="text-[0.55rem] text-stone-400 font-normal leading-tight">{pal.desc}</div>
                    </div>
                    {isActive && <Check size={12} className="text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button 
            onClick={() => {
              const todayKW = getKW(new Date());
              const weekIdx = weeks.findIndex(w => w.kw === todayKW);
              if (weekIdx !== -1 && scrollContainerRef.current) {
                const element = document.getElementById(`kw-${todayKW}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
              setApp(p => ({ ...p, currentKW: todayKW }));
            }}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 px-3.5 py-2 rounded-xl text-[0.75rem] font-black transition-all border border-emerald-500 active:scale-95 shadow-sm cursor-pointer"
          >
            <Calendar size={11} className="sm:w-[15px] sm:h-[15px]" /> Heute
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-[0.75rem] font-black transition-all border border-stone-200 active:scale-95 cursor-pointer"
          >
            <Settings size={11} className="sm:w-[15px] sm:h-[15px]" /> Fächer
          </button>
          <button type="button" onClick={() => setShowExcelModal(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-800 hover:bg-stone-100">
            <Upload size={14} /> Excel importieren
          </button>
          <button type="button"
            onClick={() => setApp(previous => ({ ...previous, currentPage: 'drucken', activePrintTemplate: 'jahresplanung' }))}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100">
            <FileText size={14} /> Zum Druckzentrum
          </button>

          {/* Fullscreen Button */}
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-[0.75rem] font-black transition-all border active:scale-95 cursor-pointer shadow-xs ${
              isFullscreen
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
            title={isFullscreen ? 'Vollbildmodus beenden (Esc)' : 'Vollbildmodus aktivieren (Esc zum Beenden)'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={13} className="sm:w-[15px] sm:h-[15px]" />
                <span>Vollbild beenden</span>
                <kbd className="hidden sm:inline-block px-1 py-0.2 bg-emerald-900/60 text-[9px] text-white rounded font-mono ml-0.5">Esc</kbd>
              </>
            ) : (
              <>
                <Maximize2 size={13} className="sm:w-[15px] sm:h-[15px]" />
                <span>Vollbild</span>
              </>
            )}
          </button>
        </div>
        )}
      </div>

      {activeTab === 'jahresplan' && !hasYearPlanEntries && (
        <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
              <BookOpen size={17} />
            </span>
            <div>
              <p className="text-xs font-black text-emerald-950">Dein Jahresplan ist noch leer</p>
              <p className="mt-0.5 text-[0.6875rem] font-medium leading-relaxed text-emerald-800/80">
                Klicke in der Tabelle auf eine Kalenderwoche und ein Fach, um das erste Thema oder Lernziel einzutragen.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setViewMode('table');
              const firstWeek = weeks[0];
              if (firstWeek) {
                setApp(prev => ({ ...prev, currentKW: firstWeek.kw }));
                requestAnimationFrame(() => {
                  document.getElementById(`kw-${firstWeek.kw}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                });
              }
            }}
            className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-[0.6875rem] font-black text-white transition-colors hover:bg-emerald-800"
          >
            Zur ersten Schulwoche
          </button>
        </div>
      )}

      {activeTab === 'lernziele' ? (
         <div className="flex-1 pb-12 overflow-y-auto w-full max-w-7xl mx-auto mt-4 px-1">
            <LernzielTracker />
         </div>
      ) : (
      <div className="flex-1 relative bg-white rounded-2xl border border-slate-200 flex flex-col shadow-sm overflow-hidden">
        {/* Progress Bar Gadget */}
        <div className="h-1.5 bg-stone-100 w-full  shrink-0">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, (weeks.findIndex(w => w.kw === actualKW) / weeks.length) * 100))}%` }}
            className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          />
        </div>
        
        {viewMode === 'table' ? (
          <div className="flex-1 flex flex-row overflow-hidden relative">
            <div className="relative overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-stone-200" ref={scrollContainerRef}>
              <table className="w-full border-separate border-spacing-0 text-[0.6875rem] min-w-[1000px]">
              <thead className="sticky top-0 z-40">
                <tr className="bg-neutral-900">
                  <th className="sticky left-0 top-0 z-50 w-12 min-w-[48px] py-4 px-2 bg-neutral-900 font-black text-white uppercase border-r-2 border-b-2 border-neutral-800 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
                    SW
                  </th>
                  <th className="sticky left-12 top-0 z-50 w-24 min-w-[96px] py-4 px-2 bg-neutral-900 font-black text-white uppercase border-r-2 border-b-2 border-neutral-800 shadow-[2px_2px_0_0_rgba(0,0,0,0.1)]">
                    KW
                  </th>
                  {visibleSubjects.map(s => {
                    // Count planned weeks out of active teaching weeks
                    let plannedCount = 0;
                    let totalTeachingWeeks = 0;
                    weeks.forEach(w => {
                      const holiday = isHoliday(w.monday, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
                      const isSevereHoliday = holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'));
                      if (!isSevereHoliday) {
                        totalTeachingWeeks++;
                        const val = app.jahresplanung[w.kw]?.[s.id];
                        if (yearPlanCellEntries(val).length > 0) {
                          plannedCount++;
                        }
                      }
                    });
                    const progress = totalTeachingWeeks === 0 ? 0 : Math.round((plannedCount / totalTeachingWeeks) * 100);

                    return (
                      <th 
                        key={s.id} 
                        className="sticky top-0 z-40 py-4 px-2 font-black text-center border-r border-b-2 border-neutral-800 last:border-r-0 bg-neutral-900 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] min-w-[150px] transition-all hover:bg-neutral-800 group/th cursor-pointer"
                        onClick={() => setIsolatedSubjectId(isolatedSubjectId === s.id ? null : s.id)}
                        title={isolatedSubjectId ? "Fokus aufheben" : "Fach isolieren (Fokus-Modus)"}
                      >
                        <div className={`px-4 py-2 rounded-xl ${s.color} inline-block whitespace-nowrap text-[0.6875rem] font-black uppercase tracking-widest shadow-sm group-hover/th:scale-110 group-hover/th:shadow-md transition-all duration-300 relative`}>
                          {s.label}
                          {isolatedSubjectId && <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[0.625rem] scale-75 shadow-sm">✕</span>}
                        </div>
                        
                        {/* Fachbezogener Fortschritts- & Abdeckungsbalken */}
                        <div className="mt-2.5 px-2 max-w-[130px] mx-auto">
                          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden border border-neutral-700/50 flex">
                            <div 
                              className={`h-full ${
                                s.id.includes('deutsch_sprache') ? 'bg-rose-400' :
                                s.id.includes('deutsch_rs') ? 'bg-emerald-400' :
                                s.id.includes('deutsch_vvt') ? 'bg-orange-400' :
                                s.id.includes('lesen') ? 'bg-blue-400' :
                                s.id.includes('lernwoerter') ? 'bg-indigo-400' :
                                s.id.includes('checks') ? 'bg-red-400' :
                                s.id.includes('mathe_et') ? 'bg-amber-400' :
                                s.id.includes('mathe_ut') ? 'bg-lime-400' :
                                s.id.includes('sachunterricht') ? 'bg-stone-400' :
                                'bg-slate-400'
                              } transition-all duration-500`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="text-[0.55rem] font-black text-neutral-400 mt-1 uppercase tracking-wider flex items-center justify-between">
                            <span>Wochen geplant</span>
                            <span className="text-neutral-200" title={`${plannedCount} von ${totalTeachingWeeks} Unterrichtswochen`}>{plannedCount}/{totalTeachingWeeks}</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white">
                {weeks.map(({ sw, kw, year, monday }) => {
                  const holiday = isHoliday(monday, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
                  const plannedWeek = app.jahresplanung[kw] || {};
                  const isOdd = sw % 2 === 1;
                  const isTodayKW = kw === actualKW;
                  const isSelectedKW = kw === app.currentKW;
                  
                  const rowBg = isSelectedKW ? 'bg-emerald-50/70' : isTodayKW ? 'bg-amber-50/40' : isOdd ? 'bg-white' : 'bg-stone-50/60';
                  const sideBg = isSelectedKW ? 'bg-emerald-100' : isTodayKW ? 'bg-amber-100' : isOdd ? 'bg-white' : 'bg-stone-50';
  
                  // Special row for big breaks with Ferien- & Feiertags-Dimm-Effekt
                  if (holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'))) {
                     const getHolidayIcon = (name: string) => {
                       const lc = name.toLowerCase();
                       if (lc.includes('weihnacht')) return '🎄';
                       if (lc.includes('oster')) return '🪺';
                       if (lc.includes('sommer')) return '☀️';
                       if (lc.includes('semester')) return '🎿';
                       if (lc.includes('herbst')) return '🍁';
                       if (lc.includes('pfingst')) return '🕊️';
                       return '📅';
                     };
                     const emoji = getHolidayIcon(holiday);

                     return (
                       <tr 
                         key={sw} 
                         id={`kw-${kw}`} 
                         className={`transition-all opacity-40 hover:opacity-90 bg-stone-50/30 bg-[repeating-linear-gradient(-45deg,var(--color-stone-100),var(--color-stone-100)_8px,transparent_8px,transparent_16px)] ${isTodayKW ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
                       >
                         <td className="sticky left-0 z-30 w-12 min-w-[48px] py-4 px-2 text-center font-black text-stone-400 bg-stone-100/20 border-r-2 border-b border-stone-200/50 shadow-[2px_0_0_0_rgba(0,0,0,0.02)]">
                           {sw}
                         </td>
                         <td className="sticky left-12 z-30 w-24 min-w-[96px] py-4 px-2 text-center border-r-2 border-b border-stone-200/50 bg-stone-100/20 shadow-[2px_0_0_0_rgba(0,0,0,0.02)]">
                           <div className="font-bold text-stone-400">KW {kw}</div>
                           <div className="text-[0.5rem] text-stone-400 font-bold uppercase tracking-wider mt-0.5">SW {sw}</div>
                           <div className="text-[0.5rem] text-stone-400 font-medium">
                             {monday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                           </div>
                           <div className="text-xs mt-1" title={holiday}>{emoji}</div>
                         </td>
                         <td colSpan={subjects.length} className="p-4 text-center border-b border-stone-200/50 relative">
                           {isTodayKW && <div className="absolute top-0 right-4 bg-amber-500 text-white text-[0.5rem] font-black uppercase px-2 py-0.5 rounded-b-lg shadow-sm">Diese Woche</div>}
                           <div className="flex items-center justify-center gap-4">
                             <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                             <span className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-stone-500 bg-white/90 px-5 py-2 rounded-full border border-stone-200 shadow-sm flex items-center gap-2">
                                {emoji} {holiday}
                             </span>
                             <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                           </div>
                         </td>
                       </tr>
                     );
                  }
  
                  // Gather Termin-Pins from plannedWeek exams or events
                  const weekExams = Object.entries(plannedWeek).filter(([subId, cellData]: any) => cellData?.type && cellData.type !== 'standard');

                  return (
                    <tr key={sw} id={`kw-${kw}`} className={`group hover:bg-stone-100/70 transition-colors ${rowBg} ${isSelectedKW && !isTodayKW ? 'ring-2 ring-emerald-400 ring-inset z-10 relative shadow-md' : isTodayKW ? 'ring-2 ring-amber-400 ring-inset z-10 relative' : ''}`}>
                      <td className={`sticky left-0 z-30 w-12 min-w-[48px] py-4 px-2 text-center font-black text-stone-700 ${sideBg} border-r-2 border-b border-stone-200 shadow-[2px_0_0_0_rgba(0,0,0,0.1)] transition-colors`}>
                        {sw}
                      </td>
                      <td className={`sticky left-12 z-30 w-24 min-w-[96px] py-4 px-2 text-center border-r-2 border-b border-stone-200 ${sideBg} shadow-[2px_0_0_0_rgba(0,0,0,0.1)] transition-colors relative`}>
                        <div className={`font-bold ${isSelectedKW ? 'text-emerald-700' : isTodayKW ? 'text-amber-700' : 'text-stone-600'}`}>KW {kw}</div><div className="text-[0.5rem] text-stone-400 font-bold uppercase tracking-wider mt-0.5 opacity-85">SW {sw}</div>
                        <div className="text-[0.5625rem] text-stone-400 font-medium leading-none mt-0.5">
                          {monday.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}
                        </div>
                        
                        {/* Visuelle Meilensteine & Schul-Fixtermine (Termin-Pins) */}
                        {weekExams.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-0.5 justify-center max-w-[80px] mx-auto">
                            {weekExams.map(([subId, cellData]: any, idx) => (
                              <div 
                                key={idx} 
                                className={`text-[0.5rem] font-black px-1 py-0.5 rounded flex items-center gap-0.5 shadow-sm border ${
                                  cellData.type === 'sa' ? 'bg-rose-50 text-rose-700 border-rose-200' : 
                                  cellData.type === 'test' || cellData.type === 'lzk' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                  'bg-indigo-50 text-indigo-700 border-indigo-200'
                                }`}
                                title={`${cellData.type === 'sa' ? 'Schularbeit' : cellData.type === 'test' ? 'Test/LZK' : 'Schul-Termin'}: ${cellData.thema}`}
                              >
                                <Flag size={6} className="fill-current text-current shrink-0" />
                                <span>{cellData.type === 'sa' ? 'SA' : cellData.type === 'test' ? 'T' : 'FIX'}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {isTodayKW && !isSelectedKW && (
                           <div className="absolute top-2 right-2 flex flex-col items-center">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
                             <span className="text-[0.375rem] font-black uppercase text-amber-600 mt-1">HEUTE</span>
                           </div>
                        )}
                        {isSelectedKW && (
                          <div className="absolute top-2 right-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                          </div>
                        )}
                      </td>
                      {visibleSubjects.map(s => {
                        const data = plannedWeek[s.id];
                        const colBg = getColumnBg(s.color);
                        const cellPaddingClass = densityMode === 'kompakt' ? 'p-1' : densityMode === 'normal' ? 'p-1.5' : 'p-2';
                        
                        return (
                          <td 
                            key={s.id} 
                            role="button"
                            tabIndex={0}
                            aria-label={`KW ${kw}, ${s.label}: ${yearPlanCellDisplayText(data) || 'leer'}`}
                            className={`${cellPaddingClass} align-top border-r border-b border-stone-100 last:border-r-0 relative cursor-pointer transition-all ${dragOverCell?.kw === kw && dragOverCell?.subjectId === s.id ? 'ring-2 ring-emerald-400 bg-emerald-50' : colBg} hover:bg-white hover:z-20 hover:shadow-lg group/cell`}
                            onClick={() => handleCellClick(kw, s.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCellClick(kw, s.id);
                              }
                            }}
                            onDragOver={(e) => { e.preventDefault(); setDragOverCell({kw, subjectId: s.id }); }}
                            onDragLeave={() => setDragOverCell(null)}
                            onDrop={(e) => handleDrop(e, kw, s.id)}
                          >
                            {renderCellContent(data, s, kw)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sliding Lehrplan Side-Cabinet (Lehrplan-Seitenlade) */}
          <AnimatePresence>
            {showLehrplanDrawer && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 350, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[350px] shrink-0 border-l border-stone-200 bg-stone-50 flex flex-col h-full overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 border-b border-stone-200 bg-white shrink-0 flex justify-between items-center">
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-[0.8125rem] md:text-[0.875rem] flex items-center gap-2">
                      <BookOpen size={16} className="text-amber-600" />
                      <span>Lehrplan VS 2023</span>
                    </h3>
                    <p className="text-[0.625rem] text-stone-400 font-bold uppercase tracking-wider mt-0.5">Österreich • {app.stufe}. Schulstufe</p>
                  </div>
                  <button 
                    onClick={() => setShowLehrplanDrawer(false)}
                    className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-400 hover:text-stone-700 transition-colors"
                    title="Schließen"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Controls */}
                <div className="p-3 border-b border-stone-200 bg-white shrink-0 space-y-2">
                  {/* Fach Selector */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {Object.keys(LEHRPLAN_VS_2023).map(fach => (
                      <button
                        key={fach}
                        onClick={() => setLpFach(fach)}
                        className={`px-3 py-1 rounded-full text-[0.6875rem] font-bold transition-all shrink-0 whitespace-nowrap ${lpFach === fach ? 'bg-amber-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                      >
                        {fach}
                      </button>
                    ))}
                  </div>

                  {/* Search field */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Kompetenzen durchsuchen..."
                      value={lpSearch}
                      onChange={e => setLpSearch(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-8 py-1.5 text-[0.75rem] font-bold outline-none focus:ring-2 focus:ring-amber-500/20 focus:bg-white transition-all"
                    />
                    {lpSearch && (
                      <button 
                        onClick={() => setLpSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-stone-200 rounded-full text-stone-400"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                  {(() => {
                    const stufeNum = parseInt(app.stufe?.toString() || '1') || 1;
                    const fachData = LEHRPLAN_VS_2023[lpFach]?.[stufeNum] || [];
                    
                    // Filter the competence categories and items based on search query
                    const filteredData = fachData.map(kb => {
                      const filteredAnwendungsbereiche = kb.anwendungsbereiche.filter(ab => 
                        ab.titel.toLowerCase().includes(lpSearch.toLowerCase())
                      );
                      return {
                        ...kb,
                        anwendungsbereiche: filteredAnwendungsbereiche
                      };
                    }).filter(kb => kb.anwendungsbereiche.length > 0);

                    if (filteredData.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center text-center py-12 px-4 text-stone-400">
                          <Search size={24} className="opacity-30 mb-2" />
                          <p className="text-[0.75rem] font-black uppercase tracking-wider">Keine Kompetenzen gefunden</p>
                          <p className="text-[0.625rem] text-stone-400 mt-1">Passe deine Suche oder das Fach an.</p>
                        </div>
                      );
                    }

                    return filteredData.map(kb => (
                      <div key={kb.id} className="space-y-2">
                        <h4 className="text-[0.625rem] font-black uppercase tracking-wider text-amber-800 bg-amber-50/70 border border-amber-100 px-2 py-1 rounded-md">
                          {kb.titel}
                        </h4>
                        <div className="space-y-1.5">
                          {kb.anwendungsbereiche.map(ab => (
                            <div
                              key={ab.id}
                              draggable={true}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/json', JSON.stringify({
                                  type: 'lehrplan',
                                  title: ab.titel
                                }));
                              }}
                              className="bg-white border border-stone-200 hover:border-amber-300 p-2.5 rounded-xl text-[0.6875rem] font-medium text-stone-800 shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing group/comp"
                            >
                              <div className="flex items-start gap-1.5 justify-between">
                                <span className="leading-snug">{ab.titel}</span>
                                <span className="text-[0.55rem] font-black text-amber-600 bg-amber-50 px-1 rounded opacity-0 group-hover/comp:opacity-100 transition-opacity">DRAG</span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="text-[0.5rem] text-stone-400 font-mono">{ab.id.toUpperCase()}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(ab.titel);
                                    setCopiedTopic({ thema: ab.titel, type: 'standard', buch: '' });
                                  }}
                                  className="text-[0.55rem] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 opacity-0 group-hover/comp:opacity-100 transition-opacity"
                                  title="Thema kopieren, um es einzufügen"
                                >
                                  <Copy size={10} /> Kopieren
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                
                {/* Footer Tip */}
                <div className="p-3 bg-amber-50/50 border-t border-stone-200 shrink-0 text-[0.625rem] text-amber-900 leading-snug flex items-start gap-1.5">
                  <span>💡</span>
                  <p>Zieh eine Kompetenz mit der Maus direkt auf ein Kalenderfeld, um sie lehrplankonform einzutragen.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
          <div className="flex-1 overflow-y-auto p-6 bg-stone-50/40">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto pb-8">
              {MONATE.map(m => {
                const monthWeeks = weeks.filter(({ kw, year, monday }) => {
                  return monday.getMonth() === m.num;
                });
                const isCurrentMonth = monthWeeks.some(w => w.kw === actualKW);
                
                const items: Array<{
                  type: 'holiday' | 'sa' | 'test' | 'lzk' | 'event' | 'spielefest' | 'konferenz' | 'gespraech' | 'sonstiges' | 'standard';
                  label: string;
                  details?: string;
                  subjectLabel?: string;
                  colorClass?: string;
                  kw: number;
                  sw: number;
                }> = [];

                monthWeeks.forEach(({ sw, kw, year, monday }) => {
                  const holiday = isHoliday(monday, app.calendarSettings?.disabledHolidays, app.bundesland || 'VBG');
                  if (holiday && (holiday.includes('ferien') || holiday.includes('Schluss') || holiday.includes('Beginn'))) {
                    if (!items.some(it => it.type === 'holiday' && it.label === holiday)) {
                      items.push({
                        type: 'holiday',
                        label: holiday,
                        kw,
                        sw
                      });
                    }
                  }

                  const plannedWeek = app.jahresplanung[kw] || {};
                  subjects.forEach(s => {
                    const data = plannedWeek[s.id];
                    yearPlanCellEntries(data).forEach(entry => {
                      items.push({
                        type: (entry.type as any) || (data?.type as any) || 'standard',
                        label: entry.thema,
                        details: entry.buch,
                        subjectLabel: s.label,
                        colorClass: s.color,
                        kw,
                        sw
                      });
                    });
                  });
                });

                return (
                  <div key={m.name} className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col min-h-[300px] ${isCurrentMonth ? 'border-emerald-200 ring-2 ring-emerald-100/50 ring-inset' : 'border-stone-200/60'}`}>
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4 shrink-0">
                      <div className="flex flex-col">
                        <span className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-800 flex items-center gap-1.5">
                          <Calendar size={14} className={isCurrentMonth ? 'text-emerald-600 animate-pulse' : 'text-emerald-500'} />
                          {m.name}
                        </span>
                        {isCurrentMonth && <span className="text-[0.4375rem] font-bold text-emerald-600 uppercase tracking-tighter">Aktueller Monat</span>}
                      </div>
                      <span className="text-[0.625rem] font-black text-stone-400 bg-stone-50 border border-stone-200/50 px-2.5 py-1 rounded-lg">
                        SW {monthWeeks[0]?.sw || 0} - {monthWeeks[monthWeeks.length - 1]?.sw || 0}
                      </span>
                    </div>

                    {items.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-400 border border-dashed border-stone-100 rounded-2xl bg-stone-50/30">
                        <Info size={18} className="mb-2 opacity-50 text-stone-400" />
                        <p className="text-[0.625rem] font-black uppercase tracking-wider text-stone-400">Keine Themen geplant</p>
                      </div>
                    ) : (
                      <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[260px] pr-1 scrollbar-thin">
                        {items.map((item, idx) => {
                          const isHolidayType = item.type === 'holiday';
                          const isSA = item.type === 'sa';
                          const isTest = item.type === 'test' || item.type === 'lzk';
                          const isEvent = item.type === 'event';
                          const isSpielefest = item.type === 'spielefest';
                          const isKonferenz = item.type === 'konferenz';
                          const isGespraech = item.type === 'gespraech';
                          const isSonstiges = item.type === 'sonstiges';

                          let badgeColor = 'bg-stone-50 text-stone-850 border-stone-200';
                          if (isHolidayType) badgeColor = 'bg-emerald-50/80 border-emerald-200 text-emerald-850 font-extrabold';
                          else if (isSA) badgeColor = 'bg-rose-50 border-rose-200 text-rose-850 font-extrabold';
                          else if (isTest) badgeColor = 'bg-amber-50 border-amber-200 text-amber-850 font-bold';
                          else if (isEvent) badgeColor = 'bg-purple-50 border-purple-200 text-purple-850';
                          else if (isSpielefest) badgeColor = 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-850 font-bold';
                          else if (isKonferenz) badgeColor = 'bg-blue-50 border-blue-200 text-blue-800 font-bold';
                          else if (isGespraech) badgeColor = 'bg-violet-50 border-violet-200 text-violet-850 font-bold';
                          else if (isSonstiges) badgeColor = 'bg-rose-50 border-rose-200 text-rose-850 font-bold';

                          return (
                            <div key={idx} className={`p-2.5 rounded-2xl border text-[0.6875rem] transition-all shadow-sm flex flex-col gap-1 hover:brightness-[0.98] ${badgeColor}`}>
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-black text-[0.5rem] uppercase tracking-wider shrink-0 bg-white/60 px-1.5 py-0.5 rounded border border-black/5">
                                  SW {item.sw} / KW {item.kw}
                                </span>
                                {item.subjectLabel && (
                                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-wrap leading-tight break-words opacity-85 max-w-[80px]">
                                    {item.subjectLabel}
                                  </span>
                                )}
                              </div>
                              <div className="font-bold leading-snug break-words whitespace-normal text-left" title={item.label}>
                                {item.label}
                              </div>
                              {item.details && (
                                <div className="text-[0.5625rem] opacity-75 italic flex items-start gap-1 mt-0.5 break-words whitespace-normal text-left">
                                  <FileText size={10} className="shrink-0 mt-0.5" />
                                  <span className="text-wrap leading-tight break-words">{item.details}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}

      {/* Planned year-cell overview */}
      <AnimatePresence>
        {viewingCell && (() => {
          const data = app.jahresplanung?.[viewingCell.kw]?.[viewingCell.subjectId] || {};
          const entries = yearPlanCellEntries(data);
          const subject = subjects.find(item => item.id === viewingCell.subjectId);
          const week = weeks.find(item => item.kw === viewingCell.kw);
          const swValue = week
            ? getSW(week.monday, app?.schuljahr, app?.bundesland || 'VBG')
            : null;
          const typeLabels: Record<string, string> = {
            standard: 'Unterricht',
            sa: 'Schularbeit',
            test: 'Test / WH',
            lzk: 'LZK',
            spielefest: 'Spielefest',
            konferenz: 'Konferenz',
            gespraech: 'Gespräch',
            sonstiges: 'Termin',
            event: 'Ausflug / Event',
          };

          return (
            <div className="fixed inset-0 z-[305] flex items-center justify-center p-3 sm:p-5 bg-stone-900/45 backdrop-blur-sm">
              <motion.button
                type="button"
                aria-label="Übersicht schließen"
                className="absolute inset-0 h-full w-full cursor-default"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setViewingCell(null)}
              />
              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 18 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 18 }}
                className="relative flex max-h-[92vh] w-[94vw] max-w-5xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl"
                onClick={event => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 border-b border-stone-100 bg-stone-50/80 px-6 py-5 sm:px-8">
                  <div>
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-emerald-600">Jahresplanung · Übersicht</div>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-stone-950">{subject?.label || viewingCell.subjectId}</h3>
                    <p className="mt-1 text-xs font-bold text-stone-500">
                      KW {viewingCell.kw}{swValue ? ` · SW ${swValue}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewingCell(null)}
                    className="rounded-full p-2.5 text-stone-400 transition-colors hover:bg-stone-200 hover:text-stone-700"
                  >
                    <X size={22} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-6 sm:p-8">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {entries.map((entry, index) => (
                      <section key={entry.id || index} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[0.625rem] font-black uppercase tracking-wider text-stone-400">
                              {entries.length > 1 ? `Eintrag ${index + 1}` : 'Geplanter Inhalt'}
                            </div>
                            <h4 className="mt-2 text-base font-black leading-snug text-stone-900">{entry.thema || '—'}</h4>
                          </div>
                          <span className="shrink-0 rounded-full bg-stone-100 px-2.5 py-1 text-[0.5625rem] font-black text-stone-600">
                            {typeLabels[entry.type || data.type || 'standard'] || entry.type || data.type || 'Unterricht'}
                          </span>
                        </div>

                        {entry.buch && (
                          <div className="mt-4 rounded-xl bg-stone-50 px-3 py-2 text-xs font-semibold leading-relaxed text-stone-600">
                            <FileText size={13} className="mr-1.5 inline text-stone-400" />
                            {entry.buch}
                          </div>
                        )}

                        {(entry.subCategories?.length || entry.subCategory) && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {(entry.subCategories?.length ? entry.subCategories : [entry.subCategory]).filter((value): value is string => Boolean(value)).map(value => (
                              <span key={value} className="rounded-full bg-blue-50 px-2.5 py-1 text-[0.5625rem] font-black text-blue-700">
                                {String(value).replace('Deutsch ', '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>
                    ))}
                  </div>

                  {entries.length === 0 && (
                    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm font-semibold text-stone-600">
                      Für diese Zelle ist ein Termin-Typ hinterlegt, aber noch kein Thema.
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                      <div className="text-[0.625rem] font-black uppercase tracking-wider text-stone-400">Status</div>
                      <div className="mt-1 text-sm font-black text-stone-800">{data.completed ? 'Erledigt' : 'Geplant'}</div>
                    </div>
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                      <div className="text-[0.625rem] font-black uppercase tracking-wider text-stone-400">Einträge</div>
                      <div className="mt-1 text-sm font-black text-stone-800">{Math.max(entries.length, 1)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-stone-100 bg-stone-50/80 px-6 py-4 sm:flex-row sm:justify-end">
                  <button type="button"
                    onClick={() => {
                      const targetKw = viewingCell.kw;
                      setViewingCell(null);
                      // Navigate without copying or altering a single existing lesson.
                      setApp(previous => ({ ...previous, currentKW: targetKw, currentPage: 'wochenplanung' }));
                    }}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-bold text-indigo-800 hover:bg-indigo-100">
                    <Calendar size={14} className="mr-1.5 inline" /> Im Wochenplan dieser Woche öffnen
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingCell(null)}
                    className="rounded-xl border border-stone-200 bg-white px-5 py-3 text-xs font-black text-stone-600 hover:bg-stone-100"
                  >
                    Schließen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = { ...viewingCell };
                      setViewingCell(null);
                      openYearPlanEditor(target.kw, target.subjectId);
                    }}
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Edit3 size={14} className="mr-2 inline" /> Bearbeiten
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Edit Overlay / Modal */}
      <AnimatePresence>
        {editingCell && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-stone-900/40 backdrop-blur-sm shadow-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl border border-border w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-1rem)] max-w-none h-[calc(100vh-0.5rem)] sm:h-[calc(100vh-1rem)] max-h-none flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-border bg-stone-50 flex justify-between items-center shrink-0">
                <div>
                  <div className="text-[0.5625rem] font-black uppercase tracking-widest text-text-muted mb-1">
                    KW {editingCell.kw}
                    {(() => {
                      const week = weeks.find(w => w.kw === editingCell.kw);
                      const sw = week
                        ? getSW(week.monday, app?.schuljahr, app?.bundesland || 'VBG')
                        : null;
                      return sw ? ` (SW ${sw})` : '';
                    })()}
                    {` • ${subjects.find(s => s.id === editingCell.subjectId)?.label}`}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">Jahresplanung bearbeiten</h3>
                </div>
                <button onClick={closeEditingCell} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="shrink-0 border-b border-stone-100 bg-white px-4 py-3 sm:px-6">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'inhalt', label: '1 · Inhalt', hint: 'Thema, Material, Schwerpunkte' },
                    { id: 'rahmen', label: '2 · Rahmen', hint: 'Termin, Status, Zeitraum' },
                    { id: 'weitere', label: '3 · Weitere Inhalte', hint: 'Mehrere Themen in derselben Woche' },
                  ] as const).map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setYearPlannerTab(tab.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                        yearPlannerTab === tab.id
                          ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <span className={`block text-[0.6875rem] font-black ${
                        yearPlannerTab === tab.id ? 'text-emerald-800' : 'text-stone-700'
                      }`}>{tab.label}</span>
                      <span className="mt-0.5 hidden text-[0.5625rem] font-semibold text-stone-400 sm:block">{tab.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="shrink-0 border-b border-stone-100 bg-stone-50/70 px-5 py-2.5 lg:px-6">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.6875rem]">
                  <span className="font-black text-stone-800">{subjects.find(s => s.id === editingCell.subjectId)?.label}</span>
                  <span className="text-stone-300">•</span>
                  <span className="max-w-[65vw] truncate font-semibold text-stone-500">{editValue.thema || 'Noch kein Thema eingetragen'}</span>
                  {(editValue.items?.length || 0) > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 font-black text-blue-700">
                      +{editValue.items?.length} weitere
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 bg-stone-50/30 p-4 sm:p-5 lg:p-6">
                {yearPlannerTab === 'inhalt' && (
                  <div className="mx-auto max-w-6xl space-y-5">
                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="mb-5">
                        <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-emerald-600">Kernplanung</div>
                        <h4 className="mt-1 text-lg font-black text-stone-900">Thema & Material</h4>
                        <p className="mt-1 text-xs font-medium text-stone-500">Das Wesentliche der Woche zuerst. Weitere Einstellungen liegen in den anderen Reitern.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] font-black uppercase text-text-muted ml-1">Hauptthema / Inhalt</label>
                          <textarea 
                            ref={textareaRef}
                            autoFocus
                            rows={7}
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-[0.9375rem] font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all min-h-[180px] resize-y leading-relaxed"
                            placeholder="z.B. Nomen, Multiplikation bis 100..."
                            value={editValue.thema}
                            onChange={e => {
                              setEditValue({ ...editValue, thema: e.target.value });
                              adjustTextareaHeight();
                            }}
                            onInput={adjustTextareaHeight}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[0.625rem] font-black uppercase text-text-muted ml-1">Buch / Materialien / Seiten</label>
                          <textarea
                            className="w-full min-h-[180px] resize-y bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-[0.875rem] font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                            placeholder="z.B. Schulbuch S. 42–45, Arbeitsblatt, Material..."
                            value={editValue.buch}
                            onChange={e => setEditValue({ ...editValue, buch: e.target.value })}
                          />
                        </div>
                      </div>
                    </section>

                    {(subjects.find(s => s.id === editingCell.subjectId)?.label.toLowerCase().includes('deutsch') || editingCell.subjectId.toLowerCase().includes('deutsch')) && (
                      <section className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4">
                          <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-blue-600">Deutsch</div>
                          <h4 className="mt-1 text-base font-black text-stone-900">Schwerpunkte</h4>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setEditValue({ ...editValue, subCategories: [], subCategory: '' })}
                            className={`px-3 py-2 rounded-xl text-[0.75rem] leading-tight font-bold transition-all ${(!editValue.subCategories || editValue.subCategories.length === 0) ? 'bg-blue-600 text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                          >
                            Allgemein
                          </button>
                          {DEUTSCH_UNTERFAECHER.map(uf => {
                            const isActive = (editValue.subCategories || []).includes(uf);
                            return (
                              <button
                                key={uf}
                                onClick={() => {
                                  const current = editValue.subCategories || [];
                                  const next = isActive ? current.filter(c => c !== uf) : [...current, uf];
                                  setEditValue({ ...editValue, subCategories: next, subCategory: next[0] || '' });
                                }}
                                className={`px-3 py-2 rounded-xl text-[0.75rem] leading-tight font-bold transition-all ${isActive ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-500 ring-inset shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}
                              >
                                {uf.replace('Deutsch ', '')}
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {yearPlannerTab === 'rahmen' && (
                  <div className="mx-auto max-w-6xl space-y-5">
                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="mb-4">
                        <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-rose-600">Art der Planung</div>
                        <h4 className="mt-1 text-lg font-black text-stone-900">Unterricht oder wichtiger Termin</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                        {[
                          { id: 'standard', label: 'Unterricht', icon: <X size={14} />, color: 'hover:bg-stone-100' },
                          { id: 'sa', label: 'Schularbeit', icon: <Flag size={14} />, color: 'bg-rose-100 text-rose-700 border-rose-200' },
                          { id: 'test', label: 'Test / WH', icon: <AlertCircle size={14} />, color: 'bg-amber-100 text-amber-700 border-amber-200' },
                          { id: 'lzk', label: 'LZK', icon: <AlertCircle size={14} />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                          { id: 'spielefest', label: 'Spielefest', icon: <PartyPopper size={14} />, color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' },
                          { id: 'konferenz', label: 'Konferenz', icon: <Users size={14} />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
                          { id: 'gespraech', label: 'Gespräch', icon: <MessageSquare size={14} />, color: 'bg-violet-100 text-violet-700 border-violet-200' },
                          { id: 'sonstiges', label: 'Termin', icon: <Calendar size={14} />, color: 'bg-rose-100 text-rose-700 border-rose-200' },
                          { id: 'event', label: 'Ausflug', icon: <MapPin size={14} />, color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
                        ].map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setEditValue({ ...editValue, type: t.id })}
                            className={`min-h-16 rounded-xl border p-2.5 flex items-center gap-2 transition-all ${editValue.type === t.id ? (t.id === 'standard' ? 'bg-stone-900 text-white border-stone-900' : t.color + ' ring-2 ring-offset-1') : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                          >
                            {t.icon}
                            <span className="text-[0.625rem] font-black uppercase tracking-tight text-left">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>

                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4">
                          <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-emerald-600">Status</div>
                          <h4 className="mt-1 text-base font-black text-stone-900">Planungsstatus</h4>
                        </div>
                        <label htmlFor="jp-erledigt" className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
                          <div>
                            <div className="text-sm font-black text-stone-800">Erledigt</div>
                            <div className="mt-0.5 text-[0.6875rem] font-medium text-stone-500">Wird im Wochenplan als erledigt angezeigt.</div>
                          </div>
                          <input
                            type="checkbox"
                            id="jp-erledigt"
                            className="w-5 h-5 text-emerald-600 border-stone-300 rounded focus:ring-emerald-500 cursor-pointer"
                            checked={!!editValue.completed}
                            onChange={e => setEditValue({ ...editValue, completed: e.target.checked })}
                          />
                        </label>
                      </section>

                      <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4">
                          <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-emerald-600">Zeitraum</div>
                          <h4 className="mt-1 text-base font-black text-stone-900">Über mehrere Wochen planen</h4>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[1, 2, 3, 4].map(wNum => (
                            <button
                              key={wNum}
                              type="button"
                              onClick={() => setPlanWeeksCount(wNum)}
                              className={`py-3 rounded-xl border text-[0.6875rem] font-black uppercase tracking-tight transition-all ${planWeeksCount === wNum ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                            >
                              {wNum === 1 ? '1 Woche' : `${wNum} Wochen`}
                            </button>
                          ))}
                        </div>
                        {planWeeksCount > 1 && (
                          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                            <div className="mb-2 text-[0.625rem] font-black uppercase tracking-wider text-emerald-800">Folgewochen benennen</div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <button type="button" onClick={() => setAutoSuffix('part')} className={`py-2 px-2 rounded-lg border text-[0.625rem] font-black transition-all ${autoSuffix === 'part' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-white border-stone-200 text-stone-500'}`}>Teil 1, Teil 2 …</button>
                              <button type="button" onClick={() => setAutoSuffix('fortsetzung')} className={`py-2 px-2 rounded-lg border text-[0.625rem] font-black transition-all ${autoSuffix === 'fortsetzung' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-white border-stone-200 text-stone-500'}`}>Thema + Forts.</button>
                              <button type="button" onClick={() => setAutoSuffix('none')} className={`py-2 px-2 rounded-lg border text-[0.625rem] font-black transition-all ${autoSuffix === 'none' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-white border-stone-200 text-stone-500'}`}>Identisch</button>
                            </div>
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                )}

                {yearPlannerTab === 'weitere' && (
                  <div className="mx-auto max-w-6xl space-y-5">
                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <div className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-blue-600">Mehrere Inhalte</div>
                          <h4 className="mt-1 text-lg font-black text-stone-900">Zusätzliche Themen in derselben Woche</h4>
                          <p className="mt-1 text-xs font-medium text-stone-500">Praktisch z.B. für Lesen + Rechtschreiben oder mehrere Sachunterrichtsschwerpunkte.</p>
                        </div>
                        <button type="button" onClick={() => setYearPlannerTab('inhalt')} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[0.6875rem] font-black text-stone-600 hover:bg-stone-100">
                          Inhalt bearbeiten
                        </button>
                      </div>

                      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                        <div className="text-[0.5625rem] font-black uppercase tracking-wider text-blue-500">Aktuell vorbereiteter Eintrag</div>
                        <div className="mt-1 text-sm font-black text-stone-800">{editValue.thema || 'Noch kein Thema eingetragen'}</div>
                        {editValue.buch && <div className="mt-1 text-xs font-medium text-stone-500">{editValue.buch}</div>}
                      </div>

                      <button 
                        type="button"
                        onClick={() => {
                          if (editValue.thema.trim() || (editValue.subCategories && editValue.subCategories.length > 0)) {
                            const newItem = { 
                              id: crypto.randomUUID(), 
                              thema: editValue.thema, 
                              buch: editValue.buch, 
                              subCategory: editValue.subCategory,
                              subCategories: editValue.subCategories || [], 
                              type: editValue.type 
                            };
                            setEditValue(prev => ({ 
                              ...prev, 
                              thema: '', 
                              buch: '', 
                              subCategory: '', 
                              subCategories: [], 
                              type: 'standard', 
                              items: [...(prev.items || []), newItem] 
                            }));
                          } else {
                            alert("Bitte gib erst ein Thema ein oder wähle einen Schwerpunkt aus, bevor du einen weiteren Eintrag hinzufügst.");
                          }
                        }}
                        className="mt-4 w-full py-4 bg-blue-50 text-blue-700 font-black text-[0.6875rem] uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-all flex items-center justify-center gap-3 border-2 border-dashed border-blue-200"
                      >
                        <Plus size={18} /> Aktuellen Inhalt als weiteren Eintrag übernehmen
                      </button>
                    </section>

                    <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h4 className="text-base font-black text-stone-900">Bereits hinzugefügt</h4>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[0.625rem] font-black text-stone-600">{editValue.items?.length || 0}</span>
                      </div>
                      {editValue.items && editValue.items.length > 0 ? (
                        <div className="space-y-2">
                          {editValue.items.map((it: any, idx: number) => (
                            <div key={it.id || idx} className="flex justify-between items-start gap-4 text-[0.75rem] leading-tight p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                              <div className="min-w-0">
                                {it.subCategories && it.subCategories.length > 0 ? (
                                  <span className="font-bold text-blue-600 mr-2">{it.subCategories.map((sc: string) => sc.replace('Deutsch ', '')).join(', ')}:</span>
                                ) : it.subCategory && <span className="font-bold text-blue-600 mr-2">{it.subCategory.replace('Deutsch ', '')}:</span>}
                                <span className="font-black text-stone-800">{it.thema}</span>
                                {it.buch && <div className="mt-1 italic text-stone-500">{it.buch}</div>}
                              </div>
                              <button type="button" onClick={() => setEditValue(prev => ({ ...prev, items: (prev.items || []).filter((_, i) => i !== idx) }))} className="shrink-0 text-rose-500 p-1.5 hover:bg-rose-100 rounded-lg">
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-10 text-center text-xs font-semibold text-stone-400">
                          Noch keine zusätzlichen Inhalte.
                        </div>
                      )}
                    </section>
                  </div>
                )}
              </div>

              <div className="p-3 sm:p-4 lg:px-6 bg-stone-50 border-t border-border flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
                <button onClick={closeEditingCell} className="btn bg-white text-stone-600 border-border hover:bg-stone-100 sm:min-w-[160px]">
                  Abbrechen
                </button>
                <div className="hidden flex-1 px-2 text-[0.625rem] font-semibold text-stone-400 lg:block">
                  Alle Reiter gehören zu derselben Jahresplan-Zelle. Gespeichert wird erst mit „Plan speichern“.
                </div>
                <button onClick={handleSave} className="btn btn-primary flex items-center justify-center gap-2 sm:min-w-[260px]">
                  <Save size={18} /> Plan speichern
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm shadow-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-border bg-stone-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-text-primary">Spalten & Fächer konfigurieren</h3>
                  <p className="text-[0.6875rem] text-text-muted">Bestimme, welche Spalten in deiner Jahresplanung erscheinen sollen.</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-stone-200 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 min-h-0">
                <div className="grid gap-3">
                  {subjects.map((s, idx) => (
                    <div key={s.id} className="flex flex-col gap-2 bg-stone-50 p-3 rounded-xl border border-stone-200">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center font-black text-[0.75rem] leading-tight shrink-0`}>
                          {idx + 1}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button 
                            disabled={idx === 0}
                            onClick={() => {
                              const newSubjects = [...subjects];
                              const temp = newSubjects[idx];
                              newSubjects[idx] = newSubjects[idx - 1];
                              newSubjects[idx - 1] = temp;
                              setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                            }}
                            className="bg-stone-200 hover:bg-stone-300 disabled:opacity-30 disabled:hover:bg-stone-200 p-0.5 rounded text-stone-600"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button 
                            disabled={idx === subjects.length - 1}
                            onClick={() => {
                              const newSubjects = [...subjects];
                              const temp = newSubjects[idx];
                              newSubjects[idx] = newSubjects[idx + 1];
                              newSubjects[idx + 1] = temp;
                              setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                            }}
                            className="bg-stone-200 hover:bg-stone-300 disabled:opacity-30 disabled:hover:bg-stone-200 p-0.5 rounded text-stone-600"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text"
                            className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-[0.8125rem] font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Fachname..."
                            value={s.label}
                            onChange={e => {
                              const newSubjects = [...subjects];
                              newSubjects[idx] = { ...s, label: e.target.value };
                              setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                            }}
                          />
                        </div>
                        <button 
                          onClick={() => {
                            const newSubjects = subjects.filter((_, i) => i !== idx);
                            setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                          }}
                          className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex gap-1 ml-11 overflow-x-auto pb-1">
                        {[
                          'bg-rose-200 border-rose-400 text-rose-950 font-black',
                          'bg-emerald-200 border-emerald-400 text-emerald-950 font-black',
                          'bg-blue-200 border-blue-400 text-blue-950 font-black',
                          'bg-amber-200 border-amber-400 text-amber-950 font-black',
                          'bg-indigo-200 border-indigo-400 text-indigo-950 font-black',
                          'bg-orange-200 border-orange-400 text-orange-950 font-black',
                          'bg-stone-200 border-stone-400 text-stone-950 font-black',
                          'bg-slate-200 border-slate-400 text-slate-950 font-black',
                          'bg-pink-200 border-pink-400 text-pink-950 font-black',
                          'bg-cyan-200 border-cyan-400 text-cyan-950 font-black',
                        ].map(color => (
                          <button 
                            key={color}
                            onClick={() => {
                              const newSubjects = [...subjects];
                              newSubjects[idx] = { ...s, color };
                              setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                            }}
                            className={`w-5 h-5 rounded ${color} border shrink-0 transition-transform hover:scale-110 ${s.color === color ? 'ring-2 ring-emerald-500 ring-offset-1' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => {
                    const newId = 'fach_' + Date.now();
                    const newSubjects = [...subjects, { 
                      id: newId, 
                      label: 'Neues Fach', 
                      color: 'bg-stone-50 border-stone-200 text-stone-800' 
                    }];
                    setApp(prev => ({ ...prev, jahresplan_faecher: newSubjects }));
                  }}
                  className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 font-bold text-[0.8125rem]"
                >
                  <Plus size={18} /> Spalte hinzufügen
                </button>
              </div>

              <div className="p-4 bg-stone-50 border-t border-border flex justify-end shrink-0">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="btn btn-primary px-8"
                >
                  Fertig
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm shadow-xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl border border-border w-full max-w-2xl  max-h-[85vh] flex flex-col shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[1.25rem] leading-normal">✨</span>
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-[0.875rem] leading-snug md:text-[1rem] leading-normal leading-tight">Planungs-Assistent (KI-Unterstützung)</h3>
                    <p className="text-[0.625rem] text-stone-500 uppercase tracking-widest font-bold mt-0.5">Lehrplan & Stoffplan vervollständigen • {app.stufe}. Schulstufe</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAiModal(false)} 
                  className="p-2 hover:bg-stone-200 rounded-full text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                {aiGeneratingError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-[0.75rem] leading-tight flex items-start gap-2.5">
                    <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                    <div>
                      <p className="font-extrabold text-rose-900">Ein Fehler ist aufgetreten</p>
                      <p className="mt-0.5 leading-relaxed opacity-95">{aiGeneratingError}</p>
                    </div>
                  </div>
                )}

                {isGeneratingSuggestions ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                    <div className="relative">
                      <div className="w-14 h-14 border-[3.5px] border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <span className="absolute inset-0 flex items-center justify-center text-[1.125rem] leading-normal animate-pulse">✨</span>
                    </div>
                    <div>
                      <p className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-indigo-900">KI generiert Vorschläge...</p>
                      <p className="text-[0.6875rem] text-stone-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                        Analysiere {app.stufe}. Schulstufe, vorhandene Jahresplanungsfelder und konfiguriere lehrplankonforme Ergänzungsthemen in Österreich.
                      </p>
                    </div>
                  </div>
                ) : aiSuggestions.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-indigo-50/60 border border-indigo-100/60 p-4 rounded-2xl flex items-start gap-3">
                      <span className="text-[1rem] leading-normal">💡</span>
                      <div className="text-[0.75rem] leading-tight text-indigo-900 leading-snug">
                        <strong>Themenvorschläge geladen!</strong> Die folgenden Ergänzungen wurden lehrplankonform für dich zusammengestellt. Du kannst Vorschläge einzeln prüfen und übernehmen, oder alle gleichzeitig in deinen Plan schreiben.
                      </div>
                    </div>

                    <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1 scrollbar-thin">
                      {aiSuggestions.map((s, idx) => {
                        const subName = subjects.find(sub => sub.id === s.subjectId)?.label || s.subjectId;
                        const subColor = subjects.find(sub => sub.id === s.subjectId)?.color || 'bg-stone-100';
                        const suggestionWeek = weeks.find(w => w.kw === s.kw);
                        const sw = suggestionWeek
                          ? getSW(suggestionWeek.monday, app?.schuljahr, app?.bundesland || 'VBG')
                          : null;

                        return (
                          <div key={idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-stone-50 border border-stone-200/50 rounded-xl hover:bg-stone-50/80 transition-all">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div className="flex flex-col shrink-0 text-center bg-stone-200/60 border border-stone-300/30 rounded-lg px-2 py-1 min-w-[50px]">
                                <span className="text-[0.5rem] font-black tracking-widest text-stone-500 uppercase leading-none">KW {s.kw}</span>
                                {sw && <span className="text-[0.625rem] font-bold text-stone-800 leading-tight mt-0.5">SW {sw}</span>}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-[0.5rem] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${subColor}`}>
                                    {subName}
                                  </span>
                                  {s.buch && (
                                    <span className="text-[0.5625rem] font-bold text-stone-400 bg-white border border-stone-200/50 px-1 py-0.2 rounded-md">
                                      {s.buch}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-extrabold text-stone-900 text-[0.75rem] leading-tight mt-1 text-wrap leading-tight break-words" title={s.thema}>
                                  {s.thema}
                                </h4>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplySingleSuggestion(s)}
                              className="w-full sm:w-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[0.5625rem] uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1 shrink-0"
                            >
                              <Plus size={12} /> Übernehmen
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-[0.75rem] leading-tight text-stone-600 leading-relaxed">
                      Dieser Assistent hilft dir dabei, Leerstellen in deiner Jahresplanung auszufüllen. Er analysiert bereits eingetragene Themen und generiert lehrplanbasierte, aufeinander aufbauende Vorschläge für die übrigen Wochen.
                    </p>

                    <div className="space-y-3.5 bg-stone-50 border border-stone-150 p-4 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[0.625rem] font-black uppercase text-stone-500">Für welches Fach?</label>
                        <select
                          value={aiSubjectsOnly}
                          onChange={e => setAiSubjectsOnly(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-tight font-bold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="all">Alle Fächer ({subjects.length})</option>
                          {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[0.625rem] font-black uppercase text-stone-500">Für welche Woche?</label>
                        <select
                          value={aiTargetWeek}
                          onChange={e => setAiTargetWeek(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-tight font-bold text-stone-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="all">Alle freien Wochen ({weeks.length})</option>
                          {weeks.map(w => (
                            <option key={w.kw} value={w.kw.toString()}>Nur KW {w.kw} (Schulwoche {w.sw})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[0.625rem] font-black uppercase text-stone-500">Thematischer Schwerpunkt (Optional)</label>
                        <input
                          type="text"
                          value={aiUserFocus}
                          onChange={e => setAiUserFocus(e.target.value)}
                          placeholder="z.B. Fokus auf Sachrechnen, Geometrie oder Grammatik"
                          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-tight font-bold text-stone-800 placeholder-stone-400 outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      {(() => {
                        const emptyCount = getEmptyCellsList().reduce((acc, curr) => acc + curr.subjectIds.length, 0);
                        return (
                          <div className="text-[0.6875rem] font-bold text-stone-500 bg-white/60 border border-stone-200/50 p-2.5 rounded-lg flex items-center gap-1.5">
                            <Info size={14} className="text-indigo-500" />
                            <span>Es gibt aktuell <strong>{emptyCount} freie Zeilen</strong>, die gefüllt werden können.</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-between gap-3 shrink-0">
                {aiSuggestions.length > 0 ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => setAiSuggestions([])} 
                      className="btn bg-white text-stone-600 border border-stone-200 hover:bg-stone-100 rounded-xl text-[0.75rem] leading-tight px-4"
                    >
                      Zurück
                    </button>
                    <button 
                      type="button"
                      onClick={handleApplyAllSuggestions}
                      className="flex-1 btn bg-gradient-to-r from-emerald-600 to-indigo-600 hover:brightness-110 text-white font-extrabold text-[0.75rem] leading-tight px-5 flex items-center justify-center gap-2"
                    >
                      <Save size={16} /> Alle Vorschläge übernehmen
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      type="button"
                      onClick={() => setShowAiModal(false)} 
                      className="flex-1 btn bg-white text-stone-600 border border-stone-200 hover:bg-stone-100 rounded-xl text-[0.75rem] leading-tight py-2.5"
                    >
                      Abbrechen
                    </button>
                    <button 
                      type="button"
                      disabled={isGeneratingSuggestions}
                      onClick={handleGenerateSuggestions}
                      className="flex-1 btn bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[0.75rem] leading-tight py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 disabled:opacity-50"
                    >
                      <span>✨</span> Vorschläge füllen (KI)
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sparkles suggestions popup */}
      <AnimatePresence>
        {suggestingCell && (
          <div className="fixed inset-0 z-[310] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm shadow-xl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-border w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 bg-amber-50/50 border-b border-stone-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[1.125rem]">✨</span>
                  <div>
                    <h3 className="font-extrabold text-stone-900 text-[0.8125rem] leading-none md:text-[0.875rem] leading-tight">Lehrplan-Themenvorschläge</h3>
                    <p className="text-[0.5625rem] text-stone-400 uppercase tracking-widest font-black mt-1">
                      KW {suggestingCell.kw} • {subjects.find(s => s.id === suggestingCell.subjectId)?.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSuggestingCell(null)}
                  className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin">
                <p className="text-[0.6875rem] text-stone-500 font-medium leading-relaxed">
                  Basierend auf der {app.stufe}. Schulstufe in Österreich haben wir folgende lehrplankonforme Vorschläge für dieses Fach herausgesucht. Klicke auf ein Thema, um es direkt einzutragen:
                </p>

                <div className="space-y-2">
                  {(() => {
                    const subId = suggestingCell.subjectId;
                    // Try matching SUGGESTION_CORPUS
                    const level = Math.max(1, Math.min(4, parseInt(app.stufe?.toString() || '1') || 1));
                    const list = SUGGESTION_CORPUS[subId]?.[level] || [
                      'Eigene Themenschwerpunkte erarbeiten',
                      'Wiederholung & Vertiefung der Lernziele',
                      'Kreative Projektwoche / Freiarbeit',
                      'Übungs- und Festigungseinheiten'
                    ];

                    return list.map((thema, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setApp(prev => {
                            const jp = { ...(prev.jahresplanung || {}) };
                            if (!jp[suggestingCell.kw]) jp[suggestingCell.kw] = {};
                            jp[suggestingCell.kw][suggestingCell.subjectId] = {
                              thema,
                              buch: '',
                              type: 'standard',
                              subCategory: '',
                              subCategories: [],
                              items: []
                            };
                            return { ...prev, jahresplanung: jp };
                          });
                          setSuggestingCell(null);
                        }}
                        className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-amber-300 hover:bg-amber-50/30 transition-all font-bold text-[0.75rem] text-stone-800 shadow-sm flex items-start gap-2.5 group"
                      >
                        <span className="text-amber-500 group-hover:scale-125 transition-transform shrink-0">⚡</span>
                        <span className="leading-snug">{thema}</span>
                      </button>
                    ));
                  })()}
                </div>
              </div>

              <div className="p-3 bg-stone-50 border-t border-stone-100 flex justify-end shrink-0">
                <button
                  onClick={() => setSuggestingCell(null)}
                  className="btn bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl text-[0.75rem] leading-tight px-5 py-2"
                >
                  Schließen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl shrink-0">
          <Info size={18} />
        </div>
        <p className="text-[0.75rem] text-blue-800 leading-snug">
          <strong>Tipp:</strong> Hier planst du Themen und Ziele für das Schuljahr. Die vorhandenen Themen kannst du im Wochenplan gezielt einer freien Unterrichtsstunde zuordnen. Drucken und Exportieren findest du im Druckzentrum.
        </p>
      </div>

      <JahresplanExcelModal
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onImport={handleJahresplanImport}
        app={app}
        availableSubjects={subjects}
      />
    </div>
  );
}
