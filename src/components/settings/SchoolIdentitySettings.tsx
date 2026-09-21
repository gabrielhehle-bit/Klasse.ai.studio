import React from 'react';
import { CheckCircle2, Clock3, Mail, School, Send, ShieldCheck } from 'lucide-react';
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

const SCHOOL_SUPPORT_EMAIL = 'admin@klassio.at';

/** Opens the user's e-mail app; sending an e-mail is NOT an automatic verification. */
export function makeSchoolVerificationMailto(input: {
  schoolName: string;
  schoolCode: string;
  federalState: string;
  schoolEmail: string;
}): string {
  const schoolEmail = input.schoolEmail.trim();
  const domain = schoolEmail.includes('@') ? schoolEmail.split('@').at(-1) || '' : '';
  const subject = 'KLASSIO – Schulverifizierung: ' + (input.schoolName.trim() || 'Anfrage');
  const body = [
    'Hallo KLASSIO-Team,',
    '',
    'ich möchte meine Schule zur Verifizierung anmelden.',
    '',
    'Name der Schule: ' + (input.schoolName.trim() || '[bitte ergänzen]'),
    'Schulkürzel: ' + (input.schoolCode.trim() || '[bitte ergänzen]'),
    'Bundesland: ' + input.federalState,
    'Dienstliche Schul-E-Mail-Adresse: ' + (schoolEmail || '[bitte ergänzen]'),
    'Konkrete Schul-Domain: ' + (domain || '[bitte ergänzen]'),
    '',
    'Bitte prüft, ob die dienstliche E-Mail-Adresse und die Schule zusammengehören.',
    'Die Schulverifizierung erfolgt erst nach eurer Prüfung und Freigabe.',
  ].join('\n');
  return 'mailto:' + SCHOOL_SUPPORT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

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
  const [schoolCode, setSchoolCode] = React.useState('');
  const [schoolEmail, setSchoolEmail] = React.useState('');
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
      setSchoolEmail(current => current || data.account.email);
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
            <p className="mt-3 text-xs text-amber-900">
              Fragen zur Verifizierung? <a className="font-bold underline" href={makeSchoolVerificationMailto({
                schoolName: status.verificationRequest.schoolName, schoolCode, federalState: status.verificationRequest.federalState,
                schoolEmail: status.account.email,
              })}>E-Mail an {SCHOOL_SUPPORT_EMAIL} schreiben</a>.
            </p>
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
      <Input
        label="Schulkürzel (für die E-Mail-Anfrage)"
        value={schoolCode}
        onChange={event => setSchoolCode(event.target.value)}
        placeholder="z. B. VSFOA"
        maxLength={40}
      />
      <Input
        label="Dienstliche Schul-E-Mail-Adresse (für die E-Mail-Anfrage)"
        type="email"
        value={schoolEmail}
        onChange={event => setSchoolEmail(event.target.value)}
        placeholder="vorname.nachname@vsfoa.vobs.at"
        maxLength={254}
      />
      <p className="text-xs font-medium leading-relaxed text-slate-600">
        In Vorarlberg kann eine Schule beispielsweise die Domain <strong>@vsfoa.vobs.at</strong> verwenden.
        Eine eigene Schul-Domain wie <strong>@vs-beispielschule.at</strong> ist ebenfalls möglich.
        Entscheidend ist die konkrete, nachweislich zur Schule gehörende Domain – nicht die gemeinsame Domain @vobs.at.
      </p>

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

      <div className="rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-700">
        <p className="font-bold">Alternativ: Verifizierung per E-Mail anfragen</p>
        <p className="mt-1 text-xs leading-relaxed">
          Wenn deine Schule noch nicht zugeordnet werden kann, schreibe an <strong>{SCHOOL_SUPPORT_EMAIL}</strong>.
          Name, Kürzel und dienstliche Schul-E-Mail-Adresse werden für deine Nachricht vorbereitet.
          Der Link öffnet dein E-Mail-Programm – die Nachricht wird nicht automatisch versendet.
        </p>
        <a href={makeSchoolVerificationMailto({ schoolName, schoolCode, federalState, schoolEmail })}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50">
          <Mail size={16} aria-hidden="true" /> E-Mail an {SCHOOL_SUPPORT_EMAIL} schreiben
        </a>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Der Button „Schulverifizierung anfordern“ oben verwendet weiterhin die Domain deines angemeldeten KLASSIO-Kontos
          ({status.account.domain}). Eine andere E-Mail-Adresse in diesem Formular ändert deine angemeldete Domain nicht;
          gib die Schuladresse bei Bedarf in der E-Mail an.
        </p>
      </div>

      {notice && <p className="text-xs font-bold leading-relaxed text-emerald-700">{notice}</p>}
      {error && <p className="text-xs font-bold leading-relaxed text-rose-600">{error}</p>}

      <div className="flex items-start gap-2 rounded-xl bg-white p-3 text-xs font-medium leading-relaxed text-slate-500">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
        Bestehende Klassio-Daten werden dabei nicht verschoben, gelöscht oder neu angelegt. Die Schulverifizierung ergänzt nur die schulinterne Zusammenarbeit.
      </div>
    </form>
  );
}
