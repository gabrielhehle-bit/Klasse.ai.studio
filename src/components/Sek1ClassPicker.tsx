import React from 'react';
import { Plus, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { istSekundarstufe } from '../lib/sek1Navigation';
import { normalizeSchulart } from '../lib/schularten';

/** In der Sekundarstufe wechseln Lehrpersonen zwischen ihren Klassen direkt bei Schüler:innen. */
export default function Sek1ClassPicker() {
  const { app, switchClass, setPage } = useApp();
  // Wenn eine Lehrkraft auch VS-Klassen hat, bleibt der Klassenwechsel nach dem
  // Wechsel zu einer VS-Klasse weiterhin direkt in Schüler:innen erreichbar.
  if (!(app.classes || []).some(klasse => istSekundarstufe(klasse.schulart))) return null;

  const classes = app.classes || [];
  const schulartText = (value: unknown) => {
    switch (normalizeSchulart(value)) {
      case 'mittelschule': return 'MS';
      case 'ahs_unterstufe': return 'AHS-Unterstufe';
      default: return 'VS';
    }
  };
  return (
    <nav aria-label="Klassenwechsel in Schüler:innen" className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm print:hidden">
      <div className="min-w-0 flex-1">
        <label htmlFor="sek1-students-class" className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--text2)]">
          <Users size={16} /> Schüler:innen · Klasse auswählen
        </label>
        <select id="sek1-students-class" value={app.activeClassId || ''}
          onChange={e => {
            const next = e.target.value;
            if (next && next !== app.activeClassId && classes.some(c => c.id === next)) switchClass(next);
          }}
          className="w-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2.5 font-semibold text-[var(--text)]">
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name} · {schulartText(c.schulart)} · {c.stufe}. Schulstufe{c.schuljahr && c.schuljahr !== app.schuljahr ? ` · ${c.schuljahr}` : ''}</option>
          ))}
        </select>
      </div>
      <button type="button" onClick={() => setPage('setup_new')}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-bold text-[var(--text)] hover:bg-[var(--surface2)]">
        <Plus size={16} /> Weitere Klasse
      </button>
    </nav>
  );
}
