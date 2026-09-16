import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  PanelLeft,
  Presentation,
  Sparkles,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';

const INTRO_STEPS = [
  {
    eyebrow: 'Willkommen',
    title: 'Klassio passt sich dir an.',
    text: 'Du musst keine neue Arbeitsweise lernen. Nach der Anmeldung startest du im Dashboard und kannst Klassio Schritt für Schritt so einrichten, wie du es im Schulalltag brauchst.',
    icon: Sparkles,
    points: [
      'Dashboard als ruhiger Startpunkt',
      'Bestehende Funktionen bleiben erreichbar',
      'Du entscheidest selbst, was sichtbar ist',
    ],
  },
  {
    eyebrow: 'Deine Navigation',
    title: 'Die Sidebar gehört dir.',
    text: 'Unter „Anpassen“ blendest du Module ein oder aus und verschiebst sie innerhalb ihrer Bereiche in deine persönliche Reihenfolge.',
    icon: PanelLeft,
    points: [
      'Wichtige Werkzeuge nach vorne holen',
      'Selten Benötigtes ausblenden',
      'Deine Auswahl wird gespeichert',
    ],
  },
  {
    eyebrow: 'Lehrercockpit',
    title: 'Eine freie Fläche für deinen Unterricht.',
    text: 'Die weiße Unterrichtsfläche bleibt frei. Widgets kannst du jederzeit öffnen und direkt am Kopf an die passende Stelle ziehen. Schreiben und Zeichnen bleibt auf derselben Fläche möglich.',
    icon: Presentation,
    points: [
      'Widgets jederzeit verschiebbar',
      'Schreiben, Zeichnen und Widgets gemeinsam',
      'Keine vorgegebenen Beispiel-Widgets',
    ],
  },
  {
    eyebrow: 'Los geht’s',
    title: 'Starte mit dem, was du heute brauchst.',
    text: 'Du musst Klassio nicht vollständig einrichten, bevor du arbeiten kannst. Beginne im Dashboard und passe den Rest später an.',
    icon: LayoutDashboard,
    points: [
      'Nach dem Login direkt zum Dashboard',
      'Setup nur dann öffnen, wenn du es brauchst',
      'Alles Weitere lässt sich später ändern',
    ],
  },
] as const;

export default function InitialModeModal() {
  const { app, setApp } = useApp();
  const [currentStep, setCurrentStep] = React.useState(0);

  if (!app.firstLogin) return null;

  const step = INTRO_STEPS[currentStep];
  const StepIcon = step.icon;
  const isLastStep = currentStep === INTRO_STEPS.length - 1;

  const finishIntro = () => {
    setApp(prev => ({
      ...prev,
      firstLogin: false,
      tourAbgeschlossen: true,
      currentPage: 'dashboard',
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="klassio-first-run-title"
    >
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl"
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-500" />

        <button
          type="button"
          onClick={finishIntro}
          className="absolute right-4 top-4 z-20 inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="Einführung überspringen"
        >
          <span className="hidden sm:inline">Überspringen</span>
          <X size={16} />
        </button>

        <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[0.82fr_1.18fr]">
          <div className="flex flex-col justify-between bg-slate-950 p-7 text-white sm:p-9">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.18em] text-white/80">
                <Sparkles size={13} />
                Erste Schritte
              </div>
              <div className="space-y-3">
                <p className="text-sm font-semibold text-white/55">Klassio</p>
                <h2 className="max-w-xs text-3xl font-black leading-tight tracking-tight">
                  Weniger umlernen. Mehr selbst bestimmen.
                </h2>
                <p className="max-w-sm text-sm font-medium leading-relaxed text-white/60">
                  Vier kurze Schritte zeigen dir nur das, was du für den Einstieg wirklich brauchst.
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex gap-2">
                {INTRO_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-10 bg-white'
                        : index < currentStep
                          ? 'w-5 bg-emerald-400'
                          : 'w-5 bg-white/20'
                    }`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="text-xs font-bold text-white/45">
                Schritt {currentStep + 1} von {INTRO_STEPS.length}
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between p-7 pt-16 sm:p-10 sm:pt-16">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-7"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <StepIcon size={27} />
              </div>

              <div className="space-y-3">
                <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-indigo-600">
                  {step.eyebrow}
                </p>
                <h3
                  id="klassio-first-run-title"
                  className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl"
                >
                  {step.title}
                </h3>
                <p className="text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                  {step.text}
                </p>
              </div>

              <div className="space-y-3">
                {step.points.map(point => (
                  <div key={point} className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="mt-10 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-0"
              >
                <ChevronLeft size={17} />
                Zurück
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isLastStep) {
                    finishIntro();
                  } else {
                    setCurrentStep(prev => Math.min(INTRO_STEPS.length - 1, prev + 1));
                  }
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-[0.98]"
              >
                {isLastStep ? 'Zum Dashboard' : 'Weiter'}
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
