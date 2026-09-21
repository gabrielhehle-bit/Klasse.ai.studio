import React, {useMemo, useState} from 'react';
import {Search, Users} from 'lucide-react';
import {useApp} from '../context/AppContext';
import Sek1ClassPicker from './Sek1ClassPicker';
import Sek1StudentDossier from './Sek1StudentDossier';

/** Eigenes, reduziertes Dossier für MS und AHS-Unterstufe. */
export default function Sek1DossierHub() {
  const {app} = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  React.useEffect(() => { setSelected(null); setSearch(''); }, [app.activeClassId]);
  const students = useMemo(() => [...(app.schueler || [])].filter(student =>
    `${student.vorname} ${student.nachname}`.toLocaleLowerCase('de-AT').includes(search.toLocaleLowerCase('de-AT')))
    .sort((a,b) => a.nachname.localeCompare(b.nachname,'de-AT') || a.vorname.localeCompare(b.vorname,'de-AT')), [app.schueler,search]);
  return <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
    <Sek1ClassPicker />
    {selected ? <Sek1StudentDossier key={selected} studentId={selected} onBack={() => setSelected(null)} /> : <>
      <header><p className="text-xs font-bold uppercase tracking-wide text-[var(--accent)]">{app.klassenbezeichnung}</p><h1 className="mt-1 text-2xl font-black text-[var(--text)]">Schülerdossier</h1><p className="mt-1 text-sm text-[var(--text2)]">Kurze Übersicht mit Notizen, Verhalten, Notenmappe und Anwesenheit.</p></header>
      <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><Search size={18}/><input type="search" aria-label="Schüler:in suchen" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Schüler:in suchen …" className="w-full bg-transparent text-sm text-[var(--text)] outline-none"/></label>
      {students.length ? <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{students.map(student=><li key={student.id}><button type="button" onClick={()=>setSelected(student.id)} className="flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-left font-semibold text-[var(--text)] hover:border-[var(--accent)]"><Users size={18} className="text-[var(--accent)]"/>{student.nachname}, {student.vorname}</button></li>)}</ul> : <p className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm text-[var(--text2)]">Keine passenden Schüler:innen vorhanden.</p>}
    </>}
  </main>;
}
