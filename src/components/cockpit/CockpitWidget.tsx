import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { normalizeClassMascot } from "../../lib/classMascot";
import { X, Settings, PenTool, SlidersHorizontal, Check, Maximize2, Minimize2, LockKeyhole, MoreHorizontal, Rocket, Minus } from "lucide-react";
import { CockpitWidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { WIDGET_MIN_SIZES, getWidgetMinSizeConfig } from "./widgetLayout";
import { getWidgetViewportDensity, getLegacyWidgetPadding, WIDGET_VIEWPORT_OVERFLOW } from "../../lib/widgetViewport";
import { getCockpitWidgetDisplayLabel } from "../../lib/cockpitWidgetCatalog";

interface CockpitWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  onClose: () => void;
  onMinimize?: () => void;
  onFocus: () => void;
  zIndex: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  mascotStageRef?: React.RefObject<HTMLDivElement | null>;
  mascotPortalTarget?: HTMLElement | null;
  currentIsLight: boolean;
  activePultThemeVars: any;
  showSettingsButton?: boolean;
  settingsOpen?: boolean;
  onSettingsToggle?: () => void;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  isFocused?: boolean;
  layoutLocked?: boolean;
}

const OPTIMAL_WIDGET_SIZES: Record<string, { w: number; h: number }> = {
  clock: { w: 25, h: 28 },
  instruction: { w: 45, h: 50 },
  timer: { w: 23, h: 38 },
  trafficlight: { w: 16, h: 60 },
  randomname: { w: 50, h: 70 },
  classweeklyplan: { w: 100, h: 100 },
  homework: { w: 55, h: 62 },
  noisemeter: { w: 28, h: 42 },
  vocabulary: { w: 35, h: 48 },
  studentlist: { w: 25, h: 65 },
  kidattendance: { w: 50, h: 65 },
  groups: { w: 35, h: 48 },
  qrcode: { w: 24, h: 44 },
  image: { w: 32, h: 50 },
  phases: { w: 28, h: 58 },
  sounds: { w: 32, h: 45 },
  todo: { w: 26, h: 44 },
  dienste: { w: 32, h: 46 },
  klassenglas: { w: 42, h: 50 },
  links: { w: 28, h: 42 },
  drawing: { w: 60, h: 60 },
  pet: { w: 44, h: 66 },
  stopwatch: { w: 24, h: 34 },
  calculator: { w: 24, h: 46 },
  dice: { w: 24, h: 32 },
  weather: { w: 24, h: 32 },
  aiquiz: { w: 42, h: 55 },
  riddle: { w: 32, h: 45 },
  scoreboard: { w: 30, h: 45 },
  starsreview: { w: 55, h: 65 },
  wheel: { w: 50, h: 70 },
  breathing: { w: 28, h: 44 },
  kidweather: { w: 32, h: 45 },
  mathcards: { w: 32, h: 42 },
  wortsatzwerkstatt: { w: 42, h: 50 },
  scrambler: { w: 34, h: 45 },
  watertracker: { w: 26, h: 44 },
  wordchain: { w: 35, h: 48 },
  moodmeter: { w: 30, h: 45 },
  colormixer: { w: 45, h: 55 },
  wordgrid: { w: 42, h: 55 },
  rhythm: { w: 36, h: 48 },
  geometry: { w: 40, h: 45 },
  fractions: { w: 38, h: 48 },
  fractionvisualizer: { w: 38, h: 48 },
  wordclock: { w: 34, h: 42 },
  sorting: { w: 40, h: 52 },
  dailyquotes: { w: 28, h: 40 },
  dictionary: { w: 36, h: 48 },
  piano: { w: 55, h: 35 },
  bodyparts: { w: 38, h: 50 },
  toothbrush: { w: 28, h: 44 },
  challenge: { w: 32, h: 45 },
  compass: { w: 34, h: 45 },
  weekdays: { w: 34, h: 44 },
  piggybank: { w: 30, h: 44 },
  noisescales: { w: 34, h: 44 },
  wordscramble: { w: 36, h: 48 },
  shadowshapes: { w: 38, h: 50 },
  emotions: { w: 34, h: 46 },
  clocksync: { w: 36, h: 50 },
  soundmemory: { w: 38, h: 50 },
  spellingdetective: { w: 38, h: 48 },
  numberline: { w: 55, h: 38 },
  mathchain: { w: 42, h: 52 },
  thermometer: { w: 24, h: 55 },
  compoundsplit: { w: 36, h: 48 },
  soundquiz: { w: 36, h: 48 },
  mathduel: { w: 48, h: 55 },
  shapepuzzle: { w: 40, h: 52 },
  guitartuner: { w: 32, h: 46 },
  secretagent: { w: 38, h: 50 },
  fractioncake: { w: 38, h: 52 },
  sentencebuilding: { w: 46, h: 48 },
  patternmaker: { w: 44, h: 48 },
  wordexplorer: { w: 38, h: 50 },
  weightscale: { w: 40, h: 50 },
  geographyquiz: { w: 42, h: 52 },
  calmrain: { w: 36, h: 48 },
  estimationjar: { w: 34, h: 46 },
  reflexgame: { w: 40, h: 48 },
  mathpyramid: { w: 40, h: 52 },
  wastebin: { w: 44, h: 52 },
  tonetrainer: { w: 42, h: 50 },
  angledetective: { w: 38, h: 48 },
  rhymemachine: { w: 38, h: 50 },
  alphabetsoup: { w: 40, h: 52 },
  divrobot: { w: 36, h: 48 },
  classtarget: { w: 34, h: 55 },
  morsecode: { w: 42, h: 50 },
  punctuationzoo: { w: 42, h: 50 },
  secretcode: { w: 40, h: 50 },
  clockpuzzle: { w: 38, h: 50 },
  fractiongrid: { w: 42, h: 52 },
  trafficquiz: { w: 42, h: 50 },
  wordbuilder: { w: 46, h: 48 },
  watercycle: { w: 44, h: 55 },
  soundmachine: { w: 42, h: 50 },
  mathbalancer: { w: 44, h: 52 },
  animalvoice: { w: 38, h: 48 },
  constellation: { w: 45, h: 55 },
  multitrainer: { w: 38, h: 48 },
  moneycalc: { w: 40, h: 50 },
  anschauung: { w: 42, h: 52 },
  zahlenraum: { w: 46, h: 48 },
  kopfrechnen: { w: 38, h: 48 },
  storyemojis: { w: 42, h: 48 },
  abcorder: { w: 38, h: 48 },
  planetarium: { w: 42, h: 55 },
  tischcheck: { w: 32, h: 48 },
  faircall: { w: 35, h: 60 },
};

export const CockpitWidget: React.FC<CockpitWidgetProps> = ({
  widget,
  onUpdate,
  onClose,
  onMinimize,
  onFocus,
  zIndex,
  stageRef,
  mascotStageRef,
  mascotPortalTarget,
  currentIsLight,
  showSettingsButton,
  settingsOpen = false,
  onSettingsToggle,
  headerExtra,
  children,
  isFocused = false,
  layoutLocked = false,
}) => {
  const { app, calculateWidgetFontSize } = useApp();
  const isDirect = !!widget.settings?.isDirectMode;
  const isFreeMascot = widget.type === "pet" && !isDirect;
  const activeStageRef = isFreeMascot && mascotStageRef ? mascotStageRef : stageRef;
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetMenuAreaRef = useRef<HTMLDivElement>(null);
  const contentViewportRef = useRef<HTMLDivElement>(null);
  const [contentPixels, setContentPixels] = useState({ width: 0, height: 0 });
  const dragStartPos = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStartPos = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const suppressMascotTap = useRef(false);
  const suppressMascotTapTimer = useRef<number | null>(null);
  useEffect(() => () => { if (suppressMascotTapTimer.current !== null) clearTimeout(suppressMascotTapTimer.current); }, []);

  const [showSizeConfig, setShowSizeConfig] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [sizeInputWidth, setSizeInputWidth] = useState("");
  const [sizeInputHeight, setSizeInputHeight] = useState("");
  const [showExactSizeInputs, setShowExactSizeInputs] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Widget menus behave like real popovers: Escape or a click/tap outside closes
  // them. This is especially important on Smartboards where a menu otherwise
  // easily stays open over the lesson content.
  useEffect(() => {
    if (!showWidgetMenu && !showSizeConfig) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (widgetMenuAreaRef.current?.contains(target)) return;
      setShowWidgetMenu(false);
      setShowSizeConfig(false);
      setShowExactSizeInputs(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowWidgetMenu(false);
      setShowSizeConfig(false);
      setShowExactSizeInputs(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [showWidgetMenu, showSizeConfig]);

  // The check-in widget can request a temporary larger teaching view without
  // persisting width, height or position into a class layout / backup.
  useEffect(() => {
    if (widget.type !== "kidattendance") return;
    const handleExpand = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; expanded: boolean }>).detail;
      if (detail?.id === widget.id) setIsMaximized(detail.expanded);
    };
    window.addEventListener("klassio:checkin-expand", handleExpand);
    return () => window.removeEventListener("klassio:checkin-expand", handleExpand);
  }, [widget.id, widget.type]);

  useEffect(() => {
    if (widget.type === "kidattendance") {
      window.dispatchEvent(new CustomEvent("klassio:checkin-frame-size", {
        detail: { id: widget.id, expanded: isMaximized },
      }));
    }
  }, [isMaximized, widget.id, widget.type]);

  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    // A ref object stays identical when the cockpit DOM is replaced after remote
    // control. Observe the current portal node explicitly, otherwise the mascot
    // keeps measuring the old detached root and may disappear after returning.
    const stage = isFreeMascot ? mascotPortalTarget : activeStageRef.current;
    if (!stage) {
      if (isFreeMascot) setStageSize({ width: 0, height: 0 });
      return;
    }

    const updateStageSize = () => {
      const rect = stage.getBoundingClientRect();
      setStageSize({ width: rect.width, height: rect.height });
    };

    updateStageSize();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(updateStageSize);
      observer.observe(stage);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateStageSize);
    return () => window.removeEventListener("resize", updateStageSize);
  }, [activeStageRef, isFreeMascot, mascotPortalTarget]);

  // Sync inputs with widget dimensions when config opens or dims change externally
  useEffect(() => {
    setSizeInputWidth(Math.round(widget.w).toString());
    setSizeInputHeight(Math.round(widget.h).toString());
  }, [widget.w, widget.h, showSizeConfig]);

  const handleApplySizeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();

    // Nie unter die inhaltssichere Mindestgröße schrumpfen.
    const wRaw = parseInt(sizeInputWidth, 10);
    const hRaw = parseInt(sizeInputHeight, 10);
    if (!isNaN(wRaw) && !isNaN(hRaw)) {
      const minConfig = getWidgetMinSizeConfig(widget.type);
      const minWPercent = Math.min(100, (minConfig.minW / stageRect.width) * 100);
      const minHPercent = Math.min(100, (minConfig.minH / stageRect.height) * 100);
      const wNum = Math.max(minWPercent, Math.min(100, wRaw));
      const hNum = Math.max(minHPercent, Math.min(100, hRaw));
      const xNum = Math.max(0, Math.min(widget.x, 100 - wNum));
      const yNum = Math.max(0, Math.min(widget.y, 100 - hNum));

      onFocus();
      onUpdate({ x: xNum, y: yNum, w: wNum, h: hNum });
      setShowExactSizeInputs(false);
      setShowSizeConfig(false);
    }
  };

  const handlePointerDownDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || e.button !== 0 || isMaximized || layoutLocked) return;
    onFocus();

    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();

    const currentLeft = (widget.x / 100) * stageRect.width;
    const currentTop = (widget.y / 100) * stageRect.height;

    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      left: currentLeft,
      top: currentTop,
    };

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setIsDragging(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;

      // Follow the pointer 1:1. Deliberately no grid/magnet snapping here:
      // precise free placement is the default classroom interaction.
      let newLeftPixels = dragStartPos.current.left + deltaX;
      let newTopPixels = dragStartPos.current.top + deltaY;

      const widgetRect = widgetRef.current?.getBoundingClientRect();
      const widgetWidth =
        widgetRect?.width || (widget.w / 100) * stageRect.width;
      const widgetHeight =
        widgetRect?.height || (widget.h / 100) * stageRect.height;

      newLeftPixels = Math.max(
        0,
        Math.min(stageRect.width - widgetWidth, newLeftPixels),
      );
      newTopPixels = Math.max(
        0,
        Math.min(stageRect.height - widgetHeight, newTopPixels),
      );

      onUpdate({
        x: (newLeftPixels / stageRect.width) * 100,
        y: (newTopPixels / stageRect.height) * 100,
      });
    };

    const finishDrag = (endEvent: PointerEvent) => {
      if (target.hasPointerCapture(endEvent.pointerId)) {
        target.releasePointerCapture(endEvent.pointerId);
      }
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", finishDrag);
      target.removeEventListener("pointercancel", finishDrag);
      setIsDragging(false);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", finishDrag);
    target.addEventListener("pointercancel", finishDrag);
  };

  const handlePointerDownResize = (e: React.PointerEvent<HTMLElement>) => {
    if (!e.isPrimary || e.button !== 0 || isMaximized || layoutLocked) return;
    e.stopPropagation();
    onFocus();

    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();

    resizeStartPos.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: (widget.w / 100) * stageRect.width,
      startH: (widget.h / 100) * stageRect.height,
    };

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setIsResizing(true);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - resizeStartPos.current.startX;
      const deltaY = moveEvent.clientY - resizeStartPos.current.startY;

      const newWidthPx = resizeStartPos.current.startW + deltaX;
      const newHeightPx = resizeStartPos.current.startH + deltaY;

      const minConfig = getWidgetMinSizeConfig(widget.type);
      const minW = minConfig.minW;
      const minH = minConfig.minH;

      const clampedWidthPx = Math.max(
        minW,
        Math.min(
          stageRect.width - (widget.x / 100) * stageRect.width,
          newWidthPx,
        ),
      );
      const clampedHeightPx = Math.max(
        minH,
        Math.min(
          stageRect.height - (widget.y / 100) * stageRect.height,
          newHeightPx,
        ),
      );

      onUpdate({
        w: (clampedWidthPx / stageRect.width) * 100,
        h: (clampedHeightPx / stageRect.height) * 100,
      });
    };

    const finishResize = (endEvent: PointerEvent) => {
      if (target.hasPointerCapture(endEvent.pointerId)) {
        target.releasePointerCapture(endEvent.pointerId);
      }
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", finishResize);
      target.removeEventListener("pointercancel", finishResize);
      setIsResizing(false);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", finishResize);
    target.addEventListener("pointercancel", finishResize);
  };

  const applyPersistentSize = (targetW: number, targetH: number, moveToBoardInset = false) => {
    const stage = stageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;
    const minConfig = getWidgetMinSizeConfig(widget.type);
    const minW = Math.min(100, (minConfig.minW / stageRect.width) * 100);
    const minH = Math.min(100, (minConfig.minH / stageRect.height) * 100);
    const w = Math.max(minW, Math.min(96, targetW));
    const h = Math.max(minH, Math.min(96, targetH));
    const x = moveToBoardInset ? Math.max(0, Math.min(4, 100 - w)) : Math.max(0, Math.min(widget.x, 100 - w));
    const y = moveToBoardInset ? Math.max(0, Math.min(4, 100 - h)) : Math.max(0, Math.min(widget.y, 100 - h));
    setIsMaximized(false);
    onFocus();
    onUpdate({ x, y, w, h });
    setSizeInputWidth(Math.round(w).toString());
    setSizeInputHeight(Math.round(h).toString());
  };

  const applySizePreset = (preset: "fit" | "large" | "board") => {
    const optimal = OPTIMAL_WIDGET_SIZES[widget.type] || { w: 35, h: 45 };
    if (preset === "fit") {
      applyPersistentSize(optimal.w, optimal.h);
      return;
    }
    if (preset === "large") {
      applyPersistentSize(
        Math.min(82, Math.max(55, optimal.w * 1.35)),
        Math.min(86, Math.max(60, optimal.h * 1.25)),
      );
      return;
    }
    applyPersistentSize(92, 90, true);
  };

  const handleResizeKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const delta = event.shiftKey ? 5 : 2;
    let dw = 0;
    let dh = 0;
    if (event.key === "ArrowLeft") dw = -delta;
    else if (event.key === "ArrowRight") dw = delta;
    else if (event.key === "ArrowUp") dh = -delta;
    else if (event.key === "ArrowDown") dh = delta;
    else return;
    event.preventDefault();
    event.stopPropagation();
    applyPersistentSize(widget.w + dw, widget.h + dh);
  };

  const displayLabel = getCockpitWidgetDisplayLabel(widget.type);


  const opt = OPTIMAL_WIDGET_SIZES[widget.type] || { w: 35, h: 45 };
  const safeMinSize = getWidgetMinSizeConfig(widget.type);
  const minWPercent = stageSize.width > 0 ? Math.min(100, (safeMinSize.minW / stageSize.width) * 100) : 0;
  const minHPercent = stageSize.height > 0 ? Math.min(100, (safeMinSize.minH / stageSize.height) * 100) : 0;
  // A freestanding mascot uses the *whole cockpit*, not an oversized widget
  // rectangle in the white writing area. x/y stay class-local and persistent.
  const mascotSize = normalizeClassMascot(app.classMascot).displaySize || 220;
  const mascotPixels = Math.max(1, Math.min(mascotSize, stageSize.width || mascotSize, stageSize.height || mascotSize));
  const mascotWPercent = stageSize.width > 0 ? (mascotPixels / stageSize.width) * 100 : 25;
  const mascotHPercent = stageSize.height > 0 ? (mascotPixels / stageSize.height) * 100 : 25;
  const renderedW = isFreeMascot ? mascotWPercent : isDirect ? 100 : isMaximized ? 96 : Math.max(5, widget.w, minWPercent);
  const renderedH = isFreeMascot ? mascotHPercent : isDirect ? 100 : isMaximized ? 96 : Math.max(5, widget.h, minHPercent);
  const renderedX = isFreeMascot ? Math.max(0, Math.min(widget.x, 100 - renderedW)) : isDirect ? 0 : isMaximized ? 2 : Math.max(0, Math.min(widget.x, 100 - renderedW));
  const renderedY = isFreeMascot ? Math.max(0, Math.min(widget.y, 100 - renderedH)) : isDirect ? 0 : isMaximized ? 2 : Math.max(0, Math.min(widget.y, 100 - renderedH));
  const scaleX = renderedW / opt.w;
  const scaleY = renderedH / opt.h;
  const contentScale = Math.min(4, Math.min(scaleX, scaleY));

  // The actual INNER viewport, after the shared header, drives every widget's
  // responsive rules. Avoid using the board size: two widgets on the same
  // Smartboard can have completely different available teaching areas.
  useEffect(() => {
    const viewport = contentViewportRef.current;
    if (!viewport) return;
    let frameId: number | null = null;
    const measure = () => {
      const next = { width: Math.round(viewport.clientWidth), height: Math.round(viewport.clientHeight) };
      setContentPixels(prev =>
        prev.width === next.width && prev.height === next.height ? prev : next);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(measure);
      });
      observer.observe(viewport);
      return () => { observer.disconnect(); if (frameId !== null) cancelAnimationFrame(frameId); };
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [widget.type, isDirect, isFreeMascot]);

  const viewportDensity = getWidgetViewportDensity(contentPixels.width, contentPixels.height);
  const isLegacyScaled = !isDirect && !isFreeMascot &&
    !WIDGET_MIN_SIZES[widget.type] && widget.type !== "instruction";
  const legacyPadding = getLegacyWidgetPadding(contentPixels.width, contentPixels.height);

  // Moving a free-standing mascot should feel like picking up the animal, not dragging
  // an invisible widget rectangle. A short tap must still open mascot interactions.
  const handleMascotPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isFreeMascot || layoutLocked || isMaximized || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const character = target.closest<HTMLButtonElement>('.class-mascot-character');
    const stage = activeStageRef.current;
    if (!character || !stage) return;

    const pointerId = event.pointerId;
    const stageRect = stage.getBoundingClientRect();
    const originX = (renderedX / 100) * stageRect.width;
    const originY = (renderedY / 100) * stageRect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
    let lastSnappedPosition: string | null = null;
    character.setPointerCapture(pointerId);

    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      const dx = move.clientX - startX;
      const dy = move.clientY - startY;
      // A finger tap or a tiny pointer tremor must not move the mascot.
      if (!dragging && Math.hypot(dx, dy) < 9) return;
      if (!dragging) {
        dragging = true;
        suppressMascotTap.current = true;
        if (suppressMascotTapTimer.current !== null) clearTimeout(suppressMascotTapTimer.current);
        onFocus();
      }
      const rect = widgetRef.current?.getBoundingClientRect();
      const width = rect?.width || (widget.w / 100) * stageRect.width;
      const height = rect?.height || (widget.h / 100) * stageRect.height;
      const nextX = Math.max(0, Math.min(stageRect.width - width, Math.round((originX + dx) / 10) * 10));
      const nextY = Math.max(0, Math.min(stageRect.height - height, Math.round((originY + dy) / 10) * 10));
      // Do not persist the same snapped coordinates on every touch/mouse
      // event: repeated app updates made the otherwise free character stutter
      // and caused unnecessary encrypted account-sync writes.
      const snappedPosition = nextX + ':' + nextY;
      if (snappedPosition === lastSnappedPosition) return;
      lastSnappedPosition = snappedPosition;
      onUpdate({ x: (nextX / stageRect.width) * 100, y: (nextY / stageRect.height) * 100 });
    };

    const finish = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      character.removeEventListener('pointermove', onMove);
      character.removeEventListener('pointerup', finish);
      character.removeEventListener('pointercancel', finish);
      if (character.hasPointerCapture(pointerId)) character.releasePointerCapture(pointerId);
      // Some touch browsers dispatch a delayed synthetic click after pointerup.
      // Keep the drag click suppressed briefly, then allow a new deliberate tap.
      if (dragging) {
        suppressMascotTapTimer.current = window.setTimeout(() => {
          suppressMascotTap.current = false;
          suppressMascotTapTimer.current = null;
        }, 500);
      }
    };

    character.addEventListener('pointermove', onMove);
    character.addEventListener('pointerup', finish);
    character.addEventListener('pointercancel', finish);
  };

  // The freestanding character is draggable with a finger or mouse. Give keyboard
  // users the same precise movement without exposing a toolbar or a large hit area.
  const handleMascotKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isFreeMascot || layoutLocked || isMaximized) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.class-mascot-character')) return;
    const delta = {
      ArrowLeft: [-1, 0], ArrowRight: [1, 0],
      ArrowUp: [0, -1], ArrowDown: [0, 1],
    }[event.key] as [number, number] | undefined;
    if (!delta) return;
    const stage = activeStageRef.current;
    if (!stage) return;
    const stageRect = stage.getBoundingClientRect();
    if (stageRect.width <= 0 || stageRect.height <= 0) return;
    event.preventDefault();
    event.stopPropagation();
    const widgetRect = widgetRef.current?.getBoundingClientRect();
    const width = widgetRect?.width || (widget.w / 100) * stageRect.width;
    const height = widgetRect?.height || (widget.h / 100) * stageRect.height;
    const step = event.shiftKey ? 1 : 10;
    const x = Math.max(0, Math.min(stageRect.width - width, (renderedX / 100) * stageRect.width + delta[0] * step));
    const y = Math.max(0, Math.min(stageRect.height - height, (renderedY / 100) * stageRect.height + delta[1] * step));
    onFocus();
    onUpdate({ x: (x / stageRect.width) * 100, y: (y / stageRect.height) * 100 });
  };

  const handleMascotClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressMascotTap.current) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.class-mascot-character')) {
      event.preventDefault();
      event.stopPropagation();
      suppressMascotTap.current = false;
      if (suppressMascotTapTimer.current !== null) {
        clearTimeout(suppressMascotTapTimer.current);
        suppressMascotTapTimer.current = null;
      }
    }
  };

  const widgetNode = (
    <div
      ref={widgetRef}
      role="group"
      aria-label={`${displayLabel} Widget`}
      data-mascot-focused={isFreeMascot && isFocused ? "true" : undefined}
      data-widget-type={widget.type}
      data-widget-title={displayLabel}
      data-widget-density={viewportDensity}
      data-widget-ux="v3"
      data-widget-focused={isFocused ? "true" : "false"}
      data-widget-interacting={isDragging ? "dragging" : isResizing ? "resizing" : undefined}
      className={`cockpit-widget-container absolute flex flex-col transition-[transform,border-color,shadow,background-color,opacity,border-radius,box-shadow,ring-color] duration-300 ease-out select-none group animate-in fade-in zoom-in-95 ${isFreeMascot ? "cockpit-free-mascot rounded-none border-0 bg-transparent shadow-none ring-0 backdrop-blur-none" : ""} ${
        isDirect || isFreeMascot
          ? "rounded-none border-none bg-transparent shadow-none"
          : "rounded-[24px] backdrop-blur-3xl ring-offset-transparent transition-all " +
            (currentIsLight
              ? isFocused
                ? "bg-white border border-accent ring-4 ring-accent/20 shadow-[0_24px_55px_rgba(15,23,42,0.16),0_1px_3px_rgba(15,23,42,0.06)] text-slate-800"
                : "bg-white/95 border border-slate-200/70 shadow-[0_12px_40px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.02)] text-slate-800"
              : isFocused
                ? "bg-zinc-900 border border-accent ring-4 ring-accent/20 shadow-[0_24px_55px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12)] text-neutral-100"
                : "bg-zinc-950/85 border border-white/5 shadow-[0_16px_45px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)] text-neutral-100")
      }`}
      style={{
        containerType: "inline-size",
        left: `${renderedX}%`,
        top: `${renderedY}%`,
        width: isFreeMascot ? `${mascotPixels}px` : `${renderedW}%`,
        height: isFreeMascot ? `${mascotPixels}px` : `${renderedH}%`,
        zIndex: isFreeMascot ? 120 : isDirect ? 0 : isMaximized ? 9999 : zIndex,
        // Drag is restricted to the toolbar / resize handle. Let pupils scroll
        // overfull widget contents even while the board layout is editable.
        touchAction: "auto",
      }}
      onPointerDownCapture={!isDirect && !isFreeMascot ? onFocus : undefined}
      onClick={onFocus}
      onKeyDown={isFreeMascot ? handleMascotKeyDown : undefined}
    >
      {/* Ordinary widgets use an in-flow header. The freestanding mascot's controls overlay
          only when intentionally focused/hovered, leaving its artwork centered in the slot. */}
      <div
        onPointerDown={isDirect || isMaximized || layoutLocked ? undefined : handlePointerDownDrag}
        className={`${isFreeMascot ? "mascot-widget-toolbar absolute inset-x-0 top-0 w-full h-11 border-0 bg-transparent text-inherit opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100" : isDirect ? "absolute top-0 left-0 right-0 h-11 opacity-40 hover:opacity-100 pointer-events-auto border-b-0 bg-black/10 dark:bg-white/10 text-slate-400 backdrop-blur-md rounded-t-xl" : "w-full relative h-11 " + "opacity-100 pointer-events-auto " + (currentIsLight ? "bg-white/95 border-slate-200/60 text-slate-700 shadow-sm backdrop-blur-xl rounded-t-[23px]" : "bg-zinc-900/95 border-white/10 text-neutral-200 shadow-sm backdrop-blur-xl rounded-t-[23px]")} z-40 ${viewportDensity === "tight" && !isFreeMascot ? "px-1.5 py-0.5" : "px-3 py-1"} flex items-center justify-between select-none shrink-0 border-b transition-all duration-300 ${isDirect || isMaximized || layoutLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}
        style={{ touchAction: isDirect || layoutLocked ? "auto" : "none" }}
      >
        {/* Left Side: status dot, Title, and Pen icon button placed directly right next to the title label */}
        <div className={`flex items-center gap-2 min-w-0 flex-1 flex-nowrap mr-2 pointer-events-auto ${isMaximized || layoutLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}>
          {!isDirect && !layoutLocked && viewportDensity !== "tight" && (
            <div className="flex items-center gap-1.5 opacity-70 shrink-0 select-none">
              <svg
                width="6"
                height="12"
                viewBox="0 0 6 12"
                className="text-slate-400 dark:text-zinc-500 fill-current"
              >
                <circle cx="1.5" cy="2" r="1" />
                <circle cx="1.5" cy="6" r="1" />
                <circle cx="1.5" cy="10" r="1" />
                <circle cx="4.5" cy="2" r="1" />
                <circle cx="4.5" cy="6" r="1" />
                <circle cx="4.5" cy="10" r="1" />
              </svg>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  widget.type === "drawing"
                    ? "bg-rose-500 animate-pulse"
                    : isFocused
                      ? "bg-accent"
                      : "bg-slate-400 dark:bg-zinc-500"
                }`}
              />
            </div>
          )}

          {layoutLocked && !isDirect && (
            <LockKeyhole
              size={11}
              strokeWidth={2.5}
              className="shrink-0 opacity-50"
              aria-hidden="true"
            />
          )}

          <span className={`cockpit-widget-title font-semibold truncate opacity-90 text-inherit select-none min-w-0 ${viewportDensity === "tight" ? "text-[10px]" : "text-xs"}`} title={displayLabel}>
            {displayLabel}
          </span>

          {/* Widget-specific configuration lives behind the gear beside its name,
              not hidden inside the overflow menu or on the lesson surface. */}
          {showSettingsButton && onSettingsToggle && (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onFocus();
                onSettingsToggle();
                setShowWidgetMenu(false);
              }}
              aria-label={`${displayLabel} Einstellungen ${settingsOpen ? "schließen" : "öffnen"}`}
              aria-expanded={settingsOpen}
              title="Widget-Einstellungen"
              className={`cockpit-widget-settings-trigger ml-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${settingsOpen
                ? "bg-accent border-accent text-accent-text"
                : currentIsLight
                  ? "bg-white border-slate-200 text-slate-600 hover:bg-accent-soft hover:text-accent"
                  : "bg-zinc-800 border-white/10 text-zinc-200 hover:bg-zinc-700"}`}
            >
              <Settings size={16} aria-hidden="true" />
            </button>
          )}

          {/* Elegant Pen Button shown directly right next to the title (neben Widget) */}
          {widget.type === "drawing" && onSettingsToggle && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSettingsToggle();
              }}
              className={`inline-flex min-h-11 items-center gap-1 px-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all outline-none cursor-pointer shrink-0 ml-1.5 shadow-xs border ${
                currentIsLight
                  ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300"
                  : "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-500/40"
              }`}
              title="Malgröße & Stift-Optionen öffnen"
              aria-label="Stiftoptionen öffnen"
            >
              <PenTool size={9} strokeWidth={3} className="animate-pulse" />
              <span>Stift</span>
            </button>
          )}
        </div>

        {/* Compact widget menu: editing stays inside the widget without a wide button bar. */}
        <div ref={widgetMenuAreaRef} className="relative flex items-center gap-1.5 shrink-0 ml-auto pointer-events-auto">
          {headerExtra}

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onFocus();
              setShowWidgetMenu((value) => !value);
              setShowSizeConfig(false);
              setShowExactSizeInputs(false);
            }}
            className={`cockpit-widget-menu-trigger w-11 h-11 flex items-center justify-center rounded-lg border shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer ${
              showWidgetMenu
                ? "bg-accent border-accent text-accent-text"
                : currentIsLight
                  ? "bg-white border-slate-200 text-slate-500 hover:bg-accent-soft hover:text-accent"
                  : "bg-zinc-800 border-white/10 text-neutral-300 hover:bg-zinc-700 hover:text-white"
            }`}
            title={showWidgetMenu ? "Widget-Menü schließen" : "Widget-Menü"}
            aria-label={showWidgetMenu ? "Widget-Menü schließen" : "Widget-Menü öffnen"}
            aria-expanded={showWidgetMenu}
          >
            <MoreHorizontal size={16} strokeWidth={2.5} />
          </button>

          {showWidgetMenu && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              role="menu"
              aria-label="Widget-Aktionen"
              className={`cockpit-widget-action-menu absolute right-0 top-full z-[80] mt-1 w-56 max-w-[calc(100cqw-0.5rem)] rounded-2xl border p-1.5 shadow-2xl ${
                currentIsLight
                  ? "bg-white border-slate-200 text-slate-800"
                  : "bg-zinc-900 border-white/10 text-zinc-100"
              }`}
            >
              {!layoutLocked && (widget.type === "drawing" || widget.type === "instruction") && (
                <button role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdate({
                      settings: {
                        ...widget.settings,
                        isDirectMode: !widget.settings?.isDirectMode,
                      },
                    });
                    setShowWidgetMenu(false);
                  }}
                  className="w-full min-h-11 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <Rocket size={14} />
                  <span>{isDirect ? "Fenstermodus" : "Direktmodus"}</span>
                </button>
              )}

              {!isDirect && onMinimize && (
                <button role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWidgetMenu(false);
                    onMinimize();
                  }}
                  className="w-full min-h-11 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <Minus size={14} />
                  <span>Minimieren</span>
                </button>
              )}

              {!isDirect && (
                <button role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus();
                    setIsMaximized(!isMaximized);
                    setShowWidgetMenu(false);
                  }}
                  className="w-full min-h-11 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isMaximized ? "Vollbild beenden" : "Maximieren"}</span>
                </button>
              )}

              {!layoutLocked && (
                <button role="menuitem"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocus();
                    setShowWidgetMenu(false);
                    setShowExactSizeInputs(false);
                    setShowSizeConfig(true);
                  }}
                  className="w-full min-h-11 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <SlidersHorizontal size={14} />
                  <span>Größe</span>
                </button>
              )}

              {!layoutLocked && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-white/10 my-1" />
                  <button role="menuitem"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWidgetMenu(false);
                      onClose();
                    }}
                    className="w-full min-h-11 px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left"
                  >
                    <X size={14} />
                    <span>Widget schließen</span>
                  </button>
                </>
              )}
            </div>
          )}

          {showSizeConfig && (
            <form
              onSubmit={handleApplySizeConfig}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Größe des Widgets anpassen"
              className={`cockpit-widget-size-popover absolute top-full right-0 mt-1 p-3 rounded-2xl shadow-2xl border w-72 max-w-[calc(100cqw-0.5rem)] z-[80] flex flex-col gap-3 ${
                currentIsLight
                  ? "bg-white border-slate-200"
                  : "bg-zinc-900 border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-black">Widget-Größe</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed opacity-60">Schnell eine passende Größe wählen oder exakt einstellen.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSizeConfig(false);
                    setShowExactSizeInputs(false);
                  }}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg opacity-60 hover:opacity-100"
                  aria-label="Größeneinstellung schließen"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="cockpit-widget-size-presets grid grid-cols-3 gap-1.5" aria-label="Größen-Voreinstellungen">
                <button type="button" onClick={() => applySizePreset("fit")}
                  className="cockpit-widget-size-preset min-h-12 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:border-accent hover:bg-accent-soft">
                  Passend
                </button>
                <button type="button" onClick={() => applySizePreset("large")}
                  className="cockpit-widget-size-preset min-h-12 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 hover:border-accent hover:bg-accent-soft">
                  Groß
                </button>
                <button type="button" onClick={() => applySizePreset("board")}
                  className="cockpit-widget-size-preset min-h-12 rounded-xl border border-accent bg-accent-soft px-2 text-xs font-black text-accent">
                  Tafelfläche
                </button>
              </div>

              <button type="button"
                onClick={() => setShowExactSizeInputs(value => !value)}
                aria-expanded={showExactSizeInputs}
                className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-100">
                {showExactSizeInputs ? "▴ Genaue Werte ausblenden" : "▾ Genau einstellen"}
              </button>

              {showExactSizeInputs && (
                <>
                  <div className="cockpit-widget-exact-grid grid grid-cols-2 gap-2">
                    <label className="text-[10px] font-bold text-slate-500">
                      Breite · % der Tafel
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={sizeInputWidth}
                        onChange={(e) => setSizeInputWidth(e.target.value)}
                        className={`mt-1 w-full min-h-11 p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${
                          currentIsLight
                            ? "bg-slate-50 border-slate-200 focus:border-accent"
                            : "bg-zinc-800 border-white/10 focus:border-accent"
                        }`}
                      />
                    </label>
                    <label className="text-[10px] font-bold text-slate-500">
                      Höhe · % der Tafel
                      <input
                        type="number"
                        min="10"
                        max="100"
                        value={sizeInputHeight}
                        onChange={(e) => setSizeInputHeight(e.target.value)}
                        className={`mt-1 w-full min-h-11 p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${
                          currentIsLight
                            ? "bg-slate-50 border-slate-200 focus:border-accent"
                            : "bg-zinc-800 border-white/10 focus:border-accent"
                        }`}
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="cockpit-widget-size-apply w-full min-h-11 py-2 bg-accent hover:bg-accent-hover text-accent-text rounded-xl text-xs font-black flex items-center justify-center gap-1 transition-colors"
                  >
                    <Check size={14} />
                    Größe anwenden
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Widget Content Area */}
      <div ref={contentViewportRef} className="flex-grow overflow-hidden relative min-h-0 min-w-0">
        <div
          data-widget-content={widget.type}
          data-density={viewportDensity}
          className="cockpit-widget-content absolute inset-0 flex min-h-0 min-w-0 flex-col overflow-auto"
          onPointerDown={isFreeMascot ? handleMascotPointerDown : undefined}
          onClickCapture={isFreeMascot ? handleMascotClickCapture : undefined}
          style={
            !isLegacyScaled
              ? {
                  width: "100%",
                  height: "100%",
                  padding: "0px",
                  overflow: WIDGET_VIEWPORT_OVERFLOW,
                }
              : {
                  transformOrigin: "top left",
                  transform: `scale(${contentScale})`,
                  width: `${100 / contentScale}%`,
                  height: `${100 / contentScale}%`,
                  padding: `${legacyPadding}px`,
                  fontSize: calculateWidgetFontSize(contentScale),
                  overflow: WIDGET_VIEWPORT_OVERFLOW,
                }
          }
        >
          {children}
        </div>
      </div>

      {/* Touch- and keyboard-safe resize handle bottom right */}
      {!layoutLocked && !isDirect && !isMaximized && (
        <button
          type="button"
          onPointerDown={handlePointerDownResize}
          onKeyDown={handleResizeKeyDown}
          onClick={(event) => event.stopPropagation()}
          aria-label="Widget-Größe ändern"
          title="Ziehen zum Ändern · Pfeiltasten für feine Anpassung"
          className={`cockpit-widget-resize-handle absolute bottom-0 right-0 w-11 h-11 cursor-se-resize flex items-end justify-end p-2 group z-50 touch-none rounded-tl-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${isFreeMascot ? "mascot-widget-resize opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100" : ""}`}
          style={{ touchAction: "none" }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 10 10"
            className={`transition-colors ${currentIsLight ? "text-slate-300 group-hover:text-accent" : "text-white/30 group-hover:text-accent"}`}
            aria-hidden="true"
          >
            <path
              d="M10 1 L1 10 M10 5 L5 10"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
  // Only the class mascot is portaled to the local cockpit root; no global FAB.
  return isFreeMascot ? (mascotPortalTarget ? createPortal(widgetNode, mascotPortalTarget) : null) : widgetNode;
};
