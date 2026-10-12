import React, { useEffect, useRef, useState } from 'react';
import { decodeCurrentWeather, normalizeWeatherSample, validWeatherLocation, weatherCondition, WeatherLocation, WeatherSample } from '../../../lib/liveWeatherModel';
import { readWidgetLifecycleState, usePersistedWidgetLifecycleState } from '../../../lib/widgetLifecycleState';

export const WeatherWidgetContent: React.FC<{ widget: any; onUpdate?: (updates: any) => void; currentIsLight: boolean }> = ({ widget, onUpdate, currentIsLight }) => {
  const saved = readWidgetLifecycleState(widget, 'weather', {}) as any;
  const [sample, setSample] = useState<WeatherSample | null>(() => normalizeWeatherSample(saved.sample));
  const [draft, setDraft] = useState(() => typeof saved.draft === 'string' ? saved.draft.slice(0, 120) : sample?.place || 'Wien');
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error' | 'offline'>('loading');
  const [error, setError] = useState('');
  const generation = useRef(0), controller = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttempt = useRef<WeatherLocation | string>(sample || { place: 'Wien', lat: 48.2082, lon: 16.3738 });
  usePersistedWidgetLifecycleState(widget, onUpdate, 'weather', { sample, draft });

  const load = async (attempt: WeatherLocation | string) => {
    const request = ++generation.current;
    controller.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 12_000);
    timeoutRef.current = timeout;
    lastAttempt.current = attempt;
    setStatus('loading'); setError('');
    const current = () => generation.current === request;
    try {
      let location: WeatherLocation;
      if (typeof attempt === 'string') {
        const query = attempt.trim();
        if (!query) throw new Error('Bitte einen Ort eingeben.');
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=de`, { signal: abort.signal });
        if (!response.ok) throw new Error('Der Ort konnte nicht gesucht werden.');
        const data = await response.json(), place = data?.results?.[0];
        location = { place: place?.name, lat: place?.latitude, lon: place?.longitude };
        if (!validWeatherLocation(location)) throw new Error('Ort nicht gefunden. Bitte genauer suchen.');
      } else location = attempt;
      if (!current()) return;
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,weather_code`, { signal: abort.signal });
      if (!response.ok) throw new Error('Wetterdaten konnten nicht geladen werden.');
      const next = decodeCurrentWeather(await response.json(), location, Date.now());
      if (!next) throw new Error('Der Wetterdienst hat ungültige Daten geliefert.');
      if (!current()) return;
      if (abort.signal.aborted) throw new Error('Zeitüberschreitung');
      setSample(next);
      if (typeof attempt === 'string') setDraft(previous => previous.trim() === attempt.trim() ? next.place : previous);
      setStatus('loaded');
      lastAttempt.current = location;
    } catch (failure) {
      if (!current()) return;
      setStatus(navigator.onLine === false ? 'offline' : 'error');
      setError(abort.signal.aborted ? 'Die Wetterabfrage hat zu lange gedauert.' : failure instanceof Error ? failure.message : 'Wetterdaten konnten nicht geladen werden.');
    } finally { clearTimeout(timeout); if (timeoutRef.current === timeout) timeoutRef.current = null; }
  };

  useEffect(() => {
    void load(lastAttempt.current);
    return () => { generation.current++; controller.current?.abort(); if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, []);

  const locate = () => {
    controller.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const request = ++generation.current;
    setStatus('loading'); setError('');
    if (!navigator.geolocation) { setStatus('error'); setError('Standortzugriff nicht verfügbar. Suche einen Ort.'); return; }
    navigator.geolocation.getCurrentPosition(position => {
      if (generation.current !== request) return;
      const location = { place: 'Mein Standort', lat: position.coords.latitude, lon: position.coords.longitude };
      if (!validWeatherLocation(location)) { setStatus('error'); setError('Standort konnte nicht bestimmt werden.'); return; }
      void load(location);
    }, () => {
      if (generation.current === request) { setStatus('error'); setError('Standortzugriff nicht möglich. Suche einen Ort.'); }
    }, { timeout: 10_000, maximumAge: 60_000 });
  };

  const condition = sample ? weatherCondition(sample.code) : null;
  const button = 'min-h-11 min-w-11 rounded-xl border px-3 text-sm font-bold';
  return <section data-practice-root="weather" data-weather-status={status} data-weather-place={sample?.place || ''}
    aria-label="Aktueller Wetterbericht" className={`flex h-full w-full min-h-0 flex-col gap-3 overflow-hidden p-3 ${currentIsLight ? 'bg-sky-50 text-slate-900' : 'bg-slate-900 text-white'}`}>
    <form className="flex shrink-0 gap-2" onSubmit={event => { event.preventDefault(); void load(draft); }}>
      <input aria-label="Wetterort" value={draft} maxLength={120} onChange={event => setDraft(event.target.value)}
        className="min-h-11 min-w-0 flex-1 rounded-xl border bg-transparent px-3 text-base" />
      <button type="submit" aria-label="Wetter suchen" className={button}>Suchen</button>
    </form>
    <div role="status" className="shrink-0 text-sm leading-snug" aria-live="polite">
      {status === 'loading' ? 'Wetterdaten werden geladen …' : status === 'loaded' ? 'Wetterdaten geladen.' : status === 'offline' ? 'Offline. Wetterdaten konnten nicht aktualisiert werden.' : error}
    </div>
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
      <h3 className="max-w-full break-words text-lg font-bold">{sample?.place || 'Noch keine Wetterdaten'}</h3>
      <span className="text-5xl" aria-hidden="true">{condition?.icon || '☁️'}</span>
      <span data-weather-temperature className="text-4xl font-black tabular-nums">{sample ? `${sample.temperature} °C` : '—'}</span>
      <p data-weather-condition className="text-base font-bold">{condition?.name || 'Wetter unbekannt'}</p>
      {sample && <p className="text-xs">{status === 'loaded' ? 'Abgerufen' : 'Letzter gespeicherter Stand'}: <time dateTime={new Date(sample.updatedAt).toISOString()}>{new Date(sample.updatedAt).toLocaleString('de-AT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></p>}
    </div>
    <footer className="flex shrink-0 flex-wrap gap-2 pr-11">
      <button type="button" className={button} onClick={() => void load(lastAttempt.current)}>Erneut laden</button>
      <button type="button" className={button} onClick={locate}>Mein Standort</button>
      <p className="w-full text-xs">Quelle: Open-Meteo · Standort nur auf Knopfdruck</p>
    </footer>
  </section>;
};
