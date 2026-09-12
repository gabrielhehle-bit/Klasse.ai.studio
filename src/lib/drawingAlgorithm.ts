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

export type DrawingTool = 'pen' | 'eraser' | 'text';

export type DrawingFontSize = 'small' | 'medium' | 'large' | 'huge';
export type DrawingCardStyle = 'transparent' | 'yellow' | 'blue' | 'green' | 'pink' | 'white';

export interface DrawingTextItem {
  id: string;
  x: number; // In Prozent (0 - 100) oder Pixel
  y: number; // In Prozent (0 - 100) oder Pixel
  text: string;
  color: string;
  fontSize: DrawingFontSize;
  cardStyle?: DrawingCardStyle;
}

export const DRAWING_FONT_SIZES: Record<DrawingFontSize, { id: DrawingFontSize; label: string; px: number }> = {
  small: { id: 'small', label: 'Klein', px: 14 },
  medium: { id: 'medium', label: 'Normal', px: 18 },
  large: { id: 'large', label: 'Groß', px: 24 },
  huge: { id: 'huge', label: 'Titel', px: 32 },
};

export const DRAWING_TEXT_STYLES: Array<{ id: DrawingCardStyle; label: string; bg: string; border: string }> = [
  { id: 'transparent', label: 'Freier Text', bg: 'transparent', border: 'transparent' },
  { id: 'yellow', label: 'Post-it Gelb', bg: '#fef9c3', border: '#fde047' },
  { id: 'blue', label: 'Notiz Blau', bg: '#e0f2fe', border: '#7dd3fc' },
  { id: 'green', label: 'Notiz Grün', bg: '#dcfce7', border: '#86efac' },
  { id: 'pink', label: 'Notiz Rosa', bg: '#fce7f3', border: '#f472b6' },
  { id: 'white', label: 'Kärtchen Weiß', bg: '#ffffff', border: '#cbd5e1' },
];

export function createTextId(): string {
  return `txt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function createDrawingTextItem(
  text: string,
  x: number,
  y: number,
  color: string = '#0f172a',
  fontSize: DrawingFontSize = 'medium',
  cardStyle: DrawingCardStyle = 'transparent',
  id: string = createTextId()
): DrawingTextItem {
  return {
    id,
    x: Math.max(0, Math.min(95, x)),
    y: Math.max(0, Math.min(95, y)),
    text,
    color,
    fontSize,
    cardStyle,
  };
}

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
 * Zeichnet ein einzelnes Textelement auf den Canvas-Context (für Snapshots, Export und Vollbild-Rendern)
 */
export function renderTextItemOnCanvas(
  ctx: CanvasRenderingContext2D,
  item: DrawingTextItem,
  canvasWidth: number,
  canvasHeight: number
): void {
  if (!item.text || !item.text.trim()) return;

  const pxX = item.x <= 100 ? (item.x / 100) * canvasWidth : item.x;
  const pxY = item.y <= 100 ? (item.y / 100) * canvasHeight : item.y;
  const sizeConfig = DRAWING_FONT_SIZES[item.fontSize] || DRAWING_FONT_SIZES.medium;
  const fontSizePx = sizeConfig.px;
  const lineHeight = fontSizePx * 1.35;

  const lines = item.text.split('\n');
  ctx.save();
  ctx.font = `600 ${fontSizePx}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;

  let maxLineWidth = 0;
  for (const line of lines) {
    const metrics = ctx.measureText(line);
    if (metrics.width > maxLineWidth) {
      maxLineWidth = metrics.width;
    }
  }

  const paddingX = item.cardStyle && item.cardStyle !== 'transparent' ? 14 : 6;
  const paddingY = item.cardStyle && item.cardStyle !== 'transparent' ? 10 : 6;
  const boxWidth = maxLineWidth + paddingX * 2;
  const boxHeight = lines.length * lineHeight + paddingY * 2;

  // Hintergrund-Kärtchen zeichnen falls gewünscht
  if (item.cardStyle && item.cardStyle !== 'transparent') {
    const styleDef = DRAWING_TEXT_STYLES.find((s) => s.id === item.cardStyle);
    if (styleDef) {
      ctx.fillStyle = styleDef.bg;
      ctx.strokeStyle = styleDef.border;
      ctx.lineWidth = 1.5;

      const radius = 8;
      ctx.beginPath();
      ctx.moveTo(pxX + radius, pxY);
      ctx.lineTo(pxX + boxWidth - radius, pxY);
      ctx.quadraticCurveTo(pxX + boxWidth, pxY, pxX + boxWidth, pxY + radius);
      ctx.lineTo(pxX + boxWidth, pxY + boxHeight - radius);
      ctx.quadraticCurveTo(pxX + boxWidth, pxY + boxHeight, pxX + boxWidth - radius, pxY + boxHeight);
      ctx.lineTo(pxX + radius, pxY + boxHeight);
      ctx.quadraticCurveTo(pxX, pxY + boxHeight, pxX, pxY + boxHeight - radius);
      ctx.lineTo(pxX, pxY + radius);
      ctx.quadraticCurveTo(pxX, pxY, pxX + radius, pxY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Textzeilen zeichnen
  ctx.fillStyle = item.color || '#0f172a';
  ctx.textBaseline = 'top';
  lines.forEach((line, idx) => {
    ctx.fillText(line, pxX + paddingX, pxY + paddingY + idx * lineHeight);
  });

  ctx.restore();
}

/**
 * Zeichnet alle Strokes und optional Text-Elemente auf das Canvas
 */
export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number,
  backgroundColor: string = '#ffffff',
  texts: DrawingTextItem[] = []
): void {
  ctx.save();
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    renderStroke(ctx, stroke, backgroundColor);
  }

  if (texts && texts.length > 0) {
    for (const textItem of texts) {
      renderTextItemOnCanvas(ctx, textItem, width, height);
    }
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
 * Erstellt eine saubere Bild-Momentaufnahme (PNG DataURL) für Export oder Weitergabe
 */
export function exportDrawingSnapshot(
  canvas: HTMLCanvasElement,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  texts?: DrawingTextItem[]
): string | null {
  try {
    if (!canvas || canvas.width === 0 || canvas.height === 0) return null;

    const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.round(canvas.width * scale);
    tempCanvas.height = Math.round(canvas.height * scale);

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return canvas.toDataURL('image/png');

    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    if (texts && texts.length > 0) {
      for (const textItem of texts) {
        renderTextItemOnCanvas(tempCtx, textItem, tempCanvas.width, tempCanvas.height);
      }
    }

    return tempCanvas.toDataURL('image/png');
  } catch (e) {
    console.error('Failed to export drawing snapshot:', e);
    return null;
  }
}
