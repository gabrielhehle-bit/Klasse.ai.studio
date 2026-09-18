import React from 'react';
import { Database, Mail, Users } from 'lucide-react';
import EmailAccountLogin from '../EmailAccountLogin';
import SchoolIdentitySettings from './SchoolIdentitySettings';
import SchoolVerificationAdmin from './SchoolVerificationAdmin';

export default function AccountSettings() {
  const [refreshKey, setRefreshKey] = React.useState(0);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
            <Mail size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Konto & Schulmail</h2>
            <p className="mt-1 text-sm font-medium leading-relaxed text-slate-600">
              Die E-Mail-Anmeldung ist dein persönliches Klassio-Konto. Sobald dein Datentresor entsperrt ist, wird dein KLASSIO-Stand automatisch Ende-zu-Ende-verschlüsselt mit diesem Konto synchronisiert. Eine verifizierte Schulmail schaltet zusätzlich schulinterne Funktionen frei.
            </p>
          </div>
        </div>
        <EmailAccountLogin onSuccess={() => setRefreshKey(value => value + 1)} />

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-3">
            <Database size={17} className="mt-0.5 shrink-0 text-emerald-700" />
            <p className="text-xs font-semibold leading-relaxed text-emerald-900">
              Bereits eingerichtete Klassen, Planungen, Noten und Tresordaten bleiben auf diesem Gerät erhalten und lokal verschlüsselt. Mit aktivem E-Mail-Konto wird derselbe KLASSIO-Stand zusätzlich Ende-zu-Ende-verschlüsselt auf dem Server gespeichert. Der Server erhält keinen lesbaren Schülerbestand und keinen unverschlüsselten Tresorschlüssel. Datei- oder OneDrive-Backups bleiben als freiwillige Zusatzsicherung möglich.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <SchoolIdentitySettings refreshKey={refreshKey} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <Users size={18} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <h3 className="text-sm font-black text-slate-900">Teamteaching</h3>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Nach der Anmeldung mit einer verifizierten Schulmail findest du das Klassenteam direkt unter „Klasse“. Dort kannst du eine Klasse gezielt mit Kolleg:innen derselben Schule teilen.
            </p>
          </div>
        </div>
      </section>

      <SchoolVerificationAdmin refreshKey={refreshKey} />
    </div>
  );
}
