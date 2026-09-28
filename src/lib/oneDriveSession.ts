export interface OneDriveTokenData {
  access_token: string;
  refresh_token?: string | null;
  expires_at?: number;
}

const STORAGE_KEY = 'onedrive_token';

export function readOneDriveToken(): OneDriveTokenData | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OneDriveTokenData;
    if (!parsed?.access_token) return null;

    // Migrate legacy persistent tokens into session storage.
    sessionStorage.setItem(STORAGE_KEY, raw);
    localStorage.removeItem(STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
}

export function storeOneDriveToken(token: OneDriveTokenData): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  localStorage.removeItem(STORAGE_KEY);
}

export function clearOneDriveToken(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export async function getValidOneDriveToken(token = readOneDriveToken()): Promise<string | null> {
  if (!token?.access_token) return null;

  const now = Date.now();
  if (!token.expires_at || now < token.expires_at - 60_000) return token.access_token;
  if (!token.refresh_token) return null;

  const response = await fetch('/api/onedrive/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: token.refresh_token }),
  });
  if (!response.ok) {
    clearOneDriveToken();
    return null;
  }

  const refreshed = await response.json() as OneDriveTokenData;
  storeOneDriveToken(refreshed);
  return refreshed.access_token;
}

export async function connectOneDrive(): Promise<OneDriveTokenData> {
  const configResponse = await fetch('/api/onedrive/auth-url');
  const config = await configResponse.json();
  if (!configResponse.ok || !config?.configured || !config?.url) {
    throw new Error('OneDrive ist für diese KLASSIO-Installation noch nicht eingerichtet.');
  }

  const popup = window.open(config.url, 'OneDrive Login', 'width=620,height=760');
  if (!popup) throw new Error('Das OneDrive-Anmeldefenster wurde vom Browser blockiert.');

  return await new Promise<OneDriveTokenData>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      callback();
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'ONEDRIVE_AUTH_SUCCESS' && event.data?.tokenData?.access_token) {
        const token = event.data.tokenData as OneDriveTokenData;
        storeOneDriveToken(token);
        finish(() => resolve(token));
      } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
        finish(() => reject(new Error(event.data.error || 'OneDrive-Verbindung fehlgeschlagen.')));
      }
    };

    const poll = window.setInterval(() => {
      if (popup.closed) {
        finish(() => reject(new Error('OneDrive-Anmeldung wurde geschlossen.')));
      }
    }, 700);

    const timeout = window.setTimeout(() => {
      try { popup.close(); } catch {}
      finish(() => reject(new Error('OneDrive-Anmeldung ist abgelaufen.')));
    }, 120_000);

    window.addEventListener('message', onMessage);
  });
}
