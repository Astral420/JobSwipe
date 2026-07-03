'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Select } from '@/components/shared/Input';
import { useIAPTransactions } from '@/lib/hooks';
import { IAPTransaction } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { ShoppingCart, User, CreditCard } from 'lucide-react';

export default function TransactionsPage() {
  const [filters, setFilters] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useIAPTransactions(filters, page, 20);

  const columns: ColumnDef<IAPTransaction>[] = [
    {
      accessorKey: 'product',
      header: 'Transaction',
      cell: ({ row }) => {
        const tx = row.original;
        return (
          <div>
            <p className="font-medium text-zinc-200">{tx.productName}</p>
            <p className="text-xs text-zinc-500">{tx.user?.name || tx.userId}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm capitalize text-zinc-300">{row.original.type}</span>
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
      accessorKey: 'paymentProvider',
      header: 'Provider',
      cell: ({ row }) => (
        <span className="text-sm capitalize text-zinc-400">{row.original.paymentProvider}</span>
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

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
    { value: 'refunded', label: 'Refunded' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'refund', label: 'Refund' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'credit', label: 'Credit' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Transactions</h1>
        <p className="mt-1 text-sm text-zinc-400">In-app purchase transactions</p>
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
          value={filters.type}
          onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
          options={typeOptions}
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
          title: 'No transactions found',
          description: 'Try adjusting your filters.',
        }}
      />
    </div>
  );
}
