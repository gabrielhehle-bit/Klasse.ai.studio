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
  Clock
} from "lucide-react";
import { CockpitWidgetConfig } from "../../types";
import { Button, IconButton, Badge, Chip, Input, Select, Textarea } from "../ui";

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
  initialTab?: "browse" | "create";
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
  handleLoadLayoutSlot: (slot: "A" | "B" | "C") => boolean;
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
  kidattendance: "Ich bin da! (Kinder)",
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
  starsreview: "Sterne der Woche",
  wheel: "Glücksrad",
  breathing: "Atemübung",
  drawing: "Whiteboard",
  pet: "Klassentier",
  timeline: "Zeitstrahl",
  mathbalancer: "Zahlen-Waage",
  mathcards: "Kopfrechentrainer",
  multitrainer: "Kopfrechentrainer",
  mathchain: "Kopfrechentrainer",
  kopfrechnen: "Kopfrechentrainer",
  fractionvisualizer: "Bruch-Visualisierer",
  fractions: "Bruch-Visualisierer",
  fractioncake: "Bruch-Visualisierer",
  fractiongrid: "Bruch-Visualisierer",
  numberline: "Zahlenraum-Studio",
  zahlenraum: "Zahlenraum-Studio",
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
  initialTab = "browse",
  onClose,
  cockpitWidgets,
  workspaceProfiles,
  defaultProfiles,
  onSaveProfile,
  onLoadProfile,
  onUpdateProfile,
  onDeleteProfile,
  onResetToDefault,
  slotNames,
  saveSlotName,
  handleSaveLayoutSlot,
  handleLoadLayoutSlot,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"browse" | "create">("browse");
  const [selectedCategory, setSelectedCategory] = useState("all");

  React.useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📋");
  const [newCategory, setNewCategory] = useState("Morgenkreis");
  const [newDescription, setNewDescription] = useState("");

  if (!isOpen) return null;

  const activeWidgets = cockpitWidgets.filter((w) => w.visible);

  // Only explicitly saved user profiles are shown. Klassio ships without example layouts.
  const allProfiles: WorkspaceProfile[] = workspaceProfiles || [];

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
    } catch {
      showToast("Kopieren fehlgeschlagen.", "error");
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-[2rem] border border-[var(--border-default,var(--border))] shadow-2xl flex flex-col overflow-hidden bg-[var(--surface-card,var(--surface))] text-[var(--text-primary)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center font-black text-xl shadow-xs">
              📋
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                Layouts
                <Badge variant="neutral" size="sm">
                  {allProfiles.length} Vorlagen
                </Badge>
              </h3>
              <p className="text-xs text-[var(--text-muted)] font-medium">
                Speichere und lade nur deine eigenen Arbeitsbereiche
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="Schließen"
              onClick={onClose}
            >
              <X size={18} />
            </IconButton>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="px-6 py-2.5 border-b border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))]/40 flex items-center justify-between gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === "browse" ? "primary" : "secondary"}
              size="sm"
              leftIcon={<LayoutGrid size={14} />}
              onClick={() => setActiveTab("browse")}
            >
              Eigene Layouts
            </Button>

            <Button
              variant={activeTab === "create" ? "primary" : "secondary"}
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setActiveTab("create")}
            >
              <span>Aktuelles Board als Vorlage speichern</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/15">
                {activeWidgets.length} Widgets
              </span>
            </Button>
          </div>

          {activeTab === "browse" && (
            <div className="relative w-64 shrink-0">
              <Search size={13} className="absolute left-3 top-2.5 text-[var(--text-muted)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Eigene Layouts suchen..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--focus-ring,var(--accent))]"
              />
            </div>
          )}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 space-y-6">
          {activeTab === "create" ? (
            /* CREATE VORLAGE FORM */
            <div className="max-w-2xl mx-auto flex flex-col gap-5">
              <div className="p-5 rounded-2xl border border-[var(--success-border)] bg-[var(--success-soft)] text-[var(--success-text)]">
                <div className="flex items-center gap-2.5 mb-2">
                  <Sparkles size={18} />
                  <h4 className="text-xs font-black uppercase tracking-wider">
                    Aktuelles Cockpit-Layout erfassen
                  </h4>
                </div>
                <p className="text-xs font-medium leading-relaxed opacity-90">
                  Speichere Positionen, Größen und Widget-Einstellungen der <strong>{activeWidgets.length} geöffneten Widgets</strong>. Tafeltext, Zeichnungen und Papier bleiben absichtlich seitenlokal und werden nicht in eine Vorlage kopiert.
                </p>

                {/* Preview Active Widgets Chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {activeWidgets.length > 0 ? (
                    activeWidgets.map((w) => (
                      <span
                        key={w.id}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[var(--surface-card,var(--surface))] border border-[var(--border-default,var(--border))] text-[var(--text-primary)] shadow-xs flex items-center gap-1"
                      >
                        <Check size={11} className="text-[var(--success-text)]" />
                        {WIDGET_NAME_MAP[w.type] || w.type}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-[var(--warning-text)] font-bold italic">
                      ⚠️ Hinweis: Aktuell sind keine Widgets auf dem Board geöffnet.
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="flex flex-col gap-4">
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Vorlagen-Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Name für dein Layout..."
                  />
                </div>

                {/* Emoji Icon Picker */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
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
                            ? "bg-[var(--accent)] border-[var(--accent)] text-white scale-110 shadow-md"
                            : "bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-card,var(--surface))] border-[var(--border-default,var(--border))]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Kategorie
                  </label>
                  <Select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Morgenkreis">🌅 Morgenkreis & Tagesstart</option>
                    <option value="Stillarbeit">🤫 Stillarbeit & Testzeit</option>
                    <option value="Gruppenarbeit">👥 Gruppen- & Partnerarbeit</option>
                    <option value="Fachunterricht">📚 Fachunterricht (Mathe/Deutsch/etc.)</option>
                    <option value="Rituale">✨ Rituale & Pausen</option>
                    <option value="Sonstiges">📋 Sonstiges</option>
                  </Select>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                    Beschreibung / Verwendungszweck (optional)
                  </label>
                  <Textarea
                    rows={2}
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="z.B. Enthält Timer (15 Min), Lärmampel auf Stufe 2, Zufallsschüler & Arbeitsanweisung..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setActiveTab("browse")}
                  >
                    Abbrechen
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    leftIcon={<Check size={16} />}
                    disabled={!newName.trim()}
                  >
                    Vorlage jetzt speichern
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* BROWSE VORLAGEN LIST */
            <div className="flex flex-col gap-5">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
                {CATEGORIES.map((cat) => (
                  <Chip
                    key={cat.id}
                    selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </Chip>
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
                      className="p-4 rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] flex flex-col justify-between transition-all duration-200 hover:shadow-md"
                    >
                      <div>
                        {/* Top info */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-9 h-9 rounded-xl bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] text-xl flex items-center justify-center shrink-0">
                              {p.icon || "📋"}
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black truncate text-[var(--text-primary)] flex items-center gap-2">
                                {p.name}
                                {isCustom && (
                                  <Badge variant="warning" size="sm">
                                    Eigene
                                  </Badge>
                                )}
                              </h4>
                              {p.category && (
                                <span className="text-[10px] font-bold text-[var(--text-muted)] block">
                                  {p.category}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <IconButton
                              variant="ghost"
                              size="sm"
                              aria-label="Layout als JSON kopieren"
                              onClick={() => handleCopyProfileJson(p)}
                            >
                              <Copy size={13} />
                            </IconButton>

                            {isCustom && (
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label="Vorlage löschen"
                                onClick={() => onDeleteProfile(p.id)}
                              >
                                <Trash2 size={13} />
                              </IconButton>
                            )}
                          </div>
                        </div>

                        {p.description && (
                          <p className="text-xs text-[var(--text-muted)] font-medium mb-3 line-clamp-2">
                            {p.description}
                          </p>
                        )}

                        {/* Included Widgets Chips */}
                        <div className="mb-4">
                          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--text-muted)] mb-1.5 flex items-center gap-1">
                            <Layers size={10} />
                            Enthaltene Widgets ({visibleWidgetsInProfile.length})
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto no-scrollbar">
                            {visibleWidgetsInProfile.length > 0 ? (
                              visibleWidgetsInProfile.map((w) => (
                                <span
                                  key={w.id}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-secondary)] border border-[var(--border-default,var(--border))]"
                                >
                                  {WIDGET_NAME_MAP[w.type] || w.type}
                                </span>
                              ))
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)] italic">
                                Keine Widgets aktiv
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-default,var(--border))]">
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<RefreshCw size={12} />}
                          onClick={() => {
                            onUpdateProfile(p.id);
                            showToast(`Vorlage "${p.name}" mit aktuellem Board-Layout aktualisiert!`, "success");
                          }}
                        >
                          Überschreiben
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          leftIcon={<Play size={12} fill="currentColor" />}
                          onClick={() => {
                            onLoadProfile(p.id);
                            onClose();
                          }}
                        >
                          Vorlage laden
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {filteredProfiles.length === 0 && (
                  <div className="col-span-2 text-center py-12 border-2 border-dashed border-[var(--border-default,var(--border))] rounded-3xl opacity-60">
                    <Bookmark size={32} className="mx-auto mb-2 text-[var(--text-muted)]" />
                    <p className="text-sm font-bold text-[var(--text-muted)]">
                      Noch keine passenden eigenen Vorlagen.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      className="mt-3"
                      onClick={() => setActiveTab("create")}
                    >
                      Erstelle jetzt deine erste eigene Vorlage!
                    </Button>
                  </div>
                )}
              </div>

              {/* Schnell-Slots Section */}
              <div className="p-4 rounded-2xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-[var(--accent)]" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                      Schnell-Slots
                    </h4>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">
                    Widget-Anordnung schnell wechseln · ohne Tafelinhalt
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {(["A", "B", "C"] as const).map((slot) => {
                    return (
                      <div
                        key={slot}
                        className="p-3 rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] flex flex-col gap-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] font-black text-xs flex items-center justify-center">
                            {slot}
                          </span>
                          <input
                            type="text"
                            value={slotNames[slot] || `Schnell-Slot ${slot}`}
                            onChange={(e) => saveSlotName(slot, e.target.value)}
                            placeholder={`Slot ${slot} Name...`}
                            className="flex-1 bg-transparent text-xs font-bold text-[var(--text-primary)] outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSaveLayoutSlot(slot)}
                          >
                            Speichern
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              if (handleLoadLayoutSlot(slot)) onClose();
                            }}
                          >
                            Laden
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reset to Default */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--danger-text)]"
                  onClick={() => {
                    if (window.confirm("Bist du sicher, dass du das Board auf das Werkseinstellungs-Standardlayout zurücksetzen möchtest?")) {
                      onResetToDefault();
                      onClose();
                    }
                  }}
                >
                  ⚠️ Werks-Standardlayout laden
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
