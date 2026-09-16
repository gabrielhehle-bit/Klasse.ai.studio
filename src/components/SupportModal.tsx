import React from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, ExternalLink, Heart, ShieldCheck, Sparkles, X } from 'lucide-react';
import { EMPTY_SUPPORT_INFO, loadSupportInfo, type SupportInfo } from '../lib/supportApi';

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SupportModal({ open, onClose }: SupportModalProps) {
  const [info, setInfo] = React.useState<SupportInfo>(EMPTY_SUPPORT_INFO);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
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
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const options = [
    {
      id: 'oneTime',
      label: 'Einmalig unterstützen',
      sub: 'Ein freiwilliger Beitrag über PayPal.',
      url: info.paypal.oneTime,
      icon: Heart,
    },
    {
      id: 'monthly',
      label: 'Monatlich unterstützen',
      sub: 'Hilft besonders dabei, die laufenden Serverkosten planbar zu decken.',
      url: info.paypal.monthly,
      icon: CalendarClock,
    },
    {
      id: 'yearly',
      label: 'Jährlich unterstützen',
      sub: 'Ein regelmäßiger Beitrag einmal pro Jahr.',
      url: info.paypal.yearly,
      icon: Sparkles,
    },
  ] as const;

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Unterstützungsfenster schließen"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="klassio-support-title"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          aria-label="Schließen"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8">
          <div className="mb-7 flex items-start gap-4 pr-12">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Heart size={22} className="fill-rose-500/15" />
            </div>
            <div>
              <p className="mb-1 text-[0.65rem] font-black uppercase tracking-[0.18em] text-rose-600">
                Freiwillige Unterstützung
              </p>
              <h2 id="klassio-support-title" className="text-2xl font-black tracking-tight text-slate-950">
                Klassio bleibt frei. Für alle.
              </h2>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">
                {info.message}
              </p>
            </div>
          </div>

          <div className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <p className="text-sm font-semibold leading-relaxed text-emerald-950">
                Der Beitrag ist freiwillig. Solange die laufenden Kosten durch regelmäßige Unterstützung getragen werden, soll Klassio kostenlos und frei zugänglich bleiben – für alle Lehrpersonen.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {options.map(option => {
              const Icon = option.icon;
              const available = Boolean(option.url);
              return available ? (
                <a
                  key={option.id}
                  href={option.url || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-40 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-lg"
                >
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-slate-700 group-hover:bg-rose-50 group-hover:text-rose-600">
                      <Icon size={17} />
                    </div>
                    <div className="text-sm font-black text-slate-900">{option.label}</div>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{option.sub}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-wider text-rose-600">
                    Zu PayPal <ExternalLink size={12} />
                  </div>
                </a>
              ) : (
                <div
                  key={option.id}
                  className="flex min-h-40 flex-col justify-between rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4"
                >
                  <div>
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-400">
                      <Icon size={17} />
                    </div>
                    <div className="text-sm font-black text-slate-700">{option.label}</div>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">{option.sub}</p>
                  </div>
                  <span className="mt-4 text-[0.62rem] font-bold uppercase tracking-wider text-slate-400">
                    PayPal-Link wird eingerichtet
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-center text-[0.68rem] font-medium leading-relaxed text-slate-400">
            Keine Gegenleistung, kein Pflichtbeitrag. Die Unterstützung dient ausschließlich dazu, Betrieb und Weiterentwicklung von Klassio mitzutragen.
          </p>

          {loading && (
            <p className="mt-2 text-center text-[0.65rem] font-semibold text-slate-400">Unterstützungsoptionen werden geladen …</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
