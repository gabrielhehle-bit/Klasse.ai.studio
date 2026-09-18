import React from 'react';
import { CheckCircle2, Loader2, Mail, School, ShieldCheck } from 'lucide-react';
import { notifyAccountSessionChanged } from '../lib/accountSyncService';

type AccessStatus = {
  authenticated: boolean;
  emailLoginEnabled: boolean;
  account: null | {
    displayName: string;
    handle: string;
    email: string;
  };
  identity: null | {
    displayName: string;
    handle: string;
    schoolCode: string;
    schoolName?: string;
    schoolFederalState?: string;
    schoolDomain: string;
  };
};

interface EmailAccountLoginProps {
  compact?: boolean;
  onSuccess?: () => void;
}

export default function EmailAccountLogin({ compact = false, onSuccess }: EmailAccountLoginProps) {
  const [status, setStatus] = React.useState<AccessStatus | null>(null);
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [step, setStep] = React.useState<'email' | 'code'>('email');
  const [maskedEmail, setMaskedEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const loadStatus = React.useCallback(async () => {
    const response = await fetch('/api/access/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('Anmeldestatus konnte nicht geladen werden.');
    const data = await response.json();
    setStatus(data);
    return data as AccessStatus;
  }, []);

  React.useEffect(() => {
    loadStatus().catch(() => setStatus({
      authenticated: true,
      emailLoginEnabled: false,
      account: null,
      identity: null,
    }));
  }, [loadStatus]);

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/access/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok || data?.success !== true) {
        throw new Error(data?.error || 'Anmeldecode konnte nicht gesendet werden.');
      }
      setMaskedEmail(data.maskedEmail || email.trim());
      setCode('');
      setStep('code');
      setNotice('Der 6-stellige Code ist 10 Minuten gültig.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'E-Mail-Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code) || loading) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/access/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await response.json();
      if (!response.ok || data?.success !== true) {
        throw new Error(data?.error || 'Anmeldecode ist nicht gültig.');
      }
      notifyAccountSessionChanged();
      await loadStatus();
      setStep('email');
      setCode('');
      setNotice(data?.school
        ? 'Schulmail bestätigt. Verschlüsselter Konto-Sync, Klassenteam und Lehrerzimmer sind jetzt verfügbar.'
        : 'E-Mail-Konto bestätigt. Dein verschlüsselter Konto-Sync ist aktiv; diese Adresse ist noch keiner verifizierten Schule zugeordnet.');
      onSuccess?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'E-Mail-Anmeldung fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  if (!status) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-5 text-sm font-bold text-slate-500">
        <Loader2 size={16} className="mr-2 inline animate-spin" /> Anmeldestatus wird geladen …
      </div>
    );
  }

  if (status.identity) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <div className="text-sm font-black text-emerald-950">Mit Schulmail angemeldet</div>
            <div className="mt-1 text-sm font-semibold text-emerald-900">{status.account?.email}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <School size={13} />
              {status.identity.schoolName || status.identity.schoolDomain}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!status.emailLoginEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Mail size={20} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <div className="text-sm font-black text-amber-950">E-Mail-Anmeldung ist in Klassio vorhanden</div>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-amber-800">
              Auf diesem Server ist der Mailversand noch nicht vollständig eingerichtet. Sobald SMTP konfiguriert ist, kannst du hier direkt einen 6-stelligen Anmeldecode anfordern.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? 'rounded-2xl border border-stone-200 bg-white p-5' : 'rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8'}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <ShieldCheck size={19} />
        </div>
        <div>
          <h3 className="text-base font-black text-slate-950">E-Mail & Schulidentität</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
            Melde dich mit deiner E-Mail an. Dein entsperrter Datentresor wird damit verschlüsselt zwischen deinen Geräten synchronisiert; eine verifizierte Schulmail schaltet zusätzlich Klassenteam und Lehrerzimmer frei.
          </p>
        </div>
      </div>

      {step === 'email' ? (
        <form onSubmit={requestCode} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="vorname.nachname@schule.at"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50"
          >
            {loading ? 'Code wird gesendet …' : 'Anmeldecode per E-Mail senden'}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-xs font-bold text-slate-500">Code gesendet an {maskedEmail}</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            autoComplete="one-time-code"
            required
            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-xl font-black tracking-[0.3em] text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setStep('email'); setCode(''); setError(null); }}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-4 py-3 text-xs font-black text-slate-600"
            >
              Zurück
            </button>
            <button
              type="submit"
              disabled={loading || !/^\d{6}$/.test(code)}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-black text-white disabled:opacity-50"
            >
              {loading ? 'Prüfen …' : 'Anmelden'}
            </button>
          </div>
        </form>
      )}

      {notice && <p className="mt-3 text-xs font-bold leading-relaxed text-emerald-700">{notice}</p>}
      {error && <p className="mt-3 text-xs font-bold leading-relaxed text-rose-600">{error}</p>}
    </div>
  );
}
