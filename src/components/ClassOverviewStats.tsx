import React, { useMemo } from 'react';
import type { Student } from '../types';
import { calculateClassOverviewStats, type CountRow } from '../lib/classOverviewStats';

const Distribution = ({ title, rows, total }: { title: string; rows: CountRow[]; total: number }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 min-w-0">
    <h4 className="font-bold text-slate-900 mb-3">{title}</h4>
    <div className="space-y-2">
      {rows.map(({ label, count }) => (
        <div key={label}>
          <div className="flex justify-between gap-3 text-sm mb-1">
            <span className="text-slate-700 break-words">{label}</span>
            <span className="font-bold tabular-nums text-slate-900 shrink-0">{count} <span className="font-normal text-slate-500">({total ? Math.round(count / total * 100) : 0} %)</span></span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden" aria-hidden="true">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${total ? count / total * 100 : 0}%` }} />
          </div>
        </div>
      ))}
      {!rows.length && <p className="text-sm text-slate-500">Keine Einträge vorhanden.</p>}
    </div>
  </section>
);

export default function ClassOverviewStats({ students }: { students: Student[] }) {
  const stats = useMemo(() => calculateClassOverviewStats(students), [students]);
  return (
    <section aria-label="Klassenstatistik" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 space-y-4 print:hidden">
      <div className="flex flex-wrap justify-between gap-2 items-start">
        <div>
          <h3 className="font-extrabold text-slate-900 text-lg">Klassenstatistik</h3>
          <p className="text-sm text-slate-600">{stats.total} Kinder der gesamten aktiven Klasse · unabhängig von Suche und Filtern</p>
        </div>
        <span className="text-xs text-slate-500">Nur aggregierte Angaben – keine Namen</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          ['Deutsch als Erstsprache', stats.germanFirstLanguage],
          ['Deutsch als Zweitsprache', stats.germanSecondLanguage],
          ['DaZ-Förderkennzeichen', stats.daz],
          ['SPF / ESPF', `${stats.spf} / ${stats.espf}`],
        ].map(([label, value]) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-3">
            <div className="text-xs text-slate-600">{label}</div>
            <div className="font-extrabold text-xl text-slate-900 tabular-nums mt-1">{value}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-600">„Deutsch als Zweitsprache“ wird nur aus dem dafür gespeicherten Sprachfeld gezählt. Das DaZ-Förderkennzeichen ist eine davon getrennte Angabe; fehlende Einträge werden nicht geraten.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <Distribution title="Erstsprachen" rows={stats.firstLanguages} total={stats.total} />
        <Distribution title="Zweitsprachen" rows={stats.secondLanguages} total={stats.total} />
        <Distribution title="Religionen" rows={stats.religions} total={stats.total} />
        <Distribution title="Geschlecht" rows={stats.genders} total={stats.total} />
        <Distribution title="Staatsbürgerschaften" rows={stats.citizenships} total={stats.total} />
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="font-bold text-slate-900 mb-3">Alter & Förderung</h4>
          <p className="text-sm text-slate-700 mb-1">Ø {stats.ages.average} Jahre · Min. {stats.ages.minimum ?? '–'} · Max. {stats.ages.maximum ?? '–'}</p>
          <p className="text-xs text-slate-500 mb-3">Geburtsdatum erfasst: {stats.ages.recorded} von {stats.total}</p>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">DaZ {stats.daz}</span>
            <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">SPF {stats.spf}</span>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">ESPF {stats.espf}</span>
          </div>
          <p className="text-xs text-slate-500 mt-3">Förderkennzeichen können sich bei einem Kind überschneiden.</p>
        </section>
      </div>
    </section>
  );
}
