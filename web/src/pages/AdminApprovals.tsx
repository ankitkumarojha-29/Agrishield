import { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  UserCheck, 
  Mail, 
  Calendar, 
  RefreshCw,
  Search,
  Info
} from 'lucide-react';
import { api } from '../api';
import type { PendingAdmin, ActiveAdmin } from '../api';

export default function AdminApprovals() {
  const [pendingAdmins, setPendingAdmins] = useState<PendingAdmin[]>([]);
  const [activeAdmins, setActiveAdmins] = useState<ActiveAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'active'>('pending');

  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [pendingRes, activeRes] = await Promise.allSettled([
        api.getPendingAdmins(),
        api.getActiveAdmins()
      ]);

      if (pendingRes.status === 'fulfilled' && pendingRes.value.success) {
        setPendingAdmins(pendingRes.value.data || []);
      }
      if (activeRes.status === 'fulfilled' && activeRes.value.success) {
        setActiveAdmins(activeRes.value.data || []);
      }
    } catch (err: any) {
      console.error("Error loading admin requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (admin: PendingAdmin) => {
    setProcessingId(admin.id);
    setMessage(null);
    try {
      const res = await api.approveAdmin(admin.id);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `व्यवस्थापक स्वीकृत (Administrator approved): ${admin.name || admin.email} is now an active administrator.`
        });
        loadAdmins();
      } else {
        setMessage({
          type: 'error',
          text: res.error?.message || 'Failed to approve administrator.'
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Approval failed.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (admin: PendingAdmin) => {
    if (!confirm(`Are you sure you want to reject and remove the administrator request for ${admin.email}? This will cancel and permanently purge the request.`)) {
      return;
    }

    setProcessingId(admin.id);
    setMessage(null);
    try {
      const res = await api.rejectAdmin(admin.id);
      if (res.success) {
        setMessage({
          type: 'success',
          text: `अनुरोध रद्द एवं हटाया गया (Request rejected & purged): ${admin.email} has been removed from the database.`
        });
        loadAdmins();
      } else {
        setMessage({
          type: 'error',
          text: res.error?.message || 'Failed to reject administrator.'
        });
      }
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error?.message || err.message || 'Rejection failed.'
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredPending = pendingAdmins.filter(a => {
    const q = search.toLowerCase().trim();
    return !q || (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  const filteredActive = activeAdmins.filter(a => {
    const q = search.toLowerCase().trim();
    return !q || (
      (a.name && a.name.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
              Admin Credential Governance
            </span>
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Clock size={13} className="text-amber-500" /> 7-Day Auto-Purge Protocol
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Administrator Access Requests (व्यवस्थापक अनुमोदन)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            Review, authorize, or cancel administrator credentials requested by nodal officers and agronomists.
          </p>
        </div>

        <button
          onClick={loadAdmins}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs md:text-sm font-semibold rounded-xl shadow-xs transition-colors self-start md:self-auto"
        >
          <RefreshCw size={15} className={loading ? "animate-spin text-sky-600" : "text-slate-500"} />
          <span>Refresh Requests</span>
        </button>
      </div>

      {/* 7-Day Auto-Purge Policy Alert */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-3.5 text-xs text-amber-950">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
          <Info size={18} />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-sm mb-0.5">
            7-Day Auto-Cancellation &amp; Database Purge Rule (1-सप्ताह स्वतः रद्दीकरण नियम)
          </h4>
          <p className="text-amber-900/80 leading-relaxed">
            All prospective administrators submit their Email ID and credentials for approval. 
            If a request is not approved by an existing administrator within <strong>7 days (1 week)</strong>, 
            it is automatically cancelled and cleaned from the database. 
            Applicants must re-apply after that week has elapsed.
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {message && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
          message.type === 'success' 
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl self-start">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={14} className={activeTab === 'pending' ? 'text-amber-500' : 'text-slate-400'} />
            <span>Pending Approvals</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              pendingAdmins.length > 0 
                ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                : 'bg-slate-200 text-slate-600'
            }`}>
              {pendingAdmins.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'active'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck size={14} className={activeTab === 'active' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>Active Administrators</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
              {activeAdmins.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Tab 1: Pending Approvals */}
      {activeTab === 'pending' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Pending Administrator Applications
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review credentials and authorize before the 7-day TTL expiration.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {filteredPending.length} request(s) awaiting review
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400 font-medium">Checking pending applications...</p>
            </div>
          ) : filteredPending.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <UserCheck size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="font-semibold text-slate-700 text-sm mb-1">No Pending Admin Requests</p>
              <p className="text-slate-400">
                All submitted administrator applications have either been reviewed or automatically cleaned after 7 days.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-5">Applicant Name</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Requested Date</th>
                    <th className="py-3 px-4">Auto-Clean Countdown</th>
                    <th className="py-3 px-5 text-right">Administrative Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPending.map((admin) => (
                    <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-xs">
                            {(admin.name || admin.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <span>{admin.name || 'Nodal Candidate'}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">Role: Admin Candidate</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-mono text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Mail size={13} className="text-slate-400" />
                          <span>{admin.email}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <span>{admin.created_at ? admin.created_at.split('T')[0] : 'Today'}</span>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock size={12} className="text-amber-600" />
                          <span>
                            {admin.days_left}d {admin.hours_left}h left
                          </span>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Auto-cancels after 7 days
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(admin)}
                            disabled={processingId === admin.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} />
                            <span>Approve Admin</span>
                          </button>

                          <button
                            onClick={() => handleReject(admin)}
                            disabled={processingId === admin.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-red-200 hover:bg-red-50 text-red-700 rounded-xl font-semibold text-xs transition-colors disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            <span>Reject &amp; Purge</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Active Administrators */}
      {activeTab === 'active' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Active System Administrators
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Personnel authorized to oversee regional farm telemetry and approve new administrator accounts.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {filteredActive.length} authorized admin(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-3 px-5">Administrator Name</th>
                  <th className="py-3 px-4">Email ID</th>
                  <th className="py-3 px-4">Authorization Status</th>
                  <th className="py-3 px-4">Registration Date</th>
                  <th className="py-3 px-5 text-right">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActive.map((admin) => (
                  <tr key={admin.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                          {(admin.name || 'Admin')[0].toUpperCase()}
                        </div>
                        <div>
                          <span>{admin.name}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">System Administrator</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-700">
                      <div className="flex items-center gap-1.5">
                        <Mail size={13} className="text-slate-400" />
                        <span>{admin.email}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        Approved &amp; Active
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-500">
                      {admin.created_at ? admin.created_at.split('T')[0] : '2026-01-01'}
                    </td>

                    <td className="py-4 px-5 text-right">
                      <span className="text-[11px] font-semibold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200">
                        Full Command &amp; Approval
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
