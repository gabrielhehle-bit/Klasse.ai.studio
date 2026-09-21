import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CanvaDesignChooser, CanvaDesignChoice } from './CanvaDesignChooser';
import { importCanvaImage } from '../lib/canvaImageImport';
import { useToast } from '../context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Image as ImageIcon, Upload, Trash2, CheckCircle2, Type, Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AppState, UnterrichtsmodusModus, UnterrichtsmodusThemeId, UnterrichtsmodusHintergrundId } from '../types';
import { UNTERRICHTSMODUS_THEMES, UNTERRICHTSMODUS_HINTERGRUENDE } from '../lib/unterrichtsmodusThemes';
import { ALL_WIDGET_CONFIG } from './WidgetConfig';
import { MASCOT_OPTIONS, normalizeClassMascot, selectClassMascot } from '../lib/classMascot';
import ClassMascotArtwork from './cockpit/ClassMascotArtwork';

interface ThemePickerProps {
    app: AppState;
    setApp: React.Dispatch<React.SetStateAction<AppState>>;
    isOpen: boolean;
    onClose: () => void;
    onRecenterMascot?: () => void;
}

export const UnterrichtsmodusThemePicker: React.FC<ThemePickerProps> = ({ app, setApp, isOpen, onClose, onRecenterMascot }) => {
    const currentThemeId = app.unterrichtsmodus_theme || app.theme || 'classic_light';
    const currentTheme = UNTERRICHTSMODUS_THEMES[currentThemeId] || UNTERRICHTSMODUS_THEMES.classic_light;
    const currentBgId = app.unterrichtsmodus_hintergrund || app.unterrichtsmodus_hintergrundProModus?.lehrperson || 'kein';
    const currentCustomImg = app.unterrichtsmodus_eigenesBild || app.unterrichtsmodus_eigenesBildProModus?.lehrperson;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [canvaPickerOpen, setCanvaPickerOpen] = useState(false);
    const [canvaBusy, setCanvaBusy] = useState(false);
    const { showToast } = useToast();

    const handleCanvaBackground = async (design: CanvaDesignChoice) => {
        setCanvaBusy(true);
        try {
            const image = await importCanvaImage(design.id);
            setApp(prev => ({
                ...prev,
                unterrichtsmodus_canvaBild: image,
                unterrichtsmodus_canvaTitel: design.title || 'Canva-Design',
                unterrichtsmodus_hintergrund: 'canva'
            }));
            setCanvaPickerOpen(false);
            showToast('Canva-Hintergrund übernommen. Widgets und Zeichnungen bleiben erhalten.', 'success');
        } catch (error) {
            showToast(error instanceof Error ? error.message : 'Canva-Bild konnte nicht importiert werden.', 'error');
        } finally {
            setCanvaBusy(false);
        }
    };

    const handleThemeSelect = (themeId: UnterrichtsmodusThemeId) => {
        setApp(prev => ({
            ...prev,
            unterrichtsmodus_theme: themeId
        }));
    };

    const handleBgSelect = (bgId: UnterrichtsmodusHintergrundId) => {
        setApp(prev => ({
            ...prev,
            unterrichtsmodus_hintergrund: bgId
        }));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 1024 * 1024 * 2) { // Increased to 2MB as 1MB is sometimes too small for clear backgrounds
            alert('Das Bild ist zu groß (maximal 2 MB erlaubt).');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            setApp(prev => ({
                ...prev,
                unterrichtsmodus_eigenesBild: base64,
                unterrichtsmodus_hintergrund: 'eigenes'
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleDeleteCustomImage = () => {
        setApp(prev => ({
            ...prev,
            unterrichtsmodus_eigenesBild: undefined,
            unterrichtsmodus_hintergrund: prev.unterrichtsmodus_hintergrund === 'eigenes' ? 'kein' : prev.unterrichtsmodus_hintergrund
        }));
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-[100] flex items-center justify-end p-4 pointer-events-none">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
                onClick={onClose}
            />
            
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="relative w-full max-w-md h-full max-h-full border shadow-2xl flex flex-col pointer-events-auto transition-colors duration-700 rounded-3xl overflow-hidden"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}
            >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: currentTheme.colors.border }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${currentTheme.colors.accent}1a` }}>
                            <Palette className="text-amber-500" size={20} style={{ color: currentTheme.colors.accent }} />
                        </div>
                        <div>
                            <h2 className="text-[1.125rem] leading-normal font-black" style={{ color: currentTheme.colors.textPrimary }}>Design anpassen</h2>
                            <p className="text-[0.75rem] leading-tight font-bold uppercase tracking-widest" style={{ color: `${currentTheme.colors.textPrimary}4d` }}>
                                Themes & Hintergründe
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: `${currentTheme.colors.textPrimary}66` }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* THEME SELECTION */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Type size={14} style={{ color: currentTheme.colors.accent }} />
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textPrimary }}>Theme Design</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.values(UNTERRICHTSMODUS_THEMES)).map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => handleThemeSelect(theme.id)}
                                    className={`relative group flex flex-col items-stretch p-0 rounded-3xl border-2 transition-all text-left overflow-hidden ${
                                        currentThemeId === theme.id 
                                        ? 'shadow-2xl scale-[1.02] z-10' 
                                        : 'hover:scale-105 hover:shadow-xl'
                                    }`}
                                    style={{ 
                                        borderColor: currentThemeId === theme.id ? theme.colors.accent : currentTheme.colors.border,
                                    }}
                                >
                                    <div 
                                        className="h-32 w-full flex flex-col items-center justify-center relative p-4"
                                        style={{ backgroundColor: theme.colors.background }}
                                    >
                                        <div 
                                            className="w-full flex-1 rounded-2xl shadow-sm border-2 flex flex-col items-center justify-center transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-md relative overflow-hidden"
                                            style={{ backgroundColor: theme.colors.surface || theme.colors.background, borderColor: theme.colors.border }}
                                        >
                                            {/* decorative accent header */}
                                            <div className="absolute top-0 left-0 right-0 h-3 w-full opacity-80" style={{ backgroundColor: theme.colors.accent }} />
                                            <span className="font-extrabold text-3xl mt-2 tracking-tight" style={{ color: theme.colors.accent }}>Aa</span>
                                        </div>
                                        <div className="absolute top-2 right-2 flex gap-1.5 bg-black/10 backdrop-blur-md px-2 py-1 rounded-full border border-black/5 shadow-sm">
                                            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: theme.colors.accent }} />
                                            <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: theme.colors.textPrimary }} />
                                        </div>
                                    </div>
                                    <div 
                                        className="p-4 w-full flex flex-col relative border-t"
                                        style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
                                    >
                                        <div className="flex items-start justify-between w-full">
                                            <span className="text-[0.875rem] leading-snug font-black" style={{ color: theme.colors.textPrimary }}>{theme.label}</span>
                                            {currentThemeId === theme.id && <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: theme.colors.accent }} />}
                                        </div>
                                        <p className="text-[0.625rem] font-bold uppercase tracking-wider mt-1.5 opacity-80 line-clamp-2" style={{ color: theme.colors.textSecondary }}>{theme.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Change the cockpit font only when the teacher explicitly selects one. */}
                    <section className="space-y-3 p-4 rounded-2xl border" aria-label="Schriftart im Lehrercockpit"
                        style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }}>
                        <label htmlFor="cockpit-font-choice" className="flex items-center gap-2 text-xs font-black"
                            style={{ color: currentTheme.colors.textPrimary }}>
                            <Type size={14} /> Schriftart im Lehrercockpit
                        </label>
                        <select id="cockpit-font-choice"
                            value={app.boardSettings?.activeFont || `font-${app.settings?.fontFamily || 'standard'}`}
                            onChange={(event) => {
                                const chosenFont = event.target.value;
                                setApp(prev => ({
                                    ...prev,
                                    boardSettings: { ...prev.boardSettings, activeFont: chosenFont },
                                }));
                            }}
                            className="w-full min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold"
                            style={{ backgroundColor: currentTheme.colors.surface, color: currentTheme.colors.textPrimary, borderColor: currentTheme.colors.border }}>
                            {!['font-standard', 'font-sans', 'font-druckschrift', 'font-schulschrift', 'font-dyslexic'].includes(app.boardSettings?.activeFont || `font-${app.settings?.fontFamily || 'standard'}`) && (
                                <option value={app.boardSettings?.activeFont || `font-${app.settings?.fontFamily || 'standard'}`}>Bisherige Schrift beibehalten</option>
                            )}
                            <option value="font-standard">Standard</option>
                            <option value="font-sans">Klare Druckschrift</option>
                            <option value="font-druckschrift">Druckschrift (Schule)</option>
                            <option value="font-schulschrift">Schulschrift</option>
                            <option value="font-dyslexic">Lesefreundliche Schrift</option>
                        </select>
                        <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                            Ein Farb- oder Designwechsel ändert deine ausgewählte Schrift nicht.
                        </p>
                    </section>

                    {/* Keep configuration off the whiteboard: the mascot itself has no visible controls. */}
                    <section className="space-y-3 p-4 rounded-2xl border" aria-label="Klassenmaskottchen auswählen"
                        style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }}>
                        <div>
                            <h3 className="text-xs font-black" style={{ color: currentTheme.colors.textPrimary }}>
                                Klassenmaskottchen
                            </h3>
                            <p className="mt-1 text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                                Figur auswählen – im Lehrercockpit erscheint nur das Tier, ohne Namen oder Menü.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {MASCOT_OPTIONS.map(option => (
                                <button key={option.kind} type="button"
                                    aria-label={option.label + ' als Klassenmaskottchen auswählen'}
                                    aria-pressed={normalizeClassMascot(app.classMascot).kind === option.kind}
                                    onClick={() => setApp(prev => ({
                                        ...prev,
                                        classMascot: selectClassMascot(normalizeClassMascot(prev.classMascot), option.kind),
                                    }))}
                                    className="min-h-32 rounded-xl border-2 p-2 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    style={{
                                        borderColor: normalizeClassMascot(app.classMascot).kind === option.kind ? currentTheme.colors.accent : currentTheme.colors.border,
                                        color: currentTheme.colors.textPrimary,
                                        backgroundColor: currentTheme.colors.surface,
                                    }}>
                                    <span className="mx-auto block h-20 w-20" aria-hidden="true">
                                        <ClassMascotArtwork kind={option.kind} mood="happy" name={option.name} animationEnabled={false} />
                                    </span>
                                    <span className="block text-xs font-black">{option.label}</span>
                                    {normalizeClassMascot(app.classMascot).kind === option.kind &&
                                        <span className="block text-[11px] font-semibold">✓ Ausgewählt</span>}
                                </button>
                            ))}
                        </div>
                        {/* All personalization lives here, never as controls or a card on the cockpit. */}
                        <div className="space-y-3 border-t pt-3" style={{ borderColor: currentTheme.colors.border }}>
                            <label htmlFor="class-mascot-name" className="block text-xs font-black"
                                style={{ color: currentTheme.colors.textPrimary }}>
                                Name des Klassenmaskottchens
                            </label>
                            <input
                                id="class-mascot-name"
                                type="text"
                                autoComplete="off"
                                maxLength={24}
                                value={app.classMascot?.name ?? normalizeClassMascot(app.classMascot).name}
                                onChange={event => {
                                    const nextName = event.target.value;
                                    setApp(prev => ({
                                        ...prev,
                                        classMascot: { ...normalizeClassMascot(prev.classMascot), name: nextName },
                                    }));
                                }}
                                onBlur={() => setApp(prev => ({
                                    ...prev,
                                    classMascot: normalizeClassMascot(prev.classMascot),
                                }))}
                                className="w-full min-h-11 rounded-xl border-2 px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                style={{
                                    color: currentTheme.colors.textPrimary,
                                    borderColor: currentTheme.colors.border,
                                    backgroundColor: currentTheme.colors.surface,
                                }}
                                aria-describedby="class-mascot-name-help"
                            />
                            <p id="class-mascot-name-help" className="text-xs"
                                style={{ color: currentTheme.colors.textSecondary }}>
                                Nur für diese Klasse. Ein leerer Name wird beim Verlassen des Feldes auf den Figurennamen zurückgesetzt.
                            </p>
                            <div role="group" aria-label="Stimmung des Klassenmaskottchens" className="space-y-2">
                                <p className="text-xs font-black" style={{ color: currentTheme.colors.textPrimary }}>
                                    Stimmung auswählen
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {([
                                        { mood: 'happy' as const, label: '😊 Fröhlich' },
                                        { mood: 'calm' as const, label: '😌 Ruhig' },
                                        { mood: 'sleepy' as const, label: '😴 Müde' },
                                        { mood: 'proud' as const, label: '⭐ Stolz' },
                                    ]).map(option => (
                                        <button
                                            key={option.mood}
                                            type="button"
                                            aria-pressed={normalizeClassMascot(app.classMascot).mood === option.mood}
                                            onClick={() => setApp(prev => ({
                                                ...prev,
                                                classMascot: {
                                                    ...normalizeClassMascot(prev.classMascot),
                                                    mood: option.mood,
                                                },
                                            }))}
                                            className="min-h-11 rounded-xl border-2 px-2 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                            style={{
                                                color: currentTheme.colors.textPrimary,
                                                borderColor: normalizeClassMascot(app.classMascot).mood === option.mood
                                                    ? currentTheme.colors.accent : currentTheme.colors.border,
                                                backgroundColor: currentTheme.colors.surface,
                                            }}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                                    Die Stimmung wird bewusst von dir eingestellt, nicht aus Daten einzelner Kinder abgeleitet.
                                </p>
                            </div>
                        </div>
                        <div className="border-t pt-3" style={{ borderColor: currentTheme.colors.border }}>
                            <p className="mb-2 text-xs font-black" style={{ color: currentTheme.colors.textPrimary }}>
                                Größe auf der Tafel
                            </p>
                            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Maskottchengröße">
                                {([
                                    { size: 160 as const, label: 'Klein' },
                                    { size: 220 as const, label: 'Mittel' },
                                    { size: 280 as const, label: 'Groß' },
                                ]).map(option => (
                                    <button
                                        key={option.size}
                                        type="button"
                                        aria-pressed={normalizeClassMascot(app.classMascot).displaySize === option.size}
                                        onClick={() => setApp(prev => ({
                                            ...prev,
                                            classMascot: { ...normalizeClassMascot(prev.classMascot), displaySize: option.size },
                                        }))}
                                        className="min-h-11 rounded-xl border-2 px-2 py-2 text-xs font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                        style={{
                                            color: currentTheme.colors.textPrimary,
                                            borderColor: normalizeClassMascot(app.classMascot).displaySize === option.size
                                                ? currentTheme.colors.accent : currentTheme.colors.border,
                                            backgroundColor: currentTheme.colors.surface,
                                        }}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <label className="mt-3 flex min-h-11 items-center justify-between gap-3 text-xs font-bold"
                                style={{ color: currentTheme.colors.textPrimary }}>
                                <span>Sanftes Atmen aktivieren</span>
                                <input
                                    type="checkbox"
                                    checked={normalizeClassMascot(app.classMascot).animationEnabled}
                                    onChange={event => setApp(prev => ({
                                        ...prev,
                                        classMascot: { ...normalizeClassMascot(prev.classMascot), animationEnabled: event.target.checked },
                                    }))}
                                    className="h-5 w-5 accent-teal-600"
                                />
                            </label>
                            <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                                Auf der Tafel bleibt nur die freistehende Figur sichtbar. Die Animation bleibt bei reduzierter Bewegung ausgeschaltet.
                            </p>
                            {onRecenterMascot && (
                                <button
                                    type="button"
                                    onClick={onRecenterMascot}
                                    className="mt-3 min-h-11 w-full rounded-xl border-2 px-3 py-2 text-xs font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                                    style={{
                                        borderColor: currentTheme.colors.accent,
                                        color: currentTheme.colors.textPrimary,
                                        backgroundColor: currentTheme.colors.surface,
                                    }}
                                    aria-label="Klassenmaskottchen wiederfinden und in der Cockpit-Mitte platzieren"
                                >
                                    Maskottchen wiederfinden · mittig platzieren
                                </button>
                            )}
                        </div>
                    </section>

                    {/* CUSTOM COLORS */}
                    <section className="space-y-4 p-4 rounded-2xl border" style={{ borderColor: currentTheme.colors.border, backgroundColor: `${currentTheme.colors.textPrimary}05` }}>
                        <div className="flex items-center gap-2">
                            <Palette size={14} style={{ color: currentTheme.colors.accent }} />
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textPrimary }}>Farben anpassen</h3>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[0.75rem] leading-tight font-bold" style={{ color: currentTheme.colors.textSecondary }}>Hintergrundfarbe (Cockpit)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="color"
                                        value={app.customBgColor || '#121214'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setApp(prev => ({
                                                ...prev,
                                                customBgColor: val,
                                                unterrichtsmodus_theme: 'custom_theme'
                                            }));
                                        }}
                                        className="w-8 h-8 rounded-lg cursor-pointer border shadow-sm outline-none bg-transparent"
                                    />
                                    <input 
                                        type="text"
                                        value={app.customBgColor || '#121214'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setApp(prev => ({
                                                ...prev,
                                                customBgColor: val,
                                                unterrichtsmodus_theme: 'custom_theme'
                                            }));
                                        }}
                                        className="w-24 px-2 py-1 text-[0.75rem] leading-tight rounded-lg border text-center font-mono font-bold"
                                        style={{ backgroundColor: `${currentTheme.colors.textPrimary}08`, borderColor: currentTheme.colors.border, color: currentTheme.colors.textPrimary }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="text-[0.75rem] leading-tight font-bold" style={{ color: currentTheme.colors.textSecondary }}>Schriftfarbe (Cockpit & Widgets)</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="color"
                                        value={app.boardSettings?.boardTextColor || '#ffffff'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setApp(prev => ({
                                                ...prev,
                                                boardSettings: {
                                                    ...prev.boardSettings,
                                                    boardTextColor: val
                                                },
                                                customTextColor: val,
                                                unterrichtsmodus_theme: 'custom_theme'
                                            }));
                                        }}
                                        className="w-8 h-8 rounded-lg cursor-pointer border shadow-sm outline-none bg-transparent"
                                    />
                                    <input 
                                        type="text"
                                        value={app.boardSettings?.boardTextColor || '#ffffff'}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setApp(prev => ({
                                                ...prev,
                                                boardSettings: {
                                                    ...prev.boardSettings,
                                                    boardTextColor: val
                                                },
                                                customTextColor: val,
                                                unterrichtsmodus_theme: 'custom_theme'
                                            }));
                                        }}
                                        className="w-24 px-2 py-1 text-[0.75rem] leading-tight rounded-lg border text-center font-mono font-bold"
                                        style={{ backgroundColor: `${currentTheme.colors.textPrimary}08`, borderColor: currentTheme.colors.border, color: currentTheme.colors.textPrimary }}
                                    />
                                </div>
                            </div>
                            
                            {(() => {
                                const getLum = (hex: string) => {
                                    const cleanHex = hex.replace('#', '');
                                    if (cleanHex.length !== 6) return 0.5;
                                    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
                                    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
                                    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
                                    const a = [r, g, b].map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
                                    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
                                };

                                const getCon = (bgCol: string, fgCol: string) => {
                                    const l1 = getLum(bgCol);
                                    const l2 = getLum(fgCol);
                                    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                                };

                                const cBg = app.customBgColor || '#121214';
                                const cFg = app.boardSettings?.boardTextColor || '#ffffff';
                                const isBgLight = getLum(cBg) > 0.5;
                                const contrastVal = getCon(cBg, cFg);

                                let barColorClass = 'bg-rose-500/15 text-rose-500 border-rose-500/35';
                                let barLabel = 'Kritischer Kontrast! ❌';
                                let barAdv = 'Deine Schüler werden diese Schrift an der Tafel nicht lesen können.';

                                if (contrastVal >= 7.0) {
                                    barColorClass = 'bg-emerald-500/15 text-emerald-500 border-emerald-500/35';
                                    barLabel = 'Hervorragender Kontrast! 🌟';
                                    barAdv = 'Der Text ist an der Tafel gestochen scharf und optimal lesbar.';
                                } else if (contrastVal >= 4.5) {
                                    barColorClass = 'bg-teal-500/15 text-teal-500 border-teal-500/35';
                                    barLabel = 'Guter Kontrast! ✅';
                                    barAdv = 'Gut lesbar auf den meisten Bildschirmen und Projektoren.';
                                } else if (contrastVal >= 3.0) {
                                    barColorClass = 'bg-amber-500/15 text-amber-500 border-amber-500/35';
                                    barLabel = 'Eingeschränkt ⚠️';
                                    barAdv = 'Für kurze Beschriftungen okay, aber mühsam für Schüler.';
                                }

                                const handleOptInCockpit = () => {
                                    const optimizedColor = isBgLight ? '#121214' : '#ffffff';
                                    setApp(prev => ({
                                        ...prev,
                                        boardSettings: {
                                            ...prev.boardSettings,
                                            boardTextColor: optimizedColor
                                        },
                                        customTextColor: optimizedColor,
                                        customText2Color: isBgLight ? '#525252' : '#cbd5e1'
                                    }));
                                };

                                return (
                                    <div className="space-y-2 p-3 rounded-xl border mt-3 text-left" style={{ borderColor: currentTheme.colors.border, backgroundColor: `${currentTheme.colors.textPrimary}03` }}>
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <span className="text-[0.625rem] font-black uppercase tracking-widest" style={{ color: currentTheme.colors.textSecondary }}>Live-Kontrast</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-black border ${barColorClass}`}>
                                                {contrastVal.toFixed(1)}:1 • {barLabel}
                                            </span>
                                        </div>
                                        <p className="text-[0.625rem] font-semibold leading-normal" style={{ color: currentTheme.colors.textSecondary }}>
                                            {barAdv}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={handleOptInCockpit}
                                            className="w-full mt-1.5 py-1.5 bg-amber-500 hover:bg-amber-600 border border-amber-600/35 text-white text-[0.625rem] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                                        >
                                            <Sparkles size={10} /> Schriftfarbe automatisch optimieren
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>

                        {(app.customBgColor || app.boardSettings?.boardTextColor) && (
                            <button
                                onClick={() => {
                                    setApp(prev => ({
                                        ...prev,
                                        customBgColor: undefined,
                                        boardSettings: {
                                            ...prev.boardSettings,
                                            boardTextColor: undefined
                                        }
                                    }));
                                }}
                                className="w-full py-1.5 rounded-xl border text-[0.625rem] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-all hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20"
                                style={{ borderColor: currentTheme.colors.border, color: currentTheme.colors.textSecondary }}
                            >
                                <Trash2 size={12} /> Farben zurücksetzen
                            </button>
                        )}
                    </section>

                    {/* BACKGROUND SELECTION */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ImageIcon size={14} style={{ color: currentTheme.colors.accent }} />
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textPrimary }}>Hintergrund</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {(Object.entries(UNTERRICHTSMODUS_HINTERGRUENDE)).filter(([id]) => id !== 'canva').map(([id, bg]) => (
                                <div
                                    key={id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => id !== 'eigenes' && handleBgSelect(id as UnterrichtsmodusHintergrundId)}
                                    // eslint-disable-next-line
                                    onKeyDown={(e) => { if (e.key === 'Enter') { id !== 'eigenes' && handleBgSelect(id as UnterrichtsmodusHintergrundId) } }}
                                    className={`relative h-32 rounded-3xl border-2 transition-all group overflow-hidden cursor-pointer ${
                                        currentBgId === id 
                                        ? 'shadow-2xl scale-[1.02] z-10' 
                                        : 'hover:scale-105 hover:shadow-xl'
                                    }`}
                                    style={{ 
                                        borderColor: currentBgId === id ? currentTheme.colors.accent : currentTheme.colors.border,
                                    }}
                                >
                                    <div 
                                        className="absolute inset-0 transition-opacity duration-500 group-hover:opacity-80"
                                        style={{ ...bg.style, opacity: 0.8, backgroundColor: currentTheme.colors.surface }}
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                        <span className="text-[0.625rem] font-black text-white uppercase tracking-widest translate-y-2 group-hover:translate-y-0 transition-transform duration-300">{bg.label}</span>
                                    </div>
                                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">
                                        <span className="text-[0.625rem] font-black uppercase tracking-widest text-white">{bg.label}</span>
                                        {currentBgId === id && <CheckCircle2 size={14} style={{ color: currentTheme.colors.accent }} />}
                                    </div>

                                    {id === 'eigenes' && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 backdrop-blur-sm cursor-default">
                                            {currentCustomImg ? (
                                                <div className="flex flex-col items-center gap-2 relative z-20">
                                                    <img 
                                                        src={currentCustomImg} 
                                                        alt="Custom" 
                                                        className="w-12 h-12 rounded-xl object-cover border border-white/20 shadow-xl"
                                                    />
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleBgSelect('eigenes'); }}
                                                            className={`px-3 py-1 text-[0.5rem] font-black rounded-lg uppercase shadow-lg ${currentBgId === 'eigenes' ? 'bg-amber-500 text-amber-950' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                                                        >
                                                            {currentBgId === 'eigenes' ? 'Aktiv' : 'Wählen'}
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteCustomImage(); }}
                                                            className="p-1 px-2 bg-rose-500/80 text-white shadow-lg rounded-lg hover:bg-rose-500 transition-all"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button 
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                    className="flex flex-col items-center justify-center w-full h-full gap-2 group/upload relative z-20 hover:bg-black/20 transition-all"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover/upload:bg-white/20 transition-colors group-hover/upload:scale-110 duration-300">
                                                        <Upload size={18} className="text-white/70 group-hover/upload:text-white transition-colors" />
                                                    </div>
                                                    <span className="text-[0.625rem] font-black text-white/70 group-hover/upload:text-white uppercase tracking-widest">Upload</span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2 rounded-2xl border p-3" style={{ borderColor: currentTheme.colors.border }}>
                            <button type="button" onClick={() => setCanvaPickerOpen(true)}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold"
                                style={{ borderColor: currentTheme.colors.accent, color: currentTheme.colors.textPrimary }}>
                                <ImageIcon size={16} /> Aus Canva wählen
                            </button>
                            {app.unterrichtsmodus_canvaBild && (
                                <div className="flex items-center gap-3">
                                    <img src={app.unterrichtsmodus_canvaBild} alt="" className="h-16 w-20 rounded-lg border object-contain" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-bold" style={{ color: currentTheme.colors.textPrimary }}>{app.unterrichtsmodus_canvaTitel || 'Canva-Hintergrund'}</p>
                                        <button type="button" onClick={() => handleBgSelect('canva')}
                                            className="mt-1 rounded-lg px-3 py-1 text-xs font-bold text-white"
                                            style={{ backgroundColor: currentTheme.colors.accent }}>
                                            {currentBgId === 'canva' ? 'Aktiv' : 'Als Hintergrund verwenden'}
                                        </button>
                                    </div>
                                    <button type="button" aria-label="Canva-Hintergrund entfernen" title="Canva-Hintergrund entfernen"
                                        onClick={() => setApp(prev => ({
                                            ...prev,
                                            unterrichtsmodus_canvaBild: undefined,
                                            unterrichtsmodus_canvaTitel: undefined,
                                            unterrichtsmodus_hintergrund: prev.unterrichtsmodus_hintergrund === 'canva' ? 'kein' : prev.unterrichtsmodus_hintergrund,
                                        }))} className="rounded-lg p-2 text-rose-500"><Trash2 size={16} /></button>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                    </section>

                    {/* GEBURTSTAGSMODUS */}
                    <section className="space-y-4 pt-4 border-t" style={{ borderColor: currentTheme.colors.border }}>
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} style={{ color: currentTheme.colors.accent }} />
                            <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textPrimary }}>Geburtstagsmodus</h3>
                        </div>
                        <p className="text-[0.6875rem] font-medium" style={{ color: currentTheme.colors.textSecondary }}>
                            Wer wird heute gefeiert? Wähle hier die Geburtstagskinder aus, um im Cockpit spezielle Animationen und Überraschungen (z.B. vom Klassenhaustier) zu aktivieren. Praktisch, wenn Geburtstage z.B. vom Wochenende nachgefeiert werden.
                        </p>
                        
                        <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar p-2 bg-black/5 rounded-xl border" style={{ borderColor: currentTheme.colors.border }}>
                            {app.schueler.map((student) => {
                                const isSelected = (app.unterrichtsmodus_geburtstagskinder || []).includes(student.id);
                                return (
                                    <label key={student.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${isSelected ? 'bg-white shadow-sm' : 'hover:bg-black/5 border-transparent'}`} style={{ borderColor: isSelected ? currentTheme.colors.accent : 'transparent' }}>
                                        <span className="text-[0.8125rem] font-bold" style={{ color: currentTheme.colors.textPrimary }}>
                                            {student.vorname} {student.nachname}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded text-blue-500 focus:ring-blue-500 bg-gray-100 border-gray-300"
                                            checked={isSelected}
                                            onChange={(e) => {
                                                setApp(prev => {
                                                    const existing = prev.unterrichtsmodus_geburtstagskinder || [];
                                                    const nextList = e.target.checked
                                                        ? [...existing, student.id]
                                                        : existing.filter(id => id !== student.id);
                                                    return { ...prev, unterrichtsmodus_geburtstagskinder: nextList };
                                                });
                                            }}
                                        />
                                    </label>
                                );
                            })}
                            {app.schueler.length === 0 && (
                                <p className="text-[0.625rem] text-center italic p-4" style={{ color: currentTheme.colors.textSecondary }}>Keine Schüler angelegt.</p>
                            )}
                        </div>
                    </section>

                    {/* WIDGET CUSTOMIZATION */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} style={{ color: currentTheme.colors.accent }} />
                                <h3 className="text-[0.75rem] leading-tight font-black uppercase tracking-[0.2em]" style={{ color: currentTheme.colors.textPrimary }}>Widget-Leiste</h3>
                            </div>
                            <button
                                onClick={() =>
                                    setApp((p) => ({
                                        ...p,
                                        boardSettings: {
                                            ...p.boardSettings,
                                            toolbarWidgets: undefined,
                                            hiddenToolbarWidgets: [],
                                        },
                                    }))
                                }
                                className="text-[9px] font-black uppercase px-2 py-1 rounded-lg transition-colors"
                                style={{ backgroundColor: `${currentTheme.colors.textPrimary}08`, color: `${currentTheme.colors.textPrimary}66` }}
                            >
                                Reset
                            </button>
                        </div>

                        <div className="flex flex-col gap-1.5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {(app.boardSettings?.toolbarWidgets?.length
                                ? [
                                    ...(app.boardSettings.toolbarWidgets
                                        .map((id) =>
                                            ALL_WIDGET_CONFIG.find((w) => w.id === id),
                                        )
                                        .filter(Boolean) as typeof ALL_WIDGET_CONFIG),
                                    ...ALL_WIDGET_CONFIG.filter(
                                        (w) =>
                                            !app.boardSettings.toolbarWidgets?.includes(
                                                w.id,
                                            ),
                                    ),
                                ]
                                : ALL_WIDGET_CONFIG
                            ).map((tool, index, array) => {
                                if (!tool) return null;
                                const isHidden = (
                                    app.boardSettings?.hiddenToolbarWidgets || []
                                ).includes(tool.id);
                                const currentOrder = app.boardSettings?.toolbarWidgets
                                    ?.length
                                    ? [...app.boardSettings.toolbarWidgets]
                                    : array.map((w) => w.id);
                                return (
                                    <div
                                        key={tool.id}
                                        className="flex items-center justify-between p-3 rounded-2xl border transition-all group/tool"
                                        style={{ backgroundColor: `${currentTheme.colors.textPrimary}05`, borderColor: currentTheme.colors.border }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="p-2 rounded-xl"
                                                style={{ 
                                                    backgroundColor: isHidden ? `${currentTheme.colors.textPrimary}0d` : `${currentTheme.colors.accent}1a`,
                                                    color: isHidden ? `${currentTheme.colors.textPrimary}33` : currentTheme.colors.accent
                                                }}
                                            >
                                                <tool.icon size={16} />
                                            </div>
                                            <span
                                                className="text-[0.75rem] font-bold uppercase tracking-wider"
                                                style={{ color: isHidden ? `${currentTheme.colors.textPrimary}33` : currentTheme.colors.textPrimary }}
                                            >
                                                {tool.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex rounded-lg overflow-hidden border opacity-0 group-hover/tool:opacity-100 transition-opacity" style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }}>
                                                <button
                                                    onClick={() => {
                                                        const idx = currentOrder.indexOf(tool.id);
                                                        if (idx > 0) {
                                                            const next = [...currentOrder];
                                                            [next[idx - 1], next[idx]] = [
                                                                next[idx],
                                                                next[idx - 1],
                                                            ];
                                                            setApp((p) => ({
                                                                ...p,
                                                                boardSettings: {
                                                                    ...p.boardSettings,
                                                                    toolbarWidgets: next,
                                                                },
                                                            }));
                                                        }
                                                    }}
                                                    className="p-1.5 hover:text-amber-400"
                                                    style={{ color: `${currentTheme.colors.textPrimary}4d` }}
                                                >
                                                    <ChevronLeft
                                                        size={14}
                                                        className="rotate-90"
                                                    />
                                                </button>
                                                <div className="w-[1px]" style={{ backgroundColor: currentTheme.colors.border }} />
                                                <button
                                                    onClick={() => {
                                                        const idx = currentOrder.indexOf(tool.id);
                                                        if (idx < currentOrder.length - 1) {
                                                            const next = [...currentOrder];
                                                            [next[idx], next[idx + 1]] = [
                                                                next[idx + 1],
                                                                next[idx],
                                                            ];
                                                            setApp((p) => ({
                                                                ...p,
                                                                boardSettings: {
                                                                    ...p.boardSettings,
                                                                    toolbarWidgets: next,
                                                                },
                                                            }));
                                                        }
                                                    }}
                                                    className="p-1.5 hover:text-amber-400"
                                                    style={{ color: `${currentTheme.colors.textPrimary}4d` }}
                                                >
                                                    <ChevronRight
                                                        size={14}
                                                        className="rotate-90"
                                                    />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const hidden =
                                                        app.boardSettings?.hiddenToolbarWidgets ||
                                                        [];
                                                    const next = isHidden
                                                        ? hidden.filter((h) => h !== tool.id)
                                                        : [...hidden, tool.id];
                                                    setApp((p) => ({
                                                        ...p,
                                                        boardSettings: {
                                                            ...p.boardSettings,
                                                            hiddenToolbarWidgets: next,
                                                        },
                                                    }));
                                                }}
                                                className="p-2 rounded-xl transition-all border"
                                                style={{ 
                                                    backgroundColor: isHidden ? 'transparent' : `${currentTheme.colors.accent}1a`,
                                                    borderColor: isHidden ? currentTheme.colors.border : currentTheme.colors.accent,
                                                    color: isHidden ? `${currentTheme.colors.textPrimary}33` : currentTheme.colors.accent
                                                }}
                                                title={isHidden ? "Einblenden" : "Ausblenden"}
                                            >
                                                {isHidden ? (
                                                    <X size={12} strokeWidth={3} />
                                                ) : (
                                                    <Check size={12} strokeWidth={3} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t" style={{ borderColor: currentTheme.colors.border, backgroundColor: `${currentTheme.colors.surface}80` }}>
                    <button 
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl font-black text-[0.75rem] leading-tight uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
                        style={{ 
                            backgroundColor: currentTheme.colors.accent, 
                            color: currentTheme.colors.buttonText
                        }}
                    >
                        Speichern & Schließen
                    </button>
                </div>
            </motion.div>
        </div>
        {canvaPickerOpen && createPortal(
            <CanvaDesignChooser onChoose={handleCanvaBackground} onClose={() => setCanvaPickerOpen(false)} busy={canvaBusy} />,
            document.body
        )}
        </>
    );
};
