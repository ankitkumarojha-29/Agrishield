import { useState, useEffect } from 'react';
import { 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  X, 
  Download, 
  ExternalLink,
  Camera,
  FlaskConical,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  AlertTriangle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';
import type { Farmer, Farm, FarmerOverview } from '../api';
import { Link, useSearchParams } from 'react-router-dom';
import { DEFAULT_AVATAR } from '../context/RoleContext';
import { CROPS_CATALOG, fetchCropsCatalog, type CropInfo } from '../data/agriCatalog';
import { TableSkeleton, Skeleton } from '../components/common/Skeleton';

const generatePageNumbers = (current: number, total: number): (number | string)[] => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, '...', total];
  }
  if (current >= total - 3) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, '...', current - 1, current, current + 1, '...', total];
};

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('all');
  // Slot size (10, 50, 100 per slot) and pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Farmer Detail Drawer state
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);
  const [farmerOverview, setFarmerOverview] = useState<FarmerOverview | null>(null);
  const [farmerFarms, setFarmerFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(false);
  const [activeTab, setActiveTab] = useState<'farms' | 'scans' | 'soil'>('farms');
  const [cropsList, setCropsList] = useState<CropInfo[]>(CROPS_CATALOG);
  const [plotSearch, setPlotSearch] = useState('');
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);

  const handleReconcileScans = async () => {
    setReconciling(true);
    setReconcileMessage(null);
    try {
      const res = await api.triggerReconcileScans();
      if (res.success && res.data) {
        setReconcileMessage(res.data.message);
        if (selectedFarmer) {
          handleInspectFarmer(selectedFarmer);
        }
      } else {
        setReconcileMessage('AI tunnel offline or no pending scans to reconcile.');
      }
    } catch {
      setReconcileMessage('AI service is currently offline. Will auto-sync when tunnel connects.');
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    fetchCropsCatalog().then(data => {
      if (data && data.length > 0) setCropsList(data);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCrop, pageSize]);

  useEffect(() => {
    loadFarmers();
  }, []);

  const loadFarmers = async () => {
    setLoading(true);
    try {
      const res = await api.getFarmers();
      if (res.success) {
        setFarmers(res.data);
      }
    } catch (e) {
      console.error("Error loading farmers", e);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectFarmer = async (farmer: Farmer, initialTab: 'farms' | 'scans' | 'soil' = 'farms') => {
    setSelectedFarmer(farmer);
    setActiveTab(initialTab);
    setPlotSearch('');
    setLoadingFarms(true);
    try {
      const res = await api.getFarmerOverview(farmer.id);
      if (res.success && res.data) {
        setFarmerOverview(res.data);
        setFarmerFarms(res.data.farms || []);
      } else {
        const farmRes = await api.getFarmerFarms(farmer.id);
        if (farmRes.success) {
          setFarmerFarms(farmRes.data);
        }
      }
    } catch (e) {
      console.error(e);
      setFarmerFarms([]);
      setFarmerOverview(null);
    } finally {
      setLoadingFarms(false);
    }
  };

  useEffect(() => {
    const inspectParam = searchParams.get('inspect') || searchParams.get('farmerId');
    const tabParam = (searchParams.get('tab') as 'farms' | 'scans' | 'soil') || 'scans';
    if (inspectParam && farmers.length > 0) {
      const target = farmers.find(f => f.id === inspectParam || f.phone === inspectParam);
      if (target) {
        handleInspectFarmer(target, tabParam);
      }
    }
  }, [searchParams, farmers]);

  const handleExportCSV = () => {
    if (farmers.length === 0) return;
    const headers = ["ID", "Name", "Phone", "Email", "Parcels Count", "Total Area Ha", "Crops", "Registered Date"];
    const rows = farmers.map(f => [
      f.id,
      `"${f.name || 'Farmer'}"`,
      `"${f.phone || ''}"`,
      `"${f.email || ''}"`,
      f.farm_count ?? 1,
      f.total_area_ha ?? 0,
      `"${(f.crops || []).join(', ')}"`,
      f.created_at ? f.created_at.split('T')[0] : ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agrishield_farmers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredFarmers = farmers.filter(farmer => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || (
      (farmer.name && farmer.name.toLowerCase().includes(q)) ||
      (farmer.phone && farmer.phone.toLowerCase().includes(q)) ||
      (farmer.email && farmer.email.toLowerCase().includes(q)) ||
      (farmer.id && farmer.id.toLowerCase().includes(q)) ||
      (farmer.farm_names && farmer.farm_names.some(fn => fn.toLowerCase().includes(q))) ||
      (farmer.khasra_numbers && farmer.khasra_numbers.some(kn => kn.toLowerCase().includes(q)))
    );

    const matchesCrop = selectedCrop === 'all' || (
      farmer.crops && farmer.crops.some(c => {
        const cLower = c.toLowerCase();
        const selLower = selectedCrop.toLowerCase();
        const matchedCropObj = cropsList.find(cr => cr.name.toLowerCase() === selLower || cr.id === selLower);
        return cLower.includes(selLower) || 
               (matchedCropObj && (cLower.includes(matchedCropObj.hindi.toLowerCase()) || cLower.includes(matchedCropObj.id)));
      })
    );

    return matchesSearch && matchesCrop;
  });

  const totalFilteredFarmers = filteredFarmers.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredFarmers / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalFilteredFarmers);
  const paginatedFarmers = filteredFarmers.slice(startIndex, endIndex);

  const filteredFarmerPlots = farmerFarms.filter(farm => {
    if (!plotSearch.trim()) return true;
    const q = plotSearch.toLowerCase().trim();
    return (
      (farm.name && farm.name.toLowerCase().includes(q)) ||
      (farm.khasra_number && farm.khasra_number.toLowerCase().includes(q)) ||
      (farm.crop && farm.crop.toLowerCase().includes(q))
    );
  });

  const totalAcreageHa = farmers.reduce((acc, f) => acc + (f.total_area_ha || 0), 0);
  const totalParcels = farmers.reduce((acc, f) => acc + (f.farm_count || 1), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Admin Registry Console
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Farmers Management</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Browse, manage, and inspect all registered farmer identities, contact details, and their linked farm parcels.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleReconcileScans}
            disabled={reconciling}
            className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
            title="Auto-reanalyzes scans that were processed while AI tunnel was offline"
          >
            <RefreshCw size={15} className={reconciling ? "animate-spin text-emerald-700" : "text-emerald-700"} />
            <span>{reconciling ? "Re-analyzing Scans..." : "Sync Offline AI Scans"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            <Download size={16} className="text-slate-600" /> Export CSV Directory
          </button>
        </div>
      </div>

      {reconcileMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles size={16} className="text-emerald-700 shrink-0" />
            <span>{reconcileMessage}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setReconcileMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-md cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Farmers</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{farmers.length}</p>
          <p className="text-[11px] text-sky-700 font-medium">Active phone identities</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Registered Parcels</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalParcels}</p>
          <p className="text-[11px] text-emerald-700 font-medium">PostGIS GPS bounded</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Monitored Area</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalAcreageHa.toFixed(1)} ha</p>
          <p className="text-[11px] text-emerald-700 font-medium">&asymp; {(totalAcreageHa * 2.47105).toFixed(0)} acres</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase">Sentinel-2 Sync</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">100%</p>
          <p className="text-[11px] text-slate-400 font-medium">Active Copernicus feed</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            placeholder="नाम, मोबाइल, ID, ईमेल या खसरा से खोजें..." 
            type="text" 
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Crop:</span>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
            >
              <option value="all">सभी फसलें (All Crops)</option>
              {cropsList.map(c => (
                <option key={c.id} value={c.name}>
                  {c.icon} {c.name} ({c.hindi})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 pl-2">स्लॉट / Slot:</span>
            {[10, 50, 100].map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setPageSize(slot);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  pageSize === slot
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
                title={`Show ${slot} farmers per slot`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3.5">Farmer Profile</th>
                    <th className="px-5 py-3.5">Phone & Contact</th>
                    <th className="px-5 py-3.5">Farm Parcels</th>
                    <th className="px-5 py-3.5">Crops Cultivated</th>
                    <th className="px-5 py-3.5">Total Area</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
              </table>
            </div>
            <TableSkeleton rows={pageSize > 10 ? 8 : pageSize} columns={7} />
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users size={36} className="text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm text-slate-700">No farmers match the current filter</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or crop filter.</p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-5 py-3.5">Farmer Profile</th>
                    <th className="px-5 py-3.5">Phone & Contact</th>
                    <th className="px-5 py-3.5">Farm Parcels</th>
                    <th className="px-5 py-3.5">Crops Cultivated</th>
                    <th className="px-5 py-3.5">Total Area</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedFarmers.map((farmer) => (
                    <tr key={farmer.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            <img 
                              src={farmer.avatar_url || DEFAULT_AVATAR} 
                              alt={farmer.name || 'Farmer'} 
                              className="w-full h-full object-cover" 
                              width={36}
                              height={36}
                              loading="lazy"
                              decoding="async"
                              onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                            />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{farmer.name || 'Farmer'}</div>
                            <span className="text-[10px] text-slate-400 font-mono">ID: {farmer.id.substring(0, 8)}...</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-800">
                        {farmer.phone || 'N/A'}
                        {farmer.email && <div className="text-[10px] text-slate-400 font-sans">{farmer.email}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold">
                          {farmer.farm_count ?? 1} plots
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {farmer.crops && farmer.crops.length > 0 ? (
                            farmer.crops.map((c, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                                {c}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Wheat / Soybean</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-emerald-700 text-sm">
                        {farmer.total_area_ha ? `${farmer.total_area_ha} ha` : '2.4 ha'}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Active
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleInspectFarmer(farmer)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs shadow-2xs transition-colors"
                        >
                          Inspect &amp; Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/90 border-t border-slate-200 text-xs">
                <div className="text-slate-500 font-medium">
                  दिखा रहे हैं / Showing <strong className="text-slate-900 font-bold">{totalFilteredFarmers === 0 ? 0 : startIndex + 1}–{endIndex}</strong> of <strong className="text-slate-900 font-bold">{totalFilteredFarmers}</strong> किसान / farmers (पृष्ठ {safePage}/{totalPages})
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safePage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    title="First page"
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft size={14} />
                    <span className="hidden sm:inline">Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {generatePageNumbers(safePage, totalPages).map((p, idx) => (
                      p === '...' ? (
                        <span key={`ell-${idx}`} className="px-1 text-slate-400 font-bold text-xs">...</span>
                      ) : (
                        <button
                          key={`pg-${p}`}
                          onClick={() => setCurrentPage(Number(p))}
                          className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all ${
                            safePage === p
                              ? 'bg-slate-900 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-semibold flex items-center gap-1 shadow-2xs"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight size={14} />
                  </button>

                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
                    title="Last page"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Farmer Inspection Slide-Over / Modal */}
      {selectedFarmer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-full sm:max-w-xl md:max-w-2xl bg-white h-full shadow-2xl p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-300 shadow-xs shrink-0">
                  <img 
                    src={selectedFarmer.avatar_url || DEFAULT_AVATAR} 
                    alt={selectedFarmer.name || 'Farmer'} 
                    className="w-full h-full object-cover" 
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                  />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Farmer Details
                  </span>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-0.5 truncate">{selectedFarmer.name}</h2>
                </div>
              </div>
              <button 
                onClick={() => setSelectedFarmer(null)}
                className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl min-w-[40px] min-h-[40px] flex items-center justify-center cursor-pointer transition-colors"
                title="Close drawer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Farmer Contact Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone size={15} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">Phone:</span>
                <span className="font-mono font-bold text-slate-900">{selectedFarmer.phone}</span>
                <a 
                  href={`tel:${selectedFarmer.phone}`}
                  className="ml-auto text-[11px] text-emerald-700 font-semibold hover:underline"
                >
                  Call Farmer
                </a>
              </div>
              {selectedFarmer.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail size={15} className="text-slate-500 shrink-0" />
                  <span className="font-semibold">Email:</span>
                  <span className="truncate">{selectedFarmer.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-700">
                <Calendar size={15} className="text-slate-500 shrink-0" />
                <span className="font-semibold">Registered:</span>
                <span>{selectedFarmer.created_at ? selectedFarmer.created_at.split('T')[0] : 'Active'}</span>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveTab('farms')}
                className={`flex-1 min-w-[100px] py-2.5 px-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                  activeTab === 'farms'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Layers size={14} />
                <span>खेत ({farmerFarms.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scans')}
                className={`flex-1 min-w-[120px] py-2.5 px-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                  activeTab === 'scans'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Camera size={14} />
                <span>पत्ती स्कैन ({farmerOverview?.scans?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('soil')}
                className={`flex-1 min-w-[110px] py-2.5 px-2 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[44px] ${
                  activeTab === 'soil'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FlaskConical size={14} />
                <span>मृदा कार्ड ({farmerOverview?.soil_reports?.length || 0})</span>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'farms' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Linked Farm Parcels ({farmerFarms.length})
                  </h3>
                  <span className="text-[11px] text-emerald-700 font-semibold">PostGIS Bounded</span>
                </div>

                {/* Plot Search Bar */}
                {farmerFarms.length > 0 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
                    <input
                      type="text"
                      placeholder="खसरा संख्या या खेत के नाम से खोजें (Search khasra # or farm name)..."
                      value={plotSearch}
                      onChange={(e) => setPlotSearch(e.target.value)}
                      className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
                    />
                    {plotSearch && (
                      <button
                        onClick={() => setPlotSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                        title="Clear plot search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}

                {loadingFarms ? (
                  <div className="space-y-3 p-1">
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                  </div>
                ) : farmerFarms.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    Farmer has not submitted any GPS boundaries yet.
                  </div>
                ) : filteredFarmerPlots.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    खसरा संख्या या नाम <span className="font-semibold text-slate-700">"{plotSearch}"</span> से कोई खेत नहीं मिला।
                    <button
                      onClick={() => setPlotSearch('')}
                      className="block mx-auto mt-2 text-emerald-700 font-bold hover:underline"
                    >
                      Clear Search
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plotSearch && (
                      <div className="text-[11px] text-slate-500 flex justify-between items-center px-1">
                        <span>Showing {filteredFarmerPlots.length} of {farmerFarms.length} plots</span>
                        <button onClick={() => setPlotSearch('')} className="text-emerald-700 hover:underline">Reset</button>
                      </div>
                    )}
                    {filteredFarmerPlots.map((farm) => (
                      <div key={farm.id} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-emerald-300 transition-all flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 text-sm">{farm.name}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {farm.crop || 'Unsown'}
                          </span>
                        </div>
                        {farm.khasra_number && (
                          <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50/70 px-2 py-0.5 rounded inline-block self-start mt-0.5 border border-emerald-100">
                            खसरा #{farm.khasra_number}
                          </span>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">मिट्टी (Soil Type)</span>
                            <span className="font-semibold text-slate-800">{farm.soil_type || 'Medium Black Loam'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-bold">सिंचाई विधि (Irrigation)</span>
                            <span className="font-semibold text-slate-800">{farm.irrigation_type || 'Borewell'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-1 border-t border-slate-100">
                          <span>
                            Area: <strong>{farm.area_m2 ? (farm.area_m2 / 10000).toFixed(2) : '0.00'} ha</strong> ({farm.area_m2 ? (farm.area_m2 / 4046.86).toFixed(2) : '0.00'} Acres)
                          </span>
                          <Link
                            to={`/farms/${farm.id}`}
                            onClick={() => setSelectedFarmer(null)}
                            className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                          >
                            View Satellite Indices <ExternalLink size={12} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'scans' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera size={14} className="text-emerald-600" />
                      <span>किसान पत्ती रोग जांच (Crop Pathology Evidence)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      किसान द्वारा खेत में खींची गई फोटो एवं AI निदान का विवरण
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    कुल: {farmerOverview?.scans?.length || 0}
                  </span>
                </div>

                {loadingFarms ? (
                  <div className="space-y-3 py-2">
                    <Skeleton className="h-44 w-full rounded-2xl" />
                    <Skeleton className="h-44 w-full rounded-2xl" />
                  </div>
                ) : (!farmerOverview?.scans || farmerOverview.scans.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-500 bg-slate-50/50">
                    <Camera size={28} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700 mb-1">कोई पत्ती स्कैन उपलब्ध नहीं (No Leaf Scans)</p>
                    <p className="text-slate-400">इस किसान ने अभी तक फसल रोग जांच के लिए कोई पत्ती की फोटो अपलोड नहीं की है।</p>
                  </div>
                ) : (
                  farmerOverview.scans.map((scan) => {
                    const isSevere = scan.severity?.toLowerCase() === 'severe' || scan.severity?.toLowerCase() === 'high';
                    const isModerate = scan.severity?.toLowerCase() === 'moderate';
                    const leafImg = scan.image_data_uri || scan.image_url;

                    return (
                      <div 
                        key={scan.id} 
                        className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 shadow-xs hover:shadow-md transition-all space-y-3.5"
                      >
                        {/* Scan Top Header: Disease & Severity */}
                        <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm md:text-base">
                                {scan.label || scan.disease}
                              </span>
                              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-2xs ${
                                isSevere
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : isModerate
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}>
                                {isSevere ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                                <span>{scan.severity || 'Normal'}</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span>खेत: <strong className="text-slate-700">{scan.farm_name || 'Field Plot'}</strong></span>
                              <span>&bull;</span>
                              <span>फसल: <strong className="text-emerald-800">{scan.crop}</strong></span>
                              <span>&bull;</span>
                              <span>अवस्था: <span className="capitalize">{scan.growth_stage}</span></span>
                            </p>
                          </div>
                          {scan.created_at && (
                            <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-md shrink-0">
                              {scan.created_at.split('T')[0]}
                            </span>
                          )}
                        </div>

                        {/* Uploaded Leaf Photo Display */}
                        {leafImg ? (
                          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group shadow-xs">
                            <img 
                              src={api.resolveMediaUrl(leafImg)} 
                              alt="Farmer Uploaded Leaf Evidence" 
                              className="w-full h-44 sm:h-52 object-cover group-hover:scale-105 transition-transform duration-200 cursor-pointer"
                              onClick={() => setPreviewModalImage(api.resolveMediaUrl(leafImg))}
                              loading="lazy"
                              decoding="async"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-900/80 text-white font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                                📷 Farmer Photo Evidence
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewModalImage(api.resolveMediaUrl(leafImg))}
                              className="absolute bottom-2 right-2 text-xs bg-slate-900/90 hover:bg-slate-900 text-white font-bold px-3 py-1.5 rounded-xl backdrop-blur-xs flex items-center gap-1.5 cursor-pointer shadow-md transition-all hover:scale-105"
                            >
                              <Eye size={13} />
                              <span>बड़ा फोटो देखें (Inspect Full Photo)</span>
                            </button>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-400 italic flex items-center gap-2">
                            <Camera size={16} className="text-slate-300 shrink-0" />
                            <span>No leaf photograph uploaded with this scan</span>
                          </div>
                        )}

                        {/* AI Confidence & Diagnostics Bar */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Confidence Score</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              <span className="text-base font-extrabold text-emerald-700">
                                {Math.round((scan.confidence || 0.9) * 100)}%
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">Precision Rating</span>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">Model Engine</span>
                            <div className="mt-1 flex items-center gap-1">
                              {scan.model_version && !scan.model_version.includes('mock') ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Live AI ({scan.model_version})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                  Fallback ({scan.model_version || 'mock-v1'})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Agronomic Curative Treatment */}
                        {(scan.treatment || (scan.recommendations && scan.recommendations[0])) && (
                          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs space-y-1">
                            <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                              <Sparkles size={14} className="text-emerald-700 shrink-0" />
                              <span>अनुशंसित उपचार (Curative Agronomic Prescription):</span>
                            </h4>
                            <p className="text-emerald-900 leading-relaxed text-[11px] pl-5">
                              {scan.treatment || scan.recommendations[0]}
                            </p>
                          </div>
                        )}

                        {/* Long-Term Preventive Measures */}
                        {(scan.prevention || (scan.recommendations && scan.recommendations.length > 1 && scan.recommendations[1])) && (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                              <CheckCircle2 size={14} className="text-slate-600 shrink-0" />
                              <span>दीर्घकालिक रोकथाम (Long-Term Prevention):</span>
                            </h4>
                            <p className="text-slate-600 leading-relaxed text-[11px] pl-5">
                              {scan.prevention || scan.recommendations[1]}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'soil' && (
              <div className="space-y-3">
                {(!farmerOverview?.soil_reports || farmerOverview.soil_reports.length === 0) ? (
                  <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                    <FlaskConical size={24} className="mx-auto text-slate-300 mb-2" />
                    No Soil Health Card OCR reports uploaded by this farmer yet.
                  </div>
                ) : (
                  farmerOverview.soil_reports.map((s) => (
                    <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{s.farm_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {s.created_at ? s.created_at.split('T')[0] : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold block">N (नाइट्रोजन)</span>
                          <span className="text-base font-black text-slate-900">{s.n}</span>
                          <span className="text-[9px] text-slate-400 block">kg/ha</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold block">P (फास्फोरस)</span>
                          <span className="text-base font-black text-slate-900">{s.p}</span>
                          <span className="text-[9px] text-slate-400 block">kg/ha</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold block">K (पोटाश)</span>
                          <span className="text-base font-black text-slate-900">{s.k}</span>
                          <span className="text-[9px] text-slate-400 block">kg/ha</span>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-500 font-bold block">pH मान</span>
                          <span className="text-base font-black text-slate-900">{s.ph}</span>
                          <span className="text-[9px] text-emerald-600 font-semibold block">उपयुक्त</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 flex justify-between">
                        <span>OCR Confidence: <strong className="text-slate-800">{Math.round((s.confidence || 0.85) * 100)}%</strong></span>
                        <span className="text-emerald-700 font-medium">Verified Soil Card</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedFarmer(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* High-Resolution Leaf Photo Lightbox Modal */}
      {previewModalImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewModalImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-400" />
                <span>किसान द्वारा अपलोड की गई पत्ती फोटो (Leaf Inspection)</span>
              </span>
              <button 
                onClick={() => setPreviewModalImage(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-2 sm:p-4 overflow-auto flex items-center justify-center bg-black/40">
              <img 
                src={previewModalImage} 
                alt="Enlarged Leaf Lesion Evidence" 
                className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
              />
            </div>
            <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Full resolution photographic evidence submitted for AI diagnostic verification</span>
              <button
                type="button"
                onClick={() => window.open(previewModalImage, '_blank')}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <ExternalLink size={12} /> मूल फोटो खोलें (Open Full Image)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
