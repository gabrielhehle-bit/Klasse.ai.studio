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
  timer: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  groups: { minW: 300, minH: 240, prefW: 460, prefH: 420 },
  kidattendance: { minW: 280, minH: 220, prefW: 480, prefH: 420 },
  timeline: { minW: 280, minH: 180, prefW: 420, prefH: 260 },
  clock: { minW: 280, minH: 180, prefW: 380, prefH: 260 },
  phases: { minW: 280, minH: 180, prefW: 380, prefH: 260 },
  trafficlight: { minW: 280, minH: 180, prefW: 360, prefH: 260 },
  noisemeter: { minW: 280, minH: 200, prefW: 380, prefH: 280 },
  noisescales: { minW: 280, minH: 180, prefW: 360, prefH: 260 },
  sounds: { minW: 280, minH: 200, prefW: 380, prefH: 280 },
  todo: { minW: 280, minH: 200, prefW: 380, prefH: 320 },
  dienste: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  links: { minW: 280, minH: 200, prefW: 380, prefH: 320 },
  qrcode: { minW: 280, minH: 220, prefW: 360, prefH: 340 },
  image: { minW: 280, minH: 200, prefW: 420, prefH: 340 },
  drawing: { minW: 280, minH: 200, prefW: 420, prefH: 340 },
  stopwatch: { minW: 280, minH: 200, prefW: 380, prefH: 300 },
  klassenglas: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  scoreboard: { minW: 280, minH: 220, prefW: 380, prefH: 320 },
  calmrain: { minW: 280, minH: 220, prefW: 380, prefH: 320 },
  breathing: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  soundmachine: { minW: 280, minH: 220, prefW: 380, prefH: 320 },
  zahlenraum: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  anschauung: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  numberline: { minW: 300, minH: 220, prefW: 460, prefH: 360 },
  kopfrechnen: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  mathcards: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  multitrainer: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  mathchain: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  fractionvisualizer: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  fractions: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  fractioncake: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  fractiongrid: { minW: 280, minH: 220, prefW: 400, prefH: 360 },
  calculator: { minW: 260, minH: 280, prefW: 340, prefH: 420 },
  mathbalancer: { minW: 280, minH: 220, prefW: 400, prefH: 340 },
  moneycalc: { minW: 280, minH: 220, prefW: 400, prefH: 340 },
  mathpyramid: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  clockpuzzle: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  geometry: { minW: 280, minH: 220, prefW: 400, prefH: 340 },
  angledetective: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  estimationjar: { minW: 280, minH: 220, prefW: 380, prefH: 340 },
  vocabulary: { minW: 280, minH: 220, prefW: 460, prefH: 380 },
  spellingdetective: { minW: 280, minH: 220, prefW: 460, prefH: 380 },
  abcorder: { minW: 280, minH: 220, prefW: 460, prefH: 380 },
  lernwoerter: { minW: 280, minH: 220, prefW: 460, prefH: 380 },
  storyemojis: { minW: 280, minH: 220, prefW: 420, prefH: 340 },
};

export const TOUCH_TARGET_MIN = 44; // min 44px gemäß UI-Standard

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
