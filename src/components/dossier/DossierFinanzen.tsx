import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Banknote,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ReceiptText,
  ChevronDown,
  ChevronUp,
  Wallet,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

interface DossierFinanzenProps {
  student: Student;
}

type PaymentStatus = 'offen' | 'teilweise' | 'bezahlt';

export default function DossierFinanzen({ student }: DossierFinanzenProps) {
  const { app, setApp } = useApp();
  const [showAllDetails, setShowAllDetails] = useState(false);
  const sammlungen = app.klassenkasse?.sammlungen || [];

  const formatEuro = (value: number) =>
    value.toLocaleString('de-AT', {
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
      const paidAmount = Math.min(
        targetAmount,
        Math.max(0, Number(sammlung.betraege?.[student.id]) || 0)
      );
      const remainingAmount = Math.max(0, targetAmount - paidAmount);
      const status: PaymentStatus =
        paidAmount >= targetAmount && targetAmount > 0
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
  const openPayments = studentPayments.filter(payment => payment.remainingAmount > 0);
  const latestPayment = studentPayments[0];

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

      const collectionTitle =
        currentCashbox.sammlungen.find(collection => collection.id === collectionId)?.titel ||
        'Geldsammlung';
      const transaction = {
        id: `dossier-payment-${Date.now()}`,
        datum: new Date().toISOString(),
        titel: `${student.name || `${student.vorname} ${student.nachname}`} – ${collectionTitle}`,
        betrag: Math.abs(difference),
        typ: difference > 0 ? ('plus' as const) : ('minus' as const),
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

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-2 rounded-full bg-emerald-600" />
          <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
            Finanzen & Organisation
          </h3>
        </div>
        <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
          Beitrags- und Zahlungsstand von {student.vorname}, synchronisiert mit der Klassenkasse.
        </p>
      </div>

      {studentPayments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 shadow-3xs">
            <ReceiptText size={22} />
          </div>
          <h4 className="mt-3 text-sm font-bold text-slate-800">Keine Geldsammlungen zugeordnet</h4>
          <p className="mx-auto mt-1 max-w-md text-xs font-medium text-slate-500 leading-relaxed">
            Für {student.vorname} gibt es aktuell keine offenen oder aktiven Sammlungen in der Klassenkasse.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. KOMPAKTE ZUSAMMENFASSUNG (PROGRESSIVE DISCLOSURE STAGE 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Offene Beiträge */}
            <div className={`p-4 rounded-2xl border shadow-3xs flex flex-col justify-between ${
              totalOpen > 0
                ? 'bg-amber-50/70 border-amber-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[0.6875rem] font-bold uppercase tracking-wider ${
                  totalOpen > 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  Offene Beiträge
                </span>
                {totalOpen > 0 ? (
                  <AlertCircle size={15} className="text-amber-600" />
                ) : (
                  <CheckCircle2 size={15} className="text-emerald-600" />
                )}
              </div>
              <div className="mt-2">
                <div className={`text-xl font-black tabular-nums ${
                  totalOpen > 0 ? 'text-amber-950' : 'text-emerald-950'
                }`}>
                  {formatEuro(totalOpen)}
                </div>
                <div className={`text-[0.72rem] font-medium mt-0.5 ${
                  totalOpen > 0 ? 'text-amber-800' : 'text-emerald-800'
                }`}>
                  {totalOpen > 0
                    ? `${openPayments.length} ${openPayments.length === 1 ? 'Beitrag ausständig' : 'Beiträge ausständig'}`
                    : 'Alle Beiträge beglichen'}
                </div>
              </div>
            </div>

            {/* Zuletzt erfasste Sammlung */}
            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                  Zuletzt erfasst
                </span>
                <Clock size={15} className="text-slate-400" />
              </div>
              <div className="mt-2">
                <div className="text-sm font-bold text-slate-900 truncate" title={latestPayment?.titel}>
                  {latestPayment ? latestPayment.titel : 'Keine'}
                </div>
                <div className="text-[0.72rem] font-medium text-slate-500 mt-0.5">
                  {latestPayment ? `${formatDate(latestPayment.datum)} · ${formatEuro(latestPayment.targetAmount)}` : '—'}
                </div>
              </div>
            </div>

            {/* Gesamt gezahlt */}
            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-3xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                  Bereits bezahlt
                </span>
                <Wallet size={15} className="text-slate-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-black text-slate-900 tabular-nums">
                  {formatEuro(totalPaid)}
                </div>
                <div className="text-[0.72rem] font-medium text-slate-500 mt-0.5">
                  von {formatEuro(totalTarget)} ({totalTarget > 0 ? Math.round((totalPaid / totalTarget) * 100) : 100}%)
                </div>
              </div>
            </div>
          </div>

          {/* 2. DETAILANSICHT DER BUCHUNGEN & SAMMLUNGEN (PROGRESSIVE DISCLOSURE STAGE 2) */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText size={16} className="text-slate-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Einzelne Sammlungen & Beiträge ({studentPayments.length})
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setShowAllDetails(!showAllDetails)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllDetails ? 'Kompakt darstellen' : 'Alle Details einblenden'}</span>
                {showAllDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {studentPayments
                .slice(0, showAllDetails ? undefined : 4)
                .map(payment => {
                  const isPaid = payment.status === 'bezahlt';
                  const isPartial = payment.status === 'teilweise';

                  return (
                    <div
                      key={payment.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {payment.titel}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle2 size={10} /> Bezahlt
                              </>
                            ) : isPartial ? (
                              <>
                                <Clock size={10} /> Teilweise
                              </>
                            ) : (
                              <>
                                <AlertCircle size={10} /> Offen
                              </>
                            )}
                          </span>
                        </div>
                        <div className="text-[0.6875rem] text-slate-400 mt-0.5">
                          Erstellt am {formatDate(payment.datum)} · Soll: {formatEuro(payment.targetAmount)}
                          {isPartial && ` · Noch offen: ${formatEuro(payment.remainingAmount)}`}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                        <div className="text-right">
                          <div className="text-xs font-bold tabular-nums text-slate-900">
                            {formatEuro(payment.paidAmount)}
                          </div>
                          <div className="text-[0.625rem] text-slate-400">eingezahlt</div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setPaymentComplete(payment.id, payment.paidAmount, payment.targetAmount)
                          }
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                            isPaid
                              ? 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-3xs'
                          }`}
                          title={isPaid ? 'Zahlung stornieren' : 'Als vollständig bezahlt markieren'}
                        >
                          {isPaid ? <RotateCcw size={12} /> : <CheckCircle2 size={12} />}
                          <span>{isPaid ? 'Rückgängig' : 'Als bezahlt setzen'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>

            {!showAllDetails && studentPayments.length > 4 && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowAllDetails(true)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800"
                >
                  +{studentPayments.length - 4} weitere Beiträge anzeigen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span>Automatische Verbuchung in der Klassenkasse</span>
        <span>Währung: Euro (EUR)</span>
      </div>
    </div>
  );
}
