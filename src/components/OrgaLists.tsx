import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Plus, Trash2, Search, Printer, Wallet, History, 
  Key, Eye, EyeOff, Copy, ExternalLink, X, Edit2,
  CheckCircle2, Clock, AlertCircle, ArrowRight, 
  Ruler, Backpack, Check, Archive, ArrowLeft,
  ChevronRight, MoreHorizontal, Calendar, Download,
  Coins, Filter, Layers, CheckSquare, Sparkles, AlertTriangle, FileText
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Zugangsdaten, Geldsammlung, KassenTransaktion, CustomList, OrgCheckliste, CustomListColumn, CustomListColumnType } from '../types';
import FlexibleListsView, { PRESET_TEMPLATES } from './orga/FlexibleListsView';
import {
  addManualCashTransaction,
  dateInputToLocalNoonIso,
  deleteManualCashTransaction,
  formatOrgaDate,
  getLocalOrgaDateKey,
  markCollectionPaidForStudents,
  normalizeKlassenkasse,
  parseEuroInput,
  setCollectionPaymentAmount,
} from '../lib/orgaData';

const formatEuro = (value: number) =>
  new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);

export default function OrgaLists() {
  const { app, setApp } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';

  // Navigation state
  // 'offen' = Ebene 1 (Default Start View: Was ist offen?)
  // 'sammlung-detail' = Ebene 2 (Opened Geldsammlung)
  // 'kassenbuch' | 'passwords' | 'checklisten' | 'custom-lists' | 'archiv' = Ebene 3 (Details/Archiv/Tools)
  const [activeTab, setActiveTab] = useState<string>('offen');
  
  // Selected items
  const [selectedSammlungId, setSelectedSammlungId] = useState<string | null>(null);
  const [selectedChecklisteId, setSelectedChecklisteId] = useState<string | null>(null);
  const [selectedCustomListId, setSelectedCustomListId] = useState<string | null>(null);

  // Search & Filter
  const [studentSearch, setStudentSearch] = useState('');
  const [passwordSearch, setPasswordSearch] = useState('');
  const [kasseSearch, setKasseSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState<'all' | 'open' | 'paid'>('all');

  // Menus & Modals
  const [isMehrMenuOpen, setIsMehrMenuOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<'sammlung' | 'checkliste' | 'passwort' | 'customList' | 'transaction' | null>(null);

  // Form states for modals
  // 1. Geldsammlung
  const [sammlungTitle, setSammlungTitle] = useState('');
  const [sammlungAmount, setSammlungAmount] = useState('');
  const [sammlungDueDate, setSammlungDueDate] = useState('');
  const [sammlungNote, setSammlungNote] = useState('');

  // 2. Checkliste / Ausflug
  const [checklisteTitle, setChecklisteTitle] = useState('');
  const [checklisteDate, setChecklisteDate] = useState('');

  // 3. Passwort
  const [pwBezeichnung, setPwBezeichnung] = useState('');
  const [pwBenutzername, setPwBenutzername] = useState('');
  const [pwPasswort, setPwPasswort] = useState('');
  const [pwKategorie, setPwKategorie] = useState('Lernportal');
  const [pwUrl, setPwUrl] = useState('');
  const [editingPwItem, setEditingPwItem] = useState<Zugangsdaten | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // 4. Custom List
  const [customListTitle, setCustomListTitle] = useState('');
  const [customListDesc, setCustomListDesc] = useState('');
  const [customListColumns, setCustomListColumns] = useState<CustomListColumn[]>([
    { id: 'col_1', label: 'Notiz / Info', type: 'text' }
  ]);

  // 5. Transaction
  const [txType, setTxType] = useState<'plus' | 'minus'>('plus');
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<'sammlung' | 'ausgabe' | 'sonstiges'>('sonstiges');
  const [txStudentId, setTxStudentId] = useState('');
  const [txDate, setTxDate] = useState(getLocalOrgaDateKey());
  const [txToDelete, setTxToDelete] = useState<KassenTransaktion | null>(null);

  // Partial payment inline edit
  const [editingPartialStudentId, setEditingPartialStudentId] = useState<string | null>(null);
  const [partialAmountInput, setPartialAmountInput] = useState('');

  // Auto-hide visible passwords after 30s
  useEffect(() => {
    const visibleIds = Object.keys(visiblePasswords).filter(id => visiblePasswords[id]);
    if (visibleIds.length === 0) return;
    const timer = setTimeout(() => setVisiblePasswords({}), 30000);
    return () => clearTimeout(timer);
  }, [visiblePasswords]);

  useEffect(() => {
    // Kein offener Kassa-/Orga-Entwurf darf in die nächste Klasse mitwandern.
    setActiveTab('offen');
    setSelectedSammlungId(null);
    setSelectedChecklisteId(null);
    setSelectedCustomListId(null);
    setStudentSearch('');
    setPasswordSearch('');
    setKasseSearch('');
    setStudentFilter('all');
    setIsMehrMenuOpen(false);
    setIsNewModalOpen(false);
    setNewItemType(null);
    setSammlungTitle('');
    setSammlungAmount('');
    setSammlungDueDate('');
    setSammlungNote('');
    setChecklisteTitle('');
    setChecklisteDate('');
    setPwBezeichnung('');
    setPwBenutzername('');
    setPwPasswort('');
    setPwUrl('');
    setEditingPwItem(null);
    setVisiblePasswords({});
    setCustomListTitle('');
    setCustomListDesc('');
    setCustomListColumns([{ id: 'col_1', label: 'Notiz / Info', type: 'text' }]);
    setTxType('plus');
    setTxTitle('');
    setTxAmount('');
    setTxCategory('sonstiges');
    setTxStudentId('');
    setTxDate(getLocalOrgaDateKey());
    setTxToDelete(null);
    setEditingPartialStudentId(null);
    setPartialAmountInput('');
  }, [app.activeClassId]);

  // App state getters
  const kasse = normalizeKlassenkasse(app.klassenkasse);
  const passwords = app.zugangsdaten || [];
  const customLists = app.customLists || [];
  const checklisten = app.checklisten || [];
  const students = app.schueler || [];

  // Legacy cash migration is handled centrally by normalizeAppState / normalizeKlassenkasse.

  // Helper stats calculation
  const activeSammlungen = kasse.sammlungen.filter(s => !s.abgeschlossen);
  const archivedSammlungen = kasse.sammlungen.filter(s => s.abgeschlossen);

  // Count open collections with unpaid balance
  const openSammlungenCount = activeSammlungen.filter(s => {
    return students.some(st => (s.betraege?.[st.id] || 0) < s.betrag);
  }).length;

  // Total open money remaining across active collections
  const totalOpenDebtSum = activeSammlungen.reduce((sum, s) => {
    return sum + students.reduce((stSum, st) => {
      const paid = s.betraege?.[st.id] || 0;
      return stSum + Math.max(0, s.betrag - paid);
    }, 0);
  }, 0);

  // Students with open payments
  const studentsWithOpenPayments = students.filter(st => {
    return activeSammlungen.some(s => (s.betraege?.[st.id] || 0) < s.betrag);
  });

  // Active checklisten
  const activeChecklisten = checklisten;

  // Selected sammlung reference
  const currentSammlung = kasse.sammlungen.find(s => s.id === selectedSammlungId);

  // Handle 1-click toggle payment
  const toggleStudentPayment = (sid: string, sammlungId: string) => {
    setApp(prev => {
      const currentKasse = normalizeKlassenkasse(prev.klassenkasse);
      const collection = currentKasse.sammlungen.find(item => item.id === sammlungId);
      if (!collection) return prev;

      const currentPaid = collection.betraege?.[sid] || 0;
      const isFullyPaid = currentPaid >= collection.betrag;
      const student = (prev.schueler || []).find(st => st.id === sid);
      const studentLabel = student ? `${student.vorname} ${student.nachname}`.trim() : 'Schüler:in';

      return {
        ...prev,
        klassenkasse: setCollectionPaymentAmount(currentKasse, {
          sammlungId,
          studentId: sid,
          paidAmount: isFullyPaid ? 0 : collection.betrag,
          studentLabel,
        }),
      };
    });
  };

  // Handle custom amount entry
  const applyPartialAmount = (sid: string, sammlungId: string, amountStr: string) => {
    const collection = kasse.sammlungen.find(item => item.id === sammlungId);
    if (!collection) return;

    const parsed = parseEuroInput(amountStr, { allowZero: true, max: collection.betrag });
    if (!parsed.valid) {
      alert(`Bitte einen gültigen Betrag zwischen 0 und ${formatEuro(collection.betrag)} eingeben.`);
      return;
    }

    setApp(prev => {
      const currentKasse = normalizeKlassenkasse(prev.klassenkasse);
      const currentCollection = currentKasse.sammlungen.find(item => item.id === sammlungId);
      if (!currentCollection || parsed.value > currentCollection.betrag) return prev;

      const student = (prev.schueler || []).find(st => st.id === sid);
      const studentLabel = student ? `${student.vorname} ${student.nachname}`.trim() : 'Schüler:in';

      return {
        ...prev,
        klassenkasse: setCollectionPaymentAmount(currentKasse, {
          sammlungId,
          studentId: sid,
          paidAmount: parsed.value,
          studentLabel,
        }),
      };
    });

    setEditingPartialStudentId(null);
    setPartialAmountInput('');
  };

  // Mark all paid in one click
  const markAllPaidForSammlung = (samId: string) => {
    if (!confirm('Alle Schüler als vollständig bezahlt markieren?')) return;
    setApp(prev => {
      const currentKasse = normalizeKlassenkasse(prev.klassenkasse);
      const classStudents = (prev.schueler || []).map(student => ({
        id: student.id,
        label: `${student.vorname} ${student.nachname}`.trim() || 'Schüler:in',
      }));

      return {
        ...prev,
        klassenkasse: markCollectionPaidForStudents(
          currentKasse,
          samId,
          classStudents,
          new Date().toISOString()
        ),
      };
    });
  };

  // Archive or unarchive collection
  const toggleArchiveSammlung = (samId: string) => {
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          sammlungen: prev.klassenkasse.sammlungen.map(s => 
            s.id === samId ? { ...s, abgeschlossen: !s.abgeschlossen } : s
          )
        }
      };
    });
  };

  // Create Geldsammlung
  const handleCreateSammlung = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseEuroInput(sammlungAmount);
    if (!sammlungTitle.trim() || !parsed.valid) {
      alert('Bitte einen gültigen Titel und einen positiven Betrag mit höchstens zwei Nachkommastellen eingeben.');
      return;
    }

    const newSammlung: Geldsammlung = {
      id: crypto.randomUUID(),
      titel: sammlungTitle.trim(),
      betrag: parsed.value,
      faelligkeit: sammlungDueDate || undefined,
      beschreibung: sammlungNote.trim() || undefined,
      erstelltAm: new Date().toISOString(),
      abgeschlossen: false,
      status: {},
      betraege: {}
    };

    setApp(prev => {
      const currentKasse = normalizeKlassenkasse(prev.klassenkasse);
      const collection = {
        ...newSammlung,
        status: {} as Geldsammlung['status'],
        betraege: {} as Geldsammlung['betraege'],
      };

      (prev.schueler || []).forEach(student => {
        collection.status[student.id] = 'offen';
        collection.betraege[student.id] = 0;
      });

      return {
        ...prev,
        klassenkasse: {
          ...currentKasse,
          sammlungen: [...currentKasse.sammlungen, collection],
        },
      };
    });

    setSammlungTitle('');
    setSammlungAmount('');
    setSammlungDueDate('');
    setSammlungNote('');
    setIsNewModalOpen(false);
    setNewItemType(null);
    setSelectedSammlungId(newSammlung.id);
    setActiveTab('sammlung-detail');
  };

  // Create Checkliste
  const handleCreateCheckliste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklisteTitle.trim()) return;

    const newList: OrgCheckliste = {
      id: crypto.randomUUID(),
      titel: checklisteTitle.trim(),
      datum: checklisteDate ? dateInputToLocalNoonIso(checklisteDate) : undefined,
      spalten: [
        { id: crypto.randomUUID(), label: 'Einverständnis' },
        { id: crypto.randomUUID(), label: 'Geld abgegeben' }
      ],
      eintraege: {}
    };

    setApp(prev => ({
      ...prev,
      checklisten: [...(prev.checklisten || []), newList]
    }));

    setChecklisteTitle('');
    setChecklisteDate('');
    setIsNewModalOpen(false);
    setNewItemType(null);
    setSelectedChecklisteId(newList.id);
    setActiveTab('checklisten');
  };

  // Create Passwort
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwBezeichnung.trim() || !pwBenutzername.trim() || !pwPasswort.trim()) {
      alert('Bitte Bezeichnung, Benutzername und Passwort eingeben.');
      return;
    }

    if (editingPwItem) {
      setApp(prev => ({
        ...prev,
        zugangsdaten: (prev.zugangsdaten || []).map(p => 
          p.id === editingPwItem.id 
            ? { ...p, bezeichnung: pwBezeichnung, benutzername: pwBenutzername, passwort: pwPasswort, kategorie: pwKategorie, url: pwUrl }
            : p
        )
      }));
    } else {
      const newEntry: Zugangsdaten = {
        id: crypto.randomUUID(),
        bezeichnung: pwBezeichnung,
        benutzername: pwBenutzername,
        passwort: pwPasswort,
        kategorie: pwKategorie,
        url: pwUrl
      };
      setApp(prev => ({
        ...prev,
        zugangsdaten: [...(prev.zugangsdaten || []), newEntry]
      }));
    }

    setPwBezeichnung('');
    setPwBenutzername('');
    setPwPasswort('');
    setPwUrl('');
    setEditingPwItem(null);
    setIsNewModalOpen(false);
    setNewItemType(null);
    setActiveTab('passwords');
  };

  // Create Custom List
  const handleCreateCustomList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customListTitle.trim()) return;

    const validColumns = customListColumns.filter(c => c.label.trim() !== '');
    const columnsToSave: CustomListColumn[] = validColumns.length > 0
      ? validColumns
      : [{ id: 'col_default', label: 'Eintrag', type: 'text' }];

    const newList: CustomList = {
      id: 'custom_' + Math.random().toString(36).substring(2, 9),
      titel: customListTitle.trim(),
      beschreibung: customListDesc.trim() || undefined,
      spalten: columnsToSave,
      werte: {},
      erstelltAm: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      customLists: [...(prev.customLists || []), newList]
    }));

    setCustomListTitle('');
    setCustomListDesc('');
    setCustomListColumns([{ id: 'col_1', label: 'Notiz / Info', type: 'text' }]);
    setIsNewModalOpen(false);
    setNewItemType(null);
    setSelectedCustomListId(newList.id);
    setActiveTab('custom-lists');
  };

  // Add Manual Ledger Transaction
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseEuroInput(txAmount);
    if (!parsed.valid) {
      alert('Bitte einen positiven Betrag mit höchstens zwei Nachkommastellen eingeben.');
      return;
    }

    setApp(prev => {
      const student = (prev.schueler || []).find(s => s.id === txStudentId);
      const labelTitle = txTitle.trim() || (txType === 'plus' ? 'Einnahme' : 'Ausgabe');
      const fullTitle = student ? `${student.vorname} ${student.nachname}: ${labelTitle}` : labelTitle;
      const dateIso = txDate ? dateInputToLocalNoonIso(txDate) : undefined;

      const newTx: KassenTransaktion = {
        id: crypto.randomUUID(),
        datum: dateIso || new Date().toISOString(),
        titel: fullTitle,
        betrag: parsed.value,
        typ: txType,
        kategorie: txCategory,
        schuelerId: txStudentId || undefined
      };

      return {
        ...prev,
        klassenkasse: addManualCashTransaction(normalizeKlassenkasse(prev.klassenkasse), newTx),
      };
    });

    setTxTitle('');
    setTxAmount('');
    setTxStudentId('');
    setTxDate(getLocalOrgaDateKey());
    setIsNewModalOpen(false);
    setNewItemType(null);
    setActiveTab('kassenbuch');
  };

  // Delete manual transaction
  const handleConfirmDeleteTransaction = () => {
    if (!txToDelete) return;
    setApp(prev => ({
      ...prev,
      klassenkasse: deleteManualCashTransaction(
        normalizeKlassenkasse(prev.klassenkasse),
        txToDelete.id
      ),
    }));
    setTxToDelete(null);
  };

  // Print helper for payments
  const handlePrintPayments = (sammlung?: Geldsammlung) => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col font-sans px-3 sm:px-6 lg:px-8 pt-4 pb-12 space-y-5" data-zoom-container={zoomLevel}>
      
      {/* ========================================== */}
      {/* VEREINFACHTER KOPFBEREICH                  */}
      {/* ========================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shadow-3xs">
            <Coins size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[1.125rem] font-black text-slate-900 tracking-tight leading-tight">Kasse & Orga</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[0.6875rem] font-bold">
                {app.klassenbezeichnung || app.klasse ? `Klasse ${app.klassenbezeichnung || app.klasse}` : 'Kassa & Orga'}
              </span>
            </div>
            <p className="text-[0.75rem] font-medium text-slate-500">
              Geldsammlungen, Ausflüge und organisatorische Aufgaben im Überblick
            </p>
          </div>
        </div>

        {/* TOP BUTTONS */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {/* Quick toggle back to "Was ist offen?" if in subview */}
          {activeTab !== 'offen' && (
            <button
              onClick={() => {
                setActiveTab('offen');
                setSelectedSammlungId(null);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-[0.75rem] font-bold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft size={15} />
              <span>Übersicht</span>
            </button>
          )}

          {/* + NEU BUTTON */}
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.8125rem] shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus size={16} />
            <span>Neu</span>
          </button>

          {/* ⋯ MEHR DROPDOWN MENU */}
          <div className="relative">
            <button
              onClick={() => setIsMehrMenuOpen(!isMehrMenuOpen)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[0.8125rem] flex items-center gap-1.5 transition-all"
            >
              <MoreHorizontal size={18} />
              <span className="hidden sm:inline">Mehr</span>
            </button>

            {/* MEHR DROPDOWN POPOVER */}
            <AnimatePresence>
              {isMehrMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setIsMehrMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-12 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-40 space-y-1"
                  >
                    <div className="px-3 py-1.5 text-[0.625rem] font-black uppercase tracking-wider text-slate-400">
                      Organisationsbereiche
                    </div>
                    
                    <button
                      onClick={() => { setActiveTab('offen'); setSelectedSammlungId(null); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'offen' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Coins size={16} className="text-indigo-500" />
                      <span>Was ist offen? (Dashboard)</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('kassenbuch'); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'kassenbuch' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Wallet size={16} className="text-emerald-500" />
                      <span>Kassenbuch & Journal ({formatEuro(kasse.kontostand)})</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('passwords'); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'passwords' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Key size={16} className="text-amber-500" />
                      <span>Passwörter & Zugänge ({passwords.length})</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('checklisten'); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'checklisten' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Backpack size={16} className="text-sky-500" />
                      <span>Ausflüge & Checklisten ({checklisten.length})</span>
                    </button>

                    <button
                      onClick={() => { setActiveTab('custom-lists'); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'custom-lists' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Ruler size={16} className="text-purple-500" />
                      <span>Flexible Listen ({customLists.length})</span>
                    </button>

                    <div className="border-t border-slate-100 my-1 pt-1" />

                    <button
                      onClick={() => { setActiveTab('archiv'); setIsMehrMenuOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold flex items-center gap-2.5 transition-all ${activeTab === 'archiv' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <Archive size={16} className="text-slate-500" />
                      <span>Archiv ({archivedSammlungen.length})</span>
                    </button>

                    <button
                      onClick={() => { window.print(); setIsMehrMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 rounded-xl text-[0.75rem] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-all"
                    >
                      <Printer size={16} className="text-slate-500" />
                      <span>Seite drucken</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* EBENE 1: STARTSEITE "WAS IST OFFEN?" (DEFAULT VIEW)                   */}
      {/* ==================================================================== */}
      {activeTab === 'offen' && (
        <div className="space-y-5">
          
          {/* MAX 4 KEY METRICS (KPI CARDS) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* 1. OFFENE SAMMLUNGEN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-3xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">Offene Sammlungen</span>
                <Coins size={16} className="text-indigo-500" />
              </div>
              <div className="text-[1.5rem] font-black text-slate-900 leading-tight">
                {openSammlungenCount} <span className="text-[0.8125rem] font-bold text-slate-400">aktiv</span>
              </div>
              <p className="text-[0.6875rem] font-semibold text-amber-600 truncate">
                {formatEuro(totalOpenDebtSum)} ausstehend
              </p>
            </div>

            {/* 2. SCHÜLER MIT OFFENEN ZAHLUNGEN */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-3xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">Noch nicht bezahlt</span>
                <Clock size={16} className="text-amber-500" />
              </div>
              <div className="text-[1.5rem] font-black text-slate-900 leading-tight">
                {studentsWithOpenPayments.length} <span className="text-[0.8125rem] font-bold text-slate-400">Kinder</span>
              </div>
              <p className="text-[0.6875rem] font-semibold text-slate-500">
                von insgesamt {students.length} Schülern
              </p>
            </div>

            {/* 3. DIESE WOCHE WICHTIG */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-3xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">Diese Woche</span>
                <AlertCircle size={16} className="text-sky-500" />
              </div>
              <div className="text-[1.5rem] font-black text-slate-900 leading-tight">
                {activeSammlungen.filter(s => s.faelligkeit).length + activeChecklisten.length} <span className="text-[0.8125rem] font-bold text-slate-400">Posten</span>
              </div>
              <p className="text-[0.6875rem] font-semibold text-slate-500 truncate">
                Fälligkeiten & Rückläufe
              </p>
            </div>

            {/* 4. GUTHABEN STAND */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-3xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">Kassenstand</span>
                <Wallet size={16} className="text-emerald-500" />
              </div>
              <div className="text-[1.5rem] font-black text-slate-900 leading-tight font-mono">
                {formatEuro(kasse.kontostand)}
              </div>
              <button 
                onClick={() => setActiveTab('kassenbuch')} 
                className="text-[0.6875rem] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
              >
                Kassenbuch öffnen →
              </button>
            </div>

          </div>

          {/* MAIN GRID: GELDSAMMLUNGEN & ORGANISATORISCHE TO-DOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEFT COLUMN: AKTIVE GELDSAMMLUNGEN (7 cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[0.9375rem] font-black text-slate-900 tracking-tight">Aktive Geldsammlungen</h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[0.6875rem] font-bold">
                    {activeSammlungen.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setNewItemType('sammlung');
                    setIsNewModalOpen(true);
                  }}
                  className="text-[0.75rem] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <Plus size={14} /> Neue Sammlung
                </button>
              </div>

              {activeSammlungen.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 mx-auto flex items-center justify-center text-slate-400">
                    <Coins size={24} />
                  </div>
                  <div>
                    <p className="text-[0.875rem] font-bold text-slate-700">Keine aktiven Geldsammlungen</p>
                    <p className="text-[0.75rem] text-slate-400">Starten Sie eine neue Sammlung für Ausflüge, Theater oder Materialgeld.</p>
                  </div>
                  <button
                    onClick={() => {
                      setNewItemType('sammlung');
                      setIsNewModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-[0.75rem] inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} /> Sammlung starten
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeSammlungen.map(s => {
                    const paidCount = students.filter(st => (s.status[st.id] || 'offen') === 'bezahlt').length;
                    const openCount = students.length - paidCount;
                    const isFullyPaid = openCount === 0 && students.length > 0;
                    const openSumForThis = students.reduce((sum, st) => {
                      const paid = s.betraege?.[st.id] || 0;
                      return sum + Math.max(0, s.betrag - paid);
                    }, 0);

                    return (
                      <div
                        key={s.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-3xs hover:border-indigo-200 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <h3 className="text-[0.9375rem] font-black text-slate-900 tracking-tight">{s.titel}</h3>
                              {isFullyPaid && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[0.625rem] font-extrabold flex items-center gap-1">
                                  <Check size={12} /> Vollständig bezahlt
                                </span>
                              )}
                            </div>
                            <p className="text-[0.75rem] font-bold text-slate-500">
                              {formatEuro(s.betrag)} pro Kind
                              {s.faelligkeit && (
                                <span className="ml-2 text-slate-400 font-normal">
                                  • Fällig: {formatOrgaDate(s.faelligkeit)}
                                </span>
                              )}
                            </p>
                          </div>

                          <button
                            onClick={() => {
                              setSelectedSammlungId(s.id);
                              setActiveTab('sammlung-detail');
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[0.75rem] font-bold flex items-center gap-1.5 transition-all shadow-3xs"
                          >
                            <span>Öffnen</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>

                        {/* PROGRESS BAR & STATS */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[0.6875rem] font-bold">
                            <span className="text-slate-600">
                              <strong className="text-slate-900">{paidCount}</strong> von {students.length} bezahlt
                            </span>
                            {openCount > 0 ? (
                              <span className="text-amber-600 font-extrabold">
                                {openCount} offen ({formatEuro(openSumForThis)})
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-extrabold">100% erledigt</span>
                            )}
                          </div>

                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div 
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${students.length > 0 ? (paidCount / students.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* CARD BOTTOM ACTION BAR */}
                        <div className="pt-1 flex items-center justify-between text-[0.6875rem]">
                          <button
                            onClick={() => markAllPaidForSammlung(s.id)}
                            className="text-slate-500 hover:text-emerald-600 font-semibold flex items-center gap-1"
                          >
                            <CheckCircle2 size={13} /> Alle als bezahlt markieren
                          </button>

                          <button
                            onClick={() => toggleArchiveSammlung(s.id)}
                            className="text-slate-400 hover:text-slate-600 font-medium"
                          >
                            Ins Archiv verschieben
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: ORGANISATORISCHE AUFGABEN & CHECKLISTEN (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[0.9375rem] font-black text-slate-900 tracking-tight">Diese Woche wichtig</h2>
                <button
                  onClick={() => {
                    setNewItemType('checkliste');
                    setIsNewModalOpen(true);
                  }}
                  className="text-[0.75rem] font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                >
                  <Plus size={14} /> Aufgabe / Ausflug
                </button>
              </div>

              {activeChecklisten.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center space-y-2">
                  <p className="text-[0.8125rem] font-bold text-slate-600">Keine offenen Ausflüge oder Checklisten</p>
                  <p className="text-[0.6875rem] text-slate-400">Erstellen Sie Rücklaufzettel oder Aufgaben für die Klasse.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeChecklisten.map(c => {
                    return (
                      <div
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-3xs flex items-center justify-between gap-3 hover:border-sky-200 transition-all"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <Backpack size={15} className="text-sky-500" />
                            <h3 className="text-[0.8125rem] font-bold text-slate-900">{c.titel}</h3>
                          </div>
                          {c.datum && (
                            <p className="text-[0.6875rem] font-semibold text-slate-400">
                              Termin: {formatOrgaDate(c.datum)}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            setSelectedChecklisteId(c.id);
                            setActiveTab('checklisten');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[0.75rem] transition-all"
                        >
                          Ansehen
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* QUICK LINKS TO TOOLS */}
              <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-200/60 space-y-2">
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 block">
                  Schnellzugriff & Werkzeuge
                </span>
                
                <div className="grid grid-cols-2 gap-2 text-[0.75rem]">
                  <button
                    onClick={() => setActiveTab('passwords')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-amber-200 text-left space-y-1 transition-all"
                  >
                    <Key size={16} className="text-amber-500" />
                    <div className="font-bold text-slate-800">Passwörter</div>
                    <div className="text-[0.6875rem] text-slate-400">{passwords.length} Zugänge gespeichert</div>
                  </button>

                  <button
                    onClick={() => setActiveTab('custom-lists')}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 hover:border-purple-200 text-left space-y-1 transition-all"
                  >
                    <Ruler size={16} className="text-purple-500" />
                    <div className="font-bold text-slate-800">Flexible Listen</div>
                    <div className="text-[0.6875rem] text-slate-400">{customLists.length} Speziallisten</div>
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* EBENE 2: GELDSAMMLUNG BEARBEITEN & 1-KLICK ZAHLUNGEN                   */}
      {/* ==================================================================== */}
      {activeTab === 'sammlung-detail' && currentSammlung && (
        <div className="space-y-4">
          
          {/* HEADER BAR FOR OPENED SAMMLUNG */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab('offen');
                    setSelectedSammlungId(null);
                  }}
                  className="text-[0.75rem] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={14} /> Zurück zur Übersicht
                </button>
                
                <div className="flex items-center gap-2">
                  <h2 className="text-[1.25rem] font-black text-slate-900 tracking-tight">{currentSammlung.titel}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[0.75rem]">
                    {formatEuro(currentSammlung.betrag)} pro Kind
                  </span>
                </div>
              </div>

              {/* ACTIONS FOR THIS COLLECTION */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => markAllPaidForSammlung(currentSammlung.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[0.75rem] flex items-center gap-1.5 transition-all"
                >
                  <CheckCircle2 size={15} /> Alle bezahlt
                </button>

                <button
                  onClick={() => handlePrintPayments(currentSammlung)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[0.75rem] flex items-center gap-1.5 transition-all"
                >
                  <Printer size={15} /> Drucken
                </button>

                <button
                  onClick={() => toggleArchiveSammlung(currentSammlung.id)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-[0.75rem] flex items-center gap-1.5 transition-all"
                >
                  <Archive size={15} /> {currentSammlung.abgeschlossen ? 'Wieder aktivieren' : 'Archivieren'}
                </button>
              </div>
            </div>

            {/* SEARCH & STATUS FILTER */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              
              {/* STATUS FILTER BUTTONS */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setStudentFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[0.75rem] font-bold transition-all ${studentFilter === 'all' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Alle ({students.length})
                </button>
                <button
                  onClick={() => setStudentFilter('open')}
                  className={`px-3 py-1 rounded-lg text-[0.75rem] font-bold transition-all ${studentFilter === 'open' ? 'bg-white text-amber-700 shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Nur Offen ({students.filter(st => (currentSammlung.status[st.id] || 'offen') !== 'bezahlt').length})
                </button>
                <button
                  onClick={() => setStudentFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-[0.75rem] font-bold transition-all ${studentFilter === 'paid' ? 'bg-white text-emerald-700 shadow-3xs' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Nur Bezahlt ({students.filter(st => (currentSammlung.status[st.id] || 'offen') === 'bezahlt').length})
                </button>
              </div>

              {/* SEARCH STUDENT */}
              <div className="relative flex-1 max-w-xs">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Schüler/in suchen..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[0.75rem] font-bold outline-none focus:border-indigo-500"
                />
              </div>

            </div>

          </div>

          {/* STUDENT PAYMENT LIST (1-CLICK TOGGLE) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="divide-y divide-slate-100">
              {students
                .filter(st => {
                  const matchesSearch = `${st.vorname} ${st.nachname}`.toLowerCase().includes(studentSearch.toLowerCase());
                  const stStatus = currentSammlung.status[st.id] || 'offen';
                  if (studentFilter === 'open') return matchesSearch && stStatus !== 'bezahlt';
                  if (studentFilter === 'paid') return matchesSearch && stStatus === 'bezahlt';
                  return matchesSearch;
                })
                .map((st, index) => {
                  const status = currentSammlung.status[st.id] || 'offen';
                  const paidAmount = currentSammlung.betraege?.[st.id] || 0;
                  const isPaid = status === 'bezahlt';
                  const isPartial = status === 'teilweise';

                  return (
                    <div
                      key={st.id}
                      className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${isPaid ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'hover:bg-slate-50'}`}
                    >
                      {/* STUDENT NAME */}
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-[0.75rem] font-bold text-slate-300">{index + 1}.</span>
                        <div>
                          <div className="text-[0.875rem] font-bold text-slate-900">
                            {st.nachname} <span className="font-semibold text-slate-600">{st.vorname}</span>
                          </div>
                          <div className="text-[0.6875rem] text-slate-400">
                            Status: {isPaid ? 'Vollständig bezahlt' : isPartial ? `Teilweise (${formatEuro(paidAmount)})` : 'Offen'}
                          </div>
                        </div>
                      </div>

                      {/* QUICK 1-CLICK ACTION */}
                      <div className="flex items-center gap-2">
                        
                        {/* INLINE CUSTOM AMOUNT EDIT BUTTON */}
                        {editingPartialStudentId === st.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={partialAmountInput}
                              onChange={e => setPartialAmountInput(e.target.value)}
                              placeholder="z.B. 5.00"
                              className="w-20 px-2 py-1 text-[0.75rem] font-bold rounded-lg border border-indigo-400 bg-white"
                            />
                            <button
                              onClick={() => applyPartialAmount(st.id, currentSammlung.id, partialAmountInput)}
                              className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[0.6875rem]"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => setEditingPartialStudentId(null)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingPartialStudentId(st.id);
                              setPartialAmountInput(paidAmount.toString());
                            }}
                            title="Teilbetrag eingeben"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-all"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {/* PRIMARY 1-CLICK TOGGLE BUTTON */}
                        <button
                          onClick={() => toggleStudentPayment(st.id, currentSammlung.id)}
                          className={`px-4 py-2 rounded-xl text-[0.75rem] font-extrabold flex items-center gap-2 transition-all shadow-3xs ${
                            isPaid 
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600' 
                              : isPartial
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 size={16} />
                              <span>Bezahlt ({formatEuro(currentSammlung.betrag)})</span>
                            </>
                          ) : isPartial ? (
                            <>
                              <Clock size={16} />
                              <span>Offen ({formatEuro(currentSammlung.betrag - paidAmount)})</span>
                            </>
                          ) : (
                            <>
                              <span className="w-4 h-4 rounded-full border-2 border-slate-400 inline-block" />
                              <span>Offen ({formatEuro(currentSammlung.betrag)})</span>
                            </>
                          )}
                        </button>

                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* EBENE 3: KASSENBUCH & TRANS-JOURNAL                                   */}
      {/* ==================================================================== */}
      {activeTab === 'kassenbuch' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Kassenbuch & Journal</h2>
              <p className="text-[0.75rem] font-medium text-slate-500">Alle Einnahmen und Ausgaben der Klassenkasse</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400 block">Aktuelles Guthaben</span>
                <span className="text-[1.25rem] font-black text-emerald-600 font-mono">{formatEuro(kasse.kontostand)}</span>
              </div>

              <button
                type="button"
                onClick={() => setApp(prev => ({ ...prev, currentPage: 'drucken', activePrintTemplate: 'kassenuebersicht' }))}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[0.75rem] font-bold flex items-center gap-1.5 border border-indigo-200 shadow-3xs transition-all cursor-pointer"
                title="Druckbare Kassenübersicht mit Einnahmen, Ausgaben und Saldo im Druckzentrum öffnen"
              >
                <Printer size={15} /> Kassenübersicht drucken
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewItemType('transaction');
                  setIsNewModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[0.75rem] font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Plus size={15} /> Manuelle Buchung
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[0.6875rem] font-black uppercase text-slate-400 tracking-wider">
              <span>Datum & Buchungstext</span>
              <span>Betrag</span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
              {kasse.transaktionen.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-[0.8125rem]">Keine Buchungen vorhanden</div>
              ) : (
                kasse.transaktionen.map(tx => {
                  const isManual = !tx.geldsammlungId && tx.kategorie !== 'sammlung';
                  return (
                    <div key={tx.id} className="p-3.5 flex items-center justify-between text-[0.8125rem] hover:bg-slate-50 transition-colors group">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="font-bold text-slate-900 truncate">{tx.titel}</div>
                        <div className="text-[0.6875rem] text-slate-400 flex items-center gap-1.5 flex-wrap">
                          <span>{formatOrgaDate(tx.datum)}</span>
                          <span>•</span>
                          <span>{tx.kategorie === 'ausgabe' ? 'Ausgabe' : tx.kategorie === 'sammlung' ? 'Geldsammlung' : tx.kategorie === 'sonstiges' ? 'Sonstiges' : tx.kategorie || 'Allgemein'}</span>
                          {isManual && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[0.5625rem] font-bold uppercase tracking-wider">
                              Manuell
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`font-mono font-black text-[0.875rem] ${tx.typ === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {tx.typ === 'plus' ? '+' : '-'}{formatEuro(tx.betrag)}
                        </div>

                        {isManual && (
                          <button
                            type="button"
                            title="Manuelle Buchung löschen"
                            onClick={() => setTxToDelete(tx)}
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EBENE 3: PASSWÖRTER & ZUGÄNGE                                         */}
      {/* ==================================================================== */}
      {activeTab === 'passwords' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Passwörter & Zugänge</h2>
              <p className="text-[0.75rem] font-medium text-slate-500">Klassenlogins (Anton, Antolin, LearningApps, etc.)</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={passwordSearch}
                  onChange={e => setPasswordSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[0.75rem] font-bold outline-none"
                />
              </div>

              <button
                onClick={() => {
                  setEditingPwItem(null);
                  setPwBezeichnung('');
                  setPwBenutzername('');
                  setPwPasswort('');
                  setPwUrl('');
                  setNewItemType('passwort');
                  setIsNewModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[0.75rem] flex items-center gap-1.5 shadow-xs transition-all"
              >
                <Plus size={15} /> Neu
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passwords
              .filter(p => p.bezeichnung.toLowerCase().includes(passwordSearch.toLowerCase()))
              .map(p => (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-3xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[0.625rem] font-black text-amber-600 uppercase tracking-wider block mb-0.5">{p.kategorie}</span>
                      <h3 className="text-[0.875rem] font-black text-slate-900">{p.bezeichnung}</h3>
                    </div>
                    
                    <button
                      onClick={() => {
                        if (confirm('Löschen?')) {
                          setApp(prev => ({ ...prev, zugangsdaten: (prev.zugangsdaten || []).filter(z => z.id !== p.id) }));
                        }
                      }}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between text-[0.75rem]">
                      <span className="font-bold text-slate-700">{p.benutzername}</span>
                      <button onClick={() => navigator.clipboard.writeText(p.benutzername)} className="text-slate-400 hover:text-indigo-600">
                        <Copy size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[0.75rem]">
                      <span className="font-mono font-bold text-slate-600">
                        {visiblePasswords[p.id] ? p.passwort : '••••••••'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setVisiblePasswords(prev => ({ ...prev, [p.id]: !prev[p.id] }))} className="text-slate-400 hover:text-indigo-600">
                          {visiblePasswords[p.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                        <button onClick={() => navigator.clipboard.writeText(p.passwort)} className="text-slate-400 hover:text-indigo-600">
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {p.url && (
                    <a
                      href={p.url.startsWith('http') ? p.url : `https://${p.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-xl text-[0.6875rem] font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <ExternalLink size={12} /> Portal öffnen
                    </a>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* EBENE 3: CHECKLISTEN & AUSFLÜGE                                       */}
      {/* ==================================================================== */}
      {activeTab === 'checklisten' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Ausflüge & Checklisten</h2>
              <p className="text-[0.75rem] font-medium text-slate-500">Rückmeldungen, Einverständnisse und Erledigungen</p>
            </div>

            <button
              onClick={() => {
                setNewItemType('checkliste');
                setIsNewModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[0.75rem] flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Plus size={15} /> Neue Checkliste
            </button>
          </div>

          {/* CHECKLIST SELECTION OR TABLE */}
          {checklisten.map(c => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-3xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Backpack size={18} className="text-sky-500" />
                  <h3 className="text-[0.9375rem] font-bold text-slate-900">{c.titel}</h3>
                </div>

                <button
                  onClick={() => {
                    if (confirm('Checkliste löschen?')) {
                      setApp(prev => ({ ...prev, checklisten: (prev.checklisten || []).filter(chk => chk.id !== c.id) }));
                    }
                  }}
                  className="p-1 text-slate-300 hover:text-rose-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-[0.75rem]">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="p-2.5 font-black text-slate-500">Schüler/in</th>
                      {c.spalten.map(sp => (
                        <th key={sp.id} className="p-2.5 font-black text-slate-500 text-center">{sp.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {students.map(st => (
                      <tr key={st.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{st.nachname} {st.vorname}</td>
                        {c.spalten.map(sp => {
                          const isChecked = c.eintraege?.[st.id]?.[sp.id] || false;
                          return (
                            <td 
                              key={sp.id} 
                              className="p-2.5 text-center cursor-pointer"
                              onClick={() => {
                                setApp(prev => {
                                  const newChk = (prev.checklisten || []).map(chk => {
                                    if (chk.id !== c.id) return chk;
                                    const stEntries = chk.eintraege?.[st.id] || {};
                                    return {
                                      ...chk,
                                      eintraege: {
                                        ...chk.eintraege,
                                        [st.id]: { ...stEntries, [sp.id]: !isChecked }
                                      }
                                    };
                                  });
                                  return { ...prev, checklisten: newChk };
                                });
                              }}
                            >
                              <div className={`mx-auto w-6 h-6 rounded-lg flex items-center justify-center transition-all ${isChecked ? 'bg-emerald-500 text-white' : 'bg-slate-100 border border-slate-300'}`}>
                                {isChecked && <Check size={14} />}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================================================================== */}
      {/* EBENE 3: FLEXIBLE LISTEN                                             */}
      {/* ==================================================================== */}
      {activeTab === 'custom-lists' && (
        <FlexibleListsView
          onOpenCreateModal={() => {
            setNewItemType('customList');
            setIsNewModalOpen(true);
          }}
          selectedListId={selectedCustomListId}
          onSelectListId={setSelectedCustomListId}
        />
      )}

      {/* ==================================================================== */}
      {/* EBENE 3: ARCHIV                                                      */}
      {/* ==================================================================== */}
      {activeTab === 'archiv' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
            <h2 className="text-[1.125rem] font-black text-slate-900 tracking-tight">Archiv – Abgeschlossene Sammlungen</h2>
            <p className="text-[0.75rem] font-medium text-slate-500">Vergangene Geldsammlungen und Dokumentation</p>
          </div>

          {archivedSammlungen.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-[0.8125rem]">
              Keine archivierten Sammlungen
            </div>
          ) : (
            <div className="space-y-3">
              {archivedSammlungen.map(s => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[0.875rem] font-bold text-slate-900">{s.titel}</h3>
                    <p className="text-[0.6875rem] text-slate-400">{formatEuro(s.betrag)} pro Kind • Erstellt am {formatOrgaDate(s.erstelltAm)}</p>
                  </div>

                  <button
                    onClick={() => toggleArchiveSammlung(s.id)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-[0.75rem] font-bold text-slate-700"
                  >
                    Wieder aktivieren
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: UNIVERSAL "+ NEU" SELECTOR & CREATOR                         */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsNewModalOpen(false); setNewItemType(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-5 z-10"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[1.25rem]">✨</span>
                  <h3 className="text-[1rem] font-black text-slate-900 tracking-tight">
                    {newItemType === 'sammlung' ? 'Neue Geldsammlung' :
                     newItemType === 'checkliste' ? 'Neuer Ausflug / Checkliste' :
                     newItemType === 'passwort' ? 'Zugangsdaten speichern' :
                     newItemType === 'customList' ? 'Neue Flexible Liste' :
                     newItemType === 'transaction' ? 'Manuelle Buchung' :
                     'Was möchten Sie anlegen?'}
                  </h3>
                </div>

                <button
                  onClick={() => { setIsNewModalOpen(false); setNewItemType(null); }}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* TYPE SELECTOR (IF NO TYPE SELECTED YET) */}
              {!newItemType ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    onClick={() => setNewItemType('sammlung')}
                    className="p-3.5 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-100 text-left space-y-1 transition-all"
                  >
                    <Coins size={20} className="text-indigo-600" />
                    <div className="font-extrabold text-[0.8125rem] text-slate-900">Geldsammlung</div>
                    <div className="text-[0.625rem] text-slate-500">Ausflüge, Bastelgeld</div>
                  </button>

                  <button
                    onClick={() => setNewItemType('checkliste')}
                    className="p-3.5 rounded-2xl bg-sky-50/60 hover:bg-sky-50 border border-sky-100 text-left space-y-1 transition-all"
                  >
                    <Backpack size={20} className="text-sky-600" />
                    <div className="font-extrabold text-[0.8125rem] text-slate-900">Checkliste</div>
                    <div className="text-[0.625rem] text-slate-500">Rücklaufzettel, Ausflug</div>
                  </button>

                  <button
                    onClick={() => {
                      setCustomListTitle('');
                      setCustomListDesc('');
                      setCustomListColumns([{ id: 'col_1', label: 'Notiz / Info', type: 'text' }]);
                      setNewItemType('customList');
                    }}
                    className="p-3.5 rounded-2xl bg-purple-50/60 hover:bg-purple-50 border border-purple-100 text-left space-y-1 transition-all"
                  >
                    <Ruler size={20} className="text-purple-600" />
                    <div className="font-extrabold text-[0.8125rem] text-slate-900">Flexible Liste</div>
                    <div className="text-[0.625rem] text-slate-500">Größen, Essen, Orga</div>
                  </button>

                  <button
                    onClick={() => setNewItemType('passwort')}
                    className="p-3.5 rounded-2xl bg-amber-50/60 hover:bg-amber-50 border border-amber-100 text-left space-y-1 transition-all"
                  >
                    <Key size={20} className="text-amber-600" />
                    <div className="font-extrabold text-[0.8125rem] text-slate-900">Zugangsdaten</div>
                    <div className="text-[0.625rem] text-slate-500">Anton, Antolin Logins</div>
                  </button>

                  <button
                    onClick={() => setNewItemType('transaction')}
                    className="p-3.5 rounded-2xl bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-100 text-left space-y-1 transition-all sm:col-span-2"
                  >
                    <Wallet size={20} className="text-emerald-600" />
                    <div className="font-extrabold text-[0.8125rem] text-slate-900">Manuelle Buchung</div>
                    <div className="text-[0.625rem] text-slate-500">Ein- oder Ausgabe im Kassenbuch eintragen</div>
                  </button>
                </div>
              ) : newItemType === 'sammlung' ? (
                /* FORM 1: GELDSAMMLUNG */
                <form onSubmit={handleCreateSammlung} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Titel der Sammlung*</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Wandertag Juni, Bastelbeitrag"
                      value={sammlungTitle}
                      onChange={e => setSammlungTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-bold text-slate-700">Betrag pro Kind (€)*</label>
                      <input
                        type="text"
                        required
                        placeholder="z.B. 12.00"
                        value={sammlungAmount}
                        onChange={e => setSammlungAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-mono font-bold outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-bold text-slate-700">Fälligkeit (optional)</label>
                      <input
                        type="date"
                        value={sammlungDueDate}
                        onChange={e => setSammlungDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[0.8125rem] shadow-sm transition-all"
                  >
                    Sammlung starten
                  </button>
                </form>
              ) : newItemType === 'checkliste' ? (
                /* FORM 2: CHECKLISTE */
                <form onSubmit={handleCreateCheckliste} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Titel des Ausflugs / der Aufgabe*</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Ausflug Tiergarten"
                      value={checklisteTitle}
                      onChange={e => setChecklisteTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Termin (optional)</label>
                    <input
                      type="date"
                      value={checklisteDate}
                      onChange={e => setChecklisteDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-[0.8125rem] shadow-sm transition-all"
                  >
                    Checkliste anlegen
                  </button>
                </form>
              ) : newItemType === 'passwort' ? (
                /* FORM 3: PASSWORT */
                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Bezeichnung / Portal*</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Anton, Antolin, Mail"
                      value={pwBezeichnung}
                      onChange={e => setPwBezeichnung(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-bold text-slate-700">Benutzername*</label>
                      <input
                        type="text"
                        required
                        value={pwBenutzername}
                        onChange={e => setPwBenutzername(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[0.6875rem] font-bold text-slate-700">Passwort*</label>
                      <input
                        type="text"
                        required
                        value={pwPasswort}
                        onChange={e => setPwPasswort(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-mono font-bold outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[0.8125rem] shadow-sm transition-all"
                  >
                    Zugangsdaten speichern
                  </button>
                </form>
              ) : newItemType === 'customList' ? (
                /* FORM: FLEXIBLE LISTE */
                <form onSubmit={handleCreateCustomList} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                  {/* PRESET TEMPLATES QUICK SELECT */}
                  <div className="space-y-1.5">
                    <label className="text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={12} className="text-purple-600" />
                      <span>Oder fertige Vorlage wählen:</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomListTitle(tmpl.title);
                            setCustomListDesc(tmpl.description);
                            setCustomListColumns(tmpl.columns.map((c, ci) => ({
                              id: `col_${ci}_` + Math.random().toString(36).substring(2, 6),
                              label: c.label,
                              type: c.type,
                              options: c.options
                            })));
                          }}
                          className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100/80 text-purple-900 border border-purple-200/80 text-[0.6875rem] font-bold flex items-center gap-1 transition-all"
                        >
                          <span>{tmpl.icon}</span>
                          <span>{tmpl.title.split('/')[0].trim()}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Titel der Liste*</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Schikurs 2026, Essenswünsche, T-Shirt Größen"
                      value={customListTitle}
                      onChange={e => setCustomListTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Beschreibung (optional)</label>
                    <input
                      type="text"
                      placeholder="z.B. Für den Ausflug ins Skilager"
                      value={customListDesc}
                      onChange={e => setCustomListDesc(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.75rem] font-medium outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  {/* COLUMNS BUILDER */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[0.6875rem] font-bold text-slate-700">
                        Spalten konfigurieren ({customListColumns.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setCustomListColumns(prev => [
                            ...prev,
                            { id: 'col_' + Math.random().toString(36).substring(2, 7), label: '', type: 'text' }
                          ]);
                        }}
                        className="text-[0.6875rem] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                      >
                        <Plus size={12} /> Spalte hinzufügen
                      </button>
                    </div>

                    <div className="space-y-2">
                      {customListColumns.map((col, idx) => (
                        <div key={col.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              required
                              placeholder="Spaltenname (z.B. Schuhgröße)"
                              value={col.label}
                              onChange={e => {
                                const val = e.target.value;
                                setCustomListColumns(prev => prev.map((c, i) => i === idx ? { ...c, label: val } : c));
                              }}
                              className="flex-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-[0.75rem] font-bold outline-none"
                            />

                            <select
                              value={col.type}
                              onChange={e => {
                                const newType = e.target.value as CustomListColumnType;
                                setCustomListColumns(prev => prev.map((c, i) => i === idx ? {
                                  ...c,
                                  type: newType,
                                  options: newType === 'select' && (!c.options || c.options.length === 0) ? ['Option 1', 'Option 2'] : c.options
                                } : c));
                              }}
                              className="px-2 py-1.5 rounded-xl bg-white border border-slate-200 text-[0.6875rem] font-bold outline-none cursor-pointer"
                            >
                              <option value="text">Text</option>
                              <option value="number">Zahl</option>
                              <option value="boolean">Ja/Nein</option>
                              <option value="select">Auswahl</option>
                            </select>

                            {customListColumns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomListColumns(prev => prev.filter((_, i) => i !== idx));
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>

                          {col.type === 'select' && (
                            <div className="space-y-0.5">
                              <input
                                type="text"
                                placeholder="Optionen mit Komma trennen (z.B. S, M, L, XL)"
                                value={col.options?.join(', ') || ''}
                                onChange={e => {
                                  const opts = e.target.value.split(',').map(o => o.trim()).filter(Boolean);
                                  setCustomListColumns(prev => prev.map((c, i) => i === idx ? { ...c, options: opts } : c));
                                }}
                                className="w-full px-2.5 py-1 rounded-lg bg-amber-50/50 border border-amber-200 text-[0.6875rem] font-medium outline-none"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[0.8125rem] shadow-sm transition-all"
                  >
                    Liste erstellen
                  </button>
                </form>
              ) : newItemType === 'transaction' ? (
                /* FORM 4: TRANSACTION */
                <form onSubmit={handleAddTransaction} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setTxType('plus')}
                      className={`py-1.5 text-center text-[0.75rem] font-bold rounded-lg transition-all ${txType === 'plus' ? 'bg-white text-emerald-600 shadow-3xs' : 'text-slate-500'}`}
                    >
                      📈 Einnahme (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxType('minus')}
                      className={`py-1.5 text-center text-[0.75rem] font-bold rounded-lg transition-all ${txType === 'minus' ? 'bg-white text-rose-600 shadow-3xs' : 'text-slate-500'}`}
                    >
                      📉 Ausgabe (-)
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Verwendungszweck*</label>
                    <input
                      type="text"
                      required
                      placeholder="z.B. Busfahrt, Materialkauf"
                      value={txTitle}
                      onChange={e => setTxTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-bold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[0.6875rem] font-bold text-slate-700">Betrag (€)*</label>
                    <input
                      type="text"
                      required
                      placeholder="0.00"
                      value={txAmount}
                      onChange={e => setTxAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[0.8125rem] font-mono font-bold outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[0.8125rem] shadow-sm transition-all"
                  >
                    Buchung eintragen
                  </button>
                </form>
              ) : null}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SICHERHEITSABFRAGE: BUCHUNG WIRKLICH LÖSCHEN? */}
      <AnimatePresence>
        {txToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTxToDelete(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-5 z-10 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-[1.0625rem] font-black text-slate-900 tracking-tight">
                    Buchung wirklich löschen?
                  </h3>
                  <p className="text-[0.75rem] font-medium text-slate-500">
                    Diese manuelle Buchung wird unwiderruflich aus dem Kassenbuch entfernt und der Kontostand wird angepasst.
                  </p>
                </div>
              </div>

              {/* Buchungsdaten */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center text-[0.8125rem]">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Datum</span>
                  <span className="font-bold text-slate-700">
                    {formatOrgaDate(txToDelete.datum)}
                  </span>
                </div>
                <div className="flex justify-between items-start text-[0.8125rem] gap-2">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 shrink-0">Beschreibung</span>
                  <span className="font-bold text-slate-800 text-right leading-tight break-words">
                    {txToDelete.titel}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[0.8125rem] pt-1 border-t border-slate-200/60">
                  <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Betrag</span>
                  <span className={`font-mono font-black text-[0.9375rem] ${txToDelete.typ === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {txToDelete.typ === 'plus' ? '+' : '-'}{formatEuro(txToDelete.betrag)}
                  </span>
                </div>
                {txToDelete.kategorie && (
                  <div className="flex justify-between items-center text-[0.75rem]">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">Kategorie</span>
                    <span className="font-semibold text-slate-600">
                      {txToDelete.kategorie === 'ausgabe' ? 'Ausgabe' : txToDelete.kategorie === 'sonstiges' ? 'Sonstiges' : txToDelete.kategorie}
                    </span>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-[0.8125rem] transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTransaction}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[0.8125rem] flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Trash2 size={15} />
                  Buchung löschen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
