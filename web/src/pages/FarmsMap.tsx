import { MapContainer, TileLayer, Marker, Popup, Polygon, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api';
import { useEffect, useState, Fragment } from 'react';
import type { Farm } from '../api';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { 
  PlusCircle, 
  MapPin, 
  ChevronRight,
  Crosshair,
  Users
} from 'lucide-react';
import { useUserRole } from '../context/RoleContext';

function MapRecenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 16, { animate: true });
    }
  }, [center, map]);
  return null;
}

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function FarmsMap() {
  const { role } = useUserRole();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('satellite');
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locateLoading, setLocateLoading] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);

  useEffect(() => {
    loadFarms();
  }, []);

  const loadFarms = async () => {
    setLoading(true);
    try {
      const res = await api.getFarms();
      if (res.success) {
        setFarms(res.data);
        if (res.data.length > 0) {
          setSelectedFarmId(res.data[0].id);
          if (res.data[0].centroid) {
            setMapCenter([res.data[0].centroid.lat, res.data[0].centroid.lon]);
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLocateMe = () => {
    setLocateLoading(true);
    if (!navigator.geolocation) {
      setUserLocation([23.2599, 77.4126]);
      setLocateLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setMapCenter(coords);
        setLocateLoading(false);
      },
      () => {
        setUserLocation([23.2599, 77.4126]);
        setLocateLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSelectFarm = (farm: Farm) => {
    setSelectedFarmId(farm.id);
    if (farm.centroid) {
      setMapCenter([farm.centroid.lat, farm.centroid.lon]);
    } else if (farm.boundary?.coordinates?.[0]?.[0]) {
      const [lon, lat] = farm.boundary.coordinates[0][0];
      setMapCenter([lat, lon]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <div className="animate-spin rounded-full h-9 w-9 border-3 border-emerald-600 border-t-transparent"></div>
        <p className="text-xs font-semibold">
          {role === 'admin' 
            ? 'क्षेत्रीय भू-अभिलेख डेटा लोड हो रहा है (Loading regional farm telemetry)...'
            : 'खेतों का डेटा लोड हो रहा है (Loading your farms)...'}
        </p>
      </div>
    );
  }

  const defaultCenter: [number, number] = [23.2599, 77.4126];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {role === 'admin' ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                  Regional GIS Surveillance
                </span>
                <span className="text-xs text-slate-400 font-medium">PostGIS &bull; Sentinel-2</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                क्षेत्रीय कृषि भू-अभिलेख एवं उपग्रह निगरानी (Regional Farm Parcels &amp; Satellite Surveillance)
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Administrative surveillance of registered farmer land boundaries, acreage, and Sentinel-2 spectral indices across districts.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                मेरे पंजीकृत खेत (My Registered Farms)
              </h1>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                आपके खेत की सीमाएं, फसल स्थिति और उपग्रह निगरानी (Field boundaries &amp; live satellite health).
              </p>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {role === 'admin' ? (
            <Link
              to="/farmers"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs"
            >
              <Users size={16} /> Farmers Directory &amp; Inspection
            </Link>
          ) : (
            <Link
              to="/add-farm"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-emerald-600/20"
            >
              <PlusCircle size={16} /> नया खेत जोड़ें (Add New Farm)
            </Link>
          )}
        </div>
      </div>

      {/* Split-Screen Layout: Left Map (7 cols) & Right Cards (5 cols) */}
      <div className="grid lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Map View (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
          {/* Map Controls Header */}
          <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">नक्शा दृश्य:</span>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  mapType === 'satellite' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                🛰️ उपग्रह (Satellite)
              </button>
              <button
                type="button"
                onClick={() => setMapType('streets')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  mapType === 'streets' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white/10 text-slate-300 hover:bg-white/20'
                }`}
              >
                🗺️ साधारण (Streets)
              </button>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locateLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs shadow-sm transition-all"
              >
                {locateLoading ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Crosshair size={13} className="text-white" />
                )}
                <span>📍 मेरा स्थान</span>
              </button>
            </div>

            <span className="text-[11px] text-emerald-400 font-semibold bg-white/10 px-2.5 py-1 rounded-md">
              कुल खेत: {farms.length}
            </span>
          </div>

          {/* Map Canvas */}
          <div className="h-[520px] w-full relative z-10">
            <MapContainer center={mapCenter || defaultCenter} zoom={16} className="w-full h-full">
              <MapRecenter center={mapCenter || userLocation} />
              
              {userLocation && (
                <>
                  <Circle 
                    center={userLocation} 
                    radius={10} 
                    pathOptions={{ color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.35, weight: 2, dashArray: '3, 3' }} 
                  />
                  <Marker position={userLocation}>
                    <Popup>
                      <div className="text-xs font-bold text-slate-900">आपकी वर्तमान GPS स्थिति</div>
                    </Popup>
                  </Marker>
                </>
              )}

              {mapType === 'satellite' ? (
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

              {farms.map((farm) => {
                let position: [number, number] | null = null;
                let leafletCoords: [number, number][] | null = null;

                if (farm.centroid) {
                  position = [farm.centroid.lat, farm.centroid.lon];
                }
                if (farm.boundary && farm.boundary.coordinates && farm.boundary.coordinates[0]) {
                  leafletCoords = farm.boundary.coordinates[0].map(([lon, lat]) => [lat, lon]);
                }
                if (!position && leafletCoords && leafletCoords.length > 0) {
                  position = leafletCoords[0];
                }
                if (!position) return null;

                const isSelected = farm.id === selectedFarmId;

                return (
                  <Fragment key={farm.id}>
                    {leafletCoords && (
                      <Polygon 
                        positions={leafletCoords} 
                        pathOptions={{ 
                          color: isSelected ? '#eab308' : '#16a34a',
                          fillColor: isSelected ? '#fde047' : '#22c55e',
                          fillOpacity: isSelected ? 0.55 : 0.35,
                          weight: isSelected ? 4 : 2
                        }} 
                      />
                    )}
                    <Marker position={position}>
                      <Popup>
                        <div className="p-1 min-w-[210px] text-xs">
                          <h3 className="font-bold text-sm text-slate-900 mb-1">{farm.name}</h3>
                          <p>फसल: <strong className="text-emerald-700">{farm.crop || 'गेहूं (Wheat)'}</strong></p>
                          <p>क्षेत्रफल: <strong>{((farm.area_m2 / 10000) * 2.47105).toFixed(2)} एकड़</strong> ({(farm.area_m2 / 10000).toFixed(2)} ha)</p>
                          <Link 
                            to={`/farms/${farm.id}`} 
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 underline mt-2"
                          >
                            <span>खेत का पूरा विवरण देखें &rarr;</span>
                          </Link>
                        </div>
                      </Popup>
                    </Marker>
                  </Fragment>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* RIGHT COLUMN: Farm Cards List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1">
          {farms.length === 0 ? (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
              <p className="text-slate-500 text-sm mb-3">अभी तक कोई खेत नहीं जुड़ा है (No farms registered yet).</p>
              <Link to="/add-farm" className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                पहला खेत जोड़ें (Add First Farm)
              </Link>
            </div>
          ) : (
            farms.map((farm) => {
              const areaHa = (farm.area_m2 / 10000).toFixed(2);
              const areaAcres = ((farm.area_m2 / 10000) * 2.47105).toFixed(2);
              const areaBigha = ((farm.area_m2 / 10000) * 4.0).toFixed(2);
              const isSelected = farm.id === selectedFarmId;

              return (
                <div 
                  key={farm.id}
                  onClick={() => handleSelectFarm(farm)}
                  className={`cursor-pointer rounded-2xl p-4.5 transition-all border ${
                    isSelected 
                      ? 'bg-emerald-50/50 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20' 
                      : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                        {farm.name}
                        {isSelected && <span className="text-xs text-emerald-600 font-bold">📍 चयनित</span>}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <MapPin size={13} className="text-slate-400" />
                        <span>रकबा: <strong className="text-slate-800">{areaAcres} एकड़</strong> ({areaBigha} बीघा &bull; {areaHa} ha)</span>
                      </p>
                    </div>

                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                      {farm.crop || 'गेहूं (Wheat)'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <Link
                      to={`/farms/${farm.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl text-center transition-colors flex items-center justify-center gap-1 shadow-xs"
                    >
                      <span>खेत का विवरण देखें (View Intelligence)</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
