'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { useReviews, useUnflagReview, useRemoveReview } from '@/lib/hooks';
import { Review, ReviewFilters, ReviewStatus } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Eye, CheckCircle, Trash2, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function ReviewsPage() {
  const [filters, setFilters] = useState<ReviewFilters>({ status: 'flagged' });
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<{ review: Review; action: 'unflag' | 'remove' } | null>(null);

  const { data, isLoading } = useReviews(filters, page, 20);
  const unflagReview = useUnflagReview();
  const removeReview = useRemoveReview();

  const columns: ColumnDef<Review>[] = [
    {
      accessorKey: 'content',
      header: 'Review',
      cell: ({ row }) => {
        const review = row.original;
        return (
          <div className="max-w-md">
            <div className="flex items-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-600'}`}
                />
              ))}
            </div>
            <p className="font-medium text-zinc-200">{review.title}</p>
            <p className="text-xs text-zinc-500 line-clamp-1">{review.content}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {review.company?.name || 'Unknown company'}
            </p>
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
      accessorKey: 'flagCount',
      header: 'Flags',
      cell: ({ row }) => (
        <span className={`text-sm ${row.original.flagCount > 5 ? 'text-red-400 font-medium' : 'text-zinc-400'}`}>
          {row.original.flagCount}
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
        const review = row.original;
        return (
          <div className="flex items-center gap-2">
            <Link href={`/reviews/${review.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {review.status === 'flagged' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReview({ review, action: 'unflag' })}
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedReview({ review, action: 'remove' })}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'published', label: 'Published' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'removed', label: 'Removed' },
    { value: 'pending', label: 'Pending' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedReview) return;
    try {
      if (selectedReview.action === 'unflag') {
        await unflagReview.mutateAsync(selectedReview.review.id);
      } else {
        await removeReview.mutateAsync({
          reviewId: selectedReview.review.id,
          reason: 'Admin removed',
        });
      }
    } finally {
      setSelectedReview(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Reviews</h1>
        <p className="mt-1 text-sm text-zinc-400">Moderate company reviews</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.status || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as ReviewStatus || undefined }))}
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
          title: 'No reviews found',
          description: filters.status === 'flagged' ? 'No flagged reviews to moderate' : 'Try adjusting your filters.',
        }}
      />

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        isOpen={!!selectedReview && selectedReview.action === 'unflag'}
        onClose={() => setSelectedReview(null)}
        onConfirm={handleConfirmAction}
        title="Unflag Review"
        description={`Are you sure you want to unflag this review? It will be visible to users again.`}
        variant="info"
        confirmText="Unflag Review"
        isLoading={unflagReview.isPending}
      />

      <ConfirmationDialog
        isOpen={!!selectedReview && selectedReview.action === 'remove'}
        onClose={() => setSelectedReview(null)}
        onConfirm={handleConfirmAction}
        title="Remove Review"
        description={`Are you sure you want to remove this review? This action cannot be undone.`}
        variant="danger"
        confirmText="Remove Review"
        isLoading={removeReview.isPending}
      />
    </div>
  );
}
