import { Download, TrendingUp, BarChart2, Calendar } from 'lucide-react';

export default function Reports() {
  return (
    <div className="flex-1 p-8 max-w-[1440px] mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-background">Reports & Analytics</h2>
          <p className="text-base text-on-surface-variant mt-1">Generate and export platform insights and PMFBY compliance reports.</p>
        </div>
        <button className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm hover:bg-surface-tint transition-colors shadow-sm flex items-center gap-2 font-semibold">
          <Download size={18} />
          Export All Data
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <ReportCard title="Claim Payout Velocity" value="4.2 Days" trend="-12%" icon={TrendingUp} color="text-tertiary" bg="bg-tertiary-container/30" />
        <ReportCard title="Total Claims Assessment" value="1,248" trend="+5%" icon={BarChart2} color="text-secondary" bg="bg-secondary-container/30" />
        <ReportCard title="Upcoming Renewals" value="342" trend="This Month" icon={Calendar} color="text-primary" bg="bg-primary-container/30" />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-6">Generated Reports</h3>
        <div className="space-y-4">
          <ReportRow name="PMFBY District Compliance Summary - Q2" date="Aug 14, 2026" type="PDF" size="2.4 MB" />
          <ReportRow name="AI Confidence Threshold Audit" date="Aug 10, 2026" type="CSV" size="156 KB" />
          <ReportRow name="Monthly Claim Payouts Ledger" date="Aug 01, 2026" type="XLSX" size="1.1 MB" />
          <ReportRow name="Satellite Imagery Assessment Log" date="Jul 28, 2026" type="PDF" size="8.4 MB" />
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, value, trend, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-2xl flex items-center gap-4 shadow-sm">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${bg} ${color}`}>
        <Icon size={28} />
      </div>
      <div>
        <p className="text-sm font-medium text-on-surface-variant mb-1">{title}</p>
        <div className="flex items-end gap-2">
          <h4 className="text-2xl font-bold">{value}</h4>
          <span className={`text-xs font-bold mb-1 ${trend.includes('-') ? 'text-primary' : 'text-error'}`}>{trend}</span>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ name, date, type, size }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-surface rounded-xl border border-outline-variant hover:bg-surface-variant/50 transition-colors cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="bg-surface-container-high w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs text-on-surface-variant">
          {type}
        </div>
        <div>
          <p className="font-semibold text-on-surface group-hover:text-primary transition-colors">{name}</p>
          <p className="text-xs text-on-surface-variant mt-0.5">{date} • {size}</p>
        </div>
      </div>
      <button className="text-tertiary p-2 rounded-full hover:bg-tertiary-container/50 transition-colors">
        <Download size={20} />
      </button>
    </div>
  );
}
