import React, { useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  User,
  Calendar,
  School,
  MapPin,
  Shield,
  Eye,
  EyeOff,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Building2,
  Clock,
  Heart,
  Trash2
} from 'lucide-react';

interface DossierStammdatenProps {
  student: Student;
}

export default function DossierStammdaten({ student }: DossierStammdatenProps) {
  const { app, setApp, deleteStudent } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [showSvnr, setShowSvnr] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vorname: student.vorname || '',
    nachname: student.nachname || '',
    geburtstag: student.geburtstag || student.geburtsdatum || '',
    geschlecht: student.geschlecht || '',
    besuchsjahr: student.besuchsjahr || '',
    staatsbuergerschaft: student.staatsbuergerschaft || '',
    religion: student.religion || '',
    sv_nummer: student.sv_nummer || '',
    anschrift: student.anschrift || '',
    plz: student.plz || '',
    ort: student.ort || '',
    erstsprache: student.erstsprache || '',
    zweitsprache: student.zweitsprache || '',
  });

  React.useEffect(() => {
    setFormData({
      vorname: student.vorname || '',
      nachname: student.nachname || '',
      geburtstag: student.geburtstag || student.geburtsdatum || '',
      geschlecht: student.geschlecht || '',
      besuchsjahr: student.besuchsjahr || '',
      staatsbuergerschaft: student.staatsbuergerschaft || '',
      religion: student.religion || '',
      sv_nummer: student.sv_nummer || '',
      anschrift: student.anschrift || '',
      plz: student.plz || '',
      ort: student.ort || '',
      erstsprache: student.erstsprache || '',
      zweitsprache: student.zweitsprache || '',
    });
    setIsEditing(false);
    setShowSvnr(false);
  }, [student.id]);

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    const updated: Student = {
      ...student,
      vorname: formData.vorname.trim(),
      nachname: formData.nachname.trim(),
      name: `${formData.vorname.trim()} ${formData.nachname.trim()}`.trim(),
      geburtstag: formData.geburtstag,
      geburtsdatum: formData.geburtstag,
      geschlecht: formData.geschlecht,
      besuchsjahr: formData.besuchsjahr,
      staatsbuergerschaft: formData.staatsbuergerschaft.trim(),
      religion: formData.religion.trim(),
      sv_nummer: formData.sv_nummer.trim(),
      anschrift: formData.anschrift.trim(),
      plz: formData.plz.trim(),
      ort: formData.ort.trim(),
      erstsprache: formData.erstsprache.trim(),
      zweitsprache: formData.zweitsprache.trim(),
      stammdatenAktualisiertAm: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => (s.id === student.id ? updated : s))
    }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      vorname: student.vorname || '',
      nachname: student.nachname || '',
      geburtstag: student.geburtstag || student.geburtsdatum || '',
      geschlecht: student.geschlecht || '',
      besuchsjahr: student.besuchsjahr || '',
      staatsbuergerschaft: student.staatsbuergerschaft || '',
      religion: student.religion || '',
      sv_nummer: student.sv_nummer || '',
      anschrift: student.anschrift || '',
      plz: student.plz || '',
      ort: student.ort || '',
      erstsprache: student.erstsprache || '',
      zweitsprache: student.zweitsprache || '',
    });
    setIsEditing(false);
  };

  // Masking SVNR: e.g. "1234••••••"
  const formatSvnr = (raw?: string) => {
    if (!raw || raw.trim() === '') return null;
    const clean = raw.trim();
    if (showSvnr) return clean;
    if (clean.length > 4) {
      return `${clean.slice(0, 4)}••••••`;
    }
    return '••••••••••';
  };

  const calculateAge = (dateStr?: string) => {
    if (!dateStr) return null;
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('.');
    let bDate: Date;
    if (dateStr.includes('-')) {
      bDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    } else {
      bDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    if (isNaN(bDate.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - bDate.getFullYear();
    const m = now.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < bDate.getDate())) {
      age--;
    }
    return age >= 0 ? `${age} Jahre` : null;
  };

  const formattedBirthday = () => {
    const raw = student.geburtstag || student.geburtsdatum;
    if (!raw) return 'Nicht erfasst';
    if (raw.includes('-')) {
      return raw.split('-').reverse().join('.');
    }
    return raw;
  };

  const fullAddress = [student.anschrift, [student.plz, student.ort].filter(Boolean).join(' ')].filter(Boolean).join(', ');

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Top action header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-slate-700" />
            <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
              Stammdaten
            </h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
            Personenstandsdaten, schulische Einordnung und Adressdaten.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[0.6875rem] font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer shadow-3xs"
            >
              <X size={14} /> Abbrechen
            </button>
          )}
          <button
            type="button"
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[0.6875rem] font-bold uppercase tracking-wider text-white shadow-3xs transition active:scale-95 cursor-pointer ${
              isEditing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {isEditing ? <Save size={14} /> : <Edit3 size={14} />}
            {isEditing ? 'Änderungen speichern' : 'Stammdaten bearbeiten'}
          </button>
        </div>
      </div>

      {/* 3 LOGICAL GROUPS */}
      <div className="space-y-5">
        {/* 1. PERSÖNLICHE DATEN */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs">
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <User size={15} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Persönliche Daten
            </h4>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Vorname */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Vorname
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.vorname}
                  onChange={e => setFormData({ ...formData, vorname: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">{student.vorname || '—'}</div>
              )}
            </div>

            {/* Nachname */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Nachname
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.nachname}
                  onChange={e => setFormData({ ...formData, nachname: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">{student.nachname || '—'}</div>
              )}
            </div>

            {/* Geburtsdatum & Alter */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Geburtsdatum
              </span>
              {isEditing ? (
                <input
                  type="date"
                  value={formData.geburtstag}
                  onChange={e => setFormData({ ...formData, geburtstag: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>{formattedBirthday()}</span>
                  {calculateAge(student.geburtstag || student.geburtsdatum) && (
                    <span className="text-xs font-medium text-slate-400">
                      ({calculateAge(student.geburtstag || student.geburtsdatum)})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Geschlecht */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Geschlecht
              </span>
              {isEditing ? (
                <select
                  value={formData.geschlecht}
                  onChange={e => setFormData({ ...formData, geschlecht: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Keine Angabe</option>
                  <option value="m">männlich (m)</option>
                  <option value="w">weiblich (w)</option>
                  <option value="d">divers (d)</option>
                </select>
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {student.geschlecht === 'm'
                    ? 'Männlich'
                    : student.geschlecht === 'w'
                    ? 'Weiblich'
                    : student.geschlecht === 'd'
                    ? 'Divers'
                    : student.geschlecht || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 2. SCHULISCHE ZUORDNUNG */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs">
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <School size={15} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Schulische Zuordnung
            </h4>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Klasse */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Klasse
              </span>
              <div className="text-sm font-bold text-slate-800">
                {[app.stufe ? `${app.stufe}.` : '', app.klassenbezeichnung].filter(Boolean).join(' ') || '—'}
              </div>
            </div>

            {/* Schulbesuchsjahr */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Schulbesuchsjahr
              </span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.besuchsjahr}
                  onChange={e => setFormData({ ...formData, besuchsjahr: e.target.value })}
                  placeholder="z. B. 3"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {student.besuchsjahr ? `${student.besuchsjahr}. Schulbesuchsjahr` : <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                </div>
              )}
            </div>

            {/* Schuljahr */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Schuljahr
              </span>
              <div className="text-sm font-bold text-slate-800">
                {app.schuljahr || '2025/2026'}
              </div>
            </div>

            {/* Schulname */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Schule
              </span>
              <div className="text-sm font-bold text-slate-800 truncate" title={(app as any).schulName || (app as any).schule || 'Volksschule'}>
                {(app as any).schulName || (app as any).schule || 'Volksschule'}
              </div>
            </div>
          </div>
        </section>

        {/* 3. WEITERE STAMMDATEN & ADRESSE */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs">
          <div className="flex items-center gap-2.5 pb-3.5 border-b border-slate-100">
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Building2 size={15} />
            </div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Weitere Stammdaten & Adresse
            </h4>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Wohnadresse */}
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block">
                  Wohnadresse
                </span>
                {!isEditing && fullAddress && (
                  <button
                    type="button"
                    onClick={() => handleCopy(fullAddress, 'Adresse')}
                    className="text-[0.6875rem] font-bold text-slate-400 hover:text-indigo-600 inline-flex items-center gap-1"
                  >
                    {copiedField === 'Adresse' ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                    <span>{copiedField === 'Adresse' ? 'Kopiert' : 'Kopieren'}</span>
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-3">
                    <input
                      type="text"
                      placeholder="Straße und Hausnummer"
                      value={formData.anschrift}
                      onChange={e => setFormData({ ...formData, anschrift: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="PLZ"
                      value={formData.plz}
                      onChange={e => setFormData({ ...formData, plz: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Ort"
                      value={formData.ort}
                      onChange={e => setFormData({ ...formData, ort: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {fullAddress || <span className="text-slate-400 font-normal">Keine Adresse hinterlegt</span>}
                </div>
              )}
            </div>

            {/* Sozialversicherungsnummer (SVNR) - Maskiert */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Sozialversicherungsnummer (SVNR)
              </span>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="10-stellige SVNR"
                  value={formData.sv_nummer}
                  onChange={e => setFormData({ ...formData, sv_nummer: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 font-mono"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-bold text-slate-800">
                    {formatSvnr(student.sv_nummer) || <span className="text-slate-400 font-normal font-sans">Nicht erfasst</span>}
                  </span>
                  {student.sv_nummer && (
                    <button
                      type="button"
                      onClick={() => setShowSvnr(!showSvnr)}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      title={showSvnr ? 'SVNR verbergen' : 'SVNR anzeigen'}
                      aria-label={showSvnr ? 'SVNR verbergen' : 'SVNR anzeigen'}
                    >
                      {showSvnr ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Staatsbürgerschaft */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Staatsbürgerschaft
              </span>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="z. B. Österreich"
                  value={formData.staatsbuergerschaft}
                  onChange={e => setFormData({ ...formData, staatsbuergerschaft: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {student.staatsbuergerschaft || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                </div>
              )}
            </div>

            {/* Religion */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Religion / Bekenntnis
              </span>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="z. B. rk, o.B., islam."
                  value={formData.religion}
                  onChange={e => setFormData({ ...formData, religion: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {student.religion || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                </div>
              )}
            </div>

            {/* Erstsprache / Zweitsprache (vorhandene Felder) */}
            <div>
              <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Erstsprache
              </span>
              {isEditing ? (
                <input
                  type="text"
                  placeholder="z. B. Deutsch"
                  value={formData.erstsprache}
                  onChange={e => setFormData({ ...formData, erstsprache: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              ) : (
                <div className="text-sm font-bold text-slate-800">
                  {student.erstsprache || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Danger Zone: Delete Student */}
      <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Diesen Schüler/diese Schülerin unwiderruflich aus dem Klassenverband entfernen:
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Möchtest du ${student.vorname} ${student.nachname} wirklich endgültig löschen? Alle zugehörigen Noten und Daten werden unwiderruflich entfernt.`)) {
              deleteStudent(student.id);
            }
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
        >
          <Trash2 size={14} />
          <span>Schüler/in löschen</span>
        </button>
      </div>

      {/* Footer information */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span className="flex items-center gap-1.5">
          <Shield size={13} className="text-slate-400" /> Administrative Schülerdaten
        </span>
        {student.stammdatenAktualisiertAm && (
          <span>Stand: {new Date(student.stammdatenAktualisiertAm).toLocaleDateString('de-AT')}</span>
        )}
      </div>
    </div>
  );
}
