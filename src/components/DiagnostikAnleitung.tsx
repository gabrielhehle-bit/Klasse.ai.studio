import React from 'react';
import { 
  BookOpen, 
  Brain, 
  Target, 
  Zap, 
  Gamepad2, 
  Search, 
  MessageSquare, 
  BarChart3,
  ChevronRight,
  Info,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DiagnostikAnleitungProps {
  onClose: () => void;
}

const DiagnostikAnleitung: React.FC<DiagnostikAnleitungProps> = ({ onClose }) => {
  const sections = [
    {
      id: 'lernentwicklung',
      title: 'Lernentwicklung',
      icon: <BarChart3 className="text-blue-400" />,
      description: 'Dokumentation des langfristigen Lernfortschritts.',
      guide: 'Beobachte hier die kontinuierliche Entwicklung. Es geht nicht um Einzelnoten, sondern um die Tendenz: Werden die Abstände zwischen den Erfolgen kleiner? Festigt sich das Wissen nachhaltig?',
      tips: ['Nutze die grafische Kurve für Elterngespräche.', 'Markiere besondere Meilensteine (Aha-Erlebnisse).']
    },
    {
      id: 'exekutive',
      title: 'Exekutive Funktionen',
      icon: <Brain className="text-purple-400" />,
      description: 'Die Kommandozentrale des Kopfes: Planen, Steuern, Hemmen.',
      guide: 'Hier geht es um die kognitive Kontrolle. Kann das Kind Impulse unterdrücken (Inhibition)? Kann es Informationen im Kopf behalten und damit arbeiten (Arbeitsgedächtnis)? Kann es flexibel auf neue Situationen reagieren?',
      tips: ['Achte auf "Flüchtigkeitsfehler" – oft steckt eine schwache Inhibition dahinter.', 'Gedächtnis-Rätsel helfen, das Arbeitsgedächtnis zu trainieren.']
    },
    {
      id: 'basis-check',
      title: 'Basis-Check (Klasse)',
      icon: <CheckCircle2 className="text-emerald-400" />,
      description: 'Schnell-Screening der kognitiven Basiskompetenzen.',
      guide: 'Ein Beamer-basiertes Screening für die ganze Klasse. Wir prüfen Serialität, visuelle/auditive Merkfähigkeit und Raumlage. Ideal, um zu Beginn des Schuljahres (Set A) oder zur Kontrolle (Set B/C) blinde Flecken zu finden.',
      tips: ['Achte auf die Kinder, die nach 3 Aufgaben unruhig werden.', 'Nutze die Heatmap, um Themen für die ganze Klasse zu identifizieren (z.B. Raumlage).']
    },
    {
      id: 'gabicquest',
      title: 'GabicQuest',
      icon: <Gamepad2 className="text-orange-400" />,
      description: 'Gamifizierte Diagnostik der Wahrnehmungsbereiche.',
      guide: 'Kinder spielen ein kurzes "Mini-Game". Währenddessen messen wir im Hintergrund unbemerkt Reaktionszeiten und Fehlermuster. Das nimmt den Testdruck und liefert objektive Daten.',
      tips: ['Lass die Kinder GabicQuest als "Belohnung" spielen.', 'Die Daten zeigen oft Diskrepanzen zwischen Spielleistung und Unterrichtsleistung.']
    },
    {
      id: 'detective',
      title: 'Detective / Fehlersuche',
      icon: <Search className="text-amber-400" />,
      description: 'Fokus auf visuelle Diskrimination und Ausdauer.',
      guide: 'Das Kind sucht Unterschiede in Bildern oder Zeichenfolgen. Das verrät uns viel über die visuelle Sakkaden (Augenbewegungen) und die Konzentrationsspanne unter Detail-Druck.',
      tips: ['Wichtig für die Lesediagnostik: Wer Wörter nur "errät", scheitert oft beim Detective.', 'Gute Detective-Leistung bei schlechten Noten deutet auf Motivationsprobleme hin.']
    },
    {
      id: 'interaktions-log',
      title: 'Interaktions-Log',
      icon: <MessageSquare className="text-pink-400" />,
      description: 'Dokumentation der sozialen Dynamik und Kommunikation.',
      guide: 'Notiere hier kurz und wertfrei Beobachtungen aus Gruppenarbeiten oder Pausen. Wer übernimmt Führung? Wer zieht sich zurück? Wie wird mit Konflikten umgegangen?',
      tips: ['Nutze Kürzel für schnelles Notieren.', 'Vergleiche das Log mit dem Entwicklungsdiagramm für ein ganzheitliches Bild.']
    },
    {
      id: 'metakognition',
      title: 'Metakognition',
      icon: <Zap className="text-yellow-400" />,
      description: 'Wissen über das eigene Lernen (Hattie d=0.69).',
      guide: 'Frage das Kind VOR einer Prüfung: "Wie hast du gelernt?" (Strategie). Verknüpfe das NACH der Korrektur mit dem Ergebnis. So lernt das Kind: "Ach, wenn ich Karteikarten nutze, klappt es besser als wenn ich nur lese."',
      tips: ['Es gibt kein Richtig oder Falsch bei der Strategiewahl.', 'Das Ziel ist die Selbsterkenntnis des Kindes über seine effektivsten Methoden.']
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
              <HelpCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Diagnostik-Anleitung</h2>
              <p className="text-xs text-slate-400">Was bedeuten die Module und wie setze ich sie pädagogisch ein?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-3xl p-6 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
              <Lightbulb size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-indigo-300 uppercase tracking-widest mb-1">Pädagogischer Grundsatz</h3>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                "Diagnostik ist kein Selbstzweck. Sie dient dazu, die Kinder dort abzuholen, wo sie stehen, und blinde Flecken in der Wahrnehmung durch datenbasierte Erkenntnisse zu ersetzen."
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <motion.div 
                key={section.id}
                whileHover={{ y: -4 }}
                className="bg-slate-800/40 border border-slate-700/50 rounded-[2rem] p-6 space-y-4 hover:bg-slate-800/60 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-700/30">
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-white uppercase tracking-wide text-sm">{section.title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{section.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-indigo-500/10 rounded-md text-indigo-400">
                      <BookOpen size={12} />
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      <span className="font-black text-[9px] uppercase tracking-tighter text-indigo-400 block mb-0.5">Leitfaden:</span>
                      {section.guide}
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 p-1 bg-emerald-500/10 rounded-md text-emerald-400">
                      <Zap size={12} />
                    </div>
                    <div className="flex-1">
                      <span className="font-black text-[9px] uppercase tracking-tighter text-emerald-400 block mb-1">Profi-Tipps:</span>
                      <ul className="space-y-1">
                        {section.tips.map((tip, idx) => (
                          <li key={idx} className="text-[10px] text-slate-400 flex items-center gap-2">
                            <ChevronRight size={10} className="text-slate-600" /> {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-900/80 border-t border-slate-800 flex justify-center shrink-0">
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition shadow-lg cursor-pointer"
          >
            Verstanden, los geht's!
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DiagnostikAnleitung;
