import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  FileText, Wand2, Edit2, Save, Printer, Loader2, CheckCircle2, Gift,
  Sparkles, RefreshCw, Check, HelpCircle, Settings, Sliders, AlertCircle,
  Award, TrendingUp, Heart, ChevronRight, CheckSquare, Plus, Quote, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { askAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { SchuljahrWrapped } from './SchuljahrWrapped';
import { STANDARD_KEL_BEREICHE } from '../types';

export default function Jahresbericht() {
  const { app, setApp } = useApp();
  const currentTerm = app.schuljahr || '2025';
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bericht' | 'radar'>('bericht');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingAllStatus, setGeneratingAllStatus] = useState<{ total: number, current: number } | null>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showWrapped, setShowWrapped] = useState<string | null>(null);

  // Advanced customization state (stored in local storage)
  const [tonality, setTonality] = useState<'wertschätzend' | 'sachlich' | 'ressourcenorientiert' | 'zukunftsgewandt'>(() => {
    return (localStorage.getItem('jb_tonality') as any) || 'wertschätzend';
  });
  const [structure, setStructure] = useState<'standard' | 'lehrplan' | 'foerderorientiert'>(() => {
    return (localStorage.getItem('jb_structure') as any) || 'lehrplan';
  });
  const [pronounForm, setPronounForm] = useState<'sie_er' | 'du_direkt' | 'formal_eltern'>(() => {
    return (localStorage.getItem('jb_pronoun') as any) || 'sie_er';
  });

  const [includeBadges, setIncludeBadges] = useState(true);
  const [includeObservations, setIncludeObservations] = useState(true);
  const [includeGrades, setIncludeGrades] = useState(true);
  const [personalWish, setPersonalWish] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Manual review flag state
  const [reviewStatus, setReviewStatus] = useState<Record<string, 'freigegeben' | 'nacharbeiten' | 'offen'>>(() => {
    const saved = localStorage.getItem('jb_review_status_v1');
    return saved ? JSON.parse(saved) : {};
  });

  const berichte = app.jahresberichte || {};
  const students = app.schueler || [];

  // Persist options
  useEffect(() => {
    localStorage.setItem('jb_tonality', tonality);
  }, [tonality]);

  useEffect(() => {
    localStorage.setItem('jb_structure', structure);
  }, [structure]);

  useEffect(() => {
    localStorage.setItem('jb_pronoun', pronounForm);
  }, [pronounForm]);

  const handleSetReview = (studentId: string, status: 'freigegeben' | 'nacharbeiten' | 'offen') => {
    const updated = { ...reviewStatus, [studentId]: status };
    setReviewStatus(updated);
    localStorage.setItem('jb_review_status_v1', JSON.stringify(updated));
  };

  const triggerSingleGeneration = async (studentId: string) => {
    setIsGenerating(true);
    await generateReport(studentId);
    setIsGenerating(false);
  };

  const generateReport = async (studentId: string) => {
    const s = students.find(x => x.id === studentId);
    if (!s) return;
    
    // 1. Gather rich database-driven context
    // Grades
    const sGrades = app.noten?.[studentId] || {};
    let gradesStr = '';
    if (includeGrades && Object.keys(sGrades).length > 0) {
      gradesStr = Object.entries(sGrades).map(([fach, data]: any) => {
        const finalGrade = data.endnote || 'noch keine Endnote';
        return `- ${fach}: Note ${finalGrade}`;
      }).join(', ');
    } else {
      gradesStr = 'Keine Noten eingetragen';
    }

    // Badges / Achievements
    const sBadges = s.badges || [];
    let badgesList = '';
    if (includeBadges && sBadges.length > 0) {
      badgesList = sBadges.map((b: any) => `${b.icon} ${b.name}`).join(', ');
    } else {
      badgesList = 'Keine Auszeichnungen gesammelt';
    }

    // KEL Goals and Selbsteinschätzung
    const kelForStudent = app.kelGespraeche?.filter(k => k.schuelerId === studentId) || [];
    let kelGoalsStr = '';
    let kelSelfStr = '';
    if (kelForStudent.length > 0) {
      const lastKel = kelForStudent[kelForStudent.length - 1];
      if (lastKel.zieleKind && lastKel.zieleKind.length > 0) {
        kelGoalsStr = lastKel.zieleKind.map((z: any) => `- ${z.ziel}`).join('\n');
      }
      if (lastKel.selbsteinschaetzungKind) {
        kelSelfStr = Object.entries(lastKel.selbsteinschaetzungKind)
          .map(([key, data]: any) => {
            const area = STANDARD_KEL_BEREICHE.find(a => a.id === key);
            return `${area?.label || key}: ${data.wert}/4 ${data.kommentar ? `("${data.kommentar}")` : ''}`;
          }).join(', ');
      }
    }
    
    // Förderprofil & Diagnosen
    const fpStr = s.foerderprofil ? 'Förderplan aktiv' : 'Kein FP';
    const fpDiagnosen = s.foerderprofil?.diagnosen || 'Keine Diagnosen';
    const fpZiele = s.foerderprofil?.foerderziele?.map((z: any) => `- ${z.ziel} (Status: ${z.status})`).join('\n') || '';

    // Observations / Journal entries
    const studentObs = (app.notes || []).concat((app.journal as any) || []).filter(n => n.schuelerId === studentId);
    let obsStr = '';
    if (includeObservations && studentObs.length > 0) {
      obsStr = studentObs.map((n: any) => `[${n.kategorie || 'Beobachtung'}]: ${n.inhalt || n.content}`).slice(0, 5).join('\n');
    } else {
      obsStr = 'Keine spezifischen Beobachtungen vorhanden';
    }

    // 2. Map stylistic prompts
    let tonePrompt = '';
    if (tonality === 'wertschätzend') {
      tonePrompt = 'Schreibe in einem sehr wertschätzenden, empathischen und pädagogisch aufbauenden Ton. Hebe Stärken und Potenziale liebevoll hervor.';
    } else if (tonality === 'sachlich') {
      tonePrompt = 'Schreibe hochgradig sachlich, analytisch, präzise und professionell. Fokussiere dich auf beobachtbare Kompetenzen und Fakten für eine administrative Übergabe.';
    } else if (tonality === 'ressourcenorientiert') {
      tonePrompt = 'Schreibe ressourcenorientiert und stärkenfokussiert. Jede Herausforderung soll als Lernchance und Entwicklungsfeld formuliert werden. Verwende wohlwollende Formulierungen.';
    } else if (tonality === 'zukunftsgewandt') {
      tonePrompt = 'Schreibe sehr zukunftsgewandt und handlungsorientiert, mit speziellem Fokus auf die Empfehlungen und die nächsten Schritte für die weiterführende Schule.';
    }

    let pronounPrompt = '';
    if (pronounForm === 'sie_er') {
      pronounPrompt = `Formuliere den Bericht in der 3. Person Singular (er bzw. sie), passend für ein Kind mit dem Geschlecht ${s.geschlecht === 'w' ? 'weiblich (sie/ihr)' : 'männlich (er/ihm)'}.`;
    } else if (pronounForm === 'du_direkt') {
      pronounPrompt = `Formuliere den Bericht als direkte Ansprache in der Du-Form direkt an das Kind ${s.vorname} gerichtet.`;
    } else if (pronounForm === 'formal_eltern') {
      pronounPrompt = `Richte den Bericht in einer höflichen Form an die Eltern von ${s.vorname} (unter Verwendung von wertschätzenden Formulierungen über ihr Kind).`;
    }

    let structurePrompt = '';
    if (structure === 'lehrplan') {
      structurePrompt = `Strukturiere den Bericht zwingend nach folgenden lehrplankonformen Überschriften:
1. **Sozial- und Selbstkompetenz**: (Verhalten in der Gruppe, Selbstständigkeit, Motivation, Umgang mit Herausforderungen)
2. **Fachliche Kompetenzen (Deutsch, Mathematik, Sachunterricht)**: (Sprache, Lesen, mathematische Fähigkeiten, logisches Denken)
3. **Arbeits- und Lernverhalten**: (Ausdauer, Ordnung, Arbeitstempo)
4. **Zusammenfassung & Ausblick**: (Empfehlungen, Förderansätze)`;
    } else if (structure === 'foerderorientiert') {
      structurePrompt = `Strukturiere den Bericht zwingend nach folgenden Abschnitten:
1. **Entwicklungsschwerpunkte & Bisherige Fördermaßnahmen** (Fokus auf Lernfortschritte und aktive Maßnahmen)
2. **Fachspezifische Beobachtungen & IKM Plus / Diagnosen** (Inklusive Stärken in Deutsch und Mathematik)
3. **Pädagogische Empfehlungen & Nächste Förderziele** (Konkrete Ansätze für das kommende Schuljahr)`;
    } else {
      structurePrompt = `Strukturiere den Bericht in:
1. **Besondere Stärken**
2. **Entwicklungsfelder**
3. **Konkrete Empfehlungen für den weiteren Schulweg**`;
    }

    const dataPrompt = `
Vorname: ${s.vorname}
Nachname: ${s.nachname}
Klasse: ${app.klassenbezeichnung || 'Volksschulklasse'}
Schuljahr: ${currentTerm}
Noten: ${gradesStr}
Auszeichnungen / Badges: ${badgesList}
Förderstatus: ${fpStr} (Diagnosen: ${fpDiagnosen})
Förderziele: ${fpZiele}
KEL Selbsteinschätzung des Kindes: ${kelSelfStr || 'Keine Angabe'}
KEL Vereinbarte Ziele: ${kelGoalsStr || 'Keine KEL-Ziele vereinbart'}
Letzte Beobachtungen im Journal: ${obsStr}
Zusätzlicher Lehrer-Wunsch: ${personalWish || 'Kein spezieller Wunsch'}
`;

    const fullPrompt = `Du bist ein erfahrener Volksschulpädagoge und fachdidaktischer Berater in Österreich.
Erstelle einen detaillierten, professionellen und maßgeschneiderten Jahresbericht (Übergabebericht) für folgendes Kind.

DATEN:
${dataPrompt}

STIL & PERSPEKTIVE:
- ${tonePrompt}
- ${pronounPrompt}

STRUKTUR:
${structurePrompt}

WICHTIGE ANWEISUNGEN:
- Schreibe auf Deutsch.
- Nutze die echten Noten, Badges und Beobachtungen, um den Bericht lebendig und authentisch zu gestalten.
- Länge: ca. 250 - 350 Wörter.
- Antworte direkt im Markdown-Format. Verwende keine einleitenden oder abschließenden Floskeln außerhalb des Berichts.`;

    try {
      const response = await askAI('ki-helfer', fullPrompt);
      const inhalt = response || 'Bericht konnte nicht generiert werden.';
      
      setApp(prev => ({
        ...prev,
        jahresberichte: {
          ...(prev.jahresberichte || {}),
          [studentId]: {
            inhalt,
            generiert: new Date().toISOString(),
            schuljahr: currentTerm
          }
        }
      }));
      handleSetReview(studentId, 'offen');
    } catch (e) {
      console.error(e);
      alert('Fehler bei der KI-Generierung für ' + s.vorname);
    }
  };

  const triggerAllGenerations = async () => {
    if (!confirm('Für alle Schüler:innen ohne Bericht einen Jahresbericht generieren? (Das kann eine Weile dauern)')) return;
    
    const missing = students.filter(s => !berichte[s.id] || berichte[s.id].schuljahr !== currentTerm);
    setGeneratingAllStatus({ total: missing.length, current: 0 });
    
    for (let i = 0; i < missing.length; i++) {
        setGeneratingAllStatus({ total: missing.length, current: i + 1 });
        await generateReport(missing[i].id);
        await new Promise(r => setTimeout(r, 1000));
    }
    
    setGeneratingAllStatus(null);
  };

  const handleRefine = async (studentId: string, customPrompt?: string) => {
    const promptToUse = customPrompt || refinePrompt;
    if (!promptToUse.trim()) return;
    setIsRefining(true);
    const b = berichte[studentId];
    if (!b) return;

    try {
      const response = await askAI(
        'ki-helfer',
        `Du bist ein erfahrener Volksschullehrer und Lektor in Österreich.
Hier ist der aktuelle Entwurf des Jahresberichts:
---
${b.inhalt}
---

Bitte überarbeite diesen Bericht präzise nach folgender Anweisung der Lehrkraft:
"${promptToUse}"

Behalte die Grundstruktur (Überschriften) bei, passe den Text sorgfältig an und gib direkt den überarbeiteten Bericht im Markdown-Format zurück (ohne einleitenden oder abschließenden Text).`
      );

      if (response) {
        setApp(prev => ({
          ...prev,
          jahresberichte: {
            ...(prev.jahresberichte || {}),
            [studentId]: {
              ...prev.jahresberichte[studentId],
              inhalt: response,
              generiert: new Date().toISOString()
            }
          }
        }));
        if (!customPrompt) setRefinePrompt('');
      }
    } catch (e) {
      console.error(e);
      alert('Fehler bei der KI-Nachbearbeitung.');
    } finally {
      setIsRefining(false);
    }
  };

  const startEdit = (studentId: string, currentContent: string) => {
    setEditMode(studentId);
    setEditContent(currentContent);
  };

  const saveEdit = () => {
    if (!editMode) return;
    setApp(prev => ({
      ...prev,
      jahresberichte: {
        ...(prev.jahresberichte || {}),
        [editMode]: {
          ...(prev.jahresberichte?.[editMode] || { generiert: new Date().toISOString(), schuljahr: currentTerm }),
          inhalt: editContent
        }
      }
    }));
    setEditMode(null);
  };

  const printSingle = (studentId: string) => {
    printDocs([studentId]);
  };

  const printAll = () => {
    const studentIdsWithReports = Object.keys(berichte).filter(id => students.some(s => s.id === id));
    printDocs(studentIdsWithReports);
  };

  const printDocs = (ids: string[]) => {
    const css = `
      @page { size: A4; margin: 25mm 20mm 25mm 20mm; }
      body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; font-size: 11pt; }
      .letterhead { text-align: center; margin-bottom: 30px; border-bottom: 3px double #cbd5e1; padding-bottom: 15px; }
      .letterhead h2 { font-size: 14pt; margin: 0; text-transform: uppercase; tracking: 2px; color: #0f172a; font-weight: 800; }
      .letterhead p { font-size: 9pt; color: #64748b; margin: 5px 0 0 0; font-weight: 500; }
      h1 { font-size: 18pt; color: #0f172a; margin-top: 10px; margin-bottom: 5px; font-weight: 900; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 30px; font-size: 10pt; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .meta-item { font-weight: 600; }
      .meta-item span { font-weight: 400; color: #475569; }
      .content { font-size: 11pt; color: #334155; }
      .content h1, .content h2, .content h3 { font-size: 12pt; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 25px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
      .content p { margin-bottom: 15px; text-align: justify; }
      .content ul { padding-left: 20px; margin-bottom: 15px; }
      .content li { margin-bottom: 5px; }
      .footer-stamp { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      .page-break { page-break-before: always; }
      .signatures { margin-top: 60px; display: flex; justify-content: space-between; }
      .sig-line { width: 45%; border-top: 1px solid #94a3b8; text-align: center; padding-top: 8px; font-size: 9pt; color: #475569; font-weight: 500; }
      @media print { body { -webkit-print-color-adjust: exact; } .footer-stamp { position: fixed; bottom: 0; } }
    `;

    const docArr = ids.map((id, index) => {
        const s = students.find(s => s.id === id);
        const b = berichte[id];
        if (!s || !b) return '';
        
        // Convert markdown headings and lists to HTML for printing simplicity
        let htmlContent = b.inhalt
          .replace(/^### (.*$)/gim, '<h3>$1</h3>')
          .replace(/^## (.*$)/gim, '<h2>$1</h2>')
          .replace(/^# (.*$)/gim, '<h1>$1</h1>')
          .replace(/^\* (.*$)/gim, '<li>$1</li>')
          .replace(/^- (.*$)/gim, '<li>$1</li>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>');

        // Wrap loose <li> elements
        if (htmlContent.includes('<li>')) {
          htmlContent = htmlContent.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        }

        return `
          <div ${index > 0 ? 'class="page-break"' : ''}>
            <div class="letterhead">
              <h2>Österreichische Volksschule</h2>
              <p>Offizieller Übergabe- & Kompetenzbericht</p>
            </div>
            
            <h1>Jahresbericht</h1>
            <div class="meta-grid">
              <div class="meta-item">Schülerin/Schüler: <span>${s.vorname} ${s.nachname}</span></div>
              <div class="meta-item">Schuljahr: <span>${b.schuljahr}</span></div>
              <div class="meta-item">Klasse: <span>${app.klassenbezeichnung || 'Volksschulklasse'}</span></div>
              <div class="meta-item">Ausgestellt am: <span>${new Date(b.generiert).toLocaleDateString('de-DE')}</span></div>
            </div>

            <div class="content">
              <p>${htmlContent}</p>
            </div>

            <div class="signatures">
              <div class="sig-line">Klassenlehrperson</div>
              <div class="sig-line">Schulleitung / Direktion</div>
            </div>
          </div>
        `;
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Jahresberichte</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;800;900&display=swap" rel="stylesheet">
          <style>${css}</style>
        </head>
        <body>
          <div class="footer-stamp">Vertrauliches Dokument — Nur für den internen Schulgebrauch bestimmt</div>
          ${docArr.join('')}
        </body>
      </html>
    `;
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  };

  // Helper to calculate dynamic competence scores for the selected student
  const competences = selectedStudent ? (() => {
    const studentId = selectedStudent;
    const s = students.find(x => x.id === studentId);
    if (!s) return null;

    let de: number | null = null;
    let ma: number | null = null;
    let so: number | null = null;
    let sf: number | null = null;
    let kr: number | null = null;

    // Grades
    const sGrades = app.noten?.[studentId] || {};
    
    const getSubjectEndnote = (subjectRecord: any): number | null => {
      if (!subjectRecord) return null;
      if (typeof subjectRecord === 'object') {
        if (subjectRecord.endnote) {
          const parsed = parseInt(subjectRecord.endnote);
          return isNaN(parsed) ? null : parsed;
        }
        for (const key of Object.keys(subjectRecord)) {
          const val = subjectRecord[key];
          if (val && typeof val === 'object' && val.endnote) {
            const parsed = parseInt(val.endnote);
            if (!isNaN(parsed)) return parsed;
          }
        }
      }
      return null;
    };

    if (sGrades) {
      if (sGrades['Deutsch'] || sGrades['D']) {
        const dNote = getSubjectEndnote(sGrades['Deutsch'] || sGrades['D']);
        if (dNote !== null && dNote >= 1 && dNote <= 5) de = 100 - (dNote - 1) * 15;
      }
      if (sGrades['Mathematik'] || sGrades['M']) {
        const mNote = getSubjectEndnote(sGrades['Mathematik'] || sGrades['M']);
        if (mNote !== null && mNote >= 1 && mNote <= 5) ma = 100 - (mNote - 1) * 15;
      }
    }

    // KEL self-assessments
    const kelForStudent = app.kelGespraeche?.filter(k => k.schuelerId === studentId) || [];
    if (kelForStudent.length > 0) {
      const lastKel = kelForStudent[kelForStudent.length - 1];
      if (lastKel.selbsteinschaetzungKind) {
        Object.entries(lastKel.selbsteinschaetzungKind).forEach(([key, val]: any) => {
          const score = (val.wert || 3) * 23; 
          if (['lesen', 'zuzuhoeren', 'sprechen'].includes(key)) de = de === null ? score : Math.round((de + score) / 2);
          if (['rechnen'].includes(key)) ma = ma === null ? score : Math.round((ma + score) / 2);
          if (['hilfsbereitschaft', 'regeln', 'konflikte', 'mitarbeit_gruppe'].includes(key)) so = so === null ? score : Math.round((so + score) / 2);
          if (['konzentration', 'ordnung', 'selbststaendigkeit', 'tempo'].includes(key)) sf = sf === null ? score : Math.round((sf + score) / 2);
          if (['neues', 'kreativitaet', 'bewegung'].includes(key)) kr = kr === null ? score : Math.round((kr + score) / 2);
        });
      }
    }

    const clamp = (value: number | null) => value === null ? null : Math.min(100, Math.max(0, value));
    return { de: clamp(de), ma: clamp(ma), so: clamp(so), sf: clamp(sf), kr: clamp(kr) };
  })() : null;

  // General statistics for progress panel
  const totalStudentsCount = students.length;
  const reportsGeneratedCount = Object.keys(berichte).filter(id => students.some(s => s.id === id)).length;
  const reportsApprovedCount = Object.keys(reviewStatus).filter(id => reviewStatus[id] === 'freigegeben' && students.some(s => s.id === id)).length;
  const progressPercent = totalStudentsCount > 0 ? Math.round((reportsGeneratedCount / totalStudentsCount) * 100) : 0;

  return (
    <div className="year-report-shell h-full flex flex-col p-4 lg:p-6 space-y-4 bg-[#f4f7f3]">
      
      {/* Header Panel */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Abschluss- & Jahresberichte
              <span className="text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Berichts-Assistent
              </span>
            </h1>
            <p className="text-sm font-semibold text-slate-500 mt-1">
              Erstellen Sie individuelle Berichtsentwürfe auf Basis der ausgewählten schulischen Daten.
            </p>
          </div>
        </div>
        
        {/* Statistics Block */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-3 px-4 rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
              {reportsGeneratedCount}/{totalStudentsCount}
            </div>
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block">Fortschritt</span>
              <span className="font-bold text-slate-700">{progressPercent}% generiert</span>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-emerald-50/50 border border-emerald-100/50 p-3 px-4 rounded-2xl">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-xs">
              {reportsApprovedCount}
            </div>
            <div>
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-600 block">Freigegeben</span>
              <span className="font-bold text-slate-700">Berichte bereit</span>
            </div>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
             <button 
               type="button"
               onClick={triggerAllGenerations}
               disabled={!!generatingAllStatus}
               className="px-4 py-3 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
             >
               {generatingAllStatus ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} 
               {generatingAllStatus ? `Erstelle (${generatingAllStatus.current}/${generatingAllStatus.total})` : 'Fehlende Entwürfe erstellen'}
             </button>
             <button 
               type="button"
               onClick={printAll}
               className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-sm flex items-center gap-2 cursor-pointer"
             >
               <Printer size={14} /> Alle drucken
             </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
        <AlertCircle size={17} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="text-xs font-semibold leading-relaxed">
          Berichtsentwürfe können Fehler oder unpassende Schlussfolgerungen enthalten. Prüfen und bearbeiten Sie jeden Bericht fachlich, sprachlich und datenschutzrechtlich, bevor Sie ihn freigeben, drucken oder weitergeben.
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6">
         
         {/* Left Column: Config Panel & Student List */}
         <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            
            {/* Global Generator Settings */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Sliders size={14} />
                Generator-Konfiguration
              </h3>
              
              <div className="space-y-3.5">
                {/* Tonalität */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500">Tonalität</label>
                  <select 
                    aria-label="Tonalität des Berichts"
                    value={tonality} 
                    onChange={e => setTonality(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="wertschätzend">❤️ Pädagogisch wertschätzend</option>
                    <option value="sachlich">💼 Analytisch sachlich</option>
                    <option value="ressourcenorientiert">🌱 Ressourcen- & Stärkenfokus</option>
                    <option value="zukunftsgewandt">🚀 Zukunftsorientiert (Ausblick)</option>
                  </select>
                </div>

                {/* Struktur */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500">Aufbau / Gliederung</label>
                  <select 
                    aria-label="Aufbau und Gliederung des Berichts"
                    value={structure} 
                    onChange={e => setStructure(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="lehrplan">🇦🇹 Öster. Volksschul-Lehrplan</option>
                    <option value="standard">🎯 Stärken / Schwächen / Tipps</option>
                    <option value="foerderorientiert">📋 Förderorientiertes Profil</option>
                  </select>
                </div>

                {/* Ansprache */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500">Perspektive / Anrede</label>
                  <select 
                    aria-label="Perspektive und Anrede des Berichts"
                    value={pronounForm} 
                    onChange={e => setPronounForm(e.target.value as any)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500/10 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="sie_er">👤 Er/Sie-Form (3. Person)</option>
                    <option value="du_direkt">👋 Direkte Ansprache ("Du")</option>
                    <option value="formal_eltern">👨‍👩‍👧‍👦 An die Eltern gerichtet</option>
                  </select>
                </div>

                {/* Data Switches */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-400 block mb-1">Datenquellen einbeziehen</span>
                  
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeGrades} 
                      onChange={e => setIncludeGrades(e.target.checked)} 
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    Noten & fachliche Leistungen
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeBadges} 
                      onChange={e => setIncludeBadges(e.target.checked)} 
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    Gesammelte Badges & Lob
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={includeObservations} 
                      onChange={e => setIncludeObservations(e.target.checked)} 
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                    />
                    Einträge aus dem Schülerjournal
                  </label>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 min-h-[300px] flex flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-4 border-b border-slate-100 font-black uppercase text-[0.75rem] leading-tight tracking-widest text-slate-400 bg-slate-50">
                  Schülerinnen & Schüler
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
                  {students.map(s => {
                     const hasReport = !!berichte[s.id];
                     const isSelected = selectedStudent === s.id;
                     const status = reviewStatus[s.id] || 'offen';
                     
                     return (
                       <button 
                         key={s.id}
                         type="button"
                         aria-pressed={isSelected}
                         onClick={() => {
                           setSelectedStudent(s.id);
                           setActiveTab('bericht');
                           setPersonalWish('');
                         }}
                         className={`w-full text-left p-3 rounded-2xl transition-all flex items-center justify-between ${
                           isSelected 
                             ? 'bg-slate-950 text-white shadow-md' 
                             : 'hover:bg-slate-50 text-slate-700'
                         }`}
                       >
                         <div className="flex flex-col min-w-0">
                           <span className="font-bold text-[0.875rem] leading-snug truncate">
                             {s.vorname} {s.nachname}
                           </span>
                           {hasReport && (
                             <span className={`text-[0.625rem] font-black uppercase mt-0.5 ${
                               isSelected ? 'text-slate-400' : 'text-slate-400'
                             }`}>
                               {status === 'freigegeben' && '💚 Freigegeben'}
                               {status === 'nacharbeiten' && '💛 Nachbearbeiten'}
                               {status === 'offen' && '🔘 Entwurf bereit'}
                             </span>
                           )}
                         </div>
                         
                         {hasReport ? (
                            <CheckCircle2 size={16} className={isSelected ? 'text-emerald-400 shrink-0' : 'text-emerald-500 shrink-0'} />
                         ) : (
                            <span className={`text-[0.625rem] uppercase font-black tracking-widest shrink-0 ${isSelected ? 'text-slate-400' : 'text-slate-300'}`}>
                              Fehlt
                            </span>
                         )}
                       </button>
                     );
                  })}
               </div>
            </div>
         </div>

         {/* Right Side: Report View & Visualizers */}
         <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col p-6 lg:p-8 relative min-w-0">
            {selectedStudent ? (() => {
               const s = students.find(x => x.id === selectedStudent)!;
               const b = berichte[selectedStudent];

               if (isGenerating) {
                  return (
                    <div className="flex-1 flex items-center justify-center flex-col text-slate-400">
                      <Loader2 size={32} className="animate-spin mb-4 text-slate-700" />
                      <p className="font-bold text-slate-700">Jahresbericht wird als Entwurf erstellt...</p>
                      <p className="text-xs text-slate-400 mt-2 max-w-sm text-center">
                        Die ausgewählten Datenquellen werden für den Entwurf ausgewertet. Das dauert einen kurzen Moment.
                      </p>
                    </div>
                  );
               }

               if (!b) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto">
                      <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                        <Wand2 size={32} className="text-slate-400" />
                      </div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">Noch kein Bericht für {s.vorname}</h3>
                      <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                        Es wurde noch kein Abschlussbericht generiert. Der Generator verwendet Ihre konfigurierten Tonalitäts-, Struktur- und Daten-Auswahlkriterien auf der linken Seite.
                      </p>

                      {/* Personal Wish field prior to generating */}
                      <div className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl mb-6 text-left flex flex-col gap-2">
                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                          <Heart size={12} className="text-rose-500" />
                          Persönlicher Wunsch oder Notiz für {s.vorname} (Optional)
                        </span>
                        <input
                          type="text"
                          aria-label={`Persönlicher Wunsch oder Notiz für ${s.vorname}`}
                          value={personalWish}
                          onChange={e => setPersonalWish(e.target.value)}
                          placeholder="z.B. Alles Gute für den Übertritt ins Gymnasium; oder: weiter so fröhlich bleiben!"
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 text-slate-800"
                        />
                      </div>

                      <button 
                        onClick={() => triggerSingleGeneration(selectedStudent)}
                        className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black tracking-wider uppercase text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                      >
                         <Sparkles size={14} /> Berichtsentwurf erstellen
                      </button>
                    </div>
                  );
               }

               const isEditing = editMode === selectedStudent;

               return (
                 <div className="flex-1 flex flex-col h-full min-w-0">
                    
                    {/* Active Student Header Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100 mb-6">
                       <div>
                         <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400 block mb-1">
                           Ausgewählter Schülerbericht
                         </span>
                         <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                           {s.vorname} {s.nachname}
                           <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 p-1 px-2 rounded-lg">
                             Stufe {s.niveau || 'VS'}
                           </span>
                         </h2>
                         <p className="text-xs font-semibold text-slate-400 mt-1">
                           Generiert am {new Date(b.generiert).toLocaleDateString('de-DE')} um {new Date(b.generiert).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                         </p>
                       </div>
                       
                       {/* Action Row */}
                       <div className="flex items-center gap-2 flex-wrap">
                          {isEditing ? (
                             <button 
                               onClick={saveEdit} 
                               className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                             >
                               <Save size={14} /> Sichern
                             </button>
                          ) : (
                             <>
                              <button 
                                onClick={() => startEdit(selectedStudent, b.inhalt)} 
                                aria-label="Berichtstext bearbeiten"
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all cursor-pointer"
                                title="Text manuell bearbeiten"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => printSingle(selectedStudent)} 
                                aria-label="Bericht drucken"
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all cursor-pointer"
                                title="Bericht im A4-Briefkopf drucken"
                              >
                                <Printer size={16} />
                              </button>
                              <button 
                                onClick={() => triggerSingleGeneration(selectedStudent)} 
                                aria-label="Berichtsentwurf neu erstellen"
                                className="p-2.5 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100 rounded-xl transition-all cursor-pointer animate-pulse-slow"
                                title="Neu generieren mit aktuellen Filter-Optionen"
                              >
                                <Wand2 size={16} />
                              </button>
                              <button 
                                onClick={() => setShowWrapped(selectedStudent)} 
                                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:from-fuchsia-500 hover:to-purple-500 rounded-xl font-black uppercase tracking-widest text-[0.6875rem] flex items-center gap-2 shadow-sm transition-all hover:scale-103 cursor-pointer"
                                title="Jahresrückblick für Schüler starten"
                              >
                                <Gift size={14} /> Wrapped
                              </button>
                             </>
                          )}
                       </div>
                    </div>

                    {/* Navigation Tabs (Document vs. Competence Scorecard) */}
                    <div className="flex border-b border-slate-100 mb-6 gap-2">
                      <button 
                        type="button"
                        aria-pressed={activeTab === 'bericht'}
                        onClick={() => setActiveTab('bericht')}
                        className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                          activeTab === 'bericht' 
                            ? 'border-slate-900 text-slate-900' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        📄 Berichts-Entwurf
                      </button>
                      <button 
                        type="button"
                        aria-pressed={activeTab === 'radar'}
                        onClick={() => setActiveTab('radar')}
                        className={`py-2 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                          activeTab === 'radar' 
                            ? 'border-slate-900 text-slate-900' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        📊 Kompetenz-Scorecard
                      </button>
                    </div>

                    {/* Tab 1: Rendered Document / Edit Mode */}
                    {activeTab === 'bericht' && (
                      <div className="flex-1 flex flex-col min-h-0 space-y-6">
                        
                        <div className="flex-1 min-h-[250px] overflow-hidden flex flex-col bg-slate-50/50 rounded-2xl border border-slate-150 p-4">
                           {isEditing ? (
                              <textarea 
                                aria-label="Berichtstext bearbeiten"
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full flex-1 p-4 bg-yellow-50/30 border border-yellow-100 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/10 text-slate-800 text-[0.9rem] leading-relaxed font-semibold font-mono"
                              />
                           ) : (
                              <div className="flex-1 overflow-y-auto no-scrollbar pr-2 text-[0.9375rem] leading-relaxed text-slate-700 markdown-body bg-white p-6 rounded-xl border border-slate-150/50 shadow-inner">
                                <Markdown>{b.inhalt}</Markdown>
                              </div>
                           )}
                        </div>

                        {/* KI-Refine Controls (Only in read mode) */}
                        {!isEditing && (
                          <div className="bg-slate-50 rounded-2xl border border-slate-150 p-5 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[0.6875rem] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                <Sparkles size={14} className="text-amber-500" />
                                KI-Feinschliff & Korrektur-Assistent
                              </span>
                              <span className="text-[0.625rem] text-slate-400 font-bold">Ändert oder schärft den vorigen Entwurf</span>
                            </div>

                            {/* Preset Command Pills */}
                            <div className="flex flex-wrap gap-1.5">
                              <button 
                                onClick={() => handleRefine(selectedStudent, 'Formuliere den Bericht noch etwas wertschätzender und positiver.')}
                                disabled={isRefining}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-amber-300 rounded-lg text-[0.6875rem] font-semibold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                              >
                                💕 Mehr Herzlichkeit
                              </button>
                              <button 
                                onClick={() => handleRefine(selectedStudent, 'Schreibe den Bericht kompakter, halte dich strenger an die Gliederungspunkte.')}
                                disabled={isRefining}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-amber-300 rounded-lg text-[0.6875rem] font-semibold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                              >
                                🎯 Kürzer & Fokussierter
                              </button>
                              <button 
                                onClick={() => handleRefine(selectedStudent, 'Korrigiere eventuelle Tippfehler und optimiere den österreichischen Sprachstil.')}
                                disabled={isRefining}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-amber-300 rounded-lg text-[0.6875rem] font-semibold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                              >
                                ✍️ Sprachschliff / Orthografie
                              </button>
                              <button 
                                onClick={() => handleRefine(selectedStudent, 'Füge am Ende einen sehr schönen, persönlichen Zukunftswunsch der Lehrkraft für die weiterführende Schule ein.')}
                                disabled={isRefining}
                                className="px-2.5 py-1 bg-white border border-slate-200 hover:border-amber-300 rounded-lg text-[0.6875rem] font-semibold text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                              >
                                🌟 Zukunfts-Segen ergänzen
                              </button>
                            </div>

                            {/* Refinement input */}
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                aria-label="Eigene Anweisung für die Überarbeitung"
                                value={refinePrompt}
                                onChange={e => setRefinePrompt(e.target.value)}
                                placeholder="Eigene Anweisung, z.B. 'Hebe hervor, dass Samy große Fortschritte beim Lesen gemacht hat...'"
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-500/10 text-slate-800"
                                disabled={isRefining}
                              />
                              <button
                                onClick={() => handleRefine(selectedStudent)}
                                disabled={isRefining || !refinePrompt.trim()}
                                className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                              >
                                {isRefining ? <Loader2 className="animate-spin" size={12} /> : <Wand2 size={12} />}
                                Anwenden
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Approval State controls */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <span className="text-xs font-bold text-slate-400">Freigabestatus dieses Berichts:</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              aria-pressed={(reviewStatus[selectedStudent] || 'offen') === 'freigegeben'}
                              onClick={() => handleSetReview(selectedStudent, 'freigegeben')}
                              className={`p-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                (reviewStatus[selectedStudent] || 'offen') === 'freigegeben'
                                  ? 'bg-emerald-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              ✓ Freigeben (Fertig)
                            </button>
                            <button
                              type="button"
                              aria-pressed={(reviewStatus[selectedStudent] || 'offen') === 'nacharbeiten'}
                              onClick={() => handleSetReview(selectedStudent, 'nacharbeiten')}
                              className={`p-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                (reviewStatus[selectedStudent] || 'offen') === 'nacharbeiten'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              ⚠ Nacharbeiten / Skizze
                            </button>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* Tab 2: Competence Scorecard Visualizer */}
                    {activeTab === 'radar' && competences && (
                      <div className="flex-1 overflow-y-auto pr-2 space-y-6 animate-fade-in">
                        
                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                          <h4 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-1">
                            <TrendingUp size={16} className="text-indigo-500" />
                            Kompetenzprofil für {s.vorname}
                          </h4>
                          <p className="text-xs font-bold text-slate-400 leading-normal">
                            Dieses Orientierungsprofil wird aus den ausgewählten Einträgen, Noten, Badges und KEL-Zielen abgeleitet. Es ist keine standardisierte Kompetenzmessung und muss pädagogisch eingeordnet werden.
                          </p>
                        </div>

                        {/* Visual score matrix */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Linguistisch */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-slate-400">Sprachen & Lesen</span>
                              <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{competences.de === null ? '—' : `${competences.de}%`}</span>
                            </div>
                            <span className="text-sm font-black text-slate-800">Linguistische Kompetenz</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${competences.de ?? 0}%` }} />
                            </div>
                            <p className="text-[0.6875rem] text-slate-500 leading-normal mt-1 italic">
                              Deutsch, Lesen und Artikulation basierend auf Noten und KEL-Einschätzungen.
                            </p>
                          </div>

                          {/* Mathematisch */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-slate-400">Logik & Zahlen</span>
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">{competences.ma === null ? '—' : `${competences.ma}%`}</span>
                            </div>
                            <span className="text-sm font-black text-slate-800">Mathematische Kompetenz</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${competences.ma ?? 0}%` }} />
                            </div>
                            <p className="text-[0.6875rem] text-slate-500 leading-normal mt-1 italic">
                              Rechnen, Zehnerübergang und mathematische Logik basierend auf Leistungstests.
                            </p>
                          </div>

                          {/* Sozialkompetenz */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-slate-400">Teamwork & Empathie</span>
                              <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">{competences.so === null ? '—' : `${competences.so}%`}</span>
                            </div>
                            <span className="text-sm font-black text-slate-800">Sozialkompetenz</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-rose-500 h-full rounded-full transition-all duration-500" style={{ width: `${competences.so ?? 0}%` }} />
                            </div>
                            <p className="text-[0.6875rem] text-slate-500 leading-normal mt-1 italic">
                              Hilfsbereitschaft, Regelverhalten und Zusammenarbeit aus dokumentierten KEL-Einschätzungen.
                            </p>
                          </div>

                          {/* Selbstorganisation / Fokus */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-slate-400">Ausdauer & Ordnung</span>
                              <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{competences.sf === null ? '—' : `${competences.sf}%`}</span>
                            </div>
                            <span className="text-sm font-black text-slate-800">Selbstkompetenz & Fokus</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${competences.sf ?? 0}%` }} />
                            </div>
                            <p className="text-[0.6875rem] text-slate-500 leading-normal mt-1 italic">
                              Arbeitstempo, Organisation des Arbeitsplatzes und Konzentrationsleistung.
                            </p>
                          </div>

                          {/* Kreativität & Neugier */}
                          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2 md:col-span-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase text-slate-400">Gestalten & Neugier</span>
                              <span className="text-xs font-black text-fuchsia-600 bg-fuchsia-50 px-2 py-0.5 rounded-lg">{competences.kr === null ? '—' : `${competences.kr}%`}</span>
                            </div>
                            <span className="text-sm font-black text-slate-800">Kreativität & Eigeninitiative</span>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
                              <div className="bg-fuchsia-500 h-full rounded-full transition-all duration-500" style={{ width: `${competences.kr ?? 0}%` }} />
                            </div>
                            <p className="text-[0.6875rem] text-slate-500 leading-normal mt-1 italic">
                              Eigene kreative Lösungswege, Neugier, musisch-kreatives Engagement.
                            </p>
                          </div>

                        </div>

                        {/* Badges / Auszeichnungen list */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                            <Award size={14} className="text-amber-500" />
                            Auszeichnungen & Badges von {s.vorname}
                          </h4>
                          {s.badges && s.badges.length > 0 ? (
                            <div className="flex flex-wrap gap-2.5">
                              {s.badges.map((b: any) => (
                                <div key={b.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-1.5 px-3 rounded-xl hover:scale-103 transition-transform" title={`Verliehen am ${new Date(b.date).toLocaleDateString('de-DE')}`}>
                                  <span className="text-lg">{b.icon}</span>
                                  <span className="text-xs font-bold text-slate-700">{b.name}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs italic text-slate-400">Noch keine Auszeichnungen in dieser Akte hinterlegt.</p>
                          )}
                        </div>

                      </div>
                    )}

                 </div>
               );
            })() : (
               <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                 <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                   <FileText size={32} className="text-slate-200" />
                 </div>
                 <h3 className="text-lg font-black text-slate-800">Kein Kind ausgewählt</h3>
                 <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                   Wählen Sie links ein Kind aus, um dessen Jahresbericht zu verwalten, zu generieren oder zu optimieren.
                 </p>
               </div>
            )}
         </div>
      </div>
      
      {showWrapped && (
        <SchuljahrWrapped 
          studentId={showWrapped} 
          onClose={() => setShowWrapped(null)} 
        />
      )}
    </div>
  );
}
