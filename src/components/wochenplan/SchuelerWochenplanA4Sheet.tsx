import React from 'react';
import { SchuelerWochenplan, SchuelerWochenplanAufgabe } from '../../types';
import { BookOpen, Calculator, Globe, Star, CheckSquare, Sparkles, Clock, Calendar, Check, Smile, Meh, Frown, Award, Heart, Activity } from 'lucide-react';

interface Props {
  plan: SchuelerWochenplan;
  previewOnly?: boolean;
  colorMode?: 'color' | 'mono'; // 'color' uses subtle subject tints, 'mono' is pure 100% black & white for copy machines
  selectedDifferenzierung?: string;
}

export const SchuelerWochenplanA4Sheet: React.FC<Props> = ({
  plan,
  previewOnly = false,
  colorMode = 'color',
  selectedDifferenzierung = 'alle'
}) => {
  // Filter aufgaben based on selected flag and differenzierung filter
  const visibleAufgaben = plan.aufgaben.filter(a => {
    if (!a.selected) return false;
    if (selectedDifferenzierung !== 'alle' && a.differenzierung && a.differenzierung !== 'alle' && a.differenzierung !== selectedDifferenzierung) {
      return false;
    }
    return true;
  });

  const pflichtAufgaben = visibleAufgaben.filter(a => a.typ === 'pflicht');
  const zusatzAufgaben = visibleAufgaben.filter(a => a.typ === 'zusatz' || a.typ === 'freiwillig');

  // Font size classes
  const fontConfig = {
    kompakt: {
      title: 'text-lg',
      sub: 'text-xs',
      heading: 'text-xs py-1 px-2',
      body: 'text-[11px] leading-snug',
      detail: 'text-[9.5px]',
      checkbox: 'w-4 h-4 text-xs',
      gap: 'gap-1.5',
      p: 'p-3',
      sectionGap: 'space-y-2'
    },
    normal: {
      title: 'text-xl',
      sub: 'text-sm',
      heading: 'text-xs py-1.5 px-2.5',
      body: 'text-xs leading-normal',
      detail: 'text-[10px]',
      checkbox: 'w-5 h-5 text-sm',
      gap: 'gap-2',
      p: 'p-4',
      sectionGap: 'space-y-3'
    },
    gross: {
      title: 'text-2xl',
      sub: 'text-base',
      heading: 'text-sm py-2 px-3',
      body: 'text-sm leading-relaxed',
      detail: 'text-xs',
      checkbox: 'w-6 h-6 text-base',
      gap: 'gap-3',
      p: 'p-5',
      sectionGap: 'space-y-4'
    }
  }[plan.fontSize || 'normal'];

  // Grouping helper for 'fach'
  const groupedByFach = React.useMemo(() => {
    const groups: Record<string, SchuelerWochenplanAufgabe[]> = {};
    pflichtAufgaben.forEach(a => {
      const f = a.fach || 'Allgemein';
      if (!groups[f]) groups[f] = [];
      groups[f].push(a);
    });
    return groups;
  }, [pflichtAufgaben]);

  // Grouping helper for 'tag'
  const groupedByTag = React.useMemo(() => {
    const order = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Woche'];
    const groups: Record<string, SchuelerWochenplanAufgabe[]> = {};
    order.forEach(t => { groups[t] = []; });
    visibleAufgaben.forEach(a => {
      const t = a.tag && order.includes(a.tag) ? a.tag : 'Woche';
      groups[t].push(a);
    });
    return groups;
  }, [visibleAufgaben]);

  const renderSubjectIcon = (fach: string) => {
    const f = fach.toLowerCase();
    if (f.includes('deutsch') || f.includes('lesen')) return <BookOpen className="w-3.5 h-3.5" />;
    if (f.includes('mathe')) return <Calculator className="w-3.5 h-3.5" />;
    if (f.includes('sach')) return <Globe className="w-3.5 h-3.5" />;
    if (f.includes('sport')) return <Activity className="w-3.5 h-3.5" />;
    if (f.includes('religion')) return <Heart className="w-3.5 h-3.5" />;
    return <Sparkles className="w-3.5 h-3.5" />;
  };

  const getSubjectColorClasses = (fach: string) => {
    if (colorMode === 'mono') {
      return 'bg-slate-100 text-black border-black/60';
    }
    const f = fach.toLowerCase();
    if (f.includes('deutsch')) return 'bg-blue-50 text-blue-900 border-blue-200';
    if (f.includes('mathe')) return 'bg-red-50 text-red-900 border-red-200';
    if (f.includes('sach')) return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    if (f.includes('sport')) return 'bg-teal-50 text-teal-900 border-teal-200';
    if (f.includes('englisch')) return 'bg-sky-50 text-sky-900 border-sky-200';
    if (f.includes('musik')) return 'bg-purple-50 text-purple-900 border-purple-200';
    if (f.includes('kunst') || f.includes('werk')) return 'bg-amber-50 text-amber-900 border-amber-200';
    return 'bg-slate-100 text-slate-900 border-slate-200';
  };

  return (
    <div
      id="schueler-wochenplan-a4-document"
      className={`schueler-wochenplan-print-sheet mx-auto bg-white text-black font-sans box-border ${fontConfig.p} ${
        plan.orientierung === 'landscape' ? 'w-full max-w-[297mm] min-h-[210mm]' : 'w-full max-w-[210mm] min-h-[297mm]'
      } ${previewOnly ? 'shadow-lg border border-slate-300 rounded-sm' : ''} print:shadow-none print:border-none print:m-0 print:p-2 print:w-full print:max-w-none`}
      style={{
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        colorScheme: 'light'
      }}
    >
      {/* 1. KOPFZEILE */}
      <header className="border-b-2 border-black pb-3 mb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`${fontConfig.title} font-black uppercase tracking-wider text-black`}>
                {plan.titel || 'WOCHENPLAN'}
              </h1>
              {plan.untertitel && (
                <span className="px-2 py-0.5 bg-black text-white rounded font-bold text-xs tracking-wide">
                  {plan.untertitel}
                </span>
              )}
            </div>

            {(plan.showKw || plan.showDatum) && (
              <div className="flex items-center gap-2 mt-1 text-xs font-semibold text-slate-700 print:text-black">
                {plan.showKw && <span>KW {plan.kw}</span>}
                {plan.showKw && plan.showDatum && <span>•</span>}
                {plan.showDatum && <span>{plan.datumVon} – {plan.datumBis}</span>}
              </div>
            )}
          </div>

          {/* Schülername & Checkbox-Header */}
          <div className="flex flex-col items-end gap-1.5 min-w-[220px]">
            {plan.showNameField && (
              <div className="w-full flex items-center gap-2 bg-slate-50 print:bg-transparent border border-black/50 rounded px-2.5 py-1">
                <span className="text-xs font-bold text-black uppercase tracking-wider">Name:</span>
                <div className="flex-1 border-b border-black/80 border-dashed h-4" />
              </div>
            )}
            <div className="text-[10px] font-medium text-slate-500 print:text-black italic">
              {pflichtAufgaben.length} Pflichtaufgaben {zusatzAufgaben.length > 0 && `• ${zusatzAufgaben.length} Zusatzaufgaben`}
            </div>
          </div>
        </div>

        {/* Optionales Motto */}
        {plan.motto && (
          <div className="mt-2 text-center text-xs italic font-medium text-slate-800 print:text-black border-t border-slate-200 print:border-black/30 pt-1.5">
            „{plan.motto}“
          </div>
        )}
      </header>

      {/* 2. AUFGABEN-INHALT JE NACH DARSTELLUNGSMODUS */}
      <main className={`${fontConfig.sectionGap} mb-4`}>
        {visibleAufgaben.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-lg text-slate-500">
            <p className="font-bold text-sm">Keine Aufgaben für diesen Wochenplan ausgewählt.</p>
            <p className="text-xs mt-1">Bitte markiere in der Aufgabenliste die Unterrichtsinhalte, die die Kinder bearbeiten sollen.</p>
          </div>
        ) : plan.darstellung === 'fach' ? (
          /* ================= A) NACH FÄCHERN ================= */
          <div className="space-y-3">
            {Object.keys(groupedByFach).map(fach => {
              const tasks = groupedByFach[fach];
              if (!tasks || tasks.length === 0) return null;
              const colorClasses = getSubjectColorClasses(fach);

              return (
                <section key={fach} className="border border-black/40 rounded-lg overflow-hidden break-inside-avoid">
                  <div className={`flex items-center justify-between font-black uppercase tracking-wider ${fontConfig.heading} ${colorClasses} border-b border-black/30`}>
                    <div className="flex items-center gap-1.5">
                      {renderSubjectIcon(fach)}
                      <span>{fach}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-bold">
                      {tasks.length} {tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200 print:divide-black/20 bg-white">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex items-start ${fontConfig.gap} p-2 hover:bg-slate-50/50`}>
                        {/* Große Checkbox für Kinder */}
                        <div className={`${fontConfig.checkbox} shrink-0 mt-0.5 border-2 border-black rounded-sm bg-white flex items-center justify-center font-bold text-black select-none print:border-black`}>
                          {/* Blank for child to check */}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`${fontConfig.body} font-bold text-black`}>
                              {task.titel}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              {task.tag && (
                                <span className="text-[9px] font-bold text-slate-500 print:text-black uppercase tracking-tight">
                                  {task.tag.slice(0, 2)}
                                </span>
                              )}
                              {task.zeitAufwandMin && (
                                <span className="text-[9px] font-medium text-slate-400 print:text-black">
                                  ~{task.zeitAufwandMin}m
                                </span>
                              )}
                            </div>
                          </div>

                          {task.detail && (
                            <p className={`${fontConfig.detail} text-slate-600 print:text-black/80 mt-0.5 font-normal`}>
                              {task.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ZUSATZAUFGABEN-BLOCK (STERNCHENAUFGABEN) */}
            {zusatzAufgaben.length > 0 && (
              <section className="border-2 border-dashed border-black/60 rounded-lg overflow-hidden break-inside-avoid bg-amber-50/20 print:bg-white">
                <div className={`flex items-center justify-between font-black uppercase tracking-wider ${fontConfig.heading} bg-amber-100/70 print:bg-slate-100 text-amber-950 print:text-black border-b border-black/30`}>
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-700 print:fill-black print:text-black" />
                    <span>Zusatzaufgaben & Sternchen</span>
                  </div>
                  <span className="text-[10px] font-bold">Freiwillig</span>
                </div>

                <div className="divide-y divide-slate-200 print:divide-black/20 bg-white">
                  {zusatzAufgaben.map((task) => (
                    <div key={task.id} className={`flex items-start ${fontConfig.gap} p-2`}>
                      <div className={`${fontConfig.checkbox} shrink-0 mt-0.5 border-2 border-black rounded-full bg-white flex items-center justify-center font-bold text-amber-600 print:text-black select-none`}>
                        ★
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={`${fontConfig.body} font-bold text-black`}>
                            {task.titel}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 border border-black/20 rounded">
                            {task.fach}
                          </span>
                        </div>
                        {task.detail && (
                          <p className={`${fontConfig.detail} text-slate-600 print:text-black/80 mt-0.5`}>
                            {task.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : plan.darstellung === 'tag' ? (
          /* ================= B) NACH WOCHENTAGEN ================= */
          <div className="space-y-3">
            {Object.keys(groupedByTag).map(tag => {
              const tasks = groupedByTag[tag];
              if (!tasks || tasks.length === 0) return null;

              return (
                <section key={tag} className="border border-black/40 rounded-lg overflow-hidden break-inside-avoid">
                  <div className={`flex items-center justify-between font-black uppercase tracking-wider ${fontConfig.heading} bg-slate-100 text-black border-b border-black/30`}>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{tag === 'Woche' ? 'Ganze Woche / Flexibel' : tag}</span>
                    </div>
                    <span className="text-[10px] font-bold">
                      {tasks.length} {tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-200 print:divide-black/20 bg-white">
                    {tasks.map((task) => (
                      <div key={task.id} className={`flex items-start ${fontConfig.gap} p-2 hover:bg-slate-50/50`}>
                        <div className={`${fontConfig.checkbox} shrink-0 mt-0.5 border-2 border-black rounded-sm bg-white flex items-center justify-center font-bold text-black select-none`}>
                          {task.typ === 'zusatz' ? '★' : ''}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black px-1.5 py-0.2 border border-black/30 rounded bg-slate-50 uppercase">
                                {task.fach}
                              </span>
                              <span className={`${fontConfig.body} font-bold text-black`}>
                                {task.titel}
                              </span>
                            </div>
                            {task.typ === 'zusatz' && (
                              <span className="text-[9px] font-bold text-amber-700 print:text-black">
                                Zusatz
                              </span>
                            )}
                          </div>
                          {task.detail && (
                            <p className={`${fontConfig.detail} text-slate-600 print:text-black/80 mt-0.5`}>
                              {task.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        ) : plan.darstellung === 'gitter' ? (
          /* ================= D) WOCHENRASTER (5 SPALTEN) ================= */
          <div className="grid grid-cols-5 gap-2 border border-black/40 rounded-lg p-2 bg-slate-50/50 print:bg-white">
            {['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'].map(tag => {
              const tasks = groupedByTag[tag] || [];
              return (
                <div key={tag} className="border border-black/30 rounded bg-white flex flex-col min-h-[140px]">
                  <div className="bg-slate-100 border-b border-black/30 p-1 text-center font-black text-[11px] uppercase tracking-wider">
                    {tag}
                  </div>
                  <div className="p-1.5 space-y-2 flex-1">
                    {tasks.length === 0 ? (
                      <div className="text-[10px] text-slate-400 italic text-center py-4">
                        Keine Aufgabe
                      </div>
                    ) : (
                      tasks.map(task => (
                        <div key={task.id} className="border-b border-slate-100 pb-1 last:border-none">
                          <div className="flex items-start gap-1">
                            <div className="w-3.5 h-3.5 mt-0.5 border border-black rounded-xs shrink-0 flex items-center justify-center text-[8px]">
                              {task.typ === 'zusatz' ? '★' : ''}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[9px] font-black text-slate-700 block uppercase leading-none">
                                {task.fach}
                              </span>
                              <p className="text-[10px] font-bold text-black leading-tight mt-0.5">
                                {task.titel}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ================= C) EINFACHE AUFGABENLISTE ================= */
          <div className="border border-black/40 rounded-lg overflow-hidden bg-white">
            <div className={`flex items-center justify-between font-black uppercase tracking-wider ${fontConfig.heading} bg-slate-100 text-black border-b border-black/30`}>
              <span>Aufgabenübersicht</span>
              <span className="text-[10px] font-bold">{visibleAufgaben.length} Aufgaben gesamt</span>
            </div>
            <div className="divide-y divide-slate-200 print:divide-black/20">
              {visibleAufgaben.map((task, idx) => (
                <div key={task.id} className={`flex items-start ${fontConfig.gap} p-2 hover:bg-slate-50/50`}>
                  <div className={`${fontConfig.checkbox} shrink-0 mt-0.5 border-2 border-black rounded-sm bg-white flex items-center justify-center font-bold text-black select-none`}>
                    {task.typ === 'zusatz' ? '★' : ''}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black px-1.5 py-0.2 border border-black/30 rounded bg-slate-50 uppercase">
                          {task.fach}
                        </span>
                        <span className={`${fontConfig.body} font-bold text-black`}>
                          {task.titel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {task.tag && (
                          <span className="text-[9px] font-bold text-slate-500 uppercase">
                            {task.tag}
                          </span>
                        )}
                        {task.typ === 'zusatz' && (
                          <span className="text-[9px] font-bold text-amber-700">★ Zusatz</span>
                        )}
                      </div>
                    </div>
                    {task.detail && (
                      <p className={`${fontConfig.detail} text-slate-600 print:text-black/80 mt-0.5`}>
                        {task.detail}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* 3. FUSSZEILE: SELBSTREFLEXION & UNTERSCHRIFT */}
      <footer className="border-t-2 border-black pt-3 mt-auto break-inside-avoid">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          {/* Selbstreflexion für Kinder */}
          {plan.showReflexion && (
            <div className="border border-black/40 rounded p-2 bg-slate-50/50 print:bg-transparent">
              <span className="text-[10px] font-black uppercase text-black block mb-1">
                Meine Selbsteinschätzung:
              </span>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[10px]" />
                  <span>😃 Super</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[10px]" />
                  <span>🙂 Gut</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <div className="w-4 h-4 rounded-full border border-black flex items-center justify-center text-[10px]" />
                  <span>🤔 Hilfe nötig</span>
                </label>
              </div>
            </div>
          )}

          {/* Unterschrift */}
          {plan.showUnterschrift && (
            <div className="border border-black/40 rounded p-2 bg-slate-50/50 print:bg-transparent flex flex-col justify-end">
              <span className="text-[10px] font-black uppercase text-black block mb-2">
                Unterschrift Eltern / Lehrkraft:
              </span>
              <div className="border-b border-black border-dashed h-4" />
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};
