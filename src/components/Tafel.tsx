import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronUp,
  ChevronDown,
  Pencil,
  MousePointer2,
  Type,
  Bold,
  Italic,
  Underline,
  Shapes,
  Eraser,
  Undo2,
  Trash2,
  Download,
  Printer,
  X,
  Circle,
  Check,
  Square,
  ArrowUpRight,
  Minus,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  FolderOpen,
  ImagePlus,
  CalendarDays,
  Columns2,
  Ruler,
  BookMarked,
  Sticker,
  Sparkles,
  GripHorizontal,
  AlignLeft,
  AlignCenter,
  AlignRight,
  HelpCircle,
  Highlighter,
  Wand2,
  PenTool,
  Edit,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { TafelVorlage, MaterialItem } from "../types";
import { getTodayName, getKW } from "../lib/utils";

interface TafelProps {
  onClose?: () => void;
  isInline?: boolean;
  onExpand?: () => void;
}

const TAFEL_FONTS = [
  { name: "Standard (Modern)", preview: "Aa", val: '"DM Sans", ui-sans-serif, system-ui, sans-serif' },
  { name: "Geometric (Clean)", preview: "G", val: '"Outfit", "DM Sans", ui-sans-serif, system-ui, sans-serif' },
  { name: "Friendly (Rund)", preview: "Fr", val: '"Fredoka", "Quicksand", sans-serif' },
  { name: "Handschrift (Tafel)", preview: "✍️", val: '"Patrick Hand", "Kalam", cursive, sans-serif' },
  { name: "Schulschrift", preview: "abc", val: '"Edu VIC WA NT Beginner", "Patrick Hand", cursive, sans-serif' },
  { name: "Druckschrift (Play)", preview: "Dr", val: '"Playpen Sans", "Comic Neue", cursive, sans-serif' },
  { name: "Elegant (Serif)", preview: "El", val: '"Cinzel", "Playfair Display", ui-serif, Georgia, serif' },
  { name: "Comfort (Schnitt)", preview: "Co", val: '"Comfortaa", "Quicksand", cursive, sans-serif' },
  { name: "Buchschrift (Classic)", preview: "T", val: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  { name: "Dyslexic (Lesbar)", preview: "Lx", val: '"Lexend", "OpenDyslexic", "Lexend Deca", ui-sans-serif, sans-serif' },
  { name: "Playful", preview: "Pl", val: '"Quicksand", "Comic Sans MS", cursive, sans-serif' },
  { name: "Mono (Technisch)", preview: "Mn", val: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
];

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  textAlign: "left" | "center" | "right";
  fontWeight: "normal" | "bold";
  fontStyle: "normal" | "italic";
  textDecoration: "none" | "underline";
  alignToLines?: boolean;
}

const getLineHeightForMuster = (
  muster: string,
  musterGroesse: number,
  fontSize: number,
  alignToLines: boolean = true
): number => {
  if (!alignToLines || muster === "blanko") {
    return fontSize * 1.35;
  }
  const scale = musterGroesse / 30;
  if (muster === "liniert") {
    return 40 * scale;
  }
  if (muster === "kariert" || muster === "koordinaten") {
    return musterGroesse;
  }
  if (muster === "haeuschen") {
    return 25 * scale;
  }
  if (muster === "notenzeilen") {
    return 10 * scale;
  }
  if (muster === "punktraster") {
    return 25 * scale;
  }
  return fontSize * 1.35;
};

interface TafelSeite {
  bildDaten: string; // drawing layer base64 DataURL (transparent)
  hintergrund: string; // background color hex
  muster: string; // pattern ID
  geteilt?: boolean;
  textElemente?: TextElement[];
}

// Global pattern drawer helper with Part E integration
const drawPattern = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hintergrund: string,
  muster: string,
  geteilt?: boolean,
  musterGroesse: number = 30,
) => {
  ctx.clearRect(0, 0, width, height);

  const isDark = hintergrund === "#1a3a2a" || hintergrund === "#000000";
  const lineColor = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(100, 116, 139, 0.15)";
  const tintColor = isDark
    ? "rgba(255, 255, 255, 0.03)"
    : "rgba(148, 163, 184, 0.08)";

  ctx.save();

  // Draw division line first (Part E) so it is behind drawings and won't be removed by eraser
  if (geteilt) {
    ctx.strokeStyle = isDark
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(100, 116, 139, 0.5)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 6]); // beautiful clean dashed line
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]); // reset dash
  }

  if (muster === "blanko") {
    ctx.restore();
    return;
  }

  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  const scale = musterGroesse / 30;

  if (muster === "liniert") {
    ctx.beginPath();
    const liniertStep = 40 * scale;
    for (let y = liniertStep; y < height; y += liniertStep) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  } else if (muster === "kariert") {
    ctx.beginPath();
    // Horizontal lines
    for (let y = musterGroesse; y < height; y += musterGroesse) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    // Vertical lines
    for (let x = musterGroesse; x < width; x += musterGroesse) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();
  } else if (muster === "haeuschen") {
    // Austrian/German primary school line groups at 105px intervals
    const blockHeight = 105 * scale;
    const bandSize = 25 * scale;

    for (let y0 = 15 * scale; y0 < height; y0 += blockHeight) {
      // Highlight middle-band body (Line2 to Line3)
      ctx.fillStyle = tintColor;
      ctx.fillRect(0, y0 + bandSize, width, bandSize);

      ctx.beginPath();
      ctx.moveTo(0, y0);
      ctx.lineTo(width, y0);
      ctx.moveTo(0, y0 + bandSize);
      ctx.lineTo(width, y0 + bandSize);
      ctx.moveTo(0, y0 + 2 * bandSize);
      ctx.lineTo(width, y0 + 2 * bandSize);
      ctx.moveTo(0, y0 + 3 * bandSize);
      ctx.lineTo(width, y0 + 3 * bandSize);
      ctx.stroke();
    }
  } else if (muster === "punktraster") {
    // Dot Grid / Bullet Journal
    const step = 25 * scale;
    ctx.fillStyle = lineColor;
    for (let x = step; x < width; x += step) {
      for (let y = step; y < height; y += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5 * Math.max(0.8, scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (muster === "notenzeilen") {
    // Music Staves (5 lines per staff)
    const lineSpacing = 10 * scale;
    const staffGap = 45 * scale;
    const totalStaffStep = 4 * lineSpacing + staffGap;

    for (let y0 = 40 * scale; y0 < height - 20; y0 += totalStaffStep) {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const y = y0 + i * lineSpacing;
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
      }
      ctx.stroke();
    }
  } else if (muster === "koordinaten") {
    // X/Y Coordinate System with grid & center axes
    const step = 25 * scale;
    ctx.beginPath();
    for (let y = step; y < height; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(width, y);
    }
    for (let x = step; x < width; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Bold Center Axes
    const cx = Math.floor(width / (2 * step)) * step;
    const cy = Math.floor(height / (2 * step)) * step;

    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.75)" : "rgba(15, 23, 42, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();

    // X-Axis
    ctx.moveTo(20, cy); ctx.lineTo(width - 20, cy);
    // Arrow right
    ctx.moveTo(width - 28, cy - 6); ctx.lineTo(width - 20, cy); ctx.lineTo(width - 28, cy + 6);

    // Y-Axis
    ctx.moveTo(cx, height - 20); ctx.lineTo(cx, 20);
    // Arrow up
    ctx.moveTo(cx - 6, 28); ctx.lineTo(cx, 20); ctx.lineTo(cx + 6, 28);

    ctx.stroke();

    // Labels & Ticks
    ctx.fillStyle = isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(15, 23, 42, 0.85)";
    ctx.font = `bold ${Math.round(13 * scale)}px sans-serif`;
    ctx.fillText("x", width - 18, cy + 16);
    ctx.fillText("y", cx + 10, 24);
    ctx.fillText("0", cx - 12, cy + 14);
  } else if (muster === "isometrisch") {
    // 3D Isometric Dot Grid
    const step = 30 * scale;
    const hStep = step * Math.sin(Math.PI / 3);
    ctx.fillStyle = lineColor;
    let row = 0;
    for (let y = step; y < height; y += hStep) {
      const xOffset = (row % 2 === 0) ? 0 : step / 2;
      for (let x = xOffset; x < width; x += step) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5 * Math.max(0.8, scale), 0, Math.PI * 2);
        ctx.fill();
      }
      row++;
    }
  } else if (muster === "waben") {
    // Hexagonal Honeycomb (Chemistry / Organic structures)
    const r = 22 * scale;
    const a = r * Math.sin(Math.PI / 3);
    ctx.beginPath();
    for (let y = r; y < height + r; y += a * 2) {
      for (let x = r; x < width + r; x += r * 3) {
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x + r * Math.cos(angle);
          const hy = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();

        const x2 = x + r * 1.5;
        const y2 = y + a;
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = x2 + r * Math.cos(angle);
          const hy = y2 + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
      }
    }
    ctx.stroke();
  } else if (muster === "ttabelle") {
    // 2-Column Comparison Table Template
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2.5;
    const headerY = 70 * scale;
    ctx.beginPath();
    ctx.moveTo(30, headerY); ctx.lineTo(width - 30, headerY);
    ctx.moveTo(width / 2, headerY); ctx.lineTo(width / 2, height - 30);
    ctx.stroke();
  } else if (muster === "drespalten") {
    // 3-Column Template
    ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(100, 116, 139, 0.4)";
    ctx.lineWidth = 2.5;
    const headerY = 70 * scale;
    ctx.beginPath();
    ctx.moveTo(30, headerY); ctx.lineTo(width - 30, headerY);
    ctx.moveTo(width / 3, headerY); ctx.lineTo(width / 3, height - 30);
    ctx.moveTo((width / 3) * 2, headerY); ctx.lineTo((width / 3) * 2, height - 30);
    ctx.stroke();
  }

  ctx.restore();
};

export default function Tafel({
  onClose,
  isInline = false,
  onExpand,
}: TafelProps) {
  const { app, setApp } = useApp();

  // Core drawing states
  const [werkzeug, setWerkzeug] = useState<
    "maus" | "stift" | "text" | "form" | "radierer" | "laser" | "stempel"
  >("stift");
  const [aktiveForm, setAktiveForm] = useState<
    "kreis" | "rechteck" | "pfeil" | "linie"
  >("rechteck");
  const [stiftTyp, setStiftTyp] = useState<"normal" | "textmarker" | "kalligrafie" | "zauberstift">("normal");
  const [farbe, setFarbe] = useState("#000000"); // Default black on white
  const [dicke, setDicke] = useState(6);

  const [hintergrundfarbe, setHintergrundfarbe] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("__tafel_saved_pages__");
      if (saved) {
        const parsed = JSON.parse(saved);
        const idx = parseInt(localStorage.getItem("__tafel_active_idx__") || "0", 10);
        if (parsed[idx] && parsed[idx].hintergrund) return parsed[idx].hintergrund;
      }
    } catch (e) {}
    return "#ffffff";
  });
  const [musterGroesse, setMusterGroesse] = useState(30);
  const [muster, setMuster] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("__tafel_saved_pages__");
      if (saved) {
        const parsed = JSON.parse(saved);
        const idx = parseInt(localStorage.getItem("__tafel_active_idx__") || "0", 10);
        if (parsed[idx] && parsed[idx].muster) return parsed[idx].muster;
      }
    } catch (e) {}
    return "blanko";
  });
  const [zeichnet, setZeichnet] = useState(false);
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [werkzeugeEingeklappt, setWerkzeugeEingeklappt] = useState(false);
  const [fontSize, setFontSize] = useState<number>(32);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("bold");
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");
  const [textDecoration, setTextDecoration] = useState<"none" | "underline">("none");
  const [aktivesTextId, setAktivesTextId] = useState<string | null>(null);

  // Multiple Pages State (Max 10)
  const [seiten, setSeiten] = useState<TafelSeite[]>(() => {
    try {
      const saved = localStorage.getItem("__tafel_saved_pages__");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { bildDaten: "", hintergrund: "#ffffff", muster: "blanko", geteilt: false },
    ];
  });
  const [aktiveSeiteIdx, setAktiveSeiteIdx] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("__tafel_active_idx__");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed)) return parsed;
      }
    } catch (e) {}
    return 0;
  });

  // Persistent Templates Panel States
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [vorlageTitel, setVorlageTitel] = useState("");
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // References to canvases
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const patternCanvasRef = useRef<HTMLCanvasElement>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastDrawPointRef = useRef<{ x: number; y: number } | null>(null);
  const kalligrafieBreiteRef = useRef<number>(6);
  const zauberPunkteRef = useRef<{x: number, y: number}[]>([]);
  const zauberTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isCommittingRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // Text input overlay state
  const [textInput, setTextInput] = useState<{
    pxLeft: number;
    pxTop: number;
    canvasX: number;
    canvasY: number;
    val: string;
  } | null>(null);
  
  const [textAlign, setTextAlign] = useState<"left" | "center" | "right">(
    "left",
  );
  const [fontFamily, setFontFamily] = useState<string>('"DM Sans", ui-sans-serif, system-ui, sans-serif');
  const [alignToLines, setAlignToLines] = useState<boolean>(true);
  const [showFontDropdown, setShowFontDropdown] = useState(false);

  // Real-time text formatting synchronizer
  const updateActiveTextFormatting = (updates: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    fontWeight?: "normal" | "bold";
    fontStyle?: "normal" | "italic";
    textDecoration?: "none" | "underline";
    textAlign?: "left" | "center" | "right";
    alignToLines?: boolean;
  }) => {
    if (updates.fontSize !== undefined) setFontSize(updates.fontSize);
    if (updates.fontFamily !== undefined) setFontFamily(updates.fontFamily);
    if (updates.color !== undefined) setFarbe(updates.color);
    if (updates.fontWeight !== undefined) setFontWeight(updates.fontWeight);
    if (updates.fontStyle !== undefined) setFontStyle(updates.fontStyle);
    if (updates.textDecoration !== undefined) setTextDecoration(updates.textDecoration);
    if (updates.textAlign !== undefined) setTextAlign(updates.textAlign);
    if (updates.alignToLines !== undefined) setAlignToLines(updates.alignToLines);

    // If we have an active text element, update its values on-screen in real-time
    if (aktivesTextId) {
      setSeiten((prev) => {
        const arr = [...prev];
        const seite = { ...arr[aktiveSeiteIdx] };
        if (seite.textElemente) {
          seite.textElemente = seite.textElemente.map((t) =>
            t.id === aktivesTextId ? { ...t, ...updates } : t
          );
          arr[aktiveSeiteIdx] = seite;
        }
        return arr;
      });
    }
  };

  // Predefined pen colors
  const farben = [
    { value: "#000000", name: "Schwarz" },
    { value: "#ffffff", name: "Weiß" },
    { value: "#ffff00", name: "Gelb" },
    { value: "#38bdf8", name: "Hellblau" },
    { value: "#4ade80", name: "Hellgrün" },
    { value: "#f97316", name: "Orange" },
    { value: "#ef4444", name: "Rot" },
  ];

  // Laserpointer State & Refs (Part A)
  const laserPointsRef = useRef<{ x: number; y: number; time: number }[]>([]);
  const laserAktiveRef = useRef<{ x: number; y: number } | null>(null);
  const laserCanvasRef = useRef<HTMLCanvasElement>(null);
  const laserLoopIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Floating Placed Image State & Refs (Part B)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placedImage, setPlacedImage] = useState<{
    src: string;
    imgObj: HTMLImageElement;
    x: number;
    y: number;
    width: number;
    height: number;
    angle: number;
  } | null>(null);

  // Text Snippets (Stunden-Info) State (Part C)
  const [isStundenInfoOpen, setIsStundenInfoOpen] = useState(false);
  const [stundenInfoData, setStundenInfoData] = useState<{
    fach?: string;
    stundennummer?: number;
    thema?: string;
    datum?: string;
    exists: boolean;
  } | null>(null);
  const [stundenInfoOffset, setStundenInfoOffset] = useState({ x: 50, y: 80 });

  // Mobile Remote Controller Sync for Text and Drawings
  const lastProcessedTextTsRef = useRef<number>(0);
  const lastProcessedDrawingTsRef = useRef<number>(0);
  const lastProcessedClearTsRef = useRef<number>(0);

  useEffect(() => {
    const remoteTexts = app.boardSettings?.remoteTextEntries;
    if (Array.isArray(remoteTexts) && remoteTexts.length > 0) {
      const latest = remoteTexts[remoteTexts.length - 1];
      if (latest && latest.timestamp > lastProcessedTextTsRef.current) {
        lastProcessedTextTsRef.current = latest.timestamp;

        const newTextEl: TextElement = {
          id: `remote-text-${latest.timestamp}`,
          x: latest.x ?? 80,
          y: latest.y ?? 120,
          text: latest.text,
          fontSize: latest.fontSize || 38,
          fontFamily: latest.fontFamily || '"DM Sans", ui-sans-serif, system-ui, sans-serif',
          color: latest.color || "#ffffff",
          textAlign: latest.textAlign || "left",
          fontWeight: "bold",
          fontStyle: "normal",
          textDecoration: "none",
        };

        setSeiten((prev) => {
          const arr = [...prev];
          const curr = { ...arr[aktiveSeiteIdx] };
          curr.textElemente = [...(curr.textElemente || []), newTextEl];
          arr[aktiveSeiteIdx] = curr;
          return arr;
        });
      }
    }
  }, [app.boardSettings?.remoteTextEntries, aktiveSeiteIdx]);

  useEffect(() => {
    const drawingData = app.boardSettings?.remoteDrawingImage;
    if (drawingData?.dataUrl && drawingData.timestamp > lastProcessedDrawingTsRef.current) {
      lastProcessedDrawingTsRef.current = drawingData.timestamp;

      const img = new Image();
      img.onload = () => {
        const cvs = canvasRef.current;
        if (!cvs) return;
        const ctx = cvs.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

        try {
          const newBase64 = cvs.toDataURL();
          setSeiten((prev) => {
            const arr = [...prev];
            arr[aktiveSeiteIdx] = { ...arr[aktiveSeiteIdx], bildDaten: newBase64 };
            return arr;
          });
        } catch (e) {}
      };
      img.src = drawingData.dataUrl;
    }
  }, [app.boardSettings?.remoteDrawingImage, aktiveSeiteIdx]);

  useEffect(() => {
    const clearTs = app.boardSettings?.clearTafelTrigger;
    if (clearTs && clearTs > lastProcessedClearTsRef.current) {
      lastProcessedClearTsRef.current = clearTs;
      const cvs = canvasRef.current;
      if (cvs) {
        const ctx = cvs.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, cvs.width, cvs.height);
      }
      setSeiten((prev) => {
        const arr = [...prev];
        arr[aktiveSeiteIdx] = { ...arr[aktiveSeiteIdx], bildDaten: "", textElemente: [] };
        return arr;
      });
    }
  }, [app.boardSettings?.clearTafelTrigger, aktiveSeiteIdx]);

  // Stamp Tool State (Part D)
  const stempelEmojis = [
    "➡️",
    "⭐",
    "😊",
    "✔️",
    "❓",
    "⚠️",
    "❌",
    "💡",
    "👍",
    "🎯",
  ];
  const [aktiverStempel, setAktiverStempel] = useState("⭐");
  const [stempelGroesse, setStempelGroesse] = useState<32 | 48 | 72>(48);

  // Two-color division State (Part E)
  const [geteilt, setGeteilt] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("__tafel_saved_pages__");
      if (saved) {
        const parsed = JSON.parse(saved);
        const idx = parseInt(localStorage.getItem("__tafel_active_idx__") || "0", 10);
        if (parsed[idx] && parsed[idx].geteilt !== undefined) return !!parsed[idx].geteilt;
      }
    } catch (e) {}
    return false;
  });

  // Ruler State (Part F)
  const [isLinealSichtbar, setIsLinealSichtbar] = useState(false);
  const [linealPos, setLinealPos] = useState({ x: 400, y: 300 });
  const [linealDrehung, setLinealDrehung] = useState(0);

  // Material Library Save State (Part G)
  const [isMaterialLibraryDialogOpen, setIsMaterialLibraryDialogOpen] =
    useState(false);
  const [materialTitel, setMaterialTitel] = useState("");
  const [materialFach, setMaterialFach] = useState("Mathematik");
  const [materialSuccessToast, setMaterialSuccessToast] = useState(false);
  const [showShortcutsInfo, setShowShortcutsInfo] = useState(false);


  // Math projections for Ruler snap (Part F)
  const applyLinealSnap = (x: number, y: number) => {
    if (!isLinealSichtbar) return { x, y, snapped: false };

    // Convert angle to radians
    const theta = (linealDrehung * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const dx = x - linealPos.x;
    const dy = y - linealPos.y;

    // Project to ruler coordinates (length component u, perpendicular component v)
    const u = dx * cosT + dy * sinT;
    const v = -dx * sinT + dy * cosT;

    // Limit to line width/length of ruler (length 500px, so half is 250px)
    if (Math.abs(u) <= 260) {
      // Snapping to top edge (v = -30), centerline (v = 0), or bottom edge (v = 30)
      const distToTopEdge = Math.abs(v - -30);
      const distToCenter = Math.abs(v);
      const distToBottomEdge = Math.abs(v - 30);

      let targetV = null;
      if (distToTopEdge <= 20) {
        targetV = -30;
      } else if (distToCenter <= 20) {
        targetV = 0;
      } else if (distToBottomEdge <= 20) {
        targetV = 30;
      }

      if (targetV !== null) {
        // Project back to global space
        const snapX = linealPos.x + u * cosT - targetV * sinT;
        const snapY = linealPos.y + u * sinT + targetV * cosT;
        return { x: snapX, y: snapY, snapped: true };
      }
    }

    return { x, y, snapped: false };
  };

  // Map coordinate scaling defensively with ruler snapping integration
  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Support touch objects as well
    const clientX =
      e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY =
      e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    let x = (clientX - rect.left) * (canvas.width / rect.width);
    let y = (clientY - rect.top) * (canvas.height / rect.height);

    // Apply snap if drawing with Pen or Shapes while Ruler is visible
    if ((werkzeug === "stift" || werkzeug === "form") && isLinealSichtbar) {
      const snapResult = applyLinealSnap(x, y);
      if (snapResult.snapped) {
        x = snapResult.x;
        y = snapResult.y;
      }
    }

    return { x, y };
  };

  // Helper to draw shapes
  const drawShape = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    form: "kreis" | "rechteck" | "pfeil" | "linie",
  ) => {
    ctx.beginPath();
    if (form === "kreis") {
      const radius = Math.sqrt(
        Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2),
      );
      ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
    } else if (form === "rechteck") {
      const width = endX - startX;
      const height = endY - startY;
      ctx.strokeRect(startX, startY, width, height);
      return;
    } else if (form === "linie") {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
    } else if (form === "pfeil") {
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      const angle = Math.atan2(endY - startY, endX - startX);
      const headLength = Math.max(12, dicke * 2.5);
      ctx.lineTo(
        endX - headLength * Math.cos(angle - Math.PI / 6),
        endY - headLength * Math.sin(angle - Math.PI / 6),
      );
      ctx.moveTo(endX, endY);
      ctx.lineTo(
        endX - headLength * Math.cos(angle + Math.PI / 6),
        endY - headLength * Math.sin(angle + Math.PI / 6),
      );
    }
    ctx.stroke();
  };

  // Commit dynamic text to canvas
  const commitText = () => {
    if (!textInput || isCommittingRef.current) return;
    isCommittingRef.current = true;
    setTimeout(() => (isCommittingRef.current = false), 50);

    const textVal = textInput.val.trim();
    if (textVal) {
      setSeiten((prev) => {
        const arr = [...prev];
        const seite = { ...arr[aktiveSeiteIdx] };
        if (!seite.textElemente) seite.textElemente = [];

        if (aktivesTextId) {
          seite.textElemente = seite.textElemente.map((t) =>
            t.id === aktivesTextId
              ? {
                  ...t,
                  text: textVal,
                  fontSize,
                  fontFamily,
                  color: farbe,
                  textAlign,
                  fontWeight,
                  fontStyle,
                  textDecoration,
                  alignToLines,
                  x: textInput.canvasX,
                  y: textInput.canvasY,
                }
              : t,
          );
        } else {
          seite.textElemente = [
            ...seite.textElemente,
            {
              id: crypto.randomUUID(),
              text: textVal,
              fontSize,
              fontFamily,
              color: farbe,
              textAlign,
              fontWeight,
              fontStyle,
              textDecoration,
              alignToLines,
              x: textInput.canvasX,
              y: textInput.canvasY,
            },
          ];
        }

        arr[aktiveSeiteIdx] = seite;
        return arr;
      });
    } else {
      if (aktivesTextId) {
        setSeiten((prev) => {
          const arr = [...prev];
          const seite = { ...arr[aktiveSeiteIdx] };
          if (seite.textElemente) {
            seite.textElemente = seite.textElemente.filter(
              (t) => t.id !== aktivesTextId,
            );
            arr[aktiveSeiteIdx] = seite;
          }
          return arr;
        });
      }
    }
    setTextInput(null);
    setAktivesTextId(null);
  };

  // Canvas interaction handlers
  const startZeichnen = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);

    // Commit existing text input if switching placement or clicking away
    if (textInput) {
      commitText();
    }

    if (werkzeug === "maus") {
      setAktivesTextId(null);
      return;
    }

    if (werkzeug === "text") {
      const rect = canvas.getBoundingClientRect();
      const clientX =
        e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY =
        e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const pxLeft = clientX - rect.left;
      const pxTop = clientY - rect.top;

      setTextInput({
        pxLeft,
        pxTop,
        canvasX: coords.x,
        canvasY: coords.y,
        val: "",
      });
      return;
    }

    if (werkzeug === "stempel") {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => [...prev.slice(-19), snapshot]);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = farbe; // ensure valid fill style
      // Using standard serif/sans-serif which supports color emojis perfectly across all browsers
      ctx.font = `${stempelGroesse}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(aktiverStempel, coords.x, coords.y);
      ctx.restore();

      const finalSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => [...prev.slice(-19), finalSnapshot]);

      // Sync drawing layer back to pages state
      const currentDrawing = canvas.toDataURL("image/png");
      setSeiten((prev) => {
        const updated = [...prev];
        if (updated[aktiveSeiteIdx]) {
          updated[aktiveSeiteIdx] = {
            ...updated[aktiveSeiteIdx],
            bildDaten: currentDrawing,
          };
        }
        return updated;
      });
      return;
    }

    // Save state BEFORE drawing so undo stack top contains current image
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-19), snapshot]);

    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);

    if (werkzeug === "radierer") {
      ctx.strokeStyle = "#000000"; // arbitrary solid for destination-out
      ctx.lineWidth = dicke + 25; // larger eraser width
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    } else {
      ctx.strokeStyle = farbe;
      
      if (werkzeug === "stift" && stiftTyp === "kalligrafie") {
        ctx.lineWidth = dicke;
        kalligrafieBreiteRef.current = dicke;
      } else {
        ctx.lineWidth = dicke;
      }
      
      if (werkzeug === "stift" && stiftTyp === "textmarker") {
        ctx.globalCompositeOperation = "multiply";
      } else {
        ctx.globalCompositeOperation = "source-over";
      }
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    startPointRef.current = coords;
    lastDrawPointRef.current = coords;
    
    if (werkzeug === "stift" && stiftTyp === "zauberstift") {
      zauberPunkteRef.current = [coords];
      if (zauberTimeoutRef.current) clearTimeout(zauberTimeoutRef.current);
    }

    setZeichnet(true);
  };

  const erkennenUndErsetzen = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const punkte = zauberPunkteRef.current;
    if (punkte.length < 10) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    punkte.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });

    const width = maxX - minX;
    const height = maxY - minY;
    
    // Snap needs some volume
    if (width < 20 || height < 20) return;

    setZeichnet(false); // Stop the hold gesture immediately

    // Restore pre-stroke state to clear handwriting
    const lastState = undoStack[undoStack.length - 1];
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
    }

    ctx.save();
    ctx.strokeStyle = farbe;
    ctx.lineWidth = dicke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Simple heuristic: distance between start & end
    const startP = punkte[0];
    const endP = punkte[punkte.length - 1];
    const gap = Math.hypot(startP.x - endP.x, startP.y - endP.y);
    const diagonal = Math.hypot(width, height);
    
    // If closed loop -> rectangle or circle
    if (gap < diagonal * 0.3) {
      if (Math.abs(width - height) < Math.max(width, height) * 0.2) {
        // Circle snapped
        ctx.beginPath();
        ctx.arc(minX + width/2, minY + height/2, (width+height)/4, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Rectangle snapped
        ctx.strokeRect(minX, minY, width, height);
      }
    } else {
      // Not strongly closed -> Triangle / Arrow maybe, we'll snap a simple triangle
      ctx.beginPath();
      ctx.moveTo(minX + width/2, minY);
      ctx.lineTo(maxX, maxY);
      ctx.lineTo(minX, maxY);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();

    // Commit shape
    const finalSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev, finalSnapshot]);
    zauberPunkteRef.current = [];
  };

  const weiterZeichnen = (e: any) => {
    if (!zeichnet) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const coords = getCoordinates(e);

    if (werkzeug === "stift" || werkzeug === "radierer") {
      const lastPt = lastDrawPointRef.current;
      if (!lastPt) return;

      if (werkzeug === "stift" && stiftTyp === "kalligrafie") {
        const dist = Math.hypot(coords.x - lastPt.x, coords.y - lastPt.y);
        // speed based thickness: faster = thinner
        const targetWidth = Math.max(1, dicke - dist * 0.2);
        kalligrafieBreiteRef.current += (targetWidth - kalligrafieBreiteRef.current) * 0.3; // smooth easing
        ctx.lineWidth = kalligrafieBreiteRef.current;
      }

      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      
      lastDrawPointRef.current = coords;

      if (werkzeug === "stift" && stiftTyp === "zauberstift") {
        zauberPunkteRef.current.push(coords);
        if (zauberTimeoutRef.current) clearTimeout(zauberTimeoutRef.current);
        zauberTimeoutRef.current = setTimeout(() => {
          if (zeichnet) {
            erkennenUndErsetzen(ctx, canvas);
          }
        }, 500); // Hold for 500ms to snap
      }

    } else if (werkzeug === "form") {
      const start = startPointRef.current;
      if (!start) return;

      // Restore baseline state from the top of the stack (before this gesture started)
      const lastState = undoStack[undoStack.length - 1];
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      ctx.save();
      ctx.strokeStyle = farbe;
      ctx.lineWidth = dicke;
      ctx.globalCompositeOperation = "source-over";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      drawShape(ctx, start.x, start.y, coords.x, coords.y, aktiveForm);
      ctx.restore();
    }
  };

  const stopZeichnen = () => {
    if (!zeichnet) return;
    setZeichnet(false);
    startPointRef.current = null;
    if (zauberTimeoutRef.current) clearTimeout(zauberTimeoutRef.current);

    // After drawing completes, push the finished canvas to the undoStack
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const finalSnapshot = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );

        // Remove the temporary pre-draw snapshot we saved at start,
        // and append [pre-draw snapshot, finished snapshot] to keep perfect history
        setUndoStack((prev) => {
          const base = prev.slice(0, -1);
          return [...base, finalSnapshot];
        });

        // Sync drawing layer back to pages state
        const currentDrawing = canvas.toDataURL("image/png");
        setSeiten((prev) => {
          const updated = [...prev];
          if (updated[aktiveSeiteIdx]) {
            updated[aktiveSeiteIdx] = {
              ...updated[aktiveSeiteIdx],
              bildDaten: currentDrawing,
            };
          }
          return updated;
        });
      }
    }
  };

  // Trigger undo
  const handleUndo = () => {
    if (undoStack.length <= 1) {
      // Clear canvas if stack has 0/1 elements
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          setUndoStack([]);
          // Clear seiten bildDaten too
          setSeiten((prev) => {
            const updated = [...prev];
            if (updated[aktiveSeiteIdx]) {
              updated[aktiveSeiteIdx] = {
                ...updated[aktiveSeiteIdx],
                bildDaten: "",
              };
            }
            return updated;
          });
        }
      }
      return;
    }

    const currentStack = [...undoStack];
    currentStack.pop(); // Pop current state
    const prevState = currentStack[currentStack.length - 1];

    if (prevState) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.putImageData(prevState, 0, 0);
        setUndoStack(currentStack);

        // Sync drawing layer back to pages state
        const currentDrawing = canvas.toDataURL("image/png");
        setSeiten((prev) => {
          const updated = [...prev];
          if (updated[aktiveSeiteIdx]) {
            updated[aktiveSeiteIdx] = {
              ...updated[aktiveSeiteIdx],
              bildDaten: currentDrawing,
            };
          }
          return updated;
        });
      }
    }
  };

  // Actions
  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSeiten((prev) => {
          const arr = [...prev];
          arr[aktiveSeiteIdx] = { ...arr[aktiveSeiteIdx], textElemente: [], bildDaten: "" };
          return arr;
        });
        
        // Push the cleared state to undo stack so clear is undoable (for canvas)
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setUndoStack((prev) => [...prev, snapshot]);
      }
    }
    setAktivesTextId(null);
    setTextInput(null);
    setShowClearConfirm(false);
  };

  const getExportDataUrl = (): string => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return "";

    tempCtx.fillStyle = hintergrundfarbe;
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Render pattern layer on printing/export canvas with division line
    drawPattern(
      tempCtx,
      canvas.width,
      canvas.height,
      hintergrundfarbe,
      muster,
      geteilt,
      musterGroesse,
    );

    // Merge drawings
    tempCtx.drawImage(canvas, 0, 0);

    // Merge text elements
    if (seiten[aktiveSeiteIdx]?.textElemente) {
      tempCtx.textBaseline = "top";
      seiten[aktiveSeiteIdx].textElemente.forEach((t) => {
        tempCtx.font = `${t.fontStyle === "italic" ? "italic" : "normal"} ${t.fontWeight === "bold" ? "bold" : "normal"} ${t.fontSize}px ${t.fontFamily}`;
        tempCtx.fillStyle = t.color;
        tempCtx.textAlign = t.textAlign;
        
        let drawX = t.x;
        // The text element's x coordinate from state is mapped appropriately.
        // During commitText, we calculate drawX for center/right, but we now store the true DOM-mapped x,
        // Wait, NO. We just stored `textInput.canvasX` directly.
        // HTML 'textAlign' inside CSS moves the text relative to the container width, but we set `width=auto`.
        // The `x` and `y` we save is always the top-left corner because of our DOM `<div style={{left: pxLeft}}>...</div>`!
        // HTML div puts the top-left at pxLeft!
        // So textAlign in DOM only affects multiple lines inside the div, NOT the origin of the div itself.
        // Therefore, when rendering on Canvas using `textAlign = "left"`, we just draw at `t.x, t.y`.
        // BUT wait: multiple lines. We need to split by \n.
        
        const lines = t.text.split("\n");
        const lineHeight = getLineHeightForMuster(muster, musterGroesse, t.fontSize, t.alignToLines ?? true);
        
        // CSS text-align behavior inside an auto-width absolute div:
        // Actually it just left-aligns the longest line to the left edge of the div.
        // Wait, if it's "center", the div is exactly as wide as the longest line, so "center" aligns the shorter lines dynamically within it.
        // On Canvas, to match this:
        // By default we can just use tempCtx.textAlign = "left", and draw lines. But they want it aligned properly!
        
        lines.forEach((line, index) => {
          tempCtx.fillText(line, drawX, t.y + index * lineHeight);
        });

        // Add underline if necessary
        if (t.textDecoration === "underline") {
          tempCtx.strokeStyle = t.color;
          tempCtx.lineWidth = Math.max(1, t.fontSize * 0.08);
          lines.forEach((line, index) => {
            const metrics = tempCtx.measureText(line);
            const lineY = t.y + index * lineHeight + t.fontSize * 1.1;
            tempCtx.beginPath();
            tempCtx.moveTo(drawX, lineY);
            tempCtx.lineTo(drawX + metrics.width, lineY);
            tempCtx.stroke();
          });
        }
      });
    }

    return tempCanvas.toDataURL("image/png");
  };

  const handleSave = () => {
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `Tafel-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handlePrint = () => {
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;
    const win = window.open("");
    if (win) {
      win.document.write(
        `<img src="${dataUrl}" style="width:100%;height:auto;" />`,
      );
      win.print();
      win.close();
    } else {
      alert("Drucken fehlgeschlagen. Bitte Pop-ups erlauben.");
    }
  };

  const handleCloseAttempt = () => {
    if (!onClose) return;
    const isCanvasEmpty = undoStack.length <= 1;
    if (isCanvasEmpty) {
      onClose();
    } else {
      if (
        confirm("Tafel schließen? Nicht gespeicherte Inhalte gehen verloren.")
      ) {
        onClose();
      }
    }
  };

  // Multiple Pages Operations with geteilt state caching support (Part E)
  const loadSeite = (targetIdx: number, currentSeitenArray = seiten) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setTextInput(null);
    setZeichnet(false);

    const targetPage = currentSeitenArray[targetIdx];
    setHintergrundfarbe(targetPage.hintergrund);
    setMuster(targetPage.muster);
    setGeteilt(!!targetPage.geteilt); // restore geteilt state
    setAktiveSeiteIdx(targetIdx);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (targetPage.bildDaten) {
      const img = new Image();
      img.src = targetPage.bildDaten;
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        // Reset undo stack
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setUndoStack([snapshot]);
      };
    } else {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack([snapshot]);
    }
  };

  const handleSwitchSeite = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= seiten.length) return;

    if (textInput) {
      commitText();
    }

    const currentDrawing = canvasRef.current
      ? canvasRef.current.toDataURL("image/png")
      : "";

    setSeiten((prev) => {
      const updatedSeiten = [...prev];
      updatedSeiten[aktiveSeiteIdx] = {
        ...updatedSeiten[aktiveSeiteIdx],
        bildDaten: currentDrawing,
        hintergrund: hintergrundfarbe,
        muster: muster,
        geteilt: geteilt,
      };
      setTimeout(() => loadSeite(targetIdx, updatedSeiten), 0);
      return updatedSeiten;
    });
  };

  const handleAddSeite = () => {
    if (seiten.length >= 10) {
      alert("Maximale Anzahl von 10 Seiten erreicht.");
      return;
    }

    if (textInput) {
      commitText();
    }

    const currentDrawing = canvasRef.current
      ? canvasRef.current.toDataURL("image/png")
      : "";

    setSeiten((prev) => {
      const updatedSeiten = [...prev];
      updatedSeiten[aktiveSeiteIdx] = {
        ...updatedSeiten[aktiveSeiteIdx],
        bildDaten: currentDrawing,
        hintergrund: hintergrundfarbe,
        muster: muster,
        geteilt: geteilt,
      };

      const newPage: TafelSeite = {
        bildDaten: "",
        hintergrund: hintergrundfarbe,
        muster: muster,
        geteilt: false, 
      };

      const finalSeiten = [...updatedSeiten, newPage];
      setTimeout(() => loadSeite(finalSeiten.length - 1, finalSeiten), 0);
      return finalSeiten;
    });
  };

  const handleDeleteSeite = () => {
    if (seiten.length <= 1) return;
    if (!confirm("Diese Seite wirklich löschen?")) return;

    if (textInput) {
      setTextInput(null);
      setAktivesTextId(null);
    }

    setSeiten((prev) => {
      const targetIdxAfterDelete = aktiveSeiteIdx === 0 ? 0 : aktiveSeiteIdx - 1;
      const updatedSeiten = prev.filter((_, idx) => idx !== aktiveSeiteIdx);
      setTimeout(() => loadSeite(targetIdxAfterDelete, updatedSeiten), 0);
      return updatedSeiten;
    });
  };

  // Background and Contrasting Pen handling
  const handleBackgroundChange = (newBg: string) => {
    setHintergrundfarbe(newBg);
    // If the pen color matches the new background, change to contrasting color
    if (farbe.toLowerCase() === newBg.toLowerCase()) {
      setFarbe(newBg === "#ffffff" ? "#000000" : "#ffffff");
    }
  };

  // Persistent templates save Submit with geteilt support (Part E)
  const handleSaveVorlageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const titleVal = vorlageTitel.trim();
    if (!titleVal) {
      alert("Bitte einen Titel eingeben.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentVorlagen = [...(app.tafelVorlagen || [])];

    // Limit check warning
    if (currentVorlagen.length >= 15) {
      if (
        confirm(
          "Du hast die maximale Anzahl von 15 Vorlagen erreicht. Soll die älteste Vorlage gelöscht werden, um Platz zu sparen?",
        )
      ) {
        currentVorlagen.shift();
      } else {
        return;
      }
    }

    // Downsizer to max 1280px for standard JPEG localstorage compactness
    const maxWidth = 1280;
    let width = canvas.width;
    let height = canvas.height;
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Fill the background and render the pattern
    tempCtx.fillStyle = hintergrundfarbe;
    tempCtx.fillRect(0, 0, width, height);
    drawPattern(
      tempCtx,
      width,
      height,
      hintergrundfarbe,
      muster,
      geteilt,
      musterGroesse,
    );

    // Place scaled drawing
    tempCtx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      width,
      height,
    );
    
    // Scale texts
    if (seiten[aktiveSeiteIdx]?.textElemente) {
      const scaleFactorX = width / canvas.width;
      const scaleFactorY = height / canvas.height;
      tempCtx.textBaseline = "top";
      seiten[aktiveSeiteIdx].textElemente.forEach((t) => {
        tempCtx.font = `${t.fontStyle === "italic" ? "italic" : "normal"} ${t.fontWeight === "bold" ? "bold" : "normal"} ${t.fontSize * Math.min(scaleFactorX, scaleFactorY)}px ${t.fontFamily}`;
        tempCtx.fillStyle = t.color;
        tempCtx.textAlign = t.textAlign;
        const lines = t.text.split("\n");
        const lineHeight = t.fontSize * 1.2 * Math.min(scaleFactorX, scaleFactorY);
        lines.forEach((line, index) => {
          tempCtx.fillText(line, t.x * scaleFactorX, t.y * scaleFactorY + index * lineHeight);
        });
      });
    }

    // Convert into quality-compressed JPEG (extremely economic)
    const jpegDataUrl = tempCanvas.toDataURL("image/jpeg", 0.7);

    // Emergency Quota check
    try {
      const mockState = [
        ...currentVorlagen,
        { id: "temp", bildDaten: jpegDataUrl },
      ];
      const testString = JSON.stringify(mockState);
      localStorage.setItem("__tafel_quota_test__", testString);
      localStorage.removeItem("__tafel_quota_test__");
    } catch (quotaError) {
      alert("Speicher voll – bitte alte Vorlagen löschen");
      return;
    }

    const neueVorlage: TafelVorlage = {
      id: "tafelvorlage-" + Date.now(),
      titel: titleVal,
      erstellt: new Date().toISOString(),
      hintergrund: hintergrundfarbe,
      muster: muster,
      bildDaten: jpegDataUrl,
      geteilt: geteilt, // persistent save for page split
    };

    const updatedVorlagen = [...currentVorlagen, neueVorlage];

    setApp((prev) => ({
      ...prev,
      tafelVorlagen: updatedVorlagen,
    }));

    setIsSaveDialogOpen(false);
    setVorlageTitel("");
    alert(`Vorlage "${titleVal}" erfolgreich gespeichert!`);
  };

  const handleLoadVorlage = (vorlage: TafelVorlage) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isCanvasNotEmpty = undoStack.length > 1;
    if (isCanvasNotEmpty) {
      if (!confirm("Aktuelle Seite überschreiben?")) return;
    }

    setHintergrundfarbe(vorlage.hintergrund);
    setMuster(vorlage.muster);
    setGeteilt(!!vorlage.geteilt); // restore geteilt state from template

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = vorlage.bildDaten;
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack([snapshot]);
    };

    setIsTemplatesOpen(false);
  };

  const handleDeleteVorlage = (viId: string, title: string) => {
    if (!confirm(`Vorlage "${title}" wirklich löschen?`)) return;
    const updated = (app.tafelVorlagen || []).filter((v) => v.id !== viId);
    setApp((prev) => ({
      ...prev,
      tafelVorlagen: updated,
    }));
  };

  // Dynamic board sizing & scaling with buffer preservation
  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    const pCanvas = patternCanvasRef.current;
    if (!canvas || !pCanvas) return;
    const container = containerRef.current || canvas.parentElement;
    if (!container) return;

    const ctx = canvas.getContext("2d");
    const pCtx = pCanvas.getContext("2d");
    if (!ctx || !pCtx) return;

    let tempSnapshot: ImageData | null = null;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;

    if (oldWidth > 0 && oldHeight > 0) {
      try {
        tempSnapshot = ctx.getImageData(0, 0, oldWidth, oldHeight);
      } catch (e) {
        // ignore
      }
    }

    const nextWidth = container.clientWidth || 800;
    const nextHeight = container.clientHeight || 600;

    canvas.width = nextWidth;
    canvas.height = nextHeight;
    pCanvas.width = nextWidth;
    pCanvas.height = nextHeight;

    const lCanvas = laserCanvasRef.current;
    if (lCanvas) {
      lCanvas.width = nextWidth;
      lCanvas.height = nextHeight;
    }

    // Clear main drawing canvas (keep transparent)
    ctx.clearRect(0, 0, nextWidth, nextHeight);

    // Restore drawn pixels
    if (tempSnapshot && oldWidth > 0 && oldHeight > 0) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = oldWidth;
      tempCanvas.height = oldHeight;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(tempSnapshot, 0, 0);
        ctx.drawImage(tempCanvas, 0, 0); // DO NOT STRETCH TO NEXT WIDTH/HEIGHT!
      }
    } else if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      const targetPage = seiten[aktiveSeiteIdx];
      if (targetPage && targetPage.bildDaten) {
        const img = new Image();
        img.src = targetPage.bildDaten;
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setUndoStack([snapshot]);
        };
      }
    }

    // Refresh pattern background with division line
    drawPattern(
      pCtx,
      nextWidth,
      nextHeight,
      hintergrundfarbe,
      muster,
      geteilt,
      musterGroesse,
    );

    // Refresh active state snapshot
    const resizedSnapshot = ctx.getImageData(0, 0, nextWidth, nextHeight);
    setUndoStack([resizedSnapshot]);
  };

  // Run resize cleanly on container size shifts using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });

    resizeObserver.observe(container);

    // Trigger immediate, delayed and transition resize runs
    resizeCanvas();
    const t1 = setTimeout(resizeCanvas, 100);
    const t2 = setTimeout(resizeCanvas, 250);

    return () => {
      resizeObserver.unobserve(container);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [werkzeugeEingeklappt]);

  // Redraw pattern if background / pattern / division settings change
  useEffect(() => {
    const pCanvas = patternCanvasRef.current;
    if (pCanvas) {
      const pCtx = pCanvas.getContext("2d");
      if (pCtx) {
        drawPattern(
          pCtx,
          pCanvas.width,
          pCanvas.height,
          hintergrundfarbe,
          muster,
          geteilt,
          musterGroesse,
        );
      }
    }
  }, [muster, hintergrundfarbe, geteilt, musterGroesse]);

  // Window resize event handler
  useEffect(() => {
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  // Sync state to localStorage for persistence
  useEffect(() => {
    try {
      localStorage.setItem("__tafel_saved_pages__", JSON.stringify(seiten));
      localStorage.setItem("__tafel_active_idx__", aktiveSeiteIdx.toString());
    } catch (e) {
      console.error("Failed to save blackboard state:", e);
    }
  }, [seiten, aktiveSeiteIdx]);

  // Laserpointer Loop and Ticker (Part A)
  const drawLaserPointer = useCallback(() => {
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const now = Date.now();
    const trailLifetime = 1500; // fade out in 1.5 seconds

    // Filter points inside bounds
    laserPointsRef.current = laserPointsRef.current.filter(
      (p) => now - p.time < trailLifetime,
    );

    const points = laserPointsRef.current;

    // Draw glowing fading line trail
    if (points.length >= 2) {
      for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];

        const ageAvg = now - (p1.time + p2.time) / 2;
        const opacity = Math.max(0, 1 - ageAvg / trailLifetime);

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);

        ctx.strokeStyle = `rgba(239, 68, 68, ${opacity * 0.85})`;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.restore();
      }
    }

    // Draw glowing red active laser tip pointer circle
    const activePoint = laserAktiveRef.current;
    if (activePoint) {
      ctx.save();

      // Shadow for soft heavy outer glow
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 12;

      // Tip inner gradient red to bright pink/white
      const grad = ctx.createRadialGradient(
        activePoint.x,
        activePoint.y,
        2,
        activePoint.x,
        activePoint.y,
        8,
      );
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.3, "#fca5a5");
      grad.addColorStop(0.7, "#ef4444");
      grad.addColorStop(1, "rgba(239, 68, 68, 0)");

      ctx.beginPath();
      ctx.arc(activePoint.x, activePoint.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.restore();
    }

    // Keep ticking if we have trails remaining or active pointer tip
    if (laserPointsRef.current.length > 0 || laserAktiveRef.current !== null) {
      laserLoopIdRef.current = requestAnimationFrame(drawLaserPointer);
    } else {
      laserLoopIdRef.current = null;
    }
  }, []);

  const handleLaserMouseMove = (e: any) => {
    if (werkzeug !== "laser") return;
    const canvas = laserCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    // Support mouse & touch events defensively
    const clientX =
      e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY =
      e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);

    const now = Date.now();
    laserAktiveRef.current = { x, y };

    // Register coordinates in trail
    laserPointsRef.current.push({ x, y, time: now });

    if (laserLoopIdRef.current === null) {
      laserLoopIdRef.current = requestAnimationFrame(drawLaserPointer);
    }
  };

  useEffect(() => {
    if (werkzeug !== "laser") {
      laserAktiveRef.current = null;
      laserPointsRef.current = [];
      const canvas = laserCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [werkzeug]);

  const handleLaserMouseLeave = () => {
    laserAktiveRef.current = null;
    // Keep trail fading anim loop running to clean leftover trail
    if (laserLoopIdRef.current === null && laserPointsRef.current.length > 0) {
      laserLoopIdRef.current = requestAnimationFrame(drawLaserPointer);
    }
  };

  // Laser Tool cleanup effect
  useEffect(() => {
    if (werkzeug !== "laser") {
      if (laserLoopIdRef.current !== null) {
        cancelAnimationFrame(laserLoopIdRef.current);
        laserLoopIdRef.current = null;
      }
      laserPointsRef.current = [];
      laserAktiveRef.current = null;
      const canvas = laserCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [werkzeug, drawLaserPointer]);

  useEffect(() => {
    return () => {
      if (laserLoopIdRef.current !== null) {
        cancelAnimationFrame(laserLoopIdRef.current);
      }
    };
  }, []);

  // Floating Placed Image handlers (Part B)
  const handleImageUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.src = dataUrl;
      img.onerror = () => {
        alert("Fehler beim Laden des Bildes.");
      };
      img.onload = () => {
        const canvas = canvasRef.current;
        const boardWidth = canvas?.width || 800;
        const boardHeight = canvas?.height || 600;

        // Ideal initial scaling inside safe viewport (Part B)
        let initW = img.width;
        let initH = img.height;
        const maxW = boardWidth * 0.45;
        const maxH = boardHeight * 0.45;

        if (initW > maxW || initH > maxH) {
          const ratio = Math.min(maxW / initW, maxH / initH);
          initW = Math.round(initW * ratio);
          initH = Math.round(initH * ratio);
        }

        setPlacedImage({
          src: dataUrl,
          imgObj: img,
          x: Math.round((boardWidth - initW) / 2),
          y: Math.round((boardHeight - initH) / 2),
          width: initW,
          height: initH,
          angle: 0,
        });
      };
    };
    reader.onerror = () => {
      alert("Fehler beim Einlesen der Bilddatei.");
    };
    reader.readAsDataURL(file);

    // Reset input for next selection
    if (e.target) {
      e.target.value = "";
    }
  };

  const commitPlacedImage = () => {
    if (!placedImage) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Snapshot state
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => [...prev.slice(-19), snapshot]);

    ctx.save();
    // Translation matrix for offset & potential rotation
    ctx.translate(
      placedImage.x + placedImage.width / 2,
      placedImage.y + placedImage.height / 2,
    );
    ctx.rotate((placedImage.angle * Math.PI) / 180);
    ctx.drawImage(
      placedImage.imgObj,
      -placedImage.width / 2,
      -placedImage.height / 2,
      placedImage.width,
      placedImage.height,
    );
    ctx.restore();

    // Snapshot state finished
    const finalSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack((prev) => {
      const base = prev.slice(0, -1);
      return [...base, finalSnapshot];
    });

    setPlacedImage(null);
  };

  // Load current lesson's weekly plan details (Part C)
  const getAktuelleStundeInfo = () => {
    try {
      const timeNow = new Date();
      const now = timeNow.getHours() * 60 + timeNow.getMinutes();

      // Standard Austrian Schulstunden timeslots
      const zeiten = [
        { start: 480, end: 530 }, // 1. 08:00 - 08:50
        { start: 530, end: 585 }, // 2. 08:50 - 09:45
        { start: 600, end: 650 }, // 3. 10:00 - 10:50
        { start: 650, end: 705 }, // 4. 10:50 - 11:45
        { start: 705, end: 750 }, // 5. 11:45 - 12:30
        { start: 810, end: 860 }, // 6. 13:30 - 14:20
        { start: 860, end: 910 }, // 7. 14:20 - 15:10
        { start: 910, end: 960 }, // 8. 15:10 - 16:00
      ];

      const unitIdx = zeiten.findIndex((z) => now >= z.start && now < z.end);
      const resolvedIdx = unitIdx !== -1 ? unitIdx : 0;

      const tagName = getTodayName(timeNow) || "Montag";
      const kw = getKW(timeNow);

      const wp = app.wochenplanung?.[kw]?.[tagName];
      const sp = app.stammplan?.[tagName];

      let hourData: any = null;
      if (wp?.[resolvedIdx]?.fach) {
        hourData = wp[resolvedIdx];
      } else if (sp?.[resolvedIdx]) {
        hourData =
          typeof sp[resolvedIdx] === "object"
            ? sp[resolvedIdx]
            : { fach: sp[resolvedIdx] };
      }

      const formattedDatum = timeNow.toLocaleDateString("de-AT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      if (hourData?.fach) {
        return {
          fach: hourData.fach,
          stundennummer: resolvedIdx + 1,
          thema: hourData.thema || hourData.inhalt || "Kein Thema eingetragen",
          datum: formattedDatum,
          exists: true,
        };
      }

      return {
        fach: "Freistunde",
        stundennummer: resolvedIdx + 1,
        thema: "Kein Eintrag im Wochenplan für diese Stunde",
        datum: formattedDatum,
        exists: false,
      };
    } catch (e) {
      console.error("Defensive check failed parsing Wochenplan data:", e);
      return {
        fach: "Freistunde",
        stundennummer: 1,
        thema: "Kein Eintrag im Wochenplan für diese Stunde",
        datum: new Date().toLocaleDateString("de-AT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        exists: false,
      };
    }
  };

  const handleOpenStundenInfo = () => {
    const info = getAktuelleStundeInfo();
    setStundenInfoData(info);
    setIsStundenInfoOpen(true);
  };

  const handleInsertStundenInfoText = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Auto center placement on canvas
    const cx = Math.round(canvas.width / 2);
    const cy = Math.round(canvas.height / 2);

    setTextInput({
      pxLeft: Math.round(canvas.clientWidth / 2 - 100),
      pxTop: Math.round(canvas.clientHeight / 2 - 20),
      canvasX: cx,
      canvasY: cy,
      val: text,
    });

    // Bring tool to text mode for easy custom modifications
    setWerkzeug("text");
    setIsStundenInfoOpen(false);
  };

  // Save Tafel image to Material Library (Part G)
  const handleSaveToMaterialLibrary = () => {
    const currentInfo = getAktuelleStundeInfo();
    setMaterialTitel(`Tafelbild ${currentInfo.fach || "Unterricht"}`);
    if (currentInfo.fach && currentInfo.fach !== "Freistunde") {
      setMaterialFach(currentInfo.fach);
    } else {
      setMaterialFach("Mathematik");
    }
    setIsMaterialLibraryDialogOpen(true);
  };

  const handleMaterialLibrarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = materialTitel.trim();
    if (!title) {
      alert("Bitte einen Namen für das Tafelbild angeben.");
      return;
    }

    const dataUrl = getExportDataUrl();
    if (!dataUrl) {
      alert("Tafelbild-Kompilierung fehlgeschlagen.");
      return;
    }

    // Append to Material Library under appState.materialien
    try {
      const parentList = app.materialien || [];
      const newID = "material-" + Date.now();
      const timestamp = new Date().toISOString();

      const newMaterial: MaterialItem = {
        id: newID,
        titel: title,
        beschreibung: `Exportiertes Tafelbild im Fach ${materialFach}`,
        typ: "sonstiges",
        dateiName: `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`,
        dateiTyp: "image/png",
        dateiInhalt: dataUrl, // Base64 data URL
        inhaltText: `Tafelzeichnung: ${title}`,
        faecher: [materialFach],
        schulstufen: [app.stufe || 1],
        tags: ["Tafel", "Skizze", "Export"],
        erstelltAm: timestamp,
        favorit: false,
        kiGeneriert: false,
      };

      const updatedMaterials = [newMaterial, ...parentList];

      setApp((prev) => ({
        ...prev,
        materialien: updatedMaterials,
      }));

      setIsMaterialLibraryDialogOpen(false);
      setMaterialSuccessToast(true);
      setTimeout(() => setMaterialSuccessToast(false), 3000);
    } catch (err) {
      console.error("Speichern in der Materialbibliothek fehlgeschlagen:", err);
      alert("Fehler beim Abspeichern in die Materialbibliothek.");
    }
  };

  // Autofocus the active text input perfectly
  useEffect(() => {
    if (textInput && inputRef.current) {
      const timeout = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [textInput]);

  // Auto-resize textarea when text content, font size, family or style updates (Fixes Live-Updates)
  useEffect(() => {
    if (textInput && inputRef.current) {
      const textarea = inputRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
      textarea.style.width = "auto";
      if (textarea.scrollWidth > 20) {
        textarea.style.width = `${textarea.scrollWidth + 15}px`;
      }
    }
  }, [textInput?.val, fontSize, fontFamily, fontWeight, fontStyle, textInput]);

  useEffect(() => {
    if (aktivesTextId) {
      setSeiten((prev) => {
        const arr = [...prev];
        const seite = { ...arr[aktiveSeiteIdx] };
        if (seite.textElemente) {
          seite.textElemente = seite.textElemente.map((t) =>
            t.id === aktivesTextId
              ? {
                  ...t,
                  fontSize,
                  fontFamily,
                  color: farbe,
                  fontWeight,
                  fontStyle,
                  textDecoration,
                  textAlign,
                }
              : t
          );
        }
        arr[aktiveSeiteIdx] = seite;
        return arr;
      });
    }
  }, [
    farbe,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    textDecoration,
    textAlign,
    aktivesTextId,
  ]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      const key = e.key.toLowerCase();
      if (key === "v") {
        setWerkzeug("maus");
      } else if (key === "t") {
        setWerkzeug("text");
      } else if (key === "p") {
        setWerkzeug("stift");
      } else if (key === "delete" || key === "backspace") {
        if (werkzeug === "maus" && aktivesTextId) {
          setSeiten((prev) => {
            const arr = [...prev];
            const seite = { ...arr[aktiveSeiteIdx] };
            if (seite.textElemente) {
              seite.textElemente = seite.textElemente.filter((t) => t.id !== aktivesTextId);
              arr[aktiveSeiteIdx] = seite;
            }
            return arr;
          });
          setAktivesTextId(null);
        }
      } else if (key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [werkzeug, aktivesTextId, aktiveSeiteIdx, undoStack]);

  return (
    <div
      className={`${isInline ? "w-full h-full relative rounded-2xl" : "absolute top-[100px] bottom-[96px] left-4 right-4 z-[450] rounded-3xl border border-slate-700/40 shadow-2xl"} flex flex-row text-white font-sans overflow-hidden select-none`}
      style={{ backgroundColor: hintergrundfarbe }}
    >
      {/* SIDEBAR TOOLBAR CONTROLS */}
      {/* Sidebar toggle floating handle when hidden */}
      {werkzeugeEingeklappt && (
        <button
          onClick={() => setWerkzeugeEingeklappt(false)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[460] w-6 h-14 bg-black/20 hover:bg-black/60 border-y border-r border-white/10 text-neutral-500 hover:text-white rounded-r-xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-md group"
          title="Werkzeuge einblenden"
        >
          <ChevronRight
            size={16}
            className="stroke-[3] group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      )}

      <AnimatePresence initial={false}>
        {!werkzeugeEingeklappt && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: -24 }}
            animate={{ width: 224, opacity: 1, x: 0 }} // w-56 is 224px
            exit={{ width: 0, opacity: 0, x: -24 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            onPointerDown={(e) => {
              if (textInput) {
                e.preventDefault();
              }
            }}
            className="h-full bg-slate-900 border-r border-white/10 flex flex-col shrink-0 z-20 relative overflow-hidden group/sidebar"
          >
            {/* Subtle Collapse Toggle Handle inside the sidebar edge */}
            <button
              onClick={() => setWerkzeugeEingeklappt(true)}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-50 w-6 h-14 bg-black/10 hover:bg-rose-500/80 border-y border-l border-transparent hover:border-rose-400/50 text-neutral-400 hover:text-white rounded-l-xl flex items-center justify-center cursor-pointer transition-all duration-300 shadow-sm opacity-0 group-hover/sidebar:opacity-100 group/btn"
              title="Werkzeuge ausblenden"
            >
              <ChevronLeft
                size={16}
                className="stroke-[3] group-hover/btn:-translate-x-0.5 transition-transform"
              />
            </button>

            {/* FULL EXPANSED SIDEBAR CONTROLS */}
            <div className="w-full h-full flex flex-col min-w-[224px]">
              <div className="p-3 border-b border-white/10 flex items-center justify-between shrink-0">
                <span className="font-bold text-xs uppercase tracking-widest text-emerald-400 flex flex-col">
                  <span className="text-[9px] text-white/40 leading-none mb-0.5">
                    Lehrer
                  </span>
                  <span>Digitale Tafel</span>
                </span>
                <button
                  onClick={() => setWerkzeugeEingeklappt(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/75 hover:text-white"
                  title="Werkzeuge ausblenden"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-4">
                {/* GROUP: WERKZEUGE */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1 select-none">
                    Werkzeuge
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => {
                        setWerkzeug("maus");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "maus"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <MousePointer2 size={15} />
                      <span>Maus</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("stift");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "stift"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <Pencil size={15} />
                      <span>Stift</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("text");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "text"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <Type size={15} />
                      <span>Text</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("form");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "form"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <Shapes size={15} />
                      <span>Formen</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("radierer");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "radierer"
                          ? "bg-emerald-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <Eraser size={15} />
                      <span>Radierer</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("laser");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "laser"
                          ? "bg-red-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <MousePointer2 size={15} />
                      <span className="truncate w-full text-center">Laser</span>
                    </button>

                    <button
                      onClick={() => {
                        setWerkzeug("stempel");
                        commitText();
                      }}
                      className={`p-1.5 rounded-xl flex flex-col items-center gap-1 text-[10px] font-semibold transition-all ${
                        werkzeug === "stempel"
                          ? "bg-blue-600 text-white shadow-md"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                    >
                      <Sticker size={15} />
                      <span>Stempel</span>
                    </button>
                  </div>
                </div> {/* Closes WERKZEUGE group */}

                {/* GROUP: EIGENSCHAFTEN (Unified & Highly Polished Properties Panel) */}
                  <div className="flex flex-col gap-2.5 bg-slate-950/45 p-2 rounded-2xl border border-white/5 mt-1">
                    <div className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.18em] px-1 select-none flex items-center gap-1.5">
                      <Sparkles size={11} className="text-emerald-400 animate-pulse" />
                      <span>Werkzeugeinstellungen</span>
                    </div>

                    {/* DYNAMIC FORM/PENCIL PROPERTIES */}
                    {werkzeug === "stift" && (
                      <div className="flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
                        {/* Stift-Art Selection */}
                        <div className="flex flex-col gap-1 bg-black/20 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Stift-Art</span>
                          <div className="grid grid-cols-2 gap-1 mt-0.5">
                            {[
                              { id: "normal", name: "Bleistift", icon: Pencil },
                              { id: "textmarker", name: "Textmarker", icon: Highlighter },
                              { id: "kalligrafie", name: "Schönschrift", icon: PenTool },
                              { id: "zauberstift", name: "Zauberstift", icon: Wand2, title: "Formerkennung" },
                            ].map((s) => {
                              const Icon = s.icon;
                              const isSelected = stiftTyp === s.id;
                              return (
                                <button
                                  key={s.id}
                                  onClick={() => setStiftTyp(s.id as any)}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all border text-[10px] font-semibold ${
                                    isSelected
                                      ? "bg-emerald-600 border-emerald-500 text-white shadow-md shadow-emerald-600/10"
                                      : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                                  }`}
                                  title={s.title || s.name}
                                >
                                  <Icon size={12} className="shrink-0" />
                                  <span className="truncate">{s.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Strichstärke controls with preview */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5 text-white">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider">
                            <span>Strichstärke</span>
                            <span className="font-mono text-emerald-400 font-bold">{dicke}px</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button
                              onClick={() => setDicke((d) => Math.max(1, d - 1))}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Dünner (-1px)"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="range"
                              min="1"
                              max="60"
                              value={dicke}
                              onChange={(e) => setDicke(Number(e.target.value))}
                              className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                            />
                            <button
                              onClick={() => setDicke((d) => Math.min(60, d + 1))}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Dicker (+1px)"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          {/* Live Stroke Preview Container */}
                          <div className="flex flex-col items-center justify-center h-10 bg-black/40 rounded-lg border border-white/5 overflow-hidden mt-1 select-none">
                            <svg className="w-full h-full" viewBox="0 0 160 30">
                              <path
                                d="M 15 15 Q 45 4, 80 15 T 145 15"
                                fill="none"
                                stroke={farbe}
                                strokeWidth={Math.min(dicke, 22)}
                                strokeLinecap="round"
                                opacity={stiftTyp === "textmarker" ? 0.45 : 1}
                              />
                            </svg>
                          </div>
                        </div>

                        {/* Color selection */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                            <span>Farbe wählen</span>
                            <span className="font-mono text-emerald-400 font-semibold">{farbe}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-1 mt-0.5">
                            {[
                              { value: "#000000", name: "Schwarz" },
                              { value: "#ffffff", name: "Weiß" },
                              { value: "#ef4444", name: "Rot" },
                              { value: "#3b82f6", name: "Blau" },
                              { value: "#10b981", name: "Grün" },
                              { value: "#eab308", name: "Gelb" },
                              { value: "#f97316", name: "Orange" },
                              { value: "#8b5cf6", name: "Violett" },
                              { value: "#ec4899", name: "Pink" },
                              { value: "#06b6d4", name: "Türkis" },
                              { value: "#78350f", name: "Braun" },
                              { value: "#4b5563", name: "Grau" },
                            ].map((f) => (
                              <button
                                key={f.value}
                                onClick={() => {
                                  if (aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: f.value });
                                  } else {
                                    setFarbe(f.value);
                                  }
                                }}
                                className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                  farbe.toLowerCase() === f.value.toLowerCase()
                                    ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                    : "hover:scale-110"
                                }`}
                                style={{ backgroundColor: f.value }}
                                title={f.name}
                              >
                                {farbe.toLowerCase() === f.value.toLowerCase() && (
                                  <div className={`w-1 h-1 rounded-full ${f.value === "#ffffff" ? "bg-black" : "bg-white"}`} />
                                )}
                              </button>
                            ))}
                            
                            {/* Custom Color Picker Button */}
                            <button
                              onClick={() => colorPickerRef.current?.click()}
                              className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                  : "hover:scale-110"
                              }`}
                              style={{
                                background: !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? farbe 
                                  : "conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)"
                              }}
                              title="Eigene Farbe wählen..."
                            >
                              <input
                                ref={colorPickerRef}
                                type="color"
                                value={farbe}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: val });
                                  } else {
                                    setFarbe(val);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                              />
                              {!["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase()) && (
                                <div className="w-1 h-1 rounded-full bg-white mix-blend-difference" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {werkzeug === "form" && (
                      <div className="flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
                        {/* Form selection */}
                        <div className="flex flex-col gap-1 bg-black/20 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Form wählen</span>
                          <div className="grid grid-cols-2 gap-1 mt-0.5">
                            {[
                              { id: "rechteck", name: "Rechteck", icon: Square },
                              { id: "kreis", name: "Kreis", icon: Circle },
                              { id: "pfeil", name: "Pfeil", icon: ArrowUpRight },
                              { id: "linie", name: "Linie", icon: Minus, className: "rotate-45" },
                            ].map((f) => {
                              const Icon = f.icon;
                              const isSelected = aktiveForm === f.id;
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => setAktiveForm(f.id as any)}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all border text-[10px] font-semibold ${
                                    isSelected
                                      ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/10"
                                      : "bg-white/5 border-transparent text-white/60 hover:bg-white/10 hover:text-white"
                                  }`}
                                >
                                  <Icon size={12} className={`shrink-0 ${f.className || ""}`} />
                                  <span>{f.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Form stroke width controls */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5 text-white">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider">
                            <span>Umrissstärke</span>
                            <span className="font-mono text-blue-400 font-bold">{dicke}px</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button
                              onClick={() => setDicke((d) => Math.max(1, d - 1))}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Dünner (-1px)"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="range"
                              min="1"
                              max="60"
                              value={dicke}
                              onChange={(e) => setDicke(Number(e.target.value))}
                              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                            />
                            <button
                              onClick={() => setDicke((d) => Math.min(60, d + 1))}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Dicker (+1px)"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          {/* Live Form Stroke Preview Container */}
                          <div className="flex items-center justify-center h-10 bg-black/40 rounded-lg border border-white/5 overflow-hidden mt-1 select-none">
                            <div 
                              className="border-dashed"
                              style={{
                                width: "35px",
                                height: "20px",
                                border: `${Math.min(dicke, 10)}px solid ${farbe}`,
                                borderRadius: aktiveForm === "kreis" ? "50%" : "2px",
                              }}
                            />
                          </div>
                        </div>

                        {/* Color selection */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                            <span>Farbe wählen</span>
                            <span className="font-mono text-emerald-400 font-semibold">{farbe}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-1 mt-0.5">
                            {[
                              { value: "#000000", name: "Schwarz" },
                              { value: "#ffffff", name: "Weiß" },
                              { value: "#ef4444", name: "Rot" },
                              { value: "#3b82f6", name: "Blau" },
                              { value: "#10b981", name: "Grün" },
                              { value: "#eab308", name: "Gelb" },
                              { value: "#f97316", name: "Orange" },
                              { value: "#8b5cf6", name: "Violett" },
                              { value: "#ec4899", name: "Pink" },
                              { value: "#06b6d4", name: "Türkis" },
                              { value: "#78350f", name: "Braun" },
                              { value: "#4b5563", name: "Grau" },
                            ].map((f) => (
                              <button
                                key={f.value}
                                onClick={() => {
                                  if (aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: f.value });
                                  } else {
                                    setFarbe(f.value);
                                  }
                                }}
                                className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                  farbe.toLowerCase() === f.value.toLowerCase()
                                    ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                    : "hover:scale-110"
                                }`}
                                style={{ backgroundColor: f.value }}
                                title={f.name}
                              >
                                {farbe.toLowerCase() === f.value.toLowerCase() && (
                                  <div className={`w-1 h-1 rounded-full ${f.value === "#ffffff" ? "bg-black" : "bg-white"}`} />
                                )}
                              </button>
                            ))}
                            
                            {/* Custom Color Picker Button */}
                            <button
                              onClick={() => colorPickerRef.current?.click()}
                              className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                  : "hover:scale-110"
                              }`}
                              style={{
                                background: !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? farbe 
                                  : "conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)"
                              }}
                              title="Eigene Farbe wählen..."
                            >
                              <input
                                ref={colorPickerRef}
                                type="color"
                                value={farbe}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: val });
                                  } else {
                                    setFarbe(val);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                              />
                              {!["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase()) && (
                                <div className="w-1 h-1 rounded-full bg-white mix-blend-difference" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC TEXT PROPERTIES */}
                    {(werkzeug === "text" || aktivesTextId !== null) && (
                      <div className="flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
                        {/* Font size picker */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5 text-white">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider">
                            <span>Schriftgröße</span>
                            <span className="font-mono text-blue-400 font-bold">{fontSize}px</span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <button
                              onClick={() => updateActiveTextFormatting({ fontSize: Math.max(8, fontSize - 2) })}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Verkleinern (-2px)"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="8"
                              max="200"
                              value={fontSize || ""}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!isNaN(val)) updateActiveTextFormatting({ fontSize: Math.max(8, Math.min(200, val)) });
                              }}
                              className="w-11 h-7 bg-black/40 border border-white/20 rounded-lg text-white text-[10px] font-semibold text-center font-mono focus:border-blue-500 outline-none"
                            />
                            <input
                              type="range"
                              min="8"
                              max="200"
                              value={fontSize}
                              onChange={(e) => updateActiveTextFormatting({ fontSize: Number(e.target.value) })}
                              className="flex-1 accent-blue-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
                            />
                            <button
                              onClick={() => updateActiveTextFormatting({ fontSize: Math.min(200, fontSize + 2) })}
                              className="w-7 h-7 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors border border-white/5"
                              title="Vergrößern (+2px)"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          {/* Quick Sizes */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[16, 20, 24, 28, 32, 40, 48, 64, 80, 100].map((num) => (
                              <button
                                key={`size-btn-${num}`}
                                onClick={() => updateActiveTextFormatting({ fontSize: num })}
                                className={`flex-1 text-center py-0.5 text-[9px] font-mono rounded transition-colors ${
                                  fontSize === num
                                    ? "bg-blue-600 border border-blue-500 text-white font-bold"
                                    : "bg-white/5 hover:bg-white/10 text-white/50 border border-transparent"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Font selection with beautiful live previews */}
                        <div className="flex flex-col gap-1 bg-black/20 p-2 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Schriftart</span>
                          <div className="grid grid-cols-2 gap-1 mt-0.5 max-h-[190px] overflow-y-auto scrollbar-thin pr-0.5">
                            {TAFEL_FONTS.map((option) => (
                              <button
                                key={option.val}
                                onClick={() => updateActiveTextFormatting({ fontFamily: option.val })}
                                className={`text-left p-1.5 rounded-lg transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  fontFamily === option.val
                                    ? "bg-blue-600 border-blue-500 text-white font-bold shadow-md shadow-blue-500/15"
                                    : "bg-white/5 border-transparent text-white/80 hover:bg-white/10"
                                }`}
                              >
                                <span 
                                  style={{ fontFamily: option.val }}
                                  className={`w-5 h-5 rounded bg-black/30 flex items-center justify-center font-bold shrink-0 text-[10px] ${
                                    fontFamily === option.val ? "text-white" : "text-emerald-400"
                                  }`}
                                >
                                  {option.preview}
                                </span>
                                <span className="text-[9px] truncate leading-tight">{option.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Style and alignment combined row */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Stil & Ausrichtung</span>
                          <div className="flex gap-1.5 mt-0.5">
                            {/* Text style button group */}
                            <div className="flex flex-1 bg-black/30 p-0.5 rounded-lg gap-0.5 border border-white/5">
                              <button
                                onClick={() => updateActiveTextFormatting({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${fontWeight === "bold" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Fett"
                              >
                                <Bold size={13} />
                              </button>
                              <button
                                onClick={() => updateActiveTextFormatting({ fontStyle: fontStyle === "italic" ? "normal" : "italic" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${fontStyle === "italic" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Kursiv"
                              >
                                <Italic size={13} />
                              </button>
                              <button
                                onClick={() => updateActiveTextFormatting({ textDecoration: textDecoration === "underline" ? "none" : "underline" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${textDecoration === "underline" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Unterstrichen"
                              >
                                <Underline size={13} />
                              </button>
                            </div>

                            {/* Text align button group */}
                            <div className="flex flex-1 bg-black/30 p-0.5 rounded-lg gap-0.5 border border-white/5">
                              <button
                                onClick={() => updateActiveTextFormatting({ textAlign: "left" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${textAlign === "left" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Linksbündig"
                              >
                                <AlignLeft size={13} />
                              </button>
                              <button
                                onClick={() => updateActiveTextFormatting({ textAlign: "center" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${textAlign === "center" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Zentriert"
                              >
                                <AlignCenter size={13} />
                              </button>
                              <button
                                onClick={() => updateActiveTextFormatting({ textAlign: "right" })}
                                className={`flex-1 flex justify-center py-1 rounded transition-all ${textAlign === "right" ? "bg-blue-600 text-white shadow-sm" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                                title="Rechtsbündig"
                              >
                                <AlignRight size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Color selection */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <div className="flex justify-between items-center text-[9px] font-bold text-white/50 uppercase tracking-wider mb-0.5">
                            <span>Farbe wählen</span>
                            <span className="font-mono text-emerald-400 font-semibold">{farbe}</span>
                          </div>
                          <div className="grid grid-cols-6 gap-1 mt-0.5">
                            {[
                              { value: "#000000", name: "Schwarz" },
                              { value: "#ffffff", name: "Weiß" },
                              { value: "#ef4444", name: "Rot" },
                              { value: "#3b82f6", name: "Blau" },
                              { value: "#10b981", name: "Grün" },
                              { value: "#eab308", name: "Gelb" },
                              { value: "#f97316", name: "Orange" },
                              { value: "#8b5cf6", name: "Violett" },
                              { value: "#ec4899", name: "Pink" },
                              { value: "#06b6d4", name: "Türkis" },
                              { value: "#78350f", name: "Braun" },
                              { value: "#4b5563", name: "Grau" },
                            ].map((f) => (
                              <button
                                key={f.value}
                                onClick={() => {
                                  if (werkzeug === "text" || aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: f.value });
                                  } else {
                                    setFarbe(f.value);
                                  }
                                }}
                                className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                  farbe.toLowerCase() === f.value.toLowerCase()
                                    ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                    : "hover:scale-110"
                                }`}
                                style={{ backgroundColor: f.value }}
                                title={f.name}
                              >
                                {farbe.toLowerCase() === f.value.toLowerCase() && (
                                  <div className={`w-1 h-1 rounded-full ${f.value === "#ffffff" ? "bg-black" : "bg-white"}`} />
                                )}
                              </button>
                            ))}
                            
                            {/* Custom Color Picker Button */}
                            <button
                              onClick={() => colorPickerRef.current?.click()}
                              className={`w-full aspect-square rounded-full border border-white/10 flex items-center justify-center transition-all relative ${
                                !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? "ring-2 ring-emerald-500 scale-110 shadow-lg"
                                  : "hover:scale-110"
                              }`}
                              style={{
                                background: !["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase())
                                  ? farbe 
                                  : "conic-gradient(from 0deg, red, yellow, green, cyan, blue, magenta, red)"
                              }}
                              title="Eigene Farbe wählen..."
                            >
                              <input
                                ref={colorPickerRef}
                                type="color"
                                value={farbe}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (werkzeug === "text" || aktivesTextId !== null) {
                                    updateActiveTextFormatting({ color: val });
                                  } else {
                                    setFarbe(val);
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full pointer-events-auto"
                              />
                              {!["#000000", "#ffffff", "#ef4444", "#3b82f6", "#10b981", "#eab308", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4", "#78350f", "#4b5563"].includes(farbe.toLowerCase()) && (
                                <div className="w-1 h-1 rounded-full bg-white mix-blend-difference" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC STEMPEL PROPERTIES */}
                    {werkzeug === "stempel" && (
                      <div className="flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
                        {/* Stamp size */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Stempelgröße</span>
                          <div className="flex gap-1 mt-0.5">
                            {[32, 48, 72].map((s) => (
                              <button
                                key={`st-${s}`}
                                onClick={() => setStempelGroesse(s as any)}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all border ${stempelGroesse === s ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/10" : "bg-white/5 border-transparent text-white/55 hover:bg-white/10"}`}
                              >
                                {s === 32 ? "Klein" : s === 48 ? "Mittel" : "Groß"}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Stamp picker */}
                        <div className="flex flex-col gap-1.5 bg-black/20 p-2.5 rounded-xl border border-white/5">
                          <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">Stempel-Motiv</span>
                          <div className="grid grid-cols-5 gap-1.5 p-1.5 bg-black/30 rounded-lg mt-0.5">
                            {stempelEmojis.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => setAktiverStempel(emoji)}
                                className={`text-xl hover:scale-120 active:scale-90 transition-transform p-1 rounded-lg flex justify-center items-center ${aktiverStempel === emoji ? "bg-white/25 shadow-inner" : "hover:bg-white/5"}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DYNAMIC RADIERER PROPERTIES */}
                    {werkzeug === "radierer" && (
                      <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5 text-white/60 text-[10px] leading-relaxed select-none animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400 uppercase text-[9px] tracking-wider mb-0.5">
                          <Eraser size={11} /> Radierer aktiv
                        </div>
                        <p>Klicke oder ziehe über gezeichnete Linien, Formen oder Textfelder auf der Tafel, um sie sofort zu löschen.</p>
                      </div>
                    )}

                    {/* DYNAMIC LASER PROPERTIES */}
                    {werkzeug === "laser" && (
                      <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5 text-white/60 text-[10px] leading-relaxed select-none animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-red-400 uppercase text-[9px] tracking-wider mb-0.5">
                          <MousePointer2 size={11} className="rotate-45" /> Laserpointer aktiv
                        </div>
                        <p>Bewege den Zeiger oder zeichne temporäre Linien. Sie leuchten hell auf und verblassen nach wenigen Sekunden automatisch.</p>
                      </div>
                    )}

                    {/* DYNAMIC MAUS PROPERTIES */}
                    {werkzeug === "maus" && !aktivesTextId && (
                      <div className="flex flex-col gap-2 bg-black/20 p-3 rounded-xl border border-white/5 text-white/60 text-[10px] leading-relaxed select-none animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 font-bold text-blue-400 uppercase text-[9px] tracking-wider mb-0.5">
                          <MousePointer2 size={11} /> Auswahlmodus
                        </div>
                        <p>Klicke auf ein platziertes Bild oder ein Textfeld, um es auszuwählen, zu bewegen, zu formatieren oder zu entfernen.</p>
                      </div>
                    )}
                  </div>

                {/* GROUP: HINTERGRUND */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1 select-none">
                    Hintergrund
                  </div>
                  <div className="flex gap-1.5 bg-black/30 p-2 rounded-xl">
                    {["#ffffff", "#1a3a2a", "#000000"].map((bg) => (
                      <button
                        key={bg}
                        onClick={() => handleBackgroundChange(bg)}
                        className={`flex-1 h-6 rounded border ${hintergrundfarbe === bg ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-white/20"}`}
                        style={{ backgroundColor: bg }}
                        title={
                          bg === "#ffffff"
                            ? "Weiß"
                            : bg === "#1a3a2a"
                              ? "Tafelgrün"
                              : "Schwarz"
                        }
                      />
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5 bg-black/30 p-2 rounded-xl">
                    <span className="text-[10px] text-white/50 font-bold">
                      Tafel-Hintergrund & Muster:
                    </span>
                    <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {[
                        { id: "blanko", label: "Blanko", icon: "⬜" },
                        { id: "liniert", label: "Liniert", icon: "📄" },
                        { id: "kariert", label: "Kariert", icon: "🔲" },
                        { id: "haeuschen", label: "Häuschen", icon: "🏠" },
                        { id: "punktraster", label: "Punktraster", icon: "🟣" },
                        { id: "notenzeilen", label: "Notenzeilen", icon: "🎼" },
                        { id: "koordinaten", label: "Koordinaten", icon: "📐" },
                        { id: "isometrisch", label: "Isometrisch", icon: "🧊" },
                        { id: "waben", label: "Waben / Chemie", icon: "⬡" },
                        { id: "ttabelle", label: "2 Spalten", icon: "⚖️" },
                        { id: "drespalten", label: "3 Spalten", icon: "📊" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setMuster(item.id)}
                          className={`text-[10px] py-1.5 px-2 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                            muster === item.id 
                              ? "bg-blue-600 text-white font-bold shadow-xs" 
                              : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                          }`}
                        >
                          <span className="text-[11px]">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                        </button>
                      ))}
                    </div>

                    {muster !== "blanko" && (
                      <div className="flex flex-col gap-1 mt-1 text-white/50 text-[10px] font-bold">
                        <span className="flex justify-between">
                          <span>Größe</span>
                          <span>{Math.round((musterGroesse / 30) * 100)}%</span>
                        </span>
                        <input
                          type="range"
                          min="15"
                          max="60"
                          value={musterGroesse}
                          onChange={(e) =>
                            setMusterGroesse(Number(e.target.value))
                          }
                          className="w-full accent-blue-500"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => setGeteilt(!geteilt)}
                      className={`mt-1 py-1.5 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold transition-colors ${
                        geteilt
                          ? "bg-amber-500 text-amber-950"
                          : "bg-white/10 text-white/60 hover:bg-white/20"
                      }`}
                    >
                      <Columns2 size={12} />
                      Tafel teilen
                    </button>
                  </div>
                </div>

                {/* GROUP: EXTRAS */}
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest px-1 select-none">
                    Hilfsmittel
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => setIsLinealSichtbar(!isLinealSichtbar)}
                      className={`p-1.5 rounded-xl flex items-center justify-center gap-1 text-[10px] font-semibold transition-all ${
                        isLinealSichtbar
                          ? "bg-amber-500 text-amber-950"
                          : "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white hover:border-slate-500"
                      }`}
                      title="Lineal an/aus"
                    >
                      <Ruler size={13} /> Lineal
                    </button>
                    <button
                      onClick={handleImageUploadClick}
                      className="p-1.5 rounded-xl bg-black/30 text-white/60 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1 text-[10px] font-semibold transition-all"
                    >
                      <ImagePlus size={13} /> Bild
                    </button>
                    <button
                      onClick={handleOpenStundenInfo}
                      className="p-1.5 rounded-xl bg-black/30 text-white/60 hover:text-white hover:bg-white/10 flex flex-col items-center gap-0.5 justify-center font-semibold transition-all col-span-2 text-[10px]"
                      title="Stundeninfo/Thema einblenden"
                    >
                      <div className="flex items-center gap-1">
                        <CalendarDays size={13} /> Stundeninfo
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* ACTIONS / FOOTER SIDEBAR */}
              <div className="p-3 border-t border-white/10 bg-slate-900/80 shrink-0 flex flex-col gap-2 z-10 shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
                <div className="flex justify-between gap-1">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length <= 1}
                    className="flex-1 p-1.5 rounded disabled:opacity-30 hover:bg-white/10 flex items-center justify-center"
                    title="Rückgängig"
                  >
                    <Undo2 size={16} />
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 p-1.5 rounded hover:bg-red-500/20 text-red-400 flex items-center justify-center"
                    title="Alles löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => setIsSaveDialogOpen(true)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 flex items-center justify-center gap-1 text-[10px] font-bold"
                  >
                    <Save size={13} /> Vorlage
                  </button>
                  <button
                    onClick={() => setIsTemplatesOpen(true)}
                    className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white text-slate-300 flex items-center justify-center gap-1 text-[10px] font-bold"
                  >
                    <FolderOpen size={13} /> Laden
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleSave}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-[10px]"
                    title="Export"
                  >
                    <Download size={13} />
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 flex items-center justify-center text-[10px]"
                    title="Drucken"
                  >
                    <Printer size={13} />
                  </button>
                </div>
                <button
                  onClick={handleSaveToMaterialLibrary}
                  className="w-full mt-1 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Sparkles size={12} className="text-indigo-200" />
                  In Materialien sichern
                </button>
              </div>
              {/* Close Button Full View */}
              {!isInline && (
                <div className="px-3 pb-3 shrink-0">
                  <button
                    onClick={handleCloseAttempt}
                    className="w-full flex items-center justify-center gap-2 p-2 rounded-xl bg-slate-800 hover:bg-red-500 hover:text-white transition-colors text-xs font-bold text-slate-300"
                  >
                    <X size={15} /> Schließen
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SIDE: CANVAS AREA */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {/* MULTIPLE PAGES PAGINATION */}
        <div className="absolute top-4 right-4 flex justify-end items-start gap-3 pointer-events-none z-50">
          <div className="pointer-events-auto bg-slate-900/40 hover:bg-slate-900/70 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-3 shadow-lg border border-white/10 transition-colors">
            <button
              onClick={() => handleSwitchSeite(aktiveSeiteIdx - 1)}
              disabled={aktiveSeiteIdx === 0}
              className="disabled:opacity-30 hover:scale-110 text-white transition-transform active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-widest tabular-nums">
              <span className="opacity-60 text-[10px]">S.</span>
              {aktiveSeiteIdx + 1}
              <span className="opacity-40 font-normal">/</span>
              <span className="opacity-80">{seiten.length}</span>
            </div>

            {aktiveSeiteIdx === seiten.length - 1 ? (
              <button
                onClick={handleAddSeite}
                disabled={seiten.length >= 10}
                className="disabled:opacity-30 hover:scale-110 text-emerald-400 transition-transform active:scale-95"
                title="Neue Seite anlegen"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            ) : (
              <button
                onClick={() => handleSwitchSeite(aktiveSeiteIdx + 1)}
                className="hover:scale-110 text-white transition-transform active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            )}

            {seiten.length > 1 && (
              <>
                <div className="w-px h-3 bg-white/30" />
                <button
                  onClick={handleDeleteSeite}
                  className="hover:text-red-400 transition-colors"
                  title="Aktuelle Seite löschen"
                >
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </div>
          <button
            onClick={() => setShowShortcutsInfo(true)}
            className="z-50 p-2 rounded-full bg-slate-900/40 hover:bg-slate-900/70 backdrop-blur-md shadow-lg border border-white/10 text-white/70 hover:text-white transition-all cursor-pointer pointer-events-auto"
            title="Tastenkürzel & Hilfe"
          >
            <HelpCircle size={18} />
          </button>
        </div>

        {/* CANVAS CONTAINER */}
        <div
          ref={containerRef}
          className={`flex-1 w-full h-full relative overflow-hidden touch-none tafel-canvas-stage ${werkzeug === "maus" ? "cursor-default" : "cursor-crosshair"}`}
          onMouseDown={startZeichnen}
          onMouseMove={(e) => {
            weiterZeichnen(e);
            handleLaserMouseMove(e);
          }}
          onMouseUp={stopZeichnen}
          onMouseLeave={() => {
            stopZeichnen();
            handleLaserMouseLeave();
          }}
          onTouchStart={startZeichnen}
          onTouchMove={(e) => {
            weiterZeichnen(e);
            handleLaserMouseMove(e);
          }}
          onTouchEnd={stopZeichnen}
          onTouchCancel={() => {
            stopZeichnen();
            handleLaserMouseLeave();
          }}
        >
          <canvas
            ref={patternCanvasRef}
            className="absolute inset-0 pointer-events-none z-0"
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-10 touch-none"
          />
          <canvas
            ref={laserCanvasRef}
            className="absolute inset-0 pointer-events-none z-20"
          />

          {/* TEXT OVERLAYS */}
          {seiten[aktiveSeiteIdx]?.textElemente?.map((t) => {
            if (t.id === aktivesTextId && textInput) return null; // hide only while the textarea is visible
            
            // Convert canvas coordinates to DOM coordinates for rendering
            const cWidth = canvasRef.current?.width || 1000;
            const rWidth = canvasRef.current?.getBoundingClientRect().width || 1000;
            const cHeight = canvasRef.current?.height || 1000;
            const rHeight = canvasRef.current?.getBoundingClientRect().height || 1000;
            
            const pxLeft = t.x / (cWidth / rWidth);
            const pxTop = t.y / (cHeight / rHeight);

            return (
              <div
                key={t.id}
                className={`absolute z-40 group ${aktivesTextId === t.id && werkzeug === "maus" ? "outline outline-1 outline-blue-500/50 bg-blue-500/10" : "hover:outline hover:outline-1 hover:outline-emerald-500/50 hover:bg-emerald-500/5"}`}
                style={{
                  left: `${pxLeft}px`,
                  top: `${pxTop}px`,
                  fontFamily: t.fontFamily,
                  fontSize: `${t.fontSize}px`,
                  fontWeight: t.fontWeight,
                  fontStyle: t.fontStyle,
                  textDecoration: t.textDecoration,
                  color: t.color,
                  lineHeight: `${getLineHeightForMuster(muster, musterGroesse, t.fontSize, t.alignToLines ?? true)}px`,
                  textAlign: t.textAlign,
                }}
              >
                {/* Drag Handle */}
                {werkzeug === "maus" && (
                  <div
                    className="absolute -top-7 left-1/2 -translate-x-1/2 p-1 bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-move shadow-md pointer-events-auto z-50"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setAktivesTextId(t.id);
                      
                      const rect = canvasRef.current?.getBoundingClientRect();
                      if (!rect) return;
                      const cWidth = canvasRef.current?.width || 1000;
                      const rWidth = rect.width || 1000;
                      const cHeight = canvasRef.current?.height || 1000;
                      const rHeight = rect.height || 1000;

                      const startX = e.clientX;
                      const startY = e.clientY;
                      const origX = t.x;
                      const origY = t.y;

                      const onMove = (ev: PointerEvent) => {
                        const dx = ev.clientX - startX;
                        const dy = ev.clientY - startY;
                        const newCanvasX = origX + dx * (cWidth / rWidth);
                        const newCanvasY = origY + dy * (cHeight / rHeight);

                        setSeiten((prev) => {
                          const arr = [...prev];
                          const seite = { ...arr[aktiveSeiteIdx] };
                          if (seite.textElemente) {
                            seite.textElemente = seite.textElemente.map((_t) =>
                              _t.id === t.id ? { ..._t, x: newCanvasX, y: newCanvasY } : _t
                            );
                          }
                          arr[aktiveSeiteIdx] = seite;
                          return arr;
                        });
                      };

                      const onUp = () => {
                        window.removeEventListener("pointermove", onMove);
                        window.removeEventListener("pointerup", onUp);
                      };
                      window.addEventListener("pointermove", onMove);
                      window.addEventListener("pointerup", onUp);
                    }}
                  >
                    <GripHorizontal size={14} />
                  </div>
                )}
                
                {/* Text Content */}
                <div
                  className={`break-words whitespace-pre-wrap p-0 m-0 w-full h-full ${(werkzeug === "maus" || werkzeug === "text") ? "cursor-text" : ""}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (werkzeug === "radierer") {
                      setSeiten((prev) => {
                        const arr = [...prev];
                        const seite = { ...arr[aktiveSeiteIdx] };
                        if (seite.textElemente) {
                          seite.textElemente = seite.textElemente.filter((_t) => _t.id !== t.id);
                          arr[aktiveSeiteIdx] = seite;
                        }
                        return arr;
                      });
                      return;
                    }
                    if (werkzeug === "text") {
                      setAktivesTextId(t.id);
                      setFontSize(t.fontSize);
                      setFontFamily(t.fontFamily);
                      setFontWeight(t.fontWeight);
                      setFontStyle(t.fontStyle);
                      setTextDecoration(t.textDecoration);
                      setTextAlign(t.textAlign);
                      setFarbe(t.color);
                      setTextInput({
                        pxLeft,
                        pxTop,
                        canvasX: t.x,
                        canvasY: t.y,
                        val: t.text
                      });
                    } else if (werkzeug === "maus") {
                      // Single-click selects it so it can be dragged, deleted or styled without opening text editing typing keyboard
                      setAktivesTextId(t.id);
                      setFontSize(t.fontSize);
                      setFontFamily(t.fontFamily);
                      setFontWeight(t.fontWeight);
                      setFontStyle(t.fontStyle);
                      setTextDecoration(t.textDecoration);
                      setTextAlign(t.textAlign);
                      setFarbe(t.color);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (werkzeug === "maus") {
                      setAktivesTextId(t.id);
                      setFontSize(t.fontSize);
                      setFontFamily(t.fontFamily);
                      setFontWeight(t.fontWeight);
                      setFontStyle(t.fontStyle);
                      setTextDecoration(t.textDecoration);
                      setTextAlign(t.textAlign);
                      setFarbe(t.color);
                      setTextInput({
                        pxLeft,
                        pxTop,
                        canvasX: t.x,
                        canvasY: t.y,
                        val: t.text
                      });
                      setWerkzeug("text");
                    }
                  }}
                >
                  <div className="whitespace-pre-wrap leading-[1.2] min-w-[20px] min-h-[1.5em] break-words pointer-events-none text-inherit">
                    {t.text}
                  </div>
                </div>
              </div>
            );
          })}

          {(() => {
            const activeTextForToolbar = aktivesTextId ? seiten[aktiveSeiteIdx]?.textElemente?.find(t => t.id === aktivesTextId) : null;
            const showInlineToolbar = textInput !== null || ((werkzeug === "maus" || werkzeug === "text") && activeTextForToolbar);
            if (!showInlineToolbar) return null;
            
            let toolbarPxLeft = 0;
            let toolbarPxTop = 0;
            if (textInput) {
              toolbarPxLeft = textInput.pxLeft;
              toolbarPxTop = textInput.pxTop;
            } else if (activeTextForToolbar) {
              const cWidth = canvasRef.current?.width || 1000;
              const rWidth = canvasRef.current?.getBoundingClientRect().width || 1000;
              const cHeight = canvasRef.current?.height || 1000;
              const rHeight = canvasRef.current?.getBoundingClientRect().height || 1000;
              toolbarPxLeft = activeTextForToolbar.x / (cWidth / rWidth);
              toolbarPxTop = activeTextForToolbar.y / (cHeight / rHeight);
            }

            // Smart top offset: if near top edge of canvas, render toolbar below text element so it is always visible
            const textHeight = activeTextForToolbar ? activeTextForToolbar.fontSize * 1.4 : 45;
            const smartToolbarTop = toolbarPxTop < 75 
              ? (toolbarPxTop + textHeight + 15) 
              : (toolbarPxTop - 62);

            return (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onPointerUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="absolute z-[60] flex flex-col gap-3.5 bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 shadow-2xl w-56 animate-in fade-in zoom-in-95 duration-200"
                style={{
                  left: `${Math.max(10, toolbarPxLeft)}px`,
                  top: `${smartToolbarTop}px`,
                }}
              >
                {/* 1. Schriftart (Custom Dropdown) */}
                <div className="flex flex-col gap-1.5 relative">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Schriftart</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowFontDropdown(!showFontDropdown)}
                      className="w-full bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 text-zinc-100 text-xs px-3 py-2 rounded-xl flex items-center justify-between transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 cursor-pointer text-left"
                    >
                      <span className="truncate" style={{ fontFamily: fontFamily }}>
                        {TAFEL_FONTS.find(f => f.val === fontFamily)?.name || "Standard (Modern)"}
                      </span>
                      <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 shrink-0 ${showFontDropdown ? "rotate-180 text-blue-400" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showFontDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto scrollbar-thin z-[100] p-1.5 flex flex-col gap-0.5"
                        >
                          {TAFEL_FONTS.map((font) => (
                            <button
                              key={`inline-font-${font.val}`}
                              type="button"
                              onClick={() => {
                                updateActiveTextFormatting({ fontFamily: font.val });
                                setShowFontDropdown(false);
                              }}
                              style={{ fontFamily: font.val }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                                fontFamily === font.val
                                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-bold"
                                  : "text-zinc-300 hover:bg-white/5 hover:text-white border border-transparent"
                              }`}
                            >
                              <span className="truncate">{font.name}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-sans tracking-wide shrink-0">
                                {font.preview}
                              </span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* 2. Größe & Formatierung in einer Zeile für mehr Kompaktheit */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Schriftgröße</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="10"
                        max="180"
                        value={fontSize || ""}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val)) updateActiveTextFormatting({ fontSize: val });
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-zinc-100 text-xs font-mono focus:border-blue-500 outline-none transition-colors"
                      />
                      <span className="text-zinc-500 text-[10px] font-mono">px</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Formatierung</label>
                    <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-0.5 w-full h-[34px] items-center">
                      <button
                        type="button"
                        onClick={() => updateActiveTextFormatting({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })}
                        className={`flex-1 h-full rounded-lg flex justify-center items-center transition-all cursor-pointer ${
                          fontWeight === "bold" ? "bg-blue-600 text-white shadow font-bold" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                        title="Fett"
                      >
                        <Bold size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveTextFormatting({ fontStyle: fontStyle === "italic" ? "normal" : "italic" })}
                        className={`flex-1 h-full rounded-lg flex justify-center items-center transition-all cursor-pointer ${
                          fontStyle === "italic" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                        title="Kursiv"
                      >
                        <Italic size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveTextFormatting({ textDecoration: textDecoration === "underline" ? "none" : "underline" })}
                        className={`flex-1 h-full rounded-lg flex justify-center items-center transition-all cursor-pointer ${
                          textDecoration === "underline" ? "bg-blue-600 text-white shadow" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                        }`}
                        title="Unterstrichen"
                      >
                        <Underline size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Zeilenausrichtung toggle */}
                {muster !== "blanko" && (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Zeilen-Raster</label>
                    <button
                      type="button"
                      onClick={() => updateActiveTextFormatting({ alignToLines: !alignToLines })}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between cursor-pointer ${
                        alignToLines
                          ? "bg-blue-600 text-white border-blue-500 shadow-md"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>📏</span>
                        <span>Schrift auf Zeilen anordnen</span>
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${alignToLines ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                        {alignToLines ? "AN" : "AUS"}
                      </span>
                    </button>
                  </div>
                )}

                {/* 3. Farbe */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Farbe</label>
                  <label className="relative flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-xl p-1.5 cursor-pointer hover:border-zinc-750 transition-all focus-within:border-blue-500">
                    <div className="flex items-center gap-2 px-0.5 w-full">
                      <div 
                        className="w-5.5 h-5.5 rounded-lg border border-zinc-700 shadow-inner shrink-0" 
                        style={{ backgroundColor: farbe }} 
                      />
                      <span className="text-zinc-300 text-xs font-mono truncate ml-1.5">{farbe.toUpperCase()}</span>
                    </div>
                    <input
                      type="color"
                      value={farbe}
                      onChange={(e) => updateActiveTextFormatting({ color: e.target.value })}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                    />
                  </label>
                </div>

                <div className="h-px bg-zinc-800 my-0.5" />

                {/* Actions */}
                <div className="flex justify-between gap-1.5">
                  {werkzeug === "maus" && !textInput && activeTextForToolbar && (
                    <button
                      onClick={(e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         setTextInput({
                           pxLeft: toolbarPxLeft,
                           pxTop: toolbarPxTop,
                           canvasX: activeTextForToolbar.x,
                           canvasY: activeTextForToolbar.y,
                           val: activeTextForToolbar.text,
                         });
                         setFontSize(activeTextForToolbar.fontSize);
                         setFontFamily(activeTextForToolbar.fontFamily);
                         setFontWeight(activeTextForToolbar.fontWeight);
                         setFontStyle(activeTextForToolbar.fontStyle);
                         setTextDecoration(activeTextForToolbar.textDecoration);
                         setTextAlign(activeTextForToolbar.textAlign);
                         setFarbe(activeTextForToolbar.color);
                         setWerkzeug("text");
                      }}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold rounded-lg transition-colors border border-blue-500"
                    >
                      <Edit size={12} /> Bearbeiten
                    </button>
                  )}
                  {textInput && (
                    <button
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = canvasRef.current?.getBoundingClientRect();
                        if (!rect) return;
                        const startX = e.clientX;
                        const startY = e.clientY;
                        const origPxLeft = textInput.pxLeft;
                        const origPxTop = textInput.pxTop;
                        const cWidth = canvasRef.current?.width || 1000;
                        const cHeight = canvasRef.current?.height || 1000;
                        const onMove = (ev: PointerEvent) => {
                          const newPxLeft = origPxLeft + (ev.clientX - startX);
                          const newPxTop = origPxTop + (ev.clientY - startY);
                          const newCanvasX = newPxLeft * (cWidth / rect.width);
                          const newCanvasY = newPxTop * (cHeight / rect.height);
                          setTextInput((prev) => {
                            if (!prev) return prev;
                            return { ...prev, pxLeft: newPxLeft, pxTop: newPxTop, canvasX: newCanvasX, canvasY: newCanvasY };
                          });
                        };
                        const onUp = () => {
                          window.removeEventListener("pointermove", onMove);
                          window.removeEventListener("pointerup", onUp);
                        };
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-semibold rounded-lg cursor-move transition-colors border border-zinc-700"
                    >
                      <GripHorizontal size={12} /> Bewegen
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSeiten((prev) => {
                        const arr = [...prev];
                        const seite = { ...arr[aktiveSeiteIdx] };
                        if (seite.textElemente && aktivesTextId) {
                          seite.textElemente = seite.textElemente.filter((t) => t.id !== aktivesTextId);
                          arr[aktiveSeiteIdx] = seite;
                        }
                        return arr;
                      });
                      setTextInput(null);
                      setAktivesTextId(null);
                    }}
                    className="p-2 aspect-square flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                    title="Löschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })()}

          {textInput && (
              <textarea
                ref={inputRef as any}
                value={textInput.val}
                onChange={(e) => {
                  setTextInput({ ...textInput, val: e.target.value });
                  e.target.style.height = "auto";
                  e.target.style.height = `${e.target.scrollHeight}px`;
                  e.target.style.width = "auto";
                  if (e.target.scrollWidth > 20) {
                    e.target.style.width = `${e.target.scrollWidth + 20}px`;
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitText();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    setTextInput(null);
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                autoFocus
                placeholder="Texteingabe..."
                className="absolute z-50 bg-transparent outline-none placeholder:text-neutral-400/50 resize-none overflow-hidden break-words whitespace-pre-wrap m-0 p-0 border border-transparent hover:border-neutral-300/30 focus:border-neutral-300/30 focus:bg-white/5 rounded transition-colors duration-200 tafel-textarea"
                style={{
                  left: `${textInput.pxLeft}px`,
                  top: `${textInput.pxTop}px`,
                  fontFamily: fontFamily,
                  fontSize: `${fontSize}px`,
                  fontWeight: fontWeight,
                  fontStyle: fontStyle,
                  textDecoration: textDecoration,
                  color: farbe,
                  lineHeight: `${getLineHeightForMuster(muster, musterGroesse, fontSize, alignToLines)}px`,
                  textAlign: textAlign,
                  minWidth: "20px",
                  minHeight: `${fontSize * 1.5}px`,
                }}
              />
          )}

          {/* RULER INTEGRATION */}
          {isLinealSichtbar && (
            <div
              className="absolute pointer-events-auto z-[22] shadow-2xl backdrop-blur-sm cursor-move touch-none group hover:shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              style={{
                left: linealPos.x,
                top: linealPos.y,
                width: 500,
                height: 60,
                transform: `translate(-50%, -50%) rotate(${linealDrehung}deg)`,
                transformOrigin: "50% 50%",
                backgroundColor: "rgba(255, 248, 225, 0.85)",
                border: "2px solid rgba(217, 119, 6, 0.4)",
                borderRadius: 4,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const origX = linealPos.x;
                const origY = linealPos.y;

                const onPointerMove = (ev: PointerEvent) => {
                  setLinealPos({
                    x: origX + (ev.clientX - startX),
                    y: origY + (ev.clientY - startY),
                  });
                };
                const onPointerUp = () => {
                  window.removeEventListener("pointermove", onPointerMove);
                  window.removeEventListener("pointerup", onPointerUp);
                };
                window.addEventListener("pointermove", onPointerMove);
                window.addEventListener("pointerup", onPointerUp);
              }}
            >
              {/* Millimeter/CM markers */}
              <div className="absolute top-0 left-0 right-0 h-4 border-b border-amber-900/20 flex overflow-hidden pointer-events-none">
                {Array.from({ length: 50 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 border-l border-amber-900/30 h-full relative"
                  >
                    {i > 0 && i % 5 === 0 && (
                      <span className="absolute -left-1 top-4 text-[8px] font-bold text-amber-900/60 font-mono">
                        {i}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Rotation Handle */}
              <div
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-amber-500/20 hover:bg-amber-500/40 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing border border-amber-500/30 transition-colors"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();

                  const rect =
                    e.currentTarget.parentElement!.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  const centerY = rect.top + rect.height / 2;

                  const onPointerMove = (ev: PointerEvent) => {
                    const dx = ev.clientX - centerX;
                    const dy = ev.clientY - centerY;
                    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    // Standardize orientation
                    setLinealDrehung(angle);
                  };

                  const onPointerUp = () => {
                    window.removeEventListener("pointermove", onPointerMove);
                    window.removeEventListener("pointerup", onPointerUp);
                  };

                  window.addEventListener("pointermove", onPointerMove);
                  window.addEventListener("pointerup", onPointerUp);
                }}
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-amber-600 border-t-amber-300 animate-spin-slow"
                  style={{ animationDuration: "4s" }}
                />
              </div>

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <Ruler size={32} />
              </div>

              <button
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-700 rounded-lg pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLinealSichtbar(false);
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* PLACED IMAGE (Part B) */}
          {placedImage && (
            <div
              className="absolute z-[25] cursor-move shadow-2xl rounded-sm touch-none"
              style={{
                left: placedImage.x,
                top: placedImage.y,
                width: placedImage.width,
                height: placedImage.height,
                transform: `rotate(${placedImage.angle}deg)`,
                border: "2px dashed rgba(59, 130, 246, 0.8)",
                backgroundImage: `url(${placedImage.src})`,
                backgroundSize: "100% 100%",
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                const startX = e.clientX;
                const startY = e.clientY;
                const origX = placedImage.x;
                const origY = placedImage.y;

                const onMove = (ev: PointerEvent) => {
                  setPlacedImage({
                    ...placedImage,
                    x: origX + (ev.clientX - startX),
                    y: origY + (ev.clientY - startY),
                  });
                };

                const onUp = () => {
                  window.removeEventListener("pointermove", onMove);
                  window.removeEventListener("pointerup", onUp);
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
              }}
            >
              <div className="absolute -top-10 left-0 right-0 flex items-center justify-between gap-2 px-2 py-1 bg-slate-900/90 rounded-t-lg backdrop-blur text-white flex-nowrap shrink-0 max-w-[300px]">
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacedImage({
                        ...placedImage,
                        width: placedImage.width * 1.1,
                        height: placedImage.height * 1.1,
                      });
                    }}
                    className="p-1 hover:bg-white/20"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacedImage({
                        ...placedImage,
                        width: placedImage.width * 0.9,
                        height: placedImage.height * 0.9,
                      });
                    }}
                    className="p-1 hover:bg-white/20"
                  >
                    <Minus size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacedImage({
                        ...placedImage,
                        angle: placedImage.angle - 15,
                      });
                    }}
                    className="p-1 hover:bg-white/20"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacedImage({
                        ...placedImage,
                        angle: placedImage.angle + 15,
                      });
                    }}
                    className="p-1 hover:bg-white/20"
                  >
                    <Undo2 size={14} className="-scale-x-100" />
                  </button>
                </div>
                <div className="flex items-center gap-2 border-l border-white/20 pl-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlacedImage(null);
                    }}
                    className="p-1 hover:bg-red-500/40 text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      commitPlacedImage();
                    }}
                    className="p-1 hover:bg-emerald-500/40 text-emerald-400"
                  >
                    <Check size={14} className="lucide-check" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleImageFileChange}
        />
      </div>

      {/* MODAL 1: SAVE DIALOG */}
      {isSaveDialogOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-white">
            <h3 className="text-lg font-bold mb-2">Tafelbild speichern</h3>
            <p className="text-xs text-slate-400 mb-4 font-normal">
              Geben Sie Ihrer Vorlage einen Namen, um sie später wieder
              aufzurufen.
            </p>
            <form
              onSubmit={handleSaveVorlageSubmit}
              className="flex flex-col gap-4"
            >
              <input
                type="text"
                autoFocus
                value={vorlageTitel}
                onChange={(e) => setVorlageTitel(e.target.value)}
                placeholder="Titel, z.B. Rechnen KW 42"
                className="bg-black/40 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                required
              />
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveDialogOpen(false)}
                  className="px-4 py-2 hover:bg-white/10 rounded-xl transition-colors font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors shadow-lg font-bold"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOAD TEMPLATE */}
      {isTemplatesOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[85vh] p-6 shadow-2xl flex flex-col text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <BookMarked size={20} className="text-blue-500" />{" "}
                  Gespeicherte Vorlagen
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  Laden Sie früher gespeicherte Tafelbilder (
                  {app.tafelVorlagen?.length || 0}/15)
                </p>
              </div>
              <button
                onClick={() => setIsTemplatesOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[300px] bg-black/20 rounded-2xl p-4 border border-slate-800">
              {!app.tafelVorlagen || app.tafelVorlagen.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Noch keine Vorlagen gespeichert.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {app.tafelVorlagen.map((vorlage) => (
                    <div
                      key={vorlage.id}
                      className="group bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer shadow-lg hover:shadow-xl relative"
                      onClick={() => handleLoadVorlage(vorlage)}
                    >
                      <div className="aspect-[4/3] bg-white relative p-2">
                        {/* Checkerboard for transparent parts */}
                        <div
                          className="absolute inset-0 opacity-5"
                          style={{
                            backgroundImage:
                              "linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%)",
                            backgroundSize: "10px 10px",
                            backgroundPosition:
                              "0 0, 0 5px, 5px -5px, -5px 0px",
                          }}
                        />
                        <img
                          src={vorlage.bildDaten}
                          className="w-full h-full object-contain relative z-10 border border-slate-200/50 shadow-sm rounded bg-slate-50"
                          alt={vorlage.titel}
                          draggable={false}
                        />
                      </div>
                      <div className="p-3 bg-slate-900 border-t border-slate-700">
                        <div className="font-bold text-sm truncate pr-6">
                          {vorlage.titel}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(vorlage.erstellt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVorlage(vorlage.id, vorlage.titel);
                        }}
                        className="absolute right-2 bottom-2 p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                        title="Löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STUNDENINFO PANEL (Part C) */}
      {isStundenInfoOpen && stundenInfoData && (
        <div
          className="absolute pointer-events-auto shadow-2xl backdrop-blur-xl bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-5 z-[50] w-72 cursor-move"
          style={{ left: stundenInfoOffset.x, top: stundenInfoOffset.y }}
          onPointerDown={(e) => {
            const stX = e.clientX;
            const stY = e.clientY;
            const oX = stundenInfoOffset.x;
            const oY = stundenInfoOffset.y;
            const mMove = (ev: PointerEvent) =>
              setStundenInfoOffset({
                x: oX + (ev.clientX - stX),
                y: oY + (ev.clientY - stY),
              });
            const mUp = () => {
              window.removeEventListener("pointermove", mMove);
              window.removeEventListener("pointerup", mUp);
            };
            window.addEventListener("pointermove", mMove);
            window.addEventListener("pointerup", mUp);
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1.5">
              <CalendarDays size={16} />
              {stundenInfoData.stundennummer}. Stunde
            </h4>
            <button
              onClick={() => setIsStundenInfoOpen(false)}
              className="text-white/40 hover:text-white p-1 pb-0"
            >
              <X size={16} />
            </button>
          </div>

          <div className="bg-black/30 rounded-xl p-3 mb-4">
            <div className="text-xs text-white/50 mb-1">
              {stundenInfoData.datum}
            </div>
            <div className="font-black text-lg text-white tracking-tight">
              {stundenInfoData.fach}
            </div>
            <div className="text-sm text-emerald-200/90 mt-1 leading-snug">
              {stundenInfoData.thema}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[10px] uppercase font-bold text-white/30 px-1 tracking-widest">
              Als Text einfügen
            </div>
            <button
              onClick={() =>
                handleInsertStundenInfoText(stundenInfoData.thema || "")
              }
              className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-emerald-600 rounded-lg transition-colors truncate"
            >
              Thema: "{stundenInfoData.thema}"
            </button>
            <button
              onClick={() =>
                handleInsertStundenInfoText(stundenInfoData.fach || "")
              }
              className="w-full text-left px-3 py-2 text-xs bg-white/5 hover:bg-emerald-600 rounded-lg transition-colors"
            >
              Fach: {stundenInfoData.fach}
            </button>
          </div>
        </div>
      )}

      {/* MATERIAL LIBRARY SAVE DIALOG (Part G) */}
      {isMaterialLibraryDialogOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in-95 text-slate-800">
            <h3 className="text-lg font-black text-slate-900 mb-2 flex items-center gap-2">
              <Sparkles size={20} className="text-indigo-500" />
              In Bibliothek sichern
            </h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              Exportiert einen Schnappschuss der aktuellen Tafel als Bild in
              Ihre dauerhafte Materialbibliothek.
            </p>

            <form
              onSubmit={handleMaterialLibrarySubmit}
              className="flex flex-col gap-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Dateiname
                </label>
                <input
                  type="text"
                  autoFocus
                  value={materialTitel}
                  onChange={(e) => setMaterialTitel(e.target.value)}
                  placeholder="Tafelbild Thema XY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-semibold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Zuweisung Fach
                </label>
                <select
                  value={materialFach}
                  onChange={(e) => setMaterialFach(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium appearance-none"
                >
                  {app.faecher?.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setIsMaterialLibraryDialogOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors font-semibold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-lg shadow-indigo-600/20 font-bold flex items-center gap-2"
                >
                  Sichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast specific for Material Library */}
      {materialSuccessToast && (
        <div className="fixed bottom-6 right-6 bg-slate-950/95 border-2 border-emerald-500/80 rounded-2xl p-4 shadow-3xl text-white flex items-center gap-3 z-[3500] animate-in slide-in-from-bottom-6 duration-300 max-w-sm pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Check size={20} className="text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Gespeichert in Bibliothek</h4>
            <p className="text-xs text-white/60">
              Das Bild ist nun bei den Materialien unter "{materialFach}"
              verfügbar.
            </p>
          </div>
        </div>
      )}

      {/* SHORTCUTS OVERLAY */}
      <AnimatePresence>
        {showShortcutsInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 pointer-events-auto"
            onClick={() => setShowShortcutsInfo(false)}
          >
            <div
              className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-2xl max-w-md w-full pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <HelpCircle size={20} className="text-emerald-400" />
                  Tastenkürzel & Hilfe
                </h3>
                <button
                  onClick={() => setShowShortcutsInfo(false)}
                  className="text-neutral-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <MousePointer2 size={16} className="text-neutral-500" />
                    <span>Maus / Bewegen</span>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono text-emerald-300">V</kbd>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Pencil size={16} className="text-neutral-500" />
                    <span>Stift</span>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono text-emerald-300">P</kbd>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Type size={16} className="text-neutral-500" />
                    <span>Textwerkzeug</span>
                  </div>
                  <kbd className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono text-emerald-300">T</kbd>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Trash2 size={16} className="text-neutral-500" />
                    <span>Element löschen</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono text-red-300">Delete</kbd>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-slate-800">
                  <div className="flex items-center gap-3 text-sm text-neutral-300">
                    <Undo2 size={16} className="text-neutral-500" />
                    <span>Rückgängig</span>
                  </div>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-slate-800 rounded-md text-xs font-mono text-emerald-300">Cmd/Ctrl + Z</kbd>
                  </div>
                </div>

                <div className="pt-4 mt-4 bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-2">💡 Tipp: Text Styling Live</h4>
                  <p className="text-xs text-neutral-400 leading-relaxed">
                    Alle Texteinstellungen (Farbe, Größe, Schriftart, Ausrichtung) werden nun in Echtzeit auf das Textfeld angewendet, während du tippst. Wähle ein bestehendes Textfeld mit dem Maus-Werkzeug aus, um es neu einzustellen.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={32} className="text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight mb-2">Tafel wirklich löschen?</h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    Alle Zeichnungen und Textelemente auf dieser Seite werden entfernt. Du kannst diesen Vorgang danach rückgängig machen.
                  </p>
                </div>
                <div className="flex gap-3 w-full mt-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-white font-medium transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={confirmClear}
                    className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-bold transition-colors shadow-lg shadow-red-500/20"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
