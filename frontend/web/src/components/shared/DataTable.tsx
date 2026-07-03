'use client';

import {
  ColumnDef,
  SortingState,
  PaginationState,
  OnChangeFn,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    totalItems?: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  sorting?: {
    sortBy: string;
    order: 'asc' | 'desc';
    onSort: (sortBy: string, order: 'asc' | 'desc') => void;
  };
  emptyState?: {
    title: string;
    description: string;
  };
  className?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  pagination,
  sorting,
  emptyState = {
    title: 'No results',
    description: 'No data found matching your criteria.',
  },
  className,
}: DataTableProps<TData, TValue>) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const newSorting = typeof updater === 'function' ? updater(internalSorting) : updater;
    setInternalSorting(newSorting);
    if (sorting && newSorting.length > 0) {
      const sort = newSorting[0];
      sorting.onSort(sort.id, sort.desc ? 'desc' : 'asc');
    }
  };

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const newPagination = typeof updater === 'function' ? updater(internalPagination) : updater;
    setInternalPagination(newPagination);
    if (pagination) {
      pagination.onPageChange(newPagination.pageIndex + 1);
    }
  };

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting: sorting ? [{ id: sorting.sortBy, desc: sorting.order === 'desc' }] : internalSorting,
      pagination: pagination ? { pageIndex: pagination.pageIndex - 1, pageSize: pagination.pageSize } : internalPagination,
    },
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!pagination,
    rowCount: pagination?.totalItems ?? data.length,
  });

  if (isLoading) {
    return (
      <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('flex min-h-[400px] flex-col items-center justify-center text-center', className)}>
        <div className="text-zinc-500">
          <p className="text-lg font-medium text-zinc-400">{emptyState.title}</p>
          <p className="mt-1 text-sm">{emptyState.description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-zinc-800 bg-zinc-900/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400',
                      header.column.getCanSort() && 'cursor-pointer hover:text-zinc-300'
                    )}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-zinc-800/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-zinc-300">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Showing <span className="font-medium text-zinc-300">{(pagination.pageIndex - 1) * pagination.pageSize + 1}</span> to{' '}
            <span className="font-medium text-zinc-300">
              {Math.min(pagination.pageIndex * pagination.pageSize, pagination.totalItems ?? 0)}
            </span>{' '}
            of <span className="font-medium text-zinc-300">{pagination.totalItems}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.pageIndex - 1)}
              disabled={pagination.pageIndex <= 1}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.pageIndex + 1)}
              disabled={pagination.pageIndex * pagination.pageSize >= (pagination.totalItems ?? 0)}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
