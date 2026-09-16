import React, { useMemo, useState } from 'react';
import { AlignLeft, BarChart3, BookOpen, Eraser, Info, ShieldCheck, Type } from 'lucide-react';
import { analyzeGermanText, buildTextAnalysisHints } from '../lib/textAnalysis';

const Metric = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
  <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
    <div className="text-[0.625rem] font-black uppercase tracking-[0.16em] text-[var(--text3)]">{label}</div>
    <div className="mt-1 text-2xl font-black tracking-tight text-[var(--text)]">{value}</div>
    {hint && <div className="mt-1 text-xs font-medium leading-relaxed text-[var(--text2)]">{hint}</div>}
  </div>
);

export default function TextAnalysisTool() {
  const [text, setText] = useState('');
  const analysis = useMemo(() => analyzeGermanText(text), [text]);
  const hints = useMemo(() => analysis ? buildTextAnalysisHints(analysis) : [], [analysis]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <header className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent)]">Tools · Textanalyse</p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--text)] sm:text-3xl">Textschwierigkeit nachvollziehbar prüfen</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-[var(--text2)]">
              Formale Lesbarkeit lokal analysieren – ohne KI-Upload. Klassio berechnet den deutschen Flesch-Wert nach Amstad und die Wiener Sachtextformel aus Satz- und Wortmerkmalen.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            <ShieldCheck size={15} />
            Text bleibt im Browser
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[var(--text)]">Text</h2>
              <p className="mt-1 text-xs font-medium text-[var(--text2)]">Füge einen Lesetext, Sachtext oder Arbeitsauftrag ein.</p>
            </div>
            <button
              type="button"
              onClick={() => setText('')}
              disabled={!text}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface2,var(--surface))] px-3 text-xs font-bold text-[var(--text2)] transition hover:border-[var(--accent)]/35 hover:text-[var(--accent)] disabled:opacity-40"
            >
              <Eraser size={15} /> Leeren
            </button>
          </div>

          <textarea
            value={text}
            onChange={event => setText(event.target.value)}
            placeholder="Text hier einfügen …"
            className="min-h-[32rem] w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-5 text-base font-medium leading-7 text-[var(--text)] outline-none transition placeholder:text-[var(--text3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
          />

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-[var(--text3)]">
            <span>{analysis?.words ?? 0} Wörter</span>
            <span>{analysis?.sentences ?? 0} Sätze</span>
            <span>{analysis?.characters ?? text.trim().length} Zeichen</span>
          </div>
        </section>

        <div className="space-y-5">
          {!analysis ? (
            <section className="rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-10 text-center">
              <AlignLeft size={34} className="mx-auto text-[var(--text3)]" />
              <h2 className="mt-3 text-base font-black text-[var(--text)]">Noch kein Text</h2>
              <p className="mt-1 text-sm font-medium text-[var(--text2)]">Sobald Text vorhanden ist, erscheinen die Kennzahlen hier live.</p>
            </section>
          ) : (
            <>
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Metric
                    label="Flesch DE"
                    value={analysis.fleschGerman}
                    hint={analysis.fleschLabel}
                  />
                  <Metric
                    label="Wiener Sachtextformel 1"
                    value={analysis.wienerSachtextformel1}
                    hint={analysis.wstfLabel}
                  />
                  <Metric
                    label="Ø Satzlänge"
                    value={analysis.averageSentenceLength}
                    hint="Wörter pro Satz"
                  />
                  <Metric
                    label="Ø Silben"
                    value={analysis.averageSyllablesPerWord}
                    hint="Silben pro Wort"
                  />
                </div>
              </section>

              <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-black text-[var(--text)]">Textmerkmale</h2>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 text-sm">
                  <div><span className="block text-xs font-bold text-[var(--text3)]">Ø Wortlänge</span><strong className="text-[var(--text)]">{analysis.averageWordLength} Buchstaben</strong></div>
                  <div><span className="block text-xs font-bold text-[var(--text3)]">3+ Silben</span><strong className="text-[var(--text)]">{analysis.multiSyllablePercent}%</strong></div>
                  <div><span className="block text-xs font-bold text-[var(--text3)]">&gt; 6 Buchstaben</span><strong className="text-[var(--text)]">{analysis.longWordPercent}%</strong></div>
                  <div><span className="block text-xs font-bold text-[var(--text3)]">Einsilbig</span><strong className="text-[var(--text)]">{analysis.monosyllablePercent}%</strong></div>
                </div>
                {analysis.longestWords.length > 0 && (
                  <div className="mt-5">
                    <div className="text-[0.625rem] font-black uppercase tracking-[0.14em] text-[var(--text3)]">Längste Wörter</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {analysis.longestWords.map(word => (
                        <span key={word} className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-xs font-bold text-[var(--accent)]">{word}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-[var(--accent)]" />
                  <h2 className="text-sm font-black text-[var(--text)]">Prüfpunkte</h2>
                </div>
                <div className="mt-3 space-y-2">
                  {hints.map(hint => (
                    <div key={hint} className="rounded-xl bg-[var(--bg)] px-3 py-2.5 text-xs font-semibold leading-relaxed text-[var(--text2)]">{hint}</div>
                  ))}
                </div>
              </section>
            </>
          )}

          <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 shrink-0 text-amber-700" />
              <div className="space-y-2 text-xs font-medium leading-relaxed text-amber-950">
                <p><strong>Keine automatische Eignungsentscheidung:</strong> Formeln messen vor allem Satz- und Wortkomplexität. Vorwissen, Inhalt, Layout, Motivation und Fachwortschatz werden nicht vollständig erfasst.</p>
                <p><strong>Wiener Sachtextformel:</strong> Die Schulstufenskala beginnt bei etwa Stufe 4. Für 1.–3. Klasse ist der Wert daher nur eine zusätzliche formale Orientierung.</p>
                <p><strong>Silbenzählung:</strong> Klassio verwendet eine transparente Heuristik statt eines Aussprachewörterbuchs; einzelne Wörter können deshalb abweichen.</p>
              </div>
            </div>
          </section>

          <details className="rounded-[2rem] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
            <summary className="cursor-pointer text-sm font-black text-[var(--text)]">Formeln & Berechnung</summary>
            <div className="mt-4 space-y-3 text-xs font-medium leading-relaxed text-[var(--text2)]">
              <p><strong>Flesch für Deutsch nach Amstad:</strong> 180 − mittlere Satzlänge − 58,5 × mittlere Silbenzahl pro Wort.</p>
              <p><strong>Wiener Sachtextformel 1:</strong> 0,1935 × Anteil Wörter mit 3+ Silben + 0,1672 × mittlere Satzlänge + 0,1297 × Anteil Wörter mit mehr als 6 Buchstaben − 0,0327 × Anteil einsilbiger Wörter − 0,875.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
