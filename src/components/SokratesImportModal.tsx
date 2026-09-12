import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles, 
  Trash2, 
  Plus, 
  ArrowLeftRight, 
  Search, 
  School, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Eye, 
  Edit3,
  HelpCircle
} from 'lucide-react';
import { ParsedSokratesResult, ParsedSokratesStudent, convertToAppStudents, formatDateDE, normalizeDate, sanitizeStudentContact } from '../lib/sokratesParser';
import { Student } from '../types';

interface SokratesImportModalProps {
  importResult: ParsedSokratesResult;
  isOpen: boolean;
  onClose: () => void;
  onApply: (students: Student[], meta?: { klasse?: string; schuljahr?: string; lehrerName?: string; schulName?: string; schulkennzahl?: string }) => void;
}

export const SokratesImportModal: React.FC<SokratesImportModalProps> = ({
  importResult,
  isOpen,
  onClose,
  onApply
}) => {
  const [students, setStudents] = useState<ParsedSokratesStudent[]>(() => 
    importResult.students.map(s => sanitizeStudentContact(s, importResult.schulOrt || 'Feldkirch'))
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Metadata states
  const [klasse, setKlasse] = useState(importResult.klasse || '');
  const [schuljahr, setSchuljahr] = useState(importResult.schuljahr || '');
  const [lehrerName, setLehrerName] = useState(importResult.lehrerName || '');
  const [schulName, setSchulName] = useState(importResult.schulName || '');
  const [schulkennzahl, setSchulkennzahl] = useState(importResult.schulkennzahl || '');

  // Options to apply metadata
  const [applyKlasse, setApplyKlasse] = useState(!!importResult.klasse);
  const [applySchuljahr, setApplySchuljahr] = useState(!!importResult.schuljahr);

  useEffect(() => {
    setStudents(importResult.students.map(s => sanitizeStudentContact(s, importResult.schulOrt || 'Feldkirch')));
    setKlasse(importResult.klasse || '');
    setSchuljahr(importResult.schuljahr || '');
    setLehrerName(importResult.lehrerName || '');
    setSchulName(importResult.schulName || '');
    setSchulkennzahl(importResult.schulkennzahl || '');
    setApplyKlasse(!!importResult.klasse);
    setApplySchuljahr(!!importResult.schuljahr);
  }, [importResult]);

  if (!isOpen) return null;

  const updateStudent = (id: string | undefined, field: keyof ParsedSokratesStudent, value: any) => {
    setStudents(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value };
      }
      return s;
    }));
  };

  const removeStudent = (id: string | undefined) => {
    setStudents(prev => prev.filter(s => s.id !== id));
    if (selectedStudentId === id) {
      setSelectedStudentId(null);
    }
  };

  const addNewStudent = () => {
    const newStudent: ParsedSokratesStudent = {
      id: crypto.randomUUID(),
      lfdNr: students.length + 1,
      vorname: '',
      nachname: '',
      geschlecht: 'w',
      geburtstag: '',
      besuchsjahr: klasse ? (klasse.charAt(0) || '1') : '1',
      sv_nummer: '',
      religion: 'r.k.',
      staatsbuergerschaft: 'Österreich',
      anschrift: '',
      plz: '',
      ort: '',
      telefon_mutter: '',
      telefon_vater: '',
      email_eltern: '',
      erstsprache: '',
      notiz: ''
    };
    setStudents(prev => [...prev, newStudent]);
    setSelectedStudentId(newStudent.id!);
  };

  const swapAllFirstAndLastNames = () => {
    if (confirm('Möchtest du bei allen Schüler:innen Vorname und Nachname vertauschen?')) {
      setStudents(prev => prev.map(s => ({
        ...s,
        vorname: s.nachname,
        nachname: s.vorname
      })));
    }
  };

  const handleConfirm = () => {
    // Validate that at least some students exist
    const validStudents = students.filter(s => s.vorname.trim() || s.nachname.trim());
    if (validStudents.length === 0) {
      alert('Bitte füge mindestens eine Schülerin oder einen Schüler hinzu.');
      return;
    }

    const appStudents = convertToAppStudents(validStudents);
    onApply(appStudents, {
      klasse: applyKlasse ? klasse : undefined,
      schuljahr: applySchuljahr ? schuljahr : undefined,
      lehrerName: lehrerName || undefined,
      schulName: schulName || undefined,
      schulkennzahl: schulkennzahl || undefined
    });
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.vorname.toLowerCase().includes(term) ||
      s.nachname.toLowerCase().includes(term) ||
      (s.sv_nummer && s.sv_nummer.includes(term)) ||
      (s.ort && s.ort.toLowerCase().includes(term)) ||
      (s.besuchsjahr && s.besuchsjahr.toLowerCase().includes(term)) ||
      (s.religion && s.religion.toLowerCase().includes(term))
    );
  });

  const missingNamesCount = students.filter(s => !s.vorname.trim() || !s.nachname.trim()).length;
  const missingBirthdayCount = students.filter(s => !s.geburtstag.trim()).length;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-7xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Sokrates-Import Vorschau</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold tracking-wide uppercase bg-emerald-400/30 text-emerald-100 border border-emerald-300/30 flex items-center gap-1">
                  {importResult.sourceMethod === 'ai' ? (
                    <>
                      <Sparkles className="w-3 h-3 text-emerald-200" />
                      KI-Präzisionserkennung
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3 h-3 text-emerald-200" />
                      Lokale Erkennung
                    </>
                  )}
                </span>
              </div>
              <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 opacity-90">
                {students.length} Schüler:innen erkannt. Überprüfe und bearbeite die Daten vor der finalen Übernahme.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              className="px-6 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 active:scale-95 font-black text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              Klasse übernehmen ({students.length})
            </button>
          </div>
        </div>

        {/* Metadata Banner (Klasse, Schuljahr, Lehrkraft etc.) */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3.5 flex flex-wrap items-center gap-4 text-xs shrink-0">
          <span className="font-bold text-slate-500 uppercase tracking-wider text-[0.6875rem] flex items-center gap-1.5">
            <School className="w-3.5 h-3.5 text-slate-400" />
            Erkannte Klassendaten:
          </span>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={applyKlasse}
                onChange={e => setApplyKlasse(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <span>Klasse:</span>
            </label>
            <input
              type="text"
              value={klasse}
              onChange={e => setKlasse(e.target.value)}
              placeholder="z.B. 1A"
              className="w-16 px-1.5 py-0.5 font-bold text-slate-900 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
              <input
                type="checkbox"
                checked={applySchuljahr}
                onChange={e => setApplySchuljahr(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
              />
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>Schuljahr:</span>
            </label>
            <input
              type="text"
              value={schuljahr}
              onChange={e => setSchuljahr(e.target.value)}
              placeholder="2026/27"
              className="w-20 px-1.5 py-0.5 font-bold text-slate-900 border border-slate-200 rounded-lg text-xs bg-slate-50/50 focus:bg-white"
            />
          </div>

          {schulName && (
            <div className="hidden sm:flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-400">Schule:</span>
              <span className="font-bold text-slate-800">{schulName}</span>
            </div>
          )}

          {lehrerName && (
            <div className="hidden md:flex items-center gap-1.5 text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
              <User className="w-3 h-3 text-slate-400" />
              <span className="font-semibold text-slate-400">Lehrperson:</span>
              <span className="font-bold text-slate-800">{lehrerName}</span>
            </div>
          )}

          {/* Besuchsjahr Info Pill */}
          <div className="ml-auto flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-[0.6875rem] font-bold">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sokrates <strong>BJ</strong> wird als <strong>Besuchsjahr</strong> zugeordnet</span>
          </div>
        </div>

        {/* Action bar & Tools */}
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="In Vorschau filtern (Name, Ort, Religion, BJ)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-medium transition-all"
              />
            </div>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                Zurücksetzen
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={swapAllFirstAndLastNames}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1.5"
              title="Vertauscht bei allen Zeilen Vorname und Nachname"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
              <span>Vor- / Nachname tauschen</span>
            </button>

            <button
              onClick={addNewStudent}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schüler:in hinzufügen</span>
            </button>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tabelle
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Karten
              </button>
            </div>
          </div>
        </div>

        {/* Warnings Banner if any missing fields */}
        {(missingNamesCount > 0 || missingBirthdayCount > 0) && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 py-2 flex items-center gap-2 text-xs text-amber-800 font-medium shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Hinweis: {missingNamesCount > 0 && `${missingNamesCount} Kind(er) ohne vollständigen Namen. `}
              {missingBirthdayCount > 0 && `${missingBirthdayCount} Kind(er) ohne Geburtsdatum. `}
              Du kannst alle Felder direkt in der Liste anklicken und editieren.
            </span>
          </div>
        )}

        {/* Content Area: Table / Cards */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-600">Keine Schüler:innen gefunden</p>
              <p className="text-xs text-slate-400 mt-1">Überprüfe deinen Suchbegriff oder füge neue Zeilen hinzu.</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View with responsive scrolling and sticky header */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[0.6875rem]">
                      <th className="py-3 px-3 w-10 text-center">#</th>
                      <th className="py-3 px-3 w-36">Nachname</th>
                      <th className="py-3 px-3 w-36">Vorname</th>
                      <th className="py-3 px-2 w-16 text-center">Geschl.</th>
                      <th className="py-3 px-3 w-28">Geburtsdatum</th>
                      <th className="py-3 px-2 w-24 text-center bg-emerald-50 text-emerald-800 border-x border-emerald-100" title="Besuchsjahr aus Sokrates (BJ)">
                        BJ (Besuchsjahr)
                      </th>
                      <th className="py-3 px-3 w-28">SVNR</th>
                      <th className="py-3 px-3 w-24">Religion</th>
                      <th className="py-3 px-3 w-32">Staat</th>
                      <th className="py-3 px-3 w-48">Wohnadresse</th>
                      <th className="py-3 px-3 w-20">PLZ</th>
                      <th className="py-3 px-3 w-32">Ort</th>
                      <th className="py-3 px-3 w-36">Tel. Mutter</th>
                      <th className="py-3 px-3 w-36">Tel. Vater</th>
                      <th className="py-3 px-2 w-12 text-center">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredStudents.map((s, idx) => (
                      <tr 
                        key={s.id || idx}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Index */}
                        <td className="py-2 px-3 text-center text-slate-400 font-bold text-[0.6875rem]">
                          {s.lfdNr || idx + 1}
                        </td>

                        {/* Nachname */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.nachname}
                            onChange={e => updateStudent(s.id, 'nachname', e.target.value)}
                            placeholder="Nachname"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg font-bold text-slate-900 transition-all outline-none"
                          />
                        </td>

                        {/* Vorname */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.vorname}
                            onChange={e => updateStudent(s.id, 'vorname', e.target.value)}
                            placeholder="Vorname"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg font-semibold text-slate-800 transition-all outline-none"
                          />
                        </td>

                        {/* Geschlecht */}
                        <td className="py-2 px-1 text-center">
                          <select
                            value={s.geschlecht || 'w'}
                            onChange={e => updateStudent(s.id, 'geschlecht', e.target.value)}
                            className="px-1.5 py-1 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="w">w</option>
                            <option value="m">m</option>
                            <option value="d">d</option>
                          </select>
                        </td>

                        {/* Geburtsdatum */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={formatDateDE(s.geburtstag)}
                            onChange={e => updateStudent(s.id, 'geburtstag', normalizeDate(e.target.value))}
                            placeholder="TT.MM.JJJJ"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 transition-all outline-none font-mono text-[0.75rem]"
                          />
                        </td>

                        {/* Besuchsjahr (BJ) */}
                        <td className="py-2 px-2 bg-emerald-50/50 border-x border-emerald-100 text-center">
                          <input
                            type="text"
                            value={s.besuchsjahr}
                            onChange={e => updateStudent(s.id, 'besuchsjahr', e.target.value)}
                            placeholder="1"
                            title="Besuchsjahr (Sokrates BJ)"
                            className="w-12 text-center px-1.5 py-1 bg-white border border-emerald-300 rounded-lg font-black text-emerald-800 shadow-2xs outline-none focus:ring-2 focus:ring-emerald-500/30"
                          />
                        </td>

                        {/* SVNR */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.sv_nummer || ''}
                            onChange={e => updateStudent(s.id, 'sv_nummer', e.target.value)}
                            placeholder="1234..."
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 font-mono text-[0.75rem] outline-none"
                          />
                        </td>

                        {/* Religion */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.religion || ''}
                            onChange={e => updateStudent(s.id, 'religion', e.target.value)}
                            placeholder="r.k."
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none"
                          />
                        </td>

                        {/* Staat */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.staatsbuergerschaft || ''}
                            onChange={e => updateStudent(s.id, 'staatsbuergerschaft', e.target.value)}
                            placeholder="Österreich"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none"
                          />
                        </td>

                        {/* Wohnadresse */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.anschrift || ''}
                            onChange={e => updateStudent(s.id, 'anschrift', e.target.value)}
                            placeholder="Straße 1/2"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none"
                          />
                        </td>

                        {/* PLZ */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.plz || ''}
                            onChange={e => updateStudent(s.id, 'plz', e.target.value)}
                            placeholder="6900"
                            className="w-16 px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 font-mono text-[0.75rem] outline-none"
                          />
                        </td>

                        {/* Ort */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.ort || ''}
                            onChange={e => updateStudent(s.id, 'ort', e.target.value)}
                            placeholder="Ort"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none"
                          />
                        </td>

                        {/* Tel Mutter */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.telefon_mutter || ''}
                            onChange={e => updateStudent(s.id, 'telefon_mutter', e.target.value)}
                            placeholder="Tel. Mutter"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none text-[0.75rem]"
                          />
                        </td>

                        {/* Tel Vater */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={s.telefon_vater || ''}
                            onChange={e => updateStudent(s.id, 'telefon_vater', e.target.value)}
                            placeholder="Tel. Vater"
                            className="w-full px-2 py-1 bg-white hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded-lg text-slate-700 outline-none text-[0.75rem]"
                          />
                        </td>

                        {/* Delete action */}
                        <td className="py-2 px-2 text-center">
                          <button
                            onClick={() => removeStudent(s.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-40 group-hover:opacity-100"
                            title="Schüler:in aus Import entfernen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View for detailed inspection */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((s, idx) => (
                <div
                  key={s.id || idx}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 font-black text-xs flex items-center justify-center">
                          {s.lfdNr || idx + 1}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={s.vorname}
                            onChange={e => updateStudent(s.id, 'vorname', e.target.value)}
                            placeholder="Vorname"
                            className="font-bold text-slate-900 text-sm px-1 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none w-28"
                          />
                          <input
                            type="text"
                            value={s.nachname}
                            onChange={e => updateStudent(s.id, 'nachname', e.target.value)}
                            placeholder="Nachname"
                            className="font-black text-slate-900 text-sm px-1 py-0.5 rounded border border-transparent hover:border-slate-200 focus:border-emerald-500 outline-none w-28"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeStudent(s.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                      <div>
                        <span className="text-[0.625rem] uppercase font-bold text-slate-400 block">Geburtstag</span>
                        <input
                          type="text"
                          value={formatDateDE(s.geburtstag)}
                          onChange={e => updateStudent(s.id, 'geburtstag', normalizeDate(e.target.value))}
                          placeholder="TT.MM.JJJJ"
                          className="w-full px-2 py-1 bg-slate-50 rounded-lg text-slate-800 font-mono text-xs border border-slate-200"
                        />
                      </div>

                      <div>
                        <span className="text-[0.625rem] uppercase font-bold text-emerald-600 block">Besuchsjahr (BJ)</span>
                        <input
                          type="text"
                          value={s.besuchsjahr}
                          onChange={e => updateStudent(s.id, 'besuchsjahr', e.target.value)}
                          placeholder="1"
                          className="w-full px-2 py-1 bg-emerald-50 rounded-lg text-emerald-800 font-bold text-xs border border-emerald-200"
                        />
                      </div>

                      <div>
                        <span className="text-[0.625rem] uppercase font-bold text-slate-400 block">SVNR</span>
                        <input
                          type="text"
                          value={s.sv_nummer || ''}
                          onChange={e => updateStudent(s.id, 'sv_nummer', e.target.value)}
                          placeholder="–"
                          className="w-full px-2 py-1 bg-slate-50 rounded-lg text-slate-800 font-mono text-xs border border-slate-200"
                        />
                      </div>

                      <div>
                        <span className="text-[0.625rem] uppercase font-bold text-slate-400 block">Religion</span>
                        <input
                          type="text"
                          value={s.religion || ''}
                          onChange={e => updateStudent(s.id, 'religion', e.target.value)}
                          placeholder="r.k."
                          className="w-full px-2 py-1 bg-slate-50 rounded-lg text-slate-800 text-xs border border-slate-200"
                        />
                      </div>
                    </div>

                    {/* Address & Contacts */}
                    <div className="mt-3 pt-2 border-t border-slate-100 space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={s.anschrift || ''}
                            onChange={e => updateStudent(s.id, 'anschrift', e.target.value)}
                            placeholder="Wohnadresse (Straße, Nr)"
                            className="w-full px-1.5 py-1 bg-slate-50 rounded text-xs border border-slate-200 outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1 pl-5">
                          <input
                            type="text"
                            value={s.plz || ''}
                            onChange={e => updateStudent(s.id, 'plz', e.target.value)}
                            placeholder="PLZ (6800)"
                            className="col-span-1 px-1.5 py-1 bg-slate-50 rounded text-xs font-mono border border-slate-200 outline-none"
                          />
                          <input
                            type="text"
                            value={s.ort || ''}
                            onChange={e => updateStudent(s.id, 'ort', e.target.value)}
                            placeholder="Ort (Feldkirch)"
                            className="col-span-2 px-1.5 py-1 bg-slate-50 rounded text-xs border border-slate-200 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <input
                            type="text"
                            value={s.telefon_mutter || ''}
                            onChange={e => updateStudent(s.id, 'telefon_mutter', e.target.value)}
                            placeholder="Tel. Mutter"
                            className="w-full px-1.5 py-1 bg-slate-50 rounded text-xs border border-slate-200 outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-700 pl-5">
                          <input
                            type="text"
                            value={s.telefon_vater || ''}
                            onChange={e => updateStudent(s.id, 'telefon_vater', e.target.value)}
                            placeholder="Tel. Vater"
                            className="w-full px-1.5 py-1 bg-slate-50 rounded text-xs border border-slate-200 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer info & Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Alle Änderungen werden erst beim Klick auf <strong>"Klasse übernehmen"</strong> dauerhaft in deine Klasse gespeichert.</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all w-full sm:w-auto"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              className="px-8 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Klasse übernehmen ({students.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
