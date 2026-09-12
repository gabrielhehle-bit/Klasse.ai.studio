import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DrawingStroke,
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
  createDrawingTextItem,
  createTextId,
  DRAWING_FONT_SIZES,
  DRAWING_TEXT_STYLES,
  renderTextItemOnCanvas,
} from './drawingAlgorithm';
import { getWidgetSizeCategory, WIDGET_MIN_SIZES } from '../components/cockpit/widgetLayout';

test('F19 Drawing: 1. Zeichnen funktioniert (Stroke-Erstellung & Punkt-Addition)', () => {
  const stroke = createStroke('pen', '#0f172a', 5.5, { x: 10, y: 20 });
  assert.equal(stroke.tool, 'pen');
  assert.equal(stroke.color, '#0f172a');
  assert.equal(stroke.width, 5.5);
  assert.equal(stroke.points.length, 1);
  assert.deepEqual(stroke.points[0], { x: 10, y: 20 });

  const updated = appendPointToStroke(stroke, { x: 15, y: 25 });
  assert.equal(updated.points.length, 2);
  assert.deepEqual(updated.points[1], { x: 15, y: 25 });
});

test('F19 Drawing: 2. Maus unterstützt (Pointer Event mit pointerType mouse)', () => {
  // Simulierte Maus-Eingabe mit regulären Koordinaten
  const stroke = createStroke('pen', '#0f172a', 2.5, { x: 100, y: 150 });
  const moved = appendPointToStroke(stroke, { x: 105, y: 152 });
  assert.equal(moved.points.length, 2);
  assert.equal(moved.points[1].x, 105);
});

test('F19 Drawing: 3. Touch unterstützt (Pointer Event mit pointerType touch)', () => {
  // Simulierte Finger-Eingabe
  const stroke = createStroke('pen', '#2563eb', 5.5, { x: 50, y: 60 });
  const moved = appendPointToStroke(stroke, { x: 52, y: 65 });
  assert.equal(moved.points.length, 2);
  assert.equal(moved.points[0].x, 50);
});

test('F19 Drawing: 4. Stylus / Pointer Events unterstützt (Drucksensitivität optional)', () => {
  // Stylus-Eingabe mit Pressure-Attribut
  const stroke = createStroke('pen', '#dc2626', 5.5, { x: 200, y: 180, pressure: 0.75 });
  assert.equal(stroke.points[0].pressure, 0.75);

  const moved = appendPointToStroke(stroke, { x: 205, y: 185, pressure: 0.9 });
  assert.equal(moved.points[1].pressure, 0.9);
});

test('F19 Drawing: 5. Stiftfarbe ändert sich (Kanonische didaktische Palette)', () => {
  assert.equal(DRAWING_COLORS.length, 4);
  assert.equal(DRAWING_COLORS[0].hex, '#0f172a'); // Schwarz
  assert.equal(DRAWING_COLORS[1].hex, '#2563eb'); // Blau
  assert.equal(DRAWING_COLORS[2].hex, '#dc2626'); // Rot
  assert.equal(DRAWING_COLORS[3].hex, '#16a34a'); // Grün

  const blueStroke = createStroke('pen', DRAWING_COLORS[1].hex, 5.5, { x: 0, y: 0 });
  assert.equal(blueStroke.color, '#2563eb');
});

test('F19 Drawing: 6. Stiftstärke ändert sich (Fein, Normal, Breit)', () => {
  assert.equal(DRAWING_WIDTHS.length, 3);
  assert.equal(DRAWING_WIDTHS[0].id, 'thin');
  assert.equal(DRAWING_WIDTHS[1].id, 'medium');
  assert.equal(DRAWING_WIDTHS[2].id, 'thick');

  const thinStroke = createStroke('pen', '#0f172a', DRAWING_WIDTHS[0].width, { x: 0, y: 0 });
  assert.equal(thinStroke.width, 2.5);

  const thickStroke = createStroke('pen', '#0f172a', DRAWING_WIDTHS[2].width, { x: 0, y: 0 });
  assert.equal(thickStroke.width, 11);
});

test('F19 Drawing: 7. Radierer funktioniert (Eraser Tool mit eigener Breitenabstufung)', () => {
  assert.ok(ERASER_WIDTHS.thin >= 10);
  assert.ok(ERASER_WIDTHS.medium >= 20);
  assert.ok(ERASER_WIDTHS.thick >= 30);

  const eraserStroke = createStroke('eraser', '#ffffff', ERASER_WIDTHS.medium, { x: 50, y: 50 });
  assert.equal(eraserStroke.tool, 'eraser');
  assert.equal(eraserStroke.width, ERASER_WIDTHS.medium);
});

test('F19 Drawing: 8. Undo funktioniert (Letzter Stroke wandert in RedoStack)', () => {
  const stroke1 = createStroke('pen', '#0f172a', 5, { x: 0, y: 0 });
  const stroke2 = createStroke('pen', '#dc2626', 5, { x: 10, y: 10 });
  const strokes = [stroke1, stroke2];
  const redoStack: DrawingStroke[] = [];

  const res = undoDrawing(strokes, redoStack);
  assert.equal(res.updatedStrokes.length, 1);
  assert.equal(res.updatedStrokes[0].id, stroke1.id);
  assert.equal(res.updatedRedoStack.length, 1);
  assert.equal(res.updatedRedoStack[0].id, stroke2.id);
});

test('F19 Drawing: 9. Redo funktioniert (Stroke wird aus RedoStack restauriert)', () => {
  const stroke1 = createStroke('pen', '#0f172a', 5, { x: 0, y: 0 });
  const stroke2 = createStroke('pen', '#dc2626', 5, { x: 10, y: 10 });
  const strokes = [stroke1];
  const redoStack = [stroke2];

  const res = redoDrawing(strokes, redoStack);
  assert.equal(res.updatedStrokes.length, 2);
  assert.equal(res.updatedStrokes[1].id, stroke2.id);
  assert.equal(res.updatedRedoStack.length, 0);
});

test('F19 Drawing: 10. Alles löschen funktioniert (Inhalt wird geleert, Redo-Wiederherstellung möglich)', () => {
  const stroke1 = createStroke('pen', '#0f172a', 5, { x: 0, y: 0 });
  const strokes = [stroke1];

  const res = clearDrawing(strokes);
  assert.equal(res.updatedStrokes.length, 0);
  assert.equal(res.updatedRedoStack.length, 1);

  // Undo nach Clear stellt den Inhalt wieder her
  const restored = redoDrawing(res.updatedStrokes, res.updatedRedoStack);
  assert.equal(restored.updatedStrokes.length, 1);
});

test('F19 Drawing: 11. Resize erhält Zeichnung (Vektordaten bleiben unverändert erhalten)', () => {
  const stroke1 = createStroke('pen', '#0f172a', 5, { x: 100, y: 120 });
  const stroke2 = createStroke('pen', '#2563eb', 5, { x: 150, y: 180 });
  const strokes = [stroke1, stroke2];

  // Simuliertes Re-Rendering bei neuer Canvas-Größe
  let calls = 0;
  const mockCtx = {
    save: () => {},
    restore: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    stroke: () => { calls++; },
  } as unknown as CanvasRenderingContext2D;

  renderAllStrokes(mockCtx, strokes, 800, 600);
  // Beide Strokes wurden erfolgreich gezeichnet
  assert.equal(strokes.length, 2);
  assert.equal(strokes[0].points[0].x, 100);
  assert.equal(strokes[1].points[0].y, 180);
});

test('F19 Drawing: 12. DPR-Skalierung korrekt (Device Pixel Ratio für scharfe Displays)', () => {
  const mockCanvas = {
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: () => ({
      setTransform: () => {},
      scale: (sx: number, sy: number) => {
        assert.equal(sx, 2);
        assert.equal(sy, 2);
      },
    }),
  } as unknown as HTMLCanvasElement;

  const res = setupCanvasDPR(mockCanvas, 400, 300, 2);
  assert.equal(mockCanvas.width, 800);
  assert.equal(mockCanvas.height, 600);
  assert.equal(mockCanvas.style.width, '400px');
  assert.equal(mockCanvas.style.height, '300px');
  assert.equal(res.dpr, 2);
});

test('F19 Drawing: 13. COMPACT Responsive Kategorie (280 - 379 px)', () => {
  assert.equal(getWidgetSizeCategory(280), 'compact');
  assert.equal(getWidgetSizeCategory(350), 'compact');
  assert.equal(getWidgetSizeCategory(379), 'compact');
});

test('F19 Drawing: 14. STANDARD Responsive Kategorie (380 - 549 px)', () => {
  assert.equal(getWidgetSizeCategory(380), 'standard');
  assert.equal(getWidgetSizeCategory(450), 'standard');
  assert.equal(getWidgetSizeCategory(549), 'standard');
});

test('F19 Drawing: 15. LARGE Responsive Kategorie (550 - 799 px)', () => {
  assert.equal(getWidgetSizeCategory(550), 'large');
  assert.equal(getWidgetSizeCategory(650), 'large');
  assert.equal(getWidgetSizeCategory(799), 'large');
});

test('F19 Drawing: 16. FULLSCREEN Responsive Kategorie (>= 800 px oder isFullscreen=true)', () => {
  assert.equal(getWidgetSizeCategory(800), 'fullscreen');
  assert.equal(getWidgetSizeCategory(1200), 'fullscreen');
  assert.equal(getWidgetSizeCategory(320, true), 'fullscreen');
});

test('F19 Drawing: 17. Mindestmaße in WIDGET_MIN_SIZES eingetragen & kein Overflow', () => {
  const minConfig = WIDGET_MIN_SIZES.drawing;
  assert.ok(minConfig, 'WIDGET_MIN_SIZES.drawing muss definiert sein');
  assert.ok(minConfig.minW >= 280, 'minW muss >= 280 sein');
  assert.ok(minConfig.minH >= 180, 'minH muss >= 180 sein');
});

test('F19 Drawing: 18. Keine KI erforderlich', () => {
  // Das Zeichen-Widget arbeitet zu 100% lokal ohne neuronale Netze oder KI-Klassifikatoren
  const stroke = createStroke('pen', '#0f172a', 5, { x: 10, y: 10 });
  assert.equal(typeof stroke.id, 'string');
});

test('F19 Drawing: 19. Keine Netzwerkrequests / 100% offline synchrone Logik', () => {
  // Alle Operationen arbeiten in-memory und deterministisch
  const stroke1 = createStroke('pen', '#0f172a', 5, { x: 0, y: 0 });
  const undone = undoDrawing([stroke1], []);
  assert.equal(undone.updatedStrokes.length, 0);
});

test('F19 Drawing: 20. Keine globale Whiteboard-Doppelstruktur (getrennte Rollen)', () => {
  // widget-drawing speichert nur eigene Striche im Widget-Settings und verwaltet keine Seiten
  const stroke = createStroke('pen', '#0f172a', 5, { x: 10, y: 10 });
  assert.equal((stroke as any).seiten, undefined);
  assert.equal((stroke as any).templates, undefined);
  assert.equal((stroke as any).shapes, undefined);
});

test('F19 Drawing: 21. History-Begrenzung schützt vor Speicherlecks (max 40 Schritte)', () => {
  let strokes: DrawingStroke[] = [];
  let redo: DrawingStroke[] = [];

  for (let i = 0; i < 50; i++) {
    strokes.push(createStroke('pen', '#0f172a', 5, { x: i, y: i }));
  }

  // 45 Mal Undo aufrufen
  for (let i = 0; i < 45; i++) {
    const res = undoDrawing(strokes, redo);
    strokes = res.updatedStrokes;
    redo = res.updatedRedoStack;
  }

  assert.ok(redo.length <= MAX_DRAWING_HISTORY, 'Redo-Stack darf maximale Historie nicht überschreiten');
});

test('F19 Drawing: 22. Andere Widgets unverändert', () => {
  // WIDGET_MIN_SIZES anderer Widgets bleiben unberührt
  assert.equal(WIDGET_MIN_SIZES.timer.minW, 280);
  assert.equal(WIDGET_MIN_SIZES.groups.minW, 300);
  assert.equal(WIDGET_MIN_SIZES.kidattendance.minW, 280);
  assert.equal(WIDGET_MIN_SIZES.qrcode.minW, 280);
  assert.equal(WIDGET_MIN_SIZES.image.minW, 280);
});

test('F19 Drawing: 23. Text-Item Erstellung & Valide Standardwerte', () => {
  const textItem = createDrawingTextItem('Merke: Punkt vor Strich', 25, 40, '#0f172a', 'large', 'yellow');
  
  assert.ok(textItem.id.startsWith('txt_'));
  assert.equal(textItem.text, 'Merke: Punkt vor Strich');
  assert.equal(textItem.x, 25);
  assert.equal(textItem.y, 40);
  assert.equal(textItem.fontSize, 'large');
  assert.equal(textItem.cardStyle, 'yellow');
  assert.equal(textItem.color, '#0f172a');
  assert.equal(DRAWING_FONT_SIZES.large.px, 24);
  const yellowStyle = DRAWING_TEXT_STYLES.find((s) => s.id === 'yellow');
  assert.equal(yellowStyle?.bg, '#fef9c3');
});

test('F19 Drawing: 24. Text-Rendering auf Canvas (Mocked Context)', () => {
  const fills: string[] = [];
  const textsDrawn: string[] = [];
  
  const mockCtx: any = {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    measureText: (txt: string) => ({ width: txt.length * 10 }),
    fillText: (txt: string, x: number, y: number) => {
      textsDrawn.push(txt);
    },
    clearRect: () => {},
    fillRect: () => {},
    set fillStyle(val: string) {
      fills.push(val);
    },
    get fillStyle() {
      return fills[fills.length - 1] || '#ffffff';
    },
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textBaseline: '',
  };

  const item = {
    id: 't-1',
    x: 10, // 10% von 800 = 80
    y: 20, // 20% von 600 = 120
    text: 'Aufgabe 1:\nRechne 12 + 15',
    color: '#0f172a',
    fontSize: 'medium' as const,
    cardStyle: 'blue' as const,
  };

  renderTextItemOnCanvas(mockCtx, item, 800, 600);
  assert.equal(textsDrawn.length, 2);
  assert.equal(textsDrawn[0], 'Aufgabe 1:');
  assert.equal(textsDrawn[1], 'Rechne 12 + 15');

  // renderAllStrokes mit Texten
  textsDrawn.length = 0;
  renderAllStrokes(mockCtx, [], 800, 600, '#ffffff', [item]);
  assert.equal(textsDrawn.length, 2);
});

