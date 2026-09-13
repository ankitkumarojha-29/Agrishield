import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Filter, 
  CheckCircle2, 
  CloudRain, 
  Droplets, 
  Bug, 
  Radio, 
  Send, 
  X,
  RefreshCw,
  Trash2,
  CheckCheck,
  Sprout,
  Shield,
  Wind,
  Flame,
  Snowflake
} from 'lucide-react';
import { useUserRole } from '../context/RoleContext';
import { api } from '../api';
import { CROPS_CATALOG, fetchCropsCatalog, type CropInfo } from '../data/agriCatalog';

export interface AlertItem {
  id: string;
  category: 'weather' | 'disease' | 'irrigation' | 'system';
  severity: 'critical' | 'warning' | 'advisory';
  title: string;
  threat_hi: string;
  threat_en: string;
  action_hi: string;
  action_en: string;
  timestamp: string;
  read: boolean;
}

export default function Alerts() {
  const { role } = useUserRole();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [scanning, setScanning] = useState<boolean>(false);
  const [clearing, setClearing] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'advisory'>('all');
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Admin Broadcast Composer state
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastAction, setBroadcastAction] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'critical' | 'warning' | 'advisory'>('warning');
  const [targetCrop, setTargetCrop] = useState('All Crops');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);
  const [cropsList, setCropsList] = useState<CropInfo[]>(CROPS_CATALOG);

  useEffect(() => {
    fetchCropsCatalog().then(data => {
      if (data && data.length > 0) setCropsList(data);
    });
  }, []);

  useEffect(() => {
    loadAlerts();

    const handleSync = () => {
      loadAlerts();
    };
    window.addEventListener('agrishield:notifications-updated', handleSync);
    return () => {
      window.removeEventListener('agrishield:notifications-updated', handleSync);
    };
  }, [role]);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      if (res.success && Array.isArray(res.data)) {
        const mapped: AlertItem[] = res.data.map((n: any) => {
          let category: 'weather' | 'disease' | 'irrigation' | 'system' = n.category || 'weather';
          let severity: 'critical' | 'warning' | 'advisory' = n.severity || 'warning';

          // Format relative or friendly timestamp
          let timeDisplay = 'अभी (Just now)';
          if (n.created_at) {
            try {
              const diffMs = Date.now() - new Date(n.created_at).getTime();
              const diffMins = Math.floor(diffMs / 60000);
              const diffHours = Math.floor(diffMins / 60);
              const diffDays = Math.floor(diffHours / 24);
              if (diffMins < 2) timeDisplay = 'अभी (Just now)';
              else if (diffMins < 60) timeDisplay = `${diffMins} मिनट पहले (${diffMins}m ago)`;
              else if (diffHours < 24) timeDisplay = `${diffHours} घंटे पहले (${diffHours}h ago)`;
              else timeDisplay = `${diffDays} दिन पहले (${diffDays}d ago)`;
            } catch (e) {
              timeDisplay = 'हाल ही में';
            }
          }

          return {
            id: n.id,
            category,
            severity,
            title: n.title || 'कृषि व मौसम अलर्ट',
            threat_hi: n.threat_hi || n.message || 'खेत की स्थिति अद्यतित की गई है।',
            threat_en: n.threat_en || 'Field and meteorological telemetry monitored.',
            action_hi: n.action_hi || 'कृषि सलाह अनुसार आवश्यक कदम उठाएं।',
            action_en: n.action_en || 'Follow agronomic advisory steps.',
            timestamp: timeDisplay,
            read: !!n.is_read || !!n.read,
          };
        });
        setAlerts(mapped);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleScanFarms = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await api.scanFarmNotifications();
      if (res.success) {
        setScanMessage(res.data?.message || 'सभी पंजीकृत खेतों की सेटेलाइट व मौसम जांच पूर्ण हुई!');
        await loadAlerts();
        setTimeout(() => setScanMessage(null), 5000);
      }
    } catch (e) {
      console.error('Scan error:', e);
      setScanMessage('जांच में त्रुटि हुई। कृपया पुनः प्रयास करें।');
    } finally {
      setScanning(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setAlerts(prev => prev.map(a => ({ ...a, read: true })));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (e) {
      console.error('Mark all read error:', e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('क्या आप सभी देखे गए अलर्ट साफ (Clear) करना चाहते हैं?')) return;
    setClearing(true);
    try {
      await api.clearAllNotifications();
      setAlerts([]);
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (e) {
      console.error('Clear notifications error:', e);
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (e) {
      console.error('Delete notification error:', e);
    }
  };

  const handleToggleRead = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    try {
      await api.markNotificationRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
      window.dispatchEvent(new CustomEvent('agrishield:notifications-updated'));
    } catch (e) {
      console.error('Read toggle error:', e);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setBroadcasting(true);
    setBroadcastSuccess(null);
    try {
      const res = await api.broadcastAlert({
        title: broadcastTitle.trim(),
        message: `${broadcastMessage.trim()} - Action: ${broadcastAction.trim()}`,
        severity: broadcastSeverity,
        target_crop: targetCrop === 'All Crops' ? undefined : targetCrop
      });

      setBroadcastSuccess(`चेतावनी सफलतापूर्वक सभी पंजीकृत किसानों को प्रसारित की गई (Broadcast dispatched to ${res.data?.recipients_count || 'all'} registered farmers).`);
      await loadAlerts();
      setTimeout(() => {
        setIsBroadcastModalOpen(false);
        setBroadcastTitle('');
        setBroadcastMessage('');
        setBroadcastAction('');
        setBroadcastSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error("Broadcast failed", err);
    } finally {
      setBroadcasting(false);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'all') return true;
    return a.severity === filter;
  });

  const getAlertIcon = (alert: AlertItem) => {
    const t = alert.title.toLowerCase();
    if (t.includes('चक्रवात') || t.includes('cyclone') || t.includes('हवा') || t.includes('wind')) {
      return <Wind size={22} />;
    }
    if (t.includes('गर्मी') || t.includes('heat') || t.includes('लू')) {
      return <Flame size={22} />;
    }
    if (t.includes('पाला') || t.includes('frost') || t.includes('शीत')) {
      return <Snowflake size={22} />;
    }
    if (t.includes('बाढ़') || t.includes('rain') || t.includes('बारिश') || alert.category === 'weather') {
      return <CloudRain size={22} />;
    }
    if (alert.category === 'irrigation' || t.includes('सिंचाई')) {
      return <Droplets size={22} />;
    }
    if (alert.category === 'disease' || t.includes('रतुआ') || t.includes('कीट') || t.includes('ndvi')) {
      return <Bug size={22} />;
    }
    if (t.includes('किसान') || t.includes('farmer')) {
      return <Sprout size={22} />;
    }
    return <ShieldAlert size={22} />;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
              role === 'admin'
                ? 'text-sky-800 bg-sky-50 border-sky-200'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            }`}>
              {role === 'admin' ? '🛡️ Admin Dispatch & Activity Center' : 'पूर्व चेतावनी और सुरक्षा / Early Warning System'}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              24x7 ऑटो-निगरानी सक्रिय
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {role === 'admin' ? 'Administrative Alerts & Broadcast Console' : 'फसल सुरक्षा व आपदा चेतावनियां (Farm Alerts)'}
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1">
            {role === 'admin'
              ? 'New farmer registrations, admin approval requests, claim notices, and regional crop hazard dispatches.'
              : 'उपग्रह (Sentinel-2), मौसम रडार और मिट्टी नमी सेंसर द्वारा आपके पंजीकृत खेतों के लिए वास्तविक समय अलर्ट।'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scan farms on demand button */}
          {role !== 'admin' && (
            <button
              onClick={handleScanFarms}
              disabled={scanning}
              className="text-xs font-bold px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
              <span>{scanning ? 'खेतों की जांच जारी...' : '🔄 ताज़ा जांच करें (Scan Farms)'}</span>
            </button>
          )}

          {/* Admin Broadcast Button */}
          {role === 'admin' && (
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Radio size={16} /> नई चेतावनी प्रसारित करें (Broadcast Alert)
            </button>
          )}

          {/* Mark all as read */}
          {alerts.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <CheckCheck size={14} className="text-emerald-600" />
              <span>सब पढ़ लिया</span>
            </button>
          )}

          {/* Clean up / Clear all */}
          {alerts.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="text-xs font-bold px-3 py-2 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} className="text-rose-600" />
              <span>अलर्ट साफ करें (Clear)</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time status feedback toast */}
      {scanMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* BILINGUAL AUTOMATED PROTECTION BANNER */}
      <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
        role === 'admin'
          ? 'bg-sky-50/70 border-sky-200 text-sky-950'
          : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            role === 'admin' ? 'bg-sky-600 text-white' : 'bg-emerald-700 text-white'
          }`}>
            {role === 'admin' ? <Shield size={20} /> : <Sprout size={20} />}
          </div>
          <div className="text-xs leading-relaxed">
            <p className="font-extrabold text-sm">
              {role === 'admin' 
                ? 'व्यवस्थापक नियंत्रण एवं किसान गतिविधि निगरानी' 
                : '24x7 स्वचालित कृषि व आपदा सुरक्षा प्रणाली (Automated Farm Protection)'}
            </p>
            <p className="text-slate-600 mt-0.5">
              {role === 'admin'
                ? 'नए किसान पंजीकरण, 7-दिवसीय व्यवस्थापक अनुमोदन अनुरोध और क्षेत्रीय मौसम अलर्ट यहां स्वतः संकलित होते हैं।'
                : 'आपके पंजीकृत खेतों की Sentinel-2 उपग्रह, मौसम रडार और मिट्टी नमी सेंसर द्वारा स्वतः निगरानी की जा रही है। किसी भी आपदा (बाढ़, चक्रवात, NDVI गिरावट) या सिंचाई आवश्यकता पर अलर्ट स्वतः भेजा जाता है।'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1 mr-2">
          <Filter size={14} /> श्रेणी:
        </span>
        {[
          { id: 'all', label: `सभी (${alerts.length})` },
          { id: 'critical', label: `🚨 गंभीर खतरे (${alerts.filter(a => a.severity === 'critical').length})` },
          { id: 'warning', label: `⚠️ मौसम व सिंचाई (${alerts.filter(a => a.severity === 'warning').length})` },
          { id: 'advisory', label: `ℹ️ सामान्य रिपोर्ट (${alerts.filter(a => a.severity === 'advisory').length})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-full font-bold transition-all cursor-pointer ${
              filter === tab.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      {loading ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-slate-500 text-xs">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="font-bold text-slate-700">अलर्ट लोड हो रहे हैं...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-3xl p-10 md:p-14 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 size={36} />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-lg font-extrabold text-slate-900">
              {role === 'admin' 
                ? 'कोई नया व्यवस्थापक अलर्ट नहीं (No Admin Alerts)'
                : 'सभी पंजीकृत खेत सुरक्षित हैं (All Farms Safe & Optimal)'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {role === 'admin'
                ? 'वर्तमान में कोई लंबित अनुमोदन अनुरोध या अप्रत्याशित आपदा अलर्ट नहीं है।'
                : 'आपके खेतों में मिट्टी की नमी, तापमान और उपग्रह स्वास्थ्य (NDVI) बिल्कुल संतुलित है। कोई चक्रवात या भारी वर्षा का खतरा नहीं है।'}
            </p>
          </div>
          {role !== 'admin' && (
            <button
              onClick={handleScanFarms}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
              <span>खेतों की पुनः जांच करें (Scan My Farms Now)</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div 
              key={alert.id}
              className={`bg-white border-2 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
                alert.read ? 'border-slate-200/80 bg-slate-50/40 opacity-80' : 'border-emerald-300 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${
                    alert.severity === 'critical' 
                      ? 'bg-red-50 text-red-600 border border-red-200' 
                      : alert.severity === 'warning'
                      ? 'bg-amber-50 text-amber-600 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  }`}>
                    {getAlertIcon(alert)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                        alert.severity === 'critical'
                          ? 'bg-red-100 text-red-800'
                          : alert.severity === 'warning'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {alert.severity === 'critical' ? 'गंभीर चेतावनी' : alert.severity === 'warning' ? 'मौसम व सिंचाई' : 'सलाह व रिपोर्ट'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">• {alert.timestamp}</span>
                      {!alert.read && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                          नया (Unread)
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 mt-1">
                      {alert.title}
                    </h3>
                  </div>
                </div>

                {/* Card Top Actions: Read toggle & Delete/Clean button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleToggleRead(alert.id)}
                    className="text-xs font-semibold text-slate-500 hover:text-emerald-700 whitespace-nowrap cursor-pointer px-2 py-1 rounded-md hover:bg-slate-100"
                    title={alert.read ? "पढ़ा हुआ" : "पढ़ा हुआ चिह्नित करें"}
                  >
                    {alert.read ? '✓ देखा गया' : 'निशान लगाएं'}
                  </button>
                  <button
                    onClick={() => handleDeleteAlert(alert.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="हटाएं (Dismiss)"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* TWO CLEAR BILINGUAL BOXES: THE RISK & ACTION TO TAKE */}
              <div className="grid md:grid-cols-2 gap-3 mt-1">
                {/* Box 1: क्या खतरा है */}
                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-extrabold uppercase tracking-wider text-[11px]">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>विवरण व खतरा (Condition / Risk):</span>
                  </div>
                  <p className="text-amber-950 font-medium leading-relaxed">
                    {alert.threat_hi}
                  </p>
                  <p className="text-amber-800/80 text-[11px] italic leading-tight pt-1">
                    {alert.threat_en}
                  </p>
                </div>

                {/* Box 2: किसान क्या करें */}
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-900 font-extrabold uppercase tracking-wider text-[11px]">
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                    <span>अनुशंसित कदम (Action To Take):</span>
                  </div>
                  <p className="text-emerald-950 font-bold leading-relaxed">
                    {alert.action_hi}
                  </p>
                  <p className="text-emerald-800/80 text-[11px] italic leading-tight pt-1">
                    {alert.action_en}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Broadcast Composer Modal */}
      {isBroadcastModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">Broadcast Agricultural Warning</h3>
              </div>
              <button 
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {broadcastSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>{broadcastSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleBroadcastSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Warning Title / चेतावनी शीर्षक:</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. ⚠️ भारी बारिश व आंधी अलर्ट / Severe Weather"
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Severity Level:</label>
                    <select
                      value={broadcastSeverity}
                      onChange={(e) => setBroadcastSeverity(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="warning">⚠️ Warning (चेतावनी)</option>
                      <option value="critical">🚨 Critical (गंभीर खतरा)</option>
                      <option value="advisory">ℹ️ Advisory (सामान्य सलाह)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target Crop / फसल:</label>
                    <select
                      value={targetCrop}
                      onChange={(e) => setTargetCrop(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="All Crops">सभी फसलें (All Crops)</option>
                      {cropsList.map(c => (
                        <option key={c.id} value={`${c.name} (${c.hindi})`}>
                          {c.icon} {c.name} ({c.hindi})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Threat Description / क्या खतरा है:</label>
                  <textarea
                    required
                    rows={2}
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="Describe the meteorological or pest threat..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Action Required / किसान क्या करें:</label>
                  <textarea
                    rows={2}
                    value={broadcastAction}
                    onChange={(e) => setBroadcastAction(e.target.value)}
                    placeholder="Recommended farmer mitigation action or spraying..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBroadcastModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={broadcasting}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    {broadcasting ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send size={14} />
                    )}
                    <span>Broadcast Now (प्रसारित करें)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
