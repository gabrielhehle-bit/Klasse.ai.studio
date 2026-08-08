import { useApp } from "../context/AppContext";
import { Tldraw, useEditor } from 'tldraw';
import 'tldraw/tldraw.css';
import { useState, useCallback, useEffect, useRef } from "react";
import { 
  Lock, 
  Unlock, 
  Settings2,
  X,
  Lightbulb,
  PanelTop,
  Palette,
  AlignJustify,
  Grid3X3,
  Square,
  Minus,
  Plus,
  RefreshCw,
  Trash2,
  Download,
  Volume2,
  VolumeX,
  Type,
  PenTool,
  Book,
  FileText,
  Rows,
  ListTodo,
  Columns,
  Zap,
  Activity,
  Layout
} from "lucide-react";

/**
 * Notepad View with custom patterns (Lines, Grid, etc.)
 */
function NotepadView({ isLocked }: { isLocked: boolean }) {
  const { app, setApp } = useApp();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const text = app.whiteboardText || "";
  const bgType = app.boardSettings?.notepadBackground || "grid";

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setApp(prev => ({ ...prev, whiteboardText: e.target.value }));
  };

  // Pattern Styles
  const getPatternClass = () => {
    switch (bgType) {
      case 'lines': return 'bg-lines';
      case 'grid': return 'bg-grid';
      case 'squares': return 'bg-squares';
      case 'checklist': return 'bg-checklist';
      default: return 'bg-white';
    }
  };

  return (
    <div className={`w-full h-full p-12 overflow-auto custom-scrollbar bg-white ${getPatternClass()}`}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        readOnly={isLocked}
        placeholder="Hier tippen..."
        className="w-full h-full min-h-[80vh] bg-transparent border-none outline-none resize-none font-medium text-slate-800 text-lg leading-[2.5rem] tracking-wide placeholder-slate-300"
        style={{ 
          fontSize: '1.25rem',
          lineHeight: '2.5rem'
        }}
      />
    </div>
  );
}

/**
 * Clean Whiteboard Overlay that integrates with the Smartboard Fusion Mode.
 */
function WhiteboardUI({ 
  isLocked, setIsLocked,
  isSpotlight, setIsSpotlight,
  isShade, setIsShade,
  isInteractive
}: { 
  isLocked: boolean, setIsLocked: (l: boolean) => void,
  isSpotlight: boolean, setIsSpotlight: (l: boolean) => void,
  isShade: boolean, setIsShade: (l: boolean) => void,
  isInteractive: boolean
}) {
  const editor = useEditor();
  const { app, setApp } = useApp();
  const [showTools, setShowTools] = useState(true);
  const [showPaperSettings, setShowPaperSettings] = useState(false);
  const [tplName, setTplName] = useState("");

  const boardMode = app.boardSettings?.boardMode || "whiteboard";
  
  // Sync readonly state with Tldraw internal state
  useEffect(() => {
    if (editor) {
      editor.updateInstanceState({ isReadonly: isLocked || !isInteractive });
    }
  }, [isLocked, isInteractive, editor]);

  const activePaperType = app.boardSettings?.paperType || "blank";
  const activePaperSize = app.boardSettings?.paperSize || 40;
  const notepadBg = app.boardSettings?.notepadBackground || "grid";

  const setPaperType = (type: string) => {
    setApp((p: any) => ({
      ...p,
      boardSettings: { ...p.boardSettings, paperType: type }
    }));
  };

  const setNotepadBg = (bg: string) => {
    setApp((p: any) => ({
      ...p,
      boardSettings: { ...p.boardSettings, notepadBackground: bg }
    }));
  };

  const setBoardMode = (mode: 'text' | 'whiteboard') => {
    setApp((p: any) => ({
       ...p,
       boardSettings: { ...p.boardSettings, boardMode: mode }
    }));
  };

  const adjustPaperSize = (delta: number) => {
    setApp((p: any) => ({
      ...p,
      boardSettings: { 
        ...p.boardSettings, 
        paperSize: Math.max(15, Math.min(100, (p.boardSettings.paperSize || 40) + delta)) 
      }
    }));
  };

  const toggleGrid = () => {
    if (editor) {
      editor.updateInstanceState({ isGridMode: !editor.getInstanceState().isGridMode });
    }
  };

  const handleExportTafelbild = async () => {
    if (!editor) return;
    const shapeIds = Array.from(editor.getCurrentPageShapeIds());
    if (shapeIds.length === 0) return;
    const svg = await (editor as any).getSvg(shapeIds);
    if (!svg) return;
    const svgString = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Tafelbild_${new Date().toISOString().split('T')[0]}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTemplate = (name: string) => {
    if (!name.trim()) return;
    const newTpl = {
      id: "tpl-" + Date.now(),
      title: name,
      paperType: activePaperType,
      paperSize: activePaperSize,
      boardData: editor?.getSnapshot(),
    };
    setApp((prev: any) => ({
      ...prev,
      savedBoardTemplates: [...(prev.savedBoardTemplates || []), newTpl],
    }));
    setTplName("");
  };

  const handleLoadTemplate = (tpl: any) => {
    setApp((prev: any) => ({
      ...prev,
      boardSettings: {
        ...prev.boardSettings,
        paperType: tpl.paperType,
        paperSize: tpl.paperSize,
      }
    }));
    if (editor && tpl.boardData) {
      editor.loadSnapshot(tpl.boardData);
    }
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setApp((prev: any) => ({
      ...prev,
      savedBoardTemplates: prev.savedBoardTemplates.filter((t: any) => t.id !== id),
    }));
  };

  const savedTemplates = app.savedBoardTemplates || [];

  return (
    <>
      <div className="absolute top-3 left-3 z-[100000] flex items-center gap-2 pointer-events-auto bg-slate-950/90 backdrop-blur-3xl p-1.5 rounded-2xl border border-white/15 shadow-2xl">
        <button
          onPointerDown={(e) => { e.preventDefault(); setShowTools(!showTools); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm active:scale-95 cursor-pointer ${showTools ? 'bg-orange-600 border-orange-400 text-white shadow-orange-900/20' : 'bg-slate-900 border-white/10 text-white/40 hover:text-white'}`}
          title={showTools ? "Menü minimieren" : "Werkzeuge anzeigen"}
        >
          <Palette size={20} strokeWidth={2.5} />
        </button>

        <button
          style={{ zIndex: 999999, position: 'relative' }}
          onPointerDown={(e) => { e.preventDefault(); setShowPaperSettings(!showPaperSettings); }}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border shadow-sm active:scale-95 cursor-pointer ${showPaperSettings ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/20' : 'bg-slate-900 border-white/10 text-white/40 hover:text-white'}`}
          title="Einstellungen (Stift)"
        >
          <PenTool size={20} strokeWidth={2.5} />
        </button>
          
        {showTools && (
          <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
            <div className="w-px h-8 bg-white/10 mx-1" />
            
            {/* Mode Toggle */}
            <div className="flex bg-black/60 rounded-xl p-1 border border-white/10">
                <button 
                  onPointerDown={(e) => { e.preventDefault(); setBoardMode('whiteboard'); }}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${boardMode === 'whiteboard' ? 'bg-white text-slate-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                  title="Whiteboard Modus"
                >
                  <PenTool size={18} strokeWidth={2.5} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); setBoardMode('text'); }}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${boardMode === 'text' ? 'bg-white text-slate-950 shadow-lg' : 'text-white/40 hover:text-white'}`}
                  title="Text Modus (Notizfeld)"
                >
                  <Type size={18} strokeWidth={2.5} />
                </button>
            </div>

            <div className="w-px h-8 bg-white/10 mx-1" />

            <button 
              onPointerDown={(e) => { e.preventDefault(); setIsSpotlight(!isSpotlight); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${isSpotlight ? 'bg-amber-500 border-amber-300 text-amber-950 shadow-sm' : 'bg-black/30 border-white/10 text-white/50 hover:text-white'}`}
              title="Spotlight"
            >
              <Zap size={20} strokeWidth={2.5} />
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); setIsShade(!isShade); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${isShade ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm' : 'bg-black/30 border-white/10 text-white/50 hover:text-white'}`}
              title="Vorhang"
            >
              <Activity size={20} strokeWidth={2.5} />
            </button>
            <button 
              onPointerDown={(e) => { e.preventDefault(); setIsLocked(!isLocked); }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border cursor-pointer ${isLocked ? 'bg-rose-600 border-rose-400 text-white shadow-sm' : 'bg-black/30 border-white/10 text-white/50 hover:text-white'}`}
              title={isLocked ? "Sperre" : "Frei"}
            >
              {isLocked ? <Lock size={20} strokeWidth={2.5} /> : <Unlock size={20} strokeWidth={2.5} />}
            </button>
          </div>
        )}

        {showPaperSettings && (
          <div className="absolute top-[4.5rem] left-0 z-[100001] flex items-center gap-3 p-2 bg-slate-950/95 backdrop-blur-3xl border border-white/15 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 pointer-events-auto min-w-max">
            
            {boardMode === 'whiteboard' ? (
              <>
                {/* Whiteboard Background Choice */}
                <div className="flex gap-1 bg-black/60 rounded-lg p-1 border border-white/5">
                  {[
                    { type: "blank", color: "#a1a132", icon: Square, label: "Blanko" },
                    { type: "lined", color: "#080808", icon: AlignJustify, label: "Linien" },
                    { type: "squared", color: "#1111e1", icon: Grid3X3, label: "Kariert" },
                    { type: "writing-lines", color: "#ff0000", icon: PanelTop, label: "Schreibzeilen" }
                  ].map(({ type, color, icon: Icon, label }) => (
                    <button
                      key={type}
                      onPointerDown={(e) => { e.preventDefault(); setPaperType(type); }}
                      className={`w-8 h-8 rounded flex items-center justify-center transition-all ${activePaperType === type ? "ring-2 ring-white scale-110 shadow-lg" : "opacity-40 hover:opacity-100"}`}
                      style={{ backgroundColor: color }}
                      title={label}
                    >
                      <Icon size={14} strokeWidth={2.5} className="text-white" />
                    </button>
                  ))}
                </div>

                <div className="w-px h-5 bg-white/10" />

                {/* Grid toggle */}
                <button 
                  onPointerDown={(e) => { e.preventDefault(); toggleGrid(); }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${editor.getInstanceState().isGridMode ? 'bg-amber-500 border-amber-300 text-stone-900 shadow-sm' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                  title="Hilfsraster ein/aus"
                >
                  <RefreshCw size={14} strokeWidth={3} />
                </button>

                <div className="w-px h-5 bg-white/10" />

                {/* Size control (Pattern density) */}
                <div className="flex items-center bg-black/80 rounded-lg border border-white/10 overflow-hidden font-mono">
                  <button 
                    onPointerDown={(e) => { e.preventDefault(); adjustPaperSize(-5); }}
                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                  >
                    <Minus size={12} strokeWidth={4} />
                  </button>
                  <div className="w-9 h-7 flex items-center justify-center text-[11px] font-black text-emerald-400 bg-black/20 min-w-[24px]">
                    {activePaperSize}
                  </div>
                  <button 
                    onPointerDown={(e) => { e.preventDefault(); adjustPaperSize(5); }}
                    className="w-7 h-7 flex items-center justify-center hover:bg-white/10 text-white/30 hover:text-white transition-colors"
                  >
                    <Plus size={12} strokeWidth={4} />
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Notepad Background Choice */}
                <div className="flex gap-1 bg-black/60 rounded-lg p-1 border border-white/5">
                  {[
                    { id: 'empty', icon: Square, label: 'Leer' },
                    { id: 'lines', icon: Rows, label: 'Linien' },
                    { id: 'grid', icon: Grid3X3, label: 'Kariert' },
                    { id: 'squares', icon: Columns, label: 'Häuschen' },
                    { id: 'checklist', icon: ListTodo, label: 'Checkliste' }
                  ].map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      onPointerDown={(e) => { e.preventDefault(); setNotepadBg(id); }}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border ${notepadBg === id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg scale-110' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10'}`}
                      title={label}
                    >
                      <Icon size={14} strokeWidth={2.5} />
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="w-px h-5 bg-white/10" />

            {/* Combined Reset & Export row */}
            <div className="flex items-center gap-2">
              {boardMode === 'whiteboard' && (
                <button
                  onPointerDown={(e) => { e.preventDefault(); handleExportTafelbild(); }}
                  className="h-8 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] font-black uppercase text-white/50 transition-all hover:text-white"
                >
                  SVG Export
                </button>
              )}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  if(window.confirm("Alles auf dieser Fläche löschen?")) {
                    if (boardMode === 'whiteboard') {
                      const ids = Array.from(editor?.getCurrentPageShapeIds() || []);
                      if (ids.length > 0) editor?.deleteShapes(ids);
                    } else {
                      setApp(p => ({ ...p, whiteboardText: "" }));
                    }
                  }
                }}
                className="h-8 px-3 bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-rose-400 hover:text-white font-black rounded-lg text-[9px] uppercase transition-all"
              >
                Reset
              </button>
            </div>

            {boardMode === 'whiteboard' && (
              <>
                <div className="w-px h-5 bg-white/10" />
                {/* Templates Row Compact */}
                <div className="flex items-center gap-2 overflow-hidden">
                   <input
                      type="text"
                      placeholder="Name..."
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="w-20 h-8 bg-black border border-white/10 rounded px-2 text-[10px] text-white placeholder-white/20 outline-none focus:border-orange-500/50"
                    />
                    <button
                      onPointerDown={(e) => { e.preventDefault(); handleSaveTemplate(tplName); }}
                      className="h-8 px-3 bg-orange-600 hover:bg-orange-500 text-white font-black rounded text-[9px] uppercase"
                    >
                      Save
                    </button>
                    {savedTemplates.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto max-w-[150px] custom-scrollbar px-1">
                        {savedTemplates.map((tpl: any) => (
                          <div
                            key={tpl.id}
                            onPointerDown={(e) => { e.preventDefault(); handleLoadTemplate(tpl); }}
                            className="shrink-0 flex items-center gap-1.5 px-2 h-6 rounded bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <span className="text-[10px] font-bold truncate max-w-[60px] text-white/80">{tpl.title}</span>
                            <X size={10} className="text-white/20 hover:text-red-500 transition-colors" onPointerDown={(e) => { e.preventDefault(); handleDeleteTemplate(tpl.id, e as any); }} />
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        /* Positioning the Tldraw toolbar at the bottom center */
        .tlui-layout__bottom__main {
           position: absolute !important;
           bottom: 30px !important; 
           left: 50% !important;
           transform: translateX(-50%) !important;
           z-index: 1000 !important;
           visibility: ${showTools && boardMode === 'whiteboard' ? 'visible' : 'hidden'} !important;
           opacity: ${showTools && boardMode === 'whiteboard' ? '1' : '0'} !important;
           transition: all 0.2s ease-in-out;
        }
        .tlui-layout__bottom { position: static !important; display: block !important; }

        /* Notepad Background Patterns */
        .bg-lines {
          background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
          background-size: 100% 2.5rem;
        }
        .bg-grid {
          background-image: 
            linear-gradient(#e2e8f0 1px, transparent 1px),
            linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
          background-size: 2.5rem 2.5rem;
        }
        .bg-squares {
          background-image: 
            linear-gradient(#e2e8f0 1px, transparent 1px),
            linear-gradient(90deg, #e2e8f0 1px, transparent 1px);
          background-size: 1.25rem 1.25rem;
        }
        .bg-checklist {
          background-image: linear-gradient(#e2e8f0 1px, transparent 1px);
          background-size: 100% 2.5rem;
          background-attachment: local;
        }
        .bg-checklist::before {
          content: '';
          position: absolute;
          top: 0;
          left: 4.5rem;
          bottom: 0;
          width: 1px;
          background-color: #fca5a5;
        }
      `}</style>
    </>
  );
}

export default function WhiteboardWidget({ isInteractive = true }: { isInteractive?: boolean }) {
  const { app } = useApp();
  const currentIsLight = !app.theme?.includes('dark');
  const [isLocked, setIsLocked] = useState(false);
  const [isSpotlight, setIsSpotlight] = useState(false);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });
  
  const [isShade, setIsShade] = useState(false);
  const [shadeHeight, setShadeHeight] = useState(50);
  const [isDraggingShade, setIsDraggingShade] = useState(false);

  const boardMode = app.boardSettings?.boardMode || "whiteboard";

  return (
    <div 
      className={`absolute inset-0 z-[100] transition-opacity duration-300 ${currentIsLight ? 'bg-slate-50' : 'bg-slate-950 tl-theme__dark'}`} 
      style={{ pointerEvents: 'none' }}
      onPointerMove={(e) => {
        if (isSpotlight) {
          const rect = e.currentTarget.getBoundingClientRect();
          setSpotlightPos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
          });
        }
        if (isDraggingShade) {
          const rect = e.currentTarget.getBoundingClientRect();
          let newHeight = ((e.clientY - rect.top) / rect.height) * 100;
          newHeight = Math.max(5, Math.min(95, newHeight));
          setShadeHeight(newHeight);
        }
      }}
      onPointerUp={() => setIsDraggingShade(false)}
      onPointerLeave={() => setIsDraggingShade(false)}
    >
      <style>{`
        /* Fusion Mode Styling */
        .tl-container, .tl-main, .tl-layer, .tl-canvas, .tl-background {
          background-color: transparent !important;
          background: transparent !important;
        }
        
        .tl-background { display: none !important; }

        /* Hide Tldraw UI in text mode or when locked */
        .tlui-layout__top, .tlui-help-menu, .tlui-zoom-menu, .tlui-navigation-panel {
          display: none !important;
        }

        .tlui-layout { opacity: 1 !important; z-index: 1000; }
        .tlui-layout__bottom__main { pointer-events: auto !important; }
      `}</style>

      <div 
        className={`absolute inset-0 transition-opacity duration-500 ${isInteractive ? 'opacity-100' : 'opacity-40'}`}
        style={{ pointerEvents: isInteractive ? 'auto' : 'none' }}
      >
        {boardMode === 'whiteboard' ? (
          <Tldraw persistenceKey="shuhu-whiteboard-v1">
            <WhiteboardUI 
              isLocked={isLocked} setIsLocked={setIsLocked}
              isSpotlight={isSpotlight} setIsSpotlight={setIsSpotlight}
              isShade={isShade} setIsShade={setIsShade}
              isInteractive={isInteractive}
            />
          </Tldraw>
        ) : (
          <div className="w-full h-full relative">
            <NotepadView isLocked={isLocked} />
            <WhiteboardUI 
              isLocked={isLocked} setIsLocked={setIsLocked}
              isSpotlight={isSpotlight} setIsSpotlight={setIsSpotlight}
              isShade={isShade} setIsShade={setIsShade}
              isInteractive={isInteractive}
            />
          </div>
        )}
      </div>

      {/* Special Effects Layers */}
      {isShade && (
        <div 
          className="absolute top-0 left-0 right-0 z-[990] bg-[#1a1a1a]"
          style={{ height: `${shadeHeight}%`, boxShadow: '0 10px 40px rgba(0,0,0,0.6)', pointerEvents: 'auto' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)', backgroundSize: '30px 30px', backgroundPosition: '0 0, 15px 15px' }} />
          <div 
            className="absolute bottom-0 left-0 right-0 h-10 flex items-center justify-center cursor-ns-resize group bg-slate-800 hover:bg-slate-700 transition-colors border-t border-white/10"
            onPointerDown={(e) => { e.preventDefault(); setIsDraggingShade(true); }}
          >
            <div className="w-20 h-1.5 rounded-full bg-slate-600 group-hover:bg-slate-400 transition-colors" />
          </div>
        </div>
      )}

      {isSpotlight && (
        <div 
          className="absolute inset-0 pointer-events-none z-[995]"
          style={{
            background: `radial-gradient(circle 200px at ${spotlightPos.x}% ${spotlightPos.y}%, transparent 0%, rgba(0,0,0,0.92) 100%)`
          }}
        />
      )}
    </div>
  );
}
