import React, { useEffect, useState } from 'react';

/**
 * RouteProgressBar
 * Sleek, zero-dependency top progress bar for React.lazy route chunk transitions.
 * Appears across the top of the viewport when moving between split routes.
 */
export const RouteProgressBar: React.FC = () => {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    // Incrementally advance simulated progress
    const timer1 = setTimeout(() => setProgress(45), 80);
    const timer2 = setTimeout(() => setProgress(75), 250);
    const timer3 = setTimeout(() => setProgress(90), 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      {/* Top glowing progress line */}
      <div 
        className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
      {/* Subtle glowing trailing bead */}
      <div 
        className="absolute top-0 w-24 h-1 bg-white/40 blur-[2px] transition-all duration-300 ease-out"
        style={{ left: `calc(${progress}% - 96px)` }}
      />
    </div>
  );
};

export default RouteProgressBar;
