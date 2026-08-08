
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { ChatEntry, Message } from '../types';
import { 
  Send, Bot, Sparkles, User, RefreshCw, X, 
  Mail, Layers, FileEdit, ClipboardList, 
  MessageSquare, ChevronRight, Wand2, Copy, Check, RotateCcw,
  Layout, Target, Save, PenTool, BookOpen, Scale, Info, Archive,
  Shield, Clock, Search, Zap, Waves, ArrowRight, Heart, Camera, UploadCloud, FileText, Activity, LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmailAssistant from './EmailAssistant';
import Differentiation from './Differentiation';
import VerbalAssessment from './VerbalAssessment';
import MaterialOptimizer from './MaterialOptimizer';
import WorksheetGenerator from './WorksheetGenerator';
import ScheduleOptimizer from './ScheduleOptimizer';
import { StationenbetriebManager } from './StationenbetriebManager';
import { askAI } from '../services/aiService';
import { KI_SYSTEM_PROMPTS } from '../kiSystemPrompts';
import { useMaterialLibrary, calculateStorageSize } from './Materialbibliothek';
import { FAECHER_ALLE } from '../constants';
import { LEHRPLAN_VS_2023 } from '../lehrplan';
import Markdown from 'react-markdown';

const EXAMPLE_PROMPTS: Record<string, { text: string; icon: any }[]> = {
  'ki-helfer': [
    { text: "Methode für Einstieg in den Wasserkreislauf für 4. Klasse", icon: BookOpen },
    { text: "Wie differenziere ich eine Lesestunde für DaZ-Kinder?", icon: Layers },
    { text: "Spielerische Übung für die Stille-Wiederholung", icon: MessageSquare },
    { text: "Gruppenarbeit mit klaren Rollen für eine 4. Klasse", icon: Target },
    { text: "5-Minuten-Aktivierungsspiel für regnerische Pausen", icon: Activity },
    { text: "Unterrichtsidee zum Thema 'Demokratie & Klassensprecher'", icon: User },
    { text: "Einstiegs-Rätsel für eine Geometrie-Stunde (Körper & Formen)", icon: Sparkles },
    { text: "Fördertipps für Kinder mit Rechenschwierigkeiten (Zehnerübergang)", icon: Zap },
    { text: "Kreative Schreibaufgabe für die 3. Klasse: Abenteuergeschichte", icon: PenTool },
    { text: "Wie erkläre ich den Unterschied zwischen Nadel- & Laubwald?", icon: Waves },
  ],
  'ki-lernziele': [
    { text: "Welche Ziele aus dem Deutsch-Lehrplan fehlen uns noch in der 3. Klasse?", icon: Target },
    { text: "Schlage mir Stationen vor, um die offenen Lese-Ziele zu erarbeiten.", icon: Layers },
    { text: "Was sind sinnvolle Lernziele für ein Kind mit SPF nächste Woche?", icon: Target },
    { text: "Bitte analysiere den aktuellen Klassen-Fortschritt in Sachunterricht.", icon: Sparkles },
  ],
  'ki-wissen': [
    { text: "Was sind die Bildungsstandards für Mathematik 4. Klasse?", icon: BookOpen },
    { text: "Wie funktioniert die Beurteilung mit MIKA-D?", icon: Scale },
    { text: "Was ist der Unterschied zwischen formativer und summativer Bewertung?", icon: Info },
    { text: "Welche Methoden zur Lese-Diagnostik gibt es?", icon: Search },
  ],
  'ki-recht': [
    { text: "Was muss ich bei einer schriftlichen Mitteilung beachten?", icon: Scale },
    { text: "Welche Regeln gelten für die Aufsichtspflicht im Pausenhof?", icon: Shield },
    { text: "Was sind die rechtlichen Vorgaben für KEL-Gespräche?", icon: Scale },
    { text: "Wer entscheidet bei einem Förderbedarf-Wechsel?", icon: User },
  ],
  'ki-reflexion': [
    { text: "Hilf mir, eine schwierige Stunde von heute zu reflektieren", icon: MessageSquare },
    { text: "Wie kann ich mit einem konflikthaften Elterngespräch umgehen?", icon: User },
    { text: "Was sollte ich diese Woche anders machen?", icon: Target },
    { text: "Selbstreflexion zu meiner Unterrichtssprache", icon: Wand2 },
  ],
  'ki-elternbrief': [
    { text: "Information für Eltern über den Wald-Ausflug", icon: Mail },
    { text: "Rückmeldung an Eltern zu Verhalten im Unterricht", icon: Mail },
    { text: "Elternbrief zur Ankündigung der nächsten Schularbeit", icon: Mail },
    { text: "Tipps für Eltern zur Förderung des Kindes zuhause", icon: Mail },
  ],
  'ki-differenzierung': [
    { text: "Sachtext über den Wasserkreislauf für DaZ-Schüler vereinfachen", icon: Layers },
    { text: "Matheaufgabe für Kinder mit erhöhtem Förderbedarf (SPF) anpassen", icon: Target },
    { text: "Transferaufgaben zur Begabtenförderung erstellen", icon: Layers },
    { text: "Visuelle Lösungs-Schritte für lese-schwache Kinder generieren", icon: Zap },
  ],
  'ki-beurteilung': [
    { text: "Verbale Beurteilung für ein Kind mit Lernfortschritt in Lesen", icon: FileEdit },
    { text: "Wie formuliere ich Förderhinweise in einem Zeugnis?", icon: Save },
    { text: "Bewertung einer Projektarbeit in Sachunterricht", icon: ClipboardList },
    { text: "Kommentar zur Mitarbeit eines stillen Kindes", icon: MessageSquare },
  ],
  'ki-korrektur': [
    { text: "Korrektur eines Aufsatzes zum Wasserkreislauf", icon: Check },
    { text: "Hilf mir, einen Mathematik-Test zu erstellen", icon: ClipboardList },
    { text: "Bewertungsraster für eine Buchpräsentation", icon: Layout },
    { text: "Häufige Rechtschreibfehler in 4. Klasse", icon: Search },
  ],
  'ki-arbeitsblatt': [
    { text: "Rechenpäckchen Einmaleins mit 6, Stufe 2, 10 Aufgaben", icon: FileEdit },
    { text: "Lückentext zum Thema Waldtiere, Sachunterricht", icon: Layers },
    { text: "Satzglieder bestimmen, Deutsch 4. Klasse, mittel", icon: Target },
  ],
  'ki-foto-korrektur': [
    { text: "Fokus auf Rechtschreibung und Grammatik", icon: Search },
    { text: "Stärkenorientiertes Feedback zum Textaufbau", icon: Heart },
    { text: "Fördertipp für Ausdruck und Stil", icon: Wand2 },
  ],
  'ki-wochenplan': [
    { text: "Wochenplan KW 23, Mathe S.45 und Deutsch Lernwörter", icon: ClipboardList },
    { text: "Freiarbeitsplan mit Basis und Fordernd Differenzierung", icon: Layers },
    { text: "Stationenbetrieb zum Thema Bauernhof, 2. Stufe", icon: BookOpen },
  ],
};

const getRelativeTime = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / (1000 * 60));
  if (mins < 60) return 'Gerade eben';
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 0) return 'Heute';
  if (days === 1) return 'Gestern';
  return `vor ${days} Tagen`;
};

interface AISaveButtonProps {
  content: string;
  userPrompt?: string;
  type: 'stundenentwurf' | 'elternbrief' | 'notiz' | 'reflexion' | 'beurteilung';
  onSave?: () => void;
}

function AISaveButton({ content, userPrompt, type, onSave }: AISaveButtonProps) {
  const { app } = useApp();
  const { addMaterialFromAI } = useMaterialLibrary();
  const [isSaved, setIsSaved] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [fach, setFach] = useState('');
  const [stufe, setStufe] = useState<number>(app.stufe || 1);

  const storageMB = calculateStorageSize(app.materialien || []);
  const isStorageFull = storageMB > 4.8;

  const handleSave = () => {
    if (isStorageFull) return;

    // Intelligent metadata extraction
    const lines = content.trim().split('\n');
    const firstLine = lines[0].replace(/[#*]/g, '').trim();
    
    let title = '';
    if (userPrompt && userPrompt.length > 5) {
      title = userPrompt.substring(0, 40) + (userPrompt.length > 40 ? '...' : '');
    } else {
      title = firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
    }
    
    // Type mapping exactly as requested
    let materialTyp: any = 'sonstiges';
    if (type === 'elternbrief') materialTyp = 'elternbrief';
    else if (type === 'stundenentwurf') materialTyp = 'stundenentwurf';
    else if (type === 'reflexion') materialTyp = 'notiz';
    else if (type === 'beurteilung') materialTyp = 'beurteilung';
    
    addMaterialFromAI({
      titel: title || 'KI Generiertes Material',
      beschreibung: `Generiert am ${new Date().toLocaleDateString('de-DE')} via KI-Helfer.`,
      typ: materialTyp,
      inhaltText: content,
      faecher: fach ? [fach] : [],
      schulstufen: [stufe],
      tags: ['KI', type],
      kiGeneriert: true,
      erstelltAm: new Date().toISOString()
    }, 'KI-Helfer');

    setIsSaved(true);
    setShowOverlay(false);
    if (onSave) onSave();
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (isStorageFull) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-[0.625rem] font-bold text-rose-500 bg-rose-50 rounded-xl border border-rose-100">
        <Info size={12} />
        Speicher voll
      </div>
    );
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setShowOverlay(true)}
        disabled={isSaved}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[0.625rem] font-black uppercase tracking-widest transition-all ${isSaved ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'}`}
      >
        {isSaved ? <Check size={12} /> : <Save size={12} />}
        {isSaved ? 'In Bibliothek abgelegt' : 'In Mediathek speichern'}
      </button>

      <AnimatePresence>
        {showOverlay && (
          <>
            <div className="fixed inset-0 z-[300]" onClick={() => setShowOverlay(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="absolute bottom-full right-0 mb-2 p-5 bg-white rounded-2xl shadow-md border border-slate-200 w-72 z-[301] text-slate-900"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Archive size={16} />
                </div>
                <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-400">Material kategorisieren</div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 ml-1">Fach wählen</label>
                  <select 
                    value={fach}
                    onChange={(e) => setFach(e.target.value)}
                    className="w-full p-3 bg-slate-50 rounded-xl text-[0.75rem] leading-tight font-bold outline-none border border-slate-100 focus:border-indigo-500 transition-all appearance-none"
                  >
                    <option value="">Allgemein / Kein Fach</option>
                    {FAECHER_ALLE.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[0.625rem] font-black uppercase text-slate-400 ml-1">Schulstufe</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map(s => (
                      <button
                        key={s}
                        onClick={() => setStufe(s)}
                        className={`py-2 rounded-xl text-[0.625rem] font-black border transition-all ${stufe === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                      >
                        {s}.
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={handleSave}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-[0.625rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all mt-2"
                >
                  Endgültig speichern
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

type AiTab = 'ki-helfer' | 'ki-paedagogik' | 'ki-wissen' | 'ki-recht' | 'ki-elternbrief' | 'ki-differenzierung' | 'ki-beurteilung' | 'ki-korrektur' | 'ki-reflexion' | 'ki-arbeitsblatt' | 'ki-foto-korrektur' | 'ki-wochenplan' | 'ki-stundenplan-check' | 'ki-lernziele' | 'ki-stationenbetrieb';

export default function AIAssistant() {
  const { app, setApp, setPage } = useApp();
  const zoomLevel = app?.settings?.zoomLevel || 'standard';
  const isCompact = zoomLevel === 'compact';
  const isLarge = zoomLevel === 'large';
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<AiTab>('ki-helfer');
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const processedPromptTimestampRef = useRef<number>(0);

  // Form States for new modes
  const [abFach, setAbFach] = useState('Deutsch');
  const [abStufe, setAbStufe] = useState(app.stufe || 1);
  const [abTyp, setAbTyp] = useState('Lückentext');
  const [abThema, setAbThema] = useState('');
  const [abSchwierigkeit, setAbSchwierigkeit] = useState('Mittel');
  const [abAnzahl, setAbAnzahl] = useState(10);
  
  // Update available types when subject changes
  useEffect(() => {
    if (abFach === 'Deutsch') {
      setAbTyp('Lückentext');
    } else if (abFach === 'Mathematik') {
      setAbTyp('Diagnostischer Kurztest');
    } else {
      setAbTyp('Wissensfragen');
    }
    setAbThema('');
  }, [abFach]);

  // Derived available lehrplan topics
  const availableLehrplanTopics = React.useMemo(() => {
    try {
      const kompetenzen = LEHRPLAN_VS_2023[abFach]?.[abStufe] || [];
      return kompetenzen.flatMap((k: any) => k.anwendungsbereiche.map((a: any) => a.titel));
    } catch {
      return [];
    }
  }, [abFach, abStufe]);

  const [fkStufe, setFkStufe] = useState(app.stufe || 1);
  const [fkImageBase64, setFkImageBase64] = useState<{data: string, mimeType: string} | null>(null);
  const [fkImagePreview, setFkImagePreview] = useState<string | null>(null);
  const [fkFokus, setFkFokus] = useState({rechtschreibung: true, grammatik: true, ausdruck: true, aufbau: true, inhalt: true});

  const [wpStufe, setWpStufe] = useState(app.stufe || 1);
  const [wpZeitraum, setWpZeitraum] = useState('');
  const [wpPflicht, setWpPflicht] = useState('');
  const [wpWahl, setWpWahl] = useState('');
  const [wpDiff, setWpDiff] = useState({basis: true, standard: true, fordernd: true});
  
  // Local messages for the current session - we'll sync this with app.aiChats on send/load
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  
  // Allow switching back to specialized tools for certain modes
  const [showGuidedTool, setShowGuidedTool] = useState(false);

  useEffect(() => {
    if (app.currentPage.startsWith('ki-')) {
      const tab = app.currentPage === 'ki-paedagogik' ? 'ki-helfer' : app.currentPage as AiTab;
      setActiveTab(tab);
      // Reset chat for now when switching tabs via page navigation
      setActiveMessages([]);
      setActiveChatId(null);
      // Decide if we should show guided tool by default (original behavior)
      const isSpecialized = ['ki-elternbrief', 'ki-differenzierung', 'ki-beurteilung', 'ki-korrektur', 'ki-stundenplan-check', 'ki-stationenbetrieb'].includes(tab);
      setShowGuidedTool(isSpecialized);
    }
  }, [app.currentPage]);
  
  // Also reset when activeTab changes manually
  useEffect(() => {
    setActiveMessages([]);
    setActiveChatId(null);
    const isSpecialized = ['ki-elternbrief', 'ki-differenzierung', 'ki-beurteilung', 'ki-korrektur', 'ki-stundenplan-check', 'ki-stationenbetrieb'].includes(activeTab);
    setShowGuidedTool(isSpecialized);
  }, [activeTab]);
  
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Keep sidebar expanded unless collapsed manually by user

  const [input, setInp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentModusId = activeTab;
  const messages = activeMessages;

  useEffect(() => {
    const syncScrollPosition = () => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = messages.length > 0
          ? scrollRef.current.scrollHeight
          : 0;
      }
    };
    syncScrollPosition();
    const timer = setTimeout(syncScrollPosition, 100);
    return () => clearTimeout(timer);
  }, [messages, isLoading, activeTab]);

  const saveChatHistory = (tab: AiTab, msgList: Message[], chatId: string | null, firstQuestion?: string) => {
    const chatEntries = [ ...(app.aiChats?.[tab] || []) ];
    let targetId = chatId;

    if (!targetId) {
      targetId = Math.random().toString(36).substring(7);
      setActiveChatId(targetId);
      const newEntry: ChatEntry = {
        id: targetId,
        timestamp: Date.now(),
        frage: firstQuestion || msgList[0]?.content || 'Neue Unterhaltung',
        nachrichten: msgList
      };
      // Keep only last 20 total, but user only sees 5 in preview
      const updatedEntries = [newEntry, ...chatEntries].slice(0, 20);
      setApp(prev => ({
        ...prev,
        aiChats: {
          ...(prev.aiChats || {}),
          [tab]: updatedEntries
        }
      }));
    } else {
      const idx = chatEntries.findIndex(c => c.id === targetId);
      if (idx !== -1) {
        chatEntries[idx] = {
          ...chatEntries[idx],
          timestamp: Date.now(),
          nachrichten: msgList
        };
        // Move to top
        const updatedEntries = [chatEntries[idx], ...chatEntries.filter((_, i) => i !== idx)];
        setApp(prev => ({
           ...prev,
           aiChats: {
             ...(prev.aiChats || {}),
             [tab]: updatedEntries
           }
        }));
      }
    }
  };

  const handleSend = async (manualText?: string, manualImageBase64?: {data: string, mimeType: string} | null) => {
    const userMsg = (manualText || input).trim();
    if (!userMsg || isLoading) return;
    
    const currentTab = activeTab;
    const modusId = currentTab;
    
    if (!manualText) setInp('');
    
    let contextStr = '';
    if (modusId === 'ki-lernziele' && activeMessages.length === 0) {
      const students = app.schueler || [];
      const trackerDB = app.lernzielTracker || {};
      
      let classProgress = '';
      Object.keys(trackerDB).forEach(fach => {
        const goals = trackerDB[fach];
        classProgress += `\nFach ${fach}:\n`;
        Object.keys(goals).forEach(goalId => {
          const g = goals[goalId];
          if (g.abgehakt) {
             classProgress += `- Erreicht: ${g.text}\n`;
          } else {
             classProgress += `- Offen: ${g.text}\n`;
          }
        });
      });
      
      let studentProgressStr = '';
      students.forEach(s => {
        const savedEval = localStorage.getItem(`student_lernziele_${s.id}`);
        if (savedEval) {
           try {
             const evalData = JSON.parse(savedEval);
             let count1 = 0, count2 = 0, count3 = 0;
             Object.values(evalData).forEach(val => {
               if (val === 1) count1++;
               if (val === 2) count2++;
               if (val === 3) count3++;
             });
             studentProgressStr += `${s.vorname}: ${count1} voll erreicht, ${count2} tw. erreicht, ${count3} minimal.\n`;
           } catch (e) {
             // Ignore error
           }
        }
      });
      
      contextStr = `\n\n[SYSTEM: INTERNER KONTEXT]
Aktuelle Ziele im Klassen-Tracker:
${classProgress || 'Keine Ziele definiert.'}

Einschätzungen der Klasse (Oberau-Skalen-Daten):
${studentProgressStr || 'Keine Schülerdaten.'}
`;
    }

    // Convert imageBase64 back to a user-friendly string tag in the chat message
    let displayMsg = userMsg;
    if (manualImageBase64) {
      displayMsg = `[Bild hochgeladen] ${displayMsg}`.trim();
    }
    
    const newMessages: Message[] = [...activeMessages, { role: 'user', content: displayMsg }];
    setActiveMessages(newMessages);
    setIsLoading(true);

    try {
      const text = await askAI(modusId, userMsg + contextStr, activeMessages, manualImageBase64 || undefined);
      const responseMessages: Message[] = [...newMessages, { role: 'ai', content: text || 'Keine Antwort erhalten.' }];
      setActiveMessages(responseMessages);
      saveChatHistory(currentTab, responseMessages, activeChatId, userMsg);
    } catch (err) {
      console.error(err);
      showToast('Verbindung zur KI fehlgeschlagen.', 'error');
      const errorMsg: Message = { role: 'ai', content: 'Ups, da gab es ein Problem mit der Verbindung. Bitte prüfe deinen API-Key.' };
      setActiveMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Synchronized Remote AI Prompt Listener from mobile companion devices
  useEffect(() => {
    const remotePrompt = app.boardSettings?.activeAIPrompt;
    if (remotePrompt && remotePrompt.timestamp && remotePrompt.timestamp > processedPromptTimestampRef.current) {
      processedPromptTimestampRef.current = remotePrompt.timestamp;
      console.log("[Remote AI] Processing sync prompt from mobile phone:", remotePrompt.text);
      
      // Force loading 'ki-helfer' standard chatbot focus and clear guide overlays on big wall
      setActiveTab('ki-helfer');
      setShowGuidedTool(false);
      
      // Execute standard answer generation trigger
      handleSend(remotePrompt.text);
    }
  }, [app.boardSettings?.activeAIPrompt]);

  const loadConversation = (entry: ChatEntry) => {
    setActiveMessages(entry.nachrichten);
    setActiveChatId(entry.id);
  };

  const tabs: { id: AiTab, label: string, icon: React.ReactNode, color: string, colorClass: string, bgClass: string, buttonColor: string, description: string, chat: boolean, category: 'advisor' | 'tool' }[] = [
    { id: 'ki-helfer', label: 'Pädagogik', icon: <Bot size={20} />, color: 'emerald', colorClass: 'text-emerald-500/70', bgClass: 'bg-emerald-600', buttonColor: '#059669', description: 'Methoden & Planung', chat: true, category: 'advisor' },
    { id: 'ki-wissen', label: 'Wissen', icon: <BookOpen size={20} />, color: 'amber', colorClass: 'text-amber-500/70', bgClass: 'bg-amber-600', buttonColor: '#d97706', description: 'Fachwissen & Sachkunde', chat: true, category: 'advisor' },
    { id: 'ki-recht', label: 'Schulrecht', icon: <Scale size={20} />, color: 'slate', colorClass: 'text-slate-500/70', bgClass: 'bg-slate-600', buttonColor: '#475569', description: 'Gesetze & Regeln', chat: true, category: 'advisor' },
    { id: 'ki-reflexion', label: 'Reflexion', icon: <MessageSquare size={20} />, color: 'teal', colorClass: 'text-teal-500/70', bgClass: 'bg-teal-600', buttonColor: '#0d9488', description: 'Feedback & Coaching', chat: true, category: 'advisor' },
    { id: 'ki-elternbrief', label: 'Elternkommunikation', icon: <Mail size={20} />, color: 'indigo', colorClass: 'text-indigo-500/70', bgClass: 'bg-indigo-600', buttonColor: '#4f46e5', description: 'Information & Förderung', chat: true, category: 'tool' },
    { id: 'ki-differenzierung', label: 'Differenzierung', icon: <Layers size={20} />, color: 'sky', colorClass: 'text-sky-500/70', bgClass: 'bg-sky-600', buttonColor: '#0284c7', description: 'DaZ & Förderbedarf', chat: true, category: 'tool' },
    { id: 'ki-beurteilung', label: 'Leistungsbeurteilung', icon: <FileEdit size={20} />, color: 'orange', colorClass: 'text-orange-500/70', bgClass: 'bg-orange-600', buttonColor: '#ea580c', description: 'Noten & KEL', chat: true, category: 'tool' },
    { id: 'ki-korrektur', label: 'KI Check', icon: <Check size={20} />, color: 'rose', colorClass: 'text-rose-500/70', bgClass: 'bg-rose-600', buttonColor: '#e11d48', description: 'Korrekturlesen', chat: true, category: 'tool' },
    { id: 'ki-arbeitsblatt', label: 'Arbeitsblätter', icon: <FileText size={20} />, color: 'cyan', colorClass: 'text-cyan-500/70', bgClass: 'bg-cyan-600', buttonColor: '#0891b2', description: 'Fördern & Talente', chat: true, category: 'tool' },
    { id: 'ki-foto-korrektur', label: 'Text-Korrektur (Foto)', icon: <Camera size={20} />, color: 'red', colorClass: 'text-red-500/70', bgClass: 'bg-red-500', buttonColor: '#ef4444', description: 'Schülertexte korrigieren', chat: true, category: 'tool' },
    { id: 'ki-wochenplan', label: 'Wochenplan-Arbeit', icon: <ClipboardList size={20} />, color: 'purple', colorClass: 'text-purple-500/70', bgClass: 'bg-purple-600', buttonColor: '#9333ea', description: 'Pläne & Freiarbeit', chat: true, category: 'tool' },
    { id: 'ki-lernziele', label: 'Lernziel-Wizard', icon: <Target size={20} />, color: 'blue', colorClass: 'text-blue-500/70', bgClass: 'bg-blue-600', buttonColor: '#2563eb', description: 'Planung & Empfehlungen', chat: true, category: 'tool' },
    { id: 'ki-stundenplan-check', label: 'Stundenplan Check', icon: <Activity size={20} />, color: 'emerald', colorClass: 'text-emerald-500/70', bgClass: 'bg-emerald-600', buttonColor: '#10b981', description: 'Wochenplanung prüfen', chat: false, category: 'tool' },
    { id: 'ki-stationenbetrieb', label: 'Lernwerkstätten', icon: <LayoutGrid size={20} />, color: 'indigo', colorClass: 'text-indigo-500/70', bgClass: 'bg-indigo-600', buttonColor: '#4f46e5', description: 'Lernwerkstatt & Stationenbetrieb', chat: false, category: 'tool' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div className={`ai-assistant-shell flex transition-all duration-300 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[200] bg-white h-screen w-full font-sans' : 'h-full w-full bg-white rounded-2xl border border-slate-200 shadow-sm'}`}>
      
      {/* Sidebar Navigation - Unified and Categorized */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-slate-100 shrink-0 no-print transition-all duration-300 ${
        isSidebarCollapsed 
          ? 'w-[5.5rem] items-center py-6 px-3' 
          : isCompact 
            ? `w-60 ${isFullScreen ? 'p-5' : 'p-4'}`
            : isLarge 
              ? `w-72 max-w-[275px] ${isFullScreen ? 'p-6' : 'p-5'}` 
              : `w-72 ${isFullScreen ? 'p-8' : 'p-6'}`
      }`}>
        <div className={`mb-6 w-full ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
              <Bot size={22} />
            </div>
            {!isSidebarCollapsed && (
              <div className="">
                <h2 className="text-[1.125rem] leading-normal font-black text-slate-900 tracking-tight whitespace-nowrap">ExpertISE-KI</h2>
                <div className="flex items-center gap-1.5 opacity-50 whitespace-nowrap">
                  <Sparkles size={10} className="text-indigo-500" />
                  <span className="text-[0.5rem] font-black uppercase tracking-widest text-slate-400 leading-none">Vernetzte Intelligenz</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className={`flex-1 overflow-y-auto no-scrollbar w-full ${isSidebarCollapsed ? 'space-y-6 flex flex-col items-center' : 'space-y-8 pr-2 -mr-2'}`}>
          {/* Advisor Category */}
          <div className="w-full">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 mb-3 px-2">
                <MessageSquare size={12} className="text-slate-300" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">Beratung & Coaching</span>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="w-full flex justify-center mb-3">
                 <div className="w-6 border-t border-slate-200"></div>
              </div>
            )}
            <div className={`space-y-1 ${isSidebarCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
              {tabs.filter(t => t.category === 'advisor').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowGuidedTool(false); }}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`group flex items-center p-2.5 rounded-xl transition-all border ${isSidebarCollapsed ? 'w-12 h-12 justify-center' : 'w-full gap-3'} ${
                    activeTab === tab.id && !showGuidedTool
                      ? 'shadow-sm font-bold' 
                      : 'bg-white border-transparent text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                  style={activeTab === tab.id && !showGuidedTool ? { backgroundColor: 'var(--accent, #10b981)', color: 'var(--btn-text, #ffffff)', borderColor: 'var(--accent, #10b981)' } : {}}
                >
                  <div className={`transition-transform duration-300 ${!isSidebarCollapsed ? 'group-hover:scale-110' : ''}`} style={activeTab === tab.id && !showGuidedTool ? { color: 'var(--btn-text, #ffffff)' } : {}}>
                    {React.cloneElement(tab.icon as React.ReactElement<any>, { size: isSidebarCollapsed ? 20 : 16 })}
                  </div>
                  {!isSidebarCollapsed && (
                    <>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[0.6875rem] font-bold tracking-tight" style={activeTab === tab.id && !showGuidedTool ? { color: 'var(--btn-text, #ffffff)' } : { color: '#334155' }}>
                          {tab.label}
                        </span>
                      </div>
                      {activeTab === tab.id && !showGuidedTool && (
                        <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm animate-pulse shrink-0" />
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tools Category */}
          <div className="w-full">
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-2 mb-3 px-2">
                <Wand2 size={12} className="text-slate-300" />
                <span className="text-[0.5625rem] font-black uppercase tracking-widest text-slate-300 whitespace-nowrap">Spezial-Werkzeuge</span>
              </div>
            )}
            {isSidebarCollapsed && (
              <div className="w-full flex justify-center mb-3">
                 <div className="w-6 border-t border-slate-200"></div>
              </div>
            )}
            <div className={`space-y-1 ${isSidebarCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
              {tabs.filter(t => t.category === 'tool').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setShowGuidedTool(true); }}
                  title={isSidebarCollapsed ? tab.label : undefined}
                  className={`group flex items-center p-3 rounded-xl transition-all border ${isSidebarCollapsed ? 'w-12 h-12 justify-center' : 'w-full gap-3'} ${
                    activeTab === tab.id && showGuidedTool
                      ? 'shadow-lg -translate-y-0.5 font-bold' 
                      : 'bg-white border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-100'
                  }`}
                  style={activeTab === tab.id && showGuidedTool ? { backgroundColor: 'var(--accent, #10b981)', color: 'var(--btn-text, #ffffff)', borderColor: 'var(--accent, #10b981)' } : {}}
                >
                  <div className={`transition-transform duration-300 ${!isSidebarCollapsed ? 'group-hover:scale-110' : ''}`} style={activeTab === tab.id && showGuidedTool ? { color: 'var(--btn-text, #ffffff)' } : {}}>
                    {React.cloneElement(tab.icon as React.ReactElement<any>, { size: isSidebarCollapsed ? 20 : 16 })}
                  </div>
                  {!isSidebarCollapsed && (
                    <>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-[0.625rem] font-black uppercase tracking-tight" style={activeTab === tab.id && showGuidedTool ? { color: 'var(--btn-text, #ffffff)' } : { color: '#334155' }}>
                          {tab.label}
                        </span>
                      </div>
                      {activeTab === tab.id && showGuidedTool && (
                        <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-sm animate-pulse shrink-0" />
                      )}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className={`mt-8 pt-6 border-t border-slate-100 w-full ${isSidebarCollapsed ? 'flex justify-center' : 'space-y-4'}`}>
           <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'justify-between px-2'}`}>
             {!isSidebarCollapsed && <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-300">Layout</div>}
             <button 
                onClick={() => setIsFullScreen(!isFullScreen)}
                title={isFullScreen ? "Vollbild beenden" : "Vollbild"}
                className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-slate-100 flex items-center justify-center shrink-0"
              >
                {isFullScreen ? <X size={16} /> : <Layout size={16} />}
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Mobile Nav Top Bar - Clean and Minimal */}
        <header className="lg:hidden flex items-center justify-between p-3 bg-white border-b border-slate-100 shrink-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Bot size={16} />
            </div>
            <span className="text-[0.625rem] font-black uppercase tracking-tight text-slate-900">AI Expert</span>
          </div>
          <div className="flex items-center gap-1">
             <div className="flex items-center gap-1 h-8 bg-slate-50 p-1 rounded-lg">
                {tabs.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    aria-label={`${t.label}: ${t.description}`}
                    aria-pressed={activeTab === t.id}
                    title={`${t.label} – ${t.description}`}
                    className={`w-6 h-6 flex items-center justify-center rounded-md ${activeTab === t.id ? 'bg-white shadow-sm text-slate-900' : 'text-slate-300'}`}
                  >
                    {React.cloneElement(t.icon as React.ReactElement<any>, { size: 12 })}
                  </button>
                ))}
             </div>
             <button 
               onClick={() => setIsFullScreen(!isFullScreen)}
               aria-label={isFullScreen ? "Vollbild beenden" : "Vollbild öffnen"}
               title={isFullScreen ? "Vollbild beenden" : "Vollbild öffnen"}
               className="p-2 bg-slate-50 rounded-lg text-slate-400"
             >
               {isFullScreen ? <X size={14} /> : <Layout size={14} />}
             </button>
          </div>
        </header>

        {/* Unified Main Content View */}
        <div className="flex-1  flex flex-col min-h-0 w-full relative">
          <AnimatePresence mode="wait">
            {!showGuidedTool ? (
              <motion.div 
                key={activeTab + '-chat-main'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex flex-col min-h-0 relative h-full"
              >
                {/* Header Information Area */}
                <div className={`border-b border-slate-200 bg-white/95 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between ${
                  isCompact ? 'px-4 lg:px-6 py-3' : isLarge ? 'px-6 lg:px-8 py-4' : 'px-6 lg:px-8 py-4'
                }`}>
                   <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl hidden lg:flex items-center gap-1.5 border border-slate-200 text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm animate-fade-in"
                        title={isSidebarCollapsed ? "KI-Menü einblenden" : "KI-Menü ausblenden (Mehr Platz!)"}
                      >
                        <Layout size={13} className={isSidebarCollapsed ? "text-indigo-600 animate-pulse" : "text-slate-400"} />
                        <span>{isSidebarCollapsed ? "Menü ➡️" : "⬅️ Vollbild"}</span>
                      </button>
                      <div>
                         <div className="flex items-center gap-2 mb-0.5">
                            <h1 className="text-[0.875rem] leading-snug font-black uppercase tracking-tight text-slate-900">{activeTabData.label}</h1>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                         </div>
                         <p className="text-[0.6875rem] font-semibold text-slate-500">{activeTabData.description}</p>
                      </div>
                   </div>
                   <button 
                      onClick={() => { setActiveMessages([]); setActiveChatId(null); }}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[0.625rem] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <RefreshCw size={10} className="text-indigo-400" />
                      Zurücksetzen
                    </button>
                </div>

                <div className={`flex-1 overflow-y-auto scrollbar-hide scroll-smooth ${
                  isCompact ? 'py-4 pb-28' : isLarge ? 'py-6 pb-36' : 'py-8 pb-40'
                }`} ref={scrollRef}>
                    <div className={`mx-auto w-full ${
                      isCompact ? 'max-w-3xl px-4' : isLarge ? 'max-w-4xl px-8' : 'max-w-3xl px-6'
                    }`}>
                    
                    {/* Welcome Initial View */}
                    {messages.length === 0 && (
                      <div className="py-5 flex flex-col items-center">
                         {/* Visual Icon Header with Pulsing Halo */}
                         <div className="relative mb-5">
                           <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-30 animate-pulse ${activeTabData.bgClass}`} />
                           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-md relative ${activeTabData.bgClass}`}>
                              {React.cloneElement(activeTabData.icon as React.ReactElement<any>, { size: 32 })}
                              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-slate-100 rounded-xl shadow-lg flex items-center justify-center text-indigo-500">
                                 <Sparkles size={16} />
                              </div>
                           </div>
                         </div>

                         <div className="text-center max-w-lg mb-6">
                           <h2 className="text-[1.25rem] leading-normal font-black text-slate-950 uppercase tracking-tight mb-2">
                             Bereit für {activeTabData.label}-Fragen
                           </h2>
                           <p className="text-[0.8125rem] text-slate-600 font-medium leading-relaxed">
                             Wähle eine der folgenden Vorlagen oder stelle eine eigene Frage an deinen persönlichen KI-Helfer.
                           </p>
                         </div>

                         {/* Recent Chats Section - Part of the Overview Enhancements */}
                         {app.aiChats?.[activeTab] && app.aiChats[activeTab].length > 0 && (
                           <div className="w-full mb-10 bg-slate-50/50 rounded-2xl border border-slate-150 p-5 shadow-sm">
                              <div className="flex items-center gap-2 mb-4 px-1 text-slate-500">
                                 <Clock size={14} className="text-indigo-500 animate-pulse" />
                                 <span className="text-[0.6875rem] font-black uppercase tracking-widest">Letzte Unterhaltungen ({app.aiChats[activeTab].length})</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                 {app.aiChats[activeTab].slice(0, 4).map((entry) => (
                                    <button
                                      key={entry.id}
                                      onClick={() => loadConversation(entry)}
                                      className="p-3.5 bg-white hover:bg-slate-50 border border-slate-100 hover:border-indigo-200 rounded-xl text-left transition-all group flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer"
                                    >
                                      <div className="flex flex-col min-w-0 pr-3">
                                         <span className="text-[0.75rem] font-black text-slate-800 truncate block group-hover:text-indigo-600">{entry.frage}</span>
                                         <span className="text-[0.5625rem] font-bold text-slate-400 block mt-1">{getRelativeTime(entry.timestamp)}</span>
                                      </div>
                                      <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all shrink-0" />
                                    </button>
                                 ))}
                              </div>
                           </div>
                         )}
                         
                         {/* Structured Prompt Cards Grid with Colored left border */}
                         <div className="w-full">
                           <div className="flex items-center gap-2 mb-3 px-1 text-slate-600">
                             <Wand2 size={13} className="text-slate-400" />
                             <span className="text-[0.625rem] font-black uppercase tracking-widest">Inspirierende Vorschläge</span>
                           </div>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                              {EXAMPLE_PROMPTS[activeTab]?.map((prompt, idx) => (
                                 <button
                                   key={idx}
                                   onClick={() => setInp(prompt.text)}
                                   className={`${isCompact ? 'p-3' : 'p-4'} bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-left hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between items-start cursor-pointer active:scale-[0.99] duration-200`}
                                 >
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                   <div className="flex items-center gap-3 w-full">
                                     <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors shrink-0">
                                       <prompt.icon size={16} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                     </div>
                                     <span className="text-[0.8125rem] font-semibold text-slate-700 block leading-snug group-hover:text-slate-950 transition-colors pr-4">{prompt.text}</span>
                                   </div>
                                   <div className="w-full flex justify-end mt-2 opacity-0 group-hover:opacity-100 transform translate-x-1 group-hover:translate-x-0 transition-all">
                                     <ChevronRight size={14} className="text-indigo-500" />
                                   </div>
                                 </button>
                              ))}
                           </div>
                         </div>
                      </div>
                    )}
 
                    {/* Chat Thread with Staggered Animations */}
                    <div className={isCompact ? 'space-y-4' : isLarge ? 'space-y-10' : 'space-y-8'}>
                      {messages.map((m, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                          className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                           <div className={`flex items-start gap-3.5 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                              {/* Avatar Block */}
                              <div className={`w-8.5 h-8.5 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md transition-all ${
                                m.role === 'user' 
                                  ? 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300' 
                                  : 'bg-gradient-to-tr from-slate-900 to-indigo-950 text-white shadow-indigo-950/20'
                              }`}>
                                {m.role === 'user' ? <User size={15} /> : React.cloneElement(activeTabData.icon as React.ReactElement<any>, { size: 15 })}
                              </div>
                              
                              {/* Message Bubble Block */}
                              <div className={`${isCompact ? 'px-4 py-2.5 rounded-2xl' : 'px-5 py-4 rounded-3xl'} text-[0.875rem] leading-relaxed markdown-body transition-all ${
                                m.role === 'user' 
                                  ? 'bg-white text-slate-900 rounded-tr-none border border-slate-150 shadow-sm' 
                                  : 'bg-slate-900 text-white rounded-tl-none shadow-xl border border-slate-800'
                              }`}>
                                 <Markdown>{m.content}</Markdown>
                                 
                                 {/* Interactive Utility bar for responses */}
                                 {m.role === 'ai' && !isLoading && (
                                   <div className={`${isCompact ? 'mt-3 pt-3' : 'mt-5 pt-4'} flex items-center gap-1.5 border-t border-white/10 justify-end`}>
                                      <span className="text-[9px] text-slate-400 mr-auto font-black uppercase tracking-wider select-none">Speichern:</span>
                                      <AISaveButton content={m.content} type="notiz" />
                                      {(activeTab === 'ki-arbeitsblatt' || activeTab === 'ki-wochenplan') && (
                                        <button 
                                          type="button"
                                          onClick={() => {
                                            const printWindow = window.open('', '_blank');
                                            if (printWindow) {
                                              printWindow.document.write(`<html><head><title>Drucken</title><style>body { font-family: sans-serif; white-space: pre-wrap; padding: 20px; }</style></head><body>${m.content}</body></html>`);
                                              printWindow.document.close();
                                              printWindow.print();
                                            }
                                          }}
                                          className="p-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                                          title="Drucken"
                                        >
                                          <FileText size={12} />
                                          <span className="hidden sm:inline text-[9px] tracking-wider uppercase">Drucken</span>
                                        </button>
                                      )}
                                      <button 
                                        type="button"
                                        onClick={() => { navigator.clipboard.writeText(m.content); showToast('In die Zwischenablage kopiert', 'success'); }}
                                        className="p-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                                        title="Kopieren"
                                      >
                                        <Copy size={12} />
                                        <span className="hidden sm:inline text-[9px] tracking-wider uppercase">Kopieren</span>
                                      </button>
                                   </div>
                                 )}
                              </div>
                           </div>
                        </motion.div>
                      ))}

                      {/* Interactive Suggested Action Follow-up Pills */}
                      {messages.length > 0 && messages[messages.length - 1].role === 'ai' && !isLoading && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 }}
                          className="flex flex-wrap gap-2 pl-12 max-w-[90%]"
                        >
                          {[
                            { text: "Vereinfachen 🪄", action: "Erkläre das bitte noch einfacher, so dass es auch Grundschulkinder sofort verstehen." },
                            { text: "Praxis-Beispiel 💡", action: "Gib mir ein konkretes, spielerisches Praxisbeispiel für den Unterricht dazu." },
                            { text: "3 Kernaussagen 📝", action: "Fasse das bitte in 3 kurzen, prägnanten Stichpunkten zusammen." },
                            { text: "Häufige Fehler ⚠️", action: "Worauf muss ich bei diesem Thema besonders achten? Was sind typische Fehlerquellen der Schüler?" }
                          ].map((pill, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setInp(pill.action);
                                handleSend(pill.action);
                              }}
                              className="px-3.5 py-2 bg-indigo-50/60 hover:bg-indigo-100 text-indigo-700 border border-indigo-100/40 rounded-full text-[0.6875rem] font-bold transition-all hover:scale-[1.03] active:scale-95 cursor-pointer shadow-sm"
                            >
                              {pill.text}
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {/* AI Thinking/Writing Wave skeleton loader */}
                      {isLoading && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-start gap-4 max-w-[85%] ml-1"
                        >
                           <div className="w-8.5 h-8.5 rounded-2xl bg-slate-900 text-indigo-400 flex items-center justify-center animate-pulse shadow-md">
                             <Bot size={15} className="animate-spin [animation-duration:3s]" />
                           </div>
                           <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-5 shadow-xl shadow-slate-100/40 flex flex-col gap-3.5 min-w-[300px]">
                              <div className="flex items-center gap-2">
                                 <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">KI-Experte formuliert</span>
                                 <span className="text-[10px] font-bold text-slate-400">Denkvorgang läuft...</span>
                              </div>
                              <div className="space-y-2.5">
                                <div className="h-3 bg-slate-100 rounded-full w-full animate-pulse" />
                                <div className="h-3 bg-slate-100 rounded-full w-[92%] animate-pulse" />
                                <div className="h-3 bg-slate-100 rounded-full w-[78%] animate-pulse" />
                              </div>
                              <div className="flex gap-1.5 mt-1 justify-end items-center">
                                 <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" />
                                 <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping [animation-delay:0.15s]" />
                                 <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-ping [animation-delay:0.3s]" />
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
 
                {/* Custom-styled Input Dock with Focus Ring & Indicators */}
                <div className="absolute bottom-0 inset-x-0 p-4 lg:p-6 bg-gradient-to-t from-white via-white/98 to-transparent pointer-events-none">
                  <div className="max-w-3xl mx-auto w-full pointer-events-auto flex flex-col gap-2.5">
                    
                    {/* Arbeitsblatt Form with Elegant Segmented Containers */}
                    {activeTab === 'ki-arbeitsblatt' && (
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl">
                        <div className="text-[0.625rem] font-black uppercase text-slate-400 mb-4 ml-1 flex items-center gap-2 tracking-widest"><FileText size={14} className="text-cyan-500" /> Arbeitsblatt Konfigurator</div>
                        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Fach</span>
                            <select value={abFach} onChange={e => setAbFach(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer">
                              <option>Deutsch</option><option>Mathematik</option><option>Sachunterricht</option><option>Englisch</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Klasse</span>
                            <select value={abStufe} onChange={e => setAbStufe(Number(e.target.value))} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer">
                              {[1,2,3,4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="mb-3.5 flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Arbeitsblatt-Typ</span>
                          <select value={abTyp} onChange={e => setAbTyp(e.target.value)} className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer">
                            {abFach === 'Deutsch' && <><option>Lückentext</option><option>Lernwörter-Übung</option><option>Satzglieder</option><option>Wortarten bestimmen</option><option>Leseverständnis mit Fragen</option></>}
                            {abFach === 'Mathematik' && <><option>Diagnostischer Kurztest</option><option>Rechenpäckchen</option><option>Sachaufgaben</option><option>Zahlenrätsel</option><option>Geometrie-Aufgaben</option><option>gemischte Übung</option></>}
                            {abFach === 'Sachunterricht' && <><option>Wissensfragen</option><option>Zuordnungsaufgabe</option><option>Lückentext</option></>}
                            {abFach === 'Englisch' && <><option>Vokabel-Übung</option><option>einfache Sätze</option><option>Bild-Wort-Zuordnung (als Textbeschreibung)</option></>}
                          </select>
                        </div>
                        <div className="mb-3.5 relative flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Thema</span>
                          {availableLehrplanTopics.length > 0 ? (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <select 
                                value={abThema} 
                                onChange={e => setAbThema(e.target.value)} 
                                className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <option value="">Lehrplanthema wählen...</option>
                                {availableLehrplanTopics.map((thema, idx) => (
                                  <option key={idx} value={thema}>{thema}</option>
                                ))}
                              </select>
                              <input 
                                type="text" 
                                value={abThema} 
                                onChange={e => setAbThema(e.target.value)} 
                                placeholder="oder eigenes Thema..." 
                                className="flex-1 p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none" 
                              />
                            </div>
                          ) : (
                            <input 
                              type="text" 
                              value={abThema} 
                              onChange={e => setAbThema(e.target.value)} 
                              placeholder="Thema (z.B. Wald und Waldtiere)" 
                              className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none" 
                            />
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3.5 mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Schwierigkeit</span>
                            <select value={abSchwierigkeit} onChange={e => setAbSchwierigkeit(e.target.value)} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer">
                              <option>Leicht</option><option>Mittel</option><option>Fördernd</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Aufgaben-Anzahl</span>
                            <select value={abAnzahl} onChange={e => setAbAnzahl(Number(e.target.value))} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none hover:bg-slate-100 transition-colors cursor-pointer">
                              <option value={5}>5 Aufgaben</option><option value={10}>10 Aufgaben</option><option value={15}>15 Aufgaben</option>
                            </select>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const prompt = `Erstelle ein Arbeitsblatt. Fach: ${abFach}, ${abStufe}. Stufe. Typ: ${abTyp}. Thema: "${abThema}". Schwierigkeit: ${abSchwierigkeit}, Anzahl: ${abAnzahl} Aufgaben.`;
                            handleSend(prompt);
                          }} 
                          disabled={!abThema.trim() || isLoading} 
                          className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-cyan-500/20 transition-all active:scale-[0.99] disabled:bg-slate-200 cursor-pointer"
                        >
                          Arbeitsblatt erstellen
                        </button>
                      </div>
                    )}
 
                    {/* Foto-Korrektur Form */}
                    {activeTab === 'ki-foto-korrektur' && (
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl">
                        <div className="text-[0.625rem] font-black uppercase text-slate-400 mb-3 ml-1 flex items-center gap-2 tracking-widest"><Camera size={14} className="text-red-500" /> Schülertext-Korrektur</div>
                        
                        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3.5 flex items-start gap-3 mb-4">
                          <Shield size={16} className="text-rose-500 shrink-0 mt-0.5" />
                          <p className="text-[0.6875rem] font-bold text-rose-700 leading-normal">Datenschutz: Achte darauf, dass kein Schülername auf dem Foto sichtbar ist – decke Namen vor dem Fotografieren ab.</p>
                        </div>
 
                        <div className="mb-4">
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer overflow-hidden transition-all relative">
                            {fkImagePreview ? (
                               <img src={fkImagePreview} alt="Upload Preview" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                            ) : (
                               <>
                                 <UploadCloud size={24} className="text-slate-400 mb-1.5" />
                                 <span className="text-xs font-bold text-slate-500">Foto des Textes hochladen</span>
                                 <span className="text-[9px] text-slate-400 font-medium">Bilder bis 8MB</span>
                               </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) { showToast('Datei zu groß (max 8MB)', 'error'); return; }
                              
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  let width = img.width; let height = img.height;
                                  const maxDim = 1568;
                                  if (width > height && width > maxDim) { height *= maxDim / width; width = maxDim; }
                                  else if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                                  canvas.width = width; canvas.height = height;
                                  const ctx = canvas.getContext('2d');
                                  ctx?.drawImage(img, 0, 0, width, height);
                                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                  setFkImagePreview(dataUrl);
                                  const base64Data = dataUrl.split(',')[1];
                                  setFkImageBase64({ data: base64Data, mimeType: 'image/jpeg' });
                                };
                                img.src = e.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            }} />
                          </label>
                        </div>
 
                        <div className="grid grid-cols-1 mb-4 flex flex-col gap-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Schulstufe</span>
                          <select value={fkStufe} onChange={e => setFkStufe(Number(e.target.value))} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none w-full cursor-pointer hover:bg-slate-100 transition-colors">
                            {[1,2,3,4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                          </select>
                        </div>
                        
                        <div className="mb-4 space-y-1.5">
                          <div className="text-[0.625rem] font-black uppercase text-slate-400 ml-1 tracking-wider">Fokus der Rückmeldung</div>
                          <div className="flex flex-wrap gap-2">
                             {Object.keys(fkFokus).map((key) => (
                               <label key={key} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                                  <input type="checkbox" checked={(fkFokus as any)[key]} onChange={e => setFkFokus(prev => ({...prev, [key]: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                                  <span className="text-[0.6875rem] font-bold text-slate-700 capitalize">{key}</span>
                               </label>
                             ))}
                          </div>
                        </div>
 
                        <button 
                          onClick={() => {
                            const foki = Object.entries(fkFokus).filter(([_,v]) => v).map(([k]) => k).join(', ');
                            const prompt = `Analysiere diesen Schülertext der ${fkStufe}. Stufe. Fokus auf: ${foki}.`;
                            handleSend(prompt, fkImageBase64);
                          }} 
                          disabled={!fkImageBase64 || isLoading} 
                          className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-red-500/20 transition-all active:scale-[0.99] disabled:bg-slate-200 cursor-pointer"
                        >
                          Text analysieren
                        </button>
                      </div>
                    )}
 
                    {/* Wochenplan Form */}
                    {activeTab === 'ki-wochenplan' && (
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xl">
                        <div className="text-[0.625rem] font-black uppercase text-slate-400 mb-4 ml-1 flex items-center gap-2 tracking-widest"><ClipboardList size={14} className="text-purple-500" /> Wochenplan Generator</div>
                        <div className="grid grid-cols-2 gap-3.5 mb-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Zeitraum</span>
                            <input type="text" value={wpZeitraum} onChange={e => setWpZeitraum(e.target.value)} placeholder="z.B. KW 23" className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none w-full" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Schulstufe</span>
                            <select value={wpStufe} onChange={e => setWpStufe(Number(e.target.value))} className="p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none w-full cursor-pointer hover:bg-slate-100 transition-colors">
                              {[1,2,3,4].map(s => <option key={s} value={s}>{s}. Stufe</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-3 mb-3.5">
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Pflichtaufgaben</span>
                            <textarea value={wpPflicht} onChange={e => setWpPflicht(e.target.value)} placeholder="Mathe S.45, Deutsch Leseübung..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none resize-none h-16" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black uppercase text-slate-400 ml-1">Wahlaufgaben (Optional)</span>
                            <textarea value={wpWahl} onChange={e => setWpWahl(e.target.value)} placeholder="Wahlaufgaben-Ideen (die KI ergänzt diese kreativ)" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none resize-none h-16" />
                          </div>
                        </div>
                        <div className="mb-4 space-y-1.5">
                          <div className="text-[0.625rem] font-black uppercase text-slate-400 ml-1 tracking-wider">Differenzierung</div>
                          <div className="flex flex-wrap gap-2">
                             {Object.keys(wpDiff).map((key) => (
                               <label key={key} className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 cursor-pointer hover:bg-slate-100 transition-colors">
                                  <input type="checkbox" checked={(wpDiff as any)[key]} onChange={e => setWpDiff(prev => ({...prev, [key]: e.target.checked}))} className="rounded text-indigo-600 focus:ring-0" />
                                  <span className="text-[0.6875rem] font-bold text-slate-700 capitalize">{key}-Plan</span>
                               </label>
                             ))}
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const diffs = Object.entries(wpDiff).filter(([_,v]) => v).map(([k]) => `${k}-Plan`).join(', ');
                            const prompt = `Erstelle Wochenpläne (${diffs}) für die ${wpStufe}. Stufe. Zeitraum: ${wpZeitraum}. Pflicht: ${wpPflicht}. Wahl: ${wpWahl}`;
                            handleSend(prompt);
                          }} 
                          disabled={!wpPflicht.trim() || isLoading} 
                          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:shadow-purple-500/20 transition-all active:scale-[0.99] disabled:bg-slate-200 cursor-pointer"
                        >
                          Wochenpläne erstellen
                        </button>
                      </div>
                    )}
 
                     {/* Gorgeous focus-glow input dock */}
                     <div className={`relative flex items-end bg-white border border-slate-300 rounded-2xl shadow-md focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all ${isCompact ? 'p-1.5' : 'p-2'}`}>
                        <textarea 
                          style={{ backgroundColor: 'transparent' }}
                          className={`flex-1 bg-transparent outline-none text-[0.9375rem] leading-relaxed font-semibold text-slate-900 placeholder:text-slate-500 resize-none scrollbar-hide !border-none !bg-transparent focus:!ring-0 rounded-xl max-h-[150px] ${
                            isCompact ? 'p-2.5 min-h-[44px]' : 'p-4 min-h-[52px]'
                          }`}
                          placeholder={`${activeTabData.label}-Analyse oder Fragen eingeben...`}
                          value={input}
                          onChange={e => setInp(e.target.value)}
                          onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        />
                        <button 
                          disabled={isLoading || !input.trim()}
                          onClick={() => handleSend()}
                          className={`flex items-center justify-center text-white transition-all shadow-md hover:shadow-indigo-500/10 active:scale-95 shrink-0 ml-1 mb-1 cursor-pointer ${
                            isCompact ? 'w-10 h-10 rounded-xl' : 'w-12 h-12 rounded-2xl'
                          } disabled:bg-slate-50 disabled:text-slate-300`}
                          style={{ backgroundColor: activeTabData.buttonColor }}
                        >
                          <Send size={18} />
                        </button>
                     </div>
                     <span className="text-[10px] text-center text-slate-400 font-bold select-none leading-none">
                       Tipp: Drücke <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Enter</kbd> zum Senden • <kbd className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">Shift+Enter</kbd> für Zeilenumbruch
                     </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                 key="guided-tool-main"
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 0.98 }}
                 className="flex-1 flex flex-col min-h-0 bg-white"
              >
                  <div className="p-6 lg:px-10 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                          className="mr-1 p-2 bg-slate-50 hover:bg-slate-100 text-slate-650 rounded-xl hidden lg:flex items-center gap-1.5 border border-slate-200 text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                          title={isSidebarCollapsed ? "KI-Menü einblenden" : "KI-Menü ausblenden (Mehr Platz!)"}
                        >
                          <Layout size={13} className={isSidebarCollapsed ? "text-indigo-600 animate-pulse" : "text-slate-400"} />
                          <span>{isSidebarCollapsed ? "Menü ➡️" : "⬅️ Vollbild"}</span>
                        </button>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${activeTabData.bgClass}`}>
                           {React.cloneElement(activeTabData.icon as React.ReactElement<any>, { size: 14 })}
                        </div>
                        <div>
                           <h3 className="text-[0.75rem] leading-tight font-black uppercase text-slate-900">{activeTabData.label}</h3>
                           <p className="text-[0.625rem] font-bold text-slate-400 leading-none">Interaktiver Assistent</p>
                        </div>
                     </div>
                     <button 
                       onClick={() => setShowGuidedTool(false)} 
                       className="px-5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full text-[0.5625rem] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-200 shadow-sm"
                     >
                        <MessageSquare size={12} className="text-indigo-400" />
                        Chat-Beratung
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                     <div className={`${activeTab === 'ki-stationenbetrieb' ? 'w-full' : 'max-w-4xl mx-auto'} w-full h-full`}>
                        {activeTab === 'ki-elternbrief' && <EmailAssistant />}
                        {activeTab === 'ki-differenzierung' && <Differentiation />}
                        {activeTab === 'ki-beurteilung' && <VerbalAssessment />}
                        {activeTab === 'ki-korrektur' && <MaterialOptimizer />}
                        {activeTab === 'ki-stundenplan-check' && <ScheduleOptimizer />}
                        {activeTab === 'ki-stationenbetrieb' && <StationenbetriebManager />}
                     </div>
                  </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
