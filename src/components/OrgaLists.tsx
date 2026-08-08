
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  CheckSquare, Plus, Trash2, Search, Printer, Sparkles, 
  Wallet, ArrowUpCircle, ArrowDownCircle, History, 
  UserCheck, Receipt, DollarSign, Key, Eye, EyeOff, 
  Copy, ExternalLink, ShieldAlert, X, Edit2,
  CheckCircle2, Clock, AlertCircle, TrendingUp, 
  ArrowRight, Landmark, FileSpreadsheet,
  Ruler, ClipboardList, Coins, TrendingDown, RefreshCw, BarChart3, Check, Award, Backpack, MapPin, AlignLeft, Filter
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Zugangsdaten, Geldsammlung, KassenTransaktion, CustomList } from '../types';

const formatEuro = (value: number) =>
  new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(value);

export default function OrgaLists() {
  const { app, setApp } = useApp();
  const zoomLevel = app.settings?.zoomLevel || 'standard';
  const [activeTab, setActiveTab] = useState<string | null>('kasse');
  const [searchTerm, setSearchTerm] = useState('');
  const [kasseSearch, setKasseSearch] = useState('');
  const [passwordSearch, setPasswordSearch] = useState('');
  const [customListSearch, setCustomListSearch] = useState('');
  
  // Extended Klassenkasse sub-tab states
  const [kasseSubTab, setKasseSubTab] = useState<'overview' | 'sammlungen' | 'schueler'>('overview');
  const [selectedKasseStudentId, setSelectedKasseStudentId] = useState<string | null>(null);
  
  const [filterMissingKasse, setFilterMissingKasse] = useState(false);
  const [sortKasseDesc, setSortKasseDesc] = useState(false);
  const [isolatedSammlungId, setIsolatedSammlungId] = useState<string | null>(null);
  
  // Custom Cell-Editing payment status
  const [editingPaymentCell, setEditingPaymentCell] = useState<{ studentId: string, sammlungId: string } | null>(null);
  const [paymentCellValue, setPaymentCellValue] = useState('');

  // Custom Add Transaction Modal
  const [isAddTxModalOpen, setIsAddTxModalOpen] = useState(false);
  const [addTxType, setAddTxType] = useState<'plus' | 'minus'>('plus');
  const [addTxTitle, setAddTxTitle] = useState('');
  const [addTxAmount, setAddTxAmount] = useState('');
  const [addTxCategory, setAddTxCategory] = useState<'sammlung' | 'ausgabe' | 'sonstiges'>('sonstiges');
  const [addTxStudentId, setAddTxStudentId] = useState('');
  const [addTxDate, setAddTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Custom Add Sammlung Modal
  const [isAddSammlungModalOpen, setIsAddSammlungModalOpen] = useState(false);
  const [addSammlungTitle, setAddSammlungTitle] = useState('');
  const [addSammlungAmount, setAddSammlungAmount] = useState('');

  // Password-specific states
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Zugangsdaten | null>(null);

  // Custom List Modal
  const [isCustomListModalOpen, setIsCustomListModalOpen] = useState(false);

  // Checklisten Modal
  const [isChecklisteModalOpen, setIsChecklisteModalOpen] = useState(false);
  const [checklisteTitle, setChecklisteTitle] = useState('');
  const [checklisteDate, setChecklisteDate] = useState('');

  // Auto-hide visible passwords after 30 seconds
  useEffect(() => {
    const visibleIds = Object.keys(visiblePasswords).filter(id => visiblePasswords[id]);
    if (visibleIds.length === 0) return;

    const timer = setTimeout(() => {
      setVisiblePasswords({});
    }, 30000);

    return () => clearTimeout(timer);
  }, [visiblePasswords]);

  const lists = app.orga_listen || [];
  const customLists = app.customLists || [];
  const checklisten = app.checklisten || [];

  const activeOrgaListId = activeTab?.startsWith('orga-list-') ? activeTab.replace('orga-list-', '') : null;
  const activeCustomListId = activeTab?.startsWith('custom-list-') ? activeTab.replace('custom-list-', '') : null;
  const activeChecklisteId = activeTab?.startsWith('checkliste-') ? activeTab.replace('checkliste-', '') : null;

  const activeList = lists.find(l => l.id === activeOrgaListId);
  const activeCustomList = customLists.find(l => l.id === activeCustomListId);
  const activeCheckliste = checklisten.find(c => c.id === activeChecklisteId);
  
  const passwords = app.zugangsdaten || [];
  const students = [...app.schueler]
    .filter(s => {
      const full = `${s.vorname} ${s.nachname}`.toLowerCase();
      if (activeTab?.startsWith('orga-list-')) return full.includes(searchTerm.toLowerCase());
      if (activeTab?.startsWith('custom-list-')) return full.includes(customListSearch.toLowerCase());
      if (activeTab?.startsWith('checkliste-')) return full.includes(searchTerm.toLowerCase());
      return full.includes(kasseSearch.toLowerCase());
    })
    .filter(s => {
      if (activeTab === 'kasse' && filterMissingKasse) {
        const currentKasse = app.klassenkasse || { sammlungen: [] };
        // Wenn eine Sammlung isoliert ist, nur für diese Sammlung auswerten
        const sammlungenToCheck = isolatedSammlungId 
          ? currentKasse.sammlungen.filter(sm => sm.id === isolatedSammlungId) 
          : currentKasse.sammlungen;
          
        return sammlungenToCheck.some(sammlung => {
          const hasPaid = sammlung.betraege?.[s.id] || 0;
          return hasPaid < sammlung.betrag;
        });
      }
      return true;
    })
    .sort((a, b) => {
      if (activeTab === 'kasse' && sortKasseDesc) {
        const getStudentDebt = (sid: string) => {
          const currentKasse = app.klassenkasse || { sammlungen: [] };
          const sammlungenToCheck = isolatedSammlungId 
            ? currentKasse.sammlungen.filter(sm => sm.id === isolatedSammlungId) 
            : currentKasse.sammlungen;
          
          return sammlungenToCheck.reduce((sum, sammlung) => {
            const hasPaid = sammlung.betraege?.[sid] || 0;
            return sum + Math.max(0, sammlung.betrag - hasPaid);
          }, 0);
        };
        const debtA = getStudentDebt(a.id);
        const debtB = getStudentDebt(b.id);
        if (debtA !== debtB) {
          return debtB - debtA; // highest debt first
        }
      }
      return a.nachname.localeCompare(b.nachname, 'de');
    });

  const kasse = app.klassenkasse || {
    kontostand: 0,
    sammlungen: [],
    transaktionen: []
  };

  // Migration for old data if it exists
  useEffect(() => {
    // @ts-ignore - checking for old structure
    if (app.klassenkasse && (app.klassenkasse as any).beitrag_pro_kind !== undefined) {
      const oldKasse = app.klassenkasse as any;
      const initialSammlung: Geldsammlung = {
        id: 'basis-migration',
        titel: 'Basisbeitrag',
        betrag: oldKasse.beitrag_pro_kind || 0,
        erstelltAm: new Date().toISOString(),
        status: {},
        betraege: {}
      };

      Object.entries(oldKasse.zahlungen || {}).forEach(([sid, paid]) => {
        if (paid) {
          initialSammlung.status[sid] = 'bezahlt';
          initialSammlung.betraege[sid] = oldKasse.beitrag_pro_kind;
        }
      });

      setApp(prev => ({
        ...prev,
        klassenkasse: {
          kontostand: oldKasse.kontostand,
          sammlungen: [initialSammlung],
          transaktionen: oldKasse.transaktionen || []
        }
      }));
    }
  }, []);

  const addSammlung = () => {
    const titel = prompt('Titel der Sammlung (z.B. Werkgeld, Ausflug):');
    if (!titel) return;
    const betragStr = prompt('Betrag pro Kind in €:');
    const betrag = parseFloat(betragStr?.replace(',', '.') || '0');
    if (isNaN(betrag)) return;

    const newSammlung: Geldsammlung = {
      id: crypto.randomUUID(),
      titel,
      betrag,
      erstelltAm: new Date().toISOString(),
      status: {},
      betraege: {}
    };

    // Auto-initialize for all students as "offen"
    app.schueler.forEach(s => {
      newSammlung.status[s.id] = 'offen';
      newSammlung.betraege[s.id] = 0;
    });

    setApp(prev => ({
      ...prev,
      klassenkasse: {
        ...(prev.klassenkasse || kasse),
        sammlungen: [...(prev.klassenkasse?.sammlungen || []), newSammlung]
      }
    }));
  };

  const togglePayment = (sid: string, sammlungId: string) => {
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      const sammlungen = prev.klassenkasse.sammlungen.map(s => {
        if (s.id !== sammlungId) return s;
        
        const currentStatus = s.status[sid] || 'offen';
        const newStatus = (currentStatus === 'bezahlt' ? 'offen' : 'bezahlt') as 'offen' | 'teilweise' | 'bezahlt';
        const diff = newStatus === 'bezahlt' ? s.betrag - (s.betraege[sid] || 0) : -(s.betraege[sid] || 0);
        
        const newBetraege = { ...s.betraege, [sid]: newStatus === 'bezahlt' ? s.betrag : 0 };
        const newStatusMap: Record<string, 'offen' | 'teilweise' | 'bezahlt'> = { ...s.status, [sid]: newStatus };
        
        return { ...s, status: newStatusMap, betraege: newBetraege, _diff: diff }; 
      });

      const updatedSammlung = sammlungen.find(s => s.id === sammlungId);
      // @ts-ignore
      const diff = updatedSammlung?._diff || 0;
      sammlungen.forEach(s => {
        // @ts-ignore
        delete s._diff;
      });

      const newTrans: KassenTransaktion[] = [...prev.klassenkasse!.transaktionen];
      if (diff !== 0) {
        newTrans.unshift({
          id: crypto.randomUUID(),
          datum: new Date().toISOString(),
          titel: `${app.schueler.find(st => st.id === sid)?.name || 'Schüler'} - ${updatedSammlung?.titel}`,
          betrag: Math.abs(diff),
          typ: diff > 0 ? 'plus' : 'minus',
          kategorie: 'sammlung',
          geldsammlungId: sammlungId
        });
      }

      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + diff,
          sammlungen,
          transaktionen: newTrans
        }
      };
    });
  };

  const markAllPaid = (samId: string) => {
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      
      let sumDiff = 0;
      let newTrans = [...prev.klassenkasse.transaktionen];
      const sammlungen = prev.klassenkasse.sammlungen.map(s => {
        if (s.id !== samId) return s;
        
        const newBetraege = { ...s.betraege };
        const newStatus = { ...s.status } as Record<string, 'offen' | 'teilweise' | 'bezahlt'>;
        
        // Go through all students in the class
        prev.schueler.forEach(st => {
          const sid = st.id;
          const oldPaid = s.betraege[sid] || 0;
          const diff = s.betrag - oldPaid;
          
          if (diff > 0) {
            sumDiff += diff;
            newTrans.push({
              id: Date.now().toString() + Math.random().toString(36).substring(2),
              typ: 'plus',
              betrag: diff,
              datum: new Date().toISOString(),
              kategorie: 'sammlung',
              geldsammlungId: s.id,
              schuelerId: sid,
              titel: `Sammel-Einzahlung: ${s.titel}`
            });
          }
          
          newBetraege[sid] = s.betrag;
          newStatus[sid] = 'bezahlt';
        });
        
        return { ...s, betraege: newBetraege, status: newStatus };
      });

      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + sumDiff,
          sammlungen,
          transaktionen: newTrans
        }
      };
    });
  };

  const editStudentPaymentDirectly = (sid: string, samId: string, inputVal: string) => {
    const rawVal = inputVal.replace(',', '.');
    const amount = parseFloat(rawVal);
    if (isNaN(amount) || amount < 0) {
      alert('Bitte einen gültigen, positiven Betrag eingeben.');
      return;
    }

    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      
      const sammlungen = prev.klassenkasse.sammlungen.map(s => {
        if (s.id !== samId) return s;
        
        const oldPaid = s.betraege[sid] || 0;
        const targetAmount = s.betrag;
        
        const finalPaid = Math.min(amount, targetAmount); 
        const status: 'offen' | 'teilweise' | 'bezahlt' = 
          finalPaid === 0 ? 'offen' : 
          finalPaid >= targetAmount ? 'bezahlt' : 'teilweise';
          
        const diff = finalPaid - oldPaid;
        
        const newBetraege = { ...s.betraege, [sid]: finalPaid };
        const newStatus = { ...s.status, [sid]: status } as Record<string, 'offen' | 'teilweise' | 'bezahlt'>;
        
        return { ...s, status: newStatus, betraege: newBetraege, _diff: diff };
      });

      const updatedSammlung = sammlungen.find(s => s.id === samId);
      // @ts-ignore
      const diff = updatedSammlung?._diff || 0;
      sammlungen.forEach(s => {
        // @ts-ignore
        delete s._diff;
      });

      const newTrans = [...prev.klassenkasse.transaktionen];
      if (diff !== 0) {
        const student = app.schueler.find(st => st.id === sid);
        const name = student ? `${student.nachname} ${student.vorname}` : 'Schüler';
        newTrans.unshift({
          id: crypto.randomUUID(),
          datum: new Date().toISOString(),
          titel: `${name} - ${updatedSammlung?.titel} (Betrag angepasst)`,
          betrag: Math.abs(diff),
          typ: diff > 0 ? 'plus' : 'minus',
          kategorie: 'sammlung',
          geldsammlungId: samId,
          schuelerId: sid
        });
      }

      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + diff,
          sammlungen,
          transaktionen: newTrans
        }
      };
    });
  };

  const setStudentPaymentStatusDirectly = (sid: string, samId: string, status: 'bezahlt' | 'offen') => {
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      
      const sammlungen = prev.klassenkasse.sammlungen.map(s => {
        if (s.id !== samId) return s;
        
        const oldPaid = s.betraege[sid] || 0;
        const finalPaid = status === 'bezahlt' ? s.betrag : 0;
        const diff = finalPaid - oldPaid;
        
        const newBetraege = { ...s.betraege, [sid]: finalPaid };
        const newStatus = { ...s.status, [sid]: status } as Record<string, 'offen' | 'teilweise' | 'bezahlt'>;
        
        return { ...s, status: newStatus, betraege: newBetraege, _diff: diff };
      });

      const updatedSammlung = sammlungen.find(s => s.id === samId);
      // @ts-ignore
      const diff = updatedSammlung?._diff || 0;
      sammlungen.forEach(s => {
        // @ts-ignore
        delete s._diff;
      });

      const newTrans = [...prev.klassenkasse.transaktionen];
      if (diff !== 0) {
        const student = app.schueler.find(st => st.id === sid);
        const name = student ? `${student.nachname} ${student.vorname}` : 'Schüler';
        newTrans.unshift({
          id: crypto.randomUUID(),
          datum: new Date().toISOString(),
          titel: `${name} - ${updatedSammlung?.titel} (${status === 'bezahlt' ? 'Voll bezahlt' : 'Wieder offen'})`,
          betrag: Math.abs(diff),
          typ: diff > 0 ? 'plus' : 'minus',
          kategorie: 'sammlung',
          geldsammlungId: samId,
          schuelerId: sid
        });
      }

      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + diff,
          sammlungen,
          transaktionen: newTrans
        }
      };
    });
  };

  const settleAllStudentPayments = (sid: string) => {
    if (!confirm('Möchten Sie alle offenen Sammlungen für diese/n Schüler/in auf einmal als "vollständig bezahlt" verbuchen?')) return;
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      
      let totalDiff = 0;
      const newTrans = [...prev.klassenkasse.transaktionen];
      const student = app.schueler.find(st => st.id === sid);
      const name = student ? `${student.nachname} ${student.vorname}` : 'Schüler';

      const sammlungen = prev.klassenkasse.sammlungen.map(s => {
        const status = s.status[sid] || 'offen';
        if (status === 'bezahlt') return s;
        
        const oldPaid = s.betraege[sid] || 0;
        const targetAmount = s.betrag;
        const diff = targetAmount - oldPaid;
        
        if (diff > 0) {
          totalDiff += diff;
          newTrans.unshift({
            id: crypto.randomUUID(),
            datum: new Date().toISOString(),
            titel: `${name} - ${s.titel} (Sammel-Zahlung)`,
            betrag: diff,
            typ: 'plus',
            kategorie: 'sammlung',
            geldsammlungId: s.id,
            schuelerId: sid
          });
        }
        
        return {
          ...s,
          status: { ...s.status, [sid]: 'bezahlt' } as Record<string, 'offen' | 'teilweise' | 'bezahlt'>,
          betraege: { ...s.betraege, [sid]: targetAmount }
        };
      });

      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + totalDiff,
          sammlungen,
          transaktionen: newTrans
        }
      };
    });
  };

  const aussenstaende = kasse.sammlungen.reduce((sum, s) => {
    const sTotal = app.schueler.reduce((sSum, sch) => {
      const bezahlt = s.betraege[sch.id] || 0;
      return sSum + (s.betrag - bezahlt);
    }, 0);
    return sum + sTotal;
  }, 0);

  const toggleCheck = (sid: string) => {
    if (!activeOrgaListId) return;
    setApp(prev => ({
      ...prev,
      orga_listen: (prev.orga_listen || []).map(l => {
        if (l.id !== activeOrgaListId) return l;
        const checked = l.checked.includes(sid) ? l.checked.filter(id => id !== sid) : [...l.checked, sid];
        return { ...l, checked };
      })
    }));
  };

  const addTransaction = (typ: 'plus' | 'minus') => {
    const titel = prompt(typ === 'plus' ? 'Einnahme Titel:' : 'Ausgabe Titel:');
    if (!titel) return;
    const betragStr = prompt('Betrag in € (z.B. 15.50):');
    const betrag = parseFloat(betragStr?.replace(',', '.') || '0');
    if (isNaN(betrag) || betrag <= 0) return;

    setApp(prev => {
      const k = prev.klassenkasse || kasse;
      const newStand = typ === 'plus' ? k.kontostand + betrag : k.kontostand - betrag;
      return {
        ...prev,
        klassenkasse: {
          ...k,
          kontostand: newStand,
          transaktionen: [
            { id: crypto.randomUUID(), datum: new Date().toISOString(), titel, betrag, typ },
            ...k.transaktionen
          ]
        }
      };
    });
  };

  const handleAddNewTransaction = (typeVal?: 'plus' | 'minus') => {
    const finalType = typeVal || addTxType;
    const amount = parseFloat(addTxAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Bitte geben Sie einen gültigen, positiven Betrag ein.');
      return;
    }

    const currentKasse = app.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] };
    const labelTitle = addTxTitle.trim() || (finalType === 'plus' ? 'Manuelle Einnahme' : 'Manuelle Ausgabe');
    
    let txTitleFull = labelTitle;
    if (addTxStudentId) {
      const student = app.schueler.find(s => s.id === addTxStudentId);
      if (student) {
        txTitleFull = `${student.nachname} ${student.vorname}: ${labelTitle}`;
      }
    }

    const newTx: KassenTransaktion = {
      id: crypto.randomUUID(),
      datum: addTxDate ? new Date(addTxDate).toISOString() : new Date().toISOString(),
      titel: txTitleFull,
      betrag: amount,
      typ: finalType,
      kategorie: addTxCategory,
      schuelerId: addTxStudentId || undefined
    };

    const diff = finalType === 'plus' ? amount : -amount;
    setApp(prev => {
      const k = prev.klassenkasse || currentKasse;
      return {
        ...prev,
        klassenkasse: {
          ...k,
          kontostand: k.kontostand + diff,
          transaktionen: [newTx, ...k.transaktionen]
        }
      };
    });

    setAddTxTitle('');
    setAddTxAmount('');
    setAddTxStudentId('');
    setAddTxCategory('sonstiges');
    setIsAddTxModalOpen(false);
  };

  const handleAddNewSammlung = () => {
    const amount = parseFloat(addSammlungAmount.replace(',', '.'));
    if (!addSammlungTitle.trim() || isNaN(amount) || amount < 0) {
      alert('Bitte geben Sie einen gültigen Titel und Betrag ein.');
      return;
    }

    const currentKasse = app.klassenkasse || { kontostand: 0, sammlungen: [], transaktionen: [] };
    const newSammlung: Geldsammlung = {
      id: crypto.randomUUID(),
      titel: addSammlungTitle.trim(),
      betrag: amount,
      erstelltAm: new Date().toISOString(),
      status: {},
      betraege: {}
    };

    app.schueler.forEach(s => {
      newSammlung.status[s.id] = 'offen';
      newSammlung.betraege[s.id] = 0;
    });

    setApp(prev => ({
      ...prev,
      klassenkasse: {
        ...currentKasse,
        sammlungen: [...currentKasse.sammlungen, newSammlung]
      }
    }));

    setAddSammlungTitle('');
    setAddSammlungAmount('');
    setIsAddSammlungModalOpen(false);
  };

  const handleRemoveSammlung = (samId: string) => {
    if (!confirm('Geldsammlung wirklich löschen? Alle Beiträge werden aus der Übersicht entfernt.')) return;
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          sammlungen: prev.klassenkasse.sammlungen.filter(s => s.id !== samId)
        }
      };
    });
  };

  const handleRemoveTransaction = (txId: string, txBetrag: number, txTyp: 'plus' | 'minus') => {
    if (!confirm('Transaktion wirklich stornieren? Der Guthabenstand wird korrigiert.')) return;
    setApp(prev => {
      if (!prev.klassenkasse) return prev;
      const deviance = txTyp === 'plus' ? -txBetrag : txBetrag;
      return {
        ...prev,
        klassenkasse: {
          ...prev.klassenkasse,
          kontostand: prev.klassenkasse.kontostand + deviance,
          transaktionen: prev.klassenkasse.transaktionen.filter(t => t.id !== txId)
        }
      };
    });
  };

  return (
    <div className="flex-1 flex flex-col print:overflow-visible print:h-auto font-sans px-4 lg:px-8 space-y-6 pt-6" data-zoom-container={zoomLevel}>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Zoom scaling rules for Kasse & Orga */
        [data-zoom-container="compact"] {
          font-size: 0.8125rem !important;
        }
        [data-zoom-container="compact"] .text-[1.5rem],
        [data-zoom-container="compact"] h2 {
          font-size: 1.125rem !important;
        }
        [data-zoom-container="compact"] h3 {
          font-size: 0.95rem !important;
        }
        [data-zoom-container="compact"] h4 {
          font-size: 0.8125rem !important;
        }
        [data-zoom-container="compact"] button,
        [data-zoom-container="compact"] select,
        [data-zoom-container="compact"] input {
          font-size: 0.75rem !important;
          padding-top: 0.35rem !important;
          padding-bottom: 0.35rem !important;
          padding-left: 0.625rem !important;
          padding-right: 0.625rem !important;
          border-radius: 0.5rem !important;
        }
        [data-zoom-container="compact"] .p-6 {
          padding: 0.875rem !important;
        }
        [data-zoom-container="compact"] .p-5 {
          padding: 0.75rem !important;
        }
        [data-zoom-container="compact"] .p-4 {
          padding: 0.5rem !important;
        }
        [data-zoom-container="compact"] .py-3.5,
        [data-zoom-container="compact"] .py-2.5 {
          padding-top: 0.4rem !important;
          padding-bottom: 0.4rem !important;
        }
        [data-zoom-container="compact"] .px-4 {
          padding-left: 0.5rem !important;
          padding-right: 0.5rem !important;
        }
        [data-zoom-container="compact"] .w-12,
        [data-zoom-container="compact"] .h-12 {
          width: 2rem !important;
          height: 2rem !important;
        }
        [data-zoom-container="compact"] td, 
        [data-zoom-container="compact"] th {
          padding: 0.35rem 0.5rem !important;
          font-size: 0.75rem !important;
        }
        [data-zoom-container="compact"] .gap-4,
        [data-zoom-container="compact"] .gap-6 {
          gap: 0.625rem !important;
        }

        [data-zoom-container="large"] {
          font-size: 1.0625rem !important;
        }
        [data-zoom-container="large"] .text-[1.5rem],
        [data-zoom-container="large"] h2 {
          font-size: 2rem !important;
        }
        [data-zoom-container="large"] h3 {
          font-size: 1.35rem !important;
        }
        [data-zoom-container="large"] h4 {
          font-size: 1.25rem !important;
        }
        [data-zoom-container="large"] button,
        [data-zoom-container="large"] select,
        [data-zoom-container="large"] input {
          font-size: 1.0625rem !important;
          padding-top: 0.75rem !important;
          padding-bottom: 0.75rem !important;
          padding-left: 1.25rem !important;
          padding-right: 1.25rem !important;
          border-radius: 0.875rem !important;
        }
        [data-zoom-container="large"] .p-6 {
          padding: 2rem !important;
        }
        [data-zoom-container="large"] .p-5 {
          padding: 1.5rem !important;
        }
        [data-zoom-container="large"] .p-4 {
          padding: 1.25rem !important;
        }
        [data-zoom-container="large"] .py-3.5 {
          padding-top: 1.25rem !important;
          padding-bottom: 1.25rem !important;
        }
        [data-zoom-container="large"] .py-2.5 {
          padding-top: 1rem !important;
          padding-bottom: 1rem !important;
        }
        [data-zoom-container="large"] .px-4 {
          padding-left: 1.5rem !important;
          padding-right: 1.5rem !important;
        }
        [data-zoom-container="large"] .w-12,
        [data-zoom-container="large"] .h-12 {
          width: 3.5rem !important;
          height: 3.5rem !important;
        }
        [data-zoom-container="large"] td, 
        [data-zoom-container="large"] th {
          padding: 1.25rem 1.5rem !important;
          font-size: 1.0625rem !important;
        }
        [data-zoom-container="large"] .gap-4 {
          gap: 1.5rem !important;
        }
        [data-zoom-container="large"] .gap-6 {
          gap: 2rem !important;
        }
      ` }} />

      <div className="flex flex-1 print:block print:overflow-visible h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col no-print">
          <div className="p-5 pb-2">
            <h2 className="text-[0.875rem] leading-snug font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Navigation</h2>
            <div className="space-y-1.5">
              <button 
                onClick={() => setActiveTab('kasse')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'kasse' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
              >
                <Wallet size={18} className={activeTab === 'kasse' ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="text-[0.8125rem] font-bold">Klassenkasse</span>
              </button>

              <button 
                onClick={() => setActiveTab('passwords')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${activeTab === 'passwords' ? 'bg-white text-indigo-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}
              >
                <Key size={18} className={activeTab === 'passwords' ? 'text-indigo-600' : 'text-slate-400'} />
                <span className="text-[0.8125rem] font-bold">Passwörter</span>
              </button>
            </div>
          </div>

          <div className="px-6 py-2">
            <div className="h-px bg-slate-100" />
          </div>

          {/* MEINE LISTEN Section (Custom Lists) */}
          <div className="p-5 pt-2 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[0.875rem] leading-snug font-black text-slate-400 uppercase tracking-[0.2em]">Meine Listen</h2>
              <button 
                onClick={() => setIsCustomListModalOpen(true)}
                aria-label="Flexible Liste hinzufügen"
                title="Flexible Liste hinzufügen"
                className="w-6 h-6 bg-rose-500 text-white rounded-lg flex items-center justify-center hover:bg-rose-600 transition-colors shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
              {customLists.map(l => (
                <button 
                  key={l.id}
                  onClick={() => setActiveTab(`custom-list-${l.id}`)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${activeTab === `custom-list-${l.id}` ? 'bg-white text-rose-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <span className="text-[0.75rem] font-bold text-wrap leading-tight break-words">{l.titel}</span>
                  <Ruler size={14} className={activeTab === `custom-list-${l.id}` ? 'text-rose-500' : 'text-slate-300'} />
                </button>
              ))}
              {customLists.length === 0 && (
                <div className="text-[0.6875rem] font-bold text-slate-300 italic px-4 py-2">Keine flexiblen Listen.</div>
              )}
            </div>
          </div>

          <div className="px-6 py-2">
            <div className="h-px bg-slate-100" />
          </div>
          
          <div className="p-5 pt-2 flex-1 flex flex-col ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[0.875rem] leading-snug font-black text-slate-400 uppercase tracking-[0.2em]">Häkchen-Listen</h2>
              <button 
                onClick={() => {
                  const titel = prompt('Titel der neuen Liste (z.B. Buchgeld, Ausflugsgeld):');
                  if (!titel) return;
                  const newList = { id: crypto.randomUUID(), titel, checked: [] };
                  setApp(prev => ({ ...prev, orga_listen: [...(prev.orga_listen || []), newList] }));
                  setActiveTab(`orga-list-${newList.id}`);
                }}
                aria-label="Häkchen-Liste hinzufügen"
                title="Häkchen-Liste hinzufügen"
                className="w-6 h-6 bg-slate-900 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
              {lists.map(l => (
                <button 
                  key={l.id}
                  onClick={() => setActiveTab(`orga-list-${l.id}`)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${activeTab === `orga-list-${l.id}` ? 'bg-white text-indigo-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <span className="text-[0.75rem] font-bold text-wrap leading-tight break-words">{l.titel}</span>
                  <CheckSquare size={14} className={activeTab === `orga-list-${l.id}` ? 'text-indigo-600' : 'text-slate-300'} />
                </button>
              ))}
              {lists.length === 0 && (
                <div className="text-[0.6875rem] font-bold text-slate-300 italic px-4 py-2">Keine Häkchen-Listen.</div>
              )}
            </div>
          </div>

          <div className="px-6 py-2">
            <div className="h-px bg-slate-100" />
          </div>
          
          <div className="p-6 pt-2 flex-1 flex flex-col ">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[0.875rem] leading-snug font-black text-slate-400 uppercase tracking-[0.2em]">Ausflüge & Checklisten</h2>
              <button 
                onClick={() => setIsChecklisteModalOpen(true)}
                aria-label="Ausflug oder Checkliste hinzufügen"
                title="Ausflug oder Checkliste hinzufügen"
                className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1 overflow-y-auto custom-scrollbar -mx-2 px-2">
              {checklisten.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setActiveTab(`checkliste-${c.id}`)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${activeTab === `checkliste-${c.id}` ? 'bg-white text-emerald-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}
                >
                  <span className="text-[0.75rem] font-bold break-words whitespace-normal text-left leading-tight min-w-0 pr-2">{c.titel}</span>
                  <Backpack size={14} className={activeTab === `checkliste-${c.id}` ? 'text-emerald-500' : 'text-slate-300'} />
                </button>
              ))}
              {checklisten.length === 0 && (
                <div className="text-[0.6875rem] font-bold text-slate-300 italic px-4 py-2">Keine Checklisten.</div>
              )}
            </div>
          </div>
        </div>
        {/* Content Area */}
        <div className="flex-1 bg-white  flex flex-col relative">
          {!activeTab && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-200 gap-4 bg-white z-10 transition-opacity duration-300">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center border border-slate-100 shadow-inner">
                <CheckSquare size={40} className="text-slate-300" strokeWidth={1.5} />
              </div>
              <div className="text-center space-y-1">
                <p className="font-black text-[0.6875rem] uppercase tracking-[0.2em] text-slate-400">Liste auswählen</p>
                <p className="text-[0.625rem] font-medium text-slate-300 italic">Nutze die Sidebar links, um zu navigieren.</p>
              </div>
            </div>
          )}

          {activeTab === 'kasse' && (() => {
            // Calculated values
            const totalCollectedFromSammlungen = kasse.sammlungen.reduce((sum, s) => {
              return sum + Object.values(s.betraege || {}).reduce((sSum, b) => sSum + (b || 0), 0);
            }, 0);

            const totalExpenses = kasse.transaktionen
              .filter(t => t.typ === 'minus')
              .reduce((sum, t) => sum + t.betrag, 0);

            const getStudentTotalPaid = (sid: string) => {
              return kasse.sammlungen.reduce((sum, s) => sum + (s.betraege?.[sid] || 0), 0);
            };

            const getStudentOutstanding = (sid: string) => {
              return kasse.sammlungen.reduce((sum, s) => {
                const paid = s.betraege?.[sid] || 0;
                return sum + (s.betrag - paid);
              }, 0);
            };

            // Selected student details for stats view
            const selectedStudent = app.schueler.find(s => s.id === selectedKasseStudentId);

            return (
              <div className="flex-1 flex flex-col  print:overflow-visible bg-slate-50/30">
                {/* Micro Sub-Tabs navigation header */}
                <div className="p-3 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 no-print bg-white/95 backdrop-blur-xl sticky top-0 z-20 w-full">
                  {/* SUBTAB BAR */}
                  <div className="flex flex-wrap bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200/40 shadow-inner w-full lg:w-auto justify-center lg:justify-start">
                    <button
                      onClick={() => setKasseSubTab('overview')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-center text-[0.6875rem] font-bold tracking-wide rounded-lg transition-all cursor-pointer ${kasseSubTab === 'overview' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'}`}
                    >
                      <BarChart3 size={11} className="sm:w-[12px] sm:h-[12px]" />
                      Übersicht
                    </button>
                    <button
                      onClick={() => setKasseSubTab('sammlungen')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-center text-[0.6875rem] font-bold tracking-wide rounded-lg transition-all cursor-pointer ${kasseSubTab === 'sammlungen' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'}`}
                    >
                      <Coins size={11} className="sm:w-[12px] sm:h-[12px]" />
                      Geldsammlungen
                    </button>
                    <button
                      onClick={() => setKasseSubTab('schueler')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 text-center text-[0.6875rem] font-bold tracking-wide rounded-lg transition-all cursor-pointer ${kasseSubTab === 'schueler' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'}`}
                    >
                      <UserCheck size={11} className="sm:w-[12px] sm:h-[12px]" />
                      Schüler-Statistiken
                    </button>
                  </div>

                  {/* FAST GLOBAL ACTIONS */}
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto justify-center lg:justify-end min-w-0">
                    <button 
                      onClick={() => {
                        setAddTxType('plus');
                        setAddTxCategory('sonstiges');
                        setIsAddTxModalOpen(true);
                      }} 
                      className="px-2 sm:px-3.5 py-1 sm:py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100/60 rounded-lg sm:rounded-xl text-[0.48rem] xs:text-[0.52rem] sm:text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowUpCircle size={11} className="sm:w-[13px] sm:h-[13px]" /> Einnahme
                    </button>
                    <button 
                      onClick={() => {
                        setAddTxType('minus');
                        setAddTxCategory('ausgabe');
                        setIsAddTxModalOpen(true);
                      }} 
                      className="px-2 sm:px-3.5 py-1 sm:py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100/60 rounded-lg sm:rounded-xl text-[0.48rem] xs:text-[0.52rem] sm:text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
                    >
                      <ArrowDownCircle size={11} className="sm:w-[13px] sm:h-[13px]" /> Ausgabe
                    </button>
                    <button 
                      onClick={() => setIsAddSammlungModalOpen(true)} 
                      className="px-2 sm:px-3.5 py-1 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg sm:rounded-xl text-[0.48rem] xs:text-[0.52rem] sm:text-[0.625rem] font-black uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Plus size={11} className="sm:w-[13px] sm:h-[13px]" /> Sammlung
                    </button>
                  </div>
                </div>

                {/* MAIN INNER CHASSIS CONTAINER */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
                  
                  {/* SUB-VIEW 1: OVERVIEW & LEDGER */}
                  {kasseSubTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Bento Cards / metrics Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        
                        {/* Pool balance card */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Pool-Bestand (Bar)</span>
                            <h2 className="text-[1.5rem] leading-normal font-black font-mono tracking-tight text-slate-900">
                              {formatEuro(kasse.kontostand)}
                            </h2>
                            <p className="text-[0.5625rem] text-slate-400 font-bold">Verfügbares Handgeld</p>
                          </div>
                          <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center shadow-inner">
                            <Landmark size={20} />
                          </div>
                        </div>

                        {/* Total Collected */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Beitragseinnahmen</span>
                            <h2 className="text-[1.5rem] leading-normal font-black font-mono tracking-tight text-emerald-600">
                              {formatEuro(totalCollectedFromSammlungen)}
                            </h2>
                            <p className="text-[0.5625rem] text-slate-400 font-bold">Durch Sammlungen lukriert</p>
                          </div>
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner">
                            <Coins size={20} />
                          </div>
                        </div>

                        {/* Total Expenses */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Ausgaben (Gesamt)</span>
                            <h2 className="text-[1.5rem] leading-normal font-black font-mono tracking-tight text-rose-600">
                              {formatEuro(totalExpenses)}
                            </h2>
                            <p className="text-[0.5625rem] text-slate-400 font-bold">Registrierte Anschaffungen</p>
                          </div>
                          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner">
                            <TrendingDown size={20} />
                          </div>
                        </div>

                        {/* Outstanding Balance */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                          <div className="space-y-1">
                            <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Ausstehendes Geld</span>
                            <h2 className="text-[1.5rem] leading-normal font-black font-mono tracking-tight text-amber-500">
                              {formatEuro(aussenstaende)}
                            </h2>
                            <p className="text-[0.5625rem] text-slate-400 font-bold">Rückstand der Gelder</p>
                          </div>
                          <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner">
                            <AlertCircle size={20} />
                          </div>
                        </div>

                      </div>

                      {/* Buchungsjournal Ledger List */}
                      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                          <div>
                            <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">Kompaktes Kassenbuch</h4>
                            <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Chronologische Aufzeichnung aller Buchungsposten</p>
                          </div>
                          {kasse.transaktionen.length > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="relative w-48">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                              <input 
                                type="text" 
                                placeholder="Buchungen suchen..." 
                                className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 h-8 text-[0.6875rem] font-bold focus:ring-1 focus:ring-indigo-500 outline-none" 
                                value={kasseSearch} 
                                onChange={e => setKasseSearch(e.target.value)} 
                              />
                            </div>
                          </div>
                          )}
                        </div>

                        <div className="border border-slate-100 rounded-xl ">
                          <div className="divide-y divide-slate-50 max-h-[30rem] overflow-y-auto custom-scrollbar">
                            {kasse.transaktionen.filter(t => t.titel.toLowerCase().includes(kasseSearch.toLowerCase())).map((t, idx) => {
                              const isStudentLinked = !!t.schuelerId;
                              const studentObj = isStudentLinked ? app.schueler.find(s => s.id === t.schuelerId) : null;
                              return (
                                <div key={t.id || idx} className="p-4 flex items-center justify-between hover:bg-slate-50/70 transition-colors group">
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.typ === 'plus' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                      {t.typ === 'plus' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[0.75rem] font-black text-slate-800 break-words whitespace-normal leading-tight min-w-[3.75rem]">{t.titel}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[0.5625rem] font-bold text-slate-400 font-mono">
                                          {new Date(t.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-slate-300">•</span>
                                        <span className={`text-[0.5rem] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${t.kategorie === 'sammlung' ? 'bg-amber-50 text-amber-600 border border-amber-100' : t.kategorie === 'ausgabe' ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>
                                          {t.kategorie === 'sammlung' ? 'Geldsammlung' : t.kategorie === 'ausgabe' ? 'Anschaffung' : 'Sonstiges'}
                                        </span>
                                        {studentObj && (
                                          <>
                                            <span className="text-slate-300">•</span>
                                            <button 
                                              onClick={() => {
                                                setSelectedKasseStudentId(studentObj.id);
                                                setKasseSubTab('schueler');
                                              }} 
                                              className="text-[0.5625rem] font-black text-indigo-500 hover:underline flex items-center gap-1"
                                            >
                                              <UserCheck size={10} /> {studentObj.nachname} {studentObj.vorname}
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className={`text-[0.875rem] leading-snug font-black font-mono ${t.typ === 'plus' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {t.typ === 'plus' ? '+' : '-'}{formatEuro(t.betrag)}
                                    </span>
                                    <button 
                                      onClick={() => handleRemoveTransaction(t.id, t.betrag, t.typ)} 
                                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                      title="Buchung stornieren"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                            {kasse.transaktionen.length === 0 && (
                              <div className="px-6 py-10 text-center">
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                  <Receipt size={22} />
                                </div>
                                <h5 className="text-sm font-black text-slate-900">Die Klassenkasse ist startklar</h5>
                                <p className="mx-auto mt-1 max-w-md text-[0.6875rem] font-medium leading-relaxed text-slate-500">
                                  Erfasse eine erste Einnahme oder starte eine Geldsammlung. Alle Einträge erscheinen danach automatisch im Kassenbuch.
                                </p>
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                                  <button
                                    onClick={() => {
                                      setAddTxType('plus');
                                      setAddTxCategory('sonstiges');
                                      setIsAddTxModalOpen(true);
                                    }}
                                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-[0.6875rem] font-black text-white shadow-sm transition-all hover:bg-emerald-700"
                                  >
                                    <ArrowUpCircle size={14} /> Erste Einnahme
                                  </button>
                                  <button
                                    onClick={() => setIsAddSammlungModalOpen(true)}
                                    className="flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-[0.6875rem] font-black text-indigo-700 transition-all hover:bg-indigo-100"
                                  >
                                    <Coins size={14} /> Erste Sammlung
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW 2: GELDSAMMLUNGEN */}
                  {kasseSubTab === 'sammlungen' && (
                    <div className="space-y-6">
                      {kasse.sammlungen.length === 0 ? (
                        <div className="mx-auto flex min-h-[26rem] max-w-2xl flex-col items-center justify-center rounded-3xl border border-dashed border-indigo-200 bg-gradient-to-b from-white to-indigo-50/60 px-6 py-12 text-center shadow-sm">
                          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-100 text-indigo-700">
                            <Coins size={28} />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">Noch keine Geldsammlung</h3>
                          <p className="mt-2 max-w-lg text-sm font-medium leading-relaxed text-slate-500">
                            Lege zuerst einen Titel und den Betrag pro Kind fest. Danach erscheint automatisch die übersichtliche Zahlungsliste für die ganze Klasse.
                          </p>
                          <button
                            onClick={() => setIsAddSammlungModalOpen(true)}
                            className="mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700"
                          >
                            <Plus size={16} /> Erste Sammlung anlegen
                          </button>
                          <p className="mt-4 text-[0.625rem] font-bold uppercase tracking-wider text-slate-400">
                            Beispiele: Ausflug, Theater, Materialbeitrag
                          </p>
                        </div>
                      ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* LEFT COLUMN: Active list of Sammlungen */}
                        <div className="xl:col-span-1 space-y-4">
                          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[0.75rem] leading-tight font-black uppercase tracking-widest text-slate-900">Aktive Sammlungen</h4>
                              <button 
                                onClick={() => setIsAddSammlungModalOpen(true)}
                                className="w-7 h-7 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center transition-all border border-indigo-100"
                                title="Neue Sammlung starten"
                              >
                                <Plus size={14} />
                              </button>
                            </div>

                            <div className="space-y-2.5 max-h-[31.25rem] overflow-y-auto custom-scrollbar pr-1">
                              {kasse.sammlungen.map(s => {
                                const targetEach = s.betrag;
                                const studentCount = app.schueler.length || 1;
                                const targetTotal = targetEach * studentCount;
                                
                                const collectedTotal = Object.entries(s.betraege || {}).reduce((sum, [sid, val]) => {
                                  return sum + (val || 0);
                                }, 0);

                                const paidStudentsCount = Object.entries(s.status || {}).filter(([sid, stat]) => stat === 'bezahlt').length;
                                const completionPercent = Math.min(100, Math.round((collectedTotal / (targetTotal || 1)) * 100));

                                return (
                                  <div key={s.id} className="p-3 border border-slate-100 rounded-xl space-y-2.5 bg-slate-50/50 hover:border-slate-200 transition-colors group relative">
                                    <div className="flex justify-between items-start">
                                      <div className="min-w-0 pr-6">
                                        <p className="text-[0.75rem] font-black text-slate-800 break-words whitespace-normal leading-tight min-w-[3.75rem]">{s.titel}</p>
                                        <p className="text-[0.5625rem] text-slate-400 font-bold font-mono">
                                          Erstellt: {new Date(s.erstelltAm).toLocaleDateString('de-DE')}
                                        </p>
                                      </div>
                                      <button 
                                        onClick={() => handleRemoveSammlung(s.id)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-600 transition-all rounded"
                                        title="Löschen"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>

                                    {/* Metrics pill */}
                                    <div className="flex items-center justify-between text-[0.625rem] font-black text-slate-600 font-mono bg-white p-1.5 px-2 rounded-lg border border-slate-100">
                                      <span>Satz: {formatEuro(targetEach)}</span>
                                      <span>{paidStudentsCount}/{studentCount} Kinder</span>
                                      <span className="text-emerald-600 font-bold">{formatEuro(collectedTotal)}</span>
                                    </div>

                                    {/* Progress horizontal */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[0.5rem] font-black uppercase text-slate-400">
                                        <span>Fortschritt</span>
                                        <span>{completionPercent}%</span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-1.5 rounded-full ">
                                        <div 
                                          className={`h-full rounded-full transition-all duration-500 ${completionPercent === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                          style={{ width: `${completionPercent}%` }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              {kasse.sammlungen.length === 0 && (
                                <div className="p-8 text-center text-slate-300 italic text-[0.6875rem]">
                                  Keine aktiven Sammlungen vorhanden. Starten Sie eine Sammlung oberhalb.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: Spreadsheet table checklist with precision values */}
                        <div className="xl:col-span-2">
                          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">Erfassungs-Matrix & Einzahlungen</h4>
                                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Markieren Sie Einzahlungen oder tragen Sie individuelle Teilzahlungen ein</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  onClick={() => setFilterMissingKasse(!filterMissingKasse)}
                                  className={`px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${filterMissingKasse ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                >
                                  <Filter size={12} /> {filterMissingKasse ? 'Nur offene aktiv' : 'Nur offene'}
                                </button>
                                <button
                                  onClick={() => setSortKasseDesc(!sortKasseDesc)}
                                  className={`px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${sortKasseDesc ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                                >
                                  <AlertCircle size={12} /> Nach Rückstand
                                </button>
                                {isolatedSammlungId && (
                                  <button
                                    onClick={() => setIsolatedSammlungId(null)}
                                    className="px-3 py-2 rounded-xl text-[0.625rem] font-black uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-300 transition-all ml-auto"
                                  >
                                    Bulk-Modus beenden
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-x-auto shadow-sm custom-scrollbar bg-white">
                              <table className="w-full border-collapse">
                                <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                                  <tr>
                                    <th className="p-4 text-left w-6 border-r border-slate-100"><span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">#</span></th>
                                    <th className="p-4 text-left w-48 sticky left-0 bg-slate-50/80 backdrop-blur-md z-30 shadow-[1px_0_2px_rgba(0,0,0,0.02)] border-r border-slate-100"><span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Schüler/in</span></th>
                                    {kasse.sammlungen.map(s => {
                                      if (isolatedSammlungId && isolatedSammlungId !== s.id) return null;
                                      return (
                                        <th key={s.id} className={`p-4 text-center border-r border-slate-100 last:border-r-0 group cursor-pointer transition-colors relative ${isolatedSammlungId ? 'bg-blue-50/50 w-full' : 'min-w-[10rem] hover:bg-slate-100/50'}`} onClick={() => setIsolatedSammlungId(isolatedSammlungId === s.id ? null : s.id)}>
                                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-slate-100 rounded-md" title="Spalten-Fokus (Bulk Mode)">
                                            {isolatedSammlungId ? <X size={14} className="text-slate-400" /> : <TrendingDown size={14} className="text-blue-500" />}
                                          </div>
                                          <span className="text-[0.6875rem] font-black text-slate-800 block break-words whitespace-normal leading-tight max-w-[8.125rem] mx-auto min-w-[3.75rem]">{s.titel}</span>
                                          <span className="text-[0.5625rem] font-bold text-slate-400 font-mono mt-0.5 block">{formatEuro(s.betrag)}</span>
                                          {isolatedSammlungId && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); markAllPaid(s.id); }}
                                                className="mt-3 mx-auto px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg font-black text-[0.5625rem] uppercase tracking-widest shadow-sm hover:bg-emerald-200 transition-all flex items-center justify-center gap-1.5"
                                                title="Rechnet alle offenen Beträge für diese Sammlung als bar bezahlt ab!"
                                              >
                                                <CheckCircle2 size={12} /> Alle auf Bezahlt
                                              </button>
                                          )}
                                        </th>
                                      )
                                    })}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                  {students.map((st, idx) => (
                                    <tr key={st.id} className="hover:bg-slate-50/50 transition-colors group">
                                      <td className="p-4 text-[0.6875rem] font-black text-slate-300 group-hover:text-slate-400 border-r border-slate-50">{idx + 1}</td>
                                      <td className="p-4 text-[0.875rem] font-bold text-slate-800 sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 shadow-[1px_0_2px_rgba(0,0,0,0.02)] border-r border-slate-50 text-wrap leading-tight break-words">
                                        {st.nachname} <span className="text-slate-500 font-semibold">{st.vorname}</span>
                                      </td>
                                      {kasse.sammlungen.map(s => {
                                        if (isolatedSammlungId && isolatedSammlungId !== s.id) return null;
                                        
                                        const status = s.status?.[st.id] || 'offen';
                                        const paidVal = s.betraege?.[st.id] || 0;
                                        
                                        const isEditingObj = editingPaymentCell?.studentId === st.id && editingPaymentCell?.sammlungId === s.id;

                                        return (
                                          <td key={s.id} className="p-3 border-r border-slate-50 last:border-r-0 text-center">
                                            
                                            {isEditingObj ? (
                                              /* Inline value editor for precision adjustment */
                                              <div className="flex items-center justify-center gap-1.5 max-w-[9rem] mx-auto">
                                                <input 
                                                  type="text" 
                                                  value={paymentCellValue}
                                                  onChange={e => setPaymentCellValue(e.target.value)}
                                                  className="w-16 h-8 bg-slate-100 border border-slate-200/50 rounded-lg text-center text-[0.75rem] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                                                  placeholder="0.00"
                                                  autoFocus
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                      editStudentPaymentDirectly(st.id, s.id, paymentCellValue);
                                                      setEditingPaymentCell(null);
                                                    }
                                                  }}
                                                />
                                                <button 
                                                  onClick={() => {
                                                    editStudentPaymentDirectly(st.id, s.id, paymentCellValue);
                                                    setEditingPaymentCell(null);
                                                  }}
                                                  className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-sm hover:bg-emerald-600 transition-colors"
                                                >
                                                  <Check size={12} />
                                                </button>
                                                <button 
                                                  onClick={() => setEditingPaymentCell(null)}
                                                  className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"
                                                >
                                                  <X size={12} />
                                                </button>
                                              </div>
                                            ) : (
                                              /* Interactive status controllers */
                                              <div className="flex items-center justify-center gap-2 max-w-[9.375rem] mx-auto no-print">
                                                {/* Mark Paid button */}
                                                <button 
                                                  onClick={() => setStudentPaymentStatusDirectly(st.id, s.id, status === 'bezahlt' ? 'offen' : 'bezahlt')}
                                                  className={`h-8 px-3 rounded-xl border text-[0.6875rem] font-bold flex items-center gap-1.5 transition-all shadow-3xs ${status === 'bezahlt' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-emerald-100/50' : 'bg-slate-50 hover:bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                                  title={status === 'bezahlt' ? 'Wieder als offen markieren' : 'Als vollständig bezahlt markieren'}
                                                >
                                                  {status === 'bezahlt' ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Clock size={14} />}
                                                  {status === 'bezahlt' ? 'Bezahlt' : paidVal > 0 ? formatEuro(paidVal) : 'Offen'}
                                                </button>

                                                {/* Edit exact button */}
                                                <button
                                                  onClick={() => {
                                                    setEditingPaymentCell({ studentId: st.id, sammlungId: s.id });
                                                    setPaymentCellValue(paidVal.toString());
                                                  }}
                                                  className="w-8 h-8 bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl flex items-center justify-center transition-all border border-slate-200 hover:border-indigo-200 shadow-3xs"
                                                  title="Genaue Zahlung manuell eintragen"
                                                >
                                                  <Edit2 size={12} />
                                                </button>
                                              </div>
                                            )}

                                            {/* Printed report marker */}
                                            <div className="hidden print:block text-[0.6875rem] font-mono">
                                              {status === 'bezahlt' ? 'BEZAHLT (V)' : paidVal > 0 ? `TEIL: ${paidVal.toFixed(2)}€` : 'OFFEN'}
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
                        </div>

                      </div>
                      )}
                    </div>
                  )}

                  {/* SUB-VIEW 3: SCHÜLER-STATISTIKEN */}
                  {kasseSubTab === 'schueler' && (
                    <div className="space-y-6">
                      
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        
                        {/* LEFT: Grid of students cards list */}
                        <div className="xl:col-span-2 space-y-4">
                          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div>
                                <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">Kinder-Beitragskonten</h4>
                                <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest">Wählen Sie ein Kind, um Detailabrechnungen einzusehen</p>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-2 no-print w-full sm:w-auto">
                                <button
                                  onClick={() => {
                                    if (kasseSearch === '@offen') {
                                      setKasseSearch('');
                                    } else {
                                      setKasseSearch('@offen');
                                    }
                                  }}
                                  className={`px-3 h-8.5 rounded-lg text-[0.625rem] font-black uppercase tracking-widest flex items-center justify-center transition-all border ${kasseSearch === '@offen' ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-white'}`}
                                >
                                  Säumige
                                </button>
                                <button
                                  onClick={() => {
                                    const missingStudents = students.filter(s => getStudentOutstanding(s.id) > 0);
                                    if (missingStudents.length === 0) return alert('Keine offenen Zahlungen!');
                                    const emails = missingStudents.map(s => s.email_eltern).filter(Boolean);
                                    if (emails.length === 0) return alert('Keine E-Mail-Adressen für diese Schüler hinterlegt.');
                                    window.open(`mailto:?bcc=${emails.join(',')}&subject=Erinnerung: Offene Zahlung in der Klassenkasse&body=Guten Tag,\n\nbitte denken Sie daran, die offenen Beträge in die Klassenkasse einzubezahlen.\n\nHerzliche Grüße`);
                                  }}
                                  className="px-3 h-8.5 rounded-lg text-[0.625rem] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                                >
                                  Mail
                                </button>
                                <div className="relative w-40">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                                  <input 
                                    type="text" 
                                    placeholder="Nach Namen filtern..." 
                                    className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 h-8.5 text-[0.6875rem] font-bold focus:ring-1 focus:ring-indigo-500 outline-none" 
                                    value={kasseSearch === '@offen' ? '' : kasseSearch} 
                                    onChange={e => setKasseSearch(e.target.value)} 
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Students list */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[36.25rem] overflow-y-auto custom-scrollbar pr-1">
                              {students.filter(s => {
                                if (kasseSearch === '@offen') {
                                  return getStudentOutstanding(s.id) > 0;
                                }
                                return `${s.vorname} ${s.nachname}`.toLowerCase().includes(kasseSearch.toLowerCase());
                              }).map(s => {
                                const totalPaid = getStudentTotalPaid(s.id);
                                const totalOwed = getStudentOutstanding(s.id);
                                const isSettled = totalOwed === 0;

                                return (
                                  <div 
                                    key={s.id}
                                    onClick={() => setSelectedKasseStudentId(s.id)}
                                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 text-left cursor-pointer group ${selectedKasseStudentId === s.id ? 'bg-indigo-50/50 border-indigo-200 shadow-md shadow-indigo-100/50' : 'bg-slate-50/50 hover:bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'}`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[0.875rem] shrink-0 transition-colors ${selectedKasseStudentId === s.id ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-slate-100 text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100'}`}>
                                          {s.nachname.charAt(0)}{s.vorname.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-[0.875rem] font-black text-slate-800 text-wrap leading-tight break-words">
                                            {s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span>
                                          </p>
                                          <p className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Index: {app.schueler.indexOf(s) + 1}</p>
                                        </div>
                                      </div>
                                      
                                      <span className={`px-2.5 py-1 rounded-md text-[0.5625rem] font-black uppercase tracking-widest border ${isSettled ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' : 'bg-amber-50 text-amber-700 border-amber-100/50'}`}>
                                        {isSettled ? 'Ausgeglichen' : `Rückstand`}
                                      </span>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 gap-2 text-center bg-white p-3 rounded-xl border border-slate-100/50 shadow-3xs">
                                      <div className="space-y-1 border-r border-slate-50">
                                        <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block">Eingezahlt</span>
                                        <span className="text-[0.875rem] leading-none font-black text-emerald-600 font-mono block">{totalPaid.toFixed(2)}€</span>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block">Ausstehend</span>
                                        <span className={`text-[0.875rem] leading-none font-black font-mono block ${totalOwed > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                                          {totalOwed.toFixed(2)}€
                                        </span>
                                      </div>
                                    </div>

                                    {/* Fast Actions */}
                                    <div className="flex justify-between items-center gap-2 pt-1">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedKasseStudentId(s.id);
                                        }}
                                        className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-600 hover:underline"
                                      >
                                        Rechnung ansehen →
                                      </button>
                                      
                                      {!isSettled && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            settleAllStudentPayments(s.id);
                                          }}
                                          className="text-[0.625rem] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200/50 hover:bg-emerald-100 hover:text-emerald-700 p-1.5 px-3 rounded-lg transition-colors shadow-3xs"
                                        >
                                          Alles ausgleichen
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: Selected student Personal balance card & invoice log */}
                        <div className="xl:col-span-1">
                          {selectedStudent ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-md shadow-slate-100 space-y-6 scroll-mt-20" id="personal-invoice-sheet">
                              
                              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-[1rem] leading-normal">
                                    {selectedStudent.emoji || '👤'}
                                  </div>
                                  <div>
                                    <h4 className="text-[1rem] leading-normal font-black text-slate-900 tracking-tight">Kontoauszug</h4>
                                    <p className="text-[0.6875rem] font-bold text-indigo-600">{selectedStudent.nachname} {selectedStudent.vorname}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setSelectedKasseStudentId(null)} 
                                  className="p-1 text-slate-300 hover:text-slate-600 rounded-lg"
                                >
                                  <X size={16} />
                                </button>
                              </div>

                              {/* Student Balance details */}
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-center">
                                  <span className="text-[0.5rem] font-black uppercase text-slate-400 block tracking-widest">Gezahlte Summe</span>
                                  <span className="text-[1.125rem] leading-normal font-black font-mono text-emerald-600 mt-1 block">
                                    {getStudentTotalPaid(selectedStudent.id).toFixed(2)}€
                                  </span>
                                </div>
                                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 text-center">
                                  <span className="text-[0.5rem] font-black uppercase text-slate-400 block tracking-widest">Außenstände</span>
                                  <span className={`text-[1.125rem] leading-normal font-black font-mono mt-1 block ${getStudentOutstanding(selectedStudent.id) > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                    {getStudentOutstanding(selectedStudent.id).toFixed(2)}€
                                  </span>
                                </div>
                              </div>

                              {/* Collection tracking detailed itemized checklist */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Fällige Sammlungen</span>
                                  {getStudentOutstanding(selectedStudent.id) > 0 && (
                                    <button 
                                      onClick={() => settleAllStudentPayments(selectedStudent.id)}
                                      className="text-[0.5625rem] font-black uppercase tracking-wider text-emerald-600 hover:underline"
                                    >
                                      Sammel-Ausgleich
                                    </button>
                                  )}
                                </div>

                                <div className="space-y-2 max-h-[13.75rem] overflow-y-auto custom-scrollbar">
                                  {kasse.sammlungen.map(s => {
                                    const status = s.status?.[selectedStudent.id] || 'offen';
                                    const paid = s.betraege?.[selectedStudent.id] || 0;
                                    const target = s.betrag;

                                    return (
                                      <div key={s.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/30 flex items-center justify-between text-[0.75rem] leading-tight">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-800 break-words whitespace-normal leading-tight">{s.titel}</p>
                                          <p className="text-[0.5625rem] text-slate-400 font-bold font-mono">Soll: {target.toFixed(2)}€ • Ist: {paid.toFixed(2)}€</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 no-print">
                                          <button 
                                            onClick={() => setStudentPaymentStatusDirectly(selectedStudent.id, s.id, status === 'bezahlt' ? 'offen' : 'bezahlt')}
                                            className={`h-6 px-2 text-[0.5rem] font-black uppercase tracking-wider rounded-md transition-all ${status === 'bezahlt' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                          >
                                            {status === 'bezahlt' ? 'Paid' : 'Settle'}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Student private ledger history */}
                              <div className="space-y-3 pt-2">
                                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block">Zahlungshistorie (Kontoauszug)</span>
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl  max-h-[10rem] overflow-y-auto custom-scrollbar">
                                  {kasse.transaktionen.filter(t => t.schuelerId === selectedStudent.id).map((t, idx) => (
                                    <div key={t.id || idx} className="p-2.5 flex justify-between items-center bg-slate-50/20">
                                      <div className="min-w-0 pr-2">
                                        <p className="text-[0.6875rem] font-bold text-slate-700 text-wrap leading-tight break-words">{t.titel.split(': ').slice(1).join(': ') || t.titel}</p>
                                        <p className="text-[0.5rem] font-bold text-slate-400">{new Date(t.datum).toLocaleDateString()}</p>
                                      </div>
                                      <span className={`text-[0.6875rem] font-black font-mono shrink-0 ${t.typ === 'plus' ? 'text-emerald-600' : 'text-rose-500'}`}>
                                        {t.typ === 'plus' ? '+' : '-'}{t.betrag.toFixed(2)}€
                                      </span>
                                    </div>
                                  ))}
                                  {kasse.transaktionen.filter(t => t.schuelerId === selectedStudent.id).length === 0 && (
                                    <div className="p-4 text-center text-slate-300 italic text-[0.625rem]">
                                      Noch keine individuellen Buchungen für dieses Kind.
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Manual Quick booking for specific student */}
                              <div className="pt-2 no-print">
                                <button 
                                  onClick={() => {
                                    setAddTxStudentId(selectedStudent.id);
                                    setAddTxTitle('Individuelle Einzahlung');
                                    setAddTxCategory('sonstiges');
                                    setAddTxType('plus');
                                    setIsAddTxModalOpen(true);
                                  }}
                                  className="w-full h-9 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[0.625rem] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all"
                                >
                                  <ArrowUpCircle size={14} className="text-emerald-500" /> Individuelle Buchung erfassen
                                </button>
                              </div>

                            </div>
                          ) : (
                            <div className="bg-white/50 border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-300 flex flex-col items-center justify-center h-full min-h-[25rem]">
                              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center text-slate-300 shadow-sm mb-4">
                                <ClipboardList size={30} strokeWidth={1.5} />
                              </div>
                              <p className="font-black text-[0.6875rem] uppercase tracking-wider text-slate-400">Kein Schüler ausgewählt</p>
                              <p className="text-[0.625rem] text-slate-300 italic max-w-xs mt-1">Klicken Sie links auf einen Schüler, um den personalisierten Abrechnungsbeleg anzuzeigen.</p>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  )}

                </div>

                {/* MODAL 1: PROMPT-FREE CUSTOM MANUAL TRANSACTION ENTRY */}
                <AnimatePresence>
                  {isAddTxModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddTxModalOpen(false)}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="transaction-dialog-title"
                        className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6  flex flex-col"
                      >
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[1.25rem] leading-normal">📊</span>
                            <div>
                              <h4 id="transaction-dialog-title" className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">Manuelle Buchung erfassen</h4>
                              <p className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest">Einnahme oder Ausgabe verbuchen</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setIsAddTxModalOpen(false)} aria-label="Buchungsdialog schließen" title="Schließen" className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>

                        <form onSubmit={e => { e.preventDefault(); handleAddNewTransaction(); }} className="space-y-4">
                          {/* Plus vs Minus selector toggle */}
                          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                            <button 
                              type="button" 
                              onClick={() => setAddTxType('plus')}
                              aria-pressed={addTxType === 'plus'}
                              className={`py-1.5 text-center text-[0.625rem] font-black uppercase tracking-wide rounded-lg transition-all ${addTxType === 'plus' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                            >
                              📈 Einnahme (+)
                            </button>
                            <button 
                              type="button" 
                              onClick={() => setAddTxType('minus')}
                              aria-pressed={addTxType === 'minus'}
                              className={`py-1.5 text-center text-[0.625rem] font-black uppercase tracking-wide rounded-lg transition-all ${addTxType === 'minus' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                            >
                              📉 Ausgabe (-)
                            </button>
                          </div>

                          {/* Title */}
                          <div className="space-y-1">
                            <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Verwendungszweck / Titel*</label>
                            <input 
                              type="text" 
                              aria-label="Verwendungszweck oder Titel"
                              required
                              value={addTxTitle}
                              onChange={e => setAddTxTitle(e.target.value)}
                              className="w-full h-11 bg-slate-50 focus:bg-white text-[0.75rem] font-bold text-slate-700 rounded-xl px-3 outline-none focus:ring-1 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 transition-all"
                              placeholder="z.B. Busfahrt Zoo, Materialkauf"
                            />
                          </div>

                          {/* Amount Input */}
                          <div className="space-y-1">
                            <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Betrag in €*</label>
                            <input 
                              type="text" 
                              aria-label="Betrag in Euro"
                              required
                              value={addTxAmount}
                              onChange={e => setAddTxAmount(e.target.value)}
                              className="w-full h-11 bg-slate-50 focus:bg-white text-[0.75rem] font-black font-mono text-slate-700 rounded-xl px-3 outline-none focus:ring-1 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 transition-all font-mono"
                              placeholder="0.00"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* Category Select */}
                            <div className="space-y-1">
                              <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 font-bold block">Kategorie</label>
                              <select 
                                aria-label="Buchungskategorie"
                                value={addTxCategory} 
                                onChange={e => setAddTxCategory(e.target.value as any)}
                                className="w-full h-11 bg-slate-50 rounded-xl text-[0.6875rem] font-bold px-3 outline-none border border-transparent focus:border-indigo-500"
                              >
                                <option value="sonstiges">Sonstiges</option>
                                <option value="ausgabe">Anschaffung</option>
                                <option value="sammlung">Materialbeitrag</option>
                              </select>
                            </div>

                            {/* Linked Student optional dropdown */}
                            <div className="space-y-1">
                              <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 font-bold block">Schüler verknüpfen</label>
                              <select 
                                aria-label="Schüler oder Schülerin verknüpfen"
                                value={addTxStudentId} 
                                onChange={e => setAddTxStudentId(e.target.value)}
                                className="w-full h-11 bg-slate-50 rounded-xl text-[0.6875rem] font-bold px-3 outline-none border border-transparent focus:border-indigo-500"
                              >
                                <option value="">(Niemand - Kasse global)</option>
                                {app.schueler.map(s => (
                                  <option key={s.id} value={s.id}>{s.nachname} {s.vorname.charAt(0)}.</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Date */}
                          <div className="space-y-1">
                            <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400 block font-bold">Datum</label>
                            <input 
                              type="date" 
                              aria-label="Buchungsdatum"
                              value={addTxDate}
                              onChange={e => setAddTxDate(e.target.value)}
                              className="w-full h-11 bg-slate-50 rounded-xl text-[0.6875rem] font-bold px-3 outline-none"
                            />
                          </div>

                          <button 
                            type="submit"
                            className="w-full h-11 bg-slate-900 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md mt-2"
                          >
                            Posten buchen
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

                {/* MODAL 2: GELDSAMMLUNG START OVERLAY */}
                <AnimatePresence>
                  {isAddSammlungModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        onClick={() => setIsAddSammlungModalOpen(false)}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 15 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 15 }}
                        className="relative w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-6  flex flex-col"
                      >
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[1.25rem] leading-normal">💰</span>
                            <div>
                              <h4 className="text-[0.875rem] leading-snug font-black text-slate-900 tracking-tight">Neue Sammlung starten</h4>
                              <p className="text-[0.5625rem] font-bold text-slate-400 uppercase tracking-widest">Gemeinsame Einzahlung der Klasse</p>
                            </div>
                          </div>
                          <button onClick={() => setIsAddSammlungModalOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400"><X size={16} /></button>
                        </div>

                        <form onSubmit={e => { e.preventDefault(); handleAddNewSammlung(); }} className="space-y-4">
                          {/* Title */}
                          <div className="space-y-1">
                            <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Titel der Sammlung*</label>
                            <input 
                              type="text" 
                              required
                              value={addSammlungTitle}
                              onChange={e => setAddSammlungTitle(e.target.value)}
                              className="w-full h-11 bg-slate-50 focus:bg-white text-[0.75rem] font-bold text-slate-700 rounded-xl px-3 outline-none focus:ring-1 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 transition-all-slow"
                              placeholder="z.B. Wandertag Juni, Bastelgeld"
                            />
                          </div>

                          {/* Price Each */}
                          <div className="space-y-1">
                            <label className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-400">Soll-Betrag pro Kind (€)*</label>
                            <input 
                              type="text" 
                              required
                              value={addSammlungAmount}
                              onChange={e => setAddSammlungAmount(e.target.value)}
                              className="w-full h-11 bg-slate-50 focus:bg-white text-[0.75rem] font-black font-mono text-slate-700 rounded-xl px-3 outline-none focus:ring-1 focus:ring-indigo-500 border border-transparent focus:border-indigo-500 transition-all font-mono"
                              placeholder="e.g. 10.00"
                            />
                            <p className="text-[0.5rem] text-slate-400">Automatische Initialisierung für alle {app.schueler.length} Schüler auf "Offen" (0.00€ bezahlt).</p>
                          </div>

                          <button 
                            type="submit"
                            className="w-full h-11 bg-slate-900 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md mt-2"
                          >
                            Sammlung initialisieren
                          </button>
                        </form>
                      </motion.div>
                    </div>
                  )}
                </AnimatePresence>

              </div>
            );
          })()}

          {activeTab === 'passwords' && (
            <div className="flex-1 flex flex-col ">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">Passwörter</h3>
                <div className="flex items-center gap-3">
                  <div className="relative w-48 no-print">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" placeholder="Suchen..." className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 h-9 text-[0.6875rem] font-bold focus:ring-2 focus:ring-indigo-500/10 outline-none" value={passwordSearch} onChange={e => setPasswordSearch(e.target.value)} />
                  </div>
                  <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className="h-9 px-4 bg-slate-900 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-all"><Plus size={14} /> Neu</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
                  {passwords.filter(p => p.bezeichnung.toLowerCase().includes(passwordSearch.toLowerCase())).map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 group hover:border-indigo-100 transition-all shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                          <span className="text-[0.5rem] font-black text-indigo-500 uppercase tracking-widest leading-none block mb-1">{p.kategorie}</span>
                          <h4 className="text-[0.8125rem] font-black text-slate-900 text-wrap leading-tight break-words">{p.bezeichnung}</h4>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingItem(p); setIsModalOpen(true); }} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Edit2 size={14} /></button>
                          <button onClick={() => { if(confirm('Löschen?')) setApp(prev => ({ ...prev, zugangsdaten: (prev.zugangsdaten || []).filter(z => z.id !== p.id) })) }} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-lg group/line">
                          <span className="text-[0.6875rem] font-bold text-slate-600 text-wrap leading-tight break-words flex-1">{p.benutzername}</span>
                          <button onClick={() => navigator.clipboard.writeText(p.benutzername)} className="text-slate-300 hover:text-indigo-500 opacity-0 group-hover/line:opacity-100 transition-all"><Copy size={12} /></button>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50/80 p-2 rounded-lg group/line">
                          <span className="text-[0.6875rem] font-mono font-bold text-slate-600 flex-1">{visiblePasswords[p.id] ? p.passwort : '••••••••'}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover/line:opacity-100 transition-all">
                            <button onClick={() => setVisiblePasswords(prev => ({ ...prev, [p.id]: !prev[p.id] }))} className="text-slate-400 hover:text-indigo-500">{visiblePasswords[p.id] ? <EyeOff size={12} /> : <Eye size={12} />}</button>
                            <button onClick={() => navigator.clipboard.writeText(p.passwort)} className="text-slate-300 hover:text-indigo-500"><Copy size={12} /></button>
                          </div>
                        </div>
                      </div>
                      {p.url && (
                        <a href={p.url.startsWith('http') ? p.url : `https://${p.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"><ExternalLink size={12} /> Öffnen</a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeList && (
            <div className="flex-1 flex flex-col ">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">{activeList.titel}</h3>
                  <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[0.5625rem] font-black uppercase tracking-widest">
                    {activeList.checked.length} / {app.schueler.length}
                  </div>
                </div>
                <div className="flex items-center gap-3 no-print">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" placeholder="Suchen..." className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 h-9 text-[0.6875rem] font-bold outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                  
                  <button onClick={() => { if(confirm('Löschen?')) { setApp(prev => ({ ...prev, orga_listen: (prev.orga_listen || []).filter(l => l.id !== activeOrgaListId) })); setActiveTab('kasse'); } }} className="w-9 h-9 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="w-12 text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">#</div>
                    <div className="flex-1 text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Schüler/in</div>
                    <div className="w-24 text-right text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Status</div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {students.map((s, idx) => {
                      const isChecked = activeList.checked.includes(s.id);
                      return (
                        <div key={s.id} onClick={() => toggleCheck(s.id)} className={`flex items-center px-6 py-3 cursor-pointer transition-colors group ${isChecked ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-slate-50'}`}>
                          <div className="w-12 text-[0.6875rem] font-black text-slate-300 group-hover:text-slate-400 transition-colors">{app.schueler.indexOf(s) + 1}</div>
                          <div className="flex-1 text-[0.875rem] font-bold text-slate-800">{s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span></div>
                          <div className="w-24 flex justify-end">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-lg border-2 transition-all shadow-3xs ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' : 'border-slate-200 bg-white group-hover:border-slate-300'}`}>
                              {isChecked && <CheckCircle2 size={14} />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCustomList && (
            <div className="flex-1 flex flex-col ">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div>
                  <h3 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight">{activeCustomList.titel}</h3>
                  <p className="text-[0.625rem] font-bold text-rose-500 uppercase tracking-widest">{activeCustomList.spaltenName}</p>
                </div>
                <div className="flex items-center gap-3 no-print">
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" placeholder="Suchen..." className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 h-9 text-[0.6875rem] font-bold outline-none" value={customListSearch} onChange={e => setCustomListSearch(e.target.value)} />
                  </div>
                  
                  <button onClick={() => { if(confirm('Löschen?')) { setApp(prev => ({ ...prev, customLists: (prev.customLists || []).filter(l => l.id !== activeCustomListId) })); setActiveTab('kasse'); } }} className="w-9 h-9 bg-rose-50 text-rose-400 rounded-xl flex items-center justify-center hover:bg-rose-100 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="flex items-center px-6 py-3 bg-slate-50/50 border-b border-slate-100">
                    <div className="w-48 text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">Schüler/in</div>
                    <div className="flex-1 text-[0.625rem] font-black uppercase text-slate-400 tracking-wider">{activeCustomList.spaltenName}</div>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {students.map((s) => (
                      <div key={s.id} className="flex items-center px-6 py-2 hover:bg-slate-50/50 transition-colors">
                        <div className="w-48 text-[0.875rem] font-bold text-slate-800">
                          {s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span>
                        </div>
                        <div className="flex-1">
                          <input 
                            type="text" 
                            className="w-full h-9 bg-slate-50/50 border border-slate-200/50 rounded-xl px-4 text-[0.875rem] font-bold text-slate-700 focus:bg-white focus:border-rose-300 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all placeholder-slate-300 print:bg-transparent print:p-0 print:border-none"
                            placeholder="Wert eintragen..."
                            value={activeCustomList.werte[s.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setApp(prev => ({
                                ...prev,
                                customLists: (prev.customLists || []).map(l => l.id === activeCustomListId ? { ...l, werte: { ...l.werte, [s.id]: val } } : l)
                              }));
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCheckliste && (
            <div className="absolute inset-0 flex flex-col p-8 space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100/50">
                    <Backpack size={24} />
                  </div>
                  <div>
                    <h2 className="text-[1.25rem] leading-normal font-black text-slate-800 tracking-tight">{activeCheckliste.titel}</h2>
                    {activeCheckliste.datum && <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Termin: {new Date(activeCheckliste.datum).toLocaleDateString('de-DE')}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const newTitle = prompt("Neuer Titel:", activeCheckliste.titel);
                      if (newTitle) {
                        setApp(prev => ({
                          ...prev,
                          checklisten: (prev.checklisten || []).map(c => 
                            c.id === activeChecklisteId 
                              ? { ...c, titel: newTitle } 
                              : c
                          )
                        }));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-[0.75rem] leading-tight rounded-xl transition-all"
                    title="Titel bearbeiten"
                  >
                    <Edit2 size={14} /> Bearbeiten
                  </button>
                  <button 
                    onClick={() => {
                      if(!confirm("Spalte hinzufügen? Gib den Namen der Spalte ein:")) return;
                      const spaltenName = prompt("Spaltenname (z.B. Erlaubnis):");
                      if(spaltenName) {
                        setApp(prev => ({
                          ...prev,
                          checklisten: (prev.checklisten || []).map(c => 
                            c.id === activeChecklisteId 
                              ? { ...c, spalten: [...c.spalten, { id: crypto.randomUUID(), label: spaltenName }] } 
                              : c
                          )
                        }));
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold text-[0.75rem] leading-tight rounded-xl transition-all"
                  >
                    <Plus size={14} /> Neuses Feld
                  </button>
                  
                  <button 
                    onClick={() => {
                      if(confirm('Checkliste wirklich löschen?')) {
                        setApp(prev => ({ ...prev, checklisten: (prev.checklisten || []).filter(c => c.id !== activeChecklisteId) }));
                        setActiveTab('kasse');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[0.75rem] leading-tight rounded-xl transition-all"
                  >
                    <Trash2 size={14} /> Löschen
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto rounded-2xl border border-slate-100 bg-white shadow-sm custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50/80 border-b border-slate-100 sticky top-0 z-10 box-shadow-sm backdrop-blur-md">
                    <tr>
                      <th className="px-6 py-4 text-[0.625rem] uppercase font-black tracking-widest text-slate-400 w-48 border-r border-slate-100">Name</th>
                      {activeCheckliste.spalten.map(spalte => (
                        <th key={spalte.id} className="px-4 py-4 border-r border-slate-100 last:border-r-0">
                          <div className="flex items-center justify-between group gap-2">
                            <span className="text-[0.625rem] uppercase font-black tracking-widest text-slate-400 truncate">{spalte.label}</span>
                            <button 
                              onClick={() => {
                                if(confirm(`Spalte "${spalte.label}" löschen?`)) {
                                  setApp(prev => ({
                                    ...prev,
                                    checklisten: (prev.checklisten || []).map(c => 
                                      c.id === activeChecklisteId 
                                        ? { ...c, spalten: c.spalten.filter(s => s.id !== spalte.id) } 
                                        : c
                                    )
                                  }));
                                }
                              }}
                              className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-white hover:bg-rose-50 rounded-md"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {students.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3 text-[0.875rem] font-bold text-slate-800 border-r border-slate-50">
                          {s.nachname} <span className="text-slate-500 font-semibold">{s.vorname}</span>
                        </td>
                        {activeCheckliste.spalten.map(spalte => {
                          const isChecked = activeCheckliste.eintraege?.[s.id]?.[spalte.id] || false;
                          return (
                            <td key={spalte.id} className="px-4 py-3 border-r border-slate-50 cursor-pointer text-center group" onClick={() => {
                              setApp(prev => {
                                const newChecklisten = [...(prev.checklisten || [])];
                                const currentCheckliste = newChecklisten.find(c => c.id === activeChecklisteId);
                                if (!currentCheckliste) return prev;
                                
                                const studentEintraege = currentCheckliste.eintraege[s.id] || {};
                                currentCheckliste.eintraege = {
                                  ...currentCheckliste.eintraege,
                                  [s.id]: {
                                    ...studentEintraege,
                                    [spalte.id]: !isChecked
                                  }
                                };
                                return { ...prev, checklisten: newChecklisten };
                              });
                            }}>
                              <div className={`mx-auto w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 shadow-3xs ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200' : 'bg-slate-50 border-slate-200 text-transparent group-hover:border-slate-300'}`}>
                                <Check size={16} />
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
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCustomListModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsCustomListModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl  flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-rose-50/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                    <Ruler size={24} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Neue Flexible Liste</h3>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Daten für die ganze Klasse erfassen</p>
                  </div>
                </div>
                <button onClick={() => setIsCustomListModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all"><X size={20} /></button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const titel = fd.get('titel') as string;
                  const spaltenName = fd.get('spaltenName') as string;
                  
                  const newList: CustomList = {
                    id: crypto.randomUUID(),
                    titel,
                    spaltenName,
                    werte: {}
                  };

                  setApp(prev => ({
                    ...prev,
                    customLists: [...(prev.customLists || []), newList]
                  }));
                  setActiveTab(`custom-list-${newList.id}`);
                  setIsCustomListModalOpen(false);
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Titel der Liste*</label>
                    <input name="titel" required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-rose-500" placeholder="z.B. Eislaufplatz - Schuhgrößen" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Name der Info-Spalte*</label>
                    <input id="spaltenNameInput" name="spaltenName" required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-rose-500" placeholder="z.B. Schuhgröße" />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Schnell-Vorschläge</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'Schuhgröße', icon: '👟' },
                        { label: 'Körpergröße', icon: '📏' },
                        { label: 'Gewicht', icon: '⚖️' },
                        { label: 'T-Shirt Größe', icon: '👕' },
                        { label: 'Schwimmabzeichen', icon: '🏊' }
                      ].map(v => (
                        <button 
                          key={v.label}
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('spaltenNameInput') as HTMLInputElement;
                            if (input) input.value = v.label;
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-[0.6875rem] font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 transition-all flex items-center gap-2"
                        >
                          <span>{v.icon}</span> {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsCustomListModalOpen(false)} className="btn flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold">Abbrechen</button>
                  <button type="submit" className="btn flex-1 h-12 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-[0.6875rem] shadow-lg shadow-rose-500/20">Liste erstellen</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isChecklisteModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsChecklisteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl  flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-emerald-50/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                    <Backpack size={24} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">Neuer Ausflug / Checkliste</h3>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Behalte den Überblick mit Checkboxen</p>
                  </div>
                </div>
                <button onClick={() => setIsChecklisteModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all"><X size={20} /></button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  
                  const activeFields: { id: string; label: string }[] = [];
                  ['Geld abgegeben', 'Einverständnis', 'Essen'].forEach(label => {
                    const cb = e.currentTarget.elements.namedItem(`cb_${label}`) as HTMLInputElement;
                    if (cb && cb.checked) {
                      activeFields.push({ id: crypto.randomUUID(), label });
                    }
                  });

                  const newList = {
                    id: crypto.randomUUID(),
                    titel: checklisteTitle,
                    datum: checklisteDate ? new Date(checklisteDate).toISOString() : undefined,
                    spalten: activeFields,
                    eintraege: {}
                  };

                  setApp(prev => ({
                    ...prev,
                    checklisten: [...(prev.checklisten || []), newList]
                  }));
                  setActiveTab(`checkliste-${newList.id}`);
                  setIsChecklisteModalOpen(false);
                  setChecklisteTitle('');
                  setChecklisteDate('');
                }}
                className="p-8 space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Titel / Ziel*</label>
                    <input value={checklisteTitle} onChange={e => setChecklisteTitle(e.target.value)} required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500" placeholder="z.B. Wandertag Tiergarten" />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Datum (optional)</label>
                    <input type="date" value={checklisteDate} onChange={e => setChecklisteDate(e.target.value)} className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500" />
                  </div>
                  
                  <div className="space-y-3 pt-4">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Standardfelder direkt hinzufügen:</label>
                    <div className="flex flex-col gap-2">
                      {['Geld abgegeben', 'Einverständnis', 'Essen'].map((field) => (
                        <label key={field} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                          <input type="checkbox" name={`cb_${field}`} defaultChecked={true} className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 border-slate-300" />
                          <span className="text-[0.75rem] font-bold text-slate-700">{field}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsChecklisteModalOpen(false)} className="btn flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold">Abbrechen</button>
                  <button type="submit" className="btn flex-1 h-12 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[0.6875rem] shadow-lg shadow-emerald-500/20">Checkliste erstellen</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl  flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-indigo-50/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                    <Key size={24} />
                  </div>
                  <div>
                    <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 tracking-tight">{editingItem ? 'Zugang bearbeiten' : 'Neuer Zugang'}</h3>
                    <p className="text-[0.625rem] font-bold uppercase tracking-widest text-slate-400">Zugangsdaten sicher speichern</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 hover:text-slate-900 hover:bg-slate-50 transition-all"><X size={20} /></button>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const data: Zugangsdaten = {
                    id: editingItem?.id || crypto.randomUUID(),
                    bezeichnung: fd.get('bezeichnung') as string,
                    benutzername: fd.get('benutzername') as string,
                    passwort: fd.get('passwort') as string,
                    url: fd.get('url') as string,
                    kategorie: fd.get('kategorie') as string,
                    notiz: fd.get('notiz') as string,
                  };

                  setApp(prev => {
                    const current = prev.zugangsdaten || [];
                    const index = current.findIndex(z => z.id === data.id);
                    const zugangsdaten = index >= 0 
                      ? current.map((z, i) => i === index ? data : z)
                      : [...current, data];
                    return { ...prev, zugangsdaten };
                  });
                  setIsModalOpen(false);
                }}
                className="p-8 space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Bezeichnung*</label>
                    <input name="bezeichnung" defaultValue={editingItem?.bezeichnung} required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500" placeholder="z.B. Sokrates Vorarlberg" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Kategorie</label>
                    <input name="kategorie" defaultValue={editingItem?.kategorie} required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500" placeholder="z.B. Schulverwaltung" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Benutzername*</label>
                    <input name="benutzername" defaultValue={editingItem?.benutzername} required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500" placeholder="Username" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Passwort*</label>
                    <input name="passwort" type="text" defaultValue={editingItem?.passwort} required className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 font-mono" placeholder="••••••••" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">URL (optional)</label>
                  <input name="url" defaultValue={editingItem?.url} className="input-field h-12 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500" placeholder="https://..." />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 tracking-widest ml-1">Notiz (optional)</label>
                  <textarea name="notiz" defaultValue={editingItem?.notiz} className="input-field min-h-[5rem] py-3 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500" placeholder="..." />
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="btn flex-1 h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold">Abbrechen</button>
                  <button type="submit" className="btn flex-1 h-12 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[0.6875rem] shadow-lg shadow-indigo-600/20">Speichern</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
