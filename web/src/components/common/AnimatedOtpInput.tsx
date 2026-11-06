import React, { useRef, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw } from 'lucide-react';

interface AnimatedOtpInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  isVerifying?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function AnimatedOtpInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  isVerifying = false,
  hasError = false,
  autoFocus = true,
}: AnimatedOtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [animatingIndices, setAnimatingIndices] = useState<number[]>([]);
  const previousValueRef = useRef<string>(value);

  // Normalize string to target length
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  // Detect auto-fill or bulk paste and trigger staggered wave pop
  useEffect(() => {
    const prev = previousValueRef.current;
    previousValueRef.current = value;

    if (value.length === length && prev.length < 2) {
      // Trigger staggered wave animation across slots
      digits.forEach((_, idx) => {
        setTimeout(() => {
          setAnimatingIndices((curr) => [...curr, idx]);
          setTimeout(() => {
            setAnimatingIndices((curr) => curr.filter((i) => i !== idx));
          }, 300);
        }, idx * 55);
      });

      if (onComplete) {
        onComplete(value);
      }
    }
  }, [value, length, onComplete]);

  // Initial auto-focus
  useEffect(() => {
    if (autoFocus && inputRefs.current[0] && !disabled) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isVerifying) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) {
        // Clear current slot
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      } else if (index > 0) {
        // Clear previous slot and move focus back
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isVerifying) return;

    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      onChange(newDigits.join(''));
      return;
    }

    // Single digit input
    const char = rawVal[rawVal.length - 1];
    const newDigits = [...digits];
    newDigits[index] = char;
    const combined = newDigits.join('');
    onChange(combined);

    // Pop animation on this slot
    setAnimatingIndices((curr) => [...curr, index]);
    setTimeout(() => {
      setAnimatingIndices((curr) => curr.filter((i) => i !== index));
    }, 250);

    // Auto advance to next slot
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    } else if (combined.length === length && onComplete) {
      onComplete(combined);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled || isVerifying) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (!pasted) return;

    onChange(pasted);
    const targetIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[targetIdx]?.focus();
    setFocusedIndex(targetIdx);

    if (pasted.length === length && onComplete) {
      onComplete(pasted);
    }
  };

  return (
    <div className="space-y-3">
      {/* 6-Slot Segmented Grid with Divider */}
      <div
        className={`flex items-center justify-center gap-2 sm:gap-2.5 ${
          hasError ? 'animate-shake' : ''
        }`}
      >
        {digits.map((digit, idx) => {
          const isFocused = focusedIndex === idx && !disabled && !isVerifying;
          const isFilled = Boolean(digit);
          const isPopping = animatingIndices.includes(idx);

          return (
            <React.Fragment key={idx}>
              {/* Mid-point visual hyphen divider for 3-3 grouping */}
              {idx === 3 && (
                <div className="w-2 sm:w-3 h-0.5 bg-slate-300 rounded-full mx-0.5" />
              )}

              <div
                onClick={() => {
                  if (!disabled && !isVerifying) {
                    inputRefs.current[idx]?.focus();
                    setFocusedIndex(idx);
                  }
                }}
                className={`relative w-11 h-13 sm:w-12 sm:h-14 rounded-2xl flex items-center justify-center text-center font-mono text-xl sm:text-2xl font-black transition-all duration-200 cursor-text select-none ${
                  hasError
                    ? 'border-2 border-red-400 bg-red-50/50 text-red-700 ring-2 ring-red-400/20'
                    : isVerifying
                    ? 'border-2 border-emerald-400 bg-emerald-50/30 text-emerald-800'
                    : isFocused
                    ? 'border-2 border-emerald-500 bg-white text-slate-900 ring-3 ring-emerald-500/20 shadow-md shadow-emerald-500/10 scale-105'
                    : isFilled
                    ? 'border border-emerald-200/90 bg-emerald-50/20 text-slate-900 shadow-2xs'
                    : 'border border-slate-200/90 bg-slate-50/80 text-slate-400 hover:border-slate-300'
                } ${isPopping ? 'animate-pop-in' : ''}`}
              >
                {/* Digit Display */}
                {digit ? (
                  <span className="block transform transition-transform duration-100">
                    {digit}
                  </span>
                ) : isFocused ? (
                  <span className="w-0.5 h-6 bg-emerald-600 rounded-full animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                )}

                {/* Hidden Overlay Input */}
                <input
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={disabled || isVerifying}
                  onChange={(e) => handleChange(idx, e)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  onFocus={() => setFocusedIndex(idx)}
                  className="absolute inset-0 opacity-0 cursor-text w-full h-full text-center"
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Verifying Micro-Telemetry Banner */}
      {isVerifying && (
        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/80 py-2 px-3 rounded-xl animate-in fade-in duration-200">
          <div className="relative flex items-center justify-center">
            <ShieldCheck size={16} className="text-emerald-600 relative z-10" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-400 animate-ping opacity-75" />
          </div>
          <span>PMFBY Secure OTP Verification in progress...</span>
        </div>
      )}
    </div>
  );
}

/**
 * Modern circular SVG radial countdown timer for resending OTP
 */
interface OtpCountdownTimerProps {
  initialSeconds?: number;
  onResend: () => void;
  isLoading?: boolean;
}

export function OtpCountdownTimer({
  initialSeconds = 30,
  onResend,
  isLoading = false,
}: OtpCountdownTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft]);

  const handleResendClick = () => {
    if (secondsLeft > 0 || isLoading) return;
    setSecondsLeft(initialSeconds);
    onResend();
  };

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (secondsLeft / initialSeconds) * circumference;

  return (
    <div className="flex items-center justify-between text-xs pt-1">
      <span className="text-slate-500 text-[11px]">कोड प्राप्त नहीं हुआ? (Didn't receive code?)</span>

      {secondsLeft > 0 ? (
        <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px] bg-slate-100/90 px-2.5 py-1 rounded-lg">
          <svg className="w-4 h-4 transform -rotate-90">
            <circle
              cx="8"
              cy="8"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              className="text-slate-200"
            />
            <circle
              cx="8"
              cy="8"
              r={radius}
              stroke="currentColor"
              strokeWidth="2"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              className="text-emerald-600 transition-all duration-1000 ease-linear"
            />
          </svg>
          <span>पुनः भेजें {secondsLeft}s</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleResendClick}
          disabled={isLoading}
          className="text-emerald-700 hover:text-emerald-800 hover:underline font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          <span>ओटीपी पुनः भेजें (Resend OTP)</span>
        </button>
      )}
    </div>
  );
}
