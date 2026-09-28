import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, HelpCircle, Search, ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MISSING_PAGE_HELP_IDS, PAGE_HELP, SETTINGS_HELP, WIDGET_HELP, type HelpTopic } from '../../lib/helpContent';

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
  const [contextTarget, setContextTarget] = useState<{ section: HelpSection; topicId: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const storedSection = window.sessionStorage.getItem('klassio-help-section') as HelpSection | null;
      const storedTopic = window.sessionStorage.getItem('klassio-help-topic');
      window.sessionStorage.removeItem('klassio-help-section');
      window.sessionStorage.removeItem('klassio-help-topic');
      if (storedTopic && storedSection && ['pages', 'widgets', 'settings'].includes(storedSection)) {
        return { section: storedSection, topicId: storedTopic };
      }
    } catch {
      // Help remains fully usable without session storage.
    }
    return null;
  });
  const [section, setSection] = useState<HelpSection>(contextTarget?.section || 'pages');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleContextHelp = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: HelpSection; topicId?: string }>).detail;
      if (!detail?.section || !detail?.topicId || !['pages', 'widgets', 'settings'].includes(detail.section)) return;
      setQuery('');
      setSection(detail.section);
      setContextTarget({ section: detail.section, topicId: detail.topicId });
    };
    window.addEventListener('klassio-open-help-topic', handleContextHelp);
    return () => window.removeEventListener('klassio-open-help-topic', handleContextHelp);
  }, []);

  const selected = sections.find(item => item.id === section)!;
  const contextTopic = useMemo(() => {
    if (!contextTarget || contextTarget.section !== section) return null;
    return selected.items.find(topic => topic.id === contextTarget.topicId) || null;
  }, [contextTarget, section, selected]);

  useEffect(() => {
    if (!contextTopic) return;
    const timer = window.setTimeout(() => {
      const element = document.getElementById(`klassio-help-topic-${section}-${contextTopic.id}`) as HTMLDetailsElement | null;
      if (!element) return;
      element.open = true;
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [contextTopic, section]);
  const entries = useMemo(() => {
    const term = normalize(query.trim());
    const filtered = term
      ? selected.items.filter(topic =>
          normalize([topic.title, topic.area, topic.purpose, topic.canDo, ...topic.steps].join(' ')).includes(term),
        )
      : [...selected.items];

    if (!term && contextTopic) {
      return [
        contextTopic,
        ...filtered.filter(topic => topic.id !== contextTopic.id),
      ];
    }
    return filtered;
  }, [query, selected, contextTopic]);

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
          Klicke oben rechts auf das Fragezeichen – KLASSIO öffnet automatisch die Anleitung zu der Seite, auf der du gerade bist.
          Hier kannst du außerdem alle App-Seiten, Unterrichts-Widgets und Einstellungen durchsuchen.
        </p>
        {contextTopic && (
          <div className="mt-4 rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
            <span className="font-black text-indigo-800">Hilfe zu deiner aktuellen Seite:</span>{' '}
            <span className="font-bold text-slate-900">{contextTopic.title}</span>
            <span className="ml-1 text-slate-500">– sie steht jetzt ganz oben und ist bereits geöffnet.</span>
          </div>
        )}
        {MISSING_PAGE_HELP_IDS.length === 0 ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            <CheckCircle2 size={16} aria-hidden="true" />
            Jede aktuell verfügbare KLASSIO-Seite hat eine eigene Schritt-für-Schritt-Anleitung.
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
            <AlertTriangle size={16} aria-hidden="true" />
            Für {MISSING_PAGE_HELP_IDS.length} neue Bereiche fehlt noch eine eigene Detailanleitung.
          </div>
        )}
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
          {entries.map(topic => {
            const isContextTopic = contextTopic?.id === topic.id;
            return (
            <details
              id={`klassio-help-topic-${section}-${topic.id}`}
              key={`${section}-${topic.id}`}
              defaultOpen={isContextTopic}
              className={`group rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                isContextTopic
                  ? 'border-indigo-400 ring-2 ring-indigo-100 open:border-indigo-500'
                  : 'border-slate-200 open:border-indigo-300'
              }`}
            >
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
                  <h3 className="text-sm font-black text-slate-900">Dafür ist diese Seite da</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{topic.canDo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Schritt für Schritt</h3>
                  <ol className="mt-3 space-y-2.5">
                    {topic.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-black text-indigo-800">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </details>
            );
          })}
        </div>
      )}

      <footer className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-bold"><HelpCircle size={17} aria-hidden="true" />Tipp</div>
        <p className="mt-2 leading-6">
          Wenn etwas auf einer Seite unklar ist, gehe dorthin zurück und klicke oben rechts auf das Fragezeichen.
          Dann öffnet KLASSIO genau die Anleitung für diesen Bereich.
        </p>
      </footer>
    </section>
  );
}
