import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await api.register({ email: email.trim(), name: name.trim(), password });
      
      if (res && res.data && res.data.access_token) {
        localStorage.setItem('access_token', res.data.access_token);
        navigate('/dashboard');
      } else {
        setError('Account created. Please log in.');
        navigate('/login');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Registration failed';
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
          <h1 className="text-3xl font-bold text-on-surface mb-2">Create Account</h1>
          <p className="text-on-surface-variant">Register for the AgriShield Admin Portal</p>
        </div>
        
        {error && <div className="mb-4 text-sm text-error bg-error-container/30 p-3 rounded-lg border border-error/20">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Full Name</label>
            <input 
              required 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email Address</label>
            <input 
              required 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@agrishield.com"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Password</label>
            <input 
              required 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold text-lg mt-6 hover:bg-surface-tint transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center h-12"
          >
            {loading ? <div className="w-6 h-6 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></div> : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-on-surface-variant font-medium bg-tertiary-container/30 text-tertiary p-3 rounded-lg border border-tertiary/20 mb-4">
          Demo Mode is active. Registration will redirect to login.
        </div>
        
        <div className="text-center text-sm text-on-surface-variant">
          Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
