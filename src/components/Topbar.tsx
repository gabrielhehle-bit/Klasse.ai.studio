import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Menu, Sun, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind,
  ChevronDown, ChevronRight, FlagTriangleLeft, Wifi, Smartphone, X, Copy, Search,
  Maximize, Minimize, Lock, ShieldAlert, ShieldCheck, ExternalLink, RefreshCw,
  MoreHorizontal, Settings, LogOut, Heart, Bug, ArrowLeft, Save
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStartYear, getSchulstartKW, kwToMonday, getCurrentSchuljahr } from '../lib/utils';
import { getFerien } from '../lib/ferienOesterreich';
import { QRCodeCanvas } from 'qrcode.react';
import { scanDataConsistency } from '../lib/DataConsistencyService';
import { startSyncSession, createSyncUrl, getActiveEncodedSessionKey } from '../lib/syncService';
import { clearTrustedDeviceUnlock } from '../lib/trustedDeviceVault';
import { Button, IconButton, Badge } from './ui';
import SupportModal from './SupportModal';
import { getNavigationParent } from '../lib/navigationHierarchy';
import { getQuietSyncBadge } from '../lib/quietSyncBadge';
import { triggerBackupDownload } from '../utils/backupUtils';

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const Topbar = memo(({ title, onMenuClick, actions, className }: TopbarProps) => {
  const { app, setApp, setScreenLocked, setPage, lockAppVault, accountSyncStatus, isVaultUnlocked } = useApp();
  const { showToast } = useToast();
  const consistencyIssues = React.useMemo(() => scanDataConsistency(app), [app]);
  const currentPage = app.currentPage || 'dashboard';
  const navigationParent = React.useMemo(() => getNavigationParent(currentPage), [currentPage]);

  // Dropdown States
  const [showMehrMenu, setShowMehrMenu] = useState(false);
  const [manualBackupBusy, setManualBackupBusy] = useState(false);
  const createManualBackup = async () => {
    if (manualBackupBusy || !isVaultUnlocked) return;
    setManualBackupBusy(true);
    try {
      await triggerBackupDownload(app);
      showToast('Verschlüsselte Backup-Datei wurde zum Herunterladen bereitgestellt. Bitte im Downloads-Ordner prüfen und sicher aufbewahren.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Backup konnte nicht erstellt werden. Daten bleiben unverändert.', 'error');
    } finally {
      setManualBackupBusy(false);
    }
  };
  const [showWeatherDetails, setShowWeatherDetails] = useState(false);
  const [showSchoolYearDetails, setShowSchoolYearDetails] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // State for Modals & Systems
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  // Keep the prominent label steady; the exact state stays accessible via tooltip and account settings.
  const cloudSaveBadge = getQuietSyncBadge(accountSyncStatus, isOnline);
  const [showLargeQR, setShowLargeQR] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'remote' | 'wifi'>('remote');
  const [wifiSsid, setWifiSsid] = useState(app.boardSettings?.wifiSettings?.ssid || '');
  const [wifiPassword, setWifiPassword] = useState(app.boardSettings?.wifiSettings?.password || '');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'nopass'>(app.boardSettings?.wifiSettings?.security || 'WPA');
  const [isWifiFullscreen, setIsWifiFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync Code Management (Zero-Knowledge)
  const ensureSyncCode = async () => {
    if (!app?.boardSettings?.activeSyncCode) {
      try {
        const { code } = await startSyncSession(app);
        setApp((p: any) => ({
          ...p,
          boardSettings: {
            ...p.boardSettings,
            activeSyncCode: code,
            isRemoteController: false,
          },
        }));
      } catch (e) {
        console.error("Error generating Zero-Knowledge sync session:", e);
      }
    }
  };

  useEffect(() => {
    if (!app?.boardSettings?.activeSyncCode) {
      ensureSyncCode();
    }
  }, [app?.boardSettings?.activeSyncCode]);

  const openHandyKopplungModal = (tab: 'remote' | 'wifi' = 'remote') => {
    setQrModalTab(tab);
    setShowLargeQR(true);
    setShowMehrMenu(false);
    ensureSyncCode();
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLargeQR(false);
        setShowMehrMenu(false);
        setShowWeatherDetails(false);
        setShowSchoolYearDetails(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchWeather() {
      const schoolPlace = (app?.schulOrt || '').trim();
      if (!schoolPlace) {
        setWeather(null);
        setForecast([]);
        return;
      }

      try {
        const geoRes = await fetch(`/api/weather/geocode?city=${encodeURIComponent(schoolPlace)}`);
        if (!geoRes.ok) throw new Error(`Weather geocoding HTTP error: ${geoRes.status}`);
        const geo = await geoRes.json();
        const result = Array.isArray(geo?.results) ? geo.results[0] : null;
        const latitude = Number(result?.latitude);
        const longitude = Number(result?.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          throw new Error('Für den Schulort wurden keine Wetterkoordinaten gefunden.');
        }

        const url = `/api/weather?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FVienna`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Weather fetch HTTP error: ${res.status}`);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) throw new Error('Weather fetch returned non-JSON content');
        const d = await res.json();
        setWeather(d.current_weather || null);

        if (d.daily && Array.isArray(d.daily.time)) {
          const days = d.daily.time.map((time: string, i: number) => ({
            date: new Date(time),
            code: d.daily.weathercode?.[i],
            max: d.daily.temperature_2m_max?.[i],
            min: d.daily.temperature_2m_min?.[i]
          })).filter((day: any) =>
            Number.isFinite(day.code) &&
            Number.isFinite(day.max) &&
            Number.isFinite(day.min)
          );
          setForecast(days);
        } else {
          setForecast([]);
        }
      } catch (e) {
        console.warn('Wetterdaten konnten nicht geladen werden.', e);
        setWeather(null);
        setForecast([]);
      }
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [app?.schulOrt]);

  const startYear = React.useMemo(() => getStartYear(app?.schuljahr), [app?.schuljahr]);
  const schoolYearStart = React.useMemo(() => kwToMonday(getSchulstartKW(app?.schuljahr, app?.bundesland), startYear), [app?.schuljahr, app?.bundesland, startYear]);
  
  const summerStart = React.useMemo(() => {
    const ferien = getFerien(app?.bundesland || 'VBG', app?.schuljahr || getCurrentSchuljahr());
    const sommer = ferien.find(f => f.id.startsWith('sommer_'));
    if (sommer && sommer.startMonth !== undefined && sommer.startDay !== undefined) {
      return new Date(sommer.year || (startYear + 1), sommer.startMonth, sommer.startDay);
    }
    return new Date(startYear + 1, 6, (app?.bundesland === 'W' || app?.bundesland === 'NOE' || app?.bundesland === 'BGL') ? 4 : 11);
  }, [startYear, app?.bundesland, app?.schuljahr]);

  const { schoolDaysTotal, schoolDaysRemaining, schoolYearProgressPercent } = React.useMemo(() => {
    const getSchoolDaysRemaining = (start: Date, end: Date) => {
      let count = 0;
      let current = new Date(start);
      let maxSteps = 1000;
      while (current < end && maxSteps-- > 0) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }
      return count;
    };

    const total = getSchoolDaysRemaining(schoolYearStart, summerStart);
    const startOfCurrentDay = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    const remaining = getSchoolDaysRemaining(startOfCurrentDay, summerStart);
    const percent = Math.max(0, Math.min(100, ((total - remaining) / (total || 1)) * 100));

    return {
      schoolDaysTotal: total,
      schoolDaysRemaining: remaining,
      schoolYearProgressPercent: percent
    };
  }, [schoolYearStart, summerStart, currentTime.toDateString()]);

  const getWeatherText = (code: number) => {
    if (code === 0) return "Sonnig / Klar";
    if (code <= 3) return "Leicht bewölkt";
    if (code <= 48) return "Nebel / Dunst";
    if (code <= 67) return "Regen";
    if (code <= 77) return "Schneefall";
    if (code <= 82) return "Regenschauer";
    if (code >= 95) return "Gewitter";
    return "Bewölkt";
  };

  const getWeatherIcon = (code: number, size = 18) => {
    if (code === 0) return <Sun size={size} className="text-amber-500" />;
    if (code <= 3) return <CloudSun size={size} className="text-slate-400" />;
    if (code <= 48) return <Wind size={size} className="text-slate-300" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code <= 77) return <CloudSnow size={size} className="text-sky-200" />;
    if (code >= 95) return <CloudLightning size={size} className="text-purple-500" />;
    return <Cloud size={size} className="text-slate-400" />;
  };

  const threeDayForecast = React.useMemo(() => {
    if (!forecast || forecast.length === 0) return [];
    const labels = ["Heute", "Morgen", "Übermorgen"];
    return forecast.slice(0, 3).map((f, i) => ({
      label: labels[i] || f.date.toLocaleDateString("de-DE", { weekday: "short" }),
      code: f.code,
      max: f.max,
      min: f.min
    }));
  }, [forecast]);

  const handleGlobalSearch = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        showToast(`Fehler beim Vollbild: ${err.message}`, "error");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLogout = async () => {
    // A calm "Autospeichern" badge covers several distinct states. Logout
    // must not silently discard a pending local write or leave the teacher
    // believing that data is already accessible from another computer.
    if (accountSyncStatus !== 'synced' && accountSyncStatus !== 'disabled' && accountSyncStatus !== 'idle') {
      showToast('Bitte noch nicht abmelden: Die neuesten Daten sind nicht auf allen Geräten bestätigt. Prüfe den Speicherstatus und erstelle gegebenenfalls auf diesem Gerät ein verschlüsseltes Backup.', 'error');
      setShowMehrMenu(false);
      return;
    }
    const confirmed = window.confirm(
      accountSyncStatus === 'synced'
        ? 'Wirklich abmelden? Der neueste verschlüsselte Stand ist vom Server bestätigt. Beim nächsten Login benötigst du wieder dein Tresor-Passwort.'
        : 'Wirklich abmelden? Der Geräte-Abgleich ist derzeit NICHT als erfolgreich bestätigt. Bitte vorher ein verschlüsseltes Backup erstellen und sichere es außerhalb dieses Browsers. Daten, die nur auf diesem Gerät liegen, sind auf einem anderen PC nicht verfügbar.'
    );
    if (!confirmed) return;

    setShowMehrMenu(false);
    try {
      lockAppVault();
      await clearTrustedDeviceUnlock();
    } catch (error) {
      console.warn('Lokale Entsperrung konnte beim Abmelden nicht vollständig entfernt werden.', error);
    }
    window.dispatchEvent(new CustomEvent('lehrerapp-logout'));
  };

  return (
    <header className={`flex flex-col sticky top-0 z-[100] topbar no-print print:hidden ${className || ''}`}>
      {/* Haupt-Header Zeile */}
      <div className="bg-[var(--surface-card,var(--surface))]/95 backdrop-blur-xl border-b border-[var(--border-default,var(--border))] py-2.5 px-3 sm:px-6 shadow-xs">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 sm:gap-4 w-full">
          
          {/* Linker Bereich: Navigation, Rückweg und Seitentitel */}
          <div className="flex items-center gap-2 min-w-0">
            <IconButton
              variant="secondary"
              className="lg:hidden shrink-0"
              aria-label="Navigation öffnen"
              title="Hauptmenü öffnen"
              onClick={onMenuClick}
            >
              <Menu size={20} />
            </IconButton>

            {navigationParent && (
              <button
                type="button"
                onClick={() => setPage(navigationParent.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-2.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--accent)]/35 hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))] shrink-0"
                title={`Zurück zu ${navigationParent.label}`}
                aria-label={`Zurück zu ${navigationParent.label}`}
              >
                <ArrowLeft size={14} />
                <span className="hidden xl:inline">{navigationParent.label}</span>
              </button>
            )}

            <div className="hidden md:flex min-w-0 flex-col leading-tight">
              {navigationParent && (
                <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] truncate">
                  {navigationParent.label}
                </span>
              )}
              <span className="max-w-[220px] xl:max-w-[320px] truncate text-sm font-black text-[var(--text-primary)]">
                {title}
              </span>
            </div>
          </div>

          {/* Rechter Bereich: Wetter & Schuljahr-Zeitdiagramm & PayPal & Fehler melden & Mehr */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button type="button" onClick={() => void createManualBackup()} disabled={manualBackupBusy || !isVaultUnlocked}
              aria-label="Jetzt verschlüsseltes Backup herunterladen" title="Verschlüsseltes Backup dieser KLASSIO-Daten als Datei herunterladen"
              className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-300 bg-indigo-50 px-2 text-indigo-800 shadow-xs hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 sm:px-3">
              <Save size={19} aria-hidden="true" />
              <span className="hidden lg:inline text-xs font-extrabold">Backup</span>
            </button>
            {cloudSaveBadge && (
              <button type="button" onClick={() => setPage('settings')}
                aria-label={`Speicherstatus: ${cloudSaveBadge.text}. ${cloudSaveBadge.description}. Konto öffnen.`}
                title={cloudSaveBadge.description}
                className={`inline-flex min-h-9 max-w-[180px] shrink-0 items-center justify-center rounded-xl border px-2 text-[0.6875rem] font-black leading-tight shadow-xs sm:px-3 ${cloudSaveBadge.color}`}>
                <span className="truncate">{cloudSaveBadge.text}</span>
              </button>
            )}
            {/* Wetter Anzeige mit Klick-Details */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setShowWeatherDetails(!showWeatherDetails);
                  setShowSchoolYearDetails(false);
                  setShowMehrMenu(false);
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-2xl font-bold text-xs shrink-0 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                  showWeatherDetails 
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-card,var(--surface))] border-[var(--border-default,var(--border))] text-[var(--text-primary)]'
                }`}
                title="Wetter & 3-Tages-Vorschau öffnen"
              >
                {weather ? getWeatherIcon(weather.weathercode, 16) : <Cloud size={16} className="text-slate-400" />}
                <span>{weather ? `${Math.round(weather.temperature)}°C` : '—'}</span>
              </button>

              {/* Wetter Details Popover */}
              {showWeatherDetails && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowWeatherDetails(false)} />
                  <div className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 bg-[var(--surface-card,var(--surface))]/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[var(--border-default,var(--border))] p-4 min-w-[280px] sm:min-w-[320px] z-[101] space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--text-primary)]">
                    
                    {/* Popover Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle,var(--border))]">
                      <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                        {weather ? getWeatherIcon(weather.weathercode, 18) : <Cloud size={18} className="text-slate-400" />}
                        <span>Wetter-Details</span>
                      </div>
                      <Badge variant="neutral" size="sm">Live &amp; 3-Tage</Badge>
                    </div>

                    {/* Aktueller Status */}
                    <div className="bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] p-3 rounded-2xl flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-black text-[var(--text-primary)]">
                          {weather ? `${Math.round(weather.temperature)}°C` : '—'}
                        </div>
                        <div className="text-xs font-bold text-[var(--text-secondary)]">
                          {weather ? getWeatherText(weather.weathercode) : 'Wetter nicht verfügbar'}
                        </div>
                      </div>
                      <div className="text-right text-[0.6875rem] font-medium text-[var(--text-muted)] space-y-0.5">
                        <div>Wind: {weather ? `${Math.round(weather.windspeed)} km/h` : '—'}</div>
                        <div>Region: {app?.schulOrt || 'Ort nicht gesetzt'}</div>
                      </div>
                    </div>

                    {/* 3-Tages-Vorschau */}
                    <div className="space-y-1.5">
                      <div className="text-[0.625rem] font-bold uppercase text-[var(--text-muted)] tracking-wider">
                        3-Tages-Prognose
                      </div>
                      {threeDayForecast.length > 0 ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          {threeDayForecast.map((item, idx) => (
                            <div key={idx} className="bg-[var(--surface-subtle,var(--surface2))] p-2 rounded-xl border border-[var(--border-default,var(--border))] flex flex-col items-center text-center space-y-0.5">
                              <span className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-tight">
                                {item.label}
                              </span>
                              <div className="my-0.5">
                                {getWeatherIcon(item.code, 18)}
                              </div>
                              <div className="text-[0.625rem] font-bold text-[var(--text-primary)]">
                                {item.max}° <span className="text-[var(--text-muted)] font-normal text-[0.5625rem]">{item.min}°</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-[var(--border-default,var(--border))] px-3 py-4 text-center text-[0.6875rem] font-medium text-[var(--text-muted)]">
                          Keine Wetterprognose verfügbar.
                        </div>
                      )}
                    </div>

                    {/* Info Footer */}
                    <div className="pt-1 text-[0.5625rem] text-center text-[var(--text-muted)] font-medium">
                      Automatisch aktualisiert • Open-Meteo
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Schuljahr-Zeitdiagramm (% vorbei) mit Klick-Details */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => {
                  setShowSchoolYearDetails(!showSchoolYearDetails);
                  setShowWeatherDetails(false);
                  setShowMehrMenu(false);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 border rounded-2xl font-bold text-xs shrink-0 shadow-2xs transition-all cursor-pointer active:scale-95 ${
                  showSchoolYearDetails
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-xs'
                    : 'bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-card,var(--surface))] border-[var(--border-default,var(--border))] text-[var(--text-primary)]'
                }`}
                title="Schuljahr-Details & Zeitstrahl öffnen"
              >
                <FlagTriangleLeft size={14} className={showSchoolYearDetails ? "text-white" : "text-[var(--accent)]"} />
                <div className="flex flex-col gap-0.5 min-w-[70px] sm:min-w-[110px]">
                  <div className="flex items-center justify-between text-[0.625rem] font-bold leading-none">
                    <span>Schuljahr</span>
                    <span className={showSchoolYearDetails ? "text-white font-black" : "text-[var(--accent)] font-black"}>{Math.round(schoolYearProgressPercent)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, Math.min(100, schoolYearProgressPercent))}%` }}
                    />
                  </div>
                </div>
              </button>

              {/* Schuljahr Details Popover */}
              {showSchoolYearDetails && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowSchoolYearDetails(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-[var(--surface-card,var(--surface))]/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[var(--border-default,var(--border))] p-4 min-w-[290px] sm:min-w-[340px] z-[101] space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150 text-[var(--text-primary)]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle,var(--border))]">
                      <div className="flex items-center gap-2 font-bold text-xs text-[var(--text-primary)]">
                        <FlagTriangleLeft size={16} className="text-[var(--accent)]" />
                        <span>Schuljahr-Fortschritt</span>
                      </div>
                      <Badge variant="accent" size="sm">
                        {Math.round(schoolYearProgressPercent)}% geschafft
                      </Badge>
                    </div>

                    {/* Großer Fortschrittsbalken */}
                    <div className="bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] p-3 rounded-2xl space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold text-[var(--text-primary)]">
                        <span>{app?.schuljahr || getCurrentSchuljahr()}</span>
                        <span className="text-[var(--accent)]">{schoolDaysRemaining} Schultage verbleibend</span>
                      </div>
                      <div className="h-2.5 w-full bg-[var(--surface-muted)] rounded-full overflow-hidden p-0.5 border border-[var(--border-subtle,var(--border))]">
                        <div 
                          className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(4, Math.min(100, schoolYearProgressPercent))}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[0.625rem] font-bold text-[var(--text-muted)]">
                        <span>Schulstart (Sep)</span>
                        <span>Sommerferien (Juli)</span>
                      </div>
                    </div>

                    {/* Kennzahlen Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-[var(--surface-subtle,var(--surface2))] p-2.5 rounded-2xl border border-[var(--border-default,var(--border))]">
                        <div className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase">Verbleibende Schultage</div>
                        <div className="text-lg font-black text-[var(--accent)]">{schoolDaysRemaining} Tage</div>
                      </div>
                      <div className="bg-[var(--surface-subtle,var(--surface2))] p-2.5 rounded-2xl border border-[var(--border-default,var(--border))]">
                        <div className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase">Schultage gesamt</div>
                        <div className="text-lg font-black text-[var(--text-primary)]">{schoolDaysTotal} Tage</div>
                      </div>
                      <div className="bg-[var(--surface-subtle,var(--surface2))] p-2.5 rounded-2xl border border-[var(--border-default,var(--border))]">
                        <div className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase">Schulstart</div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {schoolYearStart.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                      <div className="bg-[var(--surface-subtle,var(--surface2))] p-2.5 rounded-2xl border border-[var(--border-default,var(--border))]">
                        <div className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase">Sommerferien-Start</div>
                        <div className="text-xs font-bold text-[var(--text-primary)]">
                          {summerStart.toLocaleDateString("de-DE", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>

            {actions && (
              <div className="flex items-center gap-2 shrink-0">
                {actions}
              </div>
            )}

            {/* Direkt erreichbar auf jeder Seite: Rückmeldung und freiwillige Unterstützung. */}
            <a
              href="https://docs.google.com/spreadsheets/d/15bWUTQyXcJnVKkR9VlIR-h2CMJ3a8ua5GO68JT7vmDc/edit?gid=1159556393#gid=1159556393"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring,var(--accent))]"
              aria-label="Fehler oder Verbesserung melden"
              title="Fehler oder Verbesserung melden"
            >
              <Bug size={16} className="text-amber-600" aria-hidden="true" />
              <span className="hidden 2xl:inline">Fehler / Verbesserung melden</span>
            </a>

            <button
              type="button"
              onClick={() => {
                setShowMehrMenu(false);
                setShowSupportModal(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Klassio freiwillig über PayPal unterstützen"
              title="Klassio freiwillig über PayPal unterstützen"
            >
              <Heart size={16} className="fill-rose-500/20" aria-hidden="true" />
              <span className="hidden 2xl:inline">Unterstützen</span>
            </button>

            {/* Menü „Mehr“ */}
            <div className="relative">
              <Button
                variant={showMehrMenu ? "primary" : "secondary"}
                size="sm"
                onClick={() => {
                  setShowMehrMenu(!showMehrMenu);
                }}
                leftIcon={<MoreHorizontal size={18} />}
                rightIcon={<ChevronDown size={14} className={`transition-transform ${showMehrMenu ? 'rotate-180' : ''}`} />}
                title="Weitere Optionen & Werkzeuge"
              >
                <span className="hidden xs:inline">Mehr</span>
                {consistencyIssues.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-[var(--danger-text)] animate-pulse shrink-0 ml-0.5" />
                )}
              </Button>

              {/* „Mehr“ Dropdown Popover */}
              {showMehrMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowMehrMenu(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-[var(--surface-card,var(--surface))]/98 backdrop-blur-2xl rounded-3xl shadow-2xl border border-[var(--border-default,var(--border))] p-4 min-w-[280px] max-w-xs sm:max-w-sm z-[101] space-y-3.5 animate-in fade-in slide-in-from-top-3 duration-200 max-h-[85vh] overflow-y-auto custom-scrollbar text-[var(--text-primary)]">
                    
                    {/* Schnellauswahl: Suche */}
                    <div>
                      <button
                        onClick={() => {
                          setShowMehrMenu(false);
                          handleGlobalSearch();
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-2xl text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer shadow-3xs"
                      >
                        <Search size={15} className="text-[var(--accent)] shrink-0" />
                        <span>Globale Suche</span>
                      </button>
                    </div>

                    {/* Geräte */}
                    <div className="space-y-1.5">
                      <div className="text-[0.5625rem] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">
                        Geräte
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => openHandyKopplungModal('remote')}
                          className="flex flex-col items-center justify-center p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-2xl text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer gap-1 text-center"
                        >
                          <Smartphone size={16} className="text-emerald-500" />
                          <span className="text-[0.6875rem]">Handy-Remote</span>
                        </button>
                        <button
                          onClick={() => openHandyKopplungModal('wifi')}
                          className="flex flex-col items-center justify-center p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-2xl text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer gap-1 text-center"
                        >
                          <Wifi size={16} className="text-blue-500" />
                          <span className="text-[0.6875rem]">WLAN QR-Code</span>
                        </button>
                      </div>
                    </div>

                    {/* Sicherheit */}
                    <div className="space-y-1.5">
                      <div className="text-[0.5625rem] font-bold uppercase tracking-widest text-[var(--text-muted)] px-1">
                        Sicherheit
                      </div>
                      <div className="grid grid-cols-1 gap-1">
                        <button
                          onClick={() => {
                            setShowMehrMenu(false);
                            lockAppVault();
                          }}
                          className="w-full flex items-center gap-2 p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border-default,var(--border))] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <ShieldCheck size={15} className="text-[var(--accent)]" />
                          <span>Datentresor sperren (RAM leeren)</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowMehrMenu(false);
                            setScreenLocked(true);
                          }}
                          className="w-full flex items-center gap-2 p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--danger-soft)] hover:text-[var(--danger-text)] border border-[var(--border-default,var(--border))] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <Lock size={15} className="text-rose-500" />
                          <span>Bildschirm sofort sperren</span>
                        </button>

                        <button
                          onClick={toggleFullscreen}
                          className="w-full flex items-center justify-between p-2.5 bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {isFullscreen ? <Minimize size={15} className="text-[var(--accent)]" /> : <Maximize size={15} className="text-[var(--accent)]" />}
                            <span>Vollbildmodus</span>
                          </div>
                          <span className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase">
                            {isFullscreen ? 'Aktiv' : 'Inaktiv'}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setShowMehrMenu(false);
                            window.dispatchEvent(new CustomEvent('open-data-consistency'));
                          }}
                          className={`w-full flex items-center justify-between p-2.5 border rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            consistencyIssues.length > 0 
                              ? 'bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-text)]'
                              : 'bg-[var(--surface-subtle,var(--surface2))] hover:bg-[var(--surface-muted)] border-[var(--border-default,var(--border))] text-[var(--text-primary)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ShieldAlert size={15} className={consistencyIssues.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                            <span>Datenkonsistenz</span>
                          </div>
                          <Badge variant={consistencyIssues.length > 0 ? "warning" : "success"} size="sm">
                            {consistencyIssues.length > 0 ? `${consistencyIssues.length} Fehler` : 'OK'}
                          </Badge>
                        </button>
                      </div>
                    </div>

                    {/* Konto & Hilfe */}
                    <div className="border-t border-[var(--border-subtle,var(--border))] pt-2 space-y-1">
                      <a
                        href="https://docs.google.com/spreadsheets/d/15bWUTQyXcJnVKkR9VlIR-h2CMJ3a8ua5GO68JT7vmDc/edit?gid=1159556393#gid=1159556393"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setShowMehrMenu(false)}
                        className="w-full flex items-center justify-between p-2 bg-[var(--surface-card,var(--surface))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Fehler oder Feedback direkt in Google Sheet eintragen"
                      >
                        <div className="flex items-center gap-2">
                          <Bug size={15} className="text-amber-500 shrink-0" />
                          <span>Fehler melden (Google Sheet)</span>
                        </div>
                        <ExternalLink size={13} className="text-[var(--text-muted)]" />
                      </a>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMehrMenu(false);
                          setShowSupportModal(true);
                        }}
                        className="w-full flex items-center justify-between p-2 bg-[var(--surface-card,var(--surface))] hover:bg-[var(--surface-muted)] border border-[var(--border-default,var(--border))] rounded-xl text-xs font-bold text-[var(--text-primary)] transition-colors cursor-pointer"
                        title="Klassio freiwillig unterstützen"
                      >
                        <div className="flex items-center gap-2">
                          <Heart size={15} className="text-rose-500 fill-rose-500/20 shrink-0" />
                          <span>Klassio unterstützen</span>
                        </div>
                        <ChevronRight size={13} className="text-[var(--text-muted)]" />
                      </button>

                      <button
                        onClick={() => {
                          setShowMehrMenu(false);
                          setPage('settings');
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-subtle,var(--surface2))] transition-colors cursor-pointer"
                      >
                        <Settings size={15} className="text-[var(--text-muted)]" />
                        <span>Haupteinstellungen</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[var(--warning-border,var(--border))] bg-[var(--warning-soft,var(--surface2))] text-xs font-bold text-[var(--warning-text,var(--text-primary))] transition-colors hover:opacity-90 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <LogOut size={15} className="text-amber-600" />
                          <span>Abmelden</span>
                        </div>
                        <span className="text-[0.5625rem] font-bold uppercase tracking-wider opacity-70">dieses Gerät</span>
                      </button>
                    </div>

                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      <SupportModal open={showSupportModal} onClose={() => setShowSupportModal(false)} />

      {/* Modal für Remote-QR & WLAN-Kopplung */}
      {showLargeQR && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="absolute inset-0 bg-[var(--surface-overlay,rgba(15,23,42,0.7))] backdrop-blur-md cursor-pointer"
            onClick={() => {
              setShowLargeQR(false);
              setIsWifiFullscreen(false);
            }} 
          />
          
          <div className={`bg-[var(--surface-card,var(--surface))] rounded-[2rem] p-5 sm:p-7 w-full relative shadow-2xl border border-[var(--border-default,var(--border))] flex flex-col items-center justify-center text-center space-y-4 z-10 transition-all ${
            isWifiFullscreen ? 'max-w-2xl sm:p-10' : 'max-w-lg'
          }`}>
            <button 
              onClick={() => {
                setShowLargeQR(false);
                setIsWifiFullscreen(false);
              }}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-0"
              title="Schließen (ESC)"
              aria-label="Schließen"
            >
              <X size={20} />
            </button>

            <div className="flex bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] rounded-2xl p-1 gap-1 w-full max-w-sm">
              <button
                onClick={() => { setQrModalTab('remote'); setIsWifiFullscreen(false); ensureSyncCode(); }}
                className={`flex-1 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  qrModalTab === 'remote' 
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Smartphone size={14} /> Handy Remote
              </button>
              <button
                onClick={() => setQrModalTab('wifi')}
                className={`flex-1 py-2 rounded-xl text-[0.6875rem] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  qrModalTab === 'wifi' 
                    ? 'bg-[var(--accent)] text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Wifi size={14} /> WLAN-Kopplung
              </button>
            </div>

            {qrModalTab === 'remote' ? (
              !app?.boardSettings?.activeSyncCode ? (
                <div className="py-10 flex flex-col items-center justify-center space-y-4">
                  <div className="text-sm font-bold text-[var(--text-primary)]">Lade Kopplungscode...</div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={ensureSyncCode}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Code jetzt erzeugen
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center space-y-1.5 w-full">
                    <h3 className="text-[1.25rem] leading-normal font-black text-[var(--text-primary)] tracking-tight pt-1">Remote Controller QR-Code</h3>
                    
                    <div>
                      {(() => {
                        const lastActive = app.boardSettings?.remoteLastActiveTs;
                        const isRecentlyActive = lastActive && (Date.now() - lastActive < 30000);
                        
                        return (
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[0.625rem] font-bold uppercase tracking-wider ${
                            isRecentlyActive 
                              ? 'bg-[var(--success-soft)] border-[var(--success-border)] text-[var(--success-text)]'
                              : 'bg-[var(--warning-soft)] border-[var(--warning-border)] text-[var(--warning-text)]'
                          }`}>
                            <span className="relative flex h-2 w-2">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecentlyActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecentlyActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                            </span>
                            <span>
                              {isRecentlyActive 
                                ? `Verbunden (Handy aktiv vor ${Math.round((Date.now() - lastActive) / 1000)}s)`
                                : `Bereit: Warte auf Handy-Scan (${app.boardSettings.activeSyncCode})`
                              }
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {(() => {
                    const encodedKey = getActiveEncodedSessionKey() || '';
                    const syncUrl = app.boardSettings?.activeSyncCode 
                      ? createSyncUrl(app.boardSettings.activeSyncCode, encodedKey)
                      : '';

                    return (
                      <>
                        <div className="bg-white p-5 rounded-3xl border border-[var(--border-subtle,var(--border))] shadow-inner flex flex-col items-center justify-center hover:scale-[1.01] transition-transform">
                          <QRCodeCanvas 
                            value={syncUrl}
                            size={190}
                            level="Q"
                          />
                          <div className="mt-2 font-mono font-bold text-[0.875rem] text-slate-900 tracking-widest">
                            Code: {app.boardSettings.activeSyncCode}
                          </div>
                        </div>

                        <div className="space-y-3 w-full px-1">
                          <p className="text-[0.75rem] text-[var(--text-secondary)] font-medium leading-relaxed">
                            Scanne diesen QR-Code mit deiner Smartphone-Kamera, um Tafel, Lärmampel, Timer &amp; Notizen Ende-zu-Ende verschlüsselt zu steuern.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <Button
                              variant="primary"
                              size="md"
                              className="w-full"
                              onClick={() => {
                                if (syncUrl) {
                                  navigator.clipboard.writeText(syncUrl);
                                  showToast("Verschlüsselter Kopplungs-Link kopiert!", "success");
                                }
                              }}
                              leftIcon={<Copy size={13} />}
                            >
                              Link kopieren
                            </Button>

                            <Button
                              variant="secondary"
                              size="md"
                              className="w-full"
                              onClick={() => {
                                if (syncUrl) {
                                  window.open(syncUrl, '_blank', 'width=420,height=800,resizable=yes');
                                }
                              }}
                              leftIcon={<ExternalLink size={13} />}
                            >
                              In neuem Tab testen
                            </Button>
                          </div>

                          <button
                            onClick={async () => {
                              try {
                                const { code } = await startSyncSession(app);
                                setApp((p: any) => ({
                                  ...p,
                                  boardSettings: {
                                    ...p.boardSettings,
                                    activeSyncCode: code,
                                    isRemoteController: false,
                                  },
                                }));
                                showToast("Neuer Zero-Knowledge Sync-Code erzeugt!", "success");
                              } catch (e) {
                                showToast("Fehler beim Erzeugen des neuen Sync-Codes", "error");
                              }
                            }}
                            className="w-full flex items-center justify-center gap-2 py-1.5 text-[0.625rem] font-bold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors cursor-pointer border-0 bg-transparent"
                          >
                            <RefreshCw size={12} /> Neuen Kopplungscode erzeugen
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </>
              )
            ) : (
              <>
                <div className="flex flex-col items-center space-y-1 w-full">
                  <h3 className="text-[1.25rem] leading-normal font-black text-[var(--text-primary)] tracking-tight pt-1">WLAN-Kopplungscode</h3>
                  <p className="text-[0.6875rem] leading-tight text-[var(--text-muted)] font-bold uppercase tracking-wider">Lokales Netzwerk mit Smartphone verbinden</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-[var(--border-subtle,var(--border))] shadow-xl flex flex-col items-center justify-center transition-all">
                  {wifiSsid.trim() ? (
                    <>
                      <QRCodeCanvas
                        value={wifiSecurity === 'nopass'
                          ? `WIFI:S:${wifiSsid};T:nopass;;`
                          : `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};;`
                        }
                        size={isWifiFullscreen ? 280 : 190}
                        level="Q"
                      />
                      <div className="mt-3 text-center">
                        <div className="font-mono font-bold text-[0.9375rem] text-slate-900 tracking-wider">
                          WLAN: <span className="text-[var(--accent)]">{wifiSsid}</span>
                        </div>
                        {wifiSecurity !== 'nopass' && (
                          <div className="font-mono text-[0.75rem] font-medium text-slate-600 tracking-wider mt-0.5">
                            Passwort: <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-800">{wifiPassword || '—'}</span>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="py-12 text-center">
                      <Wifi size={32} className="mx-auto mb-3 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">Noch keine WLAN-Daten hinterlegt.</p>
                      <p className="mt-1 text-xs text-slate-500">Trage unten die tatsächlich verwendete SSID ein.</p>
                    </div>
                  )}
                </div>

                <div className="w-full space-y-2.5 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.625rem] font-bold uppercase text-[var(--text-muted)] tracking-wider">WLAN-Daten</span>
                    <button
                      onClick={() => setIsWifiFullscreen(!isWifiFullscreen)}
                      className="text-[0.625rem] font-bold text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                    >
                      {isWifiFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
                      {isWifiFullscreen ? 'Normalansicht' : 'Smartboard Großanzeige'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[0.5625rem] font-bold uppercase text-[var(--text-muted)] block mb-1">WLAN Name (SSID):</label>
                      <input
                        type="text"
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        className="w-full bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                        placeholder="WLAN Name..."
                      />
                    </div>
                    <div>
                      <label className="text-[0.5625rem] font-bold uppercase text-[var(--text-muted)] block mb-1">WLAN Passwort:</label>
                      <input
                        type="password"
                        disabled={wifiSecurity === 'nopass'}
                        value={wifiPassword}
                        onChange={(e) => setWifiPassword(e.target.value)}
                        className="w-full bg-[var(--surface-subtle,var(--surface2))] border border-[var(--border-default,var(--border))] rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-50"
                        placeholder={wifiSecurity === 'nopass' ? 'Kein Passwort' : 'Passwort...'}
                      />
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    disabled={!wifiSsid.trim()}
                    onClick={() => {
                      if (!wifiSsid.trim()) {
                        showToast("Bitte zuerst den tatsächlichen WLAN-Namen eintragen.", "info");
                        return;
                      }
                      setApp((prev: any) => ({
                        ...prev,
                        boardSettings: {
                          ...prev.boardSettings,
                          wifiSettings: {
                            ssid: wifiSsid,
                            password: wifiPassword,
                            security: wifiSecurity
                          }
                        }
                      }));
                      showToast("WLAN-Netzwerkeinstellungen gespeichert!", "success");
                    }}
                  >
                    WLAN-Einstellungen speichern
                  </Button>
                </div>
              </>
            )}

            <div className="text-[0.5625rem] font-bold text-[var(--text-muted)] uppercase tracking-widest pt-1">
              Tippe auf ESC oder außerhalb um zu schließen
            </div>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
});

export default Topbar;
