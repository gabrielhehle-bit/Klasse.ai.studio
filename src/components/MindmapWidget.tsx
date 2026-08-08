import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimationControls } from 'motion/react';
import { Plus, Trash2, Network, Sparkles, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UNTERRICHTSMODUS_THEMES } from '../lib/unterrichtsmodusThemes';

interface MapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

export default function MindmapWidget({ widgetId }: { widgetId?: string }) {
  const { app, setApp } = useApp();
  const [inputText, setInputText] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Extract dynamic theme settings
  const currentThemeId = app.unterrichtsmodus_theme || app.theme || 'classic_light';
  const currentTheme = UNTERRICHTSMODUS_THEMES[currentThemeId] || UNTERRICHTSMODUS_THEMES.classic_light;

  // Initialize with widget metadata or defaults
  const widgetMeta = widgetId ? (app.boardWidgets || []).find(w => w.id === widgetId)?.meta : null;
  const initialNodes = widgetMeta?.nodes || [
    { id: 'root', text: 'Neues Thema', x: 250, y: 150, color: 'bg-indigo-500' }
  ];
  
  const [nodes, setNodes] = useState<MapNode[]>(initialNodes);

  const colors = [
    'bg-[#6366f1]', 'bg-[#f43f5e]', 'bg-[#10b981]', 
    'bg-[#f59e0b]', 'bg-[#06b6d4]', 'bg-[#d946ef]'
  ];

  // Sync to global app state to persist within the lesson
  useEffect(() => {
    if (!widgetId) return;
    
    // Debounce state updates to avoid too many renders when dragging
    const timeout = setTimeout(() => {
      setApp((prev: any) => {
        const bd = prev.boardWidgets || [];
        return {
          ...prev,
          boardWidgets: bd.map((w: any) => w.id === widgetId ? { ...w, meta: { ...w.meta, nodes } } : w)
        };
      });
    }, 500);
    
    return () => clearTimeout(timeout);
  }, [nodes, widgetId, setApp]);

  const addNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    
    const container = containerRef.current;
    let centerX = 150;
    let centerY = 120;
    
    if (container) {
      centerX = container.clientWidth / 2 - 50 + (Math.random() * 40 - 20);
      centerY = container.clientHeight / 2 - 20 + (Math.random() * 40 - 20);
    }
    
    setNodes([...nodes, {
      id: Date.now().toString(),
      text: inputText,
      x: centerX,
      y: centerY,
      color: colors[nodes.length % colors.length]
    }]);
    setInputText('');
  };

  const removeNode = (id: string) => {
    setNodes(nodes.filter(n => n.id !== id));
  };
  
  const handleDragEnd = (id: string, info: any) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          x: n.x + info.offset.x,
          y: n.y + info.offset.y
        };
      }
      return n;
    }));
  };

  return (
    <div className="w-full h-full rounded-[2rem]  relative flex flex-col font-sans bg-transparent">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      
      {/* Header bar */}
      <div 
        className="px-6 py-4 border-b flex items-center justify-between z-10 shrink-0"
        style={{ borderColor: currentTheme.colors.border, backgroundColor: `${currentTheme.colors.accent}05` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: `${currentTheme.colors.accent}15`, color: currentTheme.colors.accent }}>
            <Network size={20} strokeWidth={2.5} />
          </div>
          <h2 className="text-[1.25rem] leading-normal font-black tracking-widest uppercase" style={{ color: currentTheme.colors.textPrimary }}>Brainstorming</h2>
        </div>
        
        <form onSubmit={addNode} className="flex gap-2">
          <input
            type="text"
            placeholder="Neuer Begriff..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="px-4 py-2 rounded-xl text-[0.875rem] leading-snug outline-none transition-colors w-48 font-semibold shadow-inner border"
            style={{ backgroundColor: `${currentTheme.colors.textPrimary}08`, borderColor: currentTheme.colors.border, color: currentTheme.colors.textPrimary }}
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center justify-center text-white w-10 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: currentTheme.colors.accent }}
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        </form>
      </div>
      
      {/* Interactive Map Area */}
      <div ref={containerRef} className="flex-1 min-h-0 relative  w-full h-full touch-none select-none">
        {nodes.map(node => (
          <motion.div
            key={node.id}
            drag
            dragMomentum={false}
            onDragEnd={(e, info) => handleDragEnd(node.id, info)}
            initial={{ x: node.x, y: node.y, scale: 0, opacity: 0 }}
            animate={{ x: node.x, y: node.y, scale: 1, opacity: 1 }}
            className="absolute flex items-center justify-center p-4 rounded-2xl cursor-grab active:cursor-grabbing shadow-lg border min-w-[120px] max-w-[200px] text-center group border-black/10"
            style={{ touchAction: 'none', backgroundColor: node.color.replace('bg-', '') }} // Crucial for smartboards!
            onPointerDown={(e) => e.stopPropagation()} // Prevent widget drag overlap
          >
            <span className="font-black text-white text-[1.125rem] leading-normal tracking-tight break-words">{node.text}</span>
            
            {/* Delete button appears on hover */}
            {nodes.length > 1 && (
              <button 
                onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                className="absolute -top-2 -right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity border"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border, color: currentTheme.colors.textSecondary }}
              >
                <X size={12} strokeWidth={3} />
              </button>
            )}
          </motion.div>
        ))}
        
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
            <Sparkles size={48} className="mb-4 opacity-50" style={{ color: currentTheme.colors.accent }} />
            <p className="font-bold text-[1.125rem] leading-normal" style={{ color: currentTheme.colors.textPrimary }}>Keine Karten auf dem Board.</p>
            <p className="text-[0.875rem] leading-snug" style={{ color: currentTheme.colors.textSecondary }}>Füge oben Begriffe hinzu.</p>
          </div>
        )}
      </div>
    </div>
  );
}
