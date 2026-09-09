import { Search, MoreVertical } from 'lucide-react';
import { api } from '../api';
import { useEffect, useState } from 'react';
import type { Farmer } from '../api';

export default function Farmers() {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getFarmers().then(res => setFarmers(res.data));
  }, []);

  const filteredFarmers = farmers.filter(farmer => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (farmer.name && farmer.name.toLowerCase().includes(q)) ||
      (farmer.phone && farmer.phone.toLowerCase().includes(q)) ||
      (farmer.id && farmer.id.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-on-background">Farmers Directory</h2>
            <p className="text-base text-on-surface-variant mt-1">Manage registered farmers and their policies.</p>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
          <div className="w-full">
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Search Farmers</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={20} />
              <input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface rounded-lg border border-outline-variant focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-colors text-sm" 
                placeholder="Search by farmer name, phone number, or ID..." 
                type="text" 
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-outline-variant">
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0">User ID</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0">Name</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0">Phone</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0">Email</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {filteredFarmers.map((farmer) => (
                  <tr key={farmer.id} className="border-b border-outline-variant/30 hover:bg-surface-variant/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs">{farmer.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-semibold">{farmer.name || 'Unknown'}</td>
                    <td className="px-6 py-4">{farmer.phone || 'N/A'}</td>
                    <td className="px-6 py-4 text-xs text-on-surface-variant">{farmer.email || 'N/A'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        REGISTERED
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-tertiary hover:text-tertiary-container transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
                {farmers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                      No farmers registered yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-surface border-t border-outline-variant px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Showing {farmers.length} entries</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs disabled:opacity-50" disabled>Prev</button>
              <button className="px-3 py-1 rounded border border-primary-container bg-primary-container text-on-primary text-xs">1</button>
              <button className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs">2</button>
              <button className="px-3 py-1 rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container-high transition-colors text-xs">Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
