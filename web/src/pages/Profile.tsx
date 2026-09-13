import { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Phone, 
  User, 
  CheckCircle2, 
  MapPin, 
  Languages,
  Sprout
} from 'lucide-react';
import { api, type Farm } from '../api';
import { useUserRole, DEFAULT_AVATAR } from '../context/RoleContext';

const AVATAR_PRESETS = [
  { label: 'किसान', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80' },
  { label: 'महिला किसान', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80' },
  { label: 'अधिकारी', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80' },
  { label: 'प्रशासक', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&q=80' },
];

export default function Profile() {
  const { role, avatarUrl, setAvatarUrl } = useUserRole();
  const [userData, setUserData] = useState<any>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const [meRes, farmRes] = await Promise.allSettled([
        api.getMe(),
        api.getFarms()
      ]);

      if (meRes.status === 'fulfilled' && meRes.value.success) {
        setUserData(meRes.value.data);
        if (meRes.value.data.avatar_url) {
          setAvatarUrl(meRes.value.data.avatar_url);
        }
      }
      if (farmRes.status === 'fulfilled' && farmRes.value.success) {
        setFarms(farmRes.value.data);
      }
    } catch (e) {
      console.error("Error loading user profile", e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoSaving(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          const finalUri = ctx ? (ctx.drawImage(img, 0, 0, w, h), canvas.toDataURL('image/jpeg', 0.85)) : base64String;
          
          setAvatarUrl(finalUri);
          try {
            await api.updateProfile({ avatar_url: finalUri });
            setSaveMessage('प्रोफ़ाइल फोटो डेटाबेस में सुरक्षित हो गई (Photo saved to database)');
            setTimeout(() => setSaveMessage(null), 4500);
          } catch (err) {
            console.error("Failed to save avatar to server", err);
          } finally {
            setPhotoSaving(false);
          }
        };
        img.src = base64String;
      };
      reader.readAsDataURL(file);
    }
  };

  const selectPresetAvatar = async (presetUrl: string) => {
    setPhotoSaving(true);
    setAvatarUrl(presetUrl);
    try {
      await api.updateProfile({ avatar_url: presetUrl });
      setSaveMessage('प्रोफ़ाइल अवतार अपडेट हो गया (Avatar updated)');
      setTimeout(() => setSaveMessage(null), 4000);
    } catch (err) {
      console.error("Failed to save avatar", err);
    } finally {
      setPhotoSaving(false);
    }
  };

  const displayName = userData?.name || localStorage.getItem('farmer_name') || (role === 'admin' ? 'System Administrator' : 'किसान भाई (Farmer)');
  const displayPhone = userData?.phone || localStorage.getItem('farmer_phone') || 'N/A';
  const displayEmail = userData?.email || (role === 'admin' ? 'admin@agrishield.com' : 'N/A');
  const totalAreaHa = farms.reduce((acc, f) => acc + ((f.area_m2 || 0) / 10000), 0);
  const totalAreaAcre = farms.reduce((acc, f) => acc + ((f.area_m2 || 0) / 4046.86), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-600 border-t-transparent"></div>
        <p className="text-xs font-semibold">प्रोफ़ाइल लोड हो रही है (Loading Profile)...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1000px] mx-auto w-full flex flex-col gap-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
            role === 'admin' 
              ? 'text-sky-800 bg-sky-50 border-sky-200' 
              : 'text-emerald-800 bg-emerald-50 border-emerald-200'
          }`}>
            {role === 'admin' ? 'प्रशासक खाता (Admin Console)' : 'किसान पहचान (PMFBY Farmer ID)'}
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
            {role === 'admin' ? 'Administrator Profile' : 'मेरी किसान प्रोफ़ाइल (My Profile)'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl shadow-2xs">
            <CheckCircle2 size={15} className="text-emerald-600" />
            आधार व फोन सत्यापित (Verified)
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="md:col-span-1 flex flex-col gap-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center text-center shadow-xs">
            <div 
              className="w-28 h-28 rounded-full overflow-hidden border-4 border-emerald-100 mb-2 shadow-sm relative group cursor-pointer"
              onClick={() => !photoSaving && fileInputRef.current?.click()}
            >
              <img 
                alt="Profile Avatar" 
                className="w-full h-full object-cover" 
                src={avatarUrl || DEFAULT_AVATAR}
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[11px] font-bold">
                  {photoSaving ? 'सहेजा जा रहा है...' : 'फोटो बदलें'}
                </span>
              </div>
              {photoSaving && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photoSaving}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 mb-2 underline underline-offset-2"
            >
              {photoSaving ? 'क्लाउड में सहेजा जा रहा है...' : 'नई फोटो अपलोड करें'}
            </button>

            {/* Quick Preset Avatars */}
            <div className="w-full mt-1 mb-3 pt-2.5 border-t border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                अवतार चुनें (Choose Avatar)
              </p>
              <div className="flex items-center justify-center gap-2">
                {AVATAR_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    title={p.label}
                    onClick={() => selectPresetAvatar(p.url)}
                    disabled={photoSaving}
                    className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all p-0.5 ${
                      avatarUrl === p.url ? 'border-emerald-600 scale-110 shadow-xs ring-2 ring-emerald-400/30' : 'border-slate-200 hover:border-emerald-400 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img 
                      src={p.url} 
                      alt={p.label} 
                      className="w-full h-full rounded-full object-cover" 
                      onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {saveMessage && (
              <div className="w-full p-2 mb-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] font-semibold text-emerald-900 text-center animate-in fade-in">
                ✓ {saveMessage}
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImageChange}
            />

            <h3 className="text-lg font-extrabold text-slate-900">{displayName}</h3>
            {role === 'farmer' ? (
              <p className="text-emerald-800 font-mono font-bold text-sm my-1 flex items-center justify-center gap-1">
                <Phone size={14} /> {displayPhone}
              </p>
            ) : (
              <p className="text-slate-500 text-xs my-1 flex items-center justify-center gap-1">
                <Mail size={14} /> {displayEmail}
              </p>
            )}

            <div className="w-full mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span>भूमिका (Role):</span>
                <strong className="text-slate-800 uppercase">{role}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>पंजीकरण तिथि:</span>
                <strong className="text-slate-800">
                  {userData?.created_at ? userData.created_at.split('T')[0] : 'सक्रिय (Active)'}
                </strong>
              </div>
              {role === 'farmer' && (
                <div className="flex items-center justify-between">
                  <span>पंजीकृत खेत (Plots):</span>
                  <strong className="text-emerald-700 font-bold">{farms.length} खेत</strong>
                </div>
              )}
            </div>
          </div>

          {/* Quick Statistics Strip */}
          {role === 'farmer' && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold">
                <Sprout size={16} className="text-emerald-700" />
                <span>कुल कृषि रकबा (Total Land):</span>
              </div>
              <p className="text-2xl font-black text-emerald-950">
                {totalAreaAcre.toFixed(2)} एकड़ <span className="text-xs font-normal text-emerald-800">({totalAreaHa.toFixed(2)} Ha)</span>
              </p>
              <p className="text-[11px] text-emerald-800/80">
                सैटेलाइट और GPS द्वारा सत्यापित सीमाएं
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Farmer / Admin Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Identity & Contact Details */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
              <User size={16} className="text-emerald-600" />
              <span>व्यक्तिगत विवरण (Personal Details)</span>
            </h3>

            <div className="grid sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">किसान / उपयोगकर्ता का नाम</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{displayName}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">पंजीकृत मोबाइल नंबर</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{displayPhone}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">ईमेल (Email ID)</span>
                <p className="text-sm font-bold text-slate-900 mt-1">{displayEmail}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">पसंदीदा भाषा (Language)</span>
                <p className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1">
                  <Languages size={14} className="text-emerald-600" /> हिंदी / English
                </p>
              </div>
            </div>
          </div>

          {/* Registered Land Parcels List */}
          {role === 'farmer' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={16} className="text-emerald-600" />
                  <span>मेरे पंजीकृत खेत ({farms.length})</span>
                </h3>
              </div>

              {farms.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  अभी तक कोई खेत पंजीकृत नहीं है। 'नया खेत जोड़ें' पर जाकर अपना खेत दर्ज करें।
                </p>
              ) : (
                <div className="space-y-3">
                  {farms.map((farm) => (
                    <div key={farm.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900 text-sm block">{farm.name}</span>
                        <span className="text-slate-500 text-[11px]">
                          फसल: <strong>{farm.crop || 'खुला खेत'}</strong> • रकबा: <strong>{farm.area_m2 ? (farm.area_m2 / 4046.86).toFixed(2) : '0.00'} एकड़</strong> ({farm.area_m2 ? (farm.area_m2 / 10000).toFixed(2) : '0.00'} Ha)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        GPS सत्यापित
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
