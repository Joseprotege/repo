import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Single pulsing placeholder block */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />
);

/** Skeleton that looks like a ListingCard */
export const ListingCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
    <Skeleton className="h-44 w-full rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  </div>
);

/** Skeleton for a 3-column listing grid */
export const ListingGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ListingCardSkeleton key={i} />
    ))}
  </div>
);

/** Full-page loading indicator shown while Supabase data first loads */
export const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-32 gap-4">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center shadow-md animate-pulse">
      <span className="text-white font-black text-xl leading-none">F</span>
    </div>
    <p className="text-slate-400 text-sm animate-pulse">Loading Foster…</p>
  </div>
);
