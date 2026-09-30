import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Student } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

// fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Prevent Leaflet unmount crash in React 18
class MapErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.warn('Leaflet error caught:', error); }
  render() { if (this.state.hasError) return <div className="p-4 bg-red-50 text-red-500 rounded-xl">Kartenfehler. Bitte laden Sie die Seite neu oder wechseln Sie die Ansicht.</div>; return this.props.children; }
}

function MapViewportUpdater({
  positions,
  fallbackCenter,
  fallbackZoom,
}: {
  positions: [number, number][];
  fallbackCenter: [number, number];
  fallbackZoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    try {
      map.invalidateSize();
      if (positions.length === 1) {
        map.setView(positions[0], 15);
      } else if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), { padding: [32, 32], maxZoom: 15 });
      } else {
        map.setView(fallbackCenter, fallbackZoom);
      }
    } catch (e) {
      console.warn("Map viewport update error", e);
    }
  }, [fallbackCenter, fallbackZoom, map, positions]);
  return null;
}

function MapClickHandler({
  enabled,
  onSelect,
}: {
  enabled: boolean;
  onSelect: (position: [number, number]) => void;
}) {
  useMapEvents({
    click(event) {
      if (enabled) onSelect([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

interface StudentMapProps {
  students: Student[];
}

function hasManualPosition(student: Student): student is Student & {
  kartenPosition: NonNullable<Student['kartenPosition']>;
} {
  const position = student.kartenPosition;
  return Boolean(
    position?.source === 'manual'
      && Number.isFinite(position.lat)
      && Number.isFinite(position.lon)
      && position.lat >= -90
      && position.lat <= 90
      && position.lon >= -180
      && position.lon <= 180,
  );
}

export default function StudentMap({ students }: StudentMapProps) {
  const { app, updateStudent } = useApp();
  const [tilesUnavailable, setTilesUnavailable] = useState(false);
  const [schoolLocationUnavailable, setSchoolLocationUnavailable] = useState(false);
  const [isResolvingSchool, setIsResolvingSchool] = useState(false);
  const [retry, setRetry] = useState(0);
  const [baseCenter, setBaseCenter] = useState<[number, number] | null>(null);
  const [placingStudentId, setPlacingStudentId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBase = async () => {
      const cityString = `${app.schulPlz || ''} ${app.schulOrt || ''} Austria`.trim();
      if (!cityString || cityString === 'Austria') {
        setSchoolLocationUnavailable(true);
        return;
      }

      setIsResolvingSchool(true);
      setSchoolLocationUnavailable(false);
      let found = false;

      try {
        const queries = [
          cityString,
          `${app.schulOrt || ''} Austria`.trim(),
        ];

        for (const q of queries) {
          if (!q || q === 'Austria') continue;
          const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`, {
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          if (data?.features?.length > 0 && isMounted) {
            const coords = data.features[0].geometry.coordinates;
            setBaseCenter([coords[1], coords[0]]);
            found = true;
            break;
          }
        }
      } catch (e) {
        console.warn('[Karte] Schulort konnte nicht geladen werden:', e);
      } finally {
        if (isMounted) {
          setIsResolvingSchool(false);
          setSchoolLocationUnavailable(!found);
        }
      }
    }
    fetchBase();
    return () => { isMounted = false; };
  }, [app.schulPlz, app.schulOrt, retry]);

  const positionedStudents = useMemo(
    () => students.filter(hasManualPosition),
    [students],
  );
  const manualPositions = useMemo(
    () => positionedStudents.map(student => [student.kartenPosition.lat, student.kartenPosition.lon] as [number, number]),
    [positionedStudents],
  );
  const fallbackCenter: [number, number] = baseCenter || [47.5162, 14.5501];
  const fallbackZoom = baseCenter ? 13 : 6;

  const saveManualPosition = (position: [number, number]) => {
    if (!placingStudentId) return;
    const student = students.find(candidate => candidate.id === placingStudentId);
    if (!student) return;
    updateStudent({
      ...student,
      kartenPosition: {
        lat: position[0],
        lon: position[1],
        source: 'manual',
        updatedAt: new Date().toISOString(),
      },
    });
    setPlacingStudentId(null);
  };

  const removeManualPosition = (student: Student) => {
    const nextStudent = { ...student };
    delete nextStudent.kartenPosition;
    updateStudent(nextStudent);
  };

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-8 space-y-6 flex flex-col" style={{ minHeight: '600px' }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
        <div>
          <h2 className="text-[1.25rem] leading-normal sm:text-[1.5rem] font-black text-slate-900 tracking-tighter">
            Schüler-Karte
          </h2>
          <p className="text-[0.75rem] leading-tight font-bold uppercase tracking-widest text-slate-400 mt-1">
            Manuelle Wohnortpositionen der Klasse
          </p>
          <p className="text-[0.6875rem] leading-relaxed font-medium text-slate-400 mt-2 max-w-2xl">
            Setze jeden Pin selbst auf der Karte. Die genaue Adresse wird nicht an einen Geocoder gesendet; gespeichert wird nur die manuell gewählte Position im verschlüsselten Klassenstand. OpenStreetMap liefert ausschließlich den Kartenhintergrund.
          </p>
        </div>
        {isResolvingSchool && (
          <div className="flex items-center gap-2 text-[0.75rem] leading-tight font-bold text-accent px-3 py-1.5 bg-accent/10 rounded-full shrink-0">
            <Loader2 size={12} className="animate-spin" />
            <span>Lade Schulort...</span>
          </div>
        )}
      </div>

      {placingStudentId && (
        <div role="status" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm text-slate-800">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-black text-white">1</span>
            <div>
              <strong className="block">Klicke jetzt auf die richtige Stelle auf der Karte.</strong>
              <span className="text-xs text-slate-600">
                Pin für {students.find(student => student.id === placingStudentId)?.vorname || 'den Schüler'} setzen. Die Auswahl kann jederzeit geändert werden.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPlacingStudentId(null)}
            className="self-start rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 sm:self-auto"
          >
            Abbrechen
          </button>
        </div>
      )}

      <div className={`w-full rounded-2xl border border-slate-200 relative z-0 overflow-hidden ${placingStudentId ? 'cursor-crosshair' : ''}`} style={{ height: '500px' }}>
        <MapErrorBoundary>
          <MapContainer key={baseCenter ? 'base-set' : 'no-base'} center={fallbackCenter} zoom={fallbackZoom} style={{ height: '100%', width: '100%' }}>
            <MapViewportUpdater positions={manualPositions} fallbackCenter={fallbackCenter} fallbackZoom={fallbackZoom} />
            <MapClickHandler enabled={Boolean(placingStudentId)} onSelect={saveManualPosition} />
            <TileLayer
              eventHandlers={{ tileerror: () => setTilesUnavailable(true), tileload: () => setTilesUnavailable(false) }}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {positionedStudents.map(student => (
              <Marker
                key={student.id}
                position={[student.kartenPosition.lat, student.kartenPosition.lon]}
                eventHandlers={{ click: () => setPlacingStudentId(student.id) }}
              >
                <Popup>
                  <div className="text-[0.875rem] leading-snug font-bold">
                    <div className="flex items-center gap-2 mb-1">
                      {student.emoji && <span>{student.emoji}</span>}
                      <span className="text-slate-900">{student.vorname} {student.nachname}</span>
                    </div>
                    <div className="text-slate-500 text-[0.75rem] leading-tight font-medium mb-3">
                      Manuell gesetzte Kartenposition
                    </div>
                    <button
                      type="button"
                      onClick={() => setPlacingStudentId(student.id)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
                    >
                      Position ändern
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            {positionedStudents.length === 0 && !placingStudentId && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[400] flex -translate-y-1/2 justify-center px-4">
                <div className="rounded-xl bg-white/95 px-4 py-3 text-center text-sm font-semibold text-slate-600 shadow-lg ring-1 ring-slate-200">
                  Noch keine Pins gesetzt. Wähle unten einen Schüler aus.
                </div>
              </div>
            )}
          </MapContainer>
        </MapErrorBoundary>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Schülerpositionen</h3>
            <p className="text-xs font-medium text-slate-500">Wähle einen Schüler und klicke anschließend auf seine Stelle auf der Karte.</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{positionedStudents.length} von {students.length} gesetzt</span>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {students.length === 0 && (
            <p className="col-span-full rounded-xl bg-white px-3 py-4 text-sm font-medium text-slate-500">Noch keine Schüler in dieser Klasse.</p>
          )}
          {students.map(student => {
            const hasPosition = hasManualPosition(student);
            const isPlacing = placingStudentId === student.id;
            return (
              <div key={student.id} className={`flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 ${isPlacing ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200'}`}>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">
                    {student.emoji && <span className="mr-1">{student.emoji}</span>}
                    {student.vorname} {student.nachname}
                  </div>
                  <div className={`mt-0.5 text-[0.6875rem] font-semibold ${hasPosition ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {hasPosition ? 'Position gesetzt' : 'Noch kein Pin'}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlacingStudentId(student.id)}
                    className={`rounded-lg px-2.5 py-2 text-[0.6875rem] font-bold ${isPlacing ? 'bg-accent text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  >
                    {hasPosition ? 'Ändern' : 'Pin setzen'}
                  </button>
                  {hasPosition && (
                    <button
                      type="button"
                      onClick={() => removeManualPosition(student)}
                      className="rounded-lg px-2 py-2 text-[0.6875rem] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Pin für ${student.vorname} entfernen`}
                    >
                      Entfernen
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {!isResolvingSchool && (tilesUnavailable || schoolLocationUnavailable) && (
        <div role="status" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="flex-1">
            <strong className="block">{tilesUnavailable ? 'Kartenkacheln derzeit nicht verfügbar.' : 'Schulort konnte nicht geladen werden.'}</strong>
            <span className="text-xs">Die manuellen Pins bleiben erhalten. Prüfe die Internetverbindung und die Freigabe der OpenStreetMap-Kartenkacheln.</span>
          </div>
          <button
            type="button"
            onClick={() => { setTilesUnavailable(false); setRetry(value => value + 1); }}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 font-semibold"
          >
            Erneut versuchen
          </button>
        </div>
      )}
    </div>
  );
}
