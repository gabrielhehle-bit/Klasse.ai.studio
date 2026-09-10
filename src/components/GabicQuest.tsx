import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gamepad2,
  Smartphone,
  BookOpen,
  UserCheck,
  Sparkles,
  Trophy,
  Compass,
  Lock,
  ChevronRight,
  RefreshCw,
  Clock,
  ArrowRight,
  Save,
  Grid,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  X
} from "lucide-react";
import confetti from "canvas-confetti";
import { QRCodeCanvas } from "qrcode.react";
import { useApp } from "../context/AppContext";
import { DiagnostikErhebung, Student } from "../types";
import { logActivity } from "../lib/utils";
import { getDiagnosticClassId, upsertByKey } from "../lib/diagnosticData";
import { startSyncSession, createSyncUrl, getActiveEncodedSessionKey } from "../lib/syncService";
import {
  playMagicSound,
  FridolinAvatar,
  LumiAvatar,
  ActiveVisualTaskRenderer
} from "./QuestVisuals";

import DiagnosticEvaluationDashboard, { QuestTask } from "./DiagnosticEvaluationDashboard";
import TeacherRemoteSubView from "./TeacherRemoteSubView";
import { QUEST_TASKS_BY_GRADE } from "./QuestTasksData";

interface GabicQuestProps {
  forcedTab?: "dashboard" | "child-game" | "teacher-remote" | "split-view";
}

const GabicQuest: React.FC<GabicQuestProps> = ({ forcedTab }) => {
  const { app, setApp } = useApp();
  const mySenderId = useRef(Math.random().toString(36).substring(2, 9));

  // Visual View Tab Routing
  const [gabicTab, setGabicTab] = useState<
    "dashboard" | "child-game" | "teacher-remote" | "split-view"
  >(forcedTab || "dashboard");

  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // TTS (Text-to-Speech)
  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Sync sounds state with QuestVisuals sound play helper
  const triggerAudioPlay = (effectType: "click" | "correct" | "wrong" | "levelup") => {
    if (soundEnabled) {
      playMagicSound(effectType);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      gameContainerRef.current?.requestFullscreen?.().catch(console.error);
    } else {
      document.exitFullscreen?.().catch(console.error);
    }
  };

  useEffect(() => {
    if (forcedTab) {
      setGabicTab(forcedTab);
    }
  }, [forcedTab]);

  useEffect(() => {
    // Automatically generate direct pairing QR code if not established (Zero-Knowledge)
    if (!app.boardSettings?.activeSyncCode) {
      startSyncSession(app)
        .then(({ code }) => {
          setApp((p: any) => ({
            ...p,
            boardSettings: {
              ...(p.boardSettings || {}),
              activeSyncCode: code,
              isRemoteController: false,
            },
          }));
        })
        .catch(console.error);
    }
  }, [app.boardSettings?.activeSyncCode, setApp, app]);

  // Selected state variables
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedGrade, setSelectedGrade] = useState<"1" | "2" | "3" | "4">(
    String(app.stufe || 1) as any
  );

  // Quest Active states
  const [currentQuestStep, setCurrentQuestStep] = useState<number>(0);
  const [companionChoice, setCompanionChoice] = useState<"treah" | "camil" | null>(null);
  const [collectedCrystals, setCollectedCrystals] = useState<boolean[]>(
    new Array(20).fill(false)
  );
  const [childDraftAnswer, setChildDraftAnswer] = useState<string | null>(null);

  // Observations record State
  const [questObservations, setQuestObservations] = useState<
    Record<
      number,
      {
        rating: "excellent" | "satisfied" | "support_needed" | "not_satisfied" | null;
        notes: string;
        timestamp: string;
      }
    >
  >({});

  const [activeObservationText, setActiveObservationText] = useState<string>("");

  const activeStudent = useMemo(() => {
    return app.schueler.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, app.schueler]);

  const prevStudentId = useRef(selectedStudentId);

  const resetQuestManually = () => {
    setCurrentQuestStep(0);
    setChildDraftAnswer(null);
    setQuestObservations({});
    setCollectedCrystals(new Array(20).fill(false));
    setCompanionChoice(null);
    triggerAudioPlay("click");
  };

  useEffect(() => {
    if (selectedStudentId !== prevStudentId.current) {
      prevStudentId.current = selectedStudentId;
      resetQuestManually();
    }

    if (activeStudent) {
      const finalLevel = app.stufe || 1;
      setSelectedGrade(String(finalLevel) as any);
    }
  }, [selectedStudentId, activeStudent, app.stufe]);

  const sortedStudents = useMemo(() => {
    return [...(app.schueler || [])].sort((a, b) =>
      a.nachname.localeCompare(b.nachname, "de")
    );
  }, [app.schueler]);

  const questTasks = useMemo(() => {
    return QUEST_TASKS_BY_GRADE[selectedGrade] || QUEST_TASKS_BY_GRADE["1"];
  }, [selectedGrade]);

  const activeTask = useMemo<QuestTask>(() => {
    if (currentQuestStep === 0) {
      return {
        id: -1,
        title: "Wähle deinen Begleiter",
        category: "kognition",
        categoryLabel: "Start",
        storyDescription: "Willkommen bei GabicQuest! Hier beginnt dein großes Zauberabenteuer. Welcher schlaue Begleiter soll dich heute begleiten und dir Tipps geben?",
        instructions: "Tippe auf den Begleiter, den du am liebsten magst, um das Abenteuer zu starten!",
        character: "Elias",
        characterMood: "happy",
        quote: "Hallo! Ich bin bereit für unsere gemeinsame Reise durch das Buchstaben- und Zahlenland. Tippe auf mich oder meinen Freund!",
        correctAnswerId: "any",
        choices: [
          { id: "treah", label: "Elias (Eule) 🦉", detail: "Gibt dir weise Tipps und liebt Abenteuer." },
          { id: "lumi", label: "Kimi (Chamäleon) 🦎", detail: "Kann die Farbe wechseln und ist neugierig." }
        ],
        visualType: "companion"
      };
    }
    if (currentQuestStep === 21) {
      return {
        id: 99,
        title: "Abenteuer abgeschlossen!",
        category: "kognition",
        categoryLabel: "Ende",
        storyDescription: "Du hast alle Zauberprüfungen im Wald erfolgreich gemeistert!",
        instructions: "Herzlichen Glückwunsch! Du hast das Ende des Zauberwald-Abenteuers erreicht!",
        character: "Elias",
        characterMood: "excited",
        quote: "Du warst einfach fabelhaft! Alle glitzernden Kristalle gehören dir! Schau dir deine Belohnung an!",
        correctAnswerId: "any",
        choices: [],
        visualType: "congratulations"
      };
    }
    return questTasks[currentQuestStep - 1] || questTasks[0];
  }, [questTasks, currentQuestStep]);

  const [isPaused, setIsPaused] = useState(false);

  // Write synchronisation telemetry payload to localStorage & Firebase cross-device states
  const triggerSyncUpdate = (
    step: number,
    studentId: string,
    draft: string | null,
    comp: "treah" | "camil" | null,
    observations: any,
    grade: "1" | "2" | "3" | "4",
    paused: boolean
  ) => {
    const syncData = {
      currentQuestStep: step,
      selectedStudentId: studentId,
      childDraftAnswer: draft,
      companionChoice: comp,
      questObservations: observations,
      selectedGrade: grade,
      isPaused: paused,
      timestamp: Date.now(),
      senderId: mySenderId.current,
    };
    localStorage.setItem("gabic_quest_sync_v1", JSON.stringify(syncData));

    setApp((prev: any) => {
      if (
        prev?.gabicState &&
        prev.gabicState.selectedStudentId === studentId &&
        prev.gabicState.currentQuestStep === step &&
        prev.gabicState.childDraftAnswer === draft &&
        prev.gabicState.companionChoice === comp &&
        prev.gabicState.selectedGrade === grade &&
        prev.gabicState.isPaused === paused &&
        JSON.stringify(prev.gabicState.questObservations) ===
          JSON.stringify(observations)
      ) {
        return prev;
      }
      return {
        ...prev,
        gabicState: syncData,
      };
    });
  };

  // Keep Sync State Loop
  useEffect(() => {
    const applySyncState = (parsed: any) => {
      if (parsed.senderId === mySenderId.current) return;
      if (parsed.currentQuestStep !== undefined && parsed.currentQuestStep !== currentQuestStep)
        setCurrentQuestStep(parsed.currentQuestStep);
      if (parsed.selectedStudentId !== undefined && parsed.selectedStudentId !== selectedStudentId)
        setSelectedStudentId(parsed.selectedStudentId);
      if (parsed.childDraftAnswer !== undefined && parsed.childDraftAnswer !== childDraftAnswer)
        setChildDraftAnswer(parsed.childDraftAnswer);
      if (parsed.companionChoice !== undefined && parsed.companionChoice !== companionChoice)
        setCompanionChoice(parsed.companionChoice);
      if (parsed.questObservations !== undefined && JSON.stringify(parsed.questObservations) !== JSON.stringify(questObservations))
        setQuestObservations(parsed.questObservations);
      if (parsed.selectedGrade !== undefined && parsed.selectedGrade !== selectedGrade)
        setSelectedGrade(parsed.selectedGrade);
      if (parsed.isPaused !== undefined && parsed.isPaused !== isPaused)
        setIsPaused(parsed.isPaused);
    };

    if (app.gabicState) {
      applySyncState(app.gabicState);
    }

    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "gabic_quest_sync_v1" && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue);
          applySyncState(parsed);
        } catch (err) {
          console.error(err);
        }
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => window.removeEventListener("storage", handleStorageEvent);
  }, [app.gabicState, currentQuestStep, selectedStudentId, childDraftAnswer, companionChoice, questObservations, selectedGrade, isPaused]);

  useEffect(() => {
    triggerSyncUpdate(currentQuestStep, selectedStudentId, childDraftAnswer, companionChoice, questObservations, selectedGrade, isPaused);
  }, [currentQuestStep, selectedStudentId, childDraftAnswer, companionChoice, questObservations, selectedGrade, isPaused]);

  const selectCompanion = (id: "treah" | "camil") => {
    setCompanionChoice(id);
    setChildDraftAnswer(id);
    triggerAudioPlay("levelup");
    triggerConfettiExplosion();
  };

  const selectAnswerDraftByChild = (choiceId: string) => {
    setChildDraftAnswer(choiceId);

    if (choiceId === activeTask.correctAnswerId || activeTask.correctAnswerId === "any") {
      triggerAudioPlay("correct");
      triggerConfettiExplosion();
      setCollectedCrystals((prev) => {
        const next = [...prev];
        if (currentQuestStep > 0 && currentQuestStep <= 20) {
          next[currentQuestStep - 1] = true;
        }
        return next;
      });
    } else {
      triggerAudioPlay("wrong");
    }
  };

  const triggerConfettiExplosion = () => {
    // Part D: Only show confetti when in child-game view
    if (gabicTab !== "child-game" && gabicTab !== "split-view") return;
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ["#fbbf24", "#34d399", "#60a5fa", "#a78bfa", "#f472b6"],
    });
  };

  const handleSaveObservation = (
    stepId: number,
    rating: "excellent" | "satisfied" | "support_needed" | "not_satisfied" | null,
    notes: string
  ) => {
    const updated = {
      ...questObservations,
      [stepId]: {
        rating,
        notes: notes,
        timestamp: new Date().toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    };
    setQuestObservations(updated);
    setActiveObservationText("");
  };

  const nextStep = () => {
    if (currentQuestStep < 21) {
      setCurrentQuestStep((p) => p + 1);
      setChildDraftAnswer(null);
      triggerAudioPlay("click");
    }
  };

  const prevStep = () => {
    if (currentQuestStep > 0) {
      setCurrentQuestStep((p) => p - 1);
      setChildDraftAnswer(null);
      triggerAudioPlay("click");
    }
  };

  const totalCorrectCount = useMemo(() => {
    let score = 0;
    questTasks.forEach((task) => {
      if (task.id === 0) return;
      const obs = questObservations[task.id];
      if (obs?.rating === "excellent" || obs?.rating === "satisfied") {
        score++;
      } else if (!obs?.rating && collectedCrystals[task.id - 1]) {
        score++;
      }
    });
    return score;
  }, [questObservations, collectedCrystals, questTasks]);

  const handlePushDiagnosticsToDb = () => {
    if (!activeStudent) return alert("Fehler: Kein Schüler ausgewählt.");

    const testId = "gabic-quest-diagnostik";
    const existingTest = app.diagnostikTests?.find((t) => t.id === testId);

    if (!existingTest) {
      const newTestTemplate: any = {
        id: testId,
        name: "GabicQuest Diagnosetest",
        kategorie: "kognition",
        kurzbeschreibung: "Spielerisches Echtzeit-Erlebnismonitoring zur kognitiven & Erstdiagnostik",
        einheit: "punkte",
        schwellenwert: 12,
        schwellenrichtung: "unter",
        schulstufen: [1, 2, 3, 4],
      };

      setApp((prev) => ({
        ...prev,
        diagnostikTests: [...(prev.diagnostikTests || []), newTestTemplate],
      }));
    }

    let diagnosticSummary = `GabicQuest Gamifizierte Diagnostik vom ${new Date().toLocaleDateString("de-DE")}.\n`;
    diagnosticSummary += `Begleiter: ${companionChoice === "treah" ? "Elias 🦉" : "Kimi 🦎"}\n`;
    diagnosticSummary += `Erreichte Punkte: ${totalCorrectCount} von 20 Quests gelöst.\n\nBeobachtungsverlauf:\n`;

    questTasks.forEach((task) => {
      const item = questObservations[task.id];
      if (item) {
        const ratingStr =
          item.rating === "excellent"
            ? "🟢 Souverän gelöst"
            : item.rating === "satisfied"
              ? "🔵 Teilweise selbstständig"
              : item.rating === "support_needed"
                ? "🟡 Unterstützung benötigt"
                : "🔴 Nicht gelöst";
        diagnosticSummary += `- Quest ${task.id} (${task.title}): ${ratingStr}. ${item.notes ? `Notiz: ${item.notes}` : ""}\n`;
      }
    });

    const isForderbedarf = totalCorrectCount < 12;

    const newErhebung: DiagnostikErhebung = {
      id: crypto.randomUUID(),
      schuelerId: selectedStudentId,
      testId: testId,
      datum: new Date().toISOString().split("T")[0],
      schuljahr: app.schuljahr || "2023/24",
      schulstufe: app.stufe || 3,
      rohwert: totalCorrectCount,
      ergebniswert: totalCorrectCount,
      kommentar: diagnosticSummary,
      durchgefuehrtVon: "GabicQuest Engine (Synchronisiert)",
      foerderbedarfErkannt: false,
      auffaelligkeitErkannt: isForderbedarf,
      classId: getDiagnosticClassId(app),
      quelle: "live",
      type: "live",
    };

    setApp((prev: any) => ({
      ...prev,
      diagnostikErhebungen: upsertByKey(
        prev.diagnostikErhebungen || [],
        [newErhebung],
        entry => `${entry.schuelerId}|${entry.testId}|${entry.datum}`
      ),
    }));

    logActivity(
      setApp,
      `GabicQuest Diagnostik für ${activeStudent.vorname} abgeschlossen (${totalCorrectCount}/20)`,
      "diagnostik",
      testId
    );

    alert(`💡 Daten erfolgreich zum Schülerdossier von ${activeStudent.vorname} übertragen & gespeichert!`);

    setGabicTab("dashboard");
    setCurrentQuestStep(0);
    setQuestObservations({});
    setCollectedCrystals(new Array(20).fill(false));
    setChildDraftAnswer(null);
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-140px)] min-h-[500px]  no-print">
      
      {/* Dynamic View Switcher Header Bar */}
      {app?.boardSettings?.gabicRole !== "child" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 flex flex-wrap items-center justify-between gap-3 text-slate-100 shadow-xl mb-4 shrink-0 relative">
          
          {/* Top Closed button */}
          <button
            type="button"
            onClick={() => setApp((prev) => ({ ...prev, currentPage: "dashboard" }))}
            className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center bg-rose-950/40 text-rose-450 hover:bg-rose-900 border border-rose-900/40 rounded-lg transition-all cursor-pointer"
          >
            <X size={14} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-xl flex items-center justify-center text-slate-950 shadow-md">
              <Gamepad2 size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-[0.75rem] leading-tight font-black uppercase tracking-wider text-amber-300">
                GabicQuest 🎮
              </h1>
              <p className="text-[0.5625rem] font-bold text-slate-400">
                Gamifizierte Diagnostik & Lehrer-Fernsteuerung
              </p>
            </div>
          </div>

          <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-850 gap-0.5">
            {[
              { id: "dashboard", label: "Cockpit", icon: <Compass size={12} /> },
              { id: "child-game", label: "Tafel-Spiel", icon: <Gamepad2 size={12} /> },
              { id: "teacher-remote", label: "Fernsteuerung", icon: <Smartphone size={12} /> },
              { id: "split-view", label: "Split-Screen", icon: <Grid size={12} /> }
            ].map((btn) => {
              const isActive = gabicTab === btn.id;
              const disabled = btn.id !== "dashboard" && !selectedStudentId;
              
              return (
                <button
                  key={btn.id}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) {
                      return alert("Pädagogischer Hinweis: Bitte zuerst ein Kind auf der Cockpit-Seite auswählen!");
                    }
                    setGabicTab(btn.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    disabled ? "opacity-30 cursor-not-allowed" : ""
                  } ${
                    isActive
                      ? "bg-indigo-600 text-white shadow"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {btn.icon}
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main View Core Panel - Exactly Contained Height Window */}
      <div className="flex-1  min-h-0">
        
        {/* =========================================================================
            COCKPIT SETUP BOARD VIEW
            ========================================================================= */}
        {gabicTab === "dashboard" && (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-[2rem] p-5 sm:p-6 shadow-sm h-full flex flex-col justify-between overflow-y-auto text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 items-start">
              
              {/* Profile setup left column */}
              <div className="lg:col-span-8 space-y-4">
                <div>
                  <span className="px-2.5 py-0.5 text-[0.5rem] font-black uppercase tracking-widest bg-amber-500/10 text-amber-700 rounded-full">
                    👑 Pädagogische Diagnostik
                  </span>
                  <h2 className="text-[1.25rem] leading-normal font-extrabold text-slate-900 dark:text-neutral-100 mt-1">
                    Kind & Stufe für GabicQuest festlegen
                  </h2>
                  <p className="text-[0.6875rem] text-slate-500 dark:text-neutral-400 leading-relaxed font-semibold">
                    Hier startest du das Sagen-Abenteuer für dein Kind. Wähle das Ziel-Kind aus, um dessen Diagnosestufe zu konfigurieren.
                  </p>
                </div>

                {/* Grade buttons config grid */}
                <div className="p-4 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-neutral-800 space-y-2.5">
                  <span className="text-[0.5625rem] font-black text-slate-450 uppercase tracking-wider block">
                    🎓 Diagnostische Schulstufe (Klasse 1 bis 4)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "3", "4"].map((grade) => {
                      const isSel = selectedGrade === grade;
                      return (
                        <button
                          key={grade}
                          onClick={() => {
                            setSelectedGrade(grade as any);
                            triggerAudioPlay("click");
                          }}
                          className={`p-2 rounded-xl text-center cursor-pointer transition-all border font-black text-[0.75rem] leading-tight ${
                            isSel
                              ? "bg-amber-500 border-amber-600 text-slate-950 font-black scale-102"
                              : "bg-white dark:bg-neutral-800 text-slate-500 dark:text-neutral-400 border-slate-250 dark:border-neutral-700"
                          }`}
                        >
                          Klasse {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Students list picker grid */}
                <div className="space-y-2">
                  <span className="text-[0.5625rem] font-black text-slate-405 uppercase tracking-wider block">
                    👥 Ziel-Kind auswählen ({app.schueler?.length || 0} Schüler)
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[160px] overflow-y-auto pr-1">
                    {sortedStudents.map((stud) => {
                      const isPicked = selectedStudentId === stud.id;
                      return (
                        <button
                          key={stud.id}
                          onClick={() => {
                            setSelectedStudentId(stud.id);
                            triggerAudioPlay("click");
                          }}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-center gap-2 ${
                            isPicked
                              ? "bg-indigo-600 border-indigo-500 text-white scale-[1.01] shadow-md shadow-indigo-600/15"
                              : "bg-slate-50 dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-750 text-slate-700 dark:text-neutral-200 border-slate-200/60 dark:border-neutral-700"
                          }`}
                        >
                          <span className="text-[1.125rem] leading-normal shrink-0">{stud.emoji || "🧑‍🎓"}</span>
                          <span className="text-[0.6875rem] font-bold text-wrap leading-tight break-words leading-none">
                            {stud.vorname} {stud.nachname?.charAt(0)}.
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pairing QR Code right column */}
              <div className="lg:col-span-4 bg-slate-50 dark:bg-black/20 p-4 rounded-3xl border border-slate-150 dark:border-neutral-800 flex flex-col items-center justify-center space-y-3.5 text-center h-full min-h-[240px]">
                <span className="text-[0.5625rem] font-black uppercase text-indigo-500 tracking-wider">
                  📱 Geräte-Kopplung (QR Code)
                </span>
                
                {app.boardSettings?.activeSyncCode ? (
                  <>
                    <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow shadow-amber-500/10 inline-block animate-fade-in">
                      <QRCodeCanvas
                        value={createSyncUrl(app.boardSettings.activeSyncCode, getActiveEncodedSessionKey() || '')}
                        size={105}
                      />
                    </div>
                    <div>
                      <span className="text-[0.5625rem] font-bold text-slate-400 block uppercase">Verbindungs-Code</span>
                      <strong className="text-[1rem] leading-normal font-black text-indigo-600 tracking-widest">{app.boardSettings.activeSyncCode}</strong>
                    </div>
                  </>
                ) : (
                  <div className="animate-spin text-indigo-600">
                    <RefreshCw size={24} />
                  </div>
                )}
                
                <p className="text-[0.625rem] text-slate-455 font-semibold leading-relaxed max-w-[190px]">
                  Scanne diesen Code mit deinem Handy, um das Echtzeit-Fernsteuerungspult zu öffnen.
                </p>
              </div>

            </div>

            {/* Bottom launcher button */}
            <div className="border-t border-slate-100 dark:border-neutral-800 pt-4 mt-4 flex justify-between items-center shrink-0">
              <span className="text-[0.625rem] text-slate-400 font-bold italic">
                {activeStudent ? `Ausgewähltes Kind: ${activeStudent.vorname}` : "Bitte wähle ein Kind aus, um fortzufahren!"}
              </span>

              <button
                disabled={!selectedStudentId}
                onClick={() => {
                  setGabicTab("child-game");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[0.75rem] leading-tight tracking-wider px-6 py-2.5 rounded-xl shadow-lg active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Abenteuer starten</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            CHILD GAME IMMERSIVE BOARD PLAY VIEW (100% GAME PANEL THEME)
            ========================================================================= */}
        {gabicTab === "child-game" && (
          <div className="gabic-game-screen bg-emerald-950 border-4 border-emerald-900 rounded-[2.5rem] p-4 lg:p-6 text-slate-100 flex flex-col justify-between  h-full relative font-sans" ref={gameContainerRef}>
            
            {/* Top Game HUD Bar */}
            <div className="flex items-center justify-between border-b-2 border-emerald-800/40 pb-3 mb-3 shrink-0 font-sans">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-300 to-amber-500 flex items-center justify-center text-slate-950 text-[1.25rem] leading-normal font-black shadow-md shadow-amber-500/10 scale-95 md:scale-100 animate-pulse">
                  💎
                </div>
                <div className="text-left">
                  <span className="text-[0.5625rem] font-black text-amber-400 block uppercase tracking-wider leading-none">
                    ⭐ GABICQUEST ZAUBERLAND ⭐
                  </span>
                  <span className="text-[0.75rem] leading-tight md:text-[0.875rem] leading-snug font-extrabold text-slate-100 uppercase tracking-widest block mt-0.5">
                    {activeStudent ? `Abenteuer von ${activeStudent.vorname}` : "Kind-Zauberspiel"} • {currentQuestStep === 0 ? "Einleitung" : currentQuestStep === 21 ? "FINALE!" : `Prüfung ${currentQuestStep} von 20`}
                  </span>
                </div>
              </div>

              {/* Sound and Fullscreen Control toggles */}
              <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-emerald-800/50">
                <span className="text-[0.5rem] font-extrabold text-emerald-400 tracking-wider px-2 hidden sm:inline">SCHALL & VOLLBILD:</span>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title="Ton an/aus"
                  className={`p-1.5 rounded-lg cursor-pointer transition-all ${soundEnabled ? 'text-amber-400 hover:bg-white/5' : 'text-slate-500 hover:text-rose-400'}`}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button
                  onClick={toggleFullscreen}
                  title="Vollbild umschalten"
                  className="p-1.5 hover:bg-white/5 text-cyan-400 rounded-lg cursor-pointer transition-all"
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              </div>
            </div>

            {/* Immersive Play Arena Container - Dual Pane Grid layout */}
            <div className="flex-1  flex flex-col min-h-0 py-1 font-sans">
              {currentQuestStep === 21 ? (
                // Final success screen
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto py-4 animate-fade-in my-auto">
                  <div className="relative">
                    <div className="absolute inset-0 bg-amber-400 rounded-full blur-xl opacity-35 animate-pulse" />
                    <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-[2rem] flex items-center justify-center shadow-2xl border-4 border-amber-200 relative animate-bounce z-10">
                      <Trophy size={48} className="text-slate-950 stroke-[2.5]" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h2 className="text-[1.5rem] leading-normal md:text-[1.875rem] leading-tight font-black text-amber-300 uppercase tracking-wide">
                      HERZLICHEN GLÜCKWUNSCH!
                    </h2>
                    <p className="text-[0.75rem] leading-tight md:text-[0.875rem] leading-snug text-emerald-200 font-bold max-w-md leading-relaxed">
                      {activeStudent?.vorname || "Zauberlehrling"}, du hast alle geheimnisvollen Pfade beschritten und bist nun ein anerkannter Hüter des Zauberwaldes!
                    </p>
                  </div>

                  {/* Score badges */}
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                    <div className="bg-emerald-900/60 border-2 border-amber-400/20 p-4 rounded-3xl backdrop-blur-sm text-center">
                      <span className="text-[0.5625rem] font-black uppercase text-amber-400 block tracking-widest">Belohnung</span>
                      <p className="text-[1.5rem] leading-normal font-black mt-1 text-slate-100 flex items-center justify-center gap-1.5">
                        {totalCorrectCount} <span className="text-[1.125rem] leading-normal">💎</span>
                      </p>
                    </div>
                    <div className="bg-emerald-900/60 border-2 border-emerald-500/20 p-4 rounded-3xl backdrop-blur-sm text-center">
                      <span className="text-[0.5625rem] font-black uppercase text-emerald-400 block tracking-widest">Diagnostik</span>
                      <p className="text-[0.75rem] leading-tight font-black mt-1.5 text-slate-300">
                        Bereit zur Übertragung!
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handlePushDiagnosticsToDb}
                    className="bg-gradient-to-tr from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-slate-950 font-black uppercase text-[0.75rem] leading-tight tracking-widest px-8 py-3.5 rounded-2xl shadow-xl active:scale-95 transition-all cursor-pointer flex items-center gap-2 border-b-4 border-amber-700 mt-2"
                  >
                    <span>📜 In deine Mappe eintragen</span>
                  </button>
                </div>
              ) : isPaused ? (
                   // PAUSE OVERLAY
                   <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 max-w-xl mx-auto py-4 animate-fade-in my-auto bg-slate-900/60 backdrop-blur-xl rounded-[2rem] border border-slate-700 p-8 shadow-2xl">
                     <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-2 shadow-lg ring-4 ring-slate-700/50">
                        <div className="flex gap-2">
                           <div className="w-3 h-8 bg-slate-400 rounded-sm"></div>
                           <div className="w-3 h-8 bg-slate-400 rounded-sm"></div>
                        </div>
                     </div>
                     <h2 className="text-[1.875rem] font-black text-slate-100 uppercase tracking-widest">
                       PAUSE
                     </h2>
                     <p className="text-[0.875rem] text-slate-300 font-bold max-w-md pb-4">
                       Das Abenteuer wurde vorübergehend unterbrochen. Bitte warte auf deine Lehrperson, um fortzufahren.
                     </p>
                     
                     {/* Allow resuming directly from iPad if needed */}
                     <button
                       onClick={() => setIsPaused(false)}
                       className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-black uppercase text-[0.875rem] tracking-wider shadow-md transition-all active:scale-95"
                     >
                       Wieder fortsetzen ▶
                     </button>
                   </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch h-full ">
                  
                  {/* LEFT COLUMN (Span 4): The Magic Advisor Companion & Step Map */}
                  <div className="md:col-span-4 flex flex-col justify-between space-y-3 bg-emerald-900/15 border border-emerald-800/25 p-4 rounded-3xl min-h-0 overflow-y-auto max-h-full">
                    
                    {/* Character Avatar Box */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-28 w-28 flex items-center justify-center relative">
                        {activeTask.character === "Treah" || activeTask.character === "Fridolin" ? (
                          <FridolinAvatar mood={childDraftAnswer ? "happy" : "wise"} />
                        ) : (
                          <LumiAvatar mood={childDraftAnswer ? "excited" : "thinking"} />
                        )}
                      </div>
                      
                      {/* Character Dialogue Bubble styled like fine parchment scroll */}
                      <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-2xl text-[0.6875rem] font-bold italic leading-relaxed text-slate-900 w-full shadow-lg relative mt-2 text-center select-none group">
                        <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-amber-50 border-t-2 border-l-2 border-amber-200 rotate-45" />
                        <button 
                          onClick={() => speakText(activeTask.quote)} 
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-lg border-2 border-indigo-200 transform scale-0 group-hover:scale-100 transition-transform hidden sm:flex cursor-pointer"
                          title="Text vorlesen"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button 
                          onClick={() => speakText(activeTask.quote)} 
                          className="w-full flex items-center gap-1.5 justify-center mb-1 text-indigo-500 font-black uppercase text-[0.5rem] bg-indigo-500/10 rounded py-1 mb-2 sm:hidden cursor-pointer"
                        >
                          <Volume2 size={12} /> Vorlesen
                        </button>
                        "{activeTask.quote}"
                      </div>
                    </div>

                    {/* Step selection path (Magischer Zauberpfad der Kobolde) */}
                    <div className="border-t border-emerald-800/40 pt-2.5 space-y-1.5 shrink-0 select-none">
                      <div className="flex items-center justify-between">
                        <span className="text-[0.5625rem] font-black text-amber-400 uppercase tracking-widest">
                          🗺️ DEIN ZAUBERPFAD:
                        </span>
                        <span className="text-[0.5625rem] font-bold text-emerald-400 bg-emerald-900/60 px-1.5 py-0.5 rounded-md">
                          {totalCorrectCount} / 20 ⭐
                        </span>
                      </div>
                      
                      {/* Compact grid of 20 levels. Tapping switches quest step */}
                      <div className="flex flex-wrap gap-1 items-center justify-center py-2 bg-emerald-950/60 rounded-xl border border-emerald-800/40 max-h-[140px] overflow-y-auto">
                        <button
                          onClick={() => { setCurrentQuestStep(0); setChildDraftAnswer(null); }}
                          className={`w-6 h-6 rounded-full text-[0.625rem] flex items-center justify-center font-bold cursor-pointer transition-all ${
                            currentQuestStep === 0 
                              ? 'bg-amber-400 text-slate-955 ring-2 ring-amber-200 scale-110' 
                              : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                          }`}
                        >
                          🎬
                        </button>

                        {new Array(20).fill(0).map((_, i) => {
                          const stepIdx = i + 1;
                          const isSolved = collectedCrystals[i];
                          const isActive = currentQuestStep === stepIdx;
                          return (
                            <button
                              key={stepIdx}
                              onClick={() => {
                                setCurrentQuestStep(stepIdx);
                                setChildDraftAnswer(null);
                                triggerAudioPlay("click");
                              }}
                              title={`Wechsle zu Quest ${stepIdx}`}
                              className={`w-6 h-6 rounded-full text-[0.625rem] flex items-center justify-center font-black transition-all cursor-pointer ${
                                isActive
                                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 scale-115 font-black shadow-md shadow-amber-500/30'
                                  : isSolved
                                    ? 'bg-emerald-600 text-white border border-emerald-400 font-bold'
                                    : 'bg-slate-900/80 text-emerald-200 hover:bg-emerald-900 font-medium'
                              }`}
                            >
                              {isSolved ? "💎" : stepIdx}
                            </button>
                          );
                        })}

                        <button
                          onClick={() => { setCurrentQuestStep(21); setChildDraftAnswer(null); }}
                          className={`w-6 h-6 rounded-full text-[0.625rem] flex items-center justify-center font-bold cursor-pointer transition-all ${
                            currentQuestStep === 21 
                              ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200 scale-110' 
                              : 'bg-emerald-950 text-slate-500 border border-slate-900 bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                          }`}
                        >
                          🏆
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* RIGHT COLUMN (Span 8): The Immersive Visual Quest Portal */}
                  <div className="md:col-span-8 flex flex-col justify-between bg-emerald-900/10 border border-emerald-800/30 p-4 rounded-3xl max-h-full overflow-y-auto">
                    
                    {/* Story backdrop intro card with gold border and clear descriptions */}
                    <div className="space-y-2 border-b border-emerald-800/30 pb-3 shrink-0 text-left font-sans">
                      <div className="flex items-center justify-between">
                        <span className="inline-block px-3 py-1 text-[0.5625rem] font-black text-slate-950 bg-amber-400 rounded-full uppercase tracking-wider shadow">
                          📚 {activeTask.categoryLabel}
                        </span>
                        {currentQuestStep > 0 && currentQuestStep <= 20 && (
                          <span className="text-[0.625rem] font-extrabold text-amber-300 italic tracking-wide">
                            Quest {currentQuestStep} / 20
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-[1rem] leading-normal sm:text-[1.125rem] leading-normal font-black text-slate-100 leading-tight">
                        ✨ {activeTask.title} ✨
                      </h3>

                      {activeTask.storyDescription && (
                        <p className="text-[0.625rem] sm:text-[0.75rem] leading-tight text-emerald-200 font-semibold italic leading-relaxed max-w-xl opacity-90 border-l-2 border-emerald-600/60 pl-2 flex items-start gap-2 relative group">
                          <span className="flex-1">{activeTask.storyDescription}</span>
                          <button 
                            onClick={() => speakText(activeTask.storyDescription)} 
                            className="w-5 h-5 shrink-0 rounded-full bg-emerald-800 hover:bg-emerald-700 text-emerald-200 flex items-center justify-center cursor-pointer transition-colors"
                            title="Story vorlesen"
                          >
                            <Volume2 size={10} />
                          </button>
                        </p>
                      )}
                    </div>

                    {/* Task question focus box */}
                    <div className="my-auto py-4 space-y-4 flex-1 flex flex-col justify-center">
                      <div className="text-center bg-slate-950/80 border-2 border-emerald-500/35 p-5 sm:p-7 rounded-[2rem] relative select-none shadow-2xl group">
                        <h4 className="text-[1rem] leading-normal sm:text-[1.25rem] leading-normal md:text-[1.5rem] leading-normal lg:text-[1.875rem] leading-tight font-black text-white leading-relaxed tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                          {activeTask.instructions}
                        </h4>
                        <button 
                          onClick={() => speakText(activeTask.instructions)} 
                          className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg border-2 border-amber-200 transform scale-0 group-hover:scale-100 transition-transform hidden sm:flex cursor-pointer"
                          title="Instruktion vorlesen"
                        >
                          <Volume2 size={14} />
                        </button>
                        <button 
                          onClick={() => speakText(activeTask.instructions)} 
                          className="w-full flex items-center gap-1.5 justify-center mt-3 text-amber-500 font-black uppercase text-[0.625rem] bg-amber-500/10 rounded py-2 sm:hidden cursor-pointer"
                        >
                          <Volume2 size={12} /> Instruktion vorlesen
                        </button>
                      </div>

                      {/* Active components custom renderer */}
                      <div className="py-1">
                        <ActiveVisualTaskRenderer
                          id={activeTask.id}
                          visualType={activeTask.visualType}
                          choices={activeTask.choices}
                          onSelect={selectAnswerDraftByChild}
                          selectedId={childDraftAnswer}
                          correctAnswerId={activeTask.correctAnswerId}
                          onLongPressChoice={speakText}
                        />
                      </div>
                    </div>

                    {/* Dynamic Graphic progress indicators bar */}
                    {currentQuestStep > 0 && currentQuestStep <= 20 && (
                      <div className="pt-2 bg-black/10 rounded-xl px-2.5 py-1 flex items-center gap-3 shrink-0 select-none">
                        <span className="text-[0.5rem] font-black text-amber-400 uppercase tracking-widest">
                          FORTSCHRITT:
                        </span>
                        <div className="flex-1 bg-slate-900 rounded-full h-2.5 border border-emerald-900/80  relative">
                          <div
                            style={{ width: `${(currentQuestStep / 20) * 100}%` }}
                            className="bg-gradient-to-r from-amber-400 to-amber-500 h-2.5 rounded-full shadow-inner transition-all duration-300"
                          />
                        </div>
                        <span className="text-[0.5625rem] font-mono text-emerald-400 font-black">
                          {Math.round((currentQuestStep / 20) * 100)}%
                        </span>
                      </div>
                    )}

                  </div>

                </div>
              )}
            </div>

            {/* Bottom Progress Frame */}
            <div className="pt-3 shrink-0 border-t border-emerald-900 flex items-center justify-between select-none">
              <span className="text-[0.5625rem] font-black text-emerald-400 uppercase tracking-widest leading-none">
                {currentQuestStep === 0 ? "Wähle einen Begleiter links, um anzufangen!" : currentQuestStep === 21 ? "Abenteuer beendet." : `Abenteuerpfad-Sektion: ${currentQuestStep} / 20`}
              </span>

              <div className="flex gap-2.5">
                <button
                  onClick={prevStep}
                  disabled={currentQuestStep === 0}
                  className="px-5 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-850 text-white font-extrabold uppercase text-[0.625rem] tracking-wider cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow"
                >
                  ◀ zurück
                </button>
                <button
                  onClick={nextStep}
                  disabled={currentQuestStep === 21}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-955 font-black uppercase text-[0.625rem] tracking-wider cursor-pointer disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 shadow-lg border-b-2 border-amber-600"
                >
                  weiter ▶
                </button>
              </div>
            </div>

          </div>
        )}

        {/* =========================================================================
            TEACHER COMPANION REMOTE CONTROL VIEW
            ========================================================================= */}
        {gabicTab === "teacher-remote" && (
          <TeacherRemoteSubView
            activeStudent={activeStudent}
            activeTask={activeTask}
            currentQuestStep={currentQuestStep}
            childDraftAnswer={childDraftAnswer}
            questObservations={questObservations}
            activeObservationText={activeObservationText}
            setActiveObservationText={setActiveObservationText}
            handleSaveObservation={handleSaveObservation}
            prevStep={prevStep}
            nextStep={nextStep}
            handlePushDiagnosticsToDb={handlePushDiagnosticsToDb}
            totalCorrectCount={totalCorrectCount}
            setCurrentQuestStep={setCurrentQuestStep}
            questTasks={questTasks}
            collectedCrystals={collectedCrystals}
            selectedGrade={selectedGrade}
            isPaused={isPaused}
            setIsPaused={setIsPaused}
          />
        )}

        {/* =========================================================================
            LIVE SPLIT SCREEN DEMO VIEW (FOR CONVENIENCE)
            ========================================================================= */}
        {gabicTab === "split-view" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            
            {/* Left Child Immersive Section */}
            <div className="gabic-game-screen bg-emerald-950 p-4 rounded-3xl border border-slate-800 flex flex-col justify-between overflow-y-auto">
              <span className="text-[0.625rem] font-black text-emerald-400 uppercase tracking-widest border-b border-emerald-900 pb-1 flex items-center justify-between">
                <span>🧒 KINDBILDSCHIRM (Tafel / Tablet)</span>
                <span className="text-amber-400 animate-pulse">● LIVE</span>
              </span>

              {isPaused ? (
                 <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 max-w-sm mx-auto animate-fade-in my-auto">
                    <h2 className="text-[1.875rem] font-black text-slate-100 uppercase tracking-widest">
                       PAUSE
                     </h2>
                     <p className="text-[0.875rem] text-slate-300 font-bold max-w-md pb-4">
                       Bitte warte auf deine Lehrperson...
                     </p>
                 </div>
              ) : (
                <div className="my-auto py-4 space-y-4">
                  <div className="text-center space-y-2 group">
                    <span className="bg-amber-500/10 text-amber-400 font-extrabold text-[0.6875rem] px-3 py-0.5 rounded-full border border-amber-500/20">
                      Quest {currentQuestStep} / 20
                    </span>
                    <h4 className="text-[0.875rem] leading-snug sm:text-[1rem] leading-normal md:text-[1.125rem] leading-normal lg:text-[1.25rem] leading-normal font-black text-white mt-3 leading-relaxed tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                      {activeTask.instructions}
                    </h4>
                    <button 
                       onClick={() => speakText(activeTask.instructions)} 
                       className="w-full flex items-center gap-1.5 justify-center mt-3 text-amber-400 font-black uppercase text-[0.625rem] bg-amber-500/10 rounded py-1 cursor-pointer"
                     >
                       <Volume2 size={12} /> Vorlesen
                    </button>
                  </div>

                  <div className="py-2 bg-slate-900 p-3 rounded-2xl border border-slate-850">
                    <ActiveVisualTaskRenderer
                      id={activeTask.id}
                      visualType={activeTask.visualType}
                      choices={activeTask.choices}
                      onSelect={selectAnswerDraftByChild}
                      selectedId={childDraftAnswer}
                      correctAnswerId={activeTask.correctAnswerId}
                      onLongPressChoice={speakText}
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-900/60 flex justify-between">
                <button onClick={prevStep} className="px-3.5 py-1.5 bg-slate-900 text-slate-400 text-[0.625rem] font-black uppercase rounded-lg">Zurück</button>
                <button onClick={nextStep} className="px-3.5 py-1.5 bg-indigo-600 text-white text-[0.625rem] font-black uppercase rounded-lg">Weiter</button>
              </div>
            </div>

            {/* Right Teacher remote companion section */}
            <div className="h-full ">
              <TeacherRemoteSubView
                activeStudent={activeStudent}
                activeTask={activeTask}
                currentQuestStep={currentQuestStep}
                childDraftAnswer={childDraftAnswer}
                questObservations={questObservations}
                activeObservationText={activeObservationText}
                setActiveObservationText={setActiveObservationText}
                handleSaveObservation={handleSaveObservation}
                prevStep={prevStep}
                nextStep={nextStep}
                handlePushDiagnosticsToDb={handlePushDiagnosticsToDb}
                totalCorrectCount={totalCorrectCount}
                setCurrentQuestStep={setCurrentQuestStep}
                questTasks={questTasks}
                collectedCrystals={collectedCrystals}
                selectedGrade={selectedGrade}
                isPaused={isPaused}
                setIsPaused={setIsPaused}
              />
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default GabicQuest;
