import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { Sprout, Shield, Phone, Mail, Lock, ArrowRight, CheckCircle2, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import { useUserRole } from '../context/RoleContext';

export default function Login() {
  const navigate = useNavigate();
  const { setRole } = useUserRole();
  const [authMode, setAuthMode] = useState<'farmer' | 'admin'>('farmer');

  // Farmer state (2-step OTP flow)
  const [farmerStep, setFarmerStep] = useState<'details' | 'otp'>('details');
  const [farmerName, setFarmerName] = useState('');
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState<string | null>(null);

  // Admin state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminStatusType, setAdminStatusType] = useState<'pending' | 'expired' | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Farmer Flow: Step 1 -> Send OTP
  // ──────────────────────────────────────────────────────────────────────────
  const handleFarmerSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const rawPhone = phone.trim();
    if (!rawPhone) {
      setError('कृपया मोबाइल नंबर दर्ज करें (Please enter mobile phone number).');
      setLoading(false);
      return;
    }

    const cleanDigits = rawPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setError('कृपया सही 10-अंकों का मोबाइल नंबर दर्ज करें (Please enter valid 10-digit phone number).');
      setLoading(false);
      return;
    }

    const cleanName = farmerName.trim() || `Farmer ${cleanDigits.slice(-4)}`;
    const formattedPhone = rawPhone.startsWith('+')
      ? rawPhone
      : `+91${cleanDigits.slice(-10)}`;

    setNormalizedPhone(formattedPhone);
    setFarmerName(cleanName);

    try {
      const res = await api.sendOtp(formattedPhone);
      if (res && res.success) {
        if (res.data?.otp_code) {
          setDemoOtpCode(res.data.otp_code);
          // Autofill for convenience while still allowing manual edits
          setOtp(res.data.otp_code);
        }
        setFarmerStep('otp');
      } else {
        setError(res.error?.message || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      console.warn("Using simulated OTP send:", err);
      setDemoOtpCode("123456");
      setOtp("123456");
      setFarmerStep('otp');
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
  // Admin Login Flow
  // ──────────────────────────────────────────────────────────────────────────
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAdminStatusType(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError('कृपया ईमेल और पासवर्ड दोनों दर्ज करें (Please enter email and password).');
      setLoading(false);
      return;
    }
    
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
        setError('Login succeeded but no session token was received.');
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const errMsg = err.response?.data?.error?.message || err.response?.data?.detail || err.message;

      if (errCode === 'ADMIN_REQUEST_EXPIRED') {
        setAdminStatusType('expired');
        setError(errMsg);
      } else if (errCode === 'ADMIN_PENDING_APPROVAL') {
        setAdminStatusType('pending');
        setError(errMsg);
      } else {
        setError(errMsg || 'Admin login failed. Please verify credentials.');
      }
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
            <img alt="AgriShield Logo" className="h-12 w-auto mx-auto mb-3 object-contain" src="/logo-trimmed.webp" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">AgriShield Portal</h1>
          <p className="text-xs text-slate-500 mt-0.5">PMFBY Crop Intelligence &amp; Agronomic Governance</p>
        </div>

        {/* Dual Mode Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl mb-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setAuthMode('farmer'); setError(''); setAdminStatusType(null); }}
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
          <div className="mb-4 text-xs text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-200 space-y-2">
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
            FARMER LOGIN: 2-STEP OTP FLOW
           ═══════════════════════════════════════════════════════════════════ */}
        {authMode === 'farmer' && (
          <>
            {farmerStep === 'details' ? (
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
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    सुरक्षित OTP सत्यापन के लिए मोबाइल नंबर अनिवार्य है।
                  </span>
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
            ) : (
              /* Step 2: OTP Verification Screen */
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

                {demoOtpCode && (
                  <div className="p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-[11px] flex items-center justify-between">
                    <span>🔐 सुरक्षा सत्यापन कोड (OTP): <strong className="font-mono text-sm tracking-widest">{demoOtpCode}</strong></span>
                    <span className="text-[10px] text-sky-700 bg-white px-2 py-0.5 rounded border">SMS Dispatch</span>
                  </div>
                )}

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
                    onClick={handleFarmerSendOtp}
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
    </div>
  );
}
