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
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Badge, Button, Input } from './ui';

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

  const resendEmailCode = () => {
    if (!email.trim() || loading) return;
    setEmailStep('email');
    setNotice('Du kannst für dieselbe Adresse frühestens nach 60 Sekunden einen neuen Code anfordern.');
  };

  const helperText = checkingAvailability
    ? 'Anmeldemöglichkeiten werden geprüft …'
    : mode === 'email'
      ? emailStep === 'email'
        ? 'Melde dich mit deiner freigeschalteten Schul-E-Mail-Adresse an.'
        : 'Gib den sechsstelligen Code aus deiner E-Mail ein.'
      : 'Nutze den administrativen Zugangscode.';

  return (
    <div className="min-h-screen w-full bg-[var(--surface-app,var(--bg))] text-[var(--text-primary,var(--text))] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden font-sans">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-80" />
        <div className="absolute -bottom-36 -right-20 h-96 w-96 rounded-full bg-[var(--accent-soft)] blur-3xl opacity-60" />
        <div
          className="absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--border-default, #c5d2ce) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-8 items-stretch">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden lg:flex flex-col justify-between rounded-[2rem] border border-[var(--border-subtle,var(--border))] bg-[var(--surface-card,var(--surface))]/80 backdrop-blur-sm p-10 shadow-[0_24px_70px_-46px_rgba(15,118,110,0.45)]"
        >
          <div className="space-y-7">
            <div className="inline-flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-[var(--accent)] text-[var(--accent-text,#fff)] flex items-center justify-center shadow-sm">
                <Sparkles size={20} aria-hidden="true" />
              </div>
              <div>
                <div className="text-xl font-black tracking-tight">Klassio</div>
                <div className="text-xs font-semibold text-[var(--text-muted,var(--text3))]">Dein digitaler Lehrerarbeitsplatz</div>
              </div>
            </div>

            <div className="space-y-3 max-w-md">
              <h1 className="text-4xl font-black tracking-[-0.035em] leading-[1.08]">
                Weniger suchen.
                <br />
                Mehr unterrichten.
              </h1>
              <p className="text-[15px] leading-7 text-[var(--text-secondary,var(--text2))]">
                Planung, Klasse, Leistungen und Unterricht an einem Ort – mit geschütztem Zugang und lokal verschlüsselten Klassendaten.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-[var(--text-secondary,var(--text2))]">
              <div className="h-8 w-8 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
              <span className="font-semibold">Schulzugang und Datentresor sind bewusst getrennt.</span>
            </div>
            <div className="pl-11 text-xs leading-5 text-[var(--text-muted,var(--text3))]">
              So bleibt der tägliche Zugang bequem, während sensible Klassendaten zusätzlich geschützt werden.
            </div>
          </div>
        </motion.section>

        <motion.main
          initial={{ opacity: 0, y: 18, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-[2rem] border border-[var(--border-default,var(--border2))] bg-[var(--surface-card,var(--surface))] p-6 sm:p-8 lg:p-10 shadow-[0_28px_80px_-48px_rgba(23,33,31,0.45)]"
        >
          <div className="space-y-7">
            <header className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="lg:hidden inline-flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-[var(--accent)] text-[var(--accent-text,#fff)] flex items-center justify-center">
                    <Sparkles size={18} />
                  </div>
                  <span className="text-xl font-black tracking-tight">Klassio</span>
                </div>
                <Badge variant="accent" size="sm" icon={<ShieldCheck size={13} />}>
                  Geschützter Zugang
                </Badge>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl sm:text-[1.75rem] font-black tracking-[-0.025em]">
                  Willkommen
                </h2>
                <p className="text-sm leading-6 text-[var(--text-secondary,var(--text2))]">
                  {helperText}
                </p>
              </div>
            </header>

            {checkingAvailability ? (
              <div className="py-14 flex flex-col items-center gap-3 text-[var(--text-muted,var(--text3))]">
                <Loader2 size={24} className="animate-spin text-[var(--accent)]" />
                <span className="text-xs font-bold uppercase tracking-[0.12em]">Prüfe Zugang</span>
              </div>
            ) : (
              <>
                {mode === 'email' && emailLoginEnabled ? (
                  emailStep === 'email' ? (
                    <form onSubmit={requestEmailCode} className="space-y-5">
                      <Input
                        type="email"
                        label="Schul-E-Mail"
                        value={email}
                        onChange={event => {
                          setEmail(event.target.value);
                          clearFeedback();
                        }}
                        placeholder="vorname.nachname@schule.at"
                        autoComplete="email"
                        autoFocus
                        required
                        leftIcon={<Mail size={17} />}
                        helperText="Es funktionieren nur die auf diesem Klassio-Server freigegebenen Schul-Domains."
                        size="lg"
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading || !email.trim()}
                        isLoading={loading}
                        leftIcon={<Mail size={17} />}
                        rightIcon={!loading ? <ArrowRight size={17} /> : undefined}
                        className="w-full"
                      >
                        {loading ? 'Code wird gesendet …' : 'Anmeldecode senden'}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={verifyEmailCode} className="space-y-5">
                      <div className="p-4 bg-[var(--success-soft)] border border-[var(--success)]/25 rounded-2xl flex items-start gap-3">
                        <CheckCircle2 size={18} className="text-[var(--success)] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-[var(--success-text)]">Code versendet</p>
                          <p className="text-xs text-[var(--success-text)]/80 mt-1">{maskedEmail}</p>
                        </div>
                      </div>

                      <Input
                        type="text"
                        label="6-stelliger Anmeldecode"
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
                        size="lg"
                        className="text-center text-2xl tracking-[0.32em] font-black tabular-nums"
                      />

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        disabled={loading || !/^\d{6}$/.test(emailCode)}
                        isLoading={loading}
                        leftIcon={<KeyRound size={17} />}
                        rightIcon={!loading ? <ArrowRight size={17} /> : undefined}
                        className="w-full"
                      >
                        {loading ? 'Code wird geprüft …' : 'Klassio öffnen'}
                      </Button>

                      <div className="flex items-center justify-between gap-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            clearFeedback();
                            setEmailStep('email');
                            setEmailCode('');
                          }}
                          leftIcon={<ArrowLeft size={13} />}
                        >
                          E-Mail ändern
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={resendEmailCode}
                          leftIcon={<RefreshCw size={13} />}
                        >
                          Neuen Code
                        </Button>
                      </div>
                    </form>
                  )
                ) : (
                  <form onSubmit={verifyAccessCode} className="space-y-5">
                    <Input
                      type="password"
                      label="Zugangscode"
                      value={accessCode}
                      onChange={event => {
                        setAccessCode(event.target.value);
                        clearFeedback();
                      }}
                      placeholder="Zugangscode eingeben …"
                      autoComplete="current-password"
                      autoFocus
                      required
                      leftIcon={<Lock size={17} />}
                      size="lg"
                    />

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={loading || !accessCode.trim()}
                      isLoading={loading}
                      leftIcon={<KeyRound size={17} />}
                      rightIcon={!loading ? <ArrowRight size={17} /> : undefined}
                      className="w-full"
                    >
                      {loading ? 'Prüfe Zugang …' : 'Klassio öffnen'}
                    </Button>
                  </form>
                )}

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-[var(--danger-soft)] border border-[var(--danger)]/25 rounded-2xl text-[var(--danger-text)] text-xs font-semibold flex items-start gap-2.5"
                  >
                    <AlertCircle size={16} className="shrink-0 text-[var(--danger)] mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {notice && !error && (
                  <div className="p-3.5 bg-[var(--accent-soft)] border border-[var(--accent)]/20 rounded-2xl text-[var(--accent)] text-xs font-semibold">
                    {notice}
                  </div>
                )}

                <footer className="pt-5 border-t border-[var(--border-subtle,var(--border))] space-y-4">
                  {emailLoginEnabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => switchMode(mode === 'email' ? 'access-code' : 'email')}
                      className="w-full"
                    >
                      {mode === 'email' ? 'Stattdessen Zugangscode verwenden' : 'Mit Schul-E-Mail anmelden'}
                    </Button>
                  )}

                  <p className="text-xs leading-5 text-center text-[var(--text-muted,var(--text3))]">
                    Nach erfolgreicher Anmeldung bleibt dieses Gerät bis zu 30 Tage angemeldet.
                    Der lokale Datentresor schützt deine Klassendaten zusätzlich.
                  </p>
                </footer>
              </>
            )}
          </div>
        </motion.main>
      </div>
    </div>
  );
}
