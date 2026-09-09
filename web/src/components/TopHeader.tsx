import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuAAQA3TXRV28zCFw4MNwSNxcKyHlMAAx-0_Kht1eK7GEBvmhRs57f-7bbg7Sh5r0rzPlsPUzgsHMv0plNzqM6l_nsu5XiylbkB2Hp0aqGXi6KPF_wbR6qvLaw2C2217YDKRL7HfbpKDOzf9bplGbXWmdm0T8YvmSq7K_fi2E4CNrGF3139995wCup8tkIm-bV3zIcZ6I-iPv8MKyb3q3bHWp4KCdrbJPEvyunmbCdlDcKnTuBk-vIpobw";

export default function TopHeader() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    
    // Load existing
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);

    // Listen for cross-component changes
    const updateAvatar = () => {
      const updated = localStorage.getItem('admin_avatar');
      if (updated) setAvatarUrl(updated);
    };
    window.addEventListener('avatarChanged', updateAvatar);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener('avatarChanged', updateAvatar);
    };
  }, []);

  return (
    <header className="w-full h-16 sticky top-0 z-40 bg-surface border-b border-outline-variant shadow-sm px-8 flex justify-between items-center">
      <div className="text-xl font-bold text-on-surface">AgriShield Admin</div>
      <div className="flex items-center gap-6">
        <div className="relative hidden md:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
          <input 
            className="w-full bg-surface-container-low border border-surface-variant rounded-full py-2 pl-10 pr-4 text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors" 
            placeholder="Search..." 
            type="text" 
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-all">
            <Bell size={20} />
          </button>
          <div className="relative" ref={dropdownRef}>
            <div 
              className="w-8 h-8 rounded-full overflow-hidden border border-surface-variant ml-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <img alt="Admin Avatar" className="w-full h-full object-cover" src={avatarUrl}/>
            </div>
            
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-surface rounded-xl shadow-lg border border-outline-variant py-2 z-50">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface hover:bg-surface-variant transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  <User size={16} /> Profile
                </Link>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/login');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error-container hover:text-on-error-container transition-colors text-left"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
