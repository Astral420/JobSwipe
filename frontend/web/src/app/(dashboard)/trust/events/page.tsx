'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useTrustEvents } from '@/lib/hooks';
import { TrustEvent } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Shield, TrendingUp, TrendingDown, Minus, Building } from 'lucide-react';

export default function TrustEventsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTrustEvents(page, 20);

  const columns: ColumnDef<TrustEvent>[] = [
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-800">
              {event.company?.logoUrl ? (
                <img src={event.company.logoUrl} alt={event.company.name} className="h-full w-full object-cover rounded-lg" />
              ) : (
                <Building className="h-4 w-4 text-zinc-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{event.company?.name || 'Unknown'}</p>
              <p className="text-xs text-zinc-500">{event.type.replace('_', ' ')}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'scoreChange',
      header: 'Change',
      cell: ({ row }) => {
        const change = row.original.scoreChange;
        return (
          <div className="flex items-center gap-2">
            {change > 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : change < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <Minus className="h-4 w-4 text-zinc-500" />
            )}
            <span className={`text-sm font-medium ${change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
              {change > 0 ? '+' : ''}{change}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'scoreAfter',
      header: 'New Score',
      cell: ({ row }) => {
        const score = row.original.scoreAfter;
        return (
          <div className="flex items-center gap-2">
            <div className="h-16 w-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ height: `${score}%` }}
              />
            </div>
            <span className="text-sm text-zinc-300">{score}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{row.original.description}</span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Trust Events</h1>
        <p className="mt-1 text-sm text-zinc-400">Track trust score changes across companies</p>
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
          title: 'No trust events found',
          description: 'Trust events will appear here as they occur.',
        }}
      />
    </div>
  );
}
