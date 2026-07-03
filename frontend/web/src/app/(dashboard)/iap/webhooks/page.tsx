'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { useWebhookEvents, useRetryWebhook } from '@/lib/hooks';
import { formatDateTime } from '@/lib/utils';
import { WebhookEvent } from '@/types';
import { RefreshCw, Webhook, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function WebhooksPage() {
  const [page, setPage] = useState(1);
  const retryWebhook = useRetryWebhook();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading } = useWebhookEvents(page, 20);

  const columns: ColumnDef<WebhookEvent>[] = [
    {
      accessorKey: 'event',
      header: 'Event',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-zinc-200 font-mono text-sm">{row.original.event}</p>
          <p className="text-xs text-zinc-500">{row.original.id}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'attempts',
      header: 'Attempts',
      cell: ({ row }) => (
        <span className={`text-sm ${row.original.attempts >= 5 ? 'text-red-400 font-medium' : 'text-zinc-400'}`}>
          {row.original.attempts}
        </span>
      ),
    },
    {
      accessorKey: 'lastAttemptAt',
      header: 'Last Attempt',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">
          {row.original.lastAttemptAt ? formatDateTime(row.original.lastAttemptAt) : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const webhook = row.original;
        const canRetry = webhook.status === 'failed' || webhook.status === 'pending';
        return (
          <Button
            variant="ghost"
            size="sm"
            disabled={!canRetry || retryingId === webhook.id}
            onClick={async () => {
              setRetryingId(webhook.id);
              try {
                await retryWebhook.mutateAsync(webhook.id);
              } finally {
                setRetryingId(null);
              }
            }}
          >
            <RefreshCw className={`h-4 w-4 ${retryingId === webhook.id ? 'animate-spin' : ''}`} />
          </Button>
        );
      },
    },
  ];

  const stats = {
    total: data?.total ?? 0,
    delivered: data?.data?.filter((w) => w.status === 'delivered').length ?? 0,
    failed: data?.data?.filter((w) => w.status === 'failed').length ?? 0,
    pending: data?.data?.filter((w) => w.status === 'pending').length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Webhook Events</h1>
        <p className="mt-1 text-sm text-zinc-400">Monitor and retry webhook deliveries</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <Webhook className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-lg font-semibold text-zinc-200">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-xs text-zinc-500">Delivered</p>
              <p className="text-lg font-semibold text-zinc-200">{stats.delivered}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs text-zinc-500">Pending</p>
              <p className="text-lg font-semibold text-zinc-200">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs text-zinc-500">Failed</p>
              <p className="text-lg font-semibold text-zinc-200">{stats.failed}</p>
            </div>
          </div>
        </div>
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
          title: 'No webhook events found',
          description: 'Webhook events will appear here as they are triggered.',
        }}
      />
    </div>
  );
}
