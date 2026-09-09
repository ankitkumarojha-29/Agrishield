import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Users, Map, FileText, FileSearch, ShieldCheck, BarChart3, TrendingUp } from 'lucide-react';

import TopHeader from './TopHeader';

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/farmers", label: "Farmers", icon: Users },
  { path: "/farms-map", label: "Farms Map", icon: Map },
  { path: "/policies", label: "Policies", icon: FileText },
  { path: "/claims", label: "Claims", icon: FileSearch },
  { path: "/revenue", label: "Revenue & Viability", icon: TrendingUp },
  { path: "/verification", label: "Verification", icon: ShieldCheck },
  { path: "/reports", label: "Reports", icon: BarChart3 },
];

export default function Layout() {
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const isDemo = import.meta.env.VITE_DEMO_MODE === 'true';

  if (!token && !isDemo) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div className="flex min-h-screen bg-background text-on-surface font-sans">
      <nav className="w-[280px] h-screen sticky left-0 top-0 bg-surface border-r border-outline-variant flex flex-col py-8 shadow-sm z-50">
        <div className="px-10 mb-8 flex flex-col gap-2">
          <div className="flex items-center mb-1 w-full">
            <img alt="AgriShield Logo" className="h-10 w-auto object-contain object-left" src="/logo-trimmed.webp" />
          </div>
          <p className="text-sm text-on-surface-variant font-medium">Admin Dashboard</p>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-secondary-container text-on-secondary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                <Icon size={20} className={isActive ? "fill-current" : ""} />
                <span className="text-base">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <main className="flex-1 flex flex-col min-w-0">
        <TopHeader />
        <Outlet />
      </main>
    </div>
  );
}
