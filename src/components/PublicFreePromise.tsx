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
    <div className="flex justify-center border-b border-emerald-200 bg-emerald-50 px-3">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-2 py-2 text-center text-xs font-semibold text-emerald-900">
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-white">0 € dauerhaft</span>
        <span>Alle Funktionen frei.</span>
        <span>Freiwillige Unterstützung.</span>
        <span className="text-emerald-800">
          Wissenschaftlich begleitet an der PH Feldkirch.
        </span>
      </div>
    </div>
  );
}
