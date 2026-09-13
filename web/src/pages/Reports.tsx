import { useState } from 'react';
import { 
  Download, 
  Satellite, 
  FlaskConical, 
  ScanLine, 
  Radio, 
  CheckCircle2, 
  Filter
} from 'lucide-react';
import { api } from '../api';

interface ReportItem {
  id: string;
  name: string;
  category: 'satellite' | 'disease' | 'soil' | 'parcels';
  date: string;
  type: 'PDF' | 'CSV' | 'XLSX';
  size: string;
  summary: string;
}

const officialReports: ReportItem[] = [
  {
    id: 'rep-1',
    name: 'Sentinel-2 Regional NDVI & Canopy Vigor Archive - August 2026',
    category: 'satellite',
    date: 'Aug 28, 2026',
    type: 'PDF',
    size: '12.4 MB',
    summary: '10m multi-spectral indices (NDVI, NDMI, NDWI) across all registered farm polygons.'
  },
  {
    id: 'rep-2',
    name: 'District-wide Crop Disease & Pest Outbreak Surveillance',
    category: 'disease',
    date: 'Aug 24, 2026',
    type: 'CSV',
    size: '418 KB',
    summary: 'Aggregated leaf camera detections, Yellow Rust and Leaf Blight severity logs.'
  },
  {
    id: 'rep-3',
    name: 'Soil Health Card N-P-K & Micronutrient Deficiency Audit',
    category: 'soil',
    date: 'Aug 18, 2026',
    type: 'XLSX',
    size: '890 KB',
    summary: 'OCR extracted Nitrogen, Phosphorus, Potash and pH balances across 23 farm clusters.'
  },
  {
    id: 'rep-4',
    name: 'Farmer GPS Parcel Boundaries & Acreage Certification Ledger',
    category: 'parcels',
    date: 'Aug 10, 2026',
    type: 'CSV',
    size: '260 KB',
    summary: 'Server-computed PostGIS polygon coordinates, vertices, and anti-overlap verification.'
  },
  {
    id: 'rep-5',
    name: 'Pre-Monsoon Sowing & Soil Moisture Trajectory Report',
    category: 'satellite',
    date: 'Jul 30, 2026',
    type: 'PDF',
    size: '8.7 MB',
    summary: 'Copernicus Earth Observation comparative soil moisture analysis vs 5-year average.'
  }
];

export default function Reports() {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filteredReports = categoryFilter === 'all' 
    ? officialReports 
    : officialReports.filter(r => r.category === categoryFilter);

  const handleDownload = async (report: ReportItem) => {
    setDownloadingId(report.id);
    try {
      let content = "";
      if (report.category === 'parcels') {
        const farmsRes = await api.getFarms();
        const farms = farmsRes.success ? farmsRes.data : [];
        content = "Farm ID,Plot Name,Khasra Number,Crop,Sowing Date,Soil Type,Irrigation Method,Area (ha)\n" +
          farms.map((f: any) => `"${f.id}","${f.name}","${f.khasra_number || ''}","${f.crop || ''}","${f.sowing_date || ''}","${f.soil_type || ''}","${f.irrigation_type || ''}",${((f.area_m2 || 0)/10000).toFixed(2)}`).join("\n");
      } else if (report.category === 'soil') {
        const soilRes = await api.getMySoilReports();
        const reports = soilRes.success ? soilRes.data : [];
        content = "Report ID,Farm Name,Nitrogen (N),Phosphorus (P),Potassium (K),pH Level,Confidence,Recorded At\n" +
          reports.map((s: any) => `"${s.id}","${s.farm_name}",${s.n},${s.p},${s.k},${s.ph},${s.confidence},"${s.created_at || ''}"`).join("\n");
      } else if (report.category === 'disease') {
        const scansRes = await api.getMyCropScans();
        const scans = scansRes.success ? scansRes.data : [];
        content = "Scan ID,Farm,Crop,Diagnosis,Severity,Confidence,Date\n" +
          scans.map((sc: any) => `"${sc.id}","${sc.farm_name}","${sc.crop}","${sc.disease}","${sc.severity}",${sc.confidence},"${sc.created_at || ''}"`).join("\n");
      } else {
        content = `AgriShield Satellite & Vegetation Telemetry Report\nReport: ${report.name}\nGenerated: ${new Date().toISOString()}\nSentinel-2 NDVI/NDMI/NDWI Resolution: 10m Multispectral\nSource: European Space Agency (ESA) Copernicus Data Space\nCoverage: All Registered Farm Polygons`;
      }

      const mimeType = report.type === 'CSV' ? 'text/csv;charset=utf-8;' : 'text/plain;charset=utf-8;';
      const file = new Blob([content], { type: mimeType });
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = `${report.name.replace(/\s+/g, '_')}.${report.type.toLowerCase()}`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error("Report download error:", e);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportAll = () => {
    const csvContent = "data:text/csv;charset=utf-8," + [
      "Report Name,Category,Date,Type,File Size",
      ...officialReports.map(r => `"${r.name}","${r.category}","${r.date}","${r.type}","${r.size}"`)
    ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agrishield_master_intelligence_manifest_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Administrative Intelligence
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={12} /> Live Sync
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Surveillance & Analytics Reports</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Comprehensive audit ledgers for Sentinel-2 satellite passes, AI leaf disease detections, and regional soil health.
          </p>
        </div>

        <button 
          onClick={handleExportAll}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-xs transition-all"
        >
          <Download size={16} />
          Export Master Manifest (CSV)
        </button>
      </div>

      {/* 4 Agronomic Key Indicator Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sentinel-2 Coverage</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Satellite size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-slate-900">98.6%</span>
              <span className="text-xs font-semibold text-emerald-600">+1.2%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">10m resolution spectral telemetry</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">AI Leaf Diagnostic</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ScanLine size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-slate-900">94.2%</span>
              <span className="text-xs font-semibold text-emerald-600">High Confidence</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">EfficientNet-B0 vision classifier</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Soil Nutrient Index</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FlaskConical size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-slate-900">68.4%</span>
              <span className="text-xs font-semibold text-amber-700">Balanced NPK</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">OCR processed Soil Health Cards</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Advisory Reach</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Radio size={17} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-black text-slate-900">100%</span>
              <span className="text-xs font-semibold text-sky-700">Active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Direct phone notification dispatch</p>
          </div>
        </div>
      </div>

      {/* Filter & Generated Reports Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Certified Agricultural Data Reports</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select and download official platform intelligence logs for district agronomy records.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={13} /> Filter:
            </span>
            {[
              { id: 'all', label: 'All Reports' },
              { id: 'satellite', label: 'Satellite NDVI' },
              { id: 'disease', label: 'Disease Scans' },
              { id: 'soil', label: 'Soil Cards' },
              { id: 'parcels', label: 'Farm Parcels' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  categoryFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reports List */}
        <div className="divide-y divide-slate-100">
          {filteredReports.map((report) => (
            <div 
              key={report.id}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition-colors group"
            >
              <div className="flex items-start gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                  report.type === 'PDF' 
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : report.type === 'CSV'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {report.type}
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                    {report.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {report.summary}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1.5">
                    <span>Generated: {report.date}</span>
                    <span>&bull;</span>
                    <span>File size: {report.size}</span>
                    <span>&bull;</span>
                    <span className="text-emerald-700 font-medium">Verified Clean</span>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center">
                <button
                  onClick={() => handleDownload(report)}
                  disabled={downloadingId === report.id}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 transition-all shadow-2xs"
                >
                  {downloadingId === report.id ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download size={14} />
                      <span>Download {report.type}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

