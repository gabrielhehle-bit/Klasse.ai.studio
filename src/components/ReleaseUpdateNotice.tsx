import React from 'react';

/** Show an explicit reload prompt instead of claiming an old PWA session
 * already displays the latest deployed widgets. Never clear IndexedDB,
 * localStorage or the encrypted local vault to update a release. */
export default function ReleaseUpdateNotice() {
  const localCommit = import.meta.env.VITE_KLASSIO_BUILD_SHA || '';
  const [serverCommit, setServerCommit] = React.useState('');
  const [dismissed, setDismissed] = React.useState(false);
  React.useEffect(() => {
    if (!/^[a-f0-9]{40}$/.test(localCommit)) return;
    let live = true;
    const check = async () => {
      try {
        const response = await fetch('/api/release', { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) return;
        const release = await response.json() as { commit?: string };
        if (live && typeof release.commit === 'string' && /^[a-f0-9]{40}$/.test(release.commit)) {
          setServerCommit(release.commit);
        }
      } catch { /* Offline mode stays operational, without a false 'current' badge. */ }
    };
    const onFocus = () => { void check(); };
    void check();
    const timer = window.setInterval(onFocus, 180_000);
    window.addEventListener('focus', onFocus);
    return () => { live = false; window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [localCommit]);

  React.useEffect(() => {
    if (!serverCommit || serverCommit === localCommit) {
      setDismissed(false);
      return;
    }
    setDismissed(false);
    const hideTimer = window.setTimeout(() => setDismissed(true), 10_000);
    return () => window.clearTimeout(hideTimer);
  }, [serverCommit, localCommit]);

  if (!serverCommit || serverCommit === localCommit || dismissed) return null;
  const reload = async () => {
    // Hide the prompt immediately; the reload/update work can continue afterwards.
    setDismissed(true);
    // Workbox autoUpdate will take the refreshed service worker on activation.
    // A new navigation URL also avoids stale cached SPA navigation responses.
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations();
      await Promise.all((registrations || []).map(reg => reg.update().catch(() => {})));
    } catch { /* Normal browser refresh still works. */ }
    const url = new URL(window.location.href);
    url.searchParams.set('klassio-release', serverCommit.slice(0, 12));
    window.location.assign(url.toString());
  };
  return <aside role="status" aria-label="KLASSIO-Aktualisierung verfügbar"
    className="fixed inset-x-3 bottom-3 z-[999999] mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-300 bg-white p-4 text-slate-900 shadow-2xl">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-black">Eine neue KLASSIO-Version ist verfügbar.</p>
      <p className="mt-1 text-xs">Bitte offene Eingaben speichern. Danach kannst du die neuen Widgets laden – deine Klassen und lokalen Daten werden nicht gelöscht.</p>
      <p className="mt-1 font-mono text-[10px] text-slate-500" title={serverCommit}>
        Diese Ansicht: {localCommit.slice(0, 12)} · Server: {serverCommit.slice(0, 12)}
      </p>
    </div>
    <button type="button" onClick={() => { void reload(); }}
      className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white">Neue Version laden</button>
  </aside>;
}
