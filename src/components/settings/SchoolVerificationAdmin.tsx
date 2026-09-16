import React from 'react';
import { Building2, Check, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { Badge, Button } from '../ui';

type AdminStatus = {
  admin: boolean;
  email: string | null;
  notificationsConfigured: boolean;
};

type RequestItem = {
  id: string;
  requestedByEmail: string;
  emailDomain: string;
  schoolName: string;
  federalState: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
};

type AdminQueue = {
  requests: RequestItem[];
  schools: Array<{ id: string; name: string; federalState: string; domains: string[] }>;
  pendingCount: number;
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Die Anfrage konnte nicht ausgeführt werden.');
  return data;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function SchoolVerificationAdmin({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = React.useState<AdminStatus | null>(null);
  const [queue, setQueue] = React.useState<AdminQueue | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [mutating, setMutating] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statusResponse = await fetch('/api/admin/schools/status', { cache: 'no-store' });
      const statusData = await readJson(statusResponse) as AdminStatus;
      setStatus(statusData);
      if (!statusData.admin) {
        setQueue(null);
        return;
      }
      const queueResponse = await fetch('/api/admin/schools/verification-requests', { cache: 'no-store' });
      setQueue(await readJson(queueResponse) as AdminQueue);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Schulverwaltung konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const decide = async (request: RequestItem, action: 'approve' | 'reject') => {
    if (mutating) return;
    setMutating(request.id + ':' + action);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        '/api/admin/schools/verification-requests/' + encodeURIComponent(request.id) + '/' + action,
        { method: 'POST' }
      );
      const data = await readJson(response);
      setNotice(action === 'approve'
        ? request.schoolName + ' wurde freigeschaltet.' + (data?.notified ? ' Die Lehrperson wurde per E-Mail informiert.' : '')
        : 'Die Anfrage wurde abgelehnt.' + (data?.notified ? ' Die Lehrperson wurde per E-Mail informiert.' : ''));
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Entscheidung konnte nicht gespeichert werden.');
    } finally {
      setMutating(null);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <Loader2 size={15} className="animate-spin" /> Schulverwaltung wird geprüft …
      </div>
    );
  }

  if (!status?.admin) return null;

  const pending = (queue?.requests || []).filter(item => item.status === 'pending');
  const history = (queue?.requests || []).filter(item => item.status !== 'pending').slice(0, 12);

  return (
    <section className="rounded-[2rem] border border-indigo-200 bg-indigo-50/40 p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-black text-slate-950">Schulverwaltung</h2>
              <Badge variant={pending.length ? 'warning' : 'success'}>
                {pending.length ? pending.length + ' offen' : 'Alles erledigt'}
              </Badge>
            </div>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
              Nur für dein Admin-Konto sichtbar. Prüfe, ob Schulname und konkrete dienstliche E-Mail-Domain zusammengehören.
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Admin: {status.email}{status.notificationsConfigured ? ' · E-Mail-Benachrichtigungen aktiv' : ''}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} leftIcon={<RefreshCw size={14} />}>
          Aktualisieren
        </Button>
      </div>

      {notice && <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}
      {error && <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">{error}</div>}

      <div className="mt-6 space-y-3">
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 text-sm font-semibold text-slate-600">
            Keine offenen Schulverifizierungen.
          </div>
        ) : pending.map(request => (
          <div key={request.id} className="rounded-2xl border border-indigo-100 bg-white p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Building2 size={17} className="shrink-0 text-indigo-700" />
                  <h3 className="truncate text-sm font-black text-slate-950">{request.schoolName}</h3>
                </div>
                <div className="mt-2 text-xs font-semibold leading-5 text-slate-600">
                  {request.federalState} · <strong>{request.emailDomain}</strong><br />
                  Anfrage von {request.requestedByEmail}<br />
                  {formatDate(request.createdAt)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={Boolean(mutating)}
                  onClick={() => void decide(request, 'reject')}
                  leftIcon={<X size={14} />}
                >
                  Ablehnen
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={Boolean(mutating)}
                  isLoading={mutating === request.id + ':approve'}
                  onClick={() => void decide(request, 'approve')}
                  leftIcon={<Check size={14} />}
                >
                  Freigeben
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-500">
            Letzte Entscheidungen
          </summary>
          <div className="mt-3 space-y-2">
            {history.map(request => (
              <div key={request.id} className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-bold text-slate-800">{request.schoolName} · {request.emailDomain}</div>
                  <div className="mt-0.5 text-slate-500">{request.federalState}</div>
                </div>
                <Badge variant={request.status === 'verified' ? 'success' : 'neutral'}>
                  {request.status === 'verified' ? 'Freigegeben' : 'Abgelehnt'}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
