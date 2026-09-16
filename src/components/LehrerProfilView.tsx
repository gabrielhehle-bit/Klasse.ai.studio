import React, { useEffect, useState } from 'react';
import { BarChart3, Heart, Pencil, Save, User, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PlanungsStatistik from './PlanungsStatistik';
import TeacherSelfCare from './TeacherSelfCare';

type TeacherProfileTab = 'profile' | 'planning' | 'selfcare';

type ProfileDraft = {
  name: string;
  schule: string;
  motto: string;
  gegruendetYear: string;
};

export default function LehrerProfilView() {
  const { app, setApp } = useApp();
  const [activeTab, setActiveTab] = useState<TeacherProfileTab>('profile');
  const [isEditing, setIsEditing] = useState(false);

  const profile = app.lehrerProfil || {};
  const canonicalDraft = (): ProfileDraft => ({
    name: profile.name || app.lehrerName || '',
    schule: profile.schule || app.schulName || '',
    motto: profile.motto || '',
    gegruendetYear: profile.gegruendetYear || '',
  });
  const [draft, setDraft] = useState<ProfileDraft>(canonicalDraft);

  useEffect(() => {
    if (!isEditing) setDraft(canonicalDraft());
  }, [
    isEditing,
    app.lehrerProfil?.name,
    app.lehrerProfil?.schule,
    app.lehrerProfil?.motto,
    app.lehrerProfil?.gegruendetYear,
    app.lehrerName,
    app.schulName,
  ]);

  const startEdit = () => {
    setDraft(canonicalDraft());
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(canonicalDraft());
    setIsEditing(false);
  };

  const saveProfile = () => {
    const name = draft.name.trim();
    const schule = draft.schule.trim();
    const motto = draft.motto.trim();
    const gegruendetYear = draft.gegruendetYear.trim();

    setApp(prev => ({
      ...prev,
      lehrerName: name,
      schulName: schule,
      lehrerProfil: {
        ...(prev.lehrerProfil || {}),
        name,
        schule,
        motto,
        gegruendetYear,
      },
    }));
    setIsEditing(false);
  };

  const tabs: Array<{ id: TeacherProfileTab; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profil', icon: <User size={15} /> },
    { id: 'planning', label: 'Planungsstatistik', icon: <BarChart3 size={15} /> },
    { id: 'selfcare', label: 'Self-Care', icon: <Heart size={15} /> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <p className="text-[0.625rem] font-black uppercase tracking-[0.18em] text-indigo-500">
              Lehrerprofil
            </p>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              {profile.name || app.lehrerName || 'Lehrkraft'}
            </h2>
            <p className="text-sm font-bold text-slate-400 mt-1">
              {profile.schule || app.schulName || 'Noch keine Schule eingetragen'}
            </p>
          </div>

          <div className="flex flex-wrap bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-7">
              <div>
                <h3 className="text-lg font-black text-slate-900">Profil & Schule</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  Diese Angaben stammen aus deinem Klassio-Profil und können hier direkt gepflegt werden.
                </p>
              </div>

              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-black hover:bg-indigo-100 transition-colors"
                >
                  <Pencil size={14} />
                  Bearbeiten
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 text-xs font-black hover:bg-slate-100"
                  >
                    <X size={14} />
                    Abbrechen
                  </button>
                  <button
                    type="button"
                    onClick={saveProfile}
                    className="inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black hover:bg-indigo-700"
                  >
                    <Save size={14} />
                    Speichern
                  </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="space-y-1.5">
                  <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Anzeigename</span>
                  <input
                    value={draft.name}
                    onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="Name der Lehrkraft"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Schule</span>
                  <input
                    value={draft.schule}
                    onChange={event => setDraft(prev => ({ ...prev, schule: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="Schulname"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Startjahr im Schuldienst</span>
                  <input
                    value={draft.gegruendetYear}
                    onChange={event => setDraft(prev => ({ ...prev, gegruendetYear: event.target.value.replace(/[^0-9]/g, '').slice(0, 4) }))}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white"
                    placeholder="z. B. 2026"
                  />
                </label>
                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Motto / persönlicher Satz</span>
                  <textarea
                    value={draft.motto}
                    onChange={event => setDraft(prev => ({ ...prev, motto: event.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-indigo-500 focus:bg-white resize-y"
                    placeholder="Optional"
                  />
                </label>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Name', value: profile.name || app.lehrerName || '—' },
                  { label: 'Schule', value: profile.schule || app.schulName || '—' },
                  { label: 'Startjahr im Schuldienst', value: profile.gegruendetYear || '—' },
                  { label: 'Aktive Klasse', value: app.klassenbezeichnung || '—' },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">{item.label}</div>
                    <div className="text-sm font-black text-slate-800 mt-1">{item.value}</div>
                  </div>
                ))}
                <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Motto / persönlicher Satz</div>
                  <div className="text-sm font-bold text-slate-700 mt-1 whitespace-pre-wrap">
                    {profile.motto || 'Noch kein Motto eingetragen.'}
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
              <div className="text-[0.625rem] font-black uppercase tracking-wider text-slate-400">Aktuelle Klasse</div>
              <div className="text-2xl font-black text-slate-900 mt-2">{app.klassenbezeichnung || '—'}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">
                {app.schueler?.length || 0} Schüler:innen · {app.stufe || '—'}. Schulstufe
              </div>
            </div>
            <div className="bg-indigo-50 rounded-[2rem] border border-indigo-100 p-5">
              <div className="text-xs font-black text-indigo-900">Keine erfundenen Karrierekennzahlen</div>
              <p className="text-xs font-medium text-indigo-700/80 leading-relaxed mt-2">
                Klassio zeigt hier nur Angaben, die du selbst gespeichert hast. Unterrichtsstunden, Korrekturen oder Laufbahnwerte werden nicht automatisch hochgerechnet.
              </p>
            </div>
          </aside>
        </div>
      )}

      {activeTab === 'planning' && <PlanungsStatistik />}
      {activeTab === 'selfcare' && <TeacherSelfCare />}
    </div>
  );
}
