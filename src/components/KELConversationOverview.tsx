import React from 'react';
import { useApp } from '../context/AppContext';
import type { KELGespraech } from '../types';
import { buildKelConversationOverview } from '../lib/kelConversationOverview';

const MOOD_COLORS = ['#047857', '#2563eb', '#64748b', '#d97706', '#be123c'];

/**
 * Compact discussion-only companion to the shared parent print report.
 * It never mutates school records or silently adds private notes to a print.
 */
export default function KELConversationOverview({ meeting }: { meeting: KELGespraech }) {
  const { app } = useApp();
  const overview = buildKelConversationOverview(app, meeting);
  const mood = overview.mood;
  const behavior = overview.behavior;

  return (
    <section data-kel-conversation-overview data-kel-conversation-child={meeting.schuelerId}
      className="no-print overflow-hidden rounded-[2rem] border border-teal-100 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100 bg-teal-50/60 px-5 py-4 sm:px-7">
        <div>
          <h2 className="text-base font-extrabold text-teal-950">Gespräch auf einen Blick</h2>
          <p className="mt-1 text-xs leading-relaxed text-teal-900">
            Gespeicherte Gesprächsziele zusammen mit den dokumentierten Lernbereichen aus dem Schülerdossier.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-teal-800">
          {meeting.schuljahr || 'Schuljahr nicht hinterlegt'}
        </span>
      </div>

      {overview.showLiveEvidence ? (
        <div data-kel-current-evidence className="grid grid-cols-1 gap-3 p-4 sm:p-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Befinden</h3>
            <p className="mt-1 text-xs text-slate-500">Selbsteinschätzung des Kindes · Schuljahr</p>
            {mood && mood.total > 0 ? (
              <>
                <p className="mt-2 text-sm font-bold tabular-nums text-slate-800">
                  {mood.total} {mood.total === 1 ? 'Rückmeldung' : 'Rückmeldungen'}
                </p>
                <div data-kel-conversation-mood-chart className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100"
                  role="img" aria-label={`Verteilung der ${mood.total} Befindens-Einschätzungen`}>
                  {mood.counts.map((count, index) => count > 0 && (
                    <div key={index} style={{ width: `${count / mood.total * 100}%`, backgroundColor: MOOD_COLORS[index] }} />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {mood.positiveCount} von {mood.total} Einschätzungen: gut oder sehr gut.
                </p>
              </>
            ) : <p className="mt-3 text-xs text-slate-500">Noch keine gültigen Rückmeldungen im Schuljahr.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Verhalten &amp; Sozialverhalten</h3>
            <p className="mt-1 text-xs text-slate-500">Dokumentierte Tageswerte · Schuljahr</p>
            {behavior && behavior.total > 0 ? (
              <>
                <p className="mt-2 text-sm font-bold tabular-nums text-slate-800">
                  {behavior.total} {behavior.total === 1 ? 'Tageswert' : 'Tageswerte'}
                </p>
                <div data-kel-conversation-behavior-chart className="mt-2 flex h-3 overflow-hidden rounded-full bg-slate-100"
                  role="img" aria-label={`Verteilung von ${behavior.total} dokumentierten Tageswerten`}>
                  {behavior.rows.map(row => (
                    <div key={row.id} title={`${row.label}: ${row.count}`}
                      style={{ width: `${row.count / behavior.total * 100}%`, backgroundColor: row.color }} />
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {behavior.rows.map(row => `${row.label}: ${row.count}`).join(' · ')}
                </p>
              </>
            ) : <p className="mt-3 text-xs text-slate-500">Keine dokumentierten Tageswerte im Schuljahr.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <h3 className="text-sm font-bold text-slate-900">Lernbereiche</h3>
            <p className="mt-1 text-xs text-slate-500">Tatsächliche bewertete Nachweise · Schuljahr</p>
            {overview.subjects.length ? (
              <div data-kel-conversation-learning className="mt-3 max-h-60 space-y-3 overflow-y-auto pr-1">
                {overview.subjects.map(subject => (
                  <div key={subject.subject}>
                    <p className="mb-1 text-xs font-bold text-slate-800">{subject.subject}</p>
                    {subject.areas.map(area => (
                      <div key={area.area} className="mb-2">
                        <div className="flex items-baseline justify-between gap-2 text-[11px]">
                          <span className="min-w-0 break-words text-slate-700">{area.area}</span>
                          <span className="shrink-0 font-bold tabular-nums text-teal-900">
                            {Math.round(area.percent)} % · {area.assessments} {area.assessments === 1 ? 'Nachweis' : 'Nachweise'}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-teal-600"
                            style={{ width: `${Math.max(0, Math.min(100, area.percent))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-xs text-slate-500">Noch keine auswertbaren Lernbereiche dokumentiert.</p>}
          </div>
        </div>
      ) : (
        <p data-kel-historical-evidence className="mx-5 mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
          Dieses Protokoll gehört nicht zum aktuellen Schuljahr oder nicht zur aktiven Klasse.
          Heutige Lern- und Verhaltensdaten werden deshalb nicht als damaliger Gesprächsstand angezeigt.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:px-5 sm:pb-5 lg:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Persönliche Rückmeldungen</h3>
          <p className="mt-1 text-[11px] text-slate-500">Originalkommentare der Lehrperson aus dem Protokoll</p>
          {overview.teacherComments.length ? (
            <div data-kel-conversation-feedback className="mt-3 space-y-3">
              {overview.teacherComments.slice(0, 3).map(comment => (
                <div key={comment.id}>
                  <p className="text-xs font-semibold text-slate-700">{comment.label}</p>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">{comment.text}</p>
                </div>
              ))}
              {overview.teacherComments.length > 3 && (
                <p className="text-[11px] text-slate-500">Weitere Rückmeldungen in der vollständigen Gesprächsansicht.</p>
              )}
            </div>
          ) : <p className="mt-3 text-xs text-slate-500">Noch keine ausformulierten Rückmeldungen gespeichert.</p>}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Ziele des Kindes</h3>
          {overview.goals.length ? (
            <div data-kel-conversation-goals className="mt-3 space-y-3">
              {overview.goals.slice(0, 3).map((goal, index) => (
                <div key={goal.id || index}>
                  <p className="whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-800">{goal.text}</p>
                  {(goal.recognizable || goal.due) && (
                    <p className="mt-0.5 break-words text-[11px] leading-relaxed text-slate-500">
                      {goal.recognizable ? `Woran erkennbar: ${goal.recognizable}` : ''}
                      {goal.recognizable && goal.due ? ' · ' : ''}
                      {goal.due ? `Bis: ${goal.due}` : ''}
                    </p>
                  )}
                </div>
              ))}
              {overview.goals.length > 3 && <p className="text-[11px] text-slate-500">Weitere Ziele stehen im vollständigen Protokoll.</p>}
            </div>
          ) : <p className="mt-3 text-xs text-slate-500">Noch keine Ziele vereinbart.</p>}
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">Vereinbarungen</h3>
          {overview.agreements ? (
            <p data-kel-conversation-agreements
              className="mt-3 max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
              {overview.agreements}
            </p>
          ) : <p className="mt-3 text-xs text-slate-500">Noch keine Vereinbarungen festgehalten.</p>}
        </div>
      </div>

      <p className="px-5 pb-4 text-[11px] leading-relaxed text-slate-500">
        Aktuelle Schuldokumentation, kein archivierter Stand vom Gesprächsdatum.
        Prozentwerte sind Mittelwerte dokumentierter Nachweise, keine vollständige Kompetenzdiagnose.
        Das Elternblatt wird separat und nur mit ausdrücklich freigegebenen Protokolltexten erstellt.
      </p>
    </section>
  );
}
