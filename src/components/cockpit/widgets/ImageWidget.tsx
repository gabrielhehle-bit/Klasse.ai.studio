import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Maximize2,
  Minimize2,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  X,
  Link,
  FolderOpen,
  AlertCircle,
  Move,
  Check,
  Info,
} from 'lucide-react';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  ImageWidgetSettings,
  DEFAULT_IMAGE_SETTINGS,
  validateImageFile,
  isSafeImageUrl,
  normalizeRotation,
  rotateClockwise,
  clampZoom,
  zoomIn,
  zoomOut,
  clampPan,
  calculateDownscaledDimensions,
  getCanonicalImageSettings,
  sanitizeFileName,
  sanitizeImageAltText,
  SafeObjectUrlManager,
  MAX_IMAGE_DIMENSION,
} from '../../../lib/imageAlgorithm';

export interface ImageWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  app?: any;
  showSettings?: boolean;
  onCloseSettings?: () => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
}

export const ImageWidget: React.FC<ImageWidgetProps> = ({
  widget,
  onUpdate,
  app,
  showSettings = false,
  onCloseSettings,
  currentIsLight = true,
  isFullscreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('ImageWidget', containerRef);
  const isFs = isFullscreen || size.category === 'fullscreen';

  // Object-URL-Manager zur Vermeidung von Speicherlecks
  const urlManagerRef = useRef<SafeObjectUrlManager>(new SafeObjectUrlManager());
  useEffect(() => {
    const manager = urlManagerRef.current;
    return () => {
      manager.revokeAll();
    };
  }, []);

  // 1. Initialer Zustand aus widget.settings (Kanonische Quelle)
  const initialSettings = useMemo(() => {
    return getCanonicalImageSettings(widget?.settings);
  }, [widget?.settings]);

  const [imageUrl, setImageUrl] = useState<string | null>(initialSettings.imageUrl);
  const [altText, setAltText] = useState<string>(initialSettings.altText);
  const [fileName, setFileName] = useState<string | undefined>(initialSettings.fileName);
  const [rotation, setRotation] = useState<number>(initialSettings.rotation);
  const [scale, setScale] = useState<number>(initialSettings.scale);
  const [pan, setPan] = useState<{ x: number; y: number }>({
    x: initialSettings.panX,
    y: initialSettings.panY,
  });

  // UI-Zustände
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAltEditing, setIsAltEditing] = useState(false);
  const [tempAlt, setTempAlt] = useState('');

  // Pan-Interaktion via Pointer
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ startX: number; startY: number; initPanX: number; initPanY: number }>({
    startX: 0,
    startY: 0,
    initPanX: 0,
    initPanY: 0,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronisieren, wenn sich widget.settings von außen ändert
  useEffect(() => {
    const canonical = getCanonicalImageSettings(widget?.settings);
    setImageUrl(canonical.imageUrl);
    setAltText(canonical.altText);
    setFileName(canonical.fileName);
    setRotation(canonical.rotation);
    setScale(canonical.scale);
    setPan({ x: canonical.panX, y: canonical.panY });
  }, [widget?.settings]);

  // Persistenz-Helfer
  const persistSettings = useCallback(
    (newPartial: Partial<ImageWidgetSettings>) => {
      const merged: ImageWidgetSettings = {
        imageUrl,
        altText,
        fileName,
        rotation,
        scale,
        panX: pan.x,
        panY: pan.y,
        fit: 'contain',
        ...newPartial,
        lastUpdated: new Date().toISOString(),
      };

      // Kompatibilität: widget.settings direkt mutieren falls vorhanden
      if (widget) {
        widget.settings = { ...(widget.settings || {}), ...merged };
      }

      if (onUpdate && widget?.id) {
        onUpdate({
          settings: widget.settings,
        });
      }
    },
    [widget, onUpdate, imageUrl, altText, fileName, rotation, scale, pan]
  );

  // Clientseitiges Verarbeiten und sanftes Downscaling großer Bilder
  const processAndLoadImage = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Ungültige Bilddatei.');
      setIsProcessing(false);
      return;
    }

    try {
      // 1. Temporäre URL für Bilddimensionen erzeugen
      const tempUrl = urlManagerRef.current.create(file);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
        img.src = tempUrl;
      });

      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;
      const downscaled = calculateDownscaledDimensions(origW, origH, MAX_IMAGE_DIMENSION);

      let finalDataUrl: string;

      if (downscaled.wasResized && typeof document !== 'undefined') {
        // Offscreen-Canvas zum sanften Verkleinern riesiger Fotos
        const canvas = document.createElement('canvas');
        canvas.width = downscaled.width;
        canvas.height = downscaled.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, downscaled.width, downscaled.height);
          const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          finalDataUrl = canvas.toDataURL(mimeType, 0.88);
        } else {
          // Fallback falls Canvas Context nicht erzeugbar
          finalDataUrl = await readFileAsDataUrl(file);
        }
      } else {
        // Normalgroßes Bild direkt als Data URL
        finalDataUrl = await readFileAsDataUrl(file);
      }

      // Temporäre URL freigeben
      urlManagerRef.current.revoke(tempUrl);

      const cleanName = validation.sanitizedName || 'Bild';
      const cleanAlt = sanitizeImageAltText(cleanName.replace(/\.[^.]+$/, ''));

      setImageUrl(finalDataUrl);
      setFileName(cleanName);
      setAltText(cleanAlt);
      setRotation(0);
      setScale(1);
      setPan({ x: 0, y: 0 });

      persistSettings({
        imageUrl: finalDataUrl,
        fileName: cleanName,
        altText: cleanAlt,
        rotation: 0,
        scale: 1,
        panX: 0,
        panY: 0,
        fileSizeBytes: file.size,
      });
    } catch (err: any) {
      setErrorMessage('Das Bild konnte nicht verarbeitet werden. Bitte prüfe das Format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Fehler beim Lesen der Datei.'));
      reader.readAsDataURL(file);
    });
  };

  // Datei-Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndLoadImage(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  // Drag & Drop Handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processAndLoadImage(file);
    }
  };

  // URL-Übernahme
  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setErrorMessage('Bitte eine Bild-URL eingeben.');
      return;
    }
    if (!isSafeImageUrl(trimmed)) {
      setErrorMessage('Unsichere oder ungültige URL. Bitte HTTPS- oder Daten-URL verwenden.');
      return;
    }

    setErrorMessage(null);
    setImageUrl(trimmed);
    setFileName('Web-Bild');
    setRotation(0);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsUrlModalOpen(false);
    setUrlInput('');

    persistSettings({
      imageUrl: trimmed,
      fileName: 'Web-Bild',
      rotation: 0,
      scale: 1,
      panX: 0,
      panY: 0,
    });
  };

  // Material-Auswahl aus Schulplaner
  const materialsList = useMemo(() => {
    return (app?.materialien || []).filter(
      (m: any) =>
        m.typ === 'bild' ||
        m.typ === 'tafelbild' ||
        (m.dateiInhalt && m.dateiInhalt.startsWith('data:image/'))
    );
  }, [app?.materialien]);

  const handleSelectMaterial = (mat: any) => {
    if (!mat?.dateiInhalt || !isSafeImageUrl(mat.dateiInhalt)) {
      setErrorMessage('Material enthält kein gültiges Bild.');
      return;
    }
    setImageUrl(mat.dateiInhalt);
    const cleanTitel = sanitizeFileName(mat.titel || 'Materialbild');
    setFileName(cleanTitel);
    setAltText(cleanTitel);
    setRotation(0);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setIsMaterialModalOpen(false);

    persistSettings({
      imageUrl: mat.dateiInhalt,
      fileName: cleanTitel,
      altText: cleanTitel,
      materialId: mat.id,
      rotation: 0,
      scale: 1,
      panX: 0,
      panY: 0,
    });
  };

  // Zoom-Aktionen
  const handleZoomIn = () => {
    const next = zoomIn(scale);
    setScale(next);
    const boundedPan = clampPan(pan.x, pan.y, next, size.width, size.height);
    setPan({ x: boundedPan.panX, y: boundedPan.panY });
    persistSettings({ scale: next, panX: boundedPan.panX, panY: boundedPan.panY });
  };

  const handleZoomOut = () => {
    const next = zoomOut(scale);
    setScale(next);
    const boundedPan = clampPan(pan.x, pan.y, next, size.width, size.height);
    setPan({ x: boundedPan.panX, y: boundedPan.panY });
    persistSettings({ scale: next, panX: boundedPan.panX, panY: boundedPan.panY });
  };

  const handleResetZoom = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    persistSettings({ scale: 1, panX: 0, panY: 0 });
  };

  // Rotation
  const handleRotate = () => {
    const next = rotateClockwise(rotation);
    setRotation(next);
    persistSettings({ rotation: next });
  };

  // Bild entfernen
  const handleRemoveImage = () => {
    setImageUrl(null);
    setFileName(undefined);
    setAltText('');
    setRotation(0);
    setScale(1);
    setPan({ x: 0, y: 0 });
    setErrorMessage(null);

    persistSettings({
      imageUrl: null,
      fileName: undefined,
      altText: '',
      rotation: 0,
      scale: 1,
      panX: 0,
      panY: 0,
    });
  };

  // Pointer Pan Handler (nur aktiv wenn scale > 1)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1) return;
    setIsPanning(true);
    panStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPanX: pan.x,
      initPanY: pan.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning || scale <= 1) return;
    const dx = e.clientX - panStartRef.current.startX;
    const dy = e.clientY - panStartRef.current.startY;
    const newX = panStartRef.current.initPanX + dx;
    const newY = panStartRef.current.initPanY + dy;
    const bounded = clampPan(newX, newY, scale, size.width, size.height);
    setPan({ x: bounded.panX, y: bounded.panY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignoriere Browser-Handling
    }
    persistSettings({ panX: pan.x, panY: pan.y });
  };

  // Alt-Text Speichern
  const handleSaveAlt = () => {
    const cleaned = sanitizeImageAltText(tempAlt);
    setAltText(cleaned);
    setIsAltEditing(false);
    persistSettings({ altText: cleaned });
  };

  // Prüfen, ob Category Compact ist
  const isCompact = size.category === 'compact';
  const isLargeOrAbove = size.category === 'large' || isFs;

  return (
    <div
      ref={containerRef}
      id={`image-widget-${widget?.id || 'main'}`}
      className={`relative flex flex-col h-full w-full select-none overflow-hidden rounded-2xl transition-colors ${
        currentIsLight
          ? 'bg-slate-50/80 text-slate-800'
          : 'bg-zinc-900/90 text-zinc-100'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Unsichtbarer Dateiupload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-indigo-500/20 backdrop-blur-xs border-2 border-dashed border-indigo-500 rounded-2xl flex flex-col items-center justify-center pointer-events-none p-4 text-center">
          <Upload size={36} className="text-indigo-600 dark:text-indigo-400 mb-2 animate-bounce" />
          <p className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Bild jetzt hier ablegen
          </p>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-semibold">
            PNG, JPG, WebP oder GIF
          </span>
        </div>
      )}

      {/* Fehlermeldung */}
      {errorMessage && (
        <div className="absolute top-2 inset-x-2 z-30 flex items-center justify-between gap-2 p-2 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 rounded-xl shadow-md text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span className="truncate font-medium text-[11px]">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-md hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-500 cursor-pointer shrink-0"
            title="Schließen"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Zustand: Bild vorhanden */}
      {imageUrl ? (
        <div className="relative flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden">
          {/* Haupt-Bildbühne (object-fit: contain, kein horizontaler Overflow) */}
          <div
            className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden min-h-0 ${
              scale > 1
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            } bg-slate-100/50 dark:bg-black/30`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {/* Bildanzeige */}
            <img
              src={imageUrl}
              alt={altText || fileName || 'Unterrichtsbild'}
              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              }}
              onError={() => {
                setErrorMessage('Bild konnte nicht geladen werden oder ist beschädigt.');
              }}
              referrerPolicy="no-referrer"
            />

            {/* Dezenter Zoom-Status Indikator wenn vergrößert */}
            {scale > 1 && (
              <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 border border-white/10 pointer-events-none">
                <Move size={10} />
                <span>{Math.round(scale * 100)}%</span>
                <span className="text-white/60 text-[9px]">(Ziehen zum Verschieben)</span>
              </div>
            )}
          </div>

          {/* Steuerelemente / Toolbar (F-UI Responsive: COMPACT vs STANDARD vs LARGE) */}
          <div className="shrink-0 flex items-center justify-between gap-1 p-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 z-20">
            {/* Linke Seite: Bildinfo & Alt-Text */}
            <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
              <span className="text-[11px] font-bold truncate text-slate-700 dark:text-zinc-300">
                {altText || fileName || 'Bild'}
              </span>
              {!isCompact && (
                <button
                  onClick={() => {
                    setTempAlt(altText);
                    setIsAltEditing(true);
                  }}
                  className="text-[9px] text-slate-400 hover:text-indigo-500 font-semibold cursor-pointer shrink-0"
                  title="Bildbeschreibung bearbeiten"
                >
                  Beschriften
                </button>
              )}
            </div>

            {/* Rechte Seite: Interaktive Werkzeuge */}
            <div className="flex items-center gap-1 shrink-0">
              {/* COMPACT Ansicht: Nur Kernwerkzeuge (Vollbild, Drehen, Optionen) */}
              {isCompact ? (
                <>
                  <button
                    onClick={handleRotate}
                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="90° Drehen"
                  >
                    <RotateCw size={16} />
                  </button>

                  <button
                    onClick={() => setIsLightboxOpen(true)}
                    className="p-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="Vollbild öffnen"
                  >
                    <Maximize2 size={16} />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="Anderes Bild auswählen"
                  >
                    <FolderOpen size={16} />
                  </button>
                </>
              ) : (
                /* STANDARD & LARGE Ansicht: Vollständige Zoom- und Werkzeugleiste */
                <>
                  {/* Zoom Controls */}
                  <div className="flex items-center gap-0.5 bg-slate-200/60 dark:bg-zinc-800/60 rounded-xl p-0.5 border border-slate-300/40 dark:border-white/5">
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={scale <= 0.5}
                      className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-200 disabled:opacity-30 transition-all cursor-pointer"
                      title="Verkleinern"
                    >
                      <ZoomOut size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="px-1.5 py-0.5 text-[10px] font-black tabular-nums text-slate-700 dark:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-700/60 rounded transition-all cursor-pointer"
                      title="Zoom zurücksetzen (100%)"
                    >
                      {Math.round(scale * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={scale >= 3.5}
                      className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-200 disabled:opacity-30 transition-all cursor-pointer"
                      title="Vergrößern"
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>

                  {/* 90° Drehung */}
                  <button
                    type="button"
                    onClick={handleRotate}
                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-zinc-300 font-bold transition-all cursor-pointer active:scale-95"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="90° im Uhrzeigersinn drehen"
                  >
                    <RotateCw size={15} />
                  </button>

                  {/* Vollbild (Sehr wichtig für Smartboard!) */}
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    title="Vollbild anzeigen (Smartboard)"
                  >
                    <Maximize2 size={14} />
                    <span className="hidden sm:inline">Vollbild</span>
                  </button>

                  {/* Bild austauschen */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 dark:text-zinc-400 transition-all cursor-pointer active:scale-95"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="Neues Bild wählen"
                  >
                    <FolderOpen size={15} />
                  </button>

                  {/* Bild entfernen */}
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 transition-all cursor-pointer active:scale-95"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    title="Bild entfernen"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 2. Zustand: Leerer Zustand (Kein Bild ausgewählt) */
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="max-w-xs w-full flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <ImageIcon size={28} />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
                Noch kein Bild ausgewählt
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Foto, Tafelbild, Arbeitsblatt oder Grafik der Klasse präsentieren.
              </p>
            </div>

            {/* Primärer Upload-Button (min. 44px Touch-Höhe) */}
            <div className="w-full flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                style={{ minHeight: TOUCH_TARGET_MIN }}
              >
                <Upload size={16} />
                <span>{isProcessing ? 'Wird geladen...' : 'Bild auswählen'}</span>
              </button>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                oder hier ablegen (PNG, JPG, WebP)
              </span>
            </div>

            {/* Sekundäre Optionen (Materialbibliothek & URL) */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/10 w-full justify-center">
              {materialsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(true)}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                >
                  <FolderOpen size={12} />
                  <span>Materialbibliothek ({materialsList.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsUrlModalOpen(true)}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Link size={12} />
                <span>Web-URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alt-Text / Beschriftungs-Dialog */}
      {isAltEditing && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Bild beschriften / Titel
              </h4>
              <button
                onClick={() => setIsAltEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={tempAlt}
              onChange={(e) => setTempAlt(e.target.value)}
              placeholder="z. B. Skelett des Menschen S. 42"
              maxLength={120}
              className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAltEditing(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveAlt}
                className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* URL Eingabe Modal */}
      {isUrlModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Bild über Web-Adresse einfügen
              </h4>
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://schule.at/beispiel.jpg"
              className="w-full p-2 text-xs rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none focus:border-indigo-500"
            />
            <p className="text-[10px] text-slate-400">
              Nur sichere direkte Bildadressen (HTTPS) verwenden.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                onClick={handleApplyUrl}
                className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materialbibliothek Modal */}
      {isMaterialModalOpen && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm max-h-[85%] bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Aus Materialbibliothek wählen
              </h4>
              <button
                onClick={() => setIsMaterialModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px]">
              {materialsList.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMaterial(m)}
                  className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-white/5 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FolderOpen size={14} className="text-indigo-500 shrink-0" />
                  <span className="truncate">{m.titel || 'Unbenanntes Material'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VOLLBILD / LIGHTBOX MODAL (1-Klick Vollbild auf Smartboard) */}
      {isLightboxOpen && imageUrl && (
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fadeIn">
          {/* Schwebende obere Leiste mit minimalen Controls */}
          <div className="w-full flex items-center justify-between z-30 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold truncate max-w-[300px]">
                {altText || fileName || 'Vollbild'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/10">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Verkleinern"
              >
                <ZoomOut size={18} />
              </button>

              <button
                onClick={handleResetZoom}
                className="px-2 py-1 text-xs font-bold tabular-nums text-white hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                title="100% Reset"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 3.5}
                className="p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                title="Vergrößern"
              >
                <ZoomIn size={18} />
              </button>

              <div className="w-[1px] h-5 bg-white/20 my-auto" />

              <button
                onClick={handleRotate}
                className="p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                title="90° Drehen"
              >
                <RotateCw size={18} />
              </button>

              <div className="w-[1px] h-5 bg-white/20 my-auto" />

              <button
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-rose-600 text-white transition-all cursor-pointer"
                style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                title="Vollbild schließen"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Vollbild-Bühne */}
          <div
            className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden my-2 ${
              scale > 1
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img
              src={imageUrl}
              alt={altText || fileName || 'Vollbildanzeige'}
              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
              style={{
                transform: `rotate(${rotation}deg) scale(${scale}) translate(${pan.x / scale}px, ${pan.y / scale}px)`,
              }}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Fußzeile mit Tastaturhinweis */}
          <div className="text-[11px] text-white/50 font-medium">
            Smartboard-Ansicht • 100 % lokal ohne Netzwerkübertragung
          </div>
        </div>
      )}
    </div>
  );
};
