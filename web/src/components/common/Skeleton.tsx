import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base low-fidelity placeholder with smooth shimmer animation
 */
export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-slate-200/80 rounded-md ${className}`}
      {...props}
    />
  );
}

/**
 * High-fidelity Skeleton for KPI / Stat Metric Cards (used in Dashboard & Reports)
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-7 w-32 rounded-lg" />
        </div>
        <Skeleton className="w-11 h-11 rounded-xl" />
      </div>
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>
    </div>
  );
}

/**
 * High-fidelity Table Skeleton for tabular data (Farmers registry, Mandi rates, Admin approvals)
 */
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="w-full">
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="px-5 py-4 flex items-center gap-4 justify-between animate-pulse">
            <div className="flex items-center gap-3 w-1/4">
              <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              <div className="space-y-1.5 w-full">
                <Skeleton className="h-3.5 w-3/4 rounded-md" />
                <Skeleton className="h-2.5 w-1/2 rounded-md" />
              </div>
            </div>
            {Array.from({ length: columns - 2 }).map((_, cIdx) => (
              <div key={cIdx} className="hidden sm:block flex-1 px-2">
                <Skeleton className="h-3 w-3/5 rounded-md" />
              </div>
            ))}
            <div className="w-20 flex justify-end">
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Dashboard Skeleton mirroring AgriShield Dashboard layout (Admin & Farmer modes)
 */
export function DashboardSkeleton({ role = 'farmer' }: { role?: 'farmer' | 'admin' }) {
  const isAdmin = role === 'admin';

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Banner / Welcome Bar Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-64 md:w-80 rounded-xl" />
          <Skeleton className="h-4 w-72 md:w-96 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          {isAdmin && <Skeleton className="h-10 w-28 rounded-xl" />}
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Main Content Split: Telemetry Card & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side (8 Cols): Satellite or Overview Card */}
        <div className="lg:col-span-8 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3 w-64 rounded-md" />
            </div>
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-2">
              <Skeleton className="h-3 w-16 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          </div>

          <div className="h-36 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-end gap-3 justify-between">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton
                key={i}
                className="w-full rounded-t-md"
                style={{ height: `${25 + (i * 17) % 65}%` }}
              />
            ))}
          </div>
        </div>

        {/* Right Side (4 Cols): Weather or Quick Actions */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
          <div className="pt-2">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Farm Detail Skeleton for Sentinel-2, GIS polygon, and agro-weather inspection
 */
export function FarmDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
          </div>
          <Skeleton className="h-8 w-64 md:w-80 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Grid: 8 Cols Satellite / Map + 4 Cols Weather */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-44 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-xl" />
            </div>
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <Skeleton className="h-5 w-36 rounded-lg" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

