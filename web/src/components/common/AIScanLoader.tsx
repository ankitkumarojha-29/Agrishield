import { useState, useEffect } from 'react';
import { ScanLine, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface AIScanLoaderProps {
  title?: string;
  subtitle?: string;
  mode?: 'crop' | 'soil' | 'yield';
}

export function AIScanLoader({
  title = 'AI Analysis in Progress',
  subtitle = 'Processing telemetry & running neural network diagnostics...',
  mode = 'crop'
}: AIScanLoaderProps) {
  const [activeStep, setActiveStep] = useState<number>(1);

  // Stepped progression to give reassuring, dynamic feedback
  useEffect(() => {
    const t1 = setTimeout(() => setActiveStep(2), 1200);
    const t2 = setTimeout(() => setActiveStep(3), 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const stepsByMode = {
    crop: [
      { id: 1, label: 'Uploading & Preprocessing Leaf Foliage', desc: 'Validating resolution and leaf color boundaries' },
      { id: 2, label: 'EfficientNet-B0 Pathology Inference', desc: 'Scanning for fungal, bacterial, or pest lesions' },
      { id: 3, label: 'Generating PMFBY Treatment Advisory', desc: 'Calculating diagnostic confidence & curative dosage' },
    ],
    soil: [
      { id: 1, label: 'Ingesting Soil Health Document', desc: 'Applying optical preprocessing & noise reduction' },
      { id: 2, label: 'Multi-Modal OCR Field Extraction', desc: 'Parsing N, P, K, pH and organic carbon metrics' },
      { id: 3, label: 'Synthesizing Fertilizer Recommendations', desc: 'Cross-referencing ICAR soil fertility benchmarks' },
    ],
    yield: [
      { id: 1, label: 'Collating Farm Geospatial Boundaries', desc: 'Extracting Sentinel-2 NDVI & local soil conditions' },
      { id: 2, label: 'Agro-Meteorological Forecast Fusion', desc: 'Modeling 7-day precipitation & thermal accumulation' },
      { id: 3, label: 'Forecasting Harvest Yield (kg/ha)', desc: 'Simulating revenue benchmarks with APMC Mandi rates' },
    ],
  };

  const steps = stepsByMode[mode] || stepsByMode.crop;

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden border border-emerald-500/30">
      {/* Background glowing ambient light */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800 relative z-10">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 relative shrink-0">
            <ScanLine size={18} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span>{title}</span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                PyTorch Port 8001
              </span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-snug">{subtitle}</p>
          </div>
        </div>

        <div className="self-start sm:self-auto flex items-center gap-1.5 text-[11px] sm:text-xs text-emerald-400 font-semibold bg-emerald-950/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg border border-emerald-500/20">
          <Sparkles size={13} className="animate-spin text-emerald-400" />
          <span>Active</span>
        </div>
      </div>

      {/* Animated Pipeline Steps */}
      <div className="space-y-3.5 my-5 relative z-10">
        {steps.map((step) => {
          const isDone = activeStep > step.id;
          const isCurrent = activeStep === step.id;

          return (
            <div
              key={step.id}
              className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                isCurrent
                  ? 'bg-slate-800/90 border border-emerald-500/50 shadow-inner'
                  : isDone
                  ? 'bg-slate-900/40 border border-slate-800'
                  : 'opacity-40 border border-transparent'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : isCurrent ? (
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500">
                    {step.id}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${isCurrent ? 'text-emerald-300' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                  {step.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Footer */}
      <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 relative z-10">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span className="text-[11px]">PMFBY Validated Inference</span>
        </div>
        <div className="text-[11px] text-emerald-400 font-mono font-medium">
          {activeStep === 1 ? '33% • Ingestion' : activeStep === 2 ? '68% • Neural Pass' : '94% • Synthesis'}
        </div>
      </div>
    </div>
  );
}

/**
 * Laser scanline overlay that sits directly on top of the preview image
 */
export function LaserScanOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-20">
      {/* Dark high-tech vignette overlay */}
      <div className="absolute inset-0 bg-emerald-950/20 backdrop-contrast-125" />
      {/* Moving laser scan beam */}
      <div className="animate-laser-scan" />
      {/* Corner targeting reticles */}
      <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-400" />
      <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-400" />
      <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-400" />
      <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-400" />
    </div>
  );
}

