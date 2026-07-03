'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useSubscriptions, useCancelSubscription } from '@/lib/hooks';
import { Subscription } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Eye, XCircle, CreditCard, Building } from 'lucide-react';

export default function SubscriptionsPage() {
  const [filters, setFilters] = useState({ status: '', tier: '' });
  const [page, setPage] = useState(1);
  const [selectedSubscription, setSelectedSubscription] = useState<{ subscription: Subscription; action: 'cancel' } | null>(null);

  const { data, isLoading } = useSubscriptions(filters, page, 20);
  const cancelSubscription = useCancelSubscription();

  const columns: ColumnDef<Subscription>[] = [
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              {sub.company?.logoUrl ? (
                <img src={sub.company.logoUrl} alt={sub.company.name} className="h-full w-full object-cover rounded-lg" />
              ) : (
                <Building className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{sub.company?.name || 'Unknown'}</p>
              <p className="text-xs text-zinc-500">{sub.company?.id}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'tier',
      header: 'Tier',
      cell: ({ row }) => (
        <span className="capitalize text-zinc-300">{row.original.tier}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className="text-zinc-300">{formatCurrency(row.original.amount, row.original.currency)}</span>
      ),
    },
    {
      accessorKey: 'currentPeriodEnd',
      header: 'Renews',
      cell: ({ row }) => (
        <span className="text-zinc-400">{formatDateTime(row.original.currentPeriodEnd)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const sub = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/subscriptions/${sub.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {sub.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSubscription({ subscription: sub, action: 'cancel' })}
              >
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'past_due', label: 'Past Due' },
    { value: 'trialing', label: 'Trialing' },
  ];

  const tierOptions = [
    { value: '', label: 'All Tiers' },
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedSubscription) return;
    try {
      await cancelSubscription.mutateAsync({
        subscriptionId: selectedSubscription.subscription.id,
        reason: 'Admin cancelled',
      });
    } finally {
      setSelectedSubscription(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Subscriptions</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage platform subscriptions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          options={statusOptions}
          className="w-40"
        />
        <Select
          value={filters.tier}
          onChange={(e) => setFilters((prev) => ({ ...prev, tier: e.target.value }))}
          options={tierOptions}
          className="w-40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={
          data
            ? {
                pageIndex: page,
                pageSize: 20,
                totalItems: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
        emptyState={{
          title: 'No subscriptions found',
          description: 'Try adjusting your filters.',
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        onConfirm={handleConfirmAction}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel this subscription? The company will lose access to premium features at the end of their billing period.`}
        variant="danger"
        confirmText="Cancel Subscription"
        isLoading={cancelSubscription.isPending}
      />
    </div>
  );
}
