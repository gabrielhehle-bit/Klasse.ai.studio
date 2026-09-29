export type WidgetAiStatus =
  | "idle"
  | "loading"
  | "success"
  | "unavailable"
  | "timeout"
  | "error";

export type WidgetAiFailureStatus = Extract<
  WidgetAiStatus,
  "unavailable" | "timeout" | "error"
>;

export const WIDGET_AI_STATUS_MESSAGES: Record<WidgetAiStatus, string> = {
  idle: "",
  loading: "KI wird vorbereitet …",
  success: "KI-Inhalt geladen.",
  unavailable:
    "Die KI ist gerade nicht erreichbar. Die Standardaufgabe bleibt verfügbar.",
  timeout:
    "Die KI hat zu lange gebraucht. Die Standardaufgabe bleibt verfügbar.",
  error:
    "Die KI konnte gerade nicht antworten. Die Standardaufgabe bleibt verfügbar.",
};

export function getWidgetAiStatusMessage(status: WidgetAiStatus): string {
  return WIDGET_AI_STATUS_MESSAGES[status];
}

export function classifyWidgetAiError(error: unknown): WidgetAiFailureStatus {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as {
          status?: unknown;
          code?: unknown;
          name?: unknown;
          message?: unknown;
        })
      : {};
  const numericStatus =
    typeof candidate.status === "number" ? candidate.status : undefined;
  const details = [
    candidate.name,
    candidate.code,
    candidate.message,
    typeof error === "string" ? error : undefined,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    numericStatus === 408 ||
    numericStatus === 504 ||
    details.includes("abort") ||
    details.includes("timeout") ||
    details.includes("timed out") ||
    details.includes("zeitüberschreit") ||
    details.includes("zu lange")
  ) {
    return "timeout";
  }

  if (
    (numericStatus !== undefined &&
      [429, 500, 502, 503].includes(numericStatus)) ||
    details.includes("429") ||
    details.includes("rate limit") ||
    details.includes("quota") ||
    details.includes("network") ||
    details.includes("netzwerk") ||
    details.includes("offline") ||
    details.includes("fetch") ||
    details.includes("unavailable") ||
    details.includes("nicht erreichbar") ||
    details.includes("ausgelastet")
  ) {
    return "unavailable";
  }

  return "error";
}
