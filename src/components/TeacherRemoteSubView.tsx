import React, { useState, useEffect } from "react";
import {
  Smartphone,
  Layers,
  Check,
  Send,
  Save,
  Clock,
  Layout,
  Star,
  BookOpen
} from "lucide-react";
import DiagnosticEvaluationDashboard, { QuestTask } from "./DiagnosticEvaluationDashboard";

interface TeacherViewProps {
  activeStudent: any | null;
  activeTask: QuestTask;
  currentQuestStep: number;
  childDraftAnswer: string | null;
  questObservations: Record<
    number,
    {
      rating: "excellent" | "satisfied" | "support_needed" | "not_satisfied" | null;
      notes: string;
      timestamp: string;
    }
  >;
  activeObservationText: string;
  setActiveObservationText: (text: string) => void;
  handleSaveObservation: (
    stepId: number,
    rating: "excellent" | "satisfied" | "support_needed" | "not_satisfied" | null,
    notes: string
  ) => void;
  prevStep: () => void;
  nextStep: () => void;
  handlePushDiagnosticsToDb: () => void;
  totalCorrectCount: number;
  setCurrentQuestStep: (step: number) => void;
  questTasks: QuestTask[];
  collectedCrystals: boolean[];
  selectedGrade: "1" | "2" | "3" | "4";
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
}

const TeacherRemoteSubView: React.FC<TeacherViewProps> = ({
  activeStudent,
  activeTask,
  currentQuestStep,
  childDraftAnswer,
  questObservations,
  activeObservationText,
  setActiveObservationText,
  handleSaveObservation,
  prevStep,
  nextStep,
  handlePushDiagnosticsToDb,
  totalCorrectCount,
  setCurrentQuestStep,
  questTasks,
  collectedCrystals,
  selectedGrade,
  isPaused,
  setIsPaused
}) => {
  const [localTab, setLocalTab] = useState<"control" | "diagnostic">("control");
  const [revealAnswer, setRevealAnswer] = useState(false);
  const [isOffline, setIsOffline] = useState(!window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Automatically hide the answer whenever we change the active quest to keep things a mystery for kids
  useEffect(() => {
    setRevealAnswer(false);
  }, [activeTask.id]);

  const activeObsForThisTask = questObservations[activeTask.id];

  return (
    <div
      className="bg-slate-950 p-5 rounded-[2.5rem] border-4 border-slate-900 text-slate-100 flex flex-col justify-between overflow-y-auto w-full h-full text-left relative"
      style={{ minHeight: "520px", maxHeight: "720px" }}
    >
      {isOffline && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-rose-500 text-white text-[0.625rem] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 z-50 animate-pulse">
          <div className="w-2 h-2 rounded-full bg-white"/> Verbindung getrennt / Fehlgeschlagen
        </div>
      )}
      
      {/* Dynamic Header */}
      <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 gap-4 no-print shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center text-rose-500 border border-slate-800 shadow shadow-amber-500/10 shrink-0">
            <Smartphone size={16} />
          </div>
          <div>
            <span className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 block leading-none">Companion</span>
            <span className="text-[0.75rem] leading-tight font-black text-rose-500 uppercase tracking-widest leading-none block mt-1">
              Live-Lehrerpult
            </span>
          </div>
        </div>

        {/* Local switcher */}
        <div className="flex bg-slate-900 p-1 rounded-xl items-center">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`mr-3 px-3 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider cursor-pointer shadow-md transition-colors ${
              isPaused ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {isPaused ? "▶ Fortsetzen" : "⏸ Pausieren"}
          </button>
          <button
            onClick={() => setLocalTab("control")}
            className={`px-3 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer ${
              localTab === "control"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-500 hover:text-white"
            }`}
          >
            🕹️ Steuerung
          </button>
          <button
            onClick={() => setLocalTab("diagnostic")}
            className={`px-3 py-1 rounded-lg text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
              localTab === "diagnostic"
                ? "bg-amber-500 text-slate-950 font-black shadow"
                : "text-slate-500 hover:text-white"
            }`}
          >
            📊 Analyse
          </button>
        </div>
      </div>

      {localTab === "control" ? (
        <div className="flex-1 flex flex-col justify-between space-y-4 animate-fade-in no-print">
          {/* Active Status Display Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Quest Details info block */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
              <span className="text-[0.5rem] font-black text-indigo-400 uppercase tracking-wider block">
                Quest {activeTask.id >= 0 ? `${activeTask.id} / 20` : "Einleitung"} • {activeTask.categoryLabel}
              </span>
              <h4 className="text-[0.875rem] leading-snug font-black text-amber-300 text-wrap leading-tight break-words">{activeTask.title}</h4>
              <p className="text-[0.625rem] text-slate-400 font-medium leading-relaxed max-h-[48px] overflow-y-auto">
                {activeTask.instructions}
              </p>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[0.625rem]">
                <span className="text-slate-400 font-bold">Vorgabe (Lösung):</span>
                {revealAnswer ? (
                  <span className="text-emerald-400 font-black flex items-center gap-1.5 animate-fade-in bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                    <span>
                      {activeTask.correctAnswerId === "any"
                        ? "Beliebige Wahl"
                        : activeTask.choices.find((c) => c.id === activeTask.correctAnswerId)?.label || activeTask.correctAnswerId}
                    </span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setRevealAnswer(false); }}
                      className="text-[0.5rem] bg-slate-900 hover:bg-slate-850 hover:text-white px-1.5 py-0.5 rounded cursor-pointer leading-none text-slate-400 border border-slate-800 ml-1"
                    >
                      Verbergen
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setRevealAnswer(true)}
                    className="text-[0.5625rem] bg-indigo-950/80 border border-indigo-500/35 hover:bg-indigo-900/80 text-indigo-300 font-black px-2 py-1 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-sm"
                    title="Klicken, um die richtige Lösung anzuzeigen"
                  >
                    👁️ Lösung d. Lehrkraft zeigen
                  </button>
                )}
              </div>
            </div>

            {/* Live Client Tracker Status */}
            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[0.5rem] font-black text-emerald-400 uppercase tracking-widest block">
                  📡 Koppelung-Monitor
                </span>
                <h4 className="text-[0.75rem] leading-tight font-black text-slate-100 mt-1">Kind-Bildschirm</h4>
              </div>

              <div className="bg-black/40 border border-slate-800 p-2 rounded-xl text-[0.6875rem] leading-tight">
                {childDraftAnswer ? (
                  <p className="text-indigo-300 font-extrabold flex items-center gap-1.5 animate-pulse">
                    <span>Auswahl:</span>
                    <span className="underline decoration-indigo-500 decoration-offset-2">
                      {childDraftAnswer === "treah" ? "🦉 Elias" : childDraftAnswer === "camil" ? "🦎 Kimi" : childDraftAnswer}
                    </span>
                  </p>
                ) : (
                  <p className="text-slate-500 italic">Antwortet gerade auf der Tafel...</p>
                )}
              </div>

              <div className="text-[0.5625rem] text-slate-500 font-bold flex justify-between">
                <span>Active: {activeStudent?.vorname || "Unbekannt"}</span>
                <span>Score: {totalCorrectCount} / 20</span>
              </div>
            </div>

          </div>

          {/* Assessment rating selectors grid */}
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 space-y-3">
            <span className="text-[0.5625rem] font-black uppercase text-slate-400 tracking-wider block border-b border-slate-800 pb-1">
              Didaktische Niveaubewertung
             </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "excellent", label: "🟢 Souverän", desc: "Souverän gelöst" },
                { id: "satisfied", label: "🔵 OK", desc: "Überwiegend selbstständig" },
                { id: "support_needed", label: "🟡 Hilfe", desc: "Bedarf Hilfe" },
                { id: "not_satisfied", label: "🔴 Nicht", desc: "Nicht gelöst" },
              ].map((rate) => {
                const isSelected = activeObsForThisTask?.rating === rate.id;
                return (
                  <button
                    key={rate.id}
                    onClick={() =>
                      handleSaveObservation(activeTask.id, rate.id as any, activeObservationText)
                    }
                    className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? "bg-indigo-600 font-black text-white border-indigo-400 scale-[1.03] shadow-md shadow-indigo-600/10"
                        : "bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800"
                    }`}
                  >
                    <span className="text-[0.6875rem] font-black leading-none">{rate.label}</span>
                    <span className="text-[0.5rem] opacity-60 leading-none mt-0.5 text-wrap leading-tight break-words max-w-[90px]">{rate.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notepad comments block */}
          <div className="space-y-2">
            <label className="text-[0.5625rem] font-black uppercase tracking-wider text-slate-400 block">
              Beobachtungnotiz zu dieser Quest:
            </label>
            <div className="relative">
              <textarea
                value={activeObservationText}
                onChange={(e) => setActiveObservationText(e.target.value)}
                placeholder="z.B. Hilfestellung benötigt, zählte unruhig mit den Fingern, flüssiger Silbenreim..."
                className="w-full h-[64px] bg-black border border-slate-800 rounded-xl p-3 text-[0.75rem] leading-tight text-slate-300 outline-none resize-none leading-relaxed"
              />
              <button
                onClick={() =>
                  handleSaveObservation(
                    activeTask.id,
                    activeObsForThisTask?.rating || null,
                    activeObservationText
                  )
                }
                className="absolute bottom-2 right-2 p-1 px-3 bg-slate-900 border border-slate-800 text-[0.5625rem] font-extrabold uppercase rounded-lg text-slate-300 hover:text-white cursor-pointer hover:bg-slate-800 transition-all shadow"
              >
                Notiz Sichern
              </button>
            </div>
          </div>

          {/* Action buttons navigation bar */}
          <div className="pt-3 border-t border-slate-900 flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <button
                onClick={prevStep}
                disabled={currentQuestStep === 0}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[0.75rem] leading-tight font-black uppercase text-slate-400 hover:text-white disabled:pointer-events-none disabled:opacity-20 cursor-pointer"
              >
                zurück
              </button>
              <button
                onClick={nextStep}
                disabled={currentQuestStep === 21}
                className="px-4.5 py-2 bg-indigo-600 border border-indigo-505 rounded-xl text-[0.75rem] leading-tight font-black uppercase text-white hover:bg-indigo-550 shadow active:scale-95 transition-all cursor-pointer"
              >
                weiter ⏩
              </button>
            </div>

            <button
              onClick={handlePushDiagnosticsToDb}
              disabled={totalCorrectCount === 0}
              className="px-4.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[0.75rem] leading-tight uppercase tracking-wider active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              Speichern & Beenden
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1 animate-fade-in text-slate-300 max-h-[580px]">
          <DiagnosticEvaluationDashboard
            questTasks={questTasks}
            questObservations={questObservations}
            collectedCrystals={collectedCrystals}
            childDraftAnswer={childDraftAnswer}
            selectedGrade={selectedGrade}
            activeStudentName={
              activeStudent?.vorname
                ? `${activeStudent.vorname} ${activeStudent.nachname}`
                : "Ausgewähltes Kind"
            }
          />
        </div>
      )}
    </div>
  );
};

export default TeacherRemoteSubView;
