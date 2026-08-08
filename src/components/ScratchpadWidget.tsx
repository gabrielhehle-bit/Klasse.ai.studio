import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { StickyNote, Save, Check } from 'lucide-react';

export default function ScratchpadWidget() {
  const { app, updateApp } = useApp();
  const [text, setText] = useState(app.wochenNotizen || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(app.wochenNotizen || '');
  }, [app.wochenNotizen]);

  const handleSave = () => {
    updateApp({ wochenNotizen: text });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-amber-100/50 p-5 rounded-2xl border border-amber-200/60 shadow-sm relative overflow-hidden group">
       <div className="absolute top-0 right-4 w-12 h-4 bg-amber-200/50 -translate-y-1/2 rounded-full shadow-inner rotate-3"></div>
       <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-amber-900 flex items-center gap-2"><StickyNote size={18} className="text-amber-500" /> Schmierzettel</h3>
          <button 
             onClick={handleSave} 
             title="Speichern"
             className={`p-1.5 rounded-lg transition-all ${saved ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-200/50 text-amber-700 hover:bg-amber-300'}`}
          >
             {saved ? <Check size={16} /> : <Save size={16} />}
          </button>
       </div>
       <textarea 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ideen, Gedanken, Erinnerungen..."
          className="w-full h-40 bg-transparent resize-none outline-none text-amber-900 font-medium placeholder:text-amber-700/40 text-sm leading-relaxed"
          onBlur={handleSave}
       />
    </div>
  );
}
