'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-zinc-800', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="mt-4 h-8 w-1/2" />
      <Skeleton className="mt-2 h-3 w-1/3" />
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="rounded-lg border border-zinc-800">
      <div className="border-b border-zinc-800 p-4">
        <Skeleton className="h-4 w-full" />
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-b border-zinc-800 p-4">
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
