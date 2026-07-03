'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { useMatches, useMatchStats } from '@/lib/hooks';
import { Match } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { UserCheck, User, Briefcase, Building, TrendingUp } from 'lucide-react';

export default function MatchesPage() {
  const [filters, setFilters] = useState({ status: '' });
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useMatchStats();
  const { data, isLoading } = useMatches(filters, page, 20);

  const columns: ColumnDef<Match>[] = [
    {
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => {
        const match = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {match.user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{match.user?.name || 'Unknown'}</p>
              <p className="text-xs text-zinc-500">{match.user?.email || ''}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'job',
      header: 'Job',
      cell: ({ row }) => {
        const match = row.original;
        return (
          <div>
            <p className="font-medium text-zinc-200">{match.job?.title || 'Unknown job'}</p>
            <p className="text-xs text-zinc-500">{match.company?.name || 'Unknown company'}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'matchScore',
      header: 'Match Score',
      cell: ({ row }) => {
        const score = row.original.matchScore;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {score}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'appliedAt',
      header: 'Applied',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{formatDateTime(row.original.appliedAt)}</span>
      ),
    },
    {
      accessorKey: 'expiresAt',
      header: 'Expires',
      cell: ({ row }) => {
        const expires = new Date(row.original.expiresAt);
        const isExpiringSoon = expires.getTime() - Date.now() < 24 * 60 * 60 * 1000;
        return (
          <span className={`text-sm ${isExpiringSoon ? 'text-red-400 font-medium' : 'text-zinc-400'}`}>
            {formatDateTime(expires)}
          </span>
        );
      },
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Matches</h1>
        <p className="mt-1 text-sm text-zinc-400">Track job matches between users and companies</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Total</p>
                <p className="text-lg font-semibold text-zinc-200">{stats.totalMatches}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <div>
                <p className="text-xs text-zinc-500">Pending</p>
                <p className="text-lg font-semibold text-amber-400">{stats.pendingMatches}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">Accepted</p>
                <p className="text-lg font-semibold text-emerald-400">{stats.acceptedMatches}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div>
                <p className="text-xs text-zinc-500">Rejected</p>
                <p className="text-lg font-semibold text-red-400">{stats.rejectedMatches}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Avg Score</p>
                <p className="text-lg font-semibold text-zinc-200">{Math.round(stats.averageMatchScore)}%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          options={statusOptions}
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
          title: 'No matches found',
          description: 'Try adjusting your filters.',
        }}
      />
    </div>
  );
}
