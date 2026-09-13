import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Satellite, 
  CloudRain, 
  ScanLine, 
  FlaskConical, 
  AlertTriangle, 
  MapPin, 
  PlusCircle, 
  Layers, 
  ChevronRight, 
  Droplets,
  Users,
  TrendingUp,
  Shield,
  Radio,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import type { Farm, AdminStats, Farmer, SatelliteIndices } from '../api';
import { useUserRole } from '../context/RoleContext';

export default function Dashboard() {
  const { role, userName } = useUserRole();
  const [loading, setLoading] = useState(true);

  // Farmer state
  const [farms, setFarms] = useState<Farm[]>([]);
  const [totalAreaHa, setTotalAreaHa] = useState(0);

  // Farmer live GPS location & Sentinel-2 state
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting GPS location...');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [satelliteData, setSatelliteData] = useState<SatelliteIndices | null>(null);
  const [satelliteLoading, setSatelliteLoading] = useState<boolean>(false);
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  const fetchSatelliteData = async (lat: number, lon: number, crop: string = 'wheat') => {
    setSatelliteLoading(true);
    try {
      const satRes = await api.getSatelliteIndices(lat, lon, crop);
      if (satRes.success && satRes.data) {
        setSatelliteData(satRes.data);
      }
    } catch (err) {
      console.error("Satellite indices fetch error:", err);
    } finally {
      setSatelliteLoading(false);
    }
  };

  const detectLocationAndFetchSatellite = (userFarms: Farm[] = farms) => {
    setIsLocating(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(4));
          const lon = Number(pos.coords.longitude.toFixed(4));
          setUserCoords({ lat, lon });
          setLocationName(`Current GPS (${lat}° N, ${lon}° E)`);
          setIsLocating(false);
          const primaryCrop = userFarms[0]?.crop || 'Wheat';
          fetchSatelliteData(lat, lon, primaryCrop);
        },
        (err) => {
          console.warn("Geolocation access warning:", err.message);
          setIsLocating(false);
          let fallbackLat = 23.2599;
          let fallbackLon = 77.4126;
          let fallbackLabel = 'Bhopal Region (Default)';
          if (userFarms.length > 0 && userFarms[0].centroid) {
            fallbackLat = userFarms[0].centroid.lat;
            fallbackLon = userFarms[0].centroid.lon;
            fallbackLabel = `${userFarms[0].name} Coordinates`;
          }
          setUserCoords({ lat: fallbackLat, lon: fallbackLon });
          setLocationName(fallbackLabel);
          const primaryCrop = userFarms[0]?.crop || 'Wheat';
          fetchSatelliteData(fallbackLat, fallbackLon, primaryCrop);
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setIsLocating(false);
      const fallbackLat = 23.2599;
      const fallbackLon = 77.4126;
      setUserCoords({ lat: fallbackLat, lon: fallbackLon });
      setLocationName('Bhopal Region (Default)');
      fetchSatelliteData(fallbackLat, fallbackLon, userFarms[0]?.crop || 'Wheat');
    }
  };

  // Admin state
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [recentFarmers, setRecentFarmers] = useState<Farmer[]>([]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (role === 'admin') {
          const [statsRes, farmersRes] = await Promise.allSettled([
            api.getAdminStats(),
            api.getFarmers(1, 5)
          ]);
          if (statsRes.status === 'fulfilled' && statsRes.value.success) {
            setAdminStats(statsRes.value.data);
          }
          if (farmersRes.status === 'fulfilled' && farmersRes.value.success) {
            setRecentFarmers(farmersRes.value.data);
          }
        } else {
          const [farmsRes, notifsRes] = await Promise.allSettled([
            api.getFarms(),
            api.getNotifications()
          ]);
          let loadedFarms: Farm[] = [];
          if (farmsRes.status === 'fulfilled' && farmsRes.value.success) {
            loadedFarms = farmsRes.value.data;
            setFarms(loadedFarms);
            const totalM2 = loadedFarms.reduce((acc, f) => acc + (f.area_m2 || 0), 0);
            setTotalAreaHa(Math.round(totalM2 / 10000));
          }
          if (notifsRes.status === 'fulfilled' && notifsRes.value.success) {
            const unread = notifsRes.value.data.filter(n => !n.is_read).length;
            setActiveAlertsCount(unread || notifsRes.value.data.length);
          }
          // Auto-trigger location & live Sentinel-2 indices
          detectLocationAndFetchSatellite(loadedFarms);
        }
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // ADMIN DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  if (role === 'admin') {
    const stats = adminStats || {
      total_farmers: recentFarmers.length,
      total_farms: 0,
      total_acreage_ha: 0,
      crop_distribution: {},
      active_sentinel_passes: 1,
      ai_diagnostics_healthy_pct: 100,
      system_status: 'ONLINE'
    };

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Admin Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                AgriShield Central Admin Console
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                System Healthy
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Platform Command & Oversight</h1>
            <p className="text-xs md:text-sm text-slate-500 mt-1">
              Regional agricultural surveillance, farmer registries, Sentinel-2 passes, and AI model orchestration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/alerts"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Radio size={16} /> Broadcast Warning
            </Link>
            <Link
              to="/farmers"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
            >
              <Users size={16} /> Manage Farmers
            </Link>
          </div>
        </div>

        {/* 4 Key Administrative KPI Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Registered Farmers */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Registered Farmers</span>
              <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
                <Users size={17} />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900">{stats.total_farmers}</span>
              <p className="text-[11px] text-sky-800 font-semibold mt-1 flex items-center gap-1">
                <span>Direct PMFBY phone identities</span>
              </p>
            </div>
          </div>

          {/* Monitored Acreage */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Monitored Area</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Layers size={17} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{stats.total_acreage_ha}</span>
                <span className="text-xs font-semibold text-slate-500">hectares</span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-1">
                &asymp; {(stats.total_acreage_ha * 2.47105).toFixed(0)} acres across {stats.total_farms} farm parcels
              </p>
            </div>
          </div>

          {/* Sentinel-2 Active Passes */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Copernicus Sentinel-2</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Satellite size={17} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{stats.active_sentinel_passes}</span>
                <span className="text-xs font-semibold text-slate-500">Active Orbits</span>
              </div>
              <p className="text-[11px] text-indigo-700 font-medium mt-1">10m multispectral telemetry active</p>
            </div>
          </div>

          {/* AI Inference Diagnostic Health */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">AI Model Health</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Shield size={17} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700">{stats.ai_diagnostics_healthy_pct}%</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Normal Vigor
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">EfficientNet-B0 + EasyOCR online</p>
            </div>
          </div>
        </div>

        {/* Middle Section: Regional Crop Distribution & Fast Launch Actions */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Crop Distribution Card */}
          <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Regional Crop Cultivation Distribution
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">PostGIS registered crop breakdown across districts</p>
              </div>
              <span className="text-xs font-semibold text-slate-500">{stats.total_farms} registered plots</span>
            </div>

            <div className="space-y-3">
              {Object.entries(stats.crop_distribution || {}).map(([crop, count]) => {
                const pct = Math.round((count / Math.max(stats.total_farms, 1)) * 100);
                return (
                  <div key={crop}>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-700">
                      <span>{crop}</span>
                      <span>{count} parcels ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Command Launchpad */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Admin Modules</span>
              <h3 className="text-lg font-bold mt-1 mb-2">Rapid Management Tools</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Access full administrative consoles for farmer verification, regional satellite mapping, and disaster alert dispatch.
              </p>

              <div className="space-y-2.5">
                <Link
                  to="/farmers"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Users size={15} className="text-emerald-400" /> Farmers Directory ({stats.total_farmers})
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>

                <Link
                  to="/farms-map"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin size={15} className="text-sky-400" /> Satellite Map Surveillance
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>

                <Link
                  to="/admin-approvals"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <UserCheck size={15} className="text-amber-400" /> Admin Access Requests (7-Day TTL)
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>

                <Link
                  to="/revenue"
                  className="flex items-center justify-between p-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-400" /> Mandi MSP & Economic Impact
                  </span>
                  <ChevronRight size={14} className="text-slate-400" />
                </Link>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Admin: {userName}</span>
              <span className="text-emerald-400 font-semibold">Ready</span>
            </div>
          </div>
        </div>

        {/* Recent Registered Farmers Snapshot */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Recent Registered Farmers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Farmers self-registered via mobile phone & OTP</p>
            </div>
            <Link
              to="/farmers"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              View Full Directory &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2 font-semibold">Farmer Name</th>
                  <th className="pb-2 font-semibold">Phone Number</th>
                  <th className="pb-2 font-semibold">Registered Parcels</th>
                  <th className="pb-2 font-semibold">Monitored Area</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentFarmers.slice(0, 5).map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-bold text-slate-900">{f.name || 'Farmer'}</td>
                    <td className="py-3 font-mono text-slate-600">{f.phone || 'N/A'}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                        {f.farm_count ?? 1} plots
                      </span>
                    </td>
                    <td className="py-3 font-semibold text-emerald-700">
                      {f.total_area_ha ?? 2.5} ha
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to="/farmers"
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // FARMER DASHBOARD VIEW
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Welcome & Summary Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Farmer Crop Intelligence Portal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Welcome back, {userName.split('(')[0]}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Real-time Sentinel-2 multispectral monitoring, localized weather advisories, and deep learning leaf scanner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/crop-scan"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <ScanLine size={16} /> Scan Leaf Disease
          </Link>
          <Link
            to="/add-farm"
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition-all"
          >
            <PlusCircle size={16} className="text-emerald-600" /> Draw New Farm (GPS)
          </Link>
        </div>
      </div>

      {/* Live GPS Coordinates & Sentinel-2 Telemetry Status Strip */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-2xl p-4 md:p-5 shadow-sm border border-emerald-800/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
            <Satellite className="text-emerald-400 animate-pulse" size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Copernicus Sentinel-2 Telemetry
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                {satelliteData?.resolution || '10m Multispectral'}
              </span>
              {satelliteData?.acquisition_date && (
                <span className="text-[10px] text-emerald-300/80 font-mono">
                  • Pass: {satelliteData.acquisition_date}
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm font-semibold text-white mt-1 flex items-center gap-1.5 flex-wrap">
              <MapPin size={14} className="text-emerald-400 shrink-0" />
              <span>{locationName}</span>
              {userCoords && (
                <span className="text-[11px] text-emerald-200/90 font-mono">
                  [{userCoords.lat.toFixed(4)}°, {userCoords.lon.toFixed(4)}°]
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => detectLocationAndFetchSatellite(farms)}
            disabled={isLocating || satelliteLoading}
            className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 active:scale-95 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/20 transition-all cursor-pointer"
            title="Update GPS coordinates and re-query Sentinel-2 pass"
          >
            <RefreshCw size={13} className={isLocating || satelliteLoading ? 'animate-spin' : ''} />
            <span>{isLocating ? 'Detecting GPS...' : satelliteLoading ? 'Querying Sentinel-2...' : 'Refresh GPS & Satellite'}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Intelligence KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Acreage */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">My Farm Area</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{totalAreaHa}</span>
              <span className="text-xs font-semibold text-slate-500">hectares</span>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {farms.length === 0
                ? '0 acres across 0 registered parcels'
                : `≈ ${(totalAreaHa * 2.47105).toFixed(1)} acres across ${farms.length} ${farms.length === 1 ? 'plot' : 'plots'}`}
            </p>
          </div>
        </div>

        {/* Sentinel-2 Crop Health NDVI */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Canopy Health (NDVI)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Satellite size={17} />
            </div>
          </div>
          <div>
            {satelliteLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium">Fetching Sentinel-2...</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {satelliteData?.ndvi_mean != null ? satelliteData.ndvi_mean.toFixed(2) : '--'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (satelliteData?.ndvi_mean ?? 0) >= 0.65
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    : (satelliteData?.ndvi_mean ?? 0) >= 0.40
                    ? 'text-lime-700 bg-lime-50 border border-lime-200'
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}>
                  {satelliteData?.ndvi_status || 'Vegetation Vigor'}
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>{satelliteData?.source || 'Sentinel-2 L2A'}</span>
              {satelliteData?.cloud_coverage_pct != null && (
                <span className="text-[10px] text-slate-400">Cloud: {satelliteData.cloud_coverage_pct}%</span>
              )}
            </p>
          </div>
        </div>

        {/* Irrigation Moisture Deficit */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Moisture Status (NDMI)</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Droplets size={17} />
            </div>
          </div>
          <div>
            {satelliteLoading ? (
              <div className="flex items-center gap-2 py-2">
                <div className="w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium">Analyzing moisture...</span>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">
                  {satelliteData?.ndmi_mean != null ? satelliteData.ndmi_mean.toFixed(2) : '--'}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (satelliteData?.ndmi_mean ?? 0) >= 0.30
                    ? 'text-sky-700 bg-sky-50 border border-sky-200'
                    : (satelliteData?.ndmi_mean ?? 0) >= 0.15
                    ? 'text-blue-700 bg-blue-50 border border-blue-200'
                    : 'text-amber-700 bg-amber-50 border border-amber-200'
                }`}>
                  {satelliteData?.ndmi_status || 'NDMI Status'}
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-500 mt-1 truncate">
              {satelliteData?.water_stress || 'Optimal root zone moisture'}
            </p>
          </div>
        </div>

        {/* Early Warnings Alert Count */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Warnings</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${activeAlertsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {activeAlertsCount}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                activeAlertsCount > 0 ? 'text-amber-800 bg-amber-50 border border-amber-200' : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
              }`}>
                {activeAlertsCount > 0 ? 'Hazards & Advisories' : 'All Clear'}
              </span>
            </div>
            <Link to="/alerts" className="text-[11px] text-emerald-700 font-semibold hover:underline mt-1 block">
              {activeAlertsCount > 0 ? 'View active warnings →' : 'View weather bulletins →'}
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Cards: 5 Direct Feature Access Tiles */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
          Quick Launchpad &bull; Core Farmer Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            to="/add-farm"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <PlusCircle size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Draw Farm Boundary</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Outline parcel corners with GPS location & 10m precision buffer.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 mt-4 flex items-center gap-1">
              Start Drawing <ChevronRight size={14} />
            </span>
          </Link>

          <Link
            to="/crop-scan"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <ScanLine size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Crop Leaf Scanner</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Instant deep learning disease detection with severity & fungicide advice.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 mt-4 flex items-center gap-1">
              Open Camera <ChevronRight size={14} />
            </span>
          </Link>

          <Link
            to="/soil-analysis"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FlaskConical size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Soil Health OCR</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Upload Soil Health Card photo to get custom Urea, DAP & MOP dosages.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 mt-4 flex items-center gap-1">
              Upload Card <ChevronRight size={14} />
            </span>
          </Link>

          <Link
            to="/weather-irrigation"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <CloudRain size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Smart Irrigation</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Canopy moisture deficit and 7-day rainfall forecast for watering schedule.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 mt-4 flex items-center gap-1">
              View Schedule <ChevronRight size={14} />
            </span>
          </Link>

          <Link
            to="/revenue"
            className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between group"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <TrendingUp size={20} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Mandi &amp; MSP Rates</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Daily APMC spot prices, regional crop pricing &amp; farm harvest valuation.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 mt-4 flex items-center gap-1">
              Explore Prices <ChevronRight size={14} />
            </span>
          </Link>
        </div>
      </div>

      {/* Farmer's Monitored Parcels */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              My Monitored Land Parcels
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Click any parcel to inspect Sentinel-2 vegetation curves and yield estimates.
            </p>
          </div>
          <Link
            to="/farms"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
          >
            View Map & Details <ArrowRight size={14} />
          </Link>
        </div>

        {farms.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
            <MapPin size={32} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No farm boundaries registered yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Draw your farm parcel boundary using our interactive GPS map tool to enable satellite monitoring.
            </p>
            <Link
              to="/add-farm"
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700"
            >
              Draw My First Farm
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {farms.slice(0, 6).map((farm) => {
              const areaHa = (farm.area_m2 / 10000).toFixed(2);
              const areaAcres = ((farm.area_m2 / 10000) * 2.47105).toFixed(2);
              
              return (
                <Link
                  key={farm.id}
                  to={`/farms/${farm.id}`}
                  className="bg-white border border-slate-200/80 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {farm.crop || 'Unsown'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {farm.id.substring(0, 8)}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors">
                      {farm.name}
                    </h3>
                    
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Acreage</span>
                        <p className="font-semibold text-slate-700">{areaHa} ha ({areaAcres} ac)</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Sentinel-2</span>
                        <p className="font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs text-emerald-700 font-semibold pt-2">
                    <span>Inspect Health & Yield</span>
                    <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
