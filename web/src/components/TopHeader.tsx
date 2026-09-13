import { useState, useRef, useEffect } from 'react';
import { Search, Bell, User, LogOut, CheckCircle2, AlertTriangle, Shield, Sprout, Menu, Trash2, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useUserRole, DEFAULT_AVATAR } from '../context/RoleContext';
import { api } from '../api';

interface TopHeaderProps {
  onToggleMobileMenu?: () => void;
}

export default function TopHeader({ onToggleMobileMenu }: TopHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { role, userName, avatarUrl } = useUserRole();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadNotifications();

    const handleSync = () => {
      loadNotifications();
    };
    window.addEventListener('agrishield:notifications-updated', handleSync);
    return () => {
      window.removeEventListener('agrishield:notifications-updated', handleSync);
    };
  }, []);

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications();
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      }
    } catch (e) {
      // ignore
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notifications.length === 0) return;
    try {
      await api.clearAllNotifications();
      setNotifications([]);
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read: true })));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const handleDeleteOne = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleMarkOneRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true, read: true } : n));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <header className="w-full h-16 sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 md:px-8 flex justify-between items-center shadow-xs">
      {/* Left: Hamburger (Mobile) + Search (Desktop) */}
      <div className="flex items-center gap-3 md:gap-4">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-slate-700 hover:text-emerald-700 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={22} />
        </button>

        <div className="relative hidden md:block w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input 
            className="w-full bg-slate-50 border border-slate-200/80 rounded-full py-1.5 pl-10 pr-4 text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all" 
            placeholder="Search farms, crops, alerts..." 
            type="text" 
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 md:gap-5">
        {/* Active Identity Badge (No switcher button) */}
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border shadow-2xs ${
          role === 'admin'
            ? "bg-sky-50 text-sky-800 border-sky-200"
            : "bg-emerald-50 text-emerald-800 border-emerald-200"
        }`}>
          {role === 'admin' ? (
            <>
              <Shield size={14} className="text-sky-600 shrink-0" />
              <span>🛡️ प्रशासक (Admin)</span>
            </>
          ) : (
            <>
              <Sprout size={14} className="text-emerald-600 shrink-0" />
              <span>🌾 किसान पोर्टल (Farmer)</span>
            </>
          )}
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full relative transition-colors cursor-pointer"
            title="Notifications & Early Warnings"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-amber-500 text-[9px] font-black text-white rounded-full flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-88 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-in fade-in zoom-in-95">
              {/* Header with Title & Action Controls */}
              <div className="flex items-center justify-between px-1 pb-2.5 mb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
                    {role === 'admin' ? '🛡️ Admin Alerts' : '🌾 Farm Early Warnings'}
                  </span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  {notifications.length > 0 && (
                    <>
                      <button 
                        onClick={handleMarkAllRead} 
                        className="text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer hover:underline"
                        title="सब पढ़ें (Mark all as read)"
                      >
                        सब पढ़ें
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        onClick={handleClearAll} 
                        className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer hover:underline"
                        title="सभी साफ करें (Clear all notifications from database)"
                      >
                        साफ करें (Clear)
                      </button>
                      <span className="text-slate-300">|</span>
                    </>
                  )}
                  <Link 
                    to="/alerts" 
                    onClick={() => setNotifOpen(false)} 
                    className="text-slate-600 hover:text-emerald-700 font-medium hover:underline"
                  >
                    सब देखें
                  </Link>
                </div>
              </div>

              {/* Notification List with individual Read & Delete buttons */}
              <div className="space-y-2 max-h-84 overflow-y-auto pr-0.5">
                {notifications.length > 0 ? (
                  notifications.map((a: any) => (
                    <div 
                      key={a.id} 
                      className={`p-2.5 rounded-xl transition-all text-xs border group relative ${
                        a.is_read ? 'bg-slate-50 border-slate-200/80 opacity-85' : 'bg-emerald-50/50 border-emerald-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[200px] md:max-w-[230px]">
                          {a.severity === 'critical' || a.type === 'warning' || (a.title && a.title.includes('चेतावनी')) ? (
                            <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                          )}
                          <span className="font-bold text-slate-800 truncate">{a.title || 'अलर्ट / Alert'}</span>
                        </div>

                        {/* Top corner action controls for this notification */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-slate-400 font-normal mr-1">
                            {a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'अभी'}
                          </span>
                          {!a.is_read && (
                            <button
                              onClick={(e) => handleMarkOneRead(a.id, e)}
                              className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="पढ़ा हुआ चिह्नित करें (Mark as read)"
                            >
                              <Check size={12} strokeWidth={2.5} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteOne(a.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="हटाएं (Delete notification)"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {a.message || a.threat_hi || a.raw_message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <CheckCircle2 size={26} className="text-emerald-500 mx-auto mb-2" />
                    <p className="font-extrabold text-slate-800 text-sm">कोई नया अलर्ट नहीं (Tray Clear)</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {role === 'admin' ? 'सभी व्यवस्थापक और सिस्टम अलर्ट अद्यतित हैं।' : 'सभी पंजीकृत खेत सुरक्षित हैं।'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar & Menu */}
        <div className="relative" ref={dropdownRef}>
          <div 
            className="flex items-center gap-2 cursor-pointer p-1 rounded-full hover:bg-slate-50 transition-all"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-300 ring-2 ring-emerald-500/10 bg-slate-100">
              <img 
                alt="User Avatar" 
                className="w-full h-full object-cover" 
                src={avatarUrl || DEFAULT_AVATAR}
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }} 
              />
            </div>
            <div className="hidden lg:block text-left pr-1">
              <p className="text-xs font-semibold text-slate-800 leading-tight">{userName}</p>
              <p className="text-[10px] text-emerald-600 font-medium capitalize">{role}</p>
            </div>
          </div>
          
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{userName}</p>
                <p className="text-[11px] text-slate-500">AgriShield Platform</p>
              </div>
              <Link 
                to="/profile" 
                className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
                onClick={() => setDropdownOpen(false)}
              >
                <User size={15} /> User Profile & Settings
              </Link>
              <button 
                onClick={() => {
                  setDropdownOpen(false);
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('user_role');
                  localStorage.removeItem('user_name');
                  api.invalidateCache();
                  navigate('/login');
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
