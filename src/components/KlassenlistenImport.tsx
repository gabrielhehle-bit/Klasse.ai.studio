import React, { useState, useRef } from 'react';
import { X, FileUp, AlertTriangle, ArrowLeftRight, Upload, Clipboard, Sparkles, FileText, Play } from 'lucide-react';
import { parseKlassenliste, ParsedStudent } from '../lib/klassenlistenImport';
import { parseSokratesFile, parseSokratesText, ParsedSokratesResult } from '../lib/sokratesParser';
import { SokratesImportModal } from './SokratesImportModal';

export const SAMPLE_SOKRATES_LIST = `Volksschule Gisingen-Oberau
6800 Feldkirch, Hämmerlestraße 2
+43 5522 3044530

Schülerliste der Klasse 2b
17 SchülerInnen, 10m/7w
Klassenlehrerin: Martina Bitschnau, BEd Schuljahr: 2026/27

Nr. Name BJ Geb.Datum SVNR Religion Staat Adressdaten Telefon

1 Arnautović Merjem 3 11.12.2017 islam. (IGGÖ) Österreich Hämmerlestraße 43 Top 5 6800 Feldkirch Mutter: +43 660 1455983
4042111217

2 Benchakri Adam 2 16.05.2019 islam. (IGGÖ) Österreich Torkelgasse 18 Top 3 6800 Feldkirch Mutter: +43 660 6230889 Vater: +43 0660 3104606
4308160519

3 Büchle Mats E. 2 20.09.2018 röm.-kath. Österreich Kapfstraße 101a Top 3 6800 Feldkirch Mutter: +43 650 3526028 Vater: +43 699 10525326
4781200918

4 Cheikhmous Ayaz 3 13.04.2018 islam. (IGGÖ) Syrien Hämmerlesiedlung 6a Top 2 6800 Feldkirch Mutter: +43 676 6201845 Vater: +43 676 7449434
5213130418

5 Dautovic Malik 2 14.10.2018 islam. (IGGÖ) Österreich Sägerstrasse 45 6800 Feldkirch Mutter: +43 660 7250855
3318141018

6 Elshani Lorena 2 16.02.2019 islam. (IGGÖ) Kosovo Kapfstraße 76d 6800 Feldkirch Mutter: +43 660 2026582 Vater: +43 660 5171126
3916160219

7 Gassner Gabriel A. 2 14.05.2019 röm.-kath. Österreich Sägerstraße 50 Top 1 6800 Feldkirch Mutter: +43 676 5913159 Vater: +43 676 5913159
5680140519

8 Hilby Lars C. 2 10.01.2019 röm.-kath. Österreich Winkelgasse 15 Top 3 6800 Feldkirch Mutter: +43 650 8611493 Vater: +43 664 6297055
5297100119

9 Kern Luke V. 2 19.03.2019 o.B. Deutschland Marienstraße 5 6800 Feldkirch Mutter: +43 670 5085898
6918190319

10 Lodi Slattery Clara 2 31.10.2018 o.B. Großbritannien Hämmerlestraße 34 Top 307 6800 Feldkirch Mutter: +43 664 2038582
6727311018

11 Mader Mahdia 3 09.08.2018 islam. (IGGÖ) Somalia Hämmerlestraße 41 Top 2 6800 Feldkirch Mutter: +43 681 20435001 Vater: +43 681 81176892
5586090818

12 Čotkarajev Atai 3 29.07.2018 islam. (IGGÖ) Tschechien Flurgasse 22a Top 18 6800 Feldkirch Mutter: +43 676 7501354 Vater: +43 676 9114811
3430290718

13 Riegler Aria 2 20.05.2019 o.B. Österreich Hämmerlestraße 53 6800 Feldkirch Mutter: +43 699 18715220
4421200519

14 Ropele Enias D. 2 01.07.2019 o.B. Österreich Sonnengasse 33 6800 Feldkirch Mutter: +43 664 99639140
4343010719

15 Sahitaj Elona 3 11.06.2018 islam. (IGGÖ) Kosovo Hämmerlestraße 23 6800 Feldkirch Mutter: +43 664 75093580
3049110618

16 Saideminov Abubakar 3 25.06.2018 islam. (IGGÖ) Russland Hämmerlestraße 27a Top 12 6800 Feldkirch Mutter: +43 677 64450084
5355250618

17 Stieger Malou 2 01.11.2018 o.B. Österreich Josefgasse 20 6800 Feldkirch Mutter: +43 660 2996176 Vater: +43660 5551054
4543011118`;

interface KlassenlistenImportProps {
  onClose: () => void;
  onImport: (importedStudents: any[], meta?: { klasse?: string; schuljahr?: string; lehrerName?: string; schulName?: string; schulkennzahl?: string }) => void;
}

export const KlassenlistenImport: React.FC<KlassenlistenImportProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [inputText, setInputText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [previewStudents, setPreviewStudents] = useState<ParsedStudent[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isAnalyzingPDF, setIsAnalyzingPDF] = useState(false);
  const [sokratesResult, setSokratesResult] = useState<ParsedSokratesResult | null>(null);
  const [showSokratesModal, setShowSokratesModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLoadSampleSokrates = () => {
    setErrorMsg(null);
    const res = parseSokratesText(SAMPLE_SOKRATES_LIST);
    setSokratesResult(res);
    setShowSokratesModal(true);
  };

  const processText = (text: string) => {
    setErrorMsg(null);
    if (!text || !text.trim()) {
      setPreviewStudents([]);
      setWarnings([]);
      return;
    }

    // Auto-detect Sokrates format in pasted or uploaded text
    if (/Sokrates|Schülerliste|SchülerInnen|Geb\.Datum|BJ\b|Arnautović|Čotkarajev|Bitschnau/i.test(text) || 
        /^\s*[0-9]{1,2}[\.\)\s\t]+[\p{Lu}].*\b(?:20[0-2][0-9]|19[89][0-9])/um.test(text)) {
      const sokratesRes = parseSokratesText(text);
      if (sokratesRes.students.length > 0) {
        setSokratesResult(sokratesRes);
        setShowSokratesModal(true);
        return;
      }
    }

    const result = parseKlassenliste(text);
    setPreviewStudents(result.schueler);
    setWarnings(result.warnungen);
  };

  const handleFileReader = async (file: File) => {
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      setIsAnalyzingPDF(true);
      setErrorMsg(null);
      try {
        const result = await parseSokratesFile(file);
        if (result.students.length === 0) {
          setErrorMsg("In dieser PDF konnten keine Schülerdaten erkannt werden. Bitte stelle sicher, dass es sich um eine Klassenliste aus Sokrates handelt.");
        } else {
          setSokratesResult(result);
          setShowSokratesModal(true);
        }
      } catch (err: any) {
        if (import.meta.env?.DEV) {
          console.error("Technischer Fehler beim PDF-Import:", err?.message || err);
        }
        setErrorMsg(err?.message || "Die PDF-Datei konnte nicht gelesen werden. Bitte versuche es erneut oder verwende alternativ den CSV-/Excel-Import.");
      } finally {
        setIsAnalyzingPDF(false);
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Die Datei ist zu groß (maximal 2 MB erlaubt).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // Auto-detect bad character conversion
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
    e.target.value = '';
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
      geburtsdatum: s.geburtstag || '',
      staatsbuergerschaft: 'Österreich',
      religion: '',
      besuchsjahr: '1',
      gruppen: [],
      erstelltAm: new Date().toISOString()
    }));

    onImport(outputList);
  };

  if (showSokratesModal && sokratesResult) {
    return (
      <SokratesImportModal
        isOpen={showSokratesModal}
        importResult={sokratesResult}
        onClose={() => setShowSokratesModal(false)}
        onApply={(students, meta) => {
          setShowSokratesModal(false);
          onImport(students, meta);
          onClose();
        }}
      />
    );
  }

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
              <p className="text-[0.6875rem] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sokrates-PDF, CSV oder Excel-Import</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl transition-all" aria-label="Schließen">
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* PDF Loading Banner */}
          {isAnalyzingPDF && (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles size={24} />
              </div>
              <h3 className="text-sm font-black text-emerald-900">Sokrates-PDF wird analysiert...</h3>
              <p className="text-xs text-emerald-700 max-w-md">
                Wir extrahieren Namen, Adressen, Geburtsdaten, Besuchsjahre (BJ), SVNR und Elternkontakte aus dem Dokument.
              </p>
            </div>
          )}

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
              Sokrates-PDF oder CSV hochladen
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
                    : 'border-slate-250 hover:border-emerald-400 bg-slate-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.csv,.txt"
                  className="hidden"
                />
                <div className="w-12 h-12 bg-white rounded-full border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600 mb-3">
                  <FileText size={22} className={dragActive ? 'text-emerald-500 animate-bounce' : ''} />
                </div>
                <p className="text-[0.875rem] font-bold text-slate-700">Sokrates-PDF oder CSV-Liste auswählen</p>
                <p className="text-[0.75rem] text-slate-400 mt-1 max-w-sm">
                  Ziehe deine <span className="font-bold text-emerald-700">Sokrates PDF-Klassenliste</span> oder eine .csv/.txt-Datei hierher oder <span className="text-emerald-600 font-bold">durchsuche deinen Computer</span>.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-[0.625rem] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 tracking-wider">
                    ✨ Sokrates PDF voll unterstützt
                  </span>
                  <span className="text-[0.625rem] font-black uppercase text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full tracking-wider">
                    CSV / Excel
                  </span>
                </div>
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

            {/* Quick Sample Test */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl mt-3">
              <div className="flex items-center gap-2 text-[0.75rem] text-slate-600">
                <Sparkles size={16} className="text-emerald-600 shrink-0" />
                <span>Testen mit der echten Sokrates-Beispielliste (Klasse 2b, 17 Kinder, VS Gisingen-Oberau)?</span>
              </div>
              <button
                type="button"
                onClick={handleLoadSampleSokrates}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[0.6875rem] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Play size={12} /> Beispielliste testen
              </button>
            </div>
          </div>

          {/* Area 2: Preview & Warnings for CSV/Text */}
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
            🔒 <strong className="text-slate-500">Datenschutz-Hinweis:</strong> Deine Daten werden geschützt verarbeitet und direkt in deine Klassenstruktur übernommen.
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

