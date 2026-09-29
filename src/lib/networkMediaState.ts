export type NetworkMediaStatus =
  | "idle"
  | "loading"
  | "loaded"
  | "error"
  | "offline"
  | "timeout";

const NETWORK_FAILURE_PATTERN =
  /failed to fetch|network|connection|offline|load failed|internet/i;

export const classifyNetworkMediaError = (
  error: unknown,
  online: boolean | null = null,
): Exclude<NetworkMediaStatus, "idle" | "loading" | "loaded"> => {
  if (online === false) return "offline";

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    code?: unknown;
  } | null;
  const name = typeof candidate?.name === "string" ? candidate.name : "";
  const message =
    typeof candidate?.message === "string" ? candidate.message : "";
  const code = typeof candidate?.code === "string" ? candidate.code : "";
  const status =
    typeof candidate?.status === "number" ? candidate.status : undefined;

  if (
    name === "AbortError" ||
    code === "TIMEOUT" ||
    /timeout|timed out/i.test(message)
  ) {
    return "timeout";
  }

  if (status !== undefined && status >= 400) return "error";
  if (error instanceof TypeError || NETWORK_FAILURE_PATTERN.test(message)) {
    return "offline";
  }

  return "error";
};

export const getNetworkMediaStatusMessage = (
  status: NetworkMediaStatus,
  label = "Inhalt",
): string => {
  switch (status) {
    case "idle":
      return `${label} ist bereit.`;
    case "loading":
      return `${label} wird geladen…`;
    case "loaded":
      return `${label} geladen.`;
    case "offline":
      return `${label} ist offline. Bitte Verbindung prüfen.`;
    case "timeout":
      return `${label} braucht zu lange. Bitte erneut versuchen.`;
    case "error":
      return `${label} konnte nicht geladen werden.`;
  }
};

export const isNetworkMediaRetryable = (status: NetworkMediaStatus): boolean =>
  status === "error" || status === "offline" || status === "timeout";
