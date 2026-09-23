import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Heart, Pencil, Save, User, X, ImagePlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { LehrerProfil } from '../types';
import { prepareProfileImage } from '../lib/profileImage';
import TeacherAvatar, { safeProfileImage } from './TeacherAvatar';
import PlanungsStatistik from './PlanungsStatistik';
import TeacherSelfCare from './TeacherSelfCare';
import PersonalTimetable from './PersonalTimetable';

type TeacherProfileTab = 'profile' | 'timetable' | 'planning' | 'selfcare';
type ProfileDraft = {
  name: string; kuerzel: string; anrede: string; schule: string;
  motto: string; spruch: string; mottoAnzeige: 'motto' | 'spruch' | 'aus';
  akzentfarbe: string; gegruendetYear: string;
};

export default function LehrerProfilView() {
  const { app, setApp } = useApp();
  const [activeTab, setActiveTab] = useState<TeacherProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageBusy, setImageBusy] = useState<'avatar' | 'cover' | null>(null);
  const profile = app.lehrerProfil || {};
  const profileName = profile.name?.trim() || app.lehrerName?.trim() ||
    [app.vorname, app.nachname].filter(Boolean).join(' ') || 'Lehrkraft';
  const school = profile.schule || app.schulName || '';
  const classes = (app.classes || []).filter(room => room?.id && room?.name);
  const personalEntries = profile.stundenplanByYear?.[app.schuljahr] || [];
  const visibleQuote = profile.mottoAnzeige === 'aus' ? '' :
    profile.mottoAnzeige === 'spruch' ? (profile.spruch || '') : (profile.motto || '');
  const createDraft = (): ProfileDraft => ({
    name: profile.name || app.lehrerName || '',
    kuerzel: profile.kuerzel || '',
    anrede: profile.anrede ?? app.anrede ?? '',
    schule: school,
    motto: profile.motto || '',
    spruch: profile.spruch || '',
    mottoAnzeige: profile.mottoAnzeige || (profile.motto ? 'motto' : 'aus'),
    akzentfarbe: profile.akzentfarbe || app.customAccentColor || '#0d9488',
    gegruendetYear: profile.gegruendetYear || '',
  });
  const [draft, setDraft] = useState<ProfileDraft>(createDraft);
  useEffect(() => {
    if (!isEditing) setDraft(createDraft());
  }, [isEditing, app.lehrerProfil, app.lehrerName, app.anrede, app.schulName, app.customAccentColor]);

  const saveProfile = () => {
    const color = /^#[0-9a-f]{6}$/i.test(draft.akzentfarbe) ? draft.akzentfarbe : '#0d9488';
    const previousColor = profile.akzentfarbe || app.customAccentColor || '#0d9488';
    const name = draft.name.trim().slice(0, 90), schule = draft.schule.trim().slice(0, 120);
    const newProfile: LehrerProfil = {
      ...profile,
      name, kuerzel: draft.kuerzel.trim().slice(0, 16),
      anrede: draft.anrede.trim().slice(0, 30), schule,
      motto: draft.motto.trim().slice(0, 240), spruch: draft.spruch.trim().slice(0, 240),
      mottoAnzeige: draft.mottoAnzeige,
      akzentfarbe: color, gegruendetYear: draft.gegruendetYear.trim().slice(0, 4),
    };
    setApp(prev => ({
      ...prev,
      // The display identity is account-level: do not overwrite the active
      // classroom's school/teacher fields, which may belong to a colleague.
      lehrerProfil: { ...(prev.lehrerProfil || {}), ...newProfile },
      ...(color !== previousColor ? { theme: 'custom_theme', customAccentColor: color } : {}),
    }));
    setIsEditing(false);
  };
  const uploadImage = async (file: File | undefined, kind: 'avatar' | 'cover') => {
    if (!file) return;
    setImageError('');
    setImageBusy(kind);
    try {
      const url = await prepareProfileImage(file, kind);
      const field = kind === 'avatar' ? 'fotoDataUrl' : 'titelbildDataUrl';
      setApp(prev => ({
        ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}), [field]: url },
      }));
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Das Bild konnte nicht verarbeitet werden.');
    } finally { setImageBusy(null); }
  };

  const tabs: Array<{ id: TeacherProfileTab; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Mein Profil', icon: <User size={16} /> },
    { id: 'timetable', label: 'Mein Stundenplan', icon: <CalendarDays size={16} /> },
    { id: 'planning', label: 'Planungsstatistik', icon: <BarChart3 size={16} /> },
    { id: 'selfcare', label: 'Self-Care', icon: <Heart size={16} /> },
  ];

  return <main className="mx-auto w-full max-w-6xl space-y-5 px-2 py-2 sm:px-4">
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Persönliche Profilkarte">
      <div className="relative h-28 bg-gradient-to-r from-indigo-100 via-sky-50 to-emerald-100 sm:h-40"
        style={profile.akzentfarbe ? { backgroundColor: profile.akzentfarbe + '22' } : undefined}>
        {safeProfileImage(profile.titelbildDataUrl) && <img alt="" src={safeProfileImage(profile.titelbildDataUrl)}
          className="h-full w-full object-cover" />}
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
          Mein KLASSIO
        </span>
      </div>
      <div className="relative flex flex-wrap items-end justify-between gap-3 px-4 pb-5 sm:px-7">
        <div className="flex min-w-0 items-end gap-3">
          <TeacherAvatar app={app} size="lg" className="-mt-9 bg-white shadow-md ring-4 ring-white sm:-mt-12" />
          <div className="min-w-0 pb-1 pt-3">
            <h1 className="break-words text-xl font-black text-slate-900 sm:text-2xl">{profileName}</h1>
            <p className="mt-0.5 text-sm font-semibold text-slate-500">
              {profile.kuerzel ? profile.kuerzel + ' · ' : ''}{school || 'Schule noch nicht eingetragen'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pb-1">
          <button type="button" onClick={() => { setActiveTab('profile'); setDraft(createDraft()); setIsEditing(true); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-text,var(--btn-text,#ffffff))]">
            <Pencil size={16} /> Profil bearbeiten
          </button>
        </div>
        {visibleQuote && <p className="w-full break-words rounded-xl bg-slate-50 px-4 py-2 text-sm italic text-slate-600">
          „{visibleQuote}“
        </p>}
      </div>
    </section>
    <nav aria-label="Profil-Bereiche" className="flex flex-wrap gap-2">
      {tabs.map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id}
        onClick={() => setActiveTab(tab.id)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold transition ${activeTab === tab.id ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
        {tab.icon}{tab.label}
      </button>)}
    </nav>
    {activeTab === 'profile' && <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_310px]">
      <section className="min-w-0 space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">So sieht dein KLASSIO aus</h2>
            <p className="mt-1 text-sm text-slate-500">Deine Angaben sind persönlich und nicht an eine Klasse gebunden.</p>
          </div>
          {!isEditing ? <button type="button" onClick={() => { setDraft(createDraft()); setIsEditing(true); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">
            <Pencil size={15} /> Bearbeiten
          </button> : <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setDraft(createDraft()); setIsEditing(false); }}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">
              <X size={15} /> Verwerfen
            </button>
            <button type="button" onClick={saveProfile}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--accent-text,var(--btn-text,#ffffff))]">
              <Save size={15} /> Speichern
            </button>
          </div>}
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-slate-700">Profilfoto
            <span className="mt-1 flex items-center gap-3">
              <TeacherAvatar app={app} size="md" />
              <input type="file" accept="image/jpeg,image/png,image/webp"
                aria-label="Profilfoto auswählen" disabled={!!imageBusy}
                onChange={event => { void uploadImage(event.target.files?.[0], 'avatar'); event.target.value = ''; }}
                className="min-w-0 max-w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-bold" />
            </span>
            {profile.fotoDataUrl && <button type="button" onClick={() => setApp(prev => ({
              ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}), fotoDataUrl: undefined },
            }))} className="mt-2 text-xs font-bold text-rose-600">Profilfoto entfernen</button>}
          </label>
          <label className="text-sm font-bold text-slate-700">Titelbild
            <span className="mt-1 flex items-center gap-2">
              <ImagePlus size={20} aria-hidden="true" />
              <input type="file" accept="image/jpeg,image/png,image/webp"
                aria-label="Titelbild auswählen" disabled={!!imageBusy}
                onChange={event => { void uploadImage(event.target.files?.[0], 'cover'); event.target.value = ''; }}
                className="min-w-0 max-w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-bold" />
            </span>
            {profile.titelbildDataUrl && <button type="button" onClick={() => setApp(prev => ({
              ...prev, lehrerProfil: { ...(prev.lehrerProfil || {}), titelbildDataUrl: undefined },
            }))} className="mt-2 text-xs font-bold text-rose-600">Titelbild entfernen</button>}
          </label>
        </div>
        {imageBusy && <p role="status" className="text-sm text-slate-600">Bild wird verkleinert und gespeichert …</p>}
        {imageError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{imageError}</p>}
        {isEditing ? <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {([
            ['name', 'Anzeigename', 'Dein Name', 90],
            ['kuerzel', 'Lehrerkürzel', 'z. B. GHe', 16],
            ['anrede', 'Bevorzugte Anrede', 'Optional', 30],
            ['schule', 'Schule (Profilanzeige)', 'Schulname', 120],
          ] as const).map(([key, label, placeholder, max]) => <label key={key} className="min-w-0 text-sm font-bold text-slate-700">
            {label}
            <input type="text" aria-label={label} maxLength={max} placeholder={placeholder}
              value={draft[key]} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.value }))}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm" />
          </label>)}
          <label className="text-sm font-bold text-slate-700">Was soll als persönlicher Text erscheinen?
            <select aria-label="Persönlicher Text" value={draft.mottoAnzeige}
              onChange={event => setDraft(prev => ({ ...prev, mottoAnzeige: event.target.value as ProfileDraft['mottoAnzeige'] }))}
              className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="aus">Kein Text</option><option value="motto">Mein Motto</option><option value="spruch">Mein Spruch</option>
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Meine Akzentfarbe
            <input type="color" aria-label="Persönliche Akzentfarbe" value={draft.akzentfarbe}
              onChange={event => setDraft(prev => ({ ...prev, akzentfarbe: event.target.value }))}
              className="mt-1 h-11 w-full cursor-pointer rounded-xl border border-slate-300 bg-white p-1" />
          </label>
          {draft.mottoAnzeige !== 'aus' && <label className="min-w-0 text-sm font-bold text-slate-700 sm:col-span-2">
            {draft.mottoAnzeige === 'motto' ? 'Mein Motto' : 'Mein Spruch'}
            <textarea rows={2} maxLength={240} aria-label={draft.mottoAnzeige === 'motto' ? 'Mein Motto' : 'Mein Spruch'}
              value={draft.mottoAnzeige === 'motto' ? draft.motto : draft.spruch}
              onChange={event => setDraft(prev => ({ ...prev, [draft.mottoAnzeige === 'motto' ? 'motto' : 'spruch']: event.target.value }))}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm" />
          </label>}
        </div> : <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Anzeigename', profileName], ['Lehrerkürzel', profile.kuerzel || 'Noch nicht eingetragen'],
            ['Anrede', profile.anrede || 'Keine Anrede ausgewählt'], ['Schule', school || 'Noch nicht eingetragen'],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 break-words text-sm font-bold text-slate-800">{value}</p>
          </div>)}
          <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Persönlicher Text</p>
            <p className="mt-1 break-words text-sm text-slate-700">{visibleQuote || 'Kein Text ausgewählt'}</p>
          </div>
        </div>}
        <p className="text-xs text-slate-500">Fotos werden auf deinem Gerät verkleinert und mit deinem KLASSIO-Datenbestand verschlüsselt gesichert. Bei verbundenem E-Mail-Konto werden sie über die bestehende verschlüsselte Synchronisation übertragen.</p>
      </section>
      <aside className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-black text-slate-900">Meine Klassen</h2>
          <p className="mt-1 text-xs text-slate-500">Aus deinem vorhandenen KLASSIO-Arbeitsbereich</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {classes.length ? classes.map(room => <span key={room.id}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">{room.name}</span>)
              : <span className="text-sm text-slate-500">Noch keine Klassen angelegt</span>}
          </div>
        </section>
        <button type="button" onClick={() => setActiveTab('timetable')}
          className="w-full rounded-3xl border border-indigo-200 bg-indigo-50 p-5 text-left shadow-sm">
          <span className="block text-xs font-black uppercase tracking-wide text-indigo-600">Mein Stundenplan</span>
          <span className="mt-2 block text-2xl font-black text-slate-900">{personalEntries.length} Einträge</span>
          <span className="mt-1 block text-sm text-slate-700">Deinen persönlichen Wochenplan öffnen →</span>
        </button>
      </aside>
    </div>}
    {activeTab === 'timetable' && <PersonalTimetable />}
    {activeTab === 'planning' && <PlanungsStatistik />}
    {activeTab === 'selfcare' && <TeacherSelfCare />}
  </main>;
}
