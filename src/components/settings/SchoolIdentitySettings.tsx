import React from 'react';
import { CheckCircle2, Clock3, School, Send, ShieldCheck } from 'lucide-react';
import { Button, Input, Select } from '../ui';

const AUSTRIAN_FEDERAL_STATES = [
  'Burgenland',
  'Kärnten',
  'Niederösterreich',
  'Oberösterreich',
  'Salzburg',
  'Steiermark',
  'Tirol',
  'Vorarlberg',
  'Wien',
] as const;

type FederalState = typeof AUSTRIAN_FEDERAL_STATES[number];

type SchoolStatus = {
  account: {
    displayName: string;
    email: string;
    domain: string;
  };
  school: {
    id: string;
    code: string;
    name: string;
    federalState: string;
    domains: string[];
  } | null;
  verificationRequest: {
    id: string;
    schoolName: string;
    federalState: string;
    status: 'pending' | 'verified' | 'rejected';
  } | null;
};

async function readJson(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Die Anfrage konnte nicht ausgeführt werden.');
  return data;
}

export default function SchoolIdentitySettings({ refreshKey = 0 }: { refreshKey?: number }) {
  const [status, setStatus] = React.useState<SchoolStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [schoolName, setSchoolName] = React.useState('');
  const [federalState, setFederalState] = React.useState<FederalState>('Vorarlberg');
  const [submitting, setSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/schools/me', { cache: 'no-store' });
      if (response.status === 403 || response.status === 401) {
        setStatus(null);
        return;
      }
      const data = await readJson(response) as SchoolStatus;
      setStatus(data);
      if (data.verificationRequest?.schoolName) setSchoolName(data.verificationRequest.schoolName);
      if (AUSTRIAN_FEDERAL_STATES.includes(data.verificationRequest?.federalState as FederalState)) {
        setFederalState(data.verificationRequest!.federalState as FederalState);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Schulstatus konnte nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!schoolName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch('/api/schools/verification-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolName: schoolName.trim(), federalState }),
      });
      await readJson(response);
      setNotice('Anfrage gespeichert. Du kannst Klassio ganz normal weiterverwenden; nach der Freigabe werden Schulteam-Funktionen automatisch verfügbar.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Die Schulverifizierung konnte nicht angefordert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-xs font-semibold text-slate-500">Schulstatus wird geprüft …</div>;
  }

  if (!status) return null;

  if (status.school) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <div className="text-sm font-black text-emerald-950">Schule verifiziert</div>
            <div className="mt-1 text-sm font-bold text-emerald-900">{status.school.name}</div>
            <div className="mt-1 text-xs font-semibold text-emerald-700">
              {status.school.federalState} · {status.account.domain}
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-emerald-800">
              Lehrerzimmer und Teamteaching sind für diese Schulgruppe freigeschaltet. Deine lokalen Klassen, Planungen und Tresordaten bleiben davon getrennt.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.verificationRequest?.status === 'pending') {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Clock3 size={20} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <div className="text-sm font-black text-amber-950">Schulverifizierung läuft</div>
            <div className="mt-1 text-sm font-bold text-amber-900">{status.verificationRequest.schoolName}</div>
            <div className="mt-1 text-xs font-semibold text-amber-700">
              {status.verificationRequest.federalState} · {status.account.domain}
            </div>
            <p className="mt-3 text-xs font-medium leading-relaxed text-amber-800">
              Du musst nichts neu einrichten. Klassio, deine Klassen, Planungen und dein Datentresor funktionieren weiter. Nach der Freigabe werden die Schulteam-Funktionen automatisch verfügbar.
            </p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => void load()}>
              Status aktualisieren
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50/70 p-5">
      <div className="flex items-start gap-3">
        <School size={20} className="mt-0.5 shrink-0 text-indigo-700" />
        <div>
          <h3 className="text-sm font-black text-slate-950">Schule verbinden</h3>
          <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
            Deine E-Mail ist bestätigt, aber die Domain <strong>{status.account.domain}</strong> ist noch keiner freigegebenen Schule zugeordnet. Melde deine Schule einmalig – danach gilt die Freigabe für alle Kolleg:innen mit derselben konkreten Schul-Domain.
          </p>
        </div>
      </div>

      <Input
        label="Name der Schule"
        value={schoolName}
        onChange={event => setSchoolName(event.target.value)}
        placeholder="z. B. Volksschule Musterstadt"
        maxLength={160}
      />
      <Select
        label="Bundesland"
        value={federalState}
        onChange={event => setFederalState(event.target.value as FederalState)}
        options={AUSTRIAN_FEDERAL_STATES.map(value => ({ value, label: value }))}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={!schoolName.trim() || submitting}
        isLoading={submitting}
        leftIcon={<Send size={15} />}
      >
        Schulverifizierung anfordern
      </Button>

      {notice && <p className="text-xs font-bold leading-relaxed text-emerald-700">{notice}</p>}
      {error && <p className="text-xs font-bold leading-relaxed text-rose-600">{error}</p>}

      <div className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs font-medium leading-relaxed text-slate-500">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
        Bestehende Klassio-Daten werden dabei nicht verschoben, gelöscht oder neu angelegt. Die Schulverifizierung ergänzt nur die schulinterne Zusammenarbeit.
      </div>
    </form>
  );
}
