import React, { useRef, useEffect, useState } from "react";
import { Bold, Italic, Underline, Palette, Type, List, ListOrdered, CaseSensitive, Baseline, Plus, Minus, ChevronRight, ChevronDown } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  activeFontClass?: string;
  onFontChange?: (font: string) => void;
  paperSize?: number;
  paperType?: string;
  readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, className, placeholder, activeFontClass, onFontChange, paperSize, paperType, readOnly }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Custom font size and line height mapping
  const [customFontSize, setCustomFontSize] = useState<number | "">("");
  const [syncWithLines, setSyncWithLines] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showFontsDropdown, setShowFontsDropdown] = useState(false);

  // Initialize value only once or if it structurally changes from outside
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== (value || "")) {
      editorRef.current.innerHTML = value || "";
    }
  }, [value]);

  const [lastSelectionRange, setLastSelectionRange] = useState<Range | null>(null);

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        setHasSelection(false);
        setLastSelectionRange(null);
        return;
      }
      
      const range = selection.getRangeAt(0);
      if (editorRef.current && (editorRef.current.contains(selection.anchorNode) || editorRef.current.contains(selection.focusNode))) {
        setHasSelection(true);
        setLastSelectionRange(range.cloneRange());
      } else {
        setHasSelection(false);
        setLastSelectionRange(null);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const executeCommand = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    handleInput();
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyCustomFontSize = (size: number | "") => {
    setCustomFontSize(size);
    if (!editorRef.current) return;
    
    // Restore selection if lost
    if (lastSelectionRange) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(lastSelectionRange);
      }
    }

    if (size) {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("fontSize", false, "7"); // Use large dummy to find it easily
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        // Find existing spans that were just touched or created
        const range = selection.getRangeAt(0);
        let container = range.commonAncestorContainer as HTMLElement;
        if (container.nodeType === 3) container = container.parentElement!;
        
        // Target all spans with our dummy font size
        const targetSpans = editorRef.current.querySelectorAll('span[style*="font-size: xxx-large"]');
        targetSpans.forEach((span: any) => {
          span.style.fontSize = `${size}px`;
          span.style.lineHeight = "1.2";
        });
        
        // Fallback for direct node manipulation if execCommand didn't wrap cleanly
        if (targetSpans.length === 0) {
           const span = document.createElement('span');
           span.style.fontSize = `${size}px`;
           span.style.lineHeight = "1.2";
           try {
             range.surroundContents(span);
           } catch(e) {
             // If cross-boundary, just set on selection
             document.execCommand("fontSize", false, "1");
           }
        }
      }
    } else {
      // Clear formatting for selection
      document.execCommand("removeFormat", false);
    }
    handleInput();
  };

  const toggleSyncWithLines = () => {
    const willSync = !syncWithLines;
    setSyncWithLines(willSync);
    if (willSync && paperSize) {
      setCustomFontSize(paperSize);
      // When syncing with lines, we also want to stabilize the line height
      if (editorRef.current) {
        const children = editorRef.current.querySelectorAll('*');
        children.forEach((child: any) => {
          child.style.fontSize = 'inherit';
          child.style.lineHeight = 'inherit';
        });
      }
    }
  };

  useEffect(() => {
    if (syncWithLines && paperSize) {
      setCustomFontSize(paperSize);
    }
  }, [paperSize, syncWithLines]);

  const getCurrentFontSize = () => {
    if (customFontSize && typeof customFontSize === 'number') return customFontSize;
    if (editorRef.current) {
      const computed = window.getComputedStyle(editorRef.current);
      const fs = parseFloat(computed.fontSize);
      if (!isNaN(fs)) return fs;
    }
    return 48;
  };

  const handleDecreaseFont = (e: React.PointerEvent) => {
    e.preventDefault();
    const current = getCurrentFontSize();
    applyCustomFontSize(Math.max(10, Math.round(current - 4)));
    setSyncWithLines(false);
  };

  const handleIncreaseFont = (e: React.PointerEvent) => {
    e.preventDefault();
    const current = getCurrentFontSize();
    applyCustomFontSize(Math.round(current + 4));
    setSyncWithLines(false);
  };

  const colors = ["#ffffff", "#ef4444", "#f97316", "#f59e0b", "#10b981", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#a8a29e", "#444444", "#000000"];
  
  const fonts = [
    { label: "Sans (Standard)", value: "font-sans" },
    { label: "Österr. Druckschrift", value: "font-druckschrift" },
    { label: "Österr. Schulschrift", value: "font-schulschrift" },
    { label: "Handschrift (Caveat)", value: "font-caveat" },
    { label: "Serif (Klassisch)", value: "font-serif" },
    { label: "Dyslexie", value: "font-dyslexic" }
  ];

  const fontOptions = [
    { id: "font-standard", label: "A", class: "font-standard", name: "Standard", matches: ["font-standard", "font-sans"] },
    { id: "font-geometric", label: "G", class: "font-geometric", name: "Geometrisch", matches: ["font-geometric"] },
    { id: "font-friendly", label: "F", class: "font-friendly", name: "Freundlich", matches: ["font-friendly"] },
    { id: "font-druckschrift", label: "D", class: "font-druckschrift", name: "Druckschrift", matches: ["font-druckschrift"] },
    { id: "font-schulschrift", label: "S", class: "font-schulschrift", name: "Schreibschrift", matches: ["font-schulschrift", "font-handwritten", "font-caveat"] },
    { id: "font-dyslexic", label: "I", class: "font-dyslexic", name: "Inklusiv", matches: ["font-dyslexic"] },
    { id: "font-mono", label: "M", class: "font-mono", name: "Code", matches: ["font-mono"] }
  ];

  const activeFontObj = fontOptions.find(f => f.id === activeFontClass || (f.matches && f.matches.includes(activeFontClass || ''))) || fontOptions[0];

  // Filter out any font- family class from className to prevent styling the sidebar settings, buttons and options with the selected handwritten/schulschrift fonts.
  const wrapperClass = className
    ? className
        .split(" ")
        .filter((cls) => !cls.startsWith("font-"))
        .join(" ")
    : "";

  return (
    <div className={`w-full h-full relative group/editor flex flex-col ${wrapperClass}`}>
      {/* Collapsible & Compact Settings Sidebar on the right for Schreibmodus (Text Mode) */}
      {!readOnly && (
        <>
          {/* Collapsed Activator Tab on the top right edge */}
          {!isSidebarOpen ? (
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setIsSidebarOpen(true);
              }}
              className="absolute right-3 top-4 z-[200] w-10 h-10 bg-[#fbbf24] hover:bg-[#f59e0b] text-black rounded-xl flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 active:scale-95 cursor-pointer border-2 border-amber-300"
              title="Schrifteinstellungen öffnen"
            >
              <Type size={18} strokeWidth={2.5} />
            </button>
          ) : (
            /* Expanded highly compact sidebar dashboard - HORIZONTAL NOW */
            <div className="absolute right-3 top-4 z-[200] flex flex-row gap-1 p-1 bg-[#121214]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl items-center pointer-events-auto transition-all duration-200">

              {/* Single Font Selection Popover Button */}
              <div className="relative pl-1">
                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setShowFontsDropdown(!showFontsDropdown);
                    setShowColorPicker(false);
                  }}
                  className={`px-3 h-8 rounded-lg flex flex-row items-center justify-center transition-all border cursor-pointer ${showFontsDropdown ? "bg-[#fbbf24] border-[#fbbf24] text-black" : "bg-white/5 border-white/10 text-white/50 hover:text-white"}`}
                  title={`Schriftart: ${activeFontObj.name}`}
                >
                  <span className={`${activeFontObj.class} text-[0.75rem] leading-tight font-black leading-none mr-2`}>
                    {activeFontObj.label}
                  </span>
                  <ChevronDown size={12} className="opacity-70" />
                </button>

                {/* Compact Fonts Dropdown Container to the bottom */}
                {showFontsDropdown && (
                  <div className="absolute right-0 top-10 bg-[#121214]/95 backdrop-blur-xl border border-white/15 rounded-xl p-1.5 flex flex-col gap-0.5 z-[210] shadow-2xl min-w-[150px]">
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-amber-500 px-2 pb-1 select-none border-b border-white/5 mb-1 text-center">
                      Schriftformen
                    </span>
                    {fontOptions.map((f) => (
                      <button
                        key={f.id}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          if (onFontChange) onFontChange(f.id);
                          setShowFontsDropdown(false);
                        }}
                        className={`w-full px-2 py-1 rounded-md flex items-center gap-1.5 transition-all text-[0.6875rem] font-bold text-left cursor-pointer ${activeFontObj.id === f.id ? "bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-[#fbbf24]" : "text-white/60 hover:bg-white/5 border border-transparent"}`}
                      >
                        <span className={`${f.class} font-black text-[0.75rem] leading-tight w-4 text-center inline-block`}>
                          {f.label}
                        </span>
                        <span className="text-wrap leading-tight break-words">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px bg-white/10 h-6 mx-1" />

              {/* Text Style Controls */}
              <div className="flex flex-row gap-1">
                <button 
                  onPointerDown={(e) => { e.preventDefault(); executeCommand("bold"); }} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all cursor-pointer" 
                  title="Fett"
                >
                  <Bold size={13} strokeWidth={3} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); executeCommand("italic"); }} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all cursor-pointer" 
                  title="Kursiv"
                >
                  <Italic size={13} strokeWidth={3} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); executeCommand("underline"); }} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 transition-all cursor-pointer" 
                  title="Unterstrichen"
                >
                  <Underline size={13} strokeWidth={3} />
                </button>
              </div>

              <div className="w-px bg-white/10 h-6 mx-1" />

              {/* Font Size Chooser - Horizontal Layout */}
              <div className="flex flex-row items-center gap-0">
                <button 
                  onPointerDown={handleDecreaseFont} 
                  className="w-6 h-8 rounded-l-lg flex items-center justify-center text-white/50 bg-white/5 border-l border-y border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                  title="Kleiner"
                >
                  <Minus size={11} strokeWidth={3} />
                </button>
                
                <div className="w-8 h-8 bg-white/5 border-y border-white/10 flex items-center justify-center select-none">
                  <span className="text-[0.625rem] font-black text-amber-500">
                    {customFontSize || paperSize || 40}
                  </span>
                </div>

                <button 
                  onPointerDown={handleIncreaseFont} 
                  className="w-6 h-8 rounded-r-lg flex items-center justify-center text-white/50 bg-white/5 border-r border-y border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                  title="Größer"
                >
                  <Plus size={11} strokeWidth={3} />
                </button>
              </div>

              <div className="w-px bg-white/10 h-6 mx-1" />

              {/* Color Selector */}
              <div className="relative">
                <button 
                  onPointerDown={(e) => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowFontsDropdown(false); }} 
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${showColorPicker ? 'bg-amber-500 border-amber-500 text-amber-950' : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'}`} 
                  title="Farbe"
                >
                  <Palette size={13} strokeWidth={3} />
                </button>
                {showColorPicker && (
                  <div className="absolute right-0 top-10 bg-[#121214]/95 backdrop-blur-xl border border-white/15 rounded-xl p-2 grid grid-cols-4 gap-1 z-[210] shadow-2xl min-w-[100px]">
                    <span className="text-[0.5rem] font-black uppercase tracking-wider text-amber-500 col-span-4 pb-1 select-none border-b border-white/5 mb-1 text-center">
                      Farben
                    </span>
                    {colors.map(c => (
                      <button 
                        key={c} 
                        onPointerDown={(e) => { e.preventDefault(); executeCommand("foreColor", c); setShowColorPicker(false); }} 
                        className="w-4 h-4 rounded-full border border-white/15 hover:scale-110 shadow-sm transition-transform cursor-pointer" 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px bg-white/10 h-6 mx-1" />

              {/* Lists and Context controls */}
              <div className="flex flex-row gap-1 items-center px-1">
                <button 
                  onPointerDown={(e) => { e.preventDefault(); applyCustomFontSize(""); }} 
                  className="px-2 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Standard Größe (Zurücksetzen)"
                >
                  <span className="text-[0.625rem] font-bold">A</span>
                </button>
                <div className="w-px bg-white/10 h-4 mx-0.5" />
                <button 
                  onPointerDown={(e) => { e.preventDefault(); executeCommand("insertUnorderedList"); }} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Aufzählung"
                >
                  <List size={13} strokeWidth={2.5} />
                </button>
                <button 
                  onPointerDown={(e) => { e.preventDefault(); executeCommand("insertOrderedList"); }} 
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 cursor-pointer"
                  title="Nummerierung"
                >
                  <ListOrdered size={13} strokeWidth={2.5} />
                </button>
              </div>

              {/* Sync with Lines Button */}
              {(paperType === "lined" || paperType === "squared" || paperType === "writing-lines") && (
                <>
                  <div className="h-px bg-white/10 w-6 mx-auto hidden" />
                  <div className="w-px bg-white/10 h-6 mx-1" />
                  <button 
                    onPointerDown={(e) => { e.preventDefault(); toggleSyncWithLines(); }} 
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${syncWithLines ? 'bg-amber-500 border-amber-500 text-amber-950 shadow-lg shadow-amber-500/20' : 'bg-white/5 text-white/50 border-white/10 hover:text-white hover:bg-white/10'}`} 
                    title="Auf Zeilen ausrichten"
                  >
                    <Baseline size={13} strokeWidth={3} />
                  </button>
                </>
              )}

              <div className="w-px bg-white/10 h-6 mx-1" />

              {/* Close / Collapsible button */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  setIsSidebarOpen(false);
                  setShowFontsDropdown(false);
                  setShowColorPicker(false);
                }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                title="Leiste einklappen"
              >
                <ChevronRight size={15} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </>
      )}

      <div 
        ref={editorRef}
        className={`w-full h-full outline-none overflow-y-auto [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-neutral-600/50 [&:empty]:before:pointer-events-none custom-scrollbar ${activeFontClass || ''} ${activeFontClass === 'font-dyslexic' ? 'tracking-wide leading-relaxed' : ''} ${readOnly ? 'cursor-default pointer-events-none' : 'pointer-events-auto'}`}
        contentEditable={!readOnly}
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        style={{ 
          whiteSpace: "pre-wrap",
          fontSize: customFontSize ? `${customFontSize}px` : (syncWithLines ? (paperType === 'writing-lines' ? `${(paperSize || 44) * 0.9}px` : `${(paperSize || 40) * 0.75}px`) : '40px'),
          lineHeight: syncWithLines ? (paperType === 'writing-lines' ? `${(paperSize || 44) * 1.5}px` : `${paperSize}px`) : (customFontSize ? '1.4' : '1.4'),
          paddingTop: paperType === 'blank' ? '30px' : (syncWithLines ? (paperType === 'writing-lines' ? '46px' : '80px') : '100px'), 
          paddingLeft: paperType === 'blank' ? '2rem' : '4.5rem',
          paddingRight: paperType === 'blank' ? '2rem' : '3rem',
          transition: 'all 0.1s ease-out'
        }}
      />
      <style>{`
        [contenteditable], [contenteditable] * {
          font-family: inherit !important;
        }
        [contenteditable] > * {
          margin: 0;
        }
        [contenteditable] p {
          min-height: 1.2em;
        }
        /* Custom number input styling */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
};
