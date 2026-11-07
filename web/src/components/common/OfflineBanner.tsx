import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * OfflineBanner
 * Non-intrusive floating status indicator for rural & field connectivity.
 * Shows when network drops, and provides reassurance when internet restores.
 */
export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9990] pointer-events-none animate-in slide-in-from-bottom-2 duration-300">
      {!isOnline ? (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 backdrop-blur-md text-amber-300 text-xs font-semibold shadow-xl border border-amber-500/30">
          <WifiOff size={15} className="text-amber-400 animate-pulse shrink-0" />
          <span>📶 आप ऑफ़लाइन हैं (Offline mode) &bull; कैश्ड डेटा दिखाया जा रहा है</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-950/90 backdrop-blur-md text-emerald-300 text-xs font-semibold shadow-xl border border-emerald-500/30">
          <Wifi size={15} className="text-emerald-400 shrink-0" />
          <span>✓ वापस ऑनलाइन आ गए (Connected &bull; Synchronized)</span>
        </div>
      )}
    </div>
  );
};

export default OfflineBanner;

