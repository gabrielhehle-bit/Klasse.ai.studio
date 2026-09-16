import React, { useMemo, useState } from 'react';
import {
  Archive as ArchiveIcon,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Users,
  BookOpen,
  FileText,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { DEFAULT_HISTORICAL_STUDENTS } from '../data/historicalStudents';
import {
  createArchivedClassSnapshot,
  getArchivedFinalGrade,
  upsertArchivedClass,
  type ArchivedClassSnapshot,
} from '../lib/archiveData';

export const HISTORICAL_STUDENTS = DEFAULT_HISTORICAL_STUDENTS;

const studentName = (student: any) =>
  [student?.vorname, student?.nachname].filter(Boolean).join(' ').trim() || student?.name || 'Unbenanntes Kind';

const formatArchiveDate = (value?: string) => {
  if (!value) return 'Datum nicht überliefert';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Datum nicht überliefert' : date.toLocaleString('de-AT');
};

export default function Archive() {
  const { app, setApp } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('Alle');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const archivedClasses = app.archivedClasses || [];
  const historicalStudents = app.historicalStudents || [];

  const existingCurrentSnapshot = useMemo(
    () => archivedClasses.find(
      (item) => item.sourceClassId === app.activeClassId && item.schuljahr === app.schuljahr
    ),
    [archivedClasses, app.activeClassId, app.schuljahr]
  );

  const years = useMemo(
    () => ['Alle', ...Array.from(new Set(archivedClasses.map((item) => item.schuljahr))).sort((a, b) => b.localeCompare(a))],
    [archivedClasses]
  );

  const filteredArchives = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    return archivedClasses
      .filter((item) => selectedYear === 'Alle' || item.schuljahr === selectedYear)
      .filter((item) => {
        if (!needle) return true;
        if (item.name.toLowerCase().includes(needle)) return true;
        return (item.schueler || []).some((student) => studentName(student).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const byYear = b.schuljahr.localeCompare(a.schuljahr);
        return byYear !== 0 ? byYear : a.name.localeCompare(b.name, 'de');
      });
  }, [archivedClasses, searchTerm, selectedYear]);

  const selectedArchive = selectedArchiveId
    ? archivedClasses.find((item) => item.id === selectedArchiveId) || null
    : null;

  const handleArchiveCurrentClass = () => {
    if (!app.activeClassId) {
      alert('Bitte zuerst eine aktive Klasse auswählen.');
      return;
    }
    if (!app.schueler?.length) {
      alert('Die aktive Klasse enthält keine Schüler:innen und wird daher nicht archiviert.');
      return;
    }

    const action = existingCurrentSnapshot ? 'aktualisieren' : 'erstellen';
    const message = existingCurrentSnapshot
      ? `Archivstand für „${app.klassenbezeichnung || 'Aktuelle Klasse'}“ (${app.schuljahr}) aktualisieren? Der bisherige Archivstand dieses Schuljahres wird ersetzt. Die aktive Klasse bleibt unverändert.`
      : `Schreibgeschützten Archivstand für „${app.klassenbezeichnung || 'Aktuelle Klasse'}“ (${app.schuljahr}) erstellen? Die aktive Klasse bleibt unverändert.`;

    if (!confirm(message)) return;

    try {
      setApp((prev) => {
        const snapshot = createArchivedClassSnapshot(prev);
        return {
          ...prev,
          archivedClasses: upsertArchivedClass(prev.archivedClasses, snapshot),
        };
      });
      alert(`Archivstand erfolgreich ${action === 'aktualisieren' ? 'aktualisiert' : 'erstellt'}.`);
    } catch (error: any) {
      alert(error?.message || 'Der Archivstand konnte nicht erstellt werden.');
    }
  };

  const handleDeleteArchive = (snapshot: ArchivedClassSnapshot) => {
    if (!confirm(
      `Archivstand „${snapshot.name}“ (${snapshot.schuljahr}) wirklich unwiderruflich aus dem aktuellen Datenbestand löschen? Vorhandene ältere Datensicherungen können weiterhin frühere Stände enthalten.`
    )) return;

    setApp((prev) => ({
      ...prev,
      archivedClasses: (prev.archivedClasses || []).filter((item) => item.id !== snapshot.id),
    }));
    if (selectedArchiveId === snapshot.id) setSelectedArchiveId(null);
  };

  const handleDeleteLegacyStudent = (id: string, name: string) => {
    if (!confirm(
      `Legacy-Archiveintrag von „${name}“ wirklich löschen? Vorhandene ältere Datensicherungen können weiterhin frühere Stände enthalten.`
    )) return;

    setApp((prev) => ({
      ...prev,
      historicalStudents: (prev.historicalStudents || []).filter((item) => item.id !== id),
    }));
  };

  const detailCounts = selectedArchive ? {
    students: selectedArchive.schueler?.length || 0,
    reports: Object.keys(selectedArchive.jahresberichte || {}).length,
    diagnostics:
      (selectedArchive.diagnostikErhebungen?.length || 0) +
      (selectedArchive.diagnosticResults?.length || 0),
    observations:
      (selectedArchive.notes?.length || 0) +
      (selectedArchive.journal?.length || 0),
  } : null;

  return (
    <div className="archive-shell max-w-6xl mx-auto space-y-5 py-4 px-4">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 sm:p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center shrink-0">
            <ArchiveIcon size={23} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Archivierte Klassenstände</h2>
            <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
              Bewahren Sie abgeschlossene Schuljahre als schreibgeschützte, pädagogisch relevante Momentaufnahme auf.
              Die aktive Klasse wird beim Archivieren nicht verändert oder gelöscht.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleArchiveCurrentClass}
          disabled={!app.activeClassId || !app.schueler?.length}
          className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {existingCurrentSnapshot ? <RefreshCw size={15} /> : <ArchiveIcon size={15} />}
          {existingCurrentSnapshot ? 'Archivstand aktualisieren' : 'Aktuelle Klasse archivieren'}
        </button>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex items-start gap-3 text-emerald-950">
        <ShieldCheck size={17} className="mt-0.5 shrink-0 text-emerald-700" />
        <p className="text-xs font-semibold leading-relaxed">
          Archivstände liegen im verschlüsselten Klassio-Datenbestand. Archiviert werden schulisch relevante Daten wie
          Schüler:innen, Leistungen, Lernziele, Diagnostik, Beobachtungen, Anwesenheit, KEL und Jahresberichte.
          Operative Daten wie Portal-Zugangsdaten, Klassenkassa, Sitzplan und laufende Unterrichtsplanung werden bewusst nicht übernommen.
        </p>
      </div>

      <div className="sticky top-0 z-20 bg-[#f4f7f3]/95 backdrop-blur-md py-3 border-b border-stone-200 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            aria-label="Archiv nach Klasse oder Schüler:in durchsuchen"
            placeholder="Klasse oder Schüler:in suchen …"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full h-12 pl-11 pr-4 bg-white border border-stone-200 rounded-2xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>

        <div className="relative min-w-[170px]">
          <span className="absolute left-3.5 top-[5px] text-[9px] font-black uppercase tracking-wider text-slate-400">Schuljahr</span>
          <select
            aria-label="Archiv nach Schuljahr filtern"
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
            className="w-full h-12 pt-3 pl-3.5 pr-8 bg-white border border-stone-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30 appearance-none"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year === 'Alle' ? 'Alle Schuljahre' : year}</option>
            ))}
          </select>
          <Filter size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>
      </div>

      {filteredArchives.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center shadow-sm">
          <div className="w-14 h-14 mx-auto rounded-full bg-stone-50 flex items-center justify-center text-stone-300">
            <ArchiveIcon size={26} />
          </div>
          <h3 className="mt-4 text-base font-black text-slate-900">
            {archivedClasses.length === 0 ? 'Noch keine vollständigen Klassenstände archiviert' : 'Keine passenden Archivstände'}
          </h3>
          <p className="mt-2 text-xs font-semibold text-slate-500 max-w-lg mx-auto">
            {archivedClasses.length === 0
              ? 'Mit „Aktuelle Klasse archivieren“ können Sie einen schreibgeschützten Stand des aktuellen Schuljahres anlegen.'
              : 'Ändern Sie Suchbegriff oder Schuljahrfilter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredArchives.map((snapshot) => {
            const isCurrentVersion =
              snapshot.sourceClassId === app.activeClassId && snapshot.schuljahr === app.schuljahr;
            return (
              <div key={snapshot.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-black text-slate-900 truncate">{snapshot.name}</h3>
                      {isCurrentVersion && (
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase tracking-wider text-emerald-700">
                          aktuelle Klasse
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-500 mt-1">
                      Schuljahr {snapshot.schuljahr} · {snapshot.stufe}. Schulstufe
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 mt-1">
                      Archiviert: {formatArchiveDate(snapshot.archiviertAm)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-[10px] font-black text-amber-800 shrink-0">
                    Schreibgeschützt
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-xl font-black text-slate-900">{snapshot.schueler?.length || 0}</div>
                    <div className="text-[10px] font-bold text-slate-500">Schüler:innen</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-xl font-black text-slate-900">{Object.keys(snapshot.jahresberichte || {}).length}</div>
                    <div className="text-[10px] font-bold text-slate-500">Jahresberichte</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-xl font-black text-slate-900">
                      {(snapshot.diagnostikErhebungen?.length || 0) + (snapshot.diagnosticResults?.length || 0)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500">Diagnostik-Einträge</div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSelectedArchiveId(snapshot.id)}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black flex items-center gap-2"
                  >
                    <Eye size={14} />
                    Archiv ansehen
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteArchive(snapshot)}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100"
                    aria-label={`Archivstand ${snapshot.name} löschen`}
                    title="Archivstand löschen"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {historicalStudents.length > 0 && (
        <div className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLegacy((value) => !value)}
            className="w-full p-5 flex items-center justify-between gap-4 text-left"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-slate-900">Legacy-Archiv aus älteren Klassio-Versionen</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {historicalStudents.length} alte Zusammenfassungseinträge. Diese enthalten keine vollständige Klassenakte und werden nicht als neue Archivstände behandelt.
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-amber-700">{showLegacy ? 'Ausblenden' : 'Anzeigen'}</span>
          </button>

          {showLegacy && (
            <div className="border-t border-amber-100 overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-amber-50/60 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-black">Schüler:in</th>
                    <th className="text-left px-4 py-3 font-black">Klasse / Jahr</th>
                    <th className="text-center px-3 py-3 font-black">Deutsch</th>
                    <th className="text-center px-3 py-3 font-black">Mathematik</th>
                    <th className="text-center px-3 py-3 font-black">Sachunterricht</th>
                    <th className="text-right px-4 py-3 font-black">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {historicalStudents.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-3 font-bold text-slate-800">{entry.name}</td>
                      <td className="px-4 py-3 text-slate-600">{entry.class} · {entry.year}</td>
                      <td className="px-3 py-3 text-center">{entry.german ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{entry.math ?? '—'}</td>
                      <td className="px-3 py-3 text-center">{entry.sach ?? '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteLegacyStudent(entry.id, entry.name)}
                          className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          aria-label={`Legacy-Archiveintrag von ${entry.name} löschen`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="text-[11px] leading-relaxed text-slate-500 px-1">
        Archivdaten enthalten personenbezogene Informationen. Löschen entfernt den Eintrag aus dem aktuellen Klassio-Datenbestand;
        bereits erstellte ältere Datensicherungen können frühere Stände weiterhin enthalten.
      </div>

      {selectedArchive && detailCounts && (
        <div className="fixed inset-0 z-[100] bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="archive-detail-title" className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl border border-stone-200 flex flex-col">
            <div className="p-5 border-b border-stone-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <ArchiveIcon size={18} className="text-amber-700" />
                  <h3 id="archive-detail-title" className="text-lg font-black text-slate-900">{selectedArchive.name}</h3>
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  {selectedArchive.schuljahr} · {selectedArchive.stufe}. Schulstufe · archiviert {formatArchiveDate(selectedArchive.archiviertAm)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedArchiveId(null)}
                className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-600"
                aria-label="Archivdetail schließen"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <Users size={16} className="text-slate-500" />
                  <div className="text-xl font-black text-slate-900 mt-2">{detailCounts.students}</div>
                  <div className="text-[10px] font-bold text-slate-500">Schüler:innen</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <FileText size={16} className="text-slate-500" />
                  <div className="text-xl font-black text-slate-900 mt-2">{detailCounts.reports}</div>
                  <div className="text-[10px] font-bold text-slate-500">Jahresberichte</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <BookOpen size={16} className="text-slate-500" />
                  <div className="text-xl font-black text-slate-900 mt-2">{detailCounts.diagnostics}</div>
                  <div className="text-[10px] font-bold text-slate-500">Diagnostik</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <ShieldCheck size={16} className="text-slate-500" />
                  <div className="text-xl font-black text-slate-900 mt-2">{detailCounts.observations}</div>
                  <div className="text-[10px] font-bold text-slate-500">Notizen / Beobachtungen</div>
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-600">Schüler:innen und hinterlegte Endnoten</h4>
                  <p className="text-[10px] font-semibold text-slate-400 mt-1">
                    Es werden nur tatsächlich gespeicherte Endnoten angezeigt; Klassio berechnet im Archiv keine nachträglichen Noten oder Durchschnittswerte.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-xs">
                    <thead className="bg-white text-slate-400">
                      <tr>
                        <th className="text-left px-4 py-3 font-black">Schüler:in</th>
                        <th className="text-center px-3 py-3 font-black">Deutsch</th>
                        <th className="text-center px-3 py-3 font-black">Mathematik</th>
                        <th className="text-center px-3 py-3 font-black">Sachunterricht</th>
                        <th className="text-center px-3 py-3 font-black">Jahresbericht</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {(selectedArchive.schueler || []).map((student) => (
                        <tr key={student.id}>
                          <td className="px-4 py-3 font-bold text-slate-800">{studentName(student)}</td>
                          <td className="px-3 py-3 text-center font-semibold">{getArchivedFinalGrade(selectedArchive, student.id, 'Deutsch') || '—'}</td>
                          <td className="px-3 py-3 text-center font-semibold">{getArchivedFinalGrade(selectedArchive, student.id, 'Mathematik') || '—'}</td>
                          <td className="px-3 py-3 text-center font-semibold">{getArchivedFinalGrade(selectedArchive, student.id, 'Sachunterricht') || '—'}</td>
                          <td className="px-3 py-3 text-center">
                            {selectedArchive.jahresberichte?.[student.id]
                              ? <span className="text-emerald-700 font-black">vorhanden</span>
                              : <span className="text-slate-400">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-between items-center gap-3">
              <span className="text-[10px] font-semibold text-slate-500">
                Schreibgeschützter Archivstand · keine Bearbeitung innerhalb des Archivs
              </span>
              <button
                type="button"
                onClick={() => setSelectedArchiveId(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
