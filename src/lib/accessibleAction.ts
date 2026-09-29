import { useCallback, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
  TouchEvent,
} from "react";

export type AccessibleActivationSource =
  | "click"
  | "pointer"
  | "touch"
  | "keyboard"
  | "form";

export type AccessibleActionButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "onPointerUp" | "onTouchEnd" | "onKeyDown" | "onKeyUp"
>;

const DUPLICATE_ACTIVATION_WINDOW_MS = 500;
const DUPLICATE_PHYSICAL_EVENT_WINDOW_MS = 50;

export const isAccessibleActivationKey = (key: string): boolean =>
  key === "Enter" || key === " ";

export const createAccessibleActionDispatcher = (
  action: () => void,
  now: () => number = () => Date.now(),
) => {
  let lastPhysicalSource: "pointer" | "touch" | "keyboard" | null = null;
  let lastPhysicalAt = Number.NEGATIVE_INFINITY;
  let suppressClickUntil = Number.NEGATIVE_INFINITY;

  const activate = (source: AccessibleActivationSource): boolean => {
    const timestamp = now();

    if (source === "click") {
      if (timestamp <= suppressClickUntil) {
        suppressClickUntil = Number.NEGATIVE_INFINITY;
        return false;
      }
      action();
      return true;
    }

    if (source === "pointer" || source === "touch") {
      const isDuplicatePhysicalEvent =
        lastPhysicalSource !== null &&
        lastPhysicalSource !== source &&
        timestamp - lastPhysicalAt <= DUPLICATE_PHYSICAL_EVENT_WINDOW_MS;

      if (isDuplicatePhysicalEvent) return false;

      lastPhysicalSource = source;
      lastPhysicalAt = timestamp;
      suppressClickUntil = timestamp + DUPLICATE_ACTIVATION_WINDOW_MS;
      action();
      return true;
    }

    if (source === "keyboard" && lastPhysicalSource === "keyboard" &&
        timestamp - lastPhysicalAt <= DUPLICATE_PHYSICAL_EVENT_WINDOW_MS) {
      return false;
    }

    lastPhysicalSource = "keyboard";
    lastPhysicalAt = timestamp;
    suppressClickUntil = timestamp + DUPLICATE_ACTIVATION_WINDOW_MS;
    action();
    return true;
  };

  return { activate };
};

export const useAccessibleAction = (action: () => void): {
  activate: (source: AccessibleActivationSource) => boolean;
  buttonProps: AccessibleActionButtonProps;
} => {
  const actionRef = useRef(action);
  actionRef.current = action;

  const dispatcherRef = useRef(
    createAccessibleActionDispatcher(() => actionRef.current()),
  );

  const activate = useCallback(
    (source: AccessibleActivationSource) => dispatcherRef.current.activate(source),
    [],
  );

  const onClick = useCallback(
    (_event: MouseEvent<HTMLButtonElement>) => {
      activate("click");
    },
    [activate],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      activate("pointer");
    },
    [activate],
  );

  const onTouchEnd = useCallback(
    (_event: TouchEvent<HTMLButtonElement>) => {
      activate("touch");
    },
    [activate],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!isAccessibleActivationKey(event.key) || event.repeat) return;
      event.preventDefault();
      activate("keyboard");
    },
    [activate],
  );

  const onKeyUp = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === " ") event.preventDefault();
    },
    [],
  );

  return {
    activate,
    buttonProps: { onClick, onPointerUp, onTouchEnd, onKeyDown, onKeyUp },
  };
};
