import { useState, useEffect, useRef, useMemo, type ChangeEvent } from 'react';
import { 
  FlaskConical, 
  UploadCloud, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw,
  CheckCircle2,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { api } from '../api';
import type { SoilAnalysisResult, Farm } from '../api';
import { CROPS_CATALOG, fetchCropsCatalog, getBilingualCropName, type CropInfo } from '../data/agriCatalog';

// Agronomic crop definitions and specific nutrient demands
interface CropProfile {
  name: string;
  hindiName: string;
  nReq: 'low' | 'medium' | 'high';
  pReq: 'low' | 'medium' | 'high';
  kReq: 'low' | 'medium' | 'high';
  notes: string;
}

const CROP_PROFILES: Record<string, CropProfile> = {
  wheat: {
    name: 'Wheat',
    hindiName: 'गेहूं',
    nReq: 'high',
    pReq: 'medium',
    kReq: 'medium',
    notes: 'गेंहू को फुटाव और दाना भराव के लिए 3 बार यूरिया की जरूरत होती है।'
  },
  soybean: {
    name: 'Soybean',
    hindiName: 'सोयाबीन',
    nReq: 'low',
    pReq: 'high',
    kReq: 'medium',
    notes: 'दलहनी फसल: जड़ें हवा से नाइट्रोजन बनाती हैं। अधिक यूरिया डालने से फलियां कम बैठेंगी।'
  },
  paddy: {
    name: 'Paddy / Rice',
    hindiName: 'धान / चावल',
    nReq: 'high',
    pReq: 'medium',
    kReq: 'high',
    notes: 'धान में जिंक और पोटाश की कमी से खैरा रोग और दाना काला पड़ने का खतरा रहता है।'
  },
  cotton: {
    name: 'Cotton',
    hindiName: 'कपास',
    nReq: 'high',
    pReq: 'medium',
    kReq: 'high',
    notes: 'टिंडे के वजन और रुई की गुणवत्ता के लिए पोटाश और सूक्ष्म पोषक तत्व जरूरी हैं।'
  },
  maize: {
    name: 'Maize',
    hindiName: 'मक्का',
    nReq: 'high',
    pReq: 'high',
    kReq: 'medium',
    notes: 'मक्का तेजी से बढ़ने वाली फसल है, घुटने की ऊंचाई और भुट्टा आने पर नाइट्रोजन जरूरी है।'
  },
  gram: {
    name: 'Gram / Chickpea',
    hindiName: 'चना',
    nReq: 'low',
    pReq: 'high',
    kReq: 'low',
    notes: 'दलहनी फसल: केवल बुवाई के समय शुरुआती स्टार्टर खुराक दें। फास्फोरस जड़ों को मजबूत करेगा।'
  },
  chana: {
    name: 'Gram / Chickpea',
    hindiName: 'चना',
    nReq: 'low',
    pReq: 'high',
    kReq: 'low',
    notes: 'दलहनी फसल: केवल बुवाई के समय शुरुआती स्टार्टर खुराक दें। फास्फोरस जड़ों को मजबूत करेगा।'
  },
  mustard: {
    name: 'Mustard',
    hindiName: 'सरसों / राई',
    nReq: 'medium',
    pReq: 'high',
    kReq: 'medium',
    notes: 'सरसों में तेल की मात्रा और दानों की चमक हेतु गंधक (Sulphur) और फास्फोरस अनिवार्य हैं।'
  },
  groundnut: {
    name: 'Groundnut',
    hindiName: 'मूंगफली',
    nReq: 'low',
    pReq: 'high',
    kReq: 'medium',
    notes: 'मूंगफली में दाना भरने व छिलके की मजबूती हेतु जिप्सम (कैल्शियम व सल्फर) 45 दिन पर दें।'
  },
  sugarcane: {
    name: 'Sugarcane',
    hindiName: 'गन्ना',
    nReq: 'high',
    pReq: 'high',
    kReq: 'high',
    notes: 'गन्ना दीर्घकालिक भारी खुराक वाली फसल है, पोटाश तने की मोटाई और सुक्रोज मिठास बढ़ाता है।'
  },
  potato: {
    name: 'Potato',
    hindiName: 'आलू',
    nReq: 'high',
    pReq: 'high',
    kReq: 'high',
    notes: 'कंदों के आकार और भंडारण क्षमता के लिए सल्फेट ऑफ पोटाश (SOP) अत्यंत गुणकारी है।'
  },
  onion: {
    name: 'Onion',
    hindiName: 'प्याज',
    nReq: 'medium',
    pReq: 'high',
    kReq: 'high',
    notes: 'प्याज में गंध और छिलके की परत मजबूत रखने के लिए सल्फर युक्त उर्वरक डालें।'
  },
  garlic: {
    name: 'Garlic',
    hindiName: 'लहसुन',
    nReq: 'medium',
    pReq: 'high',
    kReq: 'high',
    notes: 'लहसुन की कलियों के ठोस विकास और वजन के लिए पोटाश और जिंक का छिड़काव करें।'
  },
  tur: {
    name: 'Tur / Arhar',
    hindiName: 'अरहर / तुअर',
    nReq: 'low',
    pReq: 'high',
    kReq: 'low',
    notes: 'गहरी जड़ों वाली दलहन: शुरुआती फास्फोरस और फूल आने पर बोरॉन का छिड़काव लाभकारी है।'
  },
  bajra: {
    name: 'Bajra',
    hindiName: 'बाजरा',
    nReq: 'medium',
    pReq: 'medium',
    kReq: 'low',
    notes: 'सूखा सहनशील मोटा अनाज: फुटाव के समय मध्यम नाइट्रोजन खुराक से भरपूर सिट्टे बनते हैं।'
  }
};

export const getProfileForCrop = (cropKey: string): CropProfile => {
  if (!cropKey) return CROP_PROFILES.wheat;
  const clean = cropKey.toLowerCase().trim();
  if (CROP_PROFILES[clean]) return CROP_PROFILES[clean];
  for (const [k, prof] of Object.entries(CROP_PROFILES)) {
    if (clean.includes(k) || k.includes(clean)) return prof;
  }
  const bilingual = getBilingualCropName(cropKey);
  return {
    name: bilingual.english,
    hindiName: bilingual.hindi,
    nReq: 'medium',
    pReq: 'medium',
    kReq: 'medium',
    notes: 'संतुलित पोषण (NPK) एवं सूक्ष्म पोषक तत्वों (जिंक, फेरस) का अनुशंसित प्रयोग करें।'
  };
};

export default function SoilAnalysis() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string>('wheat');
  const [farmAcresInput, setFarmAcresInput] = useState<string>('2.5');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SoilAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [cropsList, setCropsList] = useState<CropInfo[]>(CROPS_CATALOG);
  
  // Registered Farms & Saved Reports from Database
  const [farms, setFarms] = useState<Farm[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string>('general');
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);

  // Interactive manual adjustments for N, P, K, pH
  const [customN, setCustomN] = useState<number | null>(null);
  const [customP, setCustomP] = useState<number | null>(null);
  const [customK, setCustomK] = useState<number | null>(null);
  const [customPH, setCustomPH] = useState<number | null>(null);
  const [isEditingValues, setIsEditingValues] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCropsCatalog().then(data => {
      if (data && data.length > 0) setCropsList(data);
    });
    loadFarmsAndReports();
  }, []);

  const loadFarmsAndReports = async () => {
    try {
      const farmsRes = await api.getFarms();
      if (farmsRes.success && farmsRes.data && farmsRes.data.length > 0) {
        setFarms(farmsRes.data);
        setSelectedFarmId(farmsRes.data[0].id);
        const rawCrop = farmsRes.data[0].crop || '';
        const bilingual = getBilingualCropName(rawCrop);
        const matched = CROPS_CATALOG.find(c => c.name.toLowerCase() === bilingual.english.toLowerCase() || c.id === rawCrop.toLowerCase());
        if (matched) {
          setSelectedCrop(matched.id);
        }
        if (farmsRes.data[0].area_m2) {
          setFarmAcresInput(((farmsRes.data[0].area_m2 / 10000) * 2.47105).toFixed(1));
        }
      }
    } catch (e) {
      console.warn("Could not load registered farms", e);
    }

    setLoadingReports(true);
    try {
      const repRes = await api.getMySoilReports();
      if (repRes.success && repRes.data) {
        setSavedReports(repRes.data);
      }
    } catch (e) {
      console.warn("Could not load saved soil reports", e);
    } finally {
      setLoadingReports(false);
    }
  };

  const farmAcres = useMemo(() => {
    const parsed = parseFloat(farmAcresInput);
    return isNaN(parsed) || parsed <= 0 ? 1 : parsed;
  }, [farmAcresInput]);

  // Current active nutrient values (either user-adjusted or OCR extracted)
  const activeN = customN !== null ? customN : (result?.N ?? 45);
  const activeP = customP !== null ? customP : (result?.P ?? 22);
  const activeK = customK !== null ? customK : (result?.K ?? 180);
  const activePH = customPH !== null ? customPH : (result?.pH ?? 6.8);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewName(file.name);
      setResult(null);
      setError(null);
      setCustomN(null);
      setCustomP(null);
      setCustomK(null);
      setCustomPH(null);
      setIsEditingValues(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setError('कृपया पहले मृदा स्वास्थ्य कार्ड (फोटो या PDF) चुनें। Please select a Soil Health Card.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.analyzeSoilHealth(selectedFile, selectedFarmId);
      if (res.success && res.data) {
        setResult(res.data);
        setCustomN(res.data.N);
        setCustomP(res.data.P);
        setCustomK(res.data.K);
        setCustomPH(res.data.pH);

        const cardAcres = res.data.metadata?.area_acres;
        if (cardAcres && cardAcres > 0) {
          setFarmAcresInput(cardAcres.toString());
        }

        // Refresh saved soil reports from database
        try {
          const repRes = await api.getMySoilReports();
          if (repRes.success && repRes.data) {
            setSavedReports(repRes.data);
          }
        } catch (e) {
          console.warn("Error refreshing saved soil reports", e);
        }
      } else {
        setError(res.error?.message || 'मृदा कार्ड स्कैन करने में समस्या आई।');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Error processing Soil Card.');
    } finally {
      setLoading(false);
    }
  };

  // Dynamic calculation of tailored fertilizer requirements
  const { deficiencies, recommendations } = useMemo(() => {
    if (!result) return { deficiencies: [], recommendations: [] };

    const defs: string[] = [];
    const recs: any[] = [];
    const cropProfile = getProfileForCrop(selectedCrop);

    // Determine scale for Nitrogen (0-100 index vs 0-600 raw kg/ha ICAR)
    const isHighScaleN = activeN > 100;
    const isLowN = isHighScaleN ? activeN < 280 : activeN < 40;
    const isMedN = isHighScaleN ? (activeN >= 280 && activeN <= 560) : (activeN >= 40 && activeN <= 60);

    // 1. Nitrogen (N) calculation
    if (cropProfile.nReq === 'low') {
      // Legume crop (Soybean / Chickpea)
      if (isLowN) {
        defs.push('नाइट्रोजन: हल्की कमी (Low N - Legume)');
        recs.push({
          fertilizer: 'यूरिया / Urea (46% N) [स्टार्टर खुराक]',
          bags_per_acre: 0.35,
          dosage_kg_per_acre: 15,
          bag_size_kg: 45,
          schedule: 'बुवाई के समय केवल स्टार्टर खुराक के रूप में दें (Starter dose at sowing)',
          reason: `${cropProfile.hindiName} दलहनी फसल है जो जड़ों में गांठों द्वारा खुद नाइट्रोजन बनाती है। अधिक यूरिया की आवश्यकता नहीं है।`
        });
      } else {
        defs.push('नाइट्रोजन: पर्याप्त (Nitrogen Adequate for Legume)');
      }
    } else {
      // Cereal / Cash crop (Wheat, Paddy, Maize, Cotton)
      if (isLowN) {
        defs.push('नाइट्रोजन: भारी कमी (Severe Low Nitrogen)');
        recs.push({
          fertilizer: 'यूरिया / Urea (46% N)',
          bags_per_acre: 1.5,
          dosage_kg_per_acre: 67.5,
          bag_size_kg: 45,
          schedule: '3 बराबर भागों में बांटकर दें: 1/3 बुवाई पर, 1/3 पहली सिंचाई (21 दिन) पर, 1/3 कल्ले फूटते समय।',
          reason: 'मिट्टी में नाइट्रोजन बहुत कम है। पौधे में पीलापन रोकने और कल्ले (tillers) बढ़ाने के लिए आवश्यक।'
        });
      } else if (isMedN) {
        defs.push('नाइट्रोजन: मध्यम स्तर (Moderate Nitrogen)');
        recs.push({
          fertilizer: 'यूरिया / Urea (46% N)',
          bags_per_acre: 1.0,
          dosage_kg_per_acre: 45,
          bag_size_kg: 45,
          schedule: 'आधा बुवाई पर और आधा पहली सिंचाई (25-30 दिन) पर दें।',
          reason: 'सामान्य फसल बढ़वार और प्रोटीन निर्माण के लिए संतुलित खुराक।'
        });
      } else {
        defs.push('नाइट्रोजन: उत्तम (Good Nitrogen Level)');
        recs.push({
          fertilizer: 'यूरिया / Urea (46% N) [हल्की खुराक]',
          bags_per_acre: 0.5,
          dosage_kg_per_acre: 22.5,
          bag_size_kg: 45,
          schedule: 'केवल पहली सिंचाई पर जरूरत अनुसार छिड़कें।',
          reason: 'मिट्टी में पहले से अच्छा नाइट्रोजन उपलब्ध है। अधिक यूरिया से फसल गिर सकती है।'
        });
      }
    }

    // 2. Phosphorus (P) calculation
    const isHighScaleP = activeP > 40;
    const isLowP = isHighScaleP ? activeP < 23 : activeP < 15;
    const isMedP = isHighScaleP ? (activeP >= 23 && activeP <= 56) : (activeP >= 15 && activeP <= 25);

    if (isLowP) {
      defs.push('फास्फोरस: कमी (Low Phosphorus)');
      recs.push({
        fertilizer: 'डीएपी / DAP (18:46:0)',
        bags_per_acre: 1.0,
        dosage_kg_per_acre: 50,
        bag_size_kg: 50,
        schedule: 'बुवाई के समय बीज के पास 4-5 सेमी गहराई पर डालें (Basal at sowing)',
        reason: 'जड़ों के गहरे फैलाव और शुरुआती तने की मजबूती के लिए अति आवश्यक।'
      });
    } else if (isMedP) {
      defs.push('फास्फोरस: मध्यम (Moderate Phosphorus)');
      recs.push({
        fertilizer: 'डीएपी / DAP (18:46:0) अथवा सिंगल सुपर फास्फेट (SSP)',
        bags_per_acre: 0.75,
        dosage_kg_per_acre: 37.5,
        bag_size_kg: 50,
        schedule: 'बुवाई के समय खेत की अंतिम तैयारी में बीज के साथ डालें।',
        reason: 'पौधों में दाना बनने की प्रक्रिया और रोग प्रतिरोधक क्षमता बढ़ाता है।'
      });
    } else {
      defs.push('फास्फोरस: पर्याप्त (Phosphorus Sufficient)');
      if (cropProfile.pReq === 'high') {
        recs.push({
          fertilizer: 'सिंगल सुपर फास्फेट / SSP (16% P2O5 + 11% S)',
          bags_per_acre: 0.5,
          dosage_kg_per_acre: 25,
          bag_size_kg: 50,
          schedule: 'बुवाई के समय (Basal placement)',
          reason: `${cropProfile.hindiName} के लिए गंधक (Sulphur) और फास्फोरस का पोषण बनाए रखने हेतु।`
        });
      }
    }

    // 3. Potassium (K) calculation
    const isHighScaleK = activeK > 250;
    const isLowK = isHighScaleK ? activeK < 140 : activeK < 120;
    const isMedK = isHighScaleK ? (activeK >= 140 && activeK <= 280) : (activeK >= 120 && activeK <= 180);

    if (isLowK) {
      defs.push('पोटाश: कमी (Low Potassium)');
      recs.push({
        fertilizer: 'म्यूरेट ऑफ पोटाश / MOP (60% K2O)',
        bags_per_acre: 0.6,
        dosage_kg_per_acre: 30,
        bag_size_kg: 50,
        schedule: 'बुवाई के समय खेत में अच्छी तरह मिलाएं (Apply during basal preparation)',
        reason: 'सूखा सहनशीलता, दानों का वजन, चमक और कीटों से सुरक्षा के लिए अनिवार्य।'
      });
    } else if (isMedK) {
      defs.push('पोटाश: मध्यम स्तर (Moderate Potassium)');
      if (cropProfile.kReq === 'high') {
        recs.push({
          fertilizer: 'म्यूरेट ऑफ पोटाश / MOP (60% K2O)',
          bags_per_acre: 0.3,
          dosage_kg_per_acre: 15,
          bag_size_kg: 50,
          schedule: 'बुवाई के समय मिट्टी में मिलाएं।',
          reason: `${cropProfile.hindiName} में उत्तम उपज और दानों/रुई की चमक बनाए रखने के लिए।`
        });
      }
    } else {
      defs.push('पोटाश: प्रचुर मात्रा (High Potassium Available)');
    }

    // 4. Soil pH Amendments
    if (activePH < 6.0) {
      defs.push(`अम्लीय मिट्टी / Acidic Soil (pH ${activePH})`);
      recs.push({
        fertilizer: 'कृषि चूना / Agricultural Lime (CaCO3)',
        bags_per_acre: 2.0,
        dosage_kg_per_acre: 100,
        bag_size_kg: 50,
        schedule: 'बुवाई से 15-20 दिन पूर्व खेत की जुताई में अच्छी तरह मिलाएं',
        reason: 'मिट्टी की अम्लता कम करके पौधों के लिए फास्फोरस व सूक्ष्म पोषक तत्वों की उपलब्धता बढ़ाता है।'
      });
    } else if (activePH > 7.8) {
      defs.push(`क्षारीय मिट्टी / Alkaline Soil (pH ${activePH})`);
      recs.push({
        fertilizer: 'कृषि जिप्सम / Agricultural Gypsum (CaSO4.2H2O)',
        bags_per_acre: 2.0,
        dosage_kg_per_acre: 100,
        bag_size_kg: 50,
        schedule: 'खेत की अंतिम जुताई के समय पानी लगाने से पूर्व फैलाएं',
        reason: 'मिट्टी का खारापन कम करता है, जल निकासी और भुरभुरापन सुधारता है।'
      });
    }

    // 5. Secondary / Micronutrients from metadata if detected
    if (result.metadata?.zinc && result.metadata.zinc < 0.6) {
      defs.push(`जिंक की कमी / Zinc Deficient (${result.metadata.zinc} mg/kg)`);
      recs.push({
        fertilizer: 'जिंक सल्फेट / Zinc Sulphate (33% Zn)',
        bags_per_acre: 0.1,
        dosage_kg_per_acre: 5,
        bag_size_kg: 50,
        schedule: 'बुवाई के 15-20 दिन बाद मिट्टी में दें (डीएपी के साथ मिलाकर न डालें)',
        reason: 'जिंक की कमी से फसल की पत्तियां छोटी रह जाती हैं और पीली पड़ती हैं।'
      });
    }

    if (result.metadata?.sulphur && result.metadata.sulphur < 10.0) {
      defs.push(`सल्फर की कमी / Sulphur Deficient (${result.metadata.sulphur} mg/kg)`);
      recs.push({
        fertilizer: 'सल्फर बेंटोनाइट / Sulphur 90% Granules',
        bags_per_acre: 0.2,
        dosage_kg_per_acre: 10,
        bag_size_kg: 50,
        schedule: 'बुवाई के समय खेत की तैयारी में मिलाएं',
        reason: 'तिलहनी व दलहनी फसलों में तेल प्रतिशत और दानों की चमक बढ़ाता है।'
      });
    }

    // If completely balanced
    if (recs.length === 0) {
      defs.push('संतुलित उपजाऊ मिट्टी (Optimal Balanced Profile)');
      recs.push({
        fertilizer: 'संतुलित एनपीके / NPK (12:32:16) अथवा कम्पोस्ट खाद',
        bags_per_acre: 0.5,
        dosage_kg_per_acre: 25,
        bag_size_kg: 50,
        schedule: 'बुवाई के समय (Basal application)',
        reason: 'मिट्टी की उर्वरता और सूक्ष्म जीवाणुओं को बनाए रखने के लिए संतुलित खुराक।'
      });
    }

    return { deficiencies: defs, recommendations: recs };
  }, [result, selectedCrop, activeN, activeP, activeK, activePH]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header Banner */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            PMFBY Multi-Format Soil OCR
          </span>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            Govt DAC&FW • KVK • Lab Reports
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">
          Soil Health Card OCR & Fertilizer Calculator
        </h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">
          किसी भी सरकारी या निजी सॉइल हेल्थ कार्ड (PDF या मोबाइल फोटो) से पोषक तत्व निकालें और किसी भी रकबे (Acres) के लिए खाद की सही बोरियों की गणना तुरंत करें।
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column: Upload & Farm Area Configuration (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
            {/* 0. Farm Parcel Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                खेत का चयन करें / Select Farm Parcel
              </label>
              <select
                value={selectedFarmId}
                onChange={(e) => {
                  const fId = e.target.value;
                  setSelectedFarmId(fId);
                  const matched = farms.find(f => f.id === fId);
                  if (matched) {
                    if (matched.crop) {
                      const bilingual = getBilingualCropName(matched.crop);
                      const cMatch = cropsList.find(c => c.name.toLowerCase() === bilingual.english.toLowerCase() || c.id === matched.crop?.toLowerCase());
                      if (cMatch) {
                        setSelectedCrop(cMatch.id);
                      } else {
                        setSelectedCrop(matched.crop.toLowerCase());
                      }
                    }
                    if (matched.area_m2) {
                      setFarmAcresInput(((matched.area_m2 / 10000) * 2.47105).toFixed(1));
                    }
                  }
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all cursor-pointer"
              >
                {farms.length === 0 ? (
                  <option value="general">🌾 सामान्य खेत (Default Plot)</option>
                ) : (
                  farms.map((f) => (
                    <option key={f.id} value={f.id}>
                      🌾 {f.name} ({f.crop || 'Crop'} - {((f.area_m2 / 10000) * 2.47105).toFixed(1)} एकड़)
                    </option>
                  ))
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                यह सॉइल रिपोर्ट सीधे इस खेत से जुड़ जाएगी और डेटाबेस में सुरक्षित रहेगी।
              </p>
            </div>

            {/* 1. Target Crop Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                1. फसल चुनें / Select Target Crop
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all cursor-pointer"
              >
                {cropsList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon || '🌾'} {c.name} ({c.hindi})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                💡 {getProfileForCrop(selectedCrop)?.notes}
              </p>
            </div>

            {/* 2. Farm Area Manual Input */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  2. खेत का रकबा / Enter Farm Area
                </label>
                <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  मैनुअल इनपुट (Any Acres)
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  max="10000"
                  value={farmAcresInput}
                  onChange={(e) => setFarmAcresInput(e.target.value)}
                  placeholder="रकबा दर्ज करें (उदा. 2.4, 5.0, 10.5)"
                  className="w-full bg-white border border-emerald-300 rounded-xl px-3.5 py-2.5 text-sm md:text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition-all pr-24 shadow-2xs"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-2 py-1 rounded-lg pointer-events-none">
                  एकड़ (Acres)
                </div>
              </div>

              {/* Live Area Conversions */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 pt-1">
                <span>
                  हेक्टेयर: <strong className="text-emerald-800 font-bold">{(farmAcres * 0.4047).toFixed(2)} Ha</strong>
                </span>
                <span>
                  बीघा: <strong className="text-emerald-800 font-bold">{(farmAcres * 1.61).toFixed(1)} बीघा</strong>
                </span>
                <span>
                  गुंठा: <strong className="text-emerald-800 font-bold">{(farmAcres * 40).toFixed(0)} Guntha</strong>
                </span>
              </div>

              {result?.metadata?.area_acres && result.metadata.area_acres !== farmAcres && (
                <div className="flex items-center justify-between bg-white border border-emerald-200 rounded-lg p-2 mt-1">
                  <span className="text-[11px] text-slate-600">
                    📄 कार्ड में रकबा: <strong>{result.metadata.area_acres} एकड़</strong> ({result.metadata.area_ha} ha)
                  </span>
                  <button
                    type="button"
                    onClick={() => setFarmAcresInput(result.metadata!.area_acres!.toString())}
                    className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded transition-colors cursor-pointer"
                  >
                    यह रकबा चुनें
                  </button>
                </div>
              )}
            </div>

            {/* 3. File Upload Area */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. सॉइल कार्ड अपलोड करें / Upload Report
                </label>
                <span className="text-[10px] text-slate-400 font-medium">
                  PDF / JPG / PNG / WEBP
                </span>
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[150px] ${
                  previewName ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="application/pdf,image/*" 
                  className="hidden" 
                />

                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2 shadow-2xs border border-emerald-100">
                  <UploadCloud size={24} />
                </div>
                <p className="text-xs md:text-sm font-bold text-slate-800">
                  {previewName || '📄 मृदा कार्ड चुनें (Upload Soil Card)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  सरकारी कार्ड, KVK रिपोर्ट, या मोबाइल से खींची गई फोटो
                </p>
                {previewName && (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-2">
                    तैयार (Ready to Extract)
                  </span>
                )}
              </div>
            </div>

            {/* Calculate Button */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || (!selectedFile && !previewName)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-xl text-xs md:text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>मृदा कार्ड स्कैन हो रहा है (Extracting Real Data)...</span>
                </>
              ) : (
                <>
                  <FlaskConical size={16} />
                  <span>सटीक खाद की बोरियां निकालें / Calculate Fertilizer</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Farmer Guidelines */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-xs space-y-1.5 text-emerald-950">
            <span className="font-bold text-emerald-900 text-[11px] uppercase tracking-wider block">
              💡 किसान भाइयों के लिए जरूरी सलाह (Key Guidelines):
            </span>
            <ul className="list-disc list-inside space-y-1 text-emerald-900/90 text-[11px]">
              <li>यूरिया की 1 बोरी = 45 किलो (नीम लेपित यूरिया)।</li>
              <li>डीएपी और म्यूरेट ऑफ पोटाश (MOP) की 1 बोरी = 50 किलो।</li>
              <li>खाद को एक साथ न डालकर अनुशंसित चरणों (Splits) में ही डालें।</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Extracted Nutrients & Tailored Fertilizer Results (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6 animate-in fade-in duration-300">
              {/* Header with Card Metadata */}
              <div className="border-b border-slate-100 pb-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      प्रमाणित सॉइल OCR विश्लेषण
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {result.model_version || 'OCR-Engine'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingValues(!isEditingValues)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                      title="मान समायोजित करें / Edit values"
                    >
                      <Sliders size={12} />
                      {isEditingValues ? 'संपादन बंद करें' : 'मान संशोधित करें (Tweak)'}
                    </button>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      सटीकता: {Math.round(result.confidence * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {farmAcres} एकड़ {getProfileForCrop(selectedCrop)?.hindiName} के लिए खाद की मात्रा
                  </h3>
                </div>

                {/* Farmer / Card Metadata Badge if extracted */}
                {(result.metadata?.farmer_name || result.metadata?.card_id) && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mt-2">
                    {result.metadata.farmer_name && (
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <User size={13} className="text-emerald-600" />
                        {result.metadata.farmer_name}
                      </span>
                    )}
                    {result.metadata.card_id && (
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <FileText size={13} className="text-slate-400" />
                        ID: {result.metadata.card_id}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* 4 Primary Nutrient Gauges with Interactive Verification */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    कार्ड से प्राप्त पोषक तत्व स्तर (Extracted Soil Test Values):
                  </span>
                  {isEditingValues && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      ✏️ आप मान बदलकर तुरंत नई बोरी देख सकते हैं
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Nitrogen */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center relative">
                    <span className="text-[10px] uppercase font-bold text-slate-500">नाइट्रोजन (N)</span>
                    {isEditingValues ? (
                      <input
                        type="number"
                        step="0.5"
                        value={activeN}
                        onChange={(e) => setCustomN(parseFloat(e.target.value) || 0)}
                        className="text-xl font-black text-center text-slate-900 my-1 w-full bg-white border border-emerald-400 rounded-lg p-1 focus:outline-hidden"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 my-1">
                        {activeN} <span className="text-[10px] font-normal text-slate-400">kg/ha</span>
                      </p>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (activeN > 100 ? activeN < 280 : activeN < 40)
                        ? 'bg-red-100 text-red-700' 
                        : (activeN > 100 ? activeN <= 560 : activeN <= 60)
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {(activeN > 100 ? activeN < 280 : activeN < 40) 
                        ? 'कमी (Low)' 
                        : (activeN > 100 ? activeN <= 560 : activeN <= 60)
                        ? 'मध्यम (Moderate)' 
                        : 'पर्याप्त (Good)'}
                    </span>
                  </div>

                  {/* Phosphorus */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center relative">
                    <span className="text-[10px] uppercase font-bold text-slate-500">फास्फोरस (P)</span>
                    {isEditingValues ? (
                      <input
                        type="number"
                        step="0.5"
                        value={activeP}
                        onChange={(e) => setCustomP(parseFloat(e.target.value) || 0)}
                        className="text-xl font-black text-center text-slate-900 my-1 w-full bg-white border border-emerald-400 rounded-lg p-1 focus:outline-hidden"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 my-1">
                        {activeP} <span className="text-[10px] font-normal text-slate-400">kg/ha</span>
                      </p>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeP < 15 ? 'bg-red-100 text-red-700' : activeP < 25 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {activeP < 15 ? 'कमी (Low)' : activeP < 25 ? 'मध्यम (Moderate)' : 'पर्याप्त (Good)'}
                    </span>
                  </div>

                  {/* Potassium */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center relative">
                    <span className="text-[10px] uppercase font-bold text-slate-500">पोटाश (K)</span>
                    {isEditingValues ? (
                      <input
                        type="number"
                        step="1"
                        value={activeK}
                        onChange={(e) => setCustomK(parseFloat(e.target.value) || 0)}
                        className="text-xl font-black text-center text-slate-900 my-1 w-full bg-white border border-emerald-400 rounded-lg p-1 focus:outline-hidden"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 my-1">
                        {activeK} <span className="text-[10px] font-normal text-slate-400">kg/ha</span>
                      </p>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeK < 140 ? 'bg-red-100 text-red-700' : activeK < 200 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {activeK < 140 ? 'कमी (Low)' : activeK < 200 ? 'मध्यम (Medium)' : 'प्रचुर (High)'}
                    </span>
                  </div>

                  {/* pH */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center relative">
                    <span className="text-[10px] uppercase font-bold text-slate-500">pH स्तर (Soil pH)</span>
                    {isEditingValues ? (
                      <input
                        type="number"
                        step="0.1"
                        value={activePH}
                        onChange={(e) => setCustomPH(parseFloat(e.target.value) || 7.0)}
                        className="text-xl font-black text-center text-slate-900 my-1 w-full bg-white border border-emerald-400 rounded-lg p-1 focus:outline-hidden"
                      />
                    ) : (
                      <p className="text-2xl font-black text-slate-900 my-1">{activePH}</p>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activePH < 6.0 ? 'bg-amber-100 text-amber-700' : activePH > 7.8 ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {activePH < 6.0 ? 'अम्लीय (Acidic)' : activePH > 7.8 ? 'क्षारीय (Alkaline)' : 'संतुलित (Neutral)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secondary Nutrients Strip if detected */}
              {(result.metadata?.organic_carbon || result.metadata?.zinc || result.metadata?.sulphur) && (
                <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block w-full">
                    सूक्ष्म पोषक तत्व (Micronutrients):
                  </span>
                  {result.metadata.organic_carbon !== undefined && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      जैविक कार्बन (OC): <strong>{result.metadata.organic_carbon}%</strong>
                    </span>
                  )}
                  {result.metadata.zinc !== undefined && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      जिंक (Zn): <strong>{result.metadata.zinc} mg/kg</strong>
                    </span>
                  )}
                  {result.metadata.sulphur !== undefined && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      सल्फर (S): <strong>{result.metadata.sulphur} mg/kg</strong>
                    </span>
                  )}
                  {result.metadata.electrical_conductivity !== undefined && (
                    <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                      चालकता (EC): <strong>{result.metadata.electrical_conductivity} dS/m</strong>
                    </span>
                  )}
                </div>
              )}

              {/* Deficiencies & Agronomic Status */}
              {deficiencies.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    पोषक तत्व स्थिति (Soil Health Diagnostics):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {deficiencies.map((d, i) => (
                      <span 
                        key={i} 
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          d.includes('कमी') || d.includes('अम्लीय') || d.includes('क्षारीय')
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tailored Fertilizer Recommendations in Exact Bags */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-emerald-600" /> 
                    खाद की संस्तुति ({farmAcres} एकड़ हेतु कुल बोरियां)
                  </h4>
                  <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    कुल रकबा: {farmAcres} एकड़
                  </span>
                </div>

                {recommendations.map((rec: any, idx: number) => {
                  const totalBags = ((rec.bags_per_acre || 1) * farmAcres);
                  const displayBags = totalBags % 1 === 0 ? totalBags : totalBags.toFixed(1);
                  const totalKg = ((rec.dosage_kg_per_acre || 50) * farmAcres);
                  const displayKg = totalKg % 1 === 0 ? totalKg : totalKg.toFixed(1);

                  return (
                    <div key={idx} className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-2.5 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-black text-slate-900 text-sm md:text-base block">
                            {rec.fertilizer}
                          </span>
                          <span className="text-emerald-800 font-bold text-xs">
                            दर: {rec.bags_per_acre} बोरी प्रति एकड़ ({rec.dosage_kg_per_acre} kg/एकड़)
                          </span>
                        </div>
                        <div className="bg-emerald-700 text-white font-black text-sm md:text-base px-4 py-2 rounded-xl shadow-xs text-center">
                          कुल: {displayBags} बोरी ({displayKg} किग्रा)
                        </div>
                      </div>

                      {rec.schedule && (
                        <div className="bg-white/90 border border-emerald-100 rounded-lg p-2.5 text-emerald-950 font-medium">
                          <strong>कब और कैसे डालें:</strong> {rec.schedule}
                        </div>
                      )}

                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        {rec.reason}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Extracted OCR Text Inspection */}
              {result.extracted_text && (
                <div className="border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowRawText(!showRawText)}
                    className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-600 hover:text-slate-900 py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <FileText size={14} />
                      दस्तावेज़ से निकाला गया मूल टेक्स्ट (Extracted OCR Text)
                    </span>
                    {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showRawText && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                      {result.extracted_text}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 flex flex-col items-center justify-center min-h-[380px]">
              <FlaskConical size={48} className="text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">मृदा कार्ड अपलोड नहीं हुआ है</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                बाईं ओर से अपना सॉइल हेल्थ कार्ड (PDF या फोटो) अपलोड करें। हमारा OCR मॉडल सरकारी पोर्टल (DAC&FW), KVK अथवा किसी भी टेस्टिंग लैब के कार्ड से N, P, K व pH मान स्वतः पढ़कर आपके खेत के रकबे के लिए खाद की बोरियों की सटीक गणना करेगा।
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* SAVED SOIL HEALTH CARDS & HISTORY (सहेजी गई मृदा रिपोर्ट डेटाबेस)         */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FlaskConical size={18} className="text-emerald-600" />
              सहेजी गई मृदा रिपोर्टें (Saved Soil Health Cards in Database)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              आपके खेतों के लिए डेटाबेस में सुरक्षित सभी सॉइल हेल्थ कार्ड की सूची।
            </p>
          </div>
          <button
            type="button"
            onClick={loadFarmsAndReports}
            disabled={loadingReports}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw size={13} className={loadingReports ? 'animate-spin' : ''} />
            <span>रिफ्रेश सूची</span>
          </button>
        </div>

        {loadingReports ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">डेटाबेस से मृदा रिपोर्ट लोड हो रही हैं...</p>
          </div>
        ) : savedReports.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
            <FlaskConical size={28} className="mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">अभी तक कोई मृदा रिपोर्ट सुरक्षित नहीं है</p>
            <p className="text-slate-400 mt-0.5">
              ऊपर अपना सॉइल हेल्थ कार्ड अपलोड करें और &ldquo;मृदा कार्ड स्कैन करें&rdquo; पर क्लिक करें। रिपोर्ट स्वतः डेटाबेस में सुरक्षित हो जाएगी।
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedReports.map((report: any) => (
              <div key={report.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-emerald-300 transition-all space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{report.farm_name || 'खेत प्लॉट'}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {report.created_at ? report.created_at.split('T')[0] : 'हाल ही में'}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">N (नाइट्रोजन)</span>
                    <span className="text-sm font-black text-slate-900">{report.n}</span>
                    <span className="text-[9px] text-slate-400 block">kg/ha</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">P (फास्फोरस)</span>
                    <span className="text-sm font-black text-slate-900">{report.p}</span>
                    <span className="text-[9px] text-slate-400 block">kg/ha</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">K (पोटाश)</span>
                    <span className="text-sm font-black text-slate-900">{report.k}</span>
                    <span className="text-[9px] text-slate-400 block">kg/ha</span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-bold block">pH मान</span>
                    <span className="text-sm font-black text-emerald-700">{report.ph}</span>
                    <span className="text-[9px] text-emerald-600 block">मान</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-500">
                    AI विश्वसनीयता: <strong className="text-slate-700">{Math.round((report.confidence || 0.85) * 100)}%</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomN(report.n);
                      setCustomP(report.p);
                      setCustomK(report.k);
                      setCustomPH(report.ph);
                      setResult({
                        N: report.n,
                        P: report.p,
                        K: report.k,
                        pH: report.ph,
                        confidence: report.confidence,
                        extracted_text: report.raw_text || ''
                      } as any);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold underline cursor-pointer"
                  >
                    कैलकुलेटर में लोड करें
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
