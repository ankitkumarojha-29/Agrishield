import { api } from '../api';
import type { Policy } from '../api';
import { useEffect, useState } from 'react';
import { FileText, Shield } from 'lucide-react';

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPolicies()
      .then(res => setPolicies(res.data))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (id: string) => {
    try {
      const res = await api.verifyPolicy(id);
      if (!res.success) {
        throw new Error(res.error?.message || 'Failed to verify');
      }
      alert(`Blockchain Verification: ${res.data.status}\nHash: ${res.data.tx_hash || 'Pending...'}`);
    } catch (e: any) {
      alert('Failed to verify policy on blockchain.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-on-background">Policy Management</h2>
            <p className="text-base text-on-surface-variant mt-1">Review active PMFBY insurance policies and on-chain records.</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-on-surface-variant">Loading policies...</div>
          ) : policies.length === 0 ? (
            <div className="col-span-full p-8 text-center text-on-surface-variant">No policies found.</div>
          ) : (
            policies.map((policy) => (
              <div key={policy.id} className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-primary-container text-on-primary-container p-3 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${
                    policy.status === 'ACTIVE' ? 'bg-primary/10 text-primary' : 
                    policy.status === 'EXPIRED' ? 'bg-error/10 text-error' : 
                    'bg-secondary-container/10 text-secondary-container'
                  }`}>
                    {policy.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-bold mb-1">Policy #{policy.id.toUpperCase()}</h3>
                <p className="text-sm text-on-surface-variant mb-4">Farm ID: {policy.farm_id}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">Premium</p>
                    <p className="font-semibold">₹{policy.premium_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant font-medium uppercase tracking-wider mb-1">Coverage</p>
                    <p className="font-semibold text-primary">₹{policy.coverage_amount.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-outline-variant flex justify-between items-center">
                  <div className="text-xs text-on-surface-variant">
                    {policy.start_date} to {policy.end_date}
                  </div>
                  <button onClick={() => handleVerify(policy.id)} className="text-tertiary hover:text-tertiary-container font-semibold transition-colors flex items-center gap-1 text-sm">
                    Verify <Shield size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
