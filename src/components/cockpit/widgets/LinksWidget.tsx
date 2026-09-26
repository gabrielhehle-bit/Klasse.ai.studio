import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ExternalLink,
  QrCode,
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  MoreVertical,
  X,
  Check,
  Globe,
  Sparkles,
  Wifi,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  UnterrichtsLink,
  LinkCategory,
  LINK_CATEGORIES,
  LINK_EMOJI_PALETTE,
  DEFAULT_SAMPLE_LINKS,
  isAllowedUrl,
  normalizeUrl,
  addLink,
  editLink,
  deleteLink,
  moveLink,
  migrateLegacyLinks,
  resolveCanonicalWidgetLinks,
  SECURE_LINK_ATTRIBUTES,
} from '../../../lib/linksAlgorithm';

export interface LinksWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  app?: any;
  setApp?: (app: any) => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
  showSettings?: boolean;
  onCloseSettings?: () => void;
}

export const LinksWidget: React.FC<LinksWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp: _setApp,
  currentIsLight = true,
  isFullscreen = false,
  showSettings: externalShowSettings,
  onCloseSettings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('LinksWidget', containerRef);
  const isFs = isFullscreen || size.category === 'fullscreen';

  // 1. Kanonische Datenquelle auflösen (widget.settings ist die einzige kanonische Quelle)
  const [links, setLinks] = useState<UnterrichtsLink[]>(() => {
    const resolved = resolveCanonicalWidgetLinks(
      widget?.settings,
      app?.quickLinks
    );
    return resolved.links;
  });

  // 2. Einmalige Legacy-Migration in widget.settings persistieren
  // Nur falls im Widget-Settings noch gar keine LinksState-Daten existierten
  const migrationDoneRef = useRef(false);
  useEffect(() => {
    if (!migrationDoneRef.current && onUpdate && widget?.id) {
      const resolved = resolveCanonicalWidgetLinks(widget?.settings, app?.quickLinks);
      if (resolved.shouldPersistMigration) {
        migrationDoneRef.current = true;
        onUpdate({
          settings: {
            ...(widget.settings || {}),
            linksState: {
              links: resolved.links,
              lastUpdated: new Date().toISOString(),
            },
          },
        });
      }
    }
  }, [widget?.id, onUpdate, widget?.settings, app?.quickLinks]);

  // 3. Synchronisation bei externen Widget-Settings Updates (z. B. Undo/Redo)
  useEffect(() => {
    const rawSettings = widget?.settings?.linksState?.links ?? widget?.settings?.links;
    if (Array.isArray(rawSettings)) {
      setLinks(migrateLegacyLinks(rawSettings));
    }
  }, [widget?.settings?.linksState?.links, widget?.settings?.links]);

  // 4. Persistenz-Helfer (schreibt AUSSCHLIESSLICH in widget.settings via onUpdate)
  // app.quickLinks wird NICHT beschrieben -> Keine Doppel-Synchronisation, keine Kollisionen.
  const persistLinks = (newList: UnterrichtsLink[]) => {
    setLinks(newList);

    if (onUpdate && widget?.id) {
      onUpdate({
        settings: {
          ...(widget.settings || {}),
          linksState: {
            links: newList,
            lastUpdated: new Date().toISOString(),
          },
        },
      });
    }
  };

  // Lokale Modal- und Aktionszustände
  const [localManaging, setLocalManaging] = useState(false);
  const hasExternalSettingsControl = typeof externalShowSettings === 'boolean';
  const isManaging = hasExternalSettingsControl ? externalShowSettings : localManaging;
  const closeManaging = () => {
    if (hasExternalSettingsControl) onCloseSettings?.();
    else setLocalManaging(false);
  };
  const [isAdding, setIsAdding] = useState(false);
  const [editingLink, setEditingLink] = useState<UnterrichtsLink | null>(null);
  const [qrModalLink, setQrModalLink] = useState<UnterrichtsLink | null>(null);
  const [compactShowAll, setCompactShowAll] = useState(false);

  // Formular-Zustände für Hinzufügen / Bearbeiten
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<LinkCategory>('web');
  const [formEmoji, setFormEmoji] = useState('🌐');
  const [formError, setFormError] = useState<string | null>(null);

  const openAddForm = () => {
    setFormTitle('');
    setFormUrl('');
    setFormCategory('web');
    setFormEmoji('🌐');
    setFormError(null);
    setEditingLink(null);
    setIsAdding(true);
  };

  const openEditForm = (link: UnterrichtsLink) => {
    setEditingLink(link);
    setFormTitle(link.title);
    setFormUrl(link.url);
    setFormCategory(link.category || 'web');
    setFormEmoji(link.iconEmoji || '🌐');
    setFormError(null);
    setIsAdding(false);
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingLink(null);
    setFormError(null);
  };

  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Bitte gib einen Titel für das Material ein.');
      return;
    }

    if (!isAllowedUrl(formUrl)) {
      setFormError('Ungültige oder unsichere URL (nur https://, http:// oder /... erlaubt).');
      return;
    }

    if (editingLink) {
      const res = editLink(links, editingLink.id, {
        title: formTitle,
        url: formUrl,
        category: formCategory,
        iconEmoji: formEmoji,
      });
      if (!res.success) {
        setFormError(res.error || 'Fehler beim Speichern.');
        return;
      }
      persistLinks(res.links);
    } else {
      const res = addLink(links, {
        title: formTitle,
        url: formUrl,
        category: formCategory,
        iconEmoji: formEmoji,
      });
      if (!res.success) {
        setFormError(res.error || 'Fehler beim Hinzufügen.');
        return;
      }
      persistLinks(res.links);
    }

    closeForm();
  };

  const handleDelete = (id: string) => {
    const updated = deleteLink(links, id);
    persistLinks(updated);
    if (editingLink?.id === id) {
      closeForm();
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const updated = moveLink(links, index, direction);
    persistLinks(updated);
  };

  const handleLoadDefaults = () => {
    persistLinks(DEFAULT_SAMPLE_LINKS);
  };

  // Angezeigte Links je nach Responsive-Kategorie
  const displayedLinks = useMemo(() => {
    if (size.isCompact && !compactShowAll) {
      return links.slice(0, 3);
    }
    return links;
  }, [links, size.isCompact, compactShowAll]);

  // Farb- und Designvariablen
  const bgCard = currentIsLight
    ? 'bg-white/80 border-slate-200/80 shadow-xs'
    : 'bg-zinc-800/80 border-white/10 shadow-xs';
  const textPrimary = currentIsLight ? 'text-slate-900' : 'text-slate-100';
  const textSecondary = currentIsLight ? 'text-slate-500' : 'text-slate-400';
  const headerBg = currentIsLight
    ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent'
    : 'bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-transparent';

  return (
    <div
      ref={containerRef}
      id="widget-links-container"
      className="flex flex-col h-full w-full min-h-0 select-none overflow-hidden relative"
    >
      {/* Shared widget frame owns the canonical title. Keep only context and actions here. */}
      <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-2.5 py-1.5 dark:border-white/10">
        <span className="min-w-0 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400">
          {links.length === 0 ? 'Keine Links aktiv' : `${links.length} ${links.length === 1 ? 'Link' : 'Links'}`}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            id="links-add-btn-header"
            type="button"
            onClick={openAddForm}
            title="Neuen Unterrichts-Link hinzufügen"
            aria-label="Link hinzufügen"
            className="flex min-h-11 items-center justify-center gap-1 rounded-xl bg-accent px-3 text-xs font-black text-accent-text transition-all hover:bg-accent-hover active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            {!size.isCompact && <span>Neu</span>}
          </button>

          {!hasExternalSettingsControl && (
            <button
              id="links-manage-toggle-btn"
              type="button"
              onClick={() => setLocalManaging(open => !open)}
              title={isManaging ? 'Verwaltung schließen' : 'Links verwalten & sortieren'}
              aria-label="Links verwalten"
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition-all ${
                isManaging
                  ? 'bg-accent text-accent-text border-accent'
                  : currentIsLight
                  ? 'bg-white/80 hover:bg-slate-100 text-slate-700 border-slate-200'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-slate-200 border-white/10'
              }`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {hasExternalSettingsControl && isManaging && (
        <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-2.5 py-1 dark:border-white/10">
          <span className="text-[10px] font-black uppercase tracking-wider text-accent">Links verwalten</span>
          <button
            type="button"
            onClick={closeManaging}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Link-Einstellungen schließen"
            title="Einstellungen schließen"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 2. Scrollbarer Inhaltsbereich */}
      <div
        id="links-content-scrollable"
        className="flex-1 overflow-y-auto min-h-0 p-2.5 space-y-2"
      >
        {links.length === 0 ? (
          <div
            id="links-empty-state"
            className={`flex flex-col items-center justify-center text-center p-6 border border-dashed rounded-2xl h-full ${
              currentIsLight
                ? 'bg-slate-50/50 border-slate-300/80 text-slate-600'
                : 'bg-zinc-900/40 border-white/10 text-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-accent-soft flex items-center justify-center mb-3">
              <Globe className="w-6 h-6 text-accent" />
            </div>
            <h4 className={`text-sm font-black mb-1 ${textPrimary}`}>
              Noch keine Unterrichtslinks hinterlegt
            </h4>
            <p className={`text-xs max-w-[280px] mb-4 ${textSecondary}`}>
              Hinterlege wichtige Onlineübungen, Erklärvideos, Buchseiten oder Padlets für die aktuelle Stunde.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                id="links-empty-add-btn"
                type="button"
                onClick={openAddForm}
                className="px-3 py-2 bg-accent hover:bg-accent-hover text-accent-text text-xs font-black rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Link hinzufügen</span>
              </button>
              <button
                id="links-empty-defaults-btn"
                type="button"
                onClick={handleLoadDefaults}
                className={`px-3 py-2 border text-xs font-bold rounded-xl transition-all cursor-pointer min-h-[44px] ${
                  currentIsLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-200'
                }`}
              >
                <span>Beispiele laden</span>
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`grid gap-2 ${
              size.isLarge || isFs
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {displayedLinks.map((link, index) => {
              const isFirst = index === 0;
              const isLast = index === links.length - 1;
              const categoryObj = LINK_CATEGORIES.find((c) => c.id === link.category);

              return (
                <div
                  key={link.id}
                  id={`link-card-${link.id}`}
                  className={`flex flex-col justify-between p-3 rounded-2xl border transition-all relative ${bgCard} ${
                    isManaging ? 'ring-2 ring-accent-soft' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="text-xl shrink-0 select-none" role="img" aria-label={link.title}>
                        {link.iconEmoji || categoryObj?.defaultEmoji || '🌐'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`font-black break-words ${
                              isFs ? 'text-lg' : 'text-xs'
                            } ${textPrimary}`}
                          >
                            {link.title}
                          </span>
                        </div>
                        {categoryObj && (
                          <span
                            className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider ${
                              currentIsLight
                                ? 'bg-accent-soft text-accent'
                                : 'bg-accent-soft text-accent'
                            }`}
                          >
                            {categoryObj.label}
                          </span>
                        )}
                        {link.description && !size.isCompact && (
                          <p className={`text-[10px] mt-1 line-clamp-1 ${textSecondary}`}>
                            {link.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Aktionen im Verwaltungsmodus */}
                    {isManaging && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={isFirst}
                          onClick={() => handleMove(index, 'up')}
                          title="Nach oben verschieben"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => handleMove(index, 'down')}
                          title="Nach unten verschieben"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 disabled:opacity-30 cursor-pointer"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditForm(link)}
                          title="Bearbeiten"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-zinc-700 text-accent cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          title="Löschen"
                          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Primäre Interaktion: Link sicher öffnen & QR-Code anzeigen */}
                  <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                    {/* QR Code Button */}
                    <button
                      id={`link-qr-btn-${link.id}`}
                      type="button"
                      onClick={() => setQrModalLink(link)}
                      title="QR-Code für Tablets der Klasse groß anzeigen"
                      className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-black transition-all cursor-pointer min-h-[38px] ${
                        currentIsLight
                          ? 'bg-slate-100 hover:bg-slate-200 border-slate-300/80 text-slate-700'
                          : 'bg-zinc-700 hover:bg-zinc-600 border-white/10 text-slate-200'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5 shrink-0 text-accent" />
                      <span>QR</span>
                    </button>

                    {/* Sicherer Öffnen-Link */}
                    <a
                      id={`link-open-btn-${link.id}`}
                      href={link.url}
                      {...SECURE_LINK_ATTRIBUTES}
                      className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 text-xs font-black text-accent-text shadow-xs transition-all hover:bg-accent-hover active:scale-98 cursor-pointer"
                    >
                      <span>Öffnen</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. Compact "Mehr anzeigen" Toggle */}
        {size.isCompact && links.length > 3 && (
          <div className="pt-1">
            <button
              id="links-compact-toggle-btn"
              type="button"
              onClick={() => setCompactShowAll(!compactShowAll)}
              className={`w-full py-1.5 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer min-h-[36px] ${
                currentIsLight
                  ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-white/10 text-slate-300'
              }`}
            >
              {compactShowAll ? (
                <span>Weniger anzeigen (3)</span>
              ) : (
                <span>Alle Links anzeigen ({links.length})</span>
              )}
            </button>
          </div>
        )}

        {/* 4. Dezent: Offline / Sicherheitshinweis */}
        <div className="pt-2 pb-1 flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 px-1 select-none">
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-accent/80" />
            <span>Widget 100 % offline • Externe Links benötigen Internet</span>
          </div>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
            <span>Sicher & trackingfrei</span>
          </div>
        </div>
      </div>

      {/* 5. Modal: Link hinzufügen oder bearbeiten */}
      {(isAdding || editingLink) && (
        <div
          id="links-modal-overlay"
          className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3"
        >
          <div
            id="links-modal-dialog"
            className={`w-full max-w-sm rounded-2xl p-4 shadow-2xl border flex flex-col gap-3 ${
              currentIsLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-zinc-900 border-white/15 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10">
              <span className="text-sm font-black">
                {editingLink ? 'Unterrichts-Link bearbeiten' : 'Neuen Unterrichts-Link anlegen'}
              </span>
              <button
                type="button"
                onClick={closeForm}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              {/* Titel */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Titel des Materials / der Seite *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z. B. Mathe-Übung Brüche"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-accent ${
                    currentIsLight
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-zinc-800 border-white/10 text-slate-100'
                  }`}
                />
              </div>

              {/* URL */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Web-Adresse (URL) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://anton.app oder www.schule.at"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-accent ${
                    currentIsLight
                      ? 'bg-slate-50 border-slate-300 text-slate-800'
                      : 'bg-zinc-800 border-white/10 text-slate-100'
                  }`}
                />
                <span className="text-[9px] text-slate-400 mt-0.5 block">
                  Erlaubt: https://, http:// oder relative interne Pfade.
                </span>
              </div>

              {/* Kategorie & Emoji */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Kategorie
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const newCat = e.target.value as LinkCategory;
                      setFormCategory(newCat);
                      const catObj = LINK_CATEGORIES.find((c) => c.id === newCat);
                      if (catObj) setFormEmoji(catObj.defaultEmoji);
                    }}
                    className={`w-full px-2 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-accent ${
                      currentIsLight
                        ? 'bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-zinc-800 border-white/10 text-slate-100'
                    }`}
                  >
                    {LINK_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.defaultEmoji} {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Symbol (Icon)
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-xl px-2 py-1 rounded-lg border border-slate-200 dark:border-zinc-700 shrink-0">
                      {formEmoji}
                    </span>
                    <div className="flex gap-1 overflow-x-auto py-1">
                      {LINK_EMOJI_PALETTE.slice(0, 5).map((em) => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setFormEmoji(em)}
                          className={`px-1.5 py-1 text-sm rounded hover:scale-110 transition-transform ${
                            formEmoji === em ? 'bg-accent-soft' : ''
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Fehleranzeige */}
              {formError && (
                <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer min-h-[40px]"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-accent-text text-xs font-black rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer min-h-[40px]"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingLink ? 'Änderungen speichern' : 'Link speichern'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: QR-Code Anzeige für Smartboard & Tablets */}
      {qrModalLink && (
        <div
          id="links-qr-modal-overlay"
          className="absolute inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none"
        >
          <div
            id="links-qr-modal-dialog"
            className={`w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col items-center text-center relative ${
              currentIsLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-zinc-900 border-white/15 text-slate-100'
            }`}
          >
            {/* Schließen Button */}
            <button
              id="links-qr-modal-close-btn"
              type="button"
              onClick={() => setQrModalLink(null)}
              aria-label="QR-Code schließen"
              className="absolute top-3 right-3 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Titel */}
            <div className="flex items-center gap-2 mb-1 pr-6">
              <span className="text-2xl">{qrModalLink.iconEmoji || '🌐'}</span>
              <h3 className="font-black text-base truncate">{qrModalLink.title}</h3>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
              Mit dem Tablet oder Smartphone scannen, um direkt zur Seite zu gelangen.
            </p>

            {/* QR Code Canvas (lokal generiert, 100% offline) */}
            <div className="p-4 bg-white rounded-2xl shadow-inner border border-slate-200 mb-3 flex items-center justify-center">
              <QRCodeCanvas
                value={qrModalLink.url}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* URL Vorschau & Button */}
            <div className="w-full space-y-2">
              <span className="text-[10px] text-slate-400 font-mono block truncate max-w-full px-2">
                {qrModalLink.url}
              </span>

              <div className="flex items-center gap-2">
                <a
                  href={qrModalLink.url}
                  {...SECURE_LINK_ATTRIBUTES}
                  className="flex-1 py-2 px-3 bg-accent hover:bg-accent-hover active:scale-95 text-accent-text font-black text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  <span>Link im Browser öffnen</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
