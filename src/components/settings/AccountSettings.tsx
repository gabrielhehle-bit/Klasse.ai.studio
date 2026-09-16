import React from 'react';
import { Mail, Users } from 'lucide-react';
import EmailAccountLogin from '../EmailAccountLogin';

export default function AccountSettings() {
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
              Die E-Mail-Anmeldung ist dein persönliches Klassio-Konto. Mit einer verifizierten Schulmail werden zusätzlich schulinterne Funktionen freigeschaltet.
            </p>
          </div>
        </div>
        <EmailAccountLogin />
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
    </div>
  );
}
