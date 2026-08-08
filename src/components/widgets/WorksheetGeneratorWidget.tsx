import React, { useState } from 'react';
import { FileText, Wand2, Loader2, Printer } from 'lucide-react';
import { askAI } from '../../services/aiService';

export default function WorksheetGeneratorWidget({ app }: { app: any }) {
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState('3. Klasse');
  const [type, setType] = useState('Lesetext');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const generate = async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const prompt = `Erstelle ein kurzes, passgenaues Arbeitsblatt für Schüler der ${grade} zum Thema "${topic}". 
Format: ${type}.
Gib das Ergebnis als HTML-formatierten Text mit sinnvollen Überschriften (<h1>, <h2>), Absätzen (<p>) und Listen (<ul>) zurück.
Mache keine Markdown Blöcke, sondern reines HTML.
Halte den Text kindgerecht, motivierend und direkt verwendbar.`;

      const res = await askAI('ki-helfer', prompt);
      const htmlText = res.replace(/```html/g, '').replace(/```/g, '').trim();
      setResult(htmlText);
    } catch (e) {
      console.error(e);
      setResult("<p>Fehler bei der Generierung.</p>");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!result) return;
    const printWindow = window.open('', '', 'height=800,width=800');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Arbeitsblatt: ${topic}</title>
          <style>
            @page { margin: 2cm; }
            body { font-family: sans-serif; line-height: 1.6; color: #000; }
            h1 { font-size: 24pt; margin-bottom: 2rem; border-bottom: 2px solid #000; padding-bottom: 0.5rem; }
            h2 { font-size: 16pt; margin-top: 1.5rem; }
            p { font-size: 12pt; margin-bottom: 1rem; }
            .name-date { display: flex; justify-content: space-between; margin-bottom: 2rem; font-size: 12pt; }
            .line { border-bottom: 1px currentColor; display: inline-block; width: 150px; }
          </style>
        </head>
        <body>
          <div class="name-date">
            <div>Name: ____________________</div>
            <div>Datum: ____________________</div>
          </div>
          ${result}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 200);
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
      <div className="mb-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">KI-Arbeitsblatt-Generator</h2>
          <p className="text-sm font-medium text-slate-500">Direkter Print-on-Demand für passgenaues Material</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <input 
          type="text" 
          value={topic} 
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Thema (z.B. Waldtiere)"
          className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select 
          value={type} 
          onChange={(e) => setType(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="Lesetext mit Verständnisfragen">Lesetext mit Fragen</option>
          <option value="Lückentext (markiere die Lücken mit Strichen)">Lückentext</option>
          <option value="Rechenblatt (Textaufgaben)">Rechenblatt</option>
          <option value="Tabelle zum Ausfüllen">Tabelle zum Ausfüllen</option>
        </select>
        <select 
          value={grade} 
          onChange={(e) => setGrade(e.target.value)}
          className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-32 shrink-0"
        >
          <option value="1. Klasse">1. Klasse</option>
          <option value="2. Klasse">2. Klasse</option>
          <option value="3. Klasse">3. Klasse</option>
          <option value="4. Klasse">4. Klasse</option>
        </select>
        <button 
          onClick={generate} 
          disabled={loading || !topic}
          className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          Generieren
        </button>
      </div>

      {result && (
        <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 relative">
          <div className="border-b border-slate-200 bg-white p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Vorschau (Web-Ansicht)</span>
            <button onClick={handlePrint} className="text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold transition">
               <Printer size={16} /> Als PDF drucken
            </button>
          </div>
          <div className="p-6 text-sm bg-white overflow-y-auto max-h-[400px]" dangerouslySetInnerHTML={{ __html: result }} />
        </div>
      )}
    </div>
  );
}
