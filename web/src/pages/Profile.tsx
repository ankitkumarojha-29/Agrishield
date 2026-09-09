import { Shield, Mail, Key, ChevronRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/aida-public/AB6AXuAAQA3TXRV28zCFw4MNwSNxcKyHlMAAx-0_Kht1eK7GEBvmhRs57f-7bbg7Sh5r0rzPlsPUzgsHMv0plNzqM6l_nsu5XiylbkB2Hp0aqGXi6KPF_wbR6qvLaw2C2217YDKRL7HfbpKDOzf9bplGbXWmdm0T8YvmSq7K_fi2E4CNrGF3139995wCup8tkIm-bV3zIcZ6I-iPv8MKyb3q3bHWp4KCdrbJPEvyunmbCdlDcKnTuBk-vIpobw";

export default function Profile() {
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('admin_avatar');
    if (saved) setAvatarUrl(saved);
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setAvatarUrl(base64String);
        localStorage.setItem('admin_avatar', base64String);
        window.dispatchEvent(new Event('avatarChanged'));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-extrabold text-on-surface">Admin Profile</h2>
        <span className="bg-primary-container text-on-primary-container text-xs font-bold px-3 py-1 rounded-full border border-primary/20">
          Superadmin
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="bg-surface border border-outline-variant rounded-2xl p-6 flex flex-col items-center text-center shadow-sm">
            <div 
              className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-variant mb-4 shadow-sm relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <img 
                alt="Admin Avatar" 
                className="w-full h-full object-cover" 
                src={avatarUrl}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm font-semibold">Change Photo</span>
              </div>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange}
            />
            <h3 className="text-xl font-bold text-on-surface">Admin User</h3>
            <p className="text-on-surface-variant text-sm mb-4">admin@agrishield.com</p>
            
            <div className="w-full flex items-center justify-center gap-2 bg-secondary-container/50 text-on-secondary-container py-2 rounded-lg text-sm font-medium border border-secondary/20">
              <Shield size={16} className="text-secondary" />
              Verified Administrator
            </div>
          </div>
        </div>

        {/* Right Column: Settings & Forms */}
        <div className="md:col-span-2 flex flex-col gap-6">
          
          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
            <div className="border-b border-outline-variant p-6 bg-surface-container-lowest">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Mail size={18} className="text-primary" /> Personal Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">First Name</label>
                  <input type="text" defaultValue="Admin" className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-1">Last Name</label>
                  <input type="text" defaultValue="User" className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">Email Address</label>
                <input type="email" defaultValue="admin@agrishield.com" className="w-full bg-surface-container border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:border-primary focus:outline-none" />
              </div>
              <div className="pt-2">
                <button className="bg-primary text-on-primary px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
             <div className="border-b border-outline-variant p-6 bg-surface-container-lowest">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Key size={18} className="text-tertiary" /> Security Settings
              </h3>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between py-2 cursor-pointer group">
                <div>
                  <h4 className="font-semibold text-on-surface group-hover:text-tertiary transition-colors">Change Password</h4>
                  <p className="text-sm text-on-surface-variant">Update your account password</p>
                </div>
                <ChevronRight className="text-outline" size={20} />
              </div>
              <hr className="my-4 border-outline-variant" />
              <div className="flex items-center justify-between py-2 cursor-pointer group">
                <div>
                  <h4 className="font-semibold text-on-surface group-hover:text-tertiary transition-colors">Two-Factor Authentication</h4>
                  <p className="text-sm text-on-surface-variant">Add an extra layer of security to your account</p>
                </div>
                <div className="bg-surface-variant text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold">
                  Disabled
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
