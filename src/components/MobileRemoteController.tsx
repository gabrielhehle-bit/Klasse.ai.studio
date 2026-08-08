import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { UNIFIED_DEFAULT_BADGES } from '../types';
import { FAECHER_ALLE } from '../constants';
import { UNTERRICHTSMODUS_THEMES } from '../lib/unterrichtsmodusThemes';
import { 
  X, Smartphone, Monitor, CheckSquare, 
  Trash2, Plus, Minus, Search, Trophy, 
  Sparkles, BookOpen, Clock, Play, Pause, RotateCcw,
  ChevronDown, ChevronUp, Award, Check, AlertTriangle, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  ZoomIn, ZoomOut, UserCheck, ShieldAlert,
  Volume2, VolumeX, AlignJustify, Grid3X3, Square, Type,
  Compass, Bot, LayoutDashboard, Send
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface MobileRemoteControllerProps {
  onClose: () => void;
  getActiveSubject: () => string;
}

export const MobileRemoteController: React.FC<MobileRemoteControllerProps> = ({ onClose, getActiveSubject }) => {
  const { app, setApp } = useApp();
  
  const activePultThemeId = app.unterrichtsmodus_theme || app.theme || "classic_light";
  const themeObj = UNTERRICHTSMODUS_THEMES[activePultThemeId] || UNTERRICHTSMODUS_THEMES.classic_light;

  const isHexLight = (hexColor: string): boolean => {
    if (!hexColor) return false;
    const hex = hexColor.replace('#', '');
    if (hex.length < 3) return false;
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    }
    if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  };

  const isThemeLight = activePultThemeId === "custom_theme"
    ? isHexLight(app.customBgColor || '#121214')
    : activePultThemeId !== "deep_dark";

  const themeBgColor = activePultThemeId === "custom_theme" ? (app.customBgColor || '#121214') : themeObj.colors.background;
  const themeTextColor = isThemeLight ? '#0f172a' : '#f8fafc';
  const themeTextSecondary = isThemeLight ? '#475569' : '#cbd5e1';
  const themeTextMuted = isThemeLight ? '#64748b' : '#94a3b8';
  const themeSurfaceColor = isThemeLight ? '#ffffff' : '#1e1e24';
  const themeSurfaceBorder = isThemeLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
  const themeSurfaceBgAccent = isThemeLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)';
  const themeAccentColor = activePultThemeId === "custom_theme" ? (app.boardSettings?.boardTextColor || '#f59e0b') : themeObj.colors.accent;

  const [mainMode, setMainMode] = useState<'cockpit' | 'unterricht'>('unterricht');
  const [activeTab, setActiveTab] = useState<'schueler' | 'anweisung' | 'tafel' | 'board' | 'noten_tab' | 'ki_tab'>('schueler');
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [selectedNotenStudent, setSelectedNotenStudent] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  
  // Custom new badge state
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('🧠');
  
  // Custom material input state
  const [customMaterial, setCustomMaterial] = useState('');
  
  // Local lotto winner modal
  const [drawnLottoWinner, setDrawnLottoWinner] = useState<{ name: string; emoji: string } | null>(null);

  // Student notes state
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({});

  // Whiteboard remote writing & drawing states
  const [remoteText, setRemoteText] = useState('');
  const [remoteTextColor, setRemoteTextColor] = useState('#ffffff');
  const [remoteFontSize, setRemoteFontSize] = useState(38);
  const [remoteDrawColor, setRemoteDrawColor] = useState('#ffffff');
  const [remoteDrawWidth, setRemoteDrawWidth] = useState(3);
  const [isDrawingOnPad, setIsDrawingOnPad] = useState(false);
  const remoteCanvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawingOnPad(true);
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const drawStroke = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingOnPad) return;
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = remoteDrawColor;
    ctx.lineWidth = remoteDrawWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (remoteDrawColor === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = remoteDrawWidth * 4;
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawingOnPad(false);
  };

  const clearRemoteCanvas = () => {
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSendRemoteDrawing = () => {
    const canvas = remoteCanvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      setApp((prev: any) => ({
        ...prev,
        boardSettings: {
          ...prev.boardSettings,
          isTafelOpen: true,
          remoteDrawingImage: {
            dataUrl,
            timestamp: Date.now()
          }
        }
      }));
      showFeedback("🎨 Zeichnung an Smartboard gesendet!");
    } catch (err) {
      showFeedback("Fehler beim Übertragen der Zeichnung");
    }
  };

  const handleSendRemoteText = (overrideText?: string) => {
    const textToSend = (overrideText || remoteText).trim();
    if (!textToSend) return;

    const newEntry = {
      text: textToSend,
      color: remoteTextColor,
      fontSize: remoteFontSize,
      timestamp: Date.now(),
      x: 100,
      y: 150
    };

    setApp((prev: any) => {
      const existing = prev.boardSettings?.remoteTextEntries || [];
      return {
        ...prev,
        boardSettings: {
          ...prev.boardSettings,
          isTafelOpen: true,
          remoteTextEntries: [...existing, newEntry]
        }
      };
    });

    if (!overrideText) setRemoteText('');
    showFeedback("✍️ Text auf Smartboard-Whiteboard geschrieben!");
  };

  const handleAddStudentNote = (studentId: string, text: string) => {
    if (!text.trim()) return;
    
    const newJournalEntry = {
      id: "note-behavior-manual-" + Date.now() + Math.random().toString(),
      titel: `Notiz (${activeSubject})`,
      inhalt: text.trim(),
      icon: "📝",
      timestamp: Date.now(),
      schuelerId: studentId,
      kategorie: "Verhalten"
    };

    setApp((prev: any) => ({
      ...prev,
      notizen: [newJournalEntry, ...(prev.notizen || [])]
    }));
    
    setStudentNotes(prev => ({ ...prev, [studentId]: '' }));
    showFeedback("Verhaltensnotiz gespeichert!");
  };

  const activeSyncCode = app.boardSettings?.activeSyncCode;
  const sidebarMode = app.boardSettings?.sidebarMode || 'expanded';
  const activeSubject = getActiveSubject();
  const todayStr = new Date().toISOString().split('T')[0];

  // Haptic vibration feedback helper
  const triggerHaptic = (pattern: number | number[] = 40) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Safe fallback if vibration is not supported or permission denied
      }
    }
  };

  // Feedback notifications with haptic vibration
  const showFeedback = (txt: string, pattern: number | number[] = 40) => {
    triggerHaptic(pattern);
    setMessage(txt);
    setTimeout(() => {
      setMessage((cur) => cur === txt ? null : cur);
    }, 2000);
  };

  // Disconnect remote control session
  const handleDisconnect = () => {
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        activeSyncCode: undefined,
        isRemoteController: undefined
      }
    }));
  };

  // Toggle Widget on Smartboard
  const toggleWidgetRemote = (type: string) => {
    const current = app.boardWidgets || [];
    const allowMultiple = ["sticky"];

    if (!allowMultiple.includes(type) && current.find((w: any) => w.type === type)) {
      setApp((prev: any) => ({
        ...prev,
        boardWidgets: (prev.boardWidgets || []).filter((w: any) => w.type !== type),
      }));
      showFeedback(`Widget entfernt.`);
    } else {
      const id = `${type}-${Math.random().toString(36).substring(2, 9)}`;
      const offset = (app.boardWidgets?.length || 0) * 35;
      setApp((prev: any) => ({
        ...prev,
        boardWidgets: [
          ...(prev.boardWidgets || []),
          { id, type, x: 150 + offset, y: 120 + offset, scale: 1 },
        ],
      }));
      showFeedback(`Widget gestartet!`);
    }
  };

  // Move or resize widget on big screen
  const handleAdjustWidgetLayout = (widgetId: string, action: 'left' | 'right' | 'up' | 'down' | 'grow' | 'shrink') => {
    setApp((prev: any) => {
      const updated = (prev.boardWidgets || []).map((w: any) => {
        if (w.id !== widgetId) return w;
        let { x, y, scale } = w;
        scale = scale ?? 1;
        if (action === 'left') x = Math.max(0, x - 50);
        if (action === 'right') x = Math.min(1800, x + 50);
        if (action === 'up') y = Math.max(0, y - 50);
        if (action === 'down') y = Math.min(1100, y + 50);
        if (action === 'grow') scale = Math.min(2.5, scale + 0.15);
        if (action === 'shrink') scale = Math.max(0.4, scale - 0.15);
        return { ...w, x, y, scale };
      });
      return { ...prev, boardWidgets: updated };
    });
  };

  // Mitarbeit points modifications (+ / -)
  const handleAddParticipation = (studentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const subject = activeSubject;
    (window as any).__lastMitarbeitPlusTime = Date.now();
    setApp((prev: any) => {
      const allMi = prev.mitarbeit || {};
      const mi = allMi[studentId] || {};
      const sub = mi[subject] || {};
      const count = sub["1"] || 0;
      
      const newLogs = [...(prev.mitarbeitLogs || []), {
         id: Date.now().toString() + Math.random().toString(),
         sid: studentId,
         points: 1,
         timestamp: new Date().toISOString()
      }];

      return {
        ...prev,
        mitarbeit: {
          ...allMi,
          [studentId]: { ...mi, [subject]: { ...sub, "1": count + 1 } },
        },
        mitarbeitLogs: newLogs
      };
    });
    showFeedback("+1 Mitarbeitspunkt hinzugefügt!");
  };

  const handleRemoveParticipation = (studentId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const subject = activeSubject;
    setApp((prev: any) => {
      const allMi = prev.mitarbeit || {};
      const mi = allMi[studentId] || {};
      const sub = mi[subject] || {};
      const count = sub["1"] || 0;
      if (count <= 0) return prev;
      
      const newLogs = [...(prev.mitarbeitLogs || []), {
         id: Date.now().toString() + Math.random().toString(),
         sid: studentId,
         points: -1,
         timestamp: new Date().toISOString()
      }];

      return {
        ...prev,
        mitarbeit: {
          ...allMi,
          [studentId]: { ...mi, [subject]: { ...sub, "1": count - 1 } },
        },
        mitarbeitLogs: newLogs
      };
    });
    showFeedback("Mitarbeitspunkt abgezogen.");
  };

  // Attendance Toggle
  const handleToggleAttendance = (studentId: string, status: 'e' | 'u' | 'present') => {
    setApp((prev: any) => {
      const studentAttendance = prev.anwesenheit[studentId] || {};
      const dayAttendance: Record<string, string> = {};
      
      if (status !== 'present') {
        for (let i = 0; i < 8; i++) {
          dayAttendance[i] = status;
        }
      }

      return {
        ...prev,
        anwesenheit: {
          ...prev.anwesenheit,
          [studentId]: {
            ...studentAttendance,
            [todayStr]: dayAttendance
          }
        }
      };
    });
    showFeedback("Anwesenheitsstatus aktualisiert!");
  };

  // Behavior Stages (🌟 / 😊 / 😐 / ⚠️ / 🚫)
  const handleSetStudentBehavior = (studentId: string, stageId: string) => {
    setApp((prev: any) => {
      const currentStageId = prev.behavior_status?.[studentId] || prev.behavior_default_stage_id || "1";
      const prevIdx = parseInt(currentStageId) || 1;
      const nextIdx = parseInt(stageId) || 1;
      if (nextIdx > prevIdx) (window as any).__lastVerhaltenDownTime = Date.now();
      else if (stageId === "1" || nextIdx === 1) (window as any).__lastVerhaltenSuperTime = Date.now();
      return {
        ...prev,
        behavior_status: {
          ...(prev.behavior_status || {}),
          [studentId]: stageId,
        },
      };
    });
    showFeedback("Schüler-Verhalten aktualisiert!");
  };

  // Hausübung vergessen (Omission)
  const handleOmissionHue = (studentId: string, adjustment: 'increment' | 'decrement') => {
    setApp((prev: any) => {
      const currentNoten = { ...prev.noten };
      if (!currentNoten[studentId]) currentNoten[studentId] = {};
      if (!currentNoten[studentId][activeSubject]) currentNoten[studentId][activeSubject] = {};
      if (!currentNoten[studentId][activeSubject]['1']) currentNoten[studentId][activeSubject]['1'] = {};
      
      const currentHue = currentNoten[studentId][activeSubject]['1'].hue || 0;
      let newHueValue = currentHue;
      
      if (adjustment === 'increment') {
        newHueValue = currentHue + 1;
        
        const newLogEntry = {
          id: "log-hue-" + Date.now() + Math.random().toString(),
          schuelerId: studentId,
          datum: todayStr,
          iconId: "4", 
          timestamp: Date.now(),
          comment: `Hausübung vergessen im Fach ${activeSubject}`
        };

        const newJournalEntry = {
          id: "note-hue-" + Date.now() + Math.random().toString(),
          titel: "Hausübung vergessen",
          inhalt: `Hausübung im Fach ${activeSubject} vergessen.`,
          icon: "🏠",
          timestamp: Date.now(),
          schuelerId: studentId,
          kategorie: "Hausaufgabe"
        };

        return {
          ...prev,
          noten: {
            ...currentNoten,
            [studentId]: {
              ...currentNoten[studentId],
              [activeSubject]: {
                ...currentNoten[studentId][activeSubject],
                '1': {
                  ...currentNoten[studentId][activeSubject]['1'],
                  hue: newHueValue
                }
              }
            }
          },
          statusLog: [newLogEntry, ...(prev.statusLog || [])],
          notizen: [newJournalEntry, ...(prev.notizen || [])]
        };
      } else {
        newHueValue = Math.max(0, currentHue - 1);
        return {
          ...prev,
          noten: {
            ...currentNoten,
            [studentId]: {
              ...currentNoten[studentId],
              [activeSubject]: {
                ...currentNoten[studentId][activeSubject],
                '1': {
                  ...currentNoten[studentId][activeSubject]['1'],
                  hue: newHueValue
                }
              }
            }
          }
        };
      }
    });
    showFeedback(adjustment === 'increment' ? "HÜ vergessen eingetragen!" : "HÜ vergessen abgezogen.");
  };

  // Material Vergessen tracker
  const handleOmissionMaterial = (studentId: string, label: string, icon: string) => {
    setApp((prev: any) => {
      const newLogEntry = {
        id: "log-mat-" + Date.now() + Math.random().toString(),
        schuelerId: studentId,
        datum: todayStr,
        iconId: "4", 
        timestamp: Date.now(),
        comment: `Material vergessen: ${icon} ${label} (${activeSubject})`
      };

      const newJournalEntry = {
        id: "note-mat-" + Date.now() + Math.random().toString(),
        titel: "Material vergessen",
        inhalt: `${icon} ${label} im Unterricht (${activeSubject}) vergessen.`,
        icon: "🎒",
        timestamp: Date.now(),
        schuelerId: studentId,
        kategorie: "Material"
      };

      return {
        ...prev,
        statusLog: [newLogEntry, ...(prev.statusLog || [])],
        notizen: [newJournalEntry, ...(prev.notizen || [])]
      };
    });
    showFeedback(`Material vergessen: ${label}`);
  };

  // Badges / Medailles award
  const handleAwardBadge = (studentId: string, bName: string, bIcon: string) => {
    setApp((prev: any) => ({
      ...prev,
      schueler: prev.schueler.map((s: any) =>
        s.id === studentId
          ? {
              ...s,
              badges: [
                {
                  id: Date.now().toString() + Math.random().toString(),
                  name: bName,
                  icon: bIcon,
                  date: new Date().toISOString(),
                },
                ...(s.badges || []),
              ],
            }
          : s
      ),
    }));
    confetti({
      particleCount: 22,
      spread: 45,
      origin: { y: 0.85 }
    });
    showFeedback(`Abzeichen "${bName}" verliehen! 🏆`);
  };

  // Remove Badge from student
  const handleRemoveBadge = (studentId: string, badgeId: string) => {
    setApp((prev: any) => ({
      ...prev,
      schueler: prev.schueler.map((s: any) =>
        s.id === studentId
          ? {
              ...s,
              badges: (s.badges || []).filter((b: any) => b.id !== badgeId),
            }
          : s
      ),
    }));
    showFeedback("Abzeichen gelöscht.");
  };

  // Create custom badge globally
  const handleCreateCustomBadge = () => {
    if (!newBadgeName.trim()) return;
    const name = newBadgeName.trim();
    const icon = newBadgeIcon.trim() || "⭐";

    // Prevent duplicate badges
    const allBadges = [...defaultBadges, ...(app.custom_badges || [])];
    if (allBadges.some(b => b.name.toLowerCase() === name.toLowerCase())) {
      showFeedback("Abzeichen existiert bereits!");
      return;
    }

    setApp((prev: any) => ({
      ...prev,
      custom_badges: [
        ...(prev.custom_badges || []),
        { icon, name }
      ]
    }));
    setNewBadgeName('');
    setNewBadgeIcon('🧠');
    showFeedback(`Neues Abzeichen "${name}" erstellt!`);
  };

  // Set Timer minutes
  const handleSetTimerMinutes = (minutes: number) => {
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: true,
        timerEnd: Date.now() + minutes * 60 * 1000,
        timerTotal: minutes * 60,
      },
    }));
    showFeedback(`Timer auf ${minutes} Min. gestellt.`);
  };

  // Adjust timer
  const handleAdjustTimerMinutes = (amount: number) => {
    const timerEnd = app.boardSettings?.timerEnd || Date.now();
    const timerTotal = app.boardSettings?.timerTotal || 0;

    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: true,
        timerEnd: timerEnd + amount * 60 * 1000,
        timerTotal: Math.max(0, timerTotal + amount * 60),
      },
    }));
    showFeedback(`Timer um ${amount > 0 ? '+' : ''}${amount} Min. angepasst.`);
  };

  // Reset timer
  const handleResetTimer = () => {
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        timerRunning: false,
        timerEnd: undefined,
        timerTotal: undefined
      }
    }));
    showFeedback("Timer zurückgesetzt.");
  };

  // Mark all filtered (or all) present
  const handleMarkAllPresent = () => {
    const studentsToSet = filteredStudents.length > 0 ? filteredStudents : sortedStudents;
    if (studentsToSet.length === 0) return;

    setApp((prev: any) => {
      const updatedAnwesenheit = { ...prev.anwesenheit };
      studentsToSet.forEach(s => {
        updatedAnwesenheit[s.id] = {
          ...(updatedAnwesenheit[s.id] || {}),
          [todayStr]: {} // empty on todayStr means present/da
        };
      });
      return {
        ...prev,
        anwesenheit: updatedAnwesenheit
      };
    });
    showFeedback("Alle Schüler als ANWESEND 🟢 markiert!");
    confetti({ particleCount: 15, spread: 30, origin: { y: 0.9 } });
  };

  // Select a random lottery winner
  const drawRandomLotto = () => {
    if (!sortedStudents || sortedStudents.length === 0) return;
    const randomIndex = Math.floor(Math.random() * sortedStudents.length);
    const chosen = sortedStudents[randomIndex];

    // Trigger local display modal
    setDrawnLottoWinner({
      name: `${chosen.vorname} ${chosen.nachname}`,
      emoji: chosen.emoji || "🧑‍🎓"
    });

    // Award confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 }
    });

    // Synchronize to the board so teachers see it active on screen if desired
    setApp((prev: any) => ({
      ...prev,
      lottoWinner: `${chosen.emoji || "🧑‍🎓"} ${chosen.vorname} ${chosen.nachname} 🎉`
    }));

    showFeedback("Lotto Gewinner gezogen!");
  };

  // Behavior stages and badges
  const defaultStages = [
    { id: "1", label: "Super", color: "#10b981", icon: "🌟" },
    { id: "2", label: "Gut", color: "#3b82f6", icon: "😊" },
    { id: "3", label: "OK", color: "#94a3b8", icon: "😐" },
    { id: "4", label: "Ermahnung", color: "#f59e0b", icon: "⚠️" },
    { id: "5", label: "Inakzeptabel", color: "#ef4444", icon: "🚫" },
  ];
  const stages = app.behavior_stages || defaultStages;
  const defaultStageId = app.behavior_default_stage_id || "3";

  // Dynamic helper to style stage buttons beautifully depending on the stage ID
  const getMobileStageStyle = (stgId: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-white/5 border-white/5 text-stone-400 hover:bg-white/10';
    }
    switch (stgId) {
      case '1': return 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/15 scale-105 font-black';
      case '2': return 'bg-blue-500/10 border-blue-500 text-blue-400 shadow-md shadow-blue-500/15 scale-105 font-black';
      case '3': return 'bg-slate-500/10 border-slate-500 text-slate-300 shadow-md shadow-slate-500/15 scale-105 font-black';
      case '4': return 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/15 scale-105 font-black';
      case '5': return 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/15 scale-105 font-black';
      default: return 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-md shadow-orange-500/15 scale-105 font-black';
    }
  };

  const defaultBadges = UNIFIED_DEFAULT_BADGES;
  const availableBadges = [
    ...defaultBadges,
    ...(app.custom_badges || [])
  ];

  // Quick instructions templates
  const instructionTemplates = [
    { label: "Quiet Work 🤫", text: "Bitte arbeitet jetzt ganz leise und selbstständig für euch. 🤫" },
    { label: "Groupwork 🤝", text: "Gruppenarbeit! Tauscht euch leise in euren Gruppen aus. 🤝" },
    { label: "Reading Time 📚", text: "Lesezeit: Holt eure Bücher heraus und lest leise. 📚" },
    { label: "Cleanup 🧼", text: "Aufräumzeit! Bringt eure Tische und Sachen in Ordnung. 🧼" },
    { label: "Break time 🍎", text: "Pause & Jause! Gelüftet wird jetzt auch. 🍎" },
    { label: "Copy Board ✏️", text: "Bitte schreibt den aktuellen Tafelanschrieb ordentlich in eure Hefte ab. ✏️" }
  ];

  // Filtered lists of students indexation
  const sortedStudents = useMemo(() => {
    return [...(app.schueler || [])].sort((a, b) => 
      a.nachname.localeCompare(b.nachname, 'de')
    );
  }, [app.schueler]);

  const filteredStudents = useMemo(() => {
    return sortedStudents.filter(s => {
      const fullname = `${s.vorname} ${s.nachname}`.toLowerCase();
      return fullname.includes(searchTerm.toLowerCase());
    });
  }, [sortedStudents, searchTerm]);

  return (
    <div className="fixed inset-0 z-[1001] bg-slate-900 text-stone-100 flex flex-col font-sans  select-none theme-container-override">
      <style>{`
        .theme-container-override {
          background-color: ${themeBgColor} !important;
          color: ${themeTextColor} !important;
        }
        .theme-container-override header,
        .theme-container-override .bg-slate-950,
        .theme-container-override .bg-slate-950\\/70,
        .theme-container-override .bg-slate-950\\/80,
        .theme-container-override .bg-slate-950\\/40,
        .theme-container-override .bg-slate-900,
        .theme-container-override .bg-slate-900\\/40,
        .theme-container-override .bg-slate-900\\/80,
        .theme-container-override .bg-slate-800,
        .theme-container-override .bg-black\\/20 {
          background-color: ${themeSurfaceColor} !important;
          border-color: ${themeSurfaceBorder} !important;
          color: ${themeTextColor} !important;
        }
        .theme-container-override h1,
        .theme-container-override h2,
        .theme-container-override h3,
        .theme-container-override .text-white,
        .theme-container-override .text-stone-100,
        .theme-container-override .text-stone-250 {
          color: ${themeTextColor} !important;
        }
        .theme-container-override .text-stone-300,
        .theme-container-override .text-stone-400,
        .theme-container-override .text-stone-500,
        .theme-container-override p {
          color: ${themeTextSecondary} !important;
        }
        .theme-container-override .border-white\\/5,
        .theme-container-override .border-white\\/10,
        .theme-container-override .border-white\\/20 {
          border-color: ${themeSurfaceBorder} !important;
        }
        .theme-container-override .bg-orange-500 {
          background-color: ${themeAccentColor} !important;
          border-color: ${themeAccentColor} !important;
          color: ${isHexLight(themeAccentColor) ? '#000005' : '#ffffff'} !important;
        }
        .theme-container-override .text-orange-400,
        .theme-container-override .text-orange-300,
        .theme-container-override .text-yellow-300 {
          color: ${themeAccentColor} !important;
        }
        .theme-container-override .border-orange-500,
        .theme-container-override .border-orange-400,
        .theme-container-override .border-orange-500\\/40,
        .theme-container-override .border-orange-500\\/35 {
          border-color: ${themeAccentColor} !important;
        }
        .theme-container-override input,
        .theme-container-override textarea {
          background-color: ${isThemeLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)'} !important;
          border-color: ${themeSurfaceBorder} !important;
          color: ${themeTextColor} !important;
        }
        .theme-container-override input::placeholder,
        .theme-container-override textarea::placeholder {
          color: ${themeTextMuted} !important;
          opacity: 0.7 !important;
        }
        .theme-container-override .bg-white\\/5,
        .theme-container-override .bg-white\\/10 {
          background-color: ${themeSurfaceBgAccent} !important;
        }
      `}</style>
      
      {/* BRANDING HEADER */}
      <header className="px-4 py-3 bg-slate-950 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-600/30 border border-orange-400/40 flex items-center justify-center text-orange-400 shrink-0">
            <Smartphone size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[0.5625rem] font-black uppercase text-orange-400 tracking-wider">LEHRERCOCKPIT REMOTE</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-[0.6875rem] leading-tight font-black text-white flex items-center gap-1.5 leading-none mt-0.5">
              Sync-Code: <span className="font-mono text-emerald-400 tracking-wider font-extrabold">{activeSyncCode || '???'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDisconnect}
            className="h-8 px-2.5 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all rounded-lg text-[0.5625rem] font-black uppercase tracking-wider text-rose-300 cursor-pointer"
          >
            Trennen
          </button>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Cockpit beenden"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* FLOATING FEEDBACK TOAST */}
      {message && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1003] bg-orange-600 border border-orange-400/40 text-white rounded-full px-5 py-2.5 shadow-xl font-bold text-[0.625rem] uppercase tracking-wider flex items-center gap-2 animate-bounce">
          <Sparkles size={13} className="text-yellow-300" />
          {message}
        </div>
      )}

      {/* COMPACT 4-TAB NAVIGATION BAR */}
      <div className="p-2 bg-slate-950 border-b border-white/10 shrink-0">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => { triggerHaptic(20); setActiveTab('schueler'); }}
            className={`py-2 px-1 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
              activeTab === 'schueler' 
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-md scale-[1.02]' 
                : 'bg-white/5 text-stone-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">👥</span>
            <span className="truncate">Schüler</span>
          </button>

          <button
            onClick={() => { triggerHaptic(20); setActiveTab('anweisung'); }}
            className={`py-2 px-1 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
              activeTab === 'anweisung' 
                ? 'bg-amber-600 text-white border-amber-400 shadow-md scale-[1.02]' 
                : 'bg-white/5 text-stone-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">⏱️</span>
            <span className="truncate">Widgets</span>
          </button>

          <button
            onClick={() => { triggerHaptic(20); setActiveTab('tafel'); }}
            className={`py-2 px-1 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
              activeTab === 'tafel' 
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md scale-[1.02]' 
                : 'bg-white/5 text-stone-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">✍️</span>
            <span className="truncate">Tafel</span>
          </button>

          <button
            onClick={() => { triggerHaptic(20); setActiveTab('board'); }}
            className={`py-2 px-1 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
              activeTab === 'board' 
                ? 'bg-blue-600 text-white border-blue-400 shadow-md scale-[1.02]' 
                : 'bg-white/5 text-stone-400 border-white/5 hover:bg-white/10'
            }`}
          >
            <span className="text-base leading-none">🖥️</span>
            <span className="truncate">Ansichten</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENTS CONTAINER */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pb-8 min-h-0 space-y-4">

        {/* ======================= TABS: BOARD STEUERPULT ======================= */}
        {activeTab === 'board' && (
          <div className="space-y-4 font-sans text-stone-200">
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                <Monitor size={15} /> Aktive Ansicht wechseln
              </h3>
              <p className="text-[0.625rem] text-stone-400 leading-snug">
                Tippe auf eine Ansicht, um das Smartboard (bzw. den PC-Bildschirm an der Wand) sofort in Echtzeit auf die entsprechende Unterseite umzuschalten:
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { id: 'dashboard', val: 'Instrumenten-Dashboard', icon: '🏠' },
                  { id: 'cockpit', val: 'Unterrichts-Cockpit', icon: '🏫' },
                  { id: 'schueler', val: 'Schüler-Kartei', icon: '🧑‍🎓' },
                  { id: 'sitzplan', val: 'Sitzordnung / Plan', icon: '🗺️' },
                  { id: 'anwesenheit', val: 'Anwesenheitskontrolle', icon: '📌' },
                  { id: 'noten', val: 'Notenbuch & Arbeiten', icon: '📊' },
                  { id: 'wochenplanung', val: 'Wochen- & Stundenplan', icon: '📅' },
                  { id: 'materialien', val: 'Materialbibliothek', icon: '🎒' },
                  { id: 'ki-helfer', val: 'KI-Helfer Chat', icon: '🤖' },
                  { id: 'settings', val: 'Einstellungen', icon: '⚙️' }
                ].map((p) => {
                  const isActiveOnBoard = (app.currentPage || 'dashboard') === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setApp((prev: any) => ({ ...prev, currentPage: p.id }));
                        showFeedback(`Smartboard auf "${p.val}" umgeschaltet!`);
                      }}
                      className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 duration-100 ${
                        isActiveOnBoard 
                          ? 'bg-orange-500/20 border-orange-500 text-orange-200 shadow-md shadow-orange-500/10' 
                          : 'bg-black/20 border-white/5 text-stone-300 hover:bg-white/5'
                      }`}
                    >
                      <span className="text-[1.25rem] leading-normal leading-none">{p.icon}</span>
                      <span className="text-[0.59375rem] text-center font-extrabold tracking-tight leading-tight">{p.val}</span>
                      {isActiveOnBoard && (
                        <span className="text-[0.4375rem] font-black uppercase tracking-widest bg-orange-500 text-slate-950 px-1 border border-orange-300 rounded mt-0.5 animate-pulse">
                          Aktiv
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRESENTATION SOUND FX & CHANNELS */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                <Volume2 size={15} /> Soundeffekt-Soundboard
              </h3>
              <p className="text-[0.625rem] text-stone-400 leading-snug">
                Spiele Belohnungs- oder Warn-Sounds direkt über die Lautsprecher deines Smartboards ab:
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { type: 'tada', label: 'Tusch / Applaus 🎉', color: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20' },
                  { type: 'ping', label: 'Aufmerksamkeit 🔔', color: 'border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20' },
                  { type: 'fail', label: 'Upps / Fehler 💥', color: 'border-rose-500/30 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20' },
                  { type: 'laser', label: 'Quiz-Laser ⚡', color: 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20' }
                ].map((sfx) => (
                  <button
                    key={sfx.type}
                    onClick={() => {
                      setApp((p: any) => ({
                        ...p,
                        boardSettings: {
                          ...p.boardSettings,
                          remoteSoundToPlay: { type: sfx.type as any, timestamp: Date.now() }
                        }
                      }));
                      showFeedback(`Macht Sound "${sfx.type}" am Board...`);
                    }}
                    className={`py-2 px-3 border rounded-xl text-[0.625rem] font-bold text-center cursor-pointer active:scale-95 duration-100 ${sfx.color}`}
                  >
                    {sfx.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CLASSROOM COOP MODES */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                <Compass size={15} /> Bildwand-Modi & Hilfsmittel
              </h3>
              
              <div className="space-y-2">
                {/* Split mode */}
                <button
                  onClick={() => {
                    setApp((p: any) => ({
                      ...p,
                      boardSettings: {
                        ...p.boardSettings,
                        splitSmartboardMode: !p.boardSettings?.splitSmartboardMode
                      }
                    }));
                    showFeedback("Smartboard Split-Ansicht umschaltet!");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                    app.boardSettings?.splitSmartboardMode 
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' 
                      : 'bg-black/20 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[1.125rem] leading-normal">📺</span>
                    <div className="flex flex-col">
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider">Split-Smartboard Modus</span>
                      <span className="text-[0.5rem] opacity-75">Trennt Steuerung und Lehrer-Handy</span>
                    </div>
                  </div>
                  <span className={`text-[0.5rem] px-2 py-0.5 rounded font-black ${app.boardSettings?.splitSmartboardMode ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-stone-400'}`}>
                    {app.boardSettings?.splitSmartboardMode ? "AKTIV" : "AUS"}
                  </span>
                </button>

                {/* Focus / Presentation mode */}
                <button
                  onClick={() => {
                    const nextMode = !app.settings?.isFocusMode;
                    setApp((p: any) => ({
                      ...p,
                      settings: {
                        ...p.settings,
                        isFocusMode: nextMode
                      }
                    }));
                    showFeedback(`Fokusmodus ${nextMode ? 'aktiviert' : 'deaktiviert'}!`);
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                    app.settings?.isFocusMode 
                      ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                      : 'bg-black/20 border-white/5 text-stone-300 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[1.125rem] leading-normal">🧘</span>
                    <div className="flex flex-col">
                      <span className="text-[0.625rem] font-bold uppercase tracking-wider">Vollbild / Fokusmodus</span>
                      <span className="text-[0.5rem] opacity-75">Blendet Ablenkungen auf Wall aus</span>
                    </div>
                  </div>
                  <span className={`text-[0.5rem] px-2 py-0.5 rounded font-black ${app.settings?.isFocusMode ? 'bg-indigo-500 text-white' : 'bg-white/10 text-stone-400'}`}>
                    {app.settings?.isFocusMode ? "AKTIV" : "INAKTIV"}
                  </span>
                </button>

                {/* Message ticker input right inside panel */}
                <div className="bg-black/10 border border-white/5 rounded-xl p-3 space-y-2">
                  <span className="text-[0.53125rem] font-black uppercase text-orange-400 tracking-wider block">Ticker-Nachricht einblenden (Smartboard):</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="z.B. Bitte flüstern! Noch 5 Minuten..."
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-2 text-[0.6875rem] outline-none text-white focus:border-orange-500"
                      id="remoteTickerText"
                    />
                    <button
                      onClick={() => {
                        const val = (document.getElementById("remoteTickerText") as HTMLInputElement)?.value;
                        if (!val) return;
                        setApp((p: any) => ({
                          ...p,
                          boardSettings: {
                            ...p.boardSettings,
                            tickerText: val,
                            tickerTimestamp: Date.now()
                          }
                        }));
                        showFeedback("Ticker an Smartboard gesendet!");
                        (document.getElementById("remoteTickerText") as HTMLInputElement).value = "";
                      }}
                      className="px-3 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black rounded-lg text-[0.625rem] uppercase cursor-pointer"
                    >
                      Senden
                    </button>
                  </div>
                  {app.boardSettings?.tickerText && (
                    <div className="flex justify-between items-center bg-black/20 p-2 rounded border border-white/5">
                      <p className="text-[0.5625rem] text-emerald-400 text-wrap leading-tight break-words">Satz: "{app.boardSettings.tickerText}"</p>
                      <button
                        onClick={() => {
                          setApp((p: any) => ({
                            ...p,
                            boardSettings: {
                              ...p.boardSettings,
                              tickerText: undefined,
                              tickerTimestamp: undefined
                            }
                          }));
                          showFeedback("Ticker entfernt");
                        }}
                        className="text-[0.5rem] font-bold text-rose-455 uppercase leading-none pl-2"
                      >
                        Löschen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TABS: NOTEN & LEISTUNGSMARKER ======================= */}
        {activeTab === 'noten_tab' && (
          <div className="space-y-4 font-sans text-stone-200">
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider">
                  Mündliche Unterrichtsbeteiligung
                </h3>
                <p className="text-[0.625rem] text-stone-400 mt-0.5">
                  Fach: <strong className="text-white uppercase">{activeSubject}</strong> — Heute am {new Date(todayStr).toLocaleDateString('de-DE', { weekday: 'long' })}
                </p>
              </div>
              
              <select
                value={activeSubject}
                onChange={(e) => {
                  setApp((p: any) => ({
                    ...p,
                    boardSettings: {
                      ...p.boardSettings,
                      activeFach: e.target.value
                    }
                  }));
                  showFeedback(`Fach auf "${e.target.value}" gestellt!`);
                }}
                className="bg-black/50 border border-white/10 rounded-lg p-1.5 text-[0.625rem] font-bold text-white max-w-[124px]"
              >
                {Array.from(new Set([
                  "Deutsch", "Mathematik", "Sachunterricht", "Englisch", "Musik", "Kunst", "Sport", "Religion"
                ])).map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* LEISESTE SCHÜLER ZUERST (PEAK CLASSROOM ASSISTANT FEATURE) */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider">
                    Aufrufhelfer / Förderanzeiger
                  </h3>
                  <p className="text-[0.53125rem] text-stone-400">Leiseste Schüler (wenigste Mitarbeitspunkte heute) zuerst:</p>
                </div>
                <span className="text-[0.5rem] font-black uppercase tracking-widest bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 font-bold">
                  Fokus-Rolle
                </span>
              </div>
              
              <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar font-sans">
                {[...sortedStudents]
                  .sort((a, b) => {
                    const ptA = app.mitarbeit?.[a.id]?.[activeSubject]?.["1"] || 0;
                    const ptB = app.mitarbeit?.[b.id]?.[activeSubject]?.["1"] || 0;
                    return ptA - ptB; // ascending -> least participation points first!
                  })
                  .map(s => {
                    const points = app.mitarbeit?.[s.id]?.[activeSubject]?.["1"] || 0;
                    const isSelected = selectedNotenStudent === s.id;
                    
                    return (
                      <div 
                        key={`noten-s-${s.id}`}
                        onClick={() => setSelectedNotenStudent(isSelected ? null : s.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                          isSelected 
                            ? 'bg-black/35 border-orange-500/50 shadow-md' 
                            : 'bg-black/15 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[1.125rem] leading-normal shrink-0">{s.emoji || "🧑‍🎓"}</span>
                            <div className="text-wrap leading-tight break-words">
                              <span className="text-[0.75rem] leading-tight font-black text-white">{s.vorname} {s.nachname}</span>
                              <div className="flex gap-2">
                                <span className="text-[0.5rem] font-bold text-stone-400">Mitarbeit: <strong className="text-orange-400 font-bold">{points} Punkte</strong></span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {points === 0 && (
                              <span className="text-[0.46875rem] bg-orange-500/10 text-orange-400 border border-orange-500/20 font-black px-1.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                                Aufrufen!
                              </span>
                            )}
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveParticipation(s.id, e); }}
                                className="w-7 h-7 bg-black/40 text-stone-400 hover:text-white rounded-lg flex items-center justify-center font-bold text-[0.875rem] leading-snug cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleAddParticipation(s.id, e); }}
                                className="w-7 h-7 bg-orange-500 text-slate-950 font-black rounded-lg flex items-center justify-center text-[0.875rem] leading-snug cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expandable detailed grading / homework forms */}
                        {isSelected && (
                          <div className="border-t border-white/5 pt-2.5 mt-1 space-y-3" onClick={(e) => e.stopPropagation()}>
                            {/* Fast Grade Assigner */}
                            <div className="space-y-1">
                              <span className="text-[0.5rem] uppercase tracking-widest font-black text-amber-500">Mündliche Note eintragen:</span>
                              <div className="grid grid-cols-5 gap-1.5 pt-1">
                                {[1, 2, 3, 4, 5].map((g) => {
                                  return (
                                    <button
                                      key={g}
                                      onClick={() => {
                                        setApp((prev: any) => {
                                          const currentNoten = { ...prev.noten };
                                          if (!currentNoten[s.id]) currentNoten[s.id] = {};
                                          if (!currentNoten[s.id][activeSubject]) currentNoten[s.id][activeSubject] = {};
                                          if (!currentNoten[s.id][activeSubject]['1']) currentNoten[s.id][activeSubject]['1'] = {};
                                          
                                          const dateRaw = new Date().toISOString().split('T')[0];
                                          const newEntry = {
                                            id: "noten-grade-" + Date.now() + Math.random(),
                                            art: "Mitarbeitsprüfung (Handy)",
                                            note: g,
                                            gewichtung: 1.0,
                                            datum: dateRaw,
                                            kommentar: `Eingetragen über Mobile Remote Controller`
                                          };
                                          const currentList = currentNoten[s.id][activeSubject]['1'].arbeiten || [];
                                          
                                          const journalEntry = {
                                            id: "note-grade-journal-" + Date.now(),
                                            titel: `Mündliche Prüfung: Note ${g}`,
                                            inhalt: `Schüler wurde im Fach ${activeSubject} mündlich geprüft. Leistung wurde mit Note ${g} bewertet.`,
                                            icon: "📝",
                                            timestamp: Date.now(),
                                            schuelerId: s.id,
                                            kategorie: "Mitarbeit"
                                          };

                                          return {
                                            ...prev,
                                            noten: {
                                              ...currentNoten,
                                              [s.id]: {
                                                ...currentNoten[s.id],
                                                [activeSubject]: {
                                                  ...currentNoten[s.id][activeSubject],
                                                  '1': {
                                                    ...currentNoten[s.id][activeSubject]['1'],
                                                    arbeiten: [...currentList, newEntry]
                                                  }
                                                }
                                              }
                                            },
                                            notizen: [journalEntry, ...(prev.notizen || [])]
                                          };
                                        });
                                        showFeedback(`Note ${g} eingetragen für ${s.vorname}!`);
                                        setSelectedNotenStudent(null);
                                      }}
                                      className={`py-2 border rounded-xl text-[0.6875rem] font-black uppercase text-center active:scale-95 duration-100 cursor-pointer ${
                                        g === 1 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' :
                                        g === 2 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20' :
                                        g === 3 ? 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20' :
                                        g === 4 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' :
                                        'bg-rose-500/10 text-rose-455 border-rose-500/20 hover:bg-rose-500/20'
                                      }`}
                                    >
                                      {g}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            
                            {/* Missing homework / materials inside expandable card */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleOmissionHue(s.id, 'increment')}
                                className="py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 duration-100 cursor-pointer"
                              >
                                🏠 HÜ vergessen (+1)
                              </button>
                              <button
                                onClick={() => {
                                  handleOmissionMaterial(s.id, "Schulzeug", "🎒");
                                  handleOmissionMaterial(s.id, "Schreibzeug/Heft", "🎒");
                                  showFeedback("Material vergessen erfasst!");
                                }}
                                className="py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 duration-100 cursor-pointer"
                              >
                                🎒 Material fehlt
                              </button>
                            </div>
                            
                            {/* Open dossier button */}
                            <button
                              onClick={() => {
                                setApp((p: any) => ({
                                  ...p,
                                  currentPage: 'schueler',
                                  selectedStudentId: s.id
                                }));
                                showFeedback(`Dossier auf großer Leinwand aktiv!`);
                              }}
                              className="w-full py-2.5 bg-slate-800 hover:bg-orange-500 hover:text-slate-950 border border-white/5 hover:border-transparent text-stone-300 rounded-lg text-[0.5625rem] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1 cursor-pointer active:scale-95"
                            >
                              🖥️ Schülerprofil groß zeigen
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TABS: KI ASSISTENT ======================= */}
        {activeTab === 'ki_tab' && (
          <div className="space-y-4 font-sans text-stone-200">
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider flex items-center gap-2 font-bold">
                <Bot size={15} /> KI-Assistent am Smartboard
              </h3>
              <p className="text-[0.625rem] text-stone-400 leading-snug">
                Sende Anweisungen an den KI-Assistenten. Die Antwort wird sofort in Echtzeit auf der großen Leinwand für alle sichtbar gerendert:
              </p>

              {/* Text Area */}
              <div className="space-y-2 mt-2">
                <textarea
                  placeholder="Frag den Bot für die Kinder, z.B. Generiere ein kurzes Blitzquiz zu Prozentrechnen..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-[0.75rem] leading-tight text-white min-h-[90px] outline-none focus:border-orange-500"
                  value={aiPromptInput}
                  onChange={(e) => setAiPromptInput(e.target.value)}
                />
                
                <button
                  onClick={() => {
                    const txt = aiPromptInput.trim();
                    if (!txt) return;
                    setApp((p: any) => ({
                      ...p,
                      currentPage: 'ki-helfer',
                      boardSettings: {
                        ...p.boardSettings,
                        activeAIPrompt: {
                          text: txt,
                          timestamp: Date.now()
                        }
                      }
                    }));
                    showFeedback("KI Prompt gesendet! Antworte am Smartboard...");
                    setAiPromptInput("");
                  }}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black rounded-xl text-[0.75rem] leading-tight uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <Send size={13} /> Senden & auf Smartboard starten!
                </button>
              </div>
            </div>

            {/* PRE-MADE TEMPLATE TRIGGERS */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2 font-bold">
                <Sparkles size={14} /> Vorlagen für die Klasse
              </h3>
              
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "💡 Blitzquiz generieren", txt: "Erstelle ein schnelles Quiz mit 3 einfachen Multiple-Choice-Fragen zum selbstständigen Arbeiten passend zum Schulfach " + activeSubject },
                  { label: "🦊 Morgen-Rätsel erzeugen", txt: "Generiere ein kurzes, spannendes Rätsel oder logisches Denkspiel am Morgen für Volksschulkinder, um das Mitdenken anzuregen." },
                  { label: "🤫 Gedicht über Achtsamkeit", txt: "Schreibe ein kurzes, lustiges Gedicht über Ruhe, respektvolles Miteinander und Konzentration" },
                  { label: "🍎 Motivierender Spruch", txt: "Formuliere einen motivierenden und positiven Tagesspruch oder Spruch des Tages für das aktuelle Schulfach " + activeSubject },
                  { label: "🎯 Rechengeschichte erstellen", txt: "Generiere eine spannende Mathematik-Textaufgabe verpackt in eine Kurzgeschichte mit Piraten oder Fabelwesen für Kinder." }
                ].map((tmpl) => (
                  <button
                    key={tmpl.label}
                    onClick={() => {
                      setApp((p: any) => ({
                        ...p,
                        currentPage: 'ki-helfer',
                        boardSettings: {
                          ...p.boardSettings,
                          activeAIPrompt: {
                            text: tmpl.txt,
                            timestamp: Date.now()
                          }
                        }
                      }));
                      showFeedback("Schnellvorlage übertragen!");
                    }}
                    className="p-3 bg-black/20 hover:bg-white/5 border border-white/5 hover:border-orange-500/20 text-left rounded-xl flex items-center justify-between cursor-pointer active:scale-95 transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-[0.625rem] font-black text-white">{tmpl.label}</span>
                      <span className="text-[0.5rem] text-stone-400 text-wrap leading-tight break-words max-w-[280px]">Inhalt: {tmpl.txt}</span>
                    </div>
                    <span className="text-[0.75rem] leading-tight text-orange-500">➜</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TABS: SCHÜLER ======================= */}
        {activeTab === 'schueler' && (
          <div className="space-y-3.5">
            
            {/* SUBJECT & DIRECT ACTION TOOLBAR */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950/40 border border-white/5 rounded-2xl p-3">
              <div className="flex flex-col justify-center px-1">
                <span className="text-[0.5rem] font-black uppercase text-stone-500 tracking-wider">Aktives Unterrichtsfach</span>
                <select
                  value={activeSubject}
                  onChange={(e) => {
                    setApp((p: any) => ({
                      ...p,
                      boardSettings: {
                        ...p.boardSettings,
                        activeFach: e.target.value
                      }
                    }));
                    showFeedback(`Fach auf "${e.target.value}" gestellt!`);
                  }}
                  className="mt-1 bg-slate-900 border border-white/10 rounded-lg p-1 text-[0.75rem] leading-tight font-black text-orange-400 uppercase outline-none focus:border-orange-500 cursor-pointer"
                >
                  {(app.faecher || FAECHER_ALLE).map((sub: string) => (
                    <option key={sub} value={sub} className="bg-slate-900 font-bold text-white normal-case">{sub}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleMarkAllPresent}
                  className="w-full py-2 bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-xl text-[0.5625rem] font-black uppercase tracking-wider cursor-pointer text-center flex items-center justify-center gap-1 transition-all"
                >
                  <UserCheck size={11} /> Alle Anwesend 🟢
                </button>
                <button
                  onClick={drawRandomLotto}
                  className="w-full py-2 bg-amber-600/25 border border-amber-500/30 text-amber-300 hover:bg-amber-600 hover:text-white rounded-xl text-[0.5625rem] font-black uppercase tracking-wider cursor-pointer text-center flex items-center justify-center gap-1 transition-all"
                >
                  🎯 Lotto Gewinner
                </button>
              </div>
            </div>

            {/* SEARCH CONTAINER */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-stone-500" />
              <input
                type="text"
                placeholder="Schüler suchen..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-3 text-[0.75rem] leading-tight font-semibold outline-none focus:border-orange-500 text-stone-100 placeholder-stone-500 shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="absolute right-3 top-3 text-[0.625rem] font-black text-stone-500 hover:text-white uppercase leading-none"
                >
                  leeren
                </button>
              )}
            </div>

            {/* FILTERED SCHÜLER LIST */}
            <div className="space-y-2.5">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-10 bg-slate-950/20 border border-white/5 border-dashed rounded-2xl text-stone-500 text-[0.75rem] leading-tight font-bold uppercase tracking-widest">
                  Keine Schüler gefunden...
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isExpanded = expandedStudentId === s.id;
                  const partsCount = app.mitarbeit?.[s.id]?.[activeSubject]?.["1"] || 0;
                  
                  // Attendance Mode
                  const attData = app.anwesenheit[s.id]?.[todayStr] || {};
                  const checkInList = Object.values(attData);
                  const isExcused = checkInList.includes('e');
                  const isUnexcused = checkInList.includes('u');
                  
                  let attStatus: 'present' | 'e' | 'u' = 'present';
                  if (isExcused) attStatus = 'e';
                  else if (isUnexcused) attStatus = 'u';

                  // Behavior status
                  const currentStageId = app.behavior_status?.[s.id] || defaultStageId;
                  const studentStage = stages.find((stg: any) => stg.id === currentStageId) || stages[2] || defaultStages[2];

                  // Homework counts on active subject
                  const activeHueCount = app.noten?.[s.id]?.[activeSubject]?.[ '1' ]?.hue || 0;

                  return (
                    <div 
                      key={s.id} 
                      className={`rounded-2xl border transition-all  ${
                        isExpanded 
                          ? 'bg-slate-950 border-orange-500/40 shadow-xl' 
                          : 'bg-slate-950/60 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {/* COMPACT BASIC CELL */}
                      <div 
                        onClick={() => setExpandedStudentId(isExpanded ? null : s.id)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          {/* Emoji avatar with dynamic behavior colored rings */}
                          <div className={`relative w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 ${
                            currentStageId === "1" ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                            currentStageId === "2" ? "border-blue-500 bg-blue-500/10 shadow-[0_0_8px_rgba(59,130,246,0.3)]" :
                            currentStageId === "3" ? "border-slate-500 bg-slate-500/10 shadow-[0_0_8px_rgba(148,163,184,0.3)]" :
                            currentStageId === "4" ? "border-amber-500 bg-amber-500/10 shadow-[0_0_8px_rgba(245,158,11,0.3)]" :
                            currentStageId === "5" ? "border-rose-500 bg-rose-500/10 shadow-[0_0_8px_rgba(239,68,68,0.3)]" :
                            "border-white/10 bg-white/5"
                          }`}>
                            <span className="text-[1.25rem] leading-normal leading-none">{s.emoji || "🧑‍🎓"}</span>
                            <span className="absolute -bottom-1 -right-1 text-[0.625rem] bg-slate-900 border border-white/10 rounded-full w-5 h-5 flex items-center justify-center">
                              {studentStage.icon}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="font-extrabold text-[0.75rem] leading-tight text-white text-wrap leading-tight break-words flex items-center gap-1.5">
                              <span>{s.vorname} {s.nachname}</span>
                              {activeHueCount > 0 && (
                                <span className="bg-rose-500/25 text-rose-300 text-[0.5rem] font-black px-1 rounded-sm border border-rose-500/30" title={`${activeHueCount} Hausübung vergessen`}>
                                  🏠 {activeHueCount}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[0.5rem] font-black bg-slate-900 px-1.5 py-0.5 rounded border border-white/5 text-stone-400">
                                {activeSubject}: <strong className="text-orange-400 font-mono font-black">{partsCount} P.</strong>
                              </span>
                              
                              {/* Quick Presence Dot */}
                              <span className={`text-[0.53125rem] font-black flex items-center gap-1 px-1.5 py-0.5 rounded ${
                                attStatus === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                                attStatus === 'e' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-rose-500/10 text-rose-400'
                              }`}>
                                {attStatus === 'present' ? "Da" : attStatus === 'e' ? "Entsch." : "Fehlt"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          {mainMode === 'unterricht' && (
                            <>
                              <button
                                onClick={(e) => handleRemoveParticipation(s.id, e)}
                                className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-stone-400 hover:text-rose-400 font-black cursor-pointer active:scale-90 transition-all shadow-inner"
                                title="Mitarbeit minus 1"
                              >
                                <Minus size={15} strokeWidth={3} />
                              </button>
                              <button
                                onClick={(e) => handleAddParticipation(s.id, e)}
                                className="w-11 h-11 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 flex items-center justify-center font-black cursor-pointer active:scale-90 transition-all shadow-lg"
                                title="Mitarbeit plus 1"
                              >
                                <Plus size={18} strokeWidth={3} />
                              </button>
                            </>
                          )}
                          <div className="text-stone-500 pl-0.5 pointer-events-none">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div> </div>

                        {/* ======================= EXPANDABLE DETAIL VIEW FOR SCHÜLER TAB ======================= */}
                        {isExpanded && (
                          <div className="border-t border-white/5 bg-slate-950/60 p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                            
                            {/* BLOCK 1: SUBJECT & PARTICIPATION (Mitarbeit & Fach wechselln) */}
                            <div className="space-y-3.5">
                              <div className="flex justify-between items-center bg-black/35 p-2 rounded-xl border border-white/5">
                                <span className="text-[0.625rem] font-black uppercase text-amber-500 tracking-wider">Mitarbeit ({activeSubject})</span>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => handleRemoveParticipation(s.id, e)}
                                    className="w-8 h-8 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 flex items-center justify-center font-black text-[0.875rem] leading-snug cursor-pointer active:scale-90 transition-all"
                                    title="Mitarbeit minus 1"
                                  >
                                    -
                                  </button>
                                  <span className="text-[0.75rem] leading-tight font-mono font-black text-white px-2">{partsCount} P.</span>
                                  <button
                                    onClick={(e) => handleAddParticipation(s.id, e)}
                                    className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 flex items-center justify-center font-black text-[0.875rem] leading-snug cursor-pointer active:scale-90 transition-all"
                                    title="Mitarbeit plus 1"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2.5">
                                <span className="text-[0.5625rem] font-black text-stone-400 uppercase tracking-widest shrink-0">Fach wechseln:</span>
                                <select
                                  value={activeSubject}
                                  onChange={(e) => {
                                    setApp((p: any) => ({
                                      ...p,
                                      boardSettings: {
                                        ...p.boardSettings,
                                        activeFach: e.target.value
                                      }
                                    }));
                                    showFeedback(`Fach auf "${e.target.value}" gestellt!`);
                                  }}
                                  className="flex-grow bg-slate-900 border border-white/10 rounded-lg p-2 text-[0.75rem] leading-tight font-bold text-white cursor-pointer"
                                >
                                  {(app.faecher || FAECHER_ALLE).map((sub: string) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* BLOCK 1.5: ANWESENHEITSKONTROLLE */}
                            <div className="space-y-2 pt-3 border-t border-white/5">
                              <span className="text-[0.625rem] font-black uppercase text-amber-500 tracking-wider block">Anwesenheitskontrolle:</span>
                              <div className="grid grid-cols-3 bg-slate-900 border border-white/10 rounded-xl p-1 gap-1">
                                <button
                                  onClick={() => handleToggleAttendance(s.id, 'present')}
                                  className={`py-2 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                                    attStatus === 'present' 
                                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold' 
                                      : 'text-stone-400 hover:text-white hover:bg-white/5 font-bold'
                                  }`}
                                >
                                  🟢 Da
                                </button>
                                <button
                                  onClick={() => handleToggleAttendance(s.id, 'e')}
                                  className={`py-2 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                                    attStatus === 'e' 
                                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                                      : 'text-stone-400 hover:text-white hover:bg-white/5 font-bold'
                                  }`}
                                >
                                  🟡 Entschuldigt
                                </button>
                                <button
                                  onClick={() => handleToggleAttendance(s.id, 'u')}
                                  className={`py-2 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer ${
                                    attStatus === 'u' 
                                      ? 'bg-rose-500 text-white shadow-md font-extrabold' 
                                      : 'text-stone-400 hover:text-white hover:bg-white/5 font-bold'
                                  }`}
                                >
                                  🔴 Fehlt
                                </button>
                              </div>
                            </div>

                            {/* BLOCK 2: BEHAVIOR STATUS (Traffic Lights Ampel) */}
                            <div className="space-y-2 pt-3 border-t border-white/5">
                              <span className="text-[0.625rem] font-black uppercase text-amber-500 tracking-wider block">Verhalten ändern:</span>
                              <div className="grid grid-cols-5 gap-1.5">
                                {stages.map((stg: any) => {
                                  const isActive = currentStageId === stg.id;
                                  
                                  // Determine dynamic styling based on stage ID
                                  let btnStyle = "bg-white/5 border-white/10 text-stone-400";
                                  if (stg.id === "1") {
                                    btnStyle = isActive 
                                      ? "bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-[0_0_12px_rgba(16,185,129,0.5)]" 
                                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20";
                                  } else if (stg.id === "2") {
                                    btnStyle = isActive 
                                      ? "bg-blue-500 text-slate-950 border-blue-400 font-extrabold shadow-[0_0_12px_rgba(59,130,246,0.5)]" 
                                      : "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20";
                                  } else if (stg.id === "3") {
                                    btnStyle = isActive 
                                      ? "bg-slate-500 text-stone-950 border-slate-400 font-extrabold shadow-[0_0_12px_rgba(148,163,184,0.5)]" 
                                      : "bg-slate-500/10 border-slate-500/20 text-slate-400 hover:bg-slate-500/20";
                                  } else if (stg.id === "4") {
                                    btnStyle = isActive 
                                      ? "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-[0_0_12px_rgba(245,158,11,0.5)]" 
                                      : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20";
                                  } else if (stg.id === "5") {
                                    btnStyle = isActive 
                                      ? "bg-rose-500 text-white border-rose-400 font-extrabold shadow-[0_0_12px_rgba(239,68,68,0.5)]" 
                                      : "bg-rose-500/10 border-rose-500/10 text-rose-400 hover:bg-rose-500/20";
                                  }

                                  return (
                                    <button
                                      key={stg.id}
                                      onClick={() => {
                                        handleSetStudentBehavior(s.id, stg.id);
                                        if (stg.id === "4" || stg.id === "5") {
                                          showFeedback(`Verwarnung: ${stg.label}`);
                                        }
                                      }}
                                      className={`py-2 px-1 border rounded-xl text-center active:scale-95 duration-100 cursor-pointer flex flex-col items-center justify-center gap-1 ${btnStyle}`}
                                      title={stg.label}
                                    >
                                      <span className="text-[0.875rem] leading-snug leading-none">{stg.icon}</span>
                                      <span className="text-[0.46875rem] font-black uppercase tracking-tight leading-none shrink-0 text-wrap leading-tight break-words max-w-[55px]">
                                        {stg.label}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* BLOCK 3: NOTES (Notizen machen) */}
                            <div className="space-y-2 pt-3 border-t border-white/5">
                              <div className="flex justify-between items-center">
                                <span className="text-[0.625rem] font-black uppercase text-amber-500 tracking-wider">Verhaltensnotiz für {s.vorname}:</span>
                                <span className="text-[0.5rem] text-stone-500 uppercase tracking-wider font-extrabold">Am Smartboard einsehbar</span>
                              </div>
                              
                              <textarea
                                value={studentNotes[s.id] || ''}
                                placeholder="z.B. Hat heute den Unterricht massiv gestört oder Zeigte hervorragende Mitarbeit!"
                                onChange={(e) => setStudentNotes(prev => ({ ...prev, [s.id]: e.target.value }))}
                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[0.65625rem] font-semibold text-stone-200 outline-none focus:border-orange-500 placeholder-stone-600 leading-normal resize-none shadow-inner"
                                rows={2.5}
                              />
                              
                              {/* Quick tags to easily write logs */}
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { label: "🚨 Stört Unterricht", text: "Stört Unterricht aktiv." },
                                  { label: "🤫 Unruhig", text: "Ist sehr unruhig und spricht." },
                                  { label: "💤 Hausaufgabe fehlt", text: "Hausaufgabe fehlt." },
                                  { label: "🎒 Material fehlt", text: "Unterrichtsmaterial fehlt." },
                                  { label: "🤝 Sehr fleißig", text: "Zeigt erstklassige Mitarbeit!" },
                                  { label: "✨ Hilfsbereit", text: "Arbeitet sehr kooperativ." },
                                ].map((tag) => (
                                  <button
                                    key={tag.label}
                                    onClick={() => {
                                      const currentVal = studentNotes[s.id] || '';
                                      const nextVal = currentVal ? `${currentVal} ${tag.text}` : tag.text;
                                      setStudentNotes(prev => ({ ...prev, [s.id]: nextVal }));
                                    }}
                                    className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[0.53125rem] font-bold text-stone-300 rounded hover:text-white cursor-pointer"
                                  >
                                    {tag.label}
                                  </button>
                                ))}
                              </div>

                              <div className="flex items-center justify-end gap-2 pt-1">
                                {studentNotes[s.id]?.trim() && (
                                  <button
                                    onClick={() => setStudentNotes(prev => ({ ...prev, [s.id]: '' }))}
                                    className="px-2.5 py-1.5 text-[0.5625rem] font-black uppercase bg-slate-800 border border-white/5 text-stone-400 rounded-lg hover:text-white"
                                  >
                                    Leeren
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAddStudentNote(s.id, studentNotes[s.id] || '')}
                                  disabled={!(studentNotes[s.id]?.trim())}
                                  className={`px-3 py-1.5 text-[0.5625rem] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 ${
                                    (studentNotes[s.id]?.trim())
                                      ? "bg-orange-500 hover:bg-orange-400 text-slate-950 cursor-pointer shadow-md active:scale-95" 
                                      : "bg-white/5 text-stone-500 border border-white/5 cursor-not-allowed"
                                  }`}
                                >
                                  <Send size={10} /> Speichern
                                </button>
                              </div>
                            </div>

                          </div>
                        )}

                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* ======================= TABS: ANWEISUNG ======================= */}
        {activeTab === 'anweisung' && (
          <div className="space-y-4">
            
            {/* 1. SECTOR: ARBEITSANWEISUNG FIELD */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[0.75rem] leading-tight font-black uppercase text-stone-300 tracking-wider flex items-center gap-1.5">
                  <BookOpen size={13} className="text-orange-400" /> Arbeitsauftrag (Anweisung)
                </h3>
                <span className="text-[0.5rem] text-emerald-400 font-extrabold uppercase tracking-widest animate-pulse border border-emerald-500/20 bg-emerald-500/5 px-1.5 py-0.5 rounded">
                  Live Smartboard Sync
                </span>
              </div>

              <textarea
                className="w-full h-32 bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-[0.75rem] leading-tight font-medium text-stone-200 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/40 leading-relaxed resize-none shadow-inner"
                value={app.vertretungHinweise || ""}
                placeholder="Gebe hier wichtige Hinweise, Aufgaben oder Arbeitsanweisungen ein. Diese werden direkt am Smartboard dargestellt..."
                onChange={(e) => setApp((prev: any) => ({
                  ...prev,
                  vertretungHinweise: e.target.value
                }))}
              />

              {/* Suggestions quick tags */}
              <div className="space-y-1.5">
                <span className="text-[0.5rem] font-black text-stone-500 uppercase tracking-wider block">Schnell-Vorlagen für Anweisungsfeld:</span>
                <div className="flex flex-wrap gap-1.5">
                  {instructionTemplates.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        setApp((prev: any) => ({
                          ...prev,
                          vertretungHinweise: item.text
                        }));
                        showFeedback(`Vorlage "${item.label}" kopiert!`);
                      }}
                      className="py-1 px-2.5 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[0.5625rem] font-black tracking-normal uppercase text-orange-300 hover:text-orange-200 rounded-lg transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. SECTOR: ACTIVE WIDGET TOGGLES */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-stone-300 tracking-wider flex items-center gap-1.5">
                <Monitor size={13} className="text-orange-400" /> Smartboard Widgets steuern
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "timer", label: "⏱️ Timer" },
                  { id: "ampel", label: "🚦 Lärmampel" },
                  { id: "klassenglas", label: "🫙 Klassenglas" },
                  { id: "lottowinner", label: "🎯 Lotto" },
                  { id: "groups", label: "👥 Gruppen-Gen" },
                  { id: "poll", label: "📊 Umfrage" },
                  { id: "luuise", label: "📈 Luuise" },
                  { id: "todo", label: "✅ Checklist" },
                  { id: "qrcode", label: "📱 QR Code" },
                  { id: "sticky", label: "📌 Sticky Note" },
                  { id: "pause", label: "☕ Pause" },
                  { id: "tagesplan", label: "📅 Tagesplan" },
                  { id: "termine", label: "🗓️ Termine" },
                  { id: "riddle", label: "🧩 Morgenrätsel" },
                  { id: "quiz", label: "🎯 KI Quiz" },
                  { id: "mindmap", label: "🧠 Mindmap" },
                  { id: "dienste", label: "🧹 Klassendienste" }
                ].map(w => {
                  const active = (app.boardWidgets || []).some((item: any) => item.type === w.id);
                  return (
                    <button
                      key={w.id}
                      onClick={() => toggleWidgetRemote(w.id)}
                      className={`py-3 px-3 rounded-xl border text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                        active 
                          ? 'bg-orange-500/10 border-orange-500/35 text-orange-300 font-extrabold shadow-sm' 
                          : 'bg-slate-900 border-white/5 text-stone-400 hover:bg-slate-855'
                      }`}
                    >
                      <span className="text-wrap leading-tight break-words">{w.label}</span>
                      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'bg-emerald-400 animate-pulse' : 'bg-stone-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SECTOR: REMOTELY ADJUST WIDGET COORDINATES */}
            {(app.boardWidgets || []).length > 0 && (
              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-4">
                <h3 className="text-[0.75rem] leading-tight font-black uppercase text-stone-300 tracking-wider flex items-center gap-1.5">
                  <Monitor size={13} className="text-orange-405" /> Widgets verschieben & skalieren
                </h3>
                
                <p className="text-[0.59375rem] text-stone-500 leading-tight">
                  Verschiebe das ausgewählte Widget direkt am Smartboard mittels Richtungskreuz:
                </p>

                <div className="space-y-4.5 divide-y divide-white/5">
                  {(app.boardWidgets || []).map((w: any) => {
                    const widgetLabels: Record<string, string> = {
                      timer: 'Timer ⏱️',
                      ampel: 'Lärmampel 🚦',
                      klassenglas: 'Klassenglas 🫙',
                      lottowinner: 'Lotto 🎯',
                      groups: 'Gruppen 👥',
                      poll: 'Umfrage 📊',
                      luuise: 'Luuise-Feedback 📈',
                      todo: 'Checkliste ✅',
                      qrcode: 'QR Code 📱',
                      sticky: 'Notizzettel 📌',
                      pause: 'Pause ☕',
                      tagesplan: 'Tagesplan 📅',
                      termine: 'Termine 🗓️',
                      riddle: 'Morgenrätsel 🧩',
                      quiz: 'KI Quiz 🎯',
                      mindmap: 'Mindmap / Pinnwand 🧠',
                      dienste: 'Klassendienste 🧹'
                    };
                    const label = widgetLabels[w.type] || w.type;

                    return (
                      <div key={w.id} className="pt-3 first:pt-0 space-y-2">
                        <div className="flex justify-between items-center bg-slate-900/80 p-2 rounded-xl border border-white/5">
                          <span className="text-[0.625rem] font-black text-stone-300 uppercase tracking-widest leading-none">{label}</span>
                          <span className="text-[0.5625rem] font-bold text-stone-500 font-mono">X:{Math.round(w.x)} Y:{Math.round(w.y)}</span>
                        </div>

                        {/* Joystick cross & zooming */}
                        <div className="flex gap-4 items-center justify-center">
                          {/* Sizing indicators */}
                          <div className="flex flex-col gap-1.5 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5 shrink-0">
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'grow')}
                              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-black text-orange-300 flex items-center justify-center cursor-pointer shadow-md"
                              title="Vergroessern"
                            >
                              <ZoomIn size={14} />
                            </button>
                            <span className="text-[0.5rem] font-bold text-stone-500 uppercase text-center leading-none">Größe</span>
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'shrink')}
                              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 font-black text-orange-300 flex items-center justify-center cursor-pointer shadow-md"
                              title="Verkleinern"
                            >
                              <ZoomOut size={14} />
                            </button>
                          </div>

                          {/* D-Pad Controller */}
                          <div className="relative w-28 h-28 shrink-0 bg-slate-900 border border-white/5 rounded-full flex items-center justify-center shadow-inner">
                            {/* UP button */}
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'up')}
                              className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-550 border border-orange-500/20 text-orange-300 hover:text-slate-950 flex items-center justify-center font-bold flex-col cursor-pointer"
                              title="Up"
                            >
                              <ArrowUp size={13} />
                            </button>

                            {/* DOWN button */}
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'down')}
                              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-550 border border-orange-500/20 text-orange-300 hover:text-slate-950 flex items-center justify-center font-bold flex-col cursor-pointer"
                              title="Down"
                            >
                              <ArrowDown size={13} />
                            </button>

                            {/* LEFT button */}
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'left')}
                              className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-550 border border-orange-500/20 text-orange-300 hover:text-slate-950 flex items-center justify-center font-bold flex-row cursor-pointer"
                              title="Left"
                            >
                              <ArrowLeft size={13} />
                            </button>

                            {/* RIGHT button */}
                            <button
                              onClick={() => handleAdjustWidgetLayout(w.id, 'right')}
                              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-orange-500/10 hover:bg-orange-550 border border-orange-500/20 text-orange-300 hover:text-slate-950 flex items-center justify-center font-bold flex-row cursor-pointer"
                              title="Right"
                            >
                              <ArrowRight size={13} />
                            </button>

                            <div className="w-6 h-6 rounded-full bg-slate-805 border border-white/10" />
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 4. SECTOR: MERGED NESTED WIDGETS CONFIGURATION PANELS */}
            
            {/* timer config */}
            {(app.boardWidgets || []).some((w: any) => w.type === 'timer') && (
              <div className="bg-slate-900/85 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center bg-black/15 p-2 rounded-xl">
                  <span className="text-[0.5625rem] font-black text-orange-300 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12} /> Timer Feinsteuerung:
                  </span>
                  <span className="text-[0.625rem] font-mono font-black uppercase text-emerald-400 animate-pulse">
                    {app.boardSettings?.timerRunning ? 'Läuft' : 'Pausiert'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[3, 5, 10, 15].map(m => (
                    <button
                      key={m}
                      onClick={() => handleSetTimerMinutes(m)}
                      className="py-2.5 bg-slate-900 border border-white/5 text-[0.75rem] leading-tight text-white hover:text-orange-300 hover:border-orange-500/20 rounded-xl cursor-pointer font-black"
                    >
                      {m} Min.
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const isRunning = app.boardSettings?.timerRunning;
                      setApp((prev: any) => ({
                        ...prev,
                        boardSettings: {
                          ...prev.boardSettings,
                          timerRunning: !isRunning
                        }
                      }));
                    }}
                    className={`py-3.5 px-4 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider border cursor-pointer flex items-center justify-center gap-1.5 transition-all ${
                      app.boardSettings?.timerRunning 
                        ? 'bg-amber-600/15 border-amber-500/25 text-amber-305' 
                        : 'bg-emerald-600/15 border-emerald-500/25 text-emerald-305'
                    }`}
                  >
                    {app.boardSettings?.timerRunning ? <Pause size={14} /> : <Play size={14} />}
                    {app.boardSettings?.timerRunning ? 'Timer Pausieren' : 'Timer Starten'}
                  </button>

                  <button
                    onClick={handleResetTimer}
                    className="py-3.5 px-4 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider border border-white/10 bg-slate-900 text-stone-300 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw size={14} /> Zurücksetzen
                  </button>
                </div>

                <div className="flex gap-2.5 items-center justify-center pt-2.5 border-t border-white/5">
                  <button
                    onClick={() => handleAdjustTimerMinutes(-1)}
                    className="w-14 py-2 bg-slate-900 border border-white/5 text-[0.75rem] leading-tight text-stone-300 rounded-xl flex items-center justify-center cursor-pointer font-bold active:bg-slate-800"
                  >
                    -1 Min.
                  </button>
                  <div className="flex-1 max-w-[120px] flex items-center gap-1">
                    <input 
                      type="number" 
                      id="remote-timer-custom"
                      placeholder="Min..."
                      className="w-full bg-slate-900 border border-white/10 text-white rounded-lg text-[0.75rem] leading-tight font-bold text-center h-8 outline-none focus:border-amber-500"
                    />
                    <button 
                      onClick={() => {
                        const val = parseInt((document.getElementById('remote-timer-custom') as HTMLInputElement).value || '0');
                        if (val > 0) handleSetTimerMinutes(val);
                      }}
                      className="h-8 px-2 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 font-black rounded-lg text-[0.625rem] uppercase border border-amber-500/20"
                    >
                      Set
                    </button>
                  </div>
                  <button
                    onClick={() => handleAdjustTimerMinutes(1)}
                    className="w-14 py-2 bg-slate-900 border border-white/5 text-[0.75rem] leading-tight text-stone-300 rounded-xl flex items-center justify-center cursor-pointer font-bold active:bg-slate-800"
                  >
                    +1 Min.
                  </button>
                </div>
              </div>
            )}

            {/* noise ampel config */}
            {(app.boardWidgets || []).some((w: any) => w.type === 'ampel') && (
              <div className="bg-slate-900/85 border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-[0.5625rem] font-black text-orange-300 uppercase tracking-widest flex items-center gap-1.5 block">
                  <Plus size={12} /> Ampelfarbe steuern (Manuelles Ampelschalten):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'gruen', color: 'bg-emerald-500 text-emerald-950 font-black', hoverRing: 'ring-emerald-400', emoji: '🟢 Grün' },
                    { id: 'gelb', color: 'bg-amber-500 text-amber-950 font-black', hoverRing: 'ring-amber-400', emoji: '🟡 Gelb' },
                    { id: 'rot', color: 'bg-rose-500 text-rose-950 font-black', hoverRing: 'ring-rose-450', emoji: '🔴 Rot' }
                  ].map(phase => (
                    <button
                      key={phase.id}
                      onClick={() => setApp((prev: any) => ({ ...prev, ampel_status: phase.id }))}
                      className={`py-3.5 px-1 rounded-xl text-[0.75rem] leading-tight font-black uppercase tracking-wider transition-all cursor-pointer border ${
                        app.ampel_status === phase.id 
                          ? `${phase.color} shadow-lg ring-4 ${phase.hoverRing}/30 border-white/35 scale-105` 
                          : 'bg-slate-900 text-stone-400 border-white/5 hover:bg-slate-800'
                      }`}
                    >
                      {phase.emoji}
                    </button>
                  ))}
                </div>
                <p className="text-[0.5625rem] text-stone-500 italic text-center leading-normal">
                  Ändert den Status der Lärmampel für alle Schüler direkt am Hauptbildschirm in Echtzeit.
                </p>
              </div>
            )}

            {/* classenglas marbles config */}
            {(app.boardWidgets || []).some((w: any) => w.type === 'klassenglas') && (
              <div className="bg-slate-900/85 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-[0.5625rem] font-black text-orange-300 uppercase tracking-widest border-b border-white/5 pb-2">
                  <span>💎 Klassenglas Belohnungen:</span>
                  <span className="font-mono text-emerald-405 text-[0.875rem] leading-snug font-black">{app.klassenglas_count || 0} / {app.klassenglas_ziel || 100} Murmeln</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setApp((prev: any) => ({ ...prev, klassenglas_count: Math.max(0, (prev.klassenglas_count || 0) - 1) }))}
                    className="py-3 px-1 rounded-xl bg-slate-900 border border-white/5 text-[0.75rem] leading-tight text-rose-350 hover:bg-slate-800 font-black uppercase cursor-pointer text-center"
                  >
                    -1 Murmel
                  </button>
                  <button
                    onClick={() => setApp((prev: any) => ({ ...prev, klassenglas_count: (prev.klassenglas_count || 0) + 1 }))}
                    className="py-3 px-1 rounded-xl bg-emerald-600/15 border border-emerald-500/25 text-[0.75rem] leading-tight text-emerald-300 font-black uppercase cursor-pointer text-center hover:bg-emerald-600/25"
                  >
                    +1 Murmel
                  </button>
                  <button
                    onClick={() => setApp((prev: any) => ({ ...prev, klassenglas_count: (prev.klassenglas_count || 0) + 5 }))}
                    className="py-3 px-1 rounded-xl bg-emerald-600 text-slate-950 border border-emerald-400 font-extrabold text-[0.75rem] leading-tight uppercase cursor-pointer text-center hover:bg-emerald-500"
                  >
                    +5 Murmeln
                  </button>
                </div>
              </div>
            )}

            {/* sticky config */}
            {(app.boardWidgets || []).filter((w: any) => w.type === 'sticky').map((w: any, idx: number) => (
              <div key={w.id} className="bg-slate-900/85 border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-[0.5625rem] font-black text-orange-300 uppercase tracking-widest flex items-center gap-1.5 block">
                  <Type size={12} /> Notiz {idx + 1} bearbeiten:
                </span>
                <textarea
                  className="w-full bg-slate-950 border border-white/10 text-white rounded-lg text-[0.75rem] leading-tight leading-relaxed px-3 py-2 focus:outline-none focus:border-orange-500 placeholder-stone-500 font-sans resize-none block"
                  rows={4}
                  placeholder="Notiz eingeben..."
                  value={w.meta?.text !== undefined ? w.meta.text : "Wichtige Notiz für alle!"}
                  onChange={(e) => {
                    const text = e.target.value;
                    setApp((prev: any) => ({
                      ...prev,
                      boardWidgets: (prev.boardWidgets || []).map((bw: any) => 
                        bw.id === w.id ? { ...bw, meta: { ...(bw.meta || {}), text } } : bw
                      )
                    }));
                  }}
                />
              </div>
            ))}

            {/* 5. SECTOR: SMARTBOARD NUTZEN GUIDE */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-4.5 space-y-4 mt-2">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles size={16} className="text-amber-400" />
                <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider">💡 Was ist der Smartboard-Nutzen?</h3>
              </div>
              
              <div className="space-y-3.5 text-[0.65625rem] leading-relaxed text-stone-300">
                <div className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                  <div className="font-extrabold text-white flex items-center gap-1.5">
                    🛡️ Absolute Privatsphäre
                  </div>
                  <p className="text-stone-400 leading-normal text-[0.625rem]">
                    Notizen, Beobachtungen und Noten bleiben geschützt auf deinem Laptop/Handy. Auf dem Smartboard läuft nur der ablenkungsfreie Schülerfokus (z. B. der laufende Timer ⏱️, murmelbepacktes Klassenglas 🫙 oder Lotto 🎯) ohne sensible Daten zu lüften.
                  </p>
                </div>

                <div className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                  <div className="font-extrabold text-white flex items-center gap-1.5">
                    🏃 Volle Klasse-Mobilität
                  </div>
                  <p className="text-stone-400 leading-normal text-[0.625rem]">
                    Du stehst nicht mehr eingemauert am Lehrertisch! Kontrolliere die Lärmampel 🚦, starte Timer, ziehe Lotto oder vergebe Mitarbeitspunkte flüsterleise direkt beim Gehen durch die Reihen auf deinem Smartphone.
                  </p>
                </div>

                <div className="space-y-1 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                  <div className="font-extrabold text-white flex items-center gap-1.5">
                    🎯 Erkläre die Aktivität per Klick
                  </div>
                  <p className="text-stone-400 leading-normal text-[0.625rem]">
                    Verfasse Aufgaben oder Instruktionen direkt auf deinem Handy. Diese ploppen in Echtzeit in riesiger, lesbarer Schrift auf der großen Wand auf – kein lautes Rufen mehr nötig.
                  </p>
                </div>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl text-[0.59375rem] text-indigo-300 leading-normal text-center font-bold">
                Tipp: Klicke am Laptop auf <strong className="text-white">"Smartboard-Ansicht"</strong>, um das saubere, kindgerechte Vollbild anzuzeigen! 📱
              </div>
            </div>

          </div>
        )}

        {/* ======================= TABS: TAFEL & WHITEBOARD REMOTE ======================= */}
        {activeTab === 'tafel' && (
          <div className="space-y-4">
            
            {/* 1. SECTOR: FULLSCREEN TAFEL TOGGLE & STATUS */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
                  <Monitor size={15} /> Smartboard-Tafel Status
                </h3>
                <span className={`text-[0.5rem] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                  app.boardSettings?.isTafelOpen 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse' 
                    : 'bg-white/5 text-stone-400 border-white/5'
                }`}>
                  {app.boardSettings?.isTafelOpen ? '🟢 TAFEL OFFEN' : '⚪ TAFEL ZU'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const nextState = !app.boardSettings?.isTafelOpen;
                    setApp((prev: any) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        isTafelOpen: nextState
                      }
                    }));
                    showFeedback(`Tafel ${nextState ? 'geöffnet' : 'geschlossen'}!`);
                  }}
                  className={`py-3 px-3 rounded-xl border text-[0.625rem] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    app.boardSettings?.isTafelOpen 
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg' 
                      : 'bg-slate-900 border-white/10 text-stone-200 hover:bg-slate-800'
                  }`}
                >
                  <Square size={14} />
                  {app.boardSettings?.isTafelOpen ? 'Tafel Schließen' : 'Tafel Öffnen'}
                </button>

                <button
                  onClick={() => {
                    setApp((prev: any) => ({
                      ...prev,
                      boardSettings: {
                        ...prev.boardSettings,
                        clearTafelTrigger: Date.now()
                      }
                    }));
                    clearRemoteCanvas();
                    showFeedback("Smartboard-Tafel komplett gesäubert!");
                  }}
                  className="py-3 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 rounded-xl text-[0.625rem] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Trash2 size={14} /> Tafel Säubern
                </button>
              </div>
            </div>

            {/* 2. SECTOR: TEXT REMOTE SCHREIBEN */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                <Type size={15} /> Aufs Whiteboard schreiben
              </h3>

              <textarea
                value={remoteText}
                onChange={(e) => setRemoteText(e.target.value)}
                placeholder="Tippe Text ein, z.B. Hausaufgabe: Buch S. 42 Nr. 1-5 bis morgen erledigen..."
                className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-[0.75rem] leading-snug font-medium text-white outline-none focus:border-orange-500 resize-none shadow-inner"
              />

              {/* Quick Text Badges */}
              <div className="space-y-1.5">
                <span className="text-[0.5rem] font-black text-stone-500 uppercase tracking-wider block">Schnell-Text Vorlagen:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "📌 Hausaufgabe", text: "📌 Hausaufgabe: Buch S. ... Nr. ... bis morgen" },
                    { label: "🎯 Hefte aufschlagen", text: "🎯 Bitte Hefte & Buch auf S. ... aufschlagen" },
                    { label: "💡 Merksatz", text: "💡 Wichtige Regel: " },
                    { label: "🤫 Leisearbeit", text: "🤫 Bitte in Einzelarbeit leise durchlesen" },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setRemoteText(preset.text)}
                      className="py-1 px-2 bg-slate-900 hover:bg-slate-800 border border-white/5 text-[0.5625rem] font-bold text-orange-300 rounded-lg cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text formatting options */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[0.5rem] font-black uppercase text-stone-500 block mb-1">Farbe:</span>
                  <div className="flex gap-1.5">
                    {[
                      { color: '#ffffff', name: '⚪ Weiß' },
                      { color: '#f59e0b', name: '🟡 Gelb' },
                      { color: '#38bdf8', name: '🩵 Blau' },
                      { color: '#4ade80', name: '🟢 Grün' },
                      { color: '#ec4899', name: '🩷 Rosa' },
                    ].map((c) => (
                      <button
                        key={c.color}
                        onClick={() => setRemoteTextColor(c.color)}
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-transform ${
                          remoteTextColor === c.color ? 'scale-110 border-white shadow-md' : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[0.5rem] font-black uppercase text-stone-500 block mb-1">Schriftgröße:</span>
                  <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5 gap-0.5">
                    {[
                      { size: 28, label: 'S' },
                      { size: 38, label: 'M' },
                      { size: 48, label: 'L' },
                      { size: 64, label: 'XL' },
                    ].map((s) => (
                      <button
                        key={s.size}
                        onClick={() => setRemoteFontSize(s.size)}
                        className={`flex-1 py-1 rounded text-[0.625rem] font-black uppercase cursor-pointer ${
                          remoteFontSize === s.size ? 'bg-orange-500 text-slate-950 font-extrabold' : 'text-stone-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSendRemoteText()}
                disabled={!remoteText.trim()}
                className={`w-full py-3 rounded-xl font-black text-[0.75rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                  remoteText.trim() 
                    ? 'bg-orange-500 hover:bg-orange-400 text-slate-950 cursor-pointer shadow-lg active:scale-95' 
                    : 'bg-white/5 text-stone-600 cursor-not-allowed border border-white/5'
                }`}
              >
                <Send size={14} /> Text auf Whiteboard / Tafel senden
              </button>
            </div>

            {/* 3. SECTOR: LIVE HAND-SKIZZIERFELD (CANVAS DRAWING) */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3.5">
              <div className="flex justify-between items-center">
                <h3 className="text-[0.75rem] leading-tight font-black uppercase text-orange-400 tracking-wider flex items-center gap-2">
                  <Sparkles size={15} /> Hand-Skizzierfeld (Zeichnen)
                </h3>
                <span className="text-[0.5rem] text-stone-400 font-bold uppercase tracking-widest">
                  Mit Finger malen
                </span>
              </div>

              {/* Mobile Drawing Canvas */}
              <div className="relative bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-inner touch-none">
                <canvas
                  ref={remoteCanvasRef}
                  width={340}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={drawStroke}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={drawStroke}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px] cursor-crosshair block bg-slate-950"
                />

                {/* Clear canvas mini-button */}
                <button
                  onClick={clearRemoteCanvas}
                  className="absolute top-2 right-2 px-2 py-1 bg-black/60 hover:bg-black/90 border border-white/10 rounded-lg text-[0.5rem] font-bold uppercase text-stone-300 cursor-pointer"
                >
                  🧹 Skizze leeren
                </button>
              </div>

              {/* Drawing Toolbar */}
              <div className="flex justify-between items-center gap-2">
                {/* Pen colors */}
                <div className="flex gap-1.5 items-center">
                  {[
                    { color: '#ffffff', name: 'Weiß' },
                    { color: '#f59e0b', name: 'Gelb' },
                    { color: '#ef4444', name: 'Rot' },
                    { color: '#10b981', name: 'Grün' },
                    { color: '#3b82f6', name: 'Blau' },
                    { color: 'eraser', name: 'Radierer' },
                  ].map((item) => (
                    <button
                      key={item.color}
                      onClick={() => setRemoteDrawColor(item.color)}
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center cursor-pointer transition-transform ${
                        remoteDrawColor === item.color ? 'scale-110 border-white shadow-md' : 'border-white/10 opacity-70'
                      }`}
                      style={{ backgroundColor: item.color === 'eraser' ? '#1e293b' : item.color }}
                      title={item.name}
                    >
                      {item.color === 'eraser' && <span className="text-[0.625rem]">🧹</span>}
                    </button>
                  ))}
                </div>

                {/* Pen width */}
                <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5 gap-0.5">
                  {[
                    { w: 2, label: 'Fein' },
                    { w: 4, label: 'Mittel' },
                    { w: 8, label: 'Dick' },
                  ].map((sw) => (
                    <button
                      key={sw.w}
                      onClick={() => setRemoteDrawWidth(sw.w)}
                      className={`px-2 py-1 rounded text-[0.5rem] font-black uppercase cursor-pointer ${
                        remoteDrawWidth === sw.w ? 'bg-orange-500 text-slate-950 font-black' : 'text-stone-400'
                      }`}
                    >
                      {sw.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSendRemoteDrawing}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[0.75rem] uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                🎨 Skizze / Zeichnung live ans Smartboard senden!
              </button>
            </div>

            {/* 4. SECTOR: TAFELHINTERGRUND & LINEATUR */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
                <Square size={14} /> Lineatur &amp; Raster (Smartboard)
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperType: 'blank' } }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${!app.boardSettings?.paperType || app.boardSettings.paperType === 'blank' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-stone-400 border border-white/5'}`}
                >
                  <Square size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperType: 'lined' } }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${app.boardSettings?.paperType === 'lined' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-stone-400 border border-white/5'}`}
                >
                  <AlignJustify size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperType: 'squared' } }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${app.boardSettings?.paperType === 'squared' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-stone-400 border border-white/5'}`}
                >
                  <Grid3X3 size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperType: 'writing-lines' } }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${app.boardSettings?.paperType === 'writing-lines' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-stone-400 border border-white/5'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.2">
                    <line x1="1" y1="2" x2="11" y2="2" />
                    <line x1="1" y1="5" x2="11" y2="5" strokeDasharray="1 1" />
                    <rect x="1" y="5" width="10" height="3" fill="currentColor" fillOpacity="0.15" stroke="none" />
                    <line x1="1" y1="8" x2="11" y2="8" strokeWidth="1.8" />
                    <line x1="1" y1="10" x2="11" y2="10" />
                  </svg>
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperType: 'millimeter' } }))}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${app.boardSettings?.paperType === 'millimeter' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-white/5 text-stone-400 border border-white/5'}`}
                >
                  <svg width="18" height="18" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" strokeWidth="1.2">
                    <rect x="1" y="1" width="10" height="10" rx="1" />
                    <line x1="4" y1="1" x2="4" y2="11" strokeWidth="0.6" strokeDasharray="1 1" />
                    <line x1="7" y1="1" x2="7" y2="11" strokeWidth="0.6" strokeDasharray="1 1" />
                    <line x1="1" y1="4" x2="11" y2="4" strokeWidth="0.6" strokeDasharray="1 1" />
                    <line x1="1" y1="7" x2="11" y2="7" strokeWidth="0.6" strokeDasharray="1 1" />
                  </svg>
                </button>
              </div>

              {['lined', 'squared', 'writing-lines', 'millimeter'].includes(app.boardSettings?.paperType) && (
                <div className="flex items-center justify-between pt-3 border-t border-white/5 mt-3">
                  <span className="text-[0.625rem] font-black uppercase text-stone-400 tracking-wider">Raster-Größe:</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperSize: Math.max(20, (p.boardSettings?.paperSize || 40) - 4) } }))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-[0.875rem] leading-snug font-black text-amber-500 w-8 text-center">{app.boardSettings?.paperSize || 40}</span>
                    <button
                      onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, paperSize: Math.min(100, (p.boardSettings?.paperSize || 40) + 4) } }))}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-stone-400 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. SECTOR: SCHRIFTART & THEME */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider flex items-center gap-2">
                <Type size={14} /> Schriftart &amp; Theme
              </h3>
              <div className="flex flex-col gap-2">
                <select
                  value={app.boardSettings?.activeFont || 'font-sans'}
                  onChange={(e) => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, activeFont: e.target.value } }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[0.75rem] leading-tight font-black text-white hover:border-white/20 focus:ring-1 focus:ring-amber-500/50 outline-none w-full appearance-none leading-none cursor-pointer"
                >
                  <option value="font-sans">Typografie: Standard</option>
                  <option value="font-dyslexic">Typografie: OpenDyslexic</option>
                  <option value="font-schulschrift">Typografie: Schulschrift</option>
                  <option value="font-druckschrift">Typografie: Druckschrift</option>
                </select>

                <select
                  value={app.unterrichtsmodus_theme || 'dark'}
                  onChange={(e) => setApp((p: any) => ({ ...p, unterrichtsmodus_theme: e.target.value }))}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-[0.75rem] leading-tight font-black text-white hover:border-white/20 focus:ring-1 focus:ring-amber-500/50 outline-none w-full appearance-none leading-none cursor-pointer"
                >
                  <option value="dark">🌙 Theme: Dark Mode</option>
                  <option value="light">☀️ Theme: Light Mode</option>
                </select>
              </div>
            </div>

            {/* 6. SECTOR: SOUND-BOARD & CONFETTI */}
            <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
              <h3 className="text-[0.75rem] leading-tight font-black uppercase text-amber-500 tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-2"><Volume2 size={14} /> Medien &amp; Sound-Effekte</div>
                
                <button
                  onClick={() => setApp((p: any) => ({ ...p, rewardSound: p.rewardSound === false }))}
                  className={`h-7 px-3 rounded-lg flex items-center gap-1.5 transition-all text-[0.59375rem] font-black uppercase tracking-wider ${app.rewardSound !== false ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-stone-500"}`}
                >
                  {app.rewardSound !== false ? <Volume2 size={11} /> : <VolumeX size={11} />}
                  {app.rewardSound !== false ? "AN" : "AUS"}
                </button>
              </h3>
              <p className="text-[0.625rem] text-stone-400 leading-snug">
                Effekte auf dem verbundenen Lehrer-PC abspielen:
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, remoteSoundToPlay: { type: 'tada', timestamp: Date.now() } } }))}
                  className="bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-stone-300 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-[1.5rem] leading-normal leading-none">🎉</span>
                  <span className="text-[0.5625rem] font-black uppercase tracking-wider text-center">Party &amp; Konfetti</span>
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, remoteSoundToPlay: { type: 'fanfare', timestamp: Date.now() } } }))}
                  className="bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-stone-300 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-[1.5rem] leading-normal leading-none">🎺</span>
                  <span className="text-[0.5625rem] font-black uppercase tracking-wider text-center">Erfolg</span>
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, remoteSoundToPlay: { type: 'beep', timestamp: Date.now() } } }))}
                  className="bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-stone-300 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-[1.5rem] leading-normal leading-none">🔔</span>
                  <span className="text-[0.5625rem] font-black uppercase tracking-wider text-center">Glocke</span>
                </button>
                <button
                  onClick={() => setApp((p: any) => ({ ...p, boardSettings: { ...p.boardSettings, remoteSoundToPlay: { type: 'error', timestamp: Date.now() } } }))}
                  className="bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-stone-300 border border-white/5 p-3 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <span className="text-[1.5rem] leading-normal leading-none">✖️</span>
                  <span className="text-[0.5625rem] font-black uppercase tracking-wider text-center">Fehler</span>
                </button>
              </div>
            </div>
            
          </div>
        )}

      </div>

      {/* LOTTERY LOCAL POPUP MODAL (Majestic screen-filling card) */}
      {drawnLottoWinner && (
        <div className="fixed inset-0 z-[1005] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 animate-fade-in font-sans">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500 rounded-[2.5rem] p-4 sm:p-8 text-center space-y-6 shadow-2xl relative ">
            
            {/* Ambient Background Lights */}
            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-2 relative">
              <span className="inline-block px-4 py-1.5 bg-amber-500/10 border border-amber-500/35 text-amber-300 rounded-full text-[0.625rem] font-black uppercase tracking-[0.25em] leading-none mb-1 shadow-inner">
                🎯 LOTTERIE-GEWINNER 🎯
              </span>
              <h4 className="text-white text-[0.75rem] leading-tight font-bold uppercase tracking-wider block opacity-40">Zufällig gezogen</h4>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4 relative">
              {/* Massive animated Emoji */}
              <div className="text-8xl p-5 bg-white/5 border border-white/5 shadow-2xl rounded-full w-36 h-36 flex items-center justify-center animate-wiggle">
                {drawnLottoWinner.emoji}
              </div>
              <h2 className="text-[1.5rem] leading-normal font-black text-amber-200 uppercase tracking-tight antialiased select-text">
                {drawnLottoWinner.name}
              </h2>
            </div>

            <p className="text-[0.625rem] text-stone-400 max-w-xs mx-auto leading-relaxed">
              Dieser Schüler wurde soeben per LEHRERCOCKPIT gezogen und am Smartboard verkündet! 🎉
            </p>

            <button
              onClick={() => {
                setDrawnLottoWinner(null);
                setApp((prev: any) => ({ ...prev, lottoWinner: undefined }));
              }}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-[0.75rem] leading-tight uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              Fenster Schließen & Weiter!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default MobileRemoteController;
