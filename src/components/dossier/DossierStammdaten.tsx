import React, { useEffect, useMemo, useState } from 'react';
import { Student } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Heart,
  Home,
  Mail,
  MapPin,
  Phone,
  PhoneCall,
  Save,
  School,
  ShieldCheck,
  User,
  Users,
  X
} from 'lucide-react';

interface DossierStammdatenProps {
  student: Student;
}

type FieldProps = {
  label: string;
  value?: string | number;
  icon: React.ElementType;
  field?: keyof Student;
  type?: 'text' | 'date' | 'email' | 'tel' | 'number';
  contactLink?: 'tel' | 'mail';
  emptyLabel?: string;
};

export default function DossierStammdaten({ student }: DossierStammdatenProps) {
  const { setApp } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState(student);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showLogSuccess, setShowLogSuccess] = useState(false);

  useEffect(() => {
    setEditedStudent(student);
    setIsEditing(false);
  }, [student.id]);

  const completeness = useMemo(() => {
    const checks = [
      { label: 'Geburtsdatum', ready: Boolean(student.geburtstag) },
      { label: 'Anschrift', ready: Boolean(student.anschrift) },
      { label: 'PLZ und Ort', ready: Boolean(student.plz && student.ort) },
      {
        label: 'mindestens ein Elternkontakt',
        ready: Boolean(student.telefon_mutter || student.telefon_vater || student.email_eltern)
      }
    ];
    const completed = checks.filter(item => item.ready).length;
    return {
      completed,
      total: checks.length,
      percentage: Math.round((completed / checks.length) * 100),
      missing: checks.filter(item => !item.ready).map(item => item.label)
    };
  }, [student]);

  const handleSave = () => {
    const normalizedStudent: Student = {
      ...editedStudent,
      name: `${editedStudent.vorname || ''} ${editedStudent.nachname || ''}`.trim(),
      stammdatenAktualisiertAm: new Date().toISOString()
    };

    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => s.id === student.id ? normalizedStudent : s)
    }));
    setEditedStudent(normalizedStudent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedStudent(student);
    setIsEditing(false);
  };

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogPhoneCall = (parentType: 'Mutter' | 'Vater') => {
    const number = parentType === 'Mutter' ? student.telefon_mutter : student.telefon_vater;
    const now = Date.now();
    const newMeeting = {
      id: `meet-${now}`,
      schuelerId: student.id,
      thema: `Telefonat mit ${parentType}`,
      datum: new Date().toISOString().split('T')[0],
      notizen: `Telefonischer Kontakt mit ${parentType} dokumentiert.`,
      vereinbarungen: number ? `Verwendete Nummer: ${number}` : ''
    };
    const statusLogItem = {
      id: `call-log-${now}`,
      schuelerId: student.id,
      timestamp: now,
      iconId: '2',
      comment: `Telefonischer Kontakt mit ${parentType} dokumentiert.`
    };

    setApp((prev: any) => ({
      ...prev,
      elterngespraeche: [newMeeting, ...(prev.elterngespraeche || [])],
      statusLog: [statusLogItem, ...(prev.statusLog || [])]
    }));
    setShowLogSuccess(true);
    setTimeout(() => setShowLogSuccess(false), 4000);
  };

  const formatBirthday = (value?: string) => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('de-DE');
  };

  const Field = ({
    label,
    value,
    icon: Icon,
    field,
    type = 'text',
    contactLink,
    emptyLabel = 'Nicht erfasst'
  }: FieldProps) => {
    const rawValue = field ? editedStudent[field] : value;
    const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
    const isCopied = copiedField === label;

    return (
      <div className={`rounded-2xl border p-4 transition-colors ${
        hasValue ? 'border-slate-200 bg-white' : 'border-amber-200 bg-amber-50/45'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            hasValue ? 'bg-slate-100 text-slate-500' : 'bg-amber-100 text-amber-600'
          }`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">
                {label}
              </span>
              {!isEditing && hasValue && (
                <button
                  onClick={() => handleCopy(String(value), label)}
                  className="rounded p-0.5 text-slate-400 transition-colors hover:text-indigo-600"
                  title="In Zwischenablage kopieren"
                  aria-label={`${label} kopieren`}
                >
                  {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                </button>
              )}
            </div>

            {isEditing && field ? (
              <input
                type={type}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[0.8125rem] font-bold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                value={rawValue === undefined || rawValue === null ? '' : String(rawValue)}
                onChange={event => setEditedStudent({
                  ...editedStudent,
                  [field]: type === 'number' ? event.target.value : event.target.value
                })}
                aria-label={label}
              />
            ) : (
              <div className={`break-words text-[0.875rem] font-extrabold ${
                hasValue ? 'text-slate-800' : 'text-amber-700'
              }`}>
                {hasValue ? value : emptyLabel}
              </div>
            )}
          </div>

          {!isEditing && hasValue && contactLink && (
            <a
              href={contactLink === 'tel' ? `tel:${value}` : `mailto:${value}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-indigo-700"
              title={contactLink === 'tel' ? 'Anrufen' : 'E-Mail schreiben'}
              aria-label={`${label}: ${contactLink === 'tel' ? 'anrufen' : 'E-Mail schreiben'}`}
            >
              {contactLink === 'tel' ? <Phone size={14} /> : <Mail size={14} />}
            </a>
          )}
        </div>
      </div>
    );
  };

  const Section = ({
    title,
    description,
    icon: Icon,
    children
  }: {
    title: string;
    description: string;
    icon: React.ElementType;
    children: React.ReactNode;
  }) => (
    <section className="rounded-[1.75rem] border border-slate-200 bg-slate-50/40 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
          <Icon size={18} />
        </div>
        <div>
          <h4 className="text-[0.9375rem] font-black text-slate-900">{title}</h4>
          <p className="mt-0.5 text-[0.6875rem] font-semibold leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );

  const addressLine = [student.plz, student.ort].filter(Boolean).join(' ');

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-blue-500" />
            <h3 className="text-[1.5rem] font-black tracking-tight text-slate-900">Stammdaten & Kontakt</h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-semibold text-slate-500">
            Persönliche, schulische und für die Kommunikation wichtige Angaben.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[0.625rem] font-black uppercase tracking-widest text-slate-700 transition hover:bg-slate-50"
            >
              <X size={14} /> Abbrechen
            </button>
          )}
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-[0.625rem] font-black uppercase tracking-widest text-white shadow-md transition active:scale-95 ${
              isEditing ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-950 hover:bg-slate-800'
            }`}
          >
            {isEditing ? <Save size={14} /> : <User size={14} />}
            {isEditing ? 'Änderungen speichern' : 'Daten bearbeiten'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.55fr)]">
        <div className="rounded-[1.75rem] border border-indigo-100 bg-indigo-50/55 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.625rem] font-black uppercase tracking-widest text-indigo-600">Datenvollständigkeit</div>
              <div className="mt-1 text-[1.375rem] font-black text-indigo-950">
                {completeness.completed} von {completeness.total} wichtigen Bereichen
              </div>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[0.875rem] font-black text-indigo-700 shadow-sm">
              {completeness.percentage}%
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-indigo-100">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${completeness.percentage}%` }} />
          </div>
        </div>

        <div className={`rounded-[1.75rem] border p-5 ${
          completeness.missing.length ? 'border-amber-200 bg-amber-50/55' : 'border-emerald-200 bg-emerald-50/55'
        }`}>
          <div className="flex items-start gap-3">
            {completeness.missing.length
              ? <AlertCircle className="mt-0.5 shrink-0 text-amber-600" size={19} />
              : <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} />}
            <div>
              <div className={`text-[0.75rem] font-black ${completeness.missing.length ? 'text-amber-900' : 'text-emerald-900'}`}>
                {completeness.missing.length ? 'Noch sinnvoll zu ergänzen' : 'Wichtige Angaben vollständig'}
              </div>
              <p className={`mt-1 text-[0.6875rem] font-semibold leading-relaxed ${
                completeness.missing.length ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {completeness.missing.length ? completeness.missing.join(', ') : 'Die zentralen Kontakt- und Adressdaten sind vorhanden.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {showLogSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[0.8125rem] font-bold text-emerald-800">
          <CheckCircle2 className="shrink-0 text-emerald-500" size={18} />
          Der Telefonkontakt wurde bei den Elterngesprächen und in der Dossier-Chronik dokumentiert.
        </div>
      )}

      {!isEditing && (student.telefon_mutter || student.telefon_vater) && (
        <div className="flex flex-col justify-between gap-4 rounded-[1.75rem] border border-indigo-100 bg-white p-5 md:flex-row md:items-center">
          <div>
            <h4 className="flex items-center gap-2 text-[0.875rem] font-black text-indigo-950">
              <PhoneCall size={16} className="text-indigo-600" /> Telefonkontakt dokumentieren
            </h4>
            <p className="mt-1 text-[0.6875rem] font-semibold text-indigo-700">
              Nach einem geführten Telefonat kannst du den Kontakt mit einem Klick in der Historie festhalten.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {student.telefon_mutter && (
              <button
                onClick={() => handleLogPhoneCall('Mutter')}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[0.6875rem] font-black text-indigo-800 transition hover:bg-indigo-100"
              >
                Telefonat mit Mutter eintragen
              </button>
            )}
            {student.telefon_vater && (
              <button
                onClick={() => handleLogPhoneCall('Vater')}
                className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-[0.6875rem] font-black text-indigo-800 transition hover:bg-indigo-100"
              >
                Telefonat mit Vater eintragen
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <Section title="Persönliche Angaben" description="Identität und grundlegende Informationen zum Kind." icon={User}>
          <Field label="Vorname" value={student.vorname} icon={User} field="vorname" />
          <Field label="Nachname" value={student.nachname} icon={User} field="nachname" />
          <Field label="Geburtsdatum" value={formatBirthday(student.geburtstag)} icon={Calendar} field="geburtstag" type="date" />
          <Field label="SV-Nummer" value={student.sv_nummer} icon={ShieldCheck} field="sv_nummer" />
          <Field label="Staatsbürgerschaft" value={student.staatsbuergerschaft} icon={ShieldCheck} field="staatsbuergerschaft" />
          <Field label="Religion" value={student.religion} icon={Heart} field="religion" />
        </Section>

        <Section title="Schulische Angaben" description="Angaben zur aktuellen schulischen Einordnung." icon={School}>
          <Field label="Besuchsjahr" value={student.besuchsjahr ? `${student.besuchsjahr}. Jahr` : ''} icon={Clock} field="besuchsjahr" type="number" />
          <Field label="Erstsprache" value={student.erstsprache} icon={Users} field="erstsprache" />
          <Field label="Zweitsprache" value={student.zweitsprache} icon={Users} field="zweitsprache" />
        </Section>

        <Section title="Adresse" description="Wohnadresse für Schriftverkehr und schulische Unterlagen." icon={Home}>
          <Field label="Anschrift" value={student.anschrift} icon={MapPin} field="anschrift" />
          <Field label="PLZ" value={student.plz} icon={MapPin} field="plz" />
          <Field label="Ort" value={student.ort} icon={MapPin} field="ort" />
          {!isEditing && addressLine && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 md:col-span-2 xl:col-span-3">
              <div className="text-[0.625rem] font-black uppercase tracking-widest text-slate-500">Postanschrift</div>
              <div className="mt-1.5 text-[0.875rem] font-extrabold text-slate-800">
                {[student.anschrift, addressLine].filter(Boolean).join(', ')}
              </div>
            </div>
          )}
        </Section>

        <Section title="Elternkontakt" description="Kontaktdaten für Rückfragen, Gespräche und wichtige Informationen." icon={Phone}>
          <Field label="Telefon Mutter" value={student.telefon_mutter} icon={Phone} field="telefon_mutter" type="tel" contactLink="tel" />
          <Field label="Telefon Vater" value={student.telefon_vater} icon={Phone} field="telefon_vater" type="tel" contactLink="tel" />
          <Field label="E-Mail Eltern" value={student.email_eltern} icon={Mail} field="email_eltern" type="email" contactLink="mail" />
        </Section>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6 text-[0.625rem] font-black uppercase tracking-widest text-slate-500">
        <span>
          {student.stammdatenAktualisiertAm
            ? `Zuletzt gespeichert: ${new Date(student.stammdatenAktualisiertAm).toLocaleString('de-DE')}`
            : 'Noch kein Speicherzeitpunkt vorhanden'}
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500" /> Vertrauliche Schülerdaten
        </span>
      </div>
    </div>
  );
}
