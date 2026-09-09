import { Filter, Eye, X, Image as ImageIcon } from 'lucide-react';
import { api } from '../api';
import { useEffect, useState } from 'react';
import type { Claim } from '../api';

export default function Claims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimForEvidence, setSelectedClaimForEvidence] = useState<Claim | null>(null);

  useEffect(() => {
    api.getClaims()
      .then(res => setClaims(res.data))
      .finally(() => setLoading(false));
  }, []);

  const formatPct = (val?: number | null) => {
    if (val === undefined || val === null) return 'N/A';
    const num = Number(val);
    const normalized = num <= 1.0 ? num * 100 : num;
    return `${normalized.toFixed(1)}%`;
  };

  const handleReview = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api.reviewClaim(id, action);
      // Map action verbs to past-tense status values
      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
      api.invalidateCache('claims');
      alert(`Claim ${action.toLowerCase()}d successfully.`);
    } catch (e) {
      alert(`Failed to ${action.toLowerCase()} claim.`);
    }
  };

  const handleAssess = async (id: string) => {
    try {
      const res = await api.assessClaim(id);
      setClaims(prev => prev.map(c =>
        c.id === id
          ? { ...c, status: 'AI_ASSESSED', damage_pct: res.data.damage_pct, ai_confidence: res.data.ai_confidence }
          : c
      ));
      api.invalidateCache('claims');
      alert(`AI Assessment complete. Damage: ${formatPct(res.data.damage_pct)} (${res.data.model_version})`);
    } catch (e) {
      alert('AI Assessment failed.');
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="p-8 max-w-[1440px] mx-auto w-full flex flex-col gap-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold text-on-background">Claims Dashboard</h2>
            <p className="text-base text-on-surface-variant mt-1">Review and manage AI-assessed insurance claims.</p>
          </div>
          <button className="bg-surface-container-highest text-on-surface border border-outline-variant px-4 py-2 rounded-lg text-sm hover:bg-surface-variant transition-colors shadow-sm flex items-center gap-2">
            <Filter size={18} />
            Filter
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface border-b border-outline-variant">
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Claim ID</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Event</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Damage Pct</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">AI Confidence</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Evidence</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-xs font-medium text-on-surface-variant uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm text-on-surface">
                {loading ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">Loading claims...</td></tr>
                ) : claims.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">No claims found.</td></tr>
                ) : (
                  claims.map(claim => (
                    <tr key={claim.id} className="border-b border-outline-variant/30 hover:bg-surface-variant/50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs">{claim.id.substring(0, 8)}...</td>
                      <td className="px-6 py-4 font-semibold capitalize">{claim.event_type}</td>
                      <td className="px-6 py-4">{claim.incident_date}</td>
                      <td className="px-6 py-4 font-semibold text-error">{formatPct(claim.damage_pct)}</td>
                      <td className="px-6 py-4">
                        {claim.ai_confidence !== undefined && claim.ai_confidence !== null ? (
                          <div className="flex flex-col gap-1">
                            <span className="font-semibold">{formatPct(claim.ai_confidence)}</span>
                            <span className="text-[10px] text-tertiary font-bold bg-tertiary-container/30 px-1 py-0.5 rounded w-fit">AI-Assessed</span>
                          </div>
                        ) : 'Pending'}
                      </td>
                      <td className="px-6 py-4">
                        {claim.evidence_ids && claim.evidence_ids.length > 0 ? (
                          <button
                            onClick={() => setSelectedClaimForEvidence(claim)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors"
                          >
                            <Eye size={14} />
                            View ({claim.evidence_ids.length})
                          </button>
                        ) : (
                          <span className="text-xs text-on-surface-variant">No photos</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          claim.status === 'APPROVED' ? 'bg-primary/10 text-primary' : 
                          claim.status === 'REJECTED' ? 'bg-error/10 text-error' : 
                          claim.status === 'AI_ASSESSED' ? 'bg-tertiary/10 text-tertiary' :
                          'bg-secondary-container/10 text-secondary-container'
                        }`}>
                          {claim.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {claim.status === 'APPROVED' || claim.status === 'REJECTED' ? (
                          <span className="text-on-surface-variant text-xs font-semibold">Reviewed</span>
                        ) : claim.status === 'SUBMITTED' ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleAssess(claim.id)}
                              className="bg-tertiary/10 text-tertiary border border-tertiary/30 px-2 py-1 rounded text-xs font-bold hover:bg-tertiary/20 transition-colors"
                            >
                              Assess AI
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button onClick={() => handleReview(claim.id, 'APPROVE')} className="text-primary hover:text-primary-container font-bold transition-colors text-xs">
                              Approve
                            </button>
                            <button onClick={() => handleReview(claim.id, 'REJECT')} className="text-error hover:text-error-container font-bold transition-colors text-xs">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Evidence Photos Modal */}
      {selectedClaimForEvidence && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2 text-on-background">
                  <ImageIcon size={20} className="text-primary" />
                  Evidence Photos • Claim #{selectedClaimForEvidence.id.substring(0, 8).toUpperCase()}
                </h3>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Event: <span className="font-semibold capitalize text-on-surface">{selectedClaimForEvidence.event_type}</span> • Incident Date: {selectedClaimForEvidence.incident_date}
                </p>
              </div>
              <button
                onClick={() => setSelectedClaimForEvidence(null)}
                className="p-1.5 rounded-lg hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedClaimForEvidence.evidence_ids?.map((eid, idx) => {
                  const imgUrl = `${apiBase}/files/${eid}`;
                  return (
                    <div key={eid} className="group relative rounded-xl overflow-hidden border border-outline-variant bg-surface">
                      <img
                        src={imgUrl}
                        alt={`Evidence Photo ${idx + 1}`}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="p-2.5 bg-surface text-xs flex justify-between items-center border-t border-outline-variant">
                        <span className="font-mono text-[11px] text-on-surface-variant">Photo {idx + 1}</span>
                        <a
                          href={imgUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-semibold"
                        >
                          Full Size ↗
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedClaimForEvidence.description && (
                <div className="bg-surface p-4 rounded-xl border border-outline-variant text-xs">
                  <p className="font-semibold text-on-surface mb-1">Farmer's Description:</p>
                  <p className="text-on-surface-variant">{selectedClaimForEvidence.description}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface flex justify-end">
              <button
                onClick={() => setSelectedClaimForEvidence(null)}
                className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

