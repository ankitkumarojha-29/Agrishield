import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sprout,
  Satellite,
  CloudRain,
  ScanLine,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  Layers
} from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FBFDF9] text-slate-800 font-sans flex flex-col selection:bg-emerald-200">
      {/* Top Navbar */}
      <header className="w-full px-6 lg:px-12 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img alt="AgriShield Logo" className="h-10 w-auto object-contain" src="/logo-trimmed.webp" />
          <span className="hidden sm:inline-block text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            Crop Intelligence & Early Warning
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/crop-scan"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-full border border-emerald-200 transition-colors"
          >
            <ScanLine size={15} /> Instant Leaf Scan
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-semibold px-5 py-2.5 rounded-full transition-all shadow-sm hover:shadow-emerald-600/20"
          >
            Portal Sign In <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-[1240px] mx-auto w-full px-6 py-12 md:py-20 flex flex-col items-center text-center">
        {/* Early Warning Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold mb-8 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Sentinel-2 Multispectral + OpenWeather Real-Time Intelligence</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl leading-[1.15] mb-6">
          AI-Powered Crop Intelligence & <span className="text-emerald-700 underline decoration-emerald-300 decoration-wavy">Early Warning</span> System
        </h1>

        {/* Subtitle */}
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed mb-10">
          Unifying satellite multispectral observation, localized weather parameters, and AI leaf diagnostics into a single actionable decision dashboard for farmers and agronomists.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center items-center mb-16">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold px-8 py-4 rounded-full shadow-lg shadow-emerald-700/25 transition-all hover:-translate-y-0.5"
          >
            Open Farmer Dashboard <ArrowRight size={18} />
          </Link>
          <Link
            to="/add-farm"
            className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-base font-semibold px-7 py-4 rounded-full shadow-xs transition-all hover:border-emerald-500"
          >
            <Layers size={18} className="text-emerald-600" /> Draw Farm Boundary
          </Link>
        </div>

        {/* PPT Methodology Strip: Observe -> Analyse -> Predict -> Alert -> Support Decisions */}
        <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm mb-20">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 mb-6">The AgriShield Methodology</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left">
            {[
              { step: '01', title: 'Observe', desc: 'Sentinel-2 (NDVI, NDMI, NDWI) + OpenWeather metrics', icon: Satellite, color: 'text-sky-600 bg-sky-50' },
              { step: '02', title: 'Analyse', desc: 'Soil Health Card OCR & environmental correlation', icon: FlaskConical, color: 'text-amber-600 bg-amber-50' },
              { step: '03', title: 'Predict', desc: 'Random Forest yield modeling & disease risk probability', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
              { step: '04', title: 'Alert', desc: 'Early warnings on drought, heat stress & unseasonal rain', icon: AlertTriangle, color: 'text-red-600 bg-red-50' },
              { step: '05', title: 'Support Decisions', desc: 'Curative fungicide advice & custom NPK fertilizer doses', icon: Sprout, color: 'text-green-600 bg-green-50' },
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold text-slate-400">{s.step}</span>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.color}`}>
                      <s.icon size={16} />
                    </div>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">{s.title}</h4>
                  <p className="text-xs text-slate-500 leading-normal">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The 6 Core Features from PPT Slide 5 */}
        <div className="w-full text-left mb-16">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Complete Feature Suite
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-3">
              Six Core Pillars of Agricultural Intelligence
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={Satellite}
              title="1. Satellite Crop Monitoring"
              badge="Sentinel-2"
              desc="10m optical observation measuring NDVI (vegetation vigor), NDMI (canopy moisture), and NDWI (water index) to catch stress before symptoms appear."
              link="/farms"
            />
            <FeatureCard
              icon={CloudRain}
              title="2. Irrigation Intelligence"
              badge="Moisture Deficit"
              desc="Combines satellite canopy indices with localized evapotranspiration to recommend optimal irrigation intervals and reduce water waste."
              link="/weather-irrigation"
            />
            <FeatureCard
              icon={TrendingUp}
              title="3. Yield Prediction"
              badge="ML Regression"
              desc="Machine learning model trained on weather, soil NPK, and vegetative history forecasting expected yield in kg/ha and quintals with confidence scores."
              link="/dashboard"
            />
            <FeatureCard
              icon={AlertTriangle}
              title="4. Weather Intelligence"
              badge="Real-Time"
              desc="Tracks temperature, humidity, rainfall volume, and wind speeds with predictive thresholds for unseasonal storm or drought damage."
              link="/weather-irrigation"
            />
            <FeatureCard
              icon={ShieldAlert}
              title="5. Disease Risk Prediction"
              badge="Predictive Score"
              desc="Evaluates micro-climatic humidity and temperature conditions to generate a 0-100 disease favorability score before pathogens spread."
              link="/alerts"
            />
            <FeatureCard
              icon={ScanLine}
              title="6. Disease Intelligence (CV)"
              badge="EfficientNet-B0"
              desc="Upload or scan any leaf photo for instant deep learning disease diagnosis with severity classification and agronomic curative advice."
              link="/crop-scan"
            />
          </div>
        </div>

        {/* Quick Launch Cards for Farmers */}
        <div className="w-full bg-gradient-to-br from-emerald-800 to-emerald-950 text-white rounded-3xl p-8 md:p-12 text-left relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <span className="text-xs uppercase tracking-widest font-bold text-emerald-300">Ready to Monitor Your Land?</span>
            <h3 className="text-2xl md:text-3xl font-bold mt-2 mb-4 leading-tight">
              Start with your farm coordinates or an instant crop health photo.
            </h3>
            <p className="text-sm text-emerald-100/80 mb-8 leading-relaxed">
              No complex app download required. Works across smartphone browsers and desktop PCs.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/add-farm" className="bg-white text-emerald-900 font-bold px-6 py-3 rounded-full text-sm hover:bg-emerald-50 transition-colors">
                Register Farm Boundary
              </Link>
              <Link to="/soil-analysis" className="bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-full text-sm border border-emerald-500/50 transition-colors">
                Upload Soil Health Card
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 text-center text-slate-500 text-xs border-t border-slate-200 bg-white">
        <p>&copy; 2026 AgriShield &bull; VIT Bhopal University. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, badge, desc, link }: { icon: any, title: string, badge: string, desc: string, link: string }) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all hover:-translate-y-1 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <Icon size={20} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            {badge}
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
      </div>
      <Link to={link} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 mt-5 pt-3 border-t border-slate-100">
        <span>Explore Feature</span>
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
