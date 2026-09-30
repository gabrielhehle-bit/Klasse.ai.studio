export type MediaPlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "muted"
  | "unavailable"
  | "offline"
  | "error";

const MEDIA_UNAVAILABLE_PATTERN =
  /audio ?context|autoplay|not supported|permission|user gesture/i;
const MEDIA_OFFLINE_PATTERN =
  /network|offline|failed to fetch|connection|load failed/i;

export const classifyMediaPlaybackError = (
  error: unknown,
  online: boolean | null = null,
): "unavailable" | "offline" | "error" => {
  if (online === false) return "offline";

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
  } | null;
  const name = typeof candidate?.name === "string" ? candidate.name : "";
  const message =
    typeof candidate?.message === "string" ? candidate.message : "";
  const code = typeof candidate?.code === "string" ? candidate.code : "";

  if (
    name === "NotAllowedError" ||
    name === "NotSupportedError" ||
    code === "NOT_SUPPORTED" ||
    MEDIA_UNAVAILABLE_PATTERN.test(message)
  ) {
    return "unavailable";
  }

  if (error instanceof TypeError || MEDIA_OFFLINE_PATTERN.test(message)) {
    return "offline";
  }

  return "error";
};

export const getMediaPlaybackStatusMessage = (
  status: MediaPlaybackStatus,
  label = "Ton",
): string => {
  switch (status) {
    case "idle":
      return `${label} bereit.`;
    case "loading":
      return `${label} wird geladen…`;
    case "ready":
      return `${label} bereit.`;
    case "playing":
      return `${label} läuft.`;
    case "paused":
      return `${label} pausiert.`;
    case "muted":
      return `${label} stummgeschaltet.`;
    case "unavailable":
      return `${label} nicht verfügbar.`;
    case "offline":
      return `${label} offline.`;
    case "error":
      return `${label} konnte nicht abgespielt werden.`;
  }
};

export const isMediaPlaybackRetryable = (status: MediaPlaybackStatus): boolean =>
  status === "unavailable" || status === "offline" || status === "error";
