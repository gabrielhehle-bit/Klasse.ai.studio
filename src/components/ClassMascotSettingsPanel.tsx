import React from 'react';
import { createPortal } from 'react-dom';
import { Cloud, CloudOff, Loader2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { AppState } from '../types';
import { UNTERRICHTSMODUS_THEMES } from '../lib/unterrichtsmodusThemes';
import { MASCOT_OPTIONS, normalizeClassMascot, selectClassMascot } from '../lib/classMascot';
import ClassMascotArtwork from './cockpit/ClassMascotArtwork';

interface ClassMascotSettingsPanelProps {
    app: AppState;
    setApp: React.Dispatch<React.SetStateAction<AppState>>;
    isOpen: boolean;
    onClose: () => void;
    onRecenterMascot: () => void;
}

/** Dedicated mascot settings; the board continues to display only the transparent figure. */
export default function ClassMascotSettingsPanel({ app, setApp, isOpen, onClose, onRecenterMascot }: ClassMascotSettingsPanelProps) {
    const { accountSyncStatus, accountSyncLastAt, accountSyncMessage, retryAccountSync } = useApp();
    const [retryingSync, setRetryingSync] = React.useState(false);
    const syncIsConfirmed = accountSyncStatus === 'synced';
    const syncNeedsAttention = accountSyncStatus === 'error' || accountSyncStatus === 'conflict' || accountSyncStatus === 'local-error';
    const mascotSyncLabel = syncIsConfirmed
        ? 'Änderungen auf dem Server bestätigt'
        : accountSyncStatus === 'saving-local' ? 'Wird verschlüsselt auf diesem Gerät gespeichert …'
        : accountSyncStatus === 'saved-local' ? 'Lokal gespeichert · Cloud-Bestätigung steht aus'
        : accountSyncStatus === 'syncing' ? 'Verschlüsselte Übertragung läuft …'
        : accountSyncStatus === 'disabled' ? 'Geräteübergreifender Sync nicht aktiv'
        : accountSyncStatus === 'conflict' ? 'Zwei Geräte haben unterschiedliche Änderungen'
        : accountSyncStatus === 'local-error' ? 'Letzte Änderung nicht lokal gespeichert'
        : accountSyncStatus === 'error' ? 'Cloud-Abgleich fehlgeschlagen'
        : 'Geräteübergreifenden Sync prüfen …';
    const currentTheme = UNTERRICHTSMODUS_THEMES[app.unterrichtsmodus_theme || app.theme || 'classic_light']
        || UNTERRICHTSMODUS_THEMES.classic_light;
    React.useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed inset-0 z-[10020] flex items-center justify-end p-3 sm:p-5" aria-label="Klassenmaskottchen-Einstellungen">
            <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose} aria-label="Klassenmaskottchen-Einstellungen schließen" />
            <div role="dialog" aria-modal="true" aria-labelledby="class-mascot-panel-title"
                className="relative flex h-full max-h-full w-full max-w-md flex-col overflow-hidden rounded-3xl border shadow-2xl"
                style={{ backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }}>
                <header className="flex shrink-0 items-center justify-between gap-3 border-b p-5"
                    style={{ borderColor: currentTheme.colors.border }}>
                    <div>
                        <h2 id="class-mascot-panel-title" className="text-lg font-black"
                            style={{ color: currentTheme.colors.textPrimary }}>🐾 Klassenmaskottchen</h2>
                        <p className="mt-1 text-xs font-semibold" style={{ color: currentTheme.colors.textSecondary }}>
                            Figur, Stimmung und Größe für diese Klasse einstellen
                        </p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Schließen"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border"
                        style={{ color: currentTheme.colors.textPrimary, borderColor: currentTheme.colors.border }}>
                        <X size={20} />
                    </button>
                </header>
                <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <section aria-label="Geräteübergreifender Maskottchen-Sync" className="space-y-2 rounded-2xl border p-4"
                        style={{ borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }}>
                        <div className="flex items-center gap-2 text-sm font-black" style={{ color: currentTheme.colors.textPrimary }}>
                            {syncIsConfirmed ? <Cloud size={17} aria-hidden="true" /> :
                                syncNeedsAttention || accountSyncStatus === 'disabled' ? <CloudOff size={17} aria-hidden="true" /> :
                                    <Loader2 size={17} className="animate-spin" aria-hidden="true" />}
                            Geräteübergreifender Sync
                        </div>
                        <p role="status" aria-live="polite" className="text-xs font-bold"
                            style={{ color: currentTheme.colors.textPrimary }}>{mascotSyncLabel}</p>
                        {syncIsConfirmed && accountSyncLastAt && (
                            <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                                Letzte Serverbestätigung: {new Date(accountSyncLastAt).toLocaleString('de-AT')}
                            </p>
                        )}
                        <p className="text-xs leading-relaxed" style={{ color: currentTheme.colors.textSecondary }}>
                            Figur, Name, Stimmung, Größe und Position werden mit deinem verschlüsselten KLASSIO-Konto übertragen.
                            Öffne auf dem zweiten Gerät dasselbe Konto und entsperre deinen Tresor.
                            Wechsle erst, wenn hier die aktuelle Änderung vom Server bestätigt ist.
                        </p>
                        {accountSyncStatus === 'disabled' && (
                            <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
                                Melde dich unter Einstellungen → Konto & Schulmail mit derselben E-Mail-Adresse an.
                            </p>
                        )}
                        {syncNeedsAttention && (
                            <>
                                <p className="text-xs font-semibold" style={{ color: currentTheme.colors.textPrimary }}>
                                    {accountSyncMessage || 'Bitte KLASSIO auf diesem Gerät geöffnet lassen und den Kontostatus prüfen.'}
                                </p>
                                <button type="button" disabled={retryingSync}
                                    onClick={() => { setRetryingSync(true); void retryAccountSync().finally(() => setRetryingSync(false)); }}
                                    className="min-h-11 rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-50"
                                    style={{ color: currentTheme.colors.textPrimary, borderColor: currentTheme.colors.border }}>
                                    {retryingSync ? 'Prüfe …' : 'Sync erneut prüfen'}
                                </button>
                                {accountSyncStatus === 'conflict' && (
                                    <p className="text-xs" style={{ color: currentTheme.colors.textSecondary }}>
                                        Einen Konflikt bewusst unter Einstellungen → Konto & Schulmail lösen. Nichts wird automatisch überschrieben.
                                    </p>
                                )}
                            </>
                        )}
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


                </div>
                <footer className="shrink-0 border-t p-4" style={{ borderColor: currentTheme.colors.border }}>
                    <button type="button" onClick={onClose}
                        className="min-h-11 w-full rounded-xl px-4 py-2 text-sm font-black"
                        style={{ backgroundColor: currentTheme.colors.accent, color: currentTheme.colors.buttonText }}>
                        Fertig
                    </button>
                </footer>
            </div>
        </div>,
        document.body,
    );
}
