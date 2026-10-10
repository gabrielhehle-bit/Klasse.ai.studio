import { SMARTBOARD_TOUCH_TARGET_MIN } from "../../lib/smartboardTokens";

export {
  SMARTBOARD_FOCUS_RING_CLASS,
  SMARTBOARD_GAP_MAX,
  SMARTBOARD_GAP_MIN,
  SMARTBOARD_PRIMARY_ACTION_CLASS,
  SMARTBOARD_SECONDARY_ACTION_CLASS,
  SMARTBOARD_TOUCH_TARGET_MIN,
} from "../../lib/smartboardTokens";

import { useState, useEffect, useRef, RefObject } from 'react';

export type WidgetSizeCategory = 'compact' | 'standard' | 'large' | 'fullscreen';

export interface WidgetDimensions {
  width: number;
  height: number;
  category: WidgetSizeCategory;
  isCompact: boolean;
  isStandard: boolean;
  isLarge: boolean;
  isXL: boolean;
  isShort: boolean;
  isVeryShort: boolean;
}

export interface WidgetMinSizeConfig {
  minW: number;
  minH: number;
  prefW?: number;
  prefH?: number;
}

/**
 * Verbindliche Mindestgrößen für Widgets
 */
export const WIDGET_MIN_SIZES: Record<string, WidgetMinSizeConfig> = {
  dictionary: { minW: 460, minH: 540, prefW: 580, prefH: 560 },
  patternmaker: { minW: 580, minH: 520, prefW: 640, prefH: 560 },
  alphabetsoup: { minW: 640, minH: 560, prefW: 700, prefH: 560 },
  morsecode: { minW: 620, minH: 560, prefW: 700, prefH: 560 },
  hangman: { minW: 640, minH: 560, prefW: 700, prefH: 560 },
  timer: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  groups: { minW: 300, minH: 240, prefW: 460, prefH: 420 },
  kidattendance: { minW: 280, minH: 220, prefW: 480, prefH: 420 },
  classweeklyplan: { minW: 480, minH: 360, prefW: 960, prefH: 720 },
  timeline: { minW: 280, minH: 180, prefW: 420, prefH: 260 },
  clock: { minW: 280, minH: 180, prefW: 380, prefH: 260 },
  phases: { minW: 280, minH: 180, prefW: 380, prefH: 260 },
  trafficlight: { minW: 280, minH: 300, prefW: 360, prefH: 360 },
  noisemeter: { minW: 280, minH: 200, prefW: 380, prefH: 280 },
  noisescales: { minW: 280, minH: 180, prefW: 360, prefH: 260 },
  sounds: { minW: 280, minH: 200, prefW: 380, prefH: 280 },
  // Header, one readable task, page controls and input must fit at the same time.
  todo: { minW: 340, minH: 360, prefW: 460, prefH: 500 },
  dienste: { minW: 640, minH: 560, prefW: 760, prefH: 600 },
  links: { minW: 340, minH: 360, prefW: 460, prefH: 420 },
  qrcode: { minW: 320, minH: 560, prefW: 400, prefH: 600 },
  image: { minW: 280, minH: 200, prefW: 420, prefH: 340 },
  drawing: { minW: 280, minH: 200, prefW: 420, prefH: 340 },
  stopwatch: { minW: 280, minH: 200, prefW: 380, prefH: 300 },
  // All ClassRewardWidget variants need an unscaled title, reached banner,
  // visualization and 44px action row, including restored legacy windows.
  klassenglas: { minW: 300, minH: 320, prefW: 380, prefH: 340 },
  thermometer: { minW: 300, minH: 320, prefW: 380, prefH: 340 },
  classtarget: { minW: 300, minH: 320, prefW: 380, prefH: 340 },
  piggybank: { minW: 300, minH: 320, prefW: 380, prefH: 340 },
  // Keep six dice selectors and eight piano keys at their native touch size.
  dice: { minW: 360, minH: 540, prefW: 460, prefH: 560 },
  piano: { minW: 460, minH: 420, prefW: 620, prefH: 460 },
  scoreboard: { minW: 280, minH: 220, prefW: 380, prefH: 320 },
  starsreview: { minW: 320, minH: 280, prefW: 680, prefH: 600 },
  calmrain: { minW: 340, minH: 520, prefW: 460, prefH: 540 },
  breathing: { minW: 360, minH: 500, prefW: 460, prefH: 540 },
  soundmachine: { minW: 280, minH: 220, prefW: 380, prefH: 320 },
  zahlenraum: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  anschauung: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  numberline: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  kopfrechnen: { minW: 460, minH: 560, prefW: 620, prefH: 560 },
  mathcards: { minW: 460, minH: 560, prefW: 620, prefH: 560 },
  multitrainer: { minW: 460, minH: 560, prefW: 620, prefH: 560 },
  mathchain: { minW: 460, minH: 560, prefW: 620, prefH: 560 },
  sorting: { minW: 420, minH: 520, prefW: 460, prefH: 540 },
  fractionvisualizer: { minW: 460, minH: 560, prefW: 640, prefH: 620 },
  fractions: { minW: 460, minH: 560, prefW: 640, prefH: 620 },
  fractioncake: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  fractiongrid: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  calculator: { minW: 260, minH: 480, prefW: 340, prefH: 520 },
  mathbalancer: { minW: 280, minH: 220, prefW: 400, prefH: 340 },
  moneycalc: { minW: 280, minH: 220, prefW: 400, prefH: 340 },
  mathpyramid: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  clockpuzzle: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  // Geometry and angle tasks need the instrument, controls and feedback visible together.
  geometry: { minW: 360, minH: 460, prefW: 560, prefH: 560 },
  compass: { minW: 420, minH: 620, prefW: 640, prefH: 640 },
  angledetective: { minW: 360, minH: 420, prefW: 520, prefH: 480 },
  estimationjar: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  vocabulary: { minW: 640, minH: 560, prefW: 720, prefH: 560 },
  spellingdetective: { minW: 640, minH: 560, prefW: 720, prefH: 560 },
  abcorder: { minW: 640, minH: 560, prefW: 720, prefH: 560 },
  lernwoerter: { minW: 280, minH: 220, prefW: 460, prefH: 380 },
  wordbuilder: { minW: 620, minH: 560, prefW: 720, prefH: 560 },
  scrambler: { minW: 620, minH: 560, prefW: 720, prefH: 560 },
  compoundsplit: { minW: 620, minH: 560, prefW: 720, prefH: 560 },
  wordchain: { minW: 500, minH: 520, prefW: 620, prefH: 540 },
  wordgrid: { minW: 640, minH: 560, prefW: 720, prefH: 560 },
  wordscramble: { minW: 600, minH: 560, prefW: 680, prefH: 560 },
  secretcode: { minW: 440, minH: 420, prefW: 520, prefH: 460 },
  sentencebuilding: { minW: 620, minH: 560, prefW: 720, prefH: 560 },
  wordexplorer: { minW: 520, minH: 540, prefW: 620, prefH: 560 },
  rhymemachine: { minW: 500, minH: 540, prefW: 620, prefH: 560 },
  punctuationzoo: { minW: 620, minH: 560, prefW: 720, prefH: 560 },
  storyemojis: { minW: 640, minH: 560, prefW: 720, prefH: 560 },
};

export const DEFAULT_WIDGET_MIN_SIZE: WidgetMinSizeConfig = {
  minW: 260,
  minH: 180,
  prefW: 420,
  prefH: 340,
};

/**
 * Liefert für jeden Widgettyp eine sichere Mindestgröße.
 * Auch ältere/seltene Widgets dürfen dadurch nicht mehr auf unlesbar kleine
 * Fenster geschrumpft werden.
 */
export function getWidgetMinSizeConfig(widgetType: string): WidgetMinSizeConfig {
  return WIDGET_MIN_SIZES[widgetType] || DEFAULT_WIDGET_MIN_SIZE;
}

export const TOUCH_TARGET_MIN = SMARTBOARD_TOUCH_TARGET_MIN; // min 44px gemäß UI-Standard

/**
 * Ermittelt die Größenkategorie basierend auf Container-Breite
 */
export function getWidgetSizeCategory(width: number, isFullscreen: boolean = false): WidgetSizeCategory {
  if (isFullscreen || width >= 800) return 'fullscreen';
  if (width >= 550) return 'large';
  if (width >= 380) return 'standard';
  return 'compact';
}

/**
 * Hook zur reaktiven Container-Größenermittlung via ResizeObserver
 * Reagiert ausschließlich auf die tatsächliche Widget-Container-Größe!
 */
export function useWidgetSize(
  containerRef: RefObject<HTMLElement | null>,
  options?: { isFullscreen?: boolean; defaultCategory?: WidgetSizeCategory }
): WidgetDimensions {
  const [dimensions, setDimensions] = useState<WidgetDimensions>(() => {
    const cat = options?.defaultCategory || (options?.isFullscreen ? 'fullscreen' : 'standard');
    return {
      width: cat === 'compact' ? 320 : cat === 'standard' ? 440 : cat === 'large' ? 640 : 960,
      height: 350,
      category: cat,
      isCompact: cat === 'compact',
      isStandard: cat === 'standard',
      isLarge: cat === 'large',
      isXL: cat === 'fullscreen',
      isShort: false,
      isVeryShort: false,
    };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let rafId: number | null = null;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);

      if (width === 0 && height === 0) return;

      const category = getWidgetSizeCategory(width, options?.isFullscreen);

      setDimensions({
        width,
        height,
        category,
        isCompact: category === 'compact',
        isStandard: category === 'standard',
        isLarge: category === 'large',
        isXL: category === 'fullscreen',
        isShort: height < 280,
        isVeryShort: height < 220,
      });
    };

    // Initial calculation
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(updateSize);
      });
      observer.observe(el);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    } else {
      window.addEventListener('resize', updateSize);
      return () => {
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', updateSize);
      };
    }
  }, [containerRef, options?.isFullscreen]);

  return dimensions;
}

/**
 * Development Overflow Guard:
 * Erkennt horizontalen oder unzulässigen vertikalen Content-Overflow und warnt in der Konsole.
 */
export function useWidgetOverflowGuard(
  widgetType: string,
  elementRef: RefObject<HTMLElement | null>,
  enabled: boolean = true
) {
  const warnedRef = useRef(false);

  useEffect(() => {
    // Nur in Nicht-Produktionsumgebungen aktiv
    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
    if (!enabled || !isDev) return;

    const el = elementRef.current;
    if (!el) return;

    const checkOverflow = () => {
      // Puffer von 2px gegen Rundungsdifferenzen
      if (el.scrollWidth > el.clientWidth + 2) {
        if (!warnedRef.current) {
          console.warn(
            `[WidgetOverflow] ${widgetType} horizontal overflow detected: scrollWidth=${el.scrollWidth} > clientWidth=${el.clientWidth}`
          );
          warnedRef.current = true;
        }
      } else {
        warnedRef.current = false;
      }
    };

    const timeout = setTimeout(checkOverflow, 800);
    return () => clearTimeout(timeout);
  });
}
