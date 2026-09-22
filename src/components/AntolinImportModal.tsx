import React from 'react';
import { AlertCircle, BookOpenCheck, Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { formatLocalDateKey, getCurrentSchuljahr } from '../lib/utils';
import type { AntolinRecord } from '../types';

interface AntolinImportModalProps {
  open: boolean;
  onClose: () => void;
}

type ParsedAntolinRecord = {
  studentId: string;
  studentNameConfirmed?: string;
  anzahlBuecher: number;
  punkte: number;
  leistung: number;
  schwierigkeit: number;
};

const MAX_FILE_BYTES = 20 * 1024 * 1024;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

function clampNumber(value: unknown, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export default function AntolinImportModal({ open, onClose }: AntolinImportModalProps) {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const AI_STUDENT_REPORTS_DISABLED = true;
  const [rawText, setRawText] = React.useState('');
  const [privacyConfirmed, setPrivacyConfirmed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<ParsedAntolinRecord[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setFile(null);
    setRawText('');
    setPrivacyConfirmed(false);
    setLoading(false);
    setError(null);
    setPreview([]);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const activeStudents = app.schueler || [];
  const activeStudentIds = new Set(activeStudents.map(student => student.id));

  const analyze = async () => {
    // Do not upload identifiable student reports while local parsing is being implemented.
    if (AI_STUDENT_REPORTS_DISABLED) {
      setError('Die KI-Auswertung von Antolin-Berichten ist vorübergehend aus Datenschutzgründen gesperrt. Bitte keine Schülerlisten hochladen.');
      return;
    }
    if (!file && !rawText.trim()) {
      setError('Bitte wähle eine Antolin-Datei aus oder füge den Tabelleninhalt ein.');
      return;
    }
    if (!privacyConfirmed) {
      setError('Bitte bestätige zuerst die KI-Analyse des Antolin-Berichts.');
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      setError('Die Datei ist zu groß. Maximal 20 MB sind möglich.');
      return;
    }

    setLoading(true);
    setError(null);
    setPreview([]);

    try {
      let pdfBase64: string | undefined;
      let textPayload = rawText.trim();

      if (file) {
        const lower = file.name.toLowerCase();
        if (file.type === 'application/pdf' || lower.endsWith('.pdf')) {
          pdfBase64 = await fileToDataUrl(file);
        } else {
          const fileText = await fileToText(file);
          textPayload = [fileText, textPayload].filter(Boolean).join('\n\n');
        }
      }

      const response = await fetch('/api/ai/analyze-antolin', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(pdfBase64 ? { pdfBase64 } : {}),
          ...(textPayload ? { rawText: textPayload } : {}),
          students: activeStudents.map(student => ({
            id: student.id,
            vorname: student.vorname,
            nachname: student.nachname,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Der Antolin-Bericht konnte nicht analysiert werden.');
      }

      const records = Array.isArray(data?.records) ? data.records : [];
      const normalized: ParsedAntolinRecord[] = records
        .filter((record: any) => typeof record?.studentId === 'string' && activeStudentIds.has(record.studentId))
        .map((record: any) => ({
          studentId: record.studentId,
          studentNameConfirmed: typeof record.studentNameConfirmed === 'string' ? record.studentNameConfirmed.trim() : '',
          anzahlBuecher: Math.round(clampNumber(record.anzahlBuecher, 0, 100000)),
          punkte: Math.round(clampNumber(record.punkte, -10000000, 10000000)),
          leistung: clampNumber(record.leistung, 0, 100),
          schwierigkeit: clampNumber(record.schwierigkeit, 0, 100),
        }));

      if (!normalized.length) {
        throw new Error('Es konnten keine Kinder aus der aktuellen Klasse sicher zugeordnet werden.');
      }

      setPreview(normalized);
    } catch (err: any) {
      setError(err?.message || 'Der Antolin-Import ist fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!preview.length) return;

    const date = formatLocalDateKey(new Date());
    const schoolYear = app.schuljahr || getCurrentSchuljahr();
    const now = Date.now();

    const imported: AntolinRecord[] = preview.map((record, index) => ({
      id: `antolin-${date}-${record.studentId}-${now}-${index}`,
      schuelerId: record.studentId,
      datum: date,
      schuljahr: schoolYear,
      classId: app.activeClassId,
      quelle: 'import',
      anzahlBuecher: record.anzahlBuecher,
      punkte: record.punkte,
      leistung: record.leistung,
      schwierigkeit: record.schwierigkeit,
    }));

    setApp(prev => ({
      ...prev,
      antolinRecords: [...(prev.antolinRecords || []), ...imported],
    }));

    showToast(`Antolin-Daten für ${imported.length} Kinder übernommen.`, 'success');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Antolin-Import schließen"
        onClick={() => !loading && onClose()}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-default"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="antolin-import-title"
        className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-100 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <BookOpenCheck size={21} />
            </div>
            <div>
              <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-amber-600">Deutsch · Antolin</p>
              <h2 id="antolin-import-title" className="mt-1 text-xl font-black text-slate-950">
                Antolin-Liste importieren
              </h2>
              <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                PDF hochladen oder Antolin-Tabelle als CSV/TXT bzw. per Copy & Paste einfügen.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            aria-label="Schließen"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-950">Datenschutz: Die KI-Auswertung von Antolin-Berichten ist bis zur Einführung einer geprüften lokalen Analyse gesperrt. Es werden hier keine Dateien hochgeladen.</p>
          {!preview.length ? (
            <>
              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center transition-colors hover:border-amber-400 hover:bg-amber-50">
                <input
                  type="file"
                  accept=".pdf,.csv,.txt,.tsv,application/pdf,text/csv,text/plain"
                  className="sr-only"
                  onChange={event => {
                    const selected = event.target.files?.[0] || null;
                    setFile(selected);
                    setError(null);
                  }}
                />
                <Upload size={24} className="mx-auto mb-3 text-amber-600" />
                <div className="text-sm font-black text-slate-900">
                  {file ? file.name : 'Antolin-Datei auswählen'}
                </div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  PDF, CSV, TXT oder TSV · maximal 20 MB
                </div>
              </label>

              <div className="flex items-center gap-3 text-[0.65rem] font-black uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-stone-200" />
                oder Tabelle einfügen
                <span className="h-px flex-1 bg-stone-200" />
              </div>

              <textarea
                value={rawText}
                onChange={event => {
                  setRawText(event.target.value);
                  setError(null);
                }}
                placeholder="Antolin-Tabelle hier einfügen …"
                className="min-h-32 w-full rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              />

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={privacyConfirmed}
                  onChange={event => {
                    setPrivacyConfirmed(event.target.checked);
                    setError(null);
                  }}
                  className="mt-0.5 h-4 w-4 accent-amber-600"
                />
                <span className="text-xs font-semibold leading-relaxed text-slate-600">
                  Ich bestätige, dass der Antolin-Bericht zur automatischen Auswertung an den in Klassio konfigurierten KI-Dienst übertragen werden darf. Die Daten werden nur für diese Analyse verwendet.
                </span>
              </label>

              {error && (
                <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <Check size={18} className="text-emerald-700" />
                <div>
                  <div className="text-sm font-black text-emerald-950">{preview.length} Kinder erkannt</div>
                  <div className="text-xs font-medium text-emerald-800">Bitte kurz prüfen und anschließend übernehmen.</div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stone-200">
                <div className="grid grid-cols-[minmax(150px,1.5fr)_repeat(4,minmax(70px,1fr))] gap-px bg-stone-200 text-[0.62rem] font-black uppercase tracking-wider text-slate-500">
                  <div className="bg-stone-50 p-3">Kind</div>
                  <div className="bg-stone-50 p-3 text-right">Bücher</div>
                  <div className="bg-stone-50 p-3 text-right">Punkte</div>
                  <div className="bg-stone-50 p-3 text-right">Erfolg</div>
                  <div className="bg-stone-50 p-3 text-right">Stufe</div>
                </div>
                {preview.map(record => {
                  const student = activeStudents.find(item => item.id === record.studentId);
                  return (
                    <div
                      key={record.studentId}
                      className="grid grid-cols-[minmax(150px,1.5fr)_repeat(4,minmax(70px,1fr))] gap-px border-t border-stone-100 text-xs"
                    >
                      <div className="p-3 font-bold text-slate-900">{student ? `${student.vorname} ${student.nachname}` : record.studentNameConfirmed}</div>
                      <div className="p-3 text-right font-semibold text-slate-700">{record.anzahlBuecher}</div>
                      <div className="p-3 text-right font-semibold text-slate-700">{record.punkte}</div>
                      <div className="p-3 text-right font-semibold text-slate-700">{record.leistung.toFixed(1)} %</div>
                      <div className="p-3 text-right font-semibold text-slate-700">{record.schwierigkeit.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 bg-stone-50 p-4 sm:px-6">
          {preview.length ? (
            <>
              <button
                type="button"
                onClick={() => setPreview([])}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-stone-100"
              >
                Zurück
              </button>
              <button
                type="button"
                onClick={save}
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
              >
                Daten übernehmen
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-[0.65rem] font-semibold text-slate-400">
                <FileText size={13} />
                Die Zuordnung wird vor dem Speichern angezeigt.
              </div>
              <button
                type="button"
                disabled={loading || AI_STUDENT_REPORTS_DISABLED}
                onClick={analyze}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {loading ? 'Analysiere …' : 'Antolin-Liste analysieren'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
