import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Plus, Edit2, Trash2, CheckCircle2, ChevronRight, Bookmark } from 'lucide-react';
import { DifferenzierungsGruppe } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const EMOJIS = ['📚', '🔢', '🎨', '⚽', '🌱', '⭐', '💡', '🔬', '🎵', '✏️', '🧩', '🏆'];
const FARBEN = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500'
];

export default function FesteGruppen() {
  const { app, setApp } = useApp();
  const gruppen = app.differenzierungsGruppen || [];
  const schueler = app.schueler || [];

  const [editingGroup, setEditingGroup] = useState<DifferenzierungsGruppe | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleCreate = () => {
    setEditingGroup({
      id: Date.now().toString(),
      name: '',
      farbe: FARBEN[0],
      emoji: EMOJIS[0],
      schuelerIds: [],
      beschreibung: '',
      erstellt: new Date().toISOString(),
      zuletzt: new Date().toISOString()
    });
    setIsFormOpen(true);
  };

  const handleEdit = (g: DifferenzierungsGruppe) => {
    setEditingGroup({ ...g });
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Gruppe wirklich löschen?')) {
      setApp(prev => ({
        ...prev,
        differenzierungsGruppen: (prev.differenzierungsGruppen || []).filter(g => g.id !== id)
      }));
    }
  };

  const handleSave = () => {
    if (!editingGroup || !editingGroup.name.trim()) return;

    setApp(prev => {
      const exists = (prev.differenzierungsGruppen || []).find(g => g.id === editingGroup.id);
      let newGruppen;
      const finalGroup = { ...editingGroup, zuletzt: new Date().toISOString() };
      
      if (exists) {
        newGruppen = (prev.differenzierungsGruppen || []).map(g => g.id === finalGroup.id ? finalGroup : g);
      } else {
        newGruppen = [...(prev.differenzierungsGruppen || []), finalGroup];
      }
      return { ...prev, differenzierungsGruppen: newGruppen };
    });
    
    setIsFormOpen(false);
    setEditingGroup(null);
  };

  const toggleStudent = (sId: string) => {
    if (!editingGroup) return;
    setEditingGroup(prev => {
      if (!prev) return prev;
      const ids = prev.schuelerIds.includes(sId)
        ? prev.schuelerIds.filter(id => id !== sId)
        : [...prev.schuelerIds, sId];
      return { ...prev, schuelerIds: ids };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* LINKE SEITE: Liste */}
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col">
            <h3 className="text-[1.125rem] leading-normal font-black text-slate-900">Gespeicherte Gruppen</h3>
            <span className="text-[0.75rem] leading-tight text-slate-400 font-bold uppercase tracking-widest">{gruppen.length} Filtergruppen</span>
          </div>
          <button onClick={handleCreate} className="px-4 py-3 bg-purple-600 text-white rounded-2xl text-[0.75rem] leading-tight font-black flex items-center gap-2 hover:bg-purple-700 transition">
            <Plus size={16} /> <span className="hidden sm:inline">Neue Gruppe</span>
          </button>
        </div>

        <div className="space-y-4">
          {gruppen.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-400">
              <Bookmark size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Keine Gruppen gespeichert.</p>
              <p className="text-[0.75rem] leading-tight mt-2">Lege feste Fördergruppen oder Teilungen an.</p>
            </div>
          ) : (
            gruppen.map((g) => (
              <div key={g.id} className="bg-white border text-left border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between hover:shadow-md transition">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-[1.5rem] leading-normal text-white shadow-inner ${g.farbe}`}>
                    {g.emoji}
                  </div>
                  <div>
                    <h4 className="text-[1.125rem] leading-normal font-black text-slate-900">{g.name}</h4>
                    <p className="text-[0.875rem] leading-snug font-bold text-slate-400">{g.schuelerIds.length} Schüler/innen</p>
                    {g.beschreibung && <p className="text-[0.75rem] leading-tight text-slate-500 mt-1">{g.beschreibung}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(g)} className="p-3 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(g.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RECHTE SEITE: Editor (oder Platzhalter) */}
      <AnimatePresence mode="wait">
        {isFormOpen && editingGroup ? (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-slate-100 rounded-3xl p-8 shadow-xl"
          >
            <h3 className="text-[1.25rem] leading-normal font-black text-slate-900 mb-8">{editingGroup.name ? 'Gruppe bearbeiten' : 'Neue Gruppe'}</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Name der Gruppe</label>
                <input 
                  type="text" 
                  value={editingGroup.name}
                  onChange={e => setEditingGroup({...editingGroup, name: e.target.value})}
                  className="input-field py-4 font-bold text-[1.125rem] leading-normal"
                  placeholder="z.B. Leseförderung"
                  autoFocus
                />
              </div>

              <div className="space-y-4">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Symbol & Farbe</label>
                
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                  {EMOJIS.map(e => (
                    <button 
                      key={e}
                      onClick={() => setEditingGroup({...editingGroup, emoji: e})}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-[1.25rem] leading-normal transition-all ${editingGroup.emoji === e ? 'bg-slate-900 border-2 border-slate-900' : 'bg-slate-50 border border-slate-100 hover:bg-slate-100'}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {FARBEN.map(f => (
                    <button 
                      key={f}
                      onClick={() => setEditingGroup({...editingGroup, farbe: f})}
                      className={`w-8 h-8 rounded-full shadow-inner transition-all ${f} ${editingGroup.farbe === f ? 'ring-4 ring-slate-900/20 scale-110' : 'hover:scale-110'}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">Beschreibung (optional)</label>
                <input 
                  type="text" 
                  value={editingGroup.beschreibung || ''}
                  onChange={e => setEditingGroup({...editingGroup, beschreibung: e.target.value})}
                  className="input-field py-3 text-[0.875rem] leading-snug"
                  placeholder="Kurze Info..."
                />
              </div>

              <div className="space-y-2 border-t border-slate-100 pt-6">
                <label className="text-[0.625rem] font-black uppercase tracking-[0.2em] text-slate-400">
                  Schüler/innen wählen ({editingGroup.schuelerIds.length})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto no-scrollbar pb-6 mt-4">
                  {schueler.map((s) => {
                    const isSelected = editingGroup.schuelerIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleStudent(s.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isSelected ? 'bg-indigo-50 border-indigo-200 text-indigo-900' : 'bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="font-bold text-[0.875rem] leading-snug tracking-tight">{s.vorname} {s.nachname}</div>
                        {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-100">
                <button
                  onClick={() => {setIsFormOpen(false); setEditingGroup(null);}}
                  className="flex-1 py-4 text-[0.75rem] leading-tight font-black uppercase bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  className="flex-[2] py-4 text-[0.75rem] leading-tight font-black uppercase bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition shadow-lg disabled:opacity-50"
                  disabled={!editingGroup.name.trim()}
                >
                  Speichern
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="hidden lg:flex items-center justify-center bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-400 h-[600px]">
            <div>
              <Users size={64} className="mx-auto mb-6 opacity-20" />
              <p className="font-bold text-[1.125rem] leading-normal">Wähle oder erstelle eine Gruppe</p>
              <p className="text-[0.875rem] leading-snug mt-2">Detaillierte Einstellungen werden hier angezeigt.</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
