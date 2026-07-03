'use client';

import { useParams } from 'next/navigation';
import { useSubscription } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { ArrowLeft, CreditCard, Building, DollarSign, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/shared/Button';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const subscriptionId = params.id as string;

  const { data: subscription, isLoading } = useSubscription(subscriptionId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-400">Subscription not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/subscriptions">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Subscription Details</h1>
          <p className="text-sm text-zinc-400">{subscription.id}</p>
        </div>
      </div>

      {/* Main Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subscription Card */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-100 capitalize">{subscription.tier} Plan</h2>
              <p className="text-sm text-zinc-400">{subscription.company?.name || 'Unknown company'}</p>
            </div>
            <StatusBadge status={subscription.status} />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-4">
              <DollarSign className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Amount</p>
                <p className="text-lg font-semibold text-zinc-200">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-4">
              <Calendar className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Current Period</p>
                <p className="text-sm font-medium text-zinc-200">
                  {formatDateTime(subscription.currentPeriodStart)} - {formatDateTime(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>

          {subscription.cancelReason && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 ring-1 ring-inset ring-red-500/20">
              <p className="text-sm text-red-400">
                <span className="font-medium">Cancellation reason:</span> {subscription.cancelReason}
              </p>
              {subscription.cancelledAt && (
                <p className="mt-1 text-xs text-red-500">Cancelled on {formatDateTime(subscription.cancelledAt)}</p>
              )}
            </div>
          )}

          {subscription.cancelAtPeriodEnd && (
            <div className="mt-4 rounded-lg bg-amber-500/10 p-3 ring-1 ring-inset ring-amber-500/20">
              <p className="text-sm text-amber-400">
                This subscription is scheduled to cancel at the end of the billing period.
              </p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">Payment Method</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {subscription.paymentMethod || 'Not specified'}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-semibold text-zinc-100">Created</h3>
            <p className="mt-2 text-sm text-zinc-400">
              {formatDateTime(subscription.createdAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
