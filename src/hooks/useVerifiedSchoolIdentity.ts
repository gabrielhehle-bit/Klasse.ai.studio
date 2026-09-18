import React from 'react';
import { ACCOUNT_SESSION_CHANGED_EVENT } from '../lib/accountSyncService';

export function useVerifiedSchoolIdentity() {
  const [verified, setVerified] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const response = await fetch('/api/access/status', { cache: 'no-store' });
      if (!response.ok) {
        setVerified(false);
        return;
      }
      const data = await response.json();
      setVerified(Boolean(data?.authenticated && data?.identity?.schoolDomain && data?.identity?.schoolCode));
    } catch {
      // Fail closed: Lehrerzimmer remains hidden until school identity can be confirmed.
      setVerified(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    const onAccountChanged = () => void refresh();
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };

    window.addEventListener(ACCOUNT_SESSION_CHANGED_EVENT, onAccountChanged);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener(ACCOUNT_SESSION_CHANGED_EVENT, onAccountChanged);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  return { verified, refresh };
}
