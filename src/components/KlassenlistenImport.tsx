import React, { useState, useRef } from 'react';
import { X, FileUp, AlertTriangle, ArrowLeftRight, Upload, Clipboard } from 'lucide-react';
import { parseKlassenliste, ParsedStudent } from '../lib/klassenlistenImport';

interface KlassenlistenImportProps {
  onClose: () => void;
  onImport: (importedStudents: any[]) => void;
}

export const KlassenlistenImport: React.FC<KlassenlistenImportProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [inputText, setInputText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<ParsedStudent[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processText = (text: string) => {
    setErrorMsg(null);
    const result = parseKlassenliste(text);
    setPreviewStudents(result.schueler);
    setWarnings(result.warnungen);
  };

  const handleFileReader = (file: File) => {
    if (file.size > 1024 * 1024) {
      setErrorMsg("Die Datei ist zu groß (maximal 1 MB erlaubt).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Auto-detect bad character conversion (replacement character )
      if (content.includes('')) {
        // Retry reading with windows-1252 to handle German umlauts
        const retryReader = new FileReader();
        retryReader.onload = (e2) => {
          processText(e2.target?.result as string);
        };
        retryReader.readAsText(file, 'windows-1252');
      } else {
        processText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileReader(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileReader(e.target.files[0]);
    }
  };

  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    processText(val);
  };

  // Switch column Swap
  const handleSwapNames = () => {
    setPreviewStudents(prev =>
      prev.map(s => ({
        ...s,
        vorname: s.nachname,
        nachname: s.vorname
      }))
    );
  };

  // Inline inputs
  const handleEditCell = (index: number, field: keyof ParsedStudent, val: string) => {
    setPreviewStudents(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val
      };
      return copy;
    });
  };

  // Remove row
  const handleRemoveStudent = (index: number) => {
    setPreviewStudents(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirmImport = () => {
    const validStudents = previewStudents.filter(s => s.vorname.trim() && s.nachname.trim());
    if (validStudents.length === 0) {
      setErrorMsg("Keine gültigen Kinder mit Vor- und Nachnamen vorhanden.");
      return;
    }

    // Build formal Student structures for the app
    const outputList = validStudents.map(s => ({
      id: crypto.randomUUID(),
      vorname: s.vorname.trim(),
      nachname: s.nachname.trim(),
      name: `${s.vorname.trim()} ${s.nachname.trim()}`,
      geschlecht: s.geschlecht || 'w',
      niveau: 1,
      geburtstag: s.geburtstag || '',
      staatsbuergerschaft: 'Österreich',
      religion: '',
      gruppen: [],
      erstelltAm: new Date().toISOString()
    }));

    onImport(outputList);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-fade-in" id="import-modal-overlay">
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" id="import-modal-container">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-650 border border-emerald-100">
              <FileUp size={20} />
            </div>
            <div>
              <h2 className="text-[1rem] font-black text-slate-900 leading-snug">Klassenliste importieren</h2>
              <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sokrates, WebUntis oder Excel-Import</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-all" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Error banner */}
          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-[16px] flex items-start gap-3">
              <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={18} />
              <div className="text-[0.8125rem] font-medium text-rose-900">{errorMsg}</div>
            </div>
          )}

          {/* Tab Selection */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => { setActiveTab('upload'); }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black uppercase text-[0.6875rem] tracking-wider transition-all ${
                activeTab === 'upload'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-450 hover:text-slate-600'
              }`}
            >
              <Upload size={14} />
              Datei hochladen (.csv / .txt)
            </button>
            <button
              onClick={() => { setActiveTab('paste'); }}
              className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black uppercase text-[0.6875rem] tracking-wider transition-all ${
                activeTab === 'paste'
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-slate-450 hover:text-slate-600'
              }`}
            >
              <Clipboard size={14} />
              Aus Excel einfügen (Copy & Paste)
            </button>
          </div>

          {/* Area 1: Input controls */}
          <div>
            {activeTab === 'upload' ? (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[20px] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/20'
                    : 'border-slate-250 hover:border-slate-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 mb-3">
                  <Upload size={22} className={dragActive ? 'text-emerald-500 animate-bounce' : ''} />
                </div>
                <p className="text-[0.875rem] font-bold text-slate-700">Klassenliste hochladen</p>
                <p className="text-[0.75rem] text-slate-400 mt-1 max-w-sm">
                  Ziehe eine .csv oder .txt-Datei hierher oder <span className="text-emerald-600 font-bold">durchsuche deinen Computer</span>.
                </p>
                <p className="text-[0.625rem] font-black uppercase text-slate-350 tracking-wider mt-4">Sokrates-Standard-CSV wird optimal erkannt</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[0.75rem] font-black uppercase tracking-wider text-slate-450 block">Excel- oder Sokrates-Daten einfügen</label>
                <textarea
                  value={inputText}
                  onChange={handleTextAreaChange}
                  placeholder="Markiere die Spalten in Excel/Sokrates, kopiere sie (Strg+C) und füge sie hier ein (Strg+V)"
                  className="w-full h-32 p-3 text-[0.8125rem] font-mono border border-slate-250 rounded-xl focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 input-transition"
                />
                <span className="text-[0.625rem] font-bold text-slate-400 block">Es werden automatisch Spalten für Vorname, Nachname und Geburtsdatum erkannt.</span>
              </div>
            )}
          </div>

          {/* Area 2: Preview & Warnings */}
          {previewStudents.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-150 pt-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[0.6875rem] font-black rounded-full">
                    {previewStudents.length} {previewStudents.length === 1 ? 'Kind' : 'Kinder'} erkannt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwapNames}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[0.6875rem] font-bold transition-all border border-slate-250 self-start"
                >
                  <ArrowLeftRight size={12} />
                  Vor- und Nachname vertauschen
                </button>
              </div>

              {/* Warning lines */}
              {warnings.length > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
                  {warnings.map((warn, wIdx) => (
                    <div key={wIdx} className="flex gap-2 text-[0.75rem] text-amber-850 font-medium">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Editable Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[0.6875rem] font-black uppercase text-slate-500 tracking-wider">
                      <th className="px-4 py-2 w-10 text-center">#</th>
                      <th className="px-4 py-2">Vorname</th>
                      <th className="px-4 py-2">Nachname</th>
                      <th className="px-4 py-2">Geburtsdatum</th>
                      <th className="px-4 py-2 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewStudents.map((child, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/40 text-[0.8125rem]">
                        <td className="px-4 py-1.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-1.5">
                          <input
                            type="text"
                            value={child.vorname}
                            onChange={(e) => handleEditCell(idx, 'vorname', e.target.value)}
                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded bg-transparent focus:bg-white text-[0.8125rem] font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-4 py-1.5">
                          <input
                            type="text"
                            value={child.nachname}
                            onChange={(e) => handleEditCell(idx, 'nachname', e.target.value)}
                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded bg-transparent focus:bg-white text-[0.8125rem] font-bold text-slate-800"
                          />
                        </td>
                        <td className="px-4 py-1.5">
                          <input
                            type="text"
                            placeholder="TT.MM.JJJJ"
                            value={child.geburtstag || ''}
                            onChange={(e) => handleEditCell(idx, 'geburtstag', e.target.value)}
                            className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded bg-transparent focus:bg-white text-[0.8125rem] font-semibold text-slate-650"
                          />
                        </td>
                        <td className="px-4 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                            title="Entfernen"
                          >
                            <X size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer info & Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[0.6875rem] text-slate-400 font-bold self-start sm:self-center">
            🔒 <strong className="text-slate-500">Datenschutz-Hinweis:</strong> Die Liste wird nur lokal in deinem Browser verarbeitet – nichts wird hochgeladen.
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={previewStudents.length === 0}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-wider transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
            >
              {previewStudents.length > 0 ? `${previewStudents.length} Kinder übernehmen` : 'Klassenliste übernehmen'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
