export function isTrustedOAuthPopupMessage(
  eventOrigin: string,
  eventSource: unknown,
  expectedOrigin: string,
  expectedPopup: unknown,
): boolean {
  return Boolean(expectedPopup) && eventOrigin === expectedOrigin && eventSource === expectedPopup;
}
