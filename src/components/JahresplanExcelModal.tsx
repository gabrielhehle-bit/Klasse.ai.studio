import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { JahresplanImportRow, JahresplanImportResult, parseJahresplanExcel, generateJahresplanTemplate } from '../lib/planerExcelService';
import { AppState } from '../types';

interface JahresplanExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (rows: JahresplanImportRow[], mode: 'merge' | 'overwrite') => void;
  app: AppState;
  availableSubjects: { id: string; label: string }[];
}

export default function JahresplanExcelModal({
  isOpen,
  onClose,
  onImport,
  app,
  availableSubjects
}: JahresplanExcelModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<JahresplanImportResult | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setParseResult(null);

    try {
      const res = await parseJahresplanExcel(selectedFile, availableSubjects);
      setParseResult(res);
    } catch (err: any) {
      setParseResult({
        success: false,
        error: `Fehler beim Einlesen: ${err?.message || 'Ungültige Excel-Datei'}`,
        rows: [],
        totalRows: 0,
        validRows: 0,
        detectedWeeks: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !parseResult.success) return;
    const actualRows = parseResult.rows.filter(r => !r.isExample);
    onImport(actualRows, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Excel-Import: Jahresplanung</h2>
              <p className="text-xs text-slate-500 font-medium">
                Jahresstoff und Kompetenzen aus Excel importieren ({app.schuljahr})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Download Template Bar */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <Download size={18} className="text-emerald-700 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="text-xs font-bold text-emerald-950 block sm:inline">Passende Jahresplan-Vorlage herunterladen:</span>
                <span className="text-xs text-emerald-800/80 sm:ml-1.5 font-medium">Enthält alle Kalenderwochen, Schulwochen und Fächer für {app.schuljahr}.</span>
              </div>
            </div>
            <button
              onClick={() => generateJahresplanTemplate(app)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
            >
              <Download size={14} />
              <span>Excel-Vorlage herunterladen</span>
            </button>
          </div>

          {/* Upload Area */}
          {!parseResult && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-emerald-600 mb-3">
                <Upload size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 mb-1">
                {file ? file.name : 'Jahresplan-Excel (.xlsx / .xls) hier ablegen oder auswählen'}
              </p>
              <p className="text-xs text-slate-400 font-medium">
                Vollständig browser-lokale Verarbeitung. Keine Daten werden übertragen.
              </p>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-10 text-center flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-600">Excel-Datei wird analysiert...</p>
            </div>
          )}

          {/* Error Message */}
          {parseResult && !parseResult.success && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
              <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-rose-900 mb-1">Datei konnte nicht verarbeitet werden</h4>
                <p className="text-xs text-rose-700 leading-relaxed">{parseResult.error}</p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setFile(null);
                      setParseResult(null);
                    }}
                    className="px-3 py-1.5 bg-white border border-rose-200 text-rose-800 text-xs font-bold rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                  >
                    Andere Datei wählen
                  </button>
                  <button
                    onClick={() => generateJahresplanTemplate(app)}
                    className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-all cursor-pointer"
                  >
                    Offizielle Vorlage herunterladen
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success & Preview Area */}
          {parseResult && parseResult.success && (
            <div className="space-y-4">
              {/* Stats & Settings bar */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      {parseResult.validRows} Themen-Einträge erkannt
                    </h4>
                    <p className="text-[11px] text-emerald-800 font-medium">
                      Über {parseResult.detectedWeeks.length} Kalenderwochen hinweg (KW {parseResult.detectedWeeks[0]} bis KW {parseResult.detectedWeeks[parseResult.detectedWeeks.length - 1]})
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Andere Datei wählen
                </button>
              </div>

              {/* Import Mode Selector */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Wie sollen die Daten importiert werden?
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 font-bold cursor-pointer bg-white p-3 border border-slate-200 rounded-xl">
                    <input
                      type="radio"
                      name="yearlyImportMode"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-emerald-600 mt-0.5"
                    />
                    <div>
                      <span className="block text-slate-900 font-bold">Ergänzen</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Bestehende Themen bleiben erhalten; neue Themen aus Excel werden ergänzt. Gleiche Einträge werden nicht doppelt angelegt.
                      </span>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 text-xs text-slate-700 font-bold cursor-pointer bg-white p-3 border border-slate-200 rounded-xl">
                    <input
                      type="radio"
                      name="yearlyImportMode"
                      checked={importMode === 'overwrite'}
                      onChange={() => setImportMode('overwrite')}
                      className="text-emerald-600 mt-0.5"
                    />
                    <div>
                      <span className="block text-rose-900 font-bold">Importierte Felder überschreiben</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Überschreibt nur Wochen und Fächer, die in dieser Datei tatsächlich enthalten sind.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                  Vorschau der Jahresplan-Einträge:
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2.5">KW</th>
                        <th className="py-2 px-2.5">SW</th>
                        <th className="py-2 px-2.5">Fach</th>
                        <th className="py-2 px-2.5">Thema / Reihe</th>
                        <th className="py-2 px-2.5">Buch / Lehrmittel</th>
                        <th className="py-2 px-2.5">Typ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parseResult.rows.map((row, idx) => (
                        <tr
                          key={idx}
                          className={row.isExample ? 'bg-amber-50/60 opacity-60 italic' : 'hover:bg-slate-50/80'}
                        >
                          <td className="py-1.5 px-2.5 font-bold text-slate-800 whitespace-nowrap">
                            KW {row.kw} {row.isExample && <span className="text-[10px] text-amber-700">(Beispiel)</span>}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-500 whitespace-nowrap">{row.sw ? `SW ${row.sw}` : '-'}</td>
                          <td className="py-1.5 px-2.5">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-bold text-slate-800">
                              {row.fach}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5 font-medium text-slate-900 max-w-xs truncate">
                            {row.thema || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-1.5 px-2.5 text-slate-600 max-w-xs truncate">
                            {row.buch || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.type === 'sa' ? 'bg-rose-100 text-rose-800' :
                              row.type === 'lzk' || row.type === 'test' ? 'bg-amber-100 text-amber-800' :
                              row.type === 'event' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {row.type === 'sa' ? 'Schularbeit' : row.type === 'lzk' ? 'LZK' : row.type === 'test' ? 'Test' : row.type === 'event' ? 'Event' : 'Standard'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Abbrechen
          </button>

          <button
            type="button"
            disabled={!parseResult || !parseResult.success || parseResult.validRows === 0}
            onClick={handleConfirmImport}
            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>{parseResult?.validRows || 0} Themen in Jahresplan übernehmen</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
