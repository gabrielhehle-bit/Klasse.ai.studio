import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Pen,
  Eraser,
  Type,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  MoreHorizontal,
  Check,
  X,
  Presentation,
  Grid,
  ChevronDown,
} from 'lucide-react';
import { useWidgetSize, useWidgetOverflowGuard, TOUCH_TARGET_MIN } from '../widgetLayout';
import {
  DrawingStroke,
  DrawingPoint,
  DrawingTool,
  DrawingTextItem,
  DrawingFontSize,
  DrawingCardStyle,
  DRAWING_COLORS,
  DRAWING_WIDTHS,
  ERASER_WIDTHS,
  DRAWING_FONT_SIZES,
  DRAWING_TEXT_STYLES,
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
  createDrawingTextItem,
  createTextId,
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

export type WhiteboardBgPattern = 'white' | 'karo' | 'linien' | 'tafel';

export const BG_PATTERNS: Array<{ id: WhiteboardBgPattern; label: string; icon: string }> = [
  { id: 'white', label: 'Blanko Weiß', icon: '⬜' },
  { id: 'karo', label: 'Karopapier (Mathe)', icon: '📐' },
  { id: 'linien', label: 'Liniatur (Schreiben)', icon: '📝' },
  { id: 'tafel', label: 'Schultafel (Tafelgrün)', icon: '🟢' },
];

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

  // Lokale Texte aus widget.settings initialisieren
  const initialTexts = useMemo<DrawingTextItem[]>(() => {
    if (Array.isArray(widget?.settings?.drawingTexts)) {
      return widget.settings.drawingTexts;
    }
    return [];
  }, [widget?.settings?.drawingTexts]);

  const [strokes, setStrokes] = useState<DrawingStroke[]>(initialStrokes);
  const [texts, setTexts] = useState<DrawingTextItem[]>(initialTexts);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [whiteboardBg, setWhiteboardBg] = useState<WhiteboardBgPattern>(
    widget?.settings?.whiteboardBg || (app?.settings?.whiteboardBackground === 'karo' ? 'karo' : 'white')
  );

  const [redoStack, setRedoStack] = useState<DrawingStroke[]>([]);
  const [savedTextsBeforeClear, setSavedTextsBeforeClear] = useState<DrawingTextItem[] | null>(null);
  const [activeTool, setActiveTool] = useState<DrawingTool>('pen');
  const [activeColor, setActiveColor] = useState<string>(
    whiteboardBg === 'tafel' ? '#ffffff' : DRAWING_COLORS[0].hex
  );
  const [activeWidthId, setActiveWidthId] = useState<'thin' | 'medium' | 'thick'>('medium');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showCompactMenu, setShowCompactMenu] = useState<boolean>(false);
  const [showPresetMenu, setShowPresetMenu] = useState<boolean>(false);
  const [showBgMenu, setShowBgMenu] = useState<boolean>(false);
  const [handoverSuccess, setHandoverSuccess] = useState<boolean>(false);

  // Refs für latenzfreies lokales Zeichnen (verhindert React-Rerenders pro PointerMove)
  const isDrawingRef = useRef<boolean>(false);
  const activeStrokeRef = useRef<DrawingStroke | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activePointerTypeRef = useRef<string | null>(null);
  const lastDimensionsRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });

  // Canvas-Hintergrundfarbe
  const canvasBgColor = whiteboardBg === 'tafel' ? '#1b382b' : '#ffffff';

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

    renderAllStrokes(ctx, strokes, w, h, canvasBgColor);
  }, [strokes, canvasBgColor]);

  // Debounced Persistenz in AppState
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const persistWidgetState = useCallback(
    (newStrokes: DrawingStroke[], newTexts: DrawingTextItem[], newBg?: WhiteboardBgPattern) => {
      if (!onUpdate) return;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        onUpdate({
          settings: {
            ...widget?.settings,
            drawingStrokes: newStrokes,
            drawingTexts: newTexts,
            whiteboardBg: newBg || whiteboardBg,
          },
        });
      }, 350);
    },
    [onUpdate, widget?.settings, whiteboardBg]
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
          renderAllStrokes(ctx, strokes, w, h, canvasBgColor);
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
  }, [strokes, canvasBgColor]);

  // Synchronisation bei externen Updates
  useEffect(() => {
    if (Array.isArray(widget?.settings?.drawingStrokes)) {
      setStrokes(widget.settings.drawingStrokes);
    }
  }, [widget?.settings?.drawingStrokes]);

  useEffect(() => {
    if (Array.isArray(widget?.settings?.drawingTexts)) {
      setTexts(widget.settings.drawingTexts);
    }
  }, [widget?.settings?.drawingTexts]);

  useEffect(() => {
    if (widget?.settings?.whiteboardBg) {
      setWhiteboardBg(widget.settings.whiteboardBg);
    }
  }, [widget?.settings?.whiteboardBg]);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // -------------------------------------------------------------
  // TEXT MANAGEMENT: Erstellen, Bearbeiten, Löschen & Verschieben
  // -------------------------------------------------------------
  const handleCreateTextAt = useCallback(
    (pctX: number, pctY: number, initialContent = '', cardStyle: DrawingCardStyle = 'transparent') => {
      const defaultTextColor = whiteboardBg === 'tafel' ? '#ffffff' : activeColor;
      const newItem = createDrawingTextItem(
        initialContent,
        pctX,
        pctY,
        defaultTextColor,
        'medium',
        cardStyle
      );
      const updated = [...texts, newItem];
      setTexts(updated);
      setEditingTextId(newItem.id);
      persistWidgetState(strokes, updated);
    },
    [texts, strokes, whiteboardBg, activeColor, persistWidgetState]
  );

  const handleAddPresetText = useCallback(
    (presetKey: 'custom' | 'merksatz' | 'aufgabe' | 'datum' | 'tipp' | 'hausaufgabe') => {
      const offset = (texts.length % 6) * 5;
      const pctX = Math.min(65, 12 + offset);
      const pctY = Math.min(65, 14 + offset);

      let text = '';
      let cardStyle: DrawingCardStyle = 'transparent';
      let fontSize: DrawingFontSize = 'medium';
      let color = whiteboardBg === 'tafel' ? '#ffffff' : '#0f172a';

      if (presetKey === 'merksatz') {
        text = 'Merke: ';
        cardStyle = 'yellow';
        color = '#0f172a';
      } else if (presetKey === 'aufgabe') {
        text = 'Aufgabe: ';
        cardStyle = 'blue';
        color = '#0f172a';
      } else if (presetKey === 'datum') {
        const today = new Date();
        text = today.toLocaleDateString('de-AT', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        cardStyle = 'white';
        fontSize = 'large';
        color = '#0f172a';
      } else if (presetKey === 'tipp') {
        text = '💡 Tipp: ';
        cardStyle = 'green';
        color = '#0f172a';
      } else if (presetKey === 'hausaufgabe') {
        text = 'Hausaufgabe: ';
        cardStyle = 'pink';
        color = '#0f172a';
      }

      const newItem: DrawingTextItem = {
        id: createTextId(),
        x: pctX,
        y: pctY,
        text,
        color,
        fontSize,
        cardStyle,
      };

      const updated = [...texts, newItem];
      setTexts(updated);
      setEditingTextId(newItem.id);
      persistWidgetState(strokes, updated);
      setShowPresetMenu(false);
    },
    [texts, strokes, whiteboardBg, persistWidgetState]
  );

  const handleUpdateTextItem = useCallback(
    (id: string, updates: Partial<DrawingTextItem>) => {
      const updated = texts.map((t) => (t.id === id ? { ...t, ...updates } : t));
      setTexts(updated);
      persistWidgetState(strokes, updated);
    },
    [texts, strokes, persistWidgetState]
  );

  const handleDeleteTextItem = useCallback(
    (id: string) => {
      const updated = texts.filter((t) => t.id !== id);
      setTexts(updated);
      if (editingTextId === id) setEditingTextId(null);
      persistWidgetState(strokes, updated);
    },
    [texts, editingTextId, strokes, persistWidgetState]
  );

  const handleDuplicateTextItem = useCallback(
    (item: DrawingTextItem) => {
      const duplicate: DrawingTextItem = {
        ...item,
        id: createTextId(),
        x: Math.min(90, item.x + 4),
        y: Math.min(90, item.y + 4),
      };
      const updated = [...texts, duplicate];
      setTexts(updated);
      persistWidgetState(strokes, updated);
    },
    [texts, strokes, persistWidgetState]
  );

  // -------------------------------------------------------------
  // POINTER EVENTS: Touch, Maus, Stylus & Palm Rejection
  // -------------------------------------------------------------
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Wenn das Text-Werkzeug aktiv ist: Textfeld an Klickposition erzeugen
    if (activeTool === 'text') {
      const container = canvasContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pctX = Math.round(Math.max(2, Math.min(85, ((e.clientX - rect.left) / rect.width) * 100)));
      const pctY = Math.round(Math.max(2, Math.min(85, ((e.clientY - rect.top) / rect.height) * 100)));

      handleCreateTextAt(pctX, pctY);
      return;
    }

    // Falls Stylus genutzt wird, ignorieren wir gleichzeitige Touch-Ereignisse (Palm Rejection)
    if (activePointerTypeRef.current === 'pen' && e.pointerType === 'touch') {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
    renderStroke(ctx, newStroke, canvasBgColor);
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

    const pts = updated.points;
    const len = pts.length;
    if (len >= 2) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = updated.tool === 'eraser' ? canvasBgColor : updated.color;
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
        persistWidgetState(next, texts);
        return next;
      });
      setRedoStack([]);
      setTimeout(redrawCanvas, 0);
    }
  };

  // -------------------------------------------------------------
  // ACTIONS: Undo, Redo, Clear, Hintergrund & In Tafel öffnen
  // -------------------------------------------------------------
  const handleUndo = () => {
    if (strokes.length > 0) {
      const res = undoDrawing(strokes, redoStack);
      setStrokes(res.updatedStrokes);
      setRedoStack(res.updatedRedoStack);
      persistWidgetState(res.updatedStrokes, texts);
    } else if (savedTextsBeforeClear) {
      // Wenn vorher Clear geklickt wurde, Texte wiederherstellen
      setTexts(savedTextsBeforeClear);
      persistWidgetState(strokes, savedTextsBeforeClear);
      setSavedTextsBeforeClear(null);
    }
    setShowClearConfirm(false);
  };

  const handleRedo = () => {
    const res = redoDrawing(strokes, redoStack);
    setStrokes(res.updatedStrokes);
    setRedoStack(res.updatedRedoStack);
    persistWidgetState(res.updatedStrokes, texts);
    setShowClearConfirm(false);
  };

  const handleClearAll = () => {
    if (strokes.length === 0 && texts.length === 0) return;
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    const res = clearDrawing(strokes);
    setSavedTextsBeforeClear([...texts]);
    setStrokes(res.updatedStrokes);
    setRedoStack(res.updatedRedoStack);
    setTexts([]);
    setEditingTextId(null);
    persistWidgetState(res.updatedStrokes, []);
    setShowClearConfirm(false);
    setShowCompactMenu(false);
  };

  const handleChangeBackground = (pattern: WhiteboardBgPattern) => {
    setWhiteboardBg(pattern);
    if (pattern === 'tafel' && activeColor === '#0f172a') {
      setActiveColor('#ffffff');
    } else if (pattern !== 'tafel' && activeColor === '#ffffff') {
      setActiveColor('#0f172a');
    }
    persistWidgetState(strokes, texts, pattern);
    setShowBgMenu(false);
  };

  // Übergabe an Tafel.tsx oder Snapshot Export
  const handleOpenInTafel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const snapshot = exportDrawingSnapshot(canvas, 1920, 1080, texts);
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
        },
      }));
    }

    setHandoverSuccess(true);
    setTimeout(() => setHandoverSuccess(false), 2000);
    setShowCompactMenu(false);
  };

  const canUndo = strokes.length > 0 || savedTextsBeforeClear !== null;
  const canRedo = redoStack.length > 0;

  // Background Pattern Styles
  const getPatternBgStyle = (): React.CSSProperties => {
    if (whiteboardBg === 'tafel') {
      return {
        backgroundColor: '#1b382b',
        color: '#f8fafc',
      };
    }
    if (whiteboardBg === 'karo') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage:
          'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      };
    }
    if (whiteboardBg === 'linien') {
      return {
        backgroundColor: '#ffffff',
        backgroundImage:
          'linear-gradient(to bottom, #e2e8f0 1px, transparent 1px, transparent 27px, #cbd5e1 1px, transparent 28px)',
        backgroundSize: '100% 28px',
      };
    }
    return { backgroundColor: '#ffffff' };
  };

  return (
    <div
      ref={containerRef}
      id={`widget-drawing-${widget?.id || 'main'}`}
      className="flex-grow flex flex-col h-full w-full relative min-h-0 select-none overflow-hidden bg-slate-50 dark:bg-zinc-900 rounded-b-2xl"
    >
      {/* -------------------------------------------------------- */}
      {/* KERN-TOOLBAR: Responsive für COMPACT, STANDARD, LARGE, FULLSCREEN */}
      {/* -------------------------------------------------------- */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 px-3 py-2 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-zinc-850/95 backdrop-blur-sm z-20 overflow-x-auto elegant-scrollbar">
        {/* LINKS: Werkzeuge (Stift / Radierer / Text) & Farben */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Stift-Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('pen');
              setShowClearConfirm(false);
            }}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
            } ${
              activeTool === 'pen'
                ? 'bg-rose-500 text-white shadow-sm ring-2 ring-rose-300 dark:ring-rose-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Stift: Freihand zeichnen & schreiben"
            aria-label="Stift auswählen"
          >
            <Pen size={size.isCompact ? 14 : 16} strokeWidth={2.5} />
          </button>

          {/* Radierer-Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('eraser');
              setShowClearConfirm(false);
            }}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
            } ${
              activeTool === 'eraser'
                ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Radierer: Zeichnungen entfernen"
            aria-label="Radierer auswählen"
          >
            <Eraser size={size.isCompact ? 14 : 16} strokeWidth={2.5} />
          </button>

          {/* Text-Werkzeug Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTool('text');
              setShowClearConfirm(false);
            }}
            className={`flex items-center justify-center rounded-xl transition-all cursor-pointer ${
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
            } ${
              activeTool === 'text'
                ? 'bg-sky-500 text-white shadow-sm ring-2 ring-sky-300 dark:ring-sky-900'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300'
            }`}
            title="Text-Werkzeug: Klicke auf die Tafel zum Schreiben & Texteingabe"
            aria-label="Text-Werkzeug auswählen"
          >
            <Type size={size.isCompact ? 14 : 16} strokeWidth={2.5} />
          </button>

          {/* + Text einfügen / Schnell-Vorlagen Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPresetMenu((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight cursor-pointer transition-all border ${
                showPresetMenu
                  ? 'bg-sky-50 border-sky-300 text-sky-700 dark:bg-sky-950/50 dark:border-sky-700 dark:text-sky-300 ring-2 ring-sky-200'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Textfeld oder Tafelvorlage einfügen"
            >
              <Plus size={13} strokeWidth={2.5} />
              {!size.isCompact && <span>Text</span>}
              <ChevronDown size={11} className={`transition-transform ${showPresetMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Presets Popover */}
            {showPresetMenu && (
              <div className="absolute top-10 left-0 w-52 p-1.5 bg-white dark:bg-zinc-850 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">Texte einfügen</div>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('custom')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                >
                  <span className="text-sm">✍️</span>
                  <span>Freier Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('merksatz')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 cursor-pointer text-left"
                >
                  <span className="text-sm">📌</span>
                  <span>Merksatz (Post-it)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('aufgabe')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 cursor-pointer text-left"
                >
                  <span className="text-sm">🎯</span>
                  <span>Arbeitsauftrag</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('datum')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer text-left"
                >
                  <span className="text-sm">📅</span>
                  <span>Heutiges Datum</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('tipp')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 cursor-pointer text-left"
                >
                  <span className="text-sm">💡</span>
                  <span>Tipp / Hinweis</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddPresetText('hausaufgabe')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold text-pink-800 dark:text-pink-200 bg-pink-50 dark:bg-pink-950/40 hover:bg-pink-100 cursor-pointer text-left"
                >
                  <span className="text-sm">🏆</span>
                  <span>Hausaufgabe</span>
                </button>
              </div>
            )}
          </div>

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
                    if (activeTool === 'eraser') setActiveTool('pen');
                  }}
                  className={`rounded-full transition-all cursor-pointer border ${
                    size.category === 'fullscreen' ? 'w-7 h-7' : 'w-6 h-6'
                  } ${
                    activeColor === c.hex
                      ? 'scale-125 ring-2 ring-rose-500 shadow-md border-white'
                      : 'border-black/10 hover:scale-110 shadow-xs'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  aria-label={`Farbe ${c.label}`}
                />
              ))}
              {/* Weiß für Schultafel */}
              {whiteboardBg === 'tafel' && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveColor('#ffffff');
                    if (activeTool === 'eraser') setActiveTool('pen');
                  }}
                  className={`rounded-full transition-all cursor-pointer border border-white/60 bg-white ${
                    size.category === 'fullscreen' ? 'w-7 h-7' : 'w-6 h-6'
                  } ${
                    activeColor === '#ffffff'
                      ? 'scale-125 ring-2 ring-emerald-400 shadow-md'
                      : 'hover:scale-110 shadow-xs'
                  }`}
                  title="Kreideweiß"
                  aria-label="Farbe Kreideweiß"
                />
              )}
            </div>
          ) : (
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

          {/* HINTERGRUND-MUSTER (Karos, Linien, Tafel) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowBgMenu((v) => !v)}
              className={`p-1.5 rounded-xl transition-all cursor-pointer border ${
                showBgMenu
                  ? 'bg-slate-200 border-slate-300 dark:bg-zinc-700'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-300'
              }`}
              title="Hintergrundmuster ändern (Karopapier, Liniatur, Schultafel)"
            >
              <Grid size={14} strokeWidth={2.5} />
            </button>

            {showBgMenu && (
              <div className="absolute top-10 left-0 w-44 p-1.5 bg-white dark:bg-zinc-850 rounded-2xl shadow-xl border border-slate-200 dark:border-zinc-700 z-30 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">Hintergrund</div>
                {BG_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleChangeBackground(p.id)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-semibold cursor-pointer text-left ${
                      whiteboardBg === p.id
                        ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            )}
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
              size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
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

          {/* Redo */}
          {!size.isCompact && (
            <button
              type="button"
              disabled={!canRedo}
              onClick={handleRedo}
              className={`flex items-center justify-center rounded-xl transition-all ${
                size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
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
                title="Alles leeren bestätigen"
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
              disabled={strokes.length === 0 && texts.length === 0}
              onClick={handleClearAll}
              className={`flex items-center justify-center rounded-xl transition-all ${
                size.isCompact ? 'w-8 h-8' : size.category === 'fullscreen' ? 'w-10 h-10' : 'w-8 h-8'
              } ${
                strokes.length > 0 || texts.length > 0
                  ? 'bg-rose-50 hover:bg-rose-500 hover:text-white text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 dark:text-rose-400 cursor-pointer shadow-xs'
                  : 'opacity-30 cursor-not-allowed text-slate-400'
              }`}
              title="Whiteboard leeren"
              aria-label="Whiteboard leeren"
            >
              <Trash2 size={size.isCompact ? 13 : 15} strokeWidth={2.5} />
            </button>
          )}

          {/* IN TAFEL ÖFFNEN */}
          {Boolean(onOpenInTafel) && (size.isLarge || size.category === 'fullscreen' || (!size.isCompact && !size.isLarge)) && (
            <button
              type="button"
              onClick={handleOpenInTafel}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold tracking-tight transition-all cursor-pointer shadow-xs border ${
                handoverSuccess
                  ? 'bg-emerald-500 border-emerald-400 text-white'
                  : 'bg-indigo-50 hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              }`}
              title="Aktuelle Tafel an den Vollbild-Tafelmodus übergeben"
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

          {/* COMPACT-MENÜ (•••) */}
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

      {/* COMPACT OVERFLOW POPOVER */}
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

          <button
            type="button"
            onClick={() => {
              handleAddPresetText('custom');
              setShowCompactMenu(false);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 px-2 py-1 rounded-lg"
          >
            <Type size={13} />
            <span>Textfeld einfügen</span>
          </button>

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

            {Boolean(onOpenInTafel) && (
              <button
                type="button"
                onClick={handleOpenInTafel}
                className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 px-2 py-1 rounded-lg cursor-pointer"
              >
                <Presentation size={13} />
                <span>In Tafel</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- */}
      {/* ZEICHENFLÄCHE (CANVAS) & INTERAKTIVE TEXTE */}
      {/* -------------------------------------------------------- */}
      <div
        ref={canvasContainerRef}
        style={getPatternBgStyle()}
        className={`flex-grow relative w-full h-full min-h-0 overflow-hidden touch-none select-none transition-colors duration-200 ${
          activeTool === 'text' ? 'cursor-text' : 'cursor-crosshair'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none pointer-events-auto"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />

        {/* INTERAKTIVE TEXTE (Frei platzierbar, editierbar, verschiebbar) */}
        {texts.map((item) => (
          <DrawingTextBox
            key={item.id}
            item={item}
            isEditing={editingTextId === item.id}
            containerRef={canvasContainerRef}
            whiteboardBg={whiteboardBg}
            onStartEdit={() => setEditingTextId(item.id)}
            onEndEdit={() => setEditingTextId(null)}
            onUpdateText={(text) => handleUpdateTextItem(item.id, { text })}
            onUpdateFontSize={(fontSize) => handleUpdateTextItem(item.id, { fontSize })}
            onUpdateCardStyle={(cardStyle) => handleUpdateTextItem(item.id, { cardStyle })}
            onUpdateColor={(color) => handleUpdateTextItem(item.id, { color })}
            onUpdatePosition={(x, y) => handleUpdateTextItem(item.id, { x, y })}
            onDuplicate={() => handleDuplicateTextItem(item)}
            onDelete={() => handleDeleteTextItem(item.id)}
          />
        ))}

        {/* HINWEISE BEI LEERER TAFEL */}
        {strokes.length === 0 && texts.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-1.5 opacity-35 select-none">
            <div className="text-xs font-bold tracking-wide text-slate-500 dark:text-slate-400">
              {activeTool === 'text'
                ? '✍️ Klicke an eine beliebige Stelle, um Text zu tippen...'
                : 'Hier mit Stift zeichnen oder mit "+ Text" Notizen einfügen...'}
            </div>
            <div className="text-[10px] text-slate-400">
              Tipp: Wechsel oben auf das Text-Werkzeug (T) oder nutze Vorlagen wie Merksatz & Datum
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// SUB-KOMPONENTE: Einzelne Textbox auf dem Whiteboard
// -------------------------------------------------------------
interface DrawingTextBoxProps {
  item: DrawingTextItem;
  isEditing: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  whiteboardBg: WhiteboardBgPattern;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onUpdateText: (text: string) => void;
  onUpdateFontSize: (size: DrawingFontSize) => void;
  onUpdateCardStyle: (style: DrawingCardStyle) => void;
  onUpdateColor: (color: string) => void;
  onUpdatePosition: (x: number, y: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const DrawingTextBox: React.FC<DrawingTextBoxProps> = ({
  item,
  isEditing,
  containerRef,
  whiteboardBg,
  onStartEdit,
  onEndEdit,
  onUpdateText,
  onUpdateFontSize,
  onUpdateCardStyle,
  onUpdateColor,
  onUpdatePosition,
  onDuplicate,
  onDelete,
}) => {
  const [localText, setLocalText] = useState(item.text);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragItemStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    setLocalText(item.text);
  }, [item.text]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Cursor ans Ende
      const len = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleDragPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    dragItemStartRef.current = { x: item.x, y: item.y };

    const handleWindowPointerMove = (ev: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaX = ((ev.clientX - dragStartPosRef.current.x) / rect.width) * 100;
      const deltaY = ((ev.clientY - dragStartPosRef.current.y) / rect.height) * 100;

      const newX = Math.max(1, Math.min(92, dragItemStartRef.current.x + deltaX));
      const newY = Math.max(1, Math.min(90, dragItemStartRef.current.y + deltaY));
      onUpdatePosition(Math.round(newX * 10) / 10, Math.round(newY * 10) / 10);
    };

    const handleWindowPointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
  };

  const handleBlur = () => {
    onUpdateText(localText);
    onEndEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      onUpdateText(localText);
      onEndEdit();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      onUpdateText(localText);
      onEndEdit();
    }
  };

  const sizePx = DRAWING_FONT_SIZES[item.fontSize]?.px || 18;

  // Visual Styles depending on card style
  const getCardStyleClasses = () => {
    const s = item.cardStyle || 'transparent';
    switch (s) {
      case 'yellow':
        return 'bg-amber-100 border-amber-300 shadow-md text-amber-950';
      case 'blue':
        return 'bg-sky-100 border-sky-300 shadow-md text-sky-950';
      case 'green':
        return 'bg-emerald-100 border-emerald-300 shadow-md text-emerald-950';
      case 'pink':
        return 'bg-pink-100 border-pink-300 shadow-md text-pink-950';
      case 'white':
        return 'bg-white border-slate-300 shadow-md text-slate-900';
      default:
        return 'bg-transparent border-transparent hover:border-slate-300/60 dark:hover:border-white/20';
    }
  };

  const nextFontSize = (): DrawingFontSize => {
    const list: DrawingFontSize[] = ['small', 'medium', 'large', 'huge'];
    const idx = list.indexOf(item.fontSize);
    return list[(idx + 1) % list.length];
  };

  const nextCardStyle = (): DrawingCardStyle => {
    const list: DrawingCardStyle[] = ['transparent', 'yellow', 'blue', 'green', 'pink', 'white'];
    const idx = list.indexOf(item.cardStyle || 'transparent');
    return list[(idx + 1) % list.length];
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        color: item.color || (whiteboardBg === 'tafel' ? '#ffffff' : '#0f172a'),
      }}
      className={`absolute z-10 rounded-2xl border transition-shadow duration-150 ${getCardStyleClasses()} ${
        isEditing ? 'ring-2 ring-sky-400 shadow-lg' : ''
      }`}
    >
      {/* Mini-Aktionsleiste (beim Hovern oder Editieren sichtbar) */}
      {(isHovered || isEditing) && (
        <div
          className="absolute -top-8 left-0 flex items-center gap-1 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-md px-1.5 py-1 rounded-xl shadow-md border border-slate-200 dark:border-zinc-700 z-30 pointer-events-auto select-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Verschieben Drag-Handle */}
          <div
            onPointerDown={handleDragPointerDown}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-500 dark:text-slate-300 cursor-grab active:cursor-grabbing"
            title="Ziehen zum Verschieben"
          >
            <GripVertical size={13} strokeWidth={2.5} />
          </div>

          {/* Schriftgröße Toggle */}
          <button
            type="button"
            onClick={() => onUpdateFontSize(nextFontSize())}
            className="px-1.5 py-0.5 rounded-lg text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
            title={`Schriftgröße ändern: ${DRAWING_FONT_SIZES[item.fontSize]?.label}`}
          >
            {item.fontSize === 'small' ? 'S' : item.fontSize === 'medium' ? 'M' : item.fontSize === 'large' ? 'L' : 'XL'}
          </button>

          {/* Kärtchen-Farbe Toggle */}
          <button
            type="button"
            onClick={() => onUpdateCardStyle(nextCardStyle())}
            className="w-4 h-4 rounded-full border border-black/20 cursor-pointer hover:scale-110 transition-transform"
            style={{
              backgroundColor:
                item.cardStyle === 'yellow'
                  ? '#fde047'
                  : item.cardStyle === 'blue'
                  ? '#7dd3fc'
                  : item.cardStyle === 'green'
                  ? '#86efac'
                  : item.cardStyle === 'pink'
                  ? '#f472b6'
                  : item.cardStyle === 'white'
                  ? '#ffffff'
                  : '#cbd5e1',
            }}
            title="Design/Notizkärtchen wechseln"
          />

          {/* Duplizieren */}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-700 cursor-pointer"
            title="Duplizieren"
          >
            <Copy size={12} strokeWidth={2.5} />
          </button>

          {/* Löschen */}
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
            title="Löschen"
          >
            <Trash2 size={12} strokeWidth={2.5} />
          </button>
        </div>
      )}

      {/* Inhalt: Input oder Anzeige */}
      <div className="p-2 min-w-[120px] max-w-[420px]">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={localText}
            rows={Math.max(1, localText.split('\n').length)}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder="Text eingeben..."
            style={{ fontSize: `${sizePx}px`, lineHeight: 1.35 }}
            className="w-full bg-transparent border-none outline-none resize-none font-semibold placeholder-slate-400/70 p-0 block leading-tight overflow-hidden"
          />
        ) : (
          <div
            onClick={onStartEdit}
            onDoubleClick={onStartEdit}
            style={{ fontSize: `${sizePx}px`, lineHeight: 1.35 }}
            className="font-semibold whitespace-pre-wrap break-words cursor-text min-h-[1.5em] leading-tight"
          >
            {localText.trim() ? localText : <span className="opacity-40 italic font-normal">Hier tippen...</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default DrawingWidget;

