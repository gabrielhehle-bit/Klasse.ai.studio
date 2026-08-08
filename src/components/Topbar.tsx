
import React, { useState, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Menu, Sun, Moon, Leaf, Type, Palette, Check, Clock, Cloud, CloudSun, CloudRain, CloudSnow, CloudLightning, Wind, Thermometer, ChevronDown, FlagTriangleLeft, SpellCheck, Wifi, WifiOff, Sparkles, Smartphone, X, Copy, Search, Maximize, Minimize, Lock, ShieldAlert, ExternalLink, RefreshCw, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { getStartYear, getSchulstartKW, kwToMonday, getCurrentSchuljahr, getKW, getSW } from '../lib/utils';
import { getFerien } from '../lib/ferienOesterreich';
import { AESTHETIC_THEMES, FONTS } from '../constants';
import { QRCodeCanvas } from 'qrcode.react';
import { scanDataConsistency } from '../lib/DataConsistencyService';

interface TopbarProps {
  title: string;
  onMenuClick: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const Topbar = memo(({ title, onMenuClick, actions, className }: TopbarProps) => {
  const { app, setApp, setScreenLocked } = useApp();
  const { showToast } = useToast();
  const consistencyIssues = React.useMemo(() => scanDataConsistency(app), [app]);
  const [showInfoMenu, setShowInfoMenu] = useState(false);
  const [showDesignMenu, setShowDesignMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weather, setWeather] = useState<any>(null);
  const [forecast, setForecast] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLargeQR, setShowLargeQR] = useState(false);
  const [qrModalTab, setQrModalTab] = useState<'remote' | 'wifi'>('remote');
  const [wifiSsid, setWifiSsid] = useState(app.boardSettings?.wifiSettings?.ssid || 'Schul-WLAN-Klasse');
  const [wifiPassword, setWifiPassword] = useState(app.boardSettings?.wifiSettings?.password || 'Schule2026!');
  const [wifiSecurity, setWifiSecurity] = useState<'WPA' | 'WEP' | 'nopass'>(app.boardSettings?.wifiSettings?.security || 'WPA');
  const [isWifiFullscreen, setIsWifiFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const ensureSyncCode = async () => {
    if (!app?.boardSettings?.activeSyncCode) {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let localCode = "";
      for (let i = 0; i < 6; i++) localCode += chars.charAt(Math.floor(Math.random() * chars.length));

      setApp((p: any) => ({
        ...p,
        boardSettings: {
          ...p.boardSettings,
          activeSyncCode: localCode,
          isRemoteController: false,
        },
      }));

      try {
        const res = await fetch("/api/sync/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: app }),
        });
        const data = await res.json();
        if (data && data.code) {
          setApp((p: any) => ({
            ...p,
            boardSettings: {
              ...p.boardSettings,
              activeSyncCode: data.code,
              isRemoteController: false,
            },
          }));
        }
      } catch (e) {
        console.error("Error generating sync code with server:", e);
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
    setShowInfoMenu(false);
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
      try {
        const url = '/api/weather?latitude=47.2333&longitude=9.6&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Europe%2FVienna';
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Weather fetch HTTP error: ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('Weather fetch returned non-JSON content');
        }
        const d = await res.json();
        setWeather(d.current_weather);
        
        if (d.daily) {
          const days = d.daily.time.map((time: string, i: number) => ({
            date: new Date(time),
            code: d.daily.weathercode[i],
            max: d.daily.temperature_2m_max[i],
            min: d.daily.temperature_2m_min[i]
          }));
          setForecast(days);
        }
      } catch (e) {
        // Clean default weather state fallback
        setWeather({
          temperature: 20.0,
          windspeed: 5.0,
          winddirection: 180,
          weathercode: 0,
          time: new Date().toISOString()
        });
      }
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 10 * 60 * 1000); // 10 min
    return () => clearInterval(interval);
  }, []);

  const startYear = React.useMemo(() => getStartYear(app?.schuljahr), [app?.schuljahr]);
  const schoolYearStart = React.useMemo(() => kwToMonday(getSchulstartKW(app?.schuljahr, app?.bundesland), startYear), [app?.schuljahr, app?.bundesland, startYear]);
  
  const summerStart = React.useMemo(() => {
    const ferien = getFerien(app?.bundesland || 'VBG', app?.schuljahr || getCurrentSchuljahr());
    const sommer = ferien.find(f => f.id.startsWith('sommer_'));
    if (sommer && sommer.startMonth !== undefined && sommer.startDay !== undefined) {
      return new Date(sommer.year || (startYear + 1), sommer.startMonth, sommer.startDay);
    }
    // Fallback:
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

  const getWeatherIcon = (code: number, size = 20) => {
    if (code === 0) return <Sun size={size} className="text-amber-500" />;
    if (code <= 3) return <CloudSun size={size} className="text-slate-400" />;
    if (code <= 48) return <Wind size={size} className="text-slate-300" />;
    if (code <= 67) return <CloudRain size={size} className="text-blue-400" />;
    if (code <= 77) return <CloudSnow size={size} className="text-sky-200" />;
    if (code >= 95) return <CloudLightning size={size} className="text-purple-500" />;
    return <Cloud size={size} className="text-slate-400" />;
  };

  const setAestheticTheme = React.useCallback((themeId: any) => {
    setApp(prev => ({ ...prev, theme: themeId }));
    setShowDesignMenu(false);
  }, [setApp]);

  const setFontFamily = React.useCallback((fontId: string) => {
    setApp(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, fontFamily: fontId }
    }));
    setShowDesignMenu(false);
  }, [setApp]);

  const toggleZoom = React.useCallback(() => {
    const levels: ('compact' | 'standard' | 'large')[] = ['compact', 'standard', 'large'];
    const current = app?.settings?.zoomLevel || 'standard';
    const nextIdx = (levels.indexOf(current) + 1) % levels.length;
    setApp(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, zoomLevel: levels[nextIdx] } 
    }));
  }, [setApp, app?.settings?.zoomLevel]);

  const getThemeIcon = () => {
    switch (app?.settings?.theme) {
      case 'dark': return <Moon size={16} />;
      case 'terra': return <Leaf size={16} />;
      default: return <Sun size={16} />;
    }
  };

  return (
    <header className={`flex flex-col sticky top-0 z-[100] topbar no-print print:hidden ${className || ''}`}>
      {/* Test Notice Bar */}
      <div className="bg-amber-50/90 border-b border-amber-200/50 py-1 transition-colors group">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-4 sm:px-8 lg:px-10 flex items-center justify-center gap-2 text-[0.5625rem] font-bold uppercase tracking-[0.16em] text-amber-900/70 w-full">
          <Clock size={8} className="group-hover:scale-125 transition-transform" />
          <span>Diese Anwendung ist ein Funktionstest & Prototyp • Änderungen jederzeit möglich</span>
        </div>
      </div>
      <div className="bg-surface/95 backdrop-blur-xl border-b border-border py-2">
        <div className="max-w-[1600px] mx-auto px-2 sm:px-6 md:px-4 sm:px-8 lg:px-10 flex flex-nowrap items-center justify-between gap-2.5 md:gap-4 w-full min-w-0">
      <div className="flex items-center gap-2 sm:gap-3 shrink-1 min-w-0">
        <button 
          className="lg:hidden p-3 -ml-2 rounded-xl hover:bg-surface2 transition-all border border-border shrink-0 relative z-[200] pointer-events-auto bg-surface shadow-sm"
          aria-label="Navigation öffnen"
          title="Navigation öffnen"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMenuClick();
          }}
          type="button"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2 sm:gap-3 text-wrap leading-tight break-words px-1 min-w-0">
          <h2 className="font-sans text-[1.125rem] leading-normal sm:text-[1.25rem] leading-normal md:text-[1.5rem] leading-normal font-black text-text-primary tracking-tighter leading-none text-wrap leading-tight break-words flex items-center gap-2 min-w-0">
            {title}
            {app.currentPage === 'ki-helfer' && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-900 text-white rounded-full text-[0.5625rem] font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 shrink-0">
                <Sparkles size={8} className="text-emerald-400" />
                KI
              </span>
            )}
          </h2>
        </div>
      </div>
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 justify-end ml-auto shrink min-w-0">
        <button 
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden lg:flex items-center gap-2 lg:w-48 xl:w-60 px-3.5 py-1.5 bg-surface2 border border-border rounded-xl text-text-muted hover:text-text-primary hover:bg-surface3/60 transition-all text-[0.75rem] leading-tight font-semibold active:scale-95 text-left shrink-0"
          title="Globale Suche (Strg+K)"
        >
          <Search size={14} />
          <span className="flex-1">Suchen...</span>
          <span className="text-[0.5625rem] bg-surface border border-border px-1.5 py-0.5 rounded font-black uppercase tracking-widest text-text-muted">⌘K</span>
        </button>

        {/* Compact Time & Date Display */}
        <div className="hidden xl:flex flex-col items-end leading-none px-2 text-right shrink-0">
          <div className="text-[0.875rem] leading-snug font-black text-text-primary tabular-nums">
            {currentTime.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-[0.53125rem] font-black text-text-muted uppercase tracking-widest mt-1 flex items-center gap-1.5 justify-end">
            <span>{currentTime.toLocaleDateString('de-AT', { weekday: 'short' })}, {currentTime.toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit' })}</span>
            <span className="opacity-40 text-[0.5rem]">•</span>
            {(() => {
              const sw = getSW(currentTime, app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
              return sw ? (
                <>
                  <span className="text-text-secondary">SW {sw}</span>
                  <span className="opacity-40 text-[0.5rem]">•</span>
                </>
              ) : null;
            })()}
            <span className="text-text-secondary">KW {getKW(currentTime)}</span>
          </div>
        </div>

        {/* Consolidated Schnell-Info Panel Button */}
        <div className="relative">
          <button
            onClick={() => setShowInfoMenu(!showInfoMenu)}
            className={`flex items-center gap-2 bg-surface2 hover:bg-surface3/60 border rounded-xl px-3 py-1.5 transition-all text-text-secondary hover:text-text-primary font-semibold text-[0.75rem] leading-tight active:scale-95 cursor-pointer shrink-0 ${showInfoMenu ? 'bg-surface border-accent shadow-inner-sm text-accent' : 'border-border/60'}`}
          >
            <div className="flex items-center gap-1.5 min-w-0">
              {weather ? getWeatherIcon(weather.weathercode, 14) : <Sun size={14} className="text-amber-500" />}
              <span className="font-black tabular-nums">{weather ? `${Math.round(weather.temperature)}°C` : '--°C'}</span>
            </div>
            <div className="hidden lg:block w-[1px] h-3 bg-border/40" />
            <div className="hidden lg:flex items-center gap-1">
              <FlagTriangleLeft size={10} className="text-accent" />
              <span className="font-black tabular-nums">{Math.round(schoolYearProgressPercent)}%</span>
            </div>
            <div className="hidden lg:block w-[1px] h-3 bg-border/40" />
            <div 
              onClick={(e) => {
                e.stopPropagation();
                openHandyKopplungModal('remote');
              }}
              className="flex items-center gap-1 text-emerald-600 hover:text-indigo-500 font-black cursor-pointer px-1 py-0.5 rounded-md hover:bg-emerald-500/10 transition-colors"
              title="Handy-Kopplung & QR-Code direkt öffnen"
            >
              <Smartphone size={13} />
              <span className="hidden lg:inline">Mobil</span>
            </div>
            <ChevronDown size={12} className="text-text-muted shrink-0" />
          </button>

          {showInfoMenu && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowInfoMenu(false)} />
              <div className="absolute top-full right-0 mt-2 bg-surface/95 backdrop-blur-xl rounded-[24px] shadow-2xl border border-border p-5 min-w-[320px] max-w-sm z-[101] space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                {/* 1. Header & Datum */}
                <div className="flex items-center justify-between border-b border-border/50 pb-3">
                  <div className="text-left">
                    <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-widest leading-none">Aktuelle Zeit</div>
                    <div className="text-[0.75rem] leading-tight font-black text-text-primary tracking-tight mt-1">
                      {currentTime.toLocaleDateString('de-AT', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </div>
                    <div className="text-[0.5625rem] font-bold text-text-muted mt-1.5 flex items-center gap-1.5">
                      {(() => {
                        const sw = getSW(currentTime, app?.schuljahr || getCurrentSchuljahr(), app?.bundesland || 'VBG');
                        return sw ? (
                          <span className="bg-surface2 border border-border/60 px-1.5 py-0.5 rounded text-text-secondary font-black">SW {sw}</span>
                        ) : null;
                      })()}
                      <span className="bg-surface2 border border-border/60 px-1.5 py-0.5 rounded text-text-secondary font-black">KW {getKW(currentTime)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[1.125rem] leading-normal font-black text-text-primary tabular-nums">
                      {currentTime.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* 2. School Year Progress */}
                <div className="bg-surface2/50 p-3 rounded-2xl border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                      <FlagTriangleLeft size={10} className="text-accent" />
                      Schuljahr Fortschritt
                    </div>
                    <div className="text-[0.625rem] font-black text-accent tabular-nums">{Math.round(schoolYearProgressPercent)}%</div>
                  </div>
                  <div className="progress-premium-track">
                    <div 
                      className="progress-premium-bar"
                      style={{ width: `${schoolYearProgressPercent}%` }}
                    />
                  </div>
                  <div className="text-[0.5rem] font-black text-text-muted uppercase tracking-widest mt-1.5 flex justify-between">
                    <span>Gesamt: {schoolDaysTotal} Tage</span>
                    <span>Noch {schoolDaysRemaining} Schultage</span>
                  </div>
                </div>

                {/* 3. Weather & Forecast */}
                <div className="bg-surface2/50 p-3 rounded-2xl border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-widest">Wetter Feldkirch</div>
                    <span className="text-[0.6875rem] font-black text-text-primary">{weather ? `${Math.round(weather.temperature)}°C` : '--°C'}</span>
                  </div>
                  {forecast.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                      {forecast.slice(1, 4).map((day, i) => (
                        <div key={i} className="flex flex-col items-center p-2 bg-surface rounded-xl border border-border/50">
                          <span className="text-[0.5rem] font-black text-text-muted uppercase">
                            {day.date.toLocaleDateString('de-AT', { weekday: 'short' })}
                          </span>
                          <div className="text-[1.125rem] leading-normal my-1">{getWeatherIcon(day.code, 16)}</div>
                          <span className="text-[0.625rem] font-black text-text-primary tabular-nums">{Math.round(day.max)}°</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Handykopplung & WLAN-Kopplung */}
                <div className="bg-surface2/50 p-3 rounded-2xl border border-border/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-[0.5625rem] font-black text-text-muted uppercase tracking-widest flex items-center gap-1">
                      <Smartphone size={10} className="text-emerald-500" />
                      Kopplung &amp; QR-Code
                    </div>
                    <div className={`px-1.5 py-0.5 rounded-lg flex items-center gap-1 ${isOnline ? 'text-emerald-600 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-600 bg-rose-500/10 border border-rose-500/20'}`}>
                      {isOnline ? <Wifi size={8} /> : <WifiOff size={8} />}
                      <span className="text-[0.5rem] font-black uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
                    </div>
                  </div>

                  {/* Quick Tabs inside menu card */}
                  <div className="flex bg-surface border border-border rounded-xl p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => setQrModalTab('remote')}
                      className={`flex-1 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        qrModalTab === 'remote' ? 'bg-indigo-600 text-white shadow-xs' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Smartphone size={10} /> Handy-Remote
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrModalTab('wifi')}
                      className={`flex-1 py-1 rounded-lg text-[0.5625rem] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all ${
                        qrModalTab === 'wifi' ? 'bg-emerald-600 text-white shadow-xs' : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      <Wifi size={10} /> WLAN-Code
                    </button>
                  </div>

                  {qrModalTab === 'remote' ? (
                    app?.boardSettings?.activeSyncCode ? (
                      <div className="flex items-center gap-3 bg-surface p-2.5 rounded-xl border border-border">
                        <div 
                          onClick={() => {
                            setQrModalTab('remote');
                            setShowLargeQR(true);
                            setShowInfoMenu(false);
                          }}
                          className="bg-surface2 p-1 rounded-lg border border-border cursor-pointer hover:border-accent hover:scale-[1.03] transition-all shadow-xs shrink-0 flex items-center justify-center"
                          title="Großen Remote-QR-Code anzeigen"
                        >
                          <QRCodeCanvas 
                            value={`${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings.activeSyncCode}`}
                            size={44}
                            level="M"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col text-left leading-tight justify-center">
                          <span className="text-[0.5rem] font-black uppercase text-text-muted tracking-wider">Sync-Code</span>
                          <span className="text-[0.75rem] font-black text-indigo-500 tracking-wider mt-0.5">{app.boardSettings.activeSyncCode}</span>
                          <button
                            onClick={() => {
                              setQrModalTab('remote');
                              setShowLargeQR(true);
                              setShowInfoMenu(false);
                            }}
                            className="text-[0.5625rem] font-black text-text-muted hover:text-indigo-500 text-left mt-1 underline cursor-pointer"
                          >
                            🔍 Groß anleuchten
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[0.625rem] text-text-muted italic text-center py-2">
                        Kein aktiver Sync-Code
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-3 bg-surface p-2.5 rounded-xl border border-emerald-500/20">
                      <div 
                        onClick={() => {
                          setQrModalTab('wifi');
                          setShowLargeQR(true);
                          setShowInfoMenu(false);
                        }}
                        className="bg-surface2 p-1 rounded-lg border border-border cursor-pointer hover:border-emerald-500 hover:scale-[1.03] transition-all shadow-xs shrink-0 flex items-center justify-center"
                        title="Großen WLAN QR-Code anzeigen"
                      >
                        <QRCodeCanvas 
                          value={wifiSecurity === 'nopass' 
                            ? `WIFI:S:${wifiSsid};T:nopass;;` 
                            : `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};;`
                          }
                          size={44}
                          level="M"
                        />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col text-left leading-tight justify-center">
                        <span className="text-[0.5rem] font-black uppercase text-emerald-500 tracking-wider">WLAN SSID</span>
                        <span className="text-[0.6875rem] font-black text-text-primary truncate mt-0.5">{wifiSsid}</span>
                        <button
                          onClick={() => {
                            setQrModalTab('wifi');
                            setShowLargeQR(true);
                            setShowInfoMenu(false);
                          }}
                          className="text-[0.5625rem] font-black text-text-muted hover:text-emerald-500 text-left mt-1 underline cursor-pointer"
                        >
                          📶 WLAN-Code Groß
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Modal für QR-Code-Generator-System, Handy-Verbindung & WLAN-Kopplungscode */}
          {showLargeQR && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in" style={{ backgroundColor: 'transparent' }}>
              {/* Blur-Hintergrund-Overlay */}
              <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
                onClick={() => {
                  setShowLargeQR(false);
                  setIsWifiFullscreen(false);
                }} 
              />
              
              {/* Theme-Symmetrischer Inhalts-Karton */}
              <div className={`bg-surface rounded-[2.5rem] p-5 sm:p-7 w-full relative shadow-2xl border border-border flex flex-col items-center justify-center text-center space-y-4 z-10 transition-all ${
                isWifiFullscreen ? 'max-w-2xl sm:p-10' : 'max-w-lg'
              }`}>
                {/* Schließen Button */}
                <button 
                  onClick={() => {
                    setShowLargeQR(false);
                    setIsWifiFullscreen(false);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-full hover:bg-surface2 text-text-muted hover:text-text-primary transition-colors cursor-pointer border-0"
                  title="Schließen (ESC)"
                >
                  <X size={20} />
                </button>

                {/* Mode Selector Tabs: Handy Remote vs. WLAN Kopplungscode */}
                <div className="flex bg-surface2 border border-border rounded-2xl p-1 gap-1 w-full max-w-sm">
                  <button
                    onClick={() => { setQrModalTab('remote'); setIsWifiFullscreen(false); ensureSyncCode(); }}
                    className={`flex-1 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      qrModalTab === 'remote' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Smartphone size={14} /> Handy Remote
                  </button>
                  <button
                    onClick={() => setQrModalTab('wifi')}
                    className={`flex-1 py-2 rounded-xl text-[0.6875rem] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      qrModalTab === 'wifi' 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    <Wifi size={14} /> WLAN-Kopplung
                  </button>
                </div>

                {qrModalTab === 'remote' ? (
                  !app?.boardSettings?.activeSyncCode ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-4">
                      <div className="text-sm font-bold text-text-primary">Lade Kopplungscode...</div>
                      <button
                        type="button"
                        onClick={ensureSyncCode}
                        className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <RefreshCw size={14} /> Code jetzt erzeugen
                      </button>
                    </div>
                  ) : (
                  <>
                    {/* Kopfzeile mit Handy-Icon & Live Signal Status */}
                    <div className="flex flex-col items-center space-y-1.5 w-full">
                      <h3 className="text-[1.25rem] leading-normal font-black text-text-primary tracking-tight leading-none pt-1">Remote Controller QR-Code</h3>
                      
                      {/* Real-Time Connection Signal Status */}
                      <div>
                        {(() => {
                          const lastActive = app.boardSettings?.remoteLastActiveTs;
                          const isRecentlyActive = lastActive && (Date.now() - lastActive < 30000);
                          
                          return (
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[0.625rem] font-black uppercase tracking-wider ${
                              isRecentlyActive 
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            }`}>
                              <span className="relative flex h-2 w-2">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isRecentlyActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${isRecentlyActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              </span>
                              <span>
                                {isRecentlyActive 
                                  ? `🟢 VERBUNDEN (Handy aktiv vor ${Math.round((Date.now() - lastActive) / 1000)}s)`
                                  : `🟡 Bereit: Warte auf Handy-Scan (${app.boardSettings.activeSyncCode})`
                                }
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Großer QR-Code */}
                    <div className="bg-white p-5 rounded-3xl border-2 border-slate-100 shadow-inner flex flex-col items-center justify-center hover:scale-[1.02] transition-transform">
                      <QRCodeCanvas 
                        value={`${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings.activeSyncCode}`}
                        size={190}
                        level="Q"
                      />
                      <div className="mt-2 font-mono font-black text-[0.875rem] text-slate-900 tracking-widest">
                        Code: {app.boardSettings.activeSyncCode}
                      </div>
                    </div>

                    <div className="space-y-3 w-full px-1">
                      <p className="text-[0.75rem] leading-tight text-text-secondary font-semibold leading-relaxed">
                        Scanne diesen QR-Code mit deiner Smartphone-Kamera, um Tafel, Lärmampel, Timer &amp; Notizen kabellos zu steuern.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            const syncUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings?.activeSyncCode}`;
                            navigator.clipboard.writeText(syncUrl);
                            showToast("Kopplungs-Link wurde kopiert!", "success");
                          }}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-600/10 border-0"
                        >
                          <Copy size={13} /> Link kopieren
                        </button>

                        <button
                          onClick={() => {
                            const syncUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?sync=${app.boardSettings?.activeSyncCode}`;
                            window.open(syncUrl, '_blank', 'width=420,height=800,resizable=yes');
                          }}
                          className="flex items-center justify-center gap-2 px-3 py-2.5 bg-surface2 hover:bg-surface3 text-text-primary border border-border rounded-xl text-[0.625rem] font-black uppercase tracking-wider transition-all cursor-pointer active:scale-95"
                        >
                          <ExternalLink size={13} /> In neuem Tab testen
                        </button>
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch("/api/sync/create", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ state: app }),
                            });
                            const data = await res.json();
                            if (data && data.code) {
                              setApp((p: any) => ({
                                ...p,
                                boardSettings: {
                                  ...p.boardSettings,
                                  activeSyncCode: data.code,
                                  isRemoteController: false,
                                },
                              }));
                              showToast("Neuer Sync-Code erfolgreich erzeugt!", "success");
                            }
                          } catch (e) {
                            showToast("Fehler beim Erzeugen des neuen Sync-Codes", "error");
                          }
                        }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 text-[0.625rem] font-black uppercase tracking-wider text-text-muted hover:text-indigo-400 transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <RefreshCw size={12} /> Neuen Kopplungscode erzeugen
                      </button>
                    </div>
                  </>
                )
                ) : (
                  <>
                    {/* WLAN KOPPLUNGSSYSTEM */}
                    <div className="flex flex-col items-center space-y-1 w-full">
                      <h3 className="text-[1.25rem] leading-normal font-black text-text-primary tracking-tight leading-none pt-1">WLAN-Kopplungscode</h3>
                      <p className="text-[0.6875rem] leading-tight text-text-muted font-bold uppercase tracking-wider">Lokales Netzwerk mit Smartphone verbinden</p>
                    </div>

                    {/* Großer WLAN-QR Code */}
                    <div className="bg-white p-5 rounded-3xl border-2 border-emerald-500/20 shadow-xl flex flex-col items-center justify-center transition-all">
                      <QRCodeCanvas 
                        value={wifiSecurity === 'nopass' 
                          ? `WIFI:S:${wifiSsid};T:nopass;;` 
                          : `WIFI:S:${wifiSsid};T:${wifiSecurity};P:${wifiPassword};;`
                        }
                        size={isWifiFullscreen ? 280 : 190}
                        level="Q"
                      />
                      <div className="mt-3 text-center">
                        <div className="font-mono font-black text-[0.9375rem] text-slate-900 tracking-wider">
                          WLAN: <span className="text-emerald-700">{wifiSsid}</span>
                        </div>
                        {wifiSecurity !== 'nopass' && (
                          <div className="font-mono text-[0.75rem] font-bold text-slate-600 tracking-wider mt-0.5">
                            Passwort: <span className="bg-slate-100 px-2 py-0.5 rounded border text-slate-800">{wifiPassword}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Presets & Custom Configuration */}
                    <div className="w-full space-y-2.5 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.625rem] font-black uppercase text-text-muted tracking-wider">Schnell-Vorlagen:</span>
                        <button
                          onClick={() => setIsWifiFullscreen(!isWifiFullscreen)}
                          className="text-[0.625rem] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0"
                        >
                          {isWifiFullscreen ? <Minimize size={12} /> : <Maximize size={12} />}
                          {isWifiFullscreen ? 'Normalansicht' : 'Smartboard Großanzeige'}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => {
                            setWifiSsid('Schul-WLAN-Klasse');
                            setWifiPassword('Schule2026!');
                            setWifiSecurity('WPA');
                          }}
                          className="py-1.5 px-2 bg-surface2 hover:bg-surface3 border border-border rounded-xl text-[0.5625rem] font-bold text-text-primary text-center cursor-pointer"
                        >
                          🏫 Schul-WLAN
                        </button>
                        <button
                          onClick={() => {
                            setWifiSsid('Lehrer-Smartphone-Hotspot');
                            setWifiPassword('Klassenzimmer123');
                            setWifiSecurity('WPA');
                          }}
                          className="py-1.5 px-2 bg-surface2 hover:bg-surface3 border border-border rounded-xl text-[0.5625rem] font-bold text-text-primary text-center cursor-pointer"
                        >
                          📱 Handy-Hotspot
                        </button>
                        <button
                          onClick={() => {
                            setWifiSsid('Schule-Gaeste');
                            setWifiPassword('');
                            setWifiSecurity('nopass');
                          }}
                          className="py-1.5 px-2 bg-surface2 hover:bg-surface3 border border-border rounded-xl text-[0.5625rem] font-bold text-text-primary text-center cursor-pointer"
                        >
                          🔓 Offenes Gäste-WLAN
                        </button>
                      </div>

                      {/* Inputs for SSID & Password */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="text-[0.5625rem] font-black uppercase text-text-muted block mb-1">WLAN Name (SSID):</label>
                          <input
                            type="text"
                            value={wifiSsid}
                            onChange={(e) => setWifiSsid(e.target.value)}
                            className="w-full bg-surface2 border border-border rounded-xl px-2.5 py-1.5 text-[0.75rem] font-bold text-text-primary outline-none focus:border-emerald-500"
                            placeholder="WLAN Name..."
                          />
                        </div>
                        <div>
                          <label className="text-[0.5625rem] font-black uppercase text-text-muted block mb-1">WLAN Passwort:</label>
                          <input
                            type="text"
                            disabled={wifiSecurity === 'nopass'}
                            value={wifiPassword}
                            onChange={(e) => setWifiPassword(e.target.value)}
                            className="w-full bg-surface2 border border-border rounded-xl px-2.5 py-1.5 text-[0.75rem] font-bold text-text-primary outline-none focus:border-emerald-500 disabled:opacity-50"
                            placeholder={wifiSecurity === 'nopass' ? 'Kein Passwort' : 'Passwort...'}
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => {
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
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[0.625rem] font-black uppercase tracking-wider cursor-pointer active:scale-95 shadow-md border-0"
                      >
                        💾 WLAN-Einstellungen fürs Cockpit Speichern
                      </button>
                    </div>
                  </>
                )}

                <div className="text-[0.5625rem] font-bold text-text-muted uppercase tracking-widest pt-1">
                  Tippe auf ESC oder außerhalb um zu schließen
                </div>
              </div>
            </div>,
            document.body
          )}
        </div>

        {/* Consolidated Design & view Menu Button */}
        <div className="relative shrink-0">
          <button 
            className={`p-2 px-3 rounded-xl transition-all flex items-center gap-1.5 border hover:bg-surface3/60 text-[0.75rem] leading-tight font-bold ${showDesignMenu ? 'bg-surface border-accent text-accent font-black shadow-inner-sm' : 'bg-surface2 border-border/65 text-text-secondary hover:text-text-primary'}`}
            onClick={() => setShowDesignMenu(!showDesignMenu)}
            title="Design & Darstellung anpassen"
          >
            <Palette size={14} className="shrink-0 text-text-secondary" />
            <span className="hidden lg:inline">Ansicht</span>
            <ChevronDown size={12} className="text-text-muted shrink-0" />
          </button>

          {showDesignMenu && (
            <>
              <div className="fixed inset-0 z-[100]" onClick={() => setShowDesignMenu(false)} />
              <div className="absolute top-full right-0 mt-2 bg-surface/95 backdrop-blur-xl rounded-[24px] shadow-2xl border border-border p-4 min-w-[240px] z-[101] space-y-4 max-h-[80vh] overflow-y-auto elegant-scrollbar animate-in fade-in slide-in-from-top-3 duration-200">
                {/* 1. Theme-Bereich */}
                <div className="space-y-2">
                  <div className="text-[0.5625rem] font-black uppercase tracking-widest text-text-muted px-1 flex items-center gap-1 leading-none">
                    <Palette size={10} className="text-text-muted shrink-0" />
                    Farb-Theme
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {AESTHETIC_THEMES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setAestheticTheme(t.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all ${app.theme === t.id ? 'bg-surface2 font-black text-text-primary border border-border' : 'hover:bg-surface2/50 text-text-secondary border border-transparent'}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                          <span className="text-[0.71875rem]">{t.label}</span>
                        </div>
                        {app.theme === t.id && <Check size={12} className="text-accent" />}
                      </button>
                    ))}
                  </div>

                  {/* Eigene Farb-Erweiterung im Theme-Abteil */}
                  <div className="border-t border-border/50 pt-2 px-1">
                    <div className="text-[0.5rem] font-black uppercase tracking-widest text-text-muted mb-1.5">Eigene Farbe</div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        id="theme-custom-color"
                        value={app.customBgColor || '#f3f4f6'} 
                        onChange={(e) => {
                          const val = e.target.value;
                          setApp(prev => ({
                            ...prev,
                            theme: 'custom_theme',
                            customBgColor: val
                          }));
                        }}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0  shrink-0 shadow-xs" 
                      />
                      <button
                        onClick={() => {
                          setApp(prev => ({
                            ...prev,
                            theme: 'custom_theme',
                            customBgColor: app.customBgColor || '#f3f4f6'
                          }));
                        }}
                        className={`flex-1 text-left px-2 py-1 rounded-lg text-[0.6875rem] flex items-center justify-between transition-all ${app.theme === 'custom_theme' ? 'bg-surface2 font-black text-text-primary' : 'hover:bg-surface2/50 text-text-secondary'}`}
                      >
                        <span>Benutzerdefiniert</span>
                        {app.theme === 'custom_theme' && <Check size={12} className="text-accent" />}
                      </button>
                    </div>

                    {app.theme === 'custom_theme' && (
                      <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                        <div className="space-y-1">
                          <label className="text-[0.5rem] font-black uppercase tracking-widest text-text-muted block leading-none">Schriftfarbe</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={app.customTextColor || '#171717'} 
                              onChange={(e) => {
                                const tc = e.target.value;
                                setApp(prev => ({
                                  ...prev,
                                  customTextColor: tc,
                                  boardSettings: {
                                    ...prev.boardSettings,
                                    boardTextColor: tc
                                  }
                                }));
                              }}
                              className="w-6 h-6 rounded-md cursor-pointer border-0 p-0  shrink-0 shadow-sm" 
                            />
                            <input
                              type="text"
                              value={app.customTextColor || '#171717'}
                              onChange={(e) => {
                                const tc = e.target.value;
                                setApp(prev => ({
                                  ...prev,
                                  customTextColor: tc,
                                  boardSettings: {
                                    ...prev.boardSettings,
                                    boardTextColor: tc
                                  }
                                }));
                              }}
                              className="flex-1 bg-surface2 border-0 rounded-lg py-1 px-2 text-[0.625rem] font-mono font-bold text-text-primary focus:ring-1 focus:ring-accent outline-none uppercase"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[0.5rem] font-black uppercase tracking-widest text-text-muted block leading-none">Sekundär-Schrift</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="color" 
                              value={app.customText2Color || '#525252'} 
                              onChange={(e) => {
                                const tc2 = e.target.value;
                                setApp(prev => ({
                                  ...prev,
                                  customText2Color: tc2
                                }));
                              }}
                              className="w-6 h-6 rounded-md cursor-pointer border-0 p-0  shrink-0 shadow-sm" 
                            />
                            <input
                              type="text"
                              value={app.customText2Color || '#525252'}
                              onChange={(e) => {
                                const tc2 = e.target.value;
                                setApp(prev => ({
                                  ...prev,
                                  customText2Color: tc2
                                }));
                              }}
                              className="flex-1 bg-surface2 border-0 rounded-lg py-1 px-2 text-[0.625rem] font-mono font-bold text-text-primary focus:ring-1 focus:ring-accent outline-none uppercase"
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

                          const cBg = app.customBgColor || '#f3f4f6';
                          const cFg = app.customTextColor || '#171717';
                          const con = getCon(cBg, cFg);
                          const isBgLight = getLum(cBg) > 0.5;

                          let bgBadge = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                          let rateText = 'Mangelhaft ❌';
                          if (con >= 7.0) {
                            bgBadge = 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
                            rateText = 'Perfekt 🌟';
                          } else if (con >= 4.5) {
                            bgBadge = 'bg-teal-500/10 text-teal-600 border border-teal-500/20';
                            rateText = 'Gut ✅';
                          } else if (con >= 3.0) {
                            bgBadge = 'bg-amber-500/10 text-amber-600 border border-amber-500/20';
                            rateText = 'Mittel ⚠️';
                          }

                          const autoFix = () => {
                            const textC = isBgLight ? '#121212' : '#f8fafc';
                            const text2C = isBgLight ? '#4b5563' : '#cbd5e1';
                            setApp(prev => ({
                              ...prev,
                              customTextColor: textC,
                              customText2Color: text2C,
                              boardSettings: {
                                ...prev.boardSettings,
                                boardTextColor: textC
                              }
                            }));
                          };

                          return (
                            <div className="space-y-1.5 bg-surface2/80 p-2 rounded-xl border border-border/50 text-left">
                              <div className="flex items-center justify-between text-[0.5rem] font-black uppercase tracking-wider text-text-muted">
                                <span>Lesbarkeit</span>
                                <span className={`px-1.5 py-0.5 rounded text-[0.5rem] font-bold ${bgBadge}`}>{rateText} ({con.toFixed(1)}:1)</span>
                              </div>
                              <button
                                type="button"
                                onClick={autoFix}
                                className="w-full py-1 bg-amber-500 text-white rounded-md text-[0.5rem] font-black uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer border-0"
                              >
                                <Sparkles size={8} />
                                Schrift Auto-Korrektur
                              </button>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Trenner */}
                <div className="border-t border-border/50 my-1" />

                {/* 2. Schriftart-Bereich */}
                <div className="space-y-2">
                  <div className="text-[0.5625rem] font-black uppercase tracking-widest text-text-muted px-1 flex items-center gap-1 leading-none">
                    <Type size={10} className="text-text-muted shrink-0" />
                    Schriftart
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {FONTS.map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFontFamily(f.id)}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl transition-all ${app?.settings?.fontFamily === f.id ? 'bg-surface2 font-black text-text-primary border border-border' : 'hover:bg-surface2/50 text-text-secondary border border-transparent'}`}
                      >
                        <span className={`text-[0.71875rem] font-${f.id}`}>{f.label}</span>
                        {app?.settings?.fontFamily === f.id && <Check size={12} className="text-accent" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trenner */}
                <div className="border-t border-border/50 my-1" />

                {/* 3. Zoom/Darstellung */}
                <div className="space-y-2">
                  <div className="text-[0.5625rem] font-black uppercase tracking-widest text-text-muted px-1">Darstellungsgröße</div>
                  <button 
                    className="w-full flex items-center justify-between px-3 py-2 bg-surface2 hover:bg-surface3/60 border border-border/60 rounded-xl transition-all text-[0.75rem] leading-tight font-semibold cursor-pointer border-0"
                    onClick={toggleZoom}
                  >
                    <span className="text-text-secondary font-bold">Größe:</span>
                    <span className="font-black px-1.5 py-0.5 rounded-md bg-surface border border-border uppercase text-[0.5625rem] tracking-wider text-text-primary">
                      {app?.settings?.zoomLevel === 'large' ? 'Groß' : app?.settings?.zoomLevel === 'compact' ? 'Kompakt' : 'Standard'}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {actions}

        {/* Datenkonsistenz-Prüfung Indicator Button */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-data-consistency'));
          }}
          className={`p-2 rounded-xl border transition-all flex items-center justify-center shrink-0 cursor-pointer relative ${
            consistencyIssues.length > 0 
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 hover:bg-amber-500/20 shadow-sm' 
              : 'bg-surface2 border-border/65 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/20'
          }`}
          title={consistencyIssues.length > 0 ? `${consistencyIssues.length} Daten-Diskrepanzen gefunden. Klicken zur Behebung!` : 'Daten-Konsistenz: OK!'}
          id="btn-datenkonsistenz"
        >
          <ShieldAlert size={14} strokeWidth={2.5} />
          {consistencyIssues.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          )}
        </button>

        {/* Datenschutz-Sperre Button */}
        <button
          onClick={() => {
            setScreenLocked(true);
          }}
          className="p-2 rounded-xl bg-surface2 border border-border/65 text-text-secondary hover:text-rose-600 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all outline-none cursor-pointer flex items-center justify-center shrink-0"
          title="Bildschirm sperren (Datenschutz)"
          id="btn-screensperre"
        >
          <Lock size={14} strokeWidth={2.5} />
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(err => {
                showToast(`Fehler beim Vollbild: ${err.message}`, "error");
              });
            } else {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
            }
          }}
          className={`p-2 rounded-xl transition-all border outline-none cursor-pointer flex items-center justify-center shrink-0 ${isFullscreen ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 shadow-inner-sm' : 'bg-surface2 border-border/65 text-text-secondary hover:text-text-primary hover:bg-surface3/60'}`}
          title={isFullscreen ? "Vollbild beenden" : "Vollbildmodus"}
        >
          {isFullscreen ? <Minimize size={14} strokeWidth={2.5} /> : <Maximize size={14} strokeWidth={2.5} />}
        </button>
      </div>
    </div>
  </div>
</header>
  );
});

export default Topbar;
