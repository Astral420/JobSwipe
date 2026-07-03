'use client';


import { use, useState } from 'react';
import { useCompany, useSuspendCompany, useUnsuspendCompany } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatDateTime } from '@/lib/utils';
import { ArrowLeft, Building, Globe, Ban, CheckCircle, Shield } from 'lucide-react';
import Link from 'next/link';

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: companyId } = use(params);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);

  const { data: company, isLoading } = useCompany(companyId);
  const suspendCompany = useSuspendCompany();
  const unsuspendCompany = useUnsuspendCompany();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-400">Company not found</p>
      </div>
    );
  }

  const handleConfirmAction = async () => {
    try {
      if (company.status === 'suspended') {
        await unsuspendCompany.mutateAsync(companyId);
      } else {
        await suspendCompany.mutateAsync({ companyId, reason: 'Admin action' });
      }
      setShowSuspendDialog(false);
    } catch (error) {
      console.error('Failed to update company status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Company Details</h1>
          <p className="text-sm text-zinc-400">{company.name}</p>
        </div>
      </div>

      {/* Main Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800">
              {company.logoUrl ? (
                <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover rounded-xl" />
              ) : (
                <Building className="h-8 w-8 text-zinc-500" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-zinc-100">{company.name}</h2>
                  {company.website && (
                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline flex items-center gap-1 mt-1">
                      <Globe className="h-3 w-3" />
                      {company.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
                <StatusBadge status={company.status} />
              </div>

              {company.description && (
                <p className="mt-4 text-sm text-zinc-400">{company.description}</p>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {company.industry && (
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Industry</p>
                    <p className="text-sm font-medium text-zinc-200">{company.industry}</p>
                  </div>
                )}
                {company.size && (
                  <div className="rounded-lg bg-zinc-800/50 p-3">
                    <p className="text-xs text-zinc-500">Company Size</p>
                    <p className="text-sm font-medium text-zinc-200">{company.size}</p>
                  </div>
                )}
                <div className="rounded-lg bg-zinc-800/50 p-3">
                  <p className="text-xs text-zinc-500">Subscription</p>
                  <p className="text-sm font-medium capitalize text-zinc-200">{company.subscriptionTier}</p>
                </div>
                <div className="rounded-lg bg-zinc-800/50 p-3">
                  <p className="text-xs text-zinc-500">Created</p>
                  <p className="text-sm font-medium text-zinc-200">{formatDateTime(company.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Score Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Trust Score
          </h3>
          <div className="mt-4 flex items-center justify-center">
            <div className="relative h-32 w-32">
              <svg className="h-full w-full" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#27272a"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke={company.trustScore >= 70 ? '#10b981' : company.trustScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${company.trustScore * 2.83} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-zinc-100">{company.trustScore}%</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <StatusBadge
              status={company.trustLevel}
              variant={
                company.trustLevel === 'established'
                  ? 'warning'
                  : company.trustScore >= 70
                    ? 'success'
                    : company.trustScore >= 40
                      ? 'warning'
                      : 'danger'
              }
            />
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Verification Status</p>
          <StatusBadge status={company.verificationStatus} className="mt-2" />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Account Status</p>
          <StatusBadge status={company.status} className="mt-2" />
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <p className="text-sm text-zinc-400">Trust Level</p>
          <StatusBadge
            status={company.trustLevel}
            variant={
              company.trustLevel === 'high'
                ? 'success'
                : company.trustLevel === 'medium' || company.trustLevel === 'established'
                  ? 'warning'
                  : 'danger'
            }
            className="mt-2"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {company.status === 'suspended' ? (
          <Button
            variant="primary"
            onClick={() => setShowSuspendDialog(true)}
            isLoading={unsuspendCompany.isPending}
          >
            <CheckCircle className="h-4 w-4" />
            Unsuspend Company
          </Button>
        ) : (
          <Button
            variant="danger"
            onClick={() => setShowSuspendDialog(true)}
            isLoading={suspendCompany.isPending}
          >
            <Ban className="h-4 w-4" />
            Suspend Company
          </Button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showSuspendDialog}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={handleConfirmAction}
        title={company.status === 'suspended' ? 'Unsuspend Company' : 'Suspend Company'}
        description={
          company.status === 'suspended'
            ? `Are you sure you want to unsuspend ${company.name}? Their account and job postings will be reactivated.`
            : `Are you sure you want to suspend ${company.name}? This will disable their account and all job postings.`
        }
        variant={company.status === 'suspended' ? 'info' : 'danger'}
        confirmText={company.status === 'suspended' ? 'Unsuspend Company' : 'Suspend Company'}
        isLoading={suspendCompany.isPending || unsuspendCompany.isPending}
      />
    </div>
  );
}
