import { useState, useRef, useEffect } from 'react';
import { 
  ScanLine, 
  UploadCloud, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Camera,
  Zap,
  History,
  Clock,
  ChevronRight
} from 'lucide-react';
import { api } from '../api';
import type { CropHealthResult } from '../api';
import { CropSearchSelect } from '../components/CropSearchSelect';
import { AIScanLoader, LaserScanOverlay } from '../components/common/AIScanLoader';
import { LiveCameraModal } from '../components/common/LiveCameraModal';
import { compressImage, formatBytes } from '../utils/imageCompressor';

export default function CropScan() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{ original: string; compressed: string; savings: number } | null>(null);
  const [crop, setCrop] = useState('Wheat');
  const [growthStage, setGrowthStage] = useState('vegetative');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CropHealthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadScanHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getMyCropScans();
      if (res.success && res.data) {
        setRecentScans(res.data);
      }
    } catch (err) {
      console.warn('Failed to load past scans:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadScanHistory();
  }, []);

  const handleLiveCapture = async (file: File) => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const comp = await compressImage(file, { maxDimension: 1600, quality: 0.84 });
    const localUrl = URL.createObjectURL(comp.file);
    setSelectedFile(comp.file);
    setPreviewUrl(localUrl);
    setResult(null);
    setError(null);
    if (comp.wasCompressed) {
      setCompressionInfo({
        original: formatBytes(comp.originalSize),
        compressed: formatBytes(comp.compressedSize),
        savings: comp.savingsPercent,
      });
    } else {
      setCompressionInfo(null);
    }
  };

  const handleSelectPastScan = (scan: any) => {
    const img = scan.image_data_uri || scan.image_url;
    if (img) {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(api.resolveMediaUrl(img));
      setSelectedFile(null);
      setCompressionInfo(null);
    }
    setCrop(scan.crop || 'Wheat');
    setGrowthStage(scan.growth_stage || 'vegetative');
    setResult({
      label: scan.label || scan.disease || 'Analyzed Crop Leaf',
      severity: (scan.severity || 'moderate').toLowerCase() as any,
      confidence: scan.confidence || 0.9,
      model_version: 'cv-efficientnet-b0-v1',
      treatment: scan.treatment || (scan.recommendations && scan.recommendations[0]) || 'अनुशंसित कवकनाशी या कीटनाशक का छिड़काव करें।',
      prevention: scan.prevention || (scan.recommendations && scan.recommendations[1]) || 'खेत में स्वच्छता बनाए रखें और रोगी पत्तियों को अलग करें।',
      low_confidence: false
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const rawFile = e.target.files[0];
      if (rawFile.size > 20 * 1024 * 1024) {
        setError('फोटो का आकार 20 MB से कम होना चाहिए (Photo size must not exceed 20 MB).');
        return;
      }

      // Auto-compress high-res gallery / camera photos
      const comp = await compressImage(rawFile, { maxDimension: 1600, quality: 0.84 });
      const targetFile = comp.file;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(targetFile);
      setPreviewUrl(URL.createObjectURL(targetFile));
      setResult(null);
      setError(null);

      if (comp.wasCompressed) {
        setCompressionInfo({
          original: formatBytes(comp.originalSize),
          compressed: formatBytes(comp.compressedSize),
          savings: comp.savingsPercent,
        });
      } else {
        setCompressionInfo(null);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('कृपया पहले फसल की पत्ती की फोटो खींचें या चुनें (Please capture or select a leaf photo first).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.analyzeCropHealth(selectedFile, crop, growthStage);
      if (res.success) {
        const data = res.data;
        // Enrich with agronomic advice if not present
        if (!data.treatment) {
          if (data.label.toLowerCase().includes('healthy')) {
            data.treatment = 'फसल की पत्तियां पूरी तरह स्वस्थ और रोग-मुक्त हैं। संतुलित खाद और पानी बनाए रखें।';
            data.prevention = 'हर 5-7 दिन में खेत की सामान्य निगरानी करें।';
          } else {
            data.treatment = `${data.label} रोग के लक्षण पाए गए हैं। नजदीकी कृषि विज्ञान केंद्र (KVK) अनुसार उचित कीटनाशक/फफूंदनाशक का छिड़काव करें।`;
            data.prevention = 'खेत के चारों ओर खरपतवार साफ रखें और रोगी पत्तियों को नष्ट करें।';
          }
        }
        setResult(data);
        loadScanHistory();
      } else {
        setError(res.error?.message || 'रोग जांच में समस्या आई (Crop disease analysis failed).');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'AI सेवा से संपर्क नहीं हो पाया।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            AI पत्ती रोग जांच &bull; Instant Scanner
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">फसल रोग स्कैनर (Crop Disease Scanner)</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          खेत में सीधी पत्ती की फोटो खींचें। AI मॉडल (EfficientNet-B0) रोग पहचान कर तुरंत उपचार बताएगा।
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Image Upload & Parameters (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            {/* Hidden Inputs */}
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Live Camera & Gallery Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setIsCameraOpen(true)}
                className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Camera size={20} />
                <span>📸 लाइव कैमरा (Live Camera)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex flex-col items-center justify-center gap-1.5 border border-slate-200 transition-all cursor-pointer"
              >
                <UploadCloud size={20} className="text-emerald-700" />
                <span>📁 गैलरी से चुनें (Gallery)</span>
              </button>
            </div>

            {/* Image Preview Box */}
            <div 
              onClick={() => {
                if (!previewUrl) setIsCameraOpen(true);
              }}
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-all flex flex-col items-center justify-center min-h-[200px] ${
                previewUrl ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-400 bg-slate-50/50 cursor-pointer'
              }`}
            >
              {previewUrl ? (
                <div className="relative group w-full flex flex-col items-center">
                  <div className="relative inline-block max-h-52 max-w-full">
                    <img 
                      src={previewUrl} 
                      alt="Leaf Preview" 
                      className="max-h-52 max-w-full rounded-xl object-contain shadow-xs" 
                      decoding="async"
                    />
                    {loading && <LaserScanOverlay />}
                  </div>

                  {compressionInfo && (
                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200 shadow-xs animate-in fade-in">
                      <Zap size={12} className="text-emerald-600 fill-emerald-500" />
                      <span>स्मार्ट कंप्रेस: {compressionInfo.original} → {compressionInfo.compressed} ({compressionInfo.savings}% बचत, अल्ट्रा-फास्ट AI अपलोड)</span>
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCameraOpen(true);
                      }}
                      className="text-xs text-emerald-700 font-bold hover:bg-emerald-100 flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <Camera size={13} /> नया लाइव फोटो खींचें (Retake)
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="text-xs text-slate-600 font-bold hover:bg-slate-200 flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <UploadCloud size={13} /> गैलरी (Gallery)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Camera size={24} />
                  </div>
                  <p className="text-xs md:text-sm font-bold text-slate-700">पत्ती की साफ फोटो लें</p>
                  <p className="text-[11px] text-slate-400">कैमरा या गैलरी बटन दबाएं</p>
                </div>
              )}
            </div>

            {/* Parameter Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <CropSearchSelect
                  value={crop}
                  onChange={setCrop}
                  label="Crop Type / फसल का प्रकार"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Growth Stage</label>
                <select 
                  value={growthStage}
                  onChange={e => setGrowthStage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="vegetative">Vegetative</option>
                  <option value="flowering">Flowering</option>
                  <option value="fruiting">Fruiting / Grain Fill</option>
                  <option value="maturity">Maturity / Ripening</option>
                </select>
              </div>
            </div>

            {/* Analyze Button */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || (!selectedFile && !previewUrl)}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs md:text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Analyzing Image with EfficientNet...</span>
                </>
              ) : (
                <>
                  <ScanLine size={16} />
                  <span>Run AI Disease Diagnosis</span>
                </>
              )}
            </button>
          </div>

          {/* Field capture guidelines */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-1.5 text-emerald-950">
            <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">Field Photo Best Practices:</span>
            <ul className="list-disc list-inside space-y-1 text-emerald-800 text-[11px]">
              <li>Capture affected leaves in natural, diffuse sunlight (avoid heavy shadows).</li>
              <li>Focus closely on distinct lesion spots, fungal powdery patches, or pest marks.</li>
              <li>Include both upper and lower leaf surfaces when scouting for rust or mildew.</li>
            </ul>
          </div>
        </div>

        {/* Right Column: AI Diagnosis Results (6 cols) */}
        <div className="lg:col-span-6">
          {loading ? (
            <AIScanLoader 
              mode="crop" 
              title="पत्ती रोग AI जांच (Crop Health Analysis)"
              subtitle="PyTorch EfficientNet-B0 pathology analysis in progress..."
            />
          ) : result ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5 animate-in fade-in duration-300">
              {/* Diagnosis Badge */}
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Diagnosis Outcome</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-0.5">{result.label}</h3>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">Crop: {crop} &bull; Stage: {growthStage}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  result.severity === 'none' 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : result.severity === 'moderate' 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-red-100 text-red-800 border border-red-300'
                }`}>
                  {result.severity === 'none' ? 'Healthy' : `${result.severity} Severity`}
                </div>
              </div>

              {/* Confidence & Model Metrics */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">AI Confidence</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-lg font-bold text-emerald-700">{Math.round(result.confidence * 100)}%</span>
                    <span className="text-[10px] text-slate-500">High precision</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Model Engine</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {result.model_version && !result.model_version.toLowerCase().includes('mock') ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Live AI ({result.model_version})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Fallback ({result.model_version || 'mock-v1'})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Curative Treatment */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 mb-1.5 text-sm">
                  <Sparkles size={16} className="text-emerald-700" /> Curative Agronomic Prescription
                </h4>
                <p className="text-emerald-900 leading-relaxed">
                  {result.treatment}
                </p>
              </div>

              {/* Preventive Measures */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1.5 text-sm">
                  <CheckCircle2 size={16} className="text-slate-600" /> Long-Term Preventive Measures
                </h4>
                <p className="text-slate-600 leading-relaxed">
                  {result.prevention}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center min-h-[380px]">
              <ScanLine size={48} className="text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">No Image Analyzed Yet</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Upload a crop photo on the left and click &ldquo;Run AI Disease Diagnosis&rdquo; to view model classifications and chemical spray recommendations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Farmer Recent Scans History Section */}
      <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <History size={16} />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                हालिया पत्ती स्कैन इतिहास (Your Disease Scan History)
              </h2>
              <p className="text-[11px] text-slate-500">
                आपके द्वारा पूर्व में खींची गई पत्तियों की फोटो व AI निदान परिणाम
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            कुल स्कैन: {recentScans.length}
          </span>
        </div>

        {loadingHistory ? (
          <div className="py-8 text-center text-xs text-slate-400">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-600" />
            स्कैन इतिहास लोड हो रहा है...
          </div>
        ) : recentScans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            <Camera size={24} className="mx-auto mb-1.5 text-slate-300" />
            अभी तक कोई पिछला पत्ती स्कैन सहेजा नहीं गया है। ऊपर से लाइव फोटो खींचकर AI जांच करें।
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {recentScans.map((scan) => {
              const isSevere = scan.severity?.toLowerCase() === 'severe' || scan.severity?.toLowerCase() === 'high';
              const isModerate = scan.severity?.toLowerCase() === 'moderate';
              const imgSource = scan.image_data_uri || scan.image_url;

              return (
                <div 
                  key={scan.id} 
                  onClick={() => handleSelectPastScan(scan)}
                  className="group p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer bg-slate-50/50 hover:bg-white flex flex-col justify-between"
                >
                  <div>
                    {/* Thumbnail */}
                    <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 mb-2.5">
                      {imgSource ? (
                        <img 
                          src={api.resolveMediaUrl(imgSource)} 
                          alt="Leaf Evidence" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 text-[10px]">
                          <Camera size={22} className="mb-1" />
                          <span>No Image Preview</span>
                        </div>
                      )}
                      <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shadow-xs ${
                        isSevere 
                          ? 'bg-red-500 text-white' 
                          : isModerate 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {scan.severity || 'Normal'}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-emerald-800">{scan.crop || 'Foliage'}</span>
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Clock size={11} /> {scan.created_at ? scan.created_at.split('T')[0] : 'Today'}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                      {scan.label || scan.disease}
                    </h4>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
                      <span>विश्वास: <strong className="text-slate-800">{Math.round((scan.confidence || 0.9) * 100)}%</strong></span>
                      {scan.model_version && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${scan.model_version.includes('mock') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {scan.model_version.includes('mock') ? 'Fallback' : 'Live AI'}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      देखें <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleLiveCapture}
        onFallbackToFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
