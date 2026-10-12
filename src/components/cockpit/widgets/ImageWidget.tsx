import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  isPersistentImageSource,
  getImageMaterials,
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
  getImageFitDimensions,
} from '../../../lib/imageAlgorithm';

function ImageDialog({ label, onClose, children, fallbackFocus }: { label: string; onClose: () => void; children: React.ReactNode; fallbackFocus: () => HTMLElement | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  // Capture before React commits autoFocus inputs inside the new dialog.
  const openerRef = useRef(document.activeElement as HTMLElement | null);
  const fallbackRef = useRef(fallbackFocus);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      const target = openerRef.current?.isConnected ? openerRef.current : fallbackRef.current();
      target?.focus();
    };
  }, []);
  return createPortal(<dialog ref={ref} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-black/45 p-4 text-slate-900 backdrop-blur-sm open:flex items-center justify-center">
    {children}
  </dialog>, document.body);
}

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
  const loadVersion = useRef(0);
  const cancelSourceProbe = useRef<(() => void) | null>(null);
  useEffect(() => {
    const manager = urlManagerRef.current;
    return () => {
      loadVersion.current++;
      cancelSourceProbe.current?.();
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
  const persistedSource = useRef(initialSettings.imageUrl);
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
  const panGestureRef = useRef<{
    pointerId: number; target: HTMLDivElement;
    startX: number; startY: number; initPanX: number; initPanY: number;
    pan: { x: number; y: number };
  } | null>(null);
  const stopPan = useCallback((updateView = true) => {
    const gesture = panGestureRef.current;
    panGestureRef.current = null;
    if (updateView) setIsPanning(false);
    if (gesture) {
      try { gesture.target.releasePointerCapture(gesture.pointerId); } catch {}
    }
    return gesture?.pan;
  }, []);
  useEffect(() => () => { stopPan(false); }, [stopPan]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageStageRef = useRef<HTMLDivElement>(null);
  const lightboxStageRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const stage = isLightboxOpen ? lightboxStageRef.current : imageStageRef.current;
    if (!stage) return;
    const update = () => setStageSize({ width: stage.clientWidth, height: stage.clientHeight });
    const observer = new ResizeObserver(update);
    observer.observe(stage); update();
    return () => observer.disconnect();
  }, [imageUrl, isLightboxOpen]);
  const fitted = getImageFitDimensions(naturalSize.width, naturalSize.height, stageSize.width, stageSize.height, rotation);
  const imageStyle = { width: fitted.width || undefined, height: fitted.height || undefined,
    maxWidth: 'none', maxHeight: 'none', flexShrink: 0,
    transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${scale})` };
  const onImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setNaturalSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
  };

  // Synchronisieren, wenn sich widget.settings von außen ändert
  useEffect(() => {
    const canonical = getCanonicalImageSettings(widget?.settings);
    stopPan();
    if (persistedSource.current !== canonical.imageUrl) {
      persistedSource.current = canonical.imageUrl;
      loadVersion.current++;
      cancelSourceProbe.current?.();
      setIsProcessing(false);
    }
    setImageUrl(canonical.imageUrl);
    setAltText(canonical.altText);
    setFileName(canonical.fileName);
    setRotation(canonical.rotation);
    setScale(canonical.scale);
    setPan({ x: canonical.panX, y: canonical.panY });
  }, [widget?.settings, stopPan]);

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

      // Widget settings are immutable AppState. Mutating props here used to
      // corrupt undo/sync state when a different device updated the board.
      if (onUpdate && widget?.id) {
        onUpdate({ settings: { ...(widget.settings || {}), ...merged } });
      }
    },
    [widget, onUpdate, imageUrl, altText, fileName, rotation, scale, pan]
  );

  // Clientseitiges Verarbeiten und sanftes Downscaling großer Bilder
  const processAndLoadImage = async (file: File) => {
    const version = ++loadVersion.current;
    cancelSourceProbe.current?.();
    let tempUrl: string | undefined;
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
      tempUrl = urlManagerRef.current.create(file);

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'));
        img.src = tempUrl!;
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

      if (version !== loadVersion.current) return;

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
        materialId: undefined,
      });
    } catch (err: any) {
      if (version === loadVersion.current) setErrorMessage('Das Bild konnte nicht verarbeitet werden. Bitte prüfe das Format.');
    } finally {
      if (tempUrl) urlManagerRef.current.revoke(tempUrl);
      if (version === loadVersion.current) setIsProcessing(false);
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

  const dialogFallbackFocus = () => containerRef.current?.closest('[data-widget-type="image"]')
    ?.querySelector<HTMLElement>('button[aria-label$="Einstellungen öffnen"]') || null;

  const closeSourceDialog = (kind: 'url' | 'material') => {
    if (cancelSourceProbe.current) {
      loadVersion.current++; cancelSourceProbe.current(); setIsProcessing(false);
    }
    if (kind === 'url') setIsUrlModalOpen(false); else setIsMaterialModalOpen(false);
  };

  // Decode a candidate before changing the current image or persistent settings.
  const loadSource = async (source: string, title: string, materialId?: string) => {
    const version = ++loadVersion.current;
    cancelSourceProbe.current?.();
    setIsProcessing(true); setErrorMessage(null);
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const probe = new Image();
        const cleanup = () => {
          clearTimeout(timeout); probe.onload = null; probe.onerror = null;
          if (cancelSourceProbe.current === cancel) cancelSourceProbe.current = null;
          probe.src = '';
        };
        const cancel = () => { cleanup(); reject(new Error('Quelle gewechselt')); };
        const timeout = setTimeout(() => { cleanup(); reject(new Error('Zeitüberschreitung')); }, 12_000);
        cancelSourceProbe.current = cancel;
        probe.referrerPolicy = 'no-referrer';
        probe.onload = () => {
          const dimensions = { width: probe.naturalWidth, height: probe.naturalHeight };
          cleanup();
          if (dimensions.width > 0 && dimensions.height > 0) resolve(dimensions);
          else reject(new Error('Ungültiges Bild'));
        };
        probe.onerror = () => { cleanup(); reject(new Error('Ungültiges Bild')); };
        probe.src = source;
      });
      if (version !== loadVersion.current) return;
      // A material title is not a file path: preserve fractions such as 1/2.
      const name = sanitizeImageAltText(title) || 'Materialbild', caption = name;
      setNaturalSize(dimensions); setImageUrl(source); setFileName(name); setAltText(caption);
      setRotation(0); setScale(1); setPan({ x: 0, y: 0 });
      setIsMaterialModalOpen(false); setIsUrlModalOpen(false); setUrlInput('');
      persistSettings({ imageUrl: source, fileName: name, altText: caption,
        materialId, rotation: 0, scale: 1, panX: 0, panY: 0, fileSizeBytes: undefined });
    } catch {
      if (version === loadVersion.current) setErrorMessage('Dieses Bild konnte nicht geladen werden. Das bisherige Bild bleibt erhalten.');
    } finally {
      if (version === loadVersion.current) setIsProcessing(false);
    }
  };

  const confirmRemoteSource = (source: string) => !/^https:/i.test(source)
    || window.confirm('Ein externes Bild lädt Daten von der angegebenen Website. Verwende keine vertraulichen Schülerfotos oder privaten Dateien. Bildadresse übernehmen?');

  const handleApplyUrl = () => {
    const source = urlInput.trim();
    if (!source) { setErrorMessage('Bitte eine Bild-URL eingeben.'); return; }
    if (!isPersistentImageSource(source) || !/^https:\/\//i.test(source)) {
      setErrorMessage('Bitte eine gültige HTTPS-Bildadresse verwenden. Lokale Bilder kannst du direkt hochladen.'); return;
    }
    if (confirmRemoteSource(source)) void loadSource(source, 'Web-Bild');
  };

  const materialsList = useMemo(() => getImageMaterials(app?.materialien), [app?.materialien]);
  const handleSelectMaterial = (material: any) => {
    if (!isPersistentImageSource(material?.dateiInhalt)) {
      setErrorMessage('Material enthält kein gültiges dauerhaft gespeichertes Bild.'); return;
    }
    if (confirmRemoteSource(material.dateiInhalt)) void loadSource(material.dateiInhalt, material.titel || 'Materialbild', typeof material.id === 'string' ? material.id : undefined);
  };

  // Zoom-Aktionen
  const handleZoomIn = () => {
    const currentPan = stopPan() || pan;
    const next = zoomIn(scale);
    setScale(next);
    const boundedPan = clampPan(currentPan.x, currentPan.y, next, size.width, size.height);
    setPan({ x: boundedPan.panX, y: boundedPan.panY });
    persistSettings({ scale: next, panX: boundedPan.panX, panY: boundedPan.panY });
  };

  const handleZoomOut = () => {
    const currentPan = stopPan() || pan;
    const next = zoomOut(scale);
    setScale(next);
    const boundedPan = clampPan(currentPan.x, currentPan.y, next, size.width, size.height);
    setPan({ x: boundedPan.panX, y: boundedPan.panY });
    persistSettings({ scale: next, panX: boundedPan.panX, panY: boundedPan.panY });
  };

  const handleResetZoom = () => {
    stopPan();
    setScale(1);
    setPan({ x: 0, y: 0 });
    persistSettings({ scale: 1, panX: 0, panY: 0 });
  };
  const handleResetView = () => {
    stopPan();
    setRotation(0); setScale(1); setPan({ x: 0, y: 0 });
    persistSettings({ rotation: 0, scale: 1, panX: 0, panY: 0 });
  };

  // Rotation
  const handleRotate = () => {
    const currentPan = stopPan() || pan;
    const next = rotateClockwise(rotation);
    setRotation(next);
    setPan(currentPan);
    persistSettings({ rotation: next, panX: currentPan.x, panY: currentPan.y });
  };

  // Bild entfernen
  const handleRemoveImage = () => {
    stopPan();
    loadVersion.current++;
    cancelSourceProbe.current?.();
    setIsProcessing(false);
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
      materialId: undefined,
      fileSizeBytes: undefined,
    });
  };

  // One contact owns the pan gesture, including its latest uncommitted position.
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scale <= 1 || panGestureRef.current || e.button !== 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { return; }
    e.preventDefault();
    panGestureRef.current = {
      pointerId: e.pointerId, target: e.currentTarget,
      startX: e.clientX, startY: e.clientY, initPanX: pan.x, initPanY: pan.y,
      pan: { ...pan },
    };
    setIsPanning(true);
  };

  const movePan = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId || gesture.target !== e.currentTarget || scale <= 1) return;
    const bounded = clampPan(
      gesture.initPanX + e.clientX - gesture.startX,
      gesture.initPanY + e.clientY - gesture.startY,
      scale, size.width, size.height,
    );
    gesture.pan = { x: bounded.panX, y: bounded.panY };
    setPan(gesture.pan);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const gesture = panGestureRef.current;
    if (!gesture || gesture.pointerId !== e.pointerId || gesture.target !== e.currentTarget) return;
    // Cancel/lost-capture coordinates are not a new user movement.
    if (e.type === 'pointerup') movePan(e);
    const finalPan = stopPan();
    if (finalPan) persistSettings({ panX: finalPan.x, panY: finalPan.y });
  };

  const changeLightbox = (open: boolean) => {
    const finalPan = stopPan();
    if (finalPan) persistSettings({ panX: finalPan.x, panY: finalPan.y });
    setIsLightboxOpen(open);
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
      data-practice-root="image"
      data-image-rotation={rotation}
      data-image-scale={scale}
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
        aria-label="Tafelbild-Datei auswählen"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-40 bg-accent-soft backdrop-blur-xs border-2 border-dashed border-accent rounded-2xl flex flex-col items-center justify-center pointer-events-none p-4 text-center">
          <Upload size={36} className="text-accent mb-2 animate-bounce" />
          <p className="text-xs font-black uppercase tracking-wider text-accent">
            Bild jetzt hier ablegen
          </p>
          <span className="text-[10px] text-accent font-semibold">
            PNG, JPG, WebP oder GIF
          </span>
        </div>
      )}

      {/* Fehlermeldung */}
      {errorMessage && (
        <div role="alert" className="absolute top-2 inset-x-2 z-30 flex items-center justify-between gap-2 p-2 bg-rose-50 dark:bg-rose-950/90 border border-rose-200 dark:border-rose-800 rounded-xl shadow-md text-rose-700 dark:text-rose-300 text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle size={16} className="shrink-0 text-rose-500" />
            <span className="font-medium text-xs">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-500 cursor-pointer"
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
            ref={imageStageRef}
            data-image-stage
            className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden min-h-0 touch-none ${
              scale > 1
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            } bg-slate-100/50 dark:bg-black/30`}
            onPointerDown={handlePointerDown}
            onPointerMove={movePan}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
          >
            {/* Bildanzeige */}
            <img
              src={imageUrl}
              alt={altText || fileName || 'Unterrichtsbild'}
              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
              style={imageStyle}
              onLoad={onImageLoad}
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
          {/* Leave the frame's 44px bottom-right resize target free. */}
          <div data-image-toolbar
            className="shrink-0 flex flex-wrap items-center justify-between gap-2 p-2 pr-12 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 z-20">
            {/* Linke Seite: Bildinfo & Alt-Text */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-[11px] font-bold truncate text-slate-700 dark:text-zinc-300">
                {altText || fileName || 'Bild'}
              </span>
              {!isCompact && (
                <button
                  onClick={() => {
                    setTempAlt(altText);
                    setIsAltEditing(true);
                  }}
                  className="min-h-11 min-w-11 px-2 text-xs text-slate-500 hover:text-accent font-semibold cursor-pointer shrink-0"
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
                    aria-label="Bild 90° drehen" title="90° Drehen"
                  >
                    <RotateCw size={16} />
                  </button>

                  <button
                    onClick={() => changeLightbox(true)}
                    className="p-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-text font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-xs"
                    style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                    aria-label="Tafelbild-Vollbild öffnen" title="Vollbild öffnen"
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
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-200 disabled:opacity-30 transition-all cursor-pointer"
                      aria-label="Bild verkleinern" title="Verkleinern"
                    >
                      <ZoomOut size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="min-h-11 min-w-11 px-1.5 text-xs font-black tabular-nums text-slate-700 dark:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-700/60 rounded transition-all cursor-pointer"
                      aria-label="Bildzoom zurücksetzen" title="Zoom zurücksetzen (100%)"
                    >
                      {Math.round(scale * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={scale >= 3.5}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 text-slate-700 dark:text-zinc-200 disabled:opacity-30 transition-all cursor-pointer"
                      aria-label="Bild vergrößern" title="Vergrößern"
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
                    aria-label="Bild 90° drehen" title="90° im Uhrzeigersinn drehen"
                  >
                    <RotateCw size={15} />
                  </button>

                  {/* Vollbild (Sehr wichtig für Smartboard!) */}
                  <button
                    type="button"
                    onClick={() => changeLightbox(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-xs"
                    style={{ minHeight: TOUCH_TARGET_MIN }}
                    aria-label="Tafelbild-Vollbild öffnen" title="Vollbild anzeigen (Smartboard)"
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
                    aria-label="Bild entfernen" title="Bild entfernen"
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
            <div className="w-14 h-14 rounded-2xl bg-accent-soft border border-accent flex items-center justify-center text-accent shadow-xs">
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
                className="w-full py-2.5 px-4 rounded-xl bg-accent hover:bg-accent-hover active:scale-98 text-accent-text font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
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
                  className="min-h-11 min-w-11 text-xs font-bold text-accent hover:text-accent flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-accent-soft"
                >
                  <FolderOpen size={12} />
                  <span>Materialbibliothek ({materialsList.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsUrlModalOpen(true)}
                className="min-h-11 min-w-11 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
              >
                <Link size={12} />
                <span>Web-URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <ImageDialog label="Tafelbild einstellen" fallbackFocus={dialogFallbackFocus} onClose={() => onCloseSettings?.()}>
          <div
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-zinc-900 dark:text-white"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-200 pb-2 dark:border-white/10">
              <div>
                <h3 className="text-sm font-black">Tafelbild einstellen</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Bildquelle, Beschriftung und Ansicht verwalten.</p>
              </div>
              <button
                type="button"
                onClick={() => onCloseSettings?.()}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label="Tafelbild-Einstellungen schließen"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onCloseSettings?.();
                  fileInputRef.current?.click();
                }}
                disabled={isProcessing}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-black text-accent-text hover:bg-accent-hover disabled:opacity-40"
              >
                <Upload size={16} />
                <span>{imageUrl ? 'Anderes Bild wählen' : 'Bild auswählen'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onCloseSettings?.();
                  setIsUrlModalOpen(true);
                }}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
              >
                <Link size={16} />
                <span>Web-URL</span>
              </button>

              {materialsList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onCloseSettings?.();
                    setIsMaterialModalOpen(true);
                  }}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  <FolderOpen size={16} />
                  <span>Materialbibliothek</span>
                </button>
              )}

              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setTempAlt(altText);
                    onCloseSettings?.();
                    setIsAltEditing(true);
                  }}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  <Info size={16} />
                  <span>Beschriftung</span>
                </button>
              )}
            </div>

            {imageUrl && (
              <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-white/10">
                <button
                  type="button"
                  onClick={handleRotate}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-xs font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  <RotateCw size={15} />
                  90° drehen
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-xs font-bold hover:bg-slate-100 dark:border-white/15 dark:hover:bg-white/10"
                >
                  <RotateCcw size={15} />
                  Ansicht zurücksetzen
                </button>
              </div>
            )}

            <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              Lokale Bilder bleiben im verschlüsselten App-Zustand. Bei externen Bild-URLs wird die angegebene Website beim Laden kontaktiert.
            </p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCloseSettings?.()}
                className="min-h-11 rounded-xl bg-accent px-4 text-sm font-black text-accent-text hover:bg-accent-hover"
              >
                Fertig
              </button>
            </div>
          </div>
        </ImageDialog>
      )}

      {/* Alt-Text / Beschriftungs-Dialog */}
      {isAltEditing && (
        <ImageDialog label="Tafelbild beschriften" fallbackFocus={dialogFallbackFocus} onClose={() => setIsAltEditing(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Bild beschriften / Titel
              </h4>
              <button
                onClick={() => setIsAltEditing(false)}
                aria-label="Beschriftungsdialog schließen"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={tempAlt}
              onChange={(e) => setTempAlt(e.target.value)}
              placeholder="z. B. Skelett des Menschen S. 42"
              aria-label="Bildbeschreibung"
              maxLength={150}
              className="min-h-11 w-full p-2 text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none focus:border-accent"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAltEditing(false)}
                className="min-h-11 min-w-11 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveAlt}
                className="min-h-11 min-w-11 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-xs font-bold"
              >
                Speichern
              </button>
            </div>
          </div>
        </ImageDialog>
      )}

      {/* URL Eingabe Modal */}
      {isUrlModalOpen && (
        <ImageDialog label="Tafelbild-Webadresse" fallbackFocus={dialogFallbackFocus} onClose={() => closeSourceDialog('url')}>
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Bild über Web-Adresse einfügen
              </h4>
              <button
                onClick={() => closeSourceDialog('url')}
                aria-label="Bildadressdialog schließen"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <input
              aria-label="HTTPS-Bildadresse"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://schule.at/beispiel.jpg"
              className="min-h-11 w-full p-2 text-sm rounded-xl border border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-800 dark:text-zinc-100 outline-none focus:border-accent"
            />
            <p className="text-[10px] text-slate-400">
              Nur sichere direkte Bildadressen (HTTPS) verwenden.
            </p>
            {isProcessing && <p role="status" className="text-sm">Bild wird geprüft …</p>}
            {errorMessage && <p role="alert" className="text-sm text-rose-600">{errorMessage}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => closeSourceDialog('url')}
                className="min-h-11 min-w-11 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5"
              >
                Abbrechen
              </button>
              <button
                onClick={handleApplyUrl}
                className="min-h-11 min-w-11 px-3 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-text text-xs font-bold"
              >
                Übernehmen
              </button>
            </div>
          </div>
        </ImageDialog>
      )}

      {/* Materialbibliothek Modal */}
      {isMaterialModalOpen && (
        <ImageDialog label="Tafelbild-Material auswählen" fallbackFocus={dialogFallbackFocus} onClose={() => closeSourceDialog('material')}>
          <div className="w-full max-w-sm max-h-[85%] bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xl border border-slate-200 dark:border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between shrink-0">
              <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100">
                Aus Materialbibliothek wählen
              </h4>
              <button
                onClick={() => closeSourceDialog('material')}
                aria-label="Materialdialog schließen"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[120px]">
              {isProcessing && <p role="status" className="text-sm">Bild wird geprüft …</p>}
            {errorMessage && <p role="alert" className="text-sm text-rose-600">{errorMessage}</p>}
              {materialsList.map((m: any, index: number) => (
                <button
                  key={typeof m.id === 'string' ? m.id : index}
                  onClick={() => handleSelectMaterial(m)}
                  className="min-h-11 w-full text-left p-2 rounded-xl hover:bg-accent-soft border border-slate-200 dark:border-white/5 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <FolderOpen size={14} className="text-accent shrink-0" />
                  <span className="truncate">{sanitizeImageAltText(m.titel) || 'Unbenanntes Material'}</span>
                </button>
              ))}
            </div>
          </div>
        </ImageDialog>
      )}

      {/* VOLLBILD / LIGHTBOX MODAL (1-Klick Vollbild auf Smartboard) */}
      {isLightboxOpen && imageUrl && (
        <ImageDialog label="Tafelbild-Vollbild" fallbackFocus={dialogFallbackFocus} onClose={() => changeLightbox(false)}>
        <div className="fixed inset-0 z-100 bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 select-none animate-fadeIn">
          {/* Schwebende obere Leiste mit minimalen Controls */}
          <div className="w-full shrink-0 flex flex-wrap gap-2 items-center justify-between z-30 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 text-white backdrop-blur-md border border-white/10">
              <span className="text-xs font-bold truncate max-w-[300px]">
                {altText || fileName || 'Vollbild'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-2xl backdrop-blur-md border border-white/10">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                aria-label="Bild verkleinern" title="Verkleinern"
              >
                <ZoomOut size={18} />
              </button>

              <button
                onClick={handleResetZoom}
                className="min-h-11 min-w-11 px-2 py-1 text-xs font-bold tabular-nums text-white hover:bg-white/20 rounded-lg transition-all cursor-pointer"
                aria-label="Bildzoom zurücksetzen" title="100% Reset"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                onClick={handleZoomIn}
                disabled={scale >= 3.5}
                className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                aria-label="Bild vergrößern" title="Vergrößern"
              >
                <ZoomIn size={18} />
              </button>

              <div className="w-[1px] h-5 bg-white/20 my-auto" />

              <button
                onClick={handleRotate}
                className="min-h-11 min-w-11 p-2 rounded-xl hover:bg-white/20 text-white transition-all cursor-pointer"
                aria-label="Bild 90° drehen" title="90° Drehen"
              >
                <RotateCw size={18} />
              </button>

              <div className="w-[1px] h-5 bg-white/20 my-auto" />

              <button
                onClick={() => changeLightbox(false)}
                className="p-2 rounded-xl bg-white/20 hover:bg-rose-600 text-white transition-all cursor-pointer"
                style={{ minWidth: TOUCH_TARGET_MIN, minHeight: TOUCH_TARGET_MIN }}
                aria-label="Tafelbild-Vollbild schließen" title="Vollbild schließen"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Vollbild-Bühne */}
          <div
            ref={lightboxStageRef}
            data-image-stage
            className={`relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden my-2 touch-none ${
              scale > 1
                ? isPanning
                  ? 'cursor-grabbing'
                  : 'cursor-grab'
                : 'cursor-default'
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={movePan}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
          >
            <img
              src={imageUrl}
              alt={altText || fileName || 'Vollbildanzeige'}
              className="max-w-full max-h-full object-contain pointer-events-none transition-transform duration-100 ease-out"
              style={imageStyle}
              onLoad={onImageLoad}
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Fußzeile mit Tastaturhinweis */}
          <div className="text-[11px] text-white/50 font-medium">
            Smartboard-Ansicht {/^https?:\/\//i.test(imageUrl) ? '• Externes Bild wird vom angegebenen Server geladen' : '• Lokal bereitgestelltes Bild'}
          </div>
        </div>
        </ImageDialog>
      )}
    </div>
  );
};
