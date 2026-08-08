import React, { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { Student } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

// fix leaflet default icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Prevent Leaflet unmount crash in React 18
class MapErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.warn('Leaflet error caught:', error); }
  render() { if (this.state.hasError) return <div className="p-4 bg-red-50 text-red-500 rounded-xl">Kartenfehler. Bitte laden Sie die Seite neu oder wechseln Sie die Ansicht.</div>; return this.props.children; }
}

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    try {
      map.setView(center, zoom);
    } catch (e) {
      console.warn("MapUpdater error", e);
    }
  }, [center, zoom, map]);
  return null;
}

interface StudentMapProps {
  students: Student[];
}

interface GeocodedStudent extends Student {
  lat?: number;
  lon?: number;
  geocodeStatus: 'pending' | 'success' | 'failed' | 'no_address';
}

export default function StudentMap({ students }: StudentMapProps) {
  const { app } = useApp();
  const [geocodedStudents, setGeocodedStudents] = useState<GeocodedStudent[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [baseCenter, setBaseCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchBase = async () => {
      const cityString = `${app.schulPlz || ''} ${app.schulOrt || ''} Austria`.trim();
      // If we have nothing, we can't do much
      if (!cityString || cityString === 'Austria') return;
      
      try {
        // Try up to 2 times with different string variations
        const queries = [
            cityString,
            `${app.schulOrt || ''} Austria`.trim()
        ];
        
        for (const q of queries) {
            if (!q || q === 'Austria') continue;
            const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
            const data = await res.json();
            if (data?.features?.length > 0 && isMounted) {
                const coords = data.features[0].geometry.coordinates;
                setBaseCenter([coords[1], coords[0]]);
                break; // Found it
            }
            await new Promise(r => setTimeout(r, 300));
        }
      } catch (e) {
         console.error("Base geocoding error", e);
      }
    }
    fetchBase();
    return () => { isMounted = false; };
  }, [app.schulPlz, app.schulOrt]);

  useEffect(() => {
    let isMounted = true;
    
    const geocodeAddresses = async () => {
      // Create a map to preserve results to avoid re-fetching on every mount (in-memory cache)
      const cachedCoords = new Map<string, { lat: number, lon: number }>();
      
      const newGeocoded: GeocodedStudent[] = [];
      setIsGeocoding(true);

      for (const student of students) {
        if (!student.anschrift || !student.ort) {
          newGeocoded.push({ ...student, geocodeStatus: 'no_address' });
          continue;
        }

        const addressString = `${student.anschrift}, ${student.plz || ''} ${student.ort}, Austria`;
        
        if (cachedCoords.has(addressString)) {
           const coords = cachedCoords.get(addressString)!;
           newGeocoded.push({ ...student, lat: coords.lat, lon: coords.lon, geocodeStatus: 'success' });
           continue;
        }

        try {
          // Use Photon API (more tolerant with messy addresses, faster)
          await new Promise(r => setTimeout(r, 600)); // Respectful delay, Photon allows more than Nominatim but good to be safe
          
          let res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(addressString)}&limit=1`);
          let data = await res.json();

          if (data && data.features && data.features.length > 0) {
            const coords = data.features[0].geometry.coordinates;
            // Photon returns [lon, lat]
            const lon = coords[0];
            const lat = coords[1];
            cachedCoords.set(addressString, { lat, lon });
            newGeocoded.push({ ...student, lat, lon, geocodeStatus: 'success' });
          } else {
            // Fallback: Try with just street and city
            const fallbackString = `${student.anschrift || ''}, ${student.ort || ''}`.trim();
            await new Promise(r => setTimeout(r, 600));
            res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(fallbackString)}&limit=1`);
            data = await res.json();
            
            if (data && data.features && data.features.length > 0) {
                const coords = data.features[0].geometry.coordinates;
                const lon = coords[0];
                const lat = coords[1];
                cachedCoords.set(addressString, { lat, lon });
                newGeocoded.push({ ...student, lat, lon, geocodeStatus: 'success' });
            } else {
                // Fallback 2: Just use the city (Ort)
                const cityString = `${student.plz || ''} ${student.ort || ''}`.trim();
                if (cityString) {
                   await new Promise(r => setTimeout(r, 600));
                   res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cityString)}&limit=1`);
                   data = await res.json();
                   
                   if (data && data.features && data.features.length > 0) {
                        const coords = data.features[0].geometry.coordinates;
                        const lon = coords[0];
                        const lat = coords[1];
                        // Cache it for the original address string anyway so we don't re-fetch
                        cachedCoords.set(addressString, { lat, lon });
                        newGeocoded.push({ ...student, lat, lon, geocodeStatus: 'success' }); // we could flag it as 'partial' if we wanted
                   } else {
                        newGeocoded.push({ ...student, geocodeStatus: 'failed' });
                   }
                } else {
                    newGeocoded.push({ ...student, geocodeStatus: 'failed' });
                }
            }
          }
        } catch (error) {
          console.error(`Error geocoding ${addressString}:`, error);
          newGeocoded.push({ ...student, geocodeStatus: 'failed' });
        }
      }

      if (isMounted) {
        setGeocodedStudents(newGeocoded);
        setIsGeocoding(false);
      }
    };

    geocodeAddresses();

    return () => {
      isMounted = false;
    };
  }, [students]);

  const mapCenter: [number, number] = useMemo(() => {
    const validCoords = geocodedStudents.filter(s => s.lat && s.lon);
    if (validCoords.length === 0) return baseCenter || [47.5162, 14.5501]; // Default setup ort or Austria center
    
    // Average lat and lon
    const avgLat = validCoords.reduce((sum, s) => sum + s.lat!, 0) / validCoords.length;
    const avgLon = validCoords.reduce((sum, s) => sum + s.lon!, 0) / validCoords.length;
    
    return [avgLat, avgLon];
  }, [geocodedStudents, baseCenter]);

  return (
    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-4 sm:p-8 space-y-6 flex flex-col" style={{ minHeight: '600px' }}>
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-[1.25rem] leading-normal sm:text-[1.5rem] leading-normal font-black text-slate-900 tracking-tighter">Schüler-Karte</h2>
                <p className="text-[0.75rem] leading-tight font-bold uppercase tracking-widest text-slate-400 mt-1">
                    Wohnortverteilung der Klasse
                </p>
            </div>
            {isGeocoding && (
                <div className="flex items-center gap-2 text-[0.75rem] leading-tight font-bold text-accent px-3 py-1.5 bg-accent/10 rounded-full">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Lade Koordinaten...</span>
                </div>
            )}
        </div>

        <div className="w-full rounded-2xl  border border-slate-200 relative z-0" style={{ height: '500px' }}>
          <MapErrorBoundary>
            <MapContainer key={baseCenter ? 'base-set' : 'no-base'} center={mapCenter} zoom={baseCenter ? 14 : 11} style={{ height: '100%', width: '100%' }}>
                <MapUpdater center={mapCenter} zoom={baseCenter ? 14 : 11} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {geocodedStudents.map((student) => {
                    if (student.lat && student.lon) {
                        return (
                            <Marker key={student.id} position={[student.lat, student.lon]}>
                                <Popup>
                                    <div className="text-[0.875rem] leading-snug font-bold">
                                        <div className="flex items-center gap-2 mb-1">
                                            {student.emoji && <span>{student.emoji}</span>}
                                            <span className="text-slate-900">{student.vorname} {student.nachname}</span>
                                        </div>
                                        <div className="text-slate-500 text-[0.75rem] leading-tight font-medium">
                                            {student.anschrift}<br />
                                            {student.plz} {student.ort}
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    }
                    return null;
                })}
            </MapContainer>
          </MapErrorBoundary>
        </div>
        
        {!isGeocoding && geocodedStudents.some(s => s.geocodeStatus === 'failed' || s.geocodeStatus === 'no_address') && (
            <div className="flex p-4 rounded-xl bg-slate-50 text-slate-600 text-[0.75rem] leading-tight font-medium gap-3 items-start border border-slate-100">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                   <span className="font-bold block mb-1">Einige Adressen konnten nicht auf der Karte platziert werden:</span>
                   <div className="flex flex-wrap gap-1">
                        {geocodedStudents.filter(s => s.geocodeStatus === 'no_address').map(s => (
                            <span key={s.id} className="px-2 py-0.5 bg-slate-200/50 rounded text-slate-500" title="Keine Adresse angegeben">{s.vorname} (Keine)</span>
                        ))}
                        {geocodedStudents.filter(s => s.geocodeStatus === 'failed').map(s => (
                            <span key={s.id} className="px-2 py-0.5 bg-rose-50 rounded text-rose-600" title="Adresse nicht gefunden">{s.vorname} (Nicht gefunden)</span>
                        ))}
                   </div>
                </div>
            </div>
        )}
    </div>
  );
}
