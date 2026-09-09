import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sprout, Satellite } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-sans flex flex-col">
      <header className="w-full px-8 py-6 flex justify-between items-center bg-surface border-b border-outline-variant">
        <div className="flex items-center">
          <img alt="AgriShield Logo" className="h-10 w-auto object-contain" src="/logo-trimmed.webp" />
        </div>
        <Link to="/login" className="bg-primary text-on-primary px-6 py-2 rounded-full font-semibold hover:bg-surface-tint transition-all shadow-sm">
          Portal Login
        </Link>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-[1200px] mx-auto w-full">
        <div className="text-center max-w-3xl mb-16">
          <h2 className="text-5xl font-extrabold mb-6 leading-tight text-on-background">AI-Powered Crop Insurance & Farm Risk Platform</h2>
          <p className="text-xl text-on-surface-variant mb-10 leading-relaxed">
            Dynamic insurance pricing, satellite monitoring, and blockchain-audited policy records designed to protect farmers under the PMFBY scheme.
          </p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-surface-tint transition-all hover:-translate-y-1 shadow-lg shadow-primary/20">
            Access Dashboard <ArrowRight size={20} />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-8 w-full mt-12">
          <FeatureCard 
            icon={Sprout} 
            title="Crop Health AI" 
            desc="Automated damage assessment using YOLOv11 and satellite imaging for precise claim payouts."
            color="text-primary" bg="bg-primary-container/20"
          />
          <FeatureCard 
            icon={Satellite} 
            title="Dynamic Risk Pricing" 
            desc="Continuous soil, weather, and historical yield monitoring for accurate policy quotes."
            color="text-secondary" bg="bg-secondary-container/20"
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="Blockchain Verified" 
            desc="Immutable records for policies and claims ensuring trust and instant audits."
            color="text-tertiary" bg="bg-tertiary-container/20"
          />
        </div>
      </main>
      
      <footer className="py-8 text-center text-on-surface-variant text-sm border-t border-outline-variant bg-surface">
        <p>&copy; 2026 AgriShield (Smart VIT Hackathon 2026). All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, color, bg }: any) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-8 rounded-2xl flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-16 h-16 rounded-2xl ${bg} ${color} flex items-center justify-center mb-6`}>
        <Icon size={32} />
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-on-surface-variant leading-relaxed">{desc}</p>
    </div>
  );
}
