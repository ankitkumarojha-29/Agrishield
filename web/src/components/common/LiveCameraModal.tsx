import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, SwitchCamera, RotateCcw, Check, X, AlertTriangle, Scan } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File, previewUrl: string) => void;
  onFallbackToFile: () => void;
}

export function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFile,
}: LiveCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopStream();
    setIsInitializing(true);
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('आपका ब्राउज़र या डिवाइस लाइव कैमरा को सपोर्ट नहीं करता। (Camera API not supported).');
      setIsInitializing(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsInitializing(false);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('कैमरा की अनुमति अस्वीकृत है। कृपया ब्राउज़र सेटिंग्स में कैमरा की अनुमति दें। (Camera permission denied).');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('कोई चालू कैमरा नहीं मिला। कृपया गैलरी या फ़ाइल से फोटो अपलोड करें। (No camera device found).');
      } else {
        setCameraError('कैमरा शुरू करने में समस्या आई। आप गैलरी से फोटो चुन सकते हैं।');
      }
      setIsInitializing(false);
    }
  }, [facingMode, stopStream]);

  useEffect(() => {
    if (isOpen) {
      setCapturedBlob(null);
      setCapturedPreview(null);
      startCamera();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [isOpen, startCamera, stopStream]);

  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flash animation
    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 160);

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const preview = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedPreview(preview);
        }
      },
      'image/jpeg',
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedBlob(null);
    setCapturedPreview(null);
    startCamera();
  };

  const handleConfirmPhoto = () => {
    if (!capturedBlob) return;

    const file = new File(
      [capturedBlob],
      `crop-leaf-${Date.now()}.jpg`,
      { type: 'image/jpeg' }
    );

    stopStream();
    onCapture(file, capturedPreview || '');
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
        {/* Shutter White Flash Effect */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-out fade-out duration-150" />
        )}

        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-slate-900/95 border-b border-slate-800 z-20 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Camera size={16} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                <span>लाइव पत्ती कैमरा (Live Camera)</span>
                <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">रोगी पत्ती को केंद्र में रखकर फोटो लें</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {!capturedPreview && !cameraError && (
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="कैमरा बदलें (Switch Camera)"
              >
                <SwitchCamera size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="बंद करें (Close)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Camera Viewport / Frame */}
        <div className="relative w-full max-h-[58vh] sm:max-h-[65vh] aspect-4/3 sm:aspect-16/10 bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center max-w-md mx-auto space-y-3 z-10">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <p className="text-xs text-amber-200 leading-relaxed font-medium">
                {cameraError}
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    stopStream();
                    onClose();
                    onFallbackToFile();
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  📁 गैलरी / फ़ाइल से चुनें (Open Gallery)
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  पुनः प्रयास करें (Retry)
                </button>
              </div>
            </div>
          ) : capturedPreview ? (
            /* Review Captured Frame */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedPreview}
                alt="Captured Leaf"
                className="w-full h-full object-contain"
              />
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold text-emerald-400 border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                <Check size={13} />
                <span>फोटो कैप्चर हो गई (Captured)</span>
              </div>
            </div>
          ) : (
            /* Live Video Stream Viewfinder */
            <>
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Framing Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-3/4 sm:w-2/3 aspect-square max-w-[280px] max-h-[280px] border-2 border-emerald-400/60 rounded-3xl shadow-inner">
                  {/* High-tech Corner Brackets */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-xl" />

                  {/* Center Crosshair Target */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Scan size={32} className="text-emerald-400/40 animate-pulse" />
                  </div>

                  <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                    पत्ती को बॉक्स में रखें (Align Leaf Here)
                  </span>
                </div>
              </div>

              {isInitializing && (
                <div className="absolute inset-0 bg-slate-950/70 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-300">कैमरा शुरू हो रहा है...</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Shutter & Action Bar */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0">
          {capturedPreview ? (
            /* Confirm or Retake Bar */
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <RotateCcw size={15} />
                <span>दोबारा खींचें (Retake)</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-600/30"
              >
                <Check size={16} />
                <span>यह फोटो चुनें (Use This Photo)</span>
              </button>
            </div>
          ) : (
            /* Live Shutter Button */
            <div className="w-full flex items-center justify-center relative">
              <button
                type="button"
                onClick={handleCapture}
                disabled={isInitializing || Boolean(cameraError)}
                className="relative group p-1.5 rounded-full border-4 border-emerald-500/80 hover:border-emerald-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="फोटो खींचें (Snap Photo)"
              >
                <div className="w-14 h-14 rounded-full bg-white group-hover:scale-95 group-active:scale-90 transition-transform flex items-center justify-center shadow-lg">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-300 flex items-center justify-center">
                    <Camera size={22} className="text-slate-800" />
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

