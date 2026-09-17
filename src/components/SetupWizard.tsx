import React, { useState } from 'react';
import { ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import EmailAccountLogin from './EmailAccountLogin';
import SetupWizardCore from './SetupWizardCore';

type SetupWizardProps = React.ComponentProps<typeof SetupWizardCore>;

export default function SetupWizard(props: SetupWizardProps) {
  const { app } = useApp();
  const hasExistingSetup = Boolean(
    app?.klassenbezeichnung?.trim() ||
    app?.classes?.length ||
    app?.schueler?.length
  );
  const [accountIntroDone, setAccountIntroDone] = useState(Boolean(props.isNewClass || hasExistingSetup));

  if (accountIntroDone) {
    return <SetupWizardCore {...props} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <div className="w-full space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <Mail size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Klassio einrichten</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Mit E-Mail anmelden – oder ohne Konto starten</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Du kannst dein Klassio-Konto schon während der Einrichtung per E-Mail-Einmalcode verbinden. Die Anmeldung ist optional und verändert weder deine lokale Einrichtung noch vorhandene Klassen- oder Tresordaten.
                </p>
              </div>
            </div>
          </div>

          <EmailAccountLogin />

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 shrink-0" size={18} />
              <div>
                <p className="font-semibold">E-Mail-Anmeldung ist optional</p>
                <p className="mt-1 leading-5 text-emerald-800">
                  Du kannst die Einrichtung jederzeit ohne E-Mail fortsetzen. Später findest du dieselbe Anmeldung unter Einstellungen → Konto &amp; Schulmail.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAccountIntroDone(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Weiter zur Einrichtung
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
