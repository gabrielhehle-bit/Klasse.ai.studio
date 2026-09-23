import TeacherAvatar from './TeacherAvatar';
import DashboardSimpleOverview from './DashboardSimpleOverview';
import type { DashboardFreeDayMessage } from '../lib/dashboardDayContext';
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
  freeDayGreeting?: DashboardFreeDayMessage | null;
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
  attendanceRequired: boolean;

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

export default function DashboardTodayOverview(props: DashboardTodayOverviewProps) {
  const {
  greeting,
  freeDayGreeting,
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
  attendanceRequired,

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
} = props;
  const { app, setApp } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [upcomingTab, setUpcomingTab] = useState<"morgen" | "woche" | "monat">("morgen");

  const primaryLesson = currentLesson || nextLesson;

  if (simpleMode) return <DashboardSimpleOverview {...props} />;

  return (
    <div className="space-y-6 w-full">
      {freeDayGreeting && (
        <section role="status" aria-label="Wochenende, Ferien oder Feiertag"
          className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm sm:p-7">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Eine kleine Auszeit</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{freeDayGreeting.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{freeDayGreeting.message}</p>
          <p className="mt-3 text-xs font-medium text-slate-500">Deine Termine und offenen Aufgaben bleiben unten im Blick.</p>
        </section>
      )}
      {/* ==================================================
          1. KOPFBEREICH (SIMPEL & FOKUSSIERT)
         ================================================== */}
      <header className="bg-white border border-slate-200/80 rounded-3xl p-4 sm:p-5 shadow-2xs relative transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Linke Seite: Begrüßung & Datum & Klasse */}
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => onNavigate('profil')}
              title="Mein Profil öffnen" aria-label="Profil auf dem Dashboard öffnen"
              className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
              <TeacherAvatar app={app} size="md" />
            </button>
            <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[0.6875rem] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {klasseLabel || "Klasse 3a"}
              </span>
              
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
                !attendanceRequired
                  ? "bg-slate-50 text-slate-600 border border-slate-200/60"
                  : attendanceRecorded
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}>
                {!attendanceRequired ? "Nicht nötig" : attendanceRecorded ? "Geprüft" : "Offen"}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {privacyMode
                  ? "••"
                  : totalStudents === 0
                    ? "0"
                    : !attendanceRequired
                      ? "—"
                      : attendanceRecorded
                        ? `${presentCount} / ${totalStudents}`
                        : "Offen"}
              </div>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                {privacyMode
                  ? attendanceRecorded ? "Geprüft" : !attendanceRequired ? "Nicht erforderlich" : "Noch nicht geprüft"
                  : totalStudents === 0
                    ? "Noch keine Kinder angelegt"
                    : !attendanceRequired
                      ? "Für diesen Tag keine Prüfung geplant"
                      : !attendanceRecorded
                        ? "Noch nicht geprüft"
                        : absentCount === 0
                          ? "Alle anwesend"
                          : `${absentCount} abwesend`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate(totalStudents > 0 ? "anwesenheit" : "schueler")}
            className="mt-4 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <UserCheck size={14} />
            <span>{totalStudents > 0 ? "Anwesenheit öffnen" : "Kinder hinzufügen"}</span>
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
            onClick={() => onNavigate("orga")}
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
            onClick={() => onNavigate("planung")}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            <span>Planung</span>
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
                      onClick={() => onNavigate("planung")}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      Planung öffnen
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
          <span>{simpleMode ? "Alle Widgets" : "Zur kompakten Startseite"}</span>
        </button>
      </div>
    </div>
  );
}
