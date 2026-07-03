'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useLowTrustCompanies, useRecalculateTrustScore } from '@/lib/hooks';
import { LowTrustCompany } from '@/types';
import { Building, RefreshCw, AlertTriangle, Shield } from 'lucide-react';

export default function LowTrustPage() {
  const { data, isLoading } = useLowTrustCompanies();
  const recalculateTrust = useRecalculateTrustScore();
  const [recalculatingId, setRecalculatingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState<{ companyId: string; companyName: string } | null>(null);

  const columns: ColumnDef<LowTrustCompany>[] = [
    {
      accessorKey: 'company',
      header: 'Company',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              {item.company.logoUrl ? (
                <img src={item.company.logoUrl} alt={item.company.name} className="h-full w-full object-cover rounded-lg" />
              ) : (
                <Building className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{item.company.name}</p>
              <p className="text-xs text-zinc-500">{item.company.industry || 'No industry'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'trustScore',
      header: 'Trust Score',
      cell: ({ row }) => {
        const score = row.original.trustScore;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full ${score >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className={`text-sm font-medium ${score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {score}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'recentFlags',
      header: 'Recent Flags',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-zinc-300">{row.original.recentFlags}</span>
        </div>
      ),
    },
    {
      accessorKey: 'recentNegativeReviews',
      header: 'Negative Reviews',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{row.original.recentNegativeReviews}</span>
      ),
    },
    {
      accessorKey: 'lastScoreCalculation',
      header: 'Last Calculated',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{row.original.lastScoreCalculation}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/companies/${item.company.id}`}>
              <Button variant="ghost" size="sm">
                <Shield className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConfirm({ companyId: item.company.id, companyName: item.company.name })}
              disabled={recalculatingId === item.company.id}
            >
              <RefreshCw className={`h-4 w-4 ${recalculatingId === item.company.id ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleRecalculate = async () => {
    if (!showConfirm) return;
    setRecalculatingId(showConfirm.companyId);
    try {
      await recalculateTrust.mutateAsync(showConfirm.companyId);
    } finally {
      setRecalculatingId(null);
      setShowConfirm(null);
    }
  };

  const stats = {
    total: data?.length ?? 0,
    critical: data?.filter((c) => c.trustScore < 25).length ?? 0,
    warning: data?.filter((c) => c.trustScore >= 25 && c.trustScore < 40).length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Low Trust Companies</h1>
        <p className="mt-1 text-sm text-zinc-400">Companies requiring attention due to low trust scores</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-zinc-500" />
            <div>
              <p className="text-xs text-zinc-500">Total Low Trust</p>
              <p className="text-lg font-semibold text-zinc-200">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-xs text-zinc-500">Critical (&lt;25%)</p>
              <p className="text-lg font-semibold text-red-400">{stats.critical}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-xs text-zinc-500">Warning (25-40%)</p>
              <p className="text-lg font-semibold text-amber-400">{stats.warning}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data ?? []}
        isLoading={isLoading}
        emptyState={{
          title: 'All clear!',
          description: 'No companies with low trust scores.',
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleRecalculate}
        title="Recalculate Trust Score"
        description={`Recalculate the trust score for ${showConfirm?.companyName}? This will analyze all recent activity and update their score.`}
        variant="info"
        confirmText="Recalculate"
        isLoading={recalculateTrust.isPending || recalculatingId !== null}
      />
    </div>
  );
}
