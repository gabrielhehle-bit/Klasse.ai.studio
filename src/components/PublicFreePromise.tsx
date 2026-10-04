import React from 'react';

function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

export default function PublicFreePromise() {
  const [path, setPath] = React.useState(() => currentPath());
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      const nextPath = currentPath();
      setPath(nextPath);

      if (nextPath !== '/' && nextPath !== '/demo') {
        if (mounted) setShow(false);
        return;
      }

      try {
        const response = await fetch('/api/access/status', { credentials: 'same-origin' });
        const data = await response.json();
        if (mounted) setShow(data?.authenticated !== true);
      } catch {
        if (mounted) setShow(true);
      }
    };

    void refresh();
    const interval = window.setInterval(() => {
      if (currentPath() !== path) void refresh();
    }, 500);
    const onPopState = () => void refresh();
    window.addEventListener('popstate', onPopState);

    return () => {
      mounted = false;
      window.clearInterval(interval);
      window.removeEventListener('popstate', onPopState);
    };
  }, [path]);

  if (!show || (path !== '/' && path !== '/demo')) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[76px] z-[120] flex justify-center px-3 sm:top-[84px]">
      <div className="pointer-events-auto flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-2xl border border-emerald-200 bg-emerald-50/95 px-4 py-2.5 text-center text-[0.7rem] font-black text-emerald-900 shadow-lg shadow-emerald-950/5 backdrop-blur-xl sm:rounded-full sm:px-5 sm:text-xs">
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">0 € dauerhaft</span>
        <span>Kein Abo.</span>
        <span>Keine Paywall.</span>
        <span>Alle Funktionen frei.</span>
        <span className="font-bold text-emerald-700">Freiwillige Unterstützung statt Bezahlschranke.</span>
      </div>
    </div>
  );
}
