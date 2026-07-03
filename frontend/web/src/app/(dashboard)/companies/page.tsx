'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useCompanies, useSuspendCompany, useUnsuspendCompany } from '@/lib/hooks';
import { Company, CompanyFilters, CompanyVerificationStatus, CompanyTrustLevel, CompanySubscriptionTier, CompanyStatus } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Eye, Ban, CheckCircle, Building } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';

export default function CompaniesPage() {
  const [filters, setFilters] = useState<CompanyFilters>({});
  const [page, setPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState<{ company: Company; action: 'suspend' | 'unsuspend' } | null>(null);

  const { hasPermission } = usePermissions();
  const { data, isLoading } = useCompanies(filters, page, 20);
  const suspendCompany = useSuspendCompany();
  const unsuspendCompany = useUnsuspendCompany();

  const columns: ColumnDef<Company>[] = [
    {
      accessorKey: 'name',
      header: 'Company',
      cell: ({ row }) => {
        const company = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
              ) : (
                <Building className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{company.name}</p>
              <p className="text-xs text-zinc-500">{company.industry || 'No industry'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'verificationStatus',
      header: 'Verification',
      cell: ({ row }) => <StatusBadge status={row.original.verificationStatus} />,
    },
    {
      accessorKey: 'trustLevel',
      header: 'Trust',
      cell: ({ row }) => {
        const score = row.original.trustScore;
        return (
          <div className="flex items-center gap-2">
            <StatusBadge
              status={row.original.trustLevel}
              variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'}
            />
            <span className="text-sm text-zinc-400">{score}%</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'subscriptionTier',
      header: 'Subscription',
      cell: ({ row }) => (
        <span className="capitalize text-zinc-300">{row.original.subscriptionTier}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const company = row.original;
        const canSuspend = hasPermission('companies.suspend');
        const canUnsuspend = hasPermission('companies.unsuspend');
        
        return (
          <div className="flex items-center gap-2">
            <Link href={`/companies/${company.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {company.status === 'suspended' ? (
              canUnsuspend ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompany({ company, action: 'unsuspend' })}
                  title="Unsuspend company"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Requires companies.unsuspend permission"
                >
                  <CheckCircle className="h-4 w-4 text-zinc-600" />
                </Button>
              )
            ) : (
              canSuspend ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompany({ company, action: 'suspend' })}
                  title="Suspend company"
                >
                  <Ban className="h-4 w-4 text-red-500" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Requires companies.suspend permission"
                >
                  <Ban className="h-4 w-4 text-zinc-600" />
                </Button>
              )
            )}
          </div>
        );
      },
    },
  ];

  const verificationOptions = [
    { value: '', label: 'All Verifications' },
    { value: 'pending', label: 'Pending' },
    { value: 'verified', label: 'Verified' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const trustOptions = [
    { value: '', label: 'All Trust Levels' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const subscriptionOptions = [
    { value: '', label: 'All Tiers' },
    { value: 'free', label: 'Free' },
    { value: 'basic', label: 'Basic' },
    { value: 'premium', label: 'Premium' },
    { value: 'enterprise', label: 'Enterprise' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedCompany) return;
    try {
      if (selectedCompany.action === 'suspend') {
        await suspendCompany.mutateAsync({ companyId: selectedCompany.company.id, reason: 'Admin action' });
      } else {
        await unsuspendCompany.mutateAsync(selectedCompany.company.id);
      }
    } finally {
      setSelectedCompany(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Companies</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage company accounts and verifications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.verificationStatus || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, verificationStatus: e.target.value as CompanyVerificationStatus || undefined }))}
          options={verificationOptions}
          className="w-40"
        />
        <Select
          value={filters.trustLevel || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, trustLevel: e.target.value as CompanyTrustLevel || undefined }))}
          options={trustOptions}
          className="w-40"
        />
        <Select
          value={filters.subscriptionTier || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, subscriptionTier: e.target.value as CompanySubscriptionTier || undefined }))}
          options={subscriptionOptions}
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
          title: 'No companies found',
          description: 'Try adjusting your filters.',
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onConfirm={handleConfirmAction}
        title={selectedCompany?.action === 'suspend' ? 'Suspend Company' : 'Unsuspend Company'}
        description={
          selectedCompany?.action === 'suspend'
            ? `Are you sure you want to suspend ${selectedCompany?.company?.name}? This will disable their account and job postings.`
            : `Are you sure you want to unsuspend ${selectedCompany?.company?.name}? Their account and job postings will be reactivated.`
        }
        variant={selectedCompany?.action === 'suspend' ? 'danger' : 'info'}
        confirmText={selectedCompany?.action === 'suspend' ? 'Suspend Company' : 'Unsuspend Company'}
        isLoading={suspendCompany.isPending || unsuspendCompany.isPending}
      />
    </div>
  );
}
