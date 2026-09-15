import { createTafelCommand } from '../../../lib/tafelCommands';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Share2,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Check,
  X,
  Presentation,
} from 'lucide-react';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  DrawingStroke,
  DrawingPoint,
  DrawingTool,
  DRAWING_COLORS,
  DRAWING_WIDTHS,
  ERASER_WIDTHS,
  MAX_DRAWING_HISTORY,
  createStroke,
  appendPointToStroke,
  undoDrawing,
  redoDrawing,
  clearDrawing,
  renderStroke,
  renderAllStrokes,
  setupCanvasDPR,
  exportDrawingSnapshot,
} from '../../../lib/drawingAlgorithm';

export interface DrawingWidgetProps {
  widget?: any;
  onUpdate?: (updates: any) => void;
  app?: any;
  setApp?: React.Dispatch<React.SetStateAction<any>>;
  showSettings?: boolean;
  onCloseSettings?: () => void;
  currentIsLight?: boolean;
  isFullscreen?: boolean;
  isSplit?: boolean;
  onOpenInTafel?: () => void;
}

export const DrawingWidget: React.FC<DrawingWidgetProps> = ({
  widget,
  onUpdate,
  app,
  setApp,
  showSettings = false,
  onCloseSettings,
  currentIsLight = true,
  isFullscreen = false,
  isSplit = false,
  onOpenInTafel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // F-UI Responsive & Overflow Hooks
  const size = useWidgetSize(containerRef, { isFullscreen, defaultCategory: 'standard' });
  useWidgetOverflowGuard('drawing', containerRef);

  // Lokale Striche aus widget.settings initialisieren
  const initialStrokes = useMemo<DrawingStroke[]>(() => {
    if (Array.isArray(widget?.settings?.drawingStrokes)) {
      return widget.settings.drawingStrokes;
    }
    return [];
  }, [widget?.settings?.drawingStrokes]);

  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const [redoStack, setRedoStack] = useState<DrawingStroke[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(DRAWING_COLORS[0].hex);
  const [activeWidthId, setActiveWidthId] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCompactMenu, setShowCompactMenu] = useState<boolean>(false);
  const [handoverSuccess, setHandoverSuccess] = useState<boolean>(false);

  // Refs für latenzfreies lokales Zeichnen (verhindert React-Rerenders pro PointerMove)
  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  const lastDimensionsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Aktuelle Stiftbreite
  const currentLineWidth = useMemo(() => {
    if (activeTool === 'eraser') {
      return ERASER_WIDTHS[activeWidthId];
    }
    const found = DRAWING_WIDTHS.find((w) => w.id === activeWidthId);
    return found ? found.width : DRAWING_WIDTHS[1].width;
  }, [activeTool, activeWidthId]);

  // Canvas komplett neu zeichnen
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = lastDimensionsRef.current;
    if (w <= 0 || h <= 0) return;

    renderAllStrokes(ctx, strokes, w, h, '#ffffff');
  }, [strokes]);

  // Debounced Persistenz in AppState
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const persistStrokes = useCallback(
    (newStrokes: DrawingStroke[]) => {
      if (!onUpdate) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate({
          settings: {
            ...widget?.settings,
            drawingStrokes: newStrokes,
          },
        });
      }, 350);
    },
    [onUpdate, widget?.settings]
  );

  // ResizeObserver für verlustfreie Größenanpassung
  useEffect(() => {
    const container = canvasContainerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);

      if (w > 0 && h > 0) {
        lastDimensionsRef.current = { w, h };
        setupCanvasDPR(canvas, w, h);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderAllStrokes(ctx, strokes, w, h, '#ffffff');
        }
      }
    };

    handleResize();

    const observer = new ResizeObserver(() => {
      handleResize();
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
    };
  }, [strokes]);

  // Synchronisation bei externen Updates
  useEffect(() => {
    if (Array.isArray(widget?.settings?.drawingStrokes)) {
      setStrokes(widget.settings.drawingStrokes);
    }
  }, [widget?.settings?.drawingStrokes]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // POINTER EVENTS: Touch, Maus, Stylus & Palm Rejection
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Falls Stylus genutzt wird, ignorieren wir gleichzeitige Touch-Ereignisse (Palm Rejection)
    if (activePointerTypeRef.current === 'pen' && e.pointerType === 'touch') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // PointerCapture sichert kontinuierliches Zeichnen auch wenn Maus kurz über den Rand rutscht
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    isDrawingRef.current = true;
    activePointerIdRef.current = e.pointerId;
    activePointerTypeRef.current = e.pointerType;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : undefined;

    const startPt: DrawingPoint = { x, y, pressure };
    const newStroke = createStroke(activeTool, activeColor, currentLineWidth, startPt);
    activeStrokeRef.current = newStroke;

    // Sofortiger visueller Punkt auf dem Canvas
    renderStroke(ctx, newStroke, '#ffffff');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;
    const currentStroke = activeStrokeRef.current;
    if (!currentStroke) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pressure = e.pressure !== undefined && e.pressure > 0 ? e.pressure : undefined;

    const pt: DrawingPoint = { x, y, pressure };
    const updated = appendPointToStroke(currentStroke, pt);
    activeStrokeRef.current = updated;

    // Render nur das neue Segment für maximale 120fps Performance
    const pts = updated.points;
    const len = pts.length;
    if (len >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = updated.tool === 'eraser' ? '#ffffff' : updated.color;
      ctx.lineWidth = updated.width;

      ctx.beginPath();
      const p1 = pts[len - 2];
      const p2 = pts[len - 1];
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  };

  const finishDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || e.pointerId !== activePointerIdRef.current) return;

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    if (activePointerTypeRef.current !== 'pen') {
      activePointerTypeRef.current = null;
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const finishedStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;

    if (finishedStroke && finishedStroke.points.length > 0) {
      setStrokes((prev) => {
        const next = [...prev, finishedStroke].slice(-MAX_DRAWING_HISTORY);
        persistStrokes(next);
        return next;
      });
      // Nach neuem Zeichnen wird der Redo-Stack zurückgesetzt
      setRedoStack([]);
      // Komplettes Redraw für glatte Bezier-Kurven
      setTimeout(redrawCanvas, 0);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: Undo, Redo, Clear, In Tafel öffnen
  // -------------------------------------------------------------
  const handleUndo = () => {
    const res = undoDrawing(strokes, redoStack);
    setStrokes(res.updatedStrokes);
    setRedoStack(res.updatedRedoStack);
    persistStrokes(res.updatedStrokes);
    setShowClearConfirm(false);
  };

  const handleRedo = () => {
    const res = redoDrawing(strokes, redoStack);
    setStrokes(res.updatedStrokes);
    setRedoStack(res.updatedRedoStack);
    persistStrokes(res.updatedStrokes);
    setShowClearConfirm(false);
  };

  const handleClearAll = () => {
    if (strokes.length === 0) return;
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    const res = clearDrawing(strokes);
    setStrokes(res.updatedStrokes);
    setRedoStack(res.updatedRedoStack);
    persistStrokes(res.updatedStrokes);
    setShowClearConfirm(false);
    setShowCompactMenu(false);
  };

  // Übergabe an Tafel.tsx (Einmalige Snapshot-Kopie)
  const handleOpenInTafel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = exportDrawingSnapshot(canvas);
    if (!snapshot) return;

    if (onOpenInTafel) {
      onOpenInTafel();
    }

    if (setApp) {
      setApp((prev: any) => ({
        ...prev,
        boardSettings: {
          ...prev.boardSettings,
          remoteDrawingImage: {
            dataUrl: snapshot,
            timestamp: Date.now(),
          },
          isTafelOpen: true,
          tafelCommand: createTafelCommand(prev.activeClassId, true),
        },
      }));
    }

    setHandoverSuccess(true);
    setTimeout(() => setHandoverSuccess(false), 2000);
    setShowCompactMenu(false);
  };

  // -------------------------------------------------------------
  // RENDER: TOOLBAR & RESPONSIVE LAYOUTS
  // -------------------------------------------------------------
  const canUndo = strokes.length > 0;
  const canRedo = redoStack.length > 0;

  return (
    <div
      ref={containerRef}
      id={`widget-drawing-${widget?.id || 'main'}`}
      className="flex-grow flex flex-col h-full w-full relative min-h-0 select-none overflow-hidden bg-slate-50 dark:bg-zinc-900 rounded-b-2xl"
    >
      {/* -------------------------------------------------------- */}
      {/* KERN-TOOLBAR: Responsive für COMPACT, STANDARD, LARGE, FULLSCREEN */}
      {/* -------------------------------------------------------- */}
      <div
        className="shrink-0 flex items-center justify-between gap-1.5 px-3 py-2 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-850/95 backdrop-blur-sm z-20 overflow-x-auto elegant-scrollbar"
      >
        {/* LINKS: Werkzeuge (Stift / Radierer) & Farben */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Stift-Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
              setShowClearConfirm(false);
            }}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-11 h-11' : 'w-9 h-9'
            } ${
              activeTool === 'pen'
                ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300 dark:ring-rose-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Stift"
            aria-label="Stift auswählen"
          >
            <Pen size={size.isCompact ? 14 : size.category === 'fullscreen' ? 18 : 16} strokeWidth={2.5} />
          </button>

          {/* Radierer-Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
              setShowClearConfirm(false);
            }}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-11 h-11' : 'w-9 h-9'
            } ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Radierer"
            aria-label="Radierer auswählen"
          >
            <Eraser size={size.isCompact ? 14 : size.category === 'fullscreen' ? 18 : 16} strokeWidth={2.5} />
          </button>

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

          {/* FARBEN: In Standard & Large direkt, in Compact als aktiver Farbpunkt */}
          {!size.isCompact ? (
            <div className="flex items-center gap-1 shrink-0">
              {DRAWING_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveColor(c.hex);
                    setActiveTool('pen');
                  }}
                  className={`rounded-full transition-all cursor-pointer border ${
                    size.category === 'fullscreen' ? 'w-7 h-7' : 'w-6 h-6'
                  } ${
                    activeTool === 'pen' && activeColor === c.hex
                      ? 'scale-125 ring-2 ring-rose-500 shadow-md border-white'
                      : 'border-black/10 hover:scale-110 shadow-xs'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={`Farbe ${c.label}`}
                />
              ))}
            </div>
          ) : (
            // COMPACT: Nur die aktive Farbe antippbar
            <button
              type="button"
              onClick={() => setShowCompactMenu((v) => !v)}
              className="w-7 h-7 rounded-full border border-black/15 shadow-xs flex items-center justify-center cursor-pointer transition-transform hover:scale-105"
              style={{ backgroundColor: activeColor }}
              title="Farbe ändern"
            />
          )}

          <div className="w-[1px] h-5 bg-slate-200 dark:bg-zinc-700 mx-0.5 shrink-0" />

          {/* STIFTSTÄRKEN (Fein, Normal, Breit) */}
          <div className="flex items-center bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-xl shrink-0">
            {DRAWING_WIDTHS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWidthId(w.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold tracking-tight transition-all cursor-pointer ${
                  activeWidthId === w.id
                    ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-zinc-400'
                }`}
                title={`Stärke: ${w.label}`}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        {/* RECHTS: Undo/Redo, Löschen & In Tafel öffnen */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Undo */}
          <button
            type="button"
            disabled={!canUndo}
            onClick={handleUndo}
            className={`flex items-center justify-center rounded-xl transition-all ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-11 h-11' : 'w-8 h-8'
            } ${
              canUndo
                ? 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs'
                : 'opacity-30 cursor-not-allowed text-slate-400'
            }`}
            title="Rückgängig"
            aria-label="Rückgängig"
          >
            <Undo2 size={size.isCompact ? 13 : 15} strokeWidth={2.5} />
          </button>

          {/* Redo (in Standard, Large, Fullscreen) */}
          {!size.isCompact && (
            <button
              type="button"
              disabled={!canRedo}
              onClick={handleRedo}
              className={`flex items-center justify-center rounded-xl transition-all ${
                size.category === 'fullscreen' ? 'w-11 h-11' : 'w-8 h-8'
              } ${
                canRedo
                  ? 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 cursor-pointer shadow-xs'
                  : 'opacity-30 cursor-not-allowed text-slate-400'
              }`}
              title="Wiederholen"
              aria-label="Wiederholen"
            >
              <Redo2 size={15} strokeWidth={2.5} />
            </button>
          )}

          {/* Alles Löschen */}
          {showClearConfirm ? (
            <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 p-0.5 rounded-xl border border-rose-200 dark:border-rose-900 animate-in fade-in-50">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-2 py-1 text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Löschen bestätigen"
              >
                Leeren!
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                title="Abbrechen"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={strokes.length === 0}
              onClick={handleClearAll}
              className={`flex items-center justify-center rounded-xl transition-all ${
                size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-11 h-11' : 'w-8 h-8'
              } ${
                strokes.length > 0
                  ? 'bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 dark:text-rose-400 cursor-pointer shadow-xs'
                  : 'opacity-30 cursor-not-allowed text-slate-400'
              }`}
              title="Alles leeren"
              aria-label="Alles leeren"
            >
              <Trash2 size={size.isCompact ? 13 : 15} strokeWidth={2.5} />
            </button>
          )}

          {/* IN TAFEL ÖFFNEN: Prominent in Large/Fullscreen, Button in Standard, Menü in Compact */}
          {(size.isLarge || size.category === 'fullscreen' || (!size.isCompact && !size.isLarge)) && (
            <button
              type="button"
              onClick={handleOpenInTafel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer shadow-xs border ${
                handoverSuccess
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              }`}
              title="Aktuelle Skizze an die große Tafel übergeben"
            >
              {handoverSuccess ? (
                <>
                  <Check size={13} strokeWidth={3} />
                  <span>Übergeben!</span>
                </>
              ) : (
                <>
                  <Presentation size={13} strokeWidth={2.5} />
                  <span>{size.isLarge || size.category === 'fullscreen' ? 'In Tafel öffnen' : 'Tafel'}</span>
                </>
              )}
            </button>
          )}

          {/* COMPACT-MENÜ-TRIGGER (•••) */}
          {size.isCompact && (
            <button
              type="button"
              onClick={() => setShowCompactMenu((v) => !v)}
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-200"
              title="Weitere Optionen"
            >
              <MoreHorizontal size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------- */}
      {/* COMPACT OVERFLOW POPOVER (Farben, Redo, Tafel) */}
      {/* -------------------------------------------------------- */}
      {showCompactMenu && size.isCompact && (
        <div className="absolute top-12 right-2 p-3 bg-white dark:bg-zinc-850 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 z-30 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Farbe:</span>
            <div className="flex items-center gap-1.5">
              {DRAWING_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setActiveColor(c.hex);
                    setActiveTool('pen');
                    setShowCompactMenu(false);
                  }}
                  className={`w-6 h-6 rounded-full border cursor-pointer ${
                    activeColor === c.hex ? 'ring-2 ring-rose-500 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-zinc-700" />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => {
                handleRedo();
                setShowCompactMenu(false);
              }}
              className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
                canRedo ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100' : 'opacity-30'
              }`}
            >
              <Redo2 size={13} />
              <span>Wiederholen</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInTafel}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2 py-1 rounded-lg cursor-pointer"
            >
              <Presentation size={13} />
              <span>In Tafel öffnen</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* ZEICHENFLÄCHE (CANVAS): Hardware-beschleunigt, DPR-scharf */}
      {/* -------------------------------------------------------- */}
      <div
        ref={canvasContainerRef}
        className="flex-grow relative w-full h-full min-h-0 bg-white cursor-crosshair overflow-hidden touch-none"
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />

        {/* Dezenter Indikator im leeren Zustand */}
        {strokes.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 text-slate-400 dark:text-slate-600 text-xs font-semibold select-none">
            <span>Hier mit Stift oder Finger skizzieren...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingWidget;
