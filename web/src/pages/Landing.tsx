import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sprout,
  Satellite,
  CloudRain,
  ScanLine,
  FlaskConical,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Globe2,
  Store
} from 'lucide-react';

export default function Landing() {
  const [lang, setLang] = useState<'hi' | 'en'>(() => {
    return (localStorage.getItem('agrishield_lang') as 'hi' | 'en') || 'hi';
  });

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    localStorage.setItem('agrishield_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => (prev === 'hi' ? 'en' : 'hi'));
  };

  const isHi = lang === 'hi';

  const faqs = [
    {
      q_hi: 'AgriShield क्या है और यह किसानों के लिए कैसे काम करता है?',
      q_en: 'What is AgriShield and how does it help Indian farmers?',
      a_hi: 'AgriShield भारत का आधुनिक AI कृषि पोर्टल है। यह किसान के खेत की उपग्रह (Sentinel-2) से निगरानी करता है, मोबाइल से पत्ती की फोटो देखकर 2 सेकंड में बीमारी व सही दवा बताता है, और 47 फसलों के आज के ताजा मंडी भाव उपलब्ध कराता है। यह किसानों के लिए 100% मुफ़्त है।',
      a_en: 'AgriShield is an AI-powered agricultural intelligence platform built for Indian farmers and PMFBY. It monitors farm health via Sentinel-2 satellite imagery, diagnoses leaf diseases from smartphone photos within 2 seconds with curative advice, and provides real-time wholesale APMC Mandi rates.'
    },
    {
      q_hi: 'क्या पत्ती रोग जांच और फसल सलाह के लिए कोई शुल्क देना होगा?',
      q_en: 'Is crop leaf disease diagnosis and agronomic advisory free?',
      a_hi: 'नहीं, AgriShield किसानों के लिए पूरी तरह मुफ़्त है। आप अपने खेत की फसल की पत्ती की फोटो अपलोड करके तुरंत बीमारी का नाम, गंभीरता और दवा का नाम बिना किसी शुल्क के जान सकते हैं।',
      a_en: 'No, AgriShield is 100% free for farmers. You can take a photo of any damaged or stressed crop leaf and receive instant deep learning diagnosis, severity assessment, and chemical/biological treatment guidance.'
    },
    {
      q_hi: 'अंतरिक्ष से सैटेलाइट मेरे खेत की निगरानी कैसे करता है?',
      q_en: 'How does satellite monitoring work for individual farm parcels?',
      a_hi: 'यूरोपीय अंतरिक्ष एजेंसी के Sentinel-2 उपग्रह हर 5 दिन में 10 मीटर की दूरी से आपके खेत की हरियाली (NDVI) और पानी की नमी (NDMI) नापते हैं। इससे खेत में कोई भी सूखा या बीमारी आंख से दिखने से पहले ही पकड़ में आ जाती है।',
      a_en: 'AgriShield leverages ESA Sentinel-2 multispectral satellites passing over Indian farms every 5 days. It calculates 10-meter optical vegetation vigor (NDVI) and canopy moisture (NDMI) to alert you before visible crop damage occurs.'
    },
    {
      q_hi: 'क्या मुझे इसके लिए कोई भारी मोबाइल ऐप डाउनलोड करना पड़ेगा?',
      q_en: 'Do I need to install a heavy mobile app from Google Play Store?',
      a_hi: 'नहीं, किसी ऐप डाउनलोड की आवश्यकता नहीं है। यह वेबसाइट (https://agrishield.kesug.com) किसी भी मोबाइल या कंप्यूटर ब्राउज़र (Chrome, Safari) में तुरंत खुलती है और धीमे 2G/3G इंटरनेट पर भी तेज़ी से काम करती है।',
      a_en: 'No app download required. AgriShield is a high-speed Progressive Web Application that loads instantly in any mobile browser (Chrome, Safari, JioBrowser) even on low-bandwidth rural cellular networks.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FBFDF9] text-slate-800 font-sans flex flex-col selection:bg-emerald-200">
      {/* Top Navbar */}
      <header className="w-full px-4 sm:px-6 lg:px-12 py-3.5 sm:py-4 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <img 
              alt="AgriShield Logo" 
              className="h-9 sm:h-10 w-auto object-contain" 
              src="/logo-trimmed.webp" 
              width={160}
              height={40}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <span className="hidden md:inline-block text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
            {isHi ? '🌾 भारत का AI किसान पोर्टल' : 'AI Crop Intelligence & PMFBY'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <button
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
            title="Switch Language / भाषा बदलें"
            aria-label="Toggle language"
          >
            <Globe2 size={14} className="text-emerald-700" />
            <span>{isHi ? 'English' : 'हिंदी'}</span>
          </button>

          <Link
            to="/crop-scan"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-full border border-emerald-200 transition-colors"
          >
            <ScanLine size={14} /> {isHi ? 'पत्ती रोग जांच' : 'Instant Leaf Scan'}
          </Link>

          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-4 sm:px-5 py-2 sm:py-2.5 rounded-full transition-all shadow-sm hover:shadow-emerald-700/20"
          >
            <span>{isHi ? 'लॉग इन / Sign In' : 'Sign In'}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-[1240px] mx-auto w-full px-4 sm:px-6 py-10 md:py-16 flex flex-col items-center text-center">
        {/* Early Warning Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold mb-6 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>
            {isHi 
              ? '🛰️ सेंटिनल-2 सैटेलाइट + मौसम रडार AI द्वारा संचालित' 
              : 'Sentinel-2 Multispectral + OpenWeather Real-Time Intelligence'}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight max-w-4xl leading-[1.2] mb-5">
          {isHi ? (
            <>
              AgriShield — भारत का <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy">AI फसल डॉक्टर</span>, सैटेलाइट निगरानी व मंडी भाव
            </>
          ) : (
            <>
              AgriShield India — AI Crop Intelligence, <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy">Satellite Monitoring</span> &amp; Spot Mandi
            </>
          )}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed mb-8">
          {isHi 
            ? 'खेत की पत्ती की फोटो से 2 सेकंड में बीमारी पहचानें, अंतरिक्ष से खेत की हरियाली (NDVI) देखें, 47 फसलों के आज के ताजा मंडी भाव जानें और मौसम अनुसार पानी लगाने की सही सलाह पाएं।'
            : 'Unifying Copernicus Sentinel-2 satellite observation, live APMC mandi wholesale rates, weather-based irrigation planning, and deep learning leaf disease diagnosis into one simple dashboard for Indian farmers.'}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-wrap gap-3 sm:gap-4 justify-center items-center mb-14">
          <Link
            to="/crop-scan"
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm sm:text-base font-extrabold px-6 sm:px-8 py-3.5 sm:py-4 rounded-full shadow-lg shadow-emerald-800/20 transition-all hover:-translate-y-0.5 cursor-pointer"
          >
            <ScanLine size={18} />
            <span>{isHi ? '📱 पत्ती रोग की मुफ्त जांच' : 'Scan Leaf Disease Free'}</span>
            <ArrowRight size={16} />
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm sm:text-base font-bold px-6 sm:px-7 py-3.5 sm:py-4 rounded-full shadow-xs transition-all hover:border-emerald-500 cursor-pointer"
          >
            <Sprout size={18} className="text-emerald-700" />
            <span>{isHi ? '🌾 किसान डैशबोर्ड' : 'Farmer Dashboard'}</span>
          </Link>
          <Link
            to="/revenue"
            className="inline-flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-sm sm:text-base font-bold px-6 sm:px-7 py-3.5 sm:py-4 rounded-full shadow-xs transition-all cursor-pointer"
          >
            <Store size={18} className="text-amber-700" />
            <span>{isHi ? '💰 आज का मंडी भाव' : 'Live Mandi Rates'}</span>
          </Link>
        </div>

        {/* 3-Step Simple How-It-Works Strip */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs mb-16">
          <div className="text-center mb-6">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {isHi ? 'सरल 3-कदम प्रक्रिया' : 'Simple 3-Step Process'}
            </span>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-2">
              {isHi ? 'AgriShield का उपयोग कैसे करें' : 'How AgriShield Works for Every Farmer'}
            </h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-left">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm mb-3 shadow-2xs">
                  1
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span>{isHi ? '📸 फोटो खींचें' : 'Take a Photo'}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isHi 
                    ? 'खेत में जिस पौधे या पत्ती में रोग दिखे, उसकी अपने मोबाइल से साफ फोटो खींचें या गैलरी से अपलोड करें।'
                    : 'Capture a clear photo of any infected crop leaf or upload your official government Soil Health Card.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-700 text-white flex items-center justify-center font-black text-sm mb-3 shadow-2xs">
                  2
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span>{isHi ? '⚡ 2 सेकंड में AI जांच' : 'Instant AI Diagnosis'}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isHi 
                    ? 'कंप्यूटर विजन AI तुरंत रोग का नाम, गंभीरता और बाजार में मिलने वाली उचित कीटनाशक दवा की सिफारिश देगा।'
                    : 'Deep learning models identify disease, blight, or pest attack with severity rating and curative advice.'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-700 text-white flex items-center justify-center font-black text-sm mb-3 shadow-2xs">
                  3
                </div>
                <h4 className="text-base font-extrabold text-slate-900 mb-1.5 flex items-center gap-1.5">
                  <span>{isHi ? '🌾 फसल बचाएं व सही दाम पाएं' : 'Protect & Maximize Profit'}</span>
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {isHi 
                    ? 'सैटेलाइट से सिंचाई का सही समय जानें और आज के मंडी रेट देखकर अपनी फसल का सर्वोत्तम मूल्य प्राप्त करें।'
                    : 'Prevent yield loss with timely irrigation alerts and compare live APMC mandi wholesale rates with MSP.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* The 6 Core Features */}
        <div className="w-full text-left mb-16">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {isHi ? 'मुख्य कृषि सुविधाएं' : 'Core Capabilities'}
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-2">
              {isHi ? 'किसान की हर ज़रूरत के लिए 6 आधुनिक समाधान' : 'Six Core Pillars of Agricultural Intelligence'}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            <FeatureCard
              icon={ScanLine}
              titleHi="1. AI पत्ती रोग डॉक्टर"
              titleEn="1. AI Foliage Disease Scanner"
              badge="EfficientNet-B0"
              descHi="पत्ती की फोटो अपलोड करें; AI तुरंत रोग का नाम, गंभीरता और बाजार में मिलने वाली उचित दवा का छिड़काव बताएगा।"
              descEn="Upload or capture any leaf photo for instant deep learning disease diagnosis with severity grading and curative advice."
              link="/crop-scan"
              isHi={isHi}
            />
            <FeatureCard
              icon={Satellite}
              titleHi="2. सैटेलाइट खेत निगरानी"
              titleEn="2. Satellite Farm Monitoring"
              badge="Sentinel-2"
              descHi="अंतरिक्ष से 10 मीटर की दूरी पर खेत की हरियाली (NDVI) और पानी की नमी (NDMI) नापें ताकि बीमारी फैलने से पहले दिखे।"
              descEn="10m optical Sentinel-2 earth observation measuring NDVI vegetation vigor and NDMI canopy moisture to catch crop stress early."
              link="/farms"
              isHi={isHi}
            />
            <FeatureCard
              icon={CloudRain}
              titleHi="3. मौसम और सिंचाई सलाह"
              titleEn="3. Weather-Based Irrigation"
              badge="7-Day Rain Forecast"
              descHi="आगामी बारिश और तापमान देखकर जानें कि खेत में पानी कब लगाना जरूरी है ताकि फसल न सूखे और पानी न बर्बाद हो।"
              descEn="Combines real-time evapotranspiration, humidity, and 7-day precipitation forecasts to recommend optimal irrigation intervals."
              link="/weather-irrigation"
              isHi={isHi}
            />
            <FeatureCard
              icon={FlaskConical}
              titleHi="4. मिट्टी कार्ड से खाद की खुराक"
              titleEn="4. Soil Health Card OCR"
              badge="Smart OCR"
              descHi="सरकारी स्वाइल हेल्थ कार्ड की फोटो डालें; सिस्टम खेत के नाप अनुसार यूरिया, डीएपी और पोटाश की कुल बोरियां बताएगा।"
              descEn="Automated optical character recognition of government Soil Health Cards to calculate exact fertilizer bags needed for your acreage."
              link="/soil-analysis"
              isHi={isHi}
            />
            <FeatureCard
              icon={TrendingUp}
              titleHi="5. पैदावार व जोखिम स्कोर"
              titleEn="5. Yield & PMFBY Risk Scoring"
              badge="Random Forest"
              descHi="पीएम फसल बीमा (PMFBY) हेतु खेत की अनुमानित पैदावार (क्विंटल) और मौसम जोखिम स्कोर देखें।"
              descEn="Machine learning regression forecasting expected harvest yield (kg/ha and quintals) and 0-100 PMFBY insurance risk score."
              link="/reports"
              isHi={isHi}
            />
            <FeatureCard
              icon={Store}
              titleHi="6. 47 फसलों के आज के मंडी भाव"
              titleEn="6. Real-Time APMC Mandi Rates"
              badge="47 Indian Crops"
              descHi="भारत की मंडियों में आज के थोक भाव, आवक और सरकारी न्यूनतम समर्थन मूल्य (MSP) की लाइव तुलना।"
              descEn="Live wholesale spot prices and arrival volumes across 47 Indian agricultural crops with official MSP benchmark comparisons."
              link="/revenue"
              isHi={isHi}
            />
          </div>
        </div>

        {/* Google FAQ Accordion Section */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xs mb-16 text-left">
          <div className="text-center mb-8">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {isHi ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently Asked Questions'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
              {isHi ? 'AgriShield के बारे में जरूरी जानकारी' : 'Everything You Need to Know'}
            </h3>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left font-bold text-sm sm:text-base text-slate-900 hover:bg-slate-100/70 transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-emerald-700 shrink-0" />
                    <span>{isHi ? faq.q_hi : faq.q_en}</span>
                  </span>
                  <ChevronDown 
                    size={18} 
                    className={`text-slate-500 transition-transform duration-200 ${openFaq === idx ? 'rotate-180 text-emerald-700' : ''}`} 
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-4 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3 bg-white">
                    <p>{isHi ? faq.a_hi : faq.a_en}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Launch Banner for Farmers */}
        <div className="w-full bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-8 sm:p-12 text-left relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs uppercase tracking-widest font-black text-emerald-300">
              {isHi ? 'आज ही अपने खेत को सुरक्षित करें' : 'Ready to Protect Your Land?'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-extrabold mt-2 mb-3 leading-tight">
              {isHi 
                ? 'अपने खेत का नक्शा बनाएं या पत्ती की फोटो से रोग जांचें।' 
                : 'Start with your farm coordinates or an instant crop health photo.'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-100/90 mb-6 leading-relaxed">
              {isHi 
                ? 'किसी ऐप डाउनलोड की जरूरत नहीं। यह सभी स्मार्टफोन और कंप्यूटर ब्राउज़र में 100% मुफ़्त काम करता है।'
                : 'No complex app download required. Works across all smartphone browsers and desktop PCs.'}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link 
                to="/crop-scan" 
                className="bg-white text-emerald-950 font-extrabold px-6 py-3 rounded-full text-xs sm:text-sm hover:bg-emerald-50 transition-colors shadow-sm"
              >
                {isHi ? '📱 पत्ती जांच शुरू करें' : 'Scan Leaf Photo'}
              </Link>
              <Link 
                to="/add-farm" 
                className="bg-emerald-700/90 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-full text-xs sm:text-sm border border-emerald-500/50 transition-colors"
              >
                {isHi ? '🗺️ खेत का नक्शा बनाएं' : 'Register Farm Boundary'}
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-slate-500 text-xs border-t border-slate-200 bg-white">
        <p>&copy; 2026 AgriShield &bull; AI-Powered Crop Intelligence &amp; Agronomic Governance Platform.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  titleHi, 
  titleEn, 
  badge, 
  descHi, 
  descEn, 
  link, 
  isHi 
}: { 
  icon: any; 
  titleHi: string; 
  titleEn: string; 
  badge: string; 
  descHi: string; 
  descEn: string; 
  link: string; 
  isHi: boolean;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Icon size={20} />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/80">
            {badge}
          </span>
        </div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
          {isHi ? titleHi : titleEn}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {isHi ? descHi : descEn}
        </p>
      </div>
      <Link 
        to={link} 
        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 mt-4 pt-3 border-t border-slate-100"
      >
        <span>{isHi ? 'सुविधा देखें' : 'Explore Feature'}</span>
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
