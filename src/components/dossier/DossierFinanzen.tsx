import React from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Info,
  ReceiptText,
  RotateCcw
} from 'lucide-react';

interface DossierFinanzenProps {
  student: Student;
}

type PaymentStatus = 'offen' | 'teilweise' | 'bezahlt';

export default function DossierFinanzen({ student }: DossierFinanzenProps) {
  const { app, setApp } = useApp();
  const sammlungen = app.klassenkasse?.sammlungen || [];

  const formatEuro = (value: number) => value.toLocaleString('de-AT', {
    style: 'currency',
    currency: 'EUR'
  });

  const formatDate = (value?: string) => {
    if (!value) return 'Datum nicht erfasst';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-AT');
  };

  const studentPayments = sammlungen
    .map(sammlung => {
      const targetAmount = Math.max(0, Number(sammlung.betrag) || 0);
      const paidAmount = Math.min(targetAmount, Math.max(0, Number(sammlung.betraege?.[student.id]) || 0));
      const remainingAmount = Math.max(0, targetAmount - paidAmount);
      const status: PaymentStatus = paidAmount >= targetAmount && targetAmount > 0
        ? 'bezahlt'
        : paidAmount > 0
          ? 'teilweise'
          : 'offen';

      return {
        id: sammlung.id,
        titel: sammlung.titel,
        datum: sammlung.erstelltAm,
        targetAmount,
        paidAmount,
        remainingAmount,
        status
      };
    })
    .filter(payment => payment.targetAmount > 0)
    .sort((a, b) => {
      if (a.status === 'bezahlt' && b.status !== 'bezahlt') return 1;
      if (a.status !== 'bezahlt' && b.status === 'bezahlt') return -1;
      return new Date(b.datum || 0).getTime() - new Date(a.datum || 0).getTime();
    });

  const totalTarget = studentPayments.reduce((sum, payment) => sum + payment.targetAmount, 0);
  const totalPaid = studentPayments.reduce((sum, payment) => sum + payment.paidAmount, 0);
  const totalOpen = studentPayments.reduce((sum, payment) => sum + payment.remainingAmount, 0);
  const progressPercent = totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 0;
  const openPayments = studentPayments.filter(payment => payment.remainingAmount > 0).length;

  const setPaymentComplete = (collectionId: string, currentPaid: number, targetAmount: number) => {
    const newPaid = currentPaid >= targetAmount ? 0 : targetAmount;
    const difference = newPaid - currentPaid;
    if (difference === 0) return;

    setApp(prev => {
      const currentCashbox = prev.klassenkasse;
      if (!currentCashbox) return prev;

      const updatedCollections = currentCashbox.sammlungen.map(collection => {
        if (collection.id !== collectionId) return collection;
        const newStatus: PaymentStatus = newPaid >= targetAmount ? 'bezahlt' : 'offen';
        return {
          ...collection,
          betraege: { ...(collection.betraege || {}), [student.id]: newPaid },
          status: { ...(collection.status || {}), [student.id]: newStatus }
        };
      });

      const collectionTitle = currentCashbox.sammlungen.find(collection => collection.id === collectionId)?.titel || 'Geldsammlung';
      const transaction = {
        id: `dossier-payment-${Date.now()}`,
        datum: new Date().toISOString(),
        titel: `${student.name || `${student.vorname} ${student.nachname}`} – ${collectionTitle}`,
        betrag: Math.abs(difference),
        typ: difference > 0 ? 'plus' as const : 'minus' as const,
        kategorie: 'sammlung' as const,
        geldsammlungId: collectionId,
        schuelerId: student.id
      };

      return {
        ...prev,
        klassenkasse: {
          ...currentCashbox,
          kontostand: (Number(currentCashbox.kontostand) || 0) + difference,
          sammlungen: updatedCollections,
          transaktionen: [transaction, ...(currentCashbox.transaktionen || [])]
        }
      };
    });
  };

  const StatusBadge = ({ status }: { status: PaymentStatus }) => {
    const config = {
      bezahlt: { label: 'Bezahlt', classes: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
      teilweise: { label: 'Teilweise bezahlt', classes: 'bg-amber-100 text-amber-800', icon: Clock },
      offen: { label: 'Offen', classes: 'bg-rose-100 text-rose-800', icon: AlertCircle }
    }[status];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-wider ${config.classes}`}>
        <Icon size={12} /> {config.label}
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-2 rounded-full bg-cyan-500" />
          <h3 className="text-[1.5rem] font-black tracking-tight text-slate-900">Klassenkasse & Beiträge</h3>
        </div>
        <p className="ml-5 mt-1 text-[0.75rem] font-semibold text-slate-500">
          Persönlicher Zahlungsstand von {student.vorname}, synchronisiert mit „Kasse & Orga“.
        </p>
      </div>

      {studentPayments.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <ReceiptText size={26} />
          </div>
          <h4 className="mt-4 text-[1rem] font-black text-slate-800">Keine Geldsammlung zugeordnet</h4>
          <p className="mx-auto mt-2 max-w-xl text-[0.75rem] font-semibold leading-relaxed text-slate-500">
            Für {student.vorname} gibt es derzeit keine Sammlung mit einem festgelegten Betrag. Deshalb wird kein Zahlungsstand bewertet.
          </p>
        </div>
      ) : (
        <>
          <div className={`flex items-start gap-3 rounded-[1.5rem] border p-4 ${
            totalOpen > 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
          }`}>
            {totalOpen > 0
              ? <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={19} />
              : <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} />}
            <div>
              <div className={`text-[0.8125rem] font-black ${totalOpen > 0 ? 'text-amber-950' : 'text-emerald-950'}`}>
                {totalOpen > 0
                  ? `${openPayments} ${openPayments === 1 ? 'Beitrag ist' : 'Beiträge sind'} noch nicht vollständig`
                  : 'Alle zugeordneten Beiträge sind vollständig bezahlt'}
              </div>
              <p className={`mt-1 text-[0.6875rem] font-semibold ${totalOpen > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                {totalOpen > 0
                  ? `Insgesamt sind noch ${formatEuro(totalOpen)} offen.`
                  : `Erfasster Gesamtbetrag: ${formatEuro(totalPaid)}.`}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Gesamt vorgesehen</div>
                  <div className="mt-1 text-[1.5rem] font-black tabular-nums text-slate-900">{formatEuro(totalTarget)}</div>
                </div>
                <CircleDollarSign className="text-slate-400" size={24} />
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50/55 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[0.625rem] font-black uppercase tracking-widest text-emerald-700">Bereits eingezahlt</div>
                  <div className="mt-1 text-[1.5rem] font-black tabular-nums text-emerald-950">{formatEuro(totalPaid)}</div>
                </div>
                <CheckCircle2 className="text-emerald-500" size={24} />
              </div>
            </div>
            <div className={`rounded-[1.75rem] border p-5 ${
              totalOpen > 0 ? 'border-rose-200 bg-rose-50/55' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-[0.625rem] font-black uppercase tracking-widest ${totalOpen > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                    Noch offen
                  </div>
                  <div className={`mt-1 text-[1.5rem] font-black tabular-nums ${totalOpen > 0 ? 'text-rose-950' : 'text-slate-900'}`}>
                    {formatEuro(totalOpen)}
                  </div>
                </div>
                <AlertCircle className={totalOpen > 0 ? 'text-rose-500' : 'text-slate-400'} size={24} />
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Zahlungsfortschritt</div>
                <div className="mt-1 text-[0.75rem] font-bold text-slate-700">
                  {formatEuro(totalPaid)} von {formatEuro(totalTarget)} erfasst
                </div>
              </div>
              <div className="rounded-full bg-cyan-50 px-3 py-1 text-[0.75rem] font-black text-cyan-800">{progressPercent}%</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-cyan-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2 px-1">
              <ReceiptText size={16} className="text-cyan-600" />
              <h4 className="text-[0.75rem] font-black uppercase tracking-widest text-slate-600">Zugeordnete Sammlungen</h4>
            </div>
            <div className="space-y-3">
              {studentPayments.map(payment => (
                <article key={payment.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                    <div className="min-w-0">
                      <StatusBadge status={payment.status} />
                      <h5 className="mt-2 text-[0.9375rem] font-black text-slate-900">{payment.titel}</h5>
                      <div className="mt-1 flex items-center gap-1.5 text-[0.625rem] font-bold text-slate-500">
                        <Clock size={12} /> Angelegt am {formatDate(payment.datum)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 rounded-2xl bg-slate-50 p-3 lg:min-w-[22rem]">
                      <div>
                        <div className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400">Soll</div>
                        <div className="mt-1 text-[0.75rem] font-black tabular-nums text-slate-800">{formatEuro(payment.targetAmount)}</div>
                      </div>
                      <div>
                        <div className="text-[0.5625rem] font-black uppercase tracking-wider text-emerald-600">Eingezahlt</div>
                        <div className="mt-1 text-[0.75rem] font-black tabular-nums text-emerald-800">{formatEuro(payment.paidAmount)}</div>
                      </div>
                      <div>
                        <div className="text-[0.5625rem] font-black uppercase tracking-wider text-rose-600">Offen</div>
                        <div className="mt-1 text-[0.75rem] font-black tabular-nums text-rose-800">{formatEuro(payment.remainingAmount)}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => setPaymentComplete(payment.id, payment.paidAmount, payment.targetAmount)}
                      className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-3 text-[0.625rem] font-black uppercase tracking-wider transition ${
                        payment.status === 'bezahlt'
                          ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {payment.status === 'bezahlt'
                        ? <><RotateCcw size={14} /> Zahlung zurücksetzen</>
                        : <><CheckCircle2 size={14} /> Vollständig bezahlt</>}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/45 p-4">
        <Info className="mt-0.5 shrink-0 text-cyan-700" size={17} />
        <p className="text-[0.6875rem] font-semibold leading-relaxed text-cyan-900">
          Änderungen hier aktualisieren gleichzeitig Sammlung, Klassenkassenstand und Transaktionsverlauf. Teilzahlungen werden korrekt als eigener Zwischenstand angezeigt.
        </p>
      </div>
    </div>
  );
}
