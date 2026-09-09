import { FileText, ShieldAlert, Users, Activity, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { api } from '../api';
import type { Farm } from '../api';
import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function Dashboard() {
  const [stats, setStats] = useState({ policies: 0, claims: 0, farmers: 0, riskScore: 0 });
  const [farms, setFarms] = useState<Farm[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [policiesRes, claimsRes, farmsRes] = await Promise.all([
          api.getPolicies(),
          api.getClaims(),
          api.getFarms()
        ]);

        const uniqueFarmers = new Set(farmsRes.data.map(f => f.user_id)).size;

        setStats({
          policies: policiesRes.data.length,
          claims: claimsRes.data.length,
          farmers: uniqueFarmers,
          riskScore: 42.5
        });
        
        setFarms(farmsRes.data);
        setErrorMsg(null);
      } catch (err: any) {
        console.error("Failed to fetch dashboard stats", err);
        setErrorMsg(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-4 m-4 rounded border border-red-300 font-bold">
          API Error: {errorMsg}
        </div>
      )}
      <div className="p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-8">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h2 className="text-3xl font-bold text-on-background flex items-center gap-4">
              Overview
              {loading && <span className="text-sm font-normal text-on-surface-variant animate-pulse bg-primary/10 px-3 py-1 rounded-full">Syncing data...</span>}
            </h2>
            <p className="text-on-surface-variant mt-2">Real-time agricultural portfolio metrics.</p>
          </div>
          <button className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm hover:bg-surface-tint transition-colors shadow-sm flex items-center gap-2">
            <Download size={18} />
            Export Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Active Policies" value={stats.policies.toLocaleString()} trend="+5.2%" isPositive={true} icon={FileText} colorClass="text-primary bg-primary-container/10" trendColor="text-[#1B7A3D] bg-[#1B7A3D]/10" />
          <StatCard title="Pending Claims" value={stats.claims.toLocaleString()} trend="+1.2%" isPositive={true} icon={ShieldAlert} colorClass="text-secondary bg-secondary-container/10" trendColor="text-[#F5821F] bg-[#F5821F]/10" />
          <StatCard title="Total Farmers" value={stats.farmers.toLocaleString()} trend="+8.4%" isPositive={true} icon={Users} colorClass="text-tertiary bg-tertiary-container/10" trendColor="text-[#1B7A3D] bg-[#1B7A3D]/10" />
          <StatCard title="Avg. Risk Score" value={stats.riskScore.toString()} trend="-0.5%" isPositive={false} icon={Activity} colorClass="text-error bg-error-container/10" trendColor="text-[#ba1a1a] bg-[#ba1a1a]/10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <div className="lg:col-span-2 bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col overflow-hidden shadow-sm relative">
            <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-white z-10">
              <h3 className="text-lg font-bold text-on-background">Geographic Risk Distribution</h3>
            </div>
            <div className="flex-1 relative z-0">
              <MapContainer center={[20.5937, 78.9629]} zoom={5} className="w-full h-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {farms.map((farm) => {
                  const color = farm.status === 'VERIFIED' ? '#1B7A3D' : '#F5821F';

                  // Prefer real polygon boundary from backend
                  if (farm.boundary?.coordinates) {
                    // GeoJSON coords are [lon, lat] — Leaflet needs [lat, lon]
                    const positions: [number, number][] = farm.boundary.coordinates[0]
                      .map(([lon, lat]) => [lat, lon] as [number, number]);
                    return (
                      <Polygon
                        key={farm.id}
                        positions={positions}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.4 }}
                      />
                    );
                  }

                  // Fallback: point marker at centroid
                  if (farm.centroid) {
                    return (
                      <CircleMarker
                        key={farm.id}
                        center={[farm.centroid.lat, farm.centroid.lon]}
                        radius={10}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.6 }}
                      />
                    );
                  }

                  return null;
                })}
              </MapContainer>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col overflow-hidden shadow-sm">
             <div className="p-6 border-b border-surface-variant bg-white z-10">
              <h3 className="text-lg font-bold text-on-background">Recent Activity</h3>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
               <p className="text-on-surface-variant text-sm">Demo / AI-assisted feed...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isPositive, icon: Icon, colorClass, trendColor }: any) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6 shadow-sm hover:-translate-y-1 transition-transform duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon size={24} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColor}`}>
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </div>
      </div>
      <p className="text-sm text-on-surface-variant mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-on-background">{value}</h3>
    </div>
  );
}
