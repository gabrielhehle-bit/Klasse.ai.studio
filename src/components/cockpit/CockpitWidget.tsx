import React, { useRef, useState, useEffect } from "react";
import { X, Settings, PenTool, SlidersHorizontal, Check, Maximize2, Minimize2, LockKeyhole, MoreHorizontal, Rocket } from "lucide-react";
import { CockpitWidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { WIDGET_MIN_SIZES, getWidgetMinSizeConfig } from "./widgetLayout";

interface CockpitWidgetProps {
  widget: CockpitWidgetConfig;
  onUpdate: (updates: Partial<CockpitWidgetConfig>) => void;
  onClose: () => void;
  onFocus: () => void;
  zIndex: number;
  stageRef: React.RefObject<HTMLDivElement | null>;
  currentIsLight: boolean;
  activePultThemeVars: any;
  showSettingsButton?: boolean;
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
  onFocus,
  zIndex,
  stageRef,
  currentIsLight,
  showSettingsButton,
  onSettingsToggle,
  headerExtra,
  children,
  isFocused = false,
  layoutLocked = false,
}) => {
  const { calculateWidgetFontSize } = useApp();
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const resizeStartPos = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const [showSizeConfig, setShowSizeConfig] = useState(false);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);
  const [sizeInputWidth, setSizeInputWidth] = useState("");
  const [sizeInputHeight, setSizeInputHeight] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

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
  }, [stageRef]);

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

      onUpdate({ x: xNum, y: yNum, w: wNum, h: hNum });
      setShowSizeConfig(false);
    }
  };

  const handlePointerDownDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || isMaximized || layoutLocked) return;
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

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartPos.current.x;
      const deltaY = moveEvent.clientY - dragStartPos.current.y;

      let newLeftPixels = dragStartPos.current.left + deltaX;
      let newTopPixels = dragStartPos.current.top + deltaY;

      // Snap to grid (e.g. 20px grid)
      const GRID_SIZE = 10;
      newLeftPixels = Math.round(newLeftPixels / GRID_SIZE) * GRID_SIZE;
      newTopPixels = Math.round(newTopPixels / GRID_SIZE) * GRID_SIZE;

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

    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerDownResize = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.isPrimary || isMaximized || layoutLocked) return;
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

    const handlePointerUp = (upEvent: PointerEvent) => {
      target.releasePointerCapture(upEvent.pointerId);
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
  };

  const handleSetPersistentLargeSize = () => {
    // Im Gegensatz zu "Maximieren" wird diese Größe über onUpdate im Layout gespeichert.
    setIsMaximized(false);
    onUpdate({ x: 4, y: 4, w: 92, h: 90 });
    setShowWidgetMenu(false);
    setShowSizeConfig(false);
  };

  const labelMapping: Record<string, string> = {
    clock: "⏱️ Uhrzeit & Datum",
    timer: "⏳ Timer",
    trafficlight: "🚦 Ampel",
    randomname: "🎯 Zufallsschüler",
    classweeklyplan: "📋 Wochenplan der Kinder",
    instruction: "📝 Arbeitsanweisung",
    noisemeter: "🔊 Lärm-Messer",
    vocabulary: "🔤 Lernwörter-Studio",
    lernwoerter: "🔤 Lernwörter-Studio",
    studentlist: "⭐ Schülerliste",
    kidattendance: "🖐️ Ich bin da! (Kinder)",
    groups: "👥 Gruppen",
    qrcode: "🔗 QR-Code",
    image: "🖼️ Tafelbild-Projektor",
    phases: "📈 Stundenverlauf",
    sounds: "🎵 Signal-Töne",
    todo: "✅ To-Do-Liste",
    dienste: "🧹 Klassendienste",
    klassenglas: "🫙 Klassenglas",
    links: "🔗 Material & Links",
    stopwatch: "⏱️ Stoppuhr",
    calculator: "🧮 Taschenrechner",
    dice: "🎲 Tafel-Würfel",
    weather: "☁️ Wetterbericht",
    aiquiz: "🤖 KI Lern-Quiz",
    riddle: "🧩 Scherz- & Logikrätsel",
    scoreboard: "🏆 Gruppen-Punkte",
    wheel: "🎡 Glücksrad",
    breathing: "🍃 Atempause",
    kidweather: "🕶️ Wetterfrosch",
    mathcards: "🧠 Kopfrechentrainer",
    wortsatzwerkstatt: "✍️ Wort- & Satzwerkstatt",
    scrambler: "✍️ Wort- & Satzwerkstatt",
    watertracker: "💧 Wassertracker",
    wordchain: "🔗 Wortketten-Spiel",
    moodmeter: "🙂 Stimmungsmesser",
    colormixer: "🎨 Kunst Farbmischung",
    wordgrid: "🔍 Suchgitter",
    rhythm: "🥁 Rhythmus-Klopfer",
    geometry: "📐 Geometrie-Muster",
    fractions: "◐ Bruch-Visualisierer",
    fractionvisualizer: "◐ Bruch-Visualisierer",
    wordclock: "⏰ Wort-Uhr",
    sorting: "🔢 Zahlensortierer",
    dailyquotes: "💡 Morgen-Mottos",
    dictionary: "📚 Emoji-Wörterbuch",
    piano: "🎹 Klassen-Klavier",
    bodyparts: "🦴 Körper-Entdecker",
    drawing: "🖍️ Zeichenfeld",
    pet: "🦦 Klassenmaskottchen",
    toothbrush: "🪥 Zahnputz-Station",
    challenge: "🎯 Klassen-Challenge",
    compass: "🧭 Geographie-Kompass",
    weekdays: "📅 Wochentage-Trainer",
    piggybank: "🐷 Klassen-Sparschwein",
    noisescales: "🤫 Stimmlautstärken",
    wordscramble: "🍲 Wort-Salat (Anagramm)",
    shadowshapes: "🦋 Symmetrie-Spiel",
    emotions: "🎭 Gefühls-Barometer",
    clocksync: "⏰ Uhrzeit-Macher",
    soundmemory: "🎵 Klang-Memory",
    spellingdetective: "🔤 Lernwörter-Studio",
    mathchain: "🧠 Kopfrechentrainer",
    thermometer: "🌡️ Ziel-Thermometer",
    compoundsplit: "✍️ Wort- & Satzwerkstatt",
    soundquiz: "👂 Geräusche-Quiz",
    mathduel: "⚔️ Mathe-Duell",
    shapepuzzle: "📐 Formen-Entdecker",
    guitartuner: "🎸 Gitarren-Stimmer",
    secretagent: "🕵️ Geheimagent",
    fractioncake: "◐ Bruch-Visualisierer",
    sentencebuilding: "✍️ Wort- & Satzwerkstatt",
    patternmaker: "🎨 Muster-Macher",
    wordexplorer: "🔍 Wort-Forscher",
    weightscale: "⚖️ Gewichts-Waage",
    geographyquiz: "🌍 Geo-Quiz",
    calmrain: "🌧️ Entspannungs-Regen",
    estimationjar: "🫙 Schätz-Glas",
    reflexgame: "⚡ Reflex-Spiel",
    mathpyramid: "🔺 Rechen-Pyramide",
    wastebin: "🗑️ Müll-Trenner",
    tonetrainer: "🎼 Ton-Trainer",
    angledetective: "📐 Winkel-Detektiv",
    rhymemachine: "🎤 Reim-Maschine",
    alphabetsoup: "🥣 Buchstaben-Suppe",
    divrobot: "🤖 Teilbarkeits-Roboter",
    classtarget: "🎯 Klassen-Ziel",
    morsecode: "📡 Morse-Code",
    punctuationzoo: "🦓 Satzzeichen-Zoo",
    secretcode: "🔐 Geheim-Code",
    clockpuzzle: "⏱️ Uhren-Puzzle",
    fractiongrid: "◐ Bruch-Visualisierer",
    trafficquiz: "🚲 Verkehrs-Quiz",
    wordbuilder: "✍️ Wort- & Satzwerkstatt",
    watercycle: "🌊 Wasserkreislauf",
    soundmachine: "🎵 Klang-Maschine",
    mathbalancer: "⚖️ Zahlen-Waage",
    animalvoice: "🤖 Roboter-Sounds",
    constellation: "✨ Sternbilder",
    multitrainer: "🧠 Kopfrechentrainer",
    kopfrechnen: "🧠 Kopfrechentrainer",
    moneycalc: "💶 Taschengeld",
    anschauung: "🔢 Zahlenraum-Studio",
    numberline: "🔢 Zahlenraum-Studio",
    zahlenraum: "🔢 Zahlenraum-Studio",
    storyemojis: "🎭 Story-Emojis",
    abcorder: "🔤 Lernwörter-Studio",
    planetarium: "🌍 Planetarium",
  };

  const opt = OPTIMAL_WIDGET_SIZES[widget.type] || { w: 35, h: 45 };
  const isDirect = !!widget.settings?.isDirectMode;
  const isFreeMascot = widget.type === "pet" && !isDirect;
  const safeMinSize = getWidgetMinSizeConfig(widget.type);
  const minWPercent = stageSize.width > 0 ? Math.min(100, (safeMinSize.minW / stageSize.width) * 100) : 0;
  const minHPercent = stageSize.height > 0 ? Math.min(100, (safeMinSize.minH / stageSize.height) * 100) : 0;
  const renderedW = isDirect ? 100 : isMaximized ? 96 : Math.max(5, widget.w, minWPercent);
  const renderedH = isDirect ? 100 : isMaximized ? 96 : Math.max(5, widget.h, minHPercent);
  const renderedX = isDirect ? 0 : isMaximized ? 2 : Math.max(0, Math.min(widget.x, 100 - renderedW));
  const renderedY = isDirect ? 0 : isMaximized ? 2 : Math.max(0, Math.min(widget.y, 100 - renderedH));
  const scaleX = renderedW / opt.w;
  const scaleY = renderedH / opt.h;
  const contentScale = Math.min(4, Math.min(scaleX, scaleY));

  // Moving a free-standing mascot should feel like picking up the animal, not dragging
  // an invisible widget rectangle. A short tap must still open mascot interactions.
  const suppressMascotTap = useRef(false);
  const handleMascotPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isFreeMascot || layoutLocked || isMaximized || !event.isPrimary || event.button !== 0) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    const character = target.closest<HTMLButtonElement>('.class-mascot-character');
    const stage = stageRef.current;
    if (!character || !stage) return;

    const pointerId = event.pointerId;
    const stageRect = stage.getBoundingClientRect();
    const originX = (widget.x / 100) * stageRect.width;
    const originY = (widget.y / 100) * stageRect.height;
    const startX = event.clientX;
    const startY = event.clientY;
    let dragging = false;
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
        onFocus();
      }
      const rect = widgetRef.current?.getBoundingClientRect();
      const width = rect?.width || (widget.w / 100) * stageRect.width;
      const height = rect?.height || (widget.h / 100) * stageRect.height;
      const nextX = Math.max(0, Math.min(stageRect.width - width, Math.round((originX + dx) / 10) * 10));
      const nextY = Math.max(0, Math.min(stageRect.height - height, Math.round((originY + dy) / 10) * 10));
      onUpdate({ x: (nextX / stageRect.width) * 100, y: (nextY / stageRect.height) * 100 });
    };

    const finish = (up: PointerEvent) => {
      if (up.pointerId !== pointerId) return;
      character.removeEventListener('pointermove', onMove);
      character.removeEventListener('pointerup', finish);
      character.removeEventListener('pointercancel', finish);
      if (character.hasPointerCapture(pointerId)) character.releasePointerCapture(pointerId);
      // Browser-generated click follows pointerup in the same task; suppress only
      // the drag's click, never the next deliberate tap.
      window.setTimeout(() => { suppressMascotTap.current = false; }, 0);
    };

    character.addEventListener('pointermove', onMove);
    character.addEventListener('pointerup', finish);
    character.addEventListener('pointercancel', finish);
  };

  const handleMascotClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressMascotTap.current) return;
    const target = event.target;
    if (target instanceof Element && target.closest('.class-mascot-character')) {
      event.preventDefault();
      event.stopPropagation();
      suppressMascotTap.current = false;
    }
  };

  return (
    <div
      ref={widgetRef}
      role="group"
      aria-label={`${labelMapping[widget.type] || widget.type} Widget`}
      className={`cockpit-widget-container absolute flex flex-col transition-[transform,border-color,shadow,background-color,opacity,border-radius,box-shadow,ring-color] duration-300 ease-out select-none group animate-in fade-in zoom-in-95 ${isFreeMascot ? "cockpit-free-mascot rounded-none border-0 bg-transparent shadow-none ring-0 backdrop-blur-none" : ""} ${
        isDirect || isFreeMascot
          ? "rounded-none border-none bg-transparent shadow-none"
          : "rounded-[24px] backdrop-blur-3xl ring-offset-transparent transition-all " +
            (currentIsLight
              ? isFocused
                ? "bg-white border border-indigo-400/80 ring-4 ring-indigo-500/20 shadow-[0_24px_55px_rgba(79,70,229,0.12),0_1px_3px_rgba(79,70,229,0.04)] text-slate-800"
                : "bg-white/95 border border-slate-200/70 shadow-[0_12px_40px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.02)] text-slate-800"
              : isFocused
                ? "bg-zinc-900 border border-indigo-500/40 ring-4 ring-indigo-500/20 shadow-[0_24px_55px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.12)] text-neutral-100"
                : "bg-zinc-950/85 border border-white/5 shadow-[0_16px_45px_rgba(0,0,0,0.35),0_0_0_1px_rgba(255,255,255,0.06)] text-neutral-100")
      }`}
      style={{
        containerType: "inline-size",
        left: `${renderedX}%`,
        top: `${renderedY}%`,
        width: `${renderedW}%`,
        height: `${renderedH}%`,
        zIndex: isDirect ? 0 : isMaximized ? 9999 : zIndex,
        touchAction: isDirect || layoutLocked || isFreeMascot ? "auto" : "none",
      }}
      onClick={onFocus}
    >
      {/* Header bar / Drag handle - static in flow so it doesn't overlap content */}
      <div
        onPointerDown={isDirect || isMaximized || layoutLocked ? undefined : handlePointerDownDrag}
        className={`${isFreeMascot ? "mascot-widget-toolbar w-full relative h-11 border-0 bg-transparent text-inherit opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100" : isDirect ? "absolute top-0 left-0 right-0 h-11 opacity-40 hover:opacity-100 pointer-events-auto border-b-0 bg-black/10 dark:bg-white/10 text-slate-400 backdrop-blur-md rounded-t-xl" : "w-full relative h-11 opacity-100 pointer-events-auto " + (currentIsLight ? "bg-white/95 border-slate-200/60 text-slate-700 shadow-sm backdrop-blur-xl rounded-t-[23px]" : "bg-zinc-900/95 border-white/10 text-neutral-200 shadow-sm backdrop-blur-xl rounded-t-[23px]")} z-40 px-3 py-1 flex items-center justify-between select-none shrink-0 border-b transition-all duration-300 cursor-default`}
        style={{ touchAction: isDirect || layoutLocked ? "auto" : "none" }}
      >
        {/* Left Side: status dot, Title, and Pen icon button placed directly right next to the title label */}
        <div className={`flex items-center gap-2 min-w-0 flex-1 flex-nowrap mr-2 pointer-events-auto ${isMaximized || layoutLocked ? "cursor-default" : "cursor-grab active:cursor-grabbing"}`}>
          {!isDirect && !layoutLocked && (
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
                      ? "bg-indigo-600 dark:bg-indigo-400"
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

          <span className="cockpit-widget-title text-xs font-semibold truncate opacity-90 text-inherit select-none min-w-0">
            {labelMapping[widget.type] || widget.type.toUpperCase()}
          </span>

          {/* Elegant Pen Button shown directly right next to the title (neben Widget) */}
          {widget.type === "drawing" && onSettingsToggle && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSettingsToggle();
              }}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider transition-all outline-none cursor-pointer shrink-0 ml-1.5 shadow-xs border ${
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
        <div className="relative flex items-center gap-1.5 shrink-0 ml-auto pointer-events-auto">
          {headerExtra}

          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowWidgetMenu((value) => !value);
              setShowSizeConfig(false);
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg border shadow-sm transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer ${
              showWidgetMenu
                ? "bg-indigo-600 border-indigo-600 text-white"
                : currentIsLight
                  ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  : "bg-zinc-800 border-white/10 text-neutral-300 hover:bg-zinc-700 hover:text-white"
            }`}
            title="Widget-Menü"
            aria-label="Widget-Menü öffnen"
            aria-expanded={showWidgetMenu}
          >
            <MoreHorizontal size={16} strokeWidth={2.5} />
          </button>

          {showWidgetMenu && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className={`absolute right-0 top-11 z-[80] w-52 rounded-xl border p-1.5 shadow-2xl ${
                currentIsLight
                  ? "bg-white border-slate-200 text-slate-800"
                  : "bg-zinc-900 border-white/10 text-zinc-100"
              }`}
            >
              {!layoutLocked && (widget.type === "drawing" || widget.type === "instruction") && (
                <button
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
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <Rocket size={14} />
                  <span>{isDirect ? "Fenstermodus" : "Direktmodus"}</span>
                </button>
              )}

              {!isDirect && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMaximized(!isMaximized);
                    setShowWidgetMenu(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  <span>{isMaximized ? "Vollbild beenden" : "Maximieren"}</span>
                </button>
              )}

              {!isDirect && !layoutLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSetPersistentLargeSize();
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                  title="Widget dauerhaft groß auf der Smartboard-Fläche ablegen"
                >
                  <LockKeyhole size={14} />
                  <span>Groß fest einstellen</span>
                </button>
              )}

              {showSettingsButton && onSettingsToggle && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSettingsToggle();
                    setShowWidgetMenu(false);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <Settings size={14} />
                  <span>Einstellungen</span>
                </button>
              )}

              {!layoutLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowWidgetMenu(false);
                    setShowSizeConfig(true);
                  }}
                  className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-white/10 text-left"
                >
                  <SlidersHorizontal size={14} />
                  <span>Größe</span>
                </button>
              )}

              {!layoutLocked && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-white/10 my-1" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowWidgetMenu(false);
                      onClose();
                    }}
                    className="w-full px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left"
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
              className={`absolute top-11 right-0 p-3 rounded-xl shadow-xl border w-48 z-[80] flex flex-col gap-3 ${
                currentIsLight
                  ? "bg-white border-slate-200"
                  : "bg-zinc-900 border-white/10"
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-60">
                  Größe (in %)
                </span>
                <button
                  type="button"
                  onClick={() => setShowSizeConfig(false)}
                  className="opacity-50 hover:opacity-100"
                  aria-label="Größeneinstellung schließen"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[8px] uppercase font-bold opacity-50 block mb-1">
                    Breite
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={sizeInputWidth}
                    onChange={(e) => setSizeInputWidth(e.target.value)}
                    className={`w-full p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${
                      currentIsLight
                        ? "bg-slate-50 border-slate-200 focus:border-indigo-400"
                        : "bg-zinc-800 border-white/10 focus:border-indigo-500"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[8px] uppercase font-bold opacity-50 block mb-1">
                    Höhe
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={sizeInputHeight}
                    onChange={(e) => setSizeInputHeight(e.target.value)}
                    className={`w-full p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${
                      currentIsLight
                        ? "bg-slate-50 border-slate-200 focus:border-indigo-400"
                        : "bg-zinc-800 border-white/10 focus:border-indigo-500"
                    }`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 mt-1 transition-colors"
              >
                <Check size={12} />
                Anwenden
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Widget Content Area */}
      <div className="flex-grow overflow-hidden relative min-h-0">
        <div
          className="absolute inset-0 flex flex-col overflow-auto no-scrollbar"
          onPointerDown={isFreeMascot ? handleMascotPointerDown : undefined}
          onClickCapture={isFreeMascot ? handleMascotClickCapture : undefined}
          style={
            isDirect || isFreeMascot || !!WIDGET_MIN_SIZES[widget.type] || widget.type === "instruction"
              ? {
                  width: "100%",
                  height: "100%",
                  padding: "0px",
                }
              : {
                  transformOrigin: "top left",
                  transform: `scale(${contentScale})`,
                  width: `${100 / contentScale}%`,
                  height: `${100 / contentScale}%`,
                  padding: "16px",
                  fontSize: calculateWidgetFontSize(contentScale),
                }
          }
        >
          {children}
        </div>
      </div>

      {/* Resize handle bottom right */}
      {!layoutLocked && !isDirect && (
        <div
          onPointerDown={handlePointerDownResize}
          className={`absolute bottom-0 right-0 w-4.5 h-4.5 cursor-se-resize flex items-end justify-end p-0.5 group z-50 touch-none ${isFreeMascot ? "mascot-widget-resize opacity-0 group-hover:opacity-100 focus-within:opacity-100" : ""}`}
          style={{ touchAction: "none" }}
        >
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className={`transition-colors ${currentIsLight ? "text-slate-300 group-hover:text-amber-500" : "text-white/20 group-hover:text-amber-400"}`}
          >
            <path
              d="M8 0 L0 8 M8 4 L4 8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
};
