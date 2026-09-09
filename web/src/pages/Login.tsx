import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@agrishield.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.login({ email: email.trim(), password });
      
      // Store token
      if (res && res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        navigate('/dashboard');
      } else {
        setError('Login succeeded but no token was returned.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface relative flex items-center justify-center p-4 overflow-hidden">
      {/* Normal Blurred Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-80 blur-[2px] scale-[1.02]"
        style={{ backgroundImage: `url('/login-bg.webp')` }}
      />
      
      {/* Subtle Shadow Overlay */}
      <div className="absolute inset-0 z-0 bg-black/20 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-md bg-surface/95 backdrop-blur-md border border-outline-variant p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
        <div className="text-center mb-8">
          <img alt="AgriShield Logo" className="h-16 w-auto mx-auto mb-6 object-contain" src="/logo-trimmed.webp" />
          <h1 className="text-3xl font-bold text-on-surface mb-2">Welcome Back</h1>
          <p className="text-on-surface-variant">Sign in to the AgriShield Admin Portal</p>
        </div>
        
        {error && <div className="mb-4 text-sm text-error bg-error-container/30 p-3 rounded-lg border border-error/20">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email Address</label>
            <input 
              required 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-on-surface-variant">Password</label>
              <a href="#" className="text-xs text-primary font-medium hover:underline">Forgot password?</a>
            </div>
            <input 
              required 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-lg mt-4 hover:bg-surface-tint transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center h-12"
          >
            {loading ? <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div> : 'Sign In'}
          </button>
        </form>
        
        {import.meta.env.VITE_DEMO_MODE === 'true' && (
          <div className="mt-8 text-center text-xs text-on-surface-variant font-medium bg-tertiary-container/30 text-tertiary p-3 rounded-lg border border-tertiary/20 mb-4">
            Demo Mode is active. Any credentials will work.
          </div>
        )}
        <div className="text-center text-sm text-on-surface-variant">
          Don't have an account? <Link to="/register" className="text-primary font-bold hover:underline">Register</Link>
        </div>
      </div>
    </div>
  );
}
