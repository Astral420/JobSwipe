'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { companyService } from '@/services';
import type { Company, CompanyFilters, PaginatedResponse } from '@/types';

// ─── Query Keys ─────────────────────────────────────────────────
export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters: CompanyFilters & { page?: number; pageSize?: number }) =>
    [...companyKeys.lists(), filters] as const,
  detail: (id: string) => [...companyKeys.all, 'detail', id] as const,
  verifications: () => [...companyKeys.all, 'verifications'] as const,
};

// ─── Queries ────────────────────────────────────────────────────

/** Paginated company list with cancel-on-unmount */
export function useCompanies(
  filters: CompanyFilters,
  page: number = 1,
  pageSize: number = 20
) {
  return useQuery({
    queryKey: companyKeys.list({ ...filters, page, pageSize }),
    queryFn: ({ signal }) => companyService.list(filters, page, pageSize, signal),
  });
}

/** Single company detail */
export function useCompany(id: string) {
  return useQuery({
    queryKey: companyKeys.detail(id),
    queryFn: ({ signal }) => companyService.get(id, signal),
    enabled: !!id,
  });
}

/** Infinite scroll company list */
export function useInfiniteCompanies(filters: CompanyFilters, pageSize: number = 20) {
  return useInfiniteQuery({
    queryKey: [...companyKeys.lists(), 'infinite', filters],
    queryFn: ({ pageParam = 1, signal }) =>
      companyService.list(filters, pageParam, pageSize, signal),
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    initialPageParam: 1,
  });
}

// ─── Mutations with Optimistic Updates ──────────────────────────

export function useSuspendCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ companyId, reason }: { companyId: string; reason: string }) =>
      companyService.suspend(companyId, reason),

    // Optimistic update: immediately show "suspended" in the UI
    onMutate: async ({ companyId }) => {
      await queryClient.cancelQueries({ queryKey: companyKeys.detail(companyId) });
      const previous = queryClient.getQueryData<Company>(companyKeys.detail(companyId));

      if (previous) {
        queryClient.setQueryData<Company>(companyKeys.detail(companyId), {
          ...previous,
          status: 'suspended',
        });
      }

      return { previous, companyId };
    },

    // Rollback on error
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          companyKeys.detail(context.companyId),
          context.previous
        );
      }
    },

    // Refetch to ensure consistency
    onSettled: (_data, _error, { companyId }) => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}

export function useUnsuspendCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (companyId: string) => companyService.unsuspend(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyKeys.all });
    },
  });
}
