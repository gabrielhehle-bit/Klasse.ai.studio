import React, { useMemo, useState } from 'react';
import { BookOpen, HelpCircle, Search, ChevronDown } from 'lucide-react';
import { PAGE_HELP, SETTINGS_HELP, WIDGET_HELP, type HelpTopic } from '../../lib/helpContent';

type HelpSection = 'pages' | 'widgets' | 'settings';

const sections: { id: HelpSection; title: string; items: readonly HelpTopic[] }[] = [
  { id: 'pages', title: 'App-Seiten & Tools', items: PAGE_HELP },
  { id: 'widgets', title: 'Unterrichts-Widgets', items: WIDGET_HELP },
  { id: 'settings', title: 'Einstellungen', items: SETTINGS_HELP },
];

const normalize = (value: string) => value
  .toLocaleLowerCase('de-AT')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/ß/g, 'ss');

export default function HelpCenter() {
  const [section, setSection] = useState<HelpSection>('pages');
  const [query, setQuery] = useState('');
  const selected = sections.find(item => item.id === section)!;
  const entries = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) return selected.items;
    return selected.items.filter(topic =>
      normalize([topic.title, topic.area, topic.purpose, topic.canDo, ...topic.steps].join(' ')).includes(term),
    );
  }, [query, selected]);

  return (
    <section className="space-y-5" aria-labelledby="klassio-help-title">
      <header className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <BookOpen size={24} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">KLASSIO nachschlagen</p>
            <h2 id="klassio-help-title" className="text-xl font-black text-slate-900 sm:text-2xl">Hilfe & Anleitungen</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">
          Was macht eine Seite, was kannst du damit erledigen und wie beginnst du?
          Hier findest du die App-Bereiche, alle aktuell auswählbaren Cockpit-Widgets und die Einstellungen.
          Für die ersten Schritte öffne zuerst die passende Anleitung.
        </p>
      </header>

      <nav aria-label="Hilfe-Kategorien" className="flex flex-wrap gap-2">
        {sections.map(item => (
          <button key={item.id} type="button" aria-pressed={section === item.id}
            onClick={() => { setSection(item.id); setQuery(''); }}
            className={`min-h-11 rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${section === item.id
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>
            {item.title} <span aria-hidden="true" className="opacity-75">({item.items.length})</span>
          </button>
        ))}
      </nav>

      <label htmlFor="klassio-help-search" className="block space-y-2">
        <span className="text-sm font-bold text-slate-800">Anleitung suchen</span>
        <span className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-200">
          <Search size={18} className="shrink-0 text-slate-500" aria-hidden="true" />
          <input id="klassio-help-search" value={query} onChange={event => setQuery(event.target.value)}
            className="w-full min-w-0 bg-transparent py-3 text-sm text-slate-900 outline-none"
            placeholder="z. B. Gruppen, Anwesenheit, Backup …" type="search" autoComplete="off" />
        </span>
      </label>

      <p role="status" className="text-xs font-semibold text-slate-600">
        {entries.length} von {selected.items.length} Anleitungen in „{selected.title}“
      </p>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          <p className="font-bold">Zu diesem Suchbegriff wurde in dieser Kategorie nichts gefunden.</p>
          <p className="mt-1">Versuche einen kürzeren Begriff oder wähle eine andere Hilfe-Kategorie.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(topic => (
            <details key={`${section}-${topic.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm open:border-indigo-300 sm:p-5">
              <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-700">{topic.area}</span>
                  <span className="mt-1 block text-base font-extrabold text-slate-900">{topic.title}</span>
                  <span className="mt-1 block text-sm leading-5 text-slate-600">{topic.purpose}</span>
                </span>
                <ChevronDown size={20} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Was kann ich damit machen?</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{topic.canDo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">So geht’s</h3>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
                    {topic.steps.map((step, index) => <li key={index}>{step}</li>)}
                  </ol>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-bold"><HelpCircle size={17} aria-hidden="true" />Noch eine Frage?</div>
        <p className="mt-2 leading-6">
          Falls deine Schulmail nicht erkannt wird oder kein Anmeldecode ankommt, erreichst du uns unter
          {' '}<a href="mailto:noreply@klassio.at?subject=KLASSIO%20Hilfe" className="font-bold text-indigo-700 underline">noreply@klassio.at</a>.
        </p>
      </footer>
    </section>
  );
}
