import React, { useEffect, useMemo, useState } from 'react';
import { Edit2, FileUp, Search, UserPlus, Users, X } from 'lucide-react';
import type { Student } from '../types';
import { useApp } from '../context/AppContext';
import { mergeImportedStudents, toDateInputValue } from '../lib/studentListData';
import { KlassenlistenImport } from './KlassenlistenImport';
import Sek1ClassPicker from './Sek1ClassPicker';
import Sek1StudentDossier from './Sek1StudentDossier';

type BasisForm = { id?: string; vorname: string; nachname: string; geburtstag: string; notiz: string };
const EMPTY: BasisForm = { vorname: '', nachname: '', geburtstag: '', notiz: '' };

export default function Sek1Students() {
  const { app, setApp, updateStudent } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<BasisForm | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  useEffect(() => { setSelectedId(null); setForm(null); setImportOpen(false); setSearch(''); setImportMessage(''); }, [app.activeClassId]);
  const students = useMemo(() => (app.schueler || []).filter(s => `${s.vorname} ${s.nachname}`.toLocaleLowerCase('de-AT').includes(search.toLocaleLowerCase('de-AT')))
    .sort((a, b) => a.nachname.localeCompare(b.nachname, 'de-AT') || a.vorname.localeCompare(b.vorname, 'de-AT')), [app.schueler, search]);
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form?.vorname.trim() || !form.nachname.trim()) return;
    const existing = app.schueler.find(s => s.id === form.id);
    const id = existing?.id || crypto.randomUUID();
    const vorname = form.vorname.trim(), nachname = form.nachname.trim();
    const student: Student = existing
      ? { ...existing, vorname, nachname, name: `${vorname} ${nachname}`, geburtstag: form.geburtstag, notiz: form.notiz }
      : {
          id, vorname, nachname, name: `${vorname} ${nachname}`, geburtstag: form.geburtstag, notiz: form.notiz,
          niveau: 3, staatsbuergerschaft: '', religion: '', besuchsjahr: '', espf: false, spf: false,
          erstsprache: '', geschlecht: '', gruppen: [],
        };
    updateStudent(student);
    setForm(null);
  };
  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <Sek1ClassPicker />
      {selectedId ? <Sek1StudentDossier key={selectedId} studentId={selectedId} onBack={() => setSelectedId(null)} /> : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">{app.klassenbezeichnung} · {app.stufe}. Schulstufe</p>
              <h1 className="mt-1 text-2xl font-black text-[var(--text)]">Schüler:innen</h1>
              <p className="mt-1 text-sm text-[var(--text2)]">{app.schueler.length} Personen · Grunddaten, Notizen, Verhalten, Notenmappe und Anwesenheit</p></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-bold text-[var(--text)]"><FileUp size={16}/> Liste importieren</button>
              <button type="button" onClick={() => setForm({ ...EMPTY })} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white"><UserPlus size={16}/> Schüler:in hinzufügen</button>
            </div>
          </header>
          {importMessage && <p role="status" className="rounded-xl bg-[var(--surface2)] p-3 text-sm text-[var(--text)]">{importMessage}</p>}
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><Search size={18} className="text-[var(--text2)]"/><input type="search" aria-label="Schüler:innen suchen" value={search} onChange={e => setSearch(e.target.value)} placeholder="Schüler:innen suchen …" className="w-full bg-transparent text-sm text-[var(--text)] outline-none"/></label>
          {students.length === 0 ? <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--text2)]">{app.schueler.length ? 'Keine passenden Personen gefunden.' : 'Für diese Klasse sind noch keine Schüler:innen angelegt.'}</p> :
            <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
              {students.map(student => <li key={student.id} className="flex items-center justify-between gap-3 p-3 sm:p-4">
                <button type="button" onClick={() => setSelectedId(student.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left text-sm font-semibold text-[var(--text)] hover:underline"><Users size={17} className="shrink-0 text-[var(--accent)]"/><span className="truncate">{student.nachname}, {student.vorname}</span></button>
                <button type="button" aria-label={`Grunddaten von ${student.vorname} ${student.nachname} bearbeiten`} onClick={() => setForm({ id: student.id, vorname: student.vorname, nachname: student.nachname, geburtstag: toDateInputValue(student.geburtstag), notiz: student.notiz || '' })} className="rounded-lg border border-[var(--border)] p-2 text-[var(--text)] hover:bg-[var(--surface2)]"><Edit2 size={16}/></button>
              </li>)}
            </ul>}
        </>
      )}
      {form && <div className="fixed inset-0 z-[210] flex items-center justify-center overflow-y-auto bg-black/50 p-4" role="presentation" onClick={() => setForm(null)}>
        <form role="dialog" aria-modal="true" aria-label="Grunddaten Schüler:in" onClick={e => e.stopPropagation()} onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 text-slate-900 shadow-xl">
          <div className="flex items-center justify-between"><h2 className="text-lg font-black">Grunddaten</h2><button type="button" aria-label="Schließen" onClick={() => setForm(null)}><X size={18}/></button></div>
          {([['vorname', 'Vorname'], ['nachname', 'Nachname']] as const).map(([key,label]) => <label key={key} className="block text-sm font-semibold">{label} *<input required value={form[key]} onChange={e => setForm(f => f && ({...f,[key]: e.target.value}))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"/></label>)}
          <label className="block text-sm font-semibold">Geburtsdatum (optional)<input type="date" value={form.geburtstag} onChange={e => setForm(f => f && ({...f,geburtstag:e.target.value}))} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"/></label>
          <label className="block text-sm font-semibold">Kurzer Hinweis (optional)<textarea value={form.notiz} onChange={e => setForm(f => f && ({...f,notiz:e.target.value}))} rows={2} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"/></label>
          <p className="text-xs text-slate-600">Vorhandene weitere Stammdaten und frühere Einträge bleiben bei Änderungen erhalten. Förderprofile und Sitzplatz-Beziehungsregeln gehören nicht zum Unterstufen-Setup.</p>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setForm(null)} className="rounded-xl border border-slate-300 px-4 py-2">Abbrechen</button><button type="submit" className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white">Speichern</button></div>
        </form>
      </div>}
      {importOpen && <KlassenlistenImport onClose={() => setImportOpen(false)} onImport={incoming => {
        const outcome = mergeImportedStudents(app.schueler, incoming as Student[]);
        setApp(prev => ({ ...prev, schueler: mergeImportedStudents(prev.schueler, incoming as Student[]).students }));
        setImportMessage(`${outcome.added} hinzugefügt, ${outcome.updated} aktualisiert. Bitte die Zuordnung zur aktuellen Klasse kontrollieren.`);
        setImportOpen(false);
      }}/>}
    </main>
  );
}
