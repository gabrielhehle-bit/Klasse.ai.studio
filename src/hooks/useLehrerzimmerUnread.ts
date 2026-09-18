import React from 'react';
import {
  LEHRERZIMMER_UNREAD_CHANGED_EVENT,
  fetchLehrerzimmerUnreadSummary,
  type LehrerzimmerUnreadSummary,
} from '../lib/lehrerzimmerNotifications';

const EMPTY_SUMMARY: LehrerzimmerUnreadSummary = { count: 0, items: [] };

export function useLehrerzimmerUnread(pollMs = 10_000) {
  const [summary, setSummary] = React.useState<LehrerzimmerUnreadSummary>(EMPTY_SUMMARY);

  const refresh = React.useCallback(async () => {
    try {
      const next = await fetchLehrerzimmerUnreadSummary();
      setSummary(next || EMPTY_SUMMARY);
    } catch {
      // Lehrerzimmer-Hinweise dürfen die übrige App bei Netzwerkproblemen nicht stören.
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    const onFocus = () => void refresh();
    const onChanged = () => void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);

    window.addEventListener('focus', onFocus);
    window.addEventListener(LEHRERZIMMER_UNREAD_CHANGED_EVENT, onChanged);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener(LEHRERZIMMER_UNREAD_CHANGED_EVENT, onChanged);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pollMs, refresh]);

  return { summary, refresh };
}
