import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Sprout, Shield, Phone, Mail, Lock, ArrowRight, CheckCircle2, AlertTriangle, KeyRound, RefreshCw, X, ExternalLink } from 'lucide-react';
import { useUserRole } from '../context/RoleContext';
import { validateIndianMobile, validatePersonName, validateEmail, validatePassword } from '../utils/validators';
import { initGoogleSignIn, getGoogleClientId, type GoogleCredentialResponse } from '../utils/googleAuth';

export default function Login() {
  const navigate = useNavigate();
  const { setRole } = useUserRole();
  const [authMode, setAuthMode] = useState<'farmer' | 'admin'>('farmer');

  // Farmer state (2-step OTP flow + Google linking)
  const [farmerStep, setFarmerStep] = useState<'details' | 'otp' | 'google-linking'>('details');
  const [farmerName, setFarmerName] = useState('');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);

  // Google OAuth state
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleConfigMissing, setGoogleConfigMissing] = useState(false);
  const [linkingTicket, setLinkingTicket] = useState<string | null>(null);
  const [googleProfile, setGoogleProfile] = useState<{ name?: string; email?: string; avatar_url?: string } | null>(null);
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Admin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminStatusType, setAdminStatusType] = useState<'pending' | 'expired' | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Initialize Google Identity Services (GIS) on mount
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authMode !== 'farmer' || farmerStep !== 'details') return;

    const timer = setTimeout(() => {
      if (googleBtnContainerRef.current) {
        initGoogleSignIn(
          googleBtnContainerRef.current,
          handleGoogleCredentialResponse,
          (err) => {
            console.info("Google Identity Services notice:", err.message);
          },
          'continue_with'
        );
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [authMode, farmerStep]);

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION: GOOGLE OAUTH CREDENTIAL HANDLER
  // ──────────────────────────────────────────────────────────────────────────
  const handleGoogleCredentialResponse = async (response: GoogleCredentialResponse) => {
    setGoogleLoading(true);
    setError('');

    try {
      const res = await api.googleAuth(response.credential);

      if (res && res.success && res.data) {
        if (res.data.status === 'AUTHENTICATED' && res.data.access_token) {
          // Flow B: Existing linked farmer account found!
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('user_role', 'farmer');
          if (res.data.user?.phone) localStorage.setItem('farmer_phone', res.data.user.phone);
          if (res.data.user?.name) {
            localStorage.setItem('farmer_name', res.data.user.name);
            localStorage.setItem('user_name', res.data.user.name);
          }
          if (res.data.user?.avatar_url) {
            localStorage.setItem('user_avatar', res.data.user.avatar_url);
          }
          await setRole('farmer');
          navigate('/dashboard');
        } else if (res.data.status === 'REQUIRES_PHONE_LINKING' && res.data.linking_ticket) {
          // Flow C: First-time Google user -> request mobile number + OTP
          setLinkingTicket(res.data.linking_ticket);
          setGoogleProfile(res.data.google_profile || null);
          if (res.data.google_profile?.name) {
            setFarmerName(res.data.google_profile.name);
          }
          setFarmerStep('google-linking');
        } else {
          setError(res.error?.message || 'Google authentication response could not be processed.');
        }
      } else {
        setError(res?.error?.message || 'Google authentication failed.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Google Sign-In failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleManualGoogleClick = () => {
    const clientId = getGoogleClientId();
    if (!clientId || clientId.includes('your_google_client_id')) {
      setGoogleConfigMissing(true);
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fall back to button container click
          const btn = googleBtnContainerRef.current?.querySelector('div[role="button"]') as HTMLElement;
          if (btn) btn.click();
        }
      });
    } else {
      setError('Google Identity library is loading. Please try again in a moment.');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION: GOOGLE FIRST-TIME PHONE LINKING SUBMISSION (Flow C)
  // ──────────────────────────────────────────────────────────────────────────
  const handleGoogleLinkPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingTicket) {
      setError('Linking session expired. Please sign in with Google again.');
      setFarmerStep('details');
      return;
    }

    setLoading(true);
    setError('');

    const phoneValidation = validateIndianMobile(phone);
    if (!phoneValidation.isValid || !phoneValidation.normalized) {
      setError(phoneValidation.error || 'कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें।');
      setLoading(false);
      return;
    }

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d+$/.test(cleanOtp)) {
      setError('कृपया 6-अंकों का ओटीपी कोड दर्ज करें (Enter 6-digit OTP).');
      setLoading(false);
      return;
    }

    try {
      const res = await api.googleLinkPhone({
        linking_ticket: linkingTicket,
        phone: phoneValidation.normalized,
        otp: cleanOtp,
        name: farmerName.trim() || undefined
      });

      if (res && res.success && res.data?.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('user_role', 'farmer');
        if (res.data.user?.phone) localStorage.setItem('farmer_phone', res.data.user.phone);
        if (res.data.user?.name) {
          localStorage.setItem('farmer_name', res.data.user.name);
          localStorage.setItem('user_name', res.data.user.name);
        }
        if (res.data.user?.avatar_url) {
          localStorage.setItem('user_avatar', res.data.user.avatar_url);
        }
        await setRole('farmer');
        navigate('/dashboard');
      } else {
        setError(res?.error?.message || 'खाता जोड़ने में त्रुटि हुई (Failed to link account).');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Verification & account linking failed.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION: FARMER LOGIN FLOW (STEP 1: SEND OTP)
  // ──────────────────────────────────────────────────────────────────────────
  const handleFarmerSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Strict Name validation if in standard registration/details mode
    if (farmerStep === 'details') {
      const nameValidation = validatePersonName(farmerName, true);
      if (!nameValidation.isValid) {
        setError(nameValidation.error || 'अमान्य नाम दर्ज किया गया है (Invalid name).');
        setLoading(false);
        return;
      }
      setFarmerName(nameValidation.cleaned!);
    }

    // 2. Strict Indian Mobile validation (exactly 10 digits starting with 6,7,8,9)
    const phoneValidation = validateIndianMobile(phone);
    if (!phoneValidation.isValid || !phoneValidation.normalized) {
      setError(phoneValidation.error || 'अमान्य मोबाइल नंबर दर्ज किया गया है (Invalid mobile number).');
      setLoading(false);
      return;
    }

    const formattedPhone = phoneValidation.normalized;
    setNormalizedPhone(formattedPhone);

    try {
      const res = await api.sendOtp(formattedPhone);
      if (res && res.success) {
        if (res.data?.otp_code) {
          setDemoOtpCode(res.data.otp_code);
          setOtp(res.data.otp_code);
        }
        if (farmerStep === 'details') {
          setFarmerStep('otp');
        }
      } else {
        setError(res?.error?.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'OTP sending failed.');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // Farmer Flow: Step 2 -> Verify OTP & Enter Portal
  // ──────────────────────────────────────────────────────────────────────────
  const handleFarmerVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('कृपया 6-अंकों का ओटीपी दर्ज करें (Please enter 6-digit OTP code).');
      setLoading(false);
      return;
    }

    try {
      const res = await api.verifyOtp({
        phone: normalizedPhone,
        otp: cleanOtp,
        name: farmerName
      });

      if (res && res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('user_role', 'farmer');
        localStorage.setItem('farmer_phone', normalizedPhone);
        localStorage.setItem('farmer_name', farmerName);
        localStorage.setItem('user_name', farmerName);
        if (res.data.user?.avatar_url) {
          localStorage.setItem('user_avatar', res.data.user.avatar_url);
        }
        await setRole('farmer');
        navigate('/dashboard');
      } else {
        setError('Verification succeeded but no session token was received.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'OTP verification failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SECTION: ADMINISTRATOR LOGIN FLOW
  // ──────────────────────────────────────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAdminStatusType(null);

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setError(emailValidation.error || 'कृपया सही ईमेल पता दर्ज करें (Invalid email).');
      setLoading(false);
      return;
    }

    const passwordValidation = validatePassword(password, 6);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.error || 'पासवर्ड कम से कम 6 अक्षर लंबा होना चाहिए।');
      setLoading(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    
    try {
      const res = await api.login({ email: cleanEmail, password });
      if (res && res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('user_role', 'admin');
        localStorage.setItem('user_name', (res.data as any)?.user?.name || 'System Administrator');
        if ((res.data as any)?.user?.avatar_url) {
          localStorage.setItem('user_avatar', (res.data as any).user.avatar_url);
        }
        await setRole('admin');
        navigate('/dashboard');
      } else {
        setError('Login succeeded but session token is missing.');
      }
    } catch (err: any) {
      const resp = err.response?.data;
      const code = resp?.error?.code;
      const msg = resp?.error?.message || err.message || 'Invalid administrator credentials.';

      if (code === 'APPROVAL_EXPIRED') {
        setAdminStatusType('expired');
      } else if (code === 'FORBIDDEN' && msg.includes('pending authorization')) {
        setAdminStatusType('pending');
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Farmland Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url('/login-bg.webp')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/40 via-slate-900/50 to-slate-900/70 backdrop-blur-[1.5px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-2xl shadow-black/40">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/">
            <img 
              alt="AgriShield Logo" 
              className="h-12 w-auto mx-auto mb-3 object-contain" 
              src="/logo-trimmed.webp" 
              width={180}
              height={48}
              decoding="async"
              fetchPriority="high"
            />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">AgriShield Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">PMFBY Crop Intelligence &amp; Agronomic Governance</p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('farmer'); setError(''); setAdminStatusType(null); setFarmerStep('details'); }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'farmer' 
                ? 'bg-white text-emerald-800 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sprout size={15} className={authMode === 'farmer' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Farmer Portal</span>
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode('admin'); setError(''); setAdminStatusType(null); }}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'admin' 
                ? 'bg-white text-slate-900 shadow-xs font-bold' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield size={15} className={authMode === 'admin' ? 'text-sky-600' : 'text-slate-400'} />
            <span>Admin Console</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 text-xs text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-200 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            {adminStatusType === 'expired' && (
              <div className="pt-2 border-t border-red-200">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1 font-bold text-red-800 underline hover:text-red-900"
                >
                  <span>Re-apply for Admin Approval Now &rarr;</span>
                </Link>
              </div>
            )}
            {adminStatusType === 'pending' && (
              <p className="text-[11px] text-red-600/90 italic">
                Note: An existing system administrator must approve your application from their Admin Approvals console within 7 days.
              </p>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            FARMER LOGIN: GOOGLE OAUTH + FREE 2-STEP OTP FLOW
           ═══════════════════════════════════════════════════════════════════ */}
        {authMode === 'farmer' && (
          <>
            {/* ─────────────────────────────────────────────────────────────
                STEP 1: NORMAL LOGIN (Google Button + Mobile OTP Inputs)
               ───────────────────────────────────────────────────────────── */}
            {farmerStep === 'details' && (
              <div className="space-y-4">
                {/* Real Google OAuth Button */}
                <div className="relative w-full">
                  {/* Invisible GIS layer for official Google OAuth pop-up */}
                  <div 
                    ref={googleBtnContainerRef} 
                    className="absolute inset-0 opacity-0 overflow-hidden cursor-pointer z-10 flex items-center justify-center [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" 
                  />
                  
                  {/* Visual Button: The clean, preferred Google button format */}
                  <button
                    type="button"
                    onClick={handleManualGoogleClick}
                    disabled={googleLoading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold py-2.5 px-4 rounded-xl text-xs md:text-sm shadow-xs transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google (गूगल से लॉगिन करें)'}</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-[11px]">
                    <span className="bg-white px-3 text-slate-400 font-medium">या मोबाइल नंबर द्वारा (Or via Mobile OTP)</span>
                  </div>
                </div>

                {/* Mobile Phone Registration & OTP Form */}
                <form onSubmit={handleFarmerSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Farmer Name / किसान का नाम
                    </label>
                    <input 
                      required
                      type="text" 
                      placeholder="उदा. अंकित कुमार / Ankit Kumar"
                      value={farmerName}
                      onChange={(e) => setFarmerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mobile Phone Number / मोबाइल नंबर
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required 
                        type="tel" 
                        placeholder="+91 98765 43210 या 10-अंकों का नंबर"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {loading ? (
                      <span>Sending OTP...</span>
                    ) : (
                      <>
                        <span>Send OTP (ओटीपी भेजें)</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 2: OTP VERIFICATION SCREEN (For Standard Mobile Flow)
               ───────────────────────────────────────────────────────────── */}
            {farmerStep === 'otp' && (
              <form onSubmit={handleFarmerVerifyOtp} className="space-y-4 animate-in fade-in duration-200">
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-emerald-800 font-semibold block">
                      कोड भेजा गया (Code sent to):
                    </span>
                    <strong className="text-emerald-950 font-mono">{normalizedPhone}</strong>
                    <span className="text-slate-500 block text-[10px]">({farmerName})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFarmerStep('details'); setError(''); }}
                    className="text-[11px] text-emerald-700 hover:underline font-bold"
                  >
                    बदलें (Change)
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs shadow-sm flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
                      <span>🔐 सत्यापन कोड (OTP Code):</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <strong className="font-mono text-xl tracking-widest text-amber-950 bg-white/90 px-2.5 py-0.5 rounded-lg border border-amber-200 shadow-xs">
                        {demoOtpCode || "123456"}
                      </strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(demoOtpCode || "123456")}
                    className="text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 active:scale-95 px-3 py-1.5 rounded-xl border border-amber-400 transition-all shadow-xs"
                  >
                    Auto-Fill ✨
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter 6-Digit OTP / ओटीपी दर्ज करें
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required 
                      type="text" 
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>कोड प्राप्त नहीं हुआ?</span>
                  <button
                    type="button"
                    onClick={() => handleFarmerSendOtp()}
                    className="text-emerald-700 hover:underline font-semibold flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    <span>ओटीपी पुनः भेजें (Resend)</span>
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition-all shadow-md shadow-emerald-700/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (
                    <span>Verifying OTP...</span>
                  ) : (
                    <>
                      <span>Verify &amp; Enter Portal (प्रवेश करें)</span>
                      <CheckCircle2 size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ─────────────────────────────────────────────────────────────
                STEP 3: FIRST-TIME GOOGLE USER PHONE LINKING (Flow C)
               ───────────────────────────────────────────────────────────── */}
            {farmerStep === 'google-linking' && (
              <form onSubmit={handleGoogleLinkPhoneSubmit} className="space-y-4 animate-in fade-in duration-200">
                {/* Google Identity Verified Banner */}
                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl flex items-center gap-3">
                  {googleProfile?.avatar_url ? (
                    <img src={googleProfile.avatar_url} alt="Google Avatar" className="w-10 h-10 rounded-full border border-sky-300 object-cover" width={40} height={40} decoding="async" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-200 text-sky-800 font-bold flex items-center justify-center text-sm">
                      {googleProfile?.name?.[0] || 'G'}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <span className="text-[10px] text-sky-700 font-bold uppercase tracking-wider block">✓ Google खाता सत्यापित</span>
                    <strong className="text-xs text-sky-950 block truncate">{googleProfile?.name || 'Farmer'}</strong>
                    <span className="text-[11px] text-sky-800/80 truncate block">{googleProfile?.email}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                  <strong>मौजूदा खेत जोड़ने के लिए:</strong> अपना 10-अंकों का मोबाइल नंबर दर्ज करें। यदि आपका पहले से खाता है, तो आपके पुराने सभी खेत अपने आप इस Google लॉगिन से जुड़ जाएंगे।
                </div>

                {/* Farmer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Farmer Name / किसान का नाम
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="उदा. रमेश कुमार / Ramesh Kumar"
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Mobile Phone + Send OTP button */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Phone Number / मोबाइल नंबर
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        required 
                        type="tel" 
                        placeholder="+91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFarmerSendOtp()}
                      disabled={loading || !phone}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 shrink-0"
                    >
                      {loading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* Demo OTP Banner if generated */}
                {demoOtpCode && (
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 text-xs shadow-sm flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-amber-800 font-bold block">🔐 सत्यापन कोड (OTP Code):</span>
                      <strong className="font-mono text-lg tracking-widest text-amber-950">{demoOtpCode}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtp(demoOtpCode)}
                      className="text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-lg border border-amber-400"
                    >
                      Auto-Fill ✨
                    </button>
                  </div>
                )}

                {/* OTP Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Enter OTP / ओटीपी दर्ज करें
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      required 
                      type="text" 
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-center font-mono text-base tracking-[0.4em] text-slate-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Buttons: Submit & Cancel */}
                <div className="space-y-2 pt-2">
                  <button 
                    type="submit" 
                    disabled={loading || !otp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span>Connecting Accounts...</span>
                    ) : (
                      <>
                        <span>Link Account &amp; Enter Portal (खाता जोड़ें)</span>
                        <CheckCircle2 size={15} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFarmerStep('details'); setError(''); }}
                    className="w-full text-xs text-slate-500 hover:text-slate-800 py-2 font-semibold"
                  >
                    रद्द करें (Cancel)
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            ADMIN LOGIN FORM
           ═══════════════════════════════════════════════════════════════════ */}
        {authMode === 'admin' && (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  required 
                  type="email" 
                  placeholder="admin@agrishield.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  required 
                  type="password" 
                  placeholder="पासवर्ड दर्ज करें (Password)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Request Admin Access Link */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center text-xs">
              <span className="text-slate-600 block mb-1">व्यवस्थापक बनना चाहते हैं? (Need administrator access?)</span>
              <Link 
                to="/register" 
                className="inline-flex items-center gap-1 text-sky-700 font-bold hover:underline"
              >
                <span>अनुमोदन हेतु आवेदन करें (Request Approval to Become Admin) &rarr;</span>
              </Link>
            </div>
          </form>
        )}

        <div className="text-center mt-6 pt-4 border-t border-slate-100">
          <Link to="/" className="text-xs text-slate-500 hover:text-emerald-700 font-medium hover:underline">
            &larr; Back to Landing Page
          </Link>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HELPFUL MODAL: GOOGLE OAUTH CLIENT ID CONFIGURATION GUIDE
         ───────────────────────────────────────────────────────────── */}
      {googleConfigMissing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <Shield size={18} />
                <span>Google OAuth सेटअप (100% Free)</span>
              </div>
              <button
                type="button"
                onClick={() => setGoogleConfigMissing(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Google साइन-इन पूरी तरह से <strong>मुफ़्त (₹0)</strong> है और इसके लिए किसी क्रेडिट कार्ड की आवश्यकता नहीं होती है।
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 font-mono text-[11px] text-slate-800">
                <div className="font-sans font-bold text-slate-900">त्वरित 3 चरण (2 मिनट):</div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] font-sans">
                  <li><strong>Google Cloud Console</strong> पर जाएं व नया मुफ़्त प्रोजेक्ट बनाएं।</li>
                  <li><strong>OAuth Client ID</strong> (Web Application) बनाएं व Authorized Origin में <code>http://localhost:5173</code> जोड़ें।</li>
                  <li>प्राप्त Client ID को <code>web/.env</code> में <code>VITE_GOOGLE_CLIENT_ID</code> के रूप में पेस्ट करें।</li>
                </ol>
              </div>
              <p className="text-slate-500 text-[11px]">
                💡 तब तक, आप अपने <strong>मोबाइल नंबर व OTP</strong> से तुरंत लॉगिन कर सकते हैं!
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs text-center flex items-center justify-center gap-1.5"
              >
                <span>Open Google Console</span>
                <ExternalLink size={13} />
              </a>
              <button
                type="button"
                onClick={() => setGoogleConfigMissing(false)}
                className="px-4 py-2.5 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
