import { getDrawingOpeningSettings } from './drawingSurfaceState';
import test from "node:test";
import assert from "node:assert/strict";
import {
  getDrawingSurfaceActionLabel,
  getDrawingSurfaceLabel,
  normalizeDrawingSurfaceState,
} from "./drawingSurfaceState";

test("Tafelflächenmodus normalisiert alte Direktmodus-Einstellungen", () => {
  assert.equal(
    normalizeDrawingSurfaceState({ isDirectMode: true }).surfaceMode,
    "board",
  );
  assert.equal(
    normalizeDrawingSurfaceState({ isDirectMode: false }).surfaceMode,
    "window",
  );
  assert.equal(getDrawingSurfaceLabel("board"), "Tafelfläche");
  assert.equal(
    getDrawingSurfaceActionLabel("board"),
    "In Fenstermodus wechseln",
  );
});

test("Zeichenwerkzeug, Farbe, Stärke und Historien bleiben serialisierbar", () => {
  const stroke = {
    id: "stroke-1",
    tool: "pen" as const,
    color: "#dc2626",
    width: 5.5,
    points: [{ x: 1, y: 2 }],
  };
  const state = normalizeDrawingSurfaceState({
    surfaceMode: "window",
    drawingStrokes: [stroke],
    drawingRedoStack: [stroke],
    drawingTool: "eraser",
    drawingColor: "#dc2626",
    drawingWidthId: "thick",
  });

  assert.deepEqual(state.strokes, [stroke]);
  assert.deepEqual(state.redoStack, [stroke]);
  assert.equal(state.activeTool, "eraser");
  assert.equal(state.activeColor, "#dc2626");
  assert.equal(state.activeWidthId, "thick");
});

test("ungültige Werte fallen auf sichere Standardwerte zurück", () => {
  const state = normalizeDrawingSurfaceState({
    surfaceMode: "unexpected",
    drawingStrokes: "not-an-array",
    drawingRedoStack: null,
    drawingTool: "laser",
    drawingColor: "#ffffff",
    drawingWidthId: "huge",
  });

  assert.equal(state.surfaceMode, "window");
  assert.deepEqual(state.strokes, []);
  assert.deepEqual(state.redoStack, []);
  assert.equal(state.activeTool, "pen");
  assert.equal(state.activeColor, "#0f172a");
  assert.equal(state.activeWidthId, "medium");
});


test('first drawing opening starts as a board without losing stored strokes', () => {
  const strokes = [{id:'one'}];
  const result = getDrawingOpeningSettings({drawingStrokes:strokes},false);
  assert.equal(result.isDirectMode,true); assert.equal(result.surfaceMode,'board');
  assert.equal(result.drawingStrokes,strokes);
});
test('drawing reopening preserves window mode and lesson history', () => {
  const strokes = [{id:'one'}], redo = [{id:'two'}];
  const result = getDrawingOpeningSettings({isDirectMode:false,surfaceMode:'window',drawingStrokes:strokes,drawingRedoStack:redo,drawingColor:'#dc2626'},true);
  assert.equal(result.isDirectMode,false); assert.equal(result.surfaceMode,'window');
  assert.equal(result.drawingStrokes,strokes); assert.equal(result.drawingRedoStack,redo);
  assert.equal(result.drawingColor,'#dc2626');
});
test('drawing reopening retains an explicitly chosen board mode', () => {
  assert.equal(getDrawingOpeningSettings({isDirectMode:true},true).isDirectMode,true);
});
