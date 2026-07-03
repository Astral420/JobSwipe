'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useJobs, useFlagJob, useCloseJob, useDeleteJob } from '@/lib/hooks';
import { JobPosting, JobFilters, JobStatus, JobType, JobLocationType } from '@/types';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Eye, Flag, XCircle, Trash2, Briefcase } from 'lucide-react';

export default function JobsPage() {
  const [filters, setFilters] = useState<JobFilters>({});
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<{ job: JobPosting; action: 'flag' | 'close' | 'delete' } | null>(null);

  const { data, isLoading } = useJobs(filters, page, 20);
  const flagJob = useFlagJob();
  const closeJob = useCloseJob();
  const deleteJob = useDeleteJob();

  const columns: ColumnDef<JobPosting>[] = [
    {
      accessorKey: 'title',
      header: 'Job',
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div>
            <p className="font-medium text-zinc-200">{job.title}</p>
            <p className="text-xs text-zinc-500">{job.company?.name || 'Unknown company'}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => (
        <span className="text-sm capitalize text-zinc-300">{row.original.type.replace('_', ' ')}</span>
      ),
    },
    {
      accessorKey: 'location',
      header: 'Location',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-zinc-300">{row.original.location}</p>
          <p className="text-xs text-zinc-500 capitalize">{row.original.locationType}</p>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'postedAt',
      header: 'Posted',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-400">{formatDateTime(row.original.postedAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const job = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/jobs/${job.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedJob({ job, action: 'flag' })}
            >
              <Flag className="h-4 w-4 text-amber-500" />
            </Button>
            {job.status === 'active' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJob({ job, action: 'close' })}
              >
                <XCircle className="h-4 w-4 text-zinc-500" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedJob({ job, action: 'delete' })}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        );
      },
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'paused', label: 'Paused' },
    { value: 'flagged', label: 'Flagged' },
  ];

  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' },
  ];

  const locationTypeOptions = [
    { value: '', label: 'All Locations' },
    { value: 'remote', label: 'Remote' },
    { value: 'onsite', label: 'On-site' },
    { value: 'hybrid', label: 'Hybrid' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedJob) return;
    try {
      if (selectedJob.action === 'flag') {
        await flagJob.mutateAsync({ jobId: selectedJob.job.id, reason: 'Admin flagged' });
      } else if (selectedJob.action === 'close') {
        await closeJob.mutateAsync(selectedJob.job.id);
      } else if (selectedJob.action === 'delete') {
        await deleteJob.mutateAsync(selectedJob.job.id);
      }
    } finally {
      setSelectedJob(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Job Postings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage and moderate job listings</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as JobStatus || undefined }))}
          options={statusOptions}
          className="w-40"
        />
        <Select
          value={filters.type || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value as JobType || undefined }))}
          options={typeOptions}
          className="w-40"
        />
        <Select
          value={filters.locationType || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, locationType: e.target.value as JobLocationType || undefined }))}
          options={locationTypeOptions}
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
          title: 'No job postings found',
          description: 'Try adjusting your filters.',
        }}
      />

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!selectedJob && selectedJob.action === 'flag'}
        onClose={() => setSelectedJob(null)}
        onConfirm={handleConfirmAction}
        title="Flag Job Posting"
        description={`Are you sure you want to flag "${selectedJob?.job.title}"? This will mark it for review.`}
        variant="warning"
        confirmText="Flag Job"
        isLoading={flagJob.isPending}
      />

      <ConfirmationDialog
        isOpen={!!selectedJob && selectedJob.action === 'close'}
        onClose={() => setSelectedJob(null)}
        onConfirm={handleConfirmAction}
        title="Close Job Posting"
        description={`Are you sure you want to close "${selectedJob?.job.title}"? This will stop accepting new applications.`}
        variant="info"
        confirmText="Close Job"
        isLoading={closeJob.isPending}
      />

      <ConfirmationDialog
        isOpen={!!selectedJob && selectedJob.action === 'delete'}
        onClose={() => setSelectedJob(null)}
        onConfirm={handleConfirmAction}
        title="Delete Job Posting"
        description={`Are you sure you want to permanently delete "${selectedJob?.job.title}"? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete Job"
        isLoading={deleteJob.isPending}
      />
    </div>
  );
}
