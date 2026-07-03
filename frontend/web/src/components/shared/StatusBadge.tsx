'use client';

import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  className?: string;
  children?: ReactNode;
}

const statusStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  warning: 'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  danger: 'bg-red-500/15 text-red-400 ring-red-500/20',
  info: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
  neutral: 'bg-zinc-500/15 text-zinc-400 ring-zinc-500/20',
};

const statusDotStyles: Record<StatusVariant, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-zinc-400',
};

function getStatusVariant(status: string): StatusVariant {
  const lowerStatus = status?.toLowerCase();
  if (['active', 'approved', 'verified', 'published', 'completed', 'paid', 'delivered', 'accepted', 'high'].includes(lowerStatus)) {
    return 'success';
  }
  if (['pending', 'processing', 'retrying', 'medium', 'trialing', 'established'].includes(lowerStatus)) {
    return 'warning';
  }
  if (['banned', 'suspended', 'removed', 'failed', 'cancelled', 'expired', 'rejected', 'deleted', 'flagged', 'low', 'past_due'].includes(lowerStatus)) {
    return 'danger';
  }
  if (['active', 'new', 'triaging'].includes(lowerStatus)) {
    return 'info';
  }
  return 'neutral';
}

export function StatusBadge({ status, variant, className, children }: StatusBadgeProps) {
  const computedVariant = variant ?? getStatusVariant(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset',
        statusStyles[computedVariant],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', statusDotStyles[computedVariant])} />
      {children ?? status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  );
}
