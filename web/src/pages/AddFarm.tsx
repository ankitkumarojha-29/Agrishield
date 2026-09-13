import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polygon, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  RotateCcw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sprout, 
  ArrowRight,
  Crosshair,
  Layers
} from 'lucide-react';
import { api } from '../api';
import type { GeoPolygon } from '../api';
import { CropSearchSelect } from '../components/CropSearchSelect';
import { SoilTypeSelect } from '../components/SoilTypeSelect';

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// GPS User Location Icon (Pulsing blue radar dot — clearly NOT a farm boundary corner)
const gpsUserIcon = L.divIcon({
  className: 'user-gps-marker',
  html: `
    <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: #38bdf8; opacity: 0.7; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: #0284c7; border: 2.5px solid #ffffff; box-shadow: 0 1px 4px rgba(0,0,0,0.5);"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11]
});

// Farm Boundary Corner Icon (Numbered green badge: 1, 2, 3...)
const createCornerIcon = (index: number) => L.divIcon({
  className: 'farm-corner-marker',
  html: `
    <div style="background: #16a34a; color: #ffffff; border: 2px solid #ffffff; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 11px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">
      ${index + 1}
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

// Component to handle map clicks for drawing
function MapClickHandler({ onAddPoint }: { onAddPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to dynamically pan/zoom map to GPS location
function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 18, { animate: true });
    }
  }, [center, map]);
  return null;
}

// Compute geodesic polygon area approx in m2 matching WGS84
function computePolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  let area = 0;
  const rad = Math.PI / 180;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    const p1 = coords[i];
    const p2 = coords[j];
    area += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }
  area = (area * 6378137 * 6378137) / 2; // Corrected geodesic factor (matches pyproj)
  return Math.abs(area);
}

export default function AddFarm() {
  const navigate = useNavigate();
  
  // GPS State
  const [currentGps, setCurrentGps] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Map view type: satellite default for rural land viewing
  const [mapLayer, setMapLayer] = useState<'satellite' | 'streets'>('satellite');

  // Boundary points — initialized EMPTY so clicking does not jump across the state!
  const [points, setPoints] = useState<[number, number][]>([]);

  const [farmName, setFarmName] = useState('');
  const [khasraNumber, setKhasraNumber] = useState('');
  const [crop, setCrop] = useState('Wheat (गेहूं)');
  const [sowingDate, setSowingDate] = useState(new Date().toISOString().split('T')[0]);
  const [soilType, setSoilType] = useState('Medium Black Loam');
  const [irrigationType, setIrrigationType] = useState('Tubewell');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddPoint = (lat: number, lng: number) => {
    setPoints(prev => [...prev, [lat, lng]]);
  };

  const handleUndo = () => {
    setPoints(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPoints([]);
  };

  // 10-meter range GPS capture logic — purely centers map & records GPS, NEVER adds as a corner
  const handleFetchCurrentLocation = () => {
    setGpsLoading(true);
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your device browser.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        setCurrentGps({ lat, lng, accuracy });
        setMapCenter([lat, lng]);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(`GPS permission required or unavailable (${err.message}). Defaulting to farm region.`);
        const fallbackLat = 23.2599;
        const fallbackLng = 77.4126;
        setCurrentGps({ lat: fallbackLat, lng: fallbackLng, accuracy: 5 });
        setMapCenter([fallbackLat, fallbackLng]);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Automatically fetch current GPS location on mount so farmer does not need to click "Locate My Position"
  useEffect(() => {
    handleFetchCurrentLocation();
  }, []);

  const approxAreaM2 = computePolygonArea(points);
  const approxAreaHa = (approxAreaM2 / 10000).toFixed(2);
  const approxAreaAcres = ((approxAreaM2 / 10000) * 2.47105).toFixed(2);
  const approxAreaBigha = ((approxAreaM2 / 10000) * 4.0).toFixed(2);
  const isValid = points.length >= 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) {
      setError('Please enter a farm name.');
      return;
    }
    if (points.length < 3) {
      setError('A farm boundary requires at least 3 points.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // GeoJSON Polygon coordinates: [[lon, lat], ...], closed ring (first == last)
      const ring = points.map(p => [p[1], p[0]]);
      ring.push([points[0][1], points[0][0]]); // Close ring

      const boundary: GeoPolygon = {
        type: 'Polygon',
        coordinates: [ring]
      };

      const res = await api.createFarm({
        name: farmName.trim(),
        crop,
        sowing_date: sowingDate,
        boundary,
        khasra_number: khasraNumber.trim() || undefined,
        soil_type: soilType,
        irrigation_type: irrigationType
      });

      if (res.success) {
        setSuccess(`Farm successfully registered! Calculated area: ${(res.data.area_m2 / 10000).toFixed(2)} hectares.`);
        setTimeout(() => {
          navigate(`/farms/${res.data.farm_id}`);
        }, 1200);
      } else {
        setError(res.error?.message || 'Failed to register farm.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Error creating farm boundary.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Interactive Boundary Tool &bull; 10m Precision
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Map & Register Land Parcel</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Use your device GPS or click corners on the satellite map to draw your field perimeter.
          </p>
        </div>

        {/* GPS Location Action Header */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleFetchCurrentLocation}
            disabled={gpsLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 rounded-xl text-xs font-semibold transition-all shadow-2xs"
            title="Refresh your current GPS position"
          >
            {gpsLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Crosshair size={15} className="text-sky-600" />
            )}
            <span>{gpsLoading ? 'GPS खोज रहे हैं...' : currentGps ? '📍 GPS Position Locked' : 'Locate My Position'}</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {gpsError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-amber-600" />
          <span>{gpsError}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3">
          <CheckCircle2 size={18} className="shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Map Drawing Tool (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Map Top Action Toolbar */}
            <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapLayer(mapLayer === 'satellite' ? 'streets' : 'satellite')}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-1.5 border border-white/20 transition-all"
                  title="Toggle Satellite Imagery & Street Map"
                >
                  <Layers size={14} className="text-emerald-400" />
                  <span>{mapLayer === 'satellite' ? '🛰️ उपग्रह (Satellite)' : '🗺️ साधारण (Streets)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  disabled={gpsLoading}
                  className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                  title="Recenter map on your physical GPS position"
                >
                  {gpsLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Crosshair size={14} className="text-white" />
                  )}
                  <span>{gpsLoading ? 'खोज रहे हैं...' : '🎯 मेरा स्थान (Locate Me)'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-300 font-medium px-2.5 py-1 bg-emerald-950/80 rounded-lg border border-emerald-800/60">
                  👆 नक्शे पर क्लिक करके कोने जोड़ें
                </span>

                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={points.length === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 flex items-center gap-1 transition-all"
                  title="Remove the last boundary point"
                >
                  <RotateCcw size={13} />
                  <span>↩️ हटाएं (Undo)</span>
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  disabled={points.length === 0}
                  className="px-2.5 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/60 disabled:opacity-40 flex items-center gap-1 transition-all"
                  title="Clear all points"
                >
                  <Trash2 size={13} />
                  <span>🗑️ साफ करें (Clear)</span>
                </button>
              </div>
            </div>

            <div className="h-[460px] w-full z-10 relative">
              <MapContainer 
                center={points.length > 0 ? points[0] : (mapCenter || [23.2599, 77.4126])} 
                zoom={17} 
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                {mapLayer === 'satellite' ? (
                  <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri World Imagery</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                  />
                ) : (
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                )}
                <MapClickHandler onAddPoint={handleAddPoint} />
                <MapRecenter center={mapCenter} />
                
                {/* 10-meter accuracy circle and user location blue dot (Non-interactive reference, NOT a farm boundary corner) */}
                {currentGps && (
                  <>
                    <Circle 
                      center={[currentGps.lat, currentGps.lng]} 
                      radius={10} 
                      interactive={false}
                      pathOptions={{ 
                        color: '#0284c7', 
                        fillColor: '#38bdf8', 
                        fillOpacity: 0.25, 
                        weight: 1.5, 
                        dashArray: '3, 3' 
                      }} 
                    />
                    <Marker 
                      position={[currentGps.lat, currentGps.lng]} 
                      icon={gpsUserIcon}
                      interactive={false}
                    />
                  </>
                )}

                {/* Drawn Farm Polygon */}
                {points.length >= 3 && (
                  <Polygon 
                    positions={points} 
                    pathOptions={{ color: '#eab308', fillColor: '#22c55e', fillOpacity: 0.45, weight: 3 }} 
                  />
                )}

                {/* Boundary Corner Markers with Numbers (1, 2, 3...) */}
                {points.map((p, idx) => (
                  <Marker 
                    key={idx} 
                    position={p} 
                    icon={createCornerIcon(idx)}
                  />
                ))}
              </MapContainer>

              {/* In-Map Helper Callout */}
              <div className="absolute bottom-3 left-3 z-20 bg-black/85 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl text-xs max-w-xs pointer-events-none border border-white/20 shadow-md">
                <p className="font-semibold text-emerald-400">👉 खेत का नक्शा कैसे बनाएं (How to map):</p>
                <p className="text-[11px] text-slate-200 mt-0.5 leading-snug">
                  नक्शे पर अपने खेत के <b>3 या 4 कोनों पर क्लिक करें</b>।
                </p>
                <p className="text-[10px] text-sky-300 mt-1">
                  📍 नीला बिंदु आपकी स्थिति दिखाता है (यह खेत का कोना नहीं है)।
                </p>
              </div>
            </div>

            {/* Live Metrics Footer Bar */}
            <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">खेत के कोने (Corners)</span>
                  <span className={`font-bold ${points.length >= 3 ? 'text-emerald-700' : 'text-amber-600'}`}>
                    {points.length} {points.length === 1 ? 'कोना' : 'कोने'} {points.length >= 3 ? '✅' : '(कम से कम 3 चाहिए)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">अनुमानित क्षेत्रफल (Land Area)</span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {points.length >= 3 ? (
                      <>
                        <span className="text-emerald-700">{approxAreaAcres} एकड़ (Acres)</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span>{approxAreaBigha} बीघा</span>
                        <span className="text-slate-400 font-normal mx-1">&bull;</span>
                        <span className="text-slate-500 font-normal text-xs">{approxAreaHa} ha</span>
                      </>
                    ) : (
                      <span className="text-slate-400 text-xs font-normal">कोने चुनने के बाद दिखेगा</span>
                    )}
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-1 rounded-md border border-slate-200">
                🛰️ उपग्रह परिशुद्धता (10m Resolution)
              </span>
            </div>
          </div>

        {/* Right Form Parameters (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Sprout size={18} className="text-emerald-600" />
              <span>Farm & Crop Details</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Farm Name *</label>
              <input 
                type="text"
                required
                placeholder="e.g. North Plot - Soy & Wheat"
                value={farmName}
                onChange={e => setFarmName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Searchable Bilingual Crop Selector */}
            <div>
              <CropSearchSelect
                value={crop}
                onChange={setCrop}
                label="Primary Crop / मुख्य फसल"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Khasra Number / खसरा नं.</label>
                <input 
                  type="text"
                  placeholder="उदा. 142/2A"
                  value={khasraNumber}
                  onChange={e => setKhasraNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs md:text-sm text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sowing Date / बुवाई तारीख</label>
                <input 
                  type="date"
                  value={sowingDate}
                  onChange={e => setSowingDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-800 focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Comprehensive Indian Soil Types (15+ classifications with Hindi) */}
            <div>
              <SoilTypeSelect
                value={soilType}
                onChange={setSoilType}
                label="Soil Type / मिट्टी का प्रकार"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Irrigation Method</label>
              <select 
                value={irrigationType}
                onChange={e => setIrrigationType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
              >
                <option value="Tubewell">Tubewell / Borewell</option>
                <option value="Canal">Canal Gravity Flow</option>
                <option value="Drip">Micro Drip Irrigation</option>
                <option value="Rainfed">Rainfed (Unirrigated)</option>
              </select>
            </div>

            {/* Validation & Submit Button */}
            <div className="pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSubmitting || !isValid || !farmName.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl text-xs md:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Computing PostGIS Area...</span>
                  </>
                ) : (
                  <>
                    <span>Submit &amp; Register Farm Boundary</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
