import React from "react";
import { useApp } from "../context/AppContext";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Play,
  Presentation,
  Sparkles,
  UserCheck,
} from "lucide-react";

export type DashboardDayMode = "morning" | "teaching" | "review";

interface LessonSummary {
  fach?: string;
  zeit?: string;
}

interface DashboardTodayOverviewProps {
  greeting: string;
  dateLabel: string;
  previewLabel?: string | null;
  currentLesson: LessonSummary | null;
  nextLesson: LessonSummary | null;
  absentCount: number;
  totalStudents: number;
  attendanceRecorded: boolean;
  actionItems: Array<{ id: string; type: string; text: string; icon?: React.ReactNode }>;
  events: Array<{ type: string; title: string; desc?: string }>;
  mode: DashboardDayMode;
  privacyMode: boolean;
  onModeChange: (mode: DashboardDayMode) => void;
  onPrivacyModeChange: (value: boolean) => void;
  onNavigate: (page: string) => void;
}

const modeOptions: Array<{ id: DashboardDayMode; label: string; hint: string }> = [
  { id: "morning", label: "Morgen", hint: "Vorbereiten" },
  { id: "teaching", label: "Unterricht", hint: "Jetzt handeln" },
  { id: "review", label: "Nachbereitung", hint: "Abschließen" },
];

export default function DashboardTodayOverview({
  greeting,
  dateLabel,
  previewLabel,
  currentLesson,
  nextLesson,
  absentCount,
  totalStudents,
  attendanceRecorded,
  actionItems,
  events,
  mode,
  privacyMode,
  onModeChange,
  onPrivacyModeChange,
  onNavigate,
}: DashboardTodayOverviewProps) {
  const { app } = useApp();
  const colorThemes = {
    classic_light: { surface: "#f8fafc", surfaceStrong: "#eef2ff", card: "#ffffff", border: "#cbd5e1", text: "#0f172a", muted: "#475569", subtle: "#64748b", accent: "#047857", page: "#ffffff" },
    ocean_breeze: { surface: "#eff7ff", surfaceStrong: "#dbeafe", card: "#ffffff", border: "#a9c7e5", text: "#17365d", muted: "#476582", subtle: "#5d7894", accent: "#1d4ed8", page: "#f4f8fc" },
    deep_dark: { surface: "#111827", surfaceStrong: "#09090b", card: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.16)", text: "#f8fafc", muted: "#cbd5e1", subtle: "#94a3b8", accent: "#6ee7b7", page: "#09090b" },
    soft_sage: { surface: "#f1f6f1", surfaceStrong: "#dfece1", card: "#ffffff", border: "#b4c9b4", text: "#213b2b", muted: "#4d6856", subtle: "#64806d", accent: "#347a50", page: "#f1f4f1" },
    warm_sand: { surface: "#fdf7ef", surfaceStrong: "#f3e3ce", card: "#fffdf9", border: "#dfc29f", text: "#4a321f", muted: "#765c43", subtle: "#8b7157", accent: "#9a4f16", page: "#fdfaf6" },
    lavender_field: { surface: "#f8f5ff", surfaceStrong: "#e8ddff", card: "#ffffff", border: "#c5b3eb", text: "#37215f", muted: "#66517f", subtle: "#7c6895", accent: "#6d28d9", page: "#f8f6fc" },
    cozy_mint: { surface: "#edfcf5", surfaceStrong: "#d2f5e3", card: "#ffffff", border: "#92d6b7", text: "#064e3b", muted: "#397062", subtle: "#4e8275", accent: "#047857", page: "#f2fcf7" },
    sakura_dream: { surface: "#fff3f6", surfaceStrong: "#ffdee7", card: "#ffffff", border: "#f5a2b8", text: "#701a36", muted: "#8f4961", subtle: "#a15f75", accent: "#be185d", page: "#fff5f8" },
  } as const;
  const customTheme = {
    surface: app.customBgColor || "#f8fafc",
    surfaceStrong: app.customBgColor || "#f8fafc",
    card: app.customBgColor || "#ffffff",
    border: app.customAccentColor || "#94a3b8",
    text: app.customTextColor || "#0f172a",
    muted: app.customText2Color || "#475569",
    subtle: app.customText2Color || "#64748b",
    accent: app.customAccentColor || "#047857",
    page: app.customBgColor || "#ffffff",
  };
  const themeColors =
    app.theme === "custom_theme"
      ? customTheme
      : colorThemes[app.theme as keyof typeof colorThemes] || colorThemes.classic_light;
  const primaryLesson = currentLesson || nextLesson;
  const primaryLabel = currentLesson ? "Läuft gerade" : nextLesson ? "Als Nächstes" : "Kein Unterricht";
  const visibleActions = actionItems.slice(0, mode === "teaching" ? 2 : 4);
  const visibleEvents = events.slice(0, 2);
  const nonTeachingEvent = events.find((event) => {
    const label = `${event.type} ${event.title} ${event.desc || ""}`.toLowerCase();
    return ["ferien", "feiertag", "schulfrei"].some((term) => label.includes(term));
  });
  const isNonTeachingDay = Boolean(nonTeachingEvent) && !currentLesson && !nextLesson;
  const lessonLabel = isNonTeachingDay ? "Heute ist schulfrei" : primaryLabel;
  const lessonTitle = isNonTeachingDay
    ? nonTeachingEvent?.title || "Unterrichtsfreier Tag"
    : primaryLesson?.fach || "Freier Zeitraum";
  const lessonTime = isNonTeachingDay
    ? "Zeit für Planung oder Erholung"
    : primaryLesson?.zeit || "Keine Unterrichtszeit eingetragen";

  return (
    <section
      className="rounded-[28px] border shadow-sm overflow-hidden"
      style={{ borderColor: themeColors.border, backgroundColor: themeColors.page }}
    >
      <div
        className="px-5 py-5 sm:px-7 sm:py-6"
        style={{
          color: themeColors.text,
          background: `linear-gradient(135deg, ${themeColors.surface}, ${themeColors.surfaceStrong})`,
        }}
      >
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[0.625rem] font-black uppercase tracking-[0.18em]" style={{ color: themeColors.accent }}>
              <Sparkles size={13} />
              Mein Tag
              {previewLabel && (
                <span className="rounded-full border px-2 py-0.5" style={{ color: themeColors.muted, borderColor: themeColors.border, backgroundColor: themeColors.card }}>
                  {previewLabel}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight" style={{ color: themeColors.text }}>{greeting}</h2>
            <p className="mt-1 text-sm font-semibold" style={{ color: themeColors.muted }}>{dateLabel}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex rounded-2xl border p-1" style={{ borderColor: themeColors.border, backgroundColor: themeColors.card }}>
              {modeOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onModeChange(option.id)}
                  className={`flex-1 sm:flex-none rounded-xl px-3 py-2 text-left transition-all ${
                    mode === option.id ? "bg-white !text-slate-900 shadow-lg" : ""
                  }`}
                  style={mode === option.id ? undefined : { color: themeColors.muted }}
                >
                  <span className="block text-[0.6875rem] font-black">{option.label}</span>
                  <span className={`block text-[0.5625rem] font-semibold ${mode === option.id ? "text-slate-500" : "text-slate-500"}`}>{option.hint}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onPrivacyModeChange(!privacyMode)}
              className={`rounded-2xl border px-3 py-2 text-[0.6875rem] font-black transition-all flex items-center justify-center gap-2 ${
                privacyMode ? "border-emerald-400/30 bg-emerald-400/15" : ""
              }`}
              style={{ color: privacyMode ? themeColors.accent : themeColors.muted, borderColor: themeColors.border, backgroundColor: themeColors.card }}
              title="Sensible Namen und Hinweise auf dem Dashboard ausblenden"
            >
              {privacyMode ? <EyeOff size={15} /> : <Eye size={15} />}
              {privacyMode ? "Präsentation aktiv" : "Privatansicht"}
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-6 rounded-2xl border p-4 sm:p-5" style={{ borderColor: themeColors.border, backgroundColor: themeColors.card }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[0.625rem] font-black uppercase tracking-[0.16em]" style={{ color: themeColors.accent }}>{lessonLabel}</div>
                <div className="mt-2 text-xl sm:text-2xl font-black" style={{ color: themeColors.text }}>{lessonTitle}</div>
                <div className="mt-1 flex items-center gap-2 text-sm font-semibold" style={{ color: themeColors.muted }}>
                  <Clock3 size={15} />
                  {lessonTime}
                </div>
              </div>
              <div className="rounded-2xl bg-emerald-400/15 p-3 text-emerald-300"><CalendarDays size={22} /></div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate(isNonTeachingDay ? "wochenplanung" : "cockpit")}
              className="mt-5 w-full sm:w-auto rounded-xl bg-emerald-400 px-4 py-2.5 text-[0.75rem] font-black text-slate-950 hover:bg-emerald-300 transition-colors flex items-center justify-center gap-2"
            >
              {isNonTeachingDay ? <CalendarDays size={15} /> : <Play size={15} fill="currentColor" />}
              {isNonTeachingDay ? "Morgen vorbereiten" : "Unterricht starten"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("anwesenheit")}
            className="lg:col-span-3 rounded-2xl border p-4 text-left transition-colors"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.card, color: themeColors.text }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[0.625rem] font-black uppercase tracking-[0.14em] text-slate-400">Anwesenheit</div>
              <UserCheck size={18} className="text-sky-300" />
            </div>
            <div className="mt-3 text-2xl font-black">
              {privacyMode ? "••" : attendanceRecorded ? `${Math.max(0, totalStudents - absentCount)}/${totalStudents}` : "—"}
            </div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              {privacyMode
                ? "Sensible Details verborgen"
                : !attendanceRecorded
                  ? "Noch nicht erfasst"
                  : absentCount === 0
                    ? "Alle anwesend"
                    : `${absentCount} abwesend`}
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("wochenplanung")}
            className="lg:col-span-3 rounded-2xl border p-4 text-left transition-colors"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.card, color: themeColors.text }}
          >
            <div className="flex items-center justify-between">
              <div className="text-[0.625rem] font-black uppercase tracking-[0.14em] text-slate-400">Termine heute</div>
              <CalendarDays size={18} className="text-violet-300" />
            </div>
            <div className="mt-3 text-2xl font-black">{visibleEvents.length}</div>
            <div className="mt-1 text-xs font-semibold text-slate-400 truncate">
              {visibleEvents[0]?.title || "Keine besonderen Termine"}
            </div>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-8 p-5 sm:p-6 border-b lg:border-b-0 lg:border-r border-slate-100">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-black text-slate-900">Heute zu erledigen</h3>
              <p className="text-[0.6875rem] font-semibold text-slate-500">Die wichtigsten Hinweise an einem Ort</p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[0.625rem] font-black text-slate-600">{visibleActions.length}</span>
          </div>
          {visibleActions.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {visibleActions.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.type === "finanzen" ? "orga" : item.type === "diagnostik" ? "diagnostik" : item.type === "anwesenheit" ? "anwesenheit" : "dashboard")}
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3 text-left hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm">
                    {item.icon || <AlertCircle size={15} />}
                  </span>
                  <span className="min-w-0 flex-1 text-[0.75rem] font-bold text-slate-700">
                    {privacyMode ? "Hinweis in der Privatansicht verfügbar" : item.text}
                  </span>
                  <ChevronRight size={14} className="shrink-0 text-slate-300 group-hover:text-indigo-500" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-emerald-800">
              <CheckCircle2 size={20} />
              <span className="text-sm font-bold">Für heute sind keine dringenden Punkte offen.</span>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 p-5 sm:p-6">
          <h3 className="font-black text-slate-900">Schnellaktionen</h3>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: "Anwesenheit", page: "anwesenheit", icon: UserCheck },
              { label: "Wochenplan", page: "wochenplanung", icon: CalendarDays },
              { label: "Unterricht", page: "cockpit", icon: Presentation },
              { label: "Notiz", page: "dashboard", icon: Sparkles },
            ].map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onNavigate(action.page)}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
                >
                  <Icon size={16} className="text-indigo-600" />
                  <span className="mt-2 block text-[0.6875rem] font-black text-slate-700">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
