export const SMARTBOARD_TOUCH_TARGET_MIN = 44 as const;
export const SMARTBOARD_GAP_MIN = 8 as const;
export const SMARTBOARD_GAP_MAX = 12 as const;

export const SMARTBOARD_FOCUS_RING_CLASS =
  "focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus-ring";

export const SMARTBOARD_PRIMARY_ACTION_CLASS =
  "bg-accent text-accent-text hover:bg-accent-hover active:bg-accent-active focus-visible:ring-4 focus-visible:ring-accent/30";

export const SMARTBOARD_SECONDARY_ACTION_CLASS =
  "bg-surface-card text-text border-border hover:bg-surface-subtle focus-visible:ring-4 focus-visible:ring-accent/30";

export interface SmartboardControlStyle {
  minWidth: string;
  minHeight: string;
}

export const getSmartboardControlStyle = (
  requestedSize = SMARTBOARD_TOUCH_TARGET_MIN,
): SmartboardControlStyle => {
  const size = Math.max(SMARTBOARD_TOUCH_TARGET_MIN, requestedSize);
  return {
    minWidth: `${size}px`,
    minHeight: `${size}px`,
  };
};

export const isSmartboardTouchTarget = (width: number, height: number): boolean =>
  width >= SMARTBOARD_TOUCH_TARGET_MIN && height >= SMARTBOARD_TOUCH_TARGET_MIN;
