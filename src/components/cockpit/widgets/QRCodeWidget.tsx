import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LinksWidget } from './LinksWidget';
import {
  QrCode,
  ExternalLink,
  Copy,
  Check,
  Maximize2,
  X,
  RotateCcw,
  Globe,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useWidgetSize, useWidgetOverflowGuard } from '../widgetLayout';
import {
  QRCodeContentInfo,
  parseQRCodeInput,
  calculateOptimalQRSize,
  getCanonicalQRSettings,
  SECURE_QR_LINK_ATTRIBUTES,
  QR_PRESETS,
  DEFAULT_QR_VALUE,
  DEFAULT_QR_LABEL,
} from '../../../lib/qrcodeAlgorithm';

export interface QRCodeWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  showSettings?: boolean;
  onCloseSettings?: () => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
  app?: any;
}

export const QRCodeWidget: React.FC<QRCodeWidgetProps> = ({
  widget,
  onUpdate,
  currentIsLight = true,
  isFullscreen = false,
  app,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('QRCodeWidget', containerRef);
  const isFs = isFullscreen || size.category === 'fullscreen';

  // 1. Initialer Zustand aus widget.settings (Kanonische Quelle)
  const initialSettings = useMemo(() => {
    return getCanonicalQRSettings(widget?.settings);
  }, [widget?.settings?.content, widget?.settings?.link, widget?.settings?.label]);

  const [inputVal, setInputVal] = useState(initialSettings.content);
  const [inputLabel, setInputLabel] = useState(initialSettings.label);
  const [copied, setCopied] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'qr' | 'links'>('qr');
  const [copyError, setCopyError] = useState(false);

  // Synchronisieren, wenn sich widget.settings von außen ändert (z. B. Vorlagenwechsel)
  useEffect(() => {
    const canonical = getCanonicalQRSettings(widget?.settings);
    setInputVal(canonical.content);
    setInputLabel(canonical.label);
  }, [widget?.settings?.content, widget?.settings?.link, widget?.settings?.label]);

  // Persistenz via onUpdate (debounced oder bei Preset-Klick)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSettingsRef = useRef(widget?.settings);
  latestSettingsRef.current = widget?.settings;
  const persistSettings = (newContent: string, newLabel: string, immediate = false) => {
    if (!onUpdate || !widget?.id) return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    const apply = () => {
      persistTimeoutRef.current = null;
      onUpdate({ settings: {
        ...(latestSettingsRef.current || {}),
        content: newContent,
        link: newContent, // Abwärtskompatibel
        label: newLabel,
        lastUpdated: new Date().toISOString(),
      } });
    };
    if (immediate) apply();
    else persistTimeoutRef.current = setTimeout(apply, 350);
  };
  useEffect(() => () => {
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
  }, []);

  // Reaktiv analysierter QR-Inhalt
  const contentInfo: QRCodeContentInfo = useMemo(() => {
    return parseQRCodeInput(inputVal, inputLabel);
  }, [inputVal, inputLabel]);
  // Oversize legacy content is retained and editable, but must not crash the
  // QR encoder when pupils open a classroom widget containing long text.
  const qrTooLong = new TextEncoder().encode(contentInfo.encodedValue).length > 1000;

  // Dynamische QR-Größenberechnung
  const qrPixelSize = useMemo(() => {
    return calculateOptimalQRSize(
      size.width || 320,
      size.height || 260,
      size.category,
      size.isShort
    );
  }, [size.width, size.height, size.category, size.isShort]);

  // Kopierfunktion mit visuellem Feedback
  const handleCopy = async () => {
    if (!inputVal) return;
    try {
      if (!navigator?.clipboard?.writeText) throw new Error('Zwischenablage nicht verfügbar');
      await navigator.clipboard.writeText(contentInfo.encodedValue || inputVal);
      setCopyError(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2500);
    }
  };

  // Preset anwenden
  const handleSelectPreset = (value: string, label: string) => {
    setInputVal(value);
    setInputLabel(label);
    persistSettings(value, label, true);
  };

  // Eingabe leeren
  const handleClear = () => {
    setInputVal('');
    setInputLabel('Leer');
    persistSettings('', 'Leer', true);
  };

  // Typ-Icon
  const renderTypeIcon = () => {
    if (contentInfo.type === 'url') {
      return <Globe className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  };

  // Design-Klassen
  const bgCard = currentIsLight
    ? 'bg-white/80 border-slate-200/80 shadow-xs'
    : 'bg-zinc-800/80 border-white/10 shadow-xs';
  const textPrimary = currentIsLight ? 'text-slate-900' : 'text-slate-100';
  const textSecondary = currentIsLight ? 'text-slate-500' : 'text-slate-400';
  const headerBg = currentIsLight
    ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent'
    : 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-transparent';

  return (
    <div
      ref={containerRef}
      id="widget-qrcode-container"
      className="flex flex-col h-full w-full min-h-0 select-none overflow-hidden relative"
    >
      <nav role="group" aria-label="QR-Code und Links" className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-200 p-2 dark:border-zinc-700">
        <button type="button" aria-pressed={activePanel === 'qr'} onClick={() => setActivePanel('qr')}
          className={`min-h-11 rounded-xl px-2 text-xs font-bold ${activePanel === 'qr'
            ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-white'}`}>
          QR-Code
        </button>
        <button type="button" aria-pressed={activePanel === 'links'} onClick={() => {
          persistSettings(inputVal, inputLabel, true);
          setIsLightboxOpen(false); setActivePanel('links');
        }}
          className={`min-h-11 rounded-xl px-2 text-xs font-bold ${activePanel === 'links'
            ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-white'}`}>
          Meine Links
        </button>
      </nav>
      {activePanel === 'links' && <div className="min-h-0 flex-1">
        <LinksWidget widget={widget} app={app} onUpdate={onUpdate}
          isFullscreen={isFullscreen} currentIsLight={currentIsLight} />
      </div>}
      {activePanel === 'qr' && <div className="flex min-h-0 flex-1 flex-col">
      {/* 1. Header */}
      <div
        id="qrcode-header"
        className={`flex items-center justify-between px-3 py-2 border-b shrink-0 ${headerBg} ${
          currentIsLight ? 'border-slate-200/80' : 'border-white/10'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <span className={`font-black tracking-tight block truncate ${isFs ? 'text-xl' : 'text-xs'} ${textPrimary}`}>
              QR-Code für die Klasse
            </span>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
              {renderTypeIcon()}
              <span>
                {contentInfo.type === 'url' ? 'Web-Link' : 'Freitext'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Aktionen: Vollbild & Leeren */}
        <div className="flex items-center gap-1 shrink-0">
          {inputVal && (
            <button
              id="qrcode-clear-btn"
              type="button"
              onClick={handleClear}
              title="Eingabe leeren"
              aria-label="QR-Code leeren"
              className={`p-1.5 rounded-lg border transition-all cursor-pointer min-h-11 min-w-11 flex items-center justify-center ${
                currentIsLight
                  ? 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300 border-white/10'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            id="qrcode-zoom-btn"
            type="button"
            onClick={() => { if (!qrTooLong && inputVal) setIsLightboxOpen(true); }}
            disabled={!inputVal || qrTooLong}
            title="Großanzeige auf Tafel / Beamer"
            aria-label="Großanzeige öffnen"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-lg transition-all cursor-pointer min-h-11"
          >
            <Maximize2 className="w-3.5 h-3.5 shrink-0" />
            {!size.isCompact && <span>Tafel</span>}
          </button>
        </div>
      </div>

      {/* 2. Inhaltsbereich */}
      <div
        id="qrcode-content-body"
        className="flex-1 flex flex-col min-h-0 p-2.5 space-y-2 overflow-y-auto"
      >
        {/* Eingabezeile */}
        <div className="space-y-1 shrink-0">
          <div className="relative flex items-center">
            <input
              id="qrcode-input-field"
              type="text"
              aria-label="URL oder Text für den QR-Code"
              placeholder="Web-Adresse (https://...) oder Text (z. B. Aufgabe S. 42 Nr. 3)..."
              value={inputVal}
              maxLength={1000}
              onChange={(e) => {
                const val = e.target.value.slice(0, 1000);
                setInputVal(val);
                persistSettings(val, inputLabel);
              }}
              className={`w-full pl-2.5 pr-8 py-1.5 text-xs font-semibold rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all ${
                currentIsLight
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-zinc-800 border-white/15 text-slate-100'
              }`}
            />
            {inputVal && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Eingabe löschen"
                className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {qrTooLong && <p role="alert" className="rounded-lg bg-rose-100 p-2 text-[11px] font-bold text-rose-800">
            Zu viel Inhalt für einen zuverlässig lesbaren QR-Code. Bitte Text oder Link kürzen.
          </p>}
          {/* Dezenter Sicherheitshinweis & neutrale Beispiele im Bearbeitungsbereich */}
          <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 px-1 pt-0.5 truncate">
            <span className="truncate">z. B. „Aufgabe S. 42 Nr. 3“ oder „Lösungswort: Regenbogen“</span>
            <span className="shrink-0 ml-1.5 opacity-85">Keine vertraulichen Zugangsdaten am Smartboard anzeigen.</span>
          </div>

          {/* Presets (in STANDARD & LARGE direkt sichtbar, in COMPACT dezent) */}
          {!size.isCompact && !size.isShort && (
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar shrink-0">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-0.5">
                Vorlagen:
              </span>
              {QR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.value, p.label)}
                  className={`px-2 py-0.5 rounded-lg border text-[10px] font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    inputVal === p.value
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : currentIsLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-slate-300 border-white/10'
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mittiger Bereich: QR-Code Canvas */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative py-1">
          {inputVal && !qrTooLong ? (
            <div
              id="qrcode-canvas-wrapper"
              onClick={() => setIsLightboxOpen(true)}
              title="Klicken für Tafel-Großansicht"
              className="p-3 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center aspect-square object-contain overflow-hidden cursor-zoom-in hover:scale-103 transition-transform group relative select-none"
            >
              <QRCodeCanvas
                value={contentInfo.encodedValue}
                size={qrPixelSize}
                level="M"
                includeMargin={false}
              />
              <div className="absolute inset-0 bg-emerald-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-2 py-1 bg-black/75 text-white text-[10px] font-black rounded-lg shadow-md flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  <span>Großansicht</span>
                </span>
              </div>
            </div>
          ) : (
            <div
              id="qrcode-empty-state"
              className={`flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-2xl w-full h-full max-h-[160px] ${
                currentIsLight
                  ? 'bg-slate-50/50 border-slate-300 text-slate-500'
                  : 'bg-zinc-900/40 border-white/10 text-slate-400'
              }`}
            >
              <QrCode className="w-8 h-8 opacity-40 mb-1.5 text-emerald-500" />
              <span className="text-xs font-black mb-0.5">Kein Inhalt eingegeben</span>
              <span className="text-[10px] opacity-75">Tippe oben eine URL oder eine Textaufgabe ein</span>
            </div>
          )}
        </div>

        {/* Aktionsleiste unten */}
        <div className="flex items-center gap-1.5 shrink-0 pt-1 border-t border-slate-200/60 dark:border-white/5">
          {/* Kopieren-Button */}
          {copyError && <span role="alert" className="text-xs font-bold text-rose-600">Kopieren fehlgeschlagen</span>}
          <button
            id="qrcode-copy-btn"
            type="button"
            disabled={!inputVal}
            onClick={handleCopy}
            title="Inhalt in die Zwischenablage kopieren"
            aria-label="Inhalt kopieren"
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer min-h-[38px] disabled:opacity-30 ${
              copied
                ? 'bg-emerald-600 text-white border-emerald-600'
                : currentIsLight
                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300/80 text-slate-800'
                : 'bg-zinc-700 hover:bg-zinc-600 border-white/10 text-slate-100'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopiert!' : 'Kopieren'}</span>
          </button>

          {/* Link testen Button (nur bei sicherer URL) */}
          {contentInfo.isSafeUrl && contentInfo.safeHref && (
            <a
              id="qrcode-open-link-btn"
              href={contentInfo.safeHref}
              {...SECURE_QR_LINK_ATTRIBUTES}
              title="Link sicher im neuen Tab testen"
              aria-label="Link im neuen Tab öffnen"
              className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer min-h-[38px]"
            >
              <span>Testen</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Dezent: 100% offline & sicher */}
        <div className="pt-0.5 flex items-center justify-between text-[9px] text-slate-400 dark:text-zinc-500 select-none">
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
            <span>100 % lokal generiert</span>
          </div>
          <span>Kein Schülertracking</span>
        </div>
      </div>

      {/* 3. Lightbox / Tafel-Vollbild Modal */}
      {isLightboxOpen && !!inputVal && !qrTooLong && createPortal(
        <div
          id="qrcode-lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog" aria-modal="true" aria-label="QR-Code Großanzeige"
          className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 select-none cursor-zoom-out"
        >
          <div
            id="qrcode-lightbox-dialog"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-md rounded-3xl p-6 shadow-2xl border flex flex-col items-center text-center relative cursor-default ${
              currentIsLight
                ? 'bg-white border-slate-200 text-slate-800'
                : 'bg-zinc-900 border-white/15 text-slate-100'
            }`}
          >
            {/* Schließen Button */}
            <button
              id="qrcode-lightbox-close-btn"
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Großanzeige schließen"
              className="absolute top-3.5 right-3.5 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer min-w-11 min-h-11 flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Titel */}
            <div className="flex items-center gap-2 mb-1 pr-6">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg truncate">{inputLabel || 'QR-Code für die Klasse'}</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 max-w-[280px]">
              Mit dem Tablet oder Smartphone scannen. Auch aus mehreren Metern Entfernung lesbar.
            </p>

            {/* Riesiger QR Code Canvas */}
            <div className="p-5 bg-white rounded-3xl shadow-lg border border-slate-200 mb-4 flex items-center justify-center">
              <QRCodeCanvas
                value={contentInfo.encodedValue}
                size={Math.max(180, Math.min(window.innerWidth - 100, window.innerHeight - 310, 380))}
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Inhalt Anzeige & Aktionen */}
            <div className="w-full space-y-2">
              <span className="text-xs text-slate-500 font-mono block truncate max-w-full px-2 py-1 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                {contentInfo.encodedValue || inputVal}
              </span>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Kopiert!' : 'Inhalt kopieren'}</span>
                </button>

                {contentInfo.isSafeUrl && contentInfo.safeHref && (
                  <a
                    href={contentInfo.safeHref}
                    {...SECURE_QR_LINK_ATTRIBUTES}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                  >
                    <span>Im Browser öffnen</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>}
    </div>
  );
};
