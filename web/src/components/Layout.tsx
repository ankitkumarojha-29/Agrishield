import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Map, 
  PlusCircle, 
  ScanLine, 
  FlaskConical, 
  CloudRain, 
  AlertTriangle, 
  Users,
  Satellite,
  BarChart3,
  TrendingUp,
  Settings,
  User,
  UserCheck,
  X
} from 'lucide-react';

import TopHeader from './TopHeader';
import { useUserRole } from '../context/RoleContext';

interface NavItem {
  path: string;
  label: string;
  icon: any;
  badge?: string;
  highlight?: boolean;
}

const farmerNavItems: NavItem[] = [
  { path: "/dashboard", label: "Farmer Home", icon: LayoutDashboard },
  { path: "/farms", label: "My Farms", icon: Map },
  { path: "/add-farm", label: "Add Farm", icon: PlusCircle, badge: "GPS Draw" },
  { path: "/crop-scan", label: "Crop Scanner", icon: ScanLine, highlight: true },
  { path: "/soil-analysis", label: "Soil Analysis", icon: FlaskConical },
  { path: "/weather-irrigation", label: "Weather & Irrigation", icon: CloudRain },
  { path: "/revenue", label: "Mandi & Economics", icon: TrendingUp },
  { path: "/alerts", label: "Early Warnings", icon: AlertTriangle },
  { path: "/profile", label: "My Profile", icon: User },
];

const adminNavItems: NavItem[] = [
  { path: "/dashboard", label: "Admin Dashboard", icon: LayoutDashboard },
  { path: "/farmers", label: "Farmers & Inspection", icon: Users, badge: "Registry" },
  { path: "/farms-map", label: "All Farms & Satellite", icon: Map },
  { path: "/admin-approvals", label: "Admin Approvals", icon: UserCheck, badge: "7-Day" },
  { path: "/weather-irrigation", label: "Weather Intelligence", icon: CloudRain },
  { path: "/alerts", label: "Alerts & Broadcast", icon: AlertTriangle, badge: "Dispatch" },
  { path: "/revenue", label: "Mandi & Economics", icon: TrendingUp },
  { path: "/reports", label: "Analytics & Reports", icon: BarChart3 },
  { path: "/profile", label: "Platform Settings", icon: Settings },
];

export default function Layout() {
  const location = useLocation();
  const { role } = useUserRole();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const token = localStorage.getItem('access_token');
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  if (!token && !isDemo) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const navItems = role === 'admin' ? adminNavItems : farmerNavItems;

  const renderNavLinks = () => (
    <div className="flex-1 overflow-y-auto px-3 space-y-1">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path || 
          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
        const Icon = item.icon;
        
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? role === 'admin'
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/20 font-semibold"
                  : "bg-emerald-600 text-white shadow-md shadow-emerald-700/20 font-semibold"
                : item.highlight
                ? "text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/50"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={19} className={isActive ? "text-white" : item.highlight ? "text-emerald-700" : "text-slate-500"} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
              }`}>
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#FBFDF9] text-slate-800 font-sans">
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-[270px] h-screen sticky left-0 top-0 bg-white border-r border-slate-200/80 flex-col py-6 shadow-sm z-40 select-none">
        {/* Brand Header */}
        <div className="px-6 mb-5">
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              alt="AgriShield Logo" 
              className="h-10 w-auto object-contain transition-transform group-hover:scale-105" 
              src="/logo-trimmed.webp" 
            />
          </Link>
          <div className="mt-2.5 flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              role === 'admin' 
                ? 'text-sky-800 bg-sky-50 border-sky-200' 
                : 'text-emerald-800 bg-emerald-50 border-emerald-200'
            }`}>
              {role === 'admin' ? '🛡️ Admin Console' : '🌾 Farmer Portal'}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live AI
            </span>
          </div>
        </div>
        
        {/* Nav Links */}
        {renderNavLinks()}

        {/* Live Satellite Status Pill in Sidebar Bottom */}
        <div className="p-4 mx-3 mt-auto rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200/60 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 font-semibold mb-1">
            <Satellite size={15} className="text-emerald-700" />
            <span>Sentinel-2 Earth Obs.</span>
          </div>
          <p className="text-[11px] text-emerald-800/80 leading-relaxed">
            10m resolution spectral NDVI, NDMI &amp; NDWI active.
          </p>
        </div>
      </nav>

      {/* Mobile Drawer (slide-over) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col py-5 z-10 animate-in slide-in-from-left duration-250">
            <div className="px-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                <img alt="AgriShield Logo" className="h-9 w-auto object-contain" src="/logo-trimmed.webp" />
              </Link>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-5 py-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                role === 'admin' 
                  ? 'text-sky-800 bg-sky-50 border-sky-200' 
                  : 'text-emerald-800 bg-emerald-50 border-emerald-200'
              }`}>
                {role === 'admin' ? '🛡️ Admin Console' : '🌾 Farmer Portal'}
              </span>
            </div>

            {renderNavLinks()}
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FBFDF9]">
        <TopHeader onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1 p-4 md:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
