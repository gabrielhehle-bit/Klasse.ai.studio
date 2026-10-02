import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/components/dossier/DossierLeistungen.tsx';
let source = readFileSync(path, 'utf8');

source = source
  .replace("{ key: 'sa', label: 'Schularbeiten / Tests', items: s.items.filter(i => i.category === 'sa') },", "{ key: 'sa', label: 'Schularbeit / Test', items: s.items.filter(i => i.category === 'sa') },")
  .replace("{ key: 'lzk', label: 'Lernzielkontrollen', items: s.items.filter(i => i.category === 'lzk') },", "{ key: 'lzk', label: 'Lernzielkontrolle', items: s.items.filter(i => i.category === 'lzk') },")
  .replace("{ key: 'wp', label: 'Wochenplan / WOPL', items: s.items.filter(i => i.category === 'wp') },", "{ key: 'wp', label: 'Wochenplan', items: s.items.filter(i => i.category === 'wp') },")
  .replace("{ key: 'aufgaben', label: 'Hausübungen & Aufgaben', items: s.items.filter(i => i.category === 'aufgaben') },", "{ key: 'aufgaben', label: 'Hausübung / Aufgabe', items: s.items.filter(i => i.category === 'aufgaben') },");

const startMarker = '        {/* Leistungsdaten nach Kategorien (Requirement 4 & 5) */}';
const endMarker = '        {/* Modal for adding/editing an assessment */}';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Assessment section markers not found');

const replacement = `        {/* Leistungsdaten nach Kategorien (Requirement 4 & 5) */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Leistungsnachweise</h4>
              <p className="mt-1 text-[0.68rem] text-slate-500">Kompakt nach Art geordnet · Eintrag anklicken oder „Bearbeiten“ wählen</p>
            </div>
            <span className="text-[0.68rem] font-semibold text-slate-400">{s.itemsCount} {s.itemsCount === 1 ? 'Nachweis' : 'Nachweise'} insgesamt</span>
          </div>

          {categoriesWithData.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-xs text-slate-500">
              In diesem Fach sind noch keine Einträge vorhanden. Klicke auf „Leistungsnachweis“, um eine Bewertung hinzuzufügen.
            </div>
          ) : (
            <div className="grid gap-3 xl:grid-cols-2">
              {categoriesWithData.map(cat => {
                const categoryTone =
                  cat.key === 'sa'
                    ? { shell: 'border-violet-200', header: 'bg-violet-50/80 border-violet-100', badge: 'bg-violet-100 text-violet-800', action: 'text-violet-700 hover:bg-violet-100' }
                    : cat.key === 'lzk'
                    ? { shell: 'border-sky-200', header: 'bg-sky-50/80 border-sky-100', badge: 'bg-sky-100 text-sky-800', action: 'text-sky-700 hover:bg-sky-100' }
                    : cat.key === 'wp'
                    ? { shell: 'border-emerald-200', header: 'bg-emerald-50/80 border-emerald-100', badge: 'bg-emerald-100 text-emerald-800', action: 'text-emerald-700 hover:bg-emerald-100' }
                    : { shell: 'border-amber-200', header: 'bg-amber-50/80 border-amber-100', badge: 'bg-amber-100 text-amber-800', action: 'text-amber-700 hover:bg-amber-100' };
                const categoryIcon = cat.key === 'sa' ? FileText : cat.key === 'lzk' ? Target : cat.key === 'wp' ? Layers : CheckCircle2;
                const CategoryIcon = categoryIcon;

                return (
                  <section
                    key={cat.key}
                    data-assessment-category={cat.key}
                    className={\`overflow-hidden rounded-2xl border bg-white shadow-xs \${categoryTone.shell}\`}
                  >
                    <div className={\`flex items-center justify-between gap-2 border-b px-3 py-2 \${categoryTone.header}\`}>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={\`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[0.68rem] font-black \${categoryTone.badge}\`}>
                          <CategoryIcon size={13} />
                          {cat.label}
                        </span>
                        <span className="text-[0.65rem] font-bold text-slate-500">{cat.items.length}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAddModal(s.fach, cat.key as any)}
                        className={\`shrink-0 rounded-lg px-2 py-1 text-[0.68rem] font-bold transition \${categoryTone.action}\`}
                      >
                        + Nachweis
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {cat.items.map(item => (
                        <div
                          key={item.id}
                          data-assessment-row
                          className="group grid gap-2 px-3 py-2.5 transition hover:bg-slate-50/80 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item, s.fach)}
                            className="min-w-0 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                            aria-label={\`Bearbeiten: \${item.label}\`}
                          >
                            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-xs font-black text-slate-900">{item.label}</span>
                              <span className="text-[0.65rem] font-semibold text-slate-400">
                                {item.date ? new Date(\`\${item.date}T00:00:00\`).toLocaleDateString('de-AT') : 'Ohne Datum'}
                              </span>
                            </div>
                            {item.note && (
                              <p className="mt-0.5 line-clamp-1 text-[0.68rem] italic text-slate-500" title={item.note}>
                                „{item.note}“
                              </p>
                            )}
                            <span className="mt-0.5 block text-[0.6rem] font-semibold text-slate-400 sm:hidden">Klick zum Bearbeiten</span>
                          </button>

                          <div className="sm:text-right">
                            <div className="text-sm font-black text-slate-900">
                              {mode === 'grades'
                                ? \`Note \${item.rawGrade}\`
                                : mode === 'points'
                                ? \`\${item.score ?? '-'} / \${item.maxScore ?? '-'} Pkt.\`
                                : \`\${item.percent ?? '-'} %\`}
                            </div>
                            {showPointsPercent && mode === 'points' && item.percent !== undefined && (
                              <div className="text-[0.68rem] font-semibold text-slate-500">
                                {item.percent.toLocaleString('de-AT', { maximumFractionDigits: 1 })} %
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item, s.fach)}
                              className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[0.68rem] font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              <Edit2 size={12} />
                              <span>Bearbeiten</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssessment(s.fach, item.category, item.colIndex ?? 0)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              title="Löschen"
                              aria-label={\`Löschen: \${item.label}\`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

`;

source = source.slice(0, start) + replacement + source.slice(end);
writeFileSync(path, source);
console.log('Patched', path);
