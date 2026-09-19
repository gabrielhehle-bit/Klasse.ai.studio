import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getLernzielModell, LERNZIEL_ANSICHTEN, parseLernzielModell, pruefeModellWechsel, verwendeteLernzielStufen,
  type LernzielAnsicht, type LernzielBewertungsmodell, type LernzielStufe } from '../lib/lernzielBewertungsmodell';

export default function LernzielModellEditor({ onClose }: { onClose: () => void }) {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const [draft, setDraft] = useState<LernzielBewertungsmodell>(() => structuredClone(getLernzielModell(app.lernzielBewertungsmodell)));
  const [error, setError] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(structuredClone(getLernzielModell(app.lernzielBewertungsmodell)));
    setError('');
  }, [app.activeClassId]);

  const updateLevel = (value: number, patch: Partial<LernzielStufe>) =>
    setDraft(current => ({ ...current, levels: current.levels.map(level => level.value === value ? { ...level, ...patch } : level) }));
  const move = (index: number, delta: number) => {
    const other = index + delta;
    if (other < 0 || other >= draft.levels.length) return;
    setDraft(current => {
      const levels = [...current.levels]; [levels[index], levels[other]] = [levels[other], levels[index]];
      return { ...current, levels };
    });
  };
  const add = () => {
    if (draft.levels.length >= 10) { setError('Maximal zehn Stufen.'); return; }
    const used = new Set(draft.levels.map(level => level.value));
    let value = 1;
    while (used.has(value)) value++;
    setDraft(current => ({ ...current, levels: [
      ...current.levels, { value, label: 'Neue Stufe', kurz: 'Neu', color: '#64748b', symbol: '⭐' },
    ] }));
    setError('');
  };
  const remove = (value: number) => {
    if (draft.levels.length <= 2) { setError('Mindestens zwei Beurteilungsstufen müssen bleiben.'); return; }
    const used = verwendeteLernzielStufen(app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen);
    if (used.has(value)) {
      setError('Diese Stufe wird bereits für Lernziele verwendet. Bitte zuerst die betroffenen Einschätzungen einzeln neu zuordnen.');
      return;
    }
    setDraft(current => ({ ...current, levels: current.levels.filter(item => item.value !== value) }));
    setError('');
  };
  const save = () => {
    try {
      const valid = parseLernzielModell(draft);
      const previousModel = getLernzielModell(app.lernzielBewertungsmodell);
      const used = verwendeteLernzielStufen(app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen);
      pruefeModellWechsel(previousModel, valid, used);
      const renamedUsed = previousModel.levels.some(oldLevel =>
        used.has(oldLevel.value) &&
        oldLevel.label !== valid.levels.find(level => level.value === oldLevel.value)?.label
      );
      if (renamedUsed && !window.confirm(
        'Du benennst bereits verwendete Stufen um. Frühere Einschätzungen behalten ihren Wert, erscheinen aber künftig mit dem neuen Namen. Trotzdem speichern?'
      )) return;
      setApp(previous => ({ ...previous, lernzielBewertungsmodell: valid }));
      setError('');
      showToast('Beurteilungsmodell für diese Klasse gespeichert.', 'success');
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : 'Vorlage ungültig.'); }
  };
  const exportTemplate = () => {
    try {
      const validated = parseLernzielModell(draft);
      const url = URL.createObjectURL(new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'klassio-lernziel-vorlage.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { setError(err instanceof Error ? err.message : 'Export nicht möglich.'); }
  };
  const importTemplate = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 32768) throw new Error('Vorlage ist zu groß (maximal 32 KB).');
      const parsed = parseLernzielModell(JSON.parse(await file.text()));
      pruefeModellWechsel(getLernzielModell(app.lernzielBewertungsmodell), parsed,
        verwendeteLernzielStufen(app.studentLernzielSemesterBewertungen, app.studentLernzielBewertungen));
      setDraft(parsed);
      setError('');
      showToast('Vorlage geprüft. Bitte Änderungen für diese Klasse speichern.', 'info');
    } catch (err) { setError(err instanceof Error ? err.message : 'Vorlage konnte nicht gelesen werden.'); }
    finally { if (uploadRef.current) uploadRef.current.value = ''; }
  };
  const setView = (type: keyof LernzielBewertungsmodell['views'], value: LernzielAnsicht) =>
    setDraft(current => ({ ...current, views: { ...current.views, [type]: value } }));

  return <section className="space-y-4 rounded-2xl border-2 border-indigo-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Beurteilungsmodell bearbeiten">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-black text-slate-900">Lernziel-Beurteilungsmodell dieser Klasse</h3>
        <p className="mt-1 text-xs text-slate-600">Namen, Anzahl, Farben, Reihenfolge und Darstellungen frei wählen. Diese Lernzielstufen sind keine Schulnoten. Die Oberau-Erläuterungsmatrix bleibt ein eigenes Beurteilungsformular.</p>
      </div>
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">Schließen</button>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-slate-700">Name der Vorlage
        <input className="input-field mt-1 w-full" value={draft.name} maxLength={80} onChange={e => setDraft(current => ({ ...current, name: e.target.value }))} />
      </label>
      <label className="text-xs font-bold text-slate-700">Noch nicht eingeschätzt (keine Beurteilungsstufe)
        <input className="input-field mt-1 w-full" value={draft.emptyLabel} maxLength={50} onChange={e => setDraft(current => ({ ...current, emptyLabel: e.target.value }))} />
      </label>
    </div>
    <p className="text-xs text-slate-600">Von der anfänglichen bis zur weitestgehend erreichten Stufe sortieren. Die internen Werte bleiben bei Umbenennung oder Sortierung erhalten.</p>
    <div className="space-y-2">
      {draft.levels.map((level, i) => <div key={level.value} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <label className="min-w-36 flex-1 text-xs font-semibold text-slate-700">Bezeichnung
          <input className="input-field mt-1 w-full" value={level.label} maxLength={55} onChange={e => updateLevel(level.value, { label: e.target.value })} />
        </label>
        <label className="w-32 text-xs font-semibold text-slate-700">Kurzform
          <input className="input-field mt-1 w-full" value={level.kurz} maxLength={25} onChange={e => updateLevel(level.value, { kurz: e.target.value })} />
        </label>
        <label className="w-16 text-xs font-semibold text-slate-700">Symbol
          <input className="input-field mt-1 w-full" value={level.symbol} maxLength={8} onChange={e => updateLevel(level.value, { symbol: e.target.value })} />
        </label>
        <label className="text-xs font-semibold text-slate-700">Farbe
          <input type="color" className="mt-1 block h-10 w-12 cursor-pointer rounded-lg" value={level.color} onChange={e => updateLevel(level.value, { color: e.target.value })} />
        </label>
        <button type="button" aria-label={level.label + ' nach vorne'} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg border px-2 py-2 text-sm disabled:opacity-30">↑</button>
        <button type="button" aria-label={level.label + ' nach hinten'} disabled={i === draft.levels.length - 1} onClick={() => move(i, 1)} className="rounded-lg border px-2 py-2 text-sm disabled:opacity-30">↓</button>
        <button type="button" aria-label={level.label + ' entfernen'} onClick={() => remove(level.value)} className="rounded-lg border border-rose-200 px-2 py-2 text-xs font-bold text-rose-700">Entfernen</button>
      </div>)}
    </div>
    <button type="button" onClick={add} disabled={draft.levels.length >= 10} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold disabled:opacity-40">+ Bewertungsstufe ergänzen</button>
    <div className="grid gap-3 sm:grid-cols-3">
      {([['kind', 'Kinder'], ['parents', 'Eltern'], ['teachers', 'Lehrpersonen']] as const).map(([type, label]) =>
        <label key={type} className="text-xs font-bold text-slate-700">Darstellung für {label}
          <select value={draft.views[type]} className="input-field mt-1 w-full" onChange={e => setView(type, e.target.value as LernzielAnsicht)}>
            {LERNZIEL_ANSICHTEN.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
        </label>)}
    </div>
    <p className="text-xs text-slate-600">Vorlagen werden ohne Schülerdaten exportiert. Beim Import wird nur diese Klasse geändert, erst nach ausdrücklichem Speichern. Eine bereits verwendete Stufe lässt sich nicht stillschweigend löschen oder umdeuten.</p>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={save} className="rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white">Modell speichern</button>
      <button type="button" onClick={exportTemplate} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Vorlage exportieren (JSON)</button>
      <label className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Vorlage importieren
        <input ref={uploadRef} type="file" accept=".json,application/json" className="sr-only" onChange={event => void importTemplate(event.target.files?.[0])} />
      </label>
    </div>
  </section>;
}
