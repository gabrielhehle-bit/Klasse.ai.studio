/**
 * drawingAlgorithm.ts
 * F19 – Schnelle Skizzenfläche (widget-drawing) & Tafel-Schnittstelle
 * 
 * Reine, isolierte Algorithmen und Datenstrukturen:
 * - Vektor-Stroke-Modell (DrawingStroke, DrawingPoint)
 * - Glättungs- und Render-Funktionen (Quadratic Bezier Curve)
 * - Device-Pixel-Ratio (DPR) Skalierung für gestochen scharfe Linien
 * - Undo / Redo mit streng begrenzter History (max. 40 Schritte)
 * - Keine externen Bibliotheken, keine KI, 100% offline-fähig
 */

export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number;
}

export type DrawingTool = 'pen' | 'eraser';

export interface DrawingStroke {
  id: string;
  tool: DrawingTool;
  color: string;
  width: number;
  points: DrawingPoint[];
}

export interface DrawingColorOption {
  id: string;
  hex: string;
  label: string;
}

export const DRAWING_COLORS: DrawingColorOption[] = [
  { id: 'black', hex: '#0f172a', label: 'Schwarz' },
  { id: 'blue', hex: '#2563eb', label: 'Blau' },
  { id: 'red', hex: '#dc2626', label: 'Rot' },
  { id: 'green', hex: '#16a34a', label: 'Grün' },
];

export interface DrawingWidthOption {
  id: 'thin' | 'medium' | 'thick';
  width: number;
  label: string;
}

export const DRAWING_WIDTHS: DrawingWidthOption[] = [
  { id: 'thin', width: 2.5, label: 'Fein' },
  { id: 'medium', width: 5.5, label: 'Normal' },
  { id: 'thick', width: 11, label: 'Breit' },
];

export const ERASER_WIDTHS: Record<'thin' | 'medium' | 'thick', number> = {
  thin: 12,
  medium: 24,
  thick: 42,
};

export const MAX_DRAWING_HISTORY = 40;

/**
 * Erzeugt eine eindeutige Stroke-ID
 */
export function createStrokeId(): string {
  return `strk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Erstellt einen neuen Stroke
 */
export function createStroke(
  tool: DrawingTool,
  color: string,
  width: number,
  startPoint: DrawingPoint,
  id: string = createStrokeId()
): DrawingStroke {
  return {
    id,
    tool,
    color,
    width,
    points: [startPoint],
  };
}

/**
 * Fügt einen Punkt zu einem existierenden Stroke hinzu
 */
export function appendPointToStroke(
  stroke: DrawingStroke,
  point: DrawingPoint
): DrawingStroke {
  return {
    ...stroke,
    points: [...stroke.points, point],
  };
}

/**
 * Führt einen Undo-Schritt durch
 */
export function undoDrawing(
  strokes: DrawingStroke[],
  redoStack: DrawingStroke[]
): { updatedStrokes: DrawingStroke[]; updatedRedoStack: DrawingStroke[] } {
  if (strokes.length === 0) {
    return { updatedStrokes: strokes, updatedRedoStack: redoStack };
  }
  const last = strokes[strokes.length - 1];
  const nextStrokes = strokes.slice(0, -1);
  const nextRedo = [...redoStack, last].slice(-MAX_DRAWING_HISTORY);
  return { updatedStrokes: nextStrokes, updatedRedoStack: nextRedo };
}

/**
 * Führt einen Redo-Schritt durch
 */
export function redoDrawing(
  strokes: DrawingStroke[],
  redoStack: DrawingStroke[]
): { updatedStrokes: DrawingStroke[]; updatedRedoStack: DrawingStroke[] } {
  if (redoStack.length === 0) {
    return { updatedStrokes: strokes, updatedRedoStack: redoStack };
  }
  const restored = redoStack[redoStack.length - 1];
  const nextRedo = redoStack.slice(0, -1);
  const nextStrokes = [...strokes, restored].slice(-MAX_DRAWING_HISTORY);
  return { updatedStrokes: nextStrokes, updatedRedoStack: nextRedo };
}

/**
 * Leert die Zeichnung
 */
export function clearDrawing(
  strokes: DrawingStroke[]
): { updatedStrokes: DrawingStroke[]; updatedRedoStack: DrawingStroke[] } {
  if (strokes.length === 0) {
    return { updatedStrokes: [], updatedRedoStack: [] };
  }
  // Wenn Inhalt vorhanden war, speichern wir ihn im RedoStack, falls der Nutzer es versehentlich leert
  return {
    updatedStrokes: [],
    updatedRedoStack: [...strokes].slice(-MAX_DRAWING_HISTORY),
  };
}

/**
 * Zeichnet einen einzelnen Stroke mit weichen Kurven auf den Canvas-Context
 */
export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  backgroundColor: string = '#ffffff'
): void {
  const points = stroke.points;
  if (!points || points.length === 0) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (stroke.tool === 'eraser') {
    // Wenn die Hintergrundfarbe des Canvas weiß ist, zeichnen wir mit der Hintergrundfarbe
    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation = 'source-over';
  }

  if (points.length === 1) {
    // Einzelner Punkt / Dot
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.tool === 'eraser' ? backgroundColor : stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    // Bezier-Glättung über Mittelpunkte für organische Linienführung
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
 * Zeichnet alle Strokes auf das Canvas
 */
export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number,
  backgroundColor: string = '#ffffff'
): void {
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    renderStroke(ctx, stroke, backgroundColor);
  }

  ctx.restore();
}

/**
 * Initialisiert das Canvas für scharfe DPR-Darstellung
 */
export function setupCanvasDPR(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
  dpr: number = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
): { width: number; height: number; dpr: number } {
  const pixelRatio = Math.max(1, Math.min(3, dpr)); // Grenze bei 3x für Performance
  const pixelWidth = Math.round(cssWidth * pixelRatio);
  const pixelHeight = Math.round(cssHeight * pixelRatio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Reset transform und Skalierung auf DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(pixelRatio, pixelRatio);
  }

  return { width: cssWidth, height: cssHeight, dpr: pixelRatio };
}

/**
 * Erstellt eine saubere Bild-Momentaufnahme (PNG DataURL) für die Übergabe an Tafel.tsx
 */
export function exportDrawingSnapshot(
  canvas: HTMLCanvasElement,
  maxWidth: number = 1920,
  maxHeight: number = 1080
): string | null {
  try {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

    // Falls das Original-Canvas innerhalb der Max-Grenzen liegt, direkt exportieren
    if (canvas.width <= maxWidth && canvas.height <= maxHeight) {
      return canvas.toDataURL('image/png');
    }

    // Wenn größer, proportional herunterskalieren für speicherschonenden Datentransfer
    const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.round(canvas.width * scale);
    tempCanvas.height = Math.round(canvas.height * scale);

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas.toDataURL('image/png');

    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
    return tempCanvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to export drawing snapshot:', e);
    return null;
  }
}
