import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Star, Sparkles, ExternalLink, Settings, X, Plus, GripVertical, Trash2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  DndContext, closestCenter, KeyboardSensor, PointerSensor, 
  useSensor, useSensors, DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, SortableContext, sortableKeyboardCoordinates, 
  verticalListSortingStrategy, useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DEFAULT_LINKS = [
  { id: '1', label: 'Frau Mohrs Rasselbande', url: 'https://fraumohrsrasselbande.at', icon: '🦊', color: 'bg-orange-100 text-orange-600' },
  { id: '2', label: 'Lernstübchen', url: 'https://lernstuebchen-grundschule.blogspot.com/', icon: '🍃', color: 'bg-green-100 text-green-600' },
  { id: '3', label: 'Materialwelten', url: 'https://www.materialwelten.at/', icon: '📖', color: 'bg-blue-100 text-blue-600' },
  { id: '4', label: 'Ideenreise', url: 'https://ideenreise-blog.de/', icon: '💡', color: 'bg-pink-100 text-pink-600' },
  { id: '5', label: 'Zaubereinmaleins', url: 'https://www.zaubereinmaleins.de/', icon: '🪄', color: 'bg-purple-100 text-purple-600' }
];

function SortableItem({ id, item, onRemove }: { id: string, item: any, onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 p-3 bg-white border rounded-xl shadow-sm mb-2 \${isDragging ? 'border-indigo-400 opacity-80 shadow-md' : 'border-slate-200'}`}>
      <button {...attributes} {...listeners} className="text-slate-400 hover:text-slate-600 touch-none cursor-grab active:cursor-grabbing">
        <GripVertical size={18} />
      </button>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm shrink-0 \${item.color || 'bg-slate-100 text-slate-600'}`}>
        {item.icon}
      </div>
      <div className="flex-1 min-w-0">
         <p className="text-sm font-bold text-slate-800 truncate">{item.label}</p>
         <p className="text-xs text-slate-500 truncate">{item.url}</p>
      </div>
      <button onClick={() => onRemove(id)} className="text-slate-400 hover:text-rose-500 p-2 shrink-0 transition-colors">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function QuickLinksWidget() {
  const { app, updateApp } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Fallback to default links if nothing is configured
  const links = app.quickLinks !== undefined ? app.quickLinks : DEFAULT_LINKS;

  const [editLinks, setEditLinks] = useState(links);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('🔗');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditLinks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const openConfig = () => {
    setEditLinks(links);
    setIsConfigOpen(true);
    setIsOpen(false);
  };

  const saveConfig = () => {
    updateApp({ quickLinks: editLinks });
    setIsConfigOpen(false);
  };

  const handleAdd = () => {
    if (!newLabel || !newUrl) return;
    const colors = ['bg-orange-100 text-orange-600', 'bg-green-100 text-green-600', 'bg-blue-100 text-blue-600', 'bg-pink-100 text-pink-600', 'bg-purple-100 text-purple-600'];
    const rColor = colors[Math.floor(Math.random() * colors.length)];
    
    let urlToSave = newUrl;
    if (!urlToSave.startsWith('http://') && !urlToSave.startsWith('https://')) {
        urlToSave = 'https://' + urlToSave;
    }

    const newItem = {
      id: Date.now().toString(),
      label: newLabel,
      url: urlToSave,
      icon: newIcon || '🔗',
      color: rColor
    };
    
    setEditLinks([...editLinks, newItem]);
    setNewLabel('');
    setNewUrl('');
    setNewIcon('🔗');
  };

  const handleRemoveItem = (id: string) => {
    setEditLinks(editLinks.filter(item => item.id !== id));
  };

  return (
    <>
      <div 
        className="fixed bottom-6 right-6 z-40 flex flex-col items-end"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-2 mb-3 flex flex-col gap-1 min-w-[220px] max-w-[280px]"
            >
              <div className="px-3 py-2 border-b border-slate-100/50 mb-1 flex items-center justify-between">
                 <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Web-Favoriten</span>
                 <button onClick={openConfig} className="text-slate-400 hover:text-indigo-600 transition-colors p-1 rounded hover:bg-slate-100" title="Favoriten bearbeiten">
                    <Settings size={14} />
                 </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2 rounded-xl transition-all group hover:bg-slate-50 hover:shadow-sm"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm \${link.color || 'bg-slate-100 text-slate-600'} shrink-0`}>
                        {link.icon}
                      </div>
                      <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors flex-1 truncate">{link.label}</span>
                      <ExternalLink size={14} className="text-slate-300 group-hover:text-indigo-400 shrink-0" />
                    </a>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 \${isOpen ? 'bg-indigo-600 text-white shadow-indigo-200 scale-105' : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-200 hover:text-indigo-600 hover:scale-105 hover:shadow-xl'}`}>
           {isOpen ? <Sparkles size={24} /> : <Star size={24} className="fill-amber-400 text-amber-400" />}
        </button>
      </div>

      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Star className="text-amber-400 fill-amber-400" /> Web-Favoriten verwalten</h2>
              <button onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-4">
               {editLinks.length === 0 && (
                   <div className="text-center py-8 text-slate-500">Noch keine Favoriten hinzugefügt.</div>
               )}
               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                 <SortableContext items={editLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
                   {editLinks.map((item) => (
                     <SortableItem key={item.id} id={item.id} item={item} onRemove={handleRemoveItem} />
                   ))}
                 </SortableContext>
               </DndContext>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">Neuen Link hinzufügen</h3>
              <div className="flex flex-col gap-3">
                 <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={newIcon} 
                      onChange={e => setNewIcon(e.target.value)} 
                      placeholder="Emoji" 
                      className="w-16 px-3 py-2 border border-slate-200 rounded-xl text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                    <input 
                      type="text" 
                      value={newLabel} 
                      onChange={e => setNewLabel(e.target.value)} 
                      placeholder="Name der Lernseite (z.B. Anton App)" 
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                 </div>
                 <div className="flex gap-3">
                    <input 
                      type="url" 
                      value={newUrl} 
                      onChange={e => setNewUrl(e.target.value)} 
                      placeholder="URL (z.B. https://anton.app)" 
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full"
                      onKeyDown={e => { if(e.key === 'Enter') handleAdd(); }}
                    />
                    <button 
                      onClick={handleAdd}
                      disabled={!newLabel || !newUrl}
                      className="px-4 bg-indigo-100 text-indigo-700 font-bold rounded-xl hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Plus size={18} /> Hinzufügen
                    </button>
                 </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <button onClick={() => setIsConfigOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all">Abbrechen</button>
               <button onClick={saveConfig} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all">Speichern</button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
