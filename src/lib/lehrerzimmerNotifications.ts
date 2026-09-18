export const LEHRERZIMMER_UNREAD_CHANGED_EVENT = 'klassio-lehrerzimmer-unread-changed';

export interface LehrerzimmerUnreadItem {
  id: string;
  title: string;
  body: string;
  authorName: string;
  updatedAt: string;
}

export interface LehrerzimmerUnreadSummary {
  count: number;
  items: LehrerzimmerUnreadItem[];
}

export function notifyLehrerzimmerUnreadChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(LEHRERZIMMER_UNREAD_CHANGED_EVENT));
  }
}

export async function fetchLehrerzimmerUnreadSummary(): Promise<LehrerzimmerUnreadSummary | null> {
  let response: Response;
  try {
    response = await fetch('/api/lehrerzimmer/unread', { cache: 'no-store' });
  } catch {
    throw new Error('Lehrerzimmer ist gerade nicht erreichbar.');
  }

  if (response.status === 401 || response.status === 403) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || 'Ungelesene Lehrerzimmer-Nachrichten konnten nicht geladen werden.');
  }
  return {
    count: Number.isFinite(data?.count) ? Math.max(0, Number(data.count)) : 0,
    items: Array.isArray(data?.items) ? data.items : [],
  };
}

export async function markLehrerzimmerPostsRead(postIds: string[]): Promise<void> {
  const ids = [...new Set(postIds.filter(Boolean))];
  if (!ids.length) return;

  let response: Response;
  try {
    response = await fetch('/api/lehrerzimmer/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: ids }),
    });
  } catch {
    return;
  }

  if (response.status === 401 || response.status === 403) return;
  if (!response.ok) return;
  notifyLehrerzimmerUnreadChanged();
}
