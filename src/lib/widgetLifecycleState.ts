import { useEffect, useRef } from "react";

export const WIDGET_LIFECYCLE_STATE_KEY = "__widgetLifecycleState";

export type WidgetLifecycleSnapshot = Record<string, unknown>;

type WidgetLike = {
  id?: string;
  type?: string;
  settings?: Record<string, any>;
};

type WidgetUpdate = {
  settings?: Record<string, any>;
};

type WidgetUpdateHandler = (updates: WidgetUpdate) => void;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeSerializable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeSerializable);
  if (isRecord(value)) {
    return Object.keys(value)
      .filter((key) => value[key] !== undefined && typeof value[key] !== "function")
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        result[key] = normalizeSerializable(value[key]);
        return result;
      }, {});
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  return null;
};

export const serializeWidgetLifecycleState = (
  state: WidgetLifecycleSnapshot,
): string => JSON.stringify(normalizeSerializable(state));

export const toSerializableWidgetLifecycleState = (
  state: WidgetLifecycleSnapshot,
): WidgetLifecycleSnapshot => {
  const normalized = normalizeSerializable(state);
  return isRecord(normalized) ? normalized : {};
};

export const hasWidgetLifecycleState = (
  widget: WidgetLike | undefined,
  widgetType: string,
): boolean => {
  const stored = widget?.settings?.[WIDGET_LIFECYCLE_STATE_KEY]?.[widgetType];
  return isRecord(stored);
};

export const readWidgetLifecycleState = <T extends WidgetLifecycleSnapshot>(
  widget: WidgetLike | undefined,
  widgetType: string,
  fallback: T,
): T => {
  const stored = widget?.settings?.[WIDGET_LIFECYCLE_STATE_KEY]?.[widgetType];
  if (!isRecord(stored)) return fallback;
  return { ...fallback, ...stored } as T;
};

/**
 * Persist the serializable part of a widget's fachlicher state in the existing
 * widget settings. The parent merges settings atomically, so layout changes and
 * widget-state changes cannot remove each other.
 */
export const usePersistedWidgetLifecycleState = (
  widget: WidgetLike | undefined,
  onUpdate: WidgetUpdateHandler | undefined,
  widgetType: string,
  state: WidgetLifecycleSnapshot,
): void => {
  const widgetRef = useRef(widget);
  const onUpdateRef = useRef(onUpdate);
  const lastSerializedRef = useRef<string>("");

  widgetRef.current = widget;
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const currentWidget = widgetRef.current;
    const update = onUpdateRef.current;
    if (!currentWidget?.id || !update) return;

    const serializableState = toSerializableWidgetLifecycleState(state);
    const serializedState = serializeWidgetLifecycleState(serializableState);
    if (serializedState === lastSerializedRef.current) return;

    const existingState =
      currentWidget.settings?.[WIDGET_LIFECYCLE_STATE_KEY]?.[widgetType];
    if (
      isRecord(existingState) &&
      serializeWidgetLifecycleState(existingState) === serializedState
    ) {
      lastSerializedRef.current = serializedState;
      return;
    }

    lastSerializedRef.current = serializedState;
    update({
      settings: {
        ...(currentWidget.settings || {}),
        [WIDGET_LIFECYCLE_STATE_KEY]: {
          ...(currentWidget.settings?.[WIDGET_LIFECYCLE_STATE_KEY] || {}),
          [widgetType]: serializableState,
        },
      },
    });
  }, [state, widgetType]);
};
