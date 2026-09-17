export const ONBOARDING_COMPLETED_KEY = 'klassio_onboarding_completed_v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isOnboardingCompleted(storage: StorageLike | null = getBrowserStorage()): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(ONBOARDING_COMPLETED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markOnboardingCompleted(storage: StorageLike | null = getBrowserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(ONBOARDING_COMPLETED_KEY, '1');
  } catch {
    // Die verschlüsselte App-State-Markierung bleibt der Fallback.
  }
}

export function clearOnboardingCompleted(storage: StorageLike | null = getBrowserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(ONBOARDING_COMPLETED_KEY);
  } catch {
    // Ein fehlgeschlagener Browser-Speicherzugriff darf die App nicht blockieren.
  }
}
