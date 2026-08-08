import React, { useState, useRef, useEffect } from 'react';
import { askAI } from '../services/aiService';
import { MessageSquareHeart, X, Send, Sparkles, BrainCircuit } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PlannerChatWidget({ kwData, nextKW }: { kwData: any, nextKW: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([
      { role: 'assistant', text: `Hey! Ich habe mir deinen Plan für KW ${nextKW} angesehen. Was möchtest du besprechen oder anpassen?` }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
     if (scrollRef.current) {
         scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }
  }, [messages, isTyping]);

  const handleSend = async () => {
     if (!input.trim()) return;
     const userText = input.trim();
     setMessages(prev => [...prev, { role: 'user', text: userText }]);
     setInput('');
     setIsTyping(true);

     // Build context
     const context = `Wochenplan KW ${nextKW}: ${JSON.stringify(kwData)}`;
     
     const prompt = `Du bist ein pädagogischer Assistent, integriert in den Wochenplan (Planungszentrale) einer Lehrkraft.
Lies den aktuellen Plan der Lehrkraft im Kontext und beantworte ihre Frage hilfreich, prägnant und freundlich.
Mache konkrete Vorschläge zur Verbesserung, Methodik oder Zeitersparnis.

KONTEXT: ${context}
FRAGE: ${userText}`;

     try {
         const resp = await askAI(prompt, "Du antwortest prägnant und freundlich. Nutze Bulletpoints für Struktur.");
         setMessages(prev => [...prev, { role: 'assistant', text: resp.trim() }]);
     } catch(e) {
         setMessages(prev => [...prev, { role: 'assistant', text: "Leider gab es ein kurzes Rauschen in meinen Synapsen. Bitte versuche es noch einmal." }]);
     } finally {
         setIsTyping(false);
     }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 bg-indigo-600 text-white shadow-indigo-200 hover:scale-105 hover:bg-indigo-700 ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
        title="KI-Assistent für den Wochenplan"
      >
         <MessageSquareHeart size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
           <motion.div 
             initial={{ opacity: 0, y: 20, scale: 0.95 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 20, scale: 0.95 }}
             className="fixed bottom-24 right-6 z-50 w-[350px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
             style={{ height: '500px', maxHeight: '80vh' }}
           >
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 shrink-0 flex items-center justify-between shadow-md relative z-10">
                 <div className="flex items-center gap-2 text-white">
                    <BrainCircuit size={20} />
                    <span className="font-bold text-sm">Wochenplan-KI</span>
                 </div>
                 <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors">
                    <X size={18} />
                 </button>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
                 {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none'}`}>
                            {m.role === 'assistant' && i === 0 && <Sparkles size={14} className="text-indigo-400 mb-1" />}
                            <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                        </div>
                    </div>
                 ))}
                 {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-1.5 h-10 w-16 justify-center">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1.5 h-1.5 bg-indigo-300 rounded-full" />
                        </div>
                    </div>
                 )}
              </div>

              <div className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
                  <input 
                     type="text" 
                     value={input}
                     onChange={e => setInput(e.target.value)}
                     onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                     placeholder="Frag etwas zum Plan..."
                     className="flex-1 text-sm bg-slate-100 text-slate-800 rounded-full px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button 
                     onClick={handleSend}
                     disabled={!input.trim() || isTyping}
                     className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 shrink-0 shadow-sm"
                  >
                      <Send size={16} className="-ml-0.5" />
                  </button>
              </div>
           </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
