import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { ShieldCheck, Mail, Lock, User, Clock, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.register({ email: email.trim(), name: name.trim(), password });
      
      if (res && res.data) {
        setSubmitted(true);
        setSuccessMessage(
          res.data.message || 
          'Your administrator registration has been submitted. An existing active administrator must authorize your account within 7 days (1 week). If not approved within 7 days, it will be automatically cancelled and cleaned from the database.'
        );
      } else {
        setError('Submission failed. Please verify your details.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Registration request failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('/login-bg.webp')` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900/50 via-slate-900/60 to-slate-900/75 backdrop-blur-[2px] pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 p-8 rounded-3xl shadow-2xl shadow-black/40">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/">
            <img alt="AgriShield Logo" className="h-12 w-auto mx-auto mb-3 object-contain" src="/logo-trimmed.webp" />
          </Link>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold mb-2">
            <ShieldCheck size={14} className="text-sky-600" />
            <span>Administrator Access Request</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">व्यवस्थापक बनने हेतु आवेदन</h1>
          <p className="text-xs text-slate-500 mt-1">Apply for an administrator account on AgriShield</p>
        </div>

        {submitted ? (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>अनुरोध दर्ज हुआ (Request Submitted)</span>
              </div>
              <p className="leading-relaxed text-emerald-900/90">{successMessage}</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Clock size={15} className="text-amber-600 shrink-0" />
                <span>1-सप्ताह स्वतः रद्दीकरण नियम (7-Day TTL Policy):</span>
              </div>
              <p className="leading-relaxed text-amber-900/80">
                If an existing system administrator does not approve your application within <strong>7 days</strong>, 
                it will be automatically cancelled and purged from the database. You may re-apply after that week.
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs md:text-sm transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Go to Sign In</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <>
            {/* 7-Day Auto Purge Notice */}
            <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Clock size={13} className="text-amber-600" />
                <span>Approval Policy (7 Days / 1 Week):</span>
              </div>
              <p className="leading-relaxed">
                Applications must be verified by an active administrator within <strong>7 days</strong>. 
                Unapproved requests are automatically cancelled and purged from the database.
              </p>
            </div>

            {error && (
              <div className="mb-4 text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name (पूरा नाम)</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="उदा. डॉ. राजेश कुमार शर्मा (Nodal Officer)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email Address (ईमेल पता)</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@agrishield.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-800 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Set Password (पासवर्ड बनाएं)</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    required 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="कम से कम 6 अक्षर (Password)"
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
                  <span>Submitting Request...</span>
                ) : (
                  <>
                    <span>Request Admin Approval (अनुमोदन हेतु आवेदन करें)</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500 pt-4 border-t border-slate-100">
              Already have an active administrator account?{' '}
              <Link to="/login" className="text-sky-700 font-bold hover:underline">
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
