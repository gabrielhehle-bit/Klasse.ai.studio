import React, { useState } from 'react';
import { Student, FotoFreigabeStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Camera,
  CheckCircle2,
  Copy,
  Check,
  Heart,
  Mail,
  Phone,
  PhoneCall,
  Save,
  Shield,
  User,
  Users,
  X,
  AlertCircle
} from 'lucide-react';

interface DossierKontakteEinwilligungenProps {
  student: Student;
}

export default function DossierKontakteEinwilligungen({ student }: DossierKontakteEinwilligungenProps) {
  const { setApp } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student>(student);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showLogSuccess, setShowLogSuccess] = useState(false);

  // Sync if student changes
  React.useEffect(() => {
    setEditedStudent(student);
    setIsEditing(false);
  }, [student.id]);

  const handleCopy = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(label);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback if clipboard API not permitted
    }
  };

  const handleSave = () => {
    setApp(prev => ({
      ...prev,
      schueler: prev.schueler.map(s => (s.id === student.id ? {
        ...s,
        telefon_mutter: editedStudent.telefon_mutter,
        telefon_vater: editedStudent.telefon_vater,
        email_eltern: editedStudent.email_eltern,
        fotoFreigabe: editedStudent.fotoFreigabe,
        stammdatenAktualisiertAm: new Date().toISOString()
      } : s))
    }));
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedStudent(student);
    setIsEditing(false);
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

  // Contacts list
  const contactCards = [
    {
      id: 'mutter',
      role: 'Mutter / Erziehungsberechtigte',
      phone: isEditing ? editedStudent.telefon_mutter : student.telefon_mutter,
      field: 'telefon_mutter' as keyof Student,
      showCard: Boolean(student.telefon_mutter) || isEditing
    },
    {
      id: 'vater',
      role: 'Vater / Erziehungsberechtigter',
      phone: isEditing ? editedStudent.telefon_vater : student.telefon_vater,
      field: 'telefon_vater' as keyof Student,
      showCard: Boolean(student.telefon_vater) || isEditing
    },
    {
      id: 'email',
      role: 'Gemeinsame E-Mail Erziehungsberechtigte',
      email: isEditing ? editedStudent.email_eltern : student.email_eltern,
      field: 'email_eltern' as keyof Student,
      showCard: Boolean(student.email_eltern) || isEditing
    }
  ];

  const hasAnyContact = Boolean(student.telefon_mutter || student.telefon_vater || student.email_eltern);

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header with edit toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-7 w-2 rounded-full bg-indigo-500" />
            <h3 className="text-[1.375rem] font-black tracking-tight text-slate-900">
              Kontakte & Einwilligungen
            </h3>
          </div>
          <p className="ml-5 mt-1 text-[0.75rem] font-medium text-slate-500">
            Erreichbarkeit der Erziehungsberechtigten und datenschutzrechtliche Fotoerlaubnis.
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
            {isEditing ? <Save size={14} /> : <Phone size={14} />}
            {isEditing ? 'Kontakte speichern' : 'Kontakte bearbeiten'}
          </button>
        </div>
      </div>

      {/* Success banner for logged phone call */}
      {showLogSuccess && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-[0.8125rem] font-semibold text-emerald-900 animate-in fade-in duration-200">
          <CheckCircle2 className="shrink-0 text-emerald-600" size={18} />
          <span>Das Telefonat wurde in den Elterngesprächen und der Dossier-Chronik vermerkt.</span>
        </div>
      )}

      {/* 1. SECTION: KONTAKTPERSONEN */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <h4 className="text-[0.8125rem] font-bold uppercase tracking-wider text-slate-600">
              Kontaktpersonen & Erziehungsberechtigte
            </h4>
          </div>
        </div>

        {!hasAnyContact && !isEditing ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <p className="text-sm font-medium text-slate-600">
              Keine Kontaktdaten der Erziehungsberechtigten hinterlegt.
            </p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
            >
              Kontaktdaten jetzt erfassen
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {/* Mutter */}
            {(student.telefon_mutter || isEditing) && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                      Mutter / Erziehungsberechtigte
                    </span>
                    <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                      <User size={13} />
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2.5">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        Telefonnummer
                      </label>
                      <input
                        type="tel"
                        value={editedStudent.telefon_mutter || ''}
                        onChange={e => setEditedStudent({ ...editedStudent, telefon_mutter: e.target.value })}
                        placeholder="+43 ..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-800">
                        {student.telefon_mutter || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                      </div>
                      {student.telefon_mutter && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(student.telefon_mutter || '', 'Telefon Mutter')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Nummer kopieren"
                          >
                            {copiedField === 'Telefon Mutter' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={`tel:${student.telefon_mutter}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-indigo-600 transition-colors"
                            title="Anrufen"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && student.telefon_mutter && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleLogPhoneCall('Mutter')}
                      className="text-[0.6875rem] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 transition-colors"
                    >
                      <PhoneCall size={12} /> Anruf als Notiz festhalten
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Vater */}
            {(student.telefon_vater || isEditing) && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                      Vater / Erziehungsberechtigter
                    </span>
                    <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                      <User size={13} />
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2.5">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        Telefonnummer
                      </label>
                      <input
                        type="tel"
                        value={editedStudent.telefon_vater || ''}
                        onChange={e => setEditedStudent({ ...editedStudent, telefon_vater: e.target.value })}
                        placeholder="+43 ..."
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-800">
                        {student.telefon_vater || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                      </div>
                      {student.telefon_vater && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopy(student.telefon_vater || '', 'Telefon Vater')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Nummer kopieren"
                          >
                            {copiedField === 'Telefon Vater' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={`tel:${student.telefon_vater}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-indigo-600 transition-colors"
                            title="Anrufen"
                          >
                            <Phone size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && student.telefon_vater && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleLogPhoneCall('Vater')}
                      className="text-[0.6875rem] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 transition-colors"
                    >
                      <PhoneCall size={12} /> Anruf als Notiz festhalten
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* E-Mail */}
            {(student.email_eltern || isEditing) && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-3xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                      E-Mail Eltern
                    </span>
                    <span className="p-1 rounded-md bg-slate-100 text-slate-600">
                      <Mail size={13} />
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="mt-2.5">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase tracking-widest block mb-1">
                        E-Mail-Adresse
                      </label>
                      <input
                        type="email"
                        value={editedStudent.email_eltern || ''}
                        onChange={e => setEditedStudent({ ...editedStudent, email_eltern: e.target.value })}
                        placeholder="eltern@beispiel.at"
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-slate-800 break-all">
                        {student.email_eltern || <span className="text-slate-400 font-normal">Nicht erfasst</span>}
                      </div>
                      {student.email_eltern && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopy(student.email_eltern || '', 'E-Mail')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="E-Mail kopieren"
                          >
                            {copiedField === 'E-Mail' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a
                            href={`mailto:${student.email_eltern}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-indigo-600 transition-colors"
                            title="E-Mail senden"
                          >
                            <Mail size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. SECTION: EINWILLIGUNGEN & FOTOERLAUBNIS */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-slate-500" />
          <h4 className="text-[0.8125rem] font-bold uppercase tracking-wider text-slate-600">
            Datenschutz & Einwilligungen
          </h4>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-3xs">
          <div className="flex items-start gap-3.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              student.fotoFreigabe === 'erlaubt'
                ? 'bg-emerald-50 text-emerald-700'
                : student.fotoFreigabe === 'nur_homepage'
                ? 'bg-amber-50 text-amber-700'
                : student.fotoFreigabe === 'nicht_erlaubt'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              <Camera size={20} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-400">
                Foto- und Veröffentlichungsfreigabe
              </div>

              {isEditing ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        value: 'erlaubt' as FotoFreigabeStatus,
                        label: 'Fotografieren erlaubt',
                        description: 'Schulische Nutzung & Druckwerke'
                      },
                      {
                        value: 'nur_homepage' as FotoFreigabeStatus,
                        label: 'Nur Schulhomepage',
                        description: 'Ausschließlich Schul-Website'
                      },
                      {
                        value: 'nicht_erlaubt' as FotoFreigabeStatus,
                        label: 'Nicht fotografieren',
                        description: 'Keine Aufnahmen / Veröffentlichungen'
                      }
                    ].map(option => {
                      const isSelected = editedStudent.fotoFreigabe === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setEditedStudent({ ...editedStudent, fotoFreigabe: option.value })}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold shadow-3xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold">{option.label}</div>
                          <div className="text-[0.6875rem] text-slate-500 font-medium mt-0.5">{option.description}</div>
                        </button>
                      );
                    })}
                  </div>
                  {editedStudent.fotoFreigabe && (
                    <button
                      type="button"
                      onClick={() => setEditedStudent({ ...editedStudent, fotoFreigabe: undefined })}
                      className="text-[0.6875rem] font-medium text-slate-400 hover:text-slate-600 pt-1"
                    >
                      Status zurücksetzen (keine Angabe)
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-1.5">
                  <div className="text-sm font-bold text-slate-900">
                    {student.fotoFreigabe === 'erlaubt' && (
                      <span className="inline-flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Fotografieren erlaubt
                      </span>
                    )}
                    {student.fotoFreigabe === 'nur_homepage' && (
                      <span className="inline-flex items-center gap-1.5 text-amber-800">
                        <AlertCircle size={15} className="text-amber-600" /> Nur für die Schulhomepage erlaubt
                      </span>
                    )}
                    {student.fotoFreigabe === 'nicht_erlaubt' && (
                      <span className="inline-flex items-center gap-1.5 text-slate-800 font-bold">
                        <Shield size={15} className="text-slate-600" /> Nicht fotografieren (keine Fotoerlaubnis)
                      </span>
                    )}
                    {!student.fotoFreigabe && (
                      <span className="text-slate-400 font-normal">
                        Keine schriftliche Foto-Freigabe erfasst
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[0.72rem] text-slate-500">
                    {student.fotoFreigabe === 'nicht_erlaubt'
                      ? 'Hinweis: Das Kind darf bei Klassenaktivitäten und Schulfesten nicht abgebildet oder auf Bildern veröffentlicht werden.'
                      : student.fotoFreigabe === 'nur_homepage'
                      ? 'Fotos dürfen ausschließlich auf der offiziellen Homepage der Schule veröffentlicht werden.'
                      : student.fotoFreigabe === 'erlaubt'
                      ? 'Fotos dürfen für schulbezogene Zwecke, Dokumentationen und Schulpublikationen genutzt werden.'
                      : 'Bitte die schriftliche Einverständniserklärung der Erziehungsberechtigten einholen.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-[0.6875rem] text-slate-400">
        <span>Vertrauliche Kontaktdaten gemäß Schulunterrichtsgesetz & DSGVO</span>
        {student.stammdatenAktualisiertAm && (
          <span>Stand: {new Date(student.stammdatenAktualisiertAm).toLocaleDateString('de-AT')}</span>
        )}
      </div>
    </div>
  );
}
