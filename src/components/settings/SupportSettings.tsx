import React from 'react';
import { CalendarClock, ExternalLink, Heart, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { cadenceLabel, EMPTY_SUPPORT_INFO, loadSupportInfo, type SupportInfo } from '../../lib/supportApi';
import PayPalSubscriptionButton from '../PayPalSubscriptionButton';

export default function SupportSettings() {
  const [info, setInfo] = React.useState<SupportInfo>(EMPTY_SUPPORT_INFO);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    loadSupportInfo()
      .then(data => {
        if (active) setInfo(data);
      })
      .catch(() => {
        if (active) setInfo(EMPTY_SUPPORT_INFO);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const subscriptions = [
    {
      label: 'Monatlich',
      icon: CalendarClock,
      planId: info.paypal.monthlyPlanId,
      fallbackUrl: info.paypal.monthly,
      cadence: 'monthly' as const,
    },
    {
      label: 'Jährlich',
      icon: Sparkles,
      planId: info.paypal.yearlyPlanId,
      fallbackUrl: info.paypal.yearly,
      cadence: 'yearly' as const,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-rose-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Heart size={20} className="fill-rose-500/15" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-slate-950">Klassio gemeinsam frei halten</h2>
            <p className="text-sm font-medium leading-relaxed text-slate-600">
              Klassio soll kostenlos und für alle Lehrpersonen frei zugänglich bleiben. Freiwillige Beiträge helfen dabei, die laufenden Serverkosten und den technischen Betrieb zu tragen.
            </p>
            <p className="text-sm font-bold leading-relaxed text-emerald-800">
              Solange die laufenden Kosten durch regelmäßige Unterstützung gedeckt sind, bleibt Klassio für alle kostenlos.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
              <Heart size={16} className="text-rose-600" /> Einmalig
            </div>
            {info.paypal.oneTime ? (
              <a
                href={info.paypal.oneTime}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-600"
              >
                PayPal öffnen <ExternalLink size={13} />
              </a>
            ) : (
              <span className="text-xs font-bold text-slate-400">noch offen</span>
            )}
          </div>

          {subscriptions.map(item => {
            const Icon = item.icon;
            const canSubscribe = Boolean(info.paypal.clientId && item.planId);
            return (
              <div key={item.label} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800">
                  <Icon size={16} className="text-rose-600" /> {item.label}
                </div>
                {canSubscribe ? (
                  <PayPalSubscriptionButton
                    clientId={info.paypal.clientId!}
                    planId={item.planId!}
                    cadence={item.cadence}
                  />
                ) : item.fallbackUrl ? (
                  <a
                    href={item.fallbackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs font-black text-rose-600"
                  >
                    PayPal öffnen <ExternalLink size={13} />
                  </a>
                ) : (
                  <span className="text-xs font-bold text-slate-400">noch offen</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-5 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Users size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Unterstützer:innen</h2>
            <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
              Danke an alle, die den Betrieb von Klassio freiwillig mittragen.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-stone-50 p-5 text-sm font-medium text-slate-500">Liste wird geladen …</div>
        ) : info.supporters.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {info.supporters.map((supporter, index) => (
              <div
                key={supporter.displayName + '-' + index}
                className="flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-900">{supporter.displayName}</div>
                  {supporter.since && (
                    <div className="mt-0.5 text-[0.62rem] font-semibold text-slate-400">
                      seit {new Date(supporter.since + 'T00:00:00').toLocaleDateString('de-AT', { month: 'long', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[0.6rem] font-black uppercase tracking-wider text-emerald-700">
                  {cadenceLabel(supporter.cadence)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center">
            <Heart size={22} className="mx-auto mb-2 text-rose-400" />
            <p className="text-sm font-bold text-slate-700">Die Dankesliste ist noch leer.</p>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Unterstützer:innen erscheinen hier nur mit ausdrücklicher Zustimmung.
            </p>
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-emerald-700" />
          <p className="text-xs font-semibold leading-relaxed text-emerald-900">{info.privacy}</p>
        </div>
      </section>
    </div>
  );
}
