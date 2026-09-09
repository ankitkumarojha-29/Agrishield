import { useState } from 'react';
import { 
  Percent, 
  Cpu, 
  Sliders, 
  Smartphone
} from 'lucide-react';

export default function Revenue() {
  // Simple Forecaster State
  const [enrolledFarmers, setEnrolledFarmers] = useState<number>(500000); // 5 Lakh farmers
  const [claimRate, setClaimRate] = useState<number>(10); // 10% claim frequency
  const platformFeePct = 1.75; // 1.75% platform fee
  const claimFee = 180; // ₹180 per claim

  // Unit Economics constants based on official PMFBY data
  const avgFarmHa = 1.4; // Average farm area: 1.4 hectares
  const avgGrossPremiumPerHa = 5800; // Actuarial PMFBY gross premium per hectare: ₹5,800

  // Calculations
  const totalHectares = enrolledFarmers * avgFarmHa;
  const grossPremiumPool = totalHectares * avgGrossPremiumPerHa; // Gross Written Premium
  
  // Stream 1: Platform Fee (on insurance policy purchase)
  const platformFeeRevenue = grossPremiumPool * (platformFeePct / 100);

  // Stream 2: Claim Verification Fee (when claim is filed & verified by AI)
  const totalClaims = Math.round(enrolledFarmers * (claimRate / 100));
  const claimVerificationRevenue = totalClaims * claimFee;

  // Total Revenue
  const totalAnnualRevenue = platformFeeRevenue + claimVerificationRevenue;

  // Insurer manual savings (manual surveyor costs ₹1,500+ vs our ₹180)
  const insurerSurveySavings = totalClaims * (1500 - claimFee);

  const formatINR = (val: number) => {
    if (val >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    } else if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} Lakh`;
    }
    return `₹${Math.round(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="flex-1 p-8 max-w-[1300px] mx-auto w-full">
      {/* Page Title */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-2">
          <span>AgriShield Business Model</span>
        </div>
        <h2 className="text-3xl font-bold text-on-background">Platform Revenue & Unit Economics</h2>
        <p className="text-base text-on-surface-variant mt-1">
          Simple, transparent 2-stream monetization: <strong>Platform Fee</strong> on policy purchases + <strong>Claim Verification Fee</strong> on filed claims.
        </p>
      </div>

      {/* Synchronized App Experience Banner */}
      <div className="bg-surface-container-lowest border border-primary/30 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <h4 className="font-bold text-on-surface text-base">Reflected Directly in Farmer Mobile App</h4>
            <p className="text-sm text-on-surface-variant">
              Farmers see these exact two fee line-items in real-time when <strong>buying insurance</strong> (Platform Fee: 1.75%) and <strong>filing a claim</strong> (AI Verification Fee: ₹180). Both fees are covered by empanelled insurers under PMFBY.
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <span className="px-3 py-1.5 bg-primary/10 text-primary font-bold text-xs rounded-lg">Policy Purchase: 1.75%</span>
          <span className="px-3 py-1.5 bg-secondary-container/40 text-secondary font-bold text-xs rounded-lg">Claim Filing: ₹180</span>
        </div>
      </div>

      {/* The Two Revenue Streams */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Stream 1: Platform Fee */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full flex items-center gap-1">
              <Percent size={13} /> Fee Stream 1
            </span>
            <span className="text-xl font-extrabold text-primary">{platformFeePct}%</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Platform Fee (Policy Purchase)</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            Billed directly to empanelled general insurers for every PMFBY crop policy underwritten via AgriShield. Covers automated satellite land validation, PostGIS boundary risk assessment, and smart contract audit.
          </p>

          <div className="bg-surface p-4 rounded-xl border border-outline-variant space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Average PMFBY Actuarial Premium:</span>
              <span className="font-bold text-on-surface">₹5,800 / Hectare</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">AgriShield Platform Fee (1.75%):</span>
              <span className="font-bold text-primary">₹101.50 / Hectare</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant pt-2">
              <span className="text-on-surface-variant">Farmer Out-of-Pocket Cost:</span>
              <span className="font-bold text-emerald-600">₹0 (Covered via Scheme)</span>
            </div>
          </div>
        </div>

        {/* Stream 2: Claim Verification Fee */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-secondary-container/30 text-secondary font-bold text-xs rounded-full flex items-center gap-1">
              <Cpu size={13} /> Fee Stream 2
            </span>
            <span className="text-xl font-extrabold text-secondary">₹{claimFee} / Claim</span>
          </div>
          <h3 className="text-xl font-bold text-on-surface mb-2">Claim Verification Fee (Loss Assessment)</h3>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            Charged to insurers when a farmer files a damage claim. Replaces manual surveyor dispatch with instant Sentinel-2 NDVI spectral loss scoring + EfficientNet-B0 vision damage classification in under 72 hours.
          </p>

          <div className="bg-surface p-4 rounded-xl border border-outline-variant space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-on-surface-variant">Traditional Physical Surveyor Visit:</span>
              <span className="font-bold text-error">₹1,500 – ₹2,200 / survey</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant">AgriShield Automated AI Verification:</span>
              <span className="font-bold text-secondary">₹180 / claim</span>
            </div>
            <div className="flex justify-between border-t border-outline-variant pt-2">
              <span className="text-on-surface-variant">Insurer Cost Reduction:</span>
              <span className="font-bold text-emerald-600">88% Processing Savings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Revenue Calculator */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 lg:p-8 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Sliders size={20} className="text-primary" />
          <h3 className="text-xl font-bold text-on-surface">Live Volume & Revenue Forecaster</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-6">
          Calculate projected annual platform revenue based on real PMFBY farmer volume (India national total: ~5.5 Crore farmers).
        </p>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Sliders Column */}
          <div className="lg:col-span-6 space-y-5">
            {/* Slider 1: Farmers */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Enrolled Farmers:</span>
                <span className="text-primary font-bold">{(enrolledFarmers / 100000).toFixed(1)} Lakh ({enrolledFarmers.toLocaleString()})</span>
              </div>
              <input
                type="range"
                min={50000}
                max={3000000}
                step={50000}
                value={enrolledFarmers}
                onChange={(e) => setEnrolledFarmers(Number(e.target.value))}
                className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[11px] text-on-surface-variant mt-1">
                <span>50k (District)</span>
                <span>10 Lakh (State)</span>
                <span>30 Lakh (Multi-State)</span>
              </div>
            </div>

            {/* Slider 2: Claim Rate */}
            <div>
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Claim Rate (% of farmers filing):</span>
                <span className="text-secondary font-bold">{claimRate}% ({totalClaims.toLocaleString()} claims)</span>
              </div>
              <input
                type="range"
                min={5}
                max={25}
                step={1}
                value={claimRate}
                onChange={(e) => setClaimRate(Number(e.target.value))}
                className="w-full h-2 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-secondary"
              />
              <div className="flex justify-between text-[11px] text-on-surface-variant mt-1">
                <span>5% (Normal season)</span>
                <span>10% (National avg)</span>
                <span>25% (Drought/Flood year)</span>
              </div>
            </div>

            {/* Sliders 3 & 4: Rates */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Platform Fee Rate</label>
                <div className="p-3 bg-surface rounded-xl border border-outline-variant font-bold text-primary text-sm">
                  1.75% of Premium
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant block mb-1">Claim Verification Fee</label>
                <div className="p-3 bg-surface rounded-xl border border-outline-variant font-bold text-secondary text-sm">
                  ₹180 / Assessment
                </div>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 bg-gradient-to-br from-primary/10 via-surface to-surface border border-primary/20 p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1">
                Projected Annual Platform Revenue
              </div>
              <div className="text-4xl font-extrabold text-on-surface mb-6">
                {formatINR(totalAnnualRevenue)}
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-3 bg-surface/90 rounded-xl border border-outline-variant">
                  <span className="text-on-surface-variant">Gross Facilitated Premium Pool:</span>
                  <span className="font-bold text-on-surface">{formatINR(grossPremiumPool)}</span>
                </div>

                <div className="flex justify-between p-3 bg-surface/90 rounded-xl border border-outline-variant">
                  <span className="text-on-surface-variant">1. Platform Fees (1.75%):</span>
                  <span className="font-bold text-primary">{formatINR(platformFeeRevenue)}</span>
                </div>

                <div className="flex justify-between p-3 bg-surface/90 rounded-xl border border-outline-variant">
                  <span className="text-on-surface-variant">2. Claim Verification Fees (₹180/ea):</span>
                  <span className="font-bold text-secondary">{formatINR(claimVerificationRevenue)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
              <span>Total Insurer Field Savings:</span>
              <span className="font-bold text-emerald-600">{formatINR(insurerSurveySavings)} saved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real PMFBY National Benchmark Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h4 className="font-bold text-on-surface text-base mb-2">PMFBY National Benchmarks (Official Govt Data)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-surface rounded-xl border border-outline-variant">
            <div className="text-on-surface-variant">Annual Enrolled Farmers</div>
            <div className="text-base font-bold text-on-surface mt-1">5.52 Crore</div>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant">
            <div className="text-on-surface-variant">Total Gross Premium</div>
            <div className="text-base font-bold text-on-surface mt-1">₹31,500 Crore</div>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant">
            <div className="text-on-surface-variant">Insured Gross Area</div>
            <div className="text-base font-bold text-on-surface mt-1">52.8 Million Ha</div>
          </div>
          <div className="p-3 bg-surface rounded-xl border border-outline-variant">
            <div className="text-on-surface-variant">Avg Farmer Claim Size</div>
            <div className="text-base font-bold text-on-surface mt-1">₹28,400</div>
          </div>
        </div>
      </div>
    </div>
  );
}
