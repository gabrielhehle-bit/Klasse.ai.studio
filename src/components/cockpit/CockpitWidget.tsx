import React, { useRef, useState, useEffect } from "react";
import { X, Settings, PenTool, SlidersHorizontal, Check, Maximize2, Minimize2, LockKeyhole } from "lucide-react";
import { CockpitWidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { WIDGET_MIN_SIZES } from "./widgetLayout";

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
  pet: { w: 26, h: 38 },
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
  const [sizeInputWidth, setSizeInputWidth] = useState("");
  const [sizeInputHeight, setSizeInputHeight] = useState("");
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync inputs with widget dimensions when config opens or dims change externally
  useEffect(() => {
    setSizeInputWidth(Math.round(widget.w).toString());
    setSizeInputHeight(Math.round(widget.h).toString());
  }, [widget.w, widget.h, showSizeConfig]);

  const handleApplySizeConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageRef.current) return;
    const stageRect = stageRef.current.getBoundingClientRect();

    // Clamp values roughly to sensible percentages
    const wRaw = parseInt(sizeInputWidth, 10);
    const hRaw = parseInt(sizeInputHeight, 10);
    if (!isNaN(wRaw) && !isNaN(hRaw)) {
      const wNum = Math.max(10, Math.min(100, wRaw));
      const hNum = Math.max(10, Math.min(100, hRaw));

      onUpdate({ w: wNum, h: hNum });
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

      const minConfig = WIDGET_MIN_SIZES[widget.type];
      const minW = minConfig?.minW || 160;
      const minH = minConfig?.minH || 130;

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

  const labelMapping: Record<string, string> = {
    clock: "⏱️ Uhrzeit & Datum",
    timer: "⏳ Timer",
    trafficlight: "🚦 Ampel",
    randomname: "🎯 Zufallsschüler",
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
    pet: "🐾 Klassentier",
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
  const scaleX = isMaximized ? 96 / opt.w : widget.w / opt.w;
  const scaleY = isMaximized ? 96 / opt.h : widget.h / opt.h;
  const contentScale = Math.min(4, Math.min(scaleX, scaleY));
  const isDirect = !!widget.settings?.isDirectMode;

  return (
    <div
      ref={widgetRef}
      role="group"
      aria-label={`${labelMapping[widget.type] || widget.type} Widget`}
      className={`cockpit-widget-container absolute flex flex-col transition-[transform,border-color,shadow,background-color,opacity,border-radius,box-shadow,ring-color] duration-300 ease-out select-none group animate-in fade-in zoom-in-95 ${
        isDirect
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
        left: isDirect ? "0" : isMaximized ? "2%" : `${widget.x}%`,
        top: isDirect ? "0" : isMaximized ? "2%" : `${widget.y}%`,
        width: isDirect ? "100%" : isMaximized ? "96%" : `${Math.max(5, widget.w)}%`,
        height: isDirect ? "100%" : isMaximized ? "96%" : `${Math.max(5, widget.h)}%`,
        zIndex: isDirect ? 0 : isMaximized ? 9999 : zIndex,
        touchAction: isDirect || layoutLocked ? "auto" : "none",
      }}
      onClick={onFocus}
    >
      {/* Header bar / Drag handle - static in flow so it doesn't overlap content */}
      <div
        onPointerDown={isDirect || isMaximized || layoutLocked ? undefined : handlePointerDownDrag}
        className={`${isDirect ? "absolute top-0 left-0 right-0 h-11 opacity-40 hover:opacity-100 pointer-events-auto border-b-0 bg-black/10 dark:bg-white/10 text-slate-400 backdrop-blur-md rounded-t-xl" : "w-full relative h-11 opacity-100 pointer-events-auto " + (currentIsLight ? "bg-white/95 border-slate-200/60 text-slate-700 shadow-sm backdrop-blur-xl rounded-t-[23px]" : "bg-zinc-900/95 border-white/10 text-neutral-200 shadow-sm backdrop-blur-xl rounded-t-[23px]")} z-40 px-3 py-1 flex items-center justify-between select-none shrink-0 border-b transition-all duration-300 cursor-default`}
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

        {/* Right Side: Rigid control toolbar that never wraps or shifts */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-nowrap pointer-events-auto">
          {headerExtra}

          {/* Toggle Direct Mode button for drawing or instruction */}
          {!layoutLocked && (widget.type === "drawing" || widget.type === "instruction") && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  settings: {
                    ...widget.settings,
                    isDirectMode: !widget.settings?.isDirectMode,
                  },
                });
              }}
              className={`px-2 py-1 select-none flex items-center gap-1 shrink-0 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                isDirect
                  ? "bg-rose-500 border-rose-600 text-white shadow-md scale-102"
                  : currentIsLight
                    ? "bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "bg-zinc-800 border-white/5 text-slate-400 hover:bg-zinc-700 hover:text-white"
              }`}
              title={
                isDirect
                  ? "Direkt-Modus verlassen (Fenster-Modus)"
                  : "Direkt-Modus einschalten (Vollbild & Hintergrund sperren)"
              }
            >
              <span>🚀</span>
              <span>{isDirect ? "Fenster" : "Direkt"}</span>
            </button>
          )}

          {!isDirect && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setIsMaximized(!isMaximized);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 cursor-pointer border shadow-sm shrink-0 ${
                isMaximized
                  ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 shadow-md"
                  : currentIsLight
                    ? "bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                    : "bg-zinc-800 border-white/5 text-neutral-400 hover:bg-zinc-700 hover:text-white hover:border-white/20"
              }`}
              title={isMaximized ? "Vollbild beenden" : "Vollbild (Maximieren)"}
              aria-label={isMaximized ? "Vollbild beenden" : "Widget maximieren"}
            >
              {isMaximized ? <Minimize2 size={12} strokeWidth={2.5} /> : <Maximize2 size={12} strokeWidth={2.5} />}
            </button>
          )}

          {showSettingsButton && onSettingsToggle && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSettingsToggle();
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 cursor-pointer border shadow-sm shrink-0 ${
                currentIsLight
                  ? "bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                  : "bg-zinc-800 border-white/5 text-neutral-400 hover:bg-zinc-700 hover:text-white hover:border-white/20"
              }`}
              title="Einstellungen öffnen"
              aria-label="Widget-Einstellungen öffnen"
            >
              <Settings size={12} strokeWidth={2.5} />
            </button>
          )}

          {!layoutLocked && <div className="relative flex">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setShowSizeConfig(!showSizeConfig);
              }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 cursor-pointer border shadow-sm shrink-0 ${
                showSizeConfig
                  ? "bg-indigo-500 text-white border-indigo-600"
                  : currentIsLight
                    ? "bg-white border-slate-200 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
                    : "bg-zinc-800 border-white/5 text-neutral-400 hover:bg-zinc-700 hover:text-white hover:border-white/20"
              }`}
              title="Größe exakt einstellen"
              aria-label="Widget-Größe einstellen"
            >
              <SlidersHorizontal size={12} strokeWidth={2.5} />
            </button>

            {showSizeConfig && (
              <form
                onSubmit={handleApplySizeConfig}
                onPointerDown={(e) => e.stopPropagation()}
                className={`absolute top-full right-0 mt-2 p-3 rounded-xl shadow-xl border w-48 z-50 flex flex-col gap-3 ${
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
                      className={`w-full p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${currentIsLight ? "bg-slate-50 border-slate-200 focus:border-indigo-400" : "bg-zinc-800 border-white/10 focus:border-indigo-500"}`}
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
                      className={`w-full p-1.5 rounded-lg text-sm font-bold border outline-none text-center ${currentIsLight ? "bg-slate-50 border-slate-200 focus:border-indigo-400" : "bg-zinc-800 border-white/10 focus:border-indigo-500"}`}
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
          </div>}

          {!layoutLocked && <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-lg hover:scale-110 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 cursor-pointer border shadow-sm shrink-0 ${
              currentIsLight
                ? "bg-white border-slate-200 text-slate-500 hover:bg-rose-500 hover:text-white hover:border-rose-600 hover:shadow-md"
                : "bg-zinc-800 border-white/5 text-neutral-400 hover:bg-rose-500 hover:text-white hover:border-rose-600 hover:shadow-md"
            }`}
            title="Schließen"
            aria-label="Widget schließen"
          >
            <X size={12} strokeWidth={2.5} />
          </button>}
        </div>
      </div>

      {/* Widget Content Area */}
      <div className="flex-grow overflow-hidden relative min-h-0">
        <div
          className="absolute inset-0 flex flex-col overflow-y-auto no-scrollbar"
          style={
            isDirect || !!WIDGET_MIN_SIZES[widget.type] || widget.type === "instruction"
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
          className="absolute bottom-0 right-0 w-4.5 h-4.5 cursor-se-resize flex items-end justify-end p-0.5 group z-50 touch-none"
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
