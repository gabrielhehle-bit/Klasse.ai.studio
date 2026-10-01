import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

export default function AccountServerLoadButton() {
  const { loadLatestAccountState } = useApp();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  return <div className="space-y-2">
    <button type="button" data-testid="load-latest-account-state" disabled={busy}
      className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 disabled:opacity-50"
      onClick={async () => {
        setBusy(true);
        try { setResult(await loadLatestAccountState(message => window.confirm(message))); }
        finally { setBusy(false); }
      }}>{busy ? 'Datenstand wird geladen …' : 'Neuesten Datenstand laden'}</button>
    {result && <p role="status" data-testid="server-load-result" className="text-xs leading-relaxed">{result}</p>}
  </div>;
}
