import React, { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  RefreshCw,
  Play,
  LayoutGrid,
  Check,
  Sparkles,
  Copy,
  Search,
  Bookmark,
  Layers,
  Clock,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { CockpitWidgetConfig } from "../../types";

interface WorkspaceProfile {
  id: string;
  name: string;
  layout: CockpitWidgetConfig[];
  icon?: string;
  category?: string;
  description?: string;
  createdAt?: string;
}

interface CockpitVorlagenModalProps {
  isOpen: boolean;
  onClose: () => void;
  cockpitWidgets: CockpitWidgetConfig[];
  workspaceProfiles: WorkspaceProfile[];
  defaultProfiles: WorkspaceProfile[];
  onSaveProfile: (data: {
    name: string;
    icon?: string;
    category?: string;
    description?: string;
  }) => void;
  onLoadProfile: (profileId: string) => void;
  onUpdateProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onResetToDefault: () => void;
  currentIsLight: boolean;
  slotNames: Record<string, string>;
  saveSlotName: (slot: string, name: string) => void;
  handleSaveLayoutSlot: (slot: "A" | "B" | "C") => void;
  handleLoadLayoutSlot: (slot: "A" | "B" | "C") => void;
  showToast: (msg: string, type: "success" | "info" | "error" | "warning") => void;
}

const WIDGET_NAME_MAP: Record<string, string> = {
  clock: "Uhrzeit & Datum",
  timer: "Timer",
  noisemeter: "Lärmampel",
  trafficlight: "Ampel",
  randomname: "Zufallsschüler",
  instruction: "Arbeitsanweisung",
  vocabulary: "Lernwörter",
  studentlist: "Schülerliste",
  groups: "Gruppen",
  qrcode: "QR-Code",
  image: "Projektor",
  phases: "Stundenverlauf",
  sounds: "Signal-Töne",
  todo: "To-Do-Liste",
  dienste: "Klassendienste",
  klassenglas: "Klassenglas",
  links: "Material & Links",
  stopwatch: "Stoppuhr",
  calculator: "Rechner",
  dice: "Würfel",
  weather: "Wetter",
  aiquiz: "KI-Quiz",
  riddle: "Rätsel",
  scoreboard: "Punkte",
  wheel: "Glücksrad",
  breathing: "Atemübung",
  drawing: "Whiteboard",
  pet: "Klassentier",
  timeline: "Zeitstrahl",
  mathbalancer: "Zahlen-Waage",
  mathcards: "Kopfrechnen",
  numberline: "Zahlengerade",
  wordchain: "Wortkette",
  wordbuilder: "Wortbaustelle",
};

const CATEGORIES = [
  { id: "all", label: "Alle Vorlagen", icon: "✨" },
  { id: "custom", label: "Eigene Vorlagen", icon: "⭐" },
  { id: "morgenkreis", label: "Morgenkreis & Start", icon: "🌅" },
  { id: "stille", label: "Stillarbeit & Fokus", icon: "🤫" },
  { id: "gruppe", label: "Gruppen & Partner", icon: "👥" },
  { id: "fach", label: "Fachunterricht", icon: "📚" },
];

const EMOJI_OPTIONS = [
  "📋", "🌅", "🤫", "🔢", "📚", "👥", "🎨", "⏱️", 
  "🧪", "🏆", "💡", "🎵", "🎯", "⭐", "🔔", "🧩"
];

export const CockpitVorlagenModal: React.FC<CockpitVorlagenModalProps> = ({
  isOpen,
  onClose,
  cockpitWidgets,
  workspaceProfiles,
  defaultProfiles,
  onSaveProfile,
  onLoadProfile,
  onUpdateProfile,
  onDeleteProfile,
  onResetToDefault,
  currentIsLight,
  slotNames,
  saveSlotName,
  handleSaveLayoutSlot,
  handleLoadLayoutSlot,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📋");
  const [newCategory, setNewCategory] = useState("Morgenkreis");
  const [newDescription, setNewDescription] = useState("");

  if (!isOpen) return null;

  const activeWidgets = cockpitWidgets.filter((w) => w.visible);

  // Combine user profiles and default profiles
  const allProfiles: WorkspaceProfile[] = [
    ...(workspaceProfiles && workspaceProfiles.length > 0
      ? workspaceProfiles
      : defaultProfiles),
  ];

  const filteredProfiles = allProfiles.filter((p) => {
    const isCustom = p.id.startsWith("profile_custom_") || p.id.startsWith("profile_1") || p.id.startsWith("profile_2") || p.id.startsWith("profile_3");
    if (selectedCategory === "custom" && !isCustom) return false;
    if (selectedCategory === "morgenkreis" && !p.name.toLowerCase().includes("morgen") && p.category !== "Morgenkreis") return false;
    if (selectedCategory === "stille" && !p.name.toLowerCase().includes("still") && p.category !== "Stillarbeit") return false;
    if (selectedCategory === "gruppe" && !p.name.toLowerCase().includes("gruppe") && p.category !== "Gruppenarbeit") return false;
    if (selectedCategory === "fach" && !["mathe", "deutsch", "fach"].some(k => p.name.toLowerCase().includes(k))) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description?.toLowerCase().includes(q) || false;
      return matchName || matchDesc;
    }
    return true;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    onSaveProfile({
      name: newName.trim(),
      icon: newIcon,
      category: newCategory,
      description: newDescription.trim(),
    });

    setNewName("");
    setNewDescription("");
    setActiveTab("browse");
  };

  const handleCopyProfileJson = (p: WorkspaceProfile) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(p.layout, null, 2));
      showToast(`Layout "${p.name}" als JSON in Zwischenablage kopiert!`, "success");
    } catch (e) {
      showToast("Kopieren fehlgeschlagen.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-4xl max-h-[85vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 ${
          currentIsLight
            ? "bg-white border-slate-200 text-slate-800"
            : "bg-zinc-900 border-white/10 text-neutral-100"
        }`}
      >
        {/* Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            currentIsLight ? "bg-slate-50/80 border-slate-200/80" : "bg-zinc-950/50 border-white/5"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-xl shadow-xs">
              📋
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Lehrercockpit Vorlagen & Layouts
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {allProfiles.length} Vorlagen
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Erstelle, verwalte und lade Arbeitsbereich-Vorlagen für deinen Unterricht
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                currentIsLight
                  ? "hover:bg-slate-200 text-slate-500"
                  : "hover:bg-zinc-800 text-slate-400"
              }`}
              title="Schließen"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Bar */}
        <div
          className={`px-6 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 overflow-x-auto no-scrollbar ${
            currentIsLight ? "bg-white border-slate-200/60" : "bg-zinc-900/80 border-white/5"
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("browse")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "browse"
                  ? "bg-indigo-600 text-white shadow-sm font-black"
                  : currentIsLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  : "bg-zinc-800 hover:bg-zinc-700 text-slate-300"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Vorlagen Durchsuchen</span>
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-emerald-600 text-white shadow-sm font-black"
                  : currentIsLight
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60"
                  : "bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-800/40"
              }`}
            >
              <Plus size={14} />
              <span>Aktuelles Board als Vorlage speichern</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                {activeWidgets.length} Widgets
              </span>
            </button>
          </div>

          {activeTab === "browse" && (
            <div className="relative w-64 shrink-0">
              <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Vorlagen suchen..."
                className={`w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                  currentIsLight
                    ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                    : "bg-zinc-800 border-white/10 focus:bg-zinc-950 focus:border-indigo-500"
                }`}
              />
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {activeTab === "create" ? (
            /* CREATE VORLAGE FORM */
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
              <div
                className={`p-5 rounded-2xl border ${
                  currentIsLight
                    ? "bg-emerald-50/50 border-emerald-200/70"
                    : "bg-emerald-950/20 border-emerald-900/40"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles size={18} className="text-emerald-500" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    Aktuelles Cockpit-Layout erfassen
                  </h4>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  Speichere dein aktuelles Arrangement aus Positionen, Größen und Einstellungen der <strong>{activeWidgets.length} geöffneten Widgets</strong> dauerhaft als Vorlage.
                </p>

                {/* Preview Active Widgets Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {activeWidgets.length > 0 ? (
                    activeWidgets.map((w) => (
                      <span
                        key={w.id}
                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1"
                      >
                        <Check size={11} className="text-emerald-500" />
                        {WIDGET_NAME_MAP[w.type] || w.type}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-bold italic">
                      ⚠️ Hinweis: Aktuell sind keine Widgets auf dem Board geöffnet.
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Vorlagen-Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="z.B. Mathe-Freiarbeit 3. Klasse, Morgenkreis, Stille-Test..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border outline-none transition-all ${
                      currentIsLight
                        ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                        : "bg-zinc-800 border-white/10 focus:bg-zinc-950 focus:border-indigo-500"
                    }`}
                  />
                </div>

                {/* Emoji Icon Picker */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Symbol / Emoji
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNewIcon(emoji)}
                        className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer border ${
                          newIcon === emoji
                            ? "bg-indigo-600 border-indigo-600 text-white scale-110 shadow-md"
                            : currentIsLight
                            ? "bg-slate-100 hover:bg-slate-200 border-slate-200"
                            : "bg-zinc-800 hover:bg-zinc-700 border-white/10"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Kategorie
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                      currentIsLight
                        ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                        : "bg-zinc-800 border-white/10 focus:bg-zinc-950 focus:border-indigo-500"
                    }`}
                  >
                    <option value="Morgenkreis">🌅 Morgenkreis & Tagesstart</option>
                    <option value="Stillarbeit">🤫 Stillarbeit & Testzeit</option>
                    <option value="Gruppenarbeit">👥 Gruppen- & Partnerarbeit</option>
                    <option value="Fachunterricht">📚 Fachunterricht (Mathe/Deutsch/etc.)</option>
                    <option value="Rituale">✨ Rituale & Pausen</option>
                    <option value="Sonstiges">📋 Sonstiges</option>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                    Beschreibung / Verwendungszweck (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="z.B. Enthält Timer (15 Min), Lärmampel auf Stufe 2, Zufallsschüler & Arbeitsanweisung..."
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
                      currentIsLight
                        ? "bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500"
                        : "bg-zinc-800 border-white/10 focus:bg-zinc-950 focus:border-indigo-500"
                    }`}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("browse")}
                    className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      currentIsLight
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        : "bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                    }`}
                  >
                    Abbrechen
                  </button>

                  <button
                    type="submit"
                    disabled={!newName.trim()}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    <span>Vorlage jetzt speichern</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* BROWSE VORLAGEN LIST */
            <div className="flex flex-col gap-6">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer border ${
                      selectedCategory === cat.id
                        ? "bg-indigo-600 border-indigo-600 text-white shadow-xs font-black"
                        : currentIsLight
                        ? "bg-slate-100 hover:bg-slate-200 border-slate-200/80 text-slate-700"
                        : "bg-zinc-800 hover:bg-zinc-700 border-white/5 text-slate-300"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Grid of Vorlagen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProfiles.map((p) => {
                  const visibleWidgetsInProfile = p.layout.filter((w) => w.visible);
                  const isCustom =
                    p.id.startsWith("profile_custom_") ||
                    p.id.startsWith("profile_1") ||
                    p.id.startsWith("profile_2") ||
                    p.id.startsWith("profile_3");

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all duration-200 hover:shadow-lg ${
                        currentIsLight
                          ? "bg-white border-slate-200/80 hover:border-indigo-300"
                          : "bg-zinc-950/60 border-white/10 hover:border-indigo-500/50"
                      }`}
                    >
                      <div>
                        {/* Top info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-indigo-500/10 text-xl flex items-center justify-center shrink-0">
                              {p.icon || "📋"}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black truncate text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                {p.name}
                                {isCustom && (
                                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    Eigene
                                  </span>
                                )}
                              </h4>
                              {p.category && (
                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 block">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyProfileJson(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                              title="Layout als JSON kopieren"
                            >
                              <Copy size={13} />
                            </button>

                            {isCustom && (
                              <button
                                onClick={() => onDeleteProfile(p.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                title="Vorlage löschen"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>

                        {p.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-3 line-clamp-2">
                            {p.description}
                          </p>
                        )}

                        {/* Included Widgets Chips */}
                        <div className="mb-4">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                            <Layers size={10} />
                            Enthaltene Widgets ({visibleWidgetsInProfile.length})
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar">
                            {visibleWidgetsInProfile.length > 0 ? (
                              visibleWidgetsInProfile.map((w) => (
                                <span
                                  key={w.id}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-white/5"
                                >
                                  {WIDGET_NAME_MAP[w.type] || w.type}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Keine Widgets aktiv
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                        <button
                          onClick={() => {
                            onUpdateProfile(p.id);
                            showToast(`Vorlage "${p.name}" mit aktuellem Board-Layout aktualisiert!`, "success");
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ${
                            currentIsLight
                              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              : "bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                          }`}
                          title="Überschreibt diese Vorlage mit deinem aktuellen Board"
                        >
                          <RefreshCw size={12} />
                          <span>Überschreiben</span>
                        </button>

                        <button
                          onClick={() => {
                            onLoadProfile(p.id);
                            onClose();
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Vorlage laden</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredProfiles.length === 0 && (
                  <div className="col-span-2 text-center py-12 border-2 border-dashed rounded-3xl opacity-60">
                    <Bookmark size={32} className="mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-bold text-slate-500">
                      Keine passenden Vorlagen gefunden.
                    </p>
                    <button
                      onClick={() => setActiveTab("create")}
                      className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-700"
                    >
                      Erstelle jetzt deine erste eigene Vorlage!
                    </button>
                  </div>
                )}
              </div>

              {/* Schnell-Slots Section */}
              <div
                className={`p-4 rounded-2xl border ${
                  currentIsLight ? "bg-slate-50/80 border-slate-200/80" : "bg-zinc-950/40 border-white/5"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      Schnell-Slots (Tastatur / Quick-Presets)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    1-Klick Plätze für den täglichen Wechsel
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["A", "B", "C"] as const).map((slot) => {
                    let isSaved = false;
                    if (slot === "C") {
                      isSaved = !!localStorage.getItem("cockpitLayoutC");
                    } else {
                      isSaved = slot === "A" ? !!(slotNames as any).cockpitLayoutA : !!(slotNames as any).cockpitLayoutB;
                    }

                    return (
                      <div
                        key={slot}
                        className={`p-3 rounded-xl border flex flex-col gap-2 ${
                          currentIsLight ? "bg-white border-slate-200" : "bg-zinc-900 border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-black text-xs flex items-center justify-center">
                            {slot}
                          </span>
                          <input
                            type="text"
                            value={slotNames[slot] || `Schnell-Slot ${slot}`}
                            onChange={(e) => saveSlotName(slot, e.target.value)}
                            placeholder={`Slot ${slot} Name...`}
                            className="flex-1 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveLayoutSlot(slot)}
                            className="flex-1 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10.5px] hover:bg-indigo-100 transition-colors"
                          >
                            Speichern
                          </button>
                          <button
                            onClick={() => {
                              handleLoadLayoutSlot(slot);
                              onClose();
                            }}
                            className="flex-1 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10.5px] transition-colors shadow-xs"
                          >
                            Laden
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset to Default */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (window.confirm("Bist du sicher, dass du das Board auf das Werkseinstellungs-Standardlayout zurücksetzen möchtest?")) {
                      onResetToDefault();
                      onClose();
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  ⚠️ Werks-Standardlayout laden
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
