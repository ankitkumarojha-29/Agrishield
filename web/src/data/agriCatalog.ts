// Comprehensive Catalog of Indian Agricultural Crops & Soil Types with English and Hindi Translations
import { api } from '../api';

export interface CropInfo {
  id: string;
  name: string;
  hindi: string;
  category: 'Cereals' | 'Pulses' | 'Oilseeds' | 'Commercial' | 'Spices' | 'Vegetables' | 'Fruits';
  categoryHindi: string;
  season: 'Kharif' | 'Rabi' | 'Zaid' | 'Annual';
  icon: string;
  benchmark_price?: number;
  market?: string;
}

export const CROPS_CATALOG: CropInfo[] = [
  // 1. Cereals & Millets / अनाज एवं मोटे अनाज
  { id: 'wheat', name: 'Wheat', hindi: 'गेहूं', category: 'Cereals', categoryHindi: 'अनाज', season: 'Rabi', icon: '🌾', benchmark_price: 2425, market: 'Bhopal Mandi' },
  { id: 'paddy', name: 'Paddy (Rice)', hindi: 'धान / चावल', category: 'Cereals', categoryHindi: 'अनाज', season: 'Kharif', icon: '🌾', benchmark_price: 2320, market: 'Jabalpur Mandi' },
  { id: 'maize', name: 'Maize', hindi: 'मक्का', category: 'Cereals', categoryHindi: 'अनाज', season: 'Kharif', icon: '🌽', benchmark_price: 2225, market: 'Chhindwara Mandi' },
  { id: 'bajra', name: 'Bajra (Pearl Millet)', hindi: 'बाजरा', category: 'Cereals', categoryHindi: 'अनाज', season: 'Kharif', icon: '🌾', benchmark_price: 2625, market: 'Alwar Mandi' },
  { id: 'jowar', name: 'Jowar (Sorghum)', hindi: 'ज्वार', category: 'Cereals', categoryHindi: 'अनाज', season: 'Kharif', icon: '🌾', benchmark_price: 3371, market: 'Solapur Mandi' },
  { id: 'ragi', name: 'Ragi (Finger Millet)', hindi: 'रागी / मड़ुआ', category: 'Cereals', categoryHindi: 'अनाज', season: 'Kharif', icon: '🌾', benchmark_price: 4290, market: 'Mandya APMC' },
  { id: 'barley', name: 'Barley (Jau)', hindi: 'जौ', category: 'Cereals', categoryHindi: 'अनाज', season: 'Rabi', icon: '🌾', benchmark_price: 1850, market: 'Jaipur Mandi' },

  // 2. Pulses / दलहन
  { id: 'gram', name: 'Gram (Chickpea / Chana)', hindi: 'चना', category: 'Pulses', categoryHindi: 'दलहन', season: 'Rabi', icon: '🌱', benchmark_price: 5650, market: 'Vidisha Mandi' },
  { id: 'tur', name: 'Tur (Arhar / Pigeon Pea)', hindi: 'अरहर / तुअर', category: 'Pulses', categoryHindi: 'दलहन', season: 'Kharif', icon: '🌱', benchmark_price: 7550, market: 'Latur APMC' },
  { id: 'moong', name: 'Moong (Green Gram)', hindi: 'मूंग', category: 'Pulses', categoryHindi: 'दलहन', season: 'Kharif', icon: '🌱', benchmark_price: 8682, market: 'Nagaur APMC' },
  { id: 'urad', name: 'Urad (Black Gram)', hindi: 'उड़द', category: 'Pulses', categoryHindi: 'दलहन', season: 'Kharif', icon: '🌱', benchmark_price: 7400, market: 'Hardoi Mandi' },
  { id: 'lentil', name: 'Lentil (Masur)', hindi: 'मसूर', category: 'Pulses', categoryHindi: 'दलहन', season: 'Rabi', icon: '🌱', benchmark_price: 6700, market: 'Sagar Mandi' },
  { id: 'peas', name: 'Green Peas (Matar)', hindi: 'मटर', category: 'Pulses', categoryHindi: 'दलहन', season: 'Rabi', icon: '🌱', benchmark_price: 4350, market: 'Jabalpur Mandi' },
  { id: 'lobia', name: 'Cowpea (Lobia)', hindi: 'लोबिया / चौलाई', category: 'Pulses', categoryHindi: 'दलहन', season: 'Kharif', icon: '🌱', benchmark_price: 6200, market: 'Meerut Mandi' },

  // 3. Oilseeds / तिलहन
  { id: 'soybean', name: 'Soybean', hindi: 'सोयाबीन', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Kharif', icon: '🌱', benchmark_price: 4892, market: 'Indore Mandi' },
  { id: 'mustard', name: 'Mustard (Sarson / Rai)', hindi: 'सरसों / राई', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Rabi', icon: '🌼', benchmark_price: 5950, market: 'Morena Mandi' },
  { id: 'groundnut', name: 'Groundnut (Peanut)', hindi: 'मूंगफली', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Kharif', icon: '🥜', benchmark_price: 6783, market: 'Rajkot APMC' },
  { id: 'sesame', name: 'Sesame (Til)', hindi: 'तिल', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Kharif', icon: '🌱', benchmark_price: 9267, market: 'Amreli APMC' },
  { id: 'sunflower', name: 'Sunflower', hindi: 'सूरजमुखी', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Zaid', icon: '🌻', benchmark_price: 7280, market: 'Kurnool APMC' },
  { id: 'castor', name: 'Castor Seed (Arandi)', hindi: 'अरंडी', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Kharif', icon: '🌱', benchmark_price: 6450, market: 'Mehsana APMC' },
  { id: 'safflower', name: 'Safflower (Kusum)', hindi: 'कुसुम', category: 'Oilseeds', categoryHindi: 'तिलहन', season: 'Rabi', icon: '🌼', benchmark_price: 5800, market: 'Beed APMC' },

  // 4. Commercial & Fiber / व्यापारिक एवं रेशेदार
  { id: 'cotton', name: 'Cotton (Kapas)', hindi: 'कपास', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Kharif', icon: '🌿', benchmark_price: 7521, market: 'Khargone Mandi' },
  { id: 'sugarcane', name: 'Sugarcane (Ganna)', hindi: 'गन्ना', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Annual', icon: '🎋', benchmark_price: 340, market: 'Muzaffarnagar APMC' },
  { id: 'jute', name: 'Jute (Patson)', hindi: 'जूट / पटसन', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Kharif', icon: '🌿', benchmark_price: 5400, market: 'Barrackpore APMC' },
  { id: 'guar', name: 'Guar Seed (Cluster Bean)', hindi: 'ग्वार बीज', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Kharif', icon: '🌱', benchmark_price: 5450, market: 'Bikaner APMC' },
  { id: 'tobacco', name: 'Tobacco', hindi: 'तंबाकू', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Rabi', icon: '🍂', benchmark_price: 4200, market: 'Guntur APMC' },
  { id: 'tea', name: 'Tea', hindi: 'चाय', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Annual', icon: '🍵', benchmark_price: 18500, market: 'Siliguri Auction' },
  { id: 'coffee', name: 'Coffee', hindi: 'कॉफ़ी', category: 'Commercial', categoryHindi: 'व्यापारिक', season: 'Annual', icon: '☕', benchmark_price: 28000, market: 'Chikmagalur APMC' },

  // 5. Spices / मसाले
  { id: 'chilli', name: 'Red Chilli (Mirch)', hindi: 'लाल मिर्च', category: 'Spices', categoryHindi: 'मसाले', season: 'Kharif', icon: '🌶️', benchmark_price: 19500, market: 'Guntur APMC' },
  { id: 'garlic', name: 'Garlic (Lahsun)', hindi: 'लहसुन', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🧄', benchmark_price: 6800, market: 'Mandsaur APMC' },
  { id: 'onion', name: 'Onion (Pyaz)', hindi: 'प्याज', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🧅', benchmark_price: 1850, market: 'Lasalgaon APMC' },
  { id: 'turmeric', name: 'Turmeric (Haldi)', hindi: 'हल्दी', category: 'Spices', categoryHindi: 'मसाले', season: 'Annual', icon: '🪵', benchmark_price: 13200, market: 'Nizamabad APMC' },
  { id: 'ginger', name: 'Ginger (Adrak)', hindi: 'अदरक', category: 'Spices', categoryHindi: 'मसाले', season: 'Annual', icon: '🫚', benchmark_price: 7200, market: 'Wayanad APMC' },
  { id: 'cumin', name: 'Cumin (Jeera)', hindi: 'जीरा', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🧂', benchmark_price: 24500, market: 'Unjha APMC' },
  { id: 'coriander', name: 'Coriander (Dhania)', hindi: 'धनिया', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🌿', benchmark_price: 7600, market: 'Kota APMC' },
  { id: 'fenugreek', name: 'Fenugreek (Methi)', hindi: 'मेथी', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🌱', benchmark_price: 6100, market: 'Jaipur Mandi' },
  { id: 'fennel', name: 'Fennel (Saunf)', hindi: 'सौंफ', category: 'Spices', categoryHindi: 'मसाले', season: 'Rabi', icon: '🌿', benchmark_price: 11500, market: 'Unjha APMC' },

  // 6. Vegetables / सब्जियां
  { id: 'potato', name: 'Potato (Aloo)', hindi: 'आलू', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Rabi', icon: '🥔', benchmark_price: 1450, market: 'Agra APMC' },
  { id: 'tomato', name: 'Tomato (Tamatar)', hindi: 'टमाटर', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Zaid', icon: '🍅', benchmark_price: 1650, market: 'Kolar APMC' },
  { id: 'brinjal', name: 'Brinjal (Baingan / Eggplant)', hindi: 'बैंगन', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Kharif', icon: '🍆', benchmark_price: 1400, market: 'Nashik APMC' },
  { id: 'okra', name: 'Okra (Bhindi / Ladyfinger)', hindi: 'भिंडी', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Zaid', icon: '🥒', benchmark_price: 2600, market: 'Azadpur APMC' },
  { id: 'cauliflower', name: 'Cauliflower (Phoolgobhi)', hindi: 'फूलगोभी', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Rabi', icon: '🥦', benchmark_price: 1350, market: 'Hapur APMC' },
  { id: 'cabbage', name: 'Cabbage (Pattagobhi)', hindi: 'पत्तागोभी', category: 'Vegetables', categoryHindi: 'सब्जियां', season: 'Rabi', icon: '🥬', benchmark_price: 1150, market: 'Pune APMC' },

  // 7. Fruits / फल
  { id: 'banana', name: 'Banana (Kela)', hindi: 'केला', category: 'Fruits', categoryHindi: 'फल', season: 'Annual', icon: '🍌', benchmark_price: 1800, market: 'Jalgaon APMC' },
  { id: 'mango', name: 'Mango (Aam)', hindi: 'आम', category: 'Fruits', categoryHindi: 'फल', season: 'Annual', icon: '🥭', benchmark_price: 4500, market: 'Lucknow Mandi' },
  { id: 'citrus', name: 'Citrus / Orange (Santra)', hindi: 'संतरा / मौसमी', category: 'Fruits', categoryHindi: 'फल', season: 'Annual', icon: '🍊', benchmark_price: 3800, market: 'Nagpur APMC' },
  { id: 'pomegranate', name: 'Pomegranate (Anar)', hindi: 'अनार', category: 'Fruits', categoryHindi: 'फल', season: 'Annual', icon: '🍎', benchmark_price: 8500, market: 'Solapur APMC' }
];

export interface SoilTypeInfo {
  id: string;
  name: string;
  hindi: string;
  label: string;
  description: string;
}

export const SOIL_TYPES_CATALOG: SoilTypeInfo[] = [
  {
    id: 'medium_black_loam',
    name: 'Medium Black Loam',
    hindi: 'मध्यम काली दोमट मिट्टी',
    label: 'Medium Black Loam (मध्यम काली दोमट)',
    description: 'कपास, सोयाबीन, गेहूं और चने के लिए उपयुक्त (Central India & Deccan)'
  },
  {
    id: 'deep_black_clay',
    name: 'Deep Black Cotton Soil (Regur)',
    hindi: 'गहरी काली कपासी मिट्टी (रेगुर)',
    label: 'Deep Black Cotton / Regur (गहरी काली कपासी)',
    description: 'उच्च नमी धारण क्षमता, कपास व दलहन (Malwa, Vidarbha, Gujarat)'
  },
  {
    id: 'heavy_black_clay',
    name: 'Heavy Black Clay Soil',
    hindi: 'भारी काली चिकनी मिट्टी',
    label: 'Heavy Black Clay (भारी काली चिकनी)',
    description: 'धीमी जल निकासी, धान, सोयाबीन और गेहूं हेतु आदर्श'
  },
  {
    id: 'alluvial_loam',
    name: 'Alluvial Loam',
    hindi: 'जलोढ़ दोमट मिट्टी',
    label: 'Alluvial Loam (जलोढ़ दोमट)',
    description: 'अत्यंत उपजाऊ, धान, गेहूं, गन्ना के लिए आदर्श (Indo-Gangetic Plain, UP, Bihar, Punjab)'
  },
  {
    id: 'old_alluvial_bangar',
    name: 'Old Alluvial (Bangar)',
    hindi: 'पुरानी जलोढ़ मिट्टी (बांगर)',
    label: 'Old Alluvial - Bangar (पुरानी जलोढ़ / बांगर)',
    description: 'कंकड़ युक्त उच्च भूमि, गेहूं, सरसों और दलहन हेतु उपयुक्त'
  },
  {
    id: 'new_alluvial_khadar',
    name: 'New Alluvial (Khadar)',
    hindi: 'नवीन जलोढ़ मिट्टी (खादर)',
    label: 'New Alluvial - Khadar (नवीन जलोढ़ / खादर)',
    description: 'बाढ़ के मैदानों की ताज़ा उपजाऊ गाद, सब्जी, मक्का और धान हेतु'
  },
  {
    id: 'coastal_alluvial',
    name: 'Coastal Alluvial & Deltaic Soil',
    hindi: 'तटीय जलोढ़ एवं डेल्टाई मिट्टी',
    label: 'Coastal Alluvial (तटीय जलोढ़)',
    description: 'नदियों के डेल्टा और तटीय क्षेत्रों की मिट्टी, धान, नारियल और जूट हेतु'
  },
  {
    id: 'calcareous_alluvial',
    name: 'Calcareous Alluvial Soil',
    hindi: 'चूनायुक्त जलोढ़ मिट्टी',
    label: 'Calcareous Alluvial (चूनायुक्त जलोढ़)',
    description: 'चूने के अंश से युक्त, गन्ना, तंबाकू और दालों के लिए उत्तम (North Bihar, Eastern UP)'
  },
  {
    id: 'tarai_soil',
    name: 'Tarai Alluvial Soil',
    hindi: 'तराई जलोढ़ मिट्टी',
    label: 'Tarai Soil (तराई मिट्टी)',
    description: 'नम एवं समृद्ध जैव पदार्थ, गन्ना और धान हेतु विख्यात (Himalayan Foothills)'
  },
  {
    id: 'red_yellow_soil',
    name: 'Red & Yellow Soil',
    hindi: 'लाल और पीली मिट्टी',
    label: 'Red & Yellow Soil (लाल और पीली मिट्टी)',
    description: 'आयरन ऑक्साइड युक्त, मोटे अनाज, बाजरा, मूंगफली व दालें (Odisha, MP, Chhattisgarh)'
  },
  {
    id: 'red_sandy_loam',
    name: 'Red Sandy Loam',
    hindi: 'लाल बलुई दोमट मिट्टी',
    label: 'Red Sandy Loam (लाल बलुई दोमट)',
    description: 'शीघ्र सूखने वाली, मूंगफली, अरंडी और बाजरा हेतु उपयुक्त'
  },
  {
    id: 'laterite_soil',
    name: 'Laterite Soil',
    hindi: 'लैटेराइट मिट्टी',
    label: 'Laterite Soil (लैटेराइट मिट्टी)',
    description: 'भारी वर्षा वाले क्षेत्रों की निक्षालित मिट्टी, काजू, चाय, कॉफी व रबड़ हेतु'
  },
  {
    id: 'arid_desert_sand',
    name: 'Arid & Desert Sand',
    hindi: 'बलुई / मरुस्थलीय मिट्टी',
    label: 'Arid & Desert Sand (बलुई / मरुस्थलीय)',
    description: 'कम नमी, बाजरा, ग्वार, मोठ और मूंग के लिए अनुकूल (Western Rajasthan, Haryana)'
  },
  {
    id: 'sandy_loam',
    name: 'Sandy Loam (Balu Doomat)',
    hindi: 'बलुई दोमट मिट्टी',
    label: 'Sandy Loam (बलुई दोमट मिट्टी)',
    description: 'हल्की जल निकासी वाली, आलू, मूंगफली, मक्का व सब्जियों हेतु'
  },
  {
    id: 'clayey_loam',
    name: 'Clayey Loam',
    hindi: 'चिकनी दोमट मिट्टी',
    label: 'Clayey Loam (चिकनी दोमट मिट्टी)',
    description: 'जलभराव सहन करने वाली, धान (चावल) और गेहूं की खेती हेतु उत्तम'
  },
  {
    id: 'silt_loam',
    name: 'Silt Loam',
    hindi: 'गाद दोमट मिट्टी',
    label: 'Silt Loam (गाद दोमट मिट्टी)',
    description: 'नदी घाटी की महीन गाद, गेहूं, सरसों व तिलहन हेतु'
  },
  {
    id: 'mountain_forest_soil',
    name: 'Mountain & Forest Soil',
    hindi: 'पर्वतीय एवं वन मिट्टी',
    label: 'Mountain & Forest Soil (पर्वतीय एवं वन मिट्टी)',
    description: 'जीवांश (ह्यूमस) से भरपूर, सेब, बागवानी, चाय और मसाले (Himalayas, Western Ghats)'
  },
  {
    id: 'saline_alkaline_usar',
    name: 'Saline & Alkaline Soil (Usar/Kallar)',
    hindi: 'लवणीय एवं क्षारीय मिट्टी (ऊसर/रेह)',
    label: 'Saline & Alkaline (लवणीय / ऊसर मिट्टी)',
    description: 'जिप्सम सुधार उपरांत धान, बेर और जौ के लिए उपयुक्त'
  },
  {
    id: 'peaty_marshy_soil',
    name: 'Peaty & Marshy Soil (Kari)',
    hindi: 'दलदली एवं जैविक मिट्टी',
    label: 'Peaty & Marshy (दलदली एवं जैविक मिट्टी)',
    description: 'उच्च कार्बनिक पदार्थ युक्त, तटीय धान और दलहनी खेती (Kerala, Sundarbans)'
  },
  {
    id: 'gravelly_skeletal',
    name: 'Gravelly & Skeletal Soil',
    hindi: 'कंकरीली / पथरीली मिट्टी',
    label: 'Gravelly & Skeletal (कंकरीली / पथरीली)',
    description: 'उथली पथरीली मिट्टी, चारागाह और झाड़ीदार फलदार वृक्षों हेतु'
  },
  {
    id: 'other_custom',
    name: 'Other Local Soil Type',
    hindi: 'अन्य स्थानीय मिट्टी',
    label: 'Other Local Soil (अन्य स्थानीय मिट्टी)',
    description: 'क्षेत्रीय या स्थानीय मिश्रित मिट्टी'
  }
];

// Runtime dynamic cache
let _dynamicCrops: CropInfo[] | null = null;
let _dynamicSoilTypes: SoilTypeInfo[] | null = null;

/**
 * Fetch crops dynamically from backend /mandi/crops API.
 * Uses in-memory cache and falls back to CROPS_CATALOG seamlessly.
 */
export async function fetchCropsCatalog(): Promise<CropInfo[]> {
  if (_dynamicCrops && _dynamicCrops.length > 0) {
    return _dynamicCrops;
  }
  try {
    const res = await api.getMandiCrops();
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      _dynamicCrops = res.data;
      return _dynamicCrops;
    }
  } catch {
    // Graceful fallback to rich local catalog
  }
  _dynamicCrops = CROPS_CATALOG;
  return _dynamicCrops;
}

/**
 * Fetch soil types dynamically from backend /mandi/soil-types API.
 * Uses in-memory cache and falls back to SOIL_TYPES_CATALOG seamlessly.
 */
export async function fetchSoilTypesCatalog(): Promise<SoilTypeInfo[]> {
  if (_dynamicSoilTypes && _dynamicSoilTypes.length > 0) {
    return _dynamicSoilTypes;
  }
  try {
    const res = await api.getSoilTypes();
    if (res.success && Array.isArray(res.data) && res.data.length > 0) {
      _dynamicSoilTypes = res.data;
      return _dynamicSoilTypes;
    }
  } catch {
    // Graceful fallback to rich local catalog
  }
  _dynamicSoilTypes = SOIL_TYPES_CATALOG;
  return _dynamicSoilTypes;
}

/**
 * Helper to look up bilingual name from raw crop string
 */
export function getBilingualCropName(rawCrop: string): { english: string; hindi: string; display: string } {
  if (!rawCrop) return { english: 'Wheat', hindi: 'गेहूं', display: 'Wheat (गेहूं)' };
  
  const clean = rawCrop.trim().toLowerCase();
  const catalog = _dynamicCrops || CROPS_CATALOG;
  
  for (const c of catalog) {
    if (
      clean === c.id ||
      clean === c.name.toLowerCase() ||
      clean === c.hindi.toLowerCase() ||
      clean === `${c.name.toLowerCase()} (${c.hindi.toLowerCase()})` ||
      clean.includes(c.id) ||
      clean.includes(c.name.toLowerCase()) ||
      clean.includes(c.hindi.toLowerCase()) ||
      c.name.toLowerCase().includes(clean)
    ) {
      return { english: c.name, hindi: c.hindi, display: `${c.name} (${c.hindi})` };
    }
  }

  // If crop is already in "Name (हिंदी)" format, parse both parts
  const match = rawCrop.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (match) {
    return {
      english: match[1].trim(),
      hindi: match[2].trim(),
      display: rawCrop.trim()
    };
  }

  return { english: rawCrop, hindi: rawCrop, display: rawCrop };
}
