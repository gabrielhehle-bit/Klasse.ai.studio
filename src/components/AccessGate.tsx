import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'motion/react';

interface AccessGateProps {
  onSuccess: () => void;
}

type LoginMode = 'email' | 'access-code';
type EmailStep = 'email' | 'code';

export default function AccessGate({ onSuccess }: AccessGateProps) {
  const [mode, setMode] = useState<LoginMode>('email');
  const [emailStep, setEmailStep] = useState<EmailStep>('email');
  const [emailLoginEnabled, setEmailLoginEnabled] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/access/status', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Status konnte nicht geladen werden.');
        return response.json();
      })
      .then(data => {
        if (cancelled) return;
        const enabled = data?.emailLoginEnabled === true;
        setEmailLoginEnabled(enabled);
        if (!enabled) setMode('access-code');
      })
      .catch(() => {
        if (cancelled) return;
        setEmailLoginEnabled(false);
        setMode('access-code');
      })
      .finally(() => {
        if (!cancelled) setCheckingAvailability(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const clearFeedback = () => {
    setError(null);
    setNotice(null);
  };

  const requestEmailCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    clearFeedback();

    try {
      const response = await fetch('/api/access/email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();

      if (!response.ok || data?.success !== true) {
        setError(data?.error || 'Der Anmeldecode konnte nicht gesendet werden.');
        return;
      }

      setMaskedEmail(data.maskedEmail || email.trim());
      setEmailCode('');
      setEmailStep('code');
      setNotice('Der 6-stellige Code ist 10 Minuten gültig.');
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const verifyEmailCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailCode) || loading) return;

    setLoading(true);
    clearFeedback();

    try {
      const response = await fetch('/api/access/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: emailCode,
        }),
      });
      const data = await response.json();

      if (response.ok && data?.success === true) {
        onSuccess();
        return;
      }

      setError(data?.error || 'Der Anmeldecode ist nicht gültig.');
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const verifyAccessCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accessCode.trim() || loading) return;

    setLoading(true);
    clearFeedback();

    try {
      const response = await fetch('/api/access/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });
      const data = await response.json();

      if (response.ok && data?.success === true) {
        onSuccess();
        return;
      }

      setError(data?.error || 'Der Zugangscode ist nicht gültig.');
    } catch {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextMode: LoginMode) => {
    clearFeedback();
    setMode(nextMode);
    setEmailStep('email');
    setEmailCode('');
  };

  const resendEmailCode = async () => {
    if (!email.trim() || loading) return;
    setEmailStep('email');
    setNotice('Du kannst für dieselbe Adresse frühestens nach 60 Sekunden einen neuen Code anfordern.');
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border border-slate-100 relative z-10 space-y-7"
      >
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100/80 rounded-full text-indigo-700 text-xs font-black uppercase tracking-wider">
            <ShieldCheck size={14} className="text-indigo-600" />
            <span>Geschützter Zugang</span>
          </div>

          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Klassio</h1>

          <p className="text-sm font-medium text-slate-500">
            {checkingAvailability
              ? 'Anmeldemöglichkeiten werden geprüft …'
              : mode === 'email'
                ? emailStep === 'email'
                  ? 'Mit deiner Schul-E-Mail-Adresse anmelden.'
                  : 'Gib den Code aus deiner E-Mail ein.'
                : 'Mit dem administrativen Zugangscode anmelden.'}
          </p>
        </div>

        {checkingAvailability ? (
          <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
            <Loader2 size={24} className="animate-spin text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider">Prüfe Zugang</span>
          </div>
        ) : (
          <>
            {mode === 'email' && emailLoginEnabled ? (
              emailStep === 'email' ? (
                <form onSubmit={requestEmailCode} className="space-y-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      Schul-E-Mail
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={event => {
                          setEmail(event.target.value);
                          clearFeedback();
                        }}
                        placeholder="vorname.nachname@schule.at"
                        autoComplete="email"
                        autoFocus
                        required
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-semibold text-sm placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                    <p className="text-[0.7rem] leading-relaxed text-slate-400 font-medium">
                      Es funktionieren nur die auf diesem Klassio-Server freigegebenen Schul-Domains.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                    <span>{loading ? 'Code wird gesendet …' : 'Anmeldecode senden'}</span>
                    {!loading && <ArrowRight size={16} />}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyEmailCode} className="space-y-5">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-emerald-900">Code versendet</p>
                      <p className="text-[0.72rem] text-emerald-700 mt-0.5">{maskedEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                      6-stelliger Anmeldecode
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={emailCode}
                      onChange={event => {
                        setEmailCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                        clearFeedback();
                      }}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      autoFocus
                      required
                      className="w-full py-4 px-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-2xl tracking-[0.35em] font-black tabular-nums text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !/^\d{6}$/.test(emailCode)}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                    <span>{loading ? 'Code wird geprüft …' : 'Klassio öffnen'}</span>
                    {!loading && <ArrowRight size={16} />}
                  </button>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        clearFeedback();
                        setEmailStep('email');
                        setEmailCode('');
                      }}
                      className="text-[0.7rem] font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    >
                      <ArrowLeft size={13} /> E-Mail ändern
                    </button>
                    <button
                      type="button"
                      onClick={resendEmailCode}
                      className="text-[0.7rem] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <RefreshCw size={13} /> Neuen Code
                    </button>
                  </div>
                </form>
              )
            ) : (
              <form onSubmit={verifyAccessCode} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                    Zugangscode
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={18} />
                    </div>
                    <input
                      type="password"
                      value={accessCode}
                      onChange={event => {
                        setAccessCode(event.target.value);
                        clearFeedback();
                      }}
                      placeholder="Zugangscode eingeben …"
                      autoComplete="current-password"
                      autoFocus
                      required
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-semibold text-sm placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !accessCode.trim()}
                  className="w-full py-4 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                  <span>{loading ? 'Prüfe Zugang …' : 'Klassio öffnen'}</span>
                  {!loading && <ArrowRight size={16} />}
                </button>
              </form>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-bold flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="shrink-0 text-rose-500 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {notice && !error && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-700 text-[0.72rem] font-semibold">
                {notice}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3 text-center">
              {emailLoginEnabled && (
                <button
                  type="button"
                  onClick={() => switchMode(mode === 'email' ? 'access-code' : 'email')}
                  className="text-[0.72rem] font-bold text-indigo-600 hover:text-indigo-800"
                >
                  {mode === 'email' ? 'Stattdessen Zugangscode verwenden' : 'Mit Schul-E-Mail anmelden'}
                </button>
              )}
              <p className="text-[0.7rem] leading-relaxed font-medium text-slate-400">
                Nach erfolgreicher Anmeldung bleibt dieses Gerät bis zu 30 Tage angemeldet.
                Der lokale Datentresor ist davon getrennt und schützt deine Klassendaten zusätzlich.
              </p>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
