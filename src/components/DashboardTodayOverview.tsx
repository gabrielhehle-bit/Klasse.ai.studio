import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import {
  Users,
  UserCheck,
  UserX,
  Calendar,
  Clock,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  MoreHorizontal,
  Sliders,
  Printer,
  Save,
  Smartphone,
  Star,
  Sparkles,
  ArrowRight,
  ListTodo,
  BookOpen,
  CalendarDays,
  Target,
  Heart,
  Smile,
  Zap,
  TrendingUp,
  ShieldCheck,
  Check,
  Settings,
  Grid,
  Bug,
  ExternalLink,
  ChevronDown,
  Plus,
  GraduationCap,
  X,
} from "lucide-react";

export type DashboardDayMode = "morning" | "teaching" | "review";

export interface LessonSummary {
  id?: number;
  hourNum?: number;
  fach?: string;
  zeit?: string;
  thema?: string;
  raum?: string;
  isCurrent?: boolean;
}

export interface ActionItemSummary {
  id: string;
  type: string;
  text: string;
  category?: string;
  icon?: React.ReactNode;
  linkPage?: string;
  urgent?: boolean;
}

export interface DashboardTodayOverviewProps {
  greeting: string;
  dateLabel: string;
  klasseLabel: string;
  manualDateOffset: number;
  onDateOffsetChange: (offset: number) => void;
  privacyMode: boolean;
  onPrivacyModeChange: (value: boolean) => void;
  simpleMode: boolean;
  onSimpleModeToggle: () => void;
  onNavigate: (page: string) => void;
  onOpenRemoteSetup: () => void;
  onOpenBackup: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenCustomize: () => void;

  // Anwesenheit Card
  totalStudents: number;
  absentCount: number;
  presentCount: number;
  attendanceRecorded: boolean;

  // Mein Tag Card
  todayLessonCount: number;
  currentLesson: LessonSummary | null;
  nextLesson: LessonSummary | null;
  todayEventsCount: number;
  todayLessonsList: LessonSummary[];

  // Offen Card
  openTasksCount: number;
  openCollectionsCount: number;
  openRemindersCount: number;

  // Heute wichtig Items
  actionItems: ActionItemSummary[];

  // Schüler:in im Fokus
  focusStudent: any;
  onNextFocusStudent: () => void;

  // Upcoming Overview (Morgen / Diese Woche / Dieser Monat)
  tomorrowEvents: Array<{ title: string; subtitle?: string; type: string }>;
  weekEvents: Array<{ title: string; subtitle?: string; dayLabel?: string; type: string }>;
  monthEvents: Array<{ title: string; subtitle?: string; dateLabel?: string; type: string }>;
}

export default function DashboardTodayOverview({
  greeting,
  dateLabel,
  klasseLabel,
  manualDateOffset,
  onDateOffsetChange,
  privacyMode,
  onPrivacyModeChange,
  simpleMode,
  onSimpleModeToggle,
  onNavigate,
  onOpenRemoteSetup,
  onOpenBackup,
  onOpenPrint,
  onOpenSettings,
  onOpenCustomize,

  totalStudents,
  absentCount,
  presentCount,
  attendanceRecorded,

  todayLessonCount,
  currentLesson,
  nextLesson,
  todayEventsCount,
  todayLessonsList,

  openTasksCount,
  openCollectionsCount,
  openRemindersCount,

  actionItems,

  focusStudent,
  onNextFocusStudent,

  tomorrowEvents,
  weekEvents,
  monthEvents,
}: DashboardTodayOverviewProps) {
  const { app, setApp, switchClass, addClass } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [upcomingTab, setUpcomingTab] = useState<"morgen" | "woche" | "monat">("morgen");
  const [showClassMenu, setShowClassMenu] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickClassName, setQuickClassName] = useState('');
  const [quickClassStufe, setQuickClassStufe] = useState<number>(1);
  const [quickClassIsKV, setQuickClassIsKV] = useState(true);

  const availableClasses = app?.classes && app.classes.length > 0 
    ? app.classes 
    : (app?.klassenbezeichnung ? [{ id: app.activeClassId || 'default', name: app.klassenbezeichnung, stufe: app.stufe || 1, schueler: app.schueler || [] }] : []);

  const primaryLesson = currentLesson || nextLesson;

  return (
    <div className="space-y-6 w-full">
      {/* ==================================================
          1. KOPFBEREICH (SIMPEL & FOKUSSIERT)
         ================================================== */}
      <header className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs relative transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Linke Seite: Begrüßung & Datum & Klasse */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Klasse Dropdown Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowClassMenu(!showClassMenu)}
                  className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 hover:bg-emerald-100/90 px-3 py-1 rounded-full border border-emerald-200/80 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                  title="Klasse wechseln oder neue Klasse anlegen"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{klasseLabel || app?.klassenbezeichnung || "Klasse 3a"}</span>
                  <ChevronDown size={13} className={`text-emerald-600 transition-transform duration-200 ${showClassMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Popover */}
                {showClassMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowClassMenu(false)} 
                    />
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                      <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-[0.625rem] font-black text-slate-400 uppercase tracking-wider">Deine Klassen</span>
                        <span className="text-[0.625rem] font-bold text-slate-500">{availableClasses.length} {availableClasses.length === 1 ? 'Klasse' : 'Klassen'}</span>
                      </div>
                      
                      {/* Klassenliste */}
                      <div className="max-h-48 overflow-y-auto py-1 space-y-1">
                        {availableClasses.map((c: any) => {
                          const isActive = (c.id === app?.activeClassId) || (availableClasses.length === 1 && !app?.activeClassId);
                          const studentCount = c.schueler?.length ?? (isActive ? (app?.schueler?.length || 0) : 0);
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                if (c.id !== app?.activeClassId) {
                                  switchClass(c.id);
                                }
                                setShowClassMenu(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isActive 
                                  ? 'bg-emerald-50 text-emerald-900 font-black border border-emerald-200/60 shadow-2xs' 
                                  : 'text-slate-700 hover:bg-slate-50 font-bold'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <GraduationCap size={15} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                                <div>
                                  <div className="leading-tight">{c.name || 'Unbenannte Klasse'}</div>
                                  <div className="text-[0.625rem] font-medium text-slate-400">
                                    {c.stufe ? `${c.stufe}. Stufe` : ''}{c.stufe && ' • '}{studentCount} Schüler:innen
                                  </div>
                                </div>
                              </div>
                              {isActive && <Check size={14} className="text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Aktionen */}
                      <div className="border-t border-slate-100 pt-1.5 mt-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowClassMenu(false);
                            setShowQuickAddModal(true);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-black text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Plus size={14} className="text-emerald-600 shrink-0" />
                          <span>+ Neue Klasse anlegen</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setShowClassMenu(false);
                            onNavigate('setup_new');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles size={14} className="text-indigo-500 shrink-0" />
                          <span>Klasse mit Assistent / Sokrates</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowClassMenu(false);
                            onNavigate('setup');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-[0.6875rem] font-bold text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Settings size={13} className="text-slate-400 shrink-0" />
                          <span>Klassen-Einstellungen öffnen</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Schneller Button: + Klasse */}
              <button
                type="button"
                onClick={() => setShowQuickAddModal(true)}
                className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 px-2.5 py-1 rounded-full border border-slate-200/80 hover:border-emerald-200/80 flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                title="Neue Klasse direkt im Dashboard hinzufügen"
              >
                <Plus size={12} className="text-emerald-600" />
                <span>+ Klasse</span>
              </button>
              
              {manualDateOffset !== 0 && (
                <span className="text-[0.625rem] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                  {manualDateOffset > 0 ? `+${manualDateOffset} Tag(e)` : `${manualDateOffset} Tag(e)`}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-0.5">
              {greeting}
            </h1>
            
            <p className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <CalendarDays size={13} className="text-slate-400 shrink-0" />
              <span>{dateLabel}</span>
            </p>
          </div>

          {/* Rechte Seite: Schnelle Aktionen */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            
            {/* Datumsnavigation */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
              <button
                type="button"
                onClick={() => onDateOffsetChange(manualDateOffset - 1)}
                className="p-1.5 hover:bg-white text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Gestern"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              <button
                type="button"
                onClick={() => onDateOffsetChange(0)}
                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  manualDateOffset === 0
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/60"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                title="Heute"
              >
                Heute
              </button>

              <button
                type="button"
                onClick={() => onDateOffsetChange(manualDateOffset + 1)}
                className="p-1.5 hover:bg-white text-slate-700 rounded-xl transition-all cursor-pointer"
                title="Morgen"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ==================================================
          2. OBERSTE REIHE: DIE DREI WICHTIGSTEN KARTEN
         ================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        
        {/* KARTE 1: ANWESENHEIT */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Users size={15} className="text-sky-600" />
                <span>Anwesenheit</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[0.5625rem] font-black uppercase tracking-wider ${
                attendanceRecorded
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}>
                {attendanceRecorded ? "Geprüft" : "Offen"}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {privacyMode ? "••" : `${presentCount} / ${totalStudents}`}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                {privacyMode
                  ? "Verborgen"
                  : absentCount === 0
                  ? "Alle anwesend"
                  : `${absentCount} abwesend`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("anwesenheit")}
            className="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck size={14} />
            <span>Prüfen</span>
          </button>
        </div>

        {/* KARTE 2: MEIN TAG */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <CalendarDays size={15} className="text-indigo-600" />
                <span>Mein Tag</span>
              </span>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full text-[0.5625rem] font-black uppercase tracking-wider">
                {todayLessonCount} Std.
              </span>
            </div>

            <div>
              <div className="text-lg font-black text-slate-900 truncate tracking-tight">
                {primaryLesson?.fach || "Kein Unterricht"}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1 truncate">
                <Clock size={13} className="text-slate-400 shrink-0" />
                <span>
                  {primaryLesson?.zeit
                    ? `${primaryLesson.zeit} · ${currentLesson ? "Jetzt" : "Nächstes"}`
                    : todayEventsCount > 0
                    ? `${todayEventsCount} Termine`
                    : "Frei"}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("wochenplanung")}
            className="mt-4 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen size={14} />
            <span>Tagesplan</span>
          </button>
        </div>

        {/* KARTE 3: OFFEN */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-4.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Wallet size={15} className="text-amber-600" />
                <span>Offen</span>
              </span>
              {(openTasksCount + openCollectionsCount) > 0 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-[0.5625rem] font-black uppercase tracking-wider">
                  {openTasksCount + openCollectionsCount} Offen
                </span>
              )}
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {openTasksCount + openCollectionsCount}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                {openCollectionsCount > 0 && openTasksCount > 0
                  ? `${openCollectionsCount} Geld, ${openTasksCount} Aufgaben`
                  : openCollectionsCount > 0
                  ? `${openCollectionsCount} Geldsammlungen`
                  : openTasksCount > 0
                  ? `${openTasksCount} Aufgaben`
                  : "Alles erledigt!"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(openCollectionsCount > 0 ? "geldsammlung" : "orga")}
            className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ListTodo size={14} />
            <span>Ansehen</span>
          </button>
        </div>

      </section>

      {/* ==================================================
          3. HEUTIGER TAGESABLAUF (STUNDENPLAN CHRONOLOGISCH)
         ================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-indigo-600" />
            <h2 className="text-sm font-black text-slate-900">
              Tagesablauf
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("wochenplanung")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Woche</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {todayLessonsList.length === 0 ? (
          <div className="py-6 text-center bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-500">
              Keine Stunden heute.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
            {todayLessonsList.map((lesson) => (
              <div
                key={lesson.id || lesson.hourNum}
                onClick={() => onNavigate("wochenplanung")}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 group ${
                  lesson.isCurrent
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-sm"
                    : "bg-slate-50/70 hover:bg-white border-slate-200/70 hover:border-slate-300 text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[0.625rem] font-black uppercase tracking-wider ${
                    lesson.isCurrent ? "text-indigo-100" : "text-slate-400"
                  }`}>
                    {lesson.hourNum}. Std
                  </span>

                  {lesson.isCurrent && (
                    <span className="px-1.5 py-0.5 bg-white text-indigo-950 font-black text-[0.5625rem] uppercase rounded-full">
                      Jetzt
                    </span>
                  )}
                </div>

                <div>
                  <h3 className={`text-xs font-black truncate ${
                    lesson.isCurrent ? "text-white" : "text-slate-900 group-hover:text-indigo-600"
                  }`}>
                    {lesson.fach || "Stunde"}
                  </h3>

                  {lesson.zeit && (
                    <p className={`text-[0.625rem] font-bold truncate mt-0.5 ${
                      lesson.isCurrent ? "text-indigo-100" : "text-slate-400"
                    }`}>
                      {lesson.zeit}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ==================================================
          4. "WICHTIG" & 5. FOKUS-SCHÜLER
         ================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* WICHTIG (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <h2 className="text-sm font-black text-slate-900">
                Wichtig
              </h2>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[0.625rem] font-black">
              {actionItems.length}
            </span>
          </div>

          {actionItems.length === 0 ? (
            <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 border border-emerald-200/60 rounded-2xl text-emerald-800">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-extrabold">Alles erledigt!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {actionItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate(item.linkPage || "orga")}
                  className="p-2.5 bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-200/70 rounded-2xl flex items-center justify-between gap-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-white rounded-xl text-indigo-600 shrink-0">
                      {item.icon || <AlertCircle size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate group-hover:text-indigo-900">
                        {privacyMode ? "Sensibler Eintrag" : item.text}
                      </p>
                    </div>
                  </div>

                  <ChevronRight size={15} className="text-slate-300 group-hover:text-indigo-600 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOKUS-SCHÜLER (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 border border-indigo-150/80 rounded-3xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[0.6875rem] font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Star size={15} className="text-amber-500 fill-amber-500" />
                <span>Fokus-Schüler</span>
              </span>

              <button
                type="button"
                onClick={onNextFocusStudent}
                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all cursor-pointer"
                title="Nächster"
              >
                <RefreshCw size={13} />
              </button>
            </div>

            {focusStudent ? (
              <div className="bg-white border border-indigo-100 rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0">
                    {privacyMode
                      ? `${focusStudent.vorname?.[0] || ""}.`
                      : `${focusStudent.vorname?.[0] || ""}${focusStudent.nachname?.[0] || ""}`}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      {privacyMode
                        ? `${focusStudent.vorname} ${focusStudent.nachname?.[0] || ""}.`
                        : `${focusStudent.vorname} ${focusStudent.nachname}`}
                    </h3>
                    <p className="text-[0.625rem] font-bold text-slate-500">
                      Tagesfokus
                    </p>
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-600 line-clamp-2 pt-1 border-t border-slate-100">
                  {focusStudent.foerderprofil?.staerken?.[0]
                    ? `Stärke: ${focusStudent.foerderprofil.staerken[0]}`
                    : "Heute besonders beobachten."}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-500">
                  Kein Schüler gewählt.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              if (focusStudent?.id) {
                setApp((prev: any) => ({ ...prev, selectedStudentId: focusStudent.id }));
              }
              onNavigate("schueler");
            }}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>Profil</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </section>

      {/* ==================================================
          6. VORSCHAU (MORGEN / WOCHE / MONAT)
         ================================================== */}
      <section className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3">
        
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
          <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setUpcomingTab("morgen")}
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                upcomingTab === "morgen"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Morgen
            </button>

            <button
              type="button"
              onClick={() => setUpcomingTab("woche")}
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                upcomingTab === "woche"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Woche
            </button>

            <button
              type="button"
              onClick={() => setUpcomingTab("monat")}
              className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                upcomingTab === "monat"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Monat
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("kalender")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Kalender</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Tab Inhalt */}
        <div>
          {upcomingTab === "morgen" && (
            <div className="space-y-1.5">
              {tomorrowEvents.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500 italic py-2 text-center">
                  Keine Termine morgen.
                </p>
              ) : (
                tomorrowEvents.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">{item.title}</p>
                      {item.subtitle && <p className="text-[0.625rem] text-slate-500 font-semibold">{item.subtitle}</p>}
                    </div>
                    <span className="text-[0.5625rem] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-200/60 text-slate-600 rounded-md">
                      {item.type || "Termin"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {upcomingTab === "woche" && (
            <div className="space-y-1.5">
              {weekEvents.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500 italic py-2 text-center">
                  Keine Termine diese Woche.
                </p>
              ) : (
                weekEvents.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[0.5625rem] font-black uppercase tracking-wider text-indigo-600">{item.dayLabel || "Woche"}</span>
                      <p className="text-xs font-extrabold text-slate-800">{item.title}</p>
                    </div>
                    {item.subtitle && <p className="text-xs font-semibold text-slate-500">{item.subtitle}</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {upcomingTab === "monat" && (
            <div className="space-y-1.5">
              {monthEvents.length === 0 ? (
                <p className="text-xs font-semibold text-slate-500 italic py-2 text-center">
                  Keine Termine diesen Monat.
                </p>
              ) : (
                monthEvents.map((item, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50/70 border border-slate-200/60 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[0.5625rem] font-black uppercase tracking-wider text-amber-600">{item.dateLabel || "Monat"}</span>
                      <p className="text-xs font-extrabold text-slate-800">{item.title}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate("kalender")}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Öffnen
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </section>

      {/* ==================================================
          7. TOGGLE ZU ERWEITERTEN WIDGETS
         ================================================== */}
      <div className="pt-1 flex justify-center">
        <button
          type="button"
          onClick={onSimpleModeToggle}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Grid size={14} className="text-indigo-600" />
          <span>{simpleMode ? "Alle Widgets" : "Einfachmodus"}</span>
        </button>
      </div>

      {/* ==================================================
          8. SCHNELLANLAGE MODAL (NEUE KLASSE)
         ================================================== */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-2xs">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">Neue Klasse anlegen</h3>
                  <p className="text-xs text-slate-500 font-medium">Erstelle eine neue Klasse für dein Klassenbuch</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="Schließen"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = quickClassName.trim();
                if (!trimmed) return;
                addClass(trimmed, quickClassStufe, quickClassIsKV, 'dashboard');
                setShowQuickAddModal(false);
                setQuickClassName('');
                onNavigate('dashboard');
              }}
              className="space-y-4"
            >
              {/* Klassenbezeichnung */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Klassenbezeichnung <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickClassName}
                  onChange={(e) => setQuickClassName(e.target.value)}
                  placeholder="z. B. 2b, 4a, 1c..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Schulstufe */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Schulstufe
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setQuickClassStufe(st)}
                      className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        quickClassStufe === st
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st}. Stufe
                    </button>
                  ))}
                </div>
              </div>

              {/* Klassenvorstand Checkbox */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={quickClassIsKV}
                  onChange={(e) => setQuickClassIsKV(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 select-none">
                  Ich bin Klassenvorstand / Klassenlehrkraft
                </span>
              </label>

              {/* Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddModal(false);
                    onNavigate('setup_new');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Öffnet den Einrichtungsassistenten inkl. Sokrates Schülerimport"
                >
                  <Sparkles size={14} className="text-indigo-500" />
                  <span>Mit Assistent & Sokrates</span>
                </button>
                <button
                  type="submit"
                  disabled={!quickClassName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Klasse anlegen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
