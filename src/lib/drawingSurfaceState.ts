import {
  DRAWING_COLORS,
  DRAWING_WIDTHS,
  type DrawingStroke,
  type DrawingTool,
} from "./drawingAlgorithm";

export type DrawingSurfaceMode = "window" | "board" | "minimized" | "closed";
export type DrawingWidthId = "thin" | "medium" | "thick";

export interface DrawingSurfaceState {
  surfaceMode: DrawingSurfaceMode;
  strokes: DrawingStroke[];
  redoStack: DrawingStroke[];
  activeTool: DrawingTool;
  activeColor: string;
  activeWidthId: DrawingWidthId;
}

const SURFACE_MODES: DrawingSurfaceMode[] = [
  "window",
  "board",
  "minimized",
  "closed",
];

const WIDTH_IDS: DrawingWidthId[] = ["thin", "medium", "thick"];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeDrawingSurfaceState = (
  settings: unknown,
): DrawingSurfaceState => {
  const candidate = isRecord(settings) ? settings : {};
  const requestedMode = candidate.surfaceMode;
  const surfaceMode = SURFACE_MODES.includes(requestedMode as DrawingSurfaceMode)
    ? (requestedMode as DrawingSurfaceMode)
    : candidate.isDirectMode === true
      ? "board"
      : "window";

  const activeColor =
    typeof candidate.drawingColor === "string" &&
    DRAWING_COLORS.some((color) => color.hex === candidate.drawingColor)
      ? candidate.drawingColor
      : DRAWING_COLORS[0].hex;

  const activeWidthId = WIDTH_IDS.includes(candidate.drawingWidthId as DrawingWidthId)
    ? (candidate.drawingWidthId as DrawingWidthId)
    : DRAWING_WIDTHS[1].id;

  return {
    surfaceMode,
    strokes: Array.isArray(candidate.drawingStrokes)
      ? (candidate.drawingStrokes as DrawingStroke[])
      : [],
    redoStack: Array.isArray(candidate.drawingRedoStack)
      ? (candidate.drawingRedoStack as DrawingStroke[])
      : [],
    activeTool: candidate.drawingTool === "eraser" ? "eraser" : "pen",
    activeColor,
    activeWidthId,
  };
};

export const getDrawingSurfaceLabel = (mode: DrawingSurfaceMode): string => {
  switch (mode) {
    case "board":
      return "Tafelfläche";
    case "minimized":
      return "Minimiert";
    case "closed":
      return "Geschlossen";
    case "window":
    default:
      return "Fenstermodus";
  }
};

export const getDrawingSurfaceActionLabel = (
  mode: DrawingSurfaceMode,
): string => {
  switch (mode) {
    case "board":
      return "In Fenstermodus wechseln";
    case "minimized":
      return "Zeichenfläche wiederherstellen";
    case "closed":
      return "Zeichenfläche öffnen";
    case "window":
    default:
      return "In Tafelfläche wechseln";
  }
};
